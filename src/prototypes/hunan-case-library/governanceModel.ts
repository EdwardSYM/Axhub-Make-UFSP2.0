import { useSyncExternalStore } from 'react';

// 湖南原型共享会话数据；不写入真实知识库，刷新页面恢复初始场景。
export type CaseSubject = { role: string; name: string };
export type CasePolicyBasis = { name: string; clauses?: string };
export type CaseIssue = {
  id: string; title: string; domain: string; aspect: string; type: string; nature: string;
  responsibility: string; facts: string[]; violatedBases: CasePolicyBasis[]; evidences: string[];
  standardMatch: { status: '已匹配' | '人工确认' | '待确认' | '未匹配'; name: string; version: string; basis?: string };
};
export type CaseDecisionGroup = {
  grade?: string;
  actions: Array<{ type: string; target: string; content: string; measure?: string }>;
  bases: CasePolicyBasis[];
  relatedIssueIds: string[];
};

export type IngestionRow = {
  id: string; title: string; no: string; source: string; sourceId: string; fileName: string;
  type: string; year: string; issueDate: string; relatedUnit: string; domain: string; aspect: string;
  issueType: string; manifestation: string; nature: string; responsibility: string; impactLevel: string;
  impactRule: string; handlingMethod: string; policyBasis: string; standardRef: string; standardVersion: string;
  reviewStatus: string; ruleVersion: string; metadataUpdatedAt: string; time: string;
  status: '已入库' | '未入库'; detailStatus: '已入库' | '待人工处理' | '处理中' | '处理失败' | '等待目录确认'; result: string;
  qualityIssues: Array<{ field: string; current: string; suggestion: string; confidence: string; reason: string }>;
  subjects?: CaseSubject[]; issues?: CaseIssue[]; decisions?: CaseDecisionGroup[];
  version?: number; versions?: Array<{ version: number; at: string; reason: string; snapshot: string }>; savedDraft?: string; localFileUrl?: string;
};

export const DOMAIN_NAMES = [
  '预算管理', '信息公开', '国库管理', '债务管控', '滥发钱物', '私设小金库', '采购管理',
  '资产管理', '财务会计管理', '票据管理', '项目管理', '监督管理', '内部控制',
];

