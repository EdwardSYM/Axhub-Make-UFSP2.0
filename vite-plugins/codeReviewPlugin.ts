/**
 * 代码检查插件
 * 
 * 提供 /api/code-review 端点，用于检查代码是否符合开发规范
 * 
 * 检查项目：
 * 1. 导出规范：必须存在 `export default`
 *    - 仅在 Axure 导出检查模式下，默认导出名必须是 `Component`
 * 2. Tailwind CSS：如果使用了 Tailwind 类名，必须在 style.css 中添加 `@import "tailwindcss"`
 * 3. Axure API：如果使用了 Axure API，必须符合 axure-types.ts 的类型定义
 */

import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

// 检查结果类型
export interface ReviewIssue {
  type: 'error' | 'warning';
  rule: string;
  message: string;
  line?: number;
  suggestion?: string;
}

export interface ReviewResult {
  file: string;
  passed: boolean;
  issues: ReviewIssue[];
}

interface ReviewOptions {
  enforceComponentExportName?: boolean;
}

export type AxureApiListKey = 'eventList' | 'actionList' | 'varList' | 'configList' | 'dataList';

export interface AxureApiListPreview {
  sourceKey: string | null;
  raw: string | null;
  items: Array<Record<string, unknown>>;
  parseStatus: 'parsed' | 'raw' | 'missing';
  warnings: string[];
}

export interface AxureApiPreviewResult {
  file: string;
  passedSourceCheck: boolean;
  hasAxureHandle: boolean;
  lists: Record<AxureApiListKey, AxureApiListPreview>;
}

const AXURE_LIST_KEYS: AxureApiListKey[] = ['eventList', 'actionList', 'varList', 'configList', 'dataList'];

function extractDefaultExportName(content: string): string | null {
  const namedFunctionMatch = content.match(/export\s+default\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/);
  if (namedFunctionMatch) {
    return namedFunctionMatch[1];
  }

  const namedClassMatch = content.match(/export\s+default\s+class\s+([A-Za-z_$][\w$]*)\b/);
  if (namedClassMatch) {
    return namedClassMatch[1];
  }

  const identifierMatch = content.match(/export\s+default\s+(?!function\b|class\b)([A-Za-z_$][\w$]*)\s*;?/);
  if (identifierMatch) {
    return identifierMatch[1];
  }

  return null;
}

/**
 * 检查文件是否包含 default export
 */
function checkExportDefault(content: string, filePath: string, options: ReviewOptions = {}): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  
  // 检查是否有 default export（不限制导出名称）
  const hasExportDefault = /\bexport\s+default\b/.test(content);
  
  if (!hasExportDefault) {
    issues.push({
      type: 'error',
      rule: 'export-default',
      message: '缺少 export default 导出',
      suggestion: '请添加 default 导出（例如：export default MyComponent）'
    });
    return issues;
  }

  if (options.enforceComponentExportName) {
    const exportedName = extractDefaultExportName(content);

    if (exportedName !== 'Component') {
      issues.push({
        type: 'error',
        rule: 'export-default-name',
        message: exportedName
          ? `导出名称错误：使用了 "${exportedName}"，Axure 导出检查要求使用 "Component"`
          : 'Axure 导出检查要求默认导出为命名变量 "Component"',
        suggestion: '请使用 `const Component = ...` 并导出 `export default Component`'
      });
    }
  }
  
  return issues;
}

/**
 * 检查 Tailwind CSS 配置
 */
