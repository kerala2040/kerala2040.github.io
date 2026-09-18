const RAW = 'data/';
const REPO = 'https://github.com/abhijith-sivaprasadan/kerala2040';
const qs = (s, root = document) => root.querySelector(s);
const qsa = (s, root = document) => [...root.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const n = (v) => v == null || v === '' || typeof v === 'boolean' ? null : Number.isFinite(Number(v)) ? Number(v) : null;
const fmt = (v, d = 1) => n(v) == null ? '—' : Number(v).toFixed(d);
const pct = (v, d = 1) => n(v) == null ? '—' : `${(100 * Number(v)).toFixed(d)}%`;

const state = {
  data: null,
  origin: 'research pipeline',
  daily: null,
  monthly: null,
  duration: null,
  currentOverviewMetric: 'demand',
  selectedScenario: null,
  selectedStress: new Set(),
  map: null,
  markers: [],
  mapKind: 'all',
  industryCase: 'kmml'
};

async function fetchJSON(url, required = false) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const r = await fetch(url, {cache:'no-store', signal:controller.signal});
    clearTimeout(timer);
    if (!r.ok) throw new Error(`${r.status}`);
    return await r.json();
  } catch (err) {
    if (required) throw err;
    console.warn('Optional dataset unavailable:', url, err);
    return null;
  }
}

async function loadPlatformData() {
  state.data = await fetchJSON(`${RAW}site-data.json`, true);
  if (!state.data?.metadata?.files) throw new Error('Unsupported evidence bundle');
  state.origin = 'Published evidence snapshot';
  const files = state.data?.metadata?.files || {};
  const dailyName = files.daily_balance || 'daily-balance.json';
  const monthlyName = files.monthly_balance || 'monthly-balance.json';
  const durationName = files.import_duration || 'import-duration.json';
  [state.daily, state.monthly, state.duration] = await Promise.all([
    files.daily_balance ? fetchJSON(`${RAW}${dailyName}`, true) : null,
    files.monthly_balance ? fetchJSON(`${RAW}${monthlyName}`, true) : null,
    files.import_duration ? fetchJSON(`${RAW}${durationName}`, true) : null
  ]);
}

function refs() {
  const raw = state.data?.references || {};
  return {
    cstep: raw.cstep_2024 || {},
    cn50: raw.kerala_cn50_2026 || {}
  };
}

function statusMap() {
  if (state.data?.metadata?.status) return state.data.metadata.status;
  const items = state.data?.buildStatus || [];
  const map = {};
  items.forEach((x, i) => map[`source_${i}`] = {available:x.state === 'ready', evidence:x.state === 'gap' ? 'gap' : 'status', note:x.label});
  return map;
}

function scenarios() {
  const list = state.data?.scenarios || [];
  return list.map((s, i) => ({
    id: s.id || `${s.code || `S${i}`}_${s.name || 'scenario'}`,
    code: s.code || `S${i}`,
    name: s.name || s.id || `Scenario ${i}`,
    type: s.type || inferScenarioType(s.code),
    description: s.description || s.summary || '',
    demand_flexibility: s.demand_flexibility || s.dimensions?.['Demand flexibility'] || 'medium',
    ecology_constraint: s.ecology_constraint || s.dimensions?.Ecology || 'baseline legal exclusions',
    import_option: ![false, 'disabled', 'off'].includes(s.import_option),
    dimensions: s.dimensions || null
  }));
}

function inferScenarioType(code) {
  return ({S0:'reference',S1:'stress pathway',S2:'technology pathway',S3:'system pathway',S4:'constraint pathway'})[code] || 'scenario';
}

function chartTheme() {
  const css = getComputedStyle(document.documentElement);
  return {
    ink: css.getPropertyValue('--ink').trim(),
    muted: css.getPropertyValue('--muted').trim(),
    line: css.getPropertyValue('--line').trim(),
    green: css.getPropertyValue('--green').trim(),
    blue: css.getPropertyValue('--blue').trim(),
    amber: css.getPropertyValue('--amber').trim(),
    surface: css.getPropertyValue('--surface').trim()
  };
}

function layout({height=410, xTitle='', yTitle='', margin={l:64,r:28,t:30,b:58}} = {}) {
  const c = chartTheme();
  return {
    height, margin, paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)',
    font:{family:'Inter, sans-serif', size:11, color:c.ink},
    xaxis:{title:xTitle, gridcolor:c.line, linecolor:c.line, zeroline:false, color:c.muted, automargin:true},
    yaxis:{title:yTitle, gridcolor:c.line, linecolor:c.line, zeroline:false, color:c.muted, automargin:true},
    legend:{orientation:'h', x:0, y:1.12, font:{size:10}},
    hoverlabel:{font:{family:'Inter, sans-serif'}}
  };
}

const plotConfig = {displayModeBar:false, responsive:true};

