/**
 * @name Agent配置
 *
 * 参考资料：
 * - /src/prototypes/agent/spec.md
 * - /src/prototypes/agent/style.css
 * - OpenAI Agents SDK: Agent instructions / tools / handoffs / guardrails
 * - LangChain Agents: model / tools / system prompt / middleware
 * - Dify Agent: instructions / tools / knowledge / execution strategy
 */
import './style.css';
import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle2,
  Cpu,
  Database,
  GitBranch,
  LineChart,
  PlayCircle,
  Settings2,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Wrench,
  Zap,
} from 'lucide-react';
import TopBar from '../../common/components/TopBar';

type AgentStatus = '已发布' | '试运行' | '配置中';
type AgentTone = 'blue' | 'cyan' | 'violet' | 'amber';
type AgentTab = '配置视图' | '运行观测' | '发布检查';
type ToolStatus = '已启用' | '审批后调用' | '试运行';

type AgentProfile = {
  id: string;
  name: string;
  scenario: string;
  owner: string;
  status: AgentStatus;
  tone: AgentTone;
  model: string;
  temperature: string;
  autonomy: string;
  memory: string;
  instruction: string;
  goal: string;
  successRate: number;
  runs: number;
  avgTime: string;
  lastRun: string;
  scenes: string[];
  guardrails: string[];
};

type AgentTool = {
  id: string;
  name: string;
  desc: string;
  status: ToolStatus;
  scope: string;
};

type KnowledgeSource = {
  name: string;
  type: string;
  coverage: string;
  freshness: string;
};

type TraceEvent = {
  step: string;
  title: string;
  desc: string;
  status: '通过' | '复核' | '待补充';
};

const AGENTS: AgentProfile[] = [
  {
    id: 'risk-analysis',
    name: '监督研判 Agent',
    scenario: '全局分析、主题风险解释、主体风险摘要',
    owner: '监督处',
    status: '已发布',
    tone: 'blue',
    model: 'GPT-4.1 / 财政监督口径',
    temperature: '0.2 稳定输出',
    autonomy: '建议型，关键结论需人工确认',
    memory: '保留近 30 天研判上下文',
    instruction: '先识别监督主题与主体，再引用规则、异常、整改和评价数据生成解释，不输出未经来源支撑的结论。',
    goal: '帮助管理岗快速判断风险集中点和下一步核查方向。',
    successRate: 92,
    runs: 186,
    avgTime: '18s',
    lastRun: '2026-06-05 09:40',
    scenes: ['全局总览指标解释', '主题风险诊断', '主体画像摘要'],
    guardrails: ['高风险判断需给出来源', '不得生成真实处罚结论', '跨部门数据先脱敏'],
  },
  {
    id: 'rule-orchestration',
    name: '规则编排 Agent',
    scenario: '规则口径整理、规则覆盖缺口、监控策略草案',
    owner: '规则管理岗',
    status: '试运行',
    tone: 'cyan',
    model: 'GPT-4.1 mini / 规则草案模式',
    temperature: '0.3 可生成候选项',
    autonomy: '半自动，调用规则库前审批',
    memory: '按主题保留规则版本记录',
    instruction: '围绕政策依据、指标口径、字段来源、触发条件和输出解释生成规则草案，所有建议保持可审阅。',
    goal: '把政策、问题和监控口径转成可评审的规则配置草案。',
    successRate: 86,
    runs: 94,
    avgTime: '24s',
    lastRun: '2026-06-04 16:18',
    scenes: ['规则缺口识别', '政策条款拆解', '规则草案生成'],
    guardrails: ['禁止直接启停生产规则', '字段缺失时标记待补充', '政策条款必须可追溯'],
  },
  {
    id: 'rectification',
    name: '整改督办 Agent',
    scenario: '整改进度跟踪、超期原因摘要、督办建议',
    owner: '整改管理岗',
    status: '配置中',
    tone: 'amber',
    model: 'GPT-4.1 / 督办语气模板',
    temperature: '0.1 严谨输出',
    autonomy: '建议型，不自动发送督办',
    memory: '按事项保留沟通摘要',
    instruction: '根据整改状态、责任主体、超期天数和佐证材料输出督办建议，区分提醒、催办和重点督办。',
    goal: '减少管理岗逐条整理整改进度的工作量。',
    successRate: 78,
    runs: 62,
    avgTime: '15s',
    lastRun: '2026-06-03 11:06',
    scenes: ['超期事项摘要', '整改说明生成', '督办优先级建议'],
    guardrails: ['不得自动下发督办', '责任认定需人工复核', '外发文案需二次确认'],
  },
  {
    id: 'evidence-check',
    name: '材料核验 Agent',
    scenario: '佐证材料完整性、问题线索证据链、案例沉淀',
    owner: '核查组',
    status: '试运行',
    tone: 'violet',
    model: 'GPT-4.1 / 文档理解模式',
    temperature: '0.2 结构化摘要',
    autonomy: '低自主，仅给核验清单',
    memory: '不保留原始敏感附件',
    instruction: '从附件摘要、规则命中、整改反馈和案例模板中整理证据链，不替代人工核验。',
    goal: '帮助核查人员确认材料是否足以支撑问题、线索或案例沉淀。',
    successRate: 89,
    runs: 117,
    avgTime: '31s',
    lastRun: '2026-06-05 08:52',
    scenes: ['材料完整性检查', '证据链摘要', '案例沉淀建议'],
    guardrails: ['附件内容仅摘要展示', '证据不足时必须标记', '敏感字段默认脱敏'],
  },
];