const INGESTION_ROWS: IngestionRow[] = [
  {
    id: 'I01', title: '关于专项债券资金闲置问题的整改通知书', no: '湘财监〔2026〕18号', source: 'OA同步', sourceId: 'OA-20260901-018', fileName: '湘财监〔2026〕18号正文及附件.pdf', type: '整改通知书', year: '2026', issueDate: '2026-08-31', relatedUnit: '岳阳市某项目建设单位',
    domain: '债务管控', aspect: '债券管理', issueType: '债券资金闲置、效益不高', manifestation: '专项债券资金拨付后长期未形成实物工作量，部分资金沉淀在项目账户。', nature: '一般', responsibility: '市县主责', impactLevel: 'Ⅲ类', impactRule: '根据闲置金额、持续时间及对项目建设进度的影响综合判定。',
    handlingMethod: '责令限期整改｜盘活闲置资金｜加快项目建设进度', policyBasis: '《地方政府专项债券项目资金绩效管理办法》', standardRef: '基础认定标准 / 债务管控 / 债券管理 / 第45类', standardVersion: 'HN-FS-2026.1', reviewStatus: '自动通过', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '2026-09-01 09:45', time: '2026-09-01 09:42', status: '已入库', detailStatus: '已入库', result: '元数据、认定标准关联和知识索引已生成。', qualityIssues: [],
  },
  {
    id: 'I02', title: '行政处罚决定书', no: '湘财行罚〔2026〕26号', source: '用户上传', sourceId: 'UPLOAD-20260901-006', fileName: '80fe4c85b86d4df390063b7d97a8fde0.docx', type: '行政处罚决定书', year: '2026', issueDate: '2026-04-18', relatedUnit: '龙再云',
    domain: '财务会计管理', aspect: '会计监督', issueType: '未履行必要审计程序、未获取充分适当审计证据', manifestation: '3份审计报告均存在必要审计程序缺失、审计证据不充分和审计工作底稿不完整等问题。', nature: '待确认', responsibility: '注册会计师', impactLevel: '—', impactRule: '—',
    handlingMethod: '警告｜暂停执业1个月｜责令立即整改', policyBasis: '《中华人民共和国注册会计师法》｜《会计师事务所执业许可和监督管理办法》｜《中国注册会计师审计准则第1131号——审计工作底稿》｜《中国注册会计师审计准则第1301号——审计证据》｜《中国注册会计师审计准则第1312号——函证》', standardRef: '未匹配现行基础认定标准', standardVersion: 'HN-FS-2026.1', reviewStatus: '待人工复核', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '2026-09-01 09:31', time: '2026-09-01 09:28', status: '未入库', detailStatus: '待人工处理', result: '存在 2 项阻断问题，处理完成并重新校验通过后才能正式入库。',
    subjects: [
      { role: '当事人', name: '龙再云' },
      { role: '所属机构', name: '湖南恒圆会计师事务所合伙企业（普通合伙）' },
    ],
    issues: [{
      id: 'ISSUE-01', title: '未履行必要的审计程序，未获取充分适当的审计证据', domain: '财务会计管理', aspect: '会计监督', type: '审计执业程序不规范', nature: '待确认', responsibility: '注册会计师',
      facts: [
        '湘恒圆审字（2024）第01-01号：银行存款、短期借款未实施函证，且未检查借款凭证、借款单。',
        '湘恒圆审字（2024）第01-01号：往来款项未函证，也未实施函证替代程序。',
        '湘恒圆审字（2024）第01-01号：营业收入、营业成本、销售费用只有审定表，未实施进一步审计程序。',
        '湘恒圆审字（2024）第01-01号：未见现金流量表审计工作底稿。',
        '湘恒圆审字（2024）第03-05号：银行存款未函证，仅取得对账单复印件。',
        '湘恒圆审字（2024）第03-05号：其他应收款未函证，未实施进一步审计程序。',
        '湘恒圆审字（2024）第03-05号：长期股权投资、长期待摊费用、预收账款未见底稿。',
        '湘恒圆审字（2024）第03-05号：营业收入和营业成本只有明细表。',
        '湘恒圆审字（2024）第03-12号：银行存款、短期借款未函证，未检查借款合同和凭证。',
        '湘恒圆审字（2024）第03-12号：往来款项只有明细表，未函证且未实施进一步审计程序。',
        '湘恒圆审字（2024）第03-12号：存货和应交税费只有审定表和明细表。',
        '湘恒圆审字（2024）第03-12号：营业收入和营业成本只有明细表。',
        '湘恒圆审字（2024）第03-12号：管理费用只有审定表。',
      ],
      violatedBases: [
        { name: '《中华人民共和国注册会计师法》', clauses: '第二十一条、第三十一条' },
        { name: '《会计师事务所执业许可和监督管理办法》', clauses: '第六十条第一项' },
        { name: '《中国注册会计师审计准则第1131号——审计工作底稿》', clauses: '第八条' },
        { name: '《中国注册会计师审计准则第1301号——审计证据》', clauses: '第十条' },
        { name: '《中国注册会计师审计准则第1312号——函证》', clauses: '第十二条、第十三条' },
      ],
      evidences: ['3份审计报告及工作底稿', '当事人签字确认的财政检查工作底稿'],
      standardMatch: { status: '未匹配', name: '现行基础认定标准暂未覆盖该问题', version: 'HN-FS-2026.1', basis: '问题事实与财务会计管理相关，但现行问题类型目录无直接对应项。' },
    }],
    decisions: [{
      grade: '一般处罚阶次', relatedIssueIds: ['ISSUE-01'],
      actions: [
        { type: '行政处罚', target: '龙再云', content: '给予警告' },
        { type: '行政处罚', target: '龙再云', content: '暂停执业', measure: '1个月' },
        { type: '整改要求', target: '龙再云', content: '责令立即整改' },
      ],
      bases: [
        { name: '《中华人民共和国注册会计师法》', clauses: '第三十九条第二款' },
        { name: '《会计师事务所执业许可和监督管理办法》', clauses: '第七十条第一款' },
        { name: '《湖南省财政厅行政处罚裁量权基准（2022年版）》', clauses: '注册会计师和会计师事务所监督类第9项' },
      ],
    }],
    qualityIssues: [
      { field: '匹配认定标准', current: '未匹配', suggestion: '保留为候选问题类型', confidence: '61%', reason: '现行基础认定标准未直接覆盖注册会计师审计执业程序问题。' },
      { field: '问题性质', current: '待确认', suggestion: '不直接采用“一般处罚阶次”', confidence: '95%', reason: '处罚阶次是裁量结论，不能直接等同于基础认定标准中的问题性质。' },
    ],
  },
  {
    id: 'I03', title: '政府采购专项检查整改通知书', no: '湘财购监〔2026〕8号', source: 'OA同步', sourceId: 'OA-20260901-011', fileName: '湘财购监〔2026〕8号.pdf', type: '整改通知书', year: '2026', issueDate: '2026-08-30', relatedUnit: '株洲市某项目建设单位',
    domain: '采购管理', aspect: '政府采购执行', issueType: '履约验收不合理', manifestation: '采购人未按合同约定组织履约验收，验收资料不完整。', nature: '一般', responsibility: '省级部门主责、市县主责', impactLevel: '待判定', impactRule: '需结合采购金额、履约偏差和财政资金损失情况判定影响度。',
    handlingMethod: '责令补充验收资料｜限期整改', policyBasis: '《中华人民共和国政府采购法实施条例》', standardRef: '基础认定标准 / 采购管理 / 政府采购执行 / 第72类', standardVersion: 'HN-FS-2026.1', reviewStatus: '系统处理中', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '—', time: '2026-09-01 08:56', status: '未入库', detailStatus: '处理中', result: '系统正在生成标准化元数据和知识索引，无需人工操作。', qualityIssues: [],
  },
  {
    id: 'I04', title: '预算执行监督检查情况汇总表', no: '—', source: '用户上传', sourceId: 'UPLOAD-20260831-021', fileName: '预算执行监督检查情况汇总表.xlsx', type: '表格附件', year: '2026', issueDate: '—', relatedUnit: '—',
    domain: '预算管理', aspect: '待提取', issueType: '待提取', manifestation: '—', nature: '待提取', responsibility: '待提取', impactLevel: '待提取', impactRule: '—', handlingMethod: '—', policyBasis: '—', standardRef: '—', standardVersion: 'HN-FS-2026.1', reviewStatus: '解析失败', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '—', time: '2026-08-31 17:36', status: '未入库', detailStatus: '处理失败', result: 'Excel 存在多级合并表头，通用解析模板无法准确识别数据区。', qualityIssues: [
      { field: '文档内容', current: '表头错位', suggestion: '使用多级表头解析模板重新识别', confidence: '91%', reason: '第 1—3 行存在合并单元格，通用解析器未能准确识别数据区。' },
    ],
  },
  {
    id: 'I05', title: '专项债券项目资金管理处理决定', no: '湘财监〔2026〕15号', source: 'OA同步', sourceId: 'OA-20260831-096', fileName: '湘财监〔2026〕15号.pdf', type: '处理决定', year: '2026', issueDate: '2026-08-28', relatedUnit: '常德市某专项债券项目单位',
    domain: '债务管控', aspect: '债券管理', issueType: '债券资金闲置、效益不高', manifestation: '项目建设进度明显滞后，已拨付专项债券资金长期滞留项目账户。', nature: '一般', responsibility: '市县主责', impactLevel: '待判定', impactRule: '根据资金闲置规模、项目延期时间及预期效益实现情况综合判定。',
    handlingMethod: '责令加快资金支付进度｜限期形成实物工作量', policyBasis: '《地方政府专项债券项目资金绩效管理办法》', standardRef: '基础认定标准 / 债务管控 / 债券管理 / 第45类', standardVersion: 'HN-FS-2026.1', reviewStatus: '待人工复核', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '2026-08-31 16:19', time: '2026-08-31 16:14', status: '未入库', detailStatus: '待人工处理', result: '存在 1 项阻断问题，确认发文日期后可重新校验。', qualityIssues: [
      { field: '发文日期', current: '空值', suggestion: '2026-08-28', confidence: '96%', reason: '正文落款处可识别日期，但原始结构化字段为空。' },
    ],
  },
  {
    id: 'I06', title: '关于2025年度部门决算公开情况的检查通报', no: '湘财监〔2026〕13号', source: 'OA同步', sourceId: 'OA-20260831-083', fileName: '湘财监〔2026〕13号.pdf', type: '检查通报', year: '2026', issueDate: '2026-08-27', relatedUnit: '湖南省某事业单位',
    domain: '信息公开', aspect: '预决算公开', issueType: '预决算公开不完整', manifestation: '部门决算公开内容缺少政府采购支出和国有资产占用情况说明。', nature: '一般', responsibility: '省级部门主责、财政厅主责、市县主责', impactLevel: 'Ⅳ类', impactRule: '根据缺失内容范围、持续时间和社会影响综合判定。',
    handlingMethod: '责令补充公开｜限期整改', policyBasis: '《中华人民共和国预算法实施条例》', standardRef: '基础认定标准 / 信息公开 / 预决算公开', standardVersion: 'HN-FS-2026.1', reviewStatus: '自动通过', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '2026-08-31 15:46', time: '2026-08-31 15:42', status: '已入库', detailStatus: '已入库', result: '质量校验通过，已写入正式知识库。', qualityIssues: [],
    issues: [
      { id: 'I06-ISSUE-01', title: '政府采购支出情况未完整公开', domain: '信息公开', aspect: '预决算公开', type: '预决算公开不完整', nature: '一般', responsibility: '省级部门主责、市县主责', facts: ['部门决算公开内容缺少政府采购支出情况说明。'], violatedBases: [{ name: '《中华人民共和国预算法实施条例》' }], evidences: ['2025年度部门决算公开页面截图'], standardMatch: { status: '已匹配', name: '基础认定标准 / 信息公开 / 预决算公开不完整', version: 'HN-FS-2026.1' } },
      { id: 'I06-ISSUE-02', title: '国有资产占用情况说明缺失', domain: '信息公开', aspect: '预决算公开', type: '预决算公开不完整', nature: '一般', responsibility: '省级部门主责、市县主责', facts: ['部门决算公开内容未说明国有资产占用及变动情况。'], violatedBases: [{ name: '《中华人民共和国预算法实施条例》' }], evidences: ['公开内容完整性检查记录'], standardMatch: { status: '已匹配', name: '基础认定标准 / 信息公开 / 预决算公开不完整', version: 'HN-FS-2026.1' } },
      { id: 'I06-ISSUE-03', title: '部门决算公开时间超过规定期限', domain: '信息公开', aspect: '预决算公开', type: '预决算公开不及时', nature: '一般', responsibility: '省级部门主责、市县主责', facts: ['部门决算在批复后超过规定期限公开。'], violatedBases: [{ name: '《中华人民共和国预算法实施条例》' }], evidences: ['决算批复时间及公开页面发布时间记录'], standardMatch: { status: '已匹配', name: '基础认定标准 / 信息公开 / 预决算公开不及时', version: 'HN-FS-2026.1' } },
    ],
    decisions: [{ actions: [{ type: '处理要求', target: '湖南省某事业单位', content: '补充公开缺失内容' }, { type: '整改要求', target: '湖南省某事业单位', content: '限期完成整改并报送佐证材料' }], bases: [{ name: '《中华人民共和国预算法实施条例》' }], relatedIssueIds: ['I06-ISSUE-01', 'I06-ISSUE-02', 'I06-ISSUE-03'] }],
  },
  {
    id: 'I07', title: '财政暂付款清理情况专项检查报告', no: '湘财库检〔2026〕7号', source: '用户上传', sourceId: 'UPLOAD-20260831-019', fileName: '财政暂付款清理情况专项检查报告.docx', type: '检查报告', year: '2026', issueDate: '—', relatedUnit: '衡阳市某县财政局',
    domain: '国库管理', aspect: '暂付款管理', issueType: '暂付款管控不到位', manifestation: '部分暂付款长期挂账，未按规定制定清理计划并落实责任。', nature: '较严重', responsibility: '市县主责', impactLevel: 'Ⅱ类', impactRule: '根据挂账金额、账龄和清理进度综合判定。',
    handlingMethod: '责令制定清理计划｜限期整改', policyBasis: '《财政总会计制度》', standardRef: '基础认定标准 / 国库管理 / 暂付款管理', standardVersion: 'HN-FS-2026.1', reviewStatus: '待人工复核', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '2026-08-31 14:28', time: '2026-08-31 14:21', status: '未入库', detailStatus: '待人工处理', result: '存在 1 项阻断问题，确认发文日期后可重新校验。', qualityIssues: [
      { field: '发文日期', current: '空值', suggestion: '2026-08-26', confidence: '93%', reason: '正文落款可以识别日期，但标题区和结构化字段均未提供。' },
    ],
  },
  {
    id: 'I08', title: '违规发放津贴补贴问题处理决定', no: '湘财监处〔2026〕9号', source: 'OA同步', sourceId: 'OA-20260831-071', fileName: '湘财监处〔2026〕9号.pdf', type: '处理决定', year: '2026', issueDate: '2026-08-25', relatedUnit: '湖南省某厅直属单位',
    domain: '滥发钱物', aspect: '违规发放钱物', issueType: '超标准、超范围发放奖金、津贴补贴', manifestation: '超出规定范围向部分人员发放专项工作补贴。', nature: '较严重', responsibility: '省级部门主责、市县主责', impactLevel: 'Ⅱ类', impactRule: '根据违规发放金额、人数和持续时间综合判定。',
    handlingMethod: '责令追回资金｜追究相关责任', policyBasis: '《违规发放津贴补贴行为处分规定》', standardRef: '基础认定标准 / 滥发钱物 / 违规发放钱物', standardVersion: 'HN-FS-2026.1', reviewStatus: '自动通过', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '2026-08-31 13:15', time: '2026-08-31 13:10', status: '已入库', detailStatus: '已入库', result: '质量校验通过，已写入正式知识库。', qualityIssues: [],
  },
  {
    id: 'I09', title: '关于账外资金问题的整改通知书', no: '湘财监整〔2026〕6号', source: '第三方采集', sourceId: 'COLLECT-20260830-041', fileName: '关于账外资金问题的整改通知书.pdf', type: '整改通知书', year: '2026', issueDate: '2026-08-24', relatedUnit: '永州市某县属事业单位',
    domain: '私设小金库', aspect: '私设小金库', issueType: '虚列支出转出资金设立小金库', manifestation: '以会议费和劳务费名义虚列支出，将财政资金转入账外账户。', nature: '严重', responsibility: '待确认', impactLevel: 'Ⅰ类', impactRule: '根据资金规模、持续时间和使用方向综合判定。',
    handlingMethod: '责令追回资金｜移送相关线索', policyBasis: '《财政违法行为处罚处分条例》', standardRef: '基础认定标准 / 私设小金库 / 私设小金库', standardVersion: 'HN-FS-2026.1', reviewStatus: '待人工复核', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '2026-08-30 17:18', time: '2026-08-30 17:10', status: '未入库', detailStatus: '待人工处理', result: '存在 1 项阻断问题，责任主体需要结合检查方案确认。', qualityIssues: [
      { field: '责任主体', current: '待确认', suggestion: '省级部门主责、市县主责', confidence: '72%', reason: '正文能够识别被检查单位，但无法仅凭文书确定省级部门是否承担主责。' },
    ],
  },
  {
    id: 'I10', title: '行政事业性国有资产管理检查报告', no: '湘财资检〔2026〕5号', source: '用户上传', sourceId: 'UPLOAD-20260830-015', fileName: '行政事业性国有资产管理检查报告.pdf', type: '检查报告', year: '2026', issueDate: '2026-08-22', relatedUnit: '郴州市某市直单位',
    domain: '资产管理', aspect: '资产管理', issueType: '资产管理不规范', manifestation: '部分固定资产未及时登记入账，资产卡片信息与实物不一致。', nature: '一般', responsibility: '省级部门主责、市县主责', impactLevel: 'Ⅲ类', impactRule: '根据账实不符资产数量、金额和管理影响综合判定。',
    handlingMethod: '责令补录资产卡片｜限期盘点整改', policyBasis: '《行政事业性国有资产管理条例》', standardRef: '基础认定标准 / 资产管理 / 资产管理', standardVersion: 'HN-FS-2026.1', reviewStatus: '自动通过', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '2026-08-30 15:32', time: '2026-08-30 15:27', status: '已入库', detailStatus: '已入库', result: '质量校验通过，已写入正式知识库。', qualityIssues: [],
  },
  {
    id: 'I11', title: '财政票据使用管理专项检查情况通报', no: '湘财综〔2026〕21号', source: 'OA同步', sourceId: 'OA-20260830-062', fileName: '湘财综〔2026〕21号.pdf', type: '检查通报', year: '2026', issueDate: '2026-08-21', relatedUnit: '娄底市某执收单位',
    domain: '票据管理', aspect: '票据使用管理', issueType: '票据使用不规范', manifestation: '部分财政票据领用、核销记录不完整，票据使用台账更新不及时。', nature: '一般', responsibility: '省级部门主责、市县主责', impactLevel: 'Ⅳ类', impactRule: '根据票据数量、涉及金额和管理后果综合判定。',
    handlingMethod: '责令完善台账｜限期整改', policyBasis: '《财政票据管理办法》', standardRef: '基础认定标准 / 票据管理 / 票据使用管理', standardVersion: 'HN-FS-2026.1', reviewStatus: '自动通过', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '2026-08-30 11:19', time: '2026-08-30 11:14', status: '已入库', detailStatus: '已入库', result: '质量校验通过，已写入正式知识库。', qualityIssues: [],
  },
  {
    id: 'I12', title: '重点建设项目实施情况检查报告', no: '湘财建检〔2026〕10号', source: '用户上传', sourceId: 'UPLOAD-20260829-013', fileName: '重点建设项目实施情况检查报告.xlsx', type: '检查报告', year: '2026', issueDate: '2026-08-20', relatedUnit: '湘潭市某项目实施单位',
    domain: '项目管理', aspect: '项目执行管理', issueType: '项目实施不规范', manifestation: '项目实际建设内容与批复方案存在差异，部分变更未履行审批程序。', nature: '待确认', responsibility: '省级部门主责、市县主责', impactLevel: '待判定', impactRule: '需结合变更内容、项目金额和实际影响确定问题性质与影响度。',
    handlingMethod: '责令补办变更手续｜限期整改', policyBasis: '《政府投资条例》', standardRef: '基础认定标准 / 项目管理 / 项目执行管理', standardVersion: 'HN-FS-2026.1', reviewStatus: '待人工复核', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '2026-08-29 16:53', time: '2026-08-29 16:45', status: '未入库', detailStatus: '待人工处理', result: '存在 1 项阻断问题，问题性质需结合项目变更影响确认。', qualityIssues: [
      { field: '问题性质', current: '待确认', suggestion: '较严重', confidence: '74%', reason: '表现形式符合项目实施不规范，但项目变更金额和实际影响证据不足。' },
    ],
  },
  {
    id: 'I13', title: '财政监督检查发现问题整改情况通报', no: '湘财监〔2026〕12号', source: 'OA同步', sourceId: 'OA-20260829-052', fileName: '湘财监〔2026〕12号.pdf', type: '整改通报', year: '2026', issueDate: '2026-08-19', relatedUnit: '张家界市某区财政局',
    domain: '监督管理', aspect: '问题整改', issueType: '问题整改不力', manifestation: '部分问题超过整改期限仍未完成，整改报告未附充分佐证材料。', nature: '较严重', responsibility: '省级部门主责、财政厅主责、市县主责', impactLevel: 'Ⅱ类', impactRule: '根据逾期时长、未整改问题数量和影响范围综合判定。',
    handlingMethod: '责令限期完成整改｜通报批评', policyBasis: '《财政检查工作办法》', standardRef: '基础认定标准 / 监督管理 / 问题整改', standardVersion: 'HN-FS-2026.1', reviewStatus: '自动通过', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '2026-08-29 14:11', time: '2026-08-29 14:07', status: '已入库', detailStatus: '已入库', result: '质量校验通过，已写入正式知识库。', qualityIssues: [],
  },
  {
    id: 'I14', title: '预算单位内部控制执行情况检查报告', no: '湘财会检〔2026〕4号', source: 'OA同步', sourceId: 'OA-20260829-037', fileName: '湘财会检〔2026〕4号.pdf', type: '检查报告', year: '2026', issueDate: '2026-08-18', relatedUnit: '湖南省某行政单位',
    domain: '内部控制', aspect: '制度执行', issueType: '内控制度执行不到位', manifestation: '采购、合同和资金支付岗位未严格执行不相容岗位分离要求。', nature: '较严重', responsibility: '省级部门主责、市县主责', impactLevel: 'Ⅱ类', impactRule: '根据控制缺陷范围、持续时间和已造成后果综合判定。',
    handlingMethod: '责令完善岗位分离｜限期整改', policyBasis: '《行政事业单位内部控制规范（试行）》', standardRef: '基础认定标准 / 内部控制 / 制度执行', standardVersion: 'HN-FS-2026.1', reviewStatus: '自动通过', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '2026-08-29 10:36', time: '2026-08-29 10:31', status: '已入库', detailStatus: '已入库', result: '质量校验通过，已写入正式知识库。', qualityIssues: [],
  },
];

