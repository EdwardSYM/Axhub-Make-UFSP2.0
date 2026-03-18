---
name: stitch-main-workflow
description: 本项目 Stitch 主技能/总编排：先完成 spec.md，再完成并确认 Stitch 设计，最后才允许生成 index.tsx；若 Stitch MCP 不可用则立即停止。
allowed-tools:
  - "stitch*:*"
  - "Read"
  - "Write"
  - "Bash"
  - "web_fetch"
  - "chrome*:*"
---

# Stitch 主流程（总编排）

本技能用于把 `design-md` / `stitch-loop` / `react-components` 组织为统一流程，强制执行：

1. 先完成 `spec.md`
2. 再完成并确认 Stitch 设计
3. 最后才允许创建或修改 `index.tsx`

## 目标与硬门槛（必须满足）

- **硬门槛 1**：未完成 Stitch 设计确认前，不允许创建或修改 `src/prototypes/<name>/index.tsx` 或 `src/components/<name>/index.tsx`。
- **硬门槛 2**：如果 Stitch MCP 不可用或调用失败，必须直接反馈并停止，不进入代码生成阶段。

## 环境自检（阻塞，失败即停）

开始主流程前，必须先做一次 Stitch MCP 探针调用，再决定是否继续：

- 可用探针示例：`list_projects` 或 `create_project`
- 探针成功：继续执行主流程
- 探针失败：输出以下固定反馈并停止

```text
⚠️ 当前环境未启用 Stitch MCP（无法调用 Stitch 工具），因此无法在 index.tsx 前完成 Stitch 设计。请启用 Stitch MCP 后重试。
```

## 主流程（顺序固定）

### 1) 准备目标路径

- 目标目录只能是：
  - `src/prototypes/<name>/`
  - `src/components/<name>/`
- `<name>` 只能使用小写字母、数字、连字符（kebab-case）

### 2) 先完成 `spec.md`（作为 Stitch prompt 合同）

- 按 `src/docs/templates/spec-template.md` 产出 `spec.md`（本技能不重复展开模板细节）
- `spec.md` 至少包含：
  - 目标
  - 模块 IA（树形结构）
  - 关键文案语气
  - 数据字段
  - 响应式要点

### 3) 使用 Stitch 完成“设计”并确认

1. （可选）如需风格统一，先用 `design-md` 从既有 Stitch screen 生成 `DESIGN.md`
2. 使用 `generate_screen_from_text`，prompt 以 `spec.md` 为基础；若有 `DESIGN.md`，把设计系统相关内容并入 prompt
3. 使用 `get_screen` 获取最终候选 screen 的 `screenshot` 与 `htmlCode`
4. 如果结果不符合 `spec.md`，使用 `edit_screens` 迭代，直到满足
5. 设计确认最小产物：
  - `screenshot`
  - `html`

本地保存建议放在 `temp/` 或 `.drafts/`（两者都被 `.gitignore` 忽略）。

### 3.5) 交互与响应式提醒（按用户需求为准，不以 Stitch 产物为准）

Stitch 产物偏静态（HTML/CSS），经常会出现“截图对齐了，但交互/响应式并不等同于需求”的情况。这里不把检查做成硬门槛，但你必须遵守一个原则：

- **交互与响应式的验收基准永远来自用户需求 / `spec.md`**，不要把 Stitch 输出当成“需求本身”或“默认标准”。

按需做快速核对（仅在 `spec.md` 明确要求时）：

- **响应式**：如果 `spec.md` 要求断点/多端适配，就检查对应设备下是否塌陷、溢出、信息层级是否仍成立。
- **交互状态**：如果 `spec.md` 要求交互/可访问性，就核对 hover/focus/disabled 等状态与键盘可达性是否满足。
- **动态交互**：如果需求包含弹窗、抽屉、复杂表单校验、异步加载等 Stitch 难以表达的动态行为，应在 `spec.md` 明确标注为“代码阶段补齐”，避免误判“设计已完成”。

> 可选：若当前环境提供 Chrome MCP，可用它辅助做“缩放/断点切换 + 截图”验证，作为发现问题的手段即可。

### 4) 回写 `spec.md`（与 Stitch 最终设计对齐）

在 `spec.md` 中补齐以下字段：

- Stitch `projectId`
- Stitch `screenId`
- 截图本地保存路径
- HTML 本地保存路径
- 最终模块结构确认点

### 5) 最后生成 `index.tsx`（从 Stitch 设计落地）

本主流程只负责编排与 gate，具体转换实现参考：

- `skills/third-party/stitch-skills/react-components/SKILL.md`

本项目最小必须约束（仅保留以下）：

- `index.tsx` 顶部必须包含 `@name` 中文注释块（参考 `rules/development-guide.md`）
- 组件或页面必须 `export default`（参考 `vite-plugins/axhubComponentEnforcer.ts`）
- 使用 Tailwind 时，`style.css` 顶部必须包含 `@import "tailwindcss";`

### 6) 验收（必须跑完）

按目标类型执行验收脚本，结果必须为 `READY`：

```bash
node scripts/check-app-ready.mjs /prototypes/<name>
node scripts/check-app-ready.mjs /components/<name>
```

## 技能路由指南（触发条件 -> 使用技能 -> 产出）

| 触发条件 | 使用技能 | 产出 |
|---|---|---|
| 已有 Stitch 设计，或多页需要统一风格 | `design-md` | `DESIGN.md`，供后续 prompt 复用 |
| 需要多页迭代、baton 编排建站 | `stitch-loop` | 循环生成多页 screen 与任务接力 |
| 需要把 Stitch HTML/设计落地成 React 代码 | `react-components` | 组件/页面代码，并对齐 `@name`、默认导出、Tailwind 引入约束 |

## 说明与非目标

- 本技能不重复展开“必读规范”的详细说明，只做最小引用（默认已完成基础规范阅读）。
- 本技能不要求额外平台接口适配约束；只要求本项目最小代码约束与验收通过。
