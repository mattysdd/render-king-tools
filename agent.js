// ═══════════════════════════════════════════════════════════
// RENDER KING — AI AGENT + SHARED DATA STORE + AI CHAT
// Voice-to-text, smart defaults, auto-populate quote + calc
// Cross-tab data flow: Quote → Margin → Terms
// AI Chat powered by GPT-4.1-mini
// ═══════════════════════════════════════════════════════════

// ── SHARED DATA STORE ────────────────────────────────────
// Central state that syncs across Quote, Margin, and Terms
var rkSharedData = {
  quoteNumber: '',
  clientName: '',
  contactName: '',
  phone: '',
  email: '',
  siteAddress: '',
  lotPlan: '',
  poNumber: '',
  builderRef: '',
  builderType: 'standard',
  scope: '',
  substrate: '',
  difficulty: '',
  sections: [],
  colour: '',
  startDate: '',
  duration: '',
  validity: '48'
};

// Save shared data to localStorage for cross-page access
function saveSharedData() {
  try { localStorage.setItem('rk_shared_data', JSON.stringify(rkSharedData)); } catch(e) {}
}

function loadSharedData() {
  try {
    var d = JSON.parse(localStorage.getItem('rk_shared_data'));
    if (d) Object.assign(rkSharedData, d);
  } catch(e) {}
}

// ── PUSH QUOTE → MARGIN ──────────────────────────────────
// Reads the Quote Generator tab and pushes data into the Margin Calculator
function pushQuoteToMargin() {
  // Collect client details from quote
  var clientFields = document.querySelectorAll('#tab-quote .section:first-child .field-val');
  if (clientFields.length >= 8) {
    rkSharedData.clientName = clientFields[0].textContent.trim().replace(/\u00A0/g, '');
    rkSharedData.contactName = clientFields[1].textContent.trim().replace(/\u00A0/g, '');
    rkSharedData.phone = clientFields[2].textContent.trim().replace(/\u00A0/g, '');
    rkSharedData.email = clientFields[3].textContent.trim().replace(/\u00A0/g, '');
    rkSharedData.siteAddress = clientFields[4].textContent.trim().replace(/\u00A0/g, '');
    rkSharedData.lotPlan = clientFields[5].textContent.trim().replace(/\u00A0/g, '');
    rkSharedData.poNumber = clientFields[6].textContent.trim().replace(/\u00A0/g, '');
    rkSharedData.builderRef = clientFields[7].textContent.trim().replace(/\u00A0/g, '');
  }
  rkSharedData.quoteNumber = (document.getElementById('q-quote-number')?.textContent || '').trim();
  rkSharedData.builderType = document.getElementById('q-builder-type')?.value || 'standard';

  // Collect line items from quote pricing table
  var quoteLines = [];
  document.querySelectorAll('#q-pricing-body tr').forEach(function(tr) {
    var descInput = tr.querySelector('input.desc');
    var numInputs = tr.querySelectorAll('input[type="number"]');
    var unitInput = tr.querySelectorAll('input[type="text"]');
    if (descInput && numInputs.length >= 2) {
      var qty = parseFloat(numInputs[0].value) || 0;
      var rate = parseFloat(numInputs[1].value) || 0;
      var unit = unitInput[1]?.value || 'sqm';
      var desc = descInput.value || '';
      quoteLines.push({ description: desc, qty: qty, rate: rate, unit: unit });
    }
  });

  // Clear existing calculator lines
  var surfaceLines = document.getElementById('surface-lines');
  if (surfaceLines) surfaceLines.innerHTML = '';
  lineCount = 0;

  // Map quote lines to calculator lines
  quoteLines.forEach(function(ql) {
    // Try to detect substrate from description
    var subKey = detectSubstrateFromDesc(ql.description);
    var diffLevel = detectDifficultyFromRate(subKey, ql.rate);

    addSurfaceLine(subKey, diffLevel);
    var lineId = lineCount;
    var qtyEl = document.getElementById('qty-' + lineId);
    if (qtyEl) qtyEl.value = ql.qty;
    var nameEl = document.getElementById('name-' + lineId);
    if (nameEl) nameEl.value = ql.description;
  });

  // Set builder tier
  var tierBtns = document.querySelectorAll('#tier-grid .tier-option');
  tierBtns.forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.getAttribute('data-key') === rkSharedData.builderType) {
      btn.classList.add('active');
    }
  });
  currentTier = rkSharedData.builderType;

  // Trigger recalc
  recalc();
  saveSharedData();

  // Switch to calculator tab
  switchTab('calculator');
  window.scrollTo(0, 0);

  // Show confirmation
  showFlashBanner('QUOTE DATA PUSHED TO MARGIN CALCULATOR', 'gold');
}

