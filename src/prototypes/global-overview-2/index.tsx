/**
 * @name 全局总览2
 */
import './style.css';
import '../../themes/ufsp-sky/globals.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Brain,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import TopBar from '../../common/components/TopBar';

type RiskLevel = '高' | '中' | '低';
type DataStatus = '已接入' | '部分接入' | '模拟数据' | '二期预留';
type AnalysisMode = '当前态势' | '趋势变化';
type StatisticDimension = 'day' | 'month' | 'quarter' | 'year';
type MetricTrendTone = 'risk' | 'good' | 'neutral';

type MetricPeriodChange = {
  label: string;
  tone: MetricTrendTone;
};

type MetricItem = {
  label: string;
  value: string;
  unit: string;
  status: string;
  insight: string;
  tooltip: string;
  tone: 'blue' | 'cyan' | 'amber' | 'rose' | 'violet' | 'emerald';
  focus: string;
  target: 'subject' | 'theme' | 'monitor';
  detail: MetricDetail;
  trend?: MetricPeriodChange;
};

type MetricDetail = {
  summary: string;
  rows: MetricDetailRow[];
  actions: MetricAction[];
};

type MetricDistributionGroup = {
  title: string;
  items: MetricDistributionItem[];
};

type MetricDistributionItem = {
  label: string;
  value: string;
  percent: number;
};

type MetricDetailRow = {
  name: string;
  meta: string;
  reason: string;
  count?: string;
  subjectType?: string;
  risk?: RiskLevel;
  score?: number;
  riskItems?: number;
  overdueItems?: number;
  themes?: string;
  target?: 'subject' | 'theme' | 'monitor';
};

type MetricAction = {
  label: string;
  path: string;
  params: Record<string, string>;
};

type SubjectRisk = {
  name: string;
  level: string;
  type: string;
  risk: RiskLevel;
  lowestThemeScore: number;
  unclosedItems: number;
  problems: number;
  mainThemes: string[];
  systems: string[];
  reason: string;
};

type SubjectRiskDistributionItem = {
  name: string;
  riskSubjects: number;
  riskItems: number;
  mainTypes: string;
  mainThemes: string[];
  unclosedItems: number;
  risk: RiskLevel;
};

type ThemeRisk = {
  name: string;
  system: string;
  risk: RiskLevel;
  problems: number;
  impactedSubjects: number;
  lowSubjects: number;
  pendingItems: number;
  overdueItems: number;
  supervisionItems: number;
  mainSubjects: string[];
  status: DataStatus;
};

const riskSubjectRows: MetricDetailRow[] = [
  { name: 'A区财政', meta: '区县财政｜高风险｜68分', subjectType: '区县财政', risk: '高', score: 68, riskItems: 146, overdueItems: 18, themes: '地方政府债务、基层三保', reason: '地方政府债务、基层三保问题集中，超期事项较多。', target: 'subject' },
  { name: 'B区财政', meta: '区县财政｜高风险｜71分', subjectType: '区县财政', risk: '高', score: 71, riskItems: 128, overdueItems: 16, themes: '农田资金、预算执行', reason: '高标准农田建设资金整改进度偏慢，待闭环事项偏多。', target: 'subject' },
  { name: 'C部门', meta: '预算部门｜高风险｜69分', subjectType: '预算部门', risk: '高', score: 69, riskItems: 93, overdueItems: 12, themes: '资产处置、预算执行', reason: '资产处置和预算执行低分叠加，规则命中频次较高。', target: 'subject' },
  { name: 'D区财政', meta: '区县财政｜中风险｜75分', subjectType: '区县财政', risk: '中', score: 75, riskItems: 84, overdueItems: 8, themes: '规则运行、整改闭环', reason: '规则命中较多，部分问题闭环周期偏长。', target: 'subject' },
  { name: 'E预算单位', meta: '预算单位｜中风险｜77分', subjectType: '预算单位', risk: '中', score: 77, riskItems: 61, overdueItems: 6, themes: '内控考评、采购合规', reason: '内控考评低分指标偏多，整改反馈质量一般。', target: 'subject' },
  { name: 'F处室', meta: '业务处室｜中风险｜74分', subjectType: '业务处室', risk: '中', score: 74, riskItems: 48, overdueItems: 5, themes: '预算执行、资料佐证', reason: '预算执行偏离度较高，部分事项需补充佐证。', target: 'subject' },
  { name: 'G县财政', meta: '区县财政｜中风险｜72分', subjectType: '区县财政', risk: '中', score: 72, riskItems: 43, overdueItems: 4, themes: '基层三保、债务风险', reason: '三保保障和债务风险提示同时出现。', target: 'subject' },
  { name: 'H部门', meta: '预算部门｜中风险｜73分', subjectType: '预算部门', risk: '中', score: 73, riskItems: 39, overdueItems: 4, themes: '专项资金、跨期事项', reason: '专项资金支付进度滞后，跨期事项未闭环。', target: 'subject' },
  { name: 'I单位', meta: '预算单位｜中风险｜76分', subjectType: '预算单位', risk: '中', score: 76, riskItems: 35, overdueItems: 3, themes: '政府采购、资产管理', reason: '政府采购和资产管理疑点较多。', target: 'subject' },
  { name: 'J经开区财政', meta: '区县财政｜中风险｜74分', subjectType: '区县财政', risk: '中', score: 74, riskItems: 31, overdueItems: 3, themes: '债务监测、偿付压力', reason: '债务监测指标波动，需持续关注偿付压力。', target: 'subject' },
  { name: 'K学校', meta: '预算单位｜中风险｜78分', subjectType: '预算单位', risk: '中', score: 78, riskItems: 27, overdueItems: 2, themes: '项目支出、合同附件', reason: '项目支出归集不完整，合同附件缺失较多。', target: 'subject' },
  { name: 'L医院', meta: '预算单位｜中风险｜76分', subjectType: '预算单位', risk: '中', score: 76, riskItems: 25, overdueItems: 2, themes: '资产采购、绩效目标', reason: '资产采购和绩效目标关联度偏弱。', target: 'subject' },
  { name: 'M处室', meta: '业务处室｜中风险｜75分', subjectType: '业务处室', risk: '中', score: 75, riskItems: 22, overdueItems: 2, themes: '审核退回、反馈周期', reason: '审核退回率偏高，反馈周期偏长。', target: 'subject' },
  { name: 'N镇财政所', meta: '基层单位｜中风险｜73分', subjectType: '基层单位', risk: '中', score: 73, riskItems: 21, overdueItems: 2, themes: '基层三保、待核实', reason: '基层三保相关待核实事项集中。', target: 'subject' },
  { name: 'O国资中心', meta: '责任单位｜中风险｜77分', subjectType: '责任单位', risk: '中', score: 77, riskItems: 19, overdueItems: 1, themes: '国有资产处置', reason: '国有资产处置流程资料不完整。', target: 'subject' },
  { name: 'P水利局', meta: '预算部门｜中风险｜78分', subjectType: '预算部门', risk: '中', score: 78, riskItems: 18, overdueItems: 1, themes: '专项资金、项目验收', reason: '专项资金拨付和项目验收节点不一致。', target: 'subject' },
  { name: 'Q农业农村局', meta: '预算部门｜中风险｜76分', subjectType: '预算部门', risk: '中', score: 76, riskItems: 16, overdueItems: 1, themes: '农田资金、资料补齐', reason: '农田建设资金佐证材料待补齐。', target: 'subject' },
  { name: 'R交通局', meta: '预算部门｜中风险｜79分', subjectType: '预算部门', risk: '中', score: 79, riskItems: 14, overdueItems: 1, themes: '项目绩效、资金支付', reason: '项目绩效和资金支付进度存在偏差。', target: 'subject' },
];

