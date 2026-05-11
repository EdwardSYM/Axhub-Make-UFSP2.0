import React, { useState, useEffect, useRef } from 'react';

interface TopBarProps {
  title?: string;
  onNavigate: (path: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({ title = '财会监督系统', onNavigate }) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [searchExpanded, setSearchExpanded] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [activeMenu, setActiveMenu] = useState<string>('home');
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 热门搜索建议
  const hotSearches = [
    { label: '预算执行监控', category: '日常监督' },
    { label: '地方政府债务', category: '专项监督' },
    { label: '三保监控', category: '日常监督' },
    { label: '会计信息质量检查', category: '专项检查' },
    { label: '内控考评', category: '财会考评' },
  ];

  // 消息通知数据
  const notifications = [
    { id: 1, type: 'warning', title: '高标准农田建设资金异常', time: '3分钟前', read: false, content: '检测到3笔大额异常支出，请及时核查' },
    { id: 2, type: 'info', title: '月度考评任务已下发', time: '15分钟前', read: false, content: '2026年5月财会监督考评任务已下发至各部门' },
    { id: 3, type: 'success', title: '整改任务已通过审核', time: '1小时前', read: true, content: '地方政府债务专项整改任务已通过审核' },
    { id: 4, type: 'info', title: '新政策法规发布', time: '2小时前', read: true, content: '关于加强财政资金管理的通知（财预〔2026〕15号）' },
    { id: 5, type: 'warning', title: '逾期整改提醒', time: '3小时前', read: true, content: '基层三保整改任务已逾期3天，请加快整改进度' },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  // 用户菜单数据
  const userMenuItems = [
    { icon: '👤', label: '个人中心', path: '/profile' },
    { icon: '⚙️', label: '账号设置', path: '/settings' },
    { icon: '🔔', label: '通知设置', path: '/notification-settings' },
    { icon: '❓', label: '帮助中心', path: '/help' },
  ];

  // 点击外部关闭搜索建议
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 菜单数据
  const dailyMenu = [
    {
      id: 'business_monitor',
      label: '业务监控',
      children: [
        { label: '预算执行监控', link: '/prototypes/richang-yewu-workbench?topic=execution&category=daily' },
        { label: '预算编制监控', link: '/prototypes/richang-yewu-workbench?topic=unitfund&category=daily' },
        { label: '指标管理监控', link: '/prototypes/richang-yewu-workbench?topic=treasury&category=daily' },
        { label: '资产管理监控', link: '/prototypes/richang-yewu-workbench?topic=assets&category=daily' },
        { label: '会计核算监控', link: '/prototypes/richang-yewu-workbench?topic=accounting&category=daily' },
      ]
    },
    {
      id: 'special_monitor',
      label: '专题监控',
      children: [
        { label: '工资监控', link: '/prototypes/richang-zhuanti-workbench?topic=salary&category=daily' },
        { label: '三保监控', link: '/prototypes/richang-zhuanti-workbench?topic=sanbao&category=daily' },
        { label: '三公监控', link: '/prototypes/richang-zhuanti-workbench?topic=sangong&category=daily' },
        { label: '一卡通监控', link: '/prototypes/richang-zhuanti-workbench?topic=yikatong&category=daily' },
      ]
    }
  ];

  const specialMenu = [
    {
      id: 'key_area_rectify',
      label: '重点领域整改',
      children: [
        { label: '地方政府债务', link: '/prototypes/topic-workbench2?topic=yearly/local-debt&category=special' },
        { label: '高标准农田建设资金使用管理', link: '/prototypes/topic-workbench2?topic=yearly/farmland-fund&category=special' },
        { label: '行政事业单位国有资产处置管理', link: '/prototypes/topic-workbench2?topic=yearly/state-assets&category=special' },
        { label: '减税降费政策落实', link: '/prototypes/topic-workbench2?topic=yearly/tax-reduction&category=special' },
        { label: '违规返还财政收入', link: '/prototypes/topic-workbench2?topic=yearly/refund-revenue&category=special' },
        { label: '基层"三保"', link: '/prototypes/topic-workbench2?topic=yearly/sanbao-basic&category=special' },
        { label: '财政暂付款管理', link: '/prototypes/topic-workbench2?topic=yearly/temporary-payment&category=special' },
        { label: '财政收入虚收空转', link: '/prototypes/topic-workbench2?topic=yearly/false-revenue&category=special' },
        { label: '惠民惠农财政补贴资金"一卡通"', link: '/prototypes/topic-workbench2?topic=yearly/one-card&category=special' },
        { label: '违规出台财税优惠政策招商引资', link: '/prototypes/topic-workbench2?topic=yearly/tax-preferential&category=special' },
      ]
    },
    {
      id: 'special_check',
      label: '专项检查',
      children: [
        { label: '会计信息质量检查', link: '/prototypes/topic-workbench2?topic=yearly/state-assets&category=special' },
        { label: '执业质量检查', link: '/prototypes/topic-workbench2?topic=yearly/tax-reduction&category=special' },
      ]
    },
    {
      id: 'audit_rectify',
      label: '审计问题整改',
      children: [
        { label: '专项资金审计', link: '/prototypes/topic-workbench2?topic=audit&category=special' },
      ]
    },
    {
      id: 'inspection_rectify',
      label: '巡视问题整改',
      children: [
        { label: '省委巡视整改项', link: '/prototypes/topic-workbench2?topic=inspect&category=special' },
        { label: '市级巡察反馈项', link: '/prototypes/topic-workbench2?topic=inspect&category=special' },
        { label: '其他巡视整改项', link: '/prototypes/topic-workbench2?topic=inspect&category=special' },
      ]
    },
  ];

  const evaluationMenu = [
    { label: '财会监督考评', link: '/prototypes/topic-workbench2?topic=eval-finance&category=evaluation' },
    { label: '财政内控考评', link: '/prototypes/topic-workbench2?topic=eval-internal&category=evaluation' },
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

  // 处理导航，保留旧 /pages 链接的兼容兜底。
  const handleNavigate = (path: string) => {
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
              onClick={() => handleNavigate('/prototypes/fiscal-supervision-home2')}
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
                          // 二级标题统一进入通用工作台主入口，具体主题由 topic 参数决定。
                          const workbenchLink = `/prototypes/topic-workbench2?topic=${i.id}&category=special`;
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
                                handleNavigate(c.link);
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
                          const basePath = i.id === 'special_monitor' ? '/prototypes/richang-zhuanti-workbench' : '/prototypes/richang-yewu-workbench';
                          const workbenchLink = `${basePath}?topic=${i.id}&category=daily`;
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
                                handleNavigate(c.link);
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
          <div className="flex-1 flex justify-end pr-0">
            <div className="flex items-center" ref={searchRef}>
              {/* 搜索按钮 */}
              <div className="relative">
                <button 
                  type="button" 
                  className={`relative p-2 rounded-full transition-all duration-300 z-10 flex items-center justify-center ${searchExpanded ? 'opacity-0 pointer-events-none' : 'hover:bg-white/15'}`}
                  onClick={() => setSearchExpanded(!searchExpanded)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                </button>
                <div className={`absolute right-0 top-1/2 transform -translate-y-1/2 transition-all duration-300 ease-out ${searchExpanded ? 'w-[360px] opacity-100' : 'w-0 opacity-0'}`}>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="搜索主题 / 功能 / 规则" 
                      className="w-full h-10 pl-4 pr-10 rounded-full text-sm bg-white shadow-md flex items-center"
                      onFocus={(e) => {
                        e.target.select();
                        setSearchFocused(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          if (!searchInput) setSearchExpanded(false);
                        }, 200);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setSearchExpanded(false);
                          setSearchInput('');
                        }
                        if (e.key === 'Enter' && searchInput) {
                          console.log('Searching for:', searchInput);
                          setSearchFocused(false);
                        }
                      }}
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                    <button 
                      type="button"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-[#1456B8] hover:bg-slate-100 rounded-full transition-all"
                      onClick={() => {
                        if (searchInput) {
                          console.log('Searching for:', searchInput);
                          setSearchFocused(false);
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                      </svg>
                    </button>
                    {/* 热门搜索建议 */}
                    {searchFocused && !searchInput && (
                      <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-xl py-3 overflow-hidden">
                        <div className="px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider">热门搜索</div>
                        <div className="space-y-1">
                          {hotSearches.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between group transition-colors"
                              onClick={() => {
                                setSearchInput(item.label);
                                console.log('Searching for:', item.label);
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
                                  <circle cx="11" cy="11" r="8"/>
                                  <path d="m21 21-4.35-4.35"/>
                                </svg>
                                <span className="text-sm text-slate-700 group-hover:text-[#1456B8] transition-colors">{item.label}</span>
                              </div>
                              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded group-hover:bg-[#EEF5FF] group-hover:text-[#1456B8] transition-colors">{item.category}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 搜索结果提示 */}
                    {searchFocused && searchInput && (
                      <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-xl py-3 overflow-hidden">
                        <div className="px-4 py-2 text-xs text-slate-400">
                          搜索 "<span className="text-[#1456B8] font-medium">{searchInput}</span>" 的结果
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          <button
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors border-t border-slate-100"
                            onClick={() => console.log('Navigate to search results')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#1456B8]">
                              <circle cx="11" cy="11" r="8"/>
                              <path d="m21 21-4.35-4.35"/>
                            </svg>
                            <span className="text-sm">查看全部 "{searchInput}" 相关结果</span>
                            <span className="ml-auto text-xs text-slate-400">›</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Utilities */}
          <div className="flex items-center gap-3">
            {/* 消息提醒 */}
            <div className="relative -ml-[20px]" ref={notificationRef}>
              <button 
                type="button" 
                className={`relative p-2.5 rounded-full transition-all duration-300 flex items-center justify-center ${showNotifications ? 'bg-white/30' : 'hover:bg-white/15'}`}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white transition-transform duration-300">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-lg animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* 消息通知面板 */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-3 w-[400px] bg-white rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                  {/* 面板头部 */}
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-slate-800">消息通知</h3>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                          {unreadCount} 条未读
                        </span>
                      )}
                    </div>
                    <button 
                      type="button"
                      className="text-xs text-[#1456B8] hover:text-[#0F3D8A] font-medium transition-colors"
                      onClick={() => {
                        // 标记全部已读
                      }}
                    >
                      全部已读
                    </button>
                  </div>
                  
                  {/* 消息列表 */}
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        className={`w-full text-left px-5 py-4 hover:bg-slate-50 transition-all last:border-0 ${!notification.read ? 'bg-blue-50/50' : ''}`}
                        onClick={() => console.log('View notification:', notification.id)}
                      >
                        <div className="flex gap-3">
                          {/* 类型图标 */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                            notification.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                            notification.type === 'success' ? 'bg-green-100 text-green-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {notification.type === 'warning' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                              </svg>
                            ) : notification.type === 'success' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="16" x2="12" y2="12"/>
                                <line x1="12" y1="8" x2="12.01" y2="8"/>
                              </svg>
                            )}
                          </div>
                          
                          {/* 消息内容 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className={`text-sm font-medium truncate ${!notification.read ? 'text-slate-800' : 'text-slate-600'}`}>
                                {notification.title}
                                {!notification.read && (
                                  <span className="ml-2 w-2 h-2 bg-[#1456B8] rounded-full inline-block align-middle"></span>
                                )}
                              </h4>
                              <span className="text-xs text-slate-400 whitespace-nowrap">{notification.time}</span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{notification.content}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* 面板底部 */}
                  <div className="px-5 py-3 bg-slate-50/50">
                    <button
                      type="button"
                      className="w-full py-2 text-sm text-[#1456B8] hover:text-[#0F3D8A] font-medium hover:bg-white/80 rounded-lg transition-all"
                      onClick={() => console.log('View all notifications')}
                    >
                      查看全部消息
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* 用户头像和菜单 */}
            <div className="relative" ref={userMenuRef}>
              <button 
                type="button" 
                className={`flex items-center gap-3 p-1.5 rounded-full transition-all duration-300 group ${showUserMenu ? 'bg-white/30' : 'hover:bg-white/15'}`}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {/* 用户头像 - 使用渐变背景和姓名首字 */}
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4A90D9] via-[#0F3D8A] to-[#1E5AA8] flex items-center justify-center text-white font-bold text-sm shadow-lg transition-all">
                    张
                  </div>
                  {/* 在线状态指示器 */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-sm"></div>
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-semibold text-white leading-tight group-hover:text-white/90 transition-colors">张三</span>
                  <span className="text-[10px] text-white/70 leading-tight">监督管理员</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/70 group-hover:text-white transition-colors hidden md:block">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              
              {/* 用户菜单面板 */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-3 w-64 bg-white rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                  {/* 用户信息区域 */}
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#4A90D9] via-[#0F3D8A] to-[#1E5AA8] flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        张
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-800">张三</h4>
                        <p className="text-xs text-slate-500 mt-0.5">监督管理员</p>
                        <p className="text-xs text-slate-400 mt-0.5">zhangsan@finance.gov.cn</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">在线</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">系统管理员</span>
                    </div>
                  </div>
                  
                  {/* 菜单项 */}
                  <div className="py-2">
                    {userMenuItems.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full text-left px-5 py-3 hover:bg-slate-50 flex items-center gap-3 group transition-colors"
                        onClick={() => {
                          console.log('Navigate to:', item.path);
                          setShowUserMenu(false);
                        }}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm text-slate-700 group-hover:text-[#1456B8] transition-colors">{item.label}</span>
                      </button>
                    ))}
                  </div>
                  
                  {/* 退出登录 */}
                  <div className="py-2">
                    <button
                      type="button"
                      className="w-full text-left px-5 py-3 hover:bg-red-50 flex items-center gap-3 group transition-colors"
                      onClick={() => console.log('Logout')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-red-500 transition-colors">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      <span className="text-sm text-slate-600 group-hover:text-red-500 transition-colors">退出登录</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
