---
name: axure-export-workflow
description: 在“导出到 Axure”前的代码检查失败场景下，按固定流程修复规范问题并完成 Axure 模式注释标识；当用户要求修复导出检测错误、补齐 @mode axure、补充 Skill 参考路径时使用。
---

# Axure 导出修复工作流

本 Skill 只处理 **导出 Axure 场景** 的代码修复与合规改造，不处理第三方导出（如 Figma）。

## 适用场景

- 用户在“导出到 Axure”前触发 code-review 失败
- 需要让代码快速通过当前规范检查
- 需要补齐 Axure 模式头注释标识

## 目标

1. 优先修复 `error` 问题，再处理 `warning`
2. 在不改变业务功能的前提下完成改造
3. 让目标文件可通过现有检测链路

## 固定执行流程（低自由度）

### 步骤 1：锁定修改范围

- 只修改报错目标文件（通常是 `src/components/<name>/index.tsx` 或 `src/prototypes/<name>/index.tsx`）
- 不主动重构无关代码
- 不修改第三方导出相关代码

### 步骤 2：按优先级修复检查项

- 先修复所有 `error`（必须通过）
- 再处理 `warning`（建议修复）
- 每项修复都要保持原有功能与交互行为一致

### 步骤 3：补齐头部注释（Axure 模式）

若文件用于 Axure 导出改造，头部注释必须包含：

- `@name`
- `@mode axure`
- 参考资料中的 Skill 路径：`/skills/axure-export-workflow/SKILL.md`
- 默认导出名必须是 `Component`（使用 `export default Component`）

可使用以下模板：

```typescript
/**
 * @name 组件或页面名称
 * @mode axure
 *
 * 参考资料：
 * - /rules/development-guide.md
 * - /skills/axure-export-workflow/SKILL.md
 * - /rules/axure-api-guide.md (如需集成 Axure API)
 */
```

### 步骤 4：Axure API 处理策略

- Axure API 是 **可选项**
- 不要为了“通过导出检测”强行引入 `forwardRef<AxureHandle, AxureProps>`
- 仅在需求明确要求 Axure 交互能力时，才按 `axure-api-guide.md` 集成

### 步骤 5：交付前自检

- 已修复全部 error
- warning 已评估并尽量修复
- 头注释已包含 `@mode axure` 与 Skill 路径
- 文件能通过当前导出前检查逻辑

## 非目标（不要做）

- 不扩展到 Figma 或其他第三方导出链路
- 不改构建插件和检查规则策略
- 不进行大规模样式重写或架构重构
