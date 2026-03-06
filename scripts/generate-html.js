#!/usr/bin/env node

/**
 * 为所有 components 和 prototypes 生成 index.html 文件
 * 使用统一的模板
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../src');
const templatePath = path.join(srcDir, 'common/dev-template.html');
const elementsDir = path.join(srcDir, 'components');
const pagesDir = path.join(srcDir, 'prototypes');

let generatedCount = 0;

// 读取模板
if (!fs.existsSync(templatePath)) {
  console.error('错误: 模板文件不存在:', templatePath);
  process.exit(1);
}

const template = fs.readFileSync(templatePath, 'utf8');

function generateHtmlFiles(dir, type) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      const tsxPath = path.join(itemPath, 'index.tsx');
      const htmlPath = path.join(itemPath, 'index.html');
      
      // 只有存在 index.tsx 才生成 HTML
      if (fs.existsSync(tsxPath)) {
        // 生成标题
        let title = 'Dev Preview';
        if (type === 'components') {
          title = `Element: ${item} - Dev Preview`;
        } else if (type === 'prototypes') {
          title = `Page: ${item} - Dev Preview`;
        }
        
        // 替换模板变量
        let html = template.replace('{{TITLE}}', title);
        html = html.replace('{{ENTRY}}', './index.tsx');
        
        // 写入文件
        fs.writeFileSync(htmlPath, html, 'utf8');
        console.log(`生成: ${path.relative(srcDir, htmlPath)}`);
        generatedCount++;
      }
    }
  }
}

console.log('开始生成 HTML 文件...\n');

generateHtmlFiles(elementsDir, 'components');
generateHtmlFiles(pagesDir, 'prototypes');

console.log(`\n完成！共生成 ${generatedCount} 个 HTML 文件。`);
console.log('所有 HTML 文件都基于统一模板: src/common/dev-template.html');
