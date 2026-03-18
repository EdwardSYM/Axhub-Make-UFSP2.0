import type { Plugin } from 'vite';
import path from 'path';
import fs from 'fs';
import { IncomingMessage } from 'http';
import formidable from 'formidable';
import extractZip from 'extract-zip';
import archiver from 'archiver';
import { allowedItemKeysByTab, scanEntries, type SidebarTreeTab } from './utils/entryScanner';
import { createSidebarTreeStore, type SidebarTreeNode, type ResourceOrderType } from './utils/sidebarTreeStore';
import { buildAttachmentContentDisposition } from './utils/contentDisposition';
import { ensureTemplatesDirMigrated, getTemplatesDir } from './utils/docUtils';
import { runCommand, runCommandSync } from '../scripts/utils/command-runtime.mjs';

/**
 * 递归复制目录（用于 Windows 权限问题的备用方案）
 * 
 * 当 fs.renameSync() 因权限问题失败时（EPERM 错误），使用此函数作为 fallback。
 * 
 * 为什么 copy 比 rename 更可靠？
 * - rename：只修改文件系统元数据（inode），对权限和文件占用非常敏感
 * - copy：实际读取和写入数据，只要文件可读就能复制，绕过了很多权限限制
 * 
 * 常见触发场景：
 * - Windows 杀毒软件扫描导致文件被锁定
 * - 跨驱动器移动文件（rename 不支持）
 * - 文件索引服务占用文件句柄
 * - 路径包含中文字符导致的编码问题
 * 
 * @param src - 源目录路径
 * @param dest - 目标目录路径
 */
