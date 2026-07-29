# UFSP2.0 规则入口

> 用途：作为本项目 Agent 执行规则的统一入口。后续新页面、页面优化、文档维护、资源整理，先从本文件判断应该读哪些规则，避免旧规范、通用 skill 和页面局部样式互相覆盖。

## 1. 总原则

执行任何任务前，先按以下优先级判断：

1. 用户本轮明确要求、截图、标注文档。
2. `AGENTS.md` 中的项目级协作规则。
3. `rules/README.md`，即本文件。
4. `rules/ufsp-page-governance.md`。
5. 与任务直接相关的专项规则。
6. 同类已确认页面的 `index.tsx`、`style.css`、`spec.md`。
7. 通用设计 skill、通用 UI 经验、历史资源。

若发生冲突：

- 用户本轮明确要求优先。
- UFSP2.0 已确认页面样式优先于通用设计 skill。
- 同类组件存在多个口径时，优先采用项目中真实复用最多、覆盖页面最广的公共组件或稳定实现。
- 新结构规则优先于旧结构规则。
- 页面组件规范优先于单次需求变更。
- 不确定是否会覆盖已确认样式时，先问用户。

## 2. 新页面 / 页面优化默认入口

只要涉及 UFSP2.0 新页面、页面样式优化、原型迭代、组件规范调整，默认先读：

1. `rules/ufsp-page-governance.md`
2. `rules/confirmed-baselines.md`
3. `src/docs/业务页面设计规范.md`
4. 同类已确认页面的代码与规格文档
5. 当前页面自己的 `spec.md`

默认执行口径：

- 静态前端原型优先。
- 使用本地 mock 数据。
- 不接后台接口。
- 不做真实权限、真实公式、复杂校验。
- 不新增 UI 库。
- 不重新发明已有组件样式。
- 先保护已确认组件规范，再处理业务变更。

## 3. 任务类型分流

| 任务类型 | 主要规则 | 说明 |
| --- | --- | --- |
| 新建页面 / 新建原型 | `ufsp-page-governance.md`、`design-guide.md`、`development-guide.md` | 先判断页面类型、基准页面、冻结区和可变区 |
| 页面样式优化 | `ufsp-page-governance.md`、`src/docs/业务页面设计规范.md` | 不按通用“高级感”重做，必须对齐已确认页面 |
| 组件规范调整 | `ufsp-page-governance.md` 第 6、12、13 节 | 先判断是否影响其他页面，必要时让用户确认 |
| 文档生成 / 更新 | `documentation-guide.md` | 默认只处理当前文档，不扩展文档体系 |
| 主动沉淀记忆 | `memory-system-guide.md` | 只有用户明确同意后执行 |
| 资源新增 / 整理 | `resource-management-guide.md`、`asset-management.md` | 仅用户触发或主动沉淀记忆流程触发 |
| 主题生成 / 主题维护 | `theme-guide.md`、`theme-generation-guide.md` | 只在主题任务中使用 |
| 多方案比选 | `variant-comparison-guide.md` | 只在需求模糊、用户要求比选或需要方案选择时使用 |
| Axure API | `axure-api-guide.md` | 仅用户明确要求使用 Axure API 时读取 |
| 安装 / 更新项目 | `installation.md`、`update.md`、`legacy-update.md` | 仅安装、升级、旧架构迁移任务使用 |
| 调试运行错误 | `debugging-guide.md` | 仅验收或运行报错后使用 |

## 4. 当前有效规则

### 4.1 优先使用

- `rules/ufsp-page-governance.md`  
  UFSP2.0 页面治理主规则。新页面、页面优化、组件同步、规范迭代优先使用。

- `rules/confirmed-baselines.md`  
  已确认页面、组件样式、局部基准、待确认参考和反例登记表。新页面和样式同步前必须查阅。

- `src/docs/业务页面设计规范.md`  
  业务内容区、列表页、表单页、控件密度、表格、菜单等业务页面样式来源。

- `rules/design-guide.md`  
  页面设计流程和 `spec.md` 产出要求。使用时需受 `ufsp-page-governance.md` 约束。

- `rules/development-guide.md`  
  当前新结构开发规则，使用 `src/prototypes` 和 `src/components`。

- `rules/documentation-guide.md`  
  普通文档生成和更新规则。

- `rules/memory-system-guide.md`  
  主动沉淀记忆规则。只在用户明确同意后执行。

### 4.2 条件使用

- `rules/resource-management-guide.md`、`rules/asset-management.md`  
  资源维护时使用。

- `rules/theme-guide.md`、`rules/theme-generation-guide.md`  
  主题相关任务使用。

- `rules/variant-comparison-guide.md`  
  多方案比选时使用，不作为普通业务页默认流程。

- `rules/axure-api-guide.md`  
  用户明确要求 Axure API 时使用。

- `rules/debugging-guide.md`  
  页面运行、验收或调试失败后使用。

- `rules/installation.md`、`rules/update.md`  
  安装、更新项目时使用。

- `rules/legacy-update.md`  
  仅旧架构项目升级时使用。

### 4.3 旧规范 / 仅参考

- `rules/development-standards.md`  
  仍包含旧结构 `src/pages`、`src/elements`。当前项目默认不使用；如其中个别代码规范仍有价值，只能作为参考，不能覆盖 `development-guide.md`。

## 5. 文件路径职责

