/**
 * @name 问题库
 *
 * 参考资料：
 * - /rules/ufsp-page-governance.md
 * - /rules/confirmed-baselines.md
 * - /src/docs/业务页面设计规范.md
 * - /src/prototypes/hunan-case-library/index.tsx
 */
import '../case-library-ai/style.css';
import '../hunan-case-library/style.css';
import './style.css';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Database,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FolderTree,
  History,
  Import,
  ListFilter,
  Paperclip,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import TopBar from '../../common/components/TopBar';
import type { AxureHandle, AxureProps, ConfigItem, EventItem, KeyDesc } from '../../common/axure-types';
import { createEventEmitter, getConfigValue } from '../../common/axure-types';

type FeatureKey = 'collect' | 'query';
type SourceKey = 'all' | 'inspection' | 'audit' | 'special' | 'daily' | 'external';
type RegionKey = 'all' | '省本级' | '岳阳市' | '衡阳市' | '株洲市' | '常德市';
type TableAction = 'edit' | 'rectify' | 'updateResult' | 'detail';
type Feature = { key: FeatureKey; name: string; desc: string; Icon: LucideIcon };
type ExtraField = { key: string; label: string; example: string };
type OperationState =
  | null
  | { kind: 'import' }
  | { kind: 'confirm'; id?: string; manual?: boolean }
  | { kind: 'detail'; id: string }
  | { kind: 'rectify'; id: string };

type ProblemRow = {
  id: string;
  code: string;
  title: string;
  source: Exclude<SourceKey, 'all'>;
  region: string;
  unit: string;
  type: string;
  foundDate: string;
  rectifyStatus: '未回录' | '已回录' | '已销号';
  amount: string;
  fact: string;
  extras: Record<string, string>;
};

const FEATURES: Feature[] = [
  { key: 'collect', name: '问题归集登记', desc: '问题登记和整改结果登记', Icon: FileCheck2 },
  { key: 'query', name: '问题查询管理', desc: '按区划和统一字段查询问题台账', Icon: ClipboardList },
];

const SOURCE_META: Record<SourceKey, { name: string; template: string; fields: ExtraField[] }> = {
  all: { name: '全部来源', template: '通用问题字段', fields: [] },
  inspection: { name: '巡视移交', template: '巡视移交问题模板', fields: [
    { key: 'batch', label: '巡视批次', example: '省委第六轮巡视' },
    { key: 'group', label: '巡视组', example: '省委第二巡视组' },
    { key: 'transferDate', label: '移交日期', example: '2026-03-18' },
  ] },
  audit: { name: '审计移交', template: '审计移交问题模板', fields: [
    { key: 'project', label: '审计项目', example: '2025年度预算执行审计' },
    { key: 'auditCode', label: '审计文号', example: '湘审财报〔2026〕8号' },
    { key: 'auditYear', label: '审计年度', example: '2025' },
  ] },
  special: { name: '专项检查', template: '专项检查问题模板', fields: [
    { key: 'specialName', label: '专项名称', example: '地方政府债务专项检查' },
    { key: 'checkProject', label: '检查项目', example: '专项债券资金使用管理' },
    { key: 'period', label: '检查期间', example: '2025.01—2025.12' },
  ] },
  daily: { name: '日常监督', template: '日常监督问题模板', fields: [
    { key: 'theme', label: '监督主题', example: '财政暂付款清理' },
    { key: 'channel', label: '发现渠道', example: '运行监控' },
    { key: 'rule', label: '监控规则', example: '暂付款余额连续两年未下降' },
  ] },
  external: { name: '外部移交', template: '外部移交问题模板', fields: [
    { key: 'transferUnit', label: '移交单位', example: '省审计厅' },
    { key: 'transferCode', label: '移交文号', example: '湘移字〔2026〕12号' },
    { key: 'transferDate', label: '移交日期', example: '2026-04-12' },
  ] },
};

