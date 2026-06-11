/* ============================================================
   Age Standardization Dashboard — app.js  v2.1
   Teaching-focused rewrite: live formula substitution,
   population color-coding, preset age schemes, hide/show rows,
   split resets, one-level undo.
   ============================================================ */

'use strict';

/* ── State ── */
let method         = 'direct';
let ageGroups      = [];
let stdPop         = [];
let studyPop       = [];
let lastResult     = null;
let studyRateLabel = 'Rate per 1,000';
let prevState      = null;   // one-level undo snapshot

/* ── Age group presets ── */
const PRESETS = {
  who_abridged: {
    label: 'WHO abridged (default)',
    groups: ['0–4','5–14','15–24','25–34','35–44','45–54','55–64','65–74','75+'],
  },
  who_5yr: {
    label: 'WHO 5-year bands',
    groups: ['0–4','5–9','10–14','15–19','20–24','25–29','30–34','35–39',
             '40–44','45–49','50–54','55–59','60–64','65–69','70–74','75–79','80–84','85+'],
  },
  us_census: {
    label: 'US Census broad',
    groups: ['<18','18–44','45–64','65–74','75+'],
  },
  working_age: {
    label: 'Working-age focused',
    groups: ['<15','15–24','25–44','45–54','55–64','65+'],
  },
  custom: {
    label: 'Custom',
    groups: [],
  },
};

/* ── Default data (WHO abridged) ── */
const DEFAULTS = {
  direct: {
    stdPop:    [8000,10000,12000,11000,10000,8500,7000,5000,2500],
    studyRate: [2.1, 0.5,  1.2,  1.8,  4.1,  9.3, 22.0,48.5,95.0],
  },
  indirect: {
    stdRate:  [2.0, 0.4,  1.0,  1.5,  3.8,  8.5, 20.0,45.0,90.0],
    stdPop:   [8000,10000,12000,11000,10000,8500, 7000, 5000,2500],
    studyPop: [1200,1800, 2200, 2000, 1900, 1600, 1300, 900, 400],
    studyObs: 280,
  },
};

/* ── Hidden rows set ── */
let hiddenRows = new Set();

/* ============================================================
   Init
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  buildPresetDropdown();
  loadDefaults();
});

function buildPresetDropdown() {
  const sel = document.getElementById('preset-select');
  if (!sel) return;
  Object.entries(PRESETS).forEach(([key, p]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = p.label;
    sel.appendChild(opt);
  });
  sel.value = 'who_abridged';
  sel.addEventListener('change', () => applyPreset(sel.value));
}

/* ============================================================
   Method switching
   ============================================================ */
function setMethod(m) {
  saveUndo();
  method = m;
  document.getElementById('btn-direct').classList.toggle('active', m === 'direct');
  document.getElementById('btn-indirect').classList.toggle('active', m === 'indirect');
  loadDefaults();
}

/* ============================================================
   Presets
   ============================================================ */
function applyPreset(key) {
  if (key === 'custom') return; // let user type freely
  saveUndo();
  const groups = PRESETS[key].groups;
  const oldLen = ageGroups.length;
  ageGroups = [...groups];
  hiddenRows = new Set();

  // Resize data arrays — preserve existing values where possible, pad with zeros
  const newLen = groups.length;
  if (method === 'direct') {
    stdPop = Array.from({ length: newLen }, (_, i) =>
      i < oldLen ? stdPop[i] : { pop: 0, rate: 0 });
  } else {
    stdPop = Array.from({ length: newLen }, (_, i) =>
      i < oldLen ? stdPop[i] : { rate: 0, pop: 0 });
    studyPop = Array.from({ length: newLen }, (_, i) =>
      i < oldLen ? studyPop[i] : { pop: 0 });
  }
  clearError();
  clearResults();
  render();
}

/* ============================================================
   Load defaults
   ============================================================ */
function loadDefaults() {
  ageGroups = [...PRESETS.who_abridged.groups];
  hiddenRows = new Set();

  if (method === 'direct') {
    stdPop = DEFAULTS.direct.stdPop.map((n, i) => ({
      pop: n, rate: DEFAULTS.direct.studyRate[i],
    }));
    studyPop = [];
  } else {
    stdPop = DEFAULTS.indirect.stdRate.map((r, i) => ({
      rate: r, pop: DEFAULTS.indirect.stdPop[i],
    }));
    studyPop = DEFAULTS.indirect.studyPop.map(n => ({ pop: n }));
  }

  const sel = document.getElementById('preset-select');
  if (sel) sel.value = 'who_abridged';

  render();
  clearError();
  clearResults();
}

