
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
  rules: Array<{ name: string; context: string }>,
  regionalDistribution?: Array<{ name: string; value: number; status: 'good' | 'warning' | 'bad' }>
): Level3_IndicatorDetail => ({
  id,
  name,
  definition,
  currentValue,
  standardValue,
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
