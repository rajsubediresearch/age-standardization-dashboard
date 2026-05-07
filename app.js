/* ============================================================
   Age Standardization Dashboard — app.js
   ============================================================ */

'use strict';

/* ── State ── */
let method          = 'direct';
let ageGroups       = [];
let stdPop          = [];   // direct: [{pop, rate}]  |  indirect: [{rate, pop}]
let studyPop        = [];   // indirect only: [{pop}]
let lastResult      = null;
let studyRateLabel  = 'ASMR';   // editable by user — shown as column header

/* ── Default data ── */
const DEFAULT_AGE_GROUPS = ['0–4','5–14','15–24','25–34','35–44','45–54','55–64','65–74','75+'];

const DEFAULTS = {
  direct: {
    stdPop:    [8000, 10000, 12000, 11000, 10000, 8500, 7000, 5000, 2500],
    studyRate: [2.1,  0.5,   1.2,   1.8,   4.1,   9.3,  22.0, 48.5, 95.0],
  },
  indirect: {
    stdRate:   [2.0,  0.4,   1.0,   1.5,   3.8,   8.5,  20.0, 45.0, 90.0],
    stdPop:    [8000, 10000, 12000, 11000, 10000, 8500,  7000,  5000, 2500],
    studyPop:  [1200, 1800,  2200,  2000,  1900,  1600,  1300,  900,  400],
    studyObs:  280,
  },
};

/* ── Initialise ── */
document.addEventListener('DOMContentLoaded', function () {
  loadDefaults();
});

/* ============================================================
   Method switching
   ============================================================ */
function setMethod(m) {
  method = m;
  document.getElementById('btn-direct').classList.toggle('active', m === 'direct');
  document.getElementById('btn-indirect').classList.toggle('active', m === 'indirect');
  loadDefaults();
}

/* ============================================================
   Load default data
   ============================================================ */
function loadDefaults() {
  ageGroups = [...DEFAULT_AGE_GROUPS];

  if (method === 'direct') {
    stdPop = DEFAULTS.direct.stdPop.map((n, i) => ({
      pop:  n,
      rate: DEFAULTS.direct.studyRate[i],
    }));
    studyPop = [];
  } else {
    stdPop = DEFAULTS.indirect.stdRate.map((r, i) => ({
      rate: r,
      pop:  DEFAULTS.indirect.stdPop[i],
    }));
    studyPop = DEFAULTS.indirect.studyPop.map(n => ({ pop: n }));
  }

  render();
  clearError();
  clearResults();
}

/* ============================================================
   Add / remove age groups
   ============================================================ */
function addAgeGroup() {
  ageGroups.push('');
  if (method === 'direct') {
    stdPop.push({ pop: 0, rate: 0 });
  } else {
    stdPop.push({ rate: 0, pop: 0 });
    studyPop.push({ pop: 0 });
  }
  render();
}

function removeAgeGroup(i) {
  ageGroups.splice(i, 1);
  stdPop.splice(i, 1);
  if (method === 'indirect') studyPop.splice(i, 1);
  render();
}

/* ============================================================
   Render all panels
   ============================================================ */
function render() {
  renderAgeGroupList();
  if (method === 'direct') renderDirectTables();
  else                      renderIndirectTables();
}

function renderAgeGroupList() {
  const el = document.getElementById('ag-list');
  let html = `<div class="ag-header-row" style="grid-template-columns:1fr 30px"><span>Label</span><span></span></div>`;
  ageGroups.forEach((ag, i) => {
    html += `
      <div class="ag-row" style="grid-template-columns:1fr 30px">
        <input type="text" value="${escHtml(ag)}"
               onchange="ageGroups[${i}]=this.value"
               placeholder="e.g. 25–34" />
        <button class="btn-small btn-danger"
                onclick="removeAgeGroup(${i})"
                title="Remove row"
                style="padding:4px 7px;font-size:11px">✕</button>
      </div>`;
  });
  el.innerHTML = html;
}

