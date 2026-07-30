/**
 * @name 被监督者工作台
 *
 * 参考资料：
 * - /src/prototypes/supervised-workbench/spec.md
 * - /src/prototypes/supervised-workbench/style.css
 * - /rules/development-guide.md
 * - /rules/ufsp-page-governance.md
 */
import './style.css';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { BankOutlined, SearchOutlined, BellOutlined, NodeIndexOutlined, SettingOutlined } from '@ant-design/icons';
import * as echarts from 'echarts/core';
import { RadarChart, LineChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import {
  analysisData,
  getKeyAreaAnalysisData,
  getKeyAreaTopicProfile,
  Level1_Dimension,
  Level2_Indicator,
} from './data';
import LocalDebtLevel3Panel from './LocalDebtLevel3Panel';

echarts.use([RadarChart, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);
import TopBar from '../../common/components/TopBar';
import type { AxureHandle, AxureProps, ConfigItem, EventItem, KeyDesc } from '../../common/axure-types';
import { createEventEmitter, getConfigValue } from '../../common/axure-types';

type NavActive = 'home' | 'daily' | 'special' | 'policy' | 'evaluation' | 'support';

const WORKBENCH_PAGE_NAME = '被监督者工作台';
const WORKBENCH_PAGE_DESC = '当前页面基于重点领域整改工作台复制，后续用于承载被监督者角色的待办处理、整改反馈和材料报送等工作。';

const EVENT_LIST: EventItem[] = [{ name: 'onNavigate', desc: '页面内导航', payload: 'string' }];
const ACTION_LIST: Array<{ name: string; desc: string; params?: string }> = [];
const VAR_LIST: KeyDesc[] = [{ name: 'active_category', desc: '当前激活的顶栏分类' }, { name: 'topic_key', desc: '当前主题 key' }];
const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '系统标题', initialValue: '财会监督系统' },
  { type: 'input', attributeId: 'topic_name', displayName: '主题名称', initialValue: WORKBENCH_PAGE_NAME }
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

type TodoItem = {
  t: string;
  d: string;
  level: string;
  flowNode: string;
  module: string;
  status: string;
  actions: string[];
  category?: string;
  returnCount?: number;
  returnDate?: string;
  submittedDate?: string;
  feedbackDate?: string;
};
type TodoTiming = 'overdue' | 'due' | 'normal';
type TodoStatusGroup = '待处理' | '审核中' | '被退回' | '已完成' | '已销号/已完结';
type TodoDisposalPool = 'action' | 'returned' | 'tracking' | 'history';
type TodoFlowStage = '待我处理' | '退回待补正' | '已提交待审核' | '审核/复核中' | '待销号' | '已完成/已销号';
type TodoOverviewItem = TodoItem & {
  timing: TodoTiming;
  dueDays: number;
  statusGroup: TodoStatusGroup;
  disposalPool: TodoDisposalPool;
  flowStage: TodoFlowStage;
  category: string;
  responseAction: string;
};
type TodoOverviewFilter = { kind: 'response' | 'tracking' | 'deadline' | 'category' | 'blockage' | 'risk' | 'progress'; value: string; label: string };
type FlowStepItem = { key: string; name: string; mainCount: number; status: Array<{ label: string; value: number }> };
type ResourceItem = { key: string; icon: string; title: string; count: number; path: string };
type AssistDrawerType = 'priority' | 'responseList' | 'basis' | 'return' | 'material' | 'selfCheck' | 'history' | 'progress' | 'flow';

const TODO_REFERENCE_DATE = new Date(2026, 2, 26).getTime();
const TODO_TRACKING_STAGES: TodoFlowStage[] = ['已提交待审核', '审核/复核中', '待销号'];
const TODO_RESPONSE_ACTIONS = ['退回待补正', '待处理', '待补充说明/材料', '待更新整改进度', '待提交/重新提交'];

const getTodoDateTime = (md: string) => {
  const [month, day] = (md || '01-01').split('-').map((item) => parseInt(item, 10));
  return new Date(2026, (month || 1) - 1, day || 1).getTime();
};

const getTodoTiming = (md: string): TodoTiming => {
  const diff = getTodoDueDays(md);
  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'due';
  return 'normal';
};

const getTodoDueDays = (md: string) => Math.round((getTodoDateTime(md) - TODO_REFERENCE_DATE) / (1000 * 60 * 60 * 24));

const getTodoStatusGroup = (status: string): TodoStatusGroup => {
  if (status.includes('被退回') || status.includes('退回')) return '被退回';
  if (status.includes('已销号') || status.includes('已完结')) return '已销号/已完结';
  if (status.includes('已完成') || status.includes('待确认') || status.includes('待销号') || status.includes('待完结')) return '已完成';
  if (status.includes('审核中') || status.includes('待审核')) return '审核中';
  return '待处理';
};

const getTodoDisposalPool = (status: string): TodoDisposalPool => {
  if (status.includes('被退回') || status.includes('退回')) return 'returned';
  if (status.includes('已销号') || status.includes('已完结') || status.includes('已归档')) return 'history';
  if (status.includes('已提交') || status.includes('待审核') || status.includes('审核中') || status.includes('复核') || status.includes('待确认') || status.includes('待销号')) return 'tracking';
  return 'action';
};

const getTodoFlowStage = (status: string): TodoFlowStage => {
  if (status.includes('被退回') || status.includes('退回')) return '退回待补正';
  if (status.includes('已销号') || status.includes('已完结') || status.includes('已归档')) return '已完成/已销号';
  if (status.includes('待销号')) return '待销号';
  if (status.includes('已提交') || status.includes('待审核')) return '已提交待审核';
  if (status.includes('审核中') || status.includes('复核') || status.includes('待确认')) return '审核/复核中';
  return '待我处理';
};

const getTodoStatusPillClass = (status: string) => {
  if (status.includes('退回')) return 'bg-red-50 text-red-600';
  if (status.includes('审核')) return 'bg-blue-50 text-blue-600';
  if (status.includes('报送') || status.includes('上报')) return 'bg-purple-50 text-purple-600';
  if (status.includes('确认') || status.includes('销号') || status.includes('完结') || status.includes('已完成')) return 'bg-green-50 text-green-600';
  if (status.includes('处理中')) return 'bg-amber-50 text-amber-600';
  return 'bg-slate-50 text-slate-600';
};

const getTodoCategory = (item: TodoItem, categoryTypes: string[]) => {
  if (item.category) return item.category;
  const text = `${item.t}${item.flowNode}${item.module}${item.status}`;
  const findType = (keys: string[], fallbackIndex: number) => (
    categoryTypes.find((type) => keys.some((key) => type.includes(key))) || categoryTypes[fallbackIndex] || categoryTypes[0] || '其他事项'
  );

  if (/报告|周报|报送|上报|导出/.test(text)) return findType(['报告', '报送'], 3);
  if (/化债|资金|专项债|追缴|拨付|支付/.test(text)) return findType(['资金', '复核'], 1);
  if (/进展|进度|压降|督办|销号|闭环|确认/.test(text)) return findType(['进度', '闭环'], 2);
  if (/退回|补录|补正|附件|材料/.test(text)) return findType(['材料', '补正', '台账'], 3);
  if (/线索|核验|核对|台账|抽查|审核/.test(text)) return findType(['线索', '核验', '事项'], 0);
  return categoryTypes[0] || '其他事项';
};

const getTodoResponseAction = (item: TodoItem) => {
  const text = `${item.t}${item.flowNode}${item.module}${item.status}${item.category || ''}`;
  if (/被退回|退回|补正/.test(item.status)) return '退回待补正';
  if (/报告|周报|报送|上报|导出/.test(text)) return '待提交/重新提交';
  if (/补录|附件|材料|补充|佐证/.test(text)) return '待补充说明/材料';
  if (/进展|进度|压降|督办|下发|整改/.test(text)) return '待更新整改进度';
  return '待处理';
};

const getTodoTrackingWaitDays = (item: TodoItem) => {
  if (!item.submittedDate) return 0;
  return Math.max(0, Math.round((TODO_REFERENCE_DATE - getTodoDateTime(item.submittedDate)) / (1000 * 60 * 60 * 24)));
};

const isTodoUploadedNotSubmitted = (item: TodoOverviewItem) => (
  item.responseAction === '待提交/重新提交' &&
  /报告|周报|报送|材料|附件|佐证/.test(`${item.t}${item.module}${item.status}${item.category}`) &&
  item.dueDays <= 1
);

const matchesTodoOverviewFilter = (item: TodoOverviewItem, filter: TodoOverviewFilter | null) => {
  if (!filter) return true;
  if (filter.kind === 'category') return item.category === filter.value && (item.disposalPool === 'action' || item.disposalPool === 'returned');
  if (filter.kind === 'blockage') {
    const text = `${item.t}${item.flowNode}${item.module}${item.status}${item.category}`;
    if (filter.value === 'materialIncomplete') return item.disposalPool !== 'history' && /材料|附件|补录|佐证|凭证|补充/.test(text);
    if (filter.value === 'stale') return item.disposalPool === 'action' && item.responseAction === '待更新整改进度';
    if (filter.value === 'multiReturned') return (item.returnCount || 0) > 1;
  }
  if (filter.kind === 'risk') {
    const text = `${item.t}${item.flowNode}${item.module}${item.status}${item.category}`;
    if (filter.value === '高') return item.level === '高' && item.disposalPool !== 'history';
    if (filter.value === 'amount') return item.disposalPool !== 'history' && /资金|债务|专项债|化债|金额|拨付|支付/.test(text);
    if (filter.value === 'repeat') return item.disposalPool !== 'history' && ((item.returnCount || 0) > 0 || /重复|抽查|核验|台账/.test(text));
    if (filter.value === 'doubt') return item.disposalPool !== 'history' && /线索|核验|抽查|疑点/.test(text);
    return item.level === filter.value && item.disposalPool !== 'history';
  }
  if (filter.kind === 'progress') {
    if (filter.value === 'all' || filter.value === 'followed') return item.disposalPool === 'tracking';
    return item.disposalPool === 'tracking';
  }
  if (filter.kind === 'tracking') {
    if (filter.value === 'all') return item.disposalPool === 'tracking';
    return item.disposalPool === 'tracking' && item.flowStage === filter.value;
  }
  if (filter.kind === 'deadline') {
    if (filter.value === 'overdue') return item.disposalPool !== 'history' && item.dueDays < 0;
    if (filter.value === 'today') return item.disposalPool !== 'history' && item.dueDays === 0;
    if (filter.value === 'within3') return item.disposalPool !== 'history' && item.dueDays >= 1 && item.dueDays <= 3;
    if (filter.value === 'within3to5') return item.disposalPool !== 'history' && item.dueDays >= 3 && item.dueDays <= 5;
    if (filter.value === 'within7') return item.disposalPool !== 'history' && item.dueDays >= 4 && item.dueDays <= 7;
  }
  if (filter.kind === 'response') {
    const isResponse = item.disposalPool === 'action' || item.disposalPool === 'returned';
    if (filter.value === 'all') return isResponse;
    const isUploadedNotSubmitted = isTodoUploadedNotSubmitted(item);
    if (filter.value === '已上传未提交') return isResponse && isUploadedNotSubmitted;
    if (filter.value === '待提交/重新提交') return isResponse && item.responseAction === filter.value && !isUploadedNotSubmitted;
    return isResponse && item.responseAction === filter.value;
  }
  return true;
};

const Component = forwardRef<AxureHandle, AxureProps>(function Component(innerProps, ref) {
  const configSource = innerProps && typeof innerProps.config === 'object' && innerProps.config ? innerProps.config : {};
  const onEventHandler = typeof innerProps?.onEvent === 'function' ? innerProps.onEvent : undefined;
  const emitEvent = useMemo(() => createEventEmitter(onEventHandler), [onEventHandler]);
  const query = useQuery();

  const title = getConfigValue<string>(configSource, 'title', '财会监督系统');
  const topicName = getConfigValue<string>(configSource, 'topic_name', String(query.topic || WORKBENCH_PAGE_NAME));
  const categoryFromQuery = String(query.category || 'special').toLowerCase();

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
      { label: '三保监控', link: '/prototypes/richang-zhuanti-workbench?topic=sanbao&category=daily' },
      { label: '三公监控', link: '/prototypes/richang-zhuanti-workbench?topic=sangong&category=daily' },
      { label: '政采监控', link: '/prototypes/richang-zhuanti-workbench?topic=zhengcai&category=daily' },
      { label: '工资监控', link: '/prototypes/richang-zhuanti-workbench?topic=salary&category=daily' },
      { label: '一卡通监控', link: '/prototypes/richang-zhuanti-workbench?topic=yikatong&category=daily' },
      { label: '执行进度监控', link: '/prototypes/richang-yewu-workbench?topic=execution&category=daily' },
      { label: '库款保障监控', link: '/prototypes/richang-yewu-workbench?topic=treasury&category=daily' },
      { label: '单位资金监控', link: '/prototypes/richang-yewu-workbench?topic=unitfund&category=daily' }
    ];
    const special = [
      {
        label: '年度重点检查',
        children: [
          { label: '地方政府债务', link: '/prototypes/topic-workbench2?topic=yearly/local-debt&category=special' },
          { label: '高标准农田建设资金', link: '/prototypes/topic-workbench2?topic=yearly/farmland-fund&category=special' },
          { label: '国有资产处置管理', link: '/prototypes/topic-workbench2?topic=yearly/state-assets&category=special' },
          { label: '减税降费落实', link: '/prototypes/topic-workbench2?topic=yearly/tax-reduction&category=special' },
          { label: '违规返还财政收入', link: '/prototypes/topic-workbench2?topic=yearly/refund-revenue&category=special' },
          { label: '基层三保', link: '/prototypes/topic-workbench2?topic=yearly/sanbao-basic&category=special' },
          { label: '财政暂付款管理', link: '/prototypes/topic-workbench2?topic=yearly/temporary-payment&category=special' },
          { label: '财政收入虚收空转', link: '/prototypes/topic-workbench2?topic=yearly/false-revenue&category=special' },
          { label: '一卡通', link: '/prototypes/topic-workbench2?topic=yearly/one-card&category=special' },
          { label: '招商引资优惠政策', link: '/prototypes/topic-workbench2?topic=yearly/tax-preferential&category=special' }
        ]
      },
      { label: '审计问题整改', link: '/prototypes/topic-workbench2?topic=audit&category=special' },
      { label: '巡视问题整改', link: '/prototypes/topic-workbench2?topic=inspect&category=special' },
      { label: '监管局问题整改', link: '/prototypes/topic-workbench2?topic=supervision&category=special' }
    ];
    const evaluation = [
      { label: '财会监督考评', link: '/prototypes/topic-workbench2?topic=eval-finance&category=evaluation' },
      { label: '财政内控考评', link: '/prototypes/topic-workbench2?topic=eval-internal&category=evaluation' }
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

  const topicKey = String(query.topic || 'key_area_rectify').toLowerCase();
  const isKeyAreaEvaluationTopic = activeCategory === 'special';
  // 保留变量名以复用已打磨完成的地方政府债务评级体系视图；语义上表示“重点领域整改统一评级模板”。
  const isLocalDebt = isKeyAreaEvaluationTopic;
  const keyAreaTopicProfile = useMemo(() => getKeyAreaTopicProfile(topicKey), [topicKey]);
  const localDebtFlowSteps: FlowStepItem[] = [
    { key: 'debt-ledger-manage', name: '债务台账管理', mainCount: 11, status: [{ label: '临期', value: 2 }, { label: '超期', value: 1 }, { label: '被退回', value: 0 }] },
    { key: 'debt-risk-verify', name: '债务风险核验', mainCount: 7, status: [{ label: '临期', value: 2 }, { label: '超期', value: 2 }, { label: '被退回', value: 1 }] },
    { key: 'debt-rectify-assign', name: '整改任务下发', mainCount: 5, status: [{ label: '临期', value: 1 }, { label: '超期', value: 0 }, { label: '被退回', value: 1 }] },
    { key: 'debt-progress-track', name: '整改进度跟踪', mainCount: 9, status: [{ label: '临期', value: 3 }, { label: '超期', value: 2 }, { label: '被退回', value: 0 }] },
    { key: 'debt-fund-review', name: '化债资金复核', mainCount: 4, status: [{ label: '临期', value: 1 }, { label: '超期', value: 1 }, { label: '被退回', value: 0 }] },
    { key: 'debt-report-submit', name: '报告报送', mainCount: 3, status: [{ label: '临期', value: 1 }, { label: '超期', value: 0 }, { label: '被退回', value: 0 }] },
    { key: 'debt-detail-query', name: '债务明细查询', mainCount: 0, status: [] },
  ];
  const defaultFlowSteps: FlowStepItem[] = [
    { key: 'work台账管理', name: '工作台账管理', mainCount: 0, status: [] },
    { key: 'work台账录入', name: '工作台账录入', mainCount: 8, status: [] },
    { key: 'work台账审核', name: '工作台账审核', mainCount: 6, status: [{ label: '临期', value: 2 }, { label: '超期', value: 1 }, { label: '被退回', value: 1 }] },
    { key: 'work台账上报', name: '工作台账上报', mainCount: 4, status: [{ label: '临期', value: 2 }, { label: '超期', value: 0 }, { label: '被退回', value: 1 }] },
    { key: 'rectify督办管理', name: '整改督办管理', mainCount: 9, status: [{ label: '临期', value: 3 }, { label: '超期', value: 2 }, { label: '被退回', value: 0 }] },
    { key: 'rectify下发管理', name: '整改下发管理', mainCount: 7, status: [{ label: '临期', value: 2 }, { label: '超期', value: 0 }, { label: '被退回', value: 0 }] },
    { key: 'rectify情况审核', name: '整改情况审核', mainCount: 5, status: [{ label: '临期', value: 1 }, { label: '超期', value: 0 }, { label: '被退回', value: 1 }] },
    { key: 'rectify明细查询', name: '整改明细查询', mainCount: 0, status: [] },
  ];
  const localDebtTodos: TodoItem[] = [
    { t: '核验平台公司隐性债务线索台账', d: '03-28', level: '高', flowNode: '债务台账管理', module: '债务台账管理', status: '待处理', actions: ['处理'], category: '线索核验类' },
    { t: '复核地方政府专项债项目资金闭环材料', d: '03-30', level: '高', flowNode: '化债资金复核', module: '化债资金复核', status: '已提交待审核', actions: ['跟踪'], category: '资金复核类', submittedDate: '03-22' },
    { t: '下发地方政府债务风险整改清单', d: '03-26', level: '高', flowNode: '整改任务下发', module: '整改任务下发', status: '待下发', actions: ['处理'], category: '整改进度类' },
    { t: '跟踪高风险地区债务压降进展', d: '03-25', level: '高', flowNode: '整改进度跟踪', module: '整改进度跟踪', status: '处理中', actions: ['处理'], category: '整改进度类' },
    { t: '核对债务化解方案与实际执行偏差', d: '03-24', level: '中', flowNode: '债务风险核验', module: '债务风险核验', status: '待核验', actions: ['处理'], category: '线索核验类' },
    { t: '汇总地方政府债务整改周报', d: '03-27', level: '中', flowNode: '报告报送', module: '报告报送', status: '待报送', actions: ['处理'], category: '报告报送类' },
    { t: '抽查融资平台新增债务材料', d: '03-29', level: '中', flowNode: '债务风险核验', module: '债务风险核验', status: '待处理', actions: ['处理'], category: '线索核验类' },
    { t: '补录债务台账附件缺失项', d: '03-22', level: '低', flowNode: '债务台账管理', module: '债务台账管理', status: '待补录', actions: ['处理'], category: '材料补正类' },
    { t: '导出债务整改明细报表', d: '04-02', level: '低', flowNode: '债务明细查询', module: '债务明细查询', status: '待处理', actions: ['处理'], category: '报告报送类' },
    { t: '补正隐性债务线索核验退回说明', d: '03-27', level: '中', flowNode: '债务风险核验', module: '债务风险核验', status: '被退回', actions: ['补正'], category: '材料补正类', returnCount: 1, returnDate: '03-25' },
    { t: '确认化债资金闭环复核结果', d: '03-31', level: '中', flowNode: '化债资金复核', module: '化债资金复核', status: '审核/复核中', actions: ['跟踪'], category: '资金复核类', submittedDate: '03-24', feedbackDate: '03-25' },
    { t: '办理违规举债整改事项销号', d: '04-03', level: '低', flowNode: '整改进度跟踪', module: '整改进度跟踪', status: '待销号', actions: ['跟踪'], category: '整改进度类', submittedDate: '03-23', feedbackDate: '03-25' },
    { t: '归档已完结债务整改事项', d: '04-06', level: '低', flowNode: '债务明细查询', module: '债务明细查询', status: '已销号/已完结', actions: ['查看'], category: '报告报送类' },
  ];
  const defaultTodos: TodoItem[] = [
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
    
    // 新增：临期待办事项（原型基准日为03-26，用于展示临期与3-5天临期筛选）
    { t: '准备季度工作总结报告', d: '03-27', level: '中', flowNode: '台账分发录入', module: '工作台账管理', status: '待处理', actions: ['处理'] },
    { t: '审核部门预算调整申请', d: '03-28', level: '高', flowNode: '问题整改更新', module: '整改情况审核', status: '待审核', actions: ['处理'] },
    
    // 新增：正常待办事项（既不是超期也不是临期）
    { t: '制定下季度工作计划', d: '04-01', level: '中', flowNode: '台账分发录入', module: '工作台账管理', status: '待处理', actions: ['处理'] },
    { t: '组织部门业务培训', d: '04-05', level: '低', flowNode: '问题整改更新', module: '整改督办管理', status: '待安排', actions: ['处理'] },
    { t: '补正县区整改材料退回说明', d: '03-27', level: '中', flowNode: '问题整改更新', module: '整改情况审核', status: '被退回', actions: ['补正'] },
    { t: '确认整改完成事项闭环结果', d: '03-31', level: '中', flowNode: '问题整改更新', module: '整改情况审核', status: '待确认', actions: ['确认'] },
    { t: '办理问题整改事项销号', d: '04-03', level: '低', flowNode: '问题整改更新', module: '整改督办管理', status: '待销号', actions: ['办理'] },
    { t: '查看已完结台账归档记录', d: '04-06', level: '低', flowNode: '整改明细查询', module: '独立入口', status: '已销号/已完结', actions: ['查看'] }
  ];
  const currentAnalysisData = useMemo(
    () => (isLocalDebt ? getKeyAreaAnalysisData(topicKey) : analysisData),
    [isLocalDebt, topicKey],
  );
  const topicProfile = useMemo(() => {
    if (isLocalDebt) {
      const topicTitle = keyAreaTopicProfile.title;
      const topicShortName = keyAreaTopicProfile.shortName;
      const adaptName = (name: string) => (
        topicKey === 'yearly/local-debt'
          ? name
          : name.replace(/地方政府债务|债务|化债/g, topicShortName)
      );
      return {
        displayName: WORKBENCH_PAGE_NAME,
        descText: WORKBENCH_PAGE_DESC,
        stageData: [
          { name: '识别', count: 17, rate: 0.88 },
          { name: '核验', count: 12, rate: 0.72 },
          { name: '下发', count: 9, rate: 0.55 },
          { name: '整改', count: 7, rate: 0.43 },
          { name: '复核', count: 4, rate: 0.26 },
          { name: '闭环', count: 2, rate: 0.14 },
        ],
        todos: localDebtTodos.map((item) => ({
          ...item,
          t: adaptName(item.t),
          flowNode: adaptName(item.flowNode),
          module: adaptName(item.module),
        })),
        resources: [
          { key: 'law', icon: '📜', title: `${topicShortName}法规`, count: 42, path: '/resources?tab=law' },
          { key: 'rule', icon: '📘', title: `${topicShortName}规则`, count: 28, path: '/resources?tab=rule' },
          { key: 'case', icon: '🧰', title: `${topicShortName}案例`, count: 19, path: '/resources?tab=case' },
          { key: 'archive', icon: '🗂️', title: `${topicShortName}台账/数据`, count: 156, path: '/resources?tab=archive' },
        ] as ResourceItem[],
        flowSteps: localDebtFlowSteps.map((step) => ({ ...step, name: adaptName(step.name) })),
        evaluationIntro: `当前总览页展示${topicTitle}主题已启用评价体系的结果汇总，围绕一级指标得分、状态与综合得分，支撑对${topicTitle}专项监督成效进行整体研判。`,
        weakestDimension: keyAreaTopicProfile.dimensions[1] || '风险预警与整改闭环',
        focusIndicator: keyAreaTopicProfile.dimensions[2] || `${topicTitle}重点指标`,
        smartSummary: `当前展示的是“${topicTitle}.xlsx”中的评价体系定义，不展示实时业务结果。权重、公式和依据已按表接入；实际当前值、得分、趋势需接入业务数据后才能展示。`,
        ruleHitTitle: '当前模式：评价体系定义展示',
        ruleHitPolicy: '说明：未接入真实业务结果时，不展示规则触发结论',
      };
    }
    return {
      displayName: WORKBENCH_PAGE_NAME,
      descText: WORKBENCH_PAGE_DESC,
      stageData: [
        { name: '受理', count: 9, rate: 0.6 },
        { name: '研判', count: 6, rate: 0.5 },
        { name: '督办', count: 3, rate: 0.38 },
        { name: '复核', count: 2, rate: 0.26 },
        { name: '催办', count: 1, rate: 0.18 },
        { name: '闭环', count: 0, rate: 0.1 },
      ],
      todos: defaultTodos,
      resources: [
        { key: 'law', icon: '📜', title: '法制库', count: 120, path: '/resources?tab=law' },
        { key: 'rule', icon: '📘', title: '规则库', count: 70, path: '/resources?tab=rule' },
        { key: 'case', icon: '🧰', title: '案例库', count: 63, path: '/resources?tab=case' },
        { key: 'archive', icon: '🗂️', title: '档案/数据', count: 342, path: '/resources?tab=archive' },
      ] as ResourceItem[],
      flowSteps: defaultFlowSteps,
      evaluationIntro: '当前评价体系围绕重点领域整改工作构建，从整改进度、整改时效、责任落实、资金安全、治理成效、数据质量六个一级维度，对整改任务推进情况、问题闭环水平、资金规范性及治理改进成效进行综合分析与预警。',
      weakestDimension: '资金整改与风险控制',
      focusIndicator: '问题金额整改到位率',
      smartSummary: '本季度执行与支付保障风险有所上升，重点问题集中在工资发放延迟、资金沉淀率偏高和台账更新不及时。建议优先排查支付链路和库款管理情况。',
      ruleHitTitle: '触发规则：问题整改率低于阈值',
      ruleHitPolicy: '关联制度：三保资金监督整改办法',
    };
  }, [isLocalDebt, keyAreaTopicProfile, topicKey]);
  const { displayName, descText, stageData, todos, resources } = topicProfile;
  const [overviewFilter, setOverviewFilter] = useState<TodoOverviewFilter | null>(null);
  const [trackingDrawerFilter, setTrackingDrawerFilter] = useState<TodoOverviewFilter | null>(null);
  const topicOverviewCategoryTypes = useMemo(() => (
    ['线索核验类', '资金复核类', '整改进度类', '材料补正类', '报告报送类']
  ), []);
  const todoFacts = useMemo<TodoOverviewItem[]>(() => (
    todos.map((item) => ({
      ...item,
      timing: getTodoTiming(item.d),
      dueDays: getTodoDueDays(item.d),
      statusGroup: getTodoStatusGroup(item.status),
      disposalPool: getTodoDisposalPool(item.status),
      flowStage: getTodoFlowStage(item.status),
      category: getTodoCategory(item, topicOverviewCategoryTypes),
      responseAction: getTodoResponseAction(item),
    }))
  ), [todos, topicOverviewCategoryTypes]);
  const displayTodos = useMemo(() => {
    if (overviewFilter) return todoFacts.filter((item) => matchesTodoOverviewFilter(item, overviewFilter));
    return todoFacts.filter((item) => item.disposalPool !== 'history');
  }, [todoFacts, overviewFilter]);
  const responseTodos = useMemo(() => (
    todoFacts.filter((item) => item.disposalPool === 'action' || item.disposalPool === 'returned')
  ), [todoFacts]);
  const trackingTodos = useMemo(() => (
    todoFacts.filter((item) => item.disposalPool === 'tracking')
  ), [todoFacts]);
  const returnedResponseTodos = useMemo(() => (
    responseTodos.filter((item) => item.disposalPool === 'returned')
  ), [responseTodos]);
  const uploadedNotSubmittedTodos = useMemo(() => (
    responseTodos.filter((item) => isTodoUploadedNotSubmitted(item))
  ), [responseTodos]);
  const handledProgressTodos = useMemo(() => {
    return trackingTodos;
  }, [trackingTodos]);
  const followedProgressCount = useMemo(() => (
    Math.min(2, handledProgressTodos.length)
  ), [handledProgressTodos]);
  const activeTodoPool = useMemo(() => (
    todoFacts.filter((item) => item.disposalPool !== 'history')
  ), [todoFacts]);
  const overdueTodos = useMemo(() => (
    activeTodoPool.filter((item) => item.dueDays < 0)
  ), [activeTodoPool]);
  const todayDueTodos = useMemo(() => (
    activeTodoPool.filter((item) => item.dueDays === 0)
  ), [activeTodoPool]);
  const within3Todos = useMemo(() => (
    activeTodoPool.filter((item) => item.dueDays >= 1 && item.dueDays <= 3)
  ), [activeTodoPool]);
  const within7Todos = useMemo(() => (
    activeTodoPool.filter((item) => item.dueDays >= 4 && item.dueDays <= 7)
  ), [activeTodoPool]);
  const within3To5Todos = useMemo(() => (
    activeTodoPool.filter((item) => item.dueDays >= 3 && item.dueDays <= 5)
  ), [activeTodoPool]);
  const earliestWithin3Due = useMemo(() => {
    if (within3Todos.length === 0) return '暂无';
    return [...within3Todos].sort((a, b) => getTodoDateTime(a.d) - getTodoDateTime(b.d))[0].d;
  }, [within3Todos]);
  const longestOverdueDays = useMemo(() => {
    if (overdueTodos.length === 0) return 0;
    return Math.max(...overdueTodos.map((item) => Math.abs(item.dueDays)));
  }, [overdueTodos]);
  const responseActionItems = useMemo(() => (
    TODO_RESPONSE_ACTIONS
      .map((action) => {
        const items = responseTodos.filter((item) => item.responseAction === action);
        return {
          action,
          count: items.length,
          returned: items.filter((item) => item.disposalPool === 'returned').length,
        };
      })
  ), [responseTodos]);
  const trackingStageItems = useMemo(() => (
    TODO_TRACKING_STAGES.map((stage) => ({
      stage,
      label: stage === '已提交待审核' ? '待审核' : stage === '待销号' ? '待最终确认' : stage,
      count: trackingTodos.filter((item) => item.flowStage === stage).length,
    }))
  ), [trackingTodos]);
  const longestTrackingWaitDays = useMemo(() => {
    if (trackingTodos.length === 0) return 0;
    return Math.max(...trackingTodos.map(getTodoTrackingWaitDays));
  }, [trackingTodos]);
  const trackingDelayedCount = useMemo(() => (
    trackingTodos.filter((item) => getTodoTrackingWaitDays(item) >= 7).length
  ), [trackingTodos]);
  const latestTrackingFeedback = useMemo(() => {
    const feedbackDates = trackingTodos
      .map((item) => item.feedbackDate)
      .filter((item): item is string => Boolean(item));
    if (feedbackDates.length === 0) return '暂无';
    return feedbackDates.sort((a, b) => getTodoDateTime(b) - getTodoDateTime(a))[0];
  }, [trackingTodos]);
  const progressDrawerTodos = useMemo(() => {
    if (!trackingDrawerFilter) {
      return handledProgressTodos;
    }
    if (trackingDrawerFilter.kind === 'progress' && trackingDrawerFilter.value === 'followed') {
      return handledProgressTodos.slice(0, followedProgressCount);
    }
    if (trackingDrawerFilter.kind === 'progress' && trackingDrawerFilter.value === 'stalled') {
      return handledProgressTodos.filter((item) => getTodoTrackingWaitDays(item) >= 7);
    }
    if (trackingDrawerFilter.kind === 'progress' && trackingDrawerFilter.value === 'longest') {
      if (handledProgressTodos.length === 0) return [];
      const longest = Math.max(...handledProgressTodos.map(getTodoTrackingWaitDays));
      return handledProgressTodos.filter((item) => getTodoTrackingWaitDays(item) === longest);
    }
    return handledProgressTodos.filter((item) => matchesTodoOverviewFilter(item, trackingDrawerFilter));
  }, [handledProgressTodos, followedProgressCount, trackingDrawerFilter]);
  const applyOverviewFilter = (filter: TodoOverviewFilter) => {
    setOverviewFilter(filter);
  };
  const isOverviewFilterActive = (kind: TodoOverviewFilter['kind'], value: string) => (
    overviewFilter?.kind === kind && overviewFilter.value === value
  );
  const topicParam = encodeURIComponent(topicKey);
  const categoryParam = encodeURIComponent(activeCategory);
  const featureHref = (featureKey: string) =>
    `/prototypes/topic-function-list-copy?topic=${topicParam}&category=${categoryParam}&feature=${encodeURIComponent(featureKey)}`;
  const evaluationConfigHref = `/prototypes/evaluation-graph?topic=${topicParam}&category=${categoryParam}`;
  const FLOW_STEPS = useMemo(() => {
    return topicProfile.flowSteps.map((step) => ({
      ...step,
      path: featureHref(step.key),
    }));
  }, [categoryParam, topicParam, topicProfile]);
  
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
  const [evaluationView, setEvaluationView] = useState<'score' | 'trend'>('score');
  const [selectedEvaluationPeriod, setSelectedEvaluationPeriod] = useState<string>('2026年4月');
  const [selectedTrendStart, setSelectedTrendStart] = useState<string>('2025年11月');
  const [selectedTrendEnd, setSelectedTrendEnd] = useState<string>('2026年4月');
  const [analysisTimeRange, setAnalysisTimeRange] = useState<'最近7天' | '最近30天' | '本月' | '本季度' | '自定义'>('最近30天');
  const [analysisCustomRange, setAnalysisCustomRange] = useState<{ start: string; end: string }>({ start: '2025-02-01', end: '2025-02-18' });
  const [analysisHoverConclusionId, setAnalysisHoverConclusionId] = useState<string | null>(null);
  const [analysisSelectedConclusionId, setAnalysisSelectedConclusionId] = useState<string | null>(null);
  const [analysisActiveReportId, setAnalysisActiveReportId] = useState<string | null>(null);
  const [analysisActiveRuleId, setAnalysisActiveRuleId] = useState<string | null>(null);
  const [assistDrawer, setAssistDrawer] = useState<AssistDrawerType | null>(null);
  const [showAllConclusions, setShowAllConclusions] = useState<boolean>(false);
  const openTrackingDrawer = (filter: TodoOverviewFilter) => {
    setTrackingDrawerFilter(filter);
    setAssistDrawer('progress');
  };

  const smartAnalysisData = useMemo(() => {
    if (isLocalDebt) {
      const createConclusions = (timeLabel: string) => ([
        {
          id: 'c-1',
          title: '高风险地区隐性债务核验滞后',
          summary: `说明债务线索穿透识别和核验链路仍有堵点，建议按地区建立专项核验台账（${timeLabel}）。`,
          dimension: '债务风险识别与纳管',
          regions: ['A市', 'B县', 'C区'],
          risk: '高风险',
          ruleIds: ['r-1'],
          report: {
            id: 'report-1',
            name: '地方政府债务风险识别分析报告',
            generatedAt: '2025-02-18 10:32',
            dimension: '债务风险识别与纳管',
            indicators: ['风险债务识别覆盖率', '隐性债务线索入库及时率', '债务台账穿透完整率'],
            scope: 'A市、B县、C区',
            overview: '本期分析发现高风险地区隐性债务线索核验滞后，部分平台公司材料补录不及时。',
            impact: '影响债务风险底数掌握和后续整改任务分派准确性。',
            trend: ['2024Q1 82', '2024Q2 83', '2024Q3 84', '2024Q4 85', '2025Q1 86', '2025Q2 84'],
            triggeredRules: ['隐性债务线索入库及时率偏低', '债务台账穿透完整率不足'],
            basis: ['《地方政府债务风险监督办法》', '《债务台账穿透管理细则》'],
            suggestions: '优先核验高风险地区平台公司债务线索，按周补齐台账穿透信息。',
          }
        },
        {
          id: 'c-2',
          title: '化债资金闭环复核不足',
          summary: `说明资金整改闭环和佐证链路不完整，建议补充复核材料和资金流向校验规则（${timeLabel}）。`,
          dimension: '债务资金整改与风险控制',
          regions: ['D区', 'E县'],
          risk: '中风险',
          ruleIds: ['r-2'],
          report: {
            id: 'report-2',
            name: '化债资金闭环复核分析报告',
            generatedAt: '2025-02-18 10:32',
            dimension: '债务资金整改与风险控制',
            indicators: ['问题金额整改到位率', '化债资金闭环率', '风险项目预警命中率'],
            scope: 'D区、E县',
            overview: '部分化债资金拨付后缺少闭环复核材料，资金用途核验存在延迟。',
            impact: '影响债务整改成效判断和资金风险压降评估。',
            trend: ['2024Q1 76', '2024Q2 77', '2024Q3 78', '2024Q4 79', '2025Q1 80', '2025Q2 79'],
            triggeredRules: ['问题金额整改到位率偏低', '化债资金闭环率不足'],
            basis: ['《地方政府化债资金管理要求》', '《债务整改闭环复核规范》'],
            suggestions: '补齐化债资金闭环佐证材料，对高风险项目增加复核节点。',
          }
        },
        {
          id: 'c-3',
          title: '违规举债压降率低于预期',
          summary: `说明重点地区债务压降推进偏慢，建议按风险等级分类督办（${timeLabel}）。`,
          dimension: '债务整改时效与进度管理',
          regions: ['F市', 'G区'],
          risk: '中风险',
          ruleIds: ['r-3'],
          report: {
            id: 'report-3',
            name: '违规举债整改进度分析报告',
            generatedAt: '2025-02-18 10:32',
            dimension: '债务整改时效与进度管理',
            indicators: ['超期整改占比', '整改进度更新及时率', '违规举债压降率'],
            scope: 'F市、G区',
            overview: '重点地区违规举债压降推进慢于计划，超期整改事项集中在资金平衡方案落实环节。',
            impact: '导致部分高风险事项长期挂账，影响年度债务风险压降目标达成。',
            trend: ['2024Q1 72', '2024Q2 73', '2024Q3 74', '2024Q4 75', '2025Q1 76', '2025Q2 74'],
            triggeredRules: ['违规举债压降率偏低', '超期整改占比过高'],
            basis: ['《地方政府债务整改督办规则》', '《违规举债问题整改工作指引》'],
            suggestions: '对超期地区开展分层督办，按月复盘压降进度和堵点。',
          }
        }
      ]);

      const ruleItems = [
        {
          id: 'r-1',
          name: '隐性债务线索入库及时率偏低',
          basis: '触发《地方政府债务风险监督办法》',
          status: '本期触发',
          definition: '当隐性债务线索在发现后5个工作日内未完成入库时触发。',
          threshold: '入库时长 > 5个工作日',
          source: '债务台账、线索核验记录',
          logic: '比对线索发现时间和入库完成时间，按地区计算延迟比例。',
          recent: '最近30天触发 4 次，集中在高风险地区。',
        },
        {
          id: 'r-2',
          name: '化债资金闭环率不足',
          basis: '触发《地方政府化债资金管理要求》',
          status: '高频触发',
          definition: '当化债资金闭环复核率低于85%时触发。',
          threshold: '闭环率 < 85%',
          source: '化债资金台账、复核附件',
          logic: '按项目校验资金流向、佐证材料和复核结论完整性。',
          recent: '最近30天触发 5 次，主要集中在区县项目。',
        },
        {
          id: 'r-3',
          name: '违规举债压降率偏低',
          basis: '触发《违规举债问题整改工作指引》',
          status: '新增触发',
          definition: '当违规举债压降率低于80%且连续两期未改善时触发。',
          threshold: '压降率 < 80%',
          source: '债务整改台账、督办进度日志',
          logic: '按整改事项聚合计算压降完成率和连续改进情况。',
          recent: '最近30天触发 3 次，较上期增加 1 次。',
        }
      ];

      return {
        '最近7天': { generatedAt: '2025-02-18 10:32', conclusions: createConclusions('最近7天'), rules: ruleItems },
        '最近30天': { generatedAt: '2025-02-18 10:32', conclusions: createConclusions('最近30天'), rules: ruleItems },
        '本月': { generatedAt: '2025-02-18 10:32', conclusions: createConclusions('本月'), rules: ruleItems },
        '本季度': { generatedAt: '2025-02-18 10:32', conclusions: createConclusions('本季度'), rules: ruleItems },
        '自定义': { generatedAt: '2025-02-18 10:32', conclusions: createConclusions(`${analysisCustomRange.start}~${analysisCustomRange.end}`), rules: ruleItems }
      };
    }

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
  }, [analysisCustomRange, isLocalDebt]);

  const currentSmartAnalysis = smartAnalysisData[analysisTimeRange];

  const assistContext = useMemo(() => {
    const returnedItems = returnedResponseTodos;
    const uploadedNotSubmittedItems = uploadedNotSubmittedTodos;
    const staleItems = responseTodos.filter((item) => item.responseAction === '待更新整改进度');
    const submitReadyItems = responseTodos.filter((item) => item.responseAction === '待提交/重新提交');
    const highRiskItems = activeTodoPool.filter((item) => item.level === '高');

    if (!overviewFilter) {
      return {
        label: '全部待办',
        description: '办理概览未选择特定筛选，展示当前全局处理建议与支撑能力。',
        leftItems: [
          {
            key: 'returned',
            title: '被退回事项',
            count: returnedItems.length,
            detail: '查看退回意见，补齐材料后重新提交。',
            actionBtn: { label: '去补正', type: 'action', drawer: 'return' as AssistDrawerType, filter: { kind: 'response', value: '退回待补正', label: '被退回' } as TodoOverviewFilter },
            viewBtn: { label: '查看退回原因', type: 'view', drawer: 'return' as AssistDrawerType },
            tone: 'rose',
          },
          {
            key: 'uploaded',
            title: '已上传未提交事项',
            count: uploadedNotSubmittedItems.length + submitReadyItems.length,
            detail: '材料已上传但流程未进入审核，需提交前自查。',
            actionBtn: { label: '去提交', type: 'action', drawer: 'selfCheck' as AssistDrawerType, filter: { kind: 'response', value: '已上传未提交', label: '已上传未提交' } as TodoOverviewFilter },
            viewBtn: { label: '开始自查', type: 'view', drawer: 'selfCheck' as AssistDrawerType },
            tone: 'amber',
          },
          {
            key: 'stale',
            title: '7天未更新事项',
            count: staleItems.length,
            detail: '补充最新整改进展，避免后续退回或督办。',
            actionBtn: { label: '去更新', type: 'action', drawer: 'flow' as AssistDrawerType, filter: { kind: 'blockage', value: 'stale', label: '7天未更新' } as TodoOverviewFilter },
            viewBtn: { label: '查看更新要求', type: 'view', drawer: 'flow' as AssistDrawerType },
            tone: 'blue',
          },
          {
            key: 'highRisk',
            title: '高风险事项',
            count: highRiskItems.length,
            detail: '来自风险等级字段，建议优先核实处理。',
            actionBtn: { label: '去处理', type: 'action', drawer: 'priority' as AssistDrawerType, filter: { kind: 'risk', value: '高', label: '高风险事项' } as TodoOverviewFilter },
            viewBtn: { label: '查看风险依据', type: 'view', drawer: 'priority' as AssistDrawerType },
            tone: 'slate',
          },
        ],
        rightCapabilities: [
          { key: 'return', title: '退回原因与补正建议', desc: '查看退回意见、补正要求和材料清单。' },
          { key: 'selfCheck', title: '提交前自查', desc: '材料完整性、附件对应关系等检查项。' },
          { key: 'history', title: '历史同类整改参考', desc: '同主题、同问题类型的已通过案例参考。' },
          { key: 'progress', title: '流程与反馈跟踪', desc: '已办事项的当前流转节点和反馈情况。' },
        ],
      };
    }

    const filterLabel = overviewFilter.label;
    const isReturned = overviewFilter.value === '退回待补正' || overviewFilter.value === '被退回';
    const isUploaded = overviewFilter.value === '已上传未提交' || overviewFilter.value === '待提交/重新提交';
    const isStale = overviewFilter.value === '7天未更新' || overviewFilter.value === 'stale';
    const isHighRisk = overviewFilter.value === '高风险事项' || overviewFilter.value === '高';
    const isTracking = overviewFilter.kind === 'tracking' || overviewFilter.kind === 'progress';
    const isMaterialIssue = overviewFilter.value === '材料不完整' || overviewFilter.value === '待补充说明/材料';

    if (isReturned) {
      return {
        label: filterLabel,
        description: '当前聚焦被退回事项，查看退回原因并根据建议完成补正后重新提交。',
        leftItems: [
          { key: 'step1', title: '先查看退回意见', count: 0, detail: '确认退回原因和审核意见，明确需要补正的内容。', actionBtn: null, viewBtn: { label: '查看退回原因', type: 'view' as const, drawer: 'return' as AssistDrawerType }, tone: 'rose' as const },
          { key: 'step2', title: '补齐缺失佐证材料', count: 0, detail: '根据退回要求补充资金凭证、核验材料或整改说明。', actionBtn: null, viewBtn: { label: '查看材料清单', type: 'view' as const, drawer: 'material' as AssistDrawerType }, tone: 'rose' as const },
          { key: 'step3', title: '核对整改说明与附件是否一致', count: 0, detail: '检查附件名称、金额、时间与整改说明是否对应。', actionBtn: null, viewBtn: null, tone: 'amber' as const },
          { key: 'step4', title: '补正后重新提交', count: 0, detail: '确认材料齐全后重新进入审核流程。', actionBtn: { label: '去补正', type: 'action' as const, drawer: 'return' as AssistDrawerType, filter: overviewFilter }, viewBtn: null, tone: 'amber' as const },
        ],
        rightDetail: {
          type: 'return',
          returnReasons: [
            { label: '佐证材料不完整', count: returnedItems.length },
            { label: '附件与说明不一致', count: returnedItems.length > 0 ? 1 : 0 },
          ],
          suggestions: ['补充资金支付凭证或核验材料', '更新整改说明中的金额和时间口径', '提交前检查附件名称与说明是否一致'],
        },
      };
    }

    if (isMaterialIssue) {
      return {
        label: filterLabel,
        description: '当前聚焦材料不完整事项，需核实缺项清单并补充对应材料。',
        leftItems: [
          { key: 'step1', title: '确认材料缺项', count: 0, detail: '查看系统标注的材料缺项清单，明确需补充的内容。', actionBtn: null, viewBtn: { label: '查看材料清单', type: 'view' as const, drawer: 'material' as AssistDrawerType }, tone: 'rose' as const },
          { key: 'step2', title: '完成提交前自查', count: 0, detail: '逐项核对整改说明、附件、关键数据和口径。', actionBtn: null, viewBtn: { label: '开始自查', type: 'view' as const, drawer: 'selfCheck' as AssistDrawerType }, tone: 'amber' as const },
          { key: 'step3', title: '参考同类材料示例', count: 0, detail: '查看已通过事项的材料格式、内容和结构。', actionBtn: null, viewBtn: { label: '查看材料示例', type: 'view' as const, drawer: 'material' as AssistDrawerType }, tone: 'blue' as const },
        ],
        rightDetail: {
          type: 'material',
          returnReasons: [
            { label: '佐证材料不完整', count: 1 },
            { label: '附件与说明不一致', count: 1 },
          ],
          suggestions: ['补充资金支付凭证', '完善整改过程说明', '上传整改前后对比材料'],
        },
      };
    }

    if (isStale) {
      return {
        label: filterLabel,
        description: '当前聚焦长时间未更新事项，需补充最新整改进展以避免后续退回或督办。',
        leftItems: [
          { key: 'step1', title: '查看更新要求', count: 0, detail: '了解当前需补充哪些进展信息，明确更新时间节点。', actionBtn: null, viewBtn: { label: '查看更新要求', type: 'view' as const, drawer: 'flow' as AssistDrawerType }, tone: 'amber' as const },
          { key: 'step2', title: '补充最新整改进展', count: 0, detail: '填写整改进度、当前状态、下一步计划等信息。', actionBtn: { label: '去更新', type: 'action' as const, drawer: 'flow' as AssistDrawerType, filter: overviewFilter }, viewBtn: null, tone: 'blue' as const },
          { key: 'step3', title: '了解流程影响', count: 0, detail: '长时间未更新可能导致督办或退回，需了解对整体流程的影响。', actionBtn: null, viewBtn: { label: '查看流程日志', type: 'view' as const, drawer: 'flow' as AssistDrawerType }, tone: 'slate' as const },
        ],
        rightDetail: {
          type: 'stale',
          returnReasons: [
            { label: '最近进展', count: staleItems.length },
            { label: '当前节点', count: 1 },
          ],
          suggestions: ['更新整改进展说明', '补充当前状态和下一步计划', '如有材料变更补充对应附件'],
        },
      };
    }

    if (isHighRisk) {
      return {
        label: filterLabel,
        description: '当前聚焦高风险事项，建议优先核实风险依据和关联规则。',
        leftItems: [
          { key: 'step1', title: '查看风险依据', count: 0, detail: '了解事项被标记为高风险的原因和关联的规则。', actionBtn: null, viewBtn: { label: '查看风险依据', type: 'view' as const, drawer: 'priority' as AssistDrawerType }, tone: 'rose' as const },
          { key: 'step2', title: '查看规则来源', count: 0, detail: '确认触发风险的规则定义和阈值条件。', actionBtn: null, viewBtn: { label: '查看规则来源', type: 'view' as const, drawer: 'basis' as AssistDrawerType }, tone: 'amber' as const },
          { key: 'step3', title: '参考同类风险处理方式', count: 0, detail: '查看同类风险的历史处理案例和整改方式。', actionBtn: null, viewBtn: { label: '查看同类参考', type: 'view' as const, drawer: 'history' as AssistDrawerType }, tone: 'blue' as const },
        ],
        rightDetail: {
          type: 'risk',
          returnReasons: [
            { label: '风险等级', count: highRiskItems.length },
            { label: '关联规则', count: 2 },
          ],
          suggestions: ['优先核实风险依据', '对照关联规则逐项自查', '参考历史同类风险处理方案'],
        },
      };
    }

    if (isTracking) {
      return {
        label: filterLabel,
        description: '当前聚焦已办流程跟踪，查看已处理事项的当前流转状态和反馈情况。',
        leftItems: [
          { key: 'step1', title: '查看当前流转节点', count: 0, detail: '确认已办事项当前所处的审核/复核/销号环节。', actionBtn: null, viewBtn: { label: '查看流程日志', type: 'view' as const, drawer: 'flow' as AssistDrawerType }, tone: 'blue' as const },
          { key: 'step2', title: '关注长时间未反馈事项', count: trackingDelayedCount, detail: '对于超过关注阈值未反馈的事项，主动跟进或催办。', actionBtn: null, viewBtn: { label: '查看详情', type: 'view' as const, drawer: 'progress' as AssistDrawerType }, tone: trackingDelayedCount > 0 ? 'rose' : 'slate' as const },
          { key: 'step3', title: '跟踪最近反馈', count: 0, detail: `最近反馈：${latestTrackingFeedback}，了解最新处理意见。`, actionBtn: null, viewBtn: { label: '查看反馈', type: 'view' as const, drawer: 'progress' as AssistDrawerType }, tone: 'amber' as const },
        ],
        rightDetail: {
          type: 'tracking',
          returnReasons: [
            { label: '最长等待', count: longestTrackingWaitDays },
            { label: '最近反馈', count: 0 },
          ],
          suggestions: ['查看流程日志了解审核进展', '关注未反馈事项主动跟进', '确认销号条件是否满足'],
        },
      };
    }

    return {
      label: filterLabel,
      description: `当前筛选：${filterLabel}，展示对应办理支撑信息。`,
      leftItems: [
        {
          key: 'general',
          title: filterLabel,
          count: 0,
          detail: `当前已选中"${filterLabel}"类型，可查看下方右侧处理支撑区获取更多帮助。`,
          actionBtn: null,
          viewBtn: null,
          tone: 'blue' as const,
        },
      ],
      rightCapabilities: [
        { key: 'return', title: '退回原因与补正建议', desc: '查看退回意见、补正要求和材料清单。' },
        { key: 'selfCheck', title: '提交前自查', desc: '材料完整性、附件对应关系等检查项。' },
        { key: 'history', title: '历史同类整改参考', desc: '同主题、同问题类型的已通过案例参考。' },
        { key: 'progress', title: '流程与反馈跟踪', desc: '已办事项的当前流转节点和反馈情况。' },
      ],
    };
  }, [
    overviewFilter,
    activeTodoPool,
    followedProgressCount,
    handledProgressTodos,
    latestTrackingFeedback,
    longestTrackingWaitDays,
    responseTodos,
    returnedResponseTodos,
    trackingDelayedCount,
    trackingTodos,
    uploadedNotSubmittedTodos,
  ]);

  const drawerData = useMemo(() => {
    const returnedItems = returnedResponseTodos;
    const uploadedNotSubmittedItems = uploadedNotSubmittedTodos;
    const staleItems = responseTodos.filter((item) => item.responseAction === '待更新整改进度');
    const submitReadyItems = responseTodos.filter((item) => item.responseAction === '待提交/重新提交');
    const highImpactItems = activeTodoPool.filter((item) => item.level === '高');
    const firstReturned = returnedItems[0];
    const firstUploaded = uploadedNotSubmittedItems[0];
    const selfCheckItem = firstUploaded || submitReadyItems[0];

    const priorityParts = [
      returnedItems.length > 0 ? '被退回事项' : '',
      uploadedNotSubmittedItems.length > 0 ? '已上传未提交事项' : '',
      staleItems.length > 0 ? '7天未更新事项' : '',
      highImpactItems.length > 0 ? '高风险事项' : '',
    ].filter(Boolean);
    const prioritySummary = priorityParts.length > 0
      ? `当前优先处理：${priorityParts.slice(0, 3).join('、')}。建议先补正退回事项，再完成已上传未提交事项的提交前自查。`
      : '当前未发现明显阻塞事项，可按右侧待办明细顺序处理，并在提交前完成材料自查。';

    return {
      prioritySummary,
      priorityBasis: [
        { group: '阻塞类', label: '被退回', count: returnedItems.length, reason: returnedItems.length > 0 ? '退回说明或佐证材料不完整，阻断后续审核。' : '当前无退回阻塞。', source: '审核退回状态、退回说明', filter: { kind: 'response', value: '退回待补正', label: '被退回' } as TodoOverviewFilter },
        { group: '时限类', label: '已超期', count: overdueTodos.length, reason: overdueTodos.length > 0 ? `存在 ${overdueTodos.length} 项超期事项，需先处理。` : '当前无超期事项。', source: '截止日期、事项流转状态', filter: { kind: 'deadline', value: 'overdue', label: '已超期' } as TodoOverviewFilter },
        { group: '阻塞类', label: '已上传未提交', count: uploadedNotSubmittedItems.length, reason: uploadedNotSubmittedItems.length > 0 ? '材料或报送内容已准备，但尚未进入审核流程。' : '当前无已上传未提交事项。', source: '附件上传记录、流程未提交状态', filter: { kind: 'response', value: '已上传未提交', label: '已上传未提交' } as TodoOverviewFilter },
        { group: '风险类', label: '高风险事项', count: highImpactItems.length, reason: highImpactItems.length > 0 ? '来自事项风险等级字段，建议优先核实。' : '当前无高风险事项。', source: '规则等级、风险等级、涉及金额、重复命中', filter: { kind: 'risk', value: '高', label: '高风险事项' } as TodoOverviewFilter },
        { group: '阻塞类', label: '7天未更新', count: staleItems.length, reason: staleItems.length > 0 ? '整改进展超过关注阈值未更新，需要补充最新进展。' : '当前无7天未更新事项。', source: '整改进展更新时间、台账字段', filter: { kind: 'blockage', value: 'stale', label: '7天未更新' } as TodoOverviewFilter },
      ],
      returnAdvice: {
        itemName: firstReturned?.t || '暂无被退回事项',
        reason: returnedItems.length > 0 ? '佐证材料不完整，整改说明与附件说明不一致。' : '当前无退回原因记录。',
        suggestions: ['补充资金支付凭证或核验材料', '更新整改说明中的金额和时间口径', '上传整改前后对比材料', '提交前检查附件名称与说明是否一致'],
        categories: [
          { label: '佐证材料不完整', count: returnedItems.length || 0, action: '补充凭证类材料' },
          { label: '整改说明不充分', count: returnedItems.length > 1 ? 1 : 0, action: '补充整改过程和结果说明' },
          { label: '附件与说明不一致', count: returnedItems.length > 0 ? 1 : 0, action: '统一附件名称和说明口径' },
        ],
      },
      selfCheck: {
        itemName: selfCheckItem?.t || '暂无待提交事项',
        status: selfCheckItem?.status || '暂无待提交',
        count: uploadedNotSubmittedItems.length + submitReadyItems.length,
        attentionCount: Math.max(0, Math.min(3, uploadedNotSubmittedItems.length + submitReadyItems.length + returnedItems.length)),
        concerns: ['整改说明是否填写完整', '上传附件是否与整改说明逐项对应', '金额、时间、责任单位是否一致', '是否需要补充整改前后对比材料'],
      },
      historyReference: {
        materials: ['支付凭证', '整改报告', '会议纪要', '整改前后对比材料', '责任单位说明'],
        matchBasis: ['同主题', '同问题类型', '同退回原因', '同材料要求'],
        methods: ['补充资金拨付或核验凭证', '完善整改过程和结果说明', '上传整改前后对比材料', '说明后续防范措施'],
      },
      trackingAssist: {
        flowLogs: [
          { node: '我提交', role: '被监督单位经办', time: '03-22', opinion: '提交整改材料', stay: '当天', current: false },
          { node: '审核中', role: '业务审核岗', time: '03-23', opinion: '核对材料完整性', stay: '1天', current: false },
          { node: '复核中', role: '复核岗', time: '03-25', opinion: '等待复核意见', stay: `${Math.max(1, longestTrackingWaitDays)}天`, current: handledProgressTodos.length > 0 },
          { node: '待销号', role: '销号确认岗', time: '待处理', opinion: '等待闭环确认', stay: '待确认', current: false },
        ],
      },
    };
  }, [
    activeTodoPool,
    handledProgressTodos,
    longestTrackingWaitDays,
    overdueTodos,
    responseTodos,
    returnedResponseTodos,
    uploadedNotSubmittedTodos,
  ]);
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
    <div className="flex items-center gap-2.5 text-xs mt-3 mb-1">
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
        评价体系总览
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
            一级指标分析
          </span>
        </>
      )}
      {currentLevel === 3 && selectedL2 && (
        <>
          <span className="text-slate-300">/</span>
          <span className="text-[#0F3D8A] text-[17px] font-bold">二级指标分析</span>
        </>
      )}
      <div className="ml-auto flex items-center gap-3">
        {isLocalDebt && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/40 rounded-lg text-[11px]">
            <span className="text-slate-400">统计口径：</span>
            <span className="font-semibold text-slate-700">{evaluationView === 'trend' ? `${evaluationGranularity}范围` : evaluationGranularity}</span>
            <div className="w-px h-4 bg-slate-200"></div>
            {evaluationView === 'trend' ? (
              <>
                <select
                  className="h-6 min-w-[92px] bg-transparent text-[11px] font-medium text-slate-600 outline-none"
                  value={selectedTrendStart}
                  onChange={(event) => {
                    const newStart = event.target.value;
                    setSelectedTrendStart(newStart);
                    const startIdx = trendBoundaryOptions.indexOf(newStart);
                    const endIdx = trendBoundaryOptions.indexOf(selectedTrendEnd);
                    if (startIdx > endIdx) {
                      setSelectedTrendEnd(newStart);
                    }
                  }}
                >
                  {trendBoundaryOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <span className="text-slate-300">-</span>
                <select
                  className="h-6 min-w-[92px] bg-transparent text-[11px] font-medium text-slate-600 outline-none"
                  value={selectedTrendEnd}
                  onChange={(event) => {
                    const newEnd = event.target.value;
                    const startIdx = trendBoundaryOptions.indexOf(selectedTrendStart);
                    const endIdx = trendBoundaryOptions.indexOf(newEnd);
                    if (endIdx >= startIdx) {
                      setSelectedTrendEnd(newEnd);
                    }
                  }}
                >
                  {trendBoundaryOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </>
            ) : (
              <select
                className="h-6 min-w-[92px] bg-transparent text-[11px] font-medium text-slate-600 outline-none"
                value={selectedEvaluationPeriod}
                onChange={(event) => setSelectedEvaluationPeriod(event.target.value)}
              >
                {evaluationPeriodOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            )}
          </div>
        )}
        {isLocalDebt && (
          <button
            type="button"
            className={`h-8 px-3 rounded-lg text-[11px] font-semibold transition-colors ${
              evaluationView === 'trend'
                ? 'bg-[#4E73C8] text-white'
                : 'bg-blue-50/40 text-[#4E73C8] hover:bg-blue-100/70'
            }`}
            onClick={() => setEvaluationView((view) => (view === 'trend' ? 'score' : 'trend'))}
          >
            {evaluationView === 'trend' ? '返回评分' : '查看趋势'}
          </button>
        )}
        {isLocalDebt && (
          <button
            type="button"
            title="跳转到实施配置三级功能页"
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50/40 text-[#4E73C8] hover:bg-blue-100/70 transition-colors"
            onClick={() => onNavigate(evaluationConfigHref)}
          >
            <SettingOutlined className="text-[14px]" />
          </button>
        )}
        {currentLevel > 2 && !isLocalDebt && (
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
    if (currentLevel === 3 || (isLocalDebt && evaluationView === 'trend')) {
      chartInstanceRef.current = null;
      return;
    }

    if (!radarChartRef.current) return;
    if (chartInstanceRef.current && chartInstanceRef.current.getDom() !== radarChartRef.current) {
      chartInstanceRef.current = null;
    }
    if (chartInstanceRef.current) return;

    chartInstanceRef.current = echarts.getInstanceByDom(radarChartRef.current) || echarts.init(radarChartRef.current);

    const handleResize = () => chartInstanceRef.current?.resize();
    window.addEventListener('resize', handleResize);
    requestAnimationFrame(() => chartInstanceRef.current?.resize());
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstanceRef.current = null;
    };
  }, [currentLevel, evaluationView, isLocalDebt]);

  useEffect(() => {
    if (!chartInstanceRef.current) return;
    const clickHandler = (params: any) => {
      if (currentLevel === 3) return;
      const radarData = currentLevel === 1 ? currentAnalysisData : selectedL1?.indicators || [];
      const name = params?.name || '';
      const axisName = params?.axisValue || '';
      const targetName = name || axisName;
      const maybeDimIndex = params?.dimensionIndex;

      if (targetName) {
        if (currentLevel === 1) {
          const dim = currentAnalysisData.find(d => d.name === targetName);
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
  }, [currentLevel, selectedL1, currentAnalysisData]);

  useEffect(() => {
    if (isLocalDebt && evaluationView === 'trend') {
      chartInstanceRef.current = null;
      return;
    }
    if (!chartInstanceRef.current && radarChartRef.current && currentLevel !== 3) {
      chartInstanceRef.current = echarts.getInstanceByDom(radarChartRef.current) || echarts.init(radarChartRef.current);
    }
    if (!chartInstanceRef.current) return;

    let option: any = {};

    if (currentLevel === 1 || currentLevel === 2) {
      const data = currentLevel === 1 ? currentAnalysisData : selectedL1?.indicators || [];

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
    }

    chartInstanceRef.current.setOption(option, true);
    requestAnimationFrame(() => chartInstanceRef.current?.resize());
  }, [currentLevel, selectedL1, selectedL2, isLocalDebt, evaluationView, currentAnalysisData]);

  const radarOverlayItems = useMemo(() => {
    const items = currentLevel === 1 ? currentAnalysisData : currentLevel === 2 ? selectedL1?.indicators || [] : [];
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
  }, [currentLevel, selectedL1, currentAnalysisData]);

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
    const weights = isLocalDebt ? [0.18, 0.22, 0.22, 0.18, 0.1, 0.1] : [0.25, 0.2, 0.15, 0.2, 0.1, 0.1];
    const weighted = currentAnalysisData.reduce((acc, dim, idx) => acc + dim.score * (weights[idx] ?? 0), 0);
    return Math.round(weighted);
  }, [currentAnalysisData, isLocalDebt]);

  const lowestDimension = useMemo(() => {
    if (currentAnalysisData.length === 0) return null;
    return [...currentAnalysisData].sort((a, b) => a.score - b.score)[0];
  }, [currentAnalysisData]);

  const focusDimensions = useMemo(() => {
    const candidates = [...currentAnalysisData]
      .filter(item => item.status !== '良好')
      .sort((a, b) => a.score - b.score);
    const target = candidates.length > 0 ? candidates : [...currentAnalysisData].sort((a, b) => a.score - b.score);
    return target.slice(0, 2).map(item => item.name).join('、');
  }, [currentAnalysisData]);

  const highestDimension = useMemo(() => {
    if (currentAnalysisData.length === 0) return null;
    return [...currentAnalysisData].sort((a, b) => b.score - a.score)[0];
  }, [currentAnalysisData]);

  const weakestL2Indicator = useMemo(() => {
    if (!selectedL1?.indicators?.length) return null;
    return [...selectedL1.indicators].sort((a, b) => a.score - b.score)[0];
  }, [selectedL1]);

  const strongestL2Indicator = useMemo(() => {
    if (!selectedL1?.indicators?.length) return null;
    return [...selectedL1.indicators].sort((a, b) => b.score - a.score)[0];
  }, [selectedL1]);

  const focusL2Indicators = useMemo(() => {
    if (!selectedL1?.indicators?.length) return '';
    const candidates = [...selectedL1.indicators]
      .filter(item => item.result !== '良好')
      .sort((a, b) => a.score - b.score);
    const target = candidates.length > 0 ? candidates : [...selectedL1.indicators].sort((a, b) => a.score - b.score);
    return target.slice(0, 2).map(item => item.name).join('、');
  }, [selectedL1]);

  const selectedL1AnalysisSummary = useMemo(() => {
    if (!selectedL1) return '';
    const weakText = weakestL2Indicator ? `当前短板集中在“${weakestL2Indicator.name}”` : '当前短板指标待识别';
    const strongText = strongestL2Indicator ? `表现较好的指标为“${strongestL2Indicator.name}”` : '优势指标待识别';
    return `${selectedL1.name}当前得分${selectedL1.score}分，${weakText}，${strongText}。`;
  }, [selectedL1, weakestL2Indicator, strongestL2Indicator]);

  const evaluationGranularity = (isLocalDebt ? '月度' : '季度') as '月度' | '季度' | '年度';
  const evaluationPeriodOptions = useMemo(() => (
    isLocalDebt
      ? ['2026年4月', '2026年3月', '2026年2月', '2026年1月', '2025年12月', '2025年11月']
      : ['2026年一季度', '2025年四季度', '2025年三季度']
  ), [isLocalDebt]);
  const trendBoundaryOptions = useMemo(() => (
    isLocalDebt
      ? ['2025年8月', '2025年9月', '2025年10月', '2025年11月', '2025年12月', '2026年1月', '2026年2月', '2026年3月', '2026年4月']
      : ['2024Q4', '2025Q1', '2025Q2', '2025Q3', '2025Q4', '2026Q1']
  ), [isLocalDebt]);
  const selectedTrendRangeLabel = `${selectedTrendStart} - ${selectedTrendEnd}`;
  const trendPeriodLabels = useMemo(() => {
    if (evaluationGranularity === '季度') return ['2024Q1', '2024Q2', '2024Q3', '2024Q4', '2025Q1', '2025Q2'];
    if (evaluationGranularity === '年度') return ['2020', '2021', '2022', '2023', '2024', '2025'];
    const startMatch = selectedTrendStart.match(/(\d{4})年(\d{1,2})月/);
    const startYear = startMatch ? Number(startMatch[1]) : 2025;
    const startMonth = startMatch ? Number(startMatch[2]) : 11;
    const startIdx = trendBoundaryOptions.indexOf(selectedTrendStart);
    const endIdx = trendBoundaryOptions.indexOf(selectedTrendEnd);
    const count = endIdx - startIdx + 1;
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(startYear, startMonth - 1 + index, 1);
      return `${date.getFullYear()}年${date.getMonth() + 1}月`;
    });
  }, [evaluationGranularity, selectedTrendStart, selectedTrendEnd, trendBoundaryOptions]);

  const calcDimensionTrend = (dimension: Level1_Dimension) => {
    if (!dimension.indicators.length) return [dimension.score];
    const length = dimension.indicators[0]?.detail?.trend?.length || 6;
    const sums = Array.from({ length }, () => 0);
    dimension.indicators.forEach((indicator) => {
      for (let i = 0; i < length; i += 1) {
        sums[i] += indicator.detail.trend[i] || 0;
      }
    });
    return sums.map((sum) => Math.round(sum / dimension.indicators.length));
  };

  const calcTrendDelta = (trend: number[]) => {
    if (trend.length < 2) return 0;
    return trend[trend.length - 1] - trend[trend.length - 2];
  };

  const activeTrendSeries = useMemo(() => {
    if (currentLevel === 3 && selectedL2) return selectedL2.detail.trend;
    if (currentLevel === 2 && selectedL1) return calcDimensionTrend(selectedL1);
    const dimensionTrends = currentAnalysisData.map(calcDimensionTrend);
    const length = dimensionTrends[0]?.length || 6;
    return Array.from({ length }, (_, index) => {
      const sum = dimensionTrends.reduce((acc, trend) => acc + (trend[index] || 0), 0);
      return Math.round(sum / Math.max(dimensionTrends.length, 1));
    });
  }, [currentLevel, selectedL1, selectedL2, currentAnalysisData]);

  const activeTrendDelta = calcTrendDelta(activeTrendSeries);
  const activeTrendStats = useMemo(() => {
    const values = activeTrendSeries.length ? activeTrendSeries : [0];
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
    return {
      avg: Math.round(values.reduce((acc, item) => acc + item, 0) / values.length),
      max: Math.max(...values),
      min: Math.min(...values),
      median,
      volatility: Math.abs(activeTrendDelta) <= 3 ? '稳定' : activeTrendDelta > 0 ? '改善' : '下滑',
    };
  }, [activeTrendDelta, activeTrendSeries]);

  const selectedL2PolicyItems = useMemo(() => {
    if (!selectedL2) return [];
    const fallbackPolicyName = selectedL2.name.includes('专项债')
      ? '《地方政府专项债券项目资金管理与使用监督指引（试行）》'
      : '《地方政府债务风险监测与整改工作指引（试行）》';
    const fallbackPolicyCode = selectedL2.name.includes('专项债') ? '财监债〔2025〕12号' : '财监债〔2025〕7号';
    const fallbackPolicyLink = selectedL2.name.includes('专项债')
      ? 'https://example.gov.cn/policy/special-bond-supervision-2025'
      : 'https://example.gov.cn/policy/local-debt-risk-guideline-2025';
    return [
      { label: '发文层级', value: selectedL2.detail.policyLevel || '待补充' },
      { label: '政策名称', value: selectedL2.detail.policyName || fallbackPolicyName },
      { label: '政策文号', value: selectedL2.detail.policyCode || fallbackPolicyCode },
      { label: '政策链接', value: selectedL2.detail.policyLink || fallbackPolicyLink },
      { label: '政策条例', value: selectedL2.detail.policyClause || '第十二条：建立专项债项目资金全流程监测及偏差整改机制。' },
      { label: '选取原因', value: selectedL2.detail.pickReason || `该指标直接对应${selectedL2.name}的过程约束和结果校验口径，适合作为三级分析依据。` },
    ];
  }, [selectedL2]);

  const selectedL2RuleConclusion = useMemo(() => {
    if (!selectedL2) return [];
    const items: string[] = [];
    if (selectedL2.score >= 85) {
      items.push('该指标已达到规则定义的良好区间。');
    } else if (selectedL2.score >= 60) {
      items.push('该指标处于规则中间区间，需持续关注后续波动。');
    } else {
      items.push('该指标未达到目标区间，应优先核查规则涉及环节。');
    }
    if (selectedL2.detail.weightValue) {
      items.push(`该指标权重为${selectedL2.detail.weightValue}，对上级评价结果具有直接影响。`);
    }
    items.push('具体评分口径以下方规则定义为准，政策来源以下方政策依据为准。');
    return items;
  }, [selectedL2]);

  const scoreTitle = useMemo(() => {
    const weights = currentAnalysisData.map((dimension, index) => ({
      name: dimension.name,
      w: isLocalDebt ? [0.18, 0.22, 0.22, 0.18, 0.1, 0.1][index] ?? 0.1 : [0.25, 0.2, 0.15, 0.2, 0.1, 0.1][index] ?? 0.1,
    }));

        const overallFormula = `${isLocalDebt ? '综合得分' : '综合得分'}：${overallScore}分\n计算方式：${isLocalDebt ? '根据一级指标得分及权重加权计算生成' : '一级维度得分加权平均'}\n计算公式：综合得分 = ${weights
      .map(({ name, w }) => {
        const score = currentAnalysisData.find((d) => d.name === name)?.score ?? 0;
        return `${w.toFixed(2)}×${score}`;
      })
      .join(' + ')} = ${overallScore}分\n含义说明：用于反映评价体系整体运行质量，分值越高表示整体运行越好。`;

    const dimensionTitle = (dimension: Level1_Dimension) => {
      const indicatorText = dimension.indicators
        .map((i) => `${i.name} ${i.score}分${i.weightValue ? ` / 权重${i.weightValue}` : ''}`)
        .slice(0, 6)
        .join('、');
      return `${dimension.name}：${dimension.score}分${dimension.weightValue ? `\n指标权重：${dimension.weightValue}` : ''}\n计算方式：由若干二级指标得分加权形成\n构成指标：${indicatorText}\n含义说明：${dimension.description}`;
    };

    const indicatorTitle = (indicator: Level2_Indicator) => {
      const cv = indicator.detail.currentValue;
      const sv = indicator.detail.standardValue;
      return isLocalDebt
        ? `${indicator.name}：${indicator.score}分\n评分标准：${indicator.detail.scoreFormula || '待补充'}\n指标权重：${indicator.detail.weightValue || '待补充'}\n设权原因：${indicator.detail.weightReason || '待补充'}\n指标定义：${indicator.detail.definition}`
        : `${indicator.name}：${indicator.score}分\n指标定义：${indicator.detail.definition}\n本期值：${cv}\n标准值：${sv}\n评分方式：指标得分 = 0.7×本期值折算分 + 0.3×趋势稳定性得分\n当前状态：${indicator.result}`;
    };

    return { overallFormula, dimensionTitle, indicatorTitle };
  }, [currentAnalysisData, isLocalDebt, overallScore]);

  const weakestIndicator = useMemo(() => {
    if (!selectedL1 || selectedL1.indicators.length === 0) return null;
    return [...selectedL1.indicators].sort((a, b) => a.score - b.score)[0];
  }, [selectedL1]);

  const renderTrendLine = (trend: number[], height = 120, labels: string[] = []) => {
    const values = trend.length ? trend : [0];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);
    const width = 700;
    const paddingX = 50;
    const paddingTop = 25;
    const paddingBottom = 45;
    const chartBottom = height - paddingBottom;
    const plotHeight = Math.max(chartBottom - paddingTop, 1);
    const step = values.length > 1 ? (width - paddingX * 2) / (values.length - 1) : 0;
    const points = values.map((value, index) => {
      const x = paddingX + index * step;
      const y = chartBottom - ((value - min) / range) * plotHeight;
      return [x, y] as const;
    });
    const pointPath = points.map(([x, y]) => `${x},${y}`).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="localDebtTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4E73C8" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#4E73C8" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => (
          <line
            key={line}
            x1={paddingX}
            x2={width - paddingX}
            y1={paddingTop + line * (plotHeight / 3)}
            y2={paddingTop + line * (plotHeight / 3)}
            stroke="#E8EEF8"
            strokeWidth="1"
          />
        ))}
        <polyline
          fill="none"
          stroke="#4E73C8"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointPath}
        />
        {points.map(([x, y], index) => (
          <g key={`${index}-${values[index]}`}>
            <circle cx={x} cy={y} r="4" fill="#FFFFFF" stroke="#4E73C8" strokeWidth="2" />
            <line x1={x} x2={x} y1={chartBottom + 7} y2={chartBottom + 11} stroke="#D7E1F2" strokeWidth="1" />
            <text
              x={x}
              y={height - 8}
              textAnchor="middle"
              fontSize="9"
              fill="#8CA0BD"
            >
              {labels[index] || ''}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  const trendScopeTitle = currentLevel === 1
    ? '评价体系总览趋势'
    : currentLevel === 2
    ? `${selectedL1?.name || '一级指标'}趋势`
    : `${selectedL2?.name || '二级指标'}趋势`;

  const trendNavigatorItems = currentLevel === 1
    ? currentAnalysisData.map((dimension) => ({
      id: dimension.id,
      name: dimension.name,
      score: dimension.score,
      status: dimension.status,
      trend: calcDimensionTrend(dimension),
      weight: dimension.weightValue,
      onClick: () => {
        setSelectedL1(dimension);
        setSelectedL2(null);
        setCurrentLevel(2);
      },
    }))
    : (selectedL1?.indicators || []).map((indicator) => ({
      id: indicator.id,
      name: indicator.name,
      score: indicator.score,
      status: indicator.result,
      trend: indicator.detail.trend,
      weight: indicator.detail.weightValue || indicator.weightValue,
      onClick: () => {
        setSelectedL2(indicator);
        setCurrentLevel(3);
      },
    }));

  const renderLocalDebtTrendNavigator = () => (
    <div key="local-debt-trend-navigator" className="col-span-5 rounded-[22px] bg-white px-4 pt-3 pb-4 flex flex-col min-h-0 overflow-hidden">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400">{trendScopeTitle}</div>
            <div className="text-sm font-semibold text-slate-700">本期得分</div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-2xl font-bold text-[#4E73C8]">{activeTrendSeries[activeTrendSeries.length - 1] || 0}分</div>
            </div>
            <div className={`rounded-lg px-3 py-2 text-right ${activeTrendDelta >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              <div className="text-[10px] opacity-80">较上期</div>
              <div className="text-lg font-bold">{activeTrendDelta >= 0 ? '+' : ''}{activeTrendDelta}分</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
          <div className="text-[14px] font-bold text-slate-700">{currentLevel === 3 ? '指标切换' : '指标下钻'}</div>
        </div>
        <div className="space-y-2">
          {trendNavigatorItems.map((item) => {
            const active = currentLevel >= 2 && item.id === selectedL2?.id;
            const delta = calcTrendDelta(item.trend);
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-all ${active ? 'bg-blue-50/50' : 'bg-[#FAFBFC] hover:bg-blue-50/30'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-800">{item.name}</div>
                    <div className="mt-1 text-[10px] text-slate-500 truncate">{item.weight ? `权重 ${item.weight}` : `${evaluationGranularity}趋势`}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] font-bold text-[#4E73C8]">{item.score}分</div>
                    <div className={`mt-1 text-[10px] ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {delta >= 0 ? '+' : ''}{delta}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderLocalDebtTrendDetail = () => (
    <div className="col-span-7 rounded-[22px] bg-white px-5 py-4 flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
        <div className="text-[15px] font-bold text-slate-700">趋势分析</div>
      </div>

      <div className="px-4 py-3 flex-1 min-h-[200px]">
        {renderTrendLine(activeTrendSeries, 250, trendPeriodLabels)}
      </div>

      <div className="mt-3 grid grid-cols-5 gap-3">
        {[
          { label: '均值', value: `${activeTrendStats.avg}分`, cls: 'text-slate-800' },
          { label: '最高', value: `${activeTrendStats.max}分`, cls: 'text-slate-800' },
          { label: '最低', value: `${activeTrendStats.min}分`, cls: 'text-slate-800' },
          { label: '中位数', value: `${activeTrendStats.median}分`, cls: 'text-slate-800' },
          { label: '波动判断', value: activeTrendStats.volatility, cls: activeTrendStats.volatility === '稳定' ? 'text-green-600' : activeTrendStats.volatility === '改善' ? 'text-[#4E73C8]' : 'text-red-600' },
        ].map((item) => (
          <div key={item.label} className="rounded-lg px-4 py-3 bg-[#FAFBFC]">
            <div className="text-[10px] text-slate-400">{item.label}</div>
            <div className={`mt-1 text-lg font-bold ${item.cls}`}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
          <div className="text-[15px] font-bold text-slate-700">智能分析</div>
        </div>
        <div className="max-h-[100px] overflow-y-auto pr-2 space-y-2 text-xs leading-relaxed text-slate-600">
          <div>当前{evaluationGranularity}范围“{selectedTrendRangeLabel}”内，{trendScopeTitle}均值为 {activeTrendStats.avg} 分，波动判断为“{activeTrendStats.volatility}”。</div>
          <div>{activeTrendDelta >= 0 ? `较上期提升 ${activeTrendDelta} 分，优先关注能否持续稳定。` : `较上期下降 ${Math.abs(activeTrendDelta)} 分，建议核查规则命中和指标执行过程。`}</div>
        </div>
      </div>
    </div>
  );

  const renderItemOverview = () => {
    const submitActionItems = responseTodos.filter((item) => item.responseAction === '待提交/重新提交');
    const uploadedNotSubmittedItems = uploadedNotSubmittedTodos;
    const returnedItems = returnedResponseTodos;
    const formalSubmitCount = Math.max(0, submitActionItems.length - uploadedNotSubmittedItems.length);
    const directTodoItems = responseTodos.filter((item) => item.disposalPool === 'action' && !isTodoUploadedNotSubmitted(item));
    const materialIncompleteItems = activeTodoPool.filter((item) => /材料|附件|补录|佐证|凭证|补充/.test(`${item.t}${item.flowNode}${item.module}${item.status}${item.category}`));
    const staleItems = responseTodos.filter((item) => item.disposalPool === 'action' && item.responseAction === '待更新整改进度');
    const multiReturnedItems = returnedItems.filter((item) => (item.returnCount || 0) > 1);
    const highRiskItems = activeTodoPool.filter((item) => item.level === '高');
    const amountRiskItems = activeTodoPool.filter((item) => /资金|债务|专项债|化债|金额|拨付|支付/.test(`${item.t}${item.flowNode}${item.module}${item.status}${item.category}`));
    const repeatRiskItems = activeTodoPool.filter((item) => (item.returnCount || 0) > 0 || /重复|抽查|核验|台账/.test(`${item.t}${item.flowNode}${item.module}${item.status}${item.category}`));
    const doubtRiskItems = activeTodoPool.filter((item) => /线索|核验|抽查|疑点/.test(`${item.t}${item.flowNode}${item.module}${item.status}${item.category}`));
    const dueTodayAndSoonCount = todayDueTodos.length + within3Todos.length;

    const tileTone = {
      blue: 'text-[#0F3D8A] bg-blue-50/70',
      amber: 'text-amber-600 bg-amber-50/70',
      orange: 'text-orange-600 bg-orange-50/70',
      rose: 'text-rose-600 bg-rose-50/80',
      red: 'text-red-600 bg-red-50/70',
      slate: 'text-slate-600 bg-slate-100/80',
      indigo: 'text-indigo-600 bg-indigo-50/70',
    };

    const todoTypeCards = [
      {
        key: 'material',
        label: '待补充说明/材料',
        count: responseActionItems.find((item) => item.action === '待补充说明/材料')?.count || 0,
        hint: '需补齐说明或附件',
        filter: { kind: 'response', value: '待补充说明/材料', label: '待补充说明/材料' } as TodoOverviewFilter,
        cls: tileTone.slate,
      },
      {
        key: 'progress',
        label: '待更新整改进度',
        count: responseActionItems.find((item) => item.action === '待更新整改进度')?.count || 0,
        hint: '补充最新进展',
        filter: { kind: 'response', value: '待更新整改进度', label: '待更新整改进度' } as TodoOverviewFilter,
        cls: tileTone.amber,
      },
      {
        key: 'submit',
        label: '待提交/重新提交',
        count: formalSubmitCount,
        hint: '需完成正式提交',
        filter: { kind: 'response', value: '待提交/重新提交', label: '待提交/重新提交' } as TodoOverviewFilter,
        cls: 'text-purple-600 bg-purple-50/70',
      },
      {
        key: 'first',
        label: '已临期',
        count: within3To5Todos.length,
        hint: '3-5天到期',
        filter: { kind: 'deadline', value: 'within3to5', label: '已临期' } as TodoOverviewFilter,
        cls: tileTone.blue,
      },
      {
        key: 'overdue',
        label: '已超期',
        count: overdueTodos.length,
        hint: longestOverdueDays ? `最长逾期${longestOverdueDays}天` : '暂无超期',
        filter: { kind: 'deadline', value: 'overdue', label: '已超期' } as TodoOverviewFilter,
        cls: tileTone.red,
      },
      {
        key: 'due',
        label: '今日/临期到期',
        count: dueTodayAndSoonCount,
        hint: todayDueTodos.length > 0 ? `${todayDueTodos.length}项今日到期` : '1-3日内到期',
        filter: { kind: 'deadline', value: todayDueTodos.length > 0 ? 'today' : 'within3', label: '今日/临期到期' } as TodoOverviewFilter,
        cls: tileTone.orange,
      },
    ];

    const blockageCards = [
      {
        key: 'returned',
        label: '被退回',
        count: returnedItems.length,
        hint: '退回说明待补正',
        filter: { kind: 'response', value: '退回待补正', label: '被退回' } as TodoOverviewFilter,
        cls: tileTone.rose,
      },
      {
        key: 'materialIncomplete',
        label: '材料不完整',
        count: materialIncompleteItems.length,
        hint: '附件或佐证需补齐',
        filter: { kind: 'blockage', value: 'materialIncomplete', label: '材料不完整' } as TodoOverviewFilter,
        cls: tileTone.slate,
      },
      {
        key: 'multiReturned',
        label: '多次退回',
        count: multiReturnedItems.length,
        hint: '需核对退回原因',
        filter: { kind: 'blockage', value: 'multiReturned', label: '多次退回' } as TodoOverviewFilter,
        cls: tileTone.red,
      },
      {
        key: 'uploaded',
        label: '已上传未提交',
        count: uploadedNotSubmittedItems.length,
        hint: '流程尚未启动',
        filter: { kind: 'response', value: '已上传未提交', label: '已上传未提交' } as TodoOverviewFilter,
        cls: tileTone.orange,
      },
      {
        key: 'stale',
        label: '7天未更新',
        count: staleItems.length,
        hint: '整改进展未更新',
        filter: { kind: 'blockage', value: 'stale', label: '7天未更新' } as TodoOverviewFilter,
        cls: tileTone.amber,
      },
    ];

    const riskCards = [
      {
        key: 'high',
        label: '高风险事项',
        count: highRiskItems.length,
        hint: '预警级别高',
        filter: { kind: 'risk', value: '高', label: '高风险事项' } as TodoOverviewFilter,
        cls: tileTone.red,
      },
      {
        key: 'amount',
        label: '涉及金额较大',
        count: amountRiskItems.length,
        hint: '达到主题阈值',
        filter: { kind: 'risk', value: 'amount', label: '涉及金额较大' } as TodoOverviewFilter,
        cls: tileTone.orange,
      },
      {
        key: 'repeat',
        label: '重复命中事项',
        count: repeatRiskItems.length,
        hint: '2次及以上命中',
        filter: { kind: 'risk', value: 'repeat', label: '重复命中事项' } as TodoOverviewFilter,
        cls: tileTone.amber,
      },
      {
        key: 'doubt',
        label: '待核实疑点',
        count: doubtRiskItems.length,
        hint: '线索核验未认定',
        filter: { kind: 'risk', value: 'doubt', label: '待核实疑点' } as TodoOverviewFilter,
        cls: tileTone.blue,
      },
    ];

    const followProgressItems = trackingTodos.slice(0, followedProgressCount);
    const progressStageCards = [
      ...trackingStageItems.map((item) => ({
        key: item.stage,
        label: item.label,
        count: item.count,
        filter: { kind: 'tracking', value: item.stage, label: item.label } as TodoOverviewFilter,
        cls: item.stage === '待销号' ? tileTone.indigo : tileTone.blue,
      })),
    ];
    const trackingAttentionCards = [
      {
        key: 'followed',
        label: '我关注事项',
        value: `${followProgressItems.length}项`,
        filter: { kind: 'progress', value: 'followed', label: '我关注事项' } as TodoOverviewFilter,
      },
      {
        key: 'longest',
        label: '最长停留',
        value: `${longestTrackingWaitDays}天`,
        filter: { kind: 'progress', value: 'longest', label: '最长停留' } as TodoOverviewFilter,
      },
      {
        key: 'feedback',
        label: '最近反馈',
        value: latestTrackingFeedback,
        filter: { kind: 'progress', value: 'all', label: '最近反馈' } as TodoOverviewFilter,
      },
      {
        key: 'stalled',
        label: '7天未反馈',
        value: `${trackingDelayedCount}项`,
        filter: { kind: 'progress', value: 'stalled', label: '7天未反馈' } as TodoOverviewFilter,
      },
    ];

    const priorityParts = [
      returnedItems.length > 0 ? `${returnedItems.length}项被退回` : '',
      uploadedNotSubmittedItems.length > 0 ? `${uploadedNotSubmittedItems.length}项已上传未提交` : '',
      highRiskItems.length > 0 ? `${highRiskItems.length}项高风险` : '',
      overdueTodos.length > 0 ? `${overdueTodos.length}项已超期` : '',
    ].filter(Boolean);
    const priorityHintText = priorityParts.length > 0
      ? `当前重点提醒：先看${priorityParts.slice(0, 3).join('、')}，再进入右侧待办明细处理。`
      : '当前重点提醒：暂无明显阻塞或高风险事项，可按右侧待办明细顺序处理。';

    const renderOverviewBlock = (
      title: string,
      desc: string,
      cards: Array<{ key: string; label: string; count: number; hint: string; filter: TodoOverviewFilter; cls: string }>,
      accentClass: string,
      extra?: React.ReactNode,
      scrollable = false,
    ) => (
      <div className="h-full min-h-0 rounded-xl bg-[#F8FAFF] p-4 flex flex-col overflow-hidden">
        <div className="mb-3 flex shrink-0 items-center gap-2.5">
          <div className={`h-[16px] w-[3px] rounded-full ${accentClass}`}></div>
          <div className="shrink-0 text-[15px] font-bold text-slate-700">{title}</div>
          <div className="min-w-0 truncate text-[11px] text-slate-400">{desc}</div>
          {extra && <div className="ml-auto">{extra}</div>}
        </div>
        <div className={`grid grid-cols-2 auto-rows-min content-start gap-2.5 ${scrollable ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 custom-scrollbar' : ''}`}>
          {cards.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => applyOverviewFilter(item.filter)}
              className={`min-h-[56px] w-full rounded-lg px-3 py-2 text-left leading-tight transition-all ${item.cls} ${item.count === 0 ? 'opacity-60' : ''} ${
                isOverviewFilterActive(item.filter.kind, item.filter.value) ? 'ring-2 ring-[#4E73C8]/20 bg-white' : 'hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[12px] font-semibold leading-tight">{item.label}</span>
                <span className="text-[18px] font-bold leading-tight">{item.count}<span className="ml-0.5 text-[11px] font-medium">项</span></span>
              </div>
              <div className="mt-1 truncate text-[11px] leading-tight opacity-80">{item.hint}</div>
            </button>
          ))}
        </div>
      </div>
    );

    return (
      <div className="col-span-2 bg-white rounded-2xl shadow-sm p-4 flex flex-col overflow-hidden" style={{ height: '480px' }}>
        <div className="mb-3 flex items-start gap-3">
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="w-[4px] h-[18px] bg-[#4E73C8] rounded-full"></div>
            <div className="text-[17px] font-bold text-[#0F3D8A]">办理概览</div>
          </div>
          <div className="min-w-0 flex flex-1 items-start justify-end gap-2">
            <button
              type="button"
              onClick={() => setAssistDrawer('priority')}
              className="min-w-0 flex-1 rounded-xl bg-blue-50/60 px-3 py-2 text-left text-[11px] leading-relaxed text-[#0F3D8A] transition-colors hover:bg-blue-50"
              title={priorityHintText}
            >
              <span className="block truncate">{priorityHintText}</span>
            </button>
            {overviewFilter && (
              <button
                type="button"
                onClick={() => setOverviewFilter(null)}
                className="h-8 shrink-0 px-3 rounded-lg bg-[#EEF3FF] text-[11px] font-semibold text-[#4E73C8] hover:bg-blue-100/70 transition-colors"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>

        {todoFacts.length === 0 ? (
          <div className="flex-1 rounded-xl bg-[#FAFBFC] flex flex-col items-center justify-center text-center">
            <div className="text-sm font-semibold text-slate-700">当前暂无待处理事项</div>
            <div className="mt-2 text-xs text-slate-400">可通过明细查询查看全部记录。</div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            <div className="grid flex-1 min-h-0 grid-cols-2 grid-rows-2 gap-3">
              {renderOverviewBlock(
                '待办事项',
                '按当前办理动作归集',
                todoTypeCards,
                'bg-[#4E73C8]',
                <span className="text-[12px] font-semibold text-[#4E73C8]">{directTodoItems.length}<span className="ml-0.5 text-[10px] text-slate-400">项</span></span>,
                true,
              )}
              {renderOverviewBlock(
                '阻塞流程',
                '当前卡住或易退回事项',
                blockageCards,
                'bg-amber-500',
                undefined,
                true,
              )}
              {renderOverviewBlock(
                '风险数据',
                '按风险程度归集',
                riskCards,
                'bg-red-500',
              )}
              <div className="h-full min-h-0 rounded-xl bg-[#F8FAFF] p-4 flex flex-col overflow-hidden">
                <div className="mb-3 flex shrink-0 items-center gap-2.5">
                  <div className="h-[16px] w-[3px] rounded-full bg-[#6B8DD6]"></div>
                  <div className="shrink-0 text-[15px] font-bold text-slate-700">已办跟踪</div>
                  <div className="min-w-0 truncate text-[11px] text-slate-400">查看已处理事项流转进度</div>
                  <div className="ml-auto shrink-0 text-[13px] font-semibold text-[#4E73C8]">未结束 {handledProgressTodos.length}<span className="ml-0.5 text-[11px] text-slate-400">项</span></div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
                  <div className="mb-1.5 text-[11px] font-medium text-slate-400">流转节点</div>
                  <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
                    {progressStageCards.map((item, index) => (
                      <React.Fragment key={item.key}>
                        <button
                          type="button"
                          title={item.key === '待销号' ? '问题整改类为待销号，其他流程类为待完结。' : item.label}
                          onClick={() => openTrackingDrawer(item.filter)}
                          className={`min-h-[48px] rounded-lg bg-white/75 px-3 py-2 text-left text-[#0F3D8A] transition-all hover:bg-white ${item.count === 0 ? 'opacity-60' : ''}`}
                        >
                          <div className="truncate text-[12px] font-semibold">{item.label}</div>
                          <div className="mt-1 text-[16px] font-bold">{item.count}<span className="ml-0.5 text-[11px] font-medium">项</span></div>
                        </button>
                        {index < progressStageCards.length - 1 && (
                          <div className="text-center text-[14px] text-slate-300">→</div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="mt-3 mb-1.5 text-[11px] font-medium text-slate-400">关注提醒</div>
                  <div className="grid grid-cols-4 gap-2">
                    {trackingAttentionCards.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => openTrackingDrawer(item.filter)}
                        className="min-h-[42px] rounded-lg bg-white/60 px-2.5 py-1.5 text-left text-slate-600 transition-colors hover:bg-white"
                      >
                        <div className="truncate text-[11px] text-slate-400">{item.label}</div>
                        <div className="mt-0.5 truncate text-[13px] font-semibold text-slate-700">{item.value}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

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
              <div className="text-sm text-slate-700">{topicProfile.ruleHitTitle}</div>
              <div className="text-xs text-slate-500 mt-1">{topicProfile.ruleHitPolicy}</div>
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
          <div className="mb-4 bg-white rounded-2xl shadow-sm p-4">
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
                className="overflow-x-auto overflow-clip-margin-[12px] custom-scrollbar flex-1"
                id="flow-scroll-container"
              >
                <div className="flex items-center gap-4 px-2" style={{ minWidth: 'max-content' }}>
                  {FLOW_STEPS.map((step) => {
                    return (
                      <div 
                        key={step.key}
                        className="group flex-shrink-0 w-[240px] h-[80px] rounded-xl p-3 bg-gradient-to-br from-white to-[#F5F7FA] transition-all cursor-pointer relative shadow-sm hover:shadow-lg hover:-translate-y-1"
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
          
          {/* 第二大区：办理概览（左） + 待办明细（右） */}
          <section className="grid grid-cols-3 gap-4">
            {renderItemOverview()}
            <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col" style={{ height: '480px' }}>
              <div className="mb-3 flex items-center gap-2.5">
                <div className="w-[4px] h-[18px] bg-[#4E73C8] rounded-full"></div>
                <div className="text-[17px] font-bold text-[#0F3D8A]">待办明细</div>
              </div>
              {overviewFilter && (
                <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-blue-50/70 px-3 py-1.5 text-xs text-[#0F3D8A]">
                  <span>当前筛选：{overviewFilter.label}</span>
                  <button
                    type="button"
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[11px] text-slate-400 hover:text-[#4E73C8]"
                    onClick={() => setOverviewFilter(null)}
                    aria-label="清除筛选"
                  >
                    ×
                  </button>
                </div>
              )}
              <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                {displayTodos.length === 0 ? (
                  <div className="h-full rounded-xl bg-[#FAFBFC] flex flex-col items-center justify-center text-center">
                    <div className="text-sm font-semibold text-slate-700">当前暂无待处理事项</div>
                    <div className="mt-2 text-xs text-slate-400">可通过明细查询查看全部记录。</div>
                  </div>
                ) : displayTodos.map((item, idx) => {
                  const isOverdue = item.timing === 'overdue';
                  const isDueSoon = item.timing === 'due';
                  const statusCls = getTodoStatusPillClass(item.status);
                  
                  return (
                    <div key={`${item.t}-${item.d}-${idx}`} className="bg-[#FAFBFC] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2 gap-3">
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
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{item.flowNode}</span>
                          <span className="text-xs px-2 py-0.5 bg-slate-50 text-slate-600 rounded-full truncate max-w-[130px]">{item.module}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusCls}`}>{item.status}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 truncate max-w-[160px]">{item.category}</span>
                          {(isOverdue || isDueSoon) && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                              {isOverdue ? '超期' : '临期'}
                            </span>
                          )}
                        </div>
                        <button type="button" className="text-xs text-[#4E73C8] hover:text-[#3D5FA8] transition-colors whitespace-nowrap">
                          {item.actions[0] || '处理'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
          
          {/* 第三大区：办理辅助区 */}
          <section className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-[4px] h-[18px] bg-[#4E73C8] rounded-full"></div>
                  <div className="text-[17px] font-bold text-[#0F3D8A]">办理辅助区</div>
                </div>
                <div className="mt-1 text-[11px] text-slate-400 pl-3.5">
                  上面告诉我"有哪些事、哪些卡住、哪些风险高"，这里告诉我"这类事怎么处理、需要补什么、可以参考什么"。
                </div>
              </div>
              <div className="shrink-0 rounded-lg bg-[#EEF3FF] px-3 py-1.5 text-[11px] font-medium text-[#4E73C8]">
                当前辅助对象：{assistContext.label}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-[3] min-w-0 space-y-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
                  <div className="text-[14px] font-bold text-slate-700">当前处理建议</div>
                </div>
                {assistContext.leftItems.map((item) => {
                  const toneConfig = item.tone === 'rose'
                    ? { bg: 'bg-rose-50/60', dot: 'bg-rose-500', btnAction: 'bg-rose-500 hover:bg-rose-600 text-white', btnView: 'text-rose-600 hover:bg-rose-50' }
                    : item.tone === 'amber'
                      ? { bg: 'bg-amber-50/60', dot: 'bg-amber-500', btnAction: 'bg-amber-500 hover:bg-amber-600 text-white', btnView: 'text-amber-600 hover:bg-amber-50' }
                      : item.tone === 'slate'
                        ? { bg: 'bg-slate-50/80', dot: 'bg-slate-400', btnAction: 'bg-slate-500 hover:bg-slate-600 text-white', btnView: 'text-slate-600 hover:bg-slate-100' }
                        : { bg: 'bg-blue-50/60', dot: 'bg-[#4E73C8]', btnAction: 'bg-[#4E73C8] hover:bg-[#3D5FA8] text-white', btnView: 'text-[#4E73C8] hover:bg-blue-50' };

                  return (
                    <div key={item.key} className={`rounded-lg px-4 py-2.5 ${toneConfig.bg}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${toneConfig.dot}`}></span>
                            <span className="text-[13px] font-semibold text-slate-800">{item.title}</span>
                            {item.count > 0 && <span className="text-[11px] font-medium text-slate-400">{item.count}项</span>}
                          </div>
                          <div className="mt-1 text-[12px] leading-relaxed text-slate-600">{item.detail}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {item.viewBtn && (
                            <button
                              type="button"
                              onClick={() => setAssistDrawer(item.viewBtn!.drawer)}
                              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${toneConfig.btnView}`}
                            >
                              {item.viewBtn.label}
                            </button>
                          )}
                          {item.actionBtn && (
                            <button
                              type="button"
                              onClick={() => {
                                if (item.actionBtn!.filter) applyOverviewFilter(item.actionBtn!.filter);
                                setAssistDrawer(item.actionBtn!.drawer);
                              }}
                              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${toneConfig.btnAction}`}
                            >
                              {item.actionBtn.label}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex-[2] min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-[3px] h-[14px] bg-slate-400 rounded-full"></div>
                  <div className="text-[14px] font-bold text-slate-700">处理支撑</div>
                </div>
                {assistContext.rightDetail ? (
                  <div className="rounded-lg bg-[#F8FAFF] p-4">
                    <div className="text-[12px] font-semibold text-slate-500 mb-2">
                      {assistContext.rightDetail.type === 'return' ? '退回原因与补正要求' :
                       assistContext.rightDetail.type === 'material' ? '材料缺项与示例' :
                       assistContext.rightDetail.type === 'stale' ? '更新要求与流程影响' :
                       assistContext.rightDetail.type === 'risk' ? '风险依据与规则来源' :
                       assistContext.rightDetail.type === 'tracking' ? '流程状态与反馈' : '处理支撑详情'}
                    </div>
                    {assistContext.rightDetail.returnReasons.map((r, i) => (
                      <div key={i} className={`flex items-center justify-between py-1.5 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                        <span className="text-[12px] text-slate-600">{r.label}</span>
                        <span className="text-[12px] font-semibold text-slate-700">{typeof r.count === 'number' && r.count > 0 ? `${r.count}项` : r.count}</span>
                      </div>
                    ))}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-[11px] font-medium text-slate-400 mb-1.5">建议</div>
                      {assistContext.rightDetail.suggestions.map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600 leading-relaxed">
                          <span className="text-slate-300">{i + 1}.</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assistContext.rightCapabilities!.map((cap) => (
                      <button
                        key={cap.key}
                        type="button"
                        onClick={() => setAssistDrawer(cap.key as any)}
                        className="w-full rounded-lg bg-[#F8FAFF] p-3 text-left transition-colors hover:bg-[#EEF3FF]"
                      >
                        <div className="text-[12px] font-semibold text-slate-700">{cap.title}</div>
                        <div className="mt-0.5 text-[11px] text-slate-400">{cap.desc}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

	            {assistDrawer && (() => {
	              const titleMap: Record<AssistDrawerType, string> = {
	                priority: '当前重点说明',
		                responseList: '待办明细列表',
		                basis: '当前排序依据',
		                return: '退回原因与补正建议',
		                material: '补正材料清单',
		                selfCheck: '提交前自查提醒',
		                history: '历史同类整改参考',
			                progress: '已办跟踪列表',
		                flow: '流程与反馈跟踪',
	              };

              return (
                <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6">
                  <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-2xl p-5 custom-scrollbar">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-lg font-bold text-[#0F3D8A]">{titleMap[assistDrawer]}</div>
                      <button type="button" className="text-xs text-slate-500 hover:text-slate-700" onClick={() => setAssistDrawer(null)}>关闭</button>
	                    </div>
	
	                    {assistDrawer === 'priority' && (
	                      <div className="space-y-4">
	                        <div className="rounded-xl bg-[#F8FAFF] p-4">
	                          <div className="text-sm font-semibold text-slate-800">当前重点提醒</div>
	                          <div className="mt-2 text-xs leading-relaxed text-slate-600">{drawerData.prioritySummary}</div>
	                        </div>
	                        <div className="grid grid-cols-2 gap-3">
	                          {drawerData.priorityBasis.filter((item) => item.count > 0).map((item) => (
	                            <button
	                              key={`${item.group}-${item.label}`}
	                              type="button"
	                              className="rounded-xl bg-[#FAFBFC] px-4 py-3 text-left transition-colors hover:bg-blue-50/40"
	                              onClick={() => applyOverviewFilter(item.filter)}
	                            >
	                              <div className="flex items-center justify-between gap-3">
	                                <div>
	                                  <div className="text-[10px] text-slate-400">{item.group}</div>
	                                  <div className="mt-1 text-sm font-semibold text-slate-800">{item.label}</div>
	                                </div>
	                                <div className="text-lg font-bold text-[#4E73C8]">{item.count}<span className="ml-0.5 text-[10px] text-slate-400">项</span></div>
	                              </div>
	                              <div className="mt-2 text-xs leading-relaxed text-slate-500">{item.reason}</div>
	                            </button>
	                          ))}
	                        </div>
	                        <div className="rounded-xl bg-amber-50/50 px-4 py-3 text-xs leading-relaxed text-slate-600">
	                          提醒依据来自流程状态、退回记录、附件/报送状态、截止日期、事项风险等级和经办流转时间，不使用无来源的临时风险分类。
	                        </div>
	                      </div>
	                    )}

	                    {assistDrawer === 'responseList' && (
	                      <div className="space-y-4">
	                        <div className="grid grid-cols-3 gap-3">
	                          <div className="rounded-xl bg-[#F8FAFF] p-4">
                            <div className="text-[10px] text-slate-400">待办</div>
	                            <div className="mt-1 text-lg font-bold text-[#0F3D8A]">{responseTodos.length}项</div>
	                          </div>
	                          <div className="rounded-xl bg-rose-50/60 p-4">
		                            <div className="text-[10px] text-slate-400">被退回</div>
	                            <div className="mt-1 text-lg font-bold text-rose-600">{returnedResponseTodos.length}项</div>
	                          </div>
	                          <div className="rounded-xl bg-orange-50/60 p-4">
	                            <div className="text-[10px] text-slate-400">已上传未提交</div>
	                            <div className="mt-1 text-lg font-bold text-orange-600">{uploadedNotSubmittedTodos.length}项</div>
	                          </div>
	                        </div>
	                        <div className="space-y-2">
	                          {responseTodos.slice(0, 8).map((item) => {
	                            const actionLabel = item.disposalPool === 'returned'
	                              ? '退回补正'
	                              : isTodoUploadedNotSubmitted(item)
	                                ? '正式提交'
	                                : item.responseAction;
	                            const reasonLabel = item.disposalPool === 'returned'
	                              ? '退回原因：佐证材料不完整'
	                              : isTodoUploadedNotSubmitted(item)
	                                ? '材料已上传但尚未进入审核流程'
	                                : item.dueDays < 0
	                                  ? `已超期 ${Math.abs(item.dueDays)} 天`
	                                  : item.dueDays === 0
	                                    ? '今日到期'
	                                    : `${item.dueDays} 天后到期`;
	                            return (
	                              <div key={`${item.t}-${item.d}-${item.status}`} className="grid grid-cols-12 gap-3 rounded-xl bg-[#FAFBFC] px-4 py-3 text-xs">
	                                <div className="col-span-5 min-w-0">
	                                  <div className="truncate font-semibold text-slate-800">{item.t}</div>
	                                  <div className="mt-1 text-slate-400">{item.module}</div>
	                                </div>
	                                <div className="col-span-2 text-slate-600">{actionLabel}</div>
	                                <div className="col-span-3 text-slate-500">{reasonLabel}</div>
	                                <div className="col-span-2 text-right text-[#4E73C8]">查看详情</div>
	                              </div>
	                            );
	                          })}
	                        </div>
	                      </div>
	                    )}

		                    {assistDrawer === 'basis' && (
		                      <div className="space-y-4">
	                        <div className="rounded-xl bg-[#F8FAFF] p-4">
	                          <div className="text-sm font-semibold text-slate-800">当前为什么这样排序</div>
	                          <div className="mt-2 text-xs leading-relaxed text-slate-600">
	                            排序只用于提示优先查看顺序，依据来自流程状态、退回记录、附件上传、整改进展时间和事项风险字段。
	                          </div>
	                        </div>
	                        <div className="space-y-2">
	                          {drawerData.priorityBasis.map((item, index) => (
	                            <div key={`${item.group}-${item.label}`} className="grid grid-cols-12 gap-3 rounded-xl bg-[#FAFBFC] px-4 py-3">
	                              <div className="col-span-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-[#4E73C8]">{index + 1}</div>
	                              <div className="col-span-8 min-w-0">
	                                <div className="text-sm font-semibold text-slate-800">{item.label}优先</div>
	                                <div className="mt-1 text-xs text-slate-500">{item.reason}</div>
	                                <div className="mt-1 text-[10px] text-slate-400">来源：{item.source}</div>
	                              </div>
	                              <div className="col-span-1 text-right text-sm font-bold text-[#4E73C8]">{item.count}</div>
	                              <button
	                                type="button"
	                                className="col-span-2 shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-[#4E73C8] hover:bg-blue-50"
	                                onClick={() => applyOverviewFilter(item.filter)}
	                              >
	                                查看对应事项
	                              </button>
	                            </div>
	                          ))}
	                        </div>
	                        <div className="text-xs text-slate-400">本排序为辅助提醒，不改变原有业务流程和审核规则。</div>
	                      </div>
	                    )}

                    {assistDrawer === 'return' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-[#FAFBFC] p-4">
                            <div className="text-[10px] text-slate-400">事项名称</div>
                            <div className="mt-1 text-sm font-semibold text-slate-800">{drawerData.returnAdvice.itemName}</div>
                          </div>
                          <div className="rounded-xl bg-[#FAFBFC] p-4">
                            <div className="text-[10px] text-slate-400">退回原因</div>
                            <div className="mt-1 text-sm text-slate-700">{drawerData.returnAdvice.reason}</div>
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 text-sm font-semibold text-slate-800">退回原因汇总</div>
                          <div className="space-y-2">
                            {drawerData.returnAdvice.categories.map((item) => (
                              <div key={item.label} className="grid grid-cols-12 gap-3 rounded-xl bg-[#FAFBFC] px-4 py-3 text-xs">
                                <div className="col-span-4 font-semibold text-slate-700">{item.label}</div>
                                <div className="col-span-2 text-slate-500">{item.count}项</div>
                                <div className="col-span-6 text-slate-600">{item.action}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 text-sm font-semibold text-slate-800">建议补正</div>
                          <div className="grid grid-cols-2 gap-2">
                            {drawerData.returnAdvice.suggestions.map((item) => (
                              <div key={item} className="rounded-lg bg-amber-50/50 px-3 py-2 text-xs text-slate-700">{item}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {assistDrawer === 'material' && (
                      <div className="space-y-4">
                        <div className="rounded-xl bg-[#F8FAFF] p-4 text-xs leading-relaxed text-slate-600">
                          材料清单用于提交前核对，不直接判断材料是否合规。
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {drawerData.historyReference.materials.map((item) => (
                            <div key={item} className="rounded-xl bg-[#FAFBFC] px-4 py-3">
                              <div className="text-sm font-semibold text-slate-800">{item}</div>
                              <div className="mt-1 text-xs text-slate-500">建议与整改说明逐项对应，附件名称保持一致。</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

	                    {assistDrawer === 'selfCheck' && (
	                      <div className="space-y-4">
	                        <div className="grid grid-cols-3 gap-3">
	                          <div className="col-span-2 rounded-xl bg-[#FAFBFC] p-4">
	                            <div className="text-[10px] text-slate-400">事项名称</div>
	                            <div className="mt-1 text-sm font-semibold text-slate-800">{drawerData.selfCheck.itemName}</div>
	                          </div>
	                          <div className="rounded-xl bg-amber-50/60 p-4">
	                            <div className="text-[10px] text-amber-600">自查结果</div>
	                            <div className="mt-1 text-sm font-semibold text-amber-700">需关注 {drawerData.selfCheck.attentionCount} 项</div>
	                          </div>
	                        </div>
	                        <div className="rounded-xl bg-[#F8FAFF] p-4">
	                          <div className="text-[10px] text-slate-400">当前状态</div>
	                          <div className="mt-1 text-sm text-slate-700">{drawerData.selfCheck.status}</div>
	                          <div className="mt-2 text-xs text-slate-500">以下为系统辅助检查结果，不替代审核判断。</div>
	                        </div>
	                        <div>
	                          <div className="mb-2 text-sm font-semibold text-slate-800">检查项</div>
	                          <div className="grid grid-cols-2 gap-3">
	                          {drawerData.selfCheck.concerns.map((item) => (
	                            <div key={item} className="rounded-xl bg-[#FAFBFC] px-4 py-3 text-xs text-slate-700">{item}</div>
	                          ))}
	                          </div>
	                        </div>
	                        <div className="flex justify-end gap-2">
	                          <button type="button" className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200" onClick={() => setAssistDrawer('material')}>查看材料</button>
	                          <button type="button" className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-[#4E73C8] hover:bg-blue-100" onClick={() => applyOverviewFilter({ kind: 'response', value: '待提交/重新提交', label: '待提交/重新提交' })}>继续补充</button>
	                          <button type="button" className="rounded-lg bg-[#4E73C8] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3D5FA8]" onClick={() => applyOverviewFilter({ kind: 'response', value: '已上传未提交', label: '已上传未提交' })}>确认提交</button>
	                        </div>
	                      </div>
	                    )}

	                    {assistDrawer === 'history' && (
	                      <div className="space-y-4">
	                        <div className="rounded-xl bg-[#F8FAFF] p-4">
	                          <div className="text-sm font-semibold text-slate-800">匹配条件</div>
	                          <div className="mt-2 flex flex-wrap gap-2">
	                            {drawerData.historyReference.matchBasis.map((item) => (
	                              <span key={item} className="rounded-full bg-white px-3 py-1 text-xs text-[#4E73C8]">{item}</span>
	                            ))}
	                          </div>
	                          <div className="mt-2 text-xs leading-relaxed text-slate-600">历史参考仅供填报和材料准备参考，不替代本事项审核意见。</div>
	                        </div>
	                        <div>
	                          <div className="mb-2 text-sm font-semibold text-slate-800">可参考内容</div>
	                          <div className="grid grid-cols-2 gap-2">
	                            {['已通过整改说明', '已通过佐证材料清单', '常见补正口径', '审核通过原因'].map((item) => (
	                              <div key={item} className="rounded-lg bg-blue-50/50 px-3 py-2 text-xs text-[#0F3D8A]">{item}</div>
	                            ))}
	                          </div>
	                        </div>
	                        <div>
	                          <div className="mb-2 text-sm font-semibold text-slate-800">可参考做法</div>
	                          <div className="grid grid-cols-2 gap-2">
	                            {drawerData.historyReference.methods.map((item) => (
	                              <div key={item} className="rounded-lg bg-[#FAFBFC] px-3 py-2 text-xs text-slate-700">{item}</div>
	                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 text-sm font-semibold text-slate-800">常用材料</div>
                          <div className="flex flex-wrap gap-2">
                            {drawerData.historyReference.materials.map((item) => (
                              <span key={item} className="rounded-full bg-blue-50/70 px-3 py-1 text-xs text-[#4E73C8]">{item}</span>
                            ))}
                          </div>
                        </div>
	                      </div>
	                    )}

	                    {assistDrawer === 'progress' && (
	                      <div className="space-y-4">
			                        <div className="space-y-2">
			                          <div className="grid grid-cols-12 gap-3 px-4 text-[10px] font-medium text-slate-400">
			                            <div className="col-span-3">事项名称</div>
			                            <div className="col-span-2">我上次处理动作</div>
			                            <div className="col-span-1">处理时间</div>
			                            <div className="col-span-2">当前节点</div>
			                            <div className="col-span-1">处理岗</div>
			                            <div className="col-span-1">停留</div>
			                            <div className="col-span-1">反馈</div>
			                            <div className="col-span-1 text-right">操作</div>
			                          </div>
			                          {progressDrawerTodos.length === 0 && (
			                            <div className="rounded-xl bg-[#FAFBFC] px-4 py-6 text-center text-xs text-slate-400">
			                              当前节点暂无流转事项。
		                            </div>
		                          )}
		                          {progressDrawerTodos.slice(0, 8).map((item) => {
		                            const stageLabel = item.flowStage === '已提交待审核'
		                              ? '待审核'
		                              : item.flowStage === '待销号'
		                                ? '待最终确认'
		                                : item.flowStage;
		                            const handlerLabel = item.flowStage === '已提交待审核'
		                              ? '审核岗'
		                              : item.flowStage === '审核/复核中'
		                                ? '复核岗'
		                                : item.flowStage === '待销号'
		                                  ? '确认岗'
		                                  : '经办岗';
		                            const lastAction = item.submittedDate ? '提交或更新' : '持续关注';
		                            const waitDays = getTodoTrackingWaitDays(item);
		                            return (
		                              <div key={`${item.t}-${item.d}-${item.status}`} className="grid grid-cols-12 gap-3 rounded-xl bg-[#FAFBFC] px-4 py-3 text-xs">
		                                <div className="col-span-3 min-w-0">
		                                  <div className="truncate font-semibold text-slate-800">{item.t}</div>
		                                  <div className="mt-1 text-slate-400">{item.module}</div>
		                                </div>
		                                <div className="col-span-2 text-slate-600">{lastAction}</div>
		                                <div className="col-span-1 text-slate-500">{item.submittedDate || item.feedbackDate || '暂无'}</div>
		                                <div className="col-span-2 text-slate-600">{stageLabel}</div>
		                                <div className="col-span-1 text-slate-500">{handlerLabel}</div>
		                                <div className="col-span-1 text-slate-500">{waitDays > 0 ? `${waitDays}天` : '待确认'}</div>
		                                <div className="col-span-1 text-slate-500">{item.feedbackDate || '暂无'}</div>
		                                <button type="button" className="col-span-1 text-right text-[#4E73C8]" onClick={() => setAssistDrawer('flow')}>查看流程</button>
		                              </div>
		                            );
		                          })}
	                        </div>
	                      </div>
	                    )}
	
		                    {assistDrawer === 'flow' && (
	                      <div className="space-y-4">
	                        <div className="rounded-xl bg-[#F8FAFF] p-4">
	                          <div className="mb-3 text-sm font-semibold text-slate-800">流程节点</div>
	                          <div className="flex items-center gap-2">
	                            {drawerData.trackingAssist.flowLogs.map((item, index) => (
	                              <React.Fragment key={item.node}>
	                                <div className={`min-w-[92px] rounded-xl px-3 py-2 text-center ${item.current ? 'bg-[#4E73C8] text-white' : 'bg-white text-slate-600'}`}>
	                                  <div className="text-xs font-semibold">{item.node}</div>
	                                  <div className={`mt-1 text-[10px] ${item.current ? 'text-blue-50' : 'text-slate-400'}`}>{item.role}</div>
	                                </div>
	                                {index < drawerData.trackingAssist.flowLogs.length - 1 && (
	                                  <div className="h-px flex-1 bg-blue-100"></div>
	                                )}
	                              </React.Fragment>
	                            ))}
	                          </div>
	                        </div>
	                        <div className="space-y-2">
	                          {drawerData.trackingAssist.flowLogs.map((item) => (
	                            <div key={`${item.node}-${item.time}`} className="grid grid-cols-12 gap-3 rounded-xl bg-[#FAFBFC] px-4 py-3 text-xs">
	                              <div className="col-span-2 font-semibold text-slate-700">{item.node}</div>
	                              <div className="col-span-2 text-slate-500">{item.role}</div>
	                              <div className="col-span-2 text-slate-500">{item.time}</div>
	                              <div className="col-span-4 text-slate-600">{item.opinion}</div>
	                              <div className="col-span-2 text-right text-[#4E73C8]">{item.stay}</div>
	                            </div>
	                          ))}
	                        </div>
	                        <div className="rounded-xl bg-amber-50/50 px-4 py-3 text-xs leading-relaxed text-slate-600">
	                          如超过7天关注阈值仍无反馈，建议主动查看反馈意见或联系对应处理岗。
	                        </div>
	                      </div>
	                    )}
                  </div>
                </div>
              );
            })()}

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
                            <div className="text-[10px] text-slate-400 mb-1">情况概述</div>
                            <div className="text-xs text-slate-700 leading-relaxed">{report.overview}</div>
                          </div>
                          <div className="p-3 rounded-lg  bg-slate-50/50">
                            <div className="text-[10px] text-slate-400 mb-1">办理影响</div>
                            <div className="text-xs text-slate-700 leading-relaxed">{report.impact}</div>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg ">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
                            <div className="text-[15px] font-bold text-slate-700">历史走势参考</div>
                          </div>
                          <div className="grid grid-cols-6 gap-2 text-center">
                            {report.trend.map((point) => (
                              <div key={point} className="text-[10px] bg-blue-50/50 rounded px-2 py-1 text-slate-600">{point}</div>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg ">
                            <div className="text-xs font-semibold text-slate-700 mb-2">关注项</div>
                            <div className="space-y-1">
                              {report.triggeredRules.map((r) => <div key={r} className="text-xs text-slate-600">• {r}</div>)}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg ">
                            <div className="text-xs font-semibold text-slate-700 mb-2">依据与流程</div>
                            <div className="space-y-1">
                              {report.basis.map((b) => <div key={b} className="text-xs text-slate-600">• {b}</div>)}
                            </div>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg  bg-amber-50/40">
                          <div className="text-xs font-semibold text-slate-700 mb-2">整改参考</div>
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
                        <div className="text-xs text-slate-700"><span className="text-slate-400">适用说明：</span>{rule.definition}</div>
                        <div className="text-xs text-slate-700"><span className="text-slate-400">核对条件：</span>{rule.threshold}</div>
                        <div className="text-xs text-slate-700"><span className="text-slate-400">数据来源：</span>{rule.source}</div>
                        <div className="text-xs text-slate-700"><span className="text-slate-400">核对逻辑：</span>{rule.logic}</div>
                        <div className="text-xs text-slate-700"><span className="text-slate-400">近期参考：</span>{rule.recent}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          
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
