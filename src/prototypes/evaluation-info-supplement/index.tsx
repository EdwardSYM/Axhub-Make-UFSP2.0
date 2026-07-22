/**
 * @name 考核信息补充
 *
 * 参考资料：
 * - /src/prototypes/problem-library-function-list/index.tsx
 * - /src/prototypes/problem-library-function-list/spec.md
 * - /src/docs/业务页面设计规范.md
 */
import '../problem-library-function-list/style.css';
import './style.css';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  ClipboardCheck,
  FilePenLine,
  Filter,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';
import TopBar from '../../common/components/TopBar';
import type { AxureHandle, AxureProps, ConfigItem, EventItem, KeyDesc } from '../../common/axure-types';
import { createEventEmitter, getConfigValue } from '../../common/axure-types';

type EvidenceResult = '全部一致' | '存在异常';

type EvidenceIndicator = {
  id: string;
  level1: string;
  level2: string;
  name: string;
  score: string;
  method: string;
  requireEvidence: string;
  deadline: string;
  uploadTime: string;
  material: string;
  materialStatus: string;
  checkResult: EvidenceResult;
  issueCount: number;
  consistency: string;
  compliance: string;
  riskReason: string;
  requirementText: string;
  evidenceText: string;
  suggestion: string;
  dataStatus: string;
};

const EVENT_LIST: EventItem[] = [{ name: 'onNavigate', desc: '页面内导航', payload: 'string' }];
const ACTION_LIST: Array<{ name: string; desc: string; params?: string }> = [];
const VAR_LIST: KeyDesc[] = [
  { name: 'library_name', desc: '当前目录名称' },
  { name: 'page_key', desc: '当前页面 key' },
  { name: 'page_name', desc: '当前页面名称' },
  { name: 'view_mode', desc: '当前页面模式' },
];
const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '系统标题', initialValue: '财会监督系统' },
  { type: 'input', attributeId: 'topic_name', displayName: '页面主题', initialValue: '考评库（AI改造）' },
];

const SIDE_ITEMS = [
  { key: 'evaluation_info_supplement', label: '考核信息补充', href: '/prototypes/evaluation-info-supplement' },
  { key: 'evaluation_assessment', label: '考核评价', href: '/prototypes/evaluation-assessment' },
];

