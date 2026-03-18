#!/usr/bin/env node

/**
 * V0 项目预处理器（最小化处理模式）
 *
 * 只做 100% 有把握的操作：
 * 1. 完整复制项目
 * 2. 分析项目结构
 * 3. 生成任务文档
 *
 * 不做任何代码修改，全部留给 AI 处理
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_TYPE_TO_SRC_DIR = {
  prototypes: 'src/prototypes',
  components: 'src/components',
  themes: 'src/themes',
};

const THEME_SPLIT_SKILL_DOCS = [
  '/skills/axure-prototype-workflow/theme-generation.md',
  '/skills/axure-prototype-workflow/doc-generation.md',
  '/skills/axure-prototype-workflow/data-generation.md',
  '/skills/web-page-workflow/theme-generation.md',
  '/skills/web-page-workflow/doc-generation.md',
  '/skills/web-page-workflow/data-generation.md',
];

const CONFIG = {
  projectRoot: path.resolve(__dirname, '..'),
  tempDir: path.resolve(__dirname, '../temp'),
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

function sanitizeName(rawName) {
  return String(rawName || '')
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function getTargetInfo(targetType, outputName) {
  const srcDir = TARGET_TYPE_TO_SRC_DIR[targetType];
  const outputBaseDir = path.resolve(CONFIG.projectRoot, srcDir);
  const outputDir = path.join(outputBaseDir, outputName);
  const relativeOutputDir = `${srcDir}/${outputName}`;

  if (targetType === 'themes') {
    return {
      targetType,
      srcDir,
      outputBaseDir,
      outputDir,
      relativeOutputDir,
      tasksFileName: '.v0-theme-tasks.md',
      analysisFileName: '.v0-theme-analysis.json',
      checkPath: `/themes/${outputName}`,
      label: '主题',
    };
  }

  return {
    targetType,
    srcDir,
    outputBaseDir,
    outputDir,
    relativeOutputDir,
    tasksFileName: '.v0-tasks.md',
    analysisFileName: '.v0-analysis.json',
    checkPath: `/${targetType}/${outputName}`,
    label: targetType === 'components' ? '组件' : '页面',
  };
}

// 递归查找所有 .tsx/.ts 文件
function findFiles(dir, extensions = ['.tsx', '.ts']) {
  const results = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // 跳过 node_modules 和 .next
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      results.push(...findFiles(fullPath, extensions));
    } else {
      const ext = path.extname(entry.name);
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) return 0;
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      count += copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

console.log('V0 Converter - Minimal Processing Mode\n');

/**
 * 批量处理文件：删除 "use client" 和转换路径别名
 * 这些是 100% 确定需要做的转换
 */
