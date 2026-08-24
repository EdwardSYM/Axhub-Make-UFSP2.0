/**
 * @name 案例库
 *
 * 参考资料：
 * - /rules/ufsp-page-governance.md
 * - /rules/confirmed-baselines.md
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
  Archive,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  Download,
  Eye,
  ExternalLink,
  FileCheck2,
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
  type LucideIcon,
} from 'lucide-react';
import TopBar from '../../common/components/TopBar';
import type { AxureHandle, AxureProps, ConfigItem, EventItem, KeyDesc } from '../../common/axure-types';
import { createEventEmitter, getConfigValue } from '../../common/axure-types';

type FeatureKey = 'search' | 'entry' | 'archive' | 'analysis' | 'typical';
type Feature = { key: FeatureKey; name: string; desc: string; Icon: LucideIcon };
type PanelState = null | { title: string; kind: 'entry' | 'archive' | 'typical'; id?: string };
type OperationState = null | { kind: 'entry-confirm' | 'archive-detail' | 'analysis-detail'; id?: string };
type AnalysisStatus = 'loading' | 'complete';
type AnalysisFeedback = { vote?: 'up' | 'down'; reasons: string[]; note: string; submitted: boolean };

const FEATURES: Feature[] = [
  { key: 'search', name: '案例检索', desc: '关键词、自然语言和相似案例检索', Icon: Search },
  { key: 'entry', name: '案例入库管理', desc: '文书导入、质量确认和信息补充', Icon: FileCheck2 },
  { key: 'archive', name: '案例档案', desc: '造册归档、检索和原文预览', Icon: Archive },
  { key: 'analysis', name: '案例智能分析', desc: '聚类、整改措施和问题画像', Icon: Sparkles },
  { key: 'typical', name: '典型案例管理', desc: '候选确认、维护和发布', Icon: BookOpenCheck },
];

const SEARCH_RESULTS = [
  {
    id: 'S01',
    code: '湘财监整〔2025〕42号',
    title: '关于专项债券项目资金支付进度异常问题的整改通知书',
    type: '整改通知书',
    date: '2025-11-18',
    unit: '岳阳市某园区建设单位',
    score: 96,
    reason: ['问题描述语义高度相似', '命中“资金支付进度”', '同属专项债券项目'],
    excerpt: '检查发现，项目资金支付进度明显快于实际建设进度，部分资金支付缺少与工程进度相匹配的验收资料，存在超进度支付风险。',
  },
  {
    id: 'S02',
    code: '湘财监报〔2024〕16号',
    title: '专项债券资金使用管理监督检查报告',
    type: '检查报告',
    date: '2024-09-26',
    unit: '株洲市某项目建设单位',
    score: 91,
    reason: ['命中专项债券专有名词', '问题事实表达相近', '相关单位类型相似'],
    excerpt: '部分项目存在建设进度滞后、债券资金支出比例偏高的问题，资金拨付依据和工程计量资料未能形成完整对应关系。',
  },
  {
    id: 'S03',
    code: '湘财监处〔2023〕28号',
    title: '关于项目建设进度滞后及资金闲置问题的处理决定',
    type: '处理决定书',
    date: '2023-12-08',
    unit: '常德市某基础设施项目单位',
    score: 86,
    reason: ['建设进度与资金使用关系相似', '命中“项目建设进度”'],
    excerpt: '项目建设未达到计划进度，已拨付专项资金未及时形成实物工作量，部分资金长期滞留项目账户。',
  },
  {
    id: 'S04',
    code: '湘财监整〔2022〕63号',
    title: '关于政府投资项目工程款支付审核不严问题的整改通知书',
    type: '整改通知书',
    date: '2022-08-15',
    unit: '衡阳市某项目管理中心',
    score: 78,
    reason: ['同属工程款支付管理', '支付依据问题相近'],
    excerpt: '工程款支付审核主要依据施工单位申请，未充分核验监理确认的工程进度和合同约定，支付审核控制存在薄弱环节。',
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
    similarity: '两者都指向专项债券资金支付进度与实际建设进度脱节，并涉及支付依据、验收资料不完整的问题。',
    commonIssues: ['资金支付与工程进度不匹配', '验收及计量资料未形成完整依据链'],
    differences: ['该案例已识别超进度支付风险，本次事项仍需结合实际支付比例核实', '项目年度、建设阶段和责任主体不同'],
    referenceLevel: '较高',
    referenceAdvice: '值得重点参考，可复用“工程计量—监理确认—资金支付”三方衔接的整改机制。',
    citations: ['问题事实 · 第3段', '处理意见 · 第6段', '整改要求 · 第8段'],
  },
  S02: {
    similarity: '均涉及专项债券项目建设进度滞后、资金支出比例偏高，以及拨付依据与工程计量资料对应不足。',
    commonIssues: ['建设进度与资金支出比例失衡', '拨付依据和工程计量资料对应不完整'],
    differences: ['该案例为综合检查报告，覆盖多个项目；本次事项更聚焦单个项目', '案例侧重管理共性，本次事项需进一步核定具体支付责任'],
    referenceLevel: '较高',
    referenceAdvice: '适合参考其项目分级核验和资金拨付资料清单，用于补充检查范围与审核口径。',
    citations: ['检查发现 · 第4段', '原因分析 · 第7段', '监督建议 · 第11段'],
  },
  S03: {
    similarity: '两者都涉及建设进度与财政资金使用节奏不协调，但资金表现方向不同。',
    commonIssues: ['工程进度未按计划推进', '资金使用未与实物工作量有效衔接'],
    differences: ['该案例表现为资金闲置，本次事项更接近支付进度偏快', '可参考管理机制，不宜直接套用问题定性'],
    referenceLevel: '中等',
    referenceAdvice: '可用于对照判断资金与实物工作量的匹配关系，但不建议直接复用其问题定性和处理结论。',
    citations: ['问题事实 · 第2段', '处理决定 · 第5段'],
  },
  S04: {
    similarity: '均关注工程款支付审核，以及工程进度、监理确认和合同约定之间的校验关系。',
    commonIssues: ['支付审核依据不充分', '工程进度核验控制存在薄弱环节'],
    differences: ['该案例属于一般政府投资项目，本次事项具有专项债券资金管理要求', '资金来源和适用制度不同'],
    referenceLevel: '中等',
    referenceAdvice: '可参考支付审核控制措施，涉及专项债券的定性和整改要求仍应以专项制度为准。',
    citations: ['问题事实 · 第4段', '整改要求 · 第7段'],
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
  { name: 'feature_key', desc: '当前湖南案例库功能 key' },
  { name: 'feature_name', desc: '当前湖南案例库功能名称' },
];
const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '系统标题', initialValue: '财会监督系统' },
  { type: 'input', attributeId: 'topic_name', displayName: '页面主题', initialValue: '湖南案例库' },
];

function initialFeature(): FeatureKey {
  if (typeof window === 'undefined') return 'search';
  const value = new URLSearchParams(window.location.search).get('feature');
  return FEATURES.some((item) => item.key === value) ? (value as FeatureKey) : 'search';
}

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

function FeatureMark({ Icon, active }: { Icon: LucideIcon; active?: boolean }) {
  return (
    <span className={`case-nav-icon ${active ? 'is-active' : ''}`} aria-hidden="true">
      <Icon size={17} />
    </span>
  );
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

function SearchBox({ value, onChange, onSearch, compact = false }: { value: string; onChange: (value: string) => void; onSearch: () => void; compact?: boolean }) {
  return (
    <div className={`hn-case-search-box ${compact ? 'is-compact' : ''}`}>
      <Search size={compact ? 17 : 20} />
      <input value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSearch(); }} placeholder="请输入文号、单位名称，或描述需要查找的问题" aria-label="案例检索内容" />
      <button type="button" onClick={onSearch}>检索</button>
    </div>
  );
}

function SearchHome({ query, onQueryChange, onSearch, onNotice }: { query: string; onQueryChange: (value: string) => void; onSearch: () => void; onNotice: (message: string) => void }) {
  const examples = ['专项债券资金支付进度与建设进度不匹配', '政府采购履约验收资料缺失', '财政暂付款长期挂账', '惠民补贴重复发放'];
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <div className="case-workspace hn-search-home">
      <div className="hn-search-hero">
        <div className="hn-search-heading"><strong>案例智能检索</strong></div>
        <SearchBox value={query} onChange={onQueryChange} onSearch={onSearch} />
        <div className="hn-search-assist">
          <div className="hn-search-examples"><b><Sparkles size={13} />试试这样搜</b><div>{examples.map((item) => <button type="button" key={item} onClick={() => { onQueryChange(item); window.setTimeout(onSearch, 0); }}>{item}</button>)}</div></div>
          <div className={`hn-search-help ${helpOpen ? 'is-open' : ''}`}><button type="button" aria-label="检索说明" title="检索说明" aria-expanded={helpOpen} onClick={() => setHelpOpen((value) => !value)}><Info size={15} /></button>{helpOpen ? <p><CircleAlert size={14} /><span>支持文号、专有名词等精确检索，也支持使用自然语言描述事项；结果直接来自已入库历史文书。</span></p> : null}</div>
        </div>
      </div>
      <div className="hn-search-home-grid">
        <section><div className="hn-search-block-title"><History size={16} /><strong>最近检索</strong><button type="button" onClick={() => onNotice('已清空最近检索演示记录')}>清空</button></div><div className="hn-recent-searches">{['专项债券资金支付进度异常', '湘财监整〔2025〕42号', '采购合同履约验收资料', '暂付款长期挂账整改'].map((item) => <button type="button" key={item} onClick={() => { onQueryChange(item); window.setTimeout(onSearch, 0); }}><Search size={14} /><span>{item}</span><em>再次检索</em></button>)}</div></section>
        <section><div className="hn-search-block-title"><SlidersHorizontal size={16} /><strong>可检索范围</strong><span>当前知识库</span></div><div className="hn-search-scope"><div><strong>12,680</strong><span>历史监督文书</span></div><div><strong>2021—2026</strong><span>文书年度范围</span></div><div><strong>4 类</strong><span>主要文书类型</span></div><p>整改通知书、检查报告、行政处罚决定书及其他监督执法文书。</p></div></section>
      </div>
    </div>
  );
}

function SearchFilters({ onNotice, onCollapse }: { onNotice: (message: string) => void; onCollapse: () => void }) {
  return (
    <aside className="hn-search-filters">
      <div className="hn-filter-head"><strong>筛选条件</strong><div><button type="button" onClick={() => onNotice('筛选条件已重置')}>重置</button><button type="button" className="hn-filter-collapse" aria-label="收起筛选条件" title="收起筛选条件" onClick={onCollapse}><ChevronLeft size={15} /></button></div></div>
      <label><span>年度 / 日期</span><span className="hn-select-control"><select defaultValue="全部年度"><option>全部年度</option><option>2026年</option><option>2025年</option><option>2024年</option><option>2023年</option></select><ChevronDown size={14} /></span></label>
      <label><span>文书类型</span><span className="hn-select-control"><select defaultValue="全部类型"><option>全部类型</option><option>整改通知书</option><option>检查报告</option><option>行政处罚决定书</option></select><ChevronDown size={14} /></span></label>
      <label><span>文号</span><input placeholder="输入完整或部分文号" /></label>
      <label><span>相关单位</span><input placeholder="输入单位名称" /></label>
      <button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => onNotice('检索结果已按当前条件筛选')}>应用筛选</button>
      <div className="hn-filter-help"><CircleAlert size={14} /><span>筛选字段来自 OA 或文书基础信息提取，不等同于案例标签。</span></div>
    </aside>
  );
}

function DeepAnalysisPanel({
  itemId,
  status,
  feedback,
  onRerun,
  onFeedbackChange,
  onSubmit,
  onNotice,
}: {
  itemId: string;
  status: AnalysisStatus;
  feedback: AnalysisFeedback;
  onRerun: () => void;
  onFeedbackChange: (patch: Partial<AnalysisFeedback>) => void;
  onSubmit: () => void;
  onNotice: (message: string) => void;
}) {
  const analysis = DEEP_ANALYSIS[itemId];
  const negativeReasons = ['相似原因不准确', '共同问题有遗漏', '差异判断不合理', '参考建议不可用'];
  const canSubmit = feedback.vote === 'up' || (feedback.vote === 'down' && (feedback.reasons.length > 0 || feedback.note.trim().length > 0));

  if (status === 'loading') {
    return (
      <section className="hn-inline-analysis is-loading" aria-live="polite" aria-label="深度分析生成中">
        <div className="hn-analysis-loading-copy"><LoaderCircle size={17} /><div><strong>正在生成深度分析</strong><span>结合候选案例原文，对共同问题、关键差异和参考价值进行判断</span></div></div>
        <div className="hn-analysis-skeleton" aria-hidden="true"><i /><i /><i /></div>
      </section>
    );
  }

  return (
    <section className="hn-inline-analysis" aria-live="polite">
      <div className="hn-inline-analysis-head">
        <div><Sparkles size={15} /><strong>AI 深度分析</strong><span>基于本次检索与案例原文生成</span></div>
        <button type="button" onClick={onRerun}><RotateCcw size={13} />重新分析</button>
      </div>
      <div className="hn-analysis-dimensions">
        <div><span>为什么相似</span><p>{analysis.similarity}</p></div>
        <div><span>共同问题</span><ul>{analysis.commonIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>
        <div><span>关键差异</span><ul>{analysis.differences.map((difference) => <li key={difference}>{difference}</li>)}</ul></div>
      </div>
      <div className="hn-reference-verdict">
        <div><span>是否值得参考</span><strong>{analysis.referenceLevel}</strong></div>
        <p>{analysis.referenceAdvice}</p>
      </div>
      <div className="hn-analysis-citations"><span>分析依据</span>{analysis.citations.map((citation) => <button type="button" key={citation} onClick={() => onNotice(`已定位至${citation}`)}>{citation}</button>)}</div>
      <div className="hn-analysis-feedback">
        <div className="hn-feedback-question"><span>这份分析有帮助吗？</span><div><button type="button" className={feedback.vote === 'up' ? 'is-active' : ''} aria-label="分析有帮助" aria-pressed={feedback.vote === 'up'} onClick={() => onFeedbackChange({ vote: 'up', reasons: [], submitted: false })}><ThumbsUp size={14} /></button><button type="button" className={feedback.vote === 'down' ? 'is-active' : ''} aria-label="分析没有帮助" aria-pressed={feedback.vote === 'down'} onClick={() => onFeedbackChange({ vote: 'down', submitted: false })}><ThumbsDown size={14} /></button></div></div>
        {feedback.vote ? <div className="hn-feedback-form">
          {feedback.vote === 'down' ? <div className="hn-feedback-reasons">{negativeReasons.map((reason) => { const active = feedback.reasons.includes(reason); return <button type="button" key={reason} className={active ? 'is-active' : ''} aria-pressed={active} onClick={() => onFeedbackChange({ reasons: active ? feedback.reasons.filter((item) => item !== reason) : [...feedback.reasons, reason], submitted: false })}>{reason}</button>; })}</div> : null}
          <textarea value={feedback.note} maxLength={200} placeholder={feedback.vote === 'up' ? '可补充哪些内容对你最有帮助（选填）' : '请补充需要修正的内容（选填）'} onChange={(event) => onFeedbackChange({ note: event.target.value, submitted: false })} />
          <div><span>{feedback.submitted ? '反馈已提交，可继续修改' : '反馈将用于优化后续分析结果'}</span><button type="button" className="ufsp-btn ufsp-btn-primary" disabled={!canSubmit} onClick={onSubmit}>提交反馈</button></div>
        </div> : null}
      </div>
    </section>
  );
}

function SearchResultsPage({ query, onQueryChange, onSearch, onOpenDetail, onBack, onNotice }: { query: string; onQueryChange: (value: string) => void; onSearch: () => void; onOpenDetail: (id: string) => void; onBack: () => void; onNotice: (message: string) => void }) {
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

  return (
    <div className="case-workspace hn-search-results-page">
      <div className={`hn-search-results-layout ${filtersOpen ? '' : 'is-filter-collapsed'}`}>
        {filtersOpen ? <SearchFilters onNotice={onNotice} onCollapse={() => setFiltersOpen(false)} /> : <button type="button" className="hn-filter-rail" aria-label="展开筛选条件" title="展开筛选条件" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={17} /><ChevronRight size={14} /></button>}
        <section className="hn-search-result-main">
          <div className="hn-result-command"><button type="button" className="ufsp-form-back" onClick={onBack} aria-label="返回检索首页" title="返回检索首页"><ArrowLeft size={16} /></button><SearchBox compact value={query} onChange={onQueryChange} onSearch={rerunSearch} /><div className="hn-result-tools"><span className="hn-result-count"><strong>36</strong><span>份相关文书</span></span><i aria-hidden="true" /><label><span className="hn-select-control"><select aria-label="结果排序" value={sort} onChange={(event) => setSort(event.target.value)}><option>相关度优先</option><option>最新时间</option><option>最早时间</option></select><ChevronDown size={14} /></span></label></div></div>
          <div className="hn-result-ledger">
          <div className="hn-search-result-list">{SEARCH_RESULTS.map((item, index) => {
            const analysisStatus = analysisStatusById[item.id];
            const analysisExpanded = expandedAnalysisId === item.id;
            const feedback = feedbackById[item.id] || { reasons: [], note: '', submitted: false };
            return <article key={item.id} className={analysisExpanded ? 'is-analysis-expanded' : ''}>
              <div className="hn-result-rank"><strong>{index + 1}</strong><span>{item.score}%</span><em>相关度</em></div>
              <div className="hn-result-content">
                <div className="hn-result-title-row"><button type="button" className="hn-result-title" onClick={() => onOpenDetail(item.id)}>{item.title}</button><div className="hn-result-actions"><button type="button" className={`hn-deep-analysis-trigger ${analysisExpanded ? 'is-active' : ''}`} disabled={analysisExpanded && analysisStatus === 'loading'} onClick={() => toggleDeepAnalysis(item.id)}>{analysisExpanded && analysisStatus === 'loading' ? <LoaderCircle size={13} /> : <Sparkles size={13} />}{analysisExpanded && analysisStatus === 'loading' ? '分析中' : analysisStatus === 'complete' ? analysisExpanded ? '收起分析' : '查看分析' : '深度分析'}</button><button type="button" className="hn-result-detail" onClick={() => onOpenDetail(item.id)}>查看详情</button></div></div>
                <div className="hn-result-meta"><span>{item.code}</span><span>{item.type}</span><span>{item.date}</span><span>{item.unit}</span></div>
                <p><b>命中片段：</b>{item.excerpt}</p>
                <div className="hn-match-reasons"><b>检索依据</b>{item.reason.map((reason) => <span key={reason}><CheckCircle2 size={12} />{reason}</span>)}</div>
                {analysisExpanded && analysisStatus ? <DeepAnalysisPanel itemId={item.id} status={analysisStatus} feedback={feedback} onRerun={() => runDeepAnalysis(item.id)} onFeedbackChange={(patch) => updateFeedback(item.id, patch)} onSubmit={() => { updateFeedback(item.id, { submitted: true }); onNotice('深度分析反馈已提交'); }} onNotice={onNotice} /> : null}
              </div>
            </article>;
          })}</div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SearchDetailPage({ id, query, onBack, onNotice, onOpenDetail }: { id?: string; query: string; onBack: () => void; onNotice: (message: string) => void; onOpenDetail: (id: string) => void }) {
  const item = SEARCH_RESULTS.find((row) => row.id === id) || SEARCH_RESULTS[0];
  const [section, setSection] = useState<'match' | 'document' | 'source'>('match');
  return (
    <div className="case-workspace hn-search-detail-page">
      <OperationHead title="案例详情" subtitle="" onBack={onBack} actions={<button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => onNotice('已模拟跳转至 OA 文书来源')}><ExternalLink size={14} />查看 OA 来源</button>} />
      <div className="hn-operation-body hn-search-detail-body">
        <section className="hn-search-detail-summary"><div className="hn-detail-score"><strong>{item.score}%</strong><span>检索相关度</span></div><div className="hn-detail-main-info"><h2>{item.title}</h2><p><span>{item.code}</span><span>{item.type}</span><span>{item.date}</span><span>{item.unit}</span></p></div><div className="hn-detail-query"><span>本次检索</span><strong>{query || '专项债券资金支付进度与建设进度不匹配'}</strong></div></section>
        <div className="hn-search-detail-layout">
          <aside className="hn-document-outline"><strong>内容定位</strong><button type="button" className={section === 'match' ? 'is-active' : ''} onClick={() => setSection('match')}><Search size={14} /><span>命中内容</span><em>3</em></button><button type="button" className={section === 'document' ? 'is-active' : ''} onClick={() => setSection('document')}><FileText size={14} /><span>文书正文</span></button><button type="button" className={section === 'source' ? 'is-active' : ''} onClick={() => setSection('source')}><PaperclipIcon /><span>源文件附件</span><em>2</em></button></aside>
          <main className="hn-search-document-view">
            {section === 'match' ? <div className="hn-hit-passages"><button type="button" onClick={() => setSection('document')}><b>问题事实 · 第3段</b><p>检查发现，项目<mark>资金支付进度明显快于实际建设进度</mark>，部分资金支付缺少与工程进度相匹配的验收资料。</p></button><button type="button" onClick={() => setSection('document')}><b>处理意见 · 第6段</b><p>责令项目单位核实资金支付依据，按照实际工程进度规范拨付<mark>专项债券资金</mark>。</p></button><button type="button" onClick={() => setSection('document')}><b>整改要求 · 第8段</b><p>建立工程计量、监理确认、资金支付相互衔接的审核机制，防止发生<mark>超进度支付</mark>。</p></button></div> : section === 'document' ? <div className="hn-full-document"><span>湖南省财政厅</span><h2>财政监督检查整改通知书</h2><em>{item.code}</em><p>{item.unit}：</p><p>根据年度财政监督检查工作安排，我厅对你单位专项债券资金使用管理情况进行了检查。</p><p>检查发现，项目<mark>资金支付进度明显快于实际建设进度</mark>，部分资金支付缺少与工程进度相匹配的验收资料，存在超进度支付风险。</p><p>上述行为不符合专项债券资金管理有关要求。现责令你单位核实资金支付依据，按照实际工程进度规范拨付<mark>专项债券资金</mark>。</p><p>请建立工程计量、监理确认、资金支付相互衔接的审核机制，防止发生<mark>超进度支付</mark>，并按期报送整改情况。</p></div> : <div className="hn-source-files"><div><FileText size={19} /><span><strong>财政监督检查整改通知书.docx</strong><em>源文件 · 2.4 MB · 来自湖南 OA</em></span><button type="button" onClick={() => onNotice('已打开源文件预览')}><Eye size={14} />预览</button><button type="button" onClick={() => onNotice('已模拟下载源文件')}><Download size={14} />下载</button></div><div><FileText size={19} /><span><strong>监督检查工作底稿.pdf</strong><em>关联附件 · 4.8 MB · 来自湖南 OA</em></span><button type="button" onClick={() => onNotice('已打开关联附件预览')}><Eye size={14} />预览</button><button type="button" onClick={() => onNotice('已模拟下载关联附件')}><Download size={14} />下载</button></div><div className="hn-source-trace"><ExternalLink size={15} /><span><strong>来源位置</strong><em>湖南 OA / 财政监督检查 / 2025年度文书</em></span><button type="button" onClick={() => onNotice('已模拟跳转至 OA 来源记录')}>跳转来源</button></div></div>}
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
  const topicName = getConfigValue<string>(config, 'topic_name', '湖南案例库');
  const [featureKey, setFeatureKey] = useState<FeatureKey>(initialFeature);
  const [collapsed, setCollapsed] = useState(false);
  const [panel, setPanel] = useState<PanelState>(null);
  const [operation, setOperation] = useState<OperationState>(null);
  const [searchView, setSearchView] = useState<'home' | 'results' | 'detail'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResultId, setSearchResultId] = useState('S01');
  const [notice, setNotice] = useState('');
  const activeFeature = FEATURES.find((item) => item.key === featureKey) || FEATURES[0];

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2200);
  };

  const switchFeature = (key: FeatureKey) => {
    setFeatureKey(key);
    setOperation(null);
    setPanel(null);
    if (key === 'search') setSearchView('home');
    const href = `/prototypes/hunan-case-library?feature=${key}`;
    window.history.replaceState({}, '', href);
    emitEvent('onNavigate', href);
  };

  const onTopNavigate = (href: string) => {
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
    <div className="case-library-page hunan-case-library">
      <TopBar title={title} onNavigate={onTopNavigate} />
      <main className="case-layout">
        <div className="case-frame">
          <aside className={`case-sidebar ${collapsed ? 'is-collapsed' : ''}`} style={{ width: collapsed ? 64 : 272 }}>
            <div className="case-sidebar-head" title={topicName}>
              <div className="case-sidebar-brand"><span className="case-sidebar-logo"><Database size={20} /></span><div className="case-sidebar-title"><span>案例库</span><em>湖南演示</em></div></div>
              <button type="button" className="case-sidebar-trigger" aria-label={collapsed ? '展开案例库菜单' : '收起案例库菜单'} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
            </div>
            <nav className="case-nav" aria-label="湖南案例库功能菜单">
              {FEATURES.map((item) => {
                const active = item.key === activeFeature.key;
                return <button type="button" key={item.key} className={`case-nav-item ${active ? 'is-active' : ''}`} title={collapsed ? item.name : item.desc} onClick={() => switchFeature(item.key)}><FeatureMark Icon={item.Icon} active={active} />{collapsed ? null : <span>{item.name}</span>}</button>;
              })}
            </nav>
          </aside>
          <section className="case-content">
            {featureKey === 'search' ? searchView === 'home' ? <SearchHome query={searchQuery} onQueryChange={setSearchQuery} onSearch={() => setSearchView('results')} onNotice={showNotice} /> : searchView === 'results' ? <SearchResultsPage query={searchQuery} onQueryChange={setSearchQuery} onSearch={() => setSearchView('results')} onBack={() => setSearchView('home')} onOpenDetail={(id) => { setSearchResultId(id); setSearchView('detail'); }} onNotice={showNotice} /> : <SearchDetailPage id={searchResultId} query={searchQuery} onBack={() => setSearchView('results')} onOpenDetail={(id) => setSearchResultId(id)} onNotice={showNotice} /> : operation?.kind === 'entry-confirm' ? <EntryConfirmPage id={operation.id} onBack={() => setOperation(null)} onNotice={showNotice} /> : operation?.kind === 'archive-detail' ? <ArchiveDetailPage id={operation.id} onBack={() => setOperation(null)} onNotice={showNotice} /> : operation?.kind === 'analysis-detail' ? <AnalysisDetailPage id={operation.id} onBack={() => setOperation(null)} onNotice={showNotice} /> : featureKey === 'entry' ? <EntryPage onPanel={setPanel} onOperation={setOperation} onNotice={showNotice} /> : featureKey === 'archive' ? <ArchivePage onOperation={setOperation} onNotice={showNotice} /> : featureKey === 'analysis' ? <AnalysisPage onOperation={setOperation} onNotice={showNotice} /> : <TypicalPage onPanel={setPanel} onNotice={showNotice} />}
          </section>
        </div>
      </main>
      {panel ? <SidePanel panel={panel} onClose={() => setPanel(null)} onNotice={showNotice} /> : null}
      {notice ? <div className="hn-toast">{notice}</div> : null}
    </div>
  );
});

export default Component;