function renderDirectTables() {
  document.getElementById('std-pop-label').textContent  = 'Standard population & study rates';
  document.getElementById('study-pop-section').style.display = 'none';
  document.getElementById('method-desc').innerHTML =
    '<strong>Direct method:</strong> Applies study population age-specific rates to a ' +
    '<em>standard</em> population to compute expected events, then derives a single standardized rate.';

  const el = document.getElementById('std-pop-table');
  const safeLabel = escHtml(studyRateLabel || 'Rate /1k');
  let html = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border)">
      <label style="font-size:10px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:0.07em;white-space:nowrap">Rate label:</label>
      <input type="text" id="rate-label-input" value="${safeLabel}"
             oninput="studyRateLabel=this.value; document.getElementById('rate-col-header').textContent=this.value||'Rate /1k'"
             placeholder="e.g. ASMR, CMR, Incidence rate"
             style="flex:1;padding:4px 7px;border:1px solid var(--border);border-radius:5px;background:var(--surface);color:var(--text);font-size:12px;font-family:var(--font)" />
    </div>
    <div class="ag-header-row" style="grid-template-columns:80px 1fr 1fr">
      <span>Age group</span><span>Std pop (N)</span><span id="rate-col-header">${safeLabel}</span>
    </div>`;
  ageGroups.forEach((ag, i) => {
    html += `
      <div class="ag-row" style="grid-template-columns:80px 1fr 1fr">
        <input class="readonly" type="text" value="${escHtml(ag)}" readonly />
        <input type="number" min="0" value="${stdPop[i]?.pop ?? 0}"
               onchange="stdPop[${i}].pop=+this.value" />
        <input type="number" min="0" step="0.01" value="${stdPop[i]?.rate ?? 0}"
               onchange="stdPop[${i}].rate=+this.value" />
      </div>`;
  });
  el.innerHTML = html;
}

function renderIndirectTables() {
  document.getElementById('std-pop-label').textContent  = 'Standard population (rates + sizes)';
  document.getElementById('study-pop-label').textContent = 'Study population';
  document.getElementById('study-pop-section').style.display = 'block';
  document.getElementById('method-desc').innerHTML =
    '<strong>Indirect method:</strong> Applies <em>standard</em> population rates to the ' +
    'study population to compute expected events, then computes SMR = Observed / Expected.';

  /* Standard population table */
  const el = document.getElementById('std-pop-table');
  const safeLabelInd = escHtml(studyRateLabel || 'ASMR');
  let html = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border)">
      <label style="font-size:10px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:0.07em;white-space:nowrap">Rate label:</label>
      <input type="text" id="rate-label-input-ind" value="${safeLabelInd}"
             oninput="studyRateLabel=this.value; document.getElementById('rate-col-header-ind').textContent=(this.value||'ASMR')+' (std)'"
             placeholder="e.g. ASMR, CMR, Incidence rate"
             style="flex:1;padding:4px 7px;border:1px solid var(--border);border-radius:5px;background:var(--surface);color:var(--text);font-size:12px;font-family:var(--font)" />
    </div>
    <div class="ag-header-row" style="grid-template-columns:80px 1fr 1fr">
      <span>Age group</span><span id="rate-col-header-ind">${safeLabelInd} (std)</span><span>Std pop (N)</span>
    </div>`;
  ageGroups.forEach((ag, i) => {
    html += `
      <div class="ag-row" style="grid-template-columns:80px 1fr 1fr">
        <input class="readonly" type="text" value="${escHtml(ag)}" readonly />
        <input type="number" min="0" step="0.01" value="${stdPop[i]?.rate ?? 0}"
               onchange="stdPop[${i}].rate=+this.value" />
        <input type="number" min="0" value="${stdPop[i]?.pop ?? 0}"
               onchange="stdPop[${i}].pop=+this.value" />
      </div>`;
  });
  el.innerHTML = html;

  /* Study population table */
  const el2 = document.getElementById('study-pop-table');
  let html2 = `
    <div class="ag-header-row" style="grid-template-columns:80px 1fr">
      <span>Age group</span><span>Study pop (N)</span>
    </div>`;
  ageGroups.forEach((ag, i) => {
    html2 += `
      <div class="ag-row" style="grid-template-columns:80px 1fr">
        <input class="readonly" type="text" value="${escHtml(ag)}" readonly />
        <input type="number" min="0" value="${studyPop[i]?.pop ?? 0}"
               onchange="studyPop[${i}].pop=+this.value" />
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
  const n = ageGroups.length;
  if (n < 2)                             return showError('Please enter at least 2 age groups.');
  if (ageGroups.some(ag => !ag.trim())) return showError('Please label all age groups before computing.');
  if (method === 'direct') computeDirect(n);
  else                      computeIndirect(n);
}

/* ── Direct ── */
function computeDirect(n) {
  const stdTotalPop = stdPop.reduce((s, r) => s + (+r.pop || 0), 0);
  if (stdTotalPop <= 0)
    return showError('Standard population totals to zero. Please check your entries.');

  let rows = [], weightedRateSum = 0, totalExpected = 0;

  stdPop.forEach((r, i) => {
    const pop      = +r.pop  || 0;
    const rate     = +r.rate || 0;
    const weight   = pop / stdTotalPop;
    const expected = (rate / 1000) * pop;
    weightedRateSum += weight * rate;
    totalExpected   += expected;
    rows.push({ ag: ageGroups[i], pop, rate, weight, expected });
  });

  const crudeRate = rows.reduce((s, r) => s + r.rate, 0) / n;
  const stdRate   = weightedRateSum;

  const rateColName = studyRateLabel || 'Rate /1k';

  const tableBody = rows.map(r => `
    <tr>
      <td>${escHtml(r.ag)}</td>
      <td class="num">${r.pop.toLocaleString()}</td>
      <td class="num">${r.rate.toFixed(2)}</td>
      <td class="num">${(r.weight * 100).toFixed(1)}%</td>
      <td class="num">${r.expected.toFixed(1)}</td>
    </tr>`).join('');

  const interpretation =
    `The directly age-standardized rate is <strong>${stdRate.toFixed(2)} per 1,000</strong> ` +
    `(standard population N = ${stdTotalPop.toLocaleString()}). ` +
    `The unweighted mean crude rate across groups was ${crudeRate.toFixed(2)} per 1,000. ` +
    `Total expected events in the standard population: ${totalExpected.toFixed(1)}. ` +
    `To compare two populations, compute a standardized rate for each using the <em>same</em> standard population and compare them directly.`;

  presentResults({
    title:   'Direct standardization results',
    metrics: [
      { label: 'Standardized rate',     value: stdRate.toFixed(2),              unit: 'per 1,000'  },
      { label: 'Crude (mean) rate',     value: crudeRate.toFixed(2),            unit: 'per 1,000'  },
      { label: 'Standard pop (N)',       value: stdTotalPop.toLocaleString(),    unit: 'total'      },
      { label: 'Total expected events', value: totalExpected.toFixed(1),        unit: 'events'     },
    ],
    tableHead: `<tr>
      <th>Age group</th><th>Std pop (N)</th><th>${escHtml(rateColName)}</th>
      <th>Weight</th><th>Expected events</th>
    </tr>`,
    tableBody,
    rateColName,
    formula:
      '<strong>Standardized rate</strong> = Σ (wᵢ × rᵢ)\n' +
      'wᵢ = standard pop in group i / total standard pop\n' +
      `rᵢ = ${rateColName} in study population (per 1,000)`,
    interpretation,
    method: 'direct',
    rows, stdRate, stdTotalPop, totalExpected, crudeRate,
  });
}

/* ── Indirect ── */
function computeIndirect(n) {
  const obs = +(document.getElementById('indirect-obs-val')?.value || 0);
  if (obs <= 0) return showError('Observed events must be greater than 0.');

  let expected = 0;
  let rows = [];

  stdPop.forEach((r, i) => {
    const stdRate  = +r.rate || 0;
    const stdPopN  = +r.pop  || 0;
    const studyN   = +studyPop[i]?.pop || 0;
    const exp      = (stdRate / 1000) * studyN;
    expected += exp;
    rows.push({ ag: ageGroups[i], stdRate, stdPopN, studyN, exp });
  });

  if (expected <= 0)
    return showError('Expected events total to zero. Check standard rates and study population sizes.');

  const smr              = obs / expected;
  const stdCrudeRate     = rows.reduce((s, r) => s + r.stdRate, 0) / n;
  const indirectStdRate  = smr * stdCrudeRate;

  /* Byar's 95% CI for SMR */
  const ciLow  = smr * Math.pow(1 - 1 / (9 * obs) - 1.96 / (3 * Math.sqrt(obs)), 3);
  const ciHigh = smr * Math.pow(1 - 1 / (9 * (obs + 1)) + 1.96 / (3 * Math.sqrt(obs + 1)), 3);

  const tableBody = rows.map(r => `
    <tr>
      <td>${escHtml(r.ag)}</td>
      <td class="num">${r.stdRate.toFixed(2)}</td>
      <td class="num">${r.studyN.toLocaleString()}</td>
      <td class="num">${r.exp.toFixed(2)}</td>
    </tr>`).join('');

  const dir = smr > 1 ? 'higher' : smr < 1 ? 'lower' : 'the same as';
  const interpretation =
    `SMR = <strong>${smr.toFixed(3)}</strong> (Observed = ${obs}, Expected = ${expected.toFixed(1)}). ` +
    `The study population has <em>${dir}</em> mortality/morbidity than the standard population. ` +
    `Approximate 95% CI (Byar): ${Math.max(0, ciLow).toFixed(3)} – ${ciHigh.toFixed(3)}. ` +
    `Indirect standardized rate = ${indirectStdRate.toFixed(2)} per 1,000.`;

  presentResults({
    title:   'Indirect standardization results (SMR)',
    metrics: [
      { label: 'SMR',                    value: smr.toFixed(3),              unit: 'Obs / Exp'  },
      { label: 'Observed events',        value: obs.toLocaleString(),        unit: 'total'      },
      { label: 'Expected events',        value: expected.toFixed(1),         unit: 'total'      },
      { label: 'Indirect std. rate',     value: indirectStdRate.toFixed(2),  unit: 'per 1,000'  },
    ],
    tableHead: `<tr>
      <th>Age group</th><th>${escHtml(studyRateLabel||'ASMR')} (std)</th><th>Study pop (N)</th><th>Expected events</th>
    </tr>`,
    tableBody,
    formula:
      '<strong>Expected events</strong> = Σ (standard rate in group i × study pop in group i / 1,000)\n' +
      '<strong>SMR</strong> = Observed / Expected\n' +
      '<strong>Indirect std. rate</strong> = SMR × crude standard rate',
    interpretation,
    method: 'indirect',
    rateColName: studyRateLabel || 'ASMR',
    rows, smr, obs, expected, indirectStdRate, ciLow, ciHigh,
  });
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
    <div class="metric-card">
      <div class="metric-label">${m.label}</div>
      <div class="metric-value">${m.value}</div>
      <div class="metric-unit">${m.unit}</div>
    </div>`).join('');

  const smrClass = (data.method === 'indirect' && data.smr && data.smr > 1)
    ? ' warn' : '';

  el.innerHTML = `
    <div class="result-section">
      <div class="result-title">${data.title}</div>

      <div class="metric-grid">${metrics}</div>

      <pre class="result-formula">${data.formula}</pre>

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
   Downloads
   ============================================================ */
function buildTXTReport() {
  if (!lastResult) return '';
  const d = lastResult;
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

  lines.push('FORMULA');
  lines.push(sep2);
  lines.push(d.formula);
  lines.push('');

  lines.push('AGE-GROUP TABLE');
  lines.push(sep2);
  if (d.method === 'direct') {
    const rateCol = d.rateColName || 'Study rate /1k';
    lines.push(`Age group    | Std pop (N) | ${rateCol.padEnd(14)} | Weight   | Expected events`);
    d.rows.forEach(r => lines.push(
      `${pad(r.ag,12)} | ${pad(r.pop,11)} | ${pad(r.rate.toFixed(2),14)} | ${pad((r.weight*100).toFixed(1)+'%',8)} | ${r.expected.toFixed(1)}`
    ));
  } else {
    const rateColInd = d.rateColName || 'ASMR';
    lines.push(`Age group    | ${rateColInd.padEnd(12)} (std) | Study pop (N) | Expected events`);
    d.rows.forEach(r => lines.push(
      `${pad(r.ag,12)} | ${pad(r.stdRate.toFixed(2),12)} | ${pad(r.studyN,13)} | ${r.exp.toFixed(2)}`
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
    const rateCol = d.rateColName || 'Study rate per 1000';
    rows.push(['Age group','Std pop (N)', rateCol,'Weight (%)','Expected events']);
    d.rows.forEach(r => rows.push([r.ag, r.pop, r.rate.toFixed(2), (r.weight*100).toFixed(1), r.expected.toFixed(1)]));
    rows.push([]);
    rows.push(['Standardized rate (per 1000)', d.metrics[0].value]);
    rows.push(['Crude mean rate (per 1000)',   d.metrics[1].value]);
    rows.push(['Standard population (N)',      d.metrics[2].value]);
    rows.push(['Total expected events',        d.metrics[3].value]);
  } else {
    const rateColIndCSV = d.rateColName || 'ASMR';
    rows.push(['Age group', rateColIndCSV+' (std)', 'Study pop (N)','Expected events']);
    d.rows.forEach(r => rows.push([r.ag, r.stdRate.toFixed(2), r.studyN, r.exp.toFixed(2)]));
    rows.push([]);
    rows.push(['SMR',                         d.metrics[0].value]);
    rows.push(['Observed events',             d.metrics[1].value]);
    rows.push(['Expected events',             d.metrics[2].value]);
    rows.push(['Indirect std. rate (per 1000)', d.metrics[3].value]);
    rows.push(['95% CI lower (Byar)',         d.ciLow  != null ? Math.max(0,d.ciLow).toFixed(3)  : '']);
    rows.push(['95% CI upper (Byar)',         d.ciHigh != null ? d.ciHigh.toFixed(3)              : '']);
  }

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  triggerDownload('data:text/csv;charset=utf-8,' + encodeURIComponent(csv),
    'age_standardization_results.csv');
}

function downloadHTML() {
  if (!lastResult) return;
  const d = lastResult;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
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
  pre{background:#f5f4f0;border-left:3px solid #2563eb;padding:10px 14px;font-size:12px;border-radius:0 6px 6px 0;white-space:pre-wrap;line-height:1.8;font-family:'Fira Code',monospace}
  table{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:16px}
  th{background:#f9f9f6;padding:7px 10px;text-align:left;font-size:10px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e5e5}
  td{padding:7px 10px;border-bottom:1px solid #f0f0f0}
  .interp{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 14px;font-size:13px;color:#166534;line-height:1.65}
  .interp.warn{background:#fffbeb;border-color:#fcd34d;color:#92400e}
  footer{margin-top:40px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:14px}
</style>
</head>
<body>
<h1>Age Standardization Report</h1>
<p class="sub">Method: ${d.method === 'direct' ? 'Direct standardization' : 'Indirect standardization (SMR)'}</p>

<h2>Key results</h2>
<div class="metric-grid">
  ${d.metrics.map(m => `<div class="metric-card"><div class="metric-label">${m.label}</div><div class="metric-value">${m.value}</div><div class="metric-unit">${m.unit}</div></div>`).join('')}
</div>

<h2>Formula</h2>
<pre>${d.formula}</pre>

<h2>Age-group table</h2>
<table><thead>${d.tableHead}</thead><tbody>${d.tableBody}</tbody></table>

<h2>Interpretation</h2>
<div class="interp${(d.method==='indirect'&&d.smr>1)?' warn':''}">${d.interpretation}</div>

<footer>Generated by Age Standardization Dashboard &mdash; open source, educational use only.</footer>
</body></html>`;

  triggerDownload('data:text/html;charset=utf-8,' + encodeURIComponent(html),
    'age_standardization_report.html');
}

/* ============================================================
   Utilities
   ============================================================ */
function triggerDownload(dataUri, filename) {
  const a = document.createElement('a');
  a.href     = dataUri;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent     = msg;
  el.style.display   = 'block';
}

function clearError() {
  document.getElementById('error-msg').style.display = 'none';
}

function clearResults() {
  const el = document.getElementById('results');
  el.innerHTML     = '';
  el.style.display = 'none';
  document.getElementById('empty-state').style.display = 'flex';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function pad(val, len) {
  return String(val).padEnd(len);
}
