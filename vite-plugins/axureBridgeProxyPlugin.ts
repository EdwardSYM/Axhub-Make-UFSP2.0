import * as http from 'node:http';
import * as https from 'node:https';
import type { Plugin } from 'vite';

import {
  getRequestPathname,
  readErrorString,
  readRequestBody,
  serializeErrorForLog,
} from './utils/httpUtils';
import { AXURE_BRIDGE_BASE_URL } from './utils/makeConstants';
import {
  formatAxureProxyErrorDetails,
  limitErrorText,
  normalizeAxvgPayloadText,
} from './utils/proxyUtils';

type UpstreamResponse = {
  status: number;
  statusText: string;
  headers: http.IncomingHttpHeaders;
  bodyText: string;
};

function readHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value || '');
}

async function requestAxureBridge(
  upstreamUrl: string,
  options: {
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: Buffer;
    timeoutMs?: number;
  },
): Promise<UpstreamResponse> {
  const targetUrl = new URL(upstreamUrl);
  const transport = targetUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.request(
      {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port ? Number(targetUrl.port) : undefined,
        path: `${targetUrl.pathname}${targetUrl.search}`,
        method: options.method,
        headers: {
          Connection: 'close',
          ...options.headers,
        },
        agent: false,
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on('end', () => {
          resolve({
            status: response.statusCode || 502,
            statusText: response.statusMessage || '',
            headers: response.headers,
            bodyText: Buffer.concat(chunks).toString('utf8'),
          });
        });
        response.on('error', reject);
      },
    );

    request.setTimeout(options.timeoutMs ?? 15_000, () => {
      request.destroy(new Error(`Axure Bridge request timed out after ${options.timeoutMs ?? 15_000}ms`));
    });
    request.on('error', reject);

    if (options.body && options.body.length > 0) {
      request.write(options.body);
    }

    request.end();
  });
}

async function requestAxureBridgeWithRetry(
  upstreamUrl: string,
  options: {
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: Buffer;
    timeoutMs?: number;
  },
): Promise<UpstreamResponse> {
  try {
    return await requestAxureBridge(upstreamUrl, options);
  } catch (error: any) {
    const code = error?.code || error?.cause?.code;
    if (code !== 'ECONNRESET') {
      throw error;
    }

    return requestAxureBridge(upstreamUrl, options);
  }
}

export function axureBridgeProxyPlugin(): Plugin {
  return {
    name: 'axure-bridge-proxy-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        const isAvailableRoute = req.method === 'GET' && pathname === '/api/axure-bridge/available';
        const isCopyRoute = req.method === 'POST' && pathname === '/api/axure-bridge/copyaxvg';

        if (!isAvailableRoute && !isCopyRoute) {
          return next();
        }

        const upstreamUrl = isAvailableRoute
          ? `${AXURE_BRIDGE_BASE_URL}/available`
          : `${AXURE_BRIDGE_BASE_URL}/copyaxvg`;
        let payloadBytes = 0;

        try {
          let upstreamResponse: UpstreamResponse;

          if (isAvailableRoute) {
            upstreamResponse = await requestAxureBridgeWithRetry(upstreamUrl, {
              method: 'GET',
              timeoutMs: 5_000,
            });
          } else {
            let rawBody = '';
            try {
              rawBody = await readRequestBody(req);
            } catch (error: any) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: error?.message || 'Invalid request body' }));
              return;
            }

            const requestBody = normalizeAxvgPayloadText(rawBody);
            const requestBuffer = Buffer.from(requestBody, 'utf8');
            payloadBytes = requestBuffer.byteLength;

            upstreamResponse = await requestAxureBridgeWithRetry(upstreamUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Length': String(payloadBytes),
              },
              body: requestBuffer,
              timeoutMs: 30_000,
            });
          }

          const contentType = readHeaderValue(upstreamResponse.headers['content-type']).toLowerCase();
          const responseText = upstreamResponse.bodyText;

          if (upstreamResponse.status < 200 || upstreamResponse.status >= 300) {
            console.warn('[axure-bridge-proxy] upstream responded with error', {
              route: pathname,
              method: req.method,
              upstreamUrl,
              payloadBytes: payloadBytes || undefined,
              status: upstreamResponse.status,
              statusText: upstreamResponse.statusText,
              bodyPreview: limitErrorText(readErrorString(responseText), 800) || undefined,
            });
          }

          res.statusCode = upstreamResponse.status;
          res.setHeader('Cache-Control', 'no-store');

          if (contentType.includes('application/json')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(responseText || '{}');
            return;
          }

          if (responseText) {
            try {
              const parsed = JSON.parse(responseText);
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(parsed));
              return;
            } catch {
              // Pass through non-JSON text responses.
            }
          }

          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(responseText);
        } catch (error: any) {
          const errorLog = serializeErrorForLog(error);
          console.error('[axure-bridge-proxy] upstream request failed', {
            route: pathname,
            method: req.method,
            upstreamUrl,
            payloadBytes: payloadBytes || undefined,
            error: errorLog,
          });

          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            error: error?.message || 'Axure Bridge unavailable',
            details: formatAxureProxyErrorDetails(error),
            code: errorLog.code || errorLog.causeCode || undefined,
            causeMessage: errorLog.causeMessage || undefined,
            route: pathname,
            method: req.method,
            bridgeUrl: upstreamUrl,
            payloadBytes: payloadBytes || undefined,
          }));
        }
      });
    },
  };
}
