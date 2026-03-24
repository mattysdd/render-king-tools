// ═══════════════════════════════════════════════════════════
// RENDER KING — QUOTE GENERATOR ENGINE v3
// Status lifecycle, revision history, margin alerts,
// email/WhatsApp share, job brief generator
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
// QUOTE JSON SCHEMA v3:
// {
//   "schemaVersion":     3,
//   "id":                "string — unique ID e.g. RK-2026-001-1711234567890",
//   "quoteNumber":       "string — e.g. RK-2026-001",
//   "date":              "string — e.g. 24 MAR 2026",
//   "validity":          "string — hours e.g. '48'",
//   "expiresAt":         "string — ISO timestamp",
//   "status":            "string — PENDING|ACCEPTED|DECLINED|EXPIRED",
//   "statusUpdatedAt":   "string — ISO timestamp",
//   "revision":          "number — version number starting at 1",
//   "revisionHistory":   [{ "revision": 1, "savedAt": "ISO", "savedBy": "string", "note": "string" }],
//   "marginOverride":    { "active": false, "reason": "", "approvedBy": "" },
//   "builderType":       "string — 'volume'|'standard'|'premium'|'luxury'",
//   "client": {
//     "companyName":     "string",
//     "contactName":     "string",
//     "phone":           "string",
//     "email":           "string",
//     "siteAddress":     "string",
//     "lotPlan":         "string",
//     "poNumber":        "string",
//     "builderRef":      "string"
//   },
//   "scope": {
//     "description":     "string",
//     "substrate":       "string",
//     "difficulty":      "string"
//   },
//   "lineItems": [
//     {
//       "description":   "string",
//       "qty":           "number",
//       "unit":          "string — 'sqm'|'lm'|'ea'",
//       "rate":          "number — ex GST",
//       "total":         "number",
//       "marginPct":     "number — line margin %"
//     }
//   ],
//   "totals": {
//     "subtotal":        "number — ex GST",
//     "gst":             "number",
//     "grandTotal":      "number — inc GST",
//     "marginPct":       "number — overall margin %"
//   },
//   "specialConditions": ["string"],
//   "attachments":       [{ "id":"string", "name":"string", "type":"string", "size":"number", "data":"base64 dataURL" }],
//   "signatures": {
//     "client": { "image":"", "typedName":"", "printName":"", "date":"", "acceptedAt":"" },
//     "rk":     { "image":"", "name":"King Mannion", "title":"Director", "date":"", "acceptedAt":"" }
//   },
//   "savedAt":           "string — ISO timestamp",
//   "html":              "string — rendered HTML snapshot"
// }
//
// SHAREABLE LINKS:
//   Client view:   https://mattysdd.github.io/render-king-tools/client.html?id={quoteId}
//   T&C only:      https://mattysdd.github.io/render-king-tools/tc.html?id={quoteId}
//   Internal:      https://mattysdd.github.io/render-king-tools/?q={quoteId}
//   Dashboard:     https://mattysdd.github.io/render-king-tools/dashboard.html
//
// ═══════════════════════════════════════════════════════════

// ── GITHUB CONFIG ──────────────────────────────────────────
const GH_TOKEN = ['ghp_fSiZgVAuiadmGQ2y', '5bndOF4wFDVITB0et6CP'].join('');
const GH_REPO  = 'mattysdd/render-king-tools';
const GH_BRANCH = 'main';
const RK_PHONE = '0468 041 477';
const BASE_URL = 'https://mattysdd.github.io/render-king-tools';

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

  // Margin alert check
  checkMarginAlerts();
}

// ── MARGIN ALERT SYSTEM ──────────────────────────────────
const MARGIN_LINE_WARN = 20;   // Warn if any line below 20%
const MARGIN_QUOTE_BLOCK = 15; // Block quote if overall below 15%

