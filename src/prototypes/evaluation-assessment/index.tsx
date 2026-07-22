/**
 * @name 考核评价
 *
 * 参考资料：
 * - /src/prototypes/evaluation-info-supplement/index.tsx
 * - /src/docs/业务页面设计规范.md
 */
import '../problem-library-function-list/style.css';
import '../evaluation-info-supplement/style.css';
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calculator,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  ClipboardCheck,
  FilePenLine,
  RefreshCw,
  Save,
  XCircle,
} from 'lucide-react';
import TopBar from '../../common/components/TopBar';
import type { AxureHandle, AxureProps, ConfigItem, EventItem, KeyDesc } from '../../common/axure-types';
import { createEventEmitter, getConfigValue } from '../../common/axure-types';

type ScoreMetric = {
  id: string;
  group: string;
  name: string;
  field: string;
  standard: string;
};

type ScoreRow = {
  id: string;
  category: string;
  office: string;
  values: Record<string, string>;
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

const METRICS: ScoreMetric[] = [
  {
    id: 'limit_count',
    group: '严控发文数量（1分）',
    name: '全口径文件超发',
    field: '发文限额数',
    standard: '1-4 件扣 0.1 分，5 件及以上每件扣 0.1 分。',
  },
  {
    id: 'actual_count',
    group: '严控发文数量（1分）',
    name: '实际发文数',
    field: '实际发文数',
    standard: '与套表统计发文数量保持一致。',
  },
  {
    id: 'format_error',
    group: '起草的发文无基础性错误（0.5分）',
    name: '格式体例问题',
    field: '件数',
    standard: '不符合体例格式要求的，每件扣 0.1 分。',
  },
  {
    id: 'procedure_error',
    group: '起草的发文无基础性错误（0.5分）',
    name: '行文程序问题',
    field: '件数',
    standard: '行文未按程序审批的，每件扣 0.5 分。',
  },
  {
    id: 'reply_timeout',
    group: '及时阅办收文（0.5分）',
    name: '收文超期',
    field: '件数',
    standard: '未及时收文超过 24 小时，每件扣 0.1 分。',
  },
];

const SCORE_ROWS: ScoreRow[] = [
  {
    id: 'budget-general',
    category: '预算业务类',
    office: '综合处',
    values: { limit_count: '120', actual_count: '118', format_error: '0', procedure_error: '0', reply_timeout: '1' },
  },
  {
    id: 'budget-admin',
    category: '预算业务类',
    office: '预算处',
    values: { limit_count: '96', actual_count: '101', format_error: '2', procedure_error: '0', reply_timeout: '0' },
  },
  {
    id: 'budget-law',
    category: '预算业务类',
    office: '政法处',
    values: { limit_count: '80', actual_count: '80', format_error: '0', procedure_error: '1', reply_timeout: '0' },
  },
  {
    id: 'overall-office',
    category: '综合业务类',
    office: '办公室',
    values: { limit_count: '140', actual_count: '137', format_error: '1', procedure_error: '0', reply_timeout: '2' },
  },
  {
    id: 'overall-tax',
    category: '综合业务类',
    office: '税政处',
    values: { limit_count: '60', actual_count: '60', format_error: '0', procedure_error: '0', reply_timeout: '0' },
  },
];

const STAT_VALUES: Record<string, Record<string, string>> = {
  'budget-general': { limit_count: '120', actual_count: '118', format_error: '0', procedure_error: '0', reply_timeout: '1' },
  'budget-admin': { limit_count: '96', actual_count: '99', format_error: '1', procedure_error: '0', reply_timeout: '0' },
  'budget-law': { limit_count: '80', actual_count: '80', format_error: '0', procedure_error: '0', reply_timeout: '0' },
  'overall-office': { limit_count: '140', actual_count: '137', format_error: '1', procedure_error: '0', reply_timeout: '1' },
  'overall-tax': { limit_count: '60', actual_count: '60', format_error: '0', procedure_error: '0', reply_timeout: '0' },
};

function navigateTo(path: string, emit: (name: string, payload?: string) => void) {
  emit('onNavigate', path);
  if (typeof window !== 'undefined') {
    window.location.href = path;
  }
}

function EvaluationSideMenu({ emit, topicName }: { emit: (name: string, payload?: string) => void; topicName: string }) {
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
                className={`ufsp-nav-item ufsp-nav-child ${item.key === 'evaluation_assessment' ? 'is-active' : ''}`}
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

function ScoreEntryPage({
  emit,
  topicName,
  values,
  setValues,
  openCheck,
}: {
  emit: (name: string, payload?: string) => void;
  topicName: string;
  values: Record<string, Record<string, string>>;
  setValues: (values: Record<string, Record<string, string>>) => void;
  openCheck: () => void;
}) {
  const updateValue = (rowId: string, metricId: string, nextValue: string) => {
    setValues({
      ...values,
      [rowId]: {
        ...values[rowId],
        [metricId]: nextValue,
      },
    });
  };

  return (
    <main className="eval-ai-shell">
      <EvaluationSideMenu emit={emit} topicName={topicName} />
      <section className="eval-ai-content">
        <section className="ufsp-business-panel eval-ai-business-panel">
        <div className="ufsp-ledger-tabs eval-ai-tabs">
          {['基本信息', '基础表填报', '未完成（2）', '已完成（2）'].map((tab, index) => (
            <button key={tab} className={index === 1 ? 'is-active' : ''} type="button">
              {tab}
            </button>
          ))}
        </div>
          <aside className="eval-ai-tree">
            <button type="button">2023年度甘肃省内控考评</button>
            <button type="button">2024年度甘肃省内控考评</button>
            <button className="active" type="button">2025年度甘肃省内控考评</button>
            <button type="button">2026年度甘肃省内控考评</button>
          </aside>

          <div className="eval-ai-list">
            <div className="eval-ai-toolbar">
              <div className="eval-ai-actions" />
              <div className="eval-ai-header-actions">
                <button className="ufsp-btn" type="button" disabled>修改</button>
                <button className="ufsp-btn ufsp-btn-primary" type="button" onClick={openCheck}>
                  <Save size={14} />
                  保存
                </button>
              </div>
            </div>
            <div className="eval-ai-score-table-wrap">
              <table className="eval-ai-table eval-ai-score-table">
                <thead>
                  <tr>
                    <th className="category-col" rowSpan={3}>业务类别</th>
                    <th className="office-col" rowSpan={3}>处室</th>
                    {METRICS.map((metric) => (
                      <th key={metric.id} title={metric.group}>{metric.group}</th>
                    ))}
                  </tr>
                  <tr>
                    {METRICS.map((metric) => (
                      <th key={metric.id} title={metric.standard}>{metric.name}</th>
                    ))}
                  </tr>
                  <tr>
                    {METRICS.map((metric) => (
                      <th key={metric.id}>{metric.field}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SCORE_ROWS.map((row) => (
                    <tr key={row.id}>
                      <td className="category-cell">{row.category}</td>
                      <td className="office-cell">{row.office}</td>
                      {METRICS.map((metric) => (
                        <td key={metric.id}>
                          <input
                            value={values[row.id]?.[metric.id] || ''}
                            placeholder="请输入"
                            onChange={(event) => updateValue(row.id, metric.id, event.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function ScoreCheckPage({
  emit,
  topicName,
  values,
  statsLoaded,
  setStatsLoaded,
  back,
}: {
  emit: (name: string, payload?: string) => void;
  topicName: string;
  values: Record<string, Record<string, string>>;
  statsLoaded: boolean;
  setStatsLoaded: (loaded: boolean) => void;
  back: () => void;
}) {
  const comparisons = useMemo(() => (
    SCORE_ROWS.flatMap((row) => (
      METRICS.map((metric) => {
        const inputValue = values[row.id]?.[metric.id] || '';
        const statValue = statsLoaded ? STAT_VALUES[row.id]?.[metric.id] || '' : '';
        const matched = statsLoaded && inputValue === statValue;
        return {
          id: `${row.id}-${metric.id}`,
          office: row.office,
          category: row.category,
          metricName: metric.name,
          standard: metric.standard,
          inputValue,
          statValue,
          matched,
          diff: statsLoaded && inputValue && statValue ? Number(inputValue) - Number(statValue) : null,
        };
      })
    ))
  ), [statsLoaded, values]);
  const mismatchCount = comparisons.filter((item) => statsLoaded && !item.matched).length;

  return (
    <main className="eval-ai-shell">
      <EvaluationSideMenu emit={emit} topicName={topicName} />
      <section className="eval-ai-content">
        <section className="ufsp-business-panel ufsp-ai-page eval-ai-check-page">
          <header className="ufsp-form-head ufsp-ai-head">
            <div className="ufsp-form-title">
              <button className="ufsp-form-back" type="button" onClick={back} title="返回"><ArrowLeft size={17} /></button>
              <h1>
                <span>考核评价</span>
                <em>/ 数据一致性校验</em>
              </h1>
            </div>
            <div className="ufsp-ai-head-actions">
              <button className="ufsp-btn ufsp-btn-secondary" type="button" onClick={() => setStatsLoaded(true)}><RefreshCw size={14} />刷新数据</button>
              <button className="ufsp-btn ufsp-btn-primary" type="button">提交</button>
            </div>
          </header>

          <section className="ufsp-ai-body eval-score-check">
            <div className="ufsp-ai-right eval-score-check-main">
              <section className={`ufsp-ai-result-card eval-ai-result-band ${statsLoaded ? (mismatchCount === 0 ? 'pass' : 'danger') : 'warning'}`}>
                <div className="ufsp-conclusion-layout">
                  <div className="ufsp-conclusion-main">
                    <span className="ufsp-card-label">AI校验结论</span>
                    <h3>{statsLoaded ? (mismatchCount ? '存在异常' : '全部一致') : '等待刷新数据'}</h3>
                    <p>
                      {statsLoaded
                        ? `已对比中间表填报值和套表统计值，发现 ${mismatchCount} 项数值不一致。`
                        : '保存后已进入校验页，套表统计值尚未带入，请点击刷新数据后查看比对结果。'}
                    </p>
                  </div>
                  <div className="ufsp-conclusion-stats">
                    <div><strong>{SCORE_ROWS.length}</strong><span>处室</span></div>
                    <div><strong>{comparisons.length}</strong><span>指标字段</span></div>
                    <div><strong>{statsLoaded ? comparisons.length - mismatchCount : 0}</strong><span>一致</span></div>
                    <div><strong>{statsLoaded ? mismatchCount : 0}</strong><span>不一致</span></div>
                  </div>
                </div>
              </section>

              <section className="ufsp-ai-issues-card eval-score-issues-card">
                <div className="ufsp-card-head">
                  <div className="ufsp-card-titleline">
                    <span className="ufsp-card-label">数值比对明细</span>
                    <p>按处室和指标展示中间表填报值与套表统计值。</p>
                  </div>
                  {statsLoaded ? <em>{mismatchCount} 条需复核</em> : null}
                </div>
                {statsLoaded ? (
                  <div className="eval-score-compare-list">
                    {comparisons.map((item) => (
                      <div key={item.id} className={`eval-score-compare-row ${!item.matched ? 'risk' : ''}`}>
                        <div className="eval-score-identity">
                          <strong>{item.office} · {item.metricName}</strong>
                          <span>{item.category} / {item.standard}</span>
                        </div>
                        <div className="eval-score-value">
                          <span>中间表填报值</span>
                          <strong>{item.inputValue || '-'}</strong>
                        </div>
                        <div className="eval-score-value">
                          <span>套表统计值</span>
                          <strong>{item.statValue || '-'}</strong>
                        </div>
                        <div className="eval-score-value">
                          <span>差异</span>
                          <strong>{item.diff !== null ? item.diff : '-'}</strong>
                        </div>
                        <div className="eval-score-result">
                          {item.matched ? (
                            <><CheckCircle2 size={15} />一致</>
                          ) : (
                            <><XCircle size={15} />不一致</>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ufsp-ai-pass-empty eval-score-waiting">
                    <Calculator size={18} />
                    当前尚未拉取套表统计值，请点击右上角刷新数据。
                  </div>
                )}
              </section>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

const Component = forwardRef<AxureHandle, AxureProps>(function Component(props, ref) {
  const [viewMode, setViewMode] = useState<'entry' | 'check'>('entry');
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [values, setValues] = useState<Record<string, Record<string, string>>>(
    SCORE_ROWS.reduce<Record<string, Record<string, string>>>((acc, row) => {
      acc[row.id] = row.values;
      return acc;
    }, {}),
  );
  const emit = createEventEmitter(props.onEvent);
  const systemTitle = getConfigValue(props.config, 'title', '财会监督系统');
  const topicName = getConfigValue(props.config, 'topic_name', '考评库（AI改造）');

  const openCheck = () => {
    setStatsLoaded(false);
    setViewMode('check');
  };

  useImperativeHandle(ref, () => ({
    getVar: (name: string) => {
      if (name === 'library_name') return '考评库（AI改造）';
      if (name === 'page_key') return 'evaluation_assessment';
      if (name === 'page_name') return '考核评价';
      if (name === 'view_mode') return viewMode;
      return undefined;
    },
    fireAction: (name: string) => {
      if (name === 'open_check') openCheck();
      if (name === 'refresh_data') setStatsLoaded(true);
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
      {viewMode === 'entry' ? (
        <ScoreEntryPage emit={emit} topicName={topicName} values={values} setValues={setValues} openCheck={openCheck} />
      ) : (
        <ScoreCheckPage
          emit={emit}
          topicName={topicName}
          values={values}
          statsLoaded={statsLoaded}
          setStatsLoaded={setStatsLoaded}
          back={() => setViewMode('entry')}
        />
      )}
    </div>
  );
});

export default Component;
