/**
 * @name 工作台账录入
 *
 * 参考资料：
 * - /src/prototypes/problem-library-function-list/style.css
 * - /src/prototypes/problem-library-function-list/spec.md
 * - /src/docs/工作台账智能校验与审核留痕规则.md
 */
import './style.css';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import TopBar from '../../common/components/TopBar';
import type { AxureHandle, AxureProps, ConfigItem, EventItem, KeyDesc } from '../../common/axure-types';
import { createEventEmitter, getConfigValue } from '../../common/axure-types';
import actionAbolishIcon from './icons/action-abolish.svg?raw';
import actionExportIcon from './icons/action-export.svg?raw';
import actionRefreshIcon from './icons/action-refresh.svg?raw';
import editIcon from './icons/edit.svg?raw';
import ledgerBookIcon from './icons/ledger-book.svg?raw';
import ledgerSubmitIcon from './icons/ledger-submit.svg?raw';
import passIcon from './icons/pass.svg?raw';
import rectifyDispatchIcon from './icons/rectify-dispatch.svg?raw';
import reminderIcon from './icons/reminder.svg?raw';
import searchIcon from './icons/search.svg?raw';
import uploadIcon from './icons/upload.svg?raw';
import verifyIcon from './icons/verify.svg?raw';
import workbenchIcon from './icons/workbench.svg?raw';

type FeatureKey =
  | 'ledgerManage'
  | 'ledgerEntry'
  | 'ledgerAudit'
  | 'ledgerReport'
  | 'rectifySupervise'
  | 'rectifyDispatch'
  | 'rectifyReview'
  | 'rectifyQuery';
type PageMode = 'list' | 'entryCheck' | 'auditCheck' | 'edit';
type CheckFilter = 'all' | 'pass' | 'exception';
type IssueKind = '合规性' | '一致性';
type IssueStatus = '内容不匹配' | '未找到证据' | '无法判断' | '不符合审核要求' | '资料不完整';

type LedgerRow = {
  id: string;
  projectName: string;
  unit: string;
  area: string;
  description: string;
  status: string;
  dataStatus: string;
  total: number;
  columns: number[];
  checkResult: '全部一致' | '存在异常';
  exceptionCount: number;
};

type Fact = {
  id: string;
  title: string;
  kind: IssueKind;
  status: IssueStatus;
  inputValue: string;
  evidenceValue: string;
  reason: string;
  suggestion: string;
  submitterRejected?: boolean;
};

type IssueGroup = {
  fieldKey: string;
  fieldName: string;
  summary: string;
  facts: Fact[];
};

type CheckData = {
  rowId: string;
  conclusion: '全部一致' | '存在异常';
  summary: string;
  stats: {
    total: number;
    compliance: number;
    consistency: number;
  };
  groups: IssueGroup[];
  rejectNote?: {
    text?: string;
    images?: string[];
  };
  auditNotes?: Array<{
    role: string;
    user: string;
    time: string;
    decision: '通过' | '退回' | '继续关注';
    text: string;
    images?: string[];
  }>;
};

const EVENT_LIST: EventItem[] = [{ name: 'onNavigate', desc: '页面内导航', payload: 'string' }];
const ACTION_LIST: Array<{ name: string; desc: string; params?: string }> = [];
const VAR_LIST: KeyDesc[] = [
  { name: 'feature_key', desc: '当前功能 key' },
  { name: 'page_mode', desc: '当前页面模式' },
];
const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '系统标题', initialValue: '财会监督系统' },
];

const entryRows: LedgerRow[] = [
  {
    id: 'E01',
    projectName: '项目03',
    unit: '单位03',
    area: '兰州市本级',
    description: '新增地方政府隐性债务整改',
    status: '待提交',
    dataStatus: '材料已上传',
    total: 8,
    columns: [8, 8, 0, 0, 0, 0],
    checkResult: '存在异常',
    exceptionCount: 4,
  },
  {
    id: 'E02',
    projectName: '项目02',
    unit: '单位02',
    area: '兰州市本级',
    description: '平台公司融资项目整改',
    status: '待提交',
    dataStatus: '佐证待核对',
    total: 3,
    columns: [3, 2, 0, 1, 0, 0],
    checkResult: '存在异常',
    exceptionCount: 2,
  },
  {
    id: 'E03',
    projectName: '项目01',
    unit: '单位01',
    area: '兰州市本级',
    description: '交通基础设施补短板项目',
    status: '待提交',
    dataStatus: '资料齐全',
    total: 5,
    columns: [5, 0, 0, 0, 0, 0],
    checkResult: '全部一致',
    exceptionCount: 0,
  },
];

const auditRows: LedgerRow[] = [
  {
    id: 'A01',
    projectName: '交通基础设施补短板项目',
    unit: '张掖市财政局',
    area: '张掖市本级',
    description: '违规要求代垫工程款整改',
    status: '待审核',
    dataStatus: 'AI校验：存在异常',
    total: 5,
    columns: [5, 2, 1, 0, 0, 0],
    checkResult: '存在异常',
    exceptionCount: 3,
  },
  {
    id: 'A02',
    projectName: '市本级平台公司融资项目',
    unit: '兰州市财政局',
    area: '兰州市本级',
    description: '平台公司违规融资整改',
    status: '待审核',
    dataStatus: 'AI校验：存在异常',
    total: 3,
    columns: [3, 0, 0, 2, 0, 0],
    checkResult: '存在异常',
    exceptionCount: 2,
  },
  {
    id: 'A03',
    projectName: '园区政府购买服务整改项',
    unit: '酒泉市财政局',
    area: '酒泉市本级',
    description: '政府购买服务整改资料补充',
    status: '待审核',
    dataStatus: 'AI校验：存在异常',
    total: 2,
    columns: [2, 0, 0, 0, 0, 0],
    checkResult: '存在异常',
    exceptionCount: 1,
  },
];

