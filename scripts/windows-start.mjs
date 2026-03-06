#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  commandExists,
  getPreferredNpmCommand,
  runCommand,
} from './utils/command-runtime.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const npmRegistry = 'https://registry.npmmirror.com';
const npmCacheDir = path.join(projectRoot, '.npm-cache');

function print(message) {
  process.stdout.write(`${message}\n`);
}

function printError(message) {
  process.stderr.write(`${message}\n`);
}

async function runStep(command, args, options = {}) {
  const result = await runCommand({
    command,
    args,
    cwd: projectRoot,
    capture: false,
    stdio: 'inherit',
    ...options,
  });
  return result.code === 0;
}

async function main() {
  process.chdir(projectRoot);

  print('[1/3] Checking Node.js, npm, Git...');

  const npmCommand = getPreferredNpmCommand();
  if (!commandExists(npmCommand)) {
    printError('npm is not found in PATH. Reinstall Node.js LTS and retry.');
    return 1;
  }

  if (!commandExists('git')) {
    print('[Hint] Git is missing. Continue install/start without Git.');
  }

  let needInstall = !fs.existsSync(path.join(projectRoot, 'node_modules'));

  if (!needInstall) {
    const check = await runCommand({
      command: npmCommand,
      args: ['ls', '--depth=0'],
      cwd: projectRoot,
      capture: true,
      timeoutMs: 60_000,
    });
    needInstall = check.code !== 0;
  }

  if (needInstall) {
    print(`[2/3] Installing dependencies (npm --cache ./.npm-cache --registry ${npmRegistry} install)...`);
    print('[Hint] First install can take a few minutes.');
    fs.mkdirSync(npmCacheDir, { recursive: true });
    const installed = await runStep(npmCommand, ['--cache', npmCacheDir, '--registry', npmRegistry, 'install']);
    if (!installed) {
      printError('npm install failed. Please copy the log and send it to AI for next command.');
      return 1;
    }
  } else {
    print('[2/3] Dependencies already installed. Skip npm install.');
  }

  print('[3/3] Starting dev server (npm run dev)...');
  const started = await runStep(npmCommand, ['run', 'dev']);
  if (!started) {
    printError('npm run dev failed. Please copy the log and send it to AI for next command.');
    return 1;
  }

  return 0;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    printError(`Start failed: ${error?.message || 'unknown error'}`);
    process.exit(1);
  });
