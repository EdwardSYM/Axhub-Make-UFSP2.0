
export interface Level3_IndicatorDetail {
  id: string;
  name: string;
  definition: string;
  currentValue: string;
  standardValue: string;
  trend: number[];
  regionalDistribution: Array<{ name: string; value: number; status: 'good' | 'warning' | 'bad' }>;
  rules: Array<{ name: string; context: string }>;
  suggestions: string;
}

export interface Level2_Indicator {
  id: string;
  name: string;
  score: number;
  description: string;
  result: '良好' | '一般' | '偏低';
  detail: Level3_IndicatorDetail;
}

export interface Level1_Dimension {
  id: string;
  name: string;
  score: number;
  status: '良好' | '一般' | '偏低';
  description: string;
  judgementBasis: string[];
  indicators: Level2_Indicator[];
}

const buildDetail = (
  id: string,
  name: string,
  definition: string,
  currentValue: string,
  standardValue: string,
  trend: number[],
  suggestions: string,
  rules: Array<{ name: string; context: string }>
): Level3_IndicatorDetail => ({
  id,
  name,
  definition,
  currentValue,
  standardValue,
  trend,
  regionalDistribution: [
    { name: '东城区', value: Math.max(68, trend[trend.length - 1] - 6), status: trend[trend.length - 1] < 84 ? 'bad' : 'warning' },
    { name: '南城区', value: Math.max(70, trend[trend.length - 1] - 3), status: trend[trend.length - 1] < 88 ? 'warning' : 'good' },
    { name: '西城区', value: Math.min(98, trend[trend.length - 1] + 1), status: 'good' },
  ],
  rules,
  suggestions,
});

const buildIndicator = (
  id: string,
  name: string,
  score: number,
  description: string,
  result: '良好' | '一般' | '偏低',
  detail: Level3_IndicatorDetail
): Level2_Indicator => ({
  id,
  name,
  score,
  description,
  result,
  detail,
});

