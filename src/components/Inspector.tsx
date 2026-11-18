import { useEffect, useState } from 'react';
import {
  Copy,
  RotateCw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import type { Alignment, ImageFit, Orientation, PageItem, SizeMode } from '../types';
import { PAGE_DIMENSION_LIMITS, validatePageDimension } from '../lib/page-dimensions';
import { getMixedValue, getPageSize } from '../lib/page-layout';

interface InspectorProps {
  pages: PageItem[];
  selectedPages: PageItem[];
  onUpdate: (patch: Partial<PageItem>) => void;
  onRotate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const backgrounds = ['#ffffff', '#f5f1e8', '#eaf2f8', '#eef5ed', '#f7eeee', '#20242b'];
const alignments: { value: Alignment; label: string }[] = [
  { value: 'top-left', label: '左上对齐' },
  { value: 'top-center', label: '顶部居中' },
  { value: 'top-right', label: '右上对齐' },
  { value: 'center-left', label: '左侧居中' },
  { value: 'center', label: '居中' },
  { value: 'center-right', label: '右侧居中' },
  { value: 'bottom-left', label: '左下对齐' },
  { value: 'bottom-center', label: '底部居中' },
  { value: 'bottom-right', label: '右下对齐' },
];

function Segment<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | 'multiple';
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="field-group">
      <span className="field-label">{label}</span>
      <div className="segmented" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? 'is-selected' : ''}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {value === 'multiple' ? <span className="mixed-hint">多个值</span> : null}
    </div>
  );
}

