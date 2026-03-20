// ═══════════════════════════════════════════════════════════
// RENDER KING — MARGIN CALCULATOR ENGINE
// All prices ex GST. Source: MCK_RR_MASTER_DATA_DUMP.md
// ═══════════════════════════════════════════════════════════

// ── TAB SWITCHING ──────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active','print-active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-' + tabId);
  if (tab) { tab.classList.add('active','print-active'); }
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
}

// ── LOCKED DEFAULTS ────────────────────────────────────────
const LOCKED_DEFAULTS = {
  subbieRate: 27,
  variationRate: 110,
  minJob: 2200,
  diff1: 0,
  diff2: 5,
  diff3: 12,
  diff4: 22,
  diff5: 35,
  volFloor: 47
};

// ── SUBSTRATE TYPES ────────────────────────────────────────
const SUBSTRATES = {
  'brick_hebel':        { name:'Brick / Hebel',                          baseRate:55,  unit:'sqm', matCostPerSqm:5.85 },
  'eps_blueboard':      { name:'EPS / Blueboard',                        baseRate:75,  unit:'sqm', matCostPerSqm:7.50 },
  'specialty':          { name:'Specialty / Architectural',              baseRate:110, unit:'sqm', matCostPerSqm:9.00 },
  'hebel_supply':       { name:'Hebel Supply + Install',                 baseRate:110, unit:'sqm', matCostPerSqm:12.00 },
  'hebel_full':         { name:'Full Hebel System (Supply+Install+Render)', baseRate:165, unit:'sqm', matCostPerSqm:15.00 },
  'eps_supply':         { name:'EPS Supply + Install',                   baseRate:85,  unit:'sqm', matCostPerSqm:8.00 },
  'eps_full':           { name:'Full EPS System (Supply+Install+Render)',   baseRate:150, unit:'sqm', matCostPerSqm:12.00 },
  'slab_build':         { name:'Slab Build (Linear Metre)',              baseRate:15,  unit:'lm',  matCostPerSqm:2.00 }
};

// ── DIFFICULTY LEVELS ──────────────────────────────────────
const DIFFICULTY_LEVELS = {
  1: { name:'Volume / Ground',    desc:'Standard ground floor, flat walls, easy access, no scaffold' },
  2: { name:'Lower Complexity',   desc:'Some height, minor scaffold or planks, limited cutting-in' },
  3: { name:'Upper Storey',       desc:'Full upper storey, scaffold required, moderate complexity' },
  4: { name:'Detail / Complex',   desc:'Curves, reveals, complex profiles, tight access, multi-level scaffold' },
  5: { name:'Luxury / Architectural', desc:'Maximum complexity, full scaffold, architectural detail, premium finish' }
};

// ── BUILDER TIERS ──────────────────────────────────────────
const BUILDER_TIERS = {
  volume:   { name:'Volume Builder',   marginTarget:0.275, marginMin:0.25, marginMax:0.30, minJob:2200 },
  standard: { name:'Standard Builder',  marginTarget:0.40,  marginMin:0.40, marginMax:0.50, minJob:2200 },
  luxury:   { name:'Luxury Builder',    marginTarget:0.40,  marginMin:0.40, marginMax:0.55, minJob:2200 }
};

let currentTier = 'standard';

// ── DULUX MATERIAL ESTIMATES (from Dulux Pack Card 2026) ───
const DULUX_MATERIALS = {
  'AcraPrime Water Base 15L':          { unitCost:104.64, coverageSqm:100, unit:'15L pail' },
  'Powerfinish 15L':                   { unitCost:73.57,  coverageSqm:16.7, unit:'15L pail' },
  'Acraskin Low Gloss 15L':            { unitCost:143.84, coverageSqm:100, unit:'15L pail' },
  'Acrabuild Medium Build 20kg':       { unitCost:11.60,  coverageSqm:5,   unit:'20kg bag' },
  'Renderwall Joint & Skim 20kg':      { unitCost:27.13,  coverageSqm:7.7, unit:'20kg bag' },
  '200mm Green Mesh Tape 50m':         { unitCost:21.33,  coverageSqm:100, unit:'50m roll' },
  'PreTape Mask Film 2700mm':          { unitCost:8.65,   coverageSqm:100, unit:'roll' },
  'Touch Up Can Kit':                  { unitCost:4.58,   coverageSqm:200, unit:'kit' },
  'Slim Trim 3000mm':                  { unitCost:2.27,   coverageSqm:33.3, unit:'3m piece' }
};

