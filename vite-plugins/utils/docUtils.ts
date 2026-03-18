import fs from 'fs';
import path from 'path';

const PROTECTED_TEMPLATE_BASENAMES = new Set([
  'spec-template',
]);
const PROTECTED_DOC_BASENAMES = new Set([
  'project-overview',
]);
const DOC_REFERENCE_SCAN_DIRECTORIES = [
  'src/docs',
  'rules',
  'skills',
];
const DOC_REFERENCE_ALLOWED_EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.json',
  '.yaml',
  '.yml',
  '.csv',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.css',
  '.html',
]);
const TEMPLATE_REFERENCE_SCAN_DIRECTORIES = [
  'src/docs',
  'rules',
  'skills',
];
const DOCS_ROOT_RELATIVE_PATH = 'src/docs';
const TEMPLATES_ROOT_RELATIVE_PATH = 'src/docs/templates';
const LEGACY_TEMPLATES_ROOT_RELATIVE_PATH = 'assets/templates';

export const SPEC_DOC_IMAGE_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const SPEC_DOC_IMAGE_ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
]);
export const SPEC_DOC_IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

export function sanitizeDocBaseName(input: string) {
  return input
    .trim()
    .replace(/\.md$/i, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizePathSegments(input: string) {
  return String(input || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

function getDocBaseName(docName: string) {
  const normalized = normalizePathSegments(docName);
  const ext = path.extname(normalized);
  return path.basename(normalized, ext);
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeRelativeProjectPath(projectRoot: string, filePath: string) {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

export function getDocsDir(projectRoot: string = process.cwd()) {
  return path.resolve(projectRoot, DOCS_ROOT_RELATIVE_PATH);
}

export function getTemplatesDir(projectRoot: string = process.cwd()) {
  return path.resolve(projectRoot, TEMPLATES_ROOT_RELATIVE_PATH);
}

export function getLegacyTemplatesDir(projectRoot: string = process.cwd()) {
  return path.resolve(projectRoot, LEGACY_TEMPLATES_ROOT_RELATIVE_PATH);
}

export function toTemplateProjectPath(templateName: string) {
  const normalizedName = normalizePathSegments(templateName);
  return normalizedName ? `${TEMPLATES_ROOT_RELATIVE_PATH}/${normalizedName}` : TEMPLATES_ROOT_RELATIVE_PATH;
}

export function isTemplateDocName(docName: string) {
  const normalizedName = normalizePathSegments(docName);
  return normalizedName === 'templates' || normalizedName.startsWith('templates/');
}

export function buildDocApiPath(docName: string) {
  const normalizedName = normalizePathSegments(docName);
  if (!normalizedName) {
    return '/api/docs';
  }

  if (isTemplateDocName(normalizedName)) {
    const templateName = normalizedName === 'templates'
      ? ''
      : normalizedName.slice('templates/'.length);
    return templateName
      ? `/api/docs/templates/${encodeURIComponent(templateName)}`
      : '/api/docs/templates';
  }

  return `/api/docs/${encodeURIComponent(normalizedName)}`;
}

function buildDocReferencePatterns(docName: string): RegExp[] {
  const normalizedDocName = normalizePathSegments(docName);
  if (!normalizedDocName) {
    return [];
  }

  const ext = path.extname(normalizedDocName).toLowerCase();
  const normalizedBaseName = ext ? normalizedDocName.slice(0, -ext.length) : normalizedDocName;
  const candidates = [
    `src/docs/${normalizedDocName}`,
    `/docs/${normalizedDocName}`,
  ];

  if (ext === '.md') {
    candidates.push(`src/docs/${normalizedBaseName}`, `/docs/${normalizedBaseName}`);
  }

  return Array.from(new Set(candidates))
    .filter(Boolean)
    .map((candidate) => new RegExp(`${escapeRegExp(candidate)}(?=$|[^A-Za-z0-9_-])`));
}

function buildTemplateReferencePatterns(templateName: string): RegExp[] {
  const normalizedTemplateName = normalizePathSegments(templateName);
  if (!normalizedTemplateName) {
    return [];
  }

  const ext = path.extname(normalizedTemplateName).toLowerCase();
  const normalizedBaseName = ext ? normalizedTemplateName.slice(0, -ext.length) : normalizedTemplateName;
  const candidates = [
    toTemplateProjectPath(normalizedTemplateName),
    `/docs/templates/${normalizedTemplateName}`,
  ];

  if (ext === '.md') {
    candidates.push(
      toTemplateProjectPath(normalizedBaseName),
      `/docs/templates/${normalizedBaseName}`,
    );
  }

  return Array.from(new Set(candidates))
    .filter(Boolean)
    .map((candidate) => new RegExp(`${escapeRegExp(candidate)}(?=$|[^A-Za-z0-9_-])`));
}

export function isProtectedTemplateName(templateName: string) {
  const normalizedName = String(templateName || '').trim();
  if (!normalizedName) return false;
  const baseName = path.basename(normalizedName, path.extname(normalizedName));
  return PROTECTED_TEMPLATE_BASENAMES.has(baseName);
}

export function isProtectedDocName(docName: string) {
  return PROTECTED_DOC_BASENAMES.has(getDocBaseName(docName));
}

export function safeDecodeURIComponent(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

export function isPathInside(baseDir: string, targetPath: string): boolean {
  const relative = path.relative(baseDir, targetPath);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

type TemplateMigrationConflict = {
  relativePath: string;
  legacyPath: string;
  targetPath: string;
};

type TemplateMigrationResult = {
  moved: string[];
  deduped: string[];
  conflicts: TemplateMigrationConflict[];
  removedLegacyDir: boolean;
};

function areFilesIdentical(leftPath: string, rightPath: string) {
  const leftStat = fs.statSync(leftPath);
  const rightStat = fs.statSync(rightPath);
  if (leftStat.size !== rightStat.size) {
    return false;
  }
  return fs.readFileSync(leftPath).equals(fs.readFileSync(rightPath));
}

function removeEmptyDirectories(directoryPath: string, stopAt: string) {
  let currentPath = directoryPath;
  const normalizedStopAt = path.resolve(stopAt);
  while (isPathInside(normalizedStopAt, currentPath) || currentPath === normalizedStopAt) {
    if (!fs.existsSync(currentPath)) {
      break;
    }
    const entries = fs.readdirSync(currentPath);
    if (entries.length > 0) {
      break;
    }
    fs.rmdirSync(currentPath);
    if (currentPath === normalizedStopAt) {
      break;
    }
    currentPath = path.dirname(currentPath);
  }
}

export function ensureTemplatesDirMigrated(projectRoot: string = process.cwd()): TemplateMigrationResult {
  const templatesDir = getTemplatesDir(projectRoot);
  const legacyTemplatesDir = getLegacyTemplatesDir(projectRoot);
  const result: TemplateMigrationResult = {
    moved: [],
    deduped: [],
    conflicts: [],
    removedLegacyDir: false,
  };

  if (!fs.existsSync(legacyTemplatesDir)) {
    return result;
  }

  fs.mkdirSync(templatesDir, { recursive: true });

  const walkLegacyDir = (directoryPath: string) => {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry) {
        continue;
      }

      if (entry.name.startsWith('.')) {
        const hiddenPath = path.join(directoryPath, entry.name);
        if (entry.isFile()) {
          fs.unlinkSync(hiddenPath);
        }
        continue;
      }

      const legacyPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        walkLegacyDir(legacyPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const relativePath = path.relative(legacyTemplatesDir, legacyPath).split(path.sep).join('/');
      if (!relativePath) {
        continue;
      }

      const targetPath = path.join(templatesDir, relativePath);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });

      if (!fs.existsSync(targetPath)) {
        fs.renameSync(legacyPath, targetPath);
        result.moved.push(relativePath);
        continue;
      }

      if (areFilesIdentical(legacyPath, targetPath)) {
        fs.unlinkSync(legacyPath);
        result.deduped.push(relativePath);
        continue;
      }

      result.conflicts.push({
        relativePath,
        legacyPath,
        targetPath,
      });
    }
  };

  walkLegacyDir(legacyTemplatesDir);
  removeEmptyDirectories(legacyTemplatesDir, legacyTemplatesDir);
  result.removedLegacyDir = !fs.existsSync(legacyTemplatesDir);
  return result;
}

export function resolveDocumentPathFromDocUrl(
  docUrl: string,
  host?: string,
  projectRoot: string = process.cwd(),
): { docPath: string } | { status: number; error: string } {
  let pathname = '';
  try {
    pathname = new URL(docUrl, `http://${host || 'localhost'}`).pathname;
  } catch {
    return { status: 400, error: 'Invalid docUrl' };
  }

  const srcRoot = path.resolve(projectRoot, 'src');
  const docsRoot = getDocsDir(projectRoot);

  if (pathname.startsWith('/api/docs/')) {
    const encodedDocName = pathname.slice('/api/docs/'.length);
    if (!encodedDocName) {
      return { status: 400, error: 'Missing document name in docUrl' };
    }

    const decodedDocName = safeDecodeURIComponent(encodedDocName);
    const docPath = path.resolve(docsRoot, decodedDocName);
    if (!isPathInside(docsRoot, docPath)) {
      return { status: 403, error: 'Forbidden path' };
    }
    return { docPath };
  }

  if (pathname.startsWith('/docs/')) {
    const rawDocPath = pathname.slice('/docs/'.length);
    if (!rawDocPath) {
      return { status: 400, error: 'Missing document name in docUrl' };
    }

    const decodedDocPath = safeDecodeURIComponent(rawDocPath);
    const normalizedDocPath = decodedDocPath.toLowerCase().endsWith('.md')
      ? decodedDocPath
      : `${decodedDocPath}.md`;
    const docPath = path.resolve(docsRoot, normalizedDocPath);
    if (!isPathInside(docsRoot, docPath)) {
      return { status: 403, error: 'Forbidden path' };
    }
    return { docPath };
  }

  const specMatch = pathname.match(/^\/(components|prototypes|themes)\/([^/]+)\/(spec|prd)\.md$/i);
  if (specMatch) {
    const entryType = specMatch[1].toLowerCase();
    const entryName = safeDecodeURIComponent(specMatch[2]);
    const docName = `${specMatch[3].toLowerCase()}.md`;
    const entryRoot = path.resolve(srcRoot, entryType);
    const docPath = path.resolve(entryRoot, entryName, docName);

    if (!isPathInside(entryRoot, docPath)) {
      return { status: 403, error: 'Forbidden path' };
    }
    return { docPath };
  }

  return { status: 400, error: 'Unsupported docUrl path' };
}

export function sanitizeImageUploadFileName(originalName: string, mimeType?: string): string {
  const normalizedMimeType = String(mimeType || '').toLowerCase();
  const extensionByMime = SPEC_DOC_IMAGE_MIME_TO_EXTENSION[normalizedMimeType] || '';
  const rawExt = path.extname(originalName || '').toLowerCase();
  const extension = SPEC_DOC_IMAGE_ALLOWED_EXTENSIONS.has(rawExt)
    ? rawExt
    : (SPEC_DOC_IMAGE_ALLOWED_EXTENSIONS.has(extensionByMime) ? extensionByMime : '.png');

  const rawBaseName = path.basename(originalName || '', path.extname(originalName || '')).trim();
  const safeBaseName = (rawBaseName || `image-${Date.now().toString(36)}`)
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `image-${Date.now().toString(36)}`;

  return `${safeBaseName}${extension}`;
}

export function resolveUniqueFilePath(directoryPath: string, fileName: string): string {
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);

  let index = 1;
  let candidateName = fileName;
  let candidatePath = path.join(directoryPath, candidateName);

  while (fs.existsSync(candidatePath)) {
    index += 1;
    candidateName = `${baseName}-${index}${ext}`;
    candidatePath = path.join(directoryPath, candidateName);
  }

  return candidatePath;
}

export function scanDocReferences(docName: string, projectRoot: string = process.cwd()) {
  const normalizedDocName = normalizePathSegments(docName);
  if (!normalizedDocName) {
    return [];
  }

  const docsRoot = getDocsDir(projectRoot);
  const currentDocPath = path.resolve(docsRoot, normalizedDocName);
  const referencePatterns = buildDocReferencePatterns(normalizedDocName);
  if (referencePatterns.length === 0) {
    return [];
  }

  const references = new Set<string>();

  const walkDir = (directoryPath: string) => {
    if (!fs.existsSync(directoryPath)) {
      return;
    }

    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        walkDir(entryPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (path.resolve(entryPath) === currentDocPath) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!DOC_REFERENCE_ALLOWED_EXTENSIONS.has(ext)) {
        continue;
      }

      const content = fs.readFileSync(entryPath, 'utf8');
      if (referencePatterns.some((pattern) => pattern.test(content))) {
        references.add(normalizeRelativeProjectPath(projectRoot, entryPath));
      }
    }
  };

  DOC_REFERENCE_SCAN_DIRECTORIES
    .map((relativePath) => path.resolve(projectRoot, relativePath))
    .forEach(walkDir);

  return Array.from(references).sort();
}

export function scanTemplateReferences(templateName: string, projectRoot: string = process.cwd()) {
  const normalizedTemplateName = normalizePathSegments(templateName);
  if (!normalizedTemplateName) {
    return [];
  }

  const templatesRoot = getTemplatesDir(projectRoot);
  const currentTemplatePath = path.resolve(templatesRoot, normalizedTemplateName);
  const referencePatterns = buildTemplateReferencePatterns(normalizedTemplateName);
  if (referencePatterns.length === 0) {
    return [];
  }

  const references = new Set<string>();

  const walkDir = (directoryPath: string) => {
    if (!fs.existsSync(directoryPath)) {
      return;
    }

    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        walkDir(entryPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (path.resolve(entryPath) === currentTemplatePath) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!DOC_REFERENCE_ALLOWED_EXTENSIONS.has(ext)) {
        continue;
      }

      const content = fs.readFileSync(entryPath, 'utf8');
      if (referencePatterns.some((pattern) => pattern.test(content))) {
        references.add(normalizeRelativeProjectPath(projectRoot, entryPath));
      }
    }
  };

  TEMPLATE_REFERENCE_SCAN_DIRECTORIES
    .map((relativePath) => path.resolve(projectRoot, relativePath))
    .forEach(walkDir);

  return Array.from(references).sort();
}

export function createManualDocTemplate(displayName: string) {
  return `# ${displayName}

## 概述
请在此补充文档目标、范围与背景信息。

## 详细内容
请在此继续编写正文。
`;
}

export function extractMarkdownDisplayName(content: string, fallbackName: string) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch?.[1]?.trim() || fallbackName;
}

export function extractMarkdownDescription(content: string) {
  const lines = content.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line && !line.startsWith('#')) {
      return line;
    }
  }
  return '';
}

