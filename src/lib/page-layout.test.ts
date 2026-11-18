import { describe, expect, it } from 'vitest';
import type { PageItem } from '../types';
import { getDisplayDimensions, getPageSize, reorderItems } from './page-layout';

const basePage: PageItem = {
  id: 'page-1',
  sourceId: 'source-1',
  kind: 'image',
  fileName: 'sample.png',
  sourceName: 'sample.png',
  pageIndex: 0,
  sourceWidthPt: 600,
  sourceHeightPt: 400,
  thumbnail: '',
  preview: '',
  rotation: 0,
  sizeMode: 'a4',
  orientation: 'portrait',
  customWidthMm: 210,
  customHeightMm: 297,
  marginMm: 0,
  background: '#fff',
  fit: 'contain',
  alignment: 'center',
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

describe('page layout', () => {
  it('uses A4 portrait dimensions by default', () => {
    const size = getPageSize(basePage);
    expect(Math.round(size.widthMm)).toBe(210);
    expect(Math.round(size.heightMm)).toBe(297);
  });

  it('swaps displayed dimensions for landscape and quarter turns', () => {
    const landscape = getPageSize({ ...basePage, orientation: 'landscape' });
    expect(Math.round(landscape.widthMm)).toBe(297);
    expect(Math.round(landscape.heightMm)).toBe(210);

    const rotated = getDisplayDimensions({ ...basePage, rotation: 90 });
    expect(rotated.width).toBeGreaterThan(rotated.height);
  });

  it('preserves source dimensions when original size is selected', () => {
    const size = getPageSize({
      ...basePage,
      sizeMode: 'original',
      orientation: 'landscape',
    });
    expect(Math.round(size.widthPt)).toBe(600);
    expect(Math.round(size.heightPt)).toBe(400);
  });
});

describe('reorderItems', () => {
  it('moves an item and leaves the original array unchanged', () => {
    const source = ['a', 'b', 'c'];
    expect(reorderItems(source, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(source).toEqual(['a', 'b', 'c']);
  });
});
