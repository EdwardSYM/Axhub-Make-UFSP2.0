import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

const SEARCH_ROUTE = '/api/hunan-case-search';
const FILTER_OPTIONS_ROUTE = '/api/hunan-case-search/filters';
const DEFAULT_DIFY_BASE_URL = 'https://api.dify.ai/v1';
const METADATA_CACHE_TTL = 5 * 60 * 1000;

type SearchFilters = {
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

type MetadataOption = { value: string; count: number };
type MetadataCache = { expiresAt: number; value: Record<string, MetadataOption[]> } | null;

let metadataCache: MetadataCache = null;

function sendJson(res: any, statusCode: number, data: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function readJsonBody(req: any): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8');
      if (body.length > 16 * 1024) {
        reject(new Error('REQUEST_TOO_LARGE'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

function parseWorkflowResult(value: unknown): Record<string, unknown> {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('INVALID_WORKFLOW_RESULT');
  }
  return parsed as Record<string, unknown>;
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function textList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((item) => textValue(item).split('|').map((part) => part.trim()).filter(Boolean));
}

function normalizeFilters(value: unknown): SearchFilters {
  const filters = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    year: textValue(filters.year),
    documentType: textValue(filters.documentType),
    supervisionDomain: textValue(filters.supervisionDomain),
    violationTypes: textList(filters.violationTypes),
    documentNo: textValue(filters.documentNo),
    relatedUnit: textValue(filters.relatedUnit),
    issueDateStart: textValue(filters.issueDateStart),
    issueDateEnd: textValue(filters.issueDateEnd),
    handlingMethods: textList(filters.handlingMethods),
    policyBasis: textValue(filters.policyBasis),
  };
}

function includesText(value: unknown, query: string): boolean {
  return !query || textValue(value).toLocaleLowerCase('zh-CN').includes(query.toLocaleLowerCase('zh-CN'));
}

function matchesAny(value: unknown, selected: string[]): boolean {
  if (!selected.length) return true;
  const candidates = textList(value);
  return selected.some((item) => candidates.includes(item));
}

function matchesFilters(value: unknown, filters: SearchFilters): boolean {
  const item = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const itemYear = textValue(item.year) || textValue(item.issue_date).slice(0, 4);
  const issueDate = textValue(item.issue_date);
  return (!filters.year || itemYear === filters.year)
    && (!filters.documentType || textValue(item.document_type) === filters.documentType)
    && (!filters.supervisionDomain || textValue(item.supervision_domain) === filters.supervisionDomain)
    && matchesAny(item.violation_type, filters.violationTypes || [])
    && includesText(item.document_no, filters.documentNo || '')
    && includesText(item.organization || item.related_unit, filters.relatedUnit || '')
    && (!filters.issueDateStart || Boolean(issueDate) && issueDate >= filters.issueDateStart)
    && (!filters.issueDateEnd || Boolean(issueDate) && issueDate <= filters.issueDateEnd)
    && matchesAny(item.handling_method, filters.handlingMethods || [])
    && includesText(item.policy_basis, filters.policyBasis || '');
}

function addOption(target: Map<string, number>, value: unknown) {
  for (const item of textList(value)) target.set(item, (target.get(item) || 0) + 1);
}

function optionList(values: Map<string, number>, sort?: (left: string, right: string) => number): MetadataOption[] {
  return [...values.entries()]
    .sort(([left], [right]) => sort ? sort(left, right) : left.localeCompare(right, 'zh-CN'))
    .map(([value, count]) => ({ value, count }));
}

async function fetchMetadataOptions(baseUrl: string, apiKey: string, datasetId: string) {
  if (metadataCache && metadataCache.expiresAt > Date.now()) return metadataCache.value;

  const documents: any[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(`${baseUrl}/datasets/${encodeURIComponent(datasetId)}/documents?page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || 'KNOWLEDGE_METADATA_UNAVAILABLE');
    const pageDocuments = Array.isArray(payload?.data) ? payload.data : [];
    documents.push(...pageDocuments);
    if (!payload?.has_more || pageDocuments.length === 0) break;
  }

  const fields = {
    years: new Map<string, number>(),
    documentTypes: new Map<string, number>(),
    supervisionDomains: new Map<string, number>(),
    violationTypes: new Map<string, number>(),
    handlingMethods: new Map<string, number>(),
    relatedUnits: new Map<string, number>(),
    policyBasis: new Map<string, number>(),
  };

  for (const document of documents) {
    const metadata = new Map<string, unknown>();
    for (const item of Array.isArray(document?.doc_metadata) ? document.doc_metadata : []) {
      const name = textValue(item?.name || item?.key);
      if (name) metadata.set(name, item?.value);
    }
    addOption(fields.years, metadata.get('year'));
    addOption(fields.documentTypes, metadata.get('document_type'));
    addOption(fields.supervisionDomains, metadata.get('supervision_domain'));
    addOption(fields.violationTypes, metadata.get('violation_type'));
    addOption(fields.handlingMethods, metadata.get('handling_method'));
    addOption(fields.relatedUnits, metadata.get('related_unit'));
    addOption(fields.policyBasis, metadata.get('policy_basis'));
  }

  const value = {
    years: optionList(fields.years, (left, right) => right.localeCompare(left, 'zh-CN')),
    documentTypes: optionList(fields.documentTypes),
    supervisionDomains: optionList(fields.supervisionDomains),
    violationTypes: optionList(fields.violationTypes),
    handlingMethods: optionList(fields.handlingMethods),
    relatedUnits: optionList(fields.relatedUnits),
    policyBasis: optionList(fields.policyBasis),
  };
  metadataCache = { expiresAt: Date.now() + METADATA_CACHE_TTL, value };
  return value;
}

export function difyWorkflowProxyPlugin(): Plugin {
  let mode = 'development';

  const readRuntimeConfig = () => {
    const env = loadEnv(mode, process.cwd(), 'DIFY_');
    return {
      apiKey: process.env.DIFY_API_KEY || env.DIFY_API_KEY || '',
      knowledgeApiKey: process.env.DIFY_KNOWLEDGE_API_KEY || env.DIFY_KNOWLEDGE_API_KEY || '',
      knowledgeDatasetId: process.env.DIFY_KNOWLEDGE_DATASET_ID || env.DIFY_KNOWLEDGE_DATASET_ID || '',
      baseUrl: (process.env.DIFY_API_BASE_URL || env.DIFY_API_BASE_URL || DEFAULT_DIFY_BASE_URL).replace(/\/$/, ''),
    };
  };

  const installMiddleware = (server: any) => {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      if (requestUrl.pathname !== SEARCH_ROUTE && requestUrl.pathname !== FILTER_OPTIONS_ROUTE) return next();

      const runtimeConfig = readRuntimeConfig();
      if (requestUrl.pathname === FILTER_OPTIONS_ROUTE) {
        if (req.method !== 'GET') {
          sendJson(res, 405, { message: '仅支持 GET 请求' });
          return;
        }
        if (!runtimeConfig.knowledgeApiKey || !runtimeConfig.knowledgeDatasetId) {
          sendJson(res, 503, { message: '知识库元数据服务尚未配置' });
          return;
        }
        try {
          sendJson(res, 200, await fetchMetadataOptions(runtimeConfig.baseUrl, runtimeConfig.knowledgeApiKey, runtimeConfig.knowledgeDatasetId));
        } catch (error: any) {
          console.error('[dify-case-search] metadata request failed', { message: error?.message || 'Unknown error' });
          sendJson(res, 502, { message: '知识库筛选项读取失败，请稍后重试' });
        }
        return;
      }

      if (req.method !== 'POST') {
        sendJson(res, 405, { message: '仅支持 POST 请求' });
        return;
      }

      const { apiKey, baseUrl } = runtimeConfig;
      if (!apiKey) {
        sendJson(res, 503, { message: '案例检索服务尚未配置 Dify API Key' });
        return;
      }

      let body: Record<string, unknown>;
      try {
        body = await readJsonBody(req);
      } catch (error: any) {
        const status = error?.message === 'REQUEST_TOO_LARGE' ? 413 : 400;
        sendJson(res, status, { message: status === 413 ? '检索内容过长' : '请求格式不正确' });
        return;
      }

      const query = typeof body.query === 'string' ? body.query.trim() : '';
      const filters = normalizeFilters(body.filters);
      if (!query) {
        sendJson(res, 400, { message: '请输入检索内容' });
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      try {
        const upstreamResponse = await fetch(`${baseUrl}/workflows/run`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: { query },
            response_mode: 'blocking',
            user: 'demo-user',
          }),
          signal: controller.signal,
        });

        const envelope = await upstreamResponse.json().catch(() => null);
        if (!upstreamResponse.ok) {
          console.error('[dify-case-search] upstream request failed', {
            status: upstreamResponse.status,
            message: envelope?.message || envelope?.error || 'Unknown upstream error',
          });
          sendJson(res, 502, { message: '案例检索服务暂时不可用，请稍后重试' });
          return;
        }

        const result = parseWorkflowResult(envelope?.data?.outputs?.result);
        const candidates = Array.isArray(result.results) ? result.results : [];
        const results = candidates.filter((item) => matchesFilters(item, filters));
        sendJson(res, 200, {
          total: results.length,
          results,
        });
      } catch (error: any) {
        const timedOut = error?.name === 'AbortError';
        console.error('[dify-case-search] request failed', {
          timedOut,
          message: error?.message || 'Unknown error',
        });
        sendJson(res, timedOut ? 504 : 502, {
          message: timedOut ? '案例检索超时，请稍后重试' : '案例检索返回格式异常，请稍后重试',
        });
      } finally {
        clearTimeout(timeout);
      }
    });
  };

  return {
    name: 'dify-workflow-proxy-plugin',
    configResolved(config) {
      mode = config.mode;
    },
    configureServer(server) {
      installMiddleware(server);
    },
    configurePreviewServer(server) {
      installMiddleware(server);
    },
  };
}
