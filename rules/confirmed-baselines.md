# UFSP2.0 已确认基线登记表

> 用途：登记用户已确认或反复指定为参考的页面、组件样式和反例。后续新页面、页面优化、组件同步前，先查本文件，再决定能否复用、同步或覆盖。

## 1. 使用规则

基线状态分四类：

- 强基准：用户已明确确认，可作为同类页面默认复用依据。
- 局部基准：仅某些组件、布局或区域被确认，只能在该范围内复用。
- 待确认：页面仍在调整，或只可用于业务理解，不得覆盖强基准。
- 反例：用户明确指出过不符合规范，不得复用，遇到同类问题应主动修正。

执行要求：

1. 新页面开始前，先查同类页面是否已有强基准或局部基准。
2. 需求变更前，先判断是否会影响已确认冻结项。
3. 新确认样式需要同步旧页面时，先按 `rules/ufsp-page-governance.md` 第 12 节判断同步范围。
4. 如果两个强基准存在冲突，不能直接覆盖，应先让用户确认是否拆成组件变体。
5. 本文件只登记“已确认口径”，不替代页面自己的 `spec.md`。

## 2. 当前强基准

| 基线对象 | 适用范围 | 来源文件 | 冻结项 | 备注 |
| --- | --- | --- | --- | --- |
| 财会监督顶部导航 | 全项目原型页面 | `src/common/components/TopBar.tsx` | 64px 顶栏、深蓝渐变、全局导航与用户区结构 | 新页面不得重新实现顶部系统导航 |
| 列表页功能菜单 | 问题库、案例库、考评库、提示词管理等业务列表页 | `src/prototypes/problem-library-function-list/style.css`、`src/prototypes/case-library-ai/style.css`、`src/docs/业务页面设计规范.md` | 44px 导航行、30px 图标槽、4px 圆角、低饱和蓝灰选中态、标题区 logo 只作身份标识 | 不使用亮蓝、粗状态线、渐变行面或深蓝实心图标底 |
| 业务列表页三段式结构 | 有系统菜单、业务树/目录、列表工作区的页面 | `src/prototypes/problem-library-function-list`、`src/prototypes/case-library-ai` | 系统菜单 + 业务树/目录 + 表格工作区；页签 48px、工具栏 56px、控件 32px、表格行 32px | 首页/工作台不得直接套此结构，业务列表页应优先套此结构 |
| 标准查询工具栏 | 业务列表页右侧工具区 | `src/prototypes/case-library-ai/spec.md`、`src/prototypes/problem-library-function-list/style.css` | 新增/导入/导出等左侧动作，右侧搜索框、查询、刷新、筛选、查询方案、列设置；图标 14px、控件 32px | 不新增无语义危险按钮，不把工具栏做成大标题块 |
| 标准业务表格 | 业务列表、附件表、规则表 | `src/docs/业务页面设计规范.md`、`src/prototypes/problem-library-function-list/style.css`、`src/prototypes/case-library-ai/style.css` | 表头 `#6A8DC4`、白色表头文字、32px 表头/行高、浅灰网格、4px 表头圆角、行 hover 浅灰 | 不使用大字号、厚边框、卡片式表格或过高行距 |
| 简版分页 | 业务列表页 | `src/prototypes/case-library-ai/spec.md`、`src/prototypes/problem-library-function-list/spec.md` | `共 X 条 / 上一页 / 当前页 / 下一页 / 20 条/页`，居中，当前页 `#6A8DC4` | 不使用深蓝重分页或卡片式分页 |
| 全页面表单页头 | 新增、编辑、查看、审核、校验工作区 | `src/prototypes/case-library-ai/spec.md`、`src/prototypes/problem-library-function-list/spec.md`、`src/prototypes/prompt-version-management-v1/spec.md` | 64px 白底标题操作栏，左侧圆形返回按钮，标题格式“功能名称 / 动作”，右侧集中动作 | 不做自定义大标题栏、摘要卡片式页头 |
| 标准录入控件状态 | 表单、查询、业务树搜索 | `src/docs/业务页面设计规范.md`、`src/prototypes/prompt-version-management-v1/spec.md` | 控件 32px、字号 14px/13px、4px 圆角、弱边界、聚焦弱蓝阴影 | 不出现浏览器原生粗蓝 outline |

## 3. 当前局部基准

