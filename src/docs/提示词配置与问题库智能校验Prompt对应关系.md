# 提示词配置与问题库智能校验 Prompt 对应关系

## 1. 文档目的

本文用于说明提示词管理页面与《问题库智能校验 Prompt v1.0（已拼装）》之间的对应关系，并以“财政暂付款管理”为业务示例验证当前页面能否生成运行所需配置。

来源文件：

- `/Users/edwardm/Desktop/问题库智能校验Prompt_V1.0_已拼装.md`
- `src/prototypes/prompt-version-management-v1/index.tsx`
- `src/prototypes/prompt-version-management-v1/spec.md`

## 2. 不可违反的组装原则

```text
最终执行 Prompt
= 当前业务关联的系统提示词
+ 当前业务启用的业务提示词版本生成的 businessRules
+ ledgerData
+ evidenceMaterials
+ policyFiles
+ auditContext
```

- 每个业务只能关联一个系统提示词。
- 每个业务允许启用零个或一个业务提示词版本。
- 系统提示词与业务提示词是组装关系，不是替代关系。
- 没有差异化业务提示词时，`businessRules` 使用空规则或默认规则，不改变系统提示词结构。

## 3. 系统提示词对应关系

页面示例：`问题库智能校验 Prompt V1.0`。

| 页面系统章节 | 已拼装 Prompt 来源 | 维护内容 |
| --- | --- | --- |
| 角色与任务边界 | 开头角色说明和任务说明 | 模型角色、校验目标、人工决策边界 |
| 固定结论与分类 | 第一章“固定结论与分类口径” | `conclusion / kind / status` 固定枚举及禁止输出 |
| 运行时输入协议 | 第二章“本次输入”、第三章“输入数据说明” | 五类运行时输入及字段使用要求 |
| 优先级与冲突处理 | 第四章“规则优先级与冲突处理” | 系统、政策、业务规则的优先级和冲突处理 |
| 通用校验流程 | 第五章“排除字段处理”、第六章第一至四步、第六至七步 | 字段排除、事实拆解、一致性、合规性、去重、证据和建议 |
| 金额日期等专项规则 | 第六章第五步 | 金额、日期、数量、编号、主体简称规则 |
| 聚合与输出结构 | 第七章“结果统计与聚合”、第八章“输出 JSON” | 统计关系、摘要、JSON 字段和空值口径 |
| 安全约束与输出自检 | 第一章第 10–14 条、第九章“输出前自检” | 禁止编造、提示词注入防护、枚举和 JSON 自检 |
| 其他通用规则（可选） | 原 Prompt 暂无固定来源 | 承接未来无法归入前八章、且应统一应用于多个业务的系统级规则 |

### 3.1 页面示例的覆盖业务

系统提示词维护页右侧使用业务分类树选择覆盖范围。示例中：

- `问题库智能校验 Prompt V1.0` 覆盖问题整改和重点专项检查类业务。
- `考核评价智能校验通用提示词` 覆盖考核评价类业务。
- 保存覆盖关系时，同一业务会从原系统提示词中移除，保证系统提示词唯一。

## 4. 业务提示词对应关系

页面示例：

- 业务分类：`重点专项检查 / 财政暂付款管理`
- 当前业务提示词版本：`V1.3`
- 当前系统提示词：`问题库智能校验 Prompt V1.0`

| 页面配置 | `businessRules` 字段 | 已拼装 Prompt 使用位置 |
| --- | --- | --- |
| 业务校验重点 | `validationFocus` | 补充本业务应优先识别和核验的事实 |
| 参与校验字段未勾选项 | `excludedFields` | 第五章排除字段处理、完整流程第一步 |
| 字段“业务含义” | `fieldDefinitions` | 第三章 businessRules、完整流程第一步 |
| 一致性要求、字段比较口径 | `consistencyRules` | 完整流程第三步 |
| 合规性要求、字段合规要求 | `complianceRules` | 完整流程第四步 |
| 佐证材料要求、字段材料要求 | `evidenceRequirements` | 一致性“未找到证据”、合规性“资料不完整”判断 |
| 政策适用要求 | `policyApplicabilityRules` | 第四章优先级与冲突、完整流程第四步 |
| 业务流程要求 | `workflowRules` | 审核操作规则、录入/审核阶段和后续处理 |
| 人工复核要求、字段人工复核 | `manualReviewRules` | 无法判断和转人工复核条件 |
| 其他规则 | `extensionRules` | 当前固定结构无法承接的未知规则；页面按名称、类型、范围和内容结构化维护 |
| 业务提示词版本 | `ruleVersion` | 输出字段 `businessRuleVersion` |
| 当前系统提示词 | `systemPromptId` | 最终组装时定位系统提示词正文 |

## 5. 财政暂付款管理配置示例

以下内容由页面配置自动生成，业务人员不直接编辑 JSON。

