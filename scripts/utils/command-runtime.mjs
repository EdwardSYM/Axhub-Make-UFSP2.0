import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import iconv from 'iconv-lite';

const WINDOWS_CODEPAGE_TIMEOUT_MS = 1200;
let cachedWindowsCodePage = null;

function getPlatform(overridePlatform) {
  return overridePlatform || process.platform;
}

function quoteForCmdExec(value) {
  if (!value) return '""';
  if (!/[\s"&^|<>]/.test(value)) return value;
  const escaped = String(value)
    .replace(/(\\*)"/g, '$1$1\\"')
    .replace(/(\\+)$/g, '$1$1');
  return `"${escaped}"`;
}

function buildWindowsCommandLine(command, args) {
  return [command, ...args].map((part) => quoteForCmdExec(String(part))).join(' ');
}

function getEnvValue(env, key) {
  if (!env) return undefined;

  const direct = env[key];
  if (typeof direct === 'string' && direct.length > 0) {
    return direct;
  }

  const matchedKey = Object.keys(env).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
  if (!matchedKey) return undefined;

  const value = env[matchedKey];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getWindowsPathExtList(env) {
  const pathExt = getEnvValue(env, 'PATHEXT') || '.COM;.EXE;.BAT;.CMD';
  return pathExt
    .split(';')
    .map((ext) => ext.trim())
    .filter(Boolean)
    .map((ext) => (ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`));
}

function resolveWindowsCommand(command, env) {
  if (!command || typeof command !== 'string') return command;

  const trimmed = command.trim();
  if (!trimmed) return trimmed;

  const hasPathSeparator = /[\\/]/.test(trimmed);
  const ext = path.extname(trimmed);
  const pathExts = ext ? [''] : getWindowsPathExtList(env);

  const candidateDirs = hasPathSeparator
    ? ['']
    : (getEnvValue(env, 'PATH') || '')
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean);

  const baseCandidates = hasPathSeparator ? [trimmed] : candidateDirs.map((dir) => path.join(dir, trimmed));

  for (const baseCandidate of baseCandidates) {
    const suffixes = ext ? [''] : pathExts;
    for (const suffix of suffixes) {
      const fullPath = suffix ? `${baseCandidate}${suffix}` : baseCandidate;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return trimmed;
}

function shouldUseWindowsCmdWrapper(platform, command) {
  if (platform !== 'win32') return false;
  return /\.(cmd|bat)$/i.test(command) || !/\.(exe|com)$/i.test(command);
}

function getSpawnSpec(command, args, platform = process.platform, env = process.env) {
  const resolvedCommand = platform === 'win32' ? resolveWindowsCommand(command, env) : command;

  if (!shouldUseWindowsCmdWrapper(platform, resolvedCommand)) {
    return {
      command: resolvedCommand,
      args,
      windowsHide: platform === 'win32',
    };
  }

  const commandLine = buildWindowsCommandLine(resolvedCommand, args);
  return {
    command: 'cmd.exe',
    args: ['/d', '/s', '/c', commandLine],
    windowsHide: true,
  };
}

function mapCodePageToEncoding(codePage) {
  if (codePage === 65001) return 'utf8';
  if (codePage === 936) return 'gbk';
  if (codePage === 54936) return 'gb18030';
  return 'gb18030';
}

function parseWindowsCodePage(text) {
  if (!text) return null;
  const match = String(text).match(/(\d{3,5})/);
  if (!match) return null;
  const codePage = Number(match[1]);
  return Number.isFinite(codePage) ? codePage : null;
}

function readWindowsCodePageSync() {
  if (cachedWindowsCodePage !== null) {
    return cachedWindowsCodePage;
  }

  try {
    const result = spawnSync('cmd.exe', ['/d', '/s', '/c', 'chcp'], {
      windowsHide: true,
      encoding: 'utf8',
      timeout: WINDOWS_CODEPAGE_TIMEOUT_MS,
    });

    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    cachedWindowsCodePage = parseWindowsCodePage(output);
  } catch {
    cachedWindowsCodePage = null;
  }

  return cachedWindowsCodePage;
}

function toBuffer(value) {
  if (!value) return Buffer.alloc(0);
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === 'string') return Buffer.from(value);
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from(String(value));
}

export function decodeOutput(value, options = {}) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;

  const platform = getPlatform(options.platform);
  const buffer = toBuffer(value);
  if (buffer.length === 0) return '';

  try {
    const strictUtf8 = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return strictUtf8;
  } catch {
    // Fall through to platform fallback decoder.
  }

  if (platform === 'win32') {
    const activeCodePage = readWindowsCodePageSync();
    const preferredEncoding = mapCodePageToEncoding(activeCodePage);

    try {
      return iconv.decode(buffer, preferredEncoding);
    } catch {
      // Fall through to generic fallback.
    }

    try {
      return iconv.decode(buffer, 'gb18030');
    } catch {
      // Fall through to latin1 fallback.
    }
  }

  try {
    return buffer.toString('utf8');
  } catch {
    return buffer.toString('latin1');
  }
}

export function runCommandSync(options) {
  const {
    command,
    args = [],
    cwd,
    env,
    timeoutMs,
    maxBuffer,
  } = options;

  const platform = process.platform;
  const mergedEnv = env ? { ...process.env, ...env } : process.env;
  const spawnSpec = getSpawnSpec(command, args, platform, mergedEnv);
  const result = spawnSync(spawnSpec.command, spawnSpec.args, {
    cwd,
    env: mergedEnv,
    timeout: timeoutMs,
    maxBuffer,
    windowsHide: spawnSpec.windowsHide,
    encoding: null,
  });

  const stdoutBuffer = toBuffer(result.stdout);
  const stderrBuffer = toBuffer(result.stderr);

  return {
    command,
    args,
    spawnCommand: spawnSpec.command,
    spawnArgs: spawnSpec.args,
    status: typeof result.status === 'number' ? result.status : null,
    signal: result.signal || null,
    error: result.error || null,
    stdoutBuffer,
    stderrBuffer,
    stdout: decodeOutput(stdoutBuffer, { platform }),
    stderr: decodeOutput(stderrBuffer, { platform }),
  };
}

export function runCommand(options) {
  const {
    command,
    args = [],
    cwd,
    env,
    timeoutMs,
    detached = false,
    capture = true,
    stdio,
  } = options;

  return new Promise((resolve, reject) => {
    const platform = process.platform;
    const mergedEnv = env ? { ...process.env, ...env } : process.env;
    const spawnSpec = getSpawnSpec(command, args, platform, mergedEnv);

    const child = spawn(spawnSpec.command, spawnSpec.args, {
      cwd,
      env: mergedEnv,
      detached,
      stdio: stdio || (capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'),
      windowsHide: spawnSpec.windowsHide,
    });

    const stdoutChunks = [];
    const stderrChunks = [];

    if (capture && child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdoutChunks.push(toBuffer(chunk));
      });
    }

    if (capture && child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderrChunks.push(toBuffer(chunk));
      });
    }

    let timeoutId = null;
    if (typeof timeoutMs === 'number' && timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
      }, timeoutMs);
    }

    child.once('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    });

    child.once('close', (code, signal) => {
      if (timeoutId) clearTimeout(timeoutId);

      const stdoutBuffer = Buffer.concat(stdoutChunks);
      const stderrBuffer = Buffer.concat(stderrChunks);

      resolve({
        command,
        args,
        spawnCommand: spawnSpec.command,
        spawnArgs: spawnSpec.args,
        code: typeof code === 'number' ? code : null,
        signal: signal || null,
        stdoutBuffer,
        stderrBuffer,
        stdout: decodeOutput(stdoutBuffer, { platform }),
        stderr: decodeOutput(stderrBuffer, { platform }),
      });
    });
  });
}

export function commandExists(command) {
  if (!command || typeof command !== 'string') {
    return false;
  }

  const checker = process.platform === 'win32' ? 'where' : 'which';
  const result = runCommandSync({
    command: checker,
    args: [command],
    timeoutMs: 2000,
  });

  return result.status === 0;
}

export function getPreferredNpmCommand() {
  if (process.platform !== 'win32') {
    return 'npm';
  }

  return commandExists('npm.cmd') ? 'npm.cmd' : 'npm';
}

export function getPreferredNpxCommand() {
  if (process.platform !== 'win32') {
    return 'npx';
  }

  return commandExists('npx.cmd') ? 'npx.cmd' : 'npx';
}

export function getSpawnCommandSpec(command, args = [], platform = process.platform) {
  return getSpawnSpec(command, args, platform);
}

export function __resetWindowsCodePageCacheForTests() {
  cachedWindowsCodePage = null;
}