const PROBLEMS: ProblemRow[] = [
  { id: 'P01', code: '湘问〔2026〕0018号', title: '专项债券资金支付进度与建设进度不匹配', source: 'special', region: '岳阳市', unit: '岳阳市某园区建设单位', type: '预算执行', foundDate: '2026-04-26', rectifyStatus: '未回录', amount: '1,280万元', fact: '部分项目资金支付进度明显快于实际建设进度，支付依据与工程进度资料未形成有效对应。', extras: { specialName: '地方政府债务专项检查', checkProject: '专项债券资金使用管理', period: '2025.01—2025.12' } },
  { id: 'P02', code: '湘问〔2026〕0017号', title: '政府采购合同履约验收资料不完整', source: 'audit', region: '省本级', unit: '湖南省某事业单位', type: '政府采购', foundDate: '2026-04-22', rectifyStatus: '已回录', amount: '286万元', fact: '部分采购项目未形成完整履约验收记录，付款材料不能充分证明合同履行情况。', extras: { project: '2025年度预算执行审计', auditCode: '湘审财报〔2026〕8号', auditYear: '2025' } },
  { id: 'P03', code: '湘问〔2026〕0016号', title: '财政暂付款长期挂账未及时清理', source: 'daily', region: '衡阳市', unit: '衡阳市某市直单位', type: '预算管理', foundDate: '2026-04-18', rectifyStatus: '已销号', amount: '860万元', fact: '财政暂付款余额连续两年未明显下降，部分款项缺少分年度清理计划和责任安排。', extras: { theme: '财政暂付款清理', channel: '运行监控', rule: '暂付款余额连续两年未下降' } },
  { id: 'P04', code: '湘问〔2026〕0015号', title: '国有资产出租收入未及时上缴', source: 'inspection', region: '株洲市', unit: '株洲市某行政单位', type: '资产管理', foundDate: '2026-04-15', rectifyStatus: '未回录', amount: '74万元', fact: '部分国有资产出租收入未按规定及时上缴财政，存在坐收坐支风险。', extras: { batch: '省委第六轮巡视', group: '省委第二巡视组', transferDate: '2026-03-18' } },
  { id: 'P05', code: '湘问〔2026〕0014号', title: '惠民补贴对象资格复核不到位', source: 'external', region: '常德市', unit: '常德市某县财政局', type: '民生资金', foundDate: '2026-04-12', rectifyStatus: '已回录', amount: '38万元', fact: '补贴对象资格信息未及时复核，存在人员信息重复和不符合条件人员继续领取补贴的情况。', extras: { transferUnit: '省审计厅', transferCode: '湘移字〔2026〕12号', transferDate: '2026-04-12' } },
];

const EVENT_LIST: EventItem[] = [{ name: 'onNavigate', desc: '页面内导航', payload: 'string' }];
const VAR_LIST: KeyDesc[] = [
  { name: 'feature_key', desc: '当前湖南问题库功能 key' },
  { name: 'feature_name', desc: '当前湖南问题库功能名称' },
];
const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '系统标题', initialValue: '财会监督系统' },
  { type: 'input', attributeId: 'topic_name', displayName: '页面主题', initialValue: '湖南问题库' },
];

function initialFeature(): FeatureKey {
  if (typeof window === 'undefined') return 'collect';
  const value = new URLSearchParams(window.location.search).get('feature');
  return value === 'query' || value === 'ledger' ? 'query' : 'collect';
}

function FeatureMark({ Icon, active }: { Icon: LucideIcon; active?: boolean }) {
  return <span className={`case-nav-icon ${active ? 'is-active' : ''}`} aria-hidden="true"><Icon size={17} /></span>;
}

function OperationHead({ title, subtitle, onBack, actions }: { title: string; subtitle: string; onBack: () => void; actions: React.ReactNode }) {
  return <div className="hn-operation-head"><div className="hn-operation-title"><button type="button" className="ufsp-form-back" onClick={onBack} aria-label="返回列表" title="返回列表"><ArrowLeft size={17} /></button><div><strong>{title}</strong><span>{subtitle}</span></div></div><div className="hn-operation-actions">{actions}</div></div>;
}

function StatusTabs({ values, active, onChange }: { values: string[]; active: string; onChange: (value: string) => void }) {
  return <div className="case-tabs">{values.map((item) => { const value = item.split('（')[0]; return <button type="button" key={item} className={active === value ? 'is-active' : ''} onClick={() => onChange(value)}>{item}</button>; })}</div>;
}

function SearchTools({ onNotice }: { onNotice: (message: string) => void }) {
  return <div className="case-toolbar-right"><label className="ufsp-search-box ufsp-filter-input"><input placeholder="请输入问题标题、编号或责任单位" aria-label="问题查询" /></label><button type="button" className="ufsp-icon-btn ufsp-icon-btn-primary" title="查询" onClick={() => onNotice('已按当前条件查询演示数据')}><Search size={14} /></button><button type="button" className="ufsp-icon-btn ufsp-icon-btn-secondary" title="刷新" onClick={() => onNotice('演示数据已刷新')}><RefreshCw size={14} /></button><button type="button" className="ufsp-icon-btn ufsp-icon-btn-secondary" title="筛选" onClick={() => onNotice('已展开高级筛选演示')}><ListFilter size={14} /></button><button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已打开查询方案演示')}>查询方案</button><button type="button" className="ufsp-icon-btn ufsp-icon-btn-secondary" title="列设置" onClick={() => onNotice('已打开列设置演示')}><Settings2 size={14} /></button></div>;
}

