/**
 * @name 全辖日常监督分析
 */
import './style.css';
import '../../themes/ufsp-sky/globals.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { RotateCcw } from 'lucide-react';
import TopBar from '../../common/components/TopBar';

type TimeRange = '今日' | '昨日' | '本月' | '本季度' | '本年' | '自定义';
type MonitorCategory = '全部' | '业务监控' | '专题监控';
type DetailTab = '主体主题评分明细' | '指标扣分证据' | '异常数据明细' | '规则拦截流水';
type RiskLevel = '低风险' | '较低风险' | '中风险' | '较高风险' | '高风险';
type MapRiskLevel = '高风险' | '中风险' | '低风险';
type MapMetric = '综合风险' | '评分结果' | '规则触发' | '异常规模' | '闭环成效';
type RuleAnalysisTab = '规则类型' | '高频规则' | '主体触发';

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
  interceptCount: number;
  closedLoopRate: number;
  mainLowThemes: string[];
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
  closedLoopRate: number;
  ruleTriggerCount?: number; // 新增字段
}

interface ThemePosture {
  monitorCategory: Exclude<MonitorCategory, '全部'>;
  monitorTheme: string;
  averageScore: number;
  riskLevel: RiskLevel;
  highRiskSubjects: number;
  lowScoreIndicators: number;
  abnormalCount: number;
  interceptCount: number;
  closedLoopRate: number;
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
  ruleCount: number;
  triggerCount: number;
  abnormalCount: number;
  interceptCount: number;
  comprehensiveScore: number;
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
const mapMetrics: MapMetric[] = ['综合风险', '评分结果', '规则触发', '异常规模', '闭环成效'];
const detailTabs: DetailTab[] = ['主体主题评分明细', '指标扣分证据', '异常数据明细', '规则拦截流水'];

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

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function uniqueCount(items: string[]) {
  return new Set(items).size;
}

function normalizeRegionName(name: string) {
  return name.includes('湘西') ? '湘西州' : name;
}

const regionScores: RegionScore[] = [
  { regionName: '长沙市', comprehensiveScore: 78.6, riskLevel: '中风险', highRiskSubjects: 8, highRiskThemes: 5, abnormalCount: 286, interceptCount: 42, closedLoopRate: 82.4, mainLowThemes: ['预算执行', '地方政府债务'] },
  { regionName: '株洲市', comprehensiveScore: 67.2, riskLevel: '较高风险', highRiskSubjects: 6, highRiskThemes: 4, abnormalCount: 214, interceptCount: 36, closedLoopRate: 76.8, mainLowThemes: ['高标准农田建设资金使用', '预算编制'] },
  { regionName: '湘潭市', comprehensiveScore: 81.5, riskLevel: '较低风险', highRiskSubjects: 3, highRiskThemes: 2, abnormalCount: 118, interceptCount: 15, closedLoopRate: 88.2, mainLowThemes: ['资产管理', '会计核算'] },
  { regionName: '衡阳市', comprehensiveScore: 69.4, riskLevel: '较高风险', highRiskSubjects: 7, highRiskThemes: 4, abnormalCount: 236, interceptCount: 39, closedLoopRate: 74.6, mainLowThemes: ['三保', '预算执行'] },
  { regionName: '邵阳市', comprehensiveScore: 75.4, riskLevel: '中风险', highRiskSubjects: 4, highRiskThemes: 3, abnormalCount: 137, interceptCount: 20, closedLoopRate: 82.0, mainLowThemes: ['预算调整调剂', '三公'] },
  { regionName: '岳阳市', comprehensiveScore: 73.8, riskLevel: '中风险', highRiskSubjects: 5, highRiskThemes: 3, abnormalCount: 164, interceptCount: 27, closedLoopRate: 80.5, mainLowThemes: ['地方政府债务', '项目库'] },
  { regionName: '常德市', comprehensiveScore: 76.1, riskLevel: '中风险', highRiskSubjects: 4, highRiskThemes: 3, abnormalCount: 142, interceptCount: 21, closedLoopRate: 84.0, mainLowThemes: ['预算批复', '资产处置'] },
  { regionName: '张家界市', comprehensiveScore: 79.0, riskLevel: '中风险', highRiskSubjects: 3, highRiskThemes: 2, abnormalCount: 104, interceptCount: 14, closedLoopRate: 86.7, mainLowThemes: ['项目库', '一卡通'] },
  { regionName: '益阳市', comprehensiveScore: 84.2, riskLevel: '较低风险', highRiskSubjects: 2, highRiskThemes: 2, abnormalCount: 96, interceptCount: 12, closedLoopRate: 90.1, mainLowThemes: ['基础信息', '一卡通'] },
  { regionName: '郴州市', comprehensiveScore: 72.7, riskLevel: '中风险', highRiskSubjects: 5, highRiskThemes: 3, abnormalCount: 155, interceptCount: 25, closedLoopRate: 81.9, mainLowThemes: ['指标管理', '预算调整调剂'] },
  { regionName: '永州市', comprehensiveScore: 86.3, riskLevel: '较低风险', highRiskSubjects: 2, highRiskThemes: 1, abnormalCount: 82, interceptCount: 9, closedLoopRate: 91.3, mainLowThemes: ['会计核算', '三公'] },
  { regionName: '怀化市', comprehensiveScore: 71.6, riskLevel: '中风险', highRiskSubjects: 5, highRiskThemes: 3, abnormalCount: 151, interceptCount: 24, closedLoopRate: 79.8, mainLowThemes: ['减税降费政策落实', '预算执行'] },
  { regionName: '娄底市', comprehensiveScore: 83.0, riskLevel: '较低风险', highRiskSubjects: 2, highRiskThemes: 1, abnormalCount: 91, interceptCount: 13, closedLoopRate: 89.2, mainLowThemes: ['资产管理', '三保'] },
  { regionName: '湘西州', comprehensiveScore: 66.8, riskLevel: '较高风险', highRiskSubjects: 5, highRiskThemes: 4, abnormalCount: 196, interceptCount: 33, closedLoopRate: 73.5, mainLowThemes: ['一卡通', '高标准农田建设资金使用'] },
  { regionName: '省本级', comprehensiveScore: 74.8, riskLevel: '中风险', highRiskSubjects: 4, highRiskThemes: 3, abnormalCount: 132, interceptCount: 18, closedLoopRate: 85.6, mainLowThemes: ['资产管理', '预算批复'] },
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
];

const themePostures: ThemePosture[] = [
  { monitorCategory: '业务监控', monitorTheme: '预算执行', averageScore: 72.4, riskLevel: '中风险', highRiskSubjects: 8, lowScoreIndicators: 6, abnormalCount: 286, interceptCount: 42, closedLoopRate: 82.4 },
  { monitorCategory: '业务监控', monitorTheme: '预算编制', averageScore: 76.8, riskLevel: '中风险', highRiskSubjects: 5, lowScoreIndicators: 4, abnormalCount: 164, interceptCount: 22, closedLoopRate: 84.6 },
  { monitorCategory: '业务监控', monitorTheme: '资产管理', averageScore: 74.1, riskLevel: '中风险', highRiskSubjects: 6, lowScoreIndicators: 5, abnormalCount: 188, interceptCount: 24, closedLoopRate: 80.8 },
  { monitorCategory: '业务监控', monitorTheme: '指标管理', averageScore: 79.2, riskLevel: '中风险', highRiskSubjects: 4, lowScoreIndicators: 3, abnormalCount: 126, interceptCount: 18, closedLoopRate: 86.3 },
  { monitorCategory: '业务监控', monitorTheme: '会计核算', averageScore: 84.5, riskLevel: '较低风险', highRiskSubjects: 2, lowScoreIndicators: 2, abnormalCount: 86, interceptCount: 9, closedLoopRate: 91.2 },
  { monitorCategory: '专题监控', monitorTheme: '地方政府债务', averageScore: 69.5, riskLevel: '较高风险', highRiskSubjects: 9, lowScoreIndicators: 5, abnormalCount: 312, interceptCount: 48, closedLoopRate: 76.2 },
  { monitorCategory: '专题监控', monitorTheme: '三保', averageScore: 68.4, riskLevel: '较高风险', highRiskSubjects: 7, lowScoreIndicators: 5, abnormalCount: 246, interceptCount: 37, closedLoopRate: 74.9 },
  { monitorCategory: '专题监控', monitorTheme: '高标准农田建设资金使用', averageScore: 70.6, riskLevel: '中风险', highRiskSubjects: 6, lowScoreIndicators: 4, abnormalCount: 214, interceptCount: 31, closedLoopRate: 78.1 },
  { monitorCategory: '专题监控', monitorTheme: '行政事业单位国有资产处置', averageScore: 73.1, riskLevel: '中风险', highRiskSubjects: 5, lowScoreIndicators: 4, abnormalCount: 172, interceptCount: 23, closedLoopRate: 81.5 },
  { monitorCategory: '专题监控', monitorTheme: '一卡通', averageScore: 67.8, riskLevel: '较高风险', highRiskSubjects: 5, lowScoreIndicators: 4, abnormalCount: 196, interceptCount: 33, closedLoopRate: 73.5 },
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

const ruleTypes = ['预算管控类', '债务风险类', '资产监管类', '三保保障类', '会计核算类'];

function buildRuleTypeSummaries(): RuleTypeSummary[] {
  return [
    { ruleType: '预算管控类', ruleCount: 18, triggerCount: 356, abnormalCount: 426, interceptCount: 86, subjectCount: 28 },
    { ruleType: '债务风险类', ruleCount: 12, triggerCount: 248, abnormalCount: 312, interceptCount: 58, subjectCount: 16 },
    { ruleType: '资产监管类', ruleCount: 14, triggerCount: 192, abnormalCount: 246, interceptCount: 42, subjectCount: 22 },
    { ruleType: '三保保障类', ruleCount: 8, triggerCount: 224, abnormalCount: 284, interceptCount: 52, subjectCount: 18 },
    { ruleType: '会计核算类', ruleCount: 10, triggerCount: 146, abnormalCount: 188, interceptCount: 24, subjectCount: 14 },
  ].sort((a, b) => b.triggerCount - a.triggerCount);
}

function buildHighFrequencyRules(): HighFrequencyRule[] {
  return [
    { ruleCode: 'RC-BUD-001', ruleName: '无预算支付拦截规则', monitorTheme: '预算执行', relatedIndicator: '无预算/超预算支付控制', triggerCount: 126, abnormalCount: 146, interceptCount: 31, subjectCount: 12 },
    { ruleCode: 'RC-DEBT-004', ruleName: '债务风险指标异常规则', monitorTheme: '地方政府债务', relatedIndicator: '债务风险指标异常核验', triggerCount: 108, abnormalCount: 128, interceptCount: 17, subjectCount: 10 },
    { ruleCode: 'RC-TOP-003', ruleName: '三保资金保障预警规则', monitorTheme: '三保', relatedIndicator: '三保资金保障预警', triggerCount: 96, abnormalCount: 112, interceptCount: 22, subjectCount: 9 },
    { ruleCode: 'RC-BUD-002', ruleName: '超预算支付预警规则', monitorTheme: '预算编制', relatedIndicator: '项目入库完整性', triggerCount: 88, abnormalCount: 98, interceptCount: 14, subjectCount: 8 },
    { ruleCode: 'RC-AST-005', ruleName: '资产处置审批完整性规则', monitorTheme: '行政事业单位国有资产处置', relatedIndicator: '资产处置审批完整性', triggerCount: 74, abnormalCount: 86, interceptCount: 12, subjectCount: 7 },
    { ruleCode: 'RC-EXE-006', ruleName: '预算执行进度异常规则', monitorTheme: '预算执行', relatedIndicator: '支付疑点核实处置', triggerCount: 62, abnormalCount: 76, interceptCount: 8, subjectCount: 6 },
  ];
}

function buildSubjectTriggerSummaries(): SubjectTriggerSummary[] {
  return [
    { subjectName: '长沙市财政局', regionName: '长沙市', ruleCount: 8, triggerCount: 142, abnormalCount: 234, interceptCount: 30, comprehensiveScore: 68.5 },
    { subjectName: '衡阳市财政局', regionName: '衡阳市', ruleCount: 7, triggerCount: 128, abnormalCount: 198, interceptCount: 28, comprehensiveScore: 69.2 },
    { subjectName: '株洲市财政局', regionName: '株洲市', ruleCount: 6, triggerCount: 116, abnormalCount: 182, interceptCount: 24, comprehensiveScore: 67.8 },
    { subjectName: '湘西州财政局', regionName: '湘西州', ruleCount: 6, triggerCount: 108, abnormalCount: 176, interceptCount: 22, comprehensiveScore: 66.2 },
    { subjectName: '怀化市财政局', regionName: '怀化市', ruleCount: 5, triggerCount: 92, abnormalCount: 148, interceptCount: 18, comprehensiveScore: 71.5 },
  ];
}

function buildSubjectSummaries(rows: SubjectThemeScore[], sortMetric: MapMetric = '综合风险'): SubjectSummary[] {
  const grouped = rows.reduce<Record<string, SubjectThemeScore[]>>((acc, row) => {
    acc[row.subjectName] = acc[row.subjectName] || [];
    acc[row.subjectName].push(row);
    return acc;
  }, {});

  const subjectSummaries = Object.values(grouped).map((items) => {
    const first = items[0];
    const weightedScore = items.reduce((sum, item) => sum + item.themeScore * item.themeWeight, 0) / items.reduce((sum, item) => sum + item.themeWeight, 0);
    const abnormalCount = items.reduce((sum, item) => sum + item.abnormalCount, 0);
    const closedLoopRate = items.reduce((sum, item) => sum + item.closedLoopRate, 0) / items.length;
    const lowThemes = items.filter((item) => item.themeScore < 75).map((item) => item.monitorTheme);
    const mainReason = items.sort((a, b) => a.themeScore - b.themeScore)[0].mainDeductionReason;
    
    // 计算规则触发数（模拟）
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
      closedLoopRate,
      ruleTriggerCount, // 新增字段
    };
  });

  // 根据不同的排序指标排序
  return subjectSummaries.sort((a, b) => {
    switch (sortMetric) {
      case '综合风险':
        // 综合风险：分数越低越靠前
        return a.comprehensiveScore - b.comprehensiveScore;
      case '评分结果':
        // 评分结果：分数越高越靠前
        return b.comprehensiveScore - a.comprehensiveScore;
      case '规则触发':
        // 规则触发数：越多越靠前
        return b.ruleTriggerCount - a.ruleTriggerCount;
      case '异常规模':
        // 异常数据数：越多越靠前
        return b.abnormalCount - a.abnormalCount;
      case '闭环成效':
        // 闭环率：越低越靠前（待改进）
        return a.closedLoopRate - b.closedLoopRate;
      default:
        return a.comprehensiveScore - b.comprehensiveScore;
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
  return subjectThemeScores
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

function getMapAreaValue(area: MapAreaFeature, metric: MapMetric) {
  const parent = regionScores.find((region) => region.regionName === area.parentRegion);
  if (!parent) return 0;
  const score = clampScore(parent.comprehensiveScore + area.scoreOffset);
  if (metric === '综合风险') return 100 - score;
  if (metric === '评分结果') return score;
  if (metric === '规则触发') return Math.max(5, Math.round(parent.highRiskThemes * 8 + area.scoreOffset * 3));
  if (metric === '异常规模') return Math.max(18, Math.round(parent.abnormalCount / 3 + area.scoreOffset * 8));
  return Math.min(100, Math.max(30, Math.round(parent.closedLoopRate + area.scoreOffset * 0.8)));
}

function getMapRiskLevel(score: number): MapRiskLevel {
  if (score < 70) return '高风险';
  if (score < 85) return '中风险';
  return '低风险';
}

function getMapRiskColor(level: MapRiskLevel) {
  if (level === '高风险') return '#dc2626';
  if (level === '中风险') return '#f59e0b';
  return '#86efac';
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

function getAreaColor(area: MapAreaFeature, metric: MapMetric, min: number, max: number) {
  const summary = getAreaSummary(area, metric);
  if (!summary) return '#e5e7eb';
  if (metric === '综合风险' || metric === '评价得分') return getMapRiskColor(summary.mapRiskLevel);
  const ratio = max === min ? 0.4 : (summary.value - min) / (max - min);
  if (ratio > 0.82) return '#2563eb';
  if (ratio > 0.62) return '#60a5fa';
  if (ratio > 0.42) return '#93c5fd';
  if (ratio > 0.22) return '#bfdbfe';
  return '#dbeafe';
}

function HunanRiskMap({
  regions,
  viewRegion,
  selectedArea,
  metric,
  resetToken,
  onCitySelect,
  onCountySelect,
}: {
  regions: RegionScore[];
  viewRegion: string | null;
  selectedArea: string | null;
  metric: MapMetric;
  resetToken: number;
  onCitySelect: (cityName: string) => void;
  onCountySelect: (countyName: string, parentRegion: string) => void;
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
    const values = safeAreaData.map((area) => getMapAreaValue(area, metric));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mapName = isCityView ? `hunan-city-${viewRegion}` : 'hunan-province';
    if (isCityView) {
      const cityFeatures = districtGeoJson.features.filter((feature) => getParentRegion(feature.properties) === viewRegion);
      echarts.registerMap(mapName, { ...districtGeoJson, features: cityFeatures } as EChartsGeoJson);
    }
    const rankedAreas = [...safeAreaData].sort((a, b) => getMapAreaValue(b, '综合风险') - getMapAreaValue(a, '综合风险'));
    const data = safeAreaData.map((area) => {
      const summary = getAreaSummary(area, metric);
      return {
        name: area.name,
        value: summary ? summary.value : 0,
        itemStyle: {
          areaColor: getAreaColor(area, metric, min, max),
          borderColor: area.name === selectedArea ? '#155eef' : '#ffffff',
          borderWidth: area.name === selectedArea ? 2 : 1,
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
          return `
            <div class="map-tooltip">
              <strong>${params.name}</strong>
              ${isCityView ? `<span>所属市州：${summary.parent.regionName}</span>` : ''}
              <span>综合得分：${formatScore(summary.score)}｜${summary.mapRiskLevel}</span>
              <span>全省排名：第 ${rank} 位</span>
              <span>高风险主体：${summary.parent.highRiskSubjects} 个</span>
              <span>低分监控主题：${summary.parent.mainLowThemes.join('、')}</span>
              <span>触发规则数：${summary.parent.highRiskThemes * 6 + 12} 条</span>
              <span>异常数据：${summary.parent.abnormalCount} 条</span>
              <span>处置闭环率：${formatPercent(summary.parent.closedLoopRate)}</span>
            </div>
          `;
        },
      },
      visualMap: {
        show: false,
        min,
        max,
        inRange: {
          color: metric === '评价得分' ? ['#fee2e2', '#fef3c7', '#dbeafe', '#93c5fd', '#2563eb'] : ['#dbeafe', '#93c5fd', '#fbbf24', '#f97316', '#ef4444'],
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
          emphasis: { label: { color: '#0f172a', fontWeight: 700 }, itemStyle: { areaColor: '#bfdbfe' } },
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
  }, [districtAreas, districtGeoJson, mapVersion, metric, onCitySelect, onCountySelect, provinceAreas, provinceGeoJson, regions, selectedArea, viewRegion]);

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
            <button key={region.regionName} className={region.regionName === selectedArea ? 'active' : ''} onClick={() => onCitySelect(region.regionName)}>
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
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [mapMetric, setMapMetric] = useState<MapMetric>('综合风险');
  const [mapResetToken, setMapResetToken] = useState(0);
  const [detailTab, setDetailTab] = useState<DetailTab>('主体主题评分明细');
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [ruleAnalysisTab, setRuleAnalysisTab] = useState<RuleAnalysisTab>('规则类型');
  const [selectedRuleType, setSelectedRuleType] = useState<string | null>(null);
  const [selectedRuleCode, setSelectedRuleCode] = useState<string | null>(null);

  const activeRegion = selectedRegion ?? (adminRegion === '湖南省全辖' ? null : adminRegion);
  const activeTheme = selectedTheme ?? (monitorTheme === '全部' ? null : monitorTheme);
  const activeMapRegion = activeRegion && activeRegion !== '省本级' ? activeRegion : null;

  const filteredScoreRows = useMemo(() => {
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
      const subjectMatched = !selectedSubject || row.subjectName === selectedSubject;
      return regionMatched && categoryMatched && themeMatched && subjectMatched;
    });
  }, [activeRegion, activeTheme, monitorCategory, selectedMapArea, selectedSubject]);

  const subjectRankings = useMemo(() => buildSubjectSummaries(filteredScoreRows, mapMetric).slice(0, 8), [filteredScoreRows, mapMetric]);

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
        return {
          monitorCategory: first.monitorCategory,
          monitorTheme: first.monitorTheme,
          averageScore,
          riskLevel: riskByScore(averageScore),
          highRiskSubjects: uniqueCount(rows.filter((row) => row.riskLevel === '高风险' || row.riskLevel === '较高风险').map((row) => row.subjectName)),
          lowScoreIndicators: uniqueCount(lowIndicators),
          abnormalCount: rows.reduce((sum, row) => sum + row.abnormalCount, 0),
          interceptCount: rows.reduce((sum, row) => sum + row.interceptCount, 0),
          closedLoopRate: rows.reduce((sum, row) => sum + row.closedLoopRate, 0) / rows.length,
        };
      })
      .sort((a, b) => a.averageScore - b.averageScore);
  }, [activeTheme, filteredScoreRows, monitorCategory]);

  const visibleEvidences = useMemo(() => {
    return indicatorEvidences
      .filter((item) => !activeTheme || item.monitorTheme === activeTheme)
      .filter((item) => !selectedIndicator || item.indicatorName === selectedIndicator)
      .sort((a, b) => a.score - b.score);
  }, [activeTheme, selectedIndicator]);

  const visibleAbnormalDetails = useMemo(() => {
    const regionScope = selectedMapArea || activeRegion;
    const sourceRows = selectedMapArea && activeRegion && !abnormalDetails.some((item) => item.regionName === selectedMapArea)
      ? buildCountyAbnormalDetails(activeRegion, selectedMapArea)
      : abnormalDetails;

    return sourceRows.filter((item) => (!regionScope || item.regionName === regionScope) && (!activeTheme || item.monitorTheme === activeTheme));
  }, [activeRegion, activeTheme, selectedMapArea]);

  const metrics = useMemo(() => {
    const rows = filteredScoreRows;
    if (!rows.length) {
      return [
        { title: '综合得分', value: '--', unit: '分', emphasis: 'score', description: '当前筛选范围内，主体 × 监控主题评分加权后的综合得分。', aiConclusion: '当前筛选口径暂无评分结果。' },
        { title: '高风险主体数', value: '--', unit: '个', emphasis: 'risk', description: '当前范围内高风险、较高风险主体数量。', aiConclusion: '当前筛选口径暂无主体风险结果。' },
        { title: '低分监控主题数', value: '--', unit: '个', emphasis: 'risk', description: '当前范围内低于阈值的业务监控/专题监控主题数量。', aiConclusion: '当前筛选口径暂无主题评分结果。' },
        { title: '触发规则数', value: '--', unit: '条', emphasis: 'evidence', description: '当前周期内至少触发过一次的规则数量。', aiConclusion: '当前筛选口径暂无规则触发记录。' },
        { title: '异常数据数', value: '--', unit: '条', emphasis: 'evidence', description: '规则触发后命中的异常业务数据总数。', aiConclusion: '当前筛选口径暂无异常数据证据。' },
        { title: '处置闭环率', value: '--', unit: '%', emphasis: 'closure', description: '异常数据、处理单或扣分事项完成闭环的比例。', aiConclusion: '当前筛选口径暂无闭环处置结果。' },
      ];
    }
    const score = rows.reduce((sum, row) => sum + row.themeScore * row.themeWeight, 0) / rows.reduce((sum, row) => sum + row.themeWeight, 0);
    const highRiskSubjects = uniqueCount(rows.filter((row) => row.riskLevel === '高风险' || row.riskLevel === '较高风险').map((row) => row.subjectName));
    const lowScoreThemes = uniqueCount(rows.filter((row) => row.themeScore < 70).map((row) => row.monitorTheme));
    const triggeredRules = Math.round(rows.reduce((sum, row) => sum + row.abnormalCount, 0) / 15);
    const abnormalCount = rows.reduce((sum, row) => sum + row.abnormalCount, 0);
    const closedLoopRate = rows.reduce((sum, row) => sum + row.closedLoopRate, 0) / rows.length;

    return [
      { title: '综合得分', value: formatScore(score), unit: '分', emphasis: 'score', description: '当前筛选范围内，主体 × 监控主题评分加权后的综合得分。', aiConclusion: '综合得分处于中风险边缘，需重点解释低分主题和扣分指标。' },
      { title: '高风险主体数', value: highRiskSubjects, unit: '个', emphasis: 'risk', description: '当前范围内高风险、较高风险主体数量。', aiConclusion: '高风险主体主要集中在市州财政和省直预算单位。' },
      { title: '低分监控主题数', value: lowScoreThemes, unit: '个', emphasis: 'risk', description: '当前范围内低于阈值的业务监控/专题监控主题数量。', aiConclusion: '低分主题集中在三保、地方政府债务和高标准农田。' },
      { title: '触发规则数', value: triggeredRules, unit: '条', emphasis: 'evidence', description: '当前周期内至少触发过一次的规则数量。', aiConclusion: '触发规则主要集中在预算执行监控和债务风险监控领域。' },
      { title: '异常数据数', value: abnormalCount.toLocaleString('zh-CN'), unit: '条', emphasis: 'evidence', description: '规则触发后命中的异常业务数据总数。', aiConclusion: '异常数据用于解释扣分，预算执行和债务类规则命中较多。' },
      { title: '处置闭环率', value: formatScore(closedLoopRate), unit: '%', emphasis: 'closure', description: '异常数据、处理单或扣分事项完成闭环的比例。', aiConclusion: '处置闭环率有所改善，但少数高风险主题仍存在反馈积压。' },
    ];
  }, [filteredScoreRows]);

  const currentAreaText = selectedMapArea && activeRegion && selectedMapArea !== activeRegion ? `${activeRegion} / ${selectedMapArea}` : activeRegion || '全省';
  const currentPositionText = `当前位置：${currentAreaText}｜统计维度：${timeRange}${activeTheme ? `｜监控项：${activeTheme}` : ''}｜数据更新时间：${DATA_UPDATED_AT}`;
  const mapLayerText = activeMapRegion ? '区县分布' : '市州分布';
  const mapSelectedText = currentAreaText === '全省' ? '湖南省全辖' : currentAreaText;
  const adminRegionOptions = useMemo(() => {
    return selectedMapArea && !adminRegions.includes(selectedMapArea) ? [...adminRegions, selectedMapArea] : adminRegions;
  }, [selectedMapArea]);
  const metricDrawerData = useMemo(() => {
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
    const topRules = ruleIntercepts.slice(0, 5).map((item) => ({
      name: item.ruleName,
      meta: item.monitorTheme,
      value: `${item.interceptCount}条`,
      reason: `命中 ${item.hitCount} 条，执行结果：${item.executionResult}。`,
      data: item,
    }));

    const getRiskLevelText = (score: number) => {
      if (score < 60) return '高风险';
      if (score < 70) return '较高风险';
      if (score < 80) return '中风险';
      if (score < 90) return '较低风险';
      return '低风险';
    };

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
    const triggeredRulesCount = Math.round(rows.reduce((sum, row) => sum + row.abnormalCount, 0) / 15);
    const abnormalTotalCount = rows.reduce((sum, row) => sum + row.abnormalCount, 0);
    const closedLoopRateTotal = rows.length > 0 ? rows.reduce((sum, row) => sum + row.closedLoopRate, 0) / rows.length : 0;
    const interceptTotal = rows.reduce((sum, row) => sum + row.interceptCount, 0);
    const notClosedCount = Math.round(abnormalTotalCount * (1 - closedLoopRateTotal / 100));
    const overdueCount = Math.round(notClosedCount * 0.3);

    return {
      综合得分: {
        drawerTitle: '综合得分',
        summary: '综合得分由主体 × 监控主题评分加权汇总形成，规则触发和异常数据用于解释扣分原因，不直接决定得分。',
        sections: [
          {
            title: '得分概览',
            stats: [
              { label: '当前范围', value: currentPositionText },
              { label: '统计周期', value: timeRange },
              { label: '综合得分', value: `${formatScore(overallScore)}分` },
              { label: '风险等级', value: getRiskLevelText(overallScore) },
              { label: '较上期变化', value: '-1.2分' },
              { label: '覆盖主体数', value: `${subjectCount}个` },
              { label: '覆盖监控主题数', value: `${themeCount}个` },
            ],
          },
          {
            title: '得分构成',
            stats: [
              { label: '专题监控', value: '5个' },
              { label: '业务监控', value: '2个' },
              { label: '低分指标', value: '28个' },
              { label: '影响主体', value: '52个' },
            ],
          },
        ],
        listTitle: '主要扣分来源',
        entries: topEvidence,
      },
      高风险主体数: {
        drawerTitle: '高风险主体',
        summary: '高风险主体按主体综合得分和低分主题结果识别，关注主体综合得分、低分主题和处置闭环率，不直接由异常数量判定。',
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
        listTitle: '高风险主体列表',
        entries: topSubjects,
      },
      低分监控主题数: {
        drawerTitle: '低分监控主题',
        summary: '低分监控主题指主题得分低于阈值的业务监控或专题监控，重点关注主题平均得分、高风险主体数和低分指标数。',
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
        listTitle: '低分主题排行',
        entries: topThemes,
      },
      触发规则数: {
        drawerTitle: '触发规则分析',
        summary: '触发规则数指当前周期内至少触发过一次的规则数量，反映监控体系的活跃度和风险识别能力。',
        sections: [
          {
            title: '规则类型统计',
            stats: [
              { label: '阻断控制类', value: '12条' },
              { label: '预警提示类', value: '18条' },
              { label: '核查处理类', value: '9条' },
              { label: '统计分析类', value: '7条' },
            ],
          },
        ],
        listTitle: '高频规则 TOP',
        entries: topRules,
      },
      异常数据数: {
        drawerTitle: '异常数据分析',
        summary: '异常数据是规则触发后命中的异常业务数据，作为评分扣分的证据来源，重点查看命中规则、关联指标和处置状态。',
        sections: [
          {
            title: '异常数据概览',
            stats: [
              { label: '异常数据总数', value: `${abnormalTotalCount.toLocaleString('zh-CN')}条` },
              { label: '涉及主体数', value: `${subjectCount}个` },
              { label: '涉及监控主题数', value: `${themeCount}个` },
              { label: '涉及规则数', value: `${triggeredRulesCount}条` },
              { label: '涉及金额', value: '1.2亿元' },
              { label: '未处置异常数', value: `${notClosedCount}条` },
            ],
          },
        ],
        listTitle: '异常数据 TOP',
        entries: topEvidence,
      },
      处置闭环率: {
        drawerTitle: '处置闭环分析',
        summary: '处置闭环率用于判断异常数据、处理单或扣分事项是否完成整改、反馈、审核或销号，体现风险处置的及时性和有效性。',
        sections: [
          {
            title: '闭环概览',
            stats: [
              { label: '处置闭环率', value: `${formatScore(closedLoopRateTotal)}%` },
              { label: '已闭环数', value: `${Math.round(abnormalTotalCount * closedLoopRateTotal / 100)}条` },
              { label: '未闭环数', value: `${notClosedCount}条` },
              { label: '超期未闭环数', value: `${overdueCount}条` },
              { label: '平均处置时长', value: '2.8天' },
              { label: '较上期变化', value: '+3.2%' },
            ],
          },
        ],
        listTitle: '未闭环分布',
        entries: topThemes.map((item, i) => ({
          ...item,
          name: item.name,
          meta: `未闭环 ${Math.round(15 * (i + 1) * 0.3)}条，超期 ${Math.round(8 * (i + 1) * 0.3)}条`,
        })),
      },
    };
  }, [filteredScoreRows, subjectRankings, visibleEvidences, visibleThemes, currentPositionText, timeRange]);
  const activeMetricDrawer = activeMetric ? metricDrawerData[activeMetric as keyof typeof metricDrawerData] : null;

  const handleCategoryChange = (category: MonitorCategory) => {
    setMonitorCategory(category);
    setMonitorTheme('全部');
    setSelectedTheme(null);
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

  const handleReset = () => {
    setTimeRange('本月');
    setCustomStart('2026-05-01');
    setCustomEnd('2026-05-14');
    setAdminRegion('湖南省全辖');
    setSelectedRegion(null);
    setSelectedMapArea(null);
    setMonitorCategory('全部');
    setMonitorTheme('全部');
    setSelectedTheme(null);
    setSelectedSubject(null);
    setSelectedIndicator(null);
    setMapMetric('综合风险');
    setMapResetToken((token) => token + 1);
    setDetailTab('主体主题评分明细');
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

  const handleSubjectSelect = (subjectName: string) => {
    setSelectedSubject(subjectName);
    setDetailTab('主体主题评分明细');
  };

  const handleIndicatorSelect = (indicatorName: string) => {
    setSelectedIndicator(indicatorName);
    setDetailTab('指标扣分证据');
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
            <h1>全辖日常监督分析</h1>
            <p>以评分结果识别风险高低，以规则触发和异常数据解释扣分成因。</p>
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
              <span>监控分类</span>
              <select value={monitorCategory} onChange={(event) => handleCategoryChange(event.target.value as MonitorCategory)}>
                <option value="全部">全部</option>
                <option value="业务监控">业务监控</option>
                <option value="专题监控">专题监控</option>
              </select>
            </label>
            <label className="filter-field theme-field">
              <span>监控项</span>
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
            <div className="filter-actions">
              <button className="reset-button icon-only" onClick={handleReset} title="重置" aria-label="重置">
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </section>

        <section className="score-metric-grid">
          {metrics.map((metric) => (
            <button key={metric.title} className={`score-card ${metric.emphasis}`} title={`${metric.title}，点击查看详情`} onClick={() => {
              setActiveMetric(metric.title);
              if (metric.title === '高风险主体数') setDetailTab('主体主题评分明细');
              if (metric.title === '低分监控主题数') {
                setMonitorTheme('全部');
                setSelectedTheme(null);
              }
              if (metric.title === '异常数据数') setDetailTab('异常数据明细');
              if (metric.title === '触发规则数') setDetailTab('规则拦截流水');
            }}>
              <span className="score-title" title={metric.description}>{metric.title}</span>
              <span className="score-value-row">
                <strong>{metric.value}</strong>
                <em>{metric.unit}</em>
              </span>
            </button>
          ))}
        </section>

        <section className="analysis-grid">
          {/* 左侧：主题风险排行 */}
          <section className="panel theme-panel">
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
                      <span className={`risk-pill ${riskToneClass[theme.riskLevel]}`}>{theme.riskLevel}</span>
                    </div>
                    <div className="theme-rank-stats">
                      <span className="stat-score">{formatScore(theme.averageScore)}分</span>
                      <span className="stat-divider">｜</span>
                      <span>高风险主体 <b>{theme.highRiskSubjects}</b></span>
                      <span className="stat-divider">｜</span>
                      <span>异常 <b>{theme.abnormalCount}</b></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 中间：全辖综合风险分布地图 */}
          <div className="middle-column">
            <section className="panel map-panel">
              <div className="panel-header">
                <div>
                  <h2>全辖综合风险分布</h2>
                  <span className="panel-note">当前区划：{mapSelectedText}｜当前层级：{mapLayerText}</span>
                </div>
                <div className="map-switch">
                  {mapMetrics.map((item) => (
                    <button key={item} className={mapMetric === item ? 'active' : ''} onClick={() => setMapMetric(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="map-content">
                <div className="map-toolbar">
                  {activeRegion && (
                    <button type="button" onClick={handleBackToProvince}>
                      返回全省
                    </button>
                  )}
                  <button type="button" className={activeRegion === '省本级' ? 'active' : ''} onClick={handleProvinceLevelSelect}>
                    省本级
                  </button>
                  <button type="button" onClick={handleMapViewReset}>
                    重置视图
                  </button>
                </div>
                <HunanRiskMap
                  regions={regionScores}
                  viewRegion={activeMapRegion}
                  selectedArea={selectedMapArea || null}
                  metric={mapMetric}
                  resetToken={mapResetToken}
                  onCitySelect={handleMapCitySelect}
                  onCountySelect={handleMapCountySelect}
                />
                <div className="map-risk-legend" aria-label="风险图例">
                  <span><i className="legend-high" />高风险</span>
                  <span><i className="legend-mid" />中风险</span>
                  <span><i className="legend-low" />低风险</span>
                  <span><i className="legend-empty" />暂无</span>
                </div>
                <div className="map-subject-ranking">
                  <h3>主体风险排行</h3>
                  <div className="ranking-list">
                    {subjectRankings.slice(0, 6).map((subject, index) => (
                      <button 
                        key={subject.subjectName} 
                        className={`ranking-item ${selectedSubject === subject.subjectName ? 'active' : ''}`} 
                        onClick={() => handleSubjectSelect(subject.subjectName)}
                      >
                        <span className="rank-badge">{index + 1}</span>
                        <span className="subject-name">{subject.subjectName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* 右侧：规则触发分析 */}
          <section className="panel rule-analysis-panel">
            <div className="panel-header">
              <h2>规则触发分析</h2>
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
                    onClick={() => setSelectedRuleType(selectedRuleType === item.ruleType ? null : item.ruleType)}
                  >
                    <div className="rule-type-title">
                      <strong>{item.ruleType}</strong>
                      <span className="stat-badge">{item.ruleCount} 规则</span>
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
                    onClick={() => setSelectedRuleCode(selectedRuleCode === item.ruleCode ? null : item.ruleCode)}
                  >
                    <div className="rule-title">
                      <strong>{item.ruleName}</strong>
                      <span className="rule-tag">{item.monitorTheme}</span>
                    </div>
                    <div className="rule-meta">
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
                    }}
                  >
                    <div className="subject-trigger-title">
                      <strong>{item.subjectName}</strong>
                      <span className="region-tag">{item.regionName}</span>
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
                      <span>综合得分 <b>{formatScore(item.comprehensiveScore)}</b></span>
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
            {detailTab === '主体主题评分明细' && (
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
                    <th>异常数据数</th>
                    <th>阻断拦截数</th>
                    <th>处置闭环率</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScoreRows.map((row) => (
                    <tr key={`${row.subjectName}-${row.monitorTheme}`}>
                      <td>{row.subjectName}</td>
                      <td>{row.regionName}</td>
                      <td>{row.subjectType}</td>
                      <td>{row.monitorCategory}</td>
                      <td>{row.monitorTheme}</td>
                      <td>{formatScore(row.themeScore)}</td>
                      <td><span className={`risk-pill ${riskToneClass[row.riskLevel]}`}>{row.riskLevel}</span></td>
                      <td>{row.lowScoreIndicators.join('、')}</td>
                      <td>{row.abnormalCount}</td>
                      <td>{row.interceptCount}</td>
                      <td>{formatPercent(row.closedLoopRate)}</td>
                      <td><button>查看评分</button><button>查看证据</button><button>查看异常</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {detailTab === '指标扣分证据' && (
              <table>
                <thead>
                  <tr>
                    <th>主体名称</th>
                    <th>监控主题</th>
                    <th>一级指标</th>
                    <th>二级指标</th>
                    <th>指标得分</th>
                    <th>扣分影响</th>
                    <th>扣分原因</th>
                    <th>关联规则</th>
                    <th>异常数据数</th>
                    <th>是否计入评分</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEvidences.map((item, index) => (
                    <tr key={item.indicatorName}>
                      <td>{filteredScoreRows[index % Math.max(filteredScoreRows.length, 1)]?.subjectName || '长沙市财政局'}</td>
                      <td>{item.monitorTheme}</td>
                      <td>日常监督评分</td>
                      <td>{item.indicatorName}</td>
                      <td>{formatScore(item.score)}</td>
                      <td>影响 {item.affectedSubjects} 个主体</td>
                      <td>{item.mainDeductionReason}</td>
                      <td>{item.relatedRules} 条</td>
                      <td>{item.abnormalCount}</td>
                      <td>是</td>
                      <td><button>查看证据</button></td>
                    </tr>
                  ))}
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

            {detailTab === '规则拦截流水' && (
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
                  {ruleIntercepts
                    .filter((item) => !activeTheme || item.monitorTheme === activeTheme)
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
              <p className="drawer-summary">{activeMetricDrawer.summary}</p>
              
              {/* 渲染多个统计区块 */}
              {activeMetricDrawer.sections?.map((section, idx) => (
                <section key={idx} className="drawer-section">
                  <div className="drawer-section-title">{section.title}</div>
                  <div className="drawer-distribution">
                    {section.stats.map((stat) => (
                    <div key={stat.label} className="drawer-stat">
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              
              {/* 渲染列表 */}
              {activeMetricDrawer.entries && activeMetricDrawer.entries.length > 0 && (
                <section className="drawer-section">
                  <div className="drawer-section-title">{activeMetricDrawer.listTitle}</div>
                  <div className="drawer-entry-list">
                    {activeMetricDrawer.entries.map((item) => (
                      <button 
                        key={`${item.name}-${item.value}`} 
                        onClick={() => {
                          // 点击列表项后的联动逻辑
                          if (activeMetric === '高风险主体数' && item.data) {
                            setAdminRegion(item.data.regionName);
                            setSelectedSubject(item.data.subjectName);
                            setDetailTab('主体主题评分明细');
                          }
                          if (activeMetric === '低分监控主题数' && item.data) {
                            setMonitorCategory(item.data.monitorCategory);
                            setMonitorTheme(item.data.monitorTheme);
                            setSelectedTheme(item.data.monitorTheme);
                          }
                          if (activeMetric === '触发规则数') {
                            setDetailTab('规则拦截流水');
                          }
                          if (activeMetric === '异常数据数') {
                            setDetailTab('异常数据明细');
                          }
                          if (activeMetric === '处置闭环率') {
                            setDetailTab('指标扣分证据');
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
      </main>
    </div>
  );
}
