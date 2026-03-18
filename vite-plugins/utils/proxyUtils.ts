import { limitErrorText, readErrorString } from './httpUtils';

export function formatAxureProxyErrorDetails(error: any): string {
  const parts: string[] = [];
  const message = readErrorString(error?.message);
  const causeMessage = readErrorString(error?.cause?.message);
  const code = readErrorString(error?.code) || readErrorString(error?.cause?.code);
  const errno = readErrorString(error?.errno) || readErrorString(error?.cause?.errno);
  const syscall = readErrorString(error?.syscall) || readErrorString(error?.cause?.syscall);
  const address = readErrorString(error?.address) || readErrorString(error?.cause?.address);
  const port =
    typeof error?.port === 'number'
      ? String(error.port)
      : typeof error?.cause?.port === 'number'
        ? String(error.cause.port)
        : '';

  if (message) {
    parts.push(message);
  }
  if (causeMessage && causeMessage !== message) {
    parts.push(`cause=${causeMessage}`);
  }
  if (code) {
    parts.push(`code=${code}`);
  }
  if (errno && errno !== code) {
    parts.push(`errno=${errno}`);
  }
  if (syscall) {
    parts.push(`syscall=${syscall}`);
  }
  if (address) {
    parts.push(`address=${address}`);
  }
  if (port) {
    parts.push(`port=${port}`);
  }

  return parts.join('; ') || 'Unknown upstream error';
}

export function normalizeAxvgPayloadText(rawBody: string): string {
  const source = rawBody.trim();
  if (!source) {
    return '// axvg\n{}';
  }

  if (source.startsWith('// axvg')) {
    return source;
  }

  return `// axvg\n${source}`;
}

export function isLoopbackOrPrivateHostname(hostname: string): boolean {
  const normalized = String(hostname || '').trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0' ||
    normalized === '::1' ||
    normalized === '[::1]'
  ) {
    return true;
  }

  if (/^127\./.test(normalized)) {
    return true;
  }

  if (/^10\./.test(normalized)) {
    return true;
  }

  if (/^192\.168\./.test(normalized)) {
    return true;
  }

  if (/^169\.254\./.test(normalized)) {
    return true;
  }

  const match172 = normalized.match(/^172\.(\d{1,3})\./);
  if (match172) {
    const secondOctet = Number(match172[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  return false;
}

export function isAllowedProxyImageUrl(rawUrl: string): boolean {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return false;
  }

  if (isLoopbackOrPrivateHostname(parsedUrl.hostname)) {
    return false;
  }

  return true;
}

export { limitErrorText };
