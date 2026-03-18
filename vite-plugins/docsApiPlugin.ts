import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

import {
  createManualDocTemplate,
  getDocsDir,
  getTemplatesDir,
  isTemplateDocName,
  isProtectedDocName,
  safeDecodeURIComponent,
  sanitizeDocBaseName,
  scanDocReferences,
} from './utils/docUtils';
import { getRequestPathname, readJsonBody } from './utils/httpUtils';

type DocAction = 'rename' | 'delete';

function getProtectedDocPayload(action: DocAction) {
  return {
    error: action === 'rename'
      ? '项目总览入口文档禁止改名，可继续编辑内容'
      : '项目总览入口文档禁止删除',
    code: 'PROTECTED_DOC',
    protected: true,
    references: [],
    hasReferences: false,
  };
}

function getReferencedDocPayload(action: DocAction, references: string[]) {
  return {
    error: action === 'rename'
      ? '文档存在项目内引用，请先处理引用后再改名'
      : '文档存在项目内引用，请先处理引用后再删除',
    code: 'DOC_REFERENCED',
    protected: false,
    references,
    hasReferences: references.length > 0,
  };
}

function normalizeRenameBaseNameForPath(docPath: string, nextBaseName: string) {
  const ext = path.extname(docPath);
  let normalizedBaseName = String(nextBaseName || '').trim();
  if (ext && normalizedBaseName.toLowerCase().endsWith(ext.toLowerCase())) {
    normalizedBaseName = normalizedBaseName.slice(0, -ext.length).trim();
  }
  return {
    ext,
    safeBaseName: sanitizeDocBaseName(normalizedBaseName),
  };
}

