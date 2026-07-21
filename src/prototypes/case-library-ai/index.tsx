/**
 * @name 案例库（AI改造）
 *
 * 参考资料：
 * - /src/prototypes/problem-library-function-list/index.tsx
 * - /src/prototypes/problem-library-function-list/spec.md
 */
import './style.css';
import actionAddIconSvg from '../problem-library-function-list/icons/action-add.svg?raw';
import actionExportIconSvg from '../problem-library-function-list/icons/action-export.svg?raw';
import actionFilterIconSvg from '../problem-library-function-list/icons/action-filter.svg?raw';
import actionImportIconSvg from '../problem-library-function-list/icons/action-import.svg?raw';
import actionPassIconSvg from '../problem-library-function-list/icons/pass.svg?raw';
import actionRefreshIconSvg from '../problem-library-function-list/icons/action-refresh.svg?raw';
import actionSettingsIconSvg from '../problem-library-function-list/icons/action-settings.svg?raw';
import searchIconSvg from '../problem-library-function-list/icons/search.svg?raw';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  Files,
  History,
  Pencil,
  Search,
  ScanSearch,
  Tag,
  Tags,
  UploadCloud,
  X,
  type LucideIcon,
} from 'lucide-react';
import TopBar from '../../common/components/TopBar';
import type { AxureHandle, AxureProps, ConfigItem, EventItem, KeyDesc } from '../../common/axure-types';
import { createEventEmitter, getConfigValue } from '../../common/axure-types';

type FeatureNode = {
  key: string;
  name: string;
  desc: string;
  Icon: LucideIcon;
};

type FeatureGroup = {
  type: 'group';
  name: string;
  desc: string;
  Icon: LucideIcon;
  children: FeatureNode[];
};

type FeatureStandalone = FeatureNode & {
  type: 'item';
};

type FeatureIconProps = {
  size?: number;
  className?: string;
};

type ToolbarIcon = (props: FeatureIconProps) => React.ReactElement;

type CaseLifecycle = 'pending' | 'stored' | 'disabled' | 'rejected';
type CaseSourceType = '日常监督形成' | '专项监督形成' | '上级下发' | '外部公开案例' | '其他来源';
type QualityStatus = '正常' | '提醒' | '阻断';
type TagStatus = '已确认' | '待确认' | '存在候选标签' | '未识别';
type RelatedSourceItem = {
  label: string;
  value: string;
};

type SourceDraft = Record<string, string>;

type CaseDraft = {
  title: string;
  region: string;
  occurrenceTime: string;
  involvedSubject: string;
  summary: string;
  tags: string;
  remark: string;
};

type IssueSourceOption = {
  id: string;
  sourceType: Extract<CaseSourceType, '日常监督形成' | '专项监督形成'>;
  value: string;
  code: string;
  title: string;
  unit: string;
  region: string;
  occurrenceTime: string;
  involvedSubject: string;
  summary: string;
  tags: string;
  status: string;
};

type CaseRow = {
  id: string;
  code: string;
  title: string;
  originalTitle: string;
  summary: string;
  sourceType: CaseSourceType;
  sourceInfo: string;
  sourceUnit: string;
  sourceRawText: string;
  sourceAttachments?: string[];
  sourceUrl?: string;
  relatedSource: RelatedSourceItem[];
  region: string;
  occurrenceTime: string;
  involvedSubject: string;
  entryOrg: string;
  entryPerson: string;
  remark: string;
  category: string;
  lifecycle: CaseLifecycle;
  quality: QualityStatus;
  tagStatus: TagStatus;
  duplicate: string;
  importTime: string;
  storedTime?: string;
  disabledTime?: string;
  disabledReason?: string;
  disabledBy?: string;
  rejectedTime?: string;
  rejectedReason?: string;
  rejectedBy?: string;
  useCount: number;
  recommendCount: number;
  analysisCount: number;
  typicalRefCount: number;
  lastUsed: string;
  tags: string[];
  aiConfidence: number;
};

type GeneralCaseView = 'list' | 'process' | 'detail' | 'edit';
type GeneralModal = 'import' | 'reject' | 'disable' | 'tag' | null;
type GeneralDrawer = 'overview' | 'source' | 'similar' | 'records' | null;

const EVENT_LIST: EventItem[] = [{ name: 'onNavigate', desc: '页面内导航', payload: 'string' }];
const ACTION_LIST: Array<{ name: string; desc: string; params?: string }> = [];
const VAR_LIST: KeyDesc[] = [
  { name: 'feature_key', desc: '当前案例库功能 key' },
  { name: 'feature_name', desc: '当前案例库功能名称' },
];
const CONFIG_LIST: ConfigItem[] = [
  { type: 'input', attributeId: 'title', displayName: '系统标题', initialValue: '财会监督系统' },
  { type: 'input', attributeId: 'topic_name', displayName: '页面主题', initialValue: '案例库（AI改造）' },
];

function normalizeIconfontSvg(svg: string) {
  return svg
    .replace(/<\?xml[^>]*>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '')
    .replace(/\sxmlns:xlink="[^"]*"/g, '')
    .replace(/\s(width|height)="[^"]*"/g, '')
    .replace(/\sclass="icon"/g, ' class="ufsp-iconfont-svg"')
    .replace(/\sfill="[^"]*"/g, ' fill="currentColor"')
    .replace(/<svg\b([^>]*)>/, '<svg$1 aria-hidden="true" focusable="false">');
}

