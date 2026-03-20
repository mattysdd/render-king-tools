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
var LOCKED_DEFAULTS = {
  'set-subbie-rate': 27,
  'set-variation-rate': 110,
  'set-min-job': 2200,
  'set-diff-1': 0,
  'set-diff-2': 5,
  'set-diff-3': 12,
  'set-diff-4': 22,
  'set-diff-5': 35,
  'set-vol-floor': 47,
  'set-sub-brick_hebel': 55,
  'set-sub-eps_blueboard': 75,
  'set-sub-specialty': 110,
  'set-sub-hebel_supply': 110,
  'set-sub-hebel_full': 165,
  'set-sub-eps_supply': 85,
  'set-sub-eps_full': 150,
  'set-sub-slab_build': 15,
  'set-mat-brick_hebel': 5.85,
  'set-mat-eps_blueboard': 7.50,
  'set-mat-specialty': 9.00,
  'set-mat-hebel_supply': 12.00,
  'set-mat-hebel_full': 15.00,
  'set-mat-eps_supply': 8.00,
  'set-mat-eps_full': 12.00,
  'set-mat-slab_build': 2.00,
  'set-margin-volume': 27.5,
  'set-margin-standard': 40,
  'set-margin-luxury': 40,
  'set-mkt-brick_hebel-min': 40,
  'set-mkt-brick_hebel-max': 70,
  'set-mkt-eps_blueboard-min': 70,
  'set-mkt-eps_blueboard-max': 120,
  'set-mkt-specialty-min': 100,
  'set-mkt-specialty-max': 180,
  'set-mkt-hebel_supply-min': 90,
  'set-mkt-hebel_supply-max': 140,
  'set-mkt-hebel_full-min': 140,
  'set-mkt-hebel_full-max': 200,
  'set-mkt-eps_supply-min': 75,
  'set-mkt-eps_supply-max': 110,
  'set-mkt-eps_full-min': 120,
  'set-mkt-eps_full-max': 180
};

// ── SUBSTRATE DEFINITIONS ──────────────────────────────────
// baseRate and matCostPerSqm are read dynamically from settings
var SUBSTRATE_KEYS = {
  'brick_hebel':   { name:'Brick / Hebel',                             unit:'sqm', subId:'set-sub-brick_hebel',   matId:'set-mat-brick_hebel' },
  'eps_blueboard': { name:'EPS / Blueboard',                           unit:'sqm', subId:'set-sub-eps_blueboard', matId:'set-mat-eps_blueboard' },
  'specialty':     { name:'Specialty / Architectural',                 unit:'sqm', subId:'set-sub-specialty',     matId:'set-mat-specialty' },
  'hebel_supply':  { name:'Hebel Supply + Install',                    unit:'sqm', subId:'set-sub-hebel_supply',  matId:'set-mat-hebel_supply' },
  'hebel_full':    { name:'Full Hebel System (Supply+Install+Render)', unit:'sqm', subId:'set-sub-hebel_full',    matId:'set-mat-hebel_full' },
  'eps_supply':    { name:'EPS Supply + Install',                      unit:'sqm', subId:'set-sub-eps_supply',    matId:'set-mat-eps_supply' },
  'eps_full':      { name:'Full EPS System (Supply+Install+Render)',   unit:'sqm', subId:'set-sub-eps_full',      matId:'set-mat-eps_full' },
  'slab_build':    { name:'Slab Build (Linear Metre)',                 unit:'lm',  subId:'set-sub-slab_build',    matId:'set-mat-slab_build' }
};

// ── DIFFICULTY LEVELS ──────────────────────────────────────
var DIFFICULTY_LEVELS = {
  1: { name:'Volume / Ground',       desc:'Standard ground floor, flat walls, easy access, no scaffold' },
  2: { name:'Lower Complexity',      desc:'Some height, minor scaffold or planks, limited cutting-in' },
  3: { name:'Upper Storey',          desc:'Full upper storey, scaffold required, moderate complexity' },
  4: { name:'Detail / Complex',      desc:'Curves, reveals, complex profiles, tight access, multi-level scaffold' },
  5: { name:'Luxury / Architectural',desc:'Maximum complexity, full scaffold, architectural detail, premium finish' }
};

