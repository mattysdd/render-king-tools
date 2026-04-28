// ═══════════════════════════════════════════════════════════
// RENDER KING — PDF QUOTE GENERATOR v4
// Matches MCK quote standard: black bg, gold accents,
// numbered sections, Blob URL method, full print CSS
// ═══════════════════════════════════════════════════════════

// ── KING MANNION EMBEDDED SIGNATURE (SVG) ─────────────────
const RK_SIGNATURE_DATA_URL = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 80" width="300" height="80">
    <path d="M20,55 C25,20 30,15 35,25 C40,35 30,55 35,55 C40,55 55,15 60,15 C65,15 50,55 55,55 C60,55 70,25 75,25 C80,25 72,55 78,50 M90,55 C95,20 100,15 105,25 C110,35 100,55 105,55 C110,55 125,15 130,15 C135,15 120,55 125,55 C130,55 140,25 145,25 C150,25 142,55 148,50 M160,55 C165,20 170,15 175,25 C180,35 170,55 175,55 C180,55 195,15 200,15 C205,15 190,55 195,55 C200,55 210,25 215,25 C220,25 212,55 218,50 C224,45 230,30 240,30 C250,30 245,55 250,55 C255,55 265,35 270,30"
    fill="none" stroke="#111" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
})();

// Helper: format YYYY-MM-DD date to DD/MM/YYYY for display
function formatDateForPDF(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return dateStr;
}

// ═══════════════════════════════════════════════════════════
// EXTRACT QUOTE DATA FROM LIVE DOM
// ═══════════════════════════════════════════════════════════

