/**
 * @name UFSP2.0业务页面可视化基线
 *
 * 参考资料：
 * - /rules/ufsp-page-governance.md
 * - /rules/confirmed-baselines.md
 * - /src/docs/业务页面设计规范.md
 * - /src/prototypes/problem-library-function-list
 * - /src/prototypes/case-library-ai
 */
import './style.css';
import React, { forwardRef, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
} from 'lucide-react';
import TopBar from '../../common/components/TopBar';
import actionAddIcon from '../problem-library-function-list/icons/action-add.svg?raw';
import actionExportIcon from '../problem-library-function-list/icons/action-export.svg?raw';
import actionFilterIcon from '../problem-library-function-list/icons/action-filter.svg?raw';
import actionImportIcon from '../problem-library-function-list/icons/action-import.svg?raw';
import actionRefreshIcon from '../problem-library-function-list/icons/action-refresh.svg?raw';
import actionSettingsIcon from '../problem-library-function-list/icons/action-settings.svg?raw';
import editIcon from '../problem-library-function-list/icons/edit.svg?raw';
import ledgerBookIcon from '../problem-library-function-list/icons/ledger-book.svg?raw';
import passIcon from '../problem-library-function-list/icons/pass.svg?raw';
import searchIcon from '../problem-library-function-list/icons/search.svg?raw';
import uploadIcon from '../problem-library-function-list/icons/upload.svg?raw';
import verifyIcon from '../problem-library-function-list/icons/verify.svg?raw';
import workbenchIcon from '../problem-library-function-list/icons/workbench.svg?raw';

type PageMode = 'list' | 'form';
type Lifecycle = 'pending' | 'stored' | 'rejected' | 'disabled' | 'all';

type CaseRow = {
  id: string;
  title: string;
  source: string;
  status: string;
  importedAt: string;
};

const rows: CaseRow[] = [
  {
    id: 'CASE-2026-001',
    title: '专项债券资金绩效目标设置不完整案例',
    source: '日常监督形成',
    status: '待入库',
    importedAt: '2026-07-14 10:24',
  },
  {
    id: 'CASE-2026-002',
    title: '政府采购合同履约资料缺失整改案例',
    source: '专项监督形成',
    status: '待入库',
    importedAt: '2026-07-14 09:10',
  },
  {
    id: 'CASE-2026-003',
    title: '预算执行进度异常提醒处置案例',
    source: '日常监督形成',
    status: '待入库',
    importedAt: '2026-07-15 09:05',
  },
  {
    id: 'CASE-2026-004',
    title: '财政暂付款长期未清理问题整改案例',
    source: '上级下发',
    status: '待入库',
    importedAt: '2026-07-16 14:20',
  },
];

const tabs: Array<{ key: Lifecycle; label: string; count: number }> = [
  { key: 'pending', label: '待入库', count: 4 },
  { key: 'stored', label: '已入库', count: 2 },
  { key: 'rejected', label: '不入库', count: 1 },
  { key: 'disabled', label: '已停用', count: 1 },
  { key: 'all', label: '全部', count: 8 },
];