function renderHeadline() {
  const {cstep, cn50} = refs();
  const o = observed()?.electricity;
  const metrics = o ? [
    ['FY2024-25 electricity sales', `${fmt(o.annual_sales_within_state_and_open_access_mu / 1000, 2)} TWh`, 'within state + open access', 'Kerala Economic Review 2025'],
    ['FY2024-25 maximum peak', `${fmt(o.maximum_peak_demand_mw / 1000, 2)} GW`, o.maximum_peak_date || 'observed maximum', 'Kerala Economic Review 2025'],
    ['Installed capacity', `${fmt(o.installed_capacity_mw / 1000, 2)} GW`, 'reported FY2024-25 mix', 'Kerala Economic Review 2025'],
    ['T&D loss', `${fmt(o.td_loss_pct, 2)}%`, 'reported FY2024-25', 'Kerala Economic Review 2025']
  ] : [
    ['CSTEP 2040 demand', `${fmt(cstep.fy2040?.final_demand_with_td_losses_mu / 1000, 1)} TWh`, 'incl. T&D losses', 'CSTEP 2024'],
    ['CSTEP 2040 peak', `${fmt(cstep.fy2040?.peak_demand_mw / 1000, 2)} GW`, 'published planning benchmark', 'CSTEP 2024'],
    ['In-state resource potential', `${fmt(cn50.in_state_resource_potential_gw?.total, 2)} GW`, 'screened technical potential in CN50', 'Kerala CN50 2026'],
    ['CN50 2040 net-grid demand', `${fmt(cn50.net_grid_demand_twh?.cn50_2040, 1)} TWh`, 'carbon-neutral pathway', 'Kerala CN50 2026']
  ];
  qs('#headlineMetrics').innerHTML = metrics.map(([label,value,note,source]) => `<div class="headline-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(note)}</span><span class="metric-source"> · ${esc(source)}</span></div>`).join('');
  qs('#heroDemandNumber').textContent = fmt(baseline()?.aggregate_import_share * 100, 1);
}

function renderOverview(metric = state.currentOverviewMetric) {
  state.currentOverviewMetric = metric;
  qsa('#overviewMetricTabs button').forEach(b => b.classList.toggle('active', b.dataset.metric === metric));
  if (!window.Plotly) return;
  const {cstep, cn50} = refs();
  const c = chartTheme();
  let traces = [], chartLayout = layout(), note = '', insight = '';

  if (metric === 'demand') {
    const labels = ['CSTEP 2040', 'CN50 BAU 2040', 'CN50 pathway 2040'];
    const values = [cstep.fy2040.final_demand_with_td_losses_mu/1000, cn50.net_grid_demand_twh.bau_2040, cn50.net_grid_demand_twh.cn50_2040];
    traces = [{type:'bar', x:labels, y:values, marker:{color:[c.green,c.blue,c.amber]}, text:values.map(v=>`${fmt(v,1)} TWh`), textposition:'outside', hovertemplate:'%{x}<br>%{y:.2f} TWh<extra></extra>'}];
    chartLayout = {...layout({yTitle:'TWh/year'}), showlegend:false};
    note = 'The published studies use different scopes and electrification assumptions; values are displayed side-by-side, not blended.';
    insight = `<span class="eyebrow">WHY THE RANGE MATTERS</span><h3>There is no single “2040 demand” number.</h3><p>CSTEP and Kerala CN50 answer different planning questions. Kerala 2040 keeps both as external benchmarks and tests its own assumptions against measured history.</p><div class="insight-stat"><strong>${fmt(values[2]-values[0],1)} TWh</strong><span>difference between the two displayed 2040 endpoints</span></div><button class="text-button" data-route="pathways">Compare pathways →</button>`;
  } else if (metric === 'capacity') {
    const cap = cstep.cited_capacity_addition_bau_mw || {};
    const labels = ['Solar','Wind','Large hydro','Small hydro'];
    const values = [cap.solar,cap.wind,cap.large_hydro,cap.small_hydro].map(v=>n(v)||0);
    traces = [{type:'bar', orientation:'h', y:labels, x:values, marker:{color:c.green}, text:values.map(v=>`${fmt(v/1000,2)} GW`), textposition:'outside', hovertemplate:'%{y}<br>%{x:,.0f} MW<extra></extra>'}];
    chartLayout = {...layout({xTitle:'MW of cited BAU additions', margin:{l:95,r:80,t:30,b:58}}), showlegend:false};
    note = 'CSTEP 2024 cited BAU capacity additions. These are reference-study values, not Kerala 2040 model results.';
    insight = `<span class="eyebrow">RESOURCE CONTEXT</span><h3>${fmt(cn50.in_state_resource_potential_gw.total,2)} GW screened in-state potential.</h3><p>The 2026 CN50 report gives a separate resource-potential estimate. Technical potential is not the same as buildable capacity after ecology, grid and land constraints.</p><div class="insight-stat"><strong>${fmt(cn50.in_state_resource_potential_gw.ground_mounted_solar,2)} GW</strong><span>ground-mounted solar potential in the CN50 reference</span></div><button class="text-button" data-route="atlas">Open the atlas →</button>`;
  } else {
    const st = statusMap();
    const labels = Object.keys(st).map(k => friendlyStatusName(k));
    const values = Object.values(st).map(() => 1);
    const colors = Object.values(st).map(v => v.available ? c.green : (v.evidence === 'gap' ? c.amber : c.blue));
    const words = Object.values(st).map(v => v.available ? 'connected' : (v.evidence === 'gap' ? 'gap' : 'pending'));
    traces = [{type:'bar', orientation:'h', y:labels, x:values, marker:{color:colors}, text:words, textposition:'inside', hovertemplate:'%{y}: %{text}<extra></extra>'}];
    chartLayout = {...layout({margin:{l:180,r:25,t:30,b:45}}), showlegend:false, xaxis:{visible:false, range:[0,1]}};
    note = 'Categorical evidence state only — no artificial completion percentages are assigned.';
    const ready = Object.values(st).filter(v=>v.available).length;
    insight = `<span class="eyebrow">EVIDENCE FIRST</span><h3>${ready} connected evidence layer${ready===1?'':'s'} in the current public bundle.</h3><p>Model outputs remain provisional until the historical system is reconstructed well enough to calibrate dispatch, imports and hydro behaviour.</p><div class="insight-stat"><strong>${Object.values(st).filter(v=>v.evidence==='gap').length}</strong><span>explicit high-priority data gap(s)</span></div><button class="text-button" data-route="data">Inspect sources →</button>`;
  }
  Plotly.react('overviewChart', traces, chartLayout, plotConfig);
  qs('#overviewChartNote').textContent = note;
  qs('#overviewInsight').innerHTML = insight;
  bindRouteButtons(qs('#overviewInsight'));
}

