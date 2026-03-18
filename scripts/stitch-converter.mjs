#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  projectRoot: path.resolve(__dirname, '..'),
  pagesDir: path.resolve(__dirname, '../src/prototypes'),
  pendingLogicFileName: '.stitch-pending.json',
  pendingLogicMarker: 'STITCH_PENDING_LOGIC',
};

function log(message, type = 'info') {
  const prefix = { info: '✓', warn: '⚠', error: '✗', progress: '⏳' }[type] || 'ℹ';
  console.log(`${prefix} ${message}`);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizePageName(name) {
  return String(name)
    .replace(/[^a-z0-9-_]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function escapeForTemplateLiteral(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function extractTailwindConfig(html) {
  const startMatch = html.match(/tailwind\.config\s*=\s*\{/);
  if (!startMatch) return null;

  const startIndex = startMatch.index + startMatch[0].length - 1;
  let braceCount = 0;
  let endIndex = startIndex;

  for (let i = startIndex; i < html.length; i += 1) {
    if (html[i] === '{') braceCount += 1;
    else if (html[i] === '}') {
      braceCount -= 1;
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  if (braceCount !== 0) return null;

  const configStr = html.substring(startIndex, endIndex);

  try {
    let cleanedStr = configStr
      .split('\n')
      .map((line) => {
        const commentIndex = line.indexOf('//');
        if (commentIndex >= 0) {
          return line.substring(0, commentIndex).trimEnd();
        }
        return line;
      })
      .join('\n');

    cleanedStr = cleanedStr.replace(/,(\s*[}\]])/g, '$1');
    return (function () {
      return eval(`(${cleanedStr})`);
    }());
  } catch (error) {
    console.error('[Stitch Converter] 解析 Tailwind 配置失败:', error.message);
    return null;
  }
}

function generateTailwindCSS(config) {
  if (!config || !config.theme) return '';

  const theme = config.theme;
  const extend = theme.extend || {};
  let css = '';

  const processColors = (colors, prefix = '') => {
    let colorCSS = '';
    for (const [name, value] of Object.entries(colors)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        colorCSS += processColors(value, `${prefix}${name}-`);
      } else {
        const cssName = `${prefix}${name}`.replace(/([A-Z])/g, '-$1').toLowerCase();
        colorCSS += `  --color-${cssName}: ${value};\n`;
      }
    }
    return colorCSS;
  };

  if (extend.colors) {
    css += '\n@theme {\n';
    css += processColors(extend.colors);
    css += '}\n';
  }

  if (extend.spacing) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.spacing)) {
      css += `  --spacing-${name}: ${value};\n`;
    }
    css += '}\n';
  }

  if (extend.fontSize) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.fontSize)) {
      const size = Array.isArray(value) ? value[0] : value;
      css += `  --font-size-${name}: ${size};\n`;
      if (Array.isArray(value) && value[1]) {
        const lineHeight = typeof value[1] === 'object' ? value[1].lineHeight : value[1];
        if (lineHeight) {
          css += `  --line-height-${name}: ${lineHeight};\n`;
        }
      }
    }
    css += '}\n';
  }

  if (extend.fontFamily) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.fontFamily)) {
      const family = Array.isArray(value) ? value.join(', ') : value;
      css += `  --font-family-${name}: ${family};\n`;
    }
    css += '}\n';
  }

  if (extend.borderRadius) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.borderRadius)) {
      const cssName = name === 'DEFAULT' ? 'default' : name;
      css += `  --radius-${cssName}: ${value};\n`;
    }
    css += '}\n';
  }

  if (extend.boxShadow) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.boxShadow)) {
      const cssName = name === 'DEFAULT' ? 'default' : name;
      css += `  --shadow-${cssName}: ${value};\n`;
    }
    css += '}\n';
  }

  if (extend.screens) {
    css += '\n/* 自定义断点 */\n';
    for (const [name, value] of Object.entries(extend.screens)) {
      css += `/* @screen ${name}: ${value} */\n`;
    }
  }

  if (extend.zIndex) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.zIndex)) {
      css += `  --z-index-${name}: ${value};\n`;
    }
    css += '}\n';
  }

  if (extend.opacity) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.opacity)) {
      css += `  --opacity-${name}: ${value};\n`;
    }
    css += '}\n';
  }

  if (extend.keyframes) {
    css += '\n/* 动画关键帧 */\n';
    for (const [name, frames] of Object.entries(extend.keyframes)) {
      css += `@keyframes ${name} {\n`;
      for (const [percent, styles] of Object.entries(frames)) {
        css += `  ${percent} {\n`;
        for (const [prop, val] of Object.entries(styles)) {
          const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
          css += `    ${cssProp}: ${val};\n`;
        }
        css += '  }\n';
      }
      css += '}\n\n';
    }
  }

  if (extend.animation) {
    css += '\n/* 动画工具类 */\n';
    css += '@layer utilities {\n';
    for (const [name, value] of Object.entries(extend.animation)) {
      css += `  .animate-${name} {\n`;
      css += `    animation: ${value};\n`;
      css += '  }\n';
    }
    css += '}\n\n';
  }

  if (extend.transitionDuration) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.transitionDuration)) {
      css += `  --duration-${name}: ${value};\n`;
    }
    css += '}\n';
  }

  if (extend.transitionTimingFunction) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.transitionTimingFunction)) {
      css += `  --ease-${name}: ${value};\n`;
    }
    css += '}\n';
  }

  if (extend.backgroundImage) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.backgroundImage)) {
      css += `  --gradient-${name}: ${value};\n`;
    }
    css += '}\n';
  }

  if (config.darkMode) {
    css += `\n/* Dark Mode: ${config.darkMode} */\n`;
  }

  return css;
}

