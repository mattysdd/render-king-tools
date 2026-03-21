// ═══════════════════════════════════════════════════════════
// RENDER KING — MARGIN CALCULATOR ENGINE v2
// PO Processor formulas — exact material calculations
// All prices ex GST. Source: Dulux 2026 PAC Card / PO Processor
// ═══════════════════════════════════════════════════════════

// ── TAB SWITCHING ──────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active','print-active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  var tab = document.getElementById('tab-' + tabId);
  if (tab) { tab.classList.add('active','print-active'); }
  document.querySelector('[data-tab="' + tabId + '"]')?.classList.add('active');
}

// ── ROUNDING RULE (PO Processor) ──────────────────────────
// 0.00–0.34 → round DOWN, 0.35–0.99 → round UP
function poRound(n) {
  var floor = Math.floor(n);
  var frac = n - floor;
  return frac >= 0.35 ? floor + 1 : floor;
}

// ── LOCKED DEFAULTS ────────────────────────────────────────
var LOCKED_DEFAULTS = {
  // Core business
  'set-subbie-rate': 27,
  'set-variation-rate': 110,
  'set-min-job': 2200,
  'set-slab-labour': 200,
  // Difficulty add-ons
  'set-diff-1': 0,
  'set-diff-2': 5,
  'set-diff-3': 12,
  'set-diff-4': 22,
  'set-diff-5': 35,
  // Volume builder floor
  'set-vol-floor': 47,
  // Substrate base sell rates
  'set-sub-brick_hebel': 55,
  'set-sub-eps_blueboard': 75,
  'set-sub-specialty': 110,
  'set-sub-hebel_supply': 110,
  'set-sub-hebel_full': 165,
  'set-sub-eps_supply': 85,
  'set-sub-eps_full': 150,
  'set-sub-slab_build': 15,
  // Dulux PAC Card product prices
  'set-pac-low-build': 14.86,
  'set-pac-medium-build': 11.60,
  'set-pac-high-build': 11.60,
  'set-pac-p400': 21.10,
  'set-pac-joint-skim': 27.13,
  'set-pac-powerfinish': 73.57,
  'set-pac-sponge-fine': 73.57,
  'set-pac-coventry-med': 73.57,
  'set-pac-slim-trim': 2.27,
  'set-pac-mud-bump': 3.04,
  'set-pac-mesh-roll': 8.99,
  'set-pac-blue-tape': 4.68,
  // Coverage divisors (PO Processor formulas)
  'set-cov-low-build-aac': 4.7,
  'set-cov-high-build-slab': 20,
  'set-cov-low-build-slab': 10,
  'set-cov-texture-powerfinish': 12,
  'set-cov-texture-sponge': 13.5,
  'set-cov-texture-coventry': 11,
  'set-cov-angles-aac': 5,
  'set-cov-medium-build-brick': 2.7,
  'set-cov-angles-brick': 2.5,
  'set-cov-eps-total': 3,
  'set-cov-mesh-eps': 45,
  // New substrate/install types
  'set-sub-specialty_finish': 95,
  'set-sub-ext_microcement': 180,
  'set-sub-other_standard': 55,
  'set-sub-hebel_install': 80,
  'set-sub-eps_install': 65,
  // Specialty finish labour
  'set-lab-specialty': 35,
  'set-lab-microcement': 55,
  'set-lab-hebel-install': 35,
  'set-lab-eps-install': 30,
  // Hebel/EPS install material rates
  'set-mat-hebel-install': 45,
  'set-mat-eps-install': 35,
  // Microcement product pricing
  'set-pac-microcement-bucket': 350,
  'set-cov-microcement-spread': 25,
  'set-microcement-coats': 3,
  // Specialty texture divisor (doubled rate = halved divisor)
  'set-cov-texture-specialty': 6,
  // Market rates for new substrates
  'set-mkt-specialty_finish-min': 85,
  'set-mkt-specialty_finish-max': 140,
  'set-mkt-ext_microcement-min': 150,
  'set-mkt-ext_microcement-max': 250,
  'set-mkt-other_standard-min': 40,
  'set-mkt-other_standard-max': 70,
  'set-mkt-hebel_install-min': 70,
  'set-mkt-hebel_install-max': 110,
  'set-mkt-eps_install-min': 55,
  'set-mkt-eps_install-max': 90,
  // Margin targets
  'set-margin-volume': 27.5,
  'set-margin-standard': 40,
  'set-margin-luxury': 40,
  // Market rates
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
var SUBSTRATE_KEYS = {
  'brick_hebel':   { name:'Brick / Hebel',                             unit:'sqm', subId:'set-sub-brick_hebel',   matType:'aac' },
  'eps_blueboard': { name:'EPS / Blueboard',                           unit:'sqm', subId:'set-sub-eps_blueboard', matType:'eps' },
  'specialty':     { name:'Specialty / Architectural',                 unit:'sqm', subId:'set-sub-specialty',     matType:'aac' },
  'hebel_supply':  { name:'Hebel Supply + Install',                    unit:'sqm', subId:'set-sub-hebel_supply',  matType:'aac' },
  'hebel_full':    { name:'Full Hebel System (Supply+Install+Render)', unit:'sqm', subId:'set-sub-hebel_full',    matType:'aac' },
  'eps_supply':    { name:'EPS Supply + Install',                      unit:'sqm', subId:'set-sub-eps_supply',    matType:'eps' },
  'eps_full':      { name:'Full EPS System (Supply+Install+Render)',   unit:'sqm', subId:'set-sub-eps_full',      matType:'eps' },
  'slab_build':        { name:'Slab Build (Linear Metre)',                 unit:'lm',  subId:'set-sub-slab_build',        matType:'slab' },
  'specialty_finish':  { name:'Specialty Finish',                           unit:'sqm', subId:'set-sub-specialty_finish',  matType:'specialty_finish' },
  'ext_microcement':   { name:'External Microcement',                       unit:'sqm', subId:'set-sub-ext_microcement',   matType:'ext_microcement' },
  'other_standard':    { name:'Other / Standard Finish',                    unit:'sqm', subId:'set-sub-other_standard',    matType:'aac' },
  'hebel_install':     { name:'Hebel / AAC Supply & Install',               unit:'sqm', subId:'set-sub-hebel_install',     matType:'hebel_install' },
  'eps_install':       { name:'EPS Supply & Install',                       unit:'sqm', subId:'set-sub-eps_install',       matType:'eps_install' }
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

var currentTier = 'standard';

// ── HELPERS ────────────────────────────────────────────────
var fmt = function(n) {
  if (n === 0 || isNaN(n)) return '$0.00';
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

function getSettingVal(id) {
  var el = document.getElementById(id);
  if (!el) return LOCKED_DEFAULTS[id] || 0;
  return parseFloat(el.value) || 0;
}

function getDiffAddon(level) {
  return getSettingVal('set-diff-' + level);
}

function getSubstrateBaseRate(subKey) {
  var sub = SUBSTRATE_KEYS[subKey];
  return sub ? getSettingVal(sub.subId) : 0;
}

function getTierMarginTarget(tierKey) {
  var tier = BUILDER_TIERS[tierKey];
  if (!tier) return 0.40;
  return getSettingVal(tier.marginSettingId) / 100;
}

// ── LOCALSTORAGE PERSISTENCE ──────────────────────────────
var STORAGE_KEY = 'rk_settings';

function saveSettings() {
  var data = {};
  Object.keys(LOCKED_DEFAULTS).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) data[id] = parseFloat(el.value);
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadSettings() {
  var raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    var data = JSON.parse(raw);
    Object.keys(data).forEach(function(id) {
      var el = document.getElementById(id);
      if (el && data[id] !== undefined && data[id] !== null) {
        el.value = data[id];
      }
    });
  } catch(e) { /* ignore corrupt data */ }
}

function resetAllSettings() {
  if (!confirm('Reset ALL settings to locked defaults? This cannot be undone.')) return;
  Object.keys(LOCKED_DEFAULTS).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = LOCKED_DEFAULTS[id];
  });
  localStorage.removeItem(STORAGE_KEY);
  checkDrift();
  recalc();
}