function friendlyStatusName(key) {
  const names = {
    official_observed_2024_25:'Official FY2024-25 baseline',
    sldc_daily:'SLDC daily balance',
    baseline_summary:'Historical summary',
    reservoir_storage:'Reservoir storage',
    weather:'NASA POWER weather',
    era5_reanalysis:'ERA5 reanalysis',
    grid_india_psp:'Grid-India cross-check',
    kseb_project_inventory:'KSEB project inventory',
    hazard_layers:'KSDMA hazard layers',
    hourly_state_load:'Hourly state load'
  };
  return names[key] || key.replaceAll('_',' ');
}

function renderEvidenceFeed() {
  const st = statusMap();
  const entries = Object.entries(st);
  if (!entries.length) { qs('#evidenceFeed').innerHTML = '<div class="evidence-item"><strong>No status registry in bundle.</strong></div>'; return; }
  qs('#evidenceFeed').innerHTML = entries.map(([key,v]) => {
    const stateClass = v.partial ? 'progress' : v.available ? 'ready' : (v.evidence === 'gap' ? 'gap' : 'progress');
    const word = v.partial ? 'Partial acquisition' : v.available ? 'Available' : (v.evidence === 'gap' ? 'Data gap' : 'Pending');
    return `<article class="evidence-item"><div class="status-row"><i class="status-dot ${stateClass}"></i><strong>${esc(friendlyStatusName(key))}</strong></div><p>${esc(word)}${v.note ? ` · ${v.note}` : ''}</p></article>`;
  }).join('');
}

function observed() { return state.data?.observed || null; }
function baseline() { return state.data?.baseline || null; }

function renderElectricity() {
  const b = baseline();
  const o = observed()?.electricity;
  const {cstep} = refs();
  const dailyReady = !!(state.daily?.records?.length);
  const status = qs('#electricityStatus');
  status.textContent = dailyReady ? `${state.daily.records.length} daily records connected` : 'Historical refresh pending';
  status.classList.toggle('neutral', !dailyReady);

  const kpis = b ? [
    ['Observed-day consumption', `${fmt(b.consumption_twh,2)} TWh`, `${b.rows} days; not a complete annual total`],
    ['In-state generation', `${fmt(b.internal_generation_twh,2)} TWh`, `${pct(b.aggregate_internal_share)} of consumption`],
    ['Net imports', `${fmt(b.net_import_twh,2)} TWh`, `${pct(b.aggregate_import_share)} aggregate share`],
    ['Coverage', pct(b.coverage_fraction,1), `${b.rows ?? '—'} daily records`]
  ] : o ? [
    ['FY2024-25 electricity sales', `${fmt(o.annual_sales_within_state_and_open_access_mu/1000,2)} TWh`, 'official annual reference'],
    ['Maximum peak demand', `${fmt(o.maximum_peak_demand_mw/1000,2)} GW`, o.maximum_peak_date || 'FY2024-25'],
    ['Installed capacity', `${fmt(o.installed_capacity_mw/1000,2)} GW`, 'reported FY2024-25'],
    ['Hourly chronology', 'Open gap', 'authenticated 8760/35040 series still needed']
  ] : [
    ['2040 demand reference', `${fmt(cstep.fy2040.final_demand_with_td_losses_mu/1000,1)} TWh`, 'CSTEP 2024'],
    ['2040 peak reference', `${fmt(cstep.fy2040.peak_demand_mw/1000,2)} GW`, 'CSTEP 2024'],
    ['Measured daily baseline', dailyReady ? 'Connected' : 'Refreshing', dailyReady ? `${state.daily.records.length} records` : 'not yet in public bundle'],
    ['Hourly chronology', 'Open gap', 'authenticated 8760/35040 series needed']
  ];
  qs('#electricityKpis').innerHTML = kpis.map(([l,v,m])=>`<div class="kpi-card"><small>${esc(l)}</small><strong>${esc(v)}</strong><span>${esc(m)}</span></div>`).join('');

  const select = qs('#electricityMetric');
  for (const option of select.options) {
    option.disabled = option.value !== 'reference' && !({daily:state.daily,monthly:state.monthly,duration:state.duration}[option.value]?.records?.length);
  }
  if (!dailyReady && ['daily','monthly','duration'].includes(select.value)) select.value = 'reference';
  renderElectricityChart(select.value);
  renderCapacityChart();
  renderElectricityEvidence();
}

