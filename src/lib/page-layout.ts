import { A4_MM, A4_PT } from './constants';
import type { PageItem, PageSize } from '../types';

export function getPageSize(page: PageItem): PageSize {
  let widthMm: number;
  let heightMm: number;

  if (page.sizeMode === 'a4') {
    widthMm = A4_MM.width;
    heightMm = A4_MM.height;
  } else if (page.sizeMode === 'custom') {
    widthMm = Math.max(20, page.customWidthMm);
    heightMm = Math.max(20, page.customHeightMm);
  } else {
    widthMm = (page.sourceWidthPt / 72) * 25.4;
    heightMm = (page.sourceHeightPt / 72) * 25.4;
  }

  if (page.orientation === 'landscape' && heightMm > widthMm) {
    [widthMm, heightMm] = [heightMm, widthMm];
  }
  if (page.orientation === 'portrait' && widthMm > heightMm) {
    [widthMm, heightMm] = [heightMm, widthMm];
  }

  const ratio = page.sizeMode === 'a4' ? A4_PT.width / A4_MM.width : 72 / 25.4;
  return {
    widthMm,
    heightMm,
    widthPt: widthMm * ratio,
    heightPt: heightMm * ratio,
  };
}

export function getDisplayDimensions(page: PageItem): { width: number; height: number } {
  const size = getPageSize(page);
  return page.rotation % 180 === 0
    ? { width: size.widthPt, height: size.heightPt }
    : { width: size.heightPt, height: size.widthPt };
}

export function getRotatedInnerStyle(page: PageItem): {
  width: string;
  height: string;
  transform: string;
} {
  const size = getPageSize(page);
  const swapped = page.rotation % 180 !== 0;
  const width = swapped ? (size.heightPt / size.widthPt) * 100 : 100;
  const height = swapped ? (size.widthPt / size.heightPt) * 100 : 100;
  return {
    width: `${width}%`,
    height: `${height}%`,
    transform: `translate(-50%, -50%) rotate(${page.rotation}deg)`,
  };
}

export function getMarginPercent(page: PageItem): number {
  const size = getPageSize(page);
  const marginPt = (page.marginMm / 25.4) * 72;
  return Math.min(30, (marginPt / Math.min(size.widthPt, size.heightPt)) * 100);
}

export function reorderItems<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function getMixedValue<T>(pages: PageItem[], getter: (page: PageItem) => T): T | 'multiple' {
  if (!pages.length) return 'multiple';
  const first = getter(pages[0]);
  return pages.every((page) => getter(page) === first) ? first : 'multiple';
}
