import path from 'path';
import { fileURLToPath } from 'url';
import { scanProjectEntries, writeEntriesManifestAtomic } from '../vite-plugins/utils/entriesManifestCore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const manifest = scanProjectEntries(projectRoot, ['components', 'prototypes', 'themes']);
const written = writeEntriesManifestAtomic(projectRoot, manifest);

console.log(
  'Generated entries.json (schema v2) with',
  Object.keys(written.js || {}).length,
  'js entries and',
  Object.keys(written.html || {}).length,
  'html entries (using unified template)',
);
