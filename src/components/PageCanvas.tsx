import type { CSSProperties } from 'react';
import type { PageItem } from '../types';
import {
  getDisplayDimensions,
  getMarginPercent,
  getPageSize,
  getRotatedInnerStyle,
} from '../lib/page-layout';

interface PageCanvasProps {
  page: PageItem;
  zoom?: number;
  compact?: boolean;
}

function objectPosition(page: PageItem): string {
  const [vertical, horizontal] = page.alignment.split('-');
  const x = horizontal === 'left' ? '0%' : horizontal === 'right' ? '100%' : '50%';
  const y = vertical === 'top' ? '0%' : vertical === 'bottom' ? '100%' : '50%';
  return `${x} ${y}`;
}

export function PageCanvas({ page, zoom = 1, compact = false }: PageCanvasProps) {
  const size = getPageSize(page);
  const display = getDisplayDimensions(page);
  const inner = getRotatedInnerStyle(page);
  const margin = getMarginPercent(page);
  const pageStyle = {
    '--page-width': `${Math.round(560 * zoom)}px`,
    aspectRatio: `${display.width} / ${display.height}`,
  } as CSSProperties;
  const innerStyle = {
    width: inner.width,
    height: inner.height,
    transform: inner.transform,
    backgroundColor: page.background,
  } as CSSProperties;

  return (
    <div className={`paper ${compact ? 'paper--compact' : ''}`} style={pageStyle}>
      <div className="paper-inner" style={innerStyle}>
        {page.kind === 'blank' ? (
          <div className="blank-page" aria-label="空白页面">
            <span>空白页</span>
          </div>
        ) : page.kind === 'pdf' ? (
          <img
            className="paper-image paper-image--pdf"
            src={page.preview}
            alt={`${page.fileName} 第 ${page.pageIndex + 1} 页`}
            width={Math.round(size.widthPt)}
            height={Math.round(size.heightPt)}
          />
        ) : (
          <div className="image-page" style={{ inset: `${margin}%` }}>
            <img
              className="paper-image paper-image--user"
              src={page.preview}
              alt={`${page.fileName} 图片内容`}
              style={{
                objectFit: page.fit === 'stretch' ? 'fill' : page.fit,
                objectPosition: objectPosition(page),
                transform: `translate(${page.offsetX}%, ${page.offsetY}%) scale(${page.scale})`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
