/**
 * @name 案例智能检索（甘肃）
 *
 * 参考资料：
 * - /rules/ufsp-page-governance.md
 * - /rules/confirmed-baselines.md
 * - /src/prototypes/hunan-case-library/index.tsx
 * - /src/prototypes/hunan-case-library/spec.md
 * - /src/components/case-library-feature-menu/index.tsx
 * - /src/components/case-library-feature-menu/spec.md
 * - /src/prototypes/case-library-ai/index.tsx
 * - /src/prototypes/case-library-ai/spec.md
 */
import '../case-library-ai/style.css';
import './style.css';
import actionAddIconSvg from '../problem-library-function-list/icons/action-add.svg?raw';
import actionExportIconSvg from '../problem-library-function-list/icons/action-export.svg?raw';
import actionFilterIconSvg from '../problem-library-function-list/icons/action-filter.svg?raw';
import actionImportIconSvg from '../problem-library-function-list/icons/action-import.svg?raw';
import actionPassIconSvg from '../problem-library-function-list/icons/pass.svg?raw';
import actionRefreshIconSvg from '../problem-library-function-list/icons/action-refresh.svg?raw';
import actionSettingsIconSvg from '../problem-library-function-list/icons/action-settings.svg?raw';
import searchIconSvg from '../problem-library-function-list/icons/search.svg?raw';
import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  Eye,
  ExternalLink,
  FileSearch,
  FileText,
  Files,
  FolderTree,
  History,
  Link2,
  LoaderCircle,
  RotateCcw,
  Search,
  Sparkles,
  SlidersHorizontal,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Info,
  X,
} from 'lucide-react';
import TopBar from '../../common/components/TopBar';
import CaseLibraryFeatureMenu from '../../components/case-library-feature-menu';
import type { AxureHandle, AxureProps, ConfigItem, EventItem, KeyDesc } from '../../common/axure-types';
import { createEventEmitter, getConfigValue } from '../../common/axure-types';

type FeatureKey = 'search' | 'entry' | 'archive' | 'analysis' | 'typical';
type PanelState = null | { title: string; kind: 'entry' | 'archive' | 'typical'; id?: string };
type OperationState = null | { kind: 'entry-confirm' | 'archive-detail' | 'analysis-detail'; id?: string };
type AnalysisStatus = 'loading' | 'complete';
type AnalysisFeedback = { vote?: 'up' | 'down'; reasons: string[]; note: string; submitted: boolean };
type SearchMode = 'case' | 'feedback';
type FeedbackSearchCategory = 'policy' | 'rule' | 'issue';

type SearchResult = {
  id: string;
  code: string;
  title: string;
  status: '已入库';
  sourceType: '日常监督形成' | '专项监督形成' | '上级下发' | '外部公开案例' | '其他来源';
  region: string;
  occurrenceTime: string;
  subjects: string[];
  entryOrg: string;
  entryPerson: string;
  description: string;
  remark: string;
  tags: string[];
  score: number;
  reason: string[];
  hits: Array<{ field: string; text: string }>;
  sourceFields: Array<{ label: string; value: string }>;
  sourceUrl?: string;
  attachments: Array<{ name: string; meta: string }>;
  typicalAssociations: Array<{ title: string; status: string; appliedAt: string }>;
};

type FeedbackSuggestionResult = {
  id: string;
  code: string;
  title: string;
  category: '政策优化' | '问题整改' | '规则设置';
  status: '待研判' | '已采纳' | '部分采纳';
  scope: string;
  generatedAt: string;
  generatedBy: string;
  summary: string;
  content: string;
  expectedEffect: string;
  applicableConditions: string;
  tags: string[];
  score: number;
  reason: string[];
  hits: Array<{ field: string; text: string }>;
  evidence: string[];
  typicalSources: Array<{ title: string; type: string; publishedAt: string }>;
};

const SEARCH_RESULTS: SearchResult[] = [
  {
    id: 'S01',
    code: 'GC202608015220',
    title: '转拨资金类应用案例——关于转拨从非本级政府财政部门取得资金的会计处理',
    status: '已入库',
    sourceType: '外部公开案例',
    region: '甘肃省',
    occurrenceTime: '2022-01-01',
    subjects: ['甲行政单位', '乙事业单位'],
    entryOrg: '甘肃省',
    entryPerson: '财会监督基础用户',
    description: '当事人：中央直属甲行政单位及下属乙事业单位。违规事实：本案为合规会计处理示例，无违规事实。甲单位收到省财政厅拨款50万元，其中10万元留用，40万元转拨乙单位。依据政府会计准则，甲单位将转拨部分通过往来科目核算，留用部分确认为非同级财政拨款收入，乙单位确认为非同级财政拨款收入。处罚结果：无行政处罚，系统范围业务操作指导。',
    remark: '-',
    tags: ['财政拨款', '事业单位', '预算管理'],
    score: 96,
    reason: ['案例描述与检索问题高度一致', '命中“非同级财政拨款”', '涉及主体和案例标签匹配'],
    hits: [
      { field: '案例标题', text: '转拨资金类应用案例——关于转拨从非本级政府财政部门取得资金的会计处理' },
      { field: '案例描述', text: '甲单位将转拨部分通过往来科目核算，留用部分确认为非同级财政拨款收入。' },
      { field: '案例标签', text: '财政拨款、事业单位、预算管理' },
    ],
    sourceFields: [
      { label: '发布机构或来源网站', value: '会计司' },
      { label: '发布时间', value: '2022-09-28 17:14:00' },
      { label: '来源说明', value: '会计司' },
    ],
    sourceUrl: 'http://kjs.mof.gov.cn/zt/zfkjzz/yyal/zbzjl/202209/t20220928_3843477.htm',
    attachments: [],
    typicalAssociations: [
      { title: '转拨资金会计处理不规范', status: '待提交', appliedAt: '2026-08-18 11:29:00' },
      { title: '某单位日常经费支出审核不严，存在不合规票据报销问题财会监督案例', status: '待提交', appliedAt: '2026-08-04 11:35:26' },
    ],
  },
  {
    id: 'S02',
    code: 'GC202608014806',
    title: '专项债券项目资金支付与工程进度不匹配整改案例',
    status: '已入库',
    sourceType: '日常监督形成',
    region: '兰州市',
    occurrenceTime: '2025-11-18',
    subjects: ['兰州市某园区建设单位'],
    entryOrg: '兰州市财政局',
    entryPerson: '监督业务用户A',
    description: '日常监督发现，项目资金支付进度明显快于实际建设进度，部分支付缺少与工程计量、监理确认相匹配的验收资料。整改中建立工程计量、监理确认、资金支付三方衔接的审核机制，并按月复核支付比例。',
    remark: '由日常监督闭环事项沉淀形成。',
    tags: ['专项债券', '资金支付', '工程进度'],
    score: 91,
    reason: ['案例描述命中资金支付问题', '案例标签包含专项债券', '涉及主体类型相近'],
    hits: [
      { field: '案例描述', text: '项目资金支付进度明显快于实际建设进度，部分支付缺少与工程计量、监理确认相匹配的验收资料。' },
      { field: '案例标签', text: '专项债券、资金支付、工程进度' },
      { field: '来源信息', text: '关联日常监督问题 WT-2026-0312。' },
    ],
    sourceFields: [{ label: '关联问题', value: 'WT-2026-0312 专项债券资金支付进度异常' }],
    attachments: [
      { name: '问题整改报告.pdf', meta: '1.8 MB · 2026-07-28上传' },
      { name: '工程进度验收记录.pdf', meta: '3.2 MB · 2026-07-28上传' },
    ],
    typicalAssociations: [],
  },
  {
    id: 'S03',
    code: 'GC202608013972',
    title: '行政事业单位资产处置收益未及时上缴整改案例',
    status: '已入库',
    sourceType: '上级下发',
    region: '张掖市',
    occurrenceTime: '2024-12-08',
    subjects: ['张掖市某事业单位'],
    entryOrg: '张掖市财政局',
    entryPerson: '案例管理用户B',
    description: '上级下发案例反映，部分行政事业单位资产处置收益未按规定及时上缴，存在账务处理和收入管理衔接不及时的问题。整改后统一资产处置收入核算口径，建立处置、收款和上缴联动台账。',
    remark: '-',
    tags: ['资产处置', '非税收入', '事业单位'],
    score: 86,
    reason: ['问题形成机制相似', '涉及主体类型匹配', '案例标签命中资产管理'],
    hits: [
      { field: '案例描述', text: '资产处置收益未按规定及时上缴，存在账务处理和收入管理衔接不及时的问题。' },
      { field: '涉及主体', text: '张掖市某事业单位' },
      { field: '来源信息', text: '甘财资函〔2026〕18号下发案例。' },
    ],
    sourceFields: [
      { label: '下发单位', value: '甘肃省财政厅资产管理处' },
      { label: '文件名称', value: '行政事业单位资产处置收益管理案例参考' },
      { label: '文件编号', value: '甘财资函〔2026〕18号' },
    ],
    attachments: [{ name: '资产处置收益整改说明.docx', meta: '860 KB · 2026-07-18上传' }],
    typicalAssociations: [],
  },
  {
    id: 'S04',
    code: 'GC202608012634',
    title: '政府采购合同履约资料闭环管理案例',
    status: '已入库',
    sourceType: '专项监督形成',
    region: '酒泉市',
    occurrenceTime: '2023-08-15',
    subjects: ['酒泉市某项目管理中心'],
    entryOrg: '酒泉市财政局',
    entryPerson: '专项监督用户C',
    description: '专项监督发现，采购合同履约验收资料不完整，付款审核主要依据供应商申请，未充分核验验收记录和合同约定。整改后建立合同、验收、付款材料清单，按项目形成闭环档案。',
    remark: '相关材料已完成补充。',
    tags: ['政府采购', '合同履约', '付款审核'],
    score: 78,
    reason: ['命中付款审核问题', '整改机制具有参考价值', '案例标签与检索主题相关'],
    hits: [
      { field: '案例描述', text: '付款审核主要依据供应商申请，未充分核验验收记录和合同约定。' },
      { field: '案例标签', text: '政府采购、合同履约、付款审核' },
      { field: '来源信息', text: '关联专项监督问题 ZX-2023-087。' },
    ],
    sourceFields: [{ label: '关联问题', value: 'ZX-2023-087 政府采购履约验收资料不完整' }],
    attachments: [
      { name: '采购合同履约验收记录.pdf', meta: '2.1 MB · 2026-06-30上传' },
      { name: '整改完成情况说明.docx', meta: '640 KB · 2026-06-30上传' },
    ],
    typicalAssociations: [],
  },
];