// ── PUSH QUOTE → TERMS ──────────────────────────────────
function pushQuoteToTerms() {
  // Collect from quote
  var clientFields = document.querySelectorAll('#tab-quote .section:first-child .field-val');
  var quoteNum = (document.getElementById('q-quote-number')?.textContent || '').trim();

  if (clientFields.length >= 8) {
    rkSharedData.clientName = clientFields[0].textContent.trim().replace(/\u00A0/g, '');
    rkSharedData.contactName = clientFields[1].textContent.trim().replace(/\u00A0/g, '');
  }
  rkSharedData.quoteNumber = quoteNum;

  // Populate T&C fields
  var tcQuoteRef = document.getElementById('tc-quote-ref');
  if (tcQuoteRef) tcQuoteRef.textContent = quoteNum + ' — ' + rkSharedData.clientName;

  var tcClientName = document.getElementById('tc-sig-client-name');
  if (tcClientName) tcClientName.value = rkSharedData.contactName || rkSharedData.clientName;

  var tcClientDate = document.getElementById('tc-sig-client-date');
  if (tcClientDate) tcClientDate.value = new Date().toISOString().split('T')[0];

  var tcRkDate = document.getElementById('tc-sig-rk-date');
  if (tcRkDate) tcRkDate.value = new Date().toISOString().split('T')[0];

  saveSharedData();

  // Switch to terms tab
  switchTab('terms');
  window.scrollTo(0, 0);

  showFlashBanner('CLIENT DATA PUSHED TO TERMS & CONDITIONS', 'green');
}

// ── SUBSTRATE DETECTION FROM DESCRIPTION ──────────────────
function detectSubstrateFromDesc(desc) {
  if (!desc) return 'brick_hebel';
  var d = desc.toLowerCase();
  if (d.indexOf('slab') !== -1) return 'slab_build';
  if (d.indexOf('eps') !== -1 || d.indexOf('blueboard') !== -1) {
    if (d.indexOf('full') !== -1 || d.indexOf('system') !== -1) return 'eps_full';
    if (d.indexOf('supply') !== -1 || d.indexOf('install') !== -1) return 'eps_supply';
    return 'eps_blueboard';
  }
  if (d.indexOf('hebel') !== -1 || d.indexOf('aac') !== -1) {
    if (d.indexOf('full') !== -1 || d.indexOf('system') !== -1) return 'hebel_full';
    if (d.indexOf('supply') !== -1 || d.indexOf('install') !== -1) return 'hebel_supply';
    return 'brick_hebel';
  }
  if (d.indexOf('microcement') !== -1) return 'ext_microcement';
  if (d.indexOf('specialty') !== -1 || d.indexOf('architectural') !== -1) return 'specialty';
  if (d.indexOf('specialty finish') !== -1) return 'specialty_finish';
  return 'brick_hebel';
}

function detectDifficultyFromRate(subKey, rate) {
  // Try to reverse-engineer difficulty from the sell rate
  var baseRate = getSubstrateBaseRate(subKey);
  var diff = rate - baseRate;
  if (diff <= 0) return 1;
  // Check each difficulty addon
  for (var i = 5; i >= 1; i--) {
    var addon = getDiffAddon(i);
    if (Math.abs(diff - addon) < 3) return i;
  }
  return 1;
}

// ── FLASH BANNER ──────────────────────────────────────────
function showFlashBanner(msg, color) {
  var existing = document.getElementById('rk-flash-banner');
  if (existing) existing.remove();

  var colors = {
    gold: 'background:var(--gold);color:#000;',
    green: 'background:var(--green);color:#fff;',
    red: 'background:var(--red);color:#fff;',
    blue: 'background:var(--blue);color:#fff;'
  };

  var banner = document.createElement('div');
  banner.id = 'rk-flash-banner';
  banner.style.cssText = (colors[color] || colors.gold) + 'position:fixed;top:60px;left:50%;transform:translateX(-50%);padding:14px 32px;font-weight:800;font-size:13px;letter-spacing:1.5px;border-radius:8px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.4);text-align:center;';
  banner.textContent = msg;
  document.body.appendChild(banner);
  setTimeout(function() { banner.remove(); }, 4000);
}

// ── AGENT SECTION MANAGEMENT ──────────────────────────────
var agentSectionCount = 0;
var agentFiles = [];