export function splitAggregate(value: string) {
  return value === '—' ? [] : value.split('｜').map((item) => item.trim()).filter(Boolean);
}

export function resolveCaseSubjects(row: IngestionRow): CaseSubject[] {
  if (row.subjects?.length) return row.subjects;
  return row.relatedUnit && row.relatedUnit !== '—' ? [{ role: '相关单位', name: row.relatedUnit }] : [];
}

export function resolveCaseIssues(row: IngestionRow): CaseIssue[] {
  if (row.issues?.length) return row.issues;
  return [{
    id: `${row.id}-ISSUE-01`, title: row.manifestation && row.manifestation !== '—' ? row.manifestation.replace(/[。；].*$/, '') : row.issueType,
    domain: row.domain, aspect: row.aspect, type: row.issueType,
    nature: row.nature, responsibility: row.responsibility,
    facts: row.manifestation && row.manifestation !== '—' ? [row.manifestation] : [],
    violatedBases: splitAggregate(row.policyBasis).map((name) => ({ name })), evidences: [],
    standardMatch: {
      status: row.standardRef === '—' ? '待确认' : row.standardRef.includes('未匹配') ? '未匹配' : '已匹配',
      name: row.standardRef, version: row.standardVersion,
    },
  }];
}

export function resolveCaseDecisions(row: IngestionRow): CaseDecisionGroup[] {
  if (row.decisions?.length) return row.decisions;
  const actions = splitAggregate(row.handlingMethod).map((content) => ({ type: '处理要求', target: row.relatedUnit, content }));
  return actions.length > 0 ? [{ actions, bases: [], relatedIssueIds: [`${row.id}-ISSUE-01`] }] : [];
}

