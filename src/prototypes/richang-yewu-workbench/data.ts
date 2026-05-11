
export interface Level3_IndicatorDetail {
  id: string;
  name: string;
  definition: string;
  currentValue: string;
  standardValue: string;
  weightValue?: string;
  weightReason?: string;
  scoreFormula?: string;
  policyLevel?: string;
  policyName?: string;
  policyCode?: string;
  policyClause?: string;
  policyLink?: string;
  pickReason?: string;
  indicatorGroup?: string;
  trend: number[];
  regionalDistribution: Array<{ name: string; value: number; status: 'good' | 'warning' | 'bad' }>;
  rules: Array<{ name: string; context: string }>;
  suggestions: string;
}

export interface Level2_Indicator {
  id: string;
  name: string;
  score: number;
  weightValue?: string;
  description: string;
  result: '良好' | '一般' | '偏低';
  detail: Level3_IndicatorDetail;
}

export interface Level1_Dimension {
  id: string;
  name: string;
  score: number;
  weightValue?: string;
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
  rules: Array<{ name: string; context: string }>,
  regionalDistribution?: Array<{ name: string; value: number; status: 'good' | 'warning' | 'bad' }>,
  extra?: Partial<Pick<Level3_IndicatorDetail, 'weightValue' | 'weightReason' | 'scoreFormula' | 'policyLevel' | 'policyName' | 'policyCode' | 'policyClause' | 'policyLink' | 'pickReason' | 'indicatorGroup'>>
): Level3_IndicatorDetail => ({
  id,
  name,
  definition,
  currentValue,
  standardValue,
  weightValue: extra?.weightValue,
  weightReason: extra?.weightReason,
  scoreFormula: extra?.scoreFormula,
  policyLevel: extra?.policyLevel,
  policyName: extra?.policyName,
  policyCode: extra?.policyCode,
  policyClause: extra?.policyClause,
  policyLink: extra?.policyLink,
  pickReason: extra?.pickReason,
  indicatorGroup: extra?.indicatorGroup,
  trend,
  regionalDistribution: regionalDistribution || [
    { name: '东城区', value: trend[trend.length - 1] - 6, status: trend[trend.length - 1] < 84 ? 'bad' : 'warning' },
    { name: '南城区', value: trend[trend.length - 1] - 3, status: trend[trend.length - 1] < 88 ? 'warning' : 'good' },
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
  detail: Level3_IndicatorDetail,
  weightValue?: string,
): Level2_Indicator => ({
  id,
  name,
  score,
  weightValue,
  description,
  result,
  detail,
});

export const analysisData: Level1_Dimension[] = [
  {
    id: 'dim-1',
    name: '整改推进与任务完成',
    score: 86,
    status: '良好',
    description: '用于评价重点领域整改任务的推进情况和完成质量，反映整改工作的整体进展。',
    judgementBasis: ['问题整改率达到88%，接近目标', '按期整改完成率84%，需加强时限管理', '整改销号率85%，销号流程需优化'],
    indicators: [
      buildIndicator(
        'ind-1-1',
        '问题整改率',
        88,
        '衡量本周期内纳入整改范围的问题按要求完成整改的比例。',
        '良好',
        buildDetail(
          'detail-1-1',
          '问题整改率',
          '衡量本周期内纳入整改范围的问题按要求完成整改的比例。',
          '88%',
          '90%',
          [80, 82, 84, 85, 87, 88],
          '对整改率偏低地区建立专项督办清单，逐项跟踪整改完成情况。',
          [{ name: '整改率低于阈值', context: '关联规则：问题整改率监测规则' }],
          [
            { name: '东城区', value: 82, status: 'warning' },
            { name: '南城区', value: 87, status: 'good' },
            { name: '西城区', value: 90, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-1-2',
        '按期整改完成率',
        84,
        '衡量应在规定时限内完成的问题整改任务实际按期完成的比例。',
        '一般',
        buildDetail(
          'detail-1-2',
          '按期整改完成率',
          '衡量应在规定时限内完成的问题整改任务实际按期完成的比例。',
          '84%',
          '90%',
          [76, 78, 80, 82, 83, 84],
          '对临期、超期整改事项建立预警和提醒机制，压实整改时限责任。',
          [{ name: '按期整改率低于阈值', context: '关联规则：按期整改率监测规则' }],
          [
            { name: '东城区', value: 78, status: 'bad' },
            { name: '南城区', value: 83, status: 'warning' },
            { name: '西城区', value: 86, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-1-3',
        '整改销号率',
        85,
        '衡量已完成整改并经审核确认销号的问题占全部整改问题的比例。',
        '一般',
        buildDetail(
          'detail-1-3',
          '整改销号率',
          '衡量已完成整改并经审核确认销号的问题占全部整改问题的比例。',
          '85%',
          '88%',
          [78, 80, 81, 83, 84, 85],
          '统一销号口径和审核标准，避免"已整改未销号"长期积压。',
          [{ name: '销号率偏低', context: '关联规则：整改销号率监测规则' }],
          [
            { name: '东城区', value: 79, status: 'warning' },
            { name: '南城区', value: 84, status: 'good' },
            { name: '西城区', value: 87, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-1-4',
        '整改任务覆盖率',
        87,
        '衡量重点领域问题是否全部纳入整改任务台账并形成闭环管理。',
        '良好',
        buildDetail(
          'detail-1-4',
          '整改任务覆盖率',
          '衡量重点领域问题是否全部纳入整改任务台账并形成闭环管理。',
          '87%',
          '90%',
          [80, 82, 83, 85, 86, 87],
          '建立问题台账与整改任务自动映射机制，确保问题整改全量纳入。',
          [{ name: '问题未纳入整改台账', context: '关联规则：整改任务覆盖率监测规则' }],
          [
            { name: '东城区', value: 81, status: 'warning' },
            { name: '南城区', value: 86, status: 'good' },
            { name: '西城区', value: 89, status: 'good' },
          ]
        )
      ),
    ],
  },
  {
    id: 'dim-2',
    name: '整改时效与进度管理',
    score: 82,
    status: '一般',
    description: '用于评价整改工作的时效性和进度管理水平，防范超期风险。',
    judgementBasis: ['平均整改周期18天，略高于标准', '超期整改占比21%，需重点关注', '临期任务预警率83%，预警机制基本有效'],
    indicators: [
      buildIndicator(
        'ind-2-1',
        '平均整改周期',
        81,
        '衡量问题从下发到完成整改所耗费的平均时长。',
        '一般',
        buildDetail(
          'detail-2-1',
          '平均整改周期',
          '衡量问题从下发到完成整改所耗费的平均时长。',
          '18天',
          '15天',
          [22, 21, 20, 19, 18, 18],
          '优化整改流转链条，压缩审核、补正和反馈周期。',
          [{ name: '整改周期超标准', context: '关联规则：整改周期监测规则' }],
          [
            { name: '东城区', value: 21, status: 'bad' },
            { name: '南城区', value: 19, status: 'warning' },
            { name: '西城区', value: 17, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-2-2',
        '超期整改占比',
        79,
        '衡量超出规定整改时限仍未完成的问题占比。',
        '偏低',
        buildDetail(
          'detail-2-2',
          '超期整改占比',
          '衡量超出规定整改时限仍未完成的问题占比。',
          '21%',
          '15%',
          [28, 26, 24, 23, 22, 21],
          '建立超期问题专项督办机制，对高频超期单位开展约谈提醒。',
          [{ name: '超期问题占比过高', context: '关联规则：超期整改占比监测规则' }],
          [
            { name: '东城区', value: 26, status: 'bad' },
            { name: '南城区', value: 22, status: 'warning' },
            { name: '西城区', value: 18, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-2-3',
        '临期任务预警率',
        83,
        '衡量临近整改期限的问题任务中已进入预警范围的比例。',
        '一般',
        buildDetail(
          'detail-2-3',
          '临期任务预警率',
          '衡量临近整改期限的问题任务中已进入预警范围的比例。',
          '83%',
          '90%',
          [76, 78, 79, 80, 82, 83],
          '优化临期提醒规则，确保整改责任人和审核人同步收到预警信息。',
          [{ name: '临期任务未及时预警', context: '关联规则：临期任务预警监测规则' }],
          [
            { name: '东城区', value: 78, status: 'warning' },
            { name: '南城区', value: 82, status: 'good' },
            { name: '西城区', value: 85, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-2-4',
        '整改进度更新及时率',
        85,
        '衡量整改责任单位按要求及时更新整改进展情况的比例。',
        '一般',
        buildDetail(
          'detail-2-4',
          '整改进度更新及时率',
          '衡量整改责任单位按要求及时更新整改进展情况的比例。',
          '85%',
          '90%',
          [78, 80, 81, 83, 84, 85],
          '建立整改进度更新提醒机制，定期核查进度停滞事项。',
          [{ name: '整改进度长期未更新', context: '关联规则：整改进度更新监测规则' }],
          [
            { name: '东城区', value: 79, status: 'warning' },
            { name: '南城区', value: 84, status: 'good' },
            { name: '西城区', value: 87, status: 'good' },
          ]
        )
      ),
    ],
  },
  {
    id: 'dim-3',
    name: '责任落实与审核把关',
    score: 84,
    status: '一般',
    description: '用于评价整改责任的落实情况和审核把关质量，确保整改工作责任到人。',
    judgementBasis: ['责任单位落实率86%，责任归属基本明确', '整改审核通过率85%，审核标准需统一', '整改退回率偏高，需优化材料质量'],
    indicators: [
      buildIndicator(
        'ind-3-1',
        '责任单位落实率',
        86,
        '衡量整改问题是否全部明确责任单位并落实到具体责任主体。',
        '良好',
        buildDetail(
          'detail-3-1',
          '责任单位落实率',
          '衡量整改问题是否全部明确责任单位并落实到具体责任主体。',
          '86%',
          '90%',
          [79, 81, 82, 84, 85, 86],
          '补齐整改任务责任归属信息，明确主责和配合单位。',
          [{ name: '责任单位缺失', context: '关联规则：责任单位落实监测规则' }],
          [
            { name: '东城区', value: 80, status: 'warning' },
            { name: '南城区', value: 85, status: 'good' },
            { name: '西城区', value: 88, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-3-2',
        '整改审核通过率',
        85,
        '衡量提交的整改结果经审核确认通过的比例。',
        '一般',
        buildDetail(
          'detail-3-2',
          '整改审核通过率',
          '衡量提交的整改结果经审核确认通过的比例。',
          '85%',
          '88%',
          [78, 80, 81, 83, 84, 85],
          '统一整改审核标准，重点规范佐证材料和整改结论口径。',
          [{ name: '审核退回率偏高', context: '关联规则：整改审核通过率监测规则' }],
          [
            { name: '东城区', value: 79, status: 'warning' },
            { name: '南城区', value: 84, status: 'good' },
            { name: '西城区', value: 87, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-3-3',
        '整改退回率',
        80,
        '衡量整改申请因材料不完整、措施不到位等原因被退回的比例控制水平。',
        '偏低',
        buildDetail(
          'detail-3-3',
          '整改退回率',
          '衡量整改申请因材料不完整、措施不到位等原因被退回的比例控制水平。',
          '80%',
          '86%',
          [74, 75, 77, 78, 79, 80],
          '针对高频退回原因建立问题模板，减少重复补正。',
          [{ name: '整改退回率偏高', context: '关联规则：整改退回率监测规则' }],
          [
            { name: '东城区', value: 74, status: 'bad' },
            { name: '南城区', value: 78, status: 'warning' },
            { name: '西城区', value: 82, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-3-4',
        '督办闭环率',
        83,
        '衡量纳入督办范围的问题是否完成督办、反馈、审核、销号全过程闭环。',
        '一般',
        buildDetail(
          'detail-3-4',
          '督办闭环率',
          '衡量纳入督办范围的问题是否完成督办、反馈、审核、销号全过程闭环。',
          '83%',
          '88%',
          [76, 78, 79, 81, 82, 83],
          '建立督办节点跟踪机制，明确每个阶段的反馈责任和时限。',
          [{ name: '督办事项长期未闭环', context: '关联规则：督办闭环率监测规则' }],
          [
            { name: '东城区', value: 77, status: 'warning' },
            { name: '南城区', value: 82, status: 'good' },
            { name: '西城区', value: 85, status: 'good' },
          ]
        )
      ),
    ],
  },
  {
    id: 'dim-4',
    name: '资金整改与风险控制',
    score: 79,
    status: '偏低',
    description: '用于评价问题资金整改到位情况和风险管控水平，是重点领域整改的核心关注点。',
    judgementBasis: ['问题金额整改到位率78%，资金追缴压力大', '高风险问题金额占比23%，风险敞口较大', '资金流向异常率需重点关注'],
    indicators: [
      buildIndicator(
        'ind-4-1',
        '问题金额整改到位率',
        78,
        '衡量问题涉及金额中已完成整改、追回、归还或规范处理的比例。',
        '偏低',
        buildDetail(
          'detail-4-1',
          '问题金额整改到位率',
          '衡量问题涉及金额中已完成整改、追回、归还或规范处理的比例。',
          '78%',
          '85%',
          [70, 72, 74, 76, 77, 78],
          '对金额较大的整改事项建立专项清单，逐项核查到位情况。',
          [{ name: '整改金额到位率低', context: '关联规则：问题金额整改到位率监测规则' }],
          [
            { name: '东城区', value: 72, status: 'bad' },
            { name: '南城区', value: 77, status: 'warning' },
            { name: '西城区', value: 80, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-4-2',
        '高风险问题金额占比',
        77,
        '衡量高风险问题金额在全部整改问题金额中的占比控制情况。',
        '偏低',
        buildDetail(
          'detail-4-2',
          '高风险问题金额占比',
          '衡量高风险问题金额在全部整改问题金额中的占比控制情况。',
          '23%',
          '15%',
          [30, 28, 27, 25, 24, 23],
          '优先推动高风险问题整改，压降重大风险敞口。',
          [{ name: '高风险金额占比过高', context: '关联规则：高风险问题金额占比监测规则' }],
          [
            { name: '东城区', value: 28, status: 'bad' },
            { name: '南城区', value: 24, status: 'warning' },
            { name: '西城区', value: 20, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-4-3',
        '资金流向异常率',
        80,
        '衡量整改过程中涉及资金流向异常、用途不明或长期未规范处理的问题比例。',
        '偏低',
        buildDetail(
          'detail-4-3',
          '资金流向异常率',
          '衡量整改过程中涉及资金流向异常、用途不明或长期未规范处理的问题比例。',
          '80%',
          '88%',
          [73, 75, 76, 78, 79, 80],
          '加强问题资金流向复核和支付用途校验，防止整改不到位。',
          [{ name: '资金流向异常', context: '关联规则：资金流向异常监测规则' }],
          [
            { name: '东城区', value: 74, status: 'bad' },
            { name: '南城区', value: 78, status: 'warning' },
            { name: '西城区', value: 82, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-4-4',
        '重大风险事项压降率',
        81,
        '衡量重大、重点风险问题在整改周期内实现压降的程度。',
        '一般',
        buildDetail(
          'detail-4-4',
          '重大风险事项压降率',
          '衡量重大、重点风险问题在整改周期内实现压降的程度。',
          '81%',
          '86%',
          [75, 76, 77, 79, 80, 81],
          '建立高风险事项台账，按月跟踪压降进度并分类处置。',
          [{ name: '重大风险事项长期未压降', context: '关联规则：重大风险事项压降率监测规则' }],
          [
            { name: '东城区', value: 75, status: 'bad' },
            { name: '南城区', value: 79, status: 'warning' },
            { name: '西城区', value: 83, status: 'good' },
          ]
        )
      ),
    ],
  },
  {
    id: 'dim-5',
    name: '治理改进与制度完善',
    score: 83,
    status: '一般',
    description: '用于评价整改成果向治理改进和制度完善的转化情况，推动长效治理机制建设。',
    judgementBasis: ['制度完善率84%，制度建设持续推进', '重复问题下降率82%，治理成效初显', '问题复发控制需加强'],
    indicators: [
      buildIndicator(
        'ind-5-1',
        '制度完善率',
        84,
        '衡量围绕整改问题已推动制度修订、流程优化和机制完善的比例。',
        '一般',
        buildDetail(
          'detail-5-1',
          '制度完善率',
          '衡量围绕整改问题已推动制度修订、流程优化和机制完善的比例。',
          '84%',
          '88%',
          [77, 79, 80, 82, 83, 84],
          '将制度修订纳入整改验收条件，避免仅做表面整改。',
          [{ name: '制度整改滞后', context: '关联规则：制度完善率监测规则' }],
          [
            { name: '东城区', value: 78, status: 'warning' },
            { name: '南城区', value: 83, status: 'good' },
            { name: '西城区', value: 86, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-5-2',
        '重复问题下降率',
        82,
        '衡量历史重复发生问题在本周期的下降情况。',
        '一般',
        buildDetail(
          'detail-5-2',
          '重复问题下降率',
          '衡量历史重复发生问题在本周期的下降情况。',
          '82%',
          '86%',
          [75, 77, 78, 80, 81, 82],
          '对重复问题建立根因分析机制，推动从"问题整改"转向"机制整改"。',
          [{ name: '重复问题反复出现', context: '关联规则：重复问题下降率监测规则' }],
          [
            { name: '东城区', value: 76, status: 'warning' },
            { name: '南城区', value: 81, status: 'good' },
            { name: '西城区', value: 84, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-5-3',
        '问题复发控制率',
        81,
        '衡量已完成整改的问题在后续监督周期内未再次发生的控制水平。',
        '一般',
        buildDetail(
          'detail-5-3',
          '问题复发控制率',
          '衡量已完成整改的问题在后续监督周期内未再次发生的控制水平。',
          '81%',
          '86%',
          [74, 76, 77, 79, 80, 81],
          '对复发问题实施回溯核查，完善制度和执行链条。',
          [{ name: '整改问题复发', context: '关联规则：问题复发控制率监测规则' }],
          [
            { name: '东城区', value: 75, status: 'bad' },
            { name: '南城区', value: 79, status: 'warning' },
            { name: '西城区', value: 83, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-5-4',
        '整改成果转化率',
        85,
        '衡量整改成果转化为制度规范、管理优化和长期机制的程度。',
        '一般',
        buildDetail(
          'detail-5-4',
          '整改成果转化率',
          '衡量整改成果转化为制度规范、管理优化和长期机制的程度。',
          '85%',
          '88%',
          [78, 80, 81, 83, 84, 85],
          '提炼高频问题整改经验，形成标准化制度成果清单。',
          [{ name: '整改成果未形成制度闭环', context: '关联规则：整改成果转化率监测规则' }],
          [
            { name: '东城区', value: 79, status: 'warning' },
            { name: '南城区', value: 84, status: 'good' },
            { name: '西城区', value: 87, status: 'good' },
          ]
        )
      ),
    ],
  },
  {
    id: 'dim-6',
    name: '数据规范与材料完备',
    score: 87,
    status: '良好',
    description: '用于评价整改数据填报的规范性和佐证材料的完备程度，确保整改过程可追溯。',
    judgementBasis: ['整改填报完整率89%，数据质量较好', '佐证材料齐备率86%，材料审核需加强', '数据一致性通过率87%，口径基本统一'],
    indicators: [
      buildIndicator(
        'ind-6-1',
        '整改填报完整率',
        89,
        '衡量整改台账、整改报告、整改状态等填报信息的完整程度。',
        '良好',
        buildDetail(
          'detail-6-1',
          '整改填报完整率',
          '衡量整改台账、整改报告、整改状态等填报信息的完整程度。',
          '89%',
          '90%',
          [82, 84, 85, 87, 88, 89],
          '统一整改填报模板，重点校验高频漏填字段。',
          [{ name: '整改填报缺项', context: '关联规则：整改填报完整率监测规则' }],
          [
            { name: '东城区', value: 83, status: 'warning' },
            { name: '南城区', value: 88, status: 'good' },
            { name: '西城区', value: 91, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-6-2',
        '佐证材料齐备率',
        86,
        '衡量整改事项所附证明材料、附件和整改依据的齐备程度。',
        '一般',
        buildDetail(
          'detail-6-2',
          '佐证材料齐备率',
          '衡量整改事项所附证明材料、附件和整改依据的齐备程度。',
          '86%',
          '90%',
          [79, 81, 82, 84, 85, 86],
          '建立材料清单校验规则，减少因佐证不足导致审核退回。',
          [{ name: '整改材料不齐', context: '关联规则：佐证材料齐备率监测规则' }],
          [
            { name: '东城区', value: 80, status: 'warning' },
            { name: '南城区', value: 85, status: 'good' },
            { name: '西城区', value: 88, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-6-3',
        '数据一致性通过率',
        87,
        '衡量整改系统内台账数据、报告数据和审核数据的一致性程度。',
        '良好',
        buildDetail(
          'detail-6-3',
          '数据一致性通过率',
          '衡量整改系统内台账数据、报告数据和审核数据的一致性程度。',
          '87%',
          '90%',
          [80, 82, 83, 85, 86, 87],
          '建立多表一致性校验机制，确保整改口径统一。',
          [{ name: '台账与报告数据不一致', context: '关联规则：数据一致性通过率监测规则' }],
          [
            { name: '东城区', value: 81, status: 'warning' },
            { name: '南城区', value: 86, status: 'good' },
            { name: '西城区', value: 89, status: 'good' },
          ]
        )
      ),
      buildIndicator(
        'ind-6-4',
        '整改数据更新及时率',
        88,
        '衡量整改相关数据、状态和结论在系统中更新的及时程度。',
        '良好',
        buildDetail(
          'detail-6-4',
          '整改数据更新及时率',
          '衡量整改相关数据、状态和结论在系统中更新的及时程度。',
          '88%',
          '90%',
          [81, 83, 84, 86, 87, 88],
          '建立关键字段更新时间监控，避免数据长期停滞。',
          [{ name: '整改数据更新滞后', context: '关联规则：整改数据更新及时率监测规则' }],
          [
            { name: '东城区', value: 82, status: 'warning' },
            { name: '南城区', value: 87, status: 'good' },
            { name: '西城区', value: 90, status: 'good' },
          ]
        )
      ),
    ],
  },
];

type WorkbookIndicatorSeed = {
  secondName: string;
  secondWeight: number;
  name: string;
  weight: number;
  weightRange: string;
  currentValue: string;
  standardValue: string;
  formula: string;
  scoreFormula: string;
  reason: string;
  attr: string;
  coreClause: string;
  pickReason: string;
  extraClause?: string;
};

type WorkbookDimensionSeed = {
  name: string;
  weight: number;
  description: string;
  judgementBasis: string[];
  indicators: WorkbookIndicatorSeed[];
};

const workbookTrend = (score: number, invert = false): number[] => {
  const base = Math.max(55, score - 10);
  const steps = [0, 2, 3, 5, 7, 8];
  const values = steps.map((step) => Math.min(99, base + step));
  if (invert) {
    return values.map((_, index) => Math.max(35, values[values.length - 1] - (values[index] - base)));
  }
  values[values.length - 1] = score;
  return values;
};

const workbookDistribution = (score: number, invert = false) => {
  const badValue = invert ? Math.min(99, score + 8) : Math.max(40, score - 8);
  const warningValue = invert ? Math.min(99, score + 4) : Math.max(45, score - 4);
  const goodValue = invert ? score : Math.min(98, score + 2);
  return [
    { name: '市本级', value: badValue, status: invert ? 'bad' : (badValue >= 85 ? 'good' : badValue >= 75 ? 'warning' : 'bad') as 'good' | 'warning' | 'bad' },
    { name: '重点区县', value: warningValue, status: invert ? 'warning' : (warningValue >= 85 ? 'good' : warningValue >= 75 ? 'warning' : 'bad') as 'good' | 'warning' | 'bad' },
    { name: '一般区县', value: goodValue, status: invert ? 'good' : (goodValue >= 85 ? 'good' : goodValue >= 75 ? 'warning' : 'bad') as 'good' | 'warning' | 'bad' },
  ];
};

const workbookDimensions: WorkbookDimensionSeed[] = [
  {
    name: '限额与预算合规',
    weight: 0.18,
    description: '依据 Excel 中的限额控制、人大程序和全口径预算管理要求，评价地方政府债务是否处于法定边界内并纳入预算闭环。',
    judgementBasis: ['债务余额限额控制率保持在法定边界内', '新增债务审批程序总体合规', '一般债/专项债分类管理仍需持续校验'],
    indicators: [
      { secondName: '限额控制与人大程序', secondWeight: 0.555555555555556, name: '债务余额限额控制率', weight: 0.6, weightRange: '40%-80%', currentValue: '98.4%', standardValue: '<=100%', formula: '期末法定债务余额 / 批准债务限额', scoreFormula: '<=100%得100分；(100%,103%]得60分；>103%得0分', reason: '属于法定红线指标，直接反映是否突破全国人大/地方人大批准边界，故权重最高', attr: '中央强制', coreClause: '地方政府举债不得突破批准的限额', pickReason: '直接识别是否突破法定举债边界。' },
      { secondName: '限额控制与人大程序', secondWeight: 0.555555555555556, name: '新增债务审批合规率', weight: 0.4, weightRange: '20%-60%', currentValue: '96.8%', standardValue: '100%', formula: '经同级人大或常委会批准后安排发行的新增债务金额 / 新增债务总金额', scoreFormula: '100%得100分；每发现1笔未经法定程序批准或超限额安排，扣25分，最低0分', reason: '程序合法性是监督底线，但通常作为过程性合规指标，权重低于限额突破本身', attr: '中央强制', coreClause: '地方政府在分地区限额内举借债务，必须报本级人大或其常委会批准', pickReason: '反映新增举债法定程序执行质量。' },
      { secondName: '全口径预算管理', secondWeight: 0.444444444444444, name: '债务预算纳入完整率', weight: 0.5, weightRange: '25%-75%', currentValue: '97.6%', standardValue: '>=99%', formula: '纳入预算管理的债务金额 / 应纳入预算管理的债务金额', scoreFormula: '>=99%得100分；[95%,99%)得80分；[90%,95%)得60分；<90%得0分', reason: '是否纳入预算决定了后续能否穿透监督，属于基础性约束', attr: '中央强制', coreClause: '一般债务收支、专项债务收支纳入相应预算管理', pickReason: '是实现穿透监督的基础口径。' },
      { secondName: '全口径预算管理', secondWeight: 0.444444444444444, name: '一般债/专项债分类管理合规率', weight: 0.5, weightRange: '25%-75%', currentValue: '95.1%', standardValue: '100%', formula: '符合一般债/专项债分类规则的债务金额 / 法定债务总金额', scoreFormula: '100%得100分；每发现1类明显错分错列，按影响金额分档扣分，最低0分', reason: '分类错误会直接导致预算口径、偿债来源和风险识别失真，故保留中等权重', attr: '中央强制', coreClause: '无收益公益项目用一般债；有一定收益公益项目用专项债', pickReason: '保障债务分类、偿债来源和风险识别口径一致。' },
    ],
  },
  {
    name: '偿债能力与风险预警',
    weight: 0.22,
    description: '依据 Excel 中的偿债保障、风险指标监测和应急机制要求，评价地方政府债务的短期偿付能力与风险预警水平。',
    judgementBasis: ['到期本息偿付总体及时', '偿债资金来源覆盖率略有压力', '风险预警和应急处置机制已建立但联动效率仍需提升'],
    indicators: [
      { secondName: '偿债保障', secondWeight: 0.545454545454545, name: '当年到期本息偿付及时率', weight: 0.666666666666667, weightRange: '50%-83%', currentValue: '98.6%', standardValue: '100%', formula: '按期足额偿还的到期本息金额 / 当年到期本息总额', scoreFormula: '100%得100分；[98%,100%)得80分；[95%,98%)得60分；<95%得0分', reason: '是否按时还本付息是债务风险最直接结果指标，故权重高', attr: '中央强制', coreClause: '地方政府对其举借债务负有偿还责任，应按时还本付息', pickReason: '直接反映债务可持续性和短期偿付能力。' },
      { secondName: '偿债保障', secondWeight: 0.545454545454545, name: '偿债资金来源覆盖率', weight: 0.333333333333333, weightRange: '17%-50%', currentValue: '103%', standardValue: '>=110%', formula: '已落实偿债资金来源金额 / 未来12个月应偿本息金额', scoreFormula: '>=110%得100分；[100%,110%)得85分；[90%,100%)得60分；<90%得0分', reason: '这是偿债及时率的前置保障指标，重要但略低于实际偿付结果', attr: '中央强制', coreClause: '一般债以一般公共预算收入偿还，专项债以政府性基金或专项收入偿还', pickReason: '体现未来12个月偿债来源保障程度。' },
      { secondName: '风险预警与监测', secondWeight: 0.454545454545455, name: '风险指标监测覆盖率', weight: 0.6, weightRange: '40%-80%', currentValue: '92%', standardValue: '100%', formula: '已纳入日常监测的核心风险指标数 / 应监测核心风险指标数', scoreFormula: '100%得100分；少1项扣15分；低于70%得0分', reason: '中央已明确最小监测指标集，是否覆盖决定预警是否有效，因此权重较高', attr: '中央强制', coreClause: '测算债务率、新增债务率、偿债率、逾期债务率等指标并开展风险预警', pickReason: '是前瞻发现债务风险的重要抓手。' },
      { secondName: '风险预警与监测', secondWeight: 0.454545454545455, name: '风险应急机制完备度', weight: 0.4, weightRange: '20%-60%', currentValue: '5/6项', standardValue: '6/6项', formula: '（领导小组、日常监控、定期报告、应急预案、处置流程、部门联动）满足项数 / 6', scoreFormula: '全部满足得100分；每缺1项扣15分；缺2项及以上降至60分以下', reason: '应急机制偏组织管理，但在高风险地区极关键，因此赋予中等权重', attr: '中央强制', coreClause: '设立债务管理领导小组；财政部门负责债务风险日常监控和定期报告', pickReason: '体现高风险地区债务应急处置准备度。' },
    ],
  },
  {
    name: '专项债项目与资金绩效',
    weight: 0.22,
    description: '依据 Excel 中的项目筛选、发行使用和绩效用途调整要求，评价专项债项目合规性、进度和绩效管理水平。',
    judgementBasis: ['公益性与收益平衡审核基本达标', '专项债支出进度存在结构性差异', '绩效双监控覆盖和用途调整管理仍需强化'],
    indicators: [
      { secondName: '项目筛选与融资平衡', secondWeight: 0.363636363636364, name: '公益性与收益平衡审核通过率', weight: 0.625, weightRange: '38%-88%', currentValue: '94%', standardValue: '>=95%', formula: '通过公益性项目属性与融资收益平衡审核的项目数 / 申报专项债项目总数', scoreFormula: '100%得100分；[95%,100%)得85分；[90%,95%)得60分；<90%得0分', reason: '专项债项目真假合规的核心就是“公益性+收益平衡”，故权重较高', attr: '中央强制', coreClause: '专项债必须用于有一定收益的公益性项目，融资规模与项目收益相平衡', pickReason: '是专项债项目合规举债的前置条件。' },
      { secondName: '项目筛选与融资平衡', secondWeight: 0.363636363636364, name: '项目前期成熟度达标率', weight: 0.375, weightRange: '25%-62%', currentValue: '91%', standardValue: '>=95%', formula: '手续齐备且具备开工条件的项目数 / 已发行专项债支持项目总数', scoreFormula: '>=95%得100分；[90%,95%)得80分；<90%得0分', reason: '前期不成熟会直接导致资金闲置和用途调整，重要但略次于收益平衡', attr: '中央强制', coreClause: '融资平衡方案应准确反映前期手续、建设周期、分年度投资计划等', pickReason: '反映项目前期准备成熟度。' },
      { secondName: '发行使用与进度', secondWeight: 0.363636363636364, name: '专项债资金支出进度达标率', weight: 0.625, weightRange: '38%-88%', currentValue: '88%', standardValue: '>=95%', formula: '当期已支出专项债资金 / 当期计划支出专项债资金', scoreFormula: '>=95%得100分；[85%,95%)得80分；[70%,85%)得60分；<70%得0分', reason: '中央连续强调“加快发行使用”，进度慢会造成闲置和利息损耗，因此权重较高', attr: '中央强制', coreClause: '加快已发行未使用资金投入使用，逐个环节跟踪进展', pickReason: '判断资金是否按计划投入项目建设。' },
      { secondName: '发行使用与进度', secondWeight: 0.363636363636364, name: '实物工作量形成率', weight: 0.375, weightRange: '25%-62%', currentValue: '84%', standardValue: '>=90%', formula: '达到年度实物工作量目标的项目数 / 专项债支持项目总数', scoreFormula: '>=90%得100分；[80%,90%)得80分；<80%得0分', reason: '比单纯支付进度更能反映资金是否真正转化为项目产出', attr: '中央强制', coreClause: '确保年内形成实物工作量；既要加快进度，也要确保项目质量', pickReason: '直接反映资金向项目产出的转化效果。' },
      { secondName: '绩效与用途调整', secondWeight: 0.272727272727273, name: '绩效“双监控”覆盖率', weight: 0.666666666666667, weightRange: '33%-100%', currentValue: '93%', standardValue: '100%', formula: '纳入预算执行进度+绩效目标实现情况“双监控”的项目数 / 专项债项目总数', scoreFormula: '100%得100分；[90%,100%)得80分；<90%得0分', reason: '这是专项债绩效管理的制度抓手，直接决定后续额度分配和纠偏能力', attr: '中央强制', coreClause: '对专项债资金预算执行进度和绩效目标实现情况进行“双监控”', pickReason: '体现专项债资金全生命周期绩效管理水平。' },
      { secondName: '绩效与用途调整', secondWeight: 0.272727272727273, name: '用途调整合规率', weight: 0.333333333333333, weightRange: '17%-67%', currentValue: '96%', standardValue: '100%', formula: '符合规定履行程序的用途调整项目数 / 发生用途调整项目总数', scoreFormula: '100%得100分；每发现1起未备案、未履行预算调整、触碰负面清单事项，最低降至0分', reason: '发生调整不一定违规，但未按程序或触碰红线必须严扣，因此默认权重中等', attr: '中央强制', coreClause: '调整程序、预算调整、备案、信息公开', pickReason: '体现专项债用途调整过程的程序合法性。' },
    ],
  },
  {
    name: '隐性债务与违规融资监管',
    weight: 0.18,
    description: '依据 Excel 中的存量隐性债务化解、新增隐性债务遏制和虚假化债治理要求，评价地方政府债务红线管控情况。',
    judgementBasis: ['存量隐性债务化解进度总体可控', '新增隐性债务红线压力仍然存在', '虚假化债识别整改需持续强化'],
    indicators: [
      { secondName: '存量隐性债务化解', secondWeight: 0.444444444444444, name: '存量隐性债务化解/置换完成率', weight: 0.5, weightRange: '25%-75%', currentValue: '92%', standardValue: '>=100%', formula: '当期已实质性化解或置换金额 / 年度化债任务金额', scoreFormula: '>=100%得100分；[90%,100%)得85分；[80%,90%)得60分；<80%得0分', reason: '当前中央化债工作重心之一，且与财政可持续性直接相关，故权重较高', attr: '中央强制', coreClause: '用于置换存量隐性债务的地方政府债券发行完毕', pickReason: '是当前化债工作的重要监管内容。' },
      { secondName: '存量隐性债务化解', secondWeight: 0.444444444444444, name: '置换债资金专户专账封闭运行合规率', weight: 0.5, weightRange: '25%-75%', currentValue: '94%', standardValue: '100%', formula: '满足“专户管理+专账核算+封闭运行”要求的置换债资金金额 / 置换债资金总金额', scoreFormula: '100%得100分；每发现1起违反专户专账封闭运行要求按影响金额扣分，最低0分', reason: '这是近两年新增的化债监管重点，直接关系化债真实性、资金流向可追踪性与封闭管理成效', attr: '中央强制', coreClause: '置换债券资金实行专户管理、专账核算、封闭运行', pickReason: '反映化债资金是否真实、可追踪、可审计。' },
      { secondName: '新增隐性债务遏制', secondWeight: 0.555555555555556, name: '新增隐性债务发生额/案件数', weight: 0.6, weightRange: '60%-100%', currentValue: '2起', standardValue: '0起', formula: '当期经核实新增隐性债务金额（或案件数）', scoreFormula: '零发生得100分；一经发现原则上该指标0分，并触发整体风险提示', reason: '属于绝对红线，按“一票严扣”设计，故权重最高', attr: '中央强制', coreClause: '不得违法违规举借债务或担保，违规要追责', pickReason: '是地方政府债务监管的高敏感红线指标。' },
      { secondName: '新增隐性债务遏制', secondWeight: 0.555555555555556, name: '虚假化债识别整改率', weight: 0.4, weightRange: '20%-60%', currentValue: '78%', standardValue: '100%', formula: '已完成核查并纠正的虚假化债问题数 / 已发现虚假化债问题数', scoreFormula: '100%得100分；[80%,100%)得80分；<80%得0分', reason: '虚假化债会直接扭曲风险识别结果，需单列监测但权重略低于新增隐性债务本身', attr: '中央强制', coreClause: '对违规举债和虚假化债严查快处', pickReason: '用于校验化债真实性和风险识别准确性。' },
    ],
  },
  {
    name: '信息公开与穿透监测',
    weight: 0.1,
    description: '依据 Excel 中的债务信息公开和穿透式监测要求，评价地方政府债务透明度与全过程监测能力。',
    judgementBasis: ['债务信息公开基本完整', '存续期重大事项公开仍有滞后', '穿透式监测覆盖率基本达到预期'],
    indicators: [
      { secondName: '债务信息公开', secondWeight: 0.6, name: '债务信息公开完整率', weight: 0.5, weightRange: '33%-83%', currentValue: '91%', standardValue: '100%', formula: '已按制度公开的信息项数 / 应公开信息项数', scoreFormula: '100%得100分；[90%,100%)得80分；<90%得0分', reason: '信息公开是外部约束与社会监督基础，制度明确但相对过程性，因此中等权重', attr: '中央强制', coreClause: '公开限额、余额、使用安排、还本付息等信息', pickReason: '是形成市场约束和外部监督的基础指标。' },
      { secondName: '债务信息公开', secondWeight: 0.6, name: '存续期/重大事项公开及时率', weight: 0.5, weightRange: '33%-83%', currentValue: '96%', standardValue: '>=98%', formula: '在规定时限内公开存续期和重大事项信息的债券数 / 应公开债券数', scoreFormula: '>=98%得100分；[95%,98%)得80分；<95%得0分', reason: '债券存续期透明度直接影响外部监督与市场约束，应单列', attr: '中央强制', coreClause: '发行、存续期、重大事项等相关信息纳入公开范围', pickReason: '反映债券存续期透明度。' },
      { secondName: '穿透监测', secondWeight: 0.4, name: '穿透式监测覆盖率', weight: 1, weightRange: '50%-150%', currentValue: '92%', standardValue: '100%', formula: '纳入穿透式全过程监控的专项债项目数 / 专项债项目总数', scoreFormula: '100%得100分；[90%,100%)得80分；<90%得0分', reason: '没有穿透监测，很多合规与绩效指标无法自动获取，故赋予较高权重', attr: '中央强制', coreClause: '对专项债发行使用实行穿透式、全过程监控', pickReason: '提升风险识别的及时性和完整性。' },
    ],
  },
  {
    name: '监督整改与责任闭环',
    weight: 0.1,
    description: '依据 Excel 中的整改、问责和风险线索移送要求，评价地方政府债务监督成果是否形成整改问责闭环。',
    judgementBasis: ['问题整改完成率总体较好', '整改逾期问题仍有存量', '问责和线索移送闭环机制还需提速'],
    indicators: [
      { secondName: '问题整改', secondWeight: 0.6, name: '审计/监督问题整改完成率', weight: 0.666666666666667, weightRange: '33%-100%', currentValue: '88%', standardValue: '>=95%', formula: '已完成整改销号问题数 / 到期应整改问题数', scoreFormula: '>=95%得100分；[85%,95%)得80分；<85%得0分', reason: '监督成效最终要通过整改体现，是闭环核心，因此权重较高', attr: '中央强制', coreClause: '推动审计整改销号', pickReason: '是监督成果能否转化为治理成效的关键抓手。' },
      { secondName: '问题整改', secondWeight: 0.6, name: '整改逾期率', weight: 0.333333333333333, weightRange: '17%-67%', currentValue: '6.8%', standardValue: '<=5%', formula: '逾期未完成整改问题数 / 到期应整改问题数', scoreFormula: '0逾期得100分；(0,5%]得80分；(5%,10%]得60分；>10%得0分', reason: '与整改完成率互补，反映问题是否按时间表路线图落实，适合纳入闭环考核', attr: '中央强制', coreClause: '整改认定和销号需按时间表路线图推进', pickReason: '反映整改任务按期落实情况。' },
      { secondName: '问责与移送', secondWeight: 0.4, name: '隐性债务问责落实率', weight: 0.5, weightRange: '25%-100%', currentValue: '87%', standardValue: '100%', formula: '已落实问责处理的隐性债务案件数 / 已核定应问责案件数', scoreFormula: '100%得100分；未按期问责每起扣20分，最低0分', reason: '问责是压实责任的关键，但通常滞后于风险发现，因此权重略低于整改', attr: '中央强制', coreClause: '典型案例通报体现对新增隐性债务、化债不实等行为依纪依规问责', pickReason: '用于压实责任、形成监管震慑。' },
      { secondName: '问责与移送', secondWeight: 0.4, name: '风险线索移送闭环率', weight: 0.5, weightRange: '25%-100%', currentValue: '89%', standardValue: '100%', formula: '已完成移送并收到反馈结果的线索数 / 应移送线索数', scoreFormula: '100%得100分；[90%,100%)得80分；<90%得0分', reason: '这是财政监督、审计、纪检、金融监管协同闭环的基础动作', attr: '中央强制', coreClause: '发现跨地区违法违规线索应及时反馈并建立信息共享机制', pickReason: '体现财政监督与跨部门协同闭环能力。' },
    ],
  },
];

const getStructureStatus = (score: number): '良好' | '一般' | '偏低' => {
  if (score >= 85) return '良好';
  if (score >= 65) return '一般';
  return '偏低';
};

const maxDimensionWeight = Math.max(...workbookDimensions.map((dimension) => dimension.weight));

export const localDebtAnalysisData: Level1_Dimension[] = workbookDimensions.map((dimension, dimensionIndex) => {
  const dimensionScore = Math.round((dimension.weight / maxDimensionWeight) * 100);
  return {
    id: `debt-dim-${dimensionIndex + 1}`,
    name: dimension.name,
    score: dimensionScore,
    weightValue: `${Math.round(dimension.weight * 100)}%`,
    status: getStructureStatus(dimensionScore),
    description: `${dimension.description} 当前页面展示的是 Excel 中的评价体系定义，不代表实际业务结果。`,
    judgementBasis: dimension.judgementBasis,
    indicators: dimension.indicators.map((indicator, indicatorIndex) => {
      const sameGroupIndicators = dimension.indicators.filter((item) => item.secondName === indicator.secondName);
      const groupMaxWeight = Math.max(...sameGroupIndicators.map((item) => Number(item.weight)));
      const indicatorWeight = Number(indicator.weight || 0);
      const normalizedIndicatorScore = groupMaxWeight > 0 ? Math.round((indicatorWeight / groupMaxWeight) * 100) : 0;
      const trend = Array.from({ length: 6 }, () => normalizedIndicatorScore);
      const result = normalizedIndicatorScore >= 85 ? '良好' : normalizedIndicatorScore >= 65 ? '一般' : '偏低';
      return buildIndicator(
        `debt-ind-${dimensionIndex + 1}-${indicatorIndex + 1}`,
        indicator.name,
        normalizedIndicatorScore,
        `${indicator.secondName}；${indicator.reason}；当前仅展示定义口径与权重参考。`,
        result,
        buildDetail(
          `debt-detail-${dimensionIndex + 1}-${indicatorIndex + 1}`,
          indicator.name,
          `${indicator.secondName}。计算公式：${indicator.formula}`,
          indicator.currentValue || '待接入业务结果',
          indicator.standardValue || '见得分公式',
          trend,
          `${indicator.pickReason}${indicator.extraClause ? ` 补充依据：${indicator.extraClause}` : ''}`,
          [
            { name: indicator.attr, context: indicator.coreClause },
            { name: '权重参考', context: `三级指标权重（占上级%）：${indicator.weight}` },
            { name: '得分口径', context: indicator.scoreFormula },
          ],
          [
            { name: '一级权重', value: Math.round(dimension.weight * 100), status: 'good' },
            { name: '二级参考', value: Math.round(Number(indicator.weight || 0) * 100), status: 'warning' },
            { name: '业务结果', value: 0, status: 'bad' },
          ],
          {
            weightValue: `${Math.round(Number(indicator.weight || 0) * 100)}%`,
            weightReason: indicator.reason,
            scoreFormula: indicator.scoreFormula,
            policyLevel: indicator.attr,
            policyName: '',
            policyCode: '',
            policyClause: indicator.coreClause,
            policyLink: '',
            pickReason: indicator.pickReason,
            indicatorGroup: indicator.secondName,
          },
        ),
        `${Math.round(Number(indicator.weight || 0) * 100)}%`,
      );
    }),
  };
});

type KeyAreaTopicProfile = {
  title: string;
  shortName: string;
  policyName: string;
  policyCode: string;
  policyClause: string;
  scoreShift: number;
  dimensions: string[];
  basis: string[];
  indicatorSeeds: string[][];
};

const KEY_AREA_TOPIC_PROFILES: Record<string, KeyAreaTopicProfile> = {
  'key_area_rectify': {
    title: '重点领域整改',
    shortName: '重点整改',
    policyName: '《重点领域整改监督评价工作指引》',
    policyCode: '财监改〔2025〕1号',
    policyClause: '围绕重点领域问题识别、任务整改、资金风险、进度质量和责任闭环开展统一评价。',
    scoreShift: -6,
    dimensions: ['问题识别与任务纳管', '整改进度与时效控制', '资金风险与合规管理', '治理绩效与结果转化', '信息公开与穿透监测', '监督整改与责任闭环'],
    basis: ['问题纳管完整', '整改进度可控', '责任闭环清晰'],
    indicatorSeeds: [
      ['问题线索识别覆盖率', '整改任务纳管完整率', '疑点核验及时率'],
      ['整改进度达标率', '超期整改占比', '进度更新及时率'],
      ['问题资金整改到位率', '资金使用合规率', '风险预警命中率'],
      ['治理措施落地率', '制度修订完成率', '整改成效评估达标率'],
      ['整改信息公开完整率', '穿透监测覆盖率', '重大事项公开及时率'],
      ['监督问题整改完成率', '整改逾期率', '责任追究落实率'],
    ],
  },
  'yearly/local-debt': {
    title: '地方政府债务',
    shortName: '债务',
    policyName: '《地方政府债务风险监测与整改工作指引（试行）》',
    policyCode: '财监债〔2025〕7号',
    policyClause: '建立地方政府债务限额、发行使用、偿债风险和整改闭环的全过程监督评价机制。',
    scoreShift: 0,
    dimensions: workbookDimensions.map((item) => item.name),
    basis: ['债务限额管控', '专项债资金穿透监测', '风险整改闭环'],
    indicatorSeeds: [],
  },
  'yearly/farmland-fund': {
    title: '高标准农田建设资金使用管理',
    shortName: '农田资金',
    policyName: '《高标准农田建设资金管理与绩效监督指引（试行）》',
    policyCode: '财监农〔2025〕8号',
    policyClause: '围绕项目立项、资金拨付、工程进度、绩效验收和问题整改开展全过程监督。',
    scoreShift: -5,
    dimensions: ['项目立项与预算合规', '资金拨付与使用进度', '工程建设与验收质量', '绩效目标与收益实现', '信息公开与穿透监测', '问题整改与责任闭环'],
    basis: ['项目库管理完整', '资金支付与工程进度匹配', '验收问题整改闭环'],
    indicatorSeeds: [
      ['项目入库合规率', '实施方案批复及时率', '预算安排完整率'],
      ['资金拨付进度达标率', '资金支付合规率', '结余资金清理率'],
      ['工程节点完成率', '验收资料完整率', '质量问题发现整改率'],
      ['亩均建设成本偏差率', '新增耕地质量达标率', '绩效目标实现率'],
      ['项目公开完整率', '资金穿透监测覆盖率', '重大事项公开及时率'],
      ['监督问题整改完成率', '整改逾期率', '责任追究落实率'],
    ],
  },
  'yearly/state-assets': {
    title: '行政事业单位国有资产处置管理',
    shortName: '资产处置',
    policyName: '《行政事业单位国有资产处置监督管理办法》',
    policyCode: '财监资〔2025〕5号',
    policyClause: '对资产处置审批、评估、交易、收益上缴和问题整改实行闭环监督。',
    scoreShift: -8,
    dimensions: ['资产台账与权属完整', '处置审批与程序合规', '评估交易与收益管理', '资产风险与损失控制', '信息公开与穿透监测', '监督整改与责任闭环'],
    basis: ['资产台账完整', '处置程序合规', '收益及时上缴'],
    indicatorSeeds: [
      ['资产台账完整率', '权属证明齐备率', '闲置资产识别率'],
      ['处置事项审批合规率', '评估备案完整率', '公开交易执行率'],
      ['处置收入上缴及时率', '评估价值偏离率', '收益核算准确率'],
      ['资产流失风险命中率', '违规处置发现率', '损失追偿落实率'],
      ['处置信息公开完整率', '资产处置穿透监测覆盖率', '重大事项公开及时率'],
      ['监督问题整改完成率', '整改逾期率', '责任追究落实率'],
    ],
  },
  'yearly/tax-reduction': {
    title: '减税降费政策落实',
    shortName: '减税降费',
    policyName: '《减税降费政策落实监督评价指引》',
    policyCode: '财监税〔2025〕4号',
    policyClause: '围绕政策适用、申报审核、资金退付、企业获得感和问题整改开展监督评价。',
    scoreShift: -3,
    dimensions: ['政策适用与清单管理', '申报审核与办理效率', '退税减费与资金安全', '政策效果与主体获得感', '信息公开与穿透监测', '监督整改与责任闭环'],
    basis: ['政策清单完整', '审核办理及时', '优惠落实准确'],
    indicatorSeeds: [
      ['政策清单覆盖率', '适用对象识别准确率', '宣传辅导触达率'],
      ['申报审核及时率', '材料一次通过率', '退费办理时长达标率'],
      ['退税减费准确率', '违规享受识别率', '资金退付闭环率'],
      ['企业获得感达标率', '政策效果评估完成率', '投诉问题下降率'],
      ['政策公开完整率', '办理链路穿透监测覆盖率', '重大事项公开及时率'],
      ['监督问题整改完成率', '整改逾期率', '责任追究落实率'],
    ],
  },
  'yearly/refund-revenue': {
    title: '违规返还财政收入',
    shortName: '违规返还',
    policyName: '《违规返还财政收入监督整改工作指引》',
    policyCode: '财监收〔2025〕6号',
    policyClause: '对违规返还财政收入识别、追缴、整改和责任闭环开展穿透监督。',
    scoreShift: -12,
    dimensions: ['收入征缴与返还识别', '违规事项核验认定', '资金追缴与整改进度', '风险控制与制度约束', '信息公开与穿透监测', '监督整改与责任闭环'],
    basis: ['违规线索识别完整', '返还资金追缴到位', '责任整改闭环'],
    indicatorSeeds: [
      ['收入返还线索识别率', '疑点数据核验及时率', '违规事项入库完整率'],
      ['违规返还认定准确率', '合同协议清理率', '历史存量核查覆盖率'],
      ['违规资金追缴到位率', '整改进度更新及时率', '超期整改占比'],
      ['新增违规返还发生数', '制度漏洞修订完成率', '风险预警命中率'],
      ['整改信息公开完整率', '资金流向穿透监测覆盖率', '重大事项公开及时率'],
      ['监督问题整改完成率', '整改逾期率', '责任追究落实率'],
    ],
  },
  'yearly/sanbao-basic': {
    title: '基层“三保”',
    shortName: '三保',
    policyName: '《基层三保资金保障监督评价指引》',
    policyCode: '财监保〔2025〕3号',
    policyClause: '对保基本民生、保工资、保运转资金保障和风险整改开展月度监督评价。',
    scoreShift: -6,
    dimensions: ['预算保障与测算完整', '资金调度与支付进度', '工资民生与运转保障', '风险预警与应急处置', '信息公开与穿透监测', '监督整改与责任闭环'],
    basis: ['预算足额安排', '工资民生支付优先', '风险预警闭环'],
    indicatorSeeds: [
      ['三保预算足额安排率', '保障清单完整率', '缺口测算准确率'],
      ['资金调度及时率', '工资发放及时率', '民生支出保障率'],
      ['基本民生支付达标率', '基层运转保障率', '重点人群补助到位率'],
      ['库款风险预警命中率', '应急调度响应及时率', '风险地区压降率'],
      ['三保信息公开完整率', '资金穿透监测覆盖率', '重大事项公开及时率'],
      ['监督问题整改完成率', '整改逾期率', '责任追究落实率'],
    ],
  },
  'yearly/temporary-payment': {
    title: '财政暂付款管理',
    shortName: '暂付款',
    policyName: '《财政暂付款清理压降监督管理指引》',
    policyCode: '财监暂〔2025〕9号',
    policyClause: '围绕暂付款规模控制、清理压降、账龄结构和整改闭环开展监督评价。',
    scoreShift: -10,
    dimensions: ['暂付款台账与账龄管理', '新增暂付款控制', '清理压降与资金回收', '风险分类与责任落实', '信息公开与穿透监测', '监督整改与责任闭环'],
    basis: ['台账账龄清晰', '新增严格控制', '存量清理压降'],
    indicatorSeeds: [
      ['暂付款台账完整率', '账龄分类准确率', '长期挂账识别率'],
      ['新增暂付款发生额', '新增事项审批合规率', '违规垫付识别率'],
      ['暂付款清理完成率', '资金回收及时率', '存量压降率'],
      ['高风险暂付款占比', '责任单位确认率', '风险事项处置率'],
      ['暂付款信息公开完整率', '资金穿透监测覆盖率', '重大事项公开及时率'],
      ['监督问题整改完成率', '整改逾期率', '责任追究落实率'],
    ],
  },
  'yearly/false-revenue': {
    title: '财政收入虚收空转',
    shortName: '虚收空转',
    policyName: '《财政收入真实性监督评价指引》',
    policyCode: '财监收〔2025〕10号',
    policyClause: '对财政收入真实性、虚收空转线索核验、整改和责任闭环开展监督评价。',
    scoreShift: -14,
    dimensions: ['收入真实性与线索识别', '虚收空转核验认定', '资金回流与整改进度', '收入质量与风险控制', '信息公开与穿透监测', '监督整改与责任闭环'],
    basis: ['收入真实完整', '虚收空转核验及时', '整改责任闭环'],
    indicatorSeeds: [
      ['异常收入线索识别率', '收入真实性核验覆盖率', '重点税源波动识别率'],
      ['虚收空转认定准确率', '收入回流链路核验率', '疑点事项入库完整率'],
      ['问题收入调减到位率', '整改进度更新及时率', '超期整改占比'],
      ['非税收入异常占比', '收入质量评价达标率', '风险预警命中率'],
      ['收入信息公开完整率', '资金穿透监测覆盖率', '重大事项公开及时率'],
      ['监督问题整改完成率', '整改逾期率', '责任追究落实率'],
    ],
  },
  'yearly/one-card': {
    title: '惠民惠农财政补贴资金“一卡通”',
    shortName: '一卡通',
    policyName: '《惠民惠农财政补贴资金一卡通监督指引》',
    policyCode: '财监卡〔2025〕11号',
    policyClause: '对补贴对象、资金发放、到账核验、异常整改和责任闭环开展监督评价。',
    scoreShift: -4,
    dimensions: ['补贴清单与对象识别', '资金发放与到账核验', '异常拦截与资金安全', '政策效果与群众反馈', '信息公开与穿透监测', '监督整改与责任闭环'],
    basis: ['补贴对象精准', '资金及时到账', '异常问题闭环'],
    indicatorSeeds: [
      ['补贴对象识别准确率', '补贴清单完整率', '重复享受拦截率'],
      ['补贴资金发放及时率', '到账核验完成率', '失败退回处置率'],
      ['异常发放拦截率', '资金安全风险命中率', '问题资金追回率'],
      ['群众投诉下降率', '政策触达率', '补贴获得感达标率'],
      ['补贴信息公开完整率', '发放链路穿透监测覆盖率', '重大事项公开及时率'],
      ['监督问题整改完成率', '整改逾期率', '责任追究落实率'],
    ],
  },
  'yearly/tax-preferential': {
    title: '违规出台财税优惠政策招商引资',
    shortName: '招商优惠',
    policyName: '《违规财税优惠政策清理整改监督指引》',
    policyCode: '财监优〔2025〕13号',
    policyClause: '对违规优惠政策识别、清理、整改、追责和防新增开展监督评价。',
    scoreShift: -9,
    dimensions: ['政策清单与违规识别', '协议合同与兑现核验', '清理整改与资金追缴', '防新增与制度约束', '信息公开与穿透监测', '监督整改与责任闭环'],
    basis: ['违规政策识别完整', '存量协议清理到位', '新增违规有效遏制'],
    indicatorSeeds: [
      ['优惠政策清单完整率', '违规条款识别率', '招商协议核查覆盖率'],
      ['违规兑现事项核验率', '合同协议清理率', '财政补贴异常识别率'],
      ['违规优惠清理完成率', '问题资金追缴到位率', '整改进度更新及时率'],
      ['新增违规优惠发生数', '制度约束修订完成率', '风险预警命中率'],
      ['政策公开完整率', '资金穿透监测覆盖率', '重大事项公开及时率'],
      ['监督问题整改完成率', '整改逾期率', '责任追究落实率'],
    ],
  },
};

const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

export const getKeyAreaTopicProfile = (topicKey: string): KeyAreaTopicProfile => {
  return KEY_AREA_TOPIC_PROFILES[topicKey] || KEY_AREA_TOPIC_PROFILES['yearly/local-debt'];
};

export const getKeyAreaAnalysisData = (topicKey: string): Level1_Dimension[] => {
  const profile = getKeyAreaTopicProfile(topicKey);
  if (topicKey === 'yearly/local-debt') return localDebtAnalysisData;

  return localDebtAnalysisData.map((dimension, dimensionIndex) => {
    const dimensionScore = clampScore(dimension.score + profile.scoreShift + (dimensionIndex % 2 === 0 ? 2 : -1));
    return {
      ...dimension,
      id: `${topicKey || 'key-area'}-dim-${dimensionIndex + 1}`,
      name: profile.dimensions[dimensionIndex] || dimension.name,
      score: dimensionScore,
      status: getStructureStatus(dimensionScore),
      description: `${profile.title}评价体系下的${profile.dimensions[dimensionIndex] || dimension.name}，用于判断该主题专项监督是否满足规则定义要求。当前仅展示规则得分、权重与政策依据。`,
      judgementBasis: profile.basis,
      indicators: dimension.indicators.map((indicator, indicatorIndex) => {
        const indicatorScore = clampScore(indicator.score + profile.scoreShift + ((indicatorIndex % 3) - 1) * 3);
        const indicatorName = profile.indicatorSeeds[dimensionIndex]?.[indicatorIndex]
          || `${profile.shortName}${indicator.name.replace(/地方政府债务|债务|专项债|化债|隐性债务|违规举债/g, '')}`;
        const trend = indicator.detail.trend.map((value, trendIndex) => (
          clampScore(value + profile.scoreShift + ((trendIndex % 2 === 0) ? 1 : -1))
        ));
        return {
          ...indicator,
          id: `${topicKey || 'key-area'}-ind-${dimensionIndex + 1}-${indicatorIndex + 1}`,
          name: indicatorName,
          score: indicatorScore,
          result: getStructureStatus(indicatorScore),
          description: `${profile.title} - ${indicator.detail.indicatorGroup || '指标'}；当前仅展示定义口径与权重参考。`,
          detail: {
            ...indicator.detail,
            id: `${topicKey || 'key-area'}-detail-${dimensionIndex + 1}-${indicatorIndex + 1}`,
            name: indicatorName,
            definition: `${indicatorName}。计算公式沿用当前主题规则口径：${indicator.detail.definition.replace(/地方政府债务|债务|专项债|化债|隐性债务|违规举债/g, profile.shortName)}`,
            currentValue: indicator.detail.currentValue,
            standardValue: indicator.detail.standardValue,
            trend,
            suggestions: `${profile.title}需结合该指标规则口径、权重和政策依据进行核查，优先关注低分指标对应的整改链路。`,
            rules: [
              { name: '主题规则', context: profile.policyClause },
              { name: '权重参考', context: `当前指标权重：${indicator.weightValue || '待补充'}` },
              { name: '得分口径', context: indicator.detail.scoreFormula || '按当前主题评分区间映射规则得分。' },
            ],
            policyName: profile.policyName,
            policyCode: profile.policyCode,
            policyClause: profile.policyClause,
            pickReason: `该指标用于评价${profile.title}中“${profile.dimensions[dimensionIndex] || dimension.name}”的关键监督要求。`,
            indicatorGroup: profile.dimensions[dimensionIndex] || indicator.detail.indicatorGroup,
          },
        };
      }),
    };
  });
};