const FEEDBACK_SUGGESTION_RESULTS: FeedbackSuggestionResult[] = [
  {
    id: 'F01',
    code: 'FB20260801086',
    title: '完善非同级财政拨款转拨及收入确认政策口径',
    category: '政策优化',
    status: '待研判',
    scope: '行政事业单位财政资金核算',
    generatedAt: '2026-08-21 10:18',
    generatedBy: '典型案例智能提炼',
    summary: '多个典型案例反映，非同级财政拨款在转拨、留用和收入确认环节存在口径理解不一致，建议补充统一的政策解释和示例。',
    content: '建议在相关政策解释或业务指引中，明确转拨资金与本单位留用资金的核算边界，分别说明行政单位、事业单位的收入确认方式，并补充跨层级财政资金转拨的典型会计处理示例。',
    expectedEffect: '减少不同单位对非同级财政拨款核算口径的理解偏差，提高转拨资金账务处理的一致性。',
    applicableConditions: '适用于行政事业单位取得非本级财政部门拨款并发生转拨、留用或收入确认的业务场景。',
    tags: ['财政拨款', '政策口径', '会计处理'],
    score: 96,
    reason: ['建议标题命中“财政拨款政策口径”', '提炼依据包含转拨资金典型案例', '适用范围与检索事项一致'],
    hits: [
      { field: '建议标题', text: '完善非同级财政拨款转拨及收入确认政策口径' },
      { field: '建议内容', text: '明确转拨资金与本单位留用资金的核算边界，并补充跨层级财政资金转拨的典型会计处理示例。' },
      { field: '提炼依据', text: '多个典型案例反映非同级财政拨款在转拨、留用和收入确认环节存在口径理解不一致。' },
    ],
    evidence: ['典型案例中反复出现转拨资金与留用资金核算边界不清', '行政单位与事业单位收入确认口径存在差异', '现有政策缺少跨层级财政资金转拨的组合示例'],
    typicalSources: [
      { title: '转拨资金会计处理规范应用案例', type: '共性问题案例', publishedAt: '2026-08-18' },
      { title: '非同级财政拨款收入确认示范案例', type: '整改成效案例', publishedAt: '2026-08-12' },
    ],
  },
  {
    id: 'F02',
    code: 'FB20260801072',
    title: '建立专项债券资金支付与工程进度联动整改机制',
    category: '问题整改',
    status: '已采纳',
    scope: '专项债券项目单位',
    generatedAt: '2026-08-19 16:42',
    generatedBy: '典型案例智能提炼',
    summary: '典型案例显示，专项债券项目容易出现资金支付快于工程进度、验收依据不完整等问题，需要形成可复用的整改闭环。',
    content: '建议建立工程计量、监理确认、资金支付三方联动的整改机制。支付申请必须关联当期工程量、监理确认记录和合同节点，整改期间按月复核支付比例，对异常偏差形成原因说明和复核记录。',
    expectedEffect: '推动项目资金支付与实际建设进度同步，提升整改措施的可执行性和闭环程度。',
    applicableConditions: '适用于专项债券项目建设进度、合同履约和资金支付存在偏差的整改场景。',
    tags: ['专项债券', '整改闭环', '工程进度'],
    score: 92,
    reason: ['建议内容命中资金支付与工程进度', '来源典型案例具有同类整改经验', '整改机制可直接复用'],
    hits: [
      { field: '建议内容', text: '建立工程计量、监理确认、资金支付三方联动的整改机制。' },
      { field: '建议标签', text: '专项债券、整改闭环、工程进度' },
      { field: '来源典型案例', text: '专项债券项目资金支付与工程进度不匹配整改案例。' },
    ],
    evidence: ['多个典型案例出现资金支付进度快于工程进度', '有效整改措施均包含工程计量与监理确认', '按月复核支付比例有助于及时发现偏差'],
    typicalSources: [
      { title: '专项债券项目资金支付与工程进度不匹配整改案例', type: '整改成效案例', publishedAt: '2026-08-15' },
      { title: '专项债券项目建设进度动态核验案例', type: '共性问题案例', publishedAt: '2026-08-08' },
    ],
  },
  {
    id: 'F03',
    code: 'FB20260801051',
    title: '设置政府采购履约验收与付款审核前置校验规则',
    category: '规则设置',
    status: '部分采纳',
    scope: '政府采购付款审核',
    generatedAt: '2026-08-16 09:35',
    generatedBy: '典型案例智能提炼',
    summary: '典型案例集中反映采购合同、验收记录和付款材料未形成对应关系，建议将关键材料完整性转化为系统前置校验规则。',
    content: '建议设置付款审核前置规则：付款申请必须关联采购合同、履约验收记录和发票凭证；验收日期、合同节点和付款比例不一致时自动提示；关键材料缺失时禁止进入付款审核环节。',
    expectedEffect: '把典型案例中的有效管理措施转化为可执行规则，降低履约资料不完整情况下的付款风险。',
    applicableConditions: '适用于政府采购合同履约、验收和付款审核相关业务系统或人工审核清单。',
    tags: ['政府采购', '前置校验', '付款审核'],
    score: 87,
    reason: ['命中“规则设置”和付款审核', '建议来源包含履约闭环典型案例', '可转化为系统校验条件'],
    hits: [
      { field: '建议标题', text: '设置政府采购履约验收与付款审核前置校验规则' },
      { field: '建议内容', text: '关键材料缺失时禁止进入付款审核环节。' },
      { field: '提炼依据', text: '采购合同、验收记录和付款材料未形成稳定对应关系。' },
    ],
    evidence: ['履约验收材料缺失是相关典型案例的高频问题', '合同节点与付款比例不一致时风险集中暴露', '材料清单和前置校验是已验证的有效措施'],
    typicalSources: [
      { title: '政府采购合同履约资料闭环管理案例', type: '整改成效案例', publishedAt: '2026-08-10' },
      { title: '采购项目付款审核把关不严典型案例', type: '共性问题案例', publishedAt: '2026-07-29' },
    ],
  },
];

const DEEP_ANALYSIS: Record<string, {
  similarity: string;
  commonIssues: string[];
  differences: string[];
  referenceLevel: string;
  referenceAdvice: string;
  citations: string[];
}> = {
  S01: {
    similarity: '案例标题、描述和标签均指向非同级财政拨款的确认与转拨处理，涉及行政单位和事业单位之间的资金流转。',
    commonIssues: ['非同级财政拨款收入确认', '转拨资金与留用资金分别核算'],
    differences: ['该案例属于合规会计处理示例，不包含违规事实', '实际业务仍需结合资金用途和单位性质判断'],
    referenceLevel: '较高',
    referenceAdvice: '适合用于理解转拨资金和留用资金的会计处理口径，并核对相关单位的收入确认方式。',
    citations: ['案例标题', '案例描述', '案例标签'],
  },
  S02: {
    similarity: '均涉及专项债券项目资金支付与建设进度不匹配，以及工程计量和验收资料不完整。',
    commonIssues: ['资金支付与工程进度不匹配', '审核依据未形成完整链条'],
    differences: ['案例发生地区和责任主体不同', '当前检索事项仍需核实实际支付比例'],
    referenceLevel: '较高',
    referenceAdvice: '适合参考其工程计量、监理确认和资金支付三方衔接机制。',
    citations: ['案例描述', '案例标签', '关联问题'],
  },
  S03: {
    similarity: '案例涉及事业单位财务管理、收入核算和应缴资金管理，可用于对照类似资金管理问题。',
    commonIssues: ['收入管理与账务处理衔接', '应缴资金未按规定及时处理'],
    differences: ['案例来源为上级下发', '具体资金性质和适用制度不同'],
    referenceLevel: '中等',
    referenceAdvice: '可参考收入处置和联动台账机制，但不应直接复用问题定性。',
    citations: ['案例描述', '涉及主体', '来源信息'],
  },
  S04: {
    similarity: '均关注付款审核依据是否完整，以及合同、验收和付款材料之间的对应关系。',
    commonIssues: ['付款审核依据不充分', '履约验收材料未形成闭环'],
    differences: ['该案例属于政府采购场景', '涉及主体和资金来源不同'],
    referenceLevel: '中等',
    referenceAdvice: '可参考合同、验收、付款材料清单及闭环档案机制。',
    citations: ['案例描述', '案例标签', '关联问题'],
  },
  F01: {
    similarity: '检索内容指向非同级财政拨款政策口径，与该建议关注的转拨、留用和收入确认边界高度一致。',
    commonIssues: ['多个典型案例重复出现核算口径差异', '现有政策解释缺少组合业务示例'],
    differences: ['建议仍需结合现行制度条款研判', '不同单位性质对应的核算科目存在差异'],
    referenceLevel: '成熟度较高',
    referenceAdvice: '可作为补充政策解释和业务指引的候选建议，提交业务处室进一步研判。',
    citations: ['建议内容', '提炼依据', '来源典型案例'],
  },
  F02: {
    similarity: '建议直接覆盖专项债券资金支付与工程进度不匹配问题，整改机制与检索事项高度相关。',
    commonIssues: ['支付进度快于工程进度', '工程计量和监理确认材料不完整'],
    differences: ['具体复核周期需结合项目管理要求', '异常偏差阈值需由业务部门确定'],
    referenceLevel: '成熟度较高',
    referenceAdvice: '可直接用于整改方案框架，并结合具体项目补充责任人、时限和复核标准。',
    citations: ['建议内容', '预期效果', '来源典型案例'],
  },
  F03: {
    similarity: '建议将采购履约案例中的有效措施转化为付款审核前置校验规则，与规则设置类检索意图一致。',
    commonIssues: ['合同、验收和付款材料未形成对应关系', '关键材料缺失时仍进入付款审核'],
    differences: ['系统阻断条件需结合业务权限配置', '不同采购方式的材料要求可能不同'],
    referenceLevel: '成熟度中等',
    referenceAdvice: '适合进入规则配置评估，先明确适用范围和阻断条件，再形成系统规则。',
    citations: ['建议内容', '适用条件', '提炼依据'],
  },
};

const ENTRY_ROWS = [
  { id: 'E01', title: '专项债券资金绩效目标设置不完整', doc: '整改通知书', project: '2026年地方政府债务专项检查', unit: '长沙市某项目单位', quality: '待确认', time: '2026-08-08 10:32' },
  { id: 'E02', title: '政府采购合同履约资料缺失', doc: '行政处理决定书', project: '2026年政府采购监督检查', unit: '湖南省某事业单位', quality: '待补充', time: '2026-08-08 09:16' },
  { id: 'E03', title: '财政暂付款长期挂账未及时清理', doc: '整改通知书', project: '2025年度预算执行检查', unit: '衡阳市某市直单位', quality: '待确认', time: '2026-08-07 16:48' },
  { id: 'E04', title: '惠民补贴重复发放问题', doc: '检查结论书', project: '惠民惠农补贴专项检查', unit: '常德市某县财政局', quality: '待确认', time: '2026-08-07 14:20' },
];

const ARCHIVE_ROWS = [
  { id: 'C01', code: '湘财监案〔2026〕018号', title: '专项债券绩效目标设置不完整案例', year: '2026', project: '地方政府债务专项检查', unit: '长沙市某项目单位', tags: ['专项债券', '绩效目标'], docs: 4 },
  { id: 'C02', code: '湘财监案〔2026〕015号', title: '政府采购履约资料缺失整改案例', year: '2026', project: '政府采购监督检查', unit: '湖南省某事业单位', tags: ['政府采购', '履约管理'], docs: 6 },
  { id: 'C03', code: '湘财监案〔2025〕126号', title: '财政暂付款压降清理案例', year: '2025', project: '预算执行检查', unit: '衡阳市某市直单位', tags: ['暂付款', '预算执行'], docs: 5 },
  { id: 'C04', code: '湘财监案〔2025〕098号', title: '惠民补贴重复发放整改案例', year: '2025', project: '惠民惠农补贴专项检查', unit: '常德市某县财政局', tags: ['惠民补贴', '重复发放'], docs: 7 },
];

const CLUSTERS = [
  { name: '预算绩效目标编制不规范', count: 38, feature: '目标不完整、指标不可衡量', sources: '专项监督 63%', status: '已确认' },
  { name: '政府采购履约资料管理不完整', count: 27, feature: '验收资料、付款依据缺失', sources: '日常监督 52%', status: '待确认' },
  { name: '财政往来款长期挂账', count: 21, feature: '清理计划缺失、责任不明确', sources: '审计移送 43%', status: '已确认' },
  { name: '惠民补贴重复或超范围发放', count: 16, feature: '人员信息重复、资格复核不足', sources: '日常监督 69%', status: '待确认' },
];

const RECTIFY_PATTERNS = [
  { name: '补充绩效目标及指标审核机制', scene: '预算绩效管理', count: 22, effect: '适用度高' },
  { name: '建立采购履约资料清单与付款校验', scene: '政府采购', count: 18, effect: '适用度高' },
  { name: '制定往来款分年度压降计划', scene: '预算执行', count: 15, effect: '适用度中' },
  { name: '开展补贴对象交叉比对和资格复核', scene: '民生资金', count: 13, effect: '适用度高' },
];

const TYPICAL_ROWS = [
  { id: 'T01', title: '专项债券绩效目标全过程规范管理案例', type: '共性问题案例', related: 12, representative: '高', status: '典型候选', updated: '2026-08-08' },
  { id: 'T02', title: '政府采购履约资料闭环管理案例', type: '整改成效案例', related: 8, representative: '高', status: '待发布', updated: '2026-08-07' },
  { id: 'T03', title: '财政暂付款分年度压降清理案例', type: '整改成效案例', related: 6, representative: '中', status: '已发布', updated: '2026-08-05' },
  { id: 'T04', title: '惠民补贴重复发放追责问责案例', type: '问责类案例', related: 5, representative: '高', status: '典型候选', updated: '2026-08-03' },
];

const EVENT_LIST: EventItem[] = [{ name: 'onNavigate', desc: '页面内导航', payload: 'string' }];
const VAR_LIST: KeyDesc[] = [
  { name: 'feature_key', desc: '当前甘肃案例库功能 key' },
  { name: 'feature_name', desc: '当前甘肃案例库功能名称' },
];
const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '系统标题', initialValue: '财会监督系统' },
  { type: 'input', attributeId: 'topic_name', displayName: '页面主题', initialValue: '甘肃案例库' },
];

function normalizeSvg(svg: string) {
  return svg
    .replace(/<\?xml[^>]*>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '')
    .replace(/\s(width|height)="[^"]*"/g, '')
    .replace(/\sfill="[^"]*"/g, ' fill="currentColor"')
    .replace(/<svg\b([^>]*)>/, '<svg$1 aria-hidden="true" focusable="false">');
}

function RawIcon({ svg }: { svg: string }) {
  const html = useMemo(() => normalizeSvg(svg), [svg]);
  return <span className="ufsp-iconfont-box" dangerouslySetInnerHTML={{ __html: html }} />;
}