// ── BUILDER TIERS ──────────────────────────────────────────
var BUILDER_TIERS = {
  volume:   { name:'Volume Builder',   marginSettingId:'set-margin-volume',   marginMin:0.25, marginMax:0.30, minJob:2200 },
  standard: { name:'Standard Builder',  marginSettingId:'set-margin-standard', marginMin:0.40, marginMax:0.50, minJob:2200 },
  luxury:   { name:'Luxury Builder',    marginSettingId:'set-margin-luxury',   marginMin:0.40, marginMax:0.55, minJob:2200 }
};

let currentTier = 'standard';

// ── DULUX MATERIAL ESTIMATES (from Dulux Pack Card 2026) ───
var DULUX_MATERIALS = [
  { name:'AcraPrime Water Base 15L',    costPer100:104.64, coverPer100:1, unit:'pail' },
  { name:'Powerfinish 15L',             costPer100:441.42, coverPer100:6, unit:'pails' },
  { name:'200mm Green Mesh Tape 50m',   costPer100:21.33,  coverPer100:1, unit:'roll' },
  { name:'PreTape Mask Film 2700mm',    costPer100:8.65,   coverPer100:1, unit:'roll' },
  { name:'Touch Up Can Kit',            costPer100:2.29,   coverPer100:0.5, unit:'kit' },
  { name:'Slim Trim 3000mm',            costPer100:6.81,   coverPer100:3, unit:'pcs' }
];

// ── HELPERS ────────────────────────────────────────────────
var fmt = n => {
  if (n === 0 || isNaN(n)) return '$0.00';
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

function getSettingVal(id) {
  const el = document.getElementById(id);
  if (!el) return LOCKED_DEFAULTS[id] || 0;
  return parseFloat(el.value) || 0;
}

function getDiffAddon(level) {
  return getSettingVal('set-diff-' + level);
}

function getSubstrateBaseRate(subKey) {
  const sub = SUBSTRATE_KEYS[subKey];
  return sub ? getSettingVal(sub.subId) : 0;
}

function getSubstrateMatCost(subKey) {
  const sub = SUBSTRATE_KEYS[subKey];
  return sub ? getSettingVal(sub.matId) : 0;
}

function getTierMarginTarget(tierKey) {
  const tier = BUILDER_TIERS[tierKey];
  if (!tier) return 0.40;
  return getSettingVal(tier.marginSettingId) / 100;
}

// ── LOCALSTORAGE PERSISTENCE ──────────────────────────────
var STORAGE_KEY = 'rk_settings';

function saveSettings() {
  const data = {};
  Object.keys(LOCKED_DEFAULTS).forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id] = parseFloat(el.value);
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    Object.keys(data).forEach(id => {
      const el = document.getElementById(id);
      if (el && data[id] !== undefined && data[id] !== null) {
        el.value = data[id];
      }
    });
  } catch(e) { /* ignore corrupt data */ }
}

function resetAllSettings() {
  if (!confirm('Reset ALL settings to locked defaults? This cannot be undone.')) return;
  Object.keys(LOCKED_DEFAULTS).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = LOCKED_DEFAULTS[id];
  });
  localStorage.removeItem(STORAGE_KEY);
  checkDrift();
  recalc();
}

// ── STOP-CHECK / DRIFT DETECTION ──────────────────────────
function checkDrift() {
  let drifted = false;
  let driftDetails = [];

  Object.keys(LOCKED_DEFAULTS).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = parseFloat(el.value);
    const locked = LOCKED_DEFAULTS[id];
    if (val !== locked) {
      drifted = true;
      el.style.borderColor = 'var(--gold)';
      driftDetails.push(id);
    } else {
      el.style.borderColor = '';
    }
  });

  const banner = document.getElementById('drift-banner');
  if (banner) {
    banner.classList.toggle('visible', drifted);
  }
  return drifted;
}

