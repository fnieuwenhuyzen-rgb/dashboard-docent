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
function nieuweStaat() { return { v: 1, updated: 0, rooster: [], voortgang: {}, les: {}, uitval: {}, sectieAf: {}, sectieNotitie: {}, sectieExtra: [], groepLeergang: {}, taken: [], dagTaken: {}, koorAf: {}, beoord: { lijsten: {}, toetsen: {} },
  pauzes: [], rust: {}, afLater: {}, afgesloten: {}, goed: {}, later: {}, klaarExtra: {}, duur: {}, mag: {}, magHw: {} }; }
function laadLokaal() { try { const j = localStorage.getItem(LS_KEY); if (j) return Object.assign(nieuweStaat(), JSON.parse(j)); } catch (e) {} return nieuweStaat(); }
/* alleen op dit apparaat: verjaardagen van leerlingen (alleen dag en maand), jarige collega's, wie er absent is en logboeknotities over
   leerlingen. Een eigen sleutel die nooit naar OneDrive gaat, niet in de kopie zit en nooit naar de server. Absenten en logboeknotities
   verdwijnen zodra ze in Magister staan. */
const AP_KEY = 'lesdag-apparaat';
const apLeeg = () => ({ jarig: {}, collegas: [], weg: {}, log: {}, felic: {} });
function laadAP() { try { return Object.assign(apLeeg(), JSON.parse(localStorage.getItem(AP_KEY) || '{}')); } catch (e) { return apLeeg(); } }
let AP = laadAP();
function apBewaar() { try { localStorage.setItem(AP_KEY, JSON.stringify(AP)); } catch (e) {} }
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
    const events = icsParse(await r.text()); const van = maandagVan(vandaag()); ZPZ = null;
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
const SVG = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICO = { nu: SVG('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'), vandaag: SVG('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="M8 14h3"/>'),
  week: SVG('<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M8 10v10M13 10v10M18 10v10"/>'), groepen: SVG('<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.3"/><path d="M3.5 19.5c.6-3 2.8-5 5.5-5s4.9 2 5.5 5M15 15.2c2.6-.5 4.8 1.2 5.4 4.3"/>'),
  rooster: SVG('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16"/>'), sectie: SVG('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
  instellingen: SVG('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'), zoek: SVG('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>') };
const ROUTES = [['nu', 'Nu'], ['vandaag', 'Dag'], ['week', 'Week'], ['groepen', 'Groepen'], ['rooster', 'Rooster'], ['sectie', 'Sectie'], ['instellingen', 'Instellingen']];
function render() {
  document.body.classList.toggle('kompasvenster', route.naam === 'kompas');
  $('#nav').innerHTML = ROUTES.map(([k, n]) => `<a href="#${k}" ${route.naam === k || (k === 'nu' && route.naam === 'regie') ? 'aria-current="page"' : ''}><span class="ico" aria-hidden="true">${ICO[k] || ''}</span><span class="nl">${n}</span></a>`).join('');
  if (route.naam !== 'regie' && !LES) waak(false);
  const f = { nu: viewNu, regie: viewRegie, vandaag: viewVandaag, week: viewWeek, groepen: viewGroepen, rooster: viewRooster, sectie: viewSectie, instellingen: viewInstellingen, beoordelen: viewBeoordelen, kompas: viewKompas }[route.naam] || viewNu;
  try { $('#main').innerHTML = f(); }
  catch (e) { console.error(e); $('#main').innerHTML = `<div class="kaart"><h2>Dit scherm lukt nu niet</h2><p class="lead">Er ging iets mis bij het tekenen: ${esc(e && e.message)}. De andere onderdelen in het menu werken nog.</p></div>`; } // nooit een leeg scherm
}
/* meldingen onderaan. Na een handeling staat er acht seconden lang Ongedaan maken, in plaats van vooraf "Weet je het zeker?" */
let TERUG = null;
const foto = () => JSON.stringify({ S, AP }); // de stand van vóór een handeling
function toast(t, terug) {
  const el = $('#toast'); clearTimeout(toast.t); TERUG = terug || null;
  el.innerHTML = `<span>${esc(t)}</span>${TERUG ? '<button type="button" class="toast-terug" data-terug="">Ongedaan maken</button>' : ''}`; el.hidden = false;
  toast.t = setTimeout(() => { el.hidden = true; TERUG = null; }, TERUG ? 8000 : 4000);
}
function terugZetten() {
  if (!TERUG) return; const o = JSON.parse(TERUG); TERUG = null;
  S = Object.assign(nieuweStaat(), o.S); AP = Object.assign(apLeeg(), o.AP); apBewaar(); bewaar();
  if (S.zermeloToken && !ZC) zOphalen(false);
  toast('Teruggezet');
}
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
  if (!dagKeuze && S.afgesloten[t]) s = volgendeLesdag(t, 1); // dag afgesloten: dan pas morgen, en alleen als je zelf kijkt
  const p = planning(s, s)[s]; const lw = lesweekVan(s);
  let h = `<div class="kop"><div><h1>${s === t ? 'Vandaag' : 'Voorbereiden'}: ${esc(fmtLang(s))}</h1><div class="sub">${lw ? 'lesweek ' + lw : ''}${p.reden ? ' · ' + esc(p.reden) : ''}</div></div>
    <div class="knoppen"><button class="btn" data-dag="${volgendeLesdag(s, -1)}">‹ vorige</button><button class="btn" data-dag="${t}">vandaag</button><button class="btn" data-dag="${volgendeLesdag(s, 1)}">volgende ›</button>
    ${s === t && !p.reden && p.uren.length ? '<button class="btn hoofd" data-start="">▶ Lesmodus</button>' : ''}</div></div>`;
  if (!S.rooster.length) h += `<div class="kaart" style="margin-bottom:1rem"><h2>Eerst je rooster</h2><p class="lead">Vul één keer je weekrooster in: per lesuur de groep en het lokaal. Daarna staan je lessen hier in de agenda, met wat er klaar moet staan.</p><p><a class="btn hoofd" href="#rooster">Rooster invullen</a></p></div>`;
  const achter = rooGroepen().filter(g => !Object.keys(S.voortgang[g] || {}).length && leergangVan(g) && reeks(leergangVan(g)).some(x => x.w < (lesweekVan(t) || nextLesweek()) - 1));
  if (achter.length) h += `<div class="melding info">Begin je nu met Lesdag? ${esc(achter.join(', '))} staan nog op les 1. <button class="btn klein" data-opplanalle="">Zet ze op de planning</button> Dan gelden alle lessen vóór deze lesweek als gegeven.</div>`;
  const A = dagItems(s, p);
  const sel = kiesSel(s, A);
  if (pauzeTekst(A.pz)) h += `<div class="melding">${esc(pauzeTekst(A.pz))}</div>`;
  h += `<div class="dagagenda"><div class="kaart agkaart">${heleDagRij(s, A.heleDag)}${agendaRaster([{ s, items: A.items }], { ppm: 1.25, sel })}</div><div class="agpaneel">${agPaneel(s, p, A, sel)}</div></div>`;
  // klaarzetten per lokaal
  const perLokaal = {};
  (p.uren || []).forEach(x => { if (!x.item || x.uitval || x.klaar) return; const l = les(x.item); const k = x.u.lokaal || '009'; (perLokaal[k] = perLokaal[k] || []).push({ x, ben: benodigd(l), l }); });
  if (Object.keys(perLokaal).length) h += `<div class="grid">${Object.entries(perLokaal).map(([lok, arr]) => `<div class="kaart lokaalblok klaarzet"><h3>Klaarzetten in ${esc(lok)}</h3>${arr.map(({ x, ben }) => `<div><b style="font-family:var(--lees)">${esc(x.u.start)} ${esc(x.u.groep)}</b><div class="mats" style="margin:.2rem 0 .5rem">${ben.length ? ben.map(b => `<span class="chip">${esc(b)}</span>`).join('') : '<span class="leeg">niets bijzonders</span>'}</div></div>`).join('')}</div>`).join('')}</div>`;
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
  const pz = werkdag ? pauzeDag(s, items, heleDag) : null;
  if (pz) { pz.weg.filter(x => x.viaDag).forEach(x => items.push({ key: 'pzbezet:' + hm(x.van), van: x.van, tot: x.tot, soort: 'sectie', titel: x.door, sub: 'in je pauze', i: x.i })); // Sing-In en dergelijke: dan sta je daar
    pz.vrij.forEach(x => items.push({ key: 'pauze:' + hm(x.van), van: x.van, tot: x.tot, soort: 'pauze', titel: 'Pauze', sub: (x.tot - x.van) + ' min, van jou' }));
    if (pz.rust) items.push({ key: 'rust:' + s, van: pz.rust.van, tot: pz.rust.tot, soort: 'rust', titel: 'Rustblok', sub: 'in plaats van je pauze' }); }
  if (werkdag) { // vrije blokken tussen 8:30 en 16:30; pauzes en rustblokken zijn nooit vrij voor taken
    const bezet = items.filter(it => ['les', 'klaar', 'sectie', 'taak', 'taakaf', 'koor', 'pauze', 'rust'].includes(it.soort)).map(it => [it.van, it.tot]).sort((a, b) => a[0] - b[0]);
    let cur = AG.werkVan;
    for (const [a, b] of bezet.concat([[AG.werkTot, AG.werkTot]])) { const eind = Math.min(a, AG.werkTot); if (eind - cur >= 15) items.push({ key: 'vrij:' + hm(cur), van: cur, tot: eind, soort: 'vrij', titel: 'Vrij', sub: (eind - cur) + ' min' }); cur = Math.max(cur, b); if (cur >= AG.werkTot) break; }
  }
  items.sort((a, b) => a.van - b.van || b.tot - a.tot);
  // overlappende items naast elkaar (vrije blokken overlappen nooit)
  let groep = [], groepEind = -1;
  const sluitGroep = () => { const banen = []; groep.forEach(it => { let b = banen.findIndex(e => e <= it.van); if (b < 0) { b = banen.length; banen.push(0); } banen[b] = it.tot; it.baan = b; }); groep.forEach(it => { it.banen = banen.length; }); };
  for (const it of items) { if (it.soort === 'start') { it.baan = 0; it.banen = 1; continue; } if (it.van >= groepEind && groep.length) { sluitGroep(); groep = []; } groep.push(it); groepEind = Math.max(groepEind, it.tot); }
  if (groep.length) sluitGroep();
  return { items, heleDag, werkdag, pz };
}
/* ---------- pauzes en herstel ----------
   De pauzes komen uit het Zermelo-rooster (de roostermaker plant ze): afspraken met "pauze" erin, of anders de vaste gaten tussen
   de lesuren. S.pauzes ({van, tot}) is alleen voor als het rooster niet klopt; die gaan dan voor. Pauzes zijn van Frans: er komen nooit
   taken in en het Nu-scherm toont dan niets over werk. Pauzedienst of surveillance in het rooster telt als werk.
   Valt een pauze weg (een les, het koor, een afspraak, of "in de pauzes" zoals de Sing-In), dan telt Lesdag wat er overblijft.
   Bij meer dan 5,5 uur werk hoort 30 minuten pauze (Arbeidstijdenwet). Komt de dag tekort, dan houdt Lesdag een rustblok vrij
   in het eerste vrije blok na de gemiste pauze; nooit in een les, nooit ten koste van lestijd. S.rust[dag] = 'weg': Frans werkt toch. */
const RUST = { nodig: 30, na: 330, min: 15 };
let ZPZ = null;
const zTekst = e => e.summary + ' ' + e.desc;
const zDienst = e => /surveillance|pauzedienst|toezicht|\bdienst\b/i.test(zTekst(e));
function zPauzes() { // {perDag: {datum: [{van, tot}]}, vast: [{van, tot}]} uit het opgehaalde rooster
  if (!ZC || !ZC.events) return null; if (ZPZ && ZPZ.op === ZC.opgehaald) return ZPZ.res;
  const ev = ZC.events.filter(e => e.start && e.eind && !e.vervallen); const perDag = {}; const tel = {};
  ev.filter(e => /\bpauze\b/i.test(zTekst(e)) && !zDienst(e)).forEach(e => (perDag[e.d] = perDag[e.d] || []).push({ van: minuten(e.start), tot: minuten(e.eind) }));
  if (Object.keys(perDag).length) Object.values(perDag).forEach(L => L.forEach(p => { const k = p.van + '-' + p.tot; tel[k] = (tel[k] || 0) + 1; }));
  else { const dagen = {}; ev.forEach(e => (dagen[e.d] = dagen[e.d] || []).push([minuten(e.start), minuten(e.eind)])); // vaste gaten van 10 tot 40 minuten tussen lesuren
    Object.values(dagen).forEach(L => { L.sort((x, y) => x[0] - y[0]); let eind = L[0][1]; for (let i = 1; i < L.length; i++) { const g = L[i][0] - eind; if (g >= 10 && g <= 40) { const k = eind + '-' + L[i][0]; tel[k] = (tel[k] || 0) + 1; } eind = Math.max(eind, L[i][1]); } }); }
  const vast = Object.keys(tel).filter(k => tel[k] >= 2).map(k => { const [van, tot] = k.split('-').map(Number); return { van, tot }; }).sort((x, y) => x.van - y.van);
  ZPZ = { op: ZC.opgehaald, res: { perDag, vast } }; return ZPZ.res;
}
function pauzesVan(s) {
  const eigen = (S.pauzes || []).map(p => ({ van: minuten(p.van), tot: minuten(p.tot) })).filter(p => p.tot > p.van);
  const z = zPauzes(); const L = eigen.length ? eigen : z ? (s && z.perDag[s]) || z.vast : [];
  return L.slice().sort((x, y) => x.van - y.van);
}
const pauzeBron = () => (S.pauzes || []).length ? 'eigen' : (zPauzes() || { vast: [] }).vast.length ? 'rooster' : '';
function pauzeDag(s, items, heleDag) {
  const P = pauzesVan(s); if (!P.length) return { onbekend: true, vrij: [], weg: [], vrijMin: 0, tekort: 0, rust: null };
  const bezet = items.filter(it => ['les', 'klaar', 'sectie', 'taak', 'taakaf', 'koor'].includes(it.soort));
  const inPauzes = heleDag.find(it => /pauze/i.test(it.titel || '') && it.soort !== 'deadline');
  const dienst = ((ZC && ZC.events) || []).filter(e => e.d === s && !e.vervallen && zDienst(e)).map(e => ({ van: minuten(e.start), tot: minuten(e.eind), titel: cap(e.summary.trim()) }));
  const vrij = [], weg = [];
  for (const p of P) { const dn = dienst.find(x => x.van < p.tot && x.tot > p.van); const door = inPauzes ? inPauzes.titel : dn ? dn.titel : (bezet.find(it => it.van < p.tot && it.tot > p.van) || {}).titel;
    (door ? weg : vrij).push(Object.assign({ door, viaDag: !!(inPauzes || dn), i: inPauzes ? inPauzes.i : dn ? { id: 'pd:' + s + p.van, d: s, titel: dn.titel, info: 'uit je rooster' } : null }, p)); }
  const vrijMin = vrij.reduce((a, p) => a + p.tot - p.van, 0);
  const eind = Math.max(AG.werkTot, ...bezet.map(it => it.tot)); const werkMin = eind - AG.van;
  const tekort = werkMin > RUST.na && vrijMin < RUST.nodig ? RUST.nodig - vrijMin : 0;
  let rust = null;
  if (tekort && weg.length && S.rust[s] !== 'weg') { // eerste gat van een kwartier of meer na de gemiste pauze
    const vast = bezet.map(it => [it.van, it.tot]).concat(vrij.map(p => [p.van, p.tot]), weg.map(p => [p.van, p.tot])).sort((a, b) => a[0] - b[0]);
    let cur = Math.max(AG.werkVan, weg[0].tot);
    for (const [a, b] of vast.concat([[AG.werkTot, AG.werkTot]])) { if (b <= cur) continue; const e = Math.min(a, AG.werkTot); if (e - cur >= RUST.min) { rust = { van: cur, tot: cur + Math.min(e - cur, Math.max(RUST.min, tekort)) }; break; } cur = Math.max(cur, b); if (cur >= AG.werkTot) break; }
  }
  return { s, vrij, weg, vrijMin, tekort, rust, werkMin, bron: pauzeBron() };
}
function pauzeTekst(pz) {
  if (!pz || pz.onbekend || !pz.tekort) return '';
  const g = {}; pz.weg.forEach(p => { (g[p.door] = g[p.door] || []).push(hm(p.van)); });
  const w = Object.entries(g).map(([d, t]) => `${d} om ${t.join(' en ')}`).join('; ');
  return `${pz.vrijMin ? 'Vandaag maar ' + pz.vrijMin + ' minuten pauze' : 'Vandaag geen pauze'}, door ${w}. ${pz.rust ? `Om ${hm(pz.rust.van)} houdt Lesdag ${pz.rust.tot - pz.rust.van} minuten rust voor je vrij.` : S.rust[pz.s] === 'weg' ? 'Je koos ervoor om door te werken.' : 'Er is geen vrij blok meer voor rust.'}`;
}
/* werkblokken plannen met lucht: hoogstens twee derde vol, de rest is voor wie aanklopt, de gang, koffie */
const LUCHT = 2 / 3;
const werkRuimte = len => Math.max(10, Math.floor(len * LUCHT / 5) * 5);
const SCHAT = { pres: 10, koorrep: 15, sectie: 20, koor: 15, mail: 15, slc: 20, les: 15, overig: 15 };
function tempo(bron) { const r = (S.duur || {})[bron] || []; if (r.length < 3) return 1; const z = r.slice(-10).sort((a, b) => a - b); return Math.min(2, Math.max(.7, z[Math.floor(z.length / 2)])); }
const schat = (bron, min) => Math.round((min || SCHAT[bron] || 15) * tempo(bron) / 5) * 5;
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
      const st = it.x ? magStip(d.s, it.x) : ''; // Magister: oker als er nog iets moet, groen als de les rond is
      return `<button class="ag-it ag-${it.soort}${opt.sel === it.key ? ' sel' : ''}${nuCls}${kort ? ' kort' : ''}" style="top:${top}px;height:${h}px;left:calc(${(it.baan || 0) * w}% + 2px);width:calc(${w}% - 4px)" data-ag="${d.s}|${esc(it.key)}" title="${esc(hm(it.van) + '–' + hm(it.tot) + ' ' + it.titel + (it.sub ? ' · ' + it.sub : '') + (st ? (st === 'ok' ? ' · Magister rond' : ' · nog iets in Magister') : ''))}">${st ? `<i class="st${st === 'ok' ? ' ok' : ''}" aria-hidden="true"></i>` : ''}`
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
  if (it.soort === 'pauze' || it.soort === 'rust') return rustKaart(s, it, A, false);
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
  const ruimte = werkRuimte(it.tot - it.van); const duur = Math.min(ruimte, 50);
  return `<div class="kaart"><p class="eyebrow">Vrij · ${hm(it.van)}–${hm(it.tot)} · ${it.tot - it.van} minuten</p><h2>Taak plannen</h2>
  <p class="lead">Plan hier hoogstens ${ruimte} minuten. De rest is lucht, voor wie aanklopt en voor de gang.</p>
  <form id="planForm" class="planform" data-dag="${s}">
    <label>Wat ga je doen?<select id="pK"><option value="">Nieuwe taak…</option>${opties.map(([v, n]) => `<option value="${esc(v)}">${esc(n)}</option>`).join('')}</select></label>
    <div id="pNieuw" class="rij"><input id="pT" placeholder="Bijvoorbeeld: mail beantwoorden"><select id="pB">${Object.entries(BRON).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    <div class="rij"><label>Van<input id="pVan" type="time" value="${hm(it.van).padStart(5, '0')}" min="07:00" max="22:00"></label><label>Tot<input id="pTot" type="time" value="${hm(it.van + duur).padStart(5, '0')}" min="07:00" max="22:00"></label></div>
    <button class="btn hoofd" type="submit">In de agenda zetten</button>
  </form></div>`;
}
// v: eigen:<id> | sec:<id> | koorrep | koor:<id> | pres:<lesid> | '' (nieuwe taak met titel en bron); plan: {dag, van, tot} of null
function maakTaak(v, plan, titel, bron) {
  const nieuwId = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); let k; v = v || '';
  S.taken = S.taken || []; const dag = plan ? plan.dag : vandaag(); const P = plan ? { dag: plan.dag, van: plan.van, tot: plan.tot } : undefined;
  if (v.startsWith('eigen:')) { k = S.taken.find(x => x.id === v.slice(6)); if (k && P) k.plan = P; return k; }
  if (v.startsWith('sec:')) { const i = sectieItems().find(x => x.id === v.slice(4)); if (i) k = { titel: i.titel, bron: 'sectie', sectieId: i.id, d: i.d }; }
  else if (v === 'koorrep') { const kr = koorOp(dag); if (kr) k = { titel: 'Koorrepetitie voorbereiden: ' + kr.titel, bron: 'koor', dagTaak: { dag, key: 'koor' } }; }
  else if (v.startsWith('koor:')) { const kt = ((B.koor || {}).taken || []).find(x => x.id === v.slice(5)); if (kt) k = { titel: kt.titel, bron: 'koor', koorId: kt.id, d: kt.d }; }
  else if (v.startsWith('pres:')) { const [lid, ld] = v.slice(5).split('@'); const d2 = ld || dag; const it = (planning(d2, d2)[d2].uren || []).find(x => x.item && x.item.id === lid); if (it) k = { titel: 'Presentatie doorlopen: ' + it.u.groep + ' ' + (les(it.item).titel || ''), bron: 'les', dagTaak: { dag: d2, key: 'pres:' + it.item.id } }; }
  else if (titel) k = { titel, bron: bron || 'overig' };
  if (!k) return null;
  k = Object.assign({ id: nieuwId(), af: false }, k); if (P) k.plan = P; S.taken.push(k); return k;
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

