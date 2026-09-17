const qs=(s)=>document.querySelector(s);
const esc=(v)=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const RAW='https://raw.githubusercontent.com/abhijith-sivaprasadan/kerala2040/main/public/';
const REPO='https://github.com/abhijith-sivaprasadan/kerala2040';

const themeToggle=qs('#themeToggle');
const storedTheme=localStorage.getItem('k2040-theme');
if(storedTheme) document.documentElement.dataset.theme=storedTheme;
themeToggle?.addEventListener('click',()=>{
  const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=next;
  localStorage.setItem('k2040-theme',next);
  window.dispatchEvent(new Event('resize'));
});

async function remoteJSON(name,required=false){
  try{
    const r=await fetch(`${RAW}${name}?v=${Date.now()}`,{cache:'no-store'});
    if(!r.ok) throw new Error(`${name}: ${r.status}`);
    return await r.json();
  }catch(err){
    if(required) throw err;
    console.warn('Remote data unavailable',name,err);
    return null;
  }
}

async function loadManifest(){
  const remote=await remoteJSON('site-data.json');
  if(remote) return {data:remote,origin:'research pipeline'};
  const local=await fetch('data/site-data.json',{cache:'no-store'});
  if(!local.ok) throw new Error(`local site-data: ${local.status}`);
  return {data:await local.json(),origin:'site fallback'};
}

function statusItems(data){
  const st=data?.metadata?.status;
  if(st){
    const labels={
      sldc_daily:'Kerala SLDC daily electricity balance',baseline_summary:'Historical calibration summary',
      reservoir_storage:'Reservoir / hydro chronology',weather:'Representative-point weather',
      hourly_state_load:'Measured hourly Kerala load series',grid_india_psp:'Grid-India daily PSP cross-check'
    };
    return Object.entries(st).map(([key,v])=>({
      label:labels[key]||key.replaceAll('_',' '),state:v.available?'ready':(key==='hourly_state_load'?'gap':'progress'),
      meta:v.available?'available':(v.evidence==='gap'?'data gap':'pending')
    }));
  }
  return data?.buildStatus||[];
}

function renderStatus(data,origin){
  const items=statusItems(data);
  qs('#buildStatus').innerHTML=items.map(i=>`<div class="status-row"><i class="status-dot ${esc(i.state)}"></i><span>${esc(i.label)}</span><small>${esc(i.meta)}</small></div>`).join('');
  const box=qs('.hero-status .small-note');
  const updated=data?.metadata?.generated_at_utc;
  if(box) box.innerHTML=`Data origin: <b>${esc(origin)}</b>${updated?` · generated ${esc(new Date(updated).toLocaleString())}`:''}. Scenario outputs remain provisional until historical calibration is adequate.`;
}

const fmt=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toFixed(d):'—';
const pct=(v,d=1)=>Number.isFinite(Number(v))?`${(100*Number(v)).toFixed(d)}%`:'—';

function renderBaseline(data){
  const s=data?.baseline||data?.metadata?.baseline||null;
  const cards=s?[
    ['FY electricity consumption',`${fmt(s.consumption_twh,2)} TWh`,`${s.observed_start||''} → ${s.observed_end||''}`],
    ['In-state generation',`${fmt(s.internal_generation_twh,2)} TWh`,`${pct(s.aggregate_internal_share)} of consumption`],
    ['Net interface imports',`${fmt(s.net_import_twh,2)} TWh`,`${pct(s.aggregate_import_share)} aggregate import share`],
    ['Daily coverage',pct(s.coverage_fraction,1),`${s.rows??'—'} records · ${s.missing_days_count??'—'} missing days`],
    ['Median daily import share',pct(s.daily_import_share_median),`P95 ${pct(s.daily_import_share_p95)}`],
    ['Hydro generation',s.hydro_generation_twh!=null?`${fmt(s.hydro_generation_twh,2)} TWh`:'—',s.hydro_share_internal_generation!=null?`${pct(s.hydro_share_internal_generation)} of internal generation`:'Awaiting hydro field'],
    ['Energy-balance error',s.max_abs_balance_error_mu!=null?`${fmt(s.max_abs_balance_error_mu,3)} MU`:'—',`Gate tolerance ${fmt(s.balance_tolerance_mu,3)} MU`],
    ['Calibration gate',s.calibration_gate_pass?'PASS':'NOT PASSED',s.calibration_gate_pass?'Historical daily gate passed':'Do not treat 2040 model outputs as calibrated']
  ]:(data?.baselineCards||[]).map(x=>[x.label,x.value,x.meta]);
  qs('#baselineCards').innerHTML=cards.map(c=>`<article class="metric-card"><div class="metric-label">${esc(c[0])}</div><div class="metric-value">${esc(c[1])}</div><div class="metric-meta">${esc(c[2])}</div></article>`).join('');
  const badge=qs('#calibrationBadge');
  if(badge&&s){badge.textContent=s.calibration_gate_pass?'PASSED':'NOT PASSED';badge.classList.toggle('warning',!s.calibration_gate_pass)}
}

function chartLayout(title,yTitle=''){
  const css=getComputedStyle(document.documentElement);
  return {title:{text:title,font:{size:14}},margin:{l:58,r:22,t:50,b:45},height:330,paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',
    font:{family:'Inter, sans-serif',size:11,color:css.getPropertyValue('--text').trim()},
    xaxis:{gridcolor:css.getPropertyValue('--line').trim(),color:css.getPropertyValue('--muted').trim()},
    yaxis:{title:yTitle,gridcolor:css.getPropertyValue('--line').trim(),zeroline:false,color:css.getPropertyValue('--muted').trim()},legend:{orientation:'h',y:-.18}};
}

function renderCalibration(data){
  const el=qs('#calibrationChart'); if(!window.Plotly||!el)return;
  const st=data?.metadata?.status;
  if(st){
    const rows=[['Daily balance',st.sldc_daily?.available],['Reservoir',st.reservoir_storage?.available],['Weather',st.weather?.available],['Hourly state load',st.hourly_state_load?.available],['Baseline summary',st.baseline_summary?.available]];
    Plotly.newPlot(el,[{type:'bar',orientation:'h',y:rows.map(x=>x[0]),x:rows.map(x=>x[1]?100:0),text:rows.map(x=>x[1]?'available':'missing / pending'),textposition:'auto'}],{...chartLayout('Evidence readiness'),xaxis:{range:[0,100],ticksuffix:'%'}},{displayModeBar:false,responsive:true});
    return;
  }
  const items=data?.calibration||[];
  Plotly.newPlot(el,[{type:'bar',orientation:'h',y:items.map(x=>x.stage),x:items.map(x=>x.value)}],{...chartLayout('Evidence readiness'),xaxis:{range:[0,100],ticksuffix:'%'}},{displayModeBar:false,responsive:true});
}

function ensureDataExplorer(){
  if(qs('#connectedData')) return qs('#connectedData');
  const section=document.createElement('div'); section.id='connectedData'; section.className='connected-data';
  section.innerHTML=`
    <div class="grid-two connected-charts">
      <article class="card"><div class="card-head"><span>Daily electricity balance</span><span class="badge">SLDC</span></div><div id="dailyBalanceChart" class="chart-large"></div><p id="dailyChartNote" class="small-note"></p></article>
      <article class="card"><div class="card-head"><span>Import-dependence duration curve</span><span class="badge">derived</span></div><div id="durationChart" class="chart-large"></div><p class="small-note">Days ranked by net imports as a share of consumption.</p></article>
    </div>
    <article class="card monthly-card"><div class="card-head"><span>Monthly system balance</span><span class="badge">FY2024-25</span></div><div id="monthlyBalanceChart" class="chart-large"></div></article>
    <div class="grid-two connected-lower">
      <article class="card"><div class="card-head"><span>Published 2040 reference studies</span><span class="badge">not model outputs</span></div><div id="referenceCards" class="reference-grid"></div></article>
      <article class="card"><div class="card-head"><span>Machine-readable data</span><span class="badge">JSON</span></div><div id="downloadList" class="download-list"></div></article>
    </div>`;
  const baseline=qs('#baseline'); baseline?.appendChild(section); return section;
}