function checkTailwindCSS(content: string, filePath: string): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  
  // 检查是否使用了 Tailwind 类名（常见的 Tailwind 类名模式）
  const tailwindPatterns = [
    /className=["'][^"']*\b(flex|grid|block|inline|hidden|relative|absolute|fixed|sticky)\b/,
    /className=["'][^"']*\b(w-|h-|m-|p-|text-|bg-|border-|rounded-)/,
    /className=["'][^"']*\b(hover:|focus:|active:|disabled:)/,
    /className=["'][^"']*\b(sm:|md:|lg:|xl:|2xl:)/
  ];
  
  const usesTailwind = tailwindPatterns.some(pattern => pattern.test(content));
  
  if (usesTailwind) {
    // 检查是否导入了 CSS 文件（支持 style.css, styles.css 等）
    const hasStyleImport = /import\s+['"]\.\/[^'"]*\.css['"]/.test(content);
    
    if (!hasStyleImport) {
      issues.push({
        type: 'error',
        rule: 'tailwind-style-import',
        message: '使用了 Tailwind CSS 类名，但未导入 CSS 文件',
        suggestion: '在文件顶部添加：import \'./style.css\' 或 import \'./styles.css\''
      });
    } else {
      // 提取导入的 CSS 文件名
      const styleImportMatch = content.match(/import\s+['"]\.\/([^'"]+\.css)['"]/);
      if (styleImportMatch) {
        const cssFileName = styleImportMatch[1];
        const dir = path.dirname(filePath);
        const stylePath = path.join(dir, cssFileName);
        
        if (fs.existsSync(stylePath)) {
          const styleContent = fs.readFileSync(stylePath, 'utf8');
          const hasTailwindImport = /@import\s+["']tailwindcss["']/.test(styleContent);
          
          if (!hasTailwindImport) {
            issues.push({
              type: 'error',
              rule: 'tailwind-css-import',
              message: `${cssFileName} 中缺少 @import "tailwindcss"`,
              suggestion: `在 ${cssFileName} 文件中添加：@import "tailwindcss";`
            });
          }
        } else {
          issues.push({
            type: 'error',
            rule: 'tailwind-style-file',
            message: `导入了 ${cssFileName} 但文件不存在`,
            suggestion: `创建 ${cssFileName} 文件并添加：@import "tailwindcss";`
          });
        }
      }
    }
  }
  
  return issues;
}

/**
 * 检查 Axure API 使用规范
 */
function checkAxureAPI(content: string, filePath: string): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  
  // 检查是否使用了 forwardRef
  const usesForwardRef = /forwardRef\s*</.test(content);
  
  if (!usesForwardRef) {
    // 可能不是 Axure 组件，跳过检查
    return issues;
  }
  
  // 检查是否导入了 AxureProps 和 AxureHandle（支持多行导入）
  const hasAxurePropsImport = /import\s+type\s*\{[^}]*\bAxureProps\b[^}]*\}\s*from\s+['"].*axure-types/.test(content.replace(/\n/g, ' '));
  const hasAxureHandleImport = /import\s+type\s*\{[^}]*\bAxureHandle\b[^}]*\}\s*from\s+['"].*axure-types/.test(content.replace(/\n/g, ' '));
  
  if (!hasAxurePropsImport) {
    issues.push({
      type: 'error',
      rule: 'axure-api-props',
      message: '使用了 forwardRef 但未导入 AxureProps 类型',
      suggestion: '从 axure-types 导入：import type { AxureProps, AxureHandle } from \'../../common/axure-types\''
    });
  }
  
  if (!hasAxureHandleImport) {
    issues.push({
      type: 'error',
      rule: 'axure-api-handle',
      message: '使用了 forwardRef 但未导入 AxureHandle 类型',
      suggestion: '从 axure-types 导入：import type { AxureProps, AxureHandle } from \'../../common/axure-types\''
    });
  }
  
  // 检查 forwardRef 类型标注
  const forwardRefMatch = content.match(/forwardRef\s*<\s*([^,>]+)\s*,\s*([^>]+)\s*>/);
  if (forwardRefMatch) {
    const handleType = forwardRefMatch[1].trim();
    const propsType = forwardRefMatch[2].trim();
    
    if (handleType !== 'AxureHandle') {
      issues.push({
        type: 'error',
        rule: 'axure-api-handle-type',
        message: `forwardRef 第一个类型参数错误：使用了 "${handleType}"，应该使用 "AxureHandle"`,
        suggestion: '使用正确的类型：forwardRef<AxureHandle, AxureProps>'
      });
    }
    
    if (propsType !== 'AxureProps') {
      issues.push({
        type: 'error',
        rule: 'axure-api-props-type',
        message: `forwardRef 第二个类型参数错误：使用了 "${propsType}"，应该使用 "AxureProps"`,
        suggestion: '使用正确的类型：forwardRef<AxureHandle, AxureProps>'
      });
    }
  }
  
  // 检查是否有 useImperativeHandle
  const hasUseImperativeHandle = /useImperativeHandle\s*\(/.test(content);
  if (usesForwardRef && !hasUseImperativeHandle) {
    issues.push({
      type: 'warning',
      rule: 'axure-api-imperative-handle',
      message: '使用了 forwardRef 但未使用 useImperativeHandle',
      suggestion: '使用 useImperativeHandle 暴露 AxureHandle 接口'
    });
  }
  
  // 检查 onEvent 参数类型（payload 必须是 string）
  const onEventCalls = content.match(/onEvent(?:Handler)?\s*\(\s*['"][^'"]+['"]\s*,\s*([^)]+)\)/g);
  if (onEventCalls) {
    onEventCalls.forEach(call => {
      // 检查是否传递了对象字面量作为 payload
      if (/\{[^}]+\}/.test(call)) {
        issues.push({
          type: 'error',
          rule: 'axure-api-event-payload',
          message: 'onEvent 的 payload 参数必须是字符串类型，不能传递对象',
          suggestion: '将对象转换为 JSON 字符串：JSON.stringify(payload)'
        });
      }
    });
  }
  
  return issues;
}

