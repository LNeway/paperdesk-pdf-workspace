import { useRef, useState } from 'react';
import {
  ArrowRight,
  FilePlus2,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ACCEPT_ATTRIBUTE, FILE_LIMITS } from '../lib/constants';
import { formatBytes } from '../lib/import-files';
import type { ImportProgress } from '../types';

interface ImportViewProps {
  onFiles: (files: File[]) => void;
  importing: boolean;
  progress: ImportProgress;
  errors: string[];
  onDismissErrors: () => void;
}

export function ImportView({
  onFiles,
  importing,
  progress,
  errors,
  onDismissErrors,
}: ImportViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const chooseFiles = () => inputRef.current?.click();
  const submitFiles = (files: FileList | null) => {
    if (!files?.length || importing) return;
    onFiles(Array.from(files));
  };

  return (
    <div className="import-page">
      <header className="import-header">
        <a className="brand" href="/" aria-label="Paperdesk 首页">
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          <span>Paperdesk</span>
        </a>
        <span className="local-badge">
          <ShieldCheck size={16} aria-hidden="true" />
          浏览器本地处理
        </span>
      </header>

      <main
        className="import-main"
        onDragEnter={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setDragOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          submitFiles(event.dataTransfer.files);
        }}
      >
        <div className="import-intro">
          <p className="eyebrow">PDF 工作台</p>
          <h1>把图片和 PDF 整理成一份文件</h1>
          <p>选择文件后直接进入页面编排，确认页序与版式即可导出。</p>
        </div>

        <section className={`drop-zone ${dragOver ? 'is-dragging' : ''}`} aria-labelledby="drop-title">
          <input
            ref={inputRef}
            hidden
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            multiple
            onChange={(event) => {
              submitFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <div className="drop-zone__icon" aria-hidden="true">
            {importing ? <LoaderCircle className="spin" size={28} /> : <FilePlus2 size={28} />}
          </div>
          <h2 id="drop-title">{dragOver ? '松开即可添加' : '拖入文件，或从设备中选择'}</h2>
          <p>支持 PDF、PNG、JPG、WEBP</p>
          <button className="primary-button" type="button" onClick={chooseFiles} disabled={importing}>
            {importing ? '正在读取文件…' : '选择文件'}
            {!importing ? <ArrowRight size={18} aria-hidden="true" /> : null}
          </button>
          {importing ? (
            <div className="import-progress">
              <progress max={100} value={progress.percent} aria-label={progress.label} />
              <span aria-live="polite">{progress.label}</span>
            </div>
          ) : null}
        </section>

        {errors.length ? (
          <div className="error-banner" role="alert">
            <div>
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
            <button type="button" className="text-button" onClick={onDismissErrors} aria-label="关闭错误提示">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <dl className="limit-strip" aria-label="文件限制">
          <div>
            <FileText size={18} aria-hidden="true" />
            <dt>文件</dt>
            <dd>{FILE_LIMITS.maxFiles} 个以内</dd>
          </div>
          <div>
            <ImageIcon size={18} aria-hidden="true" />
            <dt>单文件</dt>
            <dd>{formatBytes(FILE_LIMITS.maxFileBytes)} 以内</dd>
          </div>
          <div>
            <ShieldCheck size={18} aria-hidden="true" />
            <dt>总量</dt>
            <dd>{formatBytes(FILE_LIMITS.maxTotalBytes)} / {FILE_LIMITS.maxPages} 页以内</dd>
          </div>
        </dl>
        <p className="privacy-note">
          <ShieldCheck size={15} aria-hidden="true" />
          文件不会上传到服务器，关闭页面后本次编辑不会保留。
        </p>
      </main>
    </div>
  );
}
