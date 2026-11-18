import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileDown,
  FilePlus2,
  LayoutPanelLeft,
  Minus,
  Plus,
  Redo2,
  RotateCw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { ExportDrawer } from './components/ExportDrawer';
import { IconButton } from './components/IconButton';
import { ImportView } from './components/ImportView';
import { Inspector } from './components/Inspector';
import { PageCanvas } from './components/PageCanvas';
import { PageRail } from './components/PageRail';
import { PreviewDialog } from './components/PreviewDialog';
import { Toast } from './components/Toast';
import { useHistoryState } from './hooks/useHistoryState';
import { ACCEPT_ATTRIBUTE, FILE_LIMITS } from './lib/constants';
import { exportPdf } from './lib/export-pdf';
import { importFiles } from './lib/import-files';
import { getPageSize, reorderItems } from './lib/page-layout';
import type { ExportOptions, ImportProgress, PageItem, SourceFile } from './types';

type MobilePanel = 'pages' | 'properties' | null;

interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

function createBlankPage(): PageItem {
  const id = `page-blank-${crypto.randomUUID()}`;
  return {
    id,
    sourceId: 'blank',
    kind: 'blank',
    fileName: '空白页',
    sourceName: '空白页',
    pageIndex: 0,
    sourceWidthPt: 595.28,
    sourceHeightPt: 841.89,
    thumbnail: '',
    preview: '',
    rotation: 0,
    sizeMode: 'a4',
    orientation: 'portrait',
    customWidthMm: 210,
    customHeightMm: 297,
    marginMm: 0,
    background: '#ffffff',
    fit: 'contain',
    alignment: 'center',
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };
}

