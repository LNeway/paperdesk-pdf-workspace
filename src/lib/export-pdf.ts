import type { PDFDocument } from 'pdf-lib';
import type { ExportOptions, ExportResult, PageItem, SourceFile } from '../types';
import { getPageSize } from './page-layout';
import { resolvePageIndices, sanitizeFileName } from './page-range';

function getAlignmentOffset(
  alignment: PageItem['alignment'],
  available: number,
  content: number,
): number {
  const [vertical, horizontal] = alignment.split('-');
  if (vertical === 'top' || vertical === 'bottom') {
    return vertical === 'top' ? 0 : available - content;
  }
  if (horizontal === 'left' || horizontal === 'right') {
    return horizontal === 'left' ? 0 : available - content;
  }
  return (available - content) / 2;
}

async function renderImagePage(page: PageItem, source: SourceFile, quality: ExportOptions['quality']): Promise<Uint8Array> {
  const size = getPageSize(page);
  const canvasScale = Math.min(2.2, 2200 / Math.max(size.widthPt, size.heightPt));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(size.widthPt * canvasScale));
  canvas.height = Math.max(1, Math.round(size.heightPt * canvasScale));
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('浏览器无法创建导出画布。');

  context.fillStyle = page.background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const blob = new Blob([source.bytes.slice().buffer as ArrayBuffer], { type: source.mimeType });
  const image = await createImageBitmap(blob);
  const marginPt = (page.marginMm / 25.4) * 72;
  const box = {
    x: marginPt * canvasScale,
    y: marginPt * canvasScale,
    width: canvas.width - marginPt * 2 * canvasScale,
    height: canvas.height - marginPt * 2 * canvasScale,
  };

  let drawWidth = box.width;
  let drawHeight = box.height;
  if (page.fit !== 'stretch') {
    const containScale = Math.min(box.width / image.width, box.height / image.height);
    const coverScale = Math.max(box.width / image.width, box.height / image.height);
    const baseScale = page.fit === 'cover' ? coverScale : containScale;
    drawWidth = image.width * baseScale;
    drawHeight = image.height * baseScale;
  }
  drawWidth *= page.scale;
  drawHeight *= page.scale;

  const x =
    box.x +
    getAlignmentOffset(page.alignment, box.width, drawWidth) +
    (page.offsetX / 100) * canvas.width;
  const y =
    box.y +
    getAlignmentOffset(page.alignment, box.height, drawHeight) +
    (page.offsetY / 100) * canvas.height;

  context.save();
  context.beginPath();
  context.rect(box.x, box.y, box.width, box.height);
  context.clip();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, x, y, drawWidth, drawHeight);
  context.restore();
  image.close();

  const outputType = quality === 'compressed' ? 'image/jpeg' : 'image/png';
  const outputQuality = quality === 'compressed' ? 0.72 : undefined;
  const outputBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('无法生成图片页面。'))),
      outputType,
      outputQuality,
    );
  });
  return new Uint8Array(await outputBlob.arrayBuffer());
}

export async function exportPdf(
  pages: PageItem[],
  sources: Map<string, SourceFile>,
  selectedIds: string[],
  options: ExportOptions,
  onProgress: (percent: number, label: string) => void,
): Promise<ExportResult> {
  const { degrees, PDFDocument, rgb } = await import('pdf-lib');
  const range = resolvePageIndices(options.rangeMode, options.customRange, pages, selectedIds);
  if (range.error) throw new Error(range.error);

  const output = await PDFDocument.create();
  const sourceDocuments = new Map<string, PDFDocument>();
  const selectedPages = range.indices.map((index) => pages[index]);
  const hexToRgb = (hex: string) => {
    const value = hex.replace('#', '');
    const full = value.length === 3 ? value.split('').map((part) => part + part).join('') : value;
    return rgb(
      Number.parseInt(full.slice(0, 2), 16) / 255,
      Number.parseInt(full.slice(2, 4), 16) / 255,
      Number.parseInt(full.slice(4, 6), 16) / 255,
    );
  };

  for (let index = 0; index < selectedPages.length; index += 1) {
    const page = selectedPages[index];
    onProgress(
      Math.round((index / Math.max(1, selectedPages.length)) * 100),
      `正在生成第 ${index + 1}/${selectedPages.length} 页`,
    );

    const size = getPageSize(page);
    if (page.kind === 'pdf') {
      const source = sources.get(page.sourceId);
      if (!source) throw new Error(`找不到 ${page.fileName} 的原始文件。`);
      let sourceDocument = sourceDocuments.get(page.sourceId);
      if (!sourceDocument) {
        sourceDocument = await PDFDocument.load(source.bytes.slice());
        sourceDocuments.set(page.sourceId, sourceDocument);
      }
      const [copiedPage] = await output.copyPages(sourceDocument, [page.pageIndex]);
      const originalSize = copiedPage.getSize();
      if (
        Math.abs(originalSize.width - size.widthPt) > 0.5 ||
        Math.abs(originalSize.height - size.heightPt) > 0.5
      ) {
        copiedPage.setSize(size.widthPt, size.heightPt);
        copiedPage.scaleContent(size.widthPt / originalSize.width, size.heightPt / originalSize.height);
      }
      const originalRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((originalRotation + page.rotation) % 360));
      output.addPage(copiedPage);
      continue;
    }

    const outputPage = output.addPage([size.widthPt, size.heightPt]);
    outputPage.setRotation(degrees(page.rotation));
    if (page.kind === 'blank') {
      outputPage.drawRectangle({
        x: 0,
        y: 0,
        width: size.widthPt,
        height: size.heightPt,
        color: hexToRgb(page.background),
      });
      continue;
    }

    const source = sources.get(page.sourceId);
    if (!source) throw new Error(`找不到 ${page.fileName} 的原始图片。`);
    const rendered = await renderImagePage(page, source, options.quality);
    const image =
      options.quality === 'compressed' ? await output.embedJpg(rendered) : await output.embedPng(rendered);
    outputPage.drawImage(image, {
      x: 0,
      y: 0,
      width: size.widthPt,
      height: size.heightPt,
    });
  }

  onProgress(100, '正在封装 PDF');
  const bytes = await output.save();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([buffer], { type: 'application/pdf' });
  return {
    blob,
    fileName: sanitizeFileName(options.fileName),
    pageCount: selectedPages.length,
  };
}