// ── STOP-CHECK / DRIFT DETECTION ──────────────────────────
function checkDrift() {
  var drifted = false;
  Object.keys(LOCKED_DEFAULTS).forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var val = parseFloat(el.value);
    var locked = LOCKED_DEFAULTS[id];
    if (Math.abs(val - locked) > 0.001) {
      drifted = true;
      el.style.borderColor = 'var(--gold)';
    } else {
      el.style.borderColor = '';
    }
  });
  var banner = document.getElementById('drift-banner');
  if (banner) { banner.classList.toggle('visible', drifted); }
  return drifted;
}

function onSettingChange() {
  saveSettings();
  checkDrift();
  recalc();
}

// ── BUILDER TIER SELECTION ─────────────────────────────────
function selectTier(el, key) {
  document.querySelectorAll('#tier-grid .tier-option').forEach(function(e) { e.classList.remove('active'); });
  el.classList.add('active');
  currentTier = key;
  recalc();
}

// ── SURFACE LINE MANAGEMENT ────────────────────────────────
var lineCount = 0;

function addSurfaceLine(defaultSubstrate, defaultDiff) {
  var count = document.querySelectorAll('.surface-line').length;
  if (count >= 20) return;
  lineCount++;
  var id = lineCount;
  var sub = defaultSubstrate || 'brick_hebel';
  var diff = defaultDiff || 1;

  var subOptions = '';
  Object.entries(SUBSTRATE_KEYS).forEach(function(entry) {
    var key = entry[0], val = entry[1];
    var rate = getSubstrateBaseRate(key);
    subOptions += '<option value="' + key + '" ' + (key===sub?'selected':'') + '>' + val.name + ' — from $' + rate + '/' + val.unit + '</option>';
  });

  var diffOptions = '';
  for (var i = 1; i <= 5; i++) {
    diffOptions += '<option value="' + i + '" ' + (i===diff?'selected':'') + '>Level ' + i + ' — ' + DIFFICULTY_LEVELS[i].name + ' (+$' + getDiffAddon(i) + ')</option>';
  }

  // Texture finish selector
  var textureOptions = '<option value="powerfinish" selected>Powerfinish</option><option value="sponge_fine">Sponge Fine</option><option value="coventry_med">Coventry Medium</option><option value="none">No Texture Finish</option>';

  var html = '<div class="surface-line" id="surface-line-' + id + '">' +
    '<div class="surface-line-header"><div class="surface-line-title">LINE ' + id + '</div></div>' +
    '<div class="surface-line-controls">' +
      '<div class="field-group"><label>DESCRIPTION</label>' +
        '<input type="text" id="name-' + id + '" placeholder="e.g. Front Facade Render" oninput="recalc()"></div>' +
      '<div class="field-group"><label>SUBSTRATE</label>' +
        '<select id="sub-' + id + '" onchange="recalc()">' + subOptions + '</select></div>' +
      '<div class="field-group"><label>DIFFICULTY</label>' +
        '<select id="diff-' + id + '" onchange="recalc()">' + diffOptions + '</select></div>' +
      '<div class="field-group"><label>QTY</label>' +
        '<input type="number" id="qty-' + id + '" placeholder="0" min="0" step="0.1" oninput="recalc()"></div>' +
      '<div class="field-group"><label>TEXTURE</label>' +
        '<select id="tex-' + id + '" onchange="recalc()">' + textureOptions + '</select></div>' +
      '<button class="remove-btn" onclick="removeSurfaceLine(' + id + ')" title="Remove">&times;</button>' +
    '</div></div>';

  document.getElementById('surface-lines').insertAdjacentHTML('beforeend', html);
  updateAddBtn();
  recalc();
}

function removeSurfaceLine(id) {
  var el = document.getElementById('surface-line-' + id);
  if (el) el.remove();
  recalc();
  updateAddBtn();
}