function Pagination({ total }: { total: number }) {
  return <div className="case-pagination"><span className="ufsp-page-total">共 {total} 条</span><button type="button" className="ufsp-page-btn">上一页</button><button type="button" className="ufsp-page-btn is-active">1</button><button type="button" className="ufsp-page-btn">下一页</button><button type="button" className="ufsp-page-size">20 条/页</button></div>;
}

function SourceCatalog({ active, onChange, includeAll = true }: { active: SourceKey; onChange: (value: SourceKey) => void; includeAll?: boolean }) {
  const keys = (Object.keys(SOURCE_META) as SourceKey[]).filter((key) => includeAll || key !== 'all');
  return <aside className="hn-catalog hp-source-catalog"><div className="hn-catalog-search"><Search size={14} /><input placeholder="搜索问题来源" /></div><div className="hn-catalog-list">{keys.map((key, index) => <button type="button" key={key} className={active === key ? 'is-active' : ''} onClick={() => onChange(key)}>{index === 0 && includeAll ? <FolderTree size={15} /> : <FileText size={15} />}<span>{SOURCE_META[key].name}</span><em>{key === 'all' ? '128' : [24, 31, 28, 26, 19][Math.max(0, index - 1)]}</em></button>)}</div></aside>;
}

function RegionCatalog({ active, onChange }: { active: RegionKey; onChange: (value: RegionKey) => void }) {
  const regions: Array<{ key: RegionKey; name: string; count: number; child?: boolean }> = [
    { key: 'all', name: '全部区划', count: 128 },
    { key: '省本级', name: '省本级', count: 31 },
    { key: '岳阳市', name: '岳阳市', count: 16, child: true },
    { key: '衡阳市', name: '衡阳市', count: 12, child: true },
    { key: '株洲市', name: '株洲市', count: 14, child: true },
    { key: '常德市', name: '常德市', count: 11, child: true },
  ];
  return <aside className="hn-catalog hp-source-catalog hp-region-catalog"><div className="hn-catalog-search"><Search size={14} /><input placeholder="搜索所属区划" /></div><div className="hn-catalog-list">{regions.map((item) => <button type="button" key={item.key} className={`${active === item.key ? 'is-active' : ''} ${item.child ? 'is-child' : ''}`} onClick={() => onChange(item.key)}>{item.key === 'all' ? <FolderTree size={15} /> : <FileText size={15} />}<span>{item.name}</span><em>{item.count}</em></button>)}</div></aside>;
}

function ProblemTable({ rows, source, showStatus, action, onOperation }: { rows: ProblemRow[]; source: SourceKey; showStatus?: boolean; action: TableAction; onOperation: (operation: Exclude<OperationState, null>) => void }) {
  const visibleRows = source === 'all' ? rows : rows.filter((row) => row.source === source);
  const openRow = (row: ProblemRow) => onOperation(action === 'edit' ? { kind: 'confirm', id: row.id } : action === 'detail' ? { kind: 'detail', id: row.id } : { kind: 'rectify', id: row.id });
  const actionLabel = action === 'edit' ? '查看编辑' : action === 'rectify' ? '登记结果' : action === 'updateResult' ? '查看更新' : '查看详情';
  return <div className="case-table-wrap hp-table-wrap"><table className={`case-table hp-problem-table ${showStatus ? 'has-status' : ''}`}><colgroup><col className="hp-col-title" /><col className="hp-col-code" /><col className="hp-col-region" /><col className="hp-col-source" /><col className="hp-col-unit" /><col className="hp-col-type" />{showStatus ? <col className="hp-col-status" /> : null}<col className="hp-col-action" /></colgroup><thead><tr><th className="hp-col-title">问题标题</th><th className="hp-col-code">问题编号</th><th className="hp-col-region">所属区划</th><th className="hp-col-source">问题来源</th><th className="hp-col-unit">责任单位</th><th className="hp-col-type">问题类型</th>{showStatus ? <th className="hp-col-status">整改状态</th> : null}<th className="case-col-actions hp-col-action">操作</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td className="hp-col-title"><button type="button" className="case-title-link" onClick={() => openRow(row)} title={row.title}>{row.title}</button></td><td className="hp-col-code" title={row.code}>{row.code}</td><td className="hp-col-region">{row.region}</td><td className="hp-col-source"><span className="case-badge is-ai">{SOURCE_META[row.source].name}</span></td><td className="hp-col-unit" title={row.unit}>{row.unit}</td><td className="hp-col-type">{row.type}</td>{showStatus ? <td className="hp-col-status"><span className={`case-badge ${row.rectifyStatus === '已销号' ? 'is-success' : row.rectifyStatus === '未回录' ? 'is-warning' : 'is-ai'}`}>{row.rectifyStatus}</span></td> : null}<td className="case-col-actions hp-col-action"><button type="button" onClick={() => openRow(row)}>{actionLabel}</button></td></tr>)}</tbody></table>{visibleRows.length === 0 ? <div className="hp-empty-row">当前条件下暂无演示数据。</div> : null}</div>;
}