export function docsApiPlugin(): Plugin {
  return {
    name: 'docs-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (!pathname.startsWith('/api/docs')) {
          return next();
        }
        if (pathname === '/api/docs/templates' || pathname.startsWith('/api/docs/templates/')) {
          return next();
        }
        const docsDir = getDocsDir(process.cwd());
        const encodedDocName = pathname.startsWith('/api/docs/')
          ? pathname.slice('/api/docs/'.length)
          : '';
        const decodedDocName = safeDecodeURIComponent(encodedDocName);
        const isCompatTemplateRequest = Boolean(encodedDocName) && isTemplateDocName(decodedDocName);

        if (isCompatTemplateRequest && (req.method === 'GET' || req.method === 'PUT')) {
          try {
            const templateName = decodedDocName.slice('templates/'.length);
            if (!templateName) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing template name' }));
              return;
            }

            const templatesDir = getTemplatesDir(process.cwd());
            const templatePath = path.join(templatesDir, templateName);
            if (!templatePath.startsWith(templatesDir)) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            if (!fs.existsSync(templatePath)) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Template not found' }));
              return;
            }

            if (req.method === 'GET') {
              res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
              res.end(fs.readFileSync(templatePath, 'utf8'));
              return;
            }

            const bodyData = await readJsonBody(req);
            if (typeof bodyData?.content !== 'string') {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing content parameter' }));
              return;
            }

            fs.writeFileSync(templatePath, String(bodyData.content), 'utf8');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: true, name: templateName }));
            return;
          } catch (error: any) {
            console.error('Error handling encoded template doc path:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Template request failed' }));
            return;
          }
        }

        if (req.method === 'POST' && (pathname === '/api/docs/check-references' || pathname === '/api/docs/check-references/')) {
          try {
            const body = await readJsonBody(req);
            const docName = String(body?.docName || '').trim();
            const action = body?.action === 'rename' ? 'rename' : body?.action === 'delete' ? 'delete' : '';
            const nextBaseName = String(body?.nextBaseName || '').trim();

            if (!docName) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing docName parameter' }));
              return;
            }
            if (isTemplateDocName(docName)) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Templates must be managed via /api/docs/templates' }));
              return;
            }

            if (action !== 'rename' && action !== 'delete') {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Invalid action parameter' }));
              return;
            }

            const docPath = path.join(docsDir, docName);
            if (!docPath.startsWith(docsDir)) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(docPath)) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Document not found' }));
              return;
            }

            let hasActualRename = action === 'delete';
            if (action === 'rename') {
              if (!nextBaseName) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Missing nextBaseName parameter' }));
                return;
              }

              if (/[/\\:*?"<>|]/.test(nextBaseName)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Invalid nextBaseName format' }));
                return;
              }

              const { ext, safeBaseName } = normalizeRenameBaseNameForPath(docPath, nextBaseName);
              if (!safeBaseName) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Invalid nextBaseName format' }));
                return;
              }

              const nextPath = path.join(path.dirname(docPath), `${safeBaseName}${ext}`);
              hasActualRename = nextPath !== docPath;
            }

            if (hasActualRename && isProtectedDocName(docName)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({
                docName,
                ...getProtectedDocPayload(action),
              }));
              return;
            }

            const references = hasActualRename ? scanDocReferences(docName) : [];
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              docName,
              references,
              hasReferences: references.length > 0,
              protected: false,
              ...(references.length > 0 ? { code: 'DOC_REFERENCED' } : {}),
            }));
          } catch (error: any) {
            console.error('Error checking doc references:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Check doc references failed' }));
          }
          return;
        }

        if (
          req.method === 'POST' &&
          (pathname === '/api/docs/manual-create' || pathname === '/api/docs/manual-create/' || pathname === '/manual-create')
        ) {
          try {
            const body = await readJsonBody(req);
            const displayName = String(body?.displayName || '').trim();
            const fileNameInput = String(body?.fileName || body?.displayName || '').trim();

            if (!displayName) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing displayName' }));
              return;
            }

            fs.mkdirSync(docsDir, { recursive: true });

            const fallbackBase = `doc-${Date.now().toString(36)}`;
            const sanitizedBase = sanitizeDocBaseName(fileNameInput || displayName) || fallbackBase;
            let baseName = sanitizedBase;
            let suffix = 2;
            while (fs.existsSync(path.join(docsDir, `${baseName}.md`))) {
              baseName = `${sanitizedBase}-${suffix}`;
              suffix += 1;
            }

            const docFileName = `${baseName}.md`;
            const docPath = path.join(docsDir, docFileName);

            if (!docPath.startsWith(docsDir)) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            fs.writeFileSync(docPath, createManualDocTemplate(displayName), 'utf8');

            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              success: true,
              name: docFileName,
              displayName,
              path: `src/docs/${docFileName}`,
            }));
          } catch (error: any) {
            console.error('Error manual creating doc:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Create doc failed' }));
          }
          return;
        }

        if (req.method === 'POST' && pathname.startsWith('/api/docs/') && pathname.endsWith('/copy')) {
          try {
            const encodedDocName = pathname.slice('/api/docs/'.length, -'/copy'.length);
            const docName = decodeURIComponent(encodedDocName);
            if (!docName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing document name' }));
              return;
            }
            if (isTemplateDocName(docName)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Templates must be managed via /api/docs/templates' }));
              return;
            }

            const sourcePath = path.join(docsDir, docName);
            if (!sourcePath.startsWith(docsDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(sourcePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Document not found' }));
              return;
            }

            const sourceDir = path.dirname(sourcePath);
            const ext = path.extname(sourcePath);
            const sourceBaseName = path.basename(sourcePath, ext);
            const safeBaseName = sanitizeDocBaseName(sourceBaseName) || sourceBaseName;
            const candidateBase = `${safeBaseName}-copy`;

            let nextBaseName = candidateBase;
            let suffix = 2;
            let nextName = `${nextBaseName}${ext}`;
            let nextPath = path.join(sourceDir, nextName);
            while (fs.existsSync(nextPath)) {
              nextBaseName = `${candidateBase}${suffix}`;
              nextName = `${nextBaseName}${ext}`;
              nextPath = path.join(sourceDir, nextName);
              suffix += 1;
            }

            if (!nextPath.startsWith(docsDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            fs.copyFileSync(sourcePath, nextPath);

            const relativeName = path.relative(docsDir, nextPath).split(path.sep).join('/');
            const relativeDisplayName = relativeName.replace(/\.[^./\\]+$/u, '');

            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              success: true,
              name: relativeName,
              displayName: relativeDisplayName,
              path: `src/docs/${relativeName}`,
            }));
          } catch (error: any) {
            console.error('Error copying doc:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Copy doc failed' }));
          }
          return;
        }

        if (req.method === 'DELETE' && pathname.startsWith('/api/docs/')) {
          try {
            const encodedDocName = pathname.replace('/api/docs/', '');
            const docName = decodeURIComponent(encodedDocName);
            if (!docName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing document name' }));
              return;
            }
            if (isTemplateDocName(docName)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Templates must be managed via /api/docs/templates' }));
              return;
            }
            const docPath = path.join(docsDir, docName);

            if (!docPath.startsWith(docsDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            if (!fs.existsSync(docPath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Document not found' }));
              return;
            }

            if (isProtectedDocName(docName)) {
              res.statusCode = 409;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(getProtectedDocPayload('delete')));
              return;
            }

            const references = scanDocReferences(docName);
            if (references.length > 0) {
              res.statusCode = 409;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(getReferencedDocPayload('delete', references)));
              return;
            }

            fs.unlinkSync(docPath);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (error: any) {
            console.error('Error deleting doc:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        if (req.method === 'PUT' && pathname.startsWith('/api/docs/')) {
          try {
            const encodedDocName = pathname.replace('/api/docs/', '');
            if (!encodedDocName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing document name' }));
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

            const docName = decodeURIComponent(encodedDocName);
            if (isTemplateDocName(docName)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Templates must be managed via /api/docs/templates' }));
              return;
            }
            const oldPath = path.join(docsDir, docName);
            if (!oldPath.startsWith(docsDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(oldPath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Document not found' }));
              return;
            }

            let finalPath = oldPath;
            if (hasRename) {
              const { ext, safeBaseName } = normalizeRenameBaseNameForPath(oldPath, newBaseName);
              if (!safeBaseName) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid newBaseName format' }));
                return;
              }

              const oldDir = path.dirname(oldPath);
              const newFileName = `${safeBaseName}${ext}`;
              const newPath = path.join(oldDir, newFileName);

              if (!newPath.startsWith(docsDir)) {
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
                if (isProtectedDocName(docName)) {
                  res.statusCode = 409;
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.end(JSON.stringify(getProtectedDocPayload('rename')));
                  return;
                }

                const references = scanDocReferences(docName);
                if (references.length > 0) {
                  res.statusCode = 409;
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.end(JSON.stringify(getReferencedDocPayload('rename', references)));
                  return;
                }

                fs.renameSync(oldPath, newPath);
              }
              finalPath = newPath;
            }

            if (hasContentUpdate) {
              fs.writeFileSync(finalPath, String(bodyData.content), 'utf8');
            }

            const relativeName = path.relative(docsDir, finalPath).split(path.sep).join('/');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, name: relativeName }));
          } catch (error: any) {
            console.error('Error updating doc:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        if (req.method !== 'GET') {
          return next();
        }

        if (pathname.startsWith('/api/docs/') && pathname !== '/api/docs' && pathname !== '/api/docs/') {
          try {
            const encodedDocName = pathname.replace('/api/docs/', '');
            if (!encodedDocName) {
              return next();
            }

            const docName = decodeURIComponent(encodedDocName);
            if (isTemplateDocName(docName)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Templates must be managed via /api/docs/templates' }));
              return;
            }
            const docPath = path.join(docsDir, docName);

            if (!docPath.startsWith(docsDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            if (fs.existsSync(docPath)) {
              const content = fs.readFileSync(docPath, 'utf8');
              const ext = path.extname(docPath);
              const contentTypeMap: Record<string, string> = {
                '.md': 'text/markdown; charset=utf-8',
                '.csv': 'text/csv; charset=utf-8',
                '.json': 'application/json; charset=utf-8',
                '.yaml': 'text/yaml; charset=utf-8',
                '.yml': 'text/yaml; charset=utf-8',
                '.txt': 'text/plain; charset=utf-8',
              };
              res.setHeader('Content-Type', contentTypeMap[ext] || 'text/plain; charset=utf-8');
              res.end(content);
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Document not found' }));
            }
          } catch (error: any) {
            console.error('Error loading doc:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        if (pathname === '/api/docs' || pathname === '/api/docs/') {
          try {
            const docs: any[] = [];
            const supportedExtensions = ['.md', '.csv', '.json', '.yaml', '.yml', '.txt'];

            if (fs.existsSync(docsDir)) {
              const walkDocsDir = (dirPath: string) => {
                const items = fs.readdirSync(dirPath, { withFileTypes: true });
                items.forEach((item) => {
                  const fullPath = path.join(dirPath, item.name);
                  if (item.isDirectory()) {
                    walkDocsDir(fullPath);
                    return;
                  }
                  if (!item.isFile()) {
                    return;
                  }
                  const ext = path.extname(item.name).toLowerCase();
                  if (!supportedExtensions.includes(ext)) {
                    return;
                  }
                  const relativePath = path.relative(docsDir, fullPath).split(path.sep).join('/');
                  if (isTemplateDocName(relativePath)) {
                    return;
                  }
                  docs.push({
                    name: relativePath,
                    displayName: relativePath,
                  });
                });
              };
              walkDocsDir(docsDir);
            }

            docs.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(docs));
          } catch (error: any) {
            console.error('Error loading docs:', error);
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