function IconfontToolbarIcon(props: FeatureIconProps & { svg: string }) {
  const size = props.size || 14;
  const html = useMemo(() => normalizeIconfontSvg(props.svg), [props.svg]);
  return (
    <span
      className={['ufsp-iconfont-box', props.className].filter(Boolean).join(' ')}
      style={{ width: size, height: size } as React.CSSProperties}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function makeIconfontToolbarIcon(svg: string): ToolbarIcon {
  return function ToolbarIconfontIcon(props: FeatureIconProps) {
    return <IconfontToolbarIcon {...props} svg={svg} />;
  };
}

const ToolbarAddIcon = makeIconfontToolbarIcon(actionAddIconSvg);
const ToolbarImportIcon = makeIconfontToolbarIcon(actionImportIconSvg);
const ToolbarExportIcon = makeIconfontToolbarIcon(actionExportIconSvg);
const ToolbarPassIcon = makeIconfontToolbarIcon(actionPassIconSvg);
const ToolbarSearchIcon = makeIconfontToolbarIcon(searchIconSvg);
const ToolbarRefreshIcon = makeIconfontToolbarIcon(actionRefreshIconSvg);
const ToolbarFilterIcon = makeIconfontToolbarIcon(actionFilterIconSvg);
const ToolbarSettingsIcon = makeIconfontToolbarIcon(actionSettingsIconSvg);

const GENERAL_CASE_SOURCE_TYPES: CaseSourceType[] = ['日常监督形成', '专项监督形成', '上级下发', '外部公开案例', '其他来源'];
const SOURCE_TYPE_ITEMS = GENERAL_CASE_SOURCE_TYPES;
const FORM_SOURCE_TYPE_ITEMS = GENERAL_CASE_SOURCE_TYPES;
const CASE_LIFECYCLE_LABELS: Record<CaseLifecycle, string> = {
  pending: '待入库',
  stored: '已入库',
  rejected: '不入库',
  disabled: '已停用',
};
const CASE_TAG_OPTIONS = [
  '预算执行',
  '进度监控',
  '绩效跟踪',
  '专项债券',
  '绩效目标',
  '资金用途',
  '政府采购',
  '合同履约',
  '资料缺失',
  '惠民补贴',
  '一卡通',
  '重复发放',
  '资金拨付',
  '责任分解',
  '整改闭环',
];

const SOURCE_FIELD_LABELS: Record<CaseSourceType, string[]> = {
  日常监督形成: ['关联问题'],
  专项监督形成: ['关联问题'],
  上级下发: ['下发单位', '文件名称', '文件编号'],
  外部公开案例: ['发布机构或来源网站', '原文链接', '发布时间'],
  其他来源: ['来源名称', '来源说明'],
};

const SOURCE_FIELD_ALIASES: Record<string, string[]> = {
  形成单位: ['形成单位', '来源单位'],
  文件编号: ['文件编号', '文号'],
  发布机构或来源网站: ['发布机构或来源网站', '发布机构', '来源网站'],
  原文链接: ['原文链接', '原始链接'],
};

const ISSUE_SOURCE_OPTIONS: IssueSourceOption[] = [
  {
    id: 'issue-001',
    sourceType: '专项监督形成',
    value: 'WT-2026-0312 某区专项债项目绩效目标与资金用途不一致',
    code: 'WT-2026-0312',
    title: '专项债券资金绩效目标设置不完整案例',
    unit: '兰州市财政局',
    region: '兰州市',
    occurrenceTime: '2026-03-01 至 2026-06-30',
    involvedSubject: '兰州市财政局、某区项目实施单位',
    summary: '专项债券项目绩效目标未覆盖资金使用全过程，后续整改补充目标指标并完善台账。',
    status: '已销号',
    tags: '专项债券、绩效目标、资金用途',
  },
  {
    id: 'issue-002',
    sourceType: '日常监督形成',
    value: 'WT-2026-0348 绩效自评表与整改说明口径不一致',
    code: 'WT-2026-0348',
    title: '预算绩效自评材料口径不一致案例',
    unit: '武威市财政局',
    region: '武威市',
    occurrenceTime: '2026-04 至 2026-06',
    involvedSubject: '武威市财政局、预算单位',
    summary: '绩效自评表与整改说明口径不一致，后续补齐佐证材料后可整理形成案例。',
    status: '待复核',
    tags: '资料口径、绩效自评、待补充',
  },
  {
    id: 'issue-003',
    sourceType: '日常监督形成',
    value: 'WT-2026-0416 预算执行进度长期偏低',
    code: 'WT-2026-0416',
    title: '预算执行进度异常提醒处置案例',
    unit: '天水市财政局',
    region: '天水市',
    occurrenceTime: '2026-01 至 2026-06',
    involvedSubject: '天水市财政局、项目主管单位',
    summary: '预算执行进度长期偏低，单位通过项目分解、支出计划重排和月度调度提升执行效率。',
    status: '整改中',
    tags: '预算执行、进度监控、绩效跟踪',
  },
  {
    id: 'issue-004',
    sourceType: '专项监督形成',
    value: 'WT-2026-0527 政府采购合同履约资料缺失',
    code: 'WT-2026-0527',
    title: '政府采购合同履约资料缺失整改案例',
    unit: '张掖市财政局',
    region: '张掖市',
    occurrenceTime: '2026-05',
    involvedSubject: '张掖市财政局、采购项目实施单位',
    summary: '采购项目验收和履约资料缺少关键附件，经整改补充验收记录、合同履约说明和责任分工。',
    status: '待补充',
    tags: '政府采购、合同履约、资料缺失',
  },
  {
    id: 'issue-005',
    sourceType: '日常监督形成',
    value: 'WT-2026-0619 财政暂付款长期挂账清理不到位',
    code: 'WT-2026-0619',
    title: '财政暂付款清理责任分解案例',
    unit: '金昌市财政局',
    region: '金昌市',
    occurrenceTime: '2025-11 至 2026-06',
    involvedSubject: '金昌市财政局、相关预算单位',
    summary: '财政暂付款长期未清理，通过建立责任清单、分年度压降计划和月度督办机制完成整改。',
    status: '已销号',
    tags: '暂付款、清理压降、责任分解',
  },
];

const FEATURES: Array<FeatureGroup | FeatureStandalone> = [
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

const CASE_ROWS: CaseRow[] = [
  {
    id: 'case-001',
    code: 'AL-2026-0001',
    title: '专项债券资金绩效目标设置不完整案例',
    originalTitle: '某区专项债项目绩效目标与资金用途不一致',
    summary: '专项债券项目绩效目标未覆盖资金使用全过程，后续整改补充目标指标并完善台账。',
    sourceType: '日常监督形成',
    sourceInfo: 'WT-2026-0312',
    sourceUnit: '兰州市财政局',
    sourceRawText: '来源于日常监督事项 WT-2026-0312，责任单位为兰州市财政局。原事项反映某区专项债项目绩效目标与资金用途不一致，整改过程中已形成问题整改报告、验收记录和责任清单，可作为案例标准化入库依据。',
    sourceAttachments: ['问题整改报告.pdf', '验收记录.pdf', '责任清单.xlsx'],
    relatedSource: [
      { label: '关联问题', value: 'WT-2026-0312 某区专项债项目绩效目标与资金用途不一致' },
    ],
    region: '兰州市',
    occurrenceTime: '2026-03-01 至 2026-06-30',
    involvedSubject: '兰州市财政局、某区项目实施单位',
    entryOrg: '兰州市财政局',
    entryPerson: '陈静',
    remark: '由日常监督闭环事项自动带入，需确认案例标签和材料完整性。',
    category: '预算绩效 / 专项债券 / 绩效目标',
    lifecycle: 'pending',
    quality: '提醒',
    tagStatus: '存在候选标签',
    duplicate: '86% / 2条',
    importTime: '2026-07-14 10:24',
    useCount: 0,
    recommendCount: 0,
    analysisCount: 0,
    typicalRefCount: 0,
    lastUsed: '-',
    tags: ['专项债券', '绩效目标', '资金用途', 'AI建议'],
    aiConfidence: 87,
  },
  {
    id: 'case-002',
    code: 'AL-2026-0002',
    title: '政府采购合同履约资料缺失整改案例',
    originalTitle: '采购项目验收资料不完整',
    summary: '采购项目验收和履约资料缺少关键附件，经整改补充验收记录、合同履约说明和责任分工。',
    sourceType: '专项监督形成',
    sourceInfo: '政府采购专项监督',
    sourceUnit: '张掖市财政局',
    sourceRawText: '通过文件导入形成，文件名为“采购整改案例导入.xlsx”。导入内容包含采购项目验收资料缺失、合同履约说明不完整和后续整改责任分工，当前缺少部分佐证附件，需要人工补充确认。',
    sourceAttachments: ['采购整改案例导入.xlsx'],
    relatedSource: [
      { label: '专项名称', value: '政府采购合同履约专项监督' },
      { label: '来源单位', value: '张掖市财政局' },
    ],
    region: '张掖市',
    occurrenceTime: '2026-05',
    involvedSubject: '张掖市财政局、采购项目实施单位',
    entryOrg: '张掖市财政局',
    entryPerson: '赵伟',
    remark: '专项监督材料导入后存在阻断项，需补充正式验收附件。',
    category: '政府采购 / 合同履约 / 资料完整性',
    lifecycle: 'pending',
    quality: '阻断',
    tagStatus: '待确认',
    duplicate: '无',
    importTime: '2026-07-14 09:10',
    useCount: 0,
    recommendCount: 0,
    analysisCount: 0,
    typicalRefCount: 0,
    lastUsed: '-',
    tags: ['政府采购', '合同履约', '资料缺失'],
    aiConfidence: 64,
  },
  {
    id: 'case-003',
    code: 'AL-2026-0003',
    title: '财政暂付款清理责任分解案例',
    originalTitle: '暂付款长期挂账整改',
    summary: '财政暂付款长期未清理，通过建立责任清单、分年度压降计划和月度督办机制完成整改。',
    sourceType: '日常监督形成',
    sourceInfo: '暂付款清理日常监督',
    sourceUnit: '金昌市财政局',
    sourceRawText: '由金昌市财政局在本地监督整改工作中形成并报送。原始材料说明财政暂付款长期挂账问题已通过责任清单、分年度压降计划和月度督办机制完成整改，具备沉淀为一般案例的条件。',
    sourceAttachments: ['地方案例报送表.docx', '暂付款清理台账.xlsx'],
    relatedSource: [
      { label: '来源单位', value: '金昌市财政局' },
      { label: '监督事项名称', value: '财政暂付款清理日常监督' },
    ],
    region: '金昌市',
    occurrenceTime: '2025-11 至 2026-06',
    involvedSubject: '金昌市财政局、相关预算单位',
    entryOrg: '金昌市财政局',
    entryPerson: '刘敏',
    remark: '已完成整改闭环，可作为同类暂付款治理参考。',
    category: '财政运行 / 暂付款管理 / 清理压降',
    lifecycle: 'stored',
    quality: '正常',
    tagStatus: '已确认',
    duplicate: '无',
    importTime: '2026-07-11 15:30',
    storedTime: '2026-07-13 11:20',
    useCount: 42,
    recommendCount: 16,
    analysisCount: 7,
    typicalRefCount: 1,
    lastUsed: '2026-07-15',
    tags: ['暂付款', '清理压降', '责任分解', '已确认'],
    aiConfidence: 92,
  },
  {
    id: 'case-004',
    code: 'AL-2026-0004',
    title: '国有资产处置收益未及时上缴案例',
    originalTitle: '资产处置收益滞留单位账户',
    summary: '行政事业单位资产处置收益未按规定及时上缴，整改后完成收入缴库和内控制度修订。',
    sourceType: '上级下发',
    sourceInfo: '省厅案例下发 2026-07',
    sourceUnit: '省财政厅资产处',
    sourceRawText: '由省财政厅资产处在 2026 年 7 月批次下发。材料围绕行政事业单位资产处置收益未按规定及时上缴的问题展开，包含下发说明、整改要求和案例参考口径。',
    sourceAttachments: ['省厅案例下发清单.pdf', '资产处置收益整改说明.docx'],
    relatedSource: [
      { label: '文件名称', value: '省厅案例下发清单' },
      { label: '文号', value: '甘财资函〔2026〕17号' },
      { label: '下发单位', value: '省财政厅资产处' },
    ],
    region: '省本级',
    occurrenceTime: '2026-04 至 2026-07',
    involvedSubject: '省财政厅资产处、相关行政事业单位',
    entryOrg: '省财政厅资产处',
    entryPerson: '马宁',
    remark: '由上级下发案例整理入库，适合后续关联同类资产处置问题。',
    category: '资产管理 / 资产处置 / 收益上缴',
    lifecycle: 'stored',
    quality: '正常',
    tagStatus: '已确认',
    duplicate: '78% / 1条',
    importTime: '2026-07-09 17:42',
    storedTime: '2026-07-12 16:15',
    useCount: 31,
    recommendCount: 9,
    analysisCount: 5,
    typicalRefCount: 0,
    lastUsed: '2026-07-14',
    tags: ['资产处置', '非税收入', '内控修订', '已确认'],
    aiConfidence: 95,
  },
  {
    id: 'case-005',
    code: 'AL-2026-0005',
    title: '惠民补贴发放名单重复问题案例',
    originalTitle: '一卡通补贴名单重复',
    summary: '惠民补贴发放名单中存在重复人员，后续通过名单比对、补贴追回和发放流程校验完成整改。',
    sourceType: '外部公开案例',
    sourceInfo: '公开通报网页快照',
    sourceUnit: '酒泉市财政局',
    sourceRawText: '采集自外部公开通报网页，主要内容为惠民补贴发放名单中存在重复人员，经名单比对、补贴追回和流程校验后完成整改。当前网页快照已归档，但来源网页存在撤稿风险。',
    sourceAttachments: ['公开通报网页快照.png'],
    sourceUrl: 'https://example.gov.cn/public/case-20260702',
    relatedSource: [
      { label: '来源网站', value: '示例公开通报网站' },
      { label: '发布机构', value: '酒泉市财政局' },
      { label: '原始链接', value: 'https://example.gov.cn/public/case-20260702' },
    ],
    region: '酒泉市',
    occurrenceTime: '2026-02 至 2026-05',
    involvedSubject: '酒泉市财政局、惠民补贴发放单位',
    entryOrg: '酒泉市财政局',
    entryPerson: '李明',
    remark: '公开网页已撤稿，停用后保留历史引用记录。',
    category: '惠民惠农 / 一卡通 / 名单校验',
    lifecycle: 'disabled',
    quality: '正常',
    tagStatus: '已确认',
    duplicate: '无',
    importTime: '2026-07-02 08:35',
    storedTime: '2026-07-05 10:20',
    disabledTime: '2026-07-14 18:20',
    disabledReason: '来源网页撤稿，暂不作为正式案例使用。',
    disabledBy: '李明',
    useCount: 12,
    recommendCount: 4,
    analysisCount: 3,
    typicalRefCount: 0,
    lastUsed: '2026-07-10',
    tags: ['一卡通', '重复发放', '名单比对', '已确认'],
    aiConfidence: 89,
  },
  {
    id: 'case-006',
    code: 'AL-2026-0006',
    title: '预算执行进度异常提醒处置案例',
    originalTitle: '预算执行进度偏低',
    summary: '预算执行进度长期偏低，单位通过项目分解、支出计划重排和月度调度提升执行效率。',
    sourceType: '日常监督形成',
    sourceInfo: '预算执行进度日常监控',
    sourceUnit: '天水市财政局',
    sourceRawText: '由监督人员根据日常监督处理情况手工录入。原始说明为预算执行进度长期偏低，单位通过项目分解、支出计划重排和月度调度提升执行效率，后续需补充正式附件。',
    relatedSource: [
      { label: '来源单位', value: '天水市财政局' },
      { label: '监督事项名称', value: '预算执行进度日常监控' },
    ],
    region: '天水市',
    occurrenceTime: '2026-01 至 2026-06',
    involvedSubject: '天水市财政局、项目主管单位',
    entryOrg: '天水市财政局',
    entryPerson: '周倩',
    remark: '手工录入待完善材料附件。',
    category: '预算执行 / 进度监控 / 绩效跟踪',
    lifecycle: 'pending',
    quality: '正常',
    tagStatus: '未识别',
    duplicate: '无',
    importTime: '2026-07-15 09:05',
    useCount: 0,
    recommendCount: 0,
    analysisCount: 0,
    typicalRefCount: 0,
    lastUsed: '-',
    tags: [],
    aiConfidence: 0,
  },
  {
    id: 'case-007',
    code: 'AL-2026-0007',
    title: '预算绩效自评材料口径不一致案例',
    originalTitle: '绩效自评表与整改说明口径不一致',
    summary: '案例来源材料不完整，暂不纳入正式案例库，后续可补齐佐证后恢复待入库。',
    sourceType: '日常监督形成',
    sourceInfo: 'WT-2026-0348',
    sourceUnit: '武威市财政局',
    sourceRawText: '来源于日常监督事项 WT-2026-0348，反映绩效自评表与整改说明口径不一致。当前材料缺少正式整改结果和验收说明，暂不纳入正式案例库，后续补齐佐证后可恢复待入库。',
    sourceAttachments: ['绩效自评表.xlsx'],
    relatedSource: [
      { label: '关联问题', value: 'WT-2026-0348 绩效自评表与整改说明口径不一致' },
    ],
    region: '武威市',
    occurrenceTime: '2026-04',
    involvedSubject: '武威市财政局、预算绩效自评单位',
    entryOrg: '武威市财政局',
    entryPerson: '王珊',
    remark: '来源材料缺少正式整改结果，暂不入库。',
    category: '预算绩效 / 自评管理 / 资料一致性',
    lifecycle: 'rejected',
    quality: '阻断',
    tagStatus: '未识别',
    duplicate: '无',
    importTime: '2026-07-13 14:18',
    rejectedTime: '2026-07-16 11:05',
    rejectedReason: '来源材料缺少正式整改结果，暂不入库。',
    rejectedBy: '王珊',
    useCount: 0,
    recommendCount: 0,
    analysisCount: 0,
    typicalRefCount: 0,
    lastUsed: '-',
    tags: ['资料口径', '待补充'],
    aiConfidence: 51,
  },
];

const NEW_CASE_TEMPLATE: CaseRow = {
  id: 'case-new',
  code: '保存后生成',
  title: '',
  originalTitle: '',
  summary: '',
  sourceType: '日常监督形成',
  sourceInfo: '手动新增',
  sourceUnit: '',
  sourceRawText: '',
  relatedSource: [
    { label: '来源名称', value: '' },
    { label: '来源说明', value: '' },
  ],
  region: '',
  occurrenceTime: '',
  involvedSubject: '',
  entryOrg: '当前机构',
  entryPerson: '当前用户',
  remark: '',
  category: '',
  lifecycle: 'pending',
  quality: '正常',
  tagStatus: '未识别',
  duplicate: '无',
  importTime: '保存后生成',
  useCount: 0,
  recommendCount: 0,
  analysisCount: 0,
  typicalRefCount: 0,
  lastUsed: '-',
  tags: [],
  aiConfidence: 0,
};

const TAB_ITEMS = [
  { key: 'pending', label: '待入库' },
  { key: 'stored', label: '已入库' },
  { key: 'rejected', label: '不入库' },
  { key: 'disabled', label: '已停用' },
  { key: 'all', label: '全部' },
] as const;

const AI_SUGGESTIONS = [
  { field: '案例标题', current: '专项债券资金绩效目标设置不完整案例', suggestion: '专项债券资金绩效目标缺失整改案例', confidence: 91, source: '问题整改报告 第2页', status: '待确认' },
  { field: '案例标签', current: '专项债券、绩效目标、资金用途', suggestion: '专项债券、绩效目标不完整、资金用途不清晰', confidence: 84, source: '标签规则 V2', status: '待确认' },
  { field: '案例描述', current: '绩效目标未覆盖全过程', suggestion: '项目绩效目标未覆盖资金安排、执行监控和整改闭环', confidence: 88, source: '整改方案 第1页', status: '待确认' },
];

const QUALITY_ISSUES = [
  { level: '阻断', name: '案例标签缺失', field: '案例标签', advice: '确认至少一个正式案例标签后可入库。', done: false },
  { level: '提醒', name: '疑似相似案例未确认', field: '相似案例', advice: '建议查看相似度 86% 的历史案例后再确认。', done: false },
  { level: '信息', name: '来源材料已识别', field: '来源详情', advice: '已从问题整改报告中提取主要事实。', done: true },
];

type InsightPattern = {
  id: string;
  name: string;
  description: string;
  conclusion: string;
  caseCount: number;
  recurrence: number;
  riskLevel: '高频高风险' | '高频需跟进' | '区域集中' | '持续关注';
  processStatus: '待确认' | '已确认' | '已申请典型' | '已形成典型';
  budgetStage: string;
  fundType: string;
  businessDimension: string;
  judgementMethod: string;
  judgementCriteria: string[];
  representativeStatus: '代表性充分' | '待人工确认' | '需补充样本';
  representativeReason: string;
  representativeAdvice: string;
  tags: string[];
  repeatedSigns: string[];
  coCauses: string[];
  rectifications: string[];
  riskFocus: string[];
  caseIds: string[];
  typicalCandidate: string;
};

type InsightCase = {
  id: string;
  code: string;
  title: string;
  region: string;
  source: CaseSourceType;
  unit: string;
  budgetStage: string;
  fundType: string;
  issueFeature: string;
  evidence: string;
  score: number;
  status: '已入库';
};

type UnclusteredCase = InsightCase & {
  unclusteredReason: string;
  suggestedAction: string;
};

type TypicalCaseType = '共性问题案例' | '问责类典型案例' | '整改成效案例';
type TypicalCaseStatus = '待提交' | '待审核' | '被退回' | '已发布';
type TypicalCaseApplicationStatus = Extract<TypicalCaseStatus, '待提交' | '被退回' | '已发布'> | '全部';
type TypicalCaseReviewStatus = Extract<TypicalCaseStatus, '待审核' | '被退回' | '已发布'> | '全部';

type TypicalCase = {
  id: string;
  code: string;
  title: string;
  type: TypicalCaseType;
  status: TypicalCaseStatus;
  source: '聚类分析生成' | '一般案例加工' | '问题库申报' | '专项监督沉淀';
  field: string;
  region: string;
  submitOrg: string;
  submitPerson: string;
  createdTime: string;
  publishTime: string;
  relatedGeneralCases: string[];
  relatedProblems: string[];
  insightName: string;
  typicalReason: string;
  summary: string;
  governanceValue: string;
  applicableScenarios: string[];
  accountabilityInfo: string;
  systemImprovement: string;
  reviewOpinion: string;
  attachments: string[];
};

const COMMON_RANGE_FACETS = [
  { label: '年度', options: ['2026年度', '2025年度', '近三年', '时间不详'] },
  { label: '来源类型', options: ['全部来源', ...SOURCE_TYPE_ITEMS] },
  { label: '区划', options: ['全省', '兰州市', '张掖市', '金昌市', '酒泉市', '区划不详'] },
];

const COMMON_BUDGET_STAGE_OPTIONS = ['全部环节', '预算编制', '预算执行', '决算', '绩效评价', '整改落实'];
const COMMON_FUND_TYPE_OPTIONS = ['全部资金类型', '专项债券资金', '政府采购资金', '财政暂付款', '惠民惠农补贴', '一般公共预算资金', '国有资产', '部门决算', '内控管理'];
const COMMON_PATTERN_STATUS_TABS: Array<InsightPattern['processStatus'] | '全部'> = ['全部', '待确认', '已确认', '已申请典型', '已形成典型'];
const COMMON_INSIGHT_CASES: InsightCase[] = [
  {
    id: 'ci-001',
    code: 'AL-2026-0001',
    title: '专项债券资金绩效目标设置不完整案例',
    region: '兰州市',
    source: '日常监督形成',
    unit: '兰州市财政局',
    budgetStage: '预算编制',
    fundType: '专项债券资金',
    issueFeature: '绩效目标未覆盖资金安排、执行监控和整改闭环',
    evidence: '整改报告第2页、绩效目标补充表',
    score: 92,
    status: '已入库',
  },
  {
    id: 'ci-002',
    code: 'AL-2026-0018',
    title: '专项债券项目资金用途调整未同步绩效目标案例',
    region: '定西市',
    source: '专项监督形成',
    unit: '定西市财政局',
    budgetStage: '预算执行',
    fundType: '专项债券资金',
    issueFeature: '资金用途调整后未同步调整绩效指标',
    evidence: '专项监督底稿、项目调整批复',
    score: 88,
    status: '已入库',
  },
  {
    id: 'ci-003',
    code: 'AL-2026-0024',
    title: '专项债券项目执行台账缺少绩效跟踪记录案例',
    region: '白银市',
    source: '日常监督形成',
    unit: '白银市财政局',
    budgetStage: '预算执行',
    fundType: '专项债券资金',
    issueFeature: '台账仅记录资金拨付，缺少绩效跟踪节点',
    evidence: '项目台账、整改验收记录',
    score: 84,
    status: '已入库',
  },
  {
    id: 'ci-004',
    code: 'AL-2026-0031',
    title: '政府采购合同履约资料缺失整改案例',
    region: '张掖市',
    source: '专项监督形成',
    unit: '张掖市财政局',
    budgetStage: '预算执行',
    fundType: '政府采购资金',
    issueFeature: '验收记录、合同履约说明和责任分工缺失',
    evidence: '采购整改案例导入表、验收资料补正清单',
    score: 89,
    status: '已入库',
  },
  {
    id: 'ci-005',
    code: 'AL-2026-0042',
    title: '采购项目验收附件与付款进度不匹配案例',
    region: '平凉市',
    source: '日常监督形成',
    unit: '平凉市财政局',
    budgetStage: '决算',
    fundType: '政府采购资金',
    issueFeature: '付款进度早于完整验收资料归档',
    evidence: '付款凭证、验收资料补正说明',
    score: 82,
    status: '已入库',
  },
  {
    id: 'ci-006',
    code: 'AL-2026-0056',
    title: '财政暂付款清理责任分解案例',
    region: '金昌市',
    source: '日常监督形成',
    unit: '金昌市财政局',
    budgetStage: '预算执行',
    fundType: '财政暂付款',
    issueFeature: '长期挂账、责任单位不清、月度督办不到位',
    evidence: '暂付款清理台账、责任清单',
    score: 90,
    status: '已入库',
  },
  {
    id: 'ci-007',
    code: 'AL-2026-0063',
    title: '惠民补贴发放名单重复问题案例',
    region: '酒泉市',
    source: '外部公开案例',
    unit: '酒泉市财政局',
    budgetStage: '预算执行',
    fundType: '惠民惠农补贴',
    issueFeature: '补贴名单重复、发放前缺少跨表比对',
    evidence: '公开通报网页快照、追回台账',
    score: 86,
    status: '已入库',
  },
  {
    id: 'ci-008',
    code: 'AL-2026-0072',
    title: '行政事业单位资产处置未履行评估审批案例',
    region: '天水市',
    source: '上级下发',
    unit: '天水市财政局',
    budgetStage: '整改落实',
    fundType: '国有资产',
    issueFeature: '资产处置前评估、审批和公示程序缺失',
    evidence: '上级检查通报、资产处置审批补正材料',
    score: 87,
    status: '已入库',
  },
  {
    id: 'ci-009',
    code: 'AL-2026-0084',
    title: '办公设备处置台账与实物核销不一致案例',
    region: '庆阳市',
    source: '日常监督形成',
    unit: '庆阳市财政局',
    budgetStage: '整改落实',
    fundType: '国有资产',
    issueFeature: '处置台账、实物移交和账务核销时间不一致',
    evidence: '资产台账、实物移交单、整改验收单',
    score: 81,
    status: '已入库',
  },
  {
    id: 'ci-010',
    code: 'AL-2026-0095',
    title: '部门预算项目入库论证材料不完整案例',
    region: '武威市',
    source: '日常监督形成',
    unit: '武威市财政局',
    budgetStage: '预算编制',
    fundType: '一般公共预算资金',
    issueFeature: '项目立项依据、绩效目标和测算明细缺失',
    evidence: '预算项目库导出表、项目申报材料补正记录',
    score: 85,
    status: '已入库',
  },
  {
    id: 'ci-011',
    code: 'AL-2026-0106',
    title: '预算项目测算依据与绩效目标脱节案例',
    region: '临夏州',
    source: '专项监督形成',
    unit: '临夏州财政局',
    budgetStage: '预算编制',
    fundType: '一般公共预算资金',
    issueFeature: '资金测算口径、绩效目标和项目实施内容对应关系不足',
    evidence: '预算评审意见、项目申报文本',
    score: 83,
    status: '已入库',
  },
  {
    id: 'ci-012',
    code: 'AL-2026-0117',
    title: '部门决算公开数据与报表口径不一致案例',
    region: '陇南市',
    source: '外部公开案例',
    unit: '陇南市财政局',
    budgetStage: '决算',
    fundType: '部门决算',
    issueFeature: '公开文本金额、决算报表和说明口径不一致',
    evidence: '公开网页快照、决算报表比对表',
    score: 80,
    status: '已入库',
  },
  {
    id: 'ci-013',
    code: 'AL-2026-0128',
    title: '三公经费决算说明缺少变动原因案例',
    region: '甘南州',
    source: '上级下发',
    unit: '甘南州财政局',
    budgetStage: '决算',
    fundType: '部门决算',
    issueFeature: '三公经费变动原因、压减措施和公开说明不完整',
    evidence: '决算公开检查清单、补充说明材料',
    score: 78,
    status: '已入库',
  },
  {
    id: 'ci-014',
    code: 'AL-2026-0139',
    title: '财政资金支付审批流程越级补签案例',
    region: '张掖市',
    source: '专项监督形成',
    unit: '张掖市财政局',
    budgetStage: '预算执行',
    fundType: '内控管理',
    issueFeature: '支付审批存在事后补签、越级审批和附件缺失',
    evidence: '支付审批流日志、内控整改报告',
    score: 91,
    status: '已入库',
  },
  {
    id: 'ci-015',
    code: 'AL-2026-0146',
    title: '整改佐证材料与销号结论不一致案例',
    region: '区划不详',
    source: '其他来源',
    unit: '某预算单位',
    budgetStage: '整改落实',
    fundType: '内控管理',
    issueFeature: '整改佐证材料不足，但销号结论已先行形成',
    evidence: '整改销号表、佐证材料审核意见',
    score: 84,
    status: '已入库',
  },
];

const COMMON_UNCLUSTERED_CASES: UnclusteredCase[] = [
  {
    id: 'uc-001',
    code: 'AL-2026-0201',
    title: '预算单位会议费附件归类不清案例',
    region: '兰州市',
    source: '日常监督形成',
    unit: '某预算单位',
    budgetStage: '预算执行',
    fundType: '一般公共预算资金',
    issueFeature: '会议通知、签到表和报销附件之间对应关系不清',
    evidence: '报销凭证、会议资料目录',
    score: 57,
    status: '已入库',
    unclusteredReason: '问题表现偏具体，缺少可复用的原因和整改方式，暂未形成稳定共性链条。',
    suggestedAction: '补充会议费审核标签后，再判断是否归入费用报销附件完整性问题。',
  },
  {
    id: 'uc-002',
    code: 'AL-2026-0208',
    title: '历史项目批复材料缺少原始编号案例',
    region: '张掖市',
    source: '上级下发',
    unit: '张掖市财政局',
    budgetStage: '整改落实',
    fundType: '一般公共预算资金',
    issueFeature: '历史批复材料存在扫描件缺页和原始编号缺失',
    evidence: '上级核查清单、历史批复扫描件',
    score: 54,
    status: '已入库',
    unclusteredReason: '材料缺失属于历史数据质量问题，与当前共性问题的业务链条关联弱。',
    suggestedAction: '先补齐来源编号和项目类型，再纳入历史材料补正类分析。',
  },
  {
    id: 'uc-003',
    code: 'AL-2026-0213',
    title: '村级公益事业奖补台账字段缺失案例',
    region: '陇南市',
    source: '其他来源',
    unit: '某乡镇财政所',
    budgetStage: '预算执行',
    fundType: '惠民惠农补贴',
    issueFeature: '台账缺少受益对象身份证号和项目验收日期',
    evidence: '乡镇台账导入表',
    score: 61,
    status: '已入库',
    unclusteredReason: '字段缺失较多，无法稳定判断是补贴发放问题还是台账质量问题。',
    suggestedAction: '补充受益对象、发放批次和验收结果后再重新聚类。',
  },
  {
    id: 'uc-004',
    code: 'AL-2026-0220',
    title: '政府购买服务合同续签依据不足案例',
    region: '金昌市',
    source: '专项监督形成',
    unit: '金昌市财政局',
    budgetStage: '预算编制',
    fundType: '政府采购资金',
    issueFeature: '合同续签说明缺少服务绩效评价和价格测算依据',
    evidence: '购买服务合同、续签说明',
    score: 63,
    status: '已入库',
    unclusteredReason: '同时涉及采购履约、预算编制和绩效评价，当前特征分散。',
    suggestedAction: '人工确认主问题后，可归入购买服务绩效支撑不足或采购履约资料不足。',
  },
  {
    id: 'uc-005',
    code: 'AL-2026-0227',
    title: '非税收入票据作废说明不完整案例',
    region: '酒泉市',
    source: '日常监督形成',
    unit: '酒泉市财政局',
    budgetStage: '预算执行',
    fundType: '一般公共预算资金',
    issueFeature: '票据作废原因、复核人和系统记录之间缺少一致性说明',
    evidence: '票据作废清单、系统日志',
    score: 58,
    status: '已入库',
    unclusteredReason: '当前共性问题集中在支出和整改场景，非税票据样本量不足。',
    suggestedAction: '等待补充同类非税收入案例后再形成新聚类。',
  },
  {
    id: 'uc-006',
    code: 'AL-2026-0235',
    title: '会计凭证摘要表述不规范案例',
    region: '白银市',
    source: '外部公开案例',
    unit: '某行政事业单位',
    budgetStage: '决算',
    fundType: '部门决算',
    issueFeature: '凭证摘要表述笼统，无法对应具体经济事项',
    evidence: '公开案例摘录、凭证样例',
    score: 52,
    status: '已入库',
    unclusteredReason: '文本信息较短，缺少形成原因和整改动作，AI 仅识别为低置信标签。',
    suggestedAction: '补充凭证附件、整改说明和会计科目后再重新分析。',
  },
  {
    id: 'uc-007',
    code: 'AL-2026-0241',
    title: '绩效自评附件无法对应项目编码案例',
    region: '武威市',
    source: '日常监督形成',
    unit: '武威市财政局',
    budgetStage: '绩效评价',
    fundType: '一般公共预算资金',
    issueFeature: '自评附件缺少项目编码，难以与预算项目库记录对应',
    evidence: '绩效自评表、项目编码对照表',
    score: 66,
    status: '已入库',
    unclusteredReason: '与项目入库论证问题相近，但发生在绩效评价后端，暂未自动合并。',
    suggestedAction: '人工确认是否作为绩效评价材料完整性问题单独聚类。',
  },
  {
    id: 'uc-008',
    code: 'AL-2026-0249',
    title: '资产出租收益入账时间不清案例',
    region: '庆阳市',
    source: '专项监督形成',
    unit: '庆阳市财政局',
    budgetStage: '预算执行',
    fundType: '国有资产',
    issueFeature: '资产出租合同、收款凭证和入账时间之间缺少说明',
    evidence: '资产出租合同、收款凭证',
    score: 60,
    status: '已入库',
    unclusteredReason: '与资产处置类问题同属资产管理，但问题链条转向收入入账，暂不合并。',
    suggestedAction: '补充资产收益管理案例后，可形成资产收益入账类聚类。',
  },
  {
    id: 'uc-009',
    code: 'AL-2026-0256',
    title: '培训费预算调剂说明缺少审批链案例',
    region: '临夏州',
    source: '其他来源',
    unit: '某主管部门',
    budgetStage: '预算执行',
    fundType: '一般公共预算资金',
    issueFeature: '培训费调剂说明存在，但缺少完整审批流和调剂依据',
    evidence: '预算调剂说明、审批截图',
    score: 59,
    status: '已入库',
    unclusteredReason: '费用类型、审批流程和预算调剂三个特征权重接近，AI 未能确定主类。',
    suggestedAction: '人工选择主标签后再重新聚类。',
  },
  {
    id: 'uc-010',
    code: 'AL-2026-0262',
    title: '乡镇补助资金拨付对象信息缺字段案例',
    region: '甘南州',
    source: '日常监督形成',
    unit: '某乡镇财政所',
    budgetStage: '预算执行',
    fundType: '惠民惠农补贴',
    issueFeature: '拨付对象名称、账号和行政村编码存在缺项',
    evidence: '拨付台账、银行回单',
    score: 62,
    status: '已入库',
    unclusteredReason: '更接近数据质量问题，未能和补贴重复发放共性问题稳定匹配。',
    suggestedAction: '补充发放前校验记录后再判断是否归入补贴校验不足类。',
  },
  {
    id: 'uc-011',
    code: 'AL-2026-0270',
    title: '项目结余资金退回凭证未关联案例',
    region: '天水市',
    source: '上级下发',
    unit: '天水市财政局',
    budgetStage: '决算',
    fundType: '专项债券资金',
    issueFeature: '结余资金退回凭证未与项目台账和决算说明关联',
    evidence: '资金退回凭证、项目台账',
    score: 64,
    status: '已入库',
    unclusteredReason: '涉及专项债、决算和资金退回，和已有专项债绩效目标类差异较大。',
    suggestedAction: '建议暂存，等待补充结余资金退回类案例。',
  },
  {
    id: 'uc-012',
    code: 'AL-2026-0278',
    title: '分散采购备案材料单一案例',
    region: '平凉市',
    source: '专项监督形成',
    unit: '平凉市财政局',
    budgetStage: '预算执行',
    fundType: '政府采购资金',
    issueFeature: '仅有备案表，缺少采购需求、比选记录和验收说明',
    evidence: '分散采购备案表',
    score: 56,
    status: '已入库',
    unclusteredReason: '材料样本过少，无法判断是资料缺失还是采购方式选择问题。',
    suggestedAction: '补充采购过程材料后，再与采购履约资料缺失类比对。',
  },
  {
    id: 'uc-013',
    code: 'AL-2026-0286',
    title: '历史整改事项来源编号缺失案例',
    region: '区划不详',
    source: '其他来源',
    unit: '来源单位不详',
    budgetStage: '整改落实',
    fundType: '内控管理',
    issueFeature: '整改事项描述完整，但缺少问题来源编号和责任单位',
    evidence: '历史整改台账摘录',
    score: 50,
    status: '已入库',
    unclusteredReason: '区划、来源和责任主体缺失，无法计算同类案例代表性。',
    suggestedAction: '先补齐来源编号、责任单位和区划，再参与聚类。',
  },
];

const COMMON_INSIGHT_PATTERNS: InsightPattern[] = [
  {
    id: 'bond-performance',
    name: '专项债券绩效目标与资金用途不一致',
    description: '专项债券项目在绩效目标编制、资金用途调整和整改验收中存在口径不同步，容易造成项目执行与绩效评价脱节。',
    conclusion: '同类问题主要集中在项目调整、资金拨付和绩效跟踪三个环节，整改多采用补充指标、完善台账和验收复核。',
    caseCount: 42,
    recurrence: 86,
    riskLevel: '高频高风险',
    processStatus: '已申请典型',
    budgetStage: '预算编制 / 预算执行',
    fundType: '专项债券资金',
    businessDimension: '绩效目标管理',
    judgementMethod: '同类问题以“绩效目标与资金用途口径不一致”为主线，结合预算编制、预算执行两个环节，按问题表现重复、形成原因共现和整改方式可复用进行归类。',
    judgementCriteria: ['问题表现重复', '原因组合共现', '整改方式可复用', '资金类型一致'],
    representativeStatus: '代表性充分',
    representativeReason: '覆盖 42 件一般案例，来源包括日常监督形成和专项监督形成，涉及多个地区和项目单位。',
    representativeAdvice: '可作为专项债券绩效目标回头看和典型案例申报基础。',
    tags: ['专项债券', '绩效目标', '资金用途', '台账跟踪'],
    repeatedSigns: ['绩效指标未覆盖资金使用全过程', '资金用途调整后未同步调整绩效目标', '整改验收只核材料、不核绩效结果'],
    coCauses: ['项目前期论证不充分 + 绩效目标拆分过粗', '资金拨付进度压力 + 执行监控台账缺失', '部门协同口径不一致 + 验收复核责任不清'],
    rectifications: ['补充项目绩效指标', '重建资金使用台账', '增加月度跟踪和验收复核', '纳入专项债券回头看清单'],
    riskFocus: ['兰州市 12 件', '白银市 8 件', '项目实施单位 26 家', '交通和市政领域集中'],
    caseIds: ['ci-001', 'ci-002', 'ci-003'],
    typicalCandidate: '专项债券资金绩效目标设置不完整案例',
  },
  {
    id: 'purchase-material',
    name: '政府采购合同履约资料缺失',
    description: '采购项目验收、履约和付款材料之间缺少一致性校验，导致后续整改需要补齐资料链条。',
    conclusion: '问题常与验收节点不清、付款资料归档滞后同时出现，适合形成采购履约资料完整性回头看清单。',
    caseCount: 31,
    recurrence: 79,
    riskLevel: '高频需跟进',
    processStatus: '已确认',
    budgetStage: '预算执行 / 决算',
    fundType: '政府采购资金',
    businessDimension: '采购履约管理',
    judgementMethod: '以采购合同履约资料缺失为主问题，结合验收资料、付款进度和决算归档链条，判断是否属于同一类采购履约管理问题。',
    judgementCriteria: ['验收资料缺失', '付款链条相近', '资料补正方式一致', '政府采购资金同类'],
    representativeStatus: '待人工确认',
    representativeReason: '覆盖 31 件一般案例，但“资料缺失”和“付款进度不匹配”是否合并为同一共性问题仍需业务确认。',
    representativeAdvice: '建议在确认结果前复核关联案例集合，必要时拆分为履约资料缺失和付款资料不一致两类。',
    tags: ['政府采购', '合同履约', '资料缺失', '付款进度'],
    repeatedSigns: ['验收资料缺少关键附件', '合同履约说明与付款凭证不一致', '责任分工和补正时限不明确'],
    coCauses: ['采购验收节点前置不足 + 附件归档责任不清', '付款审核侧重金额合规 + 履约材料复核弱', '项目单位人员更替 + 台账交接不完整'],
    rectifications: ['补齐验收记录', '建立履约资料清单', '付款前增加资料核验', '按采购项目形成同类案例清单'],
    riskFocus: ['张掖市 9 件', '平凉市 6 件', '采购项目实施单位 18 家', '工程服务类项目集中'],
    caseIds: ['ci-004', 'ci-005'],
    typicalCandidate: '政府采购合同履约资料缺失整改案例',
  },
  {
    id: 'temporary-payment',
    name: '财政暂付款长期挂账清理责任不实',
    description: '暂付款清理中责任主体、压降节点和督办机制不够明确，容易形成长期挂账和整改不实。',
    conclusion: '同类案例表现为长期挂账、责任拆分粗和压降计划缺少刚性约束，整改方式集中在责任清单和月度督办。',
    caseCount: 24,
    recurrence: 73,
    riskLevel: '持续关注',
    processStatus: '待确认',
    budgetStage: '预算执行',
    fundType: '财政暂付款',
    businessDimension: '财政运行管理',
    judgementMethod: '以暂付款长期挂账和清理责任不实为同类判断主线，重点核对责任清单、压降计划和月度督办是否形成相同问题链。',
    judgementCriteria: ['长期挂账', '责任分解不实', '督办方式相近', '预算执行环节一致'],
    representativeStatus: '需补充样本',
    representativeReason: '当前关联案例样本偏少，虽然聚类覆盖 24 件，但可用于典型沉淀的代表性案例链条仍不充分。',
    representativeAdvice: '建议先补充省本级、其他市州和不同预算单位的暂付款清理案例，再申请典型案例。',
    tags: ['暂付款', '清理压降', '责任分解', '月度督办'],
    repeatedSigns: ['暂付款长期未清理', '责任单位和责任人未逐项落表', '压降计划缺少分月节点'],
    coCauses: ['历史遗留事项跨度长 + 责任边界不清', '预算单位资料补充慢 + 财政督办频次不足', '清理计划年度化 + 月度跟踪弱'],
    rectifications: ['建立逐项责任清单', '制定分年度压降计划', '月度督办通报', '纳入财政运行风险跟踪'],
    riskFocus: ['金昌市 7 件', '省本级 5 件', '预算单位 21 家', '财政运行领域集中'],
    caseIds: ['ci-006'],
    typicalCandidate: '财政暂付款清理责任分解案例',
  },
  {
    id: 'subsidy-duplicate',
    name: '惠民补贴名单重复与发放前校验不足',
    description: '惠民补贴发放前名单比对和跨部门数据同步不足，导致重复发放问题反复出现。',
    conclusion: '重复发放问题通常与名单比对、跨部门数据同步和发放前复核不足关联，可直接沉淀为回头看核验清单。',
    caseCount: 18,
    recurrence: 68,
    riskLevel: '区域集中',
    processStatus: '已形成典型',
    budgetStage: '预算执行',
    fundType: '惠民惠农补贴',
    businessDimension: '补贴发放管理',
    judgementMethod: '以补贴名单重复和发放前校验不足为共性主线，结合名单比对、跨部门数据同步和追回整改闭环进行归类。',
    judgementCriteria: ['名单重复', '发放前校验不足', '整改闭环相近', '资金类型一致'],
    representativeStatus: '代表性充分',
    representativeReason: '同类问题覆盖 18 件案例，来源包括外部公开案例和日常监督形成，问题表现清晰且整改方式可复用。',
    representativeAdvice: '已具备形成典型案例和回头看核验清单的基础。',
    tags: ['惠民补贴', '一卡通', '名单比对', '重复发放'],
    repeatedSigns: ['同一人员重复进入补贴名单', '发放前缺少跨表比对', '追回和流程校验记录不完整'],
    coCauses: ['部门名单更新不同步 + 发放前校验规则缺失', '基层审核依赖人工比对 + 系统预警未闭环', '公开通报后整改留痕不足'],
    rectifications: ['补贴发放名单比对', '追回重复补贴', '补充流程校验规则', '形成同类公开案例跟踪清单'],
    riskFocus: ['酒泉市 6 件', '陇南市 5 件', '乡镇发放单位 15 家', '惠民惠农领域集中'],
    caseIds: ['ci-007'],
    typicalCandidate: '惠民补贴发放名单重复问题案例',
  },
  {
    id: 'asset-disposal',
    name: '行政事业单位资产处置程序不完整',
    description: '资产处置过程中评估、审批、公示、实物移交和账务核销链条不完整，导致账实不符和处置程序风险。',
    conclusion: '同类问题多发生在整改落实阶段，表现为先处置后补手续、处置台账与实物核销不同步，适合形成资产处置回头看清单。',
    caseCount: 27,
    recurrence: 76,
    riskLevel: '高频需跟进',
    processStatus: '待确认',
    budgetStage: '整改落实',
    fundType: '国有资产',
    businessDimension: '资产处置管理',
    judgementMethod: '以资产处置流程缺口为主线，按评估审批、公示移交和账务核销三个节点识别同类问题。',
    judgementCriteria: ['处置程序缺失', '账实核销不一致', '整改节点相近', '资产类型一致'],
    representativeStatus: '待人工确认',
    representativeReason: '当前覆盖资产处置审批和账实核销两类表现，需要人工确认是否保留为一个共性问题。',
    representativeAdvice: '建议抽查不同单位的资产处置资料，确认评估审批缺失和账实核销不一致是否属于同一问题链。',
    tags: ['国有资产', '资产处置', '评估审批', '账实不符'],
    repeatedSigns: ['处置前评估审批资料缺失', '实物移交和账务核销不同步', '处置后公示和备案材料不完整'],
    coCauses: ['资产管理员变动 + 台账交接不完整', '处置流程重实物轻审批 + 财务核销滞后', '整改验收只看补正材料 + 未核账实一致'],
    rectifications: ['补齐资产处置审批链条', '核对实物移交和账务核销', '建立资产处置台账抽查清单', '纳入单位内控整改'],
    riskFocus: ['天水市 8 件', '庆阳市 6 件', '行政事业单位 17 家', '办公设备和专用设备处置集中'],
    caseIds: ['ci-008', 'ci-009'],
    typicalCandidate: '行政事业单位资产处置未履行评估审批案例',
  },
  {
    id: 'project-entry',
    name: '预算项目入库论证与绩效目标支撑不足',
    description: '预算项目入库时立项依据、测算明细、绩效目标和实施内容之间支撑关系不足，影响预算编制质量。',
    conclusion: '同类问题集中在预算编制前端，表现为项目材料不完整、测算依据薄弱和绩效目标脱节。',
    caseCount: 22,
    recurrence: 71,
    riskLevel: '持续关注',
    processStatus: '已确认',
    budgetStage: '预算编制',
    fundType: '一般公共预算资金',
    businessDimension: '项目库管理',
    judgementMethod: '以项目入库论证材料和绩效目标支撑关系为主线，识别预算编制前端的同类质量问题。',
    judgementCriteria: ['项目论证不足', '绩效目标脱节', '测算依据薄弱', '预算编制环节一致'],
    representativeStatus: '代表性充分',
    representativeReason: '覆盖项目申报材料缺失、测算依据不足和绩效目标脱节等典型表现，问题链条较完整。',
    representativeAdvice: '可沉淀为预算项目入库审核和绩效目标前置核验的同类案例清单。',
    tags: ['预算编制', '项目库', '绩效目标', '测算依据'],
    repeatedSigns: ['立项依据和必要性论证不完整', '测算明细无法支撑预算金额', '绩效目标与项目实施内容对应不足'],
    coCauses: ['项目储备时间紧 + 论证模板执行弱', '业务部门重申报金额 + 绩效目标拆解不足', '预算评审意见反馈后整改留痕不完整'],
    rectifications: ['补充项目入库论证材料', '完善资金测算明细', '重设绩效目标和指标值', '纳入下一年度预算编制提醒'],
    riskFocus: ['武威市 7 件', '临夏州 5 件', '部门项目 19 个', '民生服务和运维项目较集中'],
    caseIds: ['ci-010', 'ci-011'],
    typicalCandidate: '部门预算项目入库论证材料不完整案例',
  },
  {
    id: 'final-account-open',
    name: '部门决算公开口径与报表不一致',
    description: '部门决算公开文本、决算报表和说明材料之间口径不一致，容易影响公开质量和社会监督效果。',
    conclusion: '问题多集中在决算公开阶段，常见表现为金额口径不一致、三公经费变动说明缺失和公开说明滞后。',
    caseCount: 16,
    recurrence: 64,
    riskLevel: '区域集中',
    processStatus: '待确认',
    budgetStage: '决算',
    fundType: '部门决算',
    businessDimension: '决算公开管理',
    judgementMethod: '以决算公开文本和决算报表口径一致性为主线，结合三公经费说明、公开时限和补充说明材料归类。',
    judgementCriteria: ['公开口径不一致', '报表说明缺失', '决算环节一致', '整改材料相近'],
    representativeStatus: '需补充样本',
    representativeReason: '当前案例能体现公开口径问题，但地区和单位样本仍偏少。',
    representativeAdvice: '建议补充省本级和区县部门决算公开检查案例，再判断是否申请典型案例。',
    tags: ['部门决算', '公开说明', '三公经费', '口径一致性'],
    repeatedSigns: ['公开文本金额与决算报表不一致', '三公经费变动原因说明缺失', '公开说明和补充材料归档滞后'],
    coCauses: ['公开模板复用旧口径 + 报表更新未同步', '经办人员对公开说明要求理解不足', '审核关注公开时限 + 口径复核不足'],
    rectifications: ['复核公开文本和决算报表', '补充三公经费变动说明', '建立公开前交叉审核清单', '留存公开网页和报表比对材料'],
    riskFocus: ['陇南市 4 件', '甘南州 3 件', '县区预算单位 12 家', '三公经费说明问题集中'],
    caseIds: ['ci-012', 'ci-013'],
    typicalCandidate: '部门决算公开数据与报表口径不一致案例',
  },
  {
    id: 'internal-approval',
    name: '财政资金支付审批流程控制不足',
    description: '财政资金支付审批中存在事后补签、越级审批、附件缺失等内控薄弱问题，影响支付合规性和责任追溯。',
    conclusion: '问题集中在预算执行和内控审批交叉环节，整改方式多为重建审批流程、补充附件和强化系统留痕。',
    caseCount: 14,
    recurrence: 61,
    riskLevel: '高频高风险',
    processStatus: '已申请典型',
    budgetStage: '预算执行',
    fundType: '内控管理',
    businessDimension: '支付审批内控',
    judgementMethod: '以支付审批流程缺陷为主线，按审批权限、附件完整性和系统留痕一致性识别同类内控风险。',
    judgementCriteria: ['审批权限异常', '附件资料缺失', '系统留痕相近', '预算执行环节一致'],
    representativeStatus: '代表性充分',
    representativeReason: '审批越级、事后补签和附件缺失三个表现明确，具有较强警示和制度完善价值。',
    representativeAdvice: '适合转入典型案例申报，并同步形成支付审批内控回头看事项。',
    tags: ['内控管理', '支付审批', '越级审批', '系统留痕'],
    repeatedSigns: ['审批流程存在事后补签', '支付附件缺少关键依据', '审批权限和岗位职责不匹配'],
    coCauses: ['业务办理时限压力 + 内控节点绕行', '系统权限配置粗放 + 复核岗位责任弱', '附件上传要求不清 + 审批留痕检查不足'],
    rectifications: ['重设支付审批权限', '补齐支付附件', '启用系统流程留痕复核', '纳入内控评价问题清单'],
    riskFocus: ['张掖市 5 件', '省本级 4 件', '资金支付岗位集中', '项目资金支付场景突出'],
    caseIds: ['ci-014'],
    typicalCandidate: '财政资金支付审批流程越级补签案例',
  },
  {
    id: 'rectification-evidence',
    name: '整改佐证材料不足与销号结论先行',
    description: '整改销号环节存在佐证材料不足、审核意见不完整或销号结论先行的问题，影响整改闭环真实性。',
    conclusion: '同类问题体现为整改材料、审核意见和销号结论之间证据链不完整，适合作为回头看核验重点。',
    caseCount: 12,
    recurrence: 58,
    riskLevel: '持续关注',
    processStatus: '已确认',
    budgetStage: '整改落实',
    fundType: '内控管理',
    businessDimension: '整改闭环管理',
    judgementMethod: '以整改证据链完整性为主线，按佐证材料、审核意见和销号结论是否一致识别同类问题。',
    judgementCriteria: ['佐证材料不足', '销号结论先行', '审核意见不完整', '整改落实环节一致'],
    representativeStatus: '待人工确认',
    representativeReason: '当前样本能体现整改闭环风险，但区划和来源信息存在缺失，需要人工复核代表性。',
    representativeAdvice: '建议补充区划明确、来源清晰的整改销号案例，再作为典型案例候选。',
    tags: ['整改落实', '佐证材料', '销号审核', '闭环管理'],
    repeatedSigns: ['整改佐证材料不足', '审核意见未说明采信依据', '销号结论早于完整材料归档'],
    coCauses: ['整改时限压力 + 材料审核标准不统一', '销号流程重结论 + 证据链复核不足', '问题来源复杂 + 责任单位补证不及时'],
    rectifications: ['补充整改佐证材料', '完善审核采信意见', '销号前开展证据链复核', '建立同类问题回头看清单'],
    riskFocus: ['区划不详 4 件', '其他来源 3 件', '预算单位整改事项集中', '销号审核环节突出'],
    caseIds: ['ci-015'],
    typicalCandidate: '整改佐证材料与销号结论不一致案例',
  },
];

const COMMON_CLUSTER_SUMMARY = {
  totalCases: 128,
  clusteredCases: 115,
  unclusteredCases: COMMON_UNCLUSTERED_CASES.length,
  coverageRate: '89.8%',
  commonProblemCount: 9,
};

const TYPICAL_APPLICATION_STATUS_TABS: Array<{ key: TypicalCaseApplicationStatus; label: string }> = [
  { key: '待提交', label: '待提交' },
  { key: '被退回', label: '被退回' },
  { key: '已发布', label: '已发布' },
  { key: '全部', label: '全部' },
];

const TYPICAL_REVIEW_STATUS_TABS: Array<{ key: TypicalCaseReviewStatus; label: string }> = [
  { key: '待审核', label: '待审核' },
  { key: '被退回', label: '被退回' },
  { key: '已发布', label: '已发布' },
  { key: '全部', label: '全部' },
];

const TYPICAL_CASE_TYPES: Array<TypicalCaseType | '全部类型'> = ['全部类型', '共性问题案例', '问责类典型案例', '整改成效案例'];

const TYPICAL_CASE_ROWS: TypicalCase[] = [
  {
    id: 'typical-001',
    code: 'DX-2026-0001',
    title: '专项债券资金绩效目标设置不完整共性问题典型案例',
    type: '共性问题案例',
    status: '待提交',
    source: '聚类分析生成',
    field: '专项债券 / 预算绩效',
    region: '全省',
    submitOrg: '省财政厅监督评价局',
    submitPerson: '陈静',
    createdTime: '2026-07-18 16:20',
    publishTime: '-',
    relatedGeneralCases: ['AL-2026-0001 专项债券资金绩效目标设置不完整案例', 'AL-2026-0018 专项债券项目资金用途调整未同步绩效目标案例', 'AL-2026-0024 专项债券项目执行台账缺少绩效跟踪记录案例'],
    relatedProblems: ['WT-2026-0312 某区专项债项目绩效目标与资金用途不一致'],
    insightName: '专项债券绩效目标与资金用途不一致',
    typicalReason: '覆盖项目调整、资金拨付、绩效跟踪三个高频表现，且关联案例能够说明同类问题的共性原因和整改路径。',
    summary: '多个专项债券项目在资金用途调整、绩效指标维护和整改验收环节存在口径不一致，后续通过补充绩效目标、完善资金台账和增加月度跟踪完成治理。',
    governanceValue: '可作为专项债券项目绩效目标回头看、举一反三检查和项目单位整改培训的样本。',
    applicableScenarios: ['专项债券回头看', '预算绩效目标复核', '项目执行台账抽查'],
    accountabilityInfo: '暂未形成问责处理，重点用于制度完善和整改复盘。',
    systemImprovement: '补充专项债券绩效目标调整留痕规则，增加资金用途调整后的绩效指标同步校验。',
    reviewOpinion: '待补充发布摘要和脱敏口径后提交审核。',
    attachments: ['问题整改报告.pdf', '绩效目标补充表.xlsx', '同类案例清单.xlsx'],
  },
  {
    id: 'typical-002',
    code: 'DX-2026-0002',
    title: '政府采购合同履约资料缺失整改典型案例',
    type: '整改成效案例',
    status: '待审核',
    source: '一般案例加工',
    field: '政府采购 / 合同履约',
    region: '张掖市',
    submitOrg: '张掖市财政局',
    submitPerson: '赵伟',
    createdTime: '2026-07-16 09:12',
    publishTime: '-',
    relatedGeneralCases: ['AL-2026-0031 政府采购合同履约资料缺失整改案例', 'AL-2026-0042 采购项目验收附件与付款进度不匹配案例'],
    relatedProblems: ['CG-2026-0117 采购项目验收资料不完整'],
    insightName: '政府采购合同履约资料缺失',
    typicalReason: '整改链条完整，能够说明从资料缺失到付款前核验规则补强的治理过程。',
    summary: '采购项目验收和履约资料缺少关键附件，经整改补充验收记录、合同履约说明和责任分工，并将资料完整性核验前置到付款审核环节。',
    governanceValue: '可服务采购项目履约资料完整性检查、付款审核规范培训和同类问题整改验收。',
    applicableScenarios: ['采购履约检查', '付款审核复核', '合同资料归档治理'],
    accountabilityInfo: '未触发问责，已明确项目实施单位资料归档责任。',
    systemImprovement: '形成采购履约资料清单模板，增加付款前附件完整性核验项。',
    reviewOpinion: '材料较完整，待审核发布。',
    attachments: ['验收资料补正清单.docx', '采购整改案例导入.xlsx'],
  },
  {
    id: 'typical-003',
    code: 'DX-2026-0003',
    title: '隐性债务化解不实问责典型案例',
    type: '问责类典型案例',
    status: '已发布',
    source: '专项监督沉淀',
    field: '债务监管 / 问责与移送',
    region: '省本级',
    submitOrg: '省财政厅债务处',
    submitPerson: '马宁',
    createdTime: '2026-06-28 14:08',
    publishTime: '2026-07-10 09:30',
    relatedGeneralCases: ['AL-2026-0088 隐性债务化解资料不实案例', 'AL-2026-0093 化债进度佐证材料缺失案例'],
    relatedProblems: ['ZW-2026-0041 隐性债务化解不实'],
    insightName: '隐性债务问责落实',
    typicalReason: '具备监管震慑、问责处理和制度完善三类价值，适合在工作台和监督分析中发布引用。',
    summary: '监督发现部分单位化债资料与实际支付进度不一致，经核实启动问责处理，并同步完善化债资料核验和月度复核机制。',
    governanceValue: '用于压实债务监管责任、形成问责震慑，并作为专项监督评价中“问责落实率”的案例来源。',
    applicableScenarios: ['隐性债务监督', '问责通报', '专项监督评价'],
    accountabilityInfo: '已对相关责任人启动问责处理并形成处理记录。',
    systemImprovement: '完善化债进度佐证材料目录，建立月度复核和异常通报机制。',
    reviewOpinion: '已审核发布，可在首页、辖区分析和专项监督评价中引用。',
    attachments: ['问责处理记录.pdf', '化债资料核验清单.xlsx'],
  },
  {
    id: 'typical-004',
    code: 'DX-2026-0004',
    title: '惠民补贴名单重复发放回头看案例',
    type: '共性问题案例',
    status: '被退回',
    source: '聚类分析生成',
    field: '惠民惠农 / 一卡通',
    region: '酒泉市',
    submitOrg: '酒泉市财政局',
    submitPerson: '李明',
    createdTime: '2026-07-15 11:40',
    publishTime: '-',
    relatedGeneralCases: ['AL-2026-0063 惠民补贴发放名单重复问题案例'],
    relatedProblems: ['HM-2026-0201 一卡通补贴名单重复'],
    insightName: '惠民补贴名单重复与发放前校验不足',
    typicalReason: '能说明名单比对规则缺失造成的重复发放风险，但当前脱敏和追回结果材料不足。',
    summary: '惠民补贴发放名单中存在重复人员，经名单比对、追回重复补贴和流程校验完成整改。',
    governanceValue: '适用于补贴发放前名单比对、公开案例跟踪和基层发放单位培训。',
    applicableScenarios: ['惠民补贴回头看', '一卡通名单校验', '基层单位培训'],
    accountabilityInfo: '暂未形成问责处理。',
    systemImprovement: '建议增加跨表名单比对规则，并要求保留追回和复核记录。',
    reviewOpinion: '退回原因：缺少追回结果附件和脱敏后的公开发布摘要。',
    attachments: ['公开通报网页快照.png'],
  },
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
    } catch {
      setQ({});
    }
  }, []);

  return q;
}