const riskThemeRows: MetricDetailRow[] = [
  { name: '地方政府债务', meta: '专项监督｜高风险', count: '236条', reason: '低分主体、超期整改和债务规则命中叠加。' },
  { name: '高标准农田建设资金使用', meta: '专项监督｜高风险', count: '198条', reason: '资金拨付、验收佐证和整改闭环问题集中。' },
  { name: '基层三保', meta: '日常监督｜高风险', count: '176条', reason: '保障压力提示、待核实事项和低分主体较多。' },
  { name: '预算执行监控', meta: '日常监督｜中风险', count: '142条', reason: '支付进度偏离、跨期执行和预算调剂疑点较多。' },
  { name: '行政事业单位国有资产处置', meta: '专项监督｜中风险', count: '121条', reason: '处置流程资料缺失，评估和审批链条需补齐。' },
  { name: '政府采购合规', meta: '日常监督｜中风险', count: '89条', reason: '采购流程、合同附件和验收信息存在待核查事项。' },
  { name: '绩效目标运行', meta: '财会考评｜中风险', count: '66条', reason: '绩效指标完成度偏低，部分项目缺少过程佐证。' },
];

const riskItemRows: MetricDetailRow[] = [
  { name: '地方政府债务疑点', meta: '专项监督｜债务主题', count: '236条', reason: '偿付压力、债务余额波动和规则命中集中。' },
  { name: '农田资金使用问题', meta: '专项监督｜农田主题', count: '198条', reason: '拨付进度、验收资料和项目现场佐证不一致。' },
  { name: '基层三保风险提示', meta: '日常监督｜三保主题', count: '176条', reason: '低分主体集中，待反馈事项较多。' },
  { name: '预算执行偏离事项', meta: '日常监督｜预算执行', count: '142条', reason: '支付进度和预算安排偏差较大。' },
  { name: '资产处置疑点', meta: '专项监督｜资产主题', count: '121条', reason: '评估、审批和处置资料缺口较多。' },
  { name: '整改反馈待核事项', meta: '整改闭环｜待核查', count: '156条', reason: '反馈材料不足，需人工复核。' },
  { name: '规则覆盖不足事项', meta: '规则运行｜待补齐', count: '137条', reason: '部分审计关注点尚未配置完整监控规则。' },
  { name: '低分评价关联事项', meta: '评价结果｜低于阈值', count: '120条', reason: '评价低分与问题整改状态存在叠加。' },
];

const pendingRows: MetricDetailRow[] = [
  { name: 'A区财政债务整改', meta: '区县财政｜地方政府债务', count: '64条', reason: '整改材料未完整提交，需补充偿付计划说明。' },
  { name: 'B区农田资金整改', meta: '区县财政｜农田资金', count: '58条', reason: '验收佐证缺失，部分事项仍待反馈。' },
  { name: '基层三保待核实', meta: '日常监督｜基层三保', count: '51条', reason: '多个责任单位未完成核实反馈。' },
  { name: '预算执行待办结', meta: '预算部门｜执行监控', count: '43条', reason: '跨期事项未说明原因，需继续跟踪。' },
  { name: '资产处置待补正', meta: '专项监督｜资产处置', count: '39条', reason: '审批附件和评估资料未补齐。' },
  { name: '采购合规待反馈', meta: '预算单位｜政府采购', count: '34条', reason: '合同、验收和付款节点未形成闭环。' },
  { name: '规则补充待完成', meta: '规则运行｜覆盖不足', count: '28条', reason: '审计对标规则仍在补充配置中。' },
  { name: '绩效目标待确认', meta: '财会考评｜绩效运行', count: '25条', reason: '绩效结果和资金执行解释未确认。' },
];

const overdueRows: MetricDetailRow[] = [
  { name: 'A区财政债务整改超期', meta: '区县财政｜地方政府债务', count: '18条', reason: '整改期限已过，仍缺关键佐证材料。' },
  { name: 'B区农田项目反馈超期', meta: '区县财政｜农田资金', count: '16条', reason: '项目验收资料长期未反馈。' },
  { name: 'C部门资产处置超期', meta: '预算部门｜资产处置', count: '12条', reason: '审批链条未闭合，处置说明未提交。' },
  { name: 'D区预算执行说明超期', meta: '区县财政｜预算执行', count: '10条', reason: '跨期执行解释未按期提交。' },
  { name: 'E预算单位采购整改超期', meta: '预算单位｜政府采购', count: '8条', reason: '合同附件补正超过办理期限。' },
  { name: 'F处室审核反馈超期', meta: '业务处室｜审核流程', count: '5条', reason: '退回后未重新提交。' },
  { name: 'G县三保核实超期', meta: '区县财政｜基层三保', count: '4条', reason: '核实结果未完成确认。' },
  { name: 'H部门绩效确认超期', meta: '预算部门｜绩效运行', count: '3条', reason: '绩效目标调整说明未反馈。' },
];

const supervisionRows: MetricDetailRow[] = [
  { name: '严重超期整改事项', meta: '整改闭环｜严重超期', count: '11项', reason: '超期天数较长且责任主体集中，建议督办。' },
  { name: '多次退回事项', meta: '审核流程｜反复退回', count: '9项', reason: '反馈质量不稳定，需管理岗介入。' },
  { name: '长期未闭环事项', meta: '整改闭环｜长期挂起', count: '8项', reason: '多轮提醒后仍未完成闭环。' },
  { name: '高风险主体集中事项', meta: '主体风险｜集中暴露', count: '8项', reason: '集中在 A区财政、B区财政等主体。' },
  { name: '重大主题关联事项', meta: '主题风险｜重点主题', count: '7项', reason: '关联债务、农田资金和基层三保。' },
  { name: '跨部门协同事项', meta: '协同办理｜多责任方', count: '6项', reason: '责任边界不清，推进效率偏低。' },
  { name: '规则补充滞后事项', meta: '规则运行｜待补齐', count: '5项', reason: '规则缺口影响持续监控。' },
  { name: '审计关注延伸事项', meta: '审计对标｜重点关注', count: '4项', reason: '审计关注点与整改问题存在重叠。' },
];

const lowScoreRows: MetricDetailRow[] = [
  { name: 'A区财政', meta: '主体｜68分', count: '1个', reason: '债务和三保主题低分叠加。' },
  { name: 'C部门', meta: '主体｜69分', count: '1个', reason: '资产处置和预算执行评价偏低。' },
  { name: '地方政府债务', meta: '主题｜70分', count: '1个', reason: '低分主体和超期事项较多。', target: 'theme' },
  { name: '高标准农田建设资金使用', meta: '主题｜72分', count: '1个', reason: '资金使用和验收闭环评价偏低。', target: 'theme' },
  { name: '基层三保', meta: '主题｜73分', count: '1个', reason: '保障压力提示较多。', target: 'theme' },
  { name: 'G县财政等 6 个主体', meta: '主体组｜70分以下', count: '6个', reason: '整改闭环率偏低，规则命中较多。' },
  { name: '预算单位低分组', meta: '对象组｜70分以下', count: '8个', reason: '采购、资产和绩效佐证不足。' },
  { name: '专项主题低分组', meta: '主题组｜70分以下', count: '5个', reason: '覆盖不足和待闭环事项叠加。', target: 'theme' },
];

const coverageRows: MetricDetailRow[] = [
  { name: '审计关注覆盖不足', meta: '审计对标｜二期口径', count: '4项', reason: '部分审计关注点尚未映射到监控规则。' },
  { name: '规则覆盖不足', meta: '规则运行｜待配置', count: '3项', reason: '重点主题规则颗粒度不足。' },
  { name: '数据覆盖不足', meta: '数据口径｜待接入', count: '3项', reason: '部分业务数据暂未接入。' },
  { name: '线下问题覆盖不足', meta: '问题归集｜待补齐', count: '2项', reason: '线下问题尚未完整归集。' },
  { name: '责任主体覆盖不足', meta: '主体范围｜待维护', count: '2项', reason: '部分责任单位映射关系不完整。' },
  { name: '整改状态覆盖不足', meta: '闭环状态｜待同步', count: '2项', reason: '整改状态与审核状态同步不完整。' },
];

