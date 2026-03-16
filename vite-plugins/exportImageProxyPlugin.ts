import type { Plugin } from 'vite';

import { getRequestPathname, serializeErrorForLog } from './utils/httpUtils';
import { isAllowedProxyImageUrl } from './utils/proxyUtils';

export function exportImageProxyPlugin(): Plugin {
  return {
    name: 'export-image-proxy-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (req.method !== 'GET' || pathname !== '/api/export/image-proxy') {
          return next();
        }

        const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const targetUrl = String(requestUrl.searchParams.get('url') || '').trim();

        if (!targetUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Missing url query parameter' }));
          return;
        }

        if (!isAllowedProxyImageUrl(targetUrl)) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Unsupported proxy target url' }));
          return;
        }

        try {
          const upstreamResponse = await fetch(targetUrl, {
            method: 'GET',
            redirect: 'follow',
            headers: {
              Accept: 'image/*,*/*;q=0.8',
              'User-Agent': 'AxhubMakeExportProxy/1.0',
            },
          });

          if (!upstreamResponse.ok) {
            res.statusCode = upstreamResponse.status;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              error: `Upstream responded with ${upstreamResponse.status}`,
              targetUrl,
            }));
            return;
          }

          const contentType = String(upstreamResponse.headers.get('content-type') || '').toLowerCase();
          if (contentType && !contentType.startsWith('image/')) {
            res.statusCode = 415;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              error: `Unsupported upstream content-type: ${contentType}`,
              targetUrl,
            }));
            return;
          }

          const body = Buffer.from(await upstreamResponse.arrayBuffer());

          res.statusCode = 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', upstreamResponse.headers.get('cache-control') || 'public, max-age=600');
          res.setHeader('Content-Type', contentType || 'application/octet-stream');
          res.setHeader('Content-Length', String(body.byteLength));

          const etag = upstreamResponse.headers.get('etag');
          if (etag) {
            res.setHeader('ETag', etag);
          }

          const lastModified = upstreamResponse.headers.get('last-modified');
          if (lastModified) {
            res.setHeader('Last-Modified', lastModified);
          }

          res.end(body);
        } catch (error: any) {
          console.error('[export-image-proxy] request failed', {
            targetUrl,
            error: serializeErrorForLog(error),
          });

          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            error: error?.message || 'Failed to fetch target image',
            targetUrl,
          }));
        }
      });
    },
  };
}
