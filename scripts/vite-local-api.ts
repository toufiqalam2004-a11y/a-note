import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer, loadEnv, type Plugin, type ViteDevServer } from 'vite';

/**
 * Local-only stand-in for Vercel Functions.
 *
 * Routes /api/<name> to the `GET`/`POST` export of api/<name>.ts during
 * `npm run dev` and `npm run preview`, exactly as Vercel does in production.
 * Server env vars (DATABASE_URL, ADMIN_PASSWORD, ...) are loaded into the
 * Node process only; Vite still exposes nothing but VITE_* vars to the browser.
 * This plugin is never part of the production bundle or the deployment.
 */

type Loader = () => Promise<ViteDevServer>;

function loadServerEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function middleware(getLoader: Loader) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (!url.pathname.startsWith('/api/')) return next();

    const route = url.pathname.slice('/api/'.length).replace(/\/+$/, '');
    const segments = route.split('/');
    if (!/^[a-z0-9/_-]+$/i.test(route) || segments.some((s) => !s || s.startsWith('_'))) {
      return sendJson(res, 404, { ok: false, error: 'Not found' });
    }
    const file = path.resolve('api', `${route}.ts`);
    if (!fs.existsSync(file)) return sendJson(res, 404, { ok: false, error: 'Not found' });

    try {
      const mod = await (await getLoader()).ssrLoadModule(file);
      const method = (req.method || 'GET').toUpperCase();
      const handler = mod[method];
      if (typeof handler !== 'function') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
      if (!headers.has('x-forwarded-for')) headers.set('x-forwarded-for', req.socket.remoteAddress || '127.0.0.1');

      const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req);
      const response: Response = await handler(new Request(url, { method, headers, body }));

      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        if (key !== 'set-cookie') res.setHeader(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader('Set-Cookie', cookies);
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      console.error('[local-api]', err);
      sendJson(res, 500, { ok: false, error: 'Local API error' });
    }
  };
}

export function localApi(): Plugin {
  let mode = 'development';
  let previewLoader: ViteDevServer | null = null;

  return {
    name: 'anote-local-api',
    configResolved(config) {
      mode = config.mode;
    },
    configureServer(server) {
      loadServerEnv(mode);
      server.middlewares.use(middleware(async () => server));
    },
    configurePreviewServer(server) {
      loadServerEnv(mode);
      server.middlewares.use(
        middleware(async () => {
          previewLoader ??= await createServer({
            configFile: false,
            appType: 'custom',
            logLevel: 'error',
            server: { middlewareMode: true, hmr: false },
          });
          return previewLoader;
        }),
      );
    },
  };
}