function resetAgeGroupsOnly() {
  saveUndo();
  const sel = document.getElementById('preset-select');
  const key = sel ? sel.value : 'who_abridged';
  if (key === 'custom') return;
  applyPreset(key);
}

/* ============================================================
   Undo
   ============================================================ */
function saveUndo() {
  prevState = {
    method,
    ageGroups: JSON.parse(JSON.stringify(ageGroups)),
    stdPop:    JSON.parse(JSON.stringify(stdPop)),
    studyPop:  JSON.parse(JSON.stringify(studyPop)),
    hiddenRows: new Set(hiddenRows),
    studyRateLabel,
  };
  document.getElementById('undo-btn').disabled = false;
}

function undo() {
  if (!prevState) return;
  method         = prevState.method;
  ageGroups      = prevState.ageGroups;
  stdPop         = prevState.stdPop;
  studyPop       = prevState.studyPop;
  hiddenRows     = prevState.hiddenRows;
  studyRateLabel = prevState.studyRateLabel;
  prevState      = null;
  document.getElementById('undo-btn').disabled = true;
  document.getElementById('btn-direct').classList.toggle('active', method === 'direct');
  document.getElementById('btn-indirect').classList.toggle('active', method === 'indirect');
  clearError();
  clearResults();
  render();
}

/* ============================================================
   Add / remove / toggle age groups
   ============================================================ */
function addAgeGroup() {
  saveUndo();
  ageGroups.push('');
  if (method === 'direct') {
    stdPop.push({ pop: 0, rate: 0 });
  } else {
    stdPop.push({ rate: 0, pop: 0 });
    studyPop.push({ pop: 0 });
  }
  const sel = document.getElementById('preset-select');
  if (sel) sel.value = 'custom';
  render();
}

function removeAgeGroup(i) {
  saveUndo();
  ageGroups.splice(i, 1);
  stdPop.splice(i, 1);
  hiddenRows.delete(i);
  // re-index hiddenRows
  const newHidden = new Set();
  hiddenRows.forEach(r => { if (r > i) newHidden.add(r - 1); else if (r < i) newHidden.add(r); });
  hiddenRows = newHidden;
  if (method === 'indirect') studyPop.splice(i, 1);
  render();
}

function toggleHideRow(i) {
  saveUndo();
  if (hiddenRows.has(i)) hiddenRows.delete(i);
  else hiddenRows.add(i);
  render();
}

/* ============================================================
   Render
   ============================================================ */
function render() {
  renderAgeGroupList();
  if (method === 'direct') renderDirectTables();
  else                      renderIndirectTables();
  updateHiddenCount();
}

function updateHiddenCount() {
  const badge = document.getElementById('hidden-count');
  if (!badge) return;
  const n = hiddenRows.size;
  badge.textContent = n > 0 ? `${n} hidden` : '';
  badge.style.display = n > 0 ? 'inline-block' : 'none';
}

function renderAgeGroupList() {
  const el = document.getElementById('ag-list');
  let html = `<div class="ag-header-row" style="grid-template-columns:1fr 58px">
    <span>Label</span><span style="text-align:center">Actions</span>
  </div>`;
  ageGroups.forEach((ag, i) => {
    const hidden = hiddenRows.has(i);
    html += `
      <div class="ag-row${hidden ? ' ag-row-hidden' : ''}" style="grid-template-columns:1fr 58px">
        <input type="text" value="${escHtml(ag)}"
               onchange="ageGroups[${i}]=this.value; render()"
               placeholder="e.g. 25–34"
               ${hidden ? 'style="opacity:0.4"' : ''} />
        <div style="display:flex;gap:3px;justify-content:center">
          <button class="btn-icon${hidden ? ' btn-icon-muted' : ''}"
                  onclick="toggleHideRow(${i})"
                  title="${hidden ? 'Show row' : 'Hide row (exclude from computation)'}">
            ${hidden ? eyeOffIcon() : eyeIcon()}
          </button>
          <button class="btn-icon btn-icon-danger"
                  onclick="removeAgeGroup(${i})"
                  title="Delete row">✕</button>
        </div>
      </div>`;
  });
  el.innerHTML = html;
}

function eyeIcon() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}
function eyeOffIcon() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

