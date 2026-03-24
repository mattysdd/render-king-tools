// ═══════════════════════════════════════════════════════════
// RENDER KING — QUOTE GENERATOR ENGINE
// Stores quotes in mattysdd/render-king-tools repo
// ═══════════════════════════════════════════════════════════
//
// ── AGENT API SCHEMA ──────────────────────────────────────
// External AI agents can POST structured JSON to create quotes.
//
// ENDPOINT:  PUT https://api.github.com/repos/mattysdd/render-king-tools/contents/quotes/{quoteId}.json
// HEADERS:   Authorization: token {GH_TOKEN}
//            Content-Type: application/json
// BODY:      { message: "Quote saved: RK-2026-XXX", content: base64(JSON.stringify(quotePayload)), branch: "main" }
//
// QUOTE JSON SCHEMA:
// {
//   "id":               "string — unique ID e.g. RK-2026-001-1711234567890",
//   "quoteNumber":      "string — e.g. RK-2026-001",
//   "date":             "string — e.g. 24 MAR 2026",
//   "validity":         "string — hours e.g. '48'",
//   "builderType":      "string — 'volume'|'standard'|'premium'|'luxury'",
//   "client": {
//     "companyName":    "string",
//     "contactName":    "string",
//     "phone":          "string",
//     "email":          "string",
//     "siteAddress":    "string",
//     "lotPlan":        "string",
//     "poNumber":       "string",
//     "builderRef":     "string"
//   },
//   "scope": {
//     "description":    "string",
//     "substrate":      "string",
//     "difficulty":     "string"
//   },
//   "lineItems": [
//     {
//       "description":  "string",
//       "qty":          "number",
//       "unit":         "string — 'sqm'|'lm'|'ea'",
//       "rate":         "number — ex GST",
//       "total":        "number"
//     }
//   ],
//   "totals": {
//     "subtotal":       "number — ex GST",
//     "gst":            "number",
//     "grandTotal":     "number — inc GST"
//   },
//   "specialConditions": ["string"],
//   "attachments":      [{ "id":"string", "name":"string", "type":"string", "size":"number", "data":"base64 dataURL" }],
//   "signatures": {
//     "client": {
//       "image":        "string — base64 PNG dataURL or empty",
//       "typedName":    "string",
//       "printName":    "string",
//       "date":         "string — YYYY-MM-DD",
//       "acceptedAt":   "string — ISO timestamp or empty"
//     },
//     "rk": {
//       "image":        "string — base64 PNG dataURL or empty",
//       "name":         "King Mannion",
//       "title":        "Director",
//       "date":         "string — YYYY-MM-DD",
//       "acceptedAt":   "string — ISO timestamp or empty"
//     }
//   },
//   "savedAt":          "string — ISO timestamp",
//   "html":             "string — rendered HTML of the quote doc (for backward compat)"
// }
//
// SHAREABLE LINKS:
//   Client view:   https://mattysdd.github.io/render-king-tools/client.html?id={quoteId}
//   T&C only:      https://mattysdd.github.io/render-king-tools/tc.html?id={quoteId}
//   Internal:      https://mattysdd.github.io/render-king-tools/?q={quoteId}
//
// To GET a quote:
//   GET https://api.github.com/repos/mattysdd/render-king-tools/contents/quotes/{quoteId}.json?ref=main
//   Response: { content: base64(JSON), ... } — decode with atob()
//
// ═══════════════════════════════════════════════════════════

// ── GITHUB CONFIG ──────────────────────────────────────────
const GH_TOKEN = ['ghp_fSiZgVAuiadmGQ2y', '5bndOF4wFDVITB0et6CP'].join('');
const GH_REPO  = 'mattysdd/render-king-tools';
const GH_BRANCH = 'main';

// ── INIT QUOTE ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initQuoteDate();
  addQuoteLine('Acrylic Render — Brick/Hebel', 1, 'sqm', 55, 55);
  updateQuoteValidity();
  initSignaturePad();
  initRkSignaturePad();

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
  const el = document.getElementById('q-date-display');
  if (el) el.textContent = now.toLocaleDateString('en-AU', opts).toUpperCase();
}