export type MetadataMode = '固定目录' | '可扩展目录' | '原文提取' | '格式约束' | '系统关联';
export type MetadataEdit = { name: string; definition: string; rule: string; usage: string };
export type MetadataField = MetadataEdit & {
  code: string; group: string; type: string; count: '单值' | '多值'; mode: MetadataMode;
  source: string; examples: string[]; status: '已生效' | '草稿' | '已停用'; asTag?: boolean; blocking?: boolean; version?: number; draft?: MetadataEdit & { asTag?: boolean; blocking?: boolean };
};
export const METADATA_GROUPS = ['文书基本信息', '关联主体', '问题认定', '处理决定'];
export const METADATA_MODES: MetadataMode[] = ['固定目录', '可扩展目录', '原文提取', '格式约束', '系统关联'];
export const metadataField = (field: Omit<MetadataField, 'status' | 'type' | 'count' | 'examples'> & Partial<Pick<MetadataField, 'status' | 'type' | 'count' | 'examples'>>): MetadataField => ({
  type: '文本', count: '单值', status: '草稿', examples: [], ...field,
});

// 与入库页目标结构对齐的本地配置，不代表当前 Dify 字段或标准目录已经升级。
// 每行的单/多值描述当前对象，而不是整份文书；完整问题和处置关系留在业务数据中。
const METADATA_FIELDS: MetadataField[] = [
  metadataField({ code: 'document_title', name: '文书标题', group: '文书基本信息', mode: '原文提取', source: '文书原文', status: '已生效',
    definition: '文书正式、完整的标题。', rule: '按原文提取，不以文件名或自行总结的标题替代；缺失时保留为空并提示核验。', usage: '入库详情、检索标题', examples: ['行政处罚决定书'] }),
  metadataField({ code: 'document_no', name: '文号', group: '文书基本信息', mode: '原文提取', source: '文书原文', status: '已生效',
    definition: '文书正式文号，保留原文格式。', rule: '不得改写括号、年份或编号；无文号的材料允许为空，不用文件编号代替。', usage: '精确检索、详情、辅助查重', examples: ['湘财行罚〔2022〕2号'] }),
  metadataField({ code: 'document_type', name: '文书类型', group: '文书基本信息', mode: '可扩展目录', source: '文书类型正式目录', status: '已生效',
    definition: '文书实际文种。', rule: '先提取原文文种，再匹配正式值与别名；无法匹配时提出候选，不直接新增正式值。', usage: '检索筛选、列表、统计', examples: ['行政处罚决定书', '检查报告', '整改通知书'] }),
  metadataField({ code: 'year', name: '所属年度', group: '文书基本信息', type: '整数', mode: '格式约束', source: '发文日期／正式文号', status: '已生效',
    definition: '该文书所属的发文年度，不是检查涉及的业务年度。', rule: '优先取正式发文日期中的年份；日期缺失时参考文号年份；两者冲突需核验。', usage: '年度筛选、列表', examples: ['2022'] }),
  metadataField({ code: 'issue_date', name: '发文日期', group: '文书基本信息', type: '日期', mode: '格式约束', source: '文书正式落款', status: '已生效',
    definition: '文书正式发文日期。', rule: '统一为 YYYY-MM-DD；不把检查日期、上传日期当作发文日期；无法确定返回空值。', usage: '时间排序、日期筛选', examples: ['2022-01-20'] }),
  metadataField({ code: 'related_unit', name: '主要相关单位／当事人', group: '文书基本信息', mode: '原文提取', source: '文书原文', status: '已生效',
    definition: '与文书直接相关的主要被检查单位、被处理单位或当事人。', rule: '不得误取发文机关；多个主体在关联主体中完整记录，没有明确主次时不强行挑选。', usage: '单位检索、文书摘要' }),
  metadataField({ code: 'subject_role', name: '主体角色', group: '关联主体', mode: '可扩展目录', source: '主体角色正式目录',
    definition: '每个关联主体在当前文书中的身份。', rule: '依据原文关系匹配角色，不依据名称猜测；同一主体有多个明确角色时分别记录。', usage: '主体关系展示、主体核验', examples: ['被检查单位', '当事人', '所属机构'] }),
  metadataField({ code: 'subject_name', name: '主体名称', group: '关联主体', mode: '原文提取', source: '文书原文',
    definition: '每条主体记录中的单位或个人名称。', rule: '保留原文名称，与对应主体角色成组保存，不把多个人名或单位拼成一个主体。', usage: '关联主体、原文核验' }),
  metadataField({ code: 'problem_summary', name: '问题概述', group: '问题认定', mode: '原文提取', source: '当前问题事实',
    definition: '对当前问题事实的简短概述，用于阅读定位。', rule: '依据当前问题概括，不补充原文没有的事实；不直接复制标准问题类型作为概述。', usage: '问题标题、问题目录' }),
  metadataField({ code: 'problem_facts', name: '具体问题事实', group: '问题认定', type: '长文本', count: '多值', mode: '原文提取', source: '文书原文与位置',
    definition: '当前问题下的一条或多条具体事实。', rule: '保留原始表述、金额、时间和原文定位；不混入其他问题或模型推断。', usage: '事实核验、认定标准匹配、深度分析' }),
  metadataField({ code: 'supervision_domain', name: '监督领域', group: '问题认定', mode: '固定目录', source: '基础认定标准 · 板块',
    definition: '当前问题所属板块，统一称为监督领域。', rule: '从已确认的 13 个板块匹配；结合问题事实和适用标准选择，不用旧 7 类替代；不匹配时留空待确认。', usage: '领域目录、检索筛选；文书级按问题汇总', examples: DOMAIN_NAMES }),
  metadataField({ code: 'problem_aspect', name: '方面', group: '问题认定', mode: '固定目录', source: '基础认定标准 · 方面',
    definition: '当前监督领域下的问题方面。', rule: '只在匹配板块对应的方面中选择；和问题类型的父子关系保持一致。', usage: '问题认定、分组统计', examples: ['收入管理', '预决算公开', '债券管理'] }),
  metadataField({ code: 'violation_type', name: '问题类型', group: '问题认定', mode: '固定目录', source: '基础认定标准 · 问题类型',
    definition: '当前问题匹配的正式问题分类，不是问题事实摘要。', rule: '先保留事实，再匹配标准条目及别名；一个事实涉及多个独立问题时拆分记录；无匹配项只提出待确认建议，不改写正式标准。', usage: '问题认定、检索筛选；文书级聚合多项', examples: ['虚增财政收入', '应收未收财政收入', '未及时上缴财政收入'] }),
  metadataField({ code: 'problem_nature', name: '问题性质', group: '问题认定', mode: '固定目录', source: '基础认定标准 · 问题性质',
    definition: '当前问题依据适用认定标准形成的问题性质，与处罚阶次不同。', rule: '核对标准适用条件和当前事实；证据不足时留空待确认，不能仅凭问题名称赋予性质。', usage: '问题认定、分类核验', examples: ['严重', '较严重', '一般'] }),
  metadataField({ code: 'responsibility_subject', name: '责任主体', group: '问题认定', count: '多值', mode: '固定目录', source: '基础认定标准 · 责任角色',
    definition: '当前问题涉及的责任角色，不是具体单位名称。', rule: '结合原文责任关系核对标准角色；不得把标准列出的全部可能角色直接当成本案责任主体。', usage: '问题认定、责任关系核验', examples: ['省级部门主责', '财政厅主责', '市县主责'] }),
  metadataField({ code: 'violation_basis', name: '违规认定依据', group: '问题认定', type: '长文本', count: '多值', mode: '原文提取', source: '原文明确引用的依据',
    definition: '原文用于认定当前问题违反规定的文件名称和条款。', rule: '名称与条款成组保留，并关联当前问题；不得补写文书未引用的依据，也不与处罚依据混淆。', usage: '问题依据核验、深度分析' }),
  metadataField({ code: 'evidence_materials', name: '证据材料', group: '问题认定', type: '长文本', count: '多值', mode: '原文提取', source: '原文证据描述',
    definition: '文书明确列举、能够支持当前问题的证据材料。', rule: '只记录明确存在的证据描述与位置；未获得附件时不生成虚假的文件链接。', usage: '问题事实核验' }),
  metadataField({ code: 'standard_ref', name: '适用认定标准', group: '问题认定', mode: '系统关联', source: '认定标准匹配结果',
    definition: '当前问题匹配到的标准条目引用。', rule: '使用匹配结果中的标准标识及条目，不由模型虚构标准编号；未确认结果不得标为已匹配。', usage: '标准原文追溯、匹配核验' }),
  metadataField({ code: 'standard_version', name: '认定标准版本', group: '问题认定', mode: '系统关联', source: '所引用标准的版本记录',
    definition: '本次认定实际使用的标准版本。', rule: '从被引用标准记录读取，与条目引用同时保存；标准升级不得静默覆盖原认定记录。', usage: '版本追溯、存量影响分析' }),
  metadataField({ code: 'handling_method', name: '处理方式', group: '处理决定', mode: '可扩展目录', source: '处理方式正式目录', status: '已生效',
    definition: '每条处理措施的标准类型；一组处置可含多条措施。', rule: '提取原文明示的处理方式再匹配目录；不得把已责令整改当作已完成整改。', usage: '处理决定、检索聚合筛选', examples: ['警告', '罚款', '责令整改'] }),
  metadataField({ code: 'handling_target', name: '处理对象', group: '处理决定', mode: '原文提取', source: '文书原文／关联主体',
    definition: '每条处理措施针对的具体单位或个人。', rule: '逐条关联处理对象；未明确时不默认适用于全部主体。', usage: '处置对象核验' }),
  metadataField({ code: 'handling_content', name: '处理内容', group: '处理决定', type: '长文本', mode: '原文提取', source: '文书处理决定原文',
    definition: '当前措施的完整具体要求或处罚内容。', rule: '保留义务、条件和要求，不用处理方式标签替代原始决定。', usage: '处理决定详情、深度分析' }),
  metadataField({ code: 'handling_measure', name: '金额或期限', group: '处理决定', mode: '原文提取', source: '文书处理决定原文',
    definition: '当前措施明确记载的金额、期限及其单位。', rule: '金额或期限与对应措施关联；保留原始单位，不把不同处罚金额直接相加。', usage: '处置核验', examples: ['暂停执业1个月'] }),
  metadataField({ code: 'policy_basis', name: '处理／处罚依据', group: '处理决定', type: '长文本', count: '多值', mode: '原文提取', source: '原文明确引用的依据', status: '已生效',
    definition: '当前处置组明确引用的处理、处罚依据及条款。', rule: '逐项保留正式名称和条款；同一依据可以关联多个处置组，不推测未引用的政策。', usage: '处罚依据核验、政策筛选' }),
  metadataField({ code: 'penalty_grade', name: '处罚阶次', group: '处理决定', mode: '原文提取', source: '文书裁量结论',
    definition: '文书明确记载的处罚裁量阶次或裁量结论。', rule: '只提取原文明示结论；不根据问题性质或金额自行推算，未记载则为空。', usage: '处置详情' }),
  metadataField({ code: 'related_issue_ids', name: '关联问题', group: '处理决定', count: '多值', mode: '系统关联', source: '本案问题记录',
    definition: '当前处置组所对应的一个或多个问题标识。', rule: '按原文明确的对应关系连接本案问题；无法确定时留待核验，不机械关联所有问题。', usage: '问题—依据—处置关系追溯' }),
];


