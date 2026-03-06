import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 自动调试插件
 * 提供代码检查、错误诊断、自动修复等 API
 */
export function autoDebugPlugin(): Plugin {
  return {
    name: 'auto-debug-plugin',
    configureServer(server) {
      
      // API 1: 代码检查
      server.middlewares.use('/api/check-code', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', async () => {
          try {
            const { path: targetPath, code, type } = JSON.parse(body);
            
            if (!targetPath || !code) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing path or code parameter' }));
              return;
            }

            const errors: any[] = [];

            // 1. 检查组件导出
            if (!code.includes('export default')) {
              errors.push({
                type: 'export',
                severity: 'error',
                message: 'Component must be exported with "export default"',
                suggestion: 'Add "export default <ComponentName>" at the end of the file'
              });
            }

            // 2. 检查 @name 注释
            if (!code.match(/@(?:name|displayName)\s+.+/)) {
              errors.push({
                type: 'metadata',
                severity: 'error',
                message: 'Missing @name comment',
                suggestion: 'Add "/**\\n * @name Component Name\\n */" at the top of the file'
              });
            }

            // 3. 检查 React.createElement 使用
            if (code.includes('React.createElement') || code.includes('<')) {
              // 正常使用 React
            } else {
              errors.push({
                type: 'react',
                severity: 'warning',
                message: 'Component does not seem to use React',
                suggestion: 'Make sure to use React.createElement or JSX'
              });
            }

            // 4. 检查常见错误模式
            const commonErrors = [
              {
                pattern: /\.map\(/,
                check: (code: string) => !code.includes('&&') && !code.includes('||'),
                message: 'Potential null/undefined error with .map()',
                suggestion: 'Add null check: data && data.map(...) or use default value: (data || []).map(...)'
              },
              {
                pattern: /fetch\(/,
                check: (code: string) => !code.includes('.catch('),
                message: 'Unhandled fetch error',
                suggestion: 'Add .catch() to handle fetch errors'
              },
              {
                pattern: /JSON\.parse\(/,
                check: (code: string) => !code.includes('try'),
                message: 'Unhandled JSON.parse error',
                suggestion: 'Wrap JSON.parse in try-catch block'
              }
            ];

            commonErrors.forEach(({ pattern, check, message, suggestion }) => {
              if (pattern.test(code) && check(code)) {
                errors.push({
                  type: 'runtime',
                  severity: 'warning',
                  message,
                  suggestion
                });
              }
            });

            // 5. TypeScript 类型检查（如果文件存在）
            const srcDir = path.resolve(process.cwd(), 'src', targetPath);
            if (fs.existsSync(srcDir)) {
              try {
                const { stderr } = await execAsync('npx tsc --noEmit', {
                  cwd: process.cwd(),
                  timeout: 10000
                });
                
                if (stderr) {
                  const typeErrors = parseTypeScriptErrors(stderr, targetPath);
                  errors.push(...typeErrors);
                }
              } catch (e: any) {
                // TypeScript 错误会通过 stderr 返回
                if (e.stderr) {
                  const typeErrors = parseTypeScriptErrors(e.stderr, targetPath);
                  errors.push(...typeErrors);
                }
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: errors.filter(e => e.severity === 'error').length === 0,
              errors
            }));
          } catch (e: any) {
            console.error('Check code error:', e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });

      // API 2: 自动修复
      server.middlewares.use('/api/auto-fix', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', async () => {
          try {
            const { path: targetPath, error } = JSON.parse(body);
            
            if (!targetPath || !error) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing path or error parameter' }));
              return;
            }

            const srcFile = path.resolve(process.cwd(), 'src', targetPath, 'index.tsx');
            
            if (!fs.existsSync(srcFile)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Source file not found' }));
              return;
            }

            let code = fs.readFileSync(srcFile, 'utf8');
            let fixed = false;
            const changes: any[] = [];

            // 修复策略 1: 缺少 export default
            if (error.type === 'export' || error.message.includes('export default')) {
              if (!code.includes('export default')) {
                // 查找组件定义
                const componentMatch = code.match(/const\s+(\w+)\s*=\s*function/);
                if (componentMatch) {
                  const componentName = componentMatch[1];
                  code += `\n\nexport default ${componentName};\n`;
                  fixed = true;
                  changes.push({
                    file: srcFile,
                    change: `Added: export default ${componentName}`
                  });
                }
              }
            }

            // 修复策略 2: 缺少 @name 注释
            if (error.type === 'metadata' || error.message.includes('@name')) {
              if (!code.match(/@(?:name|displayName)/)) {
                const folderName = path.basename(path.dirname(srcFile));
                const displayName = folderName.split('-').map(w => 
                  w.charAt(0).toUpperCase() + w.slice(1)
                ).join(' ');
                
                code = `/**\n * @name ${displayName}\n */\n${code}`;
                fixed = true;
                changes.push({
                  file: srcFile,
                  change: `Added: @name ${displayName}`
                });
              }
            }

            // 修复策略 3: 添加空值检查
            if (error.message.includes('null') || error.message.includes('undefined')) {
              // 查找 .map( 调用
              const mapPattern = /(\w+)\.map\(/g;
              let match;
              while ((match = mapPattern.exec(code)) !== null) {
                const varName = match[1];
                // 检查是否已有空值检查
                const hasCheck = new RegExp(`${varName}\\s*&&|\\|\\||\\?\\.|if\\s*\\(${varName}\\)`).test(code);
                if (!hasCheck) {
                  code = code.replace(
                    new RegExp(`${varName}\\.map\\(`),
                    `(${varName} || []).map(`
                  );
                  fixed = true;
                  changes.push({
                    file: srcFile,
                    change: `Added null check for ${varName}.map()`
                  });
                }
              }
            }

            // 如果有修复，写入文件
            if (fixed) {
              fs.writeFileSync(srcFile, code, 'utf8');
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              fixed,
              changes,
              message: fixed ? 'Code fixed successfully' : 'No automatic fix available'
            }));
          } catch (e: any) {
            console.error('Auto fix error:', e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });

      // API 3: 运行时错误上报
      server.middlewares.use('/api/report-error', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', () => {
          try {
            const { path: targetPath, error } = JSON.parse(body);
            
            console.log(`[Auto Debug] Runtime error in ${targetPath}:`, error);

            // 分析错误并提供建议
            const suggestion = analyzeRuntimeError(error);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              received: true,
              suggestion
            }));
          } catch (e: any) {
            console.error('Report error failed:', e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });

      // API 4: 依赖检查
      server.middlewares.use('/api/check-dependencies', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', () => {
          try {
            const { code } = JSON.parse(body);
            
            if (!code) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing code parameter' }));
              return;
            }

            // 提取 import 语句
            const importPattern = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
            const imports: string[] = [];
            let match;
            
            while ((match = importPattern.exec(code)) !== null) {
              const packageName = match[1];
              // 只检查外部包（不是相对路径）
              if (!packageName.startsWith('.') && !packageName.startsWith('@/')) {
                // 提取包名（去掉子路径）
                const pkgName = packageName.startsWith('@') 
                  ? packageName.split('/').slice(0, 2).join('/')
                  : packageName.split('/')[0];
                if (!imports.includes(pkgName)) {
                  imports.push(pkgName);
                }
              }
            }

            // 检查 package.json
            const pkgPath = path.resolve(process.cwd(), 'package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            const allDeps = {
              ...pkg.dependencies,
              ...pkg.devDependencies
            };

            const missing: string[] = [];
            const available: string[] = [];

            imports.forEach(pkgName => {
              if (allDeps[pkgName]) {
                available.push(pkgName);
              } else {
                missing.push(pkgName);
              }
            });

            const suggestions = missing.map(pkg => `npm install ${pkg}`);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              missing,
              available,
              suggestions
            }));
          } catch (e: any) {
            console.error('Check dependencies error:', e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });

      // API 5: 白屏检测
      server.middlewares.use('/api/check-white-screen', (req: any, res: any) => {
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
            
            const srcFile = path.resolve(process.cwd(), 'src', targetPath, 'index.tsx');
            
            if (!fs.existsSync(srcFile)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Source file not found' }));
              return;
            }

            const code = fs.readFileSync(srcFile, 'utf8');
            const issues: any[] = [];

            // 检查 1: 是否有 export default
            if (!code.includes('export default')) {
              issues.push({
                type: 'export',
                message: 'Missing export default',
                suggestion: 'Add "export default <ComponentName>" at the end'
              });
            }

            // 检查 2: 是否有 @name 注释
            if (!code.match(/@(?:name|displayName)/)) {
              issues.push({
                type: 'metadata',
                message: 'Missing @name comment',
                suggestion: 'Add @name comment at the top'
              });
            }

            // 检查 3: 是否返回 React 元素
            if (!code.includes('React.createElement') && !code.includes('return')) {
              issues.push({
                type: 'render',
                message: 'Component does not return anything',
                suggestion: 'Make sure component returns a React element'
              });
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              isWhiteScreen: issues.length > 0,
              issues
            }));
          } catch (e: any) {
            console.error('Check white screen error:', e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    }
  };
}

