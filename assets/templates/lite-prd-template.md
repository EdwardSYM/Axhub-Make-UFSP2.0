# lite-prd 轻量级 AI PRD 模板（One-Pager）

> 用途：用于快速沉淀 AI 功能需求，可直接复制到 Notion、Markdown 或 Jira Issue。  
> 目标：在一页内讲清楚 Why / What / How / Fallback / DoD，减少歧义与返工。

## 1. 需求概述（The "Why" & "What"）

- 需求名称：`[一句话描述功能]`
- 用户故事：`作为一个 [目标用户]，我希望能够 [执行动作]，以便于 [核心价值]。`
- 业务价值（可选）：`[效率提升/转化提升/成本下降等预期结果]`

## 2. AI 交互核心定义（The "How" for AI）

> AI 需求与普通功能需求的关键差异：必须明确输入、上下文和输出的确定性边界。

| 核心维度 | 定义细则 |
| --- | --- |
| 触发机制（Trigger） | `[用户或系统在什么条件下触发 AI 调用]` |
| 上下文注入（Context） | `[Prompt 需要携带的系统状态/业务数据]` |
| 用户输入（Input） | `[用户提供的动态变量、格式、长度限制]` |
| 输出约束（Output） | `[模型必须返回的固定格式与字段要求]` |

推荐补充输出 Schema（按需裁剪）：

```json
{
  "type": "object",
  "required": ["intent", "reason", "amount"],
  "properties": {
    "intent": {
      "type": "string",
      "enum": ["仅退款", "退货退款", "换货"]
    },
    "reason": {
      "type": "string",
      "enum": ["破损", "错发", "质量问题", "其他"]
    },
    "amount": {
      "type": "number",
      "minimum": 0
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    }
  },
  "additionalProperties": false
}
```

## 3. 容错与兜底策略（Fallback & Edge Cases）

- 等待体验：`[Loading UI 样式、预期时长提示文案]`
- 超时处理：`[超过 N 秒未响应时的提示文案与后续动作]`
- 幻觉/格式错误：`[解析失败时自动重试次数、兜底提示、人工修正入口]`
- 业务强约束：`[金额上限、状态机限制、权限限制等不可突破规则]`

## 4. 验收标准（Definition of Done - DoD）

- 成功路径：`用户输入 -> AI 返回符合约束的结果 -> 系统正常渲染/执行 -> 用户确认提交`
- 性能指标：`平均响应时间 <= [X] 秒，P95 <= [Y] 秒`
- 质量指标（建议）：`结构化字段解析成功率 >= [A]%`，`用户手动修改率 <= [B]%`
- 优先级验收项（可选）：
  - `P0`：`[必须达成能力]`
  - `P1`：`[体验增强能力]`

