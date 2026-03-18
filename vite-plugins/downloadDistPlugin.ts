import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

import { getRequestPathname, streamDirectoryAsZip } from './utils/httpUtils';

export function downloadDistPlugin(): Plugin {
  return {
    name: 'download-dist-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (req.method !== 'GET' || pathname !== '/api/download-dist') {
          return next();
        }

        try {
          const projectRoot = process.cwd();
          const distDir = path.resolve(projectRoot, 'dist');

          if (!fs.existsSync(distDir)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Dist directory not found' }));
            return;
          }

          let projectName = 'project';
          try {
            const pkgPath = path.resolve(projectRoot, 'package.json');
            if (fs.existsSync(pkgPath)) {
              const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
              projectName = pkg.name || 'project';
            }
          } catch (error) {
            console.warn('Failed to read project name from package.json:', error);
          }

          streamDirectoryAsZip(res, distDir, `${projectName}-dist.zip`);
        } catch (error: any) {
          console.error('Download dist error:', error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
        }
      });
    },
  };
}
