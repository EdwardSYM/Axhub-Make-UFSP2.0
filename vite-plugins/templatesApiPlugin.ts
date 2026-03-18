import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

import {
  createManualDocTemplate,
  ensureTemplatesDirMigrated,
  getTemplatesDir,
  isProtectedTemplateName,
  listTemplateAssets,
  sanitizeDocBaseName,
  scanTemplateReferences,
  toTemplateProjectPath,
} from './utils/docUtils';
import { getRequestPathname, readJsonBody } from './utils/httpUtils';

type TemplateAction = 'rename' | 'delete';

function getProtectedTemplatePayload(action: TemplateAction) {
  return {
    error: action === 'rename' ? '系统模板不支持重命名' : '系统模板不支持删除',
    code: 'PROTECTED_TEMPLATE',
    protected: true,
    references: [],
    hasReferences: false,
  };
}

function getReferencedTemplatePayload(action: TemplateAction, references: string[]) {
  return {
    error: action === 'rename'
      ? '模板存在项目内引用，请先处理引用后再改名'
      : '模板存在项目内引用，请先处理引用后再删除',
    code: 'TEMPLATE_REFERENCED',
    protected: false,
    references,
    hasReferences: references.length > 0,
  };
}

function normalizeRenameBaseNameForPath(templatePath: string, nextBaseName: string) {
  const ext = path.extname(templatePath);
  let normalizedBaseName = String(nextBaseName || '').trim();
  if (ext && normalizedBaseName.toLowerCase().endsWith(ext.toLowerCase())) {
    normalizedBaseName = normalizedBaseName.slice(0, -ext.length).trim();
  }
  return {
    ext,
    safeBaseName: sanitizeDocBaseName(normalizedBaseName),
  };
}