/**
 * 其他推荐检查项（需要用户确认）
 */
function checkRecommended(content: string, filePath: string): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  
  // 检查是否有 @name 注释
  const hasNameComment = /@name\s+.+/.test(content);
  if (!hasNameComment) {
    issues.push({
      type: 'warning',
      rule: 'file-header-name',
      message: '缺少 @name 注释',
      suggestion: '在文件头部添加：/**\\n * @name 组件名称\\n */'
    });
  }
  
  // 检查是否在 JSX 中直接定义函数（性能问题）
  const hasInlineFunction = /onClick=\{function\s*\(/.test(content) || /onClick=\{\(\s*\)\s*=>/.test(content);
  if (hasInlineFunction) {
    issues.push({
      type: 'warning',
      rule: 'jsx-inline-function',
      message: '在 JSX 中直接定义了函数，可能影响性能',
      suggestion: '使用 useCallback 预定义函数'
    });
  }
  
  // 检查是否使用了 ES6 解构 state（不推荐）
  const hasStateDestructure = /const\s*\[\s*\w+\s*,\s*\w+\s*\]\s*=\s*useState/.test(content);
  if (hasStateDestructure) {
    issues.push({
      type: 'warning',
      rule: 'state-destructure',
      message: '使用了 ES6 解构 state，不符合项目规范',
      suggestion: '使用数组索引访问：const countState = useState(0); const count = countState[0];'
    });
  }
  
  return issues;
}

/**
 * 检查单个文件
 */
function reviewFile(filePath: string, options: ReviewOptions = {}): ReviewResult {
  const issues: ReviewIssue[] = [];
  
  try {
    if (!fs.existsSync(filePath)) {
      return {
        file: filePath,
        passed: false,
        issues: [{
          type: 'error',
          rule: 'file-not-found',
          message: '文件不存在'
        }]
      };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log('[Code Review] Starting checks for:', filePath);
    
    // 执行各项检查
    const exportIssues = checkExportDefault(content, filePath, options);
    console.log('[Code Review] Export issues:', exportIssues.length);
    issues.push(...exportIssues);
    
    const tailwindIssues = checkTailwindCSS(content, filePath);
    console.log('[Code Review] Tailwind issues:', tailwindIssues.length);
    issues.push(...tailwindIssues);
    
    const axureIssues = checkAxureAPI(content, filePath);
    console.log('[Code Review] Axure issues:', axureIssues.length);
    issues.push(...axureIssues);
    
    console.log('[Code Review] Total issues:', issues.length);
    
  } catch (error: any) {
    issues.push({
      type: 'error',
      rule: 'file-read-error',
      message: `读取文件失败: ${error.message}`
    });
  }
  
  // 只有 error 类型的问题才算不通过
  const hasErrors = issues.some(issue => issue.type === 'error');
  
  return {
    file: filePath,
    passed: !hasErrors,
    issues
  };
}

function createMissingListPreview(): AxureApiListPreview {
  return {
    sourceKey: null,
    raw: null,
    items: [],
    parseStatus: 'missing',
    warnings: [],
  };
}

function createEmptyAxureApiPreview(filePath: string, passedSourceCheck: boolean): AxureApiPreviewResult {
  return {
    file: filePath,
    passedSourceCheck,
    hasAxureHandle: false,
    lists: {
      eventList: createMissingListPreview(),
      actionList: createMissingListPreview(),
      varList: createMissingListPreview(),
      configList: createMissingListPreview(),
      dataList: createMissingListPreview(),
    },
  };
}

function isUseImperativeHandleCallee(expression: ts.Expression): boolean {
  if (ts.isIdentifier(expression)) {
    return expression.text === 'useImperativeHandle';
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text === 'useImperativeHandle';
  }
  return false;
}

function collectTopLevelConstInitializers(sourceFile: ts.SourceFile): Map<string, ts.Expression> {
  const map = new Map<string, ts.Expression>();
  sourceFile.statements.forEach((statement) => {
    if (!ts.isVariableStatement(statement)) {
      return;
    }
    const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
    if (!isConst) {
      return;
    }
    statement.declarationList.declarations.forEach((declaration) => {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
        return;
      }
      map.set(declaration.name.text, declaration.initializer);
    });
  });
  return map;
}

function getObjectPropertyName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function findReturnedObjectFromFunction(fn: ts.Expression | undefined): ts.ObjectLiteralExpression | null {
  if (!fn) {
    return null;
  }
  if (ts.isArrowFunction(fn)) {
    if (ts.isObjectLiteralExpression(fn.body)) {
      return fn.body;
    }
    if (ts.isParenthesizedExpression(fn.body) && ts.isObjectLiteralExpression(fn.body.expression)) {
      return fn.body.expression;
    }
    if (ts.isBlock(fn.body)) {
      for (const statement of fn.body.statements) {
        if (ts.isReturnStatement(statement) && statement.expression && ts.isObjectLiteralExpression(statement.expression)) {
          return statement.expression;
        }
      }
    }
  }
  if (ts.isFunctionExpression(fn) || ts.isFunctionDeclaration(fn)) {
    if (!fn.body) {
      return null;
    }
    for (const statement of fn.body.statements) {
      if (ts.isReturnStatement(statement) && statement.expression && ts.isObjectLiteralExpression(statement.expression)) {
        return statement.expression;
      }
    }
  }
  return null;
}

interface HandleReturnObjectSearchResult {
  hasAxureHandle: boolean;
  handleObject: ts.ObjectLiteralExpression | null;
}

function findHandleReturnObject(sourceFile: ts.SourceFile): HandleReturnObjectSearchResult {
  const matches: ts.ObjectLiteralExpression[] = [];
  let hasCall = false;

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && isUseImperativeHandleCallee(node.expression)) {
      hasCall = true;
      const handleObject = findReturnedObjectFromFunction(node.arguments[1]);
      if (handleObject) {
        matches.push(handleObject);
      }
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);

  if (!hasCall) {
    return { hasAxureHandle: false, handleObject: null };
  }

  const withTargetKeys = matches.find((objectLiteral) => objectLiteral.properties.some((property) => {
    if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
      return false;
    }
    const propertyName = getObjectPropertyName(property.name);
    return propertyName != null && AXURE_LIST_KEYS.includes(propertyName as AxureApiListKey);
  }));

  return {
    hasAxureHandle: true,
    handleObject: withTargetKeys ?? matches[0] ?? null,
  };
}

