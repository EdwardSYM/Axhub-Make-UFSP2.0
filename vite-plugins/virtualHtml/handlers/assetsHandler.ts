import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

function hasViteModuleQuery(url: string): boolean {
  const query = url.split('?')[1];
  if (!query) return false;

  const params = new URLSearchParams(query);
  return (
    params.has('import') ||
    params.has('url') ||
    params.has('raw') ||
    params.has('worker') ||
    params.has('sharedworker')
  );
}

export function handleAssetsRequest(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.url && req.url.startsWith('/assets/')) {
    if (hasViteModuleQuery(req.url)) {
      return false;
    }

    const relativePath = req.url.startsWith('/') ? req.url.slice(1) : req.url;
    const assetPath = path.resolve(process.cwd(), 'admin', relativePath);
    
    console.log('[主项目] 请求 asset:', req.url, '-> 路径:', assetPath, '存在:', fs.existsSync(assetPath));
    
    if (fs.existsSync(assetPath)) {
      try {
        const content = fs.readFileSync(assetPath);
        const ext = path.extname(assetPath);
        const contentTypes: Record<string, string> = {
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.gif': 'image/gif'
        };
        
        res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
        res.statusCode = 200;
        res.end(content);
        console.log('[主项目] ✅ 成功返回 asset:', req.url);
        return true;
      } catch (err) {
        console.error('[主项目] ❌ 读取 assets 文件失败:', err);
      }
    } else {
      console.log('[主项目] ❌ asset 文件不存在');
    }
  }
  
  return false;
}
