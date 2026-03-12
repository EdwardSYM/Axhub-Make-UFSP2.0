import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { networkInterfaces, tmpdir } from 'os';
import formidable from 'formidable';
import archiver from 'archiver';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { forceInlineDynamicImportsOff } from './vite-plugins/forceInlineDynamicImportsOff';
import { addAxhubMarker } from './vite-plugins/addAxhubMarker';
import { axhubComponentEnforcer } from './vite-plugins/axhubComponentEnforcer';
import { virtualHtmlPlugin } from './vite-plugins/virtualHtml';
import { websocketPlugin } from './vite-plugins/websocketPlugin';
import { injectStablePageIds } from './vite-plugins/injectStablePageIds';
import { fileSystemApiPlugin } from './vite-plugins/fileSystemApiPlugin';
import { dataManagementApiPlugin } from './vite-plugins/dataManagementApiPlugin';
import { mediaManagementApiPlugin } from './vite-plugins/mediaManagementApiPlugin';
import { codeReviewPlugin } from './vite-plugins/codeReviewPlugin';
import { autoDebugPlugin } from './vite-plugins/autoDebugPlugin';
import { configApiPlugin } from './vite-plugins/configApiPlugin';
import { aiCliPlugin } from './vite-plugins/aiCliPlugin';
import { gitVersionApiPlugin } from './vite-plugins/gitVersionApiPlugin';
import { buildAttachmentContentDisposition } from './vite-plugins/utils/contentDisposition';
import { readEntriesManifest, scanProjectEntries, writeEntriesManifestAtomic } from './vite-plugins/utils/entriesManifest';

const MAKE_STATE_DIR = path.join('.axhub', 'make');
const MAKE_CONFIG_RELATIVE_PATH = path.join(MAKE_STATE_DIR, 'axhub.config.json');
const MAKE_DEV_SERVER_INFO_RELATIVE_PATH = path.join(MAKE_STATE_DIR, '.dev-server-info.json');
const MAKE_ENTRIES_RELATIVE_PATH = path.join(MAKE_STATE_DIR, 'entries.json');
const AXURE_BRIDGE_BASE_URL = 'http://localhost:32767';

/**
 * ⚠️ 运行时配置注入说明
 * 
 * serveAdminPlugin 负责在运行时动态注入配置到 admin HTML 文件中。
 * 这些配置包括：
 * - window.__LOCAL_IP__: 当前机器的局域网 IP
 * - window.__LOCAL_PORT__: 实际运行的端口号
 * - window.__PROJECT_PREFIX__: 项目路径前缀
 * - window.__IS_MIXED_PROJECT__: 是否为混合项目
 * 
 * 🔑 为什么在运行时注入？
 * - admin 文件是由 prototype-admin 构建的静态文件
 * - 构建时的 IP/端口在运行时可能不同（不同机器、端口被占用等）
 * - 必须在每次请求时动态获取并注入正确的配置
 */

// 获取局域网 IP 地址
function getLocalIP(): string {
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

function getRequestPathname(req: any): string {
  try {
    return new URL(req.url || '/', `http://${req.headers.host}`).pathname;
  } catch {
    return (req.url || '/').split('?')[0];
  }
}

function readJsonBody(req: any): Promise<any> {
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

function readErrorString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function limitErrorText(value: string, maxLength: number = 500): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function serializeErrorForLog(error: any) {
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

function formatAxureProxyErrorDetails(error: any): string {
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

function normalizeAxvgPayloadText(rawBody: string): string {
  const source = rawBody.trim();
  if (!source) {
    return '// axvg\n{}';
  }

  if (source.startsWith('// axvg')) {
    return source;
  }

  return `// axvg\n${source}`;
}

function isLoopbackOrPrivateHostname(hostname: string): boolean {
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

function isAllowedProxyImageUrl(rawUrl: string): boolean {
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

function exportImageProxyPlugin(): Plugin {
  return {
    name: 'export-image-proxy-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (req.method !== 'GET' || pathname !== '/api/export/image-proxy') {
          return next();
        }

        const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const targetUrl = String(requestUrl.searchParams.get('url') || '').trim();

        if (!targetUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Missing url query parameter' }));
          return;
        }

        if (!isAllowedProxyImageUrl(targetUrl)) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Unsupported proxy target url' }));
          return;
        }

        try {
          const upstreamResponse = await fetch(targetUrl, {
            method: 'GET',
            redirect: 'follow',
            headers: {
              Accept: 'image/*,*/*;q=0.8',
              'User-Agent': 'AxhubMakeExportProxy/1.0',
            },
          });

          if (!upstreamResponse.ok) {
            res.statusCode = upstreamResponse.status;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              error: `Upstream responded with ${upstreamResponse.status}`,
              targetUrl,
            }));
            return;
          }

          const contentType = String(upstreamResponse.headers.get('content-type') || '').toLowerCase();
          if (contentType && !contentType.startsWith('image/')) {
            res.statusCode = 415;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              error: `Unsupported upstream content-type: ${contentType}`,
              targetUrl,
            }));
            return;
          }

          const body = Buffer.from(await upstreamResponse.arrayBuffer());

          res.statusCode = 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', upstreamResponse.headers.get('cache-control') || 'public, max-age=600');
          res.setHeader('Content-Type', contentType || 'application/octet-stream');
          res.setHeader('Content-Length', String(body.byteLength));

          const etag = upstreamResponse.headers.get('etag');
          if (etag) {
            res.setHeader('ETag', etag);
          }

          const lastModified = upstreamResponse.headers.get('last-modified');
          if (lastModified) {
            res.setHeader('Last-Modified', lastModified);
          }

          res.end(body);
        } catch (error: any) {
          console.error('[export-image-proxy] request failed', {
            targetUrl,
            error: serializeErrorForLog(error),
          });

          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            error: error?.message || 'Failed to fetch target image',
            targetUrl,
          }));
        }
      });
    }
  };
}

function streamDirectoryAsZip(res: any, sourceDir: string, fileName: string) {
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

/**
 * 局域网访问控制插件
 * 根据 allowLAN 配置决定是否允许非本地 IP 访问
 */
function lanAccessControlPlugin(): Plugin {
  let allowLAN = true; // 在启动时确定，不再动态读取
  
  return {
    name: 'lan-access-control',
    configResolved(config: any) {
      // 在配置解析时读取 allowLAN 设置
      const configPath = path.resolve(__dirname, MAKE_CONFIG_RELATIVE_PATH);
      
      if (fs.existsSync(configPath)) {
        try {
          const axhubConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          allowLAN = axhubConfig.server?.allowLAN !== false;
          console.log(`🔒 局域网访问控制: ${allowLAN ? '允许' : '禁止'}`);
        } catch (e) {
          // 配置读取失败，使用默认值
        }
      }
    },
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        // 如果允许局域网访问，直接放行
        if (allowLAN) {
          return next();
        }
        
        // 不允许局域网访问，检查请求来源
        const clientIP = req.socket.remoteAddress || req.connection.remoteAddress;
        
        // 本地 IP 列表（IPv4 和 IPv6）
        const localIPs = [
          '127.0.0.1',
          '::1',
          '::ffff:127.0.0.1',
          'localhost'
        ];
        
        // 检查是否为本地访问
        const isLocalAccess = localIPs.some(ip => clientIP?.includes(ip));
        
        if (!isLocalAccess) {
          // 非本地访问，返回 403
          res.statusCode = 403;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>访问被拒绝</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .container {
                  background: white;
                  padding: 40px;
                  border-radius: 10px;
                  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                  text-align: center;
                  max-width: 500px;
                }
                h1 {
                  color: #e74c3c;
                  margin: 0 0 20px 0;
                }
                p {
                  color: #666;
                  line-height: 1.6;
                }
                .ip {
                  background: #f5f5f5;
                  padding: 10px;
                  border-radius: 5px;
                  font-family: monospace;
                  margin: 20px 0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🚫 访问被拒绝</h1>
                <p>此服务器已禁用局域网访问。</p>
                <p>只允许本地访问（localhost/127.0.0.1）。</p>
                <div class="ip">您的 IP: ${clientIP}</div>
                <p style="font-size: 12px; color: #999;">
                  如需允许局域网访问，请在配置文件中设置 allowLAN: true 并重启服务器
                </p>
              </div>
            </body>
            </html>
          `);
          return;
        }
        
        // 本地访问，放行
        next();
      });
    }
  };
}

/**
 * 写入开发服务器信息到文件的插件
 * 用于 AI 调试时读取服务器配置信息
 */
function writeDevServerInfoPlugin(): Plugin {
  return {
    name: 'write-dev-server-info',
    configureServer(server: any) {
      server.httpServer?.once('listening', () => {
        try {
          const localIP = getLocalIP();
          const actualPort = server.httpServer?.address()?.port || server.config.server?.port || 5173;
          
          // 读取用户配置的 host（用于浏览器显示）
          const configPath = path.resolve(__dirname, MAKE_CONFIG_RELATIVE_PATH);
          let displayHost = 'localhost'; // 默认显示 localhost
          if (fs.existsSync(configPath)) {
            try {
              const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
              displayHost = config.server?.host || 'localhost';
            } catch (e) {
              // 配置文件读取失败，使用默认值
            }
          }
          
          const devServerInfo = {
            port: actualPort,
            host: displayHost, // 用户配置的显示域名
            localIP: localIP,
            timestamp: new Date().toISOString()
          };
          
          const infoPath = path.resolve(__dirname, MAKE_DEV_SERVER_INFO_RELATIVE_PATH);
          fs.mkdirSync(path.dirname(infoPath), { recursive: true });
          fs.writeFileSync(infoPath, JSON.stringify(devServerInfo, null, 2), 'utf8');
          
          console.log(`\n✅ Dev server info written to ${MAKE_DEV_SERVER_INFO_RELATIVE_PATH}`);
          console.log(`   Local:   http://${displayHost}:${actualPort}`);
          console.log(`   Network: http://${localIP}:${actualPort}\n`);
        } catch (error) {
          console.error('Failed to write dev server info:', error);
        }
      });
    }
  };
}