const metricDistributionGroups: Record<string, MetricDistributionGroup[]> = {
  'risk-subject': [
    {
      title: '按主体类型',
      items: [
        { label: '区县财政', value: '8个', percent: 44 },
        { label: '预算部门', value: '5个', percent: 28 },
        { label: '预算单位', value: '3个', percent: 17 },
        { label: '处室/责任单位', value: '2个', percent: 11 },
      ],
    },
    {
      title: '按监督体系',
      items: [
        { label: '专项监督', value: '9个', percent: 50 },
        { label: '日常监督', value: '6个', percent: 33 },
        { label: '财会考评', value: '3个', percent: 17 },
      ],
    },
    {
      title: '按风险主题',
      items: [
        { label: '地方政府债务', value: '6个', percent: 33 },
        { label: '基层三保', value: '5个', percent: 28 },
        { label: '农田资金', value: '4个', percent: 22 },
        { label: '预算执行', value: '3个', percent: 17 },
      ],
    },
  ],
  'risk-theme': [
    {
      title: '按监督体系',
      items: [
        { label: '专项监督', value: '3个', percent: 43 },
        { label: '日常监督', value: '3个', percent: 43 },
        { label: '财会考评', value: '1个', percent: 14 },
      ],
    },
    {
      title: '按影响主体数',
      items: [
        { label: '8个以上', value: '2个', percent: 29 },
        { label: '5-7个', value: '3个', percent: 43 },
        { label: '5个以下', value: '2个', percent: 28 },
      ],
    },
    {
      title: '按事项状态',
      items: [
        { label: '待闭环', value: '342条', percent: 37 },
        { label: '待核查', value: '286条', percent: 31 },
        { label: '已超期', value: '76条', percent: 8 },
        { label: '覆盖不足', value: '16项', percent: 2 },
      ],
    },
  ],
  'risk-item': [
    {
      title: '按事项类型',
      items: [
        { label: '问题整改', value: '486条', percent: 38 },
        { label: '疑点核查', value: '356条', percent: 28 },
        { label: '低分关联', value: '238条', percent: 18 },
        { label: '覆盖不足', value: '206条', percent: 16 },
      ],
    },
    {
      title: '按监督体系',
      items: [
        { label: '专项监督', value: '562条', percent: 44 },
        { label: '日常监督', value: '492条', percent: 38 },
        { label: '财会考评', value: '232条', percent: 18 },
      ],
    },
    {
      title: '按主体',
      items: [
        { label: '区县财政', value: '602条', percent: 47 },
        { label: '预算部门', value: '396条', percent: 31 },
        { label: '预算单位', value: '288条', percent: 22 },
      ],
    },
    {
      title: '按主题',
      items: [
        { label: '债务', value: '236条', percent: 18 },
        { label: '农田资金', value: '198条', percent: 15 },
        { label: '基层三保', value: '176条', percent: 14 },
        { label: '预算执行', value: '142条', percent: 11 },
      ],
    },
  ],
  'pending-closed-loop': [
    {
      title: '按闭环环节',
      items: [
        { label: '待整改', value: '128条', percent: 37 },
        { label: '待核实', value: '92条', percent: 27 },
        { label: '待反馈', value: '76条', percent: 22 },
        { label: '待办结', value: '46条', percent: 14 },
      ],
    },
    {
      title: '按监督体系',
      items: [
        { label: '专项监督', value: '168条', percent: 49 },
        { label: '日常监督', value: '126条', percent: 37 },
        { label: '财会考评', value: '48条', percent: 14 },
      ],
    },
    {
      title: '按主题',
      items: [
        { label: '地方政府债务', value: '64条', percent: 19 },
        { label: '农田资金', value: '58条', percent: 17 },
        { label: '基层三保', value: '51条', percent: 15 },
        { label: '预算执行', value: '43条', percent: 13 },
      ],
    },
    {
      title: '按主体',
      items: [
        { label: '区县财政', value: '156条', percent: 46 },
        { label: '预算部门', value: '94条', percent: 27 },
        { label: '预算单位', value: '64条', percent: 19 },
        { label: '业务处室', value: '28条', percent: 8 },
      ],
    },
  ],
  'overdue-item': [
    {
      title: '按超期天数',
      items: [
        { label: '30天以上', value: '18条', percent: 24 },
        { label: '15-30天', value: '26条', percent: 34 },
        { label: '7-15天', value: '22条', percent: 29 },
        { label: '7天内', value: '10条', percent: 13 },
      ],
    },
    {
      title: '按办理环节',
      items: [
        { label: '整改反馈', value: '28条', percent: 37 },
        { label: '审核确认', value: '19条', percent: 25 },
        { label: '材料补正', value: '17条', percent: 22 },
        { label: '督办回复', value: '12条', percent: 16 },
      ],
    },
    {
      title: '按主体',
      items: [
        { label: 'A区财政', value: '18条', percent: 24 },
        { label: 'B区财政', value: '16条', percent: 21 },
        { label: 'C部门', value: '12条', percent: 16 },
        { label: '其他主体', value: '30条', percent: 39 },
      ],
    },
    {
      title: '按主题',
      items: [
        { label: '地方政府债务', value: '24条', percent: 32 },
        { label: '农田资金', value: '18条', percent: 24 },
        { label: '资产处置', value: '14条', percent: 18 },
        { label: '预算执行', value: '12条', percent: 16 },
      ],
    },
  ],
  'supervision-needed': [
    {
      title: '按督办原因',
      items: [
        { label: '严重超期', value: '18项', percent: 31 },
        { label: '多次退回', value: '14项', percent: 24 },
        { label: '长期未闭环', value: '13项', percent: 22 },
        { label: '高风险集中', value: '13项', percent: 23 },
      ],
    },
    {
      title: '按责任主体',
      items: [
        { label: '区县财政', value: '25项', percent: 43 },
        { label: '预算部门', value: '18项', percent: 31 },
        { label: '预算单位', value: '9项', percent: 16 },
        { label: '业务处室', value: '6项', percent: 10 },
      ],
    },
    {
      title: '按主题',
      items: [
        { label: '债务', value: '16项', percent: 28 },
        { label: '农田资金', value: '13项', percent: 22 },
        { label: '基层三保', value: '11项', percent: 19 },
        { label: '预算执行', value: '9项', percent: 16 },
      ],
    },
    {
      title: '按体系',
      items: [
        { label: '专项监督', value: '31项', percent: 53 },
        { label: '日常监督', value: '19项', percent: 33 },
        { label: '财会考评', value: '8项', percent: 14 },
      ],
    },
  ],
  'low-score': [
    {
      title: '按对象类型',
      items: [
        { label: '风险主体', value: '15个', percent: 62 },
        { label: '风险主题', value: '7个', percent: 30 },
        { label: '对象组', value: '2个', percent: 8 },
      ],
    },
    {
      title: '按分数区间',
      items: [
        { label: '70分以下', value: '9个', percent: 38 },
        { label: '70-75分', value: '10个', percent: 42 },
        { label: '75-80分', value: '5个', percent: 20 },
      ],
    },
    {
      title: '按主题',
      items: [
        { label: '债务', value: '6个', percent: 25 },
        { label: '农田资金', value: '5个', percent: 21 },
        { label: '基层三保', value: '5个', percent: 21 },
        { label: '预算执行', value: '4个', percent: 17 },
      ],
    },
    {
      title: '按体系',
      items: [
        { label: '财会考评', value: '10个', percent: 42 },
        { label: '专项监督', value: '8个', percent: 33 },
        { label: '日常监督', value: '6个', percent: 25 },
      ],
    },
  ],
  'coverage-gap': [
    {
      title: '按覆盖类型',
      items: [
        { label: '审计关注', value: '4项', percent: 25 },
        { label: '规则覆盖', value: '3项', percent: 19 },
        { label: '数据覆盖', value: '3项', percent: 19 },
        { label: '线下问题', value: '2项', percent: 12 },
      ],
    },
    {
      title: '按主题',
      items: [
        { label: '资产处置', value: '4项', percent: 25 },
        { label: '预算执行', value: '3项', percent: 19 },
        { label: '绩效运行', value: '3项', percent: 19 },
        { label: '政府采购', value: '2项', percent: 12 },
      ],
    },
    {
      title: '按体系',
      items: [
        { label: '专项监督', value: '7项', percent: 44 },
        { label: '日常监督', value: '6项', percent: 37 },
        { label: '财会考评', value: '3项', percent: 19 },
      ],
    },
    {
      title: '按影响范围',
      items: [
        { label: '全省统一口径', value: '5项', percent: 31 },
        { label: '区县范围', value: '6项', percent: 38 },
        { label: '部门范围', value: '3项', percent: 19 },
        { label: '单位范围', value: '2项', percent: 12 },
      ],
    },
  ],
};