function SearchTools({ onNotice }: { onNotice: (message: string) => void }) {
  return (
    <div className="case-toolbar-right">
      <label className="ufsp-search-box ufsp-filter-input">
        <input placeholder="请输入" aria-label="请输入查询内容" />
      </label>
      <button type="button" className="ufsp-icon-btn ufsp-icon-btn-primary" title="查询" onClick={() => onNotice('已按当前条件查询演示数据')}><RawIcon svg={searchIconSvg} /></button>
      <button type="button" className="ufsp-icon-btn ufsp-icon-btn-secondary" title="刷新" onClick={() => onNotice('演示数据已刷新')}><RawIcon svg={actionRefreshIconSvg} /></button>
      <button type="button" className="ufsp-icon-btn ufsp-icon-btn-secondary" title="筛选" onClick={() => onNotice('已展开高级筛选演示')}><RawIcon svg={actionFilterIconSvg} /></button>
      <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已打开查询方案演示')}>查询方案</button>
      <button type="button" className="ufsp-icon-btn ufsp-icon-btn-secondary" title="列设置" onClick={() => onNotice('已打开列设置演示')}><RawIcon svg={actionSettingsIconSvg} /></button>
    </div>
  );
}

function Pagination({ total }: { total: number }) {
  return (
    <div className="case-pagination">
      <span className="ufsp-page-total">共 {total} 条</span>
      <button type="button" className="ufsp-page-btn">上一页</button>
      <button type="button" className="ufsp-page-btn is-active">1</button>
      <button type="button" className="ufsp-page-btn">下一页</button>
      <button type="button" className="ufsp-page-size">20 条/页</button>
    </div>
  );
}

function Catalog({ mode }: { mode: 'entry' | 'archive' }) {
  const groups = mode === 'entry'
    ? ['2026年度（12）', 'OA文书导入（7）', '日常监督形成（3）', '专项监督形成（2）']
    : ['2026年度（36）', '地方政府债务专项检查（12）', '政府采购监督检查（9）', '2025年度（84）', '预算执行检查（21）'];
  return (
    <aside className="hn-catalog">
      <div className="hn-catalog-search"><Search size={14} /><input placeholder="搜索目录" /></div>
      <div className="hn-catalog-list">
        {groups.map((item, index) => (
          <button type="button" key={item} className={index === 0 ? 'is-active' : index > 0 && item.includes('检查') ? 'is-child' : ''}>
            {index === 0 ? <FolderTree size={15} /> : <Files size={15} />}
            <span>{item}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function SearchBox({ value, onChange, onSearch, mode, compact = false, feedbackCategory, onFeedbackCategoryChange }: { value: string; onChange: (value: string) => void; onSearch: () => void; mode: SearchMode; compact?: boolean; feedbackCategory?: FeedbackSearchCategory; onFeedbackCategoryChange?: (category: FeedbackSearchCategory) => void }) {
  const feedbackMode = mode === 'feedback';
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryOptions: Array<{ value: FeedbackSearchCategory; label: string }> = [
    { value: 'policy', label: '政策建议' },
    { value: 'rule', label: '规则建议' },
    { value: 'issue', label: '问题整改' },
  ];
  const categoryLabel = categoryOptions.find((item) => item.value === feedbackCategory)?.label || '政策建议';
  return (
    <div className={`hn-case-search-box ${compact ? 'is-compact' : ''} ${feedbackMode && !compact ? 'has-feedback-select' : ''}`}>
      {feedbackMode && !compact ? <div className="hn-feedback-search-select" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCategoryOpen(false); }}>
        <button type="button" className="hn-feedback-search-trigger" aria-label="选择反哺建议类型" aria-haspopup="listbox" aria-expanded={categoryOpen} onClick={() => setCategoryOpen((open) => !open)}><span>{categoryLabel}</span><ChevronDown size={14} /></button>
        {categoryOpen ? <div className="hn-feedback-search-menu" role="listbox" aria-label="反哺建议类型">{categoryOptions.map((item) => <button type="button" role="option" aria-selected={feedbackCategory === item.value} key={item.value} className={feedbackCategory === item.value ? 'is-active' : ''} onClick={() => { onFeedbackCategoryChange?.(item.value); setCategoryOpen(false); }}>{item.label}{feedbackCategory === item.value ? <CheckCircle2 size={14} /> : null}</button>)}</div> : null}
      </div> : null}
      <Search size={compact ? 17 : 20} />
      <input value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSearch(); }} placeholder={feedbackMode ? '请输入建议标题、典型案例、政策、整改或规则关键词' : '请输入案例编号、标题、涉及主体、标签，或描述需要查找的问题'} aria-label={feedbackMode ? '反哺建议检索内容' : '案例检索内容'} />
      <button type="button" onClick={onSearch}>检索</button>
    </div>
  );
}

function SearchHome({ query, onQueryChange, onSearch, onNotice, mode, feedbackCategory, onFeedbackCategoryChange }: { query: string; onQueryChange: (value: string) => void; onSearch: () => void; onNotice: (message: string) => void; mode: SearchMode; feedbackCategory: FeedbackSearchCategory; onFeedbackCategoryChange: (category: FeedbackSearchCategory) => void }) {
  const feedbackMode = mode === 'feedback';
  const examples = feedbackMode
    ? feedbackCategory === 'policy'
      ? ['完善财政拨款政策口径', '从典型案例提炼资产管理政策建议']
      : feedbackCategory === 'rule'
        ? ['政府采购付款前置校验规则', '设置资产处置收益上缴校验规则']
        : ['专项债券项目如何形成整改闭环', '采购履约资料缺失如何整改']
    : ['非同级财政拨款如何确认收入', '专项债券资金支付与工程进度不匹配', '政府采购履约验收资料缺失', '事业单位资产处置收益未及时上缴'];
  const recentSearches = feedbackMode
    ? ['财政拨款政策优化', '专项债券整改机制', '采购付款校验规则', '资产处置收益管理建议']
    : ['转拨资金会计处理', 'GC202608015220', '采购合同履约验收资料', '事业单位资产处置收益'];
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <div className="case-workspace hn-search-home">
      <div className="hn-search-hero">
        <div className="hn-search-heading"><strong>{feedbackMode ? '反哺建议检索' : '案例智能检索'}</strong></div>
        <SearchBox value={query} onChange={onQueryChange} onSearch={onSearch} mode={mode} feedbackCategory={feedbackCategory} onFeedbackCategoryChange={onFeedbackCategoryChange} />
        <div className="hn-search-assist">
          <div className="hn-search-examples"><b><Sparkles size={13} />试试这样搜</b><div>{examples.map((item) => <button type="button" key={item} onClick={() => { onQueryChange(item); window.setTimeout(onSearch, 0); }}>{item}</button>)}</div></div>
          <div className={`hn-search-help ${helpOpen ? 'is-open' : ''}`}><button type="button" aria-label="检索说明" title="检索说明" aria-expanded={helpOpen} onClick={() => setHelpOpen((value) => !value)}><Info size={15} /></button>{helpOpen ? <p><CircleAlert size={14} /><span>{feedbackMode ? '支持按建议标题、内容、类型、标签和来源典型案例检索；建议由典型案例智能提炼形成。' : '支持案例编号、标题、描述、涉及主体和标签等字段检索，也支持使用自然语言描述事项；结果来自已入库一般案例。'}</span></p> : null}</div>
        </div>
      </div>
      <div className="hn-search-home-grid">
        <section><div className="hn-search-block-title"><History size={16} /><strong>最近检索</strong><button type="button" onClick={() => onNotice('已清空最近检索演示记录')}>清空</button></div><div className="hn-recent-searches">{recentSearches.map((item) => <button type="button" key={item} onClick={() => { onQueryChange(item); window.setTimeout(onSearch, 0); }}><Search size={14} /><span>{item}</span><em>再次检索</em></button>)}</div></section>
        <section><div className="hn-search-block-title"><SlidersHorizontal size={16} /><strong>可检索范围</strong><span>{feedbackMode ? '典型案例智能提炼' : '已入库案例'}</span></div>{feedbackMode ? <div className="hn-search-scope"><div><strong>326</strong><span>反哺建议</span></div><div><strong>184</strong><span>来源典型案例</span></div><div><strong>3 类</strong><span>反哺方向</span></div><p>基于典型案例智能提炼，覆盖政策优化、问题整改和规则设置三类反哺建议。</p></div> : <div className="hn-search-scope"><div><strong>12,680</strong><span>一般案例</span></div><div><strong>2021—2026</strong><span>发生时间范围</span></div><div><strong>5 类</strong><span>来源类型</span></div><p>覆盖日常监督形成、专项监督形成、上级下发、外部公开案例和其他来源。</p></div>}</section>
      </div>
    </div>
  );
}

function MetadataMultiSelect({ label, value, options, open, onToggle, onChange }: { label: string; value: string[]; options: string[]; open: boolean; onToggle: () => void; onChange: (value: string[]) => void }) {
  const [searchValue, setSearchValue] = useState('');
  const filteredOptions = options.filter((option) => option.includes(searchValue.trim()));
  const displayValue = value.length === 0 ? `全部${label}` : value.length <= 2 ? value.join('、') : `${value.slice(0, 2).join('、')}等 ${value.length} 项`;
  return (
    <div className={`hn-filter-field hn-metadata-multi ${open ? 'is-open' : ''}`}>
      <span>{label}</span>
      <button type="button" className="hn-multi-trigger" aria-expanded={open} onClick={() => { if (!open) setSearchValue(''); onToggle(); }}><span>{displayValue}</span><ChevronDown size={14} /></button>
      {open ? <div className="hn-multi-menu">
        <div className="hn-multi-search"><Search size={13} /><input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder={`搜索${label}`} aria-label={`搜索${label}`} /></div>
        <div className="hn-multi-options">{filteredOptions.length ? filteredOptions.map((option) => { const selected = value.includes(option); return <button type="button" key={option} className={selected ? 'is-selected' : ''} aria-pressed={selected} onClick={() => onChange(selected ? value.filter((item) => item !== option) : [...value, option])}><span className="hn-multi-check" aria-hidden="true" /><span>{option}</span></button>; }) : <span className="hn-multi-empty">未找到匹配选项</span>}</div>
        {value.length ? <button type="button" className="hn-multi-clear" onClick={() => onChange([])}>清除已选</button> : null}
      </div> : null}
    </div>
  );
}

function SearchFilters({ onNotice, onCollapse }: { onNotice: (message: string) => void; onCollapse: () => void }) {
  const [sourceType, setSourceType] = useState('全部来源');
  const [region, setRegion] = useState('全部地区');
  const [occurrenceYear, setOccurrenceYear] = useState('全部时间');
  const [tags, setTags] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [caseNo, setCaseNo] = useState('');
  const [entryOrg, setEntryOrg] = useState('');
  const [sourceKeyword, setSourceKeyword] = useState('');
  const [publishYear, setPublishYear] = useState('全部发布时间');
  const [openMulti, setOpenMulti] = useState<'tag' | null>(null);
  const advancedCount = Number(Boolean(caseNo.trim())) + Number(Boolean(entryOrg.trim())) + Number(Boolean(sourceKeyword.trim())) + Number(publishYear !== '全部发布时间');
  const sourceSpecific = sourceType === '外部公开案例'
    ? { label: '发布机构或来源网站', placeholder: '输入发布机构或网站名称' }
    : sourceType === '上级下发'
      ? { label: '下发文件', placeholder: '输入下发单位、文件名称或编号' }
      : sourceType === '日常监督形成' || sourceType === '专项监督形成'
        ? { label: '关联问题', placeholder: '输入问题编号或标题' }
        : sourceType === '其他来源'
          ? { label: '来源名称', placeholder: '输入来源名称' }
          : null;

  const resetFilters = () => {
    setSourceType('全部来源');
    setRegion('全部地区');
    setOccurrenceYear('全部时间');
    setTags([]);
    setSubject('');
    setCaseNo('');
    setEntryOrg('');
    setSourceKeyword('');
    setPublishYear('全部发布时间');
    setMoreOpen(false);
    setOpenMulti(null);
    onNotice('筛选条件已重置');
  };

  return (
    <aside className="hn-search-filters">
      <div className="hn-filter-head"><strong>筛选条件</strong><div><button type="button" onClick={resetFilters}>重置</button><button type="button" className="hn-filter-collapse" aria-label="收起筛选条件" title="收起筛选条件" onClick={onCollapse}><ChevronLeft size={15} /></button></div></div>
      <label><span>来源类型</span><span className="hn-select-control"><select value={sourceType} onChange={(event) => { setSourceType(event.target.value); setSourceKeyword(''); setPublishYear('全部发布时间'); }}><option>全部来源</option><option>日常监督形成</option><option>专项监督形成</option><option>上级下发</option><option>外部公开案例</option><option>其他来源</option></select><ChevronDown size={14} /></span></label>
      <label><span>所属地区</span><span className="hn-select-control"><select value={region} onChange={(event) => setRegion(event.target.value)}><option>全部地区</option><option>甘肃省</option><option>兰州市</option><option>张掖市</option><option>酒泉市</option><option>金昌市</option></select><ChevronDown size={14} /></span></label>
      <label><span>发生时间</span><span className="hn-select-control"><select value={occurrenceYear} onChange={(event) => setOccurrenceYear(event.target.value)}><option>全部时间</option><option>2026年</option><option>2025年</option><option>2024年</option><option>2023年</option><option>2022年</option></select><ChevronDown size={14} /></span></label>
      <MetadataMultiSelect label="案例标签" value={tags} options={['财政拨款', '事业单位', '预算管理', '专项债券', '资金支付', '工程进度', '资产处置', '非税收入', '政府采购', '合同履约', '付款审核']} open={openMulti === 'tag'} onToggle={() => setOpenMulti((current) => current === 'tag' ? null : 'tag')} onChange={setTags} />
      <label><span>涉及主体</span><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="输入单位或主体名称" /></label>
      <button type="button" className={`hn-more-filter-toggle ${moreOpen ? 'is-open' : ''}`} aria-expanded={moreOpen} onClick={() => { setMoreOpen((value) => !value); setOpenMulti(null); }}><span>更多筛选{advancedCount ? <em>{advancedCount}</em> : null}</span><ChevronDown size={14} /></button>
      {moreOpen ? <div className="hn-advanced-filters">
        <label><span>案例编号</span><input value={caseNo} onChange={(event) => setCaseNo(event.target.value)} placeholder="输入完整或部分案例编号" /></label>
        <label><span>录入机构</span><input value={entryOrg} onChange={(event) => setEntryOrg(event.target.value)} placeholder="输入录入机构名称" /></label>
        {sourceSpecific ? <label><span>{sourceSpecific.label}</span><input value={sourceKeyword} onChange={(event) => setSourceKeyword(event.target.value)} placeholder={sourceSpecific.placeholder} /></label> : null}
        {sourceType === '外部公开案例' ? <label><span>发布时间</span><span className="hn-select-control"><select value={publishYear} onChange={(event) => setPublishYear(event.target.value)}><option>全部发布时间</option><option>2026年</option><option>2025年</option><option>2024年</option><option>2023年</option><option>2022年</option></select><ChevronDown size={14} /></span></label> : null}
      </div> : null}
      <button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => onNotice('检索结果已按当前条件筛选')}>应用筛选</button>
      <div className="hn-filter-help"><CircleAlert size={14} /><span>默认检索已入库一般案例；来源专属条件会随来源类型联动展示。</span></div>
    </aside>
  );
}

