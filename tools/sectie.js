/* ---------- sectievoorzitter ---------- */
const SOORT={sectie:'sectievergadering',overleg:'overleg',rapport:'rapport',cijfers:'cijfers',toets:'toetsen',keuze:'profielkeuze',muziek:'muziek',taak:'taak'};
const SFILT=[['','Alles'],['verg','Vergaderingen'],['rapport','Rapport en cijfers'],['toets','Toetsen en herkansingen'],['keuze','Profielkeuze en open dag'],['muziek','Muziek op school'],['taak','Taken']];
const SGROEP={sectie:'verg',overleg:'verg',rapport:'rapport',cijfers:'rapport',toets:'toets',keuze:'keuze',muziek:'muziek',taak:'taak'};
let SS={v:1,done:{},notes:{},datum:{},ok:{},extra:[]};let sStore={mode:'none'};let sSaveT;let sLast='';let sFilt='';let sKlaar=false;
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dOf=s=>new Date(s+'T12:00');
const addD=(s,n)=>{const d=dOf(s);d.setDate(d.getDate()+n);return ymd(d);};
function sWeek(s){const t=dOf(s);for(const k of DATA.kalender.weken){const a=dOf(k.datum);a.setDate(a.getDate()-1);const e=dOf(k.datum);e.setDate(e.getDate()+6);if(t>=a&&t<e)return k.w;}return null;}
function sWeekLabel(i){if(i.wk)return 'lesweek '+i.wk;const v=DATA.kalender.vakanties.find(v=>i.d>=v.van&&i.d<=v.tot);if(v)return v.naam.toLowerCase();if(i.d>DATA.kalender.weken[DATA.kalender.weken.length-1].datum)return 'na lesweek 38';return '';}
function sItems(){const base=(DATA.sectie||[]).map(x=>Object.assign({},x));const ex=(SS.extra||[]).map(x=>Object.assign({extra:true},x));
  return base.concat(ex).map(i=>{if(SS.datum[i.id])i.d=SS.datum[i.id];i.wk=sWeek(i.d);return i;}).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:(a.tijd||'').localeCompare(b.tijd||''));}
const sToday=()=>ymd(new Date());
const sOpen=i=>i.taak&&!SS.done[i.id];
function sSig(){const t=sToday();const it=sItems();const late=it.filter(i=>sOpen(i)&&i.d<t).length;const soon=it.filter(i=>sOpen(i)&&i.d>=t&&i.d<=addD(t,7)).length;
  const out=[];for(let k=0;k<late;k++)out.push({lvl:'warn'});for(let k=0;k<soon;k++)out.push({lvl:'info'});return out;}
const sFmt=s=>{const d=dOf(s);return `${DAG[d.getDay()]} ${d.getDate()} ${MND[d.getMonth()]}`;};
function sRow(i,compact){const t=sToday();const done=i.taak&&SS.done[i.id];const past=(i.tot||i.d)<t;const late=sOpen(i)&&i.d<t;
  const cls=['srow',done?'done':'',late?'late':'',past&&!i.taak?'past':''].join(' ');const note=SS.notes[i.id];const twijfel=i.bevestigen&&!SS.ok[i.id];
  return `<div class="${cls}"><span class="sd">${sFmt(i.d)}${i.tot?` – ${sFmt(i.tot)}`:''}</span>${compact?'':`<span class="swk">${esc(sWeekLabel(i))}</span>`}<span class="chip s-${i.soort}">${SOORT[i.soort]||i.soort}</span>
    <div class="st">${i.taak?`<label class="chk"><input type="checkbox" data-sdone="${esc(i.id)}" ${done?'checked':''}><span>${esc(i.titel)}</span></label>`:`<b>${esc(i.titel)}</b>`}${i.tijd?` <span class="tijd">${esc(i.tijd)}</span>`:''}${late?' <span class="chip s-late">te laat</span>':''}${twijfel?' <span class="chip s-twijfel">datum nog bevestigen</span>':''}
    ${i.info&&!compact?`<div class="si">${esc(i.info)}</div>`:''}${note?`<div class="note">✎ ${esc(note)}</div>`:''}</div>
    <button class="btn small" type="button" data-sedit="${esc(i.id)}">bewerk</button></div>`;}
