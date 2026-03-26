/**
 * @name 财会监督2.0首页
 *
 * 参考资料：
 * - /src/pages/fiscal-supervision-home2/spec.md
 * - /src/themes/ufsp-sky/designToken.json
 * - /assets/libraries/tailwind-css
 * - /rules/development-standards.md
 */

import './style.css';
import '../../themes/ufsp-sky/globals.css';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { SearchOutlined, BellOutlined, BankOutlined } from '@ant-design/icons';
import type { Action, AxureHandle, AxureProps, ConfigItem, DataDesc, EventItem, KeyDesc } from '../../common/axure-types';
import { createEventEmitter, getConfigValue } from '../../common/axure-types';
import TopBar from '../../common/components/TopBar';

type ThirdLevelItem = {
  id: string;
  name: string;
  brief: string;
  link: string;
  tag: string;
};

type SecondLevelCategory = {
  id: string;
  name: string;
  items: ThirdLevelItem[];
};

type FirstLevelModule = {
  id: string;
  name: string;
  brief: string;
  categories: SecondLevelCategory[];
  icon: string;
  type: 'tree' | 'lightweight';
};

type Bulletin = { id: string; title: string; tag: string; time: string };
type ResourceLink = { key: string; name: string; count: number; unit: string; link: string; icon: string };
type QuickAction = { key: string; name: string; icon: string };
type InfoItem = { id: string; title: string; time: string; tag?: string };

const EVENT_LIST: EventItem[] = [
  { name: 'onNavigate', desc: '进入主题/资源/详情', payload: 'string' },
  { name: 'onQuickAction', desc: '点击轻操作', payload: 'string' },
];

const ACTION_LIST: Action[] = [{ name: 'refreshData', desc: '刷新首页数据', params: 'string' }];

const VAR_LIST: KeyDesc[] = [{ name: 'active_category', desc: '当前主题分组' }];

const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '系统标题', initialValue: '财会监督系统' },
  { type: 'checkbox', attributeId: 'showOverview', displayName: '显示全局摘要', initialValue: true },
];

const DATA_LIST: DataDesc[] = [];

const SPECIAL_SUPERVISION: FirstLevelModule = {
  id: 'special',
  name: '专项监督',
  brief: '问题整改，闭环管理',
  icon: '🔧',
  type: 'tree',
  categories: [
    {
      id: 'key_area_rectify',
      name: '重点领域整改',
      items: [
        { id: 'key_1', name: '地方政府债务', brief: '地方政府债务管理与风险防控', link: '/pages/topic-workbench2?topic=yearly/local-debt&category=special', tag: '债' },
        { id: 'key_2', name: '高标准农田建设资金使用管理', brief: '高标准农田建设资金使用管理', link: '/pages/topic-workbench2?topic=yearly/farmland-fund&category=special', tag: '农' },
        { id: 'key_3', name: '行政事业单位国有资产处置管理', brief: '行政事业单位国有资产处置管理', link: '/pages/topic-workbench2?topic=yearly/state-assets&category=special', tag: '资' },
        { id: 'key_4', name: '减税降费政策落实', brief: '减税降费政策落实情况监督', link: '/pages/topic-workbench2?topic=yearly/tax-reduction&category=special', tag: '税' },
        { id: 'key_5', name: '违规返还财政收入', brief: '违规返还财政收入问题整改', link: '/pages/topic-workbench2?topic=yearly/refund-revenue&category=special', tag: '返' },
        { id: 'key_6', name: '基层“三保”', brief: '基层三保资金保障与使用监督', link: '/pages/topic-workbench2?topic=yearly/sanbao-basic&category=special', tag: '保' },
        { id: 'key_7', name: '财政暂付款管理', brief: '财政暂付款清理与管理监督', link: '/pages/topic-workbench2?topic=yearly/temporary-payment&category=special', tag: '暂' },
        { id: 'key_8', name: '财政收入虚收空转', brief: '财政收入虚收空转问题整改', link: '/pages/topic-workbench2?topic=yearly/false-revenue&category=special', tag: '虚' },
      ]
    },
    {
      id: 'special_check',
      name: '专项检查',
      items: [
        { id: 'check_1', name: '会计信息质量检查', brief: '企业会计信息质量监督检查', link: '/pages/topic-workbench2?topic=yearly/state-assets&category=special', tag: '会' },
        { id: 'check_2', name: '执业质量检查', brief: '会计师事务所执业质量检查', link: '/pages/topic-workbench2?topic=yearly/tax-reduction&category=special', tag: '执' },
      ]
    },
    {
      id: 'audit_rectify',
      name: '审计问题整改',
      items: [
        { id: 'audit_2', name: '专项资金审计', brief: '审计发现问题整改事项2', link: '/pages/topic-workbench2?topic=audit&category=special', tag: '资' },
      ]
    },
    {
      id: 'inspection_rectify',
      name: '巡视问题整改',
      items: [
        { id: 'inspect_1', name: '省委巡视整改项', brief: '巡视发现问题整改事项1', link: '/pages/topic-workbench2?topic=inspect&category=special', tag: '巡' },
        { id: 'inspect_2', name: '市级巡察反馈项', brief: '巡视发现问题整改事项2', link: '/pages/topic-workbench2?topic=inspect&category=special', tag: '察' },
        { id: 'inspect_3', name: '其他巡视整改项', brief: '其他巡视发现问题整改', link: '/pages/topic-workbench2?topic=inspect&category=special', tag: '其' },
      ]
    },
  ]
};