function flattenFeatures() {
  return FEATURES.flatMap((item) => (item.type === 'group' ? item.children : [item]));
}

function FeatureIconMark(props: { Icon: FeatureNode['Icon']; active?: boolean }) {
  const Icon = props.Icon;
  return (
    <span className={`case-nav-icon ${props.active ? 'is-active' : ''}`} aria-hidden="true">
      <Icon size={18} />
    </span>
  );
}

function findFeatureGroup(featureKey: string) {
  return FEATURES.find((item) => item.type === 'group' && item.children.some((child) => child.key === featureKey)) as
    | FeatureGroup
    | undefined;
}

function CurrentFeatureEmpty(props: { feature: FeatureNode; groupName?: string }) {
  return (
    <div className="case-workspace">
      <div className="case-page-head">
        <div>
          <div className="case-kicker">案例库 / {props.groupName || '功能管理'}</div>
          <h1>{props.feature.name}</h1>
        </div>
        <span className="case-status-pill">页面框架已创建</span>
      </div>

      <div className="case-empty-area">
        <div className="case-empty-mark" aria-hidden="true">
          <Database size={34} />
        </div>
        <div className="case-empty-title">{props.feature.name}</div>
        <div className="case-empty-desc">{props.feature.desc}</div>
      </div>
    </div>
  );
}