| 路径 | 当前定位 | 默认使用方式 |
| --- | --- | --- |
| `.agents/skills/` | 当前项目可发现的 Agent skill | 只在任务明确匹配时使用，不能覆盖项目治理规范 |
| `skills/` | 历史 / 第三方 / 通用技能库 | 默认不作为 UFSP2.0 页面执行入口 |
| `rules/` | 项目执行规则 | 以本 README 为入口 |
| `src/themes/` | 主题与 token | 默认以 `src/themes/antd-new` 为当前 UFSP2.0 主题来源 |
| `src/docs/` | 项目文档与业务规范 | 业务页面优先读 `业务页面设计规范.md` |
| `src/prototypes/` | 静态页面原型 | 新页面和业务页面默认放这里 |
| `src/components/`、`src/common/components/` | 公共组件 | 后续逐步承接已确认组件规范 |

## 6. 新页面启动最小流程

新页面或较大页面调整，默认按以下顺序：

1. 判断任务类型：方案、文档、静态原型、局部修改、问题排查。
2. 判断页面类型：首页、工作台、业务列表、表单、抽屉 / 弹窗。
3. 选择主参考页面和辅助参考页面。
4. 查阅 `rules/confirmed-baselines.md`，判断参考页面可信度：强基准、局部基准、待确认参考、反例。
5. 区分冻结区和可变区。
6. 判断是否有现成组件或已确认样式可复用。
7. 如果需要新增组件规范，先向用户说明并确认。
8. 更新或新增当前页面 `spec.md`。
9. 实现静态原型或文档调整。
10. 做与风险匹配的轻量自查或验收。

## 7. 验收与命令口径

默认按任务风险选择验收方式：

- 文档治理：只做阅读和结构自查。
- 小范围静态原型：优先做变更文件自查，不默认跑完整构建、lint、typecheck 或浏览器检查。
- 新建复杂原型：按需要运行项目验收脚本；如用户明确要求不运行，则不运行并说明。
- 安装依赖、启动服务、跑重型验证前，先判断是否必要。

执行验收时，以 `rules/development-guide.md` 和 `rules/ufsp-page-governance.md` 的验收口径为准。

## 8. 规范持续优化机制

后续如果出现以下情况，Agent 必须提醒用户是否更新规范：

- 同类样式问题反复出现。
- 用户确认了新的组件样式。
- 某个页面升级为强基准。
- 某个页面或局部效果被确认是反例。
- 新需求暴露现有规范缺口。
- 不同规则、skill、主题、页面实现之间产生冲突。

默认处理方式：

1. 先解决当前已确认范围内的问题。
2. 再判断是否需要同步其他页面。
3. 再判断是否需要更新 `ufsp-page-governance.md`。
4. 如果规则稳定且反复使用，再考虑沉淀为项目专用 skill 或公共组件。

## 9. 遇到问题时改什么

用户后续提出新问题、新调整或指出页面不符合规范时，Agent 必须先判断问题类型，再决定是否需要更新文件。不得只临时修页面，也不得默认扩大到全项目。

| 触发情况 | 优先处理 | 可能更新的文件 | 是否需要用户确认 |
| --- | --- | --- | --- |
| 当前页面字段、文案、mock 数据不对 | 只修当前页面 | 当前页面 `index.tsx`、`spec.md` | 一般不需要，除非影响业务方案 |
| 当前页面交互或状态不对 | 先判断是否业务局部 | 当前页面 `index.tsx`、`spec.md` | 影响流程时需要 |
| 按钮、输入框、表格、分页、菜单、业务树等组件样式不对 | 判断是否组件规范问题 | `rules/ufsp-page-governance.md`，必要时同步同类页面或公共组件 | 需要，尤其会影响其他页面时 |
| 某个页面样式被用户确认可作为标准 | 登记为基准 | `rules/confirmed-baselines.md`，必要时同步 `rules/ufsp-page-governance.md` | 需要 |
| 某个页面或局部效果被用户明确否定 | 登记为反例 | `rules/confirmed-baselines.md`，必要时同步 `rules/ufsp-page-governance.md` | 需要 |
| 新需求出现现有规范没覆盖的页面类型 | 补充页面类型或参考页规则 | `rules/ufsp-page-governance.md` | 需要 |
| 规则文档之间有冲突、旧规范被误用 | 更新规则入口或标注旧规范 | `rules/README.md` | 需要 |
| 开发目录、验收流程、代码结构规则不清 | 更新开发规则 | `rules/development-guide.md`，必要时同步 `rules/README.md` | 需要 |
| 文档生成、文档图片、模板使用规则不清 | 更新文档规则 | `rules/documentation-guide.md` | 需要 |
| 资源、主题、数据维护规则不清 | 更新对应专项规则 | `resource-management-guide.md`、`asset-management.md`、`theme-guide.md` | 需要 |
| 已确认规则需要后续对话默认记住 | 进入记忆沉淀 | 先读 `rules/memory-system-guide.md`，再按流程处理 | 必须用户明确同意 |
| 高频样式反复被同步 | 考虑组件化 | `src/components`、`src/common/components`，并更新 `spec.md` / 规则 | 必须先确认影响范围 |

默认判断顺序：

1. 先判断是业务局部问题，还是组件 / 规范问题。
2. 再判断是否影响已确认页面或同类页面。
3. 再判断是临时修当前页、更新规则、同步其他页面，还是抽公共组件。
4. 如果会扩大范围、覆盖已确认样式或改变组件规范，先让用户确认。
5. 如果只是当前页面低风险内容修正，直接处理并在最终说明中标明未扩散。

## 10. 后续待治理项

以下事项不是本 README 自动执行范围，需要用户确认后再做：

- 标记或归档 `.agents/skills/* 2.md` 重复文件。
- 清理或归档根目录 `skills/` 中不再参与默认执行的历史 skill。
- 将高频组件规范抽取为公共组件或公共 class。
- 把稳定的新页面执行流程沉淀为 UFSP2.0 专用 skill。