function addAgentSection(defaults) {
  agentSectionCount++;
  var id = agentSectionCount;
  var d = defaults || {};

  var subOptions = '';
  // Ordered to match calculator dropdown — grouped, no background-only substrates
  var renderSubs = [
    ['slab_build',       'Slab Build (Linear Metre)'],
    ['brick_hebel',      'Brick / Hebel'],
    ['eps_blueboard',    'EPS / Blueboard'],
    ['specialty',        'Specialty / Architectural'],
    ['specialty_finish', 'Specialty Finish'],
    ['ext_microcement',  'External Microcement'],
    ['other_standard',   'Other / Standard Finish']
  ];
  var installSubs = [
    ['hebel_supply', 'Hebel Supply + Install'],
    ['hebel_full',   'Full Hebel System (Supply+Install+Render)'],
    ['eps_supply',   'EPS Supply + Install'],
    ['eps_full',     'Full EPS System (Supply+Install+Render)']
  ];
  subOptions += '<optgroup label="\u2500\u2500\u2500 RENDER SYSTEMS \u2500\u2500\u2500">';
  renderSubs.forEach(function(s) {
    var sel = (s[0] === (d.substrate || 'brick_hebel')) ? ' selected' : '';
    subOptions += '<option value="' + s[0] + '"' + sel + '>' + s[1] + '</option>';
  });
  subOptions += '</optgroup><optgroup label="\u2500\u2500\u2500 INSTALL SYSTEMS \u2500\u2500\u2500">';
  installSubs.forEach(function(s) {
    var sel = (s[0] === (d.substrate || 'brick_hebel')) ? ' selected' : '';
    subOptions += '<option value="' + s[0] + '"' + sel + '>' + s[1] + '</option>';
  });
  subOptions += '</optgroup>';

  var diffOptions = '';
  for (var i = 1; i <= 5; i++) {
    var sel = (i === (d.difficulty || 1)) ? ' selected' : '';
    var names = {1:'Volume / Ground',2:'Lower Complexity',3:'Upper Storey',4:'Detail / Complex',5:'Luxury / Architectural'};
    diffOptions += '<option value="' + i + '"' + sel + '>Level ' + i + ' — ' + names[i] + '</option>';
  }

  var texOptions = '<option value="powerfinish" selected>Powerfinish</option><option value="sponge_fine">Sponge Fine</option><option value="coventry_med">Coventry Medium</option><option value="none">No Texture Finish</option>';

  var html = '<div class="agent-section" id="ag-section-' + id + '">' +
    '<div class="agent-section-header">' +
      '<span class="agent-section-title">SECTION ' + id + '</span>' +
      (id > 1 ? '<button class="btn-remove-line" onclick="removeAgentSection(' + id + ')" title="Remove">&times;</button>' : '') +
    '</div>' +
    '<div class="agent-grid">' +
      '<div class="agent-field">' +
        '<label>SECTION LABEL</label>' +
        '<div class="mic-wrap">' +
          '<input type="text" id="ag-sec-label-' + id + '" placeholder="e.g. Ground Floor, Upper Floor, Garage" value="' + (d.label || '') + '">' +
          '<button class="mic-btn" onclick="startVoice(\'ag-sec-label-' + id + '\')" title="Voice input">&#127908;</button>' +
        '</div>' +
      '</div>' +
      '<div class="agent-field">' +
        '<label>SUBSTRATE TYPE</label>' +
        '<select id="ag-sec-sub-' + id + '">' + subOptions + '</select>' +
      '</div>' +
      '<div class="agent-field">' +
        '<label>DIFFICULTY LEVEL</label>' +
        '<select id="ag-sec-diff-' + id + '">' + diffOptions + '</select>' +
      '</div>' +
      '<div class="agent-field">' +
        '<label>AREA (SQM / LM FOR SLAB)</label>' +
        '<input type="number" id="ag-sec-area-' + id + '" placeholder="0" min="0" step="0.1" value="' + (d.area || '') + '">' +
      '</div>' +
      '<div class="agent-field">' +
        '<label>TEXTURE FINISH</label>' +
        '<select id="ag-sec-tex-' + id + '">' + texOptions + '</select>' +
      '</div>' +
      '<div class="agent-field">' +
        '<label>NOTES <span class="opt-label">(OPTIONAL)</span></label>' +
        '<div class="mic-wrap">' +
          '<input type="text" id="ag-sec-notes-' + id + '" placeholder="e.g. curved walls, tight access, TBA" value="' + (d.notes || '') + '">' +
          '<button class="mic-btn" onclick="startVoice(\'ag-sec-notes-' + id + '\')" title="Voice input">&#127908;</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  document.getElementById('ag-sections-wrap').insertAdjacentHTML('beforeend', html);
}

function removeAgentSection(id) {
  var el = document.getElementById('ag-section-' + id);
  if (el) el.remove();
}

// ── VOICE-TO-TEXT (Web Speech API) ────────────────────────
var voiceRecognition = null;
var voiceTargetId = null;
var voiceFieldType = null;

