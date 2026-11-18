import type { PDFPageProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ImportProgress, ImportResult, PageItem, SourceFile } from '../types';
import { ACCEPTED_EXTENSIONS, FILE_LIMITS } from './constants';

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

async function getPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

interface ImportContext {
  sourceCount: number;
  totalBytes: number;
  pageCount: number;
}

class PageLimitError extends Error {
  constructor(readonly pageCount: number) {
    super('Page limit exceeded');
    this.name = 'PageLimitError';
  }
}

function createId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function extensionOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function isAccepted(file: File): boolean {
  const extension = extensionOf(file.name);
  return ACCEPTED_EXTENSIONS.includes(extension as (typeof ACCEPTED_EXTENSIONS)[number]);
}

function canvasToDataUrl(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.88): string {
  return canvas.toDataURL(type, quality);
}

async function createThumbnail(preview: string, width = 260): Promise<string> {
  const image = new Image();
  image.src = preview;
  await image.decode();
  const scale = Math.min(1, width / image.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return preview;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvasToDataUrl(canvas, 'image/jpeg', 0.78);
}

async function renderPdfPage(
  pdfPage: PDFPageProxy,
): Promise<{ preview: string; thumbnail: string; widthPt: number; heightPt: number }> {
  const baseViewport = pdfPage.getViewport({ scale: 1 });
  const scale = Math.min(2.2, Math.max(1.15, 1500 / baseViewport.width));
  const viewport = pdfPage.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('浏览器无法创建页面画布。');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;
  const preview = canvasToDataUrl(canvas, 'image/jpeg', 0.9);
  const thumbnail = await createThumbnail(preview);
  return {
    preview,
    thumbnail,
    widthPt: baseViewport.width,
    heightPt: baseViewport.height,
  };
}

function defaultPage(
  source: SourceFile,
  overrides: Partial<PageItem> & Pick<PageItem, 'id' | 'pageIndex' | 'preview' | 'thumbnail'>,
): PageItem {
  const isPdf = source.kind === 'pdf';
  return {
    id: overrides.id,
    sourceId: source.id,
    kind: source.kind,
    fileName: source.name,
    sourceName: source.name,
    pageIndex: overrides.pageIndex,
    sourceWidthPt: overrides.sourceWidthPt ?? 595.28,
    sourceHeightPt: overrides.sourceHeightPt ?? 841.89,
    thumbnail: overrides.thumbnail,
    preview: overrides.preview,
    rotation: 0,
    sizeMode: isPdf ? 'original' : 'a4',
    orientation:
      overrides.sourceWidthPt && overrides.sourceHeightPt && overrides.sourceWidthPt > overrides.sourceHeightPt
        ? 'landscape'
        : 'portrait',
    customWidthMm: 210,
    customHeightMm: 297,
    marginMm: 0,
    background: '#ffffff',
    fit: 'contain',
    alignment: 'center',
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };
}

async function importPdf(
  file: File,
  bytes: Uint8Array,
  onProgress: (progress: ImportProgress) => void,
  progressBase: number,
  progressSpan: number,
  remainingPages: number,
): Promise<{ source: SourceFile; pages: PageItem[] }> {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({ data: bytes.slice() });
  const document = await loadingTask.promise;
  if (document.numPages > remainingPages) {
    await loadingTask.destroy();
    throw new PageLimitError(document.numPages);
  }
  const source: SourceFile = {
    id: createId('source'),
    name: file.name,
    kind: 'pdf',
    bytes,
    mimeType: file.type || 'application/pdf',
    size: file.size,
    pageCount: document.numPages,
  };
  const pages: PageItem[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    onProgress({
      percent: progressBase + (progressSpan * (pageNumber - 1)) / document.numPages,
      label: `正在读取 ${file.name} · 第 ${pageNumber}/${document.numPages} 页`,
    });
    const pdfPage = await document.getPage(pageNumber);
    const rendered = await renderPdfPage(pdfPage);
    pages.push(
      defaultPage(source, {
        id: createId('page'),
        pageIndex: pageNumber - 1,
        preview: rendered.preview,
        thumbnail: rendered.thumbnail,
        sourceWidthPt: rendered.widthPt,
        sourceHeightPt: rendered.heightPt,
      }),
    );
  }

  onProgress({
    percent: progressBase + progressSpan,
    label: `${file.name} 已读取`,
  });
  await loadingTask.destroy();
  return { source, pages };
}

async function importImage(
  file: File,
  bytes: Uint8Array,
  onProgress: (progress: ImportProgress) => void,
  progressBase: number,
  progressSpan: number,
): Promise<{ source: SourceFile; pages: PageItem[] }> {
  onProgress({ percent: progressBase, label: `正在读取 ${file.name}` });
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: file.type || 'image/png' });
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器无法读取图片。');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const preview = canvasToDataUrl(canvas, 'image/jpeg', 0.9);
  const thumbnail = await createThumbnail(preview);
  const source: SourceFile = {
    id: createId('source'),
    name: file.name,
    kind: 'image',
    bytes,
    mimeType: file.type || 'image/png',
    size: file.size,
    pageCount: 1,
  };
  bitmap.close();
  onProgress({ percent: progressBase + progressSpan, label: `${file.name} 已读取` });
  return {
    source,
    pages: [
      defaultPage(source, {
        id: createId('page'),
        pageIndex: 0,
        preview,
        thumbnail,
        sourceWidthPt: (bitmap.width * 72) / 96,
        sourceHeightPt: (bitmap.height * 72) / 96,
      }),
    ],
  };
}