function isTailwindConfigScript(attrs, content) {
  return /tailwind\.config/.test(content) || /id=["']tailwind-config["']/i.test(attrs);
}

function summarizeScript(script) {
  const source = script.content || script.src || '';
  const normalized = source.toLowerCase();

  if (/setinterval|settimeout/.test(normalized) && /time|date|clock/.test(normalized)) {
    return '更新时间或日期显示';
  }
  if (/addEventListener\s*\(\s*['"]click['"]/.test(source) || /\.onclick\s*=/.test(source)) {
    return '点击交互处理';
  }
  if (/addEventListener\s*\(\s*['"]scroll['"]/.test(source)) {
    return '滚动相关行为';
  }
  if (/querySelector|getElementById|textContent|innerHTML/.test(source)) {
    return '页面内容或状态更新';
  }
  if (script.src) {
    return `外部脚本：${script.src}`;
  }

  return '页面动态逻辑';
}

function suggestMigration(script) {
  const source = script.content || script.src || '';
  const normalized = source.toLowerCase();

  if (/setinterval|settimeout/.test(normalized)) {
    return '迁移到 React.useEffect，并在需要时配合 useState 管理显示内容。';
  }
  if (/addEventListener|onclick|onsubmit|onchange/.test(normalized)) {
    return '迁移到组件事件处理函数或 React.useEffect 的事件绑定。';
  }
  if (/querySelector|getElementById|textContent|innerHTML/.test(source)) {
    return '改为通过组件状态、props 或 ref 更新界面，避免直接操作 DOM。';
  }
  if (script.src) {
    return '确认该脚本的用途后，再决定是否以 npm 依赖、按需加载或替代实现接入。';
  }

  return '建议拆解为组件状态、效果函数或独立 helper 后接入。';
}

function createPendingScript(script, index) {
  return {
    id: script.id || `${script.location}-script-${index + 1}`,
    location: script.location,
    src: script.src || null,
    summary: summarizeScript(script),
    suggestedMigration: suggestMigration(script),
    code: script.content || '',
  };
}

function extractHeadContent(html) {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (!headMatch) return { links: [], styles: [], pendingScripts: [] };

  const headContent = headMatch[1];
  const links = [];
  const styles = [];
  const pendingScripts = [];

  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(headContent)) !== null) {
    const attrs = match[1];
    const content = match[2].trim();
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i);

    if (srcMatch) {
      const src = srcMatch[1].replace(/&amp;/g, '&');
      if (src.includes('tailwindcss.com')) continue;
      pendingScripts.push(createPendingScript({
        location: 'head',
        id: attrs.match(/id=["']([^"']+)["']/i)?.[1] || null,
        src,
        content: '',
      }, pendingScripts.length));
      continue;
    }

    if (!content || isTailwindConfigScript(attrs, content)) {
      continue;
    }

    pendingScripts.push(createPendingScript({
      location: 'head',
      id: attrs.match(/id=["']([^"']+)["']/i)?.[1] || null,
      src: null,
      content,
    }, pendingScripts.length));
  }

  const linkRegex = /<link[^>]*>/gi;
  while ((match = linkRegex.exec(headContent)) !== null) {
    const tag = match[0];
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (href) {
      links.push({
        href: href.replace(/&amp;/g, '&'),
        rel: tag.match(/rel=["']([^"']+)["']/i)?.[1] || 'stylesheet',
        crossorigin: tag.includes('crossorigin'),
      });
    }
  }

  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((match = styleRegex.exec(headContent)) !== null) {
    const content = match[1].trim();
    if (content) {
      styles.push(content);
    }
  }

  return { links, styles, pendingScripts };
}

function convertStyleToJSX(styleStr) {
  if (!styleStr.trim()) return 'style={{}}';

  const styles = [];
  let currentProp = '';
  let inUrl = false;

  for (let i = 0; i < styleStr.length; i += 1) {
    const char = styleStr[i];
    if (char === '(' && styleStr.substring(i - 3, i) === 'url') inUrl = true;
    else if (char === ')' && inUrl) inUrl = false;

    if (char === ';' && !inUrl) {
      if (currentProp.trim()) styles.push(currentProp.trim());
      currentProp = '';
    } else {
      currentProp += char;
    }
  }

  if (currentProp.trim()) styles.push(currentProp.trim());

  const jsxStyles = styles
    .filter((item) => item.includes(':'))
    .map((item) => {
      const colonIndex = item.indexOf(':');
      const key = item.substring(0, colonIndex).trim();
      const value = item.substring(colonIndex + 1).trim();
      if (!key || !value) return '';

      const camelKey = key.replace(/-([a-z])/g, (group) => group[1].toUpperCase());
      let jsxValue;
      if (value.startsWith('url(') || value.includes('var(')) {
        jsxValue = `'${value.replace(/'/g, "\\'")}'`;
      } else if (/^-?\d+(\.\d+)?$/.test(value)) {
        jsxValue = value;
      } else {
        jsxValue = `'${value.replace(/'/g, "\\'")}'`;
      }
      return `${camelKey}: ${jsxValue}`;
    })
    .filter(Boolean)
    .join(', ');

  return `style={{ ${jsxStyles} }}`;
}

function convertCommonAttributesToJSX(content) {
  const replacements = [
    ['class', 'className'],
    ['for', 'htmlFor'],
    ['tabindex', 'tabIndex'],
    ['readonly', 'readOnly'],
    ['maxlength', 'maxLength'],
    ['minlength', 'minLength'],
    ['colspan', 'colSpan'],
    ['rowspan', 'rowSpan'],
    ['viewbox', 'viewBox'],
    ['preserveaspectratio', 'preserveAspectRatio'],
    ['clip-path', 'clipPath'],
    ['fill-rule', 'fillRule'],
    ['clip-rule', 'clipRule'],
    ['stroke-width', 'strokeWidth'],
    ['stroke-dasharray', 'strokeDasharray'],
    ['stroke-dashoffset', 'strokeDashoffset'],
    ['stroke-linecap', 'strokeLinecap'],
    ['stroke-linejoin', 'strokeLinejoin'],
    ['stroke-miterlimit', 'strokeMiterlimit'],
    ['stroke-opacity', 'strokeOpacity'],
    ['fill-opacity', 'fillOpacity'],
    ['stop-color', 'stopColor'],
    ['stop-opacity', 'stopOpacity'],
    ['xlink:href', 'xlinkHref'],
    ['xmlns:xlink', 'xmlnsXlink'],
  ];

  let nextContent = content;
  replacements.forEach(([from, to]) => {
    nextContent = nextContent.replace(new RegExp(`(\\s)${from}=`, 'gi'), `$1${to}=`);
  });

  return nextContent;
}

function convertHtmlToJsx(content) {
  return convertCommonAttributesToJSX(content)
    .replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}')
    .replace(/(<pre[^>]*>)([\s\S]*?)(<\/pre>)/gi, (match, openTag, preContent) => {
      const escapedContent = preContent
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$')
        .replace(/\{/g, '\\{');
      return `${openTag.slice(0, -1)} dangerouslySetInnerHTML={{ __html: \`${escapedContent}\` }} />`;
    })
    .replace(/style='([^']*)'/gi, (match, styleStr) => convertStyleToJSX(styleStr))
    .replace(/style="([^"]*)"/gi, (match, styleStr) => convertStyleToJSX(styleStr));
}