function renderDirectTables() {
  document.getElementById('std-pop-section').style.display = 'block';
  document.getElementById('study-pop-section').style.display = 'none';
  document.getElementById('method-desc').innerHTML =
    `<div class="method-plain">
      <strong>What this does:</strong> Direct standardization asks — <em>"If the study population had the same age structure as the standard population, what would its overall rate be?"</em>
      It applies the study population's age-specific rates to the standard population's age distribution to produce a single comparable rate.
    </div>`;

  const el = document.getElementById('std-pop-table');
  const safeLabel = escHtml(studyRateLabel || 'Rate per 1,000');
  let html = `
    <div class="rate-label-row">
      <label class="rate-label-text">Rate label:</label>
      <input type="text" id="rate-label-input" value="${safeLabel}"
             oninput="studyRateLabel=this.value; document.getElementById('rate-col-header').textContent=this.value||'Rate per 1,000'"
             placeholder="e.g. ASMR, CMR, Incidence rate"
             class="rate-label-input" />
    </div>
    <div class="ag-header-row table-header-direct" style="grid-template-columns:80px 1fr 1fr">
      <span>Age group</span>
      <span class="col-std">Std pop (N)<span class="pop-badge pop-badge-std">standard</span></span>
      <span class="col-study"><span id="rate-col-header">${safeLabel}</span><span class="pop-badge pop-badge-study">study pop</span></span>
    </div>`;
  ageGroups.forEach((ag, i) => {
    if (hiddenRows.has(i)) return;
    html += `
      <div class="ag-row" style="grid-template-columns:80px 1fr 1fr">
        <input class="readonly" type="text" value="${escHtml(ag)}" readonly />
        <input type="number" min="0" value="${stdPop[i]?.pop ?? 0}"
               onchange="stdPop[${i}].pop=+this.value" class="input-std"/>
        <input type="number" min="0" step="0.01" value="${stdPop[i]?.rate ?? 0}"
               onchange="stdPop[${i}].rate=+this.value" class="input-study"/>
      </div>`;
  });
  el.innerHTML = html;
}

function renderIndirectTables() {
  document.getElementById('study-pop-section').style.display = 'block';
  document.getElementById('method-desc').innerHTML =
    `<div class="method-plain">
      <strong>What this does:</strong> Indirect standardization asks — <em>"How many events would we expect in the study population if it experienced the same age-specific rates as the standard population?"</em>
      The SMR (Standardized Mortality/Morbidity Ratio) compares what actually happened to what was expected.
    </div>`;

  const el = document.getElementById('std-pop-table');
  const safeLabelInd = escHtml(studyRateLabel || 'Rate per 1,000');
  let html = `
    <div class="rate-label-row">
      <label class="rate-label-text">Rate label:</label>
      <input type="text" id="rate-label-input-ind" value="${safeLabelInd}"
             oninput="studyRateLabel=this.value; document.getElementById('rate-col-header-ind').textContent=this.value||'Rate per 1,000'"
             placeholder="e.g. ASMR, CMR, Incidence rate"
             class="rate-label-input" />
    </div>
    <div class="ag-header-row" style="grid-template-columns:80px 1fr 1fr">
      <span>Age group</span>
      <span class="col-std"><span id="rate-col-header-ind">${safeLabelInd}</span><span class="pop-badge pop-badge-std">standard</span></span>
      <span class="col-std">Pop (N)<span class="pop-badge pop-badge-std">standard</span></span>
    </div>`;
  ageGroups.forEach((ag, i) => {
    if (hiddenRows.has(i)) return;
    html += `
      <div class="ag-row" style="grid-template-columns:80px 1fr 1fr">
        <input class="readonly" type="text" value="${escHtml(ag)}" readonly />
        <input type="number" min="0" step="0.01" value="${stdPop[i]?.rate ?? 0}"
               onchange="stdPop[${i}].rate=+this.value" class="input-std"/>
        <input type="number" min="0" value="${stdPop[i]?.pop ?? 0}"
               onchange="stdPop[${i}].pop=+this.value" class="input-std"/>
      </div>`;
  });
  el.innerHTML = html;

  const el2 = document.getElementById('study-pop-table');
  let html2 = `
    <div class="ag-header-row" style="grid-template-columns:80px 1fr">
      <span>Age group</span>
      <span class="col-study">Pop (N)<span class="pop-badge pop-badge-study">study pop</span></span>
    </div>`;
  ageGroups.forEach((ag, i) => {
    if (hiddenRows.has(i)) return;
    html2 += `
      <div class="ag-row" style="grid-template-columns:80px 1fr">
        <input class="readonly" type="text" value="${escHtml(ag)}" readonly />
        <input type="number" min="0" value="${studyPop[i]?.pop ?? 0}"
               onchange="studyPop[${i}].pop=+this.value" class="input-study"/>
      </div>`;
  });
  html2 += `
    <div class="obs-block">
      <div class="section-label">Observed events in study population (total)</div>
      <input type="number" id="indirect-obs-val" class="obs-input"
             min="0" value="${DEFAULTS.indirect.studyObs}" />
    </div>`;
  el2.innerHTML = html2;
}

