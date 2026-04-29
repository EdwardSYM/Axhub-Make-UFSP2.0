/**
 * @name 评价图谱
 *
 * 参考资料：
 * - /src/prototypes/evaluation-graph/spec.md
 * - /src/themes/ufsp-sky/globals.css
 * - /rules/design-guide.md
 * - /rules/development-guide.md
 */

import './style.css';
import '../../themes/ufsp-sky/globals.css';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
  ApartmentOutlined,
  ControlOutlined,
  LinkOutlined,
  NodeIndexOutlined,
  RadarChartOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import TopBar from '../../common/components/TopBar';
import type { AxureHandle, AxureProps, ConfigItem, EventItem, KeyDesc } from '../../common/axure-types';
import { createEventEmitter, getConfigValue } from '../../common/axure-types';

type FocusMode = 'all' | 'gap' | 'risk';
type NodeType = 'policy' | 'indicator' | 'topic';
type SelectedNode = { type: NodeType; id: string };

type Policy = {
  id: string;
  name: string;
  level: string;
  owner: string;
  summary: string;
  indicatorIds: string[];
};

type Indicator = {
  id: string;
  name: string;
  score: number;
  risk: '高' | '中' | '低';
  formula: string;
  summary: string;
  gap: string;
  policyIds: string[];
  topicIds: string[];
};

type Topic = {
  id: string;
  name: string;
  owner: string;
  progress: string;
  summary: string;
  indicatorIds: string[];
};

type BrowserItem = {
  id: string;
  type: NodeType;
  title: string;
  meta: string;
  summary: string;
  tone?: string;
};

const EVENT_LIST: EventItem[] = [{ name: 'onNavigate', desc: '页面导航', payload: 'string' }];
const ACTION_LIST: Array<{ name: string; desc: string; params?: string }> = [];
const VAR_LIST: KeyDesc[] = [
  { name: 'focus_mode', desc: '当前图谱视角' },
  { name: 'browse_type', desc: '当前浏览类型' },
  { name: 'selected_node', desc: '当前焦点节点' },
];
const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '系统标题', initialValue: '财会监督系统' },
  { type: 'select', attributeId: 'defaultFocusMode', displayName: '默认视角', initialValue: 'all', options: ['all', 'gap', 'risk'] },
];

const POLICIES: Policy[] = [
  { id: 'p1', name: '预算绩效管理办法', level: '财政部规范', owner: '绩效管理处', summary: '界定预算绩效目标编报、监控、评价与应用要求，是绩效类指标的主要制度依据。', indicatorIds: ['i1', 'i2'] },
  { id: 'p2', name: '财政资金监督检查工作规程', level: '省级制度', owner: '监督评价局', summary: '规范监督检查立项、核查、整改与归档流程，覆盖问题处置类评价指标。', indicatorIds: ['i2', 'i3', 'i4'] },
  { id: 'p3', name: '政府采购内部控制规范', level: '专项制度', owner: '采购监管处', summary: '约束采购审批、执行和验收控制环节，支撑采购合规类考评口径。', indicatorIds: ['i5'] },
  { id: 'p4', name: '国有资产管理规定', level: '综合制度', owner: '资产管理处', summary: '聚焦资产配置、处置和账实相符，对资产处置主题形成承接。', indicatorIds: ['i6'] },
];

