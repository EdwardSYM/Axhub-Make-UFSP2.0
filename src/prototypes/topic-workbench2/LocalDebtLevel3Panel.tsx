import React from 'react';
import type { Level2_Indicator } from './data';

type Props = {
  indicator: Level2_Indicator;
  siblings: Level2_Indicator[];
  onSelectIndicator: (indicator: Level2_Indicator) => void;
  onBack: () => void;
};

export default function LocalDebtLevel3Panel({ indicator, siblings, onSelectIndicator }: Props) {
  return (
    <div className="col-span-5 bg-white rounded-2xl px-4 pt-3 pb-4 flex flex-col min-h-0">
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <div className="px-4 py-3 flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-[14px] bg-[#4E73C8] rounded-full"></div>
              <div className="text-[14px] font-bold text-slate-700">指标切换</div>
            </div>
            <div className="text-[10px] text-slate-400">同二级指标切换</div>
          </div>
          <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
            {siblings.map((item) => {
              const active = item.id === indicator.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectIndicator(item)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left transition-all ${
                    active ? 'bg-blue-50/50' : 'bg-[#FAFBFC] hover:bg-blue-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-800">{item.name}</div>
                      <div className="mt-1 text-[10px] text-slate-500 truncate">权重 {item.detail.weightValue || item.weightValue || '--'}</div>
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

        <div className="bg-[#FAFBFC] rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-slate-400">指标名称</span>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
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
            <div className="text-sm font-semibold text-slate-700">{indicator.name}</div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 mb-0.5">规则得分</div>
              <div className="text-2xl font-bold text-[#4E73C8]">{indicator.score}分</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 mb-0.5">权重</div>
              <div className="text-2xl font-bold text-[#4E73C8]">{indicator.detail.weightValue || indicator.weightValue || '--'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
