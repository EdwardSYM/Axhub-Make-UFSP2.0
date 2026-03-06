import {
  getEntriesPath as getEntriesPathCore,
  migrateLegacyEntries as migrateLegacyEntriesCore,
  readEntriesManifest as readEntriesManifestCore,
  scanProjectEntries as scanProjectEntriesCore,
  toCompatMaps as toCompatMapsCore,
  writeEntriesManifestAtomic as writeEntriesManifestAtomicCore,
} from './entriesManifestCore.js';

export type EntryGroup = 'components' | 'prototypes' | 'themes';

export interface EntriesManifestItem {
  group: string;
  name: string;
  js: string;
  html: string;
}

export interface EntriesManifestV2 {
  schemaVersion: 2;
  generatedAt: string;
  items: Record<string, EntriesManifestItem>;
  js: Record<string, string>;
  html: Record<string, string>;
}

export function toCompatMaps(items: Record<string, EntriesManifestItem>): {
  js: Record<string, string>;
  html: Record<string, string>;
} {
  return toCompatMapsCore(items);
}

export function scanProjectEntries(
  projectRoot: string,
  groups: EntryGroup[] = ['components', 'prototypes', 'themes'],
): EntriesManifestV2 {
  return scanProjectEntriesCore(projectRoot, groups);
}

export function migrateLegacyEntries(raw: unknown, projectRoot: string): EntriesManifestV2 {
  return migrateLegacyEntriesCore(raw, projectRoot);
}

export function writeEntriesManifestAtomic(projectRoot: string, manifest: EntriesManifestV2): EntriesManifestV2 {
  return writeEntriesManifestAtomicCore(projectRoot, manifest);
}

export function readEntriesManifest(projectRoot: string): EntriesManifestV2 {
  return readEntriesManifestCore(projectRoot);
}

export function getEntriesPath(projectRoot: string): string {
  return getEntriesPathCore(projectRoot);
}
