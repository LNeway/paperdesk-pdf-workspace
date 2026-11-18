import { useEffect, useRef, useState } from 'react';
import { Check, Download, FileDown, ShieldCheck, X } from 'lucide-react';
import type { ExportOptions, ExportResult, PageItem } from '../types';
import { resolvePageIndices, sanitizeFileName } from '../lib/page-range';

interface ExportDrawerProps {
  open: boolean;
  pages: PageItem[];
  selectedIds: string[];
  defaultName: string;
  onClose: () => void;
  onExport: (
    options: ExportOptions,
    onProgress: (percent: number, label: string) => void,
  ) => Promise<ExportResult>;
}

export function ExportDrawer({
  open,
  pages,
  selectedIds,
  defaultName,
  onClose,
  onExport,
}: ExportDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const fileNameRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState(`${defaultName}-编辑版`);
  const [rangeMode, setRangeMode] = useState<ExportOptions['rangeMode']>('all');
  const [customRange, setCustomRange] = useState('');
  const [quality, setQuality] = useState<ExportOptions['quality']>('original');
  const [rangeError, setRangeError] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, label: '' });
  const [result, setResult] = useState<(ExportResult & { url: string }) | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setResult(null);
      setExportError('');
      dialog.showModal();
      window.requestAnimationFrame(() => fileNameRef.current?.focus());
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    return () => {
      if (result?.url) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  const pageCount =
    rangeMode === 'all'
      ? pages.length
      : rangeMode === 'selected'
        ? selectedIds.length
        : resolvePageIndices('custom', customRange, pages, selectedIds).indices.length;

  const closeDrawer = () => {
    if (exporting) return;
    dialogRef.current?.close('cancel');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setExportError('');
    const resolved = resolvePageIndices(rangeMode, customRange, pages, selectedIds);
    if (resolved.error) {
      setRangeError(resolved.error);
      if (rangeMode === 'custom') rangeRef.current?.focus();
      return;
    }
    setRangeError('');
    setExporting(true);
    setProgress({ percent: 0, label: '准备导出' });
    try {
      const nextResult = await onExport(
        {
          fileName: sanitizeFileName(fileName),
          rangeMode,
          customRange,
          quality,
        },
        (percent, label) => setProgress({ percent, label }),
      );
      const url = URL.createObjectURL(nextResult.blob);
      setResult({ ...nextResult, url });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : '生成 PDF 失败，请重试。');
    } finally {
      setExporting(false);
    }
  };

  const download = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.url;
    link.download = result.fileName;
    link.click();
  };

  return (
    <dialog
      ref={dialogRef}
      className="export-drawer"
      aria-labelledby="export-title"
      closedby="closerequest"
      onClose={onClose}
      onCancel={(event) => {
        if (exporting) event.preventDefault();
      }}
    >
      <div className="drawer-header">
        <div>
          <p className="eyebrow">导出</p>
          <h2 id="export-title">{result ? 'PDF 已生成' : '导出 PDF'}</h2>
        </div>
        <button
          type="button"
          className="small-icon-button"
          onClick={closeDrawer}
          disabled={exporting}
          aria-label="关闭导出设置"
        >
          <X size={19} aria-hidden="true" />
        </button>
      </div>

      {result ? (
        <div className="export-success" aria-live="polite">
          <div className="success-mark">
            <Check size={24} aria-hidden="true" />
          </div>
          <h3>{result.fileName}</h3>
          <p>{result.pageCount} 页 · 已在此浏览器中生成</p>
          <button type="button" className="primary-button primary-button--full" onClick={download}>
            <Download size={18} aria-hidden="true" />
            下载 PDF
          </button>
          <button type="button" className="secondary-button secondary-button--full" onClick={closeDrawer}>
            继续编辑
          </button>
        </div>
      ) : (
        <form className="export-form" onSubmit={submit} aria-labelledby="export-title">
          <label className="text-field">
            <span>文件名</span>
            <input
              ref={fileNameRef}
              type="text"
              value={fileName}
              required
              maxLength={120}
              onChange={(event) => setFileName(event.target.value)}
              onBlur={(event) => setFileName(sanitizeFileName(event.target.value).replace(/\.pdf$/i, ''))}
            />
            <span className="field-note">将自动添加 .pdf 扩展名</span>
          </label>

          <fieldset className="export-fieldset">
            <legend>页面范围</legend>
            <div className="choice-stack">
              <label className="choice-row">
                <input
                  type="radio"
                  name="range"
                  value="all"
                  checked={rangeMode === 'all'}
                  onChange={() => {
                    setRangeMode('all');
                    setRangeError('');
                  }}
                />
                <span>
                  <strong>全部页面</strong>
                  <small>{pages.length} 页</small>
                </span>
              </label>
              <label className="choice-row">
                <input
                  type="radio"
                  name="range"
                  value="selected"
                  checked={rangeMode === 'selected'}
                  onChange={() => {
                    setRangeMode('selected');
                    setRangeError('');
                  }}
                />
                <span>
                  <strong>当前选择</strong>
                  <small>{selectedIds.length ? `${selectedIds.length} 页` : '尚未选择页面'}</small>
                </span>
              </label>
              <label className="choice-row">
                <input
                  type="radio"
                  name="range"
                  value="custom"
                  checked={rangeMode === 'custom'}
                  onChange={() => {
                    setRangeMode('custom');
                    setRangeError('');
                    window.setTimeout(() => rangeRef.current?.focus(), 0);
                  }}
                />
                <span>
                  <strong>自定义范围</strong>
                  <small>例如 1-3,5</small>
                </span>
              </label>
            </div>
            {rangeMode === 'custom' ? (
              <label className="text-field text-field--compact">
                <span>页码</span>
                <input
                  ref={rangeRef}
                  type="text"
                  value={customRange}
                  inputMode="numeric"
                  aria-invalid={Boolean(rangeError)}
                  aria-describedby={rangeError ? 'range-error' : undefined}
                  onChange={(event) => {
                    setCustomRange(event.target.value);
                    if (rangeError) setRangeError('');
                  }}
                />
                {rangeError ? (
                  <span id="range-error" className="field-error">
                    {rangeError}
                  </span>
                ) : null}
              </label>
            ) : null}
          </fieldset>

          <fieldset className="export-fieldset">
            <legend>画质</legend>
            <div className="quality-grid">
              <label className="quality-card">
                <input
                  type="radio"
                  name="quality"
                  checked={quality === 'original'}
                  onChange={() => setQuality('original')}
                />
                <span>
                  <strong>原画质</strong>
                  <small>图片页面保留清晰度</small>
                </span>
              </label>
              <label className="quality-card">
                <input
                  type="radio"
                  name="quality"
                  checked={quality === 'compressed'}
                  onChange={() => setQuality('compressed')}
                />
                <span>
                  <strong>推荐压缩</strong>
                  <small>缩小图片页面体积</small>
                </span>
              </label>
            </div>
          </fieldset>

          <div className="export-summary">
            <div>
              <span>输出页数</span>
              <strong>{pageCount} 页</strong>
            </div>
            <div>
              <span>处理位置</span>
              <strong>
                <ShieldCheck size={15} aria-hidden="true" />
                此浏览器
              </strong>
            </div>
          </div>

          {exporting ? (
            <div className="export-progress" aria-live="polite">
              <progress max={100} value={progress.percent} aria-label={progress.label} />
              <span>{progress.label}</span>
            </div>
          ) : null}

          {exportError ? (
            <p className="form-error" role="alert">
              {exportError}
            </p>
          ) : null}

          <div className="drawer-actions">
            <button type="button" className="secondary-button" onClick={closeDrawer} disabled={exporting}>
              取消
            </button>
            <button type="submit" className="primary-button" disabled={exporting}>
              <FileDown size={18} aria-hidden="true" />
              {exporting ? '正在生成…' : '导出 PDF'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
