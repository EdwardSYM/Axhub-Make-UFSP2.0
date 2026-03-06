import type { Plugin } from 'vite';
import { createHash } from 'crypto';
import path from 'path';

/**
 * 为每个页面/组件文件注入稳定的唯一 ID
 * 基于文件相对路径生成，保证构建间稳定不变
 * 
 * 生成的 ID 格式：{项目名}-{目录类型}-{项目名称}-{16位哈希}
 * 例如：axhub-make-prototypes-demo-antd-a1b2c3d4e5f6g7h8
 * 
 * 规则：
 * - 忽略 index.tsx 中的 index 部分（因为都是同一个，没有意义）
 * - 使用项目目录名（如 axhub-make）
 * - 根据 components 和 prototypes 目录区分
 * - 加上文件项目名称
 */
export function injectStablePageIds(): Plugin {
  const cwd = process.cwd();
  
  // 从 cwd 获取项目目录名（如 axhub-make）
  const projectName = path.basename(cwd);
  
  return {
    name: 'inject-stable-page-ids',
    enforce: 'pre',
    
    transform(code, id) {
      // 只处理 tsx/jsx 文件
      if (!/\.(tsx|jsx)$/.test(id)) return null;
      
      // 获取相对路径
      const relativePath = path.relative(cwd, id).replace(/\\/g, '/');
      
      // 生成长哈希（16位 SHA-256，极低重复风险）
      const longHash = createHash('sha256')
        .update(relativePath)
        .digest('hex')
        .slice(0, 16);
      
      // 解析路径：src/prototypes/demo-antd/index.tsx 或 src/components/demo-button/index.tsx
      // 目标格式：axhub-make-prototypes-demo-antd 或 axhub-make-components-demo-button
      // 规则：忽略 index.tsx 中的 index 部分，使用目录名作为项目名称
      const pathParts = relativePath
        .replace(/^src\//, '')  // 移除 src/ 前缀
        .replace(/\.(tsx|jsx)$/, '')  // 移除文件扩展名
        .split('/');
      
      // 查找 prototypes 或 components 目录
      const categoryIndex = pathParts.findIndex(part => part === 'prototypes' || part === 'components');
      
      let readableId: string;
      
      if (categoryIndex >= 0 && categoryIndex < pathParts.length - 1) {
        // 找到目录类型（prototypes 或 components）
        const category = pathParts[categoryIndex];
        // 获取项目名称（category 后面的第一个非 index 部分）
        // 例如：prototypes/demo-antd/index -> demo-antd
        //       prototypes/demo-antd/some-file -> demo-antd
        //       prototypes/index -> '' (空，使用降级方案)
        let itemName = '';
        
        // 从 category 后面开始查找项目名称
        for (let i = categoryIndex + 1; i < pathParts.length; i++) {
          const part = pathParts[i];
          // 如果遇到 index，跳过它，继续查找下一级
          if (part === 'index') {
            continue;
          }
          // 找到第一个非 index 的部分，作为项目名称
          itemName = part;
          break;
        }
        
        // 组合：项目名-目录类型-项目名称
        readableId = `${projectName}-${category}${itemName ? '-' + itemName : ''}`;
      } else {
        // 降级方案：如果路径不符合预期，使用原来的逻辑但移除 index
        readableId = relativePath
          .replace(/^src\//, '')
          .replace(/\.(tsx|jsx)$/, '')
          .replace(/\/index$/, '')  // 移除末尾的 /index
          .replace(/[\/\.]/g, '-')
          .replace(/^-+|-+$/g, '')  // 移除首尾的连字符
          .slice(0, 48);
        
        // 如果 readableId 不以项目名开头，则添加
        if (!readableId.startsWith(projectName)) {
          readableId = `${projectName}-${readableId}`;
        }
      }
      
      // 组合 ID：可读路径 + 哈希
      const stableId = `${readableId}-${longHash}`;
      
      // 注入全局常量，组件中可直接使用
      const injectedCode = `
// Auto-injected by vite-plugin-inject-stable-page-ids
const __PAGE_ID__ = '${stableId}';
const __PAGE_PATH__ = '${readableId}';
const __PAGE_FULL_PATH__ = '${relativePath}';
const __PAGE_HASH__ = '${longHash}';

${code}
      `.trim();
      
      return {
        code: injectedCode,
        map: null
      };
    }
  };
}
