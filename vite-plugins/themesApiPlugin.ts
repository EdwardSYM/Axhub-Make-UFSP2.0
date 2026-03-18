import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

import { getRequestPathname, readJsonBody } from './utils/httpUtils';

export function themesApiPlugin(): Plugin {
  return {
    name: 'themes-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const pathname = getRequestPathname(req);
        if (!pathname.startsWith('/api/themes')) {
          return next();
        }

        if (req.method === 'DELETE' && pathname !== '/api/themes' && pathname !== '/api/themes/') {
          try {
            const themeName = pathname.replace('/api/themes/', '');
            if (!themeName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing theme name' }));
              return;
            }

            const themesDir = path.resolve(process.cwd(), 'src/themes');
            const themeDir = path.join(themesDir, themeName);

            if (!themeDir.startsWith(themesDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            if (!fs.existsSync(themeDir)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Theme not found' }));
              return;
            }

            fs.rmSync(themeDir, { recursive: true, force: true });
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (error: any) {
            console.error('Error deleting theme:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        if (req.method === 'PUT' && pathname !== '/api/themes' && pathname !== '/api/themes/') {
          (async () => {
            try {
              const themeName = pathname.replace('/api/themes/', '');
              if (!themeName) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing theme name' }));
                return;
              }

              const body = await readJsonBody(req);
              const displayName = (body?.displayName || '').trim();
              if (!displayName) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing displayName' }));
                return;
              }

              const themesDir = path.resolve(process.cwd(), 'src/themes');
              const themeDir = path.join(themesDir, themeName);

              if (!themeDir.startsWith(themesDir)) {
                res.statusCode = 403;
                res.end(JSON.stringify({ error: 'Forbidden' }));
                return;
              }

              if (!fs.existsSync(themeDir)) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Theme not found' }));
                return;
              }

              const designTokenPath = path.join(themeDir, 'designToken.json');
              let designToken: any = {};
              if (fs.existsSync(designTokenPath)) {
                try {
                  designToken = JSON.parse(fs.readFileSync(designTokenPath, 'utf8'));
                } catch (error: any) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: error.message || 'Invalid designToken.json' }));
                  return;
                }
              }

              designToken.name = displayName;
              fs.writeFileSync(designTokenPath, JSON.stringify(designToken, null, 2));

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (error: any) {
              console.error('Error updating theme name:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: error.message }));
            }
          })();
          return;
        }

        if (req.method !== 'GET') {
          return next();
        }

        if (pathname !== '/api/themes' && pathname !== '/api/themes/') {
          try {
            const themeName = pathname.replace('/api/themes/', '');
            if (!themeName) {
              return next();
            }

            const themesDir = path.resolve(process.cwd(), 'src/themes');
            const themeDir = path.join(themesDir, themeName);

            if (!themeDir.startsWith(themesDir)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }

            if (fs.existsSync(themeDir) && fs.statSync(themeDir).isDirectory()) {
              const designTokenPath = path.join(themeDir, 'designToken.json');
              const indexHtmlPath = path.join(themeDir, 'index.html');

              const themeData: any = { name: themeName, displayName: themeName };

              if (fs.existsSync(designTokenPath)) {
                try {
                  const designToken = JSON.parse(fs.readFileSync(designTokenPath, 'utf8'));
                  themeData.designToken = designToken;
                  if (designToken && designToken.name) {
                    themeData.displayName = designToken.name;
                  }
                } catch (error) {
                  console.error('Error parsing designToken.json:', error);
                }
              }

              if (fs.existsSync(indexHtmlPath)) {
                themeData.indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(themeData));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Theme not found' }));
            }
          } catch (error: any) {
            console.error('Error loading theme:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }

        try {
          const themesDir = path.resolve(process.cwd(), 'src/themes');
          const themes: any[] = [];

          if (fs.existsSync(themesDir)) {
            const items = fs.readdirSync(themesDir, { withFileTypes: true });

            items.forEach((item) => {
              if (item.isDirectory()) {
                const themeDir = path.join(themesDir, item.name);
                const designTokenPath = path.join(themeDir, 'designToken.json');
                const globalsPath = path.join(themeDir, 'globals.css');
                const designSpecPath = path.join(themeDir, 'DESIGN-SPEC.md');
                const indexTsxPath = path.join(themeDir, 'index.tsx');
                let displayName = item.name;
                const hasDesignToken = fs.existsSync(designTokenPath);
                const hasGlobals = fs.existsSync(globalsPath);
                const hasDesignSpec = fs.existsSync(designSpecPath);
                const hasIndexTsx = fs.existsSync(indexTsxPath);

                if (hasDesignToken) {
                  try {
                    const designToken = JSON.parse(fs.readFileSync(designTokenPath, 'utf8'));
                    if (designToken && designToken.name) {
                      displayName = designToken.name;
                    }
                  } catch (error) {
                    console.error(`Error loading theme ${item.name} designToken:`, error);
                  }
                }

                let description = '';
                let hasDoc = false;
                const readmePath = path.join(themeDir, 'README.md');

                if (fs.existsSync(readmePath)) {
                  try {
                    const content = fs.readFileSync(readmePath, 'utf8');
                    const firstLine = content.split('\n')[0];
                    description = firstLine.replace(/^#\s*/, '').trim();
                    hasDoc = true;
                  } catch (error) {
                    console.warn(`Failed to read README.md for ${item.name}:`, error);
                  }
                } else if (fs.existsSync(designSpecPath)) {
                  try {
                    const content = fs.readFileSync(designSpecPath, 'utf8');
                    const firstLine = content.split('\n')[0];
                    description = firstLine.replace(/^#\s*/, '').trim();
                    hasDoc = true;
                  } catch (error) {
                    console.warn(`Failed to read DESIGN-SPEC.md for ${item.name}:`, error);
                  }
                }

                themes.push({
                  name: item.name,
                  displayName,
                  description,
                  hasDoc,
                  hasDesignToken,
                  hasGlobals,
                  hasDesignSpec,
                  hasIndexTsx,
                });
              }
            });
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(themes));
        } catch (error: any) {
          console.error('Error loading themes:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    },
  };
}