/* ---------- nu: één scherm dat je dag volgt ----------
   Bovenaan de nu-balk (wat, klok rechtsboven, hoeveel tijd nog). Links de dag als kolom, van boven naar beneden zoals de Dag-agenda:
   elke dag is een akkoord. In het midden de nu-kaart, die per moment van vorm wisselt: opstarten, voor de les, presentie in de eerste
   15 minuten, in de les, na de bel, pauze, rustblok, koor, werkblok, dag afsluiten, stil. Rechts wat er straks komt en wat er nog
   openstaat (Magister, voorstellen waar Frans zelf ja of later op zegt). In een pauze en een rustblok laat het scherm niets over werk zien.
   Lestijd ligt vast: Lesdag stelt nooit voor om iets uit een les te halen of een les korter te maken. */
let nuKijk = null; // gekozen blok in de partituur; anders volgt het scherm de klok
const cap = t => String(t).charAt(0).toUpperCase() + String(t).slice(1);
const lesUren = p => (p.uren || []).filter(x => x.item && !x.uitval);
const teAfronden = (s, p, nu) => lesUren(p).filter(x => !x.klaar && minuten(x.u.eind) <= nu);
function moment(s, p, A, nu) {
  if (S.afgesloten[s]) return { m: 'stil' };
  const dek = soort => A.items.find(it => it.soort === soort && it.van <= nu && nu < it.tot);
  for (const soort of ['les', 'koor', 'pauze', 'rust']) { const it = dek(soort); if (it) return { m: soort, it }; }
  if (!A.werkdag) return { m: 'vrijedag' };
  if (nu < AG.van) return { m: 'start' };
  if (nu >= AG.tot + 60) return { m: 'stil' };
  const L = lesUren(p);
  const af = L.filter(x => !x.klaar && minuten(x.u.eind) <= nu && !(S.afLater[s] || []).includes(x.u.id)); const laatste = af[af.length - 1];
  if (laatste && nu - minuten(laatste.u.eind) <= 20) return { m: 'naLes', x: laatste };
  const vlg = L.find(x => !x.klaar && minuten(x.u.start) > nu);
  if (vlg && minuten(vlg.u.start) - nu <= 15) return { m: 'voorLes', x: vlg };
  const tk = dek('taak') || dek('taakaf'); if (tk) return { m: 'taak', it: tk };
  const sc = dek('sectie'); if (sc) return { m: 'afspraak', it: sc };
  if (dek('start')) return { m: 'start' };
  const nogIets = A.items.some(it => it.van >= nu && ['les', 'koor', 'sectie', 'taak'].includes(it.soort));
  if (nu >= AG.werkTot || (!nogIets && nu >= AG.werkTot - 15)) return { m: 'afsluiten' };
  const vr = dek('vrij'); if (vr) return { m: 'werkblok', it: vr };
  if (vlg) return { m: 'voorLes', x: vlg };
  const volgend = A.items.find(it => it.van > nu && it.soort !== 'uitval');
  if (volgend && nu >= AG.werkVan) return { m: 'tussen', it: volgend }; // een paar minuten tussen twee blokken
  return { m: nu >= 15 * 60 ? 'afsluiten' : 'start' };
}
function viewNu() {
  const s = vandaag(); const nu = nuMin(); const p = planning(s, s)[s]; const A = dagItems(s, p);
  const m = moment(s, p, A, nu);
  const kijk = nuKijk && (nuKijk === 'afsluiten' || A.items.some(it => it.key === nuKijk)) ? nuKijk : null;
  const rustig = !kijk && (m.m === 'pauze' || m.m === 'rust'); const stil = !kijk && (m.m === 'stil' || m.m === 'vrijedag');
  const geenVoorstel = rustig || stil || (!kijk && (m.m === 'start' || m.m === 'afsluiten' || m.m === 'tussen')); // vóór 8:30 en bij het afsluiten: niets erbij
  const [kaart, acties] = dokUit(kijk ? kijkKaart(s, p, A, kijk, nu) : nuKaart(s, p, A, m, nu));
  const kIt = kijk && kijk !== 'afsluiten' ? A.items.find(it => it.key === kijk) : null;
  const mom = kijk ? (kIt ? MOMSOORT[kIt.soort] || 'werkblok' : 'afsluiten') : m.m;
  let h = `<div class="nu" data-moment="${mom}">` + nuBalk(s, p, A, m, nu, kijk, kIt);
  if (!rustig && A.werkdag && A.pz && A.pz.onbekend) h += pauzeVraag();
  const kol = A.werkdag || A.items.length;
  h += `<div class="nu-drie${kol ? '' : ' zonder'}">${kol ? dagKolom(s, A, nu, kijk || (m.it && m.it.key) || (m.x && 'les:' + m.x.u.id) || (m.m === 'afsluiten' ? 'afsluiten' : '')) : ''}<div class="nu-kaart">${kaart}</div>${stil ? '' : `<aside class="nu-zij">
    <div class="kaart"><p class="eyebrow">Straks</p>${straks(s, A, m, nu, rustig)}</div>
    ${geenVoorstel ? '' : `<div class="kaart">${nogOpen(s, p, A, m, nu)}</div>`}</aside>`}</div>`;
  if (!rustig && (acties || !stil)) h += `<div class="dok"><div class="dok-in"><div class="dok-acties">${acties}</div>${stil ? '' : `<button class="dok-zoek" data-palet="" aria-label="Zoek of typ een taak">${ICO.zoek}<span>Zoek, of typ een taak</span><kbd>Ctrl K</kbd></button>`}</div></div>`;
  return h + '</div>';
}
/* de hoofdknoppen van een nu-kaart staan tussen <!--dok--> en <!--/dok-->; op Nu gaan ze naar de actiebalk onderaan, in duimbereik */
function dokUit(h) { const r = h.match(/<!--dok-->([\s\S]*?)<!--\/dok-->/); return r ? [h.replace(r[0], ''), r[1]] : [h, '']; }
const MOMSOORT = { les: 'les', klaar: 'les', uitval: 'les', vrij: 'werkblok', taak: 'taak', taakaf: 'taak', sectie: 'afspraak', koor: 'koor', pauze: 'pauze', rust: 'rust', start: 'start' };
const MOMNAAM = { start: 'Opstarten', tussen: 'Tussendoor', pauze: 'Pauze', rust: 'Rustblok', koor: 'Schoolkoor', werkblok: 'Werkblok', afsluiten: 'Dag afsluiten' };
function nuBalk(s, p, A, m, nu, kijk, kIt) {
  const it = kIt || m.it || (m.x ? A.items.find(x => x.key === 'les:' + m.x.u.id) : null);
  const wat = kijk === 'afsluiten' ? 'Dag afsluiten' : kIt ? (kIt.x ? kIt.x.u.groep + (kIt.x.item ? ' · ' + (les(kIt.x.item).titel || '') : '') : ptLabel(kIt) || 'Vrij blok')
    : m.m === 'les' ? 'Les · ' + m.it.x.u.groep : m.m === 'voorLes' ? 'Zo meteen: ' + m.x.u.groep : m.m === 'naLes' ? 'Na de bel · ' + m.x.u.groep
    : m.m === 'taak' || m.m === 'afspraak' ? m.it.titel : m.m === 'stil' ? (S.afgesloten[s] ? 'Morgen staat klaar' : 'Je dag zit erop') : m.m === 'vrijedag' ? cap(p.reden || 'Vrij') : MOMNAAM[m.m] || '';
  let nog = '', v = null;
  if (it && it.van != null && m.m !== 'stil') { if (it.van <= nu && nu < it.tot) { nog = `nog ${it.tot - nu} min · tot ${hm(it.tot)}`; v = (nu - it.van) / (it.tot - it.van); } else if (it.van > nu) nog = `over ${it.van - nu} min · ${hm(it.van)}–${hm(it.tot)}`; else nog = `${hm(it.van)}–${hm(it.tot)} · voorbij`; }
  const pz = A.pz && !A.pz.onbekend ? ` · <span class="${A.pz.tekort ? 'nb-let' : ''}">${A.pz.vrijMin} min pauze</span>` : '';
  return `<div class="nu-balk"><div class="nb-links"><p class="nb-dag">${kijk ? 'Ander moment · ' : ''}${esc(cap(fmtLang(s)))}${lesweekVan(s) ? ' · lesweek ' + lesweekVan(s) : ''}${pz}</p><h1 class="nb-wat">${esc(wat)}</h1>${nog ? `<p class="nb-nog">${esc(nog)}</p>` : ''}</div>
    <div class="nb-rechts"><div class="nb-klok">${hm(nu)}</div><div class="nb-stap"><button class="nb-knop" data-stap="-1" aria-label="Vorig moment">‹</button><button class="nb-knop nb-nu${kijk ? '' : ' verborgen'}" data-kijk=""${kijk ? '' : ' tabindex="-1" aria-hidden="true"'}>Nu</button><button class="nb-knop" data-stap="1" aria-label="Volgend moment">›</button></div></div>
    ${v != null ? `<i class="nb-voort" style="width:${Math.round(v * 100)}%"></i>` : ''}</div>`;
}
function nuStap(d) { // door je dag bladeren: pijltjes op de laptop, vegen op de tablet
  const s = vandaag(); const p = planning(s, s)[s]; const A = dagItems(s, p); const nu = nuMin(); const m = moment(s, p, A, nu);
  const L = A.items.filter(it => it.soort !== 'uitval').map(it => ({ key: it.key, van: it.van })).concat(A.werkdag ? [{ key: 'afsluiten', van: AG.werkTot - 15 }] : []).sort((x, y) => x.van - y.van);
  if (!L.length) return;
  const live = (m.it && m.it.key) || (m.x && 'les:' + m.x.u.id) || (m.m === 'afsluiten' ? 'afsluiten' : null);
  let i = L.findIndex(x => x.key === (nuKijk || live));
  if (i < 0) { i = L.findIndex(x => x.van > nu); if (i < 0) i = L.length; if (d > 0) i -= 1; }
  const j = Math.max(0, Math.min(L.length - 1, i + d)); nuKijk = L[j].key === live ? null : L[j].key; render();
}
function nuKaart(s, p, A, m, nu) {
  if (m.m === 'vrijedag') return vrijeDagKaart(s, p);
  if (m.m === 'stil') return stilKaart(s);
  if (m.m === 'start') return startKaart(s, p, A, nu);
  if (m.m === 'les') return presVoorop(s, m.it.x, nu) ? presKaart(s, m.it.x, nu) : lesKaart(s, m.it.x, nu);
  if (m.m === 'koor') return (pauzeTekst(A.pz) ? `<div class="melding" style="margin-bottom:.8rem">${esc(pauzeTekst(A.pz))}</div>` : '') + koorKaart(s, m.it.koor);
  if (m.m === 'pauze' || m.m === 'rust') return rustKaart(s, m.it, A, true);
  if (m.m === 'naLes') return naLesKaart(s, p, m.x, nu);
  if (m.m === 'voorLes') return voorLesKaart(s, p, m.x, nu);
  if (m.m === 'taak') return taakKaart(s, m.it);
  if (m.m === 'afspraak') return agPaneel(s, p, A, m.it.key);
  if (m.m === 'werkblok') return werkblokKaart(s, p, A, m.it, nu, true);
  if (m.m === 'tussen') return `<div class="kaart"><p class="eyebrow">Tussendoor</p><h2>Om ${hm(m.it.van)}: ${esc(m.it.soort === 'vrij' ? 'werkblok' : m.it.soort === 'pauze' ? 'pauze' : m.it.soort === 'rust' ? 'rustblok' : m.it.titel)}</h2><p class="lead">Nog ${m.it.van - nu} ${m.it.van - nu === 1 ? 'minuut' : 'minuten'}. Even niets.</p></div>`;
  return afsluitKaart(s, p, A, nu);
}
function kijkKaart(s, p, A, key, nu) {
  if (key === 'afsluiten') return afsluitKaart(s, p, A, nu);
  const it = A.items.find(x => x.key === key); if (!it) return '';
  const nuIn = it.van <= nu && nu < it.tot;
  if (it.x) return it.x.klaar || it.x.uitval || !it.x.item ? agPaneel(s, p, A, key) + (magTelt(s, it.x) ? `<div class="kaart" style="margin-top:1rem">${magBlok(s, it.x)}</div>` : '') : minuten(it.x.u.eind) <= nu ? naLesKaart(s, p, it.x, nu) : nuIn ? (presVoorop(s, it.x, nu) ? presKaart(s, it.x, nu) : lesKaart(s, it.x, nu)) : voorLesKaart(s, p, it.x, nu);
  if (it.soort === 'pauze' || it.soort === 'rust') return rustKaart(s, it, A, nuIn);
  if (it.soort === 'vrij') return werkblokKaart(s, p, A, it, nu, nuIn);
  if (it.soort === 'start') return startKaart(s, p, A, nu);
  return agPaneel(s, p, A, key);
}
const ptLabel = it => it.soort === 'vrij' ? (it.tot - it.van >= 40 ? 'werkblok' : '') : it.soort === 'start' ? 'koffie' : it.soort === 'pauze' ? 'pauze' : it.soort === 'rust' ? 'rust' : it.titel;
/* de dag als kolom, van 8 tot 17 uur van boven naar beneden, zoals de Dag-agenda: elke dag is een akkoord. Wat voorbij is vervaagt, de rode
   lijn is nu. Een stip op een les: oker als er nog iets in Magister moet, groen als de les rond is. Afsluiten krijgt het laatste kwartier. */