```json
{
  "ruleVersion": "V1.3",
  "systemPromptId": "system-general-check",
  "excludedFields": [
    {
      "fieldKey": "remark",
      "fieldName": "备注",
      "reason": "当前业务配置未选择参与校验"
    },
    {
      "fieldKey": "audit-note",
      "fieldName": "审核说明",
      "reason": "系统固定不参与智能校验"
    },
    {
      "fieldKey": "reject-note",
      "fieldName": "不认可说明",
      "reason": "系统固定不参与智能校验"
    },
    {
      "fieldKey": "screenshot-status",
      "fieldName": "截图上传状态",
      "reason": "系统固定不参与智能校验"
    },
    {
      "fieldKey": "submit-action",
      "fieldName": "提交或退回操作",
      "reason": "系统固定不参与智能校验"
    }
  ],
  "validationFocus": "重点核验暂付款事项名称、形成原因、金额口径、形成时间、责任单位、清理计划和完成时限是否完整、相互一致。",
  "fieldDefinitions": [
    {
      "fieldKey": "temporary-amount",
      "fieldName": "暂付款金额",
      "groupName": "资金信息",
      "definition": "指当前事项形成的原始财政暂付款金额。"
    },
    {
      "fieldKey": "formed-at",
      "fieldName": "形成时间",
      "groupName": "问题基本信息",
      "definition": "指暂付款实际形成所对应的业务事件日期。"
    }
  ],
  "consistencyRules": [
    {
      "scope": "business",
      "requirement": "暂付款金额必须属于同一事项、同一资金口径；形成时间必须对应同一业务事件。"
    },
    {
      "scope": "field",
      "fieldKey": "temporary-amount",
      "fieldName": "暂付款金额",
      "requirement": "与审批材料、账务凭证中同一事项、同一资金口径的金额完全一致。"
    }
  ],
  "complianceRules": [
    {
      "scope": "business",
      "requirement": "核验暂付款是否具有明确形成依据、责任主体、清理计划和完成时限。"
    }
  ],
  "evidenceRequirements": [
    {
      "scope": "business",
      "requirement": "暂付款金额和形成时间核对审批材料、账务凭证；清理计划和时限核对正式清理方案。"
    }
  ],
  "policyApplicabilityRules": [
    {
      "scope": "business",
      "requirement": "确认政策效力、地区、主体、事项和有效时间；冲突或无法确定优先级时转人工复核。"
    }
  ],
  "workflowRules": [
    {
      "scope": "business",
      "requirement": "录入校验阶段检查表单和材料完整性；审核校验阶段同时检查业务规则和政策制度。"
    }
  ],
  "manualReviewRules": [
    {
      "scope": "business",
      "requirement": "材料版本冲突、主体无法唯一对应、金额角色不明或政策适用范围不明确时转人工复核。"
    }
  ],
  "extensionRules": [
    {
      "id": "long-term-no-progress",
      "name": "长期未推进事项",
      "type": "流程",
      "scope": "审核校验阶段",
      "content": "清理计划超过约定节点仍无进展说明时，标记为需人工复核，并提示补充最新推进情况。"
    }
  ]
}
```

页面实际示例还配置了事项名称、形成原因、责任单位、清理计划和完成时限等字段。上面的 JSON 为便于阅读的节选，完整结果由原型变量 `business_rules` 返回。

## 6. 运行时拼装示例

```text
[systemPrompt]
读取业务“财政暂付款管理”关联的“问题库智能校验 Prompt V1.0”，
按八个系统章节拼装角色、输入协议、通用流程、分类、输出和自检要求。

[businessRules]
读取财政暂付款管理当前启用版本 V1.3 生成的业务规则 JSON。

[ledgerData]
传入当前工作台账表单字段。

[evidenceMaterials]
传入当前数据的全部佐证材料解析内容。

[policyFiles]
传入当前适用政策制度。

[auditContext]
传入 stage、businessTheme、reviewStandard、region 和 currentDate。
```

最终执行时，系统提示词负责稳定框架，业务提示词只补充当前业务差异，不改变固定结论、输出结构和安全约束。

## 7. 当前发现的 Prompt 结构缺口

### 7.1 流程规则缺少正式字段

原 Prompt 第四章允许业务规则补充“审核操作规则”，但第三章建议的 `businessRules` JSON 没有独立流程字段。页面现已增加 `workflowRules`，后续应同步修改正式 Prompt：

```json
{
  "workflowRules": []
}
```

并在完整处理流程中明确读取该字段。

### 7.2 扩展规则缺少正式字段

为支持未来未知规则，页面增加了“其他规则”入口，并以结构化 `extensionRules` 保存，而不是只提供一个无语义的大文本框。正式 Prompt 需要明确：

- 支持的规则类型；
- 适用范围；
- 与固定规则冲突时的处理；
- 自定义规则不能改变固定分类和输出结构。

### 7.3 版本标识不一致

- 文档标题：`问题库智能校验 Prompt v1.0`
- 输出 JSON 固定值：`promptVersion = v0.3`

两者需要统一。业务提示词版本 `V1.3` 只映射到 `businessRuleVersion`，不能替代系统 Prompt 版本。

### 7.4 validationFocus 未列入原建议结构

页面使用 `validationFocus` 表达业务校验重点，但原 Prompt 的建议 JSON 未声明该字段。可以选择：

1. 在正式结构中增加 `validationFocus`；或
2. 将其拼入各类业务规则，不单独输出。

推荐增加独立字段，便于模型先理解业务主题，再执行具体规则。

## 8. 验收结论

当前页面已经能够展示并维护：

- 已拼装 Prompt 的八类系统内容；
- 系统提示词对多个业务分类的覆盖关系；
- 财政暂付款管理业务提示词完整示例；
- 字段定义、一致性、合规性、证据、政策、流程、人工复核和扩展规则；
- 系统提示词与业务提示词的组装关系。

正式接入前仍需同步调整原 Prompt 的 `businessRules` 建议结构，使 `validationFocus / workflowRules / extensionRules` 成为明确可消费字段。