/**
 * 服务 admin 目录下的静态文件插件
 * 
 * 🎯 核心职责：
 * 1. 服务由 prototype-admin 构建的静态 HTML 文件
 * 2. 在运行时动态注入配置（IP、端口、项目路径等）
 * 3. 确保每次请求都使用当前机器的正确配置
 * 
 * ⚠️ 重要：不要移除运行时注入逻辑！
 * 这些配置必须在运行时动态生成，不能在构建时写死。
 */
function serveAdminPlugin(): Plugin {
  // 检测项目结构：判断当前目录是否在 apps/xxx/ 下
  const currentDir = __dirname;
  const appsMatch = currentDir.match(/[\/\\]apps[\/\\]([^\/\\]+)/);
  
  let projectPrefix = '';
  if (appsMatch) {
    // 在 apps/xxx/ 结构下，说明是混合项目
    // 需要找到包含 .axhub/make/entries.json 的项目目录（通常是主项目）
    const rootDir = currentDir.split(/[\/\\]apps[\/\\]/)[0];
    const appsDir = path.join(rootDir, 'apps');
    
    if (fs.existsSync(appsDir)) {
      const appFolders = fs.readdirSync(appsDir);
      for (const folder of appFolders) {
        const folderPath = path.join(appsDir, folder);
        const entriesPath = path.join(folderPath, MAKE_ENTRIES_RELATIVE_PATH);
        if (fs.existsSync(entriesPath)) {
          projectPrefix = `apps/${folder}/`;
          break;
        }
      }
    }
  }
  
  const isMixedProject = !!projectPrefix;
  
  return {
    name: 'serve-admin-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const adminDir = path.resolve(__dirname, 'admin');
        const pathname = getRequestPathname(req);
        
        // 获取运行时的局域网 IP 和端口
        const localIP = getLocalIP();
        const actualPort = server.httpServer?.address()?.port || server.config.server?.port || 5173;
        
        // 🔥 运行时动态注入配置脚本
        // 注意：这些配置必须在每次请求时动态生成，不能在构建时写死
        // 因为不同机器的 IP 不同，端口也可能被占用而改变
        const injectScript = `
  <script>
    // 项目路径配置（根据项目结构自动检测）
    window.__PROJECT_PREFIX__ = '${projectPrefix}';
    window.__IS_MIXED_PROJECT__ = ${isMixedProject};
    // 运行时注入的局域网 IP 信息
    window.__LOCAL_IP__ = '${localIP}';
    window.__LOCAL_PORT__ = ${actualPort};
  </script>`;
        
        // 处理根路径 / 或 /index.html
        if (pathname === '/' || pathname === '/index.html') {
          const indexPath = path.join(adminDir, 'index.html');
          if (fs.existsSync(indexPath)) {
            let html = fs.readFileSync(indexPath, 'utf8');
            // 注入项目路径配置和局域网 IP
            html = html.replace('</head>', `${injectScript}\n</head>`);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
            return;
          }
        }
        
        // 处理 /*.html 请求（如 /projects.html）
        if (pathname && pathname.match(/^\/[^/]+\.html$/)) {
          const htmlPath = path.join(adminDir, pathname);
          if (fs.existsSync(htmlPath)) {
            let html = fs.readFileSync(htmlPath, 'utf8');
            // 注入项目路径配置和局域网 IP
            html = html.replace('</head>', `${injectScript}\n</head>`);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
            return;
          }
        }
        
        // 处理 /assets/* 静态资源
        if (pathname && pathname.startsWith('/assets/')) {
          const assetPath = path.join(adminDir, pathname);
          if (fs.existsSync(assetPath)) {
            const ext = path.extname(assetPath);
            const contentTypes: Record<string, string> = {
              '.js': 'application/javascript',
              '.css': 'text/css',
              '.json': 'application/json',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.svg': 'image/svg+xml',
              '.ico': 'image/x-icon'
            };
            res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
            res.end(fs.readFileSync(assetPath));
            return;
          }
        }
        
        // 处理 /images/* 静态资源
        if (pathname && pathname.startsWith('/images/')) {
          const imagePath = path.join(adminDir, pathname);
          if (fs.existsSync(imagePath)) {
            const ext = path.extname(imagePath);
            const contentTypes: Record<string, string> = {
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.gif': 'image/gif',
              '.svg': 'image/svg+xml',
              '.ico': 'image/x-icon'
            };
            res.setHeader('Content-Type', contentTypes[ext] || 'image/png');
            res.end(fs.readFileSync(imagePath));
            return;
          }
        }

        // 处理 /admin/* 静态资源（如 auto-debug-client.js）
        if (pathname && pathname.startsWith('/admin/')) {
          const adminFilePath = path.join(adminDir, pathname.replace('/admin/', ''));
          if (fs.existsSync(adminFilePath)) {
            const ext = path.extname(adminFilePath);
            const contentTypes: Record<string, string> = {
              '.js': 'application/javascript; charset=utf-8',
              '.css': 'text/css; charset=utf-8',
              '.json': 'application/json; charset=utf-8',
              '.html': 'text/html; charset=utf-8'
            };
            res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
            res.end(fs.readFileSync(adminFilePath));
            return;
          }
        }

        // 处理根目录下的 .js 文件（如 /auto-debug-client.js）
        if (pathname && pathname.match(/^\/[^/]+\.js$/)) {
          const jsPath = path.join(adminDir, pathname);
          if (fs.existsSync(jsPath)) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.end(fs.readFileSync(jsPath));
            return;
          }
        }

        // 处理 /docs/* 和 /docs/*/spec.html 请求（文档预览）
        const encodedDocName = pathname?.match(/^\/docs\/([^/]+)(?:\/spec\.html)?$/)?.[1];
        if (encodedDocName) {
          const specTemplatePath = path.join(adminDir, 'spec-template.html');
          if (fs.existsSync(specTemplatePath)) {
            let html = fs.readFileSync(specTemplatePath, 'utf8');
            const docName = decodeURIComponent(encodedDocName);
            const docFileName = docName.endsWith('.md') ? docName : `${docName}.md`;
            const specUrl = `/api/docs/${encodeURIComponent(docFileName)}`;
            html = html.replace(/\{\{SPEC_URL\}\}/g, specUrl);
            html = html.replace(/\{\{TITLE\}\}/g, docName);
            html = html.replace(/\{\{MULTI_DOC\}\}/g, 'false');
            html = html.replace(/\{\{DOCS_CONFIG\}\}/g, '[]');
            // 注入项目路径配置和局域网 IP
            html = html.replace('</head>', `${injectScript}\n</head>`);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
            return;
          }
        }

        const encodedTemplateName = pathname?.match(/^\/templates\/([^/]+)(?:\/spec\.html)?$/)?.[1];
        if (encodedTemplateName) {
          const specTemplatePath = path.join(adminDir, 'spec-template.html');
          if (fs.existsSync(specTemplatePath)) {
            let html = fs.readFileSync(specTemplatePath, 'utf8');
            const templateName = decodeURIComponent(encodedTemplateName);
            const templateFileName = templateName.endsWith('.md') ? templateName : `${templateName}.md`;
            const specUrl = `/api/templates/${encodeURIComponent(templateFileName)}`;
            html = html.replace(/\{\{SPEC_URL\}\}/g, specUrl);
            html = html.replace(/\{\{TITLE\}\}/g, templateName);
            html = html.replace(/\{\{MULTI_DOC\}\}/g, 'false');
            html = html.replace(/\{\{DOCS_CONFIG\}\}/g, '[]');
            html = html.replace('</head>', `${injectScript}\n</head>`);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
            return;
          }
        }
        
        next();
      });
    }
  };
}

// 提供 /api/download-dist 端点的插件
function downloadDistPlugin(): Plugin {
  return {
    name: 'download-dist-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (req.method !== 'GET' || pathname !== '/api/download-dist') {
          return next();
        }

        try {
          const distDir = path.resolve(__dirname, 'dist');

          if (!fs.existsSync(distDir)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Dist directory not found' }));
            return;
          }

          // 读取 package.json 获取项目名称
          let projectName = 'project';
          try {
            const pkgPath = path.resolve(__dirname, 'package.json');
            if (fs.existsSync(pkgPath)) {
              const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
              projectName = pkg.name || 'project';
            }
          } catch (e) {
            console.warn('Failed to read project name from package.json:', e);
          }

          streamDirectoryAsZip(res, distDir, `${projectName}-dist.zip`);
        } catch (e: any) {
          console.error('Download dist error:', e);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        }
      });
    }
  };
}

// 提供 /api/axure-bridge/* 端点的插件（服务端转发到本地 Axure Bridge）
function axureBridgeProxyPlugin(): Plugin {
  return {
    name: 'axure-bridge-proxy-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        const isAvailableRoute = req.method === 'GET' && pathname === '/api/axure-bridge/available';
        const isCopyRoute = req.method === 'POST' && pathname === '/api/axure-bridge/copyaxvg';

        if (!isAvailableRoute && !isCopyRoute) {
          return next();
        }

        const upstreamUrl = isAvailableRoute
          ? `${AXURE_BRIDGE_BASE_URL}/available`
          : `${AXURE_BRIDGE_BASE_URL}/copyaxvg`;
        let payloadBytes = 0;

        try {
          let upstreamResponse: any;

          if (isAvailableRoute) {
            upstreamResponse = await fetch(upstreamUrl, {
              method: 'GET',
            });
          } else {
            let rawBody = '';
            try {
              rawBody = await readRequestBody(req);
            } catch (error: any) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: error?.message || 'Invalid request body' }));
              return;
            }

            const requestBody = normalizeAxvgPayloadText(rawBody);
            const requestBuffer = Buffer.from(requestBody, 'utf8');
            payloadBytes = requestBuffer.byteLength;

            upstreamResponse = await fetch(upstreamUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Length': String(payloadBytes),
              },
              body: requestBuffer,
            });
          }

          const contentType = String(upstreamResponse.headers.get('content-type') || '').toLowerCase();
          const responseText = await upstreamResponse.text();

          if (!upstreamResponse.ok) {
            console.warn('[axure-bridge-proxy] upstream responded with error', {
              route: pathname,
              method: req.method,
              upstreamUrl,
              payloadBytes: payloadBytes || undefined,
              status: upstreamResponse.status,
              statusText: upstreamResponse.statusText,
              bodyPreview: limitErrorText(readErrorString(responseText), 800) || undefined,
            });
          }

          res.statusCode = upstreamResponse.status;
          res.setHeader('Cache-Control', 'no-store');

          if (contentType.includes('application/json')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(responseText || '{}');
            return;
          }

          if (responseText) {
            try {
              const parsed = JSON.parse(responseText);
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(parsed));
              return;
            } catch {
              // 非 JSON 文本按原样透传
            }
          }

          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(responseText);
        } catch (error: any) {
          const errorLog = serializeErrorForLog(error);
          console.error('[axure-bridge-proxy] upstream request failed', {
            route: pathname,
            method: req.method,
            upstreamUrl,
            payloadBytes: payloadBytes || undefined,
            error: errorLog,
          });

          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            error: error?.message || 'Axure Bridge unavailable',
            details: formatAxureProxyErrorDetails(error),
            code: errorLog.code || errorLog.causeCode || undefined,
            causeMessage: errorLog.causeMessage || undefined,
            route: pathname,
            method: req.method,
            bridgeUrl: upstreamUrl,
            payloadBytes: payloadBytes || undefined,
          }));
        }
      });
    }
  };
}

