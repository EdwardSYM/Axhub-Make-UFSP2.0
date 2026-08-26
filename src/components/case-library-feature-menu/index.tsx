/**
 * @name 案例库功能菜单
 *
 * 参考资料：
 * - /rules/ufsp-page-governance.md
 * - /rules/confirmed-baselines.md
 * - /src/prototypes/case-library-ai/index.tsx
 * - /src/prototypes/case-library-ai/spec.md
 */
import React, { useState } from 'react';
import {
  BookOpenCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  FileSearch,
  Files,
  Lightbulb,
  Pencil,
  ScanSearch,
  Search,
  Tags,
  UploadCloud,
  type LucideIcon,
} from 'lucide-react';

export type CaseLibraryFeatureKey =
  | 'case_search'
  | 'feedback_suggestion_search'
  | 'general_case_management'
  | 'common_insight'
  | 'typical_case_application'
  | 'typical_case_review'
  | 'case_collection'
  | 'case_tag';

export type CaseLibraryFeatureNode = {
  key: CaseLibraryFeatureKey;
  name: string;
  desc: string;
  Icon: LucideIcon;
};

export type CaseLibraryFeatureGroup = {
  type: 'group';
  name: string;
  desc: string;
  Icon: LucideIcon;
  children: CaseLibraryFeatureNode[];
};

export type CaseLibraryFeatureStandalone = CaseLibraryFeatureNode & {
  type: 'item';
};

export const CASE_LIBRARY_FEATURES: Array<CaseLibraryFeatureGroup | CaseLibraryFeatureStandalone> = [
  {
    type: 'group',
    name: '智能检索',
    desc: '统一承载案例和反哺建议的智能检索入口。',
    Icon: Search,
    children: [
      { key: 'case_search', name: '案例智能检索', desc: '通过关键词、自然语言和相似案例定位案例知识内容。', Icon: FileSearch },
      { key: 'feedback_suggestion_search', name: '反哺建议检索', desc: '检索由典型案例智能提炼形成的政策优化、问题整改和规则设置建议。', Icon: Lightbulb },
    ],
  },
  { type: 'item', key: 'general_case_management', name: '一般案例管理', desc: '围绕一般案例的治理、确认、入库与停用流转；待入库、已入库、不入库、已停用作为页面内部状态维度。', Icon: Files },
  { type: 'item', key: 'common_insight', name: '案例聚类分析', desc: '基于已入库一般案例识别同类问题、共性规律和高频风险，支撑回头看、举一反三。', Icon: ScanSearch },
  {
    type: 'group',
    name: '典型案例管理',
    desc: '沉淀可复用、可学习、可推广的典型案例，按申请和审核分开办理。',
    Icon: BookOpenCheck,
    children: [
      { key: 'typical_case_application', name: '申请', desc: '面向填报单位维护典型案例申请，状态收口为待提交、被退回、已发布和全部。', Icon: Pencil },
      { key: 'typical_case_review', name: '审核', desc: '面向审核人员处理提交后的典型案例，完成审核通过、退回和发布查看。', Icon: Check },
    ],
  },
  { type: 'item', key: 'case_collection', name: '案例采集管理', desc: '用于后续承接案例采集、导入和来源归集。', Icon: UploadCloud },
  { type: 'item', key: 'case_tag', name: '案例标签管理', desc: '用于后续维护案例分类、主题标签和 AI 标注口径。', Icon: Tags },
];

export const CASE_LIBRARY_FLAT_FEATURES = CASE_LIBRARY_FEATURES.flatMap((item) =>
  item.type === 'group' ? item.children : [item],
);

export function findCaseLibraryFeatureGroup(featureKey: string) {
  return CASE_LIBRARY_FEATURES.find(
    (item) => item.type === 'group' && item.children.some((child) => child.key === featureKey),
  ) as CaseLibraryFeatureGroup | undefined;
}