function extractBodyContent(html) {
  const bodyMatch = html.match(/(<body[^>]*>)([\s\S]*?)<\/body>/i);
  if (!bodyMatch) {
    return {
      wrapperOpenTag: '<div data-stitch-root="true">',
      jsxContent: '',
      pendingScripts: [],
    };
  }

  const openTag = convertHtmlToJsx(bodyMatch[1])
    .replace(/^<body/i, '<div data-stitch-root="true"');
  const innerContent = bodyMatch[2];
  const pendingScripts = [];

  const contentWithoutScripts = innerContent.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, content) => {
    const trimmedContent = String(content || '').trim();
    pendingScripts.push(createPendingScript({
      location: 'body',
      id: attrs.match(/id=["']([^"']+)["']/i)?.[1] || attrs.match(/data-purpose=["']([^"']+)["']/i)?.[1] || null,
      src: attrs.match(/src=["']([^"']+)["']/i)?.[1]?.replace(/&amp;/g, '&') || null,
      content: trimmedContent,
    }, pendingScripts.length));
    return '';
  });

  return {
    wrapperOpenTag: openTag,
    jsxContent: convertHtmlToJsx(contentWithoutScripts.trim()),
    pendingScripts,
  };
}

function buildPendingSummaryLines(pendingScripts) {
  return pendingScripts.map((item) => `  // - [${item.location}] ${item.id}: ${item.summary}`);
}