const INDICATORS: EvidenceIndicator[] = [
  {
    id: 'ev-01',
    level1: '机关运转/财务风险',
    level2: '公文处理',
    name: '严控发文数量',
    score: '1',
    method: '自动评分',
    requireEvidence: '否',
    deadline: '-',
    uploadTime: '-',
    material: '全口径发文统计表',
    materialStatus: '无需上传',
    checkResult: '全部一致',
    issueCount: 0,
    consistency: '佐证材料与指标要求一致',
    compliance: '未发现合规性问题',
    riskReason: '系统统计口径与考核指标一致，未发现需人工复核事项。',
    requirementText: '全口径文件超发的，1-4 件扣 0.1 分，5 件及以上每件扣 0.1 分。',
    evidenceText: '套表统计显示本期发文数量未超过指标阈值。',
    suggestion: '无需处理。',
    dataStatus: 'dataStatus: normal',
  },
  {
    id: 'ev-02',
    level1: '机关运转/财务风险',
    level2: '公文处理',
    name: '起草的发文无基础性错误',
    score: '0.5',
    method: '自动评分',
    requireEvidence: '是',
    deadline: '2025-02-04',
    uploadTime: '-',
    material: '发文抽查台账.xlsx',
    materialStatus: '未上传',
    checkResult: '存在异常',
    issueCount: 2,
    consistency: '未找到可比对附件',
    compliance: '材料缺失，不满足要求佐证',
    riskReason: '指标要求上传发文抽查台账，当前未上传材料，系统无法核验发文是否存在基础性错误。',
    requirementText: '不符合体例格式要求的，每件扣 0.1 分；未严格遵守行文规则的，每件扣 0.5 分。',
    evidenceText: '当前无附件，无法提取文件体例、行文规则和审批链条。',
    suggestion: '上传发文抽查台账或补充抽查说明后重新提交校验。',
    dataStatus: 'dataStatus: missing-evidence',
  },
  {
    id: 'ev-03',
    level1: '机关运转/财务风险',
    level2: '公文处理',
    name: '及时阅办收文',
    score: '0.5',
    method: '自动评分',
    requireEvidence: '是',
    deadline: '2025-02-04',
    uploadTime: '2025-02-03',
    material: '收文办理清单.pdf',
    materialStatus: '已上传',
    checkResult: '全部一致',
    issueCount: 0,
    consistency: '办理清单与填报口径一致',
    compliance: '上传时间符合考核要求',
    riskReason: '附件可识别收文时间、办结时间和责任处室，均满足当前指标要求。',
    requirementText: '未及时收文，超过 24 小时的，每件扣 0.1 分。',
    evidenceText: '收文办理清单显示抽查事项均在 24 小时内办理。',
    suggestion: '无需处理。',
    dataStatus: 'dataStatus: checked',
  },
  {
    id: 'ev-04',
    level1: '机关运转/财务风险',
    level2: '督办落实',
    name: '确保党中央、国务院重大决策部署和省委省政府领导同志重要批示落实',
    score: '2',
    method: '人工评分',
    requireEvidence: '是',
    deadline: '2025-02-04',
    uploadTime: '2025-03-04',
    material: '督办落实反馈报告.docx',
    materialStatus: '逾期上传',
    checkResult: '存在异常',
    issueCount: 3,
    consistency: '报告内容与指标事项部分不一致',
    compliance: '上传时间超过要求',
    riskReason: '佐证材料上传时间晚于要求时限，且报告中未覆盖全部批示事项的办理结果。',
    requirementText: '因贯彻落实或反馈报告不到位等原因，被省级政府领导或上级机关批评、惩戒、追责的，每件扣 1 分。',
    evidenceText: '反馈报告仅覆盖 3 项批示事项，其中 1 项未说明办结结论；上传时间为 2025-03-04。',
    suggestion: '补充未覆盖事项的办结说明，并核实逾期上传原因。',
    dataStatus: 'dataStatus: returned',
  },
  {
    id: 'ev-05',
    level1: '机关运转/财务风险',
    level2: '服务代表委员工作',
    name: '参加省“两会”服务，认真回答代表问询',
    score: '0.5',
    method: '人工评分',
    requireEvidence: '是',
    deadline: '2025-02-04',
    uploadTime: '2025-01-04',
    material: '代表委员问询答复记录.pdf',
    materialStatus: '已上传',
    checkResult: '存在异常',
    issueCount: 2,
    consistency: '附件未体现全部问询记录',
    compliance: '答复记录缺少确认环节',
    riskReason: '附件只包含部分问询答复摘要，缺少代表委员确认或会务组记录，无法证明全部问询均按要求答复。',
    requirementText: '代表委员对答复反馈为“不满意”，经沟通后仍不满意的，每条次扣 0.5 分。',
    evidenceText: '附件包含 6 条问询摘要，其中 2 条无确认记录，1 条仅有口头答复说明。',
    suggestion: '补充会务组确认记录或代表委员反馈截图。',
    dataStatus: 'dataStatus: partial-evidence',
  },
];

function navigateTo(path: string, emit: (name: string, payload?: string) => void) {
  emit('onNavigate', path);
  if (typeof window !== 'undefined') {
    window.location.href = path;
  }
}

function isReturnedIndicator(row: EvidenceIndicator) {
  return row.dataStatus.includes('returned');
}

function EvaluationSideMenu({ activeKey, emit, topicName }: { activeKey: string; emit: (name: string, payload?: string) => void; topicName: string }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`ufsp-feature-sidebar eval-ai-menu ${collapsed ? 'is-collapsed' : ''}`} style={{ width: collapsed ? 64 : 272 }}>
      <div className="ufsp-sidebar-head">
        <div className="ufsp-sidebar-brand">
          <span className="ufsp-sidebar-logo">
            <ClipboardCheck size={22} />
          </span>
          <div className="ufsp-sidebar-title">
            <span>考评库</span>
            <em>{topicName}</em>
          </div>
        </div>
        <button className="ufsp-sidebar-trigger" type="button" onClick={() => setCollapsed(!collapsed)} title="收起/展开">
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>
      <nav className="ufsp-feature-nav">
        <div className="ufsp-nav-group">
          {!collapsed && (
            <button className="ufsp-nav-group-title is-ancestor" type="button">
              <span className="ufsp-nav-parent-left">
                <span className="ufsp-nav-icon"><ClipboardCheck size={18} /></span>
                <span>考评填报评价</span>
              </span>
              <ChevronDown className="ufsp-nav-chevron" size={15} />
            </button>
          )}
          <div className="ufsp-nav-children">
            {SIDE_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`ufsp-nav-item ufsp-nav-child ${item.key === activeKey ? 'is-active' : ''}`}
                type="button"
                title={item.label}
                onClick={() => navigateTo(item.href, emit)}
              >
                <span className="ufsp-nav-icon">
                  {item.key === 'evaluation_info_supplement' ? <FilePenLine size={18} /> : <ClipboardCheck size={18} />}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}

