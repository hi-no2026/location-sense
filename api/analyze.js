const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const brief = fs.readFileSync(path.join(ROOT, 'BRIEF.md'), 'utf8');
const notes = fs.readFileSync(path.join(ROOT, 'NOTES.md'), 'utf8');
const model = (notes.match(/`([^`]*luna[^`]*)`/i) || [])[1] || 'gpt-5.6-luna';

function localEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => {
    const i = line.indexOf('=');
    return i < 0 ? [line, ''] : [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')];
  }));
}

function readBody(req) {
  if (req.body) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 10000) reject(new Error('request too large')); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('invalid request')); } });
    req.on('error', reject);
  });
}

async function askLocation(place) {
  const env = localEnv();
  const key = process.env.VERCEL ? process.env.OPENAI_API_KEY : env.OPENAI_API_KEY;
  if (!key) throw new Error('missing key');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
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

module.exports = async function analyze(req, res) {
  try {
    const body = await readBody(req);
    const place = String(body.place || '').trim();
    if (!place) return res.status(400).json({ error: 'Please enter a place.' });
    return res.status(200).json({ answer: await askLocation(place) });
  } catch (error) {
    console.error('Location Sense AI error:', error.message);
    return res.status(502).json({ error: 'I could not check that place right now. Please check the AI key and your internet connection, then try again.' });
  }
};
