/* Lesdag: voorbereiden en lesgeven, op basis van de leergangen muziek 2026-2027.
   Gegevens: data/basis.json (leergangen, kalender, sectie) + eigen staat (rooster, voortgang, aanpassingen).
   Opslag: localStorage, en bij inloggen ook in de OneDrive-appmap (zie m365.js). */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DAG = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const DAGLANG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const TYPE = { theorie: 'theorie', praktijk: 'praktijk', toets: 'toets', leeg: 'nog in te vullen' };
const LS_KEY = 'lesdag-staat';
const BENODIGD = [[/keyboard|piano|toetsenbord/i, 'Keyboards'], [/gitaar|ukelele|ukulele|akkoordinstrument/i, 'Gitaren / ukeleles'], [/drum|groove|backbeat|slagwerk|percussie|cajon/i, 'Drums / percussie'], [/\bbas\b|basgitaar|baslijn|baspartij/i, 'Basgitaar'], [/opnem|opname/i, 'Opnameapparatuur'], [/wisbordje/i, 'Wisbordjes en stiften'], [/exit ticket|briefje/i, 'Exit-ticketbriefjes'], [/luister|fragment|beluister/i, 'Luisterfragmenten klaarzetten'], [/metronoom/i, 'Metronoom'], [/partituur|musicsheet|leadsheet/i, 'Partituren / musicsheets'], [/musicbox|oefentoets|proeftoets|oefenexamen|examentraining|trainerz|laptop|facet/i, 'Laptops en koptelefoons'], [/zing|zang|koor|stem/i, 'Zangbladen']];

let B = null;               // basisgegevens
let S = null;               // eigen staat
let route = { naam: 'vandaag', arg: [] };
let syncState = 'lokaal';
let remoteT = null;

/* ---------- datum ---------- */
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dOf = s => new Date(s + 'T12:00');
const addD = (s, n) => { const d = dOf(s); d.setDate(d.getDate() + n); return ymd(d); };
const vandaag = () => ymd(new Date());
const fmtD = s => { const d = dOf(s); return `${DAG[d.getDay()]} ${d.getDate()} ${MND[d.getMonth()]}`; };
const fmtLang = s => { const d = dOf(s); return `${DAGLANG[d.getDay()]} ${d.getDate()} ${['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'][d.getMonth()]}`; };
const minuten = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const nuMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
function lesweekVan(s) { // kalenderweek van de leergang (1..38) of null
  for (const k of B.kalender.weken) { const a = k.datum, e = addD(k.datum, 7); if (s >= a && s < e) return k.w; }
  return null;
}
function vrijReden(s) {
  const d = dOf(s).getDay(); if (d === 0 || d === 6) return 'weekend';
  const v = B.kalender.vakanties.find(v => s >= v.van && s <= v.tot); if (v) return v.naam;
  if (B.vrijeDagen.includes(s)) return 'leerlingen vrij';
  if (!lesweekVan(s)) return s < B.kalender.weken[0].datum ? 'nog geen lesweek' : 'na de laatste lesweek';
  return null;
}
const maandagVan = s => { const d = dOf(s); const w = (d.getDay() + 6) % 7; return addD(s, -w); };

/* ---------- staat ---------- */
function nieuweStaat() { return { v: 1, updated: 0, rooster: [], voortgang: {}, les: {}, uitval: {}, sectieAf: {}, sectieNotitie: {}, sectieExtra: [], groepLeergang: {}, taken: [], dagTaken: {} }; }
function laadLokaal() { try { const j = localStorage.getItem(LS_KEY); if (j) return Object.assign(nieuweStaat(), JSON.parse(j)); } catch (e) {} return nieuweStaat(); }
function bewaar(stil) {
  S.updated = Date.now();
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
  if (M365.account) { clearTimeout(remoteT); setSync('bezig', 'Opslaan…'); remoteT = setTimeout(bewaarRemote, 1500); }
  if (!stil) render();
}
async function bewaarRemote() {
  try { await M365.saveState(S); setSync('ok', 'Opgeslagen in OneDrive'); }
  catch (e) { setSync('fout', 'OneDrive niet bereikbaar, staat op dit apparaat'); console.warn(e); }
}
function setSync(st, txt) { syncState = st; const el = $('#sync'); el.className = 'sync ' + st; el.querySelector('span').textContent = txt; }

/* ---------- groepen en lessen ---------- */
function alleGroepen() { const out = []; for (const [lg, gs] of Object.entries(B.groepen)) for (const g of gs) out.push({ g, lg }); return out; }
const leergangVan = g => S.groepLeergang[g] || (alleGroepen().find(x => x.g === g) || {}).lg || null;
const lgNaam = lg => (B.leergangen[lg] || {}).meta ? B.leergangen[lg].meta.klas : lg;
const SEQ = {};
function reeks(lg) { // lessen die je in de klas geeft, in volgorde
  if (SEQ[lg]) return SEQ[lg];
  const L = B.leergangen[lg]; if (!L) return [];
  const n = L.meta.lessenPerWeek; const out = [];
  for (const w of L.weken) for (let i = 1; i <= n; i++) {
    const l = w['l' + i]; if (!l) continue;
    if (l.type === 'uitval' || l.type === 'toetsweek') continue;
    if (l.type === 'toets' && w.toetsweek) continue;
    out.push({ id: `${lg}:${w.w}.${i}`, lg, w: w.w, li: i, basis: l, week: w });
  }
  return (SEQ[lg] = out);
}
function les(item) { // basisles met eigen aanpassingen
  const o = S.les[item.id] || {};
  const l = Object.assign({}, item.basis, o);
  if (o.materiaal) l.materiaal = o.materiaal; else l.materiaal = item.basis.materiaal || [];
  return l;
}
const toetsVan = (lg, id) => ((B.leergangen[lg] || {}).toetsen || []).find(t => t.id === id);
function status(g, id) { return ((S.voortgang[g] || {})[id] || {}); }
const afgerond = st => st.st === 'gegeven' || st.st === 'overgeslagen';
function volgendeIndex(g) { const r = reeks(leergangVan(g)); const i = r.findIndex(x => !afgerond(status(g, x.id))); return i < 0 ? r.length : i; }
function vorigeNotitie(g, vanaf) {
  const r = reeks(leergangVan(g)); for (let i = vanaf - 1; i >= 0; i--) { const st = status(g, r[i].id); if (st.n) return { les: r[i], st }; if (st.st) return { les: r[i], st }; }
  return null;
}

function opPlanning(g) { // alle lessen vóór de huidige lesweek op 'gegeven'
  const lw = lesweekVan(vandaag()) || nextLesweek(); const r = reeks(leergangVan(g)); let n = 0;
  S.voortgang[g] = S.voortgang[g] || {};
  for (const x of r) if (x.w < lw && !S.voortgang[g][x.id]) { S.voortgang[g][x.id] = { st: 'gegeven', auto: true }; n++; }
  return n;
}
function nextLesweek() { const t = vandaag(); const k = B.kalender.weken.find(k => k.datum >= t); return k ? k.w : 99; }
const rooGroepen = () => [...new Set(S.rooster.map(u => u.groep))];
/* ---------- planning: welke les in welk lesuur ---------- */
function uurId(u) { return u.id; }
function urenOp(s) { const z = zUren(s); const d = dOf(s).getDay(); return (z || S.rooster.filter(u => +u.dag === d)).sort((a, b) => minuten(a.start) - minuten(b.start)); }
function isUitval(s, u) { return !!u.vervallen || (S.uitval[s] || []).includes(u.id); }