const entryChecks: Record<string, CheckData> = {
  E01: {
    rowId: 'E01',
    conclusion: '存在异常',
    summary: '项目03 · 单位03，2 个字段、4 条异常事实需复核。',
    stats: { total: 4, compliance: 2, consistency: 2 },
    groups: [
      {
        fieldKey: '字段1',
        fieldName: '整改措施',
        summary: '字段结论：存在异常，拆解出 3 条待核验事实',
        facts: [
          {
            id: 'E01-F1',
            title: '待核验事实 1',
            kind: '一致性',
            status: '内容不匹配',
            inputValue: '整改措施：通过财政预算安排逐年化解。',
            evidenceValue: '整改方案：制定专项清偿计划，分阶段压降存量债务。',
            reason: '录入强调“财政预算安排”，附件原文只说明“专项清偿计划、分阶段压降”，两者不是同一资金化解口径。',
            suggestion: '请确认化解方式是否应按附件改为专项清偿计划，或补充财政预算安排文件。',
          },
          {
            id: 'E01-F2',
            title: '待核验事实 2',
            kind: '合规性',
            status: '内容不匹配',
            inputValue: '完成时限：2026年12月31日前完成整改。',
            evidenceValue: '整改方案说明.docx 第2页：2027年6月底前完成全部整改。',
            reason: '录入完成时限与附件原文时限不一致，且早于审核规范要求确认的正式整改节点。',
            suggestion: '请统一完成时限，或补充新的责任书说明 2026 年底完成的制度依据。',
          },
          {
            id: 'E01-F3',
            title: '待核验事实 3',
            kind: '一致性',
            status: '内容不匹配',
            inputValue: '责任主体：由省级平台公司统筹落实。',
            evidenceValue: '专项清偿计划.pdf 第5页：责任主体由兰州市城投公司牵头，财政部门跟踪督办。',
            reason: '录入主体与附件主体不一致，可能影响责任落实口径。',
            suggestion: '请按附件更新责任主体，或补充省级平台公司统筹落实的正式文件。',
            submitterRejected: true,
          },
        ],
      },
      {
        fieldKey: '字段2',
        fieldName: '项目编号',
        summary: '字段结论：存在异常，拆解出 1 条待核验事实',
        facts: [
          {
            id: 'E01-F4',
            title: '待核验事实 1',
            kind: '合规性',
            status: '未找到证据',
            inputValue: '项目编号：ZQ-2026-0718。',
            evidenceValue: '未匹配到同口径证据。',
            reason: '附件扫描件编号区域模糊，OCR 识别结果不稳定。',
            suggestion: '请重新上传清晰扫描件，或由人工复核编号是否一致。',
          },
        ],
      },
    ],
  },
  E02: {
    rowId: 'E02',
    conclusion: '存在异常',
    summary: '项目02 · 单位02，2 个字段、2 条异常事实需复核。',
    stats: { total: 2, compliance: 1, consistency: 1 },
    groups: [
      {
        fieldKey: '字段1',
        fieldName: '地点',
        summary: '字段结论：存在异常，拆解出 1 条待核验事实',
        facts: [
          {
            id: 'E02-F1',
            title: '待核验事实 1',
            kind: '一致性',
            status: '无法判断',
            inputValue: '地点：兰州新区。',
            evidenceValue: '未匹配到同口径证据。',
            reason: '附件材料中地点表述为简称，无法确认是否同一地点。',
            suggestion: '请补充地点说明，或在提交前备注中说明业务口径。',
          },
        ],
      },
      {
        fieldKey: '字段2',
        fieldName: '资金来源',
        summary: '字段结论：存在异常，拆解出 1 条待核验事实',
        facts: [
          {
            id: 'E02-F2',
            title: '待核验事实 1',
            kind: '合规性',
            status: '未找到证据',
            inputValue: '资金来源：财政安排及经营收入统筹。',
            evidenceValue: '附件未发现资金来源说明。',
            reason: '当前材料不能证明资金来源符合整改方案和制度要求。',
            suggestion: '请补充资金来源文件或删除未能证明的表述。',
            submitterRejected: true,
          },
        ],
      },
    ],
  },
  E03: {
    rowId: 'E03',
    conclusion: '全部一致',
    summary: '项目01 · 单位01，未发现合规性或一致性问题。',
    stats: { total: 0, compliance: 0, consistency: 0 },
    groups: [],
  },
};

const auditChecks: Record<string, CheckData> = {
  A01: {
    rowId: 'A01',
    conclusion: '存在异常',
    summary: '发现 2 个字段、3 条异常事实，系统建议退回。',
    stats: { total: 3, compliance: 3, consistency: 0 },
    rejectNote: {
      text: '录入岗未提交不认可说明。',
      images: [],
    },
    auditNotes: [],
    groups: [
      {
        fieldKey: '字段1',
        fieldName: '责任落实',
        summary: '整改责任完整性要求，拆解出 2 条待核验事实',
        facts: [
          {
            id: 'A01-F1',
            title: '待核验事实 1',
            kind: '合规性',
            status: '不符合审核要求',
            inputValue: '填报内容：由相关单位负责整改。',
            evidenceValue: '制度要求：应明确责任单位、责任处室和具体责任人，不能使用泛化表述。',
            reason: '内容虽与附件不冲突，但审核标准要求可追责、可督办，当前表述无法定位具体责任。',
            suggestion: '请补充责任处室和责任人。',
          },
          {
            id: 'A01-F2',
            title: '待核验事实 2',
            kind: '合规性',
            status: '不符合审核要求',
            inputValue: '填报内容：后续按要求推进。',
            evidenceValue: '制度要求：整改台账应填写明确完成时限或阶段性节点。',
            reason: '缺少明确日期或阶段节点，不满足审核通过条件。',
            suggestion: '请补充完成时限或阶段目标。',
          },
        ],
      },
      {
        fieldKey: '字段2',
        fieldName: '审核材料',
        summary: '审核材料完整性要求，拆解出 1 条待核验事实',
        facts: [
          {
            id: 'A01-F3',
            title: '待核验事实 1',
            kind: '合规性',
            status: '资料不完整',
            inputValue: '填报内容：已上传整改责任书。',
            evidenceValue: '当前附件仅包含会议纪要，未发现责任书或审批材料。',
            reason: '材料类型与填报内容不一致，无法支撑审核通过。',
            suggestion: '请补充正式责任书或说明材料。',
            submitterRejected: true,
          },
        ],
      },
    ],
  },
  A02: {
    rowId: 'A02',
    conclusion: '存在异常',
    summary: '发现 2 个字段、2 条异常事实，需审核岗复核后处理。',
    stats: { total: 2, compliance: 1, consistency: 1 },
    rejectNote: {
      text: '录入岗说明：附件采用集团合并口径，项目分项明细在线下归档。',
      images: ['截图-附件目录.png', '截图-线下台账.png'],
    },
    auditNotes: [
      {
        role: '区县初审岗',
        user: '王敏',
        time: '2026-07-18 15:20',
        decision: '继续关注',
        text: '录入岗已说明附件按集团合并口径归集，但当前项目仍缺少分项台账，建议市级复核时重点确认资金来源与完成时限。',
        images: ['初审复核记录.png'],
      },
    ],
    groups: [
      {
        fieldKey: '字段1',
        fieldName: '整改措施',
        summary: '字段结论：存在异常，拆解出 1 条待核验事实',
        facts: [
          {
            id: 'A02-F1',
            title: '待核验事实 1',
            kind: '一致性',
            status: '内容不匹配',
            inputValue: '整改措施：通过预算安排逐年化解。',
            evidenceValue: '附件依据：要求以经营收入偿还为主。',
            reason: '录入口径与附件载明资金来源不一致。',
            suggestion: '请按附件口径修正，或补充预算安排的正式依据。',
            submitterRejected: true,
          },
        ],
      },
      {
        fieldKey: '字段2',
        fieldName: '完成时限',
        summary: '字段结论：存在异常，拆解出 1 条待核验事实',
        facts: [
          {
            id: 'A02-F2',
            title: '待核验事实 1',
            kind: '合规性',
            status: '未找到证据',
            inputValue: '完成时限：2026年12月31日前完成整改。',
            evidenceValue: '附件未发现同口径完成时限。',
            reason: '无法确认完成时限是否来自正式整改方案。',
            suggestion: '请补充含完成时限的制度依据。',
          },
        ],
      },
    ],
  },
  A03: {
    rowId: 'A03',
    conclusion: '存在异常',
    summary: '发现 1 个字段、1 条异常事实，需补充材料后处理。',
    stats: { total: 1, compliance: 0, consistency: 1 },
    rejectNote: {
      text: '无数据：录入岗未提交不认可说明或证明截图。',
      images: [],
    },
    auditNotes: [
      {
        role: '区县初审岗',
        user: '李强',
        time: '2026-07-18 11:05',
        decision: '退回',
        text: '未见合同清理清单，建议补充后再流转。',
        images: [],
      },
      {
        role: '市级复核岗',
        user: '赵颖',
        time: '2026-07-19 09:40',
        decision: '继续关注',
        text: '退回后补传材料仍未覆盖合同清理范围，需继续核对附件目录。',
        images: ['复核截图.png'],
      },
    ],
    groups: [
      {
        fieldKey: '字段1',
        fieldName: '合同依据',
        summary: '字段结论：存在异常，拆解出 1 条待核验事实',
        facts: [
          {
            id: 'A03-F1',
            title: '待核验事实 1',
            kind: '一致性',
            status: '未找到证据',
            inputValue: '填报内容：已完成政府购买服务合同清理。',
            evidenceValue: '附件未发现合同清理清单。',
            reason: '当前附件无法证明合同清理事实。',
            suggestion: '请补充合同清理清单或说明无需清理的依据。',
          },
        ],
      },
    ],
  },
};

