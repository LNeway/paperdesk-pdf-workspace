import type { PageItem } from '../types';
import { getDisplayDimensions, getRotatedInnerStyle } from '../lib/page-layout';

interface PageThumbnailProps {
  page: PageItem;
  large?: boolean;
}

export function PageThumbnail({ page, large = false }: PageThumbnailProps) {
  const dimensions = getDisplayDimensions(page);
  const style = {
    aspectRatio: `${dimensions.width} / ${dimensions.height}`,
  };
  const innerStyle = getRotatedInnerStyle(page);

  if (page.kind === 'blank') {
    return (
      <div className={`thumbnail-paper ${large ? 'thumbnail-paper--large' : ''}`} style={style}>
        <div className="thumbnail-inner" style={innerStyle}>
          <span>空白页</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`thumbnail-paper ${large ? 'thumbnail-paper--large' : ''}`} style={style}>
      <div className="thumbnail-inner" style={innerStyle}>
        <img
          src={page.thumbnail}
          alt={`${page.fileName} 第 ${page.pageIndex + 1} 页缩略图`}
          width={large ? 240 : 120}
          height={large ? 320 : 160}
        />
      </div>
    </div>
  );
}