/* ---------- Zermelo: rooster ophalen via de eigen roosterproxy ---------- */
let ZC = (() => { try { return JSON.parse(localStorage.getItem('lesdag-zermelo') || 'null'); } catch (e) { return null; } })();
const zProxy = () => (window.LESDAG_CONFIG || {}).roosterProxy || '';
const zToken = link => { const m = String(link || '').match(/access_token=([A-Za-z0-9]+)/); return m ? m[1] : String(link || '').trim(); };
function icsTijd(v) {
  v = String(v || '').trim();
  if (/Z$/.test(v)) {
    const dt = new Date(Date.UTC(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8), +v.slice(9, 11), +v.slice(11, 13)));
    const p = {}; new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(dt).forEach(x => { p[x.type] = x.value; });
    return { d: `${p.year}-${p.month}-${p.day}`, t: `${p.hour}:${p.minute}` };
  }
  return { d: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`, t: v.length > 8 ? `${v.slice(9, 11)}:${v.slice(11, 13)}` : '' };
}
function icsParse(txt) {
  const lines = String(txt).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const out = []; let e = null;
  const un = v => v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\;/g, ';').replace(/\\\\/g, '\\');
  for (const ln of lines) {
    if (ln === 'BEGIN:VEVENT') { e = {}; continue; }
    if (ln === 'END:VEVENT') { if (e && e.DTSTART) { const a = icsTijd(e.DTSTART), b = icsTijd(e.DTEND || e.DTSTART);
      out.push({ uid: e.UID || '', d: a.d, start: a.t, eind: b.t, summary: un(e.SUMMARY || ''), loc: un(e.LOCATION || ''), desc: un(e.DESCRIPTION || ''), vervallen: /CANCELLED/i.test(e.STATUS || '') || /vervallen|vervalt|uitval/i.test(e.SUMMARY || '') }); } e = null; continue; }
    if (!e) continue;
    const i = ln.indexOf(':'); if (i < 0) continue;
    const key = ln.slice(0, i).split(';')[0].toUpperCase(); e[key] = ln.slice(i + 1);
  }
  return out;
}
const zMuziek = e => /(^|[^a-z])(k?mu|muz|muziek)([^a-z]|$)/i.test(e.summary + ' ' + e.desc);
function zGroep(e) {
  const txt = (e.summary + ' ' + e.desc).toLowerCase();
  const keuze = /(^|[^a-z])kmu([^a-z]|$)/.test(txt);
  for (const x of alleGroepen()) { const g = x.g.toLowerCase(); if (g.includes(' ')) continue; if (new RegExp('(^|[^a-z0-9])' + g + '([^a-z0-9]|$)').test(txt)) return keuze && /^h3/.test(g) ? 'kmu h3' : x.g; }
  const m = txt.match(/(^|[^a-z0-9])((?:[hvm][1-6][a-z]?)|bb1)([^a-z0-9]|$)/);
  if (m) { const g = m[2]; if (keuze && /^h3/.test(g)) return 'kmu h3'; return g === 'bb1' ? 'BB1' : g; }
  return '';
}
function zUren(s) {
  if (!ZC || !ZC.events || s < ZC.van || s > ZC.tot) return null;
  const dag = dOf(s).getDay();
  return ZC.events.filter(e => e.d === s && zMuziek(e)).map(e => {
    const g = zGroep(e) || e.summary;
    const vast = S.rooster.find(u => +u.dag === dag && u.start === e.start && u.groep === g);
    return { id: vast ? vast.id : `z-${e.start}-${g}`, dag, start: e.start, eind: e.eind, groep: g, lokaal: e.loc || (vast && vast.lokaal) || '', zermelo: true, vervallen: e.vervallen, anderLokaal: !!(vast && e.loc && vast.lokaal && e.loc !== vast.lokaal) };
  });
}
async function zOphalen(melden) {
  const tok = S.zermeloToken; const px = zProxy();
  if (!tok || !px) { if (melden) toast(px ? 'Plak eerst je Zermelo-link bij Instellingen' : 'De roosterproxy staat nog niet in config.js'); return; }
  try {
    const r = await fetch(px, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok, weken: 3 }) });
    if (!r.ok) throw new Error('Zermelo antwoordt ' + r.status);
    const events = icsParse(await r.text()); const van = maandagVan(vandaag());
    ZC = { opgehaald: Date.now(), van, tot: addD(van, 20), events };
    try { localStorage.setItem('lesdag-zermelo', JSON.stringify(ZC)); } catch (e) {}
    if (melden) toast(`Rooster opgehaald: ${events.filter(zMuziek).length} muzieklessen in drie weken`);
    if (!LES) render();
  } catch (e) { console.warn(e); if (melden) toast('Rooster ophalen lukt niet: ' + e.message); }
}
function zVastRooster() { // muzieklessen van één week als vast rooster
  if (!ZC) return [];
  const seen = {}; const out = [];
  for (let i = 0; i < 21; i++) { const s = addD(ZC.van, i); const dag = dOf(s).getDay(); if (dag === 0 || dag === 6) continue;
    for (const e of ZC.events.filter(x => x.d === s && zMuziek(x) && !x.vervallen)) { const g = zGroep(e); if (!g) continue; const k = dag + '|' + e.start + '|' + g; if (seen[k]) continue; seen[k] = 1; out.push({ dag, start: e.start, eind: e.eind, groep: g, lokaal: e.loc }); } }
  return out.sort((a, b) => a.dag - b.dag || minuten(a.start) - minuten(b.start));
}
// Voorspel de lessen voor een reeks dagen vanaf 'van' (inclusief), uitgaande van de huidige voortgang.
function planning(van, tot) {
  const ptr = {}; const res = {}; const t = vandaag();
  for (let s = van; s <= tot; s = addD(s, 1)) {
    const reden = vrijReden(s); res[s] = { reden, uren: [] };
    if (reden) continue;
    for (const u of urenOp(s)) {
      const lg = leergangVan(u.groep); if (!lg) { res[s].uren.push({ u, fout: 'Groep zonder leergang' }); continue; }
      if (ptr[u.groep] == null) ptr[u.groep] = volgendeIndex(u.groep);
      // al afgeronde lessen van vandaag: laat zien wat er gegeven is
      const gegeven = Object.entries(S.voortgang[u.groep] || {}).find(([id, st]) => st.d === s && st.uur === u.id);
      if (gegeven) { const it = reeks(lg).find(x => x.id === gegeven[0]); res[s].uren.push({ u, item: it, st: gegeven[1], klaar: true }); continue; }
      if (isUitval(s, u)) { res[s].uren.push({ u, uitval: true }); continue; }
      const r = reeks(lg); const it = r[ptr[u.groep]] || null;
      const lw = lesweekVan(s); const plan = B.leergangen[lg].weken.find(w => w.w === lw);
      const planUit = plan && [1, 2, 3].map(i => plan['l' + i]).filter(Boolean).find(l => l.type === 'uitval' || l.type === 'toetsweek');
      res[s].uren.push({ u, item: it, lw, plan, planUit, half: it && status(u.groep, it.id).st === 'half' });
      if (it && s >= t) ptr[u.groep]++;
    }
  }
  return res;
}
function benodigd(l) {
  const out = []; const add = x => { if (x && !out.includes(x)) out.push(x); };
  (l.benodigd || []).forEach(add);
  const txt = [l.titel, l.detail, (l.fasen || []).map(LESMODUS.faseTekst).join(' '), (l.formatief || {}).tekst, (l.formatief || {}).soort].join(' ');
  for (const [re, n] of BENODIGD) if (re.test(txt)) add(n);
  return out;
}

/* ---------- weergave: algemeen ---------- */
const ROUTES = [['vandaag', 'Vandaag'], ['week', 'Week'], ['groepen', 'Groepen'], ['rooster', 'Rooster'], ['sectie', 'Sectie'], ['instellingen', 'Instellingen']];
function render() {
  $('#nav').innerHTML = ROUTES.map(([k, n]) => `<a href="#${k}" ${route.naam === k ? 'aria-current="page"' : ''}>${n}</a>`).join('');
  const f = { vandaag: viewVandaag, week: viewWeek, groepen: viewGroepen, rooster: viewRooster, sectie: viewSectie, instellingen: viewInstellingen }[route.naam] || viewVandaag;
  $('#main').innerHTML = f();
}
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 3500); }
function chipType(l) { return `<span class="chip ${l.type}">${esc(TYPE[l.type] || l.type)}</span>`; }
function matLinks(l, klein) {
  const m = l.materiaal || []; if (!m.length) return '';
  return `<div class="mats">${m.map(x => /^https?:/i.test(x.u || '') ? `<a class="btn ${klein ? 'klein' : ''}" href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t || 'link')}</a>` : `<span class="chip" title="${esc(x.u || '')}">${esc(x.t)}</span>`).join('')}</div>`;
}

/* ---------- vandaag / voorbereiding ---------- */
let dagKeuze = null;
function viewVandaag() {
  const t = vandaag();
  let s = dagKeuze || t;
  if (!dagKeuze && nuMin() >= 16 * 60) s = volgendeLesdag(t, 1); // na 16 uur: alvast morgen voorbereiden
  const p = planning(s, s)[s]; const lw = lesweekVan(s);
  let h = `<div class="kop"><div><h1>${s === t ? 'Vandaag' : 'Voorbereiden'}: ${esc(fmtLang(s))}</h1><div class="sub">${lw ? 'lesweek ' + lw : ''}${p.reden ? ' · ' + esc(p.reden) : ''}</div></div>
    <div class="knoppen"><button class="btn" data-dag="${volgendeLesdag(s, -1)}">‹ vorige</button><button class="btn" data-dag="${t}">vandaag</button><button class="btn" data-dag="${volgendeLesdag(s, 1)}">volgende ›</button>
    ${s === t && !p.reden && p.uren.length ? '<button class="btn hoofd" data-start="">▶ Lesmodus</button>' : ''}</div></div>`;
  if (!S.rooster.length) return h + `<div class="kaart"><h2>Eerst je rooster</h2><p class="lead">Vul één keer je weekrooster in: per lesuur de groep en het lokaal. Daarna zie je hier elke dag welke les je geeft en wat er klaar moet staan.</p><p><a class="btn hoofd" href="#rooster">Rooster invullen</a></p></div>` + dagExtra(s, p);
  if (p.reden) return h + `<div class="kaart"><p class="lead">Geen lessen: ${esc(p.reden)}.</p></div>` + dagExtra(s, p);
  if (!p.uren.length) return h + `<div class="kaart"><p class="lead">Geen muzieklessen op deze dag in je rooster. Een werkdag voor taken.</p></div>` + dagExtra(s, p);
  const achter = rooGroepen().filter(g => !Object.keys(S.voortgang[g] || {}).length && leergangVan(g) && reeks(leergangVan(g)).some(x => x.w < (lesweekVan(t) || nextLesweek()) - 1));
  if (achter.length) h += `<div class="melding info">Begin je nu met Lesdag? ${esc(achter.join(', '))} staan nog op les 1. <button class="btn klein" data-opplanalle="">Zet ze op de planning</button> Dan gelden alle lessen vóór deze lesweek als gegeven.</div>`;
  // klaarzetten per lokaal
  const perLokaal = {};
  p.uren.forEach(x => { if (!x.item || x.uitval || x.klaar) return; const l = les(x.item); const k = x.u.lokaal || '009'; (perLokaal[k] = perLokaal[k] || []).push({ x, ben: benodigd(l), l }); });
  const nu = nuMin();
  h += `<div class="grid">${Object.entries(perLokaal).map(([lok, arr]) => `<div class="kaart lokaalblok klaarzet"><h3>Klaarzetten in ${esc(lok)}</h3>${arr.map(({ x, ben }) => `<div><b style="font-family:var(--kop)">${esc(x.u.start)} ${esc(x.u.groep)}</b><div class="mats" style="margin:.2rem 0 .5rem">${ben.length ? ben.map(b => `<span class="chip">${esc(b)}</span>`).join('') : '<span class="leeg">niets bijzonders</span>'}</div></div>`).join('')}</div>`).join('')}</div>`;
  h += `<div class="dag">${p.uren.map((x, i) => uurKaart(s, x, s === t && nu >= minuten(x.u.start) - 5 && nu < minuten(x.u.eind))).join('')}</div>`;
  return h + dagExtra(s, p);
}
/* werkblokken (voor de eerste les, tussenuren, na de lessen) en taken voor die blokken */
const BRON = { sectie: 'sectie', koor: 'koor', slc: 'SLC', mail: 'mail', les: 'lessen', overig: 'overig' };
function dagExtra(s, p) { return werkBlokken(s, p) + takenBlok(s, p) + sectieBlok(s); }
function werkBlokken(s, p) {
  if (p.reden && /vakantie|weekend/i.test(p.reden)) return '';
  const uren = (p.uren || []).filter(x => !x.uitval).sort((a, b) => minuten(a.u.start) - minuten(b.u.start));
  const fmt = m => Math.floor(m / 60) + ':' + ('0' + m % 60).slice(-2);
  const blok = []; let cur = 8 * 60 + 30;
  blok.push({ van: '8:00', tot: '8:30', naam: 'Koffie en opstarten', soort: 'start' });
  for (const x of uren) { const a = minuten(x.u.start), b = minuten(x.u.eind); if (a - cur >= 20) blok.push({ van: fmt(cur), tot: fmt(a), naam: cur === 8 * 60 + 30 ? 'Werkblok voor de eerste les' : 'Tussenuur', soort: 'werk', min: a - cur }); blok.push({ van: x.u.start, tot: x.u.eind, naam: 'Les ' + x.u.groep, soort: 'les' }); cur = Math.max(cur, b); }
  const eind = 16 * 60 + 30; if (eind - cur >= 20) blok.push({ van: fmt(cur), tot: fmt(eind), naam: uren.length ? 'Na de lessen' : 'Werkdag zonder lessen', soort: 'werk', min: eind - cur });
  const werk = blok.filter(b => b.soort === 'werk').reduce((a, b) => a + b.min, 0);
  return `<div class="kaart"><h2 style="margin-bottom:.3rem">Je dag</h2><p class="lead" style="margin-bottom:.5rem">${Math.floor(werk / 60)} uur en ${werk % 60} minuten om aan taken te werken.</p><div class="blokken">${blok.map(b => `<div class="blok b-${b.soort}"><span class="bt">${esc(b.van)}–${esc(b.tot)}</span><span>${esc(b.naam)}</span></div>`).join('')}</div></div>`;
}
function takenBlok(s, p) {
  const t = vandaag(); const dt = S.dagTaken[s] || {};
  // automatische dagtaken: presentaties van de lessen van deze dag doorlopen
  const auto = [];
  (p.uren || []).forEach(x => { if (!x.item || x.uitval || x.klaar) return; const l = les(x.item); const pres = (l.materiaal || []).filter(m => /presentatie|\.pptx/i.test((m.t || '') + ' ' + (m.u || ''))); if (pres.length) auto.push({ key: 'pres:' + x.item.id, titel: `Presentatie doorlopen: ${l.titel}`, sub: `${x.u.start} ${x.u.groep} · let op onhandige dia's, volgorde en wat je zelf wilt zeggen`, af: !!dt['pres:' + x.item.id] }); });
  const eigen = (S.taken || []).filter(k => !k.af || k.afOp === s).sort((a, b) => (a.d || '9') < (b.d || '9') ? -1 : 1);
  const sect = sectieItems().filter(i => i.taak && !S.sectieAf[i.id] && i.d <= addD(s, 14));
  const rij = (k, chk, extra) => `<div class="taak ${k.af ? 'af' : ''} ${k.d && k.d < t && !k.af ? 'laat' : ''}"><label class="chk">${chk}<span>${esc(k.titel)}</span></label><span class="tb">${k.bron ? `<span class="chip">${esc(BRON[k.bron] || k.bron)}</span>` : ''}${k.d ? `<span class="chip ${k.d < t && !k.af ? 'rood' : ''}">${esc(fmtD(k.d))}</span>` : ''}${extra || ''}</span>${k.sub ? `<div class="sub">${esc(k.sub)}</div>` : ''}</div>`;
  let h = `<div class="kaart"><h2 style="margin-bottom:.3rem">Taken voor je werkblokken</h2>`;
  if (auto.length) h += `<h3>Lessen van ${s === t ? 'vandaag' : 'deze dag'}</h3>` + auto.map(k => rij(k, `<input type="checkbox" data-dagtaak="${esc(k.key)}" data-dag="${s}" ${k.af ? 'checked' : ''}>`)).join('');
  if (sect.length) h += `<h3>Sectie, komende twee weken</h3>` + sect.map(i => rij({ titel: i.titel, d: i.d, bron: 'sectie', af: false }, `<input type="checkbox" data-sdone="${esc(i.id)}">`)).join('');
  h += `<h3>Eigen taken</h3>` + (eigen.length ? eigen.map(k => rij(k, `<input type="checkbox" data-taakaf="${esc(k.id)}" ${k.af ? 'checked' : ''}>`, `<button class="btn klein" data-taakweg="${esc(k.id)}" title="verwijderen">×</button>`)).join('') : '<p class="leeg">Nog geen eigen taken. Zet hier wat uit de mail, het koor, SLC of de sectie op je komt.</p>');
  h += `<form id="tAdd" class="rij taakform"><input id="tT" placeholder="Nieuwe taak" required><select id="tB">${Object.entries(BRON).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><input id="tD" type="date"><button class="btn" type="submit">Toevoegen</button></form></div>`;
  return h;
}
function volgendeLesdag(s, stap) { let d = s; for (let i = 0; i < 30; i++) { d = addD(d, stap); const r = vrijReden(d); if (r !== 'weekend') return d; } return addD(s, stap); }
function uurKaart(s, x, nu) {
  const u = x.u;
  const kop = `<div class="tijd">${esc(u.start)}<small>${esc(u.eind)}</small><span class="lokaal">${esc(u.lokaal || '009')}</span></div>`;
  if (x.fout) return `<div class="uur">${kop}<div class="in"><div class="regel"><span class="groep">${esc(u.groep)}</span><span class="chip rood">${esc(x.fout)}</span></div></div></div>`;
  if (x.uitval) return `<div class="uur klaar">${kop}<div class="in"><div class="regel"><span class="groep">${esc(u.groep)}</span><span class="chip">${u.vervallen ? 'vervallen in Zermelo' : 'valt uit'}</span></div>${u.vervallen ? '' : `<div><button class="btn klein" data-uitvalterug="${s}|${u.id}">toch les</button></div>`}</div></div>`;
  if (!x.item) return `<div class="uur">${kop}<div class="in"><div class="regel"><span class="groep">${esc(u.groep)}</span><span class="leeg">alle lessen van ${esc(lgNaam(leergangVan(u.groep)))} zijn gegeven</span></div></div></div>`;
  const l = les(x.item); const lg = x.item.lg;
  const t = l.type === 'toets' ? toetsVan(lg, l.toets) : null;
  const diff = x.lw ? x.lw - x.item.w : 0;
  const vor = vorigeNotitie(u.groep, reeks(lg).indexOf(x.item));
  const plan = x.planUit ? `<span class="chip let" title="${esc(x.planUit.titel || '')}">planning: ${esc((x.planUit.titel || 'valt uit').replace(/^Valt uit: /, 'uitval: '))}</span>` : '';
  const ev = x.plan && x.plan.event ? `<span class="chip">${esc(x.plan.event)}</span>` : '';
  return `<div class="uur ${nu ? 'nu' : ''} ${x.klaar ? 'klaar' : ''}">${kop}<div class="in">
    <div class="regel"><span class="groep">${esc(u.groep)}</span>${chipType(l)}<span class="titel">${esc(l.titel || '')}${t ? ' – ' + esc(t.naam) : ''}</span>${x.half ? '<span class="chip let">vervolg</span>' : ''}${x.klaar ? `<span class="chip ok">${esc(x.st.st)}</span>` : ''}</div>
    <div class="regel"><span class="chip">${esc(lgNaam(lg))} · les uit lesweek ${x.item.w}</span>${diff > 0 ? `<span class="chip let">${diff} ${diff === 1 ? 'week' : 'weken'} achter op de planning</span>` : diff < 0 ? `<span class="chip ok">${-diff} week voor</span>` : ''}${plan}${ev}${u.anderLokaal ? `<span class="chip rood">ander lokaal: ${esc(u.lokaal)}</span>` : ''}${u.zermelo ? '<span class="chip">Zermelo</span>' : ''}</div>
    ${l.doel ? `<p class="doel">${esc(l.doel)}</p>` : l.detail ? `<p class="doel">${esc(l.detail)}</p>` : ''}
    ${vor && vor.st.n ? `<div class="vorige">Vorige keer${vor.st.d ? ' (' + esc(fmtD(vor.st.d)) + (vor.st.st ? ', ' + esc(vor.st.st) : '') + ')' : ''}: ${esc(vor.st.n)}</div>` : ''}
    ${(l.fasen || []).length ? `<details class="meer"><summary>Lesverloop</summary><ol class="fasen">${l.fasen.map(f => `<li>${esc(LESMODUS.faseTekst(f))}</li>`).join('')}</ol></details>` : ''}
    ${matLinks(l)}
    <div class="knoppen">${x.klaar ? '' : `<button class="btn hoofd" data-start="${esc(u.id)}|${s}">▶ Geef les</button>`}<button class="btn" data-bewerk="${esc(x.item.id)}">bewerk les</button>${x.klaar ? '' : `<button class="btn" data-uitval="${s}|${u.id}">valt uit</button>`}</div>
  </div></div>`;
}
function sectieBlok(s) {
  const items = sectieItems().filter(i => !i.taak && (i.d === s || (i.tot && i.d <= s && i.tot >= s)));
  if (!items.length) return '';
  return `<div class="kaart"><h2 style="margin-bottom:.4rem">Agenda sectie</h2>${items.map(sRij).join('')}</div>`;
}

