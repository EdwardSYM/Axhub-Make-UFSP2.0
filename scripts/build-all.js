import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanProjectEntries, writeEntriesManifestAtomic } from '../vite-plugins/utils/entriesManifestCore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceRoot = path.resolve(__dirname, '..');
const entriesPath = path.resolve(workspaceRoot, '.axhub/make/entries.json');

// Always rescan before build to keep entries manifest fresh and deterministic.
const scanned = scanProjectEntries(workspaceRoot, ['components', 'prototypes', 'themes']);
const entries = writeEntriesManifestAtomic(workspaceRoot, scanned);
if (!fs.existsSync(entriesPath)) {
  console.error('.axhub/make/entries.json 写入失败，无法继续构建。');
  process.exit(1);
}

const jsEntries = entries.js || {};
const entryKeys = Object.keys(jsEntries);

if (entryKeys.length === 0) {
  console.log('未发现 JS 入口，跳过构建。');
  process.exit(0);
}

const distDir = path.resolve(workspaceRoot, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

for (const key of entryKeys) {
  console.log(`\n==== 构建入口: ${key} ====\n`);
  const result = spawnSync('npx', ['vite', 'build'], {
    cwd: workspaceRoot,
    env: { ...process.env, ENTRY_KEY: key },
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    console.error(`构建 ${key} 失败，退出码 ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n所有入口构建完成 ✅');