function dagKolom(s, A, nu, sel) {
  const L = AG.tot - AG.van; const pc = m => (Math.max(0, Math.min(L, m - AG.van)) / L * 100); const t = vandaag(); const afT = AG.werkTot - 15;
  const its = A.items.map(it => A.werkdag && it.soort === 'vrij' && it.tot > afT ? Object.assign({}, it, { tot: afT }) : it).filter(it => it.tot - it.van >= 5);
  if (A.werkdag && !its.some(it => it.soort !== 'vrij' && it.van < AG.werkTot && it.tot > afT)) its.push({ key: 'afsluiten', van: afT, tot: AG.werkTot, soort: 'afsluiten', titel: 'afsluiten' });
  let h = '';
  for (let m = AG.van; m <= AG.tot; m += 60) h += `<i class="k-lijn" style="top:${pc(m).toFixed(2)}%"></i><span class="k-uur${(m / 60) % 2 ? ' oneven' : ''}" style="top:${pc(m).toFixed(2)}%">${hm(m)}</span>`;
  h += its.map(it => {
    const d = it.tot - it.van; const k = d >= 40 ? 'k2' : d >= 20 ? 'k1' : 'k0'; const w = 100 / (it.banen || 1);
    const st = it.x ? magStip(s, it.x) : ''; const lab = ptLabel(it); const tijd = hm(it.van) + '–' + hm(it.tot);
    const voorbij = s < t || (s === t && it.tot <= nu);
    return `<button class="kb kb-${it.soort} ${k}${sel === it.key ? ' sel' : ''}${voorbij ? ' voorbij' : ''}" style="top:${pc(it.van).toFixed(2)}%;height:calc(${(pc(it.tot) - pc(it.van)).toFixed(2)}% - 2px);left:calc(${((it.baan || 0) * w).toFixed(2)}% + 1px);width:calc(${w.toFixed(2)}% - 2px)" data-kijk="${esc(it.key)}" aria-label="${esc(tijd + ' ' + (lab || 'vrij') + (st ? (st === 'ok' ? ', Magister rond' : ', nog iets in Magister') : ''))}"><b>${esc(lab)}</b><span class="kt">${tijd}</span>${st ? `<i class="st${st === 'ok' ? ' ok' : ''}" aria-hidden="true"></i>` : ''}</button>`;
  }).join('');
  if (s === t && nu >= AG.van && nu <= AG.tot) h += `<i class="k-nu" style="top:${pc(nu).toFixed(2)}%"></i>`;
  return `<div class="nu-kolwrap"><div class="nu-kol" role="group" aria-label="Je dag, van 8 tot 17 uur">${h}</div></div>`;
}
function straks(s, A, m, nu, rustig) {
  if (m.m === 'stil' || m.m === 'vrijedag') return '<p class="leeg">Niets.</p>';
  const its = A.items.filter(it => it.van > nu && it.soort !== 'start' && it.soort !== 'uitval' && !(it.soort === 'vrij' && it.tot - it.van < 15)).slice(0, rustig ? 1 : 4);
  if (!its.length) return '<p class="leeg">Niets meer vandaag.</p>';
  const nm = it => it.soort === 'les' ? `${it.titel} · ${it.sub}` : it.soort === 'vrij' ? `werkblok, ${it.tot - it.van} min` : it.soort === 'pauze' ? 'pauze' : it.soort === 'rust' ? 'rustblok' : it.titel;
  return its.map(it => `<button class="nu-straks" data-s="${it.soort}" data-kijk="${esc(it.key)}"><b>${hm(it.van)}</b><span>${esc(nm(it))}</span></button>`).join('');
}
function klaarLijst(s, l) { const b = benodigd(l).slice(); if (b.includes('Drums / percussie')) b.push('Oordoppen voor jezelf'); (S.klaarExtra[s] || []).forEach(x => { if (!b.includes(x)) b.push(x); }); return b; }
function afrondRij(s, x) { return `<div class="nu-rij"><span><b>Afronden:</b> ${esc(x.u.groep)} · ${esc(les(x.item).titel || '')}</span><span class="tb"><button class="btn klein" data-rondaf="${s}|${esc(x.u.id)}|gegeven">gegeven</button><button class="btn klein" data-rondaf="${s}|${esc(x.u.id)}|half">deels</button><button class="btn klein" data-rondaf="${s}|${esc(x.u.id)}|niet">niet aan toegekomen</button></span></div>`; }
function startKaart(s, p, A, nu) {
  const L = lesUren(p); const kr = A.items.find(it => it.soort === 'koor'); const pz = A.pz;
  const pzT = pz && !pz.onbekend && pz.vrij.length ? ` Pauze: ${pz.vrij.map(x => hm(x.van) + '–' + hm(x.tot)).join(' en ')}.` : '';
  return `<div class="kaart"><p class="eyebrow">${nu < AG.van ? 'Je werkdag begint om 8:00' : 'Koffie en opstarten · tot ' + hm(AG.werkVan)}</p><h2>Goedemorgen</h2>
    <p class="lead">${L.length ? `${L.length} ${L.length === 1 ? 'les' : 'lessen'}, de eerste om ${esc(L[0].u.start)} (${esc(L[0].u.groep)})` : 'Geen lessen vandaag'}${kr ? `. ${esc(kr.titel)} om ${hm(kr.van)}` : ''}.${pzT}</p>
    ${pauzeTekst(pz) ? `<div class="melding" style="margin-top:.6rem">${esc(pauzeTekst(pz))}</div>` : ''}
    ${collegasJarig(s).length ? `<div class="jarig-rij">${collegasJarig(s).map(felicRij).join('')}</div>` : ''}
    <p class="lead" style="margin-top:.6rem">Om ${hm(AG.werkVan)} begint je eerste werkblok. Tot die tijd heeft Lesdag niets voor je.</p></div>`;
}
function voorLesKaart(s, p, x, nu) {
  const l = les(x.item); const ben = klaarLijst(s, l); const vor = vorigeNotitie(x.u.groep, reeks(x.item.lg).indexOf(x.item));
  const min = minuten(x.u.start) - nu; const rest = s === vandaag() ? teAfronden(s, p, nu) : [];
  return `<div class="kaart"><p class="eyebrow">${s === vandaag() && min > 0 && min <= 90 ? `Over ${min} ${min === 1 ? 'minuut' : 'minuten'} · ` : ''}${esc(x.u.start)}–${esc(x.u.eind)} · lokaal ${esc(x.u.lokaal || '009')}</p>
    <h2>${esc(x.u.groep)} · ${esc(l.titel || '')}</h2>${l.doel ? `<p class="doel" style="margin-top:.3rem">${esc(l.doel)}</p>` : ''}
    <h3>Klaarzetten</h3><div class="mats">${ben.length ? ben.map(b => `<span class="chip">${esc(b)}</span>`).join('') : '<span class="leeg">niets bijzonders</span>'}</div>
    ${vor && vor.st.n ? `<div class="melding" style="margin-top:.7rem">Vorige keer: ${esc(vor.st.n)}</div>` : ''}${jarigMelding(s, x.u.groep)}
    ${(l.materiaal || []).length ? `<h3>Materiaal</h3>${matLinks(l, true)}` : ''}
    <!--dok--><button class="btn hoofd" data-bord="${esc(x.u.id)}|${s}">Op het bord, regie hier</button><button class="btn" data-start="${esc(x.u.id)}|${s}">Les op dit scherm</button><!--/dok--><div class="knoppen" style="margin-top:.9rem">${bmVoor(x.item).map(m => `<button class="btn" data-beoordeel="${esc(m.id)}|${esc(x.u.groep)}">Beoordelen ${esc(m.toets)}</button>`).join('')}<button class="btn" data-bewerk="${esc(x.item.id)}">bewerk les</button></div>
    ${rest.length ? `<h3>Nog afronden</h3>${rest.map(y => afrondRij(s, y)).join('')}` : ''}</div>`;
}
function lesKaart(s, x, nu) {
  const l = les(x.item); const rest = minuten(x.u.eind) - nu;
  const bordLoopt = RG && RG.uid === x.u.id && Date.now() - RG.tijd < 5000;
  const fasen = (l.fasen || []).map(LESMODUS.fase);
  return `<div class="kaart"><p class="eyebrow">Les loopt · ${esc(x.u.groep)} · nog ${rest} min · tot ${esc(x.u.eind)}</p><h2>${esc(l.titel || '')}</h2>
    ${bordLoopt ? `<p class="lead">Het bord loopt in het andere venster.</p><!--dok--><a class="btn hoofd" href="#regie/${encodeURIComponent(x.u.id)}/${s}">Naar de regie</a><!--/dok-->` : `<!--dok--><button class="btn hoofd" data-bord="${esc(x.u.id)}|${s}">Op het bord, regie hier</button><button class="btn" data-start="${esc(x.u.id)}|${s}">Les op dit scherm</button><!--/dok-->`}
    ${fasen.length ? `<h3>Verloop · alleen jij ziet dit</h3><ol class="fasen nu-fasen">${fasen.map(f => `<li><b>${f.min} min · ${esc(LESMODUS.SOORT[f.soort].naam.toLowerCase())}</b> ${esc(f.kop)}${f.docent ? `<div class="sub">${esc(f.docent)}</div>` : ''}</li>`).join('')}</ol>` : ''}
    ${bmVoor(x.item).length ? `<div class="knoppen" style="margin-top:.6rem">${bmVoor(x.item).map(m => `<button class="btn" data-beoordeel="${esc(m.id)}|${esc(x.u.groep)}">Beoordelen ${esc(m.toets)}</button>`).join('')}</div>` : ''}${magBlok(s, x)}</div>`;
}
function naLesKaart(s, p, x, nu) {
  const l = les(x.item); const rest = teAfronden(s, p, nu).filter(y => y !== x);
  return `<div class="kaart"><p class="eyebrow">De bel ging · ${esc(x.u.groep)} · ${esc(x.u.start)}–${esc(x.u.eind)}</p><h2>Hoe ging het?</h2><p class="lead">${esc(l.titel || '')}</p>${magBlok(s, x)}
    <!--dok--><button class="btn hoofd" data-rondaf="${s}|${esc(x.u.id)}|gegeven">Gegeven</button><button class="btn" data-rondaf="${s}|${esc(x.u.id)}|half">Deels, volgende keer verder</button><button class="btn" data-rondaf="${s}|${esc(x.u.id)}|niet">Niet aan toegekomen</button><button class="btn" data-aflater="${s}|${esc(x.u.id)}">Straks</button><!--/dok-->
    <details class="meer"><summary>Notitie voor de volgende les</summary><textarea id="nNot" placeholder="Bijvoorbeeld: begin met de groove uit maat 9">${esc((status(x.u.groep, x.item.id) || {}).n || '')}</textarea></details>
    <p class="sub" style="margin-top:.6rem">De notitie gaat mee naar de volgende les van ${esc(x.u.groep)}. Straks komt terug in je volgende werkblok, niet in je pauze.</p>
    ${rest.length ? `<h3>Ook nog afronden</h3>${rest.map(y => afrondRij(s, y)).join('')}` : ''}</div>`;
}
function rustKaart(s, it, A, live) {
  const over = it.tot - nuMin();
  if (it.soort === 'pauze') return `<div class="kaart nu-rust"><p class="eyebrow">Pauze · ${hm(it.van)}–${hm(it.tot)}</p><h2>Even niets</h2>${live ? `<div class="nu-groot">${over} min</div>` : ''}
    <p class="lead">Deze tijd is van jou. Lesdag laat dan niets over werk zien en stelt niets voor.</p>${live ? '<div class="knoppen" style="margin-top:.8rem"><a class="btn" href="#vandaag">Toch iets opzoeken</a></div>' : ''}</div>`;
  return `<div class="kaart nu-rust"><p class="eyebrow">Rustblok · ${hm(it.van)}–${hm(it.tot)}</p><h2>${it.tot - it.van} minuten van jou</h2>${live ? `<div class="nu-groot">${over} min</div>` : ''}
    <p class="lead">${A.pz && A.pz.weg.length ? `Je pauze viel vandaag weg (${esc([...new Set(A.pz.weg.map(p => p.door))].join(', '))}). ` : ''}Lesdag houdt dit blok vrij en plant er niets in. Doorwerken mag, maar dan weet je het.</p>
    <div class="knoppen" style="margin-top:.8rem"><button class="btn" data-rustweg="${s}">Ik werk toch door</button></div></div>`;
}
function taakKaart(s, it) {
  const k = it.k;
  return `<div class="kaart"><p class="eyebrow">Nu gepland · ${esc(k.plan.van)}–${esc(k.plan.tot)}${k.bron ? ' · ' + esc(BRON[k.bron] || k.bron) : ''}</p><h2>${esc(k.titel)}</h2>${k.d ? `<p class="lead">Deadline ${esc(fmtD(k.d))}</p>` : ''}
    <!--dok-->${k.af ? '' : k.start ? `<span class="chip">bezig sinds ${esc(new Date(k.start).toTimeString().slice(0, 5))}</span>` : `<button class="btn" data-taakstart="${esc(k.id)}">Begin</button>`}
    <label class="chk"><input type="checkbox" data-taakaf="${esc(k.id)}" ${k.af ? 'checked' : ''}><span>Klaar</span></label><!--/dok-->
    <p class="sub" style="margin-top:.6rem">Met Begin en Klaar leert Lesdag hoe lang zulke taken bij jou duren. Dat blijft in je eigen opslag.</p></div>`;
}
/* wat er nog moet en nog niet in de agenda staat: [{v, titel, min, d, sub}] */
function kandidaten(s) {
  const G = geplandeSleutels(); const out = []; const dt = d => S.dagTaken[d] || {};
  [s, volgendeLesdag(s, 1)].forEach((d, i) => { const pd = planning(d, d)[d]; if (pd.reden) return;
    lesUren(pd).filter(x => !x.klaar).forEach(x => { const l = les(x.item); const key = 'pres:' + x.item.id;
      if ((l.materiaal || []).some(m => /presentatie|\.pptx/i.test((m.t || '') + ' ' + (m.u || ''))) && !dt(d)[key] && !G.pres[d + '|' + key] && (i || minuten(x.u.start) > nuMin()))
        out.push({ v: 'pres:' + x.item.id + '@' + d, titel: `Presentatie doorlopen: ${x.u.groep}`, min: schat('pres'), d, voor: minuten(x.u.start), sub: `${i ? fmtD(d) + ' ' : ''}${x.u.start} · ${l.titel || ''}` }); }); });
  const kr = koorOp(s); if (kr && (kr.type === 'rep' || kr.type === 'extra') && !dt(s).koor && !G.pres[s + '|koor']) out.push({ v: 'koorrep', titel: 'Koorrepetitie voorbereiden', min: schat('koor'), d: s, sub: kr.titel });
  koorTakenOpen(s).forEach(t => out.push({ v: 'koor:' + t.id, titel: 'Koor: ' + t.titel, min: schat('koor'), d: t.d }));
  sectieItems().filter(i => i.taak && !S.sectieAf[i.id] && !G.sec[i.id] && i.d <= addD(s, 14)).forEach(i => out.push({ v: 'sec:' + i.id, titel: 'Sectie: ' + i.titel, min: schat('sectie'), d: i.d }));
  (S.taken || []).filter(k => !k.af && !k.plan).forEach(k => out.push({ v: 'eigen:' + k.id, titel: k.titel, min: schat(k.bron, k.min), d: k.d }));
  return out.sort((a, b) => (a.d || '9') < (b.d || '9') ? -1 : (a.d || '9') > (b.d || '9') ? 1 : 0);
}
function vrijeBlokken(s0, vanaf, dagen) {
  const out = []; let d = s0;
  for (let i = 0; i < dagen; i++) { if (i) d = volgendeLesdag(d, 1); const pd = planning(d, d)[d]; if (pd.reden) continue;
    dagItems(d, pd).items.filter(it => it.soort === 'vrij').forEach(it => { const v = d === s0 ? Math.max(it.van, Math.ceil(vanaf / 5) * 5) : it.van; if (it.tot - v >= 15) out.push({ dag: d, van: v, tot: it.tot, ruimte: werkRuimte(it.tot - v), used: 0 }); }); }
  return out;
}
function slotVoor(blokken, min, tot, voor) { const b = blokken.find(b => b.ruimte - b.used >= min && (!tot || b.dag < tot || (b.dag === tot && (voor == null || b.van + b.used + min <= voor)))); if (!b) return null; const v = b.van + b.used; b.used += min; return { dag: b.dag, van: hm(v), tot: hm(v + min) }; }
const slotTekst = sl => `${sl.dag === vandaag() ? 'vandaag' : fmtD(sl.dag)} ${sl.van}`;
function tempoTekst() { const t = Object.keys(SCHAT).map(b => [b, tempo(b)]).filter(([, f]) => f >= 1.15 || f <= .85); return t.length ? 'Lesdag rekent met jouw eigen tempo: ' + t.map(([b, f]) => `${BRON[b] || b} duurt bij jou ${f > 1 ? 'zo’n ' + Math.round((f - 1) * 100) + '% langer' : 'zo’n ' + Math.round((1 - f) * 100) + '% korter'} dan geschat`).join(', ') + '.' : ''; }
function werkblokKaart(s, p, A, it, nu, live) {
  const van = live ? Math.max(it.van, Math.ceil(nu / 5) * 5) : it.van; const len = it.tot - van; const ruimte = werkRuimte(len);
  const af = s === vandaag() ? teAfronden(s, p, nu) : [];
  let used = 0; const rijen = [];
  for (const k of kandidaten(s)) { if (used + k.min > ruimte || (k.voor != null && k.d === s && van + used + k.min > k.voor)) continue; const a = van + used; used += k.min;
    rijen.push(`<div class="nu-rij"><span>${esc(k.titel)}${k.sub ? `<div class="sub">${esc(k.sub)}</div>` : ''}</span><span class="tb"><span class="chip">${k.min} min${k.d ? ' · ' + esc(fmtD(k.d)) : ''}</span><button class="btn klein" data-slot="${esc(k.v)}|${s}|${hm(a)}|${hm(a + k.min)}">In dit blok</button></span></div>`); if (rijen.length >= 4) break; }
  const tt = tempoTekst(); const M = live && s === vandaag() ? magOpen(s) : []; // wat in Magister nog openstaat, komt terug in het volgende werkblok
  return `<div class="kaart"><p class="eyebrow">Werkblok · ${hm(it.van)}–${hm(it.tot)}${live ? ' · nog ' + len + ' min' : ''}</p><h2>${used ? `${used} minuten werk, ${len - used} lucht` : M.length ? 'Eerst Magister' : 'Niets dat nu moet'}</h2>
    ${M.length ? `<h3>Eerst in Magister</h3>${magLijst(M, 5)}` : ''}
    ${af.length ? af.map(x => afrondRij(s, x)).join('') : ''}
    ${rijen.join('')}
    <div class="nu-rij nu-lucht"><span>Lucht, voor wie aanklopt, de gang en koffie</span><span class="chip">${len - used - (len > 90 ? 10 : 0)} min</span></div>
    ${len > 90 ? '<div class="nu-rij nu-lucht"><span>Lang blok: neem halverwege tien minuten, even weg van je scherm</span><span class="chip">10 min</span></div>' : ''}
    ${!used ? '<p class="lead" style="margin-top:.6rem">Dit blok mag ook gewoon rustig blijven.</p>' : ''}${tt ? `<p class="sub" style="margin-top:.6rem">${esc(tt)}</p>` : ''}
    <div class="knoppen" style="margin-top:.8rem"><button class="btn" data-ag="${s}|${esc(it.key)}">Zelf iets plannen</button></div></div>`;
}
function afsluitKaart(s, p, A, nu) {
  const af = teAfronden(s, p, nu); const open = A.items.filter(it => it.soort === 'taak' && !it.k.af);
  const blok = vrijeBlokken(volgendeLesdag(s, 1), 0, 6);
  const chips = (v, min) => { const a = slotVoor(blok, min), b = slotVoor(blok, min); return [a, b].filter(Boolean).map(sl => `<button class="btn klein" data-slot="${esc(v)}|${sl.dag}|${sl.van}|${sl.tot}">${esc(slotTekst(sl))}</button>`).join(''); };
  const rij = (t, sub, extra) => `<div class="nu-rij"><span>${esc(t)}${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</span><span class="tb">${extra}</span></div>`;
  const deadl = kandidaten(s).filter(k => k.d && k.d <= addD(s, 7) && !k.v.startsWith('pres:') && k.v !== 'koorrep');
  const M = s === vandaag() ? magOpen(s) : [];
  const n = af.length + open.length + deadl.length + M.length;
  return `<div class="kaart"><p class="eyebrow">Dag afsluiten · een paar minuten</p><h2>Wat ging goed vandaag?</h2>
    <textarea id="gGoed" rows="2" placeholder="Bijvoorbeeld: de alten hadden maat 17 ineens te pakken">${esc(S.goed[s] || '')}</textarea><p class="sub">Mag leeg blijven. Alleen voor jou.</p>
    <h3>${n ? 'Nog open, krijgt een moment' : 'Nog open'}</h3>
    ${magLijst(M, 5)}
    ${af.map(x => afrondRij(s, x)).join('')}
    ${open.map(it => rij('Niet af: ' + it.k.titel, '', chips('eigen:' + it.k.id, schat(it.k.bron, it.k.min)) + `<label class="chk"><input type="checkbox" data-taakaf="${esc(it.k.id)}"><span>klaar</span></label>`)).join('')}
    ${deadl.map(k => rij(k.titel, 'deadline ' + fmtD(k.d), chips(k.v, k.min))).join('')}
    ${n ? '' : '<p class="lead">Niets open. Alles heeft een plek.</p>'}
    <!--dok--><button class="btn hoofd" data-afsluiten="${s}">Dag afsluiten</button><!--/dok--></div>`;
}
function stilKaart(s) {
  const dicht = !!S.afgesloten[s];
  return `<div class="kaart nu-rust"><p class="eyebrow">${esc(fmtLang(s))}</p><h2>${dicht ? 'Morgen staat klaar' : 'Je dag zit erop'}</h2>
    <p class="lead">${dicht ? 'Lesdag is stil tot morgen 8:00.' : 'Afsluiten kost een paar minuten. Daarna is Lesdag stil.'}</p>
    ${S.goed[s] ? `<blockquote class="nu-goed">${esc(S.goed[s])}</blockquote>` : ''}
    <!--dok-->${dicht ? `<button class="btn" data-heropen="${s}">Toch nog iets doen</button>` : '<button class="btn hoofd" data-kijk="afsluiten">Dag afsluiten</button>'}<button class="btn" data-dag="${volgendeLesdag(s, 1)}">Morgen bekijken</button><!--/dok--></div>`;
}
function vrijeDagKaart(s, p) {
  return `<div class="kaart nu-rust"><p class="eyebrow">${esc(fmtLang(s))}</p><h2>${esc(cap(p.reden || 'Vrij'))}</h2><p class="lead">Lesdag heeft vandaag niets voor je.</p>
    <div class="knoppen" style="margin-top:.8rem"><button class="btn" data-dag="${volgendeLesdag(s, 1)}">Volgende werkdag bekijken</button></div></div>`;
}
function pauzeVraag() {
  return `<div class="kaart nu-vraag"><h2>Je pauzes</h2><p class="lead">${ZC && ZC.events ? 'In je rooster vond Lesdag geen vaste pauzes.' : 'Lesdag haalt je pauzes uit je rooster in Zermelo. Plak daarvoor je Zermelo-link bij Instellingen.'} Daarna houdt Lesdag ze vrij.</p>
    <div class="knoppen" style="margin-top:.6rem"><a class="btn" href="#instellingen">Naar Instellingen</a></div></div>`;
}
/* voorstellen: hoogstens drie, nooit in een pauze; Frans zegt ja of later. Nooit iets uit een les halen. */
function voorstellen(s, p, A, m, nu) {
  if (m.m === 'stil' || m.m === 'vrijedag') return '<p class="leeg">Niets.</p>';
  const V = []; const weg = k => S.later[k] === 'ok' || S.later[k] === s;
  const blok = vrijeBlokken(s, m.m === 'werkblok' ? m.it.tot : nu, 6); // het huidige werkblok vult de nu-kaart al
  for (const k of kandidaten(s)) { if (V.length >= 2) break; const key = 'k:' + k.v; if (weg(key) || !k.d || k.d > addD(s, 7)) continue;
    const sl = slotVoor(blok, k.min, k.d, k.voor); if (!sl) continue;
    V.push({ key, t: `${k.titel}${k.d ? ' (' + (k.v.startsWith('pres:') ? 'les ' : 'deadline ') + fmtD(k.d) + ')' : ''}. In je werkblok van ${slotTekst(sl)}?`, ja: `data-slot="${esc(k.v)}|${sl.dag}|${sl.van}|${sl.tot}"` }); }
  let d = s;
  for (let i = 0; i < 4 && V.length < 3; i++) { d = volgendeLesdag(d, 1); const pd = planning(d, d)[d]; if (pd.reden) continue; const Ad = dagItems(d, pd); const key = 'pz:' + d;
    if (Ad.pz && Ad.pz.tekort && !weg(key)) V.push({ key, t: `${cap(fmtD(d))}: ${[...new Set(Ad.pz.weg.map(x => x.door))].join(', ')} in je pauze. ${Ad.pz.rust ? `Lesdag houdt om ${hm(Ad.pz.rust.van)} ${Ad.pz.rust.tot - Ad.pz.rust.van} minuten rust vrij.` : 'Er is die dag geen vrij blok voor rust.'}`, ja: `data-later="${key}|ok"`, jaT: 'Prima' }); }
  for (const dd of [s, volgendeLesdag(s, 1)]) { if (V.length >= 3) break; const pd = planning(dd, dd)[dd]; if (pd.reden) continue; const key = 'stem:' + dd; if (weg(key) || (S.klaarExtra[dd] || []).length) continue;
    const zang = lesUren(pd).filter(x => benodigd(les(x.item)).includes('Zangbladen')).length; const kr = koorOp(dd); const koor = kr && kr.type !== 'vrij' ? 1 : 0;
    if (zang + koor >= 3) V.push({ key, t: `${dd === s ? 'Vandaag' : cap(fmtD(dd))} een zware stemdag: ${zang} ${zang === 1 ? 'zangles' : 'zanglessen'}${koor ? ' en het koor' : ''}. Water bij de piano op je klaarzetlijst?`, ja: `data-klaarextra="${dd}|Water bij de piano"` }); }
  return V.map(v => `<div class="vs"><p><span class="chip les">Lesdag</span> ${esc(v.t)}</p><div class="knoppen"><button class="btn klein hoofd" ${v.ja}>${v.jaT || 'Ja'}</button><button class="btn klein" data-later="${esc(v.key)}|${s}">Later</button></div></div>`).join('');
}
/* nog open, per systeem: Magister (presentie, huiswerk, logboek), Outlook (een jarige collega feliciteren) en Lesdag (voorstellen) */
function nogOpen(s, p, A, m, nu) {
  const hier = m.m === 'les' ? m.it.x : m.m === 'naLes' ? m.x : null; // die staat al op de nu-kaart
  const M = s !== vandaag() || m.m === 'werkblok' ? [] : magOpen(s).filter(o => !hier || magKey(o.s, o.x) !== magKey(s, hier));
  const C = collegasJarig(s).filter(j => !AP.felic[s + '|' + j.c.naam]);
  const V = voorstellen(s, p, A, m, nu); const n = M.length + C.length + (V.match(/class="vs"/g) || []).length;
  return `<p class="eyebrow">Nog open${n ? ' · ' + n : ''}</p>` + (n ? magLijst(M, 4) + C.map(felicRij).join('') + V : '<p class="lead">Niets. Alles is rond.</p>');
}
/* ---------- Magister zonder koppeling ----------
   Er is geen open koppeling: Lesdag kijkt niet in Magister en tikt er niets in. Per les houdt Lesdag drie vakken bij: presentie,
   huiswerk en logboek. S.mag['datum|uur'] = {p: tijdstip gemeld, l: tijdstip logboek erin, tril: 1}; het huiswerk per groep en lesweek
   in S.magHw (twee lessen in één lesweek delen hetzelfde "thuis"). Lessen van vóór S.magVanaf tellen niet mee. Wie er absent is (AP.weg)
   en de logboeknotities (AP.log) staan alleen op dit apparaat, tot ze in Magister staan. */