/* ---------- week ---------- */
let weekKeuze = null;
function viewWeek() {
  const t = vandaag(); const ma = weekKeuze || maandagVan(t); const vr = addD(ma, 4);
  const p = planning(ma < t ? t : ma, vr); const lw = lesweekVan(ma) || lesweekVan(addD(ma, 2));
  let h = `<div class="kop"><div><h1>Week van ${esc(fmtD(ma))}</h1><div class="sub">${lw ? 'lesweek ' + lw : 'geen lesweek'}</div></div><div class="knoppen"><button class="btn" data-week="${addD(ma, -7)}">‹ vorige</button><button class="btn" data-week="${maandagVan(t)}">deze week</button><button class="btn" data-week="${addD(ma, 7)}">volgende ›</button></div></div>`;
  h += `<div class="scroll"><div class="week">`;
  for (let i = 0; i < 5; i++) {
    const s = addD(ma, i); const d = p[s];
    h += `<div class="d ${s === t ? 'vandaag' : ''}"><h3>${esc(fmtD(s))}</h3>`;
    if (s < t) { h += `<p class="leeg">geweest</p></div>`; continue; }
    if (!d) { h += '</div>'; continue; }
    if (d.reden) { h += `<p class="leeg">${esc(d.reden)}</p></div>`; continue; }
    if (!d.uren.length) h += '<p class="leeg">geen muziek</p>';
    for (const x of d.uren) {
      const l = x.item ? les(x.item) : null;
      h += `<div class="mini ${x.uitval ? 'uit' : ''}" data-dag="${s}"><div class="t">${esc(x.u.start)} · ${esc(x.u.lokaal || '009')}</div><b>${esc(x.u.groep)}</b> ${x.uitval ? 'valt uit' : l ? esc(l.titel || '') : x.fout ? esc(x.fout) : '<span class="leeg">klaar</span>'}${x.planUit ? `<div><span class="chip let">${esc(x.planUit.titel || '')}</span></div>` : ''}</div>`;
    }
    h += '</div>';
  }
  return h + '</div></div><p class="lead">Klik op een les om die dag voor te bereiden. De volgorde verschuift vanzelf als een les uitvalt of niet af is.</p>';
}

