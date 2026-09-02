import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, FolderTree, History, Link2, Search, Tag, X } from 'lucide-react';
import actionAddIconSvg from '../problem-library-function-list/icons/action-add.svg?raw';
import actionExportIconSvg from '../problem-library-function-list/icons/action-export.svg?raw';
import actionFilterIconSvg from '../problem-library-function-list/icons/action-filter.svg?raw';
import actionImportIconSvg from '../problem-library-function-list/icons/action-import.svg?raw';
import actionPassIconSvg from '../problem-library-function-list/icons/pass.svg?raw';
import actionRefreshIconSvg from '../problem-library-function-list/icons/action-refresh.svg?raw';
import actionSettingsIconSvg from '../problem-library-function-list/icons/action-settings.svg?raw';
import searchIconSvg from '../problem-library-function-list/icons/search.svg?raw';

type NoticeProps = { onNotice: (message: string) => void };

type CaseSubject = { role: string; name: string };
type CasePolicyBasis = { name: string; clauses?: string };
type CaseIssue = {
  id: string; title: string; domain: string; aspect: string; type: string; nature: string;
  responsibility: string; facts: string[]; violatedBases: CasePolicyBasis[]; evidences: string[];
  standardMatch: { status: '已匹配' | '待确认' | '未匹配'; name: string; version: string; basis?: string };
};
type CaseDecisionGroup = {
  grade?: string;
  actions: Array<{ type: string; target: string; content: string; measure?: string }>;
  bases: CasePolicyBasis[];
  relatedIssueIds: string[];
};

function normalizeSvg(svg: string) {
  return svg.replace(/<\?xml[^>]*>/g, '').replace(/<!DOCTYPE[^>]*>/g, '').replace(/\s(width|height)="[^"]*"/g, '').replace(/\sfill="[^"]*"/g, ' fill="currentColor"').replace(/<svg\b([^>]*)>/, '<svg$1 aria-hidden="true" focusable="false">');
}

function RawIcon({ svg }: { svg: string }) {
  const html = useMemo(() => normalizeSvg(svg), [svg]);
  return <span className="ufsp-iconfont-box" dangerouslySetInnerHTML={{ __html: html }} />;
}

function StandardSearchTools({ onNotice, placeholder = '请输入' }: NoticeProps & { placeholder?: string }) {
  return <div className="case-toolbar-right">
    <label className="ufsp-search-box ufsp-filter-input"><input placeholder={placeholder} aria-label={placeholder} /></label>
    <button className="ufsp-icon-btn ufsp-icon-btn-primary" title="查询" onClick={() => onNotice('已按当前条件查询演示数据')}><RawIcon svg={searchIconSvg} /></button>
    <button className="ufsp-icon-btn ufsp-icon-btn-secondary" title="刷新" onClick={() => onNotice('演示数据已刷新')}><RawIcon svg={actionRefreshIconSvg} /></button>
    <button className="ufsp-icon-btn ufsp-icon-btn-secondary" title="筛选" onClick={() => onNotice('已展开高级筛选演示')}><RawIcon svg={actionFilterIconSvg} /></button>
    <button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已打开查询方案演示')}>查询方案</button>
    <button className="ufsp-icon-btn ufsp-icon-btn-secondary" title="列设置" onClick={() => onNotice('已打开列设置演示')}><RawIcon svg={actionSettingsIconSvg} /></button>
  </div>;
}

function Pagination({ total }: { total: number }) {
  return <div className="case-pagination"><span className="ufsp-page-total">共 {total} 条</span><button className="ufsp-page-btn">上一页</button><button className="ufsp-page-btn is-active">1</button><button className="ufsp-page-btn">下一页</button><button className="ufsp-page-size">20 条/页</button></div>;
}

function Catalog({ title, items, active, onChange }: { title: string; items: Array<[string, number, boolean?]>; active: string; onChange: (value: string) => void }) {
  return <aside className="hn-catalog"><div className="hn-catalog-search"><Search size={14} /><input placeholder={`搜索${title}`} /></div><div className="hn-catalog-caption"><FolderTree size={14} /><span>{title}</span></div><div className="hn-catalog-list">{items.map(([label, count, child]) => <button key={label} className={`${active === label ? 'is-active' : ''} ${child ? 'is-child' : ''}`} onClick={() => onChange(label)}><span>{label}</span><em>{count}</em></button>)}</div></aside>;
}

function Drawer({ title, subtitle, children, onClose, actions }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void; actions: React.ReactNode }) {
  return <div className="case-drawer-mask" role="presentation" onMouseDown={onClose}><aside className="case-drawer hn-standard-drawer" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header className="case-drawer-head"><div><h2>{title}</h2>{subtitle ? <span>{subtitle}</span> : null}</div><button onClick={onClose}><X size={18} /></button></header><div className="case-drawer-content">{children}</div><footer className="hn-standard-drawer-footer">{actions}</footer></aside></div>;
}