function startVoice(fieldId, fieldType) {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Voice input is not supported in this browser. Use Chrome or Safari.');
    return;
  }

  // Stop any existing recognition
  if (voiceRecognition) {
    try { voiceRecognition.stop(); } catch(e) {}
  }

  voiceTargetId = fieldId;
  voiceFieldType = fieldType || 'text';

  voiceRecognition = new SpeechRecognition();
  voiceRecognition.lang = 'en-AU';
  voiceRecognition.interimResults = false;
  voiceRecognition.maxAlternatives = 1;
  voiceRecognition.continuous = false;

  // Show listening indicator
  var indicator = document.getElementById('ag-voice-indicator');
  if (indicator) indicator.style.display = 'block';

  // Highlight the active mic button
  var field = document.getElementById(fieldId);
  var micBtn = field ? field.parentElement.querySelector('.mic-btn') : null;
  if (micBtn) micBtn.classList.add('mic-active');

  voiceRecognition.onresult = function(event) {
    var transcript = event.results[0][0].transcript;
    var cleaned = smartClean(transcript, voiceFieldType);
    var el = document.getElementById(voiceTargetId);
    if (el) {
      if (el.tagName === 'TEXTAREA') {
        el.value = el.value ? el.value + ' ' + cleaned : cleaned;
      } else {
        el.value = cleaned;
      }
    }
  };

  voiceRecognition.onend = function() {
    if (indicator) indicator.style.display = 'none';
    if (micBtn) micBtn.classList.remove('mic-active');
  };

  voiceRecognition.onerror = function(event) {
    if (indicator) indicator.style.display = 'none';
    if (micBtn) micBtn.classList.remove('mic-active');
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      console.warn('Voice error:', event.error);
    }
  };

  voiceRecognition.start();
}

// ── SMART CLEANUP ─────────────────────────────────────────
function smartClean(text, type) {
  if (!text) return '';

  if (type === 'email') {
    var e = text.toLowerCase().trim();
    e = e.replace(/\s+at\s+/gi, '@');
    e = e.replace(/\s+dot\s+/gi, '.');
    e = e.replace(/\s+/g, '');
    return e;
  }

  if (type === 'phone') {
    var digits = text.replace(/\D/g, '');
    if (digits.length === 10) {
      return digits.substring(0, 4) + ' ' + digits.substring(4, 7) + ' ' + digits.substring(7);
    }
    return digits;
  }

  return text.trim();
}

// ── FILE ATTACHMENT HANDLING ──────────────────────────────
function handleAgentFiles(fileList) {
  for (var i = 0; i < fileList.length; i++) {
    var file = fileList[i];
    agentFiles.push(file);
    renderAgentFileList();
  }
  document.getElementById('ag-file-input').value = '';
}

function removeAgentFile(index) {
  agentFiles.splice(index, 1);
  renderAgentFileList();
}

function renderAgentFileList() {
  var wrap = document.getElementById('ag-file-list');
  if (!wrap) return;

  if (agentFiles.length === 0) {
    wrap.innerHTML = '';
    return;
  }

  var html = '';
  agentFiles.forEach(function(file, idx) {
    var isImage = file.type.startsWith('image/');
    if (isImage) {
      var url = URL.createObjectURL(file);
      html += '<div class="agent-file-item">' +
        '<img src="' + url + '" class="agent-file-thumb" alt="' + file.name + '">' +
        '<span class="agent-file-name">' + file.name + '</span>' +
        '<button class="btn-remove-line" onclick="removeAgentFile(' + idx + ')">&times;</button>' +
      '</div>';
    } else {
      html += '<div class="agent-file-item">' +
        '<span class="agent-file-icon">&#128196;</span>' +
        '<span class="agent-file-name">' + file.name + '</span>' +
        '<span class="agent-file-size">(' + (file.size / 1024).toFixed(0) + ' KB)</span>' +
        '<button class="btn-remove-line" onclick="removeAgentFile(' + idx + ')">&times;</button>' +
      '</div>';
    }
  });
  wrap.innerHTML = html;
}

// ── AUTO-GENERATE QUOTE NUMBER ────────────────────────────
function generateQuoteNumber() {
  var now = new Date();
  var year = now.getFullYear();
  var seq = String(Math.floor(Math.random() * 9000) + 1000);
  return 'RK-' + year + '-' + seq;
}