/* ---------- groepen en leergangen ---------- */
let groepKeuze = null;
function viewGroepen() {
  const gs = [...new Set(S.rooster.map(u => u.groep))];
  const lijst = gs.length ? gs : alleGroepen().map(x => x.g);
  const g = groepKeuze && lijst.includes(groepKeuze) ? groepKeuze : lijst[0];
  let h = `<div class="kop"><div><h1>Groepen</h1><div class="sub">Voortgang per groep. Parallelklassen delen een leergang, maar elke groep houdt zijn eigen plek bij.</div></div></div>`;
  h += `<div class="knoppen">${lijst.map(x => `<button class="btn" data-groep="${esc(x)}" aria-pressed="${x === g}">${esc(x)}</button>`).join('')}</div>`;
  if (!g) return h;
  const lg = leergangVan(g); const r = reeks(lg); const vi = volgendeIndex(g); const lw = lesweekVan(vandaag());
  const gegeven = r.filter(x => afgerond(status(g, x.id))).length;
  const planI = r.findIndex(x => x.w >= (lw || 0));
  h += `<div class="kaart"><div class="kop"><div><h2>${esc(g)} · ${esc(lgNaam(lg))}</h2><div class="sub">${gegeven} van ${r.length} lessen gegeven${lw && planI >= 0 ? ` · volgens de planning nu bij les ${planI + 1} (lesweek ${lw})` : ''} · volgende: les ${vi + 1}</div></div>
    <label style="font-family:var(--kop);font-size:.85rem;color:var(--muted)">Leergang <select id="gLg" data-g="${esc(g)}">${Object.keys(B.leergangen).map(k => `<option value="${k}" ${k === lg ? 'selected' : ''}>${esc(lgNaam(k))}</option>`).join('')}</select></label></div>
    <div class="knoppen" style="margin-top:.5rem"><button class="btn klein" data-opplan="${esc(g)}">Op de planning zetten</button><span class="sub" style="font-family:var(--kop);font-size:.85rem;color:var(--muted)">alle lessen vóór deze lesweek gelden dan als gegeven</span></div>
    <div class="voortgang" style="margin-top:.6rem"><i style="width:${r.length ? Math.round(gegeven / r.length * 100) : 0}%"></i></div></div>`;
  h += `<div class="kaart">${r.map((x, i) => { const l = les(x); const st = status(g, x.id); return `<div class="lesrij ${i === vi ? 'volgende' : ''}"><span class="wk">${i + 1}<br>wk ${x.w}</span><div><div class="regel" style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:baseline">${chipType(l)}<b style="font-family:var(--kop)">${esc(l.titel || '')}</b>${st.st ? `<span class="chip ${st.st === 'gegeven' ? 'ok' : st.st === 'half' ? 'let' : ''}">${esc(st.st)}${st.d ? ' ' + esc(fmtD(st.d)) : ''}</span>` : ''}</div>${st.n ? `<div class="vorige">${esc(st.n)}</div>` : ''}</div>
    <div class="acties knoppen"><button class="btn klein" data-bewerk="${esc(x.id)}">bewerk</button>${afgerond(st) ? `<button class="btn klein" data-reset="${esc(g)}|${esc(x.id)}">niet gegeven</button>` : `<button class="btn klein" data-markeer="${esc(g)}|${esc(x.id)}">gegeven</button>`}</div></div>`; }).join('')}</div>`;
  return h;
}