// 提供 /api/version 端点的插件
function versionApiPlugin(): Plugin {
  return {
    name: 'version-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (req.method !== 'GET' || pathname !== '/api/version') {
          return next();
        }

        try {
          const pkgPath = path.resolve(__dirname, 'package.json');
          const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : null;
          const version = pkg?.version ?? null;

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify({ version }));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: e?.message || 'Unknown error' }));
        }
      });
    }
  };
}

function readRequestBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function sanitizeDocBaseName(input: string) {
  return input
    .trim()
    .replace(/\.md$/i, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const PROTECTED_TEMPLATE_BASENAMES = new Set([
  'spec-template',
]);

function isProtectedTemplateName(templateName: string) {
  const normalizedName = String(templateName || '').trim();
  if (!normalizedName) return false;
  const baseName = path.basename(normalizedName, path.extname(normalizedName));
  return PROTECTED_TEMPLATE_BASENAMES.has(baseName);
}

const SPEC_DOC_IMAGE_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const SPEC_DOC_IMAGE_ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
]);
const SPEC_DOC_IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

function safeDecodeURIComponent(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

function isPathInside(baseDir: string, targetPath: string): boolean {
  const relative = path.relative(baseDir, targetPath);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function resolveDocumentPathFromDocUrl(docUrl: string, host?: string): { docPath: string } | { status: number; error: string } {
  let pathname = '';
  try {
    pathname = new URL(docUrl, `http://${host || 'localhost'}`).pathname;
  } catch {
    return { status: 400, error: 'Invalid docUrl' };
  }

  const srcRoot = path.resolve(__dirname, 'src');
  const docsRoot = path.resolve(srcRoot, 'docs');

  if (pathname.startsWith('/api/docs/')) {
    const encodedDocName = pathname.slice('/api/docs/'.length);
    if (!encodedDocName) {
      return { status: 400, error: 'Missing document name in docUrl' };
    }

    const decodedDocName = safeDecodeURIComponent(encodedDocName);
    const docPath = path.resolve(docsRoot, decodedDocName);
    if (!isPathInside(docsRoot, docPath)) {
      return { status: 403, error: 'Forbidden path' };
    }
    return { docPath };
  }

  if (pathname.startsWith('/docs/')) {
    const rawDocPath = pathname.slice('/docs/'.length);
    if (!rawDocPath) {
      return { status: 400, error: 'Missing document name in docUrl' };
    }

    const decodedDocPath = safeDecodeURIComponent(rawDocPath);
    const normalizedDocPath = decodedDocPath.toLowerCase().endsWith('.md')
      ? decodedDocPath
      : `${decodedDocPath}.md`;
    const docPath = path.resolve(docsRoot, normalizedDocPath);
    if (!isPathInside(docsRoot, docPath)) {
      return { status: 403, error: 'Forbidden path' };
    }
    return { docPath };
  }

  const specMatch = pathname.match(/^\/(components|prototypes|themes)\/([^/]+)\/(spec|prd)\.md$/i);
  if (specMatch) {
    const entryType = specMatch[1].toLowerCase();
    const entryName = safeDecodeURIComponent(specMatch[2]);
    const docName = `${specMatch[3].toLowerCase()}.md`;
    const entryRoot = path.resolve(srcRoot, entryType);
    const docPath = path.resolve(entryRoot, entryName, docName);

    if (!isPathInside(entryRoot, docPath)) {
      return { status: 403, error: 'Forbidden path' };
    }
    return { docPath };
  }

  return { status: 400, error: 'Unsupported docUrl path' };
}

function sanitizeImageUploadFileName(originalName: string, mimeType?: string): string {
  const normalizedMimeType = String(mimeType || '').toLowerCase();
  const extensionByMime = SPEC_DOC_IMAGE_MIME_TO_EXTENSION[normalizedMimeType] || '';
  const rawExt = path.extname(originalName || '').toLowerCase();
  const extension = SPEC_DOC_IMAGE_ALLOWED_EXTENSIONS.has(rawExt)
    ? rawExt
    : (SPEC_DOC_IMAGE_ALLOWED_EXTENSIONS.has(extensionByMime) ? extensionByMime : '.png');

  const rawBaseName = path.basename(originalName || '', path.extname(originalName || '')).trim();
  const safeBaseName = (rawBaseName || `image-${Date.now().toString(36)}`)
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `image-${Date.now().toString(36)}`;

  return `${safeBaseName}${extension}`;
}

function resolveUniqueFilePath(directoryPath: string, fileName: string): string {
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);

  let index = 1;
  let candidateName = fileName;
  let candidatePath = path.join(directoryPath, candidateName);

  while (fs.existsSync(candidatePath)) {
    index += 1;
    candidateName = `${baseName}-${index}${ext}`;
    candidatePath = path.join(directoryPath, candidateName);
  }

  return candidatePath;
}

function createManualDocTemplate(displayName: string) {
  return `# ${displayName}

## 概述
请在此补充文档目标、范围与背景信息。

## 详细内容
请在此继续编写正文。
`;
}

function extractMarkdownDisplayName(content: string, fallbackName: string) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch?.[1]?.trim() || fallbackName;
}

function extractMarkdownDescription(content: string) {
  const lines = content.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line && !line.startsWith('#')) {
      return line;
    }
  }
  return '';
}

function listTemplateAssets(templatesDir: string) {
  const templates: Array<{ name: string; displayName: string; description: string }> = [];

  if (!fs.existsSync(templatesDir)) {
    return templates;
  }

  const walkTemplatesDir = (dirPath: string) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    entries.forEach((entry) => {
      if (!entry || entry.name.startsWith('.')) {
        return;
      }

      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walkTemplatesDir(fullPath);
        return;
      }

      if (!entry.isFile()) {
        return;
      }

      const relativePath = path.relative(templatesDir, fullPath).split(path.sep).join('/');
      const content = fs.readFileSync(fullPath, 'utf8');
      templates.push({
        name: relativePath,
        displayName: relativePath.replace(/\.[^./\\]+$/u, ''),
        description: extractMarkdownDescription(content),
      });
    });
  };

  walkTemplatesDir(templatesDir);
  templates.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  return templates;
}

const DOC_IMPORT_MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB per file
const DOC_IMPORT_MAX_FILE_COUNT = 30;
const DOC_IMPORT_MAX_TOTAL_SIZE = 150 * 1024 * 1024; // 150MB per request