type IngestionRow = {
  id: string; title: string; no: string; source: string; sourceId: string; fileName: string;
  type: string; year: string; issueDate: string; relatedUnit: string; domain: string; aspect: string;
  issueType: string; manifestation: string; nature: string; responsibility: string; impactLevel: string;
  impactRule: string; handlingMethod: string; policyBasis: string; standardRef: string; standardVersion: string;
  reviewStatus: string; ruleVersion: string; metadataUpdatedAt: string; time: string;
  status: '已入库' | '未入库'; detailStatus: '已入库' | '待人工处理' | '处理中' | '处理失败'; result: string;
  qualityIssues: Array<{ field: string; current: string; suggestion: string; confidence: string; reason: string }>;
  subjects?: CaseSubject[]; issues?: CaseIssue[]; decisions?: CaseDecisionGroup[];
  revisionStatus?: '复核中';
};

const DOMAIN_NAMES = [
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
    handlingMethod: '责令补录资产卡片｜限期盘点整改', policyBasis: '《行政事业性国有资产管理条例》', standardRef: '基础认定标准 / 资产管理 / 资产管理', standardVersion: 'HN-FS-2026.1', reviewStatus: '自动通过', ruleVersion: 'metadata-v1.3', metadataUpdatedAt: '2026-08-30 15:32', time: '2026-08-30 15:27', status: '已入库', detailStatus: '已入库', revisionStatus: '复核中', result: '质量校验通过，已写入正式知识库。', qualityIssues: [],
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

function splitAggregate(value: string) {
  return value === '—' ? [] : value.split('｜').map((item) => item.trim()).filter(Boolean);
}

function resolveCaseSubjects(row: IngestionRow): CaseSubject[] {
  if (row.subjects?.length) return row.subjects;
  return row.relatedUnit && row.relatedUnit !== '—' ? [{ role: '相关单位', name: row.relatedUnit }] : [];
}

function resolveCaseIssues(row: IngestionRow): CaseIssue[] {
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

function resolveCaseDecisions(row: IngestionRow): CaseDecisionGroup[] {
  if (row.decisions?.length) return row.decisions;
  const actions = splitAggregate(row.handlingMethod).map((content) => ({ type: '处理要求', target: row.relatedUnit, content }));
  return actions.length > 0 ? [{ actions, bases: [], relatedIssueIds: [`${row.id}-ISSUE-01`] }] : [];
}

function IngestionMetadataPage({ row, onBack, onNotice }: { row: IngestionRow; onBack: () => void; onNotice: (message: string) => void }) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const editable = row.detailStatus === '待人工处理' || row.detailStatus === '处理失败';
  const field = (label: string, value: string, wide = false) => <label className={`ufsp-field-block ${wide ? 'hn-field-wide' : ''}`} key={label}><span>{label}</span><input defaultValue={value} readOnly={!editable} /></label>;
  const pageMode = row.detailStatus === '待人工处理' || row.detailStatus === '处理失败' ? '数据处理' : '入库详情';
  const flowAction = row.detailStatus === '待人工处理' ? '重新校验' : row.detailStatus === '处理失败' ? '重新解析' : row.detailStatus === '处理中' ? '刷新状态' : null;
  const subjects = resolveCaseSubjects(row);
  const issues = resolveCaseIssues(row);
  const decisionGroups = resolveCaseDecisions(row);
  const revisionStatus = reviewSubmitted ? '复核中' : row.revisionStatus;
  const standardStatusClass = (status: CaseIssue['standardMatch']['status']) => status === '已匹配' ? 'is-success' : status === '未匹配' ? 'is-danger' : 'is-warning';
  const issueNameById = new Map(issues.map((issue, index) => [issue.id, `问题 ${index + 1}`]));
  const countLabel = (count: number, unit = '项') => count > 1 ? <em>共 {count} {unit}</em> : null;

  return <div className="case-workspace case-form-page ufsp-form-shell hn-ingestion-detail-page">
    <div className="case-form-head ufsp-form-head"><div className="ufsp-form-title"><button type="button" className="ufsp-form-back" onClick={onBack} aria-label="返回入库列表"><ArrowLeft size={18} /></button><h1><span>案例入库管理</span><em>/ {pageMode}</em></h1></div><div className="case-head-actions ufsp-form-actions"><button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已打开原始来源资料')}>查看源文件</button>{row.detailStatus === '已入库' ? <button className="ufsp-btn ufsp-btn-secondary" onClick={() => setReviewOpen(true)}>{revisionStatus ? '查看复核' : '申请复核'}</button> : null}{editable ? <button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('当前修正内容已保存')}>保存</button> : null}{flowAction ? <button className="ufsp-btn ufsp-btn-primary" onClick={() => onNotice(`已模拟${flowAction}`)}>{flowAction}</button> : null}</div></div>
    <div className="case-edit-body case-standard-form ufsp-ledger-edit-body hn-ingestion-form">
      {revisionStatus ? <div className="hn-revision-notice"><strong>该案例正在复核</strong><span>正式案例仍按当前版本提供检索；复核通过后生成新版本，并重新执行质量校验和知识索引。</span></div> : null}
      <section className="ufsp-ledger-edit-section hn-ingestion-quality-section"><h2>质量校验结果</h2>{row.qualityIssues.length > 0 ? <><div className="hn-ingestion-quality-summary"><strong>{row.qualityIssues.length} 项阻断问题</strong><span>修正并重新校验通过后，文档才会写入正式知识库。</span></div><div className="hn-quality-issue-wrap"><table className="hn-quality-issue-table"><thead><tr><th>字段</th><th>当前值</th><th>系统建议</th><th>置信度</th><th>待处理原因</th></tr></thead><tbody>{row.qualityIssues.map((issue) => <tr key={`${issue.field}-${issue.reason}`}><td>{issue.field}</td><td>{issue.current}</td><td>{issue.suggestion}</td><td>{issue.confidence}</td><td>{issue.reason}</td></tr>)}</tbody></table></div></> : <div className={`hn-quality-result ${row.detailStatus === '已入库' ? 'is-pass' : 'is-processing'}`}><CheckCircle2 size={16} /><div><strong>{row.detailStatus === '已入库' ? '质量校验已通过' : '系统正在执行质量校验'}</strong><span>{row.detailStatus === '已入库' ? '未发现阻断项，文档已进入正式知识库。' : '完成前不会写入正式知识库，无需人工处理。'}</span></div></div>}</section>
      <section className="ufsp-ledger-edit-section"><h2>文书基本信息</h2><div className="ufsp-ledger-form-grid four">{field('文书标题（document_title）', row.title, true)}{field('文号（document_no）', row.no)}{field('文书类型（document_type）', row.type)}{field('所属年度（year）', row.year)}{field('发文日期（issue_date）', row.issueDate)}{field('主要相关主体（related_unit）', row.relatedUnit, true)}</div></section>
      <section className="ufsp-ledger-edit-section"><h2>关联主体 {countLabel(subjects.length)}</h2>{subjects.length > 0 ? <div className="hn-structured-table-wrap"><table className="hn-structured-table"><thead><tr><th>主体角色</th><th>主体名称</th></tr></thead><tbody>{subjects.map((subject, index) => <tr key={`${subject.role}-${subject.name}-${index}`}><td>{subject.role}</td><td>{subject.name}</td></tr>)}</tbody></table></div> : <p className="hn-structured-empty">原文暂未识别到明确关联主体。</p>}</section>
      <section className="ufsp-ledger-edit-section"><h2>问题认定 {countLabel(issues.length)}</h2>{issues.length > 5 ? <nav className="hn-case-issue-index" aria-label="问题目录">{issues.map((issue, index) => <a key={issue.id} href={`#${issue.id}`}>{index + 1}. {issue.title}</a>)}</nav> : null}<div className="hn-case-issue-list">{issues.map((issue, issueIndex) => <article className="hn-case-issue" id={issue.id} key={issue.id}>
        <header className={`hn-case-issue-head ${issues.length === 1 ? 'is-single' : ''}`}>{issues.length > 1 ? <span>问题 {issueIndex + 1}</span> : null}<h3>{issue.title}</h3><em className={`case-badge ${standardStatusClass(issue.standardMatch.status)}`}>{issue.standardMatch.status}</em></header>
        <div className="ufsp-ledger-form-grid four hn-case-classification-grid">{field('监督领域（supervision_domain）', issue.domain)}{field('方面（problem_aspect）', issue.aspect)}{field('问题类型（violation_type）', issue.type, true)}{field('问题性质（problem_nature）', issue.nature)}{field('责任主体（responsibility_subject）', issue.responsibility, true)}</div>
        <div className="hn-case-standard-match"><strong>适用认定标准</strong><span>{issue.standardMatch.name}</span><em>{issue.standardMatch.version}</em>{issue.standardMatch.basis ? <small>{issue.standardMatch.basis}</small> : null}</div>
        <div className="hn-case-detail-grid"><section className="hn-case-detail-block"><h4>具体问题事实 {countLabel(issue.facts.length, '条')}</h4>{issue.facts.length > 0 ? <ol className="hn-case-fact-list">{issue.facts.map((fact, index) => <li key={`${issue.id}-fact-${index}`}>{fact}</li>)}</ol> : <p className="hn-structured-empty">原文暂未识别到明确问题事实。</p>}</section><section className="hn-case-detail-block"><h4>违规认定依据 {countLabel(issue.violatedBases.length, '条')}</h4>{issue.violatedBases.length > 0 ? <ul className="hn-case-policy-list">{issue.violatedBases.map((basis, index) => <li key={`${issue.id}-basis-${index}`}><strong>{basis.name}</strong>{basis.clauses ? <span>{basis.clauses}</span> : null}</li>)}</ul> : <p className="hn-structured-empty">原文暂未识别到明确违规依据。</p>}</section></div>
        {issue.evidences.length > 0 ? <div className="hn-case-evidence-line"><strong>证据材料</strong><span>{issue.evidences.join('；')}</span></div> : null}
      </article>)}</div></section>
      <section className="ufsp-ledger-edit-section"><h2>处理决定 {countLabel(decisionGroups.length)}</h2>{decisionGroups.length > 0 ? <div className="hn-case-decision-list">{decisionGroups.map((group, groupIndex) => <article className="hn-case-decision" key={`decision-${groupIndex}`}><header><strong>{decisionGroups.length > 1 ? `处置组 ${groupIndex + 1}` : '处理结果'}</strong>{group.grade ? <span>{group.grade}</span> : null}{issues.length > 1 ? <em>关联 {group.relatedIssueIds.map((id) => issueNameById.get(id) || id).join('、')}</em> : null}</header><div className="hn-structured-table-wrap"><table className="hn-structured-table hn-case-decision-table"><thead><tr><th>处理类型</th><th>处理对象</th><th>处理内容</th><th>金额或期限</th></tr></thead><tbody>{group.actions.map((action, index) => <tr key={`${action.type}-${action.content}-${index}`}><td>{action.type}</td><td>{action.target}</td><td>{action.content}</td><td>{action.measure || '—'}</td></tr>)}</tbody></table></div>{group.bases.length > 0 ? <div className="hn-case-decision-bases"><strong>处理 / 处罚依据</strong><ul>{group.bases.map((basis, index) => <li key={`${basis.name}-${index}`}><span>{basis.name}</span>{basis.clauses ? <em>{basis.clauses}</em> : null}</li>)}</ul></div> : null}</article>)}</div> : <p className="hn-structured-empty">原文未识别到明确处理决定。</p>}</section>
      <section className="ufsp-ledger-edit-section"><h2>来源与治理信息</h2><div className="ufsp-ledger-form-grid four">{field('接入来源', row.source)}{field('来源标识', row.sourceId)}{field('源文件名称', row.fileName, true)}{field('正式知识库状态', row.detailStatus)}{field('元数据审核状态', row.reviewStatus)}{field('元数据规则版本', row.ruleVersion)}{field('元数据更新时间', row.metadataUpdatedAt)}</div><div className={row.detailStatus === '处理失败' ? 'case-warning-block' : 'hn-standard-evidence'}>{row.result}</div></section>
    </div>
    {reviewOpen ? <div className="case-modal-mask" role="presentation" onMouseDown={() => setReviewOpen(false)}><section className="hn-review-modal" role="dialog" aria-modal="true" aria-labelledby="hn-review-title" onMouseDown={(event) => event.stopPropagation()}><header className="case-modal-head"><div><h2 id="hn-review-title">{revisionStatus ? '复核任务' : '申请复核'}</h2><span>{row.no} · {row.title}</span></div><button onClick={() => setReviewOpen(false)} aria-label="关闭"><X size={18} /></button></header>{revisionStatus ? <div className="hn-review-status"><strong>复核中</strong><span>原案例继续按当前版本提供检索，复核结论形成后将保留完整版本记录。</span></div> : <div className="hn-review-form"><div className="hn-review-grid"><label><span>反馈范围</span><select defaultValue="问题认定"><option>文书基本信息</option><option>关联主体</option><option>问题认定</option><option>认定依据</option><option>处理决定</option><option>源文件或重复数据</option></select></label><label><span>异议类型</span><select defaultValue="分类不当"><option>信息错误</option><option>信息遗漏</option><option>分类不当</option><option>依据不准确</option><option>其他</option></select></label></div><label><span>问题说明</span><textarea placeholder="请说明存在的问题，以及对应的原文位置或业务依据" /></label><label><span>建议修正</span><textarea placeholder="请输入建议的正确内容；暂不确定时可不填写" /></label><label><span>佐证说明</span><input placeholder="请输入政策文件、原文页码或其他佐证" /></label><p>提交后生成独立复核任务，不直接覆盖正式案例。审核通过后生成新版本，并重新执行质量校验和知识索引。</p></div>}<footer className="case-modal-actions"><button className="ufsp-btn" onClick={() => setReviewOpen(false)}>关闭</button>{!revisionStatus ? <button className="ufsp-btn ufsp-btn-primary" onClick={() => { setReviewSubmitted(true); setReviewOpen(false); onNotice('复核申请已提交，原案例继续按当前版本提供检索'); }}>提交复核</button> : null}</footer></section></div> : null}
  </div>;
}

export function CaseIngestionManagement({ onNotice }: NoticeProps) {
  const [tab, setTab] = useState('未入库');
  const [catalog, setCatalog] = useState('全部领域');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const tabRows = INGESTION_ROWS.filter((row) => tab === '全部' || (tab === '已入库' ? row.status === '已入库' : row.status !== '已入库'));
  const rows = tabRows.filter((row) => catalog === '全部领域' || row.domain === catalog);
  const tabCounts = {
    已入库: INGESTION_ROWS.filter((row) => row.status === '已入库').length,
    未入库: INGESTION_ROWS.filter((row) => row.status !== '已入库').length,
    全部: INGESTION_ROWS.length,
  };
  const domainItems: Array<[string, number, boolean?]> = [
    ['全部领域', tabRows.length],
    ...DOMAIN_NAMES.map((name) => [name, tabRows.filter((row) => row.domain === name).length, true] as [string, number, boolean]),
  ];
  const selected = INGESTION_ROWS.find((row) => row.id === detailId);

  if (selected) return <IngestionMetadataPage row={selected} onBack={() => setDetailId(null)} onNotice={onNotice} />;

  return <div className="case-workspace hn-module-page hn-standard-management-page">
    <div className="case-tabs">{(['已入库', '未入库', '全部'] as const).map((name) => <button key={name} className={tab === name ? 'is-active' : ''} onClick={() => { setTab(name); setCatalog('全部领域'); }}>{name}（{tabCounts[name]}）</button>)}</div>
    <div className="hn-split-workspace"><Catalog title="监督领域" active={catalog} onChange={setCatalog} items={domainItems} /><section className="hn-list-region">
      <div className="case-list-toolbar"><div className="case-toolbar-left"><button className="ufsp-btn ufsp-btn-primary" onClick={() => setUploadOpen(true)}><RawIcon svg={actionImportIconSvg} />上传文档</button>{tab !== '已入库' ? <button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已对所选待处理文档执行批量处理演示')}><RawIcon svg={actionPassIconSvg} />批量处理</button> : null}<button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已导出入库任务清单')}><RawIcon svg={actionExportIconSvg} />导出</button></div><StandardSearchTools onNotice={onNotice} placeholder="请输入标题、文号或相关单位" /></div>
      <div className="case-table-wrap"><table className="case-table hn-standard-table hn-ingestion-standard-table"><thead><tr><th className="case-col-check"><input type="checkbox" /></th><th>文档标题</th><th>文号</th><th>监督领域</th><th>方面</th><th>问题类型</th><th>问题性质</th><th>相关单位</th><th>当前状态</th><th>接入时间</th><th className="case-col-actions">操作</th></tr></thead><tbody>{rows.map((row) => {
        const displayStatus = row.revisionStatus || row.detailStatus;
        const rowStatusClass = row.revisionStatus ? 'is-ai' : row.detailStatus === '已入库' ? 'is-success' : row.detailStatus === '处理失败' ? 'is-danger' : 'is-warning';
        const actionLabel = row.detailStatus === '待人工处理' || row.detailStatus === '处理失败' ? '处理' : '详情';
        const issueTip = row.revisionStatus ? '用户已提交复核申请，当前正式版本仍可检索。' : row.qualityIssues.length > 0 ? `待处理原因：${row.qualityIssues.map((issue, index) => `${index + 1}. ${issue.field}：${issue.reason}`).join('；')}` : undefined;
        return <tr key={row.id}><td className="case-col-check"><input type="checkbox" /></td><td><button className="case-title-link" onClick={() => setDetailId(row.id)}>{row.title}</button></td><td>{row.no}</td><td>{row.domain}</td><td>{row.aspect}</td><td>{row.issueType}</td><td>{row.nature}</td><td>{row.relatedUnit}</td><td><span className={`case-badge ${rowStatusClass}`} title={issueTip} aria-label={issueTip || displayStatus}>{displayStatus}</span></td><td>{row.time}</td><td className="case-col-actions"><button onClick={() => setDetailId(row.id)}>{actionLabel}</button></td></tr>;
      })}</tbody></table></div><Pagination total={rows.length} />
    </section></div>
    {uploadOpen ? <div className="case-modal-mask" role="presentation" onMouseDown={() => setUploadOpen(false)}><section className="hn-standard-upload" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header className="case-modal-head"><h2>上传案例文档</h2><button onClick={() => setUploadOpen(false)}><X size={18} /></button></header><div className="hn-standard-upload-body"><div className="hn-standard-upload-drop"><RawIcon svg={actionImportIconSvg} /><strong>点击或拖拽文件到此处</strong><span>支持 PDF、Word、Excel，单个文件不超过 50MB</span></div><label><span>来源说明</span><input placeholder="请输入来源说明" /></label></div><footer className="case-modal-actions"><button className="ufsp-btn" onClick={() => setUploadOpen(false)}>取消</button><button className="ufsp-btn ufsp-btn-primary" onClick={() => { setUploadOpen(false); onNotice('文件已加入入库任务队列演示'); }}>开始上传</button></footer></section></div> : null}
  </div>;
}

