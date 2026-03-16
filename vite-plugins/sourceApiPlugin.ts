import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export function sourceApiPlugin(): Plugin {
  return {
    name: 'source-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.method !== 'GET' || !req.url.startsWith('/api/source')) {
          return next();
        }

        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const targetPath = url.searchParams.get('path');

          if (!targetPath) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing path parameter' }));
            return;
          }

          if (targetPath.includes('..') || targetPath.startsWith('/')) {
            res.statusCode = 403;
            res.end(JSON.stringify({ error: 'Invalid path' }));
            return;
          }

          const sourceFile = path.resolve(process.cwd(), 'src', targetPath, 'index.tsx');

          if (!fs.existsSync(sourceFile)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Source file not found' }));
            return;
          }

          const sourceCode = fs.readFileSync(sourceFile, 'utf8');
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(sourceCode);
        } catch (error: any) {
          console.error('Source file error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    },
  };
}