const TOOLS: AgentTool[] = [
  { id: 'policy', name: '政策法规库检索', desc: '按主题、文号和条款检索政策依据。', status: '已启用', scope: '法制库 / 规则库' },
  { id: 'risk', name: '风险指标读取', desc: '读取当前主题、主体、指标和趋势的模拟结果。', status: '已启用', scope: '全局分析 mock 数据' },
  { id: 'rectify', name: '整改台账查询', desc: '汇总整改状态、超期和待反馈事项。', status: '审批后调用', scope: '问题整改台账' },
  { id: 'draft', name: '规则草案生成', desc: '根据政策条款和字段口径生成规则草案。', status: '试运行', scope: '规则配置草案' },
  { id: 'brief', name: '督办文案生成', desc: '生成提醒、催办、重点督办的建议文案。', status: '审批后调用', scope: '督办模板库' },
];

const KNOWLEDGE: KnowledgeSource[] = [
  { name: '财政监督政策库', type: '政策依据', coverage: '128 项', freshness: '每日同步' },
  { name: '主题规则样例库', type: '规则口径', coverage: '76 条', freshness: '人工维护' },
  { name: '整改闭环台账', type: '事项状态', coverage: '342 条', freshness: '模拟数据' },
  { name: '案例与线索模板', type: '写作模板', coverage: '63 个', freshness: '按需更新' },
];

const TRACE_EVENTS: TraceEvent[] = [
  { step: '01', title: '意图识别', desc: '识别为“主题风险解释”，匹配全局分析上下文。', status: '通过' },
  { step: '02', title: '知识检索', desc: '引用政策法规库、主题规则库和整改台账摘要。', status: '通过' },
  { step: '03', title: '工具调用', desc: '读取风险指标与待闭环事项，整改台账调用需审批。', status: '复核' },
  { step: '04', title: '护栏校验', desc: '已检查高风险结论来源、敏感字段脱敏和输出范围。', status: '通过' },
  { step: '05', title: '输出生成', desc: '形成管理岗可读的摘要、原因和下一步建议。', status: '待补充' },
];

const STATS = [
  { label: '已配置智能体', value: '4', unit: '个', note: '覆盖研判、规则、整改、材料', tone: 'blue' },
  { label: '工具连接', value: '5', unit: '类', note: '检索、读取、草案、文案', tone: 'cyan' },
  { label: '平均成功率', value: '89', unit: '%', note: '近 30 天模拟运行', tone: 'green' },
  { label: '需人工复核', value: '3', unit: '项', note: '发布前检查项', tone: 'amber' },
];