/* ============================================================
   Compute
   ============================================================ */
function compute() {
  clearError();
  const activeGroups = ageGroups.filter((_, i) => !hiddenRows.has(i));
  const n = activeGroups.length;
  if (n < 2)                              return showError('Please enable at least 2 age groups before computing.');
  if (activeGroups.some(ag => !ag.trim())) return showError('Please label all visible age groups before computing.');
  if (method === 'direct') computeDirect();
  else                      computeIndirect();
}

/* ── Direct ── */
function computeDirect() {
  const activeIndices = ageGroups.map((_, i) => i).filter(i => !hiddenRows.has(i));
  const activeRows = activeIndices.map(i => ({
    ag:   ageGroups[i],
    pop:  +stdPop[i]?.pop  || 0,
    rate: +stdPop[i]?.rate || 0,
  }));
  const n = activeRows.length;

  const stdTotalPop = activeRows.reduce((s, r) => s + r.pop, 0);
  if (stdTotalPop <= 0)
    return showError('Standard population totals to zero. Please check your entries.');

  let rows = [], weightedRateSum = 0, totalExpected = 0;
  activeRows.forEach(r => {
    const weight   = r.pop / stdTotalPop;
    const expected = (r.rate / 1000) * r.pop;
    weightedRateSum += weight * r.rate;
    totalExpected   += expected;
    rows.push({ ...r, weight, expected });
  });

  const crudeRate = activeRows.reduce((s, r) => s + r.rate, 0) / n;
  const stdRate   = weightedRateSum;
  const rateColName = studyRateLabel || 'Rate per 1,000';

  // Build live formula substitution
  const formulaSteps = buildDirectFormula(rows, stdTotalPop, stdRate, rateColName);

  const tableHead = `<tr>
    <th>Age group</th>
    <th class="th-std">Std pop (N)<span class="th-badge th-badge-std">standard</span></th>
    <th class="th-study">${escHtml(rateColName)}<span class="th-badge th-badge-study">study pop</span></th>
    <th class="th-std">Weight (wᵢ)<span class="th-badge th-badge-std">standard</span></th>
    <th>Expected events</th>
  </tr>`;

  const tableBody = rows.map(r => `
    <tr>
      <td>${escHtml(r.ag)}</td>
      <td class="num td-std">${r.pop.toLocaleString()}</td>
      <td class="num td-study">${r.rate.toFixed(2)}</td>
      <td class="num td-std">${(r.weight * 100).toFixed(1)}%</td>
      <td class="num">${r.expected.toFixed(1)}</td>
    </tr>`).join('');

  const interpretation =
    `The directly age-standardized rate is <strong>${stdRate.toFixed(2)} per 1,000</strong> ` +
    `(standard population N = ${stdTotalPop.toLocaleString()}). ` +
    `The unweighted mean crude rate across age groups was ${crudeRate.toFixed(2)} per 1,000. ` +
    `Total expected events in the standard population: ${totalExpected.toFixed(1)}. ` +
    `<br><br>To compare two populations, compute a standardized rate for each using the <em>same</em> standard population — the difference is then free of age confounding.`;

  presentResults({
    title: 'Direct standardization results',
    metrics: [
      { label: 'Standardized rate',     value: stdRate.toFixed(2),           unit: 'per 1,000',  color: 'neutral' },
      { label: 'Crude (mean) rate',     value: crudeRate.toFixed(2),         unit: 'per 1,000 · study pop', color: 'study' },
      { label: 'Standard pop (N)',      value: stdTotalPop.toLocaleString(), unit: 'total · standard',      color: 'std'   },
      { label: 'Total expected events', value: totalExpected.toFixed(1),     unit: 'events',     color: 'neutral' },
    ],
    tableHead, tableBody, formulaSteps, rateColName,
    interpretation, method: 'direct',
    rows, stdRate, stdTotalPop, totalExpected, crudeRate,
  });
}

