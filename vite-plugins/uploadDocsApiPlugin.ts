import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

import { getRequestPathname } from './utils/httpUtils';

export function uploadDocsApiPlugin(): Plugin {
  return {
    name: 'upload-docs-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (req.method !== 'POST' || pathname !== '/api/upload-docs') {
          return next();
        }

        const chunks: Buffer[] = [];
        let totalLength = 0;

        req.on('data', (chunk: Buffer) => {
          totalLength += chunk.length;
          if (totalLength > 1024 * 1024 * 20) {
            res.statusCode = 413;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Payload too large' }));
            req.destroy();
            return;
          }
          chunks.push(chunk);
        });

        req.on('end', () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf8');
            const body = raw ? JSON.parse(raw) : null;
            const files = body?.files;

            if (!Array.isArray(files) || files.length === 0) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing files' }));
              return;
            }

            const docsDir = path.resolve(process.cwd(), 'src/docs');
            fs.mkdirSync(docsDir, { recursive: true });

            const saved: string[] = [];

            files.forEach((f: any) => {
              const rawName = typeof f?.name === 'string' ? f.name : '';
              const content = typeof f?.content === 'string' ? f.content : '';

              if (!rawName) {
                throw new Error('Invalid file name');
              }

              let safeName = path.basename(rawName).trim();
              safeName = safeName.replace(/[^\w.\- ]+/g, '-').replace(/\s+/g, '-');

              const lowerName = safeName.toLowerCase();
              if (!lowerName.endsWith('.md') && !lowerName.endsWith('.csv') && !lowerName.endsWith('.json')) {
                throw new Error('Only .md, .csv, and .json files are allowed');
              }

              const targetPath = path.join(docsDir, safeName);
              if (!targetPath.startsWith(docsDir)) {
                throw new Error('Forbidden');
              }

              fs.writeFileSync(targetPath, content, 'utf8');
              saved.push(safeName.replace(/\.(md|csv|json)$/i, ''));
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: true, files: saved }));
          } catch (error: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Upload failed' }));
          }
        });
      });
    },
  };
}