const INDICATORS: Indicator[] = [
  { id: 'i1', name: '绩效目标完整率', score: 91, risk: '低', formula: '完整填报项目数 / 应填报项目数', summary: '反映预算项目绩效目标编制是否完整，是绩效管理基础性指标。', gap: '制度覆盖充分，但部分单位目标分解颗粒度不足。', policyIds: ['p1'], topicIds: ['t1', 't4'] },
  { id: 'i2', name: '绩效监控闭环率', score: 76, risk: '中', formula: '完成整改的监控问题数 / 监控发现问题数', summary: '衡量预算绩效监控结果是否完成处置闭环。', gap: '制度依据明确，但与整改主题的台账衔接不稳定。', policyIds: ['p1', 'p2'], topicIds: ['t1', 't3'] },
  { id: 'i3', name: '问题整改按期完成率', score: 68, risk: '高', formula: '按期完成整改数 / 应整改问题数', summary: '反映监督发现问题从立项到销号的执行效率。', gap: '指标承接多个主题，但责任边界交叉，整改超期现象明显。', policyIds: ['p2'], topicIds: ['t2', 't3'] },
  { id: 'i4', name: '监督取证规范率', score: 82, risk: '中', formula: '符合取证规范的问题单数 / 抽检问题单数', summary: '考察监督检查证据链是否完整、口径是否统一。', gap: '缺少与数字化取证场景对应的补充规则。', policyIds: ['p2'], topicIds: ['t2'] },
  { id: 'i5', name: '采购执行偏离率', score: 64, risk: '高', formula: '偏离采购计划金额 / 采购执行总金额', summary: '识别采购执行中计划偏移、拆分采购等风险。', gap: '主题承接充分，但缺少与预算联动的上位规则映射。', policyIds: ['p3'], topicIds: ['t4'] },
  { id: 'i6', name: '资产处置合规率', score: 79, risk: '中', formula: '合规处置单数 / 全部处置单数', summary: '用于评估资产处置过程是否按程序报批、评估与入账。', gap: '制度与主题关系清晰，但预警规则仍偏人工。', policyIds: ['p4'], topicIds: ['t3'] },
];

const TOPICS: Topic[] = [
  { id: 't1', name: '预算绩效主题', owner: '绩效专班', progress: '本月复盘中', summary: '承接预算绩效目标、监控、结果应用等主线事项。', indicatorIds: ['i1', 'i2'] },
  { id: 't2', name: '监督检查主题', owner: '监督检查室', progress: '整改督办中', summary: '聚焦取证、问题认定、整改追踪与销号。', indicatorIds: ['i3', 'i4'] },
  { id: 't3', name: '整改闭环主题', owner: '整改专班', progress: '重点跟踪中', summary: '串联问题分派、整改时限、复核销号与问责协同。', indicatorIds: ['i2', 'i3', 'i6'] },
  { id: 't4', name: '采购与资产主题', owner: '采购资产处', progress: '规则补齐中', summary: '覆盖政府采购、资产配置与处置联动监督。', indicatorIds: ['i1', 'i5'] },
];

const MODE_META: Record<FocusMode, { label: string; hint: string }> = {
  all: { label: '全链路', hint: '查看全部制度、指标和主题的承接关系。' },
  gap: { label: '政策缺口', hint: '优先看规则不完整、依据不足的对象。' },
  risk: { label: '高风险指标', hint: '优先看高风险指标及其上下游承接。' },
};

const BROWSE_TABS: Array<{ key: NodeType; label: string; icon: React.ReactNode }> = [
  { key: 'policy', label: '政策条例', icon: <SafetyCertificateOutlined /> },
  { key: 'indicator', label: '评价指标', icon: <RadarChartOutlined /> },
  { key: 'topic', label: '监督主题', icon: <ApartmentOutlined /> },
];

function getRiskTone(risk: Indicator['risk']) {
  if (risk === '高') return 'bg-[#FFF1F2] text-[#BE123C]';
  if (risk === '中') return 'bg-[#FFF7ED] text-[#C2410C]';
  return 'bg-[#F0FDF4] text-[#15803D]';
}

function asBrowserItem(item: Policy | Indicator | Topic, type: NodeType): BrowserItem {
  if (type === 'policy') {
    const policy = item as Policy;
    return {
      id: policy.id,
      type,
      title: policy.name,
      meta: `${policy.level} · ${policy.owner}`,
      summary: policy.summary,
    };
  }
  if (type === 'indicator') {
    const indicator = item as Indicator;
    return {
      id: indicator.id,
      type,
      title: indicator.name,
      meta: `得分 ${indicator.score} 分 · ${indicator.risk}风险`,
      summary: indicator.summary,
      tone: getRiskTone(indicator.risk),
    };
  }
  const topic = item as Topic;
  return {
    id: topic.id,
    type,
    title: topic.name,
    meta: `${topic.owner} · ${topic.progress}`,
    summary: topic.summary,
  };
}

