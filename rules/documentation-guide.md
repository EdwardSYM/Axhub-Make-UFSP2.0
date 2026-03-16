# 文档指南

适用于用户主动新建或更新 MD 文档的场景。

## 🧭 简单流程

1. 先确认文档用途、内容范围和输出位置
2. 读取与该文档直接相关的资料、已有文档或页面说明
3. 按需建议模板，但不强制套模板
4. 在 `src/docs/` 中生成或更新用户需要的单篇 MD 文档

补充说明：

- 默认只处理当前这篇文档
- 不主动扩展成项目级文档体系
- 项目说明清单、专题子文档维护属于 `rules/memory-system-guide.md` 中的“主动沉淀记忆”流程

## 📄 模板建议

| 文档用途 | 可建议模板 |
|------|------|
| 需求文档 | `src/docs/templates/prd-template.md` |
| 轻量需求文档 | `src/docs/templates/lite-prd-template.md` |
| 项目说明清单 | `src/docs/templates/project-overview-template.md` |
| 页面地图 | `src/docs/templates/page-map-template.md` |
| 信息架构 | `src/docs/templates/information-architecture-template.md` |
| 业务流程 | `src/docs/templates/business-flow-template.md` |
| 数据说明 | `src/docs/templates/data-model-template.md` |
| 权限说明 | `src/docs/templates/permission-model-template.md` |
| 状态说明 | `src/docs/templates/state-lifecycle-template.md` |

规则：

- 模板只是建议，不是强制产物
- 用户未要求模板化时，优先输出简洁文档
- 更新已有文档时，优先直接维护原文件

## 🖼️ 文档图片规则

- `src/docs/` 下的文档图片统一存放在文档同级的 `assets/` 目录，不再放到 `assets/images/`
- Markdown 中引用图片时，统一使用相对路径 `assets/<文件名>`，例如 `![示意图](assets/example.png)`
- 文档图片上传接口返回的地址也应保持为 `assets/<文件名>`
- 文档图片访问路由必须让 `/docs/**/assets/**` 直接命中静态资源处理，不得再被识别为 `/docs/{name}` 文档页面
- 新增或迁移文档图片时，需要同时检查文件落盘路径、Markdown 引用路径、预览路由三者是否一致
