// ═══════════════════════════════════════════════════════════
// RENDER KING — QUOTE GENERATOR ENGINE
// Stores quotes in mattysdd/render-king-tools repo
// ═══════════════════════════════════════════════════════════

// ── GITHUB CONFIG ──────────────────────────────────────────
const GH_TOKEN = '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';
const GH_REPO  = 'mattysdd/render-king-tools';
const GH_BRANCH = 'main';

// ── INIT QUOTE ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initQuoteDate();
  addQuoteLine('Acrylic Render — Brick/Hebel', 1, 'sqm', 55, 55);
  updateQuoteValidity();
  initSignaturePad();

  // Check if loading a saved quote from URL
  const params = new URLSearchParams(window.location.search);
  const qid = params.get('q');
  if (qid) {
    loadQuoteFromGitHub(qid);
  }
});

// ── DATE HANDLING ──────────────────────────────────────────
function initQuoteDate() {
  const now = new Date();
  const opts = { day:'2-digit', month:'short', year:'numeric' };
  document.getElementById('q-date-display').textContent = now.toLocaleDateString('en-AU', opts).toUpperCase();
}

function updateQuoteValidity() {
  const hours = parseInt(document.getElementById('q-validity-select').value) || 48;
  const banner = document.getElementById('q-validity-banner');
  if (hours <= 48) {
    banner.textContent = `QUOTE VALID FOR ${hours} HOURS FROM DATE OF ISSUE`;
  } else {
    const days = Math.round(hours / 24);
    banner.textContent = `QUOTE VALID FOR ${days} DAYS FROM DATE OF ISSUE`;
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + hours * 3600000);
  const opts = { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' };
  document.getElementById('q-expiry-note').textContent = 'Expires: ' + expiry.toLocaleDateString('en-AU', opts);
}

// ── PRICING LINES ──────────────────────────────────────────
let quoteLineId = 0;

function addQuoteLine(desc, qty, unit, rate, total) {
  quoteLineId++;
  const id = quoteLineId;
  const tbody = document.getElementById('q-pricing-body');

  const tr = document.createElement('tr');
  tr.id = 'q-line-' + id;
  tr.innerHTML = `
    <td><input class="desc" type="text" value="${desc || ''}" oninput="calcQuoteTotals()" placeholder="Description"></td>
    <td class="right"><input type="number" value="${qty || 0}" min="0" step="0.1" oninput="calcQuoteTotals()" id="q-qty-${id}"></td>
    <td><input type="text" value="${unit || 'sqm'}" style="width:60px;text-align:center;" oninput="calcQuoteTotals()"></td>
    <td class="right"><input type="number" value="${rate || 0}" min="0" step="0.01" oninput="calcQuoteTotals()" id="q-rate-${id}"></td>
    <td class="right" id="q-total-${id}">${fmt(total || 0)}</td>
    <td class="center no-print"><button class="btn-remove-line" onclick="removeQuoteLine(${id})">&times;</button></td>
  `;
  tbody.appendChild(tr);
  calcQuoteTotals();
}

function removeQuoteLine(id) {
  const row = document.getElementById('q-line-' + id);
  if (row) row.remove();
  calcQuoteTotals();
}

function calcQuoteTotals() {
  let subtotal = 0;
  document.querySelectorAll('#q-pricing-body tr').forEach(tr => {
    const inputs = tr.querySelectorAll('input[type="number"]');
    if (inputs.length >= 2) {
      const qty = parseFloat(inputs[0].value) || 0;
      const rate = parseFloat(inputs[1].value) || 0;
      const total = qty * rate;
      subtotal += total;
      const totalCell = tr.querySelector('td:nth-child(5)');
      if (totalCell) totalCell.textContent = fmt(total);
    }
  });

  const gst = subtotal * 0.10;
  const grand = subtotal + gst;

  document.getElementById('q-subtotal-cell').textContent = fmt(subtotal);
  document.getElementById('q-gst-cell').textContent = fmt(gst);
  document.getElementById('q-grand-total-cell').textContent = fmt(grand);

  // Payment schedule
  const builderType = document.getElementById('q-builder-type')?.value || 'standard';
  let depositPct, finalPct;

  if (builderType === 'volume') {
    depositPct = 0;
    finalPct = 50;
    document.getElementById('q-deposit-pct').textContent = '0%';
    document.getElementById('q-final-pct').textContent = '50%';
  } else if (subtotal >= 20000) {
    depositPct = 5;
    finalPct = 45;
    document.getElementById('q-deposit-pct').textContent = '5%';
    document.getElementById('q-final-pct').textContent = '45%';
  } else {
    depositPct = 10;
    finalPct = 40;
    document.getElementById('q-deposit-pct').textContent = '10%';
    document.getElementById('q-final-pct').textContent = '40%';
  }

  document.getElementById('q-deposit-amt').textContent = fmt(subtotal * depositPct / 100);
  document.getElementById('q-material-amt').textContent = fmt(subtotal * 0.50);
  document.getElementById('q-final-amt').textContent = fmt(subtotal * finalPct / 100);
  document.getElementById('q-payment-total').textContent = fmt(subtotal);
}

// ── SIGNATURE PAD ──────────────────────────────────────────
let sigCanvas, sigCtx, sigDrawing = false, sigHasContent = false;

function initSignaturePad() {
  sigCanvas = document.getElementById('q-sig-canvas');
  if (!sigCanvas) return;
  const wrap = document.getElementById('q-canvas-wrap');
  sigCanvas.width = wrap.offsetWidth;
  sigCanvas.height = wrap.offsetHeight;
  sigCtx = sigCanvas.getContext('2d');
  sigCtx.strokeStyle = '#000';
  sigCtx.lineWidth = 2;
  sigCtx.lineCap = 'round';

  sigCanvas.addEventListener('mousedown', sigStart);
  sigCanvas.addEventListener('mousemove', sigMove);
  sigCanvas.addEventListener('mouseup', sigEnd);
  sigCanvas.addEventListener('mouseleave', sigEnd);
  sigCanvas.addEventListener('touchstart', e => { e.preventDefault(); sigStart(e.touches[0]); });
  sigCanvas.addEventListener('touchmove', e => { e.preventDefault(); sigMove(e.touches[0]); });
  sigCanvas.addEventListener('touchend', sigEnd);
}

function sigStart(e) {
  sigDrawing = true;
  sigCtx.beginPath();
  const rect = sigCanvas.getBoundingClientRect();
  sigCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  document.getElementById('q-canvas-hint').style.display = 'none';
}

function sigMove(e) {
  if (!sigDrawing) return;
  const rect = sigCanvas.getBoundingClientRect();
  sigCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  sigCtx.stroke();
  sigHasContent = true;
  document.getElementById('q-accept-btn').disabled = false;
}

function sigEnd() { sigDrawing = false; }

function clearQuoteSig() {
  if (!sigCtx) return;
  sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  sigHasContent = false;
  document.getElementById('q-accept-btn').disabled = true;
  document.getElementById('q-canvas-hint').style.display = 'block';
  document.getElementById('q-sig-accepted-banner').style.display = 'none';
  document.getElementById('q-sig-image').style.display = 'none';
}

function acceptQuoteSig() {
  if (!sigHasContent) return;
  const dataUrl = sigCanvas.toDataURL('image/png');
  const banner = document.getElementById('q-sig-accepted-banner');
  const now = new Date();
  const ts = now.toLocaleDateString('en-AU', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  banner.querySelector('.acc-label').textContent = `QUOTE ACCEPTED — DIGITALLY SIGNED — ${ts}`;
  banner.style.display = 'block';

  const img = document.getElementById('q-sig-image');
  img.src = dataUrl;
  img.style.display = 'block';
}

// ── SAVE TO GITHUB ─────────────────────────────────────────
async function saveQuoteToGitHub() {
  const quoteNum = document.getElementById('q-quote-number')?.textContent?.trim() || 'RK-DRAFT';
  const quoteId = quoteNum.replace(/[^a-zA-Z0-9-]/g, '') + '-' + Date.now();

  // Collect quote data
  const quoteData = {
    id: quoteId,
    quoteNumber: quoteNum,
    date: document.getElementById('q-date-display')?.textContent || '',
    validity: document.getElementById('q-validity-select')?.value || '48',
    builderType: document.getElementById('q-builder-type')?.value || 'standard',
    html: document.querySelector('#tab-quote .doc')?.innerHTML || '',
    savedAt: new Date().toISOString()
  };

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(quoteData, null, 2))));
  const path = `quotes/${quoteId}.json`;

  try {
    const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Quote saved: ${quoteNum}`,
        content: content,
        branch: GH_BRANCH
      })
    });

    if (res.ok) {
      const shortLink = `https://mattysdd.github.io/render-king-tools/?q=${quoteId}`;
      prompt('Quote saved! Share this link:', shortLink);
    } else {
      const err = await res.json();
      alert('Save failed: ' + (err.message || 'Unknown error'));
    }
  } catch (e) {
    alert('Save failed: ' + e.message);
  }
}

