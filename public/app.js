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
function nieuweStaat() { return { v: 1, updated: 0, rooster: [], voortgang: {}, les: {}, uitval: {}, sectieAf: {}, sectieNotitie: {}, sectieExtra: [], groepLeergang: {}, taken: [], dagTaken: {}, koorAf: {}, beoord: { lijsten: {}, toetsen: {} } }; }
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
  const f = { vandaag: viewVandaag, week: viewWeek, groepen: viewGroepen, rooster: viewRooster, sectie: viewSectie, instellingen: viewInstellingen, beoordelen: viewBeoordelen }[route.naam] || viewVandaag;
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
const agSel = {}; // gekozen agenda-item per dag
function viewVandaag() {
  const t = vandaag();
  let s = dagKeuze || t;
  if (!dagKeuze && nuMin() >= 16 * 60) s = volgendeLesdag(t, 1); // na 16 uur: alvast morgen voorbereiden
  const p = planning(s, s)[s]; const lw = lesweekVan(s);
  let h = `<div class="kop"><div><h1>${s === t ? 'Vandaag' : 'Voorbereiden'}: ${esc(fmtLang(s))}</h1><div class="sub">${lw ? 'lesweek ' + lw : ''}${p.reden ? ' · ' + esc(p.reden) : ''}</div></div>
    <div class="knoppen"><button class="btn" data-dag="${volgendeLesdag(s, -1)}">‹ vorige</button><button class="btn" data-dag="${t}">vandaag</button><button class="btn" data-dag="${volgendeLesdag(s, 1)}">volgende ›</button>
    ${s === t && !p.reden && p.uren.length ? '<button class="btn hoofd" data-start="">▶ Lesmodus</button>' : ''}</div></div>`;
  if (!S.rooster.length) h += `<div class="kaart" style="margin-bottom:1rem"><h2>Eerst je rooster</h2><p class="lead">Vul één keer je weekrooster in: per lesuur de groep en het lokaal. Daarna staan je lessen hier in de agenda, met wat er klaar moet staan.</p><p><a class="btn hoofd" href="#rooster">Rooster invullen</a></p></div>`;
  const achter = rooGroepen().filter(g => !Object.keys(S.voortgang[g] || {}).length && leergangVan(g) && reeks(leergangVan(g)).some(x => x.w < (lesweekVan(t) || nextLesweek()) - 1));
  if (achter.length) h += `<div class="melding info">Begin je nu met Lesdag? ${esc(achter.join(', '))} staan nog op les 1. <button class="btn klein" data-opplanalle="">Zet ze op de planning</button> Dan gelden alle lessen vóór deze lesweek als gegeven.</div>`;
  const A = dagItems(s, p);
  const sel = kiesSel(s, A);
  h += `<div class="dagagenda"><div class="kaart agkaart">${heleDagRij(s, A.heleDag)}${agendaRaster([{ s, items: A.items }], { ppm: 1.25, sel })}</div><div class="agpaneel">${agPaneel(s, p, A, sel)}</div></div>`;
  // klaarzetten per lokaal
  const perLokaal = {};
  (p.uren || []).forEach(x => { if (!x.item || x.uitval || x.klaar) return; const l = les(x.item); const k = x.u.lokaal || '009'; (perLokaal[k] = perLokaal[k] || []).push({ x, ben: benodigd(l), l }); });
  if (Object.keys(perLokaal).length) h += `<div class="grid">${Object.entries(perLokaal).map(([lok, arr]) => `<div class="kaart lokaalblok klaarzet"><h3>Klaarzetten in ${esc(lok)}</h3>${arr.map(({ x, ben }) => `<div><b style="font-family:var(--kop)">${esc(x.u.start)} ${esc(x.u.groep)}</b><div class="mats" style="margin:.2rem 0 .5rem">${ben.length ? ben.map(b => `<span class="chip">${esc(b)}</span>`).join('') : '<span class="leeg">niets bijzonders</span>'}</div></div>`).join('')}</div>`).join('')}</div>`;
  return h + dagExtra(s, p);
}
/* ---------- agenda: lessen, afspraken en geplande taken op hun tijd; vrije blokken voor taken ---------- */
const AG = { van: 8 * 60, tot: 17 * 60, werkVan: 8 * 60 + 30, werkTot: 16 * 60 + 30 };
const hm = m => Math.floor(m / 60) + ':' + ('0' + m % 60).slice(-2);
function sectieTijd(i) { const m = String(i.tijd || '').match(/(\d{1,2})[:.](\d{2})\s*[–-]\s*(\d{1,2})[:.](\d{2})/); return m ? { van: +m[1] * 60 + +m[2], tot: +m[3] * 60 + +m[4] } : null; }
/* schoolkoor: agenda uit de Koorapp (B.koor, via tools/koor-sync.js); op dinsdag anders de vaste repetitie */
function toetsweekOp(s) { return (B.sectie || []).some(i => /^toetsweek/i.test(i.titel || '') && s >= i.d && s <= (i.tot || i.d)); }
function koorOp(s) {
  const K = B.koor; if (!K) return null;
  const a = (K.agenda || []).find(x => x.d === s); if (a) return a;
  const st = K.standaard; if (!st || dOf(s).getDay() !== st.dag || vrijReden(s) || toetsweekOp(s)) return null;
  const laatste = (K.agenda || []).filter(x => x.type !== 'concert').map(x => x.d).sort().pop() || '';
  if (s <= laatste) return null; // binnen de koorplanning geldt alleen wat de Koorapp zegt
  return { d: s, type: 'rep', titel: st.titel, van: st.van, tot: st.tot, standaard: true };
}
const koorNaam = k => k.type === 'concert' ? 'Concert: ' + (k.concert || k.titel) : k.type === 'extra' ? 'Extra koorrepetitie' : 'Schoolkoor';
function koorTakenOpen(s) { const G = geplandeSleutels(); return ((B.koor || {}).taken || []).filter(t => !S.koorAf[t.id] && !G.koor[t.id] && (!t.d || t.d <= addD(s, 21))); }
function geplandeSleutels() { const sec = {}, pres = {}, koor = {}; (S.taken || []).forEach(k => { if (k.sectieId) sec[k.sectieId] = k; if (k.koorId) koor[k.koorId] = k; if (k.dagTaak) pres[k.dagTaak.dag + '|' + k.dagTaak.key] = k; }); return { sec, pres, koor }; }
function dagItems(s, p) {
  const t = vandaag(); const items = []; const heleDag = []; const G = geplandeSleutels();
  const werkdag = !(p.reden && /vakantie|weekend/i.test(p.reden));
  if (werkdag) items.push({ key: 'start', van: AG.van, tot: AG.werkVan, soort: 'start', titel: 'Koffie en opstarten' });
  for (const x of p.uren || []) {
    const l = x.item ? les(x.item) : null; const verleden = s < t && !x.klaar;
    items.push({ key: 'les:' + x.u.id, van: minuten(x.u.start), tot: minuten(x.u.eind), soort: x.uitval ? 'uitval' : x.klaar ? 'klaar' : 'les', titel: x.u.groep,
      sub: x.uitval ? (x.u.vervallen ? 'vervallen' : 'valt uit') : x.fout ? x.fout : verleden ? '' : l ? (l.titel || '') : 'alles gegeven', lokaal: x.u.lokaal || '009', x });
  }
  const kr = koorOp(s);
  if (kr) { const van = kr.van ? minuten(kr.van) : null, tot = kr.tot ? minuten(kr.tot) : null;
    if (kr.type === 'vrij') heleDag.push({ key: 'koor:' + s, soort: 'koorvrij', titel: kr.titel, koor: kr });
    else if (van != null && tot != null && van < AG.tot) items.push({ key: 'koor:' + s, van, tot: Math.min(tot, AG.tot), soort: 'koor', titel: koorNaam(kr), sub: kr.type === 'concert' ? (kr.plaats || '') : kr.titel, lokaal: kr.type === 'concert' ? '' : kr.plaats || '', koor: kr });
    else heleDag.push({ key: 'koor:' + s, soort: 'koor', titel: (kr.van ? kr.van + ' ' : '') + koorNaam(kr) + (kr.type === 'concert' ? '' : ': ' + kr.titel), koor: kr }); }
  for (const i of sectieItems()) {
    const opDag = i.d === s || (i.tot && i.d <= s && i.tot >= s); if (!opDag) continue;
    if (i.taak) { if (!S.sectieAf[i.id] && !G.sec[i.id] && i.d === s) heleDag.push({ key: 'sectie:' + i.id, soort: 'deadline', titel: i.titel, i }); continue; }
    const tm = sectieTijd(i);
    if (tm && !i.tot && tm.van < AG.tot) items.push({ key: 'sectie:' + i.id, van: tm.van, tot: Math.min(tm.tot, AG.tot), soort: 'sectie', titel: i.titel, sub: i.info || '', i });
    else heleDag.push({ key: 'sectie:' + i.id, soort: 'sectie', titel: (tm ? hm(tm.van) + ' ' : '') + i.titel, i });
  }
  for (const k of S.taken || []) {
    if (k.plan && k.plan.dag === s) items.push({ key: 'taak:' + k.id, van: minuten(k.plan.van), tot: minuten(k.plan.tot), soort: k.af ? 'taakaf' : 'taak', titel: k.titel, sub: BRON[k.bron] || '', k });
    else if (!k.plan && !k.af && k.d === s) heleDag.push({ key: 'taak:' + k.id, soort: 'deadline', titel: k.titel, k });
  }
  if (werkdag) { // vrije blokken tussen 8:30 en 16:30
    const bezet = items.filter(it => ['les', 'klaar', 'sectie', 'taak', 'taakaf', 'koor'].includes(it.soort)).map(it => [it.van, it.tot]).sort((a, b) => a[0] - b[0]);
    let cur = AG.werkVan;
    for (const [a, b] of bezet.concat([[AG.werkTot, AG.werkTot]])) { const eind = Math.min(a, AG.werkTot); if (eind - cur >= 15) items.push({ key: 'vrij:' + hm(cur), van: cur, tot: eind, soort: 'vrij', titel: 'Vrij', sub: (eind - cur) + ' min' }); cur = Math.max(cur, b); if (cur >= AG.werkTot) break; }
  }
  items.sort((a, b) => a.van - b.van || b.tot - a.tot);
  // overlappende items naast elkaar (vrije blokken overlappen nooit)
  let groep = [], groepEind = -1;
  const sluitGroep = () => { const banen = []; groep.forEach(it => { let b = banen.findIndex(e => e <= it.van); if (b < 0) { b = banen.length; banen.push(0); } banen[b] = it.tot; it.baan = b; }); groep.forEach(it => { it.banen = banen.length; }); };
  for (const it of items) { if (it.soort === 'start') { it.baan = 0; it.banen = 1; continue; } if (it.van >= groepEind && groep.length) { sluitGroep(); groep = []; } groep.push(it); groepEind = Math.max(groepEind, it.tot); }
  if (groep.length) sluitGroep();
  return { items, heleDag, werkdag };
}
function kiesSel(s, A) {
  const ok = k => A.items.some(it => it.key === k) || A.heleDag.some(it => it.key === k);
  if (agSel[s] && ok(agSel[s])) return agSel[s];
  const nu = s === vandaag() ? nuMin() : -1; const lessen = A.items.filter(it => it.soort === 'les');
  const kies = lessen.find(it => nu < it.tot) || lessen[0] || A.items.find(it => it.soort === 'vrij') || A.items.find(it => it.soort !== 'start');
  return kies ? kies.key : '';
}
function heleDagRij(s, lijst, max) {
  if (!lijst.length) return '';
  const rest = max && lijst.length > max ? lijst.length - max + 1 : 0; const toon = rest ? lijst.slice(0, max - 1) : lijst;
  return `<div class="ag-hd">${toon.map(it => `<button class="ag-chip ag-${it.soort}" data-ag="${s}|${esc(it.key)}" title="${esc(it.titel)}">${it.soort === 'deadline' ? 'deadline: ' : ''}${esc(it.titel)}</button>`).join('')}${rest ? `<button class="ag-chip ag-deadline" data-dag="${s}">+ ${rest} meer</button>` : ''}</div>`;
}
// dagen: [{s, items, kop?}], opt: {ppm, sel, compact}
function agendaRaster(dagen, opt) {
  const ppm = opt.ppm; const hoog = (AG.tot - AG.van) * ppm; const t = vandaag(); const nu = nuMin();
  const uren = []; for (let m = AG.van; m <= AG.tot; m += 60) uren.push(m);
  const as = `<div class="ag-as" style="height:${hoog}px">${uren.map(m => `<span style="top:${(m - AG.van) * ppm}px">${hm(m)}</span>`).join('')}</div>`;
  const kol = d => {
    const lijnen = uren.map(m => `<i class="ag-lijn" style="top:${(m - AG.van) * ppm}px"></i>`).join('');
    const nuLijn = d.s === t && nu > AG.van && nu < AG.tot ? `<i class="ag-nu" style="top:${(nu - AG.van) * ppm}px"></i>` : '';
    const blokken = d.items.map(it => {
      const top = (Math.max(it.van, AG.van) - AG.van) * ppm; const h = Math.max(14, (Math.min(it.tot, AG.tot) - Math.max(it.van, AG.van)) * ppm - 2);
      const w = 100 / (it.banen || 1); const kort = h < 34;
      const nuCls = d.s === t && nu >= it.van && nu < it.tot && it.soort === 'les' ? ' nu' : '';
      return `<button class="ag-it ag-${it.soort}${opt.sel === it.key ? ' sel' : ''}${nuCls}${kort ? ' kort' : ''}" style="top:${top}px;height:${h}px;left:calc(${(it.baan || 0) * w}% + 2px);width:calc(${w}% - 4px)" data-ag="${d.s}|${esc(it.key)}" title="${esc(hm(it.van) + '–' + hm(it.tot) + ' ' + it.titel + (it.sub ? ' · ' + it.sub : ''))}">`
        + `<span class="ag-t">${hm(it.van)}${kort ? '' : '–' + hm(it.tot)}${it.lokaal && !opt.compact ? ' · ' + esc(it.lokaal) : ''}</span><b>${it.soort === 'vrij' ? (opt.compact ? (kort ? '+' : '+ plannen') : '+ taak plannen') : esc(it.titel)}</b>${!kort && it.sub && it.soort !== 'vrij' ? `<span class="ag-s">${esc(it.sub)}</span>` : it.soort === 'vrij' && !kort && !opt.compact ? `<span class="ag-s">${esc(it.sub)} vrij</span>` : ''}</button>`;
    }).join('');
    return `<div class="ag-kol${d.s === t ? ' vandaag' : ''}" style="height:${hoog}px">${lijnen}${nuLijn}${blokken}</div>`;
  };
  return `<div class="ag-raster" style="--n:${dagen.length}">${as}${dagen.map(kol).join('')}</div>`;
}
function agPaneel(s, p, A, sel) {
  const it = A.items.find(x => x.key === sel) || A.heleDag.find(x => x.key === sel);
  if (!it) return `<div class="kaart"><p class="lead">${A.werkdag ? 'Niets in de agenda op deze dag.' : 'Vrij.'}</p></div>`;
  const t = vandaag(); const tijd = it.van != null ? `${hm(it.van)}–${hm(it.tot)}` : '';
  if (it.x) return uurKaart(s, it.x, s === t && nuMin() >= it.van - 5 && nuMin() < it.tot);
  if (it.soort === 'start') { const eerste = A.items.find(x => x.soort === 'les'); return `<div class="kaart"><p class="eyebrow">${tijd}</p><h2>Koffie en opstarten</h2><p class="lead">${eerste ? `Eerste les om ${hm(eerste.van)}: ${esc(eerste.titel)}.` : 'Geen lessen vandaag.'} Om 8:30 begint je eerste werkblok.</p></div>`; }
  if (it.soort === 'vrij') return planKaart(s, p, it);
  if (it.koor) return koorKaart(s, it.koor);
  if (it.k) { const k = it.k; return `<div class="kaart"><p class="eyebrow">${k.plan ? 'Gepland · ' + esc(fmtD(k.plan.dag)) + ' ' + esc(k.plan.van) + '–' + esc(k.plan.tot) : 'Eigen taak'}${k.bron ? ' · ' + esc(BRON[k.bron] || k.bron) : ''}</p><h2>${esc(k.titel)}</h2>${k.d ? `<p class="lead">Deadline ${esc(fmtD(k.d))}</p>` : ''}
    <label class="chk" style="margin:.6rem 0"><input type="checkbox" data-taakaf="${esc(k.id)}" ${k.af ? 'checked' : ''}><span>Klaar</span></label>
    <div class="knoppen">${k.plan ? `<button class="btn" data-ontplan="${esc(k.id)}">Uit de agenda halen</button>` : ''}<button class="btn" data-taakweg="${esc(k.id)}">Verwijderen</button></div></div>`; }
  if (it.i) return `<div class="kaart"><p class="eyebrow">${it.soort === 'deadline' ? 'Sectietaak · deadline vandaag' : 'Agenda sectie'}</p>${sRij(it.i)}</div>`;
  return '';
}
function koorKaart(s, k) {
  const K = B.koor || {}; const tijd = k.van ? k.van + (k.tot ? '–' + k.tot : '') : (k.tijdTekst || '');
  const rep = k.type === 'rep' || k.type === 'extra'; const af = !!(S.dagTaken[s] || {}).koor;
  return `<div class="kaart koorkaart"><p class="eyebrow">${esc(koorNaam(k))} · ${esc(fmtD(s))}${tijd ? ' · ' + esc(tijd) : ''}${k.plaats ? ' · ' + esc(k.plaats) : ''}</p><h2>${esc(k.titel)}</h2>
    ${k.concert && k.type !== 'concert' ? `<p class="lead">Op weg naar: ${esc(k.concert)}</p>` : ''}
    ${k.tijdUitPraktisch ? '<p class="lead">Tijd uit Praktisch in de koorapp: van verzamelen tot ongeveer twee uur na de aanvang.</p>' : ''}
    ${k.standaard ? '<p class="lead">Vaste repetitie op dinsdag. Voor deze datum staat nog niets in de koorapp.</p>' : ''}
    ${(k.plan || []).length ? `<h3>Repetitieplan</h3><ol class="fasen">${k.plan.map(x => `<li><b>${esc(x.stuk)}</b>${x.aandacht ? ' · ' + esc(x.aandacht) : ''}${x.min ? ' <span class="chip">' + esc(x.min) + '</span>' : ''}</li>`).join('')}</ol>` : ''}
    ${rep ? `<label class="chk" style="margin:.6rem 0"><input type="checkbox" data-dagtaak="koor" data-dag="${s}" ${af ? 'checked' : ''}><span>Repetitie voorbereid</span></label>` : ''}
    <div class="knoppen"><a class="btn hoofd" href="${esc(K.url || '#')}" target="_blank" rel="noopener">Open de koorapp</a></div>
    <p class="sub" style="margin-top:.5rem">Uit de koorapp (inhoudsversie ${esc(String(K.inhoudsversie || '?'))}, opgehaald ${esc(K.bijgewerkt || '')}).</p></div>`;
}
function planKaart(s, p, it) {
  const { sec, pres } = geplandeSleutels(); const opties = [];
  (S.taken || []).filter(k => !k.af && !k.plan).forEach(k => opties.push([`eigen:${k.id}`, k.titel + (k.d ? ' (deadline ' + fmtD(k.d) + ')' : '')]));
  sectieItems().filter(i => i.taak && !S.sectieAf[i.id] && !sec[i.id] && i.d <= addD(s, 14)).forEach(i => opties.push([`sec:${i.id}`, 'Sectie: ' + i.titel + ' (' + fmtD(i.d) + ')']));
  const kr = koorOp(s); if (kr && (kr.type === 'rep' || kr.type === 'extra') && !(S.dagTaken[s] || {}).koor && !pres[s + '|koor']) opties.push(['koorrep', 'Koorrepetitie voorbereiden: ' + kr.titel]);
  koorTakenOpen(s).forEach(t => opties.push(['koor:' + t.id, 'Koor: ' + t.titel + (t.d ? ' (' + fmtD(t.d) + ')' : '')]));
  for (const x of p.uren || []) { if (!x.item || x.uitval || x.klaar) continue; const l = les(x.item); const key = 'pres:' + x.item.id; if ((l.materiaal || []).some(m => /presentatie|\.pptx/i.test((m.t || '') + ' ' + (m.u || ''))) && !(S.dagTaken[s] || {})[key] && !pres[s + '|' + key]) opties.push([`pres:${x.item.id}`, `Presentatie doorlopen: ${x.u.groep} ${l.titel}`]); }
  const duur = Math.min(it.tot - it.van, 50);
  return `<div class="kaart"><p class="eyebrow">Vrij · ${hm(it.van)}–${hm(it.tot)} · ${it.tot - it.van} minuten</p><h2>Taak plannen</h2>
  <form id="planForm" class="planform" data-dag="${s}">
    <label>Wat ga je doen?<select id="pK"><option value="">Nieuwe taak…</option>${opties.map(([v, n]) => `<option value="${esc(v)}">${esc(n)}</option>`).join('')}</select></label>
    <div id="pNieuw" class="rij"><input id="pT" placeholder="Bijvoorbeeld: mail beantwoorden"><select id="pB">${Object.entries(BRON).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    <div class="rij"><label>Van<input id="pVan" type="time" value="${hm(it.van).padStart(5, '0')}" min="07:00" max="22:00"></label><label>Tot<input id="pTot" type="time" value="${hm(it.van + duur).padStart(5, '0')}" min="07:00" max="22:00"></label></div>
    <button class="btn hoofd" type="submit">In de agenda zetten</button>
  </form></div>`;
}
/* taken en sectieafspraken zonder tijd staan in de agenda; hieronder de takenlijst */
const BRON = { sectie: 'sectie', koor: 'koor', slc: 'SLC', mail: 'mail', les: 'lessen', overig: 'overig' };
function dagExtra(s, p) { return takenBlok(s, p); }
function takenBlok(s, p) {
  const t = vandaag(); const dt = S.dagTaken[s] || {}; const G = geplandeSleutels();
  // automatische dagtaken: presentaties van de lessen van deze dag doorlopen
  const auto = [];
  (p.uren || []).forEach(x => { if (!x.item || x.uitval || x.klaar) return; const l = les(x.item); const pres = (l.materiaal || []).filter(m => /presentatie|\.pptx/i.test((m.t || '') + ' ' + (m.u || ''))); if (pres.length && !G.pres[s + '|pres:' + x.item.id]) auto.push({ key: 'pres:' + x.item.id, titel: `Presentatie doorlopen: ${l.titel}`, sub: `${x.u.start} ${x.u.groep} · let op onhandige dia's, volgorde en wat je zelf wilt zeggen`, af: !!dt['pres:' + x.item.id] }); });
  const eigen = (S.taken || []).filter(k => !k.af || k.afOp === s).sort((a, b) => (a.d || '9') < (b.d || '9') ? -1 : 1);
  const sect = sectieItems().filter(i => i.taak && !S.sectieAf[i.id] && !G.sec[i.id] && i.d <= addD(s, 14));
  const rij = (k, chk, extra) => `<div class="taak ${k.af ? 'af' : ''} ${k.d && k.d < t && !k.af ? 'laat' : ''}"><label class="chk">${chk}<span>${esc(k.titel)}</span></label><span class="tb">${k.bron ? `<span class="chip">${esc(BRON[k.bron] || k.bron)}</span>` : ''}${k.plan ? `<button class="chip ok" data-ag="${esc(k.plan.dag)}|taak:${esc(k.id)}">${esc(fmtD(k.plan.dag))} ${esc(k.plan.van)}</button>` : ''}${k.d ? `<span class="chip ${k.d < t && !k.af ? 'rood' : ''}">deadline ${esc(fmtD(k.d))}</span>` : ''}${extra || ''}</span>${k.sub ? `<div class="sub">${esc(k.sub)}</div>` : ''}</div>`;
  let h = `<div class="kaart"><h2 style="margin-bottom:.3rem">Taken</h2><p class="lead" style="margin-bottom:.4rem">Klik in de agenda op een vrij blok om een taak op een vast moment te zetten.</p>`;
  if (auto.length) h += `<h3>Lessen van ${s === t ? 'vandaag' : 'deze dag'}</h3>` + auto.map(k => rij(k, `<input type="checkbox" data-dagtaak="${esc(k.key)}" data-dag="${s}" ${k.af ? 'checked' : ''}>`)).join('');
  const kr = koorOp(s); const krRep = kr && (kr.type === 'rep' || kr.type === 'extra') && !G.pres[s + '|koor'] ? kr : null; const kt = koorTakenOpen(s);
  if (krRep || kt.length) h += '<h3>Koor</h3>' + (krRep ? rij({ titel: koorNaam(krRep) + ' voorbereiden: ' + krRep.titel, sub: (krRep.van ? krRep.van + ' · ' : '') + ((krRep.plan || []).map(x => x.stuk).join(', ') || 'repetitieplan in de koorapp'), af: !!dt.koor, bron: 'koor' }, `<input type="checkbox" data-dagtaak="koor" data-dag="${s}" ${dt.koor ? 'checked' : ''}>`) : '') + kt.map(t => rij({ titel: t.titel, d: t.d, sub: t.sub, bron: 'koor', af: false }, `<input type="checkbox" data-koorvink="${esc(t.id)}">`)).join('');
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
    <div class="knoppen">${x.klaar ? '' : `<button class="btn hoofd" data-start="${esc(u.id)}|${s}">▶ Geef les</button>`}${bmVoor(x.item).map(m => `<button class="btn" data-beoordeel="${esc(m.id)}|${esc(u.groep)}">Beoordelen ${esc(m.toets)}</button>`).join('')}<button class="btn" data-bewerk="${esc(x.item.id)}">bewerk les</button>${x.klaar ? '' : `<button class="btn" data-uitval="${s}|${u.id}">valt uit</button>`}</div>
  </div></div>`;
}

/* ---------- week ---------- */
let weekKeuze = null;
function viewWeek() {
  const t = vandaag(); const ma = weekKeuze || maandagVan(t); const vr = addD(ma, 4);
  const p = planning(ma, vr); const lw = lesweekVan(ma) || lesweekVan(addD(ma, 2));
  let h = `<div class="kop"><div><h1>Week van ${esc(fmtD(ma))}</h1><div class="sub">${lw ? 'lesweek ' + lw : 'geen lesweek'}</div></div><div class="knoppen"><button class="btn" data-week="${addD(ma, -7)}">‹ vorige</button><button class="btn" data-week="${maandagVan(t)}">deze week</button><button class="btn" data-week="${addD(ma, 7)}">volgende ›</button></div></div>`;
  const dagen = []; for (let i = 0; i < 5; i++) { const s = addD(ma, i); const A = dagItems(s, p[s]); dagen.push({ s, items: A.items, heleDag: A.heleDag, reden: p[s].reden }); }
  const vrijMin = dagen.reduce((a, d) => a + d.items.filter(x => x.soort === 'vrij').reduce((b, x) => b + x.tot - x.van, 0), 0);
  h += `<div class="kaart wkagenda"><div class="ag-scroll"><div class="ag-kop" style="--n:5"><span></span>${dagen.map(d => `<button class="ag-dag${d.s === t ? ' vandaag' : ''}" data-dag="${d.s}"><b>${esc(fmtD(d.s))}</b>${d.reden && d.reden !== 'weekend' ? `<small>${esc(d.reden)}</small>` : ''}</button>`).join('')}</div>`;
  if (dagen.some(d => d.heleDag.length)) h += `<div class="ag-kop ag-hdrij" style="--n:5"><span></span>${dagen.map(d => `<div>${heleDagRij(d.s, d.heleDag, 2)}</div>`).join('')}</div>`;
  h += agendaRaster(dagen, { ppm: 0.95, compact: true }) + `</div></div>`;
  const wk = [5, 6].map(i => addD(ma, i)).map(s => ({ s, k: koorOp(s) })).filter(x => x.k && x.k.type !== 'vrij');
  if (wk.length) h += `<div class="ag-weekend"><b>Weekend</b>${wk.map(x => `<button class="ag-chip ag-koor" data-ag="${x.s}|koor:${x.s}">${esc(fmtD(x.s))} ${esc(x.k.van ? x.k.van + '–' + (x.k.tot || '') + ' ' : '')}${esc(koorNaam(x.k))}${x.k.plaats ? ' · ' + esc(x.k.plaats) : ''}</button>`).join('')}</div>`;
  return h + `<p class="lead">${Math.floor(vrijMin / 60)} uur en ${vrijMin % 60} minuten vrij deze week (tussen 8:30 en 16:30). Klik op een vrij blok om er een taak in te zetten, of op een les om die voor te bereiden. De lesvolgorde schuift vanzelf door als een les uitvalt of niet af is.</p>`;
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
  const bms = BM.filter(m => (m.lessen || []).some(k => k.lg === lg));
  if (bms.length) h += `<div class="kaart"><h2>Beoordelen</h2><p class="lead">Ook om in te halen of na te kijken buiten de toetsles.</p><div class="knoppen" style="margin-top:.5rem">${bms.map(m => { const T = S.beoord.toetsen[m.id + '|' + g]; const n = T ? Object.values(T.ll).filter(r => r.af || bmEind(m, r) != null).length : 0; return `<button class="btn" data-beoordeel="${esc(m.id)}|${esc(g)}">${esc(m.toets)} ${esc(m.titel.replace(/^[^:]*:\s*/, ''))}${n ? ` (${n} klaar)` : ''}</button>`; }).join('')}</div></div>`;
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
  if (D.ag) { const i = D.ag.indexOf('|'); const d = D.ag.slice(0, i); agSel[d] = D.ag.slice(i + 1); dagKeuze = d; if (route.naam !== 'vandaag') location.hash = 'vandaag'; else { render(); if (innerWidth < 820) { const pn = $('.agpaneel'); if (pn) pn.scrollIntoView({ behavior: 'smooth', block: 'start' }); } } return; }
  if (D.ontplan) { const k = (S.taken || []).find(k => k.id === D.ontplan); if (k) { agSel[k.plan.dag] = ''; delete k.plan; } bewaar(); toast('Uit de agenda gehaald; de taak staat nog in je lijst'); return; }
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
  if (t.dataset.taakaf) { const k = (S.taken || []).find(k => k.id === t.dataset.taakaf); if (k) { k.af = t.checked; k.afOp = t.checked ? vandaag() : undefined; if (k.sectieId) { if (t.checked) S.sectieAf[k.sectieId] = true; else delete S.sectieAf[k.sectieId]; } if (k.koorId) { if (t.checked) S.koorAf[k.koorId] = true; else delete S.koorAf[k.koorId]; } if (k.dagTaak) { const dd = S.dagTaken[k.dagTaak.dag] = S.dagTaken[k.dagTaak.dag] || {}; if (t.checked) dd[k.dagTaak.key] = true; else delete dd[k.dagTaak.key]; } } bewaar(); }
  if (t.dataset.koorvink) { if (t.checked) S.koorAf[t.dataset.koorvink] = true; else delete S.koorAf[t.dataset.koorvink]; bewaar(); }
  if (t.dataset.dagtaak) { const d = t.dataset.dag; S.dagTaken[d] = S.dagTaken[d] || {}; if (t.checked) S.dagTaken[d][t.dataset.dagtaak] = true; else delete S.dagTaken[d][t.dataset.dagtaak]; bewaar(); }
  if (t.id === 'pK') { const n = $('#pNieuw'); if (n) n.hidden = !!t.value; }
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
  if (e.target.id === 'planForm') {
    const dag = e.target.dataset.dag; const v = $('#pK').value; const van = $('#pVan').value.replace(/^0/, ''), tot = $('#pTot').value.replace(/^0/, '');
    if (!van || !tot || minuten(tot) <= minuten(van)) { toast('Kies een eindtijd na de begintijd'); return; }
    const plan = { dag, van, tot }; const nieuwId = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); let k;
    S.taken = S.taken || [];
    if (v.startsWith('eigen:')) { k = S.taken.find(x => x.id === v.slice(6)); if (k) k.plan = plan; }
    else if (v.startsWith('sec:')) { const i = sectieItems().find(x => x.id === v.slice(4)); if (i) { k = { id: nieuwId(), titel: i.titel, bron: 'sectie', sectieId: i.id, d: i.d, af: false, plan }; S.taken.push(k); } }
    else if (v === 'koorrep') { const kr = koorOp(dag); if (kr) { k = { id: nieuwId(), titel: 'Koorrepetitie voorbereiden: ' + kr.titel, bron: 'koor', dagTaak: { dag, key: 'koor' }, af: false, plan }; S.taken.push(k); } }
    else if (v.startsWith('koor:')) { const kt = ((B.koor || {}).taken || []).find(x => x.id === v.slice(5)); if (kt) { k = { id: nieuwId(), titel: kt.titel, bron: 'koor', koorId: kt.id, d: kt.d, af: false, plan }; S.taken.push(k); } }
    else if (v.startsWith('pres:')) { const it = (planning(dag, dag)[dag].uren || []).find(x => x.item && x.item.id === v.slice(5)); if (it) { k = { id: nieuwId(), titel: 'Presentatie doorlopen: ' + it.u.groep + ' ' + (les(it.item).titel || ''), bron: 'les', dagTaak: { dag, key: 'pres:' + it.item.id }, af: false, plan }; S.taken.push(k); } }
    else { const titel = $('#pT').value.trim(); if (!titel) { toast('Geef de taak een naam'); return; } k = { id: nieuwId(), titel, bron: $('#pB').value, af: false, plan }; S.taken.push(k); }
    if (k) { agSel[dag] = 'taak:' + k.id; bewaar(); toast(`${k.titel} staat op ${fmtD(dag)} om ${van}`); }
    return;
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
function leesRoute() { const [n, ...a] = location.hash.replace('#', '').split('/'); route = { naam: ROUTES.some(r => r[0] === n) || n === 'beoordelen' ? n : 'vandaag', arg: a }; }
window.addEventListener('hashchange', () => { leesRoute(); sluit(); render(); window.scrollTo(0, 0); });

/* ---------- beoordelen ----------
   Modellen: data/beoordeling.json (uit tools/beoordeling, zonder leerlinggegevens).
   Klassenlijsten en scores staan alleen in S.beoord: op dit apparaat en in de eigen OneDrive, nooit op de server. */
let BM = [];
let bmSel = null, bmLijstOpen = false, bmKlok = null;
const bmVoor = item => BM.filter(m => (m.lessen || []).some(k => k.lg === item.lg && k.w === item.w && k.slot === 'l' + item.li && (k.wat || []).includes('docent')));
const bmCrit = m => m.onderdelen.flatMap(o => o.criteria.map(c => Object.assign({ groep: o.groep }, c)));
const bmSomW = m => bmCrit(m).reduce((a, c) => a + c.weging, 0);
const komma = x => x == null ? '' : String(x).replace('.', ',');
function bmToets(mid, g) { const k = mid + '|' + g; return S.beoord.toetsen[k] || (S.beoord.toetsen[k] = { ll: {}, volgorde: [], start: vandaag() }); }
function bmRij(T, id) { return T.ll[id] || (T.ll[id] = { s: {}, v: {}, opm: {} }); }
function bmCijfer(m, r) { const C = bmCrit(m); if (!r || C.some(c => r.s[c.id] == null)) return null; return Math.round(C.reduce((a, c) => a + r.s[c.id] * c.weging, 0) / bmSomW(m) * 10) / 10; }
function bmEind(m, r) { const d = bmCijfer(m, r); const zb = +m.zelfbeoordeling || 0; if (d == null || !zb) return d; if (r.zelf == null) return null; return Math.round((d * (100 - zb) + r.zelf * zb) / 10) / 10; }
function bmVolgorde(T, lijst) { const ids = lijst.map(x => x.id); const v = (T.volgorde || []).filter(id => ids.includes(id)); ids.forEach(id => { if (!v.includes(id)) v.push(id); }); T.volgorde = v; return v; }
function bmParse(txt) { // Magister: één leerling per regel, kolommen met tabs; nummers en klascodes vallen weg
  return txt.split(/\r?\n/).map(r => r.split('\t').map(x => x.trim()).filter(x => x && !/^\d+$/.test(x) && !/^[a-z]{0,2}\d[a-z0-9]{0,3}$/i.test(x)).join(' ').replace(/\s+/g, ' ').trim())
    .filter(n => n && !/^(naam|leerling|leerlingen|achternaam|roepnaam|stamnummer|klas|groep)\b/i.test(n));
}
function bmLijstKaart(g, lijst) {
  return `<div class="kaart bm"><h2>Klassenlijst ${esc(g)}</h2><p class="lead">Kopieer de namen uit Magister en plak ze hieronder, één leerling per regel. Nummers en klascodes haalt de app er zelf uit. De namen blijven op dit apparaat en in je eigen OneDrive.</p>
    <textarea id="bmLijst" rows="14" style="width:100%;margin:.6rem 0">${esc(lijst.map(x => x.naam).join('\n'))}</textarea>
    <div class="knoppen"><button class="btn hoofd" data-bm="lijstopslaan">Opslaan</button>${lijst.length ? '<button class="btn" data-bm="lijstdicht">Annuleren</button>' : ''}</div></div>`;
}
function bmNiveauTekst(c, v) {
  if (v == null) return '';
  const i = [4, 6, 8, 10].indexOf(v); if (i >= 0) return c.docent[i] || '';
  return `Tussen ${v - 1} en ${v + 1}.`;
}
function viewBeoordelen() {
  const m = BM.find(x => x.id === decodeURIComponent(route.arg[0] || '')); const g = decodeURIComponent(route.arg[1] || '');
  if (!m || !g) return `<div class="kaart"><p>Dit beoordelingsmodel is niet gevonden.</p><p><a class="btn" href="#vandaag">Terug naar vandaag</a></p></div>`;
  const lijst = S.beoord.lijsten[g] || []; const zb = +m.zelfbeoordeling || 0;
  let h = `<div class="kop bm"><div><p class="eyebrow">${esc(m.klas)} · groep ${esc(g)} · ${esc(m.toets)}${m.weging ? ' · weging ' + esc(m.weging) : ''}</p><h1>${esc(m.titel)}</h1></div>
    <div class="knoppen"><button class="btn" data-bm="lijst">Klassenlijst</button>${lijst.length ? '<button class="btn" data-bm="export">Scoreblad downloaden</button>' : ''}<a class="btn" href="#vandaag">Klaar</a></div></div>`;
  if (!lijst.length || bmLijstOpen) return h + bmLijstKaart(g, lijst);
  const T = bmToets(m.id, g); const vol = bmVolgorde(T, lijst); const naam = id => (lijst.find(x => x.id === id) || {}).naam || '';
  const klaar = id => { const r = T.ll[id]; return r && (r.af || bmEind(m, r) != null); };
  const cur = vol.includes(bmSel) ? bmSel : (vol.find(id => !klaar(id)) || vol[0]); bmSel = cur;
  const cijfers = vol.map(id => bmEind(m, T.ll[id])).filter(x => x != null);
  h += `<div class="bm-raster"><div class="kaart bm-lijst"><div class="regel"><b>${vol.filter(klaar).length} van ${vol.length} klaar</b>${cijfers.length ? `<span class="chip">gemiddeld ${komma(Math.round(cijfers.reduce((a, b) => a + b, 0) / cijfers.length * 10) / 10)}</span>` : ''}<button class="btn klein" data-bm="loten">Volgorde loten</button></div>
    <ol>${vol.map((id, i) => { const r = T.ll[id]; const e = bmEind(m, r); return `<li class="${id === cur ? 'nu' : ''} ${klaar(id) ? 'klaar' : ''}"><button class="bm-naam" data-bmkies="${id}">${esc(naam(id))}</button><span class="bm-c">${r && r.af ? 'inhalen' : e != null ? komma(e) : bmCijfer(m, r) != null ? 'zelfbeoordeling?' : ''}</span><span class="bm-pijl"><button class="btn klein" data-bmop="${id}|-1" aria-label="eerder">▲</button><button class="btn klein" data-bmop="${id}|1" aria-label="later">▼</button></span></li>`; }).join('')}</ol></div>`;
  const r = bmRij(T, cur); const d = bmCijfer(m, r), e = bmEind(m, r);
  h += `<div class="kaart bm-scoor"><div class="kop"><h2>${esc(naam(cur))}</h2><div class="knoppen"><button class="btn klein" data-bm="klok"><span id="bmKlok">${bmKlok ? pad(Math.floor((Date.now() - bmKlok) / 1000)) : '0:00'}</span>&nbsp;${bmKlok ? 'stop' : 'start'}</button><label class="chk"><input type="checkbox" data-bmaf ${r.af ? 'checked' : ''}><span>afwezig, inhalen</span></label></div></div>
    <div class="bm-velden">${(m.velden || []).map(v => `<label>${esc(v)}<input data-bmveld="${esc(v)}" value="${esc(r.v[v] || '')}"></label>`).join('')}</div>`;
  for (const o of m.onderdelen) {
    h += `<h3 class="bm-groep">${esc(o.groep)}${o.stuk ? ` <small>${esc(o.stuk)}</small>` : ''}</h3>`;
    for (const c of o.criteria) {
      const v = r.s[c.id];
      h += `<div class="bm-crit"><div class="bm-cnaam"><b>${esc(c.naam)}</b><small>${esc(c.uitleg || '')} · weegt ${c.weging}×</small></div>
        <div class="bm-knoppen">${[4, 5, 6, 7, 8, 9, 10].map(x => `<button class="${x % 2 ? 'tussen' : ''}" data-bmscore="${esc(c.id)}|${x}" aria-pressed="${v === x}">${x}</button>`).join('')}</div>
        <p class="bm-niv">${esc(bmNiveauTekst(c, v))}</p></div>`;
    }
    h += `<label class="bm-opm">Opmerking ${esc(o.groep.toLowerCase())}<textarea rows="2" data-bmopm="${esc(o.groep)}">${esc(r.opm[o.groep] || '')}</textarea></label>`;
  }
  if (zb) h += `<h3 class="bm-groep">Zelfbeoordeling <small>${zb}% van het eindcijfer: hoe eerlijk en concreet beoordeelt de leerling de eigen uitvoering?</small></h3>
    <div class="bm-knoppen">${[4, 5, 6, 7, 8, 9, 10].map(x => `<button class="${x % 2 ? 'tussen' : ''}" data-bmzelf="${x}" aria-pressed="${r.zelf === x}">${x}</button>`).join('')}</div>`;
  h += `<label class="bm-opm">${esc(m.vooruit || 'Eén punt om aan te werken')}<textarea rows="2" data-bmvooruit>${esc(r.vooruit || '')}</textarea></label>
    <div class="bm-voet"><div><span>Cijfer docent <b>${d != null ? komma(d) : '–'}</b></span>${zb ? `<span>Eindcijfer <b>${e != null ? komma(e) : '–'}</b></span>` : ''}</div>
    <div class="knoppen"><button class="btn" data-bm="vorige">Vorige</button><button class="btn hoofd" data-bm="volgende">Volgende</button></div></div></div></div>`;
  return h;
}
function bmExport(m, g) {
  const lijst = S.beoord.lijsten[g] || []; const T = bmToets(m.id, g); const C = bmCrit(m); const zb = +m.zelfbeoordeling || 0;
  const cel = x => { const s = x == null ? '' : String(x); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const kop = ['Leerling', ...(m.velden || []), ...C.map(c => `${c.naam} (${c.weging}x)`), zb ? 'Cijfer docent' : 'Cijfer', ...(zb ? [`Zelfbeoordeling (${zb}%)`, 'Eindcijfer'] : []), 'Opmerking per onderdeel', m.vooruit || 'Punt om aan te werken'];
  const rijen = bmVolgorde(T, lijst).map(id => { const r = T.ll[id] || { s: {}, v: {}, opm: {} }; const naam = lijst.find(x => x.id === id).naam;
    if (r.af) return [naam, ...(m.velden || []).map(v => (r.v || {})[v] || ''), ...C.map(() => ''), 'inhalen'];
    const opm = Object.entries(r.opm || {}).filter(([, t]) => t).map(([k, t]) => k + ': ' + t).join(' | ');
    return [naam, ...(m.velden || []).map(v => r.v[v] || ''), ...C.map(c => r.s[c.id] ?? ''), komma(bmCijfer(m, r)), ...(zb ? [r.zelf ?? '', komma(bmEind(m, r))] : []), opm, r.vooruit || '']; });
  const csv = '﻿' + [kop, ...rijen].map(r => r.map(cel).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${m.toets} ${m.klas} ${g} ${vandaag()}.csv`.replace(/[\\/:*?"<>|·]/g, ' ').replace(/\s+/g, ' '); a.click(); URL.revokeObjectURL(a.href);
  toast('Scoreblad gedownload; open het in Excel en bewaar het in je OneDrive');
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-beoordeel],[data-bm],[data-bmkies],[data-bmop],[data-bmscore],[data-bmzelf]'); if (!b) return;
  const D = b.dataset;
  if (D.beoordeel) { const [mid, g] = D.beoordeel.split('|'); bmSel = null; bmLijstOpen = false; location.hash = 'beoordelen/' + encodeURIComponent(mid) + '/' + encodeURIComponent(g); return; }
  const m = BM.find(x => x.id === decodeURIComponent(route.arg[0] || '')); const g = decodeURIComponent(route.arg[1] || ''); if (!m) return;
  const T = bmToets(m.id, g); const vol = bmVolgorde(T, S.beoord.lijsten[g] || []);
  if (D.bm === 'lijst') { bmLijstOpen = true; render(); return; }
  if (D.bm === 'lijstdicht') { bmLijstOpen = false; render(); return; }
  if (D.bm === 'lijstopslaan') { const oud = S.beoord.lijsten[g] || []; const namen = bmParse($('#bmLijst').value);
    S.beoord.lijsten[g] = namen.map((n, i) => (oud.find(x => x.naam === n) || { id: 'l' + Date.now().toString(36) + i, naam: n })); bmLijstOpen = false; bewaar(); toast(namen.length + ' leerlingen opgeslagen'); return; }
  if (D.bm === 'export') { bmExport(m, g); return; }
  if (D.bm === 'loten') { T.volgorde = vol.map(id => [Math.random(), id]).sort((a, c) => a[0] - c[0]).map(x => x[1]); bmSel = null; bewaar(); return; }
  if (D.bm === 'klok') { bmKlok = bmKlok ? null : Date.now(); render(); return; }
  if (D.bm === 'volgende' || D.bm === 'vorige') { const i = vol.indexOf(bmSel) + (D.bm === 'volgende' ? 1 : -1); if (i >= 0 && i < vol.length) { bmSel = vol[i]; bmKlok = null; render(); window.scrollTo(0, 0); } return; }
  if (D.bmkies) { bmSel = D.bmkies; bmKlok = null; render(); return; }
  if (D.bmop) { const [id, st] = D.bmop.split('|'); const i = vol.indexOf(id), j = i + +st; if (j >= 0 && j < vol.length) { [vol[i], vol[j]] = [vol[j], vol[i]]; T.volgorde = vol; bewaar(); } return; }
  if (D.bmscore) { const [cid, x] = D.bmscore.split('|'); const r = bmRij(T, bmSel); r.s[cid] = r.s[cid] === +x ? undefined : +x; if (r.s[cid] == null) delete r.s[cid]; bewaar(); return; }
  if (D.bmzelf) { const r = bmRij(T, bmSel); r.zelf = r.zelf === +D.bmzelf ? undefined : +D.bmzelf; bewaar(); return; }
});
document.addEventListener('input', e => {
  const t = e.target; if (route.naam !== 'beoordelen' || !t.closest('.bm-scoor')) return;
  const m = BM.find(x => x.id === decodeURIComponent(route.arg[0] || '')); if (!m || !bmSel) return;
  const r = bmRij(bmToets(m.id, decodeURIComponent(route.arg[1] || '')), bmSel);
  if (t.dataset.bmveld) r.v[t.dataset.bmveld] = t.value;
  else if (t.dataset.bmopm) r.opm[t.dataset.bmopm] = t.value;
  else if (t.dataset.bmvooruit != null) r.vooruit = t.value;
  else if (t.dataset.bmaf != null) { r.af = t.checked; bewaar(); return; }
  else return;
  bewaar(true);
});
setInterval(() => { const el = document.getElementById('bmKlok'); if (el && bmKlok) el.textContent = pad(Math.floor((Date.now() - bmKlok) / 1000)); }, 1000);

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
  try { BM = await (await fetch('data/beoordeling.json', { cache: 'no-cache' })).json(); } catch (e) { BM = []; }
  render();
  try { const acc = await M365.init(); if (acc) await syncNu(false); else setSync('', M365.enabled() ? 'Niet ingelogd' : 'Op dit apparaat'); }
  catch (e) { console.warn(e); setSync('fout', 'Inloggen niet beschikbaar'); }
  if (S.zermeloToken && zProxy() && navigator.onLine && (!ZC || Date.now() - ZC.opgehaald > 30 * 60000 || ZC.van !== maandagVan(vandaag()))) zOphalen(false);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
})();