const metricItems: MetricItem[] = [
  {
    label: '风险主体',
    value: '18',
    unit: '个',
    status: '需关注',
    insight: '风险集中在区县财政和重点预算部门',
    tooltip: '当前统计范围内，被标记为需要重点关注的主体数量。主体可包括区县财政、预算部门、预算单位、处室、责任单位等。',
    tone: 'rose',
    focus: 'risk-subject',
    target: 'subject',
    detail: {
      summary: '当前需关注主体主要集中在区县财政和重点预算部门，建议先按类型、体系和主题判断风险聚集方向。',
      rows: riskSubjectRows,
      actions: [
        { label: '查看全部', path: '/prototypes/theme-analysis', params: { filter: 'high-risk-subject', view: 'all' } },
        { label: '进入主题分析', path: '/prototypes/theme-analysis', params: { filter: 'high-risk-subject' } },
      ],
    },
  },
  {
    label: '风险主题',
    value: '7',
    unit: '个',
    status: '重点关注',
    insight: '债务、三保、农田资金为当前重点',
    tooltip: '当前统计范围内，被标记为需要重点关注的监督主题数量。主题风险来自该主题下低分主体、问题数量、超期事项、待闭环事项、覆盖不足等综合结果。',
    tone: 'amber',
    focus: 'risk-theme',
    target: 'theme',
    detail: {
      summary: '重点主题由事项规模、影响主体数和未闭环状态共同抬升，先看主题分布再进入主题分析下钻。',
      rows: riskThemeRows,
      actions: [
        { label: '查看全部', path: '/prototypes/theme-analysis', params: { filter: 'high-risk-theme', view: 'all' } },
        { label: '进入主题分析', path: '/prototypes/theme-analysis', params: { filter: 'high-risk-theme' } },
      ],
    },
  },
  {
    label: '风险事项',
    value: '1,286',
    unit: '条',
    status: '需核查',
    insight: '问题与疑点事项占比较高',
    tooltip: '当前统计范围内需要关注的风险、问题、疑点、低分、超期、覆盖不足等事项总量。',
    tone: 'blue',
    focus: 'risk-item',
    target: 'monitor',
    detail: {
      summary: '风险事项以问题整改和疑点核查为主，当前先按事项类型、体系、主体和主题识别集中区域。',
      rows: riskItemRows,
      actions: [
        { label: '查看全部', path: '/prototypes/global-overview-2', params: { focus: 'risk-item', view: 'all' } },
        { label: '进入监控整改分析', path: '/prototypes/global-overview-2', params: { focus: 'risk-item', view: 'monitor-rectification' } },
      ],
    },
  },
  {
    label: '待闭环事项',
    value: '342',
    unit: '条',
    status: '待闭环',
    insight: '专项整改和核实环节积压较多',
    tooltip: '当前尚未完成处理闭环的事项，包括未整改、未核实、未反馈、未办结、规则补充未完成等。',
    tone: 'violet',
    focus: 'pending-closed-loop',
    target: 'monitor',
    detail: {
      summary: '待闭环事项主要卡在整改、核实和反馈环节，需要先定位环节积压和主体集中情况。',
      rows: pendingRows,
      actions: [
        { label: '查看全部', path: '/prototypes/global-overview-2', params: { focus: 'pending-closed-loop', view: 'all' } },
        { label: '进入监控整改分析', path: '/prototypes/global-overview-2', params: { focus: 'pending-closed-loop', view: 'monitor-rectification' } },
      ],
    },
  },
  {
    label: '超期事项',
    value: '76',
    unit: '条',
    status: '超期',
    insight: '超期集中在少数主体和重点主题',
    tooltip: '当前超过办理、整改、审核、反馈或督办期限的事项数量。',
    tone: 'rose',
    focus: 'overdue-item',
    target: 'monitor',
    detail: {
      summary: '超期事项集中在整改反馈和审核确认环节，少数主体贡献了主要超期量。',
      rows: overdueRows,
      actions: [
        { label: '查看全部', path: '/prototypes/global-overview-2', params: { focus: 'overdue-item', view: 'all' } },
        { label: '进入监控整改分析', path: '/prototypes/global-overview-2', params: { focus: 'overdue-item', view: 'monitor-rectification' } },
      ],
    },
  },
  {
    label: '需督办事项',
    value: '58',
    unit: '项',
    status: '建议督办',
    insight: '建议优先督办长期未闭环事项',
    tooltip: '当前达到督办条件、建议管理岗重点跟进的事项数量，包括严重超期、多次退回、长期未闭环、高风险主体集中事项等。',
    tone: 'cyan',
    focus: 'supervision-needed',
    target: 'monitor',
    detail: {
      summary: '需督办事项以严重超期、多次退回和长期未闭环为主，适合先按督办原因确定推进优先级。',
      rows: supervisionRows,
      actions: [
        { label: '查看全部', path: '/prototypes/global-overview-2', params: { focus: 'supervision-needed', view: 'all' } },
        { label: '进入监控整改分析', path: '/prototypes/global-overview-2', params: { focus: 'supervision-needed', view: 'monitor-rectification' } },
      ],
    },
  },
  {
    label: '低分对象',
    value: '24',
    unit: '个',
    status: '低于阈值',
    insight: '低分对象需结合问题结果复核',
    tooltip: '当前评价或考评结果低于阈值的主体或主题数量，默认可按低于 70 分模拟展示。',
    tone: 'amber',
    focus: 'low-score',
    target: 'subject',
    detail: {
      summary: '低分对象包含主体和主题两类，当前先按对象类型、分数区间和主题来源判断复核重点。',
      rows: lowScoreRows,
      actions: [
        { label: '查看全部', path: '/prototypes/theme-analysis', params: { filter: 'low-score', view: 'all' } },
        { label: '进入主题分析', path: '/prototypes/theme-analysis', params: { filter: 'low-score' } },
      ],
    },
  },
  {
    label: '覆盖不足',
    value: '16',
    unit: '项',
    status: '待补齐',
    insight: '规则、数据和审计关注点仍需补齐',
    tooltip: '当前监督覆盖、规则覆盖、数据覆盖或审计关注覆盖不足的事项数量。',
    tone: 'emerald',
    focus: 'coverage-gap',
    target: 'monitor',
    detail: {
      summary: '覆盖不足主要来自审计关注、规则和数据覆盖缺口，先看影响范围再决定补齐路径。',
      rows: coverageRows,
      actions: [
        { label: '查看全部', path: '/prototypes/global-overview-2', params: { focus: 'coverage-gap', view: 'all' } },
        { label: '进入监控整改分析', path: '/prototypes/global-overview-2', params: { focus: 'coverage-gap', view: 'monitor-rectification' } },
      ],
    },
  },
];

const subjectRisks: SubjectRisk[] = [
  { name: 'A区财政', level: 'A市', type: '区县财政', risk: '高', lowestThemeScore: 68, unclosedItems: 58, problems: 146, mainThemes: ['地方债务', '基层三保'], systems: ['专项监督', '日常监督', '财会考评'], reason: '地方债务、基层三保主题问题集中' },
  { name: 'B区财政', level: 'B市', type: '区县财政', risk: '高', lowestThemeScore: 71, unclosedItems: 42, problems: 128, mainThemes: ['高标准农田', '地方债务'], systems: ['专项监督', '财会考评'], reason: '高标准农田资金整改进度偏慢' },
  { name: 'C部门', level: '本级', type: '预算部门', risk: '高', lowestThemeScore: 69, unclosedItems: 31, problems: 93, mainThemes: ['预算执行', '资产处置'], systems: ['日常监督', '专项监督', '财会考评'], reason: '预算执行和资产处置低分叠加' },
  { name: 'D区财政', level: 'C市', type: '区县财政', risk: '中', lowestThemeScore: 75, unclosedItems: 25, problems: 84, mainThemes: ['规则运行'], systems: ['日常监督'], reason: '规则命中较多，闭环情况一般' },
  { name: 'E预算单位', level: '本级', type: '预算单位', risk: '中', lowestThemeScore: 77, unclosedItems: 18, problems: 61, mainThemes: ['内控考评'], systems: ['财会考评'], reason: '内控考评低分指标偏多' },
];

