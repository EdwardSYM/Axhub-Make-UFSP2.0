/**
 * @name 主题分析
 *
 * 参考资料：
 * - /src/prototypes/theme-analysis/spec.md
 * - /src/prototypes/global-overview/spec.md
 */
import './style.css';
import '../../themes/ufsp-sky/globals.css';
import React, { useMemo, useState } from 'react';
import {
  Activity,
  BookOpenCheck,
  ChevronRight,
  FileWarning,
  Layers3,
  LineChart,
  MapPinned,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UsersRound,
  Zap,
} from 'lucide-react';
import TopBar from '../../common/components/TopBar';

type RiskLevel = '高' | '中' | '低';
type DataStatus = '已接入' | '部分接入' | '模拟数据';

type Theme = {
  name: string;
  system: '专项监督' | '日常监督' | '财会考评';
  risk: RiskLevel;
  avgScore: number;
  problems: number;
  overdue: number;
  ruleHits: number;
  lowSubjects: number;
  rectificationRate: number;
  status: DataStatus;
  reason: string;
};

type SubjectTheme = {
  subject: string;
  theme: string;
  risk: RiskLevel;
  score: number;
  problems: number;
  overdue: number;
};

type TrendPoint = {
  label: string;
  value: string;
  delta: string;
  tone: 'risk' | 'good';
  points: number[];
};

const themes: Theme[] = [
  {
    name: '地方政府债务',
    system: '专项监督',
    risk: '高',
    avgScore: 70,
    problems: 236,
    overdue: 32,
    ruleHits: 812,
    lowSubjects: 8,
    rectificationRate: 73,
    status: '已接入',
    reason: '债务余额变动、隐性债务疑点和超期整改叠加，A区财政、B区财政风险突出。',
  },
  {
    name: '高标准农田建设资金使用',
    system: '专项监督',
    risk: '高',
    avgScore: 72,
    problems: 198,
    overdue: 27,
    ruleHits: 604,
    lowSubjects: 6,
    rectificationRate: 76,
    status: '部分接入',
    reason: '项目资金支付、验收资料和线下检查问题归集仍不完整。',
  },
  {
    name: '基层三保',
    system: '日常监督',
    risk: '高',
    avgScore: 73,
    problems: 176,
    overdue: 21,
    ruleHits: 736,
    lowSubjects: 5,
    rectificationRate: 79,
    status: '已接入',
    reason: '库款保障、工资发放和民生支出进度存在连续两期波动。',
  },
  {
    name: '预算执行监控',
    system: '日常监督',
    risk: '中',
    avgScore: 78,
    problems: 142,
    overdue: 13,
    ruleHits: 1124,
    lowSubjects: 4,
    rectificationRate: 84,
    status: '已接入',
    reason: '规则命中数量较高，但整改闭环效率较稳定。',
  },
  {
    name: '行政事业单位国有资产处置',
    system: '专项监督',
    risk: '中',
    avgScore: 76,
    problems: 121,
    overdue: 11,
    ruleHits: 388,
    lowSubjects: 3,
    rectificationRate: 82,
    status: '模拟数据',
    reason: '资产处置审批、评估和入账环节存在口径待补数据。',
  },
  {
    name: '财会监督考评',
    system: '财会考评',
    risk: '低',
    avgScore: 84,
    problems: 54,
    overdue: 4,
    ruleHits: 126,
    lowSubjects: 1,
    rectificationRate: 91,
    status: '部分接入',
    reason: '评价任务整体平稳，主要关注低分指标解释和案例沉淀。',
  },
];

