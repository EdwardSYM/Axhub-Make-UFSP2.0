/**
 * @name 本级监督分析
 */
import './style.css';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { CalendarDays, ChevronLeft, ChevronRight, Info, RefreshCw, X } from 'lucide-react';
import TopBar from '../../common/components/TopBar';

type TimeRange = '今日' | '昨日' | '本月' | '本季度' | '本年' | '自定义';
type MonitorCategory = '全部' | '业务监控' | '专题监控';
type DetailTab = '主体主题明细' | '异常数据明细' | '规则触发明细';
type RiskLevel = '低风险' | '较低风险' | '中风险' | '较高风险' | '高风险';
type MapRiskLevel = '高风险' | '中风险' | '低风险';
type MapMetric = '风险指数' | '评价得分' | '异常率' | '退回率' | '闭环率';
type RuleAnalysisTab = '规则触发分析' | '预警疑点分析' | '确认问题分析' | '案例沉淀分析' | '明细追溯';
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
  comprehensiveScore: number;
  evaluationScore: number;
  problemAmountScore: number;
  problemCountScore: number;
  warningScore: number;
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
  caseCount: number;
  lowThemes: string[];
  attentionLevel: AttentionLevel;
  attentionScore: number;
  reason: string;
}

interface AttentionTheme {
  monitorTheme: string;
  monitorCategory: Exclude<MonitorCategory, '全部'>;
  comprehensiveScore: number;
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
  policyCoverage: string;
  systemCompleteness: number;
  attentionLevel: AttentionLevel;
  attentionScore: number;
  reason: string;
}

interface MetricCard {
  title: string;
  value: string | number;
  unit: string;
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
  entries?: DrawerEntryItem[];
  filters?: Array<{ label: string; value: string }>;
  table?: {
    columns: Array<{ key: string; label: string }>;
    rows: Array<Record<string, string | number>>;
  };
  detailModules?: Array<{ title: string; content: string }>;
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
  isTypical: string;
  status: '已入库' | '已发布' | '已审核待发布';
  storedAt: string;
}

const DATA_UPDATED_AT = '2026年5月14日 15:00';

const timeRanges: TimeRange[] = ['今日', '昨日', '本月', '本季度', '本年', '自定义'];
const calendarWeekdays = ['一', '二', '三', '四', '五', '六', '日'];
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
const adminRegions = ['湖南省全辖', '省本级', ...cityRegions, ...Object.keys(countyParentMap)];
const localAdminRegionOptions = [
  { value: '省本级', label: '湖南省本级', level: 0 },
  ...cityRegions.flatMap((city) => [
    { value: city, label: `${city}本级`, level: 1 },
    ...Object.entries(countyParentMap)
      .filter(([, parent]) => parent === city)
      .map(([county]) => ({ value: county, label: `${county}本级`, level: 2 })),
  ]),
];
const businessThemes = ['基础信息', '项目库', '预算编制', '预算批复', '预算调整调剂', '指标管理', '预算执行', '资产管理', '会计核算'];
const specialThemes = ['地方政府债务', '高标准农田建设资金使用', '行政事业单位国有资产处置', '减税降费政策落实', '违规返还财政收入', '三保', '三公', '一卡通'];
const supervisionCategoryOptions: SupervisionCategory[] = ['日常监督', '专项监督'];
const mapMetricsAllThemes: MapMetric[] = ['风险指数', '异常率', '退回率', '闭环率'];
const mapMetricsSpecificTheme: MapMetric[] = ['评价得分', '异常率', '退回率', '闭环率'];
const detailTabs: DetailTab[] = ['主体主题明细', '异常数据明细', '规则触发明细'];
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

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year || 2026, (month || 1) - 1, day || 1);
}

