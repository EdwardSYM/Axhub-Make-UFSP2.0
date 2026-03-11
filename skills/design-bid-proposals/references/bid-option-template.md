# 单方案生成 Prompt 模板

你现在只负责生成一个设计比稿方向，不要生成其他方案。

## 输入

- 任务类型：{{TARGET_TYPE}}
- 方案代号：{{OPTION_CODE}}
- 方案名称：{{OPTION_NAME}}
- 方案类型：{{OPTION_PROFILE}}
- 方案定位：{{OPTION_POSITIONING}}
- 输出目录：{{OUTPUT_DIR}}
- 用户锁定要求：

{{LOCKED_REQUIREMENTS}}

- 本方案差异维度：

{{OPTION_DIMENSIONS}}

- 本方案偏置建议：

{{OPTION_GUIDANCE}}

- 用户 brief：

{{BRIEF}}

## 目标

请只生成当前方案的交付内容，确保：

- 不偏离用户锁定需求
- 只基于当前方案维度进行设计
- 与其他方案形成明显区别
- 能直接落地为 `spec.md` 和 `index.tsx`
- 不要同时生成另外几个方案
- 不要输出多方案总表或总览
- 不要出现其他方案的标题、代号或正文

## 输出要求

按以下结构输出，使用 Markdown：

1. `# {{OPTION_NAME}}`
2. 一句话概述
3. 目标印象
4. 结构与信息策略
5. 交互策略
6. 视觉与反馈策略
7. 风险与取舍
8. `## spec.md`
9. `## index.tsx`

其中：

- `spec.md` 必须是完整可写入的规格文档正文
- `index.tsx` 必须是完整可写入的实现代码正文
- 不要输出其他方案的内容
