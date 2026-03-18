import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

import { getLocalIP } from './utils/httpUtils';
import {
  MAKE_CONFIG_RELATIVE_PATH,
  MAKE_DEV_SERVER_INFO_RELATIVE_PATH,
} from './utils/makeConstants';

export function writeDevServerInfoPlugin(): Plugin {
  return {
    name: 'write-dev-server-info',
    configureServer(server: any) {
      server.httpServer?.once('listening', () => {
        try {
          const localIP = getLocalIP();
          const actualPort = server.httpServer?.address()?.port || server.config.server?.port || 5173;

          const configPath = path.resolve(process.cwd(), MAKE_CONFIG_RELATIVE_PATH);
          let displayHost = 'localhost';
          if (fs.existsSync(configPath)) {
            try {
              const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
              displayHost = config.server?.host || 'localhost';
            } catch {
              // Ignore config parse errors and keep default.
            }
          }

          const devServerInfo = {
            port: actualPort,
            host: displayHost,
            localIP,
            timestamp: new Date().toISOString(),
          };

          const infoPath = path.resolve(process.cwd(), MAKE_DEV_SERVER_INFO_RELATIVE_PATH);
          fs.mkdirSync(path.dirname(infoPath), { recursive: true });
          fs.writeFileSync(infoPath, JSON.stringify(devServerInfo, null, 2), 'utf8');

          console.log(`\n✅ Dev server info written to ${MAKE_DEV_SERVER_INFO_RELATIVE_PATH}`);
          console.log(`   Local:   http://${displayHost}:${actualPort}`);
          console.log(`   Network: http://${localIP}:${actualPort}\n`);
        } catch (error) {
          console.error('Failed to write dev server info:', error);
        }
      });
    },
  };
}