function statusClass(value: string) {
  if (value.includes('阻断') || value.includes('异常') || value.includes('停用') || value.includes('退回')) return 'is-danger';
  if (value.includes('提醒') || value.includes('待') || value.includes('候选')) return 'is-warning';
  if (value.includes('正常') || value.includes('完成') || value.includes('确认') || value.includes('发布')) return 'is-success';
  return 'is-neutral';
}

function CaseBadge(props: { children: React.ReactNode; tone?: string }) {
  return <span className={`case-badge ${props.tone || statusClass(String(props.children))}`}>{props.children}</span>;
}

function renderTags(tags: string[]) {
  if (!tags.length) return <span className="case-muted">未识别</span>;
  const visible = tags.slice(0, 3);
  const rest = tags.length - visible.length;
  return (
    <span className="case-tag-list">
      {visible.map((tag) => (
        <span className="case-soft-tag" key={tag}>
          {tag}
        </span>
      ))}
      {rest > 0 ? <span className="case-soft-tag">+{rest}</span> : null}
    </span>
  );
}

function renderAttachmentList(attachments?: string[]) {
  if (!attachments?.length) return <span className="case-muted">暂无附件</span>;
  return (
    <span className="case-attachment-list">
      {attachments.map((item) => (
        <button type="button" key={item}>{item}</button>
      ))}
    </span>
  );
}

function getAttachmentRows(activeCase: CaseRow) {
  const sizes = ['1.2M', '864K', '2.4M', '520K'];
  return (activeCase.sourceAttachments || []).map((name, index) => ({
    name,
    size: sizes[index % sizes.length],
    uploadTime: activeCase.importTime || activeCase.storedTime || '-',
  }));
}

function MaterialAttachmentTable(props: { activeCase: CaseRow; readonly?: boolean }) {
  const rows = getAttachmentRows(props.activeCase);
  return (
    <div className="case-material-attachment">
      <table className="case-material-table">
        <thead>
          <tr>
            <th>文件名称</th>
            <th>文件大小</th>
            <th>上传时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td>{item.size}</td>
                <td>{item.uploadTime}</td>
                <td>
                  <button type="button">预览</button>
                  <button type="button">下载</button>
                  {props.readonly ? null : <button type="button">删除</button>}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4}>
                <div className="case-material-empty">
                  <Files size={42} />
                  <strong>暂无数据</strong>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {props.readonly ? null : (
        <div className="case-material-upload">
          <div className="case-material-upload-main">
            <UploadCloud size={18} />
            <span>点击或将文件拖拽到这里上传</span>
            <em>（文件大小限制：100M，支持扩展名：.rar .zip .doc .docx .pdf .jpg .jpeg .xlsx...）</em>
          </div>
          <p>本系统为非涉密系统，严禁上传、处理、传输国家秘密。请确认上传、传输的资料不涉及国家秘密。</p>
        </div>
      )}
    </div>
  );
}

function getRelatedSourceValue(activeCase: CaseRow, label: string) {
  const labels = [label, ...(SOURCE_FIELD_ALIASES[label] || [])];
  return labels.map((item) => activeCase.relatedSource.find((source) => source.label === item)?.value || '').find(Boolean) || '';
}

function createSourceDraft(sourceType: CaseSourceType, activeCase: CaseRow, useExisting: boolean): SourceDraft {
  return SOURCE_FIELD_LABELS[sourceType].reduce<SourceDraft>((acc, label) => {
    if (!useExisting) {
      acc[label] = '';
      return acc;
    }

    if (label === '来源名称') acc[label] = activeCase.sourceInfo;
    else if (label === '来源说明') acc[label] = activeCase.sourceRawText || activeCase.sourceInfo;
    else if (label === '原文链接') acc[label] = getRelatedSourceValue(activeCase, label) || activeCase.sourceUrl || '';
    else if (label === '发布时间') acc[label] = getRelatedSourceValue(activeCase, label) || (activeCase.importTime === '保存后生成' ? '' : activeCase.importTime);
    else acc[label] = getRelatedSourceValue(activeCase, label) || (label.includes('单位') ? activeCase.sourceUnit : activeCase.sourceInfo);

    return acc;
  }, {});
}

function createCaseDraft(activeCase: CaseRow): CaseDraft {
  return {
    title: activeCase.title,
    region: activeCase.region,
    occurrenceTime: activeCase.occurrenceTime,
    involvedSubject: activeCase.involvedSubject,
    summary: activeCase.summary,
    tags: activeCase.tags.join('、'),
    remark: activeCase.remark,
  };
}

