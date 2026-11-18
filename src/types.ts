export type SourceKind = 'pdf' | 'image';
export type PageKind = SourceKind | 'blank';
export type SizeMode = 'a4' | 'original' | 'custom';
export type Orientation = 'portrait' | 'landscape';
export type ImageFit = 'contain' | 'cover' | 'stretch';
export type Alignment =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface SourceFile {
  id: string;
  name: string;
  kind: SourceKind;
  bytes: Uint8Array;
  mimeType: string;
  size: number;
  pageCount: number;
}

export interface PageItem {
  id: string;
  sourceId: string;
  kind: PageKind;
  fileName: string;
  sourceName: string;
  pageIndex: number;
  sourceWidthPt: number;
  sourceHeightPt: number;
  thumbnail: string;
  preview: string;
  rotation: number;
  sizeMode: SizeMode;
  orientation: Orientation;
  customWidthMm: number;
  customHeightMm: number;
  marginMm: number;
  background: string;
  fit: ImageFit;
  alignment: Alignment;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface PageSize {
  widthPt: number;
  heightPt: number;
  widthMm: number;
  heightMm: number;
}

export interface ImportProgress {
  percent: number;
  label: string;
}

export interface ImportResult {
  pages: PageItem[];
  sources: SourceFile[];
  errors: string[];
}

export interface ExportOptions {
  fileName: string;
  rangeMode: 'all' | 'selected' | 'custom';
  customRange: string;
  quality: 'original' | 'compressed';
}

export interface ExportResult {
  blob: Blob;
  fileName: string;
  pageCount: number;
}
