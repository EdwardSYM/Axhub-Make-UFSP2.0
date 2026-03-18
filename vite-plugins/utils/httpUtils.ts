import { networkInterfaces } from 'os';
import archiver from 'archiver';

import { buildAttachmentContentDisposition } from './contentDisposition';

export function getLocalIP(): string {
  const interfaces = networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (!nets) continue;

    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }

  return 'localhost';
}

export function getRequestPathname(req: any): string {
  try {
    return new URL(req.url || '/', `http://${req.headers.host}`).pathname;
  } catch {
    return (req.url || '/').split('?')[0];
  }
}

export function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export function readRequestBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

export function readErrorString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function limitErrorText(value: string, maxLength: number = 500): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

export function serializeErrorForLog(error: any) {
  const cause = error?.cause;
  const stack = readErrorString(error?.stack);
  const causeStack = readErrorString(cause?.stack);

  return {
    name: readErrorString(error?.name) || undefined,
    message: readErrorString(error?.message) || undefined,
    code: readErrorString(error?.code) || undefined,
    errno: readErrorString(error?.errno) || undefined,
    syscall: readErrorString(error?.syscall) || undefined,
    address: readErrorString(error?.address) || undefined,
    port: typeof error?.port === 'number' ? error.port : undefined,
    causeName: readErrorString(cause?.name) || undefined,
    causeMessage: readErrorString(cause?.message) || undefined,
    causeCode: readErrorString(cause?.code) || undefined,
    causeErrno: readErrorString(cause?.errno) || undefined,
    causeSyscall: readErrorString(cause?.syscall) || undefined,
    causeAddress: readErrorString(cause?.address) || undefined,
    causePort: typeof cause?.port === 'number' ? cause.port : undefined,
    stack: stack ? limitErrorText(stack, 1200) : undefined,
    causeStack: causeStack ? limitErrorText(causeStack, 1200) : undefined,
  };
}

export function streamDirectoryAsZip(res: any, sourceDir: string, fileName: string) {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', buildAttachmentContentDisposition(fileName));

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('warning', (warning: any) => {
    console.warn('[download-dist-plugin] ZIP warning:', warning);
  });

  archive.on('error', (error: any) => {
    console.error('[download-dist-plugin] ZIP error:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: `Failed to create zip: ${error.message}` }));
      return;
    }
    res.destroy(error);
  });

  archive.pipe(res);
  archive.directory(sourceDir, false);
  void archive.finalize();
}
