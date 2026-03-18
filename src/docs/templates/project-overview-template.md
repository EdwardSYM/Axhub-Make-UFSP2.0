# {{PROJECT_NAME}} 项目说明清单

> 用途：作为项目文档总入口，帮助人和 Agent 快速理解项目，并按需加载后续子文档。
> 说明：本模板应保持简洁，不在这里展开详细业务流程、信息架构、数据模型或页面规格。
> 上下文约束：本文件必须保持轻量；当内容明显重复，或文件达到 `1000` 行时，必须立即做“分包拆分 + 摘要汇总”优化，并优先控制在 `800` 行以内。总入口只保留高价值摘要、索引和必要待办，其余内容迁移到专题子文档。

## 1. 项目简介

- 项目名称：`{{PROJECT_NAME}}`
- 项目定位：`{{PROJECT_SUMMARY}}`
- 目标用户：`{{TARGET_USERS}}`
- 当前阶段：`{{PROJECT_STAGE}}`

## 2. 核心场景

- `{{CORE_SCENARIO_1}}`
- `{{CORE_SCENARIO_2}}`
- `{{CORE_SCENARIO_3}}`

## 3. 阅读顺序

1. 先阅读本文件，确认项目范围与索引
2. 再按需阅读专题子文档
3. 最后进入页面级 `spec.md`、需求文档、主题文档与数据表

## 4. 文档索引

| 文档 | 用途 | 是否必读 |
|------|------|---------|
| `src/docs/page-map.md` | 页面地图与入口导航 | `按需` |
| `src/docs/information-architecture.md` | 信息架构与模块边界 | `按需` |
| `src/docs/business-flow.md` | 业务流程与关键路径 | `按需` |
| `src/docs/data-model.md` | 核心数据对象与字段摘要 | `按需` |
| `src/docs/permission-model.md` | 权限边界与角色能力 | `按需` |
| `src/docs/state-lifecycle.md` | 状态流转与生命周期 | `按需` |

可根据项目复杂度灵活删减、合并或替换上述文档，并在此处同步更新索引。

## 5. 主题索引

- 默认主题：`{{DEFAULT_THEME}}`
- 主题文档：`{{THEME_DOCS}}`
- 主题目录：`{{THEME_PATHS}}`

## 6. 数据索引

- 关键数据表：`{{DATA_INDEX}}`
- 数据目录：`src/database/`
- 说明：只记录关键表与用途，不在本文件展开字段明细

## 7. 原型索引

- 关键页面或原型：`{{PROTOTYPE_INDEX}}`
- 页面级规格：`{{SPEC_INDEX}}`
- 需求文档：`{{PRD_INDEX}}`

## 8. 当前待补事项

- `{{OPEN_ITEM_1}}`
- `{{OPEN_ITEM_2}}`
- `{{OPEN_ITEM_3}}`