const DOC_IMPORT_SUPPORTED_EXTENSIONS = new Set([
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

type MarkitdownResolvedCommand = {
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

function resolveMarkitdownCommand(): MarkitdownResolvedCommand {
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

function sanitizeImportFileBaseName(fileName: string): string {
  return String(fileName || '')
    .trim()
    .replace(/\.[^/.]+$/, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveUniqueMarkdownPath(docsDir: string, baseName: string) {
  const safeBaseName = sanitizeImportFileBaseName(baseName) || `doc-${Date.now().toString(36)}`;
  let fileName = `${safeBaseName}.md`;
  let nextPath = path.join(docsDir, fileName);
  let suffix = 1;
  while (fs.existsSync(nextPath)) {
    fileName = `${safeBaseName}-${suffix}.md`;
    nextPath = path.join(docsDir, fileName);
    suffix += 1;
  }
  return { fileName, absolutePath: nextPath };
}

function convertFileToMarkdownWithMarkitdown(params: {
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

function docsImportApiPlugin(): Plugin {
  return {
    name: 'docs-import-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        const docsDir = path.resolve(__dirname, 'src/docs');

        if (pathname === '/api/docs/import/markitdown-status') {
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          const resolved = resolveMarkitdownCommand();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            installed: resolved.installed,
            commandSource: resolved.commandSource,
            version: resolved.version,
            installHints: resolved.installHints,
            error: resolved.error,
          }));
          return;
        }

        if (pathname !== '/api/docs/import' && pathname !== '/api/docs/import/') {
          return next();
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const uploadDir = path.resolve(__dirname, 'temp', 'docs-import');
        fs.mkdirSync(uploadDir, { recursive: true });
        fs.mkdirSync(docsDir, { recursive: true });

        const form = formidable({
          uploadDir,
          keepExtensions: true,
          multiples: true,
          maxFileSize: DOC_IMPORT_MAX_FILE_SIZE,
        });

        form.parse(req, async (error: any, _fields: any, files: any) => {
          if (error) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Failed to parse upload payload' }));
            return;
          }

          const normalizeFiles = (value: any): any[] => {
            if (!value) return [];
            return Array.isArray(value) ? value : [value];
          };

          const uploadedFiles = normalizeFiles(files?.files).length > 0
            ? normalizeFiles(files?.files)
            : normalizeFiles(files?.file);

          if (uploadedFiles.length === 0) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Missing files' }));
            return;
          }

          if (uploadedFiles.length > DOC_IMPORT_MAX_FILE_COUNT) {
            res.statusCode = 413;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              error: `Too many files. Maximum ${DOC_IMPORT_MAX_FILE_COUNT} files per import.`,
            }));
            return;
          }

          const totalSize = uploadedFiles.reduce(
            (sum, file) => sum + Number(file?.size || 0),
            0,
          );
          if (totalSize > DOC_IMPORT_MAX_TOTAL_SIZE) {
            res.statusCode = 413;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              error: `Total payload too large. Maximum ${Math.floor(DOC_IMPORT_MAX_TOTAL_SIZE / 1024 / 1024)}MB.`,
            }));
            return;
          }

          const markitdown = resolveMarkitdownCommand();
          const results: Array<{
            originalName: string;
            extension: string;
            success: boolean;
            mode: 'direct-md' | 'markitdown';
            savedName?: string;
            savedPath?: string;
            error?: string;
          }> = [];

          for (const file of uploadedFiles) {
            const tempPath = String(file?.filepath || file?.path || '').trim();
            const originalName = String(
              file?.originalFilename || file?.name || file?.newFilename || 'unnamed-file',
            ).trim();
            const extension = path.extname(originalName || tempPath).toLowerCase();
            const safeOriginalName = originalName || path.basename(tempPath) || 'unnamed-file';

            const cleanupTempFile = () => {
              if (!tempPath) return;
              try {
                if (fs.existsSync(tempPath)) {
                  fs.unlinkSync(tempPath);
                }
              } catch {
                // ignore cleanup errors
              }
            };

            if (!tempPath || !fs.existsSync(tempPath)) {
              results.push({
                originalName: safeOriginalName,
                extension,
                success: false,
                mode: extension === '.md' ? 'direct-md' : 'markitdown',
                error: 'Uploaded file is missing from temporary storage',
              });
              cleanupTempFile();
              continue;
            }

            if (!DOC_IMPORT_SUPPORTED_EXTENSIONS.has(extension)) {
              results.push({
                originalName: safeOriginalName,
                extension,
                success: false,
                mode: extension === '.md' ? 'direct-md' : 'markitdown',
                error: `Unsupported file extension: ${extension || 'unknown'}`,
              });
              cleanupTempFile();
              continue;
            }

            const baseName = sanitizeImportFileBaseName(safeOriginalName)
              || `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
            const target = resolveUniqueMarkdownPath(docsDir, baseName);
            if (!target.absolutePath.startsWith(docsDir)) {
              results.push({
                originalName: safeOriginalName,
                extension,
                success: false,
                mode: extension === '.md' ? 'direct-md' : 'markitdown',
                error: 'Forbidden target path',
              });
              cleanupTempFile();
              continue;
            }

            if (extension === '.md') {
              try {
                fs.copyFileSync(tempPath, target.absolutePath);
                results.push({
                  originalName: safeOriginalName,
                  extension,
                  success: true,
                  mode: 'direct-md',
                  savedName: target.fileName,
                  savedPath: `src/docs/${target.fileName}`,
                });
              } catch (copyError: any) {
                results.push({
                  originalName: safeOriginalName,
                  extension,
                  success: false,
                  mode: 'direct-md',
                  error: copyError?.message || 'Failed to save markdown file',
                });
              } finally {
                cleanupTempFile();
              }
              continue;
            }

            if (!markitdown.installed || !markitdown.command || !markitdown.args) {
              results.push({
                originalName: safeOriginalName,
                extension,
                success: false,
                mode: 'markitdown',
                error: markitdown.error || 'markitdown is not installed. Only .md files can be imported now.',
              });
              cleanupTempFile();
              continue;
            }

            const conversion = convertFileToMarkdownWithMarkitdown({
              command: markitdown.command,
              args: markitdown.args,
              sourcePath: tempPath,
            });

            if (!conversion.success) {
              results.push({
                originalName: safeOriginalName,
                extension,
                success: false,
                mode: 'markitdown',
                error: conversion.error,
              });
              cleanupTempFile();
              continue;
            }

            try {
              fs.writeFileSync(target.absolutePath, conversion.content, 'utf8');
              results.push({
                originalName: safeOriginalName,
                extension,
                success: true,
                mode: 'markitdown',
                savedName: target.fileName,
                savedPath: `src/docs/${target.fileName}`,
              });
            } catch (writeError: any) {
              results.push({
                originalName: safeOriginalName,
                extension,
                success: false,
                mode: 'markitdown',
                error: writeError?.message || 'Failed to write converted markdown',
              });
            } finally {
              cleanupTempFile();
            }
          }

          const successCount = results.filter((item) => item.success).length;
          const failedCount = results.length - successCount;
          const hasSuccess = successCount > 0;

          res.statusCode = hasSuccess ? 200 : 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            success: failedCount === 0,
            successCount,
            failedCount,
            commandSource: markitdown.commandSource,
            markitdownInstalled: markitdown.installed,
            markitdownError: markitdown.error,
            results,
          }));
        });
      });
    },
  };
}

// 提供 /api/docs 端点的插件
function docsApiPlugin(): Plugin {
  return {
    name: 'docs-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (!pathname.startsWith('/api/docs')) {
          return next();
        }
        const docsDir = path.resolve(__dirname, 'src/docs');

        // POST /api/docs/manual-create - 手动创建文档
        if (
          req.method === 'POST' &&
          (pathname === '/api/docs/manual-create' || pathname === '/api/docs/manual-create/' || pathname === '/manual-create')
        ) {
          try {
            const body = await readJsonBody(req);
            const displayName = String(body?.displayName || '').trim();
            const fileNameInput = String(body?.fileName || body?.displayName || '').trim();

            if (!displayName) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing displayName' }));
              return;
            }

            fs.mkdirSync(docsDir, { recursive: true });

            const fallbackBase = `doc-${Date.now().toString(36)}`;
            const sanitizedBase = sanitizeDocBaseName(fileNameInput || displayName) || fallbackBase;
            let baseName = sanitizedBase;
            let suffix = 2;
            while (fs.existsSync(path.join(docsDir, `${baseName}.md`))) {
              baseName = `${sanitizedBase}-${suffix}`;
              suffix += 1;
            }

            const docFileName = `${baseName}.md`;
            const docPath = path.join(docsDir, docFileName);

            if (!docPath.startsWith(docsDir)) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            fs.writeFileSync(docPath, createManualDocTemplate(displayName), 'utf8');

            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              success: true,
              name: docFileName,
              displayName,
              path: `src/docs/${docFileName}`,
            }));
          } catch (error: any) {
            console.error('Error manual creating doc:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Create doc failed' }));
          }
          return;
        }

        // POST /api/docs/:name/copy - 复制文档
        if (req.method === 'POST' && pathname.startsWith('/api/docs/') && pathname.endsWith('/copy')) {
          try {
            const encodedDocName = pathname.slice('/api/docs/'.length, -'/copy'.length);
            const docName = decodeURIComponent(encodedDocName);
            if (!docName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing document name' }));
              return;
            }

            const sourcePath = path.join(docsDir, docName);
            if (!sourcePath.startsWith(docsDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(sourcePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Document not found' }));
              return;
            }

            const sourceDir = path.dirname(sourcePath);
            const ext = path.extname(sourcePath);
            const sourceBaseName = path.basename(sourcePath, ext);
            const safeBaseName = sanitizeDocBaseName(sourceBaseName) || sourceBaseName;
            const candidateBase = `${safeBaseName}-copy`;

            let nextBaseName = candidateBase;
            let suffix = 2;
            let nextName = `${nextBaseName}${ext}`;
            let nextPath = path.join(sourceDir, nextName);
            while (fs.existsSync(nextPath)) {
              nextBaseName = `${candidateBase}${suffix}`;
              nextName = `${nextBaseName}${ext}`;
              nextPath = path.join(sourceDir, nextName);
              suffix += 1;
            }

            if (!nextPath.startsWith(docsDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            fs.copyFileSync(sourcePath, nextPath);

            const relativeName = path.relative(docsDir, nextPath).split(path.sep).join('/');
            const relativeDisplayName = relativeName.replace(/\.[^./\\]+$/u, '');

            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              success: true,
              name: relativeName,
              displayName: relativeDisplayName,
              path: `src/docs/${relativeName}`,
            }));
          } catch (error: any) {
            console.error('Error copying doc:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Copy doc failed' }));
          }
          return;
        }

        // DELETE /api/docs/:name - 删除文档
        if (req.method === 'DELETE' && pathname.startsWith('/api/docs/')) {
          try {
            const encodedDocName = pathname.replace('/api/docs/', '');
            const docName = decodeURIComponent(encodedDocName);
            if (!docName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing document name' }));
              return;
            }
            const docPath = path.join(docsDir, docName);

            // 安全检查
            if (!docPath.startsWith(docsDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            if (!fs.existsSync(docPath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Document not found' }));
              return;
            }

            fs.unlinkSync(docPath);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (error: any) {
            console.error('Error deleting doc:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        if (req.method === 'PUT' && pathname.startsWith('/api/docs/')) {
          try {
            const encodedDocName = pathname.replace('/api/docs/', '');
            if (!encodedDocName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing document name' }));
              return;
            }

            const bodyData = await readJsonBody(req);
            const hasContentUpdate = typeof bodyData?.content === 'string';
            let newBaseName = String(bodyData?.newBaseName || '').trim();
            const hasRename = Boolean(newBaseName);
            if (!hasContentUpdate && !hasRename) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing content or newBaseName parameter' }));
              return;
            }
            if (hasRename && /[/\\:*?"<>|]/.test(newBaseName)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid newBaseName format' }));
              return;
            }

            const docName = decodeURIComponent(encodedDocName);
            const oldPath = path.join(docsDir, docName);
            if (!oldPath.startsWith(docsDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(oldPath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Document not found' }));
              return;
            }

            let finalPath = oldPath;
            if (hasRename) {
              const ext = path.extname(oldPath);
              if (ext && newBaseName.toLowerCase().endsWith(ext.toLowerCase())) {
                newBaseName = newBaseName.slice(0, -ext.length).trim();
              }
              const safeBaseName = sanitizeDocBaseName(newBaseName);
              if (!safeBaseName) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid newBaseName format' }));
                return;
              }

              const oldDir = path.dirname(oldPath);
              const newFileName = `${safeBaseName}${ext}`;
              const newPath = path.join(oldDir, newFileName);

              if (!newPath.startsWith(docsDir)) {
                res.statusCode = 403;
                res.end(JSON.stringify({ error: 'Forbidden' }));
                return;
              }
              if (newPath !== oldPath && fs.existsSync(newPath)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: '目标文件已存在' }));
                return;
              }

              if (newPath !== oldPath) {
                fs.renameSync(oldPath, newPath);
              }
              finalPath = newPath;
            }

            if (hasContentUpdate) {
              fs.writeFileSync(finalPath, String(bodyData.content), 'utf8');
            }

            const relativeName = path.relative(docsDir, finalPath).split(path.sep).join('/');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, name: relativeName }));
          } catch (error: any) {
            console.error('Error updating doc:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        // GET 请求处理
        if (req.method !== 'GET') {
          return next();
        }

        // 处理 /api/docs/:name 端点用于获取单个文档内容
        if (pathname.startsWith('/api/docs/') && pathname !== '/api/docs' && pathname !== '/api/docs/') {
          try {
            const encodedDocName = pathname.replace('/api/docs/', '');
            if (!encodedDocName) {
              return next();
            }

            // 解码 URL 编码的文件名
            const docName = decodeURIComponent(encodedDocName);
            // 直接使用文件名（已包含扩展名）
            const docPath = path.join(docsDir, docName);

            // 安全检查：确保路径在 src/docs 目录内
            if (!docPath.startsWith(docsDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            if (fs.existsSync(docPath)) {
              const content = fs.readFileSync(docPath, 'utf8');
              // 根据文件扩展名设置 Content-Type
              const ext = path.extname(docPath);
              const contentTypeMap: Record<string, string> = {
                '.md': 'text/markdown; charset=utf-8',
                '.csv': 'text/csv; charset=utf-8',
                '.json': 'application/json; charset=utf-8',
                '.yaml': 'text/yaml; charset=utf-8',
                '.yml': 'text/yaml; charset=utf-8',
                '.txt': 'text/plain; charset=utf-8'
              };
              res.setHeader('Content-Type', contentTypeMap[ext] || 'text/plain; charset=utf-8');
              res.end(content);
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Document not found' }));
            }
          } catch (error: any) {
            console.error('Error loading doc:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        // 处理 /api/docs 端点用于获取文档列表
        if (pathname === '/api/docs' || pathname === '/api/docs/') {
          try {
            const docs: any[] = [];
            // 支持的文档格式
            const supportedExtensions = ['.md', '.csv', '.json', '.yaml', '.yml', '.txt'];

            if (fs.existsSync(docsDir)) {
              const walkDocsDir = (dirPath: string) => {
                const items = fs.readdirSync(dirPath, { withFileTypes: true });
                items.forEach((item) => {
                  const fullPath = path.join(dirPath, item.name);
                  if (item.isDirectory()) {
                    walkDocsDir(fullPath);
                    return;
                  }
                  if (!item.isFile()) {
                    return;
                  }
                  const ext = path.extname(item.name).toLowerCase();
                  if (!supportedExtensions.includes(ext)) {
                    return;
                  }
                  const relativePath = path.relative(docsDir, fullPath).split(path.sep).join('/');
                  docs.push({
                    name: relativePath,
                    displayName: relativePath,
                  });
                });
              };
              walkDocsDir(docsDir);
            }

            docs.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(docs));
          } catch (error: any) {
            console.error('Error loading docs:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        next();
      });
    }
  };
}

function canvasApiPlugin(): Plugin {
  const CANVAS_EXT = '.excalidraw';
  const DEFAULT_CANVAS_DATA = JSON.stringify({
    type: 'excalidraw',
    version: 2,
    source: 'axhub-make',
    elements: [],
    appState: { gridSize: null, viewBackgroundColor: '#ffffff' },
    files: {},
  }, null, 2);

  return {
    name: 'canvas-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (!pathname.startsWith('/api/canvas')) {
          return next();
        }
        const canvasDir = path.resolve(__dirname, 'src/canvas');

        // POST /api/canvas/create
        if (
          req.method === 'POST' &&
          (pathname === '/api/canvas/create' || pathname === '/api/canvas/create/')
        ) {
          try {
            const body = await readJsonBody(req);
            const displayName = String(body?.displayName || '').trim();

            fs.mkdirSync(canvasDir, { recursive: true });

            const fallbackBase = `canvas-${Date.now().toString(36)}`;
            const sanitizedBase = sanitizeDocBaseName(displayName || fallbackBase) || fallbackBase;
            let baseName = sanitizedBase;
            let suffix = 2;
            while (fs.existsSync(path.join(canvasDir, `${baseName}${CANVAS_EXT}`))) {
              baseName = `${sanitizedBase}-${suffix}`;
              suffix += 1;
            }

            const fileName = `${baseName}${CANVAS_EXT}`;
            const filePath = path.join(canvasDir, fileName);

            if (!filePath.startsWith(canvasDir)) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            fs.writeFileSync(filePath, DEFAULT_CANVAS_DATA, 'utf8');

            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              success: true,
              name: fileName,
              displayName: baseName,
              path: `src/canvas/${fileName}`,
            }));
          } catch (error: any) {
            console.error('Error creating canvas:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Create canvas failed' }));
          }
          return;
        }

        // POST /api/canvas/:name/copy
        if (req.method === 'POST' && pathname.startsWith('/api/canvas/') && pathname.endsWith('/copy')) {
          try {
            const encodedName = pathname.slice('/api/canvas/'.length, -'/copy'.length);
            const canvasName = decodeURIComponent(encodedName);
            if (!canvasName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing canvas name' }));
              return;
            }

            const sourcePath = path.join(canvasDir, canvasName);
            if (!sourcePath.startsWith(canvasDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(sourcePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Canvas not found' }));
              return;
            }

            const sourceBaseName = path.basename(sourcePath, CANVAS_EXT);
            const safeBaseName = sanitizeDocBaseName(sourceBaseName) || sourceBaseName;
            const candidateBase = `${safeBaseName}-copy`;

            let nextBaseName = candidateBase;
            let suffix = 2;
            let nextName = `${nextBaseName}${CANVAS_EXT}`;
            let nextPath = path.join(canvasDir, nextName);
            while (fs.existsSync(nextPath)) {
              nextBaseName = `${candidateBase}${suffix}`;
              nextName = `${nextBaseName}${CANVAS_EXT}`;
              nextPath = path.join(canvasDir, nextName);
              suffix += 1;
            }

            if (!nextPath.startsWith(canvasDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            fs.copyFileSync(sourcePath, nextPath);

            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              success: true,
              name: nextName,
              displayName: nextBaseName,
              path: `src/canvas/${nextName}`,
            }));
          } catch (error: any) {
            console.error('Error copying canvas:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Copy canvas failed' }));
          }
          return;
        }

        // DELETE /api/canvas/:name
        if (req.method === 'DELETE' && pathname.startsWith('/api/canvas/')) {
          try {
            const encodedName = pathname.replace('/api/canvas/', '');
            const canvasName = decodeURIComponent(encodedName);
            if (!canvasName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing canvas name' }));
              return;
            }
            const filePath = path.join(canvasDir, canvasName);

            if (!filePath.startsWith(canvasDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Canvas not found' }));
              return;
            }

            fs.unlinkSync(filePath);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (error: any) {
            console.error('Error deleting canvas:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        // PUT /api/canvas/:name
        if (req.method === 'PUT' && pathname.startsWith('/api/canvas/')) {
          try {
            const encodedName = pathname.replace('/api/canvas/', '');
            if (!encodedName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing canvas name' }));
              return;
            }

            const bodyData = await readJsonBody(req);
            const hasContentUpdate = typeof bodyData?.content === 'string';
            let newBaseName = String(bodyData?.newBaseName || '').trim();
            const hasRename = Boolean(newBaseName);

            if (!hasContentUpdate && !hasRename) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing content or newBaseName parameter' }));
              return;
            }
            if (hasRename && /[/\\:*?"<>|]/.test(newBaseName)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid newBaseName format' }));
              return;
            }

            const canvasName = decodeURIComponent(encodedName);
            const oldPath = path.join(canvasDir, canvasName);
            if (!oldPath.startsWith(canvasDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(oldPath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Canvas not found' }));
              return;
            }

            let finalPath = oldPath;
            if (hasRename) {
              if (newBaseName.toLowerCase().endsWith(CANVAS_EXT)) {
                newBaseName = newBaseName.slice(0, -CANVAS_EXT.length).trim();
              }
              const safeBaseName = sanitizeDocBaseName(newBaseName);
              if (!safeBaseName) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid newBaseName format' }));
                return;
              }

              const newFileName = `${safeBaseName}${CANVAS_EXT}`;
              const newPath = path.join(canvasDir, newFileName);

              if (!newPath.startsWith(canvasDir)) {
                res.statusCode = 403;
                res.end(JSON.stringify({ error: 'Forbidden' }));
                return;
              }
              if (newPath !== oldPath && fs.existsSync(newPath)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: '目标文件已存在' }));
                return;
              }

              if (newPath !== oldPath) {
                fs.renameSync(oldPath, newPath);
              }
              finalPath = newPath;
            }

            if (hasContentUpdate) {
              fs.writeFileSync(finalPath, String(bodyData.content), 'utf8');
            }

            const relativeName = path.basename(finalPath);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, name: relativeName }));
          } catch (error: any) {
            console.error('Error updating canvas:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        // GET requests
        if (req.method !== 'GET') {
          return next();
        }

        // GET /api/canvas/:name
        if (pathname.startsWith('/api/canvas/') && pathname !== '/api/canvas' && pathname !== '/api/canvas/') {
          try {
            const encodedName = pathname.replace('/api/canvas/', '');
            if (!encodedName) {
              return next();
            }

            const canvasName = decodeURIComponent(encodedName);
            const filePath = path.join(canvasDir, canvasName);

            if (!filePath.startsWith(canvasDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath, 'utf8');
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(content);
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Canvas not found' }));
            }
          } catch (error: any) {
            console.error('Error loading canvas:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        // GET /api/canvas - list all canvases
        if (pathname === '/api/canvas' || pathname === '/api/canvas/') {
          try {
            const items: Array<{ name: string; displayName: string }> = [];

            if (fs.existsSync(canvasDir)) {
              const entries = fs.readdirSync(canvasDir, { withFileTypes: true });
              entries.forEach((entry) => {
                if (!entry.isFile()) return;
                if (!entry.name.endsWith(CANVAS_EXT)) return;
                const baseName = entry.name.slice(0, -CANVAS_EXT.length);
                items.push({
                  name: entry.name,
                  displayName: baseName,
                });
              });
            }

            items.sort((a, b) => a.name.localeCompare(b.name));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(items));
          } catch (error: any) {
            console.error('Error listing canvases:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        next();
      });
    },
  };
}

// 提供 /api/templates 端点的插件
function templatesApiPlugin(): Plugin {
  return {
    name: 'templates-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (!pathname.startsWith('/api/templates')) {
          return next();
        }

        const templatesDir = path.resolve(__dirname, 'assets/templates');

        if (req.method === 'POST' && (pathname === '/api/templates' || pathname === '/api/templates/')) {
          try {
            const body = await readJsonBody(req);
            const displayName = String(body?.displayName || '').trim();
            const fileNameInput = String(body?.fileName || body?.displayName || '').trim();

            if (!displayName) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing displayName' }));
              return;
            }

            fs.mkdirSync(templatesDir, { recursive: true });
            const fallbackBase = `template-${Date.now().toString(36)}`;
            const sanitizedBase = sanitizeDocBaseName(fileNameInput || displayName) || fallbackBase;
            let baseName = sanitizedBase;
            let suffix = 2;
            while (fs.existsSync(path.join(templatesDir, `${baseName}.md`))) {
              baseName = `${sanitizedBase}-${suffix}`;
              suffix += 1;
            }

            const templateFileName = `${baseName}.md`;
            const templatePath = path.join(templatesDir, templateFileName);
            if (!templatePath.startsWith(templatesDir)) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            fs.writeFileSync(templatePath, createManualDocTemplate(displayName), 'utf8');

            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              success: true,
              name: templateFileName,
              displayName: templateFileName.replace(/\.[^./\\]+$/u, ''),
              path: `assets/templates/${templateFileName}`,
            }));
          } catch (error: any) {
            console.error('Error creating template:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Create template failed' }));
          }
          return;
        }

        if (req.method === 'POST' && pathname.startsWith('/api/templates/') && pathname.endsWith('/copy')) {
          try {
            const encodedTemplateName = pathname.slice('/api/templates/'.length, -'/copy'.length);
            const templateName = decodeURIComponent(encodedTemplateName);
            if (!templateName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing template name' }));
              return;
            }

            const sourcePath = path.join(templatesDir, templateName);
            if (!sourcePath.startsWith(templatesDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(sourcePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Template not found' }));
              return;
            }

            const sourceDir = path.dirname(sourcePath);
            const ext = path.extname(sourcePath);
            const sourceBaseName = path.basename(sourcePath, ext);
            const safeBaseName = sanitizeDocBaseName(sourceBaseName) || sourceBaseName;
            const candidateBase = `${safeBaseName}-copy`;

            let nextBaseName = candidateBase;
            let suffix = 2;
            let nextName = `${nextBaseName}${ext}`;
            let nextPath = path.join(sourceDir, nextName);
            while (fs.existsSync(nextPath)) {
              nextBaseName = `${candidateBase}${suffix}`;
              nextName = `${nextBaseName}${ext}`;
              nextPath = path.join(sourceDir, nextName);
              suffix += 1;
            }

            if (!nextPath.startsWith(templatesDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            fs.copyFileSync(sourcePath, nextPath);

            const relativeName = path.relative(templatesDir, nextPath).split(path.sep).join('/');
            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              success: true,
              name: relativeName,
              displayName: relativeName.replace(/\.[^./\\]+$/u, ''),
              path: `assets/templates/${relativeName}`,
            }));
          } catch (error: any) {
            console.error('Error copying template:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Copy template failed' }));
          }
          return;
        }

        if (req.method === 'DELETE' && pathname.startsWith('/api/templates/') && pathname !== '/api/templates/' && pathname !== '/api/templates') {
          try {
            const encodedTemplateName = pathname.replace('/api/templates/', '');
            const templateName = decodeURIComponent(encodedTemplateName);
            const templatePath = path.join(templatesDir, templateName);

            if (!templatePath.startsWith(templatesDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(templatePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Template not found' }));
              return;
            }

            fs.unlinkSync(templatePath);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: true }));
          } catch (error: any) {
            console.error('Error deleting template:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error?.message || 'Delete template failed' }));
          }
          return;
        }

        if (req.method === 'PUT' && pathname.startsWith('/api/templates/') && pathname !== '/api/templates/' && pathname !== '/api/templates') {
          try {
            const encodedTemplateName = pathname.replace('/api/templates/', '');
            if (!encodedTemplateName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing template name' }));
              return;
            }

            const bodyData = await readJsonBody(req);
            const hasContentUpdate = typeof bodyData?.content === 'string';
            let newBaseName = String(bodyData?.newBaseName || '').trim();
            const hasRename = Boolean(newBaseName);
            if (!hasContentUpdate && !hasRename) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing content or newBaseName parameter' }));
              return;
            }
            if (hasRename && /[/\\:*?"<>|]/.test(newBaseName)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid newBaseName format' }));
              return;
            }

            const templateName = decodeURIComponent(encodedTemplateName);
            const oldPath = path.join(templatesDir, templateName);
            if (!oldPath.startsWith(templatesDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(oldPath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Template not found' }));
              return;
            }
            if (hasRename && isProtectedTemplateName(templateName)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: '系统模板不支持重命名' }));
              return;
            }

            let finalPath = oldPath;
            if (hasRename) {
              const ext = path.extname(oldPath);
              if (ext && newBaseName.toLowerCase().endsWith(ext.toLowerCase())) {
                newBaseName = newBaseName.slice(0, -ext.length).trim();
              }
              const safeBaseName = sanitizeDocBaseName(newBaseName);
              if (!safeBaseName) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid newBaseName format' }));
                return;
              }

              const oldDir = path.dirname(oldPath);
              const newFileName = `${safeBaseName}${ext}`;
              const newPath = path.join(oldDir, newFileName);
              if (!newPath.startsWith(templatesDir)) {
                res.statusCode = 403;
                res.end(JSON.stringify({ error: 'Forbidden' }));
                return;
              }
              if (newPath !== oldPath && fs.existsSync(newPath)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: '目标文件已存在' }));
                return;
              }
              if (newPath !== oldPath) {
                fs.renameSync(oldPath, newPath);
              }
              finalPath = newPath;
            }

            if (hasContentUpdate) {
              fs.writeFileSync(finalPath, String(bodyData.content), 'utf8');
            }

            const relativeName = path.relative(templatesDir, finalPath).split(path.sep).join('/');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: true, name: relativeName }));
          } catch (error: any) {
            console.error('Error updating template:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error?.message || 'Update template failed' }));
          }
          return;
        }

        if (req.method !== 'GET') {
          return next();
        }

        if (pathname.startsWith('/api/templates/') && pathname !== '/api/templates/' && pathname !== '/api/templates') {
          try {
            const encodedTemplateName = pathname.replace('/api/templates/', '');
            const templateName = decodeURIComponent(encodedTemplateName);
            const templatePath = path.join(templatesDir, templateName);
            if (!templatePath.startsWith(templatesDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            if (!fs.existsSync(templatePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Template not found' }));
              return;
            }
            const content = fs.readFileSync(templatePath, 'utf8');
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            res.end(content);
          } catch (error: any) {
            console.error('Error loading template:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error?.message || 'Load template failed' }));
          }
          return;
        }

        if (pathname !== '/api/templates' && pathname !== '/api/templates/') {
          return next();
        }

        try {
          const templates = listTemplateAssets(templatesDir);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(templates));
        } catch (error: any) {
          console.error('Error loading templates:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    }
  };
}

function uploadDocsApiPlugin(): Plugin {
  return {
    name: 'upload-docs-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (req.method !== 'POST' || pathname !== '/api/upload-docs') {
          return next();
        }

        const chunks: Buffer[] = [];
        let totalLength = 0;

        req.on('data', (chunk: Buffer) => {
          totalLength += chunk.length;
          if (totalLength > 1024 * 1024 * 20) {
            res.statusCode = 413;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Payload too large' }));
            req.destroy();
            return;
          }
          chunks.push(chunk);
        });

        req.on('end', () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf8');
            const body = raw ? JSON.parse(raw) : null;
            const files = body?.files;

            if (!Array.isArray(files) || files.length === 0) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing files' }));
              return;
            }

            const docsDir = path.resolve(__dirname, 'src/docs');
            fs.mkdirSync(docsDir, { recursive: true });

            const saved: string[] = [];

            files.forEach((f: any) => {
              const rawName = typeof f?.name === 'string' ? f.name : '';
              const content = typeof f?.content === 'string' ? f.content : '';

              if (!rawName) {
                throw new Error('Invalid file name');
              }

              let safeName = path.basename(rawName).trim();
              safeName = safeName.replace(/[^\w.\- ]+/g, '-').replace(/\s+/g, '-');
              
              const lowerName = safeName.toLowerCase();
              if (!lowerName.endsWith('.md') && !lowerName.endsWith('.csv') && !lowerName.endsWith('.json')) {
                throw new Error('Only .md, .csv, and .json files are allowed');
              }

              const targetPath = path.join(docsDir, safeName);
              if (!targetPath.startsWith(docsDir)) {
                throw new Error('Forbidden');
              }

              fs.writeFileSync(targetPath, content, 'utf8');
              saved.push(safeName.replace(/\.(md|csv|json)$/i, ''));
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: true, files: saved }));
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: e?.message || 'Upload failed' }));
          }
        });
      });
    }
  };
}

function sourceApiPlugin(): Plugin {
  return {
    name: 'source-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.method !== 'GET' || !req.url.startsWith('/api/source')) {
          return next();
        }

        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const targetPath = url.searchParams.get('path'); // e.g., 'prototypes/ref-app-home' or 'components/button'

          if (!targetPath) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing path parameter' }));
            return;
          }

          // Validate path to prevent directory traversal
          if (targetPath.includes('..') || targetPath.startsWith('/')) {
            res.statusCode = 403;
            res.end(JSON.stringify({ error: 'Invalid path' }));
            return;
          }

          // 构建源文件路径
          const sourceFile = path.resolve(__dirname, 'src', targetPath, 'index.tsx');

          if (!fs.existsSync(sourceFile)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Source file not found' }));
            return;
          }

          // 读取并返回原始源代码
          const sourceCode = fs.readFileSync(sourceFile, 'utf8');
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(sourceCode);
        } catch (e: any) {
          console.error('Source file error:', e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    }
  };
}

function specDocApiPlugin(): Plugin {
  return {
    name: 'spec-doc-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (req.method === 'POST' && pathname === '/api/spec-doc/upload-image') {
          const uploadDir = path.resolve(__dirname, 'temp', 'spec-doc-images');
          fs.mkdirSync(uploadDir, { recursive: true });

          const form = formidable({
            uploadDir,
            keepExtensions: true,
            multiples: false,
            maxFileSize: SPEC_DOC_IMAGE_MAX_FILE_SIZE,
          });

          form.parse(req, (parseError: any, fields: any, files: any) => {
            const removeTempFile = (tempPath: string) => {
              if (!tempPath) return;
              try {
                if (fs.existsSync(tempPath)) {
                  fs.unlinkSync(tempPath);
                }
              } catch {
                // ignore cleanup errors
              }
            };

            if (parseError) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: parseError?.message || 'Failed to parse multipart payload' }));
              return;
            }

            const docUrlField = Array.isArray(fields?.docUrl) ? fields.docUrl[0] : fields?.docUrl;
            const docUrl = String(docUrlField || '').trim();
            if (!docUrl) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing docUrl' }));
              return;
            }

            const uploadedFileValue = files?.file ?? files?.files;
            const uploadedFile = Array.isArray(uploadedFileValue) ? uploadedFileValue[0] : uploadedFileValue;
            if (!uploadedFile) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing file' }));
              return;
            }

            const tempPath = String(uploadedFile?.filepath || uploadedFile?.path || '').trim();
            if (!tempPath || !fs.existsSync(tempPath)) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Uploaded file is missing from temporary storage' }));
              return;
            }

            try {
              const resolved = resolveDocumentPathFromDocUrl(docUrl, req.headers.host);
              if ('status' in resolved) {
                res.statusCode = resolved.status;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: resolved.error }));
                return;
              }

              if (!fs.existsSync(resolved.docPath)) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Document not found' }));
                return;
              }

              const originalName = String(
                uploadedFile?.originalFilename || uploadedFile?.newFilename || uploadedFile?.name || path.basename(tempPath),
              ).trim();
              const mimeType = String(uploadedFile?.mimetype || uploadedFile?.type || '').toLowerCase();
              const originalExt = path.extname(originalName).toLowerCase();
              const extByMime = SPEC_DOC_IMAGE_MIME_TO_EXTENSION[mimeType] || '';
              const normalizedExt = SPEC_DOC_IMAGE_ALLOWED_EXTENSIONS.has(originalExt)
                ? originalExt
                : extByMime;

              if (!mimeType.startsWith('image/') && !SPEC_DOC_IMAGE_ALLOWED_EXTENSIONS.has(originalExt)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Only image files are allowed' }));
                return;
              }
              if (!normalizedExt || !SPEC_DOC_IMAGE_ALLOWED_EXTENSIONS.has(normalizedExt)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Unsupported image type' }));
                return;
              }

              const docDir = path.dirname(resolved.docPath);
              const imagesDir = path.join(docDir, 'assets', 'images');
              fs.mkdirSync(imagesDir, { recursive: true });

              const safeFileName = sanitizeImageUploadFileName(
                originalName || `image${normalizedExt}`,
                mimeType,
              );
              const finalPath = resolveUniqueFilePath(imagesDir, safeFileName);
              if (!isPathInside(imagesDir, finalPath)) {
                res.statusCode = 403;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Forbidden path' }));
                return;
              }

              fs.copyFileSync(tempPath, finalPath);

              const relativePath = path.relative(__dirname, finalPath).split(path.sep).join('/');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({
                success: true,
                url: `assets/images/${path.basename(finalPath)}`,
                path: relativePath,
              }));
            } catch (error: any) {
              console.error('Error uploading spec doc image:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: error?.message || 'Image upload failed' }));
            } finally {
              removeTempFile(tempPath);
            }
          });
          return;
        }

        if (req.method !== 'POST' || pathname !== '/api/spec-doc/save') {
          return next();
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const bodyText = Buffer.concat(chunks).toString('utf8');
            const body = bodyText ? JSON.parse(bodyText) : {};
            const docUrl = typeof body?.docUrl === 'string' ? body.docUrl : '';
            const content = typeof body?.content === 'string' ? body.content : '';

            if (!docUrl) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Missing docUrl' }));
              return;
            }

            const resolved = resolveDocumentPathFromDocUrl(docUrl, req.headers.host);
            if ('status' in resolved) {
              res.statusCode = resolved.status;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: resolved.error }));
              return;
            }

            const srcRoot = path.resolve(__dirname, 'src');
            const relativeToSrc = path.relative(srcRoot, resolved.docPath).split(path.sep).join('/');
            const [entryType] = relativeToSrc.split('/');
            const fileName = path.basename(resolved.docPath).toLowerCase();
            const isAllowedEntryType = ['components', 'prototypes', 'themes'].includes(entryType || '');
            const isSpecFile = fileName === 'spec.md' || fileName === 'prd.md';
            if (!isAllowedEntryType || !isSpecFile) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Only spec.md/prd.md under components/prototypes/themes can be saved' }));
              return;
            }

            if (!fs.existsSync(resolved.docPath)) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Document not found' }));
              return;
            }

            fs.writeFileSync(resolved.docPath, content, 'utf8');

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: true, path: `/${relativeToSrc}` }));
          } catch (error: any) {
            console.error('Error saving spec doc:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error?.message || 'Save failed' }));
          }
        });
      });
    }
  };
}

function unsetReferenceApiPlugin(): Plugin {
  return {
    name: 'unset-reference-api-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/unset-reference', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', () => {
          try {
            const { path: targetPath } = JSON.parse(body);
            
            if (!targetPath) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing path parameter' }));
              return;
            }

            // Validate path
            if (targetPath.includes('..') || targetPath.startsWith('/')) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Invalid path' }));
              return;
            }

            const srcDir = path.resolve(__dirname, 'src', targetPath);

            if (!fs.existsSync(srcDir)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Directory not found' }));
              return;
            }

            // Check if this is a reference item
            const folderName = path.basename(srcDir);
            if (!folderName.startsWith('ref-')) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '该项目不是参考项目' }));
              return;
            }

            // Rename folder: remove 'ref-' prefix
            const newFolderName = folderName.substring(4); // Remove 'ref-'
            const parentDir = path.dirname(srcDir);
            const newSrcDir = path.join(parentDir, newFolderName);

            // Check if target name already exists
            if (fs.existsSync(newSrcDir)) {
              res.statusCode = 409;
              res.end(JSON.stringify({ error: '同名项目已存在' }));
              return;
            }

            fs.renameSync(srcDir, newSrcDir);

            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
          } catch (e: any) {
            console.error('Unset reference error:', e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    }
  };
}

function themesApiPlugin(): Plugin {
  return {
    name: 'themes-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (!pathname.startsWith('/api/themes')) {
          return next();
        }

        // DELETE /api/themes/:name - 删除主题
        if (req.method === 'DELETE' && pathname !== '/api/themes' && pathname !== '/api/themes/') {
          try {
            const themeName = pathname.replace('/api/themes/', '');
            if (!themeName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing theme name' }));
              return;
            }

            const themesDir = path.resolve(__dirname, 'src/themes');
            const themeDir = path.join(themesDir, themeName);

            // 安全检查
            if (!themeDir.startsWith(themesDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            if (!fs.existsSync(themeDir)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Theme not found' }));
              return;
            }

            fs.rmSync(themeDir, { recursive: true, force: true });
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (error: any) {
            console.error('Error deleting theme:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        // PUT /api/themes/:name - 更新主题显示名称
        if (req.method === 'PUT' && pathname !== '/api/themes' && pathname !== '/api/themes/') {
          (async () => {
            try {
              const themeName = pathname.replace('/api/themes/', '');
              if (!themeName) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing theme name' }));
                return;
              }

              const body = await readJsonBody(req);
              const displayName = (body?.displayName || '').trim();
              if (!displayName) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing displayName' }));
                return;
              }

              const themesDir = path.resolve(__dirname, 'src/themes');
              const themeDir = path.join(themesDir, themeName);

              if (!themeDir.startsWith(themesDir)) {
                res.statusCode = 403;
                res.end(JSON.stringify({ error: 'Forbidden' }));
                return;
              }

              if (!fs.existsSync(themeDir)) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Theme not found' }));
                return;
              }

              const designTokenPath = path.join(themeDir, 'designToken.json');
              let designToken: any = {};
              if (fs.existsSync(designTokenPath)) {
                try {
                  designToken = JSON.parse(fs.readFileSync(designTokenPath, 'utf8'));
                } catch (error: any) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: error.message || 'Invalid designToken.json' }));
                  return;
                }
              }

              designToken.name = displayName;
              fs.writeFileSync(designTokenPath, JSON.stringify(designToken, null, 2));

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (error: any) {
              console.error('Error updating theme name:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: error.message }));
            }
          })();
          return;
        }

        // GET 请求处理
        if (req.method !== 'GET') {
          return next();
        }

        // 处理 /api/themes/:name 端点用于获取单个主题内容
        if (pathname !== '/api/themes' && pathname !== '/api/themes/') {
          try {
            const themeName = pathname.replace('/api/themes/', '');
            if (!themeName) {
              return next();
            }

            const themesDir = path.resolve(__dirname, 'src/themes');
            const themeDir = path.join(themesDir, themeName);

            // 安全检查：确保路径在 themes 目录内
            if (!themeDir.startsWith(themesDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            if (fs.existsSync(themeDir) && fs.statSync(themeDir).isDirectory()) {
              const designTokenPath = path.join(themeDir, 'designToken.json');
              const indexHtmlPath = path.join(themeDir, 'index.html');
              
              const themeData: any = { name: themeName, displayName: themeName };
              
              if (fs.existsSync(designTokenPath)) {
                try {
                  const designToken = JSON.parse(fs.readFileSync(designTokenPath, 'utf8'));
                  themeData.designToken = designToken;
                  if (designToken && designToken.name) {
                    themeData.displayName = designToken.name;
                  }
                } catch (e) {
                  console.error('Error parsing designToken.json:', e);
                }
              }
              
              if (fs.existsSync(indexHtmlPath)) {
                themeData.indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
              }
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(themeData));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Theme not found' }));
            }
          } catch (error: any) {
            console.error('Error loading theme:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        // 处理 /api/themes 端点用于获取主题列表
        try {
          const themesDir = path.resolve(__dirname, 'src/themes');
          const themes: any[] = [];

          if (fs.existsSync(themesDir)) {
            const items = fs.readdirSync(themesDir, { withFileTypes: true });
            
            items.forEach(item => {
              // 只读取第一层目录
              if (item.isDirectory()) {
                const themeDir = path.join(themesDir, item.name);
                const designTokenPath = path.join(themeDir, 'designToken.json');
                const globalsPath = path.join(themeDir, 'globals.css');
                const designSpecPath = path.join(themeDir, 'DESIGN-SPEC.md');
                const indexTsxPath = path.join(themeDir, 'index.tsx');
                let displayName = item.name;
                const hasDesignToken = fs.existsSync(designTokenPath);
                const hasGlobals = fs.existsSync(globalsPath);
                const hasDesignSpec = fs.existsSync(designSpecPath);
                const hasIndexTsx = fs.existsSync(indexTsxPath);

                if (hasDesignToken) {
                  try {
                    const designToken = JSON.parse(fs.readFileSync(designTokenPath, 'utf8'));
                    if (designToken && designToken.name) {
                      displayName = designToken.name;
                    }
                  } catch (e) {
                    console.error(`Error loading theme ${item.name} designToken:`, e);
                  }
                }

                // 尝试读取主题描述（如果有 README.md 或 DESIGN-SPEC.md）
                let description = '';
                let hasDoc = false;
                const readmePath = path.join(themeDir, 'README.md');

                if (fs.existsSync(readmePath)) {
                  try {
                    const content = fs.readFileSync(readmePath, 'utf8');
                    const firstLine = content.split('\n')[0];
                    description = firstLine.replace(/^#\s*/, '').trim();
                    hasDoc = true;
                  } catch (error) {
                    console.warn(`Failed to read README.md for ${item.name}:`, error);
                  }
                } else if (fs.existsSync(designSpecPath)) {
                  try {
                    const content = fs.readFileSync(designSpecPath, 'utf8');
                    const firstLine = content.split('\n')[0];
                    description = firstLine.replace(/^#\s*/, '').trim();
                    hasDoc = true;
                  } catch (error) {
                    console.warn(`Failed to read DESIGN-SPEC.md for ${item.name}:`, error);
                  }
                }

                themes.push({
                  name: item.name,
                  displayName: displayName,
                  description,
                  hasDoc,
                  hasDesignToken,
                  hasGlobals,
                  hasDesignSpec,
                  hasIndexTsx,
                });
              }
            });
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(themes));
        } catch (error: any) {
          console.error('Error loading themes:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    }
  };
}

// 读取配置文件
const configPath = path.resolve(__dirname, MAKE_CONFIG_RELATIVE_PATH);
let axhubConfig: any = { server: { host: 'localhost', allowLAN: true } };
if (fs.existsSync(configPath)) {
  try {
    axhubConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.warn(`Failed to parse ${MAKE_CONFIG_RELATIVE_PATH}, using defaults:`, e);
  }
}

writeEntriesManifestAtomic(
  __dirname,
  scanProjectEntries(__dirname, ['components', 'prototypes', 'themes']),
);
const entries = readEntriesManifest(__dirname);

const entryKey = process.env.ENTRY_KEY;
const jsEntries = entries.js as Record<string, string>;
const htmlEntries = entries.html as Record<string, string>;

const hasSingleEntry = typeof entryKey === 'string' && entryKey.length > 0;
let rollupInput: Record<string, string> = htmlEntries;

if (hasSingleEntry) {
  if (!jsEntries[entryKey as string]) {
    throw new Error(`ENTRY_KEY=${entryKey} 未在 ${MAKE_ENTRIES_RELATIVE_PATH} 中找到对应入口文件。请确保目录 src/${entryKey} 存在且包含 index.tsx 文件。`);
  }
  rollupInput = { [entryKey as string]: jsEntries[entryKey as string] };
}

const isIifeBuild = hasSingleEntry;

const config: any = {
  plugins: [
    tailwindcss(), // Tailwind CSS Vite 插件
    lanAccessControlPlugin(), // 局域网访问控制（必须在最前面）
    writeDevServerInfoPlugin(), // 写入开发服务器信息
    serveAdminPlugin(), // 服务 admin 目录（需要在最前面）
    axureBridgeProxyPlugin(), // 提供 /api/axure-bridge/* 端点
    exportImageProxyPlugin(), // 提供 /api/export/image-proxy 端点
    injectStablePageIds(), // 注入稳定 ID（所有模式都启用）
    virtualHtmlPlugin(),
    websocketPlugin(),
    versionApiPlugin(), // 提供 /api/version 端点
    downloadDistPlugin(), // 提供 /api/download-dist 端点
    docsImportApiPlugin(), // 提供 /api/docs/import 端点
    docsApiPlugin(), // 提供 /api/docs 端点
    canvasApiPlugin(), // 提供 /api/canvas 端点
    templatesApiPlugin(), // 提供 /api/templates 端点
    uploadDocsApiPlugin(),
    sourceApiPlugin(), // 提供 /api/source 端点
    specDocApiPlugin(), // 提供 /api/spec-doc/save 端点
    unsetReferenceApiPlugin(), // 提供 /api/unset-reference 端点
    themesApiPlugin(), // 提供 /api/themes 端点
    fileSystemApiPlugin(),
    dataManagementApiPlugin(), // 提供 /api/data 端点
    mediaManagementApiPlugin(), // 提供 /api/media 端点
    codeReviewPlugin(), // 提供 /api/code-review 端点
    autoDebugPlugin(), // 提供自动调试 API 端点
    configApiPlugin(), // 提供 /api/config 端点
    aiCliPlugin(), // 提供 /api/ai 端点
    // agentChatApiPlugin(), // 暂时移除 AI Chat 功能（/api/agent）
    gitVersionApiPlugin(), // 提供 /api/git 端点（Git 版本管理）
    forceInlineDynamicImportsOff(isIifeBuild),
    isIifeBuild
      ? react({
        jsxRuntime: 'classic',
        babel: { configFile: false, babelrc: false }
      })
      : null,
    isIifeBuild ? addAxhubMarker() : null,
    isIifeBuild ? axhubComponentEnforcer(jsEntries[entryKey as string]) : null
  ].filter(Boolean) as Plugin[],

  root: 'src',

  optimizeDeps: {
    exclude: ['react', 'react-dom']
  },

  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // spec-template 需要真正的 React，不使用 shim
      !isIifeBuild && {
        find: /^react$/,
        replacement: (id: string, importer?: string) => {
          // 如果是从 spec-template 导入，使用真正的 React
          if (importer && importer.includes('/spec-template/')) {
            return 'react';
          }
          return path.resolve(__dirname, 'src/common/react-shim.js');
        }
      },
      !isIifeBuild && {
        find: /^react-dom$/,
        replacement: (id: string, importer?: string) => {
          // 如果是从 spec-template 导入，使用真正的 React DOM
          if (importer && importer.includes('/spec-template/')) {
            return 'react-dom';
          }
          return path.resolve(__dirname, 'src/common/react-dom-shim.js');
        }
      },
      !isIifeBuild && {
        find: /^react\/.*/,
        replacement: path.resolve(__dirname, 'src/common/react-shim.js')
      },
      !isIifeBuild && {
        find: /^react-dom\/.*/,
        replacement: path.resolve(__dirname, 'src/common/react-dom-shim.js')
      }
    ].filter(Boolean) as { find: string | RegExp; replacement: string | ((id: string, importer?: string) => string) }[]
  },

  server: {
    port: 51720, // 默认从 51720 开始，如果被占用会自动尝试 51721, 51722...
    strictPort: false, // 端口被占用时自动尝试下一个端口
    host: '0.0.0.0', // 统一使用 0.0.0.0 绑定，确保端口检测正确
    open: true, // 启动时自动打开浏览器
    cors: true,
    // HMR 配置
    hmr: {
      // 禁用 Vite 的错误覆盖层（Error Overlay）
      // 原因：项目使用多入口架构（prototypes、components 等），Vite 的 Error Overlay 会在所有打开的页面上显示错误
      // 这导致用户在访问页面 A 时，如果页面 B 出现构建错误，错误会跨页面显示在页面 A 上，造成困扰
      // 解决方案：禁用 Vite 的 Error Overlay，使用 dev-template.html 中已实现的自定义错误捕获和显示系统
      // 优点：避免跨页面错误显示，保持错误提示的页面隔离性，风险最小
      overlay: false
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  },

  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: !isIifeBuild,
    target: isIifeBuild ? 'es2015' : 'esnext',
    assetsInlineLimit: 512 * 1024, // 512KB - 小于此大小的图片会被内联为 Base64

    rollupOptions: {
      input: rollupInput,

      external: isIifeBuild ? ['react', 'react-dom'] : [],

      output: {
        entryFileNames: (chunkInfo: { name: string }) => `${chunkInfo.name}.js`,
        format: isIifeBuild ? 'iife' : 'es',
        name: 'UserComponent',

        ...(isIifeBuild
          ? {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM'
            },
            generatedCode: { constBindings: false }
          }
          : {})
      }
    },

    minify: isIifeBuild ? 'esbuild' : false
  },

  esbuild: isIifeBuild
    ? {
      target: 'es2015',
      legalComments: 'none',
      keepNames: true
    }
    : {
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment'
    },

  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'vite-plugins/**/*.test.ts',
    ],
    root: '.',
  }
};

export default defineConfig(config);