function StatusTabs() {
  return (
    <div className="ufsp-ledger-tabs eval-ai-tabs">
      {['基本信息', '待提交（2）', '已提交（2）'].map((tab, index) => (
        <button key={tab} className={index === 1 ? 'is-active' : ''} type="button">
          {tab}
        </button>
      ))}
    </div>
  );
}

function EvidenceListPage({
  emit,
  topicName,
  selectedIds,
  setSelectedIds,
  openCheck,
}: {
  emit: (name: string, payload?: string) => void;
  topicName: string;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  openCheck: () => void;
}) {
  const returnedCount = INDICATORS.filter(isReturnedIndicator).length;
  const [showReturnToast, setShowReturnToast] = useState(returnedCount > 0);
  const toggleRow = (id: string) => {
    setSelectedIds(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  };

  useEffect(() => {
    if (!showReturnToast || !returnedCount) return undefined;
    const timer = window.setTimeout(() => setShowReturnToast(false), 5200);
    return () => window.clearTimeout(timer);
  }, [returnedCount, showReturnToast]);

  return (
    <main className="eval-ai-shell">
      <EvaluationSideMenu activeKey="evaluation_info_supplement" emit={emit} topicName={topicName} />
      <section className="eval-ai-content">
        <section className="ufsp-business-panel eval-ai-business-panel">
          <StatusTabs />
          <aside className="eval-ai-tree">
            <button type="button">2023年度甘肃省内控考评</button>
            <button type="button">2024年度甘肃省内控考评</button>
            <button className="active" type="button">2025年度甘肃省内控考评</button>
            <button type="button">2026年度甘肃省内控考评</button>
          </aside>

          <div className="eval-ai-list">
            {showReturnToast && returnedCount > 0 ? (
              <div className="eval-ai-list-alert-row">
                <div className="eval-ai-alert">
                  <span>您当前有 {returnedCount} 条被退回数据，请及时处理</span>
                  <button type="button" onClick={() => setShowReturnToast(false)} aria-label="关闭提醒"><X size={14} /></button>
                </div>
              </div>
            ) : null}
            <div className="eval-ai-toolbar">
              <div className="eval-ai-actions">
                <button className="ufsp-btn ufsp-btn-primary" type="button" onClick={openCheck}>
                  <ShieldAlert size={14} />
                  校验提交
                </button>
                <button className="ufsp-btn ufsp-btn-secondary" type="button"><Upload size={14} />批量上传</button>
                <button className="ufsp-btn ufsp-btn-secondary" type="button">导出</button>
              </div>
              <div className="eval-ai-tools">
                <span className="eval-ai-query-label">模糊查询：</span>
                <label className="ufsp-search-box ufsp-filter-input">
                  <Search size={14} />
                  <input placeholder="请输入" />
                </label>
                <button className="ufsp-icon-btn ufsp-icon-btn-primary" type="button" aria-label="查询"><Search size={14} /></button>
                <button className="ufsp-icon-btn ufsp-icon-btn-secondary" type="button" aria-label="刷新"><RefreshCw size={14} /></button>
                <button className="ufsp-btn ufsp-btn-secondary" type="button"><Filter size={14} />高级查询</button>
                <button className="ufsp-icon-btn ufsp-icon-btn-secondary" type="button" aria-label="列设置"><Settings2 size={14} /></button>
              </div>
            </div>

            <div className="eval-ai-table-scroll">
              <table className="eval-ai-table eval-ai-evidence-table">
                <thead>
                  <tr>
                    <th colSpan={2}>一级指标</th>
                    <th colSpan={2}>二级指标</th>
                    <th colSpan={5}>三级指标</th>
                    <th colSpan={4}>考核要求</th>
                    <th rowSpan={2}>考评要点/评分标准</th>
                  </tr>
                  <tr>
                    <th>名称</th>
                    <th>牵头处室</th>
                    <th>名称</th>
                    <th>分值</th>
                    <th>名称</th>
                    <th>分值</th>
                    <th>评分方式</th>
                    <th>要求佐证</th>
                    <th>上传时限</th>
                    <th>上传时间</th>
                    <th>操作</th>
                    <th>材料状态</th>
                    <th>AI 状态</th>
                  </tr>
                </thead>
                <tbody>
                  {INDICATORS.map((row) => {
                    const isSelected = selectedIds.includes(row.id);
                    const isReturned = isReturnedIndicator(row);
                    return (
                    <tr
                      key={row.id}
                      className={`${isReturned ? 'is-returned-row' : ''} ${isSelected ? 'is-selected-row' : ''}`}
                      aria-selected={isSelected}
                      onClick={() => toggleRow(row.id)}
                    >
                      <td title={row.level1}>{row.level1}</td>
                      <td>办公室</td>
                      <td>{row.level2}</td>
                      <td>{row.score}</td>
                      <td title={row.name}>{row.name}</td>
                      <td>{row.score}</td>
                      <td>{row.method}</td>
                      <td className="center">{row.requireEvidence}</td>
                      <td>{row.deadline}</td>
                      <td>{row.uploadTime}</td>
                      <td><button className="eval-ai-link" type="button" onClick={(event) => event.stopPropagation()}>上传提交</button></td>
                      <td>{row.materialStatus}</td>
                      <td className={isReturned || row.checkResult === '存在异常' ? 'risk-status' : ''}>
                        {isReturned ? '被退回' : row.checkResult === '存在异常' ? `${row.issueCount}项异常` : '全部一致'}
                      </td>
                      <td title={row.requirementText}>{row.requirementText}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="ufsp-pagination eval-ai-pagination">
              <span className="ufsp-page-total">共 5 条</span>
              <button className="ufsp-page-btn is-active" type="button">1</button>
              <button className="ufsp-page-size" type="button">20 条/页</button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function EvidenceCheckPage({
  emit,
  topicName,
  rows,
  activeId,
  setActiveId,
  selectedIds,
  setSelectedIds,
  back,
}: {
  emit: (name: string, payload?: string) => void;
  topicName: string;
  rows: EvidenceIndicator[];
  activeId: string;
  setActiveId: (id: string) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  back: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'pass' | 'risk'>('all');
  const [showReasoning, setShowReasoning] = useState(false);
  const current = rows.find((row) => row.id === activeId) || rows[0];
  const filteredRows = rows.filter((row) => {
    if (filter === 'pass') return row.checkResult === '全部一致';
    if (filter === 'risk') return row.checkResult === '存在异常';
    return true;
  });
  const riskCount = rows.filter((row) => row.checkResult === '存在异常').length;
  const issueCount = rows.reduce((sum, row) => sum + row.issueCount, 0);
  const consistencyCount = rows.filter((row) => row.consistency.includes('未') || row.consistency.includes('不一致')).length;
  const complianceCount = rows.filter((row) => row.compliance.includes('缺失') || row.compliance.includes('超过') || row.compliance.includes('缺少')).length;
  const currentFacts = current.checkResult === '存在异常'
    ? [
      {
        id: `${current.id}-consistency`,
        title: '待校验事实 1',
        kind: '一致性',
        status: current.consistency.includes('未') ? '未找到证据' : '内容不匹配',
        inputValue: current.requirementText,
        evidenceValue: `${current.material}：${current.evidenceText}`,
        reason: current.consistency,
      },
      {
        id: `${current.id}-compliance`,
        title: '待校验事实 2',
        kind: '合规性',
        status: current.compliance.includes('超过') ? '逾期上传' : '材料不完整',
        inputValue: `要求佐证：${current.requireEvidence}；上传时限：${current.deadline}`,
        evidenceValue: `材料状态：${current.materialStatus}；上传时间：${current.uploadTime}`,
        reason: current.compliance,
      },
    ]
    : [];

  const toggleSelected = (id: string) => {
    setSelectedIds(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  };

  return (
    <main className="eval-ai-shell">
      <EvaluationSideMenu activeKey="evaluation_info_supplement" emit={emit} topicName={topicName} />
      <section className="eval-ai-content">
        <section className="ufsp-business-panel ufsp-ai-page eval-ai-check-page">
      <header className="ufsp-form-head ufsp-ai-head">
        <div className="ufsp-form-title">
          <button className="ufsp-form-back" type="button" onClick={back} title="返回"><ArrowLeft size={17} /></button>
          <h1>
            <span>考核信息补充</span>
            <em>/ 智能校验</em>
          </h1>
        </div>
        <div className="ufsp-ai-head-actions">
          <button className="ufsp-btn ufsp-btn-secondary" type="button"><RefreshCw size={14} />刷新状态</button>
          <button className="ufsp-btn ufsp-btn-secondary" type="button" onClick={() => setShowReasoning(true)}>推理过程</button>
          <button className="ufsp-btn ufsp-btn-primary" type="button">提交</button>
        </div>
      </header>

      <section className="ufsp-ai-body eval-ai-check-workspace">
        <aside className="ufsp-ai-left eval-ai-check-side">
          <div className="ufsp-ai-overview">
            <div className="ufsp-ai-list-summary eval-ai-filter-row">
            {[
              { key: 'all', label: '全部数据', value: rows.length },
              { key: 'pass', label: '全部一致', value: rows.length - riskCount },
              { key: 'risk', label: '存在异常', value: riskCount },
            ].map((item) => (
              <button
                key={item.key}
                className={`${item.key === 'risk' ? 'warning' : ''} ${filter === item.key ? 'is-active' : ''}`}
                type="button"
                onClick={() => setFilter(item.key as typeof filter)}
              >
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </button>
            ))}
            </div>
          </div>
          <div className="ufsp-ai-row-snapshot eval-ai-indicator-snapshot">
            <div className="ufsp-ai-row-scroll">
              <table>
                <thead>
                  <tr>
                    <th className="ufsp-sticky-select" />
                    <th className="ufsp-sticky-index">#</th>
                    <th>指标名称</th>
                    <th>评分方式</th>
                    <th>要求佐证</th>
                    <th>上传时间</th>
                    <th>材料状态</th>
                    <th className="ufsp-snapshot-status">校验结果</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => {
                    const checked = selectedIds.includes(row.id);
                    return (
                      <tr
                        key={row.id}
                        className={`${row.id === current.id ? 'is-active' : ''} ${!checked ? 'is-unchecked' : ''} ${row.checkResult === '存在异常' ? 'is-exception' : ''}`}
                        onClick={() => setActiveId(row.id)}
                      >
                        <td className="ufsp-sticky-select">
                          <input
                            checked={checked}
                            type="checkbox"
                            onChange={(event) => {
                              event.stopPropagation();
                              toggleSelected(row.id);
                            }}
                            onClick={(event) => event.stopPropagation()}
                          />
                        </td>
                        <td className="ufsp-sticky-index">{String(index + 1).padStart(2, '0')}</td>
                        {[row.name, row.method, row.requireEvidence, row.uploadTime, row.materialStatus].map((value) => (
                          <td className="ufsp-snapshot-cell" data-full={value} key={`${row.id}-${value}`}>
                            <span>{value}</span>
                          </td>
                        ))}
                        <td className="ufsp-snapshot-status">{row.issueCount ? `${row.issueCount}项异常` : '全部一致'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </aside>

        <section className="ufsp-ai-right eval-ai-check-main">
          <section className={`ufsp-ai-result-card eval-ai-result-band ${current.checkResult === '全部一致' ? 'pass' : 'danger'}`}>
            <div className="ufsp-conclusion-layout">
              <div className="ufsp-conclusion-main">
                <span className="ufsp-card-label">AI校验结论</span>
                <h3>{current.checkResult}</h3>
                <p>{current.name}，{current.riskReason}</p>
              </div>
              <div className="ufsp-conclusion-stats is-three">
                <div><strong>{issueCount}</strong><span>异常事实</span></div>
                <div><strong>{complianceCount}</strong><span>合规性问题</span></div>
                <div><strong>{consistencyCount}</strong><span>一致性问题</span></div>
              </div>
            </div>
          </section>

          <section className="ufsp-ai-issues-card">
            <div className="ufsp-card-head">
              <div className="ufsp-card-titleline">
                <span className="ufsp-card-label">异常项明细</span>
                <p>按指标要求展示佐证材料待复核事实。</p>
              </div>
              {currentFacts.length ? <em>{current.issueCount} 条需复核</em> : null}
              <div className="ufsp-current-data-actions">
                <button className="ufsp-btn ufsp-btn-secondary" type="button">修改</button>
              </div>
            </div>
            {currentFacts.length ? (
              <div className="ufsp-issue-list">
                <article className="ufsp-issue-item">
                  <div className="ufsp-issue-title">
                    <div>
                      <span>{current.name}</span>
                      <small>字段结论：{current.checkResult}，拆解出 {currentFacts.length} 条待核验事实。</small>
                    </div>
                    <em>{current.level2}</em>
                  </div>
                  <div className="ufsp-claim-list">
                    {currentFacts.map((fact) => (
                      <div className="ufsp-claim-row" key={fact.id}>
                        <div className="ufsp-claim-head">
                          <span>{fact.title}</span>
                          <strong>{fact.kind}</strong>
                          <i className="ufsp-submitter-stance is-neutral">待处理</i>
                          <em>{fact.status}</em>
                        </div>
                        <dl className="ufsp-claim-body">
                          <div>
                            <dt>指标要求</dt>
                            <dd>{fact.inputValue}</dd>
                          </div>
                          <div>
                            <dt>佐证附件</dt>
                            <dd>{fact.evidenceValue}</dd>
                          </div>
                        </dl>
                        <dl className="ufsp-claim-judgement ufsp-audit-judgement">
                          <div>
                            <dt>判断原因</dt>
                            <dd>{fact.reason}</dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="ufsp-issue-item eval-ai-suggestion-card">
                  <div className="ufsp-issue-title">
                    <div>
                      <span>处理建议</span>
                      <small>{current.suggestion}</small>
                    </div>
                  </div>
                </article>
              </div>
            ) : (
              <div className="ufsp-ai-pass-empty">
                <CheckCircle2 size={18} />
                当前指标未发现合规性或一致性问题。
              </div>
            )}
          </section>
        </section>
      </section>

      {showReasoning ? (
        <aside className="eval-ai-drawer">
          <div className="eval-ai-drawer-head">
            <strong>推理过程</strong>
            <button type="button" onClick={() => setShowReasoning(false)}><X size={16} /></button>
          </div>
          <div className="eval-ai-reasoning-list">
            <div><strong>1. 识别指标要求</strong><p>提取要求佐证、上传时限、评分方式和扣分标准。</p></div>
            <div><strong>2. 解析佐证材料</strong><p>读取附件名称、上传时间和材料正文，标记缺失或逾期材料。</p></div>
            <div><strong>3. 一致性比对</strong><p>比对填报指标、附件内容和指标评分标准是否互相支撑。</p></div>
            <div><strong>4. 合规性判断</strong><p>检查材料是否满足上传要求、时限要求和必备证明要素。</p></div>
          </div>
        </aside>
      ) : null}
        </section>
      </section>
    </main>
  );
}

const Component = forwardRef<AxureHandle, AxureProps>(function Component(props, ref) {
  const [viewMode, setViewMode] = useState<'list' | 'check'>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>(['ev-02', 'ev-04', 'ev-05']);
  const [submittedIds, setSubmittedIds] = useState<string[]>(['ev-02', 'ev-04', 'ev-05']);
  const [activeId, setActiveId] = useState('ev-02');
  const emit = createEventEmitter(props.onEvent);
  const systemTitle = getConfigValue(props.config, 'title', '财会监督系统');
  const topicName = getConfigValue(props.config, 'topic_name', '考评库（AI改造）');
  const checkedRows = useMemo(
    () => INDICATORS.filter((row) => selectedIds.includes(row.id)),
    [selectedIds],
  );
  const submittedRows = useMemo(
    () => INDICATORS.filter((row) => submittedIds.includes(row.id)),
    [submittedIds],
  );

  const openCheck = () => {
    const nextRows = checkedRows.length ? checkedRows : [INDICATORS[0]];
    setActiveId(nextRows[0].id);
    const nextIds = nextRows.map((row) => row.id);
    setSelectedIds(nextIds);
    setSubmittedIds(nextIds);
    setViewMode('check');
  };

  useImperativeHandle(ref, () => ({
    getVar: (name: string) => {
      if (name === 'library_name') return '考评库（AI改造）';
      if (name === 'page_key') return 'evaluation_info_supplement';
      if (name === 'page_name') return '考核信息补充';
      if (name === 'view_mode') return viewMode;
      return undefined;
    },
    fireAction: (name: string) => {
      if (name === 'open_check') openCheck();
    },
    eventList: EVENT_LIST,
    actionList: ACTION_LIST,
    varList: VAR_LIST,
    configList: CONFIG_LIST,
    dataList: [],
  }));

  return (
    <div className="eval-ai-page">
      <TopBar title={systemTitle} onNavigate={(path) => navigateTo(path, emit)} />
      {viewMode === 'list' ? (
        <EvidenceListPage
          emit={emit}
          topicName={topicName}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          openCheck={openCheck}
        />
      ) : (
        <EvidenceCheckPage
          emit={emit}
          topicName={topicName}
          rows={submittedRows.length ? submittedRows : [INDICATORS[0]]}
          activeId={activeId}
          setActiveId={setActiveId}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          back={() => setViewMode('list')}
        />
      )}
    </div>
  );
});

export default Component;