/* ── Indirect ── */
function computeIndirect() {
  const obs = +(document.getElementById('indirect-obs-val')?.value || 0);
  if (obs <= 0) return showError('Observed events must be greater than 0.');

  const activeIndices = ageGroups.map((_, i) => i).filter(i => !hiddenRows.has(i));
  let expected = 0, rows = [];

  activeIndices.forEach(i => {
    const stdRate = +stdPop[i]?.rate || 0;
    const stdPopN = +stdPop[i]?.pop  || 0;
    const studyN  = +studyPop[i]?.pop || 0;
    const exp     = (stdRate / 1000) * studyN;
    expected += exp;
    rows.push({ ag: ageGroups[i], stdRate, stdPopN, studyN, exp });
  });

  if (expected <= 0)
    return showError('Expected events total to zero. Check standard rates and study population sizes.');

  const smr             = obs / expected;
  const n               = rows.length;
  const stdCrudeRate    = rows.reduce((s, r) => s + r.stdRate, 0) / n;
  const indirectStdRate = smr * stdCrudeRate;

  /* Byar's 95% CI */
  const ciLow  = smr * Math.pow(1 - 1/(9*obs)       - 1.96/(3*Math.sqrt(obs)),     3);
  const ciHigh = smr * Math.pow(1 - 1/(9*(obs+1))   + 1.96/(3*Math.sqrt(obs+1)),   3);

  const formulaSteps = buildIndirectFormula(rows, obs, expected, smr, stdCrudeRate, indirectStdRate, ciLow, ciHigh);

  const tableHead = `<tr>
    <th>Age group</th>
    <th class="th-std">${escHtml(studyRateLabel||'Rate per 1,000')}<span class="th-badge th-badge-std">standard</span></th>
    <th class="th-study">Pop (N)<span class="th-badge th-badge-study">study pop</span></th>
    <th>Expected events</th>
  </tr>`;

  const tableBody = rows.map(r => `
    <tr>
      <td>${escHtml(r.ag)}</td>
      <td class="num td-std">${r.stdRate.toFixed(2)}</td>
      <td class="num td-study">${r.studyN.toLocaleString()}</td>
      <td class="num">${r.exp.toFixed(2)}</td>
    </tr>`).join('');

  const dir = smr > 1 ? 'higher' : smr < 1 ? 'lower' : 'the same as';
  const pct = Math.abs((smr - 1) * 100).toFixed(1);
  const interpretation = smr === 1
    ? `SMR = <strong>1.000</strong> — the study population experienced exactly as many events as expected under the standard rates.`
    : `SMR = <strong>${smr.toFixed(3)}</strong>: the study population experienced <strong>${pct}% ${dir}</strong> events than expected if it had the same age-specific rates as the standard population. ` +
      `(Observed = ${obs}, Expected = ${expected.toFixed(1)}.) ` +
      `Approximate 95% CI (Byar's method): ${Math.max(0,ciLow).toFixed(3)} – ${ciHigh.toFixed(3)}.` +
      `<br><br>An SMR > 1 suggests excess risk in the study population; SMR < 1 suggests a protective or healthy-worker effect.`;

  presentResults({
    title: 'Indirect standardization results (SMR)',
    metrics: [
      { label: 'SMR',                  value: smr.toFixed(3),             unit: 'Obs ÷ Exp',       color: smr > 1 ? 'warn' : 'neutral' },
      { label: 'Observed events',      value: obs.toLocaleString(),       unit: 'study pop · total', color: 'study' },
      { label: 'Expected events',      value: expected.toFixed(1),        unit: 'standard · total',  color: 'std'   },
      { label: 'Indirect std. rate',   value: indirectStdRate.toFixed(2), unit: 'per 1,000',         color: 'neutral' },
    ],
    tableHead, tableBody, formulaSteps, rateColName: studyRateLabel || 'Rate per 1,000',
    interpretation, method: 'indirect',
    rows, smr, obs, expected, indirectStdRate, ciLow, ciHigh,
  });
}

/* ============================================================
   Live formula builders
   ============================================================ */