const DAILY_SUPERVISION: FirstLevelModule = {
  id: 'daily',
  name: '日常监督',
  brief: '持续监控，及时预警',
  icon: '📊',
  type: 'tree',
  categories: [
    {
      id: 'business_monitor',
      name: '业务监控',
      items: [
        { id: 'b_1', name: '预算执行监控', brief: '预算执行与偏差监控', link: '/pages/topic-workbench2?topic=execution&category=daily', tag: '执' },
        { id: 'b_2', name: '预算编制监控', brief: '预算编制合规性监控', link: '/pages/topic-workbench2?topic=unitfund&category=daily', tag: '编' },
        { id: 'b_3', name: '指标管理监控', brief: '预算指标分配与下达监控', link: '/pages/topic-workbench2?topic=treasury&category=daily', tag: '指' },
        { id: 'b_4', name: '资产管理监控', brief: '资产配置与处置合规监控', link: '/pages/topic-workbench2?topic=assets&category=daily', tag: '资' },
        { id: 'b_5', name: '会计核算监控', brief: '会计核算规范与差错监控', link: '/pages/topic-workbench2?topic=accounting&category=daily', tag: '会' },
      ]
    },
    {
      id: 'special_monitor',
      name: '专题监控',
      items: [
        { id: 'm_1', name: '工资监控', brief: '薪酬发放合规监督', link: '/pages/topic-workbench2?topic=salary&category=daily', tag: '薪' },
        { id: 'm_2', name: '三保监控', brief: '兜底资金合规与执行', link: '/pages/topic-workbench2?topic=sanbao&category=daily', tag: '保' },
        { id: 'm_3', name: '三公监控', brief: '三公经费合规监督', link: '/pages/topic-workbench2?topic=sangong&category=daily', tag: '公' },
        { id: 'm_4', name: '一卡通监控', brief: '资金发放与到账核验', link: '/pages/topic-workbench2?topic=yikatong&category=daily', tag: '卡' },
      ]
    }
  ]
};

const EVALUATION_MODULE: FirstLevelModule = {
  id: 'evaluation',
  name: '财会考评',
  brief: '工作评价，持续改进',
  icon: '📋',
  type: 'lightweight',
  categories: [
    {
      id: 'eval_main',
      name: '核心入口',
      items: [
        { id: 'e_1', name: '财会监督考评', brief: '财会监督工作成效评价', link: '/pages/topic-workbench2?topic=eval-finance&category=evaluation', tag: '评' },
        { id: 'e_2', name: '财政内控考评', brief: '财政内控体系运行考评', link: '/pages/topic-workbench2?topic=eval-internal&category=evaluation', tag: '控' },
      ]
    }
  ]
};

const BULLETINS: Bulletin[] = [
  { id: 'b1', title: '关于开展2026年预算执行专项监督的通知', tag: '公告', time: '2026-03-02' },
  { id: 'b2', title: '财政票据管理规范（修订稿）征求意见', tag: '共享', time: '2026-02-27' },
  { id: 'b3', title: '内控自查表（最新版）', tag: '下载', time: '2026-02-21' },
];

