// ═══════════════════════════════════════════════════════════
// RENDER KING — AI AGENT (GUIDED JOB CAPTURE FORM)
// Voice-to-text, smart defaults, auto-populate quote + calc
// ═══════════════════════════════════════════════════════════

// ── AGENT SECTION MANAGEMENT ──────────────────────────────
var agentSectionCount = 0;
var agentFiles = [];

function addAgentSection(defaults) {
  agentSectionCount++;
  var id = agentSectionCount;
  var d = defaults || {};

  var subOptions = '';
  var subKeys = {
    'brick_hebel':   'Brick / Hebel',
    'eps_blueboard': 'EPS / Blueboard',
    'specialty':     'Specialty / Architectural',
    'hebel_supply':  'Hebel Supply + Install',
    'hebel_full':    'Full Hebel System (Supply+Install+Render)',
    'eps_supply':    'EPS Supply + Install',
    'eps_full':      'Full EPS System (Supply+Install+Render)',
    'slab_build':    'Slab Build (Linear Metre)'
  };

  Object.keys(subKeys).forEach(function(key) {
    var sel = (key === (d.substrate || 'brick_hebel')) ? ' selected' : '';
    subOptions += '<option value="' + key + '"' + sel + '>' + subKeys[key] + '</option>';
  });

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
    // Convert spoken email to actual email
    var e = text.toLowerCase().trim();
    e = e.replace(/\s+at\s+/gi, '@');
    e = e.replace(/\s+dot\s+/gi, '.');
    e = e.replace(/\s+/g, '');
    return e;
  }

  if (type === 'phone') {
    // Strip non-numeric, format as XXXX XXX XXX
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
  // Reset the input so the same file can be re-selected
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

  // ── POPULATE QUOTE GENERATOR ────────────────────────────
  // Set quote number
  var qnEl = document.getElementById('q-quote-number');
  if (qnEl) qnEl.textContent = quoteNum;

  // Set validity
  var validitySelect = document.getElementById('q-validity-select');
  if (validitySelect) {
    validitySelect.value = validity;
    updateQuoteValidity();
  }

  // Set builder type
  var btSelect = document.getElementById('q-builder-type');
  if (btSelect) btSelect.value = builderType;

  // Set client details (contenteditable fields)
  var clientFields = document.querySelectorAll('#tab-quote .section:first-child .field-val');
  if (clientFields.length >= 8) {
    clientFields[0].textContent = clientName;       // Client/Company Name
    clientFields[1].textContent = siteContact;      // Contact Name
    clientFields[2].textContent = phone;            // Phone
    clientFields[3].textContent = email;            // Email
    clientFields[4].textContent = address;          // Site Address
    clientFields[5].textContent = '';               // Lot/Plan - leave blank
    clientFields[6].textContent = quoteNum;         // Work Contract / PO
    clientFields[7].textContent = builderName;      // Builder Reference
  }

  // Set scope of work
  var scopeFields = document.querySelectorAll('#tab-quote .doc-body .section');
  if (scopeFields.length >= 2) {
    var scopeSection = scopeFields[1]; // Section 2: Scope of Work
    var scopeDesc = scopeSection.querySelector('.field-val.tall');
    if (scopeDesc) scopeDesc.textContent = scope;

    // Set substrate type and difficulty level
    var scopeFieldVals = scopeSection.querySelectorAll('.g2 .field-val');
    if (scopeFieldVals.length >= 2) {
      // Build a combined substrate/difficulty description from all sections
      var subNames = [];
      sections.forEach(function(s) {
        var subKey = s.substrate;
        var subName = {
          'brick_hebel': 'Brick/Hebel',
          'eps_blueboard': 'EPS/Blueboard',
          'specialty': 'Specialty/Architectural',
          'hebel_supply': 'Hebel Supply + Install',
          'hebel_full': 'Full Hebel System',
          'eps_supply': 'EPS Supply + Install',
          'eps_full': 'Full EPS System',
          'slab_build': 'Slab Build'
        }[subKey] || subKey;
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

  // Clear existing pricing lines and add new ones from sections
  var pricingBody = document.getElementById('q-pricing-body');
  if (pricingBody) pricingBody.innerHTML = '';
  quoteLineId = 0;

  sections.forEach(function(s) {
    var subRate = getSubstrateBaseRate(s.substrate);
    var diffAddon = getDiffAddon(s.difficulty);
    var sellRate = subRate + diffAddon;

    // Check volume builder floor
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
  // Clear existing surface lines
  var surfaceLines = document.getElementById('surface-lines');
  if (surfaceLines) surfaceLines.innerHTML = '';
  lineCount = 0;

  // Add each section as a surface line
  sections.forEach(function(s) {
    addSurfaceLine(s.substrate, s.difficulty);
    // Set the qty and texture for the newly added line
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

  // Trigger recalc
  recalc();

  // ── SHOW SUCCESS & SWITCH TAB ───────────────────────────
  // Show success banner in agent tab
  var banner = document.getElementById('agent-success-banner');
  if (banner) {
    banner.style.display = 'block';
    setTimeout(function() { banner.style.display = 'none'; }, 8000);
  }

  // Switch to Quote Generator tab
  switchTab('quote');
  window.scrollTo(0, 0);
}

// ── CLEAR AGENT FORM ──────────────────────────────────────
function clearAgentForm() {
  if (!confirm('Clear all agent form data? This cannot be undone.')) return;

  // Clear client fields
  ['ag-client-name','ag-phone','ag-email','ag-address','ag-site-contact','ag-builder-name'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var btEl = document.getElementById('ag-builder-type');
  if (btEl) btEl.value = 'standard';

  // Clear job details
  ['ag-colour','ag-duration','ag-scope'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var dateEl = document.getElementById('ag-start-date');
  if (dateEl) dateEl.value = '';

  // Clear sections
  document.getElementById('ag-sections-wrap').innerHTML = '';
  agentSectionCount = 0;
  addAgentSection(); // Add one default section

  // Clear files
  agentFiles = [];
  renderAgentFileList();

  // Reset quote settings
  document.getElementById('ag-quote-number').value = '';
  document.getElementById('ag-prepared-by').value = 'King Mannion';
  document.getElementById('ag-validity').value = '48';

  // Hide success banner
  var banner = document.getElementById('agent-success-banner');
  if (banner) banner.style.display = 'none';
}

// ── INIT AGENT ON PAGE LOAD ───────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Auto-generate quote number
  document.getElementById('ag-quote-number').value = generateQuoteNumber();
  // Add one default section
  addAgentSection();
});
