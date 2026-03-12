---
name: design-bid-proposals
description: 默认生成 3 个可直接落地的设计比稿方向；如果用户明确要求 2 个、5 个或其他数量，必须按用户要求生成。该技能只负责比稿规则、分案策略和 prompt 约束，不提供独立脚本。实际执行时沿用现有 Gemini CLI 方式：先写 prompt 文件，再逐次调用 Gemini 完成规划轮、单方案轮和汇总轮。
---

# Design Bid Proposals

## 适用场景

当用户希望：

- 默认拿到多个方案进行比稿
- 比较多个 UI/UX 方向，而不是只要单一方案
- 在不偏离明确需求的前提下做多方向探索
- 需要清晰说明多案差异点与推荐推进方向

此技能同时适用于：

- `src/prototypes/<slug>/` 原型新建
- `src/components/<slug>/` 组件新建

## 与 Gemini CLI 的关系

本技能**不提供独立脚本**。

执行方式对齐现有 `/skills/gemini-cli-uiux/SKILL.md`：

- 必须通过 Gemini CLI 执行，不退化为普通聊天生成
- 先写本地 prompt 文件，再逐次调用 Gemini
- 长上下文优先通过本地文件路径让 Gemini 读取
- 最终直接写文件，回复里只给必要摘要

如果已经选中了 `/skills/gemini-cli-uiux/SKILL.md`，则本技能只补充“比稿多案”的规则，不重复定义 Gemini 的通用执行规范。

## 硬性规则

- 默认生成 `3` 个方向，但如果用户明确要求其他数量，必须按用户要求生成
- 方案数量永远以用户明确要求为准；只有用户未指定时才回落到默认 3 案
- 每个方向都要各自落成文件，不是只给文字说明
- 多案必须保持同一个业务问题与目标，不得偏题
- 用户已明确锁定的要求只能作为共同约束，不能拿来做差异化
- 差异只能从 `3–6` 个未锁死维度里拉开
- 多案至少满足：`P0` 有 1 个核心差异，`P1` 有 1 个核心差异
- `P2` 只能增强差异，不能成为多案唯一差异来源
- 若多个方案只是换皮、换色、换插画或换动效，判定为不合格，必须重做
- Gemini 执行时，禁止用一条 prompt 同时要求输出多个方案正文
- 规划轮只允许输出维度矩阵；每个方案都必须由独立 Gemini 调用分别生成
- 只要命中了本技能，就默认强制进入比稿模式；除非用户明确表示 `退出比稿`、`不需要对比`、`只要单方案`、`直接落地一稿` 等，否则不得退回单稿流程

## 方案数量规则

### 默认规则

如果用户没有明确指定数量，默认生成 `3` 个方案：

- `A 稳健型`
- `B 平衡型`
- `C 突破型`

### 用户指定数量

如果用户明确指定数量，例如 `2`、`4`、`5`，必须严格按用户要求生成。

推荐的默认梯度如下：

- `2 案`：`稳健型`、`突破型`
- `3 案`：`稳健型`、`平衡型`、`突破型`
- `4 案`：`基准型`、`稳健型`、`差异型`、`突破型`
- `5 案`：`基准型`、`稳健型`、`平衡型`、`差异型`、`突破型`
- `6+ 案`：在上述基础上继续扩展 `探索型`、`概念型`、`愿景型` 等梯度

如果用户自己给了命名或分档方式，优先使用用户的命名，不要强行套默认梯度。

## 三层差异化框架

### P0 骨架层

决定界面的物理形态，是最优先拉开差异的层级。

- 空间形态与容器：`平铺式 (Page)` / `叠层式 (Drawer/Modal)` / `灵活空间 (Split-view/Canvas)`
- 任务动线：`线性引导 (Step-by-step)` / `模块枢纽 (Dashboard)` / `并行操作 (Inline/Multi-task)`

### P1 肌肉层

决定内容分布和操作手感。

- 信息层级与密度：`高密度全量铺陈` / `核心收纳与隐藏` / `极简聚焦单点`
- 操作交互范式：`纯点击与表单输入` / `快捷手势与微操作` / `高级拖拽与直接操纵`

### P2 皮囊层

决定界面的气质与细节感受。

- 视觉语言：`系统原生极简` / `现代卡片便当盒` / `探索性视觉`
- 微反馈：`工具化零动效` / `顺滑过渡` / `沉浸式物理反馈`

## 默认三案定义

仅当用户没有指定数量时，使用下面的默认三案定义。

### A 稳健型 / Benchmark-led

- 默认参考 2–3 个行业领先产品，抽取共性范式
- 优先复用已被验证的布局、模块组织、信息层级和视觉表达
- 强调熟悉、可信、低理解成本、低决策风险
- 可以借鉴成熟方案，但不能高相似度照搬单一竞品

### B 平衡型 / Balanced