// ── SETTING CHANGE HANDLER ────────────────────────────────
function onSettingChange() {
  saveSettings();
  checkDrift();
  recalc();
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
  Object.entries(SUBSTRATE_KEYS).forEach(([key, val]) => {
    const rate = getSubstrateBaseRate(key);
    subOptions += `<option value="${key}" ${key===sub?'selected':''}>${val.name} — from $${rate}/${val.unit}</option>`;
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
  const btn = document.getElementById('add-surface-btn');
  if (btn) btn.style.display = count >= 10 ? 'none' : 'block';
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
      const substrate = SUBSTRATE_KEYS[subKey];
      const diffAddon = getDiffAddon(diffLevel);
      const baseRate = getSubstrateBaseRate(subKey);
      const totalRate = baseRate + diffAddon;
      const unit = substrate.unit;
      const matCostPerUnit = getSubstrateMatCost(subKey);

      lines.push({
        id, name, subKey, substrate, diffLevel, diffAddon,
        baseRate, totalRate, qty, unit, matCostPerUnit
      });
    }
  });

  const hasLines = lines.length > 0;
  const emptyEl = document.getElementById('empty-state');
  const resultsEl = document.getElementById('results-content');
  if (emptyEl) emptyEl.style.display = hasLines ? 'none' : 'block';
  if (resultsEl) resultsEl.style.display = hasLines ? 'block' : 'none';
  if (!hasLines) { clearResults(); return; }

  const subbieRate = getSettingVal('set-subbie-rate');
  const minJob = getSettingVal('set-min-job');
  const volFloor = getSettingVal('set-vol-floor');
  const tierMarginTarget = getTierMarginTarget(currentTier);
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
    l.sellAtTarget = l.lineCost / (1 - tierMarginTarget);
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
  const vfwEl = document.getElementById('vol-floor-warning');
  if (vfwEl) vfwEl.style.display = volFloorActive ? 'block' : 'none';

  // Summary stats
  const unitLabel = lines[0]?.unit === 'lm' ? ' lm' : ' sqm';
  setText('r-total-sqm', totalQty.toFixed(1) + unitLabel);
  setText('r-mat-cost', fmt(totalMatCost));
  setText('r-mat-sub', 'Dulux system estimate');
  setText('r-lab-cost', fmt(totalLabCost));
  setText('r-lab-sub', `@ ${fmt(subbieRate)}/sqm subbie rate`);
  setText('r-job-cost', fmt(totalCost));
  setText('r-sqm-cost', `${fmt(costPerUnit)}/unit blended cost`);

  // Recommended sell price
  renderRecommendedSell(lines, tier, tierMarginTarget, totalCost, totalQty);

  // Custom sell price check
  const customSell = parseFloat(document.getElementById('custom-sell')?.value) || 0;
  if (customSell > 0) {
    const customMargin = ((customSell - totalCost) / customSell) * 100;
    const customProfit = customSell - totalCost;
    const cls = customMargin >= 40 ? 'color:var(--green)' : customMargin >= 30 ? 'color:var(--amber)' : 'color:var(--red)';
    const label = customMargin >= 40 ? 'TARGET MET' : customMargin >= 30 ? 'BELOW TARGET' : 'DANGER ZONE';
    setHTML('custom-margin-display',
      `<span style="${cls};font-weight:800;">${customMargin.toFixed(1)}% MARGIN</span> — Profit: ${fmt(customProfit)} — <strong>${label}</strong>`);
  } else {
    setText('custom-margin-display', 'Enter a sell price to see your actual margin');
  }

  // Margin bands
  renderMarginBands(totalCost, totalQty);

  // Per-line breakdown
  renderLineBreakdown(lines, tier, tierMarginTarget);

  // Market rate comparison
  renderMarketComparison(lines, tierMarginTarget);

  // Material estimate
  renderMaterialEstimate(lines, totalQty);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ── RECOMMENDED SELL PRICE ─────────────────────────────────
