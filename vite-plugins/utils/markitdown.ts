import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';

export const DOC_IMPORT_MAX_FILE_SIZE = 30 * 1024 * 1024;
export const DOC_IMPORT_MAX_FILE_COUNT = 30;
export const DOC_IMPORT_MAX_TOTAL_SIZE = 150 * 1024 * 1024;

export const DOC_IMPORT_SUPPORTED_EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.pdf',
  '.docx',
  '.pptx',
  '.xlsx',
  '.csv',
  '.json',
  '.html',
  '.xml',
]);

type MarkitdownCommandCandidate = {
  command: string;
  args: string[];
  commandSource: string;
};

type PythonRuntimeProbe = {
  command: string;
  available: boolean;
  versionText: string;
  major: number;
  minor: number;
  meetsRequirement: boolean;
};

export type MarkitdownResolvedCommand = {
  installed: boolean;
  command?: string;
  args?: string[];
  pythonCommand?: string;
  commandSource: string;
  version: string;
  installHints: string[];
  error: string;
};

type MarkitdownOptionalFeature = {
  extension: string;
  feature: string;
  modules: string[];
};

const MARKITDOWN_MIN_PYTHON_MAJOR = 3;
const MARKITDOWN_MIN_PYTHON_MINOR = 10;

const MARKITDOWN_DIRECT_COMMAND_CANDIDATE: MarkitdownCommandCandidate = {
  command: 'markitdown',
  args: [],
  commandSource: 'markitdown',
};

const MARKITDOWN_PYTHON_COMMAND_CANDIDATES = [
  'python3.12',
  'python3.11',
  'python3.10',
  'python3',
  'python',
];

const MARKITDOWN_REQUIRED_OPTIONAL_FEATURES: MarkitdownOptionalFeature[] = [
  { extension: '.pdf', feature: 'pdf', modules: ['pdfminer', 'pdfplumber'] },
  { extension: '.docx', feature: 'docx', modules: ['mammoth'] },
  { extension: '.pptx', feature: 'pptx', modules: ['pptx'] },
  { extension: '.xlsx', feature: 'xlsx', modules: ['pandas', 'openpyxl'] },
];

function parsePythonVersionText(versionText: string): { major: number; minor: number } | null {
  const match = versionText.match(/Python\s+(\d+)\.(\d+)/i);
  if (!match) return null;
  return {
    major: Number(match[1] || 0),
    minor: Number(match[2] || 0),
  };
}

function isPythonVersionSupported(major: number, minor: number): boolean {
  if (major > MARKITDOWN_MIN_PYTHON_MAJOR) return true;
  if (major < MARKITDOWN_MIN_PYTHON_MAJOR) return false;
  return minor >= MARKITDOWN_MIN_PYTHON_MINOR;
}

function probePythonRuntime(command: string): PythonRuntimeProbe {
  const versionAttempt = spawnSync(command, ['--version'], {
    encoding: 'utf8',
    timeout: 8000,
    maxBuffer: 1024 * 1024,
  });
  if (versionAttempt.error || versionAttempt.status !== 0) {
    return {
      command,
      available: false,
      versionText: '',
      major: 0,
      minor: 0,
      meetsRequirement: false,
    };
  }

  const versionText = String(versionAttempt.stdout || versionAttempt.stderr || '').trim();
  const parsedVersion = parsePythonVersionText(versionText);
  const major = parsedVersion?.major || 0;
  const minor = parsedVersion?.minor || 0;
  return {
    command,
    available: true,
    versionText,
    major,
    minor,
    meetsRequirement: isPythonVersionSupported(major, minor),
  };
}

function buildMarkitdownInstallHints(preferredPythonCommand?: string): string[] {
  const installCommand = `${preferredPythonCommand || 'python3.11'} -m pip install -U 'markitdown[pdf,docx,pptx,xlsx]'`;
  if (preferredPythonCommand) {
    return [installCommand];
  }

  return [
    'brew install python@3.11',
    installCommand,
  ];
}

function isCommandWorking(candidate: MarkitdownCommandCandidate): {
  success: boolean;
  version: string;
  details: string;
} {
  const versionAttempt = spawnSync(
    candidate.command,
    [...candidate.args, '--version'],
    { encoding: 'utf8', timeout: 8000, maxBuffer: 1024 * 1024 },
  );
  const versionOutput = String(versionAttempt.stdout || versionAttempt.stderr || '').trim();
  if (!versionAttempt.error && versionAttempt.status === 0) {
    return {
      success: true,
      version: versionOutput || 'unknown',
      details: '',
    };
  }

  const helpAttempt = spawnSync(
    candidate.command,
    [...candidate.args, '--help'],
    { encoding: 'utf8', timeout: 8000, maxBuffer: 1024 * 1024 },
  );
  const helpOutput = String(helpAttempt.stdout || helpAttempt.stderr || '').trim();
  if (!helpAttempt.error && helpAttempt.status === 0) {
    return {
      success: true,
      version: versionOutput || 'available',
      details: '',
    };
  }

  return {
    success: false,
    version: '',
    details: [versionOutput, helpOutput].filter(Boolean).join('\n'),
  };
}