const CONFIG_STAGES = [
  { icon: Brain, title: '角色与目标', desc: '定义智能体身份、职责边界和成功标准。' },
  { icon: Cpu, title: '模型与参数', desc: '配置模型、温度、自主级别和运行预算。' },
  { icon: Database, title: '知识与记忆', desc: '挂载政策、规则、台账和短期上下文。' },
  { icon: Wrench, title: '工具能力', desc: '声明工具白名单、调用权限和审批条件。' },
  { icon: ShieldCheck, title: '护栏策略', desc: '限定输出范围、敏感数据和人工确认节点。' },
  { icon: LineChart, title: '运行观测', desc: '追踪调用链路、成功率、耗时和待复核项。' },
];

const PUBLISH_CHECKS = [
  { label: '系统指令已覆盖角色、任务、限制和输出格式', done: true },
  { label: '高风险财政监督结论必须带来源说明', done: true },
  { label: '工具调用范围已设置白名单和审批门槛', done: true },
  { label: '知识来源标记了更新频率和数据状态', done: true },
  { label: '外发督办文案仍需人工确认', done: false },
  { label: '试运行样例覆盖异常、正常和资料不足场景', done: false },
];

const STATUS_CLASS: Record<AgentStatus, string> = {
  已发布: 'status-published',
  试运行: 'status-trial',
  配置中: 'status-draft',
};

const TOOL_CLASS: Record<ToolStatus, string> = {
  已启用: 'tool-ready',
  审批后调用: 'tool-approval',
  试运行: 'tool-trial',
};

