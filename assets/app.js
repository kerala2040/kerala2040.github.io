const qs=(s)=>document.querySelector(s);
const esc=(v)=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

const themeToggle=qs('#themeToggle');
const storedTheme=localStorage.getItem('k2040-theme');
if(storedTheme) document.documentElement.dataset.theme=storedTheme;
themeToggle?.addEventListener('click',()=>{
  const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=next;
  localStorage.setItem('k2040-theme',next);
});

function renderStatus(items){
  qs('#buildStatus').innerHTML=items.map(i=>`<div class="status-row"><i class="status-dot ${esc(i.state)}"></i><span>${esc(i.label)}</span><small>${esc(i.meta)}</small></div>`).join('');
}

function renderBaseline(items){
  qs('#baselineCards').innerHTML=items.map(i=>`<article class="metric-card"><div class="metric-label">${esc(i.label)}</div><div class="metric-value">${esc(i.value)}</div><div class="metric-meta">${esc(i.meta)}</div><div class="metric-state"><i style="width:${Math.max(0,Math.min(100,Number(i.progress)||0))}%"></i></div></article>`).join('');
}

function renderScenarios(items){
  const buttons=qs('#scenarioButtons');
  buttons.innerHTML=items.map((s,n)=>`<button class="scenario-tab ${n===0?'active':''}" role="tab" aria-selected="${n===0?'true':'false'}" data-code="${esc(s.code)}"><strong>${esc(s.code)} · ${esc(s.name)}</strong><span>${esc(s.type)}</span></button>`).join('');
  const select=(code)=>{
    const s=items.find(x=>x.code===code)||items[0];
    if(!s) return;
    document.querySelectorAll('.scenario-tab').forEach(b=>{const active=b.dataset.code===s.code;b.classList.toggle('active',active);b.setAttribute('aria-selected',active?'true':'false')});
    qs('#scenarioCode').textContent=s.code;
    qs('#scenarioName').textContent=s.name;
    qs('#scenarioType').textContent=s.type;
    qs('#scenarioSummary').textContent=s.summary;
    qs('#scenarioDimensions').innerHTML=Object.entries(s.dimensions).map(([k,v])=>`<div class="dimension"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('');
  };
  buttons.addEventListener('click',e=>{const b=e.target.closest('.scenario-tab');if(b)select(b.dataset.code)});
  select(items[0]?.code);
}

function renderCalibration(items){
  const el=qs('#calibrationChart');
  if(!window.Plotly||!el) return;
  const labels=items.map(x=>x.stage);
  const vals=items.map(x=>x.value);
  const css=getComputedStyle(document.documentElement);
  Plotly.newPlot(el,[{type:'bar',orientation:'h',y:labels,x:vals,hovertemplate:'%{y}: %{x}%<extra></extra>',marker:{color:vals.map(v=>v>=90?css.getPropertyValue('--accent').trim():v>=50?css.getPropertyValue('--warn').trim():css.getPropertyValue('--muted').trim())}}],{
    margin:{l:155,r:20,t:8,b:30},height:255,paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',
    xaxis:{range:[0,100],ticksuffix:'%',gridcolor:css.getPropertyValue('--line').trim(),zeroline:false,color:css.getPropertyValue('--muted').trim()},
    yaxis:{autorange:'reversed',color:css.getPropertyValue('--muted').trim()},font:{family:'Inter, sans-serif',size:11,color:css.getPropertyValue('--text').trim()},showlegend:false
  },{displayModeBar:false,responsive:true});
}

function renderMap(nodes){
  const el=qs('#map');
  const list=qs('#mapNodeList');
  if(!window.L||!el) return;
  const map=L.map(el,{zoomControl:true,scrollWheelZoom:false}).setView([10.15,76.55],7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const colors={grid:'#115f9a',storage:'#0a7c66',wind:'#527a32',circular:'#a06b00',marine:'#247e9d'};
  const markers=new Map();
  nodes.forEach(n=>{
    const color=colors[n.kind]||'#666';
    const icon=L.divIcon({className:'',html:`<span style="display:block;width:15px;height:15px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 5px rgba(0,0,0,.35)"></span>`,iconSize:[15,15],iconAnchor:[7,7]});
    const m=L.marker([n.lat,n.lon],{icon}).addTo(map).bindPopup(`<strong>${esc(n.name)}</strong><br><span>${esc(n.note)}</span>`);
    markers.set(n.name,m);
  });
  list.innerHTML=nodes.map(n=>`<button class="node-button" data-node="${esc(n.name)}"><strong>${esc(n.name)}</strong><span>${esc(n.note)}</span></button>`).join('');
  list.addEventListener('click',e=>{const b=e.target.closest('.node-button');if(!b)return;const n=nodes.find(x=>x.name===b.dataset.node);const m=markers.get(b.dataset.node);if(n&&m){map.setView([n.lat,n.lon],10);m.openPopup()}});
}

async function init(){
  try{
    const r=await fetch('data/site-data.json',{cache:'no-store'});
    if(!r.ok) throw new Error(`site-data ${r.status}`);
    const data=await r.json();
    renderStatus(data.buildStatus||[]);
    renderBaseline(data.baselineCards||[]);
    renderScenarios(data.scenarios||[]);
    renderCalibration(data.calibration||[]);
    renderMap(data.screeningNodes||[]);
  }catch(err){
    console.error(err);
    qs('#buildStatus').innerHTML='<div class="status-row"><i class="status-dot gap"></i><span>Dashboard data manifest unavailable</span><small>check build</small></div>';
  }
}

window.addEventListener('load',init);