export async function importFiles(
  files: File[],
  context: ImportContext,
  onProgress: (progress: ImportProgress) => void,
): Promise<ImportResult> {
  const errors: string[] = [];
  const sources: SourceFile[] = [];
  const pages: PageItem[] = [];
  let totalBytes = context.totalBytes;
  let totalPages = context.pageCount;
  let acceptedFiles = 0;

  const remainingFileSlots = Math.max(0, FILE_LIMITS.maxFiles - context.sourceCount);
  if (files.length > remainingFileSlots) {
    errors.push(`一次最多添加 ${FILE_LIMITS.maxFiles} 个文件，本次仅处理前 ${remainingFileSlots} 个。`);
  }

  const candidates = files.slice(0, remainingFileSlots);
  for (let index = 0; index < candidates.length; index += 1) {
    const file = candidates[index];
    const progressBase = (index / Math.max(1, candidates.length)) * 100;
    const progressSpan = 100 / Math.max(1, candidates.length);

    if (!isAccepted(file)) {
      errors.push(`${file.name}：不支持此格式，仅支持 PDF、PNG、JPG、WEBP。`);
      continue;
    }
    if (file.size > FILE_LIMITS.maxFileBytes) {
      errors.push(`${file.name}：文件超过 50 MB。`);
      continue;
    }
    if (totalBytes + file.size > FILE_LIMITS.maxTotalBytes) {
      errors.push(`${file.name}：添加后会超过 200 MB 总量限制。`);
      continue;
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (extensionOf(file.name) === 'pdf') {
        const imported = await importPdf(
          file,
          bytes,
          onProgress,
          progressBase,
          progressSpan,
          FILE_LIMITS.maxPages - totalPages,
        );
        if (totalPages + imported.pages.length > FILE_LIMITS.maxPages) {
          errors.push(
            `${file.name}：加入后总页数会超过 ${FILE_LIMITS.maxPages} 页，本次未添加。`,
          );
          continue;
        }
        sources.push(imported.source);
        pages.push(...imported.pages);
        totalPages += imported.pages.length;
      } else {
        const imported = await importImage(file, bytes, onProgress, progressBase, progressSpan);
        if (totalPages + 1 > FILE_LIMITS.maxPages) {
          errors.push(`${file.name}：加入后总页数会超过 ${FILE_LIMITS.maxPages} 页。`);
          continue;
        }
        sources.push(imported.source);
        pages.push(...imported.pages);
        totalPages += 1;
      }
      totalBytes += file.size;
      acceptedFiles += 1;
    } catch (error) {
      if (error instanceof PageLimitError) {
        errors.push(
          `${file.name}：共 ${error.pageCount} 页，加入后会超过 ${FILE_LIMITS.maxPages} 页，本次未添加。`,
        );
        continue;
      }
      const message = error instanceof Error ? error.message : String(error);
      if (/password/i.test(message)) {
        errors.push(`${file.name}：此 PDF 需要密码，暂不支持打开加密文件。`);
      } else if (/invalid pdf/i.test(message)) {
        errors.push(`${file.name}：PDF 已损坏或无法读取。`);
      } else {
        errors.push(`${file.name}：读取失败，请重试。`);
      }
    }
  }

  onProgress({
    percent: 100,
    label: acceptedFiles ? `已添加 ${acceptedFiles} 个文件` : '没有可添加的文件',
  });
  return { pages, sources, errors };
}