function extractRKQuoteData() {
  const txt = id => {
    const el = document.getElementById(id);
    if (!el) return '';
    return (el.textContent || el.innerText || '').trim().replace(/^\u00a0$/, '');
  };

  // Quote number — auto-generate if still blank stub
  let quoteNumber = txt('q-quote-number') || '';
  if (!quoteNumber || quoteNumber === 'RK-2026-' || quoteNumber === 'RK-DRAFT') {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    quoteNumber = 'RK-' + year + '-' + rand;
    const qnEl = document.getElementById('q-quote-number');
    if (qnEl) qnEl.textContent = quoteNumber;
  }

  const dateIssued = txt('q-date-display') || new Date().toLocaleDateString('en-AU', { day:'2-digit', month:'2-digit', year:'numeric' });
  const validitySel = document.getElementById('q-validity-select');
  const validityLabel = validitySel ? validitySel.options[validitySel.selectedIndex].text : '48 Hours';
  const validityHours = validitySel ? parseInt(validitySel.value) : 48;
  const validityBanner = txt('q-validity-banner') || 'QUOTE VALID FOR 48 HOURS FROM DATE OF ISSUE';

  // Prepared by — from agent or default
  const preparedBy = (typeof rkSharedData !== 'undefined' && rkSharedData.preparedBy) ? rkSharedData.preparedBy : 'King Mannion';

  // Client details — read from contenteditable fields
  const fields = document.querySelectorAll('#tab-quote .section');
  const clientSection = fields[0];
  const scopeSection = fields[1];

  function getFieldVal(section, index) {
    const vals = section?.querySelectorAll('.field-val');
    return vals && vals[index] ? vals[index].textContent.trim().replace(/\u00A0/g, '') : '';
  }

  const clientName = getFieldVal(clientSection, 0);
  const contactName = getFieldVal(clientSection, 1);
  const clientPhone = getFieldVal(clientSection, 2);
  const clientEmail = getFieldVal(clientSection, 3);
  const siteAddress = getFieldVal(clientSection, 4);
  const lotPlan = getFieldVal(clientSection, 5);
  const poNumber = getFieldVal(clientSection, 6);
  const builderRef = getFieldVal(clientSection, 7);

  // Scope
  const scopeDescription = getFieldVal(scopeSection, 0);
  const substrate = getFieldVal(scopeSection, 1);
  const difficulty = getFieldVal(scopeSection, 2);

  // Colour / finish and timeline from rkSharedData
  const colourFinish = (typeof rkSharedData !== 'undefined' && rkSharedData.colour) ? rkSharedData.colour : '';
  const startDate = (typeof rkSharedData !== 'undefined' && rkSharedData.startDate) ? rkSharedData.startDate : 'TBC';
  const duration = (typeof rkSharedData !== 'undefined' && rkSharedData.duration) ? rkSharedData.duration : 'TBC';

  // Line items
  const lineItems = [];
  document.querySelectorAll('#q-pricing-body tr').forEach(tr => {
    const descInput = tr.querySelector('input.desc');
    const numInputs = tr.querySelectorAll('input[type="number"]');
    const unitInput = tr.querySelectorAll('input[type="text"]');
    if (descInput && numInputs.length >= 2) {
      const qty = parseFloat(numInputs[0].value) || 0;
      const rate = parseFloat(numInputs[1].value) || 0;
      const total = qty * rate;
      if (descInput.value || qty > 0) {
        lineItems.push({
          desc: descInput.value || '',
          qty: qty,
          unit: unitInput[1]?.value || 'sqm',
          rate: rate,
          total: total
        });
      }
    }
  });

  const subtotal = lineItems.reduce((s, l) => s + l.total, 0);
  const gst = subtotal * 0.10;
  const grandTotal = subtotal + gst;

  // Builder type
  const builderType = document.getElementById('q-builder-type')?.value || 'standard';

  // Payment schedule
  let depositPct, finalPct;
  if (builderType === 'volume') {
    depositPct = 0; finalPct = 50;
  } else if (subtotal >= 20000) {
    depositPct = 5; finalPct = 45;
  } else {
    depositPct = 10; finalPct = 40;
  }
  const matPct = 50;
  const depositAmt = subtotal * (depositPct / 100);
  const materialAmt = subtotal * (matPct / 100);
  const finalAmt = subtotal * (finalPct / 100);

  // Business constants
  const variationRate = (typeof getSettingVal === 'function') ? getSettingVal('set-variation-rate') : 110;
  const minJob = (typeof getSettingVal === 'function') ? getSettingVal('set-min-job') : 2200;
  const creditLimit = 10000;
  const measureFee = 220;
  const overdueAdminFee = 220;
  const overdueInterest = 3;
  const upfrontDiscPct = 5;
  const upfrontDiscCap = 1000;
  const upfrontDisc = Math.min(subtotal * (upfrontDiscPct / 100), upfrontDiscCap);
  const upfrontTotal = subtotal - upfrontDisc;

  // Inclusions / Exclusions — read from live DOM
  const getListItems = selector => {
    const el = document.querySelector(selector);
    if (!el) return [];
    return Array.from(el.querySelectorAll('li')).map(li => li.textContent.trim()).filter(t => t);
  };
  const inclusions = getListItems('#tab-quote .inc-col .ie-list');
  const exclusions = getListItems('#tab-quote .exc-col .ie-list');

  // Signatures
  let clientSigDataURL = '';
  if (typeof sigCanvas !== 'undefined' && typeof sigHasContent !== 'undefined' && sigHasContent) {
    clientSigDataURL = sigCanvas.toDataURL('image/png');
  }
  // Check for accepted signature image
  const sigImg = document.getElementById('q-sig-image');
  if (sigImg && sigImg.src && sigImg.style.display !== 'none') {
    clientSigDataURL = sigImg.src;
  }

  let rkSigDataURL = '';
  if (typeof rkSigCanvas !== 'undefined' && typeof rkSigHasContent !== 'undefined' && rkSigHasContent) {
    rkSigDataURL = rkSigCanvas.toDataURL('image/png');
  }
  // Check for accepted RK signature image
  const rkSigImg = document.getElementById('q-rk-sig-image');
  if (rkSigImg && rkSigImg.src && rkSigImg.style.display !== 'none') {
    rkSigDataURL = rkSigImg.src;
  }
  // Fallback to embedded signature
  if (!rkSigDataURL) rkSigDataURL = RK_SIGNATURE_DATA_URL;

  const clientTypedName = (document.getElementById('q-sig-typed-name') || {}).value || '';
  const clientPrintName = (document.getElementById('q-sig-print-name') || {}).value || '';
  const clientSigDate = (document.getElementById('q-sig-date') || {}).value || '';
  const rkTypedName = (document.getElementById('q-rk-typed-name') || {}).value || 'King Mannion';
  const rkTypedTitle = (document.getElementById('q-rk-typed-title') || {}).value || 'Director';
  const rkSigDate = (document.getElementById('q-rk-sig-date') || {}).value || '';

  // Attachments
  const attachments = (typeof quoteAttachments !== 'undefined') ? quoteAttachments : [];

  // Special conditions
  const specialConditions = (typeof getSpecialConditions === 'function') ? getSpecialConditions() : [];

  return {
    quoteNumber, dateIssued, validityLabel, validityHours, validityBanner, preparedBy,
    clientName, contactName, clientPhone, clientEmail, siteAddress, lotPlan, poNumber, builderRef,
    scopeDescription, substrate, difficulty, colourFinish, startDate, duration,
    builderType,
    lineItems, subtotal, gst, grandTotal,
    depositPct, depositAmt, materialAmt, matPct, finalPct, finalAmt,
    variationRate, minJob, creditLimit, measureFee,
    overdueAdminFee, overdueInterest,
    upfrontDiscPct, upfrontDiscCap, upfrontDisc, upfrontTotal,
    inclusions, exclusions,
    clientSigDataURL, rkSigDataURL,
    clientTypedName, clientPrintName, clientSigDate,
    rkTypedName, rkTypedTitle, rkSigDate,
    attachments, specialConditions
  };
}