function copyDirRecursive(src: string, dest: string) {
  // 确保目标目录存在
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  // 读取源目录的所有内容
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  // 逐个处理文件和子目录
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // 递归处理子目录
      copyDirRecursive(srcPath, destPath);
    } else {
      // 复制文件
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const IGNORED_EXTRACT_ENTRIES = new Set(['__MACOSX', '.DS_Store']);

function truncateName(name: string, maxLength: number) {
  return name.length > maxLength ? name.slice(0, maxLength) : name;
}

function sanitizeFolderName(name: string) {
  return name
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function inferExtractedRootFolder(extractDir: string) {
  if (!fs.existsSync(extractDir)) {
    return { entryCount: 0, hasRootFolder: false, rootFolderName: '' };
  }

  const entries = fs
    .readdirSync(extractDir, { withFileTypes: true })
    .filter(entry => !IGNORED_EXTRACT_ENTRIES.has(entry.name));

  if (entries.length === 1 && entries[0].isDirectory()) {
    return { entryCount: entries.length, hasRootFolder: true, rootFolderName: entries[0].name };
  }

  return { entryCount: entries.length, hasRootFolder: false, rootFolderName: '' };
}

function sanitizeRelativePath(input: string) {
  const normalized = input.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(part => part && part !== '.' && part !== '..');
  return parts.join('/');
}

function deriveRootFolderName(paths: string[]) {
  const roots = new Set<string>();
  for (const rawPath of paths) {
    const cleaned = sanitizeRelativePath(rawPath);
    if (!cleaned) continue;
    const [root] = cleaned.split('/');
    if (root) roots.add(root);
  }
  return roots.size === 1 ? Array.from(roots)[0] : '';
}

function hasIgnoredEntry(relativePath: string) {
  return relativePath.split('/').some(segment => IGNORED_EXTRACT_ENTRIES.has(segment));
}

function moveFileWithFallback(srcPath: string, destPath: string) {
  try {
    fs.renameSync(srcPath, destPath);
  } catch {
    fs.copyFileSync(srcPath, destPath);
    fs.unlinkSync(srcPath);
  }
}

const SUPPORTED_UPLOAD_TARGET_TYPES = ['prototypes', 'components', 'themes'] as const;
const THEME_IMPORT_SUPPORTED_UPLOAD_TYPES = new Set(['local_axure', 'v0', 'google_aistudio']);
const THEME_IMPORT_SUB_SKILL_DOCS = [
  '/skills/axure-prototype-workflow/theme-generation.md',
  '/skills/axure-prototype-workflow/doc-generation.md',
  '/skills/axure-prototype-workflow/data-generation.md',
  '/skills/web-page-workflow/theme-generation.md',
  '/skills/web-page-workflow/doc-generation.md',
  '/skills/web-page-workflow/data-generation.md',
];

function formatReferenceList(referencePaths: string[]) {
  return referencePaths.map((referencePath) => `- \`${referencePath}\``).join('\n');
}

/**
 * 文件系统 API 插件
 * 提供文件和目录的基本操作功能：删除、重命名、复制等
 */
export function fileSystemApiPlugin(): Plugin {
  return {
    name: 'filesystem-api',
    
    configureServer(server) {
      const projectRoot = process.cwd();
      const nodeCommand = process.execPath;
      const entriesPath = path.join(projectRoot, '.axhub', 'make', 'entries.json');
      const configPath = path.join(projectRoot, '.axhub', 'make', 'axhub.config.json');
      const DEFAULT_PROJECT_TITLE = '未命名项目';
      const SIDEBAR_TREE_VERSION = 1;
      const templateMigrationResult = ensureTemplatesDirMigrated(projectRoot);
      if (templateMigrationResult.conflicts.length > 0) {
        console.error(
          '[filesystem-api] Template migration conflicts detected:\n' +
          templateMigrationResult.conflicts
            .map((conflict) => `- ${conflict.relativePath}\n  legacy: ${conflict.legacyPath}\n  target: ${conflict.targetPath}`)
            .join('\n'),
        );
      }
      const sidebarTreeStore = createSidebarTreeStore(projectRoot, {
        version: SIDEBAR_TREE_VERSION,
        legacyEntriesPath: entriesPath,
      });

      const isSidebarTreeTab = (value: string): value is SidebarTreeTab => {
        return value === 'prototypes' || value === 'components' || value === 'docs' || value === 'canvas';
      };

      const getTabFromRequest = (req: any): SidebarTreeTab | null => {
        try {
          const url = new URL(req.url || '/', 'http://localhost');
          const tab = (url.searchParams.get('tab') || '').trim();
          if (!isSidebarTreeTab(tab)) return null;
          return tab;
        } catch {
          return null;
        }
      };

      const toDefaultTreeTitle = (itemKey: string) => {
        const name = itemKey.split('/').pop() || itemKey;
        return name
          .replace(/[-_]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim() || name;
      };

      const sanitizeNodeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

      const buildDefaultSidebarTree = (allowedItemKeys: Set<string>): SidebarTreeNode[] => {
        const keys = Array.from(allowedItemKeys).sort((a, b) => a.localeCompare(b));
        return keys.map((itemKey) => ({
          id: `item-${sanitizeNodeId(itemKey)}`,
          kind: 'item' as const,
          title: toDefaultTreeTitle(itemKey),
          itemKey,
        }));
      };

      const normalizeAndValidateSidebarTree = (
        tree: unknown,
        tab: SidebarTreeTab,
        allowedItemKeys: Set<string>,
      ): { valid: true; tree: SidebarTreeNode[] } | { valid: false; error: string } => {
        if (!Array.isArray(tree)) {
          return { valid: false, error: 'tree must be an array' };
        }

        const usedIds = new Set<string>();
        const normalizeNodes = (nodes: any[], depth: number): SidebarTreeNode[] | null => {
          if (depth > 32) {
            return null;
          }
          const normalized: SidebarTreeNode[] = [];
          for (const rawNode of nodes) {
            if (!rawNode || typeof rawNode !== 'object') {
              return null;
            }
            const id = typeof rawNode.id === 'string' ? rawNode.id.trim() : '';
            const kind = rawNode.kind;
            const title = typeof rawNode.title === 'string' ? rawNode.title.trim() : '';
            if (!id || !title) return null;
            if (usedIds.has(id)) {
              return null;
            }
            if (kind !== 'folder' && kind !== 'item') {
              return null;
            }
            usedIds.add(id);

            if (kind === 'item') {
              const itemKey = typeof rawNode.itemKey === 'string' ? rawNode.itemKey.trim() : '';
              if (!itemKey || !itemKey.startsWith(`${tab}/`) || !allowedItemKeys.has(itemKey)) {
                return null;
              }
              normalized.push({
                id,
                kind: 'item',
                title,
                itemKey,
              });
              continue;
            }

            const rawChildren = Array.isArray(rawNode.children) ? rawNode.children : [];
            const children = normalizeNodes(rawChildren, depth + 1);
            if (!children) {
              return null;
            }
            normalized.push({
              id,
              kind: 'folder',
              title,
              children,
            });
          }
          return normalized;
        };

        const normalizedTree = normalizeNodes(tree as any[], 0);
        if (!normalizedTree) {
          return { valid: false, error: 'Invalid tree payload' };
        }
        return { valid: true, tree: normalizedTree };
      };

      const reconcileSidebarTree = (
        tree: SidebarTreeNode[],
        tab: SidebarTreeTab,
        allowedItemKeys: Set<string>,
      ): SidebarTreeNode[] => {
        const usedIds = new Set<string>();
        const seenItemKeys = new Set<string>();
        const makeUniqueId = (seed: string) => {
          let candidate = seed;
          let count = 1;
          while (usedIds.has(candidate)) {
            count += 1;
            candidate = `${seed}-${count}`;
          }
          usedIds.add(candidate);
          return candidate;
        };

        const normalizeNodes = (nodes: SidebarTreeNode[], depth: number): SidebarTreeNode[] => {
          if (!Array.isArray(nodes) || depth > 32) return [];
          const result: SidebarTreeNode[] = [];
          for (const rawNode of nodes) {
            if (!rawNode || typeof rawNode !== 'object') continue;
            const title = typeof rawNode.title === 'string' ? rawNode.title.trim() : '';
            if (!title) continue;
            const rawId = typeof rawNode.id === 'string' ? rawNode.id.trim() : '';
            const id = makeUniqueId(rawId || `node-${Date.now()}`);
            if (rawNode.kind === 'item') {
              const itemKey = typeof rawNode.itemKey === 'string' ? rawNode.itemKey.trim() : '';
              if (!itemKey || !itemKey.startsWith(`${tab}/`) || !allowedItemKeys.has(itemKey)) {
                continue;
              }
              if (seenItemKeys.has(itemKey)) {
                continue;
              }
              seenItemKeys.add(itemKey);
              result.push({ id, kind: 'item', title, itemKey });
              continue;
            }
            if (rawNode.kind === 'folder') {
              const children = normalizeNodes(Array.isArray(rawNode.children) ? rawNode.children : [], depth + 1);
              result.push({ id, kind: 'folder', title, children });
            }
          }
          return result;
        };

        const normalizedTree = normalizeNodes(tree, 0);
        const missingItemKeys = Array.from(allowedItemKeys).filter((itemKey) => !seenItemKeys.has(itemKey));
        const nextMissingNodes = missingItemKeys.sort((a, b) => a.localeCompare(b)).map((itemKey) => ({
            id: makeUniqueId(`item-${sanitizeNodeId(itemKey)}`),
            kind: 'item',
            title: toDefaultTreeTitle(itemKey),
            itemKey,
          }));
        return [...nextMissingNodes, ...normalizedTree];
      };

      const collectSidebarTreeIds = (nodes: SidebarTreeNode[]): Set<string> => {
        const ids = new Set<string>();
        const walk = (list: SidebarTreeNode[]) => {
          for (const node of list) {
            if (!node || typeof node !== 'object') continue;
            const id = typeof node.id === 'string' ? node.id.trim() : '';
            if (id) {
              ids.add(id);
            }
            if (Array.isArray(node.children) && node.children.length > 0) {
              walk(node.children);
            }
          }
        };
        walk(nodes);
        return ids;
      };

      const createUniqueFolderNodeId = (existingIds: Set<string>) => {
        let candidate = '';
        do {
          const randomSuffix = Math.random().toString(36).slice(2, 8);
          candidate = `folder-${Date.now()}-${randomSuffix}`;
        } while (existingIds.has(candidate));
        return candidate;
      };

      const createRootFolderTitle = (nodes: SidebarTreeNode[]) => {
        const rootFolderTitles = new Set<string>();
        for (const node of nodes) {
          if (node.kind !== 'folder') continue;
          const title = typeof node.title === 'string' ? node.title.trim() : '';
          if (!title) continue;
          rootFolderTitles.add(title);
        }

        const defaultTitle = '新建文件夹';
        if (!rootFolderTitles.has(defaultTitle)) {
          return defaultTitle;
        }
        let suffix = 2;
        while (rootFolderTitles.has(`${defaultTitle}-${suffix}`)) {
          suffix += 1;
        }
        return `${defaultTitle}-${suffix}`;
      };

      const readProjectTitle = (): string => {
        if (!fs.existsSync(configPath)) {
          return DEFAULT_PROJECT_TITLE;
        }
        try {
          const raw = fs.readFileSync(configPath, 'utf8');
          const parsed = JSON.parse(raw);
          const title = typeof parsed?.projectInfo?.name === 'string' ? parsed.projectInfo.name.trim() : '';
          return title || DEFAULT_PROJECT_TITLE;
        } catch {
          return DEFAULT_PROJECT_TITLE;
        }
      };

      const DOC_EXTENSIONS = new Set(['.md', '.csv', '.json', '.yaml', '.yml', '.txt']);
      const CANVAS_EXT = '.excalidraw';

      const collectDocItemKeys = (): Set<string> => {
        const docsDir = path.join(projectRoot, 'src', 'docs');
        const keys: string[] = [];
        if (!fs.existsSync(docsDir)) {
          return new Set();
        }

        const walk = (currentDir: string) => {
          const entries = fs.readdirSync(currentDir, { withFileTypes: true });
          for (const entry of entries) {
            const absolutePath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
              walk(absolutePath);
              continue;
            }
            if (!entry.isFile()) continue;
            const ext = path.extname(entry.name).toLowerCase();
            if (!DOC_EXTENSIONS.has(ext)) continue;
            const rel = normalizePath(path.relative(docsDir, absolutePath));
            keys.push(`docs/${rel}`);
          }
        };

        walk(docsDir);
        keys.sort((a, b) => a.localeCompare(b));
        return new Set(keys);
      };

      const collectCanvasItemKeys = (): Set<string> => {
        const canvasDir = path.join(projectRoot, 'src', 'canvas');
        const keys: string[] = [];
        if (!fs.existsSync(canvasDir)) {
          return new Set();
        }

        const entries = fs.readdirSync(canvasDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile() || !entry.name.endsWith(CANVAS_EXT)) continue;
          keys.push(`canvas/${entry.name}`);
        }

        keys.sort((a, b) => a.localeCompare(b));
        return new Set(keys);
      };

      const resolveAllowedItemKeys = (tab: SidebarTreeTab): Set<string> => {
        if (tab === 'docs') {
          return collectDocItemKeys();
        }
        if (tab === 'canvas') {
          return collectCanvasItemKeys();
        }
        const scanned = scanEntries(projectRoot);
        return allowedItemKeysByTab(scanned.entries.js, tab);
      };

      const isResourceOrderType = (value: string): value is ResourceOrderType => {
        return value === 'themes' || value === 'data' || value === 'templates';
      };

      const getResourceOrderTypeFromRequest = (req: any): ResourceOrderType | null => {
        try {
          const url = new URL(req.url || '/', 'http://localhost');
          const type = (url.searchParams.get('type') || '').trim();
          if (!isResourceOrderType(type)) return null;
          return type;
        } catch {
          return null;
        }
      };

      const collectThemeKeys = (): Set<string> => {
        const themesDir = path.join(projectRoot, 'src', 'themes');
        const keys = new Set<string>();
        if (!fs.existsSync(themesDir)) {
          return keys;
        }
        const entries = fs.readdirSync(themesDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          keys.add(entry.name);
        }
        return keys;
      };

      const collectDataTableKeys = (): Set<string> => {
        const databaseDir = path.join(projectRoot, 'src', 'database');
        const keys = new Set<string>();
        if (!fs.existsSync(databaseDir)) {
          return keys;
        }
        const entries = fs.readdirSync(databaseDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
          const fileName = entry.name.replace(/\.json$/i, '');
          if (fileName) {
            keys.add(fileName);
          }
        }
        return keys;
      };

      const resolveAllowedResourceKeys = (type: ResourceOrderType): Set<string> => {
        if (type === 'themes') {
          return collectThemeKeys();
        }
        if (type === 'data') {
          return collectDataTableKeys();
        }
        const templatesDir = getTemplatesDir(projectRoot);
        const keys = new Set<string>();
        if (!fs.existsSync(templatesDir)) {
          return keys;
        }
        const walkTemplatesDir = (dirPath: string) => {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });
          for (const entry of entries) {
            if (!entry || entry.name.startsWith('.')) continue;
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
              walkTemplatesDir(fullPath);
              continue;
            }
            if (!entry.isFile()) continue;
            const relativePath = path.relative(templatesDir, fullPath).split(path.sep).join('/');
            if (relativePath) {
              keys.add(relativePath);
            }
          }
        };
        walkTemplatesDir(templatesDir);
        return keys;
      };

      const reconcileResourceOrder = (order: string[], allowedKeys: Set<string>): string[] => {
        const seen = new Set<string>();
        const nextOrder: string[] = [];

        for (const key of order) {
          if (!allowedKeys.has(key) || seen.has(key)) continue;
          seen.add(key);
          nextOrder.push(key);
        }

        const remaining = Array.from(allowedKeys).filter((key) => !seen.has(key));
        remaining.sort((a, b) => a.localeCompare(b));
        return [...remaining, ...nextOrder];
      };
      
      // Helper function to parse JSON body
      const parseBody = (req: any): Promise<any> => {
        return new Promise((resolve, reject) => {
          let body = '';
          req.on('data', (chunk: any) => body += chunk);
          req.on('end', () => {
            try {
              resolve(body ? JSON.parse(body) : {});
            } catch (e) {
              reject(new Error('Invalid JSON in request body'));
            }
          });
          req.on('error', reject);
        });
      };

      // Helper function to send JSON response
      const sendJSON = (res: any, statusCode: number, data: any) => {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(data));
      };

      const normalizePath = (filePath: string) => filePath.split(path.sep).join('/');

      server.middlewares.use('/api/prototype-admin/project-title', async (req: any, res: any) => {
        if (req.method === 'GET') {
          return sendJSON(res, 200, { title: readProjectTitle() });
        }
        if (req.method !== 'PATCH') {
          return sendJSON(res, 405, { error: 'Method not allowed' });
        }

        try {
          const body = await parseBody(req);
          const rawTitle = typeof body?.title === 'string' ? body.title : '';
          const title = rawTitle.trim();
          if (!title) {
            return sendJSON(res, 400, { error: 'title cannot be empty' });
          }
          if (/[\u0000-\u001F\u007F]/.test(title)) {
            return sendJSON(res, 400, { error: 'title contains invalid control characters' });
          }

          const config = fs.existsSync(configPath)
            ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
            : {};
          const nextConfig = {
            ...config,
            projectInfo: {
              ...(config?.projectInfo || {}),
              name: title,
            },
          };
          fs.mkdirSync(path.dirname(configPath), { recursive: true });
          fs.writeFileSync(configPath, JSON.stringify(nextConfig, null, 2), 'utf8');
          return sendJSON(res, 200, { success: true, title });
        } catch (e: any) {
          return sendJSON(res, 500, { error: e?.message || 'Update project title failed' });
        }
      });

      server.middlewares.use('/api/prototype-admin/sidebar-tree/folder', async (req: any, res: any) => {
        const tab = getTabFromRequest(req);
        if (!tab) {
          return sendJSON(res, 400, { error: 'Invalid tab, expected prototypes|components|docs|canvas' });
        }

        if (req.method !== 'POST') {
          return sendJSON(res, 405, { error: 'Method not allowed' });
        }

        try {
          const allowedItemKeys = resolveAllowedItemKeys(tab);
          const storedTree = sidebarTreeStore.getTree(tab);
          const sourceTree = storedTree.length > 0 ? storedTree : buildDefaultSidebarTree(allowedItemKeys);
          const tree = reconcileSidebarTree(sourceTree, tab, allowedItemKeys);

          const existingIds = collectSidebarTreeIds(tree);
          const createdFolderId = createUniqueFolderNodeId(existingIds);
          const title = createRootFolderTitle(tree);
          const nextTree: SidebarTreeNode[] = [
            {
              id: createdFolderId,
              kind: 'folder',
              title,
              children: [],
            },
            ...tree,
          ];

          sidebarTreeStore.setTree(tab, nextTree);

          return sendJSON(res, 200, {
            success: true,
            tab,
            version: SIDEBAR_TREE_VERSION,
            createdFolderId,
            tree: nextTree,
          });
        } catch (e: any) {
          return sendJSON(res, 500, { error: e?.message || 'Create sidebar folder failed' });
        }
      });

      server.middlewares.use('/api/prototype-admin/sidebar-tree', async (req: any, res: any) => {
        const tab = getTabFromRequest(req);
        if (!tab) {
          return sendJSON(res, 400, { error: 'Invalid tab, expected prototypes|components|docs|canvas' });
        }

        if (req.method === 'GET') {
          const allowedItemKeys = resolveAllowedItemKeys(tab);
          const storedTree = sidebarTreeStore.getTree(tab);
          const sourceTree = storedTree.length > 0 ? storedTree : buildDefaultSidebarTree(allowedItemKeys);
          const tree = reconcileSidebarTree(sourceTree, tab, allowedItemKeys);
          if (JSON.stringify(tree) !== JSON.stringify(storedTree)) {
            sidebarTreeStore.setTree(tab, tree);
          }
          return sendJSON(res, 200, {
            tab,
            version: SIDEBAR_TREE_VERSION,
            tree,
          });
        }

        if (req.method !== 'PUT') {
          return sendJSON(res, 405, { error: 'Method not allowed' });
        }

        try {
          const body = await parseBody(req);
          const allowedItemKeys = resolveAllowedItemKeys(tab);
          const normalized = normalizeAndValidateSidebarTree(body?.tree, tab, allowedItemKeys);
          if (!normalized.valid) {
            return sendJSON(res, 400, { error: normalized.error });
          }
          sidebarTreeStore.setTree(tab, normalized.tree);
          return sendJSON(res, 200, {
            success: true,
            tab,
            version: SIDEBAR_TREE_VERSION,
            tree: normalized.tree,
          });
        } catch (e: any) {
          return sendJSON(res, 500, { error: e?.message || 'Save sidebar tree failed' });
        }
      });

      server.middlewares.use('/api/prototype-admin/resource-order', async (req: any, res: any) => {
        const type = getResourceOrderTypeFromRequest(req);
        if (!type) {
          return sendJSON(res, 400, { error: 'Invalid type, expected themes|data|templates' });
        }

        if (req.method === 'GET') {
          try {
            const allowedKeys = resolveAllowedResourceKeys(type);
            const storedOrder = sidebarTreeStore.getResourceOrder(type);
            const order = reconcileResourceOrder(storedOrder, allowedKeys);
            if (JSON.stringify(order) !== JSON.stringify(storedOrder)) {
              sidebarTreeStore.setResourceOrder(type, order);
            }
            return sendJSON(res, 200, {
              type,
              version: SIDEBAR_TREE_VERSION,
              order,
            });
          } catch (e: any) {
            return sendJSON(res, 500, { error: e?.message || 'Load resource order failed' });
          }
        }

        if (req.method !== 'PUT') {
          return sendJSON(res, 405, { error: 'Method not allowed' });
        }

        try {
          const body = await parseBody(req);
          if (!Array.isArray(body?.order)) {
            return sendJSON(res, 400, { error: 'order must be an array' });
          }
          const requestedOrder = body.order
            .filter((key: unknown): key is string => typeof key === 'string')
            .map((key) => key.trim())
            .filter(Boolean);
          const allowedKeys = resolveAllowedResourceKeys(type);
          const invalidKey = requestedOrder.find((key) => !allowedKeys.has(key));
          if (invalidKey) {
            return sendJSON(res, 400, { error: `Invalid resource key: ${invalidKey}` });
          }
          const order = reconcileResourceOrder(requestedOrder, allowedKeys);
          sidebarTreeStore.setResourceOrder(type, order);
          return sendJSON(res, 200, {
            success: true,
            type,
            version: SIDEBAR_TREE_VERSION,
            order,
          });
        } catch (e: any) {
          return sendJSON(res, 500, { error: e?.message || 'Save resource order failed' });
        }
      });

      const scanThemeReferences = (themeName: string) => {
        const referenceDirs = [
          path.join(projectRoot, 'src', 'components'),
          path.join(projectRoot, 'src', 'prototypes'),
        ];
        const allowedExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.md', '.css']);
        const needles = [
          `themes/${themeName}/designToken.json`,
          `themes/${themeName}/globals.css`,
        ];
        const references = new Set<string>();

        const walkDir = (dirPath: string) => {
          if (!fs.existsSync(dirPath)) return;
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });
          for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
              walkDir(entryPath);
              continue;
            }

            const ext = path.extname(entry.name);
            if (!allowedExt.has(ext)) continue;

            const content = fs.readFileSync(entryPath, 'utf8');
            if (needles.some(needle => content.includes(needle))) {
              references.add(normalizePath(path.relative(projectRoot, entryPath)));
            }
          }
        };

        referenceDirs.forEach(walkDir);

        return Array.from(references).sort();
      };

      const scanItemReferences = (itemType: 'components' | 'prototypes', itemName: string) => {
        const referenceDirs = [
          path.join(projectRoot, 'src', 'components'),
          path.join(projectRoot, 'src', 'prototypes'),
        ];
        const allowedExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.md', '.css']);
        const references = new Set<string>();
        const escapedName = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRegex = new RegExp(`(?:^|[\\\\/])${escapedName}(?:$|[\\\\/'"\\s])`);
        const targetDir = path.resolve(projectRoot, 'src', itemType, itemName);

        const walkDir = (dirPath: string) => {
          if (!fs.existsSync(dirPath)) return;
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });
          for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
              if (path.resolve(entryPath) === targetDir) {
                continue;
              }
              walkDir(entryPath);
              continue;
            }

            const ext = path.extname(entry.name);
            if (!allowedExt.has(ext)) continue;

            const content = fs.readFileSync(entryPath, 'utf8');
            if (nameRegex.test(content)) {
              references.add(normalizePath(path.relative(projectRoot, entryPath)));
            }
          }
        };

        referenceDirs.forEach(walkDir);

        return Array.from(references).sort();
      };

      // 递归复制目录
      const copyDir = (src: string, dest: string) => {
        fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          
          if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };

      // ==================== /api/themes/check-references ====================
      server.middlewares.use('/api/themes/check-references', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          return sendJSON(res, 405, { error: 'Method not allowed' });
        }

        try {
          const { themeName } = await parseBody(req);
          if (!themeName || typeof themeName !== 'string') {
            return sendJSON(res, 400, { error: 'Missing themeName parameter' });
          }

          const themeDir = path.join(projectRoot, 'src', 'themes', themeName);
          if (!fs.existsSync(themeDir)) {
            return sendJSON(res, 404, { error: 'Theme not found' });
          }

          const references = scanThemeReferences(themeName);
          const designTokenPath = path.join(themeDir, 'designToken.json');
          const globalsPath = path.join(themeDir, 'globals.css');

          return sendJSON(res, 200, {
            themeName,
            references,
            hasReferences: references.length > 0,
            themeAssets: {
              hasDesignToken: fs.existsSync(designTokenPath),
              hasGlobals: fs.existsSync(globalsPath),
            },
          });
        } catch (e: any) {
          console.error('[文件系统 API] 检查主题引用失败:', e);
          return sendJSON(res, 500, { error: e.message || 'Check references failed' });
        }
      });

      server.middlewares.use('/api/themes/get-contents', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          return sendJSON(res, 405, { error: 'Method not allowed' });
        }

        try {
          const { themeName } = await parseBody(req);
          if (!themeName || typeof themeName !== 'string') {
            return sendJSON(res, 400, { error: 'Missing themeName parameter' });
          }

          const themeDir = path.join(projectRoot, 'src', 'themes', themeName);
          if (!fs.existsSync(themeDir)) {
            return sendJSON(res, 404, { error: 'Theme not found' });
          }

          const designTokenPath = path.join(themeDir, 'designToken.json');
          const globalsPath = path.join(themeDir, 'globals.css');
          const specPath = path.join(themeDir, 'DESIGN-SPEC.md');

          return sendJSON(res, 200, {
            themeName,
            designToken: fs.existsSync(designTokenPath) ? fs.readFileSync(designTokenPath, 'utf8') : null,
            globalsCss: fs.existsSync(globalsPath) ? fs.readFileSync(globalsPath, 'utf8') : null,
            designSpec: fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf8') : null,
          });
        } catch (e: any) {
          console.error('[文件系统 API] 获取主题内容失败:', e);
          return sendJSON(res, 500, { error: e.message || 'Get theme contents failed' });
        }
      });

      // ==================== /api/items/check-references ====================
      server.middlewares.use('/api/items/check-references', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          return sendJSON(res, 405, { error: 'Method not allowed' });
        }

        try {
          const { itemType, itemName } = await parseBody(req);
          if (!itemType || !itemName || typeof itemType !== 'string' || typeof itemName !== 'string') {
            return sendJSON(res, 400, { error: 'Missing itemType or itemName parameter' });
          }

          if (itemType !== 'components' && itemType !== 'prototypes') {
            return sendJSON(res, 400, { error: 'Invalid itemType' });
          }

          const itemDir = path.join(projectRoot, 'src', itemType, itemName);
          if (!fs.existsSync(itemDir)) {
            return sendJSON(res, 404, { error: 'Item not found' });
          }

          const references = scanItemReferences(itemType, itemName);

          return sendJSON(res, 200, {
            itemType,
            itemName,
            references,
            hasReferences: references.length > 0,
          });
        } catch (e: any) {
          console.error('[文件系统 API] 检查元素/页面引用失败:', e);
          return sendJSON(res, 500, { error: e.message || 'Check references failed' });
        }
      });

      // ==================== /api/delete ====================
      server.middlewares.use('/api/delete', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          return sendJSON(res, 405, { error: 'Method not allowed' });
        }

        try {
          const { path: targetPath } = await parseBody(req);
          
          if (!targetPath) {
            return sendJSON(res, 400, { error: 'Missing path parameter' });
          }

          // 验证路径安全性
          if (targetPath.includes('..') || targetPath.startsWith('/')) {
            return sendJSON(res, 403, { error: 'Invalid path' });
          }

          const parts = String(targetPath).split('/').filter(Boolean);
          const isElementsOrPages = parts.length >= 2 && (parts[0] === 'components' || parts[0] === 'prototypes');
          const deletePath = isElementsOrPages
            ? path.join(projectRoot, 'src', parts[0], parts[1])
            : path.join(projectRoot, 'src', targetPath);

          if (!fs.existsSync(deletePath)) {
            return sendJSON(res, 404, { error: 'Directory not found' });
          }

          // 删除目录
          fs.rmSync(deletePath, { recursive: true, force: true });

          sendJSON(res, 200, { success: true });
        } catch (e: any) {
          console.error('[文件系统 API] 删除失败:', e);
          sendJSON(res, 500, { error: e.message || 'Delete failed' });
        }
      });

      // ==================== /api/rename ====================
      server.middlewares.use('/api/rename', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          return sendJSON(res, 405, { error: 'Method not allowed' });
        }

        try {
          const { path: targetPath, newName } = await parseBody(req);

          if (!targetPath || !newName) {
            return sendJSON(res, 400, { error: 'Missing path or newName parameter' });
          }

          // 验证路径安全性
          if (targetPath.includes('..') || targetPath.startsWith('/')) {
            return sendJSON(res, 403, { error: 'Invalid path' });
          }

          // 验证新名称格式
          const trimmedNewName = String(newName).trim();
          if (!trimmedNewName) {
            return sendJSON(res, 400, { error: 'Invalid newName format' });
          }
          if (trimmedNewName === '.' || trimmedNewName === '..') {
            return sendJSON(res, 400, { error: 'Invalid newName format' });
          }
          if (/[\r\n]/.test(trimmedNewName)) {
            return sendJSON(res, 400, { error: 'Invalid newName format' });
          }
          if (trimmedNewName.includes('*/')) {
            return sendJSON(res, 400, { error: 'Invalid newName format' });
          }
          if (/[/\\:*?"<>|]/.test(trimmedNewName)) {
            return sendJSON(res, 400, { error: 'Invalid newName format' });
          }

          // 解析路径
          const parts = String(targetPath).split('/').filter(Boolean);
          if (parts.length !== 2 || (parts[0] !== 'components' && parts[0] !== 'prototypes')) {
            return sendJSON(res, 400, { error: 'Invalid path format' });
          }

          const group = parts[0];
          const itemName = parts[1];
          const itemDir = path.join(projectRoot, 'src', group, itemName);

          if (!fs.existsSync(itemDir)) {
            return sendJSON(res, 404, { error: 'Directory not found' });
          }

          const indexFiles = ['index.tsx', 'index.ts', 'index.jsx', 'index.js'];
          let indexFilePath: string | null = null;
          for (const fileName of indexFiles) {
            const filePath = path.join(itemDir, fileName);
            if (fs.existsSync(filePath)) {
              indexFilePath = filePath;
              break;
            }
          }

          if (!indexFilePath) {
            return sendJSON(res, 404, { error: 'Entry file not found' });
          }

          const nameLineRegex = /(^\s*\*\s*@(?:name|displayName)\s+)(.+)$/m;
          const content = fs.readFileSync(indexFilePath, 'utf8');
          let updatedContent = content;

          if (nameLineRegex.test(content)) {
            updatedContent = content.replace(nameLineRegex, `$1${trimmedNewName}`);
          } else {
            updatedContent = `/**\n * @name ${trimmedNewName}\n */\n${content}`;
          }

          if (updatedContent !== content) {
            fs.writeFileSync(indexFilePath, updatedContent, 'utf8');
          }

          sendJSON(res, 200, { success: true });
        } catch (e: any) {
          console.error('[文件系统 API] 重命名失败:', e);
          sendJSON(res, 500, { error: e.message || 'Rename failed' });
        }
      });

      // ==================== /api/upload ====================
      server.middlewares.use('/api/upload', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          return sendJSON(res, 405, { error: 'Method not allowed' });
        }

        try {
          const form = formidable({
            uploadDir: path.join(projectRoot, 'temp'),
            keepExtensions: true,
            multiples: true,
            maxFileSize: 100 * 1024 * 1024, // 100MB
          });

          form.parse(req, async (err: any, fields: any, files: any) => {
            if (err) {
              console.error('[文件系统 API] 上传解析失败:', err);
              return sendJSON(res, 500, { error: 'Upload parsing failed' });
            }

            try {
              // 提取字段值（处理数组和单值）
              const getFieldValue = (field: any) => Array.isArray(field) ? field[0] : field;
              
              const uploadType = getFieldValue(fields.uploadType);
              const targetType = getFieldValue(fields.targetType);
              const uploadMode = getFieldValue(fields.uploadMode);
              const folderNameField = getFieldValue(fields.folderName);
              const targetTypeRequired = uploadType !== 'local_axure';
              
              const normalizeFiles = (value: any) => {
                if (!value) return [];
                return Array.isArray(value) ? value : [value];
              };

              let fileList = normalizeFiles(files.files);
              if (fileList.length === 0) fileList = normalizeFiles(files.file);
              if (fileList.length === 0 && fields.file) {
                fileList = normalizeFiles(fields.file);
              }

              const isFolderUpload = uploadMode === 'folder' || fileList.length > 1;

              console.log('[文件系统 API] 原始文件对象:', {
                hasFilesFile: !!files.file,
                hasFilesFiles: !!files.files,
                hasFieldsFile: !!fields.file,
                fileCount: fileList.length,
                uploadMode,
                isFolderUpload,
              });

              console.log('[文件系统 API] 接收到的参数:', {
                uploadType,
                targetType,
                hasFile: fileList.length > 0,
                fileInfo: fileList.length > 0 ? { filepath: fileList[0]?.filepath, originalFilename: fileList[0]?.originalFilename } : null,
                fieldsKeys: Object.keys(fields),
                filesKeys: Object.keys(files)
              });

              if (!fileList.length || !uploadType || (targetTypeRequired && !targetType)) {
                console.error('[文件系统 API] 缺少必需参数:', { 
                  hasFile: fileList.length > 0, 
                  uploadType, 
                  targetType,
                  fileType: fileList.length > 0 ? typeof fileList[0] : 'undefined'
                });
                return sendJSON(res, 400, { 
                  error: 'Missing required parameters',
                  details: {
                    hasFile: fileList.length > 0,
                    hasUploadType: !!uploadType,
                    hasTargetType: !!targetType,
                    targetTypeRequired
                  }
                });
              }
              
              if (
                targetTypeRequired
                && !SUPPORTED_UPLOAD_TARGET_TYPES.includes(String(targetType) as (typeof SUPPORTED_UPLOAD_TARGET_TYPES)[number])
              ) {
                return sendJSON(res, 400, {
                  error: `Invalid targetType: ${targetType}. Supported targetType: ${SUPPORTED_UPLOAD_TARGET_TYPES.join(', ')}`
                });
              }

              if (targetType === 'themes' && !THEME_IMPORT_SUPPORTED_UPLOAD_TYPES.has(String(uploadType))) {
                return sendJSON(res, 400, {
                  error: `uploadType=${uploadType} 暂不支持 targetType=themes。当前支持: ${Array.from(THEME_IMPORT_SUPPORTED_UPLOAD_TYPES).join(', ')}`
                });
              }

              const primaryFile = fileList[0];
              const tempFilePath = primaryFile?.filepath || primaryFile?.path || primaryFile?.tempFilePath;
              const originalFilename = primaryFile?.originalFilename || primaryFile?.name || primaryFile?.filename || 'upload.zip';

              console.log('[文件系统 API] 文件信息:', {
                tempFilePath,
                originalFilename,
                fileCount: fileList.length,
                isFolderUpload,
              });

              if (!isFolderUpload) {
                if (!tempFilePath || !fs.existsSync(tempFilePath)) {
                  return sendJSON(res, 500, { error: '临时文件不存在' });
                }

                if (fs.statSync(tempFilePath).size === 0) {
                  return sendJSON(res, 500, { error: '上传的文件为空' });
                }
              } else {
                const missingFile = fileList.find((file: any) => !file?.filepath || !fs.existsSync(file.filepath));
                if (missingFile) {
                  return sendJSON(res, 500, { error: '上传的文件夹存在缺失文件，请重试' });
                }
              }

              const relativePaths = normalizeFiles(fields.relativePaths).map((value: any) => String(value));
              const derivedRootName = deriveRootFolderName(relativePaths);

              // AI 辅助类型：local_axure（解压到 temp 并返回 Prompt）
              if (uploadType === 'local_axure') {
                if (isFolderUpload) {
                  return sendJSON(res, 400, { error: 'local_axure 暂不支持文件夹上传，请使用 ZIP 文件' });
                }
                try {
                  const scriptPath = path.join(projectRoot, 'scripts', 'local-axure-extract.mjs');
                  const commandResult = runCommandSync({
                    command: nodeCommand,
                    args: [scriptPath, tempFilePath, originalFilename],
                    cwd: projectRoot,
                  });

                  if (commandResult.status !== 0) {
                    const details = [commandResult.stderr, commandResult.stdout]
                      .filter(Boolean)
                      .join('\n')
                      .trim();
                    throw new Error(details || 'local-axure-extract failed');
                  }

                  const rawOutput = commandResult.stdout.trim();

                  const lastLine = rawOutput.split('\n').filter(Boolean).slice(-1)[0] || rawOutput;
                  const extracted = JSON.parse(lastLine) as { extractDir: string; contentDir?: string };
                  const filePath = extracted.contentDir || extracted.extractDir;

                  // 清理临时 zip
                  fs.unlinkSync(tempFilePath);

                  const isThemeImport = targetType === 'themes';
                  const skillDocs = isThemeImport
                    ? ['/skills/local-axure-workflow/SKILL.md', ...THEME_IMPORT_SUB_SKILL_DOCS]
                    : ['/skills/local-axure-workflow/SKILL.md'];
                  const targetHint = targetType ? `\n\n建议输出目录：\`src/${targetType}\`` : '';
                  const prompt = isThemeImport
                    ? `本地 Axure ZIP 已上传并解压完成。\n\n解压目录：\`${filePath}\`\n\n请阅读技能文档：\n${formatReferenceList(skillDocs)}\n\n目标：导入主题并生成主题/文档/数据相关资产。\n\n建议输出目录：\n- \`src/themes/<theme-key>/\`\n- \`src/docs/\`\n- \`src/database/\`\n\n开始执行前：先根据 skill 的用户交互指南用简短中文回复用户，确认需求（主题范围/是否需要文档与数据/是否允许优化）。\n\n请按技能文档流程，从解压目录中提取并生成主题 token、设计规范、项目文档与数据模型。`
                    : `本地 Axure ZIP 已上传并解压完成。\n\n解压目录：\`${filePath}\`\n\n请阅读技能文档：\n${formatReferenceList(skillDocs)}${targetHint}\n\n开始执行前：先根据 skill 的用户交互指南用简短中文回复用户，确认需求（目标范围/输出类型/是否允许优化等）。\n\n请按技能文档流程，从解压目录中提取主题/数据/文档并还原页面/元素。`;

                  return sendJSON(res, 200, {
                    success: true,
                    uploadType,
                    filePath,
                    prompt,
                    message: '文件已解压，请复制 Prompt 交给 AI 处理'
                  });
                } catch (e: any) {
                  console.error('[文件系统 API] local_axure 解压失败:', e);
                  return sendJSON(res, 500, { error: `解压失败: ${e.message}` });
                }
              }

              let folderUploadContext: {
                tempExtractDir: string;
                inferred: { entryCount: number; hasRootFolder: boolean; rootFolderName: string };
                fallbackName: string;
              } | null = null;

              if (isFolderUpload) {
                try {
                  const tempExtractDir = path.join(projectRoot, 'temp', `folder-upload-${Date.now()}`);
                  fs.mkdirSync(tempExtractDir, { recursive: true });

                  const fallbackSource = folderNameField || derivedRootName || `upload-${Date.now()}`;
                  const fallbackName = truncateName(sanitizeFolderName(fallbackSource), 60) || `upload-${Date.now()}`;

                  fileList.forEach((file: any, index: number) => {
                    const sourcePath = file?.filepath || file?.path || file?.tempFilePath;
                    if (!sourcePath || !fs.existsSync(sourcePath)) return;

                    const rawRelativePath = relativePaths[index] || file?.originalFilename || file?.name || `file-${index}`;
                    const safeRelativePath = sanitizeRelativePath(String(rawRelativePath));
                    if (!safeRelativePath || hasIgnoredEntry(safeRelativePath)) {
                      fs.unlinkSync(sourcePath);
                      return;
                    }

                    const destPath = path.join(tempExtractDir, safeRelativePath);
                    fs.mkdirSync(path.dirname(destPath), { recursive: true });
                    fs.copyFileSync(sourcePath, destPath);
                    fs.unlinkSync(sourcePath);
                  });

                  const inferred = inferExtractedRootFolder(tempExtractDir);
                  if (inferred.entryCount === 0) {
                    return sendJSON(res, 500, { error: '上传的文件夹为空' });
                  }

                  folderUploadContext = {
                    tempExtractDir,
                    inferred,
                    fallbackName
                  };
                } catch (e: any) {
                  console.error('[文件系统 API] 文件夹处理失败:', e);
                  return sendJSON(res, 500, { error: `文件夹处理失败: ${e.message || '未知错误'}` });
                }
              }

              // 直接处理类型：make, axhub, google_stitch
              if (['make', 'axhub', 'google_stitch'].includes(uploadType)) {
                try {
                  // 解压到临时目录（先解压再分析目录结构，避免依赖 ZIP 条目解析）
                  const tempExtractDir = isFolderUpload
                    ? folderUploadContext!.tempExtractDir
                    : path.join(projectRoot, 'temp', `extract-${Date.now()}`);

                  if (!isFolderUpload) {
                    fs.mkdirSync(tempExtractDir, { recursive: true });
                    await extractZip(tempFilePath, { dir: tempExtractDir });
                  }

                  const inferred = isFolderUpload
                    ? folderUploadContext!.inferred
                    : inferExtractedRootFolder(tempExtractDir);
                  if (inferred.entryCount === 0) {
                    throw new Error('ZIP 文件为空');
                  }

                  const extractedRootFolderName = inferred.rootFolderName;
                  const hasRootFolder = inferred.hasRootFolder;

                  const basename = isFolderUpload
                    ? folderUploadContext!.fallbackName
                    : path.basename(originalFilename, path.extname(originalFilename));
                  const fallbackFolderName = truncateName(sanitizeFolderName(basename), 60);
                  const safeFallbackFolderName = fallbackFolderName || `upload-${Date.now()}`;
                  const targetFolderName = hasRootFolder
                    ? truncateName(extractedRootFolderName, 60)
                    : safeFallbackFolderName;

                  const targetBaseDir = path.join(projectRoot, 'src', targetType);
                  const targetDir = path.join(targetBaseDir, targetFolderName);
                  const resolvedTargetBase = path.resolve(targetBaseDir);
                  const resolvedTargetDir = path.resolve(targetDir);

                  // 防止覆盖整个 prototypes/components 目录或越界写入
                  if (resolvedTargetDir === resolvedTargetBase || !resolvedTargetDir.startsWith(resolvedTargetBase + path.sep)) {
                    throw new Error('目标目录不安全，已阻止解压');
                  }

                  console.log('[文件系统 API] ZIP 结构分析:', {
                    hasRootFolder,
                    rootFolderName: extractedRootFolderName,
                    targetDir,
                    entriesCount: inferred.entryCount
                  });

                  // 如果目标目录已存在，直接删除（覆盖）
                  if (fs.existsSync(targetDir)) {
                    fs.rmSync(targetDir, { recursive: true, force: true });
                  }

                  // 🔧 Windows 兼容性修复：等待杀毒软件释放文件
                  // 在 Windows 上，解压后杀毒软件（如 Windows Defender）会立即扫描新文件
                  // 导致文件被短暂锁定，此时执行 rename 会触发 EPERM 错误
                  // 延迟 500ms 让杀毒软件完成扫描，大幅降低权限错误的概率
                  await new Promise(resolve => setTimeout(resolve, 500));

                  // 移动到目标目录（使用复制+删除方式作为 fallback，避免 Windows 权限问题）
                  if (hasRootFolder) {
                    // 有根目录：移动根目录
                    const extractedRoot = path.join(tempExtractDir, extractedRootFolderName);
                    if (fs.existsSync(extractedRoot)) {
                      try {
                        // 优先尝试 rename（快速路径，毫秒级完成）
                        // rename 只修改文件系统元数据，不移动实际数据，性能最优
                        fs.renameSync(extractedRoot, targetDir);
                      } catch (renameError: any) {
                        // rename 失败则使用复制+删除（兼容路径，秒级完成）
                        // 虽然慢，但能处理跨驱动器、权限问题等 rename 无法处理的情况
                        console.warn('[文件系统] rename 失败，使用复制方式:', renameError.message);
                        copyDirRecursive(extractedRoot, targetDir);
                        fs.rmSync(extractedRoot, { recursive: true, force: true });
                      }
                    } else {
                      throw new Error('解压后找不到根目录');
                    }
                  } else {
                    // 没有根目录：直接移动整个解压目录
                    try {
                      // 优先尝试 rename（快速路径）
                      fs.renameSync(tempExtractDir, targetDir);
                    } catch (renameError: any) {
                      // rename 失败则使用复制+删除（兼容路径）
                      console.warn('[文件系统] rename 失败，使用复制方式:', renameError.message);
                      copyDirRecursive(tempExtractDir, targetDir);
                      fs.rmSync(tempExtractDir, { recursive: true, force: true });
                    }
                  }

                  // 清理临时文件
                  if (fs.existsSync(tempExtractDir)) {
                    fs.rmSync(tempExtractDir, { recursive: true, force: true });
                  }
                  if (!isFolderUpload) {
                    fs.unlinkSync(tempFilePath);
                  }

                  // 根据类型执行转换脚本
                  if (uploadType === 'axhub') {
                    // Chrome 扩展：执行转换脚本
                    const scriptPath = path.join(projectRoot, 'scripts', 'chrome-export-converter.mjs');
                    void runCommand({
                      command: nodeCommand,
                      args: [scriptPath, targetDir, targetFolderName],
                      cwd: projectRoot,
                      capture: true,
                    }).then((result) => {
                      if (result.code !== 0) {
                        console.error('[Chrome 转换] 执行失败:', result.stderr || result.stdout || `exit=${result.code}`);
                      } else {
                        console.log('[Chrome 转换] 完成:', result.stdout);
                      }
                      if (result.stderr) console.error('[Chrome 转换] 错误:', result.stderr);
                    }).catch((error: any) => {
                      console.error('[Chrome 转换] 执行失败:', error);
                    });
                  } else if (uploadType === 'google_stitch') {
                    const scriptPath = path.join(projectRoot, 'scripts', 'stitch-converter.mjs');
                    const commandResult = runCommandSync({
                      command: nodeCommand,
                      args: [scriptPath, targetDir, targetFolderName],
                      cwd: projectRoot,
                    });

                    if (commandResult.status !== 0) {
                      throw new Error(commandResult.stderr || commandResult.stdout || `stitch-converter exit=${commandResult.status}`);
                    }

                    const output = commandResult.stdout.trim();
                    const lastLine = output.split('\n').filter(Boolean).slice(-1)[0] || output;
                    let stitchResult: {
                      success?: boolean;
                      requiresAi?: boolean;
                      prompt?: string | null;
                      reasons?: string[];
                    } = {};

                    try {
                      stitchResult = JSON.parse(lastLine);
                    } catch (parseError: any) {
                      throw new Error(`stitch-converter 返回结果无法解析: ${parseError.message}`);
                    }

                    const requiresAi = stitchResult.requiresAi === true;
                    return sendJSON(res, 200, {
                      success: true,
                      message: requiresAi
                        ? '页面已导入完成，可先预览基础效果。部分细节还可继续优化，建议交给 AI 完成。'
                        : '上传并解压成功',
                      folderName: targetFolderName,
                      path: `${targetType}/${targetFolderName}`,
                      hint: requiresAi
                        ? '复制提示词后，可继续完善交互与动态内容'
                        : '如果页面无法预览，让 AI 处理即可',
                      requiresAi,
                      prompt: stitchResult.prompt || undefined,
                      reasons: Array.isArray(stitchResult.reasons) ? stitchResult.reasons : [],
                    });
                  }

                  return sendJSON(res, 200, {
                    success: true,
                    message: '上传并解压成功',
                    folderName: targetFolderName,
                    path: `${targetType}/${targetFolderName}`,
                    hint: '如果页面无法预览，让 AI 处理即可'
                  });
                } catch (e: any) {
                  console.error('[文件系统 API] 解压失败:', e);
                  if (e?.code === 'ENAMETOOLONG') {
                    return sendJSON(res, 500, {
                      error:
                        '解压失败：ZIP 内部路径过长（超出系统限制）。请解压后上传文件夹，或缩短文件名后重试。',
                    });
                  }
                  return sendJSON(res, 500, { error: `解压失败: ${e.message}` });
                }
              }

              // AI 处理类型：v0, google_aistudio
              if (['v0', 'google_aistudio'].includes(uploadType)) {
                try {
                  // 解压到 temp 目录
                  const timestamp = Date.now();
                  const basename = isFolderUpload
                    ? (folderUploadContext?.fallbackName || folderNameField || derivedRootName || `upload-${timestamp}`)
                    : path.basename(originalFilename, path.extname(originalFilename));
                  const extractDirName = `${uploadType}-${truncateName(sanitizeFolderName(basename), 40)}-${timestamp}`;
                  const extractDir = isFolderUpload
                    ? (folderUploadContext!.inferred.hasRootFolder
                        ? path.join(folderUploadContext!.tempExtractDir, folderUploadContext!.inferred.rootFolderName)
                        : folderUploadContext!.tempExtractDir)
                    : path.join(projectRoot, 'temp', extractDirName);

                  if (!isFolderUpload) {
                    fs.mkdirSync(extractDir, { recursive: true });
                    await extractZip(tempFilePath, { dir: extractDir });
                    fs.unlinkSync(tempFilePath);
                  }

                  const pageName = basename
                    .replace(/[^a-z0-9-]/gi, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
                    .toLowerCase();
                  const isThemeTarget = targetType === 'themes';

                  // V0 项目：自动执行预处理脚本（同步等待完成）
                  if (uploadType === 'v0') {
                    const scriptPath = path.join(projectRoot, 'scripts', 'v0-converter.mjs');
                    const tasksFileName = isThemeTarget ? '.v0-theme-tasks.md' : '.v0-tasks.md';
                    const commandArgs = [scriptPath, extractDir, pageName, '--target-type', String(targetType)];
                    
                    console.log('[V0 转换] 执行预处理脚本:', `node ${commandArgs.join(' ')}`);
                    
                    // 同步执行，等待完成
                    try {
                      const commandResult = runCommandSync({
                        command: nodeCommand,
                        args: commandArgs,
                        cwd: projectRoot,
                      });

                      if (commandResult.status !== 0) {
                        throw new Error(commandResult.stderr || commandResult.stdout || `exit=${commandResult.status}`);
                      }
                      const output = commandResult.stdout;
                      
                      console.log('[V0 转换] 执行成功:', output);
                      
                      // 验证任务文档是否生成
                      const tasksFilePath = path.join(projectRoot, 'src', targetType, pageName, tasksFileName);
                      if (!fs.existsSync(tasksFilePath)) {
                        throw new Error(`任务文档生成失败: ${tasksFileName}`);
                      }
                      
                      // 返回任务文档路径
                      const tasksFileRelPath = `src/${targetType}/${pageName}/${tasksFileName}`;
                      const ruleFile = '/rules/v0-project-converter.md';
                      const prompt = isThemeTarget
                        ? `V0 项目已上传并预处理完成（主题模式）。\n\n请阅读以下文件：\n1. 主题任务清单: ${tasksFileRelPath}\n2. 转换规范: ${ruleFile}\n\n请同时阅读主题拆分技能文档：\n${formatReferenceList(THEME_IMPORT_SUB_SKILL_DOCS)}\n\n然后基于任务清单生成主题/文档/数据（输出到 \`src/themes/${pageName}/\`、\`src/docs/\`、\`src/database/\`）。`
                        : `V0 项目已上传并预处理完成。\n\n请阅读以下文件：\n1. 任务清单: ${tasksFileRelPath}\n2. 转换规范: ${ruleFile}\n\n然后根据任务清单完成转换工作。`;
                      
                      return sendJSON(res, 200, {
                        success: true,
                        uploadType,
                        pageName,
                        tasksFile: tasksFileRelPath,
                        ruleFile,
                        prompt,
                        message: isThemeTarget ? '主题预处理完成，请查看任务文档' : '预处理完成，请查看任务文档'
                      });
                    } catch (scriptError: any) {
                      console.error('[V0 转换] 执行失败:', scriptError);
                      
                      // 清理已创建的目录
                      const pageDir = path.join(projectRoot, 'src', targetType, pageName);
                      if (fs.existsSync(pageDir)) {
                        fs.rmSync(pageDir, { recursive: true, force: true });
                      }
                      
                      return sendJSON(res, 500, { 
                        error: `预处理脚本执行失败: ${scriptError.message}`,
                        details: scriptError.stderr || scriptError.stdout || scriptError.message
                      });
                    }
                  }

                  // Google AI Studio 项目：自动执行预处理脚本（同步等待完成）
                  if (uploadType === 'google_aistudio') {
                    const scriptPath = path.join(projectRoot, 'scripts', 'ai-studio-converter.mjs');
                    const tasksFileName = isThemeTarget ? '.ai-studio-theme-tasks.md' : '.ai-studio-tasks.md';
                    const commandArgs = [scriptPath, extractDir, pageName, '--target-type', String(targetType)];
                    
                    console.log('[AI Studio 转换] 执行预处理脚本:', `node ${commandArgs.join(' ')}`);
                    
                    // 同步执行，等待完成
                    try {
                      const commandResult = runCommandSync({
                        command: nodeCommand,
                        args: commandArgs,
                        cwd: projectRoot,
                      });
                      if (commandResult.status !== 0) {
                        throw new Error(commandResult.stderr || commandResult.stdout || `exit=${commandResult.status}`);
                      }
                      const output = commandResult.stdout;
                      
                      console.log('[AI Studio 转换] 执行成功:', output);
                      
                      // 验证任务文档是否生成
                      const tasksFilePath = path.join(projectRoot, 'src', targetType, pageName, tasksFileName);
                      if (!fs.existsSync(tasksFilePath)) {
                        throw new Error(`任务文档生成失败: ${tasksFileName}`);
                      }
                      
                      // 返回任务文档路径
                      const tasksFileRelPath = `src/${targetType}/${pageName}/${tasksFileName}`;
                      const ruleFile = '/rules/ai-studio-project-converter.md';
                      const prompt = isThemeTarget
                        ? `AI Studio 项目已上传并预处理完成（主题模式）。\n\n请阅读以下文件：\n1. 主题任务清单: ${tasksFileRelPath}\n2. 转换规范: ${ruleFile}\n\n请同时阅读主题拆分技能文档：\n${formatReferenceList(THEME_IMPORT_SUB_SKILL_DOCS)}\n\n然后基于任务清单生成主题/文档/数据（输出到 \`src/themes/${pageName}/\`、\`src/docs/\`、\`src/database/\`）。`
                        : `AI Studio 项目已上传并预处理完成。\n\n请阅读以下文件：\n1. 任务清单: ${tasksFileRelPath}\n2. 转换规范: ${ruleFile}\n\n然后根据任务清单完成转换工作。`;
                      
                      return sendJSON(res, 200, {
                        success: true,
                        uploadType,
                        pageName,
                        tasksFile: tasksFileRelPath,
                        ruleFile,
                        prompt,
                        message: isThemeTarget ? '主题预处理完成，请查看任务文档' : '预处理完成，请查看任务文档'
                      });
                    } catch (scriptError: any) {
                      console.error('[AI Studio 转换] 执行失败:', scriptError);
                      
                      // 清理已创建的目录
                      const pageDir = path.join(projectRoot, 'src', targetType, pageName);
                      if (fs.existsSync(pageDir)) {
                        fs.rmSync(pageDir, { recursive: true, force: true });
                      }
                      
                      return sendJSON(res, 500, { 
                        error: `预处理脚本执行失败: ${scriptError.message}`,
                        details: scriptError.stderr || scriptError.stdout || scriptError.message
                      });
                    }
                  }
                } catch (e: any) {
                  console.error('[文件系统 API] 解压失败:', e);
                  if (e?.code === 'ENAMETOOLONG') {
                    return sendJSON(res, 500, {
                      error:
                        '解压失败：ZIP 内部路径过长（超出系统限制）。请解压后上传文件夹，或缩短文件名后重试。',
                    });
                  }
                  return sendJSON(res, 500, { error: `解压失败: ${e.message}` });
                }
              }

              // 未知类型
              return sendJSON(res, 400, { error: `不支持的上传类型: ${uploadType}` });
            } catch (e: any) {
              console.error('[文件系统 API] 文件处理失败:', e);
              return sendJSON(res, 500, { error: e.message || 'File processing failed' });
            }
          });
        } catch (e: any) {
          console.error('[文件系统 API] 上传失败:', e);
          sendJSON(res, 500, { error: e.message || 'Upload failed' });
        }
      });

      // ==================== /api/upload-screenshots ====================
      server.middlewares.use('/api/upload-screenshots', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          return sendJSON(res, 405, { error: 'Method not allowed' });
        }

        try {
          const form = formidable({
            uploadDir: path.join(projectRoot, 'temp'),
            keepExtensions: true,
            maxFileSize: 20 * 1024 * 1024, // 20MB per image
            multiples: true,
          });

          form.parse(req, async (err: any, fields: any, files: any) => {
            if (err) {
              console.error('[文件系统 API] 截图上传解析失败:', err);
              return sendJSON(res, 500, { error: 'Upload parsing failed' });
            }

            try {
              const getFieldValue = (field: any) => Array.isArray(field) ? field[0] : field;

              const rawBatchId = getFieldValue(fields.batchId);
              const targetType = getFieldValue(fields.targetType);
              const batchId = (typeof rawBatchId === 'string' ? rawBatchId : '')
                .trim()
                .replace(/[^a-z0-9_-]/gi, '')
                .slice(0, 64);

              if (
                targetType
                && !SUPPORTED_UPLOAD_TARGET_TYPES.includes(String(targetType) as (typeof SUPPORTED_UPLOAD_TARGET_TYPES)[number])
              ) {
                return sendJSON(res, 400, {
                  error: `Invalid targetType: ${targetType}. Supported targetType: ${SUPPORTED_UPLOAD_TARGET_TYPES.join(', ')}`
                });
              }

              const isThemeTarget = targetType === 'themes';

              const resolvedBatchId = batchId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              const screenshotsDir = path.join(projectRoot, 'temp', 'screenshots', resolvedBatchId);
              fs.mkdirSync(screenshotsDir, { recursive: true });

              const fileInput = (files.file ?? files.files) as any;
              const fileList = Array.isArray(fileInput) ? fileInput : (fileInput ? [fileInput] : []);

              if (fileList.length === 0) {
                return sendJSON(res, 400, { error: 'Missing file' });
              }

              const savedNames: string[] = [];

              for (const file of fileList) {
                const tempFilePath = file.filepath || file.path || file.tempFilePath;
                const originalFilename = file.originalFilename || file.name || file.filename || 'screenshot';

                if (!tempFilePath || !fs.existsSync(tempFilePath)) {
                  continue;
                }

                let safeName = path.basename(originalFilename).trim();
                safeName = safeName.replace(/[^\w.\- ]+/g, '-').replace(/\s+/g, '-');
                if (!safeName) safeName = 'screenshot';

                const ext = path.extname(safeName) || path.extname(originalFilename) || path.extname(tempFilePath) || '';
                const base = ext ? safeName.slice(0, -ext.length) : safeName;

                let candidate = `${base}${ext}`;
                let counter = 2;
                while (fs.existsSync(path.join(screenshotsDir, candidate))) {
                  candidate = `${base}-${counter}${ext}`;
                  counter += 1;
                }

                const destPath = path.join(screenshotsDir, candidate);
                moveFileWithFallback(tempFilePath, destPath);
                savedNames.push(candidate);
              }

              const entries = fs.readdirSync(screenshotsDir, { withFileTypes: true });
              const filePaths = entries
                .filter(entry => entry.isFile())
                .map(entry => normalizePath(path.join('temp', 'screenshots', resolvedBatchId, entry.name)))
                .sort((a, b) => a.localeCompare(b));

              const docs = isThemeTarget
                ? [
                    '/skills/screen-to-code/SKILL.md',
                    '/skills/screen-to-code/screenshot-collection.md',
                    ...THEME_IMPORT_SUB_SKILL_DOCS,
                  ]
                : [
                    '/skills/screen-to-code/SKILL.md',
                    '/skills/screen-to-code/screenshot-collection.md',
                  ];

              const prompt = isThemeTarget
                ? `**系统指令**：你将作为UI/UX 设计架构师 × 前端工程师（复合型），协助用户「基于截图导入并创建主题」。

请严格按以下技能文档执行：
${formatReferenceList(docs)}

截图清单（已上传到工作区）：
${filePaths.map(p => `- \`${p}\``).join('\n')}

先和用户确认 \`theme-key\` 与输出范围（是否需要文档/数据），然后基于截图生成主题 token、设计规范文档与主题示例入口，必要时补充 \`src/docs/\` 与 \`src/database/\`。`
                : `**系统指令**：你将作为UI/UX 设计架构师 × 前端工程师（复合型），协助用户「基于截图导入并创建页面/元素」。

请严格按以下技能文档执行（必须完整跑完 Phase 0 → 5）：
${formatReferenceList(docs)}

截图清单（已上传到工作区）：
${filePaths.map(p => `- \`${p}\``).join('\n')}