function buildDirectFormula(rows, stdTotalPop, stdRate, rateLabel) {
  // Step 1: weights
  const wTerms = rows.slice(0, 3).map(r =>
    `  w(${escHtml(r.ag)}) = ${r.pop.toLocaleString()} ÷ ${stdTotalPop.toLocaleString()} = <strong>${(r.weight*100).toFixed(1)}%</strong>`
  ).join('\n');
  const wEllipsis = rows.length > 3 ? `\n  … (${rows.length} groups total)` : '';

  // Step 2: weighted rates
  const wrTerms = rows.slice(0, 3).map(r =>
    `  ${(r.weight*100).toFixed(1)}% × ${r.rate.toFixed(2)} = <strong>${(r.weight*r.rate).toFixed(3)}</strong>`
  ).join('\n');

  return [
    {
      step: 1,
      title: 'Compute weights (wᵢ) from the standard population',
      formula: 'wᵢ = (standard pop in group i) ÷ (total standard pop)',
      substitution: wTerms + wEllipsis,
    },
    {
      step: 2,
      title: 'Multiply each weight by the study population\'s age-specific rate (rᵢ)',
      formula: `wᵢ × rᵢ  where rᵢ = ${escHtml(rateLabel)} in the study population`,
      substitution: wrTerms + wEllipsis,
    },
    {
      step: 3,
      title: 'Sum all weighted rates → Age-Standardized Rate',
      formula: 'ASMR = Σ (wᵢ × rᵢ)',
      substitution: `  = <strong>${stdRate.toFixed(2)} per 1,000</strong>`,
    },
  ];
}

function buildIndirectFormula(rows, obs, expected, smr, stdCrudeRate, indirectStdRate, ciLow, ciHigh) {
  const expTerms = rows.slice(0, 3).map(r =>
    `  (${r.stdRate.toFixed(2)} ÷ 1,000) × ${r.studyN.toLocaleString()} = <strong>${r.exp.toFixed(2)}</strong>`
  ).join('\n');
  const ellipsis = rows.length > 3 ? `\n  … (${rows.length} groups total)` : '';

  return [
    {
      step: 1,
      title: 'Compute expected events per age group',
      formula: 'Expected events (group i) = (standard rate ÷ 1,000) × study pop (N)',
      substitution: expTerms + ellipsis,
    },
    {
      step: 2,
      title: 'Sum expected events across all groups',
      formula: 'E = Σ expected events',
      substitution: `  = <strong>${expected.toFixed(2)}</strong> expected events`,
    },
    {
      step: 3,
      title: 'Compute SMR',
      formula: 'SMR = Observed ÷ Expected',
      substitution: `  = ${obs} ÷ ${expected.toFixed(2)} = <strong>${smr.toFixed(3)}</strong>`,
    },
    {
      step: 4,
      title: 'Byar\'s 95% confidence interval for SMR',
      formula: 'CI: SMR × (1 − 1/(9O) ∓ 1.96/3√O)³  where O = observed events',
      substitution: `  Lower: <strong>${Math.max(0,ciLow).toFixed(3)}</strong> · Upper: <strong>${ciHigh.toFixed(3)}</strong>`,
    },
  ];
}

/* ============================================================
   Render results panel
   ============================================================ */
function presentResults(data) {
  lastResult = data;
  clearResults();
  document.getElementById('empty-state').style.display = 'none';

  const el = document.getElementById('results');
  el.style.display = 'block';

  const metrics = data.metrics.map(m => `
    <div class="metric-card metric-card-${m.color || 'neutral'}">
      <div class="metric-label">${m.label}</div>
      <div class="metric-value">${m.value}</div>
      <div class="metric-unit">${m.unit}</div>
    </div>`).join('');

  const formulaHTML = data.formulaSteps.map(s => `
    <div class="formula-step">
      <div class="formula-step-header">
        <span class="formula-step-num">Step ${s.step}</span>
        <span class="formula-step-title">${s.title}</span>
      </div>
      <div class="formula-eq">${s.formula}</div>
      <pre class="formula-sub">${s.substitution}</pre>
    </div>`).join('');

  const smrClass = (data.method === 'indirect' && data.smr && data.smr > 1) ? ' warn' : '';

  el.innerHTML = `
    <div class="result-section">
      <div class="result-title">${data.title}</div>

      <div class="metric-grid">${metrics}</div>

      <div class="formula-block">
        <div class="formula-block-label">Step-by-step computation</div>
        ${formulaHTML}
      </div>

      <div class="table-wrap">
        <table class="result-table">
          <thead>${data.tableHead}</thead>
          <tbody>${data.tableBody}</tbody>
        </table>
      </div>

      <div class="interpretation-box${smrClass}">${data.interpretation}</div>

      <div class="download-bar">
        <button class="dl-btn" onclick="downloadCSV()">⬇ CSV</button>
        <button class="dl-btn" onclick="downloadTXT()">⬇ TXT report</button>
        <button class="dl-btn" onclick="downloadHTML()">⬇ HTML report</button>
      </div>
    </div>`;
}

