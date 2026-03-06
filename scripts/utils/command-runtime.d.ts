export type DecodeOutputOptions = {
  platform?: NodeJS.Platform;
};

export type RunCommandOptions = {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  detached?: boolean;
  capture?: boolean;
  stdio?: any;
};

export type RunCommandResult = {
  command: string;
  args: string[];
  spawnCommand: string;
  spawnArgs: string[];
  code: number | null;
  signal: NodeJS.Signals | null;
  stdoutBuffer: Buffer;
  stderrBuffer: Buffer;
  stdout: string;
  stderr: string;
};

export type RunCommandSyncOptions = {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  maxBuffer?: number;
};

export type RunCommandSyncResult = {
  command: string;
  args: string[];
  spawnCommand: string;
  spawnArgs: string[];
  status: number | null;
  signal: NodeJS.Signals | null;
  error: Error | null;
  stdoutBuffer: Buffer;
  stderrBuffer: Buffer;
  stdout: string;
  stderr: string;
};

export function decodeOutput(value: unknown, options?: DecodeOutputOptions): string;
export function runCommand(options: RunCommandOptions): Promise<RunCommandResult>;
export function runCommandSync(options: RunCommandSyncOptions): RunCommandSyncResult;
export function commandExists(command: string): boolean;
export function getPreferredNpmCommand(): string;
export function getPreferredNpxCommand(): string;
export function getSpawnCommandSpec(command: string, args?: string[], platform?: NodeJS.Platform): {
  command: string;
  args: string[];
  windowsHide: boolean;
};
export function __resetWindowsCodePageCacheForTests(): void;
