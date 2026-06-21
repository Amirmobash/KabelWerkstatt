import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ino': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${port}`);
  const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const candidate = normalize(join(root, pathname));

  if (relative(root, candidate).startsWith('..')) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Zugriff verweigert.');
    return;
  }

  try {
    const data = await readFile(candidate);
    response.writeHead(200, { 'content-type': mimeTypes[extname(candidate)] ?? 'application/octet-stream' });
    response.end(data);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Datei nicht gefunden.');
  }
});

server.listen(port, () => {
  console.log(`KabelWerkstatt läuft unter http://localhost:${port}`);
});