const RESOURCES: ResourceLink[] = [
  { key: 'law', name: '法制库', count: 128, unit: '项', link: '/resources/law', icon: '📜' },
  { key: 'rule', name: '规则库', count: 76, unit: '项', link: '/resources/rule', icon: '📘' },
  { key: 'org', name: '机构库', count: 54, unit: '个', link: '/resources/org', icon: '🏢' },
  { key: 'talent', name: '人才库', count: 212, unit: '人', link: '/resources/talent', icon: '👤' },
  { key: 'case', name: '案例库', count: 63, unit: '个', link: '/resources/case', icon: '🧰' },
  { key: 'archive', name: '档案 / 数据', count: 342, unit: '条', link: '/resources/archive', icon: '🗂' },
];

const QUICK_ACTIONS: QuickAction[] = [
  { key: 'report_issue', name: '问题填报', icon: '📝' },
  { key: 'rectify_review', name: '整改审核', icon: '✅' },
  { key: 'view_alerts', name: '查看预警', icon: '🚨' },
  { key: 'adhoc_analysis', name: '即席分析', icon: '📊' },
];

const INFO_DYNAMIC: InfoItem[] = [
  { id: 'd1', title: '财政监督专题调研完成阶段评审', time: '03-02' },
  { id: 'd2', title: '全市预算执行监督工作例会召开', time: '02-26' },
];
const INFO_POLICY: InfoItem[] = [
  { id: 'p1', title: '财政票据管理规范（修订稿）', time: '03-18' },
  { id: 'p2', title: '政府采购管理办法（征求意见）', time: '03-17' },
  { id: 'p3', title: '预算编制管理办法（修订）', time: '03-16' },
  { id: 'p4', title: '财政资金管理暂行办法', time: '03-05' },
  { id: 'p5', title: '国有资产管理规定', time: '02-28' },
  { id: 'p6', title: '政府购买服务管理办法', time: '02-20' },
  { id: 'p7', title: '财政监督检查工作规程', time: '02-15' },
  { id: 'p8', title: '预算绩效管理办法', time: '02-10' },
];
const INFO_ANNOUNCE: InfoItem[] = [
  { id: 'a1', title: '关于开展预算执行专项监督的通知', time: '03-19' },
  { id: 'a2', title: '关于规范差旅报销的工作提示', time: '03-18' },
  { id: 'a3', title: '关于做好2026年预算编制工作的通知', time: '03-17' },
  { id: 'a4', title: '关于开展财政资金使用情况检查的通知', time: '03-10' },
  { id: 'a5', title: '关于加强政府债务管理的通知', time: '03-05' },
  { id: 'a6', title: '关于做好2025年度财务决算工作的通知', time: '02-25' },
  { id: 'a7', title: '关于开展内部控制评价工作的通知', time: '02-20' },
  { id: 'a8', title: '关于加强国有资产管理的通知', time: '02-15' },
];
const INFO_SHARE: InfoItem[] = [
  { id: 's1', title: '内控自查表（最新版）', time: '03-18' },
  { id: 's2', title: '监督案例模板（下载）', time: '03-15' },
  { id: 's3', title: '财政监督检查工作指南', time: '03-10' },
  { id: 's4', title: '预算编制参考模板', time: '03-05' },
  { id: 's5', title: '财务报表分析方法', time: '02-25' },
  { id: 's6', title: '政府采购操作流程', time: '02-20' },
  { id: 's7', title: '国有资产处置流程', time: '02-15' },
  { id: 's8', title: '财政资金申请指南', time: '02-10' },
];
const INFO_DOWNLOADS: InfoItem[] = [
  { id: 'dwn1', title: '内控自查表（最新版）', time: '03-17' },
  { id: 'dwn2', title: '预算执行监控口径（示例）', time: '03-15' },
  { id: 'dwn3', title: '财务报表模板（2026版）', time: '03-10' },
  { id: 'dwn4', title: '政府采购文件模板', time: '03-05' },
  { id: 'dwn5', title: '国有资产登记表格', time: '02-25' },
  { id: 'dwn6', title: '财政资金申请表', time: '02-20' },
  { id: 'dwn7', title: '预算编制软件操作指南', time: '02-15' },
  { id: 'dwn8', title: '财务审计工作底稿模板', time: '02-10' },
];
const INFO_CASES: InfoItem[] = [
  { id: 'cs1', title: '监督案例模板（下载）', time: '03-16' },
  { id: 'cs2', title: '违规返还财政收入典型案例', time: '03-10' },
  { id: 'cs3', title: '预算编制违规典型案例', time: '03-05' },
  { id: 'cs4', title: '国有资产流失典型案例', time: '02-25' },
  { id: 'cs5', title: '政府采购违规典型案例', time: '02-20' },
  { id: 'cs6', title: '财政资金挪用典型案例', time: '02-15' },
  { id: 'cs7', title: '预算执行违规典型案例', time: '02-10' },
  { id: 'cs8', title: '财务造假典型案例', time: '02-05' },
];

