import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function tryDecodeUrlPath(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

function isPathInside(baseDir: string, targetPath: string): boolean {
  const relative = path.relative(baseDir, targetPath);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function sendFile(res: ServerResponse, filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', mimeType);
  res.statusCode = 200;
  res.end(fs.readFileSync(filePath));
}

export function handleDocImageAssets(req: IncomingMessage, res: ServerResponse): boolean {
  if (!req.url) return false;

  const rawPathname = req.url.split('?')[0];
  const pathname = tryDecodeUrlPath(rawPathname);
  if (!pathname.includes('/assets/images/')) {
    return false;
  }

  // /components/{name}/assets/images/{file}
  // /prototypes/{name}/assets/images/{file}
  // /themes/{name}/assets/images/{file}
  const typedMatch = pathname.match(/^\/(components|prototypes|themes)\/([^/]+)\/assets\/images\/(.+)$/);
  if (typedMatch) {
    const type = typedMatch[1];
    const entryName = typedMatch[2];
    const relativeAssetPath = typedMatch[3];
    const entryRoot = path.resolve(process.cwd(), 'src', type);
    const baseDir = path.resolve(entryRoot, entryName, 'assets', 'images');
    if (!isPathInside(entryRoot, baseDir)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return true;
    }
    const targetPath = path.resolve(baseDir, relativeAssetPath);

    if (!isPathInside(baseDir, targetPath)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return true;
    }

    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
      res.statusCode = 404;
      res.end('Not Found');
      return true;
    }

    sendFile(res, targetPath);
    return true;
  }

  // /docs/assets/images/{file}
  // /docs/{subdir}/assets/images/{file}
  if (pathname.startsWith('/docs/')) {
    const afterDocs = pathname.slice('/docs/'.length);
    let docsSubDir = '';
    let relativeAssetPath = '';

    if (afterDocs.startsWith('assets/images/')) {
      relativeAssetPath = afterDocs.slice('assets/images/'.length);
    } else {
      const marker = '/assets/images/';
      const markerIndex = afterDocs.indexOf(marker);
      if (markerIndex > 0) {
        docsSubDir = afterDocs.slice(0, markerIndex);
        relativeAssetPath = afterDocs.slice(markerIndex + marker.length);
      }
    }

    if (relativeAssetPath) {
      const docsRoot = path.resolve(process.cwd(), 'src', 'docs');
      const baseDir = path.resolve(docsRoot, docsSubDir, 'assets', 'images');
      if (!isPathInside(docsRoot, baseDir)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return true;
      }
      const targetPath = path.resolve(baseDir, relativeAssetPath);

      if (!isPathInside(baseDir, targetPath)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return true;
      }

      if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
        res.statusCode = 404;
        res.end('Not Found');
        return true;
      }

      sendFile(res, targetPath);
      return true;
    }
  }

  return false;
}