function App() {
  const [screen, setScreen] = useState<'import' | 'editor'>('import');
  const pageHistory = useHistoryState<PageItem[]>([]);
  const pages = pageHistory.value;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState('未命名');
  const [zoom, setZoom] = useState(0.82);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    percent: 0,
    label: '准备读取文件',
  });
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const sourcesRef = useRef(new Map<string, SourceFile>());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPages = useMemo(
    () => pages.filter((page) => selectedIds.includes(page.id)),
    [pages, selectedIds],
  );
  const activePage = pages.find((page) => page.id === activeId) ?? selectedPages[0] ?? pages[0] ?? null;
  const activeIndex = activePage ? pages.findIndex((page) => page.id === activePage.id) : -1;

  useEffect(() => {
    const validIds = new Set(pages.map((page) => page.id));
    setSelectedIds((current) => current.filter((id) => validIds.has(id)));
    if (activeId && !validIds.has(activeId)) {
      setActiveId(pages[0]?.id ?? null);
    }
  }, [activeId, pages]);

  useEffect(() => {
    document.title = screen === 'editor' ? `${documentName} | PDF 工作台` : 'PDF 工作台 | Paperdesk';
  }, [documentName, screen]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const importSelectedFiles = async (files: File[]) => {
    if (!files.length || importing) return;
    setImporting(true);
    setImportErrors([]);
    setImportProgress({ percent: 0, label: '准备读取文件' });
    try {
      const result = await importFiles(
        files,
        {
          sourceCount: sourcesRef.current.size,
          totalBytes: [...sourcesRef.current.values()].reduce((sum, source) => sum + source.size, 0),
          pageCount: pages.length,
        },
        setImportProgress,
      );
      for (const source of result.sources) sourcesRef.current.set(source.id, source);
      setImportErrors(result.errors);

      if (result.pages.length) {
        if (screen === 'import') {
          pageHistory.reset(result.pages);
          setScreen('editor');
          setDocumentName(
            result.sources[0]?.name.replace(/\.[^.]+$/, '') === undefined
              ? '未命名'
              : `${result.sources[0].name.replace(/\.[^.]+$/, '')} 文档`,
          );
        } else {
          pageHistory.set([...pages, ...result.pages]);
        }
        setSelectedIds([result.pages[0].id]);
        setActiveId(result.pages[0].id);
        setMobilePanel(null);
      }
    } catch (error) {
      setImportErrors([error instanceof Error ? error.message : '文件读取失败，请重试。']);
    } finally {
      setImporting(false);
    }
  };

  const selectPage = (
    pageId: string,
    event: Pick<React.MouseEvent | React.KeyboardEvent, 'shiftKey' | 'metaKey' | 'ctrlKey'>,
  ) => {
    const index = pages.findIndex((page) => page.id === pageId);
    if (index < 0) return;

    if (event.shiftKey && activeIndex >= 0) {
      const start = Math.min(activeIndex, index);
      const end = Math.max(activeIndex, index);
      setSelectedIds(pages.slice(start, end + 1).map((page) => page.id));
    } else if (event.metaKey || event.ctrlKey) {
      setSelectedIds((current) =>
        current.includes(pageId) ? current.filter((id) => id !== pageId) : [...current, pageId],
      );
      setActiveId(pageId);
    } else {
      setSelectedIds([pageId]);
      setActiveId(pageId);
    }
    setMobilePanel(null);
  };

  const updateSelected = (patch: Partial<PageItem>) => {
    const selected = new Set(selectedIds);
    pageHistory.set(pages.map((page) => (selected.has(page.id) ? { ...page, ...patch } : page)));
  };

  const rotateSelected = () => {
    const selected = new Set(selectedIds);
    pageHistory.set(
      pages.map((page) =>
        selected.has(page.id) ? { ...page, rotation: (page.rotation + 90) % 360 } : page,
      ),
    );
  };

  const duplicateSelected = () => {
    const selected = new Set(selectedIds);
    const next: PageItem[] = [];
    const newIds: string[] = [];
    for (const page of pages) {
      next.push(page);
      if (selected.has(page.id)) {
        const duplicate = { ...page, id: `page-${crypto.randomUUID()}` };
        next.push(duplicate);
        newIds.push(duplicate.id);
      }
    }
    pageHistory.set(next);
    if (newIds.length) {
      setSelectedIds(newIds);
      setActiveId(newIds[0]);
    }
  };

  const deleteSelected = () => {
    if (!selectedIds.length) return;
    const selected = new Set(selectedIds);
    const snapshot = pages;
    const next = pages.filter((page) => !selected.has(page.id));
    pageHistory.set(next);
    setSelectedIds([]);
    setActiveId(next[0]?.id ?? null);
    setToast({
      message: `已删除 ${selectedIds.length} 页`,
      actionLabel: '撤销',
      onAction: () => {
        pageHistory.restore(snapshot);
        setSelectedIds(selectedIds);
        setActiveId(selectedIds[0] ?? null);
        setToast(null);
      },
    });
  };

  const selectAllPages = () => {
    setSelectedIds(pages.map((page) => page.id));
    setActiveId((current) => current ?? pages[0]?.id ?? null);
  };

  const clearPageSelection = () => {
    setSelectedIds([]);
  };

  const addBlankPage = () => {
    const blank = createBlankPage();
    const insertAt = activeIndex >= 0 ? activeIndex + 1 : pages.length;
    const next = [...pages];
    next.splice(insertAt, 0, blank);
    pageHistory.set(next);
    setSelectedIds([blank.id]);
    setActiveId(blank.id);
    setToast({ message: '已插入空白页' });
  };

  const movePage = (pageId: string, direction: -1 | 1) => {
    const from = pages.findIndex((page) => page.id === pageId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= pages.length) return;
    pageHistory.set(reorderItems(pages, from, to));
    setActiveId(pageId);
  };

  const reorder = (from: number, to: number) => {
    pageHistory.set(reorderItems(pages, from, to));
  };

  const leaveEditor = () => {
    if (
      pages.length &&
      !window.confirm('返回后会丢失本次未导出的编辑，确定返回吗？')
    ) {
      return;
    }
    pageHistory.reset([]);
    sourcesRef.current.clear();
    setSelectedIds([]);
    setActiveId(null);
    setDocumentName('未命名');
    setImportErrors([]);
    setScreen('import');
  };

  if (screen === 'import') {
    return (
      <>
        <ImportView
          onFiles={importSelectedFiles}
          importing={importing}
          progress={importProgress}
          errors={importErrors}
          onDismissErrors={() => setImportErrors([])}
        />
        <div aria-live="polite" className="visually-hidden">
          {importProgress.label}
        </div>
      </>
    );
  }

  const activeSize = activePage ? getPageSize(activePage) : null;

  return (
    <div className="editor-shell">
      <a href="#canvas-title" className="skip-link">
        跳到页面画布
      </a>
      <header className="topbar">
        <div className="topbar__left">
          <IconButton label="返回文件选择" icon={<ArrowLeft size={19} />} onClick={leaveEditor} />
          <span className="topbar-divider" aria-hidden="true" />
          <div className="document-title">
            <label className="visually-hidden" htmlFor="document-name">
              文档名称
            </label>
            <input
              id="document-name"
              type="text"
              value={documentName}
              maxLength={80}
              onChange={(event) => setDocumentName(event.target.value)}
              aria-label="文档名称"
            />
            <span className="local-status">
              <ShieldCheck size={14} aria-hidden="true" />
              仅此设备
            </span>
          </div>
        </div>

        <div className="topbar__center">
          <div className="tool-group" aria-label="历史记录">
            <IconButton
              label="撤销"
              icon={<Undo2 size={18} />}
              onClick={pageHistory.undo}
              disabled={!pageHistory.canUndo}
            />
            <IconButton
              label="重做"
              icon={<Redo2 size={18} />}
              onClick={pageHistory.redo}
              disabled={!pageHistory.canRedo}
            />
          </div>
          <span className="topbar-divider" aria-hidden="true" />
          <div className="zoom-control" aria-label="画布缩放">
            <IconButton
              label="缩小"
              icon={<Minus size={16} />}
              onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.1).toFixed(2))))}
              disabled={zoom <= 0.5}
            />
            <button
              type="button"
              className="zoom-value"
              onClick={() => setZoom(0.82)}
              aria-label={`当前缩放 ${Math.round(zoom * 100)}%，点击重置`}
            >
              {Math.round(zoom * 100)}%
            </button>
            <IconButton
              label="放大"
              icon={<Plus size={16} />}
              onClick={() => setZoom((value) => Math.min(1.5, Number((value + 0.1).toFixed(2))))}
              disabled={zoom >= 1.5}
            />
          </div>
        </div>

        <div className="topbar__right">
          <button type="button" className="secondary-button topbar-action" onClick={() => setPreviewOpen(true)}>
            预览
          </button>
          <button
            type="button"
            className="primary-button topbar-action"
            onClick={() => setExportOpen(true)}
          >
            <FileDown size={17} aria-hidden="true" />
            导出 PDF
          </button>
        </div>
      </header>

      <main className="workspace-grid">
        <div
          id="pages-panel"
          className={`rail-slot ${mobilePanel === 'pages' ? 'is-mobile-open' : ''}`}
        >
          <PageRail
            pages={pages}
            selectedIds={selectedIds}
            activeId={activePage?.id ?? null}
            onSelect={selectPage}
            onReorder={reorder}
            onMove={movePage}
            onSelectAll={selectAllPages}
            onClearSelection={clearPageSelection}
            onDeleteSelection={deleteSelected}
            onAdd={() => fileInputRef.current?.click()}
            onAddBlank={addBlankPage}
          />
        </div>

        <section className="canvas-panel" aria-labelledby="canvas-title">
          <div className="canvas-topline">
            <div>
              <span>页面 {activeIndex + 1}</span>
              <span className="canvas-dot" aria-hidden="true" />
              <span>{pages.length} 页</span>
            </div>
            {activeSize ? (
              <span>
                {activeSize.widthMm.toFixed(0)} × {activeSize.heightMm.toFixed(0)} mm
              </span>
            ) : null}
          </div>
          <div className="canvas-body">
            {importErrors.length ? (
              <div className="import-notice" role="alert">
                <AlertTriangle size={18} aria-hidden="true" />
                <div>
                  <strong>部分文件未添加</strong>
                  <ul>
                    {importErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  className="small-icon-button"
                  onClick={() => setImportErrors([])}
                  aria-label="关闭导入错误提示"
                >
                  <X size={17} aria-hidden="true" />
                </button>
              </div>
            ) : null}
            <div className="canvas-scroll">
              {activePage ? (
                <div className="canvas-page-wrap">
                  <h1 id="canvas-title" className="visually-hidden">
                    {documentName} 第 {activeIndex + 1} 页
                  </h1>
                  <PageCanvas page={activePage} zoom={zoom} />
                  <div className="canvas-navigation" aria-label="页面导航">
                    <IconButton
                      label="上一页"
                      icon={<ChevronLeft size={18} />}
                      disabled={activeIndex <= 0}
                      onClick={() => {
                        const previous = pages[activeIndex - 1];
                        if (previous) {
                          setActiveId(previous.id);
                          setSelectedIds([previous.id]);
                        }
                      }}
                    />
                    <span>
                      {activeIndex + 1} / {pages.length}
                    </span>
                    <IconButton
                      label="下一页"
                      icon={<ChevronRight size={18} />}
                      disabled={activeIndex >= pages.length - 1}
                      onClick={() => {
                        const next = pages[activeIndex + 1];
                        if (next) {
                          setActiveId(next.id);
                          setSelectedIds([next.id]);
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="canvas-empty">
                  <FilePlus2 size={30} aria-hidden="true" />
                  <h2 id="canvas-title">工作台为空</h2>
                  <p>添加文件或插入空白页后开始整理。</p>
                  <button type="button" className="primary-button" onClick={() => fileInputRef.current?.click()}>
                    添加文件
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <div
          id="properties-panel"
          className={`inspector-slot ${mobilePanel === 'properties' ? 'is-mobile-open' : ''}`}
        >
          <Inspector
            pages={pages}
            selectedPages={selectedPages}
            onUpdate={updateSelected}
            onRotate={rotateSelected}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
          />
        </div>
      </main>

      {selectedPages.length || pageHistory.canUndo || pageHistory.canRedo ? (
        <div
          className={`selection-bar ${selectedPages.length ? '' : 'is-history-only'}`}
          role="toolbar"
          aria-label="所选页面操作"
        >
          {selectedPages.length ? <span>{selectedPages.length} 页已选中</span> : null}
          <span className="selection-bar__history">
            <IconButton
              label="撤销"
              icon={<Undo2 size={17} />}
              onClick={pageHistory.undo}
              disabled={!pageHistory.canUndo}
            />
            <IconButton
              label="重做"
              icon={<Redo2 size={17} />}
              onClick={pageHistory.redo}
              disabled={!pageHistory.canRedo}
            />
          </span>
          {selectedPages.length ? (
            <>
              <span className="selection-bar__divider" aria-hidden="true" />
              <IconButton label="旋转" icon={<RotateCw size={17} />} onClick={rotateSelected} />
              <IconButton label="复制" icon={<Copy size={17} />} onClick={duplicateSelected} />
              <IconButton label="删除" icon={<Trash2 size={17} />} onClick={deleteSelected} />
            </>
          ) : null}
        </div>
      ) : null}

      <nav className="mobile-panel-nav" aria-label="工作台面板">
        <button
          type="button"
          className={mobilePanel === 'pages' ? 'is-active' : ''}
          aria-pressed={mobilePanel === 'pages'}
          aria-controls="pages-panel"
          aria-expanded={mobilePanel === 'pages'}
          onClick={() => setMobilePanel((current) => (current === 'pages' ? null : 'pages'))}
        >
          <LayoutPanelLeft size={19} aria-hidden="true" />
          页面
        </button>
        <button
          type="button"
          className={mobilePanel === 'properties' ? 'is-active' : ''}
          aria-pressed={mobilePanel === 'properties'}
          aria-controls="properties-panel"
          aria-expanded={mobilePanel === 'properties'}
          onClick={() =>
            setMobilePanel((current) => (current === 'properties' ? null : 'properties'))
          }
        >
          <SlidersHorizontal size={19} aria-hidden="true" />
          属性
        </button>
      </nav>

      <input
        ref={fileInputRef}
        hidden
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        multiple
        onChange={(event) => {
          const files = event.target.files ? Array.from(event.target.files) : [];
          event.target.value = '';
          void importSelectedFiles(files);
        }}
      />

      <ExportDrawer
        open={exportOpen}
        pages={pages}
        selectedIds={selectedIds}
        defaultName={documentName || '未命名'}
        onClose={() => setExportOpen(false)}
        onExport={(options: ExportOptions, onProgress) =>
          exportPdf(pages, sourcesRef.current, selectedIds, options, onProgress)
        }
      />
      <PreviewDialog open={previewOpen} pages={pages} onClose={() => setPreviewOpen(false)} />

      {toast ? (
        <Toast
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onDismiss={() => setToast(null)}
        />
      ) : null}

      <div className="visually-hidden" aria-live="polite">
        {importing ? importProgress.label : ''}
      </div>
      <div className="visually-hidden">
        最多 {FILE_LIMITS.maxFiles} 个文件，单文件不超过 50 MB，总量不超过 200 MB，最多 200 页。
      </div>
    </div>
  );
}

export default App;