const MAGURL = () => (window.LESDAG_CONFIG || {}).magister || 'https://csgpm.magister.net/op/#/vandaag';
const magKey = (s, x) => s + '|' + x.u.id;
const magVan = (s, x) => (S.mag || {})[magKey(s, x)] || {};
const magZet = (k, v) => { S.mag = S.mag || {}; S.mag[k] = Object.assign({}, S.mag[k], v); };
const hwKey = x => x.u.groep + '|' + x.item.lg + ':' + x.item.w;
const GEOPEND = {}; // Magister al geopend voor deze les of dit huiswerk: dan is Gemeld of Staat erin de volgende stap
const tijdVan = ts => { const d = new Date(ts); return hm(d.getHours() * 60 + d.getMinutes()); };
const uurOp = (s, uid) => (planning(s, s)[s].uren || []).find(y => y.u.id === uid);
function hwTekst(x) { const th = x.item && x.item.week && x.item.week.thuis; if (!th) return '';
  return [th.mb && 'Musicbox: ' + th.mb, th.info && 'Lezen: ' + th.info, th.learn && 'Leren: ' + th.learn, th.extra && 'Opdracht: ' + th.extra].filter(Boolean).join('\n'); }
const magTelt = (s, x) => !!(x && x.u && !x.uitval && !x.fout && s >= (S.magVanaf || s));
function magVakken(s, x) { // null: hoort er (nog) niet bij · false: nog open · tijdstip: klaar
  const t = vandaag(); const nu = nuMin(); const m = magVan(s, x);
  // het huiswerk staat de laatste vijf minuten van de les klaar, zodat het bij de bel kan; na de bel is het vaak pauze, en die is van jou
  const begon = s < t || (s === t && nu >= minuten(x.u.start)); const bijBel = s < t || (s === t && nu >= minuten(x.u.eind) - 5);
  return { pres: begon ? m.p || false : null, hw: bijBel && hwTekst(x) ? (S.magHw || {})[hwKey(x)] || false : null, log: (AP.log[magKey(s, x)] || []).length ? false : m.l || null };
}
function magStip(s, x) { if (!magTelt(s, x)) return ''; const v = magVakken(s, x); const L = [v.pres, v.hw, v.log].filter(y => y !== null); return !L.length ? '' : L.includes(false) ? 'open' : 'ok'; }
function magOpen(s0) { // alles wat nog in Magister moet, van de afgelopen week tot nu, het nieuwste eerst
  const out = []; const hw = {}; const van = [S.magVanaf || s0, addD(s0, -7)].sort().pop();
  for (let s = s0; s >= van; s = addD(s, -1)) { const p = planning(s, s)[s]; if (p.reden) continue;
    p.uren.slice().reverse().forEach(x => { if (!magTelt(s, x)) return; const v = magVakken(s, x);
      if (v.hw === false && !hw[hwKey(x)]) { hw[hwKey(x)] = 1; out.push({ soort: 'hw', s, x }); }
      if (v.log === false) out.push({ soort: 'log', s, x });
      if (v.pres === false) out.push({ soort: 'pres', s, x }); }); }
  return out;
}
function volgendeLesVan(g, s) { let d = s; for (let i = 0; i < 21; i++) { d = addD(d, 1); const p = planning(d, d)[d]; if (!p.reden && p.uren.some(y => y.u.groep === g && !y.uitval)) return d; } return null; }
const presVoorop = (s, x, nu) => s === vandaag() && magTelt(s, x) && !magVan(s, x).p && nu - minuten(x.u.start) < 15;
const wegNamen = (s, x) => { const L = S.beoord.lijsten[x.u.groep] || []; return (AP.weg[magKey(s, x)] || []).map(id => (L.find(ll => ll.id === id) || {}).naam).filter(Boolean); };
function presRaster(s, x) { // tik wie er niet is; de namen komen uit je eigen klassenlijst
  const g = x.u.groep; const L = S.beoord.lijsten[g] || []; const k = magKey(s, x); const weg = AP.weg[k] || []; const J = jarigInKlas(s, g).map(j => j.ll.id);
  if (!L.length) return `<p class="lead" style="margin-top:.5rem">Nog geen klassenlijst van ${esc(g)}. Plak hem één keer uit Magister; daarna tik je hier wie er niet is.</p><div class="knoppen" style="margin-top:.6rem"><button class="btn" data-klasopen="${esc(g)}">Klassenlijst plakken</button></div>`;
  return `<div class="pres" role="group" aria-label="Tik wie er niet is">${L.map(ll => `<button class="pres-ll${J.includes(ll.id) ? ' jarig' : ''}" data-afw="${esc(k)}|${esc(ll.id)}" aria-pressed="${weg.includes(ll.id)}">${esc(ll.naam)}${J.includes(ll.id) ? ' · jarig' : ''}</button>`).join('')}</div>`;
}
const magOpenKnop = (k, klein) => { const n = (AP.weg[k] || []).length; return `<a class="btn mag${klein ? ' klein' : ''}" href="${esc(MAGURL())}" target="magister" rel="noopener" data-magopen="${esc(k)}">Open Magister<span data-presn="${esc(k)}">${n ? ' · ' + n + ' absent' : ''}</span></a>`; };
function presKaart(s, x, nu) { // de eerste 15 minuten van elke les staat de presentie voorop
  const k = magKey(s, x); const rest = Math.max(1, minuten(x.u.start) + 15 - nu); const bordLoopt = RG && RG.uid === x.u.id && Date.now() - RG.tijd < 5000;
  return `<div class="kaart"><p class="eyebrow mag">Eerst · Magister · binnen ${rest} ${rest === 1 ? 'minuut' : 'minuten'}</p><h2>Absenten melden · ${esc(x.u.groep)}</h2>
    <p class="lead">Tik wie er niet is en zet het daarna in Magister. Lesdag kijkt daar zelf niet in.</p>${presRaster(s, x)}${jarigMelding(s, x.u.groep)}
    <!--dok-->${magOpenKnop(k)}<button class="btn${GEOPEND[k] ? ' hoofd' : ''}" data-mag="p|${esc(k)}">Gemeld</button>${bordLoopt ? `<a class="btn" href="#regie/${encodeURIComponent(x.u.id)}/${s}">Naar de regie</a>` : `<button class="btn" data-bord="${esc(x.u.id)}|${s}">Op het bord, regie hier</button>`}<!--/dok--></div>`;
}
function magBlok(s, x, opt) { // Magister in het oog, tijdens en na de les: presentie, huiswerk bij de bel, logboek
  if (!magTelt(s, x)) return ''; opt = opt || {}; const k = magKey(s, x); const v = magVakken(s, x); const R = [];
  const hw = hwTekst(x);
  if (hw && v.hw === false) R.push(hwRij(s, x));
  if (v.pres === false) { const namen = wegNamen(s, x);
    R.push(`<div class="nu-rij"><span><b>Presentie</b> · nog niet gemeld${namen.length ? `<div class="sub">Absent: ${esc(namen.join(', '))}</div>` : ''}</span><span class="tb">${magOpenKnop(k, true)}<button class="btn klein${GEOPEND[k] ? ' hoofd' : ''}" data-mag="p|${esc(k)}">Gemeld</button></span></div>`
      + (opt.raster ? presRaster(s, x) : `<details class="meer"><summary>Wie is er niet? Tik aan</summary>${presRaster(s, x)}</details>`)); }
  else if (v.pres) R.push(`<div class="nu-rij"><span><b>Presentie</b> · gemeld om ${tijdVan(v.pres)}</span><span class="ok">✓ <span class="sub">rond</span></span></div>`);
  if (hw && v.hw === null) R.push(`<div class="nu-rij"><span><b>Huiswerk</b> · klaar voor bij de bel<div class="sub">uit "thuis" in je leergang</div></span><span></span></div>`);
  else if (hw && v.hw) R.push(`<div class="nu-rij"><span><b>Huiswerk</b> · staat erin</span><span class="ok">✓ <span class="sub">rond</span></span></div>`);
  return `<div class="mag-blok"><p class="eyebrow">Magister</p>${R.join('')}${logRijen(s, x)}${logForm(s, x)}</div>`;
}
function hwRij(s, x) { const vl = volgendeLesVan(x.u.groep, s); const hk = hwKey(x);
  return `<div class="nu-rij"><span><b>Huiswerk ${esc(x.u.groep)}${vl ? ' voor ' + esc(fmtLang(vl)) : ''}</b><div class="mag-tekst">${esc(hwTekst(x))}</div></span><span class="tb"><button class="btn klein mag" data-magcopy="hw|${s}|${esc(x.u.id)}">Kopieer en open</button><button class="btn klein${GEOPEND[hk] ? ' hoofd' : ''}" data-mag="h|${esc(hk)}">Staat erin</button></span></div>`; }
function logRijen(s, x, kompas) { const k = magKey(s, x); const N = AP.log[k] || []; if (!N.length) return ''; const L = S.beoord.lijsten[x.u.groep] || []; const naam = id => (L.find(ll => ll.id === id) || {}).naam || 'leerling';
  return N.map((n, i) => `<div class="nu-rij"><span><b>Logboek · ${esc(naam(n.ll))}</b><div class="sub">${esc(n.t)}</div></span><span class="tb"><button class="btn klein" data-magcopy="log|${esc(k)}|${i}">Kopieer</button><button class="btn klein" data-log="weg|${esc(k)}|${i}" aria-label="Notitie weg">×</button></span></div>`).join('')
    + `<div class="knoppen" style="margin-top:.5rem">${kompas ? '' : `<a class="btn klein mag" href="${esc(MAGURL())}" target="magister" rel="noopener">Open Magister</a>`}<button class="btn klein${kompas ? ' mag' : ''}" data-mag="l|${esc(k)}">Logboek staat erin</button></div>`; }
function logForm(s, x) { const L = S.beoord.lijsten[x.u.groep] || []; if (!L.length) return ''; const k = magKey(s, x);
  return `<details class="meer" style="margin-top:.6rem"><summary>Logboek: notitie over een leerling</summary><div class="logform"><select id="lgLl" aria-label="Leerling">${L.map(ll => `<option value="${esc(ll.id)}">${esc(ll.naam)}</option>`).join('')}</select><input id="lgT" placeholder="Bijvoorbeeld: had zijn gitaar niet bij zich" aria-label="Notitie"><button class="btn" data-log="add|${esc(k)}">Bewaar</button></div><p class="sub" style="margin-top:.3rem">Blijft op dit apparaat tot het in Magister staat.</p></details>`; }