/* ============================================================
   Downloads  (unchanged logic, updated column names)
   ============================================================ */
function buildTXTReport() {
  if (!lastResult) return '';
  const d   = lastResult;
  const sep  = '='.repeat(60);
  const sep2 = '-'.repeat(40);
  let lines  = [sep, 'AGE STANDARDIZATION REPORT', sep, ''];

  lines.push('Method: ' + (d.method === 'direct'
    ? 'Direct standardization'
    : 'Indirect standardization (SMR)'));
  lines.push('');
  lines.push('KEY RESULTS');
  lines.push(sep2);
  d.metrics.forEach(m => lines.push(`  ${m.label}: ${m.value} ${m.unit}`));
  lines.push('');
  lines.push('COMPUTATION STEPS');
  lines.push(sep2);
  d.formulaSteps.forEach(s => {
    lines.push(`Step ${s.step}: ${s.title}`);
    lines.push(`  Formula: ${s.formula}`);
    lines.push(s.substitution.replace(/<[^>]+>/g,''));
    lines.push('');
  });
  lines.push('AGE-GROUP TABLE');
  lines.push(sep2);
  if (d.method === 'direct') {
    const rc = d.rateColName || 'Rate per 1,000';
    lines.push(`Age group    | Std pop (N) [standard] | ${rc} [study pop] | Weight   | Expected`);
    d.rows.forEach(r => lines.push(
      `${pad(r.ag,12)} | ${pad(r.pop,23)} | ${pad(r.rate.toFixed(2),18)} | ${pad((r.weight*100).toFixed(1)+'%',8)} | ${r.expected.toFixed(1)}`
    ));
  } else {
    const rc = d.rateColName || 'Rate per 1,000';
    lines.push(`Age group    | ${rc} [standard] | Study pop (N) [study pop] | Expected`);
    d.rows.forEach(r => lines.push(
      `${pad(r.ag,12)} | ${pad(r.stdRate.toFixed(2),16)} | ${pad(r.studyN,25)} | ${r.exp.toFixed(2)}`
    ));
  }
  lines.push('');
  lines.push('INTERPRETATION');
  lines.push(sep2);
  lines.push(d.interpretation.replace(/<[^>]+>/g, ''));
  lines.push('');
  lines.push('Generated by Age Standardization Dashboard');
  lines.push('https://rajsubediresearch.github.io/age-standardization-dashboard');
  return lines.join('\n');
}

function downloadTXT() {
  const txt = buildTXTReport();
  triggerDownload('data:text/plain;charset=utf-8,' + encodeURIComponent(txt),
    'age_standardization_report.txt');
}

function downloadCSV() {
  if (!lastResult) return;
  const d = lastResult;
  let rows = [];
  if (d.method === 'direct') {
    const rc = d.rateColName || 'Rate per 1,000';
    rows.push(['Age group','Std pop (N) [standard]', rc+' [study pop]','Weight (%)','Expected events']);
    d.rows.forEach(r => rows.push([r.ag, r.pop, r.rate.toFixed(2), (r.weight*100).toFixed(1), r.expected.toFixed(1)]));
    rows.push([]);
    rows.push(['Standardized rate (per 1,000)', d.metrics[0].value]);
    rows.push(['Crude mean rate (per 1,000)',   d.metrics[1].value]);
    rows.push(['Standard population (N)',       d.metrics[2].value]);
    rows.push(['Total expected events',         d.metrics[3].value]);
  } else {
    const rc = d.rateColName || 'Rate per 1,000';
    rows.push(['Age group', rc+' [standard]', 'Pop N [study pop]','Expected events']);
    d.rows.forEach(r => rows.push([r.ag, r.stdRate.toFixed(2), r.studyN, r.exp.toFixed(2)]));
    rows.push([]);
    rows.push(['SMR',                           d.metrics[0].value]);
    rows.push(['Observed events',               d.metrics[1].value]);
    rows.push(['Expected events',               d.metrics[2].value]);
    rows.push(['Indirect std. rate (per 1,000)',d.metrics[3].value]);
    rows.push(['95% CI lower (Byar)',           d.ciLow  != null ? Math.max(0,d.ciLow).toFixed(3)  : '']);
    rows.push(['95% CI upper (Byar)',           d.ciHigh != null ? d.ciHigh.toFixed(3)              : '']);
  }
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  triggerDownload('data:text/csv;charset=utf-8,' + encodeURIComponent(csv),
    'age_standardization_results.csv');
}