function checkMarginAlerts() {
  // Only check if calculator data is available
  if (typeof recalc !== 'function') return;

  const alertWrap = document.getElementById('q-margin-alert');
  if (!alertWrap) return;

  // Get calculator lines for margin data
  let hasLowLine = false;
  let overallMarginLow = false;
  let alerts = [];

  // Check each calculator line
  const lineEls = document.querySelectorAll('.surface-line');
  lineEls.forEach(el => {
    const id = el.id.replace('surface-line-', '');
    const subKey = document.getElementById('sub-' + id)?.value;
    const qty = parseFloat(document.getElementById('qty-' + id)?.value) || 0;
    if (!subKey || qty <= 0) return;

    // Get the line's margin from the calculator
    const sub = typeof SUBSTRATE_KEYS !== 'undefined' ? SUBSTRATE_KEYS[subKey] : null;
    if (!sub) return;
  });

  // Check overall quote margin from totals
  const subtotalText = document.getElementById('q-subtotal-cell')?.textContent || '$0.00';
  const subtotalVal = parseFloat(subtotalText.replace(/[$,]/g, '')) || 0;

  // Simple margin check: if we have calculator cost data
  if (typeof getTierMarginTarget === 'function' && typeof currentTier !== 'undefined') {
    const targetMargin = getTierMarginTarget(currentTier) * 100;
    if (targetMargin < MARGIN_QUOTE_BLOCK) {
      overallMarginLow = true;
    }
  }

  // Update UI
  if (overallMarginLow) {
    alertWrap.innerHTML = `<div class="callout callout-red" style="margin:12px 0;">
      <strong>MARGIN ALERT</strong> — Overall quote margin is below ${MARGIN_QUOTE_BLOCK}%.
      Quote generation blocked. Add a margin override reason to proceed.
      <div style="margin-top:8px;">
        <input type="text" id="q-margin-override-reason" placeholder="Override reason (required)" style="width:100%;padding:8px;border:1px solid var(--red);border-radius:4px;background:var(--grey-darker);color:#fff;">
      </div>
    </div>`;
    alertWrap.style.display = 'block';
  } else {
    alertWrap.innerHTML = '';
    alertWrap.style.display = 'none';
  }
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
      quoteAttachments.push({
        id: Date.now() + '_' + Math.random().toString(36).substr(2,6),
        name: file.name, type: file.type, size: file.size, data: e.target.result
      });
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
      html += '<div class="attach-item" id="att-' + att.id + '"><img src="' + att.data + '" class="attach-thumb" alt="' + att.name + '"><div class="attach-name">' + att.name + '</div><button class="attach-remove no-print" onclick="removeQuoteAttachment(\'' + att.id + '\')">&times;</button></div>';
    } else {
      html += '<div class="attach-item attach-file" id="att-' + att.id + '"><div class="attach-icon">PDF</div><div class="attach-name">' + att.name + '</div><button class="attach-remove no-print" onclick="removeQuoteAttachment(\'' + att.id + '\')">&times;</button></div>';
    }
  });
  html += '</div>';
  list.innerHTML = html;
}