function AgentPage() {
  const [selectedAgentId, setSelectedAgentId] = useState(AGENTS[0].id);
  const [activeTab, setActiveTab] = useState<AgentTab>('配置视图');
  const [enabledToolIds, setEnabledToolIds] = useState<string[]>(['policy', 'risk', 'rectify']);

  const selectedAgent = useMemo(
    () => AGENTS.find((agent) => agent.id === selectedAgentId) || AGENTS[0],
    [selectedAgentId]
  );

  const enabledTools = TOOLS.filter((tool) => enabledToolIds.includes(tool.id));
  const reviewCount = PUBLISH_CHECKS.filter((item) => !item.done).length;

  const handleNavigate = (href: string) => {
    try {
      window.location.href = href;
    } catch {
      // 原型容器内忽略导航异常。
    }
  };

  const toggleTool = (toolId: string) => {
    setEnabledToolIds((current) => (
      current.includes(toolId)
        ? current.filter((id) => id !== toolId)
        : [...current, toolId]
    ));
  };

  return (
    <div className="agent-page">
      <TopBar title="财会监督系统" onNavigate={handleNavigate} />
      <main className="agent-main">
        <section className="agent-hero">
          <div className="agent-hero-copy">
            <span className="agent-eyebrow"><Sparkles size={14} /> 扩展功能 / Agent</span>
            <h1>Agent 智能体配置</h1>
            <p>面向财会监督场景，搭建智能体的角色、模型、知识、工具、护栏和运行观测配置框架。</p>
          </div>
          <div className="agent-hero-actions">
            <button type="button" className="agent-soft-button" onClick={() => setActiveTab('运行观测')}>
              <PlayCircle size={15} />
              试运行
            </button>
            <button type="button" className="agent-primary-button" onClick={() => setActiveTab('发布检查')}>
              <ShieldCheck size={15} />
              发布检查
            </button>
          </div>
        </section>

        <section className="agent-stat-grid" aria-label="Agent 概览指标">
          {STATS.map((item) => (
            <div key={item.label} className={`agent-stat-card stat-${item.tone}`}>
              <span>{item.label}</span>
              <strong>{item.value}<em>{item.unit}</em></strong>
              <p>{item.note}</p>
            </div>
          ))}
        </section>

        <section className="agent-layout">
          <aside className="agent-panel agent-list-panel">
            <div className="agent-panel-head">
              <div>
                <h2>智能体目录</h2>
                <span>按业务场景选择配置对象</span>
              </div>
              <Bot size={18} />
            </div>
            <div className="agent-card-list">
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  className={`agent-card agent-tone-${agent.tone} ${agent.id === selectedAgent.id ? 'agent-card-active' : ''}`}
                  onClick={() => setSelectedAgentId(agent.id)}
                >
                  <span className={`agent-status ${STATUS_CLASS[agent.status]}`}>{agent.status}</span>
                  <strong>{agent.name}</strong>
                  <p>{agent.scenario}</p>
                  <em>{agent.owner}｜成功率 {agent.successRate}%</em>
                </button>
              ))}
            </div>
          </aside>

          <section className="agent-workspace">
            <div className={`agent-current agent-tone-${selectedAgent.tone}`}>
              <div>
                <span className="agent-eyebrow"><Zap size={14} /> 当前配置对象</span>
                <h2>{selectedAgent.name}</h2>
                <p>{selectedAgent.goal}</p>
              </div>
              <div className="agent-model-box">
                <span>模型策略</span>
                <strong>{selectedAgent.model}</strong>
                <em>{selectedAgent.temperature}</em>
              </div>
            </div>

            <div className="agent-tabbar" role="tablist" aria-label="Agent 配置视图">
              {(['配置视图', '运行观测', '发布检查'] as AgentTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={activeTab === tab ? 'agent-tab-active' : ''}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === '配置视图' && (
              <>
                <section className="agent-config-grid">
                  <div className="agent-config-card config-wide">
                    <span>系统指令</span>
                    <strong>{selectedAgent.instruction}</strong>
                    <p>输出需包含：结论、依据、风险解释、建议动作、待人工确认事项。</p>
                  </div>
                  <div className="agent-config-card">
                    <span>自主级别</span>
                    <strong>{selectedAgent.autonomy}</strong>
                    <p>当前仅做静态原型，不触发真实工具调用。</p>
                  </div>
                  <div className="agent-config-card">
                    <span>记忆策略</span>
                    <strong>{selectedAgent.memory}</strong>
                    <p>按场景保留上下文摘要，不保留敏感原文。</p>
                  </div>
                </section>

                <section className="agent-panel agent-stage-panel">
                  <div className="agent-panel-head">
                    <div>
                      <h2>通用配置链路</h2>
                      <span>参考主流智能体配置方式，拆成可检查的六个面</span>
                    </div>
                    <GitBranch size={18} />
                  </div>
                  <div className="agent-stage-flow">
                    {CONFIG_STAGES.map((stage, index) => {
                      const StageIcon = stage.icon;
                      return (
                        <div key={stage.title} className="agent-stage-card">
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <StageIcon size={18} />
                          <strong>{stage.title}</strong>
                          <p>{stage.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="agent-two-column">
                  <div className="agent-panel">
                    <div className="agent-panel-head">
                      <div>
                        <h2>工具能力</h2>
                        <span>声明工具范围、权限和调用状态</span>
                      </div>
                      <Wrench size={18} />
                    </div>
                    <div className="tool-list">
                      {TOOLS.map((tool) => (
                        <button
                          key={tool.id}
                          type="button"
                          className={`tool-row ${enabledToolIds.includes(tool.id) ? 'tool-row-active' : ''}`}
                          onClick={() => toggleTool(tool.id)}
                        >
                          <span className={`tool-status ${TOOL_CLASS[tool.status]}`}>{tool.status}</span>
                          <strong>{tool.name}</strong>
                          <p>{tool.desc}</p>
                          <em>{tool.scope}</em>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="agent-panel">
                    <div className="agent-panel-head">
                      <div>
                        <h2>知识与护栏</h2>
                        <span>知识来源和财政监督输出约束</span>
                      </div>
                      <ShieldCheck size={18} />
                    </div>
                    <div className="knowledge-list">
                      {KNOWLEDGE.map((source) => (
                        <div key={source.name} className="knowledge-row">
                          <strong>{source.name}</strong>
                          <span>{source.type}｜{source.coverage}</span>
                          <em>{source.freshness}</em>
                        </div>
                      ))}
                    </div>
                    <div className="guardrail-list">
                      {selectedAgent.guardrails.map((item) => (
                        <div key={item} className="guardrail-row">
                          <CheckCircle2 size={14} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            )}

            {activeTab === '运行观测' && (
              <section className="agent-panel agent-observe-panel">
                <div className="agent-panel-head">
                  <div>
                    <h2>运行链路追踪</h2>
                    <span>{selectedAgent.name} 最近一次模拟运行：{selectedAgent.lastRun}</span>
                  </div>
                  <LineChart size={18} />
                </div>
                <div className="observe-grid">
                  <div className="observe-card">
                    <span>运行次数</span>
                    <strong>{selectedAgent.runs}</strong>
                    <p>近 30 天模拟调用</p>
                  </div>
                  <div className="observe-card">
                    <span>成功率</span>
                    <strong>{selectedAgent.successRate}%</strong>
                    <p>含人工复核后通过</p>
                  </div>
                  <div className="observe-card">
                    <span>平均耗时</span>
                    <strong>{selectedAgent.avgTime}</strong>
                    <p>知识检索 + 输出生成</p>
                  </div>
                </div>
                <div className="trace-list">
                  {TRACE_EVENTS.map((event) => (
                    <div key={event.step} className="trace-row">
                      <span>{event.step}</span>
                      <strong>{event.title}</strong>
                      <p>{event.desc}</p>
                      <em className={`trace-status trace-${event.status}`}>{event.status}</em>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === '发布检查' && (
              <section className="agent-panel agent-publish-panel">
                <div className="agent-panel-head">
                  <div>
                    <h2>发布前检查</h2>
                    <span>确保智能体配置可解释、可追溯、可人工接管</span>
                  </div>
                  <AlertTriangle size={18} />
                </div>
                <div className="publish-summary">
                  <div>
                    <span>已完成</span>
                    <strong>{PUBLISH_CHECKS.length - reviewCount}</strong>
                    <p>基础配置项</p>
                  </div>
                  <div>
                    <span>待复核</span>
                    <strong>{reviewCount}</strong>
                    <p>发布前建议处理</p>
                  </div>
                  <div>
                    <span>工具启用</span>
                    <strong>{enabledTools.length}</strong>
                    <p>当前配置工具</p>
                  </div>
                </div>
                <div className="publish-check-list">
                  {PUBLISH_CHECKS.map((check) => (
                    <div key={check.label} className={check.done ? 'publish-check done' : 'publish-check'}>
                      {check.done ? <CheckCircle2 size={15} /> : <TimerReset size={15} />}
                      <span>{check.label}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </section>

          <aside className="agent-side">
            <section className="agent-panel">
              <div className="agent-panel-head">
                <div>
                  <h2>配置摘要</h2>
                  <span>给管理岗看的发布口径</span>
                </div>
                <Settings2 size={18} />
              </div>
              <div className="summary-block">
                <span>适用场景</span>
                <strong>{selectedAgent.scenario}</strong>
              </div>
              <div className="scene-list">
                {selectedAgent.scenes.map((scene) => (
                  <span key={scene}>{scene}</span>
                ))}
              </div>
              <div className="summary-block">
                <span>已选工具</span>
                <strong>{enabledTools.map((tool) => tool.name).join(' / ') || '暂未选择工具'}</strong>
              </div>
            </section>

            <section className="agent-panel">
              <div className="agent-panel-head">
                <div>
                  <h2>通用方案映射</h2>
                  <span>把网上常见 Agent 配置收敛到本系统</span>
                </div>
                <Brain size={18} />
              </div>
              <div className="mapping-list">
                <div><strong>Instructions</strong><span>系统指令、财政监督语气、输出格式</span></div>
                <div><strong>Tools</strong><span>政策检索、指标读取、整改台账、草案生成</span></div>
                <div><strong>Knowledge</strong><span>政策库、规则库、台账、案例模板</span></div>
                <div><strong>Guardrails</strong><span>脱敏、人工确认、来源追溯、工具审批</span></div>
                <div><strong>Observability</strong><span>运行记录、调用链路、成功率、待复核项</span></div>
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default AgentPage;