// ── POPULATE QUOTE & CALCULATOR ───────────────────────────
function populateQuoteFromAgent() {
  // Gather all agent form data
  var clientName  = document.getElementById('ag-client-name').value.trim() || 'TBA';
  var phone       = document.getElementById('ag-phone').value.trim() || 'TBA';
  var email       = document.getElementById('ag-email').value.trim() || 'TBA';
  var address     = document.getElementById('ag-address').value.trim() || 'TBA';
  var siteContact = document.getElementById('ag-site-contact').value.trim() || 'TBA';
  var builderName = document.getElementById('ag-builder-name').value.trim() || 'TBA';
  var builderType = document.getElementById('ag-builder-type').value;
  var colour      = document.getElementById('ag-colour').value.trim() || 'TBA';
  var startDate   = document.getElementById('ag-start-date').value || 'TBA';
  var duration    = document.getElementById('ag-duration').value.trim() || 'TBA';
  var scope       = document.getElementById('ag-scope').value.trim() || 'Acrylic render and texture finish application as per specifications below.';
  var quoteNum    = document.getElementById('ag-quote-number').value.trim() || generateQuoteNumber();
  var preparedBy  = document.getElementById('ag-prepared-by').value.trim() || 'King Mannion';
  var validity    = document.getElementById('ag-validity').value;

  // Update shared data
  rkSharedData.quoteNumber = quoteNum;
  rkSharedData.clientName = clientName;
  rkSharedData.contactName = siteContact;
  rkSharedData.phone = phone;
  rkSharedData.email = email;
  rkSharedData.siteAddress = address;
  rkSharedData.builderRef = builderName;
  rkSharedData.builderType = builderType;
  rkSharedData.scope = scope;
  rkSharedData.colour = colour;
  rkSharedData.startDate = startDate;
  rkSharedData.duration = duration;
  rkSharedData.validity = validity;

  // Collect sections
  var sections = [];
  var sectionEls = document.querySelectorAll('.agent-section');
  sectionEls.forEach(function(sec) {
    var id = sec.id.replace('ag-section-', '');
    var label = (document.getElementById('ag-sec-label-' + id)?.value || '').trim() || ('Section ' + id);
    var substrate = document.getElementById('ag-sec-sub-' + id)?.value || 'brick_hebel';
    var difficulty = parseInt(document.getElementById('ag-sec-diff-' + id)?.value) || 1;
    var area = parseFloat(document.getElementById('ag-sec-area-' + id)?.value) || 0;
    var texture = document.getElementById('ag-sec-tex-' + id)?.value || 'powerfinish';
    var notes = (document.getElementById('ag-sec-notes-' + id)?.value || '').trim();
    sections.push({ label: label, substrate: substrate, difficulty: difficulty, area: area, texture: texture, notes: notes });
  });

  if (sections.length === 0) {
    alert('Add at least one job section before populating.');
    return;
  }

  rkSharedData.sections = sections;

  // ── POPULATE QUOTE GENERATOR ────────────────────────────
  var qnEl = document.getElementById('q-quote-number');
  if (qnEl) qnEl.textContent = quoteNum;

  var validitySelect = document.getElementById('q-validity-select');
  if (validitySelect) {
    validitySelect.value = validity;
    updateQuoteValidity();
  }

  var btSelect = document.getElementById('q-builder-type');
  if (btSelect) btSelect.value = builderType;

  // Set client details
  var clientFieldsQ = document.querySelectorAll('#tab-quote .section:first-child .field-val');
  if (clientFieldsQ.length >= 8) {
    clientFieldsQ[0].textContent = clientName;
    clientFieldsQ[1].textContent = siteContact;
    clientFieldsQ[2].textContent = phone;
    clientFieldsQ[3].textContent = email;
    clientFieldsQ[4].textContent = address;
    clientFieldsQ[5].textContent = '';
    clientFieldsQ[6].textContent = quoteNum;
    clientFieldsQ[7].textContent = builderName;
  }

  // Set scope
  var scopeFields = document.querySelectorAll('#tab-quote .doc-body .section');
  if (scopeFields.length >= 2) {
    var scopeSection = scopeFields[1];
    var scopeDesc = scopeSection.querySelector('.field-val.tall');
    if (scopeDesc) scopeDesc.textContent = scope;

    var scopeFieldVals = scopeSection.querySelectorAll('.g2 .field-val');
    if (scopeFieldVals.length >= 2) {
      var subNames = [];
      sections.forEach(function(s) {
        var subName = {
          'brick_hebel': 'Brick/Hebel', 'eps_blueboard': 'EPS/Blueboard',
          'specialty': 'Specialty/Architectural', 'hebel_supply': 'Hebel Supply + Install',
          'hebel_full': 'Full Hebel System', 'eps_supply': 'EPS Supply + Install',
          'eps_full': 'Full EPS System', 'slab_build': 'Slab Build',
          'specialty_finish': 'Specialty Finish', 'ext_microcement': 'External Microcement',
          'other_standard': 'Other / Standard Finish'
        }[s.substrate] || s.substrate;
        subNames.push(s.label + ': ' + subName);
      });
      scopeFieldVals[0].textContent = subNames.join(' | ');

      var diffNames = [];
      sections.forEach(function(s) {
        var dName = {1:'Level 1 — Volume/Ground',2:'Level 2 — Lower Complexity',3:'Level 3 — Upper Storey',4:'Level 4 — Detail/Complex',5:'Level 5 — Luxury/Architectural'}[s.difficulty] || 'Level 1';
        diffNames.push(s.label + ': ' + dName);
      });
      scopeFieldVals[1].textContent = diffNames.join(' | ');
    }
  }

  // Clear and rebuild pricing lines
  var pricingBody = document.getElementById('q-pricing-body');
  if (pricingBody) pricingBody.innerHTML = '';
  quoteLineId = 0;

  sections.forEach(function(s) {
    var subRate = getSubstrateBaseRate(s.substrate);
    var diffAddon = getDiffAddon(s.difficulty);
    var sellRate = subRate + diffAddon;

    if (builderType === 'volume') {
      var volFloor = getSettingVal('set-vol-floor');
      if (sellRate < volFloor) sellRate = volFloor;
    }

    var unit = (s.substrate === 'slab_build') ? 'lm' : 'sqm';
    var desc = s.label;
    if (s.notes) desc += ' — ' + s.notes;
    var total = sellRate * s.area;

    addQuoteLine(desc, s.area, unit, sellRate, total);
  });

  calcQuoteTotals();

  // ── POPULATE MARGIN CALCULATOR ──────────────────────────
  var surfaceLines = document.getElementById('surface-lines');
  if (surfaceLines) surfaceLines.innerHTML = '';
  lineCount = 0;

  sections.forEach(function(s) {
    addSurfaceLine(s.substrate, s.difficulty);
    var lineId = lineCount;
    var qtyEl = document.getElementById('qty-' + lineId);
    if (qtyEl) qtyEl.value = s.area;
    var nameEl = document.getElementById('name-' + lineId);
    if (nameEl) nameEl.value = s.label;
    var texEl = document.getElementById('tex-' + lineId);
    if (texEl) texEl.value = s.texture;
  });

  // Set builder tier
  var tierBtns = document.querySelectorAll('#tier-grid .tier-option');
  tierBtns.forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.getAttribute('data-key') === builderType) {
      btn.classList.add('active');
    }
  });
  currentTier = builderType;

  recalc();

  // ── POPULATE TERMS ──────────────────────────────────────
  var tcQuoteRef = document.getElementById('tc-quote-ref');
  if (tcQuoteRef) tcQuoteRef.textContent = quoteNum + ' — ' + clientName;
  var tcClientName = document.getElementById('tc-sig-client-name');
  if (tcClientName) tcClientName.value = siteContact || clientName;

  saveSharedData();

  // Show success & switch to Quote tab
  var banner = document.getElementById('agent-success-banner');
  if (banner) {
    banner.textContent = 'ALL TABS POPULATED — Quote, Margin Calculator & Terms updated';
    banner.style.display = 'block';
    setTimeout(function() { banner.style.display = 'none'; }, 8000);
  }

  switchTab('quote');
  window.scrollTo(0, 0);
}

