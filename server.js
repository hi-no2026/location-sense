const http = require('http');
const fs = require('fs');
const path = require('path');
const analyze = require('./api/analyze');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;

function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }

function serveFile(req, res) {
  const requested = req.url === '/' ? '/index.html' : req.url;
  const safe = path.normalize(requested).replace(/^([.][.][\\/])+/, '');
  const file = path.join(PUBLIC, safe);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file)) return json(res, 404, { error: 'Not found' });
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
  res.writeHead(200, { 'Content-Type': `${types[path.extname(file)] || 'text/plain'}; charset=utf-8` });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/analyze') {
    analyze(req, { status: code => ({ json: body => json(res, code, body) }) });
    return;
  }
  if (req.method === 'GET') return serveFile(req, res);
  json(res, 405, { error: 'Method not allowed' });
});
server.listen(PORT, () => console.log(`Location Sense is running at http://localhost:${PORT}`));
