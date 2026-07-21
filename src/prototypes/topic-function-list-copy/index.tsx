/**
 * @name 重点领域整改功能列表页
 *
 * 参考资料：
 * - /src/prototypes/topic-function-list-copy/style.css
 * - /assets/libraries/tailwind-css
 * - /rules/development-standards.md
 */
import './style.css';
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
  // 台账分发录入组
  { 
    type: 'group',
    name: '台账分发录入',
    children: [
      { 
        key: 'work台账管理', 
        name: '工作台账管理', 
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        ) 
      },
      { 
        key: 'work台账录入', 
        name: '工作台账录入', 
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        ) 
      },
      { 
        key: 'work台账审核', 
        name: '工作台账审核', 
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
        key: 'work台账上报', 
        name: '工作台账上报', 
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 7-7 7 7"/>
            <path d="M12 19V5"/>
          </svg>
        ) 
      }
    ]
  },
  
  // 问题整改更新组
  { 
    type: 'group',
    name: '问题整改更新',
    children: [
      { 
        key: 'rectify督办管理', 
        name: '整改督办管理', 
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        ) 
      },
      { 
        key: 'rectify下发管理', 
        name: '整改下发管理', 
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14"/>
            <path d="m19 12-7 7-7-7"/>
          </svg>
        ) 
      },
      { 
        key: 'rectify情况审核', 
        name: '整改情况审核', 
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        ) 
      }
    ]
  },
  
  // 整改明细查询 - 独立一级菜单
  { 
    type: 'item',
    key: 'rectify明细查询', 
    name: '整改明细查询', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
    ) 
  }
] as const;

