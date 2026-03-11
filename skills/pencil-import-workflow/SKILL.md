---
name: pencil-import-workflow
description: 使用 Pencil MCP 读取当前打开的 .pen 文件与 Frame（无需上传），让用户确认导入范围与输出结构后，生成 Axhub Make 原型目录（spec.md + index.tsx）并验收。
---

# Pencil 导入工作流

本技能用于“从 Pencil 设计稿导入并生成 Axhub Make 原型代码”的交互编排。  
重点是：**先通过 MCP 读取当前打开的 Pencil 文件与 Frame，再让用户确认导入范围与输出结构，最后才写文件**。

## 前置条件

1. Pencil 桌面端已打开目标 `.pen` 文件
2. MCP 已可用（如不可用参考：`/skills/mcp-installer/SKILL.md`）

## 标准流程（必须按顺序）

### 1) 检测 Pencil MCP 可用性

- 优先调用：`mcp__pencil__get_editor_state`
- 若不确定工具前缀/命名空间：先使用 MCP 的 `list_tools`（或等价能力）列出可用工具，找到 pencil 相关工具后再调用
- 若工具不可用/调用失败：
  - 停止后续步骤
  - 提示用户打开 Pencil 并选中目标 Frame 后重试

### 2) 获取当前 selection 与候选 Frame

- 若 selection 中包含 Frame：候选 = selection Frames
- 若 selection 为空或不是 Frame：
  - 使用 `mcp__pencil__batch_get` 在当前文件中搜索/列出 Frame 候选（“已有的 frame”）

输出给用户的候选信息至少包含：
- 序号
- frameId
- frameName
- 尺寸（若可得）

候选较少时（可选）：使用 `mcp__pencil__get_screenshot` 辅助用户辨认。

如果候选过多导致无法确认：
- 要求用户回到 Pencil 先选中需要导入的 Frame（可多选）
- 然后重新读取 selection

### 3) 让用户确认（阻塞点，确认前不写文件）

必须等待用户明确回答以下 2 类问题：

1. 导入范围：全部 / 子集（用序号或 frameId 指定）/ 回到 Pencil 重新选择
2. 输出结构（二选一，不要推荐）：
   - A. 单原型多屏：生成 1 个 `src/prototypes/<name>/`，在 `index.tsx` 内提供导航切换各 Screen
   - B. 多原型批量：每个 Frame 生成 1 个 `src/prototypes/<proto-name>/`

同时确认命名规则：
- `<name>` / `<proto-name>` 如何从 Frame 名称派生为 kebab-case
- 重名冲突处理规则（后缀、序号或用户指定）

### 4) 生成原型产物

对每个生成的原型目录，至少输出：
- `src/prototypes/<name>/spec.md`
- `src/prototypes/<name>/index.tsx`
- （可选）`src/prototypes/<name>/style.css`

`spec.md` 必须记录 Pencil 来源信息（可得则写）：
- `.pen` 标识/路径（若能获取）
- 导入的 frameId 列表、frameName 列表
- Screen 到实现模块的映射

> 如需更强的“先完成原型、再 1:1 回建 Pencil 并强制后续同步”约束，可参考：`/skills/pencil-before-index-workflow/SKILL.md`（技能名：`pencil-sync-after-prototype-workflow`）。

### 5) 验收

对每个生成的原型运行：

```bash
node scripts/check-app-ready.mjs /prototypes/<name>
```

直到状态为 `READY`。