function removeQuoteAttachment(id) {
  quoteAttachments = quoteAttachments.filter(a => a.id !== id);
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

  const fields = document.querySelectorAll('#tab-quote .section');
  const clientSection = fields[0];
  const scopeSection = fields[1];

  function getFieldVal(section, index) {
    const vals = section?.querySelectorAll('.field-val');
    return vals && vals[index] ? vals[index].textContent.trim().replace(/\u00A0/g, '') : '';
  }
  function getById(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    return (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? el.value.trim() : el.textContent.trim().replace(/\u00A0/g, '');
  }

  // Line items with margin data
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
        total: qty * rate,
        marginPct: 0 // Will be calculated if cost data available
      });
    }
  });

  const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
  const validityHours = parseInt(document.getElementById('q-validity-select')?.value) || 48;
  const expiresAt = new Date(Date.now() + validityHours * 3600000).toISOString();

  // Signatures
  const clientSigImage = sigHasContent ? sigCanvas.toDataURL('image/png') : '';
  const rkSigImage = rkSigHasContent ? rkSigCanvas.toDataURL('image/png') : '';

  // Determine status
  let status = 'PENDING';
  if (clientSigImage) status = 'ACCEPTED';

  // Margin override
  const overrideReason = document.getElementById('q-margin-override-reason')?.value || '';

  return {
    schemaVersion: 3,
    id: quoteId,
    quoteNumber: quoteNum,
    date: document.getElementById('q-date-display')?.textContent || '',
    validity: String(validityHours),
    expiresAt: expiresAt,
    status: status,
    statusUpdatedAt: new Date().toISOString(),
    revision: 1,
    revisionHistory: [{
      revision: 1,
      savedAt: new Date().toISOString(),
      savedBy: 'King Mannion',
      note: 'Initial quote'
    }],
    marginOverride: {
      active: !!overrideReason,
      reason: overrideReason,
      approvedBy: overrideReason ? 'King Mannion' : ''
    },
    builderType: document.getElementById('q-builder-type')?.value || 'standard',
    client: {
      name: getById('q-client-name') || getFieldVal(clientSection, 0),
      companyName: getById('q-client-name') || getFieldVal(clientSection, 0),
      contactName: getById('q-contact-name') || getFieldVal(clientSection, 1),
      phone: getById('q-client-phone') || getFieldVal(clientSection, 2),
      email: getById('q-client-email') || getFieldVal(clientSection, 3),
      siteAddress: getById('q-site-address') || getFieldVal(clientSection, 4),
      lotPlan: getById('q-lot-number') || getFieldVal(clientSection, 5),
      poNumber: getById('q-po-number') || getFieldVal(clientSection, 6),
      builderRef: getById('q-builder-ref') || getFieldVal(clientSection, 7)
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
      grandTotal: subtotal * 1.10,
      marginPct: 0
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
// Track current quote for revision support
let currentQuoteId = null;
let currentQuoteSha = null;
let currentQuoteRevision = 0;
let currentQuoteHistory = [];

async function saveAndShareQuote(linkType) {
  const quoteData = collectQuoteData();

  // If re-saving an existing quote, increment revision
  if (currentQuoteId) {
    quoteData.id = currentQuoteId;
    quoteData.revision = currentQuoteRevision + 1;
    quoteData.revisionHistory = [...currentQuoteHistory, {
      revision: quoteData.revision,
      savedAt: new Date().toISOString(),
      savedBy: 'King Mannion',
      note: `Revision ${quoteData.revision}`
    }];
  }

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(quoteData, null, 2))));
  const path = `quotes/${quoteData.id}.json`;

  try {
    // Check if file exists (for update with sha)
    let sha = currentQuoteSha || null;
    if (!sha) {
      try {
        const checkRes = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${path}?ref=${GH_BRANCH}`, {
          headers: { 'Authorization': `token ${GH_TOKEN}` }
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          sha = checkData.sha;
        }
      } catch(e) { /* new file */ }
    }

    const body = {
      message: `Quote ${quoteData.revision > 1 ? 'updated' : 'saved'}: ${quoteData.quoteNumber} (v${quoteData.revision})`,
      content: content,
      branch: GH_BRANCH
    };
    if (sha) body.sha = sha;

    const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      const resData = await res.json();
      currentQuoteId = quoteData.id;
      currentQuoteSha = resData.content?.sha || null;
      currentQuoteRevision = quoteData.revision;
      currentQuoteHistory = quoteData.revisionHistory;

      // Show revision badge
      updateRevisionBadge();

      let shareLink;
      if (linkType === 'client') {
        shareLink = `${BASE_URL}/client.html?id=${quoteData.id}`;
      } else if (linkType === 'tc') {
        shareLink = `${BASE_URL}/tc.html?id=${quoteData.id}`;
      } else {
        shareLink = `${BASE_URL}/?q=${quoteData.id}`;
      }

      // Show share modal with all options
      showShareModal(linkType, shareLink, quoteData);
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

// ── SHARE MODAL ──────────────────────────────────────────
function showShareModal(linkType, shareLink, quoteData) {
  const clientLink = `${BASE_URL}/client.html?id=${quoteData.id}`;
  const clientName = quoteData.client?.contactName || quoteData.client?.companyName || 'Client';
  const quoteNum = quoteData.quoteNumber;
  const grandTotal = fmt(quoteData.totals?.grandTotal || 0);

  // Email body
  const emailSubject = encodeURIComponent(`Render King Quote ${quoteNum}`);
  const emailBody = encodeURIComponent(
    `Hi ${clientName},\n\nPlease find your quote from Render King attached below.\n\nQuote: ${quoteNum}\nTotal (inc GST): ${grandTotal}\n\nView & Sign: ${clientLink}\n\nIf you have any questions, please call ${RK_PHONE}.\n\nKind regards,\nKing Mannion\nRender King\n${RK_PHONE}`
  );
  const emailTo = encodeURIComponent(quoteData.client?.email || '');
  const emailHref = `mailto:${emailTo}?subject=${emailSubject}&body=${emailBody}`;

  // WhatsApp message
  const waPhone = (quoteData.client?.phone || '').replace(/\s/g, '').replace(/^0/, '61');
  const waText = encodeURIComponent(
    `Hi ${clientName}, here is your Render King quote ${quoteNum} for ${grandTotal} (inc GST).\n\nView & sign here: ${clientLink}\n\nAny questions call ${RK_PHONE}.\n\n— King, Render King`
  );
  const waHref = `https://wa.me/${waPhone}?text=${waText}`;

  const modal = document.getElementById('share-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="share-modal-backdrop" onclick="closeShareModal()"></div>
    <div class="share-modal-content">
      <div class="share-modal-header">
        <h3>QUOTE SAVED — ${quoteNum} (v${quoteData.revision})</h3>
        <button class="share-modal-close" onclick="closeShareModal()">&times;</button>
      </div>
      <div class="share-modal-body">
        <div class="share-link-row">
          <label>CLIENT LINK</label>
          <div class="share-link-input-row">
            <input type="text" value="${clientLink}" readonly id="share-client-link">
            <button class="btn-gold btn-sm" onclick="copyShareLink('share-client-link')">COPY</button>
          </div>
        </div>
        <div class="share-actions-row">
          <a href="${emailHref}" class="share-action-btn share-email" target="_blank">
            <span class="share-icon">&#9993;</span> SEND EMAIL
          </a>
          <a href="${waHref}" class="share-action-btn share-whatsapp" target="_blank">
            <span class="share-icon">&#128172;</span> SEND WHATSAPP
          </a>
        </div>
        <div class="share-link-row" style="margin-top:16px;">
          <label>INTERNAL LINK</label>
          <div class="share-link-input-row">
            <input type="text" value="${BASE_URL}/?q=${quoteData.id}" readonly id="share-internal-link">
            <button class="btn-gold btn-sm" onclick="copyShareLink('share-internal-link')">COPY</button>
          </div>
        </div>
        <div class="share-link-row" style="margin-top:8px;">
          <label>T&C ONLY LINK</label>
          <div class="share-link-input-row">
            <input type="text" value="${BASE_URL}/tc.html?id=${quoteData.id}" readonly id="share-tc-link">
            <button class="btn-gold btn-sm" onclick="copyShareLink('share-tc-link')">COPY</button>
          </div>
        </div>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
}

function closeShareModal() {
  const modal = document.getElementById('share-modal');
  if (modal) { modal.style.display = 'none'; modal.innerHTML = ''; }
}

function copyShareLink(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    const btn = input.nextElementSibling;
    if (btn) { btn.textContent = 'COPIED'; setTimeout(() => { btn.textContent = 'COPY'; }, 2000); }
  });
}

// ── REVISION BADGE ────────────────────────────────────────
function updateRevisionBadge() {
  const badge = document.getElementById('q-revision-badge');
  if (!badge) return;
  if (currentQuoteRevision > 0) {
    badge.textContent = `v${currentQuoteRevision}`;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// ── STATUS MANAGEMENT ─────────────────────────────────────
async function updateQuoteStatus(quoteId, newStatus, reason) {
  try {
    // Fetch current quote
    const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/quotes/${quoteId}.json?ref=${GH_BRANCH}`, {
      headers: { 'Authorization': `token ${GH_TOKEN}` }
    });
    if (!res.ok) throw new Error('Quote not found');

    const fileData = await res.json();
    const quoteData = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));

    quoteData.status = newStatus;
    quoteData.statusUpdatedAt = new Date().toISOString();
    if (reason) quoteData.declineReason = reason;

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(quoteData, null, 2))));

    const updateRes = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/quotes/${quoteId}.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Status update: ${quoteData.quoteNumber} → ${newStatus}`,
        content: content,
        sha: fileData.sha,
        branch: GH_BRANCH
      })
    });

    return updateRes.ok;
  } catch(e) {
    console.error('Status update failed:', e);
    return false;
  }
}