export type TagValue = {
  id: string; fieldCode: string; name: string; definition: string; aliases: string[];
  status: '已生效' | '待生效' | '已停用'; review: string; evidence: string; reason?: string;
  bindings: Array<{ caseId: string; path: string }>; domain?: string; aspect?: string;
};
export type Feedback = { id: string; module: string; subject: string; evidence: string; at: string; analyzed?: boolean };
export type RuleAdvice = { id: string; fieldCode: string; title: string; evidenceIds: string[]; content: string; status: '待确认' | '已转草稿' | '不采用' };
export type GovernanceState = { fields: MetadataField[]; tags: TagValue[]; cases: IngestionRow[]; feedback: Feedback[]; advice: RuleAdvice[]; focusField: string; focusCase?: string };
export const newId = () => Math.random().toString(36).slice(2, 10);
export const nowText = () => new Date().toLocaleString('zh-CN', { hour12: false });
export const isDirectory = (field?: MetadataField) => !!field && ['固定目录', '可扩展目录'].includes(field.mode);
const initialFields = METADATA_FIELDS.map(field => ({ ...field, status: '已生效' as const, version: 1, asTag: isDirectory(field), blocking: ['document_title', 'problem_facts'].includes(field.code) }));
const initialCases: IngestionRow[] = INGESTION_ROWS.map(row => ({ ...row, version: 1, subjects: resolveCaseSubjects(row), issues: resolveCaseIssues(row), decisions: resolveCaseDecisions(row), versions: [] }));
const initialTags: TagValue[] = [];
const addSeed = (fieldCode: string, name: string, domain?: string, aspect?: string) => {
  if (!name || ['—', '待确认', '待识别'].includes(name) || initialTags.some(t => t.fieldCode === fieldCode && t.name === name)) return;
  initialTags.push({ id: 'tag-' + initialTags.length, fieldCode, name, domain, aspect, definition: name, aliases: [], status: '已生效', review: '已确认', evidence: '初始目录样例', bindings: [] });
};
for (const field of initialFields.filter(f => f.asTag)) for (const name of field.examples) addSeed(field.code, name);
for (const row of initialCases) {
  addSeed('document_type', row.type);
  for (const subject of row.subjects || []) addSeed('subject_role', subject.role);
  for (const issue of (row.issues || []).filter(i => i.standardMatch.status === '已匹配')) {
    addSeed('supervision_domain', issue.domain);
    addSeed('problem_aspect', issue.aspect, issue.domain);
    addSeed('violation_type', issue.type, issue.domain, issue.aspect);
    addSeed('problem_nature', issue.nature);
    for (const role of issue.responsibility.split(/[、，]/)) addSeed('responsibility_subject', role);
  }
  for (const action of (row.decisions || []).flatMap(d => d.actions)) addSeed('handling_method', action.type);
}
['责令限期整改', '警告', '追回资金', '暂停执业'].forEach(n => addSeed('handling_method', n));
const demoCase: IngestionRow = {
  ...initialCases[0], id: 'I15', title: '关于专项资金支付管理问题的整改通知书', no: '湘财监〔2026〕21号',
  source: '用户上传', sourceId: 'UPLOAD-20260904-021', fileName: '专项资金支付整改通知书.docx',
  status: '未入库', detailStatus: '待人工处理', handlingMethod: '建立支付进度联审机制',
  result: '处理方式尚未匹配正式值，可选择已有值或提交新增建议。',
  time: '2026-09-04 09:30', metadataUpdatedAt: '2026-09-04 09:30',
  decisions: [{ actions: [{ type: '', target: initialCases[0].relatedUnit, content: '建立支付进度联审机制', measure: '30日内' }], bases: [], relatedIssueIds: [resolveCaseIssues(initialCases[0])[0].id] }],
  qualityIssues: [], version: 1, versions: [],
};
initialCases.unshift(demoCase);
initialTags.push({ id: 'candidate-payment', fieldCode: 'handling_method', name: '建立支付进度联审机制', definition: '建立资金支付与项目建设进度联合审核机制。', aliases: [], status: '待生效', review: '待确认', evidence: '专项资金支付整改通知书：建立支付进度联审机制，30日内完成。', bindings: [{ caseId: 'I15', path: 'decisions.0.actions.0.type' }] });
let state: GovernanceState = { fields: initialFields, tags: initialTags, cases: initialCases, feedback: [], advice: [], focusField: '' };
const listeners = new Set<() => void>();
export const getGovernance = () => state;
export function updateGovernance(update: (current: GovernanceState) => GovernanceState) {
  state = update(state); listeners.forEach(listener => listener());
}
export function useGovernance() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getGovernance, getGovernance);
}
export function recordFeedback(module: string, subject: string, evidence: string) {
  updateGovernance(s => ({ ...s, feedback: [...s.feedback, { id: newId(), module, subject, evidence, at: nowText() }] }));
}
export function setCasePath(row: IngestionRow, path: string, value: string): IngestionRow {
  const next = JSON.parse(JSON.stringify(row));
  const parts = path.split('.'); let current = next;
  for (const part of parts.slice(0, -1)) current = current[part];
  current[parts[parts.length - 1]] = value;
  if (/^issues\.\d+\.(domain|aspect|type|nature|responsibility)$/.test(path) && getCasePath(row, path) !== value) {
    next.issues[Number(parts[1])].standardMatch.status = '待确认';
  }
  const first = next.issues?.[0];
  if (first) Object.assign(next, { domain: first.domain, aspect: first.aspect, issueType: first.type, nature: first.nature, responsibility: first.responsibility, manifestation: first.facts.join('；') });
  next.handlingMethod = next.decisions?.flatMap((d: CaseDecisionGroup) => d.actions.map(a => a.type || a.content)).join('｜') || '';
  return next;
}
export function getCasePath(row: IngestionRow, path: string): string {
  return path.split('.').reduce((value: any, part) => value?.[part], row) ?? '';
}
export function tagUsage(tag: TagValue, cases = state.cases) {
  return cases.filter(row => row.status === '已入库' && (
    tag.fieldCode === 'document_type' ? row.type === tag.name :
    tag.fieldCode === 'subject_role' ? row.subjects?.some(v => v.role === tag.name) :
    tag.fieldCode === 'handling_method' ? row.decisions?.some(d => d.actions.some(a => a.type === tag.name)) :
    row.issues?.some(i => {
      const key = ({ supervision_domain: 'domain', problem_aspect: 'aspect', violation_type: 'type', problem_nature: 'nature', responsibility_subject: 'responsibility' } as Record<string, string>)[tag.fieldCode];
      return key && (key === 'responsibility' ? String((i as any)[key]).split(/[、，]/).includes(tag.name) : (i as any)[key] === tag.name);
    })
  )).length;
}
export function resolveCandidate(id: string, result: 'publish' | 'reject' | 'merge', reason = '', targetId = '') {
  const tag = state.tags.find(t => t.id === id);
  if (!tag) return '建议不存在';
  const field = state.fields.find(f => f.code === tag.fieldCode);
  if (result !== 'reject' && (!field?.asTag || field.status !== '已生效')) return '所属字段未生效或未启用标签';
  if (result === 'publish' && field?.mode === '固定目录') return '固定目录需核对正式标准，不能直接新增';
  const target = result === 'merge' ? state.tags.find(t => t.id === targetId && t.fieldCode === tag.fieldCode && t.status === '已生效') : tag;
  if (result === 'merge' && !target) return '请选择同字段的已生效标签';
  if (result === 'publish' && state.tags.some(t => t.id !== id && t.fieldCode === tag.fieldCode && t.status === '已生效' && (t.name === tag.name || t.aliases.includes(tag.name)))) return '已有同名正式值或别名，请选择并入已有';
  updateGovernance(s => ({
    ...s,
    tags: s.tags.map(t => t.id === id ? { ...t, status: result === 'publish' ? '已生效' : result === 'merge' ? '已停用' : '待生效', review: result === 'reject' ? '已退回' : result === 'merge' ? '已并入' : '已确认', reason } : t),
    cases: s.cases.map(row => {
      const bindings = tag.bindings.filter(b => b.caseId === row.id);
      if (!bindings.length) return row;
      // 不覆盖正式案例；已入库的关联仅记录待补充建议。
      if (row.status === '已入库') return { ...row, result: '目录处理已完成，请核对后更新当前案例。' };
      const source = row.savedDraft ? JSON.parse(row.savedDraft) as IngestionRow : row;
      const next = result === 'reject' ? source : bindings.reduce((r, b) => setCasePath(r, b.path, target!.name), source);
      next.savedDraft = undefined;
      return { ...next, detailStatus: '待人工处理' as const, result: result === 'reject' ? '建议已退回：' + reason : '目录已确认，请继续校验其他入库条件。' };
    }),
  }));
  recordFeedback('标签', tag.name, result === 'reject' ? '退回：' + reason : result === 'merge' ? '并入：' + target!.name : '确认新增；' + tag.evidence);
  return '';
}