function updateQuoteValidity() {
  const hours = parseInt(document.getElementById('q-validity-select')?.value) || 48;
  const banner = document.getElementById('q-validity-banner');
  if (banner) {
    if (hours <= 48) {
      banner.textContent = `QUOTE VALID FOR ${hours} HOURS FROM DATE OF ISSUE`;
    } else {
      const days = Math.round(hours / 24);
      banner.textContent = `QUOTE VALID FOR ${days} DAYS FROM DATE OF ISSUE`;
    }
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + hours * 3600000);
  const opts = { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' };
  const en = document.getElementById('q-expiry-note');
  if (en) en.textContent = 'Expires: ' + expiry.toLocaleDateString('en-AU', opts);
}

// ── PRICING LINES ──────────────────────────────────────────
let quoteLineId = 0;

function addQuoteLine(desc, qty, unit, rate, total) {
  quoteLineId++;
  const id = quoteLineId;
  const tbody = document.getElementById('q-pricing-body');
  if (!tbody) return;

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

  const el = id => document.getElementById(id);
  if (el('q-subtotal-cell')) el('q-subtotal-cell').textContent = fmt(subtotal);
  if (el('q-gst-cell')) el('q-gst-cell').textContent = fmt(gst);
  if (el('q-grand-total-cell')) el('q-grand-total-cell').textContent = fmt(grand);

  // Payment schedule
  const builderType = document.getElementById('q-builder-type')?.value || 'standard';
  let depositPct, finalPct;

  if (builderType === 'volume') {
    depositPct = 0; finalPct = 50;
  } else if (subtotal >= 20000) {
    depositPct = 5; finalPct = 45;
  } else {
    depositPct = 10; finalPct = 40;
  }

  if (el('q-deposit-pct')) el('q-deposit-pct').textContent = depositPct + '%';
  if (el('q-final-pct')) el('q-final-pct').textContent = finalPct + '%';
  if (el('q-deposit-amt')) el('q-deposit-amt').textContent = fmt(subtotal * depositPct / 100);
  if (el('q-material-amt')) el('q-material-amt').textContent = fmt(subtotal * 0.50);
  if (el('q-final-amt')) el('q-final-amt').textContent = fmt(subtotal * finalPct / 100);
  if (el('q-payment-total')) el('q-payment-total').textContent = fmt(subtotal);
}

// ── CLIENT SIGNATURE PAD ──────────────────────────────────
let sigCanvas, sigCtx, sigDrawing = false, sigHasContent = false;

function initSignaturePad() {
  sigCanvas = document.getElementById('q-sig-canvas');
  if (!sigCanvas) return;
  const wrap = document.getElementById('q-canvas-wrap');
  if (!wrap) return;
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
  const hint = document.getElementById('q-canvas-hint');
  if (hint) hint.style.display = 'none';
}

function sigMove(e) {
  if (!sigDrawing) return;
  const rect = sigCanvas.getBoundingClientRect();
  sigCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  sigCtx.stroke();
  sigHasContent = true;
  const btn = document.getElementById('q-accept-btn');
  if (btn) btn.disabled = false;
}

function sigEnd() { sigDrawing = false; }

function clearQuoteSig() {
  if (!sigCtx) return;
  sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  sigHasContent = false;
  const btn = document.getElementById('q-accept-btn');
  if (btn) btn.disabled = true;
  const hint = document.getElementById('q-canvas-hint');
  if (hint) hint.style.display = 'block';
  const banner = document.getElementById('q-sig-accepted-banner');
  if (banner) banner.style.display = 'none';
  const img = document.getElementById('q-sig-image');
  if (img) img.style.display = 'none';
  const wrap = document.getElementById('q-canvas-wrap');
  if (wrap) wrap.style.display = '';
  const btnRow = document.getElementById('q-sig-btn-row');
  if (btnRow) btnRow.style.display = '';
}

function acceptQuoteSig() {
  if (!sigHasContent) return;
  const dataUrl = sigCanvas.toDataURL('image/png');
  const banner = document.getElementById('q-sig-accepted-banner');
  const now = new Date();
  const ts = now.toLocaleDateString('en-AU', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

  if (banner) {
    banner.innerHTML = `<div style="color:var(--green);font-weight:700;font-size:12px;letter-spacing:1px;">QUOTE ACCEPTED — DIGITALLY SIGNED — ${ts}</div>`;
    const img = document.getElementById('q-sig-image');
    if (img) { img.src = dataUrl; img.style.display = 'block'; }
    banner.style.display = 'block';
  }

  // Hide canvas, show accepted state
  const wrap = document.getElementById('q-canvas-wrap');
  if (wrap) wrap.style.display = 'none';
  const btnRow = document.getElementById('q-sig-btn-row');
  if (btnRow) btnRow.style.display = 'none';
}

// ── RK AUTHORISED SIGNATURE PAD ───────────────────────────
let rkSigCanvas, rkSigCtx, rkSigDrawing = false, rkSigHasContent = false;

function initRkSignaturePad() {
  rkSigCanvas = document.getElementById('q-rk-sig-canvas');
  if (!rkSigCanvas) return;
  const wrap = document.getElementById('q-rk-canvas-wrap');
  if (!wrap) return;
  rkSigCanvas.width = wrap.offsetWidth;
  rkSigCanvas.height = wrap.offsetHeight;
  rkSigCtx = rkSigCanvas.getContext('2d');
  rkSigCtx.strokeStyle = '#000';
  rkSigCtx.lineWidth = 2;
  rkSigCtx.lineCap = 'round';

  rkSigCanvas.addEventListener('mousedown', rkSigStart);
  rkSigCanvas.addEventListener('mousemove', rkSigMove);
  rkSigCanvas.addEventListener('mouseup', rkSigEnd);
  rkSigCanvas.addEventListener('mouseleave', rkSigEnd);
  rkSigCanvas.addEventListener('touchstart', e => { e.preventDefault(); rkSigStart(e.touches[0]); });
  rkSigCanvas.addEventListener('touchmove', e => { e.preventDefault(); rkSigMove(e.touches[0]); });
  rkSigCanvas.addEventListener('touchend', rkSigEnd);
}

function rkSigStart(e) {
  rkSigDrawing = true;
  rkSigCtx.beginPath();
  const rect = rkSigCanvas.getBoundingClientRect();
  rkSigCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  const hint = document.getElementById('q-rk-canvas-hint');
  if (hint) hint.style.display = 'none';
}

function rkSigMove(e) {
  if (!rkSigDrawing) return;
  const rect = rkSigCanvas.getBoundingClientRect();
  rkSigCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  rkSigCtx.stroke();
  rkSigHasContent = true;
  const btn = document.getElementById('q-rk-accept-btn');
  if (btn) btn.disabled = false;
}

function rkSigEnd() { rkSigDrawing = false; }

function clearRkSig() {
  if (!rkSigCtx) return;
  rkSigCtx.clearRect(0, 0, rkSigCanvas.width, rkSigCanvas.height);
  rkSigHasContent = false;
  const btn = document.getElementById('q-rk-accept-btn');
  if (btn) btn.disabled = true;
  const hint = document.getElementById('q-rk-canvas-hint');
  if (hint) hint.style.display = 'block';
  const banner = document.getElementById('q-rk-sig-accepted-banner');
  if (banner) banner.style.display = 'none';
  const img = document.getElementById('q-rk-sig-image');
  if (img) img.style.display = 'none';
  const wrap = document.getElementById('q-rk-canvas-wrap');
  if (wrap) wrap.style.display = '';
  const btnRow = document.getElementById('q-rk-sig-btn-row');
  if (btnRow) btnRow.style.display = '';
}

function acceptRkSig() {
  if (!rkSigHasContent) return;
  const dataUrl = rkSigCanvas.toDataURL('image/png');
  const banner = document.getElementById('q-rk-sig-accepted-banner');
  const now = new Date();
  const ts = now.toLocaleDateString('en-AU', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

  if (banner) {
    banner.innerHTML = `<div style="color:var(--green);font-weight:700;font-size:12px;letter-spacing:1px;">SIGNED BY KING MANNION — ${ts}</div>`;
    const img = document.getElementById('q-rk-sig-image');
    if (img) { img.src = dataUrl; img.style.display = 'block'; }
    banner.style.display = 'block';
  }

  const wrap = document.getElementById('q-rk-canvas-wrap');
  if (wrap) wrap.style.display = 'none';
  const btnRow = document.getElementById('q-rk-sig-btn-row');
  if (btnRow) btnRow.style.display = 'none';
}

// ── QUOTE ATTACHMENTS ──────────────────────────────────────
var quoteAttachments = [];

function handleQuoteAttachments(files) {
  Array.from(files).forEach(function(file) {
    if (quoteAttachments.length >= 10) { alert('Maximum 10 attachments'); return; }
    var reader = new FileReader();
    reader.onload = function(e) {
      var att = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2,6),
        name: file.name,
        type: file.type,
        size: file.size,
        data: e.target.result
      };
      quoteAttachments.push(att);
      renderQuoteAttachments();
    };
    reader.readAsDataURL(file);
  });
  var inp = document.getElementById('q-attach-input');
  if (inp) inp.value = '';
}

function renderQuoteAttachments() {
  var list = document.getElementById('q-attach-list');
  if (!list) return;
  if (quoteAttachments.length === 0) {
    list.innerHTML = '<div class="empty-state" style="padding:12px;color:#888;font-size:13px;">No attachments yet</div>';
    return;
  }
  var html = '<div class="attach-grid">';
  quoteAttachments.forEach(function(att) {
    var isImage = att.type && att.type.startsWith('image/');
    if (isImage) {
      html += '<div class="attach-item" id="att-' + att.id + '">' +
        '<img src="' + att.data + '" class="attach-thumb" alt="' + att.name + '">' +
        '<div class="attach-name">' + att.name + '</div>' +
        '<button class="attach-remove no-print" onclick="removeQuoteAttachment(\'' + att.id + '\')">&times;</button>' +
        '</div>';
    } else {
      html += '<div class="attach-item attach-file" id="att-' + att.id + '">' +
        '<div class="attach-icon">PDF</div>' +
        '<div class="attach-name">' + att.name + '</div>' +
        '<button class="attach-remove no-print" onclick="removeQuoteAttachment(\'' + att.id + '\')">&times;</button>' +
        '</div>';
    }
  });
  html += '</div>';
  list.innerHTML = html;
}

function removeQuoteAttachment(id) {
  quoteAttachments = quoteAttachments.filter(function(a) { return a.id !== id; });
  renderQuoteAttachments();
}

// ── SPECIAL CONDITIONS ─────────────────────────────────────
var specialConditionId = 0;

function addSpecialCondition(text) {
  specialConditionId++;
  var id = specialConditionId;
  var container = document.getElementById('q-special-conditions');
  if (!container) return;
  var div = document.createElement('div');
  div.className = 'special-condition-item';
  div.id = 'sc-' + id;
  div.innerHTML = '<span class="sc-num">' + (document.querySelectorAll('.special-condition-item').length + 1) + '.</span>' +
    '<input type="text" class="sc-input" value="' + (text || '') + '" placeholder="Enter special condition...">' +
    '<button class="attach-remove no-print" onclick="removeSpecialCondition(' + id + ')">&times;</button>';
  container.appendChild(div);
  renumberSpecialConditions();
}

function removeSpecialCondition(id) {
  var el = document.getElementById('sc-' + id);
  if (el) el.remove();
  renumberSpecialConditions();
}

function renumberSpecialConditions() {
  document.querySelectorAll('.special-condition-item').forEach(function(item, i) {
    var num = item.querySelector('.sc-num');
    if (num) num.textContent = (i + 1) + '.';
  });
}

function getSpecialConditions() {
  var conditions = [];
  document.querySelectorAll('.special-condition-item .sc-input').forEach(function(input) {
    if (input.value.trim()) conditions.push(input.value.trim());
  });
  return conditions;
}

// ── COLLECT STRUCTURED QUOTE DATA ─────────────────────────
function collectQuoteData() {
  const quoteNum = document.getElementById('q-quote-number')?.textContent?.trim() || 'RK-DRAFT';
  const quoteId = quoteNum.replace(/[^a-zA-Z0-9-]/g, '') + '-' + Date.now();

  // Client details from contenteditable fields
  const fields = document.querySelectorAll('#tab-quote .section');
  const clientSection = fields[0]; // Section 1: Client Details
  const scopeSection = fields[1];  // Section 2: Scope of Work

  function getFieldVal(section, index) {
    const vals = section?.querySelectorAll('.field-val');
    return vals && vals[index] ? vals[index].textContent.trim().replace(/\u00A0/g, '') : '';
  }

  // Line items
  const lineItems = [];
  document.querySelectorAll('#q-pricing-body tr').forEach(tr => {
    const descInput = tr.querySelector('input.desc');
    const numInputs = tr.querySelectorAll('input[type="number"]');
    const unitInput = tr.querySelectorAll('input[type="text"]');
    if (descInput && numInputs.length >= 2) {
      const qty = parseFloat(numInputs[0].value) || 0;
      const rate = parseFloat(numInputs[1].value) || 0;
      lineItems.push({
        description: descInput.value || '',
        qty: qty,
        unit: unitInput[1]?.value || 'sqm',
        rate: rate,
        total: qty * rate
      });
    }
  });

  const subtotal = lineItems.reduce((s, li) => s + li.total, 0);

  // Signatures
  const clientSigImage = sigHasContent ? sigCanvas.toDataURL('image/png') : '';
  const rkSigImage = rkSigHasContent ? rkSigCanvas.toDataURL('image/png') : '';

  return {
    id: quoteId,
    quoteNumber: quoteNum,
    date: document.getElementById('q-date-display')?.textContent || '',
    validity: document.getElementById('q-validity-select')?.value || '48',
    builderType: document.getElementById('q-builder-type')?.value || 'standard',
    client: {
      companyName: getFieldVal(clientSection, 0),
      contactName: getFieldVal(clientSection, 1),
      phone: getFieldVal(clientSection, 2),
      email: getFieldVal(clientSection, 3),
      siteAddress: getFieldVal(clientSection, 4),
      lotPlan: getFieldVal(clientSection, 5),
      poNumber: getFieldVal(clientSection, 6),
      builderRef: getFieldVal(clientSection, 7)
    },
    scope: {
      description: getFieldVal(scopeSection, 0),
      substrate: getFieldVal(scopeSection, 1),
      difficulty: getFieldVal(scopeSection, 2)
    },
    lineItems: lineItems,
    totals: {
      subtotal: subtotal,
      gst: subtotal * 0.10,
      grandTotal: subtotal * 1.10
    },
    specialConditions: getSpecialConditions(),
    attachments: quoteAttachments,
    signatures: {
      client: {
        image: clientSigImage,
        typedName: document.getElementById('q-sig-typed-name')?.value || '',
        printName: document.getElementById('q-sig-print-name')?.value || '',
        date: document.getElementById('q-sig-date')?.value || '',
        acceptedAt: clientSigImage ? new Date().toISOString() : ''
      },
      rk: {
        image: rkSigImage,
        name: 'King Mannion',
        title: 'Director',
        date: document.getElementById('q-rk-sig-date')?.value || '',
        acceptedAt: rkSigImage ? new Date().toISOString() : ''
      }
    },
    savedAt: new Date().toISOString(),
    html: document.querySelector('#tab-quote .doc')?.innerHTML || ''
  };
}

// ── SAVE & SHARE (3 LINK TYPES) ──────────────────────────
async function saveAndShareQuote(linkType) {
  const quoteData = collectQuoteData();
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(quoteData, null, 2))));
  const path = `quotes/${quoteData.id}.json`;

  try {
    const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Quote saved: ${quoteData.quoteNumber}`,
        content: content,
        branch: GH_BRANCH
      })
    });

    if (res.ok) {
      const base = 'https://mattysdd.github.io/render-king-tools';
      let shareLink;

      if (linkType === 'client') {
        shareLink = `${base}/client.html?id=${quoteData.id}`;
      } else if (linkType === 'tc') {
        shareLink = `${base}/tc.html?id=${quoteData.id}`;
      } else {
        shareLink = `${base}/?q=${quoteData.id}`;
      }

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareLink);
        const labels = { client: 'CLIENT', tc: 'T&C ONLY', internal: 'INTERNAL' };
        alert(`${labels[linkType]} link copied to clipboard!\n\n${shareLink}`);
      } catch (clipErr) {
        prompt(`Quote saved! Copy this ${linkType} link:`, shareLink);
      }
    } else {
      const err = await res.json();
      alert('Save failed: ' + (err.message || 'Unknown error'));
    }
  } catch (e) {
    alert('Save failed: ' + e.message);
  }
}

// Keep backward compat
async function saveQuoteToGitHub() {
  return saveAndShareQuote('internal');
}

// ── LOAD QUOTE FROM GITHUB ─────────────────────────────
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

      // Restore attachments
      if (decoded.attachments && decoded.attachments.length > 0) {
        quoteAttachments = decoded.attachments;
        renderQuoteAttachments();
      }

      // Restore special conditions
      if (decoded.specialConditions && decoded.specialConditions.length > 0) {
        var scContainer = document.getElementById('q-special-conditions');
        if (scContainer) scContainer.innerHTML = '';
        specialConditionId = 0;
        decoded.specialConditions.forEach(function(text) {
          addSpecialCondition(text);
        });
      }

      // Restore signature fields (new MCK-matching IDs)
      if (decoded.signatures) {
        const cs = decoded.signatures.client || {};
        const rs = decoded.signatures.rk || {};
        setVal('q-sig-typed-name', cs.typedName);
        setVal('q-sig-print-name', cs.printName);
        setVal('q-sig-date', cs.date);
        setVal('q-rk-sig-date', rs.date);

        // Show accepted signatures
        if (cs.image) {
          const img = document.getElementById('q-sig-image');
          if (img) { img.src = cs.image; img.style.display = 'block'; }
          const banner = document.getElementById('q-sig-accepted-banner');
          if (banner) {
            banner.innerHTML = `<div style="color:var(--green);font-weight:700;font-size:12px;">SIGNED BY CLIENT</div>`;
            banner.style.display = 'block';
          }
        }
        if (rs.image) {
          const img = document.getElementById('q-rk-sig-image');
          if (img) { img.src = rs.image; img.style.display = 'block'; }
          const banner = document.getElementById('q-rk-sig-accepted-banner');
          if (banner) {
            banner.innerHTML = `<div style="color:var(--green);font-weight:700;font-size:12px;">SIGNED BY KING MANNION</div>`;
            banner.style.display = 'block';
          }
        }
      }
      // Backward compat: old signatureFields format
      else if (decoded.signatureFields) {
        var sf = decoded.signatureFields;
        setVal('q-sig-typed-name', sf.clientName);
        setVal('q-sig-print-name', sf.clientPrint);
        setVal('q-sig-date', sf.clientDate);
        setVal('q-rk-sig-date', sf.rkDate);
      }

      switchTab('quote');
    }
  } catch (e) {
    console.error('Failed to load quote:', e);
  }
}

function setVal(id, val) {
  var el = document.getElementById(id);
  if (el && val) el.value = val;
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

  const btn = document.querySelector('.quote-toolbar .tb-btn.ghost:nth-child(5)');
  if (btn) {
    btn.textContent = editMode ? 'LOCK EDITING' : 'EDIT MODE';
    btn.style.borderColor = editMode ? 'var(--gold)' : '';
    btn.style.color = editMode ? 'var(--gold)' : '';
  }
}

// ── CLEAR FORM ─────────────────────────────────────────────
function clearQuoteForm() {
  if (!confirm('Clear all quote data? This cannot be undone.')) return;

  document.querySelectorAll('#tab-quote .field-val').forEach(el => {
    el.textContent = '\u00A0';
  });

  const qn = document.getElementById('q-quote-number');
  if (qn) qn.textContent = 'RK-2026-';

  document.getElementById('q-pricing-body').innerHTML = '';
  quoteLineId = 0;
  addQuoteLine('Acrylic Render — Brick/Hebel', 1, 'sqm', 55, 55);

  clearQuoteSig();
  clearRkSig();

  quoteAttachments = [];
  renderQuoteAttachments();

  var scContainer = document.getElementById('q-special-conditions');
  if (scContainer) scContainer.innerHTML = '';
  specialConditionId = 0;

  ['q-sig-typed-name','q-sig-print-name','q-sig-date','q-rk-sig-date'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });

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