export function templatesApiPlugin(): Plugin {
  return {
    name: 'templates-api-plugin',
    configureServer(server: any) {
      const templatesDir = getTemplatesDir(process.cwd());
      const migrationResult = ensureTemplatesDirMigrated(process.cwd());
      if (migrationResult.conflicts.length > 0) {
        console.error(
          '[templates-api-plugin] Template migration conflicts detected:\n' +
          migrationResult.conflicts
            .map((conflict) => `- ${conflict.relativePath}\n  legacy: ${conflict.legacyPath}\n  target: ${conflict.targetPath}`)
            .join('\n'),
        );
      }

      server.middlewares.use(async (req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (!pathname.startsWith('/api/docs/templates')) {
          return next();
        }

        if (req.method === 'POST' && (pathname === '/api/docs/templates/check-references' || pathname === '/api/docs/templates/check-references/')) {
          try {
            const body = await readJsonBody(req);
            const templateName = String(body?.templateName || '').trim();
            const action = body?.action === 'rename' ? 'rename' : body?.action === 'delete' ? 'delete' : '';
            const nextBaseName = String(body?.nextBaseName || '').trim();

            if (!templateName) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing templateName parameter' }));
              return;
            }

            if (action !== 'rename' && action !== 'delete') {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Invalid action parameter' }));
              return;
            }

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

              const { ext, safeBaseName } = normalizeRenameBaseNameForPath(templatePath, nextBaseName);
              if (!safeBaseName) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Invalid nextBaseName format' }));
                return;
              }

              const nextPath = path.join(path.dirname(templatePath), `${safeBaseName}${ext}`);
              hasActualRename = nextPath !== templatePath;
            }

            if (hasActualRename && isProtectedTemplateName(templateName)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({
                templateName,
                ...getProtectedTemplatePayload(action),
              }));
              return;
            }

            const references = hasActualRename ? scanTemplateReferences(templateName) : [];
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              templateName,
              references,
              hasReferences: references.length > 0,
              protected: false,
              ...(references.length > 0 ? { code: 'TEMPLATE_REFERENCED' } : {}),
            }));
          } catch (error: any) {
            console.error('Error checking template references:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Check template references failed' }));
          }
          return;
        }

        if (req.method === 'POST' && (pathname === '/api/docs/templates' || pathname === '/api/docs/templates/')) {
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

            fs.mkdirSync(templatesDir, { recursive: true });
            const fallbackBase = `template-${Date.now().toString(36)}`;
            const sanitizedBase = sanitizeDocBaseName(fileNameInput || displayName) || fallbackBase;
            let baseName = sanitizedBase;
            let suffix = 2;
            while (fs.existsSync(path.join(templatesDir, `${baseName}.md`))) {
              baseName = `${sanitizedBase}-${suffix}`;
              suffix += 1;
            }

            const templateFileName = `${baseName}.md`;
            const templatePath = path.join(templatesDir, templateFileName);
            if (!templatePath.startsWith(templatesDir)) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            fs.writeFileSync(templatePath, createManualDocTemplate(displayName), 'utf8');

            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              success: true,
              name: templateFileName,
              displayName: templateFileName.replace(/\.[^./\\]+$/u, ''),
              path: toTemplateProjectPath(templateFileName),
            }));
          } catch (error: any) {
            console.error('Error creating template:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Create template failed' }));
          }
          return;
        }

        if (req.method === 'POST' && pathname.startsWith('/api/docs/templates/') && pathname.endsWith('/copy')) {
          try {
            const encodedTemplateName = pathname.slice('/api/docs/templates/'.length, -'/copy'.length);
            const templateName = decodeURIComponent(encodedTemplateName);
            if (!templateName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing template name' }));
              return;
            }

            const sourcePath = path.join(templatesDir, templateName);
            if (!sourcePath.startsWith(templatesDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(sourcePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Template not found' }));
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

            if (!nextPath.startsWith(templatesDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            fs.copyFileSync(sourcePath, nextPath);

            const relativeName = path.relative(templatesDir, nextPath).split(path.sep).join('/');
            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              success: true,
              name: relativeName,
              displayName: relativeName.replace(/\.[^./\\]+$/u, ''),
              path: toTemplateProjectPath(relativeName),
            }));
          } catch (error: any) {
            console.error('Error copying template:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Copy template failed' }));
          }
          return;
        }

        if (req.method === 'DELETE' && pathname.startsWith('/api/docs/templates/') && pathname !== '/api/docs/templates/' && pathname !== '/api/docs/templates') {
          try {
            const encodedTemplateName = pathname.replace('/api/docs/templates/', '');
            const templateName = decodeURIComponent(encodedTemplateName);
            const templatePath = path.join(templatesDir, templateName);

            if (!templatePath.startsWith(templatesDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(templatePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Template not found' }));
              return;
            }

            if (isProtectedTemplateName(templateName)) {
              res.statusCode = 409;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(getProtectedTemplatePayload('delete')));
              return;
            }

            const references = scanTemplateReferences(templateName);
            if (references.length > 0) {
              res.statusCode = 409;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(getReferencedTemplatePayload('delete', references)));
              return;
            }

            fs.unlinkSync(templatePath);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: true }));
          } catch (error: any) {
            console.error('Error deleting template:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error?.message || 'Delete template failed' }));
          }
          return;
        }

        if (req.method === 'PUT' && pathname.startsWith('/api/docs/templates/') && pathname !== '/api/docs/templates/' && pathname !== '/api/docs/templates') {
          try {
            const encodedTemplateName = pathname.replace('/api/docs/templates/', '');
            if (!encodedTemplateName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing template name' }));
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

            const templateName = decodeURIComponent(encodedTemplateName);
            const oldPath = path.join(templatesDir, templateName);
            if (!oldPath.startsWith(templatesDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(oldPath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Template not found' }));
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
              if (!newPath.startsWith(templatesDir)) {
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
                if (isProtectedTemplateName(templateName)) {
                  res.statusCode = 409;
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.end(JSON.stringify(getProtectedTemplatePayload('rename')));
                  return;
                }

                const references = scanTemplateReferences(templateName);
                if (references.length > 0) {
                  res.statusCode = 409;
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.end(JSON.stringify(getReferencedTemplatePayload('rename', references)));
                  return;
                }

                fs.renameSync(oldPath, newPath);
              }
              finalPath = newPath;
            }

            if (hasContentUpdate) {
              fs.writeFileSync(finalPath, String(bodyData.content), 'utf8');
            }

            const relativeName = path.relative(templatesDir, finalPath).split(path.sep).join('/');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: true, name: relativeName }));
          } catch (error: any) {
            console.error('Error updating template:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error?.message || 'Update template failed' }));
          }
          return;
        }

        if (req.method !== 'GET') {
          return next();
        }

        if (pathname.startsWith('/api/docs/templates/') && pathname !== '/api/docs/templates/' && pathname !== '/api/docs/templates') {
          try {
            const encodedTemplateName = pathname.replace('/api/docs/templates/', '');
            const templateName = decodeURIComponent(encodedTemplateName);
            const templatePath = path.join(templatesDir, templateName);
            if (!templatePath.startsWith(templatesDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(templatePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Template not found' }));
              return;
            }
            const content = fs.readFileSync(templatePath, 'utf8');
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            res.end(content);
          } catch (error: any) {
            console.error('Error loading template:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error?.message || 'Load template failed' }));
          }
          return;
        }

        if (pathname !== '/api/docs/templates' && pathname !== '/api/docs/templates/') {
          return next();
        }

        try {
          const templates = listTemplateAssets(templatesDir);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(templates));
        } catch (error: any) {
          console.error('Error loading templates:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    },
  };
}
