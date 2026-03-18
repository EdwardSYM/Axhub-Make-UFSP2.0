import type { IncomingMessage, ServerResponse } from 'http';
import { logVirtualHtmlDebug } from '../logger';
import fs from 'fs';
import path from 'path';
import { readEntriesManifest } from '../../utils/entriesManifest';

/**
 * 路径标准化器
 *
 * 新路径格式（推荐）：
 * - /prototypes/{name}          → 原型预览
 * - /prototypes/{name}/spec     → 原型文档
 * - /components/{name}          → 组件预览
 * - /components/{name}/spec     → 组件文档
 * - /themes/{name}         → 主题预览
 * - /themes/{name}/spec    → 主题文档
 * - /docs/{name}           → 系统文档
 *
 * 旧路径格式（兼容）：
 * - /{name}.html                    → 重定向到新格式
 * - /{name}/spec.html               → 重定向到新格式
 * - /prototypes/{name}/index.html        → 重定向到新格式
 * - /components/{name}/index.html     → 重定向到新格式
 * - /assets/docs/{name}/spec.html  → 重定向到新格式
 */

export interface NormalizedPath {
  type: 'prototypes' | 'components' | 'themes' | 'docs';
  name: string;
  action: 'preview' | 'spec';
  isLegacy: boolean;
  originalUrl: string;
  normalizedUrl: string;
  versionId?: string;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodePathSegments(parts: string[]): string[] {
  return parts.map((part) => safeDecodeURIComponent(part));
}

export function encodeRoutePath(pathname: string): string {
  const hasLeadingSlash = pathname.startsWith('/');
  const hasTrailingSlash = pathname.endsWith('/') && pathname !== '/';
  const encoded = pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(safeDecodeURIComponent(segment)))
    .join('/');

  const withLeadingSlash = hasLeadingSlash ? `/${encoded}` : encoded;
  if (hasTrailingSlash && withLeadingSlash) {
    return `${withLeadingSlash}/`;
  }
  return withLeadingSlash || (hasLeadingSlash ? '/' : '');
}

function resolveEntryTypeByName(name: string): 'prototypes' | 'components' | 'themes' | null {
  const projectRoot = process.cwd();
  const normalizedName = String(name || '').trim();
  if (!normalizedName) return null;

  const scanOrder: Array<'prototypes' | 'components' | 'themes'> = ['prototypes', 'components', 'themes'];
  for (const type of scanOrder) {
    const entryPath = path.resolve(projectRoot, 'src', type, normalizedName, 'index.tsx');
    if (fs.existsSync(entryPath)) {
      return type;
    }
  }

  try {
    const manifest = readEntriesManifest(projectRoot);
    for (const type of scanOrder) {
      if (manifest.items?.[`${type}/${normalizedName}`]) {
        return type;
      }
    }
  } catch {
    // ignore manifest read errors and keep null fallback
  }

  return null;
}

/**
 * 解析并标准化路径
 */