function resolveMarkitdownPythonCommand(candidate: MarkitdownCommandCandidate): string | undefined {
  if (candidate.args[0] === '-m' && candidate.args[1] === 'markitdown') {
    return candidate.command;
  }

  const whichAttempt = spawnSync('which', [candidate.command], {
    encoding: 'utf8',
    timeout: 8000,
    maxBuffer: 1024 * 1024,
  });
  if (whichAttempt.error || whichAttempt.status !== 0) {
    return undefined;
  }

  const executablePath = String(whichAttempt.stdout || '').trim().split(/\r?\n/)[0]?.trim();
  if (!executablePath || !fs.existsSync(executablePath)) {
    return undefined;
  }

  try {
    const firstLine = fs.readFileSync(executablePath, 'utf8').split(/\r?\n/, 1)[0]?.trim() || '';
    if (!firstLine.startsWith('#!')) {
      return undefined;
    }

    const shebang = firstLine.slice(2).trim();
    if (!shebang) {
      return undefined;
    }

    const shebangParts = shebang.split(/\s+/).filter(Boolean);
    if (shebangParts[0] === '/usr/bin/env') {
      return shebangParts[1];
    }

    return shebangParts[0];
  } catch {
    return undefined;
  }
}

function probeMarkitdownOptionalDependencies(pythonCommand?: string): {
  ready: boolean;
  missingExtensions: string[];
  error: string;
  installHints: string[];
} {
  if (!pythonCommand) {
    return {
      ready: true,
      missingExtensions: [],
      error: '',
      installHints: [],
    };
  }

  const checksJson = JSON.stringify(MARKITDOWN_REQUIRED_OPTIONAL_FEATURES);
  const probeScript = [
    'import importlib.util, json',
    `checks = json.loads(${JSON.stringify(checksJson)})`,
    'missing = []',
    'for item in checks:',
    "    missing_modules = [name for name in item['modules'] if importlib.util.find_spec(name) is None]",
    '    if missing_modules:',
    "        missing.append({'extension': item['extension'], 'feature': item['feature'], 'missingModules': missing_modules})",
    "print(json.dumps({'missing': missing}, ensure_ascii=False))",
  ].join('\n');

  const probeAttempt = spawnSync(pythonCommand, ['-c', probeScript], {
    encoding: 'utf8',
    timeout: 8000,
    maxBuffer: 1024 * 1024,
  });

  if (probeAttempt.error || probeAttempt.status !== 0) {
    return {
      ready: false,
      missingExtensions: [],
      error: `markitdown 依赖检测失败，请执行 ${buildMarkitdownInstallHints(pythonCommand)[0]} 后重试。`,
      installHints: buildMarkitdownInstallHints(pythonCommand),
    };
  }

  try {
    const payload = JSON.parse(String(probeAttempt.stdout || '{}')) as {
      missing?: Array<{ extension?: string; missingModules?: string[] }>;
    };
    const missing = Array.isArray(payload?.missing) ? payload.missing : [];
    if (missing.length === 0) {
      return {
        ready: true,
        missingExtensions: [],
        error: '',
        installHints: [],
      };
    }

    const missingDescriptions = missing.map((item) => {
      const extension = String(item?.extension || '').trim() || 'unknown';
      const missingModules = Array.isArray(item?.missingModules) ? item.missingModules.filter(Boolean) : [];
      return `${extension}${missingModules.length > 0 ? `（缺少：${missingModules.join(', ')}）` : ''}`;
    });

    return {
      ready: false,
      missingExtensions: missing.map((item) => String(item?.extension || '').trim()).filter(Boolean),
      error: `markitdown 已安装，但以下格式依赖不完整：${missingDescriptions.join('、')}。请先安装完整依赖后再导入非 .md 文档。`,
      installHints: buildMarkitdownInstallHints(pythonCommand),
    };
  } catch {
    return {
      ready: false,
      missingExtensions: [],
      error: `markitdown 依赖检测结果无法解析，请执行 ${buildMarkitdownInstallHints(pythonCommand)[0]} 后重试。`,
      installHints: buildMarkitdownInstallHints(pythonCommand),
    };
  }
}

