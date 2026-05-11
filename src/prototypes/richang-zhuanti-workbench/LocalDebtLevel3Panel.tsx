import React from 'react';
import type { Level2_Indicator } from './data';

type Props = {
  indicator: Level2_Indicator;
  siblings: Level2_Indicator[];
  onSelectIndicator: (indicator: Level2_Indicator) => void;
  onBack: () => void;
};

export default function LocalDebtLevel3Panel({ indicator, siblings, onSelectIndicator, onBack }: Props) {
  return (
    <div className="col-span-5 rounded-[22px] bg-[linear-gradient(180deg,#F7FAFF_0%,#F9FBFF_100%)] px-4 pt-3 pb-4 shadow-sm flex flex-col min-h-0 overflow-hidden">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-700">{indicator.name}</div>
        </div>
        <button
          type="button"
          className="px-2.5 py-1 text-[10px] font-semibold text-[#4E73C8] bg-white rounded-full shadow-sm hover:bg-blue-50 transition-colors"
          onClick={onBack}
        >
          返回一级总览
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <div className="bg-white rounded-[20px] px-4 py-4 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
              <div className="text-[14px] font-bold text-slate-700">指标切换</div>
            </div>
            <div className="text-[10px] text-slate-400">同二级指标切换</div>
          </div>
          <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
            {siblings.map((item) => {
              const active = item.id === indicator.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectIndicator(item)}
                  className={`w-full rounded-2xl px-3 py-2.5 text-left transition ${
                    active ? 'bg-[#EEF4FF] shadow-sm' : 'bg-slate-50/80 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-800">{item.name}</div>
                      <div className="mt-1 text-[10px] text-slate-500 truncate">权重 {item.detail.weightValue || item.weightValue || '待补充'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-[10px] font-semibold ${item.result === '良好' ? 'text-green-600' : item.result === '一般' ? 'text-amber-600' : 'text-red-600'}`}>
                        {item.result}
                      </div>
                      {!active && <div className="mt-1 text-[11px] font-bold text-[#4E73C8]">{item.score}分</div>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[linear-gradient(180deg,#FFFFFF_0%,#F6F9FF_100%)] rounded-[22px] px-5 py-5 shadow-[0_14px_34px_rgba(78,115,200,0.10)] min-h-[202px] flex flex-col">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">当前结果</span>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                    indicator.result === '良好'
                      ? 'bg-green-50 text-green-600'
                      : indicator.result === '一般'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {indicator.result}
                </span>
              </div>
              <div className="mt-3 flex items-end gap-2">
                <div
                  className="text-[42px] leading-none font-bold tracking-tight text-[#4E73C8] cursor-help"
                  title={`评分依据：${indicator.detail.scoreFormula || '待补充评分标准'}`}
                >
                  {indicator.score}分
                </div>
                <div className="pb-1 text-[11px] text-slate-400">规则得分</div>
              </div>
            </div>
            <div
              className="mt-6 w-[150px] shrink-0 rounded-[20px] bg-white/90 px-4 py-4 shadow-sm cursor-help"
              title={`权重说明：${indicator.detail.weightReason || '待补充设权原因'}`}
            >
              <div className="text-[10px] text-slate-400">权重</div>
              <div className="mt-2 text-[22px] leading-none font-bold text-slate-800">{indicator.detail.weightValue || indicator.weightValue || '待补充'}</div>
            </div>
          </div>
          <div className="mt-auto pt-4 text-xs leading-relaxed text-slate-600">
            当前只展示规则得分和指标权重；评分口径、指标阈值与政策依据在右侧对应模块查看。
          </div>
        </div>
      </div>
    </div>
  );
}