// ═══════════════════════════════════════════════════════════
// BUILD STATIC QUOTE HTML (standalone Blob page)
// ═══════════════════════════════════════════════════════════

function buildRKQuoteHTML(d) {
  const $ = v => '$' + v.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<title>Render King Quote — ${d.quoteNumber}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*, *::before, *::after {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
  box-sizing: border-box;
}
@page { size: A4 portrait; margin: 15mm; }
html, body {
  margin: 0; padding: 0;
  background: #0a0a0a !important;
  color: #ffffff !important;
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 10pt; line-height: 1.5;
}
.container { max-width: 800px; margin: 0 auto; padding: 20pt; }
.page-section { padding: 0; margin-bottom: 0; }
.page-section + .page-section { page-break-before: always; }
.page-section:last-child { page-break-after: auto; }
.doc-header { border-bottom: 2px solid #c9a84c; padding-bottom: 16pt; margin-bottom: 16pt; }
.header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14pt; flex-wrap: wrap; gap: 12pt; }
.brand-block .label { font-size: 8pt; color: #c9a84c; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 4pt; }
.brand-block h1 { font-size: 22pt; color: #ffffff; margin: 0 0 4pt 0; letter-spacing: 2px; font-weight: 800; }
.brand-block .tagline { font-size: 8.5pt; color: #aaaaaa; letter-spacing: 1px; }
.contact-block { text-align: right; font-size: 8.5pt; color: #aaaaaa; line-height: 2; }
.contact-block strong { color: #c9a84c; font-size: 7pt; letter-spacing: 1px; margin-right: 6pt; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0; background: #1a1a1a !important; border: 1px solid #333; border-radius: 4px; overflow: hidden; }
.meta-cell { padding: 8pt 12pt; border-right: 1px solid #333; }
.meta-cell:last-child { border-right: none; }
.meta-label { font-size: 6.5pt; color: #c9a84c; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 3pt; font-weight: 600; }
.meta-value { font-size: 10pt; color: #ffffff; font-weight: 600; }
.validity-banner { background: #c9a84c !important; color: #000000 !important; text-align: center; padding: 7pt 12pt; font-size: 8pt; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin: 14pt 0; border-radius: 3px; }
.sec-hd { display: flex; align-items: center; gap: 10pt; margin-bottom: 12pt; padding-bottom: 8pt; border-bottom: 1px solid #333; }
.sec-num { background: #c9a84c !important; color: #000000 !important; font-weight: 800; font-size: 9pt; padding: 3pt 8pt; border-radius: 3px; min-width: 24pt; text-align: center; }
.sec-hd h2 { margin: 0; font-size: 11pt; color: #c9a84c; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }
.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; }
.field-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10pt; }
.field-full { grid-column: 1 / -1; }
.field { background: #111111 !important; border: 1px solid #333; border-radius: 3px; padding: 6pt 10pt; }
.field-lbl { font-size: 6.5pt; color: #c9a84c; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; margin-bottom: 2pt; }
.field-val { font-size: 9.5pt; color: #ffffff; min-height: 12pt; line-height: 1.5; }
table { width: 100%; border-collapse: collapse; }
th { background: #1a1a1a !important; color: #c9a84c !important; font-size: 7pt; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; padding: 6pt 8pt; border: 1px solid #c9a84c; text-align: left; }
th.right { text-align: right; }
td { background: #111111 !important; color: #ffffff !important; font-size: 9pt; padding: 5pt 8pt; border: 1px solid #333; }
td.right { text-align: right; }
tr:nth-child(even) td { background: #0d0d0d !important; }
tfoot td { background: #1a1a1a !important; font-weight: 700; border-top: 2px solid #c9a84c !important; }
.grand-total td { color: #c9a84c !important; font-size: 11pt; font-weight: 800; border-top: 2px solid #c9a84c !important; }
.callout { background: #1a1a1a !important; border-left: 3px solid #c9a84c; padding: 8pt 12pt; font-size: 8pt; color: #ffffff; line-height: 1.6; border-radius: 0 3px 3px 0; margin: 10pt 0; }
.callout strong { color: #c9a84c; }
.callout.warning { border-left-color: #ff4444; }
.callout.warning strong { color: #ff4444; }
.inc-exc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14pt; }
.ie-col { background: #111111 !important; border: 1px solid #333; border-radius: 4px; padding: 10pt 12pt; }
.ie-col h3 { margin: 0 0 8pt 0; font-size: 9pt; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; padding-bottom: 6pt; border-bottom: 1px solid #333; }
.ie-col.inc h3 { color: #c9a84c; }
.ie-col.exc h3 { color: #aaaaaa; }
.ie-item { font-size: 8.5pt; color: #ffffff; padding: 3pt 0; line-height: 1.5; }
.ie-item .tick { color: #c9a84c; font-weight: 700; margin-right: 6pt; }
.ie-item .cross { color: #ff6b6b; font-weight: 700; margin-right: 6pt; }
.pay-stage { font-size: 7pt; color: #c9a84c; font-weight: 700; }
.pay-note { font-size: 7.5pt; color: #aaaaaa; font-style: italic; }
.tc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8pt; }
.tc-item { background: #111111 !important; border: 1px solid #333; border-radius: 3px; padding: 8pt 10pt; font-size: 8pt; color: #ffffff; line-height: 1.5; }
.tc-item .tc-head { color: #c9a84c; font-weight: 700; font-size: 7pt; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 3pt; }
.sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24pt; margin-top: 16pt; }
.sig-block {}
.sig-label { font-size: 7pt; color: #c9a84c; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; margin-bottom: 6pt; }
.sig-line { border-bottom: 1px solid #c9a84c; height: 36pt; margin-bottom: 4pt; position: relative; }
.sig-line img { position: absolute; bottom: 2pt; left: 0; max-height: 32pt; max-width: 200pt; }
.sig-sub { font-size: 8pt; color: #aaaaaa; margin-top: 4pt; }
.doc-footer { margin-top: 20pt; padding: 10pt 14pt; background: #1a1a1a !important; border: 1px solid #333; border-radius: 3px; text-align: center; font-size: 8pt; color: #aaaaaa; line-height: 1.8; }
.doc-footer .gold { color: #c9a84c; font-weight: 700; }
.legal-footer { margin-top: 14pt; padding: 10pt 14pt; background: #111111 !important; border: 1px solid #333; border-radius: 3px; text-align: center; font-size: 7.5pt; color: #aaaaaa; line-height: 1.8; }
.legal-footer strong { color: #c9a84c; }
@media (max-width: 600px) {
  .meta-grid { grid-template-columns: 1fr 1fr; }
  .field-grid, .inc-exc-grid, .sig-grid, .tc-grid { grid-template-columns: 1fr; }
  .field-grid-3 { grid-template-columns: 1fr; }
  .header-row { flex-direction: column; }
  .contact-block { text-align: left; }
  .container { padding: 12pt; }
}
@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  html, body { background: #0a0a0a !important; color: #ffffff !important; height: auto !important; min-height: 0 !important; }
  .container { padding: 0 !important; max-width: 100% !important; }
  .no-print { display: none !important; }
  .page-section { page-break-inside: avoid; }
  .page-section + .page-section { page-break-before: always; }
  .validity-banner { background: #c9a84c !important; color: #000000 !important; }
  .sec-num { background: #c9a84c !important; color: #000000 !important; }
  .meta-grid { background: #1a1a1a !important; }
  .field { background: #111111 !important; }
  th { background: #1a1a1a !important; color: #c9a84c !important; }
  td { background: #111111 !important; color: #ffffff !important; }
  tr:nth-child(even) td { background: #0d0d0d !important; }
  tfoot td { background: #1a1a1a !important; }
  .callout { background: #1a1a1a !important; }
  .ie-col { background: #111111 !important; }
  .tc-item { background: #111111 !important; }
  .doc-footer { background: #1a1a1a !important; }
  .legal-footer { background: #111111 !important; }
}
</style>
</head>
<body>
<div class="container">

<!-- PAGE 1: HEADER + CLIENT DETAILS + PROJECT SCOPE -->
<div class="page-section">
  <div class="doc-header">
    <div class="header-row">
      <div class="brand-block">
        <div class="label">FORMAL QUOTATION</div>
        <h1>RENDER KING</h1>
        <div class="tagline">Premium Acrylic Render &amp; Texture Finish Specialist — Gold Coast QLD</div>
      </div>
      <div class="contact-block">
        <div><strong>PHONE</strong> 0468 041 477</div>
        <div><strong>EMAIL</strong> admin@renderrender.com.au</div>
        <div><strong>WEB</strong> renderrender.com.au</div>
        <div style="margin-top:6pt;font-size:7.5pt;color:#666;">All prices ex GST unless stated</div>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-cell"><div class="meta-label">QUOTE NUMBER</div><div class="meta-value">${d.quoteNumber}</div></div>
      <div class="meta-cell"><div class="meta-label">DATE ISSUED</div><div class="meta-value">${d.dateIssued}</div></div>
      <div class="meta-cell"><div class="meta-label">VALIDITY</div><div class="meta-value">${d.validityLabel}</div></div>
      <div class="meta-cell"><div class="meta-label">PREPARED BY</div><div class="meta-value">${d.preparedBy}</div></div>
    </div>
  </div>
  <div class="validity-banner">${d.validityBanner}</div>

  <div class="sec-hd"><div class="sec-num">01</div><h2>CLIENT DETAILS</h2></div>
  <div class="field-grid">
    <div class="field"><div class="field-lbl">CLIENT / COMPANY NAME</div><div class="field-val">${d.clientName || '\u2014'}</div></div>
    <div class="field"><div class="field-lbl">SITE ADDRESS</div><div class="field-val">${d.siteAddress || '\u2014'}</div></div>
    <div class="field"><div class="field-lbl">CONTACT NAME</div><div class="field-val">${d.contactName || '\u2014'}</div></div>
    <div class="field"><div class="field-lbl">LOT / PLAN NUMBER</div><div class="field-val">${d.lotPlan || '\u2014'}</div></div>
    <div class="field"><div class="field-lbl">PHONE</div><div class="field-val">${d.clientPhone || '\u2014'}</div></div>
    <div class="field"><div class="field-lbl">WORK CONTRACT / PO NUMBER</div><div class="field-val">${d.poNumber || '\u2014'}</div></div>
    <div class="field"><div class="field-lbl">EMAIL</div><div class="field-val">${d.clientEmail || '\u2014'}</div></div>
    <div class="field"><div class="field-lbl">BUILDER REFERENCE</div><div class="field-val">${d.builderRef || '\u2014'}</div></div>
  </div>

  <div style="height:14pt;"></div>
  <div class="sec-hd"><div class="sec-num">02</div><h2>PROJECT SCOPE</h2></div>
  <div class="field-grid">
    <div class="field"><div class="field-lbl">SUBSTRATE TYPE</div><div class="field-val">${d.substrate || '\u2014'}</div></div>
    <div class="field"><div class="field-lbl">DIFFICULTY LEVEL</div><div class="field-val">${d.difficulty || '\u2014'}</div></div>
    ${d.colourFinish ? `<div class="field"><div class="field-lbl">COLOUR / FINISH</div><div class="field-val">${d.colourFinish}</div></div>` : ''}
    <div class="field"><div class="field-lbl">BUILDER TYPE</div><div class="field-val">${({volume:'Volume Builder',standard:'Standard Builder',luxury:'Luxury Builder',premium:'Premium Builder'})[d.builderType] || d.builderType}</div></div>
  </div>
  <div style="height:8pt;"></div>
  <div class="field field-full"><div class="field-lbl">SCOPE OF WORKS</div><div class="field-val">${d.scopeDescription || 'Acrylic render and texture finish application as per specifications below.'}</div></div>
</div>

<!-- PAGE 2: PRICING SCHEDULE -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">03</div><h2>SCOPE OF WORKS &amp; PRICING</h2></div>
  <table>
    <thead><tr><th style="width:42%">DESCRIPTION</th><th class="right" style="width:10%">QTY</th><th style="width:12%">UNIT</th><th class="right" style="width:18%">RATE (EX GST)</th><th class="right" style="width:18%">TOTAL (EX GST)</th></tr></thead>
    <tbody>${d.lineItems.map(l => `<tr><td>${l.desc}</td><td class="right">${l.qty}</td><td>${l.unit}</td><td class="right">${$(l.rate)}</td><td class="right">${$(l.total)}</td></tr>`).join('')}</tbody>
    <tfoot>
      <tr><td colspan="4" style="text-align:right;">SUBTOTAL (EX GST)</td><td class="right">${$(d.subtotal)}</td></tr>
      <tr><td colspan="4" style="text-align:right;">GST (10%)</td><td class="right">${$(d.gst)}</td></tr>
      <tr class="grand-total"><td colspan="4" style="text-align:right;">TOTAL (INC GST)</td><td class="right">${$(d.grandTotal)}</td></tr>
    </tfoot>
  </table>
  ${d.subtotal > d.creditLimit ? `<div class="callout warning"><strong>CREDIT LIMIT NOTE:</strong> Contract value exceeds the $${d.creditLimit.toLocaleString()} credit limit. Full deposit and material payment required before commencement. No credit terms available.</div>` : ''}
  <div class="callout"><strong>ON-SITE MEASURE FEE:</strong> A non-refundable on-site measure fee of <strong>$${d.measureFee} ex GST</strong> applies where a site visit is required. This fee is <strong>credited in full against the contract</strong> upon acceptance.</div>
</div>

<!-- PAGE 3: INCLUSIONS & EXCLUSIONS -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">04</div><h2>INCLUSIONS &amp; EXCLUSIONS</h2></div>
  <div class="inc-exc-grid">
    <div class="ie-col inc"><h3>INCLUSIONS</h3>${d.inclusions.map(i => `<div class="ie-item"><span class="tick">\u2713</span>${i}</div>`).join('')}</div>
    <div class="ie-col exc"><h3>EXCLUSIONS</h3>${d.exclusions.map(e => `<div class="ie-item"><span class="cross">\u2717</span>${e}</div>`).join('')}</div>
  </div>
</div>

<!-- PAGE 4: PAYMENT SCHEDULE -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">05</div><h2>PAYMENT SCHEDULE</h2></div>
  <div class="callout" style="margin-bottom:14pt;"><strong>PAYMENT STRUCTURE:</strong> Booking deposit is <strong>${d.depositPct}%</strong> ${d.subtotal > 20000 ? '(contract value exceeds $20,000)' : d.builderType === 'volume' ? '(volume builder — no deposit)' : '(contract value under $20,000)'}. Material payment is due before commencement. Works do not start until cleared funds are received.</div>
  <table>
    <thead><tr><th style="width:5%">#</th><th style="width:32%">STAGE</th><th class="right" style="width:22%">AMOUNT (EX GST)</th><th class="right" style="width:22%">% OF CONTRACT</th><th style="width:19%">DUE</th></tr></thead>
    <tbody>
      <tr><td class="pay-stage">1</td><td><strong>Booking Deposit</strong><br><span class="pay-note">Secures your place in the schedule</span></td><td class="right">${$(d.depositAmt)}</td><td class="right">${d.depositPct}%</td><td class="pay-note">On acceptance</td></tr>
      <tr><td class="pay-stage">2</td><td><strong>Material Payment</strong><br><span class="pay-note">Works do not start until paid</span></td><td class="right">${$(d.materialAmt)}</td><td class="right">${d.matPct}%</td><td class="pay-note">Prior to start date</td></tr>
      <tr><td class="pay-stage">3</td><td><strong>Final Claim</strong><br><span class="pay-note">On practical completion and sign-off</span></td><td class="right">${$(d.finalAmt)}</td><td class="right">${d.finalPct}%</td><td class="pay-note">Within 3 business days</td></tr>
    </tbody>
    <tfoot><tr class="grand-total"><td colspan="2" style="text-align:right;">TOTAL CONTRACT VALUE (EX GST)</td><td class="right">${$(d.subtotal)}</td><td class="right">100%</td><td></td></tr></tfoot>
  </table>
  <div class="callout" style="margin-top:14pt;"><strong>UPFRONT PAYMENT REDUCTION:</strong> A <strong>${d.upfrontDiscPct}% reduction</strong> (capped at $${d.upfrontDiscCap.toLocaleString()}) is available for clients who pay the full contract amount upfront. Upfront price: <strong>${$(d.upfrontTotal)}</strong> (saving ${$(d.upfrontDisc)}).</div>
</div>

<!-- PAGE 5: TIMELINE + KEY TERMS -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">06</div><h2>PROJECT TIMELINE</h2></div>
  <div class="field-grid-3">
    <div class="field"><div class="field-lbl">ESTIMATED START DATE</div><div class="field-val">${d.startDate || 'TBC'}</div></div>
    <div class="field"><div class="field-lbl">ESTIMATED DURATION</div><div class="field-val">${d.duration || 'TBC'}</div></div>
    <div class="field"><div class="field-lbl">ESTIMATED COMPLETION</div><div class="field-val">TBC</div></div>
  </div>
  <div class="callout" style="margin-top:12pt;margin-bottom:18pt;"><strong>TIMELINE NOTE:</strong> Timeline assumes unobstructed site access, no other trades in the same area, and standard weather conditions. Delays caused by other trades, weather, or site access issues may extend the timeline.</div>

  <div class="sec-hd"><div class="sec-num">07</div><h2>TERMS &amp; CONDITIONS SUMMARY</h2></div>
  <div class="tc-grid">
    <div class="tc-item"><div class="tc-head">Quote Validity</div>This quote is valid for the period stated above from date of issue. After expiry, pricing must be reconfirmed.</div>
    <div class="tc-item"><div class="tc-head">Variations</div>All variations must be agreed in writing. Rate: $${d.variationRate}/hr (2-hour minimum) plus materials at cost.</div>
    <div class="tc-item"><div class="tc-head">Minimum Job Value</div>$${d.minJob.toLocaleString()} ex GST minimum applies to all works.</div>
    <div class="tc-item"><div class="tc-head">Workmanship Warranty</div>All workmanship is covered under statutory warranties as required by Queensland law.</div>
    <div class="tc-item"><div class="tc-head">Payment Disputes</div>No third-party contractors may be engaged to rectify alleged defects until a written resolution is agreed upon by both parties.</div>
    <div class="tc-item"><div class="tc-head">Overdue Payments</div>Invoices overdue by 3+ days incur a $${d.overdueAdminFee} admin fee. Interest accrues at ${d.overdueInterest}% per week from Day 4.</div>
    <div class="tc-item"><div class="tc-head">Site Access</div>The client must ensure unobstructed access to the work area for the full project duration.</div>
    <div class="tc-item"><div class="tc-head">Termination</div>Either party may terminate with written notice. All completed work is payable immediately upon termination.</div>
    <div class="tc-item"><div class="tc-head">Governing Law</div>Building Industry Fairness (Security of Payment) Act 2017 (QLD).</div>
    <div class="tc-item"><div class="tc-head">Substrate Responsibility</div>The client is responsible for ensuring the substrate is structurally sound prior to commencement.</div>
  </div>
  <div class="callout" style="margin-top:12pt;"><strong>FULL TERMS &amp; CONDITIONS:</strong> The above is a summary only. Full Payment Terms &amp; Conditions are set out in the companion document.</div>
</div>

${(d.attachments && d.attachments.length > 0) ? `
<!-- SITE PHOTOS & PLANS -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">07B</div><h2>SITE PHOTOS, PLANS &amp; MARKUPS</h2></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180pt,1fr));gap:10pt;">
    ${d.attachments.map(att => att.type === 'application/pdf' ? `<div style="background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:12pt;text-align:center;"><div style="font-size:24pt;color:#c9a84c;margin-bottom:6pt;">PDF</div><div style="font-size:8pt;color:#999;">${att.name}</div></div>` : `<div style="border:1px solid #333;border-radius:4px;overflow:hidden;"><img src="${att.data}" style="width:100%;height:auto;display:block;"><div style="padding:4pt 8pt;font-size:8pt;color:#999;background:#1a1a1a;">${att.name}</div></div>`).join('')}
  </div>
</div>` : ''}

${(d.specialConditions && d.specialConditions.length > 0) ? `
<!-- SPECIAL CONDITIONS -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num" style="background:#c9a84c;color:#000;">SC</div><h2>SPECIAL CONDITIONS</h2></div>
  ${d.specialConditions.map((c, i) => `<div style="padding:6pt 0;border-bottom:1px solid #333;"><span style="color:#c9a84c;font-weight:700;margin-right:8pt;">SC.${i+1}</span><span style="color:#fff;">${c}</span></div>`).join('')}
</div>` : ''}

<!-- ACCEPTANCE & SIGNATURE -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">08</div><h2>ACCEPTANCE &amp; SIGNATURE</h2></div>
  <div class="callout" style="margin-bottom:18pt;"><strong>HOW TO ACCEPT:</strong> Sign below (or print, sign, and return). Pay the booking deposit to confirm your start date.</div>
  <div class="sig-grid">
    <div class="sig-block">
      <div class="sig-label">CLIENT SIGNATURE</div>
      <div class="sig-line">${d.clientSigDataURL ? `<img src="${d.clientSigDataURL}" alt="Client Signature">` : ''}</div>
      <div class="sig-sub">Full Name: <strong style="color:#fff;">${d.clientTypedName || d.clientName || '___________________________'}</strong></div>
      <div class="sig-sub" style="margin-top:4pt;">Print Name: <strong style="color:#fff;">${d.clientPrintName || '___________________________'}</strong></div>
      <div class="sig-sub" style="margin-top:4pt;">Date: <strong style="color:#fff;">${d.clientSigDate ? formatDateForPDF(d.clientSigDate) : '___________________________'}</strong></div>
    </div>
    <div class="sig-block">
      <div class="sig-label">RENDER RENDER PTY LTD (RENDER KING) — AUTHORISED SIGNATORY</div>
      <div class="sig-line">${d.rkSigDataURL ? `<img src="${d.rkSigDataURL}" alt="RK Signature">` : ''}</div>
      <div class="sig-sub">Name: <strong style="color:#fff;">${d.rkTypedName || 'King Mannion'}</strong></div>
      <div class="sig-sub" style="margin-top:4pt;">Title: <strong style="color:#fff;">${d.rkTypedTitle || 'Director'}</strong></div>
      <div class="sig-sub" style="margin-top:4pt;">Date: <strong style="color:#fff;">${d.rkSigDate ? formatDateForPDF(d.rkSigDate) : '___________________________'}</strong></div>
    </div>
  </div>
  <div class="legal-footer">By signing this document, the client confirms they have read and agree to all terms summarised in Section 07 and the full Payment Terms &amp; Conditions.<br>This quote is a formal offer. It does not constitute a binding contract until signed by both parties and the booking deposit is received.</div>
  <div class="doc-footer"><span class="gold">RENDER RENDER PTY LTD</span> &nbsp;|&nbsp; Trading as Render King &nbsp;|&nbsp; 0468 041 477 &nbsp;|&nbsp; admin@renderrender.com.au &nbsp;|&nbsp; renderrender.com.au</div>
</div>

</div>
<script>window.onload=function(){setTimeout(function(){window.print();},600);};</script>
</body>
</html>`;
}


// ═══════════════════════════════════════════════════════════
// GENERATE PDF QUOTE — Blob URL method
// ═══════════════════════════════════════════════════════════

function generatePDFQuote() {
  const d = extractRKQuoteData();
  const html = buildRKQuoteHTML(d);

  // Use Blob URL to open the print window — avoids document.write() blocking in modern browsers
  const blob = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow) {
    // Fallback: offer download if popup is blocked
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = d.quoteNumber + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    // Revoke after window has had time to load
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  }
}