function updateAddBtn() {
  var count = document.querySelectorAll('.surface-line').length;
  var btn = document.getElementById('add-surface-btn');
  if (btn) btn.style.display = count >= 20 ? 'none' : 'block';
}

// ═══════════════════════════════════════════════════════════
// PO PROCESSOR — MATERIAL CALCULATION ENGINE
// ═══════════════════════════════════════════════════════════

function calculateMaterials(subKey, matType, qty, textureType) {
  var materials = [];
  var p = function(id) { return getSettingVal(id); };

  if (matType === 'aac') {
    // AAC / HEBEL substrate
    // Low Build bags = m² ÷ 4.7
    var lowBuildRaw = qty / p('set-cov-low-build-aac');
    var lowBuildQty = poRound(lowBuildRaw);
    materials.push({ name: 'Acrabuild Plus (Low Build)', qty: lowBuildQty, unit: 'bags', unitPrice: p('set-pac-low-build'), total: lowBuildQty * p('set-pac-low-build') });

    // Texture finish
    if (textureType && textureType !== 'none') {
      var texDiv, texName;
      if (textureType === 'powerfinish') { texDiv = p('set-cov-texture-powerfinish'); texName = 'Powerfinish 15L'; }
      else if (textureType === 'sponge_fine') { texDiv = p('set-cov-texture-sponge'); texName = 'Sponge Fine 15L'; }
      else if (textureType === 'coventry_med') { texDiv = p('set-cov-texture-coventry'); texName = 'Coventry Medium 15L'; }
      if (texDiv) {
        var texRaw = qty / texDiv;
        var texQty = poRound(texRaw);
        materials.push({ name: texName, qty: texQty, unit: 'buckets', unitPrice: p('set-pac-powerfinish'), total: texQty * p('set-pac-powerfinish') });
      }
    }

    // Angles (Slim Trim 1.5mm x 3m) = m² ÷ 5
    var anglesRaw = qty / p('set-cov-angles-aac');
    var anglesQty = poRound(anglesRaw);
    materials.push({ name: 'Slim Trim 1.5mm x 3m (Angles)', qty: anglesQty, unit: 'lengths', unitPrice: p('set-pac-slim-trim'), total: anglesQty * p('set-pac-slim-trim') });

  } else if (matType === 'brick') {
    // BRICK substrate
    // Medium Build bags = m² ÷ 2.7
    var medBuildRaw = qty / p('set-cov-medium-build-brick');
    var medBuildQty = poRound(medBuildRaw);
    materials.push({ name: 'Acrabuild Medium (Medium Build)', qty: medBuildQty, unit: 'bags', unitPrice: p('set-pac-medium-build'), total: medBuildQty * p('set-pac-medium-build') });

    // Angles (Mud Bump 2.5mm x 3m) = m² ÷ 2.5
    var brickAnglesRaw = qty / p('set-cov-angles-brick');
    var brickAnglesQty = poRound(brickAnglesRaw);
    materials.push({ name: 'Mud Bump 2.5mm x 3m (Angles)', qty: brickAnglesQty, unit: 'lengths', unitPrice: p('set-pac-mud-bump'), total: brickAnglesQty * p('set-pac-mud-bump') });

  } else if (matType === 'eps') {
    // EPS / BLUEBOARD substrate
    // EPS Total bags = m² ÷ 3
    var epsTotalRaw = qty / p('set-cov-eps-total');
    var epsTotalQty = poRound(epsTotalRaw);
    // Split 50/50: Low Build and P400
    var epsLowBuild = Math.ceil(epsTotalQty / 2);
    var epsP400 = epsTotalQty - epsLowBuild;

    materials.push({ name: 'Acrabuild Plus (Low Build — EPS)', qty: epsLowBuild, unit: 'bags', unitPrice: p('set-pac-low-build'), total: epsLowBuild * p('set-pac-low-build') });
    materials.push({ name: 'AcraPro P400', qty: epsP400, unit: 'bags', unitPrice: p('set-pac-p400'), total: epsP400 * p('set-pac-p400') });

    // Mesh rolls (1m x 50m) = m² ÷ 45
    var meshRaw = qty / p('set-cov-mesh-eps');
    var meshQty = poRound(meshRaw);
    materials.push({ name: 'Fibreglass Mesh Roll 1m x 50m', qty: meshQty, unit: 'rolls', unitPrice: p('set-pac-mesh-roll'), total: meshQty * p('set-pac-mesh-roll') });

    // Blueboard extras
    if (qty >= 6 && qty <= 15) {
      materials.push({ name: 'Joint & Skim (Blueboard)', qty: 1, unit: 'bags', unitPrice: p('set-pac-joint-skim'), total: p('set-pac-joint-skim') });
    } else if (qty > 10) {
      // > 10m²: Joint & Skim = m² ÷ 30, P400 = m² ÷ 10, Mesh = m² ÷ 30
      var jsRaw = qty / 30;
      var jsQty = poRound(jsRaw);
      if (jsQty > 0) {
        materials.push({ name: 'Joint & Skim (Blueboard Extra)', qty: jsQty, unit: 'bags', unitPrice: p('set-pac-joint-skim'), total: jsQty * p('set-pac-joint-skim') });
      }
      var extraP400Raw = qty / 10;
      var extraP400Qty = poRound(extraP400Raw);
      if (extraP400Qty > 0) {
        materials.push({ name: 'AcraPro P400 (Blueboard Extra)', qty: extraP400Qty, unit: 'bags', unitPrice: p('set-pac-p400'), total: extraP400Qty * p('set-pac-p400') });
      }
      var extraMeshRaw = qty / 30;
      var extraMeshQty = poRound(extraMeshRaw);
      if (extraMeshQty > 0) {
        materials.push({ name: 'Mesh (Blueboard Extra)', qty: extraMeshQty, unit: 'rolls', unitPrice: p('set-pac-mesh-roll'), total: extraMeshQty * p('set-pac-mesh-roll') });
      }
    }

    // Texture finish (same as AAC)
    if (textureType && textureType !== 'none') {
      var texDiv2, texName2;
      if (textureType === 'powerfinish') { texDiv2 = p('set-cov-texture-powerfinish'); texName2 = 'Powerfinish 15L'; }
      else if (textureType === 'sponge_fine') { texDiv2 = p('set-cov-texture-sponge'); texName2 = 'Sponge Fine 15L'; }
      else if (textureType === 'coventry_med') { texDiv2 = p('set-cov-texture-coventry'); texName2 = 'Coventry Medium 15L'; }
      if (texDiv2) {
        var texRaw2 = qty / texDiv2;
        var texQty2 = poRound(texRaw2);
        materials.push({ name: texName2, qty: texQty2, unit: 'buckets', unitPrice: p('set-pac-powerfinish'), total: texQty2 * p('set-pac-powerfinish') });
      }
    }

  } else if (matType === 'slab') {
    // SLAB substrate (qty is in LM)
    // High Build bags = LM ÷ 20
    var highBuildRaw = qty / p('set-cov-high-build-slab');
    var highBuildQty = poRound(highBuildRaw);
    materials.push({ name: 'Acrabuild Coarse 2002 (High Build)', qty: highBuildQty, unit: 'bags', unitPrice: p('set-pac-high-build'), total: highBuildQty * p('set-pac-high-build') });

    // Low Build slab allowance = LM ÷ 10
    var slabLowRaw = qty / p('set-cov-low-build-slab');
    var slabLowQty = poRound(slabLowRaw);
    materials.push({ name: 'Acrabuild Plus (Low Build — Slab)', qty: slabLowQty, unit: 'bags', unitPrice: p('set-pac-low-build'), total: slabLowQty * p('set-pac-low-build') });

  } else if (matType === 'specialty_finish') {
    // SPECIALTY FINISH — EPS system with doubled texture rate
    // EPS Low Build bags = m² ÷ 3 × 50%
    var specEpsTotalRaw = qty / p('set-cov-eps-total');
    var specEpsLowRaw = specEpsTotalRaw * 0.5;
    var specEpsLowQty = poRound(specEpsLowRaw);
    materials.push({ name: 'Acrabuild Plus (Low Build — Specialty)', qty: specEpsLowQty, unit: 'bags', unitPrice: p('set-pac-low-build'), total: specEpsLowQty * p('set-pac-low-build') });

    // EPS P400 bags = m² ÷ 3 × 50%
    var specEpsP400Raw = specEpsTotalRaw * 0.5;
    var specEpsP400Qty = poRound(specEpsP400Raw);
    materials.push({ name: 'AcraPro P400 (Specialty)', qty: specEpsP400Qty, unit: 'bags', unitPrice: p('set-pac-p400'), total: specEpsP400Qty * p('set-pac-p400') });

    // Powerfinish buckets = m² ÷ 6 (DOUBLED from standard)
    var specTexDiv = p('set-cov-texture-specialty');
    var specTexRaw = qty / specTexDiv;
    var specTexQty = poRound(specTexRaw);
    materials.push({ name: 'Powerfinish 15L (Specialty — 2× Rate)', qty: specTexQty, unit: 'buckets', unitPrice: p('set-pac-powerfinish'), total: specTexQty * p('set-pac-powerfinish') });

    // Slim Trim angles = m² ÷ 5
    var specAnglesRaw = qty / p('set-cov-angles-aac');
    var specAnglesQty = poRound(specAnglesRaw);
    materials.push({ name: 'Slim Trim 1.5mm x 3m (Angles)', qty: specAnglesQty, unit: 'lengths', unitPrice: p('set-pac-slim-trim'), total: specAnglesQty * p('set-pac-slim-trim') });

    // Fibreglass mesh rolls = m² ÷ 45
    var specMeshRaw = qty / p('set-cov-mesh-eps');
    var specMeshQty = poRound(specMeshRaw);
    materials.push({ name: 'Fibreglass Mesh Roll 1m x 50m', qty: specMeshQty, unit: 'rolls', unitPrice: p('set-pac-mesh-roll'), total: specMeshQty * p('set-pac-mesh-roll') });

  } else if (matType === 'ext_microcement') {
    // EXTERNAL MICROCEMENT — brick base coat + 3 microcement coats
    // Base coat: Medium Build bags = m² ÷ 2.7
    var mcMedRaw = qty / p('set-cov-medium-build-brick');
    var mcMedQty = poRound(mcMedRaw);
    materials.push({ name: 'Acrabuild Medium (Base Coat)', qty: mcMedQty, unit: 'bags', unitPrice: p('set-pac-medium-build'), total: mcMedQty * p('set-pac-medium-build') });

    // Mud Bump angles = m² ÷ 2.5
    var mcAnglesRaw = qty / p('set-cov-angles-brick');
    var mcAnglesQty = poRound(mcAnglesRaw);
    materials.push({ name: 'Mud Bump 2.5mm x 3m (Angles)', qty: mcAnglesQty, unit: 'lengths', unitPrice: p('set-pac-mud-bump'), total: mcAnglesQty * p('set-pac-mud-bump') });

    // Microcement top coat: 3 coats, m² ÷ 25 per coat
    var mcSpread = p('set-cov-microcement-spread');
    var mcBucketPrice = p('set-pac-microcement-bucket');
    var mcCoats = p('set-microcement-coats') || 3;
    var bucketsPerCoat = poRound(qty / mcSpread);
    for (var coat = 1; coat <= mcCoats; coat++) {
      materials.push({ name: 'Microcement Coat ' + coat, qty: bucketsPerCoat, unit: 'buckets', unitPrice: mcBucketPrice, total: bucketsPerCoat * mcBucketPrice });
    }

  } else if (matType === 'hebel_install') {
    // HEBEL / AAC SUPPLY & INSTALL — flat rate, no complex formula
    var hebelMatRate = p('set-mat-hebel-install');
    var hebelMatTotal = qty * hebelMatRate;
    materials.push({ name: 'Hebel / AAC Panels (Supply)', qty: qty, unit: 'sqm', unitPrice: hebelMatRate, total: hebelMatTotal });

  } else if (matType === 'eps_install') {
    // EPS SUPPLY & INSTALL — flat rate, no complex formula
    var epsInstMatRate = p('set-mat-eps-install');
    var epsInstMatTotal = qty * epsInstMatRate;
    materials.push({ name: 'EPS Panels (Supply)', qty: qty, unit: 'sqm', unitPrice: epsInstMatRate, total: epsInstMatTotal });
  }

  return materials;
}

