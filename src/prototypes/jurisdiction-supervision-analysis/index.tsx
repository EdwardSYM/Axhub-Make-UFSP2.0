/**
 * @name 全辖监督分析
 */
import './style.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { CalendarDays, ChevronLeft, ChevronRight, Info, RefreshCw, X } from 'lucide-react';
import TopBar from '../../common/components/TopBar';

type TimeRange = '今日' | '昨日' | '本月' | '本季度' | '本年' | '自定义';
type MonitorCategory = '全部' | '业务监控' | '专题监控';
type DetailTab = '区划主题明细' | '异常数据明细' | '规则触发明细';
type RiskLevel = '低风险' | '较低风险' | '中风险' | '较高风险' | '高风险';
type MapRiskLevel = '高风险' | '中风险' | '低风险';
type MapMetric = '综合表现' | '综合情况' | '评分表现' | '主题得分' | '低分指标' | '预警疑点' | '问题数量' | '问题金额' | '整改状态' | '超期问题' | '退回问题' | '督办问题' | '案例沉淀';
type RuleAnalysisTab = '规则触发分析' | '预警疑点分析' | '确认问题分析' | '案例沉淀分析' | '明细追溯' | '问题分布' | '整改状态' | '超期问题' | '退回问题' | '督办问题' | '案例沉淀';
type SubjectTypeFilter = '全部' | '财政部门' | '主管部门' | '预算单位' | '省直单位' | '责任单位';
type ThemeHoverMetric = '异常率' | '退回率' | '闭环率';
type SupervisionCategory = '日常监督' | '专项监督';
type AttentionLevel = '高关注' | '中关注' | '低关注' | '暂无数据';
type AnalysisShape = 'jurisdiction' | 'unit';
type FilterMenuKey = 'time' | 'adminRegion' | 'supervisionCategory' | 'monitorTheme';
type DatePickerKey = 'start' | 'end';

interface MapAreaFeature {
  name: string;
  parentRegion: string;
  scoreOffset: number;
  hasData?: boolean;
}

interface GeoFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: unknown;
}

interface GeoJsonCollection {
  type: string;
  features: GeoFeature[];
}

type EChartsGeoJson = Parameters<typeof echarts.registerMap>[1];

interface RegionScore {
  regionName: string;
  comprehensiveScore: number;
  riskLevel: RiskLevel;
  highRiskSubjects: number;
  highRiskThemes: number;
  abnormalCount: number;
  abnormalTotalCount: number;
  interceptCount: number;
  closedLoopRate: number;
  reviewRejectCount: number;
  reviewSubmitCount: number;
  mainLowThemes: string[];
  lowestThemeScore?: string;
  lowScoreIndicatorsList?: string;
  highFrequencyRules?: string;
  relatedSubjects?: number;
  mainRejectReasons?: string;
  overdueCount?: number;
  pendingCount?: number;
  closedLoopCount?: number;
  shouldClosedCount?: number;
  confirmedIssueCount?: number;
  problemAmount?: number;
  caseCount?: number;
  averageScore?: number;
  warningCount?: number;
}

interface SubjectThemeScore {
  subjectName: string;
  regionName: string;
  subjectType: string;
  monitorCategory: Exclude<MonitorCategory, '全部'>;
  monitorTheme: string;
  themeScore: number;
  themeWeight: number;
  subjectWeight: number;
  riskLevel: RiskLevel;
  lowScoreIndicators: string[];
  abnormalCount: number;
  interceptCount: number;
  closedLoopRate: number;
  mainDeductionReason: string;
}

interface SubjectSummary {
  subjectName: string;
  regionName: string;
  subjectType: string;
  comprehensiveScore: number;
  riskLevel: RiskLevel;
  lowThemes: string[];
  mainDeductionReason: string;
  abnormalCount: number;
  abnormalTotalCount: number;
  reviewRejectCount: number;
  reviewSubmitCount: number;
  closedLoopRate: number;
  closedLoopCount: number;
  shouldClosedCount: number;
  ruleTriggerCount?: number;
}

interface ThemePosture {
  monitorCategory: Exclude<MonitorCategory, '全部'>;
  monitorTheme: string;
  averageScore: number;
  riskLevel: RiskLevel;
  highRiskSubjects: number;
  lowScoreIndicators: number;
  abnormalCount: number;
  abnormalTotalCount: number;
  abnormalRate: number;
  reviewRejectCount: number;
  reviewSubmitCount: number;
  reviewRejectRate: number;
  closedLoopRate: number;
  closedLoopCount: number;
  shouldClosedCount: number;
  interceptCount: number;
  mainDeductionReason: string;
}

interface IndicatorEvidence {
  indicatorName: string;
  monitorTheme: string;
  score: number;
  affectedSubjects: number;
  relatedRules: number;
  abnormalCount: number;
  interceptCount: number;
  mainDeductionReason: string;
  closedLoopRate: number;
}

interface AbnormalDetail {
  triggerTime: string;
  regionName: string;
  subjectName: string;
  monitorCategory: Exclude<MonitorCategory, '全部'>;
  monitorTheme: string;
  ruleName: string;
  warningLevel: string;
  processingMethod: string;
  amount: string;
  currentStatus: string;
  linkedIndicator: string;
}

interface RuleIntercept {
  executionTime: string;
  ruleCode: string;
  ruleName: string;
  monitorTheme: string;
  executionResult: string;
  hitCount: number;
  interceptCount: number;
  failureReason: string;
}

interface RuleTypeSummary {
  ruleType: string;
  ruleCount: number;
  triggerCount: number;
  abnormalCount: number;
  interceptCount: number;
  subjectCount: number;
}

interface HighFrequencyRule {
  ruleCode: string;
  ruleName: string;
  businessCategory: string;
  monitorTheme: string;
  relatedIndicator: string;
  triggerCount: number;
  abnormalCount: number;
  interceptCount: number;
  subjectCount: number;
}

interface SubjectTriggerSummary {
  subjectName: string;
  regionName: string;
  subjectType: string;
  ruleCount: number;
  triggerCount: number;
  abnormalCount: number;
  interceptCount: number;
  comprehensiveScore: number;
}

interface AttentionSubject {
  subjectName: string;
  regionName: string;
  subjectType: string;
  lowThemeCount: number;
  totalThemeCount: number;
  lowThemeRatio: number;
  triggeredRuleCount: number;
  warningCount: number;
  verifiedClueCount: number;
  confirmedIssueCount: number;
  pendingClueCount: number;
  issueConversionRate: number;
  problemAmount: number;
  problemAmountText: string;
  lowThemes: string[];
  attentionLevel: AttentionLevel;
  attentionScore: number;
  reason: string;
}

interface AttentionRegion {
  regionName: string;
  comprehensiveScore: number;
  evaluationScore: number;
  problemAmountScore: number;
  problemCountScore: number;
  warningScore: number;
  averageScore: number;
  lowThemeCount: number;
  totalThemeCount: number;
  lowThemeRatio: number;
  triggeredRuleCount: number;
  warningCount: number;
  verifiedClueCount: number;
  confirmedIssueCount: number;
  issueConversionRate: number;
  problemAmount: number;
  problemAmountText: string;
  impactThemeCount: number;
  businessAreaCount: number;
  fundTypeCount: number;
  caseCount: number;
  lowThemes: string[];
  mainDeductionIndicators: string[];
  attentionLevel: AttentionLevel;
  attentionScore: number;
  reason: string;
}

interface AttentionTheme {
  monitorTheme: string;
  monitorCategory: Exclude<MonitorCategory, '全部'>;
  comprehensiveScore: number;
  evaluationScore: number;
  problemAmountScore: number;
  problemCountScore: number;
  warningScore: number;
  averageScore: number;
  medianScore: number;
  lowSubjectCount: number;
  coverageSubjectCount: number;
  lowSubjectRatio: number;
  enabledRuleCount: number;
  warningCount: number;
  confirmedIssueCount: number;
  problemAmount: number;
  problemAmountText: string;
  caseCount: number;
  affectedRegionCount: number;
  policyCoverage: string;
  systemCompleteness: number;
  attentionLevel: AttentionLevel;
  attentionScore: number;
  reason: string;
}

type SpecialThemeCategory = '重点领域整改' | '专项检查' | '审计问题整改' | '巡视问题整改';

interface SpecialIssueRecord {
  regionName: string;
  themeCategory: SpecialThemeCategory;
  monitorTheme: string;
  issueType: string;
  issueCount: number;
  issueAmount: number;
  unclosedCount: number;
  overdueCount: number;
  returnedCount: number;
  supervisedCount: number;
  repeatedSupervisedCount: number;
  caseCount: number;
  notStartedCount: number;
  inProgressCount: number;
  submittedCount: number;
  reviewCount: number;
  closedCount: number;
  responsibleUnit: string;
  returnReason: string;
  dataStatus: string;
  riskReason: string;
}

interface SpecialAttentionRegion {
  regionName: string;
  issueCount: number;
  issueAmount: number;
  issueAmountText: string;
  unclosedCount: number;
  overdueCount: number;
  returnedCount: number;
  supervisedCount: number;
  repeatedSupervisedCount: number;
  caseCount: number;
  closedCount: number;
  notStartedCount: number;
  inProgressCount: number;
  submittedCount: number;
  reviewCount: number;
  closedRate: number;
  mainThemes: string[];
  themeCategoryCount: number;
  attentionScore: number;
  attentionLevel: AttentionLevel;
  reason: string;
}

interface SpecialAttentionTheme {
  themeCategory: SpecialThemeCategory;
  monitorTheme: string;
  coverageRegionCount: number;
  issueCount: number;
  issueAmount: number;
  issueAmountText: string;
  unclosedCount: number;
  overdueCount: number;
  returnedCount: number;
  supervisedCount: number;
  repeatedSupervisedCount: number;
  caseCount: number;
  closedCount: number;
  closedRate: number;
  caseConversionRate: number;
  attentionScore: number;
  attentionLevel: AttentionLevel;
  reason: string;
}

interface SpecialIssueDetail {
  issueCode: string;
  regionName: string;
  themeCategory: SpecialThemeCategory;
  monitorTheme: string;
  issueName: string;
  responsibleUnit: string;
  deadline: string;
  currentStatus: string;
  overdueDays: string;
  issueAmount: string;
  supervised: string;
  returnedReason: string;
  returnedAt: string;
  returnedCount: string;
  resubmitted: string;
  supervisionTimes: string;
  lastSupervisionAt: string;
  supervisionDeadline: string;
  closedFlag: string;
  typicalCaseName: string;
  caseStatus: string;
}

interface ClueConversionSummary {
  key: string;
  monitorTheme: string;
  regionName: string;
  warningCount: number;
  verifiedClueCount: number;
  confirmedIssueCount: number;
  conversionRate: number;
  mainRule: string;
}

interface FormedCaseRecord {
  caseName: string;
  caseCode: string;
  monitorTheme: string;
  regionName: string;
  relatedUnit: string;
  caseType: string;
  caseSource: string;
  sourceProblemCode: string;
  sourceClueCode: string;
  relatedRule: string;
  amount: string;
  isTypical: '是' | '否';
  status: '已入库' | '已发布' | '已审核待发布';
  storedAt: string;
}

interface MetricCard {
  title: string;
  value: string | number;
  unit: string;
  secondaryValue?: string | number;
  secondaryUnit?: string;
  emphasis: 'score' | 'risk' | 'evidence' | 'closure' | 'rate';
  description: string;
  aiConclusion: string;
  statusText?: string;
  trendText?: string;
  trendDirection?: 'up' | 'down';
  hoverExplanation?: {
    numerator?: string;
    denominator?: string;
    calculationFormula?: string;
    meaning?: string;
    scope?: string;
    additionalInfo?: string;
    referenceFactors?: string[];
  };
}

interface DrawerStatItem {
  label: string;
  value: string;
  group?: string;
  showInfo?: boolean;
}

interface DrawerEntryItem {
  name: string;
  meta: string;
  value: string;
  reason: string;
  data?: SubjectSummary | ThemePosture | IndicatorEvidence | RuleIntercept;
}

interface DrawerFilterItem {
  label: string;
  value: string;
}

interface DrawerTableColumn {
  key: string;
  label: string;
}

interface DrawerTableInfo {
  columns: DrawerTableColumn[];
  rows: Array<Record<string, string>>;
}

interface MetricDrawerInfo {
  drawerTitle: string;
  summary: string;
  primary: {
    label: string;
    value: string;
    badge: string;
    formula: string;
    source: string;
    explanation: string;
    numerator?: string;
    denominator?: string;
  };
  sections: Array<{
    title: string;
    stats: DrawerStatItem[];
  }>;
  listTitle: string;
  listHint: string;
  entries: DrawerEntryItem[];
  filters?: DrawerFilterItem[];
  table?: DrawerTableInfo;
  detailModules?: Array<{
    title: string;
    content: string;
  }>;
}

const DATA_UPDATED_AT = '2026年5月14日 15:00';

const timeRanges: TimeRange[] = ['今日', '昨日', '本月', '本季度', '本年', '自定义'];
const calendarWeekdays = ['日', '一', '二', '三', '四', '五', '六'];
const cityRegions = ['长沙市', '株洲市', '湘潭市', '衡阳市', '邵阳市', '岳阳市', '常德市', '张家界市', '益阳市', '郴州市', '永州市', '怀化市', '娄底市', '湘西州'];
const countyParentMap: Record<string, string> = {
  岳麓区: '长沙市',
  芙蓉区: '长沙市',
  长沙县: '长沙市',
  天元区: '株洲市',
  醴陵市: '株洲市',
  雨湖区: '湘潭市',
  湘潭县: '湘潭市',
  蒸湘区: '衡阳市',
  衡阳县: '衡阳市',
  双清区: '邵阳市',
  邵东市: '邵阳市',
  岳阳楼区: '岳阳市',
  平江县: '岳阳市',
  武陵区: '常德市',
  桃源县: '常德市',
  永定区: '张家界市',
  慈利县: '张家界市',
  赫山区: '益阳市',
  沅江市: '益阳市',
  北湖区: '郴州市',
  宜章县: '郴州市',
  冷水滩区: '永州市',
  祁阳市: '永州市',
  鹤城区: '怀化市',
  溆浦县: '怀化市',
  娄星区: '娄底市',
  涟源市: '娄底市',
  吉首市: '湘西州',
  凤凰县: '湘西州',
};

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date(2026, 4, 1);
  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function formatDateDisplay(value: string) {
  return value.replace(/-/g, '/');
}

function formatCalendarMonth(date: Date) {
  return `${date.getFullYear()}年${padDatePart(date.getMonth() + 1)}月`;
}

function shiftCalendarMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function buildCalendarCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const currentMonthDays = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();

  return Array.from({ length: 42 }, (_, index) => {
    const dayIndex = index - firstDay + 1;
    const cellDate = dayIndex < 1
      ? new Date(year, month - 1, previousMonthDays + dayIndex)
      : dayIndex > currentMonthDays
        ? new Date(year, month + 1, dayIndex - currentMonthDays)
        : new Date(year, month, dayIndex);

    return {
      value: formatDateValue(cellDate),
      day: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === month,
    };
  });
}
const jurisdictionAdminRegionOptions = [
  { value: '湖南省全辖', label: '湖南省全辖', level: 0 },
  { value: '省本级', label: '省本级', level: 1 },
  ...cityRegions.flatMap((city) => [
    { value: city, label: city, level: 1 },
    { value: `${city}本级`, label: `${city}本级`, level: 2 },
    ...Object.entries(countyParentMap)
      .filter(([, parent]) => parent === city)
      .map(([county]) => ({ value: county, label: county, level: 2 })),
  ]),
];
const businessThemes = ['基础信息', '项目库', '预算编制', '预算批复', '预算调整调剂', '指标管理', '预算执行', '资产管理', '会计核算'];
const specialThemes = ['地方政府债务', '高标准农田建设资金使用', '行政事业单位国有资产处置', '减税降费政策落实', '违规返还财政收入', '三保', '三公', '一卡通'];
const specialSupervisionThemeGroups: Array<{ category: SpecialThemeCategory; themes: string[] }> = [
  {
    category: '重点领域整改',
    themes: ['地方政府债务', '高标准农田建设资金使用管理', '行政事业单位国有资产处置管理', '减税降费政策落实', '违规返还财政收入', '基层“三保”', '财政暂付款管理', '财政收入虚收空转'],
  },
  {
    category: '专项检查',
    themes: ['会计信息质量检查', '执业质量检查'],
  },
  {
    category: '审计问题整改',
    themes: ['专项资金审计', '预算执行审计整改'],
  },
  {
    category: '巡视问题整改',
    themes: ['省委巡视整改项', '市级巡察反馈项', '其他巡视整改项'],
  },
];
const supervisionCategoryOptions: SupervisionCategory[] = ['日常监督', '专项监督'];
const mapMetricsAllThemes: MapMetric[] = ['综合表现', '评分表现', '预警疑点', '问题数量', '问题金额'];
const mapMetricsSpecificTheme: MapMetric[] = ['综合表现', '主题得分', '低分指标', '预警疑点', '问题数量', '问题金额'];
const specialMapMetrics: MapMetric[] = ['综合情况', '问题数量', '问题金额', '整改状态', '超期问题', '退回问题', '督办问题', '案例沉淀'];
const specialAnalysisTabs: RuleAnalysisTab[] = ['问题分布', '整改状态', '超期问题', '退回问题', '督办问题', '案例沉淀'];
const subjectTypeFilters: SubjectTypeFilter[] = ['全部', '财政部门', '主管部门', '预算单位', '省直单位', '责任单位'];

const riskToneClass: Record<RiskLevel, string> = {
  高风险: 'risk-high',
  较高风险: 'risk-higher',
  中风险: 'risk-mid',
  较低风险: 'risk-lower',
  低风险: 'risk-low',
};

const cityCodePrefixMap: Record<string, string> = {
  '4301': '长沙市',
  '4302': '株洲市',
  '4303': '湘潭市',
  '4304': '衡阳市',
  '4305': '邵阳市',
  '4306': '岳阳市',
  '4307': '常德市',
  '4308': '张家界市',
  '4309': '益阳市',
  '4310': '郴州市',
  '4311': '永州市',
  '4312': '怀化市',
  '4313': '娄底市',
  '4331': '湘西州',
};

function riskByScore(score: number): RiskLevel {
  if (score >= 90) return '低风险';
  if (score >= 80) return '较低风险';
  if (score >= 70) return '中风险';
  if (score >= 60) return '较高风险';
  return '高风险';
}

function primaryMetricRiskByScore(score: number): RiskLevel {
  if (score >= 90) return '低风险';
  if (score >= 80) return '较低风险';
  if (score >= 75) return '中风险';
  if (score >= 60) return '较高风险';
  return '高风险';
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatWanNumber(value: number) {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 1 });
}

function getMedianScore(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatWanAmount(value: number) {
  return `${formatWanNumber(value)}万元`;
}

function formatRateValue(value: number, fractionDigits = 1) {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(fractionDigits);
}

function uniqueCount(items: string[]) {
  return new Set(items).size;
}

function getRatioPercent(numerator: number, denominator: number, fractionDigits = 1) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(fractionDigits));
}

function clampPerformanceScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function getInversePerformanceScore(value: number, maxValue: number) {
  if (!maxValue) return 100;
  return clampPerformanceScore(100 * (1 - value / maxValue));
}

function getWeightedPerformanceScore(parts: {
  evaluationScore: number;
  problemAmountScore: number;
  problemCountScore: number;
  warningScore: number;
}) {
  return clampPerformanceScore(
    parts.evaluationScore * 0.4
      + parts.problemAmountScore * 0.25
      + parts.problemCountScore * 0.2
      + parts.warningScore * 0.15
  );
}

function getMockConfirmedIssueCount(warningCount: number) {
  const verifiedClueCount = Math.round(warningCount * 0.76);
  return Math.round(verifiedClueCount * 0.31);
}

function getMockProblemAmount(warningCount: number, confirmedIssueCount: number, impactThemeCount = 0) {
  return Number((warningCount * 9.6 + confirmedIssueCount * 34 + impactThemeCount * 220).toFixed(1));
}

function getMockFormedCaseCount(warningCount: number, confirmedIssueCount: number, themeFactor = 1) {
  return Math.max(0, Math.round(confirmedIssueCount * 0.16 + warningCount * 0.018 + themeFactor * 0.6));
}

function getRowFormedCaseCount(row: SubjectThemeScore) {
  const confirmedIssueCount = getMockConfirmedIssueCount(row.abnormalCount);
  const lowFactor = Math.max(1, row.lowScoreIndicators.length);
  return Math.min(4, Math.max(1, getMockFormedCaseCount(row.abnormalCount, confirmedIssueCount, lowFactor)));
}

const caseTypeByTheme: Record<string, string> = {
  预算执行: '资金类',
  预算编制: '整改类',
  资产管理: '资产类',
  指标管理: '资金类',
  会计核算: '整改类',
  地方政府债务: '债务类',
  三保: '资金类',
  高标准农田建设资金使用: '资金类',
  行政事业单位国有资产处置: '资产类',
  一卡通: '资金类',
  减税降费政策落实: '整改类',
};

const caseSourceOptions = ['确认问题', '预警核实', '专项检查', '审计整改', '人工沉淀'];
const caseStatusOptions: FormedCaseRecord['status'][] = ['已入库', '已发布', '已审核待发布'];

const specialIssueRecords: SpecialIssueRecord[] = [
  { regionName: '省本级', themeCategory: '重点领域整改', monitorTheme: '行政事业单位国有资产处置管理', issueType: '资产处置审批链条', issueCount: 42, issueAmount: 2876.4, unclosedCount: 18, overdueCount: 5, returnedCount: 4, supervisedCount: 6, repeatedSupervisedCount: 1, caseCount: 4, notStartedCount: 3, inProgressCount: 7, submittedCount: 4, reviewCount: 2, closedCount: 24, responsibleUnit: '省直预算单位A', returnReason: '佐证材料不完整', dataStatus: '静态模拟', riskReason: '资产评估、审批附件和处置结果材料需继续补齐。' },
  { regionName: '省本级', themeCategory: '巡视问题整改', monitorTheme: '省委巡视整改项', issueType: '巡视反馈整改事项', issueCount: 31, issueAmount: 1186.2, unclosedCount: 11, overdueCount: 3, returnedCount: 2, supervisedCount: 5, repeatedSupervisedCount: 1, caseCount: 3, notStartedCount: 2, inProgressCount: 4, submittedCount: 2, reviewCount: 1, closedCount: 20, responsibleUnit: '省直主管部门', returnReason: '整改措施不具体', dataStatus: '静态模拟', riskReason: '部分整改措施仍停留在过程描述，销号佐证不足。' },
  { regionName: '长沙市', themeCategory: '重点领域整改', monitorTheme: '地方政府债务', issueType: '债务管理整改', issueCount: 68, issueAmount: 8240.5, unclosedCount: 29, overdueCount: 7, returnedCount: 5, supervisedCount: 10, repeatedSupervisedCount: 2, caseCount: 5, notStartedCount: 4, inProgressCount: 12, submittedCount: 6, reviewCount: 2, closedCount: 39, responsibleUnit: '长沙市财政局', returnReason: '整改结果不充分', dataStatus: '静态模拟', riskReason: '债务台账、偿债安排和整改佐证仍有较多待核验事项。' },
  { regionName: '长沙市', themeCategory: '专项检查', monitorTheme: '会计信息质量检查', issueType: '会计核算质量', issueCount: 26, issueAmount: 642.8, unclosedCount: 8, overdueCount: 2, returnedCount: 2, supervisedCount: 3, repeatedSupervisedCount: 0, caseCount: 2, notStartedCount: 1, inProgressCount: 3, submittedCount: 2, reviewCount: 0, closedCount: 18, responsibleUnit: '长沙市教育局', returnReason: '填报信息不完整', dataStatus: '静态模拟', riskReason: '会计凭证附件和科目说明需继续规范。' },
  { regionName: '株洲市', themeCategory: '重点领域整改', monitorTheme: '高标准农田建设资金使用管理', issueType: '项目资金使用', issueCount: 61, issueAmount: 5368.9, unclosedCount: 34, overdueCount: 12, returnedCount: 7, supervisedCount: 11, repeatedSupervisedCount: 3, caseCount: 3, notStartedCount: 5, inProgressCount: 15, submittedCount: 7, reviewCount: 0, closedCount: 27, responsibleUnit: '株洲市农业农村局', returnReason: '项目验收佐证材料不完整', dataStatus: '静态模拟', riskReason: '资金拨付、项目验收和现场佐证材料补正压力较大。' },
  { regionName: '株洲市', themeCategory: '审计问题整改', monitorTheme: '专项资金审计', issueType: '专项资金使用', issueCount: 33, issueAmount: 2164.3, unclosedCount: 16, overdueCount: 4, returnedCount: 3, supervisedCount: 5, repeatedSupervisedCount: 1, caseCount: 2, notStartedCount: 2, inProgressCount: 7, submittedCount: 4, reviewCount: 0, closedCount: 17, responsibleUnit: '株洲市财政局', returnReason: '问题口径不一致', dataStatus: '静态模拟', riskReason: '审计反馈问题与整改台账口径需进一步对齐。' },
  { regionName: '湘潭市', themeCategory: '重点领域整改', monitorTheme: '减税降费政策落实', issueType: '政策落实整改', issueCount: 29, issueAmount: 1184.6, unclosedCount: 9, overdueCount: 2, returnedCount: 1, supervisedCount: 2, repeatedSupervisedCount: 0, caseCount: 3, notStartedCount: 1, inProgressCount: 4, submittedCount: 2, reviewCount: 1, closedCount: 20, responsibleUnit: '湘潭市税政科', returnReason: '政策兑现台账不完整', dataStatus: '静态模拟', riskReason: '政策兑现台账与业务数据仍有少量差异。' },
  { regionName: '衡阳市', themeCategory: '重点领域整改', monitorTheme: '基层“三保”', issueType: '三保保障整改', issueCount: 57, issueAmount: 4620.7, unclosedCount: 30, overdueCount: 9, returnedCount: 6, supervisedCount: 9, repeatedSupervisedCount: 2, caseCount: 3, notStartedCount: 4, inProgressCount: 13, submittedCount: 6, reviewCount: 1, closedCount: 27, responsibleUnit: '衡阳市财政局', returnReason: '整改措施不具体', dataStatus: '静态模拟', riskReason: '基层保障类事项未销号较多，部分区县整改进度偏慢。' },
  { regionName: '衡阳市', themeCategory: '巡视问题整改', monitorTheme: '市级巡察反馈项', issueType: '巡察反馈整改', issueCount: 24, issueAmount: 728.5, unclosedCount: 8, overdueCount: 2, returnedCount: 1, supervisedCount: 3, repeatedSupervisedCount: 0, caseCount: 1, notStartedCount: 1, inProgressCount: 4, submittedCount: 2, reviewCount: 0, closedCount: 16, responsibleUnit: '衡阳市主管部门', returnReason: '整改结果不充分', dataStatus: '静态模拟', riskReason: '巡察反馈整改进度基本平稳，仍需补齐销号依据。' },
  { regionName: '邵阳市', themeCategory: '重点领域整改', monitorTheme: '违规返还财政收入', issueType: '收入返还整改', issueCount: 38, issueAmount: 3198.2, unclosedCount: 18, overdueCount: 6, returnedCount: 4, supervisedCount: 6, repeatedSupervisedCount: 1, caseCount: 2, notStartedCount: 2, inProgressCount: 8, submittedCount: 4, reviewCount: 0, closedCount: 20, responsibleUnit: '邵阳市财政局', returnReason: '问题口径不一致', dataStatus: '静态模拟', riskReason: '违规返还收入问题金额较高，需持续跟进整改闭环。' },
  { regionName: '岳阳市', themeCategory: '重点领域整改', monitorTheme: '地方政府债务', issueType: '债务风险整改', issueCount: 54, issueAmount: 6945.0, unclosedCount: 25, overdueCount: 8, returnedCount: 4, supervisedCount: 8, repeatedSupervisedCount: 2, caseCount: 4, notStartedCount: 4, inProgressCount: 10, submittedCount: 5, reviewCount: 2, closedCount: 29, responsibleUnit: '岳阳市财政局', returnReason: '佐证材料不完整', dataStatus: '静态模拟', riskReason: '债务问题金额较大，销号进度和材料完整性需重点关注。' },
  { regionName: '常德市', themeCategory: '重点领域整改', monitorTheme: '行政事业单位国有资产处置管理', issueType: '资产处置整改', issueCount: 36, issueAmount: 2380.7, unclosedCount: 13, overdueCount: 3, returnedCount: 2, supervisedCount: 4, repeatedSupervisedCount: 0, caseCount: 3, notStartedCount: 2, inProgressCount: 5, submittedCount: 3, reviewCount: 1, closedCount: 23, responsibleUnit: '常德市住建局', returnReason: '审批链条附件缺失', dataStatus: '静态模拟', riskReason: '资产处置附件补录和审核退回情况需继续观察。' },
  { regionName: '张家界市', themeCategory: '重点领域整改', monitorTheme: '财政暂付款管理', issueType: '暂付款清理整改', issueCount: 27, issueAmount: 1485.3, unclosedCount: 10, overdueCount: 2, returnedCount: 1, supervisedCount: 3, repeatedSupervisedCount: 0, caseCount: 2, notStartedCount: 1, inProgressCount: 5, submittedCount: 2, reviewCount: 1, closedCount: 17, responsibleUnit: '张家界市财政局', returnReason: '清理计划说明不足', dataStatus: '静态模拟', riskReason: '暂付款清理进展总体平稳，少量事项仍待销号。' },
  { regionName: '益阳市', themeCategory: '专项检查', monitorTheme: '执业质量检查', issueType: '执业质量整改', issueCount: 23, issueAmount: 524.1, unclosedCount: 7, overdueCount: 1, returnedCount: 1, supervisedCount: 2, repeatedSupervisedCount: 0, caseCount: 2, notStartedCount: 1, inProgressCount: 3, submittedCount: 2, reviewCount: 0, closedCount: 16, responsibleUnit: '益阳市财政局', returnReason: '整改材料不完整', dataStatus: '静态模拟', riskReason: '执业质量整改问题规模较小，保持常态跟踪。' },
  { regionName: '郴州市', themeCategory: '重点领域整改', monitorTheme: '财政收入虚收空转', issueType: '财政收入整改', issueCount: 41, issueAmount: 3980.6, unclosedCount: 21, overdueCount: 7, returnedCount: 5, supervisedCount: 7, repeatedSupervisedCount: 1, caseCount: 2, notStartedCount: 3, inProgressCount: 9, submittedCount: 5, reviewCount: 1, closedCount: 20, responsibleUnit: '郴州市财政局', returnReason: '整改结果不充分', dataStatus: '静态模拟', riskReason: '收入整改事项金额较高，退回和超期问题较集中。' },
  { regionName: '永州市', themeCategory: '审计问题整改', monitorTheme: '预算执行审计整改', issueType: '预算执行审计整改', issueCount: 28, issueAmount: 1264.0, unclosedCount: 8, overdueCount: 1, returnedCount: 1, supervisedCount: 2, repeatedSupervisedCount: 0, caseCount: 2, notStartedCount: 1, inProgressCount: 3, submittedCount: 2, reviewCount: 1, closedCount: 20, responsibleUnit: '永州市财政局', returnReason: '填报信息不完整', dataStatus: '静态模拟', riskReason: '审计整改闭环率相对较高，少量事项需补齐佐证。' },
  { regionName: '怀化市', themeCategory: '重点领域整改', monitorTheme: '高标准农田建设资金使用管理', issueType: '农田项目整改', issueCount: 49, issueAmount: 4212.7, unclosedCount: 24, overdueCount: 8, returnedCount: 5, supervisedCount: 8, repeatedSupervisedCount: 2, caseCount: 3, notStartedCount: 4, inProgressCount: 10, submittedCount: 5, reviewCount: 0, closedCount: 25, responsibleUnit: '怀化市农业农村局', returnReason: '项目验收材料缺失', dataStatus: '静态模拟', riskReason: '项目验收和资金拨付整改事项较集中。' },
  { regionName: '娄底市', themeCategory: '重点领域整改', monitorTheme: '基层“三保”', issueType: '基层保障整改', issueCount: 32, issueAmount: 2168.4, unclosedCount: 11, overdueCount: 2, returnedCount: 2, supervisedCount: 3, repeatedSupervisedCount: 0, caseCount: 3, notStartedCount: 1, inProgressCount: 5, submittedCount: 3, reviewCount: 0, closedCount: 21, responsibleUnit: '娄底市财政局', returnReason: '整改措施不具体', dataStatus: '静态模拟', riskReason: '三保整改问题数量可控，需继续推动未销号事项。' },
  { regionName: '湘西州', themeCategory: '重点领域整改', monitorTheme: '高标准农田建设资金使用管理', issueType: '农田资金整改', issueCount: 52, issueAmount: 4925.8, unclosedCount: 30, overdueCount: 11, returnedCount: 7, supervisedCount: 10, repeatedSupervisedCount: 3, caseCount: 2, notStartedCount: 5, inProgressCount: 13, submittedCount: 6, reviewCount: 1, closedCount: 22, responsibleUnit: '湘西州农业农村局', returnReason: '佐证材料不完整', dataStatus: '静态模拟', riskReason: '农田资金整改未销号、超期和退回问题叠加。' },
  { regionName: '湘西州', themeCategory: '巡视问题整改', monitorTheme: '其他巡视整改项', issueType: '巡视整改补充事项', issueCount: 21, issueAmount: 806.9, unclosedCount: 9, overdueCount: 3, returnedCount: 2, supervisedCount: 3, repeatedSupervisedCount: 1, caseCount: 1, notStartedCount: 1, inProgressCount: 4, submittedCount: 2, reviewCount: 0, closedCount: 12, responsibleUnit: '湘西州主管部门', returnReason: '整改结果不充分', dataStatus: '静态模拟', riskReason: '巡视整改补充事项仍需跟踪销号。' },
];

function buildFormedCaseRecords(rows: SubjectThemeScore[]): FormedCaseRecord[] {
  return rows.flatMap((row, rowIndex) => {
    const caseCount = getRowFormedCaseCount(row);
    const amountValue = getMockProblemAmount(row.abnormalCount, getMockConfirmedIssueCount(row.abnormalCount), row.lowScoreIndicators.length || 1);

    return Array.from({ length: caseCount }, (_, idx) => {
      const sequence = rowIndex * 4 + idx + 1;
      const status = caseStatusOptions[sequence % caseStatusOptions.length];
      const isTypical = status === '已发布' || sequence % 5 === 0 ? '是' : '否';
      const relatedRule = `${row.lowScoreIndicators[0] || row.monitorTheme}核验规则`;

      return {
        caseName: `${row.regionName}${row.monitorTheme}监督案例${idx + 1}`,
        caseCode: `AL-${String(202605000 + sequence).slice(-7)}`,
        monitorTheme: row.monitorTheme,
        regionName: row.regionName,
        relatedUnit: row.subjectName,
        caseType: caseTypeByTheme[row.monitorTheme] || '整改类',
        caseSource: caseSourceOptions[sequence % caseSourceOptions.length],
        sourceProblemCode: `WT-${String(20260500 + sequence).slice(-6)}`,
        sourceClueCode: `YD-${String(20260500 + sequence + 37).slice(-6)}`,
        relatedRule,
        amount: `${formatWanNumber(Number((amountValue / Math.max(1, caseCount)).toFixed(1)))}万元`,
        isTypical,
        status,
        storedAt: `2026-05-${String((sequence % 18) + 8).padStart(2, '0')}`,
      };
    });
  });
}

function matchesSpecialTheme(row: SpecialIssueRecord, activeTheme: string | null) {
  return !activeTheme || row.monitorTheme === activeTheme || row.themeCategory === activeTheme;
}

function getSpecialClosedRate(closedCount: number, issueCount: number) {
  return getRatioPercent(closedCount, issueCount, 1);
}

function getSpecialAttentionScore(item: {
  issueCount: number;
  issueAmount: number;
  unclosedCount: number;
  overdueCount: number;
  returnedCount: number;
  supervisedCount: number;
  caseCount: number;
}) {
  const unclosedRate = getRatioPercent(item.unclosedCount, Math.max(item.issueCount, 1), 1);
  const overdueRate = getRatioPercent(item.overdueCount, Math.max(item.issueCount, 1), 1);
  const returnedRate = getRatioPercent(item.returnedCount, Math.max(item.issueCount, 1), 1);
  const caseOffset = Math.min(item.caseCount * 1.8, 8);
  const pressure = unclosedRate * 0.34
    + overdueRate * 0.72
    + returnedRate * 0.36
    + Math.min(item.issueCount / 2.2, 22)
    + Math.min(item.issueAmount / 520, 18)
    + Math.min(item.supervisedCount * 0.9, 8);

  return clampPerformanceScore(100 - pressure + caseOffset);
}

