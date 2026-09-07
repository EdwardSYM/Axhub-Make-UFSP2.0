import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, FolderTree, Link2, Search, Tag, X } from 'lucide-react';
import actionAddIconSvg from '../problem-library-function-list/icons/action-add.svg?raw';
import actionExportIconSvg from '../problem-library-function-list/icons/action-export.svg?raw';
import actionFilterIconSvg from '../problem-library-function-list/icons/action-filter.svg?raw';
import actionImportIconSvg from '../problem-library-function-list/icons/action-import.svg?raw';
import actionPassIconSvg from '../problem-library-function-list/icons/pass.svg?raw';
import actionRefreshIconSvg from '../problem-library-function-list/icons/action-refresh.svg?raw';
import actionSettingsIconSvg from '../problem-library-function-list/icons/action-settings.svg?raw';
import searchIconSvg from '../problem-library-function-list/icons/search.svg?raw';

import { useGovernance, updateGovernance, getGovernance, recordFeedback, newId, nowText, isDirectory, setCasePath, getCasePath, tagUsage, resolveCandidate, METADATA_GROUPS, METADATA_MODES, DOMAIN_NAMES, metadataField, resolveCaseSubjects, resolveCaseIssues, resolveCaseDecisions, type MetadataField, type MetadataEdit, type MetadataMode, type IngestionRow, type CaseIssue, type TagValue } from './governanceModel';

type NoticeProps = { onNotice: (message: string) => void; onNavigate?: (key: 'entry' | 'metadata' | 'tags', field?: string) => void };

function normalizeSvg(svg: string) {
  return svg.replace(/<\?xml[^>]*>/g, '').replace(/<!DOCTYPE[^>]*>/g, '').replace(/\s(width|height)="[^"]*"/g, '').replace(/\sfill="[^"]*"/g, ' fill="currentColor"').replace(/<svg\b([^>]*)>/, '<svg$1 aria-hidden="true" focusable="false">');
}

function RawIcon({ svg }: { svg: string }) {
  const html = useMemo(() => normalizeSvg(svg), [svg]);
  return <span className="ufsp-iconfont-box" dangerouslySetInnerHTML={{ __html: html }} />;
}

function StandardSearchTools({ onNotice, placeholder = '请输入', query = '', onQuery, onReset }: NoticeProps & { placeholder?: string; query?: string; onQuery?: (value: string) => void; onReset?: () => void }) {
  return <div className="case-toolbar-right">
    <label className="ufsp-search-box ufsp-filter-input"><input placeholder="请输入" aria-label={placeholder} value={query} onChange={event => onQuery?.(event.target.value)} /></label>
    <button className="ufsp-icon-btn ufsp-icon-btn-primary" title="查询" onClick={() => onQuery?.(query.trim())}><RawIcon svg={searchIconSvg} /></button>
    <button className="ufsp-icon-btn ufsp-icon-btn-secondary" title="刷新" onClick={() => onReset ? onReset() : onQuery?.('')}><RawIcon svg={actionRefreshIconSvg} /></button>
    <button className="ufsp-icon-btn ufsp-icon-btn-secondary" title="筛选" onClick={() => onNotice('可使用左侧目录、状态页签和关键词筛选')}><RawIcon svg={actionFilterIconSvg} /></button>
    <button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('当前使用临时查询条件，未接查询方案保存')}>查询方案</button>
    <button className="ufsp-icon-btn ufsp-icon-btn-secondary" title="列设置" onClick={() => onNotice('当前按已确认字段展示，列配置暂未接入')}><RawIcon svg={actionSettingsIconSvg} /></button>
  </div>;
}