function formatDateDisplay(value: string) {
  const date = parseDateValue(value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatCalendarMonth(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function shiftCalendarMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function buildCalendarCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const previousMonthDays = new Date(year, month, 0).getDate();
  const currentMonthDays = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: 42 }, (_, index) => {
    const dayIndex = index - startOffset + 1;
    const cellDate = dayIndex <= 0
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

function getMedianScore(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
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

function getAttentionLevel(score: number): AttentionLevel {
  if (!Number.isFinite(score)) return '暂无数据';
  if (score < 60) return '高关注';
  if (score < 80) return '中关注';
  if (score >= 80) return '低关注';
  return '暂无数据';
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

function getLocalRegionLabel(regionName: string | null) {
  if (!regionName || regionName === '省本级') return '湖南省本级';
  return localAdminRegionOptions.find((item) => item.value === regionName)?.label || `${regionName}本级`;
}

function getMatrixAttentionLevel(score: number | null, warningCount: number): AttentionLevel {
  if (score === null) return '暂无数据';
  if (score < 70 || warningCount >= 100) return '高关注';
  if (score < 80 || warningCount >= 50) return '中关注';
  return '低关注';
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
        caseName: `${row.subjectName}${row.monitorTheme}监督案例${idx + 1}`,
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

const provincialLocalSubjectSeeds: SubjectThemeScore[] = [
  { subjectName: '省直预算单位D', regionName: '省本级', subjectType: '预算单位', monitorCategory: '业务监控', monitorTheme: '预算执行', themeScore: 58, themeWeight: 1, subjectWeight: 1, riskLevel: '高风险', lowScoreIndicators: ['支付疑点核实处置'], abnormalCount: 112, interceptCount: 16, closedLoopRate: 72.4, mainDeductionReason: '预算执行疑点集中，资金支付控制和核实反馈压力较大。' },
  { subjectName: '省教育厅', regionName: '省本级', subjectType: '主管部门', monitorCategory: '业务监控', monitorTheme: '预算编制', themeScore: 66, themeWeight: 1, subjectWeight: 1, riskLevel: '较高风险', lowScoreIndicators: ['项目入库完整性'], abnormalCount: 88, interceptCount: 10, closedLoopRate: 78.2, mainDeductionReason: '项目库资料补正项较多，影响预算编制质量。' },
  { subjectName: '省民政厅', regionName: '省本级', subjectType: '主管部门', monitorCategory: '专题监控', monitorTheme: '一卡通', themeScore: 64, themeWeight: 1, subjectWeight: 1, riskLevel: '较高风险', lowScoreIndicators: ['补贴发放异常核验'], abnormalCount: 92, interceptCount: 13, closedLoopRate: 75.8, mainDeductionReason: '补贴发放异常核验事项偏多，闭环反馈不够稳定。' },
  { subjectName: '省农业农村厅', regionName: '省本级', subjectType: '主管部门', monitorCategory: '专题监控', monitorTheme: '高标准农田建设资金使用', themeScore: 69, themeWeight: 1, subjectWeight: 1, riskLevel: '较高风险', lowScoreIndicators: ['项目资金拨付合规性'], abnormalCount: 78, interceptCount: 11, closedLoopRate: 77.6, mainDeductionReason: '项目资金拨付和验收材料反馈偏慢。' },
  { subjectName: '省交通运输厅', regionName: '省本级', subjectType: '主管部门', monitorCategory: '业务监控', monitorTheme: '项目库', themeScore: 71, themeWeight: 1, subjectWeight: 1, riskLevel: '中风险', lowScoreIndicators: ['项目入库资料完整性'], abnormalCount: 64, interceptCount: 8, closedLoopRate: 81.4, mainDeductionReason: '项目库基础资料完整性仍需持续补齐。' },
  { subjectName: '省财政厅预算处', regionName: '省本级', subjectType: '财政部门', monitorCategory: '业务监控', monitorTheme: '指标管理', themeScore: 62, themeWeight: 1, subjectWeight: 1, riskLevel: '较高风险', lowScoreIndicators: ['指标下达完整性'], abnormalCount: 104, interceptCount: 14, closedLoopRate: 74.6, mainDeductionReason: '指标下达链路补录事项较多，规则识别疑点集中。' },
];

const localMatrixThemeMeta: Record<string, { indicator: string; reason: string }> = {
  基础信息: { indicator: '基础数据完整性', reason: '基础数据维护存在缺项，影响后续规则识别准确性。' },
  项目库: { indicator: '项目入库资料完整性', reason: '项目入库资料补正项较多，项目储备质量需继续核查。' },
  预算编制: { indicator: '预算编制规范性', reason: '预算编制材料完整性和项目衔接仍需补齐。' },
  预算批复: { indicator: '批复及时性', reason: '预算批复节点反馈不够稳定，存在跨期补录事项。' },
  预算调整调剂: { indicator: '调剂审批链路完整性', reason: '预算调整调剂审批链路存在补录和退回事项。' },
  指标管理: { indicator: '指标下达完整性', reason: '指标下达附件补录不够及时，规则识别疑点偏多。' },
  预算执行: { indicator: '支付疑点核实处置', reason: '预算执行支付疑点反馈周期偏长，资金支付控制压力较大。' },
  资产管理: { indicator: '资产台账完整性', reason: '资产台账更新和处置审批材料仍有缺项。' },
  会计核算: { indicator: '科目使用规范性', reason: '会计核算科目使用说明需补充，疑点核实仍需跟踪。' },
  地方政府债务: { indicator: '债务风险指标异常核验', reason: '债务风险指标核验反馈不够及时，需持续关注。' },
  高标准农田建设资金使用: { indicator: '项目资金拨付合规性', reason: '项目拨付进度和验收资料反馈偏慢。' },
  行政事业单位国有资产处置: { indicator: '资产处置审批完整性', reason: '资产处置审批附件、会议纪要等材料缺项。' },
  减税降费政策落实: { indicator: '政策落实数据一致性', reason: '政策兑现台账与业务数据存在差异。' },
  违规返还财政收入: { indicator: '收入返还合规性', reason: '收入返还线索核验闭环压力较大。' },
  三保: { indicator: '三保资金保障预警', reason: '三保保障指标反馈和处置闭环偏慢。' },
  三公: { indicator: '公务支出合规性', reason: '公务支出说明材料退回较多，需持续核验。' },
  一卡通: { indicator: '补贴发放异常核验', reason: '补贴发放异常核验积压，反馈材料不完整。' },
};

const localSubjectThemePlans: Record<string, string[]> = {
  省直预算单位A: ['资产管理', '预算执行', '预算调整调剂', '会计核算', '行政事业单位国有资产处置', '三公', '项目库'],
  省直预算单位B: ['预算批复', '预算执行', '指标管理', '项目库', '三保', '预算编制'],
  省直预算单位C: ['会计核算', '资产管理', '预算执行', '基础信息', '减税降费政策落实', '一卡通'],
  省直预算单位D: ['预算执行', '资产管理', '预算批复', '预算调整调剂', '违规返还财政收入', '三公', '基础信息'],
  省教育厅: ['预算编制', '项目库', '预算执行', '指标管理', '三保', '会计核算'],
  省民政厅: ['一卡通', '预算执行', '三保', '预算批复', '基础信息', '会计核算'],
  省农业农村厅: ['高标准农田建设资金使用', '项目库', '预算执行', '资产管理', '指标管理', '预算调整调剂'],
  省交通运输厅: ['项目库', '预算执行', '预算调整调剂', '资产管理', '地方政府债务', '指标管理'],
  省财政厅预算处: ['指标管理', '预算批复', '预算执行', '预算编制', '地方政府债务', '三保', '预算调整调剂'],
};

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

function buildSubjectSummaries(rows: SubjectThemeScore[], sortMetric: MapMetric = '风险指数'): SubjectSummary[] {
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
      case '风险指数':
        return b.comprehensiveScore - a.comprehensiveScore;
      case '评价得分':
        return a.comprehensiveScore - b.comprehensiveScore;
      case '异常率':
        return b.abnormalCount - a.abnormalCount;
      case '退回率':
        return (b.reviewRejectCount || 0) - (a.reviewRejectCount || 0);
      case '闭环率':
        return a.closedLoopRate - b.closedLoopRate;
      default:
        return b.comprehensiveScore - a.comprehensiveScore;
    }
  });
}

function buildAttentionSubjects(rows: SubjectThemeScore[]): AttentionSubject[] {
  const grouped = rows.reduce<Record<string, SubjectThemeScore[]>>((acc, row) => {
    acc[row.subjectName] = acc[row.subjectName] || [];
    acc[row.subjectName].push(row);
    return acc;
  }, {});

  const baseRows = Object.values(grouped).map((items) => {
    const first = items[0];
    const uniqueThemes = Array.from(new Set(items.map((item) => item.monitorTheme)));
    const lowThemes = Array.from(new Set(items.filter((item) => item.themeScore < 70).map((item) => item.monitorTheme)));
    const averageScore = items.reduce((sum, item) => sum + item.themeScore, 0) / items.length;
    const warningCount = items.reduce((sum, item) => sum + item.abnormalCount, 0);
    const lowThemeRatio = getRatioPercent(lowThemes.length, Math.max(uniqueThemes.length, 1), 1);
    const triggeredRuleCount = Math.max(1, Math.round(warningCount / 28) + lowThemes.length * 2);
    const verifiedClueCount = Math.round(warningCount * 0.76);
    const confirmedIssueCount = getMockConfirmedIssueCount(warningCount);
    const pendingClueCount = Math.max(0, warningCount - verifiedClueCount);
    const issueConversionRate = getRatioPercent(confirmedIssueCount, verifiedClueCount, 1);
    const problemAmount = getMockProblemAmount(warningCount, confirmedIssueCount, lowThemes.length || uniqueThemes.length);
    const lowestRows = [...items].sort((a, b) => a.themeScore - b.themeScore).slice(0, 2);

    return {
      subjectName: first.subjectName,
      regionName: first.regionName,
      subjectType: first.subjectType,
      items,
      averageScore,
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
      caseCount: getMockFormedCaseCount(warningCount, confirmedIssueCount, lowThemes.length || uniqueThemes.length),
      lowThemes,
      reason: lowestRows.length
        ? `低分主题集中在${lowestRows.map((row) => row.monitorTheme).join('、')}，${lowestRows[0].mainDeductionReason}`
        : '当前主体低分主题较少，作为普通跟踪对象。',
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
    b.lowThemeCount - a.lowThemeCount ||
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
    const coveredSubjects = Array.from(new Set(items.map((item) => item.subjectName)));
    const lowSubjects = Array.from(new Set(items.filter((item) => item.themeScore < 70).map((item) => item.subjectName)));
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
      policyCoverage,
      systemCompleteness,
      reason: lowSubjects.length
        ? `${lowSubjects.slice(0, 3).join('、')}等部门/单位得分偏低，确认问题和预警疑点需继续核查。`
        : '当前主题低分主体较少，保持常态跟踪。',
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
      attentionLevel: getAttentionLevel(comprehensiveScore),
      attentionScore: comprehensiveScore,
    };
  }).sort((a, b) => (
    a.comprehensiveScore - b.comprehensiveScore ||
    b.problemAmount - a.problemAmount ||
    b.confirmedIssueCount - a.confirmedIssueCount ||
    b.lowSubjectCount - a.lowSubjectCount ||
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

function getLocalMatrixScoreOffset(subjectName: string, monitorTheme: string) {
  const hash = Array.from(`${subjectName}-${monitorTheme}`).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ((hash % 15) - 7) * 0.9;
}

function getLocalSubjectThemePlan(baseRow: SubjectThemeScore, index: number) {
  if (localSubjectThemePlans[baseRow.subjectName]) {
    return localSubjectThemePlans[baseRow.subjectName];
  }

  if (baseRow.subjectType.includes('财政')) {
    return ['指标管理', '预算执行', '预算编制', '预算批复', '预算调整调剂', '地方政府债务', '三保'];
  }

  if (baseRow.subjectType.includes('预算单位')) {
    return ['资产管理', '会计核算', '预算执行', '预算批复', '项目库', '三公'];
  }

  const defaultPlans = [
    ['预算执行', '项目库', '资产管理', '预算调整调剂', '指标管理', '三保'],
    ['预算编制', '预算执行', '会计核算', '基础信息', '预算批复', '一卡通'],
    ['资产管理', '项目库', '预算执行', '行政事业单位国有资产处置', '指标管理', '三公'],
  ];
  return defaultPlans[index % defaultPlans.length];
}

function expandLocalSubjectThemeRows(rows: SubjectThemeScore[]): SubjectThemeScore[] {
  const seededRows = rows.some((row) => row.regionName === '省本级')
    ? [
        ...rows,
        ...provincialLocalSubjectSeeds.filter((seed) => !rows.some((row) => row.subjectName === seed.subjectName)),
      ]
    : rows;

  const grouped = seededRows.reduce<Record<string, SubjectThemeScore[]>>((acc, row) => {
    acc[row.subjectName] = acc[row.subjectName] || [];
    acc[row.subjectName].push(row);
    return acc;
  }, {});

  return Object.values(grouped).flatMap((items, subjectIndex) => {
    const baseRow = items[0];
    const existingThemes = new Set(items.map((item) => item.monitorTheme));
    const averageBaseScore = items.reduce((sum, item) => sum + item.themeScore, 0) / items.length;
    const plannedThemes = getLocalSubjectThemePlan(baseRow, subjectIndex);
    const extraRows = plannedThemes
      .filter((theme) => !existingThemes.has(theme))
      .map((theme, themeIndex) => {
        const meta = localMatrixThemeMeta[theme] || {
          indicator: `${theme}低分指标`,
          reason: `${theme}相关预警和问题线索需继续核查。`,
        };
        const monitorCategory: Exclude<MonitorCategory, '全部'> = businessThemes.includes(theme) ? '业务监控' : '专题监控';
        const themeScore = clampScore(averageBaseScore + getLocalMatrixScoreOffset(baseRow.subjectName, theme) - (themeIndex % 3) * 1.4);
        const attentionPressure = themeScore < 60 ? 1.25 : themeScore < 70 ? 1.08 : 0.82;
        const abnormalCount = Math.max(16, Math.round((baseRow.abnormalCount * 0.72 + (themeIndex + 1) * 9) * attentionPressure));
        const interceptCount = Math.max(2, Math.round((baseRow.interceptCount * 0.7 + themeIndex + 2) * attentionPressure));
        const closedLoopRate = clampScore(baseRow.closedLoopRate + (themeScore - averageBaseScore) * 0.36 - themeIndex * 0.3);

        return {
          ...baseRow,
          monitorCategory,
          monitorTheme: theme,
          themeScore,
          riskLevel: riskByScore(themeScore),
          lowScoreIndicators: [meta.indicator],
          abnormalCount,
          interceptCount,
          closedLoopRate,
          mainDeductionReason: meta.reason,
        };
      });

    return [...items, ...extraRows];
  });
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

function buildLocalLevelScoreRows(regionName: string): SubjectThemeScore[] {
  if (regionName === '省本级') {
    return subjectThemeScores.filter((row) => row.regionName === '省本级');
  }

  const offset = getAreaOffset(regionName);
  const cityRows = subjectThemeScores
    .filter((row) => row.regionName === regionName)
    .map((row, index) => {
      const themeScore = clampScore(row.themeScore + offset * 0.25 - (index % 2) * 0.9);
      return {
        ...row,
        subjectName: row.subjectName.includes('财政局') ? `${regionName}财政局` : row.subjectName,
        regionName,
        subjectType: row.subjectType === '市州财政' ? '财政部门' : row.subjectType,
        themeScore,
        riskLevel: riskByScore(themeScore),
        abnormalCount: Math.max(10, Math.round(row.abnormalCount * (0.72 + Math.abs(offset) / 28))),
        interceptCount: Math.max(1, Math.round(row.interceptCount * (0.72 + Math.abs(offset) / 32))),
        closedLoopRate: clampScore(row.closedLoopRate + offset * 0.35),
      };
    });

  const departmentRows = countySubjectTemplates.map((template, index) => {
    const themeScore = clampScore(template.baseScore + offset * 0.45 - (index % 3) * 0.8);
    return {
      subjectName: `${regionName}${template.suffix}`,
      regionName,
      subjectType: template.subjectType === '区县财政' ? '财政部门' : template.subjectType,
      monitorCategory: template.monitorCategory,
      monitorTheme: template.monitorTheme,
      themeScore,
      themeWeight: 1,
      subjectWeight: 1,
      riskLevel: riskByScore(themeScore),
      lowScoreIndicators: [template.indicator],
      abnormalCount: Math.max(8, Math.round(template.abnormalCount * (0.72 + Math.abs(offset) / 28))),
      interceptCount: Math.max(1, Math.round(template.interceptCount * (0.72 + Math.abs(offset) / 32))),
      closedLoopRate: clampScore(template.closedLoopRate + offset * 0.35),
      mainDeductionReason: template.reason,
    };
  });

  return [...cityRows, ...departmentRows];
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

function getMapAreaValue(area: MapAreaFeature, metric: MapMetric, isAllThemes = true) {
  const parent = regionScores.find((region) => region.regionName === area.parentRegion);
  if (!parent) return 0;
  const score = clampScore(parent.comprehensiveScore + area.scoreOffset);
  if (metric === '风险指数' || (!isAllThemes && metric === '评价得分')) return 100 - score;
  if (isAllThemes && metric === '评价得分') return score;
  if (metric === '异常率') return Math.round((parent.abnormalCount / parent.abnormalTotalCount) * 10000) / 100;
  if (metric === '退回率') return Math.round((parent.reviewRejectCount / parent.reviewSubmitCount) * 10000) / 100;
  if (metric === '闭环率') return Math.min(100, Math.max(30, Math.round(parent.closedLoopRate + area.scoreOffset * 0.8)));
  return score;
}

function getMapRiskLevel(score: number): MapRiskLevel {
  if (score < 70) return '高风险';
  if (score < 85) return '中风险';
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

function getAreaSummary(area: MapAreaFeature, metric: MapMetric) {
  const parent = regionScores.find((region) => region.regionName === area.parentRegion);
  if (!parent || area.hasData === false) return null;
  const score = clampScore(parent.comprehensiveScore + area.scoreOffset);
  const mapRiskLevel = getMapRiskLevel(score);
  return {
    score,
    mapRiskLevel,
    value: getMapAreaValue(area, metric),
    parent,
  };
}

function getMetricMapRiskLevel(summary: ReturnType<typeof getAreaSummary>, metric: MapMetric): MapRiskLevel {
  if (!summary) return '低风险';
  if (metric === '异常率' || metric === '退回率') {
    if (summary.value >= 8) return '高风险';
    if (summary.value >= 4) return '中风险';
    return '低风险';
  }
  if (metric === '闭环率') {
    if (summary.value < 78) return '高风险';
    if (summary.value < 88) return '中风险';
    return '低风险';
  }
  return summary.mapRiskLevel;
}

function getAreaColor(area: MapAreaFeature, metric: MapMetric, min: number, max: number, isAllThemes: boolean) {
  const summary = getAreaSummary(area, metric);
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
    const values = safeAreaData.map((area) => getMapAreaValue(area, metric, isAllThemes));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mapName = isCityView ? `hunan-city-${viewRegion}` : 'hunan-province';
    if (isCityView) {
      const cityFeatures = districtGeoJson.features.filter((feature) => getParentRegion(feature.properties) === viewRegion);
      echarts.registerMap(mapName, { ...districtGeoJson, features: cityFeatures } as EChartsGeoJson);
    }
    const rankedAreas = [...safeAreaData].sort((a, b) => getMapAreaValue(b, '风险指数', true) - getMapAreaValue(a, '风险指数', true));
    const data = safeAreaData.map((area) => {
      const summary = getAreaSummary(area, metric);
      const isHighlighted = area.name === (highlightedArea || selectedArea) || (Boolean(viewRegion) && highlightedArea === viewRegion);
      return {
        name: area.name,
        value: summary ? summary.value : 0,
        itemStyle: {
          areaColor: getAreaColor(area, metric, min, max, isAllThemes),
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
          const summary = area ? getAreaSummary(area, metric) : null;
          if (!area || !summary) {
            return `<div class="map-tooltip"><strong>${params.name}</strong><span>暂无评分数据</span></div>`;
          }
          const rank = Math.max(1, rankedAreas.findIndex((item) => item.name === area.name) + 1);
          const attentionLabel = getMapAttentionLabel(summary.mapRiskLevel);
          const lowThemeText = summary.parent.mainLowThemes.slice(0, 2).join('、') || '暂无明显低分主题';
          const conversionRate = getRatioPercent(Math.round(summary.parent.abnormalCount * 0.32), Math.round(summary.parent.abnormalCount * 0.76), 1);
          const problemAmount = formatWanAmount(summary.parent.abnormalCount * 9.6 + summary.parent.highRiskThemes * 220);

          return `
            <div class="map-tooltip">
              <strong>${params.name}</strong>
              ${isCityView ? `<span>所属市州：${summary.parent.regionName}</span>` : ''}
              <span>关注状态：${attentionLabel}</span>
              <span>关注排序：第 ${rank} 位</span>
              <span>低分主题：${summary.parent.highRiskThemes || 2} 个｜${lowThemeText}</span>
              <span>触发规则：${summary.parent.interceptCount + summary.parent.highRiskThemes * 2} 条</span>
              <span>预警疑点：${summary.parent.abnormalCount} 条</span>
              <span>疑点转问题率：${formatRateValue(conversionRate, 1)}%</span>
              <span>确认问题金额：${problemAmount}</span>
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
  }, [districtAreas, districtGeoJson, highlightedArea, isAllThemes, mapVersion, metric, onCitySelect, onCountySelect, provinceAreas, provinceGeoJson, regions, selectedArea, viewRegion]);

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

export default function LocalSupervisionAnalysisPrototype() {
  const [timeRange, setTimeRange] = useState<TimeRange>('本月');
  const [customStart, setCustomStart] = useState('2026-05-01');
  const [customEnd, setCustomEnd] = useState('2026-05-14');
  const [adminRegion, setAdminRegion] = useState('省本级');
  const [selectedRegion, setSelectedRegion] = useState<string | null>('省本级');
  const [selectedMapArea, setSelectedMapArea] = useState<string | null>(null);
  const [analysisShape, setAnalysisShape] = useState<AnalysisShape>('unit');
  const [supervisionCategory, setSupervisionCategory] = useState<SupervisionCategory>('日常监督');
  const [monitorCategory, setMonitorCategory] = useState<MonitorCategory>('全部');
  const [monitorTheme, setMonitorTheme] = useState('全部');
  const [subjectType, setSubjectType] = useState<SubjectTypeFilter>('全部');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [mapMetric, setMapMetric] = useState<MapMetric>('风险指数');
  const [mapResetToken, setMapResetToken] = useState(0);
  const [detailTab, setDetailTab] = useState<DetailTab>('主体主题明细');
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
    type: 'rule-type' | 'high-frequency-rule' | 'subject-trigger';
    data: any;
  } | null>(null);
  const [hoveredThemeMetric, setHoveredThemeMetric] = useState<{ theme: ThemePosture; metric: ThemeHoverMetric } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const regionParam = params.get('region');
    if (!regionParam) return;
    const normalizedRegion = regionParam === '湖南省本级' ? '省本级' : regionParam;
    if (!localAdminRegionOptions.some((item) => item.value === normalizedRegion)) return;

    setAdminRegion(normalizedRegion);
    setAnalysisShape('unit');
    if (countyParentMap[normalizedRegion]) {
      setSelectedRegion(countyParentMap[normalizedRegion]);
      setSelectedMapArea(normalizedRegion);
    } else {
      setSelectedRegion(normalizedRegion);
      setSelectedMapArea(null);
    }
  }, []);

  const activeRegion = selectedRegion ?? adminRegion;
  const activeTheme = selectedTheme ?? (monitorTheme === '全部' ? null : monitorTheme);
  const isUnitAnalysisMode = analysisShape === 'unit';
  const activeMapRegion = !isUnitAnalysisMode && activeRegion && activeRegion !== '省本级' ? activeRegion : null;
  const primaryMetricTitle = activeTheme ? '主题评价得分' : '关注状态';
  const primaryMetricDescription = activeTheme
    ? `当前区划 / 当前主体范围 × ${activeTheme}主题的评价得分，用于判断该主题在当前范围内是否需要重点关注。`
    : '当前统计范围内，围绕日常监督主题低分、规则触发、预警疑点和异常数据形成的关注判断结果。';
  const primaryMetricTrend = activeTheme ? '较上期需关注程度下降' : '较上期需关注程度上升';
  const primaryMetricTrendDirection = activeTheme ? 'down' : 'up';

  const baseFilteredScoreRows = useMemo(() => {
    const regionScope = selectedMapArea || activeRegion;
    let sourceRows = subjectThemeScores;

	    // 根据层级生成对应数据
	    if (selectedMapArea && activeRegion && !subjectThemeScores.some((row) => row.regionName === selectedMapArea)) {
	      // 区县级：生成该区县数据
	      sourceRows = buildCountyScoreRows(activeRegion, selectedMapArea);
	    } else if (isUnitAnalysisMode && activeRegion && activeRegion !== '省本级' && !selectedMapArea) {
	      // 本级监督分析：市本级展示本级部门 / 单位，不合并下级区县
	      sourceRows = buildLocalLevelScoreRows(activeRegion);
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

    if (isUnitAnalysisMode) {
      sourceRows = expandLocalSubjectThemeRows(sourceRows);
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

  const subjectRankings = useMemo(() => buildSubjectSummaries(filteredScoreRows, mapMetric).slice(0, 20), [filteredScoreRows, mapMetric]);

  const hoveredRankingSubject = useMemo(() => {
    if (!hoveredSubjectName) return null;
    return subjectRankings.find((subject) => subject.subjectName === hoveredSubjectName) || null;
  }, [hoveredSubjectName, subjectRankings]);

  const selectedSubjectSummary = useMemo(() => {
    if (!selectedSubject) return null;
    return buildSubjectSummaries(filteredScoreRows, '风险指数')[0] || null;
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
	  const attentionThemes = useMemo(() => buildAttentionThemes(filteredScoreRows), [filteredScoreRows]);
	  const visibleAttentionSubjects = useMemo(() => attentionSubjects.filter((item) => item.attentionLevel !== '低关注').slice(0, 8), [attentionSubjects]);
	  const visibleAttentionThemes = useMemo(() => attentionThemes.filter((item) => item.attentionLevel !== '低关注').slice(0, 8), [attentionThemes]);
	  const currentLevelRegionName = activeRegion && activeRegion !== '省本级' ? activeRegion : '省本级';
	  const currentLevelSubject = useMemo(() => {
	    return attentionSubjects.find((item) => item.regionName === currentLevelRegionName)
	      || attentionSubjects.find((item) => item.regionName === '省本级')
	      || attentionSubjects[0]
	      || null;
	  }, [attentionSubjects, currentLevelRegionName]);
	  const matrixSubjects = useMemo(() => {
	    const source = selectedSubject
	      ? attentionSubjects.filter((subject) => subject.subjectName === selectedSubject)
	      : attentionSubjects;
	    return source.slice(0, selectedSubject ? 1 : 8);
	  }, [attentionSubjects, selectedSubject]);
	  const matrixThemes = useMemo(() => {
	    const source = selectedSubject ? attentionThemes : attentionThemes.filter((theme) => theme.attentionLevel !== '低关注');
	    return source.slice(0, selectedSubject ? 14 : 12);
	  }, [attentionThemes, selectedSubject]);
	  const focusMatrixRows = useMemo(() => matrixThemes.map((theme) => ({
	    theme,
	    cells: matrixSubjects.map((subject) => {
	      const scoreRow = filteredScoreRows.find((row) => row.subjectName === subject.subjectName && row.monitorTheme === theme.monitorTheme);
	      const warningCount = scoreRow ? scoreRow.abnormalCount + scoreRow.interceptCount : 0;
	      const verifiedClueCount = Math.round(warningCount * 0.76);
	      const confirmedIssueCount = Math.round(verifiedClueCount * (scoreRow && scoreRow.themeScore < 70 ? 0.38 : 0.24));
	      const issueConversionRate = getRatioPercent(confirmedIssueCount, verifiedClueCount, 1);
	      const problemAmount = scoreRow ? Number((scoreRow.abnormalCount * 9.8 + confirmedIssueCount * 36).toFixed(1)) : 0;
	      return {
	        subject,
	        scoreRow,
	        attentionLevel: getMatrixAttentionLevel(scoreRow?.themeScore ?? null, warningCount),
	        warningCount,
	        issueConversionRate,
	        problemAmountText: problemAmount ? formatWanAmount(problemAmount) : '暂无',
	      };
	    }),
	  })), [filteredScoreRows, matrixSubjects, matrixThemes]);

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

	  const currentAreaText = useMemo(() => {
	    if (isUnitAnalysisMode) {
	      if (selectedMapArea && activeRegion) return getLocalRegionLabel(selectedMapArea);
	      return getLocalRegionLabel(activeRegion);
	    }
	    return selectedMapArea && activeRegion && selectedMapArea !== activeRegion ? `${activeRegion} / ${selectedMapArea}` : activeRegion || '全省';
	  }, [activeRegion, isUnitAnalysisMode, selectedMapArea]);

  const metrics = useMemo<MetricCard[]>(() => {
    const rows = filteredScoreRows;
    const warningCount = rows.reduce((sum, row) => sum + row.abnormalCount, 0);
    const confirmedIssueCount = attentionSubjects.reduce((sum, subject) => sum + subject.confirmedIssueCount, 0);
    const problemAmount = attentionSubjects.reduce((sum, subject) => sum + subject.problemAmount, 0);
    const formedCaseCount = buildFormedCaseRecords(rows).length;
    const themeAverageScore = rows.length ? rows.reduce((sum, row) => sum + row.themeScore, 0) / rows.length : 0;
    const highAttentionSubjectCount = attentionSubjects.filter((subject) => subject.attentionLevel === '高关注').length;
    const highAttentionThemeCount = attentionThemes.filter((theme) => theme.attentionLevel === '高关注').length;
    const lowSubjectCount = attentionSubjects.filter((subject) => subject.evaluationScore < 70 || subject.lowThemeCount > 0).length;

    if (activeTheme) {
      return [
        {
          title: '平均分',
          value: rows.length ? formatScore(themeAverageScore) : '--',
          unit: rows.length ? '分' : '',
          emphasis: 'score',
          description: '当前主题下，本级部门 / 单位的评价得分平均值。',
          aiConclusion: '单主题口径下用于横向比较部门 / 单位表现。',
          hoverExplanation: {
            calculationFormula: '平均分 = 当前主题下各部门 / 单位评价得分平均值',
            additionalInfo: '仅在选择具体监督主题后展示，不作为跨主题综合评分。',
            scope: `${currentAreaText} / ${supervisionCategory} / ${activeTheme}`,
          },
        },
        {
          title: '低分部门/单位数',
          value: rows.length ? lowSubjectCount : '--',
          unit: rows.length ? '个' : '',
          emphasis: 'risk',
          description: '当前主题下低于阈值或命中关注条件的部门 / 单位数量。',
          aiConclusion: '优先查看低分指标较多、确认问题较多或金额较大的部门 / 单位。',
          hoverExplanation: {
            calculationFormula: '按主题得分、低分指标数、确认问题和预警疑点综合识别',
            additionalInfo: '该指标只在同一主题评价体系下比较部门 / 单位表现。',
            scope: `${currentAreaText} / ${activeTheme}`,
          },
        },
        {
          title: '预警疑点数量',
          value: rows.length ? warningCount.toLocaleString('zh-CN') : '--',
          unit: rows.length ? '条' : '',
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
          unit: rows.length ? '个' : '',
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
        title: '高关注部门/单位数',
        value: rows.length ? highAttentionSubjectCount : '--',
        unit: rows.length ? '个' : '',
        emphasis: 'risk',
        description: '当前本级范围内综合表现分低于 60 分的部门 / 单位数量。',
        aiConclusion: '优先查看确认问题金额大、问题数量多或评价表现偏弱的部门 / 单位。',
        hoverExplanation: {
          calculationFormula: '综合表现分 < 60 分的部门 / 单位数量',
          additionalInfo: '综合表现分为静态原型展示口径，用于本级关注分层、颜色和排序。',
          scope: `${currentAreaText} / ${supervisionCategory} / ${activeTheme || '全部日常主题'}`,
        },
      },
      {
        title: '高关注主题数',
        value: rows.length ? highAttentionThemeCount : '--',
        unit: rows.length ? '个' : '',
        emphasis: 'risk',
        description: '当前本级范围内综合表现分低于 60 分的日常监督主题数量。',
        aiConclusion: '优先查看平均分低、中位分低、低分部门 / 单位多或确认问题金额较大的主题。',
        hoverExplanation: {
          calculationFormula: '按平均分、中位分、低分部门 / 单位、预警疑点、确认问题和确认金额识别高关注主题',
          additionalInfo: '主题侧优先使用评分分布和问题证据辅助研判。',
          scope: `${currentAreaText} / ${supervisionCategory}`,
        },
      },
      {
        title: '预警疑点数量',
        value: rows.length ? warningCount.toLocaleString('zh-CN') : '--',
        unit: rows.length ? '条' : '',
        emphasis: 'evidence',
        description: '当前本级范围内日常监督规则识别出的预警疑点数量。',
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
        unit: rows.length ? '个' : '',
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
  }, [activeTheme, attentionSubjects, attentionThemes, currentAreaText, filteredScoreRows, supervisionCategory]);

	  const currentScopeAreaText = currentAreaText === '全省' ? '湖南省' : currentAreaText;
	  const currentTimeText = timeRange === '自定义' ? `${formatDateDisplay(customStart)} 至 ${formatDateDisplay(customEnd)}` : timeRange;
	  const currentPositionText = `当前统计口径：${currentTimeText}｜${currentScopeAreaText}｜${supervisionCategory}｜${activeTheme || '全部日常主题'}｜数据更新时间：${DATA_UPDATED_AT}`;
	  const isSubjectFocus = Boolean(selectedSubjectSummary);
	  const mapLayerText = isSubjectFocus ? '主体关注摘要' : activeMapRegion ? '市本级 + 区县' : '省本级 + 各市州';
	  const mapSelectedText = currentAreaText === '全省' ? '湖南省全辖' : currentAreaText;
	  const mapPanelNote = isUnitAnalysisMode
	    ? `当前区划：${mapSelectedText}${selectedSubject ? `｜已选：${selectedSubject}` : ''}`
	    : `当前区划：${mapSelectedText}｜展示对象：${mapLayerText}｜颜色表示关注程度`;
	  const mapPanelTitle = isUnitAnalysisMode ? '部门 / 单位关注分布' : isSubjectFocus ? '主体关注摘要' : '区划关注分布';
	  const highlightedMapArea = selectedSubjectSummary?.regionName || selectedMapArea || null;
	  const adminRegionOptions = useMemo(() => {
	    return localAdminRegionOptions;
	  }, [selectedMapArea]);
  const selectedAdminRegionLabel = useMemo(() => {
    return adminRegionOptions.find((item) => item.value === adminRegion)?.label || getLocalRegionLabel(adminRegion);
  }, [adminRegion, adminRegionOptions]);
  const selectedMonitorThemeLabel = monitorTheme === '全部'
    ? (supervisionCategory === '日常监督' ? '全部日常主题' : '专项主题待补充')
    : monitorTheme;
  const bottomWarningRows = useMemo(() => visibleAbnormalDetails.slice(0, 10).map((item, index) => ({
    clueCode: `YD-${String(202605000 + index + 1).slice(-7)}`,
    monitorTheme: item.monitorTheme,
    subjectName: item.subjectName,
    ruleName: item.ruleName,
    description: item.linkedIndicator,
    amount: item.amount,
    status: item.currentStatus,
    confirmed: index % 3 === 0 ? '是' : '否',
    triggerTime: item.triggerTime,
  })), [visibleAbnormalDetails]);
  const bottomIssueRows = useMemo(() => attentionSubjects.filter((item) => item.confirmedIssueCount > 0).slice(0, 10).map((item, index) => ({
    issueCode: `WT-${String(202605000 + index + 1).slice(-7)}`,
    issueName: `${item.subjectName}${item.lowThemes[0] || '日常监督'}确认问题`,
    monitorTheme: item.lowThemes[0] || activeTheme || '预算执行',
    subjectName: item.subjectName,
    issueType: item.problemAmount > 3000 ? '资金类' : '管理类',
    source: `YD-${String(202605000 + index + 1).slice(-7)}`,
    amount: item.problemAmountText,
    caseFlag: item.caseCount > 0 ? '是' : '否',
    confirmedAt: `2026-05-${String(10 + index).padStart(2, '0')}`,
    relatedRule: buildHighFrequencyRules()[index % buildHighFrequencyRules().length]?.ruleName || '规则待补充',
  })), [activeTheme, attentionSubjects]);
  const bottomCaseRows = useMemo(() => buildFormedCaseRecords(filteredScoreRows).slice(0, 10), [filteredScoreRows]);
	  const metricDrawerData = useMemo<Record<string, MetricDrawerInfo>>(() => {
	    const rows = filteredScoreRows;
	    const subjectCount = uniqueCount(rows.map((row) => row.subjectName));
	    const themeCount = uniqueCount(rows.map((row) => row.monitorTheme));
	    const warningCount = rows.reduce((sum, row) => sum + row.abnormalCount, 0);
	    const confirmedIssueCount = attentionSubjects.reduce((sum, item) => sum + item.confirmedIssueCount, 0);
	    const problemAmount = attentionSubjects.reduce((sum, item) => sum + item.problemAmount, 0);
	    const affectedSubjectCount = attentionSubjects.filter((item) => item.confirmedIssueCount > 0).length;
	    const affectedThemeCount = uniqueCount(rows.filter((row) => row.abnormalCount > 0).map((row) => row.monitorTheme));
	    const formedCaseRecords = buildFormedCaseRecords(rows);
	    const formedCaseCount = formedCaseRecords.length;
	    const typicalCaseCount = formedCaseRecords.filter((item) => item.isTypical === '是').length;
	    const formedCaseThemeCount = uniqueCount(formedCaseRecords.map((item) => item.monitorTheme));
	    const formedCaseUnitCount = uniqueCount(formedCaseRecords.map((item) => item.relatedUnit));
	    const highAttentionSubjects = attentionSubjects.filter((item) => item.attentionLevel === '高关注');
	    const highAttentionThemes = attentionThemes.filter((item) => item.attentionLevel === '高关注');
	    const subjectConcernRows = attentionSubjects.slice(0, 10).map((item) => ({
	      subjectName: item.subjectName,
	      attentionLevel: item.attentionLevel,
	      comprehensiveScore: `${formatScore(item.comprehensiveScore)}分`,
	      evaluationScore: `${formatScore(item.evaluationScore)}分`,
	      amountScore: `${formatScore(item.problemAmountScore)}分`,
	      countScore: `${formatScore(item.problemCountScore)}分`,
	      warningScore: `${formatScore(item.warningScore)}分`,
	      lowThemes: `${item.lowThemeCount}/${item.totalThemeCount}`,
	      warningCount: `${item.warningCount}条`,
	      confirmedIssueCount: `${item.confirmedIssueCount}个`,
	      problemAmount: item.problemAmountText,
	      caseCount: `${item.caseCount}个`,
	      reason: item.reason,
	    }));
	    const themeConcernRows = attentionThemes.slice(0, 10).map((item) => ({
	      monitorTheme: item.monitorTheme,
	      attentionLevel: item.attentionLevel,
	      comprehensiveScore: `${formatScore(item.comprehensiveScore)}分`,
	      averageScore: `${formatScore(item.averageScore)}分`,
	      medianScore: `${formatScore(item.medianScore)}分`,
	      lowSubjects: `${item.lowSubjectCount}/${item.coverageSubjectCount}`,
	      warningCount: `${item.warningCount}条`,
	      confirmedIssueCount: `${item.confirmedIssueCount}个`,
	      problemAmount: item.problemAmountText,
	      caseCount: `${item.caseCount}个`,
	      reason: item.reason,
	    }));
	    const topSubjects = attentionSubjects.slice(0, 6).map((item) => ({
	      name: item.subjectName,
	      meta: `${item.subjectType}｜${item.attentionLevel}｜综合表现 ${formatScore(item.comprehensiveScore)}分`,
	      value: `${formatScore(item.comprehensiveScore)}分`,
	      reason: item.reason,
	    }));
	    const topThemes = attentionThemes.slice(0, 6).map((item) => ({
	      name: item.monitorTheme,
	      meta: `${item.monitorCategory}｜${item.attentionLevel}`,
	      value: `${formatScore(item.comprehensiveScore)}分`,
	      reason: item.reason,
	    }));
	    const themeAverageScore = rows.length ? rows.reduce((sum, row) => sum + row.themeScore, 0) / rows.length : 0;
	    const lowSubjectCount = attentionSubjects.filter((subject) => subject.evaluationScore < 70 || subject.lowThemeCount > 0).length;

	    return {
	      '高关注部门/单位数': {
	        drawerTitle: '高关注部门/单位数',
	        summary: '只统计综合表现分低于 60 分的部门 / 单位；中关注对象仍在左侧列表展示，但不计入顶部主值。',
	        primary: {
	          label: '高关注部门/单位',
	          value: `${highAttentionSubjects.length}个`,
	          badge: '综合表现',
	          formula: '综合表现分 = 评价表现分×40% + 问题金额表现分×25% + 问题数量表现分×20% + 预警疑点表现分×15%；高关注为综合表现分 < 60。',
	          source: '本级部门 / 单位关注数据',
	          explanation: '用于判断当前本级范围内哪些部门 / 单位需要优先关注。',
	        },
	        sections: [
	          {
	            title: '部门 / 单位关注口径',
	            stats: [
	              { label: '覆盖主体', value: `${subjectCount}个` },
	              { label: '高关注主体', value: `${highAttentionSubjects.length}个` },
	              { label: '高关注阈值', value: '< 60分' },
	              { label: '排序第一', value: attentionSubjects[0]?.subjectName || '--' },
	            ],
	          },
	        ],
	        listTitle: '部门 / 单位关注明细',
	        listHint: '按综合表现分升序展示，点击主体后聚焦矩阵主体列。',
	        table: {
	          columns: [
	            { key: 'subjectName', label: '部门/单位名称' },
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
	          rows: subjectConcernRows,
	        },
	      },
	      高关注主题数: {
	        drawerTitle: '高关注主题数',
	        summary: '统计平均分偏低、低分部门 / 单位较多或问题证据集中的主题；中关注主题仍在右侧列表展示。',
	        primary: {
	          label: '高关注主题',
	          value: `${highAttentionThemes.length}个`,
	          badge: '主题关注',
	          formula: '主题关注按平均分、中位分、低分部门 / 单位、预警疑点、确认问题和确认金额综合研判。',
	          source: '本级主题关注数据',
	          explanation: '用于判断当前本级范围内哪些监督主题需要优先诊断。',
	        },
	        sections: [
	          {
	            title: '主题关注口径',
	            stats: [
	              { label: '覆盖主题', value: `${themeCount}个` },
	              { label: '高关注主题', value: `${highAttentionThemes.length}个` },
	              { label: '排序口径', value: '综合表现优先' },
	              { label: '排序第一', value: attentionThemes[0]?.monitorTheme || '--' },
	            ],
	          },
	        ],
	        listTitle: '主题关注明细',
	        listHint: '点击主题后切换监督主题筛选。',
	        table: {
	          columns: [
	            { key: 'monitorTheme', label: '主题名称' },
	            { key: 'attentionLevel', label: '关注等级' },
	            { key: 'comprehensiveScore', label: '主题综合表现' },
	            { key: 'averageScore', label: '平均分' },
	            { key: 'medianScore', label: '中位分' },
	            { key: 'lowSubjects', label: '低分部门/单位' },
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
	        summary: '选择具体主题后，各部门 / 单位处于同一评价体系下，可以展示平均分。',
	        primary: {
	          label: '平均分',
	          value: rows.length ? `${formatScore(themeAverageScore)}分` : '--',
	          badge: activeTheme || '单主题',
	          formula: '当前主题下各部门 / 单位评价得分平均值',
	          source: '主题评价数据',
	          explanation: '仅在同一主题、同一统计周期下比较部门 / 单位得分。',
	        },
	        sections: [
	          {
	            title: '主题得分构成',
	            stats: [
	              { label: '覆盖主体', value: `${subjectCount}个` },
	              { label: '低分主体', value: `${lowSubjectCount}个` },
	              { label: '预警疑点', value: `${warningCount}条` },
	              { label: '确认问题', value: `${confirmedIssueCount}个` },
	            ],
	          },
	        ],
	        listTitle: '部门 / 单位得分明细',
	        listHint: '按当前主题下部门 / 单位表现排序。',
	        entries: topSubjects,
	      },
	      '低分部门/单位数': {
	        drawerTitle: '低分部门/单位数',
	        summary: '低分部门 / 单位数表示当前主题下需要优先关注的主体数量。',
	        primary: {
	          label: '低分部门/单位',
	          value: `${lowSubjectCount}个`,
	          badge: '主题得分',
	          formula: '当前主题下低于阈值或命中关注条件的部门 / 单位数量',
	          source: '主题主体评分数据',
	          explanation: '该指标只在同一主题评价体系下使用。',
	        },
	        sections: [
	          {
	            title: '低分主体构成',
	            stats: [
	              { label: '覆盖主体', value: `${subjectCount}个` },
	              { label: '低分主体', value: `${lowSubjectCount}个` },
	              { label: '预警疑点', value: `${warningCount}条` },
	              { label: '确认问题金额', value: formatWanAmount(problemAmount) },
	            ],
	          },
	        ],
	        listTitle: '低分部门 / 单位明细',
	        listHint: '点击主体后聚焦矩阵主体列。',
	        entries: topSubjects,
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
	              { label: '涉及主体', value: `${subjectCount}个` },
	              { label: '涉及主题', value: `${themeCount}个` },
	              { label: '高频规则', value: `${buildHighFrequencyRules().length}条` },
	            ],
	          },
	        ],
	        listTitle: '预警疑点明细',
	        listHint: '疑点按生成时间倒序展示，可在底部继续追溯规则、问题和案例链路。',
	        table: {
	          columns: [
	            { key: 'clueCode', label: '疑点编号' },
	            { key: 'monitorTheme', label: '所属主题' },
	            { key: 'subjectName', label: '部门/单位' },
	            { key: 'ruleName', label: '规则名称' },
	            { key: 'description', label: '疑点描述' },
	            { key: 'amount', label: '涉及金额' },
	            { key: 'status', label: '疑点状态' },
	            { key: 'confirmed', label: '是否确认问题' },
	            { key: 'triggerTime', label: '生成时间' },
	          ],
	          rows: bottomWarningRows,
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
	              { label: '涉及主体', value: `${affectedSubjectCount}个` },
	              { label: '涉及主题', value: `${themeCount}个` },
	              { label: '预警疑点', value: `${warningCount.toLocaleString('zh-CN')}条` },
	            ],
	          },
	        ],
	        listTitle: '确认问题明细',
	        listHint: '确认问题按确认时间倒序展示。',
	        table: {
	          columns: [
	            { key: 'issueCode', label: '问题编号' },
	            { key: 'issueName', label: '问题名称' },
	            { key: 'monitorTheme', label: '所属主题' },
	            { key: 'subjectName', label: '部门/单位' },
	            { key: 'issueType', label: '问题类型' },
	            { key: 'source', label: '问题来源' },
	            { key: 'amount', label: '确认金额' },
	            { key: 'caseFlag', label: '是否形成案例' },
	            { key: 'confirmedAt', label: '确认时间' },
	          ],
	          rows: bottomIssueRows,
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
	              { label: '涉及主体', value: `${affectedSubjectCount}个` },
	              { label: '涉及主题', value: `${affectedThemeCount}个` },
	            ],
	          },
	        ],
	        listTitle: '确认问题金额明细',
	        listHint: '按确认金额降序展示，金额用于判断影响规模。',
	        table: {
	          columns: [
	            { key: 'issueCode', label: '问题编号' },
	            { key: 'issueName', label: '问题名称' },
	            { key: 'monitorTheme', label: '所属主题' },
	            { key: 'subjectName', label: '部门/单位' },
	            { key: 'issueType', label: '问题类型' },
	            { key: 'amount', label: '确认金额' },
	            { key: 'source', label: '来源疑点' },
	            { key: 'caseFlag', label: '关联案例' },
	          ],
	          rows: bottomIssueRows,
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
	              { label: '案例总数', value: `${formedCaseCount}个` },
	              { label: '典型案例数', value: `${typicalCaseCount}个` },
	              { label: '涉及主题数', value: `${formedCaseThemeCount}个` },
	              { label: '涉及单位数', value: `${formedCaseUnitCount}个` },
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
	          { title: '发现路径', content: '来源规则、主题、监督方式' },
	          { title: '核实结论', content: '是否确认问题、确认依据' },
	          { title: '可复用点', content: '为什么可作为正式案例成果' },
	        ],
	      },
	    };
	  }, [activeTheme, attentionSubjects, attentionThemes, bottomIssueRows, bottomWarningRows, currentScopeAreaText, filteredScoreRows]);
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
	      setSelectedRegion(countyParentMap[subjectRow.regionName]);
	      setSelectedMapArea(subjectRow.regionName);
	      setAdminRegion(subjectRow.regionName);
	      setAnalysisShape('unit');
	      return;
	    }

	    if (subjectRow.regionName === '省本级') {
	      setSelectedRegion('省本级');
	      setSelectedMapArea(null);
	      setAdminRegion('省本级');
	      setAnalysisShape('unit');
	      return;
	    }

	    if (cityRegions.includes(subjectRow.regionName)) {
	      setSelectedRegion(null);
	      setSelectedMapArea(null);
	      setAdminRegion('湖南省全辖');
	      setAnalysisShape('jurisdiction');
	    }
	  }, [baseFilteredScoreRows, isUnitAnalysisMode]);

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
	  };

	  const handleAdminRegionChange = (regionName: string) => {
	    setAdminRegion(regionName);
	    setAnalysisShape('unit');
	    if (regionName === '省本级') {
	      setSelectedRegion('省本级');
	      setSelectedMapArea(null);
	    } else if (countyParentMap[regionName]) {
	      setSelectedRegion(countyParentMap[regionName]);
	      setSelectedMapArea(regionName);
	    } else {
	      setSelectedRegion(regionName);
	      setSelectedMapArea(null);
	    }
    setSelectedSubject(null);
    setSelectedIndicator(null);
  };

	  const handleRefresh = () => {
	    setTimeRange('本月');
	    setCustomStart('2026-05-01');
	    setCustomEnd('2026-05-14');
	    setAdminRegion('省本级');
	    setSelectedRegion('省本级');
	    setSelectedMapArea(null);
	    setAnalysisShape('unit');
	    setSupervisionCategory('日常监督');
	    setMonitorCategory('全部');
	    setMonitorTheme('全部');
    setSubjectType('全部');
    setSelectedTheme(null);
    setSelectedSubject(null);
    setMapResetToken((token) => token + 1);
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
	    setSelectedRegion(parentRegion);
	    setSelectedMapArea(countyName);
	    setAdminRegion(countyName);
	    setAnalysisShape('unit');
	    setSelectedSubject(null);
    setSelectedIndicator(null);
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
	    setAdminRegion(targetRegion);
	    setSelectedRegion(targetRegion);
	    setSelectedMapArea(null);
	    setAnalysisShape('unit');
	    setSelectedSubject(null);
	    setSelectedIndicator(null);
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
    setDetailTab('主体主题明细');
    syncMapToSubject(subjectName);
  };

  const handleSubjectSelect = (subjectName: string) => {
    setSelectedSubject(subjectName);
    setDetailTab('主体主题明细');
    syncMapToSubject(subjectName);
  };

  const handleBackToLocalScope = () => {
    setSelectedSubject(null);
    setSelectedIndicator(null);
    setDetailTab('主体主题明细');
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

  const availableThemeOptions = monitorCategory === '业务监控' ? businessThemes : monitorCategory === '专题监控' ? specialThemes : [...businessThemes, ...specialThemes];

	  const openCustomDatePicker = (picker: DatePickerKey, value: string) => {
	    setCalendarMonth(parseDateValue(value));
	    setOpenFilterMenu(null);
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

  return (
    <div className="jurisdiction-supervision-page">
      <TopBar title="财会监督系统" onNavigate={handleNavigate} />
      <main className="jurisdiction-supervision-main">
	        <section className="overview-hero">
	          <div className="hero-title-line">
	            <h1>本级监督分析</h1>
	            <p>展示当前本级范围内，日常监督下需关注部门 / 单位、需关注主题及监控预警情况。</p>
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
	                    <span>{supervisionCategory === '日常监督' ? '全部日常主题' : '专项主题待补充'}</span>
	                  </button>
	                  {supervisionCategory === '日常监督' && (
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
	                  )}
	                </div>
	              )}
	            </div>
		            <button type="button" className="refresh-button" title="恢复默认筛选：本月 / 湖南省本级 / 日常监督 / 全部日常主题" onClick={handleRefresh}>
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
	                <h2>需关注部门/单位</h2>
	                <span className="panel-note">高/中关注部门单位，按综合表现分、问题金额和问题数量排序</span>
	              </div>
	            </div>
	            <div className="theme-ranking-list">
	              {visibleAttentionSubjects.map((subject, index) => (
	                <button
	                  key={subject.subjectName}
	                  type="button"
	                  className="theme-ranking-row"
	                  onClick={() => handleSubjectSelect(subject.subjectName)}
	                  title={`综合表现分：${formatScore(subject.comprehensiveScore)}；低分主题：${subject.lowThemes.join('、') || '暂无'}；预警疑点：${subject.warningCount}条；确认问题：${subject.confirmedIssueCount}个；问题金额：${subject.problemAmountText}`}
	                >
	                  <span className="theme-rank-num">{index + 1}</span>
	                  <div className="theme-rank-content">
	                    <div className="theme-rank-title">
	                      <strong>{subject.subjectName}</strong>
	                      <span className={`risk-pill ${getAttentionToneClass(subject.attentionLevel)}`}>{subject.attentionLevel}</span>
	                    </div>
	                    <div className="theme-rank-stats">
	                      <span>综合表现 <b>{formatScore(subject.comprehensiveScore)}</b></span>
	                      <span className="stat-divider">｜</span>
	                      <span>低分主题 <b>{subject.lowThemeCount}/{subject.totalThemeCount}</b></span>
	                      <span className="stat-divider">｜</span>
	                      <span>预警疑点 <b>{subject.warningCount}</b></span>
	                    </div>
	                    <div className="theme-rank-stats">
	                      <span>确认问题 <b>{subject.confirmedIssueCount}</b></span>
	                      <span className="stat-divider">｜</span>
	                      <span>问题金额 <b>{subject.problemAmountText}</b></span>
	                      <span className="stat-divider">｜</span>
	                      <span>案例沉淀 <b>{subject.caseCount}个</b></span>
	                    </div>
	                    <div className="theme-rank-deduction">
	                      <span className="deduction-label">原因：</span>
	                      <span className="deduction-reason">{subject.reason}</span>
	                    </div>
	                  </div>
	                </button>
	              ))}
	            </div>
	          </section>

          {/* 中间：部门 / 单位关注分布 */}
          <div className="middle-column">
	            <section className="panel map-panel">
	              <div className="panel-header">
	                <div>
	                  <h2>{mapPanelTitle}</h2>
	                  <span className="panel-note">{mapPanelNote}</span>
	                </div>
	              </div>
			              <div className="map-content local-matrix-content">
		                {isUnitAnalysisMode ? (
		                  <div className="unit-analysis-content">
		                    <div className="unit-analysis-summary-grid">
		                      <div className="unit-analysis-stat">
		                        <span>本级部门/单位</span>
		                        <strong>{uniqueCount(filteredScoreRows.map((row) => row.subjectName))}</strong>
		                        <em>个</em>
		                      </div>
		                      <div className="unit-analysis-stat">
		                        <span>需关注部门/单位</span>
		                        <strong>{attentionSubjects.filter((item) => item.attentionLevel !== '低关注').length}</strong>
		                        <em>个</em>
		                      </div>
		                      <div className="unit-analysis-stat">
		                        <span>需关注主题</span>
		                        <strong>{attentionThemes.filter((item) => item.attentionLevel !== '低关注').length}</strong>
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
			                      <span className="unit-matrix-context">
			                        {selectedSubject
			                          ? `${selectedSubject}｜${matrixThemes.length}个主题`
			                          : `当前展示：${matrixSubjects.length}个部门/单位 × ${matrixThemes.length}个主题`}
			                      </span>
			                      <div className="unit-analysis-header-actions">
			                        <span className="unit-matrix-helper">
			                          {selectedSubject ? '返回后查看全部部门/单位' : '横向滚动查看更多部门/单位'}
			                        </span>
			                        {selectedSubject && (
			                          <button type="button" className="unit-scope-reset" onClick={handleBackToLocalScope}>
			                            返回本级
			                          </button>
			                        )}
			                      </div>
			                    </div>
			                    {focusMatrixRows.length && matrixSubjects.length ? (
			                      <div className="attention-matrix-wrap">
			                        <div
			                          className="attention-matrix"
			                          style={{ gridTemplateColumns: selectedSubject ? '132px 96px' : `132px repeat(${matrixSubjects.length}, 96px)` }}
			                        >
			                          <div className="matrix-head matrix-theme-head">监督主题</div>
			                          {matrixSubjects.map((subject) => (
			                            <button
			                              key={subject.subjectName}
			                              type="button"
			                              className={`matrix-head matrix-subject-head ${selectedSubject === subject.subjectName ? 'active' : ''}`}
			                              onClick={() => handleSubjectSelect(subject.subjectName)}
			                              title={`${subject.subjectName}｜${subject.subjectType}`}
			                            >
			                              {subject.subjectName}
			                            </button>
			                          ))}
			                          {focusMatrixRows.map((row) => (
			                            <Fragment key={row.theme.monitorTheme}>
			                              <button
			                                key={`${row.theme.monitorTheme}-theme`}
			                                type="button"
			                                className={`matrix-theme-cell ${activeTheme === row.theme.monitorTheme ? 'active' : ''}`}
			                                onClick={() => handleThemeSelect(row.theme.monitorTheme)}
			                              >
			                                <strong>{row.theme.monitorTheme}</strong>
			                                <span>{row.theme.monitorCategory}</span>
			                              </button>
			                              {row.cells.map((cell) => (
			                                <button
			                                  key={`${row.theme.monitorTheme}-${cell.subject.subjectName}`}
			                                  type="button"
			                                  className={`matrix-status-cell ${getAttentionToneClass(cell.attentionLevel)} ${cell.scoreRow ? '' : 'is-empty'}`}
			                                  title={`${cell.subject.subjectName}｜${row.theme.monitorTheme}｜${cell.attentionLevel}｜得分 ${cell.scoreRow ? formatScore(cell.scoreRow.themeScore) : '暂无'}｜预警疑点 ${cell.warningCount}｜转问题率 ${formatPercent(cell.issueConversionRate)}｜问题金额 ${cell.problemAmountText}`}
			                                  onClick={() => {
			                                    handleThemeSelect(row.theme.monitorTheme);
			                                    setSelectedSubject(cell.subject.subjectName);
			                                    setRuleAnalysisTab('明细追溯');
			                                  }}
			                                >
			                                  <strong>{cell.attentionLevel}</strong>
			                                  <span>{cell.scoreRow ? `${formatScore(cell.scoreRow.themeScore)}分` : '暂无数据'}</span>
			                                </button>
			                              ))}
			                            </Fragment>
			                          ))}
			                        </div>
			                      </div>
			                    ) : (
			                      <div className="unit-empty">当前口径暂无部门 / 单位矩阵数据</div>
			                    )}
		                  </div>
		                ) : (
		                  <>
		                    {currentLevelSubject && !selectedSubjectSummary && (
		                      <button
		                        type="button"
		                        className="subject-map-summary"
		                        onClick={handleCurrentLevelSelect}
		                        title="点击进入本级监督分析"
		                      >
		                        <span>{currentLevelRegionName === '省本级' ? '本级主体卡' : `${currentLevelRegionName}本级主体卡`}</span>
		                        <strong>{currentLevelRegionName === '省本级' ? '湖南省本级' : `${currentLevelRegionName}本级`}</strong>
		                        <em>{currentLevelSubject.attentionLevel}｜低分主题 {currentLevelSubject.lowThemeCount}/{currentLevelSubject.totalThemeCount} 个</em>
		                        <div>
		                          <p>预警疑点 {currentLevelSubject.warningCount} 条｜触发规则 {currentLevelSubject.triggeredRuleCount} 条</p>
		                          <p>转问题率 {formatPercent(currentLevelSubject.issueConversionRate)}｜问题金额 {currentLevelSubject.problemAmountText}</p>
		                        </div>
		                      </button>
		                    )}
		                    <HunanRiskMap
		                      regions={regionScores}
		                      viewRegion={activeMapRegion}
	                      selectedArea={selectedMapArea || null}
	                      highlightedArea={highlightedMapArea}
	                      metric={mapMetric}
	                      resetToken={mapResetToken}
		                      onCitySelect={handleMapCitySelect}
		                      onCountySelect={handleMapCountySelect}
		                      isAllThemes={!activeTheme}
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
		                      <span><i className="legend-high" />高关注</span>
		                      <span><i className="legend-mid" />中关注</span>
		                      <span><i className="legend-low" />低关注</span>
		                    </div>
		                  </>
		                )}
		              </div>
	            </section>
          </div>

	          <section className="panel theme-panel">
	            <div className="panel-header">
	              <div>
	                <h2>{activeTheme ? '指标扣分分析' : '需关注主题'}</h2>
	                <span className="panel-note">
	                  {activeTheme ? '当前主题下低分指标、扣分原因和关联规则' : '高/中关注主题，按综合表现、平均分和问题证据排序'}
	                </span>
	              </div>
	            </div>
	            <div className="theme-ranking-list">
	              {activeTheme ? (
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
	                        <span>低分主体 <b>{evidence.affectedSubjects}</b></span>
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
	                    title={`综合表现 ${formatScore(theme.comprehensiveScore)}；低分部门/单位 ${theme.lowSubjectCount}/${theme.coverageSubjectCount}；确认问题 ${theme.confirmedIssueCount}个；问题金额：${theme.problemAmountText}`}
	                  >
	                    <span className="theme-rank-num">{index + 1}</span>
	                    <div className="theme-rank-content">
	                      <div className="theme-rank-title">
	                        <strong>{theme.monitorTheme}</strong>
	                        <span className={`risk-pill ${getAttentionToneClass(theme.attentionLevel)}`}>{theme.attentionLevel}</span>
	                      </div>
	                      <div className="theme-rank-stats">
	                        <span>综合表现 <b>{formatScore(theme.comprehensiveScore)}</b></span>
	                        <span className="stat-divider">｜</span>
	                        <span>平均分 <b>{formatScore(theme.averageScore)}</b></span>
	                        <span className="stat-divider">｜</span>
	                        <span>低分主体 <b>{theme.lowSubjectCount}/{theme.coverageSubjectCount}</b></span>
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
	              <h2>监控预警与明细追溯</h2>
	              <span className="panel-note">解释顶部卡片、主体、主题和矩阵颜色背后的规则、疑点、问题与案例链路</span>
	            </div>
	            <div className="detail-tabs">
	              <button className={ruleAnalysisTab === '规则触发分析' ? 'active' : ''} onClick={() => setRuleAnalysisTab('规则触发分析')}>规则触发分析</button>
	              <button className={ruleAnalysisTab === '预警疑点分析' ? 'active' : ''} onClick={() => setRuleAnalysisTab('预警疑点分析')}>预警疑点分析</button>
	              <button className={ruleAnalysisTab === '确认问题分析' ? 'active' : ''} onClick={() => setRuleAnalysisTab('确认问题分析')}>确认问题分析</button>
	              <button className={ruleAnalysisTab === '案例沉淀分析' ? 'active' : ''} onClick={() => setRuleAnalysisTab('案例沉淀分析')}>案例沉淀分析</button>
	              <button className={ruleAnalysisTab === '明细追溯' ? 'active' : ''} onClick={() => setRuleAnalysisTab('明细追溯')}>明细追溯</button>
	            </div>
	          </div>
	          <div className="detail-table-wrap">
	            {ruleAnalysisTab === '规则触发分析' && (
	              <table>
	                <thead>
	                  <tr>
	                    <th>规则类型 / 归属主题</th>
	                    <th>启用规则数</th>
	                    <th>触发规则数</th>
	                    <th>预警疑点数</th>
	                    <th>涉及主体数</th>
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

	            {ruleAnalysisTab === '预警疑点分析' && (
	              <table>
	                <thead>
	                  <tr>
	                    <th>疑点编号</th>
	                    <th>主题</th>
	                    <th>部门/单位</th>
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
	                      <td>{item.subjectName}</td>
	                      <td>{item.ruleName}</td>
	                      <td>{item.amount}</td>
	                      <td>{item.status}</td>
	                      <td>{item.triggerTime}</td>
	                    </tr>
	                  ))}
	                </tbody>
	              </table>
	            )}

	            {ruleAnalysisTab === '确认问题分析' && (
	              <table>
	                <thead>
	                  <tr>
	                    <th>问题编号</th>
	                    <th>问题名称</th>
	                    <th>主题</th>
	                    <th>部门/单位</th>
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
	                      <td>{item.subjectName}</td>
	                      <td>{item.issueType}</td>
	                      <td>{item.amount}</td>
	                      <td>{item.source}</td>
	                      <td>{item.confirmedAt}</td>
	                    </tr>
	                  ))}
	                </tbody>
	              </table>
	            )}

	            {ruleAnalysisTab === '案例沉淀分析' && (
	              <table>
	                <thead>
	                  <tr>
	                    <th>案例名称</th>
	                    <th>主题</th>
	                    <th>部门/单位</th>
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
	                      <td>{item.relatedUnit}</td>
	                      <td>{item.caseSource}</td>
	                      <td>{item.sourceProblemCode}</td>
	                      <td>{item.isTypical}</td>
	                      <td>{item.storedAt}</td>
	                    </tr>
	                  ))}
	                </tbody>
	              </table>
	            )}

	            {ruleAnalysisTab === '明细追溯' && (
	              <table>
	                <thead>
	                  <tr>
	                    <th>部门/单位</th>
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
	                        <td>{item.subjectName}</td>
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
                                ? '主题评价得分用于辅助判断该主题下主体是否需要关注。'
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
                          <tr key={`${row.caseCode || row.issueCode || row.clueCode || rowIndex}`}>
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

              {activeMetricDrawer.detailModules && activeMetricDrawer.detailModules.length > 0 && (
                <section className="drawer-section">
                  <div className="drawer-section-heading">
                    <span className="drawer-section-kicker">详情态</span>
                    <div className="drawer-section-title">案例详情建议模块</div>
                  </div>
                  <div className="drawer-detail-module-grid">
                    {activeMetricDrawer.detailModules.map((module) => (
                      <div key={module.title} className="drawer-detail-module">
                        <span>{module.title}</span>
                        <strong>{module.content}</strong>
                      </div>
                    ))}
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
	                          if ((activeMetric === '高关注部门/单位数' || activeMetric === '低分部门/单位数' || activeMetric === '平均分' || activeMetric === '确认问题数量' || activeMetric === '确认问题金额') && item.name) {
	                            setSelectedSubject(item.name);
	                            syncMapToSubject(item.name);
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

	        {/* 监控预警与明细追溯抽屉 */}
        {ruleDrawerData && (
          <div className="metric-drawer-mask" onClick={() => setRuleDrawerData(null)}>
            <aside className="metric-drawer" onClick={(event) => event.stopPropagation()}>
              <div className="drawer-title-row">
                <div>
                  <span>
                    {ruleDrawerData.type === 'rule-type' && '业务分类详情'}
                    {ruleDrawerData.type === 'high-frequency-rule' && '高频规则详情'}
                    {ruleDrawerData.type === 'subject-trigger' && '主体触发详情'}
                  </span>
                  <h2>
                    {ruleDrawerData.type === 'rule-type' && ruleDrawerData.data.ruleType}
                    {ruleDrawerData.type === 'high-frequency-rule' && ruleDrawerData.data.ruleName}
                    {ruleDrawerData.type === 'subject-trigger' && ruleDrawerData.data.subjectName}
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
                        <span>涉及主体</span>
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
                        <span>涉及主体</span>
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

              {ruleDrawerData.type === 'subject-trigger' && (
                <>
                  <p className="drawer-summary">该主体的规则触发情况统计。</p>
                  <section className="drawer-section">
                    <div className="drawer-section-title">基本信息</div>
                    <div className="drawer-distribution">
                      <div className="drawer-stat">
                        <span>所属区划</span>
                        <strong>{ruleDrawerData.data.regionName}</strong>
                      </div>
                      <div className="drawer-stat">
                        <span>主体类型</span>
                        <strong>{ruleDrawerData.data.subjectType}</strong>
                      </div>
                      <div className="drawer-stat">
	                        <span>预警疑点</span>
	                        <strong>{ruleDrawerData.data.abnormalCount}条</strong>
                      </div>
                    </div>
                  </section>
                  <section className="drawer-section">
                    <div className="drawer-section-title">触发统计</div>
                    <div className="drawer-distribution">
                      <div className="drawer-stat">
                        <span>命中规则数</span>
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
                    </div>
                  </section>
                  <section className="drawer-section">
                    <div className="drawer-section-title">说明</div>
                    <p className="drawer-summary">该主体在当前范围内触发了{ruleDrawerData.data.ruleCount}条规则，建议关注其风险变化趋势，核实异常数据并及时整改。</p>
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
