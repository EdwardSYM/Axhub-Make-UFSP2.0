import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

export function handleDocsMarkdown(req: IncomingMessage, res: ServerResponse): boolean {
  // 处理 /prototypes/*.md 和 /components/*.md
  if ((req.url?.includes('/prototypes/') || req.url?.includes('/components/')) && req.url?.endsWith('.md')) {
    const urlWithoutQuery = req.url.split('?')[0];
    const mdPath = path.resolve(process.cwd(), 'src' + urlWithoutQuery);

    console.log('[虚拟HTML] 请求 page/element markdown:', req.url, '-> 路径:', mdPath, '存在:', fs.existsSync(mdPath));

    if (fs.existsSync(mdPath)) {
      try {
        const content = fs.readFileSync(mdPath, 'utf8');
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.statusCode = 200;
        res.end(content);
        console.log('[虚拟HTML] ✅ 返回 page/element markdown:', req.url);
        return true;
      } catch (err) {
        console.error('[虚拟HTML] ❌ 读取 page/element markdown 失败:', err);
      }
    } else {
      console.log('[虚拟HTML] ❌ page/element markdown 不存在:', mdPath);
    }
  }

  // 处理 /docs/*.md
  if (req.url?.startsWith('/docs/') && req.url?.endsWith('.md')) {
    const urlWithoutQuery = req.url.split('?')[0];
    // 移除 /docs/ 前缀和 .md 后缀
    const docPath = urlWithoutQuery.slice(6, -3); // 移除 '/docs/' 和 '.md'
    
    // 对路径进行 URL 解码
    const decodedDocPath = decodeURIComponent(docPath);
    
    const mdPath = path.resolve(process.cwd(), 'src/docs', decodedDocPath + '.md');

    console.log('[虚拟HTML] 请求 docs markdown:', req.url, '-> 路径:', mdPath, '存在:', fs.existsSync(mdPath));

    if (fs.existsSync(mdPath)) {
      try {
        const content = fs.readFileSync(mdPath, 'utf8');
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.statusCode = 200;
        res.end(content);
        console.log('[虚拟HTML] ✅ 返回 docs markdown:', req.url);
        return true;
      } catch (err) {
        console.error('[虚拟HTML] ❌ 读取 docs markdown 失败:', err);
      }
    } else {
      console.log('[虚拟HTML] ❌ docs markdown 不存在:', mdPath);
    }
  }

  return false;
}
