import { useState } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import type { PageItem } from '../types';
import { PageThumbnail } from './PageThumbnail';

interface PageRailProps {
  pages: PageItem[];
  selectedIds: string[];
  activeId: string | null;
  onSelect: (pageId: string, event: React.MouseEvent | React.KeyboardEvent) => void;
  onReorder: (from: number, to: number) => void;
  onMove: (pageId: string, direction: -1 | 1) => void;
  onAdd: () => void;
  onAddBlank: () => void;
}

export function PageRail({
  pages,
  selectedIds,
  activeId,
  onSelect,
  onReorder,
  onMove,
  onAdd,
  onAddBlank,
}: PageRailProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  return (
    <aside className="page-rail" aria-labelledby="pages-title">
      <div className="panel-heading">
        <div>
          <h2 id="pages-title">页面</h2>
          <span>{pages.length} 页</span>
        </div>
        <button type="button" className="small-icon-button" onClick={onAdd} aria-label="添加文件" title="添加文件">
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>

      <ol className="page-list" aria-label="页面序列">
        {pages.map((page, index) => {
          const selected = selectedIds.includes(page.id);
          const active = activeId === page.id;
          return (
            <li
              key={page.id}
              className={`page-item ${selected ? 'is-selected' : ''} ${active ? 'is-active' : ''} ${
                dropIndex === index && draggingIndex !== index ? 'is-drop-target' : ''
              }`}
              draggable
              onDragStart={(event) => {
                setDraggingIndex(index);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', page.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDropIndex(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingIndex !== null) onReorder(draggingIndex, index);
                setDraggingIndex(null);
                setDropIndex(null);
              }}
              onDragEnd={() => {
                setDraggingIndex(null);
                setDropIndex(null);
              }}
            >
              <button
                type="button"
                className="page-select"
                aria-pressed={selected}
                aria-current={active ? 'page' : undefined}
                aria-label={`第 ${index + 1} 页，${page.sourceName}`}
                onClick={(event) => onSelect(page.id, event)}
                onKeyDown={(event) => {
                  if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                    event.preventDefault();
                    onMove(page.id, event.key === 'ArrowUp' ? -1 : 1);
                  }
                }}
              >
                <span className="page-number">{index + 1}</span>
                <PageThumbnail page={page} />
                <span className="page-meta">
                  <span className="page-source" title={page.sourceName}>
                    {page.kind === 'blank' ? '空白页' : page.sourceName}
                  </span>
                  {page.kind === 'pdf' ? <span>PDF 第 {page.pageIndex + 1} 页</span> : null}
                  {page.kind === 'image' ? <span>图片</span> : null}
                </span>
              </button>
              <span className="drag-handle" aria-hidden="true" title="拖动排序">
                <GripVertical size={15} />
              </span>
            </li>
          );
        })}
      </ol>

      <div className="rail-footer">
        <button type="button" className="secondary-button secondary-button--full" onClick={onAddBlank}>
          <Plus size={16} aria-hidden="true" />
          插入空白页
        </button>
        <p>拖动排序，Alt + ↑/↓ 移动</p>
      </div>
    </aside>
  );
}