function buildSpecialAttentionRegions(rows: SpecialIssueRecord[]): SpecialAttentionRegion[] {
  const grouped = rows.reduce<Record<string, SpecialIssueRecord[]>>((acc, row) => {
    acc[row.regionName] = acc[row.regionName] || [];
    acc[row.regionName].push(row);
    return acc;
  }, {});

  return Object.values(grouped).map((items) => {
    const issueCount = items.reduce((sum, item) => sum + item.issueCount, 0);
    const issueAmount = Number(items.reduce((sum, item) => sum + item.issueAmount, 0).toFixed(1));
    const unclosedCount = items.reduce((sum, item) => sum + item.unclosedCount, 0);
    const overdueCount = items.reduce((sum, item) => sum + item.overdueCount, 0);
    const returnedCount = items.reduce((sum, item) => sum + item.returnedCount, 0);
    const supervisedCount = items.reduce((sum, item) => sum + item.supervisedCount, 0);
    const repeatedSupervisedCount = items.reduce((sum, item) => sum + item.repeatedSupervisedCount, 0);
    const caseCount = items.reduce((sum, item) => sum + item.caseCount, 0);
    const closedCount = items.reduce((sum, item) => sum + item.closedCount, 0);
    const notStartedCount = items.reduce((sum, item) => sum + item.notStartedCount, 0);
    const inProgressCount = items.reduce((sum, item) => sum + item.inProgressCount, 0);
    const submittedCount = items.reduce((sum, item) => sum + item.submittedCount, 0);
    const reviewCount = items.reduce((sum, item) => sum + item.reviewCount, 0);
    const mainThemes = [...items].sort((a, b) => b.issueCount - a.issueCount).slice(0, 3).map((item) => item.monitorTheme);
    const attentionScore = getSpecialAttentionScore({ issueCount, issueAmount, unclosedCount, overdueCount, returnedCount, supervisedCount, caseCount });
    const attentionLevel = getAttentionLevel(attentionScore);

    return {
      regionName: items[0].regionName,
      issueCount,
      issueAmount,
      issueAmountText: formatWanAmount(issueAmount),
      unclosedCount,
      overdueCount,
      returnedCount,
      supervisedCount,
      repeatedSupervisedCount,
      caseCount,
      closedCount,
      notStartedCount,
      inProgressCount,
      submittedCount,
      reviewCount,
      closedRate: getSpecialClosedRate(closedCount, issueCount),
      mainThemes,
      themeCategoryCount: uniqueCount(items.map((item) => item.themeCategory)),
      attentionScore,
      attentionLevel,
      reason: `${mainThemes.slice(0, 2).join('、') || '专项问题'}较集中，未销号${unclosedCount}条、超期${overdueCount}条、退回${returnedCount}条。`,
    };
  }).sort((a, b) => (
    a.attentionScore - b.attentionScore ||
    b.overdueCount - a.overdueCount ||
    b.unclosedCount - a.unclosedCount ||
    b.issueAmount - a.issueAmount ||
    b.returnedCount - a.returnedCount
  ));
}

function buildSpecialAttentionThemes(rows: SpecialIssueRecord[]): SpecialAttentionTheme[] {
  const grouped = rows.reduce<Record<string, SpecialIssueRecord[]>>((acc, row) => {
    acc[row.monitorTheme] = acc[row.monitorTheme] || [];
    acc[row.monitorTheme].push(row);
    return acc;
  }, {});

  return Object.values(grouped).map((items) => {
    const issueCount = items.reduce((sum, item) => sum + item.issueCount, 0);
    const issueAmount = Number(items.reduce((sum, item) => sum + item.issueAmount, 0).toFixed(1));
    const unclosedCount = items.reduce((sum, item) => sum + item.unclosedCount, 0);
    const overdueCount = items.reduce((sum, item) => sum + item.overdueCount, 0);
    const returnedCount = items.reduce((sum, item) => sum + item.returnedCount, 0);
    const supervisedCount = items.reduce((sum, item) => sum + item.supervisedCount, 0);
    const repeatedSupervisedCount = items.reduce((sum, item) => sum + item.repeatedSupervisedCount, 0);
    const caseCount = items.reduce((sum, item) => sum + item.caseCount, 0);
    const closedCount = items.reduce((sum, item) => sum + item.closedCount, 0);
    const attentionScore = getSpecialAttentionScore({ issueCount, issueAmount, unclosedCount, overdueCount, returnedCount, supervisedCount, caseCount });
    const attentionLevel = getAttentionLevel(attentionScore);
    const highRegionNames = [...items].sort((a, b) => b.overdueCount - a.overdueCount || b.unclosedCount - a.unclosedCount).slice(0, 3).map((item) => item.regionName);

    return {
      themeCategory: items[0].themeCategory,
      monitorTheme: items[0].monitorTheme,
      coverageRegionCount: uniqueCount(items.map((item) => item.regionName)),
      issueCount,
      issueAmount,
      issueAmountText: formatWanAmount(issueAmount),
      unclosedCount,
      overdueCount,
      returnedCount,
      supervisedCount,
      repeatedSupervisedCount,
      caseCount,
      closedCount,
      closedRate: getSpecialClosedRate(closedCount, issueCount),
      caseConversionRate: getRatioPercent(caseCount, Math.max(closedCount, 1), 1),
      attentionScore,
      attentionLevel,
      reason: `${highRegionNames.join('、') || '当前范围'}整改压力相对突出，未销号${unclosedCount}条、超期${overdueCount}条。`,
    };
  }).sort((a, b) => (
    a.attentionScore - b.attentionScore ||
    b.overdueCount - a.overdueCount ||
    b.unclosedCount - a.unclosedCount ||
    b.issueAmount - a.issueAmount
  ));
}

function buildSpecialMapRegionScores(rows: SpecialAttentionRegion[]): RegionScore[] {
  return rows.map((item) => ({
    regionName: item.regionName,
    comprehensiveScore: item.attentionScore,
    riskLevel: riskByScore(item.attentionScore),
    highRiskSubjects: item.unclosedCount,
    highRiskThemes: item.mainThemes.length,
    abnormalCount: item.issueCount,
    abnormalTotalCount: item.issueCount,
    interceptCount: item.supervisedCount,
    closedLoopRate: item.closedRate,
    reviewRejectCount: item.returnedCount,
    reviewSubmitCount: item.submittedCount + item.reviewCount + item.returnedCount,
    mainLowThemes: item.mainThemes,
    overdueCount: item.overdueCount,
    pendingCount: item.unclosedCount,
    closedLoopCount: item.closedCount,
    shouldClosedCount: item.issueCount,
    confirmedIssueCount: item.issueCount,
    problemAmount: item.issueAmount,
    caseCount: item.caseCount,
    averageScore: item.closedRate,
    warningCount: item.issueCount,
    mainRejectReasons: `退回${item.returnedCount}条，督办${item.supervisedCount}条`,
  }));
}

function buildCountySpecialIssueRows(parentRegion: string, countyName: string): SpecialIssueRecord[] {
  const parentRows = specialIssueRecords.filter((row) => row.regionName === parentRegion);
  const sourceRows = parentRows.length ? parentRows : specialIssueRecords.slice(0, 2);
  const offset = Math.abs(getAreaOffset(countyName));

  return sourceRows.map((row, index) => {
    const ratio = 0.28 + offset / 18 + index * 0.03;
    const issueCount = Math.max(6, Math.round(row.issueCount * ratio));
    const unclosedCount = Math.min(issueCount, Math.max(2, Math.round(row.unclosedCount * ratio + index)));
    const overdueCount = Math.min(unclosedCount, Math.max(0, Math.round(row.overdueCount * ratio)));
    const returnedCount = Math.min(unclosedCount, Math.max(0, Math.round(row.returnedCount * ratio)));
    const supervisedCount = Math.min(issueCount, Math.max(1, Math.round(row.supervisedCount * ratio)));
    const repeatedSupervisedCount = Math.min(supervisedCount, Math.max(0, Math.round(row.repeatedSupervisedCount * ratio)));
    const caseCount = Math.max(0, Math.round(row.caseCount * ratio));
    const closedCount = Math.max(0, issueCount - unclosedCount);
    const notStartedCount = Math.max(0, Math.floor(unclosedCount * 0.16));
    const inProgressCount = Math.max(0, Math.floor(unclosedCount * 0.42));
    const submittedCount = Math.max(0, Math.floor(unclosedCount * 0.2));
    const reviewCount = Math.max(0, unclosedCount - notStartedCount - inProgressCount - submittedCount - returnedCount);

    return {
      ...row,
      regionName: countyName,
      issueCount,
      issueAmount: Number((row.issueAmount * ratio).toFixed(1)),
      unclosedCount,
      overdueCount,
      returnedCount,
      supervisedCount,
      repeatedSupervisedCount,
      caseCount,
      notStartedCount,
      inProgressCount,
      submittedCount,
      reviewCount,
      closedCount,
      responsibleUnit: row.responsibleUnit.includes('财政局') ? `${countyName}财政局` : `${countyName}责任单位`,
      riskReason: `${countyName}${row.monitorTheme}整改事项按市级口径拆分模拟，重点看未销号和超期情况。`,
    };
  });
}

function buildSpecialIssueDetails(rows: SpecialIssueRecord[]): SpecialIssueDetail[] {
  return rows.map((row, index) => {
    const sequence = String(202605000 + index + 1).slice(-7);
    const overdueDays = row.overdueCount > 0 ? `${8 + (index % 5) * 6}天` : '-';
    const currentStatus = row.overdueCount > 0
      ? '整改中-已超期'
      : row.returnedCount > 0
        ? '已退回'
        : row.unclosedCount > 0
          ? '整改中'
          : '已销号';

    return {
      issueCode: `ZXWT-${sequence}`,
      regionName: row.regionName,
      themeCategory: row.themeCategory,
      monitorTheme: row.monitorTheme,
      issueName: `${row.monitorTheme}${row.issueType}`,
      responsibleUnit: row.responsibleUnit,
      deadline: `2026-0${(index % 3) + 6}-${String(12 + index).padStart(2, '0')}`,
      currentStatus,
      overdueDays,
      issueAmount: formatWanAmount(Number((row.issueAmount / Math.max(row.issueCount, 1) * (1.2 + (index % 4) * 0.22)).toFixed(1))),
      supervised: row.supervisedCount > 0 ? '是' : '否',
      returnedReason: row.returnedCount > 0 ? row.returnReason : '-',
      returnedAt: row.returnedCount > 0 ? `2026-05-${String(8 + index).padStart(2, '0')}` : '-',
      returnedCount: row.returnedCount ? `${row.returnedCount}次` : '0次',
      resubmitted: row.returnedCount > 0 && row.submittedCount > 0 ? '已重新提交' : row.returnedCount > 0 ? '待重新提交' : '-',
      supervisionTimes: row.supervisedCount ? `${Math.max(1, Math.min(3, row.repeatedSupervisedCount + 1))}次` : '0次',
      lastSupervisionAt: row.supervisedCount ? `2026-05-${String(10 + index).padStart(2, '0')}` : '-',
      supervisionDeadline: row.supervisedCount ? `2026-06-${String(6 + index).padStart(2, '0')}` : '-',
      closedFlag: row.closedCount > row.unclosedCount ? '部分已销号' : row.unclosedCount === 0 ? '已销号' : '未销号',
      typicalCaseName: row.caseCount > 0 ? `${row.regionName}${row.monitorTheme}整改案例` : '待沉淀',
      caseStatus: row.caseCount > 0 ? (index % 2 === 0 ? '已入库' : '已审核待发布') : '未形成',
    };
  });
}

function getAttentionLevel(score: number): AttentionLevel {
  if (!Number.isFinite(score)) return '暂无数据';
  if (score < 60) return '高关注';
  if (score < 80) return '中关注';
  return '低关注';
}

function getAttentionToneClass(level: AttentionLevel) {
  if (level === '高关注') return 'risk-high';
  if (level === '中关注') return 'risk-mid';
  if (level === '低关注') return 'risk-low';
  return 'risk-lower';
}

function getMapAttentionLabel(level: MapRiskLevel) {
  if (level === '高风险') return '高关注';
  if (level === '中风险') return '中关注';
  return '低关注';
}

function buildLocalSupervisionUrl(regionName: string) {
  return `/prototypes/local-supervision-analysis?region=${encodeURIComponent(regionName)}`;
}

function getMockAbnormalTotal(abnormalCount: number) {
  return abnormalCount ? Math.round(abnormalCount / 0.08) : 0;
}

function getMockReviewParts(abnormalCount: number) {
  const rejectCount = Math.round(abnormalCount * 0.08);
  const submitCount = rejectCount ? Math.round(rejectCount / 0.089) : 0;
  return { rejectCount, submitCount };
}

function getClosedLoopParts(data: Pick<RegionScore | SubjectSummary, 'closedLoopRate' | 'closedLoopCount' | 'shouldClosedCount' | 'abnormalCount'>) {
  const shouldClosedCount = data.shouldClosedCount || data.abnormalCount || 0;
  const closedLoopCount = data.closedLoopCount || Math.round((shouldClosedCount * data.closedLoopRate) / 100);
  return { closedLoopCount, shouldClosedCount };
}

function getAbnormalRateRisk(value: number): RiskLevel {
  if (value >= 12) return '高风险';
  if (value >= 8) return '较高风险';
  if (value >= 5) return '中风险';
  if (value >= 2) return '较低风险';
  return '低风险';
}

function getRejectRateRisk(value: number): RiskLevel {
  if (value >= 12) return '高风险';
  if (value >= 9) return '较高风险';
  if (value >= 6) return '中风险';
  if (value >= 3) return '较低风险';
  return '低风险';
}

function getClosureRateRisk(value: number): RiskLevel {
  if (value >= 90) return '低风险';
  if (value >= 85) return '较低风险';
  if (value >= 75) return '中风险';
  if (value >= 65) return '较高风险';
  return '高风险';
}

function isSubjectSummary(data: unknown): data is SubjectSummary {
  return Boolean(data && typeof data === 'object' && 'subjectName' in data && 'regionName' in data);
}

function isThemePosture(data: unknown): data is ThemePosture {
  return Boolean(data && typeof data === 'object' && 'monitorCategory' in data && 'monitorTheme' in data);
}

function getSubjectTypeCategory(row: Pick<SubjectThemeScore, 'subjectName' | 'subjectType' | 'regionName'>): SubjectTypeFilter {
  if (row.subjectName.includes('省直') || row.regionName === '省本级') return '省直单位';
  if (row.subjectType.includes('财政')) return '财政部门';
  if (row.subjectType.includes('主管')) return '主管部门';
  if (row.subjectType.includes('预算')) return '预算单位';
  if (row.subjectType.includes('责任')) return '责任单位';
  return '全部';
}

function matchesSubjectType(row: SubjectThemeScore, subjectType: SubjectTypeFilter) {
  return subjectType === '全部' || getSubjectTypeCategory(row) === subjectType;
}

function normalizeRegionName(name: string) {
  return name.includes('湘西') ? '湘西州' : name;
}

const regionScores: RegionScore[] = [
  { regionName: '长沙市', comprehensiveScore: 78.6, riskLevel: '中风险', highRiskSubjects: 8, highRiskThemes: 5, abnormalCount: 286, abnormalTotalCount: 18936, interceptCount: 42, closedLoopRate: 82.4, reviewRejectCount: 86, reviewSubmitCount: 1420, mainLowThemes: ['预算执行', '地方政府债务'] },
  { regionName: '株洲市', comprehensiveScore: 67.2, riskLevel: '较高风险', highRiskSubjects: 6, highRiskThemes: 4, abnormalCount: 214, abnormalTotalCount: 15248, interceptCount: 36, closedLoopRate: 76.8, reviewRejectCount: 96, reviewSubmitCount: 1248, mainLowThemes: ['高标准农田建设资金使用', '预算编制'] },
  { regionName: '湘潭市', comprehensiveScore: 81.5, riskLevel: '较低风险', highRiskSubjects: 3, highRiskThemes: 2, abnormalCount: 118, abnormalTotalCount: 9826, interceptCount: 15, closedLoopRate: 88.2, reviewRejectCount: 42, reviewSubmitCount: 892, mainLowThemes: ['资产管理', '会计核算'] },
  { regionName: '衡阳市', comprehensiveScore: 69.4, riskLevel: '较高风险', highRiskSubjects: 7, highRiskThemes: 4, abnormalCount: 236, abnormalTotalCount: 16824, interceptCount: 39, closedLoopRate: 74.6, reviewRejectCount: 108, reviewSubmitCount: 1386, mainLowThemes: ['三保', '预算执行'] },
  { regionName: '邵阳市', comprehensiveScore: 75.4, riskLevel: '中风险', highRiskSubjects: 4, highRiskThemes: 3, abnormalCount: 137, abnormalTotalCount: 11248, interceptCount: 20, closedLoopRate: 82.0, reviewRejectCount: 58, reviewSubmitCount: 968, mainLowThemes: ['预算调整调剂', '三公'] },
  { regionName: '岳阳市', comprehensiveScore: 73.8, riskLevel: '中风险', highRiskSubjects: 5, highRiskThemes: 3, abnormalCount: 164, abnormalTotalCount: 13692, interceptCount: 27, closedLoopRate: 80.5, reviewRejectCount: 72, reviewSubmitCount: 1142, mainLowThemes: ['地方政府债务', '项目库'] },
  { regionName: '常德市', comprehensiveScore: 76.1, riskLevel: '中风险', highRiskSubjects: 4, highRiskThemes: 3, abnormalCount: 142, abnormalTotalCount: 12186, interceptCount: 21, closedLoopRate: 84.0, reviewRejectCount: 64, reviewSubmitCount: 1024, mainLowThemes: ['预算批复', '资产处置'] },
  { regionName: '张家界市', comprehensiveScore: 79.0, riskLevel: '中风险', highRiskSubjects: 3, highRiskThemes: 2, abnormalCount: 104, abnormalTotalCount: 8642, interceptCount: 14, closedLoopRate: 86.7, reviewRejectCount: 38, reviewSubmitCount: 726, mainLowThemes: ['项目库', '一卡通'] },
  { regionName: '益阳市', comprehensiveScore: 84.2, riskLevel: '较低风险', highRiskSubjects: 2, highRiskThemes: 2, abnormalCount: 96, abnormalTotalCount: 7842, interceptCount: 12, closedLoopRate: 90.1, reviewRejectCount: 28, reviewSubmitCount: 682, mainLowThemes: ['基础信息', '一卡通'] },
  { regionName: '郴州市', comprehensiveScore: 72.7, riskLevel: '中风险', highRiskSubjects: 5, highRiskThemes: 3, abnormalCount: 155, abnormalTotalCount: 12864, interceptCount: 25, closedLoopRate: 81.9, reviewRejectCount: 68, reviewSubmitCount: 1098, mainLowThemes: ['指标管理', '预算调整调剂'] },
  { regionName: '永州市', comprehensiveScore: 86.3, riskLevel: '较低风险', highRiskSubjects: 2, highRiskThemes: 1, abnormalCount: 82, abnormalTotalCount: 6896, interceptCount: 9, closedLoopRate: 91.3, reviewRejectCount: 24, reviewSubmitCount: 624, mainLowThemes: ['会计核算', '三公'] },
  { regionName: '怀化市', comprehensiveScore: 71.6, riskLevel: '中风险', highRiskSubjects: 5, highRiskThemes: 3, abnormalCount: 151, abnormalTotalCount: 12482, interceptCount: 24, closedLoopRate: 79.8, reviewRejectCount: 78, reviewSubmitCount: 1186, mainLowThemes: ['减税降费政策落实', '预算执行'] },
  { regionName: '娄底市', comprehensiveScore: 83.0, riskLevel: '较低风险', highRiskSubjects: 2, highRiskThemes: 1, abnormalCount: 91, abnormalTotalCount: 7248, interceptCount: 13, closedLoopRate: 89.2, reviewRejectCount: 32, reviewSubmitCount: 648, mainLowThemes: ['资产管理', '三保'] },
  { regionName: '湘西州', comprehensiveScore: 66.8, riskLevel: '较高风险', highRiskSubjects: 5, highRiskThemes: 4, abnormalCount: 196, abnormalTotalCount: 14826, interceptCount: 33, closedLoopRate: 73.5, reviewRejectCount: 112, reviewSubmitCount: 1342, mainLowThemes: ['一卡通', '高标准农田建设资金使用'] },
  { regionName: '省本级', comprehensiveScore: 74.8, riskLevel: '中风险', highRiskSubjects: 4, highRiskThemes: 3, abnormalCount: 132, abnormalTotalCount: 10624, interceptCount: 18, closedLoopRate: 85.6, reviewRejectCount: 52, reviewSubmitCount: 846, mainLowThemes: ['资产管理', '预算批复'] },
];

const subjectThemeScores: SubjectThemeScore[] = [
  { subjectName: '长沙市财政局', regionName: '长沙市', subjectType: '市州财政', monitorCategory: '业务监控', monitorTheme: '预算执行', themeScore: 68, themeWeight: 1, subjectWeight: 1, riskLevel: '较高风险', lowScoreIndicators: ['无预算支付控制', '支付疑点核实处置'], abnormalCount: 146, interceptCount: 18, closedLoopRate: 78.6, mainDeductionReason: '预算执行支付控制偏弱，超预算支付疑点较多。' },
  { subjectName: '长沙市财政局', regionName: '长沙市', subjectType: '市州财政', monitorCategory: '专题监控', monitorTheme: '地方政府债务', themeScore: 72, themeWeight: 1, subjectWeight: 1, riskLevel: '中风险', lowScoreIndicators: ['债务指标异常核验'], abnormalCount: 88, interceptCount: 12, closedLoopRate: 80.4, mainDeductionReason: '债务风险指标异常核验反馈不够及时。' },
  { subjectName: '株洲市财政局', regionName: '株洲市', subjectType: '市州财政', monitorCategory: '专题监控', monitorTheme: '高标准农田建设资金使用', themeScore: 61, themeWeight: 1, subjectWeight: 1, riskLevel: '较高风险', lowScoreIndicators: ['项目资金拨付合规性', '项目验收资料完整性'], abnormalCount: 128, interceptCount: 16, closedLoopRate: 72.2, mainDeductionReason: '农田项目资料补正慢，资金拨付进度偏慢。' },
  { subjectName: '株洲市财政局', regionName: '株洲市', subjectType: '市州财政', monitorCategory: '业务监控', monitorTheme: '预算编制', themeScore: 69, themeWeight: 1, subjectWeight: 1, riskLevel: '较高风险', lowScoreIndicators: ['项目入库完整性'], abnormalCount: 62, interceptCount: 8, closedLoopRate: 75.0, mainDeductionReason: '项目库基础资料缺项影响预算编制质量。' },
  { subjectName: '衡阳市财政局', regionName: '衡阳市', subjectType: '市州财政', monitorCategory: '专题监控', monitorTheme: '三保', themeScore: 58, themeWeight: 1, subjectWeight: 1, riskLevel: '高风险', lowScoreIndicators: ['三保资金保障预警', '资金调度及时性'], abnormalCount: 152, interceptCount: 24, closedLoopRate: 69.6, mainDeductionReason: '三保保障指标异常集中，处置闭环慢。' },
  { subjectName: '衡阳市财政局', regionName: '衡阳市', subjectType: '市州财政', monitorCategory: '业务监控', monitorTheme: '预算执行', themeScore: 74, themeWeight: 1, subjectWeight: 1, riskLevel: '中风险', lowScoreIndicators: ['支付疑点核实处置'], abnormalCount: 84, interceptCount: 15, closedLoopRate: 79.2, mainDeductionReason: '支付疑点反馈周期偏长。' },
  { subjectName: '湘潭市财政局', regionName: '湘潭市', subjectType: '市州财政', monitorCategory: '业务监控', monitorTheme: '资产管理', themeScore: 82, themeWeight: 1, subjectWeight: 1, riskLevel: '较低风险', lowScoreIndicators: ['资产台账完整性'], abnormalCount: 58, interceptCount: 6, closedLoopRate: 88.2, mainDeductionReason: '资产台账个别字段补录不及时。' },
  { subjectName: '邵阳市财政局', regionName: '邵阳市', subjectType: '市州财政', monitorCategory: '业务监控', monitorTheme: '预算调整调剂', themeScore: 75, themeWeight: 1, subjectWeight: 1, riskLevel: '中风险', lowScoreIndicators: ['调剂审批链路完整性'], abnormalCount: 68, interceptCount: 8, closedLoopRate: 82.0, mainDeductionReason: '预算调剂审批链条存在补录项。' },
  { subjectName: '张家界市财政局', regionName: '张家界市', subjectType: '市州财政', monitorCategory: '业务监控', monitorTheme: '项目库', themeScore: 79, themeWeight: 1, subjectWeight: 1, riskLevel: '中风险', lowScoreIndicators: ['项目入库资料完整性'], abnormalCount: 52, interceptCount: 7, closedLoopRate: 86.7, mainDeductionReason: '项目入库资料完整性仍需持续补齐。' },
  { subjectName: '省直预算单位A', regionName: '省本级', subjectType: '预算单位', monitorCategory: '业务监控', monitorTheme: '资产管理', themeScore: 63, themeWeight: 1, subjectWeight: 1, riskLevel: '较高风险', lowScoreIndicators: ['资产处置审批完整性'], abnormalCount: 96, interceptCount: 11, closedLoopRate: 76.5, mainDeductionReason: '资产处置审批链条材料不完整。' },
  { subjectName: '省直预算单位B', regionName: '省本级', subjectType: '预算单位', monitorCategory: '业务监控', monitorTheme: '预算批复', themeScore: 76, themeWeight: 1, subjectWeight: 1, riskLevel: '中风险', lowScoreIndicators: ['批复及时性'], abnormalCount: 36, interceptCount: 5, closedLoopRate: 87.1, mainDeductionReason: '预算批复节点反馈不稳定。' },
  { subjectName: '某区县财政局', regionName: '岳阳市', subjectType: '区县财政', monitorCategory: '专题监控', monitorTheme: '地方政府债务', themeScore: 65, themeWeight: 1, subjectWeight: 1, riskLevel: '较高风险', lowScoreIndicators: ['债务风险指标异常核验'], abnormalCount: 112, interceptCount: 14, closedLoopRate: 77.4, mainDeductionReason: '债务指标异常重复出现，核查材料补充慢。' },
  { subjectName: '某主管部门', regionName: '常德市', subjectType: '主管部门', monitorCategory: '专题监控', monitorTheme: '行政事业单位国有资产处置', themeScore: 71, themeWeight: 1, subjectWeight: 1, riskLevel: '中风险', lowScoreIndicators: ['资产处置审批完整性'], abnormalCount: 74, interceptCount: 9, closedLoopRate: 83.0, mainDeductionReason: '资产处置审批附件缺失较多。' },
  { subjectName: '湘西州财政局', regionName: '湘西州', subjectType: '市州财政', monitorCategory: '专题监控', monitorTheme: '一卡通', themeScore: 59, themeWeight: 1, subjectWeight: 1, riskLevel: '高风险', lowScoreIndicators: ['补贴发放异常核验'], abnormalCount: 118, interceptCount: 19, closedLoopRate: 68.9, mainDeductionReason: '一卡通发放异常核验积压，反馈材料不完整。' },
  { subjectName: '怀化市财政局', regionName: '怀化市', subjectType: '市州财政', monitorCategory: '专题监控', monitorTheme: '减税降费政策落实', themeScore: 70, themeWeight: 1, subjectWeight: 1, riskLevel: '中风险', lowScoreIndicators: ['政策落实数据一致性'], abnormalCount: 86, interceptCount: 10, closedLoopRate: 78.8, mainDeductionReason: '政策兑现台账与业务数据存在差异。' },
  { subjectName: '郴州市财政局', regionName: '郴州市', subjectType: '市州财政', monitorCategory: '业务监控', monitorTheme: '指标管理', themeScore: 73, themeWeight: 1, subjectWeight: 1, riskLevel: '中风险', lowScoreIndicators: ['指标下达完整性'], abnormalCount: 66, interceptCount: 8, closedLoopRate: 81.1, mainDeductionReason: '指标下达链路补录不及时。' },
  { subjectName: '永州市财政局', regionName: '永州市', subjectType: '市州财政', monitorCategory: '业务监控', monitorTheme: '会计核算', themeScore: 86, themeWeight: 1, subjectWeight: 1, riskLevel: '较低风险', lowScoreIndicators: ['科目使用规范性'], abnormalCount: 42, interceptCount: 4, closedLoopRate: 92.6, mainDeductionReason: '个别会计科目使用需进一步规范。' },
  { subjectName: '益阳市财政局', regionName: '益阳市', subjectType: '市州财政', monitorCategory: '业务监控', monitorTheme: '基础信息', themeScore: 88, themeWeight: 1, subjectWeight: 1, riskLevel: '较低风险', lowScoreIndicators: ['基础数据完整性'], abnormalCount: 34, interceptCount: 3, closedLoopRate: 93.0, mainDeductionReason: '基础信息缺项数量较少。' },
  { subjectName: '娄底市财政局', regionName: '娄底市', subjectType: '市州财政', monitorCategory: '专题监控', monitorTheme: '三保', themeScore: 82, themeWeight: 1, subjectWeight: 1, riskLevel: '较低风险', lowScoreIndicators: ['三保资金保障预警'], abnormalCount: 46, interceptCount: 5, closedLoopRate: 90.3, mainDeductionReason: '少量三保指标需持续跟踪。' },
  { subjectName: '长沙市教育局', regionName: '长沙市', subjectType: '主管部门', monitorCategory: '业务监控', monitorTheme: '预算编制', themeScore: 77, themeWeight: 1, subjectWeight: 1, riskLevel: '中风险', lowScoreIndicators: ['项目入库完整性'], abnormalCount: 54, interceptCount: 6, closedLoopRate: 84.5, mainDeductionReason: '教育项目入库资料仍有补正项。' },
  { subjectName: '岳阳市财政局', regionName: '岳阳市', subjectType: '市州财政', monitorCategory: '业务监控', monitorTheme: '指标管理', themeScore: 74, themeWeight: 1, subjectWeight: 1, riskLevel: '中风险', lowScoreIndicators: ['指标下达完整性'], abnormalCount: 61, interceptCount: 7, closedLoopRate: 82.3, mainDeductionReason: '指标下达链路反馈不够稳定。' },
  { subjectName: '常德市住建局', regionName: '常德市', subjectType: '主管部门', monitorCategory: '专题监控', monitorTheme: '行政事业单位国有资产处置', themeScore: 73, themeWeight: 1, subjectWeight: 1, riskLevel: '中风险', lowScoreIndicators: ['资产处置审批完整性'], abnormalCount: 57, interceptCount: 6, closedLoopRate: 83.6, mainDeductionReason: '资产处置附件补录和审核退回较多。' },
  { subjectName: '张家界市民政局', regionName: '张家界市', subjectType: '主管部门', monitorCategory: '专题监控', monitorTheme: '一卡通', themeScore: 80, themeWeight: 1, subjectWeight: 1, riskLevel: '较低风险', lowScoreIndicators: ['补贴发放异常核验'], abnormalCount: 36, interceptCount: 4, closedLoopRate: 87.4, mainDeductionReason: '补贴发放核验存在少量延迟。' },
  { subjectName: '郴州市住建局', regionName: '郴州市', subjectType: '主管部门', monitorCategory: '业务监控', monitorTheme: '资产管理', themeScore: 71, themeWeight: 1, subjectWeight: 1, riskLevel: '中风险', lowScoreIndicators: ['资产台账完整性'], abnormalCount: 69, interceptCount: 8, closedLoopRate: 81.1, mainDeductionReason: '资产台账字段补录和处置审批材料不完整。' },
  { subjectName: '怀化市农业农村局', regionName: '怀化市', subjectType: '主管部门', monitorCategory: '专题监控', monitorTheme: '高标准农田建设资金使用', themeScore: 68, themeWeight: 1, subjectWeight: 1, riskLevel: '较高风险', lowScoreIndicators: ['项目资金拨付合规性'], abnormalCount: 88, interceptCount: 11, closedLoopRate: 77.8, mainDeductionReason: '项目拨付进度和验收资料反馈偏慢。' },
  { subjectName: '省直预算单位C', regionName: '省本级', subjectType: '预算单位', monitorCategory: '业务监控', monitorTheme: '会计核算', themeScore: 72, themeWeight: 1, subjectWeight: 1, riskLevel: '中风险', lowScoreIndicators: ['科目使用规范性'], abnormalCount: 45, interceptCount: 5, closedLoopRate: 84.0, mainDeductionReason: '会计核算科目使用说明需补充。' },
  { subjectName: '湘西州教育体育局', regionName: '湘西州', subjectType: '主管部门', monitorCategory: '业务监控', monitorTheme: '预算执行', themeScore: 64, themeWeight: 1, subjectWeight: 1, riskLevel: '较高风险', lowScoreIndicators: ['支付疑点核实处置'], abnormalCount: 92, interceptCount: 12, closedLoopRate: 75.2, mainDeductionReason: '预算执行疑点核实反馈周期偏长。' },
];

const countySubjectTemplates = [
  { suffix: '财政局', subjectType: '区县财政', monitorCategory: '业务监控' as const, monitorTheme: '预算执行', baseScore: 74, abnormalCount: 64, interceptCount: 8, closedLoopRate: 81.1, indicator: '支付疑点核实处置', reason: '预算执行疑点核实反馈周期偏长。' },
  { suffix: '教育局', subjectType: '主管部门', monitorCategory: '业务监控' as const, monitorTheme: '预算编制', baseScore: 78, abnormalCount: 42, interceptCount: 5, closedLoopRate: 84.2, indicator: '项目入库完整性', reason: '教育项目入库材料存在补正项。' },
  { suffix: '卫健局', subjectType: '主管部门', monitorCategory: '业务监控' as const, monitorTheme: '指标管理', baseScore: 76, abnormalCount: 48, interceptCount: 6, closedLoopRate: 82.9, indicator: '指标下达完整性', reason: '指标下达附件补录不够及时。' },
  { suffix: '住建局', subjectType: '主管部门', monitorCategory: '专题监控' as const, monitorTheme: '行政事业单位国有资产处置', baseScore: 71, abnormalCount: 58, interceptCount: 7, closedLoopRate: 79.6, indicator: '资产处置审批完整性', reason: '资产处置审批材料退回较多。' },
  { suffix: '农业农村局', subjectType: '主管部门', monitorCategory: '专题监控' as const, monitorTheme: '高标准农田建设资金使用', baseScore: 69, abnormalCount: 72, interceptCount: 10, closedLoopRate: 76.8, indicator: '项目资金拨付合规性', reason: '农田项目拨付进度和验收资料反馈偏慢。' },
  { suffix: '交通运输局', subjectType: '主管部门', monitorCategory: '业务监控' as const, monitorTheme: '预算执行', baseScore: 73, abnormalCount: 55, interceptCount: 7, closedLoopRate: 80.5, indicator: '无预算支付控制', reason: '交通项目支付控制存在跨期补录。' },
  { suffix: '民政局', subjectType: '主管部门', monitorCategory: '专题监控' as const, monitorTheme: '一卡通', baseScore: 80, abnormalCount: 36, interceptCount: 4, closedLoopRate: 86.2, indicator: '补贴发放异常核验', reason: '补贴发放核验存在少量延迟。' },
  { suffix: '水利局', subjectType: '主管部门', monitorCategory: '业务监控' as const, monitorTheme: '项目库', baseScore: 75, abnormalCount: 50, interceptCount: 6, closedLoopRate: 82.0, indicator: '项目入库资料完整性', reason: '项目资料完整性仍需持续补齐。' },
  { suffix: '市场监管局', subjectType: '主管部门', monitorCategory: '业务监控' as const, monitorTheme: '基础信息', baseScore: 83, abnormalCount: 28, interceptCount: 3, closedLoopRate: 88.4, indicator: '基础数据完整性', reason: '基础信息缺项数量较少。' },
  { suffix: '文旅广体局', subjectType: '主管部门', monitorCategory: '业务监控' as const, monitorTheme: '资产管理', baseScore: 77, abnormalCount: 40, interceptCount: 5, closedLoopRate: 83.8, indicator: '资产台账完整性', reason: '资产台账个别字段更新不及时。' },
  { suffix: '自然资源局', subjectType: '主管部门', monitorCategory: '业务监控' as const, monitorTheme: '预算调整调剂', baseScore: 72, abnormalCount: 61, interceptCount: 7, closedLoopRate: 79.9, indicator: '调剂审批链路完整性', reason: '预算调剂审批链条存在补录项。' },
  { suffix: '人社局', subjectType: '主管部门', monitorCategory: '专题监控' as const, monitorTheme: '三保', baseScore: 70, abnormalCount: 66, interceptCount: 9, closedLoopRate: 78.4, indicator: '三保资金保障预警', reason: '三保保障指标反馈和处置闭环偏慢。' },
  { suffix: '医保局', subjectType: '主管部门', monitorCategory: '业务监控' as const, monitorTheme: '会计核算', baseScore: 79, abnormalCount: 34, interceptCount: 4, closedLoopRate: 85.6, indicator: '科目使用规范性', reason: '会计科目使用说明需补充。' },
  { suffix: '林业局', subjectType: '主管部门', monitorCategory: '业务监控' as const, monitorTheme: '预算批复', baseScore: 82, abnormalCount: 30, interceptCount: 3, closedLoopRate: 88.1, indicator: '批复及时性', reason: '预算批复节点反馈偶发延迟。' },
  { suffix: '审计局', subjectType: '责任单位', monitorCategory: '专题监控' as const, monitorTheme: '违规返还财政收入', baseScore: 68, abnormalCount: 76, interceptCount: 10, closedLoopRate: 74.8, indicator: '收入返还合规性', reason: '收入返还线索核验闭环压力较大。' },
  { suffix: '乡镇财政所A', subjectType: '责任单位', monitorCategory: '业务监控' as const, monitorTheme: '预算执行', baseScore: 66, abnormalCount: 82, interceptCount: 11, closedLoopRate: 73.6, indicator: '支付疑点核实处置', reason: '乡镇支付疑点待核实事项偏多。' },
  { suffix: '乡镇财政所B', subjectType: '责任单位', monitorCategory: '专题监控' as const, monitorTheme: '三公', baseScore: 73, abnormalCount: 52, interceptCount: 6, closedLoopRate: 80.2, indicator: '公务支出合规性', reason: '公务支出说明材料退回较多。' },
  { suffix: '预算单位A', subjectType: '预算单位', monitorCategory: '业务监控' as const, monitorTheme: '资产管理', baseScore: 81, abnormalCount: 26, interceptCount: 3, closedLoopRate: 87.5, indicator: '资产台账完整性', reason: '资产台账少量字段需补正。' },
  { suffix: '预算单位B', subjectType: '预算单位', monitorCategory: '业务监控' as const, monitorTheme: '会计核算', baseScore: 84, abnormalCount: 22, interceptCount: 2, closedLoopRate: 89.0, indicator: '科目使用规范性', reason: '会计核算疑点数量较少。' },
  { suffix: '预算单位C', subjectType: '预算单位', monitorCategory: '专题监控' as const, monitorTheme: '减税降费政策落实', baseScore: 76, abnormalCount: 44, interceptCount: 5, closedLoopRate: 83.0, indicator: '政策落实数据一致性', reason: '政策兑现台账存在少量差异。' },
];