function FeedbackSuggestionFilters({ onNotice, onCollapse, category, onCategoryChange }: { onNotice: (message: string) => void; onCollapse: () => void; category: FeedbackSearchCategory; onCategoryChange: (category: FeedbackSearchCategory) => void }) {
  const [scope, setScope] = useState('全部范围');
  const [generatedYear, setGeneratedYear] = useState('全部时间');
  const [status, setStatus] = useState('全部状态');
  const [tags, setTags] = useState<string[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [code, setCode] = useState('');
  const [typicalCase, setTypicalCase] = useState('');
  const [generatedBy, setGeneratedBy] = useState('');
  const [openMulti, setOpenMulti] = useState<'tag' | null>(null);
  const advancedCount = Number(Boolean(code.trim())) + Number(Boolean(typicalCase.trim())) + Number(Boolean(generatedBy.trim()));

  const resetFilters = () => {
    onCategoryChange('policy');
    setScope('全部范围');
    setGeneratedYear('全部时间');
    setStatus('全部状态');
    setTags([]);
    setCode('');
    setTypicalCase('');
    setGeneratedBy('');
    setMoreOpen(false);
    setOpenMulti(null);
    onNotice('筛选条件已重置');
  };

  return (
    <aside className="hn-search-filters">
      <div className="hn-filter-head"><strong>筛选条件</strong><div><button type="button" onClick={resetFilters}>重置</button><button type="button" className="hn-filter-collapse" aria-label="收起筛选条件" title="收起筛选条件" onClick={onCollapse}><ChevronLeft size={15} /></button></div></div>
      <label><span>建议类型</span><span className="hn-select-control"><select value={category} onChange={(event) => onCategoryChange(event.target.value as FeedbackSearchCategory)}><option value="policy">政策</option><option value="rule">规则</option><option value="issue">问题整改</option></select><ChevronDown size={14} /></span></label>
      <label><span>适用范围</span><span className="hn-select-control"><select value={scope} onChange={(event) => setScope(event.target.value)}><option>全部范围</option><option>财政资金核算</option><option>专项债券项目</option><option>政府采购管理</option><option>行政事业资产管理</option></select><ChevronDown size={14} /></span></label>
      <label><span>提炼时间</span><span className="hn-select-control"><select value={generatedYear} onChange={(event) => setGeneratedYear(event.target.value)}><option>全部时间</option><option>2026年</option><option>2025年</option><option>2024年</option></select><ChevronDown size={14} /></span></label>
      <label><span>采纳状态</span><span className="hn-select-control"><select value={status} onChange={(event) => setStatus(event.target.value)}><option>全部状态</option><option>待研判</option><option>已采纳</option><option>部分采纳</option></select><ChevronDown size={14} /></span></label>
      <MetadataMultiSelect label="建议标签" value={tags} options={['政策口径', '财政拨款', '问题整改', '整改闭环', '专项债券', '规则设置', '前置校验', '政府采购', '资产管理']} open={openMulti === 'tag'} onToggle={() => setOpenMulti((current) => current === 'tag' ? null : 'tag')} onChange={setTags} />
      <button type="button" className={`hn-more-filter-toggle ${moreOpen ? 'is-open' : ''}`} aria-expanded={moreOpen} onClick={() => { setMoreOpen((value) => !value); setOpenMulti(null); }}><span>更多筛选{advancedCount ? <em>{advancedCount}</em> : null}</span><ChevronDown size={14} /></button>
      {moreOpen ? <div className="hn-advanced-filters">
        <label><span>建议编号</span><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="输入完整或部分建议编号" /></label>
        <label><span>来源典型案例</span><input value={typicalCase} onChange={(event) => setTypicalCase(event.target.value)} placeholder="输入典型案例标题" /></label>
        <label><span>提炼方式</span><input value={generatedBy} onChange={(event) => setGeneratedBy(event.target.value)} placeholder="输入提炼方式" /></label>
      </div> : null}
      <button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => onNotice('反哺建议已按当前条件筛选')}>应用筛选</button>
      <div className="hn-filter-help"><CircleAlert size={14} /><span>检索范围为典型案例智能提炼形成的反哺建议。</span></div>
    </aside>
  );
}

