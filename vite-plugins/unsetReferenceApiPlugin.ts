import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export function unsetReferenceApiPlugin(): Plugin {
  return {
    name: 'unset-reference-api-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/unset-reference', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const { path: targetPath } = JSON.parse(body);

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

            const srcDir = path.resolve(process.cwd(), 'src', targetPath);

            if (!fs.existsSync(srcDir)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Directory not found' }));
              return;
            }

            const folderName = path.basename(srcDir);
            if (!folderName.startsWith('ref-')) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '该项目不是参考项目' }));
              return;
            }

            const newFolderName = folderName.substring(4);
            const parentDir = path.dirname(srcDir);
            const newSrcDir = path.join(parentDir, newFolderName);

            if (fs.existsSync(newSrcDir)) {
              res.statusCode = 409;
              res.end(JSON.stringify({ error: '同名项目已存在' }));
              return;
            }

            fs.renameSync(srcDir, newSrcDir);

            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
          } catch (error: any) {
            console.error('Unset reference error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      });
    },
  };
}
