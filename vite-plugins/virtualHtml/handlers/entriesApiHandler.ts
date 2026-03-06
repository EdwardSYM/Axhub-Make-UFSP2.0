import type { IncomingMessage, ServerResponse } from 'http';
import { mergeScannedEntries, scanEntries } from '../../utils/entryScanner';
import { readEntriesManifest, writeEntriesManifestAtomic } from '../../utils/entriesManifest';

export function handleEntriesApi(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.url !== '/api/entries.json') {
    return false;
  }

  try {
    console.log('\n🔍 实时扫描入口文件...');

    const projectRoot = process.cwd();
    const scanned = scanEntries(projectRoot);
    const existingEntries = readEntriesManifest(projectRoot);
    const nextEntries = mergeScannedEntries(existingEntries, scanned.entries);
    writeEntriesManifestAtomic(projectRoot, nextEntries as any);

    console.log(`✅ 扫描完成，发现 ${Object.keys(scanned.entries.js).length} 个入口`);

    const result = {
      components: scanned.items.components,
      prototypes: scanned.items.prototypes,
    };

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(result, null, 2));
    return true;
  } catch (err) {
    console.error('生成 entries.json API 失败:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
    return true;
  }
}