export const analysisData: Level1_Dimension[] = [
  {
    id: 'dim-1',
    name: '预算保障与可持续性',
    score: 92,
    status: '良好',
    description: '用于评价三保资金预算编制的合理性、完整性和可持续性，是三保工作的基础。',
    judgementBasis: ['预算编制完整性：95分', '预算调整规范性：90分', '中期财政规划衔接：88分'],
    indicators: [
      buildIndicator(
        'ind-1-1',
        '预算编制完整性',
        95,
        '反映三保预算项目覆盖是否完整、口径是否一致。',
        '良好',
        buildDetail(
          'detail-1-1',
          '预算编制完整性',
          '衡量预算编制是否覆盖核心保障事项并满足完整性要求。',
          '95%',
          '90%',
          [90, 91, 92, 93, 94, 95],
          '持续按月核对预算编制清单，确保口径一致并及时补齐漏项。',
          [{ name: '预算编制完整率低于阈值', context: '关联规则：预算编制完整性校验规则' }]
        )
      ),
      buildIndicator(
        'ind-1-2',
        '预算调整规范性',
        90,
        '反映预算调整审批流程和资料留痕是否规范。',
        '良好',
        buildDetail(
          'detail-1-2',
          '预算调整规范性',
          '衡量预算调整的审批流程、依据与追踪是否规范。',
          '90%',
          '92%',
          [84, 86, 87, 88, 89, 90],
          '建立预算调整审批台账，明确审批层级与时限，补齐依据材料。',
          [{ name: '预算调整流程缺失', context: '关联规则：预算调整流程合规检查' }]
        )
      ),
      buildIndicator(
        'ind-1-3',
        '中期财政规划衔接',
        88,
        '反映年度预算与中期财政规划的衔接一致性。',
        '一般',
        buildDetail(
          'detail-1-3',
          '中期财政规划衔接',
          '衡量年度预算与中期财政规划目标、节奏和结构是否一致。',
          '88%',
          '90%',
          [82, 84, 85, 86, 87, 88],
          '加强中期规划与年度预算联审机制，统一指标口径并提前滚动测算。',
          [{ name: '年度与中期规划偏差', context: '关联规则：规划衔接偏差预警规则' }]
        )
      ),
      buildIndicator(
        'ind-1-4',
        '三保预算保障率',
        94,
        '反映三保事项在预算中的覆盖与保障强度。',
        '良好',
        buildDetail(
          'detail-1-4',
          '三保预算保障率',
          '衡量三保相关事项在预算中是否足额安排。',
          '94%',
          '90%',
          [89, 90, 91, 92, 93, 94],
          '保持重点保障事项的预算优先级，动态校准保障率阈值。',
          [{ name: '三保预算不足', context: '关联规则：三保预算保障率阈值检查' }]
        )
      ),
      buildIndicator(
        'ind-1-5',
        '财政可持续能力',
        91,
        '反映财政收支平衡与可持续承压能力。',
        '良好',
        buildDetail(
          'detail-1-5',
          '财政可持续能力',
          '衡量财政在中长期维度下维持三保支出的稳定能力。',
          '91%',
          '90%',
          [86, 87, 88, 89, 90, 91],
          '强化中长期收支平衡分析，建立压力测试场景并动态调整预算结构。',
          [{ name: '财政可持续性压力上升', context: '关联规则：收支平衡压力预警规则' }]
        )
      ),
    ],
  },
  {
    id: 'dim-2',
    name: '执行与支付保障',
    score: 85,
    status: '一般',
    description: '用于评价工资、民生、运转资金是否按时、足额、顺畅支付，是三保底线稳定运行的核心维度。',
    judgementBasis: ['3个县区存在工资发放延迟情况', '工资及时发放率本期值：92%', '支付链路存在潜在风险点'],
    indicators: [
      buildIndicator(
        'ind-2-1',
        '工资及时发放率',
        92,
        '反映工资发放是否按节点完成。',
        '良好',
        buildDetail(
          'detail-2-1',
          '工资及时发放率',
          '衡量工资发放在规定节点内完成的比例。',
          '92%',
          '95%',
          [88, 89, 90, 91, 91, 92],
          '对延迟区域建立预警名单，提前锁定资金与审批链路。',
          [{ name: '工资发放延迟预警', context: '关联规则：工资发放时效监测规则' }]
        )
      ),
      buildIndicator(
        'ind-2-2',
        '民生资金支付到位率',
        86,
        '反映民生项目资金支付是否及时到位。',
        '一般',
        buildDetail(
          'detail-2-2',
          '民生资金支付到位率',
          '衡量民生相关资金在计划周期内支付到位的程度。',
          '86%',
          '90%',
          [80, 82, 83, 84, 85, 86],
          '梳理民生项目支付堵点，建立支付超期问题周报机制。',
          [{ name: '民生资金支付滞后', context: '关联规则：民生支付时效预警规则' }]
        )
      ),
      buildIndicator(
        'ind-2-3',
        '支付链路顺畅度',
        83,
        '反映支付流程各环节协同效率。',
        '偏低',
        buildDetail(
          'detail-2-3',
          '支付链路顺畅度',
          '衡量支付流程中审批、复核、拨付等环节的平均流转时长（天）。',
          '2.3天',
          '2.0天',
          [78, 79, 80, 81, 82, 83],
          '优化支付链路角色分工与审批规则，压缩不必要流转节点。',
          [{ name: '支付链路阻塞', context: '关联规则：支付链路异常波动规则' }]
        )
      ),
      buildIndicator(
        'ind-2-4',
        '运转经费保障率',
        84,
        '反映基层运转经费保障覆盖情况。',
        '一般',
        buildDetail(
          'detail-2-4',
          '运转经费保障率',
          '衡量基层运转经费预算安排与实际支付保障程度。',
          '84%',
          '88%',
          [79, 80, 81, 82, 83, 84],
          '优先保障高频刚性支出，按月复盘运转经费缺口。',
          [{ name: '运转经费保障不足', context: '关联规则：运转经费保障阈值规则' }]
        )
      ),
    ],
  },
  {
    id: 'dim-3',
    name: '库款与流动性风险',
    score: 80,
    status: '一般',
    description: '用于评价库款规模、结构和流动性状况，防范资金链断裂风险。',
    judgementBasis: ['2个县区资金沉淀率超过20%', '资金沉淀率整体12%，需关注', '流动性管理存在优化空间'],
    indicators: [
      buildIndicator(
        'ind-3-1',
        '库款保障倍数',
        82,
        '反映库款对刚性支出的保障能力。',
        '一般',
        buildDetail(
          'detail-3-1',
          '库款保障倍数',
          '衡量库款可覆盖重点支出的周期能力。',
          '1.8倍',
          '2.0倍',
          [76, 77, 78, 79, 81, 82],
          '建立库款滚动测算模型，提前识别保障倍数下滑风险。',
          [{ name: '库款保障不足', context: '关联规则：库款保障倍数阈值预警' }]
        )
      ),
      buildIndicator(
        'ind-3-2',
        '资金沉淀率',
        78,
        '反映财政资金沉淀与周转效率。',
        '偏低',
        buildDetail(
          'detail-3-2',
          '资金沉淀率',
          '衡量财政资金在账户中沉淀未有效使用的比例。',
          '78%',
          '85%',
          [72, 73, 75, 76, 77, 78],
          '建立沉淀资金清理清单，明确责任单位与处置时限。',
          [{ name: '沉淀资金超阈值', context: '关联规则：资金沉淀率风险预警规则' }]
        )
      ),
      buildIndicator(
        'ind-3-3',
        '短期流动性覆盖率',
        81,
        '反映短期资金调度能力。',
        '一般',
        buildDetail(
          'detail-3-3',
          '短期流动性覆盖率',
          '衡量短期资金对到期支付责任的覆盖程度。',
          '81%',
          '86%',
          [76, 77, 78, 79, 80, 81],
          '优化跨月资金调度机制，提前准备高峰期支付资金。',
          [{ name: '流动性覆盖不足', context: '关联规则：短期流动性覆盖监测规则' }]
        )
      ),
      buildIndicator(
        'ind-3-4',
        '财政暂付款清理率',
        79,
        '反映暂付款项清理进展与风险暴露程度。',
        '偏低',
        buildDetail(
          'detail-3-4',
          '财政暂付款清理率',
          '衡量财政暂付款项按计划清理完成的比例。',
          '79%',
          '85%',
          [74, 75, 76, 77, 78, 79],
          '按月制定暂付款清理计划，分级督导高风险地区清理进度。',
          [{ name: '暂付款清理滞后', context: '关联规则：暂付款账龄超限预警规则' }]
        )
      ),
    ],
  },
  {
    id: 'dim-4',
    name: '合规性与财经纪律',
    score: 90,
    status: '良好',
    description: '用于评价三保资金使用的合规性和财经纪律执行情况。',
    judgementBasis: ['暂未发现重大违规问题', '财经纪律执行情况良好', '需关注个别单位的预算执行偏差'],
    indicators: [
      buildIndicator(
        'ind-4-1',
        '财经制度执行率',
        93,
        '反映制度条款在业务流程中的执行情况。',
        '良好',
        buildDetail(
          'detail-4-1',
          '财经制度执行率',
          '衡量财经制度在预算、支付、核算环节的执行比例。',
          '93%',
          '90%',
          [88, 89, 90, 91, 92, 93],
          '持续开展制度执行抽检，固化高频场景的制度指引。',
          [{ name: '制度执行偏差', context: '关联规则：制度执行率异常波动规则' }]
        )
      ),
      buildIndicator(
        'ind-4-2',
        '违规问题发生率',
        89,
        '反映违规问题发生频次与治理效果。',
        '一般',
        buildDetail(
          'detail-4-2',
          '违规问题发生率',
          '衡量监督期内违规问题发生控制水平。',
          '89%',
          '92%',
          [84, 85, 86, 87, 88, 89],
          '针对高频违规场景开展专项培训与复盘，降低重复问题发生。',
          [{ name: '重复违规问题', context: '关联规则：重复违规命中规则' }]
        )
      ),
      buildIndicator(
        'ind-4-3',
        '资金用途合规率',
        91,
        '反映资金用途与政策要求的一致性。',
        '良好',
        buildDetail(
          'detail-4-3',
          '资金用途合规率',
          '衡量资金支出用途与政策范围匹配程度。',
          '91%',
          '90%',
          [86, 87, 88, 89, 90, 91],
          '强化用途校验规则，事前拦截超范围支付申请。',
          [{ name: '资金用途偏离', context: '关联规则：资金用途合规校验规则' }]
        )
      ),
      buildIndicator(
        'ind-4-4',
        '审计问题重复率',
        87,
        '反映审计问题整改复发情况。',
        '一般',
        buildDetail(
          'detail-4-4',
          '审计问题重复率',
          '衡量已整改问题在后续周期重复发生的比例。',
          '87%',
          '90%',
          [82, 83, 84, 85, 86, 87],
          '将重复问题纳入问责清单并开展闭环回溯。',
          [{ name: '审计问题复发', context: '关联规则：整改复发监测规则' }]
        )
      ),
    ],
  },
  {
    id: 'dim-5',
    name: '资金绩效与民生结果',
    score: 88,
    status: '良好',
    description: '用于评价三保资金的使用绩效和民生保障效果。',
    judgementBasis: ['民生支出占比稳定', '重点项目资金使用效益较高', '部分项目绩效评价不充分'],
    indicators: [
      buildIndicator(
        'ind-5-1',
        '民生支出达成率',
        90,
        '反映民生重点支出目标完成情况。',
        '良好',
        buildDetail(
          'detail-5-1',
          '民生支出达成率',
          '衡量民生重点项目支出目标达成程度。',
          '90%',
          '90%',
          [85, 86, 87, 88, 89, 90],
          '保持民生重点领域预算执行监测，及时纠偏低执行项目。',
          [{ name: '民生支出执行偏低', context: '关联规则：民生支出目标达成规则' }]
        )
      ),
      buildIndicator(
        'ind-5-2',
        '项目绩效达标率',
        87,
        '反映项目绩效评价达标程度。',
        '一般',
        buildDetail(
          'detail-5-2',
          '项目绩效达标率',
          '衡量重点项目在绩效评价中的达标比例。',
          '87%',
          '90%',
          [82, 83, 84, 85, 86, 87],
          '对低绩效项目建立“一项目一方案”整改清单。',
          [{ name: '项目绩效未达标', context: '关联规则：绩效评价未达标规则' }]
        )
      ),
      buildIndicator(
        'ind-5-3',
        '政策受益覆盖率',
        89,
        '反映政策覆盖对象和受益效果。',
        '良好',
        buildDetail(
          'detail-5-3',
          '政策受益覆盖率',
          '衡量政策触达目标群体的覆盖广度与有效性。',
          '89%',
          '88%',
          [84, 85, 86, 87, 88, 89],
          '完善政策触达台账，提升偏远地区和特殊群体覆盖率。',
          [{ name: '政策触达不足', context: '关联规则：政策覆盖率阈值规则' }]
        )
      ),
      buildIndicator(
        'ind-5-4',
        '群众满意度指数',
        86,
        '反映群众对民生保障成效的主观评价。',
        '一般',
        buildDetail(
          'detail-5-4',
          '群众满意度指数',
          '衡量群众对民生保障政策执行与结果的满意程度。',
          '86%',
          '90%',
          [81, 82, 83, 84, 85, 86],
          '针对投诉高频领域开展专项改进，提升服务响应效率。',
          [{ name: '满意度下降', context: '关联规则：满意度异常波动规则' }]
        )
      ),
    ],
  },
  {
    id: 'dim-6',
    name: '监督整改与问责闭环',
    score: 82,
    status: '一般',
    description: '用于评价问题发现、整改、问责的全流程闭环管理情况。',
    judgementBasis: ['问题整改率有待提升', '问责机制尚未完全形成闭环', '重复发生问题数偏高'],
    indicators: [
      {
        id: 'ind-6-1',
        name: '审计/监督问题按期整改率',
        score: 82,
        description: '反映审计和监督发现问题的按期整改情况',
        result: '偏低',
        detail: {
          id: 'detail-6-1',
          name: '审计/监督问题按期整改率',
          definition: '审计/监督问题按期整改率，反映审计和监督发现问题的按期整改情况，是衡量整改及时性和有效性的重要指标。',
          currentValue: '82%',
          standardValue: '90%',
          trend: [75, 78, 80, 82, 83, 82],
          regionalDistribution: [
            { name: '东城区', value: 75, status: 'bad' },
            { name: '南城区', value: 80, status: 'warning' },
            { name: '西城区', value: 85, status: 'good' },
          ],
          rules: [{ name: '问题整改率低于阈值', context: '关联制度：三保资金监督整改办法' }],
          suggestions: '针对整改率偏低的区域进行专项督办，分析原因，限期整改。',
        },
      },
      {
        id: 'ind-6-2',
        name: '问题金额整改到位率',
        score: 78,
        description: '反映问题涉及金额的整改到位情况',
        result: '偏低',
        detail: {
          id: 'detail-6-2',
          name: '问题金额整改到位率',
          definition: '问题金额整改到位率，反映问题涉及金额的整改到位情况。',
          currentValue: '78%',
          standardValue: '85%',
          trend: [70, 72, 75, 78, 77, 76],
          regionalDistribution: [],
          rules: [],
          suggestions: '加大对问题金额的追缴和整改力度。',
        },
      },
      buildIndicator(
        'ind-6-3',
        '问责执行及时率',
        80,
        '反映问题问责处理是否按节点完成。',
        '一般',
        buildDetail(
          'detail-6-3',
          '问责执行及时率',
          '衡量问责流程从立案到结案是否在规定周期内完成。',
          '80%',
          '88%',
          [74, 75, 76, 77, 79, 80],
          '建立问责流程时限提醒机制，对超期案件进行专项督办。',
          [{ name: '问责执行超期', context: '关联规则：问责流程时效预警规则' }]
        )
      ),
      buildIndicator(
        'ind-6-4',
        '重复问题复发率',
        79,
        '反映已整改问题重复出现情况。',
        '偏低',
        buildDetail(
          'detail-6-4',
          '重复问题复发率',
          '衡量已完成整改问题在后续周期中的复发控制水平。',
          '79%',
          '86%',
          [73, 74, 75, 76, 78, 79],
          '对复发问题实施追责回溯，补齐制度漏洞与执行缺口。',
          [{ name: '整改问题复发', context: '关联规则：重复问题复发监测规则' }]
        )
      ),
    ],
  },
];
