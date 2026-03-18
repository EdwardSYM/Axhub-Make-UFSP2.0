import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';

import {
  isPathInside,
  resolveDocumentPathFromDocUrl,
  resolveUniqueFilePath,
  sanitizeImageUploadFileName,
  SPEC_DOC_IMAGE_ALLOWED_EXTENSIONS,
  SPEC_DOC_IMAGE_MAX_FILE_SIZE,
  SPEC_DOC_IMAGE_MIME_TO_EXTENSION,
} from './utils/docUtils';
import { getRequestPathname } from './utils/httpUtils';

export function specDocApiPlugin(): Plugin {
  return {
    name: 'spec-doc-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        const projectRoot = process.cwd();

        if (req.method === 'POST' && pathname === '/api/spec-doc/upload-image') {
          const uploadDir = path.resolve(projectRoot, 'temp', 'spec-doc-images');
          fs.mkdirSync(uploadDir, { recursive: true });

          const form = formidable({
            uploadDir,
            keepExtensions: true,
            multiples: false,
            maxFileSize: SPEC_DOC_IMAGE_MAX_FILE_SIZE,
          });

          form.parse(req, (parseError: any, fields: any, files: any) => {
            const removeTempFile = (tempPath: string) => {
              if (!tempPath) return;
              try {
                if (fs.existsSync(tempPath)) {
                  fs.unlinkSync(tempPath);
                }
              } catch {
                // Ignore cleanup errors.
              }
            };

            if (parseError) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: parseError?.message || 'Failed to parse multipart payload' }));
              return;
            }

            const docUrlField = Array.isArray(fields?.docUrl) ? fields.docUrl[0] : fields?.docUrl;
            const docUrl = String(docUrlField || '').trim();
            if (!docUrl) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing docUrl' }));
              return;
            }

            const uploadedFileValue = files?.file ?? files?.files;
            const uploadedFile = Array.isArray(uploadedFileValue) ? uploadedFileValue[0] : uploadedFileValue;
            if (!uploadedFile) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing file' }));
              return;
            }

            const tempPath = String(uploadedFile?.filepath || uploadedFile?.path || '').trim();
            if (!tempPath || !fs.existsSync(tempPath)) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Uploaded file is missing from temporary storage' }));
              return;
            }

            try {
              const resolved = resolveDocumentPathFromDocUrl(docUrl, req.headers.host, projectRoot);
              if ('status' in resolved) {
                res.statusCode = resolved.status;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: resolved.error }));
                return;
              }

              if (!fs.existsSync(resolved.docPath)) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Document not found' }));
                return;
              }

              const originalName = String(
                uploadedFile?.originalFilename || uploadedFile?.newFilename || uploadedFile?.name || path.basename(tempPath),
              ).trim();
              const mimeType = String(uploadedFile?.mimetype || uploadedFile?.type || '').toLowerCase();
              const originalExt = path.extname(originalName).toLowerCase();
              const extByMime = SPEC_DOC_IMAGE_MIME_TO_EXTENSION[mimeType] || '';
              const normalizedExt = SPEC_DOC_IMAGE_ALLOWED_EXTENSIONS.has(originalExt)
                ? originalExt
                : extByMime;

              if (!mimeType.startsWith('image/') && !SPEC_DOC_IMAGE_ALLOWED_EXTENSIONS.has(originalExt)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Only image files are allowed' }));
                return;
              }
              if (!normalizedExt || !SPEC_DOC_IMAGE_ALLOWED_EXTENSIONS.has(normalizedExt)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Unsupported image type' }));
                return;
              }

              const docDir = path.dirname(resolved.docPath);
              const docsRoot = path.resolve(projectRoot, 'src', 'docs');
              const isDocsEntry = isPathInside(docsRoot, resolved.docPath);
              const assetsDir = isDocsEntry
                ? path.join(docDir, 'assets')
                : path.join(docDir, 'assets', 'images');
              fs.mkdirSync(assetsDir, { recursive: true });

              const safeFileName = sanitizeImageUploadFileName(
                originalName || `image${normalizedExt}`,
                mimeType,
              );
              const finalPath = resolveUniqueFilePath(assetsDir, safeFileName);
              if (!isPathInside(assetsDir, finalPath)) {
                res.statusCode = 403;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Forbidden path' }));
                return;
              }

              fs.copyFileSync(tempPath, finalPath);

              const relativePath = path.relative(projectRoot, finalPath).split(path.sep).join('/');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({
                success: true,
                url: isDocsEntry
                  ? `assets/${path.basename(finalPath)}`
                  : `assets/images/${path.basename(finalPath)}`,
                path: relativePath,
              }));
            } catch (error: any) {
              console.error('Error uploading spec doc image:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: error?.message || 'Image upload failed' }));
            } finally {
              removeTempFile(tempPath);
            }
          });
          return;
        }

        if (req.method !== 'POST' || pathname !== '/api/spec-doc/save') {
          return next();
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const bodyText = Buffer.concat(chunks).toString('utf8');
            const body = bodyText ? JSON.parse(bodyText) : {};
            const docUrl = typeof body?.docUrl === 'string' ? body.docUrl : '';
            const content = typeof body?.content === 'string' ? body.content : '';

            if (!docUrl) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing docUrl' }));
              return;
            }

            const resolved = resolveDocumentPathFromDocUrl(docUrl, req.headers.host, projectRoot);
            if ('status' in resolved) {
              res.statusCode = resolved.status;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: resolved.error }));
              return;
            }

            const srcRoot = path.resolve(projectRoot, 'src');
            const relativeToSrc = path.relative(srcRoot, resolved.docPath).split(path.sep).join('/');
            const [entryType] = relativeToSrc.split('/');
            const fileName = path.basename(resolved.docPath).toLowerCase();
            const isAllowedEntryType = ['components', 'prototypes', 'themes'].includes(entryType || '');
            const isSpecFile = fileName === 'spec.md' || fileName === 'prd.md';
            if (!isAllowedEntryType || !isSpecFile) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Only spec.md/prd.md under components/prototypes/themes can be saved' }));
              return;
            }

            if (!fs.existsSync(resolved.docPath)) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Document not found' }));
              return;
            }

            fs.writeFileSync(resolved.docPath, content, 'utf8');

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: true, path: `/${relativeToSrc}` }));
          } catch (error: any) {
            console.error('Error saving spec doc:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Save failed' }));
          }
        });
      });
    },
  };
}