function renderSectie(){const it=sItems();const t=sToday();
  const open=it.filter(sOpen);const late=open.filter(i=>i.d<t);const soon=it.filter(i=>(i.tot||i.d)>=t&&i.d<=addD(t,14));
  const nv=it.find(i=>i.soort==='sectie'&&i.d>=t);const nr=it.find(i=>i.soort==='rapport'&&i.d>=t);const twijfel=it.filter(i=>i.bevestigen&&!SS.ok[i.id]);
  const wkTot=d=>{const n=Math.round((dOf(d)-dOf(t))/864e5);return n<=0?'vandaag':n<14?`over ${n} dagen`:`over ${Math.round(n/7)} weken`;};
  let h=`<div class="shead"><h2>Sectievoorzitter muziek</h2><p class="lead">Vergaderingen, rapporten, toetsweken en je eigen taken uit de jaarplanning 2026-2027 en Werkwijze sectievoorzitter muziek. Vink taken af als ze klaar zijn; dat wordt gedeeld opgeslagen. Elke sectievergadering begint met de besluiten- en actielijst (5 min) en taal (10 min).</p></div>
  <div class="kpi"><div><b>${nv?sFmt(nv.d):'–'}</b><small>volgende sectievergadering${nv?' · '+wkTot(nv.d):''}</small></div><div><b>${nr?sFmt(nr.d):'–'}</b><small>${nr?esc(nr.titel.toLowerCase())+' · '+wkTot(nr.d):'geen rapport meer'}</small></div><div><b>${open.length}</b><small>open taken${late.length?` · <span style="color:var(--toets-fg)">${late.length} te laat</span>`:''}</small></div><div><b>${twijfel.length}</b><small>cijferdeadlines nog bevestigen</small></div></div>
  <div class="card scard"><h3>Nu en de komende twee weken</h3>${late.concat(soon.filter(i=>!late.includes(i))).map(i=>sRow(i,true)).join('')||'<p class="lead">Niets gepland.</p>'}</div>
  <div class="filters sfilt" style="margin-top:1rem">${SFILT.map(([k,n])=>`<button type="button" class="btn${sFilt===k?' primary':''}" data-sfilt="${k}">${n}</button>`).join('')}<label class="chk"><input type="checkbox" id="sKlaar" ${sKlaar?'checked':''}><span>ook afgevinkte taken</span></label></div>`;
  const per=[['Periode 1','2026-08-31','2026-11-15'],['Periode 2','2026-11-16','2027-02-07'],['Periode 3','2027-02-08','2027-04-25'],['Periode 4 en afsluiting','2027-04-26','2027-08-31']];
  for(const [pn,a,b] of per){const rows=it.filter(i=>i.d>=a&&i.d<=b).filter(i=>!sFilt||SGROEP[i.soort]===sFilt).filter(i=>sKlaar||!(i.taak&&SS.done[i.id]));
    if(!rows.length)continue;h+=`<h3 class="sper">${pn}</h3><div class="card slist">${rows.map(i=>sRow(i)).join('')}</div>`;}
  h+=`<form class="card sadd" id="sAdd"><h3>Taak of afspraak toevoegen</h3><div class="saddrow"><label>Wat <input id="sNt" required placeholder="Bijvoorbeeld: offerte versterker opvragen"></label><label>Datum <input id="sNd" type="date" required value="${t}"></label><label>Soort <select id="sNs">${Object.entries(SOORT).map(([k,v])=>`<option value="${k}" ${k==='taak'?'selected':''}>${v}</option>`).join('')}</select></label><label class="chk"><input type="checkbox" id="sNtaak" checked><span>afvinkbaar</span></label><button class="btn primary" type="submit">Toevoegen</button></div></form>`;
  $('#v-sectie').innerHTML=h;}
function sectieStrip(cw){const it=sItems();const t=sToday();const rows=it.filter(i=>(i.wk===cw&&(i.tot||i.d)>=t)||(sOpen(i)&&i.d<t)||(i.d>=t&&i.d<=addD(t,7)));
  const u=[];rows.forEach(r=>{if(!u.includes(r))u.push(r);});
  return `<div class="card scard" style="margin-bottom:1rem"><div class="kh" style="display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;flex-wrap:wrap"><h3>Sectie deze week</h3><button class="btn small" type="button" data-tab="sectie">alles voor de sectie</button></div>${u.map(i=>sRow(i,true)).join('')||'<p class="lead">Deze week niets voor de sectie.</p>'}</div>`;}
