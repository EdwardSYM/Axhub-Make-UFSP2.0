/**
 * @name 主题分析
 */
import './style.css';
import '../../themes/ufsp-sky/globals.css';
import React, { useState } from 'react';
import TopBar from '../../common/components/TopBar';

const ThemeAnalysis: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('global');

  const handleNavigate = (href: string) => {
    try {
      window.location.href = href;
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="财会监督系统" onNavigate={handleNavigate} />
      
      <div className="max-w-[1920px] mx-auto px-4 py-5">
        <div className="bg-card rounded-xl shadow-sm">
          <div className="p-5 border-b border-border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-[3px] h-[18px] bg-[#4E73C8] rounded-full"></div>
                <h1 className="text-xl font-bold text-foreground">主题分析</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">统计口径：</span>
                <select className="px-3 py-1.5 text-sm bg-background border-none rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option>月度</option>
                  <option>季度</option>
                  <option>年度</option>
                </select>
                <select className="px-3 py-1.5 text-sm bg-background border-none rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option>2026年4月</option>
                  <option>2026年3月</option>
                  <option>2026年2月</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="p-5">
            <div className="text-center py-20">
              <div className="text-muted-foreground text-lg">页面内容待补充</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeAnalysis;