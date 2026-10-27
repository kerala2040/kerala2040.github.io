/* Kerala2040 Evidence Atlas, 27 October 2026.
 * Measured/source-reported statistics are kept separate from retrospective analyses.
 * SVG renders offline, supports keyboard-native controls and exports.
 */
(()=>{
"use strict";
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>Array.from(p.querySelectorAll(s));
const safe=x=>String(x??"—").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=(x,d=0)=>Number.isFinite(+x)?Number(x).toLocaleString("en-IN",{maximumFractionDigits:d,minimumFractionDigits:d}):"—";
const C={green:"#164c3b",mint:"#66947c",gold:"#c9a44c",red:"#b65e44",dark:"#22382e",grid:"#e1dac9",grey:"#65736a",paper:"#fbf7ec"};
const D={};
const sources={history:"data/kseb-history.json",ml:"data/daily-demand-ml-robustness-v0.2.json",gen:"data/research-installed-generation.json",refs:"data/published-references.json",cea:"data/cea-resource-adequacy.json",nodes:"data/screening-nodes.json",scenarios:"data/scenarios.json",projects:"data/kseb-projects.json"};
const urls={history:"https://github.com/kerala2040/kerala2040.github.io/blob/main/data/kseb-history.json",ml:"https://github.com/abhijith-sivaprasadan/kerala2040/blob/main/docs/DAILY_DEMAND_ML_ROBUSTNESS_V0_2.md",gen:"https://spb.kerala.gov.in/sites/default/files/2026-01/ER%202025%20Volume1%20Eng%20final.pdf"};
const tooltip=(label)=>"<title>"+safe(label)+"</title>";
const svg=(body,w=780,h=315,label="Chart")=>'<svg class="v-chart" viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+safe(label)+'">'+body+"</svg>";
const text=(x,y,value,extra="")=>'<text x="'+x+'" y="'+y+'" '+extra+'>'+safe(value)+"</text>";
const E={font:'font-family="Inter, sans-serif"',mono:'font-family="IBM Plex Mono, monospace"'};
function frame(el,title,kicker,inside,explain,url){
 el.innerHTML='<div class="viz-head"><div><span class="viz-kicker">'+safe(kicker)+'</span><h3>'+safe(title)+'</h3></div><button class="viz-download" type="button" title="Download this chart as SVG" aria-label="Download chart as SVG"><span aria-hidden="true">↓</span> SVG</button></div><div class="viz-content">'+inside+'</div><div class="viz-description">'+safe(explain)+(url?' <a href="'+url+'" target="_blank" rel="noopener noreferrer">View source ↗</a>':"")+"</div>";
 const b=$(".viz-download",el);
 b.onclick=()=>{
 const target=$("svg.v-chart",el);if(!target)return;
 const output=new Blob([new XMLSerializer().serializeToString(target)],{type:"image/svg+xml;charset=utf-8"});
 const href=URL.createObjectURL(output),a=document.createElement("a");
 a.href=href;a.download="kerala2040-"+(el.dataset.viz||"chart")+".svg";a.click();
 setTimeout(()=>URL.revokeObjectURL(href),3000);
 };
}
function legend(items){return '<div class="viz-legend">'+items.map(x=>'<span><i style="background:'+x.color+'"></i>'+safe(x.name)+'</span>').join("")+"</div>";}
function lineChart(series,unit="",percent=false,title="Historical electricity series"){
 let valid=series.flatMap(s=>s.rows).filter(r=>Number.isFinite(+r.value)&&/^\d{4}/.test(r.year));
 if(!valid.length)return svg(text(50,50,"No admitted observations for selected period"),780,310,title);
 const w=780,h=310,l=76,r=32,t=25,b=54,iw=w-l-r,ih=h-t-b,base=h-b;
 const years=valid.map(r=>parseInt(r.year.slice(0,4))),xmin=Math.min(...years),xmax=Math.max(...years),spread=Math.max(1,xmax-xmin);
 const values=valid.map(r=>+r.value),max=Math.max(1,...values)*1.07;
 const X=x=>l+iw*(parseInt(x.slice(0,4))-xmin)/spread,Y=v=>base-ih*v/max;
 let p="";
 for(let i=0;i<=4;i++){const y=t+ih*i/4; const value=max*(4-i)/4;p+='<line x1="'+l+'" y1="'+y+'" x2="'+(w-r)+'" y2="'+y+'" stroke="'+C.grid+'"/>'+text(l-12,y+4,(percent?fmt(value,0)+"%":fmt(value,max>=10000?0:1)),'text-anchor="end" font-size="11" fill="'+C.grey+'" '+E.mono);}
 for(let i=0;i<6;i++){const yy=Math.round(xmin+spread*i/5);p+=text(l+iw*i/5,base+28,yy,'text-anchor="middle" font-size="11" fill="'+C.grey+'" '+E.mono);}
 p+='<line x1="'+l+'" y1="'+base+'" x2="'+(w-r)+'" y2="'+base+'" stroke="'+C.grey+'"/>';
 for(const s of series){
 const pts=s.rows.filter(o=>Number.isFinite(+o.value)&&/^\d{4}/.test(o.year));
 if(!pts.length)continue;
 const d=pts.map((o,i)=>(i?"L":"M")+X(o.year).toFixed(2)+" "+Y(+o.value).toFixed(2)).join(" ");
 p+='<path class="v-line" d="'+d+'" fill="none" stroke="'+s.color+'" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/>';
 pts.filter((o,i)=>i===0||i===pts.length-1).forEach(o=>p+='<circle class="v-endpoint" cx="'+X(o.year)+'" cy="'+Y(+o.value)+'" r="4.5" fill="'+s.color+'">'+tooltip(s.name+", "+o.year+": "+fmt(o.value,2)+" "+unit)+"</circle>");
 }
 return svg(p,w,h,title);
}
function trends(el){
 const H=D.history;
 const choices=[["annual_energy_balance","Power purchased/import (source label)","power_purchased_import_mu","MU"],
 ["installed_capacity","Installed generation capacity","mw","MW"],
 ["annual_generation","Annual generation","mu","MU"],
 ["total_consumers","Total electricity consumers","count","connections"],
 ["per_capita_consumption","Per-capita use","kwh","kWh"],
 ["td_loss","Transmission and distribution losses","pct","%"],
 ["connected_load","Connected load","mw","MW"]];
 const dropdown='<label class="viz-control">Historical series <select aria-label="Historical electricity series">'+choices.map(x=>'<option value="'+x[0]+'"'+(x[0]===(el.dataset.default||"annual_energy_balance")?" selected":"")+'>'+safe(x[1])+"</option>").join("")+"</select></label>";
 frame(el,"Historical electricity trends","Official KSEB export / annual",dropdown+'<div class="viz-plot"></div>',"Change series without changing the underlying source coverage. Fiscal years and units remain as published; no measured hourly chronology is inferred.",urls.history);
 const render=()=>{const key=$("select",el).value,choice=choices.find(x=>x[0]===key),rows=D.history.series[key].filter(r=>r.year),kind=choice[2];
 $(".viz-plot",el).innerHTML=lineChart([{name:choice[1],rows:rows.map(r=>({year:r.year,value:r[kind]})),color:C.green}],choice[3],kind==="pct",choice[1])+
 '<p class="viz-aside">Source dates: '+safe(rows[0]?.year)+" to "+safe(rows[rows.length-1]?.year)+" · "+rows.length+" annual entries</p>";
 animateChart(el);};
 $("select",el).onchange=()=>{const p=$(".viz-plot",el);p.classList.remove("viz-swap-in");void p.offsetWidth;p.classList.add("viz-swap-in");render();};
 render();
}
function capacity(el){
 const m=D.gen.official_headline.technology_mix_mw;
 const items=[["Hydropower",m.hydro,C.green],["Solar",m.solar,C.gold],["Thermal",m.thermal,C.red],["Wind",m.wind,C.mint]];
 const total=items.reduce((s,x)=>s+x[1],0),cx=210,cy=155,R=100,r=64;
 const polar=(rad,rr)=>[cx+rr*Math.cos(rad),cy+rr*Math.sin(rad)];
 let a=-Math.PI/2,out="";
 for(const [name,n,color] of items){const b=a+2*Math.PI*n/total,pts=[polar(a,R),polar(b,R),polar(b,r),polar(a,r)];
 const d="M"+pts[0].join(" ")+"A"+R+" "+R+" 0 "+(b-a>Math.PI?1:0)+" 1 "+pts[1].join(" ")+"L"+pts[2].join(" ")+"A"+r+" "+r+" 0 "+(b-a>Math.PI?1:0)+" 0 "+pts[3].join(" ")+"Z";
 out+='<path class="v-wedge" d="'+d+'" fill="'+color+'" stroke="'+C.paper+'" stroke-width="2">'+tooltip(name+": "+fmt(n,2)+" MW")+"</path>";a=b;}
 out+=text(cx,cy-5,"4,412.14",'text-anchor="middle" font-size="27" font-weight="700" fill="'+C.green+'"')+
 text(cx,cy+19,"MW (reported)",'text-anchor="middle" font-size="13" fill="'+C.grey+'"');
 items.forEach(([name,value,color],i)=>{const y=80+i*52;out+='<rect x="410" y="'+(y-12)+'" width="13" height="13" fill="'+color+'"/>'+text(435,y,name,'font-size="14" fill="'+C.dark+'"')+text(730,y,fmt(value,2)+" MW",'text-anchor="end" '+E.mono+' font-size="13" fill="'+C.dark+'"');});
 frame(el,"Installed generation by technology","31 March 2025 / reported nameplate",svg(out,760,315,"Kerala officially reported installed capacity mix"),"The rounded technology categories sum to 4,412.15 MW, 0.01 MW above the official total. MW installed does not equal hourly available generation.",urls.gen);
}
function balance(el){
 const rows=D.history.series.annual_energy_balance;
 const series=[{name:"Energy available for sale",key:"energy_available_for_sale_mu",color:C.green},{name:"Sales incl. open access",key:"sales_incl_open_access_mu",color:C.gold}].map(s=>({...s,rows:rows.map(r=>({year:r.year,value:r[s.key]}))}));
 frame(el,"Electricity balance over time","KSEB historical export / MU",lineChart(series,"MU",false,"Annual energy available for sale and sales")+legend(series),"Annual source categories have distinct accounting definitions. These are not summed with the FY2024–25 SLDC operational daily series.",urls.history);
}
function network(el){
 const rows=D.history.series.network;
 const series=[{name:"11 kV network",key:"line_11kv_km",color:C.green},{name:"LT network",key:"lt_line_km",color:C.gold}].map(s=>({...s,rows:rows.map(r=>({year:r.year,value:r[s.key]}))}));
 frame(el,"Distribution line infrastructure","Official KSEB export / km",lineChart(series,"km",false,"Historical distribution network lengths")+legend(series),"Distribution-line inventories are historic network statistics. They do not determine transmission reliability or contingency risk.",urls.history);
}
const miss=new Set(["2024-08-12","2024-09-06","2024-09-20","2024-10-26","2024-11-17","2024-11-30","2024-12-16","2025-02-19","2025-03-05","2025-03-10","2025-03-17"]);
function coverage(el){
 const start=Date.UTC(2024,3,1);let blocks="",seen=0;
 for(let day=0;day<365;day++){const date=new Date(start+day*86400000).toISOString().slice(0,10),missing=miss.has(date);seen+=missing?0:1;
 const col=Math.floor(day/7),row=day%7,x=43+col*13.2,y=45+row*18;
 blocks+='<rect class="v-day" x="'+x.toFixed(1)+'" y="'+y+'" width="10.7" height="13" rx="1.3" fill="'+(missing?C.red:C.green)+'" opacity="'+(missing?"1":".79")+'">'+tooltip(date+" — "+(missing?"daily source missing":"archived daily report"))+"</rect>";
 }
 const extra=text(43,20,"01 Apr 2024 – 31 Mar 2025",'font-size="12" fill="'+C.grey+'" '+E.mono)+blocks+
 text(43,209,"354 observed source days",'font-size="15" font-weight="700" fill="'+C.green+'"')+text(43,231,"11 reports absent from archive",'font-size="13" fill="'+C.red+'"');
 frame(el,"Daily report coverage","Kerala SLDC / source-day calendar",svg(extra,770,252,"FY2024-25 SLDC daily report coverage"),"Colored cells represent archived original report dates, not measured hourly demand. Absent reports are not imputed.","https://github.com/abhijith-sivaprasadan/kerala2040/blob/main/data/external/sldc_fy2024_25/qa_report.json");
}
function signedBars(rows,series,min,max,title,unit="%"){
 const w=780,h=330,l=187,r=40,t=22,b=47,iw=w-l-r,range=max-min,X=v=>l+iw*(v-min)/range;
 let s="",zero=X(0);for(const tval of [-40,-20,0,20,40,60].filter(x=>x>=min&&x<=max)){const x=X(tval);
 s+='<line x1="'+x+'" y1="'+t+'" x2="'+x+'" y2="'+(h-b)+'" stroke="'+(tval===0?C.grey:C.grid)+'" stroke-width="'+(tval===0?1.5:1)+'"/>'+text(x,h-17,tval+unit,'text-anchor="middle" font-size="10" fill="'+C.grey+'" '+E.mono);}
 rows.forEach((row,i)=>{const y=32+i*34;s+=text(l-10,y+12,row.label,'text-anchor="end" font-size="12" fill="'+C.dark+'"');
 series.forEach((key,j)=>{const value=+row[key.id],other=X(value),start=Math.min(other,zero),width=Math.max(1,Math.abs(other-zero)),yy=y+j*12;
 s+='<rect class="v-bar" x="'+start+'" y="'+yy+'" width="'+width+'" height="10" rx="1" fill="'+key.color+'">'+tooltip(row.label+" / "+key.name+": "+fmt(value,2)+unit)+"</rect>";});
 });
 return svg(s,w,h,title);
}
function folds(el){
 const m=D.ml,rows=m.fold_weather_rmse_reduction_pct.map(f=>({label:f.fold,xgboost:f.xgboost,lightgbm:f.lightgbm}));
 const keys=[{id:"xgboost",name:"XGBoost",color:C.green},{id:"lightgbm",name:"LightGBM",color:C.gold}];
 frame(el,"Monthly weather-added RMSE skill","Retrospective same-day ERA5 / FY2024–25",signedBars(rows,keys,-12,70,"Signed RMSE reduction from adding ERA5")+legend(keys),
 "Positive = improved against calendar-only; negative = deterioration. FY2024–25 is analysis-exposed, not a pristine independent holdout.",urls.ml);
}
function rmse(el){
 const m=D.ml.rolling_summary,rows=[["XGBoost · calendar",m.xgboost.pooled_calendar_only.rmse_mu,C.gold],["XGBoost · +ERA5",m.xgboost.pooled_weather.rmse_mu,C.green],["LightGBM · calendar",m.lightgbm.pooled_calendar_only.rmse_mu,C.gold],["LightGBM · +ERA5",m.lightgbm.pooled_weather.rmse_mu,C.green]];
 let b="",max=5.1,barX=252,scale=460/max;
 rows.forEach(([label,v,col],i)=>{const y=32+i*58;b+=text(barX-14,y+20,label,'text-anchor="end" font-size="13" fill="'+C.dark+'"')+
 '<rect x="'+barX+'" y="'+y+'" width="'+(scale*max)+'" height="28" fill="#ece5d6"/>'+
 '<rect class="v-bar" x="'+barX+'" y="'+y+'" width="'+(scale*v)+'" height="28" fill="'+col+'">'+tooltip(label+": "+fmt(v,3)+" MU/day")+"</rect>"+
 text(barX+scale*v+9,y+19,fmt(v,3),'font-size="12" fill="'+C.dark+'" '+E.mono);});
 frame(el,"Retrospective prediction error","Seven monthly test windows / RMSE MU per day",svg(b,790,284,"RMSE comparison, smaller is better"),
 "The same observed daily SLDC targets are compared using calendar-only and same-day weather-augmented models. This does not establish operational day-ahead forecasting skill.",urls.ml);
}
function ablation(el){
 const source=D.ml.xgboost_feature_group_ablation;const rows=source.variants.map(v=>({label:v.variant.replaceAll("_"," ").replace("all except","without"),score:v.rmse_reduction_vs_calendar_pct}));
 frame(el,"Weather-feature sensitivity","XGBoost / Jan–Mar 2025",signedBars(rows,[{id:"score",name:"vs calendar",color:C.green}],-50,65,"XGBoost feature ablation, signed weather-added RMSE %"),
 "One experimental three-month ablation. Negative signed improvement means worse error; results depend on model configuration and are not causal effects.",urls.ml);
 // Distinguish deteriorating bars directly.
 $$(".v-bar",el).forEach((node,i)=>{if(rows[i]?.score<0)node.setAttribute("fill",C.red);});
}
function boundary(el){
 const b='<rect x="20" y="23" width="344" height="160" rx="3" fill="#e9f0e7" stroke="#a5bda8"/>'+
 text(40,51,"OFFICIAL ANNUAL CONSUMER-SIDE",'font-size="11" letter-spacing="1.2" fill="'+C.green+'" '+E.mono)+
 text(40,92,"29,311.76 MU",'font-size="29" font-weight="700" fill="'+C.green+'"')+
 text(40,119,"FY2024–25 · Economic Review 2025",'font-size="13" fill="'+C.dark+'"')+
 text(40,144,"Published annual reporting series",'font-size="12" fill="'+C.grey+'"')+
 '<rect x="407" y="23" width="350" height="160" rx="3" fill="#f6eddb" stroke="#dec88f"/>'+
 text(429,51,"SLDC DAILY OPERATIONAL",'font-size="11" letter-spacing="1.2" fill="'+C.dark+'" '+E.mono)+
 text(429,92,"30,666.2569 MU",'font-size="25" font-weight="700" fill="'+C.green+'"')+
 text(429,119,"354 observed report dates only",'font-size="13" fill="'+C.dark+'"')+
 text(429,144,"11 days unavailable; different boundary",'font-size="12" fill="'+C.grey+'"')+
 '<path d="M366 105h39" stroke="'+C.red+'" stroke-width="2" stroke-dasharray="4 5"/>'+
 text(386,208,"NOT DIRECTLY COMPARABLE",'text-anchor="middle" font-size="12" font-weight="700" fill="'+C.red+'" '+E.mono);
 frame(el,"Two distinct electricity measures","Reporting-boundary diagram",svg(b,780,226,"Annual consumer statistics and daily operational reports have distinct measurement boundaries"),
 "These values cannot be reconciled by dividing one by the other or treating missing operating days as zero. The difference is not a verified loss, dispatch discrepancy or shortage.",
 "https://github.com/abhijith-sivaprasadan/kerala2040/blob/main/docs/RESEARCH_FREEZE_2026-10-23.md");
}
function sites(el){
 const points=[["Thiruvananthapuram",8.5241,76.9366],["Kochi",9.9312,76.2673],["Palakkad",10.7867,76.6548],["Kozhikode",11.2588,75.7804],["Kannur",11.8745,75.3704]];
 const X=lon=>45+(lon-74.8)/2.8*430,Y=lat=>270-(lat-7.9)/4.7*230;
 let b="";for(let i=0;i<=4;i++){const lat=8+i,bY=Y(lat);b+='<line x1="43" y1="'+bY+'" x2="502" y2="'+bY+'" stroke="'+C.grid+'"/>'+text(30,bY+4,lat+"°",'text-anchor="end" font-size="11" fill="'+C.grey+'"');}
 let cursor=47;points.forEach(([name,lat,lon],i)=>{
 const x=X(lon),y=Y(lat),textY=50+i*46;
 b+='<circle class="v-point" cx="'+x+'" cy="'+y+'" r="6" fill="'+C.green+'" stroke="'+C.paper+'" stroke-width="2">'+tooltip(name+": "+lat+"°N, "+lon+"°E")+"</circle>"+
 '<line x1="'+(x+9)+'" y1="'+y+'" x2="525" y2="'+textY+'" stroke="'+C.gold+'" stroke-width="1" opacity=".65"/>'+
 text(535,textY+4,name,'font-size="12" fill="'+C.dark+'"');
 });
 frame(el,"Five representative ERA5 centres","Research locations / geographical coordinates",svg(b,800,305,"ERA5 five geographical sample points by coordinate, not a Kerala boundary map"),
 "Lat–lon point diagram, not a political or state boundary map. The five points are not observed weather stations or a load-weighted statewide average.",
 "https://github.com/abhijith-sivaprasadan/kerala2040");
}
function budget(el){
 const wps=[["WP0 · literature/protocol",35],["WP1 · source QA/recovery",90],["WP2 · multiyear statistics",110],["WP3 · hydro evidence triage",35],["WP4 · optional scenarios",20],["WP5 · manuscript/publication",110]];
 let b="";const max=110;wps.forEach(([name,h],i)=>{const y=20+i*39;
 b+=text(257,y+16,name,'text-anchor="end" font-size="13" fill="'+C.dark+'"')+
 '<rect x="274" y="'+y+'" width="384" height="21" rx="1" fill="#eee8d9"/>'+
 '<rect class="v-bar" x="274" y="'+y+'" width="'+(h/max*384)+'" height="21" rx="1" fill="'+(i===4?C.gold:C.green)+'">'+tooltip(name+": "+h+" planned hours")+"</rect>"+
 text(687,y+15,h+" h",'font-size="12" fill="'+C.dark+'" '+E.mono);});
 frame(el,"One-year research work allocation","2026–27 charter / planned not completed",svg(b,770,273,"Planned 400-hour research work packages"),"400 committed hours across 50 active weeks, with another 100 hours uncommitted contingency. These are plans, not timesheets or completed deliverables.");
}
function stages(el){
 const labels=[["SOURCE","Official records"],["BOUNDARY","Series definition"],["QA","Coverage and units"],["TEST","Chronological comparison"],["REPORT","Claim and limits"]];
 let b="";labels.forEach(([name,detail],i)=>{const x=10+i*158;
 b+='<rect x="'+x+'" y="35" width="147" height="95" rx="3" fill="'+(i===4?"#e5eddc":"#f4ecdc")+'" stroke="'+(i===4?C.mint:C.gold)+'"/>'+
 text(x+13,65,name,'font-size="13" font-weight="700" fill="'+C.green+'" '+E.mono)+text(x+13,92,detail,'font-size="11" fill="'+C.dark+'"');
 if(i!==4)b+='<path d="M'+(x+148)+' 82h8m-3-3 3 3-3 3" stroke="'+C.green+'" fill="none"/>';
 });
 frame(el,"Research evidence pipeline","Methodology / qualification before inference",svg(b,795,166,"Source admission through qualification, comparison and bounded reporting"),"Flowchart shows the methodological order, not a statement that every new-source or multiyear validation gate has been passed.");
}
function milestones(el){
 const gates=[["Nov 2026","Protocol"],["Jan 2027","A0 prospectus"],["Mar 2027","Weather go/no-go"],["Jun 2027","Hydro gate"],["Aug 2027","Claims cutoff"],["Oct 2027","Research freeze"]];
 let b='<path d="M58 126H724" fill="none" stroke="'+C.gold+'" stroke-width="2"/>';
 gates.forEach(([when,what],i)=>{const x=58+i*133;
 b+='<circle class="v-point" cx="'+x+'" cy="126" r="7" fill="'+(i===5?C.gold:C.green)+'" stroke="'+C.paper+'" stroke-width="2"/>'+
 text(x,87,when,'text-anchor="middle" font-size="12" fill="'+C.green+'" '+E.mono)+
 text(x,160,what,'text-anchor="middle" font-size="11" fill="'+C.dark+'"');});
 frame(el,"Research decision gates","Forward programme / uncompleted milestones",svg(b,790,188,"Planned research decision dates 2026-2027"),
 "A schedule, not publication or independent expert acceptance. Outcomes depend on source data, scientific novelty, reproducibility, rights and resources.");
}

function outlook(el){
 const refs=D.refs.references,c=refs.cstep_2024,cn=refs.kerala_cn50_2026;
 const rows=[
 {name:"CSTEP · 2040 demand incl. losses",v:c.fy2040.final_demand_with_td_losses_mu/1000,source:"CSTEP 2024"},
 {name:"CN50 · 2040 BAU net-grid",v:cn.net_grid_demand_twh.bau_2040,source:"CN50 2026"},
 {name:"CN50 · 2040 pathway net-grid",v:cn.net_grid_demand_twh.cn50_2040,source:"CN50 2026"}];
 let b="";rows.forEach((r,i)=>{const y=47+i*77;
 b+=text(14,y-17,r.name,'font-size="13" fill="'+C.dark+'"')+
 '<rect x="14" y="'+y+'" width="660" height="26" fill="#eee8dc"/>'+
 '<rect class="v-bar" x="14" y="'+y+'" width="'+(r.v/100*660)+'" height="26" fill="'+(i===0?C.gold:i===1?C.mint:C.green)+'">'+tooltip(r.source+": "+fmt(r.v,2)+" TWh")+"</rect>"+
 text(693,y+17,fmt(r.v,2)+" TWh",'font-size="13" fill="'+C.dark+'" '+E.mono);
 });
 frame(el,"Published 2040 outlooks — distinct scopes","External scenario studies, not Kerala2040 predictions",svg(b,800,294,"Three external published scenario demand values with different accounting boundaries"),
 "CSTEP 2024 demand including T&D losses is NOT the same variable as the 2026 CN50 net-grid demands. These bars are separately attributed published projections, not a compatible scenario leaderboard.",
 "https://cstep.in/publication/kerala-energy-transition-roadmap-2040/");
}
function frequency(el){
 const bins=D.cea.hourly_demand_2024_25.frequency_bins;
 const max=Math.max(...bins.map(b=>b.hours)),top=27,base=240,w=780,left=60,inner=680;
 let s="";
 for(let tick=0;tick<=4;tick++){const v=Math.round(max*tick/4),y=base-(v/max)*(base-top);
 s+='<line x1="'+left+'" x2="'+(left+inner)+'" y1="'+y+'" y2="'+y+'" stroke="'+C.grid+'"/>'+text(left-10,y+4,fmt(v),'text-anchor="end" font-size="11" fill="'+C.grey+'"');
 }
 bins.forEach((row,i)=>{const x=left+i*84,barh=row.hours/max*(base-top),bw=54;
 s+='<rect class="v-bar" x="'+x+'" y="'+(base-barh)+'" width="'+bw+'" height="'+barh+'" fill="'+(i===3?C.gold:C.green)+'">'+tooltip(row.min_mw+"–"+row.max_mw+" MW: "+fmt(row.hours)+" hours in CEA published frequency table")+"</rect>"+
 text(x+bw/2,base+19,(row.min_mw/1000).toFixed(1)+"–"+(row.max_mw/1000).toFixed(1),'text-anchor="middle" font-size="11" fill="'+C.dark+'"');
 });
 s+=text(390,286,"Demand bins (GW)",'text-anchor="middle" font-size="12" fill="'+C.grey+'"');
 frame(el,"CEA demand frequency distribution","Official study / FY2024–25 aggregate bins",svg(s,780,300,"CEA FY2024-25 demand frequency by 500 MW bins"),
 "Aggregated 8,760-hour frequency counts reported by CEA; the authentic underlying interval chronology was not provided for independent reconstruction or dispatch validation.",
 D.cea.source.landing_page);
}
function screening(el){
 const points=D.nodes.records,kinds=[...new Set(points.map(r=>r.kind))];
 const select='<label class="viz-control">Location class <select aria-label="Map location class"><option value="all">All research nodes</option>'+kinds.map(k=>'<option value="'+safe(k)+'">'+safe(k[0].toUpperCase()+k.slice(1))+"</option>").join("")+"</select></label>";
 frame(el,"Exploratory locations and research nodes","Schematic Kerala coordinate atlas / not an approved siting map",select+'<div class="viz-plot"></div>',
 "Approximate research markers, not measured electrical asset topology, interconnection points, legal sites or the complete state grid. Filter to see intended case-study type.",
 "https://github.com/kerala2040/kerala2040.github.io/blob/main/data/screening-nodes.json");
 const render=()=>{
 const filter=$("select",el).value,chosen=points.filter(r=>filter==="all"||r.kind===filter),X=x=>64+(x-75)/2.55*462,Y=y=>280-(y-8)/4.1*250;
 let b='<rect x="52" y="24" width="495" height="263" fill="#f3efe4" stroke="'+C.grid+'"/>';
 for(let i=0;i<=3;i++){const y=28+250*i/3;b+='<line x1="52" x2="547" y1="'+y+'" y2="'+y+'" stroke="#e5dece"/>';}
 const cols={demand:C.red,storage:C.green,wind:C.gold,circular:C.mint,marine:"#5c859b"};
 chosen.forEach((r,i)=>{
 const x=X(r.lon),y=Y(r.lat),labelY=40+i*41;
 b+='<circle class="v-point" cx="'+x+'" cy="'+y+'" r="8" fill="'+(cols[r.kind]||C.gold)+'" stroke="'+C.paper+'" stroke-width="2">'+tooltip(r.name+" / "+r.note)+"</circle>"+
 '<path d="M'+(x+10)+" "+y+"L560 "+labelY+'" fill="none" stroke="'+C.gold+'" opacity=".5"/>'+
 text(565,labelY-3,r.name.split(" ").slice(0,3).join(" "),'font-size="11" fill="'+C.dark+'"')+
 text(565,labelY+12,r.kind,'font-size="10" fill="'+C.grey+'" '+E.mono);
 });
 $(".viz-plot",el).innerHTML=svg(b,820,320,"Screening sites plotted by approximate longitude and latitude")+
 '<p class="viz-aside">'+chosen.length+" / "+points.length+" illustrative markers shown · location and type only</p>";
 };
 $("select",el).onchange=()=>{const p=$(".viz-plot",el);p.classList.remove("viz-swap-in");void p.offsetWidth;p.classList.add("viz-swap-in");render();};
 render();
}
function scenario(el){
 const cases=D.scenarios.scenarios;
 const select='<label class="viz-control">Explore a scenario hypothesis <select aria-label="Choose scenario">'+cases.map(s=>'<option value="'+safe(s.code)+'">'+safe(s.code+" · "+s.name)+'</option>').join("")+"</select></label>";
 frame(el,"The five scenario hypotheses","Unvalidated research designs / no optimizer output",select+'<div class="viz-plot"></div>',
 "Scenarios are modelling questions, not computed results. No optimization, buildable generation MW, reliability improvement or investment saving is asserted.",
 "https://github.com/kerala2040/kerala2040.github.io/blob/main/data/scenarios.json");
 const paint=()=>{
 const s=cases.find(x=>x.code===$("select",el).value)||cases[0];
 const bars=[["Demand flexibility",s.demand_flexibility],["Ecological constraint",s.ecology_constraint],["Import option",s.import_option]];
 const html='<div class="scenario-identity"><span class="scenario-code">'+safe(s.code)+'</span><h4>'+safe(s.name)+'</h4><p>'+safe(s.description)+'</p></div><div class="scenario-tags">'+bars.map(([k,v])=>'<div><span>'+safe(k)+'</span><strong>'+safe(v)+'</strong></div>').join("")+"</div>";
 $(".viz-plot",el).innerHTML=html;
 };
 $("select",el).onchange=()=>{const p=$(".viz-plot",el);p.classList.remove("viz-swap-in");void p.offsetWidth;p.classList.add("viz-swap-in");paint();};paint();
}
function projects(el){
 const rows=D.projects.projects,techs=[...new Set(rows.map(r=>r.technology).filter(Boolean))].sort();
 const selector='<label class="viz-control">Technology <select aria-label="Project technology"><option value="all">All technologies</option>'+techs.map(t=>'<option>'+safe(t)+'</option>').join("")+"</select></label>";
 frame(el,"KSEB project-record explorer","Published portal extract / not real-time statuses",selector+'<div class="viz-plot"></div>',
 "This is a dated portal snapshot, not verified as-built capacity or commissioning status as of today. Old planned commissioning dates must not be treated as completion evidence.",
 D.projects.tracker_url||"https://pms.kseb.in/tracker");
 const render=()=>{
 const filter=$("select",el).value,chosen=rows.filter(r=>(filter==="all"||r.technology===filter)&&Number.isFinite(+r.capacity_mw)).sort((a,b)=>b.capacity_mw-a.capacity_mw).slice(0,7);
 const max=Math.max(1,...chosen.map(r=>r.capacity_mw)),baseX=240,area=435;
 let b="";chosen.forEach((r,i)=>{const y=24+i*39;b+=text(baseX-12,y+14,r.name.length>28?r.name.slice(0,26)+"…":r.name,'text-anchor="end" font-size="11" fill="'+C.dark+'"')+
 '<rect class="v-bar" x="'+baseX+'" y="'+y+'" width="'+(r.capacity_mw/max*area)+'" height="19" fill="'+(r.status==="Completed"?C.green:C.gold)+'">'+tooltip(r.name+" / "+r.capacity_mw+" MW / portal status: "+r.status)+"</rect>"+
 text(baseX+Math.max(10,r.capacity_mw/max*area)+8,y+14,fmt(r.capacity_mw,1)+" MW",'font-size="11" fill="'+C.dark+'"');
 });
 $(".viz-plot",el).innerHTML=svg(b,790,318,"Seven largest capacity entries in selected KSEB portal extract")+
 '<p class="viz-aside">Showing '+chosen.length+" entries, ordered by listed project MW; status colors: green = portal completed, gold = portal ongoing.</p>";
 };
 $("select",el).onchange=()=>{const p=$(".viz-plot",el);p.classList.remove("viz-swap-in");void p.offsetWidth;p.classList.add("viz-swap-in");render();};render();
}
const renderers={trends,capacity,balance,network,coverage,folds,rmse,ablation,boundary,sites,budget,stages,milestones,outlook,frequency,screening,scenario,projects};
function animateChart(el) {
 const paths=$$(".v-line",el);paths.forEach(p=>{try{let length=p.getTotalLength();p.style.setProperty("--path-length",length+"px");}catch(_){}});
}
function initMotion(){
 const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 document.documentElement.classList.add("has-kerala-motion");
 const progress=document.createElement("div");progress.className="scroll-ribbon";progress.setAttribute("aria-hidden","true");document.body.append(progress);
 let ticking=false;window.addEventListener("scroll",()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{const d=document.documentElement;progress.style.transform="scaleX("+((d.scrollTop)/(d.scrollHeight-d.clientHeight||1))+")";ticking=false;});},{passive:true});
 if(reduced)return;
 const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("reveal-visible");observer.unobserve(e.target);}});},{threshold:.1,rootMargin:"0px 0px -24px 0px"});
 $$(".evidence-viz, .section-intro, .data-strip, .hero-card, .grid-2 .card, .table-wrap").forEach((el,i)=>{el.classList.add("reveal-ready");el.style.setProperty("--reveal-delay",Math.min(i%5,3)*75+"ms");observer.observe(el);});
}
async function boot(){
 initMotion();
 const elements=$$("[data-viz]");
 if(!elements.length)return;
 const needed=new Set(elements.flatMap(el=>{
 const type=el.dataset.viz;return ["trends","balance","network"].includes(type)?["history"]:["capacity"].includes(type)?["gen"]:["rmse","folds","ablation"].includes(type)?["ml"]:["outlook"].includes(type)?["refs"]:["frequency"].includes(type)?["cea"]:["screening"].includes(type)?["nodes"]:["scenario"].includes(type)?["scenarios"]:["projects"].includes(type)?["projects"]:[];
 }));
 try{
 await Promise.all([...needed].map(async key=>{const r=await fetch(sources[key],{cache:"force-cache"});if(!r.ok)throw Error(sources[key]+" returned "+r.status);D[key]=await r.json();}));
 for(const el of elements){try{renderers[el.dataset.viz]?.(el);animateChart(el);}catch(err){console.error("Chart error",el.dataset.viz,err);el.innerHTML='<p class="viz-error">This chart could not load; the research sources are available through the source register.</p>';}}
 }catch(err){console.error("Evidence bundle could not be read",err);for(const el of elements)el.innerHTML='<p class="viz-error">Source-backed visualization temporarily unavailable. <a href="sources.html">Consult the source record</a>.</p>';}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();