function CollectionPage({ onOperation, onNotice }: { onOperation: (operation: Exclude<OperationState, null>) => void; onNotice: (message: string) => void }) {
  const [tab, setTab] = useState('问题登记');
  const [source, setSource] = useState<SourceKey>('all');
  const rows = tab === '未回录结果' ? PROBLEMS.filter((row) => row.rectifyStatus === '未回录') : tab === '已回录结果' ? PROBLEMS.filter((row) => row.rectifyStatus !== '未回录') : PROBLEMS;
  const action: TableAction = tab === '问题登记' ? 'edit' : tab === '未回录结果' ? 'rectify' : 'updateResult';
  return <div className="case-workspace hn-module-page"><StatusTabs values={['问题登记（128）', '未回录结果（42）', '已回录结果（86）']} active={tab} onChange={setTab} /><div className="hn-split-workspace"><SourceCatalog active={source} onChange={setSource} /><section className="hn-list-region"><div className="case-list-toolbar"><div className="case-toolbar-left">{tab === '问题登记' ? <><button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => onOperation({ kind: 'import' })}><Import size={14} />批量导入</button><button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => onOperation({ kind: 'confirm', manual: true })}><Plus size={14} />人工录入</button></> : null}<button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice(`已导出${tab}清单`)}><Download size={14} />导出</button></div><SearchTools onNotice={onNotice} /></div><ProblemTable rows={rows} source={source} showStatus={tab !== '问题登记'} action={action} onOperation={onOperation} /><Pagination total={tab === '问题登记' ? 128 : tab === '未回录结果' ? 42 : 86} /></section></div></div>;
}

function QueryPage({ onOperation, onNotice }: { onOperation: (operation: Exclude<OperationState, null>) => void; onNotice: (message: string) => void }) {
  const [tab, setTab] = useState('全部');
  const [region, setRegion] = useState<RegionKey>('all');
  const statusRows = tab === '未回录' ? PROBLEMS.filter((row) => row.rectifyStatus === '未回录') : tab === '已回录' ? PROBLEMS.filter((row) => row.rectifyStatus === '已回录') : tab === '已销号' ? PROBLEMS.filter((row) => row.rectifyStatus === '已销号') : PROBLEMS;
  const rows = region === 'all' ? statusRows : statusRows.filter((row) => row.region === region);
  return <div className="case-workspace hn-module-page"><StatusTabs values={['全部（128）', '未回录（42）', '已回录（51）', '已销号（35）']} active={tab} onChange={setTab} /><div className="hn-split-workspace"><RegionCatalog active={region} onChange={setRegion} /><section className="hn-list-region"><div className="case-list-toolbar"><div className="case-toolbar-left"><button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('已导出查询结果')}><Download size={14} />导出</button></div><SearchTools onNotice={onNotice} /></div><ProblemTable rows={rows} source="all" showStatus action="detail" onOperation={onOperation} /><Pagination total={tab === '全部' ? 128 : tab === '未回录' ? 42 : tab === '已回录' ? 51 : 35} /></section></div></div>;
}

function SourceSelect({ value, onChange }: { value: Exclude<SourceKey, 'all'>; onChange: (value: Exclude<SourceKey, 'all'>) => void }) {
  return <span className="hn-select-control"><select value={value} onChange={(event) => onChange(event.target.value as Exclude<SourceKey, 'all'>)}>{(Object.keys(SOURCE_META) as SourceKey[]).filter((key) => key !== 'all').map((key) => <option key={key} value={key}>{SOURCE_META[key].name}</option>)}</select><ChevronDown size={14} /></span>;
}

