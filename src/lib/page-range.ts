import type { PageItem } from '../types';

export interface ParsedRange {
  indices: number[];
  error: string | null;
}

export function parsePageRange(input: string, pageCount: number): ParsedRange {
  const value = input.trim();
  if (!value) {
    return { indices: [], error: '请输入页码，例如 1-3,5。' };
  }

  const indices: number[] = [];
  const seen = new Set<number>();

  for (const rawPart of value.split(',')) {
    const part = rawPart.trim();
    if (!part) {
      return { indices: [], error: '页码之间请用逗号分隔。' };
    }

    const singleMatch = /^(\d+)$/.exec(part);
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part);

    if (singleMatch) {
      const page = Number(singleMatch[1]);
      if (page < 1 || page > pageCount) {
        return { indices: [], error: `页码需在 1-${pageCount} 之间。` };
      }
      if (!seen.has(page)) {
        indices.push(page - 1);
        seen.add(page);
      }
      continue;
    }

    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start > end) {
        return { indices: [], error: '范围起始页不能大于结束页。' };
      }
      if (start < 1 || end > pageCount) {
        return { indices: [], error: `页码需在 1-${pageCount} 之间。` };
      }
      for (let page = start; page <= end; page += 1) {
        if (!seen.has(page)) {
          indices.push(page - 1);
          seen.add(page);
        }
      }
      continue;
    }

    return { indices: [], error: '页码格式不正确，请使用 1-3,5。' };
  }

  return { indices, error: null };
}

export function resolvePageIndices(
  mode: 'all' | 'selected' | 'custom',
  customRange: string,
  pages: PageItem[],
  selectedIds: string[],
): ParsedRange {
  if (mode === 'all') {
    return { indices: pages.map((_, index) => index), error: null };
  }

  if (mode === 'selected') {
    const selected = new Set(selectedIds);
    const indices = pages
      .map((page, index) => ({ page, index }))
      .filter(({ page }) => selected.has(page.id))
      .map(({ index }) => index);
    return indices.length
      ? { indices, error: null }
      : { indices: [], error: '请先在页面列表中选择至少一页。' };
  }

  return parsePageRange(customRange, pages.length);
}

export function sanitizeFileName(value: string): string {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  const withExtension = cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`;
  return withExtension || '未命名.pdf';
}