const METADATA_FIELDS = [
  { id: 'M01', group: '文书属性', name: '文号', code: 'document_no', type: '文本', count: '单值', mode: '开放值', coverage: '96%', status: '已发布', definition: '文书正式文号，保留原文格式，不进行改写。', rule: '优先识别标题下方或落款前的正式文号；不得使用文件名代替。', usage: '检索展示、精确筛选、去重校验' },
  { id: 'M02', group: '文书属性', name: '文书类型', code: 'document_type', type: '标签', count: '单值', mode: '可扩充标签', coverage: '100%', status: '已发布', definition: '文书实际文种，如行政处罚决定书、检查报告、整改通知书。', rule: '优先匹配正式值和别名；无法匹配时生成候选值，进入标签审核。', usage: '筛选、统计、分类展示' },
  { id: 'M03', group: '文书属性', name: '发文日期', code: 'issue_date', type: '日期', count: '单值', mode: '格式约束', coverage: '89%', status: '已发布', definition: '文书正式发文日期，统一为 YYYY-MM-DD。', rule: '优先使用正式落款日期，无法确定时为空，不用上传日期代替。', usage: '时间排序、日期筛选' },
  { id: 'M04', group: '主体属性', name: '相关单位', code: 'related_unit', type: '文本', count: '单值', mode: '开放值', coverage: '92%', status: '已发布', definition: '被检查、被处理或被监督的主要单位名称。', rule: '不得把发文机关识别为相关单位，除非其明确为被处理主体。', usage: '筛选、检索展示' },
  { id: 'M05', group: '业务分类', name: '监督领域', code: 'supervision_domain', type: '枚举', count: '单值', mode: '固定枚举', coverage: '98%', status: '已发布', definition: '监督工作所属的上位业务领域。', rule: '仅从已发布枚举中选择最匹配项，无法判断时为空。', usage: '筛选、统计、权限范围' },
  { id: 'M06', group: '问题分类', name: '问题领域', code: 'problem_domain', type: '标签', count: '单值', mode: '可扩充标签', coverage: '84%', status: '草稿', definition: '问题事实所属的稳定业务问题大类，比监督领域更贴近具体问题。', rule: '优先匹配正式标签；无相近标签且证据充分时生成候选标签。', usage: '问题聚类、筛选、深度分析' },
  { id: 'M07', group: '问题分类', name: '违规类型', code: 'violation_type', type: '标签', count: '多值', mode: '可扩充标签', coverage: '87%', status: '草稿', definition: '文书涉及的主要违规问题类型，可返回多个稳定、可复用的概念。', rule: '匹配正式标签和别名；不得直接复制整段事实描述。', usage: '问题检索、案例要素、相似分析' },
  { id: 'M08', group: '处置属性', name: '处理方式', code: 'handling_method', type: '标签', count: '多值', mode: '可扩充标签', coverage: '81%', status: '已发布', definition: '文书明确记载的处理、整改、处罚或处置方式。', rule: '仅提取原文明确存在的方式，并优先匹配正式标签。', usage: '筛选、整改分析' },
];

export function MetadataManagement({ onNotice }: NoticeProps) {
  const [tab, setTab] = useState('全部字段'); const [catalog, setCatalog] = useState('全部字段'); const [drawerId, setDrawerId] = useState<string | null>(null);
  const selected = METADATA_FIELDS.find((row) => row.id === drawerId) || METADATA_FIELDS[0];
  const rows = METADATA_FIELDS.filter((row) => catalog === '全部字段' || row.group === catalog).filter((row) => tab === '全部字段' || row.status === tab);
  return <div className="case-workspace hn-module-page hn-standard-management-page"><div className="case-tabs">{['全部字段（12）', '已发布（10）', '草稿（2）'].map((item) => { const name = item.split('（')[0]; return <button key={item} className={tab === name ? 'is-active' : ''} onClick={() => setTab(name)}>{item}</button>; })}</div><div className="hn-split-workspace"><Catalog title="字段分组" active={catalog} onChange={setCatalog} items={[["全部字段", 12], ["文书属性", 5, true], ["主体属性", 1, true], ["业务分类", 2, true], ["问题分类", 2, true], ["处置属性", 1, true], ["依据属性", 1, true]]} /><section className="hn-list-region">
    <div className="case-list-toolbar"><div className="case-toolbar-left"><button className="ufsp-btn ufsp-btn-primary" onClick={() => onNotice('已打开新增元数据字段演示')}><RawIcon svg={actionAddIconSvg} />新增字段</button><button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('元数据规则 V1.3 已发布演示')}><RawIcon svg={actionPassIconSvg} />发布版本</button><button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已打开规则版本记录')}><History size={14} />版本记录</button><button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已导出字段目录')}><RawIcon svg={actionExportIconSvg} />导出</button></div><StandardSearchTools onNotice={onNotice} placeholder="请输入字段名称或编码" /></div><div className="hn-filter-summary"><span>当前版本 V1.2 · 草稿 V1.3 含 2 项变更</span><span>发布后默认作用于新增文档，存量回填需单独确认</span></div>
    <div className="case-table-wrap"><table className="case-table hn-standard-table hn-metadata-standard-table"><thead><tr><th className="case-col-check"><input type="checkbox" /></th><th>字段名称</th><th>字段编码</th><th>字段分组</th><th>数据类型</th><th>单值/多值</th><th>值域方式</th><th>覆盖率</th><th>状态</th><th className="case-col-actions">操作</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="case-col-check"><input type="checkbox" /></td><td><button className="case-title-link" onClick={() => setDrawerId(row.id)}>{row.name}</button></td><td>{row.code}</td><td>{row.group}</td><td>{row.type}</td><td>{row.count}</td><td><span className="case-badge is-ai">{row.mode}</span></td><td>{row.coverage}</td><td><span className={`case-badge ${row.status === '已发布' ? 'is-success' : 'is-warning'}`}>{row.status}</span></td><td className="case-col-actions"><button onClick={() => setDrawerId(row.id)}>查看</button><button onClick={() => setDrawerId(row.id)}>编辑</button></td></tr>)}</tbody></table></div><Pagination total={12} />
  </section></div>{drawerId ? <Drawer title="元数据字段" subtitle={selected.code} onClose={() => setDrawerId(null)} actions={<><button className="ufsp-btn" onClick={() => setDrawerId(null)}>取消</button><button className="ufsp-btn ufsp-btn-primary" onClick={() => { setDrawerId(null); onNotice('字段规则已保存为 V1.3 草稿'); }}>保存草稿</button></>}><section className="hn-drawer-section"><h3>基本信息</h3><dl className="hn-detail-list"><div><dt>字段名称</dt><dd>{selected.name}</dd></div><div><dt>字段编码</dt><dd>{selected.code}</dd></div><div><dt>字段分组</dt><dd>{selected.group}</dd></div><div><dt>数据类型</dt><dd>{selected.type}</dd></div><div><dt>取值数量</dt><dd>{selected.count}</dd></div><div><dt>值域方式</dt><dd>{selected.mode}</dd></div></dl></section><section className="hn-drawer-section"><h3>业务定义</h3><textarea defaultValue={selected.definition} /></section><section className="hn-drawer-section"><h3>抽取与匹配规则</h3><textarea defaultValue={selected.rule} /></section><section className="hn-drawer-section"><h3>应用位置</h3><p>{selected.usage}</p></section>{selected.mode === '固定枚举' ? <div className="hn-value-list"><span>预算管理</span><span>预算执行</span><span>债务</span><span>账户</span><span>专项资金</span><span>政府采购</span><span>第三方中介机构</span></div> : selected.mode === '可扩充标签' ? <div className="hn-drawer-note"><Tag size={14} />该字段的正式值、别名和候选值由智能标签管理维护。</div> : null}</Drawer> : null}</div>;
}