- 在成熟范式上做适度优化
- 平衡品牌表达、可用性、商业目标与实现成本
- 适合大多数评审与交付场景

### C 突破型 / Differentiation-first

- 追求记忆点、表达力与差异化
- 可以在结构、交互或视觉上更大胆
- 仍然必须满足用户已明确的需求和约束

## 执行流程

### 1. 先锁定共同约束

先整理：

- 产品目标与成功标准
- 页面或组件范围
- 用户已明确表达的想法、参考、品牌调性、功能要求
- 用户是否明确要求了方案数量
- 不能改动的内容

如果信息不足，优先用 `references/bid-requirements-checklist.md` 做补齐。

### 2. 选择 3–6 个可变化维度

必须先判断哪些维度是：

- `已锁定`：用户明确要求，多案必须保持一致
- `可变化`：可用来制造差异

仅从可变化维度中选择 3–6 个，用于多案拉开差异。

### 3. 先规划，再分案，再汇总

本技能只提供模板，不负责执行脚本。

推荐把 prompt 文件写到临时目录，例如：

- `tmp/design-bid-proposals/<slug>/01-planning.md`
- `tmp/design-bid-proposals/<slug>/02-option-1.md`
- `tmp/design-bid-proposals/<slug>/03-option-2.md`
- `tmp/design-bid-proposals/<slug>/...`
- `tmp/design-bid-proposals/<slug>/99-summary.md`

然后按顺序逐次调用 Gemini CLI。

### 3.1 Gemini 执行红线

当使用 Gemini CLI 时，必须遵守以下顺序：

1. `规划轮` 只输出锁定项、差异维度和方案矩阵
2. 每个方案轮只生成当前方案，不得同时输出其他方案正文
3. `汇总轮` 只负责对比和总结，不得补写多个方案正文

如果某次 Gemini 输出里同时出现多个方案正文，视为执行错误，必须废弃该结果并重新单独调用。

### 3.2 Gemini 调用方式

参考 `/skills/gemini-cli-uiux/SKILL.md`，使用 Gemini CLI 顺序执行。

示例：

```bash
gemini -m gemini-3-pro -p "请严格阅读并执行文件：tmp/design-bid-proposals/<slug>/01-planning.md"
```

然后依次执行每个单方案 prompt：

```bash
gemini -m gemini-3-pro -p "请严格阅读并执行文件：tmp/design-bid-proposals/<slug>/02-option-1.md"
gemini -m gemini-3-pro -p "请严格阅读并执行文件：tmp/design-bid-proposals/<slug>/03-option-2.md"
```

最后执行汇总 prompt：

```bash
gemini -m gemini-3-pro -p "请严格阅读并执行文件：tmp/design-bid-proposals/<slug>/99-summary.md"
```

如果当前环境无法显式指定模型，但 Gemini CLI 仍可运行，则继续执行，并在最终回复里说明实际情况。

## 输出目录规则

### 默认三案

当方案数量为 `3` 且使用默认梯度时，目录固定为：

- `src/prototypes/<slug>-a-safe/`
- `src/prototypes/<slug>-b-balanced/`
- `src/prototypes/<slug>-c-bold/`

或：

- `src/components/<slug>-a-safe/`
- `src/components/<slug>-b-balanced/`
- `src/components/<slug>-c-bold/`

### 用户指定其他数量

如果用户指定为非 3 案，目录使用编号形式：

- `src/prototypes/<slug>-option-1/`
- `src/prototypes/<slug>-option-2/`
- ...
- `src/prototypes/<slug>-option-n/`

或：

- `src/components/<slug>-option-1/`
- `src/components/<slug>-option-2/`
- ...
- `src/components/<slug>-option-n/`

每个方向目录都必须包含：

- `spec.md`
- `index.tsx`

按需可增加：

- `components/`

## 最终回复格式

最终回复必须包含：

1. 本次生成方式：`Gemini CLI` / `子代理` / `当前代理`
2. 实际模型，或无法显式指定模型的原因
3. 所有输出目录
4. 每个方案一句话概述
5. 按实际方案数量生成的 Markdown 差异表
6. 推荐优先推进方向

差异表列数必须与实际方案数量一致。

## 质量检查

- 多案是否保持同一业务目标
- 是否按用户要求的数量生成；如果用户未指定，是否回落到默认 3 案
- 多案是否只从未锁死维度拉开差异
- `P0` 和 `P1` 是否都有实质差异
- 稳健/基准型是否参考了行业领先产品的成熟范式
- 所有方向目录是否都生成了 `spec.md` 和 `index.tsx`
- 最终回复是否写明了生成方式与按实际数量生成的差异表

## 资源

- `references/bid-requirements-checklist.md`
- `references/bid-planning-template.md`
- `references/bid-option-template.md`
- `references/bid-summary-template.md`