export function resolveMarkitdownCommand(): MarkitdownResolvedCommand {
  const directCommandResult = isCommandWorking(MARKITDOWN_DIRECT_COMMAND_CANDIDATE);
  if (directCommandResult.success) {
    const pythonCommand = resolveMarkitdownPythonCommand(MARKITDOWN_DIRECT_COMMAND_CANDIDATE);
    const dependencyProbe = probeMarkitdownOptionalDependencies(pythonCommand);
    return {
      installed: dependencyProbe.ready,
      command: MARKITDOWN_DIRECT_COMMAND_CANDIDATE.command,
      args: MARKITDOWN_DIRECT_COMMAND_CANDIDATE.args,
      pythonCommand,
      commandSource: MARKITDOWN_DIRECT_COMMAND_CANDIDATE.commandSource,
      version: directCommandResult.version,
      installHints: dependencyProbe.installHints,
      error: dependencyProbe.error,
    };
  }

  const pythonRuntimeProbes = MARKITDOWN_PYTHON_COMMAND_CANDIDATES
    .map((command) => probePythonRuntime(command))
    .filter((probe, index, allProbes) => allProbes.findIndex((item) => item.command === probe.command) === index);
  const supportedPythonRuntimes = pythonRuntimeProbes.filter((probe) => probe.available && probe.meetsRequirement);
  const preferredPythonCommand = supportedPythonRuntimes[0]?.command;

  let sawLegacyPackage = false;
  let sawModuleMissing = false;

  for (const pythonRuntime of supportedPythonRuntimes) {
    const pythonCandidate: MarkitdownCommandCandidate = {
      command: pythonRuntime.command,
      args: ['-m', 'markitdown'],
      commandSource: `${pythonRuntime.command} -m markitdown`,
    };
    const candidateResult = isCommandWorking(pythonCandidate);
    if (candidateResult.success) {
      const dependencyProbe = probeMarkitdownOptionalDependencies(pythonRuntime.command);
      return {
        installed: dependencyProbe.ready,
        command: pythonCandidate.command,
        args: pythonCandidate.args,
        pythonCommand: pythonRuntime.command,
        commandSource: pythonCandidate.commandSource,
        version: candidateResult.version,
        installHints: dependencyProbe.installHints,
        error: dependencyProbe.error,
      };
    }

    const details = candidateResult.details || '';
    if (/markitdown\.__main__|cannot be directly executed/i.test(details)) {
      sawLegacyPackage = true;
    } else if (/No module named markitdown/i.test(details)) {
      sawModuleMissing = true;
    }
  }

  if (supportedPythonRuntimes.length === 0) {
    const availableVersions = pythonRuntimeProbes
      .filter((probe) => probe.available)
      .map((probe) => `${probe.command} (${probe.versionText || 'unknown'})`)
      .join(', ');
    return {
      installed: false,
      commandSource: 'unavailable',
      version: '',
      installHints: buildMarkitdownInstallHints(),
      error: availableVersions
        ? `markitdown 需要 Python 3.10+。当前仅检测到：${availableVersions}`
        : 'markitdown 需要 Python 3.10+。当前未检测到可用的 Python 运行时。',
    };
  }

  if (sawLegacyPackage) {
    return {
      installed: false,
      commandSource: 'unavailable',
      version: '',
      installHints: buildMarkitdownInstallHints(preferredPythonCommand),
      error: '检测到旧版 markitdown（例如 0.0.1a1），该版本没有 CLI 入口。请在 Python 3.10+ 环境重新安装最新版。',
    };
  }

  if (sawModuleMissing) {
    return {
      installed: false,
      commandSource: 'unavailable',
      version: '',
      installHints: buildMarkitdownInstallHints(preferredPythonCommand),
      error: `未在 ${preferredPythonCommand || 'Python 3.10+'} 环境中检测到 markitdown，请先安装后重试。`,
    };
  }

  return {
    installed: false,
    commandSource: 'unavailable',
    version: '',
    installHints: buildMarkitdownInstallHints(preferredPythonCommand),
    error: 'markitdown 不可用，请安装后重试。',
  };
}

export function convertFileToMarkdownWithMarkitdown(params: {
  command: string;
  args: string[];
  sourcePath: string;
}): { success: true; content: string } | { success: false; error: string } {
  const tempDir = fs.mkdtempSync(path.join(tmpdir(), 'axhub-doc-import-'));
  const outputPath = path.join(tempDir, 'output.md');
  try {
    const result = spawnSync(
      params.command,
      [...params.args, '--keep-data-uris', params.sourcePath, '-o', outputPath],
      {
        encoding: 'utf8',
        timeout: 120000,
        maxBuffer: 1024 * 1024 * 20,
      },
    );

    if (result.error) {
      return {
        success: false,
        error: result.error.message || 'markitdown execution failed',
      };
    }

    if (result.status !== 0) {
      const stderr = String(result.stderr || '').trim();
      const stdout = String(result.stdout || '').trim();
      const details = stderr || stdout || `exit code ${result.status}`;
      return {
        success: false,
        error: `markitdown convert failed: ${details}`,
      };
    }

    if (!fs.existsSync(outputPath)) {
      return {
        success: false,
        error: 'markitdown did not produce output file',
      };
    }

    const content = fs.readFileSync(outputPath, 'utf8');
    return {
      success: true,
      content,
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