/* ---------- rooster ---------- */
let zOverArmed = false;
function viewRooster() {
  const rows = [...S.rooster].sort((a, b) => a.dag - b.dag || minuten(a.start) - minuten(b.start));
  const opties = alleGroepen();
  let h = `<div class="kop"><div><h1>Rooster</h1><div class="sub">Elke week hetzelfde. Een losse uitval zet je op de dag zelf met "valt uit".</div></div></div>`;
  h += `<div class="kaart scroll"><table><tr><th>Dag</th><th>Van</th><th>Tot</th><th>Groep</th><th>Leergang</th><th>Lokaal</th><th></th></tr>${rows.length ? rows.map(u => `<tr><td>${esc(DAGLANG[u.dag])}</td><td class="num">${esc(u.start)}</td><td class="num">${esc(u.eind)}</td><td><b>${esc(u.groep)}</b></td><td>${esc(lgNaam(leergangVan(u.groep)))}</td><td>${esc(u.lokaal || '')}</td><td><button class="btn klein rood" data-weg="${esc(u.id)}">weg</button></td></tr>`).join('') : '<tr><td colspan="7" class="leeg">Nog geen lesuren.</td></tr>'}</table></div>`;
  const zv = zVastRooster();
  if (zv.length) h += `<div class="kaart"><h2>Uit Zermelo</h2><p class="lead">Deze muzieklessen staan in je Zermelo-rooster. Neem ze over als vast rooster; je voortgang per groep blijft staan.</p><div class="scroll"><table><tr><th>Dag</th><th>Van</th><th>Tot</th><th>Groep</th><th>Lokaal</th></tr>${zv.map(u => `<tr><td>${esc(DAGLANG[u.dag])}</td><td class="num">${esc(u.start)}</td><td class="num">${esc(u.eind)}</td><td><b>${esc(u.groep)}</b>${leergangVan(u.groep) ? '' : ' <span class="chip rood">geen leergang</span>'}</td><td>${esc(u.lokaal)}</td></tr>`).join('')}</table></div><div class="knoppen" style="margin-top:.6rem"><button class="btn hoofd" data-zovernemen="">${zOverArmed ? 'Zeker? Je huidige rooster wordt vervangen' : 'Overnemen als vast rooster'}</button></div></div>`;
  h += `<form class="kaart form" id="rForm"><h2>Lesuur toevoegen</h2><div class="rij">
    <label>Dag <select id="rDag">${[1, 2, 3, 4, 5].map(d => `<option value="${d}">${DAGLANG[d]}</option>`).join('')}</select></label>
    <label>Van <input id="rVan" type="time" required value="08:30"></label>
    <label>Tot <input id="rTot" type="time" required value="09:15"></label>
    <label>Groep <input id="rGroep" list="groeplijst" required placeholder="bijv. h3a"></label>
    <label>Lokaal <input id="rLok" list="lokalen" value="009" placeholder="009"></label>
    <button class="btn hoofd" type="submit">Toevoegen</button></div>
    <datalist id="groeplijst">${opties.map(x => `<option value="${esc(x.g)}">${esc(lgNaam(x.lg))}</option>`).join('')}</datalist><datalist id="lokalen"><option value="009"><option value="020"></datalist>
    <p class="lead" style="font-size:.9rem">Groepen en leergangen: ${opties.map(x => esc(x.g)).join(', ')}. Een andere groep kan ook; koppel die daarna aan een leergang op het tabblad Groepen.</p></form>`;
  return h;
}

/* ---------- sectie ---------- */
function sectieItems() { return (B.sectie || []).concat(S.sectieExtra || []).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0); }
function sRij(i) {
  const t = vandaag(); const af = i.taak && S.sectieAf[i.id]; const laat = i.taak && !af && i.d < t;
  return `<div class="srij ${laat ? 'laat' : ''} ${af ? 'af' : ''}"><span class="dt">${esc(fmtD(i.d))}${i.tot ? ' – ' + esc(fmtD(i.tot)) : ''}${i.tijd ? '<br>' + esc(i.tijd) : ''}</span><div>${i.taak ? `<label class="chk"><input type="checkbox" data-sdone="${esc(i.id)}" ${af ? 'checked' : ''}><span>${esc(i.titel)}</span></label>` : `<b style="font-family:var(--kop)">${esc(i.titel)}</b>`}${i.info ? `<div class="vorige" style="border:0;padding:0">${esc(i.info)}</div>` : ''}${S.sectieNotitie[i.id] ? `<div class="vorige">✎ ${esc(S.sectieNotitie[i.id])}</div>` : ''}</div></div>`;
}
let sAlles = false;
function viewSectie() {
  const t = vandaag(); const it = sectieItems();
  const open = it.filter(i => i.taak && !S.sectieAf[i.id]);
  const lijst = sAlles ? it : it.filter(i => (i.tot || i.d) >= addD(t, -7) && i.d <= addD(t, 42) || (i.taak && !S.sectieAf[i.id] && i.d < t));
  return `<div class="kop"><div><h1>Sectie</h1><div class="sub">${open.length} open taken · vergaderingen, rapporten, toetsweken en taken uit de jaarplanning</div></div><div class="knoppen"><button class="btn" data-salles="" aria-pressed="${sAlles}">hele jaar</button></div></div>
  <div class="kaart">${lijst.map(sRij).join('') || '<p class="leeg">Niets in deze periode.</p>'}</div>
  <form class="kaart form" id="sForm"><h2>Taak toevoegen</h2><div class="rij"><label style="flex:3 1 16rem">Wat <input id="sT" required></label><label>Datum <input id="sD" type="date" required value="${t}"></label><button class="btn hoofd" type="submit">Toevoegen</button></div></form>`;
}

/* ---------- instellingen ---------- */
function viewInstellingen() {
  const on = M365.enabled(); const acc = M365.account;
  return `<div class="kop"><div><h1>Instellingen</h1></div></div>
  <div class="kaart"><h2>Microsoft 365</h2>${!on ? `<p class="lead">Nog niet gekoppeld. Zet de gegevens van de app-registratie in <code>config.js</code> (zie LEESMIJ.md). Tot die tijd blijft alles op dit apparaat.</p>` : acc ? `<p>Ingelogd als <b>${esc(M365.naam)}</b>. Je gegevens staan ook in je OneDrive, in de map Apps.</p><div class="knoppen"><button class="btn" data-sync="">Nu synchroniseren</button><button class="btn" data-logout="">Uitloggen</button></div>` : `<p class="lead">Log in met je schoolaccount om je gegevens in OneDrive te bewaren en presentaties uit SharePoint te koppelen.</p><button class="btn hoofd" data-login="">Inloggen met schoolaccount</button>`}</div>
  <div class="kaart"><h2>Rooster uit Zermelo</h2>${zProxy() ? `<p class="lead">Plak je Zermelo-agendalink (Zermelo portal, Koppelingen, Agenda). Lesdag haalt dan je rooster op, met roosterwijzigingen en vervallen lessen. Behandel de link als een wachtwoord: wie hem heeft, ziet je rooster.</p>
    <form class="form" id="zForm"><div class="rij"><label style="flex:3 1 18rem">Zermelo-link <input id="zLink" type="password" autocomplete="off" placeholder="${S.zermeloToken ? 'opgeslagen (••••' + esc(S.zermeloToken.slice(-4)) + ')' : 'https://csgpm.zportal.nl/api/v3/ical?access_token=…'}"></label><button class="btn hoofd" type="submit">Opslaan en ophalen</button>${S.zermeloToken ? '<button class="btn" type="button" data-zophalen="">Nu ophalen</button><button class="btn rood" type="button" data-zweg="">Link verwijderen</button>' : ''}</div></form>
    <p class="lead" style="font-size:.9rem">${ZC ? `Laatst opgehaald: ${esc(new Date(ZC.opgehaald).toLocaleString('nl-NL'))}, voor ${esc(fmtD(ZC.van))} tot en met ${esc(fmtD(ZC.tot))}.` : 'Nog niet opgehaald.'}</p>` : `<p class="lead">De roosterproxy staat nog niet in <code>config.js</code>. Zie LEESMIJ.md, stap 3.</p>`}</div>
  <div class="kaart"><h2>Gegevens</h2><p class="lead">Een kopie maken of terugzetten. Handig bij een ander apparaat zonder inloggen.</p><div class="knoppen"><button class="btn" data-export="">Kopie downloaden</button><label class="btn">Kopie terugzetten<input type="file" id="imp" accept="application/json" hidden></label></div></div>
  <div class="kaart"><h2>Over deze versie</h2><p class="lead">Leergangen muziek ${esc(B.schooljaar)}: ${Object.keys(B.leergangen).map(lgNaam).join(', ')}. Bron: Leergang muziek (dashboard).</p></div>`;
}