const subjectRiskDistributionByScope: Record<string, SubjectRiskDistributionItem[]> = {
  全省: [
    { name: 'A市', riskSubjects: 6, riskItems: 146, mainTypes: '区县财政、预算单位', mainThemes: ['地方债务', '基层三保'], unclosedItems: 58, risk: '高' },
    { name: 'B市', riskSubjects: 4, riskItems: 128, mainTypes: '区县财政、责任单位', mainThemes: ['高标准农田', '地方债务'], unclosedItems: 42, risk: '高' },
    { name: '本级', riskSubjects: 3, riskItems: 93, mainTypes: '预算部门、处室', mainThemes: ['预算执行', '资产处置'], unclosedItems: 31, risk: '中' },
    { name: 'C市', riskSubjects: 2, riskItems: 84, mainTypes: '区县财政、预算单位', mainThemes: ['规则运行', '整改闭环'], unclosedItems: 25, risk: '中' },
    { name: '其他区划', riskSubjects: 3, riskItems: 67, mainTypes: '预算单位、责任单位', mainThemes: ['政府采购', '资料补齐'], unclosedItems: 19, risk: '低' },
  ],
  全市: [
    { name: '本级', riskSubjects: 3, riskItems: 93, mainTypes: '预算部门、处室', mainThemes: ['预算执行', '资产处置'], unclosedItems: 31, risk: '高' },
    { name: 'A区', riskSubjects: 3, riskItems: 76, mainTypes: '区县财政、预算单位', mainThemes: ['地方债务', '基层三保'], unclosedItems: 24, risk: '中' },
    { name: 'B区', riskSubjects: 2, riskItems: 58, mainTypes: '区县财政、责任单位', mainThemes: ['高标准农田', '预算执行'], unclosedItems: 18, risk: '中' },
    { name: '其他区县', riskSubjects: 2, riskItems: 39, mainTypes: '预算单位、基层单位', mainThemes: ['规则运行', '资料补齐'], unclosedItems: 11, risk: '低' },
  ],
  本级: [
    { name: '本级部门', riskSubjects: 3, riskItems: 93, mainTypes: '预算部门、处室', mainThemes: ['预算执行', '资产处置'], unclosedItems: 31, risk: '高' },
    { name: '预算单位', riskSubjects: 3, riskItems: 61, mainTypes: '预算单位', mainThemes: ['内控考评', '政府采购'], unclosedItems: 18, risk: '中' },
    { name: '责任单位', riskSubjects: 2, riskItems: 42, mainTypes: '责任单位', mainThemes: ['国有资产', '规则补齐'], unclosedItems: 14, risk: '低' },
  ],
  下辖区县: [
    { name: 'A区', riskSubjects: 3, riskItems: 76, mainTypes: '区县财政、预算单位', mainThemes: ['地方债务', '基层三保'], unclosedItems: 24, risk: '高' },
    { name: 'B区', riskSubjects: 2, riskItems: 58, mainTypes: '区县财政、责任单位', mainThemes: ['高标准农田', '地方债务'], unclosedItems: 18, risk: '中' },
    { name: 'C区', riskSubjects: 2, riskItems: 44, mainTypes: '区县财政', mainThemes: ['预算执行', '规则运行'], unclosedItems: 13, risk: '低' },
  ],
  下辖部门: [
    { name: '财政局', riskSubjects: 3, riskItems: 93, mainTypes: '预算部门、处室', mainThemes: ['预算执行', '资产处置'], unclosedItems: 31, risk: '高' },
    { name: '农业农村局', riskSubjects: 2, riskItems: 58, mainTypes: '预算部门、责任单位', mainThemes: ['高标准农田', '资料补齐'], unclosedItems: 18, risk: '中' },
    { name: '国资中心', riskSubjects: 1, riskItems: 19, mainTypes: '责任单位', mainThemes: ['国有资产处置'], unclosedItems: 6, risk: '低' },
  ],
};

const statisticDimensionRiskFactor: Record<StatisticDimension, number> = {
  day: 0.18,
  month: 1,
  quarter: 1.45,
  year: 2.2,
};

const supervisionSystemRiskFactor: Record<string, number> = {
  全部体系: 1,
  日常监督: 0.64,
  专项监督: 0.72,
  财会考评: 0.46,
};

const themeRisks: ThemeRisk[] = [
  { name: '地方政府债务', system: '专项监督', risk: '高', problems: 236, impactedSubjects: 12, lowSubjects: 8, pendingItems: 64, overdueItems: 18, supervisionItems: 11, mainSubjects: ['A区财政', 'B区财政'], status: '已接入' },
  { name: '高标准农田建设资金使用', system: '专项监督', risk: '高', problems: 198, impactedSubjects: 8, lowSubjects: 5, pendingItems: 58, overdueItems: 16, supervisionItems: 9, mainSubjects: ['B区财政', 'Q农业农村局'], status: '部分接入' },
  { name: '基层三保', system: '日常监督', risk: '高', problems: 176, impactedSubjects: 10, lowSubjects: 5, pendingItems: 51, overdueItems: 4, supervisionItems: 7, mainSubjects: ['A区财政', 'G县财政'], status: '已接入' },
  { name: '预算执行监控', system: '日常监督', risk: '中', problems: 142, impactedSubjects: 9, lowSubjects: 4, pendingItems: 43, overdueItems: 10, supervisionItems: 6, mainSubjects: ['C部门', 'D区财政'], status: '已接入' },
  { name: '行政事业单位国有资产处置', system: '专项监督', risk: '中', problems: 121, impactedSubjects: 7, lowSubjects: 3, pendingItems: 39, overdueItems: 12, supervisionItems: 5, mainSubjects: ['C部门', 'O国资中心'], status: '模拟数据' },
];

const riskCompositionItems = [
  { label: '问题整改事项', value: '486', unit: '条', percent: 38, focus: 'rectification' },
  { label: '监控疑点事项', value: '356', unit: '条', percent: 28, focus: 'clue-transfer' },
  { label: '评价低分事项', value: '238', unit: '条', percent: 18, focus: 'low-score' },
  { label: '超期事项', value: '76', unit: '条', percent: 6, focus: 'overdue-item' },
  { label: '需督办事项', value: '58', unit: '项', percent: 5, focus: 'supervision-needed' },
  { label: '覆盖不足事项', value: '16', unit: '项', percent: 1, focus: 'coverage-gap' },
];

const closureStatusItems = [
  { label: '已闭环', value: '812', unit: '条', tone: 'good', focus: 'closed' },
  { label: '待闭环', value: '342', unit: '条', tone: 'warn', focus: 'pending-closed-loop' },
  { label: '超期', value: '76', unit: '条', tone: 'risk', focus: 'overdue-item' },
  { label: '需督办', value: '58', unit: '项', tone: 'risk', focus: 'supervision-needed' },
];

const closureStageItems = [
  { label: '待整改', value: '128', percent: 37 },
  { label: '待核实', value: '92', percent: 27 },
  { label: '待反馈', value: '76', percent: 22 },
  { label: '审核确认', value: '46', percent: 14 },
  { label: '规则补充', value: '16', percent: 5 },
];

const insightTags = [
  { label: 'A区财政', type: 'subject' as const },
  { label: '地方政府债务', type: 'theme' as const },
  { label: '高标准农田建设资金使用', type: 'theme' as const },
  { label: '超期整改', type: 'monitor' as const },
];

const riskToneClass: Record<RiskLevel, string> = {
  高: 'risk-high',
  中: 'risk-mid',
  低: 'risk-low',
};

const dataStatusClass: Record<DataStatus, string> = {
  已接入: 'status-ready',
  部分接入: 'status-partial',
  模拟数据: 'status-mock',
  二期预留: 'status-future',
};

