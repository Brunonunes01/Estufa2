import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = normalize(join(__filename, '..'));
const ROOT = normalize(join(__dirname));
const PORT = Number(process.env.SUPPORT_PORT || process.argv[2] || 4173);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const resolvePath = (urlPath) => {
  const safePath = urlPath.split('?')[0].replace(/^\/+/, '');
  const target = safePath || 'index.html';
  const fullPath = normalize(join(ROOT, target));

  if (!fullPath.startsWith(ROOT)) return null;
  if (!existsSync(fullPath)) return null;
  if (statSync(fullPath).isDirectory()) return null;
  return fullPath;
};

const server = createServer((req, res) => {
  const method = req.method || 'GET';
  if (!['GET', 'HEAD'].includes(method)) {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  const requestPath = req.url || '/';
  const filePath = resolvePath(requestPath) || resolvePath('/index.html');
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });

  if (method === 'HEAD') {
    res.end();
    return;
  }

  createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Support Portal disponivel em http://localhost:${PORT}`);
});