function renderRecommendedSell(lines, tier, tierMarginTarget, totalCost, totalQty) {
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

  const finalProfit = finalSell - totalCost;
  const finalMargin = finalSell > 0 ? ((finalSell - totalCost) / finalSell) * 100 : 0;

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
      <div class="stat-value green">${fmt(finalProfit)}</div>
      <div class="stat-sub">Before overheads</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">GROSS MARGIN</div>
      <div class="stat-value ${finalMargin >= 40 ? 'green' : finalMargin >= 30 ? 'amber' : 'red'}">${finalMargin.toFixed(1)}%</div>
      <div class="stat-sub">${tier.name} target: ${(tierMarginTarget*100).toFixed(0)}%</div>
    </div>
  </div>`;

  if (minApplied) {
    html += `<div class="callout callout-gold" style="margin-top:14px;">
      <strong>MINIMUM JOB VALUE APPLIED:</strong> The calculated sell price was below the $${minJob.toLocaleString()} minimum. The recommended sell has been set to the minimum job value.
    </div>`;
  }

  setHTML('rec-sell-wrap', html);
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
  setHTML('margin-bands-wrap', html);
}

// ── PER-LINE BREAKDOWN ─────────────────────────────────────
function renderLineBreakdown(lines, tier, tierMarginTarget) {
  const marginPct = (tierMarginTarget * 100).toFixed(0);
  let html = `<table class="breakdown-table">
    <thead><tr>
      <th>LINE</th><th>SUBSTRATE</th><th>DIFFICULTY</th><th class="right">QTY</th>
      <th class="right">BASE RATE</th><th class="right">DIFF ADD-ON</th><th class="right">TOTAL RATE</th>
      <th class="right">MAT COST</th><th class="right">LAB COST</th><th class="right">LINE COST</th>
      <th class="right">SELL @ ${marginPct}%</th><th class="right">MARGIN</th>
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

  setHTML('line-breakdown-wrap', html);
}

// ── MARKET RATE COMPARISON ─────────────────────────────────
function renderMarketComparison(lines, tierMarginTarget) {
  // Build market rate map from settings
  const marketRates = {};
  Object.keys(SUBSTRATE_KEYS).forEach(key => {
    const minEl = document.getElementById('set-mkt-' + key + '-min');
    const maxEl = document.getElementById('set-mkt-' + key + '-max');
    if (minEl && maxEl) {
      marketRates[key] = {
        min: parseFloat(minEl.value) || 0,
        max: parseFloat(maxEl.value) || 0
      };
    }
  });

  let html = `<div class="callout callout-info" style="margin-bottom:14px;">
    <strong>GOLD COAST RENDERING MARKET RATES (2025-2026)</strong> — Your sell rate vs. market range. Rates are per sqm, ex GST. Market data from local industry research.
  </div>
  <table class="margin-table">
    <thead><tr>
      <th>LINE</th><th>SUBSTRATE</th><th>YOUR SELL RATE</th><th>MARKET MIN</th><th>MARKET MAX</th><th>MARKET MID</th><th>POSITION</th>
    </tr></thead><tbody>`;

  lines.forEach(l => {
    const sellRate = l.sellAtTarget / l.qty;
    const mkt = marketRates[l.subKey];
    if (mkt && mkt.max > 0) {
      const mid = (mkt.min + mkt.max) / 2;
      let position = '';
      let posClass = '';
      if (sellRate < mkt.min) {
        position = 'BELOW MARKET';
        posClass = 'color:var(--red);font-weight:700;';
      } else if (sellRate <= mid) {
        position = 'LOWER HALF';
        posClass = 'color:var(--amber);font-weight:700;';
      } else if (sellRate <= mkt.max) {
        position = 'UPPER HALF';
        posClass = 'color:var(--green);font-weight:700;';
      } else {
        position = 'ABOVE MARKET';
        posClass = 'color:var(--gold);font-weight:700;';
      }

      // Market position bar
      const range = mkt.max - mkt.min;
      const pct = range > 0 ? Math.min(100, Math.max(0, ((sellRate - mkt.min) / range) * 100)) : 50;

      html += `<tr>
        <td>${l.name}</td>
        <td>${l.substrate.name}</td>
        <td class="right">${fmt(sellRate)}/sqm</td>
        <td class="right">${fmt(mkt.min)}</td>
        <td class="right">${fmt(mkt.max)}</td>
        <td class="right">${fmt(mid)}</td>
        <td style="${posClass}">${position}</td>
      </tr>
      <tr><td colspan="7" style="padding:4px 12px 12px;">
        <div class="market-bar-wrap">
          <div class="market-bar-track">
            <div class="market-bar-fill" style="width:${pct}%"></div>
            <div class="market-bar-marker" style="left:${pct}%"></div>
          </div>
          <div class="market-bar-labels">
            <span>${fmt(mkt.min)}</span>
            <span>${fmt(mkt.max)}</span>
          </div>
        </div>
      </td></tr>`;
    } else {
      html += `<tr>
        <td>${l.name}</td>
        <td>${l.substrate.name}</td>
        <td class="right">${fmt(sellRate)}/sqm</td>
        <td colspan="4" style="color:var(--grey-mid);">No market data available</td>
      </tr>`;
    }
  });

  html += '</tbody></table>';
  setHTML('market-check-wrap', html);
}