function downloadHTML() {
  if (!lastResult) return;
  const d = lastResult;
  const stepsHTML = d.formulaSteps.map(s => `
    <div style="margin-bottom:14px;padding:10px 14px;background:#f8f8f5;border-left:3px solid #2563eb;border-radius:0 6px 6px 0">
      <div style="font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px">Step ${s.step} — ${s.title}</div>
      <div style="font-size:13px;margin-bottom:6px;color:#333">${s.formula}</div>
      <pre style="font-size:12px;margin:0;font-family:'Fira Code',monospace;white-space:pre-wrap">${s.substitution.replace(/<[^>]+>/g,'')}</pre>
    </div>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>Age Standardization Report</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:820px;margin:40px auto;padding:0 24px;color:#1a1917;background:#fff}
  h1{font-size:22px;font-weight:600;margin-bottom:4px}
  .sub{color:#666;font-size:13px;margin-bottom:24px}
  h2{font-size:15px;font-weight:600;margin:24px 0 10px;padding-bottom:6px;border-bottom:1px solid #e5e5e5}
  .metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
  @media(max-width:600px){.metric-grid{grid-template-columns:1fr 1fr}}
  .metric-card{background:#f9f9f6;border:1px solid #e5e3dc;border-radius:8px;padding:12px}
  .metric-label{font-size:10px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px}
  .metric-value{font-size:22px;font-weight:600}
  .metric-unit{font-size:11px;color:#999;margin-top:2px}
  table{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:16px}
  th{background:#f9f9f6;padding:7px 10px;text-align:left;font-size:10px;font-weight:600;color:#666;text-transform:uppercase;border-bottom:1px solid #e5e5e5}
  td{padding:7px 10px;border-bottom:1px solid #f0f0f0}
  .th-std{background:#eff6ff;color:#1d4ed8}
  .th-study{background:#fff7ed;color:#c2410c}
  .interp{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 14px;font-size:13px;color:#166534;line-height:1.65}
  .interp.warn{background:#fffbeb;border-color:#fcd34d;color:#92400e}
  footer{margin-top:40px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:14px}
</style></head><body>
<h1>Age Standardization Report</h1>
<p class="sub">Method: ${d.method === 'direct' ? 'Direct standardization' : 'Indirect standardization (SMR)'}</p>
<h2>Key results</h2>
<div class="metric-grid">
  ${d.metrics.map(m => `<div class="metric-card"><div class="metric-label">${m.label}</div><div class="metric-value">${m.value}</div><div class="metric-unit">${m.unit}</div></div>`).join('')}
</div>
<h2>Step-by-step computation</h2>
${stepsHTML}
<h2>Age-group table</h2>
<table><thead>${d.tableHead}</thead><tbody>${d.tableBody}</tbody></table>
<h2>Interpretation</h2>
<div class="interp${(d.method==='indirect'&&d.smr>1)?' warn':''}">${d.interpretation}</div>
<footer>Generated by Age Standardization Dashboard — open source, educational use only.<br>
https://rajsubediresearch.github.io/age-standardization-dashboard</footer>
</body></html>`;

  triggerDownload('data:text/html;charset=utf-8,' + encodeURIComponent(html),
    'age_standardization_report.html');
}

/* ============================================================
   Utilities
   ============================================================ */
function triggerDownload(dataUri, filename) {
  const a = document.createElement('a');
  a.href = dataUri; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg; el.style.display = 'block';
}
function clearError() { document.getElementById('error-msg').style.display = 'none'; }
function clearResults() {
  const el = document.getElementById('results');
  el.innerHTML = ''; el.style.display = 'none';
  document.getElementById('empty-state').style.display = 'flex';
}
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function pad(val, len) { return String(val).padEnd(len); }