const statisticDimensionConfigs: Record<StatisticDimension, {
  currentOption: string;
  trendOption: string;
  currentContext: string;
  trendContext: string;
  compareLabel: string;
}> = {
  day: {
    currentOption: '本日',
    trendOption: '本日较昨日',
    currentContext: '本日累计',
    trendContext: '本日 vs 昨日',
    compareLabel: '较昨日',
  },
  month: {
    currentOption: '本月',
    trendOption: '本月较上月',
    currentContext: '本月累计',
    trendContext: '本月 vs 上月',
    compareLabel: '较上月',
  },
  quarter: {
    currentOption: '本季度',
    trendOption: '本季较上季',
    currentContext: '本季度累计',
    trendContext: '本季 vs 上季',
    compareLabel: '较上季',
  },
  year: {
    currentOption: '本年度',
    trendOption: '本年较上年',
    currentContext: '本年度累计',
    trendContext: '本年 vs 上年',
    compareLabel: '较上年',
  },
};

const statisticDimensionOrder: StatisticDimension[] = ['day', 'month', 'quarter', 'year'];

const metricPeriodValues: Record<string, Record<StatisticDimension, string>> = {
  'risk-subject': { day: '6', month: '18', quarter: '34', year: '57' },
  'risk-theme': { day: '3', month: '7', quarter: '11', year: '18' },
  'risk-item': { day: '186', month: '1,286', quarter: '3,842', year: '8,936' },
  'pending-closed-loop': { day: '48', month: '342', quarter: '918', year: '2,104' },
  'overdue-item': { day: '12', month: '76', quarter: '214', year: '486' },
  'supervision-needed': { day: '9', month: '58', quarter: '162', year: '358' },
  'low-score': { day: '8', month: '24', quarter: '42', year: '69' },
  'coverage-gap': { day: '5', month: '16', quarter: '37', year: '92' },
};

const metricPeriodChanges: Record<string, Record<StatisticDimension, { delta: string; tone: MetricTrendTone }>> = {
  'risk-subject': {
    day: { delta: '+2个', tone: 'risk' },
    month: { delta: '+4个', tone: 'risk' },
    quarter: { delta: '+9个', tone: 'risk' },
    year: { delta: '+13个', tone: 'risk' },
  },
  'risk-theme': {
    day: { delta: '+1个', tone: 'risk' },
    month: { delta: '+2个', tone: 'risk' },
    quarter: { delta: '+3个', tone: 'risk' },
    year: { delta: '+5个', tone: 'risk' },
  },
  'risk-item': {
    day: { delta: '+26.4%', tone: 'risk' },
    month: { delta: '+8.4%', tone: 'risk' },
    quarter: { delta: '+12.6%', tone: 'risk' },
    year: { delta: '+18.2%', tone: 'risk' },
  },
  'pending-closed-loop': {
    day: { delta: '+9条', tone: 'risk' },
    month: { delta: '+56条', tone: 'risk' },
    quarter: { delta: '+142条', tone: 'risk' },
    year: { delta: '+366条', tone: 'risk' },
  },
  'overdue-item': {
    day: { delta: '+3条', tone: 'risk' },
    month: { delta: '+18条', tone: 'risk' },
    quarter: { delta: '+42条', tone: 'risk' },
    year: { delta: '+96条', tone: 'risk' },
  },
  'supervision-needed': {
    day: { delta: '+2项', tone: 'risk' },
    month: { delta: '+11项', tone: 'risk' },
    quarter: { delta: '+34项', tone: 'risk' },
    year: { delta: '+75项', tone: 'risk' },
  },
  'low-score': {
    day: { delta: '-2个', tone: 'good' },
    month: { delta: '-3个', tone: 'good' },
    quarter: { delta: '+5个', tone: 'risk' },
    year: { delta: '+8个', tone: 'risk' },
  },
  'coverage-gap': {
    day: { delta: '-1项', tone: 'good' },
    month: { delta: '-4项', tone: 'good' },
    quarter: { delta: '-8项', tone: 'good' },
    year: { delta: '-15项', tone: 'good' },
  },
};

const statisticsCutoffText = '统计截至 2026年5月14日 15:00';
const metricDrawerAnimationMs = 260;

function buildUrl(path: string, params?: Record<string, string>) {
  if (!params) return path;
  const query = new URLSearchParams(params).toString();
  return query ? `${path}?${query}` : path;
}

function scaleMockNumber(value: number, factor: number) {
  return Math.max(1, Math.round(value * factor));
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <span className={`risk-badge ${riskToneClass[risk]}`}>{risk}风险</span>;
}

function StatusBadge({ status }: { status: DataStatus }) {
  return <span className={`status-badge ${dataStatusClass[status]}`}>{status}</span>;
}