function DeepAnalysisPanel({
  itemId,
  mode,
  status,
  feedback,
  onRerun,
  onFeedbackChange,
  onSubmit,
  onNotice,
}: {
  itemId: string;
  mode: SearchMode;
  status: AnalysisStatus;
  feedback: AnalysisFeedback;
  onRerun: () => void;
  onFeedbackChange: (patch: Partial<AnalysisFeedback>) => void;
  onSubmit: () => void;
  onNotice: (message: string) => void;
}) {
  const analysis = DEEP_ANALYSIS[itemId];
  const feedbackMode = mode === 'feedback';
  const negativeReasons = feedbackMode
    ? ['匹配原因不准确', '提炼依据有遗漏', '适用边界不合理', '建议不可执行']
    : ['相似原因不准确', '共同问题有遗漏', '差异判断不合理', '参考建议不可用'];
  const canSubmit = feedback.vote === 'up' || (feedback.vote === 'down' && (feedback.reasons.length > 0 || feedback.note.trim().length > 0));

  if (status === 'loading') {
    return (
      <section className="hn-inline-analysis is-loading" aria-live="polite" aria-label={feedbackMode ? '建议解读生成中' : '深度分析生成中'}>
        <div className="hn-analysis-loading-copy"><LoaderCircle size={17} /><div><strong>{feedbackMode ? '正在生成建议解读' : '正在生成深度分析'}</strong><span>{feedbackMode ? '结合建议内容、提炼依据和来源典型案例，判断适用性与成熟度' : '结合候选案例标准字段，对共同问题、关键差异和参考价值进行判断'}</span></div></div>
        <div className="hn-analysis-skeleton" aria-hidden="true"><i /><i /><i /></div>
      </section>
    );
  }

  return (
    <section className="hn-inline-analysis" aria-live="polite">
      <div className="hn-inline-analysis-head">
        <div><Sparkles size={15} /><strong>{feedbackMode ? 'AI 建议解读' : 'AI 深度分析'}</strong><span>{feedbackMode ? '基于本次检索与反哺建议生成' : '基于本次检索与案例信息生成'}</span></div>
        <button type="button" onClick={onRerun}><RotateCcw size={13} />{feedbackMode ? '重新解读' : '重新分析'}</button>
      </div>
      <div className="hn-analysis-dimensions">
        <div><span>{feedbackMode ? '为什么匹配' : '为什么相似'}</span><p>{analysis.similarity}</p></div>
        <div><span>{feedbackMode ? '提炼共性' : '共同问题'}</span><ul>{analysis.commonIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>
        <div><span>{feedbackMode ? '适用边界' : '关键差异'}</span><ul>{analysis.differences.map((difference) => <li key={difference}>{difference}</li>)}</ul></div>
      </div>
      <div className="hn-reference-verdict">
        <div><span>{feedbackMode ? '建议成熟度' : '是否值得参考'}</span><strong>{analysis.referenceLevel}</strong></div>
        <p>{analysis.referenceAdvice}</p>
      </div>
      <div className="hn-analysis-citations"><span>分析依据</span>{analysis.citations.map((citation) => <button type="button" key={citation} onClick={() => onNotice(`已定位至${citation}`)}>{citation}</button>)}</div>
      <div className="hn-analysis-feedback">
        <div className="hn-feedback-question"><span>{feedbackMode ? '这份建议解读有帮助吗？' : '这份分析有帮助吗？'}</span><div><button type="button" className={feedback.vote === 'up' ? 'is-active' : ''} aria-label={feedbackMode ? '建议解读有帮助' : '分析有帮助'} aria-pressed={feedback.vote === 'up'} onClick={() => onFeedbackChange({ vote: 'up', reasons: [], submitted: false })}><ThumbsUp size={14} /></button><button type="button" className={feedback.vote === 'down' ? 'is-active' : ''} aria-label={feedbackMode ? '建议解读没有帮助' : '分析没有帮助'} aria-pressed={feedback.vote === 'down'} onClick={() => onFeedbackChange({ vote: 'down', submitted: false })}><ThumbsDown size={14} /></button></div></div>
        {feedback.vote ? <div className="hn-feedback-form">
          {feedback.vote === 'down' ? <div className="hn-feedback-reasons">{negativeReasons.map((reason) => { const active = feedback.reasons.includes(reason); return <button type="button" key={reason} className={active ? 'is-active' : ''} aria-pressed={active} onClick={() => onFeedbackChange({ reasons: active ? feedback.reasons.filter((item) => item !== reason) : [...feedback.reasons, reason], submitted: false })}>{reason}</button>; })}</div> : null}
          <textarea value={feedback.note} maxLength={200} placeholder={feedback.vote === 'up' ? '可补充哪些内容对你最有帮助（选填）' : '请补充需要修正的内容（选填）'} onChange={(event) => onFeedbackChange({ note: event.target.value, submitted: false })} />
          <div><span>{feedback.submitted ? '反馈已提交，可继续修改' : '反馈将用于优化后续分析结果'}</span><button type="button" className="ufsp-btn ufsp-btn-primary" disabled={!canSubmit} onClick={onSubmit}>提交反馈</button></div>
        </div> : null}
      </div>
    </section>
  );
}

function SearchResultsPage({ query, onQueryChange, onSearch, onOpenDetail, onBack, onNotice, mode, feedbackCategory, onFeedbackCategoryChange }: { query: string; onQueryChange: (value: string) => void; onSearch: () => void; onOpenDetail: (id: string) => void; onBack: () => void; onNotice: (message: string) => void; mode: SearchMode; feedbackCategory: FeedbackSearchCategory; onFeedbackCategoryChange: (category: FeedbackSearchCategory) => void }) {
  const feedbackMode = mode === 'feedback';
  const [sort, setSort] = useState('相关度优先');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);
  const [analysisStatusById, setAnalysisStatusById] = useState<Record<string, AnalysisStatus>>({});
  const [feedbackById, setFeedbackById] = useState<Record<string, AnalysisFeedback>>({});

  const runDeepAnalysis = (id: string) => {
    setExpandedAnalysisId(id);
    setAnalysisStatusById((current) => ({ ...current, [id]: 'loading' }));
    window.setTimeout(() => setAnalysisStatusById((current) => ({ ...current, [id]: 'complete' })), 900);
  };

  const toggleDeepAnalysis = (id: string) => {
    const status = analysisStatusById[id];
    if (expandedAnalysisId === id && status === 'complete') {
      setExpandedAnalysisId(null);
      return;
    }
    if (status) {
      setExpandedAnalysisId(id);
      return;
    }
    runDeepAnalysis(id);
  };

  const updateFeedback = (id: string, patch: Partial<AnalysisFeedback>) => {
    setFeedbackById((current) => ({
      ...current,
      [id]: { vote: undefined, reasons: [], note: '', submitted: false, ...current[id], ...patch },
    }));
  };

  const rerunSearch = () => {
    setExpandedAnalysisId(null);
    setAnalysisStatusById({});
    setFeedbackById({});
    onSearch();
  };

  const selectedFeedbackCategory: FeedbackSuggestionResult['category'] = feedbackCategory === 'policy'
    ? '政策优化'
    : feedbackCategory === 'rule'
      ? '规则设置'
      : '问题整改';
  const filteredFeedbackResults = FEEDBACK_SUGGESTION_RESULTS.filter((item) => item.category === selectedFeedbackCategory);
  const feedbackTotalMap: Record<FeedbackSearchCategory, number> = { policy: 102, rule: 96, issue: 128 };
  const displayResults = feedbackMode
    ? filteredFeedbackResults.map((item) => ({
      id: item.id,
      code: item.code,
      title: item.title,
      score: item.score,
      tags: item.tags,
      reason: item.reason,
      hits: item.hits,
      meta: [`建议编号：${item.code}`, `建议类型：${item.category}`, `适用范围：${item.scope}`, `提炼时间：${item.generatedAt}`, `采纳状态：${item.status}`, `来源典型案例：${item.typicalSources.length}个`],
    }))
    : SEARCH_RESULTS.map((item) => ({
      id: item.id,
      code: item.code,
      title: item.title,
      score: item.score,
      tags: item.tags,
      reason: item.reason,
      hits: item.hits,
      meta: [`案例编号：${item.code}`, `来源类型：${item.sourceType}`, `所属地区：${item.region}`, `发生时间：${item.occurrenceTime}`, `涉及主体：${item.subjects.join('；')}`],
    }));

  return (
    <div className="case-workspace hn-search-results-page">
      <div className={`hn-search-results-layout ${filtersOpen ? '' : 'is-filter-collapsed'}`}>
        {filtersOpen ? feedbackMode ? <FeedbackSuggestionFilters onNotice={onNotice} onCollapse={() => setFiltersOpen(false)} category={feedbackCategory} onCategoryChange={onFeedbackCategoryChange} /> : <SearchFilters onNotice={onNotice} onCollapse={() => setFiltersOpen(false)} /> : <button type="button" className="hn-filter-rail" aria-label="展开筛选条件" title="展开筛选条件" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={17} /><ChevronRight size={14} /></button>}
        <section className="hn-search-result-main">
          <div className="hn-result-command"><button type="button" className="ufsp-form-back" onClick={onBack} aria-label="返回检索首页" title="返回检索首页"><ArrowLeft size={16} /></button><SearchBox compact value={query} onChange={onQueryChange} onSearch={rerunSearch} mode={mode} /><div className="hn-result-tools"><span className="hn-result-count"><strong>{feedbackMode ? feedbackTotalMap[feedbackCategory] : '36'}</strong><span>{feedbackMode ? '条反哺建议' : '条相关案例'}</span></span><i aria-hidden="true" /><label><span className="hn-select-control"><select aria-label="结果排序" value={sort} onChange={(event) => setSort(event.target.value)}><option>相关度优先</option><option>{feedbackMode ? '提炼时间最新' : '发生时间最新'}</option><option>{feedbackMode ? '提炼时间最早' : '发生时间最早'}</option></select><ChevronDown size={14} /></span></label></div></div>
          <div className="hn-result-ledger">
          <div className="hn-search-result-list">{displayResults.map((item, index) => {
            const analysisStatus = analysisStatusById[item.id];
            const analysisExpanded = expandedAnalysisId === item.id;
            const feedback = feedbackById[item.id] || { reasons: [], note: '', submitted: false };
            return <article key={item.id} className={analysisExpanded ? 'is-analysis-expanded' : ''}>
              <div className="hn-result-rank"><strong>{index + 1}</strong><span>{item.score}%</span><em>相关度</em></div>
              <div className="hn-result-content">
                <div className="hn-result-title-row"><button type="button" className="hn-result-title" onClick={() => onOpenDetail(item.id)}>{item.title}</button><div className="hn-result-actions"><button type="button" className={`hn-deep-analysis-trigger ${analysisExpanded ? 'is-active' : ''}`} disabled={analysisExpanded && analysisStatus === 'loading'} onClick={() => toggleDeepAnalysis(item.id)}>{analysisExpanded && analysisStatus === 'loading' ? <LoaderCircle size={13} /> : <Sparkles size={13} />}{analysisExpanded && analysisStatus === 'loading' ? (feedbackMode ? '解读中' : '分析中') : analysisStatus === 'complete' ? analysisExpanded ? (feedbackMode ? '收起解读' : '收起分析') : (feedbackMode ? '查看解读' : '查看分析') : (feedbackMode ? '建议解读' : '深度分析')}</button><button type="button" className="hn-result-detail" onClick={() => onOpenDetail(item.id)}>查看详情</button></div></div>
                <div className="hn-result-meta">{item.meta.map((meta) => <span key={meta}>{meta}</span>)}</div>
                <div className="hn-result-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                <p><b>{item.hits[0].field}命中：</b>{item.hits[0].text}</p>
                <div className="hn-match-reasons"><b>检索依据</b>{item.reason.map((reason) => <span key={reason}><CheckCircle2 size={12} />{reason}</span>)}</div>
                {analysisExpanded && analysisStatus ? <DeepAnalysisPanel itemId={item.id} mode={mode} status={analysisStatus} feedback={feedback} onRerun={() => runDeepAnalysis(item.id)} onFeedbackChange={(patch) => updateFeedback(item.id, patch)} onSubmit={() => { updateFeedback(item.id, { submitted: true }); onNotice(feedbackMode ? '建议解读反馈已提交' : '深度分析反馈已提交'); }} onNotice={onNotice} /> : null}
              </div>
            </article>;
          })}</div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeedbackSuggestionDetailPage({ id, query, onBack, onOpenDetail }: { id?: string; query: string; onBack: () => void; onOpenDetail: (id: string) => void }) {
  const item = FEEDBACK_SUGGESTION_RESULTS.find((row) => row.id === id) || FEEDBACK_SUGGESTION_RESULTS[0];
  const [section, setSection] = useState<'match' | 'detail' | 'source'>('match');
  return (
    <div className="case-workspace hn-search-detail-page">
      <OperationHead title="反哺建议详情" subtitle="" onBack={onBack} actions={null} />
      <div className="hn-operation-body hn-search-detail-body">
        <section className="hn-search-detail-summary"><div className="hn-detail-score"><strong>{item.score}%</strong><span>检索相关度</span></div><div className="hn-detail-main-info"><h2>{item.title}</h2><p><span>{item.code}</span><span>{item.category}</span><span>{item.scope}</span><span>{item.generatedAt}</span><span>{item.status}</span></p></div><div className="hn-detail-query"><span>本次检索</span><strong>{query || '完善财政拨款政策口径'}</strong></div></section>
        <div className="hn-search-detail-layout">
          <aside className="hn-document-outline"><strong>内容定位</strong><button type="button" className={section === 'match' ? 'is-active' : ''} onClick={() => setSection('match')}><Search size={14} /><span>命中内容</span><em>{item.hits.length}</em></button><button type="button" className={section === 'detail' ? 'is-active' : ''} onClick={() => setSection('detail')}><FileText size={14} /><span>建议详情</span></button><button type="button" className={section === 'source' ? 'is-active' : ''} onClick={() => setSection('source')}><PaperclipIcon /><span>提炼依据</span><em>{item.typicalSources.length}</em></button></aside>
          <main className="hn-search-document-view">
            {section === 'match' ? <div className="hn-hit-passages">{item.hits.map((hit) => <button type="button" key={hit.field} onClick={() => setSection('detail')}><b>{hit.field}命中</b><p>{hit.text}</p></button>)}</div> : section === 'detail' ? <div className="hn-standard-case-detail">
              <section><h3>建议信息</h3><div className="hn-case-info-grid">{[
                ['建议编号', item.code],
                ['建议类型', item.category],
                ['采纳状态', item.status],
                ['适用范围', item.scope],
                ['提炼时间', item.generatedAt],
                ['提炼方式', item.generatedBy],
                ['来源典型案例', `${item.typicalSources.length}个`],
              ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
              <section><h3>反哺建议</h3><div className="hn-case-copy"><span>建议概述</span><p>{item.summary}</p></div><div className="hn-case-copy"><span>建议内容</span><p>{item.content}</p></div><div className="hn-case-copy"><span>预期效果</span><p>{item.expectedEffect}</p></div><div className="hn-case-copy"><span>适用条件</span><p>{item.applicableConditions}</p></div></section>
              <section><h3>建议标签</h3><div className="hn-case-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></section>
            </div> : <div className="hn-standard-source-detail">
              <section><h3>智能提炼依据</h3><div className="hn-case-copy"><span>共性特征</span><p>{item.evidence.join('；')}</p></div></section>
              <section><h3>来源典型案例</h3><div className="hn-typical-links"><div className="hn-typical-links-head"><span>典型案例标题</span><span>案例类型</span><span>发布时间</span></div>{item.typicalSources.map((row) => <div key={row.title}><strong>{row.title}</strong><span>{row.type}</span><span>{row.publishedAt}</span></div>)}</div></section>
            </div>}
          </main>
          <aside className="hn-detail-side-info"><section><div className="hn-section-caption"><div><Sparkles size={15} /><strong>匹配原因</strong></div></div><div className="hn-side-reasons">{item.reason.map((reason) => <span key={reason}><CheckCircle2 size={13} />{reason}</span>)}</div></section><section><div className="hn-section-caption"><div><Link2 size={15} /><strong>继续查看相似建议</strong></div></div><div className="hn-side-similar">{FEEDBACK_SUGGESTION_RESULTS.filter((row) => row.id !== item.id).map((row) => <button type="button" key={row.id} onClick={() => onOpenDetail(row.id)}><strong>{row.title}</strong><span>{row.code} · {row.score}%</span></button>)}</div></section></aside>
        </div>
      </div>
    </div>
  );
}

function SearchDetailPage(props: { id?: string; query: string; onBack: () => void; onNotice: (message: string) => void; onOpenDetail: (id: string) => void; mode: SearchMode }) {
  if (props.mode === 'feedback') return <FeedbackSuggestionDetailPage id={props.id} query={props.query} onBack={props.onBack} onOpenDetail={props.onOpenDetail} />;
  return <CaseSearchDetailPage id={props.id} query={props.query} onBack={props.onBack} onNotice={props.onNotice} onOpenDetail={props.onOpenDetail} />;
}

function CaseSearchDetailPage({ id, query, onBack, onNotice, onOpenDetail }: { id?: string; query: string; onBack: () => void; onNotice: (message: string) => void; onOpenDetail: (id: string) => void }) {
  const item = SEARCH_RESULTS.find((row) => row.id === id) || SEARCH_RESULTS[0];
  const [section, setSection] = useState<'match' | 'detail' | 'source'>('match');
  const sourceMaterialCount = item.attachments.length + (item.sourceUrl ? 1 : 0);
  return (
    <div className="case-workspace hn-search-detail-page">
      <OperationHead title="案例详情" subtitle="" onBack={onBack} actions={item.sourceUrl ? <button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => onNotice('已模拟打开外部公开案例原文')}><ExternalLink size={14} />查看原文</button> : null} />
      <div className="hn-operation-body hn-search-detail-body">
        <section className="hn-search-detail-summary"><div className="hn-detail-score"><strong>{item.score}%</strong><span>检索相关度</span></div><div className="hn-detail-main-info"><h2>{item.title}</h2><p><span>{item.code}</span><span>{item.sourceType}</span><span>{item.region}</span><span>{item.occurrenceTime}</span><span>{item.subjects.join('；')}</span></p></div><div className="hn-detail-query"><span>本次检索</span><strong>{query || '转拨资金如何进行会计处理'}</strong></div></section>
        <div className="hn-search-detail-layout">
          <aside className="hn-document-outline"><strong>内容定位</strong><button type="button" className={section === 'match' ? 'is-active' : ''} onClick={() => setSection('match')}><Search size={14} /><span>命中内容</span><em>{item.hits.length}</em></button><button type="button" className={section === 'detail' ? 'is-active' : ''} onClick={() => setSection('detail')}><FileText size={14} /><span>案例详情</span></button><button type="button" className={section === 'source' ? 'is-active' : ''} onClick={() => setSection('source')}><PaperclipIcon /><span>来源材料</span>{sourceMaterialCount ? <em>{sourceMaterialCount}</em> : null}</button></aside>
          <main className="hn-search-document-view">
            {section === 'match' ? <div className="hn-hit-passages">{item.hits.map((hit) => <button type="button" key={hit.field} onClick={() => setSection('detail')}><b>{hit.field}命中</b><p>{hit.text}</p></button>)}</div> : section === 'detail' ? <div className="hn-standard-case-detail">
              <section><h3>案例信息</h3><div className="hn-case-info-grid">{[
                ['案例编号', item.code],
                ['入库状态', item.status],
                ['来源类型', item.sourceType],
                ['所属地区', item.region],
                ['发生时间', item.occurrenceTime],
                ['涉及主体', item.subjects.join('；')],
                ['录入机构', item.entryOrg],
                ['录入人', item.entryPerson],
              ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
              <section><h3>案例内容</h3><div className="hn-case-copy"><span>案例描述</span><p>{item.description}</p></div><div className="hn-case-copy"><span>备注</span><p>{item.remark}</p></div></section>
              <section><h3>案例标签</h3><div className="hn-case-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></section>
              <section><h3>典型案例关联</h3>{item.typicalAssociations.length ? <div className="hn-typical-links"><div className="hn-typical-links-head"><span>典型案例标题</span><span>审核状态</span><span>申请时间</span></div>{item.typicalAssociations.map((row) => <div key={row.title}><strong>{row.title}</strong><span>{row.status}</span><span>{row.appliedAt}</span></div>)}</div> : <div className="hn-detail-empty">暂无典型案例关联</div>}</section>
            </div> : <div className="hn-standard-source-detail">
              <section><h3>来源信息</h3><div className="hn-source-info-grid"><div><span>来源类型</span><strong>{item.sourceType}</strong></div>{item.sourceFields.map((field) => <div key={field.label}><span>{field.label}</span><strong>{field.value}</strong></div>)}{item.sourceUrl ? <div className="is-wide"><span>原文链接</span><button type="button" onClick={() => onNotice('已模拟打开外部公开案例原文')}>{item.sourceUrl}</button></div> : null}</div></section>
              <section><h3>材料附件</h3>{item.attachments.length ? <div className="hn-source-files">{item.attachments.map((attachment) => <div key={attachment.name}><FileText size={19} /><span><strong>{attachment.name}</strong><em>{attachment.meta}</em></span><button type="button" onClick={() => onNotice(`已打开${attachment.name}预览`)}><Eye size={14} />预览</button><button type="button" onClick={() => onNotice(`已模拟下载${attachment.name}`)}><Download size={14} />下载</button></div>)}</div> : <div className="hn-detail-empty">暂无附件</div>}</section>
            </div>}
          </main>
          <aside className="hn-detail-side-info"><section><div className="hn-section-caption"><div><Sparkles size={15} /><strong>匹配原因</strong></div></div><div className="hn-side-reasons">{item.reason.map((reason) => <span key={reason}><CheckCircle2 size={13} />{reason}</span>)}</div></section><section><div className="hn-section-caption"><div><Link2 size={15} /><strong>继续查看相似案例</strong></div></div><div className="hn-side-similar">{SEARCH_RESULTS.filter((row) => row.id !== item.id).slice(0, 3).map((row) => <button type="button" key={row.id} onClick={() => onOpenDetail(row.id)}><strong>{row.title}</strong><span>{row.code} · {row.score}%</span></button>)}</div></section></aside>
        </div>
      </div>
    </div>
  );
}

function PaperclipIcon() {
  return <Link2 size={14} />;
}

function EntryPage({ onPanel, onOperation, onNotice }: { onPanel: (panel: PanelState) => void; onOperation: (operation: Exclude<OperationState, null>) => void; onNotice: (message: string) => void }) {
  const [tab, setTab] = useState('待确认');
  return (
    <div className="case-workspace hn-module-page">
      <div className="case-tabs">
        {['待确认（12）', '待补充（4）', '不入库（2）', '全部（18）'].map((item) => {
          const name = item.split('（')[0];
          return <button type="button" key={item} className={tab === name ? 'is-active' : ''} onClick={() => setTab(name)}>{item}</button>;
        })}
      </div>
      <div className="hn-split-workspace">
        <Catalog mode="entry" />
        <section className="hn-list-region">
          <div className="case-list-toolbar">
            <div className="case-toolbar-left">
              <button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => onNotice('已打开文书导入演示')}><RawIcon svg={actionImportIconSvg} />文书导入</button>
              <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => onPanel({ title: '手工补录案例', kind: 'entry' })}><RawIcon svg={actionAddIconSvg} />手工补录</button>
              <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已模拟将所选数据批量入库')}><RawIcon svg={actionPassIconSvg} />批量入库</button>
              <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已导出演示数据')}><RawIcon svg={actionExportIconSvg} />导出</button>
            </div>
            <SearchTools onNotice={onNotice} />
          </div>
          <div className="hn-process-hint">
            <span>入库前处理流程</span>
            <strong>文书解析</strong><i>→</i><strong>信息补充</strong><i>→</i><strong>标签确认</strong><i>→</i><strong>确认入库</strong>
          </div>
          <div className="case-table-wrap">
            <table className="case-table hn-table hn-table-entry">
              <thead><tr><th className="case-col-check"><input type="checkbox" /></th><th>案例标题</th><th>文书类型</th><th>检查项目</th><th>被检查单位</th><th>数据质量</th><th>导入时间</th><th className="case-col-actions">操作</th></tr></thead>
              <tbody>
                {ENTRY_ROWS.map((row, index) => (
                  <tr key={row.id} className={index < 2 ? 'is-selected' : ''}>
                    <td className="case-col-check"><input type="checkbox" defaultChecked={index < 2} /></td>
                    <td><button type="button" className="case-title-link" onClick={() => onOperation({ kind: 'entry-confirm', id: row.id })}>{row.title}</button></td>
                    <td>{row.doc}</td><td>{row.project}</td><td>{row.unit}</td>
                    <td><span className={`case-badge ${row.quality === '待补充' ? 'is-warning' : 'is-ai'}`}>{row.quality}</span></td>
                    <td>{row.time}</td>
                    <td className="case-col-actions"><button type="button" onClick={() => onOperation({ kind: 'entry-confirm', id: row.id })}>确认信息</button><button type="button" onClick={() => onNotice('已打开原始文书预览')}>预览原文</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={18} />
        </section>
      </div>
    </div>
  );
}

function ArchivePage({ onOperation, onNotice }: { onOperation: (operation: Exclude<OperationState, null>) => void; onNotice: (message: string) => void }) {
  return (
    <div className="case-workspace hn-module-page">
      <div className="hn-module-strip"><span>案例档案</span><em>按年度—检查计划—检查项目归档，支持原文穿透和智能检索</em></div>
      <div className="hn-split-workspace">
        <Catalog mode="archive" />
        <section className="hn-list-region">
          <div className="case-list-toolbar">
            <div className="case-toolbar-left">
              <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已导出当前案例目录')}><RawIcon svg={actionExportIconSvg} />导出</button>
              <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已打开多维检索分析演示')}><FileSearch size={14} />检索分析</button>
            </div>
            <SearchTools onNotice={onNotice} />
          </div>
          <div className="hn-filter-summary"><span>当前范围：全部正式入库案例</span><span>检索维度：全文关键词、文号、年度、违规类型、被检查单位</span></div>
          <div className="case-table-wrap">
            <table className="case-table hn-table hn-table-archive">
              <thead><tr><th className="case-col-check"><input type="checkbox" /></th><th>案例标题</th><th>案例编号</th><th>年度</th><th>检查项目</th><th>被检查单位</th><th>标签</th><th>文书</th><th className="case-col-actions">操作</th></tr></thead>
              <tbody>
                {ARCHIVE_ROWS.map((row) => (
                  <tr key={row.id}>
                    <td className="case-col-check"><input type="checkbox" /></td>
                    <td><button type="button" className="case-title-link" onClick={() => onOperation({ kind: 'archive-detail', id: row.id })}>{row.title}</button></td>
                    <td>{row.code}</td><td>{row.year}</td><td>{row.project}</td><td>{row.unit}</td>
                    <td><span className="case-tag-list">{row.tags.map((tag) => <span className="case-soft-tag" key={tag}>{tag}</span>)}</span></td>
                    <td>{row.docs}份</td>
                    <td className="case-col-actions"><button type="button" onClick={() => onOperation({ kind: 'archive-detail', id: row.id })}>查看</button><button type="button" onClick={() => onNotice('已打开文书原件在线预览')}>原文预览</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={120} />
        </section>
      </div>
    </div>
  );
}

function AnalysisPage({ onOperation, onNotice }: { onOperation: (operation: Exclude<OperationState, null>) => void; onNotice: (message: string) => void }) {
  const [view, setView] = useState<'cluster' | 'rectify' | 'portrait'>('cluster');
  return (
    <div className="case-workspace hn-analysis-page">
      <div className="hn-analysis-filter">
        <label>年度<select defaultValue="2026"><option>2026</option><option>2025</option></select></label>
        <label>来源类型<select><option>全部来源</option><option>日常监督形成</option><option>专项监督形成</option></select></label>
        <label>行政区划<select><option>湖南省全辖</option><option>省本级</option><option>长沙市</option></select></label>
        <button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => onNotice('已按当前范围刷新智能分析结果')}>刷新分析</button>
      </div>
      <div className="hn-metric-band">
        <div><span>正式案例</span><strong>1,286</strong><em>当前筛选范围</em></div>
        <div><span>已完成分析</span><strong>1,148</strong><em>覆盖率 89.3%</em></div>
        <div><span>聚类主题</span><strong>32</strong><em>待确认 7 项</em></div>
        <div><span>整改措施模式</span><strong>48</strong><em>高适用 19 项</em></div>
      </div>
      <div className="hn-analysis-tabs">
        <button type="button" className={view === 'cluster' ? 'is-active' : ''} onClick={() => setView('cluster')}>案例聚类分析</button>
        <button type="button" className={view === 'rectify' ? 'is-active' : ''} onClick={() => setView('rectify')}>整改措施分析</button>
        <button type="button" className={view === 'portrait' ? 'is-active' : ''} onClick={() => setView('portrait')}>问题画像</button>
      </div>
      {view === 'cluster' ? (
        <div className="hn-analysis-content">
          <section className="hn-analysis-main">
            <div className="hn-section-head"><div><strong>共性问题聚类</strong><span>按关联案例数量排序</span></div><button type="button" onClick={() => onNotice('已导出聚类分析结果')}>导出</button></div>
            <div className="hn-cluster-list">
              {CLUSTERS.map((item, index) => (
                <button type="button" key={item.name} className={index === 0 ? 'is-active' : ''} onClick={() => onOperation({ kind: 'analysis-detail', id: String(index) })}>
                  <span className="hn-rank">{index + 1}</span><span className="hn-cluster-name"><strong>{item.name}</strong><em>{item.feature}</em></span><b>{item.count}件</b><small>{item.sources}</small><i>{item.status}</i>
                </button>
              ))}
            </div>
          </section>
          <aside className="hn-analysis-side">
            <div className="hn-side-title"><strong>当前聚类画像</strong><span>预算绩效目标编制不规范</span></div>
            <div className="hn-keywords"><span>目标不完整</span><span>指标不可衡量</span><span>责任不清晰</span><span>审核机制缺失</span></div>
            <div className="hn-mini-bars">
              {[['专项债券', 82], ['产业资金', 64], ['民生资金', 48], ['其他项目', 35]].map(([name, value]) => <div key={name}><span>{name}</span><i><b style={{ width: `${value}%` }} /></i><em>{value}%</em></div>)}
            </div>
            <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => onOperation({ kind: 'analysis-detail', id: '0' })}>查看分析详情</button>
          </aside>
        </div>
      ) : view === 'rectify' ? (
        <div className="hn-flat-panel">
          <div className="hn-section-head"><div><strong>典型整改措施模式</strong><span>从案例整改要求和完成情况中提取</span></div></div>
          <table className="hn-simple-table"><thead><tr><th>整改措施模式</th><th>适用场景</th><th>关联案例</th><th>适用评价</th><th>操作</th></tr></thead><tbody>{RECTIFY_PATTERNS.map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.scene}</td><td>{item.count}件</td><td><span className="case-badge is-success">{item.effect}</span></td><td><button onClick={() => onNotice(`已查看“${item.name}”适用案例`)}>查看案例</button></td></tr>)}</tbody></table>
        </div>
      ) : (
        <div className="hn-portrait-grid">
          <section><strong>高频问题领域</strong>{[['预算绩效管理', 76], ['政府采购', 62], ['预算执行', 55], ['民生资金', 43]].map(([name, value]) => <div className="hn-portrait-row" key={name}><span>{name}</span><i><b style={{ width: `${value}%` }} /></i><em>{value}</em></div>)}</section>
          <section><strong>重点关注单位</strong><ol><li><b>1</b><span>长沙市某项目单位</span><em>关联案例 18 件</em></li><li><b>2</b><span>湖南省某事业单位</span><em>关联案例 15 件</em></li><li><b>3</b><span>衡阳市某市直单位</span><em>关联案例 12 件</em></li></ol></section>
          <section><strong>问题形成原因</strong><div className="hn-keywords large"><span>制度执行不到位</span><span>审核把关不严</span><span>内控机制不健全</span><span>责任落实不到位</span><span>资料管理不规范</span></div></section>
        </div>
      )}
    </div>
  );
}

function OperationHead({ title, subtitle, onBack, actions }: { title: string; subtitle: string; onBack: () => void; actions: React.ReactNode }) {
  return (
    <div className="hn-operation-head">
      <div className="hn-operation-title">
        <button type="button" className="ufsp-form-back" onClick={onBack} aria-label="返回列表"><ArrowLeft size={17} /></button>
        <div><strong>{title}</strong><span>{subtitle}</span></div>
      </div>
      <div className="hn-operation-actions">{actions}</div>
    </div>
  );
}

function EntryConfirmPage({ id, onBack, onNotice }: { id?: string; onBack: () => void; onNotice: (message: string) => void }) {
  const entry = ENTRY_ROWS.find((item) => item.id === id) || ENTRY_ROWS[0];
  const [activeDoc, setActiveDoc] = useState('整改通知书.pdf');
  return (
    <div className="case-workspace hn-operation-page">
      <OperationHead
        title="案例入库管理 / 入库信息确认"
        subtitle="核验文书解析结果，补充案例信息和标签后正式入库"
        onBack={onBack}
        actions={<><button type="button" className="ufsp-btn" onClick={() => onNotice('已暂存当前确认内容')}>暂存</button><button type="button" className="ufsp-btn" onClick={() => onNotice('已标记为不入库')}>不入库</button><button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => { onNotice('案例信息已确认并模拟入库'); onBack(); }}>确认入库</button></>}
      />
      <div className="hn-operation-body hn-entry-confirm">
        <section className="hn-document-workbench">
          <div className="hn-document-head"><div><FileText size={17} /><strong>原始文书</strong></div><button type="button" onClick={() => onNotice('已模拟全屏预览原始文书')}><Eye size={14} />全屏预览</button></div>
          <div className="hn-document-tabs">{['整改通知书.pdf', '检查工作底稿.pdf'].map((name) => <button type="button" key={name} className={activeDoc === name ? 'is-active' : ''} onClick={() => setActiveDoc(name)}>{name}</button>)}</div>
          <div className="hn-paper-preview">
            <span>湖南省财政厅</span><h2>{activeDoc === '整改通知书.pdf' ? '财政监督检查整改通知书' : '财政监督检查工作底稿'}</h2><em>湘财监整〔2026〕18号</em>
            <p>经检查，发现你单位在专项债券项目绩效管理过程中，存在绩效目标设置不完整、部分绩效指标与项目建设内容关联不足等问题。</p>
            <p>请对照有关规定及时完成整改，补充完善绩效目标和指标体系，明确责任部门及完成时限，并于规定日期前报送整改情况。</p>
            <div className="hn-paper-mark">AI 已识别：违规事实、被检查单位、整改要求、完成期限</div>
          </div>
        </section>
        <div className="hn-confirm-workbench">
          <section className="hn-quality-panel">
            <div className="hn-section-caption"><div><CircleAlert size={16} /><strong>数据质量检查</strong></div><span>自动检查完成</span></div>
            <div className="hn-quality-summary"><div className="is-success"><CheckCircle2 size={16} /><span>已确认字段</span><b>12</b></div><div className="is-warning"><CircleAlert size={16} /><span>待补充字段</span><b>2</b></div><div><Clock3 size={16} /><span>待确认标签</span><b>3</b></div></div>
            <div className="hn-quality-note"><b>需人工确认</b><span>执法依据条款未完整识别；整改完成期限需与原文核对。</span></div>
          </section>
          <section className="hn-form-section">
            <div className="hn-section-caption"><div><strong>案例基本信息</strong><em>AI 提取</em></div><span>带 * 为必填项</span></div>
            <div className="hn-operation-form">
              <label className="wide"><span>* 案例标题</span><input defaultValue={entry.title} /></label>
              <label><span>* 文书类型</span><select defaultValue={entry.doc}><option>{entry.doc}</option><option>行政处理决定书</option><option>检查结论书</option></select></label>
              <label><span>* 检查年度</span><select defaultValue="2026"><option>2026</option><option>2025</option></select></label>
              <label className="wide"><span>* 检查项目</span><input defaultValue={entry.project} /></label>
              <label><span>* 被检查单位</span><input defaultValue={entry.unit} /></label>
              <label><span>行政区划</span><select defaultValue="长沙市"><option>长沙市</option><option>省本级</option><option>衡阳市</option></select></label>
              <label className="wide"><span>* 违规事实摘要</span><textarea defaultValue="绩效目标设置不完整，部分指标与项目建设内容关联不足，未能完整反映专项债券资金使用效益。" /></label>
              <label className="wide"><span>执法依据</span><textarea defaultValue="《地方政府专项债券项目资金绩效管理办法》有关规定（待人工补充具体条款）" /></label>
              <label className="wide"><span>* 整改要求</span><textarea defaultValue="补充完善项目绩效目标和指标体系，建立目标审核机制，明确责任部门及完成时限。" /></label>
            </div>
          </section>
          <section className="hn-form-section">
            <div className="hn-section-caption"><div><Tag size={16} /><strong>分类与标签确认</strong><em>智能推荐</em></div><span>可人工调整</span></div>
            <div className="hn-tag-groups"><div><b>问题分类</b><span>预算绩效管理</span><span>专项债券</span></div><div><b>案例标签</b><span>绩效目标</span><span>指标不完整</span><span>审核机制</span><button type="button" onClick={() => onNotice('已打开标签选择演示')}>+ 添加标签</button></div></div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ArchiveDetailPage({ id, onBack, onNotice }: { id?: string; onBack: () => void; onNotice: (message: string) => void }) {
  const archive = ARCHIVE_ROWS.find((item) => item.id === id) || ARCHIVE_ROWS[0];
  const [tab, setTab] = useState<'profile' | 'documents' | 'related'>('profile');
  return (
    <div className="case-workspace hn-operation-page">
      <OperationHead
        title="案例档案 / 案例详情"
        subtitle={`${archive.code} · 正式入库案例`}
        onBack={onBack}
        actions={<><button type="button" className="ufsp-btn" onClick={() => onNotice('已导出案例档案')}><Download size={14} />导出档案</button><button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => onNotice('已进入案例信息维护演示')}>维护信息</button></>}
      />
      <div className="hn-operation-body hn-archive-detail">
        <div className="hn-archive-summary"><div><span>案例编号</span><strong>{archive.code}</strong></div><div><span>检查年度</span><strong>{archive.year}</strong></div><div><span>检查项目</span><strong>{archive.project}</strong></div><div><span>被检查单位</span><strong>{archive.unit}</strong></div><div><span>归档文书</span><strong>{archive.docs} 份</strong></div></div>
        <div className="hn-detail-tabs"><button type="button" className={tab === 'profile' ? 'is-active' : ''} onClick={() => setTab('profile')}>档案信息</button><button type="button" className={tab === 'documents' ? 'is-active' : ''} onClick={() => setTab('documents')}>案卷文书（{archive.docs}）</button><button type="button" className={tab === 'related' ? 'is-active' : ''} onClick={() => setTab('related')}>关联分析</button></div>
        {tab === 'profile' ? <div className="hn-detail-grid">
          <section className="hn-detail-section hn-span-2"><h3>案例概述</h3><p>专项检查发现该项目绩效目标设置不完整，部分指标缺少明确的衡量标准，不能充分反映专项债券资金使用效益。检查组依法提出整改要求，责任单位已补充目标体系并建立前置审核机制。</p></section>
          <section className="hn-detail-section"><h3>违规事实</h3><dl><div><dt>问题类型</dt><dd>预算绩效管理</dd></div><div><dt>涉及资金</dt><dd>8,600 万元</dd></div><div><dt>问题表现</dt><dd>目标不完整、指标不可衡量</dd></div><div><dt>处理结果</dt><dd>责令限期整改</dd></div></dl></section>
          <section className="hn-detail-section"><h3>整改情况</h3><dl><div><dt>整改状态</dt><dd><span className="case-badge is-success">已完成</span></dd></div><div><dt>完成时间</dt><dd>2026-07-18</dd></div><div><dt>整改措施</dt><dd>完善目标体系和审核清单</dd></div><div><dt>整改成效</dt><dd>相关制度已印发执行</dd></div></dl></section>
          <section className="hn-detail-section hn-span-2"><h3>案例标签</h3><div className="hn-keywords"><span>专项债券</span><span>绩效目标</span><span>预算绩效管理</span><span>审核机制</span><span>整改完成</span></div></section>
        </div> : tab === 'documents' ? <div className="hn-document-list-page">
          {[['整改通知书.pdf', '正式文书', '2026-05-22', '2.6 MB'], ['检查工作底稿.pdf', '过程材料', '2026-05-18', '4.1 MB'], ['整改情况报告.pdf', '整改材料', '2026-07-15', '3.2 MB'], ['整改审核意见.pdf', '销号材料', '2026-07-18', '1.8 MB']].map(([name, type, date, size], index) => <div key={name}><span className="hn-doc-order">{index + 1}</span><FileText size={18} /><span><strong>{name}</strong><em>{type} · {date} · {size}</em></span><button type="button" onClick={() => onNotice(`已打开“${name}”在线预览`)}><Eye size={14} />在线预览</button><button type="button" onClick={() => onNotice(`已模拟下载“${name}”`)}><Download size={14} />下载</button></div>)}
        </div> : <div className="hn-related-analysis">
          <section><div className="hn-section-caption"><div><Sparkles size={16} /><strong>相似案例推荐</strong><em>智能推荐</em></div><span>按相似度排序</span></div><div className="hn-related-cards">{[['政府专项债券绩效目标审核不严案例', '岳阳市', 91], ['专项债券项目绩效指标缺失案例', '株洲市', 87], ['产业园区项目绩效目标不完整案例', '常德市', 82]].map(([name, region, score]) => <button type="button" key={name} onClick={() => onNotice(`已打开“${name}”案例档案`)}><strong>{name}</strong><span>{region} · 相似度 {score}%</span><i style={{ width: `${score}%` }} /></button>)}</div></section>
          <section><div className="hn-section-caption"><div><Link2 size={16} /><strong>关联问题</strong></div><span>来自问题库</span></div><div className="hn-linked-issues"><div><b>湘财问〔2026〕031号</b><span>专项债券项目绩效目标设置不完整</span><em className="case-badge is-success">已销号</em></div><div><b>湘财问〔2026〕027号</b><span>绩效指标未细化量化</span><em className="case-badge is-ai">整改中</em></div></div></section>
        </div>}
      </div>
    </div>
  );
}

function AnalysisDetailPage({ id, onBack, onNotice }: { id?: string; onBack: () => void; onNotice: (message: string) => void }) {
  const cluster = CLUSTERS[Number(id) || 0] || CLUSTERS[0];
  return (
    <div className="case-workspace hn-operation-page">
      <OperationHead
        title="案例智能分析 / 聚类分析详情"
        subtitle={`聚类主题：${cluster.name}`}
        onBack={onBack}
        actions={<><button type="button" className="ufsp-btn" onClick={() => onNotice('已导出当前聚类分析报告')}><Download size={14} />导出报告</button><button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => onNotice('已加入典型案例候选')}>形成典型案例</button></>}
      />
      <div className="hn-operation-body hn-analysis-detail">
        <section className="hn-cluster-overview"><div><span>关联案例</span><strong>{cluster.count}</strong><em>件</em></div><div><span>覆盖地区</span><strong>8</strong><em>个市州</em></div><div><span>高频来源</span><strong>63%</strong><em>专项监督</em></div><div><span>整改完成率</span><strong>84.2%</strong><em>较全库 +6.8%</em></div><div className="hn-cluster-description"><b>聚类结论</b><p>同类问题集中表现为绩效目标内容不完整、指标不可衡量和前置审核机制缺失，具有较强共性和推广整改价值。</p></div></section>
        <div className="hn-analysis-detail-grid">
          <section className="hn-detail-section"><div className="hn-section-caption"><div><strong>共性问题特征</strong><em>AI 提炼</em></div><span>4 项</span></div><div className="hn-feature-list"><div><b>01</b><span><strong>目标内容不完整</strong><em>产出、效益和满意度目标存在缺项</em></span><small>出现率 82%</small></div><div><b>02</b><span><strong>指标不可衡量</strong><em>指标缺少明确数值或计算口径</em></span><small>出现率 71%</small></div><div><b>03</b><span><strong>目标与建设内容脱节</strong><em>绩效目标未覆盖项目核心建设任务</em></span><small>出现率 63%</small></div><div><b>04</b><span><strong>前置审核机制不足</strong><em>项目入库前缺少目标质量复核</em></span><small>出现率 58%</small></div></div></section>
          <section className="hn-detail-section"><div className="hn-section-caption"><div><strong>整改措施模式</strong><em>案例归纳</em></div><span>推荐 3 项</span></div><div className="hn-pattern-cards"><div><strong>建立绩效目标审核清单</strong><span>适用于项目入库和债券发行前审核</span><em>18 件案例采用 · 适用度高</em></div><div><strong>补充量化指标及计算口径</strong><span>围绕建设进度、资金使用和效益设置指标</span><em>16 件案例采用 · 适用度高</em></div><div><strong>开展目标与建设内容一致性复核</strong><span>由业务、财务和绩效部门联合审核</span><em>12 件案例采用 · 适用度中</em></div></div></section>
        </div>
        <section className="hn-detail-section hn-analysis-cases"><div className="hn-section-caption"><div><strong>关联案例样本</strong></div><button type="button" onClick={() => onNotice('已打开全部关联案例')}>查看全部 {cluster.count} 件</button></div><table className="hn-simple-table"><thead><tr><th>案例编号</th><th>案例标题</th><th>地区</th><th>问题特征</th><th>整改状态</th><th>操作</th></tr></thead><tbody>{ARCHIVE_ROWS.slice(0, 3).map((row, index) => <tr key={row.id}><td>{row.code}</td><td>{row.title}</td><td>{['长沙市', '岳阳市', '株洲市'][index]}</td><td>{['目标不完整', '指标不可衡量', '审核机制缺失'][index]}</td><td><span className="case-badge is-success">已完成</span></td><td><button type="button" onClick={() => onNotice(`已打开“${row.title}”档案`)}>查看档案</button></td></tr>)}</tbody></table></section>
      </div>
    </div>
  );
}

function TypicalPage({ onPanel, onNotice }: { onPanel: (panel: PanelState) => void; onNotice: (message: string) => void }) {
  const [tab, setTab] = useState('典型候选');
  return (
    <div className="case-workspace hn-module-page">
      <div className="case-tabs">{['典型候选（8）', '待发布（3）', '已发布（12）', '全部（23）'].map((item) => { const name = item.split('（')[0]; return <button type="button" key={item} className={tab === name ? 'is-active' : ''} onClick={() => setTab(name)}>{item}</button>; })}</div>
      <div className="hn-list-region">
        <div className="case-list-toolbar">
          <div className="case-toolbar-left"><button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => onPanel({ title: '新增典型案例', kind: 'typical' })}><RawIcon svg={actionAddIconSvg} />新增</button><button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已模拟发布所选典型案例')}><RawIcon svg={actionPassIconSvg} />发布</button><button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已导出典型案例清单')}><RawIcon svg={actionExportIconSvg} />导出</button></div>
          <SearchTools onNotice={onNotice} />
        </div>
        <div className="hn-filter-summary"><span>候选案例来自案例聚类结果和人工选择</span><span>代表性不足的候选案例可继续补充关联案例</span></div>
        <div className="case-table-wrap">
          <table className="case-table hn-table hn-table-typical"><thead><tr><th className="case-col-check"><input type="checkbox" /></th><th>典型案例标题</th><th>案例类型</th><th>关联案例</th><th>代表性</th><th>状态</th><th>更新时间</th><th className="case-col-actions">操作</th></tr></thead><tbody>{TYPICAL_ROWS.map((row) => <tr key={row.id}><td className="case-col-check"><input type="checkbox" /></td><td><button type="button" className="case-title-link" onClick={() => onPanel({ title: '典型案例详情', kind: 'typical', id: row.id })}>{row.title}</button></td><td>{row.type}</td><td>{row.related}件</td><td><span className={`case-badge ${row.representative === '高' ? 'is-success' : 'is-warning'}`}>{row.representative}</span></td><td><span className="case-badge is-ai">{row.status}</span></td><td>{row.updated}</td><td className="case-col-actions"><button type="button" onClick={() => onPanel({ title: '典型案例详情', kind: 'typical', id: row.id })}>查看</button><button type="button" onClick={() => onNotice(row.status === '典型候选' ? '已进入典型案例信息维护' : '已打开发布记录')}>{row.status === '典型候选' ? '形成典型案例' : '发布记录'}</button></td></tr>)}</tbody></table>
        </div>
        <Pagination total={23} />
      </div>
    </div>
  );
}

function SidePanel({ panel, onClose, onNotice }: { panel: Exclude<PanelState, null>; onClose: () => void; onNotice: (message: string) => void }) {
  const entry = ENTRY_ROWS.find((item) => item.id === panel.id) || ENTRY_ROWS[0];
  const archive = ARCHIVE_ROWS.find((item) => item.id === panel.id) || ARCHIVE_ROWS[0];
  const typical = TYPICAL_ROWS.find((item) => item.id === panel.id) || TYPICAL_ROWS[0];
  return (
    <div className="hn-overlay" role="presentation" onMouseDown={onClose}>
      <aside className="hn-drawer" role="dialog" aria-modal="true" aria-label={panel.title} onMouseDown={(event) => event.stopPropagation()}>
        <header><div><strong>{panel.title}</strong><span>{panel.kind === 'entry' ? '核验文书解析结果并补充案例信息' : panel.kind === 'archive' ? '查看正式案例、原始文书和智能关联' : '查看典型案例及关联案例'}</span></div><button type="button" onClick={onClose}><X size={18} /></button></header>
        <div className="hn-drawer-body">
          {panel.kind === 'entry' ? <>
            <section><h3>文书解析结果 <span>AI提取</span></h3><div className="hn-form-grid"><label>案例标题<input defaultValue={panel.id ? entry.title : ''} placeholder="请输入案例标题" /></label><label>文书类型<select defaultValue="整改通知书"><option>整改通知书</option><option>行政处理决定书</option></select></label><label>检查项目<input defaultValue={panel.id ? entry.project : ''} placeholder="请选择检查项目" /></label><label>被检查单位<input defaultValue={panel.id ? entry.unit : ''} placeholder="请输入被检查单位" /></label></div></section>
            <section><h3>案例信息补充</h3><div className="hn-form-grid"><label className="wide">问题概述<textarea defaultValue="检查发现部分项目绩效目标设置不完整，绩效指标与项目建设内容关联不足。" /></label><label>违规类型<select><option>预算绩效管理</option></select></label><label>涉及地区<select><option>长沙市</option></select></label></div></section>
            <section><h3>标签确认</h3><div className="hn-keywords"><span>专项债券</span><span>绩效目标</span><span>预算管理</span><button type="button">+ 添加标签</button></div></section>
          </> : panel.kind === 'archive' ? <>
            <section><h3>档案信息</h3><dl className="hn-detail-list"><div><dt>案例编号</dt><dd>{archive.code}</dd></div><div><dt>案例标题</dt><dd>{archive.title}</dd></div><div><dt>检查项目</dt><dd>{archive.project}</dd></div><div><dt>被检查单位</dt><dd>{archive.unit}</dd></div></dl></section>
            <section><h3>原始文书</h3><div className="hn-doc-list"><button type="button" onClick={() => onNotice('已打开整改通知书在线预览')}><Files size={16} /><span>整改通知书.pdf</span><em>在线预览</em></button><button type="button" onClick={() => onNotice('已打开检查工作底稿在线预览')}><Files size={16} /><span>检查工作底稿.pdf</span><em>在线预览</em></button></div></section>
            <section><h3>相似案例推荐 <span>智能推荐</span></h3><div className="hn-related-list"><button type="button"><strong>政府专项债券绩效目标审核不严案例</strong><span>相似度 91% · 岳阳市</span></button><button type="button"><strong>专项债券项目绩效指标缺失案例</strong><span>相似度 87% · 株洲市</span></button></div></section>
          </> : <>
            <section><h3>典型案例信息</h3><dl className="hn-detail-list"><div><dt>案例标题</dt><dd>{typical.title}</dd></div><div><dt>案例类型</dt><dd>{typical.type}</dd></div><div><dt>关联案例</dt><dd>{typical.related}件</dd></div><div><dt>代表性</dt><dd>{typical.representative}</dd></div></dl></section>
            <section><h3>代表性说明</h3><p className="hn-copy">该问题在多个地区和项目中重复出现，问题表现具有共性，整改措施已形成可复用的管理机制，适合作为典型案例展示。</p></section>
            <section><h3>关联案例</h3><div className="hn-related-list"><button type="button"><strong>专项债券绩效目标设置不完整案例</strong><span>长沙市 · 已入库</span></button><button type="button"><strong>绩效目标审核把关不严案例</strong><span>衡阳市 · 已入库</span></button></div></section>
          </>}
        </div>
        <footer><button type="button" className="ufsp-btn" onClick={onClose}>取消</button><button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => { onNotice(panel.kind === 'entry' ? '已模拟确认并入库' : panel.kind === 'typical' ? '已保存典型案例信息' : '已进入案例维护'); onClose(); }}>{panel.kind === 'entry' ? '确认入库' : '保存'}</button></footer>
      </aside>
    </div>
  );
}

const Component = forwardRef<AxureHandle, AxureProps>(function Component(props, ref) {
  const config = props.config || {};
  const emitEvent = createEventEmitter(props.onEvent);
  const title = getConfigValue<string>(config, 'title', '财会监督系统');
  const topicName = getConfigValue<string>(config, 'topic_name', '甘肃案例库');
  const isFeedbackSuggestionSearch = window.location.pathname.includes('/gansu-feedback-suggestion-search');
  const searchMode: SearchMode = isFeedbackSuggestionSearch ? 'feedback' : 'case';
  const [featureKey] = useState<FeatureKey>('search');
  const [panel, setPanel] = useState<PanelState>(null);
  const [operation, setOperation] = useState<OperationState>(null);
  const [searchView, setSearchView] = useState<'home' | 'results' | 'detail'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResultId, setSearchResultId] = useState(isFeedbackSuggestionSearch ? 'F01' : 'S01');
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackSearchCategory>('policy');
  const [notice, setNotice] = useState('');
  const activeFeature = isFeedbackSuggestionSearch
    ? { key: 'feedback_suggestion_search', name: '反哺建议检索' } as const
    : { key: 'case_search', name: '案例智能检索' } as const;

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2200);
  };

  const onNavigate = (href: string) => {
    emitEvent('onNavigate', href);
    window.location.href = href;
  };

  useImperativeHandle(ref, () => ({
    getVar(name: string) {
      if (name === 'feature_key') return activeFeature.key;
      if (name === 'feature_name') return activeFeature.name;
      return undefined;
    },
    fireAction() { return undefined; },
    eventList: EVENT_LIST,
    actionList: [],
    varList: VAR_LIST,
    configList: CONFIG_LIST,
    dataList: [],
  }), [activeFeature]);

  return (
    <div className="case-library-page gansu-case-search">
      <TopBar title={title} onNavigate={onNavigate} />
      <main className="case-layout">
        <div className="case-frame">
          <CaseLibraryFeatureMenu
            activeKey={activeFeature.key}
            topicName={topicName}
            onNavigate={onNavigate}
          />
          <section className="case-content">
            {featureKey === 'search' ? searchView === 'home' ? <SearchHome query={searchQuery} onQueryChange={setSearchQuery} onSearch={() => setSearchView('results')} onNotice={showNotice} mode={searchMode} feedbackCategory={feedbackCategory} onFeedbackCategoryChange={setFeedbackCategory} /> : searchView === 'results' ? <SearchResultsPage query={searchQuery} onQueryChange={setSearchQuery} onSearch={() => setSearchView('results')} onBack={() => setSearchView('home')} onOpenDetail={(id) => { setSearchResultId(id); setSearchView('detail'); }} onNotice={showNotice} mode={searchMode} feedbackCategory={feedbackCategory} onFeedbackCategoryChange={setFeedbackCategory} /> : <SearchDetailPage id={searchResultId} query={searchQuery} onBack={() => setSearchView('results')} onOpenDetail={(id) => setSearchResultId(id)} onNotice={showNotice} mode={searchMode} /> : operation?.kind === 'entry-confirm' ? <EntryConfirmPage id={operation.id} onBack={() => setOperation(null)} onNotice={showNotice} /> : operation?.kind === 'archive-detail' ? <ArchiveDetailPage id={operation.id} onBack={() => setOperation(null)} onNotice={showNotice} /> : operation?.kind === 'analysis-detail' ? <AnalysisDetailPage id={operation.id} onBack={() => setOperation(null)} onNotice={showNotice} /> : featureKey === 'entry' ? <EntryPage onPanel={setPanel} onOperation={setOperation} onNotice={showNotice} /> : featureKey === 'archive' ? <ArchivePage onOperation={setOperation} onNotice={showNotice} /> : featureKey === 'analysis' ? <AnalysisPage onOperation={setOperation} onNotice={showNotice} /> : <TypicalPage onPanel={setPanel} onNotice={showNotice} />}
          </section>
        </div>
      </main>
      {panel ? <SidePanel panel={panel} onClose={() => setPanel(null)} onNotice={showNotice} /> : null}
      {notice ? <div className="hn-toast">{notice}</div> : null}
    </div>
  );
});

export default Component;
