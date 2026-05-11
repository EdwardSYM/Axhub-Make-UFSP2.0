/**
 * @name 日常监督功能列表页
 *
 */
import '../../themes/ufsp-sky/globals.css';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import TopBar from '../../common/components/TopBar';
import type { AxureHandle, AxureProps, ConfigItem, EventItem, KeyDesc } from '../../common/axure-types';
import { createEventEmitter, getConfigValue } from '../../common/axure-types';

type NavActive = 'home' | 'daily' | 'special' | 'policy' | 'evaluation' | 'support';

const EVENT_LIST: EventItem[] = [{ name: 'onNavigate', desc: '页面内导航', payload: 'string' }];
const ACTION_LIST: Array<{ name: string; desc: string; params?: string }> = [];
const VAR_LIST: KeyDesc[] = [
  { name: 'active_category', desc: '当前激活的顶栏分类' },
  { name: 'topic_key', desc: '当前主题 key' },
  { name: 'feature_key', desc: '当前功能 key' },
];
const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '系统标题', initialValue: '财会监督系统' },
  { type: 'input', attributeId: 'topic_name', displayName: '主题名称', initialValue: '主题工作台' },
];

function useQuery() {
  const [q, setQ] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search || '');
      const o: Record<string, string> = {};
      p.forEach((v, k) => {
        o[k] = v;
      });
      setQ(o);
    } catch (error) {
      console.error('解析URL参数失败:', error);
      setQ({});
    }
  }, []);
  return q;
}

const FEATURES = [
  { 
    key: 'warn_issue', 
    name: '预警下发', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ) 
  },
  { 
    key: 'manual_check', 
    name: '人工抽查', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 12 2 2 4-4"/>
        <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
        <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
        <path d="M3 12c0 4.4 3.4 8 7.5 8s7.5-3.6 7.5-8"/>
      </svg>
    ) 
  },
  { 
    key: 'doubt_report', 
    name: '疑点填报', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ) 
  },
  { 
    key: 'doubt_confirm', 
    name: '疑点认定', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ) 
  },
  { 
    key: 'rectify_report', 
    name: '整改填报', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ) 
  },
  { 
    key: 'rectify_confirm', 
    name: '整改确认', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ) 
  },
  { 
    key: 'system_check', 
    name: '系统抽查', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
    ) 
  },
] as const;

const Component = forwardRef<AxureHandle, AxureProps>(function Component(innerProps, ref) {
  const configSource = innerProps && typeof innerProps.config === 'object' && innerProps.config ? innerProps.config : {};
  const onEventHandler = typeof innerProps?.onEvent === 'function' ? innerProps.onEvent : undefined;
  const emitEvent = useMemo(() => createEventEmitter(onEventHandler), [onEventHandler]);
  const query = useQuery();

  const title = getConfigValue<string>(configSource, 'title', '财会监督系统');
  const topicNameFromConfig = getConfigValue<string>(configSource, 'topic_name', '主题工作台');
  const topicKey = String(query.topic || '').toLowerCase();
  const categoryFromQuery = String(query.category || '').toLowerCase();
  const featureKey = String(query.feature || 'warn_issue');

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
      : 'daily';

  const topicName = topicKey === 'sanbao' ? '基层“三保”' : topicNameFromConfig;
  const activeFeature = FEATURES.find(i => i.key === featureKey);

  useImperativeHandle(
    ref,
    function () {
      return {
        getVar: function (name: string) {
          if (name === 'active_category') return activeCategory;
          if (name === 'topic_key') return String(query.topic || '');
          if (name === 'feature_key') return String(query.feature || '');
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
    } catch (error) {
      console.error('导航失败:', error);
    }
  };

  const rawTopic = String(query.topic || 'business_monitor');
  const rawCategory = String(query.category || 'daily').toLowerCase();
  const topicParam = encodeURIComponent(rawTopic);
  const categoryParam = encodeURIComponent(rawCategory);
  const dailyTopicWorkbench = new Set(['salary', 'sanbao', 'sangong', 'yikatong', 'zhengcai', 'special_monitor']);
  const workbenchBase =
    rawCategory === 'daily'
      ? dailyTopicWorkbench.has(rawTopic.toLowerCase())
        ? '/prototypes/richang-zhuanti-workbench'
        : '/prototypes/richang-yewu-workbench'
      : '/prototypes/topic-workbench2';
  const workbenchHref = `${workbenchBase}?topic=${topicParam}&category=${categoryParam}`;
  const featureHref = (nextFeatureKey: string) =>
    `/prototypes/topic-function-list?topic=${topicParam}&category=${categoryParam}&feature=${encodeURIComponent(nextFeatureKey)}`;

  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#020617] flex flex-col font-sans">
      {/* 顶部全局导航 */}
      <TopBar title={title} onNavigate={onNavigate} />
      
      {/* 页面主体 */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 py-4">
        <div className="flex gap-4 h-[920px]">
          {/* 左侧轻量专题导航 */}
          <aside
            className="flex flex-col overflow-hidden bg-white/90 backdrop-blur-sm rounded-xl shadow-sm flex-shrink-0 transition-all duration-300 ease-in-out"
            style={{ width: collapsed ? 72 : 240 }}
          >
            {/* 专题信息与返回区域 - 整体可点击 */}
            <button
              type="button"
              onClick={() => onNavigate(workbenchHref)}
              className="flex items-center gap-3 px-5 py-3 transition-all duration-300 hover:bg-gray-50 w-full text-left group"
              title="返回工作台"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <div className={`${collapsed ? 'hidden' : 'flex flex-col'}`}>
                <span className="text-[#1E293B] font-bold">工作台</span>
                <span className="text-[#94A3B8] text-xs mt-0.5">{topicName}</span>
              </div>
            </button>

            {/* 功能节点菜单 */}
            <nav className="flex-1 py-2">
              <div className="space-y-1 px-2">
                {FEATURES.map(item => {
                  const active = item.key === featureKey;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onNavigate(featureHref(item.key))}
                      className={`w-full flex ${collapsed ? 'justify-center' : 'items-center gap-3'} px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${active ? 'bg-[#1E3A8A] text-white font-medium' : 'hover:bg-gray-50 text-[#334155]'}`}
                      title={item.name}
                    >
                      <span className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${active ? 'text-white' : 'text-[#64748B]'}`}>
                        {item.icon}
                      </span>
                      <span className={`${collapsed ? 'hidden' : 'block'} truncate`}>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* 菜单折叠按钮 - 右下角向左展示 */}
            <div className="p-4 flex justify-end">
              <button
                type="button"
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-[#64748B] transition-all duration-300 group"
                onClick={() => setCollapsed(v => !v)}
                aria-label={collapsed ? '展开菜单' : '收起菜单'}
              >
                {collapsed ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-[#334155] transition-all duration-300 transform rotate-180">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-[#334155] transition-all duration-300">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                )}
              </button>
            </div>
          </aside>

          {/* 右侧内容区 */}
          <section className="flex-1 min-w-0">
            {/* 调用原系统框架区域 */}
            <div className="bg-white rounded-xl shadow-sm p-6 h-full">
              <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-200 rounded-lg">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <rect width="20" height="14" x="2" y="3" rx="2"/>
                      <line x1="8" y1="21" x2="16" y2="21"/>
                      <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">调用原系统框架</h3>
                  <p className="text-gray-500 text-sm">此区域将嵌入原系统功能模块</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
});

export default Component;