function getSelectedKey(node: SelectedNode) {
  return `${node.type}:${node.id}`;
}

const Component = forwardRef<AxureHandle, AxureProps>(function Component(innerProps, ref) {
  const configSource = innerProps && typeof innerProps.config === 'object' && innerProps.config ? innerProps.config : {};
  const onEventHandler = typeof innerProps?.onEvent === 'function' ? innerProps.onEvent : undefined;
  const emitEvent = useMemo(() => createEventEmitter(onEventHandler), [onEventHandler]);

  const title = getConfigValue<string>(configSource, 'title', '财会监督系统');
  const defaultFocusMode = getConfigValue<FocusMode>(configSource, 'defaultFocusMode', 'all');

  const [focusMode, setFocusMode] = useState<FocusMode>(defaultFocusMode);
  const [browseType, setBrowseType] = useState<NodeType>(defaultFocusMode === 'risk' ? 'indicator' : 'policy');
  const [selectedNode, setSelectedNode] = useState<SelectedNode>({ type: defaultFocusMode === 'risk' ? 'indicator' : 'policy', id: defaultFocusMode === 'risk' ? 'i3' : 'p1' });

  const policyMap = useMemo(() => new Map(POLICIES.map(item => [item.id, item])), []);
  const indicatorMap = useMemo(() => new Map(INDICATORS.map(item => [item.id, item])), []);
  const topicMap = useMemo(() => new Map(TOPICS.map(item => [item.id, item])), []);

  const filteredIndicators = useMemo(() => {
    if (focusMode === 'risk') return INDICATORS.filter(item => item.risk === '高');
    if (focusMode === 'gap') return INDICATORS.filter(item => item.gap.includes('缺少') || item.gap.includes('不足'));
    return INDICATORS;
  }, [focusMode]);

  const visibleIndicatorIds = useMemo(() => new Set(filteredIndicators.map(item => item.id)), [filteredIndicators]);

  const visiblePolicies = useMemo(
    () => POLICIES.filter(item => focusMode === 'all' || item.indicatorIds.some(id => visibleIndicatorIds.has(id))),
    [focusMode, visibleIndicatorIds],
  );
  const visibleTopics = useMemo(
    () => TOPICS.filter(item => focusMode === 'all' || item.indicatorIds.some(id => visibleIndicatorIds.has(id))),
    [focusMode, visibleIndicatorIds],
  );

  const browseItems = useMemo(() => {
    if (browseType === 'policy') return visiblePolicies.map(item => asBrowserItem(item, 'policy'));
    if (browseType === 'indicator') return filteredIndicators.map(item => asBrowserItem(item, 'indicator'));
    return visibleTopics.map(item => asBrowserItem(item, 'topic'));
  }, [browseType, visiblePolicies, filteredIndicators, visibleTopics]);

  useEffect(() => {
    const exists = browseItems.some(item => item.id === selectedNode.id && item.type === selectedNode.type);
    if (!exists && browseItems[0]) {
      setSelectedNode({ type: browseType, id: browseItems[0].id });
    }
  }, [browseItems, browseType, selectedNode]);

  const selectedDetail = useMemo(() => {
    if (selectedNode.type === 'policy') return policyMap.get(selectedNode.id) || null;
    if (selectedNode.type === 'indicator') return indicatorMap.get(selectedNode.id) || null;
    return topicMap.get(selectedNode.id) || null;
  }, [selectedNode, policyMap, indicatorMap, topicMap]);

  const relationshipView = useMemo(() => {
    if (!selectedDetail) {
      return { upstream: [] as BrowserItem[], center: null as BrowserItem | null, downstream: [] as BrowserItem[], secondHop: [] as BrowserItem[] };
    }

    if (selectedNode.type === 'policy') {
      const indicators = ((selectedDetail as Policy).indicatorIds || []).map(id => indicatorMap.get(id)).filter(Boolean) as Indicator[];
      const topics = Array.from(new Map(indicators.flatMap(item => item.topicIds.map(id => [id, topicMap.get(id)]))).values()).filter(Boolean) as Topic[];
      return {
        upstream: [],
        center: asBrowserItem(selectedDetail as Policy, 'policy'),
        downstream: indicators.map(item => asBrowserItem(item, 'indicator')),
        secondHop: topics.map(item => asBrowserItem(item, 'topic')),
      };
    }

    if (selectedNode.type === 'indicator') {
      const policies = ((selectedDetail as Indicator).policyIds || []).map(id => policyMap.get(id)).filter(Boolean) as Policy[];
      const topics = ((selectedDetail as Indicator).topicIds || []).map(id => topicMap.get(id)).filter(Boolean) as Topic[];
      return {
        upstream: policies.map(item => asBrowserItem(item, 'policy')),
        center: asBrowserItem(selectedDetail as Indicator, 'indicator'),
        downstream: topics.map(item => asBrowserItem(item, 'topic')),
        secondHop: [],
      };
    }

    const indicators = ((selectedDetail as Topic).indicatorIds || []).map(id => indicatorMap.get(id)).filter(Boolean) as Indicator[];
    const policies = Array.from(new Map(indicators.flatMap(item => item.policyIds.map(id => [id, policyMap.get(id)]))).values()).filter(Boolean) as Policy[];
    return {
      upstream: indicators.map(item => asBrowserItem(item, 'indicator')),
      center: asBrowserItem(selectedDetail as Topic, 'topic'),
      downstream: [],
      secondHop: policies.map(item => asBrowserItem(item, 'policy')),
    };
  }, [selectedDetail, selectedNode, policyMap, indicatorMap, topicMap]);

  const summaryStats = useMemo(() => {
    const highRisk = INDICATORS.filter(item => item.risk === '高').length;
    const gaps = INDICATORS.filter(item => item.gap.includes('缺少') || item.gap.includes('不足')).length;
    return [
      { label: '政策条例', value: visiblePolicies.length, note: '纳入考评依据' },
      { label: '评价指标', value: filteredIndicators.length, note: `${highRisk} 项高风险` },
      { label: '监督主题', value: visibleTopics.length, note: '形成承接落点' },
      { label: '待补缺口', value: gaps, note: '建议补齐规则映射' },
    ];
  }, [visiblePolicies.length, filteredIndicators.length, visibleTopics.length]);

  const warningItems = useMemo(
    () =>
      filteredIndicators
        .filter(item => item.risk === '高' || item.gap.includes('缺少') || item.gap.includes('不足'))
        .map(item => ({ id: item.id, name: item.name, risk: item.risk, gap: item.gap })),
    [filteredIndicators],
  );

  useImperativeHandle(
    ref,
    function () {
      return {
        getVar: function (name: string) {
          if (name === 'focus_mode') return focusMode;
          if (name === 'browse_type') return browseType;
          if (name === 'selected_node') return getSelectedKey(selectedNode);
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
    [focusMode, browseType, selectedNode],
  );

  const onNavigate = (href: string) => {
    const correctedHref = href.startsWith('/pages/') ? href.replace('/pages/', '/prototypes/') : href;
    emitEvent('onNavigate', correctedHref);
    try {
      window.location.href = correctedHref;
    } catch (error) {
      console.error('导航失败:', error);
    }
  };

  const switchNode = (node: BrowserItem) => {
    setBrowseType(node.type);
    setSelectedNode({ type: node.type, id: node.id });
  };

  const renderMiniCard = (item: BrowserItem, accent?: string) => (
    <button
      key={`${item.type}-${item.id}`}
      type="button"
      onClick={() => switchNode(item)}
      className={`w-full rounded-2xl bg-white px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(37,99,235,0.14)] ${accent || ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[#0F172A]">{item.title}</div>
          <div className="mt-1 text-xs text-[#64748B]">{item.meta}</div>
        </div>
        {item.tone ? <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${item.tone}`}>{item.meta.split(' · ')[1]}</span> : <LinkOutlined className="text-[#94A3B8]" />}
      </div>
      <div className="mt-2 line-clamp-2 text-xs leading-5 text-[#475569]">{item.summary}</div>
    </button>
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F4F7FC_0%,#F8FAFC_100%)] text-[#0F172A]">
      <TopBar title={title} onNavigate={onNavigate} />

      <main className="mx-auto w-full max-w-[1720px] px-4 py-5 xl:px-6">
        <section className="rounded-[28px] bg-white/78 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-[760px]">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-medium text-[#1D4ED8]">
                <NodeIndexOutlined />
                关系浏览器
              </div>
              <h1 className="mt-3 text-[30px] font-semibold text-[#0F172A]">评价图谱</h1>
              <p className="mt-2 text-sm leading-6 text-[#475569]">
                不再铺整张大图谱，而是以当前焦点对象为中心展示直接关联和二跳承接。这样联动更明显，性能也更稳定。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {Object.entries(MODE_META).map(([key, meta]) => {
                const active = focusMode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      const nextMode = key as FocusMode;
                      setFocusMode(nextMode);
                      if (nextMode === 'risk') {
                        setBrowseType('indicator');
                        setSelectedNode({ type: 'indicator', id: 'i3' });
                      } else if (nextMode === 'gap') {
                        setBrowseType('indicator');
                        setSelectedNode({ type: 'indicator', id: 'i4' });
                      } else {
                        setBrowseType('policy');
                        setSelectedNode({ type: 'policy', id: 'p1' });
                      }
                    }}
                    className={`rounded-2xl px-4 py-3 text-left transition-all ${active ? 'bg-[#EFF6FF] text-[#1D4ED8] shadow-[0_14px_32px_rgba(59,130,246,0.14)]' : 'bg-white text-[#334155] shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]'}`}
                  >
                    <div className="text-sm font-semibold">{meta.label}</div>
                    <div className="mt-1 text-xs text-inherit/80">{meta.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summaryStats.map(item => (
              <div key={item.label} className="rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.92))] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <div className="text-xs uppercase tracking-[0.16em] text-[#64748B]">{item.label}</div>
                <div className="mt-2 text-[28px] font-semibold text-[#0F172A]">{item.value}</div>
                <div className="mt-1 text-xs text-[#64748B]">{item.note}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <aside className="rounded-[28px] bg-white/80 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-[#0F172A]">对象列表</div>
                <div className="mt-1 text-sm text-[#64748B]">先选对象，再看承接关系。</div>
              </div>
              <ControlOutlined className="text-[#64748B]" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-[#F8FAFC] p-1">
              {BROWSE_TABS.map(tab => {
                const active = browseType === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setBrowseType(tab.key);
                      const next = tab.key === 'policy' ? visiblePolicies[0] : tab.key === 'indicator' ? filteredIndicators[0] : visibleTopics[0];
                      if (next) setSelectedNode({ type: tab.key, id: next.id });
                    }}
                    className={`rounded-xl px-3 py-2 text-xs font-medium transition ${active ? 'bg-white text-[#1D4ED8] shadow-[0_8px_18px_rgba(15,23,42,0.06)]' : 'text-[#64748B] hover:bg-white/70 hover:text-[#334155]'}`}
                  >
                    <span className="mr-1">{tab.icon}</span>
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="evaluation-graph-scrollbar mt-4 max-h-[960px] space-y-3 overflow-y-auto pr-1">
              {browseItems.map(item => {
                const active = item.id === selectedNode.id && item.type === selectedNode.type;
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => setSelectedNode({ type: item.type, id: item.id })}
                    className={`w-full rounded-2xl px-4 py-3 text-left transition ${active ? 'bg-[#EFF6FF] shadow-[0_14px_30px_rgba(59,130,246,0.12)]' : 'bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]'}`}
                  >
                    <div className="text-sm font-semibold text-[#0F172A]">{item.title}</div>
                    <div className="mt-1 text-xs text-[#64748B]">{item.meta}</div>
                    <div className="mt-2 line-clamp-2 text-xs leading-5 text-[#475569]">{item.summary}</div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="space-y-5">
            <div className="rounded-[28px] bg-white/80 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-[#0F172A]">关系主视图</div>
                  <div className="mt-1 text-sm text-[#64748B]">当前焦点居中展示，上下游对象分列展开，联动路径更接近企查查式关系浏览。</div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#475569]">
                  <LinkOutlined />
                  当前焦点：{relationshipView.center?.title || '-'}
                </div>
              </div>

              <div className="mt-5 rounded-[30px] bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.35),transparent_30%),linear-gradient(180deg,#FBFDFF_0%,#F8FAFC_100%)] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]">
                <div className="grid gap-5 xl:grid-cols-[minmax(220px,1fr)_360px_minmax(220px,1fr)] xl:items-center">
                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                      {selectedNode.type === 'topic' ? '一级承接指标' : '上游依据'}
                    </div>
                    <div className="space-y-3">
                      {relationshipView.upstream.length > 0 ? relationshipView.upstream.map(item => renderMiniCard(item)) : (
                        <div className="rounded-2xl bg-white/70 px-4 py-6 text-sm text-[#94A3B8] shadow-[inset_0_0_0_1px_rgba(203,213,225,0.55)]">
                          当前焦点没有更上游的直接对象。
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="pointer-events-none absolute left-[-26px] top-1/2 hidden h-[2px] w-[26px] -translate-y-1/2 bg-[#93C5FD] xl:block" />
                    <div className="pointer-events-none absolute right-[-26px] top-1/2 hidden h-[2px] w-[26px] -translate-y-1/2 bg-[#93C5FD] xl:block" />
                    <div className="rounded-[28px] bg-[linear-gradient(180deg,#EFF6FF_0%,#FFFFFF_100%)] px-6 py-6 shadow-[0_22px_50px_rgba(37,99,235,0.15)]">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#1D4ED8] shadow-[0_6px_14px_rgba(15,23,42,0.05)]">
                        <NodeIndexOutlined />
                        中心焦点
                      </div>
                      <div className="mt-4 text-2xl font-semibold text-[#0F172A]">{relationshipView.center?.title}</div>
                      <div className="mt-2 text-sm text-[#475569]">{relationshipView.center?.meta}</div>
                      <div className="mt-4 rounded-2xl bg-white/90 p-4 text-sm leading-6 text-[#475569]">
                        {relationshipView.center?.summary}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                      {selectedNode.type === 'policy' ? '一级承接指标' : '下游主题'}
                    </div>
                    <div className="space-y-3">
                      {relationshipView.downstream.length > 0 ? relationshipView.downstream.map(item => renderMiniCard(item)) : (
                        <div className="rounded-2xl bg-white/70 px-4 py-6 text-sm text-[#94A3B8] shadow-[inset_0_0_0_1px_rgba(203,213,225,0.55)]">
                          当前焦点没有更下游的直接对象。
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <div className="text-sm font-semibold text-[#0F172A]">
                    {selectedNode.type === 'policy' ? '二跳关联主题' : selectedNode.type === 'topic' ? '二跳关联制度' : '扩展观察'}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {relationshipView.secondHop.length > 0 ? relationshipView.secondHop.map(item => (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        onClick={() => switchNode(item)}
                        className="rounded-full bg-[#F8FAFC] px-4 py-2 text-sm text-[#334155] transition hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:shadow-[0_8px_18px_rgba(59,130,246,0.12)]"
                      >
                        {item.title}
                      </button>
                    )) : (
                      <div className="text-sm text-[#94A3B8]">当前焦点已经足够直接，不需要再展开二跳关系。</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-white/80 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-[#0F172A]">重点提醒</div>
                  <div className="mt-1 text-sm text-[#64748B]">保留最需要处置的高风险与缺口对象，避免信息过载。</div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-medium text-[#C2410C]">
                  <WarningOutlined />
                  {warningItems.length} 项重点对象
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {warningItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setBrowseType('indicator');
                      setSelectedNode({ type: 'indicator', id: item.id });
                    }}
                    className="rounded-2xl bg-[#FFFBEB] px-4 py-4 text-left transition shadow-[0_10px_24px_rgba(245,158,11,0.08)] hover:shadow-[0_14px_30px_rgba(245,158,11,0.14)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-[#92400E]">{item.name}</div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${getRiskTone(item.risk)}`}>{item.risk}风险</span>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[#B45309]">{item.gap}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="rounded-[28px] bg-white/80 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-[#0F172A]">焦点详情</div>
                <div className="mt-1 text-sm text-[#64748B]">解释当前对象的角色、口径和治理动作。</div>
              </div>
              <ApartmentOutlined className="text-[#64748B]" />
            </div>

            <div className="evaluation-graph-scrollbar mt-5 max-h-[980px] space-y-5 overflow-y-auto pr-1">
              <div className="rounded-2xl bg-[#EFF6FF] p-4 shadow-[0_10px_24px_rgba(59,130,246,0.08)]">
                <div className="text-xs uppercase tracking-[0.18em] text-[#64748B]">
                  {selectedNode.type === 'policy' ? '政策条例' : selectedNode.type === 'indicator' ? '评价指标' : '监督主题'}
                </div>
                <div className="mt-2 text-xl font-semibold text-[#0F172A]">{relationshipView.center?.title}</div>
                <div className="mt-2 text-sm text-[#475569]">{relationshipView.center?.meta}</div>
              </div>

              {selectedNode.type === 'indicator' && selectedDetail && (
                <div className="rounded-2xl bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <div className="text-sm font-semibold text-[#0F172A]">指标口径</div>
                  <div className="mt-3 rounded-2xl bg-[#F8FAFC] p-3">
                    <div className="text-xs text-[#64748B]">得分</div>
                    <div className="mt-1 text-2xl font-semibold text-[#0F172A]">{(selectedDetail as Indicator).score} 分</div>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-[#475569]">计算公式：{(selectedDetail as Indicator).formula}</div>
                  <div className="mt-3 rounded-2xl bg-[#FFF7ED] p-3 text-sm leading-6 text-[#9A3412]">缺口说明：{(selectedDetail as Indicator).gap}</div>
                </div>
              )}

              <div className="rounded-2xl bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <div className="text-sm font-semibold text-[#0F172A]">关系摘要</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#F8FAFC] p-3">
                    <div className="text-xs text-[#64748B]">直接上游</div>
                    <div className="mt-1 text-xl font-semibold text-[#0F172A]">{relationshipView.upstream.length}</div>
                  </div>
                  <div className="rounded-2xl bg-[#F8FAFC] p-3">
                    <div className="text-xs text-[#64748B]">直接下游</div>
                    <div className="mt-1 text-xl font-semibold text-[#0F172A]">{relationshipView.downstream.length}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <div className="text-sm font-semibold text-[#0F172A]">建议动作</div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-[#475569]">
                  <div>1. 先确认当前焦点对象的直接承接链是否闭合，再判断是否需要扩展到二跳对象。</div>
                  <div>2. 高风险指标优先补齐制度依据和主责主题映射，避免口径漂移。</div>
                  <div>3. 对跨主题承接的对象，建议补充主责归口与整改时限字段。</div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <div className="text-sm font-semibold text-[#0F172A]">使用建议</div>
                <div className="mt-3 text-sm leading-6 text-[#475569]">
                  这个版本优先解决“看不清、联动弱、页面重”的问题。后续如果你要，我可以继续加上关系层级展开、对象搜索、路径高亮动画。
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
});

export default Component;
