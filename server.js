const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => {
    const i = line.indexOf('=');
    return i < 0 ? [line, ''] : [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')];
  }));
}
const env = loadEnv();
const brief = fs.readFileSync(path.join(ROOT, 'BRIEF.md'), 'utf8');
const notes = fs.readFileSync(path.join(ROOT, 'NOTES.md'), 'utf8');
const model = (notes.match(/`([^`]*luna[^`]*)`/i) || [])[1] || 'gpt-5.6-luna';

function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }

async function askLocation(place) {
  if (!env.OPENAI_API_KEY) throw new Error('missing key');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      tools: [{ type: 'web_search_preview' }],
      input: [
        { role: 'system', content: [{ type: 'input_text', text: brief }] },
        { role: 'user', content: [{ type: 'input_text', text: `Analyze this place for someone with vision difficulties: ${place}. Use current online facts where possible. Return a short, kind response with: Difficulty (Low, Medium, or High), What may be difficult (2-4 bullets), Helpful preparation (1-2 bullets), and a reminder that conditions can change.` }] }
      ],
      max_output_tokens: 500
    })
  });
  if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
  const data = await response.json();
  const text = data.output_text || (data.output || []).flatMap(item => item.content || []).map(part => part.text || '').join('');
  if (!text) throw new Error('empty answer');
  return text;
}

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
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 10000) req.destroy(); });
    req.on('end', async () => {
      try {
        const place = String(JSON.parse(body).place || '').trim();
        if (!place) return json(res, 400, { error: 'Please enter a place.' });
        json(res, 200, { answer: await askLocation(place) });
      } catch (error) {
        json(res, 502, { error: 'I could not check that place right now. Please check the AI key and your internet connection, then try again.' });
      }
    });
    return;
  }
  if (req.method === 'GET') return serveFile(req, res);
  json(res, 405, { error: 'Method not allowed' });
});
server.listen(PORT, () => console.log(`Location Sense is running at http://localhost:${PORT}`));