function renderDailyCharts(dailyPayload,monthlyPayload,durationPayload){
  ensureDataExplorer();
  if(!window.Plotly) return;
  const d=dailyPayload?.records||[];
  const m=monthlyPayload?.records||[];
  const dur=durationPayload?.records||[];
  if(d.length){
    const traces=[
      ['Consumption','consumption_mu'],['Internal generation','internal_generation_mu'],['Net imports','net_import_interface_mu'],['Hydro','hydel_total_mu']
    ].filter(([,k])=>d.some(r=>r[k]!=null)).map(([name,k])=>({type:'scatter',mode:'lines',name,x:d.map(r=>r.date),y:d.map(r=>r[k])}));
    Plotly.newPlot('dailyBalanceChart',traces,chartLayout('FY2024-25 daily energy','MU/day'),{displayModeBar:false,responsive:true});
    qs('#dailyChartNote').textContent=`${d.length} daily records loaded from the public research bundle.`;
  }else qs('#dailyBalanceChart').innerHTML='<div class="data-empty">Daily processed data will appear automatically when the historical pipeline publishes its bundle.</div>';
  if(dur.length) Plotly.newPlot('durationChart',[{type:'scatter',mode:'lines',x:dur.map(r=>r.rank),y:dur.map(r=>100*r.import_share),name:'Import share'}],chartLayout('Daily import-share duration curve','% of consumption'),{displayModeBar:false,responsive:true});
  else qs('#durationChart').innerHTML='<div class="data-empty">Awaiting processed daily balance.</div>';
  if(m.length){
    const traces=[['Consumption','consumption_mu'],['Internal generation','internal_generation_mu'],['Net imports','net_import_interface_mu']].filter(([,k])=>m.some(r=>r[k]!=null)).map(([name,k])=>({type:'bar',name,x:m.map(r=>r.month),y:m.map(r=>r[k])}));
    Plotly.newPlot('monthlyBalanceChart',traces,{...chartLayout('Monthly electricity balance','MU/month'),barmode:'group'},{displayModeBar:false,responsive:true});
  }else qs('#monthlyBalanceChart').innerHTML='<div class="data-empty">Awaiting processed monthly aggregation.</div>';
}

function renderReferences(data){
  ensureDataExplorer();
  const refs=data?.references||{}; const el=qs('#referenceCards'); if(!el)return;
  if(!Object.keys(refs).length){el.innerHTML='<div class="data-empty">Reference registry loading from research repository.</div>';return}
  el.innerHTML=Object.entries(refs).map(([id,r])=>{
    const vals=[];
    if(r.fy2040?.final_demand_with_td_losses_mu!=null) vals.push(`2040 demand ${fmt(r.fy2040.final_demand_with_td_losses_mu/1000,2)} TWh`);
    if(r.fy2040?.peak_demand_mw!=null) vals.push(`peak ${fmt(r.fy2040.peak_demand_mw/1000,2)} GW`);
    if(r.net_grid_demand_twh?.bau_2040!=null) vals.push(`BAU 2040 net-grid demand ${fmt(r.net_grid_demand_twh.bau_2040,2)} TWh`);
    if(r.net_grid_demand_twh?.cn50_2040!=null) vals.push(`CN50 2040 ${fmt(r.net_grid_demand_twh.cn50_2040,2)} TWh`);
    return `<div class="reference-item"><div><strong>${esc(r.title)}</strong><small>${esc(r.publisher)} · ${esc(r.year)}</small></div><p>${esc(vals.join(' · ')||r.note||r.methodology_note||'')}</p><a class="text-link" href="${esc(r.primary_url)}" target="_blank" rel="noopener">Primary source ↗</a><div class="reference-caveat">${esc(r.caveat||'External published reference; not a Kerala 2040 model result.')}</div></div>`;
  }).join('');
}

function renderDownloads(data){
  ensureDataExplorer(); const el=qs('#downloadList'); if(!el)return;
  const files=data?.metadata?.files||{};
  const labels={baseline_summary:'Baseline summary',daily_balance:'Daily balance',monthly_balance:'Monthly balance',import_duration:'Import duration curve',scenarios:'Scenario definitions',published_references:'Published references',sources:'Source registry',screening_nodes:'Screening nodes'};
  el.innerHTML=Object.entries(files).map(([k,f])=>`<a class="download-row" href="${RAW}${encodeURIComponent(f).replaceAll('%2F','/')}" target="_blank" rel="noopener"><span>${esc(labels[k]||k)}</span><code>${esc(f)}</code><b>↗</b></a>`).join('')||'<div class="data-empty">Public bundle is being generated.</div>';
}