const TAG_ROWS = [
  { id: 'T01', field: '违规类型', group: '资金类违规', code: 'V-FUND-01', name: '专项资金使用不规范', status: '正式', aliases: 1, usage: 28, candidates: 0, similar: '—', definition: '专项资金在拨付、使用或核算过程中未按规定执行。', examples: '超范围使用专项资金；专项资金未专账核算' },
  { id: 'T02', field: '违规类型', group: '资金类违规', code: 'V-FUND-02', name: '资金支付与项目进度不匹配', status: '正式', aliases: 2, usage: 16, candidates: 3, similar: '—', definition: '资金支付比例明显超出项目实际建设或履约进度。', examples: '工程进度不足但资金已大比例支付' },
  { id: 'T03', field: '违规类型', group: '采购类违规', code: 'V-PROC-01', name: '政府采购程序执行不规范', status: '正式', aliases: 1, usage: 22, candidates: 1, similar: '—', definition: '政府采购活动未完整履行法定程序或内部控制要求。', examples: '未按规定履行采购方式审批' },
  { id: 'T04', field: '问题领域', group: '收入管理', code: 'C-PROB-012', name: '应收未收财政收入', status: '候选', aliases: 0, usage: 0, candidates: 2, similar: '暂无稳定匹配', definition: '应征财政收入未在规定期限内足额征缴入库。', examples: '非税收入应收未收' },
  { id: 'T05', field: '处理方式', group: '整改处置', code: 'H-RECT-01', name: '责令限期整改', status: '正式', aliases: 2, usage: 34, candidates: 4, similar: '—', definition: '要求责任主体在明确期限内完成问题整改。', examples: '责令于30日内整改并报送结果' },
  { id: 'T06', field: '违规类型', group: '资金类违规', code: 'C-VIOL-024', name: '超进度拨付专项债券资金', status: '候选', aliases: 0, usage: 0, candidates: 3, similar: '资金支付与项目进度不匹配', definition: '候选表达，待确认是否并入现有正式标签。', examples: '项目资金支付进度明显快于实际建设进度' },
];