const Component = forwardRef<AxureHandle, AxureProps>(function Component(innerProps, ref) {
  const configSource = innerProps && typeof innerProps.config === 'object' && innerProps.config ? innerProps.config : {};
  const onEventHandler = typeof innerProps?.onEvent === 'function' ? innerProps.onEvent : undefined;
  const emitEvent = useMemo(() => createEventEmitter(onEventHandler), [onEventHandler]);
  const query = useQuery();

  const title = getConfigValue<string>(configSource, 'title', '财会监督系统');
  const topicNameFromConfig = getConfigValue<string>(configSource, 'topic_name', '主题工作台');
  const topicKey = String(query.topic || '').toLowerCase();
  const categoryFromQuery = String(query.category || 'special').toLowerCase();
  const featureKey = String(query.feature || 'work台账管理');

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
      : 'special';

  const topicName = '重点领域整改';
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

  const rawTopic = String(query.topic || 'key_area_rectify');
  const rawCategory = String(query.category || 'special').toLowerCase();
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
    `/prototypes/topic-function-list-copy?topic=${topicParam}&category=${categoryParam}&feature=${encodeURIComponent(nextFeatureKey)}`;

  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<number[]>([0, 1]); // 默认展开前两个分组

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#020617] flex flex-col font-sans">
      {/* 顶部全局导航 */}
      <TopBar title={title} onNavigate={onNavigate} />
      
      {/* 页面主体 */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 py-4">
        <div className="flex gap-4 h-[920px]">
          {/* 左侧轻量专题导航 */}
          <aside
            className="flex flex-col overflow-hidden bg-white rounded-lg shadow-sm flex-shrink-0 transition-all duration-300 ease-in-out"
            style={{ width: collapsed ? 64 : 240 }}
          >
            {/* 专题信息与收起控制 */}
            <div className={`flex min-h-[72px] transition-colors duration-200 ${collapsed ? 'flex-col items-center justify-center gap-2 px-2 py-3' : 'items-center gap-2 px-[18px] py-3'}`}>
              <button
                type="button"
                onClick={() => onNavigate(workbenchHref)}
                className={`flex min-w-0 items-center gap-3 rounded transition-colors duration-200 hover:bg-[#F4F7FB] text-left group ${collapsed ? 'h-9 w-9 justify-center' : 'h-12 flex-1 px-0'}`}
                title="返回工作台"
              >
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-[#0F3D8A]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                </div>
                <div className={`${collapsed ? 'hidden' : 'flex min-w-0 flex-col'}`}>
                  <span className="text-[#1E293B] font-bold">工作台</span>
                  <span className="text-[#94A3B8] text-xs mt-0.5 truncate">{topicName}</span>
                </div>
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded hover:bg-[#F4F7FB] flex items-center justify-center text-[#7B8798] hover:text-[#0F3D8A] transition-colors duration-200"
                onClick={() => setCollapsed(v => !v)}
                aria-label={collapsed ? '展开菜单' : '收起菜单'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            {/* 功能节点菜单 */}
            <nav className="flex-1 py-2">
              <div className="space-y-4 px-2">
                {FEATURES.map((item, index) => {
                  if (item.type === 'group') {
                    const isExpanded = expandedGroups.includes(index);
                    const groupActive = item.children.some((childItem) => childItem.key === featureKey);
                    const groupSelected = groupActive && (!isExpanded || collapsed);
                    const groupAncestor = groupActive && isExpanded && !collapsed;
                    const groupIcon = item.children[0]?.icon;
                    return (
                      <div key={index} className="space-y-1">
                        <button
                          type="button"
                          className={`w-full h-11 flex ${collapsed ? 'justify-center px-0' : 'items-center justify-between gap-2.5 px-3'} rounded text-sm transition-colors duration-200 ${
                            groupSelected
                              ? 'bg-[#EDF3FA] text-[#0F3D8A] font-semibold'
                              : groupAncestor
                              ? 'text-[#0F3D8A] hover:bg-[#F4F7FB]'
                              : 'text-[#334155] hover:bg-[#F4F7FB]'
                          }`}
                          onClick={() => setExpandedGroups(prev => 
                            isExpanded 
                              ? prev.filter(i => i !== index) 
                              : [...prev, index]
                          )}
                          title={item.name}
                        >
                          <span className={`flex min-w-0 items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
                            <span className={`w-[30px] h-[30px] rounded-md flex items-center justify-center flex-shrink-0 ${
                              groupSelected ? 'bg-[rgba(42,72,126,0.14)] text-[#0F3D8A]' : groupAncestor ? 'bg-[#F3F6FA] text-[#0F3D8A]' : 'bg-[#F3F6FA] text-[#46566D]'
                            }`}>
                              {groupIcon}
                            </span>
                            <span className={`${collapsed ? 'hidden' : 'block'} truncate`}>{item.name}</span>
                          </span>
                          {!collapsed ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`flex-shrink-0 text-[#7B8798] transition-transform duration-200 ${isExpanded ? 'transform rotate-90' : ''}`}
                            >
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          ) : null}
                        </button>
                        {isExpanded && !collapsed && (
                          <div className="space-y-1">
                            {item.children.map(childItem => {
                              const active = childItem.key === featureKey;
                              return (
                                <button
                                  key={childItem.key}
                                  type="button"
                                  onClick={() => onNavigate(featureHref(childItem.key))}
                                  className={`w-full h-11 flex ${collapsed ? 'justify-center px-0' : 'items-center gap-2.5 pl-6 pr-3'} rounded text-sm transition-colors duration-200 ${active ? 'bg-[#EDF3FA] text-[#0F3D8A] font-semibold' : 'hover:bg-[#F4F7FB] text-[#334155]'}`}
                                  title={childItem.name}
                                >
                                  <span className={`w-[30px] h-[30px] rounded-md flex items-center justify-center flex-shrink-0 ${active ? 'bg-[rgba(42,72,126,0.14)] text-[#0F3D8A]' : 'bg-[#F3F6FA] text-[#46566D]'}`}>
                                    {childItem.icon}
                                  </span>
                                  <span className={`${collapsed ? 'hidden' : 'block'} truncate`}>{childItem.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // 独立菜单项
                    const active = item.key === featureKey;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => onNavigate(featureHref(item.key))}
                        className={`w-full h-11 flex ${collapsed ? 'justify-center px-0' : 'items-center gap-2.5 px-3'} rounded text-sm transition-colors duration-200 ${active ? 'bg-[#EDF3FA] text-[#0F3D8A] font-semibold' : 'hover:bg-[#F4F7FB] text-[#334155]'}`}
                        title={item.name}
                      >
                        <span className={`w-[30px] h-[30px] rounded-md flex items-center justify-center flex-shrink-0 ${active ? 'bg-[rgba(42,72,126,0.14)] text-[#0F3D8A]' : 'bg-[#F3F6FA] text-[#46566D]'}`}>
                          {item.icon}
                        </span>
                        <span className={`${collapsed ? 'hidden' : 'block'} truncate`}>{item.name}</span>
                      </button>
                    );
                  }
                })}
              </div>
            </nav>

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
