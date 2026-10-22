/**
 * A tiny static file server with single-page-app fallback, used by the
 * screenshot script. It only serves files inside `root`.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

export interface RunningServer {
  url: string;
  close: () => Promise<void>;
}

export async function serveStatic(
  root: string,
  port: number,
  basePath = '/',
): Promise<RunningServer> {
  const rootDir = resolve(root);
  const server: Server = createServer((request, response) => {
    void (async () => {
      let pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      if (basePath !== '/' && pathname.startsWith(basePath))
        pathname = `/${pathname.slice(basePath.length)}`;
      let file = resolve(join(rootDir, normalize(pathname)));
      if (file !== rootDir && !file.startsWith(rootDir + sep)) {
        response.writeHead(403).end();
        return;
      }
      try {
        const info = await stat(file);
        if (info.isDirectory()) file = join(file, 'index.html');
        await stat(file);
      } catch {
        file = join(rootDir, 'index.html'); // single-page-app fallback
      }
      response.writeHead(200, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      });
      createReadStream(file).pipe(response);
    })();
  });
  await new Promise<void>((done) => server.listen(port, '127.0.0.1', done));
  return {
    url: `http://127.0.0.1:${port}${basePath}`,
    close: () => new Promise<void>((done) => server.close(() => done())),
  };
}