// ── CLEAR AGENT FORM ──────────────────────────────────────
function clearAgentForm() {
  if (!confirm('Clear all agent form data? This cannot be undone.')) return;

  ['ag-client-name','ag-phone','ag-email','ag-address','ag-site-contact','ag-builder-name'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var btEl = document.getElementById('ag-builder-type');
  if (btEl) btEl.value = 'standard';

  ['ag-colour','ag-duration','ag-scope'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var dateEl = document.getElementById('ag-start-date');
  if (dateEl) dateEl.value = '';

  document.getElementById('ag-sections-wrap').innerHTML = '';
  agentSectionCount = 0;
  addAgentSection();

  agentFiles = [];
  renderAgentFileList();

  document.getElementById('ag-quote-number').value = '';
  document.getElementById('ag-prepared-by').value = 'King Mannion';
  document.getElementById('ag-validity').value = '48';

  var banner = document.getElementById('agent-success-banner');
  if (banner) banner.style.display = 'none';
}


// ═══════════════════════════════════════════════════════════
// AI CHAT ASSISTANT — GPT-4.1-mini via Cloudflare Worker Proxy
// ═══════════════════════════════════════════════════════════

var aiChatHistory = [];
var AI_PROXY_URL = null; // Will be set after deployment

// System prompt with full Render King context
var AI_SYSTEM_PROMPT = 'You are the Render King AI Assistant — an expert in acrylic rendering, texture coatings, cladding systems, and construction quoting for a Gold Coast QLD rendering company.\n\n' +
  'BUSINESS CONTEXT:\n' +
  '- Company: Render Render Pty Ltd trading as Render King\n' +
  '- Location: Gold Coast, Queensland, Australia\n' +
  '- Specialties: Acrylic render, texture coatings, Hebel/AAC, EPS cladding, external wall systems\n' +
  '- Products: Dulux Acratex systems (AcraTex 810 low build, AcraTex 420 high build, Acrabuild Coarse 2002)\n' +
  '- Texture finishes: Powerfinish, Sponge Fine, Coventry Medium\n\n' +
  'PRICING (all ex GST, Gold Coast 2025-2026):\n' +
  '- Brick/Hebel render: $55/sqm base\n' +
  '- EPS/Blueboard: $75/sqm base\n' +
  '- Specialty Finish: $95/sqm base\n' +
  '- Specialty/Architectural: $110/sqm base\n' +
  '- External Microcement: $180/sqm base\n' +
  '- Hebel Supply + Install: $110/sqm\n' +
  '- Full Hebel System: $165/sqm\n' +
  '- EPS Supply + Install: $85/sqm\n' +
  '- Full EPS System: $150/sqm\n' +
  '- Slab Build: $200/lm\n' +
  '- Variation rate: $110/hr (2hr minimum)\n' +
  '- Minimum job: $2,200 ex GST\n\n' +
  'DIFFICULTY ADD-ONS ($/sqm):\n' +
  '- Level 1 (Volume/Ground): +$0\n' +
  '- Level 2 (Lower Complexity): +$5\n' +
  '- Level 3 (Upper Storey): +$12\n' +
  '- Level 4 (Detail/Complex): +$22\n' +
  '- Level 5 (Luxury/Architectural): +$35\n\n' +
  'MARGIN TARGETS:\n' +
  '- Volume builders: 25-30%\n' +
  '- Standard builders: 40%+\n' +
  '- Luxury builders: 40%+\n\n' +
  'PAYMENT TERMS:\n' +
  '- Over $20k: 5% deposit, 50% materials, 45% completion\n' +
  '- Under $20k: 10% deposit, 50% materials, 40% completion\n' +
  '- Volume builders: negotiated separately\n' +
  '- Overdue: $220 admin fee + 3% per week interest\n' +
  '- Governed by Building Industry Fairness (Security of Payment) Act 2017 QLD\n\n' +
  'OPERATING COSTS (built into recommended sell price):\n' +
  '- Vehicle/Tools: 5% of job cost\n' +
  '- Insurance/Compliance: 3%\n' +
  '- Admin/Office: 4%\n' +
  '- Waste/Contingency: 3%\n' +
  '- Total overhead: 15% on top of direct costs\n\n' +
  'RULES:\n' +
  '- All prices are ex GST unless stated\n' +
  '- Round prices UP to nearest dollar (Math.ceil)\n' +
  '- Be direct, concise, and commercial\n' +
  '- When asked about pricing, give specific numbers\n' +
  '- When asked about scope, be detailed and practical\n' +
  '- Reference QLD building regulations where relevant\n' +
  '- Think like a business partner, not a generic chatbot';

function getAiContext() {
  // Gather current state from the app to give AI context
  var context = '';

  // Current quote data
  var quoteNum = (document.getElementById('q-quote-number')?.textContent || '').trim();
  if (quoteNum && quoteNum !== 'RK-2026-') {
    context += '\nCURRENT QUOTE: ' + quoteNum;
  }

  // Client details
  var clientFields = document.querySelectorAll('#tab-quote .section:first-child .field-val');
  if (clientFields.length >= 4) {
    var cn = clientFields[0]?.textContent?.trim().replace(/\u00A0/g, '');
    if (cn) context += '\nCLIENT: ' + cn;
    var addr = clientFields[4]?.textContent?.trim().replace(/\u00A0/g, '');
    if (addr) context += '\nSITE: ' + addr;
  }

  // Calculator lines
  var lines = document.querySelectorAll('.surface-line');
  if (lines.length > 0) {
    context += '\nCALCULATOR LINES:';
    lines.forEach(function(el) {
      var id = el.id.replace('surface-line-', '');
      var subKey = document.getElementById('sub-' + id)?.value || '';
      var qty = document.getElementById('qty-' + id)?.value || '0';
      var name = document.getElementById('name-' + id)?.value || '';
      var sub = SUBSTRATE_KEYS[subKey];
      if (sub && parseFloat(qty) > 0) {
        context += '\n  - ' + (name || sub.name) + ': ' + qty + ' ' + sub.unit;
      }
    });
  }

  // Job cost summary
  var jobCost = document.getElementById('r-job-cost')?.textContent;
  if (jobCost && jobCost !== '—') context += '\nJOB COST: ' + jobCost;

  var tier = currentTier || 'standard';
  context += '\nBUILDER TIER: ' + tier;

  return context;
}

function sendAiMessage() {
  var input = document.getElementById('ai-input');
  if (!input) return;
  var msg = input.value.trim();
  if (!msg) return;

  input.value = '';

  // Add user message to chat
  addChatMessage('user', msg);

  // Add context to the first message or periodically
  var contextStr = getAiContext();
  var fullMsg = msg;
  if (aiChatHistory.length <= 2 && contextStr) {
    fullMsg = msg + '\n\n[CURRENT APP STATE:' + contextStr + ']';
  }

  aiChatHistory.push({ role: 'user', content: fullMsg });

  // Show typing indicator
  addChatMessage('system', 'Thinking...');

  // Call AI
  callAiProxy(aiChatHistory).then(function(response) {
    // Remove typing indicator
    var messages = document.getElementById('ai-chat-messages');
    var lastMsg = messages?.lastElementChild;
    if (lastMsg && lastMsg.textContent === 'Thinking...') lastMsg.remove();

    if (response.error) {
      addChatMessage('error', 'AI Error: ' + response.error);
    } else {
      var reply = response.content || response.message || 'No response';
      addChatMessage('response', reply);
      aiChatHistory.push({ role: 'assistant', content: reply });
    }
  }).catch(function(err) {
    var messages = document.getElementById('ai-chat-messages');
    var lastMsg = messages?.lastElementChild;
    if (lastMsg && lastMsg.textContent === 'Thinking...') lastMsg.remove();
    addChatMessage('error', 'Connection error: ' + err.message);
  });
}

function addChatMessage(type, text) {
  var area = document.getElementById('ai-chat-messages');
  if (!area) return;

  var div = document.createElement('div');
  div.className = 'ai-message ai-' + type;

  // Format response text with basic markdown
  if (type === 'response') {
    var formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(201,168,76,0.15);padding:2px 6px;border-radius:3px;">$1</code>');
    div.innerHTML = formatted;
  } else {
    div.textContent = text;
  }

  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function clearAiChat() {
  aiChatHistory = [];
  var area = document.getElementById('ai-chat-messages');
  if (area) {
    area.innerHTML = '<div class="ai-message ai-system">RENDER KING AI ASSISTANT \u2014 Ready to help with quoting, pricing, materials, and scope.</div>';
  }
}

// ── AI PROXY CALL ─────────────────────────────────────────
// Uses a Cloudflare Worker proxy to keep the API key server-side
// Falls back to direct call if proxy not available
async function callAiProxy(messages) {
  var fullMessages = [{ role: 'system', content: AI_SYSTEM_PROMPT }].concat(messages);

  // Try the proxy first
  if (AI_PROXY_URL) {
    try {
      var res = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: fullMessages })
      });
      if (res.ok) {
        var data = await res.json();
        return { content: data.choices?.[0]?.message?.content || data.content || 'No response' };
      }
    } catch(e) {
      console.warn('Proxy failed, trying direct:', e);
    }
  }

  // Fallback: use the GitHub-stored encrypted key approach
  // The key is split across the repo for basic obfuscation
  var keyParts = getAiKeyParts();
  if (!keyParts) {
    return { error: 'AI service not configured. Set up the AI proxy or API key.' };
  }

  try {
    var res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + keyParts
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: fullMessages,
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (res.ok) {
      var data = await res.json();
      return { content: data.choices?.[0]?.message?.content || 'No response' };
    } else {
      var err = await res.json();
      return { error: err.error?.message || 'API error ' + res.status };
    }
  } catch(e) {
    return { error: e.message };
  }
}

