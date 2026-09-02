export type CaseSearchHitChunk = Record<string, unknown>;

export type CaseSearchItem = {
  id: string;
  documentId: string;
  title: string;
  code: string;
  type: string;
  date: string;
  unit: string;
  year: number | null;
  score: number | null;
  excerpt: string;
  supervisionDomain: string;
  violationTypes: string[];
  handlingMethods: string[];
  policyBasis: string[];
  hitChunks: CaseSearchHitChunk[];
};

export type CaseSearchResponse = {
  total: number;
  results: CaseSearchItem[];
};

export type CaseSearchFilters = {
  year?: string;
  documentType?: string;
  supervisionDomain?: string;
  violationTypes?: string[];
  documentNo?: string;
  relatedUnit?: string;
  issueDateStart?: string;
  issueDateEnd?: string;
  handlingMethods?: string[];
  policyBasis?: string;
};

export type CaseSearchFilterOption = { value: string; count: number };

export type CaseSearchFilterOptions = {
  years: CaseSearchFilterOption[];
  documentTypes: CaseSearchFilterOption[];
  supervisionDomains: CaseSearchFilterOption[];
  violationTypes: CaseSearchFilterOption[];
  handlingMethods: CaseSearchFilterOption[];
  relatedUnits: CaseSearchFilterOption[];
  policyBasis: CaseSearchFilterOption[];
};

export const EMPTY_FILTER_OPTIONS: CaseSearchFilterOptions = {
  years: [],
  documentTypes: [],
  supervisionDomains: [],
  violationTypes: [],
  handlingMethods: [],
  relatedUnits: [],
  policyBasis: [],
};

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function stringList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((item) => stringValue(item).split('|').map((part) => part.trim()).filter(Boolean));
}

function numberValue(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeItem(value: unknown, index: number): CaseSearchItem {
  const item = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const documentId = stringValue(item.document_id);
  const code = stringValue(item.document_no);
  const title = stringValue(item.title) || '未命名文书';

  return {
    id: documentId || code || `search-result-${index + 1}`,
    documentId,
    title,
    code,
    type: stringValue(item.document_type),
    date: stringValue(item.issue_date),
    unit: stringValue(item.organization || item.related_unit),
    year: numberValue(item.year),
    score: numberValue(item.score),
    excerpt: stringValue(item.excerpt),
    supervisionDomain: stringValue(item.supervision_domain),
    violationTypes: stringList(item.violation_type),
    handlingMethods: stringList(item.handling_method),
    policyBasis: stringList(item.policy_basis),
    hitChunks: Array.isArray(item.hit_chunks)
      ? item.hit_chunks.filter((chunk) => chunk && typeof chunk === 'object') as CaseSearchHitChunk[]
      : [],
  };
}

async function readResponsePayload(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('当前运行地址未连接湖南案例检索服务，请使用已启动的 51729 演示地址重新打开');
  }
  return response.json();
}

function readErrorMessage(payload: any): string {
  return typeof payload?.message === 'string' ? payload.message : '案例检索失败，请稍后重试';
}

export async function searchCases(query: string, filters: CaseSearchFilters = {}, signal?: AbortSignal): Promise<CaseSearchResponse> {
  const response = await fetch('/api/hunan-case-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, filters }),
    signal,
  });
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new Error(readErrorMessage(payload));
  }

  const rawResults = Array.isArray(payload?.results) ? payload.results : [];
  const results = rawResults.map(normalizeItem);
  const totalValue = Number(payload?.total);

  return {
    total: Number.isFinite(totalValue) ? totalValue : results.length,
    results,
  };
}

export async function getCaseSearchFilterOptions(signal?: AbortSignal): Promise<CaseSearchFilterOptions> {
  const response = await fetch('/api/hunan-case-search/filters', { signal });
  const payload = await readResponsePayload(response);
  if (!response.ok) throw new Error(readErrorMessage(payload));
  const readOptions = (value: unknown): CaseSearchFilterOption[] => Array.isArray(value)
    ? value.filter((item) => item && typeof item.value === 'string').map((item) => ({ value: item.value, count: Number(item.count) || 0 }))
    : [];
  return {
    years: readOptions(payload?.years),
    documentTypes: readOptions(payload?.documentTypes),
    supervisionDomains: readOptions(payload?.supervisionDomains),
    violationTypes: readOptions(payload?.violationTypes),
    handlingMethods: readOptions(payload?.handlingMethods),
    relatedUnits: readOptions(payload?.relatedUnits),
    policyBasis: readOptions(payload?.policyBasis),
  };
}
