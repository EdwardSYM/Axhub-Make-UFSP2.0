# 网页主题生成规则

用于从网页提取并生成主题资产。  
只处理主题相关产物，不处理文档正文与数据建模细节。

## 页面选择

1. 从页面发现结果中选择 3-5 个代表性页面。
2. 优先：首页、主流程页、核心详情页。
3. 页面风格差异较大时，优先与业务主线一致的页面。

## 提取策略

1. 优先调用本项目 MCP 的 `get_page_theme`。
2. 若失败，再使用 Firecrawl `extract` 的 branding 结果兜底。
3. 多页面结果需要合并并去重，保留稳定 token。

## 输出文件（强约束）

输出目录：`src/themes/<theme-key>/`

必需：
- `globals.css` 或 `designToken.json`（二选一）
- `DESIGN-SPEC.md`
- `index.tsx`

约束：
- `designToken.json` 必须包含 `name` 字段。
- `index.tsx` 必须展示主题关键 token 与主要组件风格。

## DESIGN-SPEC.md 最低结构

1. 视觉关键词与品牌气质
2. 色彩体系（主色/辅色/语义色）
3. 排版体系（字体、字号、行高）
4. 组件风格（按钮、卡片、输入、表格）
5. 状态与反馈（hover/active/disabled/error）

## 质量检查

- token 是否可复用且命名一致
- 文档是否可用于后续页面还原/二次生成
- 产物路径是否严格在 `src/themes/<theme-key>/`