function getAiKeyParts() {
  // Retrieve from localStorage if user has configured it
  try {
    var key = localStorage.getItem('rk_ai_key');
    if (key) return key;
  } catch(e) {}
  return null;
}

// Allow Enter key to send
document.addEventListener('keydown', function(e) {
  if (e.target && e.target.id === 'ai-input' && e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAiMessage();
  }
});

// ── AI KEY MANAGEMENT ─────────────────────────────────────
function saveAiKey() {
  var el = document.getElementById('set-ai-key');
  if (el) {
    try { localStorage.setItem('rk_ai_key', el.value.trim()); } catch(e) {}
  }
}

function saveAiProxy() {
  var el = document.getElementById('set-ai-proxy');
  if (el) {
    var url = el.value.trim();
    try { localStorage.setItem('rk_ai_proxy', url); } catch(e) {}
    AI_PROXY_URL = url || null;
  }
}

function loadAiSettings() {
  try {
    var key = localStorage.getItem('rk_ai_key');
    var proxy = localStorage.getItem('rk_ai_proxy');
    var keyEl = document.getElementById('set-ai-key');
    var proxyEl = document.getElementById('set-ai-proxy');
    if (keyEl && key) keyEl.value = key;
    if (proxyEl && proxy) proxyEl.value = proxy;
    if (proxy) AI_PROXY_URL = proxy;
    // Update status
    var status = document.getElementById('ai-key-status');
    if (status) {
      if (key) {
        status.textContent = 'API key configured (' + key.substring(0, 7) + '...)';
        status.style.color = 'var(--green)';
      } else {
        status.textContent = 'No API key configured';
        status.style.color = 'var(--grey-mid)';
      }
    }
  } catch(e) {}
}