function splitCaseTags(value: string) {
  return value
    .split(/[、,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ProblemPickerDrawer(props: {
  sourceType: CaseSourceType;
  keyword: string;
  selectedValue: string;
  onKeywordChange: (value: string) => void;
  onSelect: (issue: IssueSourceOption) => void;
  onClose: () => void;
}) {
  const keyword = props.keyword.trim();
  const rows = ISSUE_SOURCE_OPTIONS.filter((item) => {
    const matchType = item.sourceType === props.sourceType;
    const text = `${item.code}${item.title}${item.unit}${item.region}${item.involvedSubject}${item.summary}${item.tags}`;
    return matchType && (!keyword || text.includes(keyword));
  });

  return (
    <div className="case-drawer-mask">
      <aside className="case-drawer case-problem-drawer">
        <div className="case-drawer-head">
          <h2>选择关联问题</h2>
          <button type="button" onClick={props.onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="case-problem-picker">
          <div className="case-problem-picker-head">
            <div className="case-problem-search">
              <Search size={14} />
              <input value={props.keyword} placeholder="请输入问题编号、标题、单位、地区" onChange={(event) => props.onKeywordChange(event.target.value)} />
            </div>
            <CaseBadge>{props.sourceType}</CaseBadge>
          </div>
          <div className="case-problem-table-wrap">
            <table className="case-problem-table">
              <thead>
                <tr>
                  <th>问题编号</th>
                  <th>问题标题</th>
                  <th>形成单位</th>
                  <th>地区</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className={props.selectedValue === item.value ? 'is-selected' : ''}>
                    <td>{item.code}</td>
                    <td>
                      <strong>{item.title}</strong>
                      <span>{item.involvedSubject}</span>
                    </td>
                    <td>{item.unit}</td>
                    <td>{item.region}</td>
                    <td><CaseBadge>{item.status}</CaseBadge></td>
                    <td>
                      <button type="button" onClick={() => props.onSelect(item)}>
                        {props.selectedValue === item.value ? '已选择' : '选择'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="case-empty-row">没有匹配的问题，可调整关键词重新检索。</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </aside>
    </div>
  );
}

function CaseFieldControl(props: { label: string; value: string }) {
  if (props.label === '来源类型') {
    return (
      <select defaultValue={props.value}>
        {SOURCE_TYPE_ITEMS.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    );
  }

  return <input readOnly={['案例编号', '录入机构', '录入人'].includes(props.label)} defaultValue={props.value} />;
}

function CommonInsightPage() {
  const [selectedPatternId, setSelectedPatternId] = useState(COMMON_INSIGHT_PATTERNS[0].id);
  const [facetValues, setFacetValues] = useState<Record<string, string>>({
    年度: '2026年度',
    来源类型: '全部来源',
    区划: '全省',
  });
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [budgetStageFilter, setBudgetStageFilter] = useState(COMMON_BUDGET_STAGE_OPTIONS[0]);
  const [fundTypeFilter, setFundTypeFilter] = useState(COMMON_FUND_TYPE_OPTIONS[0]);
  const [activePatternStatus, setActivePatternStatus] = useState<InsightPattern['processStatus'] | '全部'>('全部');
  const [casePickerKeyword, setCasePickerKeyword] = useState('');
  const [unclusteredKeyword, setUnclusteredKeyword] = useState('');
  const [notice, setNotice] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [unclusteredOpen, setUnclusteredOpen] = useState(false);
  const [casePickerOpen, setCasePickerOpen] = useState(false);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [generatedPatternIds, setGeneratedPatternIds] = useState<string[]>([]);
  const [caseSelections, setCaseSelections] = useState<Record<string, string[]>>(() =>
    COMMON_INSIGHT_PATTERNS.reduce<Record<string, string[]>>((acc, item) => {
      acc[item.id] = item.caseIds;
      return acc;
    }, {}),
  );

  const selectedPattern = COMMON_INSIGHT_PATTERNS.find((item) => item.id === selectedPatternId) || COMMON_INSIGHT_PATTERNS[0];
  const selectedCaseIds = caseSelections[selectedPattern.id] || selectedPattern.caseIds;
  const relatedCases = COMMON_INSIGHT_CASES.filter((item) => selectedCaseIds.includes(item.id));
  const casePickerRows = COMMON_INSIGHT_CASES.filter((item) => {
    const text = `${item.code}${item.title}${item.region}${item.source}${item.unit}${item.budgetStage}${item.fundType}${item.issueFeature}${item.evidence}`;
    return !casePickerKeyword || text.includes(casePickerKeyword);
  });
  const unclusteredRows = COMMON_UNCLUSTERED_CASES.filter((item) => {
    const text = `${item.code}${item.title}${item.region}${item.source}${item.unit}${item.budgetStage}${item.fundType}${item.issueFeature}${item.unclusteredReason}${item.suggestedAction}`;
    return !unclusteredKeyword || text.includes(unclusteredKeyword);
  });

  const sourceSummaryOf = (pattern: InsightPattern) => {
    const summary: Record<string, string> = {
      'bond-performance': '日常监督形成32、专项监督形成10',
      'purchase-material': '专项监督形成18、日常监督形成9、其他来源4',
      'temporary-payment': '日常监督形成19、上级下发5',
      'subsidy-duplicate': '外部公开案例8、日常监督形成10',
      'asset-disposal': '上级下发11、日常监督形成9、其他来源7',
      'project-entry': '日常监督形成12、专项监督形成7、其他来源3',
      'final-account-open': '外部公开案例7、上级下发6、日常监督形成3',
      'internal-approval': '专项监督形成8、日常监督形成4、上级下发2',
      'rectification-evidence': '其他来源5、日常监督形成4、区划不详3',
    };
    return summary[pattern.id] || '来源类型不详';
  };

  const statusOf = (pattern: InsightPattern) => {
    if (generatedPatternIds.includes(pattern.id)) return '已申请典型';
    if (confirmedIds.includes(pattern.id)) return '已确认';
    return pattern.processStatus;
  };

  const rangeSummary = [
    facetValues.年度,
    facetValues.来源类型,
    facetValues.区划,
    budgetStageFilter !== '全部环节' ? budgetStageFilter : '',
    fundTypeFilter !== '全部资金类型' ? fundTypeFilter : '',
    keyword,
    tagFilter,
  ].filter(Boolean).join(' / ');
  const basePatternRows = [...COMMON_INSIGHT_PATTERNS]
    .filter((pattern) => {
      const text = `${pattern.name}${pattern.description}${pattern.budgetStage}${pattern.fundType}${pattern.businessDimension}${pattern.tags.join('')}`;
      return !keyword || text.includes(keyword);
    })
    .filter((pattern) => !tagFilter || pattern.tags.some((tag) => tag.includes(tagFilter)) || pattern.businessDimension.includes(tagFilter))
    .filter((pattern) => budgetStageFilter === '全部环节' || pattern.budgetStage.includes(budgetStageFilter))
    .filter((pattern) => fundTypeFilter === '全部资金类型' || pattern.fundType.includes(fundTypeFilter))
    .sort((a, b) => b.caseCount - a.caseCount);
  const patternRows = basePatternRows.filter((pattern) => activePatternStatus === '全部' || statusOf(pattern) === activePatternStatus);
  const generated = generatedPatternIds.includes(selectedPattern.id);

  const updateFacet = (label: string, value: string) => {
    setFacetValues((prev) => ({ ...prev, [label]: value }));
  };

  const statusCountOf = (status: InsightPattern['processStatus'] | '全部') => {
    if (status === '全部') return basePatternRows.length;
    return basePatternRows.filter((pattern) => statusOf(pattern) === status).length;
  };

  const representativeToneOf = (status: InsightPattern['representativeStatus']) => {
    if (status === '代表性充分') return 'is-success';
    if (status === '需补充样本') return 'is-warning';
    return 'is-neutral';
  };

  const toggleRelatedCase = (caseId: string) => {
    setCaseSelections((prev) => {
      const current = prev[selectedPattern.id] || selectedPattern.caseIds;
      const next = current.includes(caseId) ? current.filter((item) => item !== caseId) : [...current, caseId];
      return { ...prev, [selectedPattern.id]: next };
    });
  };

  const confirmPatternById = (pattern: InsightPattern) => {
    setSelectedPatternId(pattern.id);
    setConfirmedIds((prev) => (prev.includes(pattern.id) ? prev : [...prev, pattern.id]));
    setNotice(`已确认“${pattern.name}”分析结果，可作为回头看同类案例清单使用。`);
  };

  const confirmPattern = () => {
    confirmPatternById(selectedPattern);
  };

  const generateTypicalCase = () => {
    if (!relatedCases.length) {
      setNotice('当前共性问题尚未关联一般案例，请先调整关联案例后再申请典型案例。');
      return;
    }
    if (selectedPattern.representativeStatus === '需补充样本') {
      setNotice(`“${selectedPattern.name}”代表性不足，请先补充关联案例或完成代表性确认后再申请典型案例。`);
      return;
    }
    setConfirmedIds((prev) => (prev.includes(selectedPattern.id) ? prev : [...prev, selectedPattern.id]));
    setGeneratedPatternIds((prev) => (prev.includes(selectedPattern.id) ? prev : [...prev, selectedPattern.id]));
    setNotice(`已进入典型案例申报，自动带入“${selectedPattern.name}”、共性说明、共性特征和 ${relatedCases.length} 件关联一般案例。`);
  };

  const openTypicalManagement = () => {
    try {
      window.location.href = '/prototypes/case-library-ai?feature=typical_case_application';
    } catch {
      setNotice('已模拟进入典型案例管理');
    }
  };

  return (
    <div className="case-workspace common-insight-workspace ufsp-business-panel">
      <div className="common-filter-strip">
        <div className="common-filter-group">
          {COMMON_RANGE_FACETS.map((facet) => (
            <label key={facet.label}>
              <span>{facet.label}</span>
              <select value={facetValues[facet.label]} onChange={(event) => updateFacet(facet.label, event.target.value)}>
                {facet.options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="common-filter-actions">
          <button type="button" className={`common-filter-action ${moreOpen ? 'is-active' : ''}`} onClick={() => setMoreOpen((prev) => !prev)}>
            更多筛选
          </button>
          <button type="button" className="common-filter-action common-filter-refresh" onClick={() => setNotice(`已刷新“${rangeSummary}”聚类分析结果`)}>
            <ToolbarRefreshIcon size={14} />
            刷新
          </button>
        </div>
      </div>

      {moreOpen ? (
        <div className="common-more-filter">
          <label className="common-filter-keyword">
            <span>关键词</span>
            <div className="ufsp-search-box">
              <input value={keyword} onChange={(event) => setKeyword(event.currentTarget.value)} placeholder="问题表现 / 标签 / 地区" />
              <Search size={14} />
            </div>
          </label>
          <label className="common-filter-keyword">
            <span>标签</span>
            <div className="ufsp-search-box">
              <input value={tagFilter} onChange={(event) => setTagFilter(event.currentTarget.value)} placeholder="专项债券 / 资料缺失 / 回头看" />
              <Search size={14} />
            </div>
          </label>
          <label>
            <span>预算环节</span>
            <select value={budgetStageFilter} onChange={(event) => setBudgetStageFilter(event.target.value)}>
              {COMMON_BUDGET_STAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            <span>资金类型</span>
            <select value={fundTypeFilter} onChange={(event) => setFundTypeFilter(event.target.value)}>
              {COMMON_FUND_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {notice ? (
        <div className="case-inline-notice common-insight-notice">
          <Check size={15} />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      ) : null}

      <div className="common-cluster-body">
        <section className="common-overview-grid" aria-label="案例库总览">
          <div className="common-overview-card common-overview-card-total">
            <span>一般案例总数</span>
            <strong>{COMMON_CLUSTER_SUMMARY.totalCases}</strong>
            <em>当前筛选范围内已入库一般案例数量</em>
          </div>
          <div className="common-overview-card common-overview-card-clustered">
            <span>已聚类案例</span>
            <strong>{COMMON_CLUSTER_SUMMARY.clusteredCases}</strong>
            <em>已关联至少一个共性问题的一般案例，按案例去重统计</em>
          </div>
          <div className="common-overview-card common-overview-card-coverage">
            <span>聚类案例覆盖率</span>
            <strong>{COMMON_CLUSTER_SUMMARY.coverageRate}</strong>
            <em>已聚类案例 / 当前范围内一般案例总数</em>
          </div>
          <button type="button" className="common-overview-card common-overview-card-unclustered common-overview-action" onClick={() => setUnclusteredOpen(true)}>
            <span>未聚类数据</span>
            <strong>{COMMON_CLUSTER_SUMMARY.unclusteredCases}</strong>
            <em>暂未关联共性问题的一般案例，点击查看清单</em>
          </button>
          <div className="common-overview-card common-overview-card-pattern">
            <span>共性问题数</span>
            <strong>{COMMON_CLUSTER_SUMMARY.commonProblemCount}</strong>
            <em>当前已识别并进入列表的共性问题</em>
          </div>
        </section>

        <section className="common-results-panel common-problem-panel">
          <div className="common-results-head">
            <div className="common-results-titleline">
              <strong>共性问题列表</strong>
            </div>
            <div className="common-status-tabs" aria-label="处理状态筛选">
              {COMMON_PATTERN_STATUS_TABS.map((status) => (
                <button
                  type="button"
                  key={status}
                  className={activePatternStatus === status ? 'is-active' : ''}
                  onClick={() => setActivePatternStatus(status)}
                >
                  <span>{status}</span>
                  <strong>{statusCountOf(status)}</strong>
                </button>
              ))}
            </div>
            <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => setNotice('已模拟导出当前共性问题清单')}>
              <ToolbarExportIcon size={14} />
              导出清单
            </button>
          </div>
          <div className="common-problem-table-wrap">
            <table className="common-problem-table">
              <thead>
                <tr>
                  <th>共性问题名称</th>
                  <th>关联案例数</th>
                  <th>主要特征</th>
                  <th>来源构成</th>
                  <th>处理状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {patternRows.map((pattern) => (
                  <tr key={pattern.id} className={selectedPattern.id === pattern.id ? 'is-selected' : ''}>
                    <td>
                      <button
                        type="button"
                        className="common-problem-name"
                        onClick={() => {
                          setSelectedPatternId(pattern.id);
                          setDetailOpen(true);
                        }}
                      >
                        <strong>{pattern.name}</strong>
                        <span>{pattern.description}</span>
                        <small>判定依据：{pattern.judgementCriteria.slice(0, 3).join('、')}</small>
                      </button>
                    </td>
                    <td><strong>{pattern.caseCount} 件</strong></td>
                    <td>{renderTags([pattern.budgetStage.split(' / ')[0], pattern.fundType, pattern.businessDimension])}</td>
                    <td>{sourceSummaryOf(pattern)}</td>
                    <td><CaseBadge>{statusOf(pattern)}</CaseBadge></td>
                    <td>
                      <div className="common-table-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatternId(pattern.id);
                            setDetailOpen(true);
                          }}
                        >
                          查看详情
                        </button>
                        <button type="button" onClick={() => confirmPatternById(pattern)}>确认结果</button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatternId(pattern.id);
                            setDetailOpen(true);
                          }}
                        >
                          申请典型案例
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!patternRows.length ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="case-empty-row">当前状态和筛选条件下暂无共性问题，可切换页签或调整更多筛选。</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {detailOpen ? (
        <div className="case-drawer-mask">
          <aside className="case-drawer common-detail-drawer">
            <div className="case-drawer-head">
              <h2>共性问题详情</h2>
              <button type="button" onClick={() => setDetailOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="case-drawer-content common-drawer-content">
              <div className="common-drawer-summary">
                <strong>{selectedPattern.name}</strong>
                <span>{selectedPattern.description}</span>
              </div>
              <div className="common-drawer-metas">
                <div>
                  <span>处理状态</span>
                  <strong>{statusOf(selectedPattern)}</strong>
                </div>
                <div>
                  <span>关联案例数量</span>
                  <strong>{relatedCases.length} 件</strong>
                </div>
                <div>
                  <span>来源构成</span>
                  <strong>{sourceSummaryOf(selectedPattern)}</strong>
                </div>
              </div>

              <div className="common-dimension-strip">
                <span>预算环节：{selectedPattern.budgetStage}</span>
                <span>资金类型：{selectedPattern.fundType}</span>
                <span>业务维度：{selectedPattern.businessDimension}</span>
              </div>

              <div className="common-standard-panel">
                <section>
                  <h3>共性判定标准与方法</h3>
                  <p>{selectedPattern.judgementMethod}</p>
                  <div className="common-standard-tags">
                    {selectedPattern.judgementCriteria.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </section>
                <section>
                  <h3>代表性评估</h3>
                  <CaseBadge tone={representativeToneOf(selectedPattern.representativeStatus)}>
                    {selectedPattern.representativeStatus}
                  </CaseBadge>
                  <p>{selectedPattern.representativeReason}</p>
                  <em>{selectedPattern.representativeAdvice}</em>
                </section>
              </div>

              <div className="common-drawer-section">
                <h3>反复出现的问题表现</h3>
                {selectedPattern.repeatedSigns.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
              <div className="common-drawer-section">
                <h3>常见形成原因</h3>
                {selectedPattern.coCauses.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
              <div className="common-drawer-section">
                <h3>常见整改方式</h3>
                {selectedPattern.rectifications.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
              <div className="common-drawer-section">
                <h3>风险集中位置</h3>
                {selectedPattern.riskFocus.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>

              <div className="common-tags-row">
                <span>高频标签</span>
                {selectedPattern.tags.map((tag) => (
                  <button type="button" key={tag}>{tag}</button>
                ))}
              </div>

              <div className="common-related-head">
                <div>
                  <strong>关联一般案例</strong>
                  <span>用于回头看、举一反三和典型案例申报</span>
                </div>
                <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => setCasePickerOpen(true)}>新增关联案例</button>
              </div>
              <div className="common-related-table-wrap">
                <table className="common-related-table">
                  <thead>
                    <tr>
                      <th>案例标题</th>
                      <th>来源类型</th>
                      <th>区划/单位</th>
                      <th>主要标签</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedCases.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.title}</strong>
                          <span>{item.code}</span>
                        </td>
                        <td>{item.source}</td>
                        <td>
                          {item.region}
                          <span>{item.unit}</span>
                        </td>
                        <td>{renderTags([item.budgetStage, item.fundType])}</td>
                        <td>
                          <div className="common-table-actions">
                            <button type="button" onClick={() => setNotice(`已模拟查看一般案例“${item.title}”`)}>查看案例</button>
                            <button type="button" onClick={() => toggleRelatedCase(item.id)}>移除关联</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!relatedCases.length ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="case-empty-row">当前共性问题暂未关联一般案例，可新增关联案例后继续确认。</div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="common-drawer-actions">
              {generated ? (
                <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={openTypicalManagement}>查看典型案例管理</button>
              ) : (
                <>
                  <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => setCasePickerOpen(true)}>调整关联案例</button>
                  <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={confirmPattern}>确认分析结果</button>
                  <button type="button" className="ufsp-btn ufsp-btn-primary" onClick={generateTypicalCase}>申请典型案例</button>
                </>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {unclusteredOpen ? (
        <div className="case-drawer-mask">
          <aside className="case-drawer common-unclustered-drawer">
            <div className="case-drawer-head">
              <h2>未聚类一般案例</h2>
              <button type="button" onClick={() => setUnclusteredOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="case-drawer-content common-drawer-content">
              <div className="common-drawer-summary">
                <strong>{COMMON_CLUSTER_SUMMARY.unclusteredCases} 条一般案例暂未形成共性归类</strong>
                <span>这些案例已入库，但未关联任何共性问题。可补充标签、来源、区划或人工判断后重新参与聚类。</span>
              </div>
              <div className="common-drawer-search">
                <Search size={14} />
                <input value={unclusteredKeyword} onChange={(event) => setUnclusteredKeyword(event.currentTarget.value)} placeholder="搜索案例标题、编号、来源、区划、原因或建议" />
              </div>
              <div className="common-related-table-wrap common-unclustered-table-wrap">
                <table className="common-related-table common-unclustered-table">
                  <thead>
                    <tr>
                      <th>案例标题</th>
                      <th>来源类型</th>
                      <th>区划/单位</th>
                      <th>主要标签</th>
                      <th>未聚类原因</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unclusteredRows.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.title}</strong>
                          <span>{item.code}</span>
                        </td>
                        <td>{item.source}</td>
                        <td>
                          {item.region}
                          <span>{item.unit}</span>
                        </td>
                        <td>{renderTags([item.budgetStage, item.fundType])}</td>
                        <td>
                          <strong>{item.unclusteredReason}</strong>
                          <span>{item.suggestedAction}</span>
                        </td>
                        <td>
                          <div className="common-table-actions">
                            <button type="button" onClick={() => setNotice(`已模拟查看一般案例“${item.title}”`)}>查看案例</button>
                            <button type="button" onClick={() => setNotice(`已模拟将“${item.title}”加入人工聚类处理`)}>人工处理</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!unclusteredRows.length ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="case-empty-row">当前搜索条件下暂无未聚类案例。</div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="common-drawer-actions">
              <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => setUnclusteredKeyword('')}>清空搜索</button>
              <button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => setNotice('已模拟发起未聚类案例人工复核')}>
                发起人工复核
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {casePickerOpen ? (
        <div className="case-modal-mask">
          <section className="case-modal common-case-picker-modal" role="dialog" aria-modal="true" aria-label="新增关联案例">
            <div className="case-modal-head">
              <h2>新增关联案例</h2>
              <button type="button" onClick={() => setCasePickerOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="common-case-picker-body">
              <div className="common-drawer-summary">
                <strong>{selectedPattern.name}</strong>
                <span>从已入库一般案例中搜索并勾选，调整后将用于当前共性问题和后续典型案例申报。</span>
              </div>
              <div className="common-drawer-search">
                <Search size={14} />
                <input value={casePickerKeyword} onChange={(event) => setCasePickerKeyword(event.currentTarget.value)} placeholder="请输入案例标题、编号、来源类型、区划或单位" />
              </div>
              <table className="common-drawer-table common-picker-table">
                <thead>
                  <tr>
                    <th>选择</th>
                    <th>案例</th>
                    <th>来源类型</th>
                    <th>区划</th>
                    <th>单位</th>
                  </tr>
                </thead>
                <tbody>
                  {casePickerRows.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedCaseIds.includes(item.id)}
                          onChange={() => toggleRelatedCase(item.id)}
                        />
                      </td>
                      <td>
                        <strong>{item.title}</strong>
                        <span>{item.code} / {item.budgetStage} / {item.fundType}</span>
                      </td>
                      <td>{item.source}</td>
                      <td>{item.region}</td>
                      <td>{item.unit}</td>
                    </tr>
                  ))}
                  {!casePickerRows.length ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="case-empty-row">没有匹配的一般案例，可调整关键词重新检索。</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="case-modal-actions">
              <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => setCasePickerOpen(false)}>取消</button>
              <button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => setCasePickerOpen(false)}>确定</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function renderTypicalRelatedCell(row: TypicalCase) {
  const first = row.relatedGeneralCases[0] || '未关联一般案例';
  const rest = Math.max(row.relatedGeneralCases.length - 1, 0);
  return (
    <div className="typical-related-cell" title={row.relatedGeneralCases.join('\n')}>
      <strong>{row.relatedGeneralCases.length} 件</strong>
      <span>{first}{rest ? ` 等 +${rest}` : ''}</span>
    </div>
  );
}

function TypicalCaseManagementPage(props: { mode: 'application' | 'review' }) {
  const isReview = props.mode === 'review';
  const statusTabs = isReview ? TYPICAL_REVIEW_STATUS_TABS : TYPICAL_APPLICATION_STATUS_TABS;
  const visibleStatuses: TypicalCaseStatus[] = isReview ? ['待审核', '被退回', '已发布'] : ['待提交', '被退回', '已发布'];
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [activeStatus, setActiveStatus] = useState<TypicalCaseStatus | '全部'>(isReview ? '待审核' : '待提交');
  const [typeFilter, setTypeFilter] = useState<TypicalCaseType | '全部类型'>('全部类型');
  const [keyword, setKeyword] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(isReview ? ['typical-002'] : ['typical-001']);
  const [selectedId, setSelectedId] = useState(isReview ? 'typical-002' : 'typical-001');
  const [notice, setNotice] = useState('');
  const activeCase = TYPICAL_CASE_ROWS.find((item) => item.id === selectedId) || TYPICAL_CASE_ROWS[0];
  const pageName = isReview ? '审核' : '申请';
  const baseRows = TYPICAL_CASE_ROWS.filter((item) => visibleStatuses.includes(item.status));

  const statusCounts = statusTabs.reduce<Record<string, number>>((acc, tab) => {
    acc[tab.key] = tab.key === '全部' ? baseRows.length : baseRows.filter((item) => item.status === tab.key).length;
    return acc;
  }, {});

  const rowsInStatus = baseRows.filter((item) => activeStatus === '全部' || item.status === activeStatus);
  const typeCounts = TYPICAL_CASE_TYPES.reduce<Record<string, number>>((acc, item) => {
    acc[item] = item === '全部类型' ? rowsInStatus.length : rowsInStatus.filter((row) => row.type === item).length;
    return acc;
  }, {});

  const rows = rowsInStatus.filter((item) => {
    const matchType = typeFilter === '全部类型' || item.type === typeFilter;
    const text = `${item.code}${item.title}${item.type}${item.status}${item.field}${item.region}${item.submitOrg}${item.relatedGeneralCases.join('')}${item.relatedProblems.join('')}${item.summary}`;
    const matchKeyword = !keyword || text.includes(keyword);
    return matchType && matchKeyword;
  });
  const selectedRowsInView = rows.filter((item) => selectedIds.includes(item.id));

  const getActionLabel = (row: TypicalCase) => {
    if (isReview) {
      if (row.status === '待审核') return '审核通过';
      if (row.status === '被退回') return '查看退回';
      return '查看发布记录';
    }
    if (row.status === '待提交' || row.status === '被退回') return '提交';
    return '查看发布记录';
  };
  const actionLabel = getActionLabel(activeCase);

  const handleCaseAction = (row: TypicalCase) => {
    const message =
      isReview && row.status === '待审核'
        ? '已模拟审核通过并发布'
        : isReview && row.status === '被退回'
          ? '已模拟查看退回意见'
          : !isReview && (row.status === '待提交' || row.status === '被退回')
            ? '已模拟提交典型案例申请'
            : '已模拟查看发布记录';
    setNotice(`${message}：${row.title}`);
  };

  const handlePrimaryAction = () => {
    handleCaseAction(activeCase);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const openDetail = (row: TypicalCase) => {
    setSelectedId(row.id);
    setView('detail');
  };

  if (view === 'detail') {
    return (
      <TypicalCaseDetailPage
        activeCase={activeCase}
        actionLabel={actionLabel}
        pageName={pageName}
        onBack={() => setView('list')}
        onAction={handlePrimaryAction}
      />
    );
  }

  return (
    <div className="case-workspace typical-case-workspace ufsp-business-panel ufsp-ledger-frame">
      <div className="case-tabs typical-status-tabs" role="tablist" aria-label={`典型案例${pageName}状态`}>
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeStatus === tab.key ? 'is-active' : ''}
            onClick={() => {
              setActiveStatus(tab.key);
              setTypeFilter('全部类型');
            }}
          >
            {tab.label} ({statusCounts[tab.key]})
          </button>
        ))}
      </div>

      {notice ? (
        <div className="case-inline-notice typical-case-notice">
          <Check size={15} />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      ) : null}

      <div className={`typical-case-body ufsp-ledger-content ${treeCollapsed ? 'is-tree-collapsed' : ''}`}>
        <aside className="typical-type-panel ufsp-ledger-tree" aria-label="典型案例类型目录">
          <button
            type="button"
            className="ufsp-tree-collapse"
            aria-label={treeCollapsed ? '展开目录' : '收起目录'}
            onClick={() => setTreeCollapsed((prev) => !prev)}
          >
            {treeCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <div className="ufsp-tree-inner" aria-hidden={treeCollapsed}>
            <div className="ufsp-tree-search">
              <input aria-label="典型案例目录搜索" placeholder="请输入" />
              <Search size={14} />
            </div>
            <div className="ufsp-tree-list">
              <button
                type="button"
                className={`ufsp-tree-item year ${typeFilter === '全部类型' ? 'is-active' : ''}`}
                onClick={() => setTypeFilter('全部类型')}
              >
                <ChevronDown size={14} />
                <span>典型案例类型</span>
                <em>({typeCounts['全部类型']})</em>
              </button>
              {TYPICAL_CASE_TYPES.filter((item) => item !== '全部类型').map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`ufsp-tree-item topic ${typeFilter === item ? 'is-active' : ''}`}
                  onClick={() => setTypeFilter(item)}
                >
                  <span className="ufsp-tree-indent" />
                  <span>{item}</span>
                  <em>({typeCounts[item]})</em>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="typical-list-panel ufsp-ledger-main">
          <div className="case-list-toolbar typical-toolbar">
            <div className="case-toolbar-left">
              {isReview ? null : (
                <>
                  <button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => setNotice('已模拟新增典型案例申请')}>
                    <ToolbarAddIcon size={14} />
                    新增
                  </button>
                  <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => setNotice('已模拟从聚类分析选择分析结果生成申请')}>
                    从聚类分析生成
                  </button>
                </>
              )}
              <button type="button" className="ufsp-btn ufsp-btn-secondary">
                <ToolbarExportIcon size={14} />
                导出
              </button>
              <button
                type="button"
                className="ufsp-btn ufsp-btn-secondary"
                onClick={() => setNotice(isReview ? `已模拟批量审核通过 ${selectedRowsInView.length} 条` : `已模拟批量提交 ${selectedRowsInView.length} 条`)}
              >
                <ToolbarPassIcon size={14} />
                {isReview ? '批量审核通过' : '批量提交'}
              </button>
              {isReview ? (
                <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => setNotice(`已模拟批量退回 ${selectedRowsInView.length} 条`)}>
                  退回
                </button>
              ) : null}
            </div>
            <div className="case-toolbar-right">
              <label className="ufsp-search-box ufsp-filter-input">
                <input value={keyword} onChange={(event) => setKeyword(event.currentTarget.value)} placeholder="请输入" />
              </label>
              <button type="button" className="ufsp-icon-btn ufsp-icon-btn-primary" aria-label="查询">
                <ToolbarSearchIcon size={14} />
              </button>
              <button type="button" className="ufsp-icon-btn ufsp-icon-btn-secondary" aria-label="刷新" onClick={() => setNotice('已模拟刷新典型案例列表')}>
                <ToolbarRefreshIcon size={14} />
              </button>
              <button type="button" className="ufsp-icon-btn ufsp-icon-btn-secondary" aria-label="筛选" onClick={() => setAdvancedOpen((prev) => !prev)}>
                <ToolbarFilterIcon size={14} />
              </button>
              <button type="button" className="ufsp-btn ufsp-btn-secondary">查询方案</button>
              <button type="button" className="ufsp-icon-btn ufsp-icon-btn-secondary" aria-label="列设置">
                <ToolbarSettingsIcon size={14} />
              </button>
            </div>
          </div>

          <div className="case-query-panel">
            {advancedOpen ? (
              <div className="case-advanced-grid">
                {['案例领域', '提交机构', '关联一般案例', '更新时间'].map((item) => (
                  <label key={item}>
                    <span>{item}</span>
                    <input placeholder={`请选择${item}`} />
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <div className="case-selection-note ufsp-selection-note">
            <span>当前选择 {selectedRowsInView.length} 条典型案例</span>
          </div>

          <div className="typical-table-wrap ufsp-table-wrap">
            <table className="typical-case-table ufsp-ledger-table">
              <thead>
                <tr>
                  <th className="typical-col-check">
                    <input type="checkbox" aria-label="全选" checked={rows.length > 0 && selectedRowsInView.length === rows.length} readOnly />
                  </th>
                  <th>典型案例标题</th>
                  <th>类型</th>
                  <th>案例领域</th>
                  <th>关联一般案例</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th className="typical-col-actions">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={row.id === activeCase.id ? 'is-selected' : ''}>
                    <td className="typical-col-check">
                      <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelected(row.id)} />
                    </td>
                    <td>
                      <button type="button" className="case-title-link" onClick={() => openDetail(row)}>
                        {row.title}
                      </button>
                    </td>
                    <td><CaseBadge>{row.type}</CaseBadge></td>
                    <td>{row.field}</td>
                    <td>{renderTypicalRelatedCell(row)}</td>
                    <td><CaseBadge>{row.status}</CaseBadge></td>
                    <td>{row.publishTime !== '-' ? row.publishTime : row.createdTime}</td>
                    <td className="typical-col-actions">
                      <button type="button" onClick={() => openDetail(row)}>{isReview ? '审核' : '编辑'}</button>
                      <button type="button" onClick={() => { setSelectedId(row.id); handleCaseAction(row); }}>{row.status === '已发布' ? '记录' : getActionLabel(row)}</button>
                      <button type="button" onClick={() => setNotice(`已模拟查看关联材料：${row.title}`)}>材料</button>
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="case-empty-row">没有匹配的典型案例，可调整状态、类型或关键词。</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="case-pagination ufsp-pagination" aria-label="分页">
            <span className="ufsp-page-total">共 {rows.length} 条</span>
            <button type="button" className="ufsp-page-btn" aria-label="上一页">
              <ChevronLeft size={14} />
            </button>
            <button type="button" className="ufsp-page-btn is-active">1</button>
            <button type="button" className="ufsp-page-btn" aria-label="下一页">
              <ChevronRight size={14} />
            </button>
            <button type="button" className="ufsp-page-size">
              20 条/页
              <ChevronDown size={14} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function TypicalCaseDetailPage(props: {
  activeCase: TypicalCase;
  actionLabel: string;
  pageName: string;
  onBack: () => void;
  onAction: () => void;
}) {
  const [notice, setNotice] = useState('');

  return (
    <div className="case-workspace case-form-page typical-detail-page ufsp-form-shell">
      <div className="case-form-head ufsp-form-head">
        <div className="ufsp-form-title">
          <button type="button" className="ufsp-form-back" onClick={props.onBack} aria-label="返回列表">
            <ArrowLeft size={18} />
          </button>
          <h1>
            <span>典型案例管理</span>
            <em>/ {props.pageName}详情</em>
          </h1>
        </div>
        <div className="case-head-actions ufsp-form-actions">
          <button type="button" className="ufsp-btn" onClick={() => setNotice(props.pageName === '审核' ? '已模拟保存审核意见' : '已模拟保存申请内容')}>保存</button>
          <button
            type="button"
            className="ufsp-btn ufsp-btn-primary"
            onClick={() => {
              props.onAction();
              setNotice(`已模拟${props.actionLabel}`);
            }}
          >
            {props.actionLabel}
          </button>
        </div>
      </div>

      {notice ? (
        <div className="case-inline-notice typical-case-notice">
          <Check size={15} />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      ) : null}

      <div className="case-edit-body case-report-body ufsp-ledger-edit-body typical-detail-body">
        <section className="ufsp-ledger-edit-section case-report-section">
          <h2>{props.pageName}字段</h2>
          <div className="case-readonly-grid">
            {[
              ['典型案例编号', props.activeCase.code],
              ['典型案例类型', props.activeCase.type],
              ['当前状态', props.activeCase.status],
              ['案例领域', props.activeCase.field],
              ['适用地区', props.activeCase.region],
              ['提交机构', props.activeCase.submitOrg],
              ['提交人', props.activeCase.submitPerson],
            ].map(([label, value]) => (
              <label className="case-field" key={label}>
                <span>{label}</span>
                <div className="case-readonly-value">{value}</div>
              </label>
            ))}
            <label className="case-field case-field-wide">
              <span>典型案例标题</span>
              <div className="case-readonly-value">{props.activeCase.title}</div>
            </label>
          </div>
        </section>

        <section className="ufsp-ledger-edit-section case-report-section">
          <h2>代表性说明</h2>
          <div className="case-readonly-grid">
            <label className="case-field case-field-wide">
              <span>为什么具有代表性</span>
              <div className="case-readonly-value">{props.activeCase.typicalReason}</div>
            </label>
            <label className="case-field case-field-wide">
              <span>案例摘要</span>
              <div className="case-readonly-value">{props.activeCase.summary}</div>
            </label>
          </div>
        </section>

        <section className="ufsp-ledger-edit-section case-report-section">
          <h2>关联一般案例</h2>
          <div className="typical-related-list">
            {props.activeCase.relatedGeneralCases.map((item) => (
              <button type="button" key={item}>{item}</button>
            ))}
          </div>
        </section>

        <section className="ufsp-ledger-edit-section case-report-section">
          <h2>其他模块可用信息</h2>
          <div className="case-readonly-grid">
            <label className="case-field case-field-wide">
              <span>以案促改价值</span>
              <div className="case-readonly-value">{props.activeCase.governanceValue}</div>
            </label>
            <label className="case-field case-field-wide">
              <span>问责信息</span>
              <div className="case-readonly-value">{props.activeCase.accountabilityInfo}</div>
            </label>
            <label className="case-field case-field-wide">
              <span>制度完善</span>
              <div className="case-readonly-value">{props.activeCase.systemImprovement}</div>
            </label>
          </div>
        </section>

        <section className="ufsp-ledger-edit-section case-report-section">
          <h2>审核与材料</h2>
          <div className="case-readonly-grid">
            <label className="case-field case-field-wide">
              <span>审核意见</span>
              <div className="case-readonly-value">{props.activeCase.reviewOpinion}</div>
            </label>
          </div>
          <div className="typical-related-list">
            {props.activeCase.attachments.map((item) => (
              <button type="button" key={item}>{item}</button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function GeneralCaseManagementPage() {
  const [view, setView] = useState<GeneralCaseView>('list');
  const [activeTab, setActiveTab] = useState<CaseLifecycle | 'all'>('pending');
  const [sourceFilter, setSourceFilter] = useState<CaseSourceType | '全部'>('全部');
  const [keyword, setKeyword] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CaseLifecycle | '全部'>('全部');
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(['case-001', 'case-002']);
  const [activeCaseId, setActiveCaseId] = useState('case-001');
  const [modal, setModal] = useState<GeneralModal>(null);
  const [drawer, setDrawer] = useState<GeneralDrawer>(null);
  const [notice, setNotice] = useState('');
  const activeCase = activeCaseId === NEW_CASE_TEMPLATE.id ? NEW_CASE_TEMPLATE : CASE_ROWS.find((item) => item.id === activeCaseId) || CASE_ROWS[0];

  const counts = {
    pending: CASE_ROWS.filter((item) => item.lifecycle === 'pending').length,
    stored: CASE_ROWS.filter((item) => item.lifecycle === 'stored').length,
    rejected: CASE_ROWS.filter((item) => item.lifecycle === 'rejected').length,
    disabled: CASE_ROWS.filter((item) => item.lifecycle === 'disabled').length,
    all: CASE_ROWS.length,
  };

  const rowsInTab = CASE_ROWS.filter((item) => activeTab === 'all' || item.lifecycle === activeTab);
  const sourceCounts = SOURCE_TYPE_ITEMS.reduce<Record<CaseSourceType, number>>((acc, sourceType) => {
    acc[sourceType] = rowsInTab.filter((item) => item.sourceType === sourceType).length;
    return acc;
  }, {} as Record<CaseSourceType, number>);

  const rows = rowsInTab.filter((item) => {
    const matchSource = sourceFilter === '全部' || item.sourceType === sourceFilter;
    const relatedText = item.relatedSource.map((source) => `${source.label}${source.value}`).join('');
    const text = `${item.title}${item.originalTitle}${item.summary}${item.sourceType}${relatedText}${item.region}${item.involvedSubject}${item.remark}`;
    const matchKeyword = !keyword || text.includes(keyword);
    const matchStatus = statusFilter === '全部' || item.lifecycle === statusFilter;
    return matchSource && matchKeyword && matchStatus;
  });
  const selectedRowsInView = rows.filter((item) => selectedIds.includes(item.id));

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const openCase = (nextView: GeneralCaseView, row: CaseRow) => {
    setActiveCaseId(row.id);
    setView(nextView);
  };

  const confirmAction = (message: string) => {
    setNotice(message);
    setModal(null);
    setDrawer(null);
  };

  if (view === 'process') {
    return (
      <CaseProcessPage
        activeCase={activeCase}
        onBack={() => setView('list')}
        onOpenDrawer={setDrawer}
        onOpenModal={setModal}
        onNotice={setNotice}
      />
    );
  }

  if (view === 'detail' || view === 'edit') {
    return (
      <CaseDetailPage
        mode={view}
        activeCase={activeCase}
        onBack={() => setView('list')}
        onEdit={() => setView('edit')}
        onOpenDrawer={setDrawer}
        onOpenModal={setModal}
        onNotice={setNotice}
      />
    );
  }

  return (
    <div className="case-workspace case-management ufsp-business-panel ufsp-ledger-frame">
      <div className="case-tabs ufsp-ledger-tabs" role="tablist" aria-label="案例生命周期">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'is-active' : ''}
            onClick={() => {
              setActiveTab(tab.key);
              setStatusFilter('全部');
              setSourceFilter('全部');
            }}
          >
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>

      <div className={`case-management-body ufsp-ledger-content ${treeCollapsed ? 'is-tree-collapsed' : ''}`}>
        <aside className="ufsp-ledger-tree" aria-label="案例来源目录">
          <button
            type="button"
            className="ufsp-tree-collapse"
            aria-label={treeCollapsed ? '展开目录' : '收起目录'}
            onClick={() => setTreeCollapsed((prev) => !prev)}
          >
            {treeCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <div className="ufsp-tree-inner" aria-hidden={treeCollapsed}>
            <div className="ufsp-tree-search">
              <input aria-label="案例目录搜索" placeholder="请输入" />
              <Search size={14} />
            </div>
            <div className="ufsp-tree-list">
              <button type="button" className={`ufsp-tree-item year ${sourceFilter === '全部' ? 'is-active' : ''}`} onClick={() => setSourceFilter('全部')}>
                <ChevronDown size={14} />
                <span>2026年度</span>
                <em>({rowsInTab.length})</em>
              </button>
              {SOURCE_TYPE_ITEMS.map((item) => (
                <button key={item} type="button" className={`ufsp-tree-item topic ${sourceFilter === item ? 'is-active' : ''}`} onClick={() => setSourceFilter(item)}>
                  <span className="ufsp-tree-indent" />
                  <span>{item}</span>
                  <em>({sourceCounts[item]})</em>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="ufsp-ledger-main">
          {notice ? (
            <div className="case-inline-notice">
              <Check size={15} />
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice('')}>
                <X size={14} />
              </button>
            </div>
          ) : null}

          <div className="case-list-toolbar ufsp-ledger-toolbar">
            <div className="case-toolbar-left ufsp-toolbar-left">
              <button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => { setActiveCaseId(NEW_CASE_TEMPLATE.id); setView('edit'); }}>
                <ToolbarAddIcon size={14} />
                新增
              </button>
              <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => setModal('import')}>
                <ToolbarImportIcon size={14} />
                导入
              </button>
              <button type="button" className="ufsp-btn ufsp-btn-secondary">
                <ToolbarExportIcon size={14} />
                导出
              </button>
              <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => confirmAction('已模拟入库')}>
                <ToolbarPassIcon size={14} />
                入库
              </button>
            </div>
            <div className="case-toolbar-right ufsp-toolbar-right">
              <label className="ufsp-search-box ufsp-filter-input">
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.currentTarget.value)}
                  placeholder="请输入"
                />
              </label>
              <button type="button" className="ufsp-icon-btn ufsp-icon-btn-primary" aria-label="查询">
                <ToolbarSearchIcon size={14} />
              </button>
              <button type="button" className="ufsp-icon-btn ufsp-icon-btn-secondary" aria-label="刷新" onClick={() => confirmAction('已模拟刷新列表')}>
                <ToolbarRefreshIcon size={14} />
              </button>
              <button type="button" className="ufsp-icon-btn ufsp-icon-btn-secondary" aria-label="筛选" onClick={() => setAdvancedOpen((prev) => !prev)}>
                <ToolbarFilterIcon size={14} />
              </button>
              <button type="button" className="ufsp-btn ufsp-btn-secondary">查询方案</button>
              <button type="button" className="ufsp-icon-btn ufsp-icon-btn-secondary" aria-label="列设置">
                <ToolbarSettingsIcon size={14} />
              </button>
            </div>
          </div>

          <div className="case-query-panel">
            {advancedOpen ? (
              <div className="case-advanced-grid">
                <label>
                  <span>入库状态</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value as CaseLifecycle | '全部')}>
                    <option value="全部">全部</option>
                    {TAB_ITEMS.filter((item) => item.key !== 'all').map((item) => (
                      <option key={item.key} value={item.key}>{item.label}</option>
                    ))}
                  </select>
                </label>
                {['来源类型', '发生时间', '所属地区'].map((item) => (
                  <label key={item}>
                    <span>{item}</span>
                    <input placeholder={`请选择${item}`} />
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <div className="case-selection-note ufsp-selection-note">
            <span>当前选择 {selectedRowsInView.length} 条{activeTab === 'pending' ? '待入库案例' : '案例'}</span>
          </div>

          <div className="case-table-wrap ufsp-table-wrap">
            <table className="case-table ufsp-ledger-table">
            <thead>
              <tr>
                <th className="case-col-check">
                  <input type="checkbox" aria-label="全选" checked={rows.length > 0 && selectedRowsInView.length === rows.length} readOnly />
                </th>
                <th>案例标题</th>
                <th>来源类型</th>
                <th>入库状态</th>
                <th>{activeTab === 'all' ? '更新时间' : activeTab === 'rejected' ? '不入库时间' : activeTab === 'disabled' ? '停用时间' : activeTab === 'stored' ? '入库时间' : '导入时间'}</th>
                <th className="case-col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={selectedIds.includes(row.id) ? 'is-selected' : ''}>
                  <td className="case-col-check">
                    <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelected(row.id)} />
                  </td>
                  <td>
                    <button type="button" className="case-title-link" onClick={() => openCase(row.lifecycle === 'pending' ? 'process' : 'detail', row)}>
                      {row.title || row.originalTitle}
                    </button>
                    <div className="case-row-sub">{row.summary}</div>
                  </td>
                  <td className="case-source-cell">
                    <CaseBadge>{row.sourceType}</CaseBadge>
                  </td>
                  <td>
                    <CaseBadge>{CASE_LIFECYCLE_LABELS[row.lifecycle]}</CaseBadge>
                  </td>
                  <td>{row.rejectedTime || row.disabledTime || row.storedTime || row.importTime}</td>
                  <td className="case-col-actions">
                    {row.lifecycle === 'pending' ? (
                      <>
                        <button type="button" onClick={() => openCase('process', row)}>处理</button>
                        <button type="button" onClick={() => { setActiveCaseId(row.id); setDrawer('source'); }}>来源详情</button>
                        <button type="button" onClick={() => { setActiveCaseId(row.id); setModal('reject'); }}>不入库</button>
                      </>
                    ) : row.lifecycle === 'rejected' ? (
                      <>
                        <button type="button" onClick={() => openCase('detail', row)}>详情</button>
                        <button type="button" onClick={() => confirmAction('已模拟恢复为待入库')}>恢复待入库</button>
                        <button type="button" onClick={() => { setActiveCaseId(row.id); setDrawer('records'); }}>记录</button>
                      </>
                    ) : row.lifecycle === 'disabled' ? (
                      <>
                        <button type="button" onClick={() => openCase('detail', row)}>详情</button>
                        <button type="button" onClick={() => confirmAction('已模拟重新启用该案例')}>重新启用</button>
                        <button type="button" onClick={() => { setActiveCaseId(row.id); setDrawer('records'); }}>记录</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => openCase('detail', row)}>详情</button>
                        <button type="button" onClick={() => openCase('edit', row)}>编辑</button>
                        <button type="button" onClick={() => { setActiveCaseId(row.id); setModal('disable'); }}>停用</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="case-empty-row">没有匹配的案例，可调整筛选条件后重新查询。</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
            </table>
          </div>

          <div className="case-pagination ufsp-pagination" aria-label="分页">
            <span className="ufsp-page-total">共 {rows.length} 条</span>
            <button type="button" className="ufsp-page-btn" aria-label="上一页">
              <ChevronLeft size={14} />
            </button>
            <button type="button" className="ufsp-page-btn is-active">1</button>
            <button type="button" className="ufsp-page-btn" aria-label="下一页">
              <ChevronRight size={14} />
            </button>
            <button type="button" className="ufsp-page-size">
              20 条/页
              <ChevronDown size={14} />
            </button>
          </div>
        </section>
      </div>

      <CaseDrawer type={drawer} activeCase={activeCase} onClose={() => setDrawer(null)} />
      <CaseModal type={modal} activeCase={activeCase} onClose={() => setModal(null)} onConfirm={confirmAction} />
    </div>
  );
}

function CaseProcessPage(props: {
  activeCase: CaseRow;
  onBack: () => void;
  onOpenDrawer: (drawer: GeneralDrawer) => void;
  onOpenModal: (modal: GeneralModal) => void;
  onNotice: (message: string) => void;
}) {
  const [adopted, setAdopted] = useState<string[]>([]);
  const sourceDetail = getSourceDetail(props.activeCase);
  const similarCaseRows = [
    {
      title: '专项债券绩效目标设置不完整历史案例',
      similarity: '86%',
      sourceType: '日常监督形成',
      same: '案例标签、发生时间、整改方式',
      diff: '涉及主体、来源类型',
    },
    {
      title: '专项债券项目执行台账缺少绩效跟踪记录案例',
      similarity: '72%',
      sourceType: '专项监督形成',
      same: '专项债券、绩效目标、台账跟踪',
      diff: '发生地区、附件材料',
    },
  ];
  return (
    <div className="case-workspace case-form-page ufsp-form-shell">
      <div className="case-form-head ufsp-form-head">
        <div className="ufsp-form-title">
          <button type="button" className="ufsp-form-back" onClick={props.onBack} aria-label="返回列表">
            <ArrowLeft size={18} />
          </button>
          <h1>
            <span>一般案例管理</span>
            <em>/ 待入库案例处理</em>
          </h1>
        </div>
        <div className="case-head-actions ufsp-form-actions">
          <button type="button" className="ufsp-btn" onClick={() => props.onOpenModal('reject')}>
            标记不入库
          </button>
          <button type="button" className="ufsp-btn" onClick={() => props.onNotice('已模拟刷新 AI 处理结果')}>
            <ToolbarRefreshIcon size={14} /> 刷新
          </button>
          <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => props.onNotice('已模拟保存当前修改')}>
            保存
          </button>
          <button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => props.onNotice('已模拟确认入库，案例进入已入库页签')}>
            确认入库
          </button>
        </div>
      </div>

      <div className="case-form-body case-process-body">
        <div className="case-standard-form ufsp-ledger-edit-body">
          <section className="ufsp-ledger-edit-section">
            <h2>基本信息</h2>
            <div className="ufsp-ledger-form-grid three">
              {[
                ['案例编号', props.activeCase.code],
                ['来源类型', props.activeCase.sourceType],
                ['案例标题', props.activeCase.title],
                ['所属地区', props.activeCase.region],
                ['发生时间', props.activeCase.occurrenceTime],
                ['涉及主体', props.activeCase.involvedSubject],
                ['录入机构', props.activeCase.entryOrg],
                ['录入人', props.activeCase.entryPerson],
              ].map(([label, value]) => (
                <label className="ufsp-field-block" key={label}>
                  <span>{label}</span>
                  <CaseFieldControl label={label} value={value} />
                </label>
              ))}
            </div>
          </section>

          <section className="ufsp-ledger-edit-section">
            <h2>关联来源</h2>
            <div className="ufsp-ledger-form-grid three">
              {props.activeCase.relatedSource.map((item) => (
                <label className="ufsp-field-block" key={item.label}>
                  <span>{item.label}</span>
                  <input defaultValue={item.value} />
                </label>
              ))}
            </div>
          </section>

          <section className="ufsp-ledger-edit-section">
            <h2>案例内容</h2>
            <div className="ufsp-ledger-form-grid three">
              {[
                ['案例描述', props.activeCase.summary],
                ['备注', props.activeCase.remark],
              ].map(([label, value]) => (
                <label className="ufsp-field-block wide" key={label}>
                  <span>{label}</span>
                  <textarea defaultValue={value} />
                </label>
              ))}
            </div>
          </section>

          <section className="ufsp-ledger-edit-section">
            <h2>标签信息</h2>
            <div className="case-label-groups case-label-groups-flat">
              <div>
                <span>案例标签</span>
                {renderTags(props.activeCase.tags)}
              </div>
              <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => props.onOpenModal('tag')}>
                <Tag size={14} /> 选择标签
              </button>
            </div>
          </section>

          <section className="ufsp-ledger-edit-section">
            <h2>材料附件</h2>
            <MaterialAttachmentTable activeCase={props.activeCase} />
          </section>

          <section className="ufsp-ledger-edit-section case-resource-section">
            <h2>来源详情</h2>
            <div className="case-source-card case-inline-source-card">
              <div className="case-source-title">
                <CaseBadge>{props.activeCase.sourceType}</CaseBadge>
                <h3>{sourceDetail.title}</h3>
              </div>
              <div className="case-source-extra">
                <h4>关联来源</h4>
                <div className="case-source-related-list">
                  {sourceDetail.relatedSource.map((item) => (
                    <div key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value || '-'}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="case-source-raw">
                <h4>原始信息</h4>
                <p>{sourceDetail.rawText}</p>
              </div>
              {sourceDetail.attachments.length || sourceDetail.sourceUrl ? (
                <div className="case-source-extra">
                  <h4>来源材料</h4>
                  <div className="case-source-file-list">
                    {sourceDetail.attachments.map((item) => (
                      <button type="button" key={item}>{item}</button>
                    ))}
                    {sourceDetail.sourceUrl ? <a href={sourceDetail.sourceUrl}>外部地址</a> : null}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="ufsp-ledger-edit-section case-resource-section">
            <h2>相似案例</h2>
            <div className="case-similar-list">
              {similarCaseRows.map((item) => (
                <div className="case-similar-row" key={item.title}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.sourceType}</span>
                  </div>
                  <em>相似度 {item.similarity}</em>
                  <p>相同点：{item.same}</p>
                  <p>差异点：{item.diff}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="case-ai-panel">
          <section className="case-ai-block">
            <h2>AI入库概览</h2>
            <div className="case-ai-summary">
              <strong>{props.activeCase.aiConfidence || 72}%</strong>
              <span>总体置信度</span>
              <p>待确认项 4 个，阻断项 1 个，已识别来源证据 6 条。</p>
            </div>
          </section>
          <section className="case-ai-block">
            <h2>字段建议</h2>
            <div className="case-suggestion-list">
              {AI_SUGGESTIONS.map((item) => (
                <div className="case-suggestion" key={item.field}>
                  <div>
                    <strong>{item.field}</strong>
                    <CaseBadge tone="is-ai">AI建议</CaseBadge>
                  </div>
                  <p>{item.suggestion}</p>
                  <em>{item.source} · 置信度 {item.confidence}%</em>
                  <div>
                    <button type="button" disabled={adopted.includes(item.field)} onClick={() => setAdopted((prev) => [...prev, item.field])}>
                      {adopted.includes(item.field) ? '已采用' : '采用'}
                    </button>
                    <button type="button">忽略</button>
                    <button type="button" onClick={() => props.onNotice('请在下方“来源详情”中查看证据')}>证据</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="case-ai-block">
            <h2>质量问题</h2>
            <div className="case-quality-list">
              {QUALITY_ISSUES.map((item) => (
                <div className="case-quality-item" key={item.name}>
                  <CaseBadge>{item.level}</CaseBadge>
                  <strong>{item.name}</strong>
                  <p>{item.advice}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function CaseDetailPage(props: {
  mode: 'detail' | 'edit';
  activeCase: CaseRow;
  onBack: () => void;
  onEdit: () => void;
  onOpenDrawer: (drawer: GeneralDrawer) => void;
  onOpenModal: (modal: GeneralModal) => void;
  onNotice: (message: string) => void;
}) {
  const readonly = props.mode === 'detail';
  const isCreate = props.activeCase.id === NEW_CASE_TEMPLATE.id;
  const initialSourceType: CaseSourceType | '' = isCreate ? '日常监督形成' : props.activeCase.sourceType;
  const [selectedSourceType, setSelectedSourceType] = useState<CaseSourceType | ''>(initialSourceType);
  const [sourceDraft, setSourceDraft] = useState<SourceDraft>(() =>
    initialSourceType ? createSourceDraft(initialSourceType, props.activeCase, !isCreate) : {},
  );
  const [caseDraft, setCaseDraft] = useState<CaseDraft>(() => createCaseDraft(props.activeCase));
  const [problemDrawerOpen, setProblemDrawerOpen] = useState(false);
  const [problemKeyword, setProblemKeyword] = useState('');
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

  useEffect(() => {
    const nextSourceType: CaseSourceType | '' = props.activeCase.id === NEW_CASE_TEMPLATE.id ? '日常监督形成' : props.activeCase.sourceType;
    setSelectedSourceType(nextSourceType);
    setSourceDraft(nextSourceType ? createSourceDraft(nextSourceType, props.activeCase, props.activeCase.id !== NEW_CASE_TEMPLATE.id) : {});
    setCaseDraft(createCaseDraft(props.activeCase));
    setProblemDrawerOpen(false);
    setProblemKeyword('');
    setTagDropdownOpen(false);
  }, [props.activeCase.id, props.activeCase.sourceType, props.mode]);

  const updateCaseDraft = (field: keyof CaseDraft, value: string) => {
    setCaseDraft((prev) => ({ ...prev, [field]: value }));
  };

  const selectedCaseTags = splitCaseTags(caseDraft.tags);
  const appendCaseTag = (tag: string) => {
    if (!tag) return;
    setCaseDraft((prev) => {
      const nextTags = splitCaseTags(prev.tags);
      if (!nextTags.includes(tag)) nextTags.push(tag);
      return { ...prev, tags: nextTags.join('、') };
    });
  };
  const removeCaseTag = (tag: string) => {
    setCaseDraft((prev) => ({
      ...prev,
      tags: splitCaseTags(prev.tags).filter((item) => item !== tag).join('、'),
    }));
  };
  const toggleCaseTag = (tag: string) => {
    if (selectedCaseTags.includes(tag)) {
      removeCaseTag(tag);
      return;
    }
    appendCaseTag(tag);
  };

  const handleSourceTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSourceType = event.target.value as CaseSourceType | '';
    if (nextSourceType === selectedSourceType) return;

    const hasSourceInfo = Object.values(sourceDraft).some((value) => value.trim());
    if (selectedSourceType && hasSourceInfo) {
      const confirmed = typeof window === 'undefined' || window.confirm('切换来源类型将清空当前来源信息，是否继续？');
      if (!confirmed) return;
    }

    setSelectedSourceType(nextSourceType);
    setSourceDraft(nextSourceType ? createSourceDraft(nextSourceType, props.activeCase, false) : {});
  };

  const applyIssueSource = (issue: IssueSourceOption) => {
    setSourceDraft((prev) => ({ ...prev, 关联问题: issue.value }));
    setCaseDraft((prev) => ({
      ...prev,
      title: issue.title,
      region: issue.region,
      occurrenceTime: issue.occurrenceTime,
      involvedSubject: issue.involvedSubject,
      summary: issue.summary,
      tags: issue.tags,
    }));
    setProblemDrawerOpen(false);
  };

  const handleSourceFieldChange = (label: string, value: string) => {
    setSourceDraft((prev) => ({ ...prev, [label]: value }));
    if (label === '关联问题') {
      const issue = ISSUE_SOURCE_OPTIONS.find((item) => item.value === value);
      if (issue) {
        applyIssueSource(issue);
      }
    }
  };

  if (!readonly) {
    const sourceLocked = !isCreate && props.activeCase.lifecycle === 'stored';
    const sourceFields = selectedSourceType ? SOURCE_FIELD_LABELS[selectedSourceType] : [];
    const sourceTypeOptions = selectedSourceType && !FORM_SOURCE_TYPE_ITEMS.includes(selectedSourceType)
      ? [selectedSourceType, ...FORM_SOURCE_TYPE_ITEMS]
      : FORM_SOURCE_TYPE_ITEMS;
    return (
      <div className="case-workspace case-form-page ufsp-form-shell">
        <div className="case-form-head ufsp-form-head">
          <div className="ufsp-form-title">
            <button type="button" className="ufsp-form-back" onClick={props.onBack} aria-label="返回列表">
              <ArrowLeft size={18} />
            </button>
            <h1>
              <span>一般案例管理</span>
              <em>/ {isCreate ? '新增' : '编辑'}</em>
            </h1>
          </div>
          <div className="case-head-actions ufsp-form-actions">
            <button type="button" className="ufsp-btn ufsp-btn-primary" onClick={() => props.onNotice('已模拟保存案例')}>保存</button>
          </div>
        </div>

        <div className="case-edit-body case-report-body ufsp-ledger-edit-body">
          <section className="ufsp-ledger-edit-section case-report-section">
            <h2>来源选择</h2>
            <div className="ufsp-ledger-form-grid case-report-form-grid">
              <label className="ufsp-field-block">
                <span><b>*</b> 来源类型</span>
                <select value={selectedSourceType} onChange={handleSourceTypeChange} disabled={sourceLocked}>
                  {sourceTypeOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
            {sourceLocked ? <p className="case-source-tip">已入库案例不允许直接修改来源类型。</p> : null}
          </section>

          {!selectedSourceType ? (
            <div className="case-source-pending">请选择来源类型后继续维护来源信息和案例内容。</div>
          ) : (
            <>
              <section className="ufsp-ledger-edit-section case-report-section">
                <h2>来源信息</h2>
                <div className="ufsp-ledger-form-grid case-report-form-grid" key={selectedSourceType}>
                  {sourceFields.map((label) => (
                    <label className={`ufsp-field-block ${label.includes('说明') ? 'wide' : ''}`} key={label}>
                      <span>{label}</span>
                      {label === '关联问题' ? (
                        <div className="case-problem-select">
                          <input readOnly value={sourceDraft[label] || ''} placeholder="请选择关联问题" />
                          <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={() => setProblemDrawerOpen(true)}>
                            选择
                          </button>
                        </div>
                      ) : label.includes('说明') ? (
                        <textarea value={sourceDraft[label] || ''} placeholder="请输入" onChange={(event) => handleSourceFieldChange(label, event.target.value)} />
                      ) : (
                        <input value={sourceDraft[label] || ''} placeholder="请输入" onChange={(event) => handleSourceFieldChange(label, event.target.value)} />
                      )}
                    </label>
                  ))}
                </div>
              </section>

              <section className="ufsp-ledger-edit-section case-report-section">
                <h2>案例信息</h2>
                <div className="ufsp-ledger-form-grid case-report-form-grid">
                  <label className="ufsp-field-block">
                    <span><b>*</b> 案例标题</span>
                    <input value={caseDraft.title} placeholder="请输入" onChange={(event) => updateCaseDraft('title', event.target.value)} />
                  </label>
                  <label className="ufsp-field-block">
                    <span>所属地区</span>
                    <input value={caseDraft.region} placeholder="请选择" onChange={(event) => updateCaseDraft('region', event.target.value)} />
                  </label>
                  <label className="ufsp-field-block">
                    <span>发生时间</span>
                    <input value={caseDraft.occurrenceTime} placeholder="请选择" onChange={(event) => updateCaseDraft('occurrenceTime', event.target.value)} />
                  </label>
                  <label className="ufsp-field-block">
                    <span>涉及主体</span>
                    <input value={caseDraft.involvedSubject} placeholder="请输入" onChange={(event) => updateCaseDraft('involvedSubject', event.target.value)} />
                  </label>
                  <label className="ufsp-field-block wide case-report-textarea">
                    <span><b>*</b> 案例描述</span>
                    <textarea value={caseDraft.summary} placeholder="请输入案例描述" maxLength={2000} onChange={(event) => updateCaseDraft('summary', event.target.value)} />
                    <em>{caseDraft.summary.length} / 2000</em>
                  </label>
                  <div className="ufsp-field-block wide case-tag-field">
                    <span>案例标签</span>
                    <div className={`case-tag-select ${tagDropdownOpen ? 'is-open' : ''}`}>
                      <button
                        type="button"
                        className="case-tag-trigger"
                        onClick={() => setTagDropdownOpen((open) => !open)}
                        aria-expanded={tagDropdownOpen}
                      >
                        <span>{selectedCaseTags.length ? `已选择 ${selectedCaseTags.length} 个标签` : '请选择标签'}</span>
                        <ChevronDown size={14} />
                      </button>
                      {tagDropdownOpen ? (
                        <div className="case-tag-dropdown">
                          <div className="case-tag-options">
                            {CASE_TAG_OPTIONS.map((tag) => {
                              const selected = selectedCaseTags.includes(tag);
                              return (
                                <button
                                  type="button"
                                  key={tag}
                                  className={selected ? 'is-selected' : ''}
                                  onClick={() => toggleCaseTag(tag)}
                                >
                                  <span>{tag}</span>
                                  {selected ? <Check size={13} /> : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="case-flat-tags">
                      {selectedCaseTags.length ? (
                        selectedCaseTags.map((tag) => (
                          <button type="button" key={tag} onClick={() => removeCaseTag(tag)} title="点击移除标签">
                            {tag}
                          </button>
                        ))
                      ) : (
                        CASE_TAG_OPTIONS.slice(0, 6).map((tag) => (
                          <button type="button" className="is-sample" key={tag} onClick={() => appendCaseTag(tag)}>
                            {tag}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <label className="ufsp-field-block wide case-report-textarea">
                    <span>备注</span>
                    <textarea value={caseDraft.remark} placeholder="请输入" onChange={(event) => updateCaseDraft('remark', event.target.value)} />
                  </label>
                </div>
              </section>

              <section className="ufsp-ledger-edit-section case-report-section">
                <h2>材料附件</h2>
                <MaterialAttachmentTable activeCase={props.activeCase} />
              </section>

              {!isCreate ? (
                <section className="ufsp-ledger-edit-section case-report-section">
                  <h2>系统信息</h2>
                  <div className="ufsp-ledger-form-grid case-report-form-grid">
                    {[
                      ['案例编号', props.activeCase.code],
                      ['录入机构', props.activeCase.entryOrg],
                      ['录入人', props.activeCase.entryPerson],
                    ].map(([label, value]) => (
                      <label className="ufsp-field-block" key={label}>
                        <span>{label}</span>
                        <input readOnly value={value} />
                      </label>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
        {problemDrawerOpen && selectedSourceType ? (
          <ProblemPickerDrawer
            sourceType={selectedSourceType}
            keyword={problemKeyword}
            selectedValue={sourceDraft.关联问题 || ''}
            onKeywordChange={setProblemKeyword}
            onSelect={applyIssueSource}
            onClose={() => setProblemDrawerOpen(false)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="case-workspace case-form-page ufsp-form-shell">
      <div className="case-form-head ufsp-form-head">
        <div className="ufsp-form-title">
          <button type="button" className="ufsp-form-back" onClick={props.onBack} aria-label="返回列表">
            <ArrowLeft size={18} />
          </button>
          <h1>
            <span>一般案例管理</span>
            <em>/ 案例详情</em>
          </h1>
        </div>
        <div className="case-head-actions ufsp-form-actions">
          <button type="button" className="ufsp-btn ufsp-btn-secondary" onClick={props.onEdit}>
            <Pencil size={15} /> 编辑
          </button>
          <button type="button" className="ufsp-btn" onClick={() => props.onOpenModal('tag')}>调整标签</button>
          <button type="button" className="ufsp-btn" onClick={() => props.onOpenDrawer('similar')}>查看相似案例</button>
          <button type="button" className="ufsp-btn" onClick={() => props.onNotice('已模拟发起典型案例')}>发起典型案例</button>
          <button type="button" className="ufsp-btn" onClick={() => props.onOpenModal('disable')}>停用</button>
        </div>
      </div>
      <div className="case-detail-body">
        <div className="case-detail-summary">
          <strong>{props.activeCase.title}</strong>
          <span>{props.activeCase.summary}</span>
          <div>
            <CaseBadge>{CASE_LIFECYCLE_LABELS[props.activeCase.lifecycle]}</CaseBadge>
            <CaseBadge>{props.activeCase.sourceType}</CaseBadge>
          </div>
        </div>
        <div className="case-detail-tabs">
          {['案例信息', '关联来源', '标签信息', '材料附件', '使用情况', '版本记录', '操作日志'].map((item) => (
            <button type="button" key={item} onClick={() => (item.includes('记录') || item.includes('日志') ? props.onOpenDrawer('records') : undefined)}>
              {item}
            </button>
          ))}
        </div>
        <CaseSection title="案例信息">
          <div className="case-readonly-grid">
            {[
              ['案例编号', props.activeCase.code],
              ['来源类型', props.activeCase.sourceType],
              ['案例标题', props.activeCase.title],
              ['所属地区', props.activeCase.region],
              ['发生时间', props.activeCase.occurrenceTime],
              ['涉及主体', props.activeCase.involvedSubject],
              ['录入机构', props.activeCase.entryOrg],
              ['录入人', props.activeCase.entryPerson],
            ].map(([label, value]) => (
              <label className="case-field" key={label}>
                <span>{label}</span>
                {readonly ? <div className="case-readonly-value">{value}</div> : <input defaultValue={value} />}
              </label>
            ))}
          </div>
        </CaseSection>
        <CaseSection title="关联来源">
          <div className="case-readonly-grid">
            {props.activeCase.relatedSource.map((item) => (
              <label className="case-field" key={item.label}>
                <span>{item.label}</span>
                <div className="case-readonly-value">{item.value || '-'}</div>
              </label>
            ))}
          </div>
        </CaseSection>
        <CaseSection title="案例内容">
          <div className="case-readonly-grid">
            <label className="case-field case-field-wide">
              <span>案例描述</span>
              <div className="case-readonly-value">{props.activeCase.summary}</div>
            </label>
            <label className="case-field case-field-wide">
              <span>备注</span>
              <div className="case-readonly-value">{props.activeCase.remark || '-'}</div>
            </label>
          </div>
        </CaseSection>
        <CaseSection title="标签信息">
          <div className="case-label-groups case-label-groups-flat">
            <div>
              <span>案例标签</span>
              {renderTags(props.activeCase.tags)}
            </div>
          </div>
        </CaseSection>
        <CaseSection title="材料附件">
          <MaterialAttachmentTable activeCase={props.activeCase} readonly />
        </CaseSection>
        <CaseSection title="使用情况">
          <div className="case-use-grid">
            {[
              ['检索使用次数', props.activeCase.useCount],
              ['推荐使用次数', props.activeCase.recommendCount],
              ['共性分析引用', props.activeCase.analysisCount],
              ['典型案例引用', props.activeCase.typicalRefCount],
              ['最近使用时间', props.activeCase.lastUsed],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </CaseSection>
      </div>
    </div>
  );
}

function CaseSection(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="case-section">
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}

function getSourceDetail(activeCase: CaseRow) {
  const fallbackText = [
    activeCase.sourceInfo ? `来源说明：${activeCase.sourceInfo}` : '',
    activeCase.sourceUnit ? `来源单位：${activeCase.sourceUnit}` : '',
    activeCase.originalTitle ? `原始标题：${activeCase.originalTitle}` : '',
    activeCase.importTime ? `导入时间：${activeCase.importTime}` : '',
  ].filter(Boolean).join('。');

  return {
    title: activeCase.sourceInfo || activeCase.originalTitle || activeCase.title,
    relatedSource: activeCase.relatedSource,
    rawText: activeCase.sourceRawText || fallbackText || '暂无原始信息。',
    attachments: activeCase.sourceAttachments || [],
    sourceUrl: activeCase.sourceUrl,
  };
}

function CaseDrawer(props: { type: GeneralDrawer; activeCase: CaseRow; onClose: () => void }) {
  if (!props.type) return null;
  const sourceDetail = getSourceDetail(props.activeCase);
  const title =
    props.type === 'overview' ? '入库概览' : props.type === 'source' ? '来源详情' : props.type === 'similar' ? '相似案例对比' : '入库记录查看';
  return (
    <div className="case-drawer-mask">
      <aside className="case-drawer">
        <div className="case-drawer-head">
          <h2>{title}</h2>
          <button type="button" onClick={props.onClose}>
            <X size={16} />
          </button>
        </div>
        {props.type === 'overview' ? (
          <div className="case-drawer-content">
            {['待入库 3', '已入库 2', '不入库 1', '已停用 1'].map((item) => (
              <div className="case-record-line" key={item}>{item}</div>
            ))}
            <div className="case-warning-block">最近待完善：采购合同履约资料缺失案例存在阻断项，案例标签缺失。</div>
          </div>
        ) : props.type === 'similar' ? (
          <div className="case-compare-grid">
            <div>
              <h3>当前案例</h3>
              <p>{props.activeCase.summary}</p>
              {renderTags(props.activeCase.tags)}
            </div>
            <div>
              <h3>相似案例</h3>
              <p>专项债券绩效目标设置不完整，整改后补充指标和项目执行台账。</p>
              {renderTags(['专项债券', '绩效目标', '整改台账'])}
            </div>
            <div className="case-warning-block">相似度 86%，相同字段：案例标签、发生时间；差异字段：涉及主体、来源类型。</div>
          </div>
        ) : props.type === 'records' ? (
          <div className="case-drawer-content">
            {['2026-07-15 09:20 AI重新分析，生成3条字段建议', '2026-07-14 18:10 人工调整标签', '2026-07-14 10:24 数据导入并完成初始解析'].map((item) => (
              <div className="case-record-line" key={item}>
                <History size={14} /> {item}
              </div>
            ))}
          </div>
        ) : (
          <div className="case-drawer-content">
            <div className="case-source-card">
              <div className="case-source-title">
                <CaseBadge>{props.activeCase.sourceType}</CaseBadge>
                <h3>{sourceDetail.title}</h3>
              </div>
              <div className="case-source-extra">
                <h4>关联来源</h4>
                <div className="case-source-related-list">
                  {sourceDetail.relatedSource.map((item) => (
                    <div key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value || '-'}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="case-source-raw">
                <h4>原始信息</h4>
                <p>{sourceDetail.rawText}</p>
              </div>
              {sourceDetail.attachments.length ? (
                <div className="case-source-extra">
                  <h4>附件</h4>
                  <div className="case-source-file-list">
                    {sourceDetail.attachments.map((item) => (
                      <button type="button" key={item}>{item}</button>
                    ))}
                  </div>
                </div>
              ) : null}
              {sourceDetail.sourceUrl ? (
                <div className="case-source-extra">
                  <h4>外部地址</h4>
                  <a href={sourceDetail.sourceUrl} target="_blank" rel="noreferrer">{sourceDetail.sourceUrl}</a>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function CaseModal(props: { type: GeneralModal; activeCase: CaseRow; onClose: () => void; onConfirm: (message: string) => void }) {
  if (!props.type) return null;
  const title =
    props.type === 'import' ? '导入案例' : props.type === 'reject' ? '不入库确认' : props.type === 'disable' ? '停用确认' : '标签选择';
  return (
    <div className="case-modal-mask">
      <div className={`case-modal ${props.type === 'tag' ? 'case-modal-wide' : ''}`}>
        <div className="case-modal-head">
          <h2>{title}</h2>
          <button type="button" onClick={props.onClose}>
            <X size={16} />
          </button>
        </div>
        {props.type === 'import' ? (
          <div className="case-modal-form">
            <div className="case-upload-box">
              <UploadCloud size={28} />
              <strong>选择本地文件或拖拽上传</strong>
              <span>支持 xlsx、docx、pdf，前端阶段模拟上传和解析结果。</span>
            </div>
            <button type="button" className="ufsp-btn ufsp-btn-secondary">
              <ToolbarExportIcon size={14} /> 下载导入模板
            </button>
          </div>
        ) : props.type === 'tag' ? (
          <div className="case-tag-selector">
            <div>
              <h3>标签分类</h3>
              {['财政监督', '预算绩效', '政府采购', '资产管理', '惠民补贴'].map((item) => <button type="button" key={item}>{item}</button>)}
            </div>
            <div>
              <h3>标签列表</h3>
              {['绩效目标不完整', '资金用途不清晰', '资料缺失', '责任分解', '台账跟踪'].map((item) => <label key={item}><input type="checkbox" defaultChecked={item.includes('绩效')} />{item}</label>)}
            </div>
            <div>
              <h3>已选择</h3>
              {renderTags(['绩效目标不完整', '资金用途不清晰', '台账跟踪'])}
            </div>
          </div>
        ) : (
          <div className="case-modal-form">
            <p>{props.type === 'disable' ? `确认停用 ${props.activeCase.title}？停用后仍可查看历史引用。` : `确认将 ${props.activeCase.title} 标记为不入库？`}</p>
            <label>
              <span>{props.type === 'disable' ? '停用原因' : '不入库原因'}</span>
              <select>
                <option>{props.type === 'disable' ? '来源不再适用' : '重复数据'}</option>
                <option>信息不足</option>
                <option>来源不可信</option>
                <option>其他</option>
              </select>
            </label>
            <label>
              <span>处理说明</span>
              <textarea placeholder="请输入说明" />
            </label>
          </div>
        )}
        <div className="case-modal-actions">
          <button type="button" className="ufsp-btn" onClick={props.onClose}>取消</button>
          <button
            type="button"
            className="ufsp-btn ufsp-btn-primary"
            onClick={() => props.onConfirm(props.type === 'disable' ? '已模拟停用该案例' : props.type === 'reject' ? '已模拟标记不入库' : props.type === 'import' ? '已模拟上传并生成预览结果' : '已模拟保存标签')}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

const Component = forwardRef<AxureHandle, AxureProps>(function Component(innerProps, ref) {
  const configSource = innerProps.config || {};
  const emitEvent = createEventEmitter(innerProps.onEvent);
  const query = useQuery();
  const title = getConfigValue<string>(configSource, 'title', '财会监督系统');
  const topicName = getConfigValue<string>(configSource, 'topic_name', '案例库（AI改造）');
  const rawFeatureKey = String(query.feature || 'general_case_management');
  const featureKey = rawFeatureKey === 'typical_case_management' ? 'typical_case_application' : rawFeatureKey;
  const flatFeatures = useMemo(() => flattenFeatures(), []);
  const activeFeature = flatFeatures.find((item) => item.key === featureKey) || flatFeatures[0];
  const activeGroup = findFeatureGroup(activeFeature.key);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['典型案例管理']);

  useImperativeHandle(
    ref,
    function () {
      return {
        getVar: function (name: string) {
          if (name === 'feature_key') return activeFeature.key;
          if (name === 'feature_name') return activeFeature.name;
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
    [activeFeature],
  );

  const featureHref = (nextFeatureKey: string) => `/prototypes/case-library-ai?feature=${encodeURIComponent(nextFeatureKey)}`;

  const onNavigate = (href: string) => {
    const correctedHref = href.startsWith('/pages/') ? href.replace('/pages/', '/prototypes/') : href;
    emitEvent('onNavigate', correctedHref);
    try {
      window.location.href = correctedHref;
    } catch {
      // 原型环境忽略跳转失败。
    }
  };

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));
  };

  return (
    <div className="case-library-page">
      <TopBar title={title} onNavigate={onNavigate} />

      <main className="case-layout">
        <div className="case-frame">
          <aside className={`case-sidebar ${collapsed ? 'is-collapsed' : ''}`} style={{ width: collapsed ? 64 : 272 }}>
            <div className="case-sidebar-head" title={topicName}>
              <div className="case-sidebar-brand">
                <span className="case-sidebar-logo" aria-hidden="true">
                  <Database size={20} />
                </span>
                <div className="case-sidebar-title">
                  <span>案例库</span>
                  <em>AI改造</em>
                </div>
              </div>
              <button
                type="button"
                className="case-sidebar-trigger"
                aria-label={collapsed ? '展开案例库菜单' : '收起案例库菜单'}
                onClick={() => setCollapsed((prev) => !prev)}
              >
                {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>

            <nav className="case-nav" aria-label="案例库功能菜单">
              {collapsed
                ? flatFeatures.map((item) => {
                    const active = item.key === activeFeature.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className={`case-nav-item ${active ? 'is-active' : ''}`}
                        title={item.name}
                        onClick={() => onNavigate(featureHref(item.key))}
                      >
                        <FeatureIconMark Icon={item.Icon} active={active} />
                      </button>
                    );
                  })
                : FEATURES.map((item) => {
                    if (item.type === 'group') {
                      const expanded = expandedGroups.includes(item.name);
                      const groupActive = item.children.some((child) => child.key === activeFeature.key);
                      return (
                        <div className="case-nav-group" key={item.name}>
                          <button
                            type="button"
                            className={[
                              'case-nav-group-title',
                              groupActive && !expanded ? 'is-active' : '',
                              groupActive && expanded ? 'is-ancestor' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
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
                                const active = child.key === activeFeature.key;
                                return (
                                  <button
                                    key={child.key}
                                    type="button"
                                    className={`case-nav-item case-nav-child ${active ? 'is-active' : ''}`}
                                    onClick={() => onNavigate(featureHref(child.key))}
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

                    const active = item.key === activeFeature.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className={`case-nav-item ${active ? 'is-active' : ''}`}
                        onClick={() => onNavigate(featureHref(item.key))}
                      >
                        <FeatureIconMark Icon={item.Icon} active={active} />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
            </nav>
          </aside>

          <section className="case-content">
            {activeFeature.key === 'general_case_management' ? (
              <GeneralCaseManagementPage />
            ) : activeFeature.key === 'common_insight' ? (
              <CommonInsightPage />
            ) : activeFeature.key === 'typical_case_application' ? (
              <TypicalCaseManagementPage mode="application" />
            ) : activeFeature.key === 'typical_case_review' ? (
              <TypicalCaseManagementPage mode="review" />
            ) : (
              <CurrentFeatureEmpty feature={activeFeature} groupName={activeGroup?.name} />
            )}
          </section>
        </div>
      </main>
    </div>
  );
});

export default Component;
