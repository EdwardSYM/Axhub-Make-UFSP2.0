import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

export function handleHackCssRequest(req: IncomingMessage, res: ServerResponse): boolean {
  const requestPath = req.url ? req.url.split('?')[0] : '';
  
  if (req.method === 'GET' && requestPath.endsWith('/hack.css')) {
    const pathParts = requestPath.split('/').filter(Boolean);
    
    if (pathParts.length >= 2 && ['components', 'prototypes'].includes(pathParts[0])) {
      const hackCssPath = path.resolve(process.cwd(), 'src', requestPath.slice(1));
      
      if (fs.existsSync(hackCssPath)) {
        try {
          let css = fs.readFileSync(hackCssPath, 'utf8');
          css = css.replace(/\/\*\s*@ai-agent-warning:.*?\*\/\s*/g, '');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
          res.end(css);
          return true;
        } catch (err) {
          console.error('[API] 读取 hack.css 失败:', hackCssPath, err);
        }
      } else {
        console.warn('[API] hack.css 不存在:', hackCssPath);
      }
    }
  }
  
  return false;
}