// ── MAIN RECALC ────────────────────────────────────────────
function recalc() {
  var lines = [];
  document.querySelectorAll('.surface-line').forEach(function(el) {
    var id = el.id.replace('surface-line-', '');
    var subKey = document.getElementById('sub-' + id)?.value;
    var diffLevel = parseInt(document.getElementById('diff-' + id)?.value) || 1;
    var qty = parseFloat(document.getElementById('qty-' + id)?.value) || 0;
    var name = document.getElementById('name-' + id)?.value || ('Line ' + id);
    var textureType = document.getElementById('tex-' + id)?.value || 'powerfinish';

    if (subKey && qty > 0) {
      var substrate = SUBSTRATE_KEYS[subKey];
      var diffAddon = getDiffAddon(diffLevel);
      var baseRate = getSubstrateBaseRate(subKey);
      var totalRate = baseRate + diffAddon;
      var unit = substrate.unit;
      var matType = substrate.matType;

      // Calculate materials using PO Processor formulas
      var materials = calculateMaterials(subKey, matType, qty, textureType);
      var matCost = materials.reduce(function(sum, m) { return sum + m.total; }, 0);

      // Labour cost — per-substrate rates
      var labCost;
      if (matType === 'slab') {
        labCost = getSettingVal('set-slab-labour'); // Flat $200 per slab
      } else if (matType === 'specialty_finish') {
        labCost = qty * getSettingVal('set-lab-specialty');
      } else if (matType === 'ext_microcement') {
        labCost = qty * getSettingVal('set-lab-microcement');
      } else if (matType === 'hebel_install') {
        labCost = qty * getSettingVal('set-lab-hebel-install');
      } else if (matType === 'eps_install') {
        labCost = qty * getSettingVal('set-lab-eps-install');
      } else {
        labCost = qty * getSettingVal('set-subbie-rate');
      }

      lines.push({
        id: id, name: name, subKey: subKey, substrate: substrate,
        diffLevel: diffLevel, diffAddon: diffAddon,
        baseRate: baseRate, totalRate: totalRate, qty: qty, unit: unit,
        matType: matType, textureType: textureType,
        materials: materials, matCost: matCost, labCost: labCost
      });
    }
  });

  var hasLines = lines.length > 0;
  var emptyEl = document.getElementById('empty-state');
  var resultsEl = document.getElementById('results-content');
  if (emptyEl) emptyEl.style.display = hasLines ? 'none' : 'block';
  if (resultsEl) resultsEl.style.display = hasLines ? 'block' : 'none';
  if (!hasLines) { clearResults(); return; }

  var subbieRate = getSettingVal('set-subbie-rate');
  var minJob = getSettingVal('set-min-job');
  var volFloor = getSettingVal('set-vol-floor');
  var tierMarginTarget = getTierMarginTarget(currentTier);
  var tier = BUILDER_TIERS[currentTier];

  // Calculate per-line costs
  var totalQty = 0;
  var totalMatCost = 0;
  var totalLabCost = 0;
  var volFloorActive = false;

  lines.forEach(function(l) {
    l.lineCost = l.matCost + l.labCost;
    l.costPerUnit = l.qty > 0 ? l.lineCost / l.qty : 0;

    // Recommended sell at tier target margin
    l.sellAtTarget = l.lineCost / (1 - tierMarginTarget);
    l.sellRateAtTarget = l.qty > 0 ? l.sellAtTarget / l.qty : 0;

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

  var totalCost = totalMatCost + totalLabCost;
  var costPerUnit = totalQty > 0 ? totalCost / totalQty : 0;

  // Volume floor warning
  var vfwEl = document.getElementById('vol-floor-warning');
  if (vfwEl) vfwEl.style.display = volFloorActive ? 'block' : 'none';

  // Summary stats
  var unitLabel = lines[0]?.unit === 'lm' ? ' lm' : ' sqm';
  setText('r-total-sqm', totalQty.toFixed(1) + unitLabel);
  setText('r-mat-cost', fmt(totalMatCost));
  setText('r-mat-sub', 'Dulux PAC Card — exact PO calc');
  setText('r-lab-cost', fmt(totalLabCost));
  // Build labour sub-text showing per-substrate rates
  var labSubParts = [];
  var labTypes = {};
  lines.forEach(function(l) { labTypes[l.matType] = true; });
  if (labTypes['slab']) labSubParts.push('Slab flat fee $' + getSettingVal('set-slab-labour'));
  if (labTypes['specialty_finish']) labSubParts.push('Specialty @ $' + getSettingVal('set-lab-specialty') + '/sqm');
  if (labTypes['ext_microcement']) labSubParts.push('Microcement @ $' + getSettingVal('set-lab-microcement') + '/sqm');
  if (labTypes['hebel_install']) labSubParts.push('Hebel Install @ $' + getSettingVal('set-lab-hebel-install') + '/sqm');
  if (labTypes['eps_install']) labSubParts.push('EPS Install @ $' + getSettingVal('set-lab-eps-install') + '/sqm');
  if (labTypes['brick_hebel'] || labTypes['eps_blueboard'] || labTypes['specialty'] || labTypes['hebel_supply'] || labTypes['hebel_full'] || labTypes['eps_supply'] || labTypes['eps_full'] || labTypes['other_standard']) {
    labSubParts.push('Subbie @ ' + fmt(subbieRate) + '/sqm');
  }
  setText('r-lab-sub', labSubParts.length > 0 ? labSubParts.join(' | ') : '@ ' + fmt(subbieRate) + '/sqm subbie rate');
  setText('r-job-cost', fmt(totalCost));
  setText('r-sqm-cost', fmt(costPerUnit) + '/unit blended cost');

  // Recommended sell price
  renderRecommendedSell(lines, tier, tierMarginTarget, totalCost, totalQty);

  // Custom sell price check
  var customSell = parseFloat(document.getElementById('custom-sell')?.value) || 0;
  if (customSell > 0) {
    var customMargin = ((customSell - totalCost) / customSell) * 100;
    var customProfit = customSell - totalCost;
    var cls = customMargin >= 40 ? 'color:var(--green)' : customMargin >= 30 ? 'color:var(--amber)' : 'color:var(--red)';
    var label = customMargin >= 40 ? 'TARGET MET' : customMargin >= 30 ? 'BELOW TARGET' : 'DANGER ZONE';
    setHTML('custom-margin-display',
      '<span style="' + cls + ';font-weight:800;">' + customMargin.toFixed(1) + '% MARGIN</span> — Profit: ' + fmt(customProfit) + ' — <strong>' + label + '</strong>');
  } else {
    setText('custom-margin-display', 'Enter a sell price to see your actual margin');
  }

  // Margin bands
  renderMarginBands(totalCost, totalQty);

  // Per-line breakdown
  renderLineBreakdown(lines, tier, tierMarginTarget);

  // Material breakdown (PO Processor detail)
  renderMaterialBreakdown(lines);

  // Market rate comparison
  renderMarketComparison(lines, tierMarginTarget);
}

function setText(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setHTML(id, html) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ── RECOMMENDED SELL PRICE ─────────────────────────────────
function renderRecommendedSell(lines, tier, tierMarginTarget, totalCost, totalQty) {
  var totalSell = lines.reduce(function(s, l) { return s + l.sellAtTarget; }, 0);
  var avgRate = totalQty > 0 ? totalSell / totalQty : 0;
  var profit = totalSell - totalCost;
  var margin = totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0;
  var minJob = getSettingVal('set-min-job');

  var finalSell = totalSell;
  var minApplied = false;
  if (finalSell < minJob) {
    finalSell = minJob;
    minApplied = true;
  }

  var finalProfit = finalSell - totalCost;
  var finalMargin = finalSell > 0 ? ((finalSell - totalCost) / finalSell) * 100 : 0;

  var html = '<div class="results-grid four">' +
    '<div class="stat-card" style="border-color:var(--gold);">' +
      '<div class="stat-label">RECOMMENDED SELL</div>' +
      '<div class="stat-value gold">' + fmt(finalSell) + '</div>' +
      '<div class="stat-sub">' + (minApplied ? 'Minimum job applied' : 'At ' + tier.name + ' target margin') + '</div>' +
    '</div>' +
    '<div class="stat-card">' +
      '<div class="stat-label">AVG SELL RATE</div>' +
      '<div class="stat-value">' + fmt(avgRate) + '/unit</div>' +
      '<div class="stat-sub">Blended across all lines</div>' +
    '</div>' +
    '<div class="stat-card">' +
      '<div class="stat-label">GROSS PROFIT</div>' +
      '<div class="stat-value green">' + fmt(finalProfit) + '</div>' +
      '<div class="stat-sub">Before overheads</div>' +
    '</div>' +
    '<div class="stat-card">' +
      '<div class="stat-label">GROSS MARGIN</div>' +
      '<div class="stat-value ' + (finalMargin >= 40 ? 'green' : finalMargin >= 30 ? 'amber' : 'red') + '">' + finalMargin.toFixed(1) + '%</div>' +
      '<div class="stat-sub">' + tier.name + ' target: ' + (tierMarginTarget*100).toFixed(0) + '%</div>' +
    '</div>' +
  '</div>';

  if (minApplied) {
    html += '<div class="callout callout-gold" style="margin-top:14px;">' +
      '<strong>MINIMUM JOB VALUE APPLIED:</strong> The calculated sell price was below the $' + minJob.toLocaleString() + ' minimum. The recommended sell has been set to the minimum job value.' +
    '</div>';
  }

  setHTML('rec-sell-wrap', html);
}

// ── MARGIN BANDS ───────────────────────────────────────────
function renderMarginBands(totalCost, totalQty) {
  var bands = [25,30,35,40,45,50,55];
  var html = '<table class="margin-table"><thead><tr>' +
    '<th>MARGIN</th><th>SELL PRICE (JOB)</th><th>$/UNIT SELL</th><th>PROFIT</th><th>STATUS</th>' +
    '</tr></thead><tbody>';

  bands.forEach(function(b) {
    var sell = totalCost / (1 - b/100);
    var profit = sell - totalCost;
    var unitRate = totalQty > 0 ? sell / totalQty : 0;
    var cls = b >= 40 ? 'band-green' : b >= 30 ? 'band-amber' : 'band-red';
    var dot = b >= 40 ? 'green' : b >= 30 ? 'amber' : 'red';
    var label = b >= 40 ? 'TARGET' : b >= 30 ? 'MINIMUM' : 'BELOW MIN';
    html += '<tr class="' + cls + '">' +
      '<td><span class="band-dot ' + dot + '"></span><strong>' + b + '%</strong></td>' +
      '<td>' + fmt(sell) + '</td>' +
      '<td>' + fmt(unitRate) + '/unit</td>' +
      '<td>' + fmt(profit) + '</td>' +
      '<td><strong>' + label + '</strong></td>' +
    '</tr>';
  });
  html += '</tbody></table>';
  setHTML('margin-bands-wrap', html);
}

// ── PER-LINE BREAKDOWN ─────────────────────────────────────
function renderLineBreakdown(lines, tier, tierMarginTarget) {
  var marginPct = (tierMarginTarget * 100).toFixed(0);
  var html = '<table class="breakdown-table"><thead><tr>' +
    '<th>LINE</th><th>SUBSTRATE</th><th>DIFFICULTY</th><th class="right">QTY</th>' +
    '<th class="right">BASE RATE</th><th class="right">DIFF ADD-ON</th><th class="right">TOTAL RATE</th>' +
    '<th class="right">MAT COST</th><th class="right">LAB COST</th><th class="right">LINE COST</th>' +
    '<th class="right">SELL @ ' + marginPct + '%</th><th class="right">MARGIN</th>' +
    '</tr></thead><tbody>';

  var totalCost = 0, totalSell = 0;

  lines.forEach(function(l) {
    totalCost += l.lineCost;
    totalSell += l.sellAtTarget;
    var marginCls = l.marginAtTarget >= 40 ? 'color:var(--green)' : l.marginAtTarget >= 30 ? 'color:var(--amber)' : 'color:var(--red)';
    html += '<tr>' +
      '<td>' + l.name + '</td>' +
      '<td>' + l.substrate.name + '</td>' +
      '<td>L' + l.diffLevel + ' — ' + DIFFICULTY_LEVELS[l.diffLevel].name + '</td>' +
      '<td class="right">' + l.qty + ' ' + l.unit + '</td>' +
      '<td class="right">' + fmt(l.baseRate) + '</td>' +
      '<td class="right">+' + fmt(l.diffAddon) + '</td>' +
      '<td class="right">' + fmt(l.totalRate) + '</td>' +
      '<td class="right">' + fmt(l.matCost) + '</td>' +
      '<td class="right">' + fmt(l.labCost) + '</td>' +
      '<td class="right">' + fmt(l.lineCost) + '</td>' +
      '<td class="right">' + fmt(l.sellAtTarget) + (l.floorApplied ? ' *' : '') + '</td>' +
      '<td class="right" style="' + marginCls + ';font-weight:700;">' + l.marginAtTarget.toFixed(1) + '%</td>' +
    '</tr>';
  });

  var totalMargin = totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0;
  html += '</tbody><tfoot><tr class="total-row">' +
    '<td colspan="7">TOTALS</td>' +
    '<td class="right">' + fmt(lines.reduce(function(s,l) { return s+l.matCost; }, 0)) + '</td>' +
    '<td class="right">' + fmt(lines.reduce(function(s,l) { return s+l.labCost; }, 0)) + '</td>' +
    '<td class="right">' + fmt(totalCost) + '</td>' +
    '<td class="right">' + fmt(totalSell) + '</td>' +
    '<td class="right">' + totalMargin.toFixed(1) + '%</td>' +
  '</tr></tfoot></table>';

  setHTML('line-breakdown-wrap', html);
}

// ═══════════════════════════════════════════════════════════
// MATERIAL BREAKDOWN — PO PROCESSOR DETAIL
// Shows actual bag/bucket/roll quantities per line
// ═══════════════════════════════════════════════════════════
function renderMaterialBreakdown(lines) {
  var html = '<div class="callout callout-info" style="margin-bottom:14px;">' +
    '<strong>PO PROCESSOR — EXACT MATERIAL QUANTITIES</strong> — Calculated using locked PO formulas with Dulux 2026 PAC Card pricing. Rounding rule: 0.00–0.34 → round down, 0.35–0.99 → round up.' +
  '</div>';

  var grandTotal = 0;

  lines.forEach(function(l) {
    html += '<h4 style="color:var(--gold);margin:18px 0 8px;font-size:13px;letter-spacing:1px;">' +
      l.name.toUpperCase() + ' — ' + l.substrate.name + ' (' + l.qty + ' ' + l.unit + ')' +
    '</h4>';

    html += '<table class="mat-table"><thead><tr>' +
      '<th>PRODUCT</th><th class="right">QTY</th><th>UNIT</th><th class="right">UNIT PRICE</th><th class="right">TOTAL</th>' +
    '</tr></thead><tbody>';

    var lineMatTotal = 0;
    l.materials.forEach(function(m) {
      lineMatTotal += m.total;
      html += '<tr>' +
        '<td>' + m.name + '</td>' +
        '<td class="right">' + m.qty + '</td>' +
        '<td>' + m.unit + '</td>' +
        '<td class="right">' + fmt(m.unitPrice) + '</td>' +
        '<td class="right">' + fmt(m.total) + '</td>' +
      '</tr>';
    });

    grandTotal += lineMatTotal;

    // Labour row — per-substrate rate labels
    var labLabel;
    if (l.matType === 'slab') {
      labLabel = 'Slab Labour (Flat Fee)';
    } else if (l.matType === 'specialty_finish') {
      labLabel = 'Specialty Labour (' + l.qty + ' ' + l.unit + ' @ ' + fmt(getSettingVal('set-lab-specialty')) + '/' + l.unit + ')';
    } else if (l.matType === 'ext_microcement') {
      labLabel = 'Microcement Labour — 3 Coats (' + l.qty + ' ' + l.unit + ' @ ' + fmt(getSettingVal('set-lab-microcement')) + '/' + l.unit + ')';
    } else if (l.matType === 'hebel_install') {
      labLabel = 'Hebel Install Labour (' + l.qty + ' ' + l.unit + ' @ ' + fmt(getSettingVal('set-lab-hebel-install')) + '/' + l.unit + ')';
    } else if (l.matType === 'eps_install') {
      labLabel = 'EPS Install Labour (' + l.qty + ' ' + l.unit + ' @ ' + fmt(getSettingVal('set-lab-eps-install')) + '/' + l.unit + ')';
    } else {
      labLabel = 'Subcontractor Labour (' + l.qty + ' ' + l.unit + ' @ ' + fmt(getSettingVal('set-subbie-rate')) + '/' + l.unit + ')';
    }
    html += '<tr style="border-top:1px solid var(--grey-dark);">' +
      '<td>' + labLabel + '</td>' +
      '<td class="right">' + (l.matType === 'slab' ? '1' : l.qty) + '</td>' +
      '<td>' + (l.matType === 'slab' ? 'job' : l.unit) + '</td>' +
      '<td class="right">' + (function() {
        if (l.matType === 'slab') return fmt(getSettingVal('set-slab-labour'));
        if (l.matType === 'specialty_finish') return fmt(getSettingVal('set-lab-specialty'));
        if (l.matType === 'ext_microcement') return fmt(getSettingVal('set-lab-microcement'));
        if (l.matType === 'hebel_install') return fmt(getSettingVal('set-lab-hebel-install'));
        if (l.matType === 'eps_install') return fmt(getSettingVal('set-lab-eps-install'));
        return fmt(getSettingVal('set-subbie-rate'));
      })() + '</td>' +
      '<td class="right">' + fmt(l.labCost) + '</td>' +
    '</tr>';

    html += '</tbody><tfoot><tr class="total-row">' +
      '<td colspan="4">LINE TOTAL (Materials + Labour)</td>' +
      '<td class="right">' + fmt(lineMatTotal + l.labCost) + '</td>' +
    '</tr></tfoot></table>';
  });

  // Grand total
  var totalLab = lines.reduce(function(s, l) { return s + l.labCost; }, 0);
  html += '<div style="margin-top:18px;padding:14px;background:var(--grey-darker);border:1px solid var(--gold);border-radius:8px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
      '<span style="font-weight:700;font-size:14px;letter-spacing:1px;">TOTAL MATERIAL COST</span>' +
      '<span style="font-weight:800;font-size:18px;color:var(--gold);">' + fmt(grandTotal) + '</span>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">' +
      '<span style="font-weight:700;font-size:14px;letter-spacing:1px;">TOTAL LABOUR COST</span>' +
      '<span style="font-weight:800;font-size:18px;">' + fmt(totalLab) + '</span>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid var(--gold);">' +
      '<span style="font-weight:700;font-size:14px;letter-spacing:1px;">TOTAL JOB COST</span>' +
      '<span style="font-weight:900;font-size:20px;color:var(--gold);">' + fmt(grandTotal + totalLab) + '</span>' +
    '</div>' +
  '</div>';

  setHTML('material-wrap', html);
}

// ── MARKET RATE COMPARISON ─────────────────────────────────
function renderMarketComparison(lines, tierMarginTarget) {
  var marketRates = {};
  Object.keys(SUBSTRATE_KEYS).forEach(function(key) {
    var minEl = document.getElementById('set-mkt-' + key + '-min');
    var maxEl = document.getElementById('set-mkt-' + key + '-max');
    if (minEl && maxEl) {
      marketRates[key] = { min: parseFloat(minEl.value) || 0, max: parseFloat(maxEl.value) || 0 };
    }
  });

  var html = '<div class="callout callout-info" style="margin-bottom:14px;">' +
    '<strong>GOLD COAST RENDERING MARKET RATES (2025-2026)</strong> — Your sell rate vs. market range. Rates are per sqm, ex GST. Market data from local industry research.' +
  '</div>' +
  '<table class="margin-table"><thead><tr>' +
    '<th>LINE</th><th>SUBSTRATE</th><th>YOUR SELL RATE</th><th>MARKET MIN</th><th>MARKET MAX</th><th>MARKET MID</th><th>POSITION</th>' +
  '</tr></thead><tbody>';

  lines.forEach(function(l) {
    var sellRate = l.qty > 0 ? l.sellAtTarget / l.qty : 0;
    var mkt = marketRates[l.subKey];
    if (mkt && mkt.max > 0) {
      var mid = (mkt.min + mkt.max) / 2;
      var position = '', posClass = '';
      if (sellRate < mkt.min) { position = 'BELOW MARKET'; posClass = 'color:var(--red);font-weight:700;'; }
      else if (sellRate <= mid) { position = 'LOWER HALF'; posClass = 'color:var(--amber);font-weight:700;'; }
      else if (sellRate <= mkt.max) { position = 'UPPER HALF'; posClass = 'color:var(--green);font-weight:700;'; }
      else { position = 'ABOVE MARKET'; posClass = 'color:var(--gold);font-weight:700;'; }

      var range = mkt.max - mkt.min;
      var pct = range > 0 ? Math.min(100, Math.max(0, ((sellRate - mkt.min) / range) * 100)) : 50;

      html += '<tr>' +
        '<td>' + l.name + '</td><td>' + l.substrate.name + '</td>' +
        '<td class="right">' + fmt(sellRate) + '/sqm</td>' +
        '<td class="right">' + fmt(mkt.min) + '</td><td class="right">' + fmt(mkt.max) + '</td>' +
        '<td class="right">' + fmt(mid) + '</td>' +
        '<td style="' + posClass + '">' + position + '</td>' +
      '</tr>' +
      '<tr><td colspan="7" style="padding:4px 12px 12px;">' +
        '<div class="market-bar-wrap"><div class="market-bar-track">' +
          '<div class="market-bar-fill" style="width:' + pct + '%"></div>' +
          '<div class="market-bar-marker" style="left:' + pct + '%"></div>' +
        '</div><div class="market-bar-labels"><span>' + fmt(mkt.min) + '</span><span>' + fmt(mkt.max) + '</span></div></div>' +
      '</td></tr>';
    } else {
      html += '<tr><td>' + l.name + '</td><td>' + l.substrate.name + '</td>' +
        '<td class="right">' + fmt(sellRate) + '/sqm</td>' +
        '<td colspan="4" style="color:var(--grey-mid);">No market data available</td></tr>';
    }
  });

  html += '</tbody></table>';
  setHTML('market-check-wrap', html);
}

// ── CLEAR RESULTS ──────────────────────────────────────────
function clearResults() {
  ['r-mat-cost','r-lab-cost','r-job-cost','r-sqm-cost','r-mat-sub','r-lab-sub','r-total-sqm'].forEach(function(id) {
    setText(id, '—');
  });
  ['rec-sell-wrap','margin-bands-wrap','line-breakdown-wrap','material-wrap','market-check-wrap'].forEach(function(id) {
    setHTML(id, '');
  });
  var vfwEl = document.getElementById('vol-floor-warning');
  if (vfwEl) vfwEl.style.display = 'none';
}

// ── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  checkDrift();
  addSurfaceLine('brick_hebel', 1);
});