function buildPendingEffectBlock(pendingScripts) {
  if (pendingScripts.length === 0) return '';

  const summaryLines = buildPendingSummaryLines(pendingScripts).join('\n');
  return `
  React.useEffect(function () {
    // ${CONFIG.pendingLogicMarker}_START
    // 后续可在这里继续完善页面的动态细节。
    // 参考同目录下的 ${CONFIG.pendingLogicFileName}。
${summaryLines}
    // ${CONFIG.pendingLogicMarker}_END
  }, []);
`;
}

function buildFriendlyNotice() {
  return `
      <div
        className="pointer-events-none fixed right-4 top-4 z-[100] max-w-xs rounded-2xl border border-white/60 bg-white/88 px-4 py-3 text-sm text-slate-700 shadow-lg backdrop-blur"
        style={{ boxShadow: '0 18px 45px rgba(15, 23, 42, 0.12)' }}
      >
        <div className="font-semibold text-slate-900">基础效果已就绪</div>
        <div className="mt-1 leading-6 text-slate-600">
          当前可先查看页面结构与样式效果，部分动态细节可在后续继续完善。
        </div>
      </div>`;
}

function generateComponent(pageName, wrapperOpenTag, bodyJsxContent, headContent, pendingScripts) {
  const componentName = pageName
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const injectionBlocks = [];

  if (headContent.links.length > 0) {
    injectionBlocks.push(`
  React.useEffect(function () {
    const injected = [];

    ${JSON.stringify(headContent.links)}.forEach(function (linkInfo) {
      const existing = document.querySelector(\`link[href="\${linkInfo.href}"]\`);
      if (!existing) {
        const link = document.createElement('link');
        link.rel = linkInfo.rel;
        link.href = linkInfo.href;
        if (linkInfo.crossorigin) link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
        injected.push(link);
      }
    });

    return function () {
      injected.forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    };
  }, []);
`);
  }

  if (pendingScripts.length > 0) {
    injectionBlocks.push(buildPendingEffectBlock(pendingScripts));
  }

  const friendlyNotice = pendingScripts.length > 0 ? buildFriendlyNotice() : '';
  const wrapperJsx = `${wrapperOpenTag}
${friendlyNotice}
${bodyJsxContent}
    </div>`;

  return `/**
 * @name ${pageName}
 *
 * 参考资料：
 * - /rules/development-guide.md
 * - /skills/default-resource-recommendations/SKILL.md
 */

import './style.css';
import React, { forwardRef, useImperativeHandle } from 'react';
import type { AxureProps, AxureHandle } from '../../common/axure-types';

const Component = forwardRef<AxureHandle, AxureProps>(function ${componentName}(_props, ref) {
  useImperativeHandle(ref, function () {
    return {
      getVar: function () { return undefined; },
      fireAction: function () {},
      eventList: [],
      actionList: [],
      varList: [],
      configList: [],
      dataList: []
    };
  }, []);
${injectionBlocks.join('')}
  return (
${wrapperJsx.split('\n').map((line) => `    ${line}`).join('\n')}
  );
});

export default Component;
`;
}

