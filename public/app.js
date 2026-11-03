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
function nieuweStaat() { return { v: 1, updated: 0, rooster: [], voortgang: {}, les: {}, uitval: {}, sectieAf: {}, sectieNotitie: {}, sectieExtra: [], groepLeergang: {}, taken: [], dagTaken: {}, koorAf: {}, reclame: {}, reclameAf: {}, reclameExtra: [], uitgesteld: {}, afwezig: {}, ankers: {}, afwijkingen: [], beoord: { lijsten: {}, toetsen: {} } }; }
function laadLokaal() { try { const j = localStorage.getItem(LS_KEY); if (j) return Object.assign(nieuweStaat(), JSON.parse(j)); } catch (e) {} return nieuweStaat(); }
function bewaar(stil) {
  S.updated = Date.now();
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); opslagMelding(null); } catch (e) { opslagMelding(e); }
  if (M365.account) { clearTimeout(remoteT); setSync('bezig', 'Opslaan…'); remoteT = setTimeout(bewaarRemote, 1500); }
  if (!stil) render();
}
function opslagMelding(fout) { // zichtbaar zolang opslaan op dit apparaat mislukt: de wijzigingen staan dan alleen nog in het scherm en het logboek
  const el = $('#opslagfout'); if (!el) return; const was = !el.hidden; el.hidden = !fout; if (fout) { setSync('fout', 'Opslaan mislukt'); console.warn(fout); } else if (was && !M365.account) setSync('', 'Op dit apparaat');
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
function volgendeIndex(g) { const r = reeks(leergangVan(g)); const i = r.findIndex(x => !afgerond(status(g, x.id)) && !isVastAnker(g, x.id)); return i < 0 ? r.length : i; }
function vorigeNotitie(g, vanaf) {
  const r = reeks(leergangVan(g)); for (let i = vanaf - 1; i >= 0; i--) { const st = status(g, r[i].id); if (st.n) return { les: r[i], st }; if (st.st) return { les: r[i], st }; }
  return null;
}

function opPlanning(g) { // alle lessen vóór de huidige lesweek op 'gegeven'
  const lw = lesweekVan(vandaag()) || nextLesweek(); const r = reeks(leergangVan(g)); let n = 0;
  S.voortgang[g] = S.voortgang[g] || {};
  for (const x of r) if (x.w < lw && !S.voortgang[g][x.id]) { const y = (planBasis().slots[g] || []).find(y => y.w === x.w && y.li === x.li); if (y && isUitval(y.s, y.u)) continue; S.voortgang[g][x.id] = { st: 'gegeven', auto: true }; n++; }
  return n;
}
function nextLesweek() { const t = vandaag(); const k = B.kalender.weken.find(k => k.datum >= t); return k ? k.w : 99; }
const rooGroepen = () => [...new Set(S.rooster.map(u => u.groep))];
/* ---------- planning: welke les in welk lesuur ---------- */
function uurId(u) { return u.id; }
function urenOp(s) { const z = zUren(s); const d = dOf(s).getDay(); return (z || S.rooster.filter(u => +u.dag === d)).sort((a, b) => minuten(a.start) - minuten(b.start)); }
function isUitval(s, u) { return !!u.vervallen || !!(S.afwezig || {})[s] || (S.uitval[s] || []).includes(u.id); }

/* ---------- Zermelo: rooster ophalen via de eigen roosterproxy ---------- */
let ZC = (() => { try { return JSON.parse(localStorage.getItem('lesdag-zermelo') || 'null'); } catch (e) { return null; } })();
const zProxy = () => (window.LESDAG_CONFIG || {}).roosterProxy || '';
const zToken = link => { const m = String(link || '').match(/access_token=([A-Za-z0-9]+)/); return m ? m[1] : String(link || '').trim(); };
function nlTijd(dt) {
  const p = {}; new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(dt).forEach(x => { p[x.type] = x.value; });
  return { d: `${p.year}-${p.month}-${p.day}`, t: `${p.hour}:${p.minute}` };
}
function icsTijd(v) {
  v = String(v || '').trim();
  if (/Z$/.test(v)) {
    return nlTijd(new Date(Date.UTC(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8), +v.slice(9, 11), +v.slice(11, 13))));
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
/* Zermelo-API: de token kan meer dan de agendalink en staat daarom alleen op dit apparaat, niet in S (dus niet in OneDrive of een kopie). */
const Z_API = 'lesdag-zermelo-api';
const zApiToken = () => { try { return localStorage.getItem(Z_API) || ''; } catch (e) { return ''; } };
const zGekoppeld = () => !!(zApiToken() || S.zermeloToken);
const Z_SOORT = { lesson: 'Les', exam: 'Toets', activity: 'Activiteit', talk: 'Gesprek', meeting: 'Vergadering', interlude: 'Pauze', other: 'Afspraak', unknown: 'Afspraak' };
function zVanApi(a) {
  const b = nlTijd(new Date(a.start * 1000)), c = nlTijd(new Date(a.end * 1000));
  const vakken = a.subjects || [], groepen = a.groups || [];
  const kop = vakken.concat(groepen).join(' - ');
  return { uid: String(a.appointmentInstance || a.id), d: b.d, start: b.t, eind: c.t, summary: kop || a.remark || Z_SOORT[a.type] || 'Afspraak', loc: (a.locations || []).join(', '), desc: a.remark || '', vervallen: !!a.cancelled,
    api: true, vakken, groepen, soort: a.type || '', reden: a.changeDescription || '' };
}
async function zVraag(body) {
  const r = await fetch(zProxy(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d) throw new Error((d && d.fout) || 'Zermelo antwoordt ' + r.status);
  return d;
}
async function zKoppel(code) {
  if (!zProxy()) { toast('De roosterproxy staat nog niet in config.js'); return; }
  try {
    const d = await zVraag({ actie: 'koppel', code });
    localStorage.setItem(Z_API, d.token);
    await zOphalen(true);
  } catch (e) { console.warn(e.message); toast('Koppelen lukt niet: ' + e.message); }
  render();
}
async function zHaalApi(van) { // drie weken vanaf maandag, in seconden
  const d = await zVraag({ actie: 'afspraken', token: zApiToken(), van: Math.floor(new Date(van + 'T00:00').getTime() / 1000), tot: Math.floor(new Date(addD(van, 21) + 'T00:00').getTime() / 1000) });
  return d.afspraken.filter(a => !a.hidden).map(zVanApi);
}
const zMuziek = e => e.api ? e.vakken.some(v => /^(k?mu|muz|muziek)$/i.test(v)) : /(^|[^a-z])(k?mu|muz|muziek)([^a-z]|$)/i.test(e.summary + ' ' + e.desc);
function zGroep(e) {
  const txt = (e.api ? e.summary : e.summary + ' ' + e.desc).toLowerCase();
  const keuze = /(^|[^a-z])kmu([^a-z]|$)/.test(txt);
  for (const x of alleGroepen()) { const g = x.g.toLowerCase(); if (g.includes(' ')) continue; if (new RegExp('(^|[^a-z0-9])' + g + '([^a-z0-9]|$)').test(txt)) return keuze && /^h3/.test(g) ? 'kmu h3' : x.g; }
  const m = txt.match(/(^|[^a-z0-9])((?:[hvm][1-6][a-z]?)|bb1)([^a-z0-9]|$)/);
  if (m) { const g = m[2]; if (keuze && /^h3/.test(g)) return 'kmu h3'; return g === 'bb1' ? 'BB1' : g; }
  return '';
}
/* Alles in de iCal is van Frans: muzieklessen worden lessen, de rest (surveillance, toetsen, afspraken) komt als blok in de agenda.
   Een muziekafspraak met "toets" erin telt in een toetsweek als toets, niet als les. */
const zTekst = e => e.summary + ' ' + e.desc;
const zDienst = e => /surveillance|surveilleren|pauzedienst|toezicht|\bdienst\b/i.test(zTekst(e)) || (e.api && e.soort === 'exam' && !zMuziek(e)); // toets van een ander vak op jouw naam: surveillance
const zToets = e => e.soort === 'exam' || /toets|tentamen|examen|\bse\b|\bpta\b/i.test(zTekst(e));
const zLes = e => zMuziek(e) && !zDienst(e) && !(zToets(e) && toetsweekOp(e.d));
function zAnders(s) { // [{van, tot, titel, lokaal, groep, toets, dienst}] voor één dag, zonder lessen en gewone pauzes
  if (!ZC || !ZC.events || s < ZC.van || s > ZC.tot) return [];
  return ZC.events.filter(e => e.d === s && !e.vervallen && !zLes(e) && !((e.soort === 'interlude' || /\bpauze\b/i.test(zTekst(e))) && !zDienst(e)))
    .map(e => ({ van: e.start ? minuten(e.start) : null, tot: e.eind ? minuten(e.eind) : null, titel: e.summary || 'Afspraak', lokaal: e.loc, groep: zMuziek(e) ? zGroep(e) : '', toets: zToets(e), dienst: zDienst(e) }));
}
function zWat(e) { return e.vervallen ? 'vervallen' : (e.soort === 'interlude' || /\bpauze\b/i.test(zTekst(e))) && !zDienst(e) ? 'pauze' : zDienst(e) ? 'surveillance' : zLes(e) ? 'muziekles' : zToets(e) ? 'toets' : 'afspraak'; }
function zCodes() { // vak- en groepscodes uit het opgehaalde rooster, met wat Lesdag ervan maakt
  const vak = {}, groep = {};
  for (const e of ZC.events) {
    (e.vakken || []).forEach(v => { vak[v] = (vak[v] || 0) + 1; });
    if (!zMuziek(e)) continue;
    const code = (e.groepen || []).join(', ') || e.summary; const g = groep[code] = groep[code] || { n: 0, g: zGroep(e) }; g.n++;
  }
  return { vak: Object.entries(vak).sort().map(([code, n]) => ({ code, n, muziek: zMuziek({ api: true, vakken: [code] }) })),
    groep: Object.entries(groep).sort().map(([code, x]) => ({ code, n: x.n, g: x.g, lg: x.g ? leergangVan(x.g) : null })) };
}
const zRest = () => ZC.events.filter(e => !zLes(e) || e.vervallen).sort((a, b) => (a.d + a.start < b.d + b.start ? -1 : 1));
function zOverzichtTekst() { // om te plakken bij het nakijken: alleen codes, tijden en lokalen, geen opmerkingen uit Zermelo en geen koppeling
  const C = zCodes(); const r = ['Zermelo in Lesdag, ' + fmtD(ZC.van) + ' t/m ' + fmtD(ZC.tot) + ', via ' + (ZC.bron === 'api' ? 'de koppeling' : 'de agendalink'), '', 'Vakcodes (code, aantal, muziek?)'];
  C.vak.forEach(v => r.push([v.code, v.n, v.muziek ? 'muziek' : 'ander vak'].join('\t')));
  r.push('', 'Groepscodes bij muziek (code, aantal, groep in Lesdag, leergang)');
  C.groep.forEach(g => r.push([g.code, g.n, g.g || 'niet herkend', g.lg || 'geen leergang'].join('\t')));
  r.push('', 'Behalve muzieklessen (dag, tijd, soort in Zermelo, vak en groep, lokaal, Lesdag ziet)');
  zRest().forEach(e => r.push([e.d, (e.start || 'hele dag') + (e.eind ? '-' + e.eind : ''), e.soort || '', (e.vakken || e.groepen) ? (e.vakken || []).concat(e.groepen || []).join(' ') : e.summary, e.loc, zWat(e)].join('\t')));
  return r.join('\n');
}
function zOverzicht() { // in Instellingen: vak- en groepscodes, en alles uit Zermelo behalve gewone muzieklessen (zonder de koppeling)
  if (!ZC || !ZC.events) return '';
  const C = zCodes(); const L = zRest();
  const tabel = (kop, rijen) => `<table class="z-ov"><thead><tr>${kop.map(k => `<th>${k}</th>`).join('')}</tr></thead><tbody>${rijen.join('')}</tbody></table>`;
  return `<details class="meer" style="margin-top:.6rem"><summary>Wat Lesdag uit Zermelo haalt (${C.vak.length} vakcodes, ${C.groep.length} groepscodes, ${L.length} andere afspraken)</summary>
    <div class="knoppen" style="margin-top:.5rem"><button class="btn klein" type="button" data-zkopie="">Kopieer als tekst</button></div>
    ${C.vak.length ? '<h3>Vakcodes</h3>' + tabel(['Code', 'Aantal', 'Lesdag ziet'], C.vak.map(v => `<tr><td><code>${esc(v.code)}</code></td><td class="num">${v.n}</td><td>${v.muziek ? 'muziek' : 'ander vak'}</td></tr>`)) : '<p class="lead">Vakcodes staan alleen los in de koppeling, niet in de agendalink.</p>'}
    <h3>Groepscodes bij muziek</h3>${tabel(['In Zermelo', 'Aantal', 'Groep in Lesdag', 'Leergang'], C.groep.map(g => `<tr><td><code>${esc(g.code)}</code></td><td class="num">${g.n}</td><td>${g.g ? esc(g.g) : '<span class="chip let">niet herkend</span>'}</td><td>${g.lg ? esc(lgNaam(g.lg)) : '<span class="chip let">geen leergang</span>'}</td></tr>`))}
    <h3>Surveillances, toetsen en andere afspraken</h3>${tabel(['Dag', 'Tijd', 'In Zermelo', 'Lokaal', 'Lesdag ziet'], L.map(e => `<tr><td>${esc(fmtD(e.d))}</td><td class="num">${esc(e.start || 'hele dag')}${e.eind ? '–' + esc(e.eind) : ''}</td><td>${esc(e.summary)}${e.desc ? `<div class="sub">${esc(e.desc.replace(/\s+/g, ' ').slice(0, 80))}</div>` : ''}</td><td>${esc(e.loc)}</td><td>${zWat(e)}</td></tr>`))}</details>`;
}
function zUren(s) {
  if (!ZC || !ZC.events || s < ZC.van || s > ZC.tot) return null;
  const dag = dOf(s).getDay();
  return ZC.events.filter(e => e.d === s && zLes(e)).map(e => {
    const g = zGroep(e) || e.summary;
    const vast = S.rooster.find(u => +u.dag === dag && u.start === e.start && u.groep === g);
    return { id: vast ? vast.id : `z-${e.start}-${g}`, dag, start: e.start, eind: e.eind, groep: g, lokaal: e.loc || (vast && vast.lokaal) || '', zermelo: true, vervallen: e.vervallen, reden: e.reden || '', anderLokaal: !!(vast && e.loc && vast.lokaal && e.loc !== vast.lokaal) };
  });
}
async function zOphalen(melden) {
  const tok = S.zermeloToken; const px = zProxy();
  if (!zGekoppeld() || !px) { if (melden) toast(px ? 'Koppel eerst Zermelo bij Instellingen' : 'De roosterproxy staat nog niet in config.js'); return; }
  try {
    const van = maandagVan(vandaag()); let events = null, bron = 'api';
    if (zApiToken()) {
      try { events = await zHaalApi(van); }
      catch (e) { if (!tok) throw e; console.warn(e.message); if (melden) toast('Zermelo-koppeling lukt niet (' + e.message + '). Ik gebruik de agendalink.'); }
    }
    if (!events) {
      bron = 'ical';
      const r = await fetch(px, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok, weken: 3 }) });
      if (!r.ok) throw new Error('Zermelo antwoordt ' + r.status);
      events = icsParse(await r.text());
    }
    ZC = { opgehaald: Date.now(), van, tot: addD(van, 20), events, bron };
    try { localStorage.setItem('lesdag-zermelo', JSON.stringify(ZC)); } catch (e) {}
    if (melden) toast(`Rooster opgehaald: ${events.filter(zLes).length} muzieklessen en ${events.filter(e => !zLes(e) && !e.vervallen && (zDienst(e) || zToets(e))).length} toetsen of surveillances in drie weken`);
    if (!LES) render();
  } catch (e) { console.warn(e); if (melden) toast('Rooster ophalen lukt niet: ' + e.message); }
}
function zVastRooster() { // muzieklessen van één week als vast rooster
  if (!ZC) return [];
  const seen = {}; const out = [];
  for (let i = 0; i < 21; i++) { const s = addD(ZC.van, i); const dag = dOf(s).getDay(); if (dag === 0 || dag === 6) continue;
    for (const e of ZC.events.filter(x => x.d === s && zLes(x) && !zToets(x) && !x.vervallen)) { const g = zGroep(e); if (!g) continue; const k = dag + '|' + e.start + '|' + g; if (seen[k]) continue; seen[k] = 1; out.push({ dag, start: e.start, eind: e.eind, groep: g, lokaal: e.loc }); } }
  return out.sort((a, b) => a.dag - b.dag || minuten(a.start) - minuten(b.start));
}
/* ---------- uitval en ankers: lessen schuiven door, toetsen blijven staan ---------- */
const ONDERBOUW = /^(bb1|havo3|vwo3|kmu3)$/; // toetsen uit het PTO schuiven mee binnen hun periode; de rest staat in een PTA en verplaatst alleen Frans
const INHAALBAAR = /generale|afrond|herhal|oefen/i;
const KRAP_DAGEN = 21; // verder weg zie je het alleen bij Groepen: de leergangen zitten vol, dus één les achter is daar geen reden voor een melding
let PLAN = null;
function planBasis() { // alle lesuren per groep over het hele jaar, met de les uit de leergang die erbij hoort
  const sl = [S.updated, ZC ? ZC.opgehaald : 0, vandaag()].join('|');
  if (PLAN && PLAN.sl === sl) return PLAN;
  const slots = {};
  for (const k of B.kalender.weken) for (let i = 0; i < 5; i++) { const s = addD(k.datum, i); if (vrijReden(s)) continue;
    for (const u of urenOp(s)) (slots[u.groep] = slots[u.groep] || []).push({ s, u, w: k.w }); }
  PLAN = { sl, slots, ank: {}, idx: {} };
  for (const [g, lijst] of Object.entries(slots)) {
    PLAN.idx[g] = {}; lijst.forEach(y => { PLAN.idx[g][y.s + '|' + y.u.id] = y; });
    const L = B.leergangen[leergangVan(g)]; if (!L) continue; const n = L.meta.lessenPerWeek;
    for (const wk of L.weken) { const inWeek = lijst.filter(y => y.w === wk.w);
      const doel = inWeek.length >= n ? Array.from({ length: n }, (_, i) => i + 1) : [1, 2, 3].slice(0, n).filter(i => wk['l' + i] && wk['l' + i].type !== 'uitval'); // te weinig uren: de uitval uit de leergang is het uur dat ontbreekt
      inWeek.forEach((y, i) => { y.li = doel[i] || null; const l = y.li ? wk['l' + y.li] : null; y.planLes = l;
        y.planUit = !!l && (l.type === 'uitval' || l.type === 'toetsweek' || (l.type === 'toets' && !!wk.toetsweek));
        y.geplandUit = y.planUit && !y.u.zermelo; }); } // staat de les wel in Zermelo, dan gaat hij door
  }
  return PLAN;
}
const lesId = (lg, y) => `${lg}:${y.w}.${y.li}`;
const periodeEind = (lg, a) => { const b = (B.leergangen[lg].blokken || []).find(b => b.id === a.t.blok); return b && b.weken ? b.weken[1] : a.item.w; };
function ankersVan(g) { // de toetsen van een groep met hun lesuur. a.vast: staat op zijn uur; anders schuift hij mee tot a.grens, het laatste uur in zijn periode
  const P = planBasis(); if (P.ank[g]) return P.ank[g];
  const lg = leergangVan(g); const slots = P.slots[g] || []; const verpl = (S.ankers || {})[g] || {};
  const lijst = reeks(lg).filter(x => les(x).type === 'toets').map(x => { const l = les(x); const verplaatst = verpl[x.id] || null;
    return { id: x.id, item: x, t: toetsVan(lg, l.toets) || { id: l.toets || 'toets', naam: l.titel || '' }, verplaatst, vast: !ONDERBOUW.test(lg) || !!verplaatst, klaar: afgerond(status(g, x.id)), slot: null, grens: null }; });
  const zet = (a, y) => { if (y) { a.slot = y; y.anker = a; } };
  lijst.filter(a => a.verplaatst && !a.klaar).forEach(a => zet(a, slots.find(y => y.s === a.verplaatst.s && y.u.id === a.verplaatst.uur && !y.anker) || slots.find(y => y.s === a.verplaatst.s && !y.anker)));
  lijst.filter(a => a.vast && !a.verplaatst && !a.klaar).forEach(a => zet(a, slots.find(y => y.w === a.item.w && y.li === a.item.li && !y.anker) || slots.find(y => y.w >= a.item.w && !y.anker && !y.geplandUit)));
  lijst.filter(a => !a.vast && !a.klaar).reverse().forEach(a => { const eind = periodeEind(lg, a); if (!slots.some(y => y.w >= eind)) return; // einde periode nog niet in het bekende rooster: nog geen grens
    const y = slots.filter(y => y.w <= eind && !y.anker && !y.grens && !y.geplandUit && !isUitval(y.s, y.u)).pop(); if (y) { a.grens = y; y.grens = a; } });
  return (P.ank[g] = lijst);
}
const isVastAnker = (g, id) => ankersVan(g).some(a => a.id === id && a.vast);
// Toets die niet op zijn uur door kan: uur voorbij en niet afgevinkt, uur vervallen, of (onderbouw) geen uur meer in de periode.
function ankersGemist(g) { const t = vandaag(); const voorbij = a => a.verplaatst || ((B.kalender.weken.find(k => k.w === a.item.w) || {}).datum || t) < t; // geen uur en de week komt nog: het rooster is daar nog niet bekend
  return ankersVan(g).filter(a => !a.klaar && (a.vast ? (a.slot ? a.slot.s < t || isUitval(a.slot.s, a.slot.u) : voorbij(a)) : (a.grens ? a.grens.s < t : voorbij(a)))); }