const themePostures: ThemePosture[] = [
  { monitorCategory: '业务监控', monitorTheme: '预算执行', averageScore: 72.4, riskLevel: '中风险', highRiskSubjects: 8, lowScoreIndicators: 6, abnormalCount: 286, abnormalTotalCount: 3575, abnormalRate: 8.0, reviewRejectCount: 42, reviewSubmitCount: 680, reviewRejectRate: 6.2, closedLoopRate: 82.4, closedLoopCount: 236, shouldClosedCount: 286, interceptCount: 42, mainDeductionReason: '无预算支付控制、支付疑点核实处置' },
  { monitorCategory: '业务监控', monitorTheme: '预算编制', averageScore: 76.8, riskLevel: '中风险', highRiskSubjects: 5, lowScoreIndicators: 4, abnormalCount: 164, abnormalTotalCount: 2050, abnormalRate: 8.0, reviewRejectCount: 24, reviewSubmitCount: 390, reviewRejectRate: 6.2, closedLoopRate: 84.6, closedLoopCount: 139, shouldClosedCount: 164, interceptCount: 22, mainDeductionReason: '预算编制规范性、预算调整合理性' },
  { monitorCategory: '业务监控', monitorTheme: '资产管理', averageScore: 74.1, riskLevel: '中风险', highRiskSubjects: 6, lowScoreIndicators: 5, abnormalCount: 188, abnormalTotalCount: 2350, abnormalRate: 8.0, reviewRejectCount: 28, reviewSubmitCount: 450, reviewRejectRate: 6.2, closedLoopRate: 80.8, closedLoopCount: 152, shouldClosedCount: 188, interceptCount: 24, mainDeductionReason: '资产配置合理性、资产处置合规性' },
  { monitorCategory: '业务监控', monitorTheme: '指标管理', averageScore: 79.2, riskLevel: '中风险', highRiskSubjects: 4, lowScoreIndicators: 3, abnormalCount: 126, abnormalTotalCount: 1575, abnormalRate: 8.0, reviewRejectCount: 19, reviewSubmitCount: 300, reviewRejectRate: 6.3, closedLoopRate: 86.3, closedLoopCount: 109, shouldClosedCount: 126, interceptCount: 18, mainDeductionReason: '指标下达规范性、指标调整合规性' },
  { monitorCategory: '业务监控', monitorTheme: '会计核算', averageScore: 84.5, riskLevel: '较低风险', highRiskSubjects: 2, lowScoreIndicators: 2, abnormalCount: 86, abnormalTotalCount: 1075, abnormalRate: 8.0, reviewRejectCount: 13, reviewSubmitCount: 205, reviewRejectRate: 6.3, closedLoopRate: 91.2, closedLoopCount: 78, shouldClosedCount: 86, interceptCount: 9, mainDeductionReason: '会计科目使用规范性' },
  { monitorCategory: '专题监控', monitorTheme: '地方政府债务', averageScore: 69.5, riskLevel: '较高风险', highRiskSubjects: 9, lowScoreIndicators: 5, abnormalCount: 312, abnormalTotalCount: 3900, abnormalRate: 8.0, reviewRejectCount: 46, reviewSubmitCount: 745, reviewRejectRate: 6.2, closedLoopRate: 76.2, closedLoopCount: 238, shouldClosedCount: 312, interceptCount: 48, mainDeductionReason: '债务风险指标异常、债务置换合规性' },
  { monitorCategory: '专题监控', monitorTheme: '三保', averageScore: 68.4, riskLevel: '较高风险', highRiskSubjects: 7, lowScoreIndicators: 5, abnormalCount: 246, abnormalTotalCount: 3075, abnormalRate: 8.0, reviewRejectCount: 36, reviewSubmitCount: 585, reviewRejectRate: 6.2, closedLoopRate: 74.9, closedLoopCount: 184, shouldClosedCount: 246, interceptCount: 37, mainDeductionReason: '三保资金保障不足、优先级排序不合理' },
  { monitorCategory: '专题监控', monitorTheme: '高标准农田建设资金使用', averageScore: 70.6, riskLevel: '中风险', highRiskSubjects: 6, lowScoreIndicators: 4, abnormalCount: 214, abnormalTotalCount: 2675, abnormalRate: 8.0, reviewRejectCount: 32, reviewSubmitCount: 510, reviewRejectRate: 6.3, closedLoopRate: 78.1, closedLoopCount: 167, shouldClosedCount: 214, interceptCount: 31, mainDeductionReason: '资金使用进度滞后、项目管理规范性' },
  { monitorCategory: '专题监控', monitorTheme: '行政事业单位国有资产处置', averageScore: 73.1, riskLevel: '中风险', highRiskSubjects: 5, lowScoreIndicators: 4, abnormalCount: 172, abnormalTotalCount: 2150, abnormalRate: 8.0, reviewRejectCount: 25, reviewSubmitCount: 410, reviewRejectRate: 6.1, closedLoopRate: 81.5, closedLoopCount: 140, shouldClosedCount: 172, interceptCount: 23, mainDeductionReason: '资产处置审批完整性、资产账实相符性' },
  { monitorCategory: '专题监控', monitorTheme: '一卡通', averageScore: 67.8, riskLevel: '较高风险', highRiskSubjects: 5, lowScoreIndicators: 4, abnormalCount: 196, abnormalTotalCount: 2450, abnormalRate: 8.0, reviewRejectCount: 29, reviewSubmitCount: 465, reviewRejectRate: 6.2, closedLoopRate: 73.5, closedLoopCount: 144, shouldClosedCount: 196, interceptCount: 33, mainDeductionReason: '补贴发放异常、资金使用合规性' },
];

const indicatorEvidences: IndicatorEvidence[] = [
  { indicatorName: '无预算/超预算支付控制', monitorTheme: '预算执行', score: 72, affectedSubjects: 18, relatedRules: 6, abnormalCount: 126, interceptCount: 31, mainDeductionReason: '支付申请与预算指标匹配不足，部分业务被规则拦截。', closedLoopRate: 79.2 },
  { indicatorName: '支付疑点核实处置', monitorTheme: '预算执行', score: 68, affectedSubjects: 12, relatedRules: 5, abnormalCount: 84, interceptCount: 19, mainDeductionReason: '疑点核实反馈周期偏长，复核材料补充不及时。', closedLoopRate: 72.6 },
  { indicatorName: '三保资金保障预警', monitorTheme: '三保', score: 65, affectedSubjects: 10, relatedRules: 4, abnormalCount: 96, interceptCount: 22, mainDeductionReason: '保障类支出指标异常集中在少数区划。', closedLoopRate: 70.4 },
  { indicatorName: '债务风险指标异常核验', monitorTheme: '地方政府债务', score: 66, affectedSubjects: 11, relatedRules: 5, abnormalCount: 108, interceptCount: 17, mainDeductionReason: '债务指标异常重复出现，核查闭环进度偏慢。', closedLoopRate: 75.8 },
  { indicatorName: '资产处置审批完整性', monitorTheme: '行政事业单位国有资产处置', score: 71, affectedSubjects: 9, relatedRules: 4, abnormalCount: 74, interceptCount: 12, mainDeductionReason: '资产处置审批附件、会议纪要等材料缺项。', closedLoopRate: 82.1 },
];

const abnormalDetails: AbnormalDetail[] = [
  { triggerTime: '2026-05-14 10:20', regionName: '长沙市', subjectName: '长沙市财政局', monitorCategory: '业务监控', monitorTheme: '预算执行', ruleName: '无预算支付拦截规则', warningLevel: '高', processingMethod: '阻断', amount: '328.6万元', currentStatus: '待核实', linkedIndicator: '无预算/超预算支付控制' },
  { triggerTime: '2026-05-14 09:35', regionName: '衡阳市', subjectName: '衡阳市财政局', monitorCategory: '专题监控', monitorTheme: '三保', ruleName: '三保资金保障预警规则', warningLevel: '高', processingMethod: '预警', amount: '1,240.0万元', currentStatus: '待反馈', linkedIndicator: '三保资金保障预警' },
  { triggerTime: '2026-05-13 16:10', regionName: '株洲市', subjectName: '株洲市财政局', monitorCategory: '专题监控', monitorTheme: '高标准农田建设资金使用', ruleName: '超预算支付预警规则', warningLevel: '中', processingMethod: '预警', amount: '486.2万元', currentStatus: '处理中', linkedIndicator: '项目资金拨付合规性' },
  { triggerTime: '2026-05-13 14:42', regionName: '省本级', subjectName: '省直预算单位A', monitorCategory: '业务监控', monitorTheme: '资产管理', ruleName: '资产处置审批完整性规则', warningLevel: '中', processingMethod: '提示', amount: '92.8万元', currentStatus: '已反馈', linkedIndicator: '资产处置审批完整性' },
  { triggerTime: '2026-05-12 11:05', regionName: '湘西州', subjectName: '湘西州财政局', monitorCategory: '专题监控', monitorTheme: '一卡通', ruleName: '会计核算科目使用异常规则', warningLevel: '中', processingMethod: '预警', amount: '64.5万元', currentStatus: '待闭环', linkedIndicator: '补贴发放异常核验' },
];

const ruleIntercepts: RuleIntercept[] = [
  { executionTime: '2026-05-14 15:00', ruleCode: 'RC-BUD-001', ruleName: '无预算支付拦截规则', monitorTheme: '预算执行', executionResult: '成功', hitCount: 126, interceptCount: 31, failureReason: '-' },
  { executionTime: '2026-05-14 15:00', ruleCode: 'RC-BUD-002', ruleName: '超预算支付预警规则', monitorTheme: '预算编制', executionResult: '成功', hitCount: 88, interceptCount: 14, failureReason: '-' },
  { executionTime: '2026-05-14 14:00', ruleCode: 'RC-TOP-003', ruleName: '三保资金保障预警规则', monitorTheme: '三保', executionResult: '成功', hitCount: 96, interceptCount: 22, failureReason: '-' },
  { executionTime: '2026-05-14 14:00', ruleCode: 'RC-DEBT-004', ruleName: '债务风险指标异常规则', monitorTheme: '地方政府债务', executionResult: '成功', hitCount: 108, interceptCount: 17, failureReason: '-' },
  { executionTime: '2026-05-14 13:00', ruleCode: 'RC-AST-005', ruleName: '资产处置审批完整性规则', monitorTheme: '行政事业单位国有资产处置', executionResult: '成功', hitCount: 74, interceptCount: 12, failureReason: '-' },
  { executionTime: '2026-05-14 13:00', ruleCode: 'RC-EXE-006', ruleName: '预算执行进度异常规则', monitorTheme: '预算执行', executionResult: '成功', hitCount: 62, interceptCount: 8, failureReason: '-' },
  { executionTime: '2026-05-14 12:00', ruleCode: 'RC-ACC-007', ruleName: '会计核算科目使用异常规则', monitorTheme: '会计核算', executionResult: '成功', hitCount: 42, interceptCount: 4, failureReason: '-' },
];

const ruleTypes = ['基础信息管理', '项目库管理', '预算编制', '预算调整调剂', '指标管理', '收入预算执行', '支出预算执行', '库款管理', '资产管理', '采购管理', '会计核算', '工资管理', '决算和报告'];

function buildRuleTypeSummaries(): RuleTypeSummary[] {
  return [
    { ruleType: '支出预算执行', ruleCount: 18, triggerCount: 356, abnormalCount: 426, interceptCount: 86, subjectCount: 28 },
    { ruleType: '预算编制', ruleCount: 14, triggerCount: 286, abnormalCount: 348, interceptCount: 64, subjectCount: 24 },
    { ruleType: '指标管理', ruleCount: 12, triggerCount: 248, abnormalCount: 312, interceptCount: 58, subjectCount: 16 },
    { ruleType: '资产管理', ruleCount: 14, triggerCount: 192, abnormalCount: 246, interceptCount: 42, subjectCount: 22 },
    { ruleType: '会计核算', ruleCount: 10, triggerCount: 146, abnormalCount: 188, interceptCount: 24, subjectCount: 14 },
    { ruleType: '项目库管理', ruleCount: 8, triggerCount: 132, abnormalCount: 168, interceptCount: 32, subjectCount: 12 },
    { ruleType: '库款管理', ruleCount: 6, triggerCount: 118, abnormalCount: 142, interceptCount: 26, subjectCount: 10 },
    { ruleType: '收入预算执行', ruleCount: 7, triggerCount: 98, abnormalCount: 124, interceptCount: 18, subjectCount: 11 },
    { ruleType: '预算调整调剂', ruleCount: 5, triggerCount: 76, abnormalCount: 94, interceptCount: 14, subjectCount: 8 },
    { ruleType: '采购管理', ruleCount: 4, triggerCount: 68, abnormalCount: 82, interceptCount: 12, subjectCount: 7 },
    { ruleType: '工资管理', ruleCount: 3, triggerCount: 46, abnormalCount: 58, interceptCount: 8, subjectCount: 6 },
    { ruleType: '基础信息管理', ruleCount: 4, triggerCount: 42, abnormalCount: 54, interceptCount: 10, subjectCount: 5 },
    { ruleType: '决算和报告', ruleCount: 3, triggerCount: 38, abnormalCount: 46, interceptCount: 6, subjectCount: 4 },
  ].sort((a, b) => b.triggerCount - a.triggerCount);
}

function buildHighFrequencyRules(): HighFrequencyRule[] {
  return [
    { ruleCode: 'RC-BUD-001', ruleName: '无预算支付拦截规则', businessCategory: '支出预算执行', monitorTheme: '预算执行', relatedIndicator: '无预算/超预算支付控制', triggerCount: 126, abnormalCount: 146, interceptCount: 31, subjectCount: 12 },
    { ruleCode: 'RC-BUD-002', ruleName: '超预算支付预警规则', businessCategory: '支出预算执行', monitorTheme: '预算执行', relatedIndicator: '超预算支付控制', triggerCount: 108, abnormalCount: 128, interceptCount: 24, subjectCount: 10 },
    { ruleCode: 'RC-BUD-003', ruleName: '项目入库完整性规则', businessCategory: '项目库管理', monitorTheme: '项目库管理', relatedIndicator: '项目入库完整性', triggerCount: 96, abnormalCount: 112, interceptCount: 18, subjectCount: 9 },
    { ruleCode: 'RC-BUD-004', ruleName: '预算编制合理性校验规则', businessCategory: '预算编制', monitorTheme: '预算编制', relatedIndicator: '预算编制合理性校验', triggerCount: 88, abnormalCount: 98, interceptCount: 14, subjectCount: 8 },
    { ruleCode: 'RC-AST-001', ruleName: '资产处置审批完整性规则', businessCategory: '资产管理', monitorTheme: '行政事业单位国有资产处置', relatedIndicator: '资产处置审批完整性', triggerCount: 74, abnormalCount: 86, interceptCount: 12, subjectCount: 7 },
    { ruleCode: 'RC-ACC-001', ruleName: '会计核算科目使用异常规则', businessCategory: '会计核算', monitorTheme: '会计核算', relatedIndicator: '科目使用规范性', triggerCount: 62, abnormalCount: 76, interceptCount: 8, subjectCount: 6 },
  ];
}

function buildSubjectTriggerSummaries(): SubjectTriggerSummary[] {
  return [
    { subjectName: '长沙市财政局', regionName: '长沙市', subjectType: '财政部门', ruleCount: 8, triggerCount: 142, abnormalCount: 234, interceptCount: 30, comprehensiveScore: 68.5 },
    { subjectName: '衡阳市财政局', regionName: '衡阳市', subjectType: '财政部门', ruleCount: 7, triggerCount: 128, abnormalCount: 198, interceptCount: 28, comprehensiveScore: 69.2 },
    { subjectName: '株洲市财政局', regionName: '株洲市', subjectType: '财政部门', ruleCount: 6, triggerCount: 116, abnormalCount: 182, interceptCount: 24, comprehensiveScore: 67.8 },
    { subjectName: '湘西州财政局', regionName: '湘西州', subjectType: '财政部门', ruleCount: 6, triggerCount: 108, abnormalCount: 176, interceptCount: 22, comprehensiveScore: 66.2 },
    { subjectName: '怀化市财政局', regionName: '怀化市', subjectType: '财政部门', ruleCount: 5, triggerCount: 92, abnormalCount: 148, interceptCount: 18, comprehensiveScore: 71.5 },
  ];
}

function buildSubjectSummaries(rows: SubjectThemeScore[], sortMetric: MapMetric = '综合表现'): SubjectSummary[] {
  const grouped = rows.reduce<Record<string, SubjectThemeScore[]>>((acc, row) => {
    acc[row.subjectName] = acc[row.subjectName] || [];
    acc[row.subjectName].push(row);
    return acc;
  }, {});

  const subjectSummaries = Object.values(grouped).map((items) => {
    const first = items[0];
    const weightedScore = items.reduce((sum, item) => sum + item.themeScore * item.themeWeight, 0) / items.reduce((sum, item) => sum + item.themeWeight, 0);
    const abnormalCount = items.reduce((sum, item) => sum + item.abnormalCount, 0);
    const abnormalTotalCount = Math.round(abnormalCount / 0.08);
    const closedLoopRate = items.reduce((sum, item) => sum + item.closedLoopRate, 0) / items.length;
    const closedLoopCount = Math.round(abnormalCount * closedLoopRate / 100);
    const shouldClosedCount = abnormalCount;
    const reviewRejectCount = Math.round(abnormalCount * 0.08);
    const reviewSubmitCount = Math.round(reviewRejectCount / 0.089);
    const lowThemes = items.filter((item) => item.themeScore < 75).map((item) => item.monitorTheme);
    const mainReason = items.sort((a, b) => a.themeScore - b.themeScore)[0].mainDeductionReason || '暂无扣分原因';

    const ruleTriggerCount = Math.round(abnormalCount / 20) + items.filter(item => item.themeScore < 70).length * 3;

    return {
      subjectName: first.subjectName,
      regionName: first.regionName,
      subjectType: first.subjectType,
      comprehensiveScore: weightedScore,
      riskLevel: riskByScore(weightedScore),
      lowThemes,
      mainDeductionReason: mainReason,
      abnormalCount,
      abnormalTotalCount,
      reviewRejectCount,
      reviewSubmitCount,
      closedLoopRate,
      closedLoopCount,
      shouldClosedCount,
      ruleTriggerCount,
    };
  });

  return subjectSummaries.sort((a, b) => {
    switch (sortMetric) {
      case '综合表现':
        return a.comprehensiveScore - b.comprehensiveScore;
      case '评分表现':
      case '主题得分':
      case '低分指标':
        return a.comprehensiveScore - b.comprehensiveScore;
      case '预警疑点':
      case '问题数量':
        return b.abnormalCount - a.abnormalCount;
      case '问题金额':
        return getMockProblemAmount(b.abnormalCount, getMockConfirmedIssueCount(b.abnormalCount), b.lowThemes.length)
          - getMockProblemAmount(a.abnormalCount, getMockConfirmedIssueCount(a.abnormalCount), a.lowThemes.length);
      default:
        return a.comprehensiveScore - b.comprehensiveScore;
    }
  });
}

function buildAttentionSubjects(rows: SubjectThemeScore[]): AttentionSubject[] {
  const grouped = rows.reduce<Record<string, SubjectThemeScore[]>>((acc, row) => {
    acc[row.subjectName] = acc[row.subjectName] || [];
    acc[row.subjectName].push(row);
    return acc;
  }, {});

  return Object.values(grouped).map((items) => {
    const first = items[0];
    const uniqueThemes = Array.from(new Set(items.map((item) => item.monitorTheme)));
    const lowThemes = Array.from(new Set(items.filter((item) => item.themeScore < 70).map((item) => item.monitorTheme)));
    const warningCount = items.reduce((sum, item) => sum + item.abnormalCount, 0);
    const lowThemeRatio = getRatioPercent(lowThemes.length, Math.max(uniqueThemes.length, 1), 1);
    const triggeredRuleCount = Math.max(1, Math.round(warningCount / 28) + lowThemes.length * 2);
    const verifiedClueCount = Math.round(warningCount * 0.76);
    const conversionBase = 0.23 + Math.min(lowThemeRatio, 80) / 260;
    const confirmedIssueCount = Math.min(verifiedClueCount, Math.round(verifiedClueCount * conversionBase));
    const pendingClueCount = Math.max(0, warningCount - verifiedClueCount);
    const issueConversionRate = getRatioPercent(confirmedIssueCount, verifiedClueCount, 1);
    const problemAmount = Number((warningCount * 9.6 + confirmedIssueCount * 34 + lowThemes.length * 220).toFixed(1));
    const attentionScore = lowThemeRatio * 0.42 + lowThemes.length * 8 + Math.min(warningCount / 7, 30) + Math.min(issueConversionRate, 50) * 0.28 + Math.min(problemAmount / 180, 30);
    const attentionLevel = getAttentionLevel(attentionScore);
    const lowestRows = [...items].sort((a, b) => a.themeScore - b.themeScore).slice(0, 2);

    return {
      subjectName: first.subjectName,
      regionName: first.regionName,
      subjectType: first.subjectType,
      lowThemeCount: lowThemes.length,
      totalThemeCount: uniqueThemes.length,
      lowThemeRatio,
      triggeredRuleCount,
      warningCount,
      verifiedClueCount,
      confirmedIssueCount,
      pendingClueCount,
      issueConversionRate,
      problemAmount,
      problemAmountText: formatWanAmount(problemAmount),
      lowThemes,
      attentionLevel,
      attentionScore,
      reason: lowestRows.length
        ? `低分主题集中在${lowestRows.map((row) => row.monitorTheme).join('、')}，${lowestRows[0].mainDeductionReason}`
        : '当前主体低分主题较少，作为普通跟踪对象。',
    };
  }).sort((a, b) => (
    b.lowThemeRatio - a.lowThemeRatio ||
    b.lowThemeCount - a.lowThemeCount ||
    b.warningCount - a.warningCount ||
    b.issueConversionRate - a.issueConversionRate ||
    b.problemAmount - a.problemAmount
  ));
}

function buildAttentionRegions(rows: SubjectThemeScore[]): AttentionRegion[] {
  const grouped = rows.reduce<Record<string, SubjectThemeScore[]>>((acc, row) => {
    acc[row.regionName] = acc[row.regionName] || [];
    acc[row.regionName].push(row);
    return acc;
  }, {});

  const baseRows = Object.values(grouped).map((items) => {
    const first = items[0];
    const uniqueThemes = Array.from(new Set(items.map((item) => item.monitorTheme)));
    const lowThemes = Array.from(new Set(items.filter((item) => item.themeScore < 70).map((item) => item.monitorTheme)));
    const averageScore = items.reduce((sum, item) => sum + item.themeScore, 0) / items.length;
    const warningCount = items.reduce((sum, item) => sum + item.abnormalCount, 0);
    const verifiedClueCount = Math.round(warningCount * 0.76);
    const confirmedIssueCount = getMockConfirmedIssueCount(warningCount);
    const lowThemeRatio = getRatioPercent(lowThemes.length, Math.max(uniqueThemes.length, 1), 1);
    const triggeredRuleCount = Math.max(1, Math.round(warningCount / 28) + lowThemes.length * 2);
    const issueConversionRate = getRatioPercent(confirmedIssueCount, verifiedClueCount, 1);
    const impactThemeCount = Math.max(lowThemes.length, uniqueThemes.filter((theme) => (
      items.some((item) => item.monitorTheme === theme && item.abnormalCount > 0)
    )).length);
    const businessAreaCount = Math.max(1, Math.min(6, Math.round(impactThemeCount * 1.4)));
    const fundTypeCount = Math.max(1, Math.min(5, Math.round(confirmedIssueCount / 18) || 1));
    const problemAmount = getMockProblemAmount(warningCount, confirmedIssueCount, impactThemeCount);
    const mainDeductionIndicators = Array.from(new Set(items.flatMap((item) => item.lowScoreIndicators))).slice(0, 3);
    const lowestRows = [...items].sort((a, b) => a.themeScore - b.themeScore).slice(0, 2);

    return {
      regionName: first.regionName,
      items,
      averageScore,
      lowThemeCount: lowThemes.length,
      totalThemeCount: uniqueThemes.length,
      lowThemeRatio,
      triggeredRuleCount,
      warningCount,
      verifiedClueCount,
      confirmedIssueCount,
      issueConversionRate,
      problemAmount,
      problemAmountText: formatWanAmount(problemAmount),
      impactThemeCount,
      businessAreaCount,
      fundTypeCount,
      caseCount: getMockFormedCaseCount(warningCount, confirmedIssueCount, impactThemeCount),
      lowThemes,
      mainDeductionIndicators,
      reason: lowestRows.length
        ? `关注信号集中在${lowestRows.map((row) => row.monitorTheme).join('、')}，${lowestRows[0].mainDeductionReason}`
        : '当前区划关注信号较少，保持常态跟踪。',
    };
  });

  const maxProblemAmount = Math.max(...baseRows.map((item) => item.problemAmount), 0);
  const maxConfirmedIssueCount = Math.max(...baseRows.map((item) => item.confirmedIssueCount), 0);
  const maxWarningCount = Math.max(...baseRows.map((item) => item.warningCount), 0);

  return baseRows.map((item) => {
    const evaluationScore = clampPerformanceScore(item.averageScore);
    const problemAmountScore = getInversePerformanceScore(item.problemAmount, maxProblemAmount);
    const problemCountScore = getInversePerformanceScore(item.confirmedIssueCount, maxConfirmedIssueCount);
    const warningScore = getInversePerformanceScore(item.warningCount, maxWarningCount);
    const comprehensiveScore = getWeightedPerformanceScore({
      evaluationScore,
      problemAmountScore,
      problemCountScore,
      warningScore,
    });

    return {
      ...item,
      comprehensiveScore,
      evaluationScore,
      problemAmountScore,
      problemCountScore,
      warningScore,
      attentionLevel: getAttentionLevel(comprehensiveScore),
      attentionScore: comprehensiveScore,
    };
  }).sort((a, b) => (
    a.comprehensiveScore - b.comprehensiveScore ||
    b.problemAmount - a.problemAmount ||
    b.confirmedIssueCount - a.confirmedIssueCount ||
    b.warningCount - a.warningCount
  ));
}

function buildAttentionThemes(rows: SubjectThemeScore[]): AttentionTheme[] {
  const grouped = rows.reduce<Record<string, SubjectThemeScore[]>>((acc, row) => {
    acc[row.monitorTheme] = acc[row.monitorTheme] || [];
    acc[row.monitorTheme].push(row);
    return acc;
  }, {});

  const baseRows = Object.values(grouped).map((items) => {
    const first = items[0];
    const coveredSubjects = Array.from(new Set(items.map((item) => item.regionName)));
    const lowSubjects = Array.from(new Set(items.filter((item) => item.themeScore < 70).map((item) => item.regionName)));
    const themeScores = items.map((item) => item.themeScore);
    const averageScore = themeScores.reduce((sum, score) => sum + score, 0) / themeScores.length;
    const medianScore = getMedianScore(themeScores);
    const lowSubjectRatio = getRatioPercent(lowSubjects.length, Math.max(coveredSubjects.length, 1), 1);
    const warningCount = items.reduce((sum, item) => sum + item.abnormalCount, 0);
    const confirmedIssueCount = getMockConfirmedIssueCount(warningCount);
    const problemAmount = getMockProblemAmount(warningCount, confirmedIssueCount, lowSubjects.length || coveredSubjects.length);
    const enabledRuleCount = Math.max(3, Math.round(warningCount / 42) + lowSubjects.length + 3);
    const policyCoverage = averageScore < 72 || enabledRuleCount < 7 ? '部分覆盖' : '已覆盖';
    const systemCompleteness = Math.max(58, Math.min(96, Math.round(92 - lowSubjectRatio * 0.22 - (policyCoverage === '部分覆盖' ? 8 : 0) - (enabledRuleCount < 7 ? 6 : 0))));

    return {
      monitorTheme: first.monitorTheme,
      monitorCategory: first.monitorCategory,
      averageScore,
      medianScore,
      lowSubjectCount: lowSubjects.length,
      coverageSubjectCount: coveredSubjects.length,
      lowSubjectRatio,
      enabledRuleCount,
      warningCount,
      confirmedIssueCount,
      problemAmount,
      problemAmountText: formatWanAmount(problemAmount),
      caseCount: getMockFormedCaseCount(warningCount, confirmedIssueCount, lowSubjects.length || coveredSubjects.length),
      affectedRegionCount: coveredSubjects.length,
      policyCoverage,
      systemCompleteness,
      reason: lowSubjects.length
        ? `${lowSubjects.slice(0, 3).join('、')}等区划得分偏低，确认问题和预警疑点需继续核查。`
        : '当前主题低分区划较少，保持常态跟踪。',
    };
  });

  const maxProblemAmount = Math.max(...baseRows.map((item) => item.problemAmount), 0);
  const maxConfirmedIssueCount = Math.max(...baseRows.map((item) => item.confirmedIssueCount), 0);
  const maxWarningCount = Math.max(...baseRows.map((item) => item.warningCount), 0);

  return baseRows.map((item) => {
    const evaluationScore = clampPerformanceScore(item.averageScore);
    const problemAmountScore = getInversePerformanceScore(item.problemAmount, maxProblemAmount);
    const problemCountScore = getInversePerformanceScore(item.confirmedIssueCount, maxConfirmedIssueCount);
    const warningScore = getInversePerformanceScore(item.warningCount, maxWarningCount);
    const comprehensiveScore = getWeightedPerformanceScore({
      evaluationScore,
      problemAmountScore,
      problemCountScore,
      warningScore,
    });

    return {
      ...item,
      comprehensiveScore,
      evaluationScore,
      problemAmountScore,
      problemCountScore,
      warningScore,
      attentionLevel: getAttentionLevel(comprehensiveScore),
      attentionScore: comprehensiveScore,
    };
  }).sort((a, b) => (
    a.averageScore - b.averageScore ||
    a.medianScore - b.medianScore ||
    b.lowSubjectCount - a.lowSubjectCount ||
    b.problemAmount - a.problemAmount ||
    b.confirmedIssueCount - a.confirmedIssueCount ||
    b.warningCount - a.warningCount
  ));
}

function getAreaOffset(name: string) {
  const hash = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ((hash % 9) - 4) * 0.85;
}

function clampScore(score: number) {
  return Math.max(45, Math.min(96, score));
}

function localizeSubjectName(subjectName: string, countyName: string, subjectType: string) {
  if (subjectName.includes('财政局')) return `${countyName}财政局`;
  if (subjectType.includes('预算单位')) return `${countyName}预算单位A`;
  if (subjectType.includes('主管部门')) return `${countyName}主管部门`;
  return `${countyName}${subjectType}`;
}

function buildCountyScoreRows(parentRegion: string, countyName: string): SubjectThemeScore[] {
  const offset = getAreaOffset(countyName);
  const localizedParentRows = subjectThemeScores
    .filter((row) => row.regionName === parentRegion)
    .map((row, index) => {
      const themeScore = clampScore(row.themeScore + offset * 0.35 - (index % 2) * 1.1);
      return {
        ...row,
        subjectName: localizeSubjectName(row.subjectName, countyName, row.subjectType),
        regionName: countyName,
        subjectType: row.subjectType === '市州财政' ? '区县财政' : row.subjectType,
        themeScore,
        riskLevel: riskByScore(themeScore),
        abnormalCount: Math.max(6, Math.round(row.abnormalCount * (0.32 + Math.abs(offset) / 26))),
        interceptCount: Math.max(1, Math.round(row.interceptCount * (0.32 + Math.abs(offset) / 30))),
        closedLoopRate: clampScore(row.closedLoopRate + offset * 0.45),
      };
    });

  const templateRows = countySubjectTemplates.map((template, index) => {
    const themeScore = clampScore(template.baseScore + offset * 0.55 - (index % 4) * 0.7);
    return {
      subjectName: `${countyName}${template.suffix}`,
      regionName: countyName,
      subjectType: template.subjectType,
      monitorCategory: template.monitorCategory,
      monitorTheme: template.monitorTheme,
      themeScore,
      themeWeight: 1,
      subjectWeight: 1,
      riskLevel: riskByScore(themeScore),
      lowScoreIndicators: [template.indicator],
      abnormalCount: Math.max(8, Math.round(template.abnormalCount * (0.82 + Math.abs(offset) / 24))),
      interceptCount: Math.max(1, Math.round(template.interceptCount * (0.82 + Math.abs(offset) / 30))),
      closedLoopRate: clampScore(template.closedLoopRate + offset * 0.45),
      mainDeductionReason: template.reason,
    };
  });

  return [...localizedParentRows, ...templateRows];
}

function buildCountyAbnormalDetails(parentRegion: string, countyName: string): AbnormalDetail[] {
  const offset = Math.abs(getAreaOffset(countyName));
  return abnormalDetails
    .filter((item) => item.regionName === parentRegion)
    .map((item) => ({
      ...item,
      regionName: countyName,
      subjectName: item.subjectName.includes('财政局') ? `${countyName}财政局` : `${countyName}预算单位A`,
      amount: item.amount.replace(/\d+(?:,\d+)?(?:\.\d+)?/, (value) => {
        const normalized = Number(value.replace(',', ''));
        return Number.isNaN(normalized) ? value : (normalized * (0.35 + offset / 12)).toLocaleString('zh-CN', { maximumFractionDigits: 1 });
      }),
    }));
}

function getParentRegion(properties: Record<string, unknown>) {
  const adcode = String(properties.adcode || properties.adcode_pro || '');
  const prefix = adcode.slice(0, 4);
  if (cityCodePrefixMap[prefix]) return cityCodePrefixMap[prefix];

  const parentName = String((properties.parent as { name?: string } | undefined)?.name || properties.cityName || '');
  const matched = regionScores.find((region) => parentName.includes(region.regionName.replace('市', '').replace('州', '')));
  const name = String(properties.name || '');
  return matched?.regionName || countyParentMap[name] || name;
}

function getMapRegionForArea(area: MapAreaFeature, regions: RegionScore[]) {
  return regions.find((region) => region.regionName === area.name)
    || regions.find((region) => region.regionName === area.parentRegion);
}