/* ---------- lade: les bewerken ---------- */
function openBewerk(id) {
  const lg = id.split(':')[0]; const item = reeks(lg).find(x => x.id === id); if (!item) return;
  const l = les(item); const d = $('#drawer');
  d.innerHTML = `<div class="dkop"><h2>${esc(l.titel || 'Les')}</h2><button class="btn" data-sluit="">Sluiten</button></div>
  <p class="lead">${esc(lgNaam(lg))} · lesweek ${item.w} · les ${item.li}. Wijzigingen gelden voor alle groepen met deze leergang.</p>
  <form class="form" id="bForm">
    <label>Titel <input name="titel" value="${esc(l.titel || '')}"></label>
    <label>Type <select name="type" ${l.type === 'toets' ? 'disabled' : ''}>${['theorie', 'praktijk', 'leeg'].map(t => `<option value="${t}" ${l.type === t ? 'selected' : ''}>${TYPE[t]}</option>`).join('')}${l.type === 'toets' ? '<option selected>toets</option>' : ''}</select></label>
    <label>Lesvraag <input name="vraag" value="${esc(l.vraag || '')}"></label>
    <label>Lesdoel <textarea name="doel">${esc(l.doel || '')}</textarea></label>
    <label>Inhoud <textarea name="detail">${esc(l.detail || '')}</textarea></label>
    <label>Lesverloop. Per fase een regel "10 min · uitleg · Kop voor de leerlingen" (soorten: start, luisteren, uitleg, doen, gesprek, check, afsluiten); daaronder "- stap", "? wat te doen als je klaar bent" en "&gt; notitie voor jezelf" <textarea name="fasen" rows="10">${esc(LESMODUS.fasenNaarTekst(l.fasen))}</textarea></label>
    <label>Formatieve check <input name="fsoort" value="${esc((l.formatief || {}).soort || '')}" placeholder="exit ticket, wisbordje…"></label>
    <label>Hoe check je het? <textarea name="ftekst">${esc((l.formatief || {}).tekst || '')}</textarea></label>
    <label>Rode draad identiteit <textarea name="identiteit">${esc(l.identiteit || '')}</textarea></label>
    <label>Materiaal (één per regel: titel | link) <textarea name="materiaal" id="bMat" rows="4">${esc((l.materiaal || []).map(m => m.t + (m.u ? ' | ' + m.u : '')).join('\n'))}</textarea></label>
    ${M365.account ? `<div class="kaart" style="padding:.7rem"><label>Zoek in OneDrive en SharePoint <span class="rij"><input id="zq" placeholder="bijv. Way Maker presentatie"><button class="btn" type="button" data-zoek="">Zoek</button></span></label><div class="zoek" id="zres"></div></div>` : `<p class="lead" style="font-size:.9rem">Log in bij Instellingen om presentaties direct uit SharePoint te koppelen.</p>`}
    <label>Klaarzetten, eigen aanvullingen (één per regel) <textarea name="benodigd">${esc((l.benodigd || []).join('\n'))}</textarea></label>
    <div class="knoppen"><button class="btn hoofd" type="submit">Opslaan</button><button class="btn" type="button" data-sluit="">Annuleren</button>${S.les[id] ? '<button class="btn rood" type="button" data-herstel="">Terug naar de leergang</button>' : ''}</div>
  </form>`;
  d.dataset.id = id; d.classList.add('open'); $('#scrim').hidden = false;
  const matMeta = {}; (l.materiaal || []).forEach(m => { if (m.itemId) matMeta[m.u] = m; });
  d._matMeta = matMeta;
}
function sluit() { $('#drawer').classList.remove('open'); $('#scrim').hidden = true; }
function bewaarBewerk(f) {
  const id = $('#drawer').dataset.id; const g = k => (f.get(k) || '').trim(); const lines = k => g(k).split('\n').map(x => x.trim()).filter(Boolean);
  const meta = $('#drawer')._matMeta || {};
  const oudItem = reeks(id.split(':')[0]).find(x => x.id === id); const oudFasen = oudItem ? (les(oudItem).fasen || []) : [];
  const o = { titel: g('titel'), vraag: g('vraag'), doel: g('doel'), detail: g('detail'), fasen: LESMODUS.tekstNaarFasen(g('fasen'), oudFasen), identiteit: g('identiteit'), benodigd: lines('benodigd'),
    formatief: { soort: g('fsoort'), tekst: g('ftekst') },
    materiaal: lines('materiaal').map(x => { const i = x.indexOf('|'); const m = i < 0 ? { t: x, u: '' } : { t: x.slice(0, i).trim(), u: x.slice(i + 1).trim() }; return meta[m.u] ? Object.assign({}, meta[m.u], { t: m.t }) : m; }) };
  if (f.get('type')) o.type = f.get('type');
  S.les[id] = o; sluit(); bewaar(); toast('Les opgeslagen');
}