// ── HELPERS ────────────────────────────────────────────────
const fmt = n => {
  if (n === 0 || isNaN(n)) return '$0.00';
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

function getSettingVal(id) {
  return parseFloat(document.getElementById(id)?.value) || 0;
}

function getDiffAddon(level) {
  return getSettingVal('set-diff-' + level);
}

// ── STOP-CHECK / DRIFT DETECTION ──────────────────────────
function checkDrift() {
  const checks = [
    { id:'set-subbie-rate',    locked: LOCKED_DEFAULTS.subbieRate },
    { id:'set-variation-rate', locked: LOCKED_DEFAULTS.variationRate },
    { id:'set-min-job',        locked: LOCKED_DEFAULTS.minJob },
    { id:'set-diff-1',         locked: LOCKED_DEFAULTS.diff1 },
    { id:'set-diff-2',         locked: LOCKED_DEFAULTS.diff2 },
    { id:'set-diff-3',         locked: LOCKED_DEFAULTS.diff3 },
    { id:'set-diff-4',         locked: LOCKED_DEFAULTS.diff4 },
    { id:'set-diff-5',         locked: LOCKED_DEFAULTS.diff5 },
    { id:'set-vol-floor',      locked: LOCKED_DEFAULTS.volFloor }
  ];

  let drifted = false;
  checks.forEach(c => {
    const el = document.getElementById(c.id);
    const val = parseFloat(el?.value) || 0;
    if (val !== c.locked) {
      drifted = true;
      if (el) el.style.borderColor = 'var(--gold)';
    } else {
      if (el) el.style.borderColor = '';
    }
  });

  const banner = document.getElementById('drift-banner');
  if (banner) {
    banner.classList.toggle('visible', drifted);
  }
}

// ── BUILDER TIER SELECTION ─────────────────────────────────
function selectTier(el, key) {
  document.querySelectorAll('#tier-grid .tier-option').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  currentTier = key;
  recalc();
}

// ── SURFACE LINE MANAGEMENT ────────────────────────────────
let lineCount = 0;

function addSurfaceLine(defaultSubstrate, defaultDiff) {
  const count = document.querySelectorAll('.surface-line').length;
  if (count >= 10) return;
  lineCount++;
  const id = lineCount;
  const sub = defaultSubstrate || 'brick_hebel';
  const diff = defaultDiff || 1;

  let subOptions = '';
  Object.entries(SUBSTRATES).forEach(([key, val]) => {
    subOptions += `<option value="${key}" ${key===sub?'selected':''}>${val.name} — from $${val.baseRate}/${val.unit}</option>`;
  });

  let diffOptions = '';
  for (let i = 1; i <= 5; i++) {
    diffOptions += `<option value="${i}" ${i===diff?'selected':''}>Level ${i} — ${DIFFICULTY_LEVELS[i].name} (+$${getDiffAddon(i)})</option>`;
  }

  const html = `
  <div class="surface-line" id="surface-line-${id}">
    <div class="surface-line-header">
      <div class="surface-line-title">LINE ${id}</div>
    </div>
    <div class="surface-line-controls">
      <div class="field-group">
        <label>DESCRIPTION</label>
        <input type="text" id="name-${id}" placeholder="e.g. Front Facade Render" oninput="recalc()">
      </div>
      <div class="field-group">
        <label>SUBSTRATE</label>
        <select id="sub-${id}" onchange="recalc()">${subOptions}</select>
      </div>
      <div class="field-group">
        <label>DIFFICULTY</label>
        <select id="diff-${id}" onchange="recalc()">${diffOptions}</select>
      </div>
      <div class="field-group">
        <label>QTY</label>
        <input type="number" id="qty-${id}" placeholder="0" min="0" step="0.1" oninput="recalc()">
      </div>
      <button class="remove-btn" onclick="removeSurfaceLine(${id})" title="Remove">&times;</button>
    </div>
  </div>`;

  document.getElementById('surface-lines').insertAdjacentHTML('beforeend', html);
  updateAddBtn();
  recalc();
}

function removeSurfaceLine(id) {
  const el = document.getElementById('surface-line-'+id);
  if (el) el.remove();
  recalc();
  updateAddBtn();
}

function updateAddBtn() {
  const count = document.querySelectorAll('.surface-line').length;
  document.getElementById('add-surface-btn').style.display = count >= 10 ? 'none' : 'block';
}

// ── MAIN RECALC ────────────────────────────────────────────
function recalc() {
  const lines = [];
  document.querySelectorAll('.surface-line').forEach(el => {
    const id = el.id.replace('surface-line-', '');
    const subKey = document.getElementById('sub-'+id)?.value;
    const diffLevel = parseInt(document.getElementById('diff-'+id)?.value) || 1;
    const qty = parseFloat(document.getElementById('qty-'+id)?.value) || 0;
    const name = document.getElementById('name-'+id)?.value || ('Line ' + id);

    if (subKey && qty > 0) {
      const substrate = SUBSTRATES[subKey];
      const diffAddon = getDiffAddon(diffLevel);
      const baseRate = substrate.baseRate;
      const totalRate = baseRate + diffAddon;
      const unit = substrate.unit;
      const matCostPerUnit = substrate.matCostPerSqm;

      lines.push({
        id, name, subKey, substrate, diffLevel, diffAddon,
        baseRate, totalRate, qty, unit, matCostPerUnit
      });
    }
  });

  const hasLines = lines.length > 0;
  document.getElementById('empty-state').style.display = hasLines ? 'none' : 'block';
  document.getElementById('results-content').style.display = hasLines ? 'block' : 'none';
  if (!hasLines) { clearResults(); return; }

  const subbieRate = getSettingVal('set-subbie-rate');
  const minJob = getSettingVal('set-min-job');
  const volFloor = getSettingVal('set-vol-floor');
  const tier = BUILDER_TIERS[currentTier];

  // Calculate per-line costs
  let totalQty = 0;
  let totalMatCost = 0;
  let totalLabCost = 0;
  let volFloorActive = false;

  lines.forEach(l => {
    l.matCost = l.qty * l.matCostPerUnit;
    l.labCost = l.qty * subbieRate;
    l.lineCost = l.matCost + l.labCost;
    l.costPerUnit = l.lineCost / l.qty;

    // Recommended sell at tier target margin
    l.sellAtTarget = l.lineCost / (1 - tier.marginTarget);
    l.sellRateAtTarget = l.sellAtTarget / l.qty;

    // Volume builder floor check
    l.floorApplied = false;
    if (currentTier === 'volume' && l.sellRateAtTarget < volFloor && l.unit === 'sqm') {
      l.sellRateAtTarget = volFloor;
      l.sellAtTarget = volFloor * l.qty;
      l.floorApplied = true;
      volFloorActive = true;
    }

    l.marginAtTarget = l.sellAtTarget > 0 ? ((l.sellAtTarget - l.lineCost) / l.sellAtTarget) * 100 : 0;

    totalQty += l.qty;
    totalMatCost += l.matCost;
    totalLabCost += l.labCost;
  });

  const totalCost = totalMatCost + totalLabCost;
  const costPerUnit = totalQty > 0 ? totalCost / totalQty : 0;

  // Volume floor warning
  document.getElementById('vol-floor-warning').style.display = volFloorActive ? 'block' : 'none';

  // Summary stats
  document.getElementById('r-total-sqm').textContent = totalQty.toFixed(1) + (lines[0]?.unit === 'lm' ? ' lm' : ' sqm');
  document.getElementById('r-mat-cost').textContent = fmt(totalMatCost);
  document.getElementById('r-mat-sub').textContent = 'Dulux system estimate';
  document.getElementById('r-lab-cost').textContent = fmt(totalLabCost);
  document.getElementById('r-lab-sub').textContent = `@ ${fmt(subbieRate)}/sqm subbie rate`;
  document.getElementById('r-job-cost').textContent = fmt(totalCost);
  document.getElementById('r-sqm-cost').textContent = `${fmt(costPerUnit)}/unit blended cost`;

  // Recommended sell price
  renderRecommendedSell(lines, tier, totalCost, totalQty);

  // Custom sell price check
  const customSell = parseFloat(document.getElementById('custom-sell')?.value) || 0;
  if (customSell > 0) {
    const customMargin = ((customSell - totalCost) / customSell) * 100;
    const customProfit = customSell - totalCost;
    const cls = customMargin >= 40 ? 'color:var(--green)' : customMargin >= 30 ? 'color:var(--amber)' : 'color:var(--red)';
    const label = customMargin >= 40 ? 'TARGET MET' : customMargin >= 30 ? 'BELOW TARGET' : 'DANGER ZONE';
    document.getElementById('custom-margin-display').innerHTML =
      `<span style="${cls};font-weight:800;">${customMargin.toFixed(1)}% MARGIN</span> — Profit: ${fmt(customProfit)} — <strong>${label}</strong>`;
  } else {
    document.getElementById('custom-margin-display').textContent = 'Enter a sell price to see your actual margin';
  }

  // Margin bands
  renderMarginBands(totalCost, totalQty);

  // Per-line breakdown
  renderLineBreakdown(lines, tier);

  // Material estimate
  renderMaterialEstimate(lines, totalQty);
}

// ── RECOMMENDED SELL PRICE ─────────────────────────────────
function renderRecommendedSell(lines, tier, totalCost, totalQty) {
  const totalSell = lines.reduce((s, l) => s + l.sellAtTarget, 0);
  const avgRate = totalQty > 0 ? totalSell / totalQty : 0;
  const profit = totalSell - totalCost;
  const margin = totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0;
  const minJob = getSettingVal('set-min-job');

  let finalSell = totalSell;
  let minApplied = false;
  if (finalSell < minJob) {
    finalSell = minJob;
    minApplied = true;
  }

  let html = `<div class="results-grid four">
    <div class="stat-card" style="border-color:var(--gold);">
      <div class="stat-label">RECOMMENDED SELL</div>
      <div class="stat-value gold">${fmt(finalSell)}</div>
      <div class="stat-sub">${minApplied ? 'Minimum job applied' : 'At ' + tier.name + ' target margin'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">AVG SELL RATE</div>
      <div class="stat-value">${fmt(avgRate)}/unit</div>
      <div class="stat-sub">Blended across all lines</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">GROSS PROFIT</div>
      <div class="stat-value green">${fmt(profit)}</div>
      <div class="stat-sub">Before overheads</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">GROSS MARGIN</div>
      <div class="stat-value ${margin >= 40 ? 'green' : margin >= 30 ? 'amber' : 'red'}">${margin.toFixed(1)}%</div>
      <div class="stat-sub">${tier.name} target: ${(tier.marginTarget*100).toFixed(0)}%</div>
    </div>
  </div>`;

  if (minApplied) {
    html += `<div class="callout callout-gold" style="margin-top:14px;">
      <strong>MINIMUM JOB VALUE APPLIED:</strong> The calculated sell price was below the $${minJob.toLocaleString()} minimum. The recommended sell has been set to the minimum job value.
    </div>`;
  }

  document.getElementById('rec-sell-wrap').innerHTML = html;
}

// ── MARGIN BANDS ───────────────────────────────────────────
function renderMarginBands(totalCost, totalQty) {
  const bands = [25,30,35,40,45,50,55];
  let html = `<table class="margin-table">
    <thead><tr>
      <th>MARGIN</th><th>SELL PRICE (JOB)</th><th>$/UNIT SELL</th><th>PROFIT</th><th>STATUS</th>
    </tr></thead><tbody>`;
  bands.forEach(b => {
    const sell = totalCost / (1 - b/100);
    const profit = sell - totalCost;
    const unitRate = totalQty > 0 ? sell / totalQty : 0;
    const cls = b >= 40 ? 'band-green' : b >= 30 ? 'band-amber' : 'band-red';
    const dot = b >= 40 ? 'green' : b >= 30 ? 'amber' : 'red';
    const label = b >= 40 ? 'TARGET' : b >= 30 ? 'MINIMUM' : 'BELOW MIN';
    html += `<tr class="${cls}">
      <td><span class="band-dot ${dot}"></span><strong>${b}%</strong></td>
      <td>${fmt(sell)}</td>
      <td>${fmt(unitRate)}/unit</td>
      <td>${fmt(profit)}</td>
      <td><strong>${label}</strong></td>
    </tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('margin-bands-wrap').innerHTML = html;
}

// ── PER-LINE BREAKDOWN ─────────────────────────────────────
function renderLineBreakdown(lines, tier) {
  let html = `<table class="breakdown-table">
    <thead><tr>
      <th>LINE</th><th>SUBSTRATE</th><th>DIFFICULTY</th><th class="right">QTY</th>
      <th class="right">BASE RATE</th><th class="right">DIFF ADD-ON</th><th class="right">TOTAL RATE</th>
      <th class="right">MAT COST</th><th class="right">LAB COST</th><th class="right">LINE COST</th>
      <th class="right">SELL @ ${(tier.marginTarget*100).toFixed(0)}%</th><th class="right">MARGIN</th>
    </tr></thead><tbody>`;

  let totalCost = 0, totalSell = 0;

  lines.forEach(l => {
    totalCost += l.lineCost;
    totalSell += l.sellAtTarget;
    const marginCls = l.marginAtTarget >= 40 ? 'color:var(--green)' : l.marginAtTarget >= 30 ? 'color:var(--amber)' : 'color:var(--red)';
    html += `<tr>
      <td>${l.name}</td>
      <td>${l.substrate.name}</td>
      <td>L${l.diffLevel} — ${DIFFICULTY_LEVELS[l.diffLevel].name}</td>
      <td class="right">${l.qty} ${l.unit}</td>
      <td class="right">${fmt(l.baseRate)}</td>
      <td class="right">+${fmt(l.diffAddon)}</td>
      <td class="right">${fmt(l.totalRate)}</td>
      <td class="right">${fmt(l.matCost)}</td>
      <td class="right">${fmt(l.labCost)}</td>
      <td class="right">${fmt(l.lineCost)}</td>
      <td class="right">${fmt(l.sellAtTarget)}${l.floorApplied ? ' *' : ''}</td>
      <td class="right" style="${marginCls};font-weight:700;">${l.marginAtTarget.toFixed(1)}%</td>
    </tr>`;
  });

  const totalMargin = totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0;
  html += `</tbody><tfoot><tr class="total-row">
    <td colspan="7">TOTALS</td>
    <td class="right">${fmt(lines.reduce((s,l) => s+l.matCost, 0))}</td>
    <td class="right">${fmt(lines.reduce((s,l) => s+l.labCost, 0))}</td>
    <td class="right">${fmt(totalCost)}</td>
    <td class="right">${fmt(totalSell)}</td>
    <td class="right">${totalMargin.toFixed(1)}%</td>
  </tr></tfoot></table>`;

  document.getElementById('line-breakdown-wrap').innerHTML = html;
}

// ── MATERIAL COST ESTIMATE ─────────────────────────────────
function renderMaterialEstimate(lines, totalQty) {
  // Estimate based on Dulux Powerfinish system as default
  const products = [
    { name:'AcraPrime Water Base 15L',    costPer100:104.64, coverPer100:1, unit:'pail' },
    { name:'Powerfinish 15L',             costPer100:441.42, coverPer100:6, unit:'pails' },
    { name:'200mm Green Mesh Tape 50m',   costPer100:21.33,  coverPer100:1, unit:'roll' },
    { name:'PreTape Mask Film 2700mm',    costPer100:8.65,   coverPer100:1, unit:'roll' },
    { name:'Touch Up Can Kit',            costPer100:2.29,   coverPer100:0.5, unit:'kit' },
    { name:'Slim Trim 3000mm',            costPer100:6.81,   coverPer100:3, unit:'pcs' }
  ];

  let html = `<div class="callout callout-info" style="margin-bottom:14px;">
    <strong>ESTIMATE BASED ON DULUX POWERFINISH SYSTEM</strong> — Actual material requirements vary by substrate, system, and site conditions. Costs sourced from 2026 Stoddarts Dulux Pack Card.
  </div>
  <table class="mat-table">
    <thead><tr>
      <th>PRODUCT</th><th class="right">QTY PER 100SQM</th><th class="right">UNIT COST</th>
      <th class="right">COST PER 100SQM</th><th class="right">EST. FOR ${totalQty.toFixed(0)} UNITS</th>
    </tr></thead><tbody>`;

  let totalMatCost = 0;
  products.forEach(p => {
    const scaledCost = (p.costPer100 / 100) * totalQty;
    const scaledQty = (p.coverPer100 / 100) * totalQty;
    totalMatCost += scaledCost;
    html += `<tr>
      <td>${p.name}</td>
      <td class="right">${p.coverPer100} ${p.unit}</td>
      <td class="right">${fmt(p.costPer100 / p.coverPer100)}</td>
      <td class="right">${fmt(p.costPer100)}</td>
      <td class="right">${fmt(scaledCost)}</td>
    </tr>`;
  });

  html += `</tbody><tfoot><tr class="total-row">
    <td colspan="4">ESTIMATED TOTAL MATERIAL COST</td>
    <td class="right">${fmt(totalMatCost)}</td>
  </tr></tfoot></table>`;

  document.getElementById('material-wrap').innerHTML = html;
}

// ── CLEAR RESULTS ──────────────────────────────────────────
function clearResults() {
  ['r-mat-cost','r-lab-cost','r-job-cost','r-sqm-cost','r-mat-sub','r-lab-sub','r-total-sqm'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = '—';
  });
  ['rec-sell-wrap','margin-bands-wrap','line-breakdown-wrap','material-wrap'].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerHTML = '';
  });
  document.getElementById('vol-floor-warning').style.display = 'none';
}

// ── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkDrift();
  addSurfaceLine('brick_hebel', 1);
});