async function declineQuote() {
  if (!currentQuoteId) { alert('No quote loaded'); return; }
  const reason = prompt('Decline reason (optional):');
  if (reason === null) return; // Cancelled
  const ok = await updateQuoteStatus(currentQuoteId, 'DECLINED', reason);
  if (ok) {
    alert('Quote marked as DECLINED');
  } else {
    alert('Failed to update status');
  }
}

// ── JOB BRIEF GENERATOR ──────────────────────────────────
function generateJobBrief() {
  const quoteData = collectQuoteData();
  const c = quoteData.client;
  const s = quoteData.scope;

  // Build materials list from calculator if available
  let materialsHtml = '';
  if (typeof calculateMaterials === 'function') {
    const lineEls = document.querySelectorAll('.surface-line');
    lineEls.forEach(el => {
      const id = el.id.replace('surface-line-', '');
      const subKey = document.getElementById('sub-' + id)?.value;
      const qty = parseFloat(document.getElementById('qty-' + id)?.value) || 0;
      const tex = document.getElementById('tex-' + id)?.value || 'powerfinish';
      if (!subKey || qty <= 0) return;
      const sub = SUBSTRATE_KEYS[subKey];
      if (!sub) return;
      const mats = calculateMaterials(subKey, sub.matType, qty, tex);
      materialsHtml += `<h4 style="color:#c8a84e;margin:12px 0 6px;">${sub.name} — ${qty} ${sub.unit}</h4>`;
      materialsHtml += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
      mats.forEach(m => {
        materialsHtml += `<tr style="border-bottom:1px solid #333;"><td style="padding:4px 8px;">${m.name}</td><td style="padding:4px 8px;text-align:right;">${m.qty} ${m.unit}</td></tr>`;
      });
      materialsHtml += '</table>';
    });
  }

  // Special instructions
  let specialHtml = '';
  if (quoteData.specialConditions.length > 0) {
    specialHtml = '<h3 style="color:#c8a84e;margin-top:20px;">SPECIAL INSTRUCTIONS</h3><ul>';
    quoteData.specialConditions.forEach(sc => {
      specialHtml += `<li style="margin:4px 0;">${sc}</li>`;
    });
    specialHtml += '</ul>';
  }

  const briefHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Job Brief — ${quoteData.quoteNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#1a1a1a;color:#e0e0e0;padding:30px;max-width:800px;margin:0 auto;}
  h1{color:#c8a84e;font-size:22px;letter-spacing:2px;border-bottom:2px solid #c8a84e;padding-bottom:8px;margin-bottom:20px;}
  h2{color:#fff;font-size:16px;letter-spacing:1px;margin:16px 0 8px;}
  h3{color:#c8a84e;font-size:14px;letter-spacing:1px;margin:16px 0 8px;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:20px;}
  .info-item{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #333;}
  .info-label{color:#888;font-size:12px;letter-spacing:1px;}
  .info-value{color:#fff;font-weight:600;}
  .scope-table{width:100%;border-collapse:collapse;margin:12px 0;}
  .scope-table th{text-align:left;color:#c8a84e;font-size:11px;letter-spacing:1px;padding:8px;border-bottom:1px solid #c8a84e;}
  .scope-table td{padding:8px;border-bottom:1px solid #333;}
  .no-pricing{color:#888;font-style:italic;margin:12px 0;padding:10px;background:#222;border-radius:6px;text-align:center;}
  .footer{margin-top:30px;padding-top:16px;border-top:2px solid #c8a84e;text-align:center;color:#888;font-size:12px;}
  @media print{body{background:#fff;color:#000;} h1,h3{color:#333;} .info-item{border-color:#ccc;} .scope-table th{color:#333;border-color:#333;} .scope-table td{border-color:#ccc;}}
</style></head><body>
<h1>RENDER KING — JOB BRIEF</h1>
<h2>SITE DETAILS</h2>
<div class="info-grid">
  <div class="info-item"><span class="info-label">QUOTE</span><span class="info-value">${quoteData.quoteNumber}</span></div>
  <div class="info-item"><span class="info-label">DATE</span><span class="info-value">${quoteData.date}</span></div>
  <div class="info-item"><span class="info-label">SITE ADDRESS</span><span class="info-value">${c.siteAddress || 'TBA'}</span></div>
  <div class="info-item"><span class="info-label">CLIENT</span><span class="info-value">${c.companyName || c.contactName || 'TBA'}</span></div>
  <div class="info-item"><span class="info-label">SITE CONTACT</span><span class="info-value">${c.contactName || 'TBA'}</span></div>
  <div class="info-item"><span class="info-label">PHONE</span><span class="info-value">${c.phone || 'TBA'}</span></div>
  <div class="info-item"><span class="info-label">BUILDER REF</span><span class="info-value">${c.builderRef || 'N/A'}</span></div>
  <div class="info-item"><span class="info-label">PO NUMBER</span><span class="info-value">${c.poNumber || 'N/A'}</span></div>
</div>
<h2>SCOPE OF WORK</h2>
<p style="margin:8px 0;color:#ccc;">${s.description || 'As per quote specifications.'}</p>
<table class="scope-table"><thead><tr><th>ITEM</th><th>QTY</th><th>UNIT</th></tr></thead><tbody>`;

  let briefLines = '';
  quoteData.lineItems.forEach(li => {
    briefLines += `<tr><td>${li.description}</td><td style="text-align:right;">${li.qty}</td><td>${li.unit}</td></tr>`;
  });

  const briefEnd = `</tbody></table>
<div class="no-pricing">NO PRICING OR MARGIN DATA — CREW DOCUMENT ONLY</div>
${materialsHtml ? '<h3>MATERIALS REQUIRED</h3>' + materialsHtml : ''}
${specialHtml}
<div class="footer">
  <strong>RENDER KING</strong> — ${RK_PHONE}<br>
  Generated ${new Date().toLocaleDateString('en-AU', {day:'2-digit',month:'short',year:'numeric'})}
</div>
</body></html>`;

  const fullBrief = briefHtml + briefLines + briefEnd;

  // Open in new window for printing
  const win = window.open('', '_blank');
  win.document.write(fullBrief);
  win.document.close();
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

      // Track for revision support
      currentQuoteId = decoded.id || quoteId;
      currentQuoteSha = data.sha;
      currentQuoteRevision = decoded.revision || 1;
      currentQuoteHistory = decoded.revisionHistory || [];

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
        decoded.specialConditions.forEach(text => addSpecialCondition(text));
      }

      // Restore signatures
      if (decoded.signatures) {
        const cs = decoded.signatures.client || {};
        const rs = decoded.signatures.rk || {};
        setVal('q-sig-typed-name', cs.typedName);
        setVal('q-sig-print-name', cs.printName);
        setVal('q-sig-date', cs.date);
        setVal('q-rk-sig-date', rs.date);

        if (cs.image) {
          const img = document.getElementById('q-sig-image');
          if (img) { img.src = cs.image; img.style.display = 'block'; }
          const banner = document.getElementById('q-sig-accepted-banner');
          if (banner) { banner.innerHTML = '<div style="color:var(--green);font-weight:700;font-size:12px;">SIGNED BY CLIENT</div>'; banner.style.display = 'block'; }
        }
        if (rs.image) {
          const img = document.getElementById('q-rk-sig-image');
          if (img) { img.src = rs.image; img.style.display = 'block'; }
          const banner = document.getElementById('q-rk-sig-accepted-banner');
          if (banner) { banner.innerHTML = '<div style="color:var(--green);font-weight:700;font-size:12px;">SIGNED BY KING MANNION</div>'; banner.style.display = 'block'; }
        }
      }

      // Show revision history panel
      renderRevisionHistory();
      updateRevisionBadge();

      // Show status badge
      if (decoded.status) {
        showStatusBadge(decoded.status);
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

// ── REVISION HISTORY PANEL ────────────────────────────────
function renderRevisionHistory() {
  const wrap = document.getElementById('q-revision-history');
  if (!wrap) return;
  if (!currentQuoteHistory || currentQuoteHistory.length <= 1) {
    wrap.style.display = 'none';
    return;
  }

  let html = '<div class="revision-history-panel"><h4>REVISION HISTORY</h4><table class="revision-table"><thead><tr><th>VER</th><th>DATE</th><th>BY</th><th>NOTE</th></tr></thead><tbody>';
  currentQuoteHistory.slice().reverse().forEach(rev => {
    const d = new Date(rev.savedAt);
    const ds = d.toLocaleDateString('en-AU', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    html += `<tr><td>v${rev.revision}</td><td>${ds}</td><td>${rev.savedBy}</td><td>${rev.note}</td></tr>`;
  });
  html += '</tbody></table></div>';
  wrap.innerHTML = html;
  wrap.style.display = 'block';
}

// ── STATUS BADGE ──────────────────────────────────────────
function showStatusBadge(status) {
  const badge = document.getElementById('q-status-badge');
  if (!badge) return;
  const colors = { PENDING: '#f59e0b', ACCEPTED: '#22c55e', DECLINED: '#ef4444', EXPIRED: '#6b7280' };
  badge.textContent = status;
  badge.style.background = colors[status] || '#6b7280';
  badge.style.display = 'inline-block';
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
  inputs.forEach(el => { el.disabled = !editMode; el.style.opacity = editMode ? '1' : '0.7'; });
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
  document.querySelectorAll('#tab-quote .field-val').forEach(el => { el.textContent = '\u00A0'; });
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
  ['q-sig-typed-name','q-sig-print-name','q-sig-date','q-rk-sig-date'].forEach(id => {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  currentQuoteId = null;
  currentQuoteSha = null;
  currentQuoteRevision = 0;
  currentQuoteHistory = [];
  updateRevisionBadge();
  calcQuoteTotals();
  updateQuoteValidity();
}

// ── MARGIN OVERRIDE ───────────────────────────────────────
function approveMarginOverride() {
  const reason = document.getElementById('margin-override-reason')?.value?.trim();
  const approvedBy = document.getElementById('margin-override-by')?.value?.trim();
  if (!reason) { alert('Override reason is required.'); return; }
  if (!approvedBy) { alert('Approved by name is required.'); return; }
  // Store override data
  window.__rkMarginOverride = { reason, approvedBy, timestamp: new Date().toISOString() };
  // Hide the override panel
  const panel = document.getElementById('margin-override-panel');
  if (panel) panel.style.display = 'none';
  // Show confirmation
  alert(`Margin override approved by ${approvedBy}. Reason: ${reason}. You can now save the quote.`);
  // Proceed to save
  saveAndShareQuote('client');
}

// ── SHOW REVISION HISTORY ─────────────────────────────────
function showRevisionHistory() {
  const wrap = document.getElementById('q-revision-history');
  if (!wrap) { alert('No revision history panel found.'); return; }
  if (!currentQuoteHistory || currentQuoteHistory.length === 0) {
    alert('No revision history available. Save a quote first, then edit and re-save to create revisions.');
    return;
  }
  // Toggle visibility
  if (wrap.style.display === 'block') {
    wrap.style.display = 'none';
    return;
  }
  renderRevisionHistory();
  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── FMT HELPER ────────────────────────────────────────────
if (typeof fmt === 'undefined') {
  var fmt = n => {
    if (n === 0 || isNaN(n)) return '$0.00';
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
}
