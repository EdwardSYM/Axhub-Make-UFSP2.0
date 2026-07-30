# UFSP2.0 规则入口

本文件是项目规则的唯一索引。它只负责说明“先读什么、什么时候读、发生冲突时听谁的”，具体页面治理、设计、开发和专项流程分别由对应文件负责。

## 1. 规则层级

从高到低按以下顺序执行：

1. 用户本轮明确要求、截图和提供的需求资料。
2. `AGENTS.md` / `CLAUDE.md` 中的项目级协作原则。
3. 本文件的任务分流和优先级。
4. `rules/ufsp-page-governance.md` 中的页面与组件治理规则。
5. `rules/confirmed-baselines.md` 中已确认的页面、组件和反例。
6. 与任务直接相关的专项规则。
7. `src/docs/业务页面设计规范.md`、同类已确认页面和当前页面 `spec.md`。
8. 项目级或通用 skill、通用 UI/开发经验。

冲突处理：

- 已确认的 UFSP2.0 页面和组件样式优先于通用 skill。
- 页面组件规范优先于单次业务内容变化。
- 同类实现有多个口径时，优先采用用户最新确认的基线；没有新确认时采用真实复用最多的稳定实现。
- 不确定是否会覆盖其他已确认页面时，先说明影响范围并让用户确认。

## 2. 新建或调整页面的最小读取链

涉及新页面、页面优化、组件样式、原型迭代时，按顺序读取：

1. `rules/ufsp-page-governance.md`
2. `rules/confirmed-baselines.md`
3. `src/docs/业务页面设计规范.md`
4. 同类已确认页面的 `index.tsx`、`style.css`、`spec.md`
5. 当前页面自己的 `spec.md`
6. 需要设计或开发细节时，再读 `design-guide.md`、`development-guide.md`

默认口径：

- 复用现有强基准、公共组件和稳定样式，不重新发明同类组件。
- 先保护冻结样式，再处理字段、数据、文案、状态和业务流程。
- 仅做静态前端原型和本地 mock 数据，除非用户明确扩大范围。
- 不新增 UI 库、真实接口、数据库、权限、真实公式或复杂校验。
- 新组件、新变体或会覆盖其他页面冻结区时，必须先说明并确认。

## 3. 规则文件职责

### 3.1 页面工作默认读取

| 文件 | 唯一职责 |
| --- | --- |
| `ufsp-page-governance.md` | 页面类型、参考页、冻结区、组件复用、样式同步和规范迭代 |
| `confirmed-baselines.md` | 登记强基准、局部基准、待确认参考和反例 |
| `design-guide.md` | 把需求转成信息结构、视觉方案和 `spec.md` |
| `development-guide.md` | 当前目录结构、代码约束和风险匹配的验收方式 |

### 3.2 按任务读取

| 任务 | 读取文件 | 触发条件 |
| --- | --- | --- |
| 需求对齐 | `requirements-alignment.md` | 缺失信息会影响范围、流程、数据、页面结构或验收 |
| 多方案比选 | `variant-comparison-guide.md` | 用户要求比选，或存在无法直接收敛的路线冲突 |
| 文档生成或更新 | `documentation-guide.md` | 新建、整理或更新 `src/docs/` 文档 |
| 资源维护 | `resource-management-guide.md` | 新增、整理、替换资源或数据 |
| 主题生成或维护 | `theme-guide.md` | 明确处理 `src/themes/` 时 |
| 页面运行或验收失败 | `debugging-guide.md` | 已出现构建、运行、交互或样式错误 |
| Axure API | `axure-api-guide.md` | 用户明确要求 Axure API 或现有组件已使用该接口 |
| 记忆沉淀 | `memory-system-guide.md` | 只有用户明确同意后 |
| 初始化项目 | `installation.md` | 新建 Axhub Make 项目 |
| 更新项目 | `update.md` | 更新当前新架构项目 |
| 旧架构迁移 | `legacy-update.md` | 将 `src/pages`、`src/elements` 等旧结构迁移到新结构 |
| 新手说明 | `welcome.md` | 用户第一次了解 Axhub Make 工作流 |

普通页面任务不得为了“保险”一次性读取全部规则。

## 4. 需求变化时改什么

| 问题类型 | 默认处理 | 记录位置 |
| --- | --- | --- |
| 字段、文案、mock 数据、业务状态 | 只改当前页面 | 当前页面代码与 `spec.md` |
| 当前页面独有交互或流程 | 先判断是否影响页面骨架 | 当前页面代码与 `spec.md` |
| 页面范式调整 | 先用于当前页面和后续新页面 | `ufsp-page-governance.md`，必要时登记基线 |
| 按钮、输入框、表格、菜单、业务树等组件规范 | 评估影响页面，确认后再同步或组件化 | `confirmed-baselines.md`、公共组件和相关页面 |
| 明显错误，例如原生粗蓝聚焦框或异常字号 | 修正当前范围，并检查同类实现 | 相关页面；反复出现时补充治理规则 |
| 新页面类型或现有规则缺口 | 补充页面治理 | `ufsp-page-governance.md` |
| 规则入口、目录或规则之间冲突 | 修正规则关系和所有引用 | 本文件及对应专项规则 |

不得用业务需求变化顺手改动已确认组件样式，也不得默认批量覆盖其他已确认页面。

## 5. 目录职责

| 路径 | 职责 |
| --- | --- |
| `AGENTS.template.md` | Agent 项目说明的源模板 |
| `AGENTS.md`、`CLAUDE.md` | 由模板生成的等价入口，必须保持一致 |
| `.agents/skills/` | 当前项目可发现的 Agent skill |
| `skills/` | Axhub Make 平台、历史和第三方 skill 资源库，不是 UFSP2.0 页面默认入口 |
| `rules/` | 项目执行规则，只保留一个入口和一份同职责规则 |
| `src/docs/` | 业务文档、设计规范、模板和文档资源 |
| `src/themes/` | 主题和 design token；UFSP2.0 默认以 `antd-new` 为主题来源 |
| `src/prototypes/` | 静态页面原型 |
| `src/components/`、`src/common/components/` | 可复用组件 |
| `src/database/` | 页面可直接消费的本地数据 |

当前项目不再使用 `src/pages/`、`src/elements/` 作为新页面或组件目录。

## 6. 维护规则

- 一个职责只保留一份现行规则，不保留内容重复的“兼容副本”。
- 删除或合并规则时，必须同步修正全项目引用。
- 修改 Agent 项目原则时，先更新 `AGENTS.template.md`，再保持 `AGENTS.md`、`CLAUDE.md` 一致。
- 修改页面或组件代码时，同步维护对应 `spec.md`；纯规则引用修正不改变页面业务规格。
- 新确认样式先判断属于业务局部、页面范式还是组件规范，再决定是否登记、同步或组件化。
- 不为一次性统一样式阻塞当前业务页面，稳定且高频的口径再沉淀为公共组件或项目 skill。

## 7. 验收和收口

- 文档和规则治理：检查职责、引用、重复、冲突和 Markdown 基本格式。
- 小范围静态页面：以变更文件和页面结构自查为主。
- 新建复杂原型或出现运行错误：按 `development-guide.md`、`debugging-guide.md` 做必要验收。
- 多阶段任务结束前必须回看计划，区分已完成、未完成、需确认和暂不处理事项。
