import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';

import { getRequestPathname } from './utils/httpUtils';
import {
  resolveUniqueMarkdownPath,
  sanitizeImportFileBaseName,
} from './utils/docUtils';
import {
  convertFileToMarkdownWithMarkitdown,
  DOC_IMPORT_MAX_FILE_COUNT,
  DOC_IMPORT_MAX_FILE_SIZE,
  DOC_IMPORT_MAX_TOTAL_SIZE,
  DOC_IMPORT_SUPPORTED_EXTENSIONS,
  resolveMarkitdownCommand,
} from './utils/markitdown';

export function docsImportApiPlugin(): Plugin {
  return {
    name: 'docs-import-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        const projectRoot = process.cwd();
        const docsDir = path.resolve(projectRoot, 'src/docs');

        if (pathname === '/api/docs/import/markitdown-status') {
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          const resolved = resolveMarkitdownCommand();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            installed: resolved.installed,
            commandSource: resolved.commandSource,
            version: resolved.version,
            installHints: resolved.installHints,
            error: resolved.error,
          }));
          return;
        }

        if (pathname !== '/api/docs/import' && pathname !== '/api/docs/import/') {
          return next();
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const uploadDir = path.resolve(projectRoot, 'temp', 'docs-import');
        fs.mkdirSync(uploadDir, { recursive: true });
        fs.mkdirSync(docsDir, { recursive: true });

        const form = formidable({
          uploadDir,
          keepExtensions: true,
          multiples: true,
          maxFileSize: DOC_IMPORT_MAX_FILE_SIZE,
        });

        form.parse(req, async (error: any, _fields: any, files: any) => {
          if (error) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Failed to parse upload payload' }));
            return;
          }

          const normalizeFiles = (value: any): any[] => {
            if (!value) return [];
            return Array.isArray(value) ? value : [value];
          };

          const uploadedFiles = normalizeFiles(files?.files).length > 0
            ? normalizeFiles(files?.files)
            : normalizeFiles(files?.file);

          if (uploadedFiles.length === 0) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Missing files' }));
            return;
          }

          if (uploadedFiles.length > DOC_IMPORT_MAX_FILE_COUNT) {
            res.statusCode = 413;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              error: `Too many files. Maximum ${DOC_IMPORT_MAX_FILE_COUNT} files per import.`,
            }));
            return;
          }

          const totalSize = uploadedFiles.reduce(
            (sum, file) => sum + Number(file?.size || 0),
            0,
          );
          if (totalSize > DOC_IMPORT_MAX_TOTAL_SIZE) {
            res.statusCode = 413;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              error: `Total payload too large. Maximum ${Math.floor(DOC_IMPORT_MAX_TOTAL_SIZE / 1024 / 1024)}MB.`,
            }));
            return;
          }

          const markitdown = resolveMarkitdownCommand();
          const results: Array<{
            originalName: string;
            extension: string;
            success: boolean;
            mode: 'direct-md' | 'markitdown';
            savedName?: string;
            savedPath?: string;
            error?: string;
          }> = [];

          for (const file of uploadedFiles) {
            const tempPath = String(file?.filepath || file?.path || '').trim();
            const originalName = String(
              file?.originalFilename || file?.name || file?.newFilename || 'unnamed-file',
            ).trim();
            const extension = path.extname(originalName || tempPath).toLowerCase();
            const safeOriginalName = originalName || path.basename(tempPath) || 'unnamed-file';

            const cleanupTempFile = () => {
              if (!tempPath) return;
              try {
                if (fs.existsSync(tempPath)) {
                  fs.unlinkSync(tempPath);
                }
              } catch {
                // Ignore cleanup errors.
              }
            };

            if (!tempPath || !fs.existsSync(tempPath)) {
              results.push({
                originalName: safeOriginalName,
                extension,
                success: false,
                mode: extension === '.md' ? 'direct-md' : 'markitdown',
                error: 'Uploaded file is missing from temporary storage',
              });
              cleanupTempFile();
              continue;
            }

            if (!DOC_IMPORT_SUPPORTED_EXTENSIONS.has(extension)) {
              results.push({
                originalName: safeOriginalName,
                extension,
                success: false,
                mode: extension === '.md' ? 'direct-md' : 'markitdown',
                error: `Unsupported file extension: ${extension || 'unknown'}`,
              });
              cleanupTempFile();
              continue;
            }

            const baseName = sanitizeImportFileBaseName(safeOriginalName)
              || `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
            const target = resolveUniqueMarkdownPath(docsDir, baseName);
            if (!target.absolutePath.startsWith(docsDir)) {
              results.push({
                originalName: safeOriginalName,
                extension,
                success: false,
                mode: extension === '.md' ? 'direct-md' : 'markitdown',
                error: 'Forbidden target path',
              });
              cleanupTempFile();
              continue;
            }

            if (extension === '.md') {
              try {
                fs.copyFileSync(tempPath, target.absolutePath);
                results.push({
                  originalName: safeOriginalName,
                  extension,
                  success: true,
                  mode: 'direct-md',
                  savedName: target.fileName,
                  savedPath: `src/docs/${target.fileName}`,
                });
              } catch (copyError: any) {
                results.push({
                  originalName: safeOriginalName,
                  extension,
                  success: false,
                  mode: 'direct-md',
                  error: copyError?.message || 'Failed to save markdown file',
                });
              } finally {
                cleanupTempFile();
              }
              continue;
            }

            if (!markitdown.installed || !markitdown.command || !markitdown.args) {
              results.push({
                originalName: safeOriginalName,
                extension,
                success: false,
                mode: 'markitdown',
                error: markitdown.error || 'markitdown is not installed. Only .md files can be imported now.',
              });
              cleanupTempFile();
              continue;
            }

            const conversion = convertFileToMarkdownWithMarkitdown({
              command: markitdown.command,
              args: markitdown.args,
              sourcePath: tempPath,
            });

            if (!conversion.success) {
              results.push({
                originalName: safeOriginalName,
                extension,
                success: false,
                mode: 'markitdown',
                error: conversion.error,
              });
              cleanupTempFile();
              continue;
            }

            try {
              fs.writeFileSync(target.absolutePath, conversion.content, 'utf8');
              results.push({
                originalName: safeOriginalName,
                extension,
                success: true,
                mode: 'markitdown',
                savedName: target.fileName,
                savedPath: `src/docs/${target.fileName}`,
              });
            } catch (writeError: any) {
              results.push({
                originalName: safeOriginalName,
                extension,
                success: false,
                mode: 'markitdown',
                error: writeError?.message || 'Failed to write converted markdown',
              });
            } finally {
              cleanupTempFile();
            }
          }

          const successCount = results.filter((item) => item.success).length;
          const failedCount = results.length - successCount;
          const hasSuccess = successCount > 0;

          res.statusCode = hasSuccess ? 200 : 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            success: failedCount === 0,
            successCount,
            failedCount,
            commandSource: markitdown.commandSource,
            markitdownInstalled: markitdown.installed,
            markitdownError: markitdown.error,
            results,
          }));
        });
      });
    },
  };
}
