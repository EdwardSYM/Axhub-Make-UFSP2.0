import fs from 'fs';
import path from 'path';
import { getDisplayName } from './fileUtils';
import { migrateLegacyEntries, toCompatMaps } from './entriesManifest';

export type SidebarTreeTab = 'prototypes' | 'components' | 'docs' | 'canvas';
type ScannableGroup = 'components' | 'prototypes' | 'themes';

export interface ScannedEntryItem {
  name: string;
  displayName: string;
  demoUrl: string;
  specUrl: string;
  jsUrl: string;
  isReference: boolean;
  filePath: string;
}

export interface EntriesFileData extends Record<string, unknown> {
  schemaVersion?: number;
  generatedAt?: string;
  items?: Record<string, {
    group?: string;
    name?: string;
    js?: string;
    html?: string;
  }>;
  js?: Record<string, string>;
  html?: Record<string, string>;
}

export interface EntryScanResult {
  entries: {
    js: Record<string, string>;
    html: Record<string, string>;
  };
  items: Record<SidebarTreeTab, ScannedEntryItem[]>;
}

const MANIFEST_SCANNED_GROUPS: ScannableGroup[] = ['components', 'prototypes', 'themes'];

function isScannedGroupKey(key: string): boolean {
  return MANIFEST_SCANNED_GROUPS.some((group) => key.startsWith(`${group}/`));
}

function scanGroup(projectRoot: string, group: ScannableGroup): {
  entries: { js: Record<string, string>; html: Record<string, string> };
  items: ScannedEntryItem[];
} {
  const groupDir = path.resolve(projectRoot, 'src', group);
  const entries = { js: {} as Record<string, string>, html: {} as Record<string, string> };
  const items: ScannedEntryItem[] = [];

  if (!fs.existsSync(groupDir)) {
    return { entries, items };
  }

  const names = fs
    .readdirSync(groupDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const name of names) {
    const folderPath = path.join(groupDir, name);
    const jsEntry = path.join(folderPath, 'index.tsx');
    if (!fs.existsSync(jsEntry)) {
      continue;
    }

    const key = `${group}/${name}`;
    entries.js[key] = jsEntry;
    entries.html[key] = path.join(folderPath, 'index.html');

    const displayName = getDisplayName(jsEntry) || name;
    const isReference = name.startsWith('ref-');
    items.push({
      name,
      displayName,
      demoUrl: `/${key}`,
      specUrl: `/${key}/spec`,
      jsUrl: `/build/${key}.js`,
      isReference,
      filePath: jsEntry,
    });
  }

  return { entries, items };
}

export function scanEntries(projectRoot: string): EntryScanResult {
  const result: EntryScanResult = {
    entries: { js: {}, html: {} },
    items: {
      components: [],
      prototypes: [],
      docs: [],
      canvas: [],
    },
  };

  for (const group of MANIFEST_SCANNED_GROUPS) {
    const scanned = scanGroup(projectRoot, group);
    Object.assign(result.entries.js, scanned.entries.js);
    Object.assign(result.entries.html, scanned.entries.html);
    if (group === 'components' || group === 'prototypes') {
      result.items[group] = scanned.items;
    }
  }

  return result;
}

export function allowedItemKeysByTab(
  scannedEntries: Record<string, string>,
  tab: SidebarTreeTab,
): Set<string> {
  return new Set(
    Object.keys(scannedEntries)
      .filter((key) => key.startsWith(`${tab}/`))
      .sort((a, b) => a.localeCompare(b)),
  );
}

export function mergeScannedEntries(existing: EntriesFileData, scanned: EntryScanResult['entries']): EntriesFileData {
  const migrated = migrateLegacyEntries(existing, process.cwd());
  const nextItems = { ...(migrated.items || {}) };

  for (const key of Object.keys(nextItems)) {
    if (isScannedGroupKey(key) && !Object.prototype.hasOwnProperty.call(scanned.js, key)) {
      delete nextItems[key];
    }
  }

  for (const [key, jsPath] of Object.entries(scanned.js || {})) {
    const [group, ...nameParts] = key.split('/');
    const name = nameParts.join('/');
    if (!group || !name) continue;
    nextItems[key] = {
      group,
      name,
      js: jsPath,
      html: scanned.html?.[key] || `src/${group}/${name}/index.html`,
    };
  }

  const sortedItems = Object.keys(nextItems)
    .sort((a, b) => a.localeCompare(b))
    .reduce<Record<string, {
      group?: string;
      name?: string;
      js?: string;
      html?: string;
    }>>((acc, key) => {
      acc[key] = nextItems[key];
      return acc;
    }, {});

  const compat = toCompatMaps(sortedItems);
  const nextEntries: EntriesFileData = {
    ...existing,
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    items: sortedItems,
    js: compat.js,
    html: compat.html,
  };

  delete (nextEntries as { sidebarTree?: unknown }).sidebarTree;
  return nextEntries;
}