const GlobalOverview: React.FC = () => {
  const [statisticDimension, setStatisticDimension] = useState<StatisticDimension>('month');
  const [scope, setScope] = useState('全省');
  const [system, setSystem] = useState('全部体系');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('当前态势');
  const [activeMetric, setActiveMetric] = useState<MetricItem | null>(null);
  const [isMetricDrawerClosing, setIsMetricDrawerClosing] = useState(false);
  const metricDrawerCloseTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (metricDrawerCloseTimer.current) {
        window.clearTimeout(metricDrawerCloseTimer.current);
      }
    };
  }, []);

  const handleNavigate = (href: string) => {
    try {
      window.location.href = href;
    } catch {
    }
  };

  const statisticDimensionConfig = statisticDimensionConfigs[statisticDimension];

  const contextText = useMemo(
    () => {
      const periodContext = analysisMode === '当前态势'
        ? statisticDimensionConfig.currentContext
        : statisticDimensionConfig.trendContext;
      return `${scope}｜${periodContext}｜${system}｜${analysisMode}`;
    },
    [analysisMode, scope, statisticDimensionConfig, system],
  );

  const drawerContextText = analysisMode === '当前态势'
    ? `${contextText}｜${statisticsCutoffText}`
    : contextText;

  const visibleMetricItems = useMemo<MetricItem[]>(() => (
    metricItems.map((item) => {
      const value = metricPeriodValues[item.focus]?.[statisticDimension] ?? item.value;

      if (analysisMode !== '趋势变化') {
        return { ...item, value, trend: undefined };
      }

      const change = metricPeriodChanges[item.focus]?.[statisticDimension];
      const trend = change
        ? {
          label: `${statisticDimensionConfig.compareLabel} ${change.delta}`,
          tone: change.tone,
        }
        : undefined;

      return {
        ...item,
        value,
        trend,
        insight: trend ? `${item.insight}，${trend.label}` : item.insight,
        detail: {
          ...item.detail,
          summary: trend ? `${trend.label}，${item.detail.summary}` : item.detail.summary,
        },
      };
    })
  ), [analysisMode, statisticDimension, statisticDimensionConfig.compareLabel]);

  const subjectRiskFactor = (statisticDimensionRiskFactor[statisticDimension] ?? 1) * (supervisionSystemRiskFactor[system] ?? 1);

  const subjectRiskDistribution = useMemo(() => (
    (subjectRiskDistributionByScope[scope] ?? subjectRiskDistributionByScope.全省).map((item) => ({
      ...item,
      riskSubjects: scaleMockNumber(item.riskSubjects, subjectRiskFactor),
      riskItems: scaleMockNumber(item.riskItems, subjectRiskFactor),
      unclosedItems: scaleMockNumber(item.unclosedItems, subjectRiskFactor),
    }))
  ), [scope, subjectRiskFactor]);

  const subjectAreaMaxRiskItems = Math.max(
    ...subjectRiskDistribution.map((item) => item.riskItems),
    1,
  );

  const visibleSubjectRisks = useMemo(() => {
    const scopedSubjects = subjectRisks.filter((subject) => {
      const systemMatched = system === '全部体系' || subject.systems.includes(system);
      if (!systemMatched) return false;
      if (scope === '本级') return subject.level === '本级';
      if (scope === '下辖区县') return subject.type === '区县财政';
      if (scope === '下辖部门') return subject.type !== '区县财政';
      return true;
    });

    return scopedSubjects
      .filter((subject) => subject.risk === '高')
      .map((subject) => ({
        ...subject,
        problems: scaleMockNumber(subject.problems, subjectRiskFactor),
        unclosedItems: scaleMockNumber(subject.unclosedItems, subjectRiskFactor),
      }));
  }, [scope, system, subjectRiskFactor]);

  const navigateSubject = (subject: string) => {
    handleNavigate(buildUrl('/prototypes/theme-analysis', { subject, from: 'global-overview-2' }));
  };

  const navigateTheme = (themeName: string) => {
    handleNavigate(buildUrl('/prototypes/theme-analysis', { theme: themeName, from: 'global-overview-2' }));
  };

  const navigateMonitor = (focus: string) => {
    handleNavigate(buildUrl('/prototypes/global-overview-2', { focus, from: 'global-overview-2' }));
  };

  const handleSubjectDistributionClick = (item: SubjectRiskDistributionItem) => {
    handleNavigate(buildUrl('/prototypes/theme-analysis', {
      range: item.name,
      view: 'risk-subjects',
      scope,
      system,
      dimension: statisticDimension,
      from: 'global-overview-2',
    }));
  };

  const handleMetricAction = (action: MetricAction) => {
    handleNavigate(buildUrl(action.path, { ...action.params, from: 'global-overview-2' }));
  };

  const openMetricDrawer = (metric: MetricItem) => {
    if (metricDrawerCloseTimer.current) {
      window.clearTimeout(metricDrawerCloseTimer.current);
      metricDrawerCloseTimer.current = null;
    }
    setIsMetricDrawerClosing(false);
    setActiveMetric(metric);
  };

  const closeMetricDrawer = () => {
    if (!activeMetric || isMetricDrawerClosing) return;
    setIsMetricDrawerClosing(true);
    metricDrawerCloseTimer.current = window.setTimeout(() => {
      setActiveMetric(null);
      setIsMetricDrawerClosing(false);
      metricDrawerCloseTimer.current = null;
    }, metricDrawerAnimationMs);
  };

  return (
    <div className="global-overview-page">
      <TopBar title="财会监督系统" onNavigate={handleNavigate} />

      <main>
        <section className="overview-hero">
          <div className="hero-content">
            <div className="hero-left">
              <div className="hero-title">
                <h1>全局总览2</h1>
                <p>汇总评价、监控、问题整改和规则运行结果，识别风险主体、风险主题和需督办事项。</p>
              </div>
            </div>
            <div className="hero-context">
              <span>当前口径</span>
              <strong>{contextText}</strong>
              {analysisMode === '当前态势' && <span className="hero-cutoff">{statisticsCutoffText}</span>}
            </div>
          </div>
        </section>

        <section className="filter-panel">
          <div className="filter-row">
            <div className="filter-left">
              <div className="filter-group">
                <span className="filter-group-label">{analysisMode === '当前态势' ? '统计维度' : '统计范围'}</span>
                <div className="filter-group-content">
                  <div className="filter-select filter-select-statistic">
                    <select value={statisticDimension} onChange={(e) => setStatisticDimension(e.target.value as StatisticDimension)}>
                      {statisticDimensionOrder.map((dimension) => (
                        <option key={dimension} value={dimension}>
                          {analysisMode === '当前态势'
                            ? statisticDimensionConfigs[dimension].currentOption
                            : statisticDimensionConfigs[dimension].trendOption}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="filter-divider" />
              <div className="filter-group">
                <span className="filter-group-label">管辖范围</span>
                <div className="filter-select filter-select-scope">
                  <select value={scope} onChange={(e) => setScope(e.target.value)}>
                    <option>全省</option>
                    <option>全市</option>
                    <option>本级</option>
                    <option>下辖区县</option>
                    <option>下辖部门</option>
                  </select>
                </div>
              </div>
              <div className="filter-divider" />
              <div className="filter-group">
                <span className="filter-group-label">监督体系</span>
                <div className="filter-select filter-select-system">
                  <select value={system} onChange={(e) => setSystem(e.target.value)}>
                    <option>全部体系</option>
                    <option>日常监督</option>
                    <option>专项监督</option>
                    <option>财会考评</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="analysis-toggle">
              {(['当前态势', '趋势变化'] as AnalysisMode[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  className={`analysis-option ${analysisMode === view ? 'analysis-option-active' : ''}`}
                  onClick={() => setAnalysisMode(view)}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="metric-section">
          <div className="metric-grid">
            {visibleMetricItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`metric-card metric-${item.tone} ${item.trend ? 'metric-card-trend' : ''}`}
                onClick={() => openMetricDrawer(item)}
                aria-label={`查看${item.label}分析说明`}
              >
                <div className="metric-header">
                  <span className="metric-title-wrap" data-tooltip={item.tooltip}>
                    <span className="metric-label" title={item.tooltip}>{item.label}</span>
                  </span>
                  <span className="metric-ai-wrap" data-tooltip={item.insight}>
                    <span className="metric-ai-tag">AI结论</span>
                  </span>
                </div>
                <div className="metric-value-row">
                  <span className="metric-value">{item.value}</span>
                  <span className="metric-unit">{item.unit}</span>
                </div>
                {item.trend && (
                  <div className={`metric-trend-row metric-trend-${item.trend.tone}`}>
                    {item.trend.label}
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="content-grid">
          <div className="soft-panel subject-risk-panel">
            <div className="section-head">
              <div>
                <div className="section-kicker">风险主体</div>
                <div className="section-title">主体风险概览</div>
                <div className="section-subtitle">当前范围内风险区划分布及高风险主体排行</div>
              </div>
              <button type="button" onClick={() => handleNavigate('/prototypes/theme-analysis')} className="ghost-link">
                进入主题视角
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="subject-risk-layout">
              <div className="subject-risk-structure">
                <div className="subject-risk-subhead">
                  <span>风险区划概览</span>
                  <small>{scope}｜{statisticDimensionConfig.currentOption}｜{system}</small>
                </div>
                <div className="subject-area-list" aria-label="风险区划概览">
                  {subjectRiskDistribution.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className={`subject-area-card ${riskToneClass[item.risk]}`}
                      onClick={() => handleSubjectDistributionClick(item)}
                      title={`查看${item.name}下的风险主体`}
                    >
                      <div className="subject-area-card-head">
                        <div>
                          <span className="subject-area-name">{item.name}</span>
                          <span className="subject-area-degree">{item.risk}风险</span>
                        </div>
                        <strong className="subject-area-risk-items">{item.riskItems}<small>风险事项</small></strong>
                      </div>
                      <div className="subject-area-meta">
                        <span>{item.riskSubjects} 个风险主体</span>
                        <span>{item.unclosedItems} 未闭环</span>
                      </div>
                      <div className="subject-area-themes">
                        主要主题：{item.mainThemes.slice(0, 2).join('、')}
                      </div>
                      <div className="subject-area-progress">
                        <i style={{ width: `${Math.max(8, Math.round((item.riskItems / subjectAreaMaxRiskItems) * 100))}%` }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="subject-risk-top">
                <div className="subject-risk-subhead">
                  <span>高风险主体 TOP</span>
                  <small>按风险事项数排序</small>
                </div>
                <div className="subject-top-list">
                  {visibleSubjectRisks.map((subject, index) => (
                    <button
                      key={subject.name}
                      type="button"
                      className="subject-top-row"
                      onClick={() => navigateSubject(subject.name)}
                      title={`锁定主体：${subject.name}`}
                    >
                      <span className="subject-top-index">{index + 1}</span>
                      <div className="subject-top-main">
                        <div className="subject-top-title">
                          <span>{subject.name}</span>
                          <RiskBadge risk={subject.risk} />
                        </div>
                        <div className="subject-top-meta">
                          <span>{subject.level}</span>
                          <span>{subject.type}</span>
                          <span>主题：{subject.mainThemes.join('、')}</span>
                        </div>
                      </div>
                      <div className="subject-top-metrics">
                        <span><strong>{subject.problems}</strong><small>风险事项</small></span>
                        <span><strong>{subject.unclosedItems}</strong><small>未闭环</small></span>
                        <span><strong>{subject.lowestThemeScore}</strong><small>最低主题分</small></span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="soft-panel theme-risk-panel">
            <div className="section-head">
              <div>
                <div className="section-kicker">主题风险概览</div>
                <div className="section-title">高风险主题与影响主体</div>
              </div>
              <button type="button" onClick={() => handleNavigate('/prototypes/theme-analysis')} className="ghost-link">
                进入主题分析
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="theme-risk-list">
              {themeRisks.slice(0, 4).map((themeRisk, index) => (
                <button
                  key={themeRisk.name}
                  type="button"
                  className="theme-risk-overview-row"
                  onClick={() => navigateTheme(themeRisk.name)}
                  title={`锁定主题：${themeRisk.name}`}
                >
                  <span className="theme-risk-index">{index + 1}</span>
                  <div className="theme-risk-main">
                    <div className="theme-risk-title">
                      <span>{themeRisk.name}</span>
                      <RiskBadge risk={themeRisk.risk} />
                    </div>
                    <div className="theme-risk-meta">
                      <span>{themeRisk.system}</span>
                      <span>涉及 {themeRisk.impactedSubjects} 主体</span>
                      <span>低分主体 {themeRisk.lowSubjects} 个</span>
                    </div>
                    <div className="theme-risk-subjects">
                      主要主体：{themeRisk.mainSubjects.join('、')}
                    </div>
                  </div>
                  <div className="theme-risk-stats">
                    <strong>{themeRisk.problems}</strong>
                    <small>风险事项</small>
                    <StatusBadge status={themeRisk.status} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bottom-grid">
          <div className="soft-panel risk-composition-panel">
            <div className="section-head">
              <div>
                <div className="section-kicker">风险事项构成</div>
                <div className="section-title">风险事项从哪里来</div>
              </div>
              <Activity className="h-5 w-5 text-[#165DFF]" />
            </div>

            <div className="composition-total">
              <div>
                <span>去重总量</span>
                <strong>1,286<small>条</small></strong>
              </div>
              <p>同一事项同时属于待闭环、超期或督办时，总量只计一次，分类可分别体现。</p>
            </div>

            <div className="composition-list">
              {riskCompositionItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="composition-row"
                  onClick={() => navigateMonitor(item.focus)}
                >
                  <span className="composition-name">{item.label}</span>
                  <span className="composition-bar"><i style={{ width: `${item.percent}%` }} /></span>
                  <strong>{item.value}<small>{item.unit}</small></strong>
                </button>
              ))}
            </div>
          </div>

          <div className="soft-panel closure-panel">
            <div className="section-head">
              <div>
                <div className="section-kicker">闭环处置概览</div>
                <div className="section-title">风险处理卡在哪</div>
              </div>
              <ShieldCheck className="h-5 w-5 text-[#165DFF]" />
            </div>

            <div className="closure-status-grid">
              {closureStatusItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`closure-status-card closure-${item.tone}`}
                  onClick={() => navigateMonitor(item.focus)}
                >
                  <span>{item.label}</span>
                  <strong>{item.value}<small>{item.unit}</small></strong>
                </button>
              ))}
            </div>

            <div className="closure-stage-list">
              {closureStageItems.map((item) => (
                <div key={item.label} className="closure-stage-row">
                  <span>{item.label}</span>
                  <i><b style={{ width: `${item.percent}%` }} /></i>
                  <strong>{item.value}条</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="soft-panel insight-panel">
            <div className="section-head">
              <div>
                <div className="section-kicker">智能研判与建议</div>
                <div className="section-title">当前最需要管什么</div>
              </div>
              <Brain className="h-5 w-5 text-[#165DFF]" />
            </div>

            <div className="insight-card">
              <div className="insight-header">
                <Sparkles className="h-4 w-4" />
                Mock 研判 · 后续接入 AI
              </div>
              <p>
                当前风险主要集中在地方政府债务、基层三保和高标准农田等主题。A区财政、B区财政风险事项和超期事项较多，建议优先纳入督办；部分主题存在规则和数据覆盖不足，需补齐监控规则和线下问题归集口径。
              </p>
              <div className="judgement-list">
                <button type="button" onClick={() => navigateSubject('A区财政')} className="judgement-item">
                  <span>重点主体</span>
                  <strong>A区财政、B区财政</strong>
                </button>
                <button type="button" onClick={() => navigateTheme('地方政府债务')} className="judgement-item">
                  <span>重点主题</span>
                  <strong>地方债务、基层三保、高标准农田</strong>
                </button>
                <button type="button" onClick={() => navigateMonitor('supervision-needed')} className="judgement-item">
                  <span>优先动作</span>
                  <strong>督办长期未闭环和严重超期事项</strong>
                </button>
              </div>
              <div className="insight-tags">
                {insightTags.map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    className="insight-tag"
                    onClick={() => {
                      if (tag.type === 'subject') navigateSubject(tag.label);
                      if (tag.type === 'theme') navigateTheme(tag.label);
                      if (tag.type === 'monitor') navigateMonitor('overdue');
                    }}
                  >
                    {tag.label}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="action-tiles">
              <button type="button" className="action-tile" onClick={() => navigateMonitor('rectification-supervise')}>
                <CheckCircle2 className="h-4 w-4" />
                整改督办
              </button>
              <button type="button" className="action-tile" onClick={() => navigateMonitor('rule-optimization')}>
                <ShieldCheck className="h-4 w-4" />
                补充规则
              </button>
            </div>
          </div>
        </section>
      </main>

      {activeMetric && (
        <div
          className={`metric-detail-layer ${isMetricDrawerClosing ? 'metric-detail-layer-closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={`${activeMetric.label}分析说明`}
        >
          <button
            type="button"
            className="metric-detail-backdrop"
            aria-label="关闭说明"
            onClick={closeMetricDrawer}
          />
          <aside className={`metric-detail-drawer detail-${activeMetric.tone}`}>
            <div className="metric-detail-head">
              <div className="metric-detail-title-row">
                <h2>{activeMetric.label}</h2>
                <div className="metric-detail-context">
                  <span>当前口径</span>
                  <strong>{drawerContextText}</strong>
                </div>
              </div>
            </div>
            <p className="metric-detail-summary">{activeMetric.detail.summary}</p>

            <div className="metric-detail-section">
              <div className="metric-detail-section-head">
                <span>分布统计</span>
                <strong>{activeMetric.value}{activeMetric.unit}</strong>
              </div>
              <div className="metric-distribution-grid">
                {(metricDistributionGroups[activeMetric.focus] ?? []).map((group) => (
                  <div className="metric-distribution-card" key={group.title}>
                    <div className="metric-distribution-title">{group.title}</div>
                    <div className="metric-distribution-list">
                      {group.items.map((item) => (
                        <div className="metric-distribution-item" key={item.label}>
                          <div className="metric-distribution-line">
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                          </div>
                          <div className="metric-distribution-track" aria-hidden="true">
                            <span style={{ width: `${item.percent}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="metric-detail-section metric-detail-section-list">
              <div className="metric-detail-section-head">
                <span>重点明细概览</span>
                <strong>最多展示 10 条</strong>
              </div>
              <div className="metric-rough-list">
                {activeMetric.detail.rows.slice(0, 10).map((row, index) => (
                  <div key={`${row.name}-${index}`} className="metric-rough-row">
                    <div className="metric-rough-main">
                      <div className="metric-rough-name">{row.name}</div>
                      <div className="metric-rough-meta">{row.meta}</div>
                    </div>
                    <span className="metric-rough-count">
                      {row.count ?? (row.riskItems ? `${row.riskItems}条` : `${index + 1}`)}
                    </span>
                    <div className="metric-rough-desc">{row.reason}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="metric-detail-actions">
              <button type="button" className="metric-detail-collapse" onClick={closeMetricDrawer}>
                收起
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="metric-detail-action-group">
                {activeMetric.detail.actions.map((action, index) => (
                  <button
                    key={action.label}
                    type="button"
                    className={`metric-detail-action ${index === activeMetric.detail.actions.length - 1 ? 'metric-detail-action-primary' : 'metric-detail-action-secondary'}`}
                    onClick={() => handleMetricAction(action)}
                  >
                    {action.label}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default GlobalOverview;