function magRij(o, kompas) { // één regel in werkblok, afsluiten, Nog open en het kompas
  const { s, x } = o; const k = magKey(s, x); const wanneer = (s === vandaag() ? '' : fmtD(s) + ' ') + x.u.start; const chip = kompas ? '' : '<span class="chip mag">Magister</span> ';
  if (o.soort === 'pres') { const namen = wegNamen(s, x);
    return `<div class="nu-rij"><span>${chip}Presentie ${esc(x.u.groep)} van ${esc(wanneer)}${namen.length ? `<div class="sub">Absent: ${esc(namen.join(', '))}</div>` : ''}</span><span class="tb">${kompas ? '' : magOpenKnop(k, true)}<button class="btn klein" data-mag="p|${esc(k)}">Gemeld</button></span></div>`; }
  if (o.soort === 'hw') { const vl = volgendeLesVan(x.u.groep, s);
    return `<div class="nu-rij"><span>${chip}Huiswerk ${esc(x.u.groep)}${vl ? ' voor ' + esc(fmtD(vl)) : ''}<div class="sub">${kompas ? esc(hwTekst(x)) : 'tekst staat klaar'}</div></span><span class="tb"><button class="btn klein mag" data-magcopy="${kompas ? 'hwk' : 'hw'}|${s}|${esc(x.u.id)}">${kompas ? 'Kopieer' : 'Kopieer en open'}</button><button class="btn klein" data-mag="h|${esc(hwKey(x))}">Staat erin</button></span></div>`; }
  const n = (AP.log[k] || []).length;
  return `<div class="nu-rij"><span>${chip}Logboek ${esc(x.u.groep)} van ${esc(wanneer)}: ${n} ${n === 1 ? 'notitie' : 'notities'}</span><span class="tb">${kompas ? '' : '<button class="btn klein" data-kompas="">Kompas</button>'}<button class="btn klein" data-mag="l|${esc(k)}">Staat erin</button></span></div>`;
}
const magLijst = (M, max) => M.slice(0, max).map(o => magRij(o)).join('') + (M.length > max ? `<div class="knoppen" style="margin:.5rem 0 .3rem"><button class="btn klein mag" data-kompas="">Nog ${M.length - max} in het kompas</button></div>` : ''); // de rest staat in het kompas
/* kopiëren in één tik: eerst direct (binnen dezelfde tik, vóór Magister opengaat), anders via het klembord. Geeft een belofte: gelukt of niet */
function kopieer(t) {
  try { const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); if (ok) return Promise.resolve(true); } catch (e) {}
  try { return navigator.clipboard.writeText(t).then(() => true, () => false); } catch (e) { return Promise.resolve(false); }
}
const tril1 = () => { try { if (navigator.vibrate) navigator.vibrate(250); } catch (e) {} }; // één keer, alleen in een les

/* jarigen: geboortedatum uit de geplakte klassenlijst (alleen dag en maand, AP.jarig) en de lijst van collega's die Frans zelf plakt
   (AP.collegas). Lesdag haalt niets van het intranet. Een verjaardag in het weekend telt op de eerste werkdag erna. */
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const mdUit = (m, d) => m >= 1 && m <= 12 && d >= 1 && d <= 31 ? String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0') : '';
const mdTekst = md => +md.slice(3) + ' ' + MAANDEN[+md.slice(0, 2) - 1];
function jarigDagen(s) { const out = []; for (let d = addD(volgendeLesdag(s, -1), 1); d <= s; d = addD(d, 1)) out.push(d); return out; }
const wanneerJarig = (d, s) => d === s ? 'is vandaag jarig' : 'was ' + DAGLANG[dOf(d).getDay()] + ' jarig';
function jarigInKlas(s, g) { const D = jarigDagen(s); return (S.beoord.lijsten[g] || []).map(ll => ({ ll, d: D.find(d => AP.jarig[ll.id] === d.slice(5)) })).filter(j => j.d); }
function jarigMelding(s, g) { const J = jarigInKlas(s, g); return J.length ? `<div class="melding" style="margin-top:.7rem">${J.map(j => esc(j.ll.naam) + ' ' + wanneerJarig(j.d, s)).join('. ')}.</div>` : ''; }
function collegasJarig(s) { const D = jarigDagen(s); return (AP.collegas || []).map(c => ({ c, d: D.find(d => c.md === d.slice(5)) })).filter(j => j.d); }
function felicUrl(c) {
  const vn = /,/.test(c.naam) ? c.naam.split(',')[1].trim().split(/\s+/)[0] : c.naam.split(/\s+/)[0];
  return ((window.LESDAG_CONFIG || {}).outlookNieuw || 'https://outlook.office.com/mail/deeplink/compose') + '?' + [c.mail ? 'to=' + encodeURIComponent(c.mail) : '', 'subject=' + encodeURIComponent('Gefeliciteerd!'),
    'body=' + encodeURIComponent(`Beste ${vn},\n\nVan harte gefeliciteerd met je verjaardag! Een fijne dag gewenst.\n\nGroet,\nFrans`)].filter(Boolean).join('&');
}
const felicRij = ({ c, d }) => { const s = vandaag(); const af = AP.felic[s + '|' + c.naam];
  return `<div class="nu-rij"><span><span class="chip out">Outlook</span> <b>${esc(c.naam)}</b> ${wanneerJarig(d, s)}</span><span class="tb">${af ? '<span class="ok">✓ <span class="sub">mail geopend</span></span>' : `<a class="btn klein out" href="${esc(felicUrl(c))}" target="_blank" rel="noopener" data-felic="${esc(s + '|' + c.naam)}">Feliciteer in Outlook</a>`}</span></div>`; };
function collegaParse(txt) { // een collega per regel met de datum ("12 november Jan Jansen", "Jan Jansen 12-11"); een regel met alleen een datum geldt voor de regels eronder
  let nu = ''; const out = [];
  for (const r0 of String(txt).split(/\r?\n/)) { let r = ' ' + r0.replace(/\t/g, ' ') + ' ', md = '', mail = '';
    r = r.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/, m => { mail = m; return ' '; });
    r = r.replace(/\s(\d{1,2})[-\/.](\d{1,2})(?:[-\/.]\d{2,4})?(?=\s)/, (m, d, mm) => { md = mdUit(+mm, +d); return ' '; });
    if (!md) r = r.replace(/\s(\d{1,2})\s+(jan|feb|mrt|maa|apr|mei|jun|jul|aug|sep|okt|nov|dec)[a-z]*\.?(?:\s+\d{4})?(?=\s)/i, (m, d, mn) => { const k = mn.toLowerCase(); md = mdUit((k === 'maa' ? 2 : MND.indexOf(k)) + 1, +d); return ' '; });
    const naam = r.replace(/\(\s*\d+\s*(jaar)?\s*\)/gi, ' ').replace(/\b(is|wordt)?\s*(vandaag\s+)?jarig\b/gi, ' ').replace(/\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|vandaag|morgen)\b:?/gi, ' ')
      .replace(/\s+/g, ' ').replace(/^[\s,;:|–-]+|[\s,;:|–-]+$/g, '').trim();
    if (md && !naam) { nu = md; continue; }
    if (naam && (md || nu)) out.push({ naam, md: md || nu, mail });
  }
  return out;
}

/* ---------- kompas: een smal venster naast Magister ----------
   Wat er nu in Magister moet, groot en in gewone taal, met de tekst klaar om te kopiëren. Daaronder de rest. Smal genoeg voor een
   venster naast Magister op de Android-tablet of de laptop. */
function kompasOpen() { const w = window.open(location.pathname + '#kompas', 'lesdag-kompas', 'popup=yes,width=440,height=860'); if (!w) location.hash = 'kompas'; }
function viewKompas() {
  const s = vandaag(); const nu = nuMin(); const L = magOpen(s);
  const i = L.findIndex(o => o.soort === 'pres' && o.s === s && minuten(o.x.u.start) <= nu && nu < minuten(o.x.u.eind)); if (i > 0) L.unshift(L.splice(i, 1)[0]); // de les van nu eerst
  let h = `<div class="kompas"><div class="kp-kop"><b>Lesdag · kompas</b><a href="#nu">Naar Nu</a></div>`;
  if (!L.length) return h + `<div class="kaart kp-leeg"><p class="eyebrow" style="color:var(--ok)">Nu in Magister</p><p class="kp-groot">Niets</p><p class="lead">Alles wat je in Lesdag afvinkte, staat erin. Lesdag kijkt zelf niet in Magister.</p></div></div>`;
  const [o, ...rest] = L; const { x } = o; const k = magKey(o.s, x); const wanneer = (o.s === s ? 'vandaag ' : fmtD(o.s) + ' ') + x.u.start + '–' + x.u.eind;
  h += `<div class="kaart kp-nu"><p class="eyebrow mag">Nu in Magister · ${esc(wanneer)}</p>`;
  if (o.soort === 'pres') { const namen = wegNamen(o.s, x);
    h += `<p class="kp-groot">Absenten ${esc(x.u.groep)}</p><div class="mag-tekst">${namen.length ? esc(namen.join('\n')) : 'Nog niemand afwezig getikt.'}</div>${presRaster(o.s, x)}<div class="knoppen"><button class="btn mag" data-mag="p|${esc(k)}">Gemeld</button></div>`; }
  else if (o.soort === 'hw') { const vl = volgendeLesVan(x.u.groep, o.s);
    h += `<p class="kp-groot">Huiswerk ${esc(x.u.groep)}${vl ? ' voor ' + esc(fmtD(vl)) : ''}</p><div class="mag-tekst">${esc(hwTekst(x))}</div><div class="knoppen" style="margin-top:.8rem"><button class="btn" data-magcopy="hwk|${o.s}|${esc(x.u.id)}">Kopieer</button><button class="btn mag" data-mag="h|${esc(hwKey(x))}">Staat erin</button></div>`; }
  else h += `<p class="kp-groot">Logboek ${esc(x.u.groep)}</p>${logRijen(o.s, x, true)}`;
  h += '</div>';
  if (rest.length) h += `<div class="kaart"><p class="eyebrow mag">Daarna · ${rest.length}</p>${rest.map(r => magRij(r, true)).join('')}</div>`;
  return h + '</div>';
}

/* afronden zonder lesmodus: dezelfde regels als het afrondscherm van de lesmodus */
function rondAf(s, x, keuze, n) {
  const g = x.u.groep; S.voortgang[g] = S.voortgang[g] || {}; n = (n || '').trim();
  if (keuze === 'niet') { (S.uitval[s] = S.uitval[s] || []).push(x.u.id); if (n) S.voortgang[g][x.item.id] = Object.assign({}, status(g, x.item.id), { n }); }
  else S.voortgang[g][x.item.id] = { st: keuze, d: s, uur: x.u.id, n: n || undefined };
  if (S.afLater[s]) S.afLater[s] = S.afLater[s].filter(v => v !== x.u.id);
}

/* ---------- regie: het bord in een tweede venster, de regie op dit scherm ----------
   "Op het bord, regie hier" opent de lesmodus in een eigen venster: sleep dat naar het digibord. Dat venster laat alleen zien wat
   leerlingen mogen zien (geen jouw-kaart, geen notities, geen afronden). Dit venster wordt de regie: fase, klok, je notities,
   volgende en vorige, afronden. De twee vensters praten via BroadcastChannel op hetzelfde apparaat; er gaat niets over het netwerk. */
const KAN = 'BroadcastChannel' in window ? new BroadcastChannel('lesdag-les') : null;
let RG = null, rgWacht = null;
const rgStuur = (t, x) => { if (KAN) KAN.postMessage(Object.assign({ t }, x || {})); };
function bordOpen(uid, s) {
  const w = window.open(location.pathname + '#bord/' + encodeURIComponent(uid) + '/' + s, 'lesdag-bord', 'popup=yes,width=1280,height=760');
  if (!w) { toast('Je browser houdt het tweede venster tegen. Sta pop-ups toe voor Lesdag.'); return; }
  RG = null; location.hash = 'regie/' + encodeURIComponent(uid) + '/' + s;
}
function bordZeg() {
  if (!LES || !LES.bord) return; const P = LES;
  rgStuur('staat', { uid: P.x.u.id, s: P.s, i: P.i, left: P.left, tot: P.tot, loopt: !!P.timer, groep: P.x.u.groep, start: P.x.u.start, eind: P.x.u.eind, titel: P.l.titel || '',
    slides: P.slides.map(x => ({ k: x.k, soort: x.soort || '', kop: x.kop || '', min: x.min || 0, docent: typeof x.docent === 'string' ? x.docent : '' })) });
}
if (KAN) KAN.onmessage = e => {
  const m = e.data || {};
  if (m.t === 'staat') { const nieuw = !RG || RG.i !== m.i || RG.loopt !== m.loopt || RG.uid !== m.uid || RG.tot !== m.tot; RG = Object.assign(m, { tijd: Date.now() });
    if (route.naam === 'regie') { if (nieuw) render(); else { const el = $('#rgTijd'); if (el) el.textContent = pad(Math.max(0, m.left)); const k = $('#rgKlok'); if (k) k.classList.toggle('bijna', m.left <= 120 && m.tot >= 300); } }
    if (m.loopt && m.left === 120 && m.tot >= 300) tril(); return; }
  if (m.t === 'dicht') { RG = null; if (route.naam === 'regie') render(); return; }
  if (!LES || !LES.bord) return;
  if (m.t === 'ga' && m.i >= 0 && m.i < LES.slides.length) { LES.i = m.i; toonSlide(); }
  else if (m.t === 'volgende' && LES.i < LES.slides.length - 1) { LES.i++; toonSlide(); }
  else if (m.t === 'vorige' && LES.i > 0) { LES.i--; toonSlide(); }
  else if (m.t === 'timer') timer();
  else if (m.t === 'plus') { LES.left += 60; LES.tot += 60; bordZeg(); }
  else if (m.t === 'vraag') bordZeg();
  else if (m.t === 'sluit') sluitLes();
};
const SLNAAM = { klaar: 'Jouw kaart', welkom: 'Welkom', doel: 'Lesdoel', check: 'Check', id: 'Rode draad', thuis: 'Thuis en materiaal', af: 'Einde' };
const slideNaam = x => x.k === 'fase' ? ((LESMODUS.SOORT[x.soort] || {}).naam || 'Fase') + (x.kop ? ': ' + x.kop : '') : (SLNAAM[x.k] || x.k) + (x.k === 'check' && x.kop ? ': ' + x.kop : '');
function viewRegie() {
  const uid = decodeURIComponent(route.arg[0] || ''); const s = route.arg[1] || vandaag(); waak(true);
  if (!RG || RG.uid !== uid || Date.now() - RG.tijd > 4000) {
    rgStuur('vraag'); if (!rgWacht) rgWacht = setTimeout(() => { rgWacht = null; if (route.naam === 'regie' && (!RG || RG.uid !== uid)) render(); }, 2000);
    return `<div class="kop"><div><p class="eyebrow">Regie</p><h1>Het bord is niet open</h1></div></div><div class="kaart"><p class="lead">Open het bord opnieuw en sleep het venster naar het digibord. Of geef de les op dit scherm.</p>
      <div class="knoppen" style="margin-top:.6rem"><button class="btn hoofd" data-bord="${esc(uid)}|${s}">Bord openen</button><button class="btn" data-start="${esc(uid)}|${s}">Les op dit scherm</button><a class="btn" href="#nu">Naar Nu</a></div></div>`;
  }
  const sl = RG.slides[RG.i] || {}; const rest = minuten(RG.eind) - nuMin();
  const x = (planning(s, s)[s].uren || []).find(y => y.u.id === uid);
  return `<div class="kop"><div><p class="eyebrow">Regie · alleen op dit scherm</p><h1>${esc(RG.groep)} · ${esc(RG.titel)}</h1><div class="sub">${esc(RG.start)}–${esc(RG.eind)}${rest > 0 && s === vandaag() ? ' · nog ' + rest + ' min les' : ''}</div></div><div class="knoppen"><button class="btn" data-rg="sluit">Bord sluiten</button></div></div>
  <div class="rg"><div class="kaart"><p class="eyebrow">Op het bord</p><h2>${esc(slideNaam(sl))}</h2>
    ${sl.min ? `<div class="rg-klok ${RG.left <= 120 && RG.tot >= 300 ? 'bijna' : ''}" id="rgKlok"><b id="rgTijd">${pad(Math.max(0, RG.left))}</b><span>${RG.loopt ? 'loopt' : 'staat stil'}</span></div>` : ''}
    ${sl.docent ? `<div class="rg-notitie"><b>Alleen jij ziet dit</b>${esc(sl.docent)}</div>` : ''}
    <div class="rg-knoppen"><button class="btn" data-rg="vorige">‹ Vorige</button><button class="btn hoofd" data-rg="volgende">Volgende ›</button>${sl.min ? `<button class="btn" data-rg="timer">${RG.loopt ? 'Klok stil' : 'Klok aan'}</button><button class="btn" data-rg="plus">+1 min</button>` : ''}</div>
    <p class="sub" style="margin-top:.6rem">Pijltjes en de presenter werken ook als dit venster voorop staat · t = klok</p></div>
  <div class="rg-rechts">${x && magTelt(s, x) ? `<div class="kaart">${magBlok(s, x, { raster: presVoorop(s, x, nuMin()) })}</div>` : ''}
  <div class="kaart"><p class="eyebrow">De les</p><ol class="rg-lijst">${RG.slides.map((y, j) => y.k === 'af' ? '' : `<li><button class="rg-s ${j === RG.i ? 'nu' : j < RG.i ? 'af' : ''}" data-rg="ga" data-i="${j}">${esc(slideNaam(y))}${y.min ? ` <small>${y.min} min</small>` : ''}</button></li>`).join('')}</ol></div></div>
  <div class="kaart"><p class="eyebrow">Afronden, als de les klaar is</p>
    <div class="nu-keuzes"><button class="btn hoofd" data-rgaf="gegeven">Gegeven</button><button class="btn" data-rgaf="half">Deels, volgende keer verder</button><button class="btn" data-rgaf="niet">Niet aan toegekomen</button></div>
    <textarea id="rgNot" placeholder="Notitie voor de volgende les">${x && x.item ? esc((status(x.u.groep, x.item.id) || {}).n || '') : ''}</textarea>
    ${x && x.item && bmVoor(x.item).length ? `<div class="knoppen" style="margin-top:.6rem">${bmVoor(x.item).map(m => `<button class="btn" data-beoordeel="${esc(m.id)}|${esc(x.u.groep)}">Beoordelen ${esc(m.toets)}</button>`).join('')}</div>` : ''}</div></div>`;
}
/* tablet en laptop: scherm aan tijdens de les; kort trillen twee minuten voor het eind van een fase (alleen jij merkt het) */
let WL = null;
function waak(aan) {
  if (aan) { if (WL || !('wakeLock' in navigator) || document.hidden) return; navigator.wakeLock.request('screen').then(l => { WL = l; l.addEventListener('release', () => { WL = null; }); }).catch(() => {}); }
  else if (WL) { WL.release().catch(() => {}); WL = null; }
}
const tril = () => { try { if (navigator.vibrate) navigator.vibrate([90, 70, 90]); } catch (e) {} };