const subjectThemes: SubjectTheme[] = [
  { subject: 'A区财政', theme: '地方政府债务', risk: '高', score: 62, problems: 58, overdue: 12 },
  { subject: 'B区财政', theme: '地方政府债务', risk: '高', score: 68, problems: 42, overdue: 9 },
  { subject: 'D区财政', theme: '地方政府债务', risk: '中', score: 74, problems: 29, overdue: 5 },
  { subject: 'E预算单位', theme: '地方政府债务', risk: '低', score: 86, problems: 3, overdue: 0 },
  { subject: 'F处室', theme: '地方政府债务', risk: '低', score: 88, problems: 2, overdue: 0 },
  { subject: 'A区财政', theme: '高标准农田建设资金使用', risk: '中', score: 76, problems: 24, overdue: 4 },
  { subject: 'B区财政', theme: '高标准农田建设资金使用', risk: '高', score: 64, problems: 51, overdue: 11 },
  { subject: 'D区财政', theme: '高标准农田建设资金使用', risk: '中', score: 78, problems: 16, overdue: 3 },
  { subject: 'E预算单位', theme: '高标准农田建设资金使用', risk: '低', score: 82, problems: 8, overdue: 1 },
  { subject: 'F处室', theme: '高标准农田建设资金使用', risk: '低', score: 85, problems: 5, overdue: 0 },
  { subject: 'A区财政', theme: '基层三保', risk: '高', score: 66, problems: 39, overdue: 7 },
  { subject: 'B区财政', theme: '基层三保', risk: '中', score: 75, problems: 17, overdue: 2 },
  { subject: 'D区财政', theme: '基层三保', risk: '中', score: 76, problems: 21, overdue: 4 },
  { subject: 'E预算单位', theme: '基层三保', risk: '低', score: 84, problems: 5, overdue: 0 },
  { subject: 'F处室', theme: '基层三保', risk: '低', score: 87, problems: 4, overdue: 0 },
  { subject: 'A区财政', theme: '预算执行监控', risk: '中', score: 74, problems: 25, overdue: 3 },
  { subject: 'B区财政', theme: '预算执行监控', risk: '中', score: 73, problems: 13, overdue: 2 },
  { subject: 'C部门', theme: '预算执行监控', risk: '高', score: 69, problems: 31, overdue: 6 },
  { subject: 'E预算单位', theme: '预算执行监控', risk: '中', score: 77, problems: 24, overdue: 4 },
  { subject: 'F处室', theme: '预算执行监控', risk: '低', score: 86, problems: 6, overdue: 0 },
  { subject: 'A区财政', theme: '行政事业单位国有资产处置', risk: '低', score: 82, problems: 8, overdue: 1 },
  { subject: 'B区财政', theme: '行政事业单位国有资产处置', risk: '低', score: 81, problems: 5, overdue: 0 },
  { subject: 'C部门', theme: '行政事业单位国有资产处置', risk: '高', score: 65, problems: 36, overdue: 6 },
  { subject: 'E预算单位', theme: '行政事业单位国有资产处置', risk: '中', score: 75, problems: 21, overdue: 3 },
  { subject: 'F处室', theme: '行政事业单位国有资产处置', risk: '低', score: 88, problems: 3, overdue: 0 },
];

const trendItems: TrendPoint[] = [
  { label: '主题问题数', value: '236', delta: '+9.6%', tone: 'risk', points: [22, 28, 31, 29, 38, 44, 52] },
  { label: '规则命中', value: '812', delta: '+12.1%', tone: 'risk', points: [35, 39, 44, 51, 49, 56, 63] },
  { label: '整改完成率', value: '73%', delta: '+3.4%', tone: 'good', points: [48, 51, 55, 60, 64, 68, 72] },
  { label: '评价均分', value: '70', delta: '-2.0', tone: 'risk', points: [76, 75, 73, 74, 72, 71, 70] },
];

const riskClass: Record<RiskLevel, string> = {
  高: 'risk-high',
  中: 'risk-mid',
  低: 'risk-low',
};

const statusClass: Record<DataStatus, string> = {
  已接入: 'status-ready',
  部分接入: 'status-partial',
  模拟数据: 'status-mock',
};

const getQueryValue = (key: string) => {
  try {
    return new URLSearchParams(window.location.search).get(key) || '';
  } catch {
    return '';
  }
};

function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <span className={`risk-badge ${riskClass[risk]}`}>{risk}风险</span>;
}

function StatusBadge({ status }: { status: DataStatus }) {
  return <span className={`status-badge ${statusClass[status]}`}>{status}</span>;
}

function MiniSparkline({ points, tone }: { points: number[]; tone: 'good' | 'risk' }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(max - min, 1);
  const graphPoints = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 30 - ((point - min) / range) * 23;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className="mini-sparkline" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <polyline className={`mini-line mini-line-${tone}`} points={graphPoints} />
    </svg>
  );
}