export function Inspector({
  pages,
  selectedPages,
  onUpdate,
  onRotate,
  onDuplicate,
  onDelete,
}: InspectorProps) {
  const [dimensionDrafts, setDimensionDrafts] = useState({ width: '', height: '' });
  const [dimensionErrors, setDimensionErrors] = useState({ width: '', height: '' });
  const sizeMode = getMixedValue(selectedPages, (page) => page.sizeMode);
  const orientation = getMixedValue(selectedPages, (page) => page.orientation);
  const background = getMixedValue(selectedPages, (page) => page.background);
  const margin = getMixedValue(selectedPages, (page) => page.marginMm);
  const customWidth = getMixedValue(selectedPages, (page) => page.customWidthMm);
  const customHeight = getMixedValue(selectedPages, (page) => page.customHeightMm);
  const fit = getMixedValue(selectedPages, (page) => page.fit);
  const alignment = getMixedValue(selectedPages, (page) => page.alignment);
  const scale = getMixedValue(selectedPages, (page) => page.scale);
  const offsetX = getMixedValue(selectedPages, (page) => page.offsetX);
  const offsetY = getMixedValue(selectedPages, (page) => page.offsetY);
  const selectionKey = selectedPages.map((page) => page.id).join('|');

  useEffect(() => {
    setDimensionDrafts({
      width: customWidth === 'multiple' ? '' : String(customWidth),
      height: customHeight === 'multiple' ? '' : String(customHeight),
    });
    setDimensionErrors({ width: '', height: '' });
  }, [customHeight, customWidth, selectionKey, sizeMode]);

  if (!selectedPages.length) {
    return (
      <aside className="inspector" aria-labelledby="inspector-title">
        <div className="inspector-heading">
          <div>
            <p className="eyebrow">文档属性</p>
            <h2 id="inspector-title">未选择页面</h2>
          </div>
          <SlidersHorizontal size={18} aria-hidden="true" />
        </div>
        <div className="empty-inspector">
          <p>选择左侧页面后，可调整纸张、图片适配与页面操作。</p>
          <dl>
            <div>
              <dt>总页数</dt>
              <dd>{pages.length}</dd>
            </div>
            <div>
              <dt>文件数</dt>
              <dd>{new Set(pages.map((page) => page.sourceId)).size}</dd>
            </div>
            <div>
              <dt>处理方式</dt>
              <dd>仅本地</dd>
            </div>
          </dl>
        </div>
      </aside>
    );
  }

  const allImages = selectedPages.every((page) => page.kind === 'image');
  const first = selectedPages[0];
  const firstSize = getPageSize(first);

  const updateDimension = (axis: 'width' | 'height', input: string) => {
    const label = axis === 'width' ? '宽度' : '高度';
    const validation = validatePageDimension(input, label);
    setDimensionDrafts((current) => ({ ...current, [axis]: input }));
    setDimensionErrors((current) => ({ ...current, [axis]: validation.error ?? '' }));
    if (validation.valid) {
      onUpdate(
        axis === 'width'
          ? { customWidthMm: validation.value ?? PAGE_DIMENSION_LIMITS.minMm }
          : { customHeightMm: validation.value ?? PAGE_DIMENSION_LIMITS.minMm },
      );
    }
  };

  const commitDimension = (axis: 'width' | 'height') => {
    const label = axis === 'width' ? '宽度' : '高度';
    const validation = validatePageDimension(dimensionDrafts[axis], label);
    if (validation.valid) {
      setDimensionErrors((current) => ({ ...current, [axis]: '' }));
      return;
    }
    const previousValue = axis === 'width' ? first.customWidthMm : first.customHeightMm;
    setDimensionDrafts((current) => ({ ...current, [axis]: String(previousValue) }));
    setDimensionErrors((current) => ({
      ...current,
      [axis]: `${validation.error ?? `${label}无效。`} 已恢复为 ${previousValue} mm。`,
    }));
  };

  return (
    <aside className="inspector" aria-labelledby="inspector-title">
      <div className="inspector-heading">
        <div>
          <p className="eyebrow">
            {selectedPages.length === 1 ? '页面属性' : `${selectedPages.length} 个页面已选中`}
          </p>
          <h2 id="inspector-title">版式与显示</h2>
        </div>
        <SlidersHorizontal size={18} aria-hidden="true" />
      </div>

      <div className="inspector-scroll">
        <section className="inspector-section" aria-labelledby="page-size-heading">
          <div className="section-heading">
            <h3 id="page-size-heading">页面设置</h3>
            <span>应用到 {selectedPages.length} 页</span>
          </div>
          <Segment<SizeMode>
            label="页面尺寸"
            value={sizeMode}
            options={[
              { value: 'a4', label: 'A4' },
              { value: 'original', label: '原始' },
              { value: 'custom', label: '自定义' },
            ]}
            onChange={(value) => onUpdate({ sizeMode: value })}
          />
          <Segment<Orientation>
            label="方向"
            value={orientation}
            options={[
              { value: 'portrait', label: '纵向' },
              { value: 'landscape', label: '横向' },
            ]}
            onChange={(value) => onUpdate({ orientation: value })}
          />
          {sizeMode === 'custom' ? (
            <div className="two-column-fields">
              <label className={`number-field ${dimensionErrors.width ? 'has-error' : ''}`}>
                <span>宽度</span>
                <span className="input-with-unit">
                  <input
                    id="custom-width"
                    name="custom-width"
                    type="number"
                    min={PAGE_DIMENSION_LIMITS.minMm}
                    max={PAGE_DIMENSION_LIMITS.maxMm}
                    step={1}
                    inputMode="decimal"
                    value={dimensionDrafts.width}
                    placeholder={customWidth === 'multiple' ? '多个值' : undefined}
                    aria-invalid={Boolean(dimensionErrors.width)}
                    aria-describedby={dimensionErrors.width ? 'custom-width-error' : undefined}
                    onChange={(event) => updateDimension('width', event.target.value)}
                    onBlur={() => commitDimension('width')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                    }}
                  />
                  <span>mm</span>
                </span>
                {dimensionErrors.width ? (
                  <span id="custom-width-error" className="field-error">
                    {dimensionErrors.width}
                  </span>
                ) : null}
              </label>
              <label className={`number-field ${dimensionErrors.height ? 'has-error' : ''}`}>
                <span>高度</span>
                <span className="input-with-unit">
                  <input
                    id="custom-height"
                    name="custom-height"
                    type="number"
                    min={PAGE_DIMENSION_LIMITS.minMm}
                    max={PAGE_DIMENSION_LIMITS.maxMm}
                    step={1}
                    inputMode="decimal"
                    value={dimensionDrafts.height}
                    placeholder={customHeight === 'multiple' ? '多个值' : undefined}
                    aria-invalid={Boolean(dimensionErrors.height)}
                    aria-describedby={dimensionErrors.height ? 'custom-height-error' : undefined}
                    onChange={(event) => updateDimension('height', event.target.value)}
                    onBlur={() => commitDimension('height')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                    }}
                  />
                  <span>mm</span>
                </span>
                {dimensionErrors.height ? (
                  <span id="custom-height-error" className="field-error">
                    {dimensionErrors.height}
                  </span>
                ) : null}
              </label>
            </div>
          ) : (
            <p className="field-note">
              当前 {firstSize.widthMm.toFixed(0)} × {firstSize.heightMm.toFixed(0)} mm
            </p>
          )}

          <div className="field-group">
            <span className="field-label">背景</span>
            <div className="swatch-row" role="group" aria-label="页面背景颜色">
              {backgrounds.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch ${background === color ? 'is-selected' : ''}`}
                  style={{ backgroundColor: color }}
                  aria-label={`背景 ${color}`}
                  aria-pressed={background === color}
                  onClick={() => onUpdate({ background: color })}
                />
              ))}
            </div>
            {background === 'multiple' ? <span className="mixed-hint">多个值</span> : null}
          </div>

          <label className="number-field">
            <span>页边距</span>
            <span className="input-with-unit">
              <input
                type="number"
                min={0}
                max={50}
                value={margin === 'multiple' ? '' : margin}
                placeholder={margin === 'multiple' ? '多个值' : undefined}
                onChange={(event) => onUpdate({ marginMm: Math.max(0, Number(event.target.value) || 0) })}
              />
              <span>mm</span>
            </span>
          </label>
        </section>

        {allImages ? (
          <section className="inspector-section" aria-labelledby="image-heading">
            <div className="section-heading">
              <h3 id="image-heading">图片显示</h3>
            </div>
            <Segment<ImageFit>
              label="适配方式"
              value={fit}
              options={[
                { value: 'contain', label: '适应' },
                { value: 'cover', label: '填充' },
                { value: 'stretch', label: '拉伸' },
              ]}
              onChange={(value) => onUpdate({ fit: value })}
            />

            <div className="field-group">
              <span className="field-label">对齐</span>
              <div className="alignment-grid" role="group" aria-label="图片对齐方式">
                {alignments.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={alignment === option.value ? 'is-selected' : ''}
                    aria-label={option.label}
                    aria-pressed={alignment === option.value}
                    onClick={() => onUpdate({ alignment: option.value })}
                  >
                    <span aria-hidden="true" />
                  </button>
                ))}
              </div>
              {alignment === 'multiple' ? <span className="mixed-hint">多个值</span> : null}
            </div>

            <label className="range-field">
              <span className="field-label">缩放</span>
              <span className="range-row">
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={scale === 'multiple' ? 100 : Math.round(scale * 100)}
                  onChange={(event) => onUpdate({ scale: Number(event.target.value) / 100 })}
                />
                <span>{scale === 'multiple' ? '多个值' : `${Math.round(scale * 100)}%`}</span>
              </span>
            </label>

            <div className="two-column-fields">
              <label className="number-field">
                <span>水平偏移</span>
                <span className="input-with-unit">
                  <input
                    type="number"
                    min={-50}
                    max={50}
                    value={offsetX === 'multiple' ? '' : offsetX}
                    placeholder={offsetX === 'multiple' ? '多个值' : undefined}
                    onChange={(event) => onUpdate({ offsetX: Number(event.target.value) || 0 })}
                  />
                  <span>%</span>
                </span>
              </label>
              <label className="number-field">
                <span>垂直偏移</span>
                <span className="input-with-unit">
                  <input
                    type="number"
                    min={-50}
                    max={50}
                    value={offsetY === 'multiple' ? '' : offsetY}
                    placeholder={offsetY === 'multiple' ? '多个值' : undefined}
                    onChange={(event) => onUpdate({ offsetY: Number(event.target.value) || 0 })}
                  />
                  <span>%</span>
                </span>
              </label>
            </div>
          </section>
        ) : null}

        <section className="inspector-section" aria-labelledby="actions-heading">
          <div className="section-heading">
            <h3 id="actions-heading">页面操作</h3>
          </div>
          <div className="action-grid">
            <button type="button" className="secondary-button" onClick={onRotate}>
              <RotateCw size={16} aria-hidden="true" />
              顺时针旋转
            </button>
            <button type="button" className="secondary-button" onClick={onDuplicate}>
              <Copy size={16} aria-hidden="true" />
              复制页面
            </button>
            <button type="button" className="danger-button" onClick={onDelete}>
              <Trash2 size={16} aria-hidden="true" />
              删除页面
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
}
