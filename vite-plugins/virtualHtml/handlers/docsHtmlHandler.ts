import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

export function handleDocsHtml(req: IncomingMessage, res: ServerResponse, specTemplate: string): boolean {
  if (!req.url?.includes('/docs.html')) {
    return false;
  }

  const urlWithoutQuery = req.url.split('?')[0];
  const urlPath = urlWithoutQuery.replace('/docs.html', '');
  const pathParts = urlPath.split('/').filter(Boolean);

  console.log('[虚拟HTML] Docs 请求路径:', req.url, '解析部分:', pathParts);

  // 处理 /docs/* 的 docs.html 请求
  if (pathParts.length >= 1 && pathParts[0] === 'docs') {
    const docName = pathParts.slice(1).join('/');
    const mdPath = path.resolve(process.cwd(), 'src/docs' + (docName ? '/' + docName : '') + '.md');

    console.log('[虚拟HTML] 检查 docs markdown 文件:', mdPath, '存在:', fs.existsSync(mdPath));

    if (fs.existsSync(mdPath)) {
      const title = `Docs: ${docName || 'Index'}`;
      const specMdUrl = `${urlPath}.md`;

      let html = specTemplate.replace(/\{\{TITLE\}\}/g, title);
      html = html.replace(/\{\{SPEC_URL\}\}/g, specMdUrl);
      html = html.replace(/\{\{DOCS_CONFIG\}\}/g, '[]');
      html = html.replace(/\{\{MULTI_DOC\}\}/g, 'false');

      console.log('[虚拟HTML] ✅ 返回 Docs 虚拟 HTML:', req.url);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.statusCode = 200;
      res.end(html);
      return true;
    } else {
      console.log('[虚拟HTML] ❌ docs markdown 不存在:', mdPath);
    }
  }

  return false;
}