function ImportPage({ onBack, onConfirm, onNotice }: { onBack: () => void; onConfirm: () => void; onNotice: (message: string) => void }) {
  const [source, setSource] = useState<Exclude<SourceKey, 'all'>>('audit');
  const meta = SOURCE_META[source];
  return <div className="case-workspace hn-operation-page"><OperationHead title="问题归集登记 / 批量导入" subtitle="选择来源模板，预览原始数据后继续补充登记信息" onBack={onBack} actions={<><button type="button" className="ufsp-btn" onClick={() => onNotice('已保存本次导入草稿')}><Save size={14} />保存草稿</button><button type="button" className="ufsp-btn ufsp-btn-primary" onClick={onConfirm}>继续补充</button></>} /><div className="hn-operation-body hp-import-page"><section className="hp-import-settings"><div className="hn-section-caption"><div><FileSpreadsheet size={16} /><strong>导入设置</strong></div><span>预置来源模板</span></div><div className="hp-import-controls"><label><span>问题来源</span><SourceSelect value={source} onChange={setSource} /></label><label><span>适用模板</span><input value={meta.template} readOnly /></label><div className="hp-file-selected"><FileSpreadsheet size={18} /><span><strong>2025年度审计移交问题清单.xlsx</strong><em>28 条数据 · 36 KB</em></span><button type="button" onClick={() => onNotice('已重新选择导入文件')}>重新选择</button></div></div></section><div className="hp-import-summary hp-import-summary-compact"><div><CircleAlert size={15} /><span><strong>待补充 3 条</strong><em>责任单位或发现日期缺失</em></span></div><div><AlertCircle size={15} /><span><strong>疑似重复 1 条</strong><em>标题与责任单位均相同</em></span></div></div><section className="hp-import-preview"><div className="hn-section-caption"><div><strong>原始数据预览</strong><em>前 4 条</em></div><span>黄色单元格需要补充</span></div><div className="hp-preview-scroll"><table><thead><tr><th>序号</th><th>问题标题</th><th>责任单位</th><th>问题类型</th>{meta.fields.map((field) => <th key={field.key}>{field.label}</th>)}<th>数据检查</th></tr></thead><tbody>{PROBLEMS.slice(0, 4).map((row, index) => <tr key={row.id}><td>{index + 1}</td><td>{row.title}</td><td className={index === 2 ? 'is-warning' : ''}>{index === 2 ? '待补充' : row.unit}</td><td>{row.type}</td>{meta.fields.map((field) => <td key={field.key}>{row.source === source ? row.extras[field.key] : field.example}</td>)}<td><span className={`case-badge ${index === 2 ? 'is-warning' : 'is-success'}`}>{index === 2 ? '信息待补充' : '信息完整'}</span></td></tr>)}</tbody></table></div></section></div></div>;
}

function ProblemForm({ source, row, manual }: { source: Exclude<SourceKey, 'all'>; row: ProblemRow; manual?: boolean }) {
  const meta = SOURCE_META[source];
  return <div className="hp-form-stack"><section className="hn-form-section"><div className="hn-section-caption"><div><strong>问题基础信息</strong></div><span>统一通用字段</span></div><div className="hn-operation-form"><label className="wide"><span>* 问题标题</span><input defaultValue={manual ? '' : row.title} placeholder="请输入问题标题" /></label><label><span>* 所属区划</span><input value={manual ? '湖南省财政厅' : row.region} readOnly /></label><label><span>* 问题来源</span><input value={meta.name} readOnly /></label><label><span>* 责任单位</span><input defaultValue={manual ? '' : row.unit} placeholder="请输入责任单位" /></label><label><span>* 问题类型</span><select defaultValue={row.type}><option>预算执行</option><option>预算管理</option><option>政府采购</option><option>资产管理</option><option>民生资金</option></select></label><label><span>涉及金额</span><input defaultValue={manual ? '' : row.amount} /></label><label><span>* 发现日期</span><input type="date" defaultValue={manual ? '' : row.foundDate} /></label><label className="wide"><span>* 问题事实</span><textarea defaultValue={manual ? '' : row.fact} placeholder="请输入问题事实" /></label></div></section><section className="hn-form-section"><div className="hn-section-caption"><div><strong>来源表单信息</strong></div><span>{meta.template}</span></div><div className="hn-operation-form">{meta.fields.map((field) => <label key={field.key}><span>{field.label}</span><input defaultValue={manual ? '' : row.extras[field.key] || field.example} /></label>)}</div></section><section className="hn-form-section"><div className="hn-section-caption"><div><Paperclip size={15} /><strong>来源材料</strong></div><button type="button"><Upload size={14} />上传材料</button></div><div className="hp-files"><div><FileText size={17} /><span><strong>{meta.name}问题清单.xlsx</strong><em>原始导入文件 · 36 KB</em></span><button type="button"><Eye size={14} />预览</button></div><div><FileText size={17} /><span><strong>问题移交材料.pdf</strong><em>来源附件 · 2.4 MB</em></span><button type="button"><Eye size={14} />预览</button></div></div></section></div>;
}