const Component = forwardRef<AxureHandle, AxureProps>(function Component(innerProps, ref) {
  const configSource = innerProps && typeof innerProps.config === 'object' && innerProps.config ? innerProps.config : {};
  const onEventHandler = typeof innerProps?.onEvent === 'function' ? innerProps.onEvent : undefined;
  const emitEvent = useMemo(() => createEventEmitter(onEventHandler), [onEventHandler]);

  const title = getConfigValue<string>(configSource, 'title', '财会监督系统');
  const showOverview = getConfigValue<boolean>(configSource, 'showOverview', true);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 500);
    return () => window.clearTimeout(t);
  }, []);

  useImperativeHandle(
    ref,
    function () {
      return {
        getVar: function (name: string) {
          if (name === 'active_category') return 'daily';
          return undefined;
        },
        fireAction: function (name: string) {
          if (name === 'refreshData') {
            setLoading(true);
            const t = window.setTimeout(() => setLoading(false), 600);
            return () => window.clearTimeout(t);
          }
          return undefined;
        },
        eventList: EVENT_LIST,
        actionList: ACTION_LIST,
        varList: VAR_LIST,
        configList: CONFIG_LIST,
        dataList: DATA_LIST,
      };
    },
    [],
  );

  const overview = { topics: 13, issues: 842, rectifyTasks: 42, closedTasks: 716, rules: 128, coveredBusiness: 56, alerts: 18, evalTasks: 12 };
  const indicators: Array<{ k: string; v: number | string; sub: string; color: string }> = [
    { k: '监督主题数', v: overview.topics, sub: '覆盖3类主题', color: 'text-[#1456B8]' },
    { k: '专项问题总数', v: overview.issues, sub: '本年累计', color: 'text-slate-900' },
    { k: '专项整改任务', v: overview.rectifyTasks, sub: '当前进行中', color: 'text-[#F59E0B]' },
    { k: '已销号任务', v: overview.closedTasks, sub: '本年度完成', color: 'text-[#16A34A]' },
    { k: '当前规则总数', v: overview.rules, sub: '规则库现有', color: 'text-[#0F3D8A]' },
    { k: '规则覆盖业务数', v: overview.coveredBusiness, sub: '已覆盖业务', color: 'text-[#2563EB]' },
    { k: '当前预警事项', v: overview.alerts, sub: '待跟踪处理', color: 'text-[#DC2626]' },
    { k: '当前考评任务', v: overview.evalTasks, sub: '当前任务数', color: 'text-[#1456B8]' },
    // 预留指标位（横向滑动查看更多）
    { k: '本月新增问题', v: 27, sub: '当月', color: 'text-slate-900' },
    { k: '已办结问题', v: 58, sub: '当月', color: 'text-[#16A34A]' },
    { k: '逾期整改项', v: 12, sub: '需加急', color: 'text-[#DC2626]' },
    { k: '覆盖单位数', v: 124, sub: '全局覆盖', color: 'text-[#1456B8]' },
  ];

  const indicatorPages = useMemo(() => {
    const pages: Array<typeof indicators> = [];
    for (let i = 0; i < indicators.length; i += 8) {
      pages.push(indicators.slice(i, i + 8));
    }
    return pages;
  }, [indicators]);

  const handleNavigate = (key: string) => {
    emitEvent('onNavigate', key);
    try {
      if (key.startsWith('/pages/')) window.location.href = key;
    } catch {}
  };
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const handleCloseExpand = () => setExpandedSection(null);

    const [favorites, setFavorites] = useState<Record<string, boolean>>({
      'check_1': true,
      'audit_1': true,
      'm_1': true,
      'e_1': true,
    });

    const toggleFavorite = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const [infoTab, setInfoTab] = useState<'announce' | 'policy' | 'downloads' | 'cases'>('announce');
    const currentInfoList = useMemo(() => {
      let data: InfoItem[] = [];
      if (infoTab === 'policy') data = INFO_POLICY;
      if (infoTab === 'announce') data = INFO_ANNOUNCE;
      if (infoTab === 'downloads') data = INFO_DOWNLOADS;
      if (infoTab === 'cases') data = INFO_SHARE;
      
      // 按时间排序（假设时间格式为 MM-DD）
      const sortedData = data.sort((a, b) => {
        const [aMonth, aDay] = a.time.split('-').map(Number);
        const [bMonth, bDay] = b.time.split('-').map(Number);
        if (aMonth !== bMonth) return bMonth - aMonth;
        return bDay - aDay;
      });
      
      // 只取前8条
      return sortedData.slice(0, 8);
    }, [infoTab]);

    const [openModal, setOpenModal] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 space-y-6">
        <div className="h-16 bg-white rounded animate-pulse" />
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-96 bg-white rounded animate-pulse" />
          <div className="h-96 bg-white rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const renderModule = (module: FirstLevelModule) => {
    const isTree = module.type === 'tree';
    const contentHeight = module.id === 'special' || module.id === 'daily' ? 'h-[380px]' : 'h-auto';

    const getBlockSpan = (itemCount: number) => {
      if (itemCount <= 1) return 1;
      if (itemCount === 2) return 2;
      if (itemCount === 3) return 3;
      return 3;
    };

    const getColSpanClass = (span: number) => {
      if (span === 1) return 'col-span-1';
      if (span === 2) return 'col-span-2';
      if (span === 3) return 'col-span-3';
      return 'col-span-3';
    };

    const getInnerColsClass = (span: number) => {
      if (span === 1) return 'grid-cols-1';
      if (span === 2) return 'grid-cols-2';
      if (span === 3) return 'grid-cols-3';
      return 'grid-cols-3';
    };

    return (
      <section className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-[#0F3D8A] flex items-center gap-2">
            <span className="w-1 h-5 bg-[#0F3D8A] rounded-full" />
            {module.name}
          </h2>
          {module.id !== 'evaluation' && (
            <div className="relative group">
              <button
                type="button"
                className="text-xs text-[#1456B8] flex items-center gap-1"
                onClick={() => setExpandedSection(module.id)}
              >
                全部
                <span className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                  ›
                </span>
              </button>
            </div>
          )}
        </div>

        <div className={`${contentHeight} overflow-y-auto custom-scrollbar`}>
          {isTree ? (
            <div className="grid grid-cols-3 gap-x-4 gap-y-8 p-1.5">
              {module.categories.map(category => {
                const sortedItems = [...category.items].sort(
                  (a, b) => (favorites[b.id] ? 1 : 0) - (favorites[a.id] ? 1 : 0),
                );
                const span = getBlockSpan(sortedItems.length);

                return (
                  <div key={category.id} className={`${getColSpanClass(span)} space-y-3`}>
                    <div className="flex items-center gap-2">
                      <div className="w-0.5 h-3 bg-[#0F3D8A]/25 rounded-full" />
                      <div className="text-[12px] font-bold text-slate-500 tracking-wide">
                        {category.name}
                      </div>
                    </div>
                    <div className={`grid ${getInnerColsClass(span)} gap-2.5`}>
                      {sortedItems.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavigate(item.link)}
                          className="group text-left p-4 rounded-xl bg-[#F9FBFF] hover:bg-[#F0F5FF] transition-all relative shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        >
                          <div
                            className={`absolute top-2.5 right-2.5 z-10 transition-opacity ${favorites[item.id] ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            onClick={(e) => toggleFavorite(item.id, e)}
                          >
                            <span
                              className={`text-[14px] ${favorites[item.id] ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}
                            >
                              {favorites[item.id] ? '★' : '☆'}
                            </span>
                          </div>
                          <span className="absolute bottom-3 right-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                            ›
                          </span>
                          <div className="flex items-center gap-3 pr-5">
                            <div className="w-7 h-7 rounded-lg bg-[#F0F5FF] group-hover:bg-[#1456B8] flex items-center justify-center text-xs font-medium text-slate-500 group-hover:text-white transition-colors">
                                {item.tag}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium text-[#334155] group-hover:text-[#1456B8] transition-colors truncate">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1.5 line-clamp-1">
                                {item.brief}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Lightweight Template - Main Entry Cards */
            <div className="grid grid-cols-2 gap-2 py-2 p-1.5">
              {module.categories.flatMap(c => c.items).map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.link)}
                  className="group text-left p-2 rounded-lg bg-[#F9FBFF] hover:bg-[#EEF5FF] transition-all relative shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-sm group-hover:scale-110 transition-transform flex-shrink-0">
                      {module.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-[13px] font-medium text-[#334155] group-hover:text-[#1456B8] transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-1 flex-1">
                          {item.brief}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                        ›
                      </span>
                      <div 
                        className={`transition-opacity ${favorites[item.id] ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        onClick={(e) => toggleFavorite(item.id, e)}
                      >
                        <span className={`text-[14px] ${favorites[item.id] ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}>
                          {favorites[item.id] ? '★' : '☆'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F8FF] text-gray-900 flex flex-col">
      <TopBar title={title} onNavigate={handleNavigate} />

      <main className="flex-1 max-w-[1760px] w-full mx-auto px-8 py-4">
        <div className="space-y-5">
          {/* 顶部左右并排：左全局概览 / 右公共协同 */}
          <div className="grid grid-cols-12 gap-3">
            {/* 全局监督概览（左） */}
            <section className="col-span-12 xl:col-span-4 bg-white rounded-2xl shadow-sm p-4" style={{ height: '245px' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="relative group flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#0F3D8A] flex items-center gap-2">
                    <span className="w-1 h-5 bg-[#0F3D8A] rounded-full" />
                    全局概览
                  </h2>
                  <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white border border-slate-200 shadow rounded-md px-3 py-2 text-xs text-slate-600 whitespace-nowrap z-10">
                    展示全局监督关键指标；支持横向滑动查看更多指标
                  </div>
                </div>

              </div>
              <div className="flex overflow-x-auto gap-4 snap-x pr-1 custom-scrollbar mt-3" style={{ height: '176.25px' }}>
                {indicatorPages.map((page, idx) => (
                  <div key={`kpi-page-${idx}`} className="shrink-0 w-full grid grid-cols-4 grid-rows-2 gap-x-2.5 gap-y-3.5 snap-start p-1.5">
                    {page.map((item) => (
                      <div
                        key={`${item.k}-${item.sub}`}
                        className="h-20 rounded-xl bg-[#F9FBFF] shadow-sm p-2.5 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all"
                      >
                        <div className="text-[11px] text-slate-500 leading-4">{item.k}</div>
                        <div className={`text-lg font-extrabold leading-5 ${item.color}`}>{item.v}</div>
                        <div className="text-[10px] text-slate-400 leading-4">{item.sub}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            {/* 公共协同（右） */}
            <section className="col-span-12 xl:col-span-8 bg-white rounded-2xl shadow-sm p-4 pb-2">
              <div className="relative flex items-center mb-3">
                <div className="relative group flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#0F3D8A] flex items-center gap-2">
                    <span className="w-1 h-5 bg-[#0F3D8A] rounded-full" />
                    公共协同
                  </h2>
                  <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white border border-slate-200 shadow rounded-md px-3 py-2 text-xs text-slate-600 whitespace-nowrap z-10">
                    跨部门信息协同：监督动态、政策发布、公告、资料与案例
                  </div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-0 hidden md:flex items-center gap-1 bg-[#F3F6FF] rounded-full p-1 h-7">
                  {
                    [
                      { key: 'announce', label: '消息公告' },
                      { key: 'policy', label: '政策制度' },
                      { key: 'downloads', label: '常用资料' },
                      { key: 'cases', label: '监督案例' },
                    ].map((t, idx) => (
                      <button
                        key={`${t.key}-${idx}`}
                        type="button"
                        onClick={() => setInfoTab(t.key as any)}
                        className={`h-4.5 px-3 rounded-full text-xs ${
                          infoTab === (t.key as any)
                            ? 'bg-white text-[#0F3D8A] shadow-sm'
                            : 'text-slate-600 hover:text-[#0F3D8A]'
                        }`}
                        style={{
                          lineHeight: '14px',
                          fontSize: '11px'
                        }}
                      >
                        {t.label}
                      </button>
                    ))
                  }
                </div>
                <div className="relative group ml-auto">
                  <button
                    type="button"
                    className="text-xs text-[#1456B8] flex items-center gap-1"
                    onClick={() => handleNavigate('/info')}
                  >
                    全部
                    <span className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                      ›
                    </span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 overflow-y-auto custom-scrollbar p-1.5" style={{ height: '180px' }}>
                <div className="divide-y divide-slate-100">
                  {currentInfoList.map(i => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() =>
                        handleNavigate(infoTab === 'downloads' ? `/download/${i.id}` : `/info/${infoTab}/${i.id}`)
                      }
                      className="group w-full text-left py-3 hover:bg-slate-50 rounded-lg px-2 -mx-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F1F5FF] text-[#1456B8] ">
                            {infoTab === 'policy'
                              ? '政策'
                              : infoTab === 'announce'
                              ? '公告'
                              : infoTab === 'downloads'
                              ? '资料'
                              : infoTab === 'cases'
                              ? '案例'
                              : '信息'}
                          </span>
                          <span
                            className={`text-[11px] text-slate-800 leading-4 line-clamp-1 ${
                              infoTab === 'downloads' ? 'group-hover:underline underline-offset-2 decoration-[#1456B8]' : ''
                            }`}
                          >
                            {i.title}
                            {infoTab === 'downloads' ? (
                              <span className="ml-1 text-[#1456B8] opacity-0 group-hover:opacity-100">⇩</span>
                            ) : null}
                            {(() => {
                              // 假设当前月份为3月，判断是否是3天内的数据
                              const [month, day] = i.time.split('-').map(Number);
                              if (month === 3 && day >= 16) {
                                return <span className="ml-1 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">new</span>;
                              }
                              return null;
                            })()}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap">{i.time}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="divide-y divide-slate-100 hidden md:block">
                  {currentInfoList.map(i => (
                    <button
                      key={`${i.id}-col2`}
                      type="button"
                      onClick={() =>
                        handleNavigate(infoTab === 'downloads' ? `/download/${i.id}` : `/info/${infoTab}/${i.id}`)
                      }
                      className="group w-full text-left py-3 hover:bg-slate-50 rounded-lg px-2 -mx-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F1F5FF] text-[#1456B8] ">
                            {infoTab === 'policy'
                              ? '政策'
                              : infoTab === 'announce'
                              ? '公告'
                              : infoTab === 'downloads'
                              ? '资料'
                              : infoTab === 'cases'
                              ? '案例'
                              : '信息'}
                          </span>
                          <span
                            className={`text-[11px] text-slate-800 leading-4 line-clamp-1 ${
                              infoTab === 'downloads' ? 'group-hover:underline underline-offset-2 decoration-[#1456B8]' : ''
                            }`}
                          >
                            {i.title}
                            {infoTab === 'downloads' ? (
                              <span className="ml-1 text-[#1456B8] opacity-0 group-hover:opacity-100">⇩</span>
                            ) : null}
                            {(() => {
                              // 假设当前月份为3月，判断是否是3天内的数据
                              const [month, day] = i.time.split('-').map(Number);
                              if (month === 3 && day >= 16) {
                                return <span className="ml-1 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">new</span>;
                              }
                              return null;
                            })()}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap">{i.time}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* C. 主题导航区 - 2+1 布局 */}
          <div className="grid grid-cols-12 gap-4 mb-6">
            {/* 第一行：专项监督 + 日常监督 */}
            <div className="col-span-12 lg:col-span-6">
              {renderModule(SPECIAL_SUPERVISION)}
            </div>
            <div className="col-span-12 lg:col-span-6">
              {renderModule(DAILY_SUPERVISION)}
            </div>

            {/* 第二行：财会考评（全宽） */}
            <div className="col-span-12">
              {renderModule(EVALUATION_MODULE)}
            </div>
          </div>

          {/* D. 基础支撑 */}
          <section className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="relative group flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#0F3D8A] flex items-center gap-2"><span className="w-1 h-5 bg-[#0F3D8A] rounded-full" />基础支撑</h2>
                <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white shadow rounded-md px-3 py-2 text-xs text-slate-600 whitespace-nowrap z-10">
                  法规/规则/机构/人才/案例/档案等基础资源入口
                </div>
              </div>

            </div>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12">
                <div className="grid grid-cols-6 gap-2">
                  {RESOURCES.map(r => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => handleNavigate(r.link)}
                      className="group bg-[#F9FBFF] hover:bg-[#EEF5FF] transition-all relative shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-lg"
                    >
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-sm">
                            {r.icon}
                          </span>
                          <span className="text-[13px] text-[#334155] group-hover:text-[#1456B8] transition-colors">{r.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-[#1456B8]">{r.count}{r.unit}</span>
                          <span className="text-[11px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">›</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
          <p>© 2026 财会监督管理中心</p>
          <div className="flex items-center gap-4 mt-2 md:mt-0">
            <span className="hover:text-[#1E40AF] cursor-pointer" onClick={() => handleNavigate('/support')}>
              技术支持
            </span>
            <span className="w-px h-3 bg-gray-300" />
            <span className="hover:text-[#1E40AF] cursor-pointer" onClick={() => handleNavigate('/contact')}>
              联系我们
            </span>
            <span className="w-px h-3 bg-gray-300" />
            <span>v2.0</span>
          </div>
        </div>
      </footer>

      {/* 展开更多弹层 - 全部页面 */}
      {expandedSection && (expandedSection === 'special' || expandedSection === 'daily') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 transition-opacity" onClick={handleCloseExpand}></div>
          <div 
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
            style={{ zIndex: 1001 }}
          >
            {(() => {
              const module = expandedSection === 'daily' ? DAILY_SUPERVISION : 
                             expandedSection === 'special' ? SPECIAL_SUPERVISION : 
                             EVALUATION_MODULE;
              const isTree = module.type === 'tree';

              return (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-[#0F3D8A]">
                      {module.name}
                    </h3>
                    <button
                      type="button"
                      className="text-slate-500 hover:text-slate-700"
                      onClick={handleCloseExpand}
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* Modal Content - High-Density Grid */}
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {isTree ? (
                      <div className="space-y-6">
                        {module.categories.map(category => {
                          const sortedItems = [...category.items].sort(
                            (a, b) => (favorites[b.id] ? 1 : 0) - (favorites[a.id] ? 1 : 0)
                          );
                          
                          return (
                            <div key={category.id} className="space-y-3">
                              {/* 分组标题 */}
                              <div className="flex items-center gap-2">
                                <div className="w-0.5 h-3 bg-[#0F3D8A]/25 rounded-full" />
                                <div className="text-[12px] font-bold text-slate-500 tracking-wide">
                                  {category.name}
                                </div>
                              </div>
                              
                              {/* 紧凑卡片网格 */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {sortedItems.map(item => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      handleNavigate(item.link);
                                      handleCloseExpand();
                                    }}
                                    className="group text-left p-3 rounded-lg bg-[#F9FBFF] hover:bg-[#F0F5FF] transition-all relative shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                  >
                                    <div
                                      className={`absolute top-2 right-2 z-10 transition-opacity ${favorites[item.id] ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                      onClick={(e) => toggleFavorite(item.id, e)}
                                    >
                                      <span
                                        className={`text-[14px] ${favorites[item.id] ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}
                                      >
                                        {favorites[item.id] ? '★' : '☆'}
                                      </span>
                                    </div>
                                    <span className="absolute bottom-2 right-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                                      ›
                                    </span>
                                    <div className="flex items-center gap-2 pr-4">
                                      <div className="w-6 h-6 rounded-lg bg-[#F0F5FF] group-hover:bg-[#1456B8] flex items-center justify-center text-xs font-medium text-slate-500 group-hover:text-white transition-colors">
                                        {item.tag}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-[12px] font-medium text-[#334155] group-hover:text-[#1456B8] transition-colors truncate">
                                          {item.name}
                                        </div>
                                        <div className="text-[9px] text-slate-400 mt-1 line-clamp-1">
                                          {item.brief}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
});

export default Component;