interface ResolvedExpressionResult {
  expression: ts.Expression;
  warnings: string[];
}

function resolveExpressionFromConstMap(
  expression: ts.Expression,
  constants: Map<string, ts.Expression>,
): ResolvedExpressionResult {
  const warnings: string[] = [];
  const visited = new Set<string>();
  let current = expression;

  while (ts.isIdentifier(current)) {
    const key = current.text;
    const next = constants.get(key);
    if (!next) {
      break;
    }
    if (visited.has(key)) {
      warnings.push(`检测到循环引用: ${key}`);
      break;
    }
    visited.add(key);
    current = next;
  }

  return { expression: current, warnings };
}

interface ExpressionToJsonResult {
  value: unknown;
  unresolved: boolean;
  warnings: string[];
}

function expressionToJson(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
  constants: Map<string, ts.Expression>,
  visitedIdentifiers: Set<string> = new Set<string>(),
): ExpressionToJsonResult {
  if (ts.isParenthesizedExpression(expression)) {
    return expressionToJson(expression.expression, sourceFile, constants, visitedIdentifiers);
  }
  if (ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression) || ts.isNonNullExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return expressionToJson(expression.expression, sourceFile, constants, visitedIdentifiers);
  }
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return { value: expression.text, unresolved: false, warnings: [] };
  }
  if (ts.isNumericLiteral(expression)) {
    return { value: Number(expression.text), unresolved: false, warnings: [] };
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return { value: true, unresolved: false, warnings: [] };
  }
  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    return { value: false, unresolved: false, warnings: [] };
  }
  if (expression.kind === ts.SyntaxKind.NullKeyword) {
    return { value: null, unresolved: false, warnings: [] };
  }
  if (ts.isPrefixUnaryExpression(expression)) {
    const inner = expressionToJson(expression.operand, sourceFile, constants, visitedIdentifiers);
    if (typeof inner.value === 'number') {
      if (expression.operator === ts.SyntaxKind.MinusToken) {
        return { value: -inner.value, unresolved: inner.unresolved, warnings: inner.warnings };
      }
      if (expression.operator === ts.SyntaxKind.PlusToken) {
        return { value: Number(inner.value), unresolved: inner.unresolved, warnings: inner.warnings };
      }
      if (expression.operator === ts.SyntaxKind.ExclamationToken) {
        return { value: !inner.value, unresolved: inner.unresolved, warnings: inner.warnings };
      }
    }
    const warning = `无法静态解析前缀表达式: ${expression.getText(sourceFile)}`;
    return {
      value: { __expr: expression.getText(sourceFile) },
      unresolved: true,
      warnings: [...inner.warnings, warning],
    };
  }
  if (ts.isArrayLiteralExpression(expression)) {
    const warnings: string[] = [];
    let unresolved = false;
    const value = expression.elements.map((element) => {
      if (ts.isSpreadElement(element)) {
        unresolved = true;
        warnings.push(`数组项包含扩展语法: ${element.getText(sourceFile)}`);
        return { __expr: element.getText(sourceFile) };
      }
      const parsed = expressionToJson(element, sourceFile, constants, new Set(visitedIdentifiers));
      unresolved = unresolved || parsed.unresolved;
      warnings.push(...parsed.warnings);
      return parsed.value;
    });
    return { value, unresolved, warnings };
  }
  if (ts.isObjectLiteralExpression(expression)) {
    const warnings: string[] = [];
    let unresolved = false;
    const value: Record<string, unknown> = {};

    expression.properties.forEach((property, index) => {
      if (ts.isPropertyAssignment(property)) {
        const propertyName = getObjectPropertyName(property.name);
        if (!propertyName) {
          unresolved = true;
          warnings.push(`对象属性名无法静态解析: ${property.getText(sourceFile)}`);
          value[`__expr_${index}`] = property.getText(sourceFile);
          return;
        }
        const parsed = expressionToJson(property.initializer, sourceFile, constants, new Set(visitedIdentifiers));
        unresolved = unresolved || parsed.unresolved;
        warnings.push(...parsed.warnings);
        value[propertyName] = parsed.value;
        return;
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        const propertyName = property.name.text;
        if (visitedIdentifiers.has(propertyName)) {
          unresolved = true;
          warnings.push(`检测到循环引用: ${propertyName}`);
          value[propertyName] = { __expr: property.getText(sourceFile) };
          return;
        }
        const initializer = constants.get(propertyName);
        if (!initializer) {
          unresolved = true;
          warnings.push(`未找到简写属性引用: ${propertyName}`);
          value[propertyName] = { __expr: property.getText(sourceFile) };
          return;
        }
        const nextVisited = new Set(visitedIdentifiers);
        nextVisited.add(propertyName);
        const parsed = expressionToJson(initializer, sourceFile, constants, nextVisited);
        unresolved = unresolved || parsed.unresolved;
        warnings.push(...parsed.warnings);
        value[propertyName] = parsed.value;
        return;
      }
      unresolved = true;
      warnings.push(`对象包含无法静态解析的属性: ${property.getText(sourceFile)}`);
      value[`__expr_${index}`] = property.getText(sourceFile);
    });

    return { value, unresolved, warnings };
  }
  if (ts.isIdentifier(expression)) {
    const identifier = expression.text;
    if (visitedIdentifiers.has(identifier)) {
      return {
        value: { __expr: expression.getText(sourceFile) },
        unresolved: true,
        warnings: [`检测到循环引用: ${identifier}`],
      };
    }
    const next = constants.get(identifier);
    if (!next) {
      return {
        value: { __expr: expression.getText(sourceFile) },
        unresolved: true,
        warnings: [`无法静态解析标识符: ${identifier}`],
      };
    }
    const nextVisited = new Set(visitedIdentifiers);
    nextVisited.add(identifier);
    return expressionToJson(next, sourceFile, constants, nextVisited);
  }

  return {
    value: { __expr: expression.getText(sourceFile) },
    unresolved: true,
    warnings: [`无法静态解析表达式: ${expression.getText(sourceFile)}`],
  };
}

function toSerializableRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return item as Record<string, unknown>;
    }
    return { value: item };
  });
}

function normalizeWarnings(warnings: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const warning of warnings) {
    const normalized = String(warning || '').trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    deduped.push(normalized);
  }
  return deduped;
}

function buildListPreview(
  key: AxureApiListKey,
  handleObject: ts.ObjectLiteralExpression | null,
  sourceFile: ts.SourceFile,
  constants: Map<string, ts.Expression>,
): AxureApiListPreview {
  if (!handleObject) {
    return createMissingListPreview();
  }

  const property = handleObject.properties.find((node) => {
    if (!ts.isPropertyAssignment(node) && !ts.isShorthandPropertyAssignment(node)) {
      return false;
    }
    const propertyName = getObjectPropertyName(node.name);
    return propertyName === key;
  });

  if (!property) {
    return createMissingListPreview();
  }

  const rawExpression = ts.isPropertyAssignment(property)
    ? property.initializer
    : property.name;

  const sourceKey = ts.isIdentifier(rawExpression) ? rawExpression.text : null;
  const resolved = resolveExpressionFromConstMap(rawExpression, constants);
  const parsed = expressionToJson(resolved.expression, sourceFile, constants);
  const warnings = normalizeWarnings([...resolved.warnings, ...parsed.warnings]);

  if (!Array.isArray(parsed.value)) {
    return {
      sourceKey,
      raw: resolved.expression.getText(sourceFile),
      items: [],
      parseStatus: 'raw',
      warnings: normalizeWarnings([...warnings, `字段 ${key} 不是数组字面量`]),
    };
  }

  const parseStatus: AxureApiListPreview['parseStatus'] = parsed.unresolved || warnings.length > 0 ? 'raw' : 'parsed';

  return {
    sourceKey,
    raw: resolved.expression.getText(sourceFile),
    items: toSerializableRecordArray(parsed.value),
    parseStatus,
    warnings,
  };
}