function ConfirmPage({ id, manual, onBack, onNotice }: { id?: string; manual?: boolean; onBack: () => void; onNotice: (message: string) => void }) {
  const row = PROBLEMS.find((item) => item.id === id) || PROBLEMS[0];
  const [source, setSource] = useState<Exclude<SourceKey, 'all'>>(manual ? 'special' : row.source);
  return <div className="case-workspace hn-operation-page"><OperationHead title={`问题归集登记 / ${manual ? '人工录入' : '信息补充'}`} subtitle={manual ? '选择问题来源后填写通用字段和来源扩展字段' : '核对导入数据并补充完整，保存形成统一问题台账'} onBack={onBack} actions={<><button type="button" className="ufsp-btn" onClick={() => onNotice('已暂存当前问题')}>暂存</button><button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => { onNotice('问题登记信息已保存'); onBack(); }}>保存登记</button></>} /><div className="hn-operation-body hp-confirm-page"><section className="hp-source-form-section"><h2>来源选择</h2><div className="hp-confirm-top"><label><span>问题来源</span><SourceSelect value={source} onChange={setSource} /></label><div><FileSpreadsheet size={15} /><span>当前使用：<strong>{SOURCE_META[source].template}</strong></span><em>切换来源后，扩展字段同步更新</em></div></div></section><div className="hp-confirm-layout">{manual ? null : <aside className="hp-original-data"><div className="hn-section-caption"><div><FileText size={16} /><strong>原始导入数据</strong></div><span>只读</span></div><dl><div><dt>原始标题</dt><dd>{row.title}</dd></div><div><dt>原始单位</dt><dd>{row.unit}</dd></div><div><dt>问题事实</dt><dd>{row.fact}</dd></div><div><dt>来源文件</dt><dd>{SOURCE_META[row.source].name}问题清单.xlsx · 第 18 行</dd></div></dl><div className="hp-data-check"><strong>数据质量检查</strong><span className="is-done"><CheckCircle2 size={14} />标题、来源和问题事实已识别</span><span><CircleAlert size={14} />责任单位名称建议人工核对</span><span><CheckCircle2 size={14} />未发现完全重复问题</span></div></aside>}<main><ProblemForm source={source} row={row} manual={manual} /></main></div></div></div>;
}

