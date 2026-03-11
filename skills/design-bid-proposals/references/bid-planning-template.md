# 比稿规划轮 Prompt 模板

你是设计比稿规划器。请先理解用户需求，再锁定与方案数量一致的差异化矩阵。

## 输入

- 任务类型：{{TARGET_TYPE}}
- 基础 slug：{{BASE_SLUG}}
- 请求的方案数量：{{REQUESTED_PROPOSAL_COUNT}}
- 输出根目录：{{OUTPUT_ROOT}}
- 方案列表：

{{OPTION_LIST}}

- 用户 brief：

{{BRIEF}}

## 任务

1. 提取用户已经明确锁定的需求，列为 `locked_requirements`
2. 从以下候选中判断哪些可以作为差异维度：
   - 空间形态与容器
   - 任务动线
   - 信息层级与密度
   - 操作交互范式
   - 视觉语言
   - 微反馈
3. 只选出 3–6 个未锁死维度，列为 `selected_dimensions`
4. 按 `requested_proposal_count` 为所有方案建立差异矩阵，并严格使用给定的输出目录
5. 本轮只做规划，不生成任何方案正文，不输出 `spec.md` 或 `index.tsx` 内容
6. 如果 `requested_proposal_count = 3` 且方案列表是默认三案，可按稳健 / 平衡 / 突破梯度规划
7. 如果 `requested_proposal_count != 3`，必须严格按给定方案列表输出，不要擅自改成三案
8. 保证：
   - 不偏离用户已明确需求
   - 多案至少有 1 个 P0 差异、1 个 P1 差异
   - P2 不能成为唯一差异来源

## 输出要求

只输出 JSON，不要输出解释文字。

JSON 结构必须包含：

```json
{
  "requested_proposal_count": 5,
  "locked_requirements": ["..."],
  "selected_dimensions": ["..."],
  "options": [
    {
      "code": "O1",
      "name": "方案 1｜基准型",
      "positioning": "...",
      "output_dir": "...",
      "dimensions": {
        "空间形态与容器": "...",
        "任务动线": "..."
      }
    }
  ],
  "validation": {
    "p0_difference": true,
    "p1_difference": true,
    "notes": ["..."]
  }
}
```