// ── LOAD QUOTE FROM GITHUB ─────────────────────────────────
async function loadQuoteFromGitHub(quoteId) {
  try {
    const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/quotes/${quoteId}.json?ref=${GH_BRANCH}`, {
      headers: { 'Authorization': `token ${GH_TOKEN}` }
    });

    if (res.ok) {
      const data = await res.json();
      const decoded = JSON.parse(decodeURIComponent(escape(atob(data.content))));
      const docEl = document.querySelector('#tab-quote .doc');
      if (docEl && decoded.html) {
        docEl.innerHTML = decoded.html;
      }
      switchTab('quote');
    }
  } catch (e) {
    console.error('Failed to load quote:', e);
  }
}

// ── EDIT MODE ──────────────────────────────────────────────
let editMode = false;
function toggleEditMode() {
  editMode = !editMode;
  const editables = document.querySelectorAll('#tab-quote .field-val, #tab-quote .meta-value span');
  editables.forEach(el => {
    el.contentEditable = editMode ? 'true' : 'false';
    el.style.outline = editMode ? '1px dashed var(--gold-dark)' : 'none';
  });

  const inputs = document.querySelectorAll('#tab-quote .pricing-table input');
  inputs.forEach(el => {
    el.disabled = !editMode;
    el.style.opacity = editMode ? '1' : '0.7';
  });

  // Visual indicator
  const btn = document.querySelector('.tb-btn.ghost:nth-child(3)');
  if (btn) {
    btn.textContent = editMode ? 'LOCK EDITING' : 'EDIT MODE';
    btn.style.borderColor = editMode ? 'var(--gold)' : '';
    btn.style.color = editMode ? 'var(--gold)' : '';
  }
}

// ── CLEAR FORM ─────────────────────────────────────────────
function clearQuoteForm() {
  if (!confirm('Clear all quote data? This cannot be undone.')) return;

  // Reset editable fields
  document.querySelectorAll('#tab-quote .field-val').forEach(el => {
    el.textContent = '\u00A0';
  });

  // Reset quote number
  const qn = document.getElementById('q-quote-number');
  if (qn) qn.textContent = 'RK-2026-';

  // Clear pricing lines
  document.getElementById('q-pricing-body').innerHTML = '';
  quoteLineId = 0;
  addQuoteLine('Acrylic Render — Brick/Hebel', 1, 'sqm', 55, 55);

  // Clear signature
  clearQuoteSig();

  // Recalc
  calcQuoteTotals();
  updateQuoteValidity();
}

// ── FMT HELPER (shared with calculator) ────────────────────
if (typeof fmt === 'undefined') {
  var fmt = n => {
    if (n === 0 || isNaN(n)) return '$0.00';
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
}