function renderElectricityChart(metric) {
  if (!window.Plotly) return;
  const c = chartTheme();
  const {cstep, cn50} = refs();
  let traces = [], chartLayout = layout(), title = '', note = '';
  if (metric === 'daily' && state.daily?.records?.length) {
    const d = state.daily.records;
    const defs = [['Consumption','consumption_mu',c.ink],['Internal generation','internal_generation_mu',c.green],['Net imports','net_import_interface_mu',c.amber],['Hydro','hydel_total_mu',c.blue]];
    traces = defs.filter(([,k])=>d.some(r=>n(r[k])!=null)).map(([name,k,color])=>({type:'scatter', mode:'lines', name, x:d.map(r=>r.date), y:d.map(r=>r[k]), line:{width:1.6,color}, hovertemplate:`${name}<br>%{x}<br>%{y:.2f} MU<extra></extra>`}));
    chartLayout = layout({yTitle:'MU/day'}); title = 'Daily electricity balance'; note = `${d.length} records from the processed Kerala SLDC bundle.`;
  } else if (metric === 'monthly' && state.monthly?.records?.length) {
    const m = state.monthly.records;
    traces = [['Consumption','consumption_mu',c.ink],['Internal generation','internal_generation_mu',c.green],['Net imports','net_import_interface_mu',c.amber]].filter(([,k])=>m.some(r=>n(r[k])!=null)).map(([name,k,color])=>({type:'bar', name, x:m.map(r=>r.month), y:m.map(r=>r[k]), marker:{color}, hovertemplate:`${name}<br>%{x}<br>%{y:.1f} MU<extra></extra>`}));
    chartLayout = {...layout({yTitle:'MU / observed month'}),barmode:'group'}; title = 'Monthly system balance'; note = 'Sums of available days only. Months with missing observations are incomplete; no days are estimated.';
  } else if (metric === 'duration' && state.duration?.records?.length) {
    const d = state.duration.records;
    traces = [{type:'scatter',mode:'lines',x:d.map(r=>r.rank),y:d.map(r=>100*n(r.import_share)),line:{color:c.green,width:2},hovertemplate:'Rank %{x}<br>%{y:.1f}% imports<extra></extra>'}];
    chartLayout = layout({xTitle:'Days ranked from highest import share',yTitle:'Imports / consumption (%)'}); title = 'Import-dependence duration curve'; note = 'Derived from measured daily balance; this is not an hourly duration curve.';
  } else {
    const labels = ['CSTEP 2040', 'CN50 BAU 2040', 'CN50 pathway 2040'];
    const values = [cstep.fy2040.final_demand_with_td_losses_mu/1000, cn50.net_grid_demand_twh.bau_2040, cn50.net_grid_demand_twh.cn50_2040];
    traces = [{type:'bar',x:labels,y:values,marker:{color:[c.green,c.blue,c.amber]},text:values.map(v=>fmt(v,1)),textposition:'outside',hovertemplate:'%{x}<br>%{y:.2f} TWh<extra></extra>'}];
    chartLayout = {...layout({yTitle:'TWh/year'}),showlegend:false}; title = 'Published 2040 electricity-demand references'; note = 'Independent studies with different accounting scopes. These are published references, not outputs of this model.';
  }
  qs('#electricityChartTitle').textContent = title;
  qs('#electricityChartNote').textContent = note;
  Plotly.react('electricityChart', traces, chartLayout, plotConfig);
}

function renderCapacityChart() {
  if (!window.Plotly) return;
  const c = chartTheme();
  const observedMix = observed()?.electricity?.capacity_mix_mw;
  const cap = observedMix || refs().cstep.cited_capacity_addition_bau_mw || {};
  const labels = observedMix ? ['Hydro','Solar','Thermal','Wind'] : ['Solar','Wind','Large hydro','Small hydro'];
  const values = observedMix
    ? [cap.hydel,cap.solar,cap.thermal,cap.wind].map(v=>n(v)||0)
    : [cap.solar,cap.wind,cap.large_hydro,cap.small_hydro].map(v=>n(v)||0);
  Plotly.react('capacityChart',[{type:'bar',x:labels,y:values,marker:{color:c.green},text:values.map(v=>`${fmt(v/1000,2)} GW`),textposition:'outside',hovertemplate:'%{x}<br>%{y:,.0f} MW<extra></extra>'}],{...layout({height:330,yTitle:'MW'}),showlegend:false},plotConfig);
}

function renderElectricityEvidence() {
  const st = statusMap();
  const rows = [
    ['Official FY2024-25 baseline', st.official_observed_2024_25, 'Kerala Economic Review / KSEBL annual reference'],
    ['SLDC daily electricity balance', st.sldc_daily, 'Measured state system accounting'],
    ['Reservoir / hydro chronology', st.reservoir_storage, 'Measured hydro-storage evidence'],
    ['NASA POWER weather', st.weather, 'Hourly representative-point weather'],
    ['ERA5 reanalysis', st.era5_reanalysis, 'Independent hourly climate/reanalysis input'],
    ['Grid-India cross-check', st.grid_india_psp, 'Independent official daily cross-check'],
    ['Hourly Kerala load', st.hourly_state_load || {available:false,evidence:'gap'}, 'Needed for chronological capacity-expansion validation']
  ];
  qs('#electricityEvidence').innerHTML = rows.map(([label,s,desc]) => {
    const available = s?.available; const gap = s?.evidence === 'gap';
    return `<div class="evidence-row"><i class="status-dot ${available?'ready':gap?'gap':'progress'}"></i><div><strong>${esc(label)}</strong><p>${esc(desc)}</p></div><span>${s?.partial?'partial':available?'available':gap?'gap':'pending'}</span></div>`;
  }).join('');
}