function toggleAiKeyVisibility() {
  var el = document.getElementById('set-ai-key');
  if (el) {
    el.type = el.type === 'password' ? 'text' : 'password';
  }
}

async function testAiKey() {
  var status = document.getElementById('ai-key-status');
  if (status) {
    status.textContent = 'Testing...';
    status.style.color = 'var(--gold)';
  }

  var key = document.getElementById('set-ai-key')?.value?.trim();
  if (!key) {
    if (status) { status.textContent = 'Enter an API key first'; status.style.color = 'var(--red)'; }
    return;
  }

  try {
    var res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 5
      })
    });

    if (res.ok) {
      if (status) { status.textContent = 'API key valid and working'; status.style.color = 'var(--green)'; }
    } else {
      var err = await res.json();
      if (status) { status.textContent = 'Error: ' + (err.error?.message || 'Invalid key'); status.style.color = 'var(--red)'; }
    }
  } catch(e) {
    if (status) { status.textContent = 'Connection error: ' + e.message; status.style.color = 'var(--red)'; }
  }
}

// ── INIT AGENT ON PAGE LOAD ───────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Auto-generate quote number
  var qnEl = document.getElementById('ag-quote-number');
  if (qnEl) qnEl.value = generateQuoteNumber();
  // Add one default section
  addAgentSection();
  // Load shared data
  loadSharedData();
  // Load AI settings
  loadAiSettings();
});