export function listTemplateAssets(templatesDir: string) {
  const templates: Array<{ name: string; displayName: string; description: string }> = [];

  if (!fs.existsSync(templatesDir)) {
    return templates;
  }

  const walkTemplatesDir = (dirPath: string) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    entries.forEach((entry) => {
      if (!entry || entry.name.startsWith('.')) {
        return;
      }

      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walkTemplatesDir(fullPath);
        return;
      }

      if (!entry.isFile()) {
        return;
      }

      const relativePath = path.relative(templatesDir, fullPath).split(path.sep).join('/');
      const content = fs.readFileSync(fullPath, 'utf8');
      templates.push({
        name: relativePath,
        displayName: relativePath.replace(/\.[^./\\]+$/u, ''),
        description: extractMarkdownDescription(content),
      });
    });
  };

  walkTemplatesDir(templatesDir);
  templates.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  return templates;
}

export function sanitizeImportFileBaseName(fileName: string): string {
  return String(fileName || '')
    .trim()
    .replace(/\.[^/.]+$/, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function resolveUniqueMarkdownPath(docsDir: string, baseName: string) {
  const safeBaseName = sanitizeImportFileBaseName(baseName) || `doc-${Date.now().toString(36)}`;
  let fileName = `${safeBaseName}.md`;
  let nextPath = path.join(docsDir, fileName);
  let suffix = 1;
  while (fs.existsSync(nextPath)) {
    fileName = `${safeBaseName}-${suffix}.md`;
    nextPath = path.join(docsDir, fileName);
    suffix += 1;
  }
  return { fileName, absolutePath: nextPath };
}