function DetailPage({ id, onBack, onNotice }: { id: string; onBack: () => void; onNotice: (message: string) => void }) {
  const row = PROBLEMS.find((item) => item.id === id) || PROBLEMS[0];
  const [tab, setTab] = useState<'base' | 'original' | 'rectify' | 'history'>('base');
  const meta = SOURCE_META[row.source];
  return <div className="case-workspace hn-operation-page"><OperationHead title="问题查询管理 / 问题详情" subtitle={`${row.code} · ${row.region} · ${meta.name}`} onBack={onBack} actions={<button type="button" className="ufsp-btn" onClick={() => onNotice('已导出问题详情')}><Download size={14} />导出</button>} /><div className="hn-operation-body hp-detail-page"><section className="hp-detail-summary"><div><span>问题标题</span><strong>{row.title}</strong></div><div><span>所属区划</span><strong>{row.region}</strong></div><div><span>问题来源</span><strong>{meta.name}</strong></div><div><span>整改状态</span><strong className="is-blue">{row.rectifyStatus}</strong></div></section><div className="hn-detail-tabs"><button type="button" className={tab === 'base' ? 'is-active' : ''} onClick={() => setTab('base')}>标准问题信息</button><button type="button" className={tab === 'original' ? 'is-active' : ''} onClick={() => setTab('original')}>原始表单数据</button><button type="button" className={tab === 'rectify' ? 'is-active' : ''} onClick={() => setTab('rectify')}>整改结果</button><button type="button" className={tab === 'history' ? 'is-active' : ''} onClick={() => setTab('history')}>更新记录</button></div><section className="hp-detail-content">{tab === 'base' ? <dl className="hp-detail-list"><div><dt>问题编号</dt><dd>{row.code}</dd></div><div><dt>所属区划</dt><dd>{row.region}</dd></div><div><dt>问题类型</dt><dd>{row.type}</dd></div><div><dt>发现日期</dt><dd>{row.foundDate}</dd></div><div><dt>责任单位</dt><dd>{row.unit}</dd></div><div><dt>涉及金额</dt><dd>{row.amount}</dd></div><div className="wide"><dt>问题事实</dt><dd>{row.fact}</dd></div></dl> : tab === 'original' ? <div className="hp-original-form-view"><div className="hp-original-form-meta"><span><b>原始模板</b>{meta.template}</span><span><b>原始文件</b>{meta.name}问题清单.xlsx</span><span><b>导入批次</b>2026-04-26 第1批</span><button type="button" onClick={() => onNotice('已打开原始文件预览')}><Eye size={14} />查看原文件</button></div><dl className="hp-detail-list"><div><dt>原问题标题</dt><dd>{row.title}</dd></div><div><dt>原责任单位</dt><dd>{row.unit}</dd></div>{meta.fields.map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{row.extras[field.key]}</dd></div>)}<div className="wide"><dt>原始问题描述</dt><dd>{row.fact}</dd></div></dl></div> : tab === 'rectify' ? <div className="hp-rectify-read"><div><span>整改情况</span><strong>{row.rectifyStatus === '未回录' ? '尚未登记线下整改结果' : '责任单位已完成问题核实，补充有关资料并完善内部管理制度。'}</strong></div><div><span>整改材料</span><strong>{row.rectifyStatus === '未回录' ? '—' : '整改情况报告.pdf、整改佐证材料.zip'}</strong></div><div><span>销号结果</span><strong>{row.rectifyStatus === '已销号' ? '线下已完成销号，结果已登记' : '尚未销号'}</strong></div></div> : <div className="hp-history"><div><i /><span><strong>问题基础信息更新</strong><em>张敏 · 2026-04-28 15:20</em></span></div><div><i /><span><strong>问题登记保存</strong><em>李晨 · 2026-04-27 10:08</em></span></div><div><i /><span><strong>批量导入问题数据</strong><em>系统 · 2026-04-26 09:32</em></span></div></div>}</section></div></div>;
}

function RectifyPage({ id, onBack, onNotice }: { id: string; onBack: () => void; onNotice: (message: string) => void }) {
  const row = PROBLEMS.find((item) => item.id === id) || PROBLEMS[0];
  return <div className="case-workspace hn-operation-page"><OperationHead title="问题归集登记 / 整改结果登记" subtitle="登记线下最终整改情况、佐证材料和销号结果" onBack={onBack} actions={<><button type="button" className="ufsp-btn" onClick={() => onNotice('已保存整改结果草稿')}>保存草稿</button><button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => { onNotice('整改及销号结果已保存'); onBack(); }}>保存登记</button></>} /><div className="hn-operation-body hp-rectify-page"><div className="hp-form-stack"><section className="hn-form-section"><div className="hn-section-caption"><div><strong>整改结果</strong></div><span>{row.code} · {row.region} · {row.unit}</span></div><div className="hn-operation-form"><label><span>* 整改状态</span><select defaultValue="已完成整改"><option>未完成整改</option><option>部分完成整改</option><option>已完成整改</option></select></label><label><span>* 实际完成时间</span><input type="date" defaultValue="2026-07-18" /></label><label className="wide"><span>* 整改情况</span><textarea defaultValue="责任单位已完成问题核实，补充工程进度和支付依据对应材料，完善资金支付审核及资料归档机制。" /></label><label className="wide"><span>* 整改措施</span><textarea defaultValue="一是补充缺失的验收和工程计量资料；二是建立付款前资料校验清单；三是完善资金支付审核责任记录。" /></label></div></section><section className="hn-form-section"><div className="hn-section-caption"><div><Paperclip size={15} /><strong>整改材料</strong></div><button type="button"><Upload size={14} />上传材料</button></div><div className="hp-files"><div><FileText size={17} /><span><strong>整改情况报告.pdf</strong><em>2.1 MB · 2026-07-18</em></span><button type="button"><Eye size={14} />预览</button></div><div><FileText size={17} /><span><strong>整改佐证材料.zip</strong><em>8.6 MB · 2026-07-18</em></span><button type="button"><Download size={14} />下载</button></div></div></section><section className="hn-form-section"><div className="hn-section-caption"><div><CheckCircle2 size={15} /><strong>销号结果</strong></div><span>线下销号结果登记</span></div><div className="hn-operation-form"><label><span>销号结论</span><select defaultValue="同意销号"><option>尚未销号</option><option>同意销号</option><option>暂缓销号</option></select></label><label><span>销号时间</span><input type="date" defaultValue="2026-07-25" /></label><label className="wide"><span>销号说明</span><textarea defaultValue="经线下核验，问题对应整改事项已经完成，整改材料能够支撑整改结论，同意销号。" /></label></div><div className="hp-closeout-file"><FileCheck2 size={17} /><span><strong>问题销号确认单.pdf</strong><em>销号材料 · 1.4 MB</em></span><button type="button"><Upload size={14} />更换材料</button></div></section></div></div></div>;
}