function renderScenarios(items){
  const normalized=(items||[]).map(s=>({code:s.code||s.id?.split('_')[0]||'',name:s.name||s.id||'',type:s.type||'scenario',summary:s.summary||s.description||'',dimensions:s.dimensions||{
    'Ecology constraint':s.ecology_constraint||'—','Demand flexibility':s.demand_flexibility||'—','Interstate imports':s.import_option===false?'disabled':'enabled'
  }}));
  const buttons=qs('#scenarioButtons'); if(!buttons)return;
  buttons.innerHTML=normalized.map((s,n)=>`<button class="scenario-tab ${n===0?'active':''}" role="tab" aria-selected="${n===0?'true':'false'}" data-code="${esc(s.code)}"><strong>${esc(s.code)} · ${esc(s.name)}</strong><span>${esc(s.type)}</span></button>`).join('');
  const select=(code)=>{const s=normalized.find(x=>x.code===code)||normalized[0];if(!s)return;document.querySelectorAll('.scenario-tab').forEach(b=>{const active=b.dataset.code===s.code;b.classList.toggle('active',active);b.setAttribute('aria-selected',active?'true':'false')});qs('#scenarioCode').textContent=s.code;qs('#scenarioName').textContent=s.name;qs('#scenarioType').textContent=s.type;qs('#scenarioSummary').textContent=s.summary;qs('#scenarioDimensions').innerHTML=Object.entries(s.dimensions).map(([k,v])=>`<div class="dimension"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('')};
  buttons.onclick=e=>{const b=e.target.closest('.scenario-tab');if(b)select(b.dataset.code)}; select(normalized[0]?.code);
}

function renderMap(nodes){
  const el=qs('#map'),list=qs('#mapNodeList'); if(!window.L||!el||!list||!nodes?.length)return;
  if(el._leaflet_id){el._leaflet_id=null;el.innerHTML=''}
  const map=L.map(el,{zoomControl:true,scrollWheelZoom:false}).setView([10.15,76.55],7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const colors={grid:'#115f9a',storage:'#0a7c66',wind:'#527a32',circular:'#a06b00',marine:'#247e9d'}; const markers=new Map();
  nodes.forEach(n=>{const color=colors[n.kind]||'#666';const icon=L.divIcon({className:'',html:`<span style="display:block;width:15px;height:15px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 5px rgba(0,0,0,.35)"></span>`,iconSize:[15,15],iconAnchor:[7,7]});const m=L.marker([n.lat,n.lon],{icon}).addTo(map).bindPopup(`<strong>${esc(n.name)}</strong><br><span>${esc(n.note)}</span>`);markers.set(n.name,m)});
  list.innerHTML=nodes.map(n=>`<button class="node-button" data-node="${esc(n.name)}"><strong>${esc(n.name)}</strong><span>${esc(n.note)}</span></button>`).join('');
  list.onclick=e=>{const b=e.target.closest('.node-button');if(!b)return;const n=nodes.find(x=>x.name===b.dataset.node),m=markers.get(b.dataset.node);if(n&&m){map.setView([n.lat,n.lon],10);m.openPopup()}};
}

function ensureSources(data){
  if(qs('#sourceRegistry'))return;
  const methods=qs('#methods'); if(!methods)return;
  const wrap=document.createElement('div');wrap.id='sourceRegistry';wrap.className='source-registry card';
  const sources=data?.sources||{};
  wrap.innerHTML=`<div class="card-head"><span>Connected source registry</span><span class="badge">provenance</span></div><div class="source-table">${Object.entries(sources).map(([k,v])=>`<div class="source-row"><strong>${esc(k.replaceAll('_',' '))}</strong><span>${esc(v.acquisition||'source')}</span><code>${esc(v.system_statistics_url||v.file_api||v.endpoint||v.home||'')}</code><small>${esc(v.note||'')}</small></div>`).join('')}</div>`;
  methods.appendChild(wrap);
}

async function init(){
  try{
    const {data,origin}=await loadManifest();
    renderStatus(data,origin); renderBaseline(data); renderCalibration(data);
    renderScenarios(data.scenarios||[]); renderMap(data.screening_nodes||data.screeningNodes||[]);
    renderReferences(data); renderDownloads(data); ensureSources(data);
    const [daily,monthly,duration]=await Promise.all([remoteJSON('daily-balance.json'),remoteJSON('monthly-balance.json'),remoteJSON('import-duration.json')]);
    renderDailyCharts(daily,monthly,duration);
  }catch(err){
    console.error(err);
    qs('#buildStatus').innerHTML='<div class="status-row"><i class="status-dot gap"></i><span>Dashboard data manifest unavailable</span><small>check build</small></div>';
  }
}
window.addEventListener('load',init);