function useQuery() {
  const [query, setQuery] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const next: Record<string, string> = {};
      params.forEach((value, key) => {
        next[key] = value;
      });
      setQuery(next);
    } catch (error) {
      console.error('解析URL参数失败:', error);
      setQuery({});
    }
  }, []);
  return query;
}

function getRows(feature: FeatureKey) {
  return feature === 'ledgerAudit' ? auditRows : entryRows;
}

function getChecks(feature: FeatureKey) {
  return feature === 'ledgerAudit' ? auditChecks : entryChecks;
}

function isFeatureKey(value: unknown): value is FeatureKey {
  return (
    value === 'ledgerManage' ||
    value === 'ledgerEntry' ||
    value === 'ledgerAudit' ||
    value === 'ledgerReport' ||
    value === 'rectifySupervise' ||
    value === 'rectifyDispatch' ||
    value === 'rectifyReview' ||
    value === 'rectifyQuery'
  );
}

function resolveInitialFeature(props: AxureProps): FeatureKey {
  const configured = props.config?.default_feature || props.config?.initial_feature;
  if (isFeatureKey(configured)) return configured;

  try {
    const params = new URLSearchParams(window.location.search || '');
    const featureParam = params.get('feature_key') || params.get('feature');
    if (isFeatureKey(featureParam)) return featureParam;
    if (featureParam === 'work台账审核') return 'ledgerAudit';
    if (featureParam === 'work台账录入') return 'ledgerEntry';
    if (window.location.pathname.includes('problem-library-ledger-audit')) return 'ledgerAudit';
  } catch (error) {
    console.error('解析默认功能失败:', error);
  }

  return 'ledgerEntry';
}

