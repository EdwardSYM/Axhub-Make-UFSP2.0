# 开发指南

本文件只负责当前代码结构、实现约束和验收方式。页面结构、视觉基线和组件冻结规则以 `rules/ufsp-page-governance.md` 为准。

## 1. 当前目录结构

```text
src/
├── prototypes/<name>/
│   ├── index.tsx
│   ├── spec.md
│   ├── style.css        # 可选
│   ├── hack.css         # 可选，Agent 不应修改
│   └── components/      # 可选，页面内部子组件
└── components/<name>/
    ├── index.tsx
    ├── spec.md
    └── style.css        # 可选
```

- 页面放在 `src/prototypes/`，公共组件放在 `src/components/` 或 `src/common/components/`。
- 不在 `src/pages/`、`src/elements/` 新建内容。
- 目录名使用小写字母、数字和连字符。
- 每个原型或独立组件必须同时维护 `index.tsx` 与 `spec.md`。

## 2. 实现约束

### 2.1 文件头与导出

每个 `index.tsx` 顶部必须包含中文显示名：

```typescript
/**
 * @name 页面或组件显示名
 *
 * 参考资料：
 * - /rules/ufsp-page-governance.md
 * - /src/docs/相关业务文档.md
 */
```

- `@name` 必须存在。
- 参考资料只列本次真实使用的文件，不保留失效路径。
- 默认导出使用 `export default Component`；平台型组件沿用现有 `Component` 命名和接口结构。

### 2.2 复用与修改范围

- 先复用公共组件、现有强基准和同类页面稳定实现。
- 不因业务字段、文案、数据或流程变化修改已确认组件样式。
- 现有组件无法满足核心业务时，先说明原因、影响范围和替代方案，再新增组件或变体。
- 只修改当前任务直接相关的文件，不做无关重构。
- 修改页面或组件行为时同步更新 `spec.md`；只修正规则引用或注释路径时无需改变业务规格。

### 2.3 依赖与样式

- React 与 Hooks 直接从 `react` 导入。
- 使用现有依赖并按项目原有写法按需导入；新增依赖前先确认必要性。
- 沿用当前页面或主题的 CSS 实现，不因为调试或优化切换技术体系。
- 页面使用 Tailwind CSS 时才引入包含 `@import "tailwindcss";` 的样式文件。
- 不修改 `hack.css`，不新增页面级通用控件重置。
- Axure API 只在用户明确要求或组件已经使用时读取 `axure-api-guide.md`。

## 3. 验收方式

验收强度与风险匹配：

- 规则、注释、文案或小范围静态样式调整：做变更文件和结构自查。
- 新建复杂原型、较大交互调整或用户明确要求：运行页面验收脚本。
- 已出现构建、运行、交互或样式错误：进入 `debugging-guide.md`。

需要运行页面验收时：

```bash
node scripts/check-app-ready.mjs /components/[组件目录]
# 或
node scripts/check-app-ready.mjs /prototypes/[原型目录]
```

关注字段：

- `status`：`READY`、`ERROR` 或 `TIMEOUT`
- `targetUrl`：本次验收页面
- `errors`：构建、运行或页面加载错误

状态为 `ERROR` 时，按 `errors` 一次修复一个根因，再做对应验证。

## 4. 提交前检查

- [ ] 修改范围与当前需求一致，没有无关重构。
- [ ] 新增原型或组件包含 `index.tsx` 与 `spec.md`。
- [ ] `@name` 和参考资料路径有效。
- [ ] 需求变化没有带动已确认组件样式回退。
- [ ] 没有新增旧目录、失效引用、无必要依赖或页面级通用样式覆盖。
- [ ] 代码与 `spec.md` 在业务行为上保持一致。
- [ ] 已完成与风险匹配的自查或验收。
