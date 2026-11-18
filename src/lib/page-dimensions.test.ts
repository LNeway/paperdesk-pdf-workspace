import { describe, expect, it } from 'vitest';
import { PAGE_DIMENSION_LIMITS, validatePageDimension } from './page-dimensions';

describe('validatePageDimension', () => {
  it('accepts values inside the declared range', () => {
    expect(validatePageDimension('210', '宽度')).toEqual({
      valid: true,
      value: 210,
      error: null,
    });
    expect(PAGE_DIMENSION_LIMITS).toEqual({ minMm: 20, maxMm: 1000 });
  });

  it('rejects values above the maximum without applying them', () => {
    expect(validatePageDimension('2000', '宽度')).toEqual({
      valid: false,
      value: null,
      error: '宽度需在 20-1000 mm 之间。',
    });
  });

  it('rejects empty, non-numeric, and below-minimum values', () => {
    expect(validatePageDimension('', '高度').error).toBe('请输入高度。');
    expect(validatePageDimension('abc', '高度').error).toBe('高度需为有效数字。');
    expect(validatePageDimension('10', '高度').error).toBe('高度需在 20-1000 mm 之间。');
  });
});
