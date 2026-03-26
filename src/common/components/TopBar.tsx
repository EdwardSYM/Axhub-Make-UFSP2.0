import React, { useState, useEffect } from 'react';

interface TopBarProps {
  title?: string;
  onNavigate: (path: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({ title = '财会监督系统', onNavigate }) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [searchExpanded, setSearchExpanded] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeMenu, setActiveMenu] = useState<string>('home');
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  // 菜单数据
  const dailyMenu = [
    {
      id: 'business_monitor',
      label: '业务监控',
      children: [
        { label: '预算执行监控', link: '/pages/topic-workbench2?topic=execution&category=daily' },
        { label: '预算编制监控', link: '/pages/topic-workbench2?topic=unitfund&category=daily' },
        { label: '指标管理监控', link: '/pages/topic-workbench2?topic=treasury&category=daily' },
        { label: '资产管理监控', link: '/pages/topic-workbench2?topic=assets&category=daily' },
        { label: '会计核算监控', link: '/pages/topic-workbench2?topic=accounting&category=daily' },
      ]
    },
    {
      id: 'special_monitor',
      label: '专题监控',
      children: [
        { label: '工资监控', link: '/pages/topic-workbench2?topic=salary&category=daily' },
        { label: '三保监控', link: '/pages/topic-workbench2?topic=sanbao&category=daily' },
        { label: '三公监控', link: '/pages/topic-workbench2?topic=sangong&category=daily' },
        { label: '一卡通监控', link: '/pages/topic-workbench2?topic=yikatong&category=daily' },
      ]
    }
  ];

  const specialMenu = [
    {
      id: 'key_area_rectify',
      label: '重点领域整改',
      children: [
        { label: '地方政府债务', link: '/pages/topic-workbench2?topic=yearly/local-debt&category=special' },
        { label: '高标准农田建设资金使用管理', link: '/pages/topic-workbench2?topic=yearly/farmland-fund&category=special' },
        { label: '行政事业单位国有资产处置管理', link: '/pages/topic-workbench2?topic=yearly/state-assets&category=special' },
        { label: '减税降费政策落实', link: '/pages/topic-workbench2?topic=yearly/tax-reduction&category=special' },
        { label: '违规返还财政收入', link: '/pages/topic-workbench2?topic=yearly/refund-revenue&category=special' },
        { label: '基层"三保"', link: '/pages/topic-workbench2?topic=yearly/sanbao-basic&category=special' },
        { label: '财政暂付款管理', link: '/pages/topic-workbench2?topic=yearly/temporary-payment&category=special' },
        { label: '财政收入虚收空转', link: '/pages/topic-workbench2?topic=yearly/false-revenue&category=special' },
        { label: '惠民惠农财政补贴资金"一卡通"', link: '/pages/topic-workbench2?topic=yearly/one-card&category=special' },
        { label: '违规出台财税优惠政策招商引资', link: '/pages/topic-workbench2?topic=yearly/tax-preferential&category=special' },
      ]
    },
    {
      id: 'special_check',
      label: '专项检查',
      children: [
        { label: '会计信息质量检查', link: '/pages/topic-workbench2?topic=yearly/state-assets&category=special' },
        { label: '执业质量检查', link: '/pages/topic-workbench2?topic=yearly/tax-reduction&category=special' },
      ]
    },
    {
      id: 'audit_rectify',
      label: '审计问题整改',
      children: [
        { label: '专项资金审计', link: '/pages/topic-workbench2?topic=audit&category=special' },
      ]
    },
    {
      id: 'inspection_rectify',
      label: '巡视问题整改',
      children: [
        { label: '省委巡视整改项', link: '/pages/topic-workbench2?topic=inspect&category=special' },
        { label: '市级巡察反馈项', link: '/pages/topic-workbench2?topic=inspect&category=special' },
        { label: '其他巡视整改项', link: '/pages/topic-workbench2?topic=inspect&category=special' },
      ]
    },
  ];

  const evaluationMenu = [
    { label: '财会监督考评', link: '/pages/topic-workbench2?topic=eval-finance&category=evaluation' },
    { label: '财政内控考评', link: '/pages/topic-workbench2?topic=eval-internal&category=evaluation' },
  ];

