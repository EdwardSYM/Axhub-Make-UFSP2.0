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
          let upstreamResponse: any;

          if (isAvailableRoute) {
            upstreamResponse = await fetch(upstreamUrl, {
              method: 'GET',
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

            upstreamResponse = await fetch(upstreamUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Length': String(payloadBytes),
              },
              body: requestBuffer,
            });
          }

          const contentType = String(upstreamResponse.headers.get('content-type') || '').toLowerCase();
          const responseText = await upstreamResponse.text();

          if (!upstreamResponse.ok) {
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