function sectieCel(w){const it=sItems().filter(i=>i.wk===w&&i.soort!=='taak');if(!it.length)return '';return it.map(i=>`<span class="sc s-${i.soort}" title="${esc(sFmt(i.d)+' · '+i.titel)}">${esc(i.titel.replace(/^Sectievergadering$/,'Sectieverg.').replace('Rapportvergaderingen','Rapportverg.').slice(0,34))}</span>`).join('');}
function openSectie(id){const i=sItems().find(x=>x.id===id);if(!i)return;const d=$('#drawer');
  d.innerHTML=`<div class="dh"><h2>${esc(i.titel)}</h2><span class="spacer"></span><button class="btn" type="button" id="dClose">Sluiten</button></div>
  <p class="lead">${esc(sFmt(i.d))}${i.tijd?' · '+esc(i.tijd):''} · ${esc(sWeekLabel(i))} · ${SOORT[i.soort]||''}</p>${i.info?`<p>${esc(i.info)}</p>`:''}
  <form id="sForm">${i.extra?`<label>Wat <input name="titel" value="${esc(i.titel)}"></label>`:''}
  <label>Datum <input type="date" name="d" value="${esc(i.d)}"></label>
  ${i.bevestigen?`<label class="chk"><input type="checkbox" name="ok" ${SS.ok[i.id]?'checked':''}><span>datum is bevestigd</span></label>`:''}
  ${i.taak?`<label class="chk"><input type="checkbox" name="done" ${SS.done[i.id]?'checked':''}><span>klaar</span></label>`:''}
  <label>Notitie <textarea name="note">${esc(SS.notes[i.id]||'')}</textarea></label>
  <div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn primary" type="submit">Opslaan</button><button class="btn" type="button" id="dCancel">Annuleren</button>${i.extra?`<span class="spacer"></span><button class="btn danger" type="button" id="sDel">Verwijderen</button>`:''}${!i.extra&&SS.datum[i.id]?`<button class="btn" type="button" id="sOrig">Terug naar datum uit de jaarplanning</button>`:''}</div></form>`;
  d.classList.add('open');$('#scrim').hidden=false;$('#dClose').onclick=$('#dCancel').onclick=closeDrawer;
  const del=$('#sDel');if(del){let armed=false;del.onclick=()=>{if(!armed){armed=true;del.textContent='Zeker? Klik nogmaals';return;}SS.extra=SS.extra.filter(x=>x.id!==id);closeDrawer();sCommit();};}
  const orig=$('#sOrig');if(orig)orig.onclick=()=>{delete SS.datum[id];closeDrawer();sCommit();};
  $('#sForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const nd=f.get('d');
    if(i.extra){const x=SS.extra.find(x=>x.id===id);if(x){x.titel=(f.get('titel')||'').trim()||x.titel;if(nd)x.d=nd;}}
    else if(nd&&nd!==(DATA.sectie.find(x=>x.id===id)||{}).d)SS.datum[id]=nd;else delete SS.datum[id];
    if(i.bevestigen){if(f.get('ok'))SS.ok[id]=true;else delete SS.ok[id];}
    if(i.taak){if(f.get('done'))SS.done[id]=true;else delete SS.done[id];}
    const n=(f.get('note')||'').trim();if(n)SS.notes[id]=n;else delete SS.notes[id];
    closeDrawer();sCommit();};}
function sCommit(){render();clearTimeout(sSaveT);sSaveT=setTimeout(sSave,400);}
function sSave(){const json=JSON.stringify(SS);if(json===sLast)return;sLast=json;
  if(sStore.mode==='db'){sStore.ref.set(JSON.parse(json)).then(()=>setBadge('db','Opgeslagen (gedeeld)')).catch(e=>setBadge('local','Opslaan sectie mislukt: '+(e&&e.code||'?')));}
  else{try{localStorage.setItem('leergang-sectie',json);}catch(e){}}}
function sFix(d){const o={v:1,done:{},notes:{},datum:{},ok:{},extra:[]};return Object.assign(o,d||{});}
async function initSectie(){try{if(!dbRef&&window.claude&&window.claude.use)dbRef=await window.claude.use('db');
    if(dbRef){const ref=dbRef.doc('sectie/main');sStore={mode:'db',ref};
      ref.onSnapshot(snap=>{if(snap.exists){const d=snap.data();const json=JSON.stringify(sFix(d));if(json!==JSON.stringify(SS)){SS=sFix(JSON.parse(json));sLast=JSON.stringify(SS);if(tab==='sectie'||tab==='alle')render();}}},()=>{sStore={mode:'local'};sLoadLocal();});return;}}catch(e){}
  sStore={mode:'local'};sLoadLocal();}
function sLoadLocal(){try{const j=localStorage.getItem('leergang-sectie');if(j){SS=sFix(JSON.parse(j));sLast=JSON.stringify(SS);if(tab==='sectie'||tab==='alle')render();}}catch(e){}}