export function normalizePath(url: string): NormalizedPath | null {
  const [urlWithoutQuery, queryString] = url.split('?');
  const params = new URLSearchParams(queryString || '');
  const versionId = params.get('ver') || undefined;

  // 移除末尾的 .html
  const cleanUrl = urlWithoutQuery.replace(/\.html$/, '');

  // 解析路径部分
  const pathParts = cleanUrl.split('/').filter(Boolean);

  if (pathParts.length === 0) return null;

  // 文档静态资源路径不参与页面路由标准化，交给资源处理器兜底。
  if (pathParts[0] === 'docs' && pathParts.includes('assets')) {
    return null;
  }

  // 情况 1: /prototypes/{name} 或 /prototypes/{name}/spec 或 /prototypes/{name}/index
  if (pathParts[0] === 'prototypes' && pathParts.length >= 2) {
    const decodedNameParts = decodePathSegments(pathParts.slice(1));
    const lastPart = decodedNameParts[decodedNameParts.length - 1];
    const hasActionSegment = lastPart === 'index' || lastPart === 'spec';
    const name = (hasActionSegment ? decodedNameParts.slice(0, -1) : decodedNameParts).join('/');

    if (!hasActionSegment || lastPart === 'index') {
      // /prototypes/{name} 或 /prototypes/{name}/index.html
      return {
        type: 'prototypes',
        name,
        action: 'preview',
        isLegacy: lastPart === 'index',
        originalUrl: url,
        normalizedUrl: `${encodeRoutePath(`/prototypes/${name}`)}${versionId ? `?ver=${versionId}` : ''}`,
        versionId
      };
    } else if (lastPart === 'spec') {
      // /prototypes/{name}/spec 或 /prototypes/{name}/spec.html
      return {
        type: 'prototypes',
        name,
        action: 'spec',
        isLegacy: urlWithoutQuery.includes('.html'),
        originalUrl: url,
        normalizedUrl: `${encodeRoutePath(`/prototypes/${name}/spec`)}${versionId ? `?ver=${versionId}` : ''}`,
        versionId
      };
    }
  }

  // 情况 2: /components/{name} 或 /components/{name}/spec 或 /components/{name}/index
  if (pathParts[0] === 'components' && pathParts.length >= 2) {
    const decodedNameParts = decodePathSegments(pathParts.slice(1));
    const lastPart = decodedNameParts[decodedNameParts.length - 1];
    const hasActionSegment = lastPart === 'index' || lastPart === 'spec';
    const name = (hasActionSegment ? decodedNameParts.slice(0, -1) : decodedNameParts).join('/');

    if (!hasActionSegment || lastPart === 'index') {
      // /components/{name} 或 /components/{name}/index.html
      return {
        type: 'components',
        name,
        action: 'preview',
        isLegacy: lastPart === 'index',
        originalUrl: url,
        normalizedUrl: `${encodeRoutePath(`/components/${name}`)}${versionId ? `?ver=${versionId}` : ''}`,
        versionId
      };
    } else if (lastPart === 'spec') {
      // /components/{name}/spec 或 /components/{name}/spec.html
      return {
        type: 'components',
        name,
        action: 'spec',
        isLegacy: urlWithoutQuery.includes('.html'),
        originalUrl: url,
        normalizedUrl: `${encodeRoutePath(`/components/${name}/spec`)}${versionId ? `?ver=${versionId}` : ''}`,
        versionId
      };
    }
  }

  // 情况 3: /themes/{name} 或 /themes/{name}/spec 或 /themes/{name}/index
  if (pathParts[0] === 'themes' && pathParts.length >= 2) {
    const decodedNameParts = decodePathSegments(pathParts.slice(1));
    const lastPart = decodedNameParts[decodedNameParts.length - 1];
    const hasActionSegment = lastPart === 'index' || lastPart === 'spec';
    const name = (hasActionSegment ? decodedNameParts.slice(0, -1) : decodedNameParts).join('/');

    if (!hasActionSegment || lastPart === 'index') {
      // /themes/{name} 或 /themes/{name}/index.html
      return {
        type: 'themes',
        name,
        action: 'preview',
        isLegacy: lastPart === 'index',
        originalUrl: url,
        normalizedUrl: `${encodeRoutePath(`/themes/${name}`)}${versionId ? `?ver=${versionId}` : ''}`,
        versionId
      };
    } else if (lastPart === 'spec') {
      // /themes/{name}/spec 或 /themes/{name}/spec.html
      return {
        type: 'themes',
        name,
        action: 'spec',
        isLegacy: urlWithoutQuery.includes('.html'),
        originalUrl: url,
        normalizedUrl: `${encodeRoutePath(`/themes/${name}/spec`)}${versionId ? `?ver=${versionId}` : ''}`,
        versionId
      };
    }
  }

  // 情况 4: /docs/{name} 或 /docs/{name}/spec.html
  if (pathParts[0] === 'docs' && pathParts.length >= 2) {
    const nameParts = decodePathSegments(pathParts.slice(1));
    const lastPart = nameParts[nameParts.length - 1];

    if (lastPart === 'spec') {
      // /docs/{name}/spec.html（旧格式）→ /docs/{name}
      const name = nameParts.slice(0, -1).join('/');
      return {
        type: 'docs',
        name,
        action: 'spec',
        isLegacy: true,
        originalUrl: url,
        normalizedUrl: encodeRoutePath(`/docs/${name}`),
        versionId
      };
    }

    // /docs/{name}
    const name = nameParts.join('/');
    return {
      type: 'docs',
      name,
      action: 'spec',
      isLegacy: false,
      originalUrl: url,
      normalizedUrl: encodeRoutePath(`/docs/${name}`),
      versionId
    };
  }

  // 情况 5: /assets/docs/{name} 或 /assets/docs/{name}/spec.html（旧格式兼容）
  if (pathParts[0] === 'assets' && pathParts[1] === 'docs' && pathParts.length >= 3) {
    const nameParts = decodePathSegments(pathParts.slice(2));
    const lastPart = nameParts[nameParts.length - 1];

    if (lastPart === 'spec') {
      // /assets/docs/{name}/spec.html（旧格式）→ /docs/{name}
      const name = nameParts.slice(0, -1).join('/');
      return {
        type: 'docs',
        name,
        action: 'spec',
        isLegacy: true,
        originalUrl: url,
        normalizedUrl: encodeRoutePath(`/docs/${name}`),
        versionId
      };
    }

    // /assets/docs/{name}（旧格式）→ /docs/{name}
    const name = nameParts.join('/');
    return {
      type: 'docs',
      name,
      action: 'spec',
      isLegacy: true,
      originalUrl: url,
      normalizedUrl: encodeRoutePath(`/docs/${name}`),
      versionId
    };
  }

  // 情况 6: /{name}.html 或 /{name}/spec.html（旧格式，需要查找是 page 还是 element）
  if (pathParts.length === 1 && urlWithoutQuery.endsWith('.html')) {
    const name = safeDecodeURIComponent(pathParts[0]);

    const type = resolveEntryTypeByName(name);
    if (type) {
      return {
        type,
        name,
        action: 'preview',
        isLegacy: true,
        originalUrl: url,
        normalizedUrl: `${encodeRoutePath(`/${type}/${name}`)}${versionId ? `?ver=${versionId}` : ''}`,
        versionId
      };
    }
  }

  // 情况 7: /{name}/spec.html（旧格式）
  if (pathParts.length === 2 && pathParts[1] === 'spec' && urlWithoutQuery.endsWith('.html')) {
    const name = safeDecodeURIComponent(pathParts[0]);

    const type = resolveEntryTypeByName(name);
    if (type) {
      return {
        type,
        name,
        action: 'spec',
        isLegacy: true,
        originalUrl: url,
        normalizedUrl: `${encodeRoutePath(`/${type}/${name}/spec`)}${versionId ? `?ver=${versionId}` : ''}`,
        versionId
      };
    }
  }

  return null;
}

/**
 * 处理路径重定向（旧格式 → 新格式）
 */
export function handlePathRedirect(req: IncomingMessage, res: ServerResponse): boolean {
  if (!req.url) return false;

  const normalized = normalizePath(req.url);

  if (normalized && normalized.isLegacy) {
    // 旧格式，重定向到新格式
    logVirtualHtmlDebug('路径重定向:', normalized.originalUrl, '→', normalized.normalizedUrl);

    res.statusCode = 301; // 永久重定向
    res.setHeader('Location', normalized.normalizedUrl);
    res.end();
    return true;
  }

  return false;
}