export function extractAxureApiPreviewFromContent(content: string, filePath: string): AxureApiPreviewResult {
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const constants = collectTopLevelConstInitializers(sourceFile);
  const handleResult = findHandleReturnObject(sourceFile);
  const result = createEmptyAxureApiPreview(filePath, true);

  result.hasAxureHandle = handleResult.hasAxureHandle;

  AXURE_LIST_KEYS.forEach((key) => {
    result.lists[key] = buildListPreview(key, handleResult.handleObject, sourceFile, constants);
  });

  return result;
}

export function getAxureApiPreviewFromFile(filePath: string): AxureApiPreviewResult {
  if (!fs.existsSync(filePath)) {
    return createEmptyAxureApiPreview(filePath, false);
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return extractAxureApiPreviewFromContent(content, filePath);
  } catch {
    return createEmptyAxureApiPreview(filePath, false);
  }
}

function isSafeRelativeTargetPath(targetPath: string): boolean {
  const normalized = String(targetPath || '');
  if (!normalized) return false;
  if (normalized.includes('..')) return false;
  if (normalized.startsWith('/')) return false;
  if (normalized.startsWith('\\')) return false;
  if (path.isAbsolute(normalized)) return false;
  return true;
}

/**
 * 代码检查插件
 */
export function codeReviewPlugin(): Plugin {
  return {
    name: 'code-review-plugin',
    configureServer(server: any) {
      const parseBody = (req: any): Promise<any> => new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        req.on('end', () => {
          try {
            const bodyText = Buffer.concat(chunks).toString('utf8').trim();
            resolve(bodyText ? JSON.parse(bodyText) : {});
          } catch (error: any) {
            reject(new Error(error?.message || 'Invalid JSON body'));
          }
        });
        req.on('error', reject);
      });

      const sendJson = (res: any, statusCode: number, data: any) => {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(data));
      };

      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url || '';
        const isCodeReviewRoute = req.method === 'POST' && url === '/api/code-review';
        const isApiPreviewRoute = req.method === 'POST' && url === '/api/axure-api-preview';
        if (!isCodeReviewRoute && !isApiPreviewRoute) {
          return next();
        }

        try {
          const body = await parseBody(req);
          const targetPath = String(body.path || '').trim();

          if (!targetPath) {
            sendJson(res, 400, { error: 'Missing path parameter' });
            return;
          }
          if (!isSafeRelativeTargetPath(targetPath)) {
            sendJson(res, 403, { error: 'Invalid path' });
            return;
          }

          const filePath = path.resolve(process.cwd(), 'src', targetPath, 'index.tsx');

          if (isCodeReviewRoute) {
            const enforceComponentExportName = body.enforceComponentExportName === true;
            const result = reviewFile(filePath, { enforceComponentExportName });
            sendJson(res, 200, result);
            return;
          }

          const result = getAxureApiPreviewFromFile(filePath);
          sendJson(res, 200, result);
        } catch (error: any) {
          console.error('Code review error:', error);
          sendJson(res, 500, { error: error?.message || 'Server error' });
        }
      });
    }
  };
}
