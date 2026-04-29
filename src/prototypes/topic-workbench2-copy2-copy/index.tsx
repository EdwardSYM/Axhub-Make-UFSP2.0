/**
 * @name 内控考评工作台
 */
import './style.css';
import '../../themes/ufsp-sky/globals.css';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { BankOutlined, SearchOutlined, BellOutlined, NodeIndexOutlined } from '@ant-design/icons';
import * as echarts from 'echarts/core';
import { RadarChart, LineChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { analysisData, Level1_Dimension, Level2_Indicator } from './data';

echarts.use([RadarChart, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);
import TopBar from '../../common/components/TopBar';
import type { AxureHandle, AxureProps, ConfigItem, EventItem, KeyDesc } from '../../common/axure-types';
import { createEventEmitter, getConfigValue } from '../../common/axure-types';

type NavActive = 'home' | 'daily' | 'special' | 'policy' | 'evaluation' | 'support';

const EVENT_LIST: EventItem[] = [{ name: 'onNavigate', desc: '页面内导航', payload: 'string' }];
const ACTION_LIST: Array<{ name: string; desc: string; params?: string }> = [];
const VAR_LIST: KeyDesc[] = [{ name: 'active_category', desc: '当前激活的顶栏分类' }, { name: 'topic_key', desc: '当前主题 key' }];
const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '系统标题', initialValue: '财会监督系统' },
  { type: 'input', attributeId: 'topic_name', displayName: '主题名称', initialValue: '主题工作台' }
];

function useQuery() {
  const [q, setQ] = useState<{ [k: string]: string }>({});
  useEffect(() => {
    const updateQuery = () => {
      try {
        const p = new URLSearchParams(window.location.search || '');
        const o: any = {};
        p.forEach((v, k) => (o[k] = v));
        setQ(o);
      } catch {
        setQ({});
      }
    };
    
    // 初始执行
    updateQuery();
    
    // 监听 URL 变化
    window.addEventListener('popstate', updateQuery);
    window.addEventListener('hashchange', updateQuery);
    
    // 监听 pushState 和 replaceState 事件
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      originalPushState.apply(this, args);
      updateQuery();
    };
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      updateQuery();
    };
    
    return () => {
      window.removeEventListener('popstate', updateQuery);
      window.removeEventListener('hashchange', updateQuery);
      // 恢复原始方法
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);
  return q;
}

type FlowNodeProps = { name: string; role: string; stage: string; desc?: string; upstream?: string[]; downstream?: string[]; active: boolean; onClick: () => void };
function FlowNode(props: FlowNodeProps) {
  const activeCls = props.active ? 'ring-2 ring-red-300 shadow-red-200' : 'opacity-75';
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={props.onClick}
        className={`w-[200px] h-[72px] rounded-xl shadow-sm bg-white px-4 py-3 text-left transition-all ${activeCls} hover:shadow-md`}
      >
        <div className="text-sm font-semibold text-slate-800">{props.name}</div>
        <div className="mt-1 text-xs text-slate-500">{props.role}</div>
        <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
          <svg className="w-4 h-4 text-[#4E73C8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
      <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-[240px] bg-white rounded-xl shadow-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-xs font-semibold text-slate-800">{props.name}</div>
        <div className="mt-1 text-[11px] text-slate-500">{props.desc || ''}</div>
        <div className="mt-1 text-[11px] text-slate-500">办理角色：{props.role} · 阶段：{props.stage}</div>
        {props.upstream && props.upstream.length > 0 && (
          <div className="mt-1 text-[11px] text-slate-400">上游：{props.upstream.join('、')}</div>
        )}
        {props.downstream && props.downstream.length > 0 && (
          <div className="mt-1 text-[11px] text-slate-400">下游：{props.downstream.join('、')}</div>
        )}
        <div className="mt-1 text-[11px] text-[#4E73C8]">进入功能页</div>
      </div>
    </div>
  );
}