function SvgIcon({
  source,
  size = 14,
  className = '',
}: {
  source: string;
  size?: number;
  className?: string;
}) {
  const html = useMemo(
    () =>
      source
        .replace(/\s(width|height)="[^"]*"/g, '')
        .replace('<svg', '<svg width="100%" height="100%" aria-hidden="true" focusable="false"'),
    [source],
  );

  return (
    <span
      className={`ufsp-baseline-svg ${className}`.trim()}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function FeatureSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const items = [
    { label: '一般案例管理', icon: ledgerBookIcon, active: true },
    { label: '案例聚类分析', icon: verifyIcon },
    { label: '典型案例管理', icon: passIcon, parent: true },
    { label: '申请', icon: editIcon, child: true },
    { label: '审核', icon: passIcon, child: true },
    { label: '案例采集管理', icon: uploadIcon },
    { label: '案例标签管理', icon: workbenchIcon },
  ];

  return (
    <aside className={`ufsp-baseline-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="ufsp-baseline-sidebar-head">
        <div className="ufsp-baseline-brand">
          <SvgIcon source={ledgerBookIcon} size={30} className="ufsp-baseline-brand-icon" />
          {!collapsed && (
            <div className="ufsp-baseline-brand-text">
              <strong>案例库</strong>
              <span>AI改造</span>
            </div>
          )}
        </div>
        <button
          className="ufsp-baseline-sidebar-toggle"
          type="button"
          aria-label={collapsed ? '展开系统功能菜单' : '收起系统功能菜单'}
          onClick={onToggle}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <nav className="ufsp-baseline-nav" aria-label="系统功能菜单">
        {items.map((item) => (
          <button
            className={[
              'ufsp-baseline-nav-item',
              item.active ? 'is-active' : '',
              item.child ? 'is-child' : '',
              item.parent ? 'is-parent' : '',
            ].filter(Boolean).join(' ')}
            type="button"
            key={item.label}
            title={collapsed ? item.label : undefined}
          >
            <span className="ufsp-baseline-nav-icon">
              <SvgIcon source={item.icon} size={20} />
            </span>
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.parent && <ChevronDown className="ufsp-baseline-nav-arrow" size={14} />}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function BusinessTree({
  collapsed,
  selected,
  onToggle,
  onSelect,
}: {
  collapsed: boolean;
  selected: string;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  const sources = [
    ['日常监督形成', '2'],
    ['专项监督形成', '1'],
    ['上级下发', '1'],
    ['外部公开案例', '0'],
    ['其他来源', '0'],
  ];

  return (
    <aside className={`ufsp-baseline-tree ${collapsed ? 'is-collapsed' : ''}`} aria-label="业务分类树">
      <div className="ufsp-baseline-tree-inner">
        <label className="ufsp-baseline-search ufsp-baseline-tree-search">
          <input type="text" placeholder="请输入" />
          <SvgIcon source={searchIcon} size={14} />
        </label>
        <div className="ufsp-baseline-tree-list">
          <button className="ufsp-baseline-tree-row is-root" type="button">
            <ChevronDown size={14} />
            <FolderOpen size={15} />
            <span>2026年度</span>
            <em>4</em>
          </button>
          {sources.map(([label, count]) => (
            <button
              className={`ufsp-baseline-tree-row is-leaf ${selected === label ? 'is-active' : ''}`}
              type="button"
              key={label}
              onClick={() => onSelect(label)}
            >
              <span className="ufsp-baseline-tree-indent" />
              <Folder size={14} />
              <span>{label}</span>
              <em>{count}</em>
            </button>
          ))}
        </div>
      </div>
      <button
        className="ufsp-baseline-tree-toggle"
        type="button"
        aria-label={collapsed ? '展开业务分类树' : '收起业务分类树'}
        onClick={onToggle}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}

function Toolbar({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="ufsp-baseline-toolbar">
      <div className="ufsp-baseline-toolbar-left">
        <button className="ufsp-baseline-btn is-primary" type="button" onClick={onAdd}>
          <SvgIcon source={actionAddIcon} />
          新增
        </button>
        <button className="ufsp-baseline-btn is-secondary" type="button">
          <SvgIcon source={actionImportIcon} />
          导入
        </button>
        <button className="ufsp-baseline-btn is-secondary" type="button">
          <SvgIcon source={actionExportIcon} />
          导出
        </button>
        <button className="ufsp-baseline-btn is-secondary" type="button">
          <Check size={14} />
          批量入库
        </button>
      </div>
      <div className="ufsp-baseline-toolbar-right">
        <label className="ufsp-baseline-search ufsp-baseline-filter-input">
          <input type="text" placeholder="请输入" />
        </label>
        <button className="ufsp-baseline-icon-btn is-primary" type="button" aria-label="查询">
          <SvgIcon source={searchIcon} />
        </button>
        <button className="ufsp-baseline-icon-btn is-secondary" type="button" aria-label="刷新">
          <SvgIcon source={actionRefreshIcon} />
        </button>
        <button className="ufsp-baseline-icon-btn is-secondary" type="button" aria-label="筛选">
          <SvgIcon source={actionFilterIcon} />
        </button>
        <button className="ufsp-baseline-btn is-secondary" type="button">查询方案</button>
        <button className="ufsp-baseline-icon-btn is-secondary" type="button" aria-label="列设置">
          <SvgIcon source={actionSettingsIcon} />
        </button>
      </div>
    </div>
  );
}

function CaseTable({
  selectedRows,
  onSelect,
}: {
  selectedRows: string[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="ufsp-baseline-table-scroll">
      <table className="ufsp-baseline-table">
        <colgroup>
          <col style={{ width: 42 }} />
          <col />
          <col style={{ width: 190 }} />
          <col style={{ width: 140 }} />
          <col style={{ width: 180 }} />
          <col style={{ width: 190 }} />
        </colgroup>
        <thead>
          <tr>
            <th><input type="checkbox" aria-label="全选" /></th>
            <th>案例标题</th>
            <th>来源类型</th>
            <th>入库状态</th>
            <th>导入时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className={selectedRows.includes(row.id) ? 'is-selected' : ''} key={row.id}>
              <td className="is-center">
                <input
                  type="checkbox"
                  checked={selectedRows.includes(row.id)}
                  aria-label={`选择${row.title}`}
                  onChange={() => onSelect(row.id)}
                />
              </td>
              <td className="is-primary-field" title={row.title}>{row.title}</td>
              <td className="is-center"><span className="ufsp-baseline-soft-tag">{row.source}</span></td>
              <td className="is-center"><span className="ufsp-baseline-status is-pending">{row.status}</span></td>
              <td className="is-center">{row.importedAt}</td>
              <td className="is-center">
                <button className="ufsp-baseline-link" type="button">处理</button>
                <button className="ufsp-baseline-link" type="button">来源详情</button>
                <button className="ufsp-baseline-link" type="button">不入库</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListPage({ onAdd }: { onAdd: () => void }) {
  const [lifecycle, setLifecycle] = useState<Lifecycle>('pending');
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [selectedSource, setSelectedSource] = useState('日常监督形成');
  const [selectedRows, setSelectedRows] = useState<string[]>([rows[0].id, rows[1].id]);

  function toggleRow(id: string) {
    setSelectedRows((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <section className="ufsp-baseline-business-panel">
      <div className="ufsp-baseline-tabs">
        {tabs.map((tab) => (
          <button
            className={lifecycle === tab.key ? 'is-active' : ''}
            type="button"
            key={tab.key}
            onClick={() => setLifecycle(tab.key)}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      <div className={`ufsp-baseline-list-content ${treeCollapsed ? 'is-tree-collapsed' : ''}`}>
        <BusinessTree
          collapsed={treeCollapsed}
          selected={selectedSource}
          onToggle={() => setTreeCollapsed((value) => !value)}
          onSelect={setSelectedSource}
        />
        <div className="ufsp-baseline-list-main">
          <Toolbar onAdd={onAdd} />
          <div className="ufsp-baseline-selection-note">
            <span>当前选择 {selectedRows.length} 条待入库案例</span>
            <span>当前分类：{selectedSource}</span>
          </div>
          <CaseTable selectedRows={selectedRows} onSelect={toggleRow} />
          <div className="ufsp-baseline-pagination">
            <span className="ufsp-baseline-page-total">共 4 条</span>
            <button className="ufsp-baseline-page-btn" type="button" aria-label="上一页"><ChevronLeft size={14} /></button>
            <button className="ufsp-baseline-page-btn is-active" type="button">1</button>
            <button className="ufsp-baseline-page-btn" type="button" aria-label="下一页"><ChevronRight size={14} /></button>
            <button className="ufsp-baseline-page-size" type="button">20 条/页 <ChevronDown size={14} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FormField({
  label,
  required,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`ufsp-baseline-field ${className}`.trim()}>
      <span>{required && <em>*</em>}{label}</span>
      {children}
    </label>
  );
}

function FormPage({ onBack, onSave }: { onBack: () => void; onSave: () => void }) {
  return (
    <section className="ufsp-baseline-business-panel ufsp-baseline-form-page">
      <header className="ufsp-baseline-form-head">
        <div className="ufsp-baseline-form-title">
          <button className="ufsp-baseline-form-back" type="button" onClick={onBack} aria-label="返回列表">
            <ChevronLeft size={16} />
          </button>
          <strong>一般案例管理 / 新增</strong>
        </div>
        <div className="ufsp-baseline-form-actions">
          <button className="ufsp-baseline-btn is-primary" type="button" onClick={onSave}>保存</button>
        </div>
      </header>
      <div className="ufsp-baseline-form-body">
        <section className="ufsp-baseline-form-section">
          <h2>来源选择</h2>
          <div className="ufsp-baseline-form-grid">
            <FormField label="来源类型" required>
              <select defaultValue="日常监督形成">
                <option>日常监督形成</option>
                <option>专项监督形成</option>
                <option>上级下发</option>
              </select>
            </FormField>
          </div>
        </section>
        <section className="ufsp-baseline-form-section">
          <h2>来源信息</h2>
          <div className="ufsp-baseline-form-grid">
            <FormField label="关联问题" className="is-span-2">
              <div className="ufsp-baseline-field-combo">
                <input type="text" placeholder="请选择关联问题" readOnly />
                <button className="ufsp-baseline-btn is-secondary" type="button">选择</button>
              </div>
            </FormField>
          </div>
        </section>
        <section className="ufsp-baseline-form-section">
          <h2>案例信息</h2>
          <div className="ufsp-baseline-form-grid">
            <FormField label="案例标题" required>
              <input type="text" placeholder="请输入" autoFocus />
            </FormField>
            <FormField label="所属地区">
              <select defaultValue="">
                <option value="" disabled>请选择</option>
                <option>省本级</option>
              </select>
            </FormField>
            <FormField label="发生时间">
              <input type="text" placeholder="请选择" />
            </FormField>
            <FormField label="涉及主体">
              <input type="text" placeholder="请输入" />
            </FormField>
            <FormField label="案例描述" required className="is-span-4">
              <div className="ufsp-baseline-textarea-wrap">
                <textarea placeholder="请输入案例描述" />
                <span>0 / 2000</span>
              </div>
            </FormField>
            <FormField label="案例标签" className="is-span-4">
              <div className="ufsp-baseline-tag-input">
                <span>预算执行</span>
                <span>进度监控</span>
                <span className="is-placeholder">请选择标签</span>
              </div>
            </FormField>
            <FormField label="备注" className="is-span-4">
              <div className="ufsp-baseline-textarea-wrap is-compact">
                <textarea placeholder="请输入" />
                <span>0 / 500</span>
              </div>
            </FormField>
          </div>
        </section>
        <section className="ufsp-baseline-form-section">
          <h2>材料附件</h2>
          <div className="ufsp-baseline-attachment-empty">
            <FileText size={18} />
            <span>暂无数据</span>
            <button className="ufsp-baseline-btn is-secondary" type="button">
              <SvgIcon source={uploadIcon} />
              上传附件
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

const Component = forwardRef<unknown, Record<string, unknown>>((_props, _ref) => {
  const [pageMode, setPageMode] = useState<PageMode>('list');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notice, setNotice] = useState('');

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 1800);
  }

  return (
    <div className="ufsp-baseline-page">
      <TopBar title="财会监督系统" onNavigate={() => undefined} />
      <main className="ufsp-baseline-workspace">
        <FeatureSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((value) => !value)}
        />
        <div className="ufsp-baseline-business-shell">
          {pageMode === 'list' ? (
            <ListPage onAdd={() => setPageMode('form')} />
          ) : (
            <FormPage
              onBack={() => setPageMode('list')}
              onSave={() => {
                showNotice('已模拟保存案例');
                setPageMode('list');
              }}
            />
          )}
        </div>
      </main>
      {notice && <div className="ufsp-baseline-notice">{notice}</div>}
    </div>
  );
});

export default Component;
