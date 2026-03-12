import fs from 'fs';
import path from 'path';
import type { SidebarTreeTab } from './entryScanner';

export type ResourceOrderType = 'themes' | 'data' | 'templates';

export type SidebarTreeNodeKind = 'folder' | 'item';

export interface SidebarTreeNode {
  id: string;
  kind: SidebarTreeNodeKind;
  title: string;
  itemKey?: string;
  children?: SidebarTreeNode[];
}

export interface SidebarTreeStore {
  version: number;
  updatedAt: string;
  prototypes: SidebarTreeNode[];
  components: SidebarTreeNode[];
  docs: SidebarTreeNode[];
  canvas: SidebarTreeNode[];
  themes: string[];
  data: string[];
  templates: string[];
}

interface EntriesWithLegacySidebarTree {
  sidebarTree?: {
    version?: number;
    prototypes?: SidebarTreeNode[];
    components?: SidebarTreeNode[];
    docs?: SidebarTreeNode[];
    canvas?: SidebarTreeNode[];
    themes?: string[];
    data?: string[];
    templates?: string[];
  };
}

interface SidebarTreeStoreOptions {
  version: number;
  legacyEntriesPath: string;
  storePath: string;
}

const ENTRIES_MANIFEST_RELATIVE_PATH = path.join('.axhub', 'make', 'entries.json');
export const SIDEBAR_TREE_STORE_RELATIVE_PATH = path.join('.axhub', 'make', 'sidebar-tree.json');

function createDefaultStore(version: number): SidebarTreeStore {
  return {
    version,
    updatedAt: new Date().toISOString(),
    prototypes: [],
    components: [],
    docs: [],
    canvas: [],
    themes: [],
    data: [],
    templates: [],
  };
}

function readJsonFile(filePath: string): unknown {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function cloneTree(nodes: SidebarTreeNode[]): SidebarTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    children: Array.isArray(node.children) ? cloneTree(node.children) : undefined,
  }));
}

function normalizeStore(data: unknown, version: number): SidebarTreeStore | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const parsed = data as Partial<SidebarTreeStore>;
  const prototypes = Array.isArray(parsed.prototypes) ? cloneTree(parsed.prototypes) : [];
  const components = Array.isArray(parsed.components) ? cloneTree(parsed.components) : [];
  const docs = Array.isArray(parsed.docs) ? cloneTree(parsed.docs) : [];
  const canvas = Array.isArray(parsed.canvas) ? cloneTree(parsed.canvas) : [];
  const themes = Array.isArray(parsed.themes)
    ? parsed.themes.filter((key): key is string => typeof key === 'string')
    : [];
  const dataOrder = Array.isArray(parsed.data)
    ? parsed.data.filter((key): key is string => typeof key === 'string')
    : [];
  const updatedAt = typeof parsed.updatedAt === 'string' && parsed.updatedAt.trim()
    ? parsed.updatedAt
    : new Date().toISOString();
  const templates = Array.isArray(parsed.templates)
    ? parsed.templates.filter((key): key is string => typeof key === 'string')
    : [];

  return {
    version,
    updatedAt,
    prototypes,
    components,
    docs,
    canvas,
    themes,
    data: dataOrder,
    templates,
  };
}

function readLegacySidebarTree(legacyEntriesPath: string, version: number): SidebarTreeStore | null {
  const data = readJsonFile(legacyEntriesPath);
  if (!data || typeof data !== 'object') {
    return null;
  }

  const entries = data as EntriesWithLegacySidebarTree;
  const legacy = entries.sidebarTree;
  if (!legacy || typeof legacy !== 'object') {
    return null;
  }

  return {
    version,
    updatedAt: new Date().toISOString(),
    prototypes: Array.isArray(legacy.prototypes) ? cloneTree(legacy.prototypes) : [],
    components: Array.isArray(legacy.components) ? cloneTree(legacy.components) : [],
    docs: Array.isArray((legacy as any).docs) ? cloneTree((legacy as any).docs) : [],
    canvas: Array.isArray((legacy as any).canvas) ? cloneTree((legacy as any).canvas) : [],
    themes: Array.isArray((legacy as any).themes)
      ? (legacy as any).themes.filter((key: unknown): key is string => typeof key === 'string')
      : [],
    data: Array.isArray((legacy as any).data)
      ? (legacy as any).data.filter((key: unknown): key is string => typeof key === 'string')
      : [],
    templates: Array.isArray((legacy as any).templates)
      ? (legacy as any).templates.filter((key: unknown): key is string => typeof key === 'string')
      : [],
  };
}

function writeStoreAtomic(storePath: string, store: SidebarTreeStore): void {
  const dir = path.dirname(storePath);
  fs.mkdirSync(dir, { recursive: true });

  const tempPath = `${storePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tempPath, storePath);
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

function resolveOptions(projectRoot: string, options?: Partial<SidebarTreeStoreOptions>): SidebarTreeStoreOptions {
  return {
    version: options?.version ?? 1,
    legacyEntriesPath: options?.legacyEntriesPath ?? path.join(projectRoot, ENTRIES_MANIFEST_RELATIVE_PATH),
    storePath: options?.storePath ?? path.join(projectRoot, SIDEBAR_TREE_STORE_RELATIVE_PATH),
  };
}

export function createSidebarTreeStore(projectRoot: string, options?: Partial<SidebarTreeStoreOptions>) {
  const resolved = resolveOptions(projectRoot, options);

  const ensureStore = (): SidebarTreeStore => {
    const loaded = normalizeStore(readJsonFile(resolved.storePath), resolved.version);
    if (loaded) {
      return loaded;
    }

    const migrated = readLegacySidebarTree(resolved.legacyEntriesPath, resolved.version);
    const nextStore = migrated || createDefaultStore(resolved.version);
    writeStoreAtomic(resolved.storePath, nextStore);
    return nextStore;
  };

  const saveStore = (store: SidebarTreeStore) => {
    const nextStore: SidebarTreeStore = {
      version: resolved.version,
      updatedAt: new Date().toISOString(),
      prototypes: cloneTree(store.prototypes),
      components: cloneTree(store.components),
      docs: cloneTree(store.docs),
      canvas: cloneTree(store.canvas),
      themes: Array.isArray(store.themes) ? [...store.themes] : [],
      data: Array.isArray(store.data) ? [...store.data] : [],
      templates: Array.isArray(store.templates) ? [...store.templates] : [],
    };
    writeStoreAtomic(resolved.storePath, nextStore);
    return nextStore;
  };

  return {
    getStorePath() {
      return resolved.storePath;
    },
    getStore() {
      return ensureStore();
    },
    getTree(tab: SidebarTreeTab) {
      const store = ensureStore();
      return cloneTree(store[tab]);
    },
    setTree(tab: SidebarTreeTab, tree: SidebarTreeNode[]) {
      const store = ensureStore();
      const nextStore: SidebarTreeStore = {
        ...store,
        [tab]: cloneTree(tree),
      };
      return saveStore(nextStore);
    },
    getResourceOrder(type: ResourceOrderType) {
      const store = ensureStore();
      return Array.isArray(store[type]) ? [...store[type]] : [];
    },
    setResourceOrder(type: ResourceOrderType, order: string[]) {
      const store = ensureStore();
      const nextStore: SidebarTreeStore = {
        ...store,
        [type]: Array.isArray(order) ? [...order] : [],
      };
      return saveStore(nextStore);
    },
  };
}
