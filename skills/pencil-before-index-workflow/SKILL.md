---
name: pencil-before-index-workflow
description: 在本项目新建或重构 `src/prototypes/*`、`src/components/*` 时，执行“先 spec、再 Pencil、后 index.tsx”的编排约束；当用户要求设计先行或根据参考页创建新页面/组件时使用。
---

# Pencil 优先编排

本技能只补充顺序约束，不重复已有细节规范。

## MCP 前置检查（必须）

在执行任何生成 `.pen` / 截图验收相关工作前：

1. 先尝试调用任意 Pencil MCP 工具（例如 `get_editor_state` / `open_document` / `get_screenshot`）。
2. 若 MCP 工具不可用或调用失败：立刻停止后续步骤，并告知用户需要先开启/安装本项目 MCP 环境（至少要能调用 Pencil MCP），否则无法继续生成设计稿。

## 触发条件

- 新建 `prototype/component`
- 有参考页且需要先出设计稿
- 既有页面结构重做，可能影响布局与交互

## 流程 + 检查（合并）

1. 准备目标路径
- 目标目录：`src/prototypes/<name>/` 或 `src/components/<name>/`
- `<name>` 使用小写字母、数字、连字符

2. 先完成 `spec.md`
- 按现有规则产出规格文档
- 写清核心模块，能直接映射到设计稿

3. 再完成 `.pen`（阻塞步骤）
- 在目标目录生成 `<name>.pen`
- 按 `spec.md` 搭建结构并做截图验收
- 若视觉结构与 `spec.md` 不一致，先修正文档与设计稿

4. 回写 `spec.md`
- 补充 Pencil 信息：`.pen` 路径、主画板、模块映射

5. 最后生成 `index.tsx`
- 仅在 `spec.md` 与 `.pen` 对齐后开始编码
- 编码完成后运行验收命令

## 验收命令

```bash
node scripts/check-app-ready.mjs /prototypes/<name>
node scripts/check-app-ready.mjs /components/<name>
```

## 交付定义

- 必须同时存在并同步：`spec.md`、`.pen`、`index.tsx`
- `check-app-ready.mjs` 结果为 `READY`
- 交付时返回三个文件路径
