---
name: pencil-sync-after-prototype-workflow
description: 在本项目新建或重构 `src/prototypes/*`、`src/components/*` 时，执行“先按既有流程完成原型，再 1:1 创建 Pencil 文件，并强制后续同步”的编排约束；当需要为已完成原型补齐 Pencil 设计稿或维护代码与设计双向同步时使用。
---

# 原型后置 Pencil 同步

本技能只补充顺序约束，不重复已有细节规范。

## MCP 前置检查（必须）

在执行任何生成 `.pen` / 截图验收相关工作前：

1. 先尝试调用任意 Pencil MCP 工具（例如 `get_editor_state` / `open_document` / `get_screenshot`）。
2. 若 MCP 工具不可用或调用失败：立刻停止后续步骤，并告知用户需要先开启/安装本项目 MCP 环境（至少要能调用 Pencil MCP），否则无法继续生成设计稿。

## 触发条件

- 新建 `prototype/component`
- 原型已按既有流程完成，需要补齐对应 Pencil 设计稿
- 既有页面结构重做，必须同步更新代码与 Pencil

## 流程 + 检查（合并）

1. 准备目标路径
- 目标目录：`src/prototypes/<name>/` 或 `src/components/<name>/`
- `<name>` 使用小写字母、数字、连字符

2. 先按既有流程完成原型
- 先按现有规则完成 `spec.md`
- 再完成 `index.tsx`
- 运行验收命令，确保当前原型已可交付

3. 再完成 `.pen`（阻塞步骤）
- 在目标目录生成 `<name>.pen`
- 以当前已完成的 `spec.md` + `index.tsx` 为唯一基线，1:1 回建 Pencil 文件
- 结构、尺寸、区块层级、文案、主要交互命名必须与现有原型一致
- 若 `.pen` 与 `spec.md` / `index.tsx` 不一致，先修正差异再继续

4. 回写 `spec.md`
- 补充 Pencil 信息：`.pen` 路径、主画板、模块映射
- 明确记录该目录进入“代码/Pencil 双向同步”维护状态

5. 在 `index.tsx` 顶部补充同步注释
- 文件顶部必须增加注释，明确说明：更新当前原型时，必须同步更新同目录的 `.pen` 与 `spec.md`
- 注释需包含具体文件名 `<name>.pen`，避免后续维护遗漏

6. 后续更新约束
- 以后任何对 `spec.md`、`.pen`、`index.tsx` 的修改，都必须三者同步
- 若只改了代码未改 Pencil，不视为完成交付

## 验收命令

```bash
node scripts/check-app-ready.mjs /prototypes/<name>
node scripts/check-app-ready.mjs /components/<name>
```

## 交付定义

- 必须同时存在并同步：`spec.md`、`.pen`、`index.tsx`
- `index.tsx` 顶部必须存在 Pencil 同步注释
- `check-app-ready.mjs` 结果为 `READY`
- 交付时返回三个文件路径
