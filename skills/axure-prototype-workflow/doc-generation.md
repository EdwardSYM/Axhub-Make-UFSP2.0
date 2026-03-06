# Axure 文档生成规则

用于生成项目文档与业务文档。  
不负责主题 token 提取与数据建模细节。

## 文档类型

默认产物：
- `src/docs/page-map.md`
- `src/docs/project-overview.md`

用户明确要求时可追加：
- Domain Model（领域模型）
- Business Relationship Model（业务关系模型）
- Business Flow / Process（业务流程）
- State Machine / Lifecycle（状态生命周期）
- Permission / Access Model（权限模型）

## 页面地图文档规范

1. 按 sitemap 层级输出。
2. 页面名称必须可点击并指向原型 URL（若可用）。
3. 每个页面附一句用途说明（不超过 30 字）。

## 项目概览文档规范

至少包含：
- 项目名称与范围
- 页面数量与模块拆分
- 核心用户流程
- 主题风格摘要（引用主题产物）
- 数据模型摘要（引用数据表）

## 业务文档规范

1. 先声明建模边界（系统内/系统外）。
2. 再给出模型图或结构化清单。
3. 对不确定项显式标记“待确认”。

## 质量检查

- 文档路径必须在 `src/docs/`
- 文件命名使用 kebab-case
- 内容与页面资产一致，不得凭空扩写关键业务规则
