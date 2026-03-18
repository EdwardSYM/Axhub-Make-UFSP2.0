#!/usr/bin/env node

/**
 * AI Studio 项目预处理器（最小化处理模式）
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
      tasksFileName: '.ai-studio-theme-tasks.md',
      analysisFileName: '.ai-studio-theme-analysis.json',
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
    tasksFileName: '.ai-studio-tasks.md',
    analysisFileName: '.ai-studio-analysis.json',
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
      // 跳过 node_modules
      if (entry.name === 'node_modules') continue;
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
      if (entry.name === 'node_modules') continue;
      count += copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

console.log('AI Studio Converter - Minimal Processing Mode\n');

function analyzeProject(targetDir) {
  const analysis = {
    files: [],
    components: [],
    dependencies: {},
    structure: {},
    indexHtml: null,
    viteConfig: null
  };

  const files = findFiles(targetDir, ['.tsx', '.ts']);

  files.forEach(file => {
    const relativePath = path.relative(targetDir, file);
    const content = fs.readFileSync(file, 'utf8');
    const fileName = path.basename(file);

    const fileInfo = {
      path: relativePath,
      isAppTsx: fileName === 'App.tsx',
      isIndexTsx: fileName === 'index.tsx',
      imports: []
    };

    const importMatches = content.matchAll(/import\s+.*from\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      fileInfo.imports.push(match[1]);
    }

    analysis.files.push(fileInfo);

    if (relativePath.startsWith('components/')) {
      analysis.components.push(relativePath);
    }
  });

  const indexHtmlPath = path.join(targetDir, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

    const importMapMatch = htmlContent.match(/<script type="importmap">([\s\S]*?)<\/script>/);
    const importMap = importMapMatch ? JSON.parse(importMapMatch[1]) : null;

    const styleMatches = htmlContent.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g);
    const customStyles = Array.from(styleMatches).map(m => m[1].trim());

    const fontMatches = htmlContent.matchAll(/<link[^>]*href=["']([^"']*fonts\.googleapis\.com[^"']*)["'][^>]*>/g);
    const fonts = Array.from(fontMatches).map(m => m[1]);

    analysis.indexHtml = {
      importMap,
      customStyles,
      fonts,
      hasTailwindCDN: htmlContent.includes('cdn.tailwindcss.com')
    };
  }

  const viteConfigPath = path.join(targetDir, 'vite.config.ts');
  if (fs.existsSync(viteConfigPath)) {
    const viteContent = fs.readFileSync(viteConfigPath, 'utf8');

    const aliasMatch = viteContent.match(/alias:\s*{([^}]*)}/);
    const aliases = aliasMatch ? aliasMatch[1].trim() : null;

    const defineMatch = viteContent.match(/define:\s*{([^}]*)}/);
    const envVars = defineMatch ? defineMatch[1].trim() : null;

    analysis.viteConfig = {
      hasAlias: !!aliases,
      aliases,
      hasEnvVars: !!envVars,
      envVars
    };
  }

  const packageJsonPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const deps = packageJson.dependencies || {};
    analysis.dependencies = {
      all: deps,
      toInstall: Object.keys(deps).filter(dep => {
        if (dep === 'react' || dep === 'react-dom') return false;
        return true;
      }),
      excluded: ['react', 'react-dom']
    };
  } else if (analysis.indexHtml?.importMap) {
    const imports = analysis.indexHtml.importMap.imports || {};
    const cdnDeps = Object.keys(imports).filter(dep => {
      if (dep === 'react' || dep === 'react-dom') return false;
      return true;
    });

    analysis.dependencies = {
      fromCDN: cdnDeps,
      toInstall: cdnDeps,
      excluded: ['react', 'react-dom']
    };
  }

  analysis.structure = {
    hasAppTsx: fs.existsSync(path.join(targetDir, 'App.tsx')),
    hasIndexTsx: fs.existsSync(path.join(targetDir, 'index.tsx')),
    hasIndexHtml: fs.existsSync(path.join(targetDir, 'index.html')),
    hasComponentsDir: fs.existsSync(path.join(targetDir, 'components')),
    hasAssetsDir: fs.existsSync(path.join(targetDir, 'assets')),
    hasConstantsTs: fs.existsSync(path.join(targetDir, 'constants.ts')),
    hasTypesTs: fs.existsSync(path.join(targetDir, 'types.ts')),
    hasViteConfig: fs.existsSync(path.join(targetDir, 'vite.config.ts')),
    hasMetadataJson: fs.existsSync(path.join(targetDir, 'metadata.json'))
  };

  return analysis;
}

function buildAnalysisReport(analysis) {
  return {
    summary: {
      totalFiles: analysis.files.length,
      componentCount: analysis.components.length,
      dependenciesToInstall: analysis.dependencies.toInstall?.length || 0,
      hasImportMap: !!analysis.indexHtml?.importMap,
      hasCustomStyles: (analysis.indexHtml?.customStyles?.length || 0) > 0,
      hasFonts: (analysis.indexHtml?.fonts?.length || 0) > 0
    },
    structure: analysis.structure,
    components: analysis.components,
    dependencies: analysis.dependencies,
    indexHtml: analysis.indexHtml,
    viteConfig: analysis.viteConfig,
    files: analysis.files
  };
}

function generateDefaultTasksDocument(report, targetInfo, outputName, tempDir) {
  const reportPath = path.join(targetInfo.outputDir, targetInfo.analysisFileName);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  let markdown = `# AI Studio 项目转换任务清单\n\n`;
  markdown += `> **重要**: 请先阅读 \`/rules/ai-studio-project-converter.md\` 了解转换规范\n\n`;
  markdown += `**名称**: ${outputName}\n`;
  markdown += `**项目位置**: \`${targetInfo.relativeOutputDir}/\`\n`;
  markdown += `**原始文件**: \`${tempDir}\` (仅供参考，不要修改)\n`;
  markdown += `**生成时间**: ${new Date().toLocaleString()}\n\n`;

  markdown += `## 📊 项目概况\n\n`;
  markdown += `- 总文件数: ${report.summary.totalFiles}\n`;
  markdown += `- 组件数: ${report.summary.componentCount}\n`;
  markdown += `- Import Map: ${report.summary.hasImportMap ? '✓ 存在' : '✗ 不存在'}\n`;
  markdown += `- 自定义样式: ${report.summary.hasCustomStyles ? '✓ 存在' : '✗ 不存在'}\n`;
  markdown += `- 外部字体: ${report.summary.hasFonts ? '✓ 存在' : '✗ 不存在'}\n`;
  markdown += `- 需要安装的依赖: ${report.summary.dependenciesToInstall} 个\n\n`;

  markdown += `## ✅ 转换任务（共 5 个）\n\n`;

  markdown += `### 任务 1: 转换主应用组件\n\n`;
  markdown += `**目标**: 将 \`App.tsx\` 转换为本项目组件规范\n\n`;
  if (report.structure.hasAppTsx) {
    markdown += `**参考文件**: \`${targetInfo.relativeOutputDir}/App.tsx\`\n\n`;
    markdown += `**操作**:\n`;
    markdown += `1. 重命名 \`App.tsx\` 为 \`index.tsx\`\n`;
    markdown += `2. 按照 \`/rules/ai-studio-project-converter.md\` 中的本项目组件规范改造\n`;
    markdown += `3. 添加文件头部注释（\`@name\` 和参考资料）\n`;
    markdown += `4. 使用 \`forwardRef<AxureHandle, AxureProps>\` 包装\n`;
    markdown += `5. 实现 \`useImperativeHandle\`\n`;
    markdown += `6. 保持原有的 JSX、Hooks 和 Tailwind 类名不变\n\n`;
  } else {
    markdown += `⚠️ 未找到 \`App.tsx\`，请手动创建 \`index.tsx\`\n\n`;
  }

  markdown += `### 任务 2: 创建 style.css\n\n`;
  markdown += `**目标**: 提取 index.html 中的样式信息\n\n`;
  if (report.indexHtml) {
    markdown += `**操作**:\n`;
    markdown += `1. 创建 \`style.css\`，开头添加 \`@import "tailwindcss";\`\n`;

    if (report.indexHtml.customStyles.length > 0) {
      markdown += `2. 从 \`index.html\` 的 \`<style>\` 标签提取自定义样式\n`;
      markdown += `3. 将提取的样式添加到 \`style.css\`\n`;
    }

    if (report.indexHtml.fonts.length > 0) {
      markdown += `4. 添加外部字体引用:\n`;
      report.indexHtml.fonts.forEach(font => {
        markdown += `   \`@import url('${font}');\`\n`;
      });
    }
    markdown += `\n`;
  } else {
    markdown += `**操作**: 创建基础样式文件，内容为 \`@import "tailwindcss";\`\n\n`;
  }

  markdown += `### 任务 3: 移除 AI Studio 特定文件\n\n`;
  markdown += `**目标**: 删除不需要的文件\n\n`;
  markdown += `**需要删除**:\n`;
  if (report.structure.hasIndexHtml) {
    markdown += `- ✓ \`index.html\` (已提取信息)\n`;
  }
  if (report.structure.hasIndexTsx) {
    markdown += `- ✓ \`index.tsx\` (本项目有自己的入口)\n`;
  }
  if (report.structure.hasViteConfig) {
    markdown += `- ⚠️ \`vite.config.ts\` (检查路径别名后可删除)\n`;
  }
  if (report.structure.hasMetadataJson) {
    markdown += `- ⚠️ \`metadata.json\` (可选保留作为参考)\n`;
  }
  markdown += `\n`;

  markdown += `### 任务 4: 安装依赖\n\n`;
  if (report.dependencies.toInstall && report.dependencies.toInstall.length > 0) {
    markdown += `**执行命令**:\n`;
    markdown += `\`\`\`bash\n`;
    markdown += `pnpm add ${report.dependencies.toInstall.join(' ')}\n`;
    markdown += `\`\`\`\n\n`;

    if (report.dependencies.fromCDN) {
      markdown += `**CDN 依赖映射**:\n`;
      report.dependencies.fromCDN.forEach(dep => {
        markdown += `- \`${dep}\` (从 Import Map 识别)\n`;
      });
      markdown += `\n`;
    }
  } else {
    markdown += `✓ 无需安装额外依赖\n\n`;
  }

  if (report.viteConfig?.hasEnvVars) {
    markdown += `**环境变量**:\n`;
    markdown += `⚠️ 项目使用了环境变量，需要配置 \`.env.local\`\n`;
    markdown += `\`\`\`\n${report.viteConfig.envVars}\n\`\`\`\n\n`;
  }

  markdown += `### 任务 5: 验收测试\n\n`;
  markdown += `**执行命令**:\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `node scripts/check-app-ready.mjs ${targetInfo.checkPath}\n`;
  markdown += `\`\`\`\n\n`;
  markdown += `**验收标准**: 状态为 READY，页面正常渲染，无控制台错误\n\n`;

  markdown += `## 📚 参考资料\n\n`;
  markdown += `- **转换规范**: \`/rules/ai-studio-project-converter.md\`\n`;
  markdown += `- **原始项目**: \`${tempDir}\` (仅供参考)\n`;
  markdown += `- **详细数据**: \`${targetInfo.analysisFileName}\`\n\n`;

  markdown += `## 💡 注意事项\n\n`;
  markdown += `1. **Import Map**: CDN 依赖需转换为 npm 包\n`;
  markdown += `2. **自定义样式**: 从 index.html 提取到 style.css\n`;
  markdown += `3. **路径别名**: 检查 vite.config.ts 中的 alias 配置\n`;
  markdown += `4. **环境变量**: \`process.env.*\` 需改为 \`import.meta.env.VITE_*\`\n`;
  markdown += `5. **原始文件**: \`${tempDir}\` 目录保留作为参考，不要修改\n`;
  markdown += `6. **验证**: 完成后务必运行验收脚本确认\n`;

  const mdPath = path.join(targetInfo.outputDir, targetInfo.tasksFileName);
  fs.writeFileSync(mdPath, markdown);

  return { reportPath, mdPath };
}

function generateThemeTasksDocument(report, targetInfo, outputName, tempDir) {
  const reportPath = path.join(targetInfo.outputDir, targetInfo.analysisFileName);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  let markdown = `# AI Studio 主题导入任务清单\n\n`;
  markdown += `> **重要**: 请先阅读 \`/rules/ai-studio-project-converter.md\` 与主题拆分技能文档，按任务顺序执行\n\n`;
  markdown += `**主题 key**: ${outputName}\n`;
  markdown += `**主题目录**: \`${targetInfo.relativeOutputDir}/\`\n`;
  markdown += `**原始文件**: \`${tempDir}\` (仅供参考，不要修改)\n`;
  markdown += `**生成时间**: ${new Date().toLocaleString()}\n\n`;

  markdown += `## 📊 输入概况\n\n`;
  markdown += `- 总文件数: ${report.summary.totalFiles}\n`;
  markdown += `- 组件数: ${report.summary.componentCount}\n`;
  markdown += `- Import Map: ${report.summary.hasImportMap ? '✓' : '✗'}\n`;
  markdown += `- 自定义样式: ${report.summary.hasCustomStyles ? '✓' : '✗'}\n`;
  markdown += `- 待评估依赖: ${report.summary.dependenciesToInstall} 个\n\n`;

  markdown += `## 📚 参考文档（必须阅读）\n\n`;
  markdown += `- \`/rules/ai-studio-project-converter.md\`\n`;
  THEME_SPLIT_SKILL_DOCS.forEach((docPath) => {
    markdown += `- \`${docPath}\`\n`;
  });
  markdown += `\n`;

  markdown += `## ✅ 主题导入任务（共 5 个）\n\n`;

  markdown += `### 任务 1：生成主题 token\n\n`;
  markdown += `**目标**：在 \`${targetInfo.relativeOutputDir}/\` 下生成 \`globals.css\` 或 \`designToken.json\`（二选一）\n\n`;
  markdown += `**要求**：\n`;
  markdown += `- 若输出 \`designToken.json\`，必须包含 \`name\` 字段\n`;
  markdown += `- 结合 AI Studio 项目中的配色、字体和组件样式提炼 token\n\n`;

  markdown += `### 任务 2：生成 DESIGN-SPEC.md\n\n`;
  markdown += `**目标**：输出 \`${targetInfo.relativeOutputDir}/DESIGN-SPEC.md\`\n\n`;
  markdown += `**要求**：说明视觉语言、组件规范、排版层级、交互状态与适配策略\n\n`;

  markdown += `### 任务 3：按需生成项目文档\n\n`;
  markdown += `**目标**：在 \`src/docs/\` 下补充主题相关文档（如页面地图、项目概览）\n\n`;
  markdown += `**要求**：保证文档与主题规范和业务上下文一致\n\n`;

  markdown += `### 任务 4：按需生成数据模型\n\n`;
  markdown += `**目标**：在 \`src/database/\` 下补充或更新数据模型\n\n`;
  markdown += `**要求**：\n`;
  markdown += `- 文件名英文、\`tableName\` 中文\n`;
  markdown += `- 每个表包含 \`records\` 数组，记录 id 唯一\n\n`;

  markdown += `### 任务 5：生成/更新主题演示入口\n\n`;
  markdown += `**目标**：生成或更新 \`${targetInfo.relativeOutputDir}/index.tsx\`\n\n`;
  markdown += `**要求**：能清晰展示主题样式与 token 使用方式\n\n`;

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
    throw new Error('缺少 <ai-studio-project-dir> 参数');
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
AI Studio 项目预处理器

使用方法:
  node scripts/ai-studio-converter.mjs <ai-studio-project-dir> [output-name] [--target-type <prototypes|components|themes>]

示例:
  node scripts/ai-studio-converter.mjs "temp/my-ai-studio-project" my-page
  node scripts/ai-studio-converter.mjs "temp/my-ai-studio-project" brand-theme --target-type themes

功能:
  - 完整复制 AI Studio 项目（不修改代码）
  - 生成 AI 工作文档（默认 .ai-studio-tasks.md；主题模式 .ai-studio-theme-tasks.md）
  - 生成分析报告（默认 .ai-studio-analysis.json；主题模式 .ai-studio-theme-analysis.json）
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

  const aiStudioDir = path.resolve(CONFIG.projectRoot, parsed.projectDirArg);
  const targetInfo = getTargetInfo(parsed.targetType, parsed.outputName);
  const outputDir = targetInfo.outputDir;

  if (!fs.existsSync(aiStudioDir)) {
    log(`错误: 找不到目录 ${aiStudioDir}`, 'error');
    process.exit(1);
  }

  const appTsx = path.join(aiStudioDir, 'App.tsx');
  const indexHtml = path.join(aiStudioDir, 'index.html');
  if (!fs.existsSync(appTsx) && !fs.existsSync(indexHtml)) {
    log('错误: 这不是一个有效的 AI Studio 项目（缺少 App.tsx 或 index.html）', 'error');
    process.exit(1);
  }

  try {
    ensureDir(targetInfo.outputBaseDir);

    log(`开始预处理 AI Studio 项目（targetType=${parsed.targetType}）...`, 'info');

    log('步骤 1/4: 复制项目文件...', 'progress');
    const fileCount = copyDirectory(aiStudioDir, outputDir);
    log(`已复制 ${fileCount} 个文件`, 'info');

    log('步骤 2/4: 复制 assets 到目标目录...', 'progress');
    const assetsDir = path.join(aiStudioDir, 'assets');
    const outputAssetsDir = path.join(outputDir, 'assets');
    let assetCount = 0;
    if (fs.existsSync(assetsDir)) {
      assetCount = copyDirectory(assetsDir, outputAssetsDir);
      log(`已复制 ${assetCount} 个资源文件到 ${targetInfo.relativeOutputDir}/assets/`, 'info');
    } else {
      log('未找到 assets 目录，跳过', 'info');
    }

    log('步骤 3/4: 分析项目结构...', 'progress');
    const analysis = analyzeProject(outputDir);
    log(`发现 ${analysis.components.length} 个组件`, 'info');

    log('步骤 4/4: 生成任务文档...', 'progress');
    const report = buildAnalysisReport(analysis);
    const { reportPath, mdPath } = parsed.targetType === 'themes'
      ? generateThemeTasksDocument(report, targetInfo, parsed.outputName, `temp/${path.basename(aiStudioDir)}`)
      : generateDefaultTasksDocument(report, targetInfo, parsed.outputName, `temp/${path.basename(aiStudioDir)}`);

    log('✅ 预处理完成！', 'info');
    log('', 'info');
    log(`📁 ${targetInfo.label}位置: ${targetInfo.relativeOutputDir}/`, 'info');
    log(`📋 AI 工作文档: ${path.relative(CONFIG.projectRoot, mdPath)}`, 'info');
    log(`📊 详细数据: ${path.relative(CONFIG.projectRoot, reportPath)}`, 'info');
    log('', 'info');
    log('📈 统计:', 'info');
    log(`  - 文件数: ${analysis.files.length}`, 'info');
    log(`  - 组件数: ${analysis.components.length}`, 'info');
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
