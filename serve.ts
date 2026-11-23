// A tiny static file server for local play-testing (Node 22, standard
// library only). `node serve.ts` serves game/ at http://localhost:8080 so
// the game can be opened in a desktop browser exactly as a static host
// would serve it. Development convenience only.

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const port = 8080;

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const relative = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
  const filePath = join(gameRoot, relative === '' ? 'index.html' : relative);
  if (!filePath.startsWith(gameRoot + sep) && filePath !== gameRoot) {
    response.writeHead(403).end('forbidden');
    return;
  }
  const target = existsSync(filePath) && statSync(filePath).isDirectory()
    ? join(filePath, 'index.html')
    : filePath;
  if (!existsSync(target)) {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(target)] ?? 'application/octet-stream' });
  createReadStream(target).pipe(response);
});

server.listen(port, () => {
  console.log(`Emberfall Duel at http://localhost:${port}`);
});
