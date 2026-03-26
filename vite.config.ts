import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react';

import { addAxhubMarker } from './vite-plugins/addAxhubMarker';
import { aiCliPlugin } from './vite-plugins/aiCliPlugin';
import { autoDebugPlugin } from './vite-plugins/autoDebugPlugin';
import { axureBridgeProxyPlugin } from './vite-plugins/axureBridgeProxyPlugin';
import { axhubComponentEnforcer } from './vite-plugins/axhubComponentEnforcer';
import { canvasApiPlugin } from './vite-plugins/canvasApiPlugin';
import { codeReviewPlugin } from './vite-plugins/codeReviewPlugin';
import { configApiPlugin } from './vite-plugins/configApiPlugin';
import { dataManagementApiPlugin } from './vite-plugins/dataManagementApiPlugin';
import { docsApiPlugin } from './vite-plugins/docsApiPlugin';
import { docsImportApiPlugin } from './vite-plugins/docsImportApiPlugin';
import { downloadDistPlugin } from './vite-plugins/downloadDistPlugin';
import { exportImageProxyPlugin } from './vite-plugins/exportImageProxyPlugin';
import { fileSystemApiPlugin } from './vite-plugins/fileSystemApiPlugin';
import { forceInlineDynamicImportsOff } from './vite-plugins/forceInlineDynamicImportsOff';
import { gitVersionApiPlugin } from './vite-plugins/gitVersionApiPlugin';
import { injectStablePageIds } from './vite-plugins/injectStablePageIds';
import { lanAccessControlPlugin } from './vite-plugins/lanAccessControlPlugin';
import { mediaManagementApiPlugin } from './vite-plugins/mediaManagementApiPlugin';
import { serveAdminPlugin } from './vite-plugins/serveAdminPlugin';
import { sourceApiPlugin } from './vite-plugins/sourceApiPlugin';
import { specDocApiPlugin } from './vite-plugins/specDocApiPlugin';
import { templatesApiPlugin } from './vite-plugins/templatesApiPlugin';
import { themesApiPlugin } from './vite-plugins/themesApiPlugin';
import { unsetReferenceApiPlugin } from './vite-plugins/unsetReferenceApiPlugin';
import { uploadDocsApiPlugin } from './vite-plugins/uploadDocsApiPlugin';
import { versionApiPlugin } from './vite-plugins/versionApiPlugin';
import { virtualHtmlPlugin } from './vite-plugins/virtualHtml';
import { websocketPlugin } from './vite-plugins/websocketPlugin';
import { writeDevServerInfoPlugin } from './vite-plugins/writeDevServerInfoPlugin';
import {
  MAKE_CONFIG_RELATIVE_PATH,
  MAKE_ENTRIES_RELATIVE_PATH,
} from './vite-plugins/utils/makeConstants';
import { readEntriesManifest, scanProjectEntries, writeEntriesManifestAtomic } from './vite-plugins/utils/entriesManifest';

const projectRoot = process.cwd();
const configPath = path.resolve(projectRoot, MAKE_CONFIG_RELATIVE_PATH);
let axhubConfig: any = { server: { host: 'localhost', allowLAN: true } };
if (fs.existsSync(configPath)) {
  try {
    axhubConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.warn(`Failed to parse ${MAKE_CONFIG_RELATIVE_PATH}, using defaults:`, error);
  }
}

writeEntriesManifestAtomic(
  projectRoot,
  scanProjectEntries(projectRoot, ['components', 'prototypes', 'themes']),
);
const entries = readEntriesManifest(projectRoot);

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
    templatesApiPlugin(), // 提供 /api/docs/templates 端点
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
      { find: '@', replacement: path.resolve(projectRoot, 'src') },
      // spec-template 需要真正的 React，不使用 shim
      !isIifeBuild && {
        find: /^react$/,
        replacement: (id: string, importer?: string) => {
          // 如果是从 spec-template 导入，使用真正的 React
          if (importer && importer.includes('/spec-template/')) {
            return 'react';
          }
          return path.resolve(projectRoot, 'src/common/react-shim.js');
        }
      },
      !isIifeBuild && {
        find: /^react-dom$/,
        replacement: (id: string, importer?: string) => {
          // 如果是从 spec-template 导入，使用真正的 React DOM
          if (importer && importer.includes('/spec-template/')) {
            return 'react-dom';
          }
          return path.resolve(projectRoot, 'src/common/react-dom-shim.js');
        }
      },
      !isIifeBuild && {
        find: /^react\/.*/,
        replacement: path.resolve(projectRoot, 'src/common/react-shim.js')
      },
      !isIifeBuild && {
        find: /^react-dom\/.*/,
        replacement: path.resolve(projectRoot, 'src/common/react-dom-shim.js')
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
    outDir: path.resolve(projectRoot, 'dist'),
    emptyOutDir: !isIifeBuild,
    target: isIifeBuild ? 'es2015' : 'esnext',
    assetsInlineLimit: 1024 * 1024, // 1MB - 小于此大小的图片会被内联为 Base64

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