const ThemeAnalysis: React.FC = () => {
  const [period, setPeriod] = useState('2026年度');
  const [scope, setScope] = useState('全省');
  const [system, setSystem] = useState('全部体系');
  const [analysisMode, setAnalysisMode] = useState('当前态势');
  const [selectedThemeName, setSelectedThemeName] = useState(getQueryValue('theme') || '地方政府债务');

  const selectedTheme = themes.find((item) => item.name === selectedThemeName) || themes[0];
  const themeCells = subjectThemes.filter((item) => item.theme === selectedTheme.name);

  const summary = useMemo(() => {
    const highRisk = themes.filter((item) => item.risk === '高').length;
    const problems = themes.reduce((sum, item) => sum + item.problems, 0);
    const overdue = themes.reduce((sum, item) => sum + item.overdue, 0);
    const hits = themes.reduce((sum, item) => sum + item.ruleHits, 0);
    return { highRisk, problems, overdue, hits };
  }, []);

  const handleNavigate = (href: string) => {
    try {
      window.location.href = href;
    } catch {
      // 原型容器内忽略导航异常。
    }
  };

  const navigateSubject = (subject: string) => {
    handleNavigate(`/prototypes/theme-analysis?subject=${encodeURIComponent(subject)}&theme=${encodeURIComponent(selectedTheme.name)}`);
  };

  return (
    <div className="theme-analysis-page">
      <TopBar title="财会监督系统" onNavigate={handleNavigate} />
      <main>
        <section className="analysis-hero">
          <div className="hero-title">
            <h1>主题分析</h1>
            <p>围绕监督主题查看全辖风险分布、低分主体、规则命中和整改闭环情况，判断下一步重点管哪里。</p>
          </div>
          <div className="hero-signal-grid">
            <div className="signal-card signal-alert">
              <span>高风险主题</span>
              <strong>{summary.highRisk} 个</strong>
              <em>债务、农田资金、基层三保</em>
            </div>
            <div className="signal-card">
              <span>问题总量</span>
              <strong>{summary.problems}</strong>
              <em>跨主题累计问题</em>
            </div>
            <div className="signal-card">
              <span>超期整改</span>
              <strong>{summary.overdue}</strong>
              <em>主要集中在专项监督</em>
            </div>
            <div className="signal-card">
              <span>规则命中</span>
              <strong>{summary.hits}</strong>
              <em>疑点转问题率 21.8%</em>
            </div>
          </div>
        </section>

        <section className="filter-panel">
          <div className="filter-left">
            <div className="filter-group">
              <span>统计期</span>
              <select value={period} onChange={(event) => setPeriod(event.target.value)}>
                <option>2026年度</option>
                <option>2026年一季度</option>
                <option>2026年4月</option>
              </select>
            </div>
            <div className="filter-group">
              <span>管理范围</span>
              <select value={scope} onChange={(event) => setScope(event.target.value)}>
                <option>全省</option>
                <option>全市</option>
                <option>本级</option>
                <option>下辖区县</option>
              </select>
            </div>
            <div className="filter-group">
              <span>监督体系</span>
              <select value={system} onChange={(event) => setSystem(event.target.value)}>
                <option>全部体系</option>
                <option>日常监督</option>
                <option>专项监督</option>
                <option>财会考评</option>
              </select>
            </div>
          </div>
          <div className="analysis-toggle">
            {['当前态势', '趋势变化', '目标对比'].map((item) => (
              <button key={item} type="button" className={analysisMode === item ? 'analysis-option-active' : ''} onClick={() => setAnalysisMode(item)}>
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="context-strip">
          <MapPinned className="h-4 w-4 text-[#165DFF]" />
          <span>当前范围：{scope}｜统计周期：{period}｜监督体系：{system}｜已锁定主题：{selectedTheme.name}</span>
        </section>

        <section className="top-grid">
          <div className="soft-panel theme-list-panel">
            <div className="section-head">
              <div>
                <div className="section-kicker">主题风险卡片</div>
                <div className="section-title">先管哪里</div>
              </div>
              <Layers3 className="h-5 w-5 text-[#165DFF]" />
            </div>
            <div className="theme-card-grid">
              {themes.map((item) => (
                <button key={item.name} type="button" className={`theme-card ${selectedTheme.name === item.name ? 'theme-card-active' : ''}`} onClick={() => setSelectedThemeName(item.name)}>
                  <span className="theme-card-head">
                    <span>{item.name}</span>
                    <RiskBadge risk={item.risk} />
                  </span>
                  <span className="theme-card-meta">
                    <span>{item.system}</span>
                    <span>均分 {item.avgScore}</span>
                    <span>问题 {item.problems}</span>
                  </span>
                  <span className="theme-card-foot">
                    <StatusBadge status={item.status} />
                    <span>{item.lowSubjects} 个低分主体</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="soft-panel profile-panel">
            <div className="section-head">
              <div>
                <div className="section-kicker">主题画像</div>
                <div className="section-title">{selectedTheme.name}</div>
              </div>
              <BookOpenCheck className="h-5 w-5 text-[#165DFF]" />
            </div>
            <div className="profile-score">
              <div>
                <span>评价均分</span>
                <strong>{selectedTheme.avgScore}</strong>
              </div>
              <RiskBadge risk={selectedTheme.risk} />
            </div>
            <div className="profile-metrics">
              <div><span>问题总数</span><strong>{selectedTheme.problems}</strong></div>
              <div><span>规则命中</span><strong>{selectedTheme.ruleHits}</strong></div>
              <div><span>低分主体</span><strong>{selectedTheme.lowSubjects}</strong></div>
              <div><span>整改完成率</span><strong>{selectedTheme.rectificationRate}%</strong></div>
            </div>
            <p className="profile-reason">{selectedTheme.reason}</p>
          </div>

          <div className="soft-panel ranking-panel">
            <div className="section-head">
              <div>
                <div className="section-kicker">主题下主体表现</div>
                <div className="section-title">哪些主体风险突出</div>
              </div>
              <UsersRound className="h-5 w-5 text-[#165DFF]" />
            </div>
            <div className="subject-rank-list">
              {themeCells
                .sort((a, b) => b.problems - a.problems)
                .map((item, index) => (
                  <button key={item.subject} type="button" className="subject-rank-row" onClick={() => navigateSubject(item.subject)}>
                    <span className="rank-index">{index + 1}</span>
                    <span className="rank-main">
                      <span className="rank-title">
                        <span>{item.subject}</span>
                        <RiskBadge risk={item.risk} />
                      </span>
                      <span className="rank-meta">{item.score}分｜{item.problems}条问题｜超期{item.overdue}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
                  </button>
                ))}
            </div>
          </div>
        </section>

        <section className="bottom-grid">
          <div className="soft-panel heatmap-panel">
            <div className="section-head">
              <div>
                <div className="section-kicker">主题-主体热力图</div>
                <div className="section-title">某个主题下哪些主体表现较差</div>
              </div>
              <Activity className="h-5 w-5 text-[#165DFF]" />
            </div>
            <div className="heatmap">
              <div className="heatmap-header" />
              {themes.slice(0, 5).map((theme) => (
                <button key={theme.name} type="button" className={`heatmap-theme ${selectedTheme.name === theme.name ? 'heatmap-theme-active' : ''}`} onClick={() => setSelectedThemeName(theme.name)}>
                  {theme.name}
                </button>
              ))}
              {['A区财政', 'B区财政', 'C部门', 'D区财政', 'E预算单位'].map((subject) => (
                <React.Fragment key={subject}>
                  <button type="button" className="heatmap-subject" onClick={() => navigateSubject(subject)}>{subject}</button>
                  {themes.slice(0, 5).map((theme) => {
                    const cell = subjectThemes.find((item) => item.subject === subject && item.theme === theme.name);
                    return (
                      <button
                        key={`${subject}-${theme.name}`}
                        type="button"
                        className={`heat-cell ${cell ? riskClass[cell.risk] : 'risk-low'}`}
                        onClick={() => {
                          setSelectedThemeName(theme.name);
                          navigateSubject(subject);
                        }}
                      >
                        <strong>{cell?.score ?? 82}</strong>
                        <span>{cell?.problems ?? 0}条</span>
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="soft-panel trend-panel">
            <div className="section-head">
              <div>
                <div className="section-kicker">主题趋势</div>
                <div className="section-title">风险是否在上升</div>
              </div>
              <LineChart className="h-5 w-5 text-[#165DFF]" />
            </div>
            <div className="trend-grid">
              {trendItems.map((item) => (
                <div key={item.label} className="trend-card">
                  <div className="trend-header">
                    <div>
                      <div className="trend-label">{item.label}</div>
                      <div className="trend-value">{item.value}</div>
                    </div>
                    <span className={`trend-delta trend-${item.tone}`}>
                      {item.tone === 'risk' ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {item.delta}
                    </span>
                  </div>
                  <MiniSparkline points={item.points} tone={item.tone} />
                </div>
              ))}
            </div>
          </div>

          <div className="soft-panel insight-panel">
            <div className="section-head">
              <div>
                <div className="section-kicker">智能研判</div>
                <div className="section-title">主题侧建议</div>
              </div>
              <Sparkles className="h-5 w-5 text-[#165DFF]" />
            </div>
            <div className="insight-card">
              <div className="insight-line">
                <ShieldAlert className="h-4 w-4 text-[#DC2626]" />
                <span>{selectedTheme.name} 当前风险集中在 {themeCells.filter((item) => item.risk === '高').map((item) => item.subject).join('、') || '少数主体'}。</span>
              </div>
              <div className="insight-line">
                <Zap className="h-4 w-4 text-[#D97706]" />
                <span>建议优先核查高命中规则和超期整改节点，补齐部分接入口径。</span>
              </div>
              <div className="insight-line">
                <FileWarning className="h-4 w-4 text-[#165DFF]" />
                <span>可将低分主体和高频问题纳入案例候选，供后续评价和规则优化使用。</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ThemeAnalysis;