/* ---------- opdrachtbalk (Ctrl K): typ wat je wilt doen; in gewone taal een snelle taak ---------- */
let PAL = null;
function paletOpen() {
  let el = $('#palet');
  if (!el) { el = document.createElement('div'); el.id = 'palet'; el.className = 'palet'; el.hidden = true;
    el.innerHTML = `<div class="palet-in" role="dialog" aria-modal="true" aria-label="Opdrachtbalk"><input id="palQ" autocomplete="off" spellcheck="false" enterkeyhint="go" placeholder="Typ wat je wilt doen, of een taak: mail ouders koor morgen 10:30"><div id="palL" class="palet-l" role="listbox"></div><p class="palet-hint">Enter kiest · pijltjes bladeren · Esc sluit · op de tablet kun je inspreken met de microfoon van je toetsenbord</p></div>`;
    document.body.appendChild(el); }
  PAL = { acties: paletActies(), q: '', i: 0, L: [] }; el.hidden = false; $('#palQ').value = ''; paletToon(); setTimeout(() => $('#palQ').focus(), 0);
}
function paletDicht() { const el = $('#palet'); if (el) el.hidden = true; PAL = null; }
function paletActies() {
  const s = vandaag(); const p = planning(s, s)[s]; const A = [];
  const voeg = (t, z, run, sub) => A.push({ t, sub, run, z: (t + ' ' + (z || '') + ' ' + (sub || '')).toLowerCase() });
  ROUTES.forEach(([k, n]) => voeg('Naar ' + n, k, () => { location.hash = k; }));
  lesUren(p).filter(x => !x.klaar).forEach(x => { const l = les(x.item); const sub = `${x.u.start} · ${l.titel || ''}`;
    voeg(`Op het bord, regie hier: ${x.u.groep}`, 'les geven digibord lesmodus', () => bordOpen(x.u.id, s), sub);
    voeg(`Les op dit scherm: ${x.u.groep}`, 'les geven lesmodus', () => startLes(x.u.id, s), sub);
    voeg(`Voorbereiden: ${x.u.groep}`, 'les bekijken klaarzetten', () => { nuKijk = 'les:' + x.u.id; location.hash = 'nu'; render(); }, sub);
    bmVoor(x.item).forEach(m => voeg(`Beoordelen ${m.toets}: ${x.u.groep}`, 'beoordeling cijfers rubric', () => { location.hash = 'beoordelen/' + encodeURIComponent(m.id) + '/' + encodeURIComponent(x.u.groep); })); });
  rooGroepen().forEach(g => voeg('Groep ' + g, 'voortgang leergang', () => { groepKeuze = g; location.hash = 'groepen'; render(); }));
  voeg('Dag afsluiten', 'einde klaar wat ging goed', () => { nuKijk = 'afsluiten'; location.hash = 'nu'; render(); });
  voeg('Morgen bekijken', 'voorbereiden volgende dag', () => { dagKeuze = volgendeLesdag(s, 1); location.hash = 'vandaag'; render(); });
  voeg('Pauzetijden instellen', 'pauze rust instellingen', () => { location.hash = 'instellingen'; });
  voeg('Kompas naast Magister', 'magister presentie absenten huiswerk logboek', kompasOpen);
  voeg('Open Magister', 'presentie absenten huiswerk logboek', () => window.open(MAGURL(), 'magister'));
  return A;
}
function paletLijst() {
  const q = PAL.q.trim(); const w = q.toLowerCase().split(/\s+/).filter(Boolean);
  let L = PAL.acties.filter(a => w.every(x => a.z.includes(x)));
  if (q) { const t = leesTaak(q); const taak = { t: 'Nieuwe taak: ' + t.titel, sub: t.uitleg, let: t.waarschuw, run: () => taakUitPalet(t) };
    L = t.wanneer || /^(taak|zet|plan)\b/i.test(q) || !L.length ? [taak].concat(L) : L.concat([taak]); }
  return L.slice(0, 8);
}
function paletToon() {
  PAL.L = paletLijst(); PAL.i = Math.min(PAL.i, Math.max(0, PAL.L.length - 1));
  $('#palL').innerHTML = PAL.L.length ? PAL.L.map((a, j) => `<button type="button" class="palet-a${j === PAL.i ? ' sel' : ''}" role="option" aria-selected="${j === PAL.i}" data-pal="${j}"><b>${esc(a.t)}</b>${a.sub ? `<small>${esc(a.sub)}</small>` : ''}${a.let ? `<small class="let">${esc(a.let)}</small>` : ''}</button>`).join('') : '<p class="leeg" style="padding:.6rem">Typ verder…</p>';
}
function paletKies(j) { const a = PAL && PAL.L[j]; if (!a) return; paletDicht(); a.run(); }
const DAGW = { zondag: 0, maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6, ma: 1, di: 2, wo: 3, do: 4, vr: 5 };
function datumVan(dag, mnd) { const j = dOf(vandaag()).getFullYear(); let x = ymd(new Date(j, mnd, dag, 12)); if (x < vandaag()) x = ymd(new Date(j + 1, mnd, dag, 12)); return x; }
function leesTaak(q) { // "mail ouders koor morgen 10:30", "sectie agenda voor vrijdag", "plan slc 20 min do om 14 uur"
  let t = ' ' + String(q).replace(/^\s*(taak:?|zet|plan)\s+/i, '') + ' '; const s0 = vandaag(); let dag = null, van = null, dur = null, uiterlijk = false, m;
  const pak = re => { const r = t.match(re); if (r) t = t.slice(0, r.index) + ' ' + t.slice(r.index + r[0].length); return r; };
  if (pak(/\s(voor|uiterlijk|deadline)(?=\s+(vandaag|morgen|overmorgen|volgende|maandag|dinsdag|woensdag|donderdag|vrijdag|ma|di|wo|do|vr|\d))/i)) uiterlijk = true;
  if ((m = pak(/\s(vandaag|morgen|overmorgen)(?=\s)/i))) dag = addD(s0, { vandaag: 0, morgen: 1, overmorgen: 2 }[m[1].toLowerCase()]);
  const vw = pak(/\svolgende\s+week(?=\s)/i);
  if ((m = pak(/\s(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|ma|di|wo|do|vr)(?=\s)/i))) { const wd = DAGW[m[1].toLowerCase()]; let d = s0; while (dOf(d).getDay() !== wd) d = addD(d, 1); if (vw && d < addD(maandagVan(s0), 7)) d = addD(d, 7); dag = d; }
  else if (vw) dag = addD(maandagVan(s0), 7);
  if (!dag && (m = pak(/\s(\d{1,2})[-\/](\d{1,2})(?=\s)/))) dag = datumVan(+m[1], +m[2] - 1);
  if (!dag && (m = pak(/\s(\d{1,2})\s+(jan|feb|mrt|maa|apr|mei|jun|jul|aug|sep|okt|nov|dec)[a-z]*(?=\s)/i))) { const k = m[2].toLowerCase(); dag = datumVan(+m[1], k === 'maa' ? 2 : MND.indexOf(k)); }
  if ((m = pak(/\s(?:om\s+)?(\d{1,2})[:.](\d{2})(?:\s*uur)?(?=\s)/i))) van = +m[1] * 60 + +m[2];
  else if ((m = pak(/\som\s+(\d{1,2})(?:\s*uur)?(?=\s)/i))) van = +m[1] * 60;
  if ((m = pak(/\s(\d{1,3})\s*(?:min|minuten)(?=\s)/i))) dur = +m[1];
  else if (pak(/\s(?:een\s+)?kwartier(?=\s)/i)) dur = 15; else if (pak(/\s(?:een\s+)?half\s*uur(?=\s)/i)) dur = 30; else if ((m = pak(/\s(?:een|(\d))\s+uur(?=\s)/i))) dur = (+m[1] || 1) * 60;
  const titel = cap(t.replace(/\s+/g, ' ').trim()) || 'Taak';
  const bron = /\bsectie\b/i.test(q) ? 'sectie' : /\bkoor\b/i.test(q) ? 'koor' : /\bslc\b/i.test(q) ? 'slc' : /\b(e-?mail|mail|mailen)\b/i.test(q) ? 'mail' : /\b(les|lessen|presentatie)\b/i.test(q) ? 'les' : 'overig';
  if (van != null && !dag) dag = van > nuMin() ? s0 : addD(s0, 1);
  const r = { titel, bron, wanneer: !!(dag || van != null) };
  if (van != null && !uiterlijk) { dur = dur || schat(bron); r.plan = { dag, van: hm(van), tot: hm(van + dur) }; r.uitleg = `${fmtD(dag)} ${hm(van)}–${hm(van + dur)} · ${BRON[bron]}`; r.waarschuw = botsing(dag, van, van + dur); }
  else if (dag) { r.d = dag; r.uitleg = `deadline ${fmtD(dag)} · ${BRON[bron]}${dur ? ' · ' + dur + ' min' : ''}`; }
  else r.uitleg = `zonder datum · ${BRON[bron]}${dur ? ' · ' + dur + ' min' : ''}`;
  if (dur && !r.plan) r.min = dur;
  return r;
}
function botsing(dag, van, tot) {
  const pd = planning(dag, dag)[dag]; const it = dagItems(dag, pd).items.find(x => ['les', 'pauze', 'rust', 'koor'].includes(x.soort) && x.van < tot && x.tot > van);
  if (!it) return pd.reden ? `Let op: ${pd.reden}` : '';
  return it.soort === 'les' ? `Let op: dan geef je les (${it.titel})` : it.soort === 'koor' ? 'Let op: dan is het koor' : `Let op: dat is je ${it.soort === 'rust' ? 'rustblok' : 'pauze'}`;
}
function taakUitPalet(t) {
  const k = maakTaak('', t.plan || null, t.titel, t.bron); if (!k) return;
  if (t.d) k.d = t.d; if (t.min) k.min = t.min; bewaar();
  toast(t.plan ? `${k.titel} staat op ${fmtD(t.plan.dag)} om ${t.plan.van}` : `${k.titel} staat in je takenlijst${t.d ? ', deadline ' + fmtD(t.d) : ''}`);
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
  return h + `<p class="lead">${Math.floor(vrijMin / 60)} uur en ${vrijMin % 60} minuten vrij deze week (tussen 8:30 en 16:30, je pauzes niet meegeteld). Klik op een vrij blok om er een taak in te zetten, of op een les om die voor te bereiden. De lesvolgorde schuift vanzelf door als een les uitvalt of niet af is.</p>`;
}

