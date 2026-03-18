import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

import { getRequestPathname } from './utils/httpUtils';

export function versionApiPlugin(): Plugin {
  return {
    name: 'version-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (req.method !== 'GET' || pathname !== '/api/version') {
          return next();
        }

        try {
          const pkgPath = path.resolve(process.cwd(), 'package.json');
          const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : null;
          const version = pkg?.version ?? null;

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify({ version }));
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error?.message || 'Unknown error' }));
        }
      });
    },
  };
}