function generateStyleCSS(headContent, tailwindConfig) {
  let css = '@import "tailwindcss";\n';

  if (tailwindConfig) {
    css += '\n/* 从 Stitch Tailwind 配置提取的样式 */';
    css += generateTailwindCSS(tailwindConfig);
  }

  if (headContent.styles && headContent.styles.length > 0) {
    css += '\n/* 原始自定义样式 */\n';
    css += headContent.styles.join('\n\n');
  }

  return css;
}

function buildPendingLogicPayload(pageName, outputDir, pendingScripts) {
  const relativeDir = path.relative(CONFIG.projectRoot, outputDir).split(path.sep).join('/');
  const relativeIndexFile = `${relativeDir}/index.tsx`;
  const relativePendingFile = `${relativeDir}/${CONFIG.pendingLogicFileName}`;

  return {
    pageName,
    generatedAt: new Date().toISOString(),
    marker: CONFIG.pendingLogicMarker,
    indexFile: relativeIndexFile,
    pendingFile: relativePendingFile,
    items: pendingScripts,
  };
}

function buildPrompt(pageName, outputDir, pendingPayload) {
  const relativeDir = path.relative(CONFIG.projectRoot, outputDir).split(path.sep).join('/');
  const relativeHtmlFile = `${relativeDir}/code.html`;

  const summaries = pendingPayload.items
    .map((item) => `- [${item.location}] ${item.id}: ${item.summary}。建议：${item.suggestedMigration}`)
    .join('\n');

  return `请继续完善 Stitch 导入后的页面“${pageName}”。

目标目录：
- \`${relativeDir}\`

请优先阅读以下文件：
- \`${relativeDir}/index.tsx\`
- \`${relativeDir}/${CONFIG.pendingLogicFileName}\`
- \`${relativeHtmlFile}\`

当前页面已经可以静态预览，但仍有待完善的动态细节：
${summaries}

请按以下方式处理：
1. 在 \`index.tsx\` 中的 \`${CONFIG.pendingLogicMarker}_START\` / \`${CONFIG.pendingLogicMarker}_END\` 区域附近补入需要的 React 逻辑。
2. 把原始脚本改写为 React 状态、effects、事件处理函数或必要的 helper。
3. 尽量不要直接操作 DOM；优先使用 state、props、ref。
4. 完成逻辑迁移后，补充生成同目录下的 \`spec.md\`，说明页面结构、动态行为和实现要点。
5. 最后运行项目内的可用验收方式，确认页面可正常预览。
`;
}

function convertPage(pagePath, outputDir, pageName) {
  log(`正在转换页面: ${pageName}`, 'progress');

  const htmlPath = path.join(pagePath, 'code.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const tailwindConfig = extractTailwindConfig(html);
  const headContent = extractHeadContent(html);
  const bodyContent = extractBodyContent(html);
  const pendingScripts = [...headContent.pendingScripts, ...bodyContent.pendingScripts];

  ensureDir(outputDir);

  const componentCode = generateComponent(
    pageName,
    bodyContent.wrapperOpenTag,
    bodyContent.jsxContent,
    headContent,
    pendingScripts,
  );
  const styleCSS = generateStyleCSS(headContent, tailwindConfig);

  fs.writeFileSync(path.join(outputDir, 'index.tsx'), componentCode, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'style.css'), styleCSS, 'utf8');

  const pendingPayload = buildPendingLogicPayload(pageName, outputDir, pendingScripts);
  const pendingFilePath = path.join(outputDir, CONFIG.pendingLogicFileName);
  if (pendingScripts.length > 0) {
    fs.writeFileSync(pendingFilePath, `${JSON.stringify(pendingPayload, null, 2)}\n`, 'utf8');
    log(`  ✓ 已整理 ${pendingScripts.length} 段待完善逻辑`, 'info');
  } else if (fs.existsSync(pendingFilePath)) {
    fs.unlinkSync(pendingFilePath);
  }

  log(`页面转换完成: ${pageName}`, 'info');

  return {
    pageName,
    outputDir,
    pendingScripts,
    pendingFile: pendingScripts.length > 0 ? pendingFilePath : null,
    prompt: pendingScripts.length > 0 ? buildPrompt(pageName, outputDir, pendingPayload) : null,
  };
}