  const supportMenu = [
    { label: '法制库', link: '/resources/law' },
    { label: '规则库', link: '/resources/rule' },
    { label: '机构库', link: '/resources/org' },
    { label: '人才库', link: '/resources/talent' },
    { label: '案例库', link: '/resources/case' },
    { label: '档案 / 数据', link: '/resources/archive' },
  ];

  const extensionMenu = [
    { label: '全省信息共享', link: '/prototypes/extension/share' },
    { label: '即席分析', link: '/prototypes/extension/analysis' },
    { label: '统计看板', link: '/prototypes/extension/dashboard' },
  ];

  // 解析当前URL，确定激活的菜单
  useEffect(() => {
    const currentUrl = window.location.href;
    
    // 检查是否是首页
    if (currentUrl.includes('/home') || currentUrl.includes('/fiscal-supervision-home2')) {
      setActiveMenu('home');
      setActiveSubMenu(null);
      return;
    }
    
    // 检查是否是专项监督
    if (currentUrl.includes('category=special')) {
      setActiveMenu('special');
      // 提取topic参数
      const urlParams = new URLSearchParams(currentUrl.split('?')[1] || '');
      const topic = urlParams.get('topic');
      
      // 先检查是否是直接点击二级标题进入的
      if (topic) {
        for (const menuItem of specialMenu) {
          if (menuItem.id === topic) {
            setActiveSubMenu(menuItem.label);
            return;
          }
        }
      }
      
      // 再检查是否是点击子菜单进入的
      for (const menuItem of specialMenu) {
        if (menuItem.children) {
          for (const child of menuItem.children) {
            // 修正路径匹配，忽略 /pages/ 或 /prototypes/ 前缀
            const childPath = child.link.replace('/pages/', '');
            if (currentUrl.includes(childPath)) {
              setActiveSubMenu(menuItem.label);
              return;
            }
          }
        }
      }
      return;
    }
    
    // 检查是否是日常监督
    if (currentUrl.includes('category=daily')) {
      setActiveMenu('daily');
      // 提取topic参数
      const urlParams = new URLSearchParams(currentUrl.split('?')[1] || '');
      const topic = urlParams.get('topic');
      
      // 先检查是否是直接点击二级标题进入的
      if (topic) {
        for (const menuItem of dailyMenu) {
          if (menuItem.id === topic) {
            setActiveSubMenu(menuItem.label);
            return;
          }
        }
      }
      
      // 再检查是否是点击子菜单进入的
      for (const menuItem of dailyMenu) {
        if (menuItem.children) {
          for (const child of menuItem.children) {
            // 修正路径匹配，忽略 /pages/ 或 /prototypes/ 前缀
            const childPath = child.link.replace('/pages/', '');
            if (currentUrl.includes(childPath)) {
              setActiveSubMenu(menuItem.label);
              return;
            }
          }
        }
      }
      return;
    }
    
    // 检查是否是财会考评
    if (currentUrl.includes('category=evaluation')) {
      setActiveMenu('evaluation');
      setActiveSubMenu(null);
      return;
    }
    
    // 检查是否是基础支撑
    if (currentUrl.includes('/resources/')) {
      setActiveMenu('support');
      setActiveSubMenu(null);
      return;
    }
    
    // 检查是否是扩展功能
    if (currentUrl.includes('/extension/')) {
      setActiveMenu('extension');
      setActiveSubMenu(null);
      return;
    }
  }, []);