function renderPathwayReferences() {
  if (!window.Plotly) return;
  const {cstep,cn50} = refs(); const c = chartTheme();
  const labels = ['2030','2040'];
  const bau = [cn50.net_grid_demand_twh.bau_2030,cn50.net_grid_demand_twh.bau_2040];
  const carbon = [cn50.net_grid_demand_twh.cn50_2030,cn50.net_grid_demand_twh.cn50_2040];
  const cstep2040 = cstep.fy2040.final_demand_with_td_losses_mu/1000;
  Plotly.react('pathwayReferenceChart',[
    {type:'bar',name:'Kerala CN50 · BAU',x:labels,y:bau,marker:{color:c.blue}},
    {type:'bar',name:'Kerala CN50 · CN50',x:labels,y:carbon,marker:{color:c.amber}},
    {type:'scatter',mode:'markers+text',name:'CSTEP · 2040',x:['2040'],y:[cstep2040],marker:{size:14,color:c.green},text:[`${fmt(cstep2040,1)} TWh`],textposition:'top center'}
  ],{...layout({yTitle:'TWh/year'}),barmode:'group'},plotConfig);
  qs('#referenceNarrative').innerHTML = `<span class="eyebrow">DO NOT BLEND THESE</span><h3>Different scope produces different demand.</h3><p>The 2024 CSTEP roadmap and the 2026 Kerala CN50 report are independent published references. Kerala 2040 uses them as boundary checks, not as interchangeable forecasts.</p><div class="ref-row"><strong>${fmt(cstep2040,2)} TWh · ${fmt(cstep.fy2040.peak_demand_mw/1000,2)} GW peak</strong><span>CSTEP 2040 · demand including stated T&D losses</span></div><div class="ref-row"><strong>${fmt(cn50.net_grid_demand_twh.bau_2040,2)} / ${fmt(cn50.net_grid_demand_twh.cn50_2040,2)} TWh</strong><span>Kerala CN50 2040 · BAU / carbon-neutral pathway net-grid demand</span></div>`;
}

