#!/usr/bin/env node

/**
 * =====================================================
 * Stitch 转换器 V3 - 支持 Chrome 扩展导出
 * 
 * 设计理念：
 * 1. 完整保留原始 HTML 的 head 内容（scripts、links、styles）
 * 2. 通过 useEffect 动态注入到页面，确保所有配置生效
 * 3. 不尝试解析或转换复杂的配置，保持最大兼容性
 * 4. 智能处理字体：CDN 字体保留，本地字体文件跳过（避免文件过大）
 * 5. 复制 assets 文件夹中的图片资源
 * =====================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  projectRoot: path.resolve(__dirname, '..'),
  pagesDir: path.resolve(__dirname, '../src/prototypes')
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

/**
 * 提取 Tailwind 配置中的自定义内容
 */
function extractTailwindConfig(html) {
  // 匹配 tailwind.config = { ... }
  // 需要正确处理嵌套的大括号
  const startMatch = html.match(/tailwind\.config\s*=\s*\{/);
  if (!startMatch) return null;
  
  const startIndex = startMatch.index + startMatch[0].length - 1; // 指向第一个 {
  let braceCount = 0;
  let endIndex = startIndex;
  
  // 查找匹配的闭合括号
  for (let i = startIndex; i < html.length; i++) {
    if (html[i] === '{') braceCount++;
    else if (html[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
  
  if (braceCount !== 0) return null;
  
  const configStr = html.substring(startIndex, endIndex);
  
  try {
    // 移除单行注释 //
    let cleanedStr = configStr.split('\n').map(line => {
      const commentIndex = line.indexOf('//');
      if (commentIndex >= 0) {
        return line.substring(0, commentIndex).trimEnd();
      }
      return line;
    }).join('\n');
    
    // 移除尾随逗号
    cleanedStr = cleanedStr.replace(/,(\s*[}\]])/g, '$1');
    
    const config = (function() { return eval('(' + cleanedStr + ')'); })();
    return config;
  } catch (e) {
    console.error('[Stitch Converter] 解析 Tailwind 配置失败:', e.message);
    return null;
  }
}

/**
 * 将 Tailwind 配置转换为 CSS
 * 支持 Tailwind 的常见配置项
 */
function generateTailwindCSS(config) {
  if (!config || !config.theme) return '';
  
  const theme = config.theme;
  const extend = theme.extend || {};
  let css = '';
  
  // 1. 转换颜色为 CSS 变量（支持嵌套对象）
  const processColors = (colors, prefix = '') => {
    let colorCSS = '';
    for (const [name, value] of Object.entries(colors)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        // 嵌套颜色 (如 blue: { 50: '#...', 100: '#...' })
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
  
  // 2. 转换 spacing（间距）
  if (extend.spacing) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.spacing)) {
      css += `  --spacing-${name}: ${value};\n`;
    }
    css += '}\n';
  }
  
  // 3. 转换 fontSize（字体大小）
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
  
  // 4. 转换 fontFamily（字体族）
  if (extend.fontFamily) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.fontFamily)) {
      const family = Array.isArray(value) ? value.join(', ') : value;
      css += `  --font-family-${name}: ${family};\n`;
    }
    css += '}\n';
  }
  
  // 5. 转换 borderRadius（圆角）
  if (extend.borderRadius) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.borderRadius)) {
      const cssName = name === 'DEFAULT' ? 'default' : name;
      css += `  --radius-${cssName}: ${value};\n`;
    }
    css += '}\n';
  }
  
  // 6. 转换 boxShadow（阴影）
  if (extend.boxShadow) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.boxShadow)) {
      const cssName = name === 'DEFAULT' ? 'default' : name;
      css += `  --shadow-${cssName}: ${value};\n`;
    }
    css += '}\n';
  }
  
  // 7. 转换 screens（断点）
  if (extend.screens) {
    css += '\n/* 自定义断点 */\n';
    for (const [name, value] of Object.entries(extend.screens)) {
      css += `/* @screen ${name}: ${value} */\n`;
    }
  }
  
  // 8. 转换 zIndex
  if (extend.zIndex) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.zIndex)) {
      css += `  --z-index-${name}: ${value};\n`;
    }
    css += '}\n';
  }
  
  // 9. 转换 opacity
  if (extend.opacity) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.opacity)) {
      css += `  --opacity-${name}: ${value};\n`;
    }
    css += '}\n';
  }
  
  // 10. 转换 keyframes（动画关键帧）
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
        css += `  }\n`;
      }
      css += '}\n\n';
    }
  }
  
  // 11. 转换 animation（动画类）
  if (extend.animation) {
    css += '\n/* 动画工具类 */\n';
    css += '@layer utilities {\n';
    for (const [name, value] of Object.entries(extend.animation)) {
      css += `  .animate-${name} {\n`;
      css += `    animation: ${value};\n`;
      css += `  }\n`;
    }
    css += '}\n\n';
  }
  
  // 12. 转换 transitionDuration
  if (extend.transitionDuration) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.transitionDuration)) {
      css += `  --duration-${name}: ${value};\n`;
    }
    css += '}\n';
  }
  
  // 13. 转换 transitionTimingFunction
  if (extend.transitionTimingFunction) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.transitionTimingFunction)) {
      css += `  --ease-${name}: ${value};\n`;
    }
    css += '}\n';
  }
  
  // 14. 转换 backgroundImage（渐变等）
  if (extend.backgroundImage) {
    css += '\n@theme {\n';
    for (const [name, value] of Object.entries(extend.backgroundImage)) {
      css += `  --gradient-${name}: ${value};\n`;
    }
    css += '}\n';
  }
  
  // 15. 处理 darkMode 配置
  if (config.darkMode) {
    css += `\n/* Dark Mode: ${config.darkMode} */\n`;
  }
  
  return css;
}
/**
 * 提取完整的 head 内容（保留所有 scripts、links、styles）
 * 注意：排除 Tailwind CDN 脚本，因为我们使用构建时 Tailwind
 */
function extractHeadContent(html) {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (!headMatch) return { scripts: [], links: [], styles: [] };
  
  const headContent = headMatch[1];
  const scripts = [];
  const links = [];
  const styles = [];
  
  // 提取所有 script 标签（排除 Tailwind CDN 和配置脚本）
  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(headContent)) !== null) {
    const attrs = match[1];
    const content = match[2].trim();
    
    // 外部脚本 - 排除 Tailwind CDN
    const srcMatch = attrs.match(/src=["']([^"']+)["']/);
    if (srcMatch) {
      const src = srcMatch[1].replace(/&amp;/g, '&');
      // 跳过 Tailwind CDN
      if (src.includes('tailwindcss.com')) continue;
      
      scripts.push({ 
        src,
        id: attrs.match(/id=["']([^"']+)["']/)?.[1]
      });
    }
    // 内联脚本 - 排除 Tailwind 配置
    else if (content && !content.includes('tailwind.config')) {
      const id = attrs.match(/id=["']([^"']+)["']/)?.[1];
      scripts.push({ id, content });
    }
  }
  
  // 提取所有 link 标签
  const linkRegex = /<link[^>]*>/gi;
  while ((match = linkRegex.exec(headContent)) !== null) {
    const tag = match[0];
    const href = tag.match(/href=["']([^"']+)["']/)?.[1];
    if (href) {
      links.push({
        href: href.replace(/&amp;/g, '&'),
        rel: tag.match(/rel=["']([^"']+)["']/)?.[1] || 'stylesheet',
        crossorigin: tag.includes('crossorigin')
      });
    }
  }
  
  // 提取所有 style 标签
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((match = styleRegex.exec(headContent)) !== null) {
    const content = match[1].trim();
    if (content) {
      styles.push(content);
    }
  }
  
  return { scripts, links, styles };
}

/**
 * 提取并转换 body 内容
 */