  // 处理导航
  const handleNavigate = (path: string) => {
    // 修正路径，将 /pages/ 替换为 /prototypes/
    const correctedPath = path.replace('/pages/', '/prototypes/');
    onNavigate(correctedPath);
    try {
      window.location.href = correctedPath;
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 shadow-md">
      {/* 单行顶栏：品牌 + 导航 + 搜索 + 分组/快捷 + 工具 */}
      <div className="bg-gradient-to-r from-[#2A487E] to-[#4A6FA8] text-white/98">
        <div className="max-w-[1920px] mx-auto px-4 h-16 flex items-center gap-8">
          {/* Brand */}
          <div className="flex items-center gap-3 mr-4">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className="text-lg font-bold tracking-wide">{title}</div>
          </div>
          {/* Main Nav */}
          <nav className="hidden lg:flex items-center gap-4">
            <button
              type="button"
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeMenu === 'home' ? 'bg-white/25 shadow-md' : 'hover:bg-white/15 hover:shadow-sm'}`}
              onClick={() => handleNavigate('/pages/fiscal-supervision-home2')}
            >
              首页
            </button>
            <div
              className="relative group"
            >
              <button
                type="button"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeMenu === 'special' || openMenu === 'special' ? 'bg-white/25 shadow-md' : 'hover:bg-white/15 hover:shadow-sm'}`}
                onMouseEnter={() => setOpenMenu('special')}
              >
                专项监督
              </button>
              {openMenu === 'special' ? (
                <div 
                  className="topbar-menu absolute left-0 top-full mt-2 bg-white/98 backdrop-blur-md text-slate-800 rounded-xl shadow-xl z-50 min-w-[260px] py-3 transition-all duration-300 transform origin-top-right scale-95 opacity-0 animate-fade-in"
                  onMouseEnter={() => setOpenMenu('special')}
                  onMouseLeave={(e) => {
                    // 检查鼠标是否移动到了二级菜单
                    const target = e.relatedTarget as HTMLElement;
                    if (!target || !target.closest('.topbar-submenu')) {
                      setOpenMenu(null);
                      setOpenSub(null);
                    }
                  }}
                >
                  {specialMenu.map(i => (
                    <div
                      key={i.label}
                      className="relative"
                      onMouseEnter={() => setOpenSub(i.children ? i.label : null)}
                      onMouseLeave={(e) => {
                        // 检查鼠标是否移动到了二级菜单
                        const target = e.relatedTarget as HTMLElement;
                        if (!target || !target.closest('.topbar-submenu')) {
                          setOpenSub(null);
                        }
                      }}
                    >
                      <button
                        type="button"
                        className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between rounded-lg transition-colors cursor-pointer ${activeSubMenu === i.label ? 'bg-slate-50 font-medium' : ''}`}
                        onClick={() => {
                          // 为二级标题创建对应的工作台链接
                          let workbenchLink = '';
                          if (i.id === 'key_area_rectify') {
                            // 重点领域整改跳转到专门的工作台
                            workbenchLink = `/prototypes/topic-workbench2-copy?topic=${i.id}&category=special`;
                          } else {
                            workbenchLink = `/prototypes/topic-workbench2?topic=${i.id}&category=special`;
                          }
                          handleNavigate(workbenchLink);
                        }}
                      >
                        <span className="text-sm">{i.label}</span>
                        {i.children ? <span className="text-slate-400 transition-transform group-hover:translate-x-1">›</span> : null}
                      </button>
                      {i.children && openSub === i.label ? (
                        <div 
                          className="topbar-submenu absolute left-full top-0 ml-2 bg-white/98 backdrop-blur-md text-slate-800 rounded-xl shadow-xl z-50 min-w-[280px] max-h-80 overflow-auto py-3 transition-all duration-300 transform origin-top-left scale-95 opacity-0 animate-fade-in"
                          onMouseEnter={() => setOpenSub(i.label)}
                          onMouseLeave={(e) => {
                            // 检查鼠标是否移动回了一级菜单
                            const target = e.relatedTarget as HTMLElement;
                            if (!target || !target.closest('.topbar-menu')) {
                              setOpenSub(null);
                              setOpenMenu(null);
                            }
                          }}
                        >
                          {i.children.map((c: any) => (
                            <button
                              key={c.link}
                              type="button"
                              onClick={() => {
                                let targetLink = c.link;
                                // 检查是否是重点领域整改下的业务主题
                                if (i.id === 'key_area_rectify') {
                                  // 替换链接为新的重点领域整改工作台
                                  targetLink = targetLink.replace('/pages/topic-workbench2', '/prototypes/topic-workbench2-copy');
                                }
                                handleNavigate(targetLink);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 rounded-lg transition-colors group"
                            >
                              <span className="text-sm group-hover:text-[#1456B8] group-hover:ml-1 transition-all">{c.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div
              className="relative group"
            >
              <button
                type="button"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeMenu === 'daily' || openMenu === 'daily' ? 'bg-white/25 shadow-md' : 'hover:bg-white/15 hover:shadow-sm'}`}
                onMouseEnter={() => setOpenMenu('daily')}
              >
                日常监督
              </button>
              {openMenu === 'daily' ? (
                <div 
                  className="topbar-menu absolute left-0 top-full mt-2 bg-white/98 backdrop-blur-md text-slate-800 rounded-xl shadow-xl z-50 min-w-[240px] py-3 transition-all duration-300 transform origin-top-right scale-95 opacity-0 animate-fade-in"
                  onMouseEnter={() => setOpenMenu('daily')}
                  onMouseLeave={(e) => {
                    // 检查鼠标是否移动到了二级菜单
                    const target = e.relatedTarget as HTMLElement;
                    if (!target || !target.closest('.topbar-submenu')) {
                      setOpenMenu(null);
                      setOpenSub(null);
                    }
                  }}
                >
                  {dailyMenu.map(i => (
                    <div
                      key={i.label}
                      className="relative"
                      onMouseEnter={() => setOpenSub(i.children ? i.label : null)}
                      onMouseLeave={(e) => {
                        // 检查鼠标是否移动到了二级菜单
                        const target = e.relatedTarget as HTMLElement;
                        if (!target || !target.closest('.topbar-submenu')) {
                          setOpenSub(null);
                        }
                      }}
                    >
                      <button
                        type="button"
                        className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between rounded-lg transition-colors cursor-pointer ${activeSubMenu === i.label ? 'bg-slate-50 font-medium' : ''}`}
                        onClick={() => {
                          // 为二级标题创建对应的工作台链接
                          const workbenchLink = `/prototypes/topic-workbench2?topic=${i.id}&category=daily`;
                          handleNavigate(workbenchLink);
                        }}
                      >
                        <span className="text-sm">{i.label}</span>
                        {i.children ? <span className="text-slate-400 transition-transform group-hover:translate-x-1">›</span> : null}
                      </button>
                      {i.children && openSub === i.label ? (
                        <div 
                          className="topbar-submenu absolute left-full top-0 ml-2 bg-white/98 backdrop-blur-md text-slate-800 rounded-xl shadow-xl z-50 min-w-[280px] max-h-80 overflow-auto py-3 transition-all duration-300 transform origin-top-left scale-95 opacity-0 animate-fade-in"
                          onMouseEnter={() => setOpenSub(i.label)}
                          onMouseLeave={(e) => {
                            // 检查鼠标是否移动回了一级菜单
                            const target = e.relatedTarget as HTMLElement;
                            if (!target || !target.closest('.topbar-menu')) {
                              setOpenSub(null);
                              setOpenMenu(null);
                            }
                          }}
                        >
                          {i.children.map((c: any) => (
                            <button
                              key={c.link}
                              type="button"
                              onClick={() => {
                                let targetLink = c.link;
                                // 检查是否是重点领域整改下的业务主题
                                if (i.id === 'key_area_rectify') {
                                  // 替换链接为新的重点领域整改工作台
                                  targetLink = targetLink.replace('/pages/topic-workbench2', '/prototypes/topic-workbench2-copy');
                                }
                                handleNavigate(targetLink);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 rounded-lg transition-colors group"
                            >
                              <span className="text-sm group-hover:text-[#1456B8] group-hover:ml-1 transition-all">{c.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div
              className="relative group"
            >
              <button
                type="button"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeMenu === 'evaluation' || openMenu === 'evaluation' ? 'bg-white/25 shadow-md' : 'hover:bg-white/15 hover:shadow-sm'}`}
                onMouseEnter={() => setOpenMenu('evaluation')}
              >
                财会考评
              </button>
              {openMenu === 'evaluation' ? (
                <div 
                  className="absolute left-0 top-full mt-2 bg-white/98 backdrop-blur-md text-slate-800 rounded-xl shadow-xl z-50 min-w-[240px] py-3 transition-all duration-300 transform origin-top-right scale-95 opacity-0 animate-fade-in"
                  onMouseEnter={() => setOpenMenu('evaluation')}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  {evaluationMenu.map(i => (
                    <button
                      key={i.link}
                      type="button"
                      onClick={() => handleNavigate(i.link)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 rounded-lg transition-colors group"
                    >
                      <span className="text-sm group-hover:text-[#1456B8] group-hover:ml-1 transition-all">{i.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div
              className="relative group"
            >
              <button
                type="button"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeMenu === 'support' || openMenu === 'support' ? 'bg-white/25 shadow-md' : 'hover:bg-white/15 hover:shadow-sm'}`}
                onMouseEnter={() => setOpenMenu('support')}
              >
                基础支撑
              </button>
              {openMenu === 'support' ? (
                <div 
                  className="absolute left-0 top-full mt-2 bg-white/98 backdrop-blur-md text-slate-800 rounded-xl shadow-xl z-50 min-w-[240px] py-3 transition-all duration-300 transform origin-top-right scale-95 opacity-0 animate-fade-in"
                  onMouseEnter={() => setOpenMenu('support')}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  {supportMenu.map(i => (
                    <button
                      key={i.link}
                      type="button"
                      onClick={() => handleNavigate(i.link)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 rounded-lg transition-colors group"
                    >
                      <span className="text-sm group-hover:text-[#1456B8] group-hover:ml-1 transition-all">{i.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div
              className="relative group"
            >
              <button
                type="button"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeMenu === 'extension' || openMenu === 'extension' ? 'bg-white/25 shadow-md' : 'hover:bg-white/15 hover:shadow-sm'}`}
                onMouseEnter={() => setOpenMenu('extension')}
              >
                扩展功能
              </button>
              {openMenu === 'extension' ? (
                <div 
                  className="absolute left-0 top-full mt-2 bg-white/98 backdrop-blur-md text-slate-800 rounded-xl shadow-xl z-50 min-w-[240px] py-3 transition-all duration-300 transform origin-top-right scale-95 opacity-0 animate-fade-in"
                  onMouseEnter={() => setOpenMenu('extension')}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  {extensionMenu.map(i => (
                    <button
                      key={i.link}
                      type="button"
                      onClick={() => handleNavigate(i.link)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 rounded-lg transition-colors group"
                    >
                      <span className="text-sm group-hover:text-[#1456B8] group-hover:ml-1 transition-all">{i.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>
          {/* Search */}
          <div className="flex-1 flex justify-end">
            <div className="flex items-center">
              {/* 搜索按钮 */}
              <div className="relative mr-4">
                <button 
                  type="button" 
                  className="relative p-2.5 rounded-full hover:bg-white/15 transition-all duration-300 z-10 flex items-center justify-center"
                  onClick={() => setSearchExpanded(!searchExpanded)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                </button>
                <div className={`absolute right-0 top-1/2 transform -translate-y-1/2 h-11 w-0 rounded-full bg-white/25 backdrop-blur-sm transition-all duration-300 ease-in-out ${searchExpanded ? 'w-72 opacity-100' : 'w-0 opacity-0'}`}>
                  <input 
                    type="text" 
                    placeholder="搜索主题 / 功能 / 规则" 
                    className="absolute right-0 top-0 h-full w-full pl-5 pr-12 rounded-full text-white text-sm placeholder-white/70 focus:outline-none flex items-center"
                    onFocus={(e) => e.target.select()}
                    onBlur={() => {
                      if (!searchInput) setSearchExpanded(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && !searchInput) setSearchExpanded(false);
                      if (e.key === 'Enter') {
                        // 执行搜索逻辑
                        console.log('Searching for:', searchInput);
                      }
                    }}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Utilities */}
          <div className="flex items-center gap-4">
            <button type="button" className="relative p-2.5 rounded-full hover:bg-white/15 transition-all duration-300 group flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white transition-transform duration-300 group-hover:scale-110">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            </button>
            <div className="flex items-center gap-3 pl-2">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#0F3D8A] font-bold shadow-lg hover:shadow-xl transition-all duration-300">张</div>
              <span className="text-sm hidden md:inline-block font-medium">张三</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;