从 Phase 0 开始：先确认要生成页面还是元素、目标 name（kebab-case）、是否允许优化设计/交互；然后按文档产出抽象 JSON → 代码蓝图 → 再生成代码。`;

              return sendJSON(res, 200, {
                success: true,
                batchId: resolvedBatchId,
                files: filePaths,
                saved: savedNames,
                prompt,
                message: filePaths.length > 1 ? `已上传 ${filePaths.length} 张截图` : '已上传 1 张截图',
              });
            } catch (e: any) {
              console.error('[文件系统 API] 截图处理失败:', e);
              return sendJSON(res, 500, { error: e.message || 'File processing failed' });
            }
          });
        } catch (e: any) {
          console.error('[文件系统 API] 截图上传失败:', e);
          return sendJSON(res, 500, { error: e.message || 'Upload failed' });
        }
      });

      // ==================== /api/zip ====================
      server.middlewares.use('/api/zip', async (req: any, res: any) => {
        if (req.method !== 'GET') {
          return sendJSON(res, 405, { error: 'Method not allowed' });
        }

        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const targetPath = url.searchParams.get('path'); // e.g., 'prototypes/antd-demo'

          if (!targetPath) {
            return sendJSON(res, 400, { error: 'Missing path parameter' });
          }

          // 验证路径安全性
          if (targetPath.includes('..') || targetPath.startsWith('/')) {
            return sendJSON(res, 403, { error: 'Invalid path' });
          }

          const srcDir = path.join(projectRoot, 'src', targetPath);

          if (!fs.existsSync(srcDir)) {
            return sendJSON(res, 404, { error: 'Directory not found' });
          }

          const probe = url.searchParams.get('probe') === '1';
          const fileName = `${path.basename(targetPath)}.zip`;
          if (probe) {
            return sendJSON(res, 200, {
              ok: true,
              fileName,
              path: targetPath,
            });
          }

          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', buildAttachmentContentDisposition(fileName));

          // 使用 streaming 方式创建 ZIP（避免在内存中构建整个 zip buffer）
          try {
            const archive = new (archiver as any)('zip', { zlib: { level: 9 } });

            archive.on('warning', (warning: any) => {
              console.warn('[文件系统 API] ZIP warning:', warning);
            });

            archive.on('error', (zipError: any) => {
              console.error('[文件系统 API] ZIP 创建失败:', zipError);
              if (!res.headersSent) {
                sendJSON(res, 500, { error: `创建 ZIP 失败: ${zipError.message}` });
              } else {
                res.end();
              }
            });

            archive.pipe(res);
            archive.directory(srcDir, false);

            await new Promise<void>((resolve) => {
              res.on('close', resolve);
              res.on('finish', resolve);
              archive.on('error', resolve);
              archive.finalize();
            });
          } catch (zipError: any) {
            console.error('[文件系统 API] ZIP 创建失败:', zipError);
            if (!res.headersSent) {
              return sendJSON(res, 500, { error: `创建 ZIP 失败: ${zipError.message}` });
            }
          }
        } catch (e: any) {
          console.error('[文件系统 API] zip 失败:', e);
          if (!res.headersSent) {
            sendJSON(res, 500, { error: e.message || 'Zip failed' });
          }
        }
      });

      // ==================== /api/copy ====================
      server.middlewares.use('/api/copy', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          return sendJSON(res, 405, { error: 'Method not allowed' });
        }

        try {
          const { sourcePath, targetPath } = await parseBody(req);

          if (!sourcePath || !targetPath) {
            return sendJSON(res, 400, { error: 'Missing sourcePath or targetPath parameter' });
          }

          // 验证路径安全性
          if (sourcePath.includes('..') || targetPath.includes('..')) {
            return sendJSON(res, 403, { error: 'Invalid path' });
          }

          // 验证目标路径不包含中文字符
          const targetFolderName = path.basename(targetPath);
          if (/[\u4e00-\u9fa5]/.test(targetFolderName)) {
            return sendJSON(res, 400, { error: 'Target folder name cannot contain Chinese characters' });
          }

          // sourcePath 和 targetPath 格式: src/components/xxx 或 src/prototypes/xxx
          const sourceDir = path.join(projectRoot, sourcePath);
          const targetDir = path.join(projectRoot, targetPath);

          if (!fs.existsSync(sourceDir)) {
            return sendJSON(res, 404, { error: 'Source directory not found' });
          }

          if (fs.existsSync(targetDir)) {
            return sendJSON(res, 409, { error: 'Target directory already exists' });
          }

          // 复制目录
          copyDir(sourceDir, targetDir);

          // 更新副本的 @name 注释
          const indexFiles = ['index.tsx', 'index.ts', 'index.jsx', 'index.js'];
          let indexFilePath: string | null = null;
          
          for (const fileName of indexFiles) {
            const filePath = path.join(targetDir, fileName);
            if (fs.existsSync(filePath)) {
              indexFilePath = filePath;
              break;
            }
          }

          if (indexFilePath) {
            try {
              let content = fs.readFileSync(indexFilePath, 'utf8');
              
              // 提取文件夹名中的副本编号
              const copyMatch = targetFolderName.match(/-copy(\d*)$/);
              let copySuffix = '副本';
              if (copyMatch) {
                const copyNum = copyMatch[1];
                copySuffix = copyNum ? `副本${copyNum}` : '副本';
              }
              
              // 更新 @name 注释
              content = content.replace(
                /(@name\s+)([^\n]+)/,
                (match, prefix, name) => {
                  // 如果名称已经包含"副本"，先移除
                  const cleanName = name.replace(/\s*副本\d*\s*$/, '').trim();
                  return `${prefix}${cleanName} ${copySuffix}`;
                }
              );
              
              fs.writeFileSync(indexFilePath, content, 'utf8');
            } catch (e) {
              console.error('[文件系统 API] 更新 @name 注释失败:', e);
              // 不影响主流程，继续执行
            }
          }

          sendJSON(res, 200, { success: true });
        } catch (e: any) {
          console.error('[文件系统 API] 复制失败:', e);
          sendJSON(res, 500, { error: e.message || 'Copy failed' });
        }
      });
    }
  };
}
