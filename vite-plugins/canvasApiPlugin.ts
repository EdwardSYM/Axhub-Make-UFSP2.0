import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

import { sanitizeDocBaseName } from './utils/docUtils';
import { getRequestPathname, readJsonBody } from './utils/httpUtils';

export function canvasApiPlugin(): Plugin {
  const CANVAS_EXT = '.excalidraw';
  const DEFAULT_CANVAS_DATA = JSON.stringify({
    type: 'excalidraw',
    version: 2,
    source: 'axhub-make',
    elements: [],
    appState: { gridSize: null, viewBackgroundColor: '#ffffff' },
    files: {},
  }, null, 2);

  return {
    name: 'canvas-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (!pathname.startsWith('/api/canvas')) {
          return next();
        }
        const canvasDir = path.resolve(process.cwd(), 'src/canvas');

        if (
          req.method === 'POST' &&
          (pathname === '/api/canvas/create' || pathname === '/api/canvas/create/')
        ) {
          try {
            const body = await readJsonBody(req);
            const displayName = String(body?.displayName || '').trim();

            fs.mkdirSync(canvasDir, { recursive: true });

            const fallbackBase = `canvas-${Date.now().toString(36)}`;
            const sanitizedBase = sanitizeDocBaseName(displayName || fallbackBase) || fallbackBase;
            let baseName = sanitizedBase;
            let suffix = 2;
            while (fs.existsSync(path.join(canvasDir, `${baseName}${CANVAS_EXT}`))) {
              baseName = `${sanitizedBase}-${suffix}`;
              suffix += 1;
            }

            const fileName = `${baseName}${CANVAS_EXT}`;
            const filePath = path.join(canvasDir, fileName);

            if (!filePath.startsWith(canvasDir)) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            fs.writeFileSync(filePath, DEFAULT_CANVAS_DATA, 'utf8');

            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              success: true,
              name: fileName,
              displayName: baseName,
              path: `src/canvas/${fileName}`,
            }));
          } catch (error: any) {
            console.error('Error creating canvas:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Create canvas failed' }));
          }
          return;
        }

        if (req.method === 'POST' && pathname.startsWith('/api/canvas/') && pathname.endsWith('/copy')) {
          try {
            const encodedName = pathname.slice('/api/canvas/'.length, -'/copy'.length);
            const canvasName = decodeURIComponent(encodedName);
            if (!canvasName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing canvas name' }));
              return;
            }

            const sourcePath = path.join(canvasDir, canvasName);
            if (!sourcePath.startsWith(canvasDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(sourcePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Canvas not found' }));
              return;
            }

            const sourceBaseName = path.basename(sourcePath, CANVAS_EXT);
            const safeBaseName = sanitizeDocBaseName(sourceBaseName) || sourceBaseName;
            const candidateBase = `${safeBaseName}-copy`;

            let nextBaseName = candidateBase;
            let suffix = 2;
            let nextName = `${nextBaseName}${CANVAS_EXT}`;
            let nextPath = path.join(canvasDir, nextName);
            while (fs.existsSync(nextPath)) {
              nextBaseName = `${candidateBase}${suffix}`;
              nextName = `${nextBaseName}${CANVAS_EXT}`;
              nextPath = path.join(canvasDir, nextName);
              suffix += 1;
            }

            if (!nextPath.startsWith(canvasDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            fs.copyFileSync(sourcePath, nextPath);

            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              success: true,
              name: nextName,
              displayName: nextBaseName,
              path: `src/canvas/${nextName}`,
            }));
          } catch (error: any) {
            console.error('Error copying canvas:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Copy canvas failed' }));
          }
          return;
        }

        if (req.method === 'DELETE' && pathname.startsWith('/api/canvas/')) {
          try {
            const encodedName = pathname.replace('/api/canvas/', '');
            const canvasName = decodeURIComponent(encodedName);
            if (!canvasName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing canvas name' }));
              return;
            }
            const filePath = path.join(canvasDir, canvasName);

            if (!filePath.startsWith(canvasDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Canvas not found' }));
              return;
            }

            fs.unlinkSync(filePath);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (error: any) {
            console.error('Error deleting canvas:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        if (req.method === 'PUT' && pathname.startsWith('/api/canvas/')) {
          try {
            const encodedName = pathname.replace('/api/canvas/', '');
            if (!encodedName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing canvas name' }));
              return;
            }

            const bodyData = await readJsonBody(req);
            const hasContentUpdate = typeof bodyData?.content === 'string';
            let newBaseName = String(bodyData?.newBaseName || '').trim();
            const hasRename = Boolean(newBaseName);

            if (!hasContentUpdate && !hasRename) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing content or newBaseName parameter' }));
              return;
            }
            if (hasRename && /[/\\:*?"<>|]/.test(newBaseName)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid newBaseName format' }));
              return;
            }

            const canvasName = decodeURIComponent(encodedName);
            const oldPath = path.join(canvasDir, canvasName);
            if (!oldPath.startsWith(canvasDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(oldPath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Canvas not found' }));
              return;
            }

            let finalPath = oldPath;
            if (hasRename) {
              if (newBaseName.toLowerCase().endsWith(CANVAS_EXT)) {
                newBaseName = newBaseName.slice(0, -CANVAS_EXT.length).trim();
              }
              const safeBaseName = sanitizeDocBaseName(newBaseName);
              if (!safeBaseName) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid newBaseName format' }));
                return;
              }

              const newFileName = `${safeBaseName}${CANVAS_EXT}`;
              const newPath = path.join(canvasDir, newFileName);

              if (!newPath.startsWith(canvasDir)) {
                res.statusCode = 403;
                res.end(JSON.stringify({ error: 'Forbidden' }));
                return;
              }
              if (newPath !== oldPath && fs.existsSync(newPath)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: '目标文件已存在' }));
                return;
              }

              if (newPath !== oldPath) {
                fs.renameSync(oldPath, newPath);
              }
              finalPath = newPath;
            }

            if (hasContentUpdate) {
              fs.writeFileSync(finalPath, String(bodyData.content), 'utf8');
            }

            const relativeName = path.basename(finalPath);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, name: relativeName }));
          } catch (error: any) {
            console.error('Error updating canvas:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        if (req.method !== 'GET') {
          return next();
        }

        if (pathname.startsWith('/api/canvas/') && pathname !== '/api/canvas' && pathname !== '/api/canvas/') {
          try {
            const encodedName = pathname.replace('/api/canvas/', '');
            if (!encodedName) {
              return next();
            }

            const canvasName = decodeURIComponent(encodedName);
            const filePath = path.join(canvasDir, canvasName);

            if (!filePath.startsWith(canvasDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath, 'utf8');
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(content);
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Canvas not found' }));
            }
          } catch (error: any) {
            console.error('Error loading canvas:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        if (pathname === '/api/canvas' || pathname === '/api/canvas/') {
          try {
            const items: Array<{ name: string; displayName: string }> = [];

            if (fs.existsSync(canvasDir)) {
              const entries = fs.readdirSync(canvasDir, { withFileTypes: true });
              entries.forEach((entry) => {
                if (!entry.isFile()) return;
                if (!entry.name.endsWith(CANVAS_EXT)) return;
                const baseName = entry.name.slice(0, -CANVAS_EXT.length);
                items.push({
                  name: entry.name,
                  displayName: baseName,
                });
              });
            }

            items.sort((a, b) => a.name.localeCompare(b.name));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(items));
          } catch (error: any) {
            console.error('Error listing canvases:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        next();
      });
    },
  };
}