function getMapAreaValue(area: MapAreaFeature, metric: MapMetric, regions: RegionScore[]) {
  const parent = getMapRegionForArea(area, regions);
  if (!parent) return 0;
  const score = clampPerformanceScore(parent.comprehensiveScore);
  const confirmedIssueCount = parent.confirmedIssueCount ?? getMockConfirmedIssueCount(parent.abnormalCount);
  const problemAmount = parent.problemAmount ?? getMockProblemAmount(parent.abnormalCount, confirmedIssueCount, parent.highRiskThemes);
  if (metric === '综合表现' || metric === '综合情况') return score;
  if (metric === '评分表现' || metric === '主题得分') return parent.averageScore ?? score;
  if (metric === '低分指标') return parent.highRiskThemes;
  if (metric === '预警疑点') return parent.warningCount ?? parent.abnormalCount;
  if (metric === '问题数量') return confirmedIssueCount;
  if (metric === '问题金额') return problemAmount;
  if (metric === '整改状态') return parent.pendingCount ?? confirmedIssueCount;
  if (metric === '超期问题') return parent.overdueCount ?? 0;
  if (metric === '退回问题') return parent.reviewRejectCount;
  if (metric === '督办问题') return parent.interceptCount;
  if (metric === '案例沉淀') return parent.caseCount ?? 0;
  return score;
}

function getMapRiskLevel(score: number): MapRiskLevel {
  if (score < 60) return '高风险';
  if (score < 80) return '中风险';
  return '低风险';
}

function getMapRiskColor(level: MapRiskLevel) {
  if (level === '高风险') return '#ef6f6c';
  if (level === '中风险') return '#f2b84b';
  return '#7ddfa1';
}

function formatMapLabel(name: string) {
  return name
    .replace('土家族苗族自治州', '')
    .replace('自治州', '')
    .replace(/市$/, '')
    .replace(/区$/, '')
    .replace(/县$/, '');
}

function getAreaSummary(area: MapAreaFeature, metric: MapMetric, regions: RegionScore[]) {
  const parent = getMapRegionForArea(area, regions);
  if (!parent || area.hasData === false) return null;
  const score = clampPerformanceScore(parent.comprehensiveScore);
  const mapRiskLevel = getMapRiskLevel(score);
  return {
    score,
    mapRiskLevel,
    value: getMapAreaValue(area, metric, regions),
    parent,
  };
}

function getMetricMapRiskLevel(summary: ReturnType<typeof getAreaSummary>, metric: MapMetric): MapRiskLevel {
  if (!summary) return '低风险';
  if (metric === '整改状态') {
    if (summary.value >= 45) return '高风险';
    if (summary.value >= 20) return '中风险';
    return '低风险';
  }
  if (metric === '超期问题') {
    if (summary.value >= 8) return '高风险';
    if (summary.value >= 3) return '中风险';
    return '低风险';
  }
  if (metric === '退回问题') {
    if (summary.value >= 6) return '高风险';
    if (summary.value >= 3) return '中风险';
    return '低风险';
  }
  if (metric === '督办问题') {
    if (summary.value >= 9) return '高风险';
    if (summary.value >= 4) return '中风险';
    return '低风险';
  }
  if (metric === '案例沉淀') {
    if (summary.value <= 1) return '高风险';
    if (summary.value <= 3) return '中风险';
    return '低风险';
  }
  if (metric === '预警疑点') {
    if (summary.value >= 180) return '高风险';
    if (summary.value >= 100) return '中风险';
    return '低风险';
  }
  if (metric === '问题数量') {
    if (summary.value >= 48) return '高风险';
    if (summary.value >= 25) return '中风险';
    return '低风险';
  }
  if (metric === '问题金额') {
    if (summary.value >= 3000) return '高风险';
    if (summary.value >= 1800) return '中风险';
    return '低风险';
  }
  if (metric === '低分指标') {
    if (summary.value >= 4) return '高风险';
    if (summary.value >= 2) return '中风险';
    return '低风险';
  }
  if (metric === '评分表现' || metric === '主题得分') {
    if (summary.score < 70) return '高风险';
    if (summary.score < 85) return '中风险';
    return '低风险';
  }
  return summary.mapRiskLevel;
}

function getMapMetricText(summary: ReturnType<typeof getAreaSummary>, metric: MapMetric) {
  if (!summary) return '暂无数据';
  const confirmedIssueCount = getMockConfirmedIssueCount(summary.parent.abnormalCount);
  const problemAmount = getMockProblemAmount(summary.parent.abnormalCount, confirmedIssueCount, summary.parent.highRiskThemes);
  const specialIssueCount = summary.parent.confirmedIssueCount ?? summary.parent.abnormalCount;
  const isSpecialData = summary.parent.pendingCount !== undefined;
  if (metric === '综合表现') return `${formatScore(summary.score)}分｜${getMapAttentionLabel(summary.mapRiskLevel)}`;
  if (metric === '综合情况') return `${getMapAttentionLabel(summary.mapRiskLevel)}｜问题${specialIssueCount}条`;
  if (metric === '评分表现' || metric === '主题得分') return `${formatScore(summary.score)}分`;
  if (metric === '低分指标') return `${summary.parent.highRiskThemes}个低分指标`;
  if (metric === '预警疑点') return `${summary.parent.abnormalCount}条预警疑点`;
  if (metric === '问题数量') return isSpecialData ? `${specialIssueCount}条问题` : `${confirmedIssueCount}个确认问题`;
  if (metric === '问题金额') return formatWanAmount(problemAmount);
  if (metric === '整改状态') return `未销号${summary.parent.pendingCount ?? 0}条｜销号率${formatPercent(summary.parent.closedLoopRate || 0)}`;
  if (metric === '超期问题') return `${summary.parent.overdueCount ?? 0}条超期`;
  if (metric === '退回问题') return `${summary.parent.reviewRejectCount}条退回`;
  if (metric === '督办问题') return `${summary.parent.interceptCount}条督办`;
  if (metric === '案例沉淀') return `${summary.parent.caseCount ?? 0}个案例`;
  return String(summary.value);
}

function getMapMetricHelp(metric: MapMetric, isSingleTheme: boolean) {
  if (metric === '综合情况') {
    return {
      title: '综合情况',
      meaning: '综合查看专项问题数量、金额、未销号、超期、退回和督办情况。',
      formula: '按问题数量、问题金额、未销号、超期、退回、督办和案例沉淀情况识别关注程度。',
      sort: '关注程度越高越靠前；同级别下优先看超期、未销号和问题金额较高的区划。',
    };
  }
  if (metric === '整改状态') {
    return {
      title: '整改状态',
      meaning: '查看各区划专项问题未销号和销号推进情况。',
      formula: '未销号问题包含未整改、整改中、已提交、审核中和已退回等尚未销号状态。',
      sort: '未销号问题越多越靠前；45条及以上为高关注，20-44条为中关注。',
    };
  }
  if (metric === '超期问题') {
    return {
      title: '超期问题',
      meaning: '查看超过整改期限但尚未完成销号的问题分布。',
      formula: '超期问题按当前统计范围内超过整改期限的问题数量汇总。',
      sort: '超期问题越多越靠前；8条及以上为高关注，3-7条为中关注。',
    };
  }
  if (metric === '退回问题') {
    return {
      title: '退回问题',
      meaning: '查看整改审核被退回的问题分布。',
      formula: '退回问题按整改审核过程中被退回的问题数量汇总。',
      sort: '退回问题越多越靠前；6条及以上为高关注，3-5条为中关注。',
    };
  }
  if (metric === '督办问题') {
    return {
      title: '督办问题',
      meaning: '查看已发起督办或重复督办的问题分布。',
      formula: '督办问题按当前范围内已发起督办的问题数量汇总。',
      sort: '督办问题越多越靠前；9条及以上为高关注，4-8条为中关注。',
    };
  }
  if (metric === '案例沉淀') {
    return {
      title: '案例沉淀',
      meaning: '查看专项问题整改是否形成案例和成果沉淀。',
      formula: '案例沉淀按已进入案例库或已审核通过的整改案例数量汇总。',
      sort: '案例较少且问题较多的区划需继续关注成果转化；0-1个为高关注，2-3个为中关注。',
    };
  }
  if (metric === '综合表现') {
    return {
      title: '综合表现',
      meaning: '用于综合判断当前区划需要关注的程度。',
      formula: '综合表现分 = 评价表现分×40% + 问题金额表现分×25% + 问题数量表现分×20% + 预警疑点表现分×15%。',
      sort: '分值越低越靠前；同分时按问题金额、确认问题数量、预警疑点数量降序排序。',
    };
  }
  if (metric === '评分表现') {
    return {
      title: '评分表现',
      meaning: '查看多主题口径下各区划评价得分的整体表现。',
      formula: '评分表现取当前区划范围内日常监督主题评价得分的平均值。',
      sort: '平均分越低越靠前，用于优先发现评分表现偏弱的区划。',
    };
  }
  if (metric === '主题得分') {
    return {
      title: '主题得分',
      meaning: `查看${isSingleTheme ? '当前主题' : '所选主题'}在各区划中的得分分布。`,
      formula: '主题得分取当前主题在该区划下的评价得分；多主体时取平均值。',
      sort: '主题得分越低越靠前，用于定位该主题下表现较弱的区划。',
    };
  }
  if (metric === '低分指标') {
    return {
      title: '低分指标',
      meaning: '查看当前主题下扣分指标或低分主题的集中程度。',
      formula: '低分指标数按当前区划命中的低分指标、低分主题去重统计。',
      sort: '低分指标越多越靠前；4个及以上为高关注，2-3个为中关注。',
    };
  }
  if (metric === '预警疑点') {
    return {
      title: '预警疑点',
      meaning: '查看规则识别出来、尚需核实的疑点线索分布。',
      formula: '预警疑点数按当前口径下规则识别的疑点条数汇总。',
      sort: '疑点数量越多越靠前；180条及以上为高关注，100-179条为中关注。',
    };
  }
  if (metric === '问题数量') {
    return {
      title: '问题数量',
      meaning: '查看当前口径下问题数量的区划分布。',
      formula: '问题数量按当前统计范围和监督主题下的问题条数汇总。',
      sort: '问题数量越多越靠前；48条及以上为高关注，25-47条为中关注。',
    };
  }
  return {
    title: '问题金额',
    meaning: '查看已确认问题涉及的资金影响规模。',
    formula: '问题金额按当前口径下确认问题涉及金额汇总，单位为万元。',
    sort: '确认金额越大越靠前；3000万元及以上为高关注，1800-2999.9万元为中关注。',
  };
}

function getMapMetricThreshold(metric: MapMetric, level: '高关注' | '中关注' | '低关注') {
  const scoreMetric = metric === '综合表现' || metric === '综合情况';
  const evaluationMetric = metric === '评分表现' || metric === '主题得分';
  if (scoreMetric) {
    if (metric === '综合情况') {
      if (level === '高关注') return '专项整改综合关注分 < 60';
      if (level === '中关注') return '专项整改综合关注分 60-79';
      return '专项整改综合关注分 >= 80';
    }
    if (level === '高关注') return '综合表现分 < 60';
    if (level === '中关注') return '综合表现分 60-79';
    return '综合表现分 >= 80';
  }
  if (evaluationMetric) {
    if (level === '高关注') return '平均得分 < 70';
    if (level === '中关注') return '平均得分 70-84';
    return '平均得分 >= 85';
  }
  if (metric === '低分指标') {
    if (level === '高关注') return '低分指标 >= 4个';
    if (level === '中关注') return '低分指标 2-3个';
    return '低分指标 < 2个';
  }
  if (metric === '预警疑点') {
    if (level === '高关注') return '预警疑点 >= 180条';
    if (level === '中关注') return '预警疑点 100-179条';
    return '预警疑点 < 100条';
  }
  if (metric === '问题数量') {
    if (level === '高关注') return '问题数量 >= 48条';
    if (level === '中关注') return '问题数量 25-47条';
    return '问题数量 < 25条';
  }
  if (metric === '整改状态') {
    if (level === '高关注') return '未销号问题 >= 45条';
    if (level === '中关注') return '未销号问题 20-44条';
    return '未销号问题 < 20条';
  }
  if (metric === '超期问题') {
    if (level === '高关注') return '超期问题 >= 8条';
    if (level === '中关注') return '超期问题 3-7条';
    return '超期问题 < 3条';
  }
  if (metric === '退回问题') {
    if (level === '高关注') return '退回问题 >= 6条';
    if (level === '中关注') return '退回问题 3-5条';
    return '退回问题 < 3条';
  }
  if (metric === '督办问题') {
    if (level === '高关注') return '督办问题 >= 9条';
    if (level === '中关注') return '督办问题 4-8条';
    return '督办问题 < 4条';
  }
  if (metric === '案例沉淀') {
    if (level === '高关注') return '案例沉淀 0-1个';
    if (level === '中关注') return '案例沉淀 2-3个';
    return '案例沉淀 >= 4个';
  }
  if (level === '高关注') return '确认金额 >= 3000万元';
  if (level === '中关注') return '确认金额 1800-2999.9万元';
  return '确认金额 < 1800万元';
}

function getAttentionLevelByMapMetric(region: AttentionRegion, metric: MapMetric): AttentionLevel {
  if (metric === '综合表现') return region.attentionLevel;
  if (metric === '评分表现' || metric === '主题得分') {
    if (region.averageScore < 70) return '高关注';
    if (region.averageScore < 85) return '中关注';
    return '低关注';
  }
  if (metric === '低分指标') {
    if (region.mainDeductionIndicators.length >= 4 || region.lowThemeCount >= 4) return '高关注';
    if (region.mainDeductionIndicators.length >= 2 || region.lowThemeCount >= 2) return '中关注';
    return '低关注';
  }
  if (metric === '预警疑点') {
    if (region.warningCount >= 180) return '高关注';
    if (region.warningCount >= 100) return '中关注';
    return '低关注';
  }
  if (metric === '问题数量') {
    if (region.confirmedIssueCount >= 48) return '高关注';
    if (region.confirmedIssueCount >= 25) return '中关注';
    return '低关注';
  }
  if (metric === '问题金额') {
    if (region.problemAmount >= 3000) return '高关注';
    if (region.problemAmount >= 1800) return '中关注';
    return '低关注';
  }
  return region.attentionLevel;
}

function getAttentionRegionMetricSummary(region: AttentionRegion, metric: MapMetric) {
  const level = getAttentionLevelByMapMetric(region, metric);
  const lowThemeText = region.lowThemes.slice(0, 2).join('、') || '暂无明显低分主题';
  if (metric === '评分表现' || metric === '主题得分') {
    return {
      level,
      toneClass: getAttentionToneClass(level),
      meta: `${level}｜平均得分 ${formatScore(region.averageScore)} 分`,
      lines: [
        `低分主题 ${region.lowThemeCount}/${region.totalThemeCount} 个｜${lowThemeText}`,
        `低分指标 ${region.mainDeductionIndicators.slice(0, 2).join('、') || '暂无明显低分指标'}`,
      ],
    };
  }
  if (metric === '低分指标') {
    return {
      level,
      toneClass: getAttentionToneClass(level),
      meta: `${level}｜低分指标 ${region.mainDeductionIndicators.length} 个`,
      lines: [
        `低分主题 ${region.lowThemeCount}/${region.totalThemeCount} 个｜${lowThemeText}`,
        `主要指标 ${region.mainDeductionIndicators.slice(0, 3).join('、') || '暂无明显扣分指标'}`,
      ],
    };
  }
  if (metric === '预警疑点') {
    return {
      level,
      toneClass: getAttentionToneClass(level),
      meta: `${level}｜预警疑点 ${region.warningCount} 条`,
      lines: [
        `触发规则 ${region.triggeredRuleCount} 条｜已核实 ${region.verifiedClueCount} 条`,
        `涉及主题 ${region.impactThemeCount} 个｜转问题率 ${formatPercent(region.issueConversionRate)}`,
      ],
    };
  }
  if (metric === '问题数量') {
    return {
      level,
      toneClass: getAttentionToneClass(level),
      meta: `${level}｜确认问题 ${region.confirmedIssueCount} 个`,
      lines: [
        `预警疑点 ${region.warningCount} 条｜已核实 ${region.verifiedClueCount} 条`,
        `转问题率 ${formatPercent(region.issueConversionRate)}｜问题金额 ${region.problemAmountText}`,
      ],
    };
  }
  if (metric === '问题金额') {
    return {
      level,
      toneClass: getAttentionToneClass(level),
      meta: `${level}｜问题金额 ${region.problemAmountText}`,
      lines: [
        `确认问题 ${region.confirmedIssueCount} 个｜预警疑点 ${region.warningCount} 条`,
        `涉及主题 ${region.impactThemeCount} 个｜${region.fundTypeCount} 类资金`,
      ],
    };
  }
  return {
    level,
    toneClass: getAttentionToneClass(level),
    meta: `${level}｜综合表现 ${formatScore(region.comprehensiveScore)} 分`,
    lines: [
      `评价 ${formatScore(region.evaluationScore)}｜金额表现 ${formatScore(region.problemAmountScore)}`,
      `问题数量表现 ${formatScore(region.problemCountScore)}｜疑点表现 ${formatScore(region.warningScore)}`,
      `问题金额 ${region.problemAmountText}｜涉及主题 ${region.impactThemeCount} 个`,
    ],
  };
}

function getSpecialRegionMetricSummary(region: SpecialAttentionRegion, metric: MapMetric) {
  let level = region.attentionLevel;
  let meta = `${level}｜问题 ${region.issueCount} 条`;
  let lines = [
    `未销号 ${region.unclosedCount} 条｜超期 ${region.overdueCount} 条`,
    `退回 ${region.returnedCount} 条｜督办 ${region.supervisedCount} 条｜案例 ${region.caseCount} 个`,
  ];

  if (metric === '问题数量') {
    level = region.issueCount >= 70 ? '高关注' : region.issueCount >= 35 ? '中关注' : '低关注';
    meta = `${level}｜问题总数 ${region.issueCount} 条`;
    lines = [
      `主要专项 ${region.mainThemes.slice(0, 2).join('、') || '暂无'}`,
      `未销号 ${region.unclosedCount} 条｜问题金额 ${region.issueAmountText}`,
    ];
  } else if (metric === '问题金额') {
    level = region.issueAmount >= 6000 ? '高关注' : region.issueAmount >= 2500 ? '中关注' : '低关注';
    meta = `${level}｜问题金额 ${region.issueAmountText}`;
    lines = [
      `问题总数 ${region.issueCount} 条｜未销号 ${region.unclosedCount} 条`,
      `涉及专项 ${region.mainThemes.slice(0, 2).join('、') || '暂无'}`,
    ];
  } else if (metric === '整改状态') {
    level = region.unclosedCount >= 45 ? '高关注' : region.unclosedCount >= 20 ? '中关注' : '低关注';
    meta = `${level}｜未销号 ${region.unclosedCount} 条`;
    lines = [
      `销号率 ${formatPercent(region.closedRate)}｜已销号 ${region.closedCount} 条`,
      `整改中 ${region.inProgressCount} 条｜审核中 ${region.reviewCount} 条`,
    ];
  } else if (metric === '超期问题') {
    level = region.overdueCount >= 8 ? '高关注' : region.overdueCount >= 3 ? '中关注' : '低关注';
    meta = `${level}｜超期 ${region.overdueCount} 条`;
    lines = [
      `未销号 ${region.unclosedCount} 条｜督办 ${region.supervisedCount} 条`,
      `主要专项 ${region.mainThemes.slice(0, 2).join('、') || '暂无'}`,
    ];
  } else if (metric === '退回问题') {
    level = region.returnedCount >= 6 ? '高关注' : region.returnedCount >= 3 ? '中关注' : '低关注';
    meta = `${level}｜退回 ${region.returnedCount} 条`;
    lines = [
      `已提交 ${region.submittedCount} 条｜审核中 ${region.reviewCount} 条`,
      `超期 ${region.overdueCount} 条｜未销号 ${region.unclosedCount} 条`,
    ];
  } else if (metric === '督办问题') {
    level = region.supervisedCount >= 9 ? '高关注' : region.supervisedCount >= 4 ? '中关注' : '低关注';
    meta = `${level}｜督办 ${region.supervisedCount} 条`;
    lines = [
      `重复督办 ${region.repeatedSupervisedCount} 条｜超期 ${region.overdueCount} 条`,
      `退回 ${region.returnedCount} 条｜未销号 ${region.unclosedCount} 条`,
    ];
  } else if (metric === '案例沉淀') {
    level = region.caseCount <= 1 ? '高关注' : region.caseCount <= 3 ? '中关注' : '低关注';
    meta = `${level}｜案例 ${region.caseCount} 个`;
    lines = [
      `已销号 ${region.closedCount} 条｜案例转化 ${formatPercent(getRatioPercent(region.caseCount, Math.max(region.closedCount, 1), 1))}`,
      `问题总数 ${region.issueCount} 条｜主要专项 ${region.mainThemes[0] || '暂无'}`,
    ];
  }

  return {
    level,
    toneClass: getAttentionToneClass(level),
    meta,
    lines,
  };
}

function buildMapRegionScores(attentionRows: AttentionRegion[]): RegionScore[] {
  return attentionRows.map((item) => ({
    regionName: item.regionName,
    comprehensiveScore: item.comprehensiveScore,
    riskLevel: riskByScore(item.comprehensiveScore),
    highRiskSubjects: item.lowThemeCount,
    highRiskThemes: item.lowThemeCount,
    abnormalCount: item.warningCount,
    abnormalTotalCount: getMockAbnormalTotal(item.warningCount),
    interceptCount: item.triggeredRuleCount,
    closedLoopRate: item.averageScore,
    reviewRejectCount: Math.round(item.warningCount * 0.08),
    reviewSubmitCount: item.warningCount,
    mainLowThemes: item.lowThemes,
    lowestThemeScore: `${formatScore(item.averageScore)}分`,
    lowScoreIndicatorsList: item.mainDeductionIndicators.join('、'),
    relatedSubjects: item.impactThemeCount,
    confirmedIssueCount: item.confirmedIssueCount,
    problemAmount: item.problemAmount,
    caseCount: item.caseCount,
    averageScore: item.averageScore,
    warningCount: item.warningCount,
  }));
}

function getAreaColor(area: MapAreaFeature, metric: MapMetric, min: number, max: number, isAllThemes: boolean, regions: RegionScore[]) {
  const summary = getAreaSummary(area, metric, regions);
  if (!summary) return '#e5e7eb';
  return getMapRiskColor(getMetricMapRiskLevel(summary, metric));
}

function getSubjectRiskLines(subject: SubjectSummary) {
  const verifiedClueCount = Math.round(subject.abnormalCount * 0.76);
  const confirmedIssueCount = Math.round(verifiedClueCount * 0.31);
  const conversionRate = getRatioPercent(confirmedIssueCount, verifiedClueCount, 1);
  return [
    { label: '低分主题', value: `${subject.lowThemes.length}个`, risk: subject.lowThemes.join('、') || '暂无' },
    { label: '触发规则', value: `${subject.ruleTriggerCount || 0}条`, risk: '去重规则数' },
    { label: '预警疑点', value: `${subject.abnormalCount}条`, risk: '规则识别疑点' },
    { label: '转问题率', value: `${formatPercent(conversionRate)}`, risk: `${confirmedIssueCount}/${verifiedClueCount}` },
  ];
}

function getThemeMetricHover(theme: ThemePosture, metric: ThemeHoverMetric) {
  if (metric === '异常率') {
    return {
      title: '异常率',
      value: `${theme.abnormalRate.toFixed(1)}%`,
      formula: '异常数据数 / 应检测数据总数 × 100%',
      numerator: `异常数据数 ${theme.abnormalCount.toLocaleString('zh-CN')} 条`,
      denominator: `应检测数据总数 ${theme.abnormalTotalCount.toLocaleString('zh-CN')} 条`,
    };
  }

  if (metric === '退回率') {
    return {
      title: '退回率',
      value: `${theme.reviewRejectRate.toFixed(1)}%`,
      formula: '审核退回事项数 / 已提交审核事项数 × 100%',
      numerator: `审核退回事项 ${theme.reviewRejectCount.toLocaleString('zh-CN')} 条`,
      denominator: `已提交审核事项 ${theme.reviewSubmitCount.toLocaleString('zh-CN')} 条`,
    };
  }

  return {
    title: '闭环率',
    value: `${formatScore(theme.closedLoopRate)}%`,
    formula: '已闭环事项数 / 应闭环事项数 × 100%',
    numerator: `已闭环事项 ${theme.closedLoopCount.toLocaleString('zh-CN')} 条`,
    denominator: `应闭环事项 ${theme.shouldClosedCount.toLocaleString('zh-CN')} 条`,
  };
}