function renderScenarioLab(selectedCode = null) {
  const list = scenarios();
  if (!list.length) return;
  const chosen = list.find(s=>s.code===selectedCode) || list.find(s=>s.code===state.selectedScenario) || list[0];
  state.selectedScenario = chosen.code;
  qs('#scenarioRail').innerHTML = list.map(s=>`<button class="scenario-tab ${s.code===chosen.code?'active':''}" data-scenario="${esc(s.code)}"><span>${esc(s.code)} · ${esc(s.type)}</span><strong>${esc(s.name)}</strong></button>`).join('');
  qs('#scenarioCode').textContent = chosen.code;
  qs('#scenarioName').textContent = chosen.name;
  qs('#scenarioType').textContent = chosen.type;
  qs('#scenarioDescription').textContent = chosen.description;

  const dims = chosen.dimensions || {
    'Demand flexibility': chosen.demand_flexibility,
    'Ecology constraint': String(chosen.ecology_constraint).replaceAll('_',' '),
    'Interstate trade': chosen.import_option ? 'enabled' : 'disabled'
  };
  qs('#scenarioDimensions').innerHTML = Object.entries(dims).map(([k,v])=>`<div class="scenario-dimension"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');

  renderScenarioInputChart(chosen);
  const stresses = state.data?.stress_tests || {};
  qs('#stressTests').innerHTML = Object.entries(stresses).map(([id,s])=>`<button class="chip ${state.selectedStress.has(id)?'active':''}" data-stress="${esc(id)}" aria-pressed="${state.selectedStress.has(id)}" title="${esc(s.description||'')}">${esc(id.replaceAll('_',' '))}</button>`).join('');
}

function renderScenarioInputChart(s) {
  qs('#scenarioInputChart').innerHTML = `<div class="model-gate"><span class="section-label">SCENARIO DESIGN · ${esc(s.code)}</span><h3>Ready to specify.<br>Not yet ready to solve.</h3><p>Daily accounting has been checked. Authenticated hourly demand, calibrated dispatch and numerical resource, grid and cost constraints are still needed before optimisation.</p><a class="text-link" href="${REPO}/blob/main/docs/hourly_demand_gap.md">See the calibration requirements ↗</a></div>`;
  renderStressSelection();
}

function renderStressSelection() {
  const selected = [...state.selectedStress];
  qs('#stressSelection').innerHTML = selected.length
    ? selected.map(id => `<p><strong>${esc(id.replaceAll('_',' '))}</strong> — ${esc(state.data.stress_tests[id]?.description)}</p>`).join('')
    : '<p>Select stresses to include in a downloadable scenario specification.</p>';
}

function downloadSpecification() {
  const scenario = scenarios().find(s => s.code === state.selectedScenario);
  const payload = {classification:'unsolved_scenario_specification', model_year:2040, scenario,
    stress_tests:Object.fromEntries([...state.selectedStress].map(id=>[id,state.data.stress_tests[id]])),
    evidence_commit:state.data.metadata.git_sha, hourly_model_calibrated:false};
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const a = document.createElement('a'); a.href=url; a.download=`kerala2040-${scenario.code}-specification.json`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function getNodes() {
  return state.data?.screening_nodes || state.data?.screeningNodes || [];
}

function renderAtlas() {
  const nodes = getNodes();
  const scope = state.data?.scope;
  qs('#statewideScope').innerHTML = `<div><strong>Whole Kerala · statewide model</strong><p>${esc(scope?.initial_model || 'The initial aggregate model represents the entire Kerala electricity system.')}</p><details><summary>Districts within the study scope</summary><p>${esc((scope?.districts||[]).join(' · '))}</p><p>${esc(scope?.coverage_rule||'')}</p></details></div>`;
  const kinds = ['all',...new Set(nodes.map(x=>x.kind))];
  qs('#mapFilters').innerHTML = kinds.map(k=>`<button class="filter-chip ${state.mapKind===k?'active':''}" data-kind="${esc(k)}">${esc(k==='all'?'All':k)}</button>`).join('');
  if (!window.L || !nodes.length) {
    qs('#map').innerHTML='<div class="model-gate">Map tiles are unavailable. The screening-node catalogue remains available below.</div>';
    qs('#mapNodeList').innerHTML=nodes.map(node=>`<button class="node-button" data-node="${esc(node.name)}"><strong>${esc(node.name)}</strong><span>${esc(node.lat)}, ${esc(node.lon)}</span></button>`).join('');
    qs('#mapDetail').innerHTML='<h2>Whole Kerala</h2><p>Choose a research location from the catalogue. The study covers the entire state.</p>'; return;
  }
  if (!state.map) {
    state.map = L.map('map',{zoomControl:true,scrollWheelZoom:true});
    state.map.fitBounds([[8.15,74.85],[12.85,77.5]],{padding:[12,12]});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(state.map);
  }
  updateMapMarkers();
  setTimeout(()=>state.map.invalidateSize(),100);
}

function updateMapMarkers(selected = null) {
  const nodes = getNodes();
  state.markers.forEach(m=>m.remove()); state.markers=[];
  const shown = nodes.filter(x=>state.mapKind==='all'||x.kind===state.mapKind);
  const palette={demand:'#2f6ea4',storage:'#0b6f5d',wind:'#71933b',circular:'#b7791f',marine:'#2a879d'};
  shown.forEach(node=>{
    const marker=L.circleMarker([node.lat,node.lon],{radius:8,color:'#fff',weight:2,fillColor:palette[node.kind]||'#667',fillOpacity:1}).addTo(state.map);
    marker.bindTooltip(node.name,{direction:'top'}); marker.on('click',()=>selectMapNode(node)); state.markers.push(marker);
  });
  qs('#mapCount').textContent=`${shown.length} screening node${shown.length===1?'':'s'}`;
  qs('#mapNodeList').innerHTML=shown.map(node=>`<button class="node-button ${selected?.name===node.name?'active':''}" data-node="${esc(node.name)}"><strong>${esc(node.name)}</strong><span>${esc(node.kind)}</span></button>`).join('');
  if (selected) selectMapNode(selected,false);
  else qs('#mapDetail').innerHTML='<h2>Whole Kerala</h2><p>No city is selected by default. Choose a marker to inspect a research location.</p><p>The map is an initial catalogue. Validated transmission lines, substations and district demand layers still need to be added.</p>';
}

function selectMapNode(node, pan=true) {
  if(!node)return;
  qs('#mapDetail').innerHTML=`<span class="node-kind">${esc(node.kind)}</span><h2>${esc(node.name)}</h2><p>${esc(node.note||'Research screening node.')}</p><p><small>Classification: research screening · not siting approval.</small></p>`;
  qsa('.node-button').forEach(b=>b.classList.toggle('active',b.dataset.node===node.name));
  if(pan&&state.map)state.map.flyTo([node.lat,node.lon],Math.max(state.map.getZoom(),8),{duration:.6});
}

function renderIndustry() {
  const cases = state.data?.circular_industry?.cases || {};
  if (!cases[state.industryCase]) state.industryCase = Object.keys(cases)[0];
  qs('#industryTabs').innerHTML = Object.entries(cases).map(([id,x])=>`<button data-industry="${esc(id)}" class="${state.industryCase===id?'active':''}">${esc(id.toUpperCase())}</button>`).join('');
  const x = cases[state.industryCase];
  if (!x) { qs('#industryCase').textContent='No sourced industrial cases are available.'; return; }
  qs('#industryCase').innerHTML = `<h2>${esc(x.organisation || state.industryCase)}</h2>${state.industryCase===state.data.circular_industry.primary_case?'<p><strong>Selected primary CET case study.</strong></p>':''}<p>${esc(state.data.circular_industry.principle)}</p>${x.limitation?`<p>${esc(x.limitation)}</p>`:''}${evidenceDetails('Research use',x.modelling_use)}${evidenceDetails('Observed or commissioned',x.observed_or_commissioned,true)}${evidenceDetails('Planned or under development',x.planned_or_development)}${evidenceDetails('Primary sources',x.sources,true)}<p class="chart-note">These are source records. A validated mass balance, costs and product offtake are still needed for a viable recovery case.</p>`;
}

function evidenceDetails(title, value, open=false) {
  if (value == null) return '';
  const label = key => String(key).replaceAll('_',' ');
  const show = v => {
    if (v == null) return 'Unavailable';
    if (Array.isArray(v)) return v.map(show).join('; ');
    if (typeof v === 'object') return `<dl>${Object.entries(v).map(([k,x])=>`<dt>${esc(label(k))}</dt><dd>${show(x)}</dd>`).join('')}</dl>`;
    if (typeof v === 'string' && /^https:\/\//.test(v)) return `<a href="${esc(v)}" target="_blank" rel="noopener">Open reference ↗</a>`;
    return esc(v);
  };
  return `<details class="evidence-block" ${open?'open':''}><summary>${esc(title)}</summary>${show(value)}</details>`;
}

function renderConnectedEvidence() {
  const b=baseline();
  qs('.energy-motif').innerHTML = (state.monthly?.records||[]).map(r=>`<i style="height:${Math.max(0,Math.min(100,100*(n(r.import_share)||0)))}%" title="${esc(r.month)}: ${pct(r.import_share)} imports"></i>`).join('');
  qs('#heroCoverage').textContent=b ? `Bars: monthly import share. ${b.rows} of ${b.expected_days} days · FY2024–25. ${b.missing_days_count} missing days. This share describes observed SLDC system accounting, not a full-year forecast.` : 'Historical daily evidence is not available in this snapshot.';
  qs('#researchReadiness').innerHTML=`<p><strong>Research status</strong> · ${b?.calibration_gate_pass?'Daily accounting checks passed.':'Daily accounting needs review.'} Hourly model calibration is still pending. Published 2040 studies are benchmarks; scenario selections are design specifications.</p><a href="${REPO}/blob/main/docs/NEXT_STEPS.md">CET research checklist ↗</a>`;
  const rows=state.daily?.records||[];
  qs('#dailyTable').innerHTML=`<p>Missing dates: ${esc(b?.missing_days?.join(', ')||'none reported')}. No interpolation is applied.</p><a class="text-link" href="data/daily-balance.json">Download all ${rows.length} observations ↓</a><div class="table-scroll"><table><thead><tr><th>Date</th><th>Consumption (MU)</th><th>Generation (MU)</th><th>Net imports (MU)</th><th>Storage (%)</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${fmt(r.consumption_mu,2)}</td><td>${fmt(r.internal_generation_mu,2)}</td><td>${fmt(r.net_import_interface_mu,2)}</td><td>${fmt(r.storage_pct_energy_weighted,1)}</td></tr>`).join('')}</tbody></table></div>`;
  qs('#reconciliation').innerHTML=`<p>SLDC consumption sums available daily records. Economic Review sales and CEA energy requirement have different accounting boundaries. None is silently substituted for another.</p>${evidenceDetails('SLDC coverage and daily accounting',b)}${evidenceDetails('Economic Review annual electricity reference',observed()?.electricity)}${evidenceDetails('CEA resource adequacy · actual FY2024–25',state.data.cea_resource_adequacy?.actual_2024_25,true)}${evidenceDetails('CEA hourly demand evidence and source',state.data.cea_resource_adequacy?.hourly_demand_2024_25)}${evidenceDetails('CEA source',state.data.cea_resource_adequacy?.source)}`;
  qs('#fuelEvidence').innerHTML=evidenceDetails('PPAC context · keep snapshot periods explicit',state.data.non_electric_energy);
  qs('#ecologyEvidence').innerHTML=evidenceDetails('Ecological and hazard constraint registry',state.data.ecology_constraints?.layers,true)+evidenceDetails('KSDMA source catalogue',state.data.hazard_catalog)+evidenceDetails('KSEB project inventory · partial if no project rows',state.data.kseb_projects);
}

function sourceEntries() {
  const src = state.data?.sources || {};
  if (Object.keys(src).length) return Object.entries(src);
  return [
    ['kerala_sldc',{note:'Kerala system statistics and storage reports.',system_statistics_url:'https://sldckerala.com/index.php?id=1'}],
    ['grid_india_daily_psp',{note:'Official national / state daily power-system cross-check.',file_api:'https://webapi.grid-india.in/api/v1/file'}],
    ['nasa_power',{note:'Representative-point weather inputs.',endpoint:'https://power.larc.nasa.gov/'}]
  ];
}

function renderDataCentre() {
  const st=statusMap(); const src=sourceEntries(); const files=state.data?.metadata?.files||{};
  const ready=Object.values(st).filter(v=>v.available).length;
  const gaps=Object.values(st).filter(v=>v.evidence==='gap').length;
  const summary=[['Connected layers',ready],['Registered sources',src.length],['Public data files',Object.keys(files).length||1],['Explicit data gaps',gaps]];
  qs('#dataSummary').innerHTML=`<div class="summary-grid">${summary.map(([l,v])=>`<div class="summary-item"><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`).join('')}</div>`;

  const audit=state.data?.source_audit?.sources||{};
  qs('#sourceRegistry').innerHTML=src.map(([id,s])=>{
    const url=s.system_statistics_url||s.tracker||s.hazard_maps||s.open_data||s.economic_review_2025||s.catalog||s.endpoint||s.home||s.file_api||'#';
    const label=id.replaceAll('_',' ');
    const probe=audit[id];
    const probeText=probe?.status ? probe.status.replaceAll('_',' ') : 'not probed in this bundle';
    return `<article class="source-card" data-search="${esc((label+' '+(s.note||'')+' '+(s.acquisition||'')+' '+probeText).toLowerCase())}"><span class="eyebrow">${esc(s.acquisition||'source')}</span><h3><strong>${esc(label)}</strong></h3><p>${esc(s.note||'Registered research source.')}</p><small>Connectivity: ${esc(probeText)} · connectivity is not data validation</small>${url!=='#'?`<a href="${esc(url)}" target="_blank" rel="noopener">Open source ↗</a>`:''}</article>`;
  }).join('');

  const downloads=[
    ['Public site manifest','site-data.json',`${RAW}site-data.json`],
    ['Scenario definitions','configs/scenarios_2040.yaml',`${REPO}/blob/main/configs/scenarios_2040.yaml`],
    ['Published reference registry','configs/published_2040_references.yaml',`${REPO}/blob/main/configs/published_2040_references.yaml`],
    ['Source registry','configs/sources.yaml',`${REPO}/blob/main/configs/sources.yaml`],
    ['Hourly-demand data-gap note','docs/hourly_demand_gap.md',`${REPO}/blob/main/docs/hourly_demand_gap.md`]
  ];
  Object.entries(files).forEach(([k,f])=>downloads.push([k.replaceAll('_',' '),f,`${RAW}${f}`]));
  const unique=[]; const seen=new Set(); downloads.forEach(x=>{if(!seen.has(x[2])){seen.add(x[2]);unique.push(x)}});
  qs('#downloadGrid').innerHTML=unique.map(([label,path,url])=>`<a class="download-card" href="${esc(url)}" target="_blank" rel="noopener" data-search="${esc((label+' '+path).toLowerCase())}"><div><strong>${esc(label)}</strong><small>${esc(path)}</small></div><b>↗</b></a>`).join('');

  const t=state.data?.metadata?.generated_at_utc;
  qs('#bundleTime').textContent=t?`Bundle · ${new Date(t).toLocaleString()}`:`${state.origin}`;
}

function renderPlatformMeta() {
  const t=state.data?.metadata?.generated_at_utc;
  qs('#dataOrigin').textContent = t ? `${state.origin} · refreshed ${new Date(t).toLocaleDateString()}` : state.origin;
  if(t) qs('#evidenceDate').textContent=`Research bundle ${new Date(t).toLocaleDateString()} · model horizon 2040`;
}

function bindRouteButtons(root=document) {
  qsa('[data-route]',root).forEach(el=>{
    if(el.dataset.routeBound)return;
    el.dataset.routeBound='1';
    el.addEventListener('click',e=>{e.preventDefault();navigate(el.dataset.route)});
  });
}

function navigate(route) {
  const valid=['overview','electricity','pathways','atlas','industry','data'];
  const target=valid.includes(route)?route:'overview';
  if(location.hash!==`#${target}`) history.pushState(null,'',`#${target}`);
  showView(target);
}

function showView(route) {
  if (!['overview','electricity','pathways','atlas','industry','data'].includes(route)) route='overview';
  qsa('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===route));
  qsa('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.route===route));
  qsa('.nav-link').forEach(b=>b.setAttribute('aria-current',b.dataset.route===route?'page':'false'));
  window.scrollTo({top:0,behavior:'instant'});
  if(route==='atlas')renderAtlas();
  requestAnimationFrame(()=>qsa('.view.active .js-plotly-plot').forEach(el=>window.Plotly?.Plots.resize(el)));
}

function bindInteractions() {
  bindRouteButtons();
  qs('#overviewMetricTabs')?.addEventListener('click',e=>{const b=e.target.closest('[data-metric]');if(b)renderOverview(b.dataset.metric)});
  qs('#electricityMetric')?.addEventListener('change',e=>renderElectricityChart(e.target.value));
  qs('#scenarioRail')?.addEventListener('click',e=>{const b=e.target.closest('[data-scenario]');if(b)renderScenarioLab(b.dataset.scenario)});
  qs('#stressTests')?.addEventListener('click',e=>{const b=e.target.closest('[data-stress]');if(!b)return;const id=b.dataset.stress;state.selectedStress.has(id)?state.selectedStress.delete(id):state.selectedStress.add(id);b.classList.toggle('active');b.setAttribute('aria-pressed',state.selectedStress.has(id));renderStressSelection()});
  qs('#downloadSpecification')?.addEventListener('click',downloadSpecification);
  qs('#mapFilters')?.addEventListener('click',e=>{const b=e.target.closest('[data-kind]');if(!b)return;state.mapKind=b.dataset.kind;renderAtlas()});
  qs('#mapNodeList')?.addEventListener('click',e=>{const b=e.target.closest('[data-node]');if(!b)return;const node=getNodes().find(x=>x.name===b.dataset.node);selectMapNode(node)});
  qs('#industryTabs')?.addEventListener('click',e=>{const b=e.target.closest('[data-industry]');if(!b)return;state.industryCase=b.dataset.industry;renderIndustry()});
  qs('#sourceSearch')?.addEventListener('input',e=>{const term=e.target.value.trim().toLowerCase();qsa('#sourceRegistry [data-search],#downloadGrid [data-search]').forEach(el=>el.hidden=term&&!el.dataset.search.includes(term))});
  window.addEventListener('popstate',()=>showView(location.hash.slice(1)||'overview'));
  window.addEventListener('hashchange',()=>showView(location.hash.slice(1)||'overview'));
}

function bindTheme() {
  let stored; try { stored=localStorage.getItem('k2040-theme'); } catch {}
  document.documentElement.dataset.theme=stored||'light';
  qs('#themeToggle')?.addEventListener('click',()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=next;try { localStorage.setItem('k2040-theme',next); } catch {}
    if(state.data) {renderOverview();renderElectricity();renderPathwayReferences();renderScenarioLab(state.selectedScenario);}
  });
}

function renderAll() {
  renderPlatformMeta();renderHeadline();renderOverview();renderEvidenceFeed();renderElectricity();renderPathwayReferences();renderScenarioLab();renderIndustry();renderDataCentre();
  renderConnectedEvidence();
  if (!window.Plotly) qsa('.chart:not(#scenarioInputChart)').forEach(el=>el.innerHTML='<p class="model-gate">Charts could not load. Use the data tables and downloads below.</p>');
}

async function init() {
  bindTheme();
  bindInteractions();
  try {
    await loadPlatformData();
    renderAll();
  } catch (err) {
    console.error(err);
    qs('#dataOrigin').innerHTML='The evidence snapshot could not load. <button type="button" onclick="location.reload()">Retry</button>';
    qs('#headlineMetrics').textContent='Data unavailable — please retry. No placeholder values are shown.';
  }
  showView(location.hash.slice(1)||'overview');
}

window.addEventListener('load',init);