/* ---------- lesmodus ---------- */
let LES = null;
function startLes(uurId, s) {
  s = s || vandaag(); const p = planning(s, s)[s];
  if (!p || p.reden || !p.uren.length) { toast('Geen lessen op deze dag'); return; }
  let x = uurId ? p.uren.find(y => y.u.id === uurId) : null;
  if (!x) { const nu = nuMin(); x = p.uren.find(y => !y.klaar && !y.uitval && y.item && nu < minuten(y.u.eind)) || p.uren.find(y => y.item && !y.klaar && !y.uitval); }
  if (!x || !x.item) { toast('Geen les meer om te geven vandaag'); return; }
  const l = les(x.item);
  const t = l.type === 'toets' ? toetsVan(x.item.lg, l.toets) : null;
  const th = x.item.week.thuis || {};
  const vor = vorigeNotitie(x.u.groep, reeks(x.item.lg).indexOf(x.item));
  const materiaalHtml = (l.materiaal || []).length ? `<div class="mats lesmats">${l.materiaal.map((m, i) => /^https?:/i.test(m.u || '') ? `<span><a href="${esc(m.u)}" target="_blank" rel="noopener">${esc(m.t)}</a>${m.itemId && m.driveId ? ` <button class="btn klein" data-preview="${i}">toon hier</button>` : ''}</span>` : `<span>${esc(m.t)}</span>`).join('')}</div><div id="pv" style="display:contents"></div>` : '';
  const slides = LESMODUS.bouwSlides(l, { groep: x.u.groep, lgNaam: lgNaam(x.item.lg), lokaal: x.u.lokaal, toets: t ? t.naam + ' · ' + (t.waar || '') : '', thuis: th, vorige: vor && vor.st.n ? vor.st.n : '', benodigd: benodigd(l), materiaalHtml });
  LES = { x, l, s, slides, i: 0, left: 0, tot: 0, timer: null, notities: false, keuze: x.half ? 'gegeven' : 'gegeven', begin: Date.now() };
  $('#les').hidden = false; document.body.style.overflow = 'hidden'; toonSlide();
}
function toonSlide() {
  const P = LES; const sl = P.slides[P.i]; stopTimer();
  const body = sl.k === 'af' ? afrondenHtml() : sl.h;
  const soort = sl.soort || sl.k; const kl = LESMODUS.SOORT[sl.soort];
  const fasen = P.slides.filter(x => x.k === 'fase'); const fi = fasen.indexOf(sl);
  if (sl.min) { P.left = sl.min * 60; P.tot = sl.min * 60; } else { P.left = 0; P.tot = 0; }
  $('#les').className = 'les s-' + soort; $('#les').style.setProperty('--c', kl ? kl.kleur : '#5B247F'); $('#les').style.setProperty('--z', kl ? kl.zacht : '#d8b8ff');
  $('#les').innerHTML = `<div class="lkop"><b>${esc(P.x.u.groep)}</b><span>${esc(P.x.u.start)}–${esc(P.x.u.eind)}${P.x.u.lokaal ? ' · ' + esc(P.x.u.lokaal) : ''}</span><span class="sp"></span><span class="stip">${P.slides.map((x, j) => `<i class="${j === P.i ? 'nu' : j < P.i ? 'af' : ''} ${x.k}" style="${x.soort && LESMODUS.SOORT[x.soort] ? '--s:' + LESMODUS.SOORT[x.soort].kleur : ''}"></i>`).join('')}</span><span class="klok" id="klok">${klok()}</span></div>
  <div class="slide ${sl.docent === true ? 'docentkaart' : ''}">${body}</div>
  ${sl.k === 'fase' && sl.min ? timerHtml() : ''}
  <div class="notities ${P.notities && sl.docent && sl.docent !== true ? 'open' : ''}" id="notities">${sl.docent && sl.docent !== true ? `<b>Docent</b> ${esc(sl.docent)}` : ''}</div>
  <div class="lbalk"><button data-l="vorige" aria-label="Vorige">‹</button><button data-l="volgende" aria-label="Volgende">›</button><span class="waar">${sl.k === 'fase' ? `fase ${fi + 1} van ${fasen.length}` : sl.k === 'klaar' ? 'jouw kaart' : sl.k === 'welkom' ? 'welkom' : sl.k === 'doel' ? 'lesdoel' : sl.k === 'check' ? 'check' : sl.k === 'id' ? 'rode draad' : sl.k === 'thuis' ? 'thuis' : 'afronden'}</span>${sl.min ? `<button class="timer" data-l="timer" id="tbtn">${P.timer ? 'pauze' : 'start'} timer</button>` : ''}<span class="sp"></span>${sl.docent && sl.docent !== true ? `<button data-l="notities" aria-pressed="${P.notities}">notities</button>` : ''}<button data-l="scherm">volledig scherm</button>${sl.k !== 'af' ? '<button class="af" data-l="naaraf">les afronden</button>' : ''}<button data-l="sluit">sluiten</button></div>`;
  if (sl.min) timer(true);
}
function klok() { const d = new Date(); return d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); }
function timerHtml() { return `<div class="timerhoek">${LESMODUS.timerRing(LES.left, LES.tot)}</div>`; }
function afrondenHtml() {
  const P = LES;
  return `<div class="afronden"><p class="eyebrow">Les afronden · ${esc(P.x.u.groep)}</p><h2>${esc(P.l.titel || '')}</h2>
  <div class="keuzes">${[['gegeven', 'Gegeven'], ['half', 'Half af, volgende keer verder'], ['niet', 'Niet gegeven']].map(([k, n]) => `<button data-keuze="${k}" aria-pressed="${P.keuze === k}">${n}</button>`).join('')}</div>
  <label style="font-family:var(--kop);color:#cbb8db">Notitie voor de volgende les<textarea id="lnot">${esc((status(P.x.u.groep, P.x.item.id) || {}).n || '')}</textarea></label>
  <div class="keuzes"><button data-l="opslaan">Opslaan en naar de volgende les</button></div></div>`;
}
function pad(sec) { const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
function stopTimer() { if (LES && LES.timer) { clearInterval(LES.timer); LES.timer = null; } }
function timer(auto) {
  const P = LES; if (!P) return;
  if (P.timer && !auto) { stopTimer(); const b = $('#tbtn'); if (b) b.textContent = 'start timer'; return; }
  if (P.timer) return;
  const r = 54, c = 2 * Math.PI * r;
  P.timer = setInterval(() => {
    P.left--; const el = $('#tl'); const ring = $('#ring'); const k = $('#klok'); if (k) k.textContent = klok();
    if (el) el.textContent = pad(Math.max(0, P.left));
    if (ring) { const v = ring.querySelector('.voort'); if (v) v.style.strokeDashoffset = c * (1 - Math.max(0, Math.min(1, P.left / (P.tot || 1)))); if (P.left <= 0) ring.classList.add('over'); else if (P.left <= 60) ring.classList.add('bijna'); }
  }, 1000);
  const b = $('#tbtn'); if (b) b.textContent = 'pauze timer';
}
function sluitLes() { stopTimer(); LES = null; $('#les').hidden = true; document.body.style.overflow = ''; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); render(); }
function slaLesOp() {
  const P = LES; const g = P.x.u.groep; const n = ($('#lnot') || {}).value || '';
  S.voortgang[g] = S.voortgang[g] || {};
  if (P.keuze === 'niet') { (S.uitval[P.s] = S.uitval[P.s] || []).push(P.x.u.id); if (n.trim()) S.voortgang[g][P.x.item.id] = Object.assign({}, status(g, P.x.item.id), { n: n.trim() }); }
  else S.voortgang[g][P.x.item.id] = { st: P.keuze, d: P.s, uur: P.x.u.id, n: n.trim() || undefined };
  bewaar(true);
  const s = P.s; const huidig = P.x.u.id; sluitLes();
  const p = planning(s, s)[s]; const idx = p.uren.findIndex(y => y.u.id === huidig);
  const volgende = p.uren.slice(idx + 1).find(y => y.item && !y.klaar && !y.uitval);
  toast(volgende ? `Opgeslagen. Volgende: ${volgende.u.start} ${volgende.u.groep}` : 'Opgeslagen. Geen lessen meer vandaag.');
  if (volgende && s === vandaag()) startLes(volgende.u.id, s);
}
async function preview(i) {
  const m = LES.l.materiaal[i]; const pv = $('#pv'); if (!pv) return;
  pv.innerHTML = '<p class="detail">Laden…</p>';
  try { const url = await M365.preview(m.driveId, m.itemId); pv.innerHTML = url ? `<iframe src="${esc(url)}" allowfullscreen title="${esc(m.t)}"></iframe>` : '<p class="detail">Geen voorbeeld beschikbaar.</p>'; }
  catch (e) { pv.innerHTML = `<p class="detail">Voorbeeld lukt niet: ${esc(e.message)}</p>`; }
}

