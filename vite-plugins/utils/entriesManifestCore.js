import fs from 'fs';
import path from 'path';

const DEFAULT_GROUPS = ['components', 'prototypes', 'themes'];
const SCHEMA_VERSION = 2;
const ENTRIES_RELATIVE_PATH = path.join('.axhub', 'make', 'entries.json');

function toPosixPath(input) {
  return String(input || '').split(path.sep).join('/');
}

function normalizeRelativePath(projectRoot, filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return '';
  }

  const absoluteCandidate = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(projectRoot, filePath);
  const relative = path.relative(projectRoot, absoluteCandidate);

  if (!relative || relative.startsWith('..')) {
    return toPosixPath(filePath).replace(/^\.?\//, '');
  }

  return toPosixPath(relative).replace(/^\.?\//, '');
}

function sortRecordByKey(record) {
  const next = {};
  Object.keys(record || {})
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      next[key] = record[key];
    });
  return next;
}

function normalizeItemKey(key) {
  const normalized = String(key || '').trim().replace(/\\/g, '/');
  if (!normalized || !normalized.includes('/')) return '';
  return normalized.replace(/^\/+/, '');
}

function parseKey(key) {
  const normalized = normalizeItemKey(key);
  if (!normalized) return null;
  const [group, ...nameParts] = normalized.split('/');
  const name = nameParts.join('/');
  if (!group || !name) return null;
  return { group, name };
}

function sanitizeItem(item, projectRoot, fallbackKey) {
  const keyInfo = parseKey(fallbackKey);
  if (!keyInfo) return null;

  const group = String(item?.group || keyInfo.group).trim();
  const name = String(item?.name || keyInfo.name).trim();
  if (!group || !name) return null;

  const key = `${group}/${name}`;
  const js = normalizeRelativePath(
    projectRoot,
    item?.js || `src/${group}/${name}/index.tsx`,
  );
  const html = normalizeRelativePath(
    projectRoot,
    item?.html || `src/${group}/${name}/index.html`,
  );

  return {
    key,
    item: {
      group,
      name,
      js,
      html,
    },
  };
}

function buildManifestFromItems(items, generatedAt) {
  const compat = toCompatMaps(items);
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: generatedAt || new Date().toISOString(),
    items,
    js: compat.js,
    html: compat.html,
  };
}

function normalizeManifest(raw, projectRoot, generatedAt) {
  const nextItems = {};
  const sourceItems =
    raw && typeof raw === 'object' && raw.items && typeof raw.items === 'object'
      ? raw.items
      : {};

  Object.keys(sourceItems)
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      const sanitized = sanitizeItem(sourceItems[key], projectRoot, key);
      if (sanitized) {
        nextItems[sanitized.key] = sanitized.item;
      }
    });

  return buildManifestFromItems(nextItems, generatedAt);
}

export function toCompatMaps(items) {
  const js = {};
  const html = {};
  Object.keys(items || {})
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      const item = items[key];
      if (!item || typeof item !== 'object') return;
      const jsPath = typeof item.js === 'string' ? item.js.trim() : '';
      const htmlPath = typeof item.html === 'string' ? item.html.trim() : '';
      if (jsPath) {
        js[key] = jsPath;
      }
      if (htmlPath) {
        html[key] = htmlPath;
      }
    });

  return {
    js: sortRecordByKey(js),
    html: sortRecordByKey(html),
  };
}

export function scanProjectEntries(projectRoot, groups = DEFAULT_GROUPS) {
  const root = path.resolve(projectRoot, 'src');
  const items = {};

  for (const group of groups) {
    const groupDir = path.join(root, group);
    if (!fs.existsSync(groupDir)) continue;

    const names = fs
      .readdirSync(groupDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    for (const name of names) {
      const jsEntry = path.join(groupDir, name, 'index.tsx');
      if (!fs.existsSync(jsEntry)) continue;
      const key = `${group}/${name}`;
      items[key] = {
        group,
        name,
        js: toPosixPath(path.relative(projectRoot, jsEntry)),
        html: toPosixPath(path.relative(projectRoot, path.join(groupDir, name, 'index.html'))),
      };
    }
  }

  return buildManifestFromItems(sortRecordByKey(items));
}

export function migrateLegacyEntries(raw, projectRoot) {
  if (raw && typeof raw === 'object' && raw.schemaVersion === SCHEMA_VERSION && raw.items) {
    return normalizeManifest(raw, projectRoot, raw.generatedAt);
  }

  const legacyJs =
    raw && typeof raw === 'object' && raw.js && typeof raw.js === 'object'
      ? raw.js
      : {};
  const legacyHtml =
    raw && typeof raw === 'object' && raw.html && typeof raw.html === 'object'
      ? raw.html
      : {};

  const keys = new Set([
    ...Object.keys(legacyJs),
    ...Object.keys(legacyHtml),
  ]);

  const items = {};
  Array.from(keys)
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      const parsed = parseKey(key);
      if (!parsed) return;
      const js = normalizeRelativePath(
        projectRoot,
        legacyJs[key] || `src/${parsed.group}/${parsed.name}/index.tsx`,
      );
      const html = normalizeRelativePath(
        projectRoot,
        legacyHtml[key] || `src/${parsed.group}/${parsed.name}/index.html`,
      );
      items[key] = {
        group: parsed.group,
        name: parsed.name,
        js,
        html,
      };
    });

  return buildManifestFromItems(items);
}

export function writeEntriesManifestAtomic(projectRoot, manifest) {
  const entriesPath = getEntriesPath(projectRoot);
  const normalized = normalizeManifest(manifest, projectRoot, manifest?.generatedAt);
  const tempPath = `${entriesPath}.tmp-${process.pid}-${Date.now()}`;
  fs.mkdirSync(path.dirname(entriesPath), { recursive: true });

  fs.writeFileSync(tempPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, entriesPath);
  return normalized;
}

export function readEntriesManifest(projectRoot) {
  const entriesPath = getEntriesPath(projectRoot);
  if (!fs.existsSync(entriesPath)) {
    const scanned = scanProjectEntries(projectRoot, DEFAULT_GROUPS);
    return writeEntriesManifestAtomic(projectRoot, scanned);
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
  } catch {
    raw = {};
  }

  const migrated = migrateLegacyEntries(raw, projectRoot);
  const rawString = JSON.stringify(raw);
  const nextString = JSON.stringify(migrated);
  if (rawString !== nextString) {
    return writeEntriesManifestAtomic(projectRoot, migrated);
  }
  return migrated;
}

export function getEntriesPath(projectRoot) {
  return path.resolve(projectRoot, ENTRIES_RELATIVE_PATH);
}