function HunanRiskMap({
  regions,
  viewRegion,
  selectedArea,
  highlightedArea,
  metric,
  resetToken,
  onCitySelect,
  onCountySelect,
  isAllThemes,
  isSpecialSupervision,
}: {
  regions: RegionScore[];
  viewRegion: string | null;
  selectedArea: string | null;
  highlightedArea?: string | null;
  metric: MapMetric;
  resetToken: number;
  onCitySelect: (cityName: string) => void;
  onCountySelect: (countyName: string, parentRegion: string) => void;
  isAllThemes: boolean;
  isSpecialSupervision: boolean;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const [provinceGeoJson, setProvinceGeoJson] = useState<GeoJsonCollection | null>(null);
  const [districtGeoJson, setDistrictGeoJson] = useState<GeoJsonCollection | null>(null);
  const [provinceAreas, setProvinceAreas] = useState<MapAreaFeature[]>([]);
  const [districtAreas, setDistrictAreas] = useState<MapAreaFeature[]>([]);
  const [mapError, setMapError] = useState(false);
  const [mapErrorText, setMapErrorText] = useState('');
  const [mapVersion, setMapVersion] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const loadMap = useCallback(async () => {
    if (!mapRef.current) return;
    setMapError(false);
    setMapErrorText('');
    try {
      const [provinceResponse, districtResponse] = await Promise.all([
        fetch('https://geo.datav.aliyun.com/areas_v3/bound/430000_full.json'),
        fetch('https://geo.datav.aliyun.com/areas_v3/bound/430000_full_district.json'),
      ]);
      const provinceJson = (await provinceResponse.json()) as GeoJsonCollection;
      const districtJson = (await districtResponse.json()) as GeoJsonCollection;
      if (!mapRef.current) return;
      echarts.registerMap('hunan-province', provinceJson as EChartsGeoJson);
      setProvinceGeoJson(provinceJson);
      setDistrictGeoJson(districtJson);
      setProvinceAreas(
        (provinceJson.features || [])
          .map((feature) => {
            const name = String(feature.properties.name || '');
            const parentRegion = normalizeRegionName(name);
            return {
              name,
              parentRegion,
              scoreOffset: getAreaOffset(name),
              hasData: Boolean(regions.find((region) => region.regionName === parentRegion)),
            };
          })
          .filter((area) => area.name),
      );
      setDistrictAreas(
        (districtJson.features || [])
          .map((feature) => {
            const name = String(feature.properties.name || '');
            const parentRegion = getParentRegion(feature.properties);
            return {
              name,
              parentRegion,
              scoreOffset: getAreaOffset(name),
              hasData: Boolean(regions.find((region) => region.regionName === parentRegion)),
            };
          })
          .filter((area) => area.name),
      );
      const chart = chartRef.current || echarts.init(mapRef.current);
      chartRef.current = chart;
      setMapVersion((version) => version + 1);
    } catch {
      setMapError(true);
      setMapErrorText('网络连接受限，点击下方区域可筛选数据');
    }
  }, [regions]);

  useEffect(() => {
    let disposed = false;
    loadMap();
    return () => {
      disposed = true;
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [reloadKey, loadMap]);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!provinceGeoJson || !districtGeoJson) return;

    const isCityView = Boolean(viewRegion && viewRegion !== '省本级');
    const areaData = isCityView
      ? districtAreas.filter((area) => area.parentRegion === viewRegion)
      : provinceAreas.filter((area) => regions.some((region) => region.regionName === area.parentRegion));
    const safeAreaData = areaData.length ? areaData : [{ name: viewRegion || '湖南省', parentRegion: viewRegion || '湖南省', scoreOffset: 0, hasData: false }];
    const values = safeAreaData.map((area) => getMapAreaValue(area, metric, regions));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mapName = isCityView ? `hunan-city-${viewRegion}` : 'hunan-province';
    if (isCityView) {
      const cityFeatures = districtGeoJson.features.filter((feature) => getParentRegion(feature.properties) === viewRegion);
      echarts.registerMap(mapName, { ...districtGeoJson, features: cityFeatures } as EChartsGeoJson);
    }
    const rankedAreas = [...safeAreaData].sort((a, b) => getMapAreaValue(a, '综合表现', regions) - getMapAreaValue(b, '综合表现', regions));
    const data = safeAreaData.map((area) => {
      const summary = getAreaSummary(area, metric, regions);
      const isHighlighted = area.name === (highlightedArea || selectedArea) || (Boolean(viewRegion) && highlightedArea === viewRegion);
      return {
        name: area.name,
        value: summary ? summary.value : 0,
        itemStyle: {
          areaColor: getAreaColor(area, metric, min, max, isAllThemes, regions),
          borderColor: isHighlighted ? '#155eef' : '#ffffff',
          borderWidth: isHighlighted ? 2.4 : 1,
        },
      };
    });

    chartRef.current.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        borderWidth: 0,
        padding: 12,
        formatter: (params: { name: string }) => {
          const area = safeAreaData.find((item) => item.name === params.name);
          const summary = area ? getAreaSummary(area, metric, regions) : null;
          if (!area || !summary) {
            return `<div class="map-tooltip"><strong>${params.name}</strong><span>暂无评分数据</span></div>`;
          }
          const rank = Math.max(1, rankedAreas.findIndex((item) => item.name === area.name) + 1);
          const attentionLabel = getMapAttentionLabel(summary.mapRiskLevel);
          const lowThemeText = summary.parent.mainLowThemes.slice(0, 2).join('、') || '暂无明显低分主题';
          const confirmedIssueCount = summary.parent.confirmedIssueCount ?? getMockConfirmedIssueCount(summary.parent.abnormalCount);
          const problemAmount = formatWanAmount(summary.parent.problemAmount ?? getMockProblemAmount(summary.parent.abnormalCount, confirmedIssueCount, summary.parent.highRiskThemes));

          if (isSpecialSupervision) {
            return `
              <div class="map-tooltip">
                <strong>${params.name}</strong>
                ${isCityView ? `<span>所属市州：${summary.parent.regionName}</span>` : ''}
                <span>当前维度：${metric}｜${getMapMetricText(summary, metric)}</span>
                <span>关注状态：${attentionLabel}｜关注排序：第 ${rank} 位</span>
                <span>问题总数：${summary.parent.confirmedIssueCount ?? summary.parent.abnormalCount} 条｜金额 ${problemAmount}</span>
                <span>未销号：${summary.parent.pendingCount ?? 0} 条｜超期：${summary.parent.overdueCount ?? 0} 条</span>
                <span>退回：${summary.parent.reviewRejectCount} 条｜督办：${summary.parent.interceptCount} 条</span>
                <span>案例沉淀：${summary.parent.caseCount ?? 0} 个｜主要专项：${lowThemeText}</span>
              </div>
            `;
          }

          return `
            <div class="map-tooltip">
              <strong>${params.name}</strong>
              ${isCityView ? `<span>所属市州：${summary.parent.regionName}</span>` : ''}
              <span>当前维度：${metric}｜${getMapMetricText(summary, metric)}</span>
              <span>关注状态：${attentionLabel}</span>
              <span>关注排序：第 ${rank} 位</span>
              <span>低分主题：${summary.parent.highRiskThemes ?? 0} 个｜${lowThemeText}</span>
              <span>触发规则：${summary.parent.interceptCount} 条</span>
              <span>预警疑点：${summary.parent.warningCount ?? summary.parent.abnormalCount} 条</span>
              <span>确认问题：${confirmedIssueCount} 个｜金额 ${problemAmount}</span>
              <span>涉及主题：${summary.parent.highRiskThemes} 个</span>
            </div>
          `;
        },
      },
      series: [
        {
          type: 'map',
          map: mapName,
          roam: true,
          selectedMode: false,
          zoom: isCityView ? 1.08 : 1.02,
          label: {
            show: true,
            color: 'rgba(51, 65, 85, 0.68)',
            fontSize: isCityView ? 9 : 10,
            formatter: (params: { name?: string }) => formatMapLabel(params.name || ''),
          },
          emphasis: { label: { color: '#0f172a', fontWeight: 700 }, itemStyle: { borderColor: '#155eef', borderWidth: 2 } },
          itemStyle: { borderColor: '#ffffff', borderWidth: 1, areaColor: '#dbeafe' },
          data,
        },
      ],
    }, true);

    chartRef.current.off('click');
    chartRef.current.on('click', (params: { name?: string }) => {
      const area = safeAreaData.find((item) => item.name === params.name);
      if (!params.name || !area) return;
      if (isCityView) {
        onCountySelect(params.name, area.parentRegion);
      } else {
        onCitySelect(area.parentRegion);
      }
    });

    const resize = () => chartRef.current?.resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [districtAreas, districtGeoJson, highlightedArea, isAllThemes, isSpecialSupervision, mapVersion, metric, onCitySelect, onCountySelect, provinceAreas, provinceGeoJson, regions, selectedArea, viewRegion]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setOption({ series: [{ zoom: viewRegion ? 1.08 : 1.02, center: undefined }] });
    chartRef.current.resize();
  }, [resetToken, viewRegion]);

  if (mapError) {
    return (
      <div className="map-fallback-container">
        <div className="map-fallback-grid">
          {regions.map((region) => (
            <button key={region.regionName} className={region.regionName === (highlightedArea || selectedArea) ? 'active' : ''} onClick={() => onCitySelect(region.regionName)}>
              <span>{region.regionName}</span>
              <strong>{getMapAttentionLabel(getMapRiskLevel(region.comprehensiveScore))}</strong>
            </button>
          ))}
        </div>
        <div className="map-fallback-footer">
          {mapErrorText && <span className="map-error-note">{mapErrorText}</span>}
          <button className="map-reload-btn" onClick={() => setReloadKey((k) => k + 1)}>
            重新加载地图
          </button>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="hunan-map" />;
}

export default function JurisdictionSupervisionAnalysisPrototype() {
  const [timeRange, setTimeRange] = useState<TimeRange>('本月');
  const [customStart, setCustomStart] = useState('2026-05-01');
  const [customEnd, setCustomEnd] = useState('2026-05-14');
  const [adminRegion, setAdminRegion] = useState('湖南省全辖');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedMapArea, setSelectedMapArea] = useState<string | null>(null);
  const [analysisShape, setAnalysisShape] = useState<AnalysisShape>('jurisdiction');
  const [supervisionCategory, setSupervisionCategory] = useState<SupervisionCategory>('日常监督');
  const [monitorCategory, setMonitorCategory] = useState<MonitorCategory>('全部');
  const [monitorTheme, setMonitorTheme] = useState('全部');
  const [subjectType, setSubjectType] = useState<SubjectTypeFilter>('全部');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [mapMetric, setMapMetric] = useState<MapMetric>('综合表现');
  const [mapResetToken, setMapResetToken] = useState(0);
  const [detailTab, setDetailTab] = useState<DetailTab>('区划主题明细');
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [openFilterMenu, setOpenFilterMenu] = useState<FilterMenuKey | null>(null);
  const [openDatePicker, setOpenDatePicker] = useState<DatePickerKey | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => parseDateValue('2026-05-01'));
  const [ruleAnalysisTab, setRuleAnalysisTab] = useState<RuleAnalysisTab>('规则触发分析');
  const [selectedRuleType, setSelectedRuleType] = useState<string | null>(null);
  const [selectedRuleCode, setSelectedRuleCode] = useState<string | null>(null);
  const [hoveredSubjectName, setHoveredSubjectName] = useState<string | null>(null);
  const [isHoverCardVisible, setIsHoverCardVisible] = useState(false);
  const [hoveredItemIndex, setHoveredItemIndex] = useState<number | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ruleDrawerData, setRuleDrawerData] = useState<{
    type: 'rule-type' | 'high-frequency-rule' | 'region-trigger' | 'clue-conversion';
    data: any;
  } | null>(null);
  const [hoveredThemeMetric, setHoveredThemeMetric] = useState<{ theme: ThemePosture; metric: ThemeHoverMetric } | null>(null);

  const isSpecialSupervision = supervisionCategory === '专项监督';
  const activeRegion = selectedRegion ?? (adminRegion === '湖南省全辖' ? null : adminRegion);
  const activeTheme = selectedTheme ?? (monitorTheme === '全部' ? null : monitorTheme);
  const isUnitAnalysisMode = analysisShape === 'unit';
  const activeMapRegion = !isUnitAnalysisMode && activeRegion && activeRegion !== '省本级' ? activeRegion : null;

  const baseFilteredScoreRows = useMemo(() => {
    let sourceRows = subjectThemeScores;

    // 根据层级生成对应数据
    if (selectedMapArea && activeRegion && !subjectThemeScores.some((row) => row.regionName === selectedMapArea)) {
      // 区县级：生成该区县数据
      sourceRows = buildCountyScoreRows(activeRegion, selectedMapArea);
    } else if (!isUnitAnalysisMode && activeRegion && activeRegion !== '省本级' && !selectedMapArea) {
      // 市级：生成该市级下所有区县数据（合并展示）
      const cityCounties = Object.entries(countyParentMap)
        .filter(([_, parent]) => parent === activeRegion)
        .map(([county]) => county);

      const countyRows = cityCounties.flatMap(countyName =>
        buildCountyScoreRows(activeRegion, countyName)
      );

      // 合并市本级和区县数据
      const cityRows = subjectThemeScores.filter(row => row.regionName === activeRegion);
      sourceRows = [...cityRows, ...countyRows];
    } else if (!activeRegion) {
      // 全省级：只显示市州和省本级
      sourceRows = subjectThemeScores.filter(row =>
        cityRegions.includes(row.regionName) || row.regionName === '省本级'
      );
    }

	    return sourceRows.filter((row) => {
	      if (supervisionCategory !== '日常监督') return false;
	      let regionMatched = true;

      if (selectedMapArea) {
        // 区县级：只匹配该区县
        regionMatched = row.regionName === selectedMapArea;
      } else if (isUnitAnalysisMode && activeRegion === '省本级') {
        // 省本级：进入本级 / 单位分析形态，不展示区划地图
        regionMatched = row.regionName === '省本级';
      } else if (isUnitAnalysisMode && activeRegion) {
        // 市本级：只看当前市本级主体，不合并下级区县
        regionMatched = row.regionName === activeRegion;
      } else if (activeRegion && activeRegion !== '省本级') {
        // 市级：匹配该市及其下区县
        const cityCounties = Object.entries(countyParentMap)
          .filter(([_, parent]) => parent === activeRegion)
          .map(([county]) => county);
        regionMatched = row.regionName === activeRegion || cityCounties.includes(row.regionName);
      } else if (activeRegion === '省本级') {
        // 省本级：只匹配省本级
        regionMatched = row.regionName === '省本级';
      } else {
        // 全省：匹配市州和省本级
        regionMatched = cityRegions.includes(row.regionName) || row.regionName === '省本级';
      }

      const categoryMatched = monitorCategory === '全部' || row.monitorCategory === monitorCategory;
      const themeMatched = !activeTheme || row.monitorTheme === activeTheme;
      const subjectTypeMatched = matchesSubjectType(row, subjectType);
      return regionMatched && categoryMatched && themeMatched && subjectTypeMatched;
    });
		  }, [activeRegion, activeTheme, isUnitAnalysisMode, monitorCategory, selectedMapArea, subjectType, supervisionCategory]);

  const availableSubjectOptions = useMemo(() => {
    return Array.from(new Set(baseFilteredScoreRows.map((row) => row.subjectName))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [baseFilteredScoreRows]);

  const filteredScoreRows = useMemo(() => {
    return baseFilteredScoreRows.filter((row) => !selectedSubject || row.subjectName === selectedSubject);
  }, [baseFilteredScoreRows, selectedSubject]);

  const specialFilteredIssueRows = useMemo(() => {
    if (!isSpecialSupervision) return [];
    let sourceRows = specialIssueRecords;

    if (selectedMapArea && activeRegion && !specialIssueRecords.some((row) => row.regionName === selectedMapArea)) {
      sourceRows = buildCountySpecialIssueRows(activeRegion, selectedMapArea);
    } else if (!isUnitAnalysisMode && activeRegion && activeRegion !== '省本级' && !selectedMapArea) {
      const cityCounties = Object.entries(countyParentMap)
        .filter(([, parent]) => parent === activeRegion)
        .map(([county]) => county);
      const countyRows = cityCounties.flatMap((countyName) => buildCountySpecialIssueRows(activeRegion, countyName));
      const cityRows = specialIssueRecords.filter((row) => row.regionName === activeRegion);
      sourceRows = [...cityRows, ...countyRows];
    } else if (!activeRegion) {
      sourceRows = specialIssueRecords.filter((row) => cityRegions.includes(row.regionName) || row.regionName === '省本级');
    }

    return sourceRows.filter((row) => {
      let regionMatched = true;
      if (selectedMapArea) {
        regionMatched = row.regionName === selectedMapArea;
      } else if (isUnitAnalysisMode && activeRegion === '省本级') {
        regionMatched = row.regionName === '省本级';
      } else if (isUnitAnalysisMode && activeRegion) {
        regionMatched = row.regionName === activeRegion;
      } else if (activeRegion && activeRegion !== '省本级') {
        const cityCounties = Object.entries(countyParentMap)
          .filter(([, parent]) => parent === activeRegion)
          .map(([county]) => county);
        regionMatched = row.regionName === activeRegion || cityCounties.includes(row.regionName);
      } else if (activeRegion === '省本级') {
        regionMatched = row.regionName === '省本级';
      } else {
        regionMatched = cityRegions.includes(row.regionName) || row.regionName === '省本级';
      }

      return regionMatched && matchesSpecialTheme(row, activeTheme);
    });
  }, [activeRegion, activeTheme, isSpecialSupervision, isUnitAnalysisMode, selectedMapArea]);

  const subjectRankings = useMemo(() => buildSubjectSummaries(filteredScoreRows, mapMetric).slice(0, 20), [filteredScoreRows, mapMetric]);

  const hoveredRankingSubject = useMemo(() => {
    if (!hoveredSubjectName) return null;
    return subjectRankings.find((subject) => subject.subjectName === hoveredSubjectName) || null;
  }, [hoveredSubjectName, subjectRankings]);

  const selectedSubjectSummary = useMemo(() => {
    if (!selectedSubject) return null;
    return buildSubjectSummaries(filteredScoreRows, '综合表现')[0] || null;
  }, [filteredScoreRows, selectedSubject]);

  const selectedSubjectThemes = useMemo(() => {
    if (!selectedSubject) return [];
    return Array.from(new Set(filteredScoreRows.map((row) => row.monitorTheme)));
  }, [filteredScoreRows, selectedSubject]);

	  const visibleThemes = useMemo(() => {
    if (!filteredScoreRows.length) {
      return themePostures
        .filter((theme) => monitorCategory === '全部' || theme.monitorCategory === monitorCategory)
        .filter((theme) => !activeTheme || theme.monitorTheme === activeTheme)
        .sort((a, b) => a.averageScore - b.averageScore);
    }

    const grouped = filteredScoreRows.reduce<Record<string, SubjectThemeScore[]>>((acc, row) => {
      acc[row.monitorTheme] = acc[row.monitorTheme] || [];
      acc[row.monitorTheme].push(row);
      return acc;
    }, {});

    return Object.values(grouped)
      .map((rows) => {
        const first = rows[0];
        const averageScore = rows.reduce((sum, row) => sum + row.themeScore, 0) / rows.length;
        const lowIndicators = rows.flatMap((row) => row.lowScoreIndicators);
        const abnormalCount = rows.reduce((sum, row) => sum + row.abnormalCount, 0);
        const abnormalTotalCount = Math.round(abnormalCount / 0.08);
        const abnormalRate = Math.round((abnormalCount / abnormalTotalCount) * 10000) / 100;
        const reviewRejectCount = Math.round(abnormalCount * 0.08);
        const reviewSubmitCount = Math.round(reviewRejectCount / 0.089);
        const reviewRejectRate = Math.round((reviewRejectCount / reviewSubmitCount) * 10000) / 100;
        const closedLoopRate = rows.reduce((sum, row) => sum + row.closedLoopRate, 0) / rows.length;
        const closedLoopCount = Math.round(abnormalCount * closedLoopRate / 100);
        const shouldClosedCount = abnormalCount;
        return {
          monitorCategory: first.monitorCategory,
          monitorTheme: first.monitorTheme,
          averageScore,
          riskLevel: riskByScore(averageScore),
          highRiskSubjects: uniqueCount(rows.filter((row) => row.riskLevel === '高风险' || row.riskLevel === '较高风险').map((row) => row.subjectName)),
          lowScoreIndicators: uniqueCount(lowIndicators),
          abnormalCount,
          abnormalTotalCount,
          abnormalRate,
          reviewRejectCount,
          reviewSubmitCount,
          reviewRejectRate,
          closedLoopRate,
          closedLoopCount,
          shouldClosedCount,
          interceptCount: rows.reduce((sum, row) => sum + row.interceptCount, 0),
          mainDeductionReason: first.mainDeductionReason || lowIndicators.slice(0, 2).join('、'),
        };
      })
	      .sort((a, b) => a.averageScore - b.averageScore);
	  }, [activeTheme, filteredScoreRows, monitorCategory]);

	  const attentionSubjects = useMemo(() => buildAttentionSubjects(filteredScoreRows), [filteredScoreRows]);
	  const attentionRegions = useMemo(() => buildAttentionRegions(filteredScoreRows), [filteredScoreRows]);
	  const attentionThemes = useMemo(() => buildAttentionThemes(filteredScoreRows), [filteredScoreRows]);
	  const specialAttentionRegions = useMemo(() => buildSpecialAttentionRegions(specialFilteredIssueRows), [specialFilteredIssueRows]);
	  const specialAttentionThemes = useMemo(() => buildSpecialAttentionThemes(specialFilteredIssueRows), [specialFilteredIssueRows]);
	  const specialIssueDetailRows = useMemo(() => buildSpecialIssueDetails(specialFilteredIssueRows), [specialFilteredIssueRows]);
	  const mapRegionScores = useMemo(() => buildMapRegionScores(attentionRegions), [attentionRegions]);
	  const specialMapRegionScores = useMemo(() => buildSpecialMapRegionScores(specialAttentionRegions), [specialAttentionRegions]);
	  const visibleAttentionRegions = useMemo(() => attentionRegions.filter((item) => item.attentionLevel !== '低关注').slice(0, 8), [attentionRegions]);
	  const visibleAttentionSubjects = useMemo(() => attentionSubjects.filter((item) => item.attentionLevel !== '低关注').slice(0, 8), [attentionSubjects]);
	  const visibleAttentionThemes = useMemo(() => attentionThemes.filter((item) => item.attentionLevel !== '低关注').slice(0, 8), [attentionThemes]);
	  const visibleSpecialRegions = useMemo(() => {
	    const concernRows = specialAttentionRegions.filter((item) => item.attentionLevel !== '低关注');
	    return (concernRows.length ? concernRows : specialAttentionRegions).slice(0, 8);
	  }, [specialAttentionRegions]);
	  const visibleSpecialThemes = useMemo(() => {
	    const concernRows = specialAttentionThemes.filter((item) => item.attentionLevel !== '低关注');
	    return (concernRows.length ? concernRows : specialAttentionThemes).slice(0, 8);
	  }, [specialAttentionThemes]);
	  const currentLevelRegionName = activeRegion && activeRegion !== '省本级' ? activeRegion : '省本级';
	  const currentLevelRegion = useMemo(() => {
	    return attentionRegions.find((item) => item.regionName === currentLevelRegionName)
	      || attentionRegions.find((item) => item.regionName === '省本级')
	      || attentionRegions[0]
	      || null;
	  }, [attentionRegions, currentLevelRegionName]);
	  const currentLevelMetricSummary = useMemo(() => {
	    return currentLevelRegion ? getAttentionRegionMetricSummary(currentLevelRegion, mapMetric) : null;
	  }, [currentLevelRegion, mapMetric]);
	  const currentLevelSpecialRegion = useMemo(() => {
	    return specialAttentionRegions.find((item) => item.regionName === currentLevelRegionName)
	      || specialAttentionRegions.find((item) => item.regionName === '省本级')
	      || specialAttentionRegions[0]
	      || null;
	  }, [currentLevelRegionName, specialAttentionRegions]);
	  const currentLevelSpecialMetricSummary = useMemo(() => {
	    return currentLevelSpecialRegion ? getSpecialRegionMetricSummary(currentLevelSpecialRegion, mapMetric) : null;
	  }, [currentLevelSpecialRegion, mapMetric]);
	  const unitAttentionSubjects = useMemo(() => attentionSubjects.slice(0, 6), [attentionSubjects]);
	  const unitAttentionThemes = useMemo(() => attentionThemes.slice(0, 4), [attentionThemes]);

	  const visibleEvidences = useMemo(() => {
    return indicatorEvidences
      .filter((item) => !activeTheme || item.monitorTheme === activeTheme)
      .filter((item) => !selectedSubject || selectedSubjectThemes.includes(item.monitorTheme))
      .filter((item) => !selectedIndicator || item.indicatorName === selectedIndicator)
      .sort((a, b) => a.score - b.score);
  }, [activeTheme, selectedIndicator, selectedSubject, selectedSubjectThemes]);

  const visibleAbnormalDetails = useMemo(() => {
    const regionScope = selectedMapArea || activeRegion;
    const sourceRows = selectedMapArea && activeRegion && !abnormalDetails.some((item) => item.regionName === selectedMapArea)
      ? buildCountyAbnormalDetails(activeRegion, selectedMapArea)
      : abnormalDetails;

    return sourceRows.filter((item) => (
      (!regionScope || item.regionName === regionScope) &&
      (!activeTheme || item.monitorTheme === activeTheme) &&
      (!selectedSubject || item.subjectName === selectedSubject)
    ));
  }, [activeRegion, activeTheme, selectedMapArea, selectedSubject]);

  const visibleRuleIntercepts = useMemo(() => {
    return ruleIntercepts
      .filter((item) => !activeTheme || item.monitorTheme === activeTheme)
      .filter((item) => !selectedSubject || selectedSubjectThemes.includes(item.monitorTheme));
  }, [activeTheme, selectedSubject, selectedSubjectThemes]);

  const clueConversionRows = useMemo<ClueConversionSummary[]>(() => {
    return filteredScoreRows.map((row) => {
      const warningCount = row.abnormalCount;
      const verifiedClueCount = Math.round(warningCount * 0.76);
      const confirmedIssueCount = getMockConfirmedIssueCount(warningCount);
      return {
        key: `${row.regionName}-${row.monitorTheme}-${row.subjectName}`,
        monitorTheme: row.monitorTheme,
        regionName: row.regionName,
        warningCount,
        verifiedClueCount,
        confirmedIssueCount,
        conversionRate: getRatioPercent(confirmedIssueCount, verifiedClueCount, 1),
        mainRule: `${row.monitorTheme}${row.lowScoreIndicators[0] || '监控'}规则`,
      };
    }).sort((a, b) => (
      b.confirmedIssueCount - a.confirmedIssueCount ||
      b.warningCount - a.warningCount
    )).slice(0, 10);
  }, [filteredScoreRows]);

  const availableMapMetrics = isSpecialSupervision ? specialMapMetrics : activeTheme ? mapMetricsSpecificTheme : mapMetricsAllThemes;

  useEffect(() => {
    if (!availableMapMetrics.includes(mapMetric)) {
      setMapMetric(availableMapMetrics[0]);
    }
  }, [availableMapMetrics, mapMetric]);

	  const currentAreaText = useMemo(() => {
	    if (isUnitAnalysisMode) {
	      if (selectedMapArea && activeRegion) return `${activeRegion} / ${selectedMapArea}本级`;
	      if (activeRegion === '省本级') return '省本级';
	      if (activeRegion) return `${activeRegion}本级`;
	      return '本级';
	    }
	    return selectedMapArea && activeRegion && selectedMapArea !== activeRegion ? `${activeRegion} / ${selectedMapArea}` : activeRegion || '全省';
	  }, [activeRegion, isUnitAnalysisMode, selectedMapArea]);

	  const metrics = useMemo<MetricCard[]>(() => {
	    const rows = filteredScoreRows;
	    const warningCount = rows.reduce((sum, row) => sum + row.abnormalCount, 0);
	    const confirmedIssueCount = attentionRegions.reduce((sum, region) => sum + region.confirmedIssueCount, 0);
	    const problemAmount = attentionRegions.reduce((sum, region) => sum + region.problemAmount, 0);
	    const formedCaseCount = buildFormedCaseRecords(rows).length;
	    const themeAverageScore = rows.length ? rows.reduce((sum, row) => sum + row.themeScore, 0) / rows.length : 0;
	    const lowRegionCount = activeTheme
	      ? attentionRegions.filter((region) => region.averageScore < 70 || region.lowThemeCount > 0).length
	      : attentionRegions.filter((region) => region.attentionLevel === '高关注').length;
	    const highAttentionThemeCount = attentionThemes.filter((theme) => theme.attentionLevel === '高关注').length;

	    if (isSpecialSupervision) {
	      const specialIssueCount = specialFilteredIssueRows.reduce((sum, row) => sum + row.issueCount, 0);
	      const specialIssueAmount = Number(specialFilteredIssueRows.reduce((sum, row) => sum + row.issueAmount, 0).toFixed(1));
	      const specialUnclosedCount = specialFilteredIssueRows.reduce((sum, row) => sum + row.unclosedCount, 0);
	      const specialOverdueCount = specialFilteredIssueRows.reduce((sum, row) => sum + row.overdueCount, 0);
	      const specialCaseCount = specialFilteredIssueRows.reduce((sum, row) => sum + row.caseCount, 0);
	      const concernRegionCount = specialAttentionRegions.filter((region) => region.attentionLevel !== '低关注').length;
	      const specialScopeText = activeTheme || '全部专项主题';

	      return [
	        {
	          title: '需关注区划',
	          value: specialFilteredIssueRows.length ? concernRegionCount : '--',
	          unit: '个',
	          emphasis: 'risk',
	          description: '按问题数量、问题金额、未销号、超期、退回、督办和案例沉淀识别需关注区划。',
	          aiConclusion: '优先查看未销号、超期和退回问题较集中的区划。',
	          hoverExplanation: {
	            calculationFormula: '按专项问题整改闭环相关字段综合识别关注区划',
	            additionalInfo: '不使用复杂综合分对外解释，仅作为静态原型分层和排序口径。',
	            scope: `${currentAreaText} / 专项监督 / ${specialScopeText}`,
	          },
	        },
	        {
	          title: '问题总数',
	          value: specialFilteredIssueRows.length ? specialIssueCount.toLocaleString('zh-CN') : '--',
	          unit: '条',
	          emphasis: 'evidence',
	          description: '当前统计时间和专项主题范围内的问题台账数量。',
	          aiConclusion: '用于判断专项整改工作量，不直接代表整改质量。',
	          hoverExplanation: {
	            calculationFormula: '按当前专项问题台账数量汇总',
	            additionalInfo: '问题总数与问题金额、未销号和超期拆开展示。',
	            scope: `${currentAreaText} / 专项监督 / ${specialScopeText}`,
	          },
	        },
	        {
	          title: '问题金额',
	          value: specialFilteredIssueRows.length ? formatWanNumber(specialIssueAmount) : '--',
	          unit: specialFilteredIssueRows.length ? '万元' : '',
	          emphasis: 'rate',
	          description: '当前专项问题涉及金额合计。',
	          aiConclusion: '金额用于判断问题影响规模，需结合未销号和超期继续看。',
	          hoverExplanation: {
	            calculationFormula: '按专项问题涉及金额汇总',
	            additionalInfo: '金额大不等于整改慢，因此与过程指标拆开展示。',
	            scope: `${currentAreaText} / 专项监督 / ${specialScopeText}`,
	          },
	        },
	        {
	          title: '未销号问题',
	          value: specialFilteredIssueRows.length ? specialUnclosedCount.toLocaleString('zh-CN') : '--',
	          unit: '条',
	          emphasis: 'closure',
	          description: '未整改、整改中、已提交、审核中、已退回等尚未完成销号的问题。',
	          aiConclusion: '反映专项整改闭环压力，是专项监督首要过程指标。',
	          hoverExplanation: {
	            calculationFormula: '未销号问题 = 未整改 + 整改中 + 已提交 + 审核中 + 已退回',
	            additionalInfo: '销号完成情况在底部整改状态页签继续展开。',
	            scope: `${currentAreaText} / 专项监督 / ${specialScopeText}`,
	          },
	        },
	        {
	          title: '超期问题',
	          value: specialFilteredIssueRows.length ? specialOverdueCount.toLocaleString('zh-CN') : '--',
	          unit: '条',
	          emphasis: 'risk',
	          description: '已超过整改期限但尚未完成销号的问题。',
	          aiConclusion: '用于识别整改时限风险，需结合督办和退回情况查看。',
	          hoverExplanation: {
	            calculationFormula: '按超过整改期限且尚未销号的问题数量汇总',
	            additionalInfo: '超期明细在底部“超期问题”页签承接。',
	            scope: `${currentAreaText} / 专项监督 / ${specialScopeText}`,
	          },
	        },
	        {
	          title: '案例沉淀',
	          value: specialFilteredIssueRows.length ? specialCaseCount.toLocaleString('zh-CN') : '--',
	          unit: '个',
	          emphasis: 'closure',
	          description: '已进入案例库或已形成典型案例的专项整改成果数量。',
	          aiConclusion: '体现问题整改后的成果沉淀，不作为风险扣分项。',
	          hoverExplanation: {
	            calculationFormula: '统计已入库或已审核通过的专项整改案例数量',
	            additionalInfo: '问题较多但案例较少仅作为分析提示，不直接定性。',
	            scope: `${currentAreaText} / 专项监督 / ${specialScopeText}`,
	          },
	        },
	      ];
	    }

	    if (activeTheme) {
	      return [
	        {
	          title: '平均分',
	          value: rows.length ? formatScore(themeAverageScore) : '--',
	          unit: '分',
	          emphasis: 'score',
	          description: '同一主题、同一评价体系下各区划平均得分。',
	          aiConclusion: '单主题口径下可以进行区划横向比较。',
	          hoverExplanation: {
	            calculationFormula: '平均分 = 当前主题下各区划评价得分平均值',
	            additionalInfo: '仅在选择具体监督主题后展示，不作为跨主题综合评分。',
	            scope: `${currentAreaText} / ${supervisionCategory} / ${activeTheme}`,
	          },
	        },
	        {
	          title: '低分区划数',
	          value: rows.length ? lowRegionCount : '--',
	          unit: '个',
	          emphasis: 'risk',
	          description: '当前主题下低于阈值或命中关注条件的区划数量。',
	          aiConclusion: '优先查看低分指标较多或确认问题较多的区划。',
	          hoverExplanation: {
	            calculationFormula: '按主题得分、低分指标数、确认问题和预警疑点综合识别',
	            additionalInfo: '该指标只在同一主题评价体系下比较区划表现。',
	            scope: `${currentAreaText} / ${activeTheme}`,
	          },
	        },
	        {
	          title: '预警疑点数量',
	          value: rows.length ? warningCount.toLocaleString('zh-CN') : '--',
	          unit: '条',
	          emphasis: 'evidence',
	          description: '当前主题下日常监督规则发现的预警疑点数量。',
	          aiConclusion: '预警疑点是发现端线索，不等同于确认问题。',
	          hoverExplanation: {
	            calculationFormula: '按当前主题下规则识别疑点条数汇总',
	            additionalInfo: '核实完成率、确认转化情况下沉到底部明细分析。',
	            scope: `${currentAreaText} / ${activeTheme}`,
	          },
	        },
	        {
	          title: '确认问题数量',
	          value: rows.length ? confirmedIssueCount.toLocaleString('zh-CN') : '--',
	          unit: '个',
	          emphasis: 'closure',
	          description: '当前主题下经核实确认的真实问题数量。',
	          aiConclusion: '用于判断问题发生频次，与问题金额拆开展示。',
	          hoverExplanation: {
	            calculationFormula: '按疑点核实后确认的问题数汇总',
	            additionalInfo: '当前为静态原型展示口径。',
	            scope: `${currentAreaText} / ${activeTheme}`,
	          },
	        },
	        {
	          title: '确认问题金额',
	          value: rows.length ? formatWanNumber(problemAmount) : '--',
	          unit: rows.length ? '万元' : '',
	          emphasis: 'rate',
	          description: '当前主题下确认问题涉及的资金影响规模。',
	          aiConclusion: '金额规模用于补充判断问题影响，不与问题数量混合。',
	          hoverExplanation: {
	            calculationFormula: '按确认问题涉及金额汇总',
	            additionalInfo: '数量多不一定金额大，因此单独成卡。',
	            scope: `${currentAreaText} / ${activeTheme}`,
	          },
	        },
	        {
	          title: '案例沉淀数',
	          value: rows.length ? formedCaseCount : '--',
	          unit: rows.length ? '个' : '',
	          emphasis: 'closure',
	          description: '当前主题下已入库或已审核通过的案例沉淀数量。',
	          aiConclusion: '用于观察发现线索、确认问题是否沉淀为可复用成果。',
	          hoverExplanation: {
	            calculationFormula: '统计已入库、已发布、已审核待发布的案例成果数量',
	            additionalInfo: '案例沉淀是成果指标，不参与综合表现分计算。',
	            scope: `${currentAreaText} / ${activeTheme}`,
	          },
	        },
	      ];
	    }

	    return [
	      {
	        title: '高关注区划数',
	        value: rows.length ? lowRegionCount : '--',
	        unit: '个',
	        emphasis: 'risk',
	        description: '当前口径下进入重点关注档的省本级或下级区划数量。',
	        aiConclusion: '优先查看确认问题金额大、问题数量多或评价表现偏弱的区划。',
	        hoverExplanation: {
	          calculationFormula: '综合表现分 < 60 分的区划数量',
	          additionalInfo: '综合表现分为静态原型展示口径，用于分层、颜色和排序。',
	          scope: `${currentAreaText} / ${supervisionCategory} / ${activeTheme || '全部日常主题'}`,
	        },
	      },
	      {
	        title: '高关注主题数',
	        value: rows.length ? highAttentionThemeCount : '--',
	        unit: '个',
	        emphasis: 'risk',
	        description: '当前范围内平均分偏低、低分区划或问题证据集中的主题数量。',
	        aiConclusion: '优先查看平均分低、中位分低、低分区划多或确认问题金额较大的主题。',
	        hoverExplanation: {
	          calculationFormula: '按平均分、中位分、低分区划、预警疑点、确认问题和确认金额识别高关注主题',
	          additionalInfo: '主题侧不展示综合表现分，优先使用评分分布和问题证据辅助研判。',
	          scope: `${currentAreaText} / ${supervisionCategory}`,
	        },
	      },
	      {
	        title: '预警疑点数量',
	        value: rows.length ? warningCount.toLocaleString('zh-CN') : '--',
	        unit: '条',
	        emphasis: 'evidence',
	        description: '当前日常监督规则识别出的预警疑点数量。',
	        aiConclusion: '预警疑点体现发现端规模，不等同于确认问题。',
	        hoverExplanation: {
	          calculationFormula: '按日常监督规则识别疑点条数汇总',
	          additionalInfo: '疑点是发现端线索，确认转化和来源链路放到底部明细分析。',
	          scope: `${currentAreaText} / ${supervisionCategory}`,
	        },
	      },
	      {
	        title: '确认问题数量',
	        value: rows.length ? confirmedIssueCount.toLocaleString('zh-CN') : '--',
	        unit: '个',
	        emphasis: 'closure',
	        description: '当前统计周期内经核实确认的真实问题数量。',
	        aiConclusion: '问题数量用于判断发生频次，和问题金额拆开展示。',
	        hoverExplanation: {
	          calculationFormula: '按疑点核实后确认的问题数汇总',
	          additionalInfo: '当前为静态原型展示口径。',
	          scope: `${currentAreaText} / ${supervisionCategory} / ${activeTheme || '全部日常主题'}`,
	        },
	      },
	      {
	        title: '确认问题金额',
	        value: rows.length ? formatWanNumber(problemAmount) : '--',
	        unit: rows.length ? '万元' : '',
	        emphasis: 'rate',
	        description: '当前统计周期内确认问题涉及金额。',
	        aiConclusion: '资金影响规模单独展示，避免与问题数量混合解释。',
	        hoverExplanation: {
	          calculationFormula: '按确认问题涉及金额汇总',
	          additionalInfo: '问题数量少也可能金额大，因此作为独立顶部卡片。',
	          scope: `${currentAreaText} / ${supervisionCategory}`,
	        },
	      },
	      {
	        title: '案例沉淀数',
	        value: rows.length ? formedCaseCount : '--',
	        unit: rows.length ? '个' : '',
	        emphasis: 'closure',
	        description: '当前范围内已入库或已审核通过的案例沉淀数量。',
	        aiConclusion: '补齐“发现线索 -> 确认问题 -> 形成案例”的成果链路。',
	        hoverExplanation: {
	          calculationFormula: '统计已入库、已发布、已审核待发布的案例成果数量',
	          additionalInfo: '案例沉淀不参与综合表现分计算，不代表风险扣分。',
	          scope: `${currentAreaText} / ${supervisionCategory}`,
	        },
	      },
	    ];
	  }, [activeTheme, attentionRegions, attentionThemes, currentAreaText, filteredScoreRows, isSpecialSupervision, specialAttentionRegions, specialFilteredIssueRows, supervisionCategory, visibleAttentionRegions.length]);

	  const currentScopeAreaText = currentAreaText === '全省' ? '湖南省' : currentAreaText;
	  const currentTimeText = timeRange === '自定义' ? `${formatDateDisplay(customStart)} 至 ${formatDateDisplay(customEnd)}` : timeRange;
	  const allThemeText = isSpecialSupervision ? '全部专项主题' : '全部日常主题';
	  const currentPositionText = `当前统计口径：${currentTimeText}｜${currentScopeAreaText}｜${supervisionCategory}｜${activeTheme || allThemeText}｜数据更新时间：${DATA_UPDATED_AT}`;
	  const isSubjectFocus = Boolean(selectedSubjectSummary);
	  const mapLayerText = isSubjectFocus ? '区划关注摘要' : activeMapRegion ? '市本级 + 各区县' : '省本级 + 各市州';
	  const mapSelectedText = currentAreaText === '全省' ? '湖南省全辖' : currentAreaText;
	  const mapPanelNote = isUnitAnalysisMode
	    ? `当前区划：${mapSelectedText}｜展示对象：本级单位 / 部门｜不展示下级区划地图`
	    : isSpecialSupervision
	      ? `当前区划：${mapSelectedText}｜展示对象：${mapLayerText}｜当前维度：${mapMetric}`
	      : `当前区划：${mapSelectedText}｜展示对象：${mapLayerText}｜当前维度：${mapMetric}`;
	  const mapPanelTitle = isUnitAnalysisMode ? '本级 / 单位分析' : isSubjectFocus ? '区划关注摘要' : isSpecialSupervision ? '区划整改分布' : '区划关注分布';
  const highlightedMapArea = selectedSubjectSummary?.regionName || selectedMapArea || null;
  const adminRegionOptions = useMemo(() => {
    return jurisdictionAdminRegionOptions;
  }, []);
  const selectedAdminRegionLabel = useMemo(() => {
    return adminRegionOptions.find((item) => item.value === adminRegion)?.label || adminRegion;
  }, [adminRegion, adminRegionOptions]);
  const selectedMonitorThemeLabel = monitorTheme === '全部'
    ? allThemeText
    : monitorTheme;
  const bottomWarningRows = useMemo(() => abnormalDetails.slice(0, 10).map((item, index) => ({
    clueCode: `YD-${String(202605000 + index + 1).slice(-7)}`,
    monitorTheme: item.monitorTheme,
    regionName: item.regionName,
    ruleName: item.ruleName,
    description: item.linkedIndicator,
    amount: item.amount,
    status: item.currentStatus,
    confirmed: index % 3 === 0 ? '是' : '否',
    triggerTime: item.triggerTime,
  })), []);
  const bottomIssueRows = useMemo(() => attentionRegions.filter((item) => item.confirmedIssueCount > 0).slice(0, 10).map((item, index) => ({
    issueCode: `WT-${String(202605000 + index + 1).slice(-7)}`,
    issueName: `${item.regionName}${item.lowThemes[0] || '日常监督'}确认问题`,
    monitorTheme: item.lowThemes[0] || '预算执行',
    regionName: item.regionName,
    issueType: item.problemAmount > 3000 ? '资金类' : '管理类',
    source: `YD-${String(202605000 + index + 1).slice(-7)}`,
    amount: item.problemAmountText,
    caseFlag: item.caseCount > 0 ? '是' : '否',
    confirmedAt: `2026-05-${String(10 + index).padStart(2, '0')}`,
    relatedRule: buildHighFrequencyRules()[index % buildHighFrequencyRules().length]?.ruleName || '规则待补充',
  })), [attentionRegions]);
  const bottomCaseRows = useMemo(() => buildFormedCaseRecords(filteredScoreRows).slice(0, 10), [filteredScoreRows]);
  const specialProblemDistributionRows = useMemo(() => specialAttentionThemes.slice(0, 10).map((item) => ({
    themeCategory: item.themeCategory,
    monitorTheme: item.monitorTheme,
    issueCount: `${item.issueCount}条`,
    issueAmount: item.issueAmountText,
    coverageRegionCount: `${item.coverageRegionCount}个`,
    unclosedCount: `${item.unclosedCount}条`,
    overdueCount: `${item.overdueCount}条`,
    caseCount: `${item.caseCount}个`,
    reason: item.reason,
  })), [specialAttentionThemes]);
  const specialRectificationStatusRows = useMemo(() => specialAttentionRegions.slice(0, 10).map((item) => ({
    regionName: item.regionName,
    issueCount: `${item.issueCount}条`,
    notStartedCount: `${item.notStartedCount}条`,
    inProgressCount: `${item.inProgressCount}条`,
    submittedCount: `${item.submittedCount}条`,
    reviewCount: `${item.reviewCount}条`,
    returnedCount: `${item.returnedCount}条`,
    closedCount: `${item.closedCount}条`,
    closedRate: formatPercent(item.closedRate),
  })), [specialAttentionRegions]);
  const specialVisualData = useMemo(() => {
    const maxThemeIssues = Math.max(1, ...specialAttentionThemes.map((item) => item.issueCount));
    const maxRegionIssues = Math.max(1, ...specialAttentionRegions.map((item) => item.issueCount));
    const maxOverdue = Math.max(1, ...specialAttentionRegions.map((item) => item.overdueCount));
    const maxReturned = Math.max(1, ...specialFilteredIssueRows.map((item) => item.returnedCount));
    const maxSupervised = Math.max(1, ...specialAttentionRegions.map((item) => item.supervisedCount));
    const maxCases = Math.max(1, ...specialAttentionThemes.map((item) => item.caseCount));
    const categoryRows = Object.values(specialFilteredIssueRows.reduce<Record<string, { label: string; issueCount: number; amount: number }>>((acc, item) => {
      acc[item.themeCategory] = acc[item.themeCategory] || { label: item.themeCategory, issueCount: 0, amount: 0 };
      acc[item.themeCategory].issueCount += item.issueCount;
      acc[item.themeCategory].amount += item.issueAmount;
      return acc;
    }, {})).sort((a, b) => b.issueCount - a.issueCount);
    const maxCategoryIssues = Math.max(1, ...categoryRows.map((item) => item.issueCount));
    const returnReasonRows = Object.values(specialFilteredIssueRows.reduce<Record<string, { label: string; value: number }>>((acc, item) => {
      if (!item.returnedCount) return acc;
      acc[item.returnReason] = acc[item.returnReason] || { label: item.returnReason, value: 0 };
      acc[item.returnReason].value += item.returnedCount;
      return acc;
    }, {})).sort((a, b) => b.value - a.value);
    const maxReturnReason = Math.max(1, ...returnReasonRows.map((item) => item.value));

    return {
      themeRows: specialAttentionThemes.slice(0, 5).map((item) => ({
        label: item.monitorTheme,
        meta: `${item.themeCategory}｜金额 ${item.issueAmountText}`,
        value: item.issueCount,
        subValue: `${item.unclosedCount}条未销号`,
        percent: Math.round((item.issueCount / maxThemeIssues) * 100),
      })),
      categoryRows: categoryRows.map((item) => ({
        ...item,
        amountText: formatWanAmount(item.amount),
        percent: Math.round((item.issueCount / maxCategoryIssues) * 100),
      })),
      statusRows: specialAttentionRegions.slice(0, 5).map((item) => {
        const total = Math.max(item.issueCount, 1);
        return {
          label: item.regionName,
          closedRate: formatPercent(item.closedRate),
          parts: [
            { label: '未整改', value: item.notStartedCount, tone: 'pending' },
            { label: '整改中', value: item.inProgressCount, tone: 'progress' },
            { label: '已提交/审核', value: item.submittedCount + item.reviewCount, tone: 'review' },
            { label: '已退回', value: item.returnedCount, tone: 'returned' },
            { label: '已销号', value: item.closedCount, tone: 'closed' },
          ].map((part) => ({ ...part, percent: Math.max(4, Math.round((part.value / total) * 100)) })),
        };
      }),
      overdueRows: specialAttentionRegions.slice(0, 5).map((item) => ({
        label: item.regionName,
        value: item.overdueCount,
        meta: `未销号 ${item.unclosedCount}条｜督办 ${item.supervisedCount}条`,
        percent: Math.round((item.overdueCount / maxOverdue) * 100),
      })),
      returnedRows: specialFilteredIssueRows
        .filter((item) => item.returnedCount > 0)
        .sort((a, b) => b.returnedCount - a.returnedCount)
        .slice(0, 5)
        .map((item) => ({
          label: item.regionName,
          meta: `${item.monitorTheme}｜${item.returnReason}`,
          value: item.returnedCount,
          percent: Math.round((item.returnedCount / maxReturned) * 100),
        })),
      returnReasonRows: returnReasonRows.map((item) => ({
        ...item,
        percent: Math.round((item.value / maxReturnReason) * 100),
      })),
      supervisionRows: specialAttentionRegions.slice(0, 5).map((item) => ({
        label: item.regionName,
        value: item.supervisedCount,
        meta: `重复督办 ${item.repeatedSupervisedCount}条｜超期 ${item.overdueCount}条`,
        percent: Math.round((item.supervisedCount / maxSupervised) * 100),
      })),
      caseRows: specialAttentionThemes.slice(0, 5).map((item) => ({
        label: item.monitorTheme,
        value: item.caseCount,
        meta: `已销号 ${item.closedCount}条｜转化率 ${formatPercent(item.caseConversionRate)}`,
        percent: Math.round((item.caseCount / maxCases) * 100),
      })),
      issueCaseRows: specialAttentionThemes.slice(0, 5).map((item) => ({
        label: item.monitorTheme,
        issuePercent: Math.round((item.issueCount / maxThemeIssues) * 100),
        casePercent: Math.round((item.caseCount / maxCases) * 100),
        issueCount: item.issueCount,
        caseCount: item.caseCount,
      })),
      maxRegionIssues,
    };
  }, [specialAttentionRegions, specialAttentionThemes, specialFilteredIssueRows]);
	  const metricDrawerData = useMemo<Record<string, MetricDrawerInfo>>(() => {
	    const rows = filteredScoreRows;
	    const regionCount = uniqueCount(rows.map((row) => row.regionName));
	    const themeCount = uniqueCount(rows.map((row) => row.monitorTheme));
	    const warningCount = rows.reduce((sum, row) => sum + row.abnormalCount, 0);
	    const confirmedIssueCount = attentionRegions.reduce((sum, item) => sum + item.confirmedIssueCount, 0);
	    const problemAmount = attentionRegions.reduce((sum, item) => sum + item.problemAmount, 0);
	    const affectedRegionCount = attentionRegions.filter((item) => item.confirmedIssueCount > 0).length;
	    const affectedThemeCount = uniqueCount(rows.filter((row) => row.abnormalCount > 0).map((row) => row.monitorTheme));
	    const formedCaseRecords = buildFormedCaseRecords(rows);
	    const formedCaseCount = formedCaseRecords.length;
	    const typicalCaseCount = formedCaseRecords.filter((item) => item.isTypical === '是').length;
	    const formedCaseThemeCount = uniqueCount(formedCaseRecords.map((item) => item.monitorTheme));
	    const formedCaseRegionCount = uniqueCount(formedCaseRecords.map((item) => item.regionName));
	    const formedCaseUnitCount = uniqueCount(formedCaseRecords.map((item) => item.relatedUnit));
	    const isSingleAreaCaseScope = Boolean(selectedMapArea);
	    const formedCaseCoverageLabel = isSingleAreaCaseScope ? '涉及单位数' : '涉及区划数';
	    const formedCaseCoverageValue = `${isSingleAreaCaseScope ? formedCaseUnitCount : formedCaseRegionCount}个`;
	    const highAttentionRegions = attentionRegions.filter((item) => item.attentionLevel === '高关注');
	    const highAttentionThemes = attentionThemes.filter((item) => item.attentionLevel === '高关注');
	    const topRegions = attentionRegions.slice(0, 6).map((item) => ({
	      name: item.regionName,
	      meta: `${item.attentionLevel}｜综合表现 ${formatScore(item.comprehensiveScore)}分`,
	      value: `${formatScore(item.comprehensiveScore)}分`,
	      reason: item.reason,
	    }));
	    const topThemes = attentionThemes.slice(0, 6).map((item) => ({
	      name: item.monitorTheme,
	      meta: `${item.monitorCategory}｜${item.attentionLevel}`,
	      value: `${formatScore(item.comprehensiveScore)}分`,
	      reason: item.reason,
	    }));
	    const regionConcernRows = attentionRegions.slice(0, 10).map((item) => ({
	      regionName: item.regionName,
	      attentionLevel: item.attentionLevel,
	      comprehensiveScore: `${formatScore(item.comprehensiveScore)}分`,
	      evaluationScore: `${formatScore(item.evaluationScore)}分`,
	      amountScore: `${formatScore(item.problemAmountScore)}分`,
	      countScore: `${formatScore(item.problemCountScore)}分`,
	      warningScore: `${formatScore(item.warningScore)}分`,
	      lowThemes: `${item.lowThemeCount}/${item.totalThemeCount}`,
	      confirmedIssueCount: `${item.confirmedIssueCount}个`,
	      problemAmount: item.problemAmountText,
	      caseCount: `${item.caseCount}个`,
	      reason: item.reason,
	    }));
	    const themeConcernRows = attentionThemes.slice(0, 10).map((item) => ({
	      monitorTheme: item.monitorTheme,
	      attentionLevel: item.attentionLevel,
	      averageScore: `${formatScore(item.averageScore)}分`,
	      medianScore: `${formatScore(item.medianScore)}分`,
	      lowRegions: `${item.lowSubjectCount}/${item.coverageSubjectCount}`,
	      warningCount: `${item.warningCount}条`,
	      confirmedIssueCount: `${item.confirmedIssueCount}个`,
	      problemAmount: item.problemAmountText,
	      caseCount: `${item.caseCount}个`,
	      reason: item.reason,
	    }));
	    const warningRows = abnormalDetails.slice(0, 10).map((item, index) => ({
	      clueCode: `YD-${String(202605000 + index + 1).slice(-7)}`,
	      monitorTheme: item.monitorTheme,
	      regionName: item.regionName,
	      ruleName: item.ruleName,
	      description: item.linkedIndicator,
	      amount: item.amount,
	      status: item.currentStatus,
	      confirmed: index % 3 === 0 ? '是' : '否',
	      triggerTime: item.triggerTime,
	    }));
	    const issueRows = attentionRegions.filter((item) => item.confirmedIssueCount > 0).slice(0, 10).map((item, index) => ({
	      issueCode: `WT-${String(202605000 + index + 1).slice(-7)}`,
	      issueName: `${item.regionName}${item.lowThemes[0] || '日常监督'}确认问题`,
	      monitorTheme: item.lowThemes[0] || '预算执行',
	      regionName: item.regionName,
	      issueType: item.problemAmount > 3000 ? '资金类' : '管理类',
	      source: '预警核实',
	      amount: item.problemAmountText,
	      caseFlag: item.caseCount > 0 ? '是' : '否',
	      confirmedAt: `2026-05-${String(10 + index).padStart(2, '0')}`,
	    }));
	    const themeAverageScore = rows.length ? rows.reduce((sum, row) => sum + row.themeScore, 0) / rows.length : 0;
	    const lowRegionCount = attentionRegions.filter((region) => region.averageScore < 70 || region.lowThemeCount > 0).length;

	    if (isSpecialSupervision) {
	      const regionCountText = `${uniqueCount(specialFilteredIssueRows.map((row) => row.regionName))}个`;
	      const themeCountText = `${uniqueCount(specialFilteredIssueRows.map((row) => row.monitorTheme))}个`;
	      const specialIssueCount = specialFilteredIssueRows.reduce((sum, row) => sum + row.issueCount, 0);
	      const specialIssueAmount = Number(specialFilteredIssueRows.reduce((sum, row) => sum + row.issueAmount, 0).toFixed(1));
	      const specialUnclosedCount = specialFilteredIssueRows.reduce((sum, row) => sum + row.unclosedCount, 0);
	      const specialOverdueCount = specialFilteredIssueRows.reduce((sum, row) => sum + row.overdueCount, 0);
	      const specialReturnedCount = specialFilteredIssueRows.reduce((sum, row) => sum + row.returnedCount, 0);
	      const specialSupervisedCount = specialFilteredIssueRows.reduce((sum, row) => sum + row.supervisedCount, 0);
	      const specialCaseCount = specialFilteredIssueRows.reduce((sum, row) => sum + row.caseCount, 0);
	      const concernRegions = specialAttentionRegions.filter((item) => item.attentionLevel !== '低关注');
	      const specialRegionRows = specialAttentionRegions.slice(0, 10).map((item) => ({
	        regionName: item.regionName,
	        attentionLevel: item.attentionLevel,
	        issueCount: `${item.issueCount}条`,
	        issueAmount: item.issueAmountText,
	        unclosedCount: `${item.unclosedCount}条`,
	        overdueCount: `${item.overdueCount}条`,
	        returnedCount: `${item.returnedCount}条`,
	        supervisedCount: `${item.supervisedCount}条`,
	        caseCount: `${item.caseCount}个`,
	        mainThemes: item.mainThemes.join('、') || '--',
	        reason: item.reason,
	      }));
	      const specialThemeRows = specialAttentionThemes.slice(0, 10).map((item) => ({
	        themeCategory: item.themeCategory,
	        monitorTheme: item.monitorTheme,
	        coverageRegionCount: `${item.coverageRegionCount}个`,
	        issueCount: `${item.issueCount}条`,
	        issueAmount: item.issueAmountText,
	        unclosedCount: `${item.unclosedCount}条`,
	        overdueCount: `${item.overdueCount}条`,
	        returnedCount: `${item.returnedCount}条`,
	        caseCount: `${item.caseCount}个`,
	        reason: item.reason,
	      }));
	      const specialIssueRows = specialIssueDetailRows.slice(0, 10).map((item) => ({
	        issueCode: item.issueCode,
	        issueName: item.issueName,
	        monitorTheme: item.monitorTheme,
	        regionName: item.regionName,
	        responsibleUnit: item.responsibleUnit,
	        deadline: item.deadline,
	        currentStatus: item.currentStatus,
	        overdueDays: item.overdueDays,
	        issueAmount: item.issueAmount,
	        supervised: item.supervised,
	      }));
	      const specialOverdueRows = specialIssueDetailRows.filter((item) => item.overdueDays !== '-').slice(0, 10).map((item) => ({
	        regionName: item.regionName,
	        monitorTheme: item.monitorTheme,
	        issueName: item.issueName,
	        responsibleUnit: item.responsibleUnit,
	        deadline: item.deadline,
	        currentStatus: item.currentStatus,
	        overdueDays: item.overdueDays,
	        issueAmount: item.issueAmount,
	        supervised: item.supervised,
	      }));
	      const specialCaseRows = specialIssueDetailRows.filter((item) => item.caseStatus !== '未形成').slice(0, 10).map((item) => ({
	        regionName: item.regionName,
	        monitorTheme: item.monitorTheme,
	        issueName: item.issueName,
	        issueAmount: item.issueAmount,
	        typicalCaseName: item.typicalCaseName,
	        caseStatus: item.caseStatus,
	        closedFlag: item.closedFlag,
	      }));

	      const specialDrawerData: Record<string, MetricDrawerInfo> = {
	        需关注区划: {
	          drawerTitle: '需关注区划',
	          summary: '按问题数量、问题金额、未销号、超期、退回、督办和案例沉淀识别当前需要优先关注的区划。',
	          primary: {
	            label: '需关注区划',
	            value: `${concernRegions.length}个`,
	            badge: '专项整改',
	            formula: '按专项问题整改闭环相关字段识别关注区划，不展示复杂计算公式。',
	            source: '专项问题整改台账',
	            explanation: '用于判断当前层级下哪些区划需要优先跟进整改闭环。',
	          },
	          sections: [
	            {
	              title: '区划整改摘要',
	              stats: [
	                { label: '覆盖区划', value: regionCountText },
	                { label: '需关注区划', value: `${concernRegions.length}个` },
	                { label: '未销号问题', value: `${specialUnclosedCount}条` },
	                { label: '超期问题', value: `${specialOverdueCount}条` },
	              ],
	            },
	          ],
	          listTitle: '需关注区划明细',
	          listHint: '点击区划后进入对应全辖或本级专项问题分析口径。',
	          entries: [],
	          table: {
	            columns: [
	              { key: 'regionName', label: '区划名称' },
	              { key: 'attentionLevel', label: '关注等级' },
	              { key: 'issueCount', label: '问题总数' },
	              { key: 'issueAmount', label: '问题金额' },
	              { key: 'unclosedCount', label: '未销号' },
	              { key: 'overdueCount', label: '超期' },
	              { key: 'returnedCount', label: '退回' },
	              { key: 'supervisedCount', label: '督办' },
	              { key: 'caseCount', label: '案例' },
	              { key: 'mainThemes', label: '主要专项' },
	              { key: 'reason', label: '关注原因' },
	            ],
	            rows: specialRegionRows,
	          },
	        },
	        问题总数: {
	          drawerTitle: '问题总数',
	          summary: '问题总数体现当前专项监督范围内的问题台账规模。',
	          primary: {
	            label: '问题总数',
	            value: `${specialIssueCount.toLocaleString('zh-CN')}条`,
	            badge: '问题台账',
	            formula: '当前统计时间和专项主题范围内的问题台账数量汇总。',
	            source: '专项问题整改台账',
	            explanation: '问题总数用于判断整改工作量，不直接代表整改质量。',
	          },
	          sections: [
	            {
	              title: '问题规模摘要',
	              stats: [
	                { label: '覆盖区划', value: regionCountText },
	                { label: '涉及专项', value: themeCountText },
	                { label: '问题金额', value: formatWanAmount(specialIssueAmount) },
	                { label: '未销号问题', value: `${specialUnclosedCount}条` },
	              ],
	            },
	          ],
	          listTitle: '专项问题明细',
	          listHint: '按当前筛选口径展示专项问题样例，底部页签继续承接整改状态和过程分析。',
	          entries: [],
	          table: {
	            columns: [
	              { key: 'issueCode', label: '问题编号' },
	              { key: 'issueName', label: '问题名称' },
	              { key: 'monitorTheme', label: '专项主题' },
	              { key: 'regionName', label: '区划' },
	              { key: 'responsibleUnit', label: '责任单位' },
	              { key: 'deadline', label: '整改期限' },
	              { key: 'currentStatus', label: '当前状态' },
	              { key: 'issueAmount', label: '问题金额' },
	              { key: 'supervised', label: '是否督办' },
	            ],
	            rows: specialIssueRows,
	          },
	        },
	        问题金额: {
	          drawerTitle: '问题金额',
	          summary: '问题金额用于观察专项问题涉及资金规模，需结合问题数量和整改推进状态共同判断。',
	          primary: {
	            label: '问题金额',
	            value: formatWanAmount(specialIssueAmount),
	            badge: '资金影响',
	            formula: '按当前专项问题涉及金额汇总。',
	            source: '专项问题整改台账',
	            explanation: '金额规模较大时优先查看对应区划和专项主题。',
	          },
	          sections: [
	            {
	              title: '金额摘要',
	              stats: [
	                { label: '问题金额', value: formatWanAmount(specialIssueAmount) },
	                { label: '问题总数', value: `${specialIssueCount}条` },
	                { label: '涉及区划', value: regionCountText },
	                { label: '涉及专项', value: themeCountText },
	              ],
	            },
	          ],
	          listTitle: '专项主题金额明细',
	          listHint: '按专项主题汇总问题金额和整改闭环情况。',
	          entries: [],
	          table: {
	            columns: [
	              { key: 'themeCategory', label: '一级分类' },
	              { key: 'monitorTheme', label: '专项主题' },
	              { key: 'coverageRegionCount', label: '覆盖区划' },
	              { key: 'issueCount', label: '问题数量' },
	              { key: 'issueAmount', label: '问题金额' },
	              { key: 'unclosedCount', label: '未销号' },
	              { key: 'overdueCount', label: '超期' },
	              { key: 'returnedCount', label: '退回' },
	              { key: 'caseCount', label: '案例' },
	            ],
	            rows: specialThemeRows,
	          },
	        },
	        未销号问题: {
	          drawerTitle: '未销号问题',
	          summary: '未销号问题包含未整改、整改中、已提交、审核中、已退回等尚未闭环的问题。',
	          primary: {
	            label: '未销号问题',
	            value: `${specialUnclosedCount.toLocaleString('zh-CN')}条`,
	            badge: '整改闭环',
	            formula: '未销号问题 = 未整改 + 整改中 + 已提交 + 审核中 + 已退回。',
	            source: '专项问题整改状态',
	            explanation: '用于观察当前专项整改闭环压力。',
	          },
	          sections: [
	            {
	              title: '整改状态摘要',
	              stats: [
	                { label: '未销号问题', value: `${specialUnclosedCount}条` },
	                { label: '退回问题', value: `${specialReturnedCount}条` },
	                { label: '督办问题', value: `${specialSupervisedCount}条` },
	                { label: '超期问题', value: `${specialOverdueCount}条` },
	              ],
	            },
	          ],
	          listTitle: '区划整改状态明细',
	          listHint: '按区划查看未销号、已销号和销号率。',
	          entries: [],
	          table: {
	            columns: [
	              { key: 'regionName', label: '区划' },
	              { key: 'issueCount', label: '问题总数' },
	              { key: 'notStartedCount', label: '未整改' },
	              { key: 'inProgressCount', label: '整改中' },
	              { key: 'submittedCount', label: '已提交' },
	              { key: 'reviewCount', label: '审核中' },
	              { key: 'returnedCount', label: '已退回' },
	              { key: 'closedCount', label: '已销号' },
	              { key: 'closedRate', label: '销号率' },
	            ],
	            rows: specialRectificationStatusRows,
	          },
	        },
	        超期问题: {
	          drawerTitle: '超期问题',
	          summary: '超期问题用于识别已超过整改期限但尚未完成销号的整改事项。',
	          primary: {
	            label: '超期问题',
	            value: `${specialOverdueCount.toLocaleString('zh-CN')}条`,
	            badge: '时限风险',
	            formula: '按超过整改期限且尚未销号的问题数量汇总。',
	            source: '专项问题整改期限数据',
	            explanation: '超期问题需要结合督办、退回和责任单位继续跟进。',
	          },
	          sections: [
	            {
	              title: '超期摘要',
	              stats: [
	                { label: '超期问题', value: `${specialOverdueCount}条` },
	                { label: '未销号问题', value: `${specialUnclosedCount}条` },
	                { label: '督办问题', value: `${specialSupervisedCount}条` },
	                { label: '退回问题', value: `${specialReturnedCount}条` },
	              ],
	            },
	          ],
	          listTitle: '超期问题明细',
	          listHint: '展示超期问题的责任单位、期限、状态和督办情况。',
	          entries: [],
	          table: {
	            columns: [
	              { key: 'regionName', label: '区划' },
	              { key: 'monitorTheme', label: '专项主题' },
	              { key: 'issueName', label: '问题名称' },
	              { key: 'responsibleUnit', label: '责任单位' },
	              { key: 'deadline', label: '整改期限' },
	              { key: 'currentStatus', label: '当前状态' },
	              { key: 'overdueDays', label: '超期天数' },
	              { key: 'issueAmount', label: '问题金额' },
	              { key: 'supervised', label: '是否督办' },
	            ],
	            rows: specialOverdueRows,
	          },
	        },
	        案例沉淀: {
	          drawerTitle: '案例沉淀',
	          summary: '案例沉淀体现专项问题整改后的成果转化，不参与风险扣分。',
	          primary: {
	            label: '案例沉淀',
	            value: `${specialCaseCount.toLocaleString('zh-CN')}个`,
	            badge: '成果指标',
	            formula: '统计已进入案例库或已审核通过的专项整改案例数量。',
	            source: '专项问题案例沉淀数据',
	            explanation: '问题较多但案例较少仅作为分析提示，需要结合问题性质和是否具备典型性判断。',
	          },
	          sections: [
	            {
	              title: '案例摘要',
	              stats: [
	                { label: '案例沉淀', value: `${specialCaseCount}个` },
	                { label: '已销号问题', value: `${specialFilteredIssueRows.reduce((sum, row) => sum + row.closedCount, 0)}条` },
	                { label: '涉及区划', value: regionCountText },
	                { label: '涉及专项', value: themeCountText },
	              ],
	            },
	          ],
	          listTitle: '案例沉淀明细',
	          listHint: '展示已形成案例的专项问题和案例状态。',
	          entries: [],
	          table: {
	            columns: [
	              { key: 'regionName', label: '区划' },
	              { key: 'monitorTheme', label: '专项主题' },
	              { key: 'issueName', label: '问题名称' },
	              { key: 'issueAmount', label: '问题金额' },
	              { key: 'closedFlag', label: '销号情况' },
	              { key: 'typicalCaseName', label: '典型案例名称' },
	              { key: 'caseStatus', label: '案例状态' },
	            ],
	            rows: specialCaseRows,
	          },
	        },
	      };
	      return specialDrawerData;
	    }

	    const dailyDrawerData: Record<string, MetricDrawerInfo> = {
	      高关注区划数: {
	        drawerTitle: '高关注区划数',
	        summary: '只统计综合表现分低于 60 分的区划；中关注区划仍在左侧列表展示，但不计入顶部主值。',
	        primary: {
	          label: '高关注区划',
	          value: `${highAttentionRegions.length}个`,
	          badge: '综合表现',
	          formula: '综合表现分 = 评价表现分×40% + 问题金额表现分×25% + 问题数量表现分×20% + 预警疑点表现分×15%；高关注为综合表现分 < 60。',
	          source: '日常监督区划关注数据',
	          explanation: '用于判断当前层级下哪些区划需要优先关注。',
	        },
	        sections: [
	          {
	            title: '区划关注口径',
	            stats: [
	              { label: '覆盖区划', value: `${regionCount}个` },
	              { label: '高关注区划', value: `${highAttentionRegions.length}个` },
	              { label: '高关注阈值', value: '< 60分' },
	              { label: '排序第一', value: attentionRegions[0]?.regionName || '--' },
	            ],
	          },
	        ],
	        listTitle: '区划关注明细',
	        listHint: '点击区划后切换到对应全辖或本级分析。',
	        entries: [],
	        table: {
	          columns: [
	            { key: 'regionName', label: '区划名称' },
	            { key: 'attentionLevel', label: '关注等级' },
	            { key: 'comprehensiveScore', label: '综合表现分' },
	            { key: 'evaluationScore', label: '评价表现分' },
	            { key: 'amountScore', label: '金额表现分' },
	            { key: 'countScore', label: '数量表现分' },
	            { key: 'warningScore', label: '疑点表现分' },
	            { key: 'lowThemes', label: '低分主题' },
	            { key: 'confirmedIssueCount', label: '确认问题' },
	            { key: 'problemAmount', label: '确认金额' },
	            { key: 'caseCount', label: '案例沉淀' },
	            { key: 'reason', label: '关注原因' },
	          ],
	          rows: regionConcernRows,
	        },
	      },
	      高关注主题数: {
	        drawerTitle: '高关注主题数',
	        summary: '统计平均分偏低、低分区划较多或问题证据集中的主题；中关注主题仍保留在右侧列表中辅助研判。',
	        primary: {
	          label: '高关注主题',
	          value: `${highAttentionThemes.length}个`,
	          badge: '主题评分',
	          formula: '主题关注按平均分、中位分、低分区划、预警疑点、确认问题和确认金额综合研判；主题侧不展示综合表现分。',
	          source: '日常监督主题关注数据',
	          explanation: '用于判断当前范围内哪些监督主题需要优先诊断。',
	        },
	        sections: [
	          {
	            title: '主题关注口径',
	            stats: [
	              { label: '覆盖主题', value: `${themeCount}个` },
	              { label: '高关注主题', value: `${highAttentionThemes.length}个` },
	              { label: '排序口径', value: '平均分优先' },
	              { label: '排序第一', value: attentionThemes[0]?.monitorTheme || '--' },
	            ],
	          },
	        ],
	        listTitle: '主题关注明细',
	        listHint: '点击主题后切换监督主题筛选。',
	        entries: [],
	        table: {
	          columns: [
	            { key: 'monitorTheme', label: '主题名称' },
	            { key: 'attentionLevel', label: '关注等级' },
	            { key: 'averageScore', label: '平均分' },
	            { key: 'medianScore', label: '中位分' },
	            { key: 'lowRegions', label: '低分区划' },
	            { key: 'warningCount', label: '预警疑点' },
	            { key: 'confirmedIssueCount', label: '确认问题' },
	            { key: 'problemAmount', label: '确认金额' },
	            { key: 'caseCount', label: '案例沉淀' },
	            { key: 'reason', label: '关注原因' },
	          ],
	          rows: themeConcernRows,
	        },
	      },
	      平均分: {
	        drawerTitle: '平均分',
	        summary: '选择具体主题后，各区划处于同一评价体系下，可以展示平均分。',
	        primary: {
	          label: '平均分',
	          value: rows.length ? `${formatScore(themeAverageScore)}分` : '--',
	          badge: activeTheme || '单主题',
	          formula: '当前主题下各区划评价得分平均值',
	          source: '主题评价数据',
	          explanation: '仅在同一主题、同一统计周期下比较区划得分。',
	        },
	        sections: [
	          {
	            title: '主题得分构成',
	            stats: [
	              { label: '覆盖区划', value: `${regionCount}个` },
	              { label: '低分区划', value: `${lowRegionCount}个` },
	              { label: '预警疑点', value: `${warningCount}条` },
	              { label: '确认问题', value: `${confirmedIssueCount}个` },
	            ],
	          },
	        ],
	        listTitle: '区划得分明细',
	        listHint: '按当前主题下区划表现排序。',
	        entries: topRegions,
	      },
	      低分区划数: {
	        drawerTitle: '低分区划数',
	        summary: '低分区划数表示当前主题下需要优先关注的区划数量。',
	        primary: {
	          label: '低分区划',
	          value: `${lowRegionCount}个`,
	          badge: '主题得分',
	          formula: '当前主题下低于阈值或命中关注条件的区划数量',
	          source: '主题区划评分数据',
	          explanation: '该指标只在同一主题评价体系下使用。',
	        },
	        sections: [
	          {
	            title: '低分区划构成',
	            stats: [
	              { label: '覆盖区划', value: `${regionCount}个` },
	              { label: '低分区划', value: `${lowRegionCount}个` },
	              { label: '预警疑点', value: `${warningCount}条` },
	              { label: '确认问题金额', value: formatWanAmount(problemAmount) },
	            ],
	          },
	        ],
	        listTitle: '低分区划明细',
	        listHint: '点击区划后查看对应全辖或本级口径。',
	        entries: topRegions,
	      },
	      预警疑点数量: {
	        drawerTitle: '预警疑点数量',
	        summary: '预警疑点数量体现日常监督规则发现线索的数量，不代表已确认问题。',
	        primary: {
	          label: '预警疑点',
	          value: `${warningCount.toLocaleString('zh-CN')}条`,
	          badge: '发现端',
	          formula: '当前比较范围内规则识别出的疑点线索数量汇总；疑点表现分按当前范围最高疑点数相对折算。',
	          source: '预警疑点明细',
	          explanation: '疑点是发现端证据，是否确认为问题在明细中单独展示。',
	        },
	        sections: [
	          {
	            title: '疑点概览',
	            stats: [
	              { label: '预警疑点', value: `${warningCount.toLocaleString('zh-CN')}条` },
	              { label: '涉及区划', value: `${regionCount}个` },
	              { label: '涉及主题', value: `${themeCount}个` },
	              { label: '高频规则', value: `${buildHighFrequencyRules().length}条` },
	            ],
	          },
	        ],
	        listTitle: '预警疑点明细',
	        listHint: '疑点按生成时间倒序展示，可在底部继续追溯规则、问题和案例链路。',
	        entries: [],
	        table: {
	          columns: [
	            { key: 'clueCode', label: '疑点编号' },
	            { key: 'monitorTheme', label: '所属主题' },
	            { key: 'regionName', label: '所属区划' },
	            { key: 'ruleName', label: '规则名称' },
	            { key: 'description', label: '疑点描述' },
	            { key: 'amount', label: '涉及金额' },
	            { key: 'status', label: '疑点状态' },
	            { key: 'confirmed', label: '是否确认问题' },
	            { key: 'triggerTime', label: '生成时间' },
	          ],
	          rows: warningRows,
	        },
	      },
	      确认问题数量: {
	        drawerTitle: '确认问题数量',
	        summary: '确认问题数量用于体现经核实后的真实问题发生频次。',
	        primary: {
	          label: '确认问题',
	          value: `${confirmedIssueCount.toLocaleString('zh-CN')}个`,
	          badge: '确认结果',
	          formula: '当前比较范围内已核实确认的问题数量汇总；问题数量表现分按当前范围最高问题数相对折算。',
	          source: '确认问题数据',
	          explanation: '问题数量和问题金额拆开展示，避免解释混淆。',
	        },
	        sections: [
	          {
	            title: '确认概览',
	            stats: [
	              { label: '确认问题', value: `${confirmedIssueCount.toLocaleString('zh-CN')}个` },
	              { label: '涉及区划', value: `${affectedRegionCount}个` },
	              { label: '涉及主题', value: `${themeCount}个` },
	              { label: '预警疑点', value: `${warningCount.toLocaleString('zh-CN')}条` },
	            ],
	          },
	        ],
	        listTitle: '确认问题明细',
	        listHint: '确认问题按确认时间倒序展示，点击来源对象仍保持当前页面下钻规则。',
	        entries: [],
	        table: {
	          columns: [
	            { key: 'issueCode', label: '问题编号' },
	            { key: 'issueName', label: '问题名称' },
	            { key: 'monitorTheme', label: '所属主题' },
	            { key: 'regionName', label: '所属区划' },
	            { key: 'issueType', label: '问题类型' },
	            { key: 'source', label: '问题来源' },
	            { key: 'amount', label: '确认金额' },
	            { key: 'caseFlag', label: '是否形成案例' },
	            { key: 'confirmedAt', label: '确认时间' },
	          ],
	          rows: issueRows,
	        },
	      },
	      确认问题金额: {
	        drawerTitle: '确认问题金额',
	        summary: '确认问题金额用于体现已确认问题的资金影响规模。',
	        primary: {
	          label: '确认问题金额',
	          value: formatWanAmount(problemAmount),
	          badge: '资金影响',
	          formula: '当前比较范围内确认问题涉及金额汇总；问题金额表现分按当前范围最高确认金额相对折算。',
	          source: '确认问题金额数据',
	          explanation: '问题数量多不一定金额大，因此金额独立展示。',
	        },
	        sections: [
	          {
	            title: '金额概览',
	            stats: [
	              { label: '确认问题金额', value: formatWanAmount(problemAmount) },
	              { label: '确认问题', value: `${confirmedIssueCount}个` },
	              { label: '涉及区划', value: `${affectedRegionCount}个` },
	              { label: '涉及主题', value: `${affectedThemeCount}个` },
	            ],
	          },
	        ],
	        listTitle: '确认问题金额明细',
	        listHint: '按确认金额降序展示，金额用于判断影响规模，不与问题数量混合解释。',
	        entries: [],
	        table: {
	          columns: [
	            { key: 'issueCode', label: '问题编号' },
	            { key: 'issueName', label: '问题名称' },
	            { key: 'monitorTheme', label: '所属主题' },
	            { key: 'regionName', label: '所属区划' },
	            { key: 'issueType', label: '问题类型' },
	            { key: 'amount', label: '确认金额' },
	            { key: 'source', label: '来源疑点' },
	            { key: 'caseFlag', label: '关联案例' },
	          ],
	          rows: issueRows,
	        },
	      },
	      案例沉淀数: {
	        drawerTitle: '案例沉淀明细',
	        summary: '案例沉淀数是成果指标，用于观察监督发现、确认问题和典型风险是否转化为可复用成果；不参与综合表现分计算。',
	        primary: {
	          label: '案例沉淀数',
	          value: `${formedCaseCount}个`,
	          badge: '成果指标',
	          formula: '纳入已入库、已发布、已审核待发布案例；不纳入草稿、审核退回、普通问题明细、未核实疑点和仅保存未提交案例。',
	          source: '案例库数据',
	          explanation: '该指标补齐“发现线索 -> 确认问题 -> 形成案例”的成果链路。',
	        },
	        sections: [
	          {
	            title: '案例沉淀摘要',
	            stats: [
	              { label: '典型案例数', value: `${typicalCaseCount}个` },
	              { label: '涉及主题数', value: `${formedCaseThemeCount}个` },
	              { label: formedCaseCoverageLabel, value: formedCaseCoverageValue },
	            ],
	          },
	        ],
	        listTitle: '案例沉淀明细表',
	        listHint: '默认继承当前页面筛选口径，可继续按案例类型、来源、状态、金额区间和关键词缩小范围。',
	        filters: [
	          { label: '监督主题', value: activeTheme || '全部日常主题' },
	          { label: '行政区划', value: currentScopeAreaText },
	          { label: '案例状态', value: '已入库 / 已发布 / 已审核待发布' },
	          { label: '可筛选字段', value: '类型、来源、典型、金额、关键词' },
	        ],
	        table: {
	          columns: [
	            { key: 'caseName', label: '案例名称' },
	            { key: 'caseCode', label: '案例编号' },
	            { key: 'monitorTheme', label: '所属主题' },
	            { key: 'regionName', label: '所属区划' },
	            { key: 'relatedUnit', label: '涉及单位' },
	            { key: 'caseType', label: '案例类型' },
	            { key: 'caseSource', label: '案例来源' },
	            { key: 'sourceProblemCode', label: '来源问题编号' },
	            { key: 'sourceClueCode', label: '来源疑点编号' },
	            { key: 'relatedRule', label: '关联规则' },
	            { key: 'amount', label: '涉及金额' },
	            { key: 'isTypical', label: '是否典型案例' },
	            { key: 'status', label: '案例状态' },
	            { key: 'storedAt', label: '入库时间' },
	            { key: 'actions', label: '操作' },
	          ],
	          rows: formedCaseRecords.slice(0, 10).map((item) => ({
	            ...item,
	            actions: '查看案例 / 来源问题 / 关联规则 / 政策依据',
	          })),
	        },
	        detailModules: [
	          { title: '案例摘要', content: '背景、发现方式、主要事实' },
	          { title: '问题表现', content: '具体违规、异常或风险表现' },
	          { title: '涉及金额', content: '金额、资金类型、资金来源' },
	          { title: '发现路径', content: '来源规则、主题、监督方式' },
	          { title: '核实结论', content: '是否确认问题、确认依据' },
	          { title: '处理结果', content: '已整改、已移交、已提示、已形成建议等' },
	          { title: '关联政策', content: '政策法规或制度依据' },
	          { title: '规则反哺', content: '是否形成规则优化建议' },
	          { title: '政策反哺', content: '是否形成政策完善建议' },
	          { title: '可复用点', content: '为什么可作为正式案例成果' },
	        ],
	        entries: [],
	      },
	    };
	    return dailyDrawerData;
	  }, [activeTheme, attentionRegions, attentionThemes, currentScopeAreaText, filteredScoreRows, isSpecialSupervision, selectedMapArea, specialAttentionRegions, specialAttentionThemes, specialFilteredIssueRows, specialIssueDetailRows, specialRectificationStatusRows, visibleAttentionRegions.length, visibleAttentionThemes.length]);
	  const activeMetricDrawer = activeMetric ? metricDrawerData[activeMetric as keyof typeof metricDrawerData] : null;
	  const drawerQuickStats = useMemo(() => {
	    if (!activeMetricDrawer) return [];
	    return (activeMetricDrawer.sections?.[0]?.stats || [])
	      .filter((stat) => stat.label !== activeMetricDrawer.primary.label && stat.label !== '案例总数')
	      .slice(0, 3);
	  }, [activeMetricDrawer]);

	  const syncMapToSubject = useCallback((subjectName: string) => {
	    if (isUnitAnalysisMode) return;
	    const subjectRow = baseFilteredScoreRows.find((row) => row.subjectName === subjectName) || subjectThemeScores.find((row) => row.subjectName === subjectName);
	    if (!subjectRow) return;

	    if (countyParentMap[subjectRow.regionName]) {
	      window.location.href = buildLocalSupervisionUrl(subjectRow.regionName);
	      return;
	    }

	    if (subjectRow.regionName === '省本级') {
	      window.location.href = buildLocalSupervisionUrl('省本级');
	      return;
	    }

	    if (cityRegions.includes(subjectRow.regionName)) {
	      setSelectedRegion(null);
	      setSelectedMapArea(null);
	      setAdminRegion('湖南省全辖');
	      setAnalysisShape('jurisdiction');
	    }
	  }, [baseFilteredScoreRows, isUnitAnalysisMode]);

	  const handleAttentionRegionSelect = useCallback((regionName: string) => {
	    if (regionName === '省本级' || countyParentMap[regionName]) {
	      window.location.href = buildLocalSupervisionUrl(regionName);
	      return;
	    }
	    if (cityRegions.includes(regionName)) {
	      setSelectedRegion(regionName);
	      setSelectedMapArea(null);
	      setAdminRegion(regionName);
	      setAnalysisShape('jurisdiction');
	      setSelectedSubject(null);
	      setSelectedIndicator(null);
	    }
	  }, []);

	  const handleCategoryChange = (category: MonitorCategory) => {
	    setMonitorCategory(category);
	    setMonitorTheme('全部');
	    setSelectedTheme(null);
	    setSelectedSubject(null);
	  };

	  const handleSupervisionCategoryChange = (category: SupervisionCategory) => {
	    setSupervisionCategory(category);
	    setMonitorCategory('全部');
	    setMonitorTheme('全部');
	    setSelectedTheme(null);
	    setSelectedSubject(null);
	    setMapMetric(category === '专项监督' ? '综合情况' : '综合表现');
	    setRuleAnalysisTab(category === '专项监督' ? '问题分布' : '规则触发分析');
	  };

	  const handleAdminRegionChange = (regionName: string) => {
	    if (regionName === '省本级' || countyParentMap[regionName]) {
	      window.location.href = buildLocalSupervisionUrl(regionName);
	      return;
	    }
	    if (regionName.endsWith('本级')) {
	      window.location.href = buildLocalSupervisionUrl(regionName.replace(/本级$/, ''));
	      return;
	    }
	    setAdminRegion(regionName);
	    if (regionName === '湖南省全辖') {
	      setSelectedRegion(null);
	      setSelectedMapArea(null);
	      setAnalysisShape('jurisdiction');
	    } else {
	      setSelectedRegion(regionName);
	      setSelectedMapArea(null);
	      setAnalysisShape('jurisdiction');
	    }
    setSelectedSubject(null);
    setSelectedIndicator(null);
  };

	  const handleRefresh = () => {
	    setTimeRange('本月');
	    setCustomStart('2026-05-01');
	    setCustomEnd('2026-05-14');
	    setOpenDatePicker(null);
	    setAdminRegion('湖南省全辖');
	    setSelectedRegion(null);
	    setSelectedMapArea(null);
	    setAnalysisShape('jurisdiction');
	    setSupervisionCategory('日常监督');
	    setMonitorCategory('全部');
	    setMonitorTheme('全部');
	    setRuleAnalysisTab('规则触发分析');
	    setMapMetric('综合表现');
    setSubjectType('全部');
    setSelectedTheme(null);
    setSelectedSubject(null);
    setMapResetToken((token) => token + 1);
  };

	  const openCustomDatePicker = (picker: DatePickerKey, value: string) => {
	    setOpenFilterMenu(null);
	    setCalendarMonth(parseDateValue(value));
	    setOpenDatePicker((current) => (current === picker ? null : picker));
	  };

	  const handleCustomDateSelect = (picker: DatePickerKey, value: string) => {
	    if (picker === 'start') {
	      setCustomStart(value);
	    } else {
	      setCustomEnd(value);
	    }
	    setOpenDatePicker(null);
	  };

	  const renderCustomDatePicker = (picker: DatePickerKey) => {
	    const selectedValue = picker === 'start' ? customStart : customEnd;
	    const cells = buildCalendarCells(calendarMonth);
	    const startTime = parseDateValue(customStart).getTime();
	    const endTime = parseDateValue(customEnd).getTime();
	    const hasOrderedRange = startTime <= endTime;

	    return (
	      <div className={`date-picker-popover ${picker === 'end' ? 'align-right' : ''}`} role="dialog" aria-label={picker === 'start' ? '选择开始日期' : '选择结束日期'}>
	        <div className="date-picker-header">
	          <button
	            type="button"
	            className="date-picker-nav"
	            aria-label="上个月"
	            onMouseDown={(event) => {
	              event.preventDefault();
	              setCalendarMonth((month) => shiftCalendarMonth(month, -1));
	            }}
	          >
	            <ChevronLeft size={14} />
	          </button>
	          <strong>{formatCalendarMonth(calendarMonth)}</strong>
	          <button
	            type="button"
	            className="date-picker-nav"
	            aria-label="下个月"
	            onMouseDown={(event) => {
	              event.preventDefault();
	              setCalendarMonth((month) => shiftCalendarMonth(month, 1));
	            }}
	          >
	            <ChevronRight size={14} />
	          </button>
	        </div>
	        <div className="date-picker-weekdays">
	          {calendarWeekdays.map((day) => (
	            <span key={day}>{day}</span>
	          ))}
	        </div>
	        <div className="date-picker-grid">
	          {cells.map((cell, index) => {
	            const cellTime = parseDateValue(cell.value).getTime();
	            const isInRange = hasOrderedRange && cellTime >= startTime && cellTime <= endTime;
	            return (
	              <button
	                key={`${cell.value}-${index}`}
	                type="button"
	                className={`date-picker-day${cell.isCurrentMonth ? '' : ' outside'}${isInRange ? ' in-range' : ''}${cell.value === selectedValue ? ' selected' : ''}`}
	                aria-pressed={cell.value === selectedValue}
	                onMouseDown={(event) => {
	                  event.preventDefault();
	                  handleCustomDateSelect(picker, cell.value);
	                }}
	              >
	                {cell.day}
	              </button>
	            );
	          })}
	        </div>
	      </div>
	    );
	  };

	  const handleMapCitySelect = (cityName: string) => {
	    setSelectedRegion(cityName);
	    setSelectedMapArea(null);
	    setAdminRegion(cityName);
	    setAnalysisShape('jurisdiction');
	    setSelectedSubject(null);
    setSelectedIndicator(null);
  };

	  const handleMapCountySelect = (countyName: string, parentRegion: string) => {
	    window.location.href = buildLocalSupervisionUrl(countyName || parentRegion);
	  };

	  const handleBackToProvince = () => {
	    setAdminRegion('湖南省全辖');
	    setSelectedRegion(null);
	    setSelectedMapArea(null);
	    setAnalysisShape('jurisdiction');
	    setSelectedSubject(null);
    setSelectedIndicator(null);
  };

	  const handleBackToCity = () => {
	    if (selectedRegion) {
	      setAdminRegion(selectedRegion);
	      setSelectedMapArea(null);
	      setAnalysisShape('jurisdiction');
	      setSelectedSubject(null);
      setSelectedIndicator(null);
    }
  };

	  const handleCurrentLevelSelect = () => {
	    const targetRegion = activeRegion && activeRegion !== '省本级' ? activeRegion : '省本级';
	    window.location.href = buildLocalSupervisionUrl(targetRegion);
	  };

  const handleMapViewReset = () => {
    setMapResetToken((token) => token + 1);
  };

	  const handleThemeSelect = (theme: string) => {
	    if (theme === '全部') {
	      setSelectedTheme(null);
	      setMonitorTheme('全部');
	      setMonitorCategory('全部');
	      setSelectedSubject(null);
	      return;
	    }
	    if (isSpecialSupervision) {
	      setSelectedTheme(theme);
	      setMonitorTheme(theme);
	      setMonitorCategory('全部');
	      setSelectedSubject(null);
	      return;
	    }
	    setSelectedTheme(theme);
	    setMonitorTheme(theme);
	    setMonitorCategory(businessThemes.includes(theme) ? '业务监控' : '专题监控');
	    setSelectedSubject(null);
	  };

  const handleSubjectTypeChange = (type: SubjectTypeFilter) => {
    setSubjectType(type);
    setSelectedSubject(null);
  };

  const handleSubjectNameChange = (subjectName: string) => {
    if (subjectName === '全部') {
      setSelectedSubject(null);
      return;
    }
    setSelectedSubject(subjectName);
    setDetailTab('区划主题明细');
    syncMapToSubject(subjectName);
  };

  const handleSubjectSelect = (subjectName: string) => {
    setSelectedSubject(subjectName);
    setDetailTab('区划主题明细');
    syncMapToSubject(subjectName);
  };

  const handleIndicatorSelect = (indicatorName: string) => {
    setSelectedIndicator(indicatorName);
    setDetailTab('异常数据明细');
  };

  const handleViewSubjectTheme = (row: SubjectThemeScore) => {
    setSelectedSubject(row.subjectName);
    setMonitorCategory(row.monitorCategory);
    setMonitorTheme(row.monitorTheme);
    setSelectedTheme(row.monitorTheme);
    handleNavigate('/prototypes/topic-workbench2');
  };

  const handleNavigate = (path: string) => {
    window.location.href = path;
  };

  const renderSpecialVisualPanel = () => {
    if (!isSpecialSupervision) return null;

    if (ruleAnalysisTab === '问题分布') {
      return (
        <div className="special-visual-panel">
          <div className="visual-block visual-block-main">
            <div className="visual-block-title">
              <strong>专项主题问题数量排名</strong>
              <span>条形长度表示问题数量</span>
            </div>
            <div className="visual-bar-list">
              {specialVisualData.themeRows.map((item) => (
                <div key={item.label} className="visual-bar-row">
                  <div className="visual-bar-label">
                    <strong>{item.label}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <div className="visual-bar-track">
                    <i style={{ width: `${item.percent}%` }} />
                  </div>
                  <em>{item.value}条</em>
                </div>
              ))}
            </div>
          </div>
          <div className="visual-block">
            <div className="visual-block-title">
              <strong>一级分类占比</strong>
              <span>按问题数量汇总</span>
            </div>
            <div className="visual-chip-bars">
              {specialVisualData.categoryRows.map((item) => (
                <div key={item.label} className="visual-chip-row">
                  <span>{item.label}</span>
                  <div className="visual-thin-track">
                    <i style={{ width: `${item.percent}%` }} />
                  </div>
                  <strong>{item.issueCount}条</strong>
                  <em>{item.amountText}</em>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (ruleAnalysisTab === '整改状态') {
      return (
        <div className="special-visual-panel single">
          <div className="visual-block visual-block-main">
            <div className="visual-block-title">
              <strong>各区划整改状态构成</strong>
              <span>堆叠条展示未整改、整改中、审核、退回和销号</span>
            </div>
            <div className="visual-stack-list">
              {specialVisualData.statusRows.map((item) => (
                <div key={item.label} className="visual-stack-row">
                  <span>{item.label}</span>
                  <div className="visual-stack-track">
                    {item.parts.map((part) => (
                      <i key={part.label} className={`stack-${part.tone}`} style={{ width: `${part.percent}%` }} title={`${part.label} ${part.value}条`} />
                    ))}
                  </div>
                  <strong>{item.closedRate}</strong>
                </div>
              ))}
            </div>
            <div className="visual-legend">
              <span><i className="stack-pending" />未整改</span>
              <span><i className="stack-progress" />整改中</span>
              <span><i className="stack-review" />提交/审核</span>
              <span><i className="stack-returned" />已退回</span>
              <span><i className="stack-closed" />已销号</span>
            </div>
          </div>
        </div>
      );
    }

    if (ruleAnalysisTab === '超期问题') {
      return (
        <div className="special-visual-panel">
          <div className="visual-block visual-block-main">
            <div className="visual-block-title">
              <strong>超期问题区划排名</strong>
              <span>优先看超期与督办叠加区划</span>
            </div>
            <div className="visual-bar-list">
              {specialVisualData.overdueRows.map((item) => (
                <div key={item.label} className="visual-bar-row warning">
                  <div className="visual-bar-label">
                    <strong>{item.label}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <div className="visual-bar-track">
                    <i style={{ width: `${item.percent}%` }} />
                  </div>
                  <em>{item.value}条</em>
                </div>
              ))}
            </div>
          </div>
          <div className="visual-block">
            <div className="visual-block-title">
              <strong>超期处理提示</strong>
              <span>从期限风险看督办必要性</span>
            </div>
            <div className="visual-summary-grid">
              <div><span>最高超期区划</span><strong>{specialVisualData.overdueRows[0]?.label || '--'}</strong></div>
              <div><span>最高超期数</span><strong>{specialVisualData.overdueRows[0]?.value || 0}条</strong></div>
              <div><span>相关督办</span><strong>{specialVisualData.overdueRows[0]?.meta.split('｜')[1]?.replace('督办 ', '') || '--'}</strong></div>
            </div>
          </div>
        </div>
      );
    }

    if (ruleAnalysisTab === '退回问题') {
      return (
        <div className="special-visual-panel">
          <div className="visual-block visual-block-main">
            <div className="visual-block-title">
              <strong>退回问题区划排名</strong>
              <span>条形长度表示退回数量</span>
            </div>
            <div className="visual-bar-list">
              {specialVisualData.returnedRows.map((item) => (
                <div key={`${item.label}-${item.meta}`} className="visual-bar-row returned">
                  <div className="visual-bar-label">
                    <strong>{item.label}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <div className="visual-bar-track">
                    <i style={{ width: `${item.percent}%` }} />
                  </div>
                  <em>{item.value}条</em>
                </div>
              ))}
            </div>
          </div>
          <div className="visual-block">
            <div className="visual-block-title">
              <strong>退回原因分布</strong>
              <span>按退回次数汇总</span>
            </div>
            <div className="visual-chip-bars">
              {specialVisualData.returnReasonRows.map((item) => (
                <div key={item.label} className="visual-chip-row">
                  <span>{item.label}</span>
                  <div className="visual-thin-track returned">
                    <i style={{ width: `${item.percent}%` }} />
                  </div>
                  <strong>{item.value}次</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (ruleAnalysisTab === '督办问题') {
      return (
        <div className="special-visual-panel">
          <div className="visual-block visual-block-main">
            <div className="visual-block-title">
              <strong>督办问题区划排名</strong>
              <span>看督办后仍未销号的压力区划</span>
            </div>
            <div className="visual-bar-list">
              {specialVisualData.supervisionRows.map((item) => (
                <div key={item.label} className="visual-bar-row supervision">
                  <div className="visual-bar-label">
                    <strong>{item.label}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <div className="visual-bar-track">
                    <i style={{ width: `${item.percent}%` }} />
                  </div>
                  <em>{item.value}条</em>
                </div>
              ))}
            </div>
          </div>
          <div className="visual-block">
            <div className="visual-block-title">
              <strong>督办状态摘要</strong>
              <span>重复督办与超期共同判断</span>
            </div>
            <div className="visual-summary-grid">
              <div><span>督办最多</span><strong>{specialVisualData.supervisionRows[0]?.label || '--'}</strong></div>
              <div><span>督办问题</span><strong>{specialVisualData.supervisionRows[0]?.value || 0}条</strong></div>
              <div><span>重复/超期</span><strong>{specialVisualData.supervisionRows[0]?.meta || '--'}</strong></div>
            </div>
          </div>
        </div>
      );
    }

    if (ruleAnalysisTab === '案例沉淀') {
      return (
        <div className="special-visual-panel">
          <div className="visual-block visual-block-main">
            <div className="visual-block-title">
              <strong>专项主题案例数量</strong>
              <span>问题较多但案例较少仅作提示</span>
            </div>
            <div className="visual-bar-list">
              {specialVisualData.caseRows.map((item) => (
                <div key={item.label} className="visual-bar-row case">
                  <div className="visual-bar-label">
                    <strong>{item.label}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <div className="visual-bar-track">
                    <i style={{ width: `${item.percent}%` }} />
                  </div>
                  <em>{item.value}个</em>
                </div>
              ))}
            </div>
          </div>
          <div className="visual-block">
            <div className="visual-block-title">
              <strong>问题数 / 案例数对比</strong>
              <span>双条对比转化情况</span>
            </div>
            <div className="visual-dual-list">
              {specialVisualData.issueCaseRows.map((item) => (
                <div key={item.label} className="visual-dual-row">
                  <span>{item.label}</span>
                  <div>
                    <i className="issue" style={{ width: `${item.issuePercent}%` }} />
                    <i className="case" style={{ width: `${item.casePercent}%` }} />
                  </div>
                  <em>{item.issueCount}条 / {item.caseCount}个</em>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const availableThemeOptions = monitorCategory === '业务监控' ? businessThemes : monitorCategory === '专题监控' ? specialThemes : [...businessThemes, ...specialThemes];

  return (
    <div className="jurisdiction-supervision-page">
      <TopBar title="财会监督系统" onNavigate={handleNavigate} />
      <main className="jurisdiction-supervision-main">
	        <section className="overview-hero">
	          <div className="hero-title-line">
	            <h1>全辖监督分析</h1>
	            <p>{isSpecialSupervision ? '展示当前行政区划范围内专项问题整改、销号、超期、退回、督办和案例沉淀情况。' : '展示当前行政区划范围内日常监督关注情况、区划分布和主题表现。'}</p>
	          </div>
	          <div className="hero-context">{currentPositionText}</div>
	        </section>

	        <section className="daily-filter-panel">
	          <div className="filter-main-line">
	            <div
	              className="filter-field dropdown-filter-field time-filter-field"
	              onBlur={(event) => {
	                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
	                  setOpenFilterMenu(null);
	                }
	              }}
	            >
	              <span>统计时间</span>
	              <button
	                type="button"
	                className="filter-dropdown-trigger"
	                aria-haspopup="listbox"
	                aria-expanded={openFilterMenu === 'time'}
	                onClick={() => setOpenFilterMenu((menu) => (menu === 'time' ? null : 'time'))}
	              >
	                {timeRange}
	              </button>
	              {openFilterMenu === 'time' && (
	                <div className="filter-dropdown-menu time-menu" role="listbox">
	                  {timeRanges.map((item) => (
	                    <button
	                      key={item}
	                      type="button"
	                      className={`filter-dropdown-option level-0${timeRange === item ? ' active' : ''}`}
	                      role="option"
	                      aria-selected={timeRange === item}
	                      onMouseDown={(event) => {
	                        event.preventDefault();
	                        setOpenFilterMenu(null);
	                        setOpenDatePicker(null);
	                        setTimeRange(item);
	                      }}
	                    >
	                      <span>{item}</span>
	                    </button>
	                  ))}
	                </div>
	              )}
	            </div>
	            {timeRange === '自定义' && (
	              <div
	                className="date-range"
	                aria-label="自定义统计时间"
	                onBlur={(event) => {
	                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
	                    setOpenDatePicker(null);
	                  }
	                }}
	              >
	                <div className="date-filter-field">
	                  <span>开始日期</span>
	                  <button
	                    type="button"
	                    className="date-picker-trigger"
	                    aria-haspopup="dialog"
	                    aria-expanded={openDatePicker === 'start'}
	                    onClick={() => openCustomDatePicker('start', customStart)}
	                  >
	                    <span>{formatDateDisplay(customStart)}</span>
	                    <CalendarDays size={13} />
	                  </button>
	                  {openDatePicker === 'start' && renderCustomDatePicker('start')}
	                </div>
	                <div className="date-filter-field">
	                  <span>结束日期</span>
	                  <button
	                    type="button"
	                    className="date-picker-trigger"
	                    aria-haspopup="dialog"
	                    aria-expanded={openDatePicker === 'end'}
	                    onClick={() => openCustomDatePicker('end', customEnd)}
	                  >
	                    <span>{formatDateDisplay(customEnd)}</span>
	                    <CalendarDays size={13} />
	                  </button>
	                  {openDatePicker === 'end' && renderCustomDatePicker('end')}
	                </div>
	              </div>
	            )}
	            <div
	              className="filter-field wide dropdown-filter-field admin-region-field"
	              onBlur={(event) => {
	                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
	                  setOpenFilterMenu(null);
	                }
	              }}
	            >
	              <span>行政区划</span>
	              <button
	                type="button"
	                className="filter-dropdown-trigger admin-region-trigger"
	                aria-haspopup="listbox"
	                aria-expanded={openFilterMenu === 'adminRegion'}
	                onClick={() => setOpenFilterMenu((menu) => (menu === 'adminRegion' ? null : 'adminRegion'))}
	              >
	                {selectedAdminRegionLabel}
	              </button>
	              {openFilterMenu === 'adminRegion' && (
	                <div className="filter-dropdown-menu admin-region-menu" role="listbox">
	                  {adminRegionOptions.map((item) => (
	                    <button
	                      key={item.value}
	                      type="button"
	                      className={`filter-dropdown-option admin-region-option level-${item.level}${adminRegion === item.value ? ' active' : ''}`}
	                      role="option"
	                      aria-selected={adminRegion === item.value}
	                      onMouseDown={(event) => {
	                        event.preventDefault();
	                        setOpenFilterMenu(null);
	                        handleAdminRegionChange(item.value);
	                      }}
	                    >
	                      <span>{item.label}</span>
	                    </button>
	                  ))}
	                </div>
	              )}
	            </div>
	            <div
	              className="filter-field dropdown-filter-field supervision-filter-field"
	              onBlur={(event) => {
	                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
	                  setOpenFilterMenu(null);
	                }
	              }}
	            >
	              <span>监督分类</span>
	              <button
	                type="button"
	                className="filter-dropdown-trigger"
	                aria-haspopup="listbox"
	                aria-expanded={openFilterMenu === 'supervisionCategory'}
	                onClick={() => setOpenFilterMenu((menu) => (menu === 'supervisionCategory' ? null : 'supervisionCategory'))}
	              >
	                {supervisionCategory}
	              </button>
	              {openFilterMenu === 'supervisionCategory' && (
	                <div className="filter-dropdown-menu supervision-menu" role="listbox">
	                  {supervisionCategoryOptions.map((item) => (
	                    <button
	                      key={item}
	                      type="button"
	                      className={`filter-dropdown-option level-0${supervisionCategory === item ? ' active' : ''}`}
	                      role="option"
	                      aria-selected={supervisionCategory === item}
	                      onMouseDown={(event) => {
	                        event.preventDefault();
	                        setOpenFilterMenu(null);
	                        handleSupervisionCategoryChange(item);
	                      }}
	                    >
	                      <span>{item}</span>
	                    </button>
	                  ))}
	                </div>
	              )}
	            </div>
	            <div
	              className="filter-field theme-field dropdown-filter-field"
	              onBlur={(event) => {
	                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
	                  setOpenFilterMenu(null);
	                }
	              }}
	            >
	              <span>监督主题</span>
	              <button
	                type="button"
	                className="filter-dropdown-trigger theme-dropdown-trigger"
	                aria-haspopup="listbox"
	                aria-expanded={openFilterMenu === 'monitorTheme'}
	                onClick={() => setOpenFilterMenu((menu) => (menu === 'monitorTheme' ? null : 'monitorTheme'))}
	              >
	                {selectedMonitorThemeLabel}
	              </button>
	              {openFilterMenu === 'monitorTheme' && (
	                <div className="filter-dropdown-menu theme-menu" role="listbox">
	                  <button
	                    type="button"
	                    className={`filter-dropdown-option level-0${monitorTheme === '全部' ? ' active' : ''}`}
	                    role="option"
	                    aria-selected={monitorTheme === '全部'}
	                    onMouseDown={(event) => {
	                      event.preventDefault();
	                      setOpenFilterMenu(null);
	                      handleThemeSelect('全部');
	                    }}
	                  >
	                    <span>{allThemeText}</span>
	                  </button>
	                  {supervisionCategory === '日常监督' ? (
	                    <>
	                      <div className="filter-dropdown-group-title">业务监控</div>
	                      {businessThemes.map((theme) => (
	                        <button
	                          key={theme}
	                          type="button"
	                          className={`filter-dropdown-option level-1${monitorTheme === theme ? ' active' : ''}`}
	                          role="option"
	                          aria-selected={monitorTheme === theme}
	                          onMouseDown={(event) => {
	                            event.preventDefault();
	                            setOpenFilterMenu(null);
	                            handleThemeSelect(theme);
	                          }}
	                        >
	                          <span>{theme}</span>
	                        </button>
	                      ))}
	                      <div className="filter-dropdown-group-title">专题监控</div>
	                      {specialThemes.map((theme) => (
	                        <button
	                          key={theme}
	                          type="button"
	                          className={`filter-dropdown-option level-1${monitorTheme === theme ? ' active' : ''}`}
	                          role="option"
	                          aria-selected={monitorTheme === theme}
	                          onMouseDown={(event) => {
	                            event.preventDefault();
	                            setOpenFilterMenu(null);
	                            handleThemeSelect(theme);
	                          }}
	                        >
	                          <span>{theme}</span>
	                        </button>
	                      ))}
	                    </>
	                  ) : (
	                    <>
	                      {specialSupervisionThemeGroups.map((group) => (
	                        <div key={group.category}>
	                          <button
	                            type="button"
	                            className={`filter-dropdown-option level-1${monitorTheme === group.category ? ' active' : ''}`}
	                            role="option"
	                            aria-selected={monitorTheme === group.category}
	                            onMouseDown={(event) => {
	                              event.preventDefault();
	                              setOpenFilterMenu(null);
	                              handleThemeSelect(group.category);
	                            }}
	                          >
	                            <span>{group.category}</span>
	                          </button>
	                          {group.themes.map((theme) => (
	                            <button
	                              key={theme}
	                              type="button"
	                              className={`filter-dropdown-option level-2${monitorTheme === theme ? ' active' : ''}`}
	                              role="option"
	                              aria-selected={monitorTheme === theme}
	                              onMouseDown={(event) => {
	                                event.preventDefault();
	                                setOpenFilterMenu(null);
	                                handleThemeSelect(theme);
	                              }}
	                            >
	                              <span>{theme}</span>
	                            </button>
	                          ))}
	                        </div>
	                      ))}
	                    </>
	                  )}
	                </div>
	              )}
	            </div>
	            <button type="button" className="refresh-button" title="恢复默认筛选：本月 / 湖南省全辖 / 日常监督 / 全部日常主题" onClick={handleRefresh}>
	              <RefreshCw size={13} />
	              <span>重置</span>
	            </button>
	          </div>
	        </section>

        <section className="score-metric-grid">
          {metrics.map((metric) => (
            <div
              key={metric.title}
              className={`score-card ${metric.emphasis}${metric.statusText ? ' has-context' : ''}${metric.hoverExplanation ? ' has-hover-tip' : ''}${String(metric.value).replace(/[^0-9]/g, '').length >= 6 ? ' is-long-value' : ''}`}
              title={metric.hoverExplanation ? undefined : `${metric.title}，点击查看详情`}
	              onClick={() => {
	                setActiveMetric(metric.title);
	              }}
            >
              <span className="score-title">{metric.title}</span>
              <button
                type="button"
                className="metric-info-button"
                aria-label={`查看${metric.title}说明`}
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <Info size={12} />
                <span className="metric-info-tooltip" role="tooltip">
                  <span className="metric-info-title">{metric.title}</span>
                  <span className="metric-info-row">
                    <span>说明：</span>
                    <span>{metric.description}</span>
                  </span>
                  {metric.hoverExplanation?.calculationFormula && (
                    <span className="metric-info-row">
                      <span>口径：</span>
                      <span>{metric.hoverExplanation.calculationFormula}</span>
                    </span>
                  )}
                  {metric.hoverExplanation?.referenceFactors && metric.hoverExplanation.referenceFactors.length > 0 && (
                    <span className="metric-info-row">
                      <span>构成：</span>
                      <span>{metric.hoverExplanation.referenceFactors.join('、')}</span>
                    </span>
                  )}
                  {metric.hoverExplanation?.numerator && (
                    <span className="metric-info-row">
                      <span>分子：</span>
                      <span>{metric.hoverExplanation.numerator}</span>
                    </span>
                  )}
                  {metric.hoverExplanation?.denominator && (
                    <span className="metric-info-row">
                      <span>分母：</span>
                      <span>{metric.hoverExplanation.denominator}</span>
                    </span>
                  )}
                  {metric.hoverExplanation?.additionalInfo && (
                    <span className="metric-info-row">
                      <span>补充：</span>
                      <span>{metric.hoverExplanation.additionalInfo}</span>
                    </span>
                  )}
                  {metric.hoverExplanation?.scope && (
                    <span className="metric-info-row">
                      <span>范围：</span>
                      <span>{metric.hoverExplanation.scope}</span>
                    </span>
                  )}
                </span>
              </button>
              <span className="score-value-row">
                <span className="metric-value-hit">
                  <strong>{metric.value}</strong>
                  {metric.unit && <em>{metric.unit}</em>}
                  {metric.secondaryValue !== undefined && (
                    <>
                      <span className="metric-separator">、</span>
                      <strong>{metric.secondaryValue}</strong>
                      {metric.secondaryUnit && <em>{metric.secondaryUnit}</em>}
                    </>
                  )}
                </span>
              </span>
              {metric.statusText && <span className="score-status">{metric.statusText}</span>}
              {metric.trendText && <span className={`score-trend ${metric.trendDirection || ''}`}>{metric.trendText}</span>}
            </div>
          ))}
        </section>

	        <section className="analysis-grid">
	          <section className="panel theme-panel">
	            <div className="panel-header">
		              <div>
		                <h2>需关注区划</h2>
		                <span className="panel-note">{isSpecialSupervision ? '按未销号、超期、退回和问题金额排序' : '高/中关注区划，按综合表现分、问题金额和问题数量排序'}</span>
		              </div>
	            </div>
	            <div className="theme-ranking-list">
	              {isSpecialSupervision ? visibleSpecialRegions.map((region, index) => (
	                <button
	                  key={region.regionName}
	                  type="button"
	                  className="theme-ranking-row"
	                  onClick={() => handleAttentionRegionSelect(region.regionName)}
		                  title={`问题总数：${region.issueCount}条；未销号：${region.unclosedCount}条；超期：${region.overdueCount}条；退回：${region.returnedCount}条；问题金额：${region.issueAmountText}`}
	                >
	                  <span className="theme-rank-num">{index + 1}</span>
	                  <div className="theme-rank-content">
	                    <div className="theme-rank-title">
	                      <strong>{region.regionName}</strong>
	                      <span className={`risk-pill ${getAttentionToneClass(region.attentionLevel)}`}>{region.attentionLevel}</span>
	                    </div>
	                    <div className="theme-rank-stats">
	                      <span>问题 <b>{region.issueCount}</b></span>
	                      <span className="stat-divider">｜</span>
	                      <span>未销号 <b>{region.unclosedCount}</b></span>
	                      <span className="stat-divider">｜</span>
	                      <span>超期 <b>{region.overdueCount}</b></span>
	                      <span className="stat-divider">｜</span>
	                      <span>退回 <b>{region.returnedCount}</b></span>
	                    </div>
	                    <div className="theme-rank-stats">
	                      <span>问题金额 <b>{region.issueAmountText}</b></span>
	                      <span className="stat-divider">｜</span>
	                      <span>督办 <b>{region.supervisedCount}</b></span>
	                      <span className="stat-divider">｜</span>
	                      <span>案例 <b>{region.caseCount}个</b></span>
	                    </div>
	                    <div className="theme-rank-deduction">
	                      <span className="deduction-label">专项：</span>
	                      <span className="deduction-reason">{region.mainThemes.slice(0, 2).join('、') || '暂无'}；{region.reason}</span>
	                    </div>
	                  </div>
	                </button>
	              )) : visibleAttentionRegions.map((region, index) => (
	                <button
	                  key={region.regionName}
	                  type="button"
	                  className="theme-ranking-row"
	                  onClick={() => handleAttentionRegionSelect(region.regionName)}
		                  title={`综合表现分：${formatScore(region.comprehensiveScore)}；低分主题：${region.lowThemes.join('、') || '暂无'}；预警疑点：${region.warningCount}条；确认问题：${region.confirmedIssueCount}个；问题金额：${region.problemAmountText}`}
	                >
	                  <span className="theme-rank-num">{index + 1}</span>
	                  <div className="theme-rank-content">
	                    <div className="theme-rank-title">
	                      <strong>{region.regionName}</strong>
	                      <span className={`risk-pill ${getAttentionToneClass(region.attentionLevel)}`}>{region.attentionLevel}</span>
	                    </div>
	                    <div className="theme-rank-stats">
	                      {activeTheme ? (
		                        <span>主题得分 <b>{formatScore(region.averageScore)}</b></span>
		                      ) : (
		                        <span>综合表现 <b>{formatScore(region.comprehensiveScore)}</b></span>
		                      )}
		                      <span className="stat-divider">｜</span>
		                      <span>低分主题 <b>{region.lowThemeCount}/{region.totalThemeCount}</b></span>
		                      <span className="stat-divider">｜</span>
		                      <span>预警疑点 <b>{region.warningCount}</b></span>
		                    </div>
		                    <div className="theme-rank-stats">
		                      <span>确认问题 <b>{region.confirmedIssueCount}</b></span>
		                      <span className="stat-divider">｜</span>
		                      <span>问题金额 <b>{region.problemAmountText}</b></span>
		                      <span className="stat-divider">｜</span>
		                      <span>案例沉淀 <b>{region.caseCount}个</b></span>
	                    </div>
	                    <div className="theme-rank-deduction">
	                      <span className="deduction-label">原因：</span>
	                      <span className="deduction-reason">{region.reason}</span>
	                    </div>
	                  </div>
	                </button>
	              ))}
	            </div>
	          </section>

          {/* 中间：区划关注分布 */}
          <div className="middle-column">
	            <section className="panel map-panel">
	              <div className="panel-header">
	                <div>
	                  <h2>{mapPanelTitle}</h2>
	                  <span className="panel-note">{mapPanelNote}</span>
	                </div>
	                {!isUnitAnalysisMode && !selectedSubjectSummary && (
	                  <div className="map-switch" aria-label="地图着色维度">
	                    {availableMapMetrics.map((metric) => {
	                      const metricHelp = getMapMetricHelp(metric, Boolean(activeTheme));
	                      return (
	                        <button
	                          key={metric}
	                          type="button"
	                          className={mapMetric === metric ? 'active' : ''}
	                          onClick={() => setMapMetric(metric)}
	                        >
	                          {metric}
	                          <span className="metric-help-tooltip" role="tooltip">
	                            <strong>{metricHelp.title}</strong>
	                            <em>说明：{metricHelp.meaning}</em>
	                            <em>口径：{metricHelp.formula}</em>
	                            <em>排序：{metricHelp.sort}</em>
	                          </span>
	                        </button>
	                      );
	                    })}
	                  </div>
	                )}
	              </div>
		              <div className="map-content">
		                {(activeRegion || isUnitAnalysisMode) && (
		                  <div className="map-toolbar">
	                    <div className="back-buttons">
	                      {isUnitAnalysisMode && activeRegion && activeRegion !== '省本级' && (
	                        <>
	                          <button type="button" onClick={handleBackToCity}>
	                            返回{activeRegion}全辖
	                          </button>
	                          <span className="button-divider">/</span>
	                        </>
	                      )}
	                      <button type="button" onClick={handleBackToProvince}>
                        返回全省
	                      </button>
		                    </div>
		                  </div>
		                )}
		                {isUnitAnalysisMode ? (
		                  <div className="unit-analysis-content">
		                    <div className="unit-analysis-summary-grid">
		                      <div className="unit-analysis-stat">
		                        <span>本级主体</span>
		                        <strong>{uniqueCount(filteredScoreRows.map((row) => row.subjectName))}</strong>
		                        <em>个</em>
		                      </div>
		                      <div className="unit-analysis-stat">
		                        <span>需关注主体</span>
		                        <strong>{unitAttentionSubjects.filter((item) => item.attentionLevel !== '低关注').length}</strong>
		                        <em>个</em>
		                      </div>
		                      <div className="unit-analysis-stat">
		                        <span>需关注主题</span>
		                        <strong>{unitAttentionThemes.filter((item) => item.attentionLevel !== '低关注').length}</strong>
		                        <em>个</em>
		                      </div>
		                    </div>

		                    {selectedSubjectSummary && (
		                      <div className="unit-focus-card">
		                        <span>主体关注摘要</span>
		                        <strong>{selectedSubjectSummary.subjectName}</strong>
		                        <em>{selectedSubjectSummary.regionName}｜{selectedSubjectSummary.subjectType}</em>
		                        <div>
		                          {getSubjectRiskLines(selectedSubjectSummary).map((line) => (
		                            <p key={line.label}>{line.label} {line.value}｜{line.risk}</p>
		                          ))}
		                        </div>
		                      </div>
		                    )}

		                    <div className="unit-analysis-list-header">
		                      <strong>本级单位关注</strong>
		                      <span>按低分主题占比、预警疑点和转问题率排序</span>
		                    </div>
		                    {unitAttentionSubjects.length ? (
		                      <div className="theme-ranking-list unit-ranking-list">
		                        {unitAttentionSubjects.map((subject, index) => (
		                          <button
		                            key={subject.subjectName}
		                            type="button"
		                            className="theme-ranking-row"
		                            onClick={() => handleSubjectSelect(subject.subjectName)}
		                          >
		                            <span className="theme-rank-num">{index + 1}</span>
		                            <div className="theme-rank-content">
		                              <div className="theme-rank-title">
		                                <strong>{subject.subjectName}</strong>
		                                <span className={`risk-pill ${getAttentionToneClass(subject.attentionLevel)}`}>{subject.attentionLevel}</span>
		                              </div>
		                              <div className="theme-rank-stats">
		                                <span>低分主题 <b>{formatPercent(subject.lowThemeRatio)}</b></span>
		                                <span className="stat-divider">｜</span>
		                                <span>预警疑点 <b>{subject.warningCount}</b></span>
		                                <span className="stat-divider">｜</span>
		                                <span>转问题率 <b>{formatPercent(subject.issueConversionRate)}</b></span>
		                              </div>
		                              <div className="theme-rank-deduction">
		                                <span className="deduction-label">原因：</span>
		                                <span className="deduction-reason">{subject.reason}</span>
		                              </div>
		                            </div>
		                          </button>
		                        ))}
		                      </div>
		                    ) : (
		                      <div className="unit-empty">当前口径暂无本级单位数据</div>
		                    )}
		                  </div>
		                ) : (
		                  <>
		                    {!isSpecialSupervision && currentLevelRegion && currentLevelMetricSummary && !selectedSubjectSummary && (
		                      <button
		                        type="button"
		                        className={`subject-map-summary ${currentLevelMetricSummary.toneClass}`}
		                        onClick={handleCurrentLevelSelect}
		                        title="点击进入本级监督分析"
		                      >
		                        <span>{currentLevelRegionName === '省本级' ? '本级卡片' : `${currentLevelRegionName}本级卡片`}</span>
		                        <strong>{currentLevelRegionName === '省本级' ? '湖南省本级' : `${currentLevelRegionName}本级`}</strong>
		                        <em>{currentLevelMetricSummary.meta}</em>
		                        <div>
		                          {currentLevelMetricSummary.lines.map((line) => (
		                            <p key={line}>{line}</p>
		                          ))}
		                        </div>
		                      </button>
		                    )}
		                    {isSpecialSupervision && currentLevelSpecialRegion && currentLevelSpecialMetricSummary && !selectedSubjectSummary && (
		                      <button
		                        type="button"
		                        className={`subject-map-summary ${currentLevelSpecialMetricSummary.toneClass}`}
		                        onClick={handleCurrentLevelSelect}
		                        title="点击进入本级专项问题分析"
		                      >
		                        <span>{currentLevelRegionName === '省本级' ? '本级卡片' : `${currentLevelRegionName}本级卡片`}</span>
		                        <strong>{currentLevelRegionName === '省本级' ? '湖南省本级' : `${currentLevelRegionName}本级`}</strong>
		                        <em>{currentLevelSpecialMetricSummary.meta}</em>
		                        <div>
		                          {currentLevelSpecialMetricSummary.lines.map((line) => (
		                            <p key={line}>{line}</p>
		                          ))}
		                        </div>
		                      </button>
		                    )}
		                    <HunanRiskMap
		                      regions={isSpecialSupervision ? specialMapRegionScores : mapRegionScores}
		                      viewRegion={activeMapRegion}
	                      selectedArea={selectedMapArea || null}
	                      highlightedArea={highlightedMapArea}
	                      metric={mapMetric}
	                      resetToken={mapResetToken}
		                      onCitySelect={handleMapCitySelect}
		                      onCountySelect={handleMapCountySelect}
		                      isAllThemes={!activeTheme}
		                      isSpecialSupervision={isSpecialSupervision}
		                    />
		                    {selectedSubjectSummary && (
		                      <div className="subject-map-summary">
		                        <span>主体关注摘要</span>
		                        <strong>{selectedSubjectSummary.subjectName}</strong>
		                        <em>{selectedSubjectSummary.regionName}｜{selectedSubjectSummary.subjectType}</em>
		                        <div>
	                          {getSubjectRiskLines(selectedSubjectSummary).map((line) => (
	                            <p key={line.label}>{line.label} {line.value}｜{line.risk}</p>
	                          ))}
	                        </div>
	                      </div>
		                    )}
		                    <div className="map-risk-legend" aria-label="风险图例">
		                      <button type="button" className="legend-item">
		                        <i className="legend-high" />
		                        <span className="legend-label">高关注</span>
		                        <div className="legend-help-tooltip" role="tooltip">
		                          <strong>高关注</strong>
		                          <em>{getMapMetricThreshold(mapMetric, '高关注')}</em>
		                          <em>当前维度下需要优先核查或跟进。</em>
		                        </div>
		                      </button>
		                      <button type="button" className="legend-item">
		                        <i className="legend-mid" />
		                        <span className="legend-label">中关注</span>
		                        <div className="legend-help-tooltip" role="tooltip">
		                          <strong>中关注</strong>
		                          <em>{getMapMetricThreshold(mapMetric, '中关注')}</em>
		                          <em>存在一定关注信号，需结合列表和明细继续观察。</em>
		                        </div>
		                      </button>
		                      <button type="button" className="legend-item">
		                        <i className="legend-low" />
		                        <span className="legend-label">低关注</span>
		                        <div className="legend-help-tooltip" role="tooltip">
		                          <strong>低关注</strong>
		                          <em>{getMapMetricThreshold(mapMetric, '低关注')}</em>
		                          <em>当前维度下关注信号较少，按常态跟踪。</em>
		                        </div>
		                      </button>
		                    </div>
		                  </>
		                )}
		              </div>
	            </section>
          </div>

	          <section className="panel theme-panel">
	            <div className="panel-header">
	              <div>
		                <h2>{isSpecialSupervision ? '需关注专项主题' : activeTheme ? '指标扣分分析' : '需关注主题'}</h2>
		                <span className="panel-note">
		                  {isSpecialSupervision ? '按超期、未销号、金额和退回排序' : activeTheme ? '当前主题下低分指标、扣分原因和关联规则' : '高/中关注主题，按平均分、中位分和问题证据排序'}
		                </span>
	              </div>
	            </div>
	            <div className="theme-ranking-list">
	              {isSpecialSupervision ? (
	                visibleSpecialThemes.map((theme, index) => (
	                  <button
	                    key={theme.monitorTheme}
	                    type="button"
	                    className="theme-ranking-row"
	                    onClick={() => handleThemeSelect(theme.monitorTheme)}
		                    title={`覆盖区划 ${theme.coverageRegionCount}个；问题 ${theme.issueCount}条；未销号 ${theme.unclosedCount}条；超期 ${theme.overdueCount}条；退回 ${theme.returnedCount}条；问题金额：${theme.issueAmountText}`}
	                  >
	                    <span className="theme-rank-num">{index + 1}</span>
	                    <div className="theme-rank-content">
	                      <div className="theme-rank-title">
	                        <strong>{theme.monitorTheme}</strong>
	                        <span className={`risk-pill ${getAttentionToneClass(theme.attentionLevel)}`}>{theme.attentionLevel}</span>
	                      </div>
	                      <div className="theme-rank-stats">
	                        <span>{theme.themeCategory}</span>
	                        <span className="stat-divider">｜</span>
	                        <span>覆盖区划 <b>{theme.coverageRegionCount}</b></span>
	                        <span className="stat-divider">｜</span>
	                        <span>问题 <b>{theme.issueCount}</b></span>
	                      </div>
	                      <div className="theme-rank-stats">
	                        <span>未销号 <b>{theme.unclosedCount}</b></span>
	                        <span className="stat-divider">｜</span>
	                        <span>超期 <b>{theme.overdueCount}</b></span>
	                        <span className="stat-divider">｜</span>
	                        <span>退回 <b>{theme.returnedCount}</b></span>
	                        <span className="stat-divider">｜</span>
	                        <span>案例 <b>{theme.caseCount}个</b></span>
	                      </div>
	                      <div className="theme-rank-deduction">
	                        <span className="deduction-label">原因：</span>
	                        <span className="deduction-reason">{theme.reason}</span>
	                      </div>
	                    </div>
	                  </button>
	                ))
	              ) : activeTheme ? (
	                visibleEvidences.slice(0, 8).map((evidence, index) => (
	                  <button
	                    key={`${evidence.indicatorName}-${evidence.monitorTheme}`}
	                    type="button"
	                    className="theme-ranking-row"
	                    onClick={() => handleIndicatorSelect(evidence.indicatorName)}
	                    title={`关联规则 ${evidence.relatedRules} 条；预警疑点 ${evidence.abnormalCount} 条；扣分原因：${evidence.mainDeductionReason}`}
	                  >
	                    <span className="theme-rank-num">{index + 1}</span>
	                    <div className="theme-rank-content">
	                      <div className="theme-rank-title">
	                        <strong>{evidence.indicatorName}</strong>
	                        <span className={`risk-pill ${riskToneClass[primaryMetricRiskByScore(evidence.score)]}`}>{primaryMetricRiskByScore(evidence.score)}</span>
	                      </div>
	                      <div className="theme-rank-stats">
	                        <span>指标得分 <b>{formatScore(evidence.score)}</b></span>
	                        <span className="stat-divider">｜</span>
	                        <span>低分区划 <b>{evidence.affectedSubjects}</b></span>
	                        <span className="stat-divider">｜</span>
	                        <span>关联规则 <b>{evidence.relatedRules}</b></span>
	                      </div>
	                      <div className="theme-rank-stats">
	                        <span>预警疑点 <b>{evidence.abnormalCount}</b></span>
	                        <span className="stat-divider">｜</span>
	                        <span>确认问题 <b>{getMockConfirmedIssueCount(evidence.abnormalCount)}</b></span>
	                      </div>
	                      <div className="theme-rank-deduction">
	                        <span className="deduction-label">原因：</span>
	                        <span className="deduction-reason">{evidence.mainDeductionReason}</span>
	                      </div>
	                    </div>
	                  </button>
	                ))
	              ) : (
	                visibleAttentionThemes.map((theme, index) => (
	                  <button
	                    key={theme.monitorTheme}
	                    type="button"
	                    className="theme-ranking-row"
	                    onClick={() => handleThemeSelect(theme.monitorTheme)}
		                    title={`平均分 ${formatScore(theme.averageScore)}；中位分 ${formatScore(theme.medianScore)}；低分区划 ${theme.lowSubjectCount}/${theme.coverageSubjectCount}；确认问题 ${theme.confirmedIssueCount} 个；问题金额：${theme.problemAmountText}`}
	                  >
	                    <span className="theme-rank-num">{index + 1}</span>
	                    <div className="theme-rank-content">
	                      <div className="theme-rank-title">
	                        <strong>{theme.monitorTheme}</strong>
	                        <span className={`risk-pill ${getAttentionToneClass(theme.attentionLevel)}`}>{theme.attentionLevel}</span>
	                      </div>
	                      <div className="theme-rank-stats">
		                        <span>平均分 <b>{formatScore(theme.averageScore)}</b></span>
		                        <span className="stat-divider">｜</span>
		                        <span>中位分 <b>{formatScore(theme.medianScore)}</b></span>
		                        <span className="stat-divider">｜</span>
		                        <span>低分区划 <b>{theme.lowSubjectCount}/{theme.coverageSubjectCount}</b></span>
		                      </div>
		                      <div className="theme-rank-stats">
		                        <span>预警疑点 <b>{theme.warningCount}</b></span>
		                        <span className="stat-divider">｜</span>
		                        <span>确认问题 <b>{theme.confirmedIssueCount}</b></span>
		                        <span className="stat-divider">｜</span>
		                        <span>问题金额 <b>{theme.problemAmountText}</b></span>
		                        <span className="stat-divider">｜</span>
		                        <span>案例 <b>{theme.caseCount}个</b></span>
	                      </div>
	                      <div className="theme-rank-deduction">
	                        <span className="deduction-label">原因：</span>
	                        <span className="deduction-reason">{theme.reason}</span>
	                      </div>
	                    </div>
	                  </button>
	                ))
	              )}
	            </div>
	          </section>
	        </section>

		        <section className="panel detail-panel">
		          <div className="panel-header detail-header">
		            <div>
		              <h2>{isSpecialSupervision ? '问题整改分析' : '监控预警与明细追溯'}</h2>
		              <span className="panel-note">{isSpecialSupervision ? '解释专项问题分布、整改状态、超期、退回、督办和案例沉淀情况' : '解释顶部卡片、区划、主题和地图颜色背后的规则、疑点、问题与案例链路'}</span>
		            </div>
		            <div className="detail-tabs">
		              {isSpecialSupervision ? (
		                specialAnalysisTabs.map((tab) => (
		                  <button key={tab} className={ruleAnalysisTab === tab ? 'active' : ''} onClick={() => setRuleAnalysisTab(tab)}>{tab}</button>
		                ))
		              ) : (
		                <>
		                  <button className={ruleAnalysisTab === '规则触发分析' ? 'active' : ''} onClick={() => setRuleAnalysisTab('规则触发分析')}>规则触发分析</button>
		                  <button className={ruleAnalysisTab === '预警疑点分析' ? 'active' : ''} onClick={() => setRuleAnalysisTab('预警疑点分析')}>预警疑点分析</button>
		                  <button className={ruleAnalysisTab === '确认问题分析' ? 'active' : ''} onClick={() => setRuleAnalysisTab('确认问题分析')}>确认问题分析</button>
		                  <button className={ruleAnalysisTab === '案例沉淀分析' ? 'active' : ''} onClick={() => setRuleAnalysisTab('案例沉淀分析')}>案例沉淀分析</button>
		                  <button className={ruleAnalysisTab === '明细追溯' ? 'active' : ''} onClick={() => setRuleAnalysisTab('明细追溯')}>明细追溯</button>
		                </>
		              )}
		            </div>
		          </div>
		          {renderSpecialVisualPanel()}
		          <div className="detail-table-wrap">
		            {isSpecialSupervision && ruleAnalysisTab === '问题分布' && (
		              <table>
		                <thead>
		                  <tr>
		                    <th>一级分类</th>
		                    <th>专项主题</th>
		                    <th>问题数量</th>
		                    <th>问题金额</th>
		                    <th>覆盖区划</th>
		                    <th>未销号问题</th>
		                    <th>超期问题</th>
		                    <th>案例沉淀</th>
		                    <th>分析提示</th>
		                  </tr>
		                </thead>
		                <tbody>
		                  {specialProblemDistributionRows.map((item) => (
		                    <tr key={item.monitorTheme}>
		                      <td>{item.themeCategory}</td>
		                      <td>{item.monitorTheme}</td>
		                      <td>{item.issueCount}</td>
		                      <td>{item.issueAmount}</td>
		                      <td>{item.coverageRegionCount}</td>
		                      <td>{item.unclosedCount}</td>
		                      <td>{item.overdueCount}</td>
		                      <td>{item.caseCount}</td>
		                      <td>{item.reason}</td>
		                    </tr>
		                  ))}
		                </tbody>
		              </table>
		            )}

		            {isSpecialSupervision && ruleAnalysisTab === '整改状态' && (
		              <table>
		                <thead>
		                  <tr>
		                    <th>区划</th>
		                    <th>问题总数</th>
		                    <th>未整改</th>
		                    <th>整改中</th>
		                    <th>已提交</th>
		                    <th>审核中</th>
		                    <th>已退回</th>
		                    <th>已销号</th>
		                    <th>销号率</th>
		                  </tr>
		                </thead>
		                <tbody>
		                  {specialRectificationStatusRows.map((item) => (
		                    <tr key={item.regionName}>
		                      <td>{item.regionName}</td>
		                      <td>{item.issueCount}</td>
		                      <td>{item.notStartedCount}</td>
		                      <td>{item.inProgressCount}</td>
		                      <td>{item.submittedCount}</td>
		                      <td>{item.reviewCount}</td>
		                      <td>{item.returnedCount}</td>
		                      <td>{item.closedCount}</td>
		                      <td>{item.closedRate}</td>
		                    </tr>
		                  ))}
		                </tbody>
		              </table>
		            )}

		            {isSpecialSupervision && ruleAnalysisTab === '超期问题' && (
		              <table>
		                <thead>
		                  <tr>
		                    <th>区划</th>
		                    <th>专项主题</th>
		                    <th>问题名称</th>
		                    <th>责任单位</th>
		                    <th>整改期限</th>
		                    <th>当前状态</th>
		                    <th>超期天数</th>
		                    <th>问题金额</th>
		                    <th>是否已督办</th>
		                  </tr>
		                </thead>
		                <tbody>
		                  {specialIssueDetailRows.filter((item) => item.overdueDays !== '-').map((item) => (
		                    <tr key={`${item.issueCode}-overdue`}>
		                      <td>{item.regionName}</td>
		                      <td>{item.monitorTheme}</td>
		                      <td>{item.issueName}</td>
		                      <td>{item.responsibleUnit}</td>
		                      <td>{item.deadline}</td>
		                      <td>{item.currentStatus}</td>
		                      <td>{item.overdueDays}</td>
		                      <td>{item.issueAmount}</td>
		                      <td>{item.supervised}</td>
		                    </tr>
		                  ))}
		                </tbody>
		              </table>
		            )}

		            {isSpecialSupervision && ruleAnalysisTab === '退回问题' && (
		              <table>
		                <thead>
		                  <tr>
		                    <th>区划</th>
		                    <th>专项主题</th>
		                    <th>问题名称</th>
		                    <th>退回原因</th>
		                    <th>退回时间</th>
		                    <th>退回次数</th>
		                    <th>是否已重新提交</th>
		                    <th>当前状态</th>
		                  </tr>
		                </thead>
		                <tbody>
		                  {specialIssueDetailRows.filter((item) => item.returnedReason !== '-').map((item) => (
		                    <tr key={`${item.issueCode}-returned`}>
		                      <td>{item.regionName}</td>
		                      <td>{item.monitorTheme}</td>
		                      <td>{item.issueName}</td>
		                      <td>{item.returnedReason}</td>
		                      <td>{item.returnedAt}</td>
		                      <td>{item.returnedCount}</td>
		                      <td>{item.resubmitted}</td>
		                      <td>{item.currentStatus}</td>
		                    </tr>
		                  ))}
		                </tbody>
		              </table>
		            )}

		            {isSpecialSupervision && ruleAnalysisTab === '督办问题' && (
		              <table>
		                <thead>
		                  <tr>
		                    <th>区划</th>
		                    <th>专项主题</th>
		                    <th>问题名称</th>
		                    <th>督办次数</th>
		                    <th>最近督办时间</th>
		                    <th>督办期限</th>
		                    <th>当前状态</th>
		                    <th>是否已销号</th>
		                  </tr>
		                </thead>
		                <tbody>
		                  {specialIssueDetailRows.filter((item) => item.supervised === '是').map((item) => (
		                    <tr key={`${item.issueCode}-supervision`}>
		                      <td>{item.regionName}</td>
		                      <td>{item.monitorTheme}</td>
		                      <td>{item.issueName}</td>
		                      <td>{item.supervisionTimes}</td>
		                      <td>{item.lastSupervisionAt}</td>
		                      <td>{item.supervisionDeadline}</td>
		                      <td>{item.currentStatus}</td>
		                      <td>{item.closedFlag}</td>
		                    </tr>
		                  ))}
		                </tbody>
		              </table>
		            )}

		            {isSpecialSupervision && ruleAnalysisTab === '案例沉淀' && (
		              <table>
		                <thead>
		                  <tr>
		                    <th>区划</th>
		                    <th>专项主题</th>
		                    <th>问题名称</th>
		                    <th>问题金额</th>
		                    <th>销号情况</th>
		                    <th>典型案例名称</th>
		                    <th>案例状态</th>
		                  </tr>
		                </thead>
		                <tbody>
		                  {specialIssueDetailRows.filter((item) => item.caseStatus !== '未形成').map((item) => (
		                    <tr key={`${item.issueCode}-case`}>
		                      <td>{item.regionName}</td>
		                      <td>{item.monitorTheme}</td>
		                      <td>{item.issueName}</td>
		                      <td>{item.issueAmount}</td>
		                      <td>{item.closedFlag}</td>
		                      <td>{item.typicalCaseName}</td>
		                      <td>{item.caseStatus}</td>
		                    </tr>
		                  ))}
		                </tbody>
		              </table>
		            )}

		            {!isSpecialSupervision && ruleAnalysisTab === '规则触发分析' && (
		              <table>
		                <thead>
		                  <tr>
		                    <th>规则类型 / 归属主题</th>
		                    <th>启用规则数</th>
	                    <th>触发规则数</th>
	                    <th>预警疑点数</th>
	                    <th>涉及区划数</th>
	                    <th>疑点转问题率</th>
	                    <th>判断</th>
	                    <th>操作</th>
	                  </tr>
	                </thead>
	                <tbody>
	                  {buildRuleTypeSummaries().map((item) => {
	                    const triggeredRuleCount = Math.min(item.ruleCount, Math.max(1, Math.ceil(item.triggerCount / 48)));
	                    const conversionRate = getRatioPercent(Math.round(item.abnormalCount * 0.32), Math.round(item.abnormalCount * 0.78), 1);
	                    return (
	                      <tr key={item.ruleType}>
	                        <td>{item.ruleType}</td>
	                        <td>{item.ruleCount}</td>
	                        <td>{triggeredRuleCount}</td>
	                        <td>{item.abnormalCount}</td>
	                        <td>{item.subjectCount}</td>
	                        <td>{formatPercent(conversionRate)}</td>
	                        <td>{conversionRate >= 40 ? '真实风险集中' : '规则口径需观察'}</td>
	                        <td><button onClick={() => setRuleDrawerData({ type: 'rule-type', data: item })}>查看</button></td>
	                      </tr>
	                    );
	                  })}
		                </tbody>
		              </table>
		            )}

		            {!isSpecialSupervision && ruleAnalysisTab === '预警疑点分析' && (
		              <table>
		                <thead>
		                  <tr>
		                    <th>疑点编号</th>
		                    <th>主题</th>
		                    <th>区划</th>
		                    <th>规则</th>
		                    <th>涉及金额</th>
		                    <th>状态</th>
		                    <th>生成时间</th>
		                  </tr>
		                </thead>
		                <tbody>
		                  {bottomWarningRows.map((item) => (
		                    <tr key={item.clueCode}>
		                      <td>{item.clueCode}</td>
		                      <td>{item.monitorTheme}</td>
		                      <td>{item.regionName}</td>
		                      <td>{item.ruleName}</td>
		                      <td>{item.amount}</td>
		                      <td>{item.status}</td>
		                      <td>{item.triggerTime}</td>
		                    </tr>
		                  ))}
		                </tbody>
		              </table>
		            )}

		            {!isSpecialSupervision && ruleAnalysisTab === '确认问题分析' && (
		              <table>
		                <thead>
		                  <tr>
		                    <th>问题编号</th>
		                    <th>问题名称</th>
		                    <th>主题</th>
		                    <th>区划</th>
		                    <th>问题类型</th>
		                    <th>确认金额</th>
		                    <th>来源疑点</th>
		                    <th>确认时间</th>
		                  </tr>
		                </thead>
		                <tbody>
		                  {bottomIssueRows.map((item) => (
		                    <tr key={item.issueCode}>
		                      <td>{item.issueCode}</td>
		                      <td>{item.issueName}</td>
		                      <td>{item.monitorTheme}</td>
		                      <td>{item.regionName}</td>
		                      <td>{item.issueType}</td>
		                      <td>{item.amount}</td>
		                      <td>{item.source}</td>
		                      <td>{item.confirmedAt}</td>
		                    </tr>
		                  ))}
		                </tbody>
		              </table>
		            )}

		            {!isSpecialSupervision && ruleAnalysisTab === '案例沉淀分析' && (
		              <table>
		                <thead>
		                  <tr>
		                    <th>案例名称</th>
		                    <th>主题</th>
		                    <th>区划</th>
		                    <th>案例来源</th>
		                    <th>来源问题</th>
		                    <th>是否典型</th>
		                    <th>入库时间</th>
		                  </tr>
		                </thead>
		                <tbody>
		                  {bottomCaseRows.map((item) => (
		                    <tr key={item.caseCode}>
		                      <td>{item.caseName}</td>
		                      <td>{item.monitorTheme}</td>
		                      <td>{item.regionName}</td>
		                      <td>{item.caseSource}</td>
		                      <td>{item.sourceProblemCode}</td>
		                      <td>{item.isTypical}</td>
		                      <td>{item.storedAt}</td>
		                    </tr>
		                  ))}
		                </tbody>
		              </table>
		            )}

		            {!isSpecialSupervision && ruleAnalysisTab === '明细追溯' && (
		              <table>
		                <thead>
		                  <tr>
		                    <th>区划</th>
		                    <th>主题</th>
		                    <th>规则</th>
		                    <th>疑点</th>
		                    <th>问题</th>
		                    <th>案例</th>
		                    <th>链路状态</th>
		                  </tr>
		                </thead>
		                <tbody>
		                  {bottomIssueRows.slice(0, 8).map((item, index) => {
		                    const caseRow = bottomCaseRows[index % Math.max(bottomCaseRows.length, 1)];
		                    return (
		                      <tr key={`${item.issueCode}-trace`}>
		                        <td>{item.regionName}</td>
		                        <td>{item.monitorTheme}</td>
		                        <td>{item.relatedRule}</td>
		                        <td>{item.source}</td>
		                        <td>{item.issueCode}</td>
		                        <td>{caseRow?.caseCode || '未形成'}</td>
		                        <td>{caseRow ? '规则-疑点-问题-案例已贯通' : '已确认问题，待沉淀案例'}</td>
		                      </tr>
		                    );
		                  })}
		                </tbody>
		              </table>
		            )}
	          </div>
	        </section>

        {activeMetricDrawer && (
          <div className="metric-drawer-mask" onClick={() => setActiveMetric(null)}>
            <aside className="metric-drawer" onClick={(event) => event.stopPropagation()}>
              <div className="drawer-title-row">
                <div>
                  <h2>{activeMetricDrawer.drawerTitle || activeMetric}</h2>
                </div>
                <button className="drawer-close-button" onClick={() => setActiveMetric(null)} aria-label="收起">
                  <X size={17} strokeWidth={2.5} />
                </button>
              </div>
              <div className="drawer-scope" title={currentPositionText}>{currentPositionText}</div>
              <section className="drawer-primary-card">
                <div className="drawer-primary-main">
                  <div className="drawer-primary-head">
                    <span>{activeMetricDrawer.primary.label}</span>
                    <strong>{activeMetricDrawer.primary.value}</strong>
                  </div>
                  <p title={activeMetricDrawer.primary.explanation}>{activeMetricDrawer.primary.explanation}</p>
                </div>
                <div className="drawer-primary-side">
                  <em>{activeMetricDrawer.primary.badge}</em>
                  {drawerQuickStats.map((stat) => (
                    <div key={stat.label} className="drawer-primary-stat">
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <div className="drawer-method-strip">
                <span>口径</span>
                <p>{activeMetricDrawer.primary.formula}</p>
              </div>

              <p className="drawer-summary" title={activeMetricDrawer.summary}>{activeMetricDrawer.summary}</p>

              {activeMetricDrawer.filters && activeMetricDrawer.filters.length > 0 && (
                <section className="drawer-section">
                  <div className="drawer-section-heading">
                    <span className="drawer-section-kicker">筛选项</span>
                    <div className="drawer-section-title">当前明细筛选</div>
                  </div>
                  <div className="drawer-filter-grid">
                    {activeMetricDrawer.filters.map((filter) => (
                      <div key={filter.label} className="drawer-filter-chip">
                        <span>{filter.label}</span>
                        <strong>{filter.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeMetricDrawer.sections?.map((section, idx) => (
                <section key={idx} className="drawer-section">
                  <div className="drawer-section-heading">
                    <span className="drawer-section-kicker">摘要</span>
                    <div className="drawer-section-title">{section.title}</div>
                  </div>
                  <div className="drawer-distribution">
                    {section.stats.map((stat) => (
                      <div key={stat.label} className="drawer-stat">
                        <small>{section.title}</small>
                        <span>{stat.label}</span>
                        <div className="stat-value-wrapper">
                          <strong>{stat.value}</strong>
                          {stat.showInfo && (
                            <span
                              className="info-icon"
                              title={activeTheme
                                ? '主题评价得分用于辅助判断该主题下区划是否需要关注。'
                                : '关注判断由低分主题、预警疑点和确认问题共同辅助呈现。'
                              }
                            >
                              i
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {activeMetricDrawer.table && activeMetricDrawer.table.rows.length > 0 && (
                <section className="drawer-section">
                  <div className="drawer-section-heading">
                    <span className="drawer-section-kicker">明细表</span>
                    <div className="drawer-section-title">{activeMetricDrawer.listTitle}</div>
                  </div>
                  <div className="drawer-list-hint">{activeMetricDrawer.listHint}</div>
                  <div className="drawer-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {activeMetricDrawer.table.columns.map((column) => (
                            <th key={column.key}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeMetricDrawer.table.rows.map((row, rowIndex) => (
                          <tr key={`${row.caseCode || rowIndex}`}>
                            {activeMetricDrawer.table?.columns.map((column) => (
                              <td key={column.key}>{row[column.key] || '--'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeMetricDrawer.entries && activeMetricDrawer.entries.length > 0 && (
                <section className="drawer-section">
                  <div className="drawer-section-heading">
                    <span className="drawer-section-kicker">具体数据明细</span>
                    <div className="drawer-section-title">{activeMetricDrawer.listTitle}</div>
                  </div>
                  <div className="drawer-list-hint">{activeMetricDrawer.listHint}</div>
                  <div className="drawer-entry-list">
                    {activeMetricDrawer.entries.map((item) => (
                      <button
	                        key={`${item.name}-${item.value}`}
	                        onClick={() => {
	                          if ((activeMetric === '高关注区划数' || activeMetric === '低分区划数' || activeMetric === '平均分' || activeMetric === '确认问题数量' || activeMetric === '确认问题金额') && item.name) {
	                            handleAttentionRegionSelect(item.name);
	                          }
	                          if (activeMetric === '高关注主题数' && item.name) {
	                            handleThemeSelect(item.name);
	                          }
	                          if (activeMetric === '预警疑点数量') {
	                            setRuleAnalysisTab('预警疑点分析');
	                          }
	                          if (activeMetric === '确认问题数量') {
	                            setRuleAnalysisTab('确认问题分析');
	                          }
	                          setActiveMetric(null);
	                        }}
                      >
                        <div>
                          <strong>{item.name}</strong>
                          <span>{item.meta}</span>
                          <p>{item.reason}</p>
                        </div>
                        <em>{item.value}</em>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </aside>
          </div>
        )}

	        {/* 明细分析抽屉 */}
        {ruleDrawerData && (
          <div className="metric-drawer-mask" onClick={() => setRuleDrawerData(null)}>
            <aside className="metric-drawer" onClick={(event) => event.stopPropagation()}>
              <div className="drawer-title-row">
                <div>
                  <span>
                    {ruleDrawerData.type === 'rule-type' && '业务分类详情'}
                    {ruleDrawerData.type === 'high-frequency-rule' && '高频规则详情'}
                    {ruleDrawerData.type === 'region-trigger' && '区划触发详情'}
                    {ruleDrawerData.type === 'clue-conversion' && '明细追溯详情'}
                  </span>
                  <h2>
                    {ruleDrawerData.type === 'rule-type' && ruleDrawerData.data.ruleType}
                    {ruleDrawerData.type === 'high-frequency-rule' && ruleDrawerData.data.ruleName}
                    {ruleDrawerData.type === 'region-trigger' && ruleDrawerData.data.regionName}
                    {ruleDrawerData.type === 'clue-conversion' && `${ruleDrawerData.data.regionName}｜${ruleDrawerData.data.monitorTheme}`}
                  </h2>
                </div>
                <button className="drawer-close-button" onClick={() => setRuleDrawerData(null)} aria-label="收起">
                  <X size={17} strokeWidth={2.5} />
                </button>
              </div>
              <div className="drawer-scope">{currentPositionText}</div>

              {ruleDrawerData.type === 'rule-type' && (
                <>
                  <p className="drawer-summary">该业务分类下的规则触发情况统计。</p>
                  <section className="drawer-section">
                    <div className="drawer-section-title">基本统计</div>
                    <div className="drawer-distribution">
                      <div className="drawer-stat">
                        <span>规则数量</span>
                        <strong>{ruleDrawerData.data.ruleCount}条</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>触发次数</span>
                        <strong>{ruleDrawerData.data.triggerCount}次</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>异常条数</span>
                        <strong>{ruleDrawerData.data.abnormalCount}条</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>拦截条数</span>
                        <strong>{ruleDrawerData.data.interceptCount}条</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>涉及区划</span>
                        <strong>{ruleDrawerData.data.subjectCount}个</strong>
                      </div>
                    </div>
                  </section>
                  <section className="drawer-section">
                    <div className="drawer-section-title">说明</div>
                    <p className="drawer-summary">该业务分类涵盖了相关业务流程中的多个规则控制点，用于监控和预警潜在的风险。触发次数表示规则被命中的总次数，异常条数表示触发后判定为异常的数量，拦截条数表示已采取拦截措施的数量。</p>
                  </section>
                </>
              )}

              {ruleDrawerData.type === 'high-frequency-rule' && (
                <>
                  <p className="drawer-summary">该高频规则的详细信息和统计数据。</p>
                  <section className="drawer-section">
                    <div className="drawer-section-title">基本信息</div>
                    <div className="drawer-distribution">
                      <div className="drawer-stat">
                        <span>业务分类</span>
                        <strong>{ruleDrawerData.data.businessCategory}</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>监控主题</span>
                        <strong>{ruleDrawerData.data.monitorTheme}</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>关联指标</span>
                        <strong>{ruleDrawerData.data.relatedIndicator}</strong>
                      </div>
                    </div>
                  </section>
                  <section className="drawer-section">
                    <div className="drawer-section-title">触发统计</div>
                    <div className="drawer-distribution">
                      <div className="drawer-stat">
                        <span>触发次数</span>
                        <strong>{ruleDrawerData.data.triggerCount}次</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>异常条数</span>
                        <strong>{ruleDrawerData.data.abnormalCount}条</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>拦截条数</span>
                        <strong>{ruleDrawerData.data.interceptCount}条</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>涉及区划</span>
                        <strong>{ruleDrawerData.data.subjectCount}个</strong>
                      </div>
                    </div>
                  </section>
                  <section className="drawer-section">
                    <div className="drawer-section-title">说明</div>
                    <p className="drawer-summary">该规则用于监控{ruleDrawerData.data.relatedIndicator}相关的业务行为，当触发条件满足时会产生预警。建议关注该规则的异常趋势，及时核实并处理相关问题。</p>
                  </section>
                </>
              )}

              {ruleDrawerData.type === 'region-trigger' && (
                <>
                  <p className="drawer-summary">该区划的规则触发、预警疑点和确认问题情况统计。</p>
                  <section className="drawer-section">
                    <div className="drawer-section-title">基本信息</div>
                    <div className="drawer-distribution">
                      <div className="drawer-stat">
                        <span>区划名称</span>
                        <strong>{ruleDrawerData.data.regionName}</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>关注状态</span>
                        <strong>{ruleDrawerData.data.attentionLevel}</strong>
                      </div>
                      <div className="drawer-stat">
	                        <span>预警疑点</span>
	                        <strong>{ruleDrawerData.data.warningCount}条</strong>
                      </div>
                    </div>
                  </section>
                  <section className="drawer-section">
                    <div className="drawer-section-title">触发统计</div>
                    <div className="drawer-distribution">
                      <div className="drawer-stat">
                        <span>命中规则数</span>
                        <strong>{ruleDrawerData.data.triggeredRuleCount}条</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>确认问题</span>
                        <strong>{ruleDrawerData.data.confirmedIssueCount}个</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>问题金额</span>
                        <strong>{ruleDrawerData.data.problemAmountText}</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>高频规则</span>
                        <strong>{ruleDrawerData.data.topRule.ruleName}</strong>
                      </div>
                    </div>
                  </section>
                  <section className="drawer-section">
                    <div className="drawer-section-title">说明</div>
                    <p className="drawer-summary">{ruleDrawerData.data.reason}</p>
                  </section>
                </>
              )}

              {ruleDrawerData.type === 'clue-conversion' && (
                <>
                  <p className="drawer-summary">该行用于观察预警疑点核实后转化为确认问题的情况。</p>
                  <section className="drawer-section">
                    <div className="drawer-section-title">转化统计</div>
                    <div className="drawer-distribution">
                      <div className="drawer-stat">
                        <span>预警疑点</span>
                        <strong>{ruleDrawerData.data.warningCount}条</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>已核实疑点</span>
                        <strong>{ruleDrawerData.data.verifiedClueCount}条</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>确认问题</span>
                        <strong>{ruleDrawerData.data.confirmedIssueCount}个</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>转问题率</span>
                        <strong>{formatPercent(ruleDrawerData.data.conversionRate)}</strong>
                      </div>
                    </div>
                  </section>
                  <section className="drawer-section">
                    <div className="drawer-section-title">主要规则</div>
                    <p className="drawer-summary">{ruleDrawerData.data.mainRule}</p>
                  </section>
                </>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
