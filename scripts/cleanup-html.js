#!/usr/bin/env node

/**
 * 清理所有 components 和 prototypes 目录下的 index.html 文件
 * 因为现在使用统一的模板自动生成
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../src');
const elementsDir = path.join(srcDir, 'components');
const pagesDir = path.join(srcDir, 'prototypes');

let removedCount = 0;

function cleanupHtmlFiles(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      const htmlPath = path.join(itemPath, 'index.html');
      if (fs.existsSync(htmlPath)) {
        console.log(`删除: ${path.relative(srcDir, htmlPath)}`);
        fs.unlinkSync(htmlPath);
        removedCount++;
      }
    }
  }
}

console.log('开始清理 HTML 文件...\n');

cleanupHtmlFiles(elementsDir);
cleanupHtmlFiles(pagesDir);

console.log(`\n完成！共删除 ${removedCount} 个 HTML 文件。`);
console.log('现在所有组件和页面将使用统一的模板: src/common/dev-template.html');
