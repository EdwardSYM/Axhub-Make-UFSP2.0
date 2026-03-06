import type { Plugin } from 'vite';
import path from 'path';

/**
 *本项目组件规范强制检查插件
 * 1. 检查是否包含 default export
 * 2. 在底部注入第三方平台所需的注册代码
 */
export function axhubComponentEnforcer(entryPath?: string): Plugin {
  function resolveDefaultExportTarget(code: string, filePath: string) {
    if (!/\bexport\s+default\b/.test(code)) {
      throw new Error(`\n\n❌ 构建失败: ${filePath}\n必须包含 default export 以符合本项目组件规范。\n`);
    }

    const namedFunctionMatch = code.match(/export\s+default\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (namedFunctionMatch) {
      return {
        transformedCode: code,
        target: namedFunctionMatch[1]
      };
    }

    const namedClassMatch = code.match(/export\s+default\s+class\s+([A-Za-z_$][\w$]*)\b/);
    if (namedClassMatch) {
      return {
        transformedCode: code,
        target: namedClassMatch[1]
      };
    }

    const identifierMatch = code.match(/export\s+default\s+(?!function\b|class\b)([A-Za-z_$][\w$]*)\s*;?/);
    if (identifierMatch) {
      return {
        transformedCode: code,
        target: identifierMatch[1]
      };
    }

    const exportDefaultPattern = /\bexport\s+default\s+/;
    const replacedCode = code.replace(exportDefaultPattern, 'const __AXHUB_DEFAULT_COMPONENT__ = ');
    if (replacedCode === code) {
      throw new Error(`\n\n❌ 构建失败: ${filePath}\n无法解析 default export，请使用标准导出语法。\n`);
    }

    return {
      transformedCode: `${replacedCode}\n\nexport default __AXHUB_DEFAULT_COMPONENT__;\n`,
      target: '__AXHUB_DEFAULT_COMPONENT__'
    };
  }

  return {
    name: 'axhub-component-enforcer',
    enforce: 'pre',
    transform(code, id) {
      if (!entryPath || path.resolve(id) !== path.resolve(entryPath)) {
        return null;
      }

      const { transformedCode, target } = resolveDefaultExportTarget(code, entryPath);

      const injection = `
if (typeof window !== 'undefined' && window.__AXHUB_DEFINE_COMPONENT__) {
  window.__AXHUB_DEFINE_COMPONENT__(${target});
}
`;
      return transformedCode + injection;
    }
  };
}
