/**
 * @name 全辖监督分析
 */
import './style.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { RefreshCw } from 'lucide-react';
import TopBar from '../../common/components/TopBar';

type TimeRange = '今日' | '昨日' | '本月' | '本季度' | '本年' | '自定义';
type MonitorCategory = '全部' | '业务监控' | '专题监控';
type DetailTab = '主体主题明细' | '异常数据明细' | '规则触发明细';
type RiskLevel = '低风险' | '较低风险' | '中风险' | '较高风险' | '高风险';
type MapRiskLevel = '高风险' | '中风险' | '低风险';
type MapMetric = '风险指数' | '评价得分' | '异常率' | '退回率' | '闭环率';
type RuleAnalysisTab = '规则类型' | '高频规则' | '主体触发';
type SubjectTypeFilter = '全部' | '财政部门' | '主管部门' | '预算单位' | '省直单位' | '责任单位';
type ThemeHoverMetric = '异常率' | '退回率' | '闭环率';

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
  entries: DrawerEntryItem[];
}

const DATA_UPDATED_AT = '2026年5月14日 15:00';

const timeRanges: TimeRange[] = ['今日', '昨日', '本月', '本季度', '本年', '自定义'];
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
const businessThemes = ['基础信息', '项目库', '预算编制', '预算批复', '预算调整调剂', '指标管理', '预算执行', '资产管理', '会计核算'];
const specialThemes = ['地方政府债务', '高标准农田建设资金使用', '行政事业单位国有资产处置', '减税降费政策落实', '违规返还财政收入', '三保', '三公', '一卡通'];
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
  const abnormalRate = getRatioPercent(subject.abnormalCount, subject.abnormalTotalCount, 1);
  const rejectRate = getRatioPercent(subject.reviewRejectCount, subject.reviewSubmitCount, 1);
  return [
    { label: '风险指数', value: formatScore(subject.comprehensiveScore), risk: riskByScore(subject.comprehensiveScore) },
    { label: '异常率', value: `${formatRateValue(abnormalRate, 1)}%`, risk: getAbnormalRateRisk(abnormalRate) },
    { label: '退回率', value: `${formatRateValue(rejectRate, 1)}%`, risk: getRejectRateRisk(rejectRate) },
    { label: '闭环率', value: `${formatRateValue(subject.closedLoopRate, 1)}%`, risk: getClosureRateRisk(subject.closedLoopRate) },
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
          const abnormalRate = getRatioPercent(summary.parent.abnormalCount, summary.parent.abnormalTotalCount, 1);
          const reviewRejectRate = getRatioPercent(summary.parent.reviewRejectCount, summary.parent.reviewSubmitCount, 2);
          const { closedLoopCount, shouldClosedCount } = getClosedLoopParts(summary.parent);
          const lowestThemeText = summary.parent.lowestThemeScore || `${summary.parent.mainLowThemes[0] || '预算执行'} ${Math.max(45, Math.round(summary.score - 10))}`;

          return `
            <div class="map-tooltip">
              <strong>${params.name}</strong>
              ${isCityView ? `<span>所属市州：${summary.parent.regionName}</span>` : ''}
              <span>风险指数：${formatScore(summary.score)}｜${summary.mapRiskLevel}</span>
              <span>全省排名：第 ${rank} 位</span>
              <span>高风险主体：${summary.parent.highRiskSubjects} 个</span>
              <span>高风险主题：${summary.parent.highRiskThemes || 2} 个</span>
              <span>最低主题得分：${lowestThemeText}分</span>
              <span>异常率：${formatRateValue(abnormalRate, 1)}%（${summary.parent.abnormalCount} / ${summary.parent.abnormalTotalCount}）</span>
              <span>退回率：${formatRateValue(reviewRejectRate, 2)}%（${summary.parent.reviewRejectCount} / ${summary.parent.reviewSubmitCount}）</span>
              <span>闭环率：${formatRateValue(summary.parent.closedLoopRate, 1)}%（${closedLoopCount} / ${shouldClosedCount}）</span>
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
              <strong>{formatScore(region.comprehensiveScore)}</strong>
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

export default function GlobalOverviewPrototype() {
  const [timeRange, setTimeRange] = useState<TimeRange>('本月');
  const [customStart, setCustomStart] = useState('2026-05-01');
  const [customEnd, setCustomEnd] = useState('2026-05-14');
  const [adminRegion, setAdminRegion] = useState('湖南省全辖');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedMapArea, setSelectedMapArea] = useState<string | null>(null);
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
  const [ruleAnalysisTab, setRuleAnalysisTab] = useState<RuleAnalysisTab>('规则类型');
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

  const activeRegion = selectedRegion ?? (adminRegion === '湖南省全辖' ? null : adminRegion);
  const activeTheme = selectedTheme ?? (monitorTheme === '全部' ? null : monitorTheme);
  const activeMapRegion = activeRegion && activeRegion !== '省本级' ? activeRegion : null;
  const primaryMetricTitle = activeTheme ? '评价得分' : '风险指数';
  const primaryMetricDescription = activeTheme
    ? `当前区划 / 当前主体范围 × ${activeTheme}主题的评价得分，用于判断该主题在当前范围内的风险水平。`
    : '当前统计范围内，基于多个日常监督主题的风险情况汇总形成的综合风险判断结果；用于全局态势判断，不等同于某一个评价体系的直接得分。';
  const primaryMetricTrend = activeTheme ? '较上期下降 2.1' : '较上期上升 3.2';
  const primaryMetricTrendDirection = activeTheme ? 'down' : 'up';

  const baseFilteredScoreRows = useMemo(() => {
    const regionScope = selectedMapArea || activeRegion;
    let sourceRows = subjectThemeScores;

    // 根据层级生成对应数据
    if (selectedMapArea && activeRegion && !subjectThemeScores.some((row) => row.regionName === selectedMapArea)) {
      // 区县级：生成该区县数据
      sourceRows = buildCountyScoreRows(activeRegion, selectedMapArea);
    } else if (activeRegion && activeRegion !== '省本级' && !selectedMapArea) {
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
      let regionMatched = true;

      if (selectedMapArea) {
        // 区县级：只匹配该区县
        regionMatched = row.regionName === selectedMapArea;
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
  }, [activeRegion, activeTheme, monitorCategory, selectedMapArea, subjectType]);

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
    return selectedMapArea && activeRegion && selectedMapArea !== activeRegion ? `${activeRegion} / ${selectedMapArea}` : activeRegion || '全省';
  }, [selectedMapArea, activeRegion]);

  const metrics = useMemo<MetricCard[]>(() => {
    const rows = filteredScoreRows;
    const isAllThemes = !activeTheme;
    const primaryMetricName = primaryMetricTitle;

    const getRiskIndexHover = () => ({
      calculationFormula: '风险指数 = 评价得分风险×50% + 异常率×20% + 退回率×15% + 闭环不足率×15%',
      referenceFactors: ['评价得分风险', '异常率', '退回率', '闭环不足率'],
      additionalInfo: '风险指数越高，风险越大。风险等级：0-20低风险、20-40中风险、40-60较高风险、60以上高风险',
      scope: `本月 / ${currentAreaText} / 日常监督全部主题`,
      meaning: '多主题风险汇总值，用于全局态势判断',
    });

    const getEvaluationScoreHover = () => ({
      calculationFormula: '评价得分 = Σ（指标得分 × 指标权重）',
      additionalInfo: '评价得分越高，风险越低。基于当前主题的评价体系计算得出。',
      scope: `本月 / ${currentAreaText} / ${activeTheme}`,
      meaning: '单主题评价体系得分，反映该主题在当前范围内的风险水平',
    });
    const getHighRiskSubjectHover = () => ({
      calculationFormula: '按当前筛选范围内主体综合风险等级去重统计，高风险和较高风险主体均计入。',
      referenceFactors: ['主体综合得分', '低分主题结果', '风险等级阈值'],
      additionalInfo: '同一主体命中多个低分主题时只计 1 个主体。',
      scope: `本月 / ${currentAreaText} / ${activeTheme || '日常监督全部主题'}`,
      meaning: '用于判断哪些主体需要优先跟进。',
    });
    const getLowScoreThemeHover = () => ({
      calculationFormula: '按当前筛选范围内主题平均得分低于 70 分的监控主题去重统计。',
      referenceFactors: ['主题平均得分', '高风险主体数', '低分指标数'],
      additionalInfo: '该值用于定位主题短板，不等同于异常数据条数。',
      scope: `本月 / ${currentAreaText} / ${activeTheme || '日常监督全部主题'}`,
      meaning: '用于判断当前范围内哪些监控主题存在明显评分短板。',
    });

    if (!rows.length) {
      return [
        {
          title: primaryMetricName,
          value: '--',
          unit: '',
          emphasis: 'score',
          description: primaryMetricDescription,
          aiConclusion: '当前筛选口径暂无评分结果。',
          hoverExplanation: isAllThemes ? getRiskIndexHover() : getEvaluationScoreHover(),
        },
        {
          title: '高风险主体数',
          value: '--',
          unit: '个',
          emphasis: 'risk',
          description: '风险等级为高 / 较高的主体数量。',
          aiConclusion: '当前筛选口径暂无主体风险结果。',
          hoverExplanation: getHighRiskSubjectHover(),
        },
        {
          title: '低分监控主题数',
          value: '--',
          unit: '个',
          emphasis: 'risk',
          description: '得分低于阈值的监控主题数。',
          aiConclusion: '当前筛选口径暂无主题评分结果。',
          hoverExplanation: getLowScoreThemeHover(),
        },
        {
          title: '异常率',
          value: '--',
          unit: '%',
          emphasis: 'rate',
          description: '异常数据数 / 应检测数据总数。',
          aiConclusion: '当前筛选口径暂无异常率数据。',
          hoverExplanation: {
            numerator: '异常数据数 -- 条',
            denominator: '应检测数据总数 -- 条',
            meaning: '反映数据检测发现的异常占比。',
          },
        },
        {
          title: '退回率',
          value: '--',
          unit: '%',
          emphasis: 'rate',
          description: '审核退回事项数 / 已提交审核事项数。',
          aiConclusion: '当前筛选口径暂无退回率数据。',
          hoverExplanation: {
            numerator: '审核退回事项 -- 条',
            denominator: '已提交审核事项 -- 条',
            meaning: '退回率偏高，说明材料完整性、说明质量或整改反馈质量不足。',
          },
        },
        {
          title: '闭环率',
          value: '--',
          unit: '%',
          emphasis: 'closure',
          description: '已闭环事项数 / 应闭环事项数。',
          aiConclusion: '当前筛选口径暂无闭环处置结果。',
          hoverExplanation: {
            numerator: '已闭环事项 -- 条',
            denominator: '应闭环事项 -- 条',
            meaning: '反映日常监督发现事项的最终处理完成情况。',
          },
        },
      ];
    }

    const score = rows.reduce((sum, row) => sum + row.themeScore * row.themeWeight, 0) / rows.reduce((sum, row) => sum + row.themeWeight, 0);
    const highRiskSubjects = uniqueCount(rows.filter((row) => row.riskLevel === '高风险' || row.riskLevel === '较高风险').map((row) => row.subjectName));
    const lowScoreThemes = uniqueCount(rows.filter((row) => row.themeScore < 70).map((row) => row.monitorTheme));
    const abnormalCount = rows.reduce((sum, row) => sum + row.abnormalCount, 0);
    const abnormalTotalCount = Math.round(abnormalCount / 0.08);
    const closedLoopRate = rows.reduce((sum, row) => sum + row.closedLoopRate, 0) / rows.length;
    const closedLoopCount = Math.round(abnormalCount * closedLoopRate / 100);
    const shouldClosedCount = abnormalCount;
    const abnormalRate = Math.round((abnormalCount / abnormalTotalCount) * 10000) / 100;
    const reviewRejectCount = Math.round(abnormalCount * 0.08);
    const reviewSubmitCount = Math.round(reviewRejectCount / 0.089);
    const reviewRejectRate = Math.round((reviewRejectCount / reviewSubmitCount) * 10000) / 100;

    return [
      {
        title: primaryMetricName,
        value: formatScore(score),
        unit: '',
        emphasis: 'score',
        description: primaryMetricDescription,
        aiConclusion: activeTheme ? '评价得分需结合异常率、审核质量和闭环效率解释扣分原因。' : '风险指数用于全局态势判断，需结合低分主题和扣分指标解释风险来源。',
        statusText: activeTheme ? `${activeTheme}｜${primaryMetricRiskByScore(score)}` : primaryMetricRiskByScore(score),
        trendText: primaryMetricTrend,
        trendDirection: primaryMetricTrendDirection,
        hoverExplanation: isAllThemes ? getRiskIndexHover() : getEvaluationScoreHover(),
      },
      {
        title: '高风险主体数',
        value: highRiskSubjects,
        unit: '个',
        emphasis: 'risk',
        description: '风险等级为高 / 较高的主体数量。',
        aiConclusion: '高风险主体主要集中在市州财政和省直预算单位。',
        hoverExplanation: getHighRiskSubjectHover(),
      },
      {
        title: '低分监控主题数',
        value: lowScoreThemes,
        unit: '个',
        emphasis: 'risk',
        description: '得分低于阈值的监控主题数。',
        aiConclusion: '低分主题集中在三保、地方政府债务和高标准农田。',
        hoverExplanation: getLowScoreThemeHover(),
      },
      {
        title: '异常率',
        value: abnormalRate.toFixed(1),
        unit: '%',
        emphasis: 'rate',
        description: '异常数据数 / 应检测数据总数。',
        aiConclusion: '异常率反映检测发现的异常数据占比情况。',
        hoverExplanation: {
          numerator: `异常数据数 ${abnormalCount.toLocaleString('zh-CN')} 条`,
          denominator: `应检测数据总数 ${abnormalTotalCount.toLocaleString('zh-CN')} 条`,
          calculationFormula: '异常率 = 异常数据数 / 应检测数据总数 × 100%',
          meaning: '反映数据检测发现的异常占比。',
          additionalInfo: '去重规则：同一主体、同一监控主题、同一规则、同一业务单据只计一次',
        },
      },
      {
        title: '退回率',
        value: reviewRejectRate.toFixed(1),
        unit: '%',
        emphasis: 'rate',
        description: '审核退回事项数 / 已提交审核事项数。',
        aiConclusion: '退回率偏高，说明材料完整性、说明质量或整改反馈质量不足。',
        hoverExplanation: {
          numerator: `审核退回事项 ${reviewRejectCount} 条`,
          denominator: `已提交审核事项 ${reviewSubmitCount} 条`,
          calculationFormula: '退回率 = 审核退回事项数 / 已提交审核事项数 × 100%',
          meaning: '退回率偏高，说明材料完整性、说明质量或整改反馈质量不足。',
        },
      },
      {
        title: '闭环率',
        value: formatScore(closedLoopRate),
        unit: '%',
        emphasis: 'closure',
        description: '已闭环事项数 / 应闭环事项数。',
        aiConclusion: '处置闭环率有所改善，但少数高风险主题仍存在反馈积压。',
        hoverExplanation: {
          numerator: `已闭环事项 ${closedLoopCount} 条`,
          denominator: `应闭环事项 ${shouldClosedCount} 条`,
          calculationFormula: '闭环率 = 已闭环事项数 / 应闭环事项数 × 100%',
          meaning: '反映日常监督发现事项的最终处理完成情况。',
        },
      },
    ];
  }, [activeTheme, currentAreaText, filteredScoreRows, primaryMetricDescription, primaryMetricTitle, primaryMetricTrend, primaryMetricTrendDirection]);

  const currentPositionText = `当前位置：${currentAreaText}｜统计维度：${timeRange}${activeTheme ? `｜监控主题：${activeTheme}` : ''}｜数据更新时间：${DATA_UPDATED_AT}`;
  const isSubjectFocus = Boolean(selectedSubjectSummary);
  const mapLayerText = isSubjectFocus ? '主体风险摘要' : activeMapRegion ? '区县分布' : '市州分布';
  const mapSelectedText = currentAreaText === '全省' ? '湖南省全辖' : currentAreaText;
  const mapPanelNote = `当前区划：${mapSelectedText}｜当前层级：${mapLayerText}｜主体类型：${subjectType}`;
  const mapPanelTitle = isSubjectFocus ? '主体风险摘要' : '区划主体风险分布';
  const highlightedMapArea = selectedSubjectSummary?.regionName || selectedMapArea || null;
  const adminRegionOptions = useMemo(() => {
    return selectedMapArea && !adminRegions.includes(selectedMapArea) ? [...adminRegions, selectedMapArea] : adminRegions;
  }, [selectedMapArea]);
  const metricDrawerData = useMemo<Record<string, MetricDrawerInfo>>(() => {
    const rows = filteredScoreRows;
    const topSubjects = subjectRankings.slice(0, 5).map((item) => ({
      name: item.subjectName,
      meta: `${item.regionName}｜${item.subjectType}`,
      value: `${formatScore(item.comprehensiveScore)}分`,
      reason: item.mainDeductionReason,
      data: item,
    }));
    const topThemes = visibleThemes.slice(0, 5).map((item) => ({
      name: item.monitorTheme,
      meta: item.monitorCategory,
      value: `${formatScore(item.averageScore)}分`,
      reason: `高风险主体 ${item.highRiskSubjects} 个，低分指标 ${item.lowScoreIndicators} 个。`,
      data: item,
    }));
    const topEvidence = visibleEvidences.slice(0, 5).map((item) => ({
      name: item.indicatorName,
      meta: item.monitorTheme,
      value: `${item.abnormalCount}条`,
      reason: item.mainDeductionReason,
      data: item,
    }));
    const overallScore = rows.length > 0
      ? rows.reduce((sum, row) => sum + row.themeScore * row.themeWeight, 0) / rows.reduce((sum, row) => sum + row.themeWeight, 0)
      : 0;
    const highRiskSubjectCount = uniqueCount(rows.filter((row) => row.riskLevel === '高风险').map((row) => row.subjectName));
    const higherRiskSubjectCount = uniqueCount(rows.filter((row) => row.riskLevel === '较高风险').map((row) => row.subjectName));
    const subjectCount = uniqueCount(rows.map((row) => row.subjectName));
    const themeCount = uniqueCount(rows.map((row) => row.monitorTheme));
    const regionCount = uniqueCount(rows.map((row) => row.regionName));
    const lowScoreThemeCount = uniqueCount(rows.filter((row) => row.themeScore < 70).map((row) => row.monitorTheme));
    const highRiskThemeCount = uniqueCount(rows.filter((row) => row.themeScore < 60).map((row) => row.monitorTheme));
    const abnormalTotalCountForRate = rows.reduce((sum, row) => sum + row.abnormalCount, 0);
    const abnormalTotalForCalc = abnormalTotalCountForRate ? Math.round(abnormalTotalCountForRate / 0.08) : 0;
    const closedLoopRateTotal = rows.length > 0 ? rows.reduce((sum, row) => sum + row.closedLoopRate, 0) / rows.length : 0;
    const closedLoopCount = Math.round(abnormalTotalCountForRate * closedLoopRateTotal / 100);
    const notClosedCount = Math.round(abnormalTotalCountForRate * (1 - closedLoopRateTotal / 100));
    const overdueCount = Math.round(notClosedCount * 0.3);
    const abnormalRateTotal = getRatioPercent(abnormalTotalCountForRate, abnormalTotalForCalc, 1);
    const reviewRejectCountCalc = Math.round(abnormalTotalCountForRate * 0.08);
    const reviewSubmitCountCalc = reviewRejectCountCalc ? Math.round(reviewRejectCountCalc / 0.089) : 0;
    const reviewRejectRateTotal = getRatioPercent(reviewRejectCountCalc, reviewSubmitCountCalc, 1);
    const primaryRiskLevel = primaryMetricRiskByScore(overallScore);
    const primaryStatusText = activeTheme ? `${activeTheme}｜${primaryRiskLevel}` : primaryRiskLevel;
    const primaryScoreObjectText = activeTheme ? `${currentAreaText} × ${activeTheme}主题` : '当前统计范围内多个日常监督主题';

    return {
      [primaryMetricTitle]: {
        drawerTitle: primaryMetricTitle,
        summary: activeTheme 
          ? '评价得分 = Σ（指标得分 × 指标权重），反映该主题在当前范围内的风险水平，得分越高风险越低。'
          : '风险指数越高，风险越大。计算公式：风险指数 = 评价得分风险×50% + 异常率×20% + 退回率×15% + 闭环不足率×15%',
        primary: {
          label: primaryMetricTitle,
          value: activeTheme ? `${formatScore(overallScore)}分` : formatScore(overallScore),
          badge: primaryStatusText,
          formula: activeTheme ? 'Σ（指标得分 × 指标权重）' : '评价得分风险×50% + 异常率×20% + 退回率×15% + 闭环不足率×15%',
          source: activeTheme ? '当前主题评价体系 mock 评分结果' : '当前范围内多主题风险因子 mock 汇总',
          explanation: activeTheme ? '先汇总当前主题下各主体评分，再结合筛选范围形成评价得分。' : '风险指数用于全局态势判断，先看评分短板，再用异常率、退回率和闭环不足解释风险来源。',
        },
        sections: activeTheme ? [
          {
            title: '评价得分概览',
            stats: [
              { label: '评价得分', value: `${formatScore(overallScore)}分`, showInfo: true },
              { label: '风险判断', value: primaryStatusText },
              { label: '较上期变化', value: primaryMetricTrend },
              { label: '评分对象', value: primaryScoreObjectText },
              { label: '覆盖主体数', value: `${subjectCount}个` },
              { label: '覆盖监控主题数', value: `${themeCount}个` },
            ],
          },
        ] : [
          {
            title: '风险指数概览',
            stats: [
              { label: '风险指数', value: `${formatScore(overallScore)}`, showInfo: true },
              { label: '风险等级', value: primaryStatusText },
              { label: '较上期变化', value: primaryMetricTrend },
              { label: '评分对象', value: primaryScoreObjectText },
              { label: '覆盖主体数', value: `${subjectCount}个` },
              { label: '覆盖监控主题数', value: `${themeCount}个` },
            ],
          },
          {
            title: '风险构成',
            stats: [
              { label: '评价得分风险', value: `${(100 - overallScore).toFixed(1)} (50%)` },
              { label: '异常率', value: `${abnormalRateTotal}% (20%)` },
              { label: '退回率', value: `${reviewRejectRateTotal}% (15%)` },
              { label: '闭环不足率', value: `${(100 - closedLoopRateTotal).toFixed(1)}% (15%)` },
            ],
          },
        ],
        listTitle: '具体扣分明细',
        listHint: '点击明细后聚焦到底部主体主题明细。',
        entries: topEvidence,
      },
      高风险主体数: {
        drawerTitle: '高风险主体',
        summary: '高风险主体按主体综合得分和低分主题结果识别，关注主体综合得分、低分主题和处置闭环率，不直接由异常数量判定。',
        primary: {
          label: '高风险主体数',
          value: `${highRiskSubjectCount + higherRiskSubjectCount}个`,
          badge: '高风险 + 较高风险',
          formula: '主体风险等级为高风险或较高风险后按主体名称去重计数',
          source: '当前筛选范围内主体综合风险结果',
          explanation: '同一主体在多个主题下重复出现时只计一次，抽屉明细展示风险靠前主体。',
        },
        sections: [
          {
            title: '风险主体概览',
            stats: [
              { label: '高风险主体数', value: `${highRiskSubjectCount}个` },
              { label: '较高风险主体数', value: `${higherRiskSubjectCount}个` },
              { label: '涉及区划数', value: `${regionCount}个` },
              { label: '涉及监控主题数', value: `${themeCount}个` },
              { label: '平均综合得分', value: `${formatScore(overallScore - 8)}分` },
            ],
          },
        ],
        listTitle: '具体主体明细',
        listHint: '点击主体后同步筛选主体、地图高亮所属区划，并切到底部主体主题明细。',
        entries: topSubjects,
      },
      低分监控主题数: {
        drawerTitle: '低分监控主题',
        summary: '低分监控主题指主题得分低于阈值的业务监控或专题监控，重点关注主题平均得分、高风险主体数和低分指标数。',
        primary: {
          label: '低分监控主题数',
          value: `${lowScoreThemeCount}个`,
          badge: '主题平均分 < 70',
          formula: '当前范围内主题平均得分低于 70 分的监控主题去重计数',
          source: '监控主题评分态势 mock 汇总',
          explanation: '该值用于识别主题短板，优先查看低分主题对应的主体和指标原因。',
        },
        sections: [
          {
            title: '低分主题概览',
            stats: [
              { label: '低分主题数', value: `${lowScoreThemeCount}个` },
              { label: '高风险主题数', value: `${highRiskThemeCount}个` },
              { label: '较高风险主题数', value: `${lowScoreThemeCount - highRiskThemeCount}个` },
              { label: '涉及主体数', value: `${subjectCount}个` },
              { label: '平均主题得分', value: `${formatScore(62)}分` },
            ],
          },
        ],
        listTitle: '具体主题明细',
        listHint: '点击主题后切换到该监控主题口径。',
        entries: topThemes,
      },
      异常率: {
        drawerTitle: '异常率分析',
        summary: '异常率 = 异常数据数 / 应检测数据总数 × 100%，反映数据检测发现的异常占比。',
        primary: {
          label: '异常率',
          value: `${abnormalRateTotal}%`,
          badge: '异常 / 应检测',
          formula: '异常数据数 / 应检测数据总数 × 100%',
          source: '异常数据明细 mock 汇总',
          explanation: '先统计当前范围内异常数据条数，再除以应检测数据总量。',
          numerator: `${abnormalTotalCountForRate.toLocaleString('zh-CN')}条异常数据`,
          denominator: `${abnormalTotalForCalc.toLocaleString('zh-CN')}条应检测数据`,
        },
        sections: [
          {
            title: '异常率概览',
            stats: [
              { label: '异常率', value: `${abnormalRateTotal}%` },
              { label: '异常数据数', value: `${abnormalTotalCountForRate.toLocaleString('zh-CN')}条` },
              { label: '应检测数据总数', value: `${abnormalTotalForCalc.toLocaleString('zh-CN')}条` },
              { label: '涉及主体数', value: `${subjectCount}个` },
              { label: '涉及监控主题数', value: `${themeCount}个` },
            ],
          },
        ],
        listTitle: '具体异常明细',
        listHint: '点击条目后切到底部异常数据明细。',
        entries: topEvidence,
      },
      退回率: {
        drawerTitle: '退回率分析',
        summary: '退回率 = 审核退回事项数 / 已提交审核事项数 × 100%，退回率偏高说明材料完整性、说明质量或整改反馈质量不足。',
        primary: {
          label: '退回率',
          value: `${reviewRejectRateTotal}%`,
          badge: '退回 / 已提交',
          formula: '审核退回事项数 / 已提交审核事项数 × 100%',
          source: '审核退回事项 mock 汇总',
          explanation: '用于解释材料完整性、说明质量或整改反馈质量造成的审核退回压力。',
          numerator: `${reviewRejectCountCalc}条审核退回事项`,
          denominator: `${reviewSubmitCountCalc}条已提交审核事项`,
        },
        sections: [
          {
            title: '退回率概览',
            stats: [
              { label: '退回率', value: `${reviewRejectRateTotal}%` },
              { label: '审核退回事项', value: `${reviewRejectCountCalc}条` },
              { label: '已提交审核事项', value: `${reviewSubmitCountCalc}条` },
              { label: '涉及主体数', value: `${subjectCount}个` },
              { label: '涉及监控主题数', value: `${themeCount}个` },
            ],
          },
        ],
        listTitle: '具体退回明细',
        listHint: '点击条目后切到底部异常数据明细查看相关事项。',
        entries: topThemes.map((item, i) => ({
          ...item,
          name: item.name,
          meta: `退回率 ${(8 + i * 2).toFixed(1)}%`,
        })),
      },
      闭环率: {
        drawerTitle: '闭环率分析',
        summary: '闭环率 = 已闭环事项数 / 应闭环事项数 × 100%，反映日常监督发现事项的最终处理完成情况。',
        primary: {
          label: '闭环率',
          value: `${formatScore(closedLoopRateTotal)}%`,
          badge: '已闭环 / 应闭环',
          formula: '已闭环事项数 / 应闭环事项数 × 100%',
          source: '处置闭环事项 mock 汇总',
          explanation: '用于判断已发现事项的处理完成情况，闭环率低时优先查看未闭环和超期事项。',
          numerator: `${closedLoopCount}条已闭环事项`,
          denominator: `${abnormalTotalCountForRate}条应闭环事项`,
        },
        sections: [
          {
            title: '闭环率概览',
            stats: [
              { label: '闭环率', value: `${formatScore(closedLoopRateTotal)}%` },
              { label: '已闭环数', value: `${closedLoopCount}条` },
              { label: '应闭环数', value: `${abnormalTotalCountForRate}条` },
              { label: '未闭环数', value: `${notClosedCount}条` },
              { label: '超期未闭环数', value: `${overdueCount}条` },
              { label: '较上期变化', value: '+3.2%' },
            ],
          },
        ],
        listTitle: '具体闭环明细',
        listHint: '点击条目后切到底部异常数据明细查看处置状态。',
        entries: topThemes.map((item, i) => ({
          ...item,
          name: item.name,
          meta: `未闭环 ${Math.round(15 * (i + 1) * 0.3)}条，超期 ${Math.round(8 * (i + 1) * 0.3)}条`,
        })),
      },
    };
  }, [activeTheme, currentAreaText, filteredScoreRows, primaryMetricTitle, primaryMetricTrend, subjectRankings, visibleEvidences, visibleThemes]);
  const activeMetricDrawer = activeMetric ? metricDrawerData[activeMetric as keyof typeof metricDrawerData] : null;

  const syncMapToSubject = useCallback((subjectName: string) => {
    const subjectRow = baseFilteredScoreRows.find((row) => row.subjectName === subjectName) || subjectThemeScores.find((row) => row.subjectName === subjectName);
    if (!subjectRow) return;

    if (countyParentMap[subjectRow.regionName]) {
      setSelectedRegion(countyParentMap[subjectRow.regionName]);
      setSelectedMapArea(subjectRow.regionName);
      setAdminRegion(subjectRow.regionName);
      return;
    }

    if (subjectRow.regionName === '省本级') {
      setSelectedRegion('省本级');
      setSelectedMapArea(null);
      setAdminRegion('省本级');
      return;
    }

    if (cityRegions.includes(subjectRow.regionName)) {
      setSelectedRegion(null);
      setSelectedMapArea(null);
      setAdminRegion('湖南省全辖');
    }
  }, [baseFilteredScoreRows]);

  const handleCategoryChange = (category: MonitorCategory) => {
    setMonitorCategory(category);
    setMonitorTheme('全部');
    setSelectedTheme(null);
    setSelectedSubject(null);
  };

  const handleAdminRegionChange = (regionName: string) => {
    setAdminRegion(regionName);
    if (regionName === '湖南省全辖') {
      setSelectedRegion(null);
      setSelectedMapArea(null);
    } else if (regionName === '省本级') {
      setSelectedRegion('省本级');
      setSelectedMapArea(null);
    } else if (countyParentMap[regionName]) {
      setSelectedRegion(countyParentMap[regionName]);
      setSelectedMapArea(regionName);
    } else if (selectedMapArea && regionName === selectedMapArea && activeRegion) {
      setSelectedRegion(activeRegion);
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
    setAdminRegion('湖南省全辖');
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
    setSelectedSubject(null);
    setSelectedIndicator(null);
  };

  const handleMapCountySelect = (countyName: string, parentRegion: string) => {
    setSelectedRegion(parentRegion);
    setSelectedMapArea(countyName);
    setAdminRegion(countyName);
    setSelectedSubject(null);
    setSelectedIndicator(null);
  };

  const handleBackToProvince = () => {
    setAdminRegion('湖南省全辖');
    setSelectedRegion(null);
    setSelectedMapArea(null);
    setSelectedSubject(null);
    setSelectedIndicator(null);
  };

  const handleBackToCity = () => {
    if (selectedRegion) {
      setAdminRegion(selectedRegion);
      setSelectedMapArea(null);
      setSelectedSubject(null);
      setSelectedIndicator(null);
    }
  };

  const handleProvinceLevelSelect = () => {
    setAdminRegion('省本级');
    setSelectedRegion('省本级');
    setSelectedMapArea(null);
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
      setSelectedSubject(null);
      return;
    }
    setSelectedTheme(theme);
    setMonitorTheme(theme);
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

  return (
    <div className="global-overview-page">
      <TopBar title="财会监督系统" onNavigate={handleNavigate} />
      <main className="global-overview-main">
        <section className="overview-hero">
          <div className="hero-title-line">
            <h1>全辖监督分析</h1>
            <p>以评价体系得分为主线 识别风险高低，以异常率、审核质量、闭环效率解释扣分原因。</p>
          </div>
          <div className="hero-context">{currentPositionText}</div>
        </section>

        <section className="daily-filter-panel">
          <div className="filter-main-line">
            <label className="filter-field">
              <span>统计时间</span>
              <select value={timeRange} onChange={(event) => setTimeRange(event.target.value as TimeRange)}>
                {timeRanges.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            {timeRange === '自定义' && (
              <div className="date-range">
                <label>
                  <span>开始日期</span>
                  <input value={customStart} onChange={(event) => setCustomStart(event.target.value)} type="date" />
                </label>
                <label>
                  <span>结束日期</span>
                  <input value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} type="date" />
                </label>
              </div>
            )}
            <label className="filter-field wide">
              <span>行政区划</span>
              <select value={adminRegion} onChange={(event) => handleAdminRegionChange(event.target.value)}>
                {adminRegionOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>主体类型</span>
              <select value={subjectType} onChange={(event) => handleSubjectTypeChange(event.target.value as SubjectTypeFilter)}>
                {subjectTypeFilters.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field subject-field">
              <span>主体名称</span>
              <select value={selectedSubject || '全部'} onChange={(event) => handleSubjectNameChange(event.target.value)}>
                <option value="全部">全部</option>
                {availableSubjectOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>监控分类</span>
              <select value={monitorCategory} onChange={(event) => handleCategoryChange(event.target.value as MonitorCategory)}>
                <option value="全部">全部</option>
                <option value="业务监控">业务监控</option>
                <option value="专题监控">专题监控</option>
              </select>
            </label>
            <label className="filter-field theme-field">
              <span>监控主题</span>
              <select value={monitorTheme} onChange={(event) => handleThemeSelect(event.target.value)}>
                <option value="全部">全部</option>
                {monitorCategory === '全部' && (
                  <>
                    <optgroup label="业务监控">
                      {businessThemes.map((theme) => (
                        <option key={theme} value={theme}>
                          {theme}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="专题监控">
                      {specialThemes.map((theme) => (
                        <option key={theme} value={theme}>
                          {theme}
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
                {monitorCategory !== '全部' &&
                  availableThemeOptions.map((theme) => (
                    <option key={theme} value={theme}>
                      {theme}
                    </option>
                  ))}
              </select>
            </label>
            <button type="button" className="refresh-button" title="刷新当前筛选结果" onClick={handleRefresh}>
              <RefreshCw size={13} />
              <span>刷新</span>
            </button>
          </div>
        </section>

        <section className="score-metric-grid">
          {metrics.map((metric) => (
            <div
              key={metric.title}
              className={`score-card ${metric.emphasis}${metric.statusText ? ' has-context' : ''}${metric.hoverExplanation ? ' has-hover-tip' : ''}`}
              title={metric.hoverExplanation ? undefined : `${metric.title}，点击查看详情`}
              onClick={() => {
                setActiveMetric(metric.title);
                if (metric.title === '高风险主体数') setDetailTab('主体主题明细');
                if (metric.title === '低分监控主题数') {
                  setMonitorTheme('全部');
                  setSelectedTheme(null);
                }
              }}
            >
              <span className="score-title" title={metric.description}>{metric.title}</span>
              <span className="score-caption" title={metric.description}>{metric.description}</span>
              <span className="score-value-row">
                <span className="metric-value-hit">
                  <strong>{metric.value}</strong>
                  {metric.unit && <em>{metric.unit}</em>}
                  {metric.hoverExplanation && (
                    <div className="value-hover-tooltip">
                      <div className="hover-tooltip-title">{metric.title}</div>
                      {metric.hoverExplanation.calculationFormula && (
                        <div className="hover-tooltip-row">
                          <span>口径：</span>
                          <span>{metric.hoverExplanation.calculationFormula}</span>
                        </div>
                      )}
                      {metric.hoverExplanation.referenceFactors && metric.hoverExplanation.referenceFactors.length > 0 && (
                        <div className="hover-tooltip-row">
                          <span>构成：</span>
                          <span>{metric.hoverExplanation.referenceFactors.join('、')}</span>
                        </div>
                      )}
                      {metric.hoverExplanation.numerator && (
                        <div className="hover-tooltip-row">
                          <span>分子：</span>
                          <span>{metric.hoverExplanation.numerator}</span>
                        </div>
                      )}
                      {metric.hoverExplanation.denominator && (
                        <div className="hover-tooltip-row">
                          <span>分母：</span>
                          <span>{metric.hoverExplanation.denominator}</span>
                        </div>
                      )}
                      {metric.hoverExplanation.additionalInfo && (
                        <div className="hover-tooltip-row">
                          <span>说明：</span>
                          <span>{metric.hoverExplanation.additionalInfo}</span>
                        </div>
                      )}
                      {metric.hoverExplanation.scope && (
                        <div className="hover-tooltip-row">
                          <span>范围：</span>
                          <span>{metric.hoverExplanation.scope}</span>
                        </div>
                      )}
                    </div>
                  )}
                </span>
              </span>
              {metric.statusText && <span className="score-status">{metric.statusText}</span>}
              {metric.trendText && <span className={`score-trend ${metric.trendDirection || ''}`}>{metric.trendText}</span>}
            </div>
          ))}
        </section>

        <section className="analysis-grid">
          {/* 左侧：主题风险排行 */}
          <section className={`panel theme-panel${hoveredThemeMetric ? ' has-hover-card' : ''}`} onMouseLeave={() => setHoveredThemeMetric(null)}>
            <div className="panel-header">
              <h2>主题风险排行</h2>
              <span className="panel-note">{visibleThemes.length} 个主题</span>
            </div>
            <div className="theme-ranking-list">
              {visibleThemes.map((theme, index) => (
                <div key={theme.monitorTheme} className="theme-ranking-row">
                  <span className="theme-rank-num">{index + 1}</span>
                  <div className="theme-rank-content">
                    <div className="theme-rank-title">
                      <strong>{theme.monitorTheme}</strong>
                      <span className="rank-score-badge">{formatScore(theme.averageScore)}分｜{theme.riskLevel}</span>
                    </div>
                    <div className="theme-rank-stats">
                      <span
                        className="stat-abnormal-rate"
                        onMouseEnter={() => setHoveredThemeMetric({ theme, metric: '异常率' })}
                      >
                        异常率 {theme.abnormalRate.toFixed(1)}%
                      </span>
                      <span className="stat-divider">｜</span>
                      <span
                        className="stat-reject-rate"
                        onMouseEnter={() => setHoveredThemeMetric({ theme, metric: '退回率' })}
                      >
                        退回率 {theme.reviewRejectRate.toFixed(1)}%
                      </span>
                      <span className="stat-divider">｜</span>
                      <span
                        className="stat-closed-loop-rate"
                        onMouseEnter={() => setHoveredThemeMetric({ theme, metric: '闭环率' })}
                      >
                        闭环率 {formatScore(theme.closedLoopRate)}%
                      </span>
                    </div>
                    <div className="theme-rank-deduction">
                      <span className="deduction-label">主要扣分：</span>
                      <span className="deduction-reason">{theme.mainDeductionReason}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {hoveredThemeMetric && (() => {
              const hoverInfo = getThemeMetricHover(hoveredThemeMetric.theme, hoveredThemeMetric.metric);
              return (
                <div className="theme-hover-card">
                  <strong>{hoveredThemeMetric.theme.monitorTheme}</strong>
                  <em>{hoverInfo.title} {hoverInfo.value}</em>
                  <span>公式：{hoverInfo.formula}</span>
                  <span>分子：{hoverInfo.numerator}</span>
                  <span>分母：{hoverInfo.denominator}</span>
                </div>
              );
            })()}
          </section>

          {/* 中间：区划主体风险分布 */}
          <div className="middle-column">
            <section className="panel map-panel">
              <div className="panel-header">
                <div>
                  <h2>{mapPanelTitle}</h2>
                  <span className="panel-note">{mapPanelNote}</span>
                </div>
                <div className="map-switch">
                  {(monitorTheme === '全部' ? mapMetricsAllThemes : mapMetricsSpecificTheme).map((item) => (
                    <button key={item} className={mapMetric === item ? 'active' : ''} onClick={() => setMapMetric(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="map-content">
                <div className="map-toolbar">
                  {activeRegion && (
                    <div className="back-buttons">
                      {selectedMapArea && (
                        <>
                          <button type="button" onClick={handleBackToCity}>
                            返回上级
                          </button>
                          <span className="button-divider">/</span>
                        </>
                      )}
                      <button type="button" onClick={handleBackToProvince}>
                        返回全省
                      </button>
                    </div>
                  )}
                </div>
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
                    <span>主体风险摘要</span>
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
                  <span><i className="legend-high" />高</span>
                  <span><i className="legend-mid" />中</span>
                  <span><i className="legend-low" />低</span>
                </div>
                <div className={`map-subject-ranking${isHoverCardVisible && hoveredRankingSubject ? ' has-hover-card' : ''}`} onMouseLeave={() => {
                  if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                  hideTimeoutRef.current = setTimeout(() => {
                    setIsHoverCardVisible(false);
                    setHoveredSubjectName(null);
                    setHoveredItemIndex(null);
                  }, 200);
                }}>
                  <h3>主体风险排行</h3>
                  <div className="ranking-list">
                    {subjectRankings.map((subject, index) => {
                      return (
                        <button
                          key={subject.subjectName}
                          className={`ranking-item ${selectedSubject === subject.subjectName ? 'active' : ''}`}
                          onClick={() => handleSubjectSelect(subject.subjectName)}
                          onMouseEnter={() => {
                            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                            setHoveredSubjectName(subject.subjectName);
                            setHoveredItemIndex(index);
                            setIsHoverCardVisible(true);
                          }}
                        >
                          <span className="rank-badge">{index + 1}</span>
                          <div className="subject-info">
                            <span className="subject-name">{subject.subjectName}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {isHoverCardVisible && hoveredRankingSubject && (
                    <div 
                      className="ranking-hover-card"
                      style={{ top: `${hoveredItemIndex !== null ? (hoveredItemIndex * 48 + 74) : 'auto'}px`, bottom: hoveredItemIndex !== null ? 'auto' : '12px' }}
                      onMouseEnter={() => {
                        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                      }}
                      onMouseLeave={() => {
                        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                        hideTimeoutRef.current = setTimeout(() => {
                          setIsHoverCardVisible(false);
                          setHoveredSubjectName(null);
                          setHoveredItemIndex(null);
                        }, 200);
                      }}
                    >
                      <strong>{hoveredRankingSubject.subjectName}</strong>
                      <em>{hoveredRankingSubject.regionName}｜{hoveredRankingSubject.subjectType}</em>
                      <div>
                        {getSubjectRiskLines(hoveredRankingSubject).map((line) => (
                          <span key={line.label}>{line.label} {line.value}｜{line.risk}</span>
                        ))}
                      </div>
                      <p>{hoveredRankingSubject.mainDeductionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* 右侧：规则预警分析 */}
          <section className="panel rule-analysis-panel">
            <div className="panel-header">
              <h2>规则预警分析</h2>
              <div className="rule-tabs">
                <button className={ruleAnalysisTab === '规则类型' ? 'active' : ''} onClick={() => setRuleAnalysisTab('规则类型')}>规则类型</button>
                <button className={ruleAnalysisTab === '高频规则' ? 'active' : ''} onClick={() => setRuleAnalysisTab('高频规则')}>高频规则</button>
                <button className={ruleAnalysisTab === '主体触发' ? 'active' : ''} onClick={() => setRuleAnalysisTab('主体触发')}>主体触发</button>
              </div>
            </div>

            {/* 规则类型页签 */}
            {ruleAnalysisTab === '规则类型' && (
              <div className="rule-type-list">
                {buildRuleTypeSummaries().map((item) => (
                  <button
                    key={item.ruleType}
                    className={selectedRuleType === item.ruleType ? 'rule-type-row active' : 'rule-type-row'}
                    onClick={() => {
                      setSelectedRuleType(selectedRuleType === item.ruleType ? null : item.ruleType);
                      if (selectedRuleType !== item.ruleType) {
                        setRuleDrawerData({ type: 'rule-type', data: item });
                      }
                    }}
                  >
                    <div className="rule-type-title">
                      <strong>{item.ruleType}</strong>
                      <span className="stat-badge">{item.ruleCount}规则</span>
                    </div>
                    <div className="rule-type-stats">
                      <span>触发 <b>{item.triggerCount}</b> 次</span>
                      <span className="stat-divider">｜</span>
                      <span>异常 <b>{item.abnormalCount}</b> 条</span>
                      <span className="stat-divider">｜</span>
                      <span>拦截 <b>{item.interceptCount}</b> 条</span>
                      <span className="stat-divider">｜</span>
                      <span>涉及 <b>{item.subjectCount}</b> 主体</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 高频规则页签 */}
            {ruleAnalysisTab === '高频规则' && (
              <div className="high-frequency-rule-list">
                {buildHighFrequencyRules().map((item) => (
                  <button
                    key={item.ruleCode}
                    className={selectedRuleCode === item.ruleCode ? 'rule-row active' : 'rule-row'}
                    onClick={() => {
                      setSelectedRuleCode(selectedRuleCode === item.ruleCode ? null : item.ruleCode);
                      if (selectedRuleCode !== item.ruleCode) {
                        setRuleDrawerData({ type: 'high-frequency-rule', data: item });
                      }
                    }}
                  >
                    <div className="rule-title">
                      <strong>{item.ruleName}</strong>
                    </div>
                    <div className="rule-meta">
                      <span className="business-tag">{item.businessCategory}</span>
                      <span className="theme-tag">{item.monitorTheme}</span>
                    </div>
                    <div className="rule-indicator">
                      <span>关联指标：{item.relatedIndicator}</span>
                    </div>
                    <div className="rule-stats">
                      <span>触发 <b>{item.triggerCount}</b> 次</span>
                      <span className="stat-divider">｜</span>
                      <span>异常 <b>{item.abnormalCount}</b> 条</span>
                      <span className="stat-divider">｜</span>
                      <span>拦截 <b>{item.interceptCount}</b> 条</span>
                      <span className="stat-divider">｜</span>
                      <span>涉及 <b>{item.subjectCount}</b> 主体</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 主体触发页签 */}
            {ruleAnalysisTab === '主体触发' && (
              <div className="subject-trigger-list">
                {buildSubjectTriggerSummaries().map((item) => (
                  <button
                    key={item.subjectName}
                    className={selectedSubject === item.subjectName ? 'subject-trigger-row active' : 'subject-trigger-row'}
                    onClick={() => {
                      setSelectedSubject(selectedSubject === item.subjectName ? null : item.subjectName);
                      if (selectedSubject !== item.subjectName) {
                        setRuleDrawerData({ type: 'subject-trigger', data: item });
                      }
                    }}
                  >
                    <div className="subject-trigger-title">
                      <strong>{item.subjectName}</strong>
                      <span className="region-tag">{item.regionName}</span>
                    </div>
                    <div className="subject-trigger-type">
                      <span>{item.subjectType}</span>
                    </div>
                    <div className="subject-trigger-stats">
                      <span>规则 <b>{item.ruleCount}</b> 条</span>
                      <span className="stat-divider">｜</span>
                      <span>触发 <b>{item.triggerCount}</b> 次</span>
                      <span className="stat-divider">｜</span>
                      <span>异常 <b>{item.abnormalCount}</b> 条</span>
                      <span className="stat-divider">｜</span>
                      <span>拦截 <b>{item.interceptCount}</b> 条</span>
                      <span className="stat-divider">｜</span>
                      <span>{activeTheme ? '评价得分' : '风险指数'} <b>{formatScore(item.comprehensiveScore)}</b></span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </section>

        <section className="panel detail-panel">
          <div className="panel-header detail-header">
            <h2>明细追溯</h2>
            <div className="detail-tabs">
              {detailTabs.map((tab) => (
                <button key={tab} className={detailTab === tab ? 'active' : ''} onClick={() => setDetailTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="detail-table-wrap">
            {detailTab === '主体主题明细' && (
              <table>
                <thead>
                  <tr>
                    <th>主体名称</th>
                    <th>所属区划</th>
                    <th>主体类型</th>
                    <th>监控分类</th>
                    <th>监控主题</th>
                    <th>主题得分</th>
                    <th>风险等级</th>
                    <th>低分指标</th>
                    <th>异常率</th>
                    <th>退回率</th>
                    <th>闭环率</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScoreRows.map((row) => {
                    const abnormalTotal = getMockAbnormalTotal(row.abnormalCount);
                    const reviewParts = getMockReviewParts(row.abnormalCount);
                    const closedCount = Math.round(row.abnormalCount * row.closedLoopRate / 100);
                    return (
                      <tr key={`${row.subjectName}-${row.monitorTheme}`}>
                        <td>{row.subjectName}</td>
                        <td>{row.regionName}</td>
                        <td>{row.subjectType}</td>
                        <td>{row.monitorCategory}</td>
                        <td>{row.monitorTheme}</td>
                        <td>{formatScore(row.themeScore)}</td>
                        <td><span className={`risk-pill ${riskToneClass[row.riskLevel]}`}>{row.riskLevel}</span></td>
                        <td>{row.lowScoreIndicators.join('、')}</td>
                        <td className="rate-cell" title={`异常数：${row.abnormalCount}，应检测数据：${abnormalTotal}`}>{formatPercent(getRatioPercent(row.abnormalCount, abnormalTotal, 1))}</td>
                        <td className="rate-cell" title={`退回数：${reviewParts.rejectCount}，已提交审核：${reviewParts.submitCount}`}>{formatPercent(getRatioPercent(reviewParts.rejectCount, reviewParts.submitCount, 1))}</td>
                        <td className="rate-cell" title={`已闭环：${closedCount}，应闭环：${row.abnormalCount}`}>{formatPercent(row.closedLoopRate)}</td>
                        <td><button onClick={() => handleViewSubjectTheme(row)}>查看</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {detailTab === '异常数据明细' && (
              <table>
                <thead>
                  <tr>
                    <th>触发时间</th>
                    <th>行政区划</th>
                    <th>主体名称</th>
                    <th>监控分类</th>
                    <th>监控主题</th>
                    <th>规则名称</th>
                    <th>预警级别</th>
                    <th>处理方式</th>
                    <th>涉及金额</th>
                    <th>当前状态</th>
                    <th>关联评价指标</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAbnormalDetails
                    .map((item) => (
                      <tr key={`${item.triggerTime}-${item.subjectName}`}>
                        <td>{item.triggerTime}</td>
                        <td>{item.regionName}</td>
                        <td>{item.subjectName}</td>
                        <td>{item.monitorCategory}</td>
                        <td>{item.monitorTheme}</td>
                        <td>{item.ruleName}</td>
                        <td>{item.warningLevel}</td>
                        <td>{item.processingMethod}</td>
                        <td>{item.amount}</td>
                        <td>{item.currentStatus}</td>
                        <td>{item.linkedIndicator}</td>
                        <td><button>查看异常</button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {detailTab === '规则触发明细' && (
              <table>
                <thead>
                  <tr>
                    <th>执行时间</th>
                    <th>规则编码</th>
                    <th>规则名称</th>
                    <th>所属监控主题</th>
                    <th>执行结果</th>
                    <th>命中数量</th>
                    <th>拦截数量</th>
                    <th>失败原因</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRuleIntercepts
                    .map((item) => (
                      <tr key={item.ruleCode}>
                        <td>{item.executionTime}</td>
                        <td>{item.ruleCode}</td>
                        <td>{item.ruleName}</td>
                        <td>{item.monitorTheme}</td>
                        <td>{item.executionResult}</td>
                        <td>{item.hitCount}</td>
                        <td>{item.interceptCount}</td>
                        <td>{item.failureReason}</td>
                        <td><button>查看流水</button></td>
                      </tr>
                    ))}
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
                  <span>指标解释</span>
                  <h2>{activeMetricDrawer.drawerTitle || activeMetric}</h2>
                </div>
                <button onClick={() => setActiveMetric(null)} aria-label="收起">收起</button>
              </div>
              <div className="drawer-scope">{currentPositionText}</div>
              <section className="drawer-primary-card">
                <div className="drawer-primary-head">
                  <div>
                    <span>{activeMetricDrawer.primary.label}</span>
                    <strong>{activeMetricDrawer.primary.value}</strong>
                  </div>
                  <em>{activeMetricDrawer.primary.badge}</em>
                </div>
                <p>{activeMetricDrawer.primary.explanation}</p>
                <div className="drawer-formula-grid">
                  <div className="drawer-formula-item wide">
                    <span>计算口径</span>
                    <strong>{activeMetricDrawer.primary.formula}</strong>
                  </div>
                  <div className="drawer-formula-item">
                    <span>数据来源</span>
                    <strong>{activeMetricDrawer.primary.source}</strong>
                  </div>
                  {activeMetricDrawer.primary.numerator && (
                    <div className="drawer-formula-item">
                      <span>分子</span>
                      <strong>{activeMetricDrawer.primary.numerator}</strong>
                    </div>
                  )}
                  {activeMetricDrawer.primary.denominator && (
                    <div className="drawer-formula-item">
                      <span>分母</span>
                      <strong>{activeMetricDrawer.primary.denominator}</strong>
                    </div>
                  )}
                </div>
              </section>

              <p className="drawer-summary">{activeMetricDrawer.summary}</p>

              {activeMetricDrawer.sections?.map((section, idx) => (
                <section key={idx} className="drawer-section">
                  <div className="drawer-section-heading">
                    <span className="drawer-section-kicker">其他项</span>
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
                                ? '评价得分 = Σ（指标得分 × 指标权重），得分越高风险越低，适用于单个监控主题。'
                                : '风险指数 = 评价得分风险×50% + 异常率×20% + 退回率×15% + 闭环不足率×15%，风险指数越高风险越大。'
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
                          if (activeMetric === '高风险主体数' && isSubjectSummary(item.data)) {
                            setSelectedSubject(item.data.subjectName);
                            syncMapToSubject(item.data.subjectName);
                            setDetailTab('主体主题明细');
                          }
                          if (activeMetric === '低分监控主题数' && isThemePosture(item.data)) {
                            setMonitorCategory(item.data.monitorCategory);
                            setMonitorTheme(item.data.monitorTheme);
                            setSelectedTheme(item.data.monitorTheme);
                          }
                          if (activeMetric === '异常率') {
                            setDetailTab('异常数据明细');
                          }
                          if (activeMetric === '退回率') {
                            setDetailTab('异常数据明细');
                          }
                          if (activeMetric === '闭环率') {
                            setDetailTab('异常数据明细');
                          }
                          if (activeMetric === primaryMetricTitle) {
                            setDetailTab('主体主题明细');
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

        {/* 规则预警分析抽屉 */}
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
                <button onClick={() => setRuleDrawerData(null)} aria-label="收起">收起</button>
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
                        <span>{activeTheme ? '评价得分' : '风险指数'}</span>
                        <strong>{formatScore(ruleDrawerData.data.comprehensiveScore)}分</strong>
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
