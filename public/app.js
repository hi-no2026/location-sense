const STORAGE_KEY = 'location-sense-checks-v1';
const form = document.querySelector('#analyze-form');
const placeInput = document.querySelector('#place');
const analyzeButton = document.querySelector('#analyze-button');
const result = document.querySelector('#result');
const savedList = document.querySelector('#saved-list');
const savedCount = document.querySelector('#saved-count');
let currentCheck = null;

function getSaved() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
function saveAll(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
function escapeHtml(text) { return String(text).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch])); }
function formatInline(text) {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
function renderAnswer(text) {
  const lines = String(text).split(/\r?\n/);
  let html = '', inList = false;
  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) { closeList(); return; }
    const bullet = trimmed.match(/^-\s+(.+)$/);
    if (bullet) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${formatInline(bullet[1])}</li>`; return; }
    closeList();
    if (/^\*\*[^*]+\*\*$/.test(trimmed)) html += `<h3>${formatInline(trimmed)}</h3>`;
    else html += `<p>${formatInline(trimmed)}</p>`;
  });
  closeList();
  return html;
}
function renderSaved() {
  const items = getSaved(); savedCount.textContent = items.length;
  if (!items.length) { savedList.innerHTML = '<p class="empty">Your checked places will appear here.</p>'; return; }
  savedList.innerHTML = items.map((item, index) => `<article class="saved-card"><strong>${escapeHtml(item.place)}</strong><small>${escapeHtml(item.summary)}</small><br><button data-remove="${index}">Remove</button></article>`).join('');
}
function showResult(place, answer, fallback) {
  const match = answer.match(/Difficulty\s*:?\s*(Low|Medium|High)/i);
  currentCheck = { place, answer, summary: match ? `${match[1]} difficulty` : 'Place check' };
  const safety = fallback ? '<strong>General guidance:</strong> the online AI check is unavailable, so this is a broad preparation guide—not a live report about this place. Conditions can change.' : '<strong>AI-generated information:</strong> this may not be completely correct, and conditions can change. Use your own judgment.';
  result.innerHTML = `<div class="result-top"><div><div class="step">YOUR LOCATION CHECK</div><h2>${escapeHtml(place)}</h2><div class="result-place">Here’s what may be worth preparing for.</div></div>${match ? `<span class="difficulty">${match[1].toUpperCase()} DIFFICULTY</span>` : ''}</div><div class="answer">${renderAnswer(answer)}</div><button class="save-btn" id="save-result">Save this check</button><div class="safety"><span aria-hidden="true">⚠</span><span>${safety}</span></div>`;
  result.classList.remove('hidden');
  document.querySelector('#save-result').addEventListener('click', () => { const items = getSaved().filter(item => item.place.toLowerCase() !== place.toLowerCase()); saveAll([currentCheck, ...items]); renderSaved(); document.querySelector('#save-result').textContent = 'Saved on this device ✓'; });
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
form.addEventListener('submit', async event => {
  event.preventDefault(); const place = placeInput.value.trim(); if (!place) return;
  analyzeButton.disabled = true; analyzeButton.innerHTML = 'Thinking…'; result.classList.remove('hidden');
  result.innerHTML = '<div class="step">YOUR LOCATION CHECK</div><h2>Thinking…</h2><p class="result-place">I’m checking what may be difficult about this place.</p>';
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ place }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error); showResult(place, data.answer, data.fallback);
  } catch (error) { result.innerHTML = `<div class="step">SORRY, I COULDN’T CHECK THAT</div><h2>Let’s try again.</h2><p class="answer">${escapeHtml(error.message || 'Please try again.')}</p><div class="safety"><span aria-hidden="true">⚠</span><span>Nothing was saved.</span></div>`; }
  finally { analyzeButton.disabled = false; analyzeButton.innerHTML = 'Check this place <span>→</span>'; }
});
document.querySelectorAll('[data-place]').forEach(button => button.addEventListener('click', () => { placeInput.value = button.dataset.place; placeInput.focus(); }));
savedList.addEventListener('click', event => { const index = event.target.dataset.remove; if (index !== undefined) { const items = getSaved(); items.splice(Number(index), 1); saveAll(items); renderSaved(); } });
renderSaved();