/**
 * 解析 TypeScript 错误信息
 */
function parseTypeScriptErrors(stderr: string, targetPath: string): any[] {
  const errors: any[] = [];
  const lines = stderr.split('\n');
  
  lines.forEach(line => {
    // 匹配格式: src/prototypes/xxx/index.tsx(10,5): error TS2322: ...
    const match = line.match(/src\/(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+TS\d+:\s*(.+)/);
    if (match && match[1].includes(targetPath)) {
      errors.push({
        type: 'type',
        severity: match[4] === 'error' ? 'error' : 'warning',
        message: match[5],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        suggestion: 'Check TypeScript type definitions'
      });
    }
  });
  
  return errors;
}

/**
 * 分析运行时错误并提供建议
 */
function analyzeRuntimeError(error: any): string {
  const { message, type } = error;
  
  // 空值错误
  if (message.includes('null') || message.includes('undefined')) {
    if (message.includes('map')) {
      return 'Add null check before using .map(): (data || []).map(...)';
    }
    return 'Add null/undefined check before accessing properties';
  }
  
  // Promise 拒绝
  if (type === 'unhandledrejection') {
    return 'Add .catch() handler to Promise or use try-catch with async/await';
  }
  
  // 模块加载错误
  if (message.includes('Module') || message.includes('import')) {
    return 'Check if the module is installed: npm install <package-name>';
  }
  
  // React 渲染错误
  if (message.includes('React') || message.includes('render')) {
    return 'Check if component returns valid React element and has no circular dependencies';
  }
  
  return 'Check error stack trace for more details';
}