| 页面 / 组件 | 已确认范围 | 来源文件 | 不能泛化的范围 |
| --- | --- | --- | --- |
| 案例库（AI改造） | 左侧功能菜单、一般案例管理列表、案例新增/编辑全页表单、案例聚类分析的产品化信息收口方式 | `src/prototypes/case-library-ai/index.tsx`、`style.css`、`spec.md` | 案例业务字段、案例类型、入库流程不泛化到其他业务 |
| 问题库工作台账录入与审核 | 工作台账录入列表、业务树、AI 校验工作区、审核校验页头和异常处理结构 | `src/prototypes/problem-library-function-list/index.tsx`、`style.css`、`spec.md` | AI 校验业务口径、异常类型、台账字段不泛化 |
| 考评库 / 考核评价 | 考评类矩阵表、保存后进入校验页、校验页沿用问题库全页面结构 | `src/prototypes/evaluation-assessment/index.tsx`、`spec.md` | 矩阵字段、考核指标、校验公式不泛化；当前无独立 `style.css` |
| 提示词版本管理 V1 | 提示词管理系统菜单、提示词业务分类树、规则配置列表、提示词新增/编辑/详情全页表单 | `src/prototypes/prompt-version-management-v1/index.tsx`、`style.css`、`spec.md` | V1 只覆盖提示词配置管理，不覆盖 V2 测试发布、V3 反馈优化 |
| 业务树 / 分类树 | 白底、浅分隔线、32px 行高、14px 搜索、低饱和蓝灰选中态、分隔线折叠把手 | `src/prototypes/problem-library-function-list/style.css`、`src/prototypes/prompt-version-management-v1/style.css` | 业务节点文案、层级、数量统计按页面业务决定 |
| 规则配置类页面 | 规则/版本列表与全页维护表单组合 | `src/prototypes/prompt-version-management-v1/spec.md` | 只适用于配置管理类，不直接作为案例/问题库业务办理页主结构 |

## 4. 待确认参考

| 对象 | 当前用途 | 使用限制 |
| --- | --- | --- |
| `src/prototypes/prompt-version-management-v1` | 规则配置类页面参考 | 近期刚调整过，作为规则配置类局部基准使用；如果用户继续指出细节问题，应优先更新本登记表 |
| `src/prototypes/evaluation-assessment` | 考评类矩阵与校验页参考 | 可参考业务形态和问题库框架复用方式，但不作为独立菜单 / 表格全局基准 |
| `src/themes/dribbble`、`src/themes/firecrawl`、`src/themes/trae-design` | 历史或风格参考 | 不参与 UFSP2.0 新业务页默认设计 |
| 根目录 `skills/` | 历史 / 第三方 / 通用技能库 | 不作为 UFSP2.0 页面默认执行入口 |

## 5. 已登记反例

| 反例类型 | 表现 | 处理规则 |
| --- | --- | --- |
| 组件字号过大 | 按钮、菜单、树、表格字号明显大于案例库 / 问题库标准 | 回到 14px 控件与 32px 控件密度 |
| 页面结构顺序错误 | 直接把业务树当第一列，缺少系统菜单；或把系统菜单、业务树、列表顺序打乱 | 业务列表页必须先系统菜单，再业务树/目录，再列表工作区 |
| 自定义大标题块 | 在列表页业务树或列表上方新增大标题卡片、重复标题或说明块 | 列表页默认不加重复标题块，按标准页签/工具栏组织 |
| 原生输入聚焦框 | 输入框点击后出现浏览器原生粗蓝 outline | 使用弱蓝阴影和项目控件聚焦态 |
| 页面级通用控件覆盖 | 在页面根节点覆盖 `button/input/table` 等导致标准组件失效 | 禁止页面级通用覆盖，改为复用公共 class 或局部明确 class |
| 需求调整带动样式回退 | 改业务字段或流程时把已确认按钮、输入框、表格、菜单样式改掉 | 先保护冻结区，需求变更只能改可变区 |

## 6. 维护规则

后续用户确认新样式或指出新问题时，按以下方式维护本文件：

1. 如果某页面或组件被确认可作为同类标准，加入强基准或局部基准。
2. 如果某效果被明确否定，加入反例。
3. 如果同一组件出现两个合理样式，登记为变体，并说明适用条件。
4. 如果基线会影响多个页面，先在最终说明中提示用户是否同步。
5. 如果某个基线已抽成公共组件，应补充公共组件路径。

本文件更新后，应同步检查 `rules/README.md` 和 `rules/ufsp-page-governance.md` 是否需要调整引用。
