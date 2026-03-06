import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { mergeCss } from '../../utils/cssUtils';

export function handleHackCssSave(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method === 'POST' && req.url?.startsWith('/api/hack-css/save')) {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { path: targetPath, content } = JSON.parse(body);
        
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
        
        let existingCss = '';
        if (fs.existsSync(hackCssPath)) {
          existingCss = fs.readFileSync(hackCssPath, 'utf8');
        }

        const mergedCss = mergeCss(existingCss, content || '');
        
        const warningComment = '/* @ai-agent-warning: Do not modify this file unless explicitly requested by the user */\n\n';
        const finalCss = mergedCss.startsWith('/* @ai-agent-warning:') 
          ? mergedCss 
          : warningComment + mergedCss;
        
        fs.writeFileSync(hackCssPath, finalCss, 'utf8');
        console.log('[API] ✅ 增量保存 hack.css:', hackCssPath);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, path: hackCssPath, merged: mergedCss }));
      } catch (err) {
        console.error('[API] ❌ 保存 hack.css 失败:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to save hack.css' }));
      }
    });
    
    return true;
  }
  
  return false;
}