export function getCaseLibraryFeatureHref(featureKey: CaseLibraryFeatureKey) {
  if (featureKey === 'case_search') return '/prototypes/gansu-case-search';
  if (featureKey === 'feedback_suggestion_search') return '/prototypes/gansu-feedback-suggestion-search';
  return `/prototypes/case-library-ai?feature=${encodeURIComponent(featureKey)}`;
}

function FeatureIconMark({ Icon, active }: { Icon: LucideIcon; active?: boolean }) {
  return (
    <span className={`case-nav-icon ${active ? 'is-active' : ''}`} aria-hidden="true">
      <Icon size={18} />
    </span>
  );
}

type CaseLibraryFeatureMenuProps = {
  activeKey: CaseLibraryFeatureKey;
  topicName: string;
  subtitle?: string;
  ariaLabel?: string;
  onNavigate: (href: string) => void;
};

export default function CaseLibraryFeatureMenu({
  activeKey,
  topicName,
  subtitle = 'AI改造',
  ariaLabel = '案例库功能菜单',
  onNavigate,
}: CaseLibraryFeatureMenuProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['智能检索', '典型案例管理']);

  const toggleGroup = (name: string) => {
    setExpandedGroups((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  };

  return (
    <aside className={`case-sidebar ${collapsed ? 'is-collapsed' : ''}`} style={{ width: collapsed ? 64 : 272 }}>
      <div className="case-sidebar-head" title={topicName}>
        <div className="case-sidebar-brand">
          <span className="case-sidebar-logo" aria-hidden="true"><Database size={20} /></span>
          <div className="case-sidebar-title"><span>案例库</span><em>{subtitle}</em></div>
        </div>
        <button
          type="button"
          className="case-sidebar-trigger"
          aria-label={collapsed ? '展开案例库菜单' : '收起案例库菜单'}
          onClick={() => setCollapsed((current) => !current)}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="case-nav" aria-label={ariaLabel}>
        {collapsed
          ? CASE_LIBRARY_FLAT_FEATURES.map((item) => {
              const active = item.key === activeKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`case-nav-item ${active ? 'is-active' : ''}`}
                  title={item.name}
                  onClick={() => onNavigate(getCaseLibraryFeatureHref(item.key))}
                >
                  <FeatureIconMark Icon={item.Icon} active={active} />
                </button>
              );
            })
          : CASE_LIBRARY_FEATURES.map((item) => {
              if (item.type === 'group') {
                const expanded = expandedGroups.includes(item.name);
                const groupActive = item.children.some((child) => child.key === activeKey);
                return (
                  <div className="case-nav-group" key={item.name}>
                    <button
                      type="button"
                      className={[
                        'case-nav-group-title',
                        groupActive && !expanded ? 'is-active' : '',
                        groupActive && expanded ? 'is-ancestor' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => toggleGroup(item.name)}
                    >
                      <span className="case-group-left">
                        <FeatureIconMark Icon={item.Icon} active={groupActive && !expanded} />
                        <span>{item.name}</span>
                      </span>
                      <ChevronRight size={14} className={expanded ? 'is-expanded' : ''} />
                    </button>
                    {expanded ? (
                      <div className="case-nav-children">
                        {item.children.map((child) => {
                          const active = child.key === activeKey;
                          return (
                            <button
                              key={child.key}
                              type="button"
                              className={`case-nav-item case-nav-child ${active ? 'is-active' : ''}`}
                              onClick={() => onNavigate(getCaseLibraryFeatureHref(child.key))}
                            >
                              <FeatureIconMark Icon={child.Icon} active={active} />
                              <span>{child.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              }

              const active = item.key === activeKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`case-nav-item ${active ? 'is-active' : ''}`}
                  onClick={() => onNavigate(getCaseLibraryFeatureHref(item.key))}
                >
                  <FeatureIconMark Icon={item.Icon} active={active} />
                  <span>{item.name}</span>
                </button>
              );
            })}
      </nav>
    </aside>
  );
}