/* ---------- groepen en leergangen ---------- */
let groepKeuze = null, klasOpen = null;
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
    <label style="font-size:var(--t-klein);color:var(--muted)">Leergang <select id="gLg" data-g="${esc(g)}">${Object.keys(B.leergangen).map(k => `<option value="${k}" ${k === lg ? 'selected' : ''}>${esc(lgNaam(k))}</option>`).join('')}</select></label></div>
    <div class="knoppen" style="margin-top:.5rem"><button class="btn klein" data-opplan="${esc(g)}">Op de planning zetten</button><span class="sub" style="font-size:var(--t-klein);color:var(--muted)">alle lessen vóór deze lesweek gelden dan als gegeven</span></div>
    <div class="voortgang" style="margin-top:.6rem"><i style="width:${r.length ? Math.round(gegeven / r.length * 100) : 0}%"></i></div></div>`;
  const kl = S.beoord.lijsten[g] || []; const nj = kl.filter(ll => AP.jarig[ll.id]).length;
  h += klasOpen === g ? lijstKaart(g, kl, 'klas') : `<div class="kaart"><h2>Klassenlijst</h2><p class="lead">${kl.length ? `${kl.length} leerlingen${nj ? `, van ${nj} de verjaardag` : ''}.` : 'Nog geen klassenlijst.'} Voor presentie, logboek en beoordelen. De namen staan op dit apparaat en in je eigen OneDrive; verjaardagen (alleen dag en maand) alleen op dit apparaat.</p>
    <div class="knoppen" style="margin-top:.6rem"><button class="btn" data-klasopen="${esc(g)}">${kl.length ? 'Opnieuw plakken uit Magister' : 'Plakken uit Magister'}</button></div></div>`;
  const bms = BM.filter(m => (m.lessen || []).some(k => k.lg === lg));
  if (bms.length) h += `<div class="kaart"><h2>Beoordelen</h2><p class="lead">Ook om in te halen of na te kijken buiten de toetsles.</p><div class="knoppen" style="margin-top:.5rem">${bms.map(m => { const T = S.beoord.toetsen[m.id + '|' + g]; const n = T ? Object.values(T.ll).filter(r => r.af || bmEind(m, r) != null).length : 0; return `<button class="btn" data-beoordeel="${esc(m.id)}|${esc(g)}">${esc(m.toets)} ${esc(m.titel.replace(/^[^:]*:\s*/, ''))}${n ? ` (${n} klaar)` : ''}</button>`; }).join('')}</div></div>`;
  h += `<div class="kaart">${r.map((x, i) => { const l = les(x); const st = status(g, x.id); return `<div class="lesrij ${i === vi ? 'volgende' : ''}"><span class="wk">${i + 1}<br>wk ${x.w}</span><div><div class="regel" style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:baseline">${chipType(l)}<b style="font-family:var(--lees)">${esc(l.titel || '')}</b>${st.st ? `<span class="chip ${st.st === 'gegeven' ? 'ok' : st.st === 'half' ? 'let' : ''}">${esc(st.st)}${st.d ? ' ' + esc(fmtD(st.d)) : ''}</span>` : ''}</div>${st.n ? `<div class="vorige">${esc(st.n)}</div>` : ''}</div>
    <div class="acties knoppen"><button class="btn klein" data-bewerk="${esc(x.id)}">bewerk</button>${afgerond(st) ? `<button class="btn klein" data-reset="${esc(g)}|${esc(x.id)}">niet gegeven</button>` : `<button class="btn klein" data-markeer="${esc(g)}|${esc(x.id)}">gegeven</button>`}</div></div>`; }).join('')}</div>`;
  return h;
}

/* ---------- rooster ---------- */
function viewRooster() {
  const rows = [...S.rooster].sort((a, b) => a.dag - b.dag || minuten(a.start) - minuten(b.start));
  const opties = alleGroepen();
  let h = `<div class="kop"><div><h1>Rooster</h1><div class="sub">Elke week hetzelfde. Een losse uitval zet je op de dag zelf met "valt uit".</div></div></div>`;
  h += `<div class="kaart scroll"><table><tr><th>Dag</th><th>Van</th><th>Tot</th><th>Groep</th><th>Leergang</th><th>Lokaal</th><th></th></tr>${rows.length ? rows.map(u => `<tr><td>${esc(DAGLANG[u.dag])}</td><td class="num">${esc(u.start)}</td><td class="num">${esc(u.eind)}</td><td><b>${esc(u.groep)}</b></td><td>${esc(lgNaam(leergangVan(u.groep)))}</td><td>${esc(u.lokaal || '')}</td><td><button class="btn klein rood" data-weg="${esc(u.id)}">weg</button></td></tr>`).join('') : '<tr><td colspan="7" class="leeg">Nog geen lesuren.</td></tr>'}</table></div>`;
  const zv = zVastRooster();
  if (zv.length) h += `<div class="kaart"><h2>Uit Zermelo</h2><p class="lead">Deze muzieklessen staan in je Zermelo-rooster. Neem ze over als vast rooster; je voortgang per groep blijft staan.</p><div class="scroll"><table><tr><th>Dag</th><th>Van</th><th>Tot</th><th>Groep</th><th>Lokaal</th></tr>${zv.map(u => `<tr><td>${esc(DAGLANG[u.dag])}</td><td class="num">${esc(u.start)}</td><td class="num">${esc(u.eind)}</td><td><b>${esc(u.groep)}</b>${leergangVan(u.groep) ? '' : ' <span class="chip rood">geen leergang</span>'}</td><td>${esc(u.lokaal)}</td></tr>`).join('')}</table></div><div class="knoppen" style="margin-top:.6rem"><button class="btn hoofd" data-zovernemen="">Overnemen als vast rooster</button></div></div>`;
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
  return `<div class="srij ${laat ? 'laat' : ''} ${af ? 'af' : ''}"><span class="dt">${esc(fmtD(i.d))}${i.tot ? ' – ' + esc(fmtD(i.tot)) : ''}${i.tijd ? '<br>' + esc(i.tijd) : ''}</span><div>${i.taak ? `<label class="chk"><input type="checkbox" data-sdone="${esc(i.id)}" ${af ? 'checked' : ''}><span>${esc(i.titel)}</span></label>` : `<b style="font-family:var(--lees)">${esc(i.titel)}</b>`}${i.info ? `<div class="vorige" style="border:0;padding:0">${esc(i.info)}</div>` : ''}${S.sectieNotitie[i.id] ? `<div class="vorige">✎ ${esc(S.sectieNotitie[i.id])}</div>` : ''}</div></div>`;
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
  <div class="kaart"><h2>Pauzes</h2><p class="lead">${(zPauzes() || { vast: [] }).vast.length ? 'Uit je rooster in Zermelo: ' + esc(zPauzes().vast.map(p => hm(p.van) + '–' + hm(p.tot)).join(', ')) + '.' : ZC ? 'In je rooster vond Lesdag geen vaste pauzes.' : 'Zodra je Zermelo-link er staat, haalt Lesdag je pauzes uit je rooster.'} Lesdag houdt ze vrij: er komen geen taken in, en het Nu-scherm laat dan niets over werk zien. Valt een pauze weg (pauzedienst, koor, Sing-In), dan houdt Lesdag later op de dag een rustblok vrij. Nooit in een les.</p>
    <details class="meer" style="margin-top:.6rem" ${(S.pauzes || []).length ? 'open' : ''}><summary>Kloppen ze niet? Zelf invullen (gaat voor het rooster)</summary>
    <form class="form" id="pzForm" style="margin-top:.6rem">${(S.pauzes || []).concat([{ van: '', tot: '' }]).map((p, i) => `<div class="rij"><label>Van<input type="time" name="van" value="${p.van ? esc(p.van.padStart(5, '0')) : ''}"></label><label>Tot<input type="time" name="tot" value="${p.tot ? esc(p.tot.padStart(5, '0')) : ''}"></label>${p.van ? `<button class="btn klein" type="button" data-pzweg="${i}">weg</button>` : ''}</div>`).join('')}
    <div class="knoppen"><button class="btn hoofd" type="submit">Pauzes opslaan</button></div></form></details></div>
  <div class="kaart"><h2>Magister</h2><p class="lead">Lesdag kijkt niet in Magister en tikt er niets in; een open koppeling is er niet. Lesdag onthoudt per les de presentie, het huiswerk en het logboek, zet de tekst klaar en opent Magister met één tik. Een oker stip op een les: er moet nog iets in Magister. Groen: de les is rond.</p>
    <div class="knoppen" style="margin-top:.6rem"><button class="btn mag" data-kompas="">Kompas naast Magister</button><a class="btn" href="${esc(MAGURL())}" target="magister" rel="noopener">Open Magister</a></div>
    <p class="sub" style="margin-top:.5rem">Klassenlijsten: ${rooGroepen().map(g => esc(g) + ' ' + ((S.beoord.lijsten[g] || []).length || 'nog niet')).join(' · ') || 'nog geen rooster'}. Plakken doe je bij Groepen.</p></div>
  <div class="kaart"><h2>Jarige collega's</h2><p class="lead">Plak de verjaardagen van het intranet: één collega per regel met de datum, bijvoorbeeld "12 november Jan Jansen". Lesdag haalt daar zelf niets op. De lijst staat alleen op dit apparaat. Op de dag zelf staat de collega bij Opstarten, met een knop voor een felicitatie in Outlook.</p>
    <textarea id="colLijst" rows="6" style="margin-top:.6rem" placeholder="12 november Jan Jansen">${esc((AP.collegas || []).map(c => mdTekst(c.md) + ' ' + c.naam + (c.mail ? ' ' + c.mail : '')).join('\n'))}</textarea>
    <div class="knoppen" style="margin-top:.5rem"><button class="btn hoofd" data-colopslaan="">Opslaan op dit apparaat</button><a class="btn" href="https://web.csgpm.nl/home/index.php" target="_blank" rel="noopener">Intranet openen</a></div>
    <p class="sub" style="margin-top:.5rem">${(AP.collegas || []).length ? `${AP.collegas.length} collega's op dit apparaat.` : 'Nog geen lijst.'}</p></div>
  <div class="kaart"><h2>Gegevens</h2><p class="lead">Een kopie maken of terugzetten. Handig bij een ander apparaat zonder inloggen. Verjaardagen, absenten en logboeknotities gaan niet mee: die blijven op dit apparaat.</p><div class="knoppen"><button class="btn" data-export="">Kopie downloaden</button><label class="btn">Kopie terugzetten<input type="file" id="imp" accept="application/json" hidden></label></div></div>
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
function startLes(uurId, s, bord) { // bord: dit venster is het digibord, de regie zit in het andere venster
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
  let slides = LESMODUS.bouwSlides(l, { groep: x.u.groep, lgNaam: lgNaam(x.item.lg), lokaal: x.u.lokaal, toets: t ? t.naam + ' · ' + (t.waar || '') : '', thuis: th, vorige: vor && vor.st.n ? vor.st.n : '', benodigd: klaarLijst(s, l), materiaalHtml });
  if (bord) slides = slides.filter(y => y.k !== 'klaar'); // jouw kaart hoort niet op het bord
  LES = { x, l, s, slides, i: 0, left: 0, tot: 0, timer: null, notities: false, keuze: x.half ? 'gegeven' : 'gegeven', begin: Date.now(), bord: !!bord };
  $('#les').hidden = false; document.body.style.overflow = 'hidden'; waak(true); toonSlide();
}
function toonSlide() {
  const P = LES; const sl = P.slides[P.i]; stopTimer();
  const body = sl.k === 'af' ? (P.bord ? `<p class="eyebrow">${esc(P.x.u.groep)}</p><h1>Tot de volgende les</h1>` : afrondenHtml()) : sl.h;
  const soort = sl.soort || sl.k; const kl = LESMODUS.SOORT[sl.soort];
  const fasen = P.slides.filter(x => x.k === 'fase'); const fi = fasen.indexOf(sl);
  if (sl.min) { P.left = sl.min * 60; P.tot = sl.min * 60; } else { P.left = 0; P.tot = 0; }
  $('#les').className = 'les s-' + soort; $('#les').style.setProperty('--c', kl ? kl.kleur : '#5B247F'); $('#les').style.setProperty('--z', kl ? kl.zacht : '#d8b8ff');
  $('#les').innerHTML = `<div class="lkop"><b>${esc(P.x.u.groep)}</b><span>${esc(P.x.u.start)}–${esc(P.x.u.eind)}${P.x.u.lokaal ? ' · ' + esc(P.x.u.lokaal) : ''}</span><span class="sp"></span><span class="stip">${P.slides.map((x, j) => `<i class="${j === P.i ? 'nu' : j < P.i ? 'af' : ''} ${x.k}" style="${x.soort && LESMODUS.SOORT[x.soort] ? '--s:' + LESMODUS.SOORT[x.soort].kleur : ''}"></i>`).join('')}</span><span class="klok" id="klok">${klok()}</span></div>
  <div class="slide ${sl.docent === true ? 'docentkaart' : ''}">${body}</div>
  ${sl.k === 'fase' && sl.min ? timerHtml() : ''}
  <div class="notities ${P.notities && sl.docent && sl.docent !== true ? 'open' : ''}" id="notities">${sl.docent && sl.docent !== true && !P.bord ? `<b>Docent</b> ${esc(sl.docent)}` : ''}</div>
  <div class="lbalk"><button data-l="vorige" aria-label="Vorige">‹</button><button data-l="volgende" aria-label="Volgende">›</button><span class="waar">${sl.k === 'fase' ? `fase ${fi + 1} van ${fasen.length}` : sl.k === 'klaar' ? 'jouw kaart' : sl.k === 'welkom' ? 'welkom' : sl.k === 'doel' ? 'lesdoel' : sl.k === 'check' ? 'check' : sl.k === 'id' ? 'rode draad' : sl.k === 'thuis' ? 'thuis' : 'afronden'}</span>${sl.min ? `<button class="timer" data-l="timer" id="tbtn">${P.timer ? 'pauze' : 'start'} timer</button>` : ''}<span class="sp"></span>${sl.docent && sl.docent !== true && !P.bord ? `<button data-l="notities" aria-pressed="${P.notities}">notities</button>` : ''}<button data-l="scherm">volledig scherm</button>${sl.k !== 'af' && !P.bord ? '<button class="af" data-l="naaraf">les afronden</button>' : ''}<button data-l="sluit">sluiten</button></div>`;
  if (sl.min) timer(true);
  bordZeg();
}
function klok() { const d = new Date(); return d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); }
function timerHtml() { return `<div class="timerhoek">${LESMODUS.timerRing(LES.left, LES.tot)}</div>`; }
function afrondenHtml() {
  const P = LES;
  return `<div class="afronden"><p class="eyebrow">Les afronden · ${esc(P.x.u.groep)}</p><h2>${esc(P.l.titel || '')}</h2>
  <div class="keuzes">${[['gegeven', 'Gegeven'], ['half', 'Half af, volgende keer verder'], ['niet', 'Niet gegeven']].map(([k, n]) => `<button data-keuze="${k}" aria-pressed="${P.keuze === k}">${n}</button>`).join('')}</div>
  <label style="font-family:var(--lees);color:#cbb8db">Notitie voor de volgende les<textarea id="lnot">${esc((status(P.x.u.groep, P.x.item.id) || {}).n || '')}</textarea></label>
  <div class="keuzes"><button data-l="opslaan">Opslaan en naar de volgende les</button></div></div>`;
}
function pad(sec) { const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
function stopTimer() { if (LES && LES.timer) { clearInterval(LES.timer); LES.timer = null; } }
function timer(auto) {
  const P = LES; if (!P) return;
  if (P.timer && !auto) { stopTimer(); const b = $('#tbtn'); if (b) b.textContent = 'start timer'; bordZeg(); return; }
  if (P.timer) return;
  const r = 54, c = 2 * Math.PI * r;
  P.timer = setInterval(() => {
    P.left--; const el = $('#tl'); const ring = $('#ring'); const k = $('#klok'); if (k) k.textContent = klok();
    if (el) el.textContent = pad(Math.max(0, P.left));
    if (ring) { const v = ring.querySelector('.voort'); if (v) v.style.strokeDashoffset = c * (1 - Math.max(0, Math.min(1, P.left / (P.tot || 1)))); if (P.left <= 0) ring.classList.add('over'); else if (P.left <= 60) ring.classList.add('bijna'); }
    if (P.left === 120 && P.tot >= 300) tril(); // twee minuten voor het eind: alleen voelbaar op de tablet
    bordZeg();
  }, 1000);
  const b = $('#tbtn'); if (b) b.textContent = 'pauze timer'; bordZeg();
}
function sluitLes() { const bord = LES && LES.bord; stopTimer(); LES = null; waak(false); if (bord) { rgStuur('dicht'); window.close(); } $('#les').hidden = true; document.body.style.overflow = ''; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); render(); }
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
  if (e.target.id === 'palet') { paletDicht(); return; }
  // alleen knoppen: het planformulier en de vinkjes hebben ook data-dag, maar een klik daarin mag de pagina niet opnieuw tekenen
  const b = e.target.closest('button,[data-week],[data-magopen],[data-felic]'); if (!b) return;
  const D = b.dataset;
  if (D.terug != null) { terugZetten(); return; }
  if (D.magopen) { const k = D.magopen; setTimeout(() => { GEOPEND[k] = 1; render(); }, 0); return; } // de link opent Magister zelf; daarna is Gemeld de volgende stap
  if (D.felic) { AP.felic[D.felic] = 1; apBewaar(); setTimeout(render, 0); return; } // de link opent een nieuwe mail in Outlook; versturen doe je daar zelf
  if (D.pal != null) { paletKies(+D.pal); return; }
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
  if (D.palet != null) { paletOpen(); return; }
  if (D.stap) { nuStap(+D.stap); return; }
  if (D.kijk != null) { nuKijk = D.kijk || null; if (route.naam !== 'nu') location.hash = 'nu'; else render(); return; }
  if (D.bord) { const [u, s] = D.bord.split('|'); bordOpen(u, s); return; }
  if (D.rg) { if (D.rg === 'ga') rgStuur('ga', { i: +D.i }); else if (D.rg === 'sluit') { rgStuur('sluit'); RG = null; location.hash = 'nu'; } else rgStuur(D.rg); return; }
  if (D.mag) { const i = D.mag.indexOf('|'); const w = D.mag.slice(0, i), k = D.mag.slice(i + 1); const terug = foto();
    if (w === 'p') { magZet(k, { p: Date.now() }); delete AP.weg[k]; apBewaar(); bewaar(); toast('Presentie gemeld', terug); }
    else if (w === 'h') { S.magHw = S.magHw || {}; S.magHw[k] = Date.now(); bewaar(); toast('Huiswerk staat in Magister', terug); }
    else if (w === 'l') { magZet(k, { l: Date.now() }); delete AP.log[k]; apBewaar(); bewaar(); toast('Logboek staat in Magister; de notities zijn van dit apparaat weg', terug); }
    return; }
  if (D.magcopy) { const P = D.magcopy.split('|');
    if (P[0] === 'hw' || P[0] === 'hwk') { const x = uurOp(P[1], P.slice(2).join('|')); if (!x || !x.item) return; const k = kopieer(hwTekst(x)); GEOPEND[hwKey(x)] = 1;
      if (P[0] === 'hw') window.open(MAGURL(), 'magister'); render(); k.then(ok => toast(ok ? 'Huiswerk gekopieerd. Plak het in Magister, daarna Staat erin.' : 'Kopiëren lukte niet. De tekst staat hier in Lesdag.')); }
    else { const n = (AP.log[P.slice(1, -1).join('|')] || [])[+P[P.length - 1]]; if (n) kopieer(n.t).then(ok => toast(ok ? 'Notitie gekopieerd' : 'Kopiëren lukte niet')); }
    return; }
  if (D.afw) { const i = D.afw.lastIndexOf('|'); const k = D.afw.slice(0, i), id = D.afw.slice(i + 1); const L = AP.weg[k] = AP.weg[k] || []; const j = L.indexOf(id);
    if (j < 0) L.push(id); else L.splice(j, 1); apBewaar(); // meteen zichtbaar, zonder het scherm opnieuw te tekenen
    if (route.naam === 'kompas') { render(); return; }
    b.setAttribute('aria-pressed', j < 0); document.querySelectorAll('[data-presn]').forEach(el => { if (el.dataset.presn === k) el.textContent = L.length ? ' · ' + L.length + ' absent' : ''; }); return; }
  if (D.log) { const P = D.log.split('|');
    if (P[0] === 'add') { const k = P.slice(1).join('|'); const ll = ($('#lgLl') || {}).value; const t = (($('#lgT') || {}).value || '').trim(); if (!ll || !t) { toast('Kies een leerling en schrijf de notitie'); return; }
      (AP.log[k] = AP.log[k] || []).push({ ll, t, op: Date.now() }); apBewaar(); render(); toast('Notitie bewaard op dit apparaat'); }
    else { const terug = foto(); const k = P.slice(1, -1).join('|'); (AP.log[k] || []).splice(+P[P.length - 1], 1); if (!(AP.log[k] || []).length) delete AP.log[k]; apBewaar(); render(); toast('Notitie weg', terug); }
    return; }
  if (D.kompas != null) { kompasOpen(); return; }
  if (D.klasopen) { groepKeuze = D.klasopen; klasOpen = D.klasopen; if (route.naam !== 'groepen') location.hash = 'groepen'; else render(); return; }
  if (D.klas) { const i = D.klas.indexOf('|'); const w = D.klas.slice(0, i), g = D.klas.slice(i + 1); klasOpen = null;
    if (w === 'opslaan') { const terug = foto(); const t = lijstOpslaan(g, $('#bmLijst').value); bewaar(); toast(t, terug); } else render(); return; }
  if (D.colopslaan != null) { const terug = foto(); AP.collegas = collegaParse(($('#colLijst') || {}).value || ''); apBewaar(); render(); toast(`${AP.collegas.length} collega's opgeslagen op dit apparaat`, terug); return; }
  if (D.rgaf) { const uid = decodeURIComponent(route.arg[0] || ''); const s = route.arg[1] || vandaag(); const x = (planning(s, s)[s].uren || []).find(y => y.u.id === uid);
    if (!x || !x.item) { toast('Deze les staat niet meer op de planning'); return; }
    const terug = foto(); rondAf(s, x, D.rgaf, ($('#rgNot') || {}).value); bewaar(true); rgStuur('sluit'); RG = null; toast(x.u.groep + ' afgerond', terug); location.hash = 'nu'; return; }
  if (D.rondaf) { const [s, uid, keuze] = D.rondaf.split('|'); const x = (planning(s, s)[s].uren || []).find(y => y.u.id === uid);
    if (x && x.item) { const terug = foto(); rondAf(s, x, keuze, ($('#nNot') || {}).value); nuKijk = null; bewaar(); toast(x.u.groep + ': ' + (keuze === 'gegeven' ? 'gegeven' : keuze === 'half' ? 'deels, volgende keer verder' : 'de les schuift door'), terug); } return; }
  if (D.aflater) { const terug = foto(); const [s, uid] = D.aflater.split('|'); (S.afLater[s] = S.afLater[s] || []).push(uid); nuKijk = null; bewaar(); toast('Komt terug in je volgende werkblok', terug); return; }
  if (D.rustweg) { const terug = foto(); S.rust[D.rustweg] = 'weg'; bewaar(); toast('Het rustblok is vrijgegeven', terug); return; }
  if (D.slot) { const terug = foto(); const [v, dag, van, tot] = D.slot.split('|'); const k = maakTaak(v, { dag, van, tot }); if (k) { bewaar(); toast(k.titel + ' staat op ' + fmtD(dag) + ' om ' + van, terug); } return; }
  if (D.later) { const terug = foto(); const [k, v] = D.later.split('|'); S.later[k] = v; bewaar(); toast(v === 'ok' ? 'Genoteerd' : 'Vandaag niet meer', terug); return; }
  if (D.klaarextra) { const terug = foto(); const [d, txt] = D.klaarextra.split('|'); (S.klaarExtra[d] = S.klaarExtra[d] || []).push(txt); bewaar(); toast('Staat op je klaarzetlijst', terug); return; }
  if (D.afsluiten) { const terug = foto(); const g = $('#gGoed'); if (g) S.goed[D.afsluiten] = g.value.trim() || undefined; S.afgesloten[D.afsluiten] = true; nuKijk = null; bewaar(); toast('Morgen staat klaar. Fijne avond.', terug); return; }
  if (D.heropen) { delete S.afgesloten[D.heropen]; bewaar(); return; }
  if (D.taakstart) { const k = (S.taken || []).find(k => k.id === D.taakstart); if (k) { k.start = Date.now(); bewaar(); } return; }
  if (D.pzweg != null) { const terug = foto(); S.pauzes.splice(+D.pzweg, 1); bewaar(); toast('Pauze weg', terug); return; }
  if (D.ag) { const i = D.ag.indexOf('|'); const d = D.ag.slice(0, i); agSel[d] = D.ag.slice(i + 1); dagKeuze = d; if (route.naam !== 'vandaag') location.hash = 'vandaag'; else { render(); if (innerWidth < 820) { const pn = $('.agpaneel'); if (pn) pn.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); } } return; }
  if (D.ontplan) { const terug = foto(); const k = (S.taken || []).find(k => k.id === D.ontplan); if (k) { agSel[k.plan.dag] = ''; delete k.plan; } bewaar(); toast('Uit de agenda gehaald; de taak staat nog in je lijst', terug); return; }
  if (D.dag != null && route.naam !== 'vandaag') { dagKeuze = D.dag; location.hash = 'vandaag'; return; }
  if (D.dag != null) { dagKeuze = D.dag; render(); return; }
  if (D.week != null) { weekKeuze = D.week; render(); return; }
  if (D.start != null) { const [u, s] = D.start.split('|'); startLes(u || null, s || vandaag()); return; }
  if (D.uitval) { const terug = foto(); const [s, u] = D.uitval.split('|'); (S.uitval[s] = S.uitval[s] || []).push(u); bewaar(); toast('Les valt uit; de volgende les schuift door', terug); return; }
  if (D.uitvalterug) { const [s, u] = D.uitvalterug.split('|'); S.uitval[s] = (S.uitval[s] || []).filter(x => x !== u); bewaar(); return; }
  if (D.bewerk) { openBewerk(D.bewerk); return; }
  if (D.sluit != null) { sluit(); return; }
  if (D.herstel != null) { const terug = foto(); delete S.les[$('#drawer').dataset.id]; sluit(); bewaar(); toast('De les staat weer zoals in de leergang', terug); return; }
  if (D.groep) { groepKeuze = D.groep; klasOpen = null; render(); return; }
  if (D.markeer) { const terug = foto(); const [g, id] = D.markeer.split('|'); S.voortgang[g] = S.voortgang[g] || {}; S.voortgang[g][id] = Object.assign({}, status(g, id), { st: 'gegeven', d: vandaag() }); bewaar(); toast('Op gegeven gezet', terug); return; }
  if (D.reset) { const terug = foto(); const [g, id] = D.reset.split('|'); if (S.voortgang[g]) delete S.voortgang[g][id]; bewaar(); toast('Weer niet gegeven', terug); return; }
  if (D.opplan) { const terug = foto(); const n = opPlanning(D.opplan); bewaar(); toast(`${n} lessen op gegeven gezet`, terug); return; }
  if (D.opplanalle != null) { const terug = foto(); rooGroepen().forEach(opPlanning); bewaar(); toast('Groepen staan op de planning', terug); return; }
  if (D.taakweg) { const terug = foto(); S.taken = (S.taken || []).filter(k => k.id !== D.taakweg); bewaar(); toast('Taak verwijderd', terug); return; }
  if (D.weg) { const terug = foto(); S.rooster = S.rooster.filter(u => u.id !== D.weg); bewaar(); toast('Lesuur verwijderd', terug); return; }
  if (D.salles != null) { sAlles = !sAlles; render(); return; }
  if (D.login != null) { M365.login(); return; }
  if (D.logout != null) { M365.logout(); return; }
  if (D.sync != null) { await syncNu(true); return; }
  if (D.zophalen != null) { await zOphalen(true); return; }
  if (D.zweg != null) { const terug = foto(); delete S.zermeloToken; ZC = null; try { localStorage.removeItem('lesdag-zermelo'); } catch (e) {} bewaar(); toast('Zermelo-link verwijderd', terug); return; }
  if (D.zovernemen != null) { const terug = foto(); const oud = S.rooster; S.rooster = zVastRooster().map(u => { const o = oud.find(x => +x.dag === u.dag && x.start === u.start && x.groep === u.groep); return Object.assign({ id: o ? o.id : 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }, u); }); bewaar(); toast('Rooster overgenomen uit Zermelo', terug); return; }
  if (D.export != null) { const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'lesdag-' + vandaag() + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); return; }
  if (D.zoek != null) { zoek(); return; }
  if (D.kies != null) { kiesBestand(+D.kies); return; }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.sdone) { if (t.checked) S.sectieAf[t.dataset.sdone] = true; else delete S.sectieAf[t.dataset.sdone]; bewaar(); }
  if (t.dataset.taakaf) { const k = (S.taken || []).find(k => k.id === t.dataset.taakaf);
    if (k && t.checked && k.start) { const echt = (Date.now() - k.start) / 60000; const basis = k.min || SCHAT[k.bron] || 15; if (echt >= 2 && echt <= 240) (S.duur[k.bron] = S.duur[k.bron] || []).push(Math.round(echt / basis * 100) / 100); delete k.start; } // eigen tempo leren
    if (k) { k.af = t.checked; k.afOp = t.checked ? vandaag() : undefined; if (k.sectieId) { if (t.checked) S.sectieAf[k.sectieId] = true; else delete S.sectieAf[k.sectieId]; } if (k.koorId) { if (t.checked) S.koorAf[k.koorId] = true; else delete S.koorAf[k.koorId]; } if (k.dagTaak) { const dd = S.dagTaken[k.dagTaak.dag] = S.dagTaken[k.dagTaak.dag] || {}; if (t.checked) dd[k.dagTaak.key] = true; else delete dd[k.dagTaak.key]; } } bewaar(); }
  if (t.dataset.koorvink) { if (t.checked) S.koorAf[t.dataset.koorvink] = true; else delete S.koorAf[t.dataset.koorvink]; bewaar(); }
  if (t.dataset.dagtaak) { const d = t.dataset.dag; S.dagTaken[d] = S.dagTaken[d] || {}; if (t.checked) S.dagTaken[d][t.dataset.dagtaak] = true; else delete S.dagTaken[d][t.dataset.dagtaak]; bewaar(); }
  if (t.id === 'gGoed') { S.goed[vandaag()] = t.value.trim() || undefined; bewaar(true); }
  if (t.id === 'pK') { const n = $('#pNieuw'); if (n) n.hidden = !!t.value; }
  if (t.id === 'gLg') { S.groepLeergang[t.dataset.g] = t.value; bewaar(); }
  if (t.id === 'imp' && t.files[0]) { const terug = foto(); t.files[0].text().then(txt => { const d = JSON.parse(txt); if (d && d.v) { S = Object.assign(nieuweStaat(), d); bewaar(); toast('Kopie teruggezet', terug); } }).catch(() => toast('Dit bestand kan ik niet lezen')); }
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
    if (!v && !$('#pT').value.trim()) { toast('Geef de taak een naam'); return; }
    const k = maakTaak(v, { dag, van, tot }, $('#pT').value.trim(), $('#pB').value);
    if (k) { agSel[dag] = 'taak:' + k.id; bewaar(); toast(`${k.titel} staat op ${fmtD(dag)} om ${van}`); }
    return;
  }
  if (e.target.id === 'pzForm') { const T = [...e.target.querySelectorAll('[name=tot]')].map(x => x.value); S.pauzes = [...e.target.querySelectorAll('[name=van]')].map((x, i) => ({ van: x.value.replace(/^0/, ''), tot: (T[i] || '').replace(/^0/, '') })).filter(p => p.van && p.tot && minuten(p.tot) > minuten(p.van)); bewaar(); toast('Pauzes opgeslagen'); return; }
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
  if (PAL) { if (e.key === 'Escape') { e.preventDefault(); paletDicht(); } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); PAL.i = Math.max(0, Math.min(PAL.L.length - 1, PAL.i + (e.key === 'ArrowDown' ? 1 : -1))); paletToon(); } else if (e.key === 'Enter') { e.preventDefault(); paletKies(PAL.i); } return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !LES) { e.preventDefault(); paletOpen(); return; }
  if (route.naam === 'nu' && !LES && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && !$('#drawer').classList.contains('open')) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); nuStap(e.key === 'ArrowRight' ? 1 : -1); return; }
    if (e.key === 'Escape' && nuKijk) { nuKijk = null; render(); return; } }
  if (route.naam === 'regie' && !LES && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { // de presenter stuurt pijltjes naar het venster dat voorop staat
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); rgStuur('volgende'); return; }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); rgStuur('vorige'); return; }
    if (e.key === 't') { rgStuur('timer'); return; } }
  if (LES) {
    if (e.target.tagName === 'TEXTAREA') return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); if (LES.i < LES.slides.length - 1) { LES.i++; toonSlide(); } }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); if (LES.i > 0) { LES.i--; toonSlide(); } }
    else if (e.key === 't') timer();
    else if (e.key === 'n' && !LES.bord) { LES.notities = !LES.notities; const n = $('#notities'); if (n && n.textContent.trim()) n.classList.toggle('open', LES.notities); const b = document.querySelector('#les [data-l="notities"]'); if (b) b.setAttribute('aria-pressed', LES.notities); }
    else if (e.key === 'f') { const el = $('#les'); if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {}); else if (document.exitFullscreen) document.exitFullscreen().catch(() => {}); }
    else if (e.key === 'Escape' && !document.fullscreenElement) sluitLes();
    return;
  }
  if (e.key === 'Escape') sluit();
});
function leesRoute() { const [n, ...a] = location.hash.replace('#', '').split('/'); route = { naam: ROUTES.some(r => r[0] === n) || ['beoordelen', 'regie', 'bord', 'kompas'].includes(n) ? n : 'nu', arg: a }; }
window.addEventListener('hashchange', () => { leesRoute(); sluit();
  if (route.naam === 'bord' && !LES) { document.body.classList.add('bordvenster'); startLes(decodeURIComponent(route.arg[0] || ''), route.arg[1] || vandaag(), true); return; } // opent de browser het bord in hetzelfde venster
  render(); window.scrollTo(0, 0); });

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
function bmParse(txt) { // Magister: één leerling per regel, kolommen met tabs; nummers en klascodes vallen weg. Een geboortedatum (dd-mm-jjjj of jjjj-mm-dd)
  // gaat apart mee als gd, alleen dag en maand: voor de jarigen, en alleen op dit apparaat
  return String(txt).split(/\r?\n/).map(r => { let gd = '';
    r = r.replace(/(^|\s)(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4}|\d{2})(?=\s|$)/g, (m, voor, d, mm) => { gd = gd || mdUit(+mm, +d); return voor; })
      .replace(/(^|\s)(\d{4})-(\d{2})-(\d{2})(?=\s|$)/g, (m, voor, j, mm, d) => { gd = gd || mdUit(+mm, +d); return voor; });
    const naam = r.split('\t').map(x => x.trim()).filter(x => x && !/^\d+$/.test(x) && !/^[a-z]{0,2}\d[a-z0-9]{0,3}$/i.test(x)).join(' ').replace(/\s+/g, ' ').trim();
    return { naam, gd }; })
    .filter(x => x.naam && !/^(naam|leerling|leerlingen|klas|groep)\b/i.test(x.naam) && !/\b(roepnaam|voornaam|achternaam|tussenvoegsel|stamnr|stamnummer|leerlingnummer|geboortedatum)\b/i.test(x.naam)); // kopregels
}
function lijstOpslaan(g, txt) { // namen in S.beoord.lijsten (apparaat en eigen OneDrive), verjaardagen alleen in AP.jarig
  const oud = S.beoord.lijsten[g] || []; const rij = bmParse(txt);
  S.beoord.lijsten[g] = rij.map((x, i) => oud.find(o => o.naam === x.naam) || { id: 'l' + Date.now().toString(36) + i, naam: x.naam });
  let nj = 0; rij.forEach((x, i) => { if (x.gd) { AP.jarig[S.beoord.lijsten[g][i].id] = x.gd; nj++; } }); apBewaar();
  return `${rij.length} leerlingen opgeslagen${nj ? `, ${nj} verjaardagen op dit apparaat` : ''}`;
}
function lijstKaart(g, lijst, waar) { // waar: 'bm' (beoordelen) of 'klas' (Groepen)
  const op = waar === 'klas' ? `data-klas="opslaan|${esc(g)}"` : 'data-bm="lijstopslaan"', dicht = waar === 'klas' ? `data-klas="dicht|${esc(g)}"` : 'data-bm="lijstdicht"';
  return `<div class="kaart bm"><h2>Klassenlijst ${esc(g)}</h2><p class="lead">Kopieer de lijst uit Magister en plak hem hieronder, één leerling per regel. Nummers en klascodes haalt Lesdag er zelf uit. Neem de kolom met de geboortedatum mee als je de jarigen wilt zien: Lesdag bewaart daarvan alleen dag en maand, en alleen op dit apparaat. De namen blijven op dit apparaat en in je eigen OneDrive.</p>
    <textarea id="bmLijst" rows="14" style="width:100%;margin:.6rem 0">${esc(lijst.map(x => x.naam).join('\n'))}</textarea>
    <div class="knoppen"><button class="btn hoofd" ${op}>Opslaan</button>${lijst.length || waar === 'klas' ? `<button class="btn" ${dicht}>Annuleren</button>` : ''}</div></div>`;
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
  if (!lijst.length || bmLijstOpen) return h + lijstKaart(g, lijst, 'bm');
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
  if (D.bm === 'lijstopslaan') { const terug = foto(); const t = lijstOpslaan(g, $('#bmLijst').value); bmLijstOpen = false; bewaar(); toast(t, terug); return; }
  if (D.bm === 'export') { bmExport(m, g); return; }
  if (D.bm === 'loten') { const terug = foto(); T.volgorde = vol.map(id => [Math.random(), id]).sort((a, c) => a[0] - c[0]).map(x => x[1]); bmSel = null; bewaar(); toast('Volgorde geloot', terug); return; }
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
setInterval(() => { const a = document.activeElement; if (!LES && !PAL && ['vandaag', 'nu', 'kompas'].includes(route.naam) && !document.hidden && !(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) && !document.querySelector('#main details[open]')) render(); }, 60000); // het scherm volgt de klok, niet tijdens typen
// presentie na een kwartier nog niet gemeld: één keer trillen. Alleen tijdens een les, dus nooit in een pauze of 's avonds; niet op het bord
setInterval(() => {
  if (document.hidden || LES || !B || document.body.classList.contains('bordvenster')) return; const s = vandaag(); const nu = nuMin(); const p = planning(s, s)[s]; if (p.reden) return;
  const x = p.uren.find(y => magTelt(s, y) && minuten(y.u.start) + 15 <= nu && nu < minuten(y.u.eind)); if (!x) return; const m = magVan(s, x); if (m.p || m.tril) return;
  magZet(magKey(s, x), { tril: 1 }); bewaar(true); tril1(); if (['nu', 'kompas', 'regie'].includes(route.naam) && !PAL) render();
}, 20000);
// een tweede venster (bord, kompas) bewaarde iets: neem het over, zodat dit venster het niet overschrijft
window.addEventListener('storage', e => {
  if (e.key === LS_KEY && e.newValue) { try { S = Object.assign(nieuweStaat(), JSON.parse(e.newValue)); } catch (x) { return; } }
  else if (e.key === AP_KEY) AP = laadAP(); else return;
  const a = document.activeElement; if (B && !LES && !PAL && !(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) render();
});
let veeg = null; // vegen over de nu-kaart: naar het vorige of volgende moment
document.addEventListener('pointerdown', e => { veeg = e.pointerType === 'touch' && route.naam === 'nu' && e.target.closest('.nu-kaart') && !e.target.closest('input,textarea,select') ? { x: e.clientX, y: e.clientY } : null; });
document.addEventListener('pointerup', e => { if (!veeg) return; const dx = e.clientX - veeg.x, dy = e.clientY - veeg.y; veeg = null; if (Math.abs(dx) > 70 && Math.abs(dy) < 50) nuStap(dx < 0 ? 1 : -1); });
document.addEventListener('input', e => { if (e.target.id === 'palQ' && PAL) { PAL.q = e.target.value; PAL.i = 0; paletToon(); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && (LES || route.naam === 'regie')) waak(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden || LES) return; if (M365.account) syncNu(false); if (S.zermeloToken && zProxy() && (!ZC || Date.now() - ZC.opgehaald > 30 * 60000)) zOphalen(false); });

/* ?diag in het adres: een samenvatting in de console om tekenproblemen op te sporen. Alleen maten, soorten blokken en tijden:
   geen namen, titels of de Zermelo-link. */
function diag() {
  const els = [...document.querySelectorAll('body *')].map(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : ''), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top),
      laag: [cs.position === 'static' ? '' : cs.position, cs.transform !== 'none' ? 'transform' : '', cs.filter !== 'none' ? 'filter' : '', (cs.backdropFilter || cs.webkitBackdropFilter || 'none') !== 'none' ? 'backdrop' : '', cs.opacity !== '1' ? 'opacity ' + cs.opacity : ''].filter(Boolean).join(' ') }; });
  const s = vandaag(); const p = planning(s, s)[s]; const A = dagItems(s, p); const m = moment(s, p, A, nuMin());
  console.log('Lesdag diag ' + JSON.stringify({ venster: [innerWidth, innerHeight, devicePixelRatio], pagina: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], route: route.naam, moment: m.m,
    items: A.items.map(it => [it.soort, hm(it.van), hm(it.tot), it.baan || 0, it.banen || 1]), rooster: S.rooster.length, zermelo: !!ZC, pauzes: (S.pauzes || []).length, taken: (S.taken || []).length,
    vreemd: els.filter(e => e.w > 3000 || e.h > 3000 || Math.abs(e.x) > 3000 || Math.abs(e.y) > 20000).slice(0, 10), groot: els.slice().sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 8), lagen: els.filter(e => /fixed|sticky|transform|filter|backdrop/.test(e.laag)).slice(0, 12) }));
}

