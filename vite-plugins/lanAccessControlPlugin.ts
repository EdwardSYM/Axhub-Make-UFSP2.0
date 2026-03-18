import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

import { MAKE_CONFIG_RELATIVE_PATH } from './utils/makeConstants';

export function lanAccessControlPlugin(): Plugin {
  let allowLAN = true;

  return {
    name: 'lan-access-control',
    configResolved() {
      const configPath = path.resolve(process.cwd(), MAKE_CONFIG_RELATIVE_PATH);

      if (fs.existsSync(configPath)) {
        try {
          const axhubConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          allowLAN = axhubConfig.server?.allowLAN !== false;
          console.log(`🔒 局域网访问控制: ${allowLAN ? '允许' : '禁止'}`);
        } catch {
          // Ignore config parse errors and keep default.
        }
      }
    },
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (allowLAN) {
          return next();
        }

        const clientIP = req.socket.remoteAddress || req.connection.remoteAddress;
        const localIPs = [
          '127.0.0.1',
          '::1',
          '::ffff:127.0.0.1',
          'localhost',
        ];
        const isLocalAccess = localIPs.some((ip) => clientIP?.includes(ip));

        if (!isLocalAccess) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>访问被拒绝</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .container {
                  background: white;
                  padding: 40px;
                  border-radius: 10px;
                  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                  text-align: center;
                  max-width: 500px;
                }
                h1 {
                  color: #e74c3c;
                  margin: 0 0 20px 0;
                }
                p {
                  color: #666;
                  line-height: 1.6;
                }
                .ip {
                  background: #f5f5f5;
                  padding: 10px;
                  border-radius: 5px;
                  font-family: monospace;
                  margin: 20px 0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🚫 访问被拒绝</h1>
                <p>此服务器已禁用局域网访问。</p>
                <p>只允许本地访问（localhost/127.0.0.1）。</p>
                <div class="ip">您的 IP: ${clientIP}</div>
                <p style="font-size: 12px; color: #999;">
                  如需允许局域网访问，请在配置文件中设置 allowLAN: true 并重启服务器
                </p>
              </div>
            </body>
            </html>
          `);
          return;
        }

        next();
      });
    },
  };
}
