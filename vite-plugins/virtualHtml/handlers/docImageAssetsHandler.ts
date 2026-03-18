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

export function handleDocImageAssets(req: IncomingMessage, res: ServerResponse): boolean {
  if (!req.url) return false;
  if (hasViteModuleQuery(req.url)) return false;

  const rawPathname = req.url.split('?')[0];
  const pathname = tryDecodeUrlPath(rawPathname);
  const isDocsAssetRequest = pathname.startsWith('/docs/') && pathname.includes('/assets/');
  if (!pathname.includes('/assets/images/') && !isDocsAssetRequest) {
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

  // /docs/assets/{file}
  // /docs/assets/images/{file}
  // /docs/{subdir}/assets/{file}
  // /docs/{subdir}/assets/images/{file}
  if (pathname.startsWith('/docs/')) {
    const afterDocs = pathname.slice('/docs/'.length);
    let docsSubDir = '';
    let relativeAssetPath = '';
    let assetDirSegments: string[] = ['assets'];

    if (afterDocs.startsWith('assets/images/')) {
      assetDirSegments = ['assets', 'images'];
      relativeAssetPath = afterDocs.slice('assets/images/'.length);
    } else if (afterDocs.startsWith('assets/')) {
      relativeAssetPath = afterDocs.slice('assets/'.length);
    } else {
      const imageMarker = '/assets/images/';
      const imageMarkerIndex = afterDocs.indexOf(imageMarker);
      if (imageMarkerIndex > 0) {
        docsSubDir = afterDocs.slice(0, imageMarkerIndex);
        assetDirSegments = ['assets', 'images'];
        relativeAssetPath = afterDocs.slice(imageMarkerIndex + imageMarker.length);
      } else {
        const assetMarker = '/assets/';
        const assetMarkerIndex = afterDocs.indexOf(assetMarker);
        if (assetMarkerIndex > 0) {
          docsSubDir = afterDocs.slice(0, assetMarkerIndex);
          relativeAssetPath = afterDocs.slice(assetMarkerIndex + assetMarker.length);
        }
      }
    }

    if (relativeAssetPath) {
      const docsRoot = path.resolve(process.cwd(), 'src', 'docs');
      const baseDir = path.resolve(docsRoot, docsSubDir, ...assetDirSegments);
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