function extractBodyContent(html) {
  const bodyMatch = html.match(/(<body[^>]*>)([\s\S]*)(<\/body>)/i);
  if (!bodyMatch) return '';
  
  const [, openTag, innerContent, closeTag] = bodyMatch;
  
  let convertedOpenTag = openTag
    .replace(/(\s)class=/g, '$1className=')
    .replace(/(\s)for=/g, '$1htmlFor=');
  
  let content = innerContent.trim()
    .replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}')
    .replace(/(\s)class=/g, '$1className=')
    .replace(/(<pre[^>]*>)([\s\S]*?)(<\/pre>)/gi, (match, openTag, preContent, closeTag) => {
      const escapedContent = preContent
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$')
        .replace(/\{/g, '\\{');
      return `${openTag.slice(0, -1)} dangerouslySetInnerHTML={{ __html: \`${escapedContent}\` }} />`;
    })
    .replace(/(\s)for=/g, '$1htmlFor=')
    .replace(/style='([^']*)'/g, (match, styleStr) => convertStyleToJSX(styleStr))
    .replace(/style="([^"]*)"/g, (match, styleStr) => convertStyleToJSX(styleStr));
  
  return convertedOpenTag + '\n' + content + '\n    </body>';
}

function convertStyleToJSX(styleStr) {
  if (!styleStr.trim()) return 'style={{}}';
  
  const styles = [];
  let currentProp = '';
  let inUrl = false;
  
  for (let i = 0; i < styleStr.length; i++) {
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
    .filter(s => s.includes(':'))
    .map(s => {
      const colonIndex = s.indexOf(':');
      const key = s.substring(0, colonIndex).trim();
      const value = s.substring(colonIndex + 1).trim();
      if (!key || !value) return '';
      
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
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

/**
 * 生成组件代码
 */
function generateComponent(pageName, bodyContent, headContent) {
  const componentName = pageName
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  let cleanedContent = bodyContent.trim();
  if (cleanedContent.startsWith('{/*')) {
    const firstTagIndex = cleanedContent.indexOf('<');
    if (firstTagIndex > 0) {
      cleanedContent = cleanedContent.substring(firstTagIndex);
    }
  }
  
  const needsWrapper = !isWrappedInSingleElement(cleanedContent);
  const finalContent = needsWrapper ? `<>\n${cleanedContent}\n    </>` : cleanedContent;
  
  // 生成注入代码（仅用于外部资源，不包括 Tailwind）
  let injectionCode = '';
  
  if (headContent.links.length > 0 || headContent.scripts.length > 0) {
    const hasExternalScripts = headContent.scripts.some(s => s.src);
    
    injectionCode = `
  // 动态注入外部资源
  React.useEffect(function () {
    const injected: (HTMLElement)[] = [];
    `;
    
    if (headContent.links.length > 0) {
      injectionCode += `
    // 注入 links
    ${JSON.stringify(headContent.links)}.forEach(function (linkInfo: any) {
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
    `;
    }
    
    if (hasExternalScripts) {
      injectionCode += `
    // 注入外部脚本
    ${JSON.stringify(headContent.scripts.filter(s => s.src))}.forEach(function (scriptInfo: any) {
      const existing = document.querySelector(\`script[src="\${scriptInfo.src}"]\`);
      if (!existing) {
        const script = document.createElement('script');
        if (scriptInfo.id) script.id = scriptInfo.id;
        script.src = scriptInfo.src;
        document.head.appendChild(script);
        injected.push(script);
      }
    });
    `;
    }
    
    injectionCode += `
    return function () {
      injected.forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    };
  }, []);
`;
  }
  
  return `/**
 * @name ${pageName}
 * 
 * 参考资料：
 * - /rules/development-standards.md
 * - /skills/default-resource-recommendations/SKILL.md
 */

import './style.css';
import React, { forwardRef, useImperativeHandle } from 'react';
import type { AxureProps, AxureHandle } from '../../common/axure-types';

const Component = forwardRef<AxureHandle, AxureProps>(function ${componentName}(innerProps, ref) {
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
${injectionCode}
  return (
${finalContent.split('\n').map(line => '    ' + line).join('\n')}
  );
});

export default Component;
`;
}

function isWrappedInSingleElement(content) {
  const trimmed = content.trim();
  if (!trimmed.startsWith('<')) return false;
  if (trimmed.startsWith('<body')) return trimmed.endsWith('</body>');
  
  const firstTagMatch = trimmed.match(/^<([a-zA-Z][a-zA-Z0-9]*)/);
  if (!firstTagMatch) return false;
  
  const tagName = firstTagMatch[1];
  const closingTag = `</${tagName}>`;
  if (!trimmed.endsWith(closingTag)) return false;
  
  const openCount = (trimmed.match(new RegExp(`<${tagName}[\\s>]`, 'g')) || []).length;
  const closeCount = (trimmed.match(new RegExp(`</${tagName}>`, 'g')) || []).length;
  return openCount === closeCount && openCount === 1;
}

function generateStyleCSS(headContent, tailwindConfig) {
  let css = '@import "tailwindcss";\n';
  
  // 添加从 Tailwind 配置提取的 CSS
  if (tailwindConfig) {
    css += '\n/* 从 Stitch Tailwind 配置提取的样式 */';
    css += generateTailwindCSS(tailwindConfig);
  }
  
  // 添加原始 style 标签中的内容
  if (headContent.styles && headContent.styles.length > 0) {
    css += '\n/* 原始自定义样式 */\n';
    css += headContent.styles.join('\n\n');
  }
  
  return css;
}

/**
 * 转换单个页面
 */
function convertPage(pagePath, outputDir, pageName) {
  log(`正在转换页面: ${pageName}`, 'progress');
  
  const htmlPath = path.join(pagePath, 'code.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  
  const tailwindConfig = extractTailwindConfig(html);
  if (tailwindConfig) {
    log(`  ✓ 提取到 Tailwind 配置`, 'info');
  } else {
    log(`  ⚠ 未找到 Tailwind 配置`, 'warn');
  }
  
  const headContent = extractHeadContent(html);
  const bodyContent = extractBodyContent(html);
  
  ensureDir(outputDir);
  
  const componentCode = generateComponent(pageName, bodyContent, headContent);
  const styleCSS = generateStyleCSS(headContent, tailwindConfig);
  
  fs.writeFileSync(path.join(outputDir, 'index.tsx'), componentCode);
  fs.writeFileSync(path.join(outputDir, 'style.css'), styleCSS);
  
  log(`页面转换完成: ${pageName}`, 'info');
}

/**
 * 检测项目类型
 */
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

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    console.log(`
使用方法:
  node scripts/stitch-converter-v2.mjs <stitch-dir> [output-name]

示例:
  node scripts/stitch-converter-v2.mjs ".drafts/stitch_project" my-page
    `);
    process.exit(0);
  }
  
  const stitchDirArg = args[0];
  const outputName = args[1] || path.basename(stitchDirArg)
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  
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
      convertPage(prototypes[0].path, outputDir, outputName);
      log('✅ 转换完成！', 'info');
      log(`📁 页面位置: ${outputDir}`, 'info');
    } else {
      // 多页面项目：每个页面创建独立的顶级文件夹
      const convertedPages = [];
      for (const page of prototypes) {
        const pageFolderName = (outputName + '-' + page.name)
          .replace(/[^a-z0-9-_]/gi, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .toLowerCase();
        const pageOutputDir = path.join(CONFIG.pagesDir, pageFolderName);
        convertPage(page.path, pageOutputDir, page.name);
        convertedPages.push({
          name: page.name,
          folder: pageFolderName,
          url: `/prototypes/${pageFolderName}/`
        });
      }
      
      log('✅ 转换完成！', 'info');
      log(`📁 已生成 ${convertedPages.length} 个页面:`, 'info');
      convertedPages.forEach(p => {
        log(`   - ${p.name}: ${p.folder}`, 'info');
      });
    }
    
  } catch (error) {
    log(`转换失败: ${error.message}`, 'error');
    process.exit(1);
  }
}

main();
