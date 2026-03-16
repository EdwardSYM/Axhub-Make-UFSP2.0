import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

export function handleHackCssClear(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method === 'POST' && req.url?.startsWith('/api/hack-css/clear')) {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { path: rawTargetPath } = JSON.parse(body);
        const targetPath = decodeURIComponent(String(rawTargetPath || ''));
        
        if (!targetPath) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'path is required' }));
          return;
        }

        const pathParts = targetPath.split('/').filter(Boolean);
        if (pathParts.length < 2 || !['components', 'prototypes'].includes(pathParts[0])) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid path format. Expected: components/xxx or prototypes/xxx' }));
          return;
        }

        const hackCssPath = path.resolve(process.cwd(), 'src', targetPath, 'hack.css');
        
        if (fs.existsSync(hackCssPath)) {
          fs.unlinkSync(hackCssPath);
          console.log('[API] ✅ 清空 hack.css:', hackCssPath);
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, path: hackCssPath }));
      } catch (err) {
        console.error('[API] ❌ 清空 hack.css 失败:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to clear hack.css' }));
      }
    });
    
    return true;
  }
  
  return false;
}