// ── MATERIAL COST ESTIMATE ─────────────────────────────────
function renderMaterialEstimate(lines, totalQty) {
  let html = `<div class="callout callout-info" style="margin-bottom:14px;">
    <strong>ESTIMATE BASED ON DULUX POWERFINISH SYSTEM</strong> — Actual material requirements vary by substrate, system, and site conditions. Costs sourced from 2026 Stoddarts Dulux Pack Card.
  </div>
  <table class="mat-table">
    <thead><tr>
      <th>PRODUCT</th><th class="right">QTY PER 100SQM</th><th class="right">UNIT COST</th>
      <th class="right">COST PER 100SQM</th><th class="right">EST. FOR ${totalQty.toFixed(0)} UNITS</th>
    </tr></thead><tbody>`;

  let totalMatCost = 0;
  DULUX_MATERIALS.forEach(p => {
    const scaledCost = (p.costPer100 / 100) * totalQty;
    totalMatCost += scaledCost;
    html += `<tr>
      <td>${p.name}</td>
      <td class="right">${p.coverPer100} ${p.unit}</td>
      <td class="right">${fmt(p.coverPer100 > 0 ? p.costPer100 / p.coverPer100 : 0)}</td>
      <td class="right">${fmt(p.costPer100)}</td>
      <td class="right">${fmt(scaledCost)}</td>
    </tr>`;
  });

  html += `</tbody><tfoot><tr class="total-row">
    <td colspan="4">ESTIMATED TOTAL MATERIAL COST</td>
    <td class="right">${fmt(totalMatCost)}</td>
  </tr></tfoot></table>`;

  setHTML('material-wrap', html);
}

// ── CLEAR RESULTS ──────────────────────────────────────────
function clearResults() {
  ['r-mat-cost','r-lab-cost','r-job-cost','r-sqm-cost','r-mat-sub','r-lab-sub','r-total-sqm'].forEach(id => {
    setText(id, '—');
  });
  ['rec-sell-wrap','margin-bands-wrap','line-breakdown-wrap','material-wrap','market-check-wrap'].forEach(id => {
    setHTML(id, '');
  });
  const vfwEl = document.getElementById('vol-floor-warning');
  if (vfwEl) vfwEl.style.display = 'none';
}

// ── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  checkDrift();
  addSurfaceLine('brick_hebel', 1);
});