function Pagination({ total, page = 1, onPage }: { total: number; page?: number; onPage?: (value: number) => void }) {
  return <div className="case-pagination"><span className="ufsp-page-total">共 {total} 条</span><button className="ufsp-page-btn" disabled={page <= 1} onClick={() => onPage?.(page - 1)}>上一页</button><button className="ufsp-page-btn is-active">{page}</button><button className="ufsp-page-btn" disabled={page * 20 >= total} onClick={() => onPage?.(page + 1)}>下一页</button><span className="ufsp-page-size">20 条/页</span></div>;
}
function Catalog({ title, items, active, onChange }: { title: string; items: Array<[string, number, boolean?, string?]>; active: string; onChange: (value: string) => void }) {
  const [query, setQuery] = useState(''); const [collapsed, setCollapsed] = useState(false);
  return <aside className={'ufsp-ledger-tree hn-shared-tree' + (collapsed ? ' is-collapsed' : '')}>
    <button className="ufsp-tree-collapse" aria-label={collapsed ? '展开目录' : '收起目录'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}</button>
    {!collapsed && <div className="ufsp-tree-inner"><div className="ufsp-tree-search"><input placeholder="请输入" aria-label={'搜索' + title} value={query} onChange={e => setQuery(e.target.value)} /><Search size={14} /></div><div className="ufsp-tree-list">
      {items.filter(([label]) => label.includes(query)).map(([label, count, child, id]) => <button key={id || label} className={'ufsp-tree-item ' + (child ? 'topic ' : 'year ') + (active === (id || label) ? 'is-active' : '')} onClick={() => onChange(id || label)}>{child ? <span className="ufsp-tree-indent" /> : <ChevronDown size={14} />}<span>{label}</span>{count >= 0 && <em>({count})</em>}</button>)}
    </div></div>}
  </aside>;
}
function ConfirmAction({ title, children, onClose, onConfirm }: { title: string; children: React.ReactNode; onClose: () => void; onConfirm: () => void }) {
  return <div className="case-modal-mask hn-metadata-discard"><section className="hn-standard-upload" role="dialog" aria-modal="true" aria-label={title}><header className="case-modal-head"><h2>{title}</h2><button aria-label="关闭" onClick={onClose}><X size={18} /></button></header><div className="hn-standard-upload-body">{children}</div><footer className="case-modal-actions"><button className="ufsp-btn" onClick={onClose}>取消</button><button className="ufsp-btn ufsp-btn-primary" onClick={onConfirm}>确认</button></footer></section></div>;
}
function exportCsv(name: string, rows: string[][]) {
  const csv = rows.map(row => row.map(value => '"' + (/^[=+@-]/.test(value) ? "'" : '') + value.replace(/"/g, '""') + '"').join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = name + '.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Drawer({ title, subtitle, children, onClose, actions }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void; actions: React.ReactNode }) {
  return <div className="case-drawer-mask" role="presentation" onMouseDown={onClose}><aside className="case-drawer hn-standard-drawer" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header className="case-drawer-head"><div><h2>{title}</h2>{subtitle ? <span>{subtitle}</span> : null}</div><button onClick={onClose}><X size={18} /></button></header><div className="case-drawer-content">{children}</div><footer className="hn-standard-drawer-footer">{actions}</footer></aside></div>;
}


function IngestionMetadataPage({ row, onBack, onNotice, onNavigate }: NoticeProps & { row: IngestionRow; onBack: () => void }) {
  const { fields, tags } = useGovernance();
  const [draft, setDraft] = useState<IngestionRow>(() => row.savedDraft ? JSON.parse(row.savedDraft) : JSON.parse(JSON.stringify(row)));
  const [editable, setEditable] = useState(row.status !== '已入库' && row.detailStatus !== '处理中');
  const [dirty, setDirty] = useState(false);
  const [reason, setReason] = useState(row.savedDraft ? JSON.parse(row.savedDraft).processingReason || '' : '');
  const [solutions, setSolutions] = useState<Record<number, string>>(row.savedDraft ? JSON.parse(row.savedDraft).processingNotes || {} : {});
  const [editor, setEditor] = useState<{ id?: string; seed?: Partial<TagValue>; path: string } | null>(null);
  const [confirm, setConfirm] = useState<'leave' | 'publish' | null>(null);
  const [history, setHistory] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [removal, setRemoval] = useState<{ title: string; run: () => void } | null>(null);
  const [checked, setChecked] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const change = (path: string, value: string) => { setDraft(d => setCasePath(d, path, value)); setDirty(true); setChecked(false); };
  const mutate = (update: (d: IngestionRow) => IngestionRow) => { setDraft(update); setDirty(true); setChecked(false); };
  const paths: Record<string, string[]> = {
    document_title: ['title'], document_no: ['no'], document_type: ['type'], year: ['year'], issue_date: ['issueDate'], related_unit: ['relatedUnit'],
    subject_role: draft.subjects?.map((_, i) => `subjects.${i}.role`) || [], subject_name: draft.subjects?.map((_, i) => `subjects.${i}.name`) || [],
  };
  Object.entries({ problem_summary: 'title', supervision_domain: 'domain', problem_aspect: 'aspect', violation_type: 'type', problem_nature: 'nature', responsibility_subject: 'responsibility' }).forEach(([code, key]) => { paths[code] = draft.issues?.map((_, i) => `issues.${i}.${key}`) || []; });
  Object.entries({ handling_method: 'type', handling_target: 'target', handling_content: 'content', handling_measure: 'measure' }).forEach(([code, key]) => { paths[code] = draft.decisions?.flatMap((d, i) => d.actions.map((_, j) => `decisions.${i}.actions.${j}.${key}`)) || []; });
  const pathLabel = (path: string, name: string) => path.startsWith('issues.') ? `问题${Number(path.split('.')[1]) + 1} · ${name}` : path.startsWith('decisions.') ? `决定${Number(path.split('.')[1]) + 1} · ${name}` : name;
  const tasks: Array<{ path: string; label: string; message: string; blocking: boolean; resolved?: boolean }> = [];
  fields.filter(f => f.status === '已生效').forEach(f => (paths[f.code] || []).forEach(path => {
    const value = String(getCasePath(draft, path)).trim();
    const candidate = tags.find(t => t.status === '待生效' && t.bindings.some(b => b.caseId === row.id && b.path === path));
    const invalid = value && isDirectory(f) && (f.count === '多值' ? value.split(/[、，；]/) : [value]).some(v => !tags.some(t => t.fieldCode === f.code && t.status === '已生效' && (t.name === v || t.aliases.includes(v))));
    if ((!value && f.blocking) || invalid || candidate) tasks.push({ path, label: pathLabel(path, f.name), message: candidate ? `建议标签“${candidate.name}”${candidate.review === '已退回' ? '已退回，请重新选择' : '待确认'}` : invalid ? '尚未匹配正式值；请选择已有值或清空后补' : '必填内容缺失', blocking: !!f.blocking || !!invalid });
  }));
  draft.issues?.forEach((issue, i) => {
    if (!issue.facts.some(v => v.trim())) tasks.push({ path: `issues.${i}.facts`, label: `问题${i + 1} · 具体事实`, message: '请补充原文事实', blocking: true });
    if (issue.standardMatch.status !== '已匹配' && issue.standardMatch.status !== '人工确认') tasks.push({ path: `issues.${i}.type`, label: `问题${i + 1} · 分类认定`, message: '请核对分类和依据后确认', blocking: true });
  });
  row.qualityIssues.forEach((q, i) => {
    const code = fields.find(f => f.name === q.field)?.code;
    const path = code && paths[code]?.[0] || (q.field === '匹配认定标准' && draft.issues?.length ? 'issues.0.type' : `quality.${i}`);
    tasks.push({ path, label: q.field, message: q.reason, blocking: true, resolved: !!solutions[i]?.trim() && !row.localFileUrl });
  });
  if (!draft.issues?.length && !row.localFileUrl) tasks.push({ path: 'issues', label: '问题认定', message: '尚无问题记录，请补充原文问题事实', blocking: true });
  const locate = (path: string) => {
    if (path.startsWith('issues.')) { const issue = draft.issues?.[Number(path.split('.')[1])]; if (issue) setCollapsed(v => v.filter(id => id !== issue.id)); }
    requestAnimationFrame(() => { const target = Array.from(formRef.current?.querySelectorAll<HTMLElement>('[data-field-path]') || []).find(el => el.dataset.fieldPath === path); target?.scrollIntoView({ behavior: 'smooth', block: 'center' }); target?.querySelector<HTMLElement>('input,select,textarea')?.focus({ preventScroll: true }); });
  };
  const removeItem = (kind: 'issues' | 'decisions', index: number) => {
    if (tags.some(t => t.status === '待生效' && t.bindings.some(b => b.caseId === row.id && b.path.startsWith(kind + '.')))) return onNotice('请先处理此案例的相关标签建议，再移除条目，避免建议关联错位');
    const issue = draft.issues?.[index];
    setRemoval({ title: kind === 'issues' ? '移除此问题？' : '移除此处理决定？', run: () => {
      mutate(d => kind === 'issues' ? { ...d, issues: d.issues!.filter((_, i) => i !== index), decisions: d.decisions?.map(g => ({ ...g, relatedIssueIds: g.relatedIssueIds.filter(id => id !== issue?.id) })) } : { ...d, decisions: d.decisions!.filter((_, i) => i !== index) }); setRemoval(null);
    } });
  };
  const saveDraft = () => {
    updateGovernance(s => ({ ...s, cases: s.cases.map(c => c.id === row.id ? { ...c, savedDraft: JSON.stringify({ ...draft, savedDraft: undefined, processingReason: reason, processingNotes: solutions }) } : c) }));
    setDirty(false); onNotice('处理内容已保存，尚未替换正式版本');
  };
  const values = (code: string) => tags.filter(t => t.fieldCode === code && t.status === '已生效');
  const field = (code: string, path: string, wide = false, customLabel?: string) => {
    const config = fields.find(f => f.code === code);
    const value = String(getCasePath(draft, path));
    const options = values(code);
    const candidates = tags.filter(t => t.status === '待生效' && t.bindings.some(b => b.caseId === row.id && b.path === path));
    const directory = isDirectory(config) && config?.count !== '多值';
    const unmatched = !!value && isDirectory(config) && (config?.count === '多值' ? value.split(/[、，；]/) : [value]).some(v => !options.some(t => t.name === v || t.aliases.includes(v)));
    const suggest = () => { saveDraft(); setEditor({ path, seed: { fieldCode: code, name: value, evidence: draft.title + '：' + (draft.issues?.[Number(path.split('.')[1])]?.facts[0] || draft.issues?.[0]?.facts[0] || ''), bindings: [{ caseId: row.id, path }] } }); };
    const label = customLabel || config?.name || code;
    const task = tasks.find(t => t.path === path && !t.resolved);
    return <div data-field-path={path} className={'ufsp-field-block hn-ingestion-field ' + (wide ? 'hn-field-wide ' : '') + (editable && task ? task.blocking ? 'is-invalid' : 'is-pending' : '')} key={path}><span>{label}{config?.blocking ? <b> *</b> : null}</span>
      {editable && directory ? <select aria-label={label} value={value} onChange={e => e.target.value === '__suggest_new__' ? suggest() : change(path, e.target.value)}><option value="">暂不填写</option>{value && !options.some(t => t.name === value) && <option value={value}>{value}{unmatched ? '（待核对）' : ''}</option>}{options.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}{config?.asTag && config.mode === '可扩展目录' && !candidates.length && <option value="__suggest_new__">找不到合适值？建议新增…</option>}</select> : <input aria-label={label} value={value} readOnly={!editable || config?.mode === '系统关联'} onChange={e => change(path, e.target.value)} />}
      {editable && config?.asTag && (candidates.length > 0 || unmatched) && <div className="hn-field-actions">{candidates.map(t => <React.Fragment key={t.id}><span>建议标签：{t.name}（{t.review}）</span><button className="case-title-link" onClick={() => { saveDraft(); setEditor({ id: t.id, path }); }}>查看建议</button></React.Fragment>)}{!candidates.length && unmatched && <><span>尚未匹配正式值</span>{config.mode === '可扩展目录' && <button className="case-title-link" onClick={suggest}>建议新增</button>}</>}</div>}
      {editable && task && !candidates.length && !unmatched && <small className="hn-field-error">{task.message}</small>}
    </div>;
  };
  const textField = (label: string, value: string, onChange: (v: string) => void) => <label className="ufsp-field-block"><span>{label}</span><textarea value={value} readOnly={!editable} onChange={e => { onChange(e.target.value); setDirty(true); setChecked(false); }} /></label>;
  const validate = () => {
    if (row.detailStatus === '处理中') return '解析尚未完成，不能直接入库';
    if (row.localFileUrl) return '上传文件尚未接入解析服务，当前只能保存和预览原文件';
    if (!draft.issues?.length) return '请补充至少一项问题及原文事实';
    if (draft.decisions?.some(g => !g.actions.length || g.actions.some(a => !a.content.trim()))) return '请补充处理决定的具体内容，或移除误识别的决定';
    if (draft.decisions?.some(g => g.relatedIssueIds.some(id => !draft.issues?.some(issue => issue.id === id)))) return '处理决定存在失效的问题关联';
    const unresolved = tasks.find(t => t.blocking && !t.resolved && !t.path.startsWith('quality.'));
    if (unresolved) { locate(unresolved.path); return unresolved.label + '：' + unresolved.message; }
    if (row.qualityIssues.some((_, i) => !solutions[i]?.trim())) return '请逐项填写阻断问题的处理结论及依据';
    if (row.status === '已入库' && !reason.trim()) return '请填写本次修正原因和依据';
    const paths: Record<string, string[]> = {
      document_title: ['title'], document_no: ['no'], document_type: ['type'], year: ['year'], issue_date: ['issueDate'], related_unit: ['relatedUnit'],
      subject_role: draft.subjects?.map((_, i) => 'subjects.' + i + '.role') || [],
      subject_name: draft.subjects?.map((_, i) => 'subjects.' + i + '.name') || [],
    };
    const issueKeys: Record<string, string> = { problem_summary: 'title', supervision_domain: 'domain', problem_aspect: 'aspect', violation_type: 'type', problem_nature: 'nature', responsibility_subject: 'responsibility' };
    Object.entries(issueKeys).forEach(([code, key]) => { paths[code] = draft.issues?.map((_, i) => 'issues.' + i + '.' + key) || []; });
    const actionKeys: Record<string, string> = { handling_method: 'type', handling_target: 'target', handling_content: 'content', handling_measure: 'measure' };
    Object.entries(actionKeys).forEach(([code, key]) => { paths[code] = draft.decisions?.flatMap((d, i) => d.actions.map((_, j) => 'decisions.' + i + '.actions.' + j + '.' + key)) || []; });
    for (const f of fields.filter(f => f.status === '已生效' && f.blocking)) {
      if (f.code === 'problem_facts') {
        if (!draft.issues?.length || draft.issues.some(i => !i.facts.some(t => t.trim()))) return '请补充具体问题事实';
      } else if (paths[f.code]) {
        if (!paths[f.code].length || paths[f.code].some(path => !String(getCasePath(draft, path)).trim())) return '必填字段未完成：' + f.name;
        if (isDirectory(f) && paths[f.code].some(path => {
          const raw = String(getCasePath(draft, path));
          const entries = f.count === '多值' ? raw.split(/[、，；]/) : [raw];
          return entries.some(v => !values(f.code).some(t => t.name === v || t.aliases.includes(v)));
        })) return '请确认正式目录值：' + f.name;
      } else return '新增必填字段尚未在当前表单配置录入位置：' + f.name;
    }
    for (const f of fields.filter(f => f.status === '已生效' && isDirectory(f))) {
      for (const path of paths[f.code] || []) {
        const raw = String(getCasePath(draft, path));
        if (!raw) continue;
        const entries = f.count === '多值' ? raw.split(/[、，；]/) : [raw];
        if (entries.some(v => !values(f.code).some(t => t.name === v || t.aliases.includes(v)))) return f.name + '尚未匹配正式值；请选择已有值，或清空后待补充';
      }
    }
    return '';
  };
  const publish = () => {
    const error = validate(); if (error) { setConfirm(null); onNotice(error); return; }
    const previous = { ...row, savedDraft: undefined, versions: undefined };
    const version = row.status === '已入库' ? (row.version || 1) + 1 : 1;
    const updated: IngestionRow = { ...draft, status: '已入库', detailStatus: '已入库', savedDraft: undefined, version, qualityIssues: [], reviewStatus: '人工确认', metadataUpdatedAt: nowText(), result: '当前版本已通过人工核对及必填校验。', versions: [...(row.versions || []), { version: row.version || 0, at: nowText(), reason: reason || Object.values(solutions).join('；') || '首次确认入库', snapshot: JSON.stringify(previous) }] };
    updateGovernance(s => ({ ...s, cases: s.cases.map(c => c.id === row.id ? updated : c) }));
    recordFeedback('入库', row.title, (reason || '入库校验处理') + '；' + Object.values(solutions).join('；'));
    setDraft(updated); setDirty(false); setEditable(false); setConfirm(null); onNotice('案例版本已更新（本地），原始文件保留');
  };
  return <div className="case-workspace case-form-page ufsp-form-shell hn-ingestion-detail-page">
    <div className="case-form-head ufsp-form-head"><div className="ufsp-form-title"><button className="ufsp-form-back" aria-label="返回" onClick={() => dirty ? setConfirm('leave') : onBack()}><ArrowLeft size={18} /></button><h1><span>案例入库管理</span><em>/ {editable ? '数据处理' : '入库详情'}</em></h1></div><div className="case-head-actions ufsp-form-actions">
      <button className="ufsp-btn ufsp-btn-secondary" onClick={() => row.localFileUrl ? window.open(row.localFileUrl, '_blank', 'noopener') : onNotice('该演示案例未连接原始文件服务')}>查看源文件</button>
      <button className="ufsp-btn ufsp-btn-secondary" onClick={() => setHistory(true)}>版本记录</button>
      {!editable ? <button className="ufsp-btn ufsp-btn-primary" disabled={row.detailStatus === '处理中'} onClick={() => setEditable(true)}>修正数据</button> : <><button className="ufsp-btn ufsp-btn-secondary" onClick={saveDraft}>保存</button><button className="ufsp-btn ufsp-btn-primary" onClick={() => { const error = validate(); error ? onNotice(error) : setConfirm('publish'); }}>{row.status === '已入库' ? '校验并更新版本' : '校验并入库'}</button></>}
    </div></div>
    <div ref={formRef} className="case-edit-body case-standard-form ufsp-ledger-edit-body hn-ingestion-form">
      {row.detailStatus === '处理中' && <section className="hn-processing-summary"><strong>文件正在解析，请等待处理结果，无需修改字段。</strong></section>}
      {editable && <section className="hn-processing-summary" aria-label="入库检查"><div><strong>{row.detailStatus === '处理中' ? '文件正在解析，请等待处理结果' : tasks.some(t => t.blocking && !t.resolved) ? `尚有 ${tasks.filter(t => t.blocking && !t.resolved).length} 项阻断需要处理` : checked ? '当前表单校验通过，可确认入库' : '当前修改尚未校验'}</strong><button className="ufsp-btn ufsp-btn-secondary" onClick={() => { const error = validate(); setChecked(!error); onNotice(error || '表单校验通过，尚未发布入库'); }}>重新校验</button></div>{tasks.length > 0 && <ul>{tasks.map((task, i) => <li key={task.path + i} className={task.resolved ? 'is-resolved' : task.blocking ? 'is-blocking' : 'is-optional'}><button onClick={() => locate(task.path)}>{task.label}</button><span>{task.resolved ? '已填写处理结论，待校验' : task.message}</span><em>{task.resolved ? '待校验' : task.blocking ? '阻断' : '可后补'}</em></li>)}</ul>}</section>}
      {row.qualityIssues.length > 0 && <section className="ufsp-ledger-edit-section hn-ingestion-quality-section"><h2>异常处理</h2><div className="hn-quality-issue-wrap"><table className="hn-quality-issue-table"><thead><tr><th>字段</th><th>待处理原因</th><th>建议</th><th>处理结论及依据</th></tr></thead><tbody>{row.qualityIssues.map((q, i) => <tr key={i} data-field-path={`quality.${i}`}><td>{q.field}</td><td>{q.reason}</td><td>{q.suggestion}</td><td><input aria-label={q.field + '处理结论'} readOnly={!editable} placeholder="核对原文并说明如何处理" value={solutions[i] || ''} onChange={e => { setSolutions({ ...solutions, [i]: e.target.value }); setDirty(true); setChecked(false); }} /></td></tr>)}</tbody></table></div></section>}
      <section className="ufsp-ledger-edit-section"><h2>文书基本信息</h2><div className="ufsp-ledger-form-grid four">{field('document_title', 'title', true)}{field('document_no', 'no')}{field('document_type', 'type')}{field('year', 'year')}{field('issue_date', 'issueDate')}{field('related_unit', 'relatedUnit', true)}</div></section>
      <section className="ufsp-ledger-edit-section"><h2>关联主体</h2><div className="ufsp-ledger-form-grid four">{draft.subjects?.map((_, i) => <React.Fragment key={i}>{field('subject_role', 'subjects.' + i + '.role')}{field('subject_name', 'subjects.' + i + '.name')}</React.Fragment>)}</div></section>
      <section className="ufsp-ledger-edit-section"><h2>问题认定{(draft.issues?.length || 0) > 1 ? <em>共 {draft.issues!.length} 项</em> : null}{editable && <button className="case-title-link hn-section-action" onClick={() => mutate(d => ({ ...d, issues: [...(d.issues || []), { id: newId(), title: '', domain: '', aspect: '', type: '', nature: '', responsibility: '', facts: [], violatedBases: [], evidences: [], standardMatch: { status: '待确认', name: '', version: '' } }] }))}>＋补充问题</button>}</h2><div className="hn-case-issue-list">{!draft.issues?.length && <p className="hn-issue-empty">尚未提取问题；可在正文解析后核对，或补充遗漏的问题。</p>}{draft.issues?.map((issue, i) => <article className="hn-case-issue" key={issue.id}>
        <header className="hn-case-issue-head">{draft.issues!.length > 1 && <span>问题 {i + 1}</span>}{(!editable || collapsed.includes(issue.id)) && <h3>{issue.title || '尚未填写问题概述'}</h3>}{tasks.some(t => t.path.startsWith(`issues.${i}.`) && t.blocking) && <em className="case-badge is-warning">待处理</em>}<div className="hn-issue-row-actions">{editable && <button className="case-title-link" onClick={() => removeItem('issues', i)}>移除</button>}{draft.issues!.length > 1 && <button className="case-title-link" onClick={() => setCollapsed(v => v.includes(issue.id) ? v.filter(id => id !== issue.id) : [...v, issue.id])}>{collapsed.includes(issue.id) ? '展开' : '收起'}</button>}</div></header>
        {!collapsed.includes(issue.id) && <>
        <div className="hn-issue-facts">
          {editable && field('problem_summary', 'issues.' + i + '.title')}
          <div data-field-path={`issues.${i}.facts`} className={editable && !issue.facts.some(v => v.trim()) ? 'hn-facts-invalid' : ''}>{textField(editable ? '具体问题事实（每行一条）' : '具体问题事实', issue.facts.join('\n'), value => setDraft(d => ({ ...d, issues: d.issues!.map((v, n) => n === i ? { ...v, facts: value.split('\n') } : v) })))}</div>
        </div>
        <div className="hn-issue-classification-head"><h4>分类认定</h4><em className={'case-badge ' + (['已匹配', '人工确认'].includes(issue.standardMatch.status) ? 'is-success' : 'is-warning')}>{issue.standardMatch.status}</em>{editable && <><button className="case-title-link" onClick={() => { if (!issue.type || !issue.domain || !issue.facts.some(v => v.trim())) return onNotice('请先填写问题事实、监督领域和问题类型'); mutate(d => ({ ...d, issues: d.issues!.map((v, n) => n === i ? { ...v, standardMatch: { ...v.standardMatch, status: '人工确认' } } : v) })); }}>确认本问题认定</button><button className="case-title-link" onClick={() => { saveDraft(); recordFeedback('元数据', 'violation_type', draft.title + '：' + [issue.domain, issue.aspect, issue.type, issue.nature, issue.responsibility].join(' / ') + '；请求核对认定目录'); onNavigate?.('metadata', 'violation_type'); }}>反馈目录问题</button></>}</div>
        <div className="ufsp-ledger-form-grid four hn-case-classification-grid">{field('supervision_domain', 'issues.' + i + '.domain')}{field('problem_aspect', 'issues.' + i + '.aspect')}{field('violation_type', 'issues.' + i + '.type', true)}{field('problem_nature', 'issues.' + i + '.nature')}{field('responsibility_subject', 'issues.' + i + '.responsibility', true)}</div>
        <div className="hn-case-standard-match"><strong>适用认定标准</strong><span>{issue.standardMatch.name || '尚未确认'}</span><em>{issue.standardMatch.version}</em></div>
        <section className="hn-case-detail-block hn-issue-bases"><h4>违规认定依据{editable && <button className="case-title-link hn-section-action" onClick={() => mutate(d => ({ ...d, issues: d.issues!.map((v, n) => n === i ? { ...v, violatedBases: [...v.violatedBases, { name: '', clauses: '' }] } : v) }))}>＋补充依据</button>}</h4>{issue.violatedBases.map((basis, j) => <div className="hn-basis-fields" key={j}>{field('violation_basis', 'issues.' + i + '.violatedBases.' + j + '.name', false, '文件名称')}{field('violation_basis', 'issues.' + i + '.violatedBases.' + j + '.clauses', false, '条款')}</div>)}{issue.violatedBases.length === 0 && <p className="hn-issue-empty">原文暂未提取到明确依据</p>}</section>
        <div className="hn-issue-evidence">{textField(editable ? '证据材料（每行一条）' : '证据材料', issue.evidences.join('\n'), value => setDraft(d => ({ ...d, issues: d.issues!.map((v, n) => n === i ? { ...v, evidences: value.split('\n') } : v) })))}</div>
        </>}
      </article>)}</div></section>
      <section className="ufsp-ledger-edit-section"><h2>处理决定{editable && <button className="case-title-link hn-section-action" onClick={() => mutate(d => ({ ...d, decisions: [...(d.decisions || []), { actions: [{ type: '', target: d.relatedUnit, content: '', measure: '' }], bases: [], relatedIssueIds: [] }] }))}>＋补充决定</button>}</h2>
        {!draft.decisions?.length && <p className="hn-issue-empty">原文未提取到明确处理决定，可按实际内容补充。</p>}
        {draft.decisions?.map((group, i) => <article className="hn-case-decision hn-decision-editor" key={i}>
          <header><strong>{draft.decisions!.length > 1 ? `决定 ${i + 1}` : '处理内容'}</strong>{editable && <button className="case-title-link" onClick={() => removeItem('decisions', i)}>移除决定</button>}</header>
          <div className="hn-decision-relations"><span>关联问题</span>{draft.issues?.map((issue, n) => <label key={issue.id}><input type="checkbox" disabled={!editable} checked={group.relatedIssueIds.includes(issue.id)} onChange={e => mutate(d => ({ ...d, decisions: d.decisions!.map((g, k) => k === i ? { ...g, relatedIssueIds: e.target.checked ? [...g.relatedIssueIds, issue.id] : g.relatedIssueIds.filter(id => id !== issue.id) } : g) }))} />问题{n + 1}：{issue.title || '未填写概述'}</label>)}{!group.relatedIssueIds.length && <em>整体处理 / 原文未明确对应问题</em>}</div>
          {group.actions.map((_, j) => <div className="hn-decision-action" key={j}><div className="ufsp-ledger-form-grid four hn-action-fields">{field('handling_method', `decisions.${i}.actions.${j}.type`)}{field('handling_target', `decisions.${i}.actions.${j}.target`, true)}{field('handling_measure', `decisions.${i}.actions.${j}.measure`)}</div>{field('handling_content', `decisions.${i}.actions.${j}.content`)}{editable && group.actions.length > 1 && <button className="case-title-link hn-remove-action" onClick={() => { if (tags.some(t => t.status === '待生效' && t.bindings.some(b => b.caseId === row.id && b.path.startsWith(`decisions.${i}.actions.`)))) return onNotice('请先处理本决定的标签建议'); mutate(d => ({ ...d, decisions: d.decisions!.map((g, n) => n === i ? { ...g, actions: g.actions.filter((a, k) => k !== j) } : g) })); }}>移除此项措施</button>}</div>)}
          {editable && <button className="case-title-link hn-add-action" onClick={() => mutate(d => ({ ...d, decisions: d.decisions!.map((g, n) => n === i ? { ...g, actions: [...g.actions, { type: '', target: d.relatedUnit, content: '', measure: '' }] } : g) }))}>＋补充处理措施</button>}
          <div className="hn-decision-bases"><h4>处理 / 处罚依据{editable && <button className="case-title-link hn-section-action" onClick={() => mutate(d => ({ ...d, decisions: d.decisions!.map((g, n) => n === i ? { ...g, bases: [...g.bases, { name: '', clauses: '' }] } : g) }))}>＋补充依据</button>}</h4>{group.bases.map((_, j) => <div className="hn-basis-fields" key={j}>{field('policy_basis', `decisions.${i}.bases.${j}.name`, false, '文件名称')}{field('policy_basis', `decisions.${i}.bases.${j}.clauses`, false, '条款')}</div>)}{!group.bases.length && <p className="hn-issue-empty">原文未提取到明确依据</p>}</div>
          {(editable || group.grade) && <details className="hn-penalty-details" open={group.grade ? true : undefined}><summary>处罚阶次（有明确裁量结论时填写）</summary><div className="ufsp-ledger-form-grid four">{field('penalty_grade', `decisions.${i}.grade`)}</div></details>}
        </article>)}
      </section>
      {editable && <section className="ufsp-ledger-edit-section"><h2>{row.status === '已入库' ? '修正说明' : '处理备注'}</h2><label className="ufsp-field-block"><textarea placeholder="请说明修改了什么，以及原文或认定依据" value={reason} onChange={e => { setReason(e.target.value); setDirty(true); }} /></label></section>}
      <section className="ufsp-ledger-edit-section"><h2>来源与版本</h2><dl className="hn-detail-list"><div><dt>来源</dt><dd>{row.source}</dd></div><div><dt>来源标识</dt><dd>{row.sourceId}</dd></div><div><dt>文件名称</dt><dd>{row.fileName}</dd></div><div><dt>状态</dt><dd>{row.status} · V{row.version || 1}</dd></div><div><dt>更新时间</dt><dd>{row.metadataUpdatedAt}</dd></div></dl></section>
    </div>
    {editor && <TagEditor id={editor.id} seed={editor.seed} onClose={() => setEditor(null)} onResolved={value => change(editor.path, value)} onNotice={onNotice} onNavigate={onNavigate} />}
    {removal && <ConfirmAction title={removal.title} onClose={() => setRemoval(null)} onConfirm={removal.run}>仅移除当前草稿中的条目。关联的问题关系会同步清除；请核对剩余处理决定，正式版本需保存并校验后才更新。</ConfirmAction>}
    {confirm && <ConfirmAction title={confirm === 'leave' ? '放弃未保存修改？' : row.status === '已入库' ? '确认更新案例版本？' : '确认正式入库？'} onClose={() => setConfirm(null)} onConfirm={confirm === 'leave' ? onBack : publish}>{confirm === 'leave' ? '仅放弃当前未保存修改。' : '已核对原文和目录匹配。未完成的非必填值可后补；原文件及历史版本保留。'}</ConfirmAction>}
    {history && <Drawer title="版本记录" onClose={() => setHistory(false)} actions={<button className="ufsp-btn" onClick={() => setHistory(false)}>关闭</button>}><p>当前 V{row.version || 1} · {row.status}</p>{row.versions?.length ? row.versions.map((v, i) => <section className="hn-drawer-section" key={i}><h3>变更前 V{v.version}</h3><p>{v.at} · {v.reason}</p><p>{JSON.parse(v.snapshot).title}</p></section>) : <p>暂无历史变更</p>}</Drawer>}
  </div>;
}

export function CaseIngestionManagement({ onNotice, onNavigate }: NoticeProps) {
  const { cases, tags, focusCase } = useGovernance();
  const [tab, setTab] = useState('未入库'); const [catalog, setCatalog] = useState('全部领域');
  const [detailId, setDetailId] = useState<string | null>(focusCase || null);
  const [query, setQuery] = useState(''); const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false); const [files, setFiles] = useState<File[]>([]);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const fileError = (file: File) => !/\.(pdf|docx?|xlsx?)$/i.test(file.name) ? '不支持的格式' : file.size > 50 * 1024 * 1024 ? '超过 50MB' : file.size === 0 ? '文件为空' : '';
  const addFiles = (incoming: File[]) => setFiles(current => [...current, ...incoming.filter(f => !current.some(v => v.name === f.name && v.size === f.size && v.lastModified === f.lastModified))]);
  useEffect(() => { if (focusCase) { setDetailId(focusCase); updateGovernance(s => ({ ...s, focusCase: undefined })); } }, [focusCase]);
  const tabRows = cases.filter(c => tab === '全部' || c.status === tab);
  const inDomain = (c: IngestionRow, name: string) => c.issues?.some(i => i.domain === name) || c.domain === name;
  const rows = tabRows.filter(c => (catalog === '全部领域' || inDomain(c, catalog)) && [c.title, c.no, c.relatedUnit].join(' ').includes(query.trim()));
  const domains = [...new Set([...DOMAIN_NAMES, ...cases.flatMap(c => c.issues?.map(i => i.domain) || [c.domain])])].filter(Boolean);
  const domainItems: Array<[string, number, boolean?]> = [['全部领域', tabRows.length], ...domains.map(name => [name, tabRows.filter(c => inDomain(c, name)).length, true] as [string, number, boolean])];
  const selected = cases.find(c => c.id === detailId);
  const receive = () => {
    if (!files.length) return onNotice('请选择文件');
    if (files.some(fileError)) return onNotice('请移除格式或大小不符合要求的文件');
    if (files.some(f => f.size > 50 * 1024 * 1024)) return onNotice('单个文件不能超过 50MB');
    const newRows: IngestionRow[] = files.map(f => ({ ...cases[0], id: newId(), title: f.name, no: '', type: '', year: '', issueDate: '', relatedUnit: '', domain: '未分类', aspect: '', issueType: '', nature: '', manifestation: '', handlingMethod: '', policyBasis: '', source: '用户上传', sourceId: 'UPLOAD-' + newId(), fileName: f.name, localFileUrl: URL.createObjectURL(f), status: '未入库', detailStatus: '待人工处理', subjects: [], issues: [], decisions: [], qualityIssues: [{ field: '文档解析', current: '未解析', suggestion: '接入解析服务后提取正文', confidence: '—', reason: '尚未接入文件解析服务' }], result: '原文件已在本地接收，尚未解析。', version: 1, versions: [], savedDraft: undefined, time: nowText(), metadataUpdatedAt: nowText() }));
    updateGovernance(s => ({ ...s, cases: [...newRows, ...s.cases] })); setFiles([]); setUploadOpen(false); setTab('未入库'); setCatalog('全部领域'); setQuery(''); onNotice('已接收本地文件；未上传服务器，刷新后不保留');
  };
  if (selected) return <IngestionMetadataPage key={selected.id} row={selected} onBack={() => setDetailId(null)} onNotice={onNotice} onNavigate={onNavigate} />;
  return <div className="case-workspace hn-module-page hn-standard-management-page"><div className="case-tabs">{['已入库', '未入库', '全部'].map(name => <button key={name} className={tab === name ? 'is-active' : ''} onClick={() => { setTab(name); setCatalog('全部领域'); setPage(1); }}>{name} ({cases.filter(c => name === '全部' || c.status === name).length})</button>)}</div>
    <div className="hn-split-workspace"><Catalog title="监督领域" active={catalog} onChange={v => { setCatalog(v); setPage(1); }} items={domainItems} /><section className="hn-list-region"><div className="case-list-toolbar"><div className="case-toolbar-left"><button className="ufsp-btn ufsp-btn-primary" onClick={() => setUploadOpen(true)}><RawIcon svg={actionImportIconSvg} />上传文档</button><button className="ufsp-btn ufsp-btn-secondary" onClick={() => exportCsv('案例入库清单', [['标题', '文号', '相关单位', '状态'], ...rows.map(r => [r.title, r.no, r.relatedUnit, r.status])])}><RawIcon svg={actionExportIconSvg} />导出</button></div><StandardSearchTools query={query} onQuery={v => { setQuery(v); setPage(1); }} onNotice={onNotice} /></div>
      <div className="case-table-wrap"><table className="case-table hn-standard-table hn-ingestion-standard-table"><thead><tr><th className="case-col-check">序号</th><th>文档标题</th><th>文号</th><th>监督领域</th><th>方面</th><th>问题类型</th><th>问题性质</th><th>相关单位</th><th>当前状态</th><th>接入时间</th><th className="case-col-actions">操作</th></tr></thead><tbody>{rows.slice((page - 1) * 20, page * 20).map((r, index) => {
        const pending = tags.filter(t => t.status === '待生效' && t.bindings.some(b => b.caseId === r.id));
        const tip = [r.result, ...r.qualityIssues.map(q => q.field + '：' + q.reason), ...pending.map(t => '标签建议' + t.review + '：' + t.name)].join('；');
        const aggregate = (key: keyof CaseIssue) => [...new Set(r.issues?.map(i => String(i[key])) || [])].join('、') || '—';
        return <tr key={r.id}><td className="case-col-check">{(page - 1) * 20 + index + 1}</td><td><button className="case-title-link" onClick={() => setDetailId(r.id)}>{r.title}</button></td><td>{r.no || '—'}</td><td title={aggregate('domain')}>{aggregate('domain')}</td><td title={aggregate('aspect')}>{aggregate('aspect')}</td><td title={aggregate('type')}>{aggregate('type')}</td><td>{aggregate('nature')}</td><td>{r.relatedUnit || '—'}</td><td><span className={'case-badge ' + (r.status === '已入库' ? 'is-success' : 'is-warning')} title={tip}>{r.status === '已入库' ? r.savedDraft ? '已入库 · 有修改' : '已入库' : r.detailStatus}</span></td><td>{r.time}</td><td className="case-col-actions"><button onClick={() => setDetailId(r.id)}>{r.status === '已入库' || r.detailStatus === '处理中' ? '详情' : '处理'}</button></td></tr>;
      })}</tbody></table>{!rows.length && <div className="hn-metadata-empty">暂无符合条件的案例</div>}</div><Pagination total={rows.length} page={page} onPage={setPage} />
    </section></div>{uploadOpen && <div className="case-modal-mask"><section className="hn-standard-upload" role="dialog" aria-modal="true" aria-label="上传案例文档"><header className="case-modal-head"><h2>上传案例文档</h2><button aria-label="关闭" onClick={() => { setFiles([]); setUploadOpen(false); }}><X size={18} /></button></header><div className="hn-standard-upload-body">
      <input ref={uploadRef} type="file" hidden multiple accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
      <button type="button" className={'hn-standard-upload-drop' + (dragging ? ' is-dragging' : '')} onClick={() => uploadRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}><RawIcon svg={actionImportIconSvg} /><strong>点击选择，或拖入案例文件</strong><span>支持 PDF、Word、Excel，单个文件不超过 50MB</span></button>
      {files.length > 0 && <div className="hn-upload-file-list"><div className="hn-upload-list-head"><strong>已选择 {files.length} 个文件</strong><button className="case-title-link" onClick={() => uploadRef.current?.click()}>继续添加</button></div>{files.map((f, i) => <div className="hn-upload-file" key={f.name + f.lastModified + i}><div><strong title={f.name}>{f.name}</strong><span>{f.size < 1024 * 1024 ? `${Math.ceil(f.size / 1024)} KB` : `${(f.size / 1024 / 1024).toFixed(1)} MB`} · <em className={fileError(f) ? 'is-error' : ''}>{fileError(f) || '可接收'}</em></span></div><button className="case-title-link" aria-label={'移除 ' + f.name} onClick={() => setFiles(v => v.filter((_, n) => n !== i))}>移除</button></div>)}</div>}
      <p className="hn-upload-footnote">接收后进入未入库列表，解析与校验通过后才能正式入库。</p>
    </div><footer className="case-modal-actions"><button className="ufsp-btn" onClick={() => { setFiles([]); setUploadOpen(false); }}>取消</button><button className="ufsp-btn ufsp-btn-primary" disabled={!files.length || files.some(fileError)} onClick={receive}>接收文件{files.length ? `（${files.length}）` : ''}</button></footer></section></div>}
  </div>;
}

const metadataStatus = (field: MetadataField) => field.status === '草稿' ? '待生效' : field.status;
const metadataInTab = (field: MetadataField, tab: string) => tab === '全部' || (tab === '待生效' ? field.status === '草稿' || !!field.draft : metadataStatus(field) === tab);
const metadataDisplay = (field: MetadataField): MetadataField => ({ ...field, ...field.draft });

export function MetadataManagement({ onNotice, onNavigate }: NoticeProps) {
  const { fields, tags, advice, focusField } = useGovernance();
  const setFields = (update: (fields: MetadataField[]) => MetadataField[]) => updateGovernance(s => ({ ...s, fields: update(s.fields) }));
  const [confirm, setConfirm] = useState<{ title: string; text: string; run: () => void } | null>(null);
  const [tab, setTab] = useState('全部');
  const [catalog, setCatalog] = useState('全部字段');
  const [treeSearch, setTreeSearch] = useState('');
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('全部');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<{ kind: 'view' | 'edit' | 'add'; code: string } | null>(null);
  const [form, setForm] = useState<MetadataField | null>(null);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const inTab = fields.filter((field) => metadataInTab(field, tab));
  const rows = inTab.filter((field) => {
    const current = tab === '待生效' ? metadataDisplay(field) : field;
    return (catalog === '全部字段' || field.group === catalog)
      && (modeFilter === '全部' || field.mode === modeFilter)
      && (!search || [current.name, field.code, field.group, field.source].join(' ').toLowerCase().includes(search.toLowerCase()));
  });
  const pageCount = Math.max(1, Math.ceil(rows.length / 20));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice((currentPage - 1) * 20, currentPage * 20);
  const selected = fields.find((field) => field.code === drawer?.code);
  const visibleField = drawer?.kind === 'view' && selected ? (tab === '待生效' ? metadataDisplay(selected) : selected) : form;
  const editing = drawer?.kind !== 'view';
  const pendingCount = fields.filter((field) => metadataInTab(field, '待生效')).length;
  const openField = (field: MetadataField, kind: 'view' | 'edit') => {
    setDrawer({ kind, code: field.code }); setForm(metadataDisplay(field)); setDirty(false);
  };
  useEffect(() => {
    if (!focusField) return;
    const target = fields.find(f => f.code === focusField);
    if (target) { setTab('全部'); openField(target, 'view'); }
    updateGovernance(s => ({ ...s, focusField: '' }));
  }, [focusField]);
  const closeDrawer = () => {
    if (dirty) { setDiscardOpen(true); return; }
    setDrawer(null); setForm(null);
  };
  const updateForm = (patch: Partial<MetadataField>) => {
    setForm((current) => current ? { ...current, ...patch, ...(patch.mode && !['固定目录', '可扩展目录'].includes(patch.mode) ? { asTag: false } : {}) } : current); setDirty(true);
  };
  const openAdd = () => {
    setForm(metadataField({ code: '', name: '', group: catalog === '全部字段' ? METADATA_GROUPS[0] : catalog,
      mode: '原文提取', source: '文书原文', definition: '', rule: '', usage: '' }));
    setDrawer({ kind: 'add', code: '' }); setDirty(false);
  };
  const saveDraft = (publish = false) => {
    if (!form) return;
    const next = { ...form, code: form.code.trim(), name: form.name.trim(), definition: form.definition.trim(), rule: form.rule.trim() };
    if (!next.name || !next.definition || !next.rule) { onNotice('请填写字段名称、业务定义和抽取匹配规则'); return; }
    if (drawer?.kind === 'add') {
      if (!/^[a-z][a-z0-9_]*$/.test(next.code)) { onNotice('字段编码请使用小写字母、数字和下划线，并以字母开头'); return; }
      if (fields.some((field) => field.code === next.code)) { onNotice('字段编码已存在，请使用不同编码'); return; }
      const source = next.mode === '固定目录' || next.mode === '可扩展目录' ? next.name + '目录（待配置）' : next.mode === '系统关联' ? '系统关联规则（待配置）' : '文书原文';
      setFields((current) => [...current, { ...next, source, status: publish ? '已生效' : '草稿', version: 1 }]);
    } else {
      const patch = { name: next.name, definition: next.definition, rule: next.rule, usage: next.usage, asTag: next.asTag, blocking: next.blocking };
      // 已生效配置保留不动；修改只落在本地草稿，不改正式案例或知识库。
      setFields((current) => current.map((field) => field.code !== drawer?.code ? field : publish ? { ...field, ...patch, status: '已生效', draft: undefined, version: (field.version || 1) + 1 } : field.status === '已生效' ? { ...field, draft: patch } : { ...field, ...patch }));
    }
    setTab(publish ? '已生效' : '待生效'); setCatalog('全部字段'); setQuery(''); setSearch(''); setModeFilter('全部'); setPage(1);
    setDirty(false); setDrawer(null); setForm(null);
    onNotice(publish ? '字段配置已在本地生效；未写入真实知识库' : '草稿已保存，原生效配置继续使用');
  };
  const confirmPublish = () => { if (!form) return; setConfirm({ title: '确认字段配置生效', text: '本次调整将更新此字段配置与标签目录入口。已有案例不自动回填；历史引用保留。是否继续？', run: () => { saveDraft(true); setConfirm(null); } }); };
  const exportFields = () => {
    const values = [['字段名称', '字段编码', '所属对象', '数据类型', '取值数量', '取值方式', '取值来源', '状态'], ...rows.map((field) => [metadataDisplay(field).name, field.code, field.group, field.type, field.count, field.mode, field.source, metadataStatus(field)])];
    const csv = values.map((cells) => cells.map((cell) => '"' + cell.replace(/"/g, '""') + '"').join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = '湖南案例元数据字段.csv'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    onNotice('已导出当前范围的 ' + rows.length + ' 个字段');
  };
  return <div className="case-workspace hn-module-page hn-standard-management-page hn-metadata-page">
    <div className="case-tabs" role="tablist" aria-label="字段配置状态">
      {['已生效', '待生效', '已停用', '全部'].map((name) => <button key={name} role="tab" aria-selected={tab === name} className={tab === name ? 'is-active' : ''} onClick={() => { setTab(name); setCatalog('全部字段'); setPage(1); }}>
        {name} ({name === '全部' ? fields.length : fields.filter((field) => metadataInTab(field, name)).length})
      </button>)}
      <button className={tab === '规则建议' ? 'is-active' : ''} onClick={() => setTab('规则建议')}>规则建议 ({advice.filter(a => a.status === '待确认').length})</button>
    </div>
    {tab === '规则建议' ? <GovernanceAdvice onNotice={onNotice} onField={code => { setTab('已生效'); const f = fields.find(f => f.code === code); if (f) openField(f, 'edit'); }} /> : <div className={'case-management-body hn-metadata-body' + (treeCollapsed ? ' is-tree-collapsed' : '')}>
      <aside className="ufsp-ledger-tree" aria-label="字段所属对象目录">
        <button className="ufsp-tree-collapse" aria-label={treeCollapsed ? '展开字段目录' : '收起字段目录'} onClick={() => setTreeCollapsed(!treeCollapsed)}>{treeCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}</button>
        <div className="ufsp-tree-inner" hidden={treeCollapsed}>
          <div className="ufsp-tree-search"><input placeholder="请输入" aria-label="搜索字段所属对象" value={treeSearch} onChange={(event) => setTreeSearch(event.target.value)} /><Search size={14} /></div>
          <div className="ufsp-tree-list">
            {['全部字段', ...METADATA_GROUPS].filter((group) => group === '全部字段' || group.includes(treeSearch.trim())).map((group) => <button key={group} className={'ufsp-tree-item ' + (group === '全部字段' ? 'year ' : 'topic ') + (catalog === group ? 'is-active' : '')} onClick={() => { setCatalog(group); setPage(1); }}>
              {group === '全部字段' ? <ChevronDown size={14} /> : <span className="ufsp-tree-indent" />}<span>{group}</span><em>({group === '全部字段' ? inTab.length : inTab.filter((field) => field.group === group).length})</em>
            </button>)}
          </div>
        </div>
      </aside>
      <section className="hn-list-region">
        <div className="case-list-toolbar">
          <div className="case-toolbar-left">
            <button className="ufsp-btn ufsp-btn-primary" onClick={openAdd}><RawIcon svg={actionAddIconSvg} />新增</button>
            <button className="ufsp-btn ufsp-btn-secondary" disabled={pendingCount === 0} onClick={() => setConfirm({ title: '确认待生效配置', text: '将使 ' + pendingCount + ' 项字段配置生效；保留当前案例值，不自动全量回填。', run: () => { setFields(fs => fs.map(f => metadataInTab(f, '待生效') ? { ...f, ...f.draft, status: '已生效', draft: undefined, version: (f.version || 0) + 1 } : f)); setConfirm(null); onNotice('配置已在本地生效'); } })}><RawIcon svg={actionPassIconSvg} />发布版本</button>
            <button className="ufsp-btn ufsp-btn-secondary" onClick={exportFields}><RawIcon svg={actionExportIconSvg} />导出</button>
          </div>
          <div className="case-toolbar-right">
            <label className="ufsp-search-box ufsp-filter-input"><input placeholder="请输入" aria-label="搜索字段名称、编码或取值来源" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setSearch(query.trim()); setPage(1); } }} /></label>
            <button className="ufsp-icon-btn ufsp-icon-btn-primary" title="查询" aria-label="查询" onClick={() => { setSearch(query.trim()); setPage(1); }}><RawIcon svg={searchIconSvg} /></button>
            <button className="ufsp-icon-btn ufsp-icon-btn-secondary" title="重置查询" aria-label="重置查询" onClick={() => { setQuery(''); setSearch(''); setModeFilter('全部'); setCatalog('全部字段'); setTreeSearch(''); setPage(1); }}><RawIcon svg={actionRefreshIconSvg} /></button>
            <button className="ufsp-icon-btn ufsp-icon-btn-secondary" title="筛选" aria-label="筛选" aria-expanded={filterOpen} onClick={() => setFilterOpen(!filterOpen)}><RawIcon svg={actionFilterIconSvg} /></button>
            <button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNotice('查询方案保存尚未接入，当前查询条件可正常使用')}>查询方案</button>
            <button className="ufsp-icon-btn ufsp-icon-btn-secondary" title="列设置" aria-label="列设置" onClick={() => onNotice('本轮使用固定字段列，列显示配置尚未接入')}><RawIcon svg={actionSettingsIconSvg} /></button>
          </div>
        </div>
        {filterOpen ? <div className="hn-metadata-filter" role="group" aria-label="取值方式筛选"><span>取值方式</span>{['全部', ...METADATA_MODES].map((mode) => <button key={mode} className={'ufsp-btn ' + (modeFilter === mode ? 'ufsp-btn-secondary' : '')} aria-pressed={modeFilter === mode} onClick={() => { setModeFilter(mode); setPage(1); }}>{mode}</button>)}</div> : null}
        {search || modeFilter !== '全部' ? <div className="hn-filter-summary"><span>当前条件：{[search && '关键词“' + search + '”', modeFilter !== '全部' && modeFilter].filter(Boolean).join(' · ')}</span><button className="case-title-link" onClick={() => { setQuery(''); setSearch(''); setModeFilter('全部'); setPage(1); }}>清空</button></div> : null}
        <div className="case-table-wrap">
          <table className="case-table hn-standard-table hn-metadata-standard-table">
            <thead><tr><th className="case-col-check">序号</th><th>字段名称</th><th>字段编码</th><th>所属对象</th><th>数据类型</th><th title="以当前文书、主体、问题或处理措施为单位">取值数量</th><th>取值方式</th><th>标签维度</th><th>入库要求</th><th>取值来源</th><th>状态</th><th className="case-col-actions">操作</th></tr></thead>
            <tbody>{pageRows.map((field, index) => <tr key={field.code}>
              <td className="case-col-check">{(currentPage - 1) * 20 + index + 1}</td>
              <td><button className="case-title-link" title={metadataDisplay(field).name} onClick={() => openField(field, 'view')}>{(tab === '待生效' ? metadataDisplay(field) : field).name}</button></td>
              <td title={field.code}>{field.code}</td><td>{field.group}</td><td>{field.type}</td><td>{field.count}</td><td>{field.mode}</td><td>{field.asTag ? <button className="case-title-link" onClick={() => onNavigate?.('tags', field.code)}>查看标签值 ({tags.filter(t => t.fieldCode === field.code && t.status === '已生效').length})</button> : '否'}</td><td>{field.blocking ? '必填 · 阻断' : '允许后补'}</td><td title={field.source}>{field.source}</td>
              <td><span className={'case-badge ' + (metadataStatus(field) === '已生效' ? 'is-success' : 'is-warning')} title={field.draft ? '修改草稿待生效，已生效配置仍保留' : field.status === '草稿' ? '待生效的字段配置' : '已生效配置'}>{tab === '待生效' ? '待生效' : metadataStatus(field)}{field.draft && tab !== '待生效' ? ' · 有修改' : ''}</span></td>
              <td className="case-col-actions"><button onClick={() => openField(field, 'view')}>详情</button><button onClick={() => openField(field, 'edit')}>编辑</button></td>
            </tr>)}</tbody>
          </table>
          {!rows.length ? <div className="hn-metadata-empty">暂无符合条件的字段</div> : null}
        </div>
        <div className="case-pagination"><span className="ufsp-page-total">共 {rows.length} 条</span><button className="ufsp-page-btn" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>上一页</button><button className="ufsp-page-btn is-active" aria-current="page">{currentPage}</button><button className="ufsp-page-btn" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>下一页</button><span className="ufsp-page-size">20 条/页</span></div>
      </section>
    </div>
    }
    {confirm && <ConfirmAction title={confirm.title} onClose={() => setConfirm(null)} onConfirm={confirm.run}>{confirm.text}</ConfirmAction>}
    {drawer && visibleField ? <div className="hn-metadata-dialog"><Drawer title={drawer.kind === 'add' ? '新增字段' : editing ? '编辑字段规则' : visibleField.name} subtitle={drawer.kind === 'add' ? undefined : visibleField.code} onClose={closeDrawer} actions={editing ? <><button className="ufsp-btn" onClick={closeDrawer}>取消</button><button className="ufsp-btn ufsp-btn-primary" disabled={drawer.kind === 'edit' && !dirty} onClick={() => saveDraft()}>保存草稿</button><button className="ufsp-btn ufsp-btn-primary" onClick={confirmPublish}>保存并生效</button></> : <><button className="ufsp-btn" onClick={closeDrawer}>关闭</button><button className="ufsp-btn ufsp-btn-primary" onClick={() => selected && openField(selected, 'edit')}>编辑</button>{selected?.asTag && <button className="ufsp-btn ufsp-btn-secondary" onClick={() => onNavigate?.('tags', selected.code)}>查看标签值</button>}{selected && <button className="ufsp-btn ufsp-btn-secondary" onClick={() => setConfirm({ title: selected.status === '已停用' ? '启用字段' : '停用字段', text: '已有案例值和历史引用保留，停止新数据使用前请确认影响。', run: () => { setFields(fs => fs.map(f => f.code === selected.code ? { ...f, status: f.status === '已停用' ? '已生效' : '已停用' } : f)); setConfirm(null); setDrawer(null); } })}>{selected.status === '已停用' ? '启用' : '停用'}</button>}</>}>
      <section className="hn-drawer-section"><h3>字段定义</h3>
        {drawer.kind === 'add' ? <div className="hn-metadata-form-grid">
          <label className="ufsp-field-block"><span>字段名称 <b>*</b></span><input value={visibleField.name} onChange={(event) => updateForm({ name: event.target.value })} /></label>
          <label className="ufsp-field-block"><span>字段编码 <b>*</b></span><input value={visibleField.code} placeholder="如 region_code" onChange={(event) => updateForm({ code: event.target.value })} /></label>
          <label className="ufsp-field-block"><span>所属对象</span><select value={visibleField.group} onChange={(event) => updateForm({ group: event.target.value })}>{METADATA_GROUPS.map((group) => <option key={group}>{group}</option>)}</select></label>
          <label className="ufsp-field-block"><span>数据类型</span><select value={visibleField.type} onChange={(event) => updateForm({ type: event.target.value })}>{['文本', '长文本', '整数', '日期'].map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="ufsp-field-block"><span>取值数量</span><select value={visibleField.count} onChange={(event) => updateForm({ count: event.target.value as MetadataField['count'] })}><option>单值</option><option>多值</option></select></label>
          <label className="ufsp-field-block"><span>取值方式</span><select value={visibleField.mode} onChange={(event) => updateForm({ mode: event.target.value as MetadataMode })}>{METADATA_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></label>
        </div> : <>
          {editing ? <label className="ufsp-field-block hn-metadata-name"><span>字段名称 <b>*</b></span><input value={visibleField.name} onChange={(event) => updateForm({ name: event.target.value })} /></label> : null}
          <dl className="hn-detail-list"><div><dt>所属对象</dt><dd>{visibleField.group}</dd></div><div><dt>数据类型</dt><dd>{visibleField.type}</dd></div><div><dt>取值数量</dt><dd>{visibleField.count}（{visibleField.group === '问题认定' ? '每个问题' : visibleField.group === '关联主体' ? '每个关联主体' : visibleField.group === '处理决定' ? ['policy_basis', 'penalty_grade', 'related_issue_ids'].includes(visibleField.code) ? '每组处置' : '每条措施' : '每份文书'}）</dd></div><div><dt>取值方式</dt><dd>{visibleField.mode}</dd></div><div><dt>配置状态</dt><dd>{selected && metadataStatus(selected)}{selected?.draft ? ' · 已生效配置仍保留' : ''}</dd></div></dl>
        </>}
      </section>
      <section className="hn-drawer-section"><h3>使用与入库规则</h3><div className="hn-metadata-form-grid"><label className="hn-switch-field"><span>作为标签维度</span><input type="checkbox" role="switch" checked={!!visibleField.asTag} disabled={!editing || !isDirectory(visibleField)} onChange={e => updateForm({ asTag: e.target.checked })} /></label><label className="hn-switch-field"><span>入库必填并阻断</span><input type="checkbox" role="switch" checked={!!visibleField.blocking} disabled={!editing} onChange={e => updateForm({ blocking: e.target.checked })} /></label></div>{!isDirectory(visibleField) && <p className="hn-metadata-source-help">原文、格式或系统关联字段不自动生成标签目录。</p>}</section>
      {(['definition', 'rule', 'usage'] as const).map((key) => <section className="hn-drawer-section" key={key}><h3>{{ definition: '业务定义', rule: '抽取与匹配规则', usage: '应用位置' }[key]}</h3>{editing ? <label className="ufsp-field-block"><textarea aria-label={{ definition: '业务定义', rule: '抽取与匹配规则', usage: '应用位置' }[key]} value={visibleField[key]} onChange={(event) => updateForm({ [key]: event.target.value })} /></label> : <p className="hn-metadata-rule-text">{visibleField[key] || '—'}</p>}</section>)}
      {drawer.kind !== 'add' ? <section className="hn-drawer-section"><h3>取值来源</h3><p>{visibleField.source}</p>{visibleField.mode === '固定目录' || visibleField.mode === '可扩展目录' ? <p className="hn-metadata-source-help">{visibleField.mode === '固定目录' ? '仅使用已确认目录值；无法匹配时待确认，不自动新增。' : '优先匹配正式值与别名；新概念进入候选审核。'} 正式值在此字段对应的标签目录中统一维护。</p> : null}{(visibleField.examples.length || tags.some(t => t.fieldCode === visibleField.code && t.status === '已生效')) ? <><div className="hn-metadata-example-label">当前取值</div><div className="hn-value-list">{(isDirectory(visibleField) ? tags.filter(t => t.fieldCode === visibleField.code && t.status === '已生效').map(t => t.name) : visibleField.examples).map((value) => <span key={value}>{value}</span>)}</div></> : null}</section> : null}
    </Drawer></div> : null}
    {discardOpen ? <div className="case-modal-mask hn-metadata-discard"><section className="hn-standard-upload" role="dialog" aria-modal="true" aria-labelledby="hn-metadata-discard-title"><header className="case-modal-head"><h2 id="hn-metadata-discard-title">放弃未保存的修改？</h2></header><div className="hn-standard-upload-body">本次修改尚未保存为草稿，关闭后将不予保留。</div><footer className="case-modal-actions"><button className="ufsp-btn" onClick={() => setDiscardOpen(false)}>继续编辑</button><button className="ufsp-btn ufsp-btn-primary" onClick={() => { setDiscardOpen(false); setDirty(false); setDrawer(null); setForm(null); }}>放弃修改</button></footer></section></div> : null}
  </div>;
}


function TagEditor({ id, seed, onClose, onNotice, onResolved, onNavigate }: NoticeProps & { id?: string; seed?: Partial<TagValue>; onClose: () => void; onResolved?: (value: string) => void }) {
  const { fields, tags, cases } = useGovernance();
  const existing = tags.find(t => t.id === id);
  const [form, setForm] = useState<TagValue>(() => existing ? { ...existing, aliases: [...existing.aliases] } : {
    id: newId(), fieldCode: seed?.fieldCode || fields.find(f => f.asTag && f.status === '已生效')?.code || '',
    name: '', definition: '', aliases: [], status: '待生效', review: '草稿', evidence: '', bindings: [], ...seed,
  });
  const [target, setTarget] = useState(''); const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState<null | (() => void)>(null);
  const field = fields.find(f => f.code === form.fieldCode);
  const official = existing?.status === '已生效';
  const stopped = existing?.status === '已停用';
  const options = tags.filter(t => t.fieldCode === form.fieldCode && t.status === '已生效' && t.id !== form.id);
  const save = (publish: boolean) => {
    if (!form.name.trim() || !form.definition.trim() || !form.evidence.trim()) return onNotice('请填写名称、定义和来源依据');
    if (!field?.asTag || field.status !== '已生效') return onNotice('请先启用所属元数据的标签维度');
    if (!official && field.mode === '固定目录') return onNotice('固定目录不能新增自由标签，请在元数据规则建议中提交标准调整依据');
    const duplicate = tags.find(t => t.id !== form.id && t.fieldCode === form.fieldCode && t.status === '已生效' && [t.name, ...t.aliases].some(n => [form.name.trim(), ...form.aliases].includes(n)));
    if (duplicate) return onNotice('与已生效值或别名重复：' + duplicate.name + '，请并入现有标签');
    updateGovernance(s => ({ ...s, tags: existing ? s.tags.map(t => t.id === form.id ? { ...form, name: form.name.trim() } : t) : [...s.tags, { ...form, name: form.name.trim(), review: '待确认' }] }));
    if (publish && !official) {
      const error = resolveCandidate(form.id, 'publish');
      if (error) return onNotice(error);
      onResolved?.(form.name.trim());
    } else recordFeedback('标签', form.name, official ? '调整定义或别名：' + form.evidence : '新增候选：' + form.evidence);
    onNotice(publish ? '标签已生效，关联案例仍需校验后入库' : official ? '标签说明已更新，历史案例保留' : '建议已保存，可在标签管理继续处理'); onClose();
  };
  const decide = (action: 'reject' | 'merge') => {
    if (action === 'merge' && !target) return onNotice('请选择要采用的现有标签');
    if (!existing && action === 'reject') return onNotice('请先保存建议');
    if (action === 'reject' && !reason.trim()) return onNotice('请填写退回原因');
    if (!existing) updateGovernance(s => ({ ...s, tags: [...s.tags, { ...form, name: form.name || options.find(t => t.id === target)!.name }] }));
    const error = resolveCandidate(form.id, action, reason.trim(), target);
    if (error) return onNotice(error);
    if (action === 'merge') onResolved?.(options.find(t => t.id === target)!.name);
    onNotice(action === 'merge' ? '已采用现有标签，关联未入库案例可继续处理' : '建议已退回，原因已同步关联案例'); onClose();
  };
  return <div className="hn-metadata-dialog"><Drawer title={official ? '维护标签' : '确认标签建议'} subtitle={field?.name} onClose={onClose} actions={<>
    <button className="ufsp-btn" onClick={onClose}>取消</button>
    {stopped ? <button className="ufsp-btn ufsp-btn-primary" onClick={() => { updateGovernance(s => ({ ...s, tags: s.tags.map(t => t.id === form.id ? { ...t, status: '已生效' } : t) })); onClose(); }}>重新启用</button> : official ? <><button className="ufsp-btn ufsp-btn-secondary" onClick={() => setConfirmation(() => () => { updateGovernance(s => ({ ...s, tags: s.tags.map(t => t.id === form.id ? { ...t, status: '已停用' } : t) })); onNotice('已停用，历史引用保留'); onClose(); })}>停用</button><button className="ufsp-btn ufsp-btn-primary" onClick={() => save(false)}>保存</button></> : <>
      {existing && <button className="ufsp-btn" onClick={() => decide('reject')}>退回</button>}
      <button className="ufsp-btn ufsp-btn-secondary" onClick={() => save(false)}>仅保存建议</button>
      <button className="ufsp-btn ufsp-btn-primary" onClick={() => setConfirmation(() => () => { setConfirmation(null); save(true); })}>{onResolved ? '新增并用于当前字段' : '确认生效'}</button>
    </>}
  </>}>
    {!official && <><section className="hn-drawer-section hn-tag-proposal"><h3>建议标签 <span className="case-badge is-warning">{form.review}</span></h3><strong>{form.name || '尚未填写建议名称'}</strong><p>{form.definition || '请先比较现有值；确需新增时补充定义和来源依据。'}</p><h4>原文 / 标准依据</h4><blockquote>{form.evidence || '尚未补充依据'}</blockquote></section>
    <section className="hn-drawer-section hn-tag-existing"><h3>优先采用现有标签</h3><label className="ufsp-field-block"><span>{field?.name}的已生效值</span><select aria-label="选择现有标签" value={target} onChange={e => setTarget(e.target.value)}><option value="">请选择</option>{options.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label>{target && <p>{options.find(t => t.id === target)?.definition || '该值已在正式目录中生效'}</p>}<button className="ufsp-btn ufsp-btn-secondary" disabled={!target} onClick={() => decide('merge')}>采用现有标签并返回</button></section></>}
    <details className="hn-tag-definition" open={official || !form.name ? true : undefined}><summary>{official ? '标签定义' : '确需新增：完善标签定义'}</summary><section className="hn-drawer-section"><div className="hn-metadata-form-grid">
      <label className="ufsp-field-block"><span>所属元数据</span><select value={form.fieldCode} disabled={!!existing || !!seed?.fieldCode} onChange={e => setForm({ ...form, fieldCode: e.target.value })}>{fields.filter(f => f.asTag && f.status === '已生效').map(f => <option key={f.code} value={f.code}>{f.name}</option>)}</select></label>
      <label className="ufsp-field-block"><span>取值方式</span><input readOnly value={field?.mode || '—'} /></label>
      <label className="ufsp-field-block hn-field-wide"><span>标签名称</span><input value={form.name} readOnly={official || stopped} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label className="ufsp-field-block hn-field-wide"><span>业务定义</span><textarea value={form.definition} onChange={e => setForm({ ...form, definition: e.target.value })} /></label>
      <label className="ufsp-field-block hn-field-wide"><span>别名（每行一个）</span><textarea value={form.aliases.join('\n')} onChange={e => setForm({ ...form, aliases: e.target.value.split('\n').filter(Boolean) })} /></label>
      <label className="ufsp-field-block hn-field-wide"><span>原文或标准依据</span><textarea value={form.evidence} onChange={e => setForm({ ...form, evidence: e.target.value })} /></label>
    </div></section></details>
    {!official && <section className="hn-drawer-section"><label className="ufsp-field-block"><span>处理说明 / 退回原因</span><textarea value={reason} onChange={e => setReason(e.target.value)} /></label><p className="hn-upload-footnote">采用现有值或确认新增后回填关联字段；案例仍需校验入库。仅保存建议不会采用该值。</p></section>}
    {form.bindings.length > 0 && <section className="hn-drawer-section"><h3>关联案例</h3>{[...new Set(form.bindings.map(b => b.caseId))].map(caseId => <p key={caseId}><button className="case-title-link" onClick={() => { updateGovernance(s => ({ ...s, focusCase: caseId })); onNavigate?.('entry'); }}>{cases.find(c => c.id === caseId)?.title || caseId}</button></p>)}</section>}
    {field?.mode === '固定目录' && <button className="case-title-link" onClick={() => { recordFeedback('元数据', field.code, form.evidence || '固定目录待核对'); onNavigate?.('metadata', field.code); }}>提交标准调整依据</button>}
  </Drawer>{confirmation && <ConfirmAction title={official ? '停用此标签？' : '确认标签生效？'} onClose={() => setConfirmation(null)} onConfirm={confirmation}>请核对现有值和依据。此操作不直接覆盖已入库案例；关联未入库案例继续校验。</ConfirmAction>}</div>;
}

export function SmartTagManagement({ onNotice, onNavigate }: NoticeProps) {
  const { fields, tags, cases, focusField } = useGovernance();
  const [tab, setTab] = useState('已生效'); const [catalog, setCatalog] = useState(focusField || '全部标签');
  const [query, setQuery] = useState(''); const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ id?: string; seed?: Partial<TagValue> } | null>(null);
  const enabled = fields.filter(f => f.asTag && f.status === '已生效');
  const available = tags.filter(t => enabled.some(f => f.code === t.fieldCode));
  const inTab = available.filter(t => tab === '全部' || t.status === tab);
  const rows = inTab.filter(t => (catalog === '全部标签' || t.fieldCode === catalog || fields.find(f => f.code === t.fieldCode)?.group === catalog) && [t.name, t.fieldCode, ...t.aliases].join(' ').includes(query.trim()));
  const items: Array<[string, number, boolean?, string?]> = [['全部标签', inTab.length]];
  METADATA_GROUPS.forEach(group => {
    const groupFields = enabled.filter(f => f.group === group);
    if (groupFields.length) items.push([group, inTab.filter(t => groupFields.some(f => f.code === t.fieldCode)).length, false, group]);
    groupFields.forEach(f => items.push([f.name, inTab.filter(t => t.fieldCode === f.code).length, true, f.code]));
  });
  useEffect(() => { if (focusField) { setCatalog(focusField); setTab('全部'); updateGovernance(s => ({ ...s, focusField: '' })); } }, [focusField]);
  return <div className="case-workspace hn-module-page hn-standard-management-page">
    <div className="case-tabs">{['已生效', '待生效', '已停用', '全部'].map(name => <button key={name} className={tab === name ? 'is-active' : ''} onClick={() => { setTab(name); setPage(1); }}>{name} ({available.filter(t => name === '全部' || t.status === name).length})</button>)}</div>
    <div className="hn-split-workspace"><Catalog title="标签维度" items={items} active={catalog} onChange={v => { setCatalog(v); setPage(1); }} /><section className="hn-list-region">
      <div className="case-list-toolbar"><div className="case-toolbar-left"><button className="ufsp-btn ufsp-btn-primary" onClick={() => setEditor({ seed: { fieldCode: enabled.find(f => f.code === catalog)?.code || enabled.find(f => f.mode === '可扩展目录')?.code } })}><RawIcon svg={actionAddIconSvg} />新增</button><button className="ufsp-btn ufsp-btn-secondary" onClick={() => exportCsv('标签目录', [['标签名称', '所属字段', '状态', '引用量'], ...rows.map(t => [t.name, t.fieldCode, t.status, String(tagUsage(t, cases))])])}><RawIcon svg={actionExportIconSvg} />导出</button></div><StandardSearchTools query={query} onQuery={v => { setQuery(v); setPage(1); }} onNotice={onNotice} /></div>
      <div className="case-table-wrap"><table className="case-table hn-standard-table hn-tag-standard-table"><thead><tr><th className="case-col-check">序号</th><th>标签名称</th><th>所属元数据</th><th>取值方式</th><th>别名</th><th>已入库引用</th><th>关联建议案例</th><th>状态</th><th className="case-col-actions">操作</th></tr></thead><tbody>{rows.slice((page - 1) * 20, page * 20).map((tag, index) => <tr key={tag.id}><td className="case-col-check">{(page - 1) * 20 + index + 1}</td><td><button className="case-title-link" onClick={() => setEditor({ id: tag.id })}>{tag.name}</button></td><td><button className="case-title-link" onClick={() => onNavigate?.('metadata', tag.fieldCode)}>{fields.find(f => f.code === tag.fieldCode)?.name}</button></td><td>{fields.find(f => f.code === tag.fieldCode)?.mode}</td><td title={tag.aliases.join('、')}>{tag.aliases.length}</td><td>{tagUsage(tag, cases)}</td><td>{new Set(tag.bindings.map(b => b.caseId)).size}</td><td><span className={'case-badge ' + (tag.status === '已生效' ? 'is-success' : 'is-warning')} title={tag.reason}>{tag.status === '待生效' ? tag.review : tag.status}</span></td><td className="case-col-actions"><button onClick={() => setEditor({ id: tag.id })}>{tag.status === '待生效' ? '处理' : '详情'}</button></td></tr>)}</tbody></table>{!rows.length && <div className="hn-metadata-empty">暂无符合条件的标签</div>}</div><Pagination total={rows.length} page={page} onPage={setPage} />
    </section></div>{editor && <TagEditor {...editor} onClose={() => setEditor(null)} onNotice={onNotice} onNavigate={onNavigate} />}
  </div>;
}

export function SearchFeedbackDialog({ subject, evidence, onClose, onNotice }: NoticeProps & { subject: string; evidence: string; onClose: () => void }) {
  const [kind, setKind] = useState('结果不相关'); const [detail, setDetail] = useState('');
  return <Drawer title="检索反馈" onClose={onClose} actions={<><button className="ufsp-btn" onClick={onClose}>取消</button><button className="ufsp-btn ufsp-btn-primary" onClick={() => { if (!detail.trim()) return onNotice('请补充问题说明'); recordFeedback('检索', subject, kind + '；' + detail.trim() + '；' + evidence); onNotice('反馈已保存到本地反馈记录，不会立即改变检索规则'); onClose(); }}>保存反馈</button></>}><section className="hn-drawer-section"><h3>{subject}</h3><label className="ufsp-field-block"><span>反馈类型</span><select value={kind} onChange={e => setKind(e.target.value)}>{['结果不相关', '遗漏相关案例', '元数据错误', '命中片段不完整', '结果有帮助'].map(v => <option key={v}>{v}</option>)}</select></label><label className="ufsp-field-block"><span>问题说明与建议</span><textarea value={detail} onChange={e => setDetail(e.target.value)} /></label></section></Drawer>;
}

function GovernanceAdvice({ onNotice, onField }: NoticeProps & { onField: (code: string) => void }) {
  const { feedback, advice, fields } = useGovernance();
  const [view, setView] = useState<'建议' | '反馈记录'>('建议');
  const [selected, setSelected] = useState<string | null>(null);
  const generate = () => {
    const fresh = feedback.filter(f => !f.analyzed);
    if (!fresh.length) return onNotice('没有尚未分析的反馈');
    // 本地演示分组；不伪装为真实 LLM 结论。
    const groups = new Map<string, typeof fresh>();
    fresh.forEach(f => { const key = fields.some(field => field.code === f.subject) ? f.subject : f.module; groups.set(key, [...(groups.get(key) || []), f]); });
    updateGovernance(s => ({ ...s, feedback: s.feedback.map(f => fresh.some(v => v.id === f.id) ? { ...f, analyzed: true } : f), advice: [...s.advice, ...[...groups].map(([key, values]) => ({ id: newId(), fieldCode: fields.find(f => f.code === key)?.code || '', title: '核对' + key + '相关反馈', evidenceIds: values.map(f => f.id), content: '请结合以下反馈核对问题原因，确认属于个案错误、目录缺项还是通用规则问题，再决定是否调整配置。', status: '待确认' as const }))] }));
    onNotice('已按来源分组展示待分析材料；本地原型未调用 LLM');
  };
  const current = advice.find(a => a.id === selected);
  return <section className="hn-list-region"><div className="case-list-toolbar"><div className="case-toolbar-left"><button className="ufsp-btn ufsp-btn-primary" onClick={generate}>分析新增反馈 ({feedback.filter(f => !f.analyzed).length})</button><button className="ufsp-btn ufsp-btn-secondary" onClick={() => setView(view === '建议' ? '反馈记录' : '建议')}>{view === '建议' ? '查看反馈记录' : '查看建议'}</button></div></div>
    <div className="case-table-wrap"><table className="case-table hn-standard-table"><thead><tr><th>{view === '建议' ? '建议事项' : '反馈对象'}</th><th>来源 / 依据</th><th>状态</th><th>操作</th></tr></thead><tbody>{view === '建议' ? advice.map(a => <tr key={a.id}><td>{a.title}</td><td>{a.evidenceIds.length} 条反馈</td><td>{a.status}</td><td><button className="case-title-link" onClick={() => setSelected(a.id)}>处理</button></td></tr>) : feedback.map(f => <tr key={f.id}><td>{f.module} · {f.subject}</td><td title={f.evidence}>{f.evidence}</td><td>{f.analyzed ? '已归入分析批次' : '未分析'}</td><td>{f.at}</td></tr>)}</tbody></table>{(view === '建议' ? !advice.length : !feedback.length) && <div className="hn-metadata-empty">暂无记录</div>}</div>
    {current && <Drawer title="处理规则建议" onClose={() => setSelected(null)} actions={<><button className="ufsp-btn" onClick={() => { updateGovernance(s => ({ ...s, advice: s.advice.map(a => a.id === current.id ? { ...a, status: '不采用' } : a) })); setSelected(null); }}>不采用</button>{current.fieldCode && <button className="ufsp-btn ufsp-btn-primary" onClick={() => { setSelected(null); onField(current.fieldCode); }}>核对字段配置</button>}</>}><section className="hn-drawer-section"><h3>{current.title}</h3><p>{current.content}</p></section><section className="hn-drawer-section"><h3>来源依据</h3>{feedback.filter(f => current.evidenceIds.includes(f.id)).map(f => <p key={f.id}>{f.subject}：{f.evidence}</p>)}</section></Drawer>}
  </section>;
}