const planGroepen = () => Object.keys(planBasis().slots).filter(g => leergangVan(g));
function ruimte(g) { // per komende toets: hoeveel lessen moeten er nog vóór, en hoeveel lesuren zijn daarvoor over
  const lg = leergangVan(g); const r = reeks(lg); const t = vandaag(); const nu = nuMin(); const ank = ankersVan(g); const doelen = [];
  const uren = (planBasis().slots[g] || []).filter(y => (y.s > t || (y.s === t && minuten(y.u.eind) > nu)) && !isUitval(y.s, y.u) && !y.geplandUit && !y.anker);
  for (const a of ank) { const y = a.vast ? a.slot : a.grens; if (a.klaar || !y || y.s < t || isUitval(y.s, y.u)) continue; doelen.push({ id: a.id, a, t: a.t, s: y.s, y, idx: r.indexOf(a.item) }); }
  for (const w of B.leergangen[lg].weken) { if (!w.toetsweek) continue; // toetsweektoetsen staan niet in de reeks, maar de stof moet er wel vóór af zijn
    for (const i of [1, 2, 3]) { const l = w['l' + i]; const T = l && l.type === 'toets' && toetsVan(lg, l.toets); if (!T) continue;
      const x = toetsweekToetsen().find(x => x.lg === lg && x.t.id === T.id); const s = x ? x.tw.d : w.datum; if (s <= t) continue;
      const idx = r.findIndex(z => z.w >= w.w); doelen.push({ id: 'tw:' + T.id, t: T, s, tw: true, idx: idx < 0 ? r.length : idx }); } }
  return doelen.sort((a, b) => a.s < b.s ? -1 : a.s > b.s ? 1 : 0).map(d => {
    const nog = r.slice(0, d.idx).filter(x => !afgerond(status(g, x.id)) && !isVastAnker(g, x.id));
    const n = uren.filter(y => y.s < d.s || (d.y && y.s === d.s && minuten(y.u.start) < minuten(d.y.u.start))).length;
    return Object.assign(d, { g, nog, uren: n, tekort: Math.max(0, nog.length - n), inhaal: nog.filter(x => les(x).type !== 'toets' && INHAALBAAR.test(les(x).titel || '')), dagen: Math.round((dOf(d.s) - dOf(t)) / 864e5) });
  });
}
const uitgesteld = key => (S.uitgesteld || {})[key] > vandaag();
function krapVoor(g) { // alleen als een toets in gevaar komt en je er nu iets mee moet; een groep die nog nooit is afgevinkt krijgt eerst de melding bovenaan Vandaag
  if (!Object.keys(S.voortgang[g] || {}).length) return null;
  const bekend = d => S.rooster.some(u => u.groep === g) || (ZC && d.s <= ZC.tot); // zonder vast rooster kent Lesdag alleen de opgehaalde weken
  return ruimte(g).find(d => d.tekort > 0 && d.dagen <= KRAP_DAGEN && bekend(d) && !uitgesteld(`krap:${g}:${d.id}`)) || null;
}
function dagenTekst(L) { // di 27 en wo 28 okt
  if (L.length > 2) return `${fmtD(L[0])} t/m ${fmtD(L[L.length - 1])}`;
  const a = L.map(fmtD); if (a.length === 2 && a[0].split(' ')[2] === a[1].split(' ')[2]) a[0] = a[0].split(' ').slice(0, 2).join(' ');
  return a.join(' en ');
}
function uitvalReden(g) { // waarom een klas achterloopt, voor de lijst met afwijkingen
  const t = vandaag(); const y = (planBasis().slots[g] || []).filter(y => y.s < t && isUitval(y.s, y.u)).pop(); if (!y) return { kort: 'minder lessen dan gepland', s: null };
  if (!S.afwezig[y.s]) return { kort: 'les uitgevallen ' + fmtD(y.s), s: y.s };
  const L = [y.s]; for (let d = addD(y.s, -1); S.afwezig[d] || dOf(d).getDay() % 6 === 0; d = addD(d, -1)) if (S.afwezig[d]) L.unshift(d);
  return { kort: 'afwezig ' + dagenTekst(L), s: y.s };
}
function zetAfwezig(van, tot) {
  const P = planBasis(); const dagen = [];
  for (let s = van; s <= tot && dagen.length < 40; s = addD(s, 1)) { if (dOf(s).getDay() % 6 === 0) continue; dagen.push(s); const rec = S.afwezig[s] = S.afwezig[s] || { herstel: {} };
    for (const g of Object.keys(P.slots)) { const lg = leergangVan(g); if (!lg) continue; // "op de planning" gezette lessen van deze dag zijn dus niet gegeven
      for (const y of P.slots[g]) { if (y.s !== s || !y.li) continue; const id = lesId(lg, y); const st = status(g, id); if (st.auto) { (rec.herstel[g] = rec.herstel[g] || {})[id] = st; delete S.voortgang[g][id]; } } } }
  afwezigOpen = false; bewaar();
  if (dagen.length) toast(`Afwezig ${dagenTekst(dagen)} · lessen schuiven door`, () => afwezigTerug(dagen));
}
function afwezigTerug(dagen) {
  for (const s of dagen) { const rec = S.afwezig[s]; if (!rec) continue; for (const [g, m] of Object.entries(rec.herstel || {})) Object.assign(S.voortgang[g] = S.voortgang[g] || {}, m); delete S.afwezig[s]; }
  bewaar();
}
function verplaatsUren(g, a) { // uren waar een toets heen kan; een PTO-toets blijft in zijn periode
  const t = vandaag(); const lg = leergangVan(g); const eind = ONDERBOUW.test(lg) ? periodeEind(lg, a) : 99;
  return (planBasis().slots[g] || []).filter(y => y.s > t && y.w <= eind && !y.anker && !y.geplandUit && !isUitval(y.s, y.u));
}
function verplaatsAnker(g, a, sleutel, reden) { // lessen van dezelfde toets (P2, P2 vervolg) gaan samen mee
  const [s, uur] = sleutel.split('|'); const lg = leergangVan(g); const oud = a.slot || a.grens;
  const uren = verplaatsUren(g, a); const vanaf = uren.findIndex(y => y.s === s && y.u.id === uur); if (vanaf < 0) return null;
  const samen = ankersVan(g).filter(x => x.t.id === a.t.id && !x.klaar); const ids = [];
  S.ankers[g] = S.ankers[g] || {};
  samen.forEach((x, i) => { const y = uren[vanaf + i]; if (y) { S.ankers[g][x.id] = { s: y.s, uur: y.u.id, reden, d: vandaag() }; ids.push(x.id); } });
  return afwijkingErbij({ g, lesIds: ids, soort: ONDERBOUW.test(lg) ? 'pto' : 'pta', studiewijzer: oud ? fmtD(oud.s) : `lesweek ${a.item.w}`, wat: `${a.t.id} verplaatst naar ${fmtD(s)}`, waarom: reden,
    bericht: `${a.t.id} is verplaatst${oud ? ` van ${fmtLang(oud.s)}` : ''} naar ${fmtLang(s)}.` });
}
function afwijkingErbij(a) { a.id = 'af' + Date.now().toString(36); a.d = vandaag(); (S.afwijkingen = S.afwijkingen || []).push(a); return a.id; }
function maakOngedaan(id) {
  const a = (S.afwijkingen || []).find(x => x.id === id); if (!a) return;
  (a.lesIds || []).forEach(l => { if (S.ankers[a.g]) delete S.ankers[a.g][l]; });
  if (a.lesId) { if (a.was) S.voortgang[a.g][a.lesId] = a.was; else delete S.voortgang[a.g][a.lesId]; }
  S.afwijkingen = S.afwijkingen.filter(x => x.id !== id); bewaar();
}
// Voorspel de lessen voor een reeks dagen vanaf 'van' (inclusief), uitgaande van de huidige voortgang. Altijd vanaf vandaag gerekend, zodat een latere week klopt.
function planning(van, tot) {
  const gedaan = {}; const res = {}; const t = vandaag(); const P = planBasis();
  for (let s = van < t ? van : t; s <= tot; s = addD(s, 1)) {
    const reden = vrijReden(s); const dag = { reden, uren: [] }; if (s >= van) res[s] = dag;
    if (reden) continue;
    for (const u of urenOp(s)) {
      const lg = leergangVan(u.groep); if (!lg) { dag.uren.push({ u, fout: 'Groep zonder leergang' }); continue; }
      const klaarSet = gedaan[u.groep] = gedaan[u.groep] || {}; const y = (P.idx[u.groep] || {})[s + '|' + u.id] || {};
      // al afgeronde lessen van vandaag: laat zien wat er gegeven is
      const gegeven = Object.entries(S.voortgang[u.groep] || {}).find(([id, st]) => st.d === s && st.uur === u.id);
      if (gegeven) { const it = reeks(lg).find(x => x.id === gegeven[0]); dag.uren.push({ u, item: it, st: gegeven[1], klaar: true }); continue; }
      if (isUitval(s, u)) { dag.uren.push({ u, uitval: true, afwezig: !!S.afwezig[s] }); continue; }
      if (y.geplandUit) { dag.uren.push({ u, uitval: true, planLes: y.planLes }); continue; }
      const lw = lesweekVan(s); const plan = B.leergangen[lg].weken.find(w => w.w === lw); const planUit = y.planUit ? y.planLes : null;
      ankersVan(u.groep); // zet y.anker en y.grens
      const a = [y.anker, y.grens].find(a => a && !afgerond(status(u.groep, a.id)) && !klaarSet[a.id]);
      if (a) { klaarSet[a.id] = true; dag.uren.push({ u, item: a.item, lw, plan, planUit, anker: a, half: status(u.groep, a.id).st === 'half' }); continue; }
      const it = reeks(lg).find(x => !afgerond(status(u.groep, x.id)) && !klaarSet[x.id] && !isVastAnker(u.groep, x.id)) || null;
      dag.uren.push({ u, item: it, lw, plan, planUit, half: it && status(u.groep, it.id).st === 'half' });
      if (it && s >= t) klaarSet[it.id] = true;
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
const ROUTES = [['vandaag', 'Vandaag'], ['week', 'Week'], ['groepen', 'Groepen'], ['rooster', 'Rooster'], ['sectie', 'Sectie'], ['reclame', 'Reclame'], ['instellingen', 'Instellingen']];
function render() {
  const liggen = blijftLiggen().length; const recNu = reclameOpen(vandaag()).length;
  $('#nav').innerHTML = ROUTES.map(([k, n]) => `<a href="#${k}" ${route.naam === k ? 'aria-current="page"' : ''}>${n}${k === 'vandaag' && liggen ? ` <span class="nav-tel" title="${liggen} ${liggen === 1 ? 'taak blijft' : 'taken blijven'} liggen">${liggen}</span>` : ''}${k === 'reclame' && recNu ? ` <span class="nav-tel" title="${recNu} reclame vandaag of eerder">${recNu}</span>` : ''}</a>`).join('');
  const f = { vandaag: viewVandaag, week: viewWeek, groepen: viewGroepen, rooster: viewRooster, sectie: viewSectie, reclame: viewReclame, instellingen: viewInstellingen, beoordelen: viewBeoordelen }[route.naam] || viewVandaag;
  $('#main').innerHTML = f();
  if (route.naam === 'reclame') { recBeelden(); if (recFocus) { const el = document.getElementById('rec-' + recVeilig(recFocus)); if (el) el.scrollIntoView({ block: 'start' }); recFocus = ''; } }
}
function toast(t, terug) { // met terug: 8 seconden een knop om het ongedaan te maken
  const el = $('#toast'); el.textContent = t; toast.terug = terug || null;
  if (terug) { const k = document.createElement('button'); k.type = 'button'; k.dataset.toastterug = ''; k.textContent = 'Ongedaan maken'; el.append(' ', k); }
  el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; toast.terug = null; }, terug ? 8000 : 3500);
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
  if (!dagKeuze && nuMin() >= 16 * 60) s = volgendeLesdag(t, 1); // na 16 uur: alvast morgen voorbereiden
  const p = planning(s, s)[s]; const lw = lesweekVan(s);
  let h = `<div class="kop"><div><h1>${s === t ? 'Vandaag' : 'Voorbereiden'}: ${esc(fmtLang(s))}</h1><div class="sub">${lw ? 'lesweek ' + lw : ''}${p.reden ? ' · ' + esc(p.reden) : ''}</div></div>
    <div class="knoppen"><button class="btn" data-dag="${volgendeLesdag(s, -1)}">‹ vorige</button><button class="btn" data-dag="${t}">vandaag</button><button class="btn" data-dag="${volgendeLesdag(s, 1)}">volgende ›</button>
    <button class="btn" data-afwezigopen="" aria-pressed="${afwezigOpen}">Ik ben er niet</button>${s === t && !p.reden && p.uren.length ? '<button class="btn hoofd" data-start="">▶ Lesmodus</button>' : ''}</div></div>`;
  if (afwezigOpen) h += afwezigForm(s);
  if (S.afwezig[s]) h += `<div class="melding info afwezigrij">Je bent afwezig. Al je lessen van deze dag vervallen en schuiven door. <button class="btn klein" data-afwezigterug="${s}">Toch aanwezig</button></div>`;
  if (!S.rooster.length) h += `<div class="kaart" style="margin-bottom:1rem"><h2>Eerst je rooster</h2><p class="lead">Vul één keer je weekrooster in: per lesuur de groep en het lokaal. Daarna staan je lessen hier in de agenda, met wat er klaar moet staan.</p><p><a class="btn hoofd" href="#rooster">Rooster invullen</a></p></div>`;
  const achter = rooGroepen().filter(g => !Object.keys(S.voortgang[g] || {}).length && leergangVan(g) && reeks(leergangVan(g)).some(x => x.w < (lesweekVan(t) || nextLesweek()) - 1));
  if (achter.length) h += `<div class="melding info">Begin je nu met Lesdag? ${esc(achter.join(', '))} staan nog op les 1. <button class="btn klein" data-opplanalle="">Zet ze op de planning</button> Dan gelden alle lessen vóór deze lesweek als gegeven.</div>`;
  const A = dagItems(s, p);
  const sel = kiesSel(s, A);
  if (s >= t) h += uitvalBlok(s) + liggenBlok();
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
let TWT = null;
function toetsweekToetsen() { // muziektoetsen die de leergang in een toetsweek zet: [{lg, t, tw}]
  if (TWT) return TWT; TWT = [];
  const tws = (B.sectie || []).filter(i => /^toetsweek/i.test(i.titel || ''));
  for (const [lg, L] of Object.entries(B.leergangen)) for (const w of L.weken) { if (!w.toetsweek) continue;
    const ma = (B.kalender.weken.find(k => k.w === w.w) || {}).datum; const tw = ma && tws.find(i => addD(ma, 4) >= i.d && ma <= (i.tot || i.d)); if (!tw) continue;
    for (const i of [1, 2, 3]) { const l = w['l' + i]; const t = l && l.type === 'toets' && toetsVan(lg, l.toets); if (t && !TWT.some(x => x.lg === lg && x.t.id === t.id)) TWT.push({ lg, t, tw }); } }
  return TWT;
}
function toetsweekToetsVoor(groep, s) { const lg = groep && leergangVan(groep); return lg ? toetsweekToetsen().find(x => x.lg === lg && s >= x.tw.d && s <= (x.tw.tot || x.tw.d)) : null; }
function toetsInZermelo(x) { // staat deze toetsweektoets met tijd in het opgehaalde rooster?
  const gs = B.groepen[x.lg] || [];
  return !!(ZC && ZC.events || []).find(e => !e.vervallen && e.start && e.d >= x.tw.d && e.d <= (x.tw.tot || x.tw.d) && zMuziek(e) && zToets(e) && gs.includes(zGroep(e)));
}
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
function geplandeSleutels() { const sec = {}, pres = {}, koor = {}, rec = {}; (S.taken || []).forEach(k => { if (k.sectieId) sec[k.sectieId] = k; if (k.koorId) koor[k.koorId] = k; if (k.reclameId) rec[k.reclameId] = k; if (k.dagTaak) pres[k.dagTaak.dag + '|' + k.dagTaak.key] = k; }); return { sec, pres, koor, rec }; }
/* ---------- reclame: weekinfo (maandag, inleveren tot 14:00) en borden in school ----------
   Activiteiten: koorconcerten (Koorapp), muziekactiviteiten uit de sectieplanning, examenconcerten (leergang) en eigen activiteiten.
   Aanvullingen per activiteit in data/reclame.json; wat Frans aanpast staat in S.reclame (gaat voor). Afgevinkt: S.reclameAf. */
let RC = null;
const RSOORT = { koor: 'koor', muziek: 'muziek', excursie: 'excursie', examen: 'examenconcert' };
const recVeilig = id => String(id).replace(/[^a-z0-9]/gi, '-');
function reclameActs() {
  if (!RC || !B || !S) return [];
  const basis = []; const seed = RC.activiteiten || {};
  ((B.koor || {}).agenda || []).filter(k => k.type === 'concert').forEach(k => basis.push({ id: 'koor:' + k.d, soort: 'koor', titel: k.concert || k.titel, d: k.d, plaats: k.plaats || '', aanvang: k.tijdUitPraktisch ? '' : k.van || '', eind: k.tijdUitPraktisch ? '' : k.tot || '', alleenVerzamel: !!k.tijdUitPraktisch }));
  (B.sectie || []).filter(i => i.soort === 'muziek' && !(RC.overslaan || []).includes(i.id)).forEach(i => { const tm = sectieTijd(i); basis.push({ id: 'sec:' + i.id, soort: 'muziek', titel: i.titel, d: i.d, aanvang: tm ? hm(tm.van) : '', eind: tm ? hm(tm.tot) : '', plaats: '' }); });
  (RC.examenconcerten || []).forEach(x => { const T = ((B.leergangen[x.lg] || {}).toetsen || []).find(t => t.id === x.toets); if (T && T.datum) basis.push({ id: `ex:${x.lg}:${x.toets}`, soort: 'examen', titel: 'Examenconcert ' + lgNaam(x.lg), wie: lgNaam(x.lg), d: T.datum, plaats: '', uitLeergang: T.waar || ('lesweek ' + T.week) }); });
  (S.reclameExtra || []).forEach(e => basis.push(Object.assign({ eigen: true, plaats: '' }, e)));
  return basis.map(a => {
    const eigen = (S.reclame || {})[a.id] || {}; const r = Object.assign({}, a, seed[a.id] || {});
    for (const [k, v] of Object.entries(eigen)) if (v !== undefined && v !== null) r[k] = v;
    if (eigen.d) r.uitLeergang = ''; if (eigen.aanvang) r.alleenVerzamel = false;
    r.doel = r.soort === 'excursie' && r.sluit && r.sluit < r.d ? r.sluit : r.d; // excursie: reclame richt zich op de sluitdatum van het aanmelden
    return r;
  }).filter(a => a.d).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
}
const recVrij = s => dOf(s).getDay() % 6 === 0 || B.vrijeDagen.includes(s) || B.kalender.vakanties.some(v => s >= v.van && s <= v.tot);
function laatsteSchooldag(s) { let d = s; for (let i = 0; i < 30 && recVrij(d); i++) d = addD(d, -1); return d; }
function weekinfoMaandag(m) { // in een vakantie verschijnt er geen weekinfo: dan de maandag ervoor. Is de maandag zelf vrij, dan inleveren op de schooldag ervoor.
  let x = m; for (let i = 0; i < 6 && B.kalender.vakanties.some(v => x >= v.van && x <= v.tot); i++) x = addD(x, -7);
  return { maandag: x, d: recVrij(x) ? laatsteSchooldag(x) : x };
}
function reclameMomenten(a) {
  const t = vandaag(); const tot = (RC.weekinfo || {}).inleverenTot || '14:00'; let m0 = maandagVan(a.doel); if (m0 === a.doel) m0 = addD(m0, -7); // op maandag zelf is die weekinfo te laat
  const out = []; const gezien = {};
  for (const w of (RC.weekinfo || {}).wekenVooraf || [2, 0]) { const s = weekinfoMaandag(addD(m0, -7 * w)); if (gezien[s.maandag]) continue; gezien[s.maandag] = 1;
    out.push({ id: a.id + '#wi' + w, a, soort: 'wi', maandag: s.maandag, d: s.d, tot, titel: `Weekinfo ${fmtD(s.maandag)}: ${a.titel}`, kort: `Weekinfo ${fmtD(s.maandag)}` }); }
  const b = laatsteSchooldag(addD(a.doel, -((RC.bord || {}).dagenVooraf || 21)));
  out.push({ id: a.id + '#bord', a, soort: 'bord', d: b, titel: `Bord aanleveren: ${a.titel} (${fmtD(a.d)})`, kort: 'Bord' });
  return out.sort((x, y) => x.d < y.d ? -1 : 1).map(m => Object.assign(m, { af: (S.reclameAf || {})[m.id] || '', verlopen: m.soort === 'wi' ? m.d < t : a.d < t }));
}
function reclameOpen(s, G) { // open taken voor activiteiten die nog komen; een gemiste weekinfo is voorbij, een bord kan tot de activiteit
  G = G || geplandeSleutels(); const t = vandaag(); const out = [];
  for (const a of reclameActs()) { if (a.uit || a.d < t) continue; for (const m of reclameMomenten(a)) if (!m.af && !m.verlopen && !G.rec[m.id] && (!s || m.d <= s)) out.push(m); }
  return out.sort((x, y) => x.d < y.d ? -1 : x.d > y.d ? 1 : 0);
}
const reclameMoment = id => { const a = reclameActs().find(a => a.id === id.split('#')[0]); return a ? reclameMomenten(a).find(m => m.id === id) : null; };
const recTekst = a => (a.tekst != null && a.tekst !== '') ? a.tekst : RECLAME.tekst(a);
function recWaarschuwingen(a) {
  const w = [];
  if (a.uitLeergang) w.push(`Datum uit de leergang (${a.uitLeergang}). Vul de echte datum in.`);
  if (!a.aanvang) w.push(a.alleenVerzamel ? 'In de koorapp staat alleen de verzameltijd. Vul de aanvang voor het publiek in.' : 'Aanvangstijd ontbreekt.');
  if (!a.plaats) w.push('Plaats ontbreekt.');
  if (a.soort === 'excursie' && !a.sluit) w.push('Nog geen sluitdatum voor het aanmelden.');
  return w;
}
function recMomentRij(m, metLink) {
  const t = vandaag(); const st = m.af ? `<span class="chip ok">verstuurd</span>` : m.verlopen ? '<span class="chip">voorbij</span>' : m.d < t ? `<span class="chip rood">te laat</span>` : m.d === t ? `<span class="chip let">vandaag${m.soort === 'wi' ? ' tot ' + esc(m.tot) : ''}</span>` : `<span class="chip">${m.soort === 'wi' ? 'tot ' + esc(fmtD(m.d)) + ' ' + esc(m.tot) : 'vanaf ' + esc(fmtD(m.d))}</span>`;
  return `<div class="taak ${m.af ? 'af' : ''} ${!m.af && !m.verlopen && m.d < t ? 'laat' : ''}"><label class="chk"><input type="checkbox" data-recvink="${esc(m.id)}" ${m.af ? 'checked' : ''}><span>${esc(metLink ? m.titel : m.kort)}</span></label><span class="tb">${st}${metLink ? `<button class="btn klein" data-recnaar="${esc(m.a.id)}">Open</button>` : m.af || m.verlopen ? '' : `<button class="btn klein" data-recmail="${m.soort}|${esc(m.a.id)}|${esc(m.id)}">Mail</button>`}</span></div>`;
}
function recKaart(a) {
  const t = vandaag(); const M = reclameMomenten(a); const w = recWaarschuwingen(a); const id = esc(a.id); const v = k => esc(a[k] == null ? '' : a[k]);
  const veld = (k, label, type, extra) => `<label>${label}<input data-recveld="${id}|${k}" type="${type || 'text'}" value="${v(k)}"${extra || ''}></label>`;
  const eigenTekst = a.tekst != null && a.tekst !== '';
  return `<div class="kaart reckaart${a.uit ? ' uit' : ''}" id="rec-${recVeilig(a.id)}"><div class="recgrid">
    <button class="recvoorbeeld" data-recbord="${id}" title="Bord downloaden (pptx)"><img data-recimg="${id}" alt="Voorbeeld van het bord voor ${esc(a.titel)}"></button>
    <div class="recin"><p class="eyebrow">${esc(RSOORT[a.soort] || a.soort)} · ${esc(fmtLang(a.d))}${a.aanvang ? ' · ' + esc(a.aanvang) : ''}</p><h2>${esc(a.titel)}</h2>
    ${a.uit ? '<p class="lead">Geen reclame voor deze activiteit.</p>' : M.map(m => recMomentRij(m)).join('')}
    ${w.length && !a.uit ? `<div class="melding recwaar">${w.map(esc).join('<br>')}</div>` : ''}
    <details class="recgeg"${w.length && !a.uit ? ' open' : ''}><summary>Gegevens voor de tekst en het bord</summary><div class="form recvelden">
      ${veld('titel', 'Titel')}${veld('ondertitel', 'Regel onder de titel (bord)')}
      <div class="rij">${veld('d', 'Datum', 'date')}${veld('aanvang', 'Aanvang', 'time')}${veld('eind', 'Einde', 'time')}<label>Soort<select data-recveld="${id}|soort">${Object.entries(RSOORT).map(([k, n]) => `<option value="${k}"${a.soort === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
      ${veld('plaats', 'Plaats')}
      <label>Wervende zin <textarea data-recveld="${id}|zin" rows="2">${v('zin')}</textarea></label>
      ${a.soort === 'excursie' ? `<div class="rij">${veld('sluit', 'Aanmelden tot en met', 'date')}${veld('kosten', 'Kosten')}</div>${veld('aanmeldlink', 'Aanmelden via (link of plek)')}` : ''}
    </div></details>
    <label class="rectekst">Tekst voor de weekinfo${eigenTekst ? ' <button class="btn klein" type="button" data-recstel="' + id + '">Voorstel terugzetten</button>' : ''}<textarea data-rectekst="${id}" rows="8">${esc(recTekst(a))}</textarea></label>
    <div class="knoppen"><button class="btn hoofd" data-recmail="wi|${id}">Mail weekinfo</button><button class="btn hoofd" data-recmail="bord|${id}">Mail bord</button><button class="btn" data-reckopie="${id}">Kopieer tekst</button><button class="btn" data-recbeeld="${id}">Afbeelding weekinfo</button><button class="btn" data-recbord="${id}">Bord (pptx)</button><button class="btn" data-recuit="${id}">${a.uit ? 'Toch reclame' : 'Geen reclame'}</button>${a.eigen ? `<button class="btn rood" data-recweg="${id}">Verwijderen</button>` : ''}</div>
    </div></div></div>`;
}
let recAlles = false, recFocus = '';
function viewReclame() {
  if (!RC) return `<div class="kop"><div><h1>Reclame</h1></div></div><div class="kaart"><p class="lead">De gegevens voor reclame (data/reclame.json) zijn niet geladen.</p></div>`;
  const t = vandaag(); const acts = reclameActs().filter(a => a.d >= t);
  const binnenkort = a => recAlles || a.id === recFocus || (!a.uit && (a.d <= addD(t, 70) || reclameMomenten(a).some(m => !m.af && !m.verlopen && m.d <= addD(t, 42))));
  const nu = reclameOpen(addD(t, 7));
  let h = `<div class="kop"><div><h1>Reclame</h1><div class="sub">Weekinfo op maandag, inleveren tot ${esc(RC.weekinfo.inleverenTot)} · borden staand · mail naar ${esc(RC.mail)}</div></div><div class="knoppen"><button class="btn" data-recalles="" aria-pressed="${recAlles}">hele jaar</button></div></div>`;
  h += `<div class="kaart"><h2>Te doen, komende week</h2>${nu.length ? nu.map(m => recMomentRij(m, true)).join('') : '<p class="leeg">Niets deze week.</p>'}<p class="sub" style="margin-top:.5rem">Ritme: weekinfo twee weken vooraf en in de week zelf, bord vanaf drie weken vooraf. Bij een excursie met een sluitdatum rekent Lesdag vanaf die datum.</p></div>`;
  const vol = acts.filter(binnenkort), later = acts.filter(a => !binnenkort(a));
  h += vol.map(recKaart).join('');
  if (later.length) h += `<div class="kaart"><h2>Later dit schooljaar</h2>${later.map(a => `<div class="taak"><span><b style="font-family:var(--kop)">${esc(fmtD(a.d))}</b> ${esc(a.titel)} <span class="chip">${esc(RSOORT[a.soort] || a.soort)}</span>${a.uit ? ' <span class="chip">geen reclame</span>' : ''}</span><span class="tb"><button class="btn klein" data-recnaar="${esc(a.id)}">Open</button></span></div>`).join('')}</div>`;
  h += `<form class="kaart form" id="recForm"><h2>Activiteit of excursie toevoegen</h2><div class="rij"><label style="flex:3 1 16rem">Wat <input id="recT" required placeholder="Bijvoorbeeld: excursie Muziekgebouw"></label><label>Datum <input id="recD" type="date" required min="${t}"></label><label>Soort<select id="recS">${Object.entries(RSOORT).map(([k, n]) => `<option value="${k}"${k === 'excursie' ? ' selected' : ''}>${n}</option>`).join('')}</select></label><button class="btn hoofd" type="submit">Toevoegen</button></div></form>`;
  return h;
}
const recBeeldCache = {};
async function recBeelden() { // voorbeelden van de borden tekenen na het renderen
  for (const img of document.querySelectorAll('img[data-recimg]')) {
    const a = reclameActs().find(x => x.id === img.dataset.recimg); if (!a) continue;
    const k = JSON.stringify([a.titel, a.ondertitel, a.d, a.aanvang, a.eind, a.plaats, a.zin, a.soort, a.sluit]);
    if (!recBeeldCache[k]) { try { const c = await RECLAME.beeld(a, 'bord'); const s = document.createElement('canvas'); s.width = 270; s.height = 480; s.getContext('2d').drawImage(c, 0, 0, 270, 480); recBeeldCache[k] = s.toDataURL('image/png'); } catch (e) { console.warn(e); continue; } }
    img.src = recBeeldCache[k];
  }
}
function reclameKaart(m) { // in het agendapaneel
  const a = m.a; return `<div class="kaart"><p class="eyebrow">Reclame · ${m.soort === 'wi' ? `weekinfo van ${esc(fmtLang(m.maandag))}, inleveren tot ${esc(fmtD(m.d))} ${esc(m.tot)}` : 'bord voor de panelen in school'}</p><h2>${esc(a.titel)}</h2><p class="lead">${esc(fmtLang(a.d))}${a.plaats ? ' · ' + esc(a.plaats) : ''}</p>
    ${recWaarschuwingen(a).length ? `<div class="melding recwaar">${recWaarschuwingen(a).map(esc).join('<br>')}</div>` : ''}
    ${m.soort === 'wi' ? `<pre class="recpre">${esc(recTekst(a))}</pre>` : ''}
    <label class="chk" style="margin:.6rem 0"><input type="checkbox" data-recvink="${esc(m.id)}" ${m.af ? 'checked' : ''}><span>Verstuurd</span></label>
    <div class="knoppen"><button class="btn hoofd" data-recmail="${m.soort}|${esc(a.id)}|${esc(m.id)}">Mail ${m.soort === 'wi' ? 'weekinfo' : 'bord'}</button><button class="btn" data-recnaar="${esc(a.id)}">Tekst en bord aanpassen</button></div></div>`;
}
function recDownload(naam, blob) { const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = naam; document.body.append(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 10000); }
async function recBestand(a, soort) { return soort === 'bord' ? RECLAME.pptx(a, recTekst(a)) : RECLAME.png(await RECLAME.beeld(a, 'weekinfo')); }
async function recMail(soort, aid, mid) {
  const a = reclameActs().find(x => x.id === aid); if (!a) return;
  const M = reclameMomenten(a); const m = M.find(x => x.id === mid) || M.find(x => x.soort === soort && !x.af && !x.verlopen) || M.find(x => x.soort === soort);
  const naam = RECLAME.bestand(a, soort);
  try { recDownload(naam, await recBestand(a, soort)); } catch (e) { console.warn(e); toast('De bijlage maken lukt niet'); return; }
  const ml = soort === 'bord' ? RECLAME.mailBord(a, RC.afzender) : RECLAME.mailWeekinfo(a, m && m.soort === 'wi' ? m.maandag : maandagVan(addD(vandaag(), 7)), recTekst(a), RC.afzender);
  setTimeout(() => { location.href = `mailto:${RC.mail}?subject=${encodeURIComponent(ml.onderwerp)}&body=${encodeURIComponent(ml.body)}`; }, 400);
  toast(`Mail staat klaar. Voeg "${naam}" uit Downloads toe als bijlage, en vink af als hij weg is.`);
}
function dagItems(s, p) {
  const t = vandaag(); const items = []; const heleDag = []; const G = geplandeSleutels();
  const werkdag = !(p.reden && /vakantie|weekend/i.test(p.reden)) && !S.afwezig[s]; // afwezig: geen koffie en geen werkblokken
  if (werkdag) items.push({ key: 'start', van: AG.van, tot: AG.werkVan, soort: 'start', titel: 'Koffie en opstarten' });
  for (const x of p.uren || []) {
    const l = x.item ? les(x.item) : null; const verleden = s < t && !x.klaar;
    items.push({ key: 'les:' + x.u.id, van: minuten(x.u.start), tot: minuten(x.u.eind), soort: x.uitval ? 'uitval' : x.klaar ? 'klaar' : 'les', titel: x.u.groep,
      sub: x.uitval ? (x.afwezig ? 'afwezig' : x.u.vervallen ? 'vervallen' : x.planLes ? (x.planLes.titel || 'valt uit') : 'valt uit') : x.fout ? x.fout : verleden ? '' : l ? (l.titel || '') : 'alles gegeven', lokaal: x.u.lokaal || '009', x });
  }
  zAnders(s).forEach((a, n) => { // surveillance, toetsen en andere afspraken uit Zermelo
    const tz = a.toets ? toetsweekToetsVoor(a.groep, s) : null;
    const it = { key: 'z:' + s + ':' + n, soort: a.toets || a.dienst ? 'toets' : 'rooster', titel: tz ? a.groep + ' ' + tz.t.id + ' ' + tz.t.naam : a.titel,
      sub: tz ? tz.t.duur + ' min · ' + (tz.t.waar || '') : a.dienst ? 'surveillance' : a.toets ? 'toets' : 'uit Zermelo', lokaal: a.lokaal || '', z: a, tz };
    if (a.van != null && a.tot != null && a.tot > a.van && a.van < AG.tot) items.push(Object.assign(it, { van: Math.max(a.van, AG.van), tot: Math.min(a.tot, AG.tot) }));
    else heleDag.push(it);
  });
  for (const x of toetsweekToetsen()) { // toets in de toetsweek waarvan de tijd niet in het rooster staat
    const eerste = s === x.tw.d || (dOf(s).getDay() === 1 && s > x.tw.d && s <= (x.tw.tot || x.tw.d)); if (!eerste || toetsInZermelo(x)) continue;
    heleDag.push({ key: 'tw:' + x.lg + ':' + x.t.id, soort: 'toets', titel: `Toets ${(B.groepen[x.lg] || [x.lg]).join(', ')} ${x.t.id}: tijd niet in rooster`, tz: x });
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
  for (const m of reclameOpen(null, G)) if (m.d === s) heleDag.push({ key: 'rec:' + m.id, soort: 'deadline', titel: (m.soort === 'wi' ? 'tot ' + m.tot + ' ' : '') + m.titel, rec: m });
  for (const k of S.taken || []) {
    if (k.plan && k.plan.dag === s) items.push({ key: 'taak:' + k.id, van: minuten(k.plan.van), tot: minuten(k.plan.tot), soort: k.af ? 'taakaf' : planVoorbij(k) ? 'taakgemist' : 'taak', titel: k.titel, sub: planVoorbij(k) ? 'gemist' : BRON[k.bron] || '', k });
    else if (!k.plan && !k.af && k.d === s) heleDag.push({ key: 'taak:' + k.id, soort: 'deadline', titel: k.titel, k });
  }
  if (werkdag) { // vrije blokken tussen 8:30 en 16:30
    const bezet = items.filter(it => ['les', 'klaar', 'sectie', 'taak', 'taakaf', 'taakgemist', 'koor', 'toets', 'rooster'].includes(it.soort) || (it.soort === 'uitval' && !it.x.planLes)).map(it => [it.van, it.tot]).sort((a, b) => a[0] - b[0]);
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
  if (it.rec) return reclameKaart(it.rec);
  if (it.k) { const k = it.k; return `<div class="kaart"><p class="eyebrow">${k.plan ? (planVoorbij(k) ? 'Gemist · ' : 'Gepland · ') + esc(fmtD(k.plan.dag)) + ' ' + esc(k.plan.van) + '–' + esc(k.plan.tot) : 'Eigen taak'}${k.bron ? ' · ' + esc(BRON[k.bron] || k.bron) : ''}</p><h2>${esc(k.titel)}</h2>${k.d ? `<p class="lead">Deadline ${esc(fmtD(k.d))}</p>` : ''}
    <label class="chk" style="margin:.6rem 0"><input type="checkbox" data-taakaf="${esc(k.id)}" ${k.af ? 'checked' : ''}><span>Klaar</span></label>
    <div class="knoppen">${k.reclameId ? `<button class="btn hoofd" data-recmail="${/#bord$/.test(k.reclameId) ? 'bord' : 'wi'}|${esc(k.reclameId.split('#')[0])}|${esc(k.reclameId)}">Mail ${/#bord$/.test(k.reclameId) ? 'bord' : 'weekinfo'}</button><button class="btn" data-recnaar="${esc(k.reclameId.split('#')[0])}">Naar reclame</button>` : ''}${planVoorbij(k) && !k.dagTaak ? `<button class="btn hoofd" data-liggenplan="eigen:${esc(k.id)}">Opnieuw plannen</button>` : ''}${k.plan ? `<button class="btn" data-ontplan="${esc(k.id)}">Uit de agenda halen</button>` : ''}<button class="btn" data-taakweg="${esc(k.id)}">Verwijderen</button></div></div>`; }
  if (it.z || it.tz) { const tz = it.tz;
    return `<div class="kaart"><p class="eyebrow">${it.z ? 'Uit je Zermelo-rooster' + (tijd ? ' · ' + tijd : '') + (it.lokaal ? ' · ' + esc(it.lokaal) : '') : esc(tz.tw.titel)}</p><h2>${esc(it.z ? it.titel : `${(B.groepen[tz.lg] || []).join(', ')} ${tz.t.id} ${tz.t.naam}`)}</h2>
      ${tz ? `<p class="lead">${esc(tz.t.naam)} · ${esc(String(tz.t.duur || '?'))} min${tz.t.waar ? ' · ' + esc(tz.t.waar) : ''}</p>` : ''}
      ${it.z ? (it.z.titel !== it.titel ? `<p class="lead">In Zermelo: ${esc(it.z.titel)}</p>` : '') : '<p class="lead">De tijd van deze toets staat niet in je opgehaalde rooster. Kijk in Zermelo wanneer en waar; zodra hij erin staat, komt hij hier met tijd en lokaal.</p>'}</div>`; }
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
  (S.taken || []).filter(k => !k.af && (!k.plan || (planVoorbij(k) && !k.dagTaak))).forEach(k => opties.push([`eigen:${k.id}`, k.titel + (k.d ? ' (deadline ' + fmtD(k.d) + ')' : planVoorbij(k) ? ' (gemist ' + fmtD(k.plan.dag) + ')' : '')]));
  sectieItems().filter(i => i.taak && !S.sectieAf[i.id] && !sec[i.id] && i.d <= addD(s, 14)).forEach(i => opties.push([`sec:${i.id}`, 'Sectie: ' + i.titel + ' (' + fmtD(i.d) + ')']));
  const kr = koorOp(s); if (kr && (kr.type === 'rep' || kr.type === 'extra') && !(S.dagTaken[s] || {}).koor && !pres[s + '|koor']) opties.push(['koorrep', 'Koorrepetitie voorbereiden: ' + kr.titel]);
  koorTakenOpen(s).forEach(t => opties.push(['koor:' + t.id, 'Koor: ' + t.titel + (t.d ? ' (' + fmtD(t.d) + ')' : '')]));
  reclameOpen(addD(s, 14)).forEach(m => opties.push(['rec:' + m.id, 'Reclame: ' + m.titel + ' (' + fmtD(m.d) + ')']));
  for (const x of p.uren || []) { if (!x.item || x.uitval || x.klaar) continue; const l = les(x.item); const key = 'pres:' + x.item.id; if ((l.materiaal || []).some(m => /presentatie|\.pptx/i.test((m.t || '') + ' ' + (m.u || ''))) && !(S.dagTaken[s] || {})[key] && !pres[s + '|' + key]) opties.push([`pres:${x.item.id}`, `Presentatie doorlopen: ${x.u.groep} ${l.titel}`]); }
  const van = s === vandaag() ? Math.max(it.van, Math.ceil(nuMin() / 5) * 5) : it.van; // niet beginnen in het verleden
  const duur = Math.min(it.tot - van, 50); const voork = planVoorkeur; planVoorkeur = '';
  return `<div class="kaart"><p class="eyebrow">Vrij · ${hm(it.van)}–${hm(it.tot)} · ${it.tot - it.van} minuten</p><h2>Taak plannen</h2>
  <form id="planForm" class="planform" data-dag="${s}">
    <label>Wat ga je doen?<select id="pK"><option value="">Nieuwe taak…</option>${opties.map(([v, n]) => `<option value="${esc(v)}"${v === voork ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
    <div id="pNieuw" class="rij"${voork ? ' hidden' : ''}><input id="pT" placeholder="Bijvoorbeeld: mail beantwoorden"><select id="pB">${Object.entries(BRON).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    <div class="rij"><label>Van<input id="pVan" type="time" value="${hm(van).padStart(5, '0')}" min="07:00" max="22:00"></label><label>Tot<input id="pTot" type="time" value="${hm(van + duur).padStart(5, '0')}" min="07:00" max="22:00"></label></div>
    <button class="btn hoofd" type="submit">In de agenda zetten</button>
  </form></div>`;
}
/* blijft liggen: gemiste geplande taken en voorbije deadlines, tot ze klaar, opnieuw gepland of uitgesteld zijn */
let planVoorkeur = ''; // taak die alvast klaarstaat in de keuzelijst van planKaart
const planVoorbij = k => !k.af && !!k.plan && k.plan.dag < vandaag();
function blijftLiggen() {
  if (!B || !S) return [];
  const t = vandaag(); const G = geplandeSleutels(); const op = key => (S.uitgesteld || {})[key] > t; const out = [];
  (S.taken || []).forEach(k => {
    if (k.af || op('eigen:' + k.id)) return;
    if (planVoorbij(k)) { if (!k.dagTaak) out.push({ key: 'eigen:' + k.id, titel: k.titel, bron: k.bron, dag: k.plan.dag, gemist: true, vink: `data-taakaf="${esc(k.id)}"` }); }
    else if (!k.plan && k.d && k.d < t) out.push({ key: 'eigen:' + k.id, titel: k.titel, bron: k.bron, dag: k.d, vink: `data-taakaf="${esc(k.id)}"` });
  });
  sectieItems().forEach(i => { if (i.taak && !S.sectieAf[i.id] && !G.sec[i.id] && (i.tot || i.d) < t && !op('sec:' + i.id)) out.push({ key: 'sec:' + i.id, titel: i.titel, bron: 'sectie', dag: i.tot || i.d, vink: `data-sdone="${esc(i.id)}"` }); });
  koorTakenOpen(t).forEach(k => { if (k.d && k.d < t && !op('koor:' + k.id)) out.push({ key: 'koor:' + k.id, titel: k.titel, bron: 'koor', dag: k.d, vink: `data-koorvink="${esc(k.id)}"` }); });
  reclameOpen(addD(t, -1), G).forEach(m => { if (!op('rec:' + m.id)) out.push({ key: 'rec:' + m.id, titel: m.titel, bron: 'reclame', dag: m.d, vink: `data-recvink="${esc(m.id)}"` }); });
  return out.sort((a, b) => a.dag < b.dag ? -1 : a.dag > b.dag ? 1 : 0);
}
function liggenBlok() {
  const L = blijftLiggen(); if (!L.length) return '';
  const t = vandaag(); const morgen = volgendeLesdag(t, 1);
  const rij = x => `<div class="taak laat"><label class="chk"><input type="checkbox" ${x.vink}><span>${esc(x.titel)}</span></label><span class="tb"><span class="chip">${esc(BRON[x.bron] || x.bron || 'overig')}</span><span class="chip rood">${x.gemist ? 'gemist' : 'deadline'} ${esc(fmtD(x.dag))}</span><button class="btn klein hoofd" data-liggenplan="${esc(x.key)}">Plan</button><button class="btn klein" data-liggenlater="${esc(x.key)}|${morgen}">Morgen</button><label class="later">Later<input type="date" min="${addD(t, 1)}" data-liggentot="${esc(x.key)}"></label></span></div>`;
  const rest = L.slice(3);
  return `<div class="kaart liggen"><h2>Blijft liggen · ${L.length}</h2>${L.slice(0, 3).map(rij).join('')}${rest.length ? `<details class="meer"><summary>Nog ${rest.length} ${rest.length === 1 ? 'taak' : 'taken'}</summary>${rest.map(rij).join('')}</details>` : ''}</div>`;
}
function liggenInPlannen(v) { // opent het eerste vrije blok vanaf de getoonde dag, met deze taak al gekozen
  const t = vandaag(); let d = dagKeuze && dagKeuze > t ? dagKeuze : t;
  for (let i = 0; i < 10; i++, d = volgendeLesdag(d, 1)) {
    const p = planning(d, d)[d]; if (vrijReden(d) === 'weekend') continue;
    const blok = dagItems(d, p).items.find(it => it.soort === 'vrij' && (d > t || it.tot - nuMin() >= 15));
    if (!blok) continue;
    agSel[d] = blok.key; dagKeuze = d === t && nuMin() < 16 * 60 ? null : d; planVoorkeur = v; render(); // vandaag: geen vaste dag, anders blijft de app daar morgen op staan
    const pn = $('.agpaneel'); if (pn) pn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  toast('Geen vrij blok gevonden in de komende twee weken');
}
function stelUit(key, tot) { S.uitgesteld = S.uitgesteld || {}; const t = vandaag(); for (const k of Object.keys(S.uitgesteld)) if (S.uitgesteld[k] <= t) delete S.uitgesteld[k]; S.uitgesteld[key] = tot; bewaar(); toast('Komt terug op ' + fmtD(tot)); }

/* taken en sectieafspraken zonder tijd staan in de agenda; hieronder de takenlijst */
const BRON = { sectie: 'sectie', koor: 'koor', reclame: 'reclame', slc: 'SLC', mail: 'mail', les: 'lessen', overig: 'overig' };
function dagExtra(s, p) { return takenBlok(s, p); }
function takenBlok(s, p) {
  const t = vandaag(); const dt = S.dagTaken[s] || {}; const G = geplandeSleutels();
  // automatische dagtaken: presentaties van de lessen van deze dag doorlopen
  const auto = [];
  (p.uren || []).forEach(x => { if (!x.item || x.uitval || x.klaar) return; const l = les(x.item); const pres = (l.materiaal || []).filter(m => /presentatie|\.pptx/i.test((m.t || '') + ' ' + (m.u || ''))); if (pres.length && !G.pres[s + '|pres:' + x.item.id]) auto.push({ key: 'pres:' + x.item.id, titel: `Presentatie doorlopen: ${l.titel}`, sub: `${x.u.start} ${x.u.groep} · let op onhandige dia's, volgorde en wat je zelf wilt zeggen`, af: !!dt['pres:' + x.item.id] }); });
  const eigen = (S.taken || []).filter(k => !k.af || k.afOp === s).sort((a, b) => (a.d || '9') < (b.d || '9') ? -1 : 1);
  const sect = sectieItems().filter(i => i.taak && !S.sectieAf[i.id] && !G.sec[i.id] && i.d <= addD(s, 14));
  const rij = (k, chk, extra) => `<div class="taak ${k.af ? 'af' : ''} ${(k.d && k.d < t && !k.af) || (k.plan && planVoorbij(k)) ? 'laat' : ''}"><label class="chk">${chk}<span>${esc(k.titel)}</span></label><span class="tb">${k.bron ? `<span class="chip">${esc(BRON[k.bron] || k.bron)}</span>` : ''}${k.plan ? `<button class="chip ${planVoorbij(k) ? 'rood' : 'ok'}" data-ag="${esc(k.plan.dag)}|taak:${esc(k.id)}">${planVoorbij(k) ? 'gemist ' : ''}${esc(fmtD(k.plan.dag))} ${esc(k.plan.van)}</button>` : ''}${k.d ? `<span class="chip ${k.d < t && !k.af ? 'rood' : ''}">deadline ${esc(fmtD(k.d))}</span>` : ''}${extra || ''}</span>${k.sub ? `<div class="sub">${esc(k.sub)}</div>` : ''}</div>`;
  let h = `<div class="kaart"><h2 style="margin-bottom:.3rem">Taken</h2><p class="lead" style="margin-bottom:.4rem">Klik in de agenda op een vrij blok om een taak op een vast moment te zetten.</p>`;
  if (auto.length) h += `<h3>Lessen van ${s === t ? 'vandaag' : 'deze dag'}</h3>` + auto.map(k => rij(k, `<input type="checkbox" data-dagtaak="${esc(k.key)}" data-dag="${s}" ${k.af ? 'checked' : ''}>`)).join('');
  const kr = koorOp(s); const krRep = kr && (kr.type === 'rep' || kr.type === 'extra') && !G.pres[s + '|koor'] ? kr : null; const kt = koorTakenOpen(s);
  if (krRep || kt.length) h += '<h3>Koor</h3>' + (krRep ? rij({ titel: koorNaam(krRep) + ' voorbereiden: ' + krRep.titel, sub: (krRep.van ? krRep.van + ' · ' : '') + ((krRep.plan || []).map(x => x.stuk).join(', ') || 'repetitieplan in de koorapp'), af: !!dt.koor, bron: 'koor' }, `<input type="checkbox" data-dagtaak="koor" data-dag="${s}" ${dt.koor ? 'checked' : ''}>`) : '') + kt.map(t => rij({ titel: t.titel, d: t.d, sub: t.sub, bron: 'koor', af: false }, `<input type="checkbox" data-koorvink="${esc(t.id)}">`)).join('');
  const rec = reclameOpen(addD(s, 7), G); if (rec.length) h += '<h3>Reclame</h3>' + rec.map(m => rij({ titel: m.titel, d: m.d, sub: m.soort === 'wi' ? 'Inleveren tot ' + m.tot + ' bij ' + RC.mail : 'Staande dia voor de borden, mail naar ' + RC.mail, bron: 'reclame', af: false }, `<input type="checkbox" data-recvink="${esc(m.id)}">`, `<button class="btn klein" data-recmail="${m.soort}|${esc(m.a.id)}|${esc(m.id)}">Mail</button>`)).join('');
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
  if (x.uitval) return `<div class="uur klaar">${kop}<div class="in"><div class="regel"><span class="groep">${esc(u.groep)}</span><span class="chip">${x.afwezig ? 'afwezig' : u.vervallen ? 'vervallen in Zermelo' : x.planLes ? esc(x.planLes.titel || 'valt uit') : 'valt uit'}</span>${u.vervallen && u.reden ? `<span class="chip">${esc(u.reden)}</span>` : ''}</div>${u.vervallen || x.afwezig || x.planLes ? '' : `<div><button class="btn klein" data-uitvalterug="${s}|${u.id}">toch les</button></div>`}</div></div>`;
  if (!x.item) return `<div class="uur">${kop}<div class="in"><div class="regel"><span class="groep">${esc(u.groep)}</span><span class="leeg">alle lessen van ${esc(lgNaam(leergangVan(u.groep)))} zijn gegeven</span></div></div></div>`;
  const l = les(x.item); const lg = x.item.lg;
  const t = l.type === 'toets' ? toetsVan(lg, l.toets) : null;
  const diff = x.lw && !x.anker ? x.lw - x.item.w : 0;
  const inToets = Object.entries(S.voortgang[u.groep] || {}).find(([id, st]) => st.inToets === x.item.id);
  const ankChip = !x.anker ? '' : x.anker.verplaatst ? `<span class="chip let" title="${esc(x.anker.verplaatst.reden || '')}">verplaatst</span>` : x.anker.vast ? '<span class="chip rood">toets staat vast</span>' : x.anker.grens && x.anker.grens.s === s ? '<span class="chip let">laatste lesuur in de periode</span>' : '';
  const voorToets = inToets ? reeks(lg).find(y => y.id === inToets[0]) : null;
  const vor = vorigeNotitie(u.groep, reeks(lg).indexOf(x.item));
  const plan = x.planUit ? `<span class="chip let" title="${esc(x.planUit.titel || '')}">planning: ${esc((x.planUit.titel || 'valt uit').replace(/^Valt uit: /, 'uitval: '))}</span>` : '';
  const ev = x.plan && x.plan.event ? `<span class="chip">${esc(x.plan.event)}</span>` : '';
  return `<div class="uur ${nu ? 'nu' : ''} ${x.klaar ? 'klaar' : ''}">${kop}<div class="in">
    <div class="regel"><span class="groep">${esc(u.groep)}</span>${chipType(l)}<span class="titel">${esc(l.titel || '')}${t ? ' – ' + esc(t.naam) : ''}</span>${x.half ? '<span class="chip let">vervolg</span>' : ''}${ankChip}${x.klaar ? `<span class="chip ok">${esc(x.st.st)}</span>` : ''}</div>
    ${voorToets ? `<div class="vorige">Eerst: ${esc(les(voorToets).titel || '')}. Past dat nog naast de toets?</div>` : ''}
    <div class="regel"><span class="chip">${esc(lgNaam(lg))} · les uit lesweek ${x.item.w}</span>${diff > 0 ? `<span class="chip let">${diff} ${diff === 1 ? 'week' : 'weken'} achter op de planning</span>` : diff < 0 ? `<span class="chip ok">${-diff} week voor</span>` : ''}${plan}${ev}${u.anderLokaal ? `<span class="chip rood">ander lokaal: ${esc(u.lokaal)}</span>` : ''}${u.reden ? `<span class="chip let">${esc(u.reden)}</span>` : ''}${u.zermelo ? '<span class="chip">Zermelo</span>' : ''}</div>
    ${l.doel ? `<p class="doel">${esc(l.doel)}</p>` : l.detail ? `<p class="doel">${esc(l.detail)}</p>` : ''}
    ${vor && vor.st.n ? `<div class="vorige">Vorige keer${vor.st.d ? ' (' + esc(fmtD(vor.st.d)) + (vor.st.st ? ', ' + esc(vor.st.st) : '') + ')' : ''}: ${esc(vor.st.n)}</div>` : ''}
    ${(l.fasen || []).length ? `<details class="meer"><summary>Lesverloop</summary><ol class="fasen">${l.fasen.map(f => `<li>${esc(LESMODUS.faseTekst(f))}</li>`).join('')}</ol></details>` : ''}
    ${matLinks(l)}
    <div class="knoppen">${x.klaar ? '' : `<button class="btn hoofd" data-start="${esc(u.id)}|${s}">▶ Geef les</button>`}${bmVoor(x.item).map(m => `<button class="btn" data-beoordeel="${esc(m.id)}|${esc(u.groep)}">Beoordelen ${esc(m.toets)}</button>`).join('')}<button class="btn" data-bewerk="${esc(x.item.id)}">bewerk les</button>${x.klaar ? '' : `<button class="btn" data-uitval="${s}|${u.id}">valt uit</button>`}</div>
  </div></div>`;
}

/* ---------- uitval: melding, inhaalvoorstel en bericht aan de klas ---------- */
let afwezigOpen = false, krapOpen = '', krapKeuze = '', ankerOpen = '';
function afwezigForm(s) {
  return `<form class="kaart form afwezigform" id="afwezigForm"><h2>Ik ben er niet</h2><p class="lead">Al je lessen van deze dagen vervallen en schuiven door. Lesdag vraagt niets per les.</p><div class="rij"><label>Van <input id="afVan" type="date" required value="${s}"></label><label>Tot en met <input id="afTot" type="date" required value="${s}"></label><button class="btn hoofd" type="submit">Afwezig</button><button class="btn" type="button" data-afwezigopen="">Annuleren</button></div></form>`;
}
function ankerForm(g, a) { // een toets verplaatsen: Frans beslist, met een reden voor de lijst met afwijkingen
  const lg = leergangVan(g); const uren = verplaatsUren(g, a);
  return `<form class="kaart form ankerform" id="ankerForm" data-g="${esc(g)}" data-id="${esc(a.id)}"><p class="eyebrow">${esc(g)} · ${ONDERBOUW.test(lg) ? 'toets uit het PTO' : 'wijkt af van het PTA'}</p><h2>${esc(a.t.id)} verplaatsen</h2>${verplaatsVelden(g, a, uren)}<div class="knoppen"><button class="btn hoofd" type="submit"${uren.length ? '' : ' disabled'}>Verplaatsen</button><button class="btn" type="button" data-ankeropen="">Annuleren</button></div></form>`;
}
function verplaatsVelden(g, a, uren) {
  const lg = leergangVan(g);
  if (!uren.length) return `<p class="lead">${ONDERBOUW.test(lg) ? `Er is geen lesuur meer vrij in deze periode (tot en met lesweek ${periodeEind(lg, a)}).` : 'Er is geen lesuur meer vrij.'}</p>`;
  return `<div class="rij"><label>Naar <select id="avUur">${uren.slice(0, 10).map(y => `<option value="${esc(y.s + '|' + y.u.id)}">${esc(fmtD(y.s))} ${esc(y.u.start)}</option>`).join('')}</select></label><label style="flex:3 1 16rem">Reden (voor de lijst met afwijkingen) <input id="avReden" required placeholder="Bijvoorbeeld: twee lessen uitgevallen"></label></div>`;
}
function krapOpties(R) {
  const naam = x => les(x).titel || 'Les'; const blijft = R.a && ONDERBOUW.test(leergangVan(R.g)) ? 'toets blijft' : 'PTA blijft';
  const O = R.inhaal.slice(-3).reverse().map(x => ({ k: 'skip:' + x.id, titel: `${naam(x)} vervalt`, chip: ['ok', blijft], sub: 'Leerlingen oefenen thuis. Het bericht voor de klas staat daarna klaar.',
    gevolg: `"${naam(x)}" krijgt de status overgeslagen. ${R.t.id} blijft op ${fmtD(R.s)}. In de lijst met afwijkingen komt: ${naam(x)} vervallen.` }));
  if (R.a && R.inhaal.length) { const x = R.inhaal[R.inhaal.length - 1]; const duur = B.leergangen[leergangVan(R.g)].meta.lesduurMin;
    O.push({ k: 'begin:' + x.id, titel: `${naam(x)} aan het begin van de toetsles`, chip: ['let', 'minder toetstijd'], sub: `De les duurt ${duur} minuten, ${R.t.id} staat op ${R.t.duur || '?'} minuten. Jij beslist of dat kan.`,
      gevolg: `De les van ${fmtD(R.s)} begint met "${naam(x)}" en daarna ${R.t.id}. Dat staat er als vraag bij in je voorbereiding. In de lijst met afwijkingen komt: samengevoegd met de toetsles.` }); }
  if (R.a) O.push({ k: 'move', titel: `${R.t.id} een les later`, chip: ONDERBOUW.test(leergangVan(R.g)) ? ['let', 'binnen de periode'] : ['rood', 'wijkt af van PTA'], sub: 'Jij beslist. Lesdag vraagt een korte reden en de beoordeling gaat mee met de les.',
    gevolg: `${R.t.id} verhuist naar het lesuur dat je hieronder kiest. De les die er nog voor moet, komt op ${fmtD(R.s)}. Je reden komt in de lijst met afwijkingen.` });
  return O;
}
function krapKaart(R) {
  const O = krapOpties(R); const kies = O.find(o => o.k === krapKeuze); const uren = R.a ? verplaatsUren(R.g, R.a) : [];
  return `<form class="kaart krap" id="krapForm" data-g="${esc(R.g)}" data-id="${esc(R.id)}"><p class="eyebrow">${esc(R.g)} · krap voor ${esc(R.t.id)}</p><h2>${R.nog.length} ${R.nog.length === 1 ? 'les' : 'lessen'}, ${R.uren} ${R.uren === 1 ? 'lesuur' : 'lesuren'}</h2>
    <p class="lead">Lesuren tot ${esc(R.t.id)} (${esc(fmtD(R.s))}): <span class="chip let">${R.tekort} tekort</span>. Nog te geven: ${R.nog.slice(0, 4).map(x => esc(les(x).titel || '')).join(', ')}${R.nog.length > 4 ? ' en meer' : ''}.</p>
    ${R.inhaal.length ? '' : '<p class="lead">Geen les die Lesdag herkent als inhaalbaar (generale, afronden, herhaling, oefenen).</p>'}
    ${R.tw ? '<p class="lead">De toetsweek ligt vast, dus deze toets verplaats je niet hier.</p>' : ''}
    <div class="opties">${O.map(o => `<button type="button" class="optie" data-krapoptie="${esc(o.k)}" aria-pressed="${o.k === krapKeuze}"><b>${esc(o.titel)}</b><span class="chip ${o.chip[0]}">${esc(o.chip[1])}</span><span class="sub">${esc(o.sub)}</span></button>`).join('')}</div>
    <p class="gevolg">${kies ? esc(kies.gevolg) : 'Kies een optie. Er verandert pas iets als je op Doen tikt, en dat kun je ongedaan maken.'}</p>
    ${krapKeuze === 'move' ? verplaatsVelden(R.g, R.a, uren) : ''}
    <p class="sub">Toch gegeven maar niet afgevinkt? <button class="btn klein" type="button" data-naargroep="${esc(R.g)}">Bekijk de lessen van ${esc(R.g)}</button></p>
    <div class="knoppen"><button class="btn hoofd" type="submit"${kies && !(krapKeuze === 'move' && !uren.length) ? '' : ' disabled'}>Doen</button><button class="btn" type="button" data-kraplater="${esc(R.g + '|' + R.id)}">Later beslissen</button></div></form>`;
}
function voerKrapUit(R, k) {
  const van = uitvalReden(R.g).s; const uit = van ? `De les van ${fmtLang(van)} is uitgevallen. ` : ''; let id;
  if (k === 'move') { const reden = ($('#avReden') || {}).value || ''; const uur = ($('#avUur') || {}).value; if (!reden.trim()) { toast('Geef een korte reden'); return; }
    id = verplaatsAnker(R.g, R.a, uur, reden.trim()); if (!id) return; const af = S.afwijkingen.find(x => x.id === id); af.bericht = uit + af.bericht; }
  else { const soort = k.slice(0, k.indexOf(':')); const x = R.nog.find(z => z.id === k.slice(k.indexOf(':') + 1)); if (!x) return; const naam = les(x).titel || 'de les'; const was = status(R.g, x.id);
    S.voortgang[R.g] = S.voortgang[R.g] || {}; S.voortgang[R.g][x.id] = Object.assign({}, was, { st: 'overgeslagen', inhaal: true }, soort === 'begin' ? { inToets: R.id } : {}); delete S.voortgang[R.g][x.id].auto;
    id = afwijkingErbij({ g: R.g, lesId: x.id, was: Object.keys(was).length ? was : undefined, soort: 'les', studiewijzer: `lesweek ${x.w}, les ${x.li}`, wat: soort === 'begin' ? `${naam} samengevoegd met ${R.t.id}` : `${naam} vervallen`, waarom: uitvalReden(R.g).kort,
      bericht: soort === 'begin' ? `${uit}We doen "${naam}" aan het begin van de les van ${fmtLang(R.s)}. ${R.t.id} blijft op die dag.` : `${uit}"${naam}" komt niet meer. ${R.t.id} blijft op ${fmtLang(R.s)}. Oefen thuis.` }); }
  krapOpen = ''; krapKeuze = ''; bewaar();
  toast(S.afwijkingen.find(x => x.id === id).wat, () => maakOngedaan(id));
}
function uitvalBlok(s) {
  let h = '';
  (S.afwijkingen || []).filter(a => a.bericht && !a.berichtKlaar).forEach(a => { h += `<div class="kaart bericht"><p class="eyebrow">Bericht aan de klas · ${esc(a.g)} · plak in Magister</p><textarea rows="3" data-bericht="${esc(a.id)}">${esc(a.bericht)}</textarea><div class="knoppen"><button class="btn hoofd klein" data-berichtkopie="${esc(a.id)}">Kopieer</button><button class="btn klein" data-berichtklaar="${esc(a.id)}">Klaar</button></div></div>`; });
  const rijen = [];
  for (const g of planGroepen()) {
    if (!Object.keys(S.voortgang[g] || {}).length) continue;
    for (const a of ankersGemist(g)) { const key = `gemist:${g}:${a.id}`; if (uitgesteld(key)) continue; const y = a.vast ? a.slot : a.grens;
      if (ankerOpen === g + '|' + a.id) { rijen.push(ankerForm(g, a)); continue; }
      const tekst = !a.vast ? `past niet meer in zijn periode.` : !y ? 'heeft geen lesuur.' : y.s >= vandaag() ? `stond op ${esc(fmtD(y.s))}, maar dat uur vervalt.` : `stond op ${esc(fmtD(y.s))} en is nog niet afgevinkt.`;
      rijen.push(`<div class="melding uitvalrij"><span><b>${esc(g)}: ${esc(a.t.id)}</b> ${tekst}</span><span class="knoppen">${y && y.s < vandaag() ? `<button class="btn klein" data-markeer="${esc(g)}|${esc(a.id)}">Is gegeven</button>` : ''}<button class="btn klein" data-ankeropen="${esc(g + '|' + a.id)}">Verplaatsen</button><button class="btn klein" data-liggenlater="${esc(key)}|${addD(vandaag(), 1)}">Later</button></span></div>`); }
    const R = krapVoor(g); if (!R) continue;
    if (krapOpen === g + '|' + R.id) { rijen.push(krapKaart(R)); continue; }
    const x = R.inhaal[R.inhaal.length - 1] || R.nog[R.nog.length - 1];
    rijen.push(`<div class="melding uitvalrij"><span><b>${esc(g)} raakt krap.</b> ${esc(R.t.id)} blijft op ${esc(fmtD(R.s))}. ${R.tekort === 1 && x ? `"${esc(les(x).titel || '')}" past er niet meer voor.` : `${R.tekort} lessen passen er niet meer voor.`}</span><span class="knoppen"><button class="btn klein hoofd" data-krapopen="${esc(g + '|' + R.id)}">Bekijk inhaalvoorstel</button><button class="btn klein" data-kraplater="${esc(g + '|' + R.id)}">Later</button></span></div>`);
  }
  const rest = rijen.slice(4);
  h += rijen.slice(0, 4).join('') + (rest.length ? `<details class="meer uitvalmeer"><summary>Nog ${rest.length} ${rest.length === 1 ? 'melding' : 'meldingen'}</summary>${rest.join('')}</details>` : '');
  return h ? `<div class="uitvalblok">${h}</div>` : '';
}
function ruimteKaart(lijst) { // per klas de volgende toets en hoeveel ruimte er tot daar is
  const rijen = lijst.filter(g => leergangVan(g)).map(g => { const d = ruimte(g)[0]; if (!d) return `<tr><td><button class="btn klein" data-groep="${esc(g)}">${esc(g)}</button></td><td colspan="3" class="leeg">geen toets meer dit jaar</td></tr>`;
    return `<tr><td><button class="btn klein" data-groep="${esc(g)}">${esc(g)}</button></td><td><span class="chip rood">${esc(d.t.id)}</span> ${d.a && !d.a.vast ? 'uiterlijk ' : ''}${esc(fmtD(d.s))}${d.tw ? ' · toetsweek' : ''}</td><td class="num">${d.nog.length} ${d.nog.length === 1 ? 'les' : 'lessen'}, ${d.uren} ${d.uren === 1 ? 'lesuur' : 'lesuren'}</td><td>${d.tekort ? `<span class="chip let">${d.tekort} tekort</span>` : '<span class="chip ok">past</span>'}${d.inhaal.length ? ` <span class="chip">${d.inhaal.length} inhaalbaar</span>` : ''}</td></tr>`; });
  return rijen.length ? `<div class="kaart"><h2>Ruimte tot de volgende toets</h2><div class="scroll"><table><tr><th>Groep</th><th>Toets</th><th>Nog te geven</th><th></th></tr>${rijen.join('')}</table></div></div>` : '';
}
function toetsenKaart(g) {
  const lg = leergangVan(g); const L = ankersVan(g); if (!L.length) return '';
  const rij = a => { const y = a.vast ? a.slot : a.grens; return `<div class="taak"><span><b>${esc(a.t.id)}</b> ${esc(a.t.naam || '')}</span><span class="tb">${a.klaar ? '<span class="chip ok">klaar</span>' : y ? `<span class="chip rood">${esc(fmtD(y.s))}</span>` : `<span class="chip let">geen lesuur</span>`}${a.verplaatst ? '<span class="chip let">verplaatst</span>' : a.vast ? '' : `<span class="chip">schuift mee, tot lesweek ${periodeEind(lg, a)}</span>`}${a.klaar ? '' : `<button class="btn klein" data-ankeropen="${esc(g + '|' + a.id)}">verplaats</button>`}</span></div>`; };
  const open = L.find(a => ankerOpen === g + '|' + a.id);
  return `<div class="kaart"><h2>Toetsen</h2>${L.map(rij).join('')}</div>${open ? ankerForm(g, open) : ''}`;
}
function afwijkingenKaart(g) {
  const L = (S.afwijkingen || []).filter(a => a.g === g); if (!L.length) return '';
  return `<div class="kaart"><h2>Anders dan de studiewijzer</h2><div class="scroll"><table><tr><th>Stond</th><th>Wat er gebeurde</th><th>Waarom</th><th></th><th></th></tr>${L.map(a => `<tr><td class="num">${esc(a.studiewijzer || '')}</td><td>${esc(a.wat)}</td><td>${esc(a.waarom || '')}</td><td><span class="chip ${a.soort === 'pta' ? 'rood' : ''}">${a.soort === 'pta' ? 'afwijking PTA' : a.soort === 'pto' ? 'afwijking PTO' : 'alleen jij'}</span></td><td><button class="btn klein" data-afwijkingterug="${esc(a.id)}">ongedaan</button></td></tr>`).join('')}</table></div></div>`;
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
  h += ruimteKaart(gs);
  h += `<div class="knoppen">${lijst.map(x => `<button class="btn" data-groep="${esc(x)}" aria-pressed="${x === g}">${esc(x)}</button>`).join('')}</div>`;
  if (!g) return h;
  const lg = leergangVan(g); const r = reeks(lg); const vi = volgendeIndex(g); const lw = lesweekVan(vandaag());
  const gegeven = r.filter(x => afgerond(status(g, x.id))).length;
  const planI = r.findIndex(x => x.w >= (lw || 0));
  h += `<div class="kaart"><div class="kop"><div><h2>${esc(g)} · ${esc(lgNaam(lg))}</h2><div class="sub">${gegeven} van ${r.length} lessen gegeven${lw && planI >= 0 ? ` · volgens de planning nu bij les ${planI + 1} (lesweek ${lw})` : ''} · volgende: les ${vi + 1}</div></div>
    <label style="font-family:var(--kop);font-size:.85rem;color:var(--muted)">Leergang <select id="gLg" data-g="${esc(g)}">${Object.keys(B.leergangen).map(k => `<option value="${k}" ${k === lg ? 'selected' : ''}>${esc(lgNaam(k))}</option>`).join('')}</select></label></div>
    <div class="knoppen" style="margin-top:.5rem"><button class="btn klein" data-opplan="${esc(g)}">Op de planning zetten</button><span class="sub" style="font-family:var(--kop);font-size:.85rem;color:var(--muted)">alle lessen vóór deze lesweek gelden dan als gegeven</span></div>
    <div class="voortgang" style="margin-top:.6rem"><i style="width:${r.length ? Math.round(gegeven / r.length * 100) : 0}%"></i></div></div>`;
  h += toetsenKaart(g) + afwijkingenKaart(g);
  const bms = BM.filter(m => (m.lessen || []).some(k => k.lg === lg));
  if (bms.length) h += `<div class="kaart"><h2>Beoordelen</h2><p class="lead">Ook om in te halen of na te kijken buiten de toetsles.</p><div class="knoppen" style="margin-top:.5rem">${bms.map(m => { const T = S.beoord.toetsen[m.id + '|' + g]; const n = T ? Object.keys(T.ll).filter(id => T.ll[id].af || BMR.eind(m, T, T, id).e != null).length : 0; return `<button class="btn" data-beoordeel="${esc(m.id)}|${esc(g)}">${esc(m.toets)} ${esc(m.titel.replace(/^[^:]*:\s*/, ''))}${n ? ` (${n} klaar)` : ''}</button>`; }).join('')}</div></div>`;
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
  <div class="kaart"><h2>Rooster uit Zermelo</h2>${zProxy() ? `<p class="lead">Maak in Zermelo een koppelcode aan (Koppelingen, Koppel externe applicatie) en plak die hier. Lesdag leest dan vak, groep, lokaal en soort afspraak rechtstreeks uit Zermelo. De koppeling blijft op dit apparaat. Verwijderen hier trekt hem niet in: dat doe je in Zermelo bij Koppelingen.</p>
    <form class="form" id="zKoppelForm"><div class="rij"><label style="flex:3 1 18rem">Koppelcode <input id="zCode" type="password" autocomplete="off" placeholder="${zApiToken() ? 'gekoppeld op dit apparaat' : '12 cijfers'}"></label><button class="btn hoofd" type="submit">Koppelen</button>${zApiToken() ? '<button class="btn rood" type="button" data-zapiweg="">Koppeling verwijderen</button>' : ''}</div></form>
    <p class="lead">Reserve: als de koppeling niet werkt, gebruikt Lesdag je agendalink. Plak je Zermelo-agendalink (Zermelo portal, Koppelingen, Agenda). Lesdag haalt dan je rooster op, met roosterwijzigingen en vervallen lessen. Behandel de link als een wachtwoord: wie hem heeft, ziet je rooster.</p>
    <form class="form" id="zForm"><div class="rij"><label style="flex:3 1 18rem">Zermelo-link <input id="zLink" type="password" autocomplete="off" placeholder="${S.zermeloToken ? 'opgeslagen (••••' + esc(S.zermeloToken.slice(-4)) + ')' : 'https://csgpm.zportal.nl/api/v3/ical?access_token=…'}"></label><button class="btn hoofd" type="submit">Opslaan en ophalen</button>${zGekoppeld() ? '<button class="btn" type="button" data-zophalen="">Nu ophalen</button>' : ''}${S.zermeloToken ? '<button class="btn rood" type="button" data-zweg="">Link verwijderen</button>' : ''}</div></form>
    <p class="lead" style="font-size:.9rem">${ZC ? `Laatst opgehaald: ${esc(new Date(ZC.opgehaald).toLocaleString('nl-NL'))}, voor ${esc(fmtD(ZC.van))} tot en met ${esc(fmtD(ZC.tot))}, via ${ZC.bron === 'api' ? 'de koppeling' : 'de agendalink'}.` : 'Nog niet opgehaald.'}</p>${zOverzicht()}` : `<p class="lead">De roosterproxy staat nog niet in <code>config.js</code>. Zie LEESMIJ.md, stap 3.</p>`}</div>
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
  // alleen knoppen: het planformulier en de vinkjes hebben ook data-dag, maar een klik daarin mag de pagina niet opnieuw tekenen
  const b = e.target.closest('button,[data-week]'); if (!b) return;
  const D = b.dataset;
  if (D.recnaar) { recFocus = D.recnaar; if (route.naam !== 'reclame') location.hash = 'reclame'; else render(); return; }
  if (D.recalles != null) { recAlles = !recAlles; render(); return; }
  if (D.recmail) { const [soort, aid, mid] = D.recmail.split('|'); b.disabled = true; await recMail(soort, aid, mid); b.disabled = false; return; }
  if (D.reckopie) { const a = reclameActs().find(x => x.id === D.reckopie); const ta = document.querySelector(`[data-rectekst="${CSS.escape(D.reckopie)}"]`); const txt = ta ? ta.value : a ? recTekst(a) : ''; try { await navigator.clipboard.writeText(txt); toast('Tekst gekopieerd'); } catch (err) { if (ta) ta.select(); toast('Kopiëren lukt niet: selecteer en kopieer zelf'); } return; }
  if (D.recbeeld || D.recbord) { const soort = D.recbord ? 'bord' : 'wi'; const a = reclameActs().find(x => x.id === (D.recbord || D.recbeeld)); if (!a) return; b.disabled = true; try { recDownload(RECLAME.bestand(a, soort), await recBestand(a, soort)); } catch (err) { console.warn(err); toast('Maken lukt niet'); } b.disabled = false; return; }
  if (D.recuit) { const r = (S.reclame = S.reclame || {})[D.recuit] = S.reclame[D.recuit] || {}; r.uit = !r.uit; if (!r.uit) delete r.uit; recFocus = D.recuit; bewaar(); return; }
  if (D.recstel) { const r = (S.reclame || {})[D.recstel]; if (r) delete r.tekst; recFocus = D.recstel; bewaar(); return; }
  if (D.recweg) { S.reclameExtra = (S.reclameExtra || []).filter(x => x.id !== D.recweg); if (S.reclame) delete S.reclame[D.recweg]; bewaar(); return; }
  if (D.toastterug != null) { const f = toast.terug; $('#toast').hidden = true; toast.terug = null; if (f) f(); return; }
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
  if (D.afwezigopen != null) { afwezigOpen = !afwezigOpen; render(); return; }
  if (D.afwezigterug) { afwezigTerug([D.afwezigterug]); toast('Je bent er weer; de lessen staan terug'); return; }
  if (D.krapopen) { krapOpen = D.krapopen; krapKeuze = ''; render(); return; }
  if (D.krapoptie) { krapKeuze = D.krapoptie; render(); return; }
  if (D.kraplater) { const i = D.kraplater.indexOf('|'); krapOpen = ''; krapKeuze = ''; stelUit(`krap:${D.kraplater.slice(0, i)}:${D.kraplater.slice(i + 1)}`, addD(vandaag(), 1)); return; }
  if (D.ankeropen != null) { ankerOpen = D.ankeropen; render(); return; }
  if (D.naargroep) { groepKeuze = D.naargroep; location.hash = 'groepen'; return; }
  if (D.berichtkopie) { const ta = document.querySelector(`[data-bericht="${D.berichtkopie}"]`); try { await navigator.clipboard.writeText(ta.value); toast('Gekopieerd'); } catch (err) { ta.select(); toast('Kopiëren lukt niet: selecteer en kopieer zelf'); } return; }
  if (D.berichtklaar) { const a = (S.afwijkingen || []).find(x => x.id === D.berichtklaar); if (a) a.berichtKlaar = true; bewaar(); return; }
  if (D.afwijkingterug) { maakOngedaan(D.afwijkingterug); toast('Teruggezet'); return; }
  if (D.liggenplan) { liggenInPlannen(D.liggenplan); return; }
  if (D.liggenlater) { const i = D.liggenlater.lastIndexOf('|'); stelUit(D.liggenlater.slice(0, i), D.liggenlater.slice(i + 1)); return; }
  if (D.ontplan) { const k = (S.taken || []).find(k => k.id === D.ontplan); if (k) { agSel[k.plan.dag] = ''; delete k.plan; } bewaar(); toast('Uit de agenda gehaald; de taak staat nog in je lijst'); return; }
  if (D.dag != null && route.naam !== 'vandaag') { dagKeuze = D.dag; location.hash = 'vandaag'; return; }
  if (D.dag != null) { dagKeuze = D.dag; render(); return; }
  if (D.week != null) { weekKeuze = D.week; render(); return; }
  if (D.start != null) { const [u, s] = D.start.split('|'); startLes(u || null, s || vandaag()); return; }
  if (D.uitval) { const [s, u] = D.uitval.split('|'); (S.uitval[s] = S.uitval[s] || []).push(u); bewaar(); toast('Les valt uit; de volgende les schuift door', () => { S.uitval[s] = (S.uitval[s] || []).filter(x => x !== u); bewaar(); }); return; }
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
  if (D.zkopie != null) { try { await navigator.clipboard.writeText(zOverzichtTekst()); toast('Gekopieerd. Plak het in de chat bij het nakijken.'); } catch (err) { toast('Kopiëren lukt niet in deze browser'); } return; }
  if (D.zweg != null) { delete S.zermeloToken; if (!zApiToken()) { ZC = null; try { localStorage.removeItem('lesdag-zermelo'); } catch (e) {} } bewaar(); return; }
  if (D.zapiweg != null) { try { localStorage.removeItem(Z_API); } catch (e) {} if (!S.zermeloToken) { ZC = null; try { localStorage.removeItem('lesdag-zermelo'); } catch (e) {} } bewaar(); if (S.zermeloToken) await zOphalen(false); return; }
  if (D.zovernemen != null) { if (!zOverArmed) { zOverArmed = true; render(); setTimeout(() => { zOverArmed = false; if (route.naam === 'rooster') render(); }, 5000); return; }
    zOverArmed = false; const oud = S.rooster; S.rooster = zVastRooster().map(u => { const o = oud.find(x => +x.dag === u.dag && x.start === u.start && x.groep === u.groep); return Object.assign({ id: o ? o.id : 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }, u); }); bewaar(); toast('Rooster overgenomen uit Zermelo'); return; }
  if (D.export != null) { const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'lesdag-' + vandaag() + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); return; }
  if (D.zoek != null) { zoek(); return; }
  if (D.kies != null) { kiesBestand(+D.kies); return; }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.bericht) { const a = (S.afwijkingen || []).find(x => x.id === t.dataset.bericht); if (a) { a.bericht = t.value; bewaar(true); } return; }
  if (t.dataset.liggentot) { if (t.value > vandaag()) stelUit(t.dataset.liggentot, t.value); return; }
  if (t.dataset.sdone) { if (t.checked) S.sectieAf[t.dataset.sdone] = true; else delete S.sectieAf[t.dataset.sdone]; bewaar(); }
  if (t.dataset.taakaf) { const k = (S.taken || []).find(k => k.id === t.dataset.taakaf); if (k) { k.af = t.checked; k.afOp = t.checked ? vandaag() : undefined; if (k.sectieId) { if (t.checked) S.sectieAf[k.sectieId] = true; else delete S.sectieAf[k.sectieId]; } if (k.koorId) { if (t.checked) S.koorAf[k.koorId] = true; else delete S.koorAf[k.koorId]; } if (k.reclameId) { S.reclameAf = S.reclameAf || {}; if (t.checked) S.reclameAf[k.reclameId] = vandaag(); else delete S.reclameAf[k.reclameId]; } if (k.dagTaak) { const dd = S.dagTaken[k.dagTaak.dag] = S.dagTaken[k.dagTaak.dag] || {}; if (t.checked) dd[k.dagTaak.key] = true; else delete dd[k.dagTaak.key]; } } bewaar(); }
  if (t.dataset.recvink) { const id = t.dataset.recvink; S.reclameAf = S.reclameAf || {}; if (t.checked) S.reclameAf[id] = vandaag(); else delete S.reclameAf[id]; (S.taken || []).filter(k => k.reclameId === id).forEach(k => { k.af = t.checked; k.afOp = t.checked ? vandaag() : undefined; }); bewaar(); return; }
  if (t.dataset.recveld) { const i = t.dataset.recveld.lastIndexOf('|'); const id = t.dataset.recveld.slice(0, i), k = t.dataset.recveld.slice(i + 1); const r = (S.reclame = S.reclame || {})[id] = S.reclame[id] || {}; r[k] = t.value.trim(); if (k === 'd' && !r.d) delete r.d; recFocus = id; bewaar(); return; }
  if (t.dataset.rectekst) { const r = (S.reclame = S.reclame || {})[t.dataset.rectekst] = S.reclame[t.dataset.rectekst] || {}; r.tekst = t.value; bewaar(true); return; }
  if (t.dataset.koorvink) { if (t.checked) S.koorAf[t.dataset.koorvink] = true; else delete S.koorAf[t.dataset.koorvink]; bewaar(); }
  if (t.dataset.dagtaak) { const d = t.dataset.dag; S.dagTaken[d] = S.dagTaken[d] || {}; if (t.checked) S.dagTaken[d][t.dataset.dagtaak] = true; else delete S.dagTaken[d][t.dataset.dagtaak]; bewaar(); }
  if (t.id === 'pK') { const n = $('#pNieuw'); if (n) n.hidden = !!t.value; }
  if (t.id === 'gLg') { S.groepLeergang[t.dataset.g] = t.value; bewaar(); }
  if (t.id === 'imp' && t.files[0]) { t.files[0].text().then(txt => { const d = JSON.parse(txt); if (d && d.v) { S = Object.assign(nieuweStaat(), d); bewaar(); toast('Kopie teruggezet'); } }).catch(() => toast('Dit bestand kan ik niet lezen')); }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'afwezigForm') { const v = $('#afVan').value, w = $('#afTot').value; if (v && w && w >= v) zetAfwezig(v, w); else toast('Kies een einddatum op of na de begindatum'); return; }
  if (e.target.id === 'krapForm') { const g = e.target.dataset.g; const R = ruimte(g).find(d => d.id === e.target.dataset.id); if (R && krapKeuze) voerKrapUit(R, krapKeuze); return; }
  if (e.target.id === 'ankerForm') { const g = e.target.dataset.g; const a = ankersVan(g).find(x => x.id === e.target.dataset.id); const reden = ($('#avReden') || {}).value || ''; if (!a || !$('#avUur') || !reden.trim()) { toast('Geef een korte reden'); return; }
    const id = verplaatsAnker(g, a, $('#avUur').value, reden.trim()); if (id) { ankerOpen = ''; bewaar(); toast(S.afwijkingen.find(x => x.id === id).wat, () => maakOngedaan(id)); } return; }
  if (e.target.id === 'zKoppelForm') { const v = $('#zCode').value.trim(); if (v) zKoppel(v); return; }
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
    else if (v.startsWith('rec:')) { const m = reclameMoment(v.slice(4)); if (m) { k = { id: nieuwId(), titel: m.titel, bron: 'reclame', reclameId: m.id, d: m.d, af: false, plan }; S.taken.push(k); } }
    else if (v.startsWith('pres:')) { const it = (planning(dag, dag)[dag].uren || []).find(x => x.item && x.item.id === v.slice(5)); if (it) { k = { id: nieuwId(), titel: 'Presentatie doorlopen: ' + it.u.groep + ' ' + (les(it.item).titel || ''), bron: 'les', dagTaak: { dag, key: 'pres:' + it.item.id }, af: false, plan }; S.taken.push(k); } }
    else { const titel = $('#pT').value.trim(); if (!titel) { toast('Geef de taak een naam'); return; } k = { id: nieuwId(), titel, bron: $('#pB').value, af: false, plan }; S.taken.push(k); }
    if (k) { agSel[dag] = 'taak:' + k.id; bewaar(); toast(`${k.titel} staat op ${fmtD(dag)} om ${van}`); }
    return;
  }
  if (e.target.id === 'tAdd') { const titel = $('#tT').value.trim(); if (!titel) return; (S.taken = S.taken || []).push({ id: 'k' + Date.now().toString(36), titel, bron: $('#tB').value, d: $('#tD').value || undefined, af: false }); bewaar(); return; }
  if (e.target.id === 'recForm') { const titel = $('#recT').value.trim(), d = $('#recD').value; if (!titel || !d) return; const id = 'eigen:' + Date.now().toString(36); (S.reclameExtra = S.reclameExtra || []).push({ id, titel, d, soort: $('#recS').value }); recFocus = id; bewaar(); toast(titel + ' staat erbij'); return; }
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
   Modellen: data/beoordeling.json (uit tools/beoordeling, zonder leerlinggegevens). Rekenregels: bm-reken.js.
   Klassenlijsten en scores staan alleen in S.beoord: op dit apparaat en in de eigen OneDrive, nooit op de server.
   Logboek en gekozen map staan in IndexedDB, los van de staat: een overschreven staat of volle localStorage raakt ze niet. */
let BM = [];
let bmSel = null, bmSelG = null, bmActiefG = null, bmPaneel = null, bmKoppel = null, bmKlasRes = null, bmKlok = null, bmLaagId = null;
let bmMap = null, bmMapStaat = 'geen', bmLaatste = null, bmVuil = false, bmSinds = 0, bmSchrijfT = null, bmVast = null, bmLogFout = false;
const bmVoor = item => BM.filter(m => (m.lessen || []).some(k => k.lg === item.lg && k.w === item.w && k.slot === 'l' + item.li && (k.wat || []).includes('docent')));
const komma = x => x == null ? '' : String(x).replace('.', ',');
const bmKanMap = () => typeof window.showDirectoryPicker === 'function';
const bmTijd = t => { const d = new Date(t); return `${fmtD(ymd(d))} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
function bmToets(mid, g) { const k = mid + '|' + g; return S.beoord.toetsen[k] || (S.beoord.toetsen[k] = { ll: {}, volgorde: [], start: vandaag() }); }
function bmRij(L, id) { return L.ll[id] || (L.ll[id] = { s: {}, v: {}, opm: {} }); }
const bmLaag = T => (T.tussen || []).find(x => x.id === bmLaagId) || T;
function bmVolgorde(T, lijst) { const ids = lijst.map(x => x.id); const v = (T.volgorde || []).filter(id => ids.includes(id)); ids.forEach(id => { if (!v.includes(id)) v.push(id); }); T.volgorde = v;
  if (!(T.groepjes || []).length) return v; const rang = id => { const i = T.groepjes.findIndex(g => g.leden.includes(id)); return i < 0 ? T.groepjes.length : i; }; return v.map((id, i) => [rang(id), i, id]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]); }
function bmParse(txt) { // Magister: één leerling per regel, kolommen met tabs; nummers en klascodes vallen weg
  return txt.split(/\r?\n/).filter(r => !r.split('\t').some(x => /^(nr\.?|nummer|naam|leerlingen|leerling|achternaam|roepnaam|voornaam|tussenvoegsel|stamnummer|klas|groep)$/i.test(x.trim()))).map(r => r.split('\t').map(x => x.trim()).filter(x => x && !/^\d+$/.test(x) && !/^[a-z]{0,2}\d[a-z0-9]{0,3}$/i.test(x)).join(' ').replace(/\s+/g, ' ').trim())
    .filter(n => n && !/^(naam|leerling|leerlingen|achternaam|roepnaam|stamnummer|klas|groep)\b/i.test(n));
}
function bmDownload(naam, inhoud, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(inhoud instanceof Blob ? inhoud : new Blob([inhoud], { type })); a.download = naam; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000); }
const bmBestand = (m, g, rest) => `${m.toets} ${m.klas} ${g} ${rest}`.replace(/[\\/:*?"<>|·]/g, ' ').replace(/\s+/g, ' ').trim();
const bmCel = x => { const s = x == null ? '' : String(x); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

/* logboek en map: IndexedDB */
let bmDbP = null;
function bmDB() { return bmDbP || (bmDbP = new Promise((ok, nee) => { const q = indexedDB.open('lesdag-beoordeling', 1);
  q.onupgradeneeded = () => { const s = q.result.createObjectStore('log', { autoIncrement: true }); s.createIndex('k', 'k'); q.result.createObjectStore('kv'); };
  q.onsuccess = () => ok(q.result); q.onerror = () => nee(q.error); })); }
const bmIdb = (store, mode, f) => bmDB().then(db => new Promise((ok, nee) => { const t = db.transaction(store, mode); const r = f(t.objectStore(store)); t.oncomplete = () => ok(r && r.result); t.onerror = t.onabort = () => nee(t.error); }));
function bmLog(k, e) { bmIdb('log', 'readwrite', s => s.add(Object.assign({ t: Date.now(), k }, e))).then(() => { if (bmLogFout) { bmLogFout = false; bmStatusVervers(); } }).catch(err => { bmLogFout = true; bmStatusVervers(); console.warn(err); }); }
const bmLogVan = k => bmIdb('log', 'readonly', s => s.index('k').getAll(k));
const bmToepassen = (L, e) => { // één tik of tekst toepassen
  if (e.a === 'gs') { const G = (L.gs = L.gs || {}); const x = (G[e.id] = G[e.id] || {}); if (e.w == null) delete x[e.c]; else x[e.c] = e.w; return; }
  const r = bmRij(L, e.id);
  if (e.a === 's') { if (e.w == null) delete r.s[e.c]; else r.s[e.c] = e.w; }
  else if (e.a === 'zelf') { if (e.w == null) delete r.zelf; else r.zelf = e.w; }
  else if (e.a === 'af') r.af = e.w;
  else if (e.a === 'v') r.v[e.c] = e.w;
  else if (e.a === 'opm') r.opm[e.c] = e.w;
  else if (e.a === 'vooruit') r.vooruit = e.w;
  else if (e.a === 'papier') r.klas = Object.assign(r.klas || {}, { papier: e.w });
  else if (e.a === 'forms') r.klas = Object.assign(r.klas || {}, { forms: e.w });
};
function bmZet(k, T, a, id, c, w, stil) { const L = bmLaag(T); const e = { a, id, c, w, l: L === T ? null : L.id }; bmToepassen(L, e); bmLog(k, e); bmVuil = true; if (bmMapStaat === 'ok') { clearTimeout(bmSchrijfT); bmSchrijfT = setTimeout(() => bmSchrijf(), 3000); } bewaar(stil); }

/* reserve: gekozen map op de computer, anders een download na elke groep */
async function bmPersist() { try { if (navigator.storage && navigator.storage.persist) { bmVast = await navigator.storage.persisted() || await navigator.storage.persist(); bmStatusVervers(); } } catch (e) { bmVast = false; } }
async function bmMapLaden() { try { if (!bmKanMap()) return; const h = await bmIdb('kv', 'readonly', s => s.get('map')); if (!h) return; bmMap = h; const p = h.queryPermission ? await h.queryPermission({ mode: 'readwrite' }) : 'granted'; bmMapStaat = p === 'granted' ? 'ok' : 'toestemming'; bmStatusVervers(); } catch (e) { console.warn(e); } }
function bmHuidig() { const m = BM.find(x => x.id === decodeURIComponent(route.arg[0] || '')); const g = decodeURIComponent(route.arg[1] || ''); return route.naam === 'beoordelen' && m && g ? { m, g, k: m.id + '|' + g } : null; }
async function bmReserveTekst(m, g) { const k = m.id + '|' + g; let log = []; try { log = await bmLogVan(k); } catch (e) {} return JSON.stringify({ soort: 'lesdag-beoordeling-reserve', v: 1, gemaakt: new Date().toISOString(), model: m.id, titel: m.titel, groep: g, lijst: S.beoord.lijsten[g] || [], weg: (S.beoord.weg || {})[g] || [], toets: S.beoord.toetsen[k] || null, log }); }
async function bmSchrijf() { const c = bmHuidig(); if (!c || !bmMap || bmMapStaat !== 'ok') return false; clearTimeout(bmSchrijfT);
  try { for (const [naam, inhoud] of [[bmBestand(c.m, c.g, 'reserve.json'), await bmReserveTekst(c.m, c.g)], [bmBestand(c.m, c.g, 'scoreblad.csv'), bmCsv(c.m, c.g)]]) { const f = await bmMap.getFileHandle(naam, { create: true }); const w = await f.createWritable(); await w.write(inhoud); await w.close(); }
    bmLaatste = Date.now(); bmVuil = false; bmSinds = 0; bmStatusVervers(); return true; }
  catch (e) { console.warn(e); bmMapStaat = 'fout'; bmStatusVervers(); toast('Wegschrijven naar de map lukt niet: er komt nu een download'); await bmDownloadReserve(c.m, c.g); return false; } }
async function bmDownloadReserve(m, g) { const d = new Date(); bmDownload(bmBestand(m, g, `reserve ${ymd(d)} ${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.json`), await bmReserveTekst(m, g), 'application/json'); bmLaatste = Date.now(); bmVuil = false; bmSinds = 0; bmStatusVervers(); }
const bmReserveNu = (m, g) => bmMapStaat === 'ok' ? bmSchrijf() : bmDownloadReserve(m, g);
function bmGroepLabel(T, id) { const G = BMR.groepVan(T, id); if (G) return G.naam; const r = T.ll[id]; return r && r.v ? String(r.v.Groep || '').trim() : ''; }
function bmNaVolgende(m, g, T, oud, nieuw) { // na elke groep een reserve; zonder groepsindeling na elke vijf leerlingen
  bmSinds++; if (!bmVuil) return; if (bmMapStaat === 'ok') { bmSchrijf(); return; }
  const a = bmGroepLabel(T, oud), b = bmGroepLabel(T, nieuw); if ((a && a !== b) || (!a && bmSinds >= 5)) { bmDownloadReserve(m, g); toast('Reserve gedownload'); } }
function bmStatusHtml() {
  const uur = bmLaatste ? ` · laatste ${new Date(bmLaatste).getHours()}:${String(new Date(bmLaatste).getMinutes()).padStart(2, '0')}` : '';
  let r;
  if (bmMapStaat === 'ok') r = `<span class="chip">Reserve in map ${esc(bmMap.name || '')}${uur}</span><button class="btn klein" data-bm="mapkies">Andere map</button>`;
  else if (bmMapStaat === 'toestemming') r = `<span class="chip let">Map ${esc(bmMap.name || '')} wacht op toestemming</span><button class="btn klein hoofd" data-bm="maptoe">Toestaan</button>`;
  else if (bmMapStaat === 'fout') r = `<span class="chip rood">Wegschrijven naar de map mislukt${uur}</span><button class="btn klein" data-bm="mapkies">Kies opnieuw</button>`;
  else if (bmKanMap()) r = `<span class="chip let">Nog geen reservemap: download na elke groep${uur}</span><button class="btn klein" data-bm="mapkies">Map kiezen</button>`;
  else r = `<span class="chip">Reserve: download na elke groep${uur}</span>`;
  return `${r}<button class="btn klein" data-bm="reserve">Reserve nu</button><button class="btn klein" data-bm="logboek">Logboek</button><label class="btn klein">Terugzetten<input type="file" accept=".json" data-bmherstel hidden></label>${bmVast === false ? '<span class="chip let" title="De browser kan deze gegevens wissen bij ruimtegebrek">Opslag niet vast</span>' : ''}${bmLogFout ? '<span class="chip rood">Logboek schrijft niet</span>' : ''}`;
}
function bmStatusVervers() { const el = document.getElementById('bmStatus'); if (el) el.innerHTML = bmStatusHtml(); }

/* panelen */
function bmLijstKaart(g, lijst) {
  return `<div class="kaart bm"><h2>Klassenlijst ${esc(g)}</h2><p class="lead">Kopieer de namen uit Magister en plak ze hieronder, één leerling per regel. Nummers en klascodes haalt de app er zelf uit. De namen blijven op dit apparaat en in je eigen OneDrive. De cijferkolom voor Magister volgt de volgorde van deze lijst.</p>
    <textarea id="bmLijst" rows="14" style="width:100%;margin:.6rem 0">${esc(lijst.map(x => x.naam).join('\n'))}</textarea>
    <div class="knoppen"><button class="btn hoofd" data-bm="lijstopslaan">Opslaan</button>${lijst.length ? '<button class="btn" data-bm="dicht">Annuleren</button>' : ''}</div></div>`;
}
function bmHeeftScores(g, id) { return Object.entries(S.beoord.toetsen).some(([k, T]) => k.endsWith('|' + g) && T.ll[id] && (Object.keys(T.ll[id].s || {}).length || T.ll[id].zelf != null)); }
function bmKoppelKaart(g) {
  const { rij, vrij } = bmKoppel; const open = rij.filter(u => !u.id);
  return `<div class="kaart bm"><h2>Namen koppelen</h2><p class="lead">Deze namen staan niet precies zo op de oude lijst. Kies wie het is, dan blijven de scores bij die leerling.</p>
    ${open.map(u => `<label class="bm-koppel"><span>${esc(u.naam)}</span><select data-bmkop="${rij.indexOf(u)}"><option value="">Nieuwe leerling</option>${vrij.map(o => `<option value="${esc(o.id)}" ${o.id === u.voorstel ? 'selected' : ''}>${esc(o.naam)}${bmHeeftScores(g, o.id) ? ' (heeft scores)' : ''}</option>`).join('')}</select></label>`).join('')}
    <p class="lead" style="margin-top:.6rem">Niet gekoppelde leerlingen gaan van de lijst af. Hun scores blijven bewaard en je kunt ze later weer koppelen.</p>
    <div class="knoppen"><button class="btn hoofd" data-bm="koppelklaar">Lijst opslaan</button><button class="btn" data-bm="lijst">Terug</button></div></div>`;
}
function bmKolomKaart(m, g, T, lijst) {
  const rij = lijst.map(x => { const r = T.ll[x.id]; const u = BMR.eind(m, T, T, x.id); return { naam: x.naam, r, u, c: r && r.vast ? BMR.fmt(r.vast.e) : '' }; });
  const open = rij.filter(x => !x.c && x.u.e != null && !(x.r && x.r.af)); const leeg = rij.filter(x => !x.c).length;
  return `<div class="kaart bm"><h2>Cijferkolom voor Magister</h2><p class="lead">In de volgorde van de klassenlijst, één regel per leerling. Alleen afgeronde cijfers; bij inhalen of zonder cijfer blijft de cel leeg. Klik in Magister op de eerste cel van de kolom en plak.</p>
    ${open.length ? `<p class="bm-waarsch">${open.length} ${open.length === 1 ? 'leerling heeft' : 'leerlingen hebben'} een cijfer dat nog niet is afgerond. <button class="btn klein hoofd" data-bm="afronden">Nu afronden</button></p>` : ''}
    <div class="knoppen"><button class="btn hoofd" data-bm="kolomkopie" ${rij.some(x => x.c) ? '' : 'disabled'}>Kopieer kolom</button><button class="btn" data-bm="dicht">Terug</button></div>
    <p>${rij.length} regels, ${rij.length - leeg} cijfers, ${leeg} leeg.</p>
    <textarea id="bmKolom" readonly hidden rows="4">${esc(BMR.kolom(T, lijst).join('\n'))}</textarea>
    <table class="bm-kolom"><thead><tr><th>Leerling</th><th>Cijfer</th><th></th></tr></thead><tbody>${rij.map(x => `<tr><td>${esc(x.naam)}</td><td class="c">${esc(x.c)}</td><td>${x.c ? '' : x.r && x.r.af ? 'inhalen' : x.u.e != null ? 'nog afronden' : 'geen cijfer'}</td></tr>`).join('')}</tbody></table></div>`;
}
function bmGroepjesKaart(m, T, lijst) {
  const G = T.groepjes || []; const naam = id => (lijst.find(x => x.id === id) || {}).naam || ''; const los = lijst.filter(x => !BMR.groepVan(T, x.id));
  if (!G.some(x => x.id === bmActiefG)) bmActiefG = G.length ? G[G.length - 1].id : null;
  const groepC = BMR.critVan(m, T).filter(c => c.groepsscore).map(c => c.naam + (c.groepsscore === 'start' ? ' (startpunt)' : ''));
  return `<div class="kaart bm"><h2>Groepjes</h2><p class="lead">Eén keer scoren voor de groep: ${esc(groepC.join(', '))}. De rest per leerling. Kies een groepje en tik op de namen. Tik op een naam in een groepje om die eruit te halen.</p>
    ${G.map(x => `<div class="bm-gkaart ${x.id === bmActiefG ? 'actief' : ''}"><div class="regel"><button class="btn klein ${x.id === bmActiefG ? 'hoofd' : ''}" data-bmgactief="${x.id}">${x.id === bmActiefG ? 'Actief' : 'Kies'}</button><input data-bmgnaam="${x.id}" value="${esc(x.naam)}" aria-label="Naam groepje"><button class="btn klein" data-bmgweg="${x.id}">Verwijder</button></div><div class="bm-chips">${x.leden.map(id => `<button class="bm-chip in" data-bmgruit="${id}">${esc(naam(id))}</button>`).join('') || '<small>Nog leeg</small>'}</div></div>`).join('')}
    <div class="knoppen" style="margin:.5rem 0"><button class="btn" data-bm="gnieuw">Nieuw groepje</button><button class="btn hoofd" data-bm="dicht">Klaar</button></div>
    <h3 class="bm-groep">Nog niet ingedeeld (${los.length})</h3><div class="bm-chips">${los.map(x => `<button class="bm-chip" data-bmgin="${x.id}" ${bmActiefG ? '' : 'disabled'}>${esc(x.naam)}</button>`).join('')}</div></div>`;
}
function bmKlasKaart(m, T, lijst) {
  const R = bmKlasRes; const min = +m.klasgenotenMin || 3;
  let h = `<div class="kaart bm"><h2>Klasgenoten</h2><p class="lead">Open de antwoorden van Forms in Excel, selecteer de hele tabel met de kolomkoppen, kopieer en plak hier. Een nieuwe plak vervangt de vorige; papieren cijfers blijven staan. Minimaal ${min} inzendingen per leerling, anders geen eindcijfer.</p>
    <textarea id="bmKlasPlak" rows="6" style="width:100%;margin:.6rem 0"></textarea><div class="knoppen"><button class="btn hoofd" data-bm="klaslees">Lezen</button><button class="btn" data-bm="dicht">Terug</button></div>`;
  if (R && R.fout) h += `<p class="bm-waarsch">${esc(R.fout)}</p>`;
  else if (R) { h += `<h3 class="bm-groep">Gelezen: ${esc(R.vorm)}, ${R.rijen} regels</h3>${R.ongeldig ? `<p class="bm-waarsch">${R.ongeldig} ${R.ongeldig === 1 ? 'antwoord is' : 'antwoorden zijn'} geen cijfer van 1 tot 10 en ${R.ongeldig === 1 ? 'telt' : 'tellen'} niet mee.</p>` : ''}${R.zelf ? `<p class="lead">${R.zelf} ${R.zelf === 1 ? 'beoordeling' : 'beoordelingen'} van de eigen uitvoering overgeslagen.</p>` : ''}
      ${R.onbekend.map((o, i) => { const v = BMR.besteMatch(o.label, lijst); return `<label class="bm-koppel"><span>${esc(o.label)} (${o.w.length})</span><select data-bmklask="${i}"><option value="">Niet meetellen</option>${lijst.map(x => `<option value="${x.id}" ${v && v.id === x.id ? 'selected' : ''}>${esc(x.naam)}</option>`).join('')}</select></label>`; }).join('')}
      <table class="bm-kolom"><thead><tr><th>Leerling</th><th>Inzendingen</th><th>Gemiddelde</th></tr></thead><tbody>${lijst.map(x => { const w = R.per[x.id] || []; const p = ((T.ll[x.id] || {}).klas || {}).papier || []; const n = w.length + p.length; const g = BMR.klasgenoten({ klas: { forms: w, papier: p } }, min).gem; return `<tr><td>${esc(x.naam)}</td><td>${w.length}${p.length ? ' + ' + p.length + ' papier' : ''}</td><td class="c">${g != null ? BMR.fmt(g) : n ? 'te weinig' : ''}</td></tr>`; }).join('')}</tbody></table>
      <div class="knoppen" style="margin-top:.6rem"><button class="btn hoofd" data-bm="klasover">Overnemen</button></div>`; }
  return h + '</div>';
}
function bmGroepKaart(m, T, L, G, lijst) {
  const naam = id => (lijst.find(x => x.id === id) || {}).naam || ''; const gs = (L.gs || {})[G.id] || {};
  let h = `<div class="kaart bm-scoor"><div class="kop"><h2>${esc(G.naam)}</h2><div class="knoppen"><button class="btn klein" data-bm="klok"><span id="bmKlok">${bmKlok ? pad(Math.floor((Date.now() - bmKlok) / 1000)) : '0:00'}</span>&nbsp;${bmKlok ? 'stop' : 'start'}</button></div></div><p class="lead">${esc(G.leden.map(naam).join(', ') || 'Nog geen leden')}</p>`;
  for (const c of BMR.critVan(m, T).filter(x => x.groepsscore)) { const v = gs[c.id] == null ? null : gs[c.id];
    h += `<div class="bm-crit grp"><div class="bm-cnaam"><b>${esc(c.naam)}</b><small>${esc(c.uitleg || '')} · weegt ${c.weging}×${c.groepsscore === 'start' ? ' · startpunt: telt pas na bevestiging per leerling' : ''}</small></div>
      <div class="bm-rij">${bmKnoppen(esc(c.id) + '|', 'data-bmgs', v, false)}${v != null ? `<button type="button" class="bm-wis" data-bmgswis="${esc(c.id)}" aria-label="Score wissen" title="Score wissen">×</button>` : ''}</div><p class="bm-niv">${esc(bmNiveauTekst(c, v))}</p></div>`; }
  return h + `<div class="bm-voet"><div><span>Geldt voor iedereen zonder eigen score</span></div><div class="knoppen"><button class="btn hoofd" data-bm="gverder">Naar de leerlingen</button></div></div></div>`;
}
function bmBladInfo(m, g, T, L, id, naam) { // alles wat op het feedbackblad komt
  const r = L.ll[id] || { s: {}, v: {}, opm: {} }; const u = BMR.eind(m, L, T, id); const D = u.delen; const tus = L !== T; const dicht = !tus && !!r.vast;
  const tekst = (c, v) => { if (v == null) return ''; const i = [4, 6, 8, 10].indexOf(v); return i >= 0 ? ((c.leerling || c.docent || [])[i] || '') : `Tussen ${v - 1} en ${v + 1}.`; };
  const onderdelen = bmOnderdelen(m, T).map(o => ({ groep: o.groep, opm: (r.opm || {})[o.groep] || '', crit: o.criteria.map(c => { const q = dicht ? (r.vast.s[c.id] || {}) : BMR.scoreVan(L, T, id, c); const v = q.v == null ? null : q.v; return { naam: c.naam, score: v, tekst: tekst(c, v), bron: q.b === 'groep' ? 'groepsscore' : '' }; }) }));
  const cijfers = tus ? [['Tussenstand', u.d == null ? '' : BMR.fmt(u.d), true]] : D.docent < 100 ? [[`Cijfer docent (${D.docent}%)`, BMR.fmt(u.d)], ...(D.zelf ? [[(m.zelfSoort === 'cijfer' ? 'Eigen cijfer' : 'Zelfbeoordeling') + ` (${D.zelf}%)`, BMR.fmt(u.z)]] : []), ...(D.klasgenoten ? [[`Klasgenoten (${D.klasgenoten}%, ${u.kn} inzendingen)`, BMR.fmt(u.k)]] : []), ['Eindcijfer', BMR.fmt(u.e), true]] : [['Cijfer', BMR.fmt(u.d), true]];
  const velden = (m.velden || []).map(v => (r.v || {})[v] ? `${v}: ${r.v[v]}` : '').filter(Boolean).join(' · ');
  return { eyebrow: `${m.klas} · ${m.toets}${m.weging ? ' · weging ' + m.weging : ''}`, titel: m.titel, docTitel: `Feedback ${m.toets}`, naam, regel: [`Groep ${g}`, velden].filter(Boolean).join(' · '), banner: tus ? `Tussenstand ${L.naam} (${fmtD(L.op)}): telt niet mee voor het cijfer` : '',
    onderdelen, vooruitKop: m.vooruit || 'Eén punt om aan te werken', vooruit: r.vooruit || '', cijfers, voet: `${tus ? 'Tussenstand' : dicht ? 'Afgerond op ' + new Date(r.vast.op).toLocaleString('nl-NL') : 'Nog niet afgerond'} · CSG Prins Maurits, muziek` };
}
function bmNiveauTekst(c, v) {
  if (v == null) return '';
  const i = [4, 6, 8, 10].indexOf(v); if (i >= 0) return (c.docent || [])[i] || '';
  return `Tussen ${v - 1} en ${v + 1}.`;
}
const bmKnoppen = (naam, attr, waarde, dicht, spook) => `<div class="bm-knoppen">${[4, 5, 6, 7, 8, 9, 10].map(x => `<button type="button" class="${x % 2 ? 'tussen' : ''} ${spook === x && waarde !== x ? 'spook' : ''}" ${attr}="${naam}${x}" aria-pressed="${waarde === x}" ${dicht ? 'disabled' : ''}>${x}</button>`).join('')}</div>`;
function bmCritHtml(c, L, T, id, r, dicht) {
  const q = dicht ? ((r.vast.s || {})[c.id] || { v: null, b: null }) : BMR.scoreVan(L, T, id, c); const eigen = dicht ? (q.b === 'eigen' ? q.v : null) : (r.s[c.id] == null ? null : r.s[c.id]);
  const spook = dicht ? (q.b === 'groep' ? q.v : null) : q.g; const inGroep = !dicht && BMR.groepVan(T, id) && c.groepsscore;
  let bron = ''; if (inGroep) { if (eigen != null) bron = `Eigen score${q.g != null ? `, groep gaf ${q.g}` : ''}`; else if (q.g != null) bron = c.groepsscore === true ? `Groepsscore ${q.g} geldt` : `Startpunt groep ${q.g}: tik om te bevestigen of wijk af`; else bron = 'Nog geen groepsscore'; }
  else if (dicht && q.b === 'groep') bron = 'Groepsscore';
  const toon = q.v == null ? q.g : q.v;
  return `<div class="bm-crit ${c.groepsscore ? 'grp' : ''}"><div class="bm-cnaam"><b>${esc(c.naam)}</b><small>${esc(c.uitleg || '')} · weegt ${c.weging}×</small></div>
    <div class="bm-rij">${bmKnoppen(esc(c.id) + '|', 'data-bmscore', eigen, dicht, spook)}${!dicht && eigen != null ? `<button type="button" class="bm-wis" data-bmwis="${esc(c.id)}" aria-label="Score wissen" title="Score wissen">×</button>` : ''}</div>
    <p class="bm-niv">${bron ? `<b>${esc(bron)}.</b> ` : ''}${esc(bmNiveauTekst(c, toon))}</p></div>`;
}
const bmOnderdelen = (m, T) => { if (!T.vast) return m.onderdelen; const uit = []; for (const c of T.vast.crit) { let o = uit.find(x => x.groep === c.groep); if (!o) uit.push(o = { groep: c.groep, stuk: (m.onderdelen.find(x => x.groep === c.groep) || {}).stuk, criteria: [] }); o.criteria.push(c); } return uit; };
function viewBeoordelen() {
  const m = BM.find(x => x.id === decodeURIComponent(route.arg[0] || '')); const g = decodeURIComponent(route.arg[1] || '');
  if (!m || !g) return `<div class="kaart"><p>Dit beoordelingsmodel is niet gevonden.</p><p><a class="btn" href="#vandaag">Terug naar vandaag</a></p></div>`;
  const lijst = S.beoord.lijsten[g] || []; const heeft = lijst.length > 0;
  let h = `<div class="kop bm"><div><p class="eyebrow">${esc(m.klas)} · groep ${esc(g)} · ${esc(m.toets)}${m.weging ? ' · weging ' + esc(m.weging) : ''}</p><h1>${esc(m.titel)}</h1></div>
    <div class="knoppen"><button class="btn" data-bm="lijst">Klassenlijst</button>${heeft && BMR.critVan(m, S.beoord.toetsen[m.id + '|' + g]).some(c => c.groepsscore) ? '<button class="btn" data-bm="groepjes">Groepjes</button>' : ''}${heeft && m.delen && m.delen.klasgenoten ? '<button class="btn" data-bm="klasgenoten">Klasgenoten</button>' : ''}${heeft ? '<button class="btn" data-bm="kolom">Cijferkolom</button><button class="btn" data-bm="export">Scoreblad downloaden</button>' : ''}<a class="btn" href="#vandaag">Klaar</a></div></div>
    <div class="bm-status" id="bmStatus">${bmStatusHtml()}</div>`;
  if (bmPaneel === 'koppel' && bmKoppel) return h + bmKoppelKaart(g);
  if (!heeft || bmPaneel === 'lijst') return h + bmLijstKaart(g, lijst);
  const T = bmToets(m.id, g);
  if (bmPaneel === 'kolom') return h + bmKolomKaart(m, g, T, lijst);
  if (bmPaneel === 'groepjes') return h + bmGroepjesKaart(m, T, lijst);
  if (bmPaneel === 'klasgenoten') return h + bmKlasKaart(m, T, lijst);
  const L = bmLaag(T); const vol = bmVolgorde(T, lijst); const naam = id => (lijst.find(x => x.id === id) || {}).naam || '';
  const uitk = id => BMR.eind(m, L, T, id); const klaar = id => { const r = L.ll[id]; return (r && r.af) || uitk(id).e != null; };
  const cur = vol.includes(bmSel) ? bmSel : (vol.find(id => !klaar(id)) || vol[0]); bmSel = cur;
  const cijfers = vol.map(id => uitk(id).e).filter(x => x != null); const nVast = vol.filter(id => T.ll[id] && T.ll[id].vast).length; const nOpen = vol.filter(id => !(T.ll[id] && (T.ll[id].vast || T.ll[id].af)) && BMR.eind(m, T, T, id).e != null).length;
  h += `<div class="bm-lagen"><button class="btn klein ${L === T ? 'hoofd' : ''}" data-bmlaag="">Toets</button>${(T.tussen || []).map(x => `<button class="btn klein ${L === x ? 'hoofd' : ''}" data-bmlaag="${x.id}">${esc(x.naam)}</button>`).join('')}<button class="btn klein" data-bm="tussennieuw">+ Tussenstand</button>${L !== T ? '<button class="btn klein" data-bm="tussenweg">Verwijder deze</button>' : ''}</div>
    ${L !== T ? `<p class="bm-vast"><b>Tussenstand ${esc(L.naam)}.</b> Telt niet mee voor het cijfer en krijgt geen kolom in Magister.</p>` : ''}`;
  const gKop = (T.groepjes || []).length; const G = gKop && bmSelG ? T.groepjes.find(x => x.id === bmSelG) : null; if (!G) bmSelG = null;
  const rijHtml = id => { const r = L.ll[id]; const u = uitk(id); return `<li class="${!G && id === cur ? 'nu' : ''} ${klaar(id) ? 'klaar' : ''}"><button class="bm-naam" data-bmkies="${id}">${esc(naam(id))}</button><span class="bm-c">${L === T && r && r.vast ? BMR.fmt(u.e) + ' ✓' : r && r.af ? 'inhalen' : u.e != null ? komma(u.e) : u.d != null ? u.mist.join(', ') + '?' : ''}</span><span class="bm-pijl"><button class="btn klein" data-bmop="${id}|-1" aria-label="eerder">▲</button><button class="btn klein" data-bmop="${id}|1" aria-label="later">▼</button></span></li>`; };
  h += `<div class="bm-raster"><div class="kaart bm-lijst"><div class="regel"><b>${vol.filter(klaar).length} van ${vol.length} klaar</b>${cijfers.length ? `<span class="chip">gemiddeld ${komma(BMR.rond1(cijfers.reduce((a, b) => a + b, 0) / cijfers.length))}</span>` : ''}<button class="btn klein" data-bm="loten">Volgorde loten</button></div>
    ${L === T && (T.vast || nOpen) ? `<div class="regel">${T.vast ? `<span class="chip">${nVast} afgerond · ${esc(bmTijd(T.vast.laatst))}</span>` : ''}${nOpen ? `<button class="btn klein hoofd" data-bm="afronden">Afronden (${nOpen})</button>` : ''}</div>` : ''}
    <div class="regel"><button class="btn klein" data-bm="pdfalle">Alle feedbackbladen</button></div>
    <ol>${gKop ? [...T.groepjes.map(x => `<li class="bm-gkop ${G === x ? 'nu' : ''}"><button class="bm-naam" data-bmgkies="${x.id}">${esc(x.naam)}${(L.gs || {})[x.id] && Object.keys(L.gs[x.id]).length ? ' ✓' : ''}</button></li>${vol.filter(id => x.leden.includes(id)).map(rijHtml).join('')}`), vol.some(id => !BMR.groepVan(T, id)) ? '<li class="bm-gkop"><span class="bm-naam">Geen groepje</span></li>' + vol.filter(id => !BMR.groepVan(T, id)).map(rijHtml).join('') : ''].join('') : vol.map(rijHtml).join('')}</ol></div>`;
  return h + (G ? bmGroepKaart(m, T, L, G, lijst) : bmScoorKaart(m, T, L, cur, naam(cur))) + '</div>';
}
function bmScoorKaart(m, T, L, cur, naam) {
  const r = bmRij(L, cur); const dicht = L === T && !!r.vast; const u = BMR.eind(m, L, T, cur); const D = u.delen; const zb = D.zelf || 0;
  let h = `<div class="kaart bm-scoor"><div class="kop"><h2>${esc(naam)}</h2><div class="knoppen"><button class="btn klein" data-bm="klok"><span id="bmKlok">${bmKlok ? pad(Math.floor((Date.now() - bmKlok) / 1000)) : '0:00'}</span>&nbsp;${bmKlok ? 'stop' : 'start'}</button><label class="chk"><input type="checkbox" data-bmaf ${r.af ? 'checked' : ''} ${dicht ? 'disabled' : ''}><span>afwezig, inhalen</span></label></div></div>
    ${dicht ? `<p class="bm-vast"><b>Afgerond</b> op ${esc(bmTijd(r.vast.op))} met cijfer ${BMR.fmt(r.vast.e)}. <button class="btn klein" data-bm="heropen">Wijzigen</button></p>` : ''}
    <div class="bm-velden">${(m.velden || []).map(v => `<label>${esc(v)}<input data-bmveld="${esc(v)}" value="${esc(r.v[v] || '')}"></label>`).join('')}</div>`;
  for (const o of bmOnderdelen(m, T)) {
    h += `<h3 class="bm-groep">${esc(o.groep)}${o.stuk ? ` <small>${esc(o.stuk)}</small>` : ''}</h3>`;
    for (const c of o.criteria) h += bmCritHtml(c, L, T, cur, r, dicht);
    h += `<label class="bm-opm">Opmerking ${esc(o.groep.toLowerCase())}<textarea rows="2" data-bmopm="${esc(o.groep)}">${esc(r.opm[o.groep] || '')}</textarea></label>`;
  }
  const zv = dicht ? r.vast.z : (r.zelf == null ? null : r.zelf);
  if (zb && m.zelfSoort === 'cijfer') h += `<h3 class="bm-groep">Eigen cijfer <small>${zb}% van het eindcijfer: het overall-cijfer dat de leerling zichzelf geeft</small></h3>
    <label class="bm-cijfer">Cijfer van de leerling<input data-bmzelfc inputmode="decimal" value="${zv == null ? '' : komma(zv)}" ${dicht ? 'disabled' : ''}></label>`;
  else if (zb) h += `<h3 class="bm-groep">Zelfbeoordeling <small>${zb}% van het eindcijfer: hoe eerlijk en concreet beoordeelt de leerling de eigen uitvoering?</small></h3>
    <div class="bm-rij">${bmKnoppen('', 'data-bmzelf', zv, dicht)}${!dicht && zv != null ? '<button type="button" class="bm-wis" data-bmwis="" aria-label="Score wissen" title="Score wissen">×</button>' : ''}</div>`;
  if (D.klasgenoten) { const k = (r.klas || {}); const min = +m.klasgenotenMin || 3; h += `<h3 class="bm-groep">Klasgenoten <small>${D.klasgenoten}% van het eindcijfer, minimaal ${min} inzendingen</small></h3>
    <p class="bm-niv"><b>${u.k != null ? 'Gemiddeld ' + komma(u.k) : 'Nog geen gemiddelde'}</b> uit ${u.kn} ${u.kn === 1 ? 'inzending' : 'inzendingen'}${(k.forms || []).length ? ` (${k.forms.length} uit Forms)` : ''}.${!dicht && u.k == null ? ' Geen eindcijfer zolang dit deel ontbreekt.' : ''}</p>
    <label class="bm-cijfer">Papieren cijfers, met spaties ertussen<input data-bmpapier inputmode="decimal" value="${esc((k.papier || []).map(komma).join(' '))}" ${dicht ? 'disabled' : ''}></label>`; }
  h += `<label class="bm-opm">${esc(m.vooruit || 'Eén punt om aan te werken')}<textarea rows="2" data-bmvooruit>${esc(r.vooruit || '')}</textarea></label>
    <div class="bm-voet"><div><span>${L === T ? 'Cijfer docent' : 'Tussenstand'} <b>${u.d != null ? komma(u.d) : '–'}</b></span>${D.docent < 100 ? `<span>Eindcijfer <b>${u.e != null ? komma(u.e) : '–'}</b></span>${u.mist.length && u.d != null ? `<small>mist: ${esc(u.mist.join(', '))}</small>` : ''}` : ''}</div>
    <div class="knoppen"><button class="btn" data-bm="pdf">Feedbackblad</button><button class="btn" data-bm="vorige">Vorige</button><button class="btn hoofd" data-bm="volgende">Volgende</button></div></div></div>`;
  return h;
}
function bmCsv(m, g) {
  const lijst = S.beoord.lijsten[g] || []; const T = bmToets(m.id, g); const C = BMR.critVan(m, T); const D = BMR.delenVan(m, T);
  const heeftG = C.some(c => c.groepsscore) && (T.groepjes || []).length; const volg = bmVolgorde(T, lijst);
  const kop = ['Leerling', 'Speelvolgorde', ...(heeftG ? ['Groepje'] : []), ...(m.velden || []), ...C.flatMap(c => [`${c.naam} (${c.weging}x)`, ...(heeftG && c.groepsscore ? [`${c.naam}: geldt`] : [])]), D.docent < 100 ? 'Cijfer docent' : 'Cijfer',
    ...(D.zelf ? [`Zelf (${D.zelf}%)`] : []), ...(D.klasgenoten ? [`Klasgenoten (${D.klasgenoten}%)`, 'Inzendingen klasgenoten'] : []), ...(D.docent < 100 ? ['Eindcijfer'] : []), 'Afgerond op', 'Opmerking per onderdeel', m.vooruit || 'Punt om aan te werken'];
  const rijen = lijst.map(x => { const id = x.id; const r = T.ll[id] || { s: {}, v: {}, opm: {} }; const G = BMR.groepVan(T, id); const voor = [x.naam, volg.indexOf(id) + 1, ...(heeftG ? [G ? G.naam : ''] : []), ...(m.velden || []).map(v => (r.v || {})[v] || '')];
    if (r.af && !r.vast) return [...voor, ...C.flatMap(c => ['', ...(heeftG && c.groepsscore ? [''] : [])]), 'inhalen'];
    const u = BMR.eind(m, T, T, id); const opm = Object.entries(r.opm || {}).filter(([, t]) => t).map(([k, t]) => k + ': ' + t).join(' | ');
    return [...voor, ...C.flatMap(c => { const q = r.vast ? (r.vast.s[c.id] || {}) : BMR.scoreVan(T, T, id, c); return [q.v ?? '', ...(heeftG && c.groepsscore ? [q.b === 'groep' ? 'groep' : q.b === 'eigen' ? 'eigen' : ''] : [])]; }), komma(u.d),
      ...(D.zelf ? [komma(u.z)] : []), ...(D.klasgenoten ? [komma(u.k), u.kn] : []), ...(D.docent < 100 ? [komma(u.e)] : []), r.vast ? new Date(r.vast.op).toLocaleString('nl-NL') : '', opm, r.vooruit || '']; });
  return '﻿' + [kop, ...rijen].map(r => r.map(bmCel).join(';')).join('\r\n');
}
function bmExport(m, g) {
  bmDownload(bmBestand(m, g, vandaag() + '.csv'), bmCsv(m, g), 'text/csv;charset=utf-8');
  toast('Scoreblad gedownload; open het in Excel en bewaar het in je OneDrive');
}
function bmLijstOpslaan(g, rij) { S.beoord.weg = S.beoord.weg || {}; const gekozen = new Set(rij.map(u => u.id).filter(Boolean)); const alle = [...(S.beoord.lijsten[g] || []), ...(S.beoord.weg[g] || [])];
  S.beoord.lijsten[g] = rij.map((u, i) => ({ id: u.id || 'l' + Date.now().toString(36) + i, naam: u.naam })); S.beoord.weg[g] = alle.filter(x => !gekozen.has(x.id));
  bmPaneel = null; bmKoppel = null; bewaar(); toast(rij.length + ' leerlingen opgeslagen'); }
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-beoordeel],[data-bm],[data-bmkies],[data-bmop],[data-bmscore],[data-bmzelf],[data-bmwis],[data-bmgs],[data-bmgswis],[data-bmgkies],[data-bmgactief],[data-bmgin],[data-bmgruit],[data-bmgweg],[data-bmlaag]'); if (!b) return;
  const D = b.dataset;
  if (D.beoordeel) { const [mid, g] = D.beoordeel.split('|'); bmSel = null; bmPaneel = null; bmLaagId = null; location.hash = 'beoordelen/' + encodeURIComponent(mid) + '/' + encodeURIComponent(g); return; }
  const m = BM.find(x => x.id === decodeURIComponent(route.arg[0] || '')); const g = decodeURIComponent(route.arg[1] || ''); if (!m) return;
  const k = m.id + '|' + g; const T = bmToets(m.id, g); const lijst = S.beoord.lijsten[g] || []; const vol = bmVolgorde(T, lijst);
  if (D.bm === 'lijst') { bmPaneel = 'lijst'; bmKoppel = null; render(); return; }
  if (D.bm === 'kolom') { bmPaneel = 'kolom'; render(); return; }
  if (D.bm === 'groepjes') { bmPaneel = 'groepjes'; render(); return; }
  if (D.bm === 'klasgenoten') { bmPaneel = 'klasgenoten'; bmKlasRes = null; render(); return; }
  if (D.bm === 'gnieuw') { T.groepjes = T.groepjes || []; const id = 'g' + Date.now().toString(36); T.groepjes.push({ id, naam: 'Groep ' + (T.groepjes.length + 1), leden: [] }); bmActiefG = id; bewaar(); return; }
  if (D.bmgactief) { bmActiefG = D.bmgactief; render(); return; }
  if (D.bmgin) { const x = T.groepjes.find(y => y.id === bmActiefG); if (x) { x.leden.push(D.bmgin); if ((m.velden || []).includes('Groep')) bmRij(T, D.bmgin).v.Groep = x.naam; bewaar(); } return; }
  if (D.bmgruit) { const x = BMR.groepVan(T, D.bmgruit); if (x) { x.leden = x.leden.filter(id => id !== D.bmgruit); bewaar(); } return; }
  if (D.bmgweg) { if (!confirm('Dit groepje verwijderen? De eigen scores blijven; de groepsscores van dit groepje vervallen.')) return; T.groepjes = T.groepjes.filter(x => x.id !== D.bmgweg); [T, ...(T.tussen || [])].forEach(L => { if (L.gs) delete L.gs[D.bmgweg]; }); bmLog(k, { a: 'groepweg', id: D.bmgweg }); bewaar(); return; }
  if (D.bmgkies) { bmSelG = D.bmgkies; bmKlok = null; render(); window.scrollTo(0, 0); return; }
  if (D.bmgs) { const [cid, x] = D.bmgs.split('|'); const G = (bmLaag(T).gs || {})[bmSelG] || {}; if (G[cid] !== +x) bmZet(k, T, 'gs', bmSelG, cid, +x); return; }
  if (D.bmgswis) { bmZet(k, T, 'gs', bmSelG, D.bmgswis, null); return; }
  if (D.bm === 'gverder') { const x = T.groepjes.find(y => y.id === bmSelG); const eerste = x && vol.find(id => x.leden.includes(id)); bmSelG = null; if (eerste) bmSel = eerste; render(); window.scrollTo(0, 0); return; }
  if (D.bmlaag != null) { bmLaagId = D.bmlaag || null; bmSel = null; bmSelG = null; render(); return; }
  if (D.bm === 'tussennieuw') { const naam = prompt('Naam van de tussenstand', 'Generale'); if (!naam || !naam.trim()) return; T.tussen = T.tussen || []; const id = 't' + Date.now().toString(36); T.tussen.push({ id, naam: naam.trim(), op: vandaag(), ll: {}, gs: {} }); bmLaagId = id; bmSel = null; bmSelG = null; bewaar(); return; }
  if (D.bm === 'tussenweg') { const L = bmLaag(T); if (L === T || !confirm(`Tussenstand ${L.naam} verwijderen? Op de toets heeft dit geen invloed.`)) return; bmLog(k, { a: 'tussenweg', w: L.naam }); T.tussen = T.tussen.filter(x => x !== L); bmLaagId = null; bmSel = null; bewaar(); return; }
  if (D.bm === 'klaslees') { bmKlasRes = BMR.leesKlasgenoten($('#bmKlasPlak').value, lijst); render(); return; }
  if (D.bm === 'klasover') { const R = bmKlasRes; for (const s of document.querySelectorAll('[data-bmklask]')) if (s.value) R.per[s.value].push(...R.onbekend[+s.dataset.bmklask].w);
    bmLaagId = null; for (const x of lijst) bmZet(k, T, 'forms', x.id, null, R.per[x.id] || [], true); bmKlasRes = null; bmPaneel = null; bewaar(); toast('Klasgenoten overgenomen'); return; }
  if (D.bm === 'pdf' || D.bm === 'pdfalle') { const L = bmLaag(T); const nm = id => (lijst.find(x => x.id === id) || {}).naam || ''; const bestand = id => `Feedback ${m.toets}${L === T ? '' : ' tussenstand ' + L.naam} ${nm(id)}.pdf`.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ');
    try { if (D.bm === 'pdf') { bmDownload(bestand(bmSel), await BMPDF.blad(bmBladInfo(m, g, T, L, bmSel, nm(bmSel)))); return; }
      const wie = vol.filter(id => BMR.eind(m, L, T, id).d != null); if (!wie.length) { toast('Er is nog niemand met een cijfer'); return; } toast('Bladen maken…'); const f = []; for (const id of wie) f.push({ naam: bestand(id), blob: await BMPDF.blad(bmBladInfo(m, g, T, L, id, nm(id))) });
      bmDownload(bmBestand(m, g, `feedbackbladen${L === T ? '' : ' ' + L.naam}.zip`), await BMPDF.zip(f)); toast(wie.length + ' feedbackbladen gedownload'); } catch (err) { console.warn(err); toast('Het feedbackblad maken lukt niet'); } return; }
  if (D.bm === 'dicht') { bmPaneel = null; render(); return; }
  if (D.bm === 'lijstopslaan') { const namen = bmParse($('#bmLijst').value); if (!namen.length) { toast('Er staan geen namen in het veld'); return; }
    S.beoord.weg = S.beoord.weg || {}; const v = BMR.vergelijkLijst(namen, [...lijst, ...S.beoord.weg[g] || []]);
    if (v.rij.some(u => !u.id) && v.vrij.length) { bmKoppel = v; bmPaneel = 'koppel'; render(); return; }
    bmLijstOpslaan(g, v.rij); return; }
  if (D.bm === 'koppelklaar') { const { rij } = bmKoppel; const gebruikt = new Set(); const sel = [...document.querySelectorAll('[data-bmkop]')]; for (const s of sel) if (s.value) { if (gebruikt.has(s.value)) { toast('Je hebt een leerling twee keer gekozen'); return; } gebruikt.add(s.value); } for (const s of sel) if (s.value) rij[+s.dataset.bmkop].id = s.value; bmLijstOpslaan(g, rij); return; }
  if (D.bm === 'export') { bmExport(m, g); return; }
  if (D.bm === 'reserve') { await bmReserveNu(m, g); toast('Reserve gemaakt'); return; }
  if (D.bm === 'mapkies') { try { const h = await window.showDirectoryPicker({ id: 'lesdag-reserve', mode: 'readwrite', startIn: 'documents' }); bmMap = h; bmMapStaat = 'ok'; bmIdb('kv', 'readwrite', s => s.put(h, 'map')).catch(err => console.warn(err)); await bmSchrijf(); toast('Reserve staat nu ook in deze map. Kies je eigen OneDrive, niet de sectiemap.'); } catch (err) { if (err.name !== 'AbortError') { console.warn(err); toast('Deze map kan niet worden gebruikt'); } } bmStatusVervers(); return; }
  if (D.bm === 'maptoe') { try { const p = await bmMap.requestPermission({ mode: 'readwrite' }); bmMapStaat = p === 'granted' ? 'ok' : 'toestemming'; if (p === 'granted') await bmSchrijf(); } catch (err) { console.warn(err); } bmStatusVervers(); return; }
  if (D.bm === 'logboek') { const log = await bmLogVan(k); const naam = id => (lijst.find(x => x.id === id) || {}).naam || id; bmDownload(bmBestand(m, g, `logboek ${vandaag()}.csv`), '﻿' + [['Tijd', 'Laag', 'Wat', 'Leerling of groep', 'Onderdeel', 'Waarde'], ...log.map(e => [new Date(e.t).toLocaleString('nl-NL'), e.l || 'toets', e.a, naam(e.id), e.c, Array.isArray(e.w) ? e.w.join(' ') : e.w])].map(r => r.map(bmCel).join(';')).join('\r\n'), 'text/csv;charset=utf-8'); toast(log.length + ' regels in het logboek'); return; }
  if (D.bm === 'loten') { T.volgorde = vol.map(id => [Math.random(), id]).sort((a, c) => a[0] - c[0]).map(x => x[1]); if ((T.groepjes || []).length) T.groepjes = T.groepjes.map(x => [Math.random(), x]).sort((a, c) => a[0] - c[0]).map(x => x[1]); bmSel = null; bewaar(); return; }
  if (D.bm === 'klok') { bmKlok = bmKlok ? null : Date.now(); render(); return; }
  if (D.bm === 'afronden') { const open = lijst.filter(x => !(T.ll[x.id] && (T.ll[x.id].vast || T.ll[x.id].af)) && BMR.eind(m, T, T, x.id).e != null).length; const rest = lijst.filter(x => !(T.ll[x.id] && T.ll[x.id].vast)).length - open;
    if (!confirm(`${open} ${open === 1 ? 'cijfer' : 'cijfers'} vastleggen, met de scores en wegingen van nu.${rest ? ` ${rest} ${rest === 1 ? 'leerling heeft' : 'leerlingen hebben'} nog geen cijfer en ${rest === 1 ? 'blijft' : 'blijven'} open.` : ''}`)) return;
    const af = BMR.afronden(m, T, lijst, Date.now()); bmLog(k, { a: 'afronden', w: af.map(id => id + '=' + T.ll[id].vast.e).join(' ') }); bmVuil = true; bewaar(); toast(af.length + ' cijfers vastgelegd'); await bmReserveNu(m, g); return; }
  if (D.bm === 'heropen') { if (!confirm('Dit cijfer openzetten om te wijzigen? Het oude cijfer staat in het logboek. Rond daarna opnieuw af en zet het nieuwe cijfer zelf in Magister.')) return; bmLog(k, { a: 'heropen', id: bmSel, w: T.ll[bmSel].vast.e }); BMR.heropen(T, bmSel); bewaar(); return; }
  if (D.bm === 'kolomkopie') { const t = BMR.kolom(T, lijst).join('\n'); try { await navigator.clipboard.writeText(t); toast('Gekopieerd. Plak in de eerste cel van de kolom in Magister.'); } catch (err) { const ta = $('#bmKolom'); ta.hidden = false; ta.select(); toast('Kopiëren lukt niet vanzelf: de tekst is geselecteerd, kopieer met Ctrl+C'); } return; }
  if (D.bm === 'volgende' || D.bm === 'vorige') { const i = vol.indexOf(bmSel) + (D.bm === 'volgende' ? 1 : -1); if (i >= 0 && i < vol.length) { const oud = bmSel; bmSel = vol[i]; bmKlok = null; const G = BMR.groepVan(T, bmSel); if (D.bm === 'volgende' && G && G !== BMR.groepVan(T, oud) && !Object.keys((bmLaag(T).gs || {})[G.id] || {}).length) bmSelG = G.id; render(); window.scrollTo(0, 0); if (D.bm === 'volgende') bmNaVolgende(m, g, T, oud, bmSel); } return; } // een nieuwe groep zonder groepsscore begint op de groepskaart
  if (D.bmkies) { bmSel = D.bmkies; bmSelG = null; bmKlok = null; render(); return; }
  if (D.bmop) { const [id, st] = D.bmop.split('|'); const i = vol.indexOf(id), j = i + +st; if (j >= 0 && j < vol.length) { [vol[i], vol[j]] = [vol[j], vol[i]]; T.volgorde = vol; bewaar(); } return; }
  if (D.bmscore) { const [cid, x] = D.bmscore.split('|'); const w = +x; if (bmRij(bmLaag(T), bmSel).s[cid] !== w) bmZet(k, T, 's', bmSel, cid, w); return; } // nog een keer tikken wist niet: dubbel tikken mag nooit een score weghalen
  if (D.bmzelf) { const w = +D.bmzelf; if (bmRij(bmLaag(T), bmSel).zelf !== w) bmZet(k, T, 'zelf', bmSel, null, w); return; }
  if (D.bmwis != null) { if (D.bmwis) bmZet(k, T, 's', bmSel, D.bmwis, null); else bmZet(k, T, 'zelf', bmSel, null, null); return; }
});
document.addEventListener('input', e => {
  const t = e.target; if (route.naam !== 'beoordelen' || !t.closest('.bm-scoor')) return;
  const m = BM.find(x => x.id === decodeURIComponent(route.arg[0] || '')); if (!m || !bmSel) return; const r = bmRij(bmLaag(bmToets(m.id, decodeURIComponent(route.arg[1] || ''))), bmSel);
  if (t.dataset.bmveld) r.v[t.dataset.bmveld] = t.value;
  else if (t.dataset.bmopm) r.opm[t.dataset.bmopm] = t.value;
  else if (t.dataset.bmvooruit != null) r.vooruit = t.value;
  else return;
  bewaar(true);
});
document.addEventListener('change', async e => {
  const t = e.target; const c = bmHuidig(); if (!c) return; const T = bmToets(c.m.id, c.g);
  if (t.dataset.bmgnaam) { const x = (T.groepjes || []).find(y => y.id === t.dataset.bmgnaam); if (x && t.value.trim()) { x.naam = t.value.trim(); bewaar(true); } return; }
  if (t.dataset.bmherstel != null && t.files[0]) { try { const d = JSON.parse(await t.files[0].text()); if (d.soort !== 'lesdag-beoordeling-reserve' || d.model !== c.m.id || d.groep !== c.g || !d.toets) { toast('Dit bestand hoort niet bij deze toets en groep'); return; }
      if (!confirm(`Reserve van ${new Date(d.gemaakt).toLocaleString('nl-NL')} terugzetten? De scores op dit apparaat voor deze toets worden vervangen.`)) return;
      await bmDownloadReserve(c.m, c.g); S.beoord.toetsen[c.k] = d.toets; if (d.lijst && d.lijst.length) S.beoord.lijsten[c.g] = d.lijst; S.beoord.weg = S.beoord.weg || {}; if (d.weg) S.beoord.weg[c.g] = d.weg; bmLog(c.k, { a: 'teruggezet', w: d.gemaakt }); bewaar(); toast('Reserve teruggezet; de oude stand staat in je downloads'); } catch (err) { console.warn(err); toast('Dit bestand kan niet worden gelezen'); } return; }
  if (!bmSel || !t.closest('.bm-scoor')) return;
  if (t.dataset.bmaf != null) { bmZet(c.k, T, 'af', bmSel, null, t.checked); return; }
  if (t.dataset.bmzelfc != null) { const w = t.value.trim() === '' ? null : BMR.leesCijfer(t.value); if (t.value.trim() && w == null) { toast('Vul een cijfer van 1 tot en met 10 in, bijvoorbeeld 7,5'); t.value = ''; } bmZet(c.k, T, 'zelf', bmSel, null, w); return; }
  if (t.dataset.bmpapier != null) { const stuk = t.value.trim().split(/\s+/).filter(Boolean); const w = stuk.map(BMR.leesCijfer); if (w.includes(null)) toast('Niet alles is een cijfer van 1 tot en met 10: alleen de goede cijfers tellen mee'); bmZet(c.k, T, 'papier', bmSel, null, w.filter(x => x != null)); return; }
  const soort = t.dataset.bmveld ? ['v', t.dataset.bmveld] : t.dataset.bmopm ? ['opm', t.dataset.bmopm] : t.dataset.bmvooruit != null ? ['vooruit', null] : null;
  if (soort) bmZet(c.k, T, soort[0], bmSel, soort[1], t.value, true);
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
document.addEventListener('visibilitychange', () => { if (document.hidden || LES) return; if (M365.account) syncNu(false); if (zGekoppeld() && zProxy() && (!ZC || Date.now() - ZC.opgehaald > 30 * 60000)) zOphalen(false); });

/* ---------- start ---------- */
(async function start() {
  S = laadLokaal(); leesRoute();
  try { B = await (await fetch('data/basis.json', { cache: 'no-cache' })).json(); }
  catch (e) { $('#main').innerHTML = '<div class="kaart"><p>De leergangen kunnen niet geladen worden. Controleer de verbinding.</p></div>'; return; }
  try { BM = await (await fetch('data/beoordeling.json', { cache: 'no-cache' })).json(); } catch (e) { BM = []; }
  try { RC = await (await fetch('data/reclame.json', { cache: 'no-cache' })).json(); } catch (e) { RC = null; }
  render();
  try { const acc = await M365.init(); if (acc) await syncNu(false); else setSync('', M365.enabled() ? 'Niet ingelogd' : 'Op dit apparaat'); }
  catch (e) { console.warn(e); setSync('fout', 'Inloggen niet beschikbaar'); }
  bmMapLaden(); bmPersist();
  if (zGekoppeld() && zProxy() && navigator.onLine && (!ZC || Date.now() - ZC.opgehaald > 30 * 60000 || ZC.van !== maandagVan(vandaag()))) zOphalen(false);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
})();