function SvgIcon({
  source,
  size = 14,
  scale = 1,
}: {
  source: string;
  size?: number;
  scale?: number;
}) {
  const svg = useMemo(
    () =>
      source
        .replace(/<\?xml[\s\S]*?\?>/g, '')
        .replace(/<!DOCTYPE[\s\S]*?>/g, '')
        .replace(/fill="[^"]*"/g, 'fill="currentColor"')
        .replace(/width="[^"]*"/g, '')
        .replace(/height="[^"]*"/g, '')
        .replace('<svg ', `<svg class="ufsp-iconfont-svg" style="--ufsp-icon-scale:${scale}" `),
    [source, scale],
  );
  return (
    <span
      className="ufsp-iconfont-box"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function ButtonIcon({ children }: { children: React.ReactNode }) {
  return <span className="ufsp-iconfont-box">{children}</span>;
}

function Sidebar({
  feature,
  onFeatureChange,
}: {
  feature: FeatureKey;
  onFeatureChange: (next: FeatureKey) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const groups: Array<{ title: string; icon: React.ReactNode; children: Array<{ key: FeatureKey; name: string; icon: React.ReactNode }> }> = [
    {
      title: '台账分发录入',
      icon: <SvgIcon source={ledgerBookIcon} size={18} />,
      children: [
        { key: 'ledgerManage', name: '工作台账管理', icon: <SvgIcon source={ledgerBookIcon} size={18} /> },
        { key: 'ledgerEntry', name: '工作台账录入', icon: <SvgIcon source={editIcon} size={18} /> },
        { key: 'ledgerAudit', name: '工作台账审核', icon: <SvgIcon source={verifyIcon} size={18} /> },
        { key: 'ledgerReport', name: '工作台账上报', icon: <SvgIcon source={ledgerSubmitIcon} size={18} /> },
      ],
    },
    {
      title: '问题整改更新',
      icon: <SvgIcon source={rectifyDispatchIcon} size={18} />,
      children: [
        { key: 'rectifySupervise', name: '整改督办管理', icon: <SvgIcon source={reminderIcon} size={18} /> },
        { key: 'rectifyDispatch', name: '整改下发管理', icon: <SvgIcon source={rectifyDispatchIcon} size={18} /> },
        { key: 'rectifyReview', name: '整改情况审核', icon: <SvgIcon source={passIcon} size={18} /> },
        { key: 'rectifyQuery', name: '整改明细查询', icon: <SvgIcon source={searchIcon} size={18} /> },
      ],
    },
  ];

  return (
    <aside className={`ufsp-feature-sidebar ${collapsed ? 'is-collapsed' : ''}`} style={{ width: collapsed ? 64 : 272 }}>
      <div className="ufsp-sidebar-head">
        <div className="ufsp-sidebar-brand">
          <span className="ufsp-sidebar-logo">
            <SvgIcon source={workbenchIcon} size={22} />
          </span>
          <div className="ufsp-sidebar-title">
            <span>工作台</span>
            <em>问题库 · 重点领域整改</em>
          </div>
        </div>
        <button className="ufsp-sidebar-trigger" type="button" onClick={() => setCollapsed(!collapsed)} title="收起/展开">
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>
      <nav className="ufsp-feature-nav">
        {groups.map((group) => {
          const hasActive = group.children.some((item) => item.key === feature);
          return (
            <div className="ufsp-nav-group" key={group.title}>
              {!collapsed && (
                <button className={`ufsp-nav-group-title ${hasActive ? 'is-ancestor' : ''}`} type="button">
                  <span className="ufsp-nav-parent-left">
                    <span className="ufsp-nav-icon">{group.icon}</span>
                    <span>{group.title}</span>
                  </span>
                  <ChevronDown className="ufsp-nav-chevron" size={15} />
                </button>
              )}
              <div className="ufsp-nav-children">
                {group.children.map((item) => (
                  <button
                    className={`ufsp-nav-item ufsp-nav-child ${feature === item.key ? 'is-active' : ''}`}
                    key={item.key}
                    type="button"
                    title={item.name}
                    onClick={() => onFeatureChange(item.key)}
                  >
                    <span className="ufsp-nav-icon">{item.icon}</span>
                    {!collapsed && <span>{item.name}</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function TreePanel({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className="ufsp-ledger-tree">
      <button className="ufsp-tree-collapse" type="button" onClick={onToggle} title="收起/展开目录">
        {collapsed ? <ChevronsRight size={14} /> : <ChevronLeft size={14} />}
      </button>
      <div className="ufsp-tree-inner">
        <label className="ufsp-tree-search">
          <input placeholder="请输入" />
          <Search size={16} />
        </label>
        <div className="ufsp-tree-list">
          <button className="ufsp-tree-item" type="button">
            <ChevronDown size={14} />
            <span>2025年度</span>
          </button>
          <button className="ufsp-tree-item is-active" type="button">
            <span className="ufsp-tree-indent" />
            <span>地方政府债务 <em>(2)</em></span>
          </button>
          <button className="ufsp-tree-item" type="button">
            <span className="ufsp-tree-indent" />
            <span>违规返还财政收入 <em>(1)</em></span>
          </button>
          <button className="ufsp-tree-item" type="button">
            <span className="ufsp-tree-indent" />
            <span>基层“三保” <em>(0)</em></span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function LedgerList({
  feature,
  onStartCheck,
}: {
  feature: FeatureKey;
  onStartCheck: (mode: 'entryCheck' | 'auditCheck') => void;
}) {
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const isAudit = feature === 'ledgerAudit';
  const rows = getRows(feature);

  if (feature !== 'ledgerEntry' && feature !== 'ledgerAudit') {
    return (
      <section className="ufsp-business-panel">
        <div className="ufsp-placeholder h-full">
          <span className="ufsp-placeholder-icon">
            <FileText size={30} />
          </span>
          <div className="ufsp-placeholder-title">调用原系统框架</div>
          <div className="ufsp-placeholder-desc">此区域将嵌入原系统功能模块</div>
        </div>
      </section>
    );
  }

  return (
    <section className="ufsp-business-panel">
      <div className="ufsp-ledger-frame">
        <div className="ufsp-ledger-tabs">
          {(isAudit ? ['待审核 (3)', '已审核 (0)', '全部 (3)'] : ['待提交 (3)', '已提交 (0)', '全部 (3)']).map((tab, index) => (
            <button key={tab} className={index === 0 ? 'is-active' : ''} type="button">
              {tab}
            </button>
          ))}
        </div>
        <div className={`ufsp-ledger-content ${treeCollapsed ? 'is-tree-collapsed' : ''}`}>
          <TreePanel collapsed={treeCollapsed} onToggle={() => setTreeCollapsed(!treeCollapsed)} />
          <main className="ufsp-ledger-main">
            <div className="ufsp-ledger-toolbar">
              <div className="ufsp-toolbar-left">
                {!isAudit && (
                  <>
                    <button className="ufsp-btn ufsp-btn-primary" type="button">
                      <ButtonIcon><Plus size={14} /></ButtonIcon>
                      录入
                    </button>
                    <button className="ufsp-btn ufsp-btn-primary" type="button" onClick={() => onStartCheck('entryCheck')}>
                      <SvgIcon source={ledgerSubmitIcon} />
                      提交校验
                    </button>
                    <button className="ufsp-btn ufsp-btn-secondary" type="button">导入</button>
                    <button className="ufsp-btn ufsp-btn-secondary" type="button">
                      <SvgIcon source={actionExportIcon} />
                      导出
                    </button>
                    <button className="ufsp-btn ufsp-btn-secondary" type="button">批量设置责任单位</button>
                    <button className="ufsp-icon-btn ufsp-icon-btn-danger" type="button" title="删除"><Trash2 size={14} /></button>
                  </>
                )}
                {isAudit && (
                  <>
                    <button className="ufsp-btn ufsp-btn-primary" type="button" onClick={() => onStartCheck('auditCheck')}>
                      <SvgIcon source={verifyIcon} />
                      审核
                    </button>
                    <button className="ufsp-btn ufsp-btn-return" type="button">
                      <SvgIcon source={actionAbolishIcon} />
                      废除
                    </button>
                    <button className="ufsp-btn" type="button">销号</button>
                    <button className="ufsp-btn ufsp-btn-secondary" type="button">
                      <SvgIcon source={actionExportIcon} />
                      导出
                    </button>
                  </>
                )}
              </div>
              <div className="ufsp-toolbar-right">
                <label className="ufsp-search-box ufsp-filter-input">
                  <input placeholder="请输入" />
                  <Search size={16} />
                </label>
                <button className="ufsp-icon-btn ufsp-icon-btn-primary" type="button" title="查询"><Search size={14} /></button>
                <button className="ufsp-icon-btn ufsp-icon-btn-secondary" type="button" title="刷新"><RefreshCw size={14} /></button>
                <button className="ufsp-icon-btn ufsp-icon-btn-secondary" type="button" title="筛选"><Filter size={14} /></button>
                <button className="ufsp-btn ufsp-btn-secondary" type="button">查询方案</button>
                <button className="ufsp-icon-btn ufsp-icon-btn-secondary" type="button" title="列设置"><Settings size={14} /></button>
              </div>
            </div>
            <div className="ufsp-selection-note">
              <span>当前选择 {rows.length} 条待{isAudit ? '审核' : '提交'}台账</span>
            </div>
            <div className="ufsp-table-wrap">
              <table className={`ufsp-ledger-table ${isAudit ? 'ufsp-audit-table' : ''}`}>
                <thead>
                  <tr>
                    <th rowSpan={2} className="ufsp-check-col"><input type="checkbox" defaultChecked /></th>
                    <th rowSpan={2}>序号</th>
                    <th rowSpan={2}>项目名称</th>
                    <th rowSpan={2}>所涉单位</th>
                    <th rowSpan={2}>问题具体描述</th>
                    <th rowSpan={2}>状态</th>
                    <th rowSpan={2}>数据状态</th>
                    <th colSpan={7}>（一）新增地方政府隐性债务</th>
                    <th rowSpan={2} className="ufsp-action-col">操作</th>
                  </tr>
                  <tr>
                    <th>合计</th>
                    <th>小计</th>
                    <th>以国有企业举债为主体贷款新增</th>
                    <th>不合规PPP模式新增</th>
                    <th>不合规政府购买服务方式新增</th>
                    <th>要求国有企业垫资建设或拖欠工程款新增</th>
                    <th>违规要求代理银行延期清算并长期垫付资金新增</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id} className={index < 3 ? 'is-selected' : ''}>
                      <td className="center"><input type="checkbox" defaultChecked={index < 3} /></td>
                      <td className="center">{index + 1}</td>
                      <td title={row.projectName}>{row.projectName}</td>
                      <td title={row.unit}>{row.unit}</td>
                      <td title={row.description}>{row.description}</td>
                      <td><span className={row.status === '已退回' ? 'ufsp-status ufsp-status-danger' : 'ufsp-status ufsp-status-pending'}>{row.status}</span></td>
                      <td><span className={`ufsp-data-status ${row.exceptionCount ? 'is-warning' : ''}`}>{row.dataStatus}</span></td>
                      <td className="number">{row.total}</td>
                      {row.columns.map((value, valueIndex) => (
                        <td className="number" key={`${row.id}-${valueIndex}`}>{value}</td>
                      ))}
                      <td className="ufsp-row-actions">
                        <button type="button">{isAudit ? '审核' : '详情'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ufsp-pagination">
              <span className="ufsp-page-total">共 {rows.length} 条</span>
              <button className="ufsp-page-btn is-active" type="button">1</button>
              <button className="ufsp-page-size" type="button">10 条/页</button>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}

function SnapshotList({
  rows,
  selectedIds,
  currentId,
  filter,
  onFilter,
  onToggleRow,
  onCurrent,
}: {
  rows: LedgerRow[];
  selectedIds: string[];
  currentId: string;
  filter: CheckFilter;
  onFilter: (next: CheckFilter) => void;
  onToggleRow: (id: string) => void;
  onCurrent: (id: string) => void;
}) {
  const filtered = rows.filter((row) => {
    if (filter === 'pass') return row.checkResult === '全部一致';
    if (filter === 'exception') return row.checkResult === '存在异常';
    return true;
  });

  return (
    <div className="ufsp-ai-left">
      <div className="ufsp-ai-overview">
        <div className="ufsp-ai-list-summary">
          <button className={filter === 'all' ? 'is-active' : ''} type="button" onClick={() => onFilter('all')}>
            <strong>{rows.length}</strong>
            <span>全部数据</span>
          </button>
          <button className={filter === 'pass' ? 'is-active' : ''} type="button" onClick={() => onFilter('pass')}>
            <strong>{rows.filter((row) => row.checkResult === '全部一致').length}</strong>
            <span>全部一致</span>
          </button>
          <button className={`warning ${filter === 'exception' ? 'is-active' : ''}`} type="button" onClick={() => onFilter('exception')}>
            <strong>{rows.filter((row) => row.checkResult === '存在异常').length}</strong>
            <span>存在异常</span>
          </button>
        </div>
      </div>
      <div className="ufsp-ai-row-snapshot">
        <div className="ufsp-ai-row-scroll">
          <table>
            <thead>
              <tr>
                <th className="ufsp-sticky-select" />
                <th className="ufsp-sticky-index">#</th>
                <th>项目名称</th>
                <th>所涉单位</th>
                <th>区划</th>
                <th>问题具体描述</th>
                <th>数据状态</th>
                <th className="ufsp-snapshot-status">校验结果</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => {
                const checked = selectedIds.includes(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`${row.id === currentId ? 'is-active' : ''} ${!checked ? 'is-unchecked' : ''} ${row.checkResult === '存在异常' ? 'is-exception' : ''}`}
                    onClick={() => onCurrent(row.id)}
                  >
                    <td className="ufsp-sticky-select">
                      <input
                        checked={checked}
                        type="checkbox"
                        onChange={(event) => {
                          event.stopPropagation();
                          onToggleRow(row.id);
                        }}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </td>
                    <td className="ufsp-sticky-index">{String(index + 1).padStart(2, '0')}</td>
                    {[row.projectName, row.unit, row.area, row.description, row.dataStatus].map((value) => (
                      <td className="ufsp-snapshot-cell" data-full={value} key={`${row.id}-${value}`}>
                        <span>{value}</span>
                      </td>
                    ))}
                    <td className="ufsp-snapshot-status">{row.exceptionCount ? `${row.exceptionCount}项异常` : '全部一致'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  mode,
  row,
  check,
}: {
  mode: 'entryCheck' | 'auditCheck';
  row: LedgerRow;
  check: CheckData;
}) {
  const isAudit = mode === 'auditCheck';
  return (
    <section className={`ufsp-ai-result-card ${check.conclusion === '全部一致' ? 'pass' : 'danger'}`}>
      <div className="ufsp-conclusion-layout">
        <div className="ufsp-conclusion-main">
          <span className="ufsp-card-label">{isAudit ? '审核校验结论' : 'AI校验结论'}</span>
          <h3>{check.conclusion}</h3>
          <p>
            {row.projectName} · {row.unit}，{check.summary}
          </p>
        </div>
        <div>
          <div className="ufsp-conclusion-stats is-three">
            <div>
              <strong>{check.stats.total}</strong>
              <span>异常事实</span>
            </div>
            <div>
              <strong>{check.stats.compliance}</strong>
              <span>合规性问题</span>
            </div>
            <div>
              <strong>{check.stats.consistency}</strong>
              <span>一致性问题</span>
            </div>
          </div>
          {isAudit && (
            <div className="ufsp-audit-summary-line">
              <strong className={check.conclusion === '全部一致' ? 'is-pass' : 'is-danger'}>{check.conclusion === '全部一致' ? '建议通过' : '建议退回'}</strong>
              <span>需复核 {check.stats.total} 条</span>
              <span>合规性 {check.stats.compliance} 项</span>
              <span>一致性 {check.stats.consistency} 项</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function IssuesCard({
  mode,
  row,
  check,
  rejectedFactIds,
  onToggleReject,
  onOpenRejectNote,
  onOpenAuditNote,
  onEdit,
}: {
  mode: 'entryCheck' | 'auditCheck';
  row: LedgerRow;
  check: CheckData;
  rejectedFactIds: string[];
  onToggleReject: (id: string) => void;
  onOpenRejectNote: () => void;
  onOpenAuditNote: () => void;
  onEdit: () => void;
}) {
  const isAudit = mode === 'auditCheck';
  if (!check.groups.length) {
    return (
      <section className="ufsp-ai-issues-card">
        <div className="ufsp-card-head">
          <div className="ufsp-card-titleline">
            <span className="ufsp-card-label">{isAudit ? '审核异常明细' : '异常项明细'}</span>
            <p>{isAudit ? '按字段展示录入岗提交后的待审核事实。' : '按字段展示待复核事实。'}</p>
          </div>
        </div>
        <div className="ufsp-ai-pass-empty">
          <CheckCircle2 size={18} />
          当前数据未发现合规性或一致性问题。
        </div>
      </section>
    );
  }

  return (
    <section className="ufsp-ai-issues-card">
      <div className="ufsp-card-head">
        <div className="ufsp-card-titleline">
          <span className="ufsp-card-label">{isAudit ? '审核异常明细' : '异常项明细'}</span>
          <p>{isAudit ? '按字段展示录入岗提交后的待审核事实。' : '按字段展示待复核事实。'}</p>
        </div>
        <em>{check.stats.total} 条需复核</em>
        <div className="ufsp-current-data-actions">
          <button className="ufsp-btn ufsp-btn-secondary" type="button" onClick={onOpenRejectNote}>
            不认可说明
          </button>
          {isAudit && (
            <button className="ufsp-btn ufsp-btn-secondary" type="button" onClick={onOpenAuditNote}>
              审核说明{check.auditNotes?.length ? `(${check.auditNotes.length})` : ''}
            </button>
          )}
          {!isAudit && (
            <button className="ufsp-btn ufsp-btn-secondary" type="button" onClick={onEdit}>
              修改
            </button>
          )}
        </div>
      </div>
      <div className="ufsp-issue-list">
        {check.groups.map((group) => (
          <article className="ufsp-issue-item" key={group.fieldKey}>
            <div className="ufsp-issue-title">
              <div>
                <span>{group.fieldName}</span>
                <small>{group.summary}</small>
              </div>
              <em>{group.fieldKey}</em>
            </div>
            <div className="ufsp-claim-list">
              {group.facts.map((fact) => {
                const isRejected = fact.submitterRejected || rejectedFactIds.includes(fact.id);
                return (
                  <div className="ufsp-claim-row" key={fact.id}>
                    <div className="ufsp-claim-head">
                      <span>{fact.title}</span>
                      <strong>{fact.kind}</strong>
                      {!isAudit && (
                        <button
                          className={`ufsp-ai-doubt-toggle ${isRejected ? 'is-active' : ''}`}
                          type="button"
                          onClick={() => onToggleReject(fact.id)}
                        >
                          {isRejected ? '已标记不认可' : '标记不认可'}
                        </button>
                      )}
                      {isAudit && (
                        <i className={`ufsp-submitter-stance ${isRejected ? 'is-rejected' : 'is-neutral'}`}>
                          {isRejected ? '录入岗已标记不认可' : '录入岗未标记不认可'}
                        </i>
                      )}
                      <em>{fact.status}</em>
                    </div>
                    <dl className="ufsp-claim-body">
                      <div>
                        <dt>录入原文</dt>
                        <dd>{fact.inputValue}</dd>
                      </div>
                      <div>
                        <dt>{isAudit ? '佐证附件 / 审核依据' : '佐证附件'}</dt>
                        <dd>{fact.evidenceValue}</dd>
                      </div>
                    </dl>
                    <dl className="ufsp-claim-judgement ufsp-audit-judgement">
                      <div>
                        <dt>判断原因</dt>
                        <dd>{fact.reason}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Drawer({
  type,
  mode,
  row,
  check,
  rejectedFactIds,
  onClose,
}: {
  type: 'reason' | 'rejectNote' | 'auditNote';
  mode: 'entryCheck' | 'auditCheck';
  row: LedgerRow;
  check: CheckData;
  rejectedFactIds: string[];
  onClose: () => void;
}) {
  const title = type === 'reason' ? '推理过程' : type === 'auditNote' ? '审核说明' : '不认可说明';
  const markedFacts = check.groups
    .flatMap((group) => group.facts.map((fact) => ({ ...fact, fieldName: group.fieldName })))
    .filter((fact) => fact.submitterRejected || rejectedFactIds.includes(fact.id));
  const isAudit = mode === 'auditCheck';

  return (
    <div className="ufsp-drawer-layer">
      <button className="ufsp-drawer-mask" type="button" onClick={onClose} />
      <aside className="ufsp-drawer">
        <div className="ufsp-drawer-head">
          <div>
            <span>{title}</span>
            <strong>{row.projectName}</strong>
          </div>
          <button className="ufsp-icon-btn" type="button" onClick={onClose} title="关闭">
            <X size={16} />
          </button>
        </div>
        <div className="ufsp-drawer-body">
          {type === 'reason' && (
            <>
              <div className="ufsp-reason-step">
                <strong>1. 提取录入内容</strong>
                <span>按字段拆解台账文本，识别整改措施、责任落实、完成时限和材料依据等待核验事实。</span>
              </div>
              <div className="ufsp-reason-step">
                <strong>2. 匹配佐证材料</strong>
                <span>从附件、制度依据和审核口径中匹配同字段证据，判断是否存在合规性或一致性问题。</span>
              </div>
              <div className="ufsp-reason-step">
                <strong>3. 输出复核项</strong>
                <span>仅将需要人工复核的事实放入异常项明细，不因录入岗标记不认可而改变系统异常结论。</span>
              </div>
            </>
          )}
          {type === 'rejectNote' && !isAudit && (
            <>
              <div className="ufsp-note-summary">
                <strong>当前数据不认可说明（选填）</strong>
                <span>用于向审核岗解释为什么不采纳 AI 判断、为什么仍然提交；不填写也不阻断提交。</span>
              </div>
              <div className="ufsp-note-section">
                <div className="ufsp-note-section-title">
                  <strong>已标记不认可的判断</strong>
                  <span>{markedFacts.length} 条</span>
                </div>
                {markedFacts.length ? (
                  <div className="ufsp-note-chip-list">
                    {markedFacts.map((fact) => (
                      <span key={fact.id}>{fact.fieldName} · {fact.title}</span>
                    ))}
                  </div>
                ) : (
                  <div className="ufsp-note-empty">尚未标记不认可。可先在每条待核验事实右上角点击“标记不认可”。</div>
                )}
              </div>
              <label className="ufsp-proof-field">
                <span>不认可说明</span>
                <textarea placeholder="可说明不认可 AI 判断的原因、业务口径、线下核实情况或仍然提交的依据。" />
              </label>
              <div className="ufsp-proof-upload">
                <div>
                  <strong>证明截图</strong>
                  <span>支持多张图片，可上传线下材料、沟通记录或补充依据截图。</span>
                </div>
                <button className="ufsp-btn ufsp-btn-secondary" type="button">
                  <SvgIcon source={uploadIcon} />
                  上传图片
                </button>
              </div>
            </>
          )}
          {type === 'rejectNote' && isAudit && (
            <>
              <div className="ufsp-prior-proof-summary">
                <strong>录入岗不认可说明</strong>
                <span>{check.rejectNote?.text || '无数据：录入岗未提交不认可说明。'}</span>
              </div>
              <div className="ufsp-note-section">
                <div className="ufsp-note-section-title">
                  <strong>录入岗标记不认可的判断</strong>
                  <span>{markedFacts.length} 条</span>
                </div>
                {markedFacts.length ? (
                  <div className="ufsp-note-chip-list">
                    {markedFacts.map((fact) => (
                      <span key={fact.id}>{fact.fieldName} · {fact.title}</span>
                    ))}
                  </div>
                ) : (
                  <div className="ufsp-note-empty">录入岗未对当前数据的 AI 判断标记不认可。</div>
                )}
              </div>
              <div className="ufsp-prior-proof-list">
                {(check.rejectNote?.images || []).length ? (
                  check.rejectNote?.images?.map((image) => (
                    <div className="ufsp-prior-proof-item" key={image}>
                      <div className="ufsp-prior-proof-thumb">截图</div>
                      <div>
                        <strong>{image}</strong>
                        <p>用于解释录入岗为何不采纳 AI 判断或为何仍然提交。</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="ufsp-note-empty">无证明截图。</div>
                )}
              </div>
            </>
          )}
          {type === 'auditNote' && (
            <>
              <div className="ufsp-note-summary">
                <strong>审核说明</strong>
                <span>历史审核说明只读展示；本岗说明选填，用于记录通过、退回或继续关注的判断依据。</span>
              </div>
              <div className="ufsp-note-section">
                <div className="ufsp-note-section-title">
                  <strong>历史审核说明</strong>
                  <span>{check.auditNotes?.length || 0} 条</span>
                </div>
                {(check.auditNotes || []).length ? (
                  <div className="ufsp-prior-proof-list">
                    {check.auditNotes?.map((note) => (
                      <div className="ufsp-prior-proof-block" key={`${note.role}-${note.time}`}>
                        <div className="ufsp-return-proof-title">
                          <strong>{note.role} · {note.decision}</strong>
                          <span>{note.user} · {note.time}</span>
                        </div>
                        <p className="ufsp-prior-proof-note">{note.text}</p>
                        {note.images?.length ? (
                          <div className="ufsp-proof-list">
                            {note.images.map((image) => (
                              <span key={image}>{image}</span>
                            ))}
                          </div>
                        ) : (
                          <div className="ufsp-note-empty">未上传证明截图。</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ufsp-note-empty">暂无历史审核说明。当前数据可能处于第一岗审核，或前序岗位未补充说明。</div>
                )}
              </div>
              <label className="ufsp-proof-field">
                <span>本岗审核说明（选填）</span>
                <textarea placeholder="可填写审核判断、退回原因或后续关注口径。" />
              </label>
              <div className="ufsp-proof-upload">
                <div>
                  <strong>证明截图</strong>
                  <span>支持多张图片，适用于线下复核记录或制度截图。</span>
                </div>
                <button className="ufsp-btn ufsp-btn-secondary" type="button">
                  <SvgIcon source={uploadIcon} />
                  上传图片
                </button>
              </div>
            </>
          )}
        </div>
        {type !== 'reason' && (
          <div className="ufsp-drawer-footer">
            <button className="ufsp-btn" type="button" onClick={onClose}>取消</button>
            {(type === 'auditNote' || (type === 'rejectNote' && !isAudit)) && (
              <button className="ufsp-btn ufsp-btn-primary" type="button" onClick={onClose}>保存</button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function ConfirmDialog({
  type,
  count,
  onClose,
}: {
  type: 'submit' | 'pass';
  count: number;
  onClose: () => void;
}) {
  return (
    <div className="ufsp-confirm-layer">
      <button className="ufsp-confirm-mask" type="button" onClick={onClose} />
      <div className="ufsp-confirm ufsp-flow-confirm">
        <span className="ufsp-confirm-icon">
          <AlertCircle size={18} />
        </span>
        <div className="ufsp-confirm-body">
          <h3>{type === 'submit' ? '当前仍存在异常，确认继续提交吗？' : '当前仍存在异常，确认审核通过吗？'}</h3>
          <p>
            当前勾选范围内有 {count} 条异常事实。系统建议先修改或补充不认可说明；若人工确认不影响流转，可继续操作。
          </p>
        </div>
        <div className="ufsp-confirm-actions">
          <button className="ufsp-btn" type="button" onClick={onClose}>取消</button>
          <button className="ufsp-btn ufsp-btn-primary" type="button" onClick={onClose}>
            {type === 'submit' ? '仍然提交' : '确认通过'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckWorkspace({
  mode,
  rows,
  onBack,
  onEdit,
}: {
  mode: 'entryCheck' | 'auditCheck';
  rows: LedgerRow[];
  onBack: () => void;
  onEdit: () => void;
}) {
  const [filter, setFilter] = useState<CheckFilter>('all');
  const [currentId, setCurrentId] = useState(rows[0]?.id || '');
  const [selectedIds, setSelectedIds] = useState(rows.map((row) => row.id));
  const [drawer, setDrawer] = useState<'reason' | 'rejectNote' | 'auditNote' | null>(null);
  const [confirm, setConfirm] = useState<'submit' | 'pass' | null>(null);
  const [rejectedFactIds, setRejectedFactIds] = useState<string[]>(['E01-F3', 'E02-F2']);
  const isAudit = mode === 'auditCheck';
  const checks = getChecks(isAudit ? 'ledgerAudit' : 'ledgerEntry');
  const currentRow = rows.find((row) => row.id === currentId) || rows[0];
  const currentCheck = checks[currentRow.id];
  const selectedChecks = selectedIds.map((id) => checks[id]).filter(Boolean);
  const selectedIssueCount = selectedChecks.reduce((sum, check) => sum + check.stats.total, 0);

  function handleFilter(next: CheckFilter) {
    setFilter(next);
    const matched = rows.find((row) => next === 'all' || (next === 'pass' ? row.checkResult === '全部一致' : row.checkResult === '存在异常'));
    if (matched) setCurrentId(matched.id);
  }

  function handleToggleRow(id: string) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  function handlePrimarySubmit() {
    if (selectedIssueCount > 0) {
      setConfirm(isAudit ? 'pass' : 'submit');
    }
  }

  return (
    <section className="ufsp-business-panel ufsp-ai-page">
      <div className="ufsp-form-head ufsp-ai-head">
        <div className="ufsp-form-title">
          <button className="ufsp-form-back" type="button" onClick={onBack} title="返回">
            <ChevronLeft size={18} />
          </button>
          <h1>
            <span>{isAudit ? '工作台账审核' : '工作台账录入'}</span>
            <em>/ {isAudit ? '审核校验' : '提交校验'}</em>
          </h1>
        </div>
        <div className="ufsp-ai-head-actions">
          {!isAudit && (
            <button className="ufsp-btn ufsp-btn-secondary" type="button">
              <SvgIcon source={actionRefreshIcon} />
              刷新状态
            </button>
          )}
          <button className="ufsp-btn ufsp-btn-secondary" type="button" onClick={() => setDrawer('reason')}>
            <SvgIcon source={verifyIcon} />
            推理过程
          </button>
          {isAudit ? (
            <>
              <button className="ufsp-btn ufsp-btn-primary" type="button" onClick={handlePrimarySubmit}>
                <SvgIcon source={passIcon} />
                通过
              </button>
              <button className="ufsp-btn ufsp-btn-return" type="button">
                <SvgIcon source={actionAbolishIcon} />
                退回
              </button>
            </>
          ) : (
            <button className="ufsp-btn ufsp-btn-primary" type="button" onClick={handlePrimarySubmit}>
              <SvgIcon source={ledgerSubmitIcon} />
              提交
            </button>
          )}
        </div>
      </div>
      <div className="ufsp-ai-body">
        <SnapshotList
          rows={rows}
          selectedIds={selectedIds}
          currentId={currentId}
          filter={filter}
          onFilter={handleFilter}
          onToggleRow={handleToggleRow}
          onCurrent={setCurrentId}
        />
        <div className="ufsp-ai-right">
          <SummaryCard mode={mode} row={currentRow} check={currentCheck} />
          <IssuesCard
            mode={mode}
            row={currentRow}
            check={currentCheck}
            rejectedFactIds={rejectedFactIds}
            onToggleReject={(id) => {
              setRejectedFactIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
            }}
            onOpenRejectNote={() => setDrawer('rejectNote')}
            onOpenAuditNote={() => setDrawer('auditNote')}
            onEdit={onEdit}
          />
        </div>
      </div>
      {drawer && (
        <Drawer
          type={drawer}
          mode={mode}
          row={currentRow}
          check={currentCheck}
          rejectedFactIds={rejectedFactIds}
          onClose={() => setDrawer(null)}
        />
      )}
      {confirm && <ConfirmDialog type={confirm} count={selectedIssueCount} onClose={() => setConfirm(null)} />}
    </section>
  );
}

function EditPage({ onBack }: { onBack: () => void }) {
  return (
    <section className="ufsp-business-panel ufsp-ledger-edit-page">
      <div className="ufsp-form-head">
        <div className="ufsp-form-title">
          <button className="ufsp-form-back" type="button" onClick={onBack} title="返回">
            <ChevronLeft size={18} />
          </button>
          <h1>
            <span>工作台账录入</span>
            <em>/ 编辑</em>
          </h1>
        </div>
        <div className="ufsp-form-actions">
          <button className="ufsp-btn" type="button" onClick={onBack}>取消</button>
          <button className="ufsp-btn ufsp-btn-primary" type="button" onClick={onBack}>保存</button>
        </div>
      </div>
      <div className="ufsp-ledger-edit-body">
        <section className="ufsp-ledger-edit-section">
          <h2>基础信息</h2>
          <div className="ufsp-ledger-form-grid four">
            {['项目名称', '所涉单位', '区划', '责任单位'].map((label, index) => (
              <label className="ufsp-field-block" key={label}>
                <span>{label}{index < 2 && <b>*</b>}</span>
                <input defaultValue={index === 0 ? '交通基础设施补短板项目' : ''} />
              </label>
            ))}
          </div>
        </section>
        <section className="ufsp-ledger-edit-section">
          <h2>整改内容</h2>
          <div className="ufsp-ledger-form-grid two">
            <label className="ufsp-field-block wide">
              <span>问题具体描述</span>
              <textarea defaultValue="违规要求代垫工程款整改。" />
            </label>
            <label className="ufsp-field-block wide">
              <span>整改措施</span>
              <textarea defaultValue="通过财政预算安排逐年化解。" />
            </label>
          </div>
        </section>
        <section className="ufsp-ledger-edit-section">
          <h2>金额信息</h2>
          <div className="ufsp-edit-amount-table">
            <table>
              <thead>
                <tr>
                  <th>合计</th>
                  <th>小计</th>
                  <th>以国有企业举债为主体贷款新增</th>
                  <th>不合规PPP模式新增</th>
                  <th>不合规政府购买服务方式新增</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>8</td>
                  <td>8</td>
                  <td>8</td>
                  <td>0</td>
                  <td>0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

const Component = forwardRef<AxureHandle, AxureProps>((props, ref) => {
  const configSource = props && typeof props.config === 'object' && props.config ? props.config : {};
  const [feature, setFeature] = useState<FeatureKey>(() => resolveInitialFeature(props));
  const [mode, setMode] = useState<PageMode>('list');
  const onEventHandler = typeof props?.onEvent === 'function' ? props.onEvent : undefined;
  const emit = useMemo(() => createEventEmitter(onEventHandler), [onEventHandler]);
  const title = getConfigValue(configSource, 'title', '财会监督系统');

  useImperativeHandle(ref, () => ({
    getVar: (name: string) => {
      if (name === 'feature_key') return feature;
      if (name === 'page_mode') return mode;
      return undefined;
    },
    fireAction: () => undefined,
    eventList: EVENT_LIST,
    actionList: ACTION_LIST,
    varList: VAR_LIST,
    configList: CONFIG_LIST,
    dataList: [],
  }));

  function navigateFeature(next: FeatureKey) {
    setFeature(next);
    setMode('list');
    emit('onNavigate', next);
  }

  return (
    <div className="h-full min-h-screen bg-[#f5f7fa] text-[rgba(0,0,0,0.85)]">
      <TopBar title={title} onNavigate={(path) => emit('onNavigate', path)} />
      <main className="h-[calc(100vh-56px)] p-4">
        <div className="flex h-full gap-4">
          <Sidebar feature={feature} onFeatureChange={navigateFeature} />
          <section className="ufsp-business-shell flex-1 min-w-0">
            {mode === 'list' && (
              <LedgerList
                feature={feature}
                onStartCheck={(nextMode) => {
                  setFeature(nextMode === 'auditCheck' ? 'ledgerAudit' : 'ledgerEntry');
                  setMode(nextMode);
                }}
              />
            )}
            {mode === 'entryCheck' && <CheckWorkspace mode="entryCheck" rows={entryRows} onBack={() => setMode('list')} onEdit={() => setMode('edit')} />}
            {mode === 'auditCheck' && <CheckWorkspace mode="auditCheck" rows={auditRows} onBack={() => setMode('list')} onEdit={() => setMode('edit')} />}
            {mode === 'edit' && <EditPage onBack={() => setMode(feature === 'ledgerAudit' ? 'auditCheck' : 'entryCheck')} />}
          </section>
        </div>
      </main>
    </div>
  );
});

export default Component;