/* ---------- start ---------- */
(async function start() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {}); // eerst, zodat een nieuwe versie ook binnenkomt als er verderop iets misgaat
  S = laadLokaal(); leesRoute();
  (new URLSearchParams(location.search).get('zonder') || '').split(',').filter(Boolean).forEach(z => document.body.classList.add('zonder-' + z.trim())); // ?zonder=dok,zij,kolom,kaart,balk: onderdelen uitzetten om een tekenfout te vinden
  if (!S.magVanaf) { S.magVanaf = vandaag(); bewaar(true); } // Magister-vakken tellen vanaf de eerste dag met deze versie, niet met terugwerkende kracht
  try { B = await (await fetch('data/basis.json', { cache: 'no-cache' })).json(); }
  catch (e) { $('#main').innerHTML = '<div class="kaart"><p>De leergangen kunnen niet geladen worden. Controleer de verbinding.</p></div>'; return; }
  try { BM = await (await fetch('data/beoordeling.json', { cache: 'no-cache' })).json(); } catch (e) { BM = []; }
  if (route.naam === 'bord') { // dit venster is het digibord
    document.body.classList.add('bordvenster'); startLes(decodeURIComponent(route.arg[0] || ''), route.arg[1] || vandaag(), true);
    window.addEventListener('pagehide', () => rgStuur('dicht')); if (!LES) render(); return; }
  render();
  if (/diag/.test(location.search)) setTimeout(diag, 800);
  try { const acc = await M365.init(); if (acc) await syncNu(false); else setSync('', M365.enabled() ? 'Niet ingelogd' : 'Op dit apparaat'); }
  catch (e) { console.warn(e); setSync('fout', 'Inloggen niet beschikbaar'); }
  if (S.zermeloToken && zProxy() && navigator.onLine && (!ZC || Date.now() - ZC.opgehaald > 30 * 60000 || ZC.van !== maandagVan(vandaag()))) zOphalen(false);
})().catch(e => { console.error(e); $('#main').innerHTML = `<div class="kaart"><h2>Lesdag start niet</h2><p class="lead">${esc(e && e.message)}</p></div>`; });
})();