/* ---------- gebeurtenissen ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('button,[data-dag],[data-week]'); if (!b) return;
  const D = b.dataset;
  if (e.target.closest('#les')) {
    if (D.l === 'volgende' && LES.i < LES.slides.length - 1) { LES.i++; toonSlide(); }
    else if (D.l === 'vorige' && LES.i > 0) { LES.i--; toonSlide(); }
    else if (D.l === 'timer') timer();
    else if (D.l === 'notities') { LES.notities = !LES.notities; $('#notities').classList.toggle('open', LES.notities); b.setAttribute('aria-pressed', LES.notities); }
    else if (D.vink != null) { const p = b.getAttribute('aria-pressed') === 'true'; b.setAttribute('aria-pressed', !p); }
    else if (D.l === 'naaraf') { LES.i = LES.slides.length - 1; toonSlide(); }
    else if (D.l === 'sluit') sluitLes();
    else if (D.l === 'scherm') { const el = $('#les'); if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {}); else if (document.exitFullscreen) document.exitFullscreen().catch(() => {}); }
    else if (D.keuze) { LES.keuze = D.keuze; const n = ($('#lnot') || {}).value; toonSlide(); if (n != null) $('#lnot').value = n; }
    else if (D.l === 'opslaan') slaLesOp();
    else if (D.preview != null) preview(+D.preview);
    return;
  }
  if (D.dag != null && route.naam !== 'vandaag') { dagKeuze = D.dag; location.hash = 'vandaag'; return; }
  if (D.dag != null) { dagKeuze = D.dag; render(); return; }
  if (D.week != null) { weekKeuze = D.week; render(); return; }
  if (D.start != null) { const [u, s] = D.start.split('|'); startLes(u || null, s || vandaag()); return; }
  if (D.uitval) { const [s, u] = D.uitval.split('|'); (S.uitval[s] = S.uitval[s] || []).push(u); bewaar(); toast('Les valt uit; de volgende les schuift door'); return; }
  if (D.uitvalterug) { const [s, u] = D.uitvalterug.split('|'); S.uitval[s] = (S.uitval[s] || []).filter(x => x !== u); bewaar(); return; }
  if (D.bewerk) { openBewerk(D.bewerk); return; }
  if (D.sluit != null) { sluit(); return; }
  if (D.herstel != null) { delete S.les[$('#drawer').dataset.id]; sluit(); bewaar(); return; }
  if (D.groep) { groepKeuze = D.groep; render(); return; }
  if (D.markeer) { const [g, id] = D.markeer.split('|'); S.voortgang[g] = S.voortgang[g] || {}; S.voortgang[g][id] = Object.assign({}, status(g, id), { st: 'gegeven', d: vandaag() }); bewaar(); return; }
  if (D.reset) { const [g, id] = D.reset.split('|'); if (S.voortgang[g]) delete S.voortgang[g][id]; bewaar(); return; }
  if (D.opplan) { const n = opPlanning(D.opplan); bewaar(); toast(`${n} lessen op gegeven gezet`); return; }
  if (D.opplanalle != null) { rooGroepen().forEach(opPlanning); bewaar(); toast('Groepen staan op de planning'); return; }
  if (D.taakweg) { S.taken = (S.taken || []).filter(k => k.id !== D.taakweg); bewaar(); return; }
  if (D.weg) { S.rooster = S.rooster.filter(u => u.id !== D.weg); bewaar(); return; }
  if (D.salles != null) { sAlles = !sAlles; render(); return; }
  if (D.login != null) { M365.login(); return; }
  if (D.logout != null) { M365.logout(); return; }
  if (D.sync != null) { await syncNu(true); return; }
  if (D.zophalen != null) { await zOphalen(true); return; }
  if (D.zweg != null) { delete S.zermeloToken; ZC = null; try { localStorage.removeItem('lesdag-zermelo'); } catch (e) {} bewaar(); return; }
  if (D.zovernemen != null) { if (!zOverArmed) { zOverArmed = true; render(); setTimeout(() => { zOverArmed = false; if (route.naam === 'rooster') render(); }, 5000); return; }
    zOverArmed = false; const oud = S.rooster; S.rooster = zVastRooster().map(u => { const o = oud.find(x => +x.dag === u.dag && x.start === u.start && x.groep === u.groep); return Object.assign({ id: o ? o.id : 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }, u); }); bewaar(); toast('Rooster overgenomen uit Zermelo'); return; }
  if (D.export != null) { const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'lesdag-' + vandaag() + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); return; }
  if (D.zoek != null) { zoek(); return; }
  if (D.kies != null) { kiesBestand(+D.kies); return; }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.sdone) { if (t.checked) S.sectieAf[t.dataset.sdone] = true; else delete S.sectieAf[t.dataset.sdone]; bewaar(); }
  if (t.dataset.taakaf) { const k = (S.taken || []).find(k => k.id === t.dataset.taakaf); if (k) { k.af = t.checked; k.afOp = t.checked ? vandaag() : undefined; } bewaar(); }
  if (t.dataset.dagtaak) { const d = t.dataset.dag; S.dagTaken[d] = S.dagTaken[d] || {}; if (t.checked) S.dagTaken[d][t.dataset.dagtaak] = true; else delete S.dagTaken[d][t.dataset.dagtaak]; bewaar(); }
  if (t.id === 'gLg') { S.groepLeergang[t.dataset.g] = t.value; bewaar(); }
  if (t.id === 'imp' && t.files[0]) { t.files[0].text().then(txt => { const d = JSON.parse(txt); if (d && d.v) { S = Object.assign(nieuweStaat(), d); bewaar(); toast('Kopie teruggezet'); } }).catch(() => toast('Dit bestand kan ik niet lezen')); }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'zForm') { const v = $('#zLink').value; if (v.trim()) { S.zermeloToken = zToken(v); bewaar(true); } zOphalen(true).then(() => render()); return; }
  if (e.target.id === 'rForm') {
    const u = { id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), dag: +$('#rDag').value, start: $('#rVan').value, eind: $('#rTot').value, groep: $('#rGroep').value.trim(), lokaal: $('#rLok').value.trim() };
    if (!u.groep) return; S.rooster.push(u); bewaar(); toast(`${DAGLANG[u.dag]} ${u.start} ${u.groep} toegevoegd`);
    setTimeout(() => { const g = $('#rGroep'); if (g) g.focus(); }, 0);
  }
  if (e.target.id === 'tAdd') { const titel = $('#tT').value.trim(); if (!titel) return; (S.taken = S.taken || []).push({ id: 'k' + Date.now().toString(36), titel, bron: $('#tB').value, d: $('#tD').value || undefined, af: false }); bewaar(); return; }
  if (e.target.id === 'sForm') { S.sectieExtra.push({ id: 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), d: $('#sD').value, titel: $('#sT').value.trim(), soort: 'taak', taak: true }); bewaar(); }
  if (e.target.id === 'bForm') bewaarBewerk(new FormData(e.target));
});
let zoekRes = [];
async function zoek() {
  const q = ($('#zq') || {}).value; const out = $('#zres'); if (!q || !out) return;
  out.innerHTML = '<span class="leeg">Zoeken…</span>';
  try { zoekRes = await M365.search(q); out.innerHTML = zoekRes.length ? zoekRes.map((r, i) => `<button type="button" data-kies="${i}">${esc(r.t)}<small>${esc(r.map || '')}</small></button>`).join('') : '<span class="leeg">Niets gevonden.</span>'; }
  catch (err) { out.innerHTML = `<span class="leeg">Zoeken lukt niet: ${esc(err.message)}</span>`; }
}
function kiesBestand(i) {
  const r = zoekRes[i]; if (!r) return; const ta = $('#bMat');
  ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + r.t + ' | ' + r.u;
  $('#drawer')._matMeta[r.u] = { t: r.t, u: r.u, driveId: r.driveId, itemId: r.itemId };
  toast('Toegevoegd aan materiaal');
}
$('#scrim').addEventListener('click', sluit);
document.addEventListener('keydown', e => {
  if (LES) {
    if (e.target.tagName === 'TEXTAREA') return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); if (LES.i < LES.slides.length - 1) { LES.i++; toonSlide(); } }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); if (LES.i > 0) { LES.i--; toonSlide(); } }
    else if (e.key === 't') timer();
    else if (e.key === 'n') { LES.notities = !LES.notities; const n = $('#notities'); if (n && n.textContent.trim()) n.classList.toggle('open', LES.notities); const b = document.querySelector('#les [data-l="notities"]'); if (b) b.setAttribute('aria-pressed', LES.notities); }
    else if (e.key === 'f') { const el = $('#les'); if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {}); else if (document.exitFullscreen) document.exitFullscreen().catch(() => {}); }
    else if (e.key === 'Escape' && !document.fullscreenElement) sluitLes();
    return;
  }
  if (e.key === 'Escape') sluit();
});
function leesRoute() { const [n, ...a] = location.hash.replace('#', '').split('/'); route = { naam: ROUTES.some(r => r[0] === n) ? n : 'vandaag', arg: a }; }
window.addEventListener('hashchange', () => { leesRoute(); sluit(); render(); window.scrollTo(0, 0); });

/* ---------- synchronisatie ---------- */
async function syncNu(melden) {
  if (!M365.account) return;
  setSync('bezig', 'Synchroniseren…');
  try {
    const r = await M365.loadState();
    if (r && r.v && (r.updated || 0) > (S.updated || 0)) { S = Object.assign(nieuweStaat(), r); try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {} render(); }
    else if (!r || (S.updated || 0) > (r.updated || 0)) await M365.saveState(S);
    setSync('ok', 'Opgeslagen in OneDrive'); if (melden) toast('Gesynchroniseerd');
  } catch (e) { setSync('fout', 'OneDrive niet bereikbaar, staat op dit apparaat'); console.warn(e); if (melden) toast('Synchroniseren lukt niet'); }
}
setInterval(() => { if (!LES && route.naam === 'vandaag' && !document.hidden) render(); }, 60000); // markeer het huidige lesuur
document.addEventListener('visibilitychange', () => { if (document.hidden || LES) return; if (M365.account) syncNu(false); if (S.zermeloToken && zProxy() && (!ZC || Date.now() - ZC.opgehaald > 30 * 60000)) zOphalen(false); });

/* ---------- start ---------- */
(async function start() {
  S = laadLokaal(); leesRoute();
  try { B = await (await fetch('data/basis.json', { cache: 'no-cache' })).json(); }
  catch (e) { $('#main').innerHTML = '<div class="kaart"><p>De leergangen kunnen niet geladen worden. Controleer de verbinding.</p></div>'; return; }
  render();
  try { const acc = await M365.init(); if (acc) await syncNu(false); else setSync('', M365.enabled() ? 'Niet ingelogd' : 'Op dit apparaat'); }
  catch (e) { console.warn(e); setSync('fout', 'Inloggen niet beschikbaar'); }
  if (S.zermeloToken && zProxy() && navigator.onLine && (!ZC || Date.now() - ZC.opgehaald > 30 * 60000 || ZC.van !== maandagVan(vandaag()))) zOphalen(false);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
})();
