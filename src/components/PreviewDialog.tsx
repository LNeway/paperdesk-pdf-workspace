import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { PageItem } from '../types';
import { PageThumbnail } from './PageThumbnail';

interface PreviewDialogProps {
  open: boolean;
  pages: PageItem[];
  onClose: () => void;
}

export function PreviewDialog({ open, pages, onClose }: PreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="preview-dialog"
      aria-labelledby="preview-title"
      closedby="any"
      onClose={onClose}
    >
      <div className="preview-dialog__header">
        <div>
          <p className="eyebrow">预览</p>
          <h2 id="preview-title">全部页面</h2>
        </div>
        <button type="button" className="small-icon-button" onClick={() => dialogRef.current?.close()}>
          <X size={19} aria-hidden="true" />
          <span className="visually-hidden">关闭预览</span>
        </button>
      </div>
      <div className="preview-grid">
        {pages.map((page, index) => (
          <figure key={page.id}>
            <PageThumbnail page={page} large />
            <figcaption>{index + 1}</figcaption>
          </figure>
        ))}
      </div>
    </dialog>
  );
}