function detectProjectType(stitchDir) {
  const items = fs.readdirSync(stitchDir);

  if (items.includes('code.html')) {
    return { type: 'single', prototypes: [{ name: 'index', path: stitchDir }] };
  }

  const prototypes = [];
  for (const item of items) {
    const itemPath = path.join(stitchDir, item);
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory() && fs.existsSync(path.join(itemPath, 'code.html'))) {
      prototypes.push({ name: item, path: itemPath });
    }
  }

  if (prototypes.length > 0) return { type: 'multi', prototypes };
  throw new Error('未找到有效的 Stitch 项目结构');
}

function printResult(result) {
  console.log(JSON.stringify(result));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log(`
使用方法:
  node scripts/stitch-converter.mjs <stitch-dir> [output-name]
    `);
    process.exit(0);
  }

  const stitchDirArg = args[0];
  const outputName = sanitizePageName(args[1] || path.basename(stitchDirArg));
  const stitchDir = path.resolve(CONFIG.projectRoot, stitchDirArg);
  const outputDir = path.join(CONFIG.pagesDir, outputName);

  if (!fs.existsSync(stitchDir)) {
    log(`错误: 找不到目录 ${stitchDir}`, 'error');
    process.exit(1);
  }

  try {
    log('开始转换 Stitch 项目...', 'info');

    const { type, prototypes } = detectProjectType(stitchDir);
    log(`项目类型: ${type === 'single' ? '单页面' : '多页面'}`, 'info');

    if (type === 'single') {
      const pageResult = convertPage(prototypes[0].path, outputDir, outputName);
      const result = {
        success: true,
        type,
        mode: pageResult.pendingScripts.length > 0 ? 'ai_handoff' : 'safe_component',
        pageName: outputName,
        outputDir,
        pendingLogicCount: pageResult.pendingScripts.length,
        requiresAi: pageResult.pendingScripts.length > 0,
        prompt: pageResult.prompt,
        reasons: pageResult.pendingScripts.map((item) => `${item.summary}（${item.location}）`),
      };
      log('✅ 转换完成！', 'info');
      printResult(result);
      return;
    }

    const convertedPages = [];
    for (const page of prototypes) {
      const pageFolderName = sanitizePageName(`${outputName}-${page.name}`);
      const pageOutputDir = path.join(CONFIG.pagesDir, pageFolderName);
      const pageResult = convertPage(page.path, pageOutputDir, page.name);
      convertedPages.push({
        pageName: page.name,
        folderName: pageFolderName,
        outputDir: pageOutputDir,
        pendingLogicCount: pageResult.pendingScripts.length,
        requiresAi: pageResult.pendingScripts.length > 0,
        prompt: pageResult.prompt,
        reasons: pageResult.pendingScripts.map((item) => `${item.summary}（${item.location}）`),
      });
    }

    log('✅ 转换完成！', 'info');
    printResult({
      success: true,
      type,
      mode: convertedPages.some((item) => item.requiresAi) ? 'ai_handoff' : 'safe_component',
      pageName: outputName,
      outputDir,
      pages: convertedPages,
      pendingLogicCount: convertedPages.reduce((sum, item) => sum + item.pendingLogicCount, 0),
      requiresAi: convertedPages.some((item) => item.requiresAi),
      prompt: convertedPages.find((item) => item.prompt)?.prompt || null,
      reasons: convertedPages.flatMap((item) => item.reasons),
    });
  } catch (error) {
    log(`转换失败: ${error.message}`, 'error');
    process.exit(1);
  }
}

main();