export function SmartTagManagement({ onNotice }: NoticeProps) {
  const [tab, setTab] = useState('正式标签'); const [catalog, setCatalog] = useState('违规类型'); const [drawerId, setDrawerId] = useState<string | null>(null);
  const selected = TAG_ROWS.find((row) => row.id === drawerId) || TAG_ROWS[0];
  const rows = TAG_ROWS.filter((row) => row.field === catalog).filter((row) => tab === '正式标签' ? row.status === '正式' : tab === '候选标签' ? row.status === '候选' || row.candidates > 0 : false);
  return <div className="case-workspace hn-module-page hn-standard-management-page"><div className="case-tabs">{['正式标签（74）', '候选标签（9）', '已停用（3）'].map((item) => { const name = item.split('（')[0]; return <button key={item} className={tab === name ? 'is-active' : ''} onClick={() => setTab(name)}>{item}</button>; })}</div><div className="hn-split-workspace"><Catalog title="标签字段" active={catalog} onChange={setCatalog} items={[["违规类型", 32], ["问题领域", 18], ["处理方式", 14], ["文书类型", 10]]} /><section className="hn-list-region">
    <div className="case-list-toolbar"><div className="case-toolbar-left"><button className="ufsp-btn ufsp-btn-primary" onClick={() => onNotice('已打开新增标签演示')}><RawIcon svg={actionAddIconSvg} />新增标签</button><button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已打开标签合并演示')}><Link2 size={14} />合并</button><button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已批量审核候选标签演示')}><RawIcon svg={actionPassIconSvg} />批量审核</button><button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('标签目录 V1.6 已发布演示')}><RawIcon svg={actionExportIconSvg} />发布目录</button></div><StandardSearchTools onNotice={onNotice} placeholder="请输入标签名称、编码或别名" /></div><div className="hn-filter-summary"><span>当前目录版本 V1.5 · 待发布变更 6 项</span><span>候选表达不直接写入正式元数据值</span></div>
    <div className="case-table-wrap"><table className="case-table hn-standard-table hn-tag-standard-table"><thead><tr><th className="case-col-check"><input type="checkbox" /></th><th>标签名称</th><th>标签编码</th><th>标签分类</th><th>正式引用</th><th>别名</th><th>待归并候选</th><th>相近正式标签</th><th>状态</th><th className="case-col-actions">操作</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="case-col-check"><input type="checkbox" /></td><td><button className="case-title-link" onClick={() => setDrawerId(row.id)}>{row.name}</button></td><td>{row.code}</td><td>{row.group}</td><td>{row.usage} 份</td><td>{row.aliases} 个</td><td>{row.candidates} 条</td><td>{row.similar}</td><td><span className={`case-badge ${row.status === '正式' ? 'is-success' : 'is-warning'}`}>{row.status}</span></td><td className="case-col-actions"><button onClick={() => setDrawerId(row.id)}>{row.status === '候选' ? '审核' : '查看'}</button><button onClick={() => onNotice(row.status === '候选' ? '已打开候选归并演示' : '已打开标签编辑演示')}>{row.status === '候选' ? '归并' : '编辑'}</button></td></tr>)}</tbody></table></div><Pagination total={tab === '正式标签' ? 74 : tab === '候选标签' ? 9 : 3} />
  </section></div>{drawerId ? <Drawer title={selected.status === '候选' ? '候选标签审核' : '标签详情'} subtitle={selected.code} onClose={() => setDrawerId(null)} actions={selected.status === '候选' ? <><button className="ufsp-btn" onClick={() => onNotice('候选标签已驳回演示')}>驳回</button><button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('候选标签已并入现有标签')}>并入现有</button><button className="ufsp-btn ufsp-btn-primary" onClick={() => { setDrawerId(null); onNotice('候选标签已批准为正式标签'); }}>批准新增</button></> : <><button className="ufsp-btn" onClick={() => setDrawerId(null)}>关闭</button><button className="ufsp-btn ufsp-btn-primary" onClick={() => onNotice('已打开标签编辑演示')}>编辑</button></>}><section className="hn-drawer-section"><h3>标签信息</h3><dl className="hn-detail-list"><div><dt>标签名称</dt><dd>{selected.name}</dd></div><div><dt>标签编码</dt><dd>{selected.code}</dd></div><div><dt>所属字段</dt><dd>{selected.field}</dd></div><div><dt>所属分类</dt><dd>{selected.group}</dd></div><div><dt>正式引用</dt><dd>{selected.usage} 份</dd></div><div><dt>待归并候选</dt><dd>{selected.candidates} 条</dd></div></dl></section><section className="hn-drawer-section"><h3>业务定义</h3><p>{selected.definition}</p></section><section className="hn-drawer-section"><h3>典型依据</h3><p className="hn-standard-evidence">{selected.examples}</p></section>{selected.status === '候选' ? <div className="hn-drawer-note"><CheckCircle2 size={14} />系统建议优先与“{selected.similar}”比较；审核后才会成为正式值或别名。</div> : <div className="hn-drawer-note"><Tag size={14} />当前标签已发布，合并或停用前应先查看历史引用影响。</div>}</Drawer> : null}</div>;
}