const Component = forwardRef<AxureHandle, AxureProps>(function Component(innerProps, ref) {
  const configSource = innerProps && typeof innerProps.config === 'object' && innerProps.config ? innerProps.config : {};
  const onEventHandler = typeof innerProps?.onEvent === 'function' ? innerProps.onEvent : undefined;
  const emitEvent = useMemo(() => createEventEmitter(onEventHandler), [onEventHandler]);
  const query = useQuery();

  const title = getConfigValue<string>(configSource, 'title', '财会监督系统');
  const topicName = getConfigValue<string>(configSource, 'topic_name', String(query.topic || '主题工作台'));
  const categoryFromQuery = String(query.category || '').toLowerCase();

  const activeCategory: NavActive =
    categoryFromQuery === 'daily'
      ? 'daily'
      : categoryFromQuery === 'special'
      ? 'special'
      : categoryFromQuery === 'evaluation'
      ? 'evaluation'
      : categoryFromQuery === 'policy'
      ? 'policy'
      : categoryFromQuery === 'support'
      ? 'support'
      : 'home';

  const menus = useMemo(() => {
    const daily = [
      { label: '三保监控', link: '/pages/topic-workbench2?topic=sanbao&category=daily' },
      { label: '三公监控', link: '/pages/topic-workbench2?topic=sangong&category=daily' },
      { label: '政采监控', link: '/pages/topic-workbench2?topic=zhengcai&category=daily' },
      { label: '工资监控', link: '/pages/topic-workbench2?topic=salary&category=daily' },
      { label: '一卡通监控', link: '/pages/topic-workbench2?topic=yikatong&category=daily' },
      { label: '执行进度监控', link: '/pages/topic-workbench2?topic=execution&category=daily' },
      { label: '库款保障监控', link: '/pages/topic-workbench2?topic=treasury&category=daily' },
      { label: '单位资金监控', link: '/pages/topic-workbench2?topic=unitfund&category=daily' }
    ];
    const special = [
      {
        label: '年度重点检查',
        children: [
          { label: '地方政府债务', link: '/pages/topic-workbench2?topic=yearly/local-debt&category=special' },
          { label: '高标准农田建设资金', link: '/pages/topic-workbench2?topic=yearly/farmland-fund&category=special' },
          { label: '国有资产处置管理', link: '/pages/topic-workbench2?topic=yearly/state-assets&category=special' },
          { label: '减税降费落实', link: '/pages/topic-workbench2?topic=yearly/tax-reduction&category=special' },
          { label: '违规返还财政收入', link: '/pages/topic-workbench2?topic=yearly/refund-revenue&category=special' },
          { label: '基层三保', link: '/pages/topic-workbench2?topic=yearly/sanbao-basic&category=special' },
          { label: '财政暂付款管理', link: '/pages/topic-workbench2?topic=yearly/temporary-payment&category=special' },
          { label: '财政收入虚收空转', link: '/pages/topic-workbench2?topic=yearly/false-revenue&category=special' },
          { label: '一卡通', link: '/pages/topic-workbench2?topic=yearly/one-card&category=special' },
          { label: '招商引资优惠政策', link: '/pages/topic-workbench2?topic=yearly/tax-preferential&category=special' }
        ]
      },
      { label: '审计问题整改', link: '/pages/topic-workbench2?topic=audit&category=special' },
      { label: '巡视问题整改', link: '/pages/topic-workbench2?topic=inspect&category=special' },
      { label: '监管局问题整改', link: '/pages/topic-workbench2?topic=supervision&category=special' }
    ];
    const evaluation = [
      { label: '财会监督考评', link: '/pages/topic-workbench2?topic=eval-finance&category=evaluation' },
      { label: '财政内控考评', link: '/pages/topic-workbench2?topic=eval-internal&category=evaluation' }
    ];
    const policy = [
      { label: '政策发布', link: '/policy' },
      { label: '法规制度', link: '/resources/law' },
      { label: '监督规则', link: '/resources/rule' }
    ];
    const support = [
      { label: '法规库', link: '/resources/law' },
      { label: '规则库', link: '/resources/rule' },
      { label: '机构库', link: '/resources/org' },
      { label: '人才库', link: '/resources/talent' },
      { label: '档案/数据', link: '/resources/archive' }
    ];
    return { daily, special, evaluation, policy, support };
  }, []);

  useImperativeHandle(
    ref,
    function () {
      return {
        getVar: function (name: string) {
          if (name === 'active_category') return activeCategory;
          if (name === 'topic_key') return String(query.topic || '');
          return undefined;
        },
        fireAction: function () {
          return undefined;
        },
        eventList: EVENT_LIST,
        actionList: ACTION_LIST as any,
        varList: VAR_LIST,
        configList: CONFIG_LIST,
        dataList: [],
      };
    },
    [activeCategory, query],
  );

  const onNavigate = (href: string) => {
    const correctedHref = href.startsWith('/pages/') ? href.replace('/pages/', '/prototypes/') : href;
    emitEvent('onNavigate', correctedHref);
    try {
      window.location.href = correctedHref;
    } catch {}
  };

  const topicKey = String(query.topic || '').toLowerCase();
  const isSanbao = topicKey === 'sanbao';
  const displayName = '专项领域整改工作台';
  const descText = '用于汇聚重点领域整改相关任务，支撑台账分发录入、问题整改更新及整改进展跟踪。';
  const stageData = isSanbao
    ? [
        { name: '受理', count: 14, rate: 0.82 },
        { name: '研判', count: 8, rate: 0.66 },
        { name: '督办', count: 5, rate: 0.54 },
        { name: '复核', count: 3, rate: 0.47 },
        { name: '催办', count: 2, rate: 0.3 },
        { name: '闭环', count: 1, rate: 0.12 }
      ]
    : [
        { name: '受理', count: 9, rate: 0.6 },
        { name: '研判', count: 6, rate: 0.5 },
        { name: '督办', count: 3, rate: 0.38 },
        { name: '复核', count: 2, rate: 0.26 },
        { name: '催办', count: 1, rate: 0.18 },
        { name: '闭环', count: 0, rate: 0.1 }
      ];
  const todos = [
    // 第一组：台账分发录入
    { t: '录入2026年第一季度工作台账', d: '03-10', level: '高', flowNode: '台账分发录入', module: '工作台账录入', status: '待提交', actions: ['处理'] },
    { t: '审核县区上报的工作台账数据', d: '03-08', level: '高', flowNode: '台账分发录入', module: '工作台账审核', status: '待审核', actions: ['处理'] },
    { t: '汇总工作台账数据并生成报表', d: '03-06', level: '中', flowNode: '台账分发录入', module: '工作台账管理', status: '待处理', actions: ['处理'] },
    { t: '上报工作台账至上级部门', d: '03-04', level: '中', flowNode: '台账分发录入', module: '工作台账上报', status: '待上报', actions: ['处理'] },
    { t: '更新工作台账系统数据', d: '03-03', level: '中', flowNode: '台账分发录入', module: '工作台账管理', status: '待处理', actions: ['处理'] },
    
    // 第二组：问题整改更新
    { t: '督办重点领域整改任务', d: '03-12', level: '高', flowNode: '问题整改更新', module: '整改督办管理', status: '待处理', actions: ['处理'] },
    { t: '下发整改任务至相关单位', d: '03-10', level: '高', flowNode: '问题整改更新', module: '整改下发管理', status: '待下发', actions: ['处理'] },
    { t: '审核整改情况报告', d: '03-08', level: '中', flowNode: '问题整改更新', module: '整改情况审核', status: '待审核', actions: ['处理'] },
    { t: '跟踪整改进展并更新状态', d: '03-06', level: '中', flowNode: '问题整改更新', module: '整改督办管理', status: '处理中', actions: ['处理'] },
    { t: '汇总整改结果并形成报告', d: '03-04', level: '中', flowNode: '问题整改更新', module: '整改情况审核', status: '待处理', actions: ['处理'] },
    
    // 独立：整改明细查询
    { t: '查询整改明细数据', d: '03-15', level: '低', flowNode: '整改明细查询', module: '独立入口', status: '待处理', actions: ['处理'] },
    { t: '导出整改明细报表', d: '03-13', level: '低', flowNode: '整改明细查询', module: '独立入口', status: '待处理', actions: ['处理'] },
    { t: '分析整改明细数据', d: '03-11', level: '低', flowNode: '整改明细查询', module: '独立入口', status: '待处理', actions: ['处理'] },
    
    // 新增：临期待办事项（今天是03-26，临期为03-26到03-28）
    { t: '准备季度工作总结报告', d: '03-27', level: '中', flowNode: '台账分发录入', module: '工作台账管理', status: '待处理', actions: ['处理'] },
    { t: '审核部门预算调整申请', d: '03-28', level: '高', flowNode: '问题整改更新', module: '整改情况审核', status: '待审核', actions: ['处理'] },
    
    // 新增：正常待办事项（既不是超期也不是临期）
    { t: '制定下季度工作计划', d: '04-01', level: '中', flowNode: '台账分发录入', module: '工作台账管理', status: '待处理', actions: ['处理'] },
    { t: '组织部门业务培训', d: '04-05', level: '低', flowNode: '问题整改更新', module: '整改督办管理', status: '待安排', actions: ['处理'] }
  ];
  const [todoTab, setTodoTab] = useState<'pending' | 'overdue' | 'due' | 'returned'>('pending');
  const displayTodos = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const isDue = (md: string) => {
      const [m, d] = (md || '01-01').split('-').map(s => parseInt(s, 10));
      const t = new Date(today.getFullYear(), (m || 1) - 1, d || 1).getTime();
      const diff = Math.round((t - todayStart) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 2;
    };
    const isOverdue = (md: string) => {
      const [m, d] = (md || '01-01').split('-').map(s => parseInt(s, 10));
      const t = new Date(today.getFullYear(), (m || 1) - 1, d || 1).getTime();
      const diff = Math.round((t - todayStart) / (1000 * 60 * 60 * 24));
      return diff < 0;
    };
    if (todoTab === 'pending') return todos; // 全部待办事项
    if (todoTab === 'overdue') return todos.filter(i => isOverdue(i.d));
    if (todoTab === 'due') return todos.filter(i => isDue(i.d) && !isOverdue(i.d));
    if (todoTab === 'returned') return todos.filter(i => i.status.includes('被退回'));
    return todos;
  }, [todos, todoTab]);
  const topicParam = encodeURIComponent(String(query.topic || ''));
  const categoryParam = encodeURIComponent(String(query.category || ''));
  const featureHref = (featureKey: string) =>
    `/prototypes/topic-function-list-copy?topic=${topicParam}&category=${categoryParam}&feature=${encodeURIComponent(featureKey)}`;
  const FLOW_STEPS = useMemo(() => {
    return [
      {
        key: 'work台账管理',
        name: '工作台账管理',
        mainCount: 0,
        status: [],
        path: featureHref('work台账管理')
      },
      {
        key: 'work台账录入',
        name: '工作台账录入',
        mainCount: 8,
        status: [],
        path: featureHref('work台账录入')
      },
      {
        key: 'work台账审核',
        name: '工作台账审核',
        mainCount: 6,
        status: [
          { label: '临期', value: 2 },
          { label: '超期', value: 1 },
          { label: '被退回', value: 1 }
        ],
        path: featureHref('work台账审核')
      },
      {
        key: 'work台账上报',
        name: '工作台账上报',
        mainCount: 4,
        status: [
          { label: '临期', value: 2 },
          { label: '超期', value: 0 },
          { label: '被退回', value: 1 }
        ],
        path: featureHref('work台账上报')
      },
      {
        key: 'rectify督办管理',
        name: '整改督办管理',
        mainCount: 9,
        status: [
          { label: '临期', value: 3 },
          { label: '超期', value: 2 },
          { label: '被退回', value: 0 }
        ],
        path: featureHref('rectify督办管理')
      },
      {
        key: 'rectify下发管理',
        name: '整改下发管理',
        mainCount: 7,
        status: [
          { label: '临期', value: 2 },
          { label: '超期', value: 0 },
          { label: '被退回', value: 0 }
        ],
        path: featureHref('rectify下发管理')
      },
      {
        key: 'rectify情况审核',
        name: '整改情况审核',
        mainCount: 5,
        status: [
          { label: '临期', value: 1 },
          { label: '超期', value: 0 },
          { label: '被退回', value: 1 }
        ],
        path: featureHref('rectify情况审核')
      },
      {
        key: 'rectify明细查询',
        name: '整改明细查询',
        mainCount: 0,
        status: [],
        path: featureHref('rectify明细查询')
      }
    ];
  }, [categoryParam, topicParam]);
  const resources = useMemo(() => {
    return [
      { key: 'law', icon: '📜', title: '法制库', count: isSanbao ? 128 : 120, path: '/resources?tab=law' },
      { key: 'rule', icon: '📘', title: '规则库', count: isSanbao ? 76 : 70, path: '/resources?tab=rule' },
      { key: 'case', icon: '🧰', title: '案例库', count: 63, path: '/resources?tab=case' },
      { key: 'archive', icon: '🗂️', title: '档案/数据', count: 342, path: '/resources?tab=archive' }
    ];
  }, [isSanbao]);
  const [selectedFlowStep, setSelectedFlowStep] = useState<string | null>(null);
  const [showFullProcess, setShowFullProcess] = useState<boolean>(false);
  const [showLeftArrow, setShowLeftArrow] = useState<boolean>(false);
  const [showRightArrow, setShowRightArrow] = useState<boolean>(true);
  const [showIndicatorDetail, setShowIndicatorDetail] = useState<boolean>(false);

  // 新增：三层钻取分析状态
  const [currentLevel, setCurrentLevel] = useState<1 | 2 | 3>(1);
  const [selectedL1, setSelectedL1] = useState<Level1_Dimension | null>(null);
  const [selectedL2, setSelectedL2] = useState<Level2_Indicator | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [analysisTimeRange, setAnalysisTimeRange] = useState<'最近7天' | '最近30天' | '本月' | '本季度' | '自定义'>('最近30天');
  const [analysisCustomRange, setAnalysisCustomRange] = useState<{ start: string; end: string }>({ start: '2025-02-01', end: '2025-02-18' });
  const [analysisHoverConclusionId, setAnalysisHoverConclusionId] = useState<string | null>(null);
  const [analysisSelectedConclusionId, setAnalysisSelectedConclusionId] = useState<string | null>(null);
  const [analysisActiveReportId, setAnalysisActiveReportId] = useState<string | null>(null);
  const [analysisActiveRuleId, setAnalysisActiveRuleId] = useState<string | null>(null);
  const [showAllConclusions, setShowAllConclusions] = useState<boolean>(false);

  const smartAnalysisData = useMemo(() => {
    const createConclusions = (timeLabel: string) => ([
      {
        id: 'c-1',
        title: '工资发放延迟集中在3个县区',
        summary: `说明执行与支付保障偏弱，建议优先核查支付链路与退回原因（${timeLabel}）。`,
        dimension: '执行与支付保障',
        regions: ['A县', 'B县', 'C县'],
        risk: '高风险',
        ruleIds: ['r-1'],
        report: {
          id: 'report-1',
          name: '执行与支付保障监测分析报告',
          generatedAt: '2025-02-18 10:32',
          dimension: '执行与支付保障',
          indicators: ['工资发放及时率', '支付退回率', '支付链路异常率'],
          scope: 'A县、B县、C县',
          overview: '本期分析发现工资发放延迟集中在三个县区，延迟事项与支付退回环节相关度较高。',
          impact: '影响约 1.2 万名财政供养人员工资发放时效，并导致民生资金拨付联动延后。',
          trend: ['2024Q1 86', '2024Q2 87', '2024Q3 88', '2024Q4 89', '2025Q1 90', '2025Q2 89'],
          triggeredRules: ['工资发放及时率异常', '支付退回率超阈值'],
          basis: ['《工资保障日常监测要求》', '《财政支付链路运行监测办法》'],
          suggestions: '优先核查支付链路退回原因，按县区建立工资发放异常处置台账并按周闭环。'
        }
      },
      {
        id: 'c-2',
        title: '资金沉淀率偏高',
        summary: `说明库款与流动性管理存在问题，建议校准阈值并补充动态监测规则（${timeLabel}）。`,
        dimension: '库款与流动性风险',
        regions: ['D县', 'E县'],
        risk: '中风险',
        ruleIds: ['r-2'],
        report: {
          id: 'report-2',
          name: '库款与流动性风险监测分析报告',
          generatedAt: '2025-02-18 10:32',
          dimension: '库款与流动性风险',
          indicators: ['资金沉淀率', '短期流动性覆盖率', '库款保障倍数'],
          scope: 'D县、E县',
          overview: '沉淀资金规模持续高于阈值，短期流动性覆盖能力边际下降。',
          impact: '可能压缩重点支出支付空间，并提升月末支付峰值风险。',
          trend: ['2024Q1 79', '2024Q2 80', '2024Q3 81', '2024Q4 82', '2025Q1 83', '2025Q2 84'],
          triggeredRules: ['资金沉淀率过高', '流动性覆盖率低于目标'],
          basis: ['《库款运行监测要求》', '《财政资金流动性风险管理规范》'],
          suggestions: '按周滚动清理沉淀资金，分层调整阈值并增加月中动态预警。'
        }
      },
      {
        id: 'c-3',
        title: '台账更新不及时',
        summary: `说明数据质量与责任落实存在短板，建议补充台账更新时限要求及预警规则（${timeLabel}）。`,
        dimension: '监督整改与问责闭环',
        regions: ['F县', 'G县'],
        risk: '中风险',
        ruleIds: ['r-3'],
        report: {
          id: 'report-3',
          name: '监督整改闭环执行分析报告',
          generatedAt: '2025-02-18 10:32',
          dimension: '监督整改与问责闭环',
          indicators: ['台账更新及时率', '整改闭环完成率', '问责执行及时率'],
          scope: 'F县、G县',
          overview: '台账更新延迟主要集中在整改复核节点，影响闭环时效判断。',
          impact: '整改事项在系统内状态滞后，导致督办优先级排序偏差。',
          trend: ['2024Q1 81', '2024Q2 82', '2024Q3 83', '2024Q4 83', '2025Q1 84', '2025Q2 84'],
          triggeredRules: ['台账更新不及时', '整改复核超时'],
          basis: ['《三保资金台账管理办法》', '《监督整改闭环管理细则》'],
          suggestions: '统一台账更新时限要求，增加复核环节的自动提醒与超时升级策略。'
        }
      }
    ]);

    const ruleItems = [
      {
        id: 'r-1',
        name: '工资发放及时率异常',
        basis: '触发《工资保障日常监测要求》',
        status: '本期触发',
        definition: '当工资发放及时率低于90%或连续2期下降时触发。',
        threshold: '及时率 < 90%',
        source: '工资发放台账、支付清算流水',
        logic: '按县区聚合工资发放节点，比较计划发放日与实际到账日差值。',
        recent: '最近30天触发 3 次，较上期增加 1 次。'
      },
      {
        id: 'r-2',
        name: '资金沉淀率过高',
        basis: '触发《库款运行监测要求》',
        status: '高频触发',
        definition: '当沉淀率超过20%且持续两周不下降时触发。',
        threshold: '沉淀率 > 20%',
        source: '财政总账、库款日报',
        logic: '按周计算沉淀资金占比并做连续性校验。',
        recent: '最近30天触发 5 次，连续 2 周高于阈值。'
      },
      {
        id: 'r-3',
        name: '台账更新不及时',
        basis: '触发《三保资金台账管理办法》',
        status: '新增触发',
        definition: '台账更新超过3个工作日未完成时触发。',
        threshold: '更新时长 > 3 个工作日',
        source: '整改台账、督办系统日志',
        logic: '以整改事项状态更新时间与规则时限进行差值比对。',
        recent: '最近30天触发 2 次，主要集中在复核环节。'
      }
    ];

    return {
      '最近7天': { generatedAt: '2025-02-18 10:32', conclusions: createConclusions('最近7天'), rules: ruleItems },
      '最近30天': { generatedAt: '2025-02-18 10:32', conclusions: createConclusions('最近30天'), rules: ruleItems },
      '本月': { generatedAt: '2025-02-18 10:32', conclusions: createConclusions('本月'), rules: ruleItems },
      '本季度': { generatedAt: '2025-02-18 10:32', conclusions: createConclusions('本季度'), rules: ruleItems },
      '自定义': { generatedAt: '2025-02-18 10:32', conclusions: createConclusions(`${analysisCustomRange.start}~${analysisCustomRange.end}`), rules: ruleItems }
    };
  }, [analysisCustomRange]);

  const currentSmartAnalysis = smartAnalysisData[analysisTimeRange];
  const linkedRuleIds = useMemo(() => {
    const pivotId = analysisHoverConclusionId || analysisSelectedConclusionId;
    if (!pivotId) return [];
    return currentSmartAnalysis.conclusions.find(item => item.id === pivotId)?.ruleIds || [];
  }, [analysisHoverConclusionId, analysisSelectedConclusionId, currentSmartAnalysis]);

  useEffect(() => {
    setAnalysisHoverConclusionId(null);
    setAnalysisSelectedConclusionId(null);
    setAnalysisActiveReportId(null);
    setAnalysisActiveRuleId(null);
  }, [analysisTimeRange]);

  const radarChartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.EChartsType | null>(null);

  // 面包屑导航组件
  const BreadcrumbNav = () => (
    <div className="flex items-center gap-2.5 text-xs mb-3">
      <div className="w-[4px] h-[18px] bg-[#4E73C8] rounded-full"></div>
      <span 
        className={`cursor-pointer hover:text-[#4E73C8] transition-colors text-[17px] font-bold ${currentLevel === 1 ? 'text-[#0F3D8A]' : 'text-slate-500'}`}
        onClick={() => {
          setCurrentLevel(1);
          setSelectedL1(null);
          setSelectedL2(null);
          setActiveTab('overview');
        }}
      >
        评价体系分析区
      </span>
      {currentLevel >= 2 && selectedL1 && (
        <>
          <span className="text-slate-300">/</span>
          <span 
            className={`cursor-pointer hover:text-[#4E73C8] transition-colors text-[17px] font-bold ${currentLevel === 2 ? 'text-[#0F3D8A]' : 'text-slate-500'}`}
            onClick={() => {
              setCurrentLevel(2);
              setSelectedL2(null);
              setActiveTab('overview');
            }}
          >
            {selectedL1.name}
          </span>
        </>
      )}
      {currentLevel === 3 && selectedL2 && (
        <>
          <span className="text-slate-300">/</span>
          <span className="text-[#0F3D8A] text-[17px] font-bold">{selectedL2.name}</span>
        </>
      )}
      <div className="ml-auto flex items-center gap-4">
        {currentLevel === 1 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/40  rounded-lg text-[10px] text-blue-600/70">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            提示：可点击左侧评价体系图或下方一级维度列表，查看详细分析。
          </div>
        )}
        {currentLevel > 1 && (
          <button 
            type="button"
            onClick={() => {
              if (currentLevel === 3) {
                setCurrentLevel(2);
                setSelectedL2(null);
              } else if (currentLevel === 2) {
                setCurrentLevel(1);
                setSelectedL1(null);
              }
              setActiveTab('overview');
            }}
            className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回上一级
          </button>
        )}
      </div>
    </div>
  );

  useEffect(() => {
    const container = document.getElementById('flow-scroll-container');
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    };
    
    container.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始化
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!radarChartRef.current) return;
    
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(radarChartRef.current);

      const handleResize = () => chartInstanceRef.current?.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chartInstanceRef.current?.dispose();
        chartInstanceRef.current = null;
      };
    }
  }, []);

  useEffect(() => {
    if (!chartInstanceRef.current) return;
    const clickHandler = (params: any) => {
      if (currentLevel === 3) return;
      const radarData = currentLevel === 1 ? analysisData : selectedL1?.indicators || [];
      const name = params?.name || '';
      const axisName = params?.axisValue || '';
      const targetName = name || axisName;
      const maybeDimIndex = params?.dimensionIndex;

      if (targetName) {
        if (currentLevel === 1) {
          const dim = analysisData.find(d => d.name === targetName);
          if (dim) {
            setSelectedL1(dim);
            setSelectedL2(null);
            setCurrentLevel(2);
            setActiveTab('overview');
          }
        } else if (currentLevel === 2 && selectedL1) {
          const ind = selectedL1.indicators.find(i => i.name === targetName);
          if (ind) {
            setSelectedL2(ind);
            setCurrentLevel(3);
            setActiveTab('overview');
          }
        }
        return;
      }

      if (typeof maybeDimIndex === 'number' && radarData[maybeDimIndex]) {
        if (currentLevel === 1) {
          setSelectedL1(radarData[maybeDimIndex] as Level1_Dimension);
          setSelectedL2(null);
          setCurrentLevel(2);
          setActiveTab('overview');
        } else if (currentLevel === 2) {
          setSelectedL2(radarData[maybeDimIndex] as Level2_Indicator);
          setCurrentLevel(3);
          setActiveTab('overview');
        }
      }
    };
    chartInstanceRef.current.off('click');
    chartInstanceRef.current.on('click', clickHandler);
    return () => {
      chartInstanceRef.current?.off('click', clickHandler);
    };
  }, [currentLevel, selectedL1]);

  useEffect(() => {
    if (!chartInstanceRef.current) return;

    let option: any = {};

    if (currentLevel === 1 || currentLevel === 2) {
      const data = currentLevel === 1 ? analysisData : selectedL1?.indicators || [];

      option = {
        radar: {
          triggerEvent: true,
          indicator: data.map(item => ({
            name: item.name,
            max: 100
          })),
          radius: '65%',
          center: ['50%', '50%'],
          axisName: {
            show: false
          },
          splitArea: {
            areaStyle: {
              color: ['#F5F8FF', '#fff'],
              shadowColor: 'rgba(0, 0, 0, 0.05)',
              shadowBlur: 10
            }
          },
          axisLine: { lineStyle: { color: 'rgba(78, 115, 200, 0.2)' } },
          splitLine: { lineStyle: { color: 'rgba(78, 115, 200, 0.2)' } }
        },
        series: [{
          type: 'radar',
          data: [{
            value: data.map(item => item.score),
            name: currentLevel === 1 ? '评价总览' : selectedL1?.name || '指标总览',
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(78, 115, 200, 0.4)' },
                { offset: 1, color: 'rgba(78, 115, 200, 0.1)' }
              ])
            },
            lineStyle: { color: '#4E73C8', width: 2 },
            itemStyle: { 
              color: '#4E73C8',
              borderColor: '#fff',
              borderWidth: 2
            },
            symbolSize: 6,
            emphasis: {
              itemStyle: { symbolSize: 10, borderWidth: 3 }
            }
          }]
        }],
        tooltip: { show: false }
      };
    } else if (currentLevel === 3 && selectedL2) {
      option = {
        title: {
          text: '指标变化趋势',
          textStyle: { fontSize: 12, color: '#333' },
          left: 'center',
          top: 0
        },
        grid: { top: 40, bottom: 30, left: 40, right: 20 },
        xAxis: {
          type: 'category',
          data: ['1月', '2月', '3月', '4月', '5月', '6月'],
          axisLine: { lineStyle: { color: '#eee' } },
          axisLabel: { color: '#999', fontSize: 10 }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: '#f5f5f5' } },
          axisLabel: { color: '#999', fontSize: 10 }
        },
        tooltip: { trigger: 'axis' },
        series: [{
          data: selectedL2.detail.trend,
          type: 'line',
          smooth: true,
          symbolSize: 8,
          itemStyle: { color: '#4E73C8' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(78, 115, 200, 0.3)' },
              { offset: 1, color: 'rgba(78, 115, 200, 0)' }
            ])
          }
        }]
      };
    }

    chartInstanceRef.current.setOption(option, true);
  }, [currentLevel, selectedL1, selectedL2]);

  const radarOverlayItems = useMemo(() => {
    const items = currentLevel === 1 ? analysisData : currentLevel === 2 ? selectedL1?.indicators || [] : [];
    return items.map((item, index) => {
      const total = items.length || 1;
      const angle = ((-90 + (360 / total) * index) * Math.PI) / 180;
      const x = 50 + Math.cos(angle) * 34;
      const y = 50 + Math.sin(angle) * 34;
      return {
        id: item.id,
        name: item.name,
        left: `${x}%`,
        top: `${y}%`,
      };
    });
  }, [currentLevel, selectedL1]);

  const getRiskLabel = (score: number) => {
    if (score >= 90) return { text: '低风险', cls: 'text-green-600 bg-green-50' };
    if (score >= 80) return { text: '中风险', cls: 'text-amber-600 bg-amber-50' };
    return { text: '高风险', cls: 'text-red-600 bg-red-50' };
  };

  const calcIndicatorDelta = (indicator: Level2_Indicator) => {
    const trend = indicator.detail?.trend || [];
    if (trend.length < 2) return 0;
    return trend[trend.length - 1] - trend[trend.length - 2];
  };

  const selectedDimensionTrend = useMemo(() => {
    if (!selectedL1 || selectedL1.indicators.length === 0) return [0, 0, 0, 0, 0, 0];
    const length = selectedL1.indicators[0]?.detail?.trend?.length || 6;
    const sums = Array.from({ length }, () => 0);
    selectedL1.indicators.forEach((indicator) => {
      for (let i = 0; i < length; i += 1) {
        sums[i] += indicator.detail.trend[i] || 0;
      }
    });
    return sums.map((sum) => Math.round(sum / selectedL1.indicators.length));
  }, [selectedL1]);

  const selectedDimensionAvgScore = useMemo(() => {
    if (!selectedL1 || selectedL1.indicators.length === 0) return 0;
    const total = selectedL1.indicators.reduce((acc, item) => acc + item.score, 0);
    return Math.round(total / selectedL1.indicators.length);
  }, [selectedL1]);

  const overallScore = useMemo(() => {
    const weights = [0.25, 0.2, 0.15, 0.2, 0.1, 0.1];
    const weighted = analysisData.reduce((acc, dim, idx) => acc + dim.score * (weights[idx] ?? 0), 0);
    return Math.round(weighted);
  }, []);

  const scoreTitle = useMemo(() => {
    const weights = [
      { name: '整改推进与任务完成', w: 0.25 },
      { name: '整改时效与进度管理', w: 0.2 },
      { name: '责任落实与审核把关', w: 0.15 },
      { name: '资金整改与风险控制', w: 0.2 },
      { name: '治理改进与制度完善', w: 0.1 },
      { name: '数据规范与材料完备', w: 0.1 },
    ];

    const overallFormula = `综合得分：${overallScore}分\n计算方式：一级维度得分加权平均\n计算公式：综合得分 = ${weights
      .map(({ name, w }) => {
        const score = analysisData.find((d) => d.name === name)?.score ?? 0;
        return `${w.toFixed(2)}×${score}`;
      })
      .join(' + ')} = ${overallScore}分\n含义说明：用于反映评价体系整体运行质量，分值越高表示整体运行越好。`;

    const dimensionTitle = (dimension: Level1_Dimension) => {
      const indicatorText = dimension.indicators
        .map((i) => `${i.name} ${i.score}分`)
        .slice(0, 6)
        .join('、');
      return `${dimension.name}：${dimension.score}分\n计算方式：由若干二级指标得分加权形成\n构成指标：${indicatorText}\n含义说明：${dimension.description}`;
    };

    const indicatorTitle = (indicator: Level2_Indicator) => {
      const cv = indicator.detail.currentValue;
      const sv = indicator.detail.standardValue;
      return `${indicator.name}：${indicator.score}分\n指标定义：${indicator.detail.definition}\n本期值：${cv}\n本期值口径：按本期业务数据统计口径汇总\n标准值：${sv}\n评分方式：指标得分 = 0.7×本期值折算分 + 0.3×趋势稳定性得分\n当前状态：${indicator.result}`;
    };

    return { overallFormula, dimensionTitle, indicatorTitle };
  }, [overallScore]);

  const weakestIndicator = useMemo(() => {
    if (!selectedL1 || selectedL1.indicators.length === 0) return null;
    return [...selectedL1.indicators].sort((a, b) => a.score - b.score)[0];
  }, [selectedL1]);

  // 指标详情抽屉
  const IndicatorDetailDrawer = () => (
    <div className={`fixed inset-0 z-50 flex items-start justify-end ${showIndicatorDetail ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/20" onClick={() => setShowIndicatorDetail(false)} />
      <div className="relative w-full max-w-md h-full bg-white shadow-xl overflow-y-auto custom-scrollbar">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="text-lg font-semibold text-slate-800">指标详情</div>
          <button 
            type="button"
            className="text-slate-500 hover:text-slate-700"
            onClick={() => setShowIndicatorDetail(false)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <div className="text-sm font-semibold text-slate-700 mb-1">指标定义</div>
            <div className="text-sm text-slate-600">{selectedL2?.detail.definition || '—'}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-700 mb-1">指标得分与业务值</div>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xs text-slate-500">当前得分</div>
                <div className="text-xl font-bold text-[#4E73C8]">{selectedL2 ? `${selectedL2.score}分` : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">本期值 / 标准值</div>
                <div className="text-xl font-semibold text-slate-700">
                  {selectedL2 ? `${selectedL2.detail.currentValue} / ${selectedL2.detail.standardValue}` : '—'}
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-700 mb-1">得分趋势</div>
            <div className="h-32 flex items-end gap-1">
              {(selectedL2?.detail.trend?.length ? selectedL2.detail.trend : [75, 78, 80, 82, 83, 82]).map((v, i) => (
                <div key={`td-${i}`} className="flex-1 bg-[#E5EDFF] rounded">
                  <div className="bg-gradient-to-t from-[#3E5EA8] to-[#4E73C8] rounded" style={{ height: `${Math.max(8, (v / 100) * 128)}px` }} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-1 text-center mt-2">
              {['1月', '2月', '3月', '4月', '5月', '6月'].map((month, i) => (
                <div key={i} className="text-xs text-slate-500">{month}</div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
              <div className="text-[15px] font-bold text-slate-700">异常对象分布</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <div className="text-sm text-slate-700">东城区</div>
                <div className="text-sm font-semibold text-red-600">75%</div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <div className="text-sm text-slate-700">南城区</div>
                <div className="text-sm font-semibold text-amber-600">80%</div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <div className="text-sm text-slate-700">西城区</div>
                <div className="text-sm font-semibold text-green-600">85%</div>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
              <div className="text-[15px] font-bold text-slate-700">规则命中情况</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50">
              <div className="text-sm text-slate-700">触发规则：问题整改率低于阈值</div>
              <div className="text-xs text-slate-500 mt-1">关联制度：三保资金监督整改办法</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F8FF] text-gray-900 flex flex-col">
      <TopBar title={title} onNavigate={onNavigate} />
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 py-4">
        <div className="space-y-4">
          {/* 顶部：主题名称 + 一句话主题概述 */}
          <section className="bg-white rounded-2xl shadow-sm p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-[4px] h-[18px] bg-[#4E73C8] rounded-full"></div>
                  <div className="text-[17px] font-bold text-[#0F3D8A]">{displayName}</div>
                </div>
                <div className="text-sm text-slate-500 truncate">{descText}</div>
              </div>
              <div className="text-xs text-slate-500">
                更新时间：2024-03-15 09:00
              </div>
            </div>
          </section>
          
          {/* 监督流程 */}
          <div className="mb-4">
            <div className="relative flex items-center gap-4" id="flow-container">
              {/* 左侧滚动箭头 */}
              <button 
                type="button"
                className={`absolute left-0 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white/50 backdrop-blur-sm hover:bg-white/80 rounded-full flex items-center justify-center transition-all z-10 shadow-sm ${showLeftArrow ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => {
                  const container = document.getElementById('flow-scroll-container');
                  if (container) {
                    container.scrollBy({ left: -300, behavior: 'smooth' });
                  }
                }}
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div 
                className="overflow-x-auto overflow-y-hidden custom-scrollbar flex-1 pt-[5px] px-[5px] pb-1"
                id="flow-scroll-container"
              >
                <div className="flex items-center gap-4" style={{ minWidth: 'max-content' }}>
                  {FLOW_STEPS.map((step) => {
                    return (
                      <div 
                        key={step.key}
                        className="group flex-shrink-0 w-[240px] h-[80px] rounded-xl p-3 bg-white transition-all cursor-pointer relative shadow-sm hover:shadow-md hover:-translate-y-1 border-0"
                        onClick={() => onNavigate(step.path)}
                      >
                        {step.mainCount > 0 ? (
                          step.status.filter(s => s.value > 0).length > 0 ? (
                            <div className="flex flex-col h-full">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-semibold text-slate-800">{step.name}</div>
                                <div className="flex items-baseline gap-1">
                                  <div className="text-xl font-bold text-[#4E73C8] leading-none">{step.mainCount}</div>
                                  <div className="text-xs text-slate-500">待办</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap mt-auto">
                                {step.status.filter(s => s.value > 0).map((s) => {
                                  let bgColor = 'bg-slate-50 text-slate-500';
                                  if (s.label === '临期') bgColor = 'bg-amber-50 text-amber-600';
                                  if (s.label === '超期') bgColor = 'bg-orange-50 text-orange-600';
                                  if (s.label === '被退回') bgColor = 'bg-red-50 text-red-600';
                                  return (
                                    <div 
                                      key={s.label} 
                                      className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${bgColor}`}
                                    >
                                      {s.label} <span className="font-semibold">{s.value}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Hover显示的箭头 */}
                              <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <svg className="w-4 h-4 text-[#4E73C8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between h-full">
                              <div className="text-sm font-semibold text-slate-800">{step.name}</div>
                              <div className="flex items-baseline gap-1">
                                <div className="text-xl font-bold text-[#4E73C8] leading-none">{step.mainCount}</div>
                                <div className="text-xs text-slate-500">待办</div>
                              </div>
                              {/* Hover显示的箭头 */}
                              <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <svg className="w-4 h-4 text-[#4E73C8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center justify-between h-full">
                            <div className="text-sm font-semibold text-slate-800">{step.name}</div>
                            {/* Hover显示的箭头 */}
                            <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                              <svg className="w-4 h-4 text-[#4E73C8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* 全流程查看按钮 (放置在末尾) */}
                  <button
                    type="button"
                    onClick={() => setShowFullProcess(true)}
                    className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-white hover:bg-slate-50 rounded-full shadow-sm hover:shadow-md transition-all border-0 group ml-2"
                    title="全流程查看"
                  >
                    <NodeIndexOutlined className="text-[#4E73C8] text-lg group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
              
              {/* 右侧滚动箭头 */}
              <button 
                type="button"
                className={`absolute right-0 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white/50 backdrop-blur-sm hover:bg-white/80 rounded-full flex items-center justify-center transition-all z-10 shadow-sm ${showRightArrow ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => {
                  const container = document.getElementById('flow-scroll-container');
                  if (container) {
                    container.scrollBy({ left: 300, behavior: 'smooth' });
                  }
                }}
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {showFullProcess && (
              <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
                onClick={() => setShowFullProcess(false)}
              >
                <div 
                  className="bg-white rounded-3xl shadow-2xl w-[1100px] h-[620px] overflow-hidden flex flex-col relative"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-6 py-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#4E73C8]/10 rounded-xl flex items-center justify-center">
                        <NodeIndexOutlined className="text-[#4E73C8]" />
                      </div>
                      <div className="leading-tight">
                        <div className="text-lg font-bold text-slate-800">业务全流程视图</div>
                        <div className="text-xs text-slate-500">查看当前专题全部功能节点及流转关系，悬停查看说明，点击进入对应功能页</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowFullProcess(false)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 grid grid-cols-1">
                    <div className="hidden">
                      <div className="p-4 text-xs text-slate-500">当前专题</div>
                      <nav className="px-2 space-y-1">
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 text-slate-700"
                          onClick={() => setShowFullProcess(false)}
                        >
                          <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                          </svg>
                          工作台
                        </button>
                        {[
                          { key: 'work台账管理', name: '工作台账管理', path: featureHref('work台账管理'), role: '审核角色', stage: '台账阶段' },
                          { key: 'work台账录入', name: '工作台账录入', path: featureHref('work台账录入'), role: '被审核角色', stage: '台账阶段' },
                          { key: 'work台账审核', name: '工作台账审核', path: featureHref('work台账审核'), role: '审核角色', stage: '台账阶段' },
                          { key: 'work台账上报', name: '工作台账上报', path: featureHref('work台账上报'), role: '被审核角色', stage: '台账阶段' },
                          { key: 'rectify督办管理', name: '整改督办管理', path: featureHref('rectify督办管理'), role: '审核角色', stage: '整改阶段' },
                          { key: 'rectify下发管理', name: '整改下发管理', path: featureHref('rectify下发管理'), role: '审核角色', stage: '整改阶段' },
                          { key: 'rectify情况审核', name: '整改情况审核', path: featureHref('rectify情况审核'), role: '审核角色', stage: '整改阶段' },
                        ].map(item => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => onNavigate(item.path)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700"
                          >
                            {item.name}
                          </button>
                        ))}
                      </nav>
                    </div>
                    <div className="relative bg-slate-50">
                      <div className="absolute left-0 top-0 bottom-0 w-14 flex flex-col items-center py-6 hidden">
                        <div className="flex-1 w-7 bg-white/80 rounded-full flex items-center justify-center shadow-sm">
                          <div className="text-[10px] text-slate-500 [writing-mode:vertical-rl] tracking-widest">台账阶段</div>
                        </div>
                        <div className="h-4" />
                        <div className="flex-1 w-7 bg-white/80 rounded-full flex items-center justify-center shadow-sm">
                          <div className="text-[10px] text-slate-500 [writing-mode:vertical-rl] tracking-widest">整改阶段</div>
                        </div>
                      </div>
                      <div className="px-0 py-6 h-full">
                        <div className="relative w-[1200px] h-[480px] mx-auto">
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1200 480">
                            <defs>
                              <marker id="arrowMain" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                                <path d="M0,0 L10,5 L0,10 z" fill="rgb(100,116,139)" />
                              </marker>
                              <marker id="arrowLight" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                                <path d="M0,0 L10,5 L0,10 z" fill="rgb(203,213,225)" />
                              </marker>
                            </defs>
                            <path d="M 220 156 L 320 156" stroke="rgb(100,116,139)" strokeWidth="2" markerEnd="url(#arrowMain)"/>
                            <text x="270" y="145" className="fill-slate-400 text-[10px]">提交审核</text>
                            <path d="M 320 156 L 420 156" stroke="rgb(100,116,139)" strokeWidth="2" markerEnd="url(#arrowMain)"/>
                            <text x="370" y="145" className="fill-slate-400 text-[10px]">审核通过</text>
                            <path d="M 420 156 L 520 156" stroke="rgb(100,116,139)" strokeWidth="2" markerEnd="url(#arrowMain)"/>
                            <text x="470" y="145" className="fill-slate-400 text-[10px]">上报</text>
                            <path d="M 520 156 L 620 226" stroke="rgb(100,116,139)" strokeWidth="2" markerEnd="url(#arrowMain)"/>
                            <text x="570" y="190" className="fill-slate-400 text-[10px]">转入整改</text>
                            <path d="M 620 226 L 720 226" stroke="rgb(100,116,139)" strokeWidth="2" markerEnd="url(#arrowMain)"/>
                            <text x="670" y="215" className="fill-slate-400 text-[10px]">下发整改</text>
                            <path d="M 720 226 L 820 226" stroke="rgb(100,116,139)" strokeWidth="2" markerEnd="url(#arrowMain)"/>
                            <text x="770" y="215" className="fill-slate-400 text-[10px]">督办</text>
                            <path d="M 820 226 L 920 226" stroke="rgb(100,116,139)" strokeWidth="2" markerEnd="url(#arrowMain)"/>
                            <text x="870" y="215" className="fill-slate-400 text-[10px]">审核</text>
                          </svg>
                          {(() => {
                            const myRoles = ['审核角色']; // 示例高亮：审核角色
                            return (
                              <>
                                <div className="absolute" style={{ left: 120, top: 120 }}>
                                  <FlowNode name="工作台账录入" role="被审核角色" stage="台账阶段" desc="录入工作台账信息" upstream={[]} downstream={['工作台账审核']} active={false} onClick={() => onNavigate(featureHref('work台账录入'))} />
                                </div>
                                <div className="absolute" style={{ left: 320, top: 120 }}>
                                  <FlowNode name="工作台账审核" role="审核角色" stage="台账阶段" desc="审核工作台账信息" upstream={['工作台账录入']} downstream={['工作台账上报']} active={myRoles.includes('审核角色')} onClick={() => onNavigate(featureHref('work台账审核'))} />
                                </div>
                                <div className="absolute" style={{ left: 520, top: 120 }}>
                                  <FlowNode name="工作台账上报" role="被审核角色" stage="台账阶段" desc="上报工作台账" upstream={['工作台账审核']} downstream={['整改下发管理']} active={false} onClick={() => onNavigate(featureHref('work台账上报'))} />
                                </div>
                                <div className="absolute" style={{ left: 620, top: 190 }}>
                                  <FlowNode name="工作台账管理" role="审核角色" stage="台账阶段" desc="管理工作台账" upstream={['工作台账上报']} downstream={['整改下发管理']} active={myRoles.includes('审核角色')} onClick={() => onNavigate(featureHref('work台账管理'))} />
                                </div>
                                <div className="absolute" style={{ left: 720, top: 190 }}>
                                  <FlowNode name="整改下发管理" role="审核角色" stage="整改阶段" desc="下发整改任务" upstream={['工作台账管理']} downstream={['整改督办管理']} active={myRoles.includes('审核角色')} onClick={() => onNavigate(featureHref('rectify下发管理'))} />
                                </div>
                                <div className="absolute" style={{ left: 820, top: 190 }}>
                                  <FlowNode name="整改督办管理" role="审核角色" stage="整改阶段" desc="督办整改进展" upstream={['整改下发管理']} downstream={['整改情况审核']} active={myRoles.includes('审核角色')} onClick={() => onNavigate(featureHref('rectify督办管理'))} />
                                </div>
                                <div className="absolute" style={{ left: 920, top: 190 }}>
                                  <FlowNode name="整改情况审核" role="审核角色" stage="整改阶段" desc="审核整改情况" upstream={['整改督办管理']} downstream={[]} active={myRoles.includes('审核角色')} onClick={() => onNavigate(featureHref('rectify情况审核'))} />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 第二大区：综合分析（左） + 待办事项（右） */}
          <section className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-white rounded-2xl shadow-sm p-4 flex flex-col" style={{ height: '592.38px' }}>
              <BreadcrumbNav />
              <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
                {/* 左侧图表区 */}
                <div className="col-span-5 bg-[#F9FBFF] rounded-xl p-4 shadow-sm relative">
                  <div className="text-sm font-semibold text-slate-700 mb-4 flex items-center justify-between">
                    <span>
                      {currentLevel === 1 ? '评价体系总览' : currentLevel === 2 ? `${selectedL1?.name || '维度'} - 指标构成` : `${selectedL2?.name} - 详情分析`}
                    </span>
                    {currentLevel === 1 && !selectedL1 ? (
                      <span className="text-[10px] text-slate-400 font-normal">点击维度查看详细分析</span>
                    ) : (
                      <button
                        type="button"
                        className="px-2.5 py-1 text-[10px] font-semibold text-[#4E73C8] bg-white rounded-full  hover:bg-blue-50 transition-colors"
                        onClick={() => {
                          setCurrentLevel(1);
                          setSelectedL1(null);
                          setSelectedL2(null);
                          setActiveTab('overview');
                        }}
                      >
                        返回一级概览
                      </button>
                    )}
                  </div>
                  
                  <div className="h-80 relative">
                    <div className="h-full w-full" ref={radarChartRef}></div>
                    {currentLevel < 3 && radarOverlayItems.length > 0 && (
                      <div className="absolute inset-0 z-20 pointer-events-none">
                        {radarOverlayItems.map((overlayItem) => {
                          const isActive =
                            currentLevel === 1
                              ? selectedL1?.name === overlayItem.name
                              : selectedL2?.name === overlayItem.name;
                          return (
                            <button
                              key={overlayItem.id}
                              type="button"
                              className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto px-0.5 py-0 whitespace-nowrap border-none bg-transparent shadow-none transition-all ${
                                isActive
                                  ? 'text-[#4E73C8] font-bold'
                                  : 'text-slate-700 hover:text-[#4E73C8]'
                              }`}
                              style={{ left: overlayItem.left, top: overlayItem.top }}
                              onClick={() => {
                                if (currentLevel === 1) {
                                  const dim = analysisData.find(item => item.name === overlayItem.name);
                                  if (dim) {
                                    setSelectedL1(dim);
                                    setSelectedL2(null);
                                    setCurrentLevel(2);
                                    setActiveTab('overview');
                                  }
                                } else if (currentLevel === 2 && selectedL1) {
                                  const ind = selectedL1.indicators.find(item => item.name === overlayItem.name);
                                  if (ind) {
                                    setSelectedL2(ind);
                                    setCurrentLevel(3);
                                    setActiveTab('overview');
                                  }
                                }
                              }}
                            >
                              <span className="text-[11px] leading-none">{overlayItem.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-700">
                        {currentLevel === 1 ? '综合得分' : currentLevel === 2 ? '维度平均分' : '当前指标得分'}
                      </div>
                      <div className="text-2xl font-bold text-[#4E73C8]">
                        {currentLevel === 1 ? (
                          <span title={scoreTitle.overallFormula}>{overallScore}分</span>
                        ) : currentLevel === 2 ? (
                          <span title={selectedL1 ? scoreTitle.dimensionTitle(selectedL1) : ''}>{selectedL1?.score || 0}分</span>
                        ) : (
                          <span title={selectedL2 ? scoreTitle.indicatorTitle(selectedL2) : ''}>{selectedL2?.score ?? 0}分</span>
                        )}
                      </div>
                    </div>
                    
                    {currentLevel === 1 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          当前最低维度：资金整改与风险控制（79分）
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          当前重点关注：问题金额整改到位率（78分）
                        </div>
                      </div>
                    )}
                    
                    {currentLevel === 2 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="text-xs text-slate-600 leading-relaxed">
                          {selectedL1?.description}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${selectedL1?.status === '良好' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                            状态：{selectedL1?.status}
                          </span>
                        </div>
                      </div>
                    )}

                    {currentLevel === 3 && selectedL2 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="text-xs text-slate-600 leading-relaxed">
                          本期值：
                          <span
                            className="font-semibold text-slate-800"
                            title={`本期值口径：当前周期该指标的业务原始数据。\n指标：${selectedL2.name}\n本期值：${selectedL2.detail.currentValue}`}
                          >
                            {selectedL2.detail.currentValue}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 leading-relaxed">
                          标准值：
                          <span
                            className="font-semibold text-slate-800"
                            title={`标准值口径：该指标设定的合规/目标阈值。\n指标：${selectedL2.name}\n标准值：${selectedL2.detail.standardValue}`}
                          >
                            {selectedL2.detail.standardValue}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 leading-relaxed">
                          指标定义：{selectedL2.detail.definition}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 右侧详情分析区 */}
                <div className="col-span-7 bg-[#F9FBFF] rounded-xl p-0 shadow-sm flex flex-col overflow-hidden">
                  <div className="bg-white px-4 pt-3 border-b">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3.5 bg-[#4E73C8] rounded-full"></div>
                        <div className="text-sm font-bold text-slate-800">
                          {currentLevel === 1 ? '一级概览' : currentLevel === 2 ? (selectedL1?.name || '一级维度') : (selectedL2?.name || '二级指标分析')}
                        </div>
                      </div>
                      {currentLevel === 2 && selectedL1 && (
                        <div className="ml-auto w-fit flex items-center gap-1 bg-[#EEF3FF] rounded-full p-1">
                          {['overview', 'topics', 'closure', 'trend'].map(t => (
                            <button 
                              key={t}
                              className={`h-7 px-3 rounded-full text-xs whitespace-nowrap transition-all ${activeTab === t ? 'bg-white text-[#0F3D8A] shadow-sm font-semibold' : 'text-slate-600 hover:text-[#0F3D8A]'}`}
                              onClick={() => setActiveTab(t)}
                            >
                              {t === 'overview' ? '维度概览' : t === 'topics' ? '类型拆解' : t === 'closure' ? '闭环建议' : '趋势概览'}
                            </button>
                          ))}
                        </div>
                      )}
                      {currentLevel === 3 && (
                        <button
                          type="button"
                          className="h-7 px-3 rounded-full text-xs bg-[#EEF3FF] text-[#4E73C8] hover:bg-[#dfe9ff] transition-colors whitespace-nowrap"
                          onClick={() => {
                            setCurrentLevel(2);
                            setActiveTab('analysis');
                          }}
                        >
                          返回图2
                        </button>
                      )}
                    </div>
                    <div className={`overflow-x-auto no-scrollbar ${currentLevel === 2 ? 'hidden' : 'flex gap-6'}`}>
                      {currentLevel === 3 && (
                        <>
                          {['overview', 'analysis', 'anomaly', 'closure', 'trend'].map(t => (
                            <button 
                              key={t}
                              className={`pb-2 text-xs whitespace-nowrap transition-all relative ${activeTab === t ? 'text-[#4E73C8] font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                              onClick={() => setActiveTab(t)}
                            >
                              {t === 'overview' ? '指标概览' : t === 'analysis' ? '指标分析' : t === 'anomaly' ? '异常概览' : t === 'closure' ? '闭环建议' : '趋势分析'}
                              {activeTab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4E73C8]"></div>}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto bg-white/50 custom-scrollbar">
                    {/* Level 1/2 内容 */}
                    {(currentLevel === 1 || currentLevel === 2) && (
                      <div className="space-y-4">
                        {currentLevel === 2 && selectedL1 && (
                          <div className="text-[10px] text-[#4E73C8] bg-blue-50/60  rounded px-2 py-1 inline-flex">
                            当前为“{selectedL1.name}”的二级指标分析视图
                          </div>
                        )}
                        {!selectedL1 && (
                          <div className="space-y-4">
                            <div className="bg-blue-50/50 p-3 rounded-lg ">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
                                <div className="text-[15px] font-bold text-slate-700">评价体系说明</div>
                              </div>
                              <div className="text-xs text-slate-600 leading-relaxed">
                                当前评价体系围绕重点领域整改工作构建，从整改进度、整改时效、责任落实、资金安全、治理成效、数据质量六个一级维度，对整改任务推进情况、问题闭环水平、资金规范性及治理改进成效进行综合分析与预警。
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-white p-3 rounded-lg ">
                                <div className="text-[10px] text-slate-400 mb-1">当前综合得分</div>
                                <div className="text-lg font-bold text-[#4E73C8]">
                                  <span>83分</span>
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded-lg ">
                                <div className="text-[10px] text-slate-400 mb-1">当前最低维度</div>
                                <div className="text-xs font-semibold text-red-600">资金整改与风险控制</div>
                              </div>
                              <div className="bg-white p-3 rounded-lg ">
                                <div className="text-[10px] text-slate-400 mb-1">当前重点关注</div>
                                <div className="text-xs font-semibold text-amber-600">问题金额整改到位率</div>
                              </div>
                            </div>



                            <div className="space-y-2">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
                                <div className="text-[15px] font-bold text-slate-700">一级维度说明列表</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {analysisData.map((dimension) => (
                                  <button
                                    key={dimension.id}
                                    type="button"
                                    className="text-left p-2.5 bg-white rounded-lg  hover:border-[#4E73C8] hover:bg-blue-50/30 transition-all"
                                    onClick={() => {
                                      setSelectedL1(dimension);
                                      setSelectedL2(null);
                                      setCurrentLevel(2);
                                      setActiveTab('overview');
                                    }}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="text-[11px] font-bold text-slate-800 truncate">{dimension.name}</div>
                                      <div className="text-[10px] font-semibold text-[#4E73C8]">
                                        <span title={scoreTitle.dimensionTitle(dimension)}>{dimension.score}分</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                      <span className={`w-1.5 h-1.5 rounded-full ${dimension.status === '良好' ? 'bg-green-500' : dimension.status === '一般' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                                      {dimension.status}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {currentLevel === 2 && selectedL1 && activeTab === 'overview' && (
                          <div className="space-y-4">
                            <div className="bg-blue-50/50 p-3 rounded-lg ">
                              <div className="text-xs text-slate-600 leading-relaxed mb-2">{selectedL1.description}</div>
                              <div className="flex items-center gap-4">
                                <div>
                                  <div className="text-[10px] text-slate-400">当前得分</div>
                                  <div className="text-lg font-bold text-[#4E73C8]">
                                    <span title={scoreTitle.dimensionTitle(selectedL1)}>{selectedL1.score}分</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400">风险判断</div>
                                  <div className={`text-sm font-semibold ${selectedL1.status === '良好' ? 'text-green-600' : selectedL1.status === '一般' ? 'text-amber-600' : 'text-red-600'}`}>{selectedL1.status}</div>
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
                                <div className="text-[15px] font-bold text-slate-700">核心判断依据（二级指标）</div>
                              </div>
                              <div className="space-y-2 mb-4">
                                {selectedL1.indicators.slice(0, 3).map((indicator) => (
                                  <div key={indicator.id} className="flex items-center justify-between rounded-lg  bg-white px-3 py-2">
                                    <div className="text-xs text-slate-700">{indicator.name}</div>
                                    <div className="text-xs font-semibold text-[#4E73C8]">
                                      <span title={scoreTitle.indicatorTitle(indicator)}>{indicator.score}分</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {currentLevel === 2 && selectedL1 && activeTab === 'topics' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-12 text-[10px] text-slate-400 px-2">
                              <div className="col-span-5">二级指标</div>
                              <div className="col-span-2 text-center">得分</div>
                              <div className="col-span-3 text-center">风险等级</div>
                              <div className="col-span-2 text-right">环比</div>
                            </div>
                            {selectedL1.indicators.map((ind) => {
                              const risk = getRiskLabel(ind.score);
                              const delta = calcIndicatorDelta(ind);
                              return (
                                <button
                                  key={ind.id}
                                  type="button"
                                  className="w-full grid grid-cols-12 items-center px-3 py-2 rounded-lg  bg-white hover:border-[#4E73C8] hover:bg-blue-50/20 transition-all text-left"
                                  onClick={() => {
                                    setSelectedL2(ind);
                                    setCurrentLevel(3);
                                    setActiveTab('overview');
                                  }}
                                >
                                  <div className="col-span-5 text-xs font-semibold text-slate-800 truncate pr-2">{ind.name}</div>
                                  <div className="col-span-2 text-center text-xs font-semibold text-[#4E73C8]">
                                    <span title={scoreTitle.indicatorTitle(ind)}>{ind.score}分</span>
                                  </div>
                                  <div className="col-span-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${risk.cls}`}>{risk.text}</span>
                                  </div>
                                  <div className={`col-span-2 text-right text-[10px] font-semibold ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {delta >= 0 ? '+' : ''}{delta}分
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {currentLevel === 2 && selectedL1 && activeTab === 'closure' && (
                          <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-red-50/40 ">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-[3px] h-[14px] bg-red-500 rounded-full"></div>
                                <div className="text-[15px] font-bold text-slate-800">问题识别</div>
                              </div>
                              <div className="text-xs text-slate-600 leading-relaxed">
                                {weakestIndicator ? `${weakestIndicator.name} 当前得分 ${weakestIndicator.score}分，为该维度短板指标。` : '当前维度暂无可识别问题。'}
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 ">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-[3px] h-[14px] bg-slate-400 rounded-full"></div>
                                <div className="text-[15px] font-bold text-slate-800">原因分析</div>
                              </div>
                              <div className="text-xs text-slate-600 leading-relaxed">
                                {weakestIndicator ? `${weakestIndicator.name} 涉及的制度衔接与过程管控仍不充分，前置规划与执行校验存在断点。` : '当前维度暂无明显原因特征。'}
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-amber-50/40 ">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-[3px] h-[14px] bg-amber-500 rounded-full"></div>
                                <div className="text-[15px] font-bold text-slate-800">整改建议</div>
                              </div>
                              <div className="text-xs text-slate-600 leading-relaxed">
                                {weakestIndicator ? weakestIndicator.detail.suggestions : `围绕“${selectedL1.name}”建立问题闭环跟踪机制。`}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white  rounded-lg p-3">
                                <div className="text-[10px] text-slate-400 mb-1">建议动作</div>
                                <div className="text-xs font-semibold text-slate-700">建立专项整改清单</div>
                              </div>
                              <div className="bg-white  rounded-lg p-3">
                                <div className="text-[10px] text-slate-400 mb-1">整改周期</div>
                                <div className="text-xs font-semibold text-slate-700">2 周内形成阶段结果</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {currentLevel === 2 && selectedL1 && activeTab === 'trend' && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
                              <div className="text-[15px] font-bold text-slate-700">维度趋势概览</div>
                            </div>
                            <div className="bg-white rounded-lg  p-3 space-y-3">
                              <svg viewBox="0 0 360 120" className="w-full h-28">
                                <polyline
                                  fill="none"
                                  stroke="#4E73C8"
                                  strokeWidth="2"
                                  points={selectedDimensionTrend.map((value, idx) => `${20 + idx * 64},${110 - value}`).join(' ')}
                                />
                                {selectedDimensionTrend.map((value, idx) => (
                                  <circle key={idx} cx={20 + idx * 64} cy={110 - value} r="3" fill="#4E73C8" />
                                ))}
                              </svg>
                              <div className="grid grid-cols-6 text-[10px] text-slate-400 text-center">
                                {['2024Q1', '2024Q2', '2024Q3', '2024Q4', '2025Q1', '2025Q2'].map((label) => (
                                  <span key={label}>{label}</span>
                                ))}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">近6期平均</span>
                                <span className="font-semibold text-[#4E73C8]">{selectedDimensionAvgScore}分</span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                当前趋势表现整体稳定，建议持续关注“{weakestIndicator?.name || '关键二级指标'}”的改善情况。
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Level 3 内容 */}
                    {currentLevel === 3 && selectedL2 && (
                      <div className="space-y-4">
                        {activeTab === 'overview' && (
                          <div className="space-y-4">
                            <div className="bg-blue-50/50 p-4 rounded-xl ">
                              <div className="grid grid-cols-3 gap-6 mb-4">
                                <div>
                                  <div className="text-[10px] text-slate-400 mb-1">当前得分</div>
                                  <div className="text-2xl font-bold text-[#4E73C8]">
                                    <span title={scoreTitle.indicatorTitle(selectedL2)}>{selectedL2.score}分</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400 mb-1">本期值</div>
                                  <div className="text-2xl font-bold text-slate-700">
                                    <span title={`本期值口径：当前周期该指标的业务原始数据。\n本期值：${selectedL2.detail.currentValue}`}>
                                      {selectedL2.detail.currentValue}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400 mb-1">风险判断</div>
                                  <div className={`text-sm font-bold mt-2 ${selectedL2.result === '良好' ? 'text-green-600' : selectedL2.result === '一般' ? 'text-amber-600' : 'text-red-600'}`}>
                                    {selectedL2.result}
                                  </div>
                                </div>
                              </div>
                              <div className="pt-4 border-t border-blue-100/30">
                                <div className="text-xs font-bold text-slate-700 mb-1">指标定义</div>
                                <div className="text-xs text-slate-600 leading-relaxed">
                                  {selectedL2.detail.definition}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white p-3 rounded-lg  shadow-sm">
                                <div className="text-[10px] text-slate-400 mb-1">最近周期平均得分</div>
                                <div className="text-base font-semibold text-slate-700">
                                  {Math.round(selectedL2.detail.trend.reduce((a, b) => a + b, 0) / selectedL2.detail.trend.length)}分
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded-lg  shadow-sm">
                                <div className="text-[10px] text-slate-400 mb-1">环比变化</div>
                                <div className={`text-base font-semibold ${calcIndicatorDelta(selectedL2) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {calcIndicatorDelta(selectedL2) >= 0 ? '+' : ''}{calcIndicatorDelta(selectedL2)}分
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white p-3 rounded-lg  shadow-sm">
                                <div className="text-[10px] text-slate-400 mb-1">标准值</div>
                                  <div className="text-base font-semibold text-slate-700">
                                    <span title={`标准值口径：该指标设定的合规/目标阈值。\n标准值：${selectedL2.detail.standardValue}`}>
                                      {selectedL2.detail.standardValue}
                                    </span>
                                  </div>
                              </div>
                              <div className="bg-white p-3 rounded-lg  shadow-sm">
                                <div className="text-[10px] text-slate-400 mb-1">评分口径</div>
                                <div className="text-[10px] text-slate-500 leading-relaxed">
                                  指标得分为业务本期值与趋势表现折算后的评分结果
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {activeTab === 'analysis' && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
                              <div className="text-[15px] font-bold text-slate-700">地区贡献/分布情况</div>
                            </div>
                            <div className="space-y-2">
                              {selectedL2.detail.regionalDistribution.length > 0 ? (
                                selectedL2.detail.regionalDistribution.map((region) => (
                                  <div key={region.name} className="flex items-center justify-between p-3 rounded-lg bg-white  hover:border-blue-200 transition-all">
                                    <div className="flex items-center gap-3">
                                      <div className="text-xs font-medium text-slate-700">{region.name}</div>
                                      <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full ${region.status === 'good' ? 'bg-green-500' : region.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}
                                          style={{ width: `${region.value}%` }}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-bold text-slate-800">{region.value}分</span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${region.status === 'good' ? 'bg-green-50 text-green-600' : region.status === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                                        {region.status === 'good' ? '良好' : region.status === 'warning' ? '一般' : '异常'}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-8 bg-slate-50 rounded-xl  text-slate-400 text-xs">
                                  暂无地区分布数据
                                </div>
                              )}
                            </div>
                            <div className="bg-blue-50/30 p-3 rounded-lg ">
                              <div className="text-[10px] text-blue-600 font-semibold mb-1">分析结论：</div>
                              <div className="text-[10px] text-slate-600 leading-relaxed">
                                当前指标在各地区的表现存在一定差异，{selectedL2.detail.regionalDistribution.find(r => r.status === 'bad')?.name || '部分地区'}的表现是拉低整体分值的主要因素。
                              </div>
                            </div>
                          </div>
                        )}

                        {activeTab === 'anomaly' && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-[3px] h-[14px] bg-red-500 rounded-full"></div>
                              <div className="text-[15px] font-bold text-slate-700">指标相关异常项</div>
                            </div>
                            <div className="space-y-3">
                              {selectedL2.detail.rules.length > 0 ? (
                                selectedL2.detail.rules.map((rule, idx) => (
                                  <div key={idx} className="p-4 bg-red-50/30 rounded-xl ">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="text-xs font-bold text-red-800">{rule.name}</div>
                                      <div className="text-[10px] font-bold text-red-600 px-2 py-0.5 bg-red-100/50 rounded-full">异常</div>
                                    </div>
                                    <div className="text-[10px] text-red-700 leading-relaxed opacity-80">
                                      {rule.context}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-red-100/30 flex items-center justify-between">
                                      <div className="text-[10px] text-red-600/70">关联规则命中：1项</div>
                                      <div className="text-[10px] text-red-600/70">涉及地区：{selectedL2.detail.regionalDistribution.filter(r => r.status === 'bad').length || 1}个</div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-8 bg-slate-50 rounded-xl  text-slate-400 text-xs">
                                  当前指标暂无异常记录
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {activeTab === 'closure' && (
                          <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-red-50/40 ">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-[3px] h-[14px] bg-red-500 rounded-full"></div>
                                <div className="text-[15px] font-bold text-slate-800">问题识别</div>
                              </div>
                              <div className="text-xs text-slate-600 leading-relaxed">
                                {selectedL2.name} 当前得分为 {selectedL2.score}分，本期值为 {selectedL2.detail.currentValue}，标准值为 {selectedL2.detail.standardValue}，处于“{selectedL2.result}”状态。
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 ">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-[3px] h-[14px] bg-slate-400 rounded-full"></div>
                                <div className="text-[15px] font-bold text-slate-800">原因分析</div>
                              </div>
                              <div className="text-xs text-slate-600 leading-relaxed">
                                结合地区分布与异常规则分析，该指标的波动主要受{selectedL2.detail.regionalDistribution.find(r => r.status === 'bad')?.name || '特定因素'}影响，过程管控存在薄弱环节。
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-amber-50/40 ">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-[3px] h-[14px] bg-amber-500 rounded-full"></div>
                                <div className="text-[15px] font-bold text-slate-800">整改建议</div>
                              </div>
                              <div className="text-xs text-slate-600 leading-relaxed">
                                {selectedL2.detail.suggestions}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white  rounded-lg p-3">
                                <div className="text-[10px] text-slate-400 mb-1">建议动作</div>
                                <div className="text-xs font-semibold text-slate-700">建立指标专项整改清单</div>
                              </div>
                              <div className="bg-white  rounded-lg p-3">
                                <div className="text-[10px] text-slate-400 mb-1">整改周期</div>
                                <div className="text-xs font-semibold text-slate-700">2 周内形成阶段结果</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeTab === 'trend' && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
                              <div className="text-[15px] font-bold text-slate-700">{selectedL2.name} - 趋势分析</div>
                            </div>
                            <div className="bg-white rounded-lg  p-3 space-y-3">
                              <svg viewBox="0 0 360 120" className="w-full h-28">
                                <polyline
                                  fill="none"
                                  stroke="#4E73C8"
                                  strokeWidth="2"
                                  points={selectedL2.detail.trend.map((value, idx) => `${20 + idx * 64},${110 - value}`).join(' ')}
                                />
                                {selectedL2.detail.trend.map((value, idx) => (
                                  <circle key={idx} cx={20 + idx * 64} cy={110 - value} r="3" fill="#4E73C8" />
                                ))}
                              </svg>
                              <div className="grid grid-cols-6 text-[10px] text-slate-400 text-center">
                                {['1月', '2月', '3月', '4月', '5月', '6月'].map((label) => (
                                  <span key={label}>{label}</span>
                                ))}
                              </div>
                              <div className="flex items-center justify-between text-xs pt-2">
                                <span className="text-slate-500">最近周期平均得分</span>
                                <span className="font-semibold text-[#4E73C8]">
                                  {Math.round(selectedL2.detail.trend.reduce((a, b) => a + b, 0) / selectedL2.detail.trend.length)}分
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded leading-relaxed">
                                当前指标趋势表现{calcIndicatorDelta(selectedL2) >= 0 ? '呈上升趋势' : '存在一定波动'}，建议持续关注关键节点的执行效能。
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm p-4" style={{ height: '592.38px' }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-[4px] h-[18px] bg-[#4E73C8] rounded-full"></div>
                  <div className="text-[17px] font-bold text-[#0F3D8A]">待办事项</div>
                </div>
                <div className="flex items-center gap-1 bg-[#EEF3FF] rounded-full p-1">
                  {
                    [
                      { k: 'pending', l: '全部' },
                      { k: 'overdue', l: '超期' },
                      { k: 'due', l: '临期' },
                      { k: 'returned', l: '被退回' }
                    ].map(t => (
                      <button
                        key={t.k}
                        type="button"
                        onClick={() => setTodoTab(t.k as any)}
                        className={`h-7 px-3 rounded-full text-xs ${todoTab === (t.k as any) ? 'bg-white text-[#0F3D8A] shadow-sm' : 'text-slate-600 hover:text-[#0F3D8A]'}`}
                      >
                        {t.l}
                      </button>
                    ))
                  }
                </div>
              </div>
              <div className="space-y-3 max-h-[509.38px] overflow-y-auto pr-1 custom-scrollbar">
            {displayTodos.map((item, idx) => {
              // 计算是否临期或超期
              const today = new Date();
              const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
              const [m, d] = (item.d || '01-01').split('-').map(s => parseInt(s, 10));
              const dueDate = new Date(today.getFullYear(), (m || 1) - 1, d || 1).getTime();
              const diff = Math.round((dueDate - todayStart) / (1000 * 60 * 60 * 24));
              const isOverdue = diff < 0;
              const isDueSoon = diff >= 0 && diff <= 2;
              
              // 状态样式
              const statusCls = item.status.includes('待提交') ? 'bg-green-50 text-green-600' : item.status.includes('待审核') ? 'bg-blue-50 text-blue-600' : item.status.includes('待上报') ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-600';
              
              return (
                <div key={idx} className="bg-[#F9FBFF] rounded-lg p-3 shadow-sm">
                  {/* 第一行：主信息行 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate relative group">
                        {item.t}
                        <div className="absolute left-0 bottom-full mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-normal max-w-[300px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                          {item.t}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 whitespace-nowrap">截止：{item.d}</div>
                  </div>
                  {/* 第二行：辅助信息行 */}
                  <div className="flex items-center justify-between flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{item.flowNode}</span>
                      <span className="text-xs px-2 py-0.5 bg-slate-50 text-slate-600 rounded-full truncate">{item.module}</span>
                      {todoTab === 'pending' && (isOverdue || isDueSoon) && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                          {isOverdue ? '超期' : '临期'}
                        </span>
                      )}
                      {todoTab === 'overdue' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">超期</span>
                      )}
                      {todoTab === 'due' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">临期</span>
                      )}
                      {todoTab === 'returned' && (isOverdue || isDueSoon) && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                          {isOverdue ? '超期' : '临期'}
                        </span>
                      )}
                    </div>
                    <div>
                      <button type="button" className="text-xs text-[#4E73C8] hover:text-[#3D5FA8] transition-colors whitespace-nowrap">
                        处理
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            </div>
          </section>
          
          {/* 第三大区：智能分析 */}
          <section className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            {/* 顶部横向摘要带 */}
            <div className="flex items-center justify-between gap-6 mb-4 h-[72px] border-b border-slate-50 pb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-[4px] h-[18px] bg-[#4E73C8] rounded-full"></div>
                  <div className="text-[17px] font-bold text-[#0F3D8A]">智能分析</div>
                </div>
                <div className="text-[11px] text-slate-600 leading-normal line-clamp-2 pl-3.5">
                  本季度执行与支付保障风险有所上升，重点问题集中在：
                  <span className="font-medium text-slate-800 ml-1">工资发放延迟</span>（涉及3个县区）、
                  <span className="font-medium text-slate-800 ml-1">资金沉淀率偏高</span>和
                  <span className="font-medium text-slate-800 ml-1">台账更新不及时</span>。
                  建议优先排查支付链路和库款管理情况。
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 pr-6 border-r border-slate-100">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 mb-0.5">分析报告</div>
                    <div className="text-base font-bold text-[#4E73C8]">3<span className="text-[10px] font-normal ml-0.5">份</span></div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 mb-0.5">风险事件</div>
                    <div className="text-base font-bold text-red-500">5<span className="text-[10px] font-normal ml-0.5">个</span></div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 mb-0.5">触发规则</div>
                    <div className="text-base font-bold text-amber-500">4<span className="text-[10px] font-normal ml-0.5">条</span></div>
                  </div>
                </div>
                <div className="space-y-1.5 min-w-[140px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">时间范围</span>
                    <select
                      value={analysisTimeRange}
                      onChange={(e) => setAnalysisTimeRange(e.target.value as any)}
                      className="h-6 px-1 text-[10px]  rounded bg-white text-slate-700 outline-none"
                    >
                      {['最近7天', '最近30天', '本月', '本季度', '自定义'].map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>生成时间</span>
                    <span className="text-slate-600 font-medium">{currentSmartAnalysis.generatedAt}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              {/* 中部左侧：重点风险 2 列布局 */}
              <div className="col-span-8 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
                  <div className="text-[15px] font-bold text-slate-700">重点风险（显示 3 条，共 5 条）</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(showAllConclusions ? currentSmartAnalysis.conclusions : currentSmartAnalysis.conclusions.slice(0, 4)).map((item) => {
                    const triggeredRuleNames = item.ruleIds.map(rid => 
                      currentSmartAnalysis.rules.find(r => r.id === rid)?.name || rid
                    ).join('、');

                    return (
                      <div
                        key={item.id}
                        className="group relative flex flex-col justify-between p-2.5 rounded-xl bg-[#F9FBFF]  hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all"
                        onMouseEnter={() => setAnalysisHoverConclusionId(item.id)}
                        onMouseLeave={() => setAnalysisHoverConclusionId(null)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.risk === '高风险' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                            <div className="text-[13px] font-semibold text-slate-800 truncate">{item.title}</div>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 ${item.risk === '高风险' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'}`}>
                            {item.risk}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-auto">
                          <div className="text-[10px] text-slate-500 truncate mr-2">
                            {triggeredRuleNames} ｜ {item.regions.join('/')}
                          </div>
                          <button
                            type="button"
                            className="text-[10px] text-[#4E73C8] hover:text-[#3D5FA8] font-medium whitespace-nowrap"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAnalysisSelectedConclusionId(item.id);
                              setAnalysisActiveReportId(item.report.id);
                            }}
                          >
                            查看报告 →
                          </button>
                        </div>

                        {/* Hover 浮层 */}
                        <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-[300px] bg-white rounded-xl shadow-2xl  p-3 z-50 transition-all">
                          <div className="text-[11px] text-slate-600 leading-relaxed mb-2">
                            {item.summary}
                          </div>
                          <div className="space-y-1 pt-2 border-t border-slate-100">
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                              涉及地区：<span className="text-slate-700">{item.regions.join(' / ')}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                              触发规则：<span className="text-slate-700">{triggeredRuleNames}</span>
                            </div>
                          </div>
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {currentSmartAnalysis.conclusions.length > 4 && (
                  <button
                    type="button"
                    className="w-full py-1.5 text-[10px] text-slate-400 hover:text-[#4E73C8] flex items-center justify-center gap-1 transition-colors"
                    onClick={() => setShowAllConclusions(!showAllConclusions)}
                  >
                    {showAllConclusions ? '收起分析结论 ↑' : '查看更多分析 ↓'}
                  </button>
                )}
              </div>

              {/* 中部右侧：规则触发情况 */}
              <div className="col-span-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
                  <div className="text-[15px] font-bold text-slate-700">规则触发情况</div>
                </div>
                <div className="bg-[#F9FBFF] rounded-xl p-2 ">
                  <div className="space-y-1">
                    {currentSmartAnalysis.rules.map((rule) => {
                      return (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white transition-all group"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="text-[12px] text-slate-700 truncate">{rule.name}</div>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 ${rule.status === '高频触发' ? 'text-red-600 bg-red-50' : rule.status === '新增触发' ? 'text-blue-600 bg-blue-50' : 'text-amber-600 bg-amber-50'}`}>
                              {rule.status}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="text-[10px] text-slate-400 group-hover:text-[#4E73C8] font-medium ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAnalysisActiveRuleId(rule.id);
                            }}
                          >
                            详情
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {analysisActiveReportId && (
              <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6">
                <div className="w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-2xl p-5 custom-scrollbar">
                  {(() => {
                    const report = currentSmartAnalysis.conclusions.flatMap(item => item.report).find(item => item.id === analysisActiveReportId);
                    if (!report) return null;
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-bold text-[#0F3D8A]">{report.name}</div>
                          <button type="button" className="text-xs text-slate-500 hover:text-slate-700" onClick={() => setAnalysisActiveReportId(null)}>关闭</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg  bg-slate-50/50">
                            <div className="text-[10px] text-slate-400 mb-1">结论概述</div>
                            <div className="text-xs text-slate-700 leading-relaxed">{report.overview}</div>
                          </div>
                          <div className="p-3 rounded-lg  bg-slate-50/50">
                            <div className="text-[10px] text-slate-400 mb-1">影响范围</div>
                            <div className="text-xs text-slate-700 leading-relaxed">{report.impact}</div>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg ">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
                            <div className="text-[15px] font-bold text-slate-700">指标变化趋势</div>
                          </div>
                          <div className="grid grid-cols-6 gap-2 text-center">
                            {report.trend.map((point) => (
                              <div key={point} className="text-[10px] bg-blue-50/50 rounded px-2 py-1 text-slate-600">{point}</div>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg ">
                            <div className="text-xs font-semibold text-slate-700 mb-2">触发规则</div>
                            <div className="space-y-1">
                              {report.triggeredRules.map((r) => <div key={r} className="text-xs text-slate-600">• {r}</div>)}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg ">
                            <div className="text-xs font-semibold text-slate-700 mb-2">关联制度/依据</div>
                            <div className="space-y-1">
                              {report.basis.map((b) => <div key={b} className="text-xs text-slate-600">• {b}</div>)}
                            </div>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg  bg-amber-50/40">
                          <div className="text-xs font-semibold text-slate-700 mb-2">整改建议</div>
                          <div className="text-xs text-slate-700 leading-relaxed">{report.suggestions}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            {analysisActiveRuleId && (
              <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6">
                <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl p-5">
                  {(() => {
                    const rule = currentSmartAnalysis.rules.find(item => item.id === analysisActiveRuleId);
                    if (!rule) return null;
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-base font-bold text-[#0F3D8A]">{rule.name}</div>
                          <button type="button" className="text-xs text-slate-500 hover:text-slate-700" onClick={() => setAnalysisActiveRuleId(null)}>关闭</button>
                        </div>
                        <div className="text-xs text-slate-700"><span className="text-slate-400">规则定义：</span>{rule.definition}</div>
                        <div className="text-xs text-slate-700"><span className="text-slate-400">阈值条件：</span>{rule.threshold}</div>
                        <div className="text-xs text-slate-700"><span className="text-slate-400">指标来源：</span>{rule.source}</div>
                        <div className="text-xs text-slate-700"><span className="text-slate-400">触发逻辑：</span>{rule.logic}</div>
                        <div className="text-xs text-slate-700"><span className="text-slate-400">最近触发：</span>{rule.recent}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </section>
          
          {/* 底部：基础支撑 */}
          <section className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="relative group flex items-center gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-[4px] h-[18px] bg-[#4E73C8] rounded-full"></div>
                  <div className="text-[17px] font-bold text-[#0F3D8A]">基础支撑</div>
                </div>
                <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white shadow rounded-md px-3 py-2 text-xs text-slate-600 whitespace-nowrap z-10">
                  法规/规则/机构/人才/案例/档案等基础资源入口
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {resources.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => onNavigate(r.path)}
                  className="group bg-[#F9FBFF] hover:bg-[#EEF5FF] transition-all relative shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-xl"
                >
                  <div className="flex items-center justify-between p-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-sm">
                        {r.icon}
                      </span>
                      <span className="text-[13px] text-[#334155] group-hover:text-[#1456B8] transition-colors">{r.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-[#1456B8]">{r.count}</span>
                      <span className="text-[11px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">›</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>
      <IndicatorDetailDrawer />
    </div>
  );
});

export default Component;
