# Paperdesk PDF 工作台

浏览器内运行的 PDF 页面整理工具。用户可选择 PDF、PNG、JPG 或 WEBP 文件，在统一工作台中调整页序、页面尺寸、背景、图片适配方式和旋转角度，并导出新的 PDF。

## 本地处理

- 文件不会上传到服务器。
- 单次最多 30 个文件，单文件不超过 50 MB，总量不超过 200 MB，最多 200 页。
- 编辑状态仅保留在当前页面会话中，关闭页面后不会恢复。
- PDF 渲染使用 PDF.js，页面合成与导出使用 pdf-lib。

## 开发

```bash
npm install
npm run dev
```

生产构建与验证：

```bash
npm run typecheck
npm test
npm run build
npm run preview
```
