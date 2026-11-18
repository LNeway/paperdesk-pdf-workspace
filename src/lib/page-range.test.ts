import { describe, expect, it } from 'vitest';
import { parsePageRange, sanitizeFileName } from './page-range';

describe('parsePageRange', () => {
  it('expands ranges and keeps explicit order without duplicates', () => {
    expect(parsePageRange('1-3,5,2', 8)).toEqual({
      indices: [0, 1, 2, 4],
      error: null,
    });
  });

  it('rejects reversed and out-of-bounds ranges', () => {
    expect(parsePageRange('4-2', 8).error).toBe('范围起始页不能大于结束页。');
    expect(parsePageRange('1-9', 8).error).toBe('页码需在 1-8 之间。');
  });

  it('rejects empty or malformed values', () => {
    expect(parsePageRange('', 8).error).toBe('请输入页码，例如 1-3,5。');
    expect(parsePageRange('1,', 8).error).toBe('页码之间请用逗号分隔。');
    expect(parsePageRange('abc', 8).error).toBe('页码格式不正确，请使用 1-3,5。');
  });
});

describe('sanitizeFileName', () => {
  it('removes path characters and appends one PDF extension', () => {
    expect(sanitizeFileName('  项目/方案:最终  ')).toBe('项目-方案-最终.pdf');
    expect(sanitizeFileName('report.PDF')).toBe('report.PDF');
  });
});