const Component = forwardRef<AxureHandle, AxureProps>(function Component(props, ref) {
  const config = props.config || {};
  const emitEvent = createEventEmitter(props.onEvent);
  const title = getConfigValue<string>(config, 'title', '财会监督系统');
  const topicName = getConfigValue<string>(config, 'topic_name', '湖南问题库');
  const [featureKey, setFeatureKey] = useState<FeatureKey>(initialFeature);
  const [collapsed, setCollapsed] = useState(false);
  const [operation, setOperation] = useState<OperationState>(null);
  const [notice, setNotice] = useState('');
  const activeFeature = FEATURES.find((item) => item.key === featureKey) || FEATURES[0];

  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2200); };
  const switchFeature = (key: FeatureKey) => { setFeatureKey(key); setOperation(null); const href = `/prototypes/hunan-problem-library?feature=${key}`; window.history.replaceState({}, '', href); emitEvent('onNavigate', href); };
  const onTopNavigate = (href: string) => { emitEvent('onNavigate', href); window.location.href = href; };

  useImperativeHandle(ref, () => ({
    getVar(name: string) { if (name === 'feature_key') return activeFeature.key; if (name === 'feature_name') return activeFeature.name; return undefined; },
    fireAction() { return undefined; }, eventList: EVENT_LIST, actionList: [], varList: VAR_LIST, configList: CONFIG_LIST, dataList: [],
  }), [activeFeature]);

  const content = operation?.kind === 'import' ? <ImportPage onBack={() => setOperation(null)} onConfirm={() => setOperation({ kind: 'confirm', id: 'P02' })} onNotice={showNotice} />
    : operation?.kind === 'confirm' ? <ConfirmPage id={operation.id} manual={operation.manual} onBack={() => setOperation(null)} onNotice={showNotice} />
    : operation?.kind === 'detail' ? <DetailPage id={operation.id} onBack={() => setOperation(null)} onNotice={showNotice} />
    : operation?.kind === 'rectify' ? <RectifyPage id={operation.id} onBack={() => setOperation(null)} onNotice={showNotice} />
    : featureKey === 'collect' ? <CollectionPage onOperation={setOperation} onNotice={showNotice} /> : <QueryPage onOperation={setOperation} onNotice={showNotice} />;

  return <div className="case-library-page hunan-case-library hunan-problem-library"><TopBar title={title} onNavigate={onTopNavigate} /><main className="case-layout"><div className="case-frame"><aside className={`case-sidebar ${collapsed ? 'is-collapsed' : ''}`} style={{ width: collapsed ? 64 : 272 }}><div className="case-sidebar-head" title={topicName}><div className="case-sidebar-brand"><span className="case-sidebar-logo"><Database size={20} /></span><div className="case-sidebar-title"><span>问题库</span><em>湖南演示</em></div></div><button type="button" className="case-sidebar-trigger" aria-label={collapsed ? '展开问题库菜单' : '收起问题库菜单'} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button></div><nav className="case-nav" aria-label="湖南问题库功能菜单">{FEATURES.map((item) => <button type="button" key={item.key} className={`case-nav-item ${featureKey === item.key ? 'is-active' : ''}`} title={collapsed ? item.name : item.desc} onClick={() => switchFeature(item.key)}><FeatureMark Icon={item.Icon} active={featureKey === item.key} />{collapsed ? null : <span>{item.name}</span>}</button>)}</nav></aside><section className="case-content">{content}</section></div></main>{notice ? <div className="hn-toast">{notice}</div> : null}</div>;
});

export default Component;