function processFiles(targetDir) {
  const files = findFiles(targetDir, ['.tsx', '.ts', '.jsx', '.js']);
  let processedCount = 0;

  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // 1. 删除 "use client" 指令（100% 确定需要删除）
    const newContent1 = content.replace(/['"]use client['"]\s*;?\s*\n?/g, '');
    if (newContent1 !== content) {
      content = newContent1;
      modified = true;
    }

    // 2. 转换路径别名 @/ 为相对路径（100% 确定需要转换）
    if (content.includes('@/')) {
      const fileDir = path.dirname(file);
      const relativePath = path.relative(fileDir, targetDir);

      // 替换 from '@/...' 和 from "@/..."
      content = content.replace(
        /from\s+(['"])@\//g,
        `from $1${relativePath}/`
      );

      // 替换 import type ... from '@/...' 和 import type ... from "@/..."
      content = content.replace(
        /import\s+type\s+(.*from\s+)(['"])@\//g,
        `import type $1$2${relativePath}/`
      );

      modified = true;
    }

    if (modified) {
      fs.writeFileSync(file, content);
      processedCount++;
    }
  });

  return processedCount;
}

function analyzeProject(targetDir) {
  const analysis = { files: [], pathAliases: [], nextjsImports: [], dependencies: {}, structure: {} };

  const files = findFiles(targetDir, ['.tsx', '.ts']);

  files.forEach(file => {
    const relativePath = path.relative(targetDir, file);
    const content = fs.readFileSync(file, 'utf8');
    const fileInfo = {
      path: relativePath,
      hasUseClient: content.includes('"use client"') || content.includes("'use client'"),
      pathAliases: [],
      nextjsImports: []
    };

    const aliasMatches = content.matchAll(/from\s+['"]@\/([^'"]+)['"]/g);
    for (const match of aliasMatches) {
      fileInfo.pathAliases.push({
        original: `@/${match[1]}`,
        relative: path.relative(path.dirname(file), path.join(targetDir, match[1]))
      });
    }

    const nextImports = content.matchAll(/import\s+.*from\s+['"]next\/([^'"]+)['"]/g);
    for (const match of nextImports) {
      fileInfo.nextjsImports.push(`next/${match[1]}`);
    }

    const vercelImports = content.matchAll(/import\s+.*from\s+['"]@vercel\/([^'"]+)['"]/g);
    for (const match of vercelImports) {
      fileInfo.nextjsImports.push(`@vercel/${match[1]}`);
    }

    analysis.files.push(fileInfo);
    if (fileInfo.pathAliases.length > 0) {
      analysis.pathAliases.push(...fileInfo.pathAliases.map(a => ({ file: relativePath, ...a })));
    }
    if (fileInfo.nextjsImports.length > 0) {
      analysis.nextjsImports.push(...fileInfo.nextjsImports.map(imp => ({ file: relativePath, import: imp })));
    }
  });

  const packageJsonPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const deps = packageJson.dependencies || {};
    analysis.dependencies = {
      all: deps,
      toInstall: Object.keys(deps).filter(dep => {
        if (dep === 'next' || dep.startsWith('next-')) return false;
        if (dep.startsWith('@vercel/')) return false;
        if (dep === 'react' || dep === 'react-dom') return false;
        return true;
      }),
      excluded: Object.keys(deps).filter(dep => {
        if (dep === 'next' || dep.startsWith('next-')) return true;
        if (dep.startsWith('@vercel/')) return true;
        if (dep === 'react' || dep === 'react-dom') return true;
        return false;
      })
    };
  }

  analysis.structure = {
    hasAppDir: fs.existsSync(path.join(targetDir, 'app')),
    hasPageTsx: fs.existsSync(path.join(targetDir, 'app/page.tsx')),
    hasLayoutTsx: fs.existsSync(path.join(targetDir, 'app/layout.tsx')),
    hasGlobalsCss: fs.existsSync(path.join(targetDir, 'app/globals.css')),
    hasComponentsDir: fs.existsSync(path.join(targetDir, 'components')),
    hasHooksDir: fs.existsSync(path.join(targetDir, 'hooks')),
    hasLibDir: fs.existsSync(path.join(targetDir, 'lib')),
    hasPublicDir: fs.existsSync(path.join(targetDir, 'public'))
  };

  return analysis;
}

function buildAnalysisReport(analysis) {
  return {
    summary: {
      totalFiles: analysis.files.length,
      filesWithUseClient: analysis.files.filter(f => f.hasUseClient).length,
      pathAliasCount: analysis.pathAliases.length,
      nextjsImportCount: analysis.nextjsImports.length,
      dependenciesToInstall: analysis.dependencies.toInstall?.length || 0
    },
    structure: analysis.structure,
    pathAliases: analysis.pathAliases,
    nextjsImports: analysis.nextjsImports,
    dependencies: analysis.dependencies,
    files: analysis.files
  };
}

function generateDefaultTasksDocument(report, targetInfo, outputName, tempDir) {
  const reportPath = path.join(targetInfo.outputDir, targetInfo.analysisFileName);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  let markdown = `# V0 项目转换任务清单\n\n`;
  markdown += `> **重要**: 请先阅读 \`/rules/v0-project-converter.md\` 了解转换规范\n\n`;
  markdown += `**名称**: ${outputName}\n`;
  markdown += `**项目位置**: \`${targetInfo.relativeOutputDir}/\`\n`;
  markdown += `**原始文件**: \`${tempDir}\` (仅供参考，不要修改)\n`;
  markdown += `**生成时间**: ${new Date().toLocaleString()}\n\n`;

  markdown += `## 📊 项目概况\n\n`;
  markdown += `- 总文件数: ${report.summary.totalFiles}\n`;
  markdown += `- ~~包含 'use client': ${report.summary.filesWithUseClient} 个文件~~ ✓ 已由脚本删除\n`;
  markdown += `- ~~路径别名 (@/): ${report.summary.pathAliasCount} 处~~ ✓ 已由脚本转换\n`;
  markdown += `- Next.js imports: ${report.summary.nextjsImportCount} 处（需要处理）\n`;
  markdown += `- 需要安装的依赖: ${report.summary.dependenciesToInstall} 个\n\n`;

  markdown += `## ✅ 转换任务\n\n`;

  markdown += `### 任务 1: 创建 index.tsx\n\n`;
  markdown += `**目标**: 将 \`app/page.tsx\` 包装为本项目组件\n\n`;
  markdown += `**参考文件**: \`${targetInfo.relativeOutputDir}/app/page.tsx\`\n\n`;
  markdown += `**操作**: 按照 \`/rules/v0-project-converter.md\` 中的本项目组件规范创建 \`index.tsx\`\n\n`;

  markdown += `### 任务 2: 创建 style.css\n\n`;
  markdown += `**目标**: 基于 \`app/globals.css\` 创建样式文件\n\n`;
  if (report.structure.hasGlobalsCss) {
    markdown += `**参考文件**: \`${targetInfo.relativeOutputDir}/app/globals.css\`\n\n`;
    markdown += `**操作**: 复制内容，确保开头有 \`@import "tailwindcss";\`\n\n`;
  } else {
    markdown += `**操作**: 创建基础样式文件，内容为 \`@import "tailwindcss";\`\n\n`;
  }

  markdown += `### 任务 3: 清理 Next.js 代码\n\n`;
  markdown += `**目标**: 移除 Next.js 特定的 imports 和组件\n\n`;
  markdown += `**需要处理**:\n`;
  markdown += `- ~~删除 \`"use client"\` 指令~~ ✓ 已由脚本处理\n`;
  markdown += `- ~~转换路径别名 \`@/\`~~ ✓ 已由脚本处理\n`;
  markdown += `- 移除 Next.js imports (${report.nextjsImports.length} 处)\n`;
  markdown += `- 替换组件: \`<Image>\` → \`<img>\`, \`<Link>\` → \`<a>\`\n`;
  markdown += `- 删除 \`Metadata\` 类型声明\n\n`;

  if (report.nextjsImports.length > 0) {
    markdown += `**Next.js imports 需要移除**:\n`;
    const grouped = {};
    report.nextjsImports.forEach(item => {
      if (!grouped[item.import]) grouped[item.import] = [];
      grouped[item.import].push(item.file);
    });
    Object.entries(grouped).slice(0, 5).forEach(([imp, files]) => {
      markdown += `- \`${imp}\` (${files.length} 个文件)\n`;
    });
    if (Object.keys(grouped).length > 5) {
      markdown += `- *...还有 ${Object.keys(grouped).length - 5} 种 imports*\n`;
    }
    markdown += `\n`;
  }

  markdown += `### 任务 4: 安装依赖\n\n`;
  if (report.dependencies.toInstall && report.dependencies.toInstall.length > 0) {
    markdown += `**执行命令**:\n`;
    markdown += `\`\`\`bash\n`;
    markdown += `pnpm add ${report.dependencies.toInstall.join(' ')}\n`;
    markdown += `\`\`\`\n\n`;
  } else {
    markdown += `✓ 无需安装额外依赖\n\n`;
  }

  markdown += `### 任务 5: 验收测试\n\n`;
  markdown += `**执行命令**:\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `node scripts/check-app-ready.mjs ${targetInfo.checkPath}\n`;
  markdown += `\`\`\`\n\n`;
  markdown += `**验收标准**: 状态为 READY，页面正常渲染，无控制台错误\n\n`;

  markdown += `## 📚 参考资料\n\n`;
  markdown += `- **转换规范**: \`/rules/v0-project-converter.md\`\n`;
  markdown += `- **原始项目**: \`${tempDir}\` (仅供参考)\n`;
  markdown += `- **详细数据**: \`${targetInfo.analysisFileName}\`\n\n`;

  markdown += `## 💡 注意事项\n\n`;
  markdown += `1. ~~**"use client"**: Next.js 指令，必须删除~~ ✓ 已由脚本处理\n`;
  markdown += `2. ~~**路径别名**: \`@/\` 需转换为相对路径~~ ✓ 已由脚本处理\n`;
  markdown += `3. **原始文件**: \`${tempDir}\` 目录保留作为参考，不要修改\n`;
  markdown += `4. **验证**: 完成后务必运行验收脚本确认\n`;

  const mdPath = path.join(targetInfo.outputDir, targetInfo.tasksFileName);
  fs.writeFileSync(mdPath, markdown);

  return { reportPath, mdPath };
}

function generateThemeTasksDocument(report, targetInfo, outputName, tempDir) {
  const reportPath = path.join(targetInfo.outputDir, targetInfo.analysisFileName);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  let markdown = `# V0 主题导入任务清单\n\n`;
  markdown += `> **重要**: 请先阅读 \`/rules/v0-project-converter.md\` 与主题拆分技能文档，按任务顺序执行\n\n`;
  markdown += `**主题 key**: ${outputName}\n`;
  markdown += `**主题目录**: \`${targetInfo.relativeOutputDir}/\`\n`;
  markdown += `**原始文件**: \`${tempDir}\` (仅供参考，不要修改)\n`;
  markdown += `**生成时间**: ${new Date().toLocaleString()}\n\n`;

  markdown += `## 📊 输入概况\n\n`;
  markdown += `- 总文件数: ${report.summary.totalFiles}\n`;
  markdown += `- 路径别名 (@/): ${report.summary.pathAliasCount} 处（已转换）\n`;
  markdown += `- Next.js imports: ${report.summary.nextjsImportCount} 处\n`;
  markdown += `- 依赖待评估: ${report.summary.dependenciesToInstall} 个\n\n`;

  markdown += `## 📚 参考文档（必须阅读）\n\n`;
  markdown += `- \`/rules/v0-project-converter.md\`\n`;
  THEME_SPLIT_SKILL_DOCS.forEach((docPath) => {
    markdown += `- \`${docPath}\`\n`;
  });
  markdown += `\n`;

  markdown += `## ✅ 主题导入任务（共 5 个）\n\n`;

  markdown += `### 任务 1：生成主题 token\n\n`;
  markdown += `**目标**：在 \`${targetInfo.relativeOutputDir}/\` 下生成 \`globals.css\` 或 \`designToken.json\`（二选一）\n\n`;
  markdown += `**要求**：\n`;
  markdown += `- 若输出 \`designToken.json\`，必须包含 \`name\` 字段\n`;
  markdown += `- 覆盖颜色、字体、间距、圆角、阴影等核心 token\n`;
  markdown += `- 与输入项目视觉风格一致\n\n`;

  markdown += `### 任务 2：生成 DESIGN-SPEC.md\n\n`;
  markdown += `**目标**：输出 \`${targetInfo.relativeOutputDir}/DESIGN-SPEC.md\`\n\n`;
  markdown += `**要求**：说明设计语言、组件风格、排版层级、状态规范与使用建议\n\n`;

  markdown += `### 任务 3：按需生成项目文档\n\n`;
  markdown += `**目标**：在 \`src/docs/\` 下补充主题相关项目文档（如页面地图/项目概览）\n\n`;
  markdown += `**要求**：文档需与主题风格、信息结构和业务语境保持一致\n\n`;

  markdown += `### 任务 4：按需生成数据模型\n\n`;
  markdown += `**目标**：在 \`src/database/\` 下补充或更新数据模型\n\n`;
  markdown += `**要求**：\n`;
  markdown += `- 文件名英文、\`tableName\` 中文\n`;
  markdown += `- 每个表包含 \`records\` 数组，记录 id 唯一\n\n`;

  markdown += `### 任务 5：生成/更新主题演示入口\n\n`;
  markdown += `**目标**：生成或更新 \`${targetInfo.relativeOutputDir}/index.tsx\`\n\n`;
  markdown += `**要求**：\n`;
  markdown += `- 演示主题 token 的核心效果\n`;
  markdown += `- 若使用 \`designToken.json\`，演示中需体现 token 注入方式\n\n`;

  markdown += `## 🔍 验收建议\n\n`;
  markdown += `- 目录检查：\`${targetInfo.relativeOutputDir}/\` 是否包含 token 文件、\`DESIGN-SPEC.md\` 与 \`index.tsx\`\n`;
  markdown += `- 文档检查：\`src/docs/\` 是否按需补充\n`;
  markdown += `- 数据检查：\`src/database/\` JSON 结构是否满足约束\n\n`;

  markdown += `## 📎 产物索引\n\n`;
  markdown += `- 任务清单：\`${targetInfo.tasksFileName}\`\n`;
  markdown += `- 分析报告：\`${targetInfo.analysisFileName}\`\n`;

  const mdPath = path.join(targetInfo.outputDir, targetInfo.tasksFileName);
  fs.writeFileSync(mdPath, markdown);

  return { reportPath, mdPath };
}

function parseArgs(rawArgs) {
  const args = [...rawArgs];
  const help = args.length === 0 || args.includes('--help') || args.includes('-h');

  if (help) {
    return { help: true };
  }

  let projectDirArg = '';
  let outputNameArg = '';
  let targetType = 'prototypes';

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--target-type') {
      const nextValue = args[index + 1];
      if (!nextValue) {
        throw new Error('参数 --target-type 缺少值');
      }
      targetType = String(nextValue).trim();
      index += 1;
      continue;
    }

    if (!projectDirArg) {
      projectDirArg = arg;
      continue;
    }

    if (!outputNameArg) {
      outputNameArg = arg;
      continue;
    }
  }

  if (!projectDirArg) {
    throw new Error('缺少 <v0-project-dir> 参数');
  }

  if (!Object.prototype.hasOwnProperty.call(TARGET_TYPE_TO_SRC_DIR, targetType)) {
    throw new Error(`不支持的 targetType: ${targetType}。可选值: ${Object.keys(TARGET_TYPE_TO_SRC_DIR).join(', ')}`);
  }

  const outputName = sanitizeName(outputNameArg || path.basename(projectDirArg));
  if (!outputName) {
    throw new Error('无法生成有效的输出名称，请显式传入 [output-name]');
  }

  return {
    help: false,
    projectDirArg,
    outputName,
    targetType,
  };
}

function printHelp() {
  console.log(`
V0 项目预处理器

使用方法:
  node scripts/v0-converter.mjs <v0-project-dir> [output-name] [--target-type <prototypes|components|themes>]

示例:
  node scripts/v0-converter.mjs "temp/my-v0-project" my-page
  node scripts/v0-converter.mjs "temp/my-v0-project" brand-theme --target-type themes

功能:
  - 完整复制 V0 项目（不修改代码）
  - 生成 AI 工作文档（默认 .v0-tasks.md；主题模式 .v0-theme-tasks.md）
  - 生成分析报告（默认 .v0-analysis.json；主题模式 .v0-theme-analysis.json）
  `);
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    log(`参数错误: ${error.message}`, 'error');
    printHelp();
    process.exit(1);
  }

  if (parsed.help) {
    printHelp();
    process.exit(0);
  }

  const v0Dir = path.resolve(CONFIG.projectRoot, parsed.projectDirArg);
  const targetInfo = getTargetInfo(parsed.targetType, parsed.outputName);
  const outputDir = targetInfo.outputDir;

  if (!fs.existsSync(v0Dir)) {
    log(`错误: 找不到目录 ${v0Dir}`, 'error');
    process.exit(1);
  }

  const appDir = path.join(v0Dir, 'app');
  if (!fs.existsSync(appDir)) {
    log('错误: 这不是一个有效的 V0 项目（缺少 app/ 目录）', 'error');
    process.exit(1);
  }

  try {
    ensureDir(targetInfo.outputBaseDir);

    log(`开始预处理 V0 项目（targetType=${parsed.targetType}）...`, 'info');

    log('步骤 1/4: 复制项目文件...', 'progress');
    const fileCount = copyDirectory(v0Dir, outputDir);
    log(`已复制 ${fileCount} 个文件`, 'info');

    log('步骤 2/4: 复制 public/images 到目标目录...', 'progress');
    const publicImagesDir = path.join(v0Dir, 'public/images');
    const outputImagesDir = path.join(outputDir, 'images');
    let imageCount = 0;
    if (fs.existsSync(publicImagesDir)) {
      imageCount = copyDirectory(publicImagesDir, outputImagesDir);
      log(`已复制 ${imageCount} 个图片文件到 ${targetInfo.relativeOutputDir}/images/`, 'info');
    } else {
      log('未找到 public/images 目录，跳过', 'info');
    }

    log('步骤 3/4: 处理确定性转换（删除 "use client"，转换路径别名）...', 'progress');
    const processedCount = processFiles(outputDir);
    log(`已处理 ${processedCount} 个文件`, 'info');

    log('步骤 4/4: 分析项目并生成任务文档...', 'progress');
    const analysis = analyzeProject(outputDir);
    const report = buildAnalysisReport(analysis);
    const { reportPath, mdPath } = parsed.targetType === 'themes'
      ? generateThemeTasksDocument(report, targetInfo, parsed.outputName, `temp/${path.basename(v0Dir)}`)
      : generateDefaultTasksDocument(report, targetInfo, parsed.outputName, `temp/${path.basename(v0Dir)}`);

    log('✅ 预处理完成！', 'info');
    log('', 'info');
    log(`📁 ${targetInfo.label}位置: ${targetInfo.relativeOutputDir}/`, 'info');
    log(`📋 AI 工作文档: ${path.relative(CONFIG.projectRoot, mdPath)}`, 'info');
    log(`📊 详细数据: ${path.relative(CONFIG.projectRoot, reportPath)}`, 'info');
    log('', 'info');
    log('📈 统计:', 'info');
    log(`  - 文件数: ${analysis.files.length}`, 'info');
    log(`  - 路径别名: ${analysis.pathAliases.length} 处`, 'info');
    log(`  - Next.js imports: ${analysis.nextjsImports.length} 处`, 'info');
    log(`  - 依赖: ${analysis.dependencies.toInstall?.length || 0} 个`, 'info');
    log('', 'info');
    log('🎯 下一步:', 'info');
    log(`1. 查看任务文档: cat ${path.relative(CONFIG.projectRoot, mdPath)}`, 'info');
    log(parsed.targetType === 'themes'
      ? '2. 让 AI 按任务单完成主题/文档/数据生成'
      : '2. 让 AI 根据任务清单完成转换', 'info');
  } catch (error) {
    log(`预处理失败: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

main();
