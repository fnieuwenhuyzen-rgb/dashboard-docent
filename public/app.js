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
let SY = null;               // synchronisatie tussen apparaten, zie syncStart

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
/* rollen en potjes (handboek/voorstel-rollen.md, besluit Frans 6-11). Uren uit Foleta vult Frans zelf in: ze staan alleen in S */
const ROLLEN_START = [{ id: 'docent', naam: 'Docent', kleur: '#2f6db5' }, { id: 'vakgroep', naam: 'Vakgroepleider', kleur: '#b8770b' }, { id: 'dirigent', naam: 'Dirigent', kleur: '#c0392b' },
  { id: 'team', naam: 'Teamlid vwo 4-5-6', kleur: '#2e8b57' }, { id: 'inter', naam: 'Internationalisering', kleur: '#0e8f9a' }, { id: 'prof', naam: 'Professional', kleur: '#8e44ad' }];
const POTJES_START = [{ id: 'ast', naam: 'AST' }]; // PB-taak en Werkdruk zijn verminderingen van de taak, geen potjes (normjaartaakbeleid)
function nieuweStaat() { return { v: 1, rollen: ROLLEN_START.map(r => Object.assign({ uren: '' }, r)), potjes: POTJES_START.map(p => Object.assign({ uren: '' }, p)), updated: 0, rooster: [], voortgang: {}, les: {}, uitval: {}, sectieAf: {}, sectieNotitie: {}, sectieExtra: [], groepLeergang: {}, taken: [], dagTaken: {}, koorAf: {}, taakNoot: {}, reclame: {}, reclameAf: {}, reclameExtra: [], uitgesteld: {}, afwezig: {}, ankers: {}, afwijkingen: [], extraUren: [], beoord: { lijsten: {}, toetsen: {} },
  pauzes: [], rust: {}, afLater: {}, afgesloten: {}, goed: {}, later: {}, klaarExtra: {}, duur: {}, duurLog: [], schatStart: {}, minuten: {}, mag: {}, magHw: {} }; }
/* vorm van de staat controleren: een kopie of opgeslagen staat die er geldig uitziet maar kapot is ("rooster":"kapot")
   mag de app niet laten stoppen. staatFouten noemt de kapotte onderdelen, staatRepareer zet alleen die terug op leeg. */
const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
const ST_NAAM = { rooster: 'rooster', voortgang: 'voortgang', les: 'eigen lesaanpassingen', taken: 'taken', groepLeergang: 'leergang per klas', beoord: 'beoordelen' };
function staatFouten(d) {
  if (!isObj(d)) return ['geen Lesdag-kopie'];
  if (!d.v) return ['geen Lesdag-kopie (versie ontbreekt)'];
  const leeg = nieuweStaat(); const out = [];
  for (const [k, w] of Object.entries(leeg)) {
    if (d[k] === undefined) continue; const x = d[k];
    const goed = Array.isArray(w) ? Array.isArray(x) && x.every(isObj) : isObj(w) ? isObj(x) : typeof x === typeof w;
    if (!goed) out.push(ST_NAAM[k] || k);
  }
  if (isObj(d.beoord) && ((d.beoord.lijsten !== undefined && !isObj(d.beoord.lijsten)) || (d.beoord.toetsen !== undefined && !isObj(d.beoord.toetsen)))) out.push(ST_NAAM.beoord);
  if (Array.isArray(d.rooster) && d.rooster.some(u => isObj(u) && (typeof u.groep !== 'string' || typeof u.start !== 'string' || typeof u.eind !== 'string'))) out.push('lessen in het rooster');
  return [...new Set(out)];
}
function staatRepareer(d) { // kapotte onderdelen leeg, de rest blijft
  const leeg = nieuweStaat(); const r = Object.assign({}, isObj(d) ? d : {}); r.v = r.v || 1;
  for (const [k, w] of Object.entries(leeg)) {
    if (r[k] === undefined) continue;
    if (Array.isArray(w)) r[k] = Array.isArray(r[k]) ? r[k].filter(isObj) : w;
    else if (isObj(w)) r[k] = isObj(r[k]) ? r[k] : w;
    else if (typeof r[k] !== typeof w) r[k] = w;
  }
  r.beoord = Object.assign({}, r.beoord); if (!isObj(r.beoord.lijsten)) r.beoord.lijsten = {}; if (!isObj(r.beoord.toetsen)) r.beoord.toetsen = {};
  if (Array.isArray(r.rooster)) r.rooster = r.rooster.filter(u => typeof u.groep === 'string' && typeof u.start === 'string' && typeof u.eind === 'string');
  return r;
}
const VOOR_KOPIE = 'lesdag-staat-voor-kopie'; // de stand van vóór de laatst teruggezette kopie, voor als de melding al weg is
function laadLokaal() { try { const j = localStorage.getItem(LS_KEY); if (j) return Object.assign(nieuweStaat(), JSON.parse(j)); } catch (e) {} return nieuweStaat(); }
/* alleen op dit apparaat: jarige collega's, wie er absent is en logboeknotities over
   leerlingen. Een eigen sleutel die nooit naar OneDrive gaat, niet in de kopie zit en nooit naar de server. Absenten en logboeknotities
   verdwijnen zodra ze in Magister staan. */
const AP_KEY = 'lesdag-apparaat';
const apLeeg = () => ({ collegas: [], weg: {}, log: {}, felic: {} });
function laadAP() { try { const a = Object.assign(apLeeg(), JSON.parse(localStorage.getItem(AP_KEY) || '{}')); delete a.jarig; const oud = ymd(new Date(Date.now() - 30 * 864e5)); Object.keys(a.felic || {}).forEach(k => { if (k.slice(0, 10) < oud) delete a.felic[k]; }); return a; } catch (e) { return apLeeg(); } } // verjaardagen van leerlingen blijven in Magister (besluit 3-11)
let AP = laadAP();
function apBewaar() { try { localStorage.setItem(AP_KEY, JSON.stringify(AP)); } catch (e) {} }
function bewaar(stil) {
  S.updated = Date.now();
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); opslagMelding(null); } catch (e) { opslagMelding(e); }
  if (SY) SY.gewijzigd();
  if (M365.account) { clearTimeout(remoteT); setSync('bezig', 'Opslaan…'); remoteT = setTimeout(bewaarRemote, 1500); }
  if (!stil) render();
}
function opslagMelding(fout) { // zichtbaar zolang opslaan op dit apparaat mislukt: de wijzigingen staan dan alleen nog in het scherm en het logboek
  const el = $('#opslagfout'); if (!el) return; const was = !el.hidden; el.hidden = !fout; if (fout) { setSync('fout', 'Opslaan mislukt'); console.warn(fout); } else if (was && !M365.account && !SY) setSync('', 'Op dit apparaat');
}
async function bewaarRemote() {
  try { await M365.saveState(S); setSync('ok', 'Opgeslagen in OneDrive'); }
  catch (e) { setSync('fout', 'OneDrive niet bereikbaar, staat op dit apparaat'); console.warn(e); }
}
function setSync(st, txt) { syncState = st; const el = $('#sync'); el.className = 'sync ' + st; el.querySelector('span').textContent = txt; }

/* ---------- groepen en lessen ---------- */
function alleGroepen() { const out = []; for (const [lg, gs] of Object.entries(B.groepen)) for (const g of gs) out.push({ g, lg }); return out; }
const leergangVan = g => S.groepLeergang[g] ? (B.leergangen[S.groepLeergang[g]] ? S.groepLeergang[g] : null) : (alleGroepen().find(x => x.g === g) || {}).lg || null; // een leergang die niet (meer) bestaat telt als geen leergang (bevinding 52)
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
  const r = reeks(leergangVan(g)); const eigen = r[vanaf] ? status(g, r[vanaf].id) : {};
  if (!afgerond(eigen) && (eigen.n || eigen.st)) return { les: r[vanaf], st: eigen }; // half af of niet aan toegekomen: de klas blijft in deze les, de notitie staat bij de les zelf
  for (let i = vanaf - 1; i >= 0; i--) { const st = status(g, r[i].id); if (st.n) return { les: r[i], st }; if (st.st) return { les: r[i], st }; }
  return null;
}
// wat je vorige keer noteerde, alleen bij de eerstvolgende les van de groep en niet bij een afgeronde les
function vorigeVan(x) { if (!x.item || x.klaar || !x.eerst) return null; const v = vorigeNotitie(x.u.groep, reeks(x.item.lg).indexOf(x.item)); return v && v.st.n ? v.st : null; }
const vorigeKop = st => 'Vorige keer' + (st.d ? ` (${fmtD(st.d)}${st.st === 'half' ? ', half af' : ''})` : '');
function vorigeRegel(x, inklap) { const st = vorigeVan(x); return st ? `<div class="vorige${inklap && st.n.length > 80 ? ' kort' : ''}">${esc(vorigeKop(st))}: ${esc(st.n)}</div>` : ''; }
// het afrondvak begint leeg: een notitie van een eerdere dag mag niet ongemerkt naar de les daarna verhuizen
function notitieVak(x, s) { const st = status(x.u.groep, x.item.id); return st.d === s ? st.n || '' : ''; }

function opPlanning(g) { // alle lessen vóór de huidige lesweek op 'gegeven'
  const lw = lesweekVan(vandaag()) || nextLesweek(); const r = reeks(leergangVan(g)); let n = 0;
  S.voortgang[g] = S.voortgang[g] || {};
  for (const x of r) if (x.w < lw && !S.voortgang[g][x.id]) { const y = (planBasis().slots[g] || []).find(y => y.w === x.w && y.li === x.li); if (y && isUitval(y.s, y.u)) continue; S.voortgang[g][x.id] = { st: 'gegeven', auto: true }; n++; }
  return n;
}
function nextLesweek() { const t = vandaag(); const k = B.kalender.weken.find(k => k.datum >= t); return k ? k.w : 99; }
const rooGroepen = () => [...new Set(S.rooster.map(u => u.groep))];
const MEE_MET = { v6: 'v5' }; // v6 draait mee met het programma van v5 (besluit Frans 3-11): geen eigen lessen, wel de eigen toetsen
const klasLabel = g => { const m = Object.keys(MEE_MET).find(k => MEE_MET[k] === g); return m ? g + ' + ' + m : g; };
/* ---------- planning: welke les in welk lesuur ---------- */
function uurId(u) { return u.id; }
function urenOp(s) { const z = zUren(s); const d = dOf(s).getDay(); const vast = z || S.rooster.filter(u => +u.dag === d); return vast.concat(extraOp(s, d, vast)).sort((a, b) => minuten(a.start) - minuten(b.start)); }
// eenmalig lesuur (S.extraUren): telt mee als lesuur, zonder Zermelo. Zet Zermelo dezelfde klas op dezelfde tijd, dan neemt Zermelo het over
function extraOp(s, d, vast) { return (S.extraUren || []).filter(x => x.s === s && !vast.some(u => u.groep === x.groep && u.start === x.start && !u.vervallen)).map(x => ({ id: x.id, dag: d, start: x.start, eind: x.eind, groep: x.groep, lokaal: x.lokaal || '', extra: true })); }
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
/* Zermelo-API: de token kan meer dan de agendalink en staat daarom niet in S (dus niet in OneDrive of een kopie). Hij gaat wel mee met synchroniseren (besluit Frans, 3-11): syncDoc. */
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
function zKlassen(e) { // alle klassen van een afspraak: zGroep, plus wie meedraait als die ook genoemd wordt (v6.mu1, v5.mu1: zGroep zegt v5)
  const g = zGroep(e); if (!g) return [];
  const txt = e.api ? e.summary + ' ' + (e.groepen || []).join(' ') : e.summary + ' ' + e.desc;
  return [g, ...Object.keys(MEE_MET).filter(m => MEE_MET[m] === g && new RegExp('(^|[^a-z0-9])' + m + '([^a-z0-9]|$)', 'i').test(txt))];
}
function zInToetsweek(e) { // toetsweken verschillen per klas; zonder bekende klas geldt de schoolbrede toetsweek
  const lgs = zKlassen(e).map(leergangVan).filter(Boolean);
  return lgs.length ? lgs.some(lg => toetsweekVan(lg, e.d)) : toetsweekOp(e.d);
}
const zLes = e => zMuziek(e) && !zDienst(e) && !(zToets(e) && zInToetsweek(e));
function zAnders(s) { // [{van, tot, titel, lokaal, groep, toets, dienst}] voor één dag, zonder lessen en gewone pauzes
  if (!ZC || !ZC.events || s < ZC.van || s > ZC.tot) return [];
  return ZC.events.filter(e => e.d === s && !e.vervallen && !zLes(e) && !((e.soort === 'interlude' || /\bpauze\b/i.test(zTekst(e))) && !zDienst(e)))
    .map(e => { const n = zNaam(e); return { van: e.start ? minuten(e.start) : null, tot: e.eind ? minuten(e.eind) : null, titel: n.titel, lokaal: e.loc || n.lokaal, groep: zMuziek(e) ? zGroep(e) : '', klassen: zMuziek(e) ? zKlassen(e) : [], toets: zToets(e), dienst: zDienst(e) }; });
}
function zNaam(e) { // Zermelo schrijft "[o] [toets] 215 entl h4b": status en soort tussen haken, dan lokaal, vak en groep
  const t = String(e.summary || '').replace(/\[[^\]]*\]\s*/g, '').trim(); const m = t.match(/^(\d{2,4}[a-z]?)\s+(.+)$/i);
  return { titel: (m ? m[2] : t) || 'Afspraak', lokaal: m ? m[1] : '' };
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
    ZPZ = null;
    ZC = { opgehaald: Date.now(), van, tot: addD(van, 20), events, bron };
    try { localStorage.setItem('lesdag-zermelo', JSON.stringify(ZC)); } catch (e) {}
    if (zVastBij()) bewaar(true);
    if (melden) toast(`Rooster opgehaald: ${events.filter(zLes).length} muzieklessen en ${events.filter(e => !zLes(e) && !e.vervallen && (zDienst(e) || zToets(e))).length} toetsen of surveillances in drie weken`);
    if (!LES) render();
  } catch (e) { console.warn(e); if (melden) toast('Rooster ophalen lukt niet: ' + e.message); }
}
function zVastRooster() { // de vaste week: wat in minstens twee opgehaalde weken terugkomt. Vervallen lessen tellen mee (toetsweek), een eenmalige verplaatsing niet
  if (!ZC || !ZC.events) return [];
  const per = {}; const weken = new Set();
  for (const e of ZC.events) { if (!e.start || !zLes(e) || zToets(e)) continue; const g = zGroep(e); const dag = dOf(e.d).getDay(); if (!g || dag === 0 || dag === 6) continue;
    const wk = maandagVan(e.d); weken.add(wk); const x = per[dag + '|' + e.start + '|' + g] = per[dag + '|' + e.start + '|' + g] || { dag, start: e.start, eind: e.eind, groep: g, lokaal: '', wk: new Set() };
    x.wk.add(wk); x.lokaal = x.lokaal || e.loc || ''; }
  if (weken.size < 2) return []; // vakantie: te weinig om iets over de vaste week te zeggen
  return Object.values(per).filter(x => x.wk.size > 1).map(({ wk, ...u }) => u).sort((a, b) => a.dag - b.dag || minuten(a.start) - minuten(b.start));
}
function roosterUitZermelo() { const oud = S.rooster; S.rooster = zVastRooster().map(u => { const o = oud.find(x => +x.dag === u.dag && x.start === u.start && x.groep === u.groep); return Object.assign({ id: o ? o.id : 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }, u); }); }
function zVastBij() { // leeg rooster: neem de vaste week over. Anders alleen ontbrekende lokalen aanvullen; een echte wijziging vraagt het scherm Rooster
  const z = zVastRooster(); if (!z.length) return false;
  if (!S.rooster.length) { roosterUitZermelo(); return true; }
  let anders = false;
  z.forEach(u => { const x = S.rooster.find(y => +y.dag === u.dag && y.start === u.start && y.groep === u.groep); if (x && !x.lokaal && u.lokaal) { x.lokaal = u.lokaal; anders = true; } });
  return anders;
}
function roosterOpruimen() { // dezelfde dag, tijd en klas telt één keer. Elk apparaat houdt het kleinste id, anders haalt samenvoegen ze allebei weg; verwijzingen naar het oude id (voortgang, uitval, ankers) gaan mee
  const per = {}; S.rooster.forEach(u => { const k = u.dag + '|' + u.start + '|' + u.groep; (per[k] = per[k] || []).push(u); });
  const dubbel = Object.values(per).filter(L => L.length > 1); if (!dubbel.length) return false;
  const om = []; const weg = new Set();
  dubbel.forEach(L => { L.sort((a, b) => (a.id < b.id ? -1 : 1)); const [kies, ...rest] = L; kies.lokaal = kies.lokaal || (rest.find(u => u.lokaal) || {}).lokaal || ''; rest.forEach(u => { weg.add(u); if (String(u.id).length > 8) om.push([u.id, kies.id]); }); });
  S.rooster = S.rooster.filter(u => !weg.has(u));
  let tekst = JSON.stringify(S); om.forEach(([a, b]) => { tekst = tekst.split(a).join(b); }); S = JSON.parse(tekst);
  return true;
}
/* ---------- uitval en ankers: lessen schuiven door, toetsen blijven staan ---------- */
const ONDERBOUW = /^(bb1|havo3|vwo3|kmu3)$/; // toetsen uit het PTO schuiven mee binnen hun periode; de rest staat in een PTA en verplaatst alleen Frans
const INHAALBAAR = /generale|afrond|herhal|oefen/i;
const KRAP_DAGEN = 21; // verder weg zie je het alleen op het klasblad: de leergangen zitten vol, dus één les achter is daar geen reden voor een melding
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
    for (const wk of L.weken) { const inWeek = lijst.filter(y => y.w === wk.w && !y.u.extra); // een eenmalig uur krijgt geen lesnummer: de vaste uren en de toetsen blijven waar ze staan
      const doel = inWeek.length >= n ? Array.from({ length: n }, (_, i) => i + 1) : [1, 2, 3].slice(0, n).filter(i => wk['l' + i] && wk['l' + i].type !== 'uitval'); // te weinig uren: de uitval uit de leergang is het uur dat ontbreekt
      inWeek.forEach((y, i) => { y.li = doel[i] || null; const l = y.li ? wk['l' + y.li] : null; y.planLes = l;
        y.planUit = !!l && (l.type === 'uitval' || l.type === 'toetsweek' || (l.type === 'toets' && !!wk.toetsweek));
        y.geplandUit = y.planUit && !y.u.zermelo; }); } // staat de les wel in Zermelo, dan gaat hij door
  }
  return PLAN;
}
const lesId = (lg, y) => `${lg}:${y.w}.${y.li}`;
const periodeEind = (lg, a) => { const id = String(a.t.blok || '').split('+').pop(); const b = (B.leergangen[lg].blokken || []).find(b => b.id === id); return b && b.weken ? Math.max(b.weken[1], a.item.w) : a.item.w; }; // PTA-toetsen hebben meerdere blokken ("B1+B2"): de laatste telt
function ankersVan(g) { // de toetsen van een groep met hun lesuur. a.vast: staat op zijn uur; anders schuift hij mee tot a.grens, het laatste uur in zijn periode
  const P = planBasis(); if (P.ank[g]) return P.ank[g];
  const lg = leergangVan(g); const slots = P.slots[g] || []; const verpl = (S.ankers || {})[g] || {};
  const lijst = reeks(lg).filter(x => les(x).type === 'toets').map(x => { const l = les(x); const verplaatst = verpl[x.id] || null;
    const t = toetsVan(lg, l.toets) || { id: l.toets || 'toets', naam: l.titel || '' }; const plek = TOETSDATUM.plek(B.kalender, t, x.w); // de datum in basis.json gaat voor de lesweek uit de leergang (PTA-toetsen; het PTO schuift mee)
    return { id: x.id, item: x, t, verplaatst, plek, opDatum: !ONDERBOUW.test(lg) && plek.afwijkt, vast: !ONDERBOUW.test(lg) || !!verplaatst, klaar: afgerond(status(g, x.id)), slot: null, grens: null }; });
  const zet = (a, y) => { if (y) { a.slot = y; y.anker = a; } };
  lijst.filter(a => a.verplaatst && !a.klaar).forEach(a => zet(a, slots.find(y => y.s === a.verplaatst.s && y.u.id === a.verplaatst.uur && !y.anker) || slots.find(y => y.s === a.verplaatst.s && !y.anker)));
  lijst.filter(a => a.opDatum && !a.verplaatst && !a.klaar).forEach(a => zet(a, slots.find(y => y.s === a.plek.datum && !y.anker) || slots.find(y => y.w === a.plek.w && !y.anker && !y.geplandUit))); // een toets met twee lessen (P9 en P9 vervolg) krijgt de uren van die dag achter elkaar
  lijst.filter(a => a.vast && !a.verplaatst && !a.klaar && !a.slot).forEach(a => zet(a, slots.find(y => y.w === a.item.w && y.li === a.item.li && !y.anker) || slots.find(y => y.w >= a.item.w && !y.anker && !y.geplandUit)));
  lijst.filter(a => !a.vast && !a.klaar).reverse().forEach(a => { const eind = periodeEind(lg, a); if (!slots.some(y => y.w >= eind)) return; // einde periode nog niet in het bekende rooster: nog geen grens
    const y = slots.filter(y => y.w <= eind && !y.anker && !y.grens && !y.geplandUit && !isUitval(y.s, y.u)).pop(); if (y) { a.grens = y; y.grens = a; } });
  return (P.ank[g] = lijst);
}
const isVastAnker = (g, id) => ankersVan(g).some(a => a.id === id && a.vast);
// Toets die niet op zijn uur door kan: uur voorbij en niet afgevinkt, uur vervallen, of (onderbouw) geen uur meer in de periode.
function ankersGemist(g) { const t = vandaag(); const voorbij = a => a.verplaatst || ((B.kalender.weken.find(k => k.w === (a.opDatum ? a.plek.w : a.item.w)) || {}).datum || t) < t; // geen uur en de week komt nog: het rooster is daar nog niet bekend
  return ankersVan(g).filter(a => !a.klaar && (a.vast ? (a.slot ? a.slot.s < t || isUitval(a.slot.s, a.slot.u) : voorbij(a)) : (a.grens ? a.grens.s < t : voorbij(a)))); }
const planGroepen = () => Object.keys(planBasis().slots).filter(g => leergangVan(g));
function ankerIdx(r, a) { // plek in de reeks tot waar de lessen vóór de toets reiken; staat de toets verplaatst (of op zijn datum), dan hoort de generale uit dezelfde lesweek er nog vóór
  let i = r.indexOf(a.item); if (!a.verplaatst && !a.opDatum) return i; i++;
  while (r[i] && r[i].w === a.item.w && /generale/i.test(les(r[i]).titel || '')) i++; return i; }
function ruimte(g) { // per komende toets: hoeveel lessen moeten er nog vóór, en hoeveel lesuren zijn daarvoor over
  const lg = leergangVan(g); const r = reeks(lg); const t = vandaag(); const nu = nuMin(); const ank = ankersVan(g); const doelen = [];
  const uren = (planBasis().slots[g] || []).filter(y => (y.s > t || (y.s === t && minuten(y.u.eind) > nu)) && !isUitval(y.s, y.u) && !y.geplandUit && !y.anker);
  for (const a of ank) { const y = a.vast ? a.slot : a.grens; if (a.klaar || !y || y.s < t || isUitval(y.s, y.u)) continue; doelen.push({ id: a.id, a, t: a.t, s: y.s, y, idx: ankerIdx(r, a) }); }
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
function afwezigPeriode(s) { // alle aaneengesloten afwezige dagen rond s (weekenden zijn een brug)
  if (!S.afwezig[s]) return [];
  const L = [s]; const brug = d => S.afwezig[d] || dOf(d).getDay() % 6 === 0;
  for (let d = addD(s, -1), n = 0; brug(d) && n < 400; d = addD(d, -1), n++) if (S.afwezig[d]) L.unshift(d);
  for (let d = addD(s, 1), n = 0; brug(d) && n < 400; d = addD(d, 1), n++) if (S.afwezig[d]) L.push(d);
  return L;
}
function zetAfwezig(van, tot) {
  if (tot > addD(van, 366)) { toast('Kies een periode van hooguit een jaar; maak bij langer twee periodes'); return; }
  const P = planBasis(); const dagen = [];
  for (let s = van; s <= tot; s = addD(s, 1)) { if (dOf(s).getDay() % 6 === 0) continue; dagen.push(s); const rec = S.afwezig[s] = S.afwezig[s] || { herstel: {} };
    for (const g of Object.keys(P.slots)) { const lg = leergangVan(g); if (!lg) continue; // "op de planning" gezette lessen van deze dag zijn dus niet gegeven
      for (const y of P.slots[g]) { if (y.s !== s || !y.li) continue; const id = lesId(lg, y); const st = status(g, id); if (st.auto) { (rec.herstel[g] = rec.herstel[g] || {})[id] = st; delete S.voortgang[g][id]; } } } }
  afwezigOpen = false; bewaar();
  if (dagen.length) toast(`Afwezig ${dagenTekst(dagen)} · lessen schuiven door`, () => afwezigTerug(dagen));
}
function afwezigTerug(dagen) {
  for (const s of dagen) { const rec = S.afwezig[s]; if (!rec) continue; for (const [g, m] of Object.entries(rec.herstel || {})) Object.assign(S.voortgang[g] = S.voortgang[g] || {}, m); delete S.afwezig[s]; }
  bewaar();
}
function toetsWeken(a) { // lesweken waar de toets staat of stond: het uur waar hij nu op staat (verplaatst, of het uur uit de leergang) en de datum in basis.json (besluit Frans)
  const w = []; const y = a.slot || a.grens; if (y) w.push(y.w);
  const d = a.t.datum; const k = d && B.kalender.weken.find(k => k.datum > d || addD(k.datum, 6) >= d); if (k) w.push(k.w);
  return w;
}
function verplaatsGrens(g, a) { // [eerste, laatste] lesweek: de periode (vanaf de week uit de leergang), uitgebreid tot waar de toets nu of volgens basis.json staat, zodat die plek altijd een keuze blijft
  const w = toetsWeken(a); return [Math.min(a.item.w, ...w), Math.max(periodeEind(leergangVan(g), a), ...w)];
}
function verplaatsUren(g, a) { // uren waar een toets heen kan (keuze Frans 5-11): niet vóór de week waarin de leergang hem zet, niet na het einde van zijn periode (ook een PTA-toets), zodat de tijd tussen lesstof en toets klein blijft
  const t = vandaag(); const [van, eind] = verplaatsGrens(g, a);
  return (planBasis().slots[g] || []).filter(y => y.s > t && y.w >= van && y.w <= eind && !y.anker && !y.geplandUit && !isUitval(y.s, y.u));
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
/* ---------- eenmalig extra of geruild lesuur: "+ Nieuw", keuze Les. Een ruil zet het oude uur op uitval en voegt het nieuwe toe ---------- */
const LES_WOORD = /(^|\s)(extra\s+les(uur)?|extra\s+uur|inhaal(les|uur)|les\s*ruil|ruil(en)?|geruild)(?=\s|$)/i;
const RUIL_WOORD = /(^|\s)(les\s*ruil|ruil(en)?|geruild)(?=\s|$)/i;
function klasKeuzes() { return [...new Set([...Object.keys(planBasis().slots), ...rooGroepen(), ...Object.keys(S.groepLeergang || {})])].filter(g => leergangVan(g) && !MEE_MET[g]).sort(); }
const klasRe = g => new RegExp('(^|\\s)' + g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+') + '(?=\\s|$)', 'i');
function klasUitTekst(q) { return [...klasKeuzes()].sort((a, b) => b.length - a.length).find(g => klasRe(g).test(q)) || ''; }
const vastUurVan = g => (planBasis().slots[g] || []).find(y => !y.u.extra);
function lesDuur(g) { const y = vastUurVan(g); const u = y ? y.u : S.rooster[0]; const d = u && u.start && u.eind ? minuten(u.eind) - minuten(u.start) : 0; return d > 0 ? d : 45; }
function lokaalVan(g) { const y = (planBasis().slots[g] || []).find(y => !y.u.extra && y.u.lokaal); return y ? y.u.lokaal : ''; }
function ruilUren(g, dag, start) { // de uren van deze klas die kunnen vervallen: de acht dichtst bij de nieuwe dag, op datum getoond
  const t = vandaag(); const nu = nuMin(); ankersVan(g); const st = Object.values(S.voortgang[g] || {});
  const L = (planBasis().slots[g] || []).filter(y => (y.s > t || (y.s === t && minuten(y.u.eind) > nu)) && !y.u.extra && !y.geplandUit && !isUitval(y.s, y.u) && !(y.s === dag && y.u.start === start) && !st.some(x => x.d === y.s && x.uur === y.u.id));
  const af = y => Math.abs(dOf(y.s) - dOf(dag)); return [...L].sort((a, b) => af(a) - af(b)).slice(0, 8).sort((a, b) => (a.s < b.s ? -1 : a.s > b.s ? 1 : minuten(a.u.start) - minuten(b.u.start)));
}
const ruilNaar = (s, u) => (S.extraUren || []).find(x => x.ruil && x.ruil.s === s && x.ruil.uur === u.id);
const afVanExtra = id => (S.afwijkingen || []).find(a => a.extraId === id);
function extraMaak(o) { // o: {g, s, start, eind, lokaal, weg: y (optioneel), waarom}
  const id = 'e' + Date.now().toString(36); const ruil = o.weg ? { s: o.weg.s, uur: o.weg.u.id, start: o.weg.u.start } : null; const x = { id, s: o.s, start: o.start, eind: o.eind, groep: o.g, lokaal: o.lokaal || '' }; if (ruil) x.ruil = ruil;
  (S.extraUren = S.extraUren || []).push(x); if (ruil) (S.uitval[ruil.s] = S.uitval[ruil.s] || []).push(ruil.uur);
  const waar = `${fmtLang(o.s)} om ${o.start}${o.lokaal ? ' in lokaal ' + o.lokaal : ''}`;
  return afwijkingErbij({ g: o.g, soort: 'eenmalig', extraId: id, ruil, studiewijzer: ruil ? `${fmtD(ruil.s)} ${ruil.start}` : 'geen les', wat: `${ruil ? 'Geruild naar' : 'Extra les'} ${fmtD(o.s)} ${o.start}`, waarom: o.waarom || '',
    bericht: ruil ? `De muziekles van ${fmtLang(ruil.s)} (${ruil.start}) gaat niet door. In plaats daarvan is er muziekles op ${waar}.` : `Er is een extra muziekles op ${waar}.` });
}
function eenmaligKaart() { // op het scherm Rooster: wat er de komende tijd eenmalig bij komt
  const L = (S.extraUren || []).filter(x => x.s >= vandaag()).sort((a, b) => (a.s + a.start < b.s + b.start ? -1 : 1)); if (!L.length) return '';
  return `<div class="kaart"><h2>Eenmalige lesuren</h2><div class="ro-wijk">${L.map(x => { const a = afVanExtra(x.id); return `<span>${esc(fmtD(x.s))} ${esc(x.start)}</span><span>${esc(klasLabel(x.groep))}${x.ruil ? `, in plaats van ${esc(fmtD(x.ruil.s))} ${esc(x.ruil.start)}` : ', extra les'}${a ? ` <button class="btn klein" data-afwijkingterug="${esc(a.id)}">ongedaan</button>` : ''}</span>`; }).join('')}</div></div>`;
}
function afwijkingErbij(a) { a.id = 'af' + Date.now().toString(36); a.d = vandaag(); (S.afwijkingen = S.afwijkingen || []).push(a); return a.id; }
function maakOngedaan(id) {
  const a = (S.afwijkingen || []).find(x => x.id === id); if (!a) return;
  if (a.extraId) { S.extraUren = (S.extraUren || []).filter(x => x.id !== a.extraId); if (a.ruil && S.uitval[a.ruil.s]) S.uitval[a.ruil.s] = S.uitval[a.ruil.s].filter(u => u !== a.ruil.uur); }
  (a.lesIds || []).forEach(l => { if (S.ankers[a.g]) delete S.ankers[a.g][l]; });
  if (a.lesId) { if (a.was) S.voortgang[a.g][a.lesId] = a.was; else delete S.voortgang[a.g][a.lesId]; }
  S.afwijkingen = S.afwijkingen.filter(x => x.id !== id); bewaar();
}
// Voorspel de lessen voor een reeks dagen vanaf 'van' (inclusief), uitgaande van de huidige voortgang. Altijd vanaf vandaag gerekend, zodat een latere week klopt.
function planning(van, tot) {
  const gedaan = {}; const eerstGehad = {}; const res = {}; const t = vandaag(); const P = planBasis();
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
      const eerst = !eerstGehad[u.groep]; if (s >= t) eerstGehad[u.groep] = true;
      ankersVan(u.groep); // zet y.anker en y.grens
      const a = [y.anker, y.grens].find(a => a && !afgerond(status(u.groep, a.id)) && !klaarSet[a.id]);
      if (a) { klaarSet[a.id] = true; dag.uren.push({ u, item: a.item, lw, plan, planUit, anker: a, half: status(u.groep, a.id).st === 'half', eerst }); continue; }
      const it = reeks(lg).find(x => !afgerond(status(u.groep, x.id)) && !klaarSet[x.id] && !isVastAnker(u.groep, x.id)) || null;
      dag.uren.push({ u, item: it, lw, plan, planUit, half: it && status(u.groep, it.id).st === 'half', eerst });
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
const SVG = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICO = { beoordelen: SVG('<path d="M4.5 7l1.8 1.8L9.5 5.5M4.5 16l1.8 1.8 3.2-3.3M13 7.5h7M13 16.5h7"/>'), nu: SVG('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'), vandaag: SVG('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="M8 14h3"/>'),
  week: SVG('<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M8 10v10M13 10v10M18 10v10"/>'), jaar: SVG('<path d="M3 6h18M3 10h18M3 14h18M3 18h18"/><ellipse cx="15" cy="16" rx="2.4" ry="1.8" transform="rotate(-18 15 16)" fill="currentColor"/>'),
  rooster: SVG('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16"/>'), sectie: SVG('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
  team: SVG('<circle cx="9" cy="9" r="3"/><circle cx="16.5" cy="10" r="2.4"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M14 19a4 4 0 0 1 7 0"/>'),
  reclame: SVG('<path d="M4 10v4l11 4V6z"/><path d="M15 9.5a3 3 0 0 1 0 5M7 15l1 4h3l-1-3"/>'), instellingen: SVG('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'), zoek: SVG('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>') };
const ROUTES = [['nu', 'Nu'], ['vandaag', 'Dag'], ['week', 'Week'], ['beoordelen', 'Beoordelen'], ['jaar', 'Jaar'], ['rooster', 'Rooster'], ['sectie', 'Sectie'], ['team', 'Team'], ['reclame', 'Reclame'], ['instellingen', 'Instellingen']];
function render() {
  document.body.classList.toggle('kompasvenster', route.naam === 'kompas');
  const concert = bmConcertAan(); document.body.classList.toggle('bm-concert', concert);
  const liggen = blijftLiggen().length; const recNu = reclameOpen(vandaag()).length;
  $('#nav').innerHTML = ROUTES.map(([k, n]) => `<a href="#${k}" ${route.naam === k || (k === 'nu' && route.naam === 'regie') ? 'aria-current="page"' : ''}><span class="ico" aria-hidden="true">${ICO[k] || ''}</span><span class="nl">${n}${k === 'nu' && liggen ? ` <span class="nav-tel" title="${liggen} ${liggen === 1 ? 'taak blijft' : 'taken blijven'} liggen">${liggen}</span>` : ''}${k === 'reclame' && recNu ? ` <span class="nav-tel" title="${recNu} reclame vandaag of eerder">${recNu}</span>` : ''}</span></a>`).join('');
  if (concert) waak(true); else if (route.naam !== 'regie' && !LES && !LESKLOK.loopt()) waak(false);
  const f = { nu: viewNu, regie: viewRegie, vandaag: viewVandaag, week: viewWeek, jaar: viewJaar, rooster: viewRooster, sectie: viewSectie, team: viewTeam, reclame: viewReclame, instellingen: viewInstellingen, beoordelen: viewBeoordelen, kompas: viewKompas }[route.naam] || viewNu;
  try { $('#main').innerHTML = f(); }
  catch (e) { console.error(e); $('#main').innerHTML = `<div class="kaart"><h2>Dit scherm lukt nu niet</h2><p class="lead">Er ging iets mis bij het tekenen: ${esc(e && e.message)}. De andere onderdelen in het menu werken nog.</p></div>`; } // nooit een leeg scherm
  if (concert) bmCsMerk();
  if (klasScroll && $('#bmLijst')) { klasScroll = false; setTimeout(() => { const v = $('#bmLijst'); if (v) { v.scrollIntoView({ block: 'center' }); v.focus(); } }); }
  if (NW) nwGhost();
  if (route.naam === 'reclame') { recBeelden(); if (recFocus) { const el = document.getElementById('rec-' + recVeilig(recFocus)); if (el) el.scrollIntoView({ block: 'start' }); recFocus = ''; } }
}
/* meldingen onderaan. Na een handeling staat er acht seconden lang Ongedaan maken, in plaats van vooraf "Weet je het zeker?". terug: een foto() of een eigen functie */
let TERUG = null;
const foto = () => JSON.stringify({ S, AP }); // de stand van vóór een handeling
function toast(t, terug) {
  const el = $('#toast'); clearTimeout(toast.t); TERUG = terug || null;
  el.innerHTML = `<span>${esc(t)}</span>${TERUG ? '<button type="button" class="toast-terug" data-terug="">Ongedaan maken</button>' : ''}`; el.hidden = false;
  toast.t = setTimeout(() => { el.hidden = true; TERUG = null; }, TERUG ? 8000 : 4000);
}
function kopieOmvang(d) { // wat er in een kopie zit, in gewone woorden
  const n = (x, een, meer) => `${x} ${x === 1 ? een : meer}`; const r = Array.isArray(d.rooster) ? d.rooster.length : 0;
  const kl = isObj(d.voortgang) ? Object.keys(d.voortgang).length : 0; const tk = Array.isArray(d.taken) ? d.taken.length : 0;
  const ll = isObj(d.beoord) && isObj(d.beoord.lijsten) ? Object.keys(d.beoord.lijsten).length : 0;
  return `${n(r, 'les', 'lessen')} in het rooster, voortgang van ${n(kl, 'klas', 'klassen')}, ${n(tk, 'taak', 'taken')}${ll ? `, ${n(ll, 'klassenlijst', 'klassenlijsten')}` : ''}`;
}
async function kopieTerug(file) {
  let d; try { d = JSON.parse(await file.text()); } catch (e) { toast('Dit bestand kan ik niet lezen. Kies een kopie die Lesdag heeft gedownload.'); return; }
  const fout = staatFouten(d);
  if (fout.length) { alert(`Deze kopie zet ik niet terug: hij is kapot of hoort niet bij Lesdag.\n\nNiet in orde: ${fout.join(', ')}.\n\nJe gegevens op dit apparaat blijven zoals ze zijn.`); return; }
  const wanneer = d.updated ? new Date(d.updated).toLocaleString('nl-NL', { dateStyle: 'long', timeStyle: 'short' }) : 'onbekende datum';
  if (!confirm(`Kopie van ${wanneer} terugzetten?\n\nDaarin: ${kopieOmvang(d)}.\nNu op dit apparaat: ${kopieOmvang(S)}.\n\nAlles op dit apparaat wordt vervangen${SY && SY.aan() ? ', en via synchroniseren ook op je andere apparaten' : ''}.`)) return;
  const terug = foto(); try { localStorage.setItem(VOOR_KOPIE, JSON.stringify({ tijd: Date.now(), foto: terug })); } catch (e) {}
  S = Object.assign(nieuweStaat(), d); bewaar(); toast('Kopie teruggezet', terug);
}
function terugZetten() {
  if (!TERUG) return; const o = TERUG; TERUG = null;
  if (typeof o === 'function') { $('#toast').hidden = true; o(); return; }
  const f = JSON.parse(o); S = Object.assign(nieuweStaat(), f.S); AP = Object.assign(apLeeg(), f.AP); apBewaar(); bewaar();
  if (zGekoppeld() && !ZC) zOphalen(false);
  toast('Teruggezet');
}
function chipType(l) { return `<span class="chip ${l.type}">${esc(TYPE[l.type] || l.type)}</span>`; }
function matLinks(l, klein) {
  const m = l.materiaal || []; if (!m.length) return '';
  return `<div class="mats">${m.map(x => /^https?:/i.test(x.u || '') ? `<a class="btn ${klein ? 'klein' : ''}" href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t || 'link')}</a>` : `<span class="chip" title="${esc(x.u || '')}">${esc(x.t)}</span>`).join('')}</div>`;
}

/* ---------- vandaag / voorbereiding ---------- */
let dagKeuze = null, dagGetoond = null;
const agSel = {}; // gekozen agenda-item per dag
function dagLabel(d) { const t = vandaag(); return d === t ? 'vandaag' : d === addD(t, -1) ? 'gisteren' : d === addD(t, 1) ? 'morgen' : fmtD(d); } // de knop noemt waar je heen gaat
function viewVandaag() {
  const t = vandaag();
  let s = dagKeuze || t;
  if (!dagKeuze && S.afgesloten[t]) s = volgendeLesdag(t, 1); // dag afgesloten: dan pas morgen, en alleen als je zelf kijkt
  const p = planning(s, s)[s]; const lw = lesweekVan(s);
  const A = dagItems(s, p); const sel = kiesSel(s, A);
  // de toetsweek staat in de dagzin, per klas
  const zonderTijd = A.heleDag.filter(it => it.key.startsWith('tw:')); // toetsweektoets zonder tijd: onder de zin, als vraag
  const chips = A.heleDag.filter(it => !isToetsweekRij(it) && !zonderTijd.includes(it));
  const weg = A.items.filter(it => it.soort === 'uitval'); const Z = dagZin(s, p, A);
  dagGetoond = s; const voor = volgendeLesdag(s, -1), na = volgendeLesdag(s, 1);
  let h = `<div class="kop dag-kop"><div><h1>${esc(cap(fmtLang(s)))}</h1><p class="dag-zin">${lw ? 'Lesweek ' + lw + '. ' : ''}${esc(Z)}</p></div>
    <div class="knoppen"><button class="btn" data-dag="${voor}">‹ ${esc(dagLabel(voor))}</button>${s !== t && voor !== t && na !== t ? `<button class="btn" data-dag="${t}">vandaag</button>` : ''}<button class="btn" data-dag="${na}">${esc(dagLabel(na))} ›</button>
    <button class="btn kaal" data-afwezigopen="" aria-pressed="${afwezigOpen}">Ik ben er niet</button><button class="btn" data-nwnieuw="">+ Nieuw</button>${s === t && !p.reden && p.uren.length ? '<button class="btn hoofd" data-start="">▶ Lesmodus</button>' : ''}</div></div>`;
  if (afwezigOpen) h += afwezigForm(s);
  if (S.afwezig[s]) { const per = afwezigPeriode(s); h += `<div class="melding info afwezigrij">${per.length > 1 ? `Je bent afwezig ${dagenTekst(per)} (${per.length} lesdagen). Al je lessen in die periode vervallen en schuiven door.` : 'Je bent afwezig. Al je lessen van deze dag vervallen en schuiven door.'} <button class="btn klein" data-afwezigterug="${s}">Toch aanwezig${per.length > 1 ? ' op deze dag' : ''}</button>${per.length > 1 ? ` <button class="btn klein" data-afwezigperiode="${s}">Hele periode ongedaan</button>` : ''}</div>`; }
  if (!S.rooster.length && !ZC) h += `<div class="kaart" style="margin-bottom:1rem"><h2>Eerst je rooster</h2><p class="lead">Vul één keer je weekrooster in: per lesuur de groep en het lokaal. Daarna staan je lessen hier in de agenda, met wat er klaar moet staan.</p><p><a class="btn hoofd" href="#rooster">Rooster invullen</a></p></div>`;
  const achter = rooGroepen().filter(g => !Object.keys(S.voortgang[g] || {}).length && leergangVan(g) && reeks(leergangVan(g)).some(x => x.w < (lesweekVan(t) || nextLesweek()) - 1));
  let wacht = ''; // op een telefoon staan de lessen bovenaan; wat kan wachten komt eronder (bevinding 46)
  if (achter.length) wacht += `<div class="melding info">Begin je nu met Lesdag? ${esc(achter.join(', '))} staan nog op les 1. <button class="btn klein" data-opplanalle="">Zet ze op de planning</button> Dan gelden alle lessen vóór deze lesweek als gegeven.</div>`;
  if (s >= t) { h += uitvalBlok(s); wacht += liggenBlok(); }
  const onder = [...zonderTijd.map(it => `${it.tz ? `Toets ${(B.groepen[it.tz.lg] || [it.tz.lg]).join(', ')} ${it.tz.t.id}` : it.titel} staat in je leergang, maar niet in het rooster. Klopt dat?`), pauzeTekst(A.pz)].filter(Boolean);
  // ontwerp Ensemble B (30-10): links de zin en wat je met het gekozen blok doet, rechts de dag van boven naar beneden, zoals op Nu
  h += `<div class="dag-b"><div class="dag-links">${onder.map(o => `<p class="ens-twijfel">${esc(o)}</p>`).join('')}
    ${chips.length ? heleDagRij(s, chips) : ''}<div class="agpaneel">${agPaneel(s, p, A, sel)}</div></div>
    <div class="kaart agkaart dag-rechts">${agendaRaster([{ s, items: A.items }], { ppm: 1.35, sel })}${agOnder('Klik of sleep in de lege agenda.', weg.length)}</div></div>`;
  // klaarzetten per lokaal
  const perLokaal = {};
  (p.uren || []).forEach(x => { if (!x.item || x.uitval || x.klaar) return; const l = les(x.item); const k = x.u.lokaal || '009'; (perLokaal[k] = perLokaal[k] || []).push({ x, ben: benodigd(l), l }); });
  if (Object.keys(perLokaal).length) h += `<div class="grid">${Object.entries(perLokaal).map(([lok, arr]) => `<div class="kaart lokaalblok klaarzet"><h3>Klaarzetten in ${esc(lok)}</h3>${arr.map(({ x, ben }) => `<div><b style="font-family:var(--lees)">${esc(x.u.start)} ${esc(x.u.groep)}</b><div class="mats" style="margin:.2rem 0 .5rem">${ben.length ? ben.map(b => `<span class="chip">${esc(b)}</span>`).join('') : '<span class="leeg">niets bijzonders</span>'}</div></div>`).join('')}</div>`).join('')}</div>`;
  return h + wacht + dagExtra(s, p);
}
/* ---------- agenda: lessen, afspraken en geplande taken op hun tijd; vrije blokken voor taken ---------- */
const AG = { van: 8 * 60, tot: 17 * 60, werkVan: 8 * 60 + 30, werkTot: 16 * 60 + 30 };
const hm = m => Math.floor(m / 60) + ':' + ('0' + m % 60).slice(-2);
function sectieTijd(i) { const m = String(i.tijd || '').match(/(\d{1,2})[:.](\d{2})\s*[–-]\s*(\d{1,2})[:.](\d{2})/); return m ? { van: +m[1] * 60 + +m[2], tot: +m[3] * 60 + +m[4] } : null; }
/* schoolkoor: agenda uit de Koorapp (B.koor, via tools/koor-sync.js); op dinsdag anders de vaste repetitie */
function toetsweekOp(s) { /* schoolbreed: ergens op school toetsweek (standaardrepetitie koor); per klas: toetsweekVan */ return (B.sectie || []).some(i => /^toetsweek/i.test(i.titel || '') && s >= i.d && s <= (i.tot || i.d)); }
const toetsweekVan = (lg, s) => ((B.toetsweken || {})[lg] || []).find(tw => s >= tw.van && s <= tw.tot) || null; // uit de jaarplanning, per leergang
function toetsweekKlassen(s) { // jouw klassen die deze dag toetsweek hebben; m3a, m3b en m3c samen als m3
  const r = rooGroepen(); const gs = r.length ? r.concat(Object.keys(MEE_MET).filter(m => r.includes(MEE_MET[m]))) : alleGroepen().map(x => x.g);
  return [...new Set(gs.filter(g => { const lg = leergangVan(g); return lg && toetsweekVan(lg, s); }).map(g => g.replace(/^([hvm][1-6])[a-z]$/, '$1')))].sort();
}
const isToetsweekRij = it => it.soort === 'sectie' && /^toetsweek/i.test(it.titel || '');
let TWT = null;
function toetsweekToetsen() { // muziektoetsen die de leergang in een toetsweek zet: [{lg, t, tw}]
  if (TWT) return TWT; TWT = [];
  for (const [lg, L] of Object.entries(B.leergangen)) for (const w of L.weken) { if (!w.toetsweek) continue;
    const tws = (B.toetsweken || {})[lg] || [];
    const ma = (B.kalender.weken.find(k => k.w === w.w) || {}).datum; const i0 = ma && tws.find(i => addD(ma, 4) >= i.van && ma <= i.tot); if (!i0) continue; const tw = { d: i0.van, tot: i0.tot, titel: 'Toetsweek ' + i0.n };
    for (const i of [1, 2, 3]) { const l = w['l' + i]; const t = l && l.type === 'toets' && toetsVan(lg, l.toets); if (t && !TWT.some(x => x.lg === lg && x.t.id === t.id)) TWT.push({ lg, t, tw }); } }
  return TWT;
}
function toetsweekToetsVoor(groep, s) { const lg = groep && leergangVan(groep); return lg ? toetsweekToetsen().find(x => x.lg === lg && s >= x.tw.d && s <= (x.tw.tot || x.tw.d)) : null; }
function toetsInZermelo(x) { // staat deze toetsweektoets met tijd in het opgehaalde rooster?
  const gs = B.groepen[x.lg] || [];
  return !!(ZC && ZC.events || []).find(e => !e.vervallen && e.start && e.d >= x.tw.d && e.d <= (x.tw.tot || x.tw.d) && zMuziek(e) && zToets(e) && zKlassen(e).some(g => gs.includes(g)));
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
/* een presentatie doorlopen geldt per les, niet per dag: dezelfde les komt terug bij een parallelgroep of als hij doorschuift */
const presAf = key => Object.entries(S.dagTaken || {}).some(([d, dt]) => dt && dt[key] && d >= addD(vandaag(), -120));
function zetDagTaak(d, key, aan) { if (aan) { (S.dagTaken[d] = S.dagTaken[d] || {})[key] = true; return; } if (/^pres:/.test(key)) Object.values(S.dagTaken).forEach(dt => { if (dt) delete dt[key]; }); else if (S.dagTaken[d]) delete S.dagTaken[d][key]; }
function koorTakenOpen(s) { const G = geplandeSleutels(); return ((B.koor || {}).taken || []).filter(t => !S.koorAf[t.id] && !G.koor[t.id] && (!t.d || t.d <= addD(s, t.zicht || 21)) && (!t.tot || s <= t.tot)); }
function geplandeSleutels() { const sec = {}, pres = {}, koor = {}, rec = {}; (S.taken || []).forEach(k => { if (k.sectieId) sec[k.sectieId] = k; if (k.koorId) koor[k.koorId] = k; if (k.reclameId) rec[k.reclameId] = k; if (k.dagTaak) { pres[k.dagTaak.dag + '|' + k.dagTaak.key] = k; if (/^pres:/.test(k.dagTaak.key) && !planVoorbij(k)) pres[k.dagTaak.key] = k; } }); return { sec, pres, koor, rec }; }
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
    r.doel = (r.soort === 'excursie' || r.toegang === 'ticket') && r.sluit && r.sluit < r.d ? r.sluit : r.d; // excursie en tickets: reclame richt zich op de sluitdatum van het aanmelden of bestellen
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
  if (a.toegang === 'ticket') {
    if (!a.aanmeldlink) w.push('Website voor de tickets ontbreekt.');
    if (!a.kosten) w.push('Prijs van de tickets ontbreekt.');
  } else if (a.soort === 'excursie' && !a.sluit) w.push('Nog geen sluitdatum voor het aanmelden.');
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
      <label>Toegang<select data-recveld="${id}|toegang"><option value="">zonder tickets</option><option value="ticket"${a.toegang === 'ticket' ? ' selected' : ''}>met tickets</option></select></label>
      ${a.toegang === 'ticket' ? `<div class="rij">${veld('sluit', 'Bestellen tot en met', 'date')}${veld('kosten', 'Prijs', 'text', ' placeholder="€ 12,50"')}</div>${veld('aanmeldlink', 'Website voor de tickets')}` : a.soort === 'excursie' ? `<div class="rij">${veld('sluit', 'Aanmelden tot en met', 'date')}${veld('kosten', 'Kosten')}</div>${veld('aanmeldlink', 'Aanmelden via (link of plek)')}` : ''}
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
  h += `<div class="kaart"><h2>Te doen, komende week</h2>${nu.length ? nu.map(m => recMomentRij(m, true)).join('') : '<p class="leeg">Niets deze week.</p>'}<p class="sub" style="margin-top:.5rem">Ritme: weekinfo twee weken vooraf en in de week zelf, bord vanaf drie weken vooraf. Bij een excursie of tickets met een sluitdatum rekent Lesdag vanaf die datum.</p></div>`;
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
    const k = JSON.stringify([a.titel, a.ondertitel, a.d, a.aanvang, a.eind, a.plaats, a.zin, a.soort, a.sluit, a.toegang, a.kosten, a.aanmeldlink]);
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
  const mis = recWaarschuwingen(a); // ontbrekende gegevens: eerst vragen, de mail gaat dan pas klaar als Frans het zo wil
  if (mis.length && !confirm(`Bij "${a.titel}" klopt nog niet alles:\n\n- ${mis.join('\n- ')}\n\nToch de mail klaarzetten? Kies Annuleren om eerst de gegevens aan te vullen.`)) { toast('Mail niet klaargezet. Vul de gegevens aan en probeer opnieuw'); return; }
  const naam = RECLAME.bestand(a, soort);
  try { recDownload(naam, await recBestand(a, soort)); } catch (e) { console.warn(e); toast('De bijlage maken lukt niet'); return; }
  const ml = soort === 'bord' ? RECLAME.mailBord(a, RC.afzender) : RECLAME.mailWeekinfo(a, m && m.soort === 'wi' ? m.maandag : maandagVan(addD(vandaag(), 7)), recTekst(a), RC.afzender);
  setTimeout(() => { location.href = `mailto:${RC.mail}?subject=${encodeURIComponent(ml.onderwerp)}&body=${encodeURIComponent(ml.body)}`; }, 400);
  toast(`Mail staat klaar. Voeg "${naam}" uit Downloads toe als bijlage, en vink af als hij weg is.`);
}
function dagItems(s, p) {
  const t = vandaag(); const items = []; const heleDag = []; const G = geplandeSleutels();
  const werkdag = !(p.reden && /vakantie|weekend|lesweek/i.test(p.reden)) && !S.afwezig[s]; // afwezig: geen koffie en geen werkblokken
  if (werkdag) items.push({ key: 'start', van: AG.van, tot: AG.werkVan, soort: 'start', titel: 'Koffie en opstarten' });
  for (const x of p.uren || []) {
    const l = x.item ? les(x.item) : null; const verleden = s < t && !x.klaar;
    items.push({ key: 'les:' + x.u.id, van: minuten(x.u.start), tot: minuten(x.u.eind), soort: x.uitval ? 'uitval' : x.klaar ? 'klaar' : 'les', titel: x.u.groep,
      sub: x.uitval ? (x.afwezig ? 'afwezig' : x.u.vervallen ? 'vervallen' : ruilNaar(s, x.u) ? 'geruild naar ' + fmtD(ruilNaar(s, x.u).s) + ' ' + ruilNaar(s, x.u).start : x.planLes ? (x.planLes.titel || 'valt uit') : 'valt uit') : x.fout ? x.fout : verleden ? '' : l ? (l.titel || '') : 'alles gegeven', lokaal: x.u.lokaal || '009', x });
  }
  zAnders(s).forEach((a, n) => { // surveillance, toetsen en andere afspraken uit Zermelo
    const tg = a.toets ? a.klassen.find(g => toetsweekToetsVoor(g, s)) : null; const tz = tg ? toetsweekToetsVoor(tg, s) : null;
    const it = { key: 'z:' + s + ':' + n, soort: a.toets || a.dienst ? 'toets' : 'rooster', titel: tz ? tg + ' ' + tz.t.id + ' ' + tz.t.naam : a.titel,
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
  for (const i of B.team || []) { // team vwo 4-5-6 uit de algemene jaarplanning: zelfde vorm als een sectieafspraak
    const opDag = i.d === s || (i.tot && i.d <= s && i.tot >= s); if (!opDag) continue; const tm = sectieTijd(i);
    if (tm && !i.tot && tm.van < AG.tot) items.push({ key: 'team:' + i.id, van: tm.van, tot: Math.min(tm.tot, AG.tot), soort: 'sectie', titel: i.titel, sub: S.sectieNotitie[i.id] || '', i });
    else heleDag.push({ key: 'team:' + i.id, soort: 'sectie', titel: (tm ? hm(tm.van) + ' ' : '') + i.titel, i });
  }
  for (const m of reclameOpen(null, G)) if (m.d === s) heleDag.push({ key: 'rec:' + m.id, soort: 'deadline', titel: (m.soort === 'wi' ? 'tot ' + m.tot + ' ' : '') + m.titel, rec: m });
  for (const k of S.taken || []) {
    if (k.plan && k.plan.dag === s) items.push({ key: 'taak:' + k.id, van: minuten(k.plan.van), tot: minuten(k.plan.tot), soort: k.afspraak ? 'afspraak' : k.af ? 'taakaf' : planVoorbij(k) ? 'taakgemist' : 'taak', titel: k.titel, sub: k.afspraak ? 'afspraak' : planVoorbij(k) ? 'gemist' : BRON[k.bron] || '', k });
    else if (!k.plan && !k.af && k.d === s) heleDag.push({ key: 'taak:' + k.id, soort: 'deadline', titel: k.titel, k });
  }
  const pz = werkdag ? pauzeDag(s, items, heleDag) : null;
  if (pz) { pz.weg.filter(x => x.viaDag).forEach(x => items.push({ key: 'pzbezet:' + hm(x.van), van: x.van, tot: x.tot, soort: 'sectie', titel: x.door, sub: 'in je pauze', i: x.i })); // Sing-In en dergelijke: dan sta je daar
    pz.vrij.forEach(x => items.push({ key: 'pauze:' + hm(x.van), van: x.van, tot: x.tot, soort: 'pauze', titel: 'Pauze', sub: (x.tot - x.van) + ' min, van jou' }));
    if (pz.rust) items.push({ key: 'rust:' + s, van: pz.rust.van, tot: pz.rust.tot, soort: 'rust', titel: 'Rustblok', sub: 'in plaats van je pauze' }); }
  if (werkdag) { // vrije blokken tussen 8:30 en 16:30; pauzes en rustblokken zijn nooit vrij voor taken
    const bezet = items.filter(it => ['les', 'klaar', 'sectie', 'afspraak', 'taak', 'taakaf', 'taakgemist', 'koor', 'pauze', 'rust', 'toets', 'rooster'].includes(it.soort) || (it.soort === 'uitval' && !it.x.planLes)).map(it => [it.van, it.tot]).sort((a, b) => a[0] - b[0]);
    let cur = AG.werkVan;
    for (const [a, b] of bezet.concat([[AG.werkTot, AG.werkTot]])) { const eind = Math.min(a, AG.werkTot); if (eind - cur >= 15) items.push({ key: 'vrij:' + hm(cur), van: cur, tot: eind, soort: 'vrij', titel: 'Vrij', sub: (eind - cur) + ' min' }); cur = Math.max(cur, b); if (cur >= AG.werkTot) break; }
  }
  zetBanen(items);
  return { items, heleDag, werkdag, pz };
}
function zetBanen(items) { // overlappende items naast elkaar (vrije blokken overlappen nooit); geeft de items gesorteerd terug
  items.sort((a, b) => a.van - b.van || b.tot - a.tot);
  let groep = [], groepEind = -1;
  const sluitGroep = () => { const banen = []; groep.forEach(it => { let b = banen.findIndex(e => e <= it.van); if (b < 0) { b = banen.length; banen.push(0); } banen[b] = it.tot; it.baan = b; }); groep.forEach(it => { it.banen = banen.length; }); };
  for (const it of items) { if (it.soort === 'start') { it.baan = 0; it.banen = 1; continue; } if (it.van >= groepEind && groep.length) { sluitGroep(); groep = []; } groep.push(it); groepEind = Math.max(groepEind, it.tot); }
  if (groep.length) sluitGroep();
  return items;
}
/* de zin boven Dag: kort, wat de dag vraagt (regels: handboek/nu-zinnen.md) */
function dagZin(s, p, A) {
  if (!A.werkdag) return buitenJaar(p) ? buitenJaar(p).zin : `${cap(p.reden || 'Vrij')}.`;
  const L = A.items.filter(it => it.soort === 'les' || it.soort === 'klaar'); const V = A.items.filter(it => it.soort === 'uitval').length;
  const af = A.items.filter(it => ['toets', 'rooster', 'sectie', 'afspraak'].includes(it.soort) && it.sub !== 'in je pauze'); const kr = A.items.find(it => it.soort === 'koor');
  const naam = it => `${it.soort === 'toets' ? (it.z && it.z.dienst ? 'surveillance ' : 'de toets ') : ''}${titel(it.titel)}${it.lokaal ? ' in ' + it.lokaal : ''}`;
  const delen = [];
  if (L.length) delen.push(`${L.length} ${L.length === 1 ? 'les' : 'lessen'}, de eerste om ${hm(L[0].van)} (${L[0].titel})`);
  if (af.length) delen.push(`om ${hm(af[0].van)} ${naam(af[0])}${af.length > 1 ? ` en nog ${af.length - 1} ${af.length === 2 ? 'afspraak' : 'afspraken'}` : ''}`);
  if (kr) delen.push(`koor om ${hm(kr.van)}`);
  if (V) delen.push(L.length ? `${V} ${V === 1 ? 'les vervalt' : 'lessen vervallen'}` : 'je lessen vervallen');
  const zin = delen.length ? cap(delen.join('; ')) + '.' : 'Geen lessen of afspraken. De dag is vrij om te plannen.';
  const tk = toetsweekKlassen(s);
  return (tk.length ? `Toetsweek ${tk.join(', ')}. ` : '') + zin;
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
  const bezet = items.filter(it => ['les', 'klaar', 'sectie', 'afspraak', 'taak', 'taakaf', 'koor', 'toets', 'rooster'].includes(it.soort)); // een toets of surveillance in je pauze: dan is die pauze weg
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
/* hoe lang duurt een taak? Lesdag doet een voorstel, Frans beslist. Volgorde: wat Frans bij deze taak invult; anders de mediaan van
   minstens twee vergelijkbare taken (zelfde soort, overeenkomende woorden in de titel); anders de mediaan van de laatste tien taken van
   deze soort (minstens drie); anders de startwaarde uit Instellingen. Wat een taak echt kostte, komt uit de vraag bij het afvinken
   (S.duurLog: {s soort, t titel, e minuten, d datum, id}). Geen antwoord telt niet mee. */
const SCHAT = { pres: 10, koorrep: 15, sectie: 20, koor: 15, reclame: 15, mail: 15, slc: 20, les: 15, overig: 15 };
const SOORTNAAM = { pres: 'Presentatie doorlopen', koorrep: 'Koorrepetitie voorbereiden', sectie: 'Sectie', koor: 'Koor', reclame: 'Reclame', mail: 'Mail', slc: 'SLC', les: 'Lessen', overig: 'Overig' };
const soortVan = k => k.dagTaak ? (k.dagTaak.key === 'koor' ? 'koorrep' : 'pres') : k.bron && SCHAT[k.bron] ? k.bron : 'overig';
const vijf = n => Math.max(5, Math.round(n / 5) * 5);
const mediaan = L => { const z = [...L].sort((a, b) => a - b); const m = z.length >> 1; return z.length % 2 ? z[m] : (z[m - 1] + z[m]) / 2; };
const startMin = soort => (S.schatStart || {})[soort] || SCHAT[soort] || 15;
const GEEN_WOORD = new Set(['voor', 'naar', 'over', 'met', 'een', 'het', 'van', 'bij', 'uit', 'sectie', 'koor', 'presentatie', 'doorlopen']);
const woorden = t => [...new Set(String(t).toLowerCase().replace(/[^a-zà-ÿ0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !GEEN_WOORD.has(w)))];
function lijkt(a, b) { const A = woorden(a), B = woorden(b); if (!A.length || !B.length) return false; const n = A.filter(w => B.includes(w)).length; return n >= 2 || (n === 1 && A.length === 1 && B.length === 1); }
function schatting(soort, titel) {
  const L = (S.duurLog || []).filter(x => x.s === soort); const Z = L.filter(x => lijkt(x.t, titel)).slice(-5);
  if (Z.length >= 2) return { min: vijf(mediaan(Z.map(x => x.e))), waarom: `uit ${Z.length} vergelijkbare taken` };
  const R = L.slice(-10); if (R.length >= 3) return { min: vijf(mediaan(R.map(x => x.e))), waarom: `uit je laatste ${R.length} taken van deze soort` };
  return { min: startMin(soort), waarom: 'startwaarde' };
}
const schat = (soort, titel, eigen) => eigen || schatting(soort, titel).min;
const minVeld = k => `<label class="minveld" title="${esc(k.waarom)}"><input type="number" inputmode="numeric" min="5" max="480" step="5" value="${k.min}" data-minv="${esc(k.v)}" aria-label="Minuten voor ${esc(k.titel)}"> min</label>`;
/* ---------- rollen en potjes ----------
   Een rol is een label (stap 1 van handboek/voorstel-rollen.md): elke les, afspraak en taak hoort bij één rol, met een kleurstreepje in
   Dag en Week. Een potje komt er optioneel bij: uren die verantwoord moeten worden maar geen rol zijn. Alleen AST; PB-taak en Werkdruk zijn verminderingen.
   ROL_SOORT is de standaardrol per soort: agenda-soorten, soorten uit de sectieplanning en de soorten van de minutenregistratie. */
const ROL_SOORT = { les: 'docent', klaar: 'docent', uitval: 'docent', toets: 'docent', rooster: 'docent', cijfers: 'docent', rapport: 'docent', pres: 'docent', mail: 'docent', overig: 'docent',
  sectie: 'vakgroep', overleg: 'vakgroep', keuze: 'vakgroep', muziek: 'vakgroep', taak: 'vakgroep',
  koor: 'dirigent', koorvrij: 'dirigent', koorrep: 'dirigent', reclame: 'dirigent', team: 'team', slc: 'inter' }; // SLC hoort bij internationalisering (Frans 6-11)
// volgorde telt: de eerste die past. Rapportvergaderingen en excursies vallen onder voor- en nawerk (docent); ontwikkeldagen en IPB onder professional
const ROL_WOORD = [[/rapportvergader|overgangsvergader|excursie/i, 'docent'], [/\bipb\b|ontwikkeldag|\bpdca\b|cursus|nascholing|scholing|training|webinar|congres|vakliteratuur/i, 'prof'],
  [/teamvergader|team ?v456|\bv456\b|vwo ?4-?5-?6|burgerschap|leerlingbespreking/i, 'team'], [/erasmus|barcelona|internationali|uitwisseling|\bslc\b/i, 'inter']];
const POT_WOORD = [[/teamvergader|personeelsvergader|personeelsviering|viering personeel|jaaropening personeel|open dag|contactavond|diploma-?uitreiking|lokaalverantwoordelijk/i, 'ast']]; // AST: vaste lijst uit het normjaartaakbeleid
const logRol = x => x.rol || rolStandaard(x.s); // duurLog: oude regels zonder rol vallen terug op de standaardrol van hun soort (voor stap 4)
const rolLijst = () => (S.rollen || []).filter(r => r && r.id);
const potLijst = () => (S.potjes || []).filter(p => p && p.id);
const rolInfo = id => rolLijst().find(r => r.id === id) || null;
const potInfo = id => potLijst().find(p => p.id === id) || null;
const rolStandaard = soort => ROL_SOORT[soort] || 'docent';
const rolVanSectie = i => i.rol || (i.soort === 'team' ? 'team' : rolStandaard(i.soort));
const rolVanTaak = k => k.rol || (k.sectieId ? 'vakgroep' : k.dagTaak ? rolStandaard(k.dagTaak.key === 'koor' ? 'koorrep' : 'pres') : rolStandaard(k.bron || 'overig'));
function rolVanItem(it) {
  if (['vrij', 'start', 'pauze', 'rust'].includes(it.soort)) return '';
  if (it.k) return rolVanTaak(it.k); if (it.i) return rolVanSectie(it.i); if (it.koor) return 'dirigent'; if (it.rec) return rolStandaard('reclame');
  return rolStandaard(it.soort);
}
function rolVoorstel(tekst, bron) { // trefwoorden gaan voor de soort; alleen rollen en potjes die er nog zijn
  const r = (ROL_WOORD.find(([re]) => re.test(tekst || '')) || [])[1]; const p = (POT_WOORD.find(([re]) => re.test(tekst || '')) || [])[1];
  const rol = r && rolInfo(r) ? r : rolStandaard(bron || 'overig');
  return { rol, potje: p && potInfo(p) ? p : '' };
}
const kleurOk = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : '';
function rolStijl(rol) { // klasse en stijl voor het kleurstreepje; leeg als de rol er niet (meer) is
  const r = rolInfo(rol); const k = r && kleurOk(r.kleur); return k ? { cls: ' rol', st: `--rol:${k};`, naam: r.naam } : { cls: '', st: '', naam: '' };
}
// keuzelijsten voor taken. vanzelf: de waarde '' laat Lesdag kiezen (voorstel uit leesTaak); bij Aanpassen staat de rol vast
const rolOpties = (gekozen, vanzelf) => (vanzelf ? `<option value="">Rol: vanzelf (${esc((rolInfo(vanzelf) || {}).naam || 'geen')})</option>` : '') + rolLijst().map(r => `<option value="${esc(r.id)}"${r.id === gekozen ? ' selected' : ''}>${vanzelf ? 'Rol: ' : ''}${esc(r.naam)}</option>`).join('') + (gekozen && !rolInfo(gekozen) ? `<option value="${esc(gekozen)}" selected>${esc(gekozen)} (weggehaald)</option>` : '');
const potOpties = (gekozen, vanzelf) => (vanzelf != null ? `<option value="">Potje: vanzelf (${esc((potInfo(vanzelf) || {}).naam || 'geen')})</option><option value="-">Geen potje</option>` : '<option value="">Geen potje</option>') + potLijst().map(p => `<option value="${esc(p.id)}"${p.id === gekozen ? ' selected' : ''}>${vanzelf != null ? 'Potje: ' : ''}${esc(p.naam)}</option>`).join('');
function rolKeuzeZet(tekst, bron, rolSel, potSel) { // het voorstel in de eerste optie bijwerken terwijl je typt
  const v = rolVoorstel(tekst, bron); const a = $(rolSel), b = $(potSel);
  if (a && a.options[0] && a.options[0].value === '') a.options[0].textContent = `Rol: vanzelf (${(rolInfo(v.rol) || {}).naam || 'geen'})`;
  if (b && b.options[0] && b.options[0].value === '') b.options[0].textContent = `Potje: vanzelf (${(potInfo(v.potje) || {}).naam || 'geen'})`;
}
function rolUitKeuze(tekst, bron, rolW, potW) { // {rol, potje} uit de keuzelijsten, met het voorstel als je niets koos
  const v = rolVoorstel(tekst, bron); return { rol: rolW || v.rol, potje: potW === '-' ? '' : potW || v.potje };
}
const zetRol = (k, rp) => { k.rol = rp.rol; if (rp.potje) k.potje = rp.potje; else delete k.potje; return k; };
function rolKaart() {
  const R = rolLijst(), P = potLijst();
  return `<div class="kaart" id="rolKaart"><h2>Rollen en potjes</h2><p class="lead">Elke les, afspraak en taak hoort bij een rol; in Dag en Week zie je dat aan het kleurstreepje. Een taak kan daarnaast op het potje AST (algemene schooltaken) staan. PB-taak en Werkdruk zijn verminderingen van je taak, geen potjes. De uren uit Foleta vul je hier zelf in; ze blijven in je eigen gegevens.</p>
    <div class="tabelscroll"><table class="duurtabel"><thead><tr><th>Kleur</th><th>Rol</th><th>Uren (Foleta)</th><th></th></tr></thead><tbody>${R.map(r => `<tr><td><input type="color" value="${esc(kleurOk(r.kleur) || '#888888')}" data-rolveld="${esc(r.id)}|kleur" aria-label="Kleur ${esc(r.naam)}"></td><td><input class="rolnaam" value="${esc(r.naam)}" data-rolveld="${esc(r.id)}|naam" aria-label="Naam van de rol"></td><td><input type="number" inputmode="numeric" min="0" max="2000" step="1" value="${esc(String(r.uren || ''))}" data-rolveld="${esc(r.id)}|uren" aria-label="Uren ${esc(r.naam)}"></td><td><button class="btn klein" data-rolweg="${esc(r.id)}" title="Rol weghalen">×</button></td></tr>`).join('')}</tbody></table></div>
    <div class="knoppen" style="margin-top:.5rem"><button class="btn klein" data-rolerbij="">Rol erbij</button></div>
    <h3>Potjes</h3><div class="tabelscroll"><table class="duurtabel"><thead><tr><th>Potje</th><th>Uren (Foleta)</th><th></th></tr></thead><tbody>${P.map(p => `<tr><td><input class="rolnaam" value="${esc(p.naam)}" data-potveld="${esc(p.id)}|naam" aria-label="Naam van het potje"></td><td><input type="number" inputmode="numeric" min="0" max="2000" step="1" value="${esc(String(p.uren || ''))}" data-potveld="${esc(p.id)}|uren" aria-label="Uren ${esc(p.naam)}"></td><td><button class="btn klein" data-potweg="${esc(p.id)}" title="Potje weghalen">×</button></td></tr>`).join('')}</tbody></table></div>
    <div class="knoppen" style="margin-top:.5rem"><button class="btn klein" data-poterbij="">Potje erbij</button></div>
    <p class="sub" style="margin-top:.5rem">Standaard: lessen, toetsen, cijfers en rapporten bij Docent; sectie bij Vakgroepleider; koor en concertreclame bij Dirigent; team vwo 4-5-6 bij Teamlid; SLC bij Internationalisering. Bij een eigen taak doet Lesdag een voorstel op trefwoorden: teamvergadering, team V456, burgerschap → Teamlid; IPB, ontwikkeldag, PDCA, cursus, nascholing → Professional; rapportvergadering, excursie → Docent; Erasmus, Barcelona → Internationalisering. Op AST: teamvergadering, personeelsvergadering of -viering, open dag, contactavond, diploma-uitreiking, lokaalverantwoordelijkheid. Je kunt het altijd wijzigen.</p></div>`;
}
/* na het afvinken: hoe lang duurde het? Eén tik; overslaan mag en telt dan niet mee */
let DV = null;
function duurVraag(id, soort, titel, gok, gemeten, rp) { // rp: {rol, potje} van de taak; zonder rol telt de standaardrol van de soort
  let el = $('#duurvraag'); if (!el) { el = document.createElement('div'); el.id = 'duurvraag'; el.className = 'duurvraag'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  DV = { id, s: soort, t: titel, rol: (rp && rp.rol) || rolStandaard(soort), potje: (rp && rp.potje) || '' }; const g = vijf(gok); const keuze = [...new Set([vijf(g / 2), g, vijf(g * 1.5), vijf(g * 2)])];
  el.innerHTML = `<p><b>Hoe lang duurde het?</b> ${esc(kort(titel))}${gemeten ? ` · gemeten ${gemeten} min` : ''}</p><div class="knoppen">${keuze.map(m => `<button class="btn klein${m === g ? ' hoofd' : ''}" type="button" data-duurja="${m}">${m} min</button>`).join('')}<label class="minveld"><input id="dvMin" type="number" inputmode="numeric" min="1" max="480" step="5" aria-label="Aantal minuten"> min</label><button class="btn klein" type="button" data-duurok="">Noteer</button><button class="btn klein" type="button" data-duurnee="">Weet ik niet</button></div>`;
  el.hidden = false;
}
function duurDicht() { DV = null; const el = $('#duurvraag'); if (el) el.hidden = true; }
function duurNoteer(min) { if (!DV || !(min >= 1 && min <= 480)) { toast('Vul een aantal minuten in'); return; } const v = DV; duurDicht(); S.duurLog = (S.duurLog || []).concat(Object.assign({ s: v.s, t: v.t, e: min, d: vandaag(), id: v.id, rol: v.rol }, v.potje ? { potje: v.potje } : {})).slice(-300); bewaar(); toast(`Genoteerd: ${min} min. Lesdag rekent daar voortaan mee.`); }
function duurTerug(id) { if (DV && DV.id === id) duurDicht(); S.duurLog = (S.duurLog || []).filter(x => x.id !== id); }
function duurKaart() {
  const L = S.duurLog || []; const rij = ([k, n]) => { const sc = schatting(k, ''); const a = L.filter(x => x.s === k).length;
    return `<tr><td>${esc(n)}</td><td><input type="number" inputmode="numeric" min="5" max="480" step="5" value="${startMin(k)}" data-schatstart="${k}" aria-label="Startwaarde ${esc(n)}"></td><td>${sc.min} min</td><td>${a}</td></tr>`; };
  return `<div class="kaart"><h2>Hoe lang duurt een taak?</h2><p class="lead">Lesdag doet een voorstel, jij beslist. Eerst telt wat jij bij een taak invult. Anders kijkt Lesdag naar minstens twee vergelijkbare taken, dan naar je laatste taken van deze soort (minstens drie), en anders naar de startwaarde hieronder. Bij het afvinken vraagt Lesdag hoe lang het echt duurde; zo leert het voorstel. Sla je dat over, dan telt het niet mee.</p>
    <div class="tabelscroll"><table class="duurtabel"><thead><tr><th>Soort</th><th>Start (min)</th><th>Voorstel nu</th><th>Keer</th></tr></thead><tbody>${Object.entries(SOORTNAAM).map(rij).join('')}</tbody></table></div>
    ${L.length ? `<h3>Laatst genoteerd</h3>${L.slice(-8).reverse().map(x => `<div class="taak"><span>${esc(kort(x.t))}<span class="sub"> · ${esc(fmtD(x.d))}</span></span><span class="tb">${rolInfo(logRol(x)) ? `<span class="chip">${esc(rolInfo(logRol(x)).naam)}${x.potje && potInfo(x.potje) ? ' · ' + esc(potInfo(x.potje).naam) : ''}</span>` : ''}<span class="chip">${x.e} min</span><button class="btn klein" data-duurweg="${L.lastIndexOf(x)}" title="Deze meting niet meer meetellen">×</button></span></div>`).join('')}` : ''}</div>`;
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
  return `<div class="ag-hd">${toon.map(it => { const rs = rolStijl(rolVanItem(it)); return `<button class="ag-chip ag-${it.soort}${rs.cls}"${rs.st ? ` style="${rs.st}"` : ''} data-ag="${s}|${esc(it.key)}" title="${esc(it.titel + (rs.naam ? ' · ' + rs.naam : ''))}">${it.soort === 'deadline' ? 'deadline: ' : ''}${esc(it.titel)}</button>`; }).join('')}${rest ? `<button class="ag-chip ag-deadline" data-dag="${s}">+ ${rest} meer</button>` : ''}</div>`;
}
// dagen: [{s, items, kop?}], opt: {ppm, sel, compact}. Alleen wat aandacht vraagt krijgt een vorm: vrije tijd is leeg en koffie staat er niet in
function agendaRaster(dagen, opt) {
  const ppm = opt.ppm; const t = vandaag(); const nu = nuMin();
  const zicht = d => d.items.filter(it => it.soort !== 'vrij' && it.soort !== 'start' && (it.soort !== 'uitval' || !AP.uitVerberg || opt.sel === it.key));
  let van = AG.van, tot = AG.tot; // de agenda groeit mee met een vroege of late afspraak
  const rek = (a, b) => { van = Math.min(van, Math.floor(a / 60) * 60); tot = Math.min(1440, Math.max(tot, Math.ceil(b / 60) * 60)); };
  dagen.forEach(d => zicht(d).forEach(it => rek(it.van, it.tot)));
  const g = NW ? nwNu() : null; if (g && dagen.some(d => d.s === g.dag)) rek(g.van, g.tot);
  const hoog = (tot - van) * ppm;
  const uren = []; for (let m = van; m <= tot; m += 60) uren.push(m);
  const as = `<div class="ag-as" style="height:${hoog}px">${uren.map(m => `<span style="top:${(m - van) * ppm}px">${hm(m)}</span>`).join('')}</div>`;
  const kol = d => {
    const lijnen = uren.map(m => `<i class="ag-lijn" style="top:${(m - van) * ppm}px"></i>`).join('');
    const nuLijn = d.s === t && nu > van && nu < tot ? `<i class="ag-nu" style="top:${(nu - van) * ppm}px"></i>` : '';
    // een vervallen les is één grijze regel: de rest van dat uur is vrij en klikbaar
    const blokken = zetBanen(zicht(d).map(it => Object.assign({}, it, it.soort === 'uitval' ? { tot: it.van + Math.ceil(22 / ppm), echtTot: it.tot } : {}))).map(it => {
      const top = (it.van - van) * ppm; const h = Math.max(14, (it.tot - it.van) * ppm - 2);
      const w = 100 / (it.banen || 1); const kort = h < 38; const eind = it.echtTot || it.tot;
      const nuCls = d.s === t && nu >= it.van && nu < eind && it.soort === 'les' ? ' nu' : ''; const voorbij = d.s < t || (d.s === t && eind <= nu);
      const st = it.x ? magStip(d.s, it.x) : ''; // Magister: oker als er nog iets moet, groen als de les rond is
      const pak = it.k && it.k.plan && !it.k.dagTaak; const lok = it.lokaal && it.lokaal !== '009' && !opt.compact ? ' · ' + esc(it.lokaal) : '';
      const sub = !kort && it.sub && it.sub !== 'afspraak' && !['uitval', 'pauze', 'rust'].includes(it.soort) && h >= (opt.compact ? 62 : 44);
      const rs = rolStijl(rolVanItem(it)); // kleurstreepje per rol
      return `<button class="ag-it ag-${it.soort}${opt.sel === it.key ? ' sel' : ''}${nuCls}${kort ? ' kort' : ''}${voorbij ? ' voorbij' : ''}${pak ? ' pak' : ''}${it.x && it.x.u.extra ? ' eenmalig' : ''}${rs.cls}" style="${rs.st}top:${top}px;height:${h}px;left:calc(${(it.baan || 0) * w}% + 2px);width:calc(${w}% - 4px)" data-ag="${d.s}|${esc(it.key)}"${pak ? ` data-kid="${esc(it.k.id)}"` : ''} title="${esc(hm(it.van) + '–' + hm(eind) + ' ' + it.titel + (it.sub ? ' · ' + it.sub : '') + (it.x && it.x.u.extra ? ' · eenmalig' : '') + (st ? (st === 'ok' ? ' · Magister rond' : ' · nog iets in Magister') : '') + (rs.naam ? ' · ' + rs.naam : ''))}">${st ? `<i class="st${st === 'ok' ? ' ok' : ''}" aria-hidden="true"></i>` : ''}`
        + `<span class="ag-rg"><span class="ag-t">${hm(it.van)}${kort || opt.compact ? '' : '–' + hm(eind)}${lok}</span><b>${esc(it.titel)}</b></span>${sub ? `<span class="ag-s">${esc(it.sub)}</span>` : ''}${pak ? '<span class="ag-grip" aria-hidden="true"></span>' : ''}</button>`;
    }).join('');
    return `<div class="ag-kol${d.s === t ? ' vandaag' : ''}" data-kdag="${d.s}" style="height:${hoog}px">${lijnen}${nuLijn}${blokken}</div>`;
  };
  return `<div class="ag-raster ${opt.compact ? 'ag-compact' : 'ag-ruim'}" data-van="${van}" data-tot="${tot}" data-ppm="${ppm}" style="--n:${dagen.length}">${as}${dagen.map(kol).join('')}</div>`;
}
function agOnder(tekst, uitval) {
  return `<div class="ag-onder"><span>${esc(tekst)}</span>${uitval ? `<span class="ag-seg">Vervallen lessen <button type="button" data-uitzicht="1" aria-pressed="${!AP.uitVerberg}">tonen</button><button type="button" data-uitzicht="0" aria-pressed="${!!AP.uitVerberg}">verbergen</button></span>` : ''}</div>`;
}

/* ---------- nieuw in de agenda: klik of sleep in de lege agenda, of typ "do 11-12 met Albert". Het blok staat meteen op zijn plek ---------- */
let NW = null, AGD = null, agNegeer = false; // NW: open invulveld {dag, van, tot, tekst, vast, suggs}; AGD: slepen in de agenda
const NW_TAAK = /mail|voorbereid|nakijk|\btaak\b|doorlopen/i;
function nwNu() {
  const q = NW.tekst.trim(); const lt = q ? leesTaak(q, NW.dag, true) : null; const plan = lt && lt.plan; const middag = m => m < 7 * 60 ? m + 720 : m; // "om 2 uur" is 's middags
  const dag = plan ? plan.dag : (lt && lt.d) || NW.dag; const van = plan ? middag(minuten(plan.van)) : NW.van;
  let tot = plan ? middag(minuten(plan.tot)) : van + ((lt && lt.min) || (NW.tot - NW.van)); if (tot <= van) tot = van + 30; tot = Math.min(1440, tot);
  const klas = NW.klas || (q ? klasUitTekst(q) : '');
  const soort = NW.vast || (q && klas && LES_WOORD.test(q) ? 'les' : q && NW_TAAK.test(q) && !AFSPRAAK.test(q) ? 'taak' : 'afspraak');
  if (soort === 'les' && !(lt && lt.eigenDuur) && !NW.sleep) tot = Math.min(1440, van + lesDuur(klas)); // een les duurt zo lang als het vaste uur van de klas, tenzij je iets anders typt of sleept
  const ruw = lt && !(lt.titel === 'Taak' && !/taak/i.test(q)) ? lt.titel : ''; const titel = soort === 'afspraak' && /^met\s/i.test(ruw) ? 'Afspraak ' + ruw[0].toLowerCase() + ruw.slice(1) : ruw;
  return { dag, van, tot, titel, soort, bron: lt ? lt.bron : 'overig', klas, lokaal: NW.lokaal != null ? NW.lokaal : lokaalVan(klas), fout: lt ? lt.fout : '' };
}
function outlookUrl(titel, dag, van, tot) { const u = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') + ':00'; return 'https://outlook.office.com/calendar/deeplink/compose?subject=' + encodeURIComponent(titel || 'Afspraak') + '&startdt=' + dag + 'T' + u(van) + '&enddt=' + dag + 'T' + u(tot); }
function agGhost(kol, van, tot, tekst) { // het blok in wording
  document.querySelectorAll('.ag-ghost').forEach(x => x.remove()); if (!kol) return;
  const r = kol.closest('.ag-raster').dataset; const el = document.createElement('div'); el.className = 'ag-ghost'; el.style.top = (van - +r.van) * +r.ppm + 'px'; el.style.height = Math.max(24, (tot - van) * +r.ppm - 2) + 'px';
  el.innerHTML = `<span>${hm(van)}–${hm(tot)}</span><b>${esc(tekst)}</b>`; kol.appendChild(el);
}
function nwGhost() {
  if (!NW) { document.querySelectorAll('.ag-ghost').forEach(x => x.remove()); return; }
  const g = nwNu(); if (g.fout) { agGhost(null); return; } // geen blok op een plek die niet klopt
  const kol = document.querySelector(`.ag-kol[data-kdag="${g.dag}"]`);
  if (kol) { const r = kol.closest('.ag-raster').dataset; if (g.van < +r.van || g.tot > +r.tot) { render(); return; } } // render() tekent de ruimere agenda en komt hier terug
  agGhost(kol, g.van, g.tot, g.soort === 'les' ? `${g.klas || 'Les'} ${NW.weg ? 'geruild' : 'extra'}` : g.titel || (g.soort === 'taak' ? 'Nieuwe taak' : 'Nieuwe afspraak'));
}
function nwToon() {
  const g = nwNu(); const zicht = !!document.querySelector(`.ag-kol[data-kdag="${g.dag}"]`);
  $('#nwUit').textContent = `${g.soort === 'taak' ? 'Taak' : g.soort === 'les' ? 'Les' + (g.klas ? ' ' + g.klas : '') : 'Afspraak'} · ${g.fout ? 'dag of tijd klopt nog niet' : `${fmtD(g.dag)} · ${hm(g.van)}–${hm(g.tot)}${zicht ? '' : ' · niet in dit beeld'}`}`;
  const weg = g.soort === 'les' ? nwLes(g) : null; const w = g.fout || [botsing(g.dag, g.van, g.tot),weg && weg.anker ? `${weg.anker.t.id} staat op het uur dat vervalt. Lesdag vraagt daarna waar die heen gaat.` : ''].filter(Boolean).join(' '); $('#nwLet').textContent = w; $('#nwLet').hidden = !w;
  $('#nw').querySelectorAll('[data-nwsoort]').forEach(b => b.setAttribute('aria-pressed', b.dataset.nwsoort === g.soort));
  $('#nwUitlook').href = outlookUrl(g.titel, g.dag, g.van, g.tot);
  $('#nwUitlook').hidden = g.soort === 'les'; // een les gaat vanzelf mee met de agendafeed
  $('#nwLes').hidden = g.soort !== 'les';
  $('#nwSug').hidden = !NW.suggs.length || !!NW.tekst.trim() || g.soort === 'les';
  const vak = $('#nw').getBoundingClientRect(); if (innerHeight && vak.bottom > innerHeight - 12) $('#nw').style.top = Math.max(12, innerHeight - vak.height - 12) + 'px'; // met de keuze Les wordt het vak hoger
  nwGhost();
}
function nwLes(g) { // vult klas, lokaal en het uur dat vervalt; geeft dat uur terug
  const k = $('#nwKlas'); if (k.value !== g.klas) k.value = g.klas;
  const lok = $('#nwLok'); if (document.activeElement !== lok) lok.value = g.lokaal;
  const start = hm(g.van); const L = g.klas ? ruilUren(g.klas, g.dag, start) : []; const sl = [g.klas, g.dag, start, L.length].join('|'); const r = $('#nwRuil');
  if (NW.ruilSl !== sl) { NW.ruilSl = sl; r.innerHTML = `<option value="">Extra uur, er valt niets weg</option>${L.map(y => `<option value="${esc(y.s + '|' + y.u.id)}">Ruil: ${esc(fmtD(y.s))} ${esc(y.u.start)} valt weg${y.anker ? ' (' + esc(y.anker.t.id) + ')' : ''}</option>`).join('')}`; }
  const y = L.find(y => y.s + '|' + y.u.id === NW.weg); if (!y) NW.weg = ''; r.value = NW.weg || ''; return y || null;
}
function nwOpen(o, cx, cy) {
  sluit(); let el = $('#nw');
  if (!el) { el = document.createElement('div'); el.id = 'nw'; el.className = 'nw'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Nieuw in de agenda'); document.body.appendChild(el); }
  NW = Object.assign({ tekst: '', vast: null, suggs: [] }, o);
  el.innerHTML = `<label for="nwQ">Wat en wanneer</label><input id="nwQ" type="text" autocomplete="off" spellcheck="false" enterkeyhint="done" placeholder="Bijvoorbeeld: do 11-12 met Albert" value="${esc(NW.tekst)}">
    <p class="nw-uit" id="nwUit"></p><p class="nw-let" id="nwLet" hidden></p>
    <div class="ag-seg nw-seg"><button type="button" data-nwsoort="afspraak">Afspraak</button><button type="button" data-nwsoort="taak">Taak</button><button type="button" data-nwsoort="les">Les</button></div>
    <div class="nw-les" id="nwLes" hidden><div class="nw-rij"><label>Klas <select id="nwKlas"><option value="">Kies</option>${klasKeuzes().map(g => `<option value="${esc(g)}">${esc(klasLabel(g))}</option>`).join('')}</select></label><label>Lokaal <input id="nwLok" type="text" autocomplete="off" spellcheck="false" enterkeyhint="done"></label></div><label>Valt er een ander uur weg? <select id="nwRuil"></select></label></div>
    <div class="nw-sug" id="nwSug" hidden><p>Wat past hier?</p>${NW.suggs.map(k => `<button type="button" data-slot="${esc(k.v)}|${NW.dag}|${hm(NW.van)}|${hm(NW.van + k.min)}">${esc(kort(k.titel))} <small>${k.min} min${k.d ? ' · ' + esc(fmtD(k.d)) : ''}</small></button>`).join('')}</div>
    <div class="knoppen nw-voet"><button type="button" class="btn hoofd" data-nwzet="">Zet in de agenda</button><a class="btn" id="nwUitlook" target="_blank" rel="noopener">Ook in Outlook</a><button type="button" class="btn kaal" data-nwdicht="">Annuleer</button></div>`;
  const W = innerWidth, H = innerHeight, bw = 350, bh = 300; let x = cx + 24; if (x + bw > W - 12) x = cx - bw - 24;
  el.style.left = Math.max(12, x) + 'px'; el.style.top = Math.max(12, Math.min(cy - 30, H - bh - 12)) + 'px'; el.hidden = false;
  nwToon(); $('#nwQ').focus();
}
function nwDicht() { NW = null; const el = $('#nw'); if (el) el.hidden = true; nwGhost(); }
function nwZet() {
  if (!NW) return; const g = nwNu();
  if (g.fout) { const l = $('#nwLet'); l.textContent = g.fout; l.hidden = false; $('#nwQ').focus(); return; } // niet stil een andere dag of tijd kiezen
  if (g.soort === 'les') { nwZetLes(g); return; }
  if (!g.titel) { const l = $('#nwLet'); l.textContent = 'Typ nog wat het is.'; l.hidden = false; $('#nwQ').focus(); return; }
  const terug = foto(); const k = maakTaak('', { dag: g.dag, van: hm(g.van), tot: hm(g.tot) }, g.titel, g.bron); if (!k) return; if (g.soort === 'afspraak') k.afspraak = true;
  nwDicht(); agSel[g.dag] = 'taak:' + k.id; if (route.naam !== 'vandaag') weekKeuze = maandagVan(g.dag); // Dag blijft op de dag waar je kijkt (bevinding 54)
  bewaar(); toast(`${k.titel} staat op ${fmtD(g.dag)} om ${hm(g.van)}`, terug);
}
function nwZetLes(g) {
  const stop = (t, veld) => { const l = $('#nwLet'); l.textContent = t; l.hidden = false; $(veld).focus(); }; const start = hm(g.van); const weg = nwLes(g); const reden = vrijReden(g.dag);
  if (!g.klas) return stop('Kies de klas.', '#nwKlas');
  if (reden || S.afwezig[g.dag]) return stop(`${cap(fmtD(g.dag))} is geen lesdag: ${reden || 'je bent afwezig'}.`, '#nwQ');
  if (urenOp(g.dag).some(u => u.groep === g.klas && u.start === start)) return stop(`${g.klas} heeft dan al les.`, '#nwQ');
  if (RUIL_WOORD.test(NW.tekst) && !weg) return stop('Kies welk uur er vervalt.', '#nwRuil');
  const waarom = g.titel ? cap(g.titel.replace(klasRe(g.klas), ' ').replace(LES_WOORD, ' ').replace(/\s+/g, ' ').trim()) : ''; // wat je er verder bij typte, bijvoorbeeld de reden
  const id = extraMaak({ g: g.klas, s: g.dag, start, eind: hm(g.tot), lokaal: g.lokaal.trim(), weg, waarom }); const a = S.afwijkingen.find(x => x.id === id);
  nwDicht(); agSel[g.dag] = 'les:' + a.extraId; if (route.naam !== 'vandaag') weekKeuze = maandagVan(g.dag);
  bewaar(); toast(`${g.klas}: ${a.wat.toLowerCase()}`, () => maakOngedaan(id));
}
function nwNieuw() { // + Nieuw en de toets N: op de getoonde dag, of vandaag als die in de getoonde week valt
  const t = vandaag(); const ma = weekKeuze || maandagVan(t); const dag = route.naam === 'vandaag' ? dagGetoond || t : t >= ma && t <= addD(ma, 4) ? t : ma;
  const vroeg = dag === t ? Math.ceil((nuMin() + 5) / 15) * 15 : 0; const van = vroeg && vroeg < AG.werkTot ? Math.max(vroeg, AG.werkVan) : 9 * 60; nwOpen({ dag, van, tot: van + 30 }, innerWidth - 60, 110);
}
function nwVrij(dag, van, tot) { // klik of sleep in de lege agenda; in een werkblok ook wat daar past
  const blok = dagItems(dag, planning(dag, dag)[dag]).items.find(it => it.soort === 'vrij' && it.van <= van && it.tot > van);
  const sleep = tot != null; if (tot == null) tot = blok && blok.tot - van >= 15 ? Math.min(van + 30, blok.tot) : van + 30;
  return { dag, van, tot, sleep, suggs: blok && dag >= vandaag() ? kandidaten(dag).filter(k => k.min <= blok.tot - van).slice(0, 3) : [] };
}
function agStap(r) { if (route.naam === 'vandaag') dagKeuze = volgendeLesdag(dagGetoond || vandaag(), r); else weekKeuze = addD(weekKeuze || maandagVan(vandaag()), r * 7); render(); }
const agKlem = (x, a, b) => Math.max(a, Math.min(b, x));
function agTijd(kol, y) { const r = kol.closest('.ag-raster').dataset; return +r.van + (y - kol.getBoundingClientRect().top) / +r.ppm; }
document.addEventListener('pointerdown', e => {
  if (NW && !e.target.closest('#nw')) { const leeg = e.target.closest('.ag-kol') && !e.target.closest('.ag-it'); nwDicht(); if (leeg) return; }
  if (e.button !== 0 || LES || !['vandaag', 'week'].includes(route.naam)) return;
  const kol = e.target.closest('.ag-kol'); if (!kol) return; const blok = e.target.closest('.ag-it');
  if (blok) { // eigen afspraken en taken verschuiven; de onderrand maakt ze langer. Op een aanraakscherm via Aanpassen
    const k = blok.dataset.kid && e.pointerType !== 'touch' && (S.taken || []).find(x => x.id === blok.dataset.kid); if (!k) return;
    AGD = { soort: e.target.classList.contains('ag-grip') ? 'lang' : 'schuif', k, el: blok, kol, x: e.clientX, y: e.clientY, dag: k.plan.dag, van0: minuten(k.plan.van), tot0: minuten(k.plan.tot) }; AGD.van = AGD.van0; AGD.tot = AGD.tot0; return;
  }
  AGD = { soort: 'nieuw', kol, x: e.clientX, y: e.clientY, dag: kol.dataset.kdag, start: Math.round(agTijd(kol, e.clientY) / 15 - .3) * 15, touch: e.pointerType === 'touch' };
});
document.addEventListener('pointermove', e => {
  const d = AGD;
  if (!d) { // zweven: de lege agenda laat zien dat je hier iets kunt zetten
    if (e.pointerType !== 'mouse' || !['vandaag', 'week'].includes(route.naam)) return; let hv = document.querySelector('.ag-hover');
    const kol = !NW && !e.target.closest('.ag-it') && e.target.closest('.ag-kol'); if (!kol) { if (hv) hv.remove(); return; }
    const r = kol.closest('.ag-raster').dataset; const m = Math.min(+r.tot - 30, Math.round(agTijd(kol, e.clientY) / 15 - .3) * 15);
    if (!hv) { hv = document.createElement('div'); hv.className = 'ag-hover'; } if (hv.parentNode !== kol) kol.appendChild(hv);
    hv.style.top = (m - +r.van) * +r.ppm + 'px'; hv.textContent = '+ ' + hm(m); return;
  }
  if (d.touch) return; const dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (!d.moved) { if (Math.abs(dx) + Math.abs(dy) < 5) return; d.moved = true; const hv = document.querySelector('.ag-hover'); if (hv) hv.remove(); if (d.el) d.el.classList.add('bezig'); }
  const r = d.kol.closest('.ag-raster').dataset, ppm = +r.ppm, v0 = +r.van, t0 = +r.tot;
  if (d.soort === 'nieuw') { const a = agKlem(Math.round(agTijd(d.kol, e.clientY) / 5) * 5, v0, t0); d.van = Math.min(d.start, a); d.tot = Math.max(a, d.start + 15); agGhost(d.kol, d.van, d.tot, 'Nieuwe afspraak'); return; }
  if (d.soort === 'lang') { d.tot = agKlem(Math.round((d.tot0 + dy / ppm) / 5) * 5, d.van0 + 15, t0); d.el.style.height = Math.max(14, (d.tot - d.van) * ppm - 2) + 'px'; }
  else { const dur = d.tot0 - d.van0; d.van = agKlem(Math.round((d.van0 + dy / ppm) / 5) * 5, v0, t0 - dur); d.tot = d.van + dur; d.el.style.top = (d.van - v0) * ppm + 'px'; d.el.style.left = '2px'; d.el.style.width = 'calc(100% - 4px)';
    const naar = [...document.querySelectorAll('.ag-kol')].find(k => { const q = k.getBoundingClientRect(); return e.clientX >= q.left && e.clientX < q.right; }); if (naar && naar !== d.el.parentNode) { naar.appendChild(d.el); d.dag = naar.dataset.kdag; } }
  const tl = d.el.querySelector('.ag-t'); if (tl) tl.textContent = hm(d.van) + (d.el.classList.contains('kort') || d.el.closest('.ag-compact') ? '' : '–' + hm(d.tot));
});
document.addEventListener('pointerup', e => {
  const d = AGD; if (!d) return; AGD = null;
  if (d.soort === 'nieuw') { if (d.touch && Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 10) return; nwOpen(nwVrij(d.dag, d.moved ? d.van : d.start, d.moved ? d.tot : null), e.clientX, e.clientY); return; }
  if (!d.moved) return; agNegeer = true; setTimeout(() => { agNegeer = false; }, 50); // de klik na het slepen opent niets
  const terug = foto(); d.k.plan = { dag: d.dag, van: hm(d.van), tot: hm(d.tot) }; agSel[d.dag] = 'taak:' + d.k.id; bewaar(); toast(`${d.k.titel}: ${fmtD(d.dag)} ${hm(d.van)}–${hm(d.tot)}`, terug);
});
document.addEventListener('pointercancel', () => { const d = AGD; AGD = null; if (d && d.moved) render(); });
function agPaneel(s, p, A, sel) {
  const it = A.items.find(x => x.key === sel) || A.heleDag.find(x => x.key === sel);
  if (!it) return `<div class="kaart"><p class="lead">${A.werkdag ? 'Niets in de agenda op deze dag.' : 'Vrij.'}</p></div>`;
  const t = vandaag(); const tijd = it.van != null ? `${hm(it.van)}–${hm(it.tot)}` : '';
  if (it.x) return uurKaart(s, it.x, s === t && nuMin() >= it.van - 5 && nuMin() < it.tot);
  if (it.soort === 'start') { const eerste = A.items.find(x => x.soort === 'les'); return `<div class="kaart"><p class="eyebrow">${tijd}</p><h2>Koffie en opstarten</h2><p class="lead">${eerste ? `Eerste les om ${hm(eerste.van)}: ${esc(eerste.titel)}.` : 'Geen lessen vandaag.'}${startDaarna(A) ? ' ' + esc(startDaarna(A)) : ''}</p></div>`; }
  if (it.soort === 'vrij') return planKaart(s, p, it);
  if (it.soort === 'pauze' || it.soort === 'rust') return rustKaart(s, it, A, false);
  if (it.koor) return koorKaart(s, it.koor);
  if (it.rec) return reclameKaart(it.rec);
  if (it.k && it.k.afspraak) return afspraakKaart(it.k);
  if (it.k) { const k = it.k; return `<div class="kaart"><p class="eyebrow">${k.plan ? (planVoorbij(k) ? 'Gemist · ' : 'Gepland · ') + esc(fmtD(k.plan.dag)) + ' ' + esc(k.plan.van) + '–' + esc(k.plan.tot) : 'Eigen taak'}${k.bron ? ' · ' + esc(BRON[k.bron] || k.bron) : ''}</p><h2>${esc(k.titel)}</h2>${k.d ? `<p class="lead">Deadline ${esc(fmtD(k.d))}</p>` : ''}
    <label class="chk" style="margin:.6rem 0"><input type="checkbox" data-taakaf="${esc(k.id)}" ${k.af ? 'checked' : ''}><span>Klaar</span></label>
    <div class="knoppen">${openKnop(waarK(k), 'hoofd')}${k.reclameId ? `<button class="btn hoofd" data-recmail="${/#bord$/.test(k.reclameId) ? 'bord' : 'wi'}|${esc(k.reclameId.split('#')[0])}|${esc(k.reclameId)}">Mail ${/#bord$/.test(k.reclameId) ? 'bord' : 'weekinfo'}</button><button class="btn" data-recnaar="${esc(k.reclameId.split('#')[0])}">Naar reclame</button>` : ''}${planVoorbij(k) && !k.dagTaak ? `<button class="btn hoofd" data-liggenplan="eigen:${esc(k.id)}">Opnieuw plannen</button>` : ''}${k.plan ? `<button class="btn" data-ontplan="${esc(k.id)}">Uit de agenda halen</button>` : ''}<button class="btn" data-taakopen="eigen:${esc(k.id)}">Toelichting en feedback</button><button class="btn" data-taakbewerk="${esc(k.id)}">Aanpassen</button><button class="btn" data-taakweg="${esc(k.id)}">Verwijderen</button></div></div>`; }
  if (it.z || it.tz) { const tz = it.tz;
    return `<div class="kaart"><p class="eyebrow">${it.z ? 'Uit je Zermelo-rooster' + (tijd ? ' · ' + tijd : '') + (it.lokaal ? ' · ' + esc(it.lokaal) : '') : esc(tz.tw.titel)}</p><h2>${esc(it.z ? it.titel : `${(B.groepen[tz.lg] || []).join(', ')} ${tz.t.id} ${tz.t.naam}`)}</h2>
      ${tz ? `<p class="lead">${esc(tz.t.naam)} · ${esc(String(tz.t.duur || '?'))} min${tz.t.waar ? ' · ' + esc(tz.t.waar) : ''}</p>` : ''}
      ${it.z ? (it.z.titel !== it.titel ? `<p class="lead">In Zermelo: ${esc(it.z.titel)}</p>` : '') : '<p class="lead">De tijd van deze toets staat niet in je opgehaalde rooster. Kijk in Zermelo wanneer en waar; zodra hij erin staat, komt hij hier met tijd en lokaal.</p>'}</div>`; }
  if (it.i) return `<div class="kaart"><p class="eyebrow">${it.i.soort === 'team' ? 'Team vwo 4-5-6' : it.soort === 'deadline' ? 'Sectietaak · deadline vandaag' : 'Agenda sectie'}</p>${sRij(it.i)}${it.i.soort === 'team' ? '<div class="knoppen" style="margin-top:.5rem"><a class="btn" href="#team">Naar Team</a></div>' : ''}</div>`;
  return '';
}
function afspraakKaart(k) {
  return `<div class="kaart"><p class="eyebrow">Afspraak · ${esc(fmtD(k.plan.dag))} ${esc(k.plan.van)}–${esc(k.plan.tot)}</p><h2>${esc(k.titel)}</h2>${k.notitie ? `<p class="lead">${esc(k.notitie)}</p>` : ''}
    <div class="knoppen"><button class="btn hoofd" data-taakbewerk="${esc(k.id)}">Aanpassen</button>${openKnop(waarK(k))}<a class="btn" href="${esc(outlookUrl(k.titel, k.plan.dag, minuten(k.plan.van), minuten(k.plan.tot)))}" target="_blank" rel="noopener">Ook in Outlook</a><button class="btn" data-taakweg="${esc(k.id)}">Verwijderen</button></div></div>`;
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
  for (const x of p.uren || []) { if (!x.item || x.uitval || x.klaar) continue; const l = les(x.item); const key = 'pres:' + x.item.id; if ((l.materiaal || []).some(m => /presentatie|\.pptx/i.test((m.t || '') + ' ' + (m.u || ''))) && !presAf(key) && !pres[key] && !pres[s + '|' + key]) opties.push([`pres:${x.item.id}`, `Presentatie doorlopen: ${x.u.groep} ${l.titel}`]); }
  const van = s === vandaag() ? Math.max(it.van, Math.ceil(nuMin() / 5) * 5) : it.van; // niet beginnen in het verleden
  const ruimte = werkRuimte(it.tot - van); const duur = Math.min(ruimte, 50); const voork = planVoorkeur; planVoorkeur = '';
  // voorstellen: wat in dit blok past (zelfde volgorde als het werkblok op Nu), daarna wat nog geen plek heeft en waar het wel past
  const K = kandidaten(s); let used = 0; const hier = [];
  for (const k of K) { if (hier.length >= 3) break; if (used + k.min > ruimte || (k.voor != null && k.d === s && van + used + k.min > k.voor)) continue; hier.push({ k, van: van + used }); used += k.min; }
  const blok = vrijeBlokken(s, it.tot, 6); const elders = K.filter(k => !hier.some(x => x.k === k)).slice(0, 3).map(k => ({ k, sl: slotVoor(blok, k.min, k.d && k.d >= s ? k.d : null, k.voor) })); // een verlopen deadline: dan gewoon het eerste blok waar het past
  const rij = (k, rechts) => { const w = waarV(k.v);
    return `<div class="pk-rij"><span>${esc(kort(k.titel))}<span class="sub">${esc(k.waarom)}${k.d ? ' · ' + (k.v.startsWith('pres:') ? 'les ' : 'deadline ') + esc(fmtD(k.d)) : ''}</span>${w && w.info ? `<span class="pk-info">${esc(w.info)}</span>` : ''}</span><span class="pk-knop">${minVeld(k)}${openKnop(w)}${rechts}</span></div>`; };
  return `<div class="kaart plankaart"><p class="eyebrow">Werkblok · ${hm(it.van)}–${hm(it.tot)} · ${it.tot - it.van} minuten</p><h2>Hier past ongeveer ${ruimte} minuten werk. De rest is lucht.</h2>
  ${hier.map((x, i) => rij(x.k, `<button class="btn${i ? '' : ' hoofd'}" data-slot="${esc(x.k.v)}|${s}|${hm(x.van)}|${hm(x.van + x.k.min)}">Zet erin</button>`)).join('')}
  <details class="meer pk-anders"${hier.length && !voork ? '' : ' open'}><summary>Iets anders</summary>
  <form id="planForm" class="planform" data-dag="${s}">
    <label>Wat ga je doen?<select id="pK"><option value="">Nieuwe taak…</option>${opties.map(([v, n]) => `<option value="${esc(v)}"${v === voork ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
    <div id="pNieuw" class="rij"${voork ? ' hidden' : ''}><input id="pT" placeholder="Bijvoorbeeld: mail beantwoorden"><select id="pB">${Object.entries(BRON).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><select id="pR" aria-label="Rol">${rolOpties('', rolStandaard('sectie'))}</select><select id="pP" aria-label="Potje">${potOpties('', '')}</select></div>
    <label>Waar doe je het? Plak een link (mag leeg)<input id="pU" type="url" placeholder="https://… (bestand, map, mail of website)"></label>
    <div class="rij"><label>Van<input id="pVan" type="time" value="${hm(van).padStart(5, '0')}" min="07:00" max="22:00"></label><label>Tot<input id="pTot" type="time" value="${hm(van + duur).padStart(5, '0')}" min="07:00" max="22:00"></label></div>
    <button class="btn${hier.length ? '' : ' hoofd'}" type="submit">In de agenda zetten</button>
  </form></details>
  ${elders.length ? `<p class="eyebrow" style="margin-top:1.1rem;color:var(--muted)">Nog zonder plek</p>${elders.map(x => rij(x.k, `<span class="sub">${x.sl ? 'past ' + esc(slotTekst(x.sl)) : 'past deze week niet'}</span>`)).join('')}` : ''}</div>`;
}
// v: eigen:<id> | sec:<id> | koorrep | koor:<id> | pres:<lesid> | '' (nieuwe taak met titel en bron); plan: {dag, van, tot} of null
function maakTaak(v, plan, titel, bron) {
  const nieuwId = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); let k; v = v || '';
  S.taken = S.taken || []; const dag = plan ? plan.dag : vandaag(); const P = plan ? { dag: plan.dag, van: plan.van, tot: plan.tot } : undefined;
  if (v.startsWith('eigen:')) { k = S.taken.find(x => x.id === v.slice(6)); if (k && P) k.plan = P; return k; }
  if (v.startsWith('sec:')) { const i = sectieItems().find(x => x.id === v.slice(4)); if (i) k = Object.assign({ titel: i.titel, bron: 'sectie', sectieId: i.id, d: i.d, rol: rolVanSectie(i) }, i.potje ? { potje: i.potje } : {}); }
  else if (v === 'koorrep') { const kr = koorOp(dag); if (kr) k = { titel: 'Koorrepetitie voorbereiden: ' + kr.titel, bron: 'koor', dagTaak: { dag, key: 'koor' } }; }
  else if (v.startsWith('koor:')) { const kt = ((B.koor || {}).taken || []).find(x => x.id === v.slice(5)); if (kt) k = { titel: kt.titel, bron: 'koor', koorId: kt.id, d: kt.d }; }
  else if (v.startsWith('rec:')) { const m = reclameMoment(v.slice(4)); if (m) k = { titel: m.titel, bron: 'reclame', reclameId: m.id, d: m.d }; }
  else if (v.startsWith('pres:')) { const [lid, ld] = v.slice(5).split('@'); const d2 = ld || dag; const it = (planning(d2, d2)[d2].uren || []).find(x => x.item && x.item.id === lid); if (it) k = { titel: 'Presentatie doorlopen: ' + it.u.groep + ' ' + (les(it.item).titel || ''), bron: 'les', dagTaak: { dag: d2, key: 'pres:' + it.item.id } }; }
  else if (titel) k = { titel, bron: bron || 'overig' };
  if (!k) return null;
  k = Object.assign({ id: nieuwId(), af: false }, k); if (!k.rol) zetRol(k, rolVoorstel(k.titel, k.dagTaak ? (k.dagTaak.key === 'koor' ? 'koorrep' : 'pres') : k.bron)); if (P) k.plan = P; if ((S.minuten || {})[v]) { k.min = S.minuten[v]; delete S.minuten[v]; } S.taken.push(k); return k;
}
/* blijft liggen: gemiste geplande taken en voorbije deadlines, tot ze klaar, opnieuw gepland of uitgesteld zijn */
let planVoorkeur = ''; // taak die alvast klaarstaat in de keuzelijst van planKaart
const planVoorbij = k => !k.af && !k.afspraak && !!k.plan && k.plan.dag < vandaag();
function blijftLiggen() {
  if (!B || !S) return [];
  const t = vandaag(); const G = geplandeSleutels(); const op = key => (S.uitgesteld || {})[key] > t; const out = [];
  (S.taken || []).forEach(k => {
    if (k.af || k.afspraak || op('eigen:' + k.id)) return;
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
  const rij = x => `<div class="taak laat">${taakTitel(x.key, x.titel, `<input type="checkbox" ${x.vink} aria-label="Klaar: ${esc(x.titel)}">`)}<span class="tb"><span class="chip">${esc(BRON[x.bron] || x.bron || 'overig')}</span><span class="chip rood">${x.gemist ? 'gemist' : 'deadline'} ${esc(fmtD(x.dag))}</span><button class="btn klein hoofd" data-liggenplan="${esc(x.key)}">Plan</button><button class="btn klein" data-liggenlater="${esc(x.key)}|${morgen}">Morgen</button><label class="later">Later<input type="date" min="${addD(t, 1)}" data-liggentot="${esc(x.key)}"></label></span></div>`;
  const rest = L.slice(3);
  return `<div class="kaart liggen"><h2>Blijft liggen · ${L.length}</h2>${L.slice(0, 3).map(rij).join('')}${rest.length ? `<details class="meer"><summary>Nog ${rest.length} ${rest.length === 1 ? 'taak' : 'taken'}</summary>${rest.map(rij).join('')}</details>` : ''}</div>`;
}
/* taak openen: toelichting, klaar melden, feedback en feedforward. key zoals in blijftLiggen: eigen:<id> | sec:<id> | koor:<id> | rec:<id> */
function taakBron(key) {
  const i = key.indexOf(':'), soort = key.slice(0, i), id = key.slice(i + 1);
  if (soort === 'eigen') { const k = (S.taken || []).find(x => x.id === id); if (!k) return null;
    const via = k.koorId ? taakBron('koor:' + k.koorId) : k.sectieId ? taakBron('sec:' + k.sectieId) : k.reclameId ? taakBron('rec:' + k.reclameId) : null;
    return { titel: k.titel, bron: k.bron, dag: k.plan ? k.plan.dag : k.d, gemist: planVoorbij(k), af: k.af, vink: `data-taakaf="${esc(k.id)}"`, uitleg: (via ? via.uitleg : []).concat(k.notitie || []), knoppen: (k.reclameId && via ? via.knoppen : '') + openKnop(waarK(k)) + `<button class="btn" data-taakbewerk="${esc(k.id)}">Aanpassen</button>`, noot: via ? via.noot : key, eigen: !via }; }
  if (soort === 'sec') { const s = sectieItems().find(x => x.id === id); if (!s) return null; return { titel: s.titel, bron: 'sectie', dag: s.tot || s.d, af: S.sectieAf[id], vink: `data-sdone="${esc(id)}"`, uitleg: [s.info].filter(Boolean), knoppen: openKnop(waarV(key)), noot: key }; }
  if (soort === 'koor') { const t = ((B.koor || {}).taken || []).find(x => x.id === id); if (!t) return null; return { titel: t.titel, bron: 'koor', dag: t.d, af: S.koorAf[id], vink: `data-koorvink="${esc(id)}"`, uitleg: [t.sub].filter(Boolean), knoppen: openKnop(waarV(key)), noot: key }; }
  if (soort === 'rec') { const m = reclameMoment(id); if (!m) return null; return { titel: m.titel, bron: 'reclame', dag: m.d, af: m.af, vink: `data-recvink="${esc(id)}"`, uitleg: [m.soort === 'wi' ? 'Inleveren tot ' + m.tot + ' bij ' + RC.mail : 'Staande dia voor de borden, mail naar ' + RC.mail].concat(recWaarschuwingen(m.a)), knoppen: `<button class="btn" data-recmail="${m.soort}|${esc(m.a.id)}|${esc(id)}">Mail</button><button class="btn" data-recnaar="${esc(m.a.id)}">Naar reclame</button>`, noot: key }; }
  return null;
}
const nootVooruit = n => { const m = /^koor:koor-voor-.*-([^-]+)$/.exec(n); return m ? 'koor-voor:' + m[1] : n; }; // vaste koortaak: feedforward gaat mee naar het volgende concert
const nootVan = n => ({ fb: ((S.taakNoot || {})[n] || {}).fb || '', ff: ((S.taakNoot || {})[nootVooruit(n)] || {}).ff || '' });
function taakTitel(key, titel, chk) { const b = taakBron(key); const n = b ? nootVan(b.noot) : {}; return `<span class="chk">${chk}<button type="button" class="taak-open" data-taakopen="${esc(key)}">${esc(titel)}${n.fb || n.ff ? ' <small>· notitie</small>' : ''}</button></span>`; }
function openTaak(key) {
  const b = taakBron(key); if (!b) return; const d = $('#drawer'); const n = nootVan(b.noot); const ligt = !b.af && blijftLiggen().some(x => x.key === key);
  d.innerHTML = `<div class="dkop"><h2>Taak</h2><button class="btn" data-sluit="">Sluiten</button></div>
  <p class="eyebrow">${esc(BRON[b.bron] || b.bron || 'overig')}${b.dag ? ' · ' + (b.gemist ? 'gemist ' : 'deadline ') + esc(fmtD(b.dag)) : ''}</p><h2>${esc(b.titel)}</h2>
  <h3>Wat moet er gebeuren?</h3>${b.uitleg.length ? b.uitleg.map(x => `<p class="lead">${esc(x)}</p>`).join('') : `<p class="lead">Hier staat nog geen toelichting.${b.eigen ? ' Schrijf hem bij Aanpassen in de notitie.' : ''}</p>`}
  <div class="knoppen" style="margin:.6rem 0">${ligt ? `<button class="btn" data-liggenplan="${esc(key)}">Plan</button><button class="btn" data-liggenlater="${esc(key)}|${volgendeLesdag(vandaag(), 1)}">Morgen</button>` : ''}${b.knoppen}</div>
  <label class="chk taak-klaar"><input type="checkbox" ${b.vink} ${b.af ? 'checked' : ''}><span>Klaar</span></label>
  <div class="form"><label>Feedback: hoe ging het, klopt deze taak? <textarea rows="3" data-taaknoot="fb|${esc(b.noot)}">${esc(n.fb)}</textarea></label>
  <label>Feedforward: wat wil je volgende keer anders?${nootVooruit(b.noot) !== b.noot ? ' Staat ook bij dit punt van de volgende concerten.' : ''} <textarea rows="3" data-taaknoot="ff|${esc(b.noot)}">${esc(n.ff)}</textarea></label></div>`;
  d.classList.add('open'); $('#scrim').hidden = false;
}
function liggenInPlannen(v) { // opent het eerste vrije blok vanaf de getoonde dag, met deze taak al gekozen
  const t = vandaag(); let d = dagKeuze && dagKeuze > t ? dagKeuze : t;
  for (let i = 0; i < 10; i++, d = volgendeLesdag(d, 1)) {
    const p = planning(d, d)[d]; if (vrijReden(d) === 'weekend') continue;
    const blok = dagItems(d, p).items.find(it => it.soort === 'vrij' && (d > t || it.tot - nuMin() >= 15));
    if (!blok) continue;
    agSel[d] = blok.key; dagKeuze = d === t && nuMin() < 16 * 60 ? null : d; planVoorkeur = v; if (route.naam !== 'vandaag') location.hash = 'vandaag'; else render(); // vandaag: geen vaste dag, anders blijft de app daar morgen op staan
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
  (p.uren || []).forEach(x => { if (!x.item || x.uitval || x.klaar) return; const l = les(x.item); const pres = (l.materiaal || []).filter(m => /presentatie|\.pptx/i.test((m.t || '') + ' ' + (m.u || ''))); if (pres.length && !G.pres['pres:' + x.item.id] && !G.pres[s + '|pres:' + x.item.id]) auto.push({ key: 'pres:' + x.item.id, titel: `Presentatie doorlopen: ${l.titel}`, sub: `${x.u.start} ${x.u.groep} · let op onhandige dia's, volgorde en wat je zelf wilt zeggen`, af: presAf('pres:' + x.item.id) }); });
  const afspr = (S.taken || []).filter(k => k.afspraak && k.plan && k.plan.dag >= s).sort((a, b) => (a.plan.dag + a.plan.van.padStart(5, '0')) < (b.plan.dag + b.plan.van.padStart(5, '0')) ? -1 : 1);
  const eigen = (S.taken || []).filter(k => !k.afspraak && (!k.af || k.afOp === s)).sort((a, b) => (a.d || '9') < (b.d || '9') ? -1 : 1);
  const sect = sectieItems().filter(i => i.taak && !S.sectieAf[i.id] && !G.sec[i.id] && i.d <= addD(s, 14));
  const rij = (k, chk, extra) => `<div class="taak ${k.af ? 'af' : ''} ${(k.d && k.d < t && !k.af) || (k.plan && planVoorbij(k)) ? 'laat' : ''}">${k.open ? taakTitel(k.open, k.titel, chk) : `<label class="chk">${chk}<span>${esc(k.titel)}</span></label>`}<span class="tb">${k.bron ? `<span class="chip">${esc(BRON[k.bron] || k.bron)}</span>` : ''}${k.plan ? `<button class="chip ${planVoorbij(k) ? 'rood' : 'ok'}" data-ag="${esc(k.plan.dag)}|taak:${esc(k.id)}">${planVoorbij(k) ? 'gemist ' : ''}${esc(fmtD(k.plan.dag))} ${esc(k.plan.van)}</button>` : ''}${k.d ? `<span class="chip ${k.d < t && !k.af ? 'rood' : ''}">deadline ${esc(fmtD(k.d))}</span>` : ''}${extra || ''}</span>${k.sub ? `<div class="sub">${esc(k.sub)}</div>` : ''}</div>`;
  let h = `<div class="kaart"><h2 style="margin-bottom:.3rem">Taken</h2><p class="lead" style="margin-bottom:.4rem">Klik in de agenda op een vrij blok om een taak op een vast moment te zetten.</p>`;
  if (auto.length) h += `<h3>Lessen van ${s === t ? 'vandaag' : 'deze dag'}</h3>` + auto.map(k => rij(k, `<input type="checkbox" data-dagtaak="${esc(k.key)}" data-dag="${s}" ${k.af ? 'checked' : ''}>`)).join('');
  const kr = koorOp(s); const krRep = kr && (kr.type === 'rep' || kr.type === 'extra') && !G.pres[s + '|koor'] ? kr : null; const kt = koorTakenOpen(s);
  if (krRep || kt.length) h += '<h3>Koor</h3>' + (krRep ? rij({ titel: koorNaam(krRep) + ' voorbereiden: ' + krRep.titel, sub: (krRep.van ? krRep.van + ' · ' : '') + ((krRep.plan || []).map(x => x.stuk).join(', ') || 'repetitieplan in de koorapp'), af: !!dt.koor, bron: 'koor' }, `<input type="checkbox" data-dagtaak="koor" data-dag="${s}" ${dt.koor ? 'checked' : ''}>`) : '') + kt.map(t => rij({ open: 'koor:' + t.id, titel: t.titel, d: t.d, sub: t.sub, bron: 'koor', af: false }, `<input type="checkbox" data-koorvink="${esc(t.id)}">`)).join('');
  const rec = reclameOpen(addD(s, 7), G); if (rec.length) h += '<h3>Reclame</h3>' + rec.map(m => rij({ open: 'rec:' + m.id, titel: m.titel, d: m.d, sub: m.soort === 'wi' ? 'Inleveren tot ' + m.tot + ' bij ' + RC.mail : 'Staande dia voor de borden, mail naar ' + RC.mail, bron: 'reclame', af: false }, `<input type="checkbox" data-recvink="${esc(m.id)}">`, `<button class="btn klein" data-recmail="${m.soort}|${esc(m.a.id)}|${esc(m.id)}">Mail</button>`)).join('');
  if (sect.length) h += `<h3>Sectie, komende twee weken</h3>` + sect.map(i => rij({ open: 'sec:' + i.id, titel: i.titel, d: i.d, bron: 'sectie', af: false }, `<input type="checkbox" data-sdone="${esc(i.id)}">`)).join('');
  if (afspr.length) h += '<h3>Afspraken</h3>' + afspr.map(k => rij(k, '', `<button class="btn klein" data-taakbewerk="${esc(k.id)}">Aanpassen</button>`)).join('');
  h += `<h3>Eigen taken</h3>` + (eigen.length ? eigen.map(k => rij(Object.assign({ open: 'eigen:' + k.id }, k), `<input type="checkbox" data-taakaf="${esc(k.id)}" ${k.af ? 'checked' : ''}>`, `<button class="btn klein" data-taakbewerk="${esc(k.id)}">Aanpassen</button><button class="btn klein" data-taakweg="${esc(k.id)}" title="verwijderen">×</button>`)).join('') : '<p class="leeg">Nog geen eigen taken. Zet hier wat uit de mail, het koor, SLC of de sectie op je komt.</p>');
  h += `<form id="tAdd" class="rij taakform"><input id="tT" placeholder="Nieuwe taak" required><select id="tB">${Object.entries(BRON).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><select id="tR" aria-label="Rol">${rolOpties('', rolStandaard('sectie'))}</select><select id="tP" aria-label="Potje">${potOpties('', '')}</select><input id="tD" type="date"><button class="btn" type="submit">Toevoegen</button></form></div>`;
  return h;
}
function volgendeLesdag(s, stap) { let d = s; for (let i = 0; i < 30; i++) { d = addD(d, stap); const r = vrijReden(d); if (r !== 'weekend') return d; } return addD(s, stap); }
function uurKaart(s, x, nu) {
  const u = x.u;
  const kop = `<div class="tijd">${esc(u.start)}<small>${esc(u.eind)}</small><span class="lokaal">${esc(u.lokaal || '009')}</span></div>`;
  if (x.fout) return `<div class="uur">${kop}<div class="in"><div class="regel"><span class="groep">${esc(u.groep)}</span><span class="chip rood">${esc(x.fout)}</span></div></div></div>`;
  if (x.uitval) return `<div class="uur klaar">${kop}<div class="in"><div class="regel"><span class="groep">${esc(u.groep)}</span><span class="chip">${x.afwezig ? 'afwezig' : u.vervallen ? 'vervallen in Zermelo' : ruilNaar(s, u) ? esc(`geruild naar ${fmtD(ruilNaar(s, u).s)} ${ruilNaar(s, u).start}`) : x.planLes ? esc(x.planLes.titel || 'valt uit') : 'valt uit'}</span>${u.vervallen && u.reden ? `<span class="chip">${esc(u.reden)}</span>` : ''}</div>${u.vervallen || x.afwezig || x.planLes ? '' : ruilNaar(s, u) && afVanExtra(ruilNaar(s, u).id) ? `<div><button class="btn klein" data-afwijkingterug="${esc(afVanExtra(ruilNaar(s, u).id).id)}">ruil ongedaan</button></div>` : `<div><button class="btn klein" data-uitvalterug="${s}|${u.id}">toch les</button></div>`}</div></div>`;
  if (!x.item) return `<div class="uur">${kop}<div class="in"><div class="regel"><span class="groep">${esc(u.groep)}</span><span class="leeg">alle lessen van ${esc(lgNaam(leergangVan(u.groep)))} zijn gegeven</span>${u.extra ? '<span class="chip let">eenmalig</span>' : ''}</div>${u.extra && afVanExtra(u.id) ? `<div><button class="btn klein" data-afwijkingterug="${esc(afVanExtra(u.id).id)}">haal dit uur weg</button></div>` : ''}</div></div>`;
  const l = les(x.item); const lg = x.item.lg;
  const t = l.type === 'toets' ? toetsVan(lg, l.toets) : null;
  const diff = x.lw && !x.anker ? x.lw - x.item.w : 0;
  const inToets = Object.entries(S.voortgang[u.groep] || {}).find(([id, st]) => st.inToets === x.item.id);
  const ankChip = !x.anker ? '' : x.anker.verplaatst ? `<span class="chip let" title="${esc(x.anker.verplaatst.reden || '')}">verplaatst</span>` : x.anker.vast ? '<span class="chip rood">toets staat vast</span>' : x.anker.grens && x.anker.grens.s === s ? '<span class="chip let">laatste lesuur in de periode</span>' : '';
  const voorToets = inToets ? reeks(lg).find(y => y.id === inToets[0]) : null;
  const plan = x.planUit ? `<span class="chip let" title="${esc(x.planUit.titel || '')}">planning: ${esc((x.planUit.titel || 'valt uit').replace(/^Valt uit: /, 'uitval: '))}</span>` : '';
  const ev = x.plan && x.plan.event ? `<span class="chip">${esc(x.plan.event)}</span>` : '';
  const lesMeer = `<button class="btn" data-bewerk="${esc(x.item.id)}">bewerk les</button>${x.klaar ? '' : u.extra && afVanExtra(u.id) ? `<button class="btn" data-afwijkingterug="${esc(afVanExtra(u.id).id)}">haal dit uur weg</button>` : `<button class="btn" data-uitval="${s}|${u.id}">valt uit</button>`}`;
  return `<div class="uur ${nu ? 'nu' : ''} ${x.klaar ? 'klaar' : ''}">${kop}<div class="in">
    <div class="regel"><span class="groep">${esc(u.groep)}</span>${chipType(l)}<span class="titel">${esc(l.titel || '')}${t ? ' – ' + esc(t.naam) : ''}</span>${x.half ? '<span class="chip let">vervolg</span>' : ''}${ankChip}${x.klaar ? `<span class="chip ok">${esc(x.st.st)}</span>` : ''}</div>
    ${vorigeRegel(x, true)}
    ${voorToets ? `<div class="vorige">Eerst: ${esc(les(voorToets).titel || '')}. Past dat nog naast de toets?</div>` : ''}
    <div class="regel">${u.extra ? `<span class="chip let">${(S.extraUren || []).some(e => e.id === u.id && e.ruil) ? 'geruild uur' : 'extra uur'}</span>` : ''}<span class="chip">${esc(lgNaam(lg))} · les uit lesweek ${x.item.w}</span>${diff > 0 ? `<span class="chip let">${diff} ${diff === 1 ? 'week' : 'weken'} achter op de planning</span>` : diff < 0 ? `<span class="chip ok">${-diff} week voor</span>` : ''}${plan}${ev}${u.anderLokaal ? `<span class="chip rood">ander lokaal: ${esc(u.lokaal)}</span>` : ''}${u.reden ? `<span class="chip let">${esc(u.reden)}</span>` : ''}${u.zermelo && route.naam !== 'vandaag' ? '<span class="chip">Zermelo</span>' : ''}</div>
    ${l.doel ? `<p class="doel">${esc(l.doel)}</p>` : l.detail ? `<p class="doel">${esc(l.detail)}</p>` : ''}
    ${(l.fasen || []).length ? `<details class="meer"><summary>Lesverloop</summary><ol class="fasen">${l.fasen.map(f => `<li>${esc(LESMODUS.faseTekst(f))}</li>`).join('')}</ol></details>` : ''}
    ${matLinks(l)}
    <div class="knoppen">${x.klaar ? '' : `<button class="btn hoofd" data-start="${esc(u.id)}|${s}">▶ Geef les</button>`}${bmVoor(x.item).map(m => `<button class="btn" data-beoordeel="${esc(m.id)}|${esc(u.groep)}">Beoordelen ${esc(m.toets)}</button>`).join('')}${route.naam === 'vandaag' ? '' : lesMeer}</div>${route.naam === 'vandaag' ? `<details class="meer"><summary>Meer</summary><div class="knoppen" style="margin-top:.4rem">${lesMeer}</div></details>` : ''}
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
  if (!uren.length) return `<p class="lead">Er is geen lesuur meer vrij tussen lesweek ${verplaatsGrens(g, a)[0]} en lesweek ${verplaatsGrens(g, a)[1]} (einde van de periode).</p>`;
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
function afwijkingenKaart(g) {
  const L = (S.afwijkingen || []).filter(a => a.g === g); if (!L.length) return '';
  return `<div class="kaart"><h2>Anders dan de studiewijzer</h2><div class="scroll"><table><tr><th>Stond</th><th>Wat er gebeurde</th><th>Waarom</th><th></th><th></th></tr>${L.map(a => `<tr><td class="num">${esc(a.studiewijzer || '')}</td><td>${esc(a.wat)}</td><td>${esc(a.waarom || '')}</td><td><span class="chip ${a.soort === 'pta' ? 'rood' : ''}">${a.soort === 'eenmalig' ? 'eenmalig' : a.soort === 'pta' ? 'afwijking PTA' : a.soort === 'pto' ? 'afwijking PTO' : 'alleen jij'}</span></td><td><button class="btn klein" data-afwijkingterug="${esc(a.id)}">ongedaan</button></td></tr>`).join('')}</table></div></div>`;
}

/* ---------- nu: één scherm dat je dag volgt ----------
   Ontwerp Ensemble (30-10): bovenaan één zin die zegt wat nu telt (nuZin), met de knoppen van dat moment eronder en de nu-kaart als
   verdieping. De kaart wisselt per moment: opstarten, voor de les, presentie in de eerste 15 minuten, in de les, na de bel, pauze,
   rustblok, koor, werkblok, dag afsluiten, stil. Rechts de dag als rustige lijst en wat er nog openstaat (Magister, voorstellen waar
   Frans zelf ja of later op zegt). In een pauze staat er alleen de tijd; in een rustblok niets over werk.
   Lestijd ligt vast: Lesdag stelt nooit voor om iets uit een les te halen of een les korter te maken. */
let nuKijk = null; // gekozen blok in de partituur; anders volgt het scherm de klok
let nuKijkVan = null, nuKijkT = 0; const KIJK_DUUR = 3 * 60000; // na drie minuten kijken volgt Nu de klok weer
const cap = t => String(t).charAt(0).toUpperCase() + String(t).slice(1);
const lesUren = p => (p.uren || []).filter(x => x.item && !x.uitval);
const startDaarna = A => { const it = A.items.filter(x => !['start', 'uitval'].includes(x.soort) && x.tot > AG.werkVan).sort((x, y) => x.van - y.van)[0]; if (!it || it.x || it.soort === 'les') return ''; return `Om ${hm(it.van)} begint ${it.soort === 'vrij' ? 'je eerste werkblok' : it.soort === 'koor' ? 'het koor' : it.soort === 'pauze' ? 'je pauze' : it.soort === 'rust' ? 'een rustblok' : it.titel}.`; }; // wat er na het opstarten komt; bij een les noemt de tekst die al zelf
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
  const afs = dek('afspraak'); if (afs) return { m: 'afspraak', it: afs }; // een afspraak gaat voor een geplande taak: daar word je verwacht
  const tk = dek('taak') || dek('taakaf'); if (tk) return { m: 'taak', it: tk };
  const sc = dek('toets') || dek('sectie') || dek('rooster'); if (sc) return { m: 'afspraak', it: sc };
  if (dek('start')) return { m: 'start' };
  const nogIets = A.items.some(it => it.van >= nu && ['les', 'koor', 'sectie', 'afspraak', 'taak', 'toets', 'rooster'].includes(it.soort));
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
  if (nuKijk !== nuKijkVan) { nuKijkVan = nuKijk; nuKijkT = Date.now(); } else if (nuKijk && Date.now() - nuKijkT > KIJK_DUUR) nuKijk = nuKijkVan = null; // vanzelf terug naar nu (bevinding 20)
  const kijk = nuKijk && (nuKijk === 'afsluiten' || A.items.some(it => it.key === nuKijk)) ? nuKijk : null;
  const rustig = !kijk && (m.m === 'pauze' || m.m === 'rust'); const stil = !kijk && (m.m === 'stil' || m.m === 'vrijedag');
  const geenVoorstel = rustig || stil || (!kijk && (m.m === 'start' || m.m === 'afsluiten' || m.m === 'tussen')); // vóór 8:30 en bij het afsluiten: niets erbij
  const [kaart, acties] = dokUit(kijk ? kijkKaart(s, p, A, kijk, nu) : nuKaart(s, p, A, m, nu));
  const kIt = kijk && kijk !== 'afsluiten' ? A.items.find(it => it.key === kijk) : null;
  const mom = kijk ? (kIt ? MOMSOORT[kIt.soort] || 'werkblok' : 'afsluiten') : m.m;
  const Z = nuZin(s, p, A, m, nu, kijk, kIt); const live = (m.it && m.it.key) || (m.x && 'les:' + m.x.u.id) || (m.m === 'afsluiten' ? 'afsluiten' : '');
  let h = `<div class="nu-scherm nu-ens" data-moment="${mom}"><div class="ens-kop"><span class="ens-dag">${esc(cap(fmtLang(s)))}${lesweekVan(s) ? ' · lesweek ' + lesweekVan(s) : ''}</span>
    ${A.items.length && m.m !== 'pauze' ? `<span class="nb-stap"><button class="nb-knop" data-stap="-1" aria-label="Vorig moment">‹</button><button class="nb-knop nb-nu${kijk ? '' : ' verborgen'}" data-kijk=""${kijk ? '' : ' tabindex="-1" aria-hidden="true"'}>Nu</button><button class="nb-knop" data-stap="1" aria-label="Volgend moment">›</button></span>` : ''}<span class="ens-klok">${hm(nu)}</span></div>`;
  if (m.m === 'pauze' && !kijk) return h + `<div class="ens-pauze"><p class="ens-zin">${esc(Z.zin)}</p><p class="ens-sub">${esc(Z.sub)}</p><a class="ens-stil" href="#vandaag">Toch iets opzoeken</a></div></div>`; // in de pauze: alleen de tijd
  const pzVraag = !rustig && A.werkdag && A.pz && A.pz.onbekend && !pauzeVraagWeg() ? pauzeVraag() : ''; // onderaan, niet bovenaan (bevinding 21)
  const twijfel = rustig || stil ? '' : zinTwijfel(A);
  const meld = rustig || stil ? '' : nuMeldingen(s);
  h += `<div class="ens${rustig ? ' zonder' : ''}${meld ? ' met-meld' : ''}"><div class="ens-links">${Z.lab ? `<p class="ens-lab">${kijk ? 'Ander moment · ' : ''}${esc(Z.lab)}</p>` : ''}<h1 class="ens-zin">${esc(Z.zin)}</h1>${twijfel ? `<p class="ens-twijfel">${esc(twijfel)}</p>` : ''}
    ${acties || Z.knop ? `<div class="ens-acties">${acties || Z.knop}</div>` : ''}<div class="nu-kaart">${kaart}</div></div>${meld}`;
  if (!rustig) h += `<aside class="ens-rechts"><p class="eyebrow">Vandaag</p>${vandaagLijst(s, A, nu, kijk || live)}${stil || geenVoorstel ? '' : `<div class="ens-open">${nogOpen(s, p, A, m, nu)}</div>`}</aside>`;
  h += '</div>' + pzVraag;
  if (!rustig && !stil) h += `<div class="dok"><div class="dok-in"><button class="dok-zoek" data-palet="" aria-label="Vraag of zoek iets, of typ een taak">${ICO.zoek}<span>Vraag of zoek iets, of typ een taak</span><kbd>Ctrl K</kbd></button></div></div>`;
  return h + '</div>';
}
function nuMeldingen(s) { // wat aandacht vraagt, ook als je niet op Dag kijkt
  const n = reclameOpen(s).length;
  const h = uitvalBlok(s) + liggenBlok() + (n ? `<a class="melding nu-rec" href="#reclame"><b>Reclame:</b> ${n} ${n === 1 ? 'actie staat' : 'acties staan'} open voor vandaag of eerder.</a>` : '');
  return h ? `<section class="ens-meld" aria-label="Meldingen">${h}</section>` : '';
}
/* ---------- de zin: wat nu telt, in één zin (regels: handboek/nu-zinnen.md) ----------
   Gemaakt uit rooster, leergang en open punten, zonder AI. Hoogstens twee dingen, eerst wat je het snelst vergeet (Magister).
   Nooit iets over werk in een pauze. Weet Lesdag iets niet zeker, dan staat dat eronder (zinTwijfel). */
const minTxt = n => n + (n === 1 ? ' minuut' : ' minuten');
const lijstTxt = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' en ' + a[a.length - 1];
const klein1 = t => String(t).charAt(0).toLowerCase() + String(t).slice(1);
const titel = t => String(t || 'les').replace(/[.\s]+$/, ''); // de zin zet zelf de punt
const kort = t => { const k = String(t).replace(/^([^:]*:[^:,]*)[:,].*$/, '$1'); return k.length > 48 ? k.slice(0, k.lastIndexOf(' ', 46)) + '…' : k; }; // lange taaknamen: alleen het eerste stuk
const afspraakSoort = it => { const w = it.soort !== 'toets' ? '' : it.z && it.z.dienst ? 'Surveillance' : 'Toets'; return w && !new RegExp(w, 'i').test(it.titel || '') ? w + ': ' : ''; };
const magWat = o => (o.soort === 'pres' ? 'de absenten van ' : o.soort === 'hw' ? 'het huiswerk van ' : 'het logboek van ') + o.x.u.groep + ' in Magister';
function gisterenGoed(s) { const v = volgendeLesdag(s, -1); const g = S.goed[v]; if (!g) return ''; const k = String(g).replace(/\s+/g, ' ').trim(); return ` Wat ${v === addD(s, -1) ? 'gisteren' : 'de vorige werkdag'} goed ging: ${k.length > 110 ? k.slice(0, k.lastIndexOf(' ', 108)) + '…' : k.replace(/[.!?]+$/, '') + '.'}`; } // jouw zin van het afsluiten, de volgende ochtend (bevinding 50)
function nuZin(s, p, A, m, nu, kijk, kIt) {
  if (kijk === 'afsluiten') return afsluitZin(s, p, A, nu);
  if (kIt) return kijkZin(s, kIt, nu);
  const it = m.it; const x = m.x;
  switch (m.m) {
    case 'vrijedag': return { lab: '', zin: buitenJaar(p) ? buitenJaar(p).zin : `${cap(p.reden || 'Vrij')}. Vandaag heeft Lesdag niets voor je.` };
    case 'stil': return { lab: '', zin: S.afgesloten[s] ? 'Je dag is afgesloten. Morgen staat klaar.' : 'Je dag zit erop. Afsluiten kost een paar minuten, daarna is het stil.' };
    case 'start': { const L = lesUren(p); const kr = A.items.find(y => y.soort === 'koor'); const C = collegasJarig(s); const T = A.items.filter(y => y.soort === 'toets' || y.soort === 'rooster');
      return { lab: nu < AG.van ? 'Voor je werkdag' : 'Opstarten · tot ' + hm(AG.werkVan),
        zin: `Goedemorgen. ${L.length ? `${L.length} ${L.length === 1 ? 'les' : 'lessen'}, de eerste om ${L[0].u.start} (${L[0].u.groep})` : 'Geen lessen vandaag'}${kr ? `, koor om ${hm(kr.van)}` : ''}${T.length ? `, ${T.length === 1 ? 'een afspraak' : T.length + ' afspraken'} uit je rooster om ${lijstTxt(T.map(y => hm(y.van)))}` : ''}.${C.length ? ` ${C[0].c.naam} ${wanneerJarig(C[0].d, s)}.` : ''}${gisterenGoed(s)}` }; }
    case 'voorLes': { const l = les(x.item); const k = klaarLijst(s, l).slice(0, 2).map(b => klein1(b.replace(/\s+klaar(zetten|leggen)$/i, ''))); const min = minuten(x.u.start) - nu;
      return { lab: `${min > 0 ? 'Over ' + minTxt(min) : 'Zo meteen'} · ${x.u.groep} · lokaal ${x.u.lokaal || '009'}`, zin: `Zo meteen ${x.u.groep}: ${titel(l.titel)}.${k.length ? ' Zet ' + lijstTxt(k) + ' klaar.' : ''}` }; }
    case 'les': { const y = it.x; const lab = `Les · ${y.u.groep} · tot ${y.u.eind}`;
      if (!y.item && !presVoorop(s, y, nu)) return { lab, zin: `${y.u.groep} loopt nog ${minTxt(minuten(y.u.eind) - nu)}.${y.fout ? ' Deze klas heeft nog geen leergang.' : ''}` };
      const l = y.item ? les(y.item) : {};
      if (presVoorop(s, y, nu)) { const bezig = nu - minuten(y.u.start); return { lab, zin: `${y.u.groep} is ${bezig < 1 ? 'net begonnen' : minTxt(bezig) + ' bezig'}. Zet de absenten in Magister zodra de klas aan het werk is.` }; }
      const v = magTelt(s, y) ? magVakken(s, y) : {};
      return { lab, zin: `${y.u.groep} loopt nog ${minTxt(minuten(y.u.eind) - nu)}: ${titel(l.titel)}.${v.pres === false ? ' De absenten staan nog open.' : v.hw === false ? ' Het huiswerk staat klaar voor bij de bel.' : ''}` }; }
    case 'naLes': { const v = magTelt(s, x) ? magVakken(s, x) : {};
      return { lab: `De bel ging · ${x.u.groep}`, zin: `Hoe ging ${x.u.groep}: gegeven, deels of niet aan toegekomen?${v.pres === false ? ' De absenten staan nog open.' : ''}` }; }
    case 'pauze': return { lab: '', zin: 'Pauze.', sub: `Tot ${hm(it.tot)}.` };
    case 'rust': return { lab: 'Rustblok', zin: `Tot ${hm(it.tot)} is van jou.${A.pz && A.pz.weg.length ? ' Je pauze viel weg door ' + lijstTxt([...new Set(A.pz.weg.map(q => q.door))]) + '.' : ''}` };
    case 'koor': return { lab: 'Schoolkoor · tot ' + hm(it.tot), zin: `${titel(it.titel)}.` };
    case 'taak': return { lab: `Gepland · ${hm(it.van)}–${hm(it.tot)}`, zin: `Nu: ${klein1(it.k.titel)}.${it.k.d ? ' Deadline ' + fmtD(it.k.d) + '.' : ''}` };
    case 'afspraak': return { lab: `${hm(it.van)}–${hm(it.tot)}${it.lokaal ? ' · ' + it.lokaal : ''}`, zin: `${afspraakSoort(it)}${titel(it.titel)}, tot ${hm(it.tot)}.` };
    case 'tussen': return { lab: 'Tussendoor', zin: `Om ${hm(it.van)} ${it.soort === 'vrij' ? 'een werkblok' : it.soort === 'pauze' ? 'je pauze' : it.soort === 'rust' ? 'een rustblok' : it.titel}. Nog ${minTxt(it.van - nu)}, even niets.` };
    case 'werkblok': return werkblokZin(s, p, it, nu);
  }
  return afsluitZin(s, p, A, nu);
}
function werkblokZin(s, p, it, nu) { // dezelfde volgorde als de werkblokkaart: Magister, afronden, dan wat in het blok past
  const van = Math.max(it.van, Math.ceil(nu / 5) * 5); const len = it.tot - van; const ruimte = werkRuimte(len); const lab = `Werkblok · nog ${minTxt(len)}`;
  const E = []; const M = magOpen(s); if (M.length) E.push(magWat(M[0])); const knop = M.length ? magOpenKnop(magKey(M[0].s, M[0].x)) : '';
  const af = teAfronden(s, p, nu); if (af.length) E.push('het afronden van ' + af[0].u.groep);
  let used = 0;
  for (const k of kandidaten(s)) { if (E.length >= 2) break; if (used + k.min > ruimte || (k.voor != null && k.d === s && van + used + k.min > k.voor)) continue; used += k.min; E.push(klein1(kort(k.titel))); }
  return { lab, knop, zin: E.length ? `Je hebt ${minTxt(len)}. Eerst ${E[0]}${E[1] ? ', daarna ' + E[1] : ''}.` : `Je hebt ${minTxt(len)} en er hoeft niets. Dit blok mag rustig blijven.` };
}
function afsluitZin(s, p, A, nu) {
  const deadl = kandidaten(s).filter(k => k.d && k.d <= addD(s, 7) && !k.v.startsWith('pres:') && k.v !== 'koorrep');
  const n = teAfronden(s, p, nu).length + A.items.filter(y => y.soort === 'taak' && !y.k.af).length + deadl.length + (s === vandaag() ? magOpen(s).length : 0);
  return { lab: 'Dag afsluiten · een paar minuten', zin: n ? `Tijd om af te sluiten. ${n === 1 ? 'Eén ding staat' : n + ' dingen staan'} nog open; elk krijgt een moment.` : 'Niets staat open. Sluit de dag af, dan is het stil.' };
}
function kijkZin(s, it, nu) { // een ander moment van de dag, gekozen met ‹ › of in de lijst
  const t = `${hm(it.van)}–${hm(it.tot)}`;
  if (it.x) { const y = it.x; const l = y.item ? les(y.item) : {}; const voorbij = s < vandaag() || minuten(y.u.eind) <= nu;
    return { lab: `${t} · ${y.u.groep}`, zin: y.uitval ? `${y.u.groep} valt uit.` : `${y.u.groep}: ${titel(l.titel)}.${voorbij ? (y.klaar ? ' Afgerond.' : ' Nog niet afgerond.') : ''}` }; }
  if (it.soort === 'pauze' || it.soort === 'rust') return { lab: t, zin: `${it.soort === 'pauze' ? 'Pauze' : 'Rustblok'}. Daar plant Lesdag niets in.` };
  if (it.soort === 'vrij') return { lab: t, zin: `Werkblok van ${minTxt(it.tot - it.van)}.` };
  if (it.soort === 'start') return { lab: t, zin: 'Koffie en opstarten.' };
  return { lab: t, zin: `${titel(it.titel)}.` };
}
function zinTwijfel(A) { // de zin raadt niet: wat Lesdag niet zeker weet, staat eronder
  if (!A.werkdag) return '';
  if (!zGekoppeld()) return 'Zonder Zermelo-koppeling ziet Lesdag geen uitval of roosterwijziging.';
  if (!ZC || Date.now() - ZC.opgehaald > 3 * 3600e3) return `Het rooster is ${ZC ? 'van ' + tijdVan(ZC.opgehaald) : 'nog niet opgehaald'}; uitval van daarna ziet Lesdag niet.`;
  return '';
}
function vandaagLijst(s, A, nu, sel) { // de dag als rustige lijst; tik een regel om dat moment te bekijken
  const t = vandaag(); const its = A.items.filter(it => it.soort !== 'uitval' && it.soort !== 'start' && !(it.soort === 'vrij' && it.tot - it.van < 15));
  if (A.werkdag) its.push({ key: 'afsluiten', van: AG.werkTot - 15, tot: AG.werkTot, soort: 'afsluiten', titel: 'dag afsluiten' });
  if (!its.length && !A.heleDag.length) return '<p class="lead">Niets vandaag.</p>';
  const tk = toetsweekKlassen(s); const hd = A.heleDag.filter(it => !isToetsweekRij(it)); if (tk.length) hd.unshift({ soort: 'sectie', titel: 'Toetsweek ' + tk.join(', ') });
  return '<ol class="nu-lijst">' + hd.map(it => `<li><div class="nl-r nl-hd" data-s="${it.soort}"><b>dag</b><span>${esc(it.titel)}</span></div></li>`).join('') + its.sort((a, b) => a.van - b.van).map(it => { const voorbij = s < t || (s === t && it.tot <= nu); const nuIn = s === t && it.van <= nu && nu < it.tot; const st = it.x ? magStip(s, it.x) : '';
    const naam = it.x || it.soort === 'toets' || it.soort === 'rooster' ? `${it.titel}${it.sub ? ' · ' + it.sub : ''}` : it.soort === 'vrij' ? 'werkblok' : it.soort === 'rust' ? 'rustblok' : it.titel;
    return `<li><button class="nl-r${voorbij ? ' nl-voorbij' : ''}${nuIn ? ' nl-nuin' : ''}${sel === it.key ? ' nl-sel' : ''}" data-s="${it.soort}" data-kijk="${esc(it.key)}"><b>${hm(it.van)}</b><span>${esc(naam)}</span>${st ? `<i class="nl-stip ${st}" aria-label="${st === 'ok' ? 'Magister rond' : 'Magister nog open'}"></i>` : nuIn ? '<em>nu</em>' : ''}</button></li>`; }).join('') + '</ol>';
}
/* de hoofdknoppen van een nu-kaart staan tussen <!--dok--> en <!--/dok-->; op Nu staan ze direct onder de zin */
function dokUit(h) { const r = h.match(/<!--dok-->([\s\S]*?)<!--\/dok-->/); return r ? [h.replace(r[0], ''), r[1]] : [h, '']; }
const MOMSOORT = { les: 'les', klaar: 'les', uitval: 'les', vrij: 'werkblok', taak: 'taak', taakaf: 'taak', sectie: 'afspraak', afspraak: 'afspraak', koor: 'koor', pauze: 'pauze', rust: 'rust', start: 'start' };
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
  if (m.m === 'les') return presVoorop(s, m.it.x, nu) ? presKaart(s, m.it.x, nu) : m.it.x.item ? lesKaart(s, m.it.x, nu) : lesZonderKaart(s, m.it.x, nu);
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
  if (it.x) return it.x.klaar || it.x.uitval || !it.x.item ? agPaneel(s, p, A, key) + (magTelt(s, it.x) ? `<div class="kaart" style="margin-top:1rem">${magBlok(s, it.x)}</div>` : '') : minuten(it.x.u.eind) <= nu ? naLesKaart(s, p, it.x, nu) : nuIn ? (presVoorop(s, it.x, nu) ? presKaart(s, it.x, nu) : it.x.item ? lesKaart(s, it.x, nu) : lesZonderKaart(s, it.x, nu)) : voorLesKaart(s, p, it.x, nu);
  if (it.soort === 'pauze' || it.soort === 'rust') return rustKaart(s, it, A, nuIn);
  if (it.soort === 'vrij') return werkblokKaart(s, p, A, it, nu, nuIn);
  if (it.soort === 'start') return startKaart(s, p, A, nu);
  return agPaneel(s, p, A, key);
}
function klaarLijst(s, l) { const b = benodigd(l).slice(); if (b.includes('Drums / percussie')) b.push('Oordoppen voor jezelf'); (S.klaarExtra[s] || []).forEach(x => { if (!b.includes(x)) b.push(x); }); return b; }
function afrondRij(s, x) { return `<div class="nu-rij"><span><b>Afronden:</b> ${esc(x.u.groep)} · ${esc(les(x.item).titel || '')}</span><span class="tb"><button class="btn klein" data-rondaf="${s}|${esc(x.u.id)}|gegeven">gegeven</button><button class="btn klein" data-rondaf="${s}|${esc(x.u.id)}|half">deels</button><button class="btn klein" data-rondaf="${s}|${esc(x.u.id)}|niet">niet aan toegekomen</button></span></div>`; }
function startKaart(s, p, A, nu) {
  const L = lesUren(p); const kr = A.items.find(it => it.soort === 'koor'); const pz = A.pz;
  const pzT = pz && !pz.onbekend && pz.vrij.length ? ` Pauze: ${pz.vrij.map(x => hm(x.van) + '–' + hm(x.tot)).join(' en ')}.` : '';
  return `<div class="kaart"><p class="eyebrow">${nu < AG.van ? 'Je werkdag begint om 8:00' : 'Koffie en opstarten · tot ' + hm(AG.werkVan)}</p><h2>Je dag</h2>
    <p class="lead">${L.length ? `${L.length} ${L.length === 1 ? 'les' : 'lessen'}, de eerste om ${esc(L[0].u.start)} (${esc(L[0].u.groep)})` : 'Geen lessen vandaag'}${kr ? `. ${esc(kr.titel)} om ${hm(kr.van)}` : ''}.${pzT}</p>
    ${L[0] ? vorigeRegel(L[0]) : ''}
    ${pauzeTekst(pz) ? `<div class="melding" style="margin-top:.6rem">${esc(pauzeTekst(pz))}</div>` : ''}
    ${collegasJarig(s).length ? `<div class="jarig-rij">${collegasJarig(s).map(felicRij).join('')}</div>` : ''}${weekJarigRij(s)}
    <p class="lead" style="margin-top:.6rem">${startDaarna(A) ? esc(startDaarna(A)) + ' Tot die tijd heeft Lesdag niets voor je.' : L.length ? 'Tot de eerste les heeft Lesdag niets voor je.' : ''}</p></div>`;
}
function voorLesKaart(s, p, x, nu) {
  const l = les(x.item); const ben = klaarLijst(s, l);
  const min = minuten(x.u.start) - nu; const rest = s === vandaag() ? teAfronden(s, p, nu) : [];
  return `<div class="kaart"><p class="eyebrow">${s === vandaag() && min > 0 && min <= 90 ? `Over ${min} ${min === 1 ? 'minuut' : 'minuten'} · ` : ''}${esc(x.u.start)}–${esc(x.u.eind)} · lokaal ${esc(x.u.lokaal || '009')}</p>
    <h2>${esc(x.u.groep)} · ${esc(l.titel || '')}</h2>${vorigeRegel(x)}${l.doel ? `<p class="doel" style="margin-top:.3rem">${esc(l.doel)}</p>` : ''}
    <h3>Klaarzetten</h3><div class="mats">${ben.length ? ben.map(b => `<span class="chip">${esc(b)}</span>`).join('') : '<span class="leeg">niets bijzonders</span>'}</div>
    ${(l.materiaal || []).length ? `<h3>Materiaal</h3>${matLinks(l, true)}` : ''}
    <!--dok--><button class="btn hoofd" data-bord="${esc(x.u.id)}|${s}">Op het bord, regie hier</button><button class="btn" data-start="${esc(x.u.id)}|${s}">Les op dit scherm</button><!--/dok--><div class="knoppen" style="margin-top:.9rem">${bmVoor(x.item).map(m => `<button class="btn" data-beoordeel="${esc(m.id)}|${esc(x.u.groep)}">Beoordelen ${esc(m.toets)}</button>`).join('')}<button class="btn" data-bewerk="${esc(x.item.id)}">bewerk les</button></div>
    ${rest.length ? `<h3>Nog afronden</h3>${rest.map(y => afrondRij(s, y)).join('')}` : ''}</div>`;
}
function lesKaart(s, x, nu) {
  const l = les(x.item); const rest = minuten(x.u.eind) - nu;
  const bordLoopt = RG && RG.uid === x.u.id && Date.now() - RG.tijd < 5000;
  const fasen = (l.fasen || []).map(LESMODUS.fase);
  return `<div class="kaart"><p class="eyebrow">Les loopt · ${esc(x.u.groep)} · nog ${rest} min · tot ${esc(x.u.eind)}</p><h2>${esc(l.titel || '')}</h2>${vorigeRegel(x)}
    ${bordLoopt ? `<p class="lead">Het bord loopt in het andere venster.</p><!--dok--><a class="btn hoofd" href="#regie/${encodeURIComponent(x.u.id)}/${s}">Naar de regie</a><!--/dok-->` : `<!--dok--><button class="btn hoofd" data-bord="${esc(x.u.id)}|${s}">Op het bord, regie hier</button><button class="btn" data-start="${esc(x.u.id)}|${s}">Les op dit scherm</button><!--/dok-->`}
    ${fasen.length ? `<h3>Verloop · alleen jij ziet dit</h3><ol class="fasen nu-fasen">${fasen.map(f => `<li><b>${f.min} min · ${esc(LESMODUS.SOORT[f.soort].naam.toLowerCase())}</b> ${esc(f.kop)}${f.docent ? `<div class="sub">${esc(f.docent)}</div>` : ''}</li>`).join('')}</ol>` : ''}
    ${bmVoor(x.item).length ? `<div class="knoppen" style="margin-top:.6rem">${bmVoor(x.item).map(m => `<button class="btn" data-beoordeel="${esc(m.id)}|${esc(x.u.groep)}">Beoordelen ${esc(m.toets)}</button>`).join('')}</div>` : ''}${magBlok(s, x)}</div>`;
}
function lesZonderKaart(s, x, nu) { // les zonder lesinhoud (klas zonder leergang, of alle lessen gegeven): nooit een foutscherm midden in de les
  const rest = minuten(x.u.eind) - nu; const lg = leergangVan(x.u.groep);
  return `<div class="kaart"><p class="eyebrow">Les loopt · ${esc(x.u.groep)} · nog ${rest} min · tot ${esc(x.u.eind)} · lokaal ${esc(x.u.lokaal || '009')}</p><h2>${esc(x.u.groep)}</h2>
    <p class="lead">${lg ? `Alle lessen van ${esc(lgNaam(lg))} zijn gegeven. Lesdag heeft voor dit uur geen inhoud.` : 'Deze klas heeft nog geen leergang. Lesdag heeft voor dit uur dus geen inhoud.'}</p>
    ${lg ? '' : `<p style="margin-top:.4rem"><a href="${esc(klasUrl(x.u.groep))}">Kies een leergang op het klasblad van ${esc(x.u.groep)}</a></p>`}${magBlok(s, x)}</div>`;
}
function naLesKaart(s, p, x, nu) {
  const l = les(x.item); const rest = teAfronden(s, p, nu).filter(y => y !== x);
  return `<div class="kaart"><p class="eyebrow">De bel ging · ${esc(x.u.groep)} · ${esc(x.u.start)}–${esc(x.u.eind)}</p><h2>Hoe ging het?</h2><p class="lead">${esc(l.titel || '')}</p>${magBlok(s, x)}
    <!--dok--><button class="btn hoofd" data-rondaf="${s}|${esc(x.u.id)}|gegeven">Gegeven</button><button class="btn" data-rondaf="${s}|${esc(x.u.id)}|half">Deels, volgende keer verder</button><button class="btn" data-rondaf="${s}|${esc(x.u.id)}|niet">Niet aan toegekomen</button><button class="btn" data-aflater="${s}|${esc(x.u.id)}">Straks</button><!--/dok-->
    <details class="meer"><summary>Notitie voor de volgende les</summary><textarea id="nNot" placeholder="Bijvoorbeeld: begin met de groove uit maat 9">${esc(notitieVak(x, s))}</textarea></details>
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
    <!--dok-->${openKnop(waarK(k), 'hoofd')}${k.af ? '' : k.start ? `<span class="chip">bezig sinds ${esc(new Date(k.start).toTimeString().slice(0, 5))}</span>` : `<button class="btn" data-taakstart="${esc(k.id)}">Begin</button>`}
    <label class="chk"><input type="checkbox" data-taakaf="${esc(k.id)}" ${k.af ? 'checked' : ''}><span>Klaar</span></label><!--/dok-->
    <div class="knoppen" style="margin-top:.6rem"><button class="btn klein" data-taakbewerk="${esc(k.id)}">Aanpassen</button></div>
    <p class="sub" style="margin-top:.6rem">Bij Klaar vraagt Lesdag hoe lang het duurde; met Begin meet Lesdag dat alvast. Dat blijft in je eigen opslag.</p></div>`;
}
/* ---------- waar doe je een taak ----------
   Elke taak krijgt een plek met een knop, zodat Frans niets hoeft op te zoeken: {label, url, info}. Eerst wat bij de taak zelf staat
   (url of waar in de sectieplanning, of een zelf geplakte link), dan de bron: de juiste map in de sectiemap, de koorapp, de presentatie
   van de les, Magister. De sectiemap is de SharePoint-bibliotheek "Sectie Muziek" (zelfde adres als tools/sp.js). */
const SPBIB = 'https://studentcsgpm.sharepoint.com/Sectie%20Muziek/Gedeelde%20%20documenten/';
const spMap = pad => SPBIB + pad.split('/').map(encodeURIComponent).join('/');
const WAAR = [ // [patroon in de titel, label, adres]
  [/magister|resultaten toetsweek/i, 'Magister', () => MAGURL()],
  [/web\.csgpm\.nl/i, 'intranet', () => 'https://web.csgpm.nl/'],
  [/agenda sectievergadering|verslag|besluiten|actielijst|terugkoppeling|urentabel/i, 'Overleg en beleid', () => spMap('00 Sectie/Overleg en beleid')],
  [/lokaal|lokalen|instrument/i, 'Vaklokaal en instrumenten', () => spMap('00 Sectie/Vaklokaal en instrumenten')],
  [/budget|bestel/i, 'Bestellingen en financiën', () => spMap('00 Sectie/Bestellingen en financiën/2026-2027')],
  [/leerlijn|\bpto\b|vakwerkplan|curriculum/i, 'Vakwerkplan en curriculum', () => spMap('00 Sectie/Vakwerkplan en curriculum')],
  [/jaarverslag|jaarplanning|ontwikkeldag|open dag/i, 'Jaarplanning', () => spMap('00 Sectie/Jaarplanning')],
  [/profielkeuze|keuzevak/i, 'Keuzevak muziek', () => spMap('02 Keuzevak muziek')],
  [/songbox|musicbox/i, 'MusicBox', () => 'https://digitaal.musicboxmethode.nl'],
];
function waarV(v) { // v zoals in kandidaten: sec:<id> | koor:<id> | koorrep | pres:<lesid>@<dag> | eigen:<id>
  v = v || '';
  if (v.startsWith('eigen:')) { const k = (S.taken || []).find(x => x.id === v.slice(6)); return k && k.url ? { label: 'link', url: k.url } : null; }
  if (v.startsWith('sec:')) { const i = sectieItems().find(x => x.id === v.slice(4)); if (!i) return null;
    if (i.url) return { label: i.waar || 'link', url: i.url, info: i.info };
    const r = WAAR.find(([re]) => re.test(i.titel)); return r ? { label: r[1], url: r[2](), info: i.info } : { label: 'sectiemap', url: spMap('00 Sectie'), info: i.info }; }
  if (v === 'koorrep' || v.startsWith('koor:')) { const kt = v === 'koorrep' ? null : ((B.koor || {}).taken || []).find(x => x.id === v.slice(5)); return { label: 'koorapp', url: (B.koor || {}).url || '', info: kt ? kt.sub : '' }; }
  if (v.startsWith('pres:')) { const [lid, ld] = v.slice(5).split('@'); const d = ld || vandaag(); const x = (planning(d, d)[d].uren || []).find(y => y.item && y.item.id === lid);
    const m = x && (les(x.item).materiaal || []).find(y => /presentatie|\.pptx/i.test((y.t || '') + ' ' + (y.u || '')) && /^https?:/i.test(y.u || '')); return m ? { label: 'presentatie', url: m.u } : null; }
  return null;
}
const waarK = k => k.url ? { label: 'link', url: k.url } : waarV(k.sectieId ? 'sec:' + k.sectieId : k.koorId ? 'koor:' + k.koorId : k.dagTaak ? (k.dagTaak.key === 'koor' ? 'koorrep' : k.dagTaak.key + '@' + k.dagTaak.dag) : '');
const openKnop = (w, cls) => w && w.url ? `<a class="btn${cls ? ' ' + cls : ''}" href="${esc(w.url)}" target="_blank" rel="noopener">Open ${esc(w.label)} ↗</a>` : '';
/* wat er nog moet en nog niet in de agenda staat: [{v, titel, min, d, sub}] */
function kandidaten(s) {
  const G = geplandeSleutels(); const out = []; const dt = d => S.dagTaken[d] || {}; const gezien = new Set();
  const K = (v, soort, titel, rest, eigen) => { const e = eigen || (S.minuten || {})[v]; const sc = schatting(soort, titel); out.push(Object.assign({ v, titel, min: e || sc.min, waarom: e ? 'jouw schatting' : sc.waarom }, rest)); };
  [s, volgendeLesdag(s, 1)].forEach((d, i) => { const pd = planning(d, d)[d]; if (pd.reden) return;
    lesUren(pd).filter(x => !x.klaar).forEach(x => { const l = les(x.item); const key = 'pres:' + x.item.id;
      if ((l.materiaal || []).some(m => /presentatie|\.pptx/i.test((m.t || '') + ' ' + (m.u || ''))) && !presAf(key) && !G.pres[key] && !G.pres[d + '|' + key] && !gezien.has(key) && (i || minuten(x.u.start) > nuMin()))
        { gezien.add(key); K('pres:' + x.item.id + '@' + d, 'pres', `Presentatie doorlopen: ${x.u.groep}`, { d, voor: minuten(x.u.start), sub: `${i ? fmtD(d) + ' ' : ''}${x.u.start} · ${l.titel || ''}` }); } }); });
  const kr = koorOp(s); if (kr && (kr.type === 'rep' || kr.type === 'extra') && !dt(s).koor && !G.pres[s + '|koor']) K('koorrep', 'koorrep', 'Koorrepetitie voorbereiden', { d: s, sub: kr.titel });
  koorTakenOpen(s).forEach(t => K('koor:' + t.id, 'koor', 'Koor: ' + t.titel, { d: t.d }));
  sectieItems().filter(i => i.taak && !S.sectieAf[i.id] && !G.sec[i.id] && i.d <= addD(s, 14)).forEach(i => K('sec:' + i.id, 'sectie', 'Sectie: ' + i.titel, { d: i.d }));
  (S.taken || []).filter(k => !k.af && !k.plan).forEach(k => K('eigen:' + k.id, soortVan(k), k.titel, { d: k.d }, k.min));
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
function werkblokKaart(s, p, A, it, nu, live) {
  const van = live ? Math.max(it.van, Math.ceil(nu / 5) * 5) : it.van; const len = it.tot - van; const ruimte = werkRuimte(len);
  const af = s === vandaag() ? teAfronden(s, p, nu) : [];
  let used = 0; const rijen = [];
  for (const k of kandidaten(s)) { if (used + k.min > ruimte || (k.voor != null && k.d === s && van + used + k.min > k.voor)) continue; const a = van + used; used += k.min;
    const w = waarV(k.v); rijen.push(`<div class="nu-rij"><span>${esc(kort(k.titel))}${k.sub || (w && w.info) ? `<div class="sub">${esc(k.sub || w.info)}</div>` : ''}</span><span class="tb">${minVeld(k)}${k.d ? `<span class="chip">${esc(fmtD(k.d))}</span>` : ''}${openKnop(w, 'klein')}<button class="btn klein" data-slot="${esc(k.v)}|${s}|${hm(a)}|${hm(a + k.min)}">In dit blok</button></span></div>`); if (rijen.length >= 4) break; }
  const M = live && s === vandaag() ? magOpen(s) : []; // wat in Magister nog openstaat, komt terug in het volgende werkblok
  return `<div class="kaart"><p class="eyebrow">Werkblok · ${hm(it.van)}–${hm(it.tot)}${live ? ' · nog ' + len + ' min' : ''}</p><h2>${used ? `${used} minuten werk, ${len - used} lucht` : M.length ? 'Eerst Magister' : 'Niets dat nu moet'}</h2>
    ${M.length ? `<h3>Eerst in Magister</h3>${magLijst(M, 5)}` : ''}
    ${af.length ? af.map(x => afrondRij(s, x)).join('') : ''}
    ${rijen.join('')}
    <div class="nu-rij nu-lucht"><span>Lucht, voor wie aanklopt, de gang en koffie</span><span class="chip">${len - used - (len > 90 ? 10 : 0)} min</span></div>
    ${len > 90 ? '<div class="nu-rij nu-lucht"><span>Lang blok: neem halverwege tien minuten, even weg van je scherm</span><span class="chip">10 min</span></div>' : ''}
    ${!used ? '<p class="lead" style="margin-top:.6rem">Dit blok mag ook gewoon rustig blijven.</p>' : ''}
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
    ${open.map(it => rij('Niet af: ' + it.k.titel, '', chips('eigen:' + it.k.id, schat(soortVan(it.k), it.k.titel, it.k.min)) + `<label class="chk"><input type="checkbox" data-taakaf="${esc(it.k.id)}"><span>klaar</span></label>`)).join('')}
    ${deadl.map(k => rij(k.titel, 'deadline ' + fmtD(k.d), chips(k.v, k.min))).join('')}
    ${n ? '' : '<p class="lead">Niets open. Alles heeft een plek.</p>'}
    ${s === vandaag() && magWeekZin(s) ? `<p class="sub mag-week">${esc(magWeekZin(s))}</p>` : ''}
    <!--dok--><button class="btn hoofd" data-afsluiten="${s}">Dag afsluiten${n ? ` · ${n} nog open` : ''}</button><!--/dok--></div>`; // het aantal staat op de knop, zonder dialoog (bevinding 50)
}
function stilKaart(s) {
  const dicht = !!S.afgesloten[s];
  return `<div class="kaart nu-rust"><p class="eyebrow">${esc(fmtLang(s))}</p><h2>${dicht ? 'Morgen staat klaar' : 'Je dag zit erop'}</h2>
    <p class="lead">${dicht ? 'Lesdag is stil tot morgen 8:00.' : 'Afsluiten kost een paar minuten. Daarna is Lesdag stil.'}</p>
    ${S.goed[s] ? `<blockquote class="nu-goed">${esc(S.goed[s])}</blockquote>` : ''}
    <!--dok-->${dicht ? `<button class="btn" data-heropen="${s}">Toch nog iets doen</button>` : '<button class="btn hoofd" data-kijk="afsluiten">Dag afsluiten</button>'}<button class="btn" data-dag="${volgendeLesdag(s, 1)}">Morgen bekijken</button><!--/dok--></div>`;
}
const buitenJaar = p => p.reden === 'na de laatste lesweek' ? { kop: 'Het schooljaar zit erop', zin: 'Het schooljaar zit erop. Lesdag heeft tot het nieuwe schooljaar niets voor je.' } : p.reden === 'nog geen lesweek' ? { kop: 'Het schooljaar begint nog', zin: 'Het schooljaar is nog niet begonnen. Lesdag heeft tot de eerste lesweek niets voor je.' } : null; // zomer: geen werk voorgeschoteld (bevinding 51)
function vrijeDagKaart(s, p) {
  return `<div class="kaart nu-rust"><p class="eyebrow">${esc(fmtLang(s))}</p><h2>${esc(buitenJaar(p) ? buitenJaar(p).kop : cap(p.reden || 'Vrij'))}</h2><p class="lead">${buitenJaar(p) ? 'Lesdag heeft tot het ' + (p.reden === 'nog geen lesweek' ? 'begin van het schooljaar' : 'nieuwe schooljaar') + ' niets voor je.' : 'Lesdag heeft vandaag niets voor je.'}</p>
    <div class="knoppen" style="margin-top:.8rem"><button class="btn" data-dag="${volgendeLesdag(s, 1)}">Volgende werkdag bekijken</button></div></div>`;
}
const PZ_WEG = 'lesdag-pauzevraag-weg'; // per apparaat: de kaart is weggeklikt
const pauzeVraagWeg = () => { try { return !!localStorage.getItem(PZ_WEG); } catch (e) { return false; } };
function pauzeVraag() {
  return `<div class="kaart nu-vraag"><h2>Je pauzes</h2><p class="lead">${ZC && ZC.events ? 'In je rooster vond Lesdag geen vaste pauzes.' : 'Lesdag haalt je pauzes uit je rooster in Zermelo. Plak daarvoor je Zermelo-link bij Instellingen.'} Daarna houdt Lesdag ze vrij.</p>
    <div class="knoppen" style="margin-top:.6rem"><a class="btn" href="#instellingen">Naar Instellingen</a><button class="btn kaal" data-pzvraagweg="">Niet meer tonen</button></div></div>`;
}
/* voorstellen: hoogstens drie, nooit in een pauze; Frans zegt ja of later. Nooit iets uit een les halen. */
function voorstellen(s, p, A, m, nu) {
  if (m.m === 'stil' || m.m === 'vrijedag') return '<p class="leeg">Niets.</p>';
  const V = []; const weg = k => S.later[k] === 'ok' || S.later[k] === s;
  const blok = vrijeBlokken(s, m.m === 'werkblok' ? m.it.tot : nu, 6); // het huidige werkblok vult de nu-kaart al
  for (const k of kandidaten(s)) { if (V.length >= 2) break; const key = 'k:' + k.v; if (weg(key) || !k.d || k.d > addD(s, 7)) continue;
    const sl = slotVoor(blok, k.min, k.d, k.voor); if (!sl) continue;
    V.push({ key, t: `${k.titel}${k.d ? ' (' + (k.v.startsWith('pres:') ? 'les ' : 'deadline ') + fmtD(k.d) + ')' : ''}, ${k.min} min. In je werkblok van ${slotTekst(sl)}?`, ja: `data-slot="${esc(k.v)}|${sl.dag}|${sl.van}|${sl.tot}"` }); }
  let d = s;
  for (let i = 0; i < 4 && V.length < 3; i++) { d = volgendeLesdag(d, 1); const pd = planning(d, d)[d]; if (pd.reden) continue; const Ad = dagItems(d, pd); const key = 'pz:' + d;
    if (Ad.pz && Ad.pz.tekort && !weg(key)) V.push({ key, t: `${cap(fmtD(d))}: ${[...new Set(Ad.pz.weg.map(x => x.door))].join(', ')} in je pauze. ${Ad.pz.rust ? `Lesdag houdt om ${hm(Ad.pz.rust.van)} ${Ad.pz.rust.tot - Ad.pz.rust.van} minuten rust vrij.` : 'Er is die dag geen vrij blok voor rust.'}`, ja: `data-later="${key}|ok"`, jaT: 'Prima' }); }
  for (const dd of [s, volgendeLesdag(s, 1)]) { if (V.length >= 3) break; const pd = planning(dd, dd)[dd]; if (pd.reden) continue; const key = 'stem:' + dd; if (weg(key) || (S.klaarExtra[dd] || []).length) continue;
    const zang = lesUren(pd).filter(x => benodigd(les(x.item)).includes('Zangbladen')).length; const kr = koorOp(dd); const koor = kr && kr.type !== 'vrij' ? 1 : 0;
    if (zang + koor >= 3) V.push({ key, t: `${dd === s ? 'Vandaag' : cap(fmtD(dd))} een zware stemdag: ${zang} ${zang === 1 ? 'zangles' : 'zanglessen'}${koor ? ' en het koor' : ''}. Water bij de piano op je klaarzetlijst?`, ja: `data-klaarextra="${dd}|Water bij de piano"` }); }
  return V.map(v => `<div class="vs"><p><span class="chip lesdag">Lesdag</span> ${esc(v.t)}</p><div class="knoppen"><button class="btn klein hoofd" ${v.ja}>${v.jaT || 'Ja'}</button><button class="btn klein" data-later="${esc(v.key)}|${s}">Later</button></div></div>`).join('');
}
/* nog open, per systeem: Magister (presentie, huiswerk, logboek), Outlook (een jarige collega feliciteren) en Lesdag (voorstellen) */
function nogOpen(s, p, A, m, nu) {
  const hier = m.m === 'les' ? m.it.x : m.m === 'naLes' ? m.x : null; // die staat al op de nu-kaart
  const M = s !== vandaag() || m.m === 'werkblok' ? [] : magOpen(s).filter(o => !hier || magKey(o.s, o.x) !== magKey(s, hier));
  const C = collegasJarig(s);
  const V = voorstellen(s, p, A, m, nu); const n = M.length + C.length + (V.match(/class="vs"/g) || []).length;
  return `<p class="eyebrow">Nog open${n ? ' · ' + n : ''}</p>` + (n ? magLijst(M, 4) + C.map(felicRij).join('') + V : '<p class="lead">Niets. Alles is rond.</p>');
}
/* ---------- Magister zonder koppeling ----------
   Er is geen open koppeling: Lesdag kijkt niet in Magister en tikt er niets in. Per les houdt Lesdag drie vakken bij: presentie,
   huiswerk en logboek. S.mag['datum|uur'] = {p: tijdstip afgerond (status: magStatus), l: tijdstip logboek erin, tril: 1}; het huiswerk per groep en lesweek
   in S.magHw (twee lessen in één lesweek delen hetzelfde "thuis"). Lessen van vóór S.magVanaf tellen niet mee. Absenten meldt Frans in
   Magister zelf; Lesdag herinnert alleen. De logboeknotities (AP.log) staan alleen op dit apparaat, tot ze in Magister staan. */
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
/* Magister afronden: drie statussen per les (6-11). Op tijd = Afgerond binnen een kwartier na het begin van de les; Ingehaald = later
   afgerond, telt gewoon als gedaan; Open = nog niet. Bron is het tijdstip in S.mag[k].p, dus het gaat mee met synchroniseren zoals de rest
   van S.mag (geen leerlinggegevens). Lesdag rondt Magister nooit zelf af. Geen reeksen, geen schuld. */
const OP_TIJD = 15;
const lesBegin = (s, x) => new Date(s + 'T00:00').getTime() + minuten(x.u.start) * 60000;
function magStatus(s, x) { const p = magVan(s, x).p; return !p ? 'open' : p <= lesBegin(s, x) + OP_TIJD * 60000 ? 'optijd' : 'ingehaald'; }
const magLaat = (s, x) => Date.now() >= lesBegin(s, x) + OP_TIJD * 60000; // het kwartier is voorbij: afronden heet nu inhalen
function magWeek(s) { // de week van s tot nu: lessen die al een kwartier bezig zijn of afgerond, per status
  const R = { optijd: 0, ingehaald: 0, open: 0, n: 0 }; const ma = maandagVan(s); const t = vandaag();
  for (let i = 0; i < 5; i++) { const d = addD(ma, i); if (d > t) break; const p = planning(d, d)[d]; if (p.reden) continue;
    p.uren.forEach(x => { if (!magTelt(d, x)) return; const st = magStatus(d, x); if (st === 'open' && !magLaat(d, x)) return; R[st]++; R.n++; }); }
  return R;
}
/* afbouwen, één regel: licht als de twee laatste afgelopen weken (met minstens 4 lessen) elk 90% of meer op tijd waren, en deze week
   hoogstens één les niet op tijd is. Anders vol. Vol = de kaart Magister afronden staat het eerste kwartier voorop en na een kwartier
   trilt het één keer. Licht = de les staat voorop, met Magister afronden als regel in de kaart; geen tril. */
let magHerC = '';
function magHerinnering(s) {
  const sl = s + '|' + nuMin() + '|' + JSON.stringify(S.mag || {}).length; if (magHerC && magHerC.k === sl) return magHerC.v;
  let v = 'vol'; const W = magWeek(s);
  if (W.n - W.optijd < 2) { const goed = []; let d = addD(maandagVan(s), -7);
    for (let i = 0; i < 8 && goed.length < 2; i++, d = addD(d, -7)) { const w = magWeek(d); if (w.n >= 4) goed.push(w.optijd / w.n >= 0.9); }
    if (goed.length === 2 && goed.every(Boolean)) v = 'licht'; }
  magHerC = { k: sl, v }; return v;
}
function magWeekZin(s) { const W = magWeek(s); if (!W.n) return '';
  return `Magister deze week: ${W.optijd} van ${W.n} op tijd${W.ingehaald ? ', ' + W.ingehaald + ' ingehaald' : ''}${W.open ? ', ' + W.open + ' nog open' : ''}.${magHerinnering(s) === 'licht' ? ' De herinnering staat op licht.' : ''}`; }
const magStChip = st => st === 'optijd' ? '<span class="ok">✓ <span class="sub">op tijd</span></span>' : '<span class="ok">✓ <span class="sub">ingehaald</span></span>';
const magKnop = (s, x) => magLaat(s, x) ? 'Nu ingehaald' : 'Afgerond';
const presVoorop = (s, x, nu) => s === vandaag() && magTelt(s, x) && !magVan(s, x).p && nu - minuten(x.u.start) < OP_TIJD && magHerinnering(s) === 'vol';
const magOpenKnop = (k, klein) => `<a class="btn mag${klein ? ' klein' : ''}" href="${esc(MAGURL())}" target="magister" rel="noopener" data-magopen="${esc(k)}">Open Magister</a>`;
function presKaart(s, x, nu) { // de eerste 15 minuten van elke les staat de presentie voorop
  const k = magKey(s, x); const rest = Math.max(1, minuten(x.u.start) + 15 - nu); const bordLoopt = RG && RG.uid === x.u.id && Date.now() - RG.tijd < 5000;
  return `<div class="kaart"><p class="eyebrow mag">Eerst · Magister · binnen ${rest} ${rest === 1 ? 'minuut' : 'minuten'}</p><h2>Magister afronden · ${esc(x.u.groep)}</h2>
    <p class="lead">Zet de absenten in Magister zodra de klas aan het werk is en rond de les daar af. Tik daarna op Afgerond; Lesdag kijkt zelf niet in Magister.</p>
    <!--dok-->${magOpenKnop(k)}<button class="btn${GEOPEND[k] ? ' hoofd' : ''}" data-mag="p|${esc(k)}">Afgerond</button>${bordLoopt ? `<a class="btn" href="#regie/${encodeURIComponent(x.u.id)}/${s}">Naar de regie</a>` : `<button class="btn" data-bord="${esc(x.u.id)}|${s}">Op het bord, regie hier</button>`}<!--/dok--></div>`;
}
function magBlok(s, x) { // Magister in het oog, tijdens en na de les: presentie, huiswerk bij de bel, logboek
  if (!magTelt(s, x)) return ''; const k = magKey(s, x); const v = magVakken(s, x); const R = [];
  const hw = hwTekst(x);
  if (hw && v.hw === false) R.push(hwRij(s, x));
  if (v.pres === false) R.push(`<div class="nu-rij"><span><b>Magister afronden</b> · ${magLaat(s, x) ? 'nog open' : 'nog niet afgerond'}</span><span class="tb">${magOpenKnop(k, true)}<button class="btn klein${GEOPEND[k] ? ' hoofd' : ''}" data-mag="p|${esc(k)}">${magKnop(s, x)}</button></span></div>`);
  else if (v.pres) R.push(`<div class="nu-rij"><span><b>Magister afronden</b> · om ${tijdVan(v.pres)}</span>${magStChip(magStatus(s, x))}</div>`);
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
  if (o.soort === 'pres') return `<div class="nu-rij"><span>${chip}Presentie en afronden ${esc(x.u.groep)} van ${esc(wanneer)}</span><span class="tb">${kompas ? '' : magOpenKnop(k, true)}<button class="btn klein" data-mag="p|${esc(k)}">${magKnop(s, x)}</button></span></div>`;
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

/* jarige collega's: de lijst die Frans zelf plakt (AP.collegas). Verjaardagen van leerlingen blijven in Magister, in het vak Jarig bij de les.
   Lesdag haalt niets van het intranet. Een verjaardag in het weekend telt op de eerste werkdag erna. */
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const mdUit = (m, d) => m >= 1 && m <= 12 && d >= 1 && d <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] ?String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0') : '';
const mdTekst = md => +md.slice(3) + ' ' + MAANDEN[+md.slice(0, 2) - 1];
const FELIC_DAGEN = 3; // tot drie dagen na de verjaardag blijft de collega staan, met Alsnog feliciteren
function jarigDagen(s) { const out = []; for (let d = [addD(volgendeLesdag(s, -1), 1), addD(s, -FELIC_DAGEN)].sort()[0]; d <= s; d = addD(d, 1)) out.push(d); return out; }
const wanneerJarig = (d, s) => d === s ? 'is vandaag jarig' : 'was ' + (d >= addD(s, -6) ? DAGLANG[dOf(d).getDay()] : fmtD(d)) + ' jarig';
const felicKey = j => j.d + '|' + j.c.naam; // per verjaardag, niet per dag: gefeliciteerd blijft gefeliciteerd
function collegasJarig(s) { const D = jarigDagen(s); return (AP.collegas || []).map(c => ({ c, d: D.find(d => c.md === d.slice(5)) })).filter(j => j.d && !AP.felic[felicKey(j)]); }
function collegasDezeWeek(s) { // maandag (of de eerste werkdag van de week): wie is de rest van deze week jarig, ook in het weekend
  if (volgendeLesdag(s, -1) >= maandagVan(s)) return []; const zo = addD(maandagVan(s), 6); const out = [];
  for (let d = addD(s, 1); d <= zo; d = addD(d, 1)) (AP.collegas || []).forEach(c => { if (c.md === d.slice(5)) out.push({ c, d }); });
  return out;
}
const voornaam = c => /,/.test(c.naam) ? c.naam.split(',')[1].trim().split(/\s+/)[0] : c.naam.split(/\s+/)[0];
function felicUrl(c, laat) {
  const vn = voornaam(c);
  return ((window.LESDAG_CONFIG || {}).outlookNieuw || 'https://outlook.office.com/mail/deeplink/compose') + '?' + [c.mail ? 'to=' + encodeURIComponent(c.mail) : '', 'subject=' + encodeURIComponent(laat ? 'Alsnog gefeliciteerd!' : 'Gefeliciteerd!'),
    'body=' + encodeURIComponent(laat ? `Beste ${vn},\n\nWat laat, maar van harte gefeliciteerd met je verjaardag!\n\nGroet,\nFrans` : `Beste ${vn},\n\nVan harte gefeliciteerd met je verjaardag! Een fijne dag gewenst.\n\nGroet,\nFrans`)].filter(Boolean).join('&');
}
const felicRij = j => { const { c, d } = j; const s = vandaag(); const laat = d < s; const k = felicKey(j);
  return `<div class="nu-rij"><span><span class="chip out">Outlook</span> <b>${esc(c.naam)}</b> ${wanneerJarig(d, s)}</span><span class="tb"><a class="btn klein out" href="${esc(felicUrl(c, laat))}" target="_blank" rel="noopener" data-felic="${esc(k)}">${laat ? 'Alsnog feliciteren' : 'Feliciteer in Outlook'}</a><button class="btn klein" data-felicaf="${esc(k)}">${laat ? 'Alsnog gefeliciteerd' : 'Gefeliciteerd'}</button></span></div>`; };
const weekJarigRij = s => { const W = collegasDezeWeek(s); return W.length ? `<p class="sub jarig-week">Deze week jarig: ${W.map(j => esc(j.c.naam) + ' (' + esc(fmtD(j.d)) + ')').join(', ')}.</p>` : ''; };
function collegaParse(txt) { // een collega per regel met de datum ("12 november Jan Jansen", "Jan Jansen 12-11"); een regel met alleen een datum geldt voor de regels eronder
  let nu = ''; const out = []; const mis = []; // mis: regels die niet lukten, met de reden
  for (const r0 of String(txt).split(/\r?\n/)) { let r = ' ' + r0.replace(/\t/g, ' ') + ' ', md = '', mail = '', datum = ''; // datum: wat er als datum stond, ook als die niet bestaat
    r = r.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/, m => { mail = m; return ' '; });
    r = r.replace(/\s(\d{1,2})[-\/.](\d{1,2})(?:[-\/.]\d{2,4})?(?=\s)/, (m, d, mm) => { datum = m.trim(); md = mdUit(+mm, +d); return ' '; });
    if (!datum) r = r.replace(/\s(\d{1,2})\s+(jan|feb|mrt|maa|apr|mei|jun|jul|aug|sep|okt|nov|dec)[a-z]*\.?(?:\s+\d{4})?(?=\s)/i, (m, d, mn) => { datum = m.trim(); const k = mn.toLowerCase(); md = mdUit((k === 'maa' ? 2 : MND.indexOf(k)) + 1, +d); return ' '; });
    if (!r0.trim()) continue;
    if (datum && !md) { mis.push({ r: r0.trim(), w: `${datum} bestaat niet` }); if (!r.replace(/[\s,;:|–-]/g, '')) nu = ''; continue; }
    const naam = r.replace(/\(\s*\d+\s*(jaar)?\s*\)/gi, ' ').replace(/\b(is|wordt)?\s*(vandaag\s+)?jarig\b/gi, ' ').replace(/\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|vandaag|morgen)\b:?/gi, ' ')
      .replace(/\s+/g, ' ').replace(/^[\s,;:|–-]+|[\s,;:|–-]+$/g, '').trim();
    if (md && !naam) { nu = md; continue; }
    if (naam && (md || nu)) out.push({ naam, md: md || nu, mail });
    else if (naam) mis.push({ r: r0.trim(), w: /\b(?:eer)?gisteren\b/i.test(r0) ? '"gisteren" is geen datum' : 'geen datum gevonden' });
  }
  out.mis = mis; return out;
}
let colMis = []; // wat bij de laatste keer opslaan niet lukte, onder de lijst

/* ---------- kompas: een smal venster naast Magister ----------
   Wat er nu in Magister moet, groot en in gewone taal, met de tekst klaar om te kopiëren. Daaronder de rest. Smal genoeg voor een
   venster naast Magister op de Android-tablet of de laptop. */
function kompasOpen() { const w = window.open(location.pathname + '#kompas', 'lesdag-kompas', 'popup=yes,width=440,height=860'); if (!w) location.hash = 'kompas'; }
function viewKompas() {
  const s = vandaag(); const nu = nuMin(); const L = magOpen(s);
  const i = L.findIndex(o => o.soort === 'pres' && o.s === s && minuten(o.x.u.start) <= nu && nu < minuten(o.x.u.eind)); if (i > 0) L.unshift(L.splice(i, 1)[0]); // de les van nu eerst
  let h = `<div class="kompas"><div class="kp-kop"><b>Lesdag · kompas</b><a href="#nu">Naar Nu</a></div>`;
  if (!L.length) return h + `<div class="kaart kp-leeg"><p class="eyebrow" style="color:var(--ok)">Nu in Magister</p><p class="kp-groot">Niets</p><p class="lead">Alles wat je in Lesdag afvinkte, staat erin. Lesdag kijkt zelf niet in Magister.</p></div>${magWeekZin(s) ? `<p class="sub mag-week">${esc(magWeekZin(s))}</p>` : ''}</div>`;
  const [o, ...rest] = L; const { x } = o; const k = magKey(o.s, x); const wanneer = (o.s === s ? 'vandaag ' : fmtD(o.s) + ' ') + x.u.start + '–' + x.u.eind;
  h += `<div class="kaart kp-nu"><p class="eyebrow mag">Nu in Magister · ${esc(wanneer)}</p>`;
  if (o.soort === 'pres') h += `<p class="kp-groot">Afronden ${esc(x.u.groep)}</p><p class="lead">Zet de absenten in Magister, rond de les af en tik daarna op ${magKnop(o.s, x)}. Kijk daar meteen bij Jarig.</p><div class="knoppen" style="margin-top:.8rem"><button class="btn mag" data-mag="p|${esc(k)}">${magKnop(o.s, x)}</button></div>`;
  else if (o.soort === 'hw') { const vl = volgendeLesVan(x.u.groep, o.s);
    h += `<p class="kp-groot">Huiswerk ${esc(x.u.groep)}${vl ? ' voor ' + esc(fmtD(vl)) : ''}</p><div class="mag-tekst">${esc(hwTekst(x))}</div><div class="knoppen" style="margin-top:.8rem"><button class="btn" data-magcopy="hwk|${o.s}|${esc(x.u.id)}">Kopieer</button><button class="btn mag" data-mag="h|${esc(hwKey(x))}">Staat erin</button></div>`; }
  else h += `<p class="kp-groot">Logboek ${esc(x.u.groep)}</p>${logRijen(o.s, x, true)}`;
  h += '</div>';
  if (rest.length) h += `<div class="kaart"><p class="eyebrow mag">Daarna · ${rest.length}</p>${rest.map(r => magRij(r, true)).join('')}</div>`;
  return h + (magWeekZin(s) ? `<p class="sub mag-week">${esc(magWeekZin(s))}</p>` : '') + '</div>';
}

/* afronden zonder lesmodus: dezelfde regels als het afrondscherm van de lesmodus */
function rondAf(s, x, keuze, n) {
  const g = x.u.groep; S.voortgang[g] = S.voortgang[g] || {}; n = (n || '').trim();
  if (keuze === 'niet') { (S.uitval[s] = S.uitval[s] || []).push(x.u.id); if (n) S.voortgang[g][x.item.id] = Object.assign({}, status(g, x.item.id), { n }); }
  else S.voortgang[g][x.item.id] = { st: keuze, d: s, uur: x.u.id, n: n || undefined };
  if (S.afLater[s]) S.afLater[s] = S.afLater[s].filter(v => v !== x.u.id);
  plekWeg(s, x.u.id); // afgerond: opnieuw openen begint weer vooraan
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
    krap: krapZin(P), slides: P.slides.map((x, j) => ({ k: x.k, soort: x.soort || '', kop: x.kop || '', min: x.k === 'fase' && x.min ? faseMin(P, j) : x.min || 0, was: x.min || 0, docent: typeof x.docent === 'string' ? x.docent : '' })) });
}
if (KAN) KAN.onmessage = e => {
  const m = e.data || {};
  if (m.t === 'staat') { const nieuw = !RG || RG.i !== m.i || RG.loopt !== m.loopt || RG.uid !== m.uid || RG.tot !== m.tot || (RG.left > 0) !== (m.left > 0) || RG.krap !== m.krap; const om = RG && RG.uid === m.uid && RG.i === m.i && RG.left > 0 && m.left <= 0; RG = Object.assign(m, { tijd: Date.now() });
    if (route.naam === 'regie') { if (nieuw) render(); else { const el = $('#rgTijd'); if (el) el.textContent = LESMODUS.timerTekst(m.left); const k = $('#rgKlok'); if (k) k.classList.toggle('bijna', m.left > 0 && m.left <= 120 && m.tot >= 300); } }
    if (om && route.naam === 'regie') tril(); // de fase is om: één korte tril op de tablet
    if (m.loopt && m.left === 120 && m.tot >= 300) tril(); return; }
  if (m.t === 'dicht') { RG = null; if (route.naam === 'regie') render(); return; }
  if (!LES || !LES.bord) return;
  if (m.t === 'ga' && m.i >= 0 && m.i < LES.slides.length) { LES.i = m.i; toonSlide(); }
  else if (m.t === 'volgende' && LES.i < LES.slides.length - 1) { LES.i++; toonSlide(); }
  else if (m.t === 'vorige' && LES.i > 0) { LES.i--; toonSlide(); }
  else if (m.t === 'timer') timer();
  else if (m.t === 'plus') { LES.left += 60; LES.tot += 60; if (LES.eindMs) LES.eindMs += 60000; timerToon(LES.left); bordZeg(); plekBewaar(); }
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
  const sl = RG.slides[RG.i] || {};
  const x = (planning(s, s)[s].uren || []).find(y => y.u.id === uid);
  if (!NOT) notitiesLaad().then(j => { if (j && route.naam === 'regie') render(); });
  const spreek = NOT && x && x.item ? notHtml(x.item, les(x.item), sl, RG.slides.slice(0, RG.i).filter(y => y.k === 'fase').length) : '';
  return `<div class="kop"><div><p class="eyebrow">Regie · alleen op dit scherm</p><h1>${esc(RG.groep)} · ${esc(RG.titel)}</h1><div class="sub">${esc(RG.start)}–${esc(RG.eind)}</div></div><div class="knoppen"><button class="btn" data-rg="sluit">Bord sluiten</button></div></div>
  <div class="rg"><div class="kaart"><p class="eyebrow">Op het bord</p><h2>${esc(slideNaam(sl))}</h2>
    ${sl.min ? `<div class="rg-klok ${RG.left <= 0 ? 'over' : RG.left <= 120 && RG.tot >= 300 ? 'bijna' : ''}" id="rgKlok"><b id="rgTijd">${LESMODUS.timerTekst(RG.left)}</b><span>${RG.left <= 0 ? 'Tijd · volgende fase' : RG.loopt ? 'loopt' : 'staat stil'}</span></div>${RG.krap ? `<p class="rg-krap">${esc(RG.krap)}</p>` : ''}` : ''}
    ${sl.docent ? `<div class="rg-notitie"><b>Alleen jij ziet dit</b>${esc(sl.docent)}</div>` : ''}
    ${spreek ? `<div class="rg-notitie rg-spreker"><b>Sprekersnotities · alleen jij ziet dit</b>${spreek}</div>` : ''}
    <div class="rg-knoppen"><button class="btn" data-rg="vorige">‹ Vorige</button><button class="btn hoofd" data-rg="volgende">Volgende ›</button>${sl.min ? `<button class="btn" data-rg="timer">${RG.loopt ? 'Klok stil' : 'Klok aan'}</button><button class="btn" data-rg="plus">+1 min</button>` : ''}</div>
    <p class="sub" style="margin-top:.6rem">Pijltjes en de presenter werken ook als dit venster voorop staat · t = klok</p></div>
  <div class="rg-rechts">${x && magTelt(s, x) ? `<div class="kaart">${magBlok(s, x)}</div>` : ''}
  <div class="kaart"><p class="eyebrow">De les</p>${x ? vorigeRegel(x) : ''}<ol class="rg-lijst">${RG.slides.map((y, j) => y.k === 'af' ? '' : `<li><button class="rg-s ${j === RG.i ? 'nu' : j < RG.i ? 'af' : ''}" data-rg="ga" data-i="${j}">${esc(slideNaam(y))}${y.min ? ` <small>${y.min} min${y.was && y.was !== y.min ? ` (was ${y.was})` : ''}</small>` : ''}</button></li>`).join('')}</ol></div></div>
  <div class="kaart"><p class="eyebrow">Afronden, als de les klaar is</p>
    <div class="nu-keuzes"><button class="btn hoofd" data-rgaf="gegeven">Gegeven</button><button class="btn" data-rgaf="half">Deels, volgende keer verder</button><button class="btn" data-rgaf="niet">Niet aan toegekomen</button></div>
    <textarea id="rgNot" placeholder="Notitie voor de volgende les">${x && x.item ? esc(notitieVak(x, s)) : ''}</textarea>
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
    el.innerHTML = `<div class="palet-in" role="dialog" aria-modal="true" aria-label="Opdrachtbalk"><input id="palQ" autocomplete="off" spellcheck="false" enterkeyhint="go" placeholder="Zoek of typ een taak: toets v4, lesweek 20, mail ouders morgen 10:30"><div id="palL" class="palet-l" role="listbox"></div><p class="palet-hint">Enter kiest de bovenste regel · pijltjes bladeren · &quot;taak ...&quot; maakt altijd een taak · help toont wat kan · Esc sluit · op de tablet kun je inspreken met de microfoon van je toetsenbord</p></div>`;
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
  rooGroepen().forEach(g => voeg('Groep ' + g, 'voortgang leergang', () => { location.hash = 'jaar/' + encodeURIComponent(g); }));
  voeg('Dag afsluiten', 'einde klaar wat ging goed', () => { nuKijk = 'afsluiten'; location.hash = 'nu'; render(); });
  voeg('Morgen bekijken', 'voorbereiden volgende dag', () => { dagKeuze = volgendeLesdag(s, 1); location.hash = 'vandaag'; render(); });
  voeg('Pauzetijden instellen', 'pauze rust instellingen', () => { location.hash = 'instellingen'; });
  voeg('Kompas naast Magister', 'magister presentie absenten huiswerk logboek', kompasOpen);
  voeg('Open Magister', 'presentie absenten huiswerk logboek', () => window.open(MAGURL(), 'magister'));
  return A;
}
/* zoeken: alles wat in de app staat als regels boven "Nieuwe taak", met het antwoord op de regel. Alleen in het geheugen: leerlingnamen gaan nergens heen */
const palNorm = x => String(x == null ? '' : x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9:]+/g, ' ').trim();
const palHooi = x => ' ' + palNorm(x) + ' ';
const PAL_STOP = new Set(['wanneer', 'wat', 'waar', 'welke', 'is', 'zijn', 'de', 'het', 'een', 'in', 'op', 'er', 'gebeurt', 'doet', 'doen', 'heeft', 'hebben', 'hoe', 'laat', 'van']); // "wanneer is PT1 van v4" zoekt op PT1 en v4
const palWoorden = q => { const w = palNorm(q).split(' ').filter(Boolean); const z = w.filter(x => !PAL_STOP.has(x)); return z.length ? z : w; };
const palPast = (h, x) => /^\d+$/.test(x) ? h.includes(' ' + x + ' ') : x.length >= 5 ? h.includes(x) : h.includes(' ' + x); // getallen exact (lesweek 2 is geen lesweek 20), kort vanaf het begin van een woord, lang overal
const palDag = s => { const d = dOf(s); return `${d.getDate()} ${MND[d.getMonth()]}`; };
const palKort = x => { const t = String(x || ''); return t.length > 130 ? t.slice(0, 127).trim() + '…' : t; };
const palRegel = (...x) => palKort(x.filter(Boolean).join(' · '));
function palGroepen() { // je eigen groepen; zonder rooster alle groepen uit de leergangen
  const eigen = rooGroepen().filter(g => B.leergangen[leergangVan(g)]); const L = eigen.length ? eigen : alleGroepen().map(x => x.g);
  return L.map(g => { const lg = leergangVan(g); return { g, lg, z: `${g} ${lgNaam(lg)} ${lg}` }; });
}
function paletDag(d, key) { if (d && key) agSel[d] = key; dagKeuze = d || null; if (route.naam !== 'vandaag') location.hash = 'vandaag'; else render(); }
function paletWeek(d) { weekKeuze = maandagVan(d); if (route.naam !== 'week') location.hash = 'week'; else render(); }
const paletKlas = g => { location.hash = 'jaar/' + encodeURIComponent(g); };
function paletIndex() {
  const I = []; const G = palGroepen();
  const voeg = (soort, basis, t, sub, z, run, v, e, wk) => I.push({ soort, basis, t, sub: palKort(sub), run, v: v || '', e: e || v || '', wk, n: I.length, h: palHooi(t + ' ' + (z || '')), th: palHooi((soort === 'toets' ? 'toets ' : '') + t), nm: palNorm(t) });
  const dz = d => d ? palDag(d) : '';
  const wkDatum = w => (B.kalender.weken.find(k => k.w === w) || {}).datum;
  PAL.acties.forEach(a => I.push({ soort: 'actie', basis: 85, t: a.t, sub: a.sub, run: a.run, v: '', e: '', n: I.length, h: palHooi(a.z), th: palHooi(a.t) }));
  G.forEach(({ g, lg, z }) => { const bms = BM.filter(m => (m.lessen || []).some(k => k.lg === lg)); const gehad = new Set();
    const beoordeel = (m, d) => voeg('toets', 80, `Beoordelen ${m.toets}: ${g}`, m.titel, `toets beoordelen beoordeling cijfers nakijken rubric ${m.thema || ''} ${m.titel} ${z}`, () => { location.hash = 'beoordelen/' + encodeURIComponent(m.id) + '/' + encodeURIComponent(g); }, d);
    jaarToetsen(g).forEach(o => { const T = o.t; const y = o.a && (o.a.vast ? o.a.slot : o.a.grens); const d = (y && y.s) || T.datum || wkDatum(o.w);
      voeg('toets', 80, `${T.id} ${g}: ${T.naam || ''}`, palRegel(o.klaar ? 'geweest' : '', d ? fmtD(d) : '', 'lesweek ' + o.w, T.weging != null ? 'weging ' + T.weging : '', T.waar, T.stof), `toets toetsen ${T.soort || ''} ${z} ${T.stof || ''} ${dz(d)}`, () => paletKlas(g), d, d, o.w);
      bms.filter(m => m.toets.split(' · ')[0] === T.id).forEach(m => { gehad.add(m); beoordeel(m, d); }); });
    bms.filter(m => !gehad.has(m)).forEach(m => beoordeel(m)); }); // beoordelingen die bij geen toets horen, zoals een songbox
  const perLg = {}; G.filter(x => !MEE_MET[x.g]).forEach(x => (perLg[x.lg] = perLg[x.lg] || []).push(x));
  Object.entries(perLg).forEach(([lg, gs]) => reeks(lg).forEach(x => { const l = les(x); if (!l.titel || l.type === 'leeg' || l.type === 'uitval') return; const st = gs.length === 1 ? status(gs[0].g, x.id).st : '';
    voeg('les', 40, `${gs.map(k => k.g).join(', ')}: ${l.titel}`, palRegel('lesweek ' + x.w, 'les ' + x.li, st, l.vraag), `les lessen ${gs.map(k => k.z).join(' ')} ${l.vraag || ''} ${(l.kaart || []).join(' ')} ${l.type || ''}`, () => openBewerk(x.id), x.week.datum, x.week.datum, x.w); }));
  const tw = {}; G.forEach(({ g, lg, z }) => ((B.toetsweken || {})[lg] || []).forEach(k => { const c = `${k.n}|${k.van}|${k.tot}`; (tw[c] = tw[c] || { k, gs: [], z: '' }).gs.push(g); tw[c].z += ' ' + z; }));
  Object.values(tw).forEach(({ k, gs, z }) => voeg('toetsweek', 70, `Toetsweek ${k.n}`, palRegel(`${fmtD(k.van)} – ${fmtD(k.tot)}`, gs.join(', ')), `tw${k.n} toetsen ${z}`, () => paletWeek(k.van), k.van, k.tot));
  ((B.koor || {}).agenda || []).forEach(k => voeg('koor', 65, k.type === 'concert' ? koorNaam(k) : 'Koor: ' + k.titel, palRegel(fmtD(k.d), k.tijdTekst, k.plaats), `koor koorrepetitie repetitie ${k.type} ${k.titel} ${k.concert || ''} ${(k.plan || []).map(p => p.stuk).join(' ')} ${dz(k.d)}`, () => paletDag(k.d, 'koor:' + k.d), k.d));
  ((B.koor || {}).taken || []).forEach(k => voeg('koor', 65, k.titel, palRegel('koortaak', fmtD(k.d), k.sub), `koor taak ${k.sub || ''} ${dz(k.d)}`, () => paletDag(k.d), k.d));
  (B.team || []).forEach(i => voeg('sectie', 55, i.titel, palRegel('team vwo 4-5-6', fmtD(i.d) + (i.tot ? ' – ' + fmtD(i.tot) : ''), i.tijd), `team v456 ${dz(i.d)}`, () => paletDag(i.d, 'team:' + i.id), i.d, i.tot || i.d));
  sectieItems().filter(i => !/^toetsweek/i.test(i.titel)).forEach(i => voeg('sectie', 55, i.titel, palRegel(i.taak ? 'sectietaak' : 'sectie', fmtD(i.d) + (i.tot ? ' – ' + fmtD(i.tot) : ''), i.tijd, i.info), `sectie ${i.soort || ''} ${i.info || ''} ${dz(i.d)}`, i.taak ? () => { location.hash = 'sectie'; } : () => paletDag(i.d, 'sectie:' + i.id), i.d, i.tot || i.d));
  (S.taken || []).forEach(k => { const d = k.plan ? k.plan.dag : k.d; voeg('taak', k.af ? 40 : 75, k.titel, palRegel(k.af ? 'af' : '', k.afspraak ? 'afspraak' : 'taak', k.plan ? `${fmtD(k.plan.dag)} ${k.plan.van}` : k.d ? 'deadline ' + fmtD(k.d) : 'zonder datum', BRON[k.bron]), `taak taken ${k.afspraak ? 'afspraak' : ''} ${BRON[k.bron] || ''} ${dz(d)}`, () => paletDag(d, 'taak:' + k.id), d); });
  Object.entries((S.beoord || {}).lijsten || {}).forEach(([g, L]) => (L || []).forEach(ll => voeg('leerling', 72, ll.naam, `leerling · klas ${g}`, `leerling klas ${g}`, () => paletKlas(g))));
  return I;
}
function paletWeekRegels(q) { // lesweek 20, lw 20, wk 5 (kalenderweek), week 20 (allebei); eventueel met een groep erachter
  const n = palNorm(q); const m = n.match(/\b(les ?week|lw|wk|week) ?(\d{1,2})\b/); if (!m) return [];
  const rest = n.replace(m[0], ' ').split(' ').filter(x => x && !PAL_STOP.has(x)); const G = palGroepen();
  if (!rest.every(x => G.some(k => palPast(palHooi(k.z), x)))) return []; // "lesweek 20 voorbereiden" is een taak
  const K = B.kalender.weken; const nr = +m[2]; const R = [];
  if (m[1] !== 'wk') R.push(K.find(k => k.w === nr)); if (m[1] === 'wk' || m[1] === 'week') R.push(K.find(k => k.wk === nr));
  return [...new Set(R.filter(Boolean))].map(k => { const ev = [...new Set(G.map(x => (((B.leergangen[x.lg] || {}).weken || []).find(w => w.w === k.w) || {}).event).filter(Boolean))];
    return { soort: 'lesweek', wk: k.w, rest, t: `Lesweek ${k.w}: ${palDag(k.datum)} – ${palDag(addD(k.datum, 4))}`, sub: palRegel('kalenderweek ' + k.wk, ...ev), run: () => paletWeek(k.datum) }; });
}
const PAL_HULP = [['Een toets: toets v4', 'toets v4'], ['Een lesweek: lesweek 20', 'lesweek 20'], ['De toetsweken: toetsweek', 'toetsweek'], ['Koor of sectie: generale', 'generale'], ['Beoordelen: beoordelen v4', 'beoordelen v4'], ['Een leerling: typ een naam', 'leerling '], ['Een taak met tijd: mail ouders koor morgen 10:30', 'taak ']];
function paletZoek(q) {
  if (!PAL.index) { try { PAL.index = paletIndex(); } catch (e) { console.warn(e); PAL.index = []; } } // een fout in het zoeken mag taken maken nooit in de weg zitten
  const w = palWoorden(q); const hulp = /^(help|hulp|\?+)$|^wat kan\b/i.test(q) ? PAL_HULP.map(([t, zet]) => ({ soort: 'hulp', t, sub: 'Enter vult dit in', zet })) : [];
  if (!w.length) return hulp;
  const wk = paletWeekRegels(q); const s0 = vandaag(); const gezien = new Set(); const per = {}; const MAX = { les: wk.length ? 24 : 6, leerling: 5, koor: 5, sectie: 5, toetsweek: 6 };
  const weken = new Set(wk.map(k => k.wk)); const z = wk.length ? wk[0].rest : w; // bij een lesweek telt het weeknummer van de regel, niet een los getal in de tekst
  const treffers = PAL.index.filter(a => (!wk.length || weken.has(a.wk)) && z.every(x => palPast(a.h, x))).map(a => ({ a, sc: a.basis + (z.length && z.every(x => palPast(a.th, x)) ? 60 : 0) + (a.nm === z.join(' ') ? 20 : 0) - (a.e && a.e < s0 ? 25 : 0) }))
    .sort((p, r) => r.sc - p.sc || (p.a.v || '9').localeCompare(r.a.v || '9') || p.a.n - r.a.n).map(x => x.a)
    .filter(a => { const c = a.soort === 'toetsweek' ? a.t + a.sub : a.t; if (gezien.has(c)) return false; gezien.add(c); per[a.soort] = (per[a.soort] || 0) + 1; return per[a.soort] <= (MAX[a.soort] || 99); });
  return hulp.concat(wk, treffers).slice(0, wk.length ? 26 : 12);
}
function paletLijst() {
  const q = PAL.q.trim(); if (!q) return PAL.acties.slice(0, 8);
  const t = leesTaak(q); const taak = { t: (t.afspraak ? 'Nieuwe afspraak: ' : 'Nieuwe taak: ') + t.titel, sub: t.fout ? '' : t.uitleg, let: t.fout || t.waarschuw, run: () => taakUitPalet(t) };
  const hits = paletZoek(q); // een treffer gaat voor, zodat Enter niet per ongeluk een taak maakt; wie "taak ..." typt maakt altijd een taak
  if (klasUitTekst(q) && LES_WOORD.test(q)) return [{ t: 'Nieuwe les: ' + t.titel, sub: 'kies of er een ander uur wegvalt', run: () => nwOpen({ dag: t.d || (t.plan && t.plan.dag) || vandaag(), van: 9 * 60, tot: 9 * 60 + 30, tekst: q }, innerWidth - 60, 110) }].concat(hits, [taak]);
  return /^(taak|zet|plan)\b/i.test(q) ? [taak].concat(hits) : hits.concat([taak]);
}
function paletToon() {
  PAL.L = paletLijst(); PAL.i = Math.min(PAL.i, Math.max(0, PAL.L.length - 1));
  $('#palL').innerHTML = PAL.L.length ? PAL.L.map((a, j) => `<button type="button" class="palet-a${j === PAL.i ? ' sel' : ''}" role="option" aria-selected="${j === PAL.i}" data-pal="${j}"><b>${esc(a.t)}</b>${a.sub ? `<small>${esc(a.sub)}</small>` : ''}${a.let ? `<small class="let">${esc(a.let)}</small>` : ''}</button>`).join('') : '<p class="leeg" style="padding:.6rem">Typ verder…</p>';
  const sel = $('#palL .sel'); if (sel) sel.scrollIntoView({ block: 'nearest' });
}
function paletKies(j) { const a = PAL && PAL.L[j]; if (!a) return; if (a.zet != null) { $('#palQ').value = a.zet; PAL.q = a.zet; PAL.i = 0; paletToon(); $('#palQ').focus(); return; } paletDicht(); a.run(); }
const DAGW = { zondag: 0, maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6, ma: 1, di: 2, wo: 3, do: 4, vr: 5 };
function datumVan(dag, mnd) { // de eerstvolgende keer; '' als de datum niet bestaat (31 februari)
  const j = dOf(vandaag()).getFullYear();
  for (let y = j; y <= j + 4; y++) { const D = new Date(y, mnd, dag, 12); if (D.getMonth() !== mnd || D.getDate() !== dag) continue; const x = ymd(D); if (x >= vandaag()) return x; }
  return '';
}
const tijdFout = q => { // "25:00", "10:75", "om 25 uur": geen tijd die bestaat
  for (const x of (' ' + q + ' ').matchAll(/(?<![\d:.])(\d{1,2})[:.](\d{2})(?![\d:.])/g)) if (+x[1] > 23 || +x[2] > 59) return `${x[1]}:${x[2]} bestaat niet als tijd. Kies een tijd tussen 0:00 en 23:59.`;
  const o = (' ' + q + ' ').match(/\som\s+(\d{1,2})(?:\s*uur)?(?=\s)/i); if (o && +o[1] > 23) return `${o[1]} uur bestaat niet als tijd. Kies een tijd tussen 0:00 en 23:59.`;
  return '';
};
const AFSPRAAK = /afspraak|gesprek|overleg|vergader|bespreking|meeting|bellen met/i;
const tijdTekst = x => { const [h, mi] = String(x).split(/[:.]/); return +h * 60 + (+mi || 0); };
function leesTaak(q, dagHint, los) { // los: in de agenda telt 11-12 als tijd en 11 uur als tijdstip; "afspraak om 11:00-12:00 met Sam", "mail ouders koor morgen 10:30", "sectie agenda voor vrijdag", "plan slc 20 min do om 14 uur"
  let t = ' ' + String(q).replace(/^\s*(taak:?|zet|plan)\s+/i, '') + ' '; const s0 = vandaag(); let dag = null, van = null, dur = null, uiterlijk = false, m;
  const pak = re => { const r = t.match(re); if (r) t = t.slice(0, r.index) + ' ' + t.slice(r.index + r[0].length); return r; };
  const fouten = []; const tf = tijdFout(q); if (tf) fouten.push(tf); // fout: Lesdag zet dit niet weg, maar zegt wat er niet klopt
  let totT = null; // tijdvak: 11:00-12:00, 11.00 tot 12.00, van 11 tot 12, 11-12 uur (eerst, anders leest de datum 11-12 als 11 december)
  if ((m = pak(/\s(?:om\s+|van\s+)?(\d{1,2}[:.]\d{2})\s*(?:-|–|—|tot)\s*(\d{1,2}(?:[:.]\d{2})?)(?:\s*uur)?(?=\s)/i) || pak(/\svan\s+(\d{1,2})\s*(?:-|–|—|tot)\s*(\d{1,2})(?:\s*uur)?(?=\s)/i) || pak(/\s(?:om\s+)?(\d{1,2})\s*(?:-|–|—|tot)\s*(\d{1,2})\s*uur(?=\s)/i))) {
    const a = tijdTekst(m[1]), b = tijdTekst(m[2]);
    if (b > a && b <= 1440) { van = a; totT = b; }
    else if (!tf) fouten.push(b === a ? `Begin en eind zijn allebei ${m[1]}. Kies een eindtijd na de begintijd.` : b < a ? `De eindtijd ${m[2]} ligt vóór de begintijd ${m[1]}. Kies een eindtijd na de begintijd.` : 'Na middernacht kan niet. Kies een eindtijd vóór 24:00.');
  }
  if (los && van == null) { const re = /\s(\d{1,2})\s*(?:-|–|—|tot)\s*(\d{1,2})(?=\s)/i; const r = t.match(re); const mid = u => (u < 7 ? u + 12 : u) * 60; if (r && mid(+r[2]) > mid(+r[1]) && mid(+r[2]) <= 1440) { pak(re); van = mid(+r[1]); totT = mid(+r[2]); } }
  if (pak(/\s(voor|uiterlijk|deadline)(?=\s+(vandaag|morgen|overmorgen|volgende|maandag|dinsdag|woensdag|donderdag|vrijdag|ma|di|wo|do|vr|\d))/i)) uiterlijk = true;
  if (pak(/\s(?:eer)?gisteren(?=\s)/i)) fouten.push('Gisteren is al voorbij. Kies vandaag of een dag die nog komt.');
  if ((m = pak(/\s(vandaag|morgen|overmorgen)(?=\s)/i))) dag = addD(s0, { vandaag: 0, morgen: 1, overmorgen: 2 }[m[1].toLowerCase()]);
  const vw = pak(/\svolgende\s+week(?=\s)/i);
  if ((m = pak(/\s(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|ma|di|wo|do|vr)(?=\s)/i))) { const wd = DAGW[m[1].toLowerCase()]; let d = s0; while (dOf(d).getDay() !== wd) d = addD(d, 1); if (vw && d < addD(maandagVan(s0), 7)) d = addD(d, 7); dag = d; }
  else if (vw) dag = addD(maandagVan(s0), 7);
  const geenDatum = (d, mn) => fouten.push(`${d} ${MAANDEN[mn] || 'van maand ' + (mn + 1)} bestaat niet. Kies een datum die bestaat.`);
  if (!dag && (m = pak(/\s(\d{1,2})[-\/](\d{1,2})(?=\s)/))) { dag = +m[2] >= 1 && +m[2] <= 12 ? datumVan(+m[1], +m[2] - 1) : ''; if (!dag) geenDatum(+m[1], +m[2] - 1); }
  if (!dag && (m = pak(/\s(\d{1,2})\s+(jan|feb|mrt|maa|apr|mei|jun|jul|aug|sep|okt|nov|dec)[a-z]*(?=\s)/i))) { const k = m[2].toLowerCase(); const mn = k === 'maa' ? 2 : MND.indexOf(k); dag = datumVan(+m[1], mn); if (!dag) geenDatum(+m[1], mn); }
  if (van != null) { /* tijdvak staat er al */ }
  else if ((m = pak(/\s(?:om\s+)?(\d{1,2})[:.](\d{2})(?:\s*uur)?(?=\s)/i))) van = +m[1] * 60 + +m[2];
  else if ((m = pak(/\som\s+(\d{1,2})(?:\s*uur)?(?=\s)/i))) van = +m[1] * 60;
  else if (los && (m = pak(/\s(\d{1,2})\s*uur(?=\s)/i))) van = +m[1] * 60;
  if ((m = pak(/\s(\d{1,3})\s*(?:min|minuten)(?=\s)/i))) dur = +m[1];
  else if (pak(/\s(?:een\s+)?kwartier(?=\s)/i)) dur = 15; else if (pak(/\s(?:een\s+)?half\s*uur(?=\s)/i)) dur = 30; else if ((m = pak(/\s(?:een|(\d))\s+uur(?=\s)/i))) dur = (+m[1] || 1) * 60;
  const eigenDuur = totT != null || dur != null;
  const titel = cap(t.replace(/\s+/g, ' ').trim()) || 'Taak';
  const bron = /\bsectie\b/i.test(q) ? 'sectie' : /\bkoor\b/i.test(q) ? 'koor' : /\bslc\b/i.test(q) ? 'slc' : /\b(e-?mail|mail|mailen)\b/i.test(q) ? 'mail' : /\b(les|lessen|presentatie)\b/i.test(q) ? 'les' : 'overig';
  if (!dag && dagHint) dag = dagHint;
  if (van != null && !dag) dag = van > nuMin() ? s0 : addD(s0, 1);
  const rp = rolVoorstel(q, bron); const rn = ' · ' + ((rolInfo(rp.rol) || {}).naam || '') + (rp.potje ? ', ' + potInfo(rp.potje).naam : '');
  const r = { titel, bron, rol: rp.rol, potje: rp.potje, wanneer: !!(dag || van != null), eigenDuur, fout: fouten[0] || '' };
  const afspr = AFSPRAAK.test(q) || (totT != null && /\smet\s/i.test(t));
  if (afspr && van != null) { dur = totT != null ? totT - van : dur || 30; r.afspraak = true; r.wanneer = true; r.plan = { dag, van: hm(van), tot: hm(van + dur) }; r.uitleg = `afspraak · ${fmtD(dag)} ${hm(van)}–${hm(van + dur)}${rn}`; r.waarschuw = botsing(dag, van, van + dur); return r; }
  if (van != null && !uiterlijk) { dur = totT != null ? totT - van : dur || schat(SCHAT[bron] ? bron : 'overig', titel); r.plan = { dag, van: hm(van), tot: hm(van + dur) }; r.uitleg = `${fmtD(dag)} ${hm(van)}–${hm(van + dur)} · ${BRON[bron]}${rn}`; r.waarschuw = botsing(dag, van, van + dur); }
  else if (dag) { r.d = dag; r.uitleg = `deadline ${fmtD(dag)} · ${BRON[bron]}${dur ? ' · ' + dur + ' min' : ''}${rn}`; }
  else r.uitleg = `zonder datum · ${BRON[bron]}${dur ? ' · ' + dur + ' min' : ''}${rn}`;
  if (dur && !r.plan) r.min = dur;
  if (afspr && !r.plan) r.waarschuw = 'Geen tijd herkend: dit wordt een taak. Schrijf bijvoorbeeld 11:00-12:00.';
  return r;
}
function botsing(dag, van, tot) {
  const pd = planning(dag, dag)[dag]; const it = dagItems(dag, pd).items.filter(x => ['les', 'pauze', 'rust', 'koor', 'afspraak', 'toets', 'sectie', 'rooster', 'taak'].includes(x.soort) && x.van < tot && x.tot > van).sort((a, b) => ['pauze', 'rust'].includes(a.soort) - ['pauze', 'rust'].includes(b.soort))[0];
  if (!it) return pd.reden ? `Let op: ${pd.reden}` : '';
  return it.soort === 'les' ? `Let op: dan geef je les (${it.titel})` : ['afspraak', 'sectie', 'rooster', 'taak', 'toets'].includes(it.soort) ? `Let op: dan heb je al ${it.titel}` : it.soort === 'koor' ? 'Let op: dan is het koor' : `Let op: dat is je ${it.soort === 'rust' ? 'rustblok' : 'pauze'}`;
}
function taakUitPalet(t, rp) { // rp: rol en potje die je zelf koos
  if (t.fout) { toast(t.fout); return; }
  const k = maakTaak('', t.plan || null, t.titel, t.bron); if (!k) return; if (rp) zetRol(k, rp);
  if (t.afspraak) k.afspraak = true; if (t.d) k.d = t.d; if (t.min) k.min = t.min; bewaar();
  toast(t.plan ? `${k.titel} staat op ${fmtD(t.plan.dag)} om ${t.plan.van}` : `${k.titel} staat in je takenlijst${t.d ? ', deadline ' + fmtD(t.d) : ''}`);
}

/* ---------- week ---------- */
let weekKeuze = null;
function viewWeek() {
  const t = vandaag(); const ma = weekKeuze || maandagVan(t); const vr = addD(ma, 4);
  const p = planning(ma, vr); const lw = lesweekVan(ma) || lesweekVan(addD(ma, 2));
  const dezeWeek = maandagVan(t);
  let h = `<div class="kop"><div><h1>Week van ${esc(fmtD(ma))}</h1><div class="sub">${lw ? 'Lesweek ' + lw : 'Geen lesweek'}</div></div><div class="knoppen"><button class="btn" data-week="${addD(ma, -7)}">‹ vorige week</button>${ma !== dezeWeek ? `<button class="btn" data-week="${dezeWeek}">deze week</button>` : ''}<button class="btn" data-week="${addD(ma, 7)}">volgende week ›</button><form class="weeksprong" id="weekSprong"><label class="sr-only" for="wsNr">Lesweek</label><input id="wsNr" type="number" min="1" max="${B.kalender.weken[B.kalender.weken.length - 1].w}" inputmode="numeric" placeholder="lesweek" aria-label="Lesweek"><button class="btn" type="submit">Ga naar</button></form><button class="btn hoofd" data-nwnieuw="">+ Nieuw</button></div></div>`;
  const dagen = []; for (let i = 0; i < 5; i++) { const s = addD(ma, i); const A = dagItems(s, p[s]); dagen.push({ s, items: A.items, heleDag: A.heleDag, reden: p[s].reden }); }
  const vrijMin = dagen.reduce((a, d) => a + d.items.filter(x => x.soort === 'vrij').reduce((b, x) => b + x.tot - x.van, 0), 0);
  const perKey = {}; dagen.forEach((d, i) => d.heleDag.forEach(it => { (perKey[it.key] = perKey[it.key] || { it, L: [] }).L.push(i); }));
  const banden = Object.values(perKey).filter(x => x.L.length > 1); // loopt iets over meer dagen, zoals een toetsweek, dan één balk in plaats van een label per dag
  const uitBand = it => !banden.some(x => x.it.key === it.key); const heeftChips = dagen.some(d => d.heleDag.some(uitBand));
  h += `<div class="kaart wkagenda"><div class="ag-scroll"><div class="ag-kop" style="--n:5"><span></span>${dagen.map(d => `<button class="ag-dag${d.s === t ? ' vandaag' : d.s < t ? ' voorbij' : ''}" data-dag="${d.s}"><b>${esc(fmtD(d.s))}</b>${d.reden && d.reden !== 'weekend' ? `<small>${esc(d.reden)}</small>` : ''}</button>`).join('')}</div>`;
  if (banden.length) h += banden.map(x => `<div class="ag-kop ag-band" style="--n:5"><button class="${rolStijl(rolVanItem(x.it)).cls.trim()}" style="${rolStijl(rolVanItem(x.it)).st}grid-column:${x.L[0] + 2}/span ${x.L[x.L.length - 1] - x.L[0] + 1}" data-ag="${dagen[x.L[0]].s}|${esc(x.it.key)}" title="${esc(x.it.titel)}">${esc(x.it.titel)}</button></div>`).join('');
  if (heeftChips) h += `<div class="ag-kop ag-hdrij" style="--n:5"><span></span>${dagen.map(d => `<div>${heleDagRij(d.s, d.heleDag.filter(uitBand), 2)}</div>`).join('')}</div>`;
  h += agendaRaster(dagen, { ppm: 1.2, compact: true }) + `</div>${agOnder(`${Math.floor(vrijMin / 60)} uur en ${vrijMin % 60} minuten vrij. Klik of sleep in de lege agenda om iets te plannen.`, dagen.some(d => d.items.some(x => x.soort === 'uitval')))}</div>`;
  const wk = [5, 6].map(i => addD(ma, i)).map(s => ({ s, k: koorOp(s) })).filter(x => x.k && x.k.type !== 'vrij');
  if (wk.length) h += `<div class="ag-weekend"><b>Weekend</b>${wk.map(x => `<button class="ag-chip ag-koor${rolStijl('dirigent').cls}" style="${rolStijl('dirigent').st}" data-ag="${x.s}|koor:${x.s}">${esc(fmtD(x.s))} ${esc(x.k.van ? x.k.van + '–' + (x.k.tot || '') + ' ' : '')}${esc(koorNaam(x.k))}${x.k.plaats ? ' · ' + esc(x.k.plaats) : ''}</button>`).join('')}</div>`;
  return h;
}

/* ---------- jaar: de partituur en het klasblad ----------
   #jaar: per groep uit het rooster een notenbalk over de lesweken, alleen lezend. Eén noot per les; de vijf lijnen zijn ma tot en met vr,
   ma bovenaan, en de dag komt uit S.rooster. Een tweede les op dezelfde dag staat in de ruimte eronder. Open noot links van de speelkop: achter.
   #jaar/<groep>: het klasblad, met alles wat bij één klas hoort. */
let klasOpen = null, klasScroll = false, JS = null; const jaarBlok = {};
const JAAR_VOLG = ['vwo6', 'havo5', 'mavo4', 'vwo5', 'vwo4', 'havo4', 'vwo3', 'havo3', 'mavo3', 'kmu3', 'bb1']; // examenklassen bovenaan, dan aflopend
const WEEK_LOS = /nog kiezen|nog vastleggen|datum volgt|lesweek \d+ of \d+|^periode /i; // staat er in de leergang wel een week, maar die ligt nog niet vast
const jaarLw = () => lesweekVan(vandaag()) || nextLesweek();
const klasUrl = g => '#jaar/' + encodeURIComponent(g);
function jaarSlots() { // kalenderweken vanaf de eerste lesweek: per lesweek zijn plek, en de vakantieweken ertussen
  if (JS) return JS; const W = B.kalender.weken; const nr = d => Math.round((dOf(d) - dOf(W[0].datum)) / 6048e5); const per = {}, gaten = [];
  W.forEach((k, i) => { per[k.w] = nr(k.datum); if (i) for (let s = nr(W[i - 1].datum) + 1; s < nr(k.datum); s++) gaten.push(s); });
  return (JS = { per, gaten, tot: nr(W[W.length - 1].datum) + 1 });
}
const jaarPct = s => (s / jaarSlots().tot * 100).toFixed(2) + '%';
function jaarBereik(lg) { // eerste en laatste lesweek die echt bestaan: h5, v6 en m4 stoppen na lesweek 30, kmu h3 begint in lesweek 31
  const W = B.leergangen[lg].weken.filter(w => [1, 2, 3].some(i => w['l' + i] && w['l' + i].type !== 'uitval')).map(w => w.w);
  return W.length ? [W[0], W[W.length - 1]] : [1, 0];
}
const jaarTw = lg => ((B.toetsweken || {})[lg] || []).flatMap(tw => B.kalender.weken.filter(k => k.datum <= tw.tot && addD(k.datum, 4) >= tw.van).map(k => ({ w: k.w, tw })));
function jaarNootKlas(g, x, lw) { const st = status(g, x.id).st;
  return st === 'gegeven' ? '' : st === 'overgeslagen' ? 'over' : st === 'half' ? 'half' : les(x).type === 'leeg' ? 'leeg' : x.w < lw ? 'mis' : 'open'; }
function jaarNoten(g, lg, lw) {
  const P = jaarSlots(); const [van, tot] = jaarBereik(lg); const perWeek = {}; reeks(lg).forEach(x => (perWeek[x.w] = perWeek[x.w] || []).push(x));
  const dagen = S.rooster.filter(u => u.groep === g).sort((a, b) => a.dag - b.dag || minuten(a.start) - minuten(b.start)).map(u => +u.dag);
  let h = '';
  for (const k of B.kalender.weken) { if (k.w < van || k.w > tot) continue; const x = jaarPct(P.per[k.w] + .5); const ls = perWeek[k.w];
    if (!ls) { h += `<i class="jr-rust" style="left:${x}"></i>`; continue; }
    const gezien = {};
    for (const l of ls) { const d = dagen.length ? dagen[(l.li - 1) % dagen.length] : 3; const n = gezien[d] || 0; gezien[d] = n + 1; const y = (d - 3) * 6.5 + (n ? 3.25 : 0);
      h += `<i class="jr-noot ${jaarNootKlas(g, l, lw)}" style="left:calc(${x} + ${n * 5}px);top:calc(50% + ${y}px)"></i>`; } }
  return h;
}
function jaarToetsen(g) { // de toetsen op hun lesuur (ankersVan) en de rest uit de leergang: toetsen in een toetsweek zijn geen les
  const lg = leergangVan(g); const A = MEE_MET[g] ? [] : ankersVan(g); const lw = jaarLw(); // meedraaien: geen eigen lesuren, dus de weken uit de leergang
  const uit = A.map(a => ({ a, t: a.t, w: (a.verplaatst || a.opDatum) && a.slot ? a.slot.w : a.opDatum ? a.plek.w : a.item.w, klaar: a.klaar, los: !a.verplaatst && WEEK_LOS.test(a.t.waar || '') }));
  ((B.leergangen[lg] || {}).toetsen || []).filter(T => !A.some(a => a.t.id === T.id)).forEach(T => uit.push({ t: T, w: T.week, klaar: T.week < lw, los: WEEK_LOS.test(T.waar || '') }));
  return uit.sort((a, b) => a.w - b.w);
}
function jaarToetsTekst(g, id) { const o = jaarToetsen(g).find(x => x.t.id === id); if (!o) return ''; const T = o.t; const y = o.a && (o.a.vast ? o.a.slot : o.a.grens); const d = y ? y.s : T.datum;
  return `<b>${esc(T.id)} ${esc(g)}</b> · ${[T.naam, 'lesweek ' + o.w, d ? fmtD(d) : '', T.weging != null ? 'weging ' + T.weging : '', T.waar].filter(Boolean).map(esc).join(' · ')}`; }
function jaarBalk(g, lg, lw) {
  const P = jaarSlots(); const [van, tot] = jaarBereik(lg); const laatste = B.kalender.weken[B.kalender.weken.length - 1].w; let h = '';
  for (const { w, tw } of jaarTw(lg)) h += `<i class="jr-band tw" title="Toetsweek ${tw.n}" style="left:${jaarPct(P.per[w])};width:${jaarPct(1)}"></i>`;
  for (const s of P.gaten) h += `<i class="jr-band vk" style="left:${jaarPct(s)};width:${jaarPct(1)}"></i>`;
  if (tot >= van) h += `<i class="jr-lijnen${tot < laatste ? ' eind' : ''}" style="left:${jaarPct(P.per[van])};width:calc(${jaarPct(P.per[tot] + 1)} - ${jaarPct(P.per[van])})"></i>`;
  for (const s of P.gaten) if (s > P.per[van] && s < P.per[tot]) h += `<i class="jr-rust" style="left:${jaarPct(s + .5)}"></i>`;
  if (!MEE_MET[g]) h += jaarNoten(g, lg, lw);
  const gehad = {};
  for (const o of jaarToetsen(g)) { const k = o.t.id + '|' + o.w; if (gehad[k] || !(o.w in P.per)) continue; gehad[k] = 1; const prak = o.t.soort === 'praktijk' || /^P/.test(o.t.id);
    h += `<button type="button" class="jr-toets${o.los ? ' los' : prak ? ' p' : ''}${o.klaar ? ' af' : ''}" style="left:${jaarPct(P.per[o.w] + .5)}" data-jaartoets="${esc(g + '|' + o.t.id)}" title="${esc(o.t.id + ' ' + (o.t.naam || ''))}">${esc(o.t.id)}</button>`; }
  if (lw in P.per) h += `<i class="jr-kop" style="left:${jaarPct(P.per[lw] + .5)}"></i>`;
  return h;
}
function jaarAs(lw, metMaand) {
  const P = jaarSlots(); let h = '', m = '';
  if (metMaand) for (const k of B.kalender.weken) { const mn = dOf(addD(k.datum, 3)).toLocaleDateString('nl-NL', { month: 'short' }).replace('.', ''); if (mn !== m) { h += `<span class="m" style="left:${jaarPct(P.per[k.w])}">${esc(mn)}</span>`; m = mn; } }
  const wkKnop = (w, nu) => { const k = B.kalender.weken.find(k => k.w === w); return `<button type="button" class="w${nu ? ' nu' : ''}" data-jaarweek="${k ? k.datum : ''}" title="Naar lesweek ${w}" aria-label="Naar lesweek ${w}" style="left:${jaarPct(P.per[w] + .5)}">${w}</button>`; };
  for (const w of [1, 5, 10, 15, 20, 25, 30, 35, 38]) if (Math.abs(w - lw) > 1 && w in P.per) h += wkKnop(w, false);
  if (lw in P.per) h += wkKnop(lw, true);
  return `<div class="jr-as">${h}</div>`;
}
const JAAR_UITLEG = [['<i class="jr-noot"></i>', 'gegeven'], ['<i class="jr-noot open"></i>', 'komt nog'], ['<i class="jr-noot mis"></i>', 'achter: open, links van de rode lijn'], ['<i class="jr-noot half"></i>', 'half gegeven'], ['<i class="jr-noot over"></i>', 'overgeslagen'], ['<i class="jr-noot leeg"></i>', 'les nog in te vullen'], ['<i class="jr-rust"></i>', 'geen les: vakantie, toetsweek of uitval'],
  ['<span class="jr-toets">T1</span>', 'theorietoets'], ['<span class="jr-toets p">P1</span>', 'praktijktoets'], ['<span class="jr-toets los">P1</span>', 'week nog niet vast'], ['<i class="jr-band tw"></i>', 'toetsweek van die klas'], ['<i class="jr-kop"></i>', 'deze lesweek'], ['<i class="jr-lijn5"></i>', 'lijnen: ma boven, vr onder']];
function viewJaar() { const g = decodeURIComponent(route.arg[0] || ''); return g ? viewKlasblad(g) : viewPartituur(); }
function viewPartituur() {
  const lw = jaarLw(); const rang = g => { const i = JAAR_VOLG.indexOf(leergangVan(g)); return i < 0 ? 99 : i; };
  const gs = [...new Set(rooGroepen().concat(Object.keys(MEE_MET).filter(m => rooGroepen().includes(MEE_MET[m]))))].sort((a, b) => rang(a) - rang(b) || a.localeCompare(b, 'nl'));
  let h = `<div class="kop"><div><h1>Jaar</h1><div class="sub">Schooljaar ${esc(B.schooljaar || '')}${lw in jaarSlots().per ? ` · nu: lesweek ${lw}` : ''}</div></div></div>`;
  if (!gs.length) return h + `<div class="kaart"><p class="lead">Nog geen lessen in je rooster, dus nog geen klassen in de partituur.</p><div class="knoppen" style="margin-top:.6rem"><a class="btn" href="#rooster">Naar Rooster</a></div></div>`;
  const rijen = gs.map((g, i) => { const lg = leergangVan(g); const heeft = lg && B.leergangen[lg]; const zelfde = x => x && heeft && leergangVan(x) === lg; const acc = zelfde(gs[i - 1]) || zelfde(gs[i + 1]);
    return `<div class="jr-rij${acc ? ' acc' : ''}${acc && !zelfde(gs[i - 1]) ? ' eerst' : ''}${acc && !zelfde(gs[i + 1]) ? ' laatst' : ''}"><a class="jr-naam" href="${esc(klasUrl(g))}" title="${esc(heeft ? lgNaam(lg) : 'geen leergang')}">${esc(g)}</a>${heeft ? `<div class="jr-balk" data-jaarklas="${esc(g)}">${jaarBalk(g, lg, lw)}</div>` : '<div class="jr-balk geen"><span class="chip rood">geen leergang</span></div>'}</div>`; }).join('');
  const tekort = gs.filter(g => leergangVan(g) && B.leergangen[leergangVan(g)] && Object.keys(S.voortgang[g] || {}).length).map(g => ruimte(g)[0]).filter(d => d && d.tekort); // een groep die nog nooit is afgevinkt krijgt eerst de melding op Dag
  h += `<div class="kaart jr-vel"><div class="jr-score"><div class="jr-rij kopregel"><span class="jr-naam"></span>${jaarAs(lw, true)}</div>${rijen}</div></div>`;
  h += tekort.map(d => `<div class="melding"><a href="${esc(klasUrl(d.g))}">${esc(d.g)}</a> heeft nog ${d.nog.length} ${d.nog.length === 1 ? 'les' : 'lessen'} te geven en ${d.uren} ${d.uren === 1 ? 'lesuur' : 'lesuren'} tot ${esc(d.t.id)} ${d.a && !d.a.vast ? 'uiterlijk' : 'op'} ${esc(fmtD(d.s))}: ${d.tekort} tekort.</div>`).join('');
  h += `<p class="jr-info" id="jaarInfo" aria-live="polite">Tik op een klas voor het klasblad, op een toets voor de gegevens.</p>`;
  h += `<ul class="jr-uitleg">${JAAR_UITLEG.map(([a, b]) => `<li><span class="jr-vb">${a}</span><span>${b}</span></li>`).join('')}</ul>`;
  return h;
}
function bmRegel(m, g, label) { const T = S.beoord.toetsen[m.id + '|' + g]; const n = T ? Object.keys(T.ll).filter(id => T.ll[id].af || BMR.eind(m, T, T, id).e != null).length : 0;
  return `<button class="btn klein" data-beoordeel="${esc(m.id)}|${esc(g)}">${esc(label)}${n ? ` (${n} klaar)` : ''}</button>`; }
function toetsenKaart(g) { // met de knop Beoordelen op de regel van de toets, ook om in te halen of na te kijken buiten de toetsles
  const lg = leergangVan(g); const L = jaarToetsen(g); const bms = BM.filter(m => (m.lessen || []).some(k => k.lg === lg)); const gehad = new Set();
  const rij = o => { const { a, t } = o; const y = a && (a.vast ? a.slot : a.grens); const eigen = gehad.has(t.id) ? [] : bms.filter(m => m.toets.split(' · ')[0] === t.id); gehad.add(t.id);
    const sub = ['lesweek ' + o.w, t.weging != null ? 'weging ' + t.weging : '', t.waar].filter(Boolean).map(esc).join(' · ');
    const chips = !a ? (o.klaar ? '<span class="chip">geweest</span>' : t.datum ? `<span class="chip rood">${esc(fmtD(t.datum))}</span>` : '')
      : (a.klaar ? '<span class="chip ok">klaar</span>' : y ? `<span class="chip rood">${esc(fmtD(y.s))}</span>` : '<span class="chip let">geen lesuur</span>') + (a.verplaatst ? '<span class="chip let">verplaatst</span>' : a.vast ? '' : `<span class="chip">schuift mee, tot lesweek ${periodeEind(lg, a)}</span>`);
    return `<div class="jr-regel"><span><b>${esc(t.id)}</b> ${esc(t.naam || '')}<small>${sub}</small></span><span class="tb">${o.los && !o.klaar ? '<span class="chip let">week niet vast</span>' : ''}${chips}${a && !a.klaar ? `<button class="btn klein" data-ankeropen="${esc(g + '|' + a.id)}">verplaats</button>` : ''}${eigen.map(m => bmRegel(m, g, eigen.length > 1 ? 'Beoordelen ' + (m.toets.split(' · ')[1] || m.titel) : 'Beoordelen')).join('')}</span></div>`; };
  const rijen = L.map(rij).join(''); const los = bms.filter(m => !L.some(o => o.t.id === m.toets.split(' · ')[0])); // beoordelingen die bij geen toets horen, zoals een songbox
  const open = ankersVan(g).find(a => ankerOpen === g + '|' + a.id);
  return `<div class="kaart"><h2>Toetsen</h2>${rijen || '<p class="lead">Geen toetsen in deze leergang.</p>'}${los.map(m => `<div class="jr-regel"><span><b>${esc(m.toets)}</b> ${esc(m.titel.replace(/^[^:]*:\s*/, ''))}</span><span class="tb">${bmRegel(m, g, 'Beoordelen')}</span></div>`).join('')}</div>${open ? ankerForm(g, open) : ''}`;
}
function lessenKaart(g, lg, lw) { // per blok; het huidige blok staat open
  const r = reeks(lg); if (!r.length) return ''; const vi = volgendeIndex(g); const BL = (B.leergangen[lg].blokken || []).filter(b => b.weken); const nu = BL.find(b => b.weken[1] >= lw); const gehad = new Set();
  const rij = x => { gehad.add(x); const i = r.indexOf(x); const l = les(x); const st = status(g, x.id); const achter = !st.st && x.w < lw && l.type !== 'leeg';
    return `<div class="lesrij ${i === vi ? 'volgende' : ''}"><span class="wk">${i + 1}<br>wk ${x.w}</span><div><div class="regel" style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:baseline">${chipType(l)}<b style="font-family:var(--lees)">${esc(l.titel || '')}</b>${st.st ? `<span class="chip ${st.st === 'gegeven' ? 'ok' : st.st === 'half' ? 'let' : ''}">${esc(st.st)}${st.d ? ' ' + esc(fmtD(st.d)) : ''}</span>` : achter ? '<span class="chip let">achter</span>' : ''}</div>${st.n ? `<div class="vorige">${esc(st.n)}</div>` : ''}</div>
    <div class="acties knoppen"><button class="btn klein" data-bewerk="${esc(x.id)}">bewerk</button>${afgerond(st) ? `<button class="btn klein" data-reset="${esc(g)}|${esc(x.id)}">niet gegeven</button>` : `<button class="btn klein" data-markeer="${esc(g)}|${esc(x.id)}">gegeven</button>`}</div></div>`; };
  const deel = (key, kop, wk, ls, open) => { if (!ls.length) return ''; const klaar = ls.filter(x => afgerond(status(g, x.id))).length; const achter = ls.filter(x => !status(g, x.id).st && x.w < lw && les(x).type !== 'leeg').length;
    return `<details class="jr-blok" data-jaarblok="${esc(g + '|' + key)}"${(jaarBlok[g + '|' + key] != null ? jaarBlok[g + '|' + key] : open) ? ' open' : ''}><summary><b>${esc(kop)}</b> <span class="sub">${wk ? esc(wk) + ' · ' : ''}${klaar} van ${ls.length} gegeven</span>${achter ? ` <span class="chip let">${achter} achter</span>` : ''}</summary>${ls.map(rij).join('')}</details>`; };
  const h = BL.map(b => deel(b.id, `${b.id} ${b.titel || ''}`, `lesweek ${b.weken[0]}–${b.weken[1]}`, r.filter(x => x.w >= b.weken[0] && x.w <= b.weken[1] && !gehad.has(x)), b === nu)).join('');
  return `<div class="kaart"><h2>Lessen</h2>${h}${deel('rest', 'Overige lessen', '', r.filter(x => !gehad.has(x)), !BL.length)}</div>`;
}
function ruimteRegel(g) { const d = ruimte(g)[0]; if (!d) return '<p class="lead">Geen toets meer dit jaar.</p>';
  return `<div class="jr-regel"><span><b>${esc(d.t.id)}</b> ${d.a && !d.a.vast ? 'uiterlijk ' : ''}${esc(fmtD(d.s))}${d.tw ? ' · toetsweek' : ''}<small>nog ${d.nog.length} ${d.nog.length === 1 ? 'les' : 'lessen'} te geven, ${d.uren} ${d.uren === 1 ? 'lesuur' : 'lesuren'}</small></span><span class="tb">${d.tekort ? `<span class="chip let">${d.tekort} tekort</span>` : '<span class="chip ok">past</span>'}${d.inhaal.length ? `<span class="chip">${d.inhaal.length} inhaalbaar</span>` : ''}</span></div>`; }
function viewKlasblad(g) {
  const lg = leergangVan(g); const L = B.leergangen[lg]; const lw = jaarLw(); const terug = `<a class="sub" href="#jaar">Terug naar Jaar</a>`;
  if (!L && !S.rooster.some(u => u.groep === g)) return `<div class="kop"><div><h1>${esc(g)}</h1>${terug}</div></div><div class="kaart"><p class="lead">Deze klas staat niet in je rooster en niet in de leergangen.</p></div>`;
  const mee = MEE_MET[g]; const r = L ? reeks(lg) : []; const vi = L ? volgendeIndex(g) : 0; const gegeven = r.filter(x => afgerond(status(g, x.id))).length; const planI = r.findIndex(x => x.w >= lw); const kl = S.beoord.lijsten[g] || [];
  let h = `<div class="kop"><div><h1>${esc(g)}${L ? ' · ' + esc(lgNaam(lg)) : ''}</h1><div class="sub">${mee ? `Draait mee met <a href="${esc(klasUrl(mee))}">${esc(mee)}</a>, alleen de eigen toetsen · ` : L ? `${gegeven} van ${r.length} lessen gegeven${lesweekVan(vandaag()) && planI >= 0 ? ` · volgens de planning nu bij les ${planI + 1} (lesweek ${lw})` : ''} · volgende: les ${vi + 1} · ` : ''}${terug}</div></div></div>`;
  if (L) h += `<div class="kaart jr-vel klein"><div class="jr-score">${jaarAs(lw, false)}<div class="jr-balk">${jaarBalk(g, lg, lw)}</div></div></div>`;
  const klas = `<div class="kaart"><h2>Klas</h2>
    <div class="jr-regel"><span>Klassenlijst<small>${kl.length ? `${kl.length} leerlingen. ` : 'Nog geen klassenlijst. '}Alleen namen, op je apparaten en in de synchronisatie achter je login.</small></span><span class="tb"><button class="btn klein" data-klasopen="${esc(g)}">${kl.length ? 'Opnieuw plakken uit Magister' : 'Plakken uit Magister'}</button></span></div>
    <div class="jr-regel"><span>Leergang</span><span class="tb"><select id="gLg" data-g="${esc(g)}" aria-label="Leergang">${L ? '' : '<option value="" selected>Kies een leergang</option>'}${Object.keys(B.leergangen).map(k => `<option value="${k}" ${k === lg ? 'selected' : ''}>${esc(lgNaam(k))}</option>`).join('')}</select></span></div>
    ${L && !mee ? `<div class="jr-regel"><span>Op de planning zetten<small>alle lessen vóór deze lesweek gelden dan als gegeven</small></span><span class="tb"><button class="btn klein" data-opplan="${esc(g)}">Op de planning zetten</button></span></div>` : ''}</div>`;
  h += `<div class="jr-twee">${L ? `<div class="jr-kolom">${toetsenKaart(g)}</div>` : ''}<div class="jr-kolom">${L && !mee ? `<div class="kaart"><h2>Tot de volgende toets</h2>${ruimteRegel(g)}</div>` : ''}${klas}</div></div>`;
  if (klasOpen === g) h += lijstKaart(g, kl);
  h += afwijkingenKaart(g);
  if (L && !mee) h += lessenKaart(g, lg, lw);
  return h;
}
document.addEventListener('toggle', e => { const d = e.target.dataset && e.target.dataset.jaarblok; if (d) jaarBlok[d] = e.target.open; }, true);

/* ---------- rooster ---------- */
function roosterRaster(L) { // de week als raster: rijen zijn de lestijden die op meer dagen voorkomen; een tijd die maar op één dag voorkomt schuift bij de dichtstbijzijnde rij als dat vak leeg is
  const tijden = {}; L.forEach(u => (tijden[u.start] = tijden[u.start] || new Set()).add(+u.dag));
  const rijen = Object.keys(tijden).filter(t => tijden[t].size > 1).map(t => ({ t, m: minuten(t), c: {} }));
  const dagen = [1, 2, 3, 4]; if (L.some(u => +u.dag === 5)) dagen.push(5);
  const vaak = {}; L.forEach(u => { if (u.lokaal) vaak[u.lokaal] = (vaak[u.lokaal] || 0) + 1; }); const lokaal = Object.keys(vaak).sort((a, b) => vaak[b] - vaak[a])[0];
  [...L].sort((a, b) => minuten(a.start) - minuten(b.start)).forEach(u => { const m = minuten(u.start); const d = +u.dag;
    let r = rijen.find(x => x.t === u.start);
    if (!r) r = rijen.filter(x => Math.abs(x.m - m) <= 30 && !x.c[d]).sort((a, b) => Math.abs(a.m - m) - Math.abs(b.m - m))[0];
    if (!r) { r = { t: u.start, m, c: {} }; rijen.push(r); }
    (r.c[d] = r.c[d] || []).push(`<a class="ro-les" href="${esc(klasUrl(u.groep))}" title="${esc(lgNaam(leergangVan(u.groep)) || '')}">${esc(klasLabel(u.groep))}${r.t !== u.start ? `<small>${esc(u.start)}</small>` : ''}${u.lokaal && u.lokaal !== lokaal ? `<small>${esc(u.lokaal)}</small>` : ''}</a>`); });
  rijen.sort((a, b) => a.m - b.m);
  return `<table class="ro-raster"><thead><tr><th></th>${dagen.map(d => `<th scope="col">${esc(cap(DAGLANG[d]))}</th>`).join('')}</tr></thead><tbody>${rijen.map(r => `<tr><th scope="row" class="num">${esc(r.t)}</th>${dagen.map(d => `<td>${(r.c[d] || []).join('')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function roosterAfwijkingen() { // wat de komende opgehaalde weken anders is dan de vaste week
  if (!ZC || !ZC.events) return ''; const t = vandaag(); const sleutel = (d, st, g) => d + '|' + st + '|' + g;
  const vast = new Set(S.rooster.map(u => sleutel(+u.dag, u.start, u.groep))); const nieuw = new Set(zVastRooster().map(u => sleutel(u.dag, u.start, u.groep)));
  const L = ZC.events.filter(e => e.d >= t && e.start && zLes(e) && !zToets(e)).sort((a, b) => (a.d + a.start < b.d + b.start ? -1 : 1));
  const rij = []; const uit = L.filter(e => e.vervallen);
  L.filter(e => !e.vervallen).forEach(e => { const g = zGroep(e); const d = dOf(e.d).getDay(); const k = sleutel(d, e.start, g); if (vast.has(k) || nieuw.has(k)) return;
    const n = S.rooster.find(u => u.groep === g && +u.dag === d); rij.push(`<span>${esc(fmtD(e.d))}</span><span>${esc(klasLabel(g))} om ${esc(e.start)}${n ? `, normaal ${esc(n.start)}` : ', extra les'}</span>`); });
  if (uit.length) rij.push(`<span>${esc(fmtD(uit[0].d))}${uit[0].d !== uit[uit.length - 1].d ? ' tot en met ' + esc(fmtD(uit[uit.length - 1].d)) : ''}</span><span>${uit.length} ${uit.length === 1 ? 'les vervalt' : 'lessen vervallen'}, per dag te zien in <a href="#week">Week</a></span>`);
  return rij.length ? `<div class="kaart"><h2>Wijkt af de komende weken</h2><div class="ro-wijk">${rij.join('')}</div></div>` : '';
}
function roosterVerschil() { // komt iets in Zermelo minstens twee weken anders terug, dan vraagt Lesdag of het vaste rooster mee moet
  const z = zVastRooster(); if (!z.length) return ''; const zelfde = (a, b) => +a.dag === +b.dag && a.start === b.start && a.groep === b.groep; const tekst = u => `${DAGLANG[u.dag]} ${u.start} ${klasLabel(u.groep)}`;
  const erbij = z.filter(u => !S.rooster.some(x => zelfde(x, u))); const eraf = S.rooster.filter(u => !z.some(x => zelfde(x, u)));
  if (!erbij.length && !eraf.length) return '';
  return `<div class="kaart"><h2>Zermelo is veranderd</h2><p class="lead">Dit komt in je rooster minstens twee weken anders terug.</p><div class="ro-wijk">${erbij.map(u => `<span>Nieuw</span><span>${esc(tekst(u))}</span>`).join('')}${eraf.map(u => `<span>Vervalt</span><span>${esc(tekst(u))}</span>`).join('')}</div><div class="knoppen" style="margin-top:.6rem"><button class="btn hoofd" data-zovernemen="">Neem over in je vaste week</button></div></div>`;
}
function viewRooster() {
  const rows = [...S.rooster].sort((a, b) => a.dag - b.dag || minuten(a.start) - minuten(b.start));
  const opties = alleGroepen(); const lok = [...new Set(rows.map(u => u.lokaal).filter(Boolean))]; const verschil = roosterVerschil(); const klassen = new Set(rows.map(u => u.groep)).size;
  const stand = !ZC ? 'zelf ingevuld' : verschil ? 'Zermelo wijkt af' : zVastRooster().length ? 'klopt met Zermelo' : '';
  let h = `<div class="kop"><div><h1>Rooster</h1><div class="sub">${rows.length ? [`${rows.length} ${rows.length === 1 ? 'les' : 'lessen'}`, `${klassen} ${klassen === 1 ? 'klas' : 'klassen'}`, lok.length === 1 ? 'alles in ' + esc(lok[0]) : '', stand].filter(Boolean).join(' · ') : 'Je vaste week. Zermelo vult die vanzelf zodra je gekoppeld bent.'}</div></div></div>`;
  h += verschil;
  if (rows.length) h += `<div class="kaart">${roosterRaster(rows)}${Object.entries(MEE_MET).filter(([, v]) => rows.some(u => u.groep === v)).map(([m, v]) => `<p class="sub ro-noot">${esc(m)} draait mee met ${esc(v)}. De toetsen van ${esc(m)} staan op <a href="${esc(klasUrl(m))}">het klasblad van ${esc(m)}</a>.</p>`).join('')}</div>`;
  h += roosterAfwijkingen() + eenmaligKaart();
  const open = jaarBlok.rooster != null ? jaarBlok.rooster : !rows.length;
  h += `<details class="kaart ro-zelf" data-jaarblok="rooster"${open ? ' open' : ''}><summary>Zelf een lesuur toevoegen of weghalen</summary>
    ${rows.length ? `<div class="scroll"><table><tr><th>Dag</th><th>Van</th><th>Tot</th><th>Groep</th><th>Lokaal</th><th></th></tr>${rows.map(u => `<tr><td>${esc(DAGLANG[u.dag])}</td><td class="num">${esc(u.start)}</td><td class="num">${esc(u.eind)}</td><td><b>${esc(u.groep)}</b></td><td>${esc(u.lokaal || '')}</td><td><button class="btn klein rood" data-weg="${esc(u.id)}">weg</button></td></tr>`).join('')}</table></div>` : ''}
    <form class="form" id="rForm"><div class="rij">
    <label>Dag <select id="rDag">${[1, 2, 3, 4, 5].map(d => `<option value="${d}">${DAGLANG[d]}</option>`).join('')}</select></label>
    <label>Van <input id="rVan" type="time" required value="08:30"></label>
    <label>Tot <input id="rTot" type="time" required value="09:15"></label>
    <label>Groep <input id="rGroep" list="groeplijst" required placeholder="bijv. h3a"></label>
    <label>Lokaal <input id="rLok" list="lokalen" value="009" placeholder="009"></label>
    <button class="btn hoofd" type="submit">Toevoegen</button></div>
    <datalist id="groeplijst">${opties.map(x => `<option value="${esc(x.g)}">${esc(lgNaam(x.lg))}</option>`).join('')}</datalist><datalist id="lokalen"><option value="009"><option value="020"></datalist>
    <p class="lead" style="font-size:.9rem">Een andere groep kan ook; koppel die daarna aan een leergang op het klasblad onder Jaar.</p></form></details>`;
  return h;
}

/* ---------- sectie ---------- */
function sectieItems() { return (B.sectie || []).concat(S.sectieExtra || []).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0); }
const fmtDJ = d => fmtD(d) + (Math.abs(dOf(d) - dOf(vandaag())) > 300 * 864e5 ? ' ' + d.slice(0, 4) : ''); // ver weg: met jaartal
const sEigen = id => (S.sectieExtra || []).find(x => x.id === id); // zelf toegevoegd: wijzigen en weghalen mag
function sRij(i) {
  const t = vandaag(); const af = i.taak && S.sectieAf[i.id]; const laat = i.taak && !af && i.d < t; const eigen = !!sEigen(i.id);
  if (eigen && sBewerk === i.id) return `<form class="srij form" id="sEdit" data-id="${esc(i.id)}"><span class="dt">${esc(fmtDJ(i.d))}</span><div class="rij"><label style="flex:3 1 14rem">Wat <input id="seT" required value="${esc(i.titel)}"></label><label>Datum <input id="seD" type="date" required value="${esc(i.d)}"></label><label>Rol <select id="seR">${rolOpties(rolVanSectie(i))}</select></label><label>Potje <select id="seP">${potOpties(i.potje || '')}</select></label><button class="btn hoofd klein" type="submit">Opslaan</button><button class="btn klein" type="button" data-sbewerk="">Annuleer</button></div></form>`;
  return `<div class="srij ${laat ? 'laat' : ''} ${af ? 'af' : ''}"><span class="dt">${esc(fmtDJ(i.d))}${i.tot ? ' – ' + esc(fmtDJ(i.tot)) : ''}${i.tijd ? '<br>' + esc(i.tijd) : ''}</span><div>${i.taak ? `<label class="chk"><input type="checkbox" data-sdone="${esc(i.id)}" ${af ? 'checked' : ''}><span>${esc(i.titel)}</span></label>` : `<b style="font-family:var(--lees)">${esc(i.titel)}</b>`}${i.info ? `<div class="vorige" style="border:0;padding:0">${esc(i.info)}</div>` : ''}${S.sectieNotitie[i.id] ? `<div class="vorige">✎ ${esc(S.sectieNotitie[i.id])}</div>` : ''}${eigen ? `<div class="knoppen" style="margin-top:.3rem"><button class="btn klein" type="button" data-sbewerk="${esc(i.id)}">wijzig</button><button class="btn klein" type="button" data-sweg="${esc(i.id)}">weg</button></div>` : ''}</div></div>`;
}
function sTaakFout(titel, d, oud) { // lege tekst of een datum die al voorbij is: niet opslaan
  if (!titel) return 'Typ wat de taak is.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) return 'Kies een datum.';
  if (d < vandaag() && d !== oud) return `${cap(fmtDJ(d))} is al voorbij. Kies vandaag of een dag die nog komt.`;
  return '';
}
let sAlles = false, sBewerk = '';
/* Handelingsdelen en onderhoud: alleen links naar SharePoint en Forms (geen koppeling, geen namen in Lesdag) */
const HD_LINKS = (() => {
  const vm = 'https://studentcsgpm.sharepoint.com/sites/VakgroepMuziek/Lists/MeldingenInstrumenten/';
  const hd = 'https://studentcsgpm.sharepoint.com/Sectie%20Muziek/Lists/Handelingsdeel%204%2020262027/AllItems.aspx';
  return {
    hoofd: [['Bord meldingen', vm + 'Bord%20per%20status.aspx'], ['Lijst Handelingsdeel 4', hd],
      ['Resultaten Forms', 'https://forms.cloud.microsoft/Pages/DesignPageV2.aspx?subpage=design&id=6jlsN-pIK0SlIWuX5D5o5rn3J0sJj0FNh0fuBL0Hhh5UNlFEMkUzWjIxVlBLMTI5WVI1MVMxUTBBSy4u&analysis=true']],
    filter: [['open meldingen', vm + 'AllItems.aspx?FilterFields1=Status&FilterValues1=Nieuw%3B%23Toegewezen%3B%23Gestopt&FilterTypes1=Choice'],
      ['verlopen deadlines', vm + 'AllItems.aspx?FilterField1=Status&FilterValue1=Toegewezen&FilterType1=Choice&FilterField2=TeLaatGemeld&FilterValue2=1&FilterType2=Boolean'],
      ['nog niet gekozen', hd + '?FilterFields1=field_6&FilterValues1=Nog%20kiezen%3B%23Kies%20%C3%A9%C3%A9n&FilterTypes1=Choice'],
      ['klaar om af te tekenen', hd + '?FilterField1=field_6&FilterValue1=Klaar%20om%20af%20te%20tekenen&FilterType1=Choice']]
  };
})();
function hdKaart() {
  const a = ([t, u], k) => `<a class="btn${k ? ' klein' : ''}" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;
  return `<div class="kaart" style="margin-bottom:1rem"><h2>Handelingsdelen en onderhoud</h2><div class="knoppen">${HD_LINKS.hoofd.map(l => a(l)).join('')}</div><div class="knoppen" style="margin-top:.5rem"><span class="sub">Direct naar:</span>${HD_LINKS.filter.map(l => a(l, 1)).join('')}</div></div>`;
}
function viewSectie() {
  const t = vandaag(); const it = sectieItems();
  const open = it.filter(i => i.taak && !S.sectieAf[i.id]);
  const lijst = sAlles ? it : it.filter(i => (i.tot || i.d) >= addD(t, -7) && i.d <= addD(t, 42) || (i.taak && !S.sectieAf[i.id] && i.d < t));
  return `<div class="kop"><div><h1>Sectie</h1><div class="sub">${open.length} open taken · vergaderingen, rapporten, toetsweken en taken uit de jaarplanning</div></div><div class="knoppen"><button class="btn" data-salles="" aria-pressed="${sAlles}">hele jaar</button></div></div>
  ${hdKaart()}
  <div class="kaart">${lijst.map(sRij).join('') || '<p class="leeg">Niets in deze periode.</p>'}</div>
  <form class="kaart form" id="sForm"><h2>Taak toevoegen</h2><div class="rij"><label style="flex:3 1 16rem">Wat <input id="sT" required></label><label>Datum <input id="sD" type="date" required value="${t}"></label><select id="sR" aria-label="Rol">${rolOpties('', 'vakgroep')}</select><select id="sP" aria-label="Potje">${potOpties('', '')}</select><button class="btn hoofd" type="submit">Toevoegen</button></div></form>`;
}

/* ---------- Team vwo 4-5-6 (stap 2 van handboek/voorstel-rollen.md) ----------
   Alleen data en titels uit de algemene jaarplanning (B.team), plus de afspraken uit de sectieplanning met rol team (mentorenoverleg).
   Een item kan een eigen rol hebben: ontwikkeldagen bij professional, excursies en overgangsvergaderingen bij docent. Geen namen van leerlingen of collega's en geen inhoud van gesprekken. Wat er uit de mail van de teamleider bij hoort,
   zet Frans zelf bij een afspraak (S.sectieNotitie, alleen in de eigen staat). */
let tAlles = false;
/* toelichting per stap uit de handleiding gesprekkencyclus (web.csgpm.nl/handleidingen/gesprekkencyclus_uitgebreid.htm), de Regeling gesprekkencyclus (1-8-2022), de Uitwerking voor onderwijsgevend personeel (1-8-2024), de Tijdlijn en de lijst Gespreksdocumenten */
const GC = 'https://web.csgpm.nl/gesprekkencyclus/', GC_HANDLEIDING = 'https://web.csgpm.nl/handleidingen/gesprekkencyclus_uitgebreid.htm';
const IPB_V = 2; // verhoog bij nieuwe teksten: open IPB-taken van een oudere versie krijgen dan de nieuwe toelichting
const IPB_STAPPEN = [
  { titel: 'IPB: PDCA-actieplan bijwerken', url: GC + 'gesprekkencyclus_pdca.php',
    notitie: 'Na het startgesprek zet je één of twee ontwikkelafspraken in je PDCA, voor hooguit twee schooljaren, elk gekoppeld aan SBP, teamplan, vakwerkplan of inspectiekader. Bij Check staat welke bronnen gebruikt worden voor de beoordeling. Twee weken vóór een voortgangsgesprek schrijf je in het PDCA een tussenrapportage. Waar: Mijn documenten > knop PDCA. Rechtsboven in de blauwe of rode balk staat tot wanneer je kunt uploaden. Kies Opslaan als PDF in de map met gespreksdocumenten (daarna niet meer te wijzigen). De teamleider geeft akkoord op het actieplan.' },
  { titel: 'IPB: lesbezoek plannen', url: GC + 'gesprekkencyclus_algemene_documenten.php',
    notitie: 'Vóór het startgesprek en vóór het beoordelingsgesprek bezoekt de teamleider een les. Spreek een les af. De teamleider kijkt met de kijkwijzer van de afdeling (lesobservatieformulier vwo, havo of mavo onder Algemene documenten) en zet de ingevulde kijkwijzer bij het gesprek; je krijgt daarvan een mail. In je voorbereidingsformulier geef je aan hoe jij de kijkwijzer beoordeelt.' },
  { titel: 'IPB: leerlingenquête afnemen', url: GC + 'gesprekkencyclus_mijn_documenten.php',
    notitie: 'Vóór het startgesprek en vóór het beoordelingsgesprek zet je, in overleg met de teamleider, bij twee klassen een leerlingenquête uit via de kwaliteitsfunctionaris (KU). De uitslag komt naar jou; jij zet beide enquêtes zelf bij het gesprek: Mijn documenten > kies het gesprek > Upload document > Ingevulde leerlingen enquêtes. Begin op tijd: de voorbereiding moet een week voor het gesprek klaar zijn. De cijferrapportage (Magister en MMP) zetten de datacoaches erbij.' },
  { titel: 'IPB: gesprek met de teamleider voorbereiden', url: GC + 'gesprekkencyclus_mijn_documenten.php',
    notitie: 'Uiterlijk een week voor het gesprek klaar. Mijn documenten > kies het gesprek > knop Vragenlijst; kies onderaan Opslaan als PDF in de map met gespreksdocumenten. Bij een startgesprek hoeven niet alle vragen; lees de strategische plannen (Focus SBP) en kijk naar enquêtes, kijkwijzer en cijferrapportage. Bij een beoordelingsgesprek zijn de vragen met een * verplicht: afspraken uitgevoerd, PDCA ingevuld, welke bronnen, en jouw oordeel over enquêtes, kijkwijzer en cijfers. Eigen bewijs (bijvoorbeeld van je ontwikkeldoelen) zet je erbij als Overig document. Een gesprek duurt minstens een uur.' },
  { titel: 'IPB: beschouwing of beoordeling lezen en akkoord geven', url: GC + 'gesprekkencyclus_mijn_documenten.php',
    notitie: 'Na een voortgangsgesprek met formele beschouwing, of na het beoordelingsgesprek, zet de teamleider een gedateerd verslag online; je krijgt een mail. Teken binnen een week digitaal voor gezien in Mijn documenten (Akkoord doc). Ben je het niet eens met een beoordeling: beroep kan schriftelijk bij de voorzitter van het CvB, binnen vier weken.' }
];
function teamItems() { return (B.team || []).concat((B.sectie || []).filter(i => rolVanSectie(i) === 'team')).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0); }
function ipbZet() { // de vaste stappen van de IPB-cyclus als eigen taken bij Professional (IPB-gesprekken tellen als deskundigheidsbevordering); wat al open staat komt er niet dubbel bij, maar krijgt de toelichting als die ontbreekt of van een oudere versie is
  let n = 0, aangevuld = 0;
  IPB_STAPPEN.forEach(s => {
    const open = (S.taken || []).find(k => k.titel === s.titel && !k.af);
    if (open) { if (!open.notitie || (open.ipbV || 1) < IPB_V) { open.notitie = s.notitie; open.url = open.url || s.url; open.ipbV = IPB_V; aangevuld++; } return; }
    const k = maakTaak('', null, s.titel, 'overig'); if (k) { k.notitie = s.notitie; k.url = s.url; k.ipbV = IPB_V; zetRol(k, { rol: 'prof', potje: '' }); n++; }
  });
  return { n, aangevuld };
}
function viewTeam() {
  const t = vandaag(); const it = teamItems(); const lijst = tAlles ? it : it.filter(i => (i.tot || i.d) >= addD(t, -7) && i.d <= addD(t, 63));
  const ipb = (S.taken || []).filter(k => /^IPB:/.test(k.titel) && !k.af); const rs = rolStijl('team');
  const rij = i => `<div>${sRij(i)}<details class="meer" style="margin:-.2rem 0 .5rem"><summary>${S.sectieNotitie[i.id] ? 'Notitie wijzigen' : 'Notitie uit de mail erbij'}</summary><textarea rows="2" data-teamnoot="${esc(i.id)}" aria-label="Notitie bij ${esc(i.titel)}" placeholder="Wat er van je gevraagd wordt. Geen namen van leerlingen.">${esc(S.sectieNotitie[i.id] || '')}</textarea></details></div>`;
  return `<div class="kop"><div><h1>Team vwo 4-5-6</h1><div class="sub">${rs.naam ? esc(rs.naam) + ' · ' : ''}teamvergaderingen, dagen voor v456 en andere data uit de algemene jaarplanning; elke afspraak met zijn eigen rol</div></div><div class="knoppen"><button class="btn" data-talles="" aria-pressed="${tAlles}">hele jaar</button></div></div>
  <div class="kaart">${lijst.map(rij).join('') || '<p class="leeg">Niets in deze periode.</p>'}</div>
  <div class="kaart"><h2>IPB-cyclus</h2><p class="lead">De vaste stappen: PDCA-actieplan bijwerken, lesbezoek, leerlingenquête, het gesprek voorbereiden en daarna akkoord geven op beschouwing of beoordeling. De cyclus (startgesprek, voortgangsgesprek met formele beschouwing, beoordelingsgesprek) loopt minstens eens per twee jaar; bij het startgesprek hoort ook een VO-spiegel van de teamleider. Zet ze in je takenlijst en plan ze vanuit Dag. Ze staan bij Professional: een IPB-gesprek telt als deskundigheidsbevordering, ook als het team het organiseert. De inhoud van het gesprek komt niet in Lesdag. Elke stap krijgt de uitleg uit de <a href="${GC_HANDLEIDING}" target="_blank" rel="noopener">handleiding gesprekkencyclus</a> en de <a href="${GC}gesprekkencyclus_algemene_documenten.php" target="_blank" rel="noopener">uitwerking gesprekkencyclus</a>, met een link naar de juiste pagina.</p>
    ${ipb.length ? `<p class="sub">Open: ${ipb.map(k => esc(k.titel.replace(/^IPB: /, ''))).join(', ')}.</p>` : ''}<div class="knoppen" style="margin-top:.5rem"><button class="btn hoofd" data-ipbzet="">IPB-stappen in je takenlijst</button><a class="btn" href="#vandaag">Naar Dag</a></div></div>`;
}

/* ---------- synchroniseren tussen apparaten (sync.js) ---------- */
const SYNC_VLAG = 'lesdag-sync-aan';
let syncUit = '';
function syncDoc() { const { updated, ...d } = S; const t = zApiToken(); if (t) d._zermeloApi = t; return d; } // de Zermelo-koppeling staat buiten S maar gaat wel mee
function syncZet(d) {
  const { _zermeloApi: t, ...rest } = d; const upd = S.updated; const had = zGekoppeld();
  S = Object.assign(nieuweStaat(), rest); S.beoord = Object.assign({ lijsten: {}, toetsen: {} }, S.beoord); S.updated = upd;
  roosterOpruimen(); // twee apparaten die apart overnamen geven na samenvoegen dubbele lesuren
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); if (t) localStorage.setItem(Z_API, t); else localStorage.removeItem(Z_API); opslagMelding(null); } catch (e) { opslagMelding(e); }
  if (!had && zGekoppeld() && zProxy() && navigator.onLine) zOphalen(false);
  const a = document.activeElement; if (B && !LES && !PAL && !(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) render();
}
function syncMag() { const a = document.activeElement; return !LES && !PAL && !NW && !AGD && !bmStreep && route.naam !== 'regie' && !(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) && !$('#drawer').classList.contains('open'); } // tijdens lesmodus, typen of een open paneel wacht het
function syncStatus(st, txt) { setSync(st, txt); $('#synclogin').hidden = !/login/.test(st); const el = $('#syncTekst'); if (el) el.textContent = txt; }
function syncStart() {
  if (!window.SYNC) return;
  SY = SYNC.maak({ fetch: (u, i) => fetch(u, i), opslag: SYNC.idbOpslag(), slot: navigator.locks ? fn => navigator.locks.request('lesdag-sync', fn) : null,
    vlag: { aan: () => { try { return localStorage.getItem(SYNC_VLAG) === '1'; } catch (e) { return false; } }, zet: () => { localStorage.setItem(SYNC_VLAG, '1'); } },
    app: { haal: syncDoc, zet: syncZet, mag: syncMag, status: syncStatus, nieuwer: ms => (S.updated || 0) > ms, kopie: async () => { $('#opslagfout [data-export]').click(); }, fouten: staatFouten } });
  SY.start().then(() => { if (route.naam === 'instellingen' && !PAL) render(); });
  setInterval(() => { if (!document.hidden) SY.nu(); }, 60000);
  window.addEventListener('online', () => SY.nu());
  document.addEventListener('visibilitychange', () => { SY.nu(document.hidden); });
}
function syncKaart() {
  if (!SY) return '';
  const uit = syncUit ? `<div style="margin-top:.6rem">${syncUit}</div>` : '';
  if (!SY.aan()) return `<div class="kaart"><h2>Synchroniseren</h2><p class="lead">Taken, afspraken, planning, klassenlijsten, scores en de Zermelo-koppeling op al je apparaten. De eerste keer downloadt Lesdag een kopie, voegt samen met wat er al op de server staat en controleert het resultaat. Verjaardagen, absenten en logboeknotities blijven op dit apparaat.</p><div class="knoppen"><button class="btn hoofd" data-syncaan="">Synchroniseren aanzetten</button></div>${uit}</div>`;
  return `<div class="kaart"><h2>Synchroniseren</h2><p class="lead">Staat aan. Taken, afspraken, planning, klassenlijsten, scores en de Zermelo-koppeling gaan vanzelf mee. Verjaardagen, absenten en logboeknotities blijven op dit apparaat.</p><p class="sub" id="syncTekst">${esc($('#sync span').textContent)}</p><div class="knoppen"><button class="btn" data-syncnu="">Nu synchroniseren</button><button class="btn" data-syncback="">Back-ups</button></div>${uit}</div>`;
}
const syncRegel = (n, x) => `${n}: ${x.taken} taken, ${x.rooster} lesuren, ${x.klassen} klassenlijsten, ${x.toetsen} toetsen`;
async function syncKlik(D) {
  if (D.syncnu != null) { await SY.nu(); toast(syncState === 'ok' ? 'Gesynchroniseerd' : 'Synchroniseren lukt nu niet'); return true; }
  if (D.syncaan != null) {
    if (!confirm('Je gegevens gaan naar de Lesdag-server achter je login, ook klassenlijsten, scores en de Zermelo-koppeling. Eerst downloadt Lesdag een kopie. Doorgaan?')) return true;
    try { const u = await SY.aanzetten(); syncUit = `<p class="sub">${syncRegel('Dit apparaat had', u.hier)}.<br>${syncRegel('De server had', u.server)}.<br><b>${syncRegel('Nu overal', u.samen)}.</b></p>`; toast('Synchroniseren staat aan'); }
    catch (e) { SY.meld(e); syncUit = `<p class="sub">Dat lukte niet: ${esc($('#sync span').textContent)}. Er is niets veranderd op dit apparaat.</p>`; }
    render(); return true;
  }
  if (D.syncback != null) {
    try { const L = await SY.backups(); syncUit = L.length ? `<p class="sub">Terugzetten vervangt de staat op al je apparaten.</p><div class="knoppen">${L.map(d => `<button class="btn klein" data-syncdag="${esc(d)}">${d === 'eerste' ? 'Eerste upload' : esc(d)}</button>`).join('')}</div>` : '<p class="sub">Nog geen back-ups.</p>'; }
    catch (e) { SY.meld(e); syncUit = '<p class="sub">Back-ups zijn nu niet bereikbaar.</p>'; }
    render(); return true;
  }
  if (D.syncdag != null) {
    if (!confirm(`Back-up ${D.syncdag} terugzetten op al je apparaten?`)) return true;
    try { const terug = foto(); syncZet(await SY.backup(D.syncdag)); bewaar(); syncUit = ''; toast('Back-up teruggezet', terug); }
    catch (e) { SY.meld(e); toast('Terugzetten lukt nu niet'); }
    return true;
  }
  return false;
}

/* ---------- agendafeed: Lesdag in Outlook ----------
   Een lijst toegestane punten (agendaItems), als iCal naar /api/agenda; de worker lesdag-agenda geeft die aan Outlook via een geheime link.
   Alleen wat hier expliciet staat gaat mee. Eigen taken en afspraken niet: daar kan vrije tekst met namen in staan. Notities en leerlinggegevens nooit.
   Eén apparaat werkt de feed bij (de vlag staat per apparaat): zonder synchroniseren zou een apparaat zonder rooster de agenda anders leegmaken. */
const AGF_VLAG = 'lesdag-agendafeed'; let AGF = null;
const AGF_DAGEN = { terug: 14, vooruit: 42 };
function agendaItems() {
  const t = vandaag(), a = addD(t, -AGF_DAGEN.terug), b = addD(t, AGF_DAGEN.vooruit), P = planning(a, b), uit = [];
  for (let s = a; s <= b; s = addD(s, 1)) {
    const p = P[s]; if (!p) continue; const A = dagItems(s, p);
    for (const it of A.items.concat(A.heleDag)) {
      const k = it.key, uid = s + ':' + k; let v = it.van != null ? it.van : null, w = it.tot != null ? it.tot : null, titel = it.titel, lokaal = it.lokaal || '';
      if (/^les:/.test(k)) { if (it.soort !== 'les' && it.soort !== 'klaar') continue; const sub = it.sub && it.sub !== 'alles gegeven' ? it.sub : ''; titel = it.titel + (sub ? ': ' + sub : ''); }
      else if (/^z:/.test(k)) { v = it.z.van; w = it.z.tot; if (it.z.dienst) titel = 'Surveillance: ' + titel; else if (it.z.toets && !it.tz) titel = 'Toets: ' + titel; }
      else if (/^tw:/.test(k)) { /* toets zonder tijd: hele dag */ }
      else if (/^koor:/.test(k)) { if (it.soort !== 'koor') continue; const kr = it.koor; v = kr.van ? minuten(kr.van) : null; w = kr.tot ? minuten(kr.tot) : null; titel = koorNaam(kr) + (kr.type === 'concert' ? '' : ': ' + kr.titel); lokaal = kr.plaats || ''; }
      else if (/^sectie:/.test(k)) { const i = it.i; if (sEigen(i.id)) continue; /* zelf getypte sectiepunten zijn vrije tekst, net als eigen taken */ titel =(i.taak ? 'Sectie, deadline: ' : '') + i.titel; const tm = !i.taak && !i.tot ? sectieTijd(i) : null; v = tm ? tm.van : null; w = tm ? tm.tot : null; lokaal = ''; }
      else continue; // koffie, vrij, pauze, rust, eigen taken en afspraken, reclame
      uit.push({ uid, d: s, van: v, tot: w, titel, lokaal });
    }
  }
  return uit;
}
const agfCfg = () => (window.LESDAG_CONFIG || {}).agendaFeed || '';
const agfAan = () => { try { return localStorage.getItem(AGF_VLAG) === '1'; } catch (e) { return false; } };
const agfLink = () => AGF && AGF.token ? agfCfg() + '/' + AGF.token + '.ics' : '';
async function agfApi(method, body) {
  const r = await fetch('/api/agenda', { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  if (!r.ok) throw new Error(r.status || 'login');
  return r.json();
}
async function agendaBij(forceer) { // true als er iets is verstuurd
  if (!agfAan() || !navigator.onLine) return false;
  const punten = agendaItems(); if (!punten.length) return false; // nooit een lege agenda over een goede heen zetten
  const inhoud = JSON.stringify(punten); let oud = null; try { oud = localStorage.getItem(AGF_VLAG + '-stand'); } catch (e) {}
  if (!forceer && oud === inhoud) return false;
  const st = await agfApi('PUT', { ics: AGENDAFEED.ics(punten, Date.now()) });
  AGF = Object.assign(AGF || {}, st, { punten: punten.length });
  try { localStorage.setItem(AGF_VLAG + '-stand', inhoud); } catch (e) {}
  return true;
}
function agendaStart() {
  if (!agfCfg()) return;
  const beurt = () => { if (agfAan() && !document.hidden && syncMag()) agendaBij(false).catch(() => {}); };
  setTimeout(beurt, 20000); setInterval(beurt, 10 * 60000);
}
function agendaKaart() {
  if (!agfCfg()) return '';
  const wat = '<p class="lead">Lessen, toetsen, surveillance, koor en sectiepunten van twee weken terug tot zes weken vooruit, als eigen agenda in Outlook. Eigen taken, afspraken, notities en leerlinggegevens gaan niet mee. Alleen lezen; een wijziging staat vaak pas na enkele uren in Outlook.</p>';
  if (!agfAan()) return `<div class="kaart"><h2>Agenda in Outlook</h2>${wat}<div class="knoppen"><button class="btn hoofd" data-agf="maak">Agendalink maken</button></div></div>`;
  if (!AGF) { AGF = { laden: true }; agfApi('GET').then(st => { AGF = st; }).catch(() => { AGF = { fout: true }; }).then(() => { if (route.naam === 'instellingen' && !PAL) render(); }); }
  const stand = AGF.laden ? 'Even kijken…' : AGF.fout ? 'De agenda is nu niet bereikbaar.' : `Bijgewerkt: ${esc(new Date(AGF.bijgewerkt).toLocaleString('nl-NL'))}${AGF.punten ? ', ' + AGF.punten + ' punten' : ''}.`;
  return `<div class="kaart"><h2>Agenda in Outlook</h2>${wat}<p class="lead">Dit apparaat werkt de agenda bij als Lesdag open staat. Toevoegen in Outlook op het web: Agenda, Agenda toevoegen, Abonneren via internet, link plakken. Behandel de link als een wachtwoord: wie hem heeft, ziet deze agenda.</p><p class="sub">${stand}</p><div class="knoppen"><button class="btn hoofd" data-agf="kopie">Link kopiëren</button><button class="btn" data-agf="nu">Nu bijwerken</button><button class="btn" data-agf="nieuw">Nieuwe link</button><button class="btn" data-agf="stop">Stoppen</button></div></div>`;
}
async function agendaKlik(D) {
  if (D.agf == null) return false;
  try {
    if (D.agf === 'maak') { const st = await agfApi('GET'); AGF = st.aan ? st : await agfApi('POST'); localStorage.setItem(AGF_VLAG, '1'); await agendaBij(true); toast('Agendalink staat klaar'); }
    else if (D.agf === 'kopie') { if (!agfLink()) AGF = await agfApi('GET'); await navigator.clipboard.writeText(agfLink()); toast('Link gekopieerd'); }
    else if (D.agf === 'nu') { await agendaBij(true); toast('Agenda bijgewerkt'); }
    else if (D.agf === 'nieuw') { if (!confirm('Nieuwe link maken? De oude werkt dan niet meer: je moet in Outlook opnieuw abonneren.')) return true; AGF = await agfApi('POST'); await agendaBij(true); toast('Nieuwe link staat klaar'); }
    else if (D.agf === 'stop') { if (!confirm('Agenda stoppen? De link werkt dan niet meer. Verwijder de agenda ook zelf uit Outlook.')) return true; await agfApi('DELETE'); localStorage.removeItem(AGF_VLAG); localStorage.removeItem(AGF_VLAG + '-stand'); AGF = null; toast('Agenda gestopt'); }
  } catch (e) { toast('Dat lukt nu niet. Ben je nog ingelogd?'); }
  render(); return true;
}

/* ---------- instellingen ---------- */
function viewInstellingen() {
  const on = M365.enabled(); const acc = M365.account;
  return `<div class="kop"><div><h1>Instellingen</h1></div></div>
  ${syncKaart()}${agendaKaart()}<div class="kaart"><h2>Lesklok en opruimsignaal</h2><p class="lead">Zolang een les loopt, staat de resttijd bovenin elk scherm. Vier minuten voor het einde van het rooster komt het signaal. Probeer hier hoe het eruitziet en of het geluid hard genoeg is.</p><div class="knoppen"><button class="btn" data-lkproef="">Proef het signaal</button></div></div>${on ? `<div class="kaart"><h2>Microsoft 365</h2>${!on ? `<p class="lead">Nog niet gekoppeld. Zet de gegevens van de app-registratie in <code>config.js</code> (zie LEESMIJ.md). Tot die tijd blijft alles op dit apparaat.</p>` : acc ? `<p>Ingelogd als <b>${esc(M365.naam)}</b>. Je gegevens staan ook in je OneDrive, in de map Apps.</p><div class="knoppen"><button class="btn" data-sync="">Nu synchroniseren</button><button class="btn" data-logout="">Uitloggen</button></div>` : `<p class="lead">Log in met je schoolaccount om je gegevens in OneDrive te bewaren en presentaties uit SharePoint te koppelen.</p><button class="btn hoofd" data-login="">Inloggen met schoolaccount</button>`}</div>` : ''}
  <div class="kaart"><h2>Rooster uit Zermelo</h2>${zProxy() ? `<p class="lead">Maak in Zermelo een koppelcode aan (Koppelingen, Koppel externe applicatie) en plak die hier. Lesdag leest dan vak, groep, lokaal en soort afspraak rechtstreeks uit Zermelo. De koppeling gaat mee met synchroniseren. Verwijderen hier trekt hem niet in: dat doe je in Zermelo bij Koppelingen.</p>
    <form class="form" id="zKoppelForm"><div class="rij"><label style="flex:3 1 18rem">Koppelcode <input id="zCode" type="password" autocomplete="off" placeholder="${zApiToken() ? 'gekoppeld' : '12 cijfers'}"></label><button class="btn hoofd" type="submit">Koppelen</button>${zApiToken() ? '<button class="btn rood" type="button" data-zapiweg="">Koppeling verwijderen</button>' : ''}</div></form>
    <p class="lead">Reserve: als de koppeling niet werkt, gebruikt Lesdag je agendalink. Plak je Zermelo-agendalink (Zermelo portal, Koppelingen, Agenda). Lesdag haalt dan je rooster op, met roosterwijzigingen en vervallen lessen. Behandel de link als een wachtwoord: wie hem heeft, ziet je rooster.</p>
    <form class="form" id="zForm"><div class="rij"><label style="flex:3 1 18rem">Zermelo-link <input id="zLink" type="password" autocomplete="off" placeholder="${S.zermeloToken ? 'opgeslagen (••••' + esc(S.zermeloToken.slice(-4)) + ')' : 'https://csgpm.zportal.nl/api/v3/ical?access_token=…'}"></label><button class="btn hoofd" type="submit">Opslaan en ophalen</button>${zGekoppeld() ? '<button class="btn" type="button" data-zophalen="">Nu ophalen</button>' : ''}${S.zermeloToken ? '<button class="btn rood" type="button" data-zweg="">Link verwijderen</button>' : ''}</div></form>
    <p class="lead" style="font-size:.9rem">${ZC ? `Laatst opgehaald: ${esc(new Date(ZC.opgehaald).toLocaleString('nl-NL'))}, voor ${esc(fmtD(ZC.van))} tot en met ${esc(fmtD(ZC.tot))}, via ${ZC.bron === 'api' ? 'de koppeling' : 'de agendalink'}.` : 'Nog niet opgehaald.'}</p>${zOverzicht()}` : `<p class="lead">De roosterproxy staat nog niet in <code>config.js</code>. Zie LEESMIJ.md, stap 3.</p>`}</div>
  ${rolKaart()}${duurKaart()}
  <div class="kaart"><h2>Pauzes</h2><p class="lead">${(zPauzes() || { vast: [] }).vast.length ? 'Uit je rooster in Zermelo: ' + esc(zPauzes().vast.map(p => hm(p.van) + '–' + hm(p.tot)).join(', ')) + '.' : ZC ? 'In je rooster vond Lesdag geen vaste pauzes.' : 'Zodra Zermelo gekoppeld is, haalt Lesdag je pauzes uit je rooster.'} Lesdag houdt ze vrij: er komen geen taken in, en het Nu-scherm laat dan niets over werk zien. Valt een pauze weg (pauzedienst, koor, Sing-In), dan houdt Lesdag later op de dag een rustblok vrij. Nooit in een les.</p>
    <details class="meer" style="margin-top:.6rem" ${(S.pauzes || []).length ? 'open' : ''}><summary>Kloppen ze niet? Zelf invullen (gaat voor het rooster)</summary>
    <form class="form" id="pzForm" style="margin-top:.6rem">${(S.pauzes || []).concat([{ van: '', tot: '' }]).map((p, i) => `<div class="rij"><label>Van<input type="time" name="van" value="${p.van ? esc(p.van.padStart(5, '0')) : ''}"></label><label>Tot<input type="time" name="tot" value="${p.tot ? esc(p.tot.padStart(5, '0')) : ''}"></label>${p.van ? `<button class="btn klein" type="button" data-pzweg="${i}">weg</button>` : ''}</div>`).join('')}
    <div class="knoppen"><button class="btn hoofd" type="submit">Pauzes opslaan</button></div></form></details></div>
  <div class="kaart"><h2>Magister</h2><p class="lead">Lesdag kijkt niet in Magister en tikt er niets in; een open koppeling is er niet. Lesdag onthoudt per les de presentie, het huiswerk en het logboek, zet de tekst klaar en opent Magister met één tik. Een oker stip op een les: er moet nog iets in Magister. Groen: de les is rond.</p>
    <div class="knoppen" style="margin-top:.6rem"><button class="btn mag" data-kompas="">Kompas naast Magister</button><a class="btn" href="${esc(MAGURL())}" target="magister" rel="noopener">Open Magister</a></div>
    <p class="sub" style="margin-top:.5rem">Klassenlijsten: ${rooGroepen().map(g => `<button class="btn klein" data-klasopen="${esc(g)}">${esc(g)} ${(S.beoord.lijsten[g] || []).length || 'nog niet'}</button>`).join(' ') || 'nog geen rooster'}</p></div>
  <div class="kaart"><h2>Jarige collega's</h2><p class="lead">Plak de verjaardagen van het intranet: één collega per regel met de datum, bijvoorbeeld "12 november Jan Jansen". Lesdag haalt daar zelf niets op. De lijst staat alleen op dit apparaat. Op de dag zelf staat de collega bij Opstarten, met een knop voor een felicitatie in Outlook.</p>
    <textarea id="colLijst" aria-label="Verjaardagen van collega's, een per regel" rows="6" style="margin-top:.6rem" placeholder="12 november Jan Jansen">${esc((AP.collegas || []).map(c => mdTekst(c.md) + ' ' + c.naam + (c.mail ? ' ' + c.mail : '')).concat(colMis.map(x => x.r)).join('\n'))}</textarea>
    <div class="knoppen" style="margin-top:.5rem"><button class="btn hoofd" data-colopslaan="">Opslaan op dit apparaat</button><a class="btn" href="https://web.csgpm.nl/home/index.php" target="_blank" rel="noopener">Intranet openen</a></div>
    <p class="sub" style="margin-top:.5rem">${(AP.collegas || []).length ? `${AP.collegas.length} collega's op dit apparaat.` : 'Nog geen lijst.'}</p>
    ${colMis.length ? `<div class="melding" id="colMis" style="margin-top:.5rem"><b>Niet opgeslagen.</b> Ze staan nog onderaan de lijst: zet er een datum bij die bestaat en sla opnieuw op, of haal ze weg.<ul style="margin:.3rem 0 0 1.1rem">${colMis.map(x => `<li>${esc(x.r)}: ${esc(x.w)}</li>`).join('')}</ul></div>` : ''}</div>
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
function openTaakBewerk(id) {
  const k = (S.taken || []).find(x => x.id === id); if (!k) return; const d = $('#drawer'); const P = k.plan || {}; const tijd = t => t ? t.padStart(5, '0') : '';
  d.innerHTML = `<div class="dkop"><h2>${k.afspraak ? 'Afspraak' : 'Taak'} aanpassen</h2><button class="btn" data-sluit="">Sluiten</button></div>
  <form class="form" id="kForm">
    <label>Wat is het? <select name="soort" id="kSoort"><option value="taak"${k.afspraak ? '' : ' selected'}>Taak: iets dat je moet doen</option><option value="afspraak"${k.afspraak ? ' selected' : ''}>Afspraak: vast moment, met tijd</option></select></label>
    <label>Titel <input name="titel" value="${esc(k.titel)}" required></label>
    <label>Datum <input name="dag" type="date" value="${esc(P.dag || '')}"></label>
    <div class="rij"><label>Van <input name="van" type="time" value="${esc(tijd(P.van))}"></label><label>Tot <input name="tot" type="time" value="${esc(tijd(P.tot))}"></label></div>
    <div id="kTaak"${k.afspraak ? ' hidden' : ''}>
      <p class="sub" style="margin:.2rem 0 .6rem">Laat datum en tijd leeg om de taak uit de agenda te halen.</p>
      <div class="rij"><label>Deadline <input name="d" type="date" value="${esc(k.d || '')}"></label><label>Minuten <input name="min" type="number" inputmode="numeric" min="5" max="480" step="5" value="${esc(String(k.min || ''))}" placeholder="voorstel: ${schat(soortVan(k), k.titel)}"></label></div>
      <label>Soort <select name="bron">${Object.entries(BRON).map(([b, n]) => `<option value="${b}"${k.bron === b ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
    </div>
    <div class="rij"><label>Rol <select name="rol">${rolOpties(rolVanTaak(k))}</select></label><label>Potje <select name="potje">${potOpties(k.potje || '')}</select></label></div>
    <label>Notitie <textarea name="notitie" rows="2">${esc(k.notitie || '')}</textarea></label>
    <label>Link (mag leeg) <input name="url" type="url" value="${esc(k.url || '')}" placeholder="https://…"></label>
    <div class="knoppen"><button class="btn hoofd" type="submit">Opslaan</button><button class="btn" type="button" data-sluit="">Annuleren</button><button class="btn rood" type="button" data-taakweg="${esc(k.id)}">Verwijderen</button></div>
  </form>`;
  d.dataset.taak = id; d.classList.add('open'); $('#scrim').hidden = false;
}
function bewaarTaakBewerk(f) {
  const k = (S.taken || []).find(x => x.id === $('#drawer').dataset.taak); if (!k) return; const g = n => (f.get(n) || '').trim();
  const afspr = g('soort') === 'afspraak'; const dag = g('dag'), van = g('van').replace(/^0/, ''), tot = g('tot').replace(/^0/, '');
  if (!g('titel')) { toast('Geef een titel'); return; }
  if (afspr && !(dag && van && tot)) { toast('Een afspraak heeft een datum, een begintijd en een eindtijd'); return; }
  if ((dag || van || tot) && !(dag && van && tot)) { toast('Vul datum, van en tot allemaal in, of laat ze alle drie leeg'); return; }
  if (van && minuten(tot) <= minuten(van)) { toast('Kies een eindtijd na de begintijd'); return; }
  const terug = foto(); k.titel = g('titel'); k.notitie = g('notitie') || undefined; if (g('rol')) zetRol(k, { rol: g('rol'), potje: g('potje') }); k.url = /^https?:\/\//i.test(g('url')) ? g('url') : undefined;
  if (dag) { k.plan = { dag, van, tot }; agSel[dag] = 'taak:' + k.id; } else delete k.plan;
  if (afspr) { k.afspraak = true; delete k.d; delete k.min; delete k.start; } else { delete k.afspraak; k.d = g('d') || undefined; k.min = +g('min') || undefined; k.bron = g('bron') || k.bron; }
  sluit(); bewaar(); toast(k.titel + ' is aangepast', terug);
}
function sluit() { $('#drawer').classList.remove('open'); $('#scrim').hidden = true; }
function bewaarBewerk(f) {
  const id = $('#drawer').dataset.id; const g = k => (f.get(k) || '').trim();
  if (!g('titel')) { toast('Geef de les een titel. Wil je de titel uit de leergang terug? Kies dan Terug naar de leergang.'); const v = $('#drawer [name=titel]'); if (v) v.focus(); return; }
  const lines = k => g(k).split('\n').map(x => x.trim()).filter(Boolean);
  const meta = $('#drawer')._matMeta || {};
  const oudItem = reeks(id.split(':')[0]).find(x => x.id === id); const oudFasen = oudItem ? (les(oudItem).fasen || []) : [];
  const o = { titel: g('titel'), vraag: g('vraag'), doel: g('doel'), detail: g('detail'), fasen: LESMODUS.tekstNaarFasen(g('fasen'), oudFasen), identiteit: g('identiteit'), benodigd: lines('benodigd'),
    formatief: { soort: g('fsoort'), tekst: g('ftekst') },
    materiaal: lines('materiaal').map(x => { const i = x.indexOf('|'); const m = i < 0 ? { t: x, u: '' } : { t: x.slice(0, i).trim(), u: x.slice(i + 1).trim() }; return meta[m.u] ? Object.assign({}, meta[m.u], { t: m.t }) : m; }) };
  if (f.get('type')) o.type = f.get('type');
  S.les[id] = o; sluit(); bewaar(); toast('Les opgeslagen');
}

/* ---------- lesklok: de klok zelf staat in lesklok.js ---------- */
function lesklokUren() {
  const s = vandaag(); const p = planning(s, s)[s]; if (!p || p.reden) return [];
  return (p.uren || []).map(x => {
    const u = { van: minuten(x.u.start), tot: minuten(x.u.eind), groep: x.u.groep, uitval: !!x.uitval };
    if (x.item) { const l = les(x.item);
      u.stil = l.type === 'toets' && (toetsVan(x.item.lg, l.toets) || {}).soort !== 'praktijk'; // een praktijktoets ruimt wel op
      u.strookje = /strookje/i.test(JSON.stringify(l.fasen || [])) || bmVoor(x.item).some(m => m.strookje); }
    return u;
  });
}
/* ---------- lesmodus ---------- */
let LES = null;
/* Plek per les onthouden (bevinding 40): sluiten, opnieuw openen of herladen gaat verder op dezelfde dia, met de fasetimer.
   Alleen voor lessen van vandaag, op dit apparaat (localStorage lesdag-lesplek). De index telt jouw kaart mee, ook in het bordvenster.
   sessionStorage lesdag-lesopen: dit tabblad had de lesmodus open, dus na herladen gaat hij weer open. */
const PLEK = 'lesdag-lesplek';
function plekAlle() { try { return JSON.parse(localStorage.getItem(PLEK) || '{}') || {}; } catch (e) { return {}; } }
function plekBewaar() {
  const P = LES; if (!P || P.s !== vandaag()) return;
  const alle = plekAlle(); for (const k in alle) if (!k.startsWith(P.s + '|')) delete alle[k];
  const sl = P.slides[P.i]; const i = P.bord ? P.i + 1 : P.i; const klok = sl.k === 'fase' && P.tot > 0;
  alle[P.s + '|' + P.x.u.id] = { i, klok, left: P.left, tot: P.tot, eind: P.timer ? Date.now() + P.left * 1000 : 0, krap: P.krap };
  try { localStorage.setItem(PLEK, JSON.stringify(alle)); } catch (e) {}
}
function plekWeg(s, uid) { const alle = plekAlle(); if (!alle[s + '|' + uid]) return; delete alle[s + '|' + uid]; try { localStorage.setItem(PLEK, JSON.stringify(alle)); } catch (e) {} }
/* Later begonnen (bevinding 17): bij de start van elke fase rekent de lesmodus met de eindtijd van de les.
   Het tekort gaat van de langste fase die nog komt (LESMODUS.inkorten). Op het bord staat gewoon de nieuwe tijd; jij ziet "was 20". */
function lesKrap(P) {
  if (P.s !== vandaag()) return null;
  const van = minuten(P.x.u.start), tot = minuten(P.x.u.eind); const d = new Date(); const nu = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  if (nu >= tot * 60) return null; const sec = tot * 60 - Math.max(nu, van * 60);
  const vanaf = P.slides.findIndex((y, j) => j >= P.i && y.k === 'fase'); if (vanaf < 0) return null;
  const idx = P.slides.map((y, j) => j).filter(j => j >= vanaf && P.slides[j].k === 'fase' && P.slides[j].min);
  const r = LESMODUS.inkorten(idx.map(j => P.slides[j]), sec); if (!r.past) return null;
  const min = {}; idx.forEach((j, n) => { if (r.min[n] !== P.slides[j].min) min[j + (P.bord ? 1 : 0)] = r.min[n]; }); // index met jouw kaart, net als de plek
  return { min, beschikbaar: Math.round(sec / 60), gepland: r.gepland };
}
const faseMin = (P, j) => { const k = j + (P.bord ? 1 : 0); return P.krap && P.krap.min[k] != null ? P.krap.min[k] : P.slides[j].min; };
function krapZin(P) { // alleen voor jou: jouw kaart, de onderbalk en de regie
  if (!P.krap) return '';
  const delen = Object.keys(P.krap.min).map(k => { const y = P.slides[+k - (P.bord ? 1 : 0)]; return y ? `${(LESMODUS.SOORT[y.soort] || { naam: 'fase' }).naam.toLowerCase()} ${P.krap.min[k]} min (was ${y.min})` : ''; }).filter(Boolean);
  return delen.length ? `Je hebt nog ${P.krap.beschikbaar} min, gepland ${P.krap.gepland}: ${delen.join(', ')}.` : '';
}
/* sprekersnotities: data/notities.json (tools/zet-notities.js), los van basis.json en pas geladen als je een les geeft of de regie opent.
   Het bordvenster laadt het bestand nooit en stuurt er niets van door: alleen het venster van de docent toont de notities. */
let NOT = null, notLaad = null;
function notitiesLaad() {
  if (NOT) return Promise.resolve(NOT);
  if (!notLaad) notLaad = fetch('data/notities.json').then(r => r.ok ? r.json() : Promise.reject(new Error(r.status))).then(j => { NOT = j; return j; }).catch(() => null).then(j => { notLaad = null; return j; });
  return notLaad;
}
const notHtml = (item, l, sl, fi) => NOT && item && sl ? LESMODUS.notitieHtml(NOT[item.id], sl, fi, l) : '';
function notVul() { // na het laden: alleen het notitiepaneel en zijn knop bijwerken, de timer blijft ongemoeid
  const P = LES; if (!P || P.bord) return; const sl = P.slides[P.i]; const el = $('#notities'); if (!el || !sl) return;
  const fi = P.slides.filter(x => x.k === 'fase').indexOf(sl); const nh = notHtml(P.x.item, P.l, sl, fi); const d = typeof sl.docent === 'string' && sl.docent ? `<b>Docent</b> ${esc(sl.docent)}` : '';
  el.innerHTML = d + nh; const b = document.querySelector('#les [data-l="notities"]'); if (b) b.hidden = !(d || nh);
  el.classList.toggle('open', !!(P.notities && (d || nh)));
}
function startLes(uurId, s, bord) { // bord: dit venster is het digibord, de regie zit in het andere venster
  s = s || vandaag(); const p = planning(s, s)[s];
  if (!p || p.reden || !p.uren.length) { toast('Geen lessen op deze dag'); return; }
  let x = uurId ? p.uren.find(y => y.u.id === uurId) : null;
  if (!x) { const nu = nuMin(); x = p.uren.find(y => !y.klaar && !y.uitval && y.item && nu < minuten(y.u.eind)) || p.uren.find(y => y.item && !y.klaar && !y.uitval); }
  if (!x || !x.item) { toast('Geen les meer om te geven vandaag'); return; }
  const l = les(x.item);
  const t = l.type === 'toets' ? toetsVan(x.item.lg, l.toets) : null;
  const th = x.item.week.thuis || {};
  const vor = vorigeVan(x);
  const materiaalHtml = (l.materiaal || []).length ? `<div class="mats lesmats">${l.materiaal.map((m, i) => /^https?:/i.test(m.u || '') ? `<span><a href="${esc(m.u)}" target="_blank" rel="noopener">${esc(m.t)}</a>${m.itemId && m.driveId ? ` <button class="btn klein" data-preview="${i}">toon hier</button>` : ''}</span>` : `<span>${esc(m.t)}</span>`).join('')}</div><div id="pv" style="display:contents"></div>` : '';
  let slides = LESMODUS.bouwSlides(l, { groep: x.u.groep, lgNaam: lgNaam(x.item.lg), lokaal: x.u.lokaal, toets: t ? t.naam + ' · ' + (t.waar || '') : '', thuis: th, vorige: vor ? vor.n : '', vorigeKop: vor ? vorigeKop(vor) : '', benodigd: klaarLijst(s, l), materiaalHtml });
  if (bord) slides = slides.filter(y => y.k !== 'klaar'); // jouw kaart hoort niet op het bord
  LES = { x, l, s, slides, i: 0, left: 0, tot: 0, timer: null, notities: false, keuze: x.half ? 'gegeven' : 'gegeven', begin: Date.now(), bord: !!bord, krap: null };
  // verder waar je was; loopt de les al, dan niet op jouw kaart beginnen (die zou op het digibord kunnen staan)
  const pl = s === vandaag() ? plekAlle()[s + '|' + x.u.id] : null;
  let i = pl ? pl.i : 0; if (i === 0 && s === vandaag() && nuMin() >= minuten(x.u.start)) i = 1;
  LES.i = Math.max(0, Math.min(slides.length - 1, bord ? i - 1 : i));
  if (pl) { LES.krap = pl.krap || null;
    if (pl.klok && pl.i === LES.i + (bord ? 1 : 0) && slides[LES.i].k === 'fase') LES.herstel = { left: pl.eind ? Math.round((pl.eind - Date.now()) / 1000) : pl.left, tot: pl.tot, loopt: !!pl.eind }; }
  if (!bord) try { sessionStorage.setItem('lesdag-lesopen', x.u.id + '|' + s); } catch (e) {}
  $('#les').hidden = false; document.body.style.overflow = 'hidden'; waak(true); toonSlide();
  if (!bord && !NOT) notitiesLaad().then(() => notVul());
}
function toonSlide() {
  const P = LES; const sl = P.slides[P.i]; stopTimer();
  const body = sl.k === 'af' ? (P.bord ? `<p class="eyebrow">${esc(P.x.u.groep)}</p><h1>Tot de volgende les</h1>` : afrondenHtml()) : sl.h;
  const soort = sl.soort || sl.k; const kl = LESMODUS.SOORT[sl.soort];
  const fasen = P.slides.filter(x => x.k === 'fase'); const fi = fasen.indexOf(sl);
  const herstel = P.herstel; delete P.herstel; const fklok = sl.k === 'fase' && !!sl.min;
  if (fklok && herstel) { P.left = herstel.left; P.tot = herstel.tot; }
  else if (fklok || sl.k === 'klaar') { P.krap = lesKrap(P); P.left = P.tot = fklok ? faseMin(P, P.i) * 60 : 0; } // elke fase rekent opnieuw met de eindtijd van de les
  else { P.left = 0; P.tot = 0; }
  const notInh = P.bord ? '' : (typeof sl.docent === 'string' && sl.docent ? `<b>Docent</b> ${esc(sl.docent)}` : '') + notHtml(P.x.item, P.l, sl, fi);
  const krap = !P.bord ? krapZin(P) : ''; const ingekort = fklok && faseMin(P, P.i) !== sl.min;
  $('#les').className = 'les s-' + soort; $('#les').style.setProperty('--c', kl ? kl.kleur : '#5B247F'); $('#les').style.setProperty('--z', kl ? kl.zacht : '#d8b8ff');
  $('#les').innerHTML = `<div class="lkop"><b>${esc(P.x.u.groep)}</b><span>${esc(P.x.u.start)}–${esc(P.x.u.eind)}${P.x.u.lokaal ? ' · ' + esc(P.x.u.lokaal) : ''}</span><span class="sp"></span><span class="stip">${P.slides.map((x, j) => `<i class="${j === P.i ? 'nu' : j < P.i ? 'af' : ''} ${x.k}" style="${x.soort && LESMODUS.SOORT[x.soort] ? '--s:' + LESMODUS.SOORT[x.soort].kleur : ''}"></i>`).join('')}</span><span class="lk-rest" id="lkRest"></span><span class="klok" id="klok">${klok()}</span></div>
  <div class="slide ${sl.docent === true ? 'docentkaart' : ''}">${body}${sl.k === 'klaar' && krap ? `<p class="lm-krap">${esc(krap)}</p>` : ''}</div>
  ${fklok ? timerHtml() : ''}
  ${fklok ? `<div class="fase-tijd" id="faseTijd" role="status"${P.left > 0 ? ' hidden' : ''}>Tijd · volgende fase</div>` : ''}
  <div class="notities ${P.notities && notInh ? 'open' : ''}" id="notities">${notInh}</div>
  <div class="lbalk"><button data-l="vorige" aria-label="Vorige">‹</button><button data-l="volgende" aria-label="Volgende">›</button><span class="waar">${sl.k === 'fase' ? `fase ${fi + 1} van ${fasen.length}${ingekort && !P.bord ? ` · ${faseMin(P, P.i)} min, was ${sl.min}` : ''}` : sl.k === 'klaar' ? 'jouw kaart' : sl.k === 'welkom' ? 'welkom' : sl.k === 'doel' ? 'lesdoel' : sl.k === 'check' ? 'check' : sl.k === 'id' ? 'rode draad' : sl.k === 'thuis' ? 'thuis' : 'afronden'}</span>${sl.min ? `<button class="timer" data-l="timer" id="tbtn">${P.timer ? 'pauze' : 'start'} timer</button>` : ''}<span class="sp"></span>${!P.bord ? `<button data-l="notities" aria-pressed="${P.notities}"${notInh ? '' : ' hidden'}>notities</button>` : ''}<button data-l="scherm">volledig scherm</button>${sl.k !== 'af' && !P.bord ? '<button class="af" data-l="naaraf">les afronden</button>' : ''}<button data-l="sluit">sluiten</button></div>`;
  if (fklok && (!herstel || herstel.loopt)) timer(true); // een gepauzeerde timer blijft na heropenen gepauzeerd
  bordZeg(); plekBewaar();
  LESKLOK.tik(); // de band en de resttijd staan meteen goed op de nieuwe dia
}
function klok() { const d = new Date(); return d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); }
function timerHtml() { return `<div class="timerhoek">${LESMODUS.timerRing(LES.left, LES.tot)}</div>`; }
function afrondenHtml() {
  const P = LES;
  return `<div class="afronden"><p class="eyebrow">Les afronden · ${esc(P.x.u.groep)}</p><h2>${esc(P.l.titel || '')}</h2>
  <div class="keuzes">${[['gegeven', 'Gegeven'], ['half', 'Half af, volgende keer verder'], ['niet', 'Niet gegeven']].map(([k, n]) => `<button data-keuze="${k}" aria-pressed="${P.keuze === k}">${n}</button>`).join('')}</div>
  <label style="font-family:var(--lees);color:#cbb8db">Notitie voor de volgende les<textarea id="lnot">${esc(notitieVak(P.x, P.s))}</textarea></label>
  <div class="keuzes"><button data-l="opslaan">Opslaan en naar de volgende les</button></div></div>`;
}
function pad(sec) { const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
function stopTimer() { if (LES && LES.timer) { clearInterval(LES.timer); LES.timer = null; } }
function timer(auto) {
  const P = LES; if (!P) return;
  if (P.timer && !auto) { stopTimer(); const b = $('#tbtn'); if (b) b.textContent = 'start timer'; bordZeg(); plekBewaar(); return; }
  if (P.timer) return;
  P.eindMs = Date.now() + P.left * 1000; // rekenen met de klok, niet met tikken: een venster op de achtergrond tikt trager
  P.timer = setInterval(() => {
    const voor = P.left; P.left = Math.round((P.eindMs - Date.now()) / 1000); if (P.left === voor) return;
    const k = $('#klok'); if (k) k.textContent = klok();
    timerToon(voor);
    if (voor > 120 && P.left <= 120 && P.tot >= 300) tril(); // twee minuten voor het eind: alleen voelbaar op de tablet
    bordZeg();
  }, 250);
  const b = $('#tbtn'); if (b) b.textContent = 'pauze timer'; bordZeg(); plekBewaar();
}
/* De fasetimer op het scherm. Op 0:00 (bevinding 16): de ring loopt vol in amber, de band "Tijd · volgende fase" komt erbij
   en de klok telt door als uitloop. Rustig: geen rood, geen knipperen, geen geluid; op de tablet één korte tril. Rood blijft voor het opruimsignaal. */
function timerToon(voor) {
  const P = LES; if (!P) return; const c = 2 * Math.PI * 54;
  const el = $('#tl'); if (el) el.textContent = LESMODUS.timerTekst(P.left);
  const ring = $('#ring'); if (ring) { const v = ring.querySelector('.voort'); if (v) v.style.strokeDashoffset = c * (1 - LESMODUS.ringDeel(P.left, P.tot));
    ring.classList.toggle('over', P.left <= 0); ring.classList.toggle('bijna', P.left > 0 && P.left <= 60); }
  const ft = $('#faseTijd'); if (ft && ft.hidden !== P.left > 0) ft.hidden = P.left > 0;
  if (voor > 0 && P.left <= 0) tril();
}
function sluitLes() { const bord = LES && LES.bord; plekBewaar(); stopTimer(); LES = null; if (!bord) try { sessionStorage.removeItem('lesdag-lesopen'); } catch (e) {} waak(false); if (bord) { rgStuur('dicht'); window.close(); } $('#les').hidden = true; document.body.style.overflow = ''; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); render(); }
function slaLesOp() {
  const P = LES; const g = P.x.u.groep; const n = ($('#lnot') || {}).value || '';
  S.voortgang[g] = S.voortgang[g] || {};
  if (P.keuze === 'niet') { (S.uitval[P.s] = S.uitval[P.s] || []).push(P.x.u.id); if (n.trim()) S.voortgang[g][P.x.item.id] = Object.assign({}, status(g, P.x.item.id), { n: n.trim() }); }
  else S.voortgang[g][P.x.item.id] = { st: P.keuze, d: P.s, uur: P.x.u.id, n: n.trim() || undefined };
  bewaar(true);
  const s = P.s; const huidig = P.x.u.id; sluitLes(); plekWeg(s, huidig);
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
  const vk = e.target.closest('.vorige.kort'); if (vk) { vk.classList.toggle('open'); return; } // lange notitie op Dag: tik om alles te lezen
  const b = e.target.closest('button,[data-week],[data-magopen],[data-felic],[data-jaarklas]'); if (!b) return;
  const D = b.dataset;
  if (agNegeer) { agNegeer = false; return; }
  if (D.pzvraagweg != null) { try { localStorage.setItem(PZ_WEG, '1'); } catch (er) {} render(); return; }
  if (D.nwnieuw != null) { nwNieuw(); return; }
  if (D.nwzet != null) { nwZet(); return; }
  if (D.nwdicht != null) { nwDicht(); return; }
  if (D.nwsoort) { NW.vast = D.nwsoort; nwToon(); $('#nwQ').focus(); return; }
  if (D.uitzicht) { AP.uitVerberg = D.uitzicht === '0'; apBewaar(); render(); return; }
  if (D.recnaar) { sluit(); recFocus = D.recnaar; if (route.naam !== 'reclame') location.hash = 'reclame'; else render(); return; }
  if (D.recalles != null) { recAlles = !recAlles; render(); return; }
  if (D.recmail) { const [soort, aid, mid] = D.recmail.split('|'); b.disabled = true; await recMail(soort, aid, mid); b.disabled = false; return; }
  if (D.reckopie) { const a = reclameActs().find(x => x.id === D.reckopie); const ta = document.querySelector(`[data-rectekst="${CSS.escape(D.reckopie)}"]`); const txt = ta ? ta.value : a ? recTekst(a) : ''; try { await navigator.clipboard.writeText(txt); toast('Tekst gekopieerd'); } catch (err) { if (ta) ta.select(); toast('Kopiëren lukt niet: selecteer en kopieer zelf'); } return; }
  if (D.recbeeld || D.recbord) { const soort = D.recbord ? 'bord' : 'wi'; const a = reclameActs().find(x => x.id === (D.recbord || D.recbeeld)); if (!a) return; b.disabled = true; try { recDownload(RECLAME.bestand(a, soort), await recBestand(a, soort)); } catch (err) { console.warn(err); toast('Maken lukt niet'); } b.disabled = false; return; }
  if (D.recuit) { const r = (S.reclame = S.reclame || {})[D.recuit] = S.reclame[D.recuit] || {}; r.uit = !r.uit; if (!r.uit) delete r.uit; recFocus = D.recuit; bewaar(); return; }
  if (D.recstel) { const r = (S.reclame || {})[D.recstel]; if (r) delete r.tekst; recFocus = D.recstel; bewaar(); return; }
  if (D.recweg) { S.reclameExtra = (S.reclameExtra || []).filter(x => x.id !== D.recweg); if (S.reclame) delete S.reclame[D.recweg]; bewaar(); return; }
  if (D.terug != null) { terugZetten(); return; }
  if (D.magopen) { const k = D.magopen; setTimeout(() => { GEOPEND[k] = 1; render(); }, 0); return; } // de link opent Magister zelf; daarna is Gemeld de volgende stap
  if (D.felic || D.felicaf) { const terug = foto(); const k = D.felic || D.felicaf; AP.felic[k] = 1; apBewaar(); setTimeout(render, 0); // de link opent een nieuwe mail in Outlook; versturen doe je daar zelf
    toast(`${k.slice(k.indexOf('|') + 1)} staat als gefeliciteerd`, terug); return; }
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
  if (D.afwezigopen != null) { afwezigOpen = !afwezigOpen; render(); return; }
  if (D.afwezigperiode) { const per = afwezigPeriode(D.afwezigperiode); afwezigTerug(per); toast(`Je bent er weer ${dagenTekst(per)}; de lessen staan terug`); return; }
  if (D.afwezigterug) { afwezigTerug([D.afwezigterug]); toast('Je bent er weer; de lessen staan terug'); return; }
  if (D.krapopen) { krapOpen = D.krapopen; krapKeuze = ''; render(); return; }
  if (D.krapoptie) { krapKeuze = D.krapoptie; render(); return; }
  if (D.kraplater) { const i = D.kraplater.indexOf('|'); krapOpen = ''; krapKeuze = ''; stelUit(`krap:${D.kraplater.slice(0, i)}:${D.kraplater.slice(i + 1)}`, addD(vandaag(), 1)); return; }
  if (D.ankeropen != null) { ankerOpen = D.ankeropen; render(); return; }
  if (D.naargroep) { location.hash = 'jaar/' + encodeURIComponent(D.naargroep); return; }
  if (D.jaartoets) { const i = D.jaartoets.indexOf('|'); const el = $('#jaarInfo'); if (el) el.innerHTML = jaarToetsTekst(D.jaartoets.slice(0, i), D.jaartoets.slice(i + 1)); return; }
  if (D.jaarklas) { location.hash = 'jaar/' + encodeURIComponent(D.jaarklas); return; }
  if (D.berichtkopie) { const ta = document.querySelector(`[data-bericht="${D.berichtkopie}"]`); try { await navigator.clipboard.writeText(ta.value); toast('Gekopieerd'); } catch (err) { ta.select(); toast('Kopiëren lukt niet: selecteer en kopieer zelf'); } return; }
  if (D.berichtklaar) { const a = (S.afwijkingen || []).find(x => x.id === D.berichtklaar); if (a) a.berichtKlaar = true; bewaar(); return; }
  if (D.afwijkingterug) { maakOngedaan(D.afwijkingterug); toast('Teruggezet'); return; }
  if (D.taakopen) { openTaak(D.taakopen); return; }
  if (D.liggenplan) { sluit(); liggenInPlannen(D.liggenplan); return; }
  if (D.liggenlater) { sluit(); const i = D.liggenlater.lastIndexOf('|'); stelUit(D.liggenlater.slice(0, i), D.liggenlater.slice(i + 1)); return; }
  if (D.palet != null) { paletOpen(); return; }
  if (D.stap) { nuStap(+D.stap); return; }
  if (D.kijk != null) { nuKijk = D.kijk || null; if (route.naam !== 'nu') location.hash = 'nu'; else render(); return; }
  if (D.bord) { const [u, s] = D.bord.split('|'); bordOpen(u, s); return; }
  if (D.rg) { if (D.rg === 'ga') rgStuur('ga', { i: +D.i }); else if (D.rg === 'sluit') { rgStuur('sluit'); RG = null; location.hash = 'nu'; } else rgStuur(D.rg); return; }
  if (D.mag) { const i = D.mag.indexOf('|'); const w = D.mag.slice(0, i), k = D.mag.slice(i + 1); const terug = foto();
    if (w === 'p') { magZet(k, { p: Date.now() }); delete AP.weg[k]; apBewaar(); bewaar(); const j = k.indexOf('|'); const x = uurOp(k.slice(0, j), k.slice(j + 1));
      toast(x && magStatus(k.slice(0, j), x) === 'ingehaald' ? 'Ingehaald. Telt als gedaan.' : 'Afgerond, op tijd', terug); }
    else if (w === 'h') { S.magHw = S.magHw || {}; S.magHw[k] = Date.now(); bewaar(); toast('Huiswerk staat in Magister', terug); }
    else if (w === 'l') { magZet(k, { l: Date.now() }); delete AP.log[k]; apBewaar(); bewaar(); toast('Logboek staat in Magister; de notities zijn van dit apparaat weg', terug); }
    return; }
  if (D.magcopy) { const P = D.magcopy.split('|');
    if (P[0] === 'hw' || P[0] === 'hwk') { const x = uurOp(P[1], P.slice(2).join('|')); if (!x || !x.item) return; const k = kopieer(hwTekst(x)); GEOPEND[hwKey(x)] = 1;
      if (P[0] === 'hw') window.open(MAGURL(), 'magister'); render(); k.then(ok => toast(ok ? 'Huiswerk gekopieerd. Plak het in Magister, daarna Staat erin.' : 'Kopiëren lukte niet. De tekst staat hier in Lesdag.')); }
    else { const n = (AP.log[P.slice(1, -1).join('|')] || [])[+P[P.length - 1]]; if (n) kopieer(n.t).then(ok => toast(ok ? 'Notitie gekopieerd' : 'Kopiëren lukte niet')); }
    return; }
  if (D.log) { const P = D.log.split('|');
    if (P[0] === 'add') { const k = P.slice(1).join('|'); const ll = ($('#lgLl') || {}).value; const t = (($('#lgT') || {}).value || '').trim(); if (!ll || !t) { toast('Kies een leerling en schrijf de notitie'); return; }
      (AP.log[k] = AP.log[k] || []).push({ ll, t, op: Date.now() }); apBewaar(); render(); toast('Notitie bewaard op dit apparaat'); }
    else { const terug = foto(); const k = P.slice(1, -1).join('|'); (AP.log[k] || []).splice(+P[P.length - 1], 1); if (!(AP.log[k] || []).length) delete AP.log[k]; apBewaar(); render(); toast('Notitie weg', terug); }
    return; }
  if (D.kompas != null) { kompasOpen(); return; }
  if (D.klasopen) { klasOpen = D.klasopen; klasScroll = true; const h = 'jaar/' + encodeURIComponent(D.klasopen); if (location.hash.slice(1) !== h) location.hash = h; else render(); return; }
  if (D.klas) { const i = D.klas.indexOf('|'); const w = D.klas.slice(0, i), g = D.klas.slice(i + 1); klasOpen = null;
    if (w === 'opslaan') { if (!bmLijstOk(bmParse($('#bmLijst').value))) return; const terug = foto(); const t = lijstOpslaan(g, $('#bmLijst').value); bewaar(); toast(t, terug); } else render(); return; }
  if (D.colopslaan != null) { const terug = foto(); const L = collegaParse(($('#colLijst') || {}).value || ''); colMis = L.mis; AP.collegas = L.slice(); apBewaar(); render();
    toast(`${AP.collegas.length} collega's opgeslagen op dit apparaat${colMis.length ? `. ${colMis.length === 1 ? 'Eén regel lukte' : colMis.length + ' regels lukten'} niet; die staan onder de lijst.` : ''}`, terug); return; }
  if (D.rgaf) { const uid = decodeURIComponent(route.arg[0] || ''); const s = route.arg[1] || vandaag(); const x = (planning(s, s)[s].uren || []).find(y => y.u.id === uid);
    if (!x || !x.item) { toast('Deze les staat niet meer op de planning'); return; }
    const terug = foto(); rondAf(s, x, D.rgaf, ($('#rgNot') || {}).value); bewaar(true); rgStuur('sluit'); RG = null; toast(x.u.groep + ' afgerond', terug); location.hash = 'nu'; return; }
  if (D.rondaf) { const [s, uid, keuze] = D.rondaf.split('|'); const x = (planning(s, s)[s].uren || []).find(y => y.u.id === uid);
    if (x && x.item) { const terug = foto(); rondAf(s, x, keuze, ($('#nNot') || {}).value); nuKijk = null; bewaar(); toast(x.u.groep + ': ' + (keuze === 'gegeven' ? 'gegeven' : keuze === 'half' ? 'deels, volgende keer verder' : 'de les schuift door'), terug); } return; }
  if (D.aflater) { const terug = foto(); const [s, uid] = D.aflater.split('|'); (S.afLater[s] = S.afLater[s] || []).push(uid); nuKijk = null; bewaar(); toast('Komt terug in je volgende werkblok', terug); return; }
  if (D.rustweg) { const terug = foto(); S.rust[D.rustweg] = 'weg'; bewaar(); toast('Het rustblok is vrijgegeven', terug); return; }
  if (D.slot) { nwDicht(); const terug = foto(); const [v, dag, van, tot] = D.slot.split('|'); const k = maakTaak(v, { dag, van, tot }); if (k) { bewaar(); toast(k.titel + ' staat op ' + fmtD(dag) + ' om ' + van, terug); } return; }
  if (D.later) { const terug = foto(); const [k, v] = D.later.split('|'); S.later[k] = v; bewaar(); toast(v === 'ok' ? 'Genoteerd' : 'Vandaag niet meer', terug); return; }
  if (D.klaarextra) { const terug = foto(); const [d, txt] = D.klaarextra.split('|'); (S.klaarExtra[d] = S.klaarExtra[d] || []).push(txt); bewaar(); toast('Staat op je klaarzetlijst', terug); return; }
  if (D.afsluiten) { const terug = foto(); const g = $('#gGoed'); if (g) S.goed[D.afsluiten] = g.value.trim() || undefined; S.afgesloten[D.afsluiten] = true; nuKijk = null; bewaar(); toast('Morgen staat klaar. Fijne avond.', terug); return; }
  if (D.heropen) { delete S.afgesloten[D.heropen]; bewaar(); return; }
  if (D.taakbewerk) { openTaakBewerk(D.taakbewerk); return; }
  if (D.duurja) { duurNoteer(+D.duurja); return; }
  if (D.duurok != null) { duurNoteer(+($('#dvMin') || {}).value); return; }
  if (D.duurnee != null) { duurDicht(); return; }
  if (D.duurweg != null) { const terug = foto(); S.duurLog.splice(+D.duurweg, 1); bewaar(); toast('Meting telt niet meer mee', terug); return; }
  if (D.taakstart) { const k = (S.taken || []).find(k => k.id === D.taakstart); if (k) { k.start = Date.now(); bewaar(); } return; }
  if (D.pzweg != null) { const terug = foto(); S.pauzes.splice(+D.pzweg, 1); bewaar(); toast('Pauze weg', terug); return; }
  if (D.ag) { const i = D.ag.indexOf('|'); const d = D.ag.slice(0, i); agSel[d] = D.ag.slice(i + 1); dagKeuze = d; if (route.naam !== 'vandaag') location.hash = 'vandaag'; else { render(); if (innerWidth < 820) { const pn = $('.agpaneel'); if (pn) pn.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); } } return; }
  if (D.ontplan) { const terug = foto(); const k = (S.taken || []).find(k => k.id === D.ontplan); if (k) { agSel[k.plan.dag] = ''; delete k.plan; } bewaar(); toast('Uit de agenda gehaald; de taak staat nog in je lijst', terug); return; }
  if (D.dag != null && route.naam !== 'vandaag') { dagKeuze = D.dag; location.hash = 'vandaag'; return; }
  if (D.dag != null) { dagKeuze = D.dag; render(); return; }
  if (D.jaarweek) { paletWeek(D.jaarweek); return; }
  if (D.week != null) { weekKeuze = D.week; render(); return; }
  if (D.start != null) { const [u, s] = D.start.split('|'); startLes(u || null, s || vandaag()); return; }
  if (D.uitval) { const [s, u] = D.uitval.split('|'); (S.uitval[s] = S.uitval[s] || []).push(u); bewaar(); toast('Les valt uit; de volgende les schuift door', () => { S.uitval[s] = (S.uitval[s] || []).filter(x => x !== u); bewaar(); }); return; }
  if (D.uitvalterug) { const [s, u] = D.uitvalterug.split('|'); S.uitval[s] = (S.uitval[s] || []).filter(x => x !== u); bewaar(); return; }
  if (D.bewerk) { openBewerk(D.bewerk); return; }
  if (D.sluit != null) { sluit(); return; }
  if (D.herstel != null) { const terug = foto(); delete S.les[$('#drawer').dataset.id]; sluit(); bewaar(); toast('De les staat weer zoals in de leergang', terug); return; }
  if (D.markeer) { const terug = foto(); const [g, id] = D.markeer.split('|'); S.voortgang[g] = S.voortgang[g] || {}; S.voortgang[g][id] = Object.assign({}, status(g, id), { st: 'gegeven', d: vandaag() }); bewaar(); toast('Op gegeven gezet', terug); return; }
  if (D.reset) { const terug = foto(); const [g, id] = D.reset.split('|'); if (S.voortgang[g]) delete S.voortgang[g][id]; bewaar(); toast('Weer niet gegeven', terug); return; }
  if (D.opplan) { const terug = foto(); const n = opPlanning(D.opplan); bewaar(); toast(`${n} lessen op gegeven gezet`, terug); return; }
  if (D.opplanalle != null) { const terug = foto(); rooGroepen().forEach(opPlanning); bewaar(); toast('Groepen staan op de planning', terug); return; }
  if (D.taakweg) { const terug = foto(); const w = (S.taken || []).find(k => k.id === D.taakweg); S.taken = (S.taken || []).filter(k => k.id !== D.taakweg); sluit(); bewaar(); toast(w && !w.af && (w.sectieId || w.koorId || w.reclameId || w.dagTaak) ? 'Uit je planning gehaald. De taak zelf staat nog open; vink hem af als hij klaar is.' : w && w.afspraak ? 'Afspraak verwijderd' : 'Taak verwijderd', terug); return; }
  if (D.weg) { const terug = foto(); S.rooster = S.rooster.filter(u => u.id !== D.weg); bewaar(); toast('Lesuur verwijderd', terug); return; }
  if (D.salles != null) { sAlles = !sAlles; render(); return; }
  if (D.talles != null) { tAlles = !tAlles; render(); return; }
  if (D.ipbzet != null) { const { n, aangevuld } = ipbZet(); bewaar(); const st = x => `${x} IPB-${x === 1 ? "stap" : "stappen"}`; toast(n || aangevuld ? [n ? `${st(n)} in je takenlijst gezet, bij Professional` : "", aangevuld ? `uitleg bijgewerkt bij ${st(aangevuld)}` : ""].filter(Boolean).join("; ").replace(/^./, c => c.toUpperCase()) + ". Plan ze vanuit Dag." : "De IPB-stappen staan al in je takenlijst"); return; }
  if (D.rolweg) { const r = rolInfo(D.rolweg); if (!r) return; const terug = foto(); S.rollen = rolLijst().filter(x => x.id !== r.id); bewaar(); toast(`${r.naam} is weggehaald. Taken met deze rol houden hem, zonder kleurstreepje.`, terug); return; }
  if (D.potweg) { const p = potInfo(D.potweg); if (!p) return; const terug = foto(); S.potjes = potLijst().filter(x => x.id !== p.id); bewaar(); toast(`Potje ${p.naam} is weggehaald`, terug); return; }
  if (D.rolerbij != null) { S.rollen = rolLijst().concat({ id: 'r' + Date.now().toString(36), naam: 'Nieuwe rol', kleur: '#6b6b6b', uren: '' }); bewaar(); const v = [...document.querySelectorAll('#rolKaart [data-rolveld$="|naam"]')].pop(); if (v) { v.focus(); v.select(); } return; }
  if (D.poterbij != null) { S.potjes = potLijst().concat({ id: 'p' + Date.now().toString(36), naam: 'Nieuw potje', uren: '' }); bewaar(); const v = [...document.querySelectorAll('#rolKaart [data-potveld$="|naam"]')].pop(); if (v) { v.focus(); v.select(); } return; }
  if (D.sbewerk != null) { sBewerk = D.sbewerk; render(); const v = $('#seT'); if (v) v.focus(); return; }
  if (D.sweg) { const w = sEigen(D.sweg); if (!w) return; const terug = foto(); S.sectieExtra = S.sectieExtra.filter(x => x.id !== w.id); delete S.sectieAf[w.id]; delete S.sectieNotitie[w.id];
    S.taken = (S.taken || []).filter(k => k.sectieId !== w.id); bewaar(); toast(`${kort(w.titel)} is weggehaald`, terug); return; }
  if (D.login != null) { M365.login(); return; }
  if (D.logout != null) { M365.logout(); return; }
  if (D.sync != null) { await syncNu(true); return; }
  if (await syncKlik(D)) return;
  if (await agendaKlik(D)) return;
  if (D.zophalen != null) { await zOphalen(true); return; }
  if (D.zkopie != null) { try { await navigator.clipboard.writeText(zOverzichtTekst()); toast('Gekopieerd. Plak het in de chat bij het nakijken.'); } catch (err) { toast('Kopiëren lukt niet in deze browser'); } return; }
  if (D.zweg != null) { delete S.zermeloToken; if (!zApiToken()) { ZC = null; try { localStorage.removeItem('lesdag-zermelo'); } catch (e) {} } bewaar(); return; }
  if (D.zapiweg != null) { try { localStorage.removeItem(Z_API); } catch (e) {} if (!S.zermeloToken) { ZC = null; try { localStorage.removeItem('lesdag-zermelo'); } catch (e) {} } bewaar(); if (S.zermeloToken) await zOphalen(false); return; }
  if (D.zovernemen != null) { const terug = foto(); roosterUitZermelo(); bewaar(); toast('Rooster overgenomen uit Zermelo', terug); return; }
  if (D.export != null) { const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'lesdag-' + vandaag() + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); return; }
  if (D.zoek != null) { zoek(); return; }
  if (D.kies != null) { kiesBestand(+D.kies); return; }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.bericht) { const a = (S.afwijkingen || []).find(x => x.id === t.dataset.bericht); if (a) { a.bericht = t.value; bewaar(true); } return; }
  if (t.checked && t.closest('.taak-klaar')) sluit();
  if (t.dataset.taaknoot) { const i = t.dataset.taaknoot.indexOf('|'), soort = t.dataset.taaknoot.slice(0, i), n = t.dataset.taaknoot.slice(i + 1), k = soort === 'ff' ? nootVooruit(n) : n; S.taakNoot = S.taakNoot || {}; const r = S.taakNoot[k] = S.taakNoot[k] || {}; const w = t.value.trim(); if (w) { r[soort] = w; r.d = vandaag(); r.titel = $('#drawer > h2').textContent; } else { delete r[soort]; if (!r.fb && !r.ff) delete S.taakNoot[k]; } bewaar(); return; }
  if (t.dataset.liggentot) { if (t.value > vandaag()) stelUit(t.dataset.liggentot, t.value); return; }
  if (t.dataset.minv) { const v = t.dataset.minv; const m = Math.round(+t.value); if (!(m >= 1 && m <= 480)) { bewaar(); return; } const k = v.startsWith('eigen:') && (S.taken || []).find(x => x.id === v.slice(6)); if (k) k.min = m; else (S.minuten = S.minuten || {})[v] = m; bewaar(); return; }
  if (t.dataset.schatstart) { const m = Math.round(+t.value); S.schatStart = S.schatStart || {}; if (m >= 1 && m <= 480) S.schatStart[t.dataset.schatstart] = m; else delete S.schatStart[t.dataset.schatstart]; bewaar(); return; }
  if (t.dataset.rolveld || t.dataset.potveld) { // Instellingen, Rollen en potjes
    const rol = !!t.dataset.rolveld; const [id, veld] = (t.dataset.rolveld || t.dataset.potveld).split('|'); const x = rol ? rolInfo(id) : potInfo(id); if (!x) return; const w = t.value.trim();
    if (veld === 'naam') { if (!w) { toast('Geef een naam'); t.value = x.naam; return; } x.naam = w.slice(0, 40); }
    else if (veld === 'kleur') { if (kleurOk(w)) x.kleur = w; }
    else if (veld === 'uren') { const u = Math.round(+w); x.uren = w === '' || !(u >= 0 && u <= 2000) ? '' : u; }
    bewaar(); return; }
  if (t.dataset.teamnoot) { const w = t.value.trim(); if (w) S.sectieNotitie[t.dataset.teamnoot] = w; else delete S.sectieNotitie[t.dataset.teamnoot]; bewaar(true); return; }
  if (t.id === 'kSoort') { const n = $('#kTaak'); if (n) n.hidden = t.value === 'afspraak'; return; }
  if (t.dataset.sdone) { const id = t.dataset.sdone; const i = sectieItems().find(x => x.id === id);
    if (t.checked) { S.sectieAf[id] = true; if (i) duurVraag('sec:' + i.id, 'sectie', i.titel, schat('sectie', i.titel), 0, { rol: rolVanSectie(i), potje: i.potje }); bewaar(); toast(`${i ? kort(i.titel) : 'Taak'} is afgevinkt`, () => { delete S.sectieAf[id]; duurTerug('sec:' + id); bewaar(); toast('Weer open'); }); }
    else { delete S.sectieAf[id]; duurTerug('sec:' + id); bewaar(); } }
  if (t.dataset.taakaf) { const k = (S.taken || []).find(k => k.id === t.dataset.taakaf);
    if (k && t.checked) { const echt = k.start ? Math.round((Date.now() - k.start) / 60000) : 0; const gemeten = echt >= 2 && echt <= 240 ? echt : 0; delete k.start; duurVraag(k.id, soortVan(k), k.titel, gemeten || k.min || (k.plan ? minuten(k.plan.tot) - minuten(k.plan.van) : schat(soortVan(k), k.titel)), gemeten, { rol: rolVanTaak(k), potje: k.potje }); } else if (k) duurTerug(k.id); // zo leert de schatting
    if (k) { k.af = t.checked; k.afOp = t.checked ? vandaag() : undefined; if (k.sectieId) { if (t.checked) S.sectieAf[k.sectieId] = true; else delete S.sectieAf[k.sectieId]; } if (k.koorId) { if (t.checked) S.koorAf[k.koorId] = true; else delete S.koorAf[k.koorId]; } if (k.reclameId) { S.reclameAf = S.reclameAf || {}; if (t.checked) S.reclameAf[k.reclameId] = vandaag(); else delete S.reclameAf[k.reclameId]; } if (k.dagTaak) zetDagTaak(k.dagTaak.dag, k.dagTaak.key, t.checked); } bewaar(); }
  if (t.dataset.recvink) { const id = t.dataset.recvink; S.reclameAf = S.reclameAf || {}; if (t.checked) S.reclameAf[id] = vandaag(); else delete S.reclameAf[id]; (S.taken || []).filter(k => k.reclameId === id).forEach(k => { k.af = t.checked; k.afOp = t.checked ? vandaag() : undefined; }); if (t.checked) { const m = reclameMoment(id); if (m) duurVraag('rec:' + id, 'reclame', m.titel, schat('reclame', m.titel), 0, { rol: rolStandaard('reclame') }); } else duurTerug('rec:' + id); bewaar(); return; }
  if (t.dataset.recveld) { const i = t.dataset.recveld.lastIndexOf('|'); const id = t.dataset.recveld.slice(0, i), k = t.dataset.recveld.slice(i + 1); const r = (S.reclame = S.reclame || {})[id] = S.reclame[id] || {}; r[k] = t.value.trim(); if (k === 'd' && !r.d) delete r.d; recFocus = id; bewaar(); return; }
  if (t.dataset.rectekst) { const r = (S.reclame = S.reclame || {})[t.dataset.rectekst] = S.reclame[t.dataset.rectekst] || {}; r.tekst = t.value; bewaar(true); return; }
  if (t.dataset.koorvink) { const kt = ((B.koor || {}).taken || []).find(x => x.id === t.dataset.koorvink); if (t.checked) { S.koorAf[t.dataset.koorvink] = true; if (kt) duurVraag('koor:' + kt.id, 'koor', kt.titel, schat('koor', kt.titel), 0, { rol: rolStandaard('koor') }); } else { delete S.koorAf[t.dataset.koorvink]; duurTerug('koor:' + t.dataset.koorvink); } bewaar(); }
  if (t.dataset.dagtaak) { const key = t.dataset.dagtaak; const so = key === 'koor' ? 'koorrep' : 'pres'; zetDagTaak(t.dataset.dag, key, t.checked); if (t.checked) { const tt = SOORTNAAM[so]; duurVraag('dag:' + t.dataset.dag + ':' + key, so, tt, schat(so, tt), 0, { rol: rolStandaard(so) }); } else duurTerug('dag:' + t.dataset.dag + ':' + key); bewaar(); }
  if (t.id === 'gGoed') { S.goed[vandaag()] = t.value.trim() || undefined; bewaar(true); }
  if (t.id === 'pK') { const n = $('#pNieuw'); if (n) n.hidden = !!t.value; }
  if (t.id === 'gLg') { S.groepLeergang[t.dataset.g] = t.value; bewaar(); }
  if (t.id === 'imp' && t.files[0]) { const f = t.files[0]; t.value = ''; kopieTerug(f); }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'afwezigForm') { const v = $('#afVan').value, w = $('#afTot').value; if (v && w && w >= v) zetAfwezig(v, w); else toast('Kies een einddatum op of na de begindatum'); return; }
  if (e.target.id === 'weekSprong') { const n = +$('#wsNr').value; const k = B.kalender.weken.find(k => k.w === n); if (k) paletWeek(k.datum); else toast('Lesweek ' + ($('#wsNr').value || '?') + ' bestaat niet; kies 1 t/m ' + B.kalender.weken[B.kalender.weken.length - 1].w); return; }
  if (e.target.id === 'krapForm') { const g = e.target.dataset.g; const R = ruimte(g).find(d => d.id === e.target.dataset.id); if (R && krapKeuze) voerKrapUit(R, krapKeuze); return; }
  if (e.target.id === 'ankerForm') { const g = e.target.dataset.g; const a = ankersVan(g).find(x => x.id === e.target.dataset.id); const reden = ($('#avReden') || {}).value || ''; if (!a || !$('#avUur') || !reden.trim()) { toast('Geef een korte reden'); return; }
    const id = verplaatsAnker(g, a, $('#avUur').value, reden.trim()); if (id) { ankerOpen = ''; bewaar(); toast(S.afwijkingen.find(x => x.id === id).wat, () => maakOngedaan(id)); } return; }
  if (e.target.id === 'zKoppelForm') { const v = $('#zCode').value.trim(); if (v) zKoppel(v); return; }
  if (e.target.id === 'zForm') { const v = $('#zLink').value; if (v.trim()) { S.zermeloToken = zToken(v); bewaar(true); } zOphalen(true).then(() => render()); return; }
  if (e.target.id === 'rForm') {
    const u = { id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), dag: +$('#rDag').value, start: $('#rVan').value, eind: $('#rTot').value, groep: $('#rGroep').value.trim(), lokaal: $('#rLok').value.trim() };
    if (!u.groep) return;
    const a = minuten(u.start), b = minuten(u.eind);
    if (!u.start || !u.eind || b <= a) { toast(b === a ? 'Begin en eind zijn gelijk. Kies een eindtijd na de begintijd.' : `Het uur eindigt (${u.eind}) vóór het begint (${u.start}). Kies een eindtijd na de begintijd.`); return; }
    const over = S.rooster.filter(x => +x.dag === u.dag && minuten(x.start) < b && minuten(x.eind) > a); // waarschuwen, niet weigeren: twee groepen in één uur kan
    const waar = [over.length ? `het overlapt met ${lijstTxt(over.map(x => `${x.groep} ${x.start.replace(/^0/, '')}-${x.eind.replace(/^0/, '')}`))}` : '', b - a > 120 ? `het duurt ${Math.floor((b - a) / 60)} uur${(b - a) % 60 ? ' en ' + (b - a) % 60 + ' min' : ''}` : ''].filter(Boolean);
    const terug = foto(); S.rooster.push(u); bewaar(); toast(`${DAGLANG[u.dag]} ${u.start} ${u.groep} toegevoegd${waar.length ? ". Let op: " + waar.join(' en ') + '.' : ''}`, waar.length ? terug : undefined);
    setTimeout(() => { const g = $('#rGroep'); if (g) g.focus(); }, 0);
  }
  if (e.target.id === 'planForm') {
    const dag = e.target.dataset.dag; const v = $('#pK').value; const van = $('#pVan').value.replace(/^0/, ''), tot = $('#pTot').value.replace(/^0/, '');
    if (!van || !tot || minuten(tot) <= minuten(van)) { toast('Kies een eindtijd na de begintijd'); return; }
    if (!v && !$('#pT').value.trim()) { toast('Geef de taak een naam'); return; }
    const ruw = $('#pT').value.trim(); const lt = !v && ruw ? leesTaak(ruw, dag) : null; if (lt && lt.fout) { toast(lt.fout); return; } const metTijd = lt && lt.afspraak && lt.plan; // een afspraak met eigen tijd in de tekst: die tijd telt
    const k = maakTaak(v, metTijd ? lt.plan : { dag, van, tot }, metTijd ? lt.titel : ruw, $('#pB').value); if (k && !v && AFSPRAAK.test(ruw)) k.afspraak = true; if (k && !v) zetRol(k, rolUitKeuze(ruw, $('#pB').value, $('#pR').value, $('#pP').value));
    const link = ($('#pU') || {}).value; if (k && link && /^https?:\/\//i.test(link.trim())) k.url = link.trim(); // waar je de taak doet: zelf geplakt
    if (k) { agSel[dag] = 'taak:' + k.id; bewaar(); toast(`${k.titel} staat op ${fmtD(dag)} om ${van}`); }
    return;
  }
  if (e.target.id === 'pzForm') { const T = [...e.target.querySelectorAll('[name=tot]')].map(x => x.value); S.pauzes = [...e.target.querySelectorAll('[name=van]')].map((x, i) => ({ van: x.value.replace(/^0/, ''), tot: (T[i] || '').replace(/^0/, '') })).filter(p => p.van && p.tot && minuten(p.tot) > minuten(p.van)); bewaar(); toast('Pauzes opgeslagen'); return; }
  if (e.target.id === 'kForm') { bewaarTaakBewerk(new FormData(e.target)); return; }
  if (e.target.id === 'tAdd') { const titel = $('#tT').value.trim(); if (!titel) return; const lt = leesTaak(titel, $('#tD').value); if (lt.fout) { toast(lt.fout); return; } const rp = rolUitKeuze(titel, $('#tB').value, $('#tR').value, $('#tP').value); if (lt.afspraak && lt.plan) { taakUitPalet(lt, rp); return; } (S.taken = S.taken || []).push(zetRol({ id: 'k' + Date.now().toString(36), titel, bron: $('#tB').value, d: $('#tD').value || undefined, af: false }, rp)); bewaar(); return; }
  if (e.target.id === 'recForm') { const titel = $('#recT').value.trim(), d = $('#recD').value; if (!titel || !d) return; if (d < vandaag()) { toast(`${fmtD(d)} ligt in het verleden. Kies een datum vanaf vandaag; een oude activiteit staat niet in de lijst`); return; } const id = 'eigen:' + Date.now().toString(36); (S.reclameExtra = S.reclameExtra || []).push({ id, titel, d, soort: $('#recS').value }); recFocus = id; bewaar(); toast(titel + ' staat erbij'); return; }
  if (e.target.id === 'sForm') { const titel = $('#sT').value.trim(), d = $('#sD').value; const f = sTaakFout(titel, d); if (f) { toast(f); $(titel ? '#sD' : '#sT').focus(); return; }
    S.sectieExtra.push(zetRol({ id: 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), d, titel, soort: 'taak', taak: true }, rolUitKeuze(titel, 'sectie', $('#sR').value, $('#sP').value))); bewaar(); toast(`${kort(titel)} staat erbij op ${fmtDJ(d)}`); return; }
  if (e.target.id === 'sEdit') { const k = sEigen(e.target.dataset.id); if (!k) return; const titel = $('#seT').value.trim(), d = $('#seD').value; const f = sTaakFout(titel, d, k.d); if (f) { toast(f); $(titel ? '#seD' : '#seT').focus(); return; }
    const terug = foto(); k.titel = titel; k.d = d; const rp = { rol: ($('#seR') || {}).value || rolVanSectie(k), potje: ($('#seP') || {}).value || '' }; zetRol(k, rp);
    (S.taken || []).filter(x => x.sectieId === k.id).forEach(x => { x.titel = titel; if (x.d) x.d = d; zetRol(x, rp); }); sBewerk = ''; // een ingeplande kopie gaat mee
 bewaar(); toast(`${kort(titel)} is aangepast`, terug); return; }
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
  if (NW) { if (e.key === 'Escape') { e.preventDefault(); nwDicht(); return; } if (e.key === 'Enter' && (e.target.id === 'nwQ' || e.target.id === 'nwLok')) { e.preventDefault(); nwZet(); return; } if (e.target.id === 'nwQ' || e.target.id === 'nwLok') return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !LES) { e.preventDefault(); paletOpen(); return; }
  if (route.naam === 'nu' && !LES && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && !$('#drawer').classList.contains('open')) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); nuStap(e.key === 'ArrowRight' ? 1 : -1); return; }
    if (e.key === 'Escape' && nuKijk) { nuKijk = null; render(); return; } }
  if (['vandaag', 'week'].includes(route.naam) && !LES && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && !$('#drawer').classList.contains('open')) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); agStap(e.key === 'ArrowRight' ? 1 : -1); return; }
    if (e.key.toLowerCase() === 'n' && !NW) { e.preventDefault(); nwNieuw(); return; } }
  if (route.naam === 'regie' && !LES && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { // de presenter stuurt pijltjes naar het venster dat voorop staat
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); rgStuur('volgende'); return; }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); rgStuur('vorige'); return; }
    if (e.key === 't') { rgStuur('timer'); return; } }
  if (document.body.classList.contains('bm-concert') && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { // laptop: 1 tot en met 4 voor het eerste open criterium, Enter voor verder
    if (['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); const x = bmCsMerk(); const k = x && x.querySelectorAll('.bm-knoppen button:not(.tussen)')[+e.key - 1]; if (k) k.click(); return; }
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { const k = document.querySelector('.bm-cs [data-bm="volgende"],.bm-cs [data-bm="gverder"]'); if (k) { e.preventDefault(); k.click(); } return; } }
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
function leesRoute() { if (/^#groepen(\/|$)/.test(location.hash)) history.replaceState(null, '', '#jaar'); // oude links
  const [n, ...a] = location.hash.replace('#', '').split('/'); route = { naam: ROUTES.some(r => r[0] === n) || ['beoordelen', 'regie', 'bord', 'kompas'].includes(n) ? n : 'nu', arg: a }; }
window.addEventListener('hashchange', () => { const was = route.naam; leesRoute(); if (was === 'vandaag' && route.naam !== 'vandaag') dagKeuze = null; sluit(); /* Dag begint weer op vandaag na een ander scherm (bevinding 54) */ if (NW) nwDicht();
  if (route.naam === 'bord' && !LES) { document.body.classList.add('bordvenster'); startLes(decodeURIComponent(route.arg[0] || ''), route.arg[1] || vandaag(), true); return; } // opent de browser het bord in hetzelfde venster
  render(); window.scrollTo(0, 0); });

/* ---------- beoordelen ----------
   Modellen: data/beoordeling.json (uit tools/beoordeling, zonder leerlinggegevens). Rekenregels: bm-reken.js.
   Klassenlijsten en scores staan in S.beoord: op je apparaten en, met synchroniseren aan, op de server achter de login (besluit Frans, 3-11).
   Logboek en gekozen map staan in IndexedDB, los van de staat: een overschreven staat of volle localStorage raakt ze niet. */
let BM = [];
let bmTerug = null, bmSel = null, bmSelG = null, bmActiefG = null, bmPaneel = null, bmKoppel = null, bmKlasRes = null, bmKlok = null, bmLaagId = null;
let bmMap = null, bmMapStaat = 'geen', bmLaatste = null, bmVuil = false, bmSinds = 0, bmSchrijfT = null, bmVast = null, bmLogFout = false;
const bmVoor = item => BM.filter(m => (m.lessen || []).some(k => k.lg === item.lg && k.w === item.w && k.slot === 'l' + item.li && (k.wat || []).includes('docent')));
const komma = x => x == null ? '' : String(x).replace('.', ',');
const bmKanMap = () => typeof window.showDirectoryPicker === 'function';
const bmTijd = t => { const d = new Date(t); return `${fmtD(ymd(d))} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
function bmToets(mid, g) { const k = mid + '|' + g; return S.beoord.toetsen[k] || (S.beoord.toetsen[k] = { ll: {}, volgorde: [], start: vandaag() }); }
function bmRij(L, id) { return L.ll[id] || (L.ll[id] = { s: {}, v: {}, opm: {} }); }
const bmLaag = T => (bmLaagId === 'herkans' && T.herkans) || (T.tussen || []).find(x => x.id === bmLaagId) || T;
function bmVolgorde(T, lijst) { const ids = lijst.map(x => x.id); const v = (T.volgorde || []).filter(id => ids.includes(id)); ids.forEach(id => { if (!v.includes(id)) v.push(id); }); T.volgorde = v;
  if (!(T.groepjes || []).length) return v; const rang = id => { const i = T.groepjes.findIndex(g => g.leden.includes(id)); return i < 0 ? T.groepjes.length : i; }; return v.map((id, i) => [rang(id), i, id]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]); }
function bmParse(txt) { // Magister: één leerling per regel, kolommen met tabs; nummers, klascodes en een datum vallen weg
  return String(txt).split(/\r?\n/).filter(r => !r.split('\t').some(x => /^(nr\.?|nummer|naam|leerlingen|leerling|achternaam|roepnaam|voornaam|tussenvoegsel|stamnummer|klas|groep)$/i.test(x.trim()))).map(r => {
    r = r.replace(/(^|\s)\d{1,2}[-\/.]\d{1,2}[-\/.](\d{4}|\d{2})(?=\s|$)/g, '$1').replace(/(^|\s)\d{4}-\d{2}-\d{2}(?=\s|$)/g, '$1');
    return r.split('\t').map(x => x.trim()).filter(x => x && !/^\d+$/.test(x) && !/^[a-z]{0,2}\d[a-z0-9]{0,3}$/i.test(x)).join(' ').replace(/\s+/g, ' ').trim()
      .replace(/(^|\s)\(?\d{3,}\)?(?=\s|$)/g, '$1').replace(/^\d{1,3}[.)]?\s+/, '').replace(/\s+\(?[a-z]{0,2}\d[a-z0-9]{0,3}\)?$/i, '').replace(/^\(?[a-z]{0,2}\d[a-z0-9]{0,3}\)?\s+/i, '').trim(); }) // ook zonder tabs: stamnummer, lijstnummer en klascode (h3a, (h3a)) vooraan of achteraan
    .filter(naam => naam && !/^(naam|leerling|leerlingen|klas|groep)\b/i.test(naam) && !/\b(roepnaam|voornaam|achternaam|tussenvoegsel|stamnr|stamnummer|leerlingnummer|geboortedatum)\b/i.test(naam)); // kopregels
}
const bmLijstOk = namen => { const w = BMR.lijstWaarschuwing(namen); return !w.length || confirm(`Let op, deze regels vallen op:\n\n${w.slice(0, 8).join('\n')}${w.length > 8 ? `\n… en ${w.length - 8} meer` : ''}\n\nToch opslaan?`); };
function lijstOpslaan(g, txt) { // namen in S.beoord.lijsten (gaat mee met synchroniseren); bekende namen houden hun id en dus hun scores
  const oud = [...(S.beoord.lijsten[g] || []), ...((S.beoord.weg || {})[g] || [])]; const rij = bmParse(txt);
  S.beoord.lijsten[g] = rij.map((naam, i) => oud.find(o => o.naam === naam) || { id: 'l' + Date.now().toString(36) + i, naam });
  return `${rij.length} leerlingen opgeslagen`;
}
function lijstKaart(g, lijst) {
  return `<div class="kaart bm"><h2>Klassenlijst ${esc(g)}</h2><p class="lead">Kopieer de lijst uit Magister en plak hem hieronder, één leerling per regel. Nummers en klascodes haalt Lesdag er zelf uit; dubbele of vreemde namen meldt Lesdag voor het opslaan. De namen staan op dit apparaat en, met synchroniseren aan, op de server achter je login.</p>
    <textarea id="bmLijst" rows="14" style="width:100%;margin:.6rem 0">${esc(lijst.map(x => x.naam).join('\n'))}</textarea>
    <div class="knoppen"><button class="btn hoofd" data-klas="opslaan|${esc(g)}">Opslaan</button><button class="btn" data-klas="dicht|${esc(g)}">Annuleren</button></div></div>`;
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
const bmKrabbelVan = (L, id, c) => (c === 'g' ? (L.gk || {})[id] : (L.ll[id] || {}).krabbel) || [];
const bmToepassen = (L, e) => { // één tik of tekst toepassen
  if (e.a === 'k+' || e.a === 'k') { const oud = bmKrabbelVan(L, e.id, e.c); const nw = e.a === 'k' ? e.w : [...oud, e.w]; if (e.c === 'g') (L.gk = L.gk || {})[e.id] = nw; else bmRij(L, e.id).krabbel = nw; return; }
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
  return `${r}<button class="btn klein" data-bm="reserve">Reserve nu</button><button class="btn klein" data-bm="logboek">Logboek</button><label class="btn klein">Terugzetten<input type="file" accept=".json" data-bmherstel hidden></label>${bmVast === false ? '<span class="chip let">Opslag niet vast</span><button class="btn klein" data-bm="vast">Vast zetten</button><small class="bm-vastuitleg">De browser mag deze cijfers wissen als de schijf vol zit. Tik op Vast zetten, of maak met Reserve nu een kopie.</small>' : ''}${bmLogFout ? '<span class="chip rood">Logboek schrijft niet</span>' : ''}`;
}
function bmStatusVervers() { const el = document.getElementById('bmStatus'); if (el) el.innerHTML = bmStatusHtml(); }

/* panelen */
function bmLijstKaart(g, lijst) {
  return `<div class="kaart bm"><h2>Klassenlijst ${esc(g)}</h2><p class="lead">Kopieer de namen uit Magister en plak ze hieronder, één leerling per regel. Nummers en klascodes haalt de app er zelf uit; dubbele of vreemde namen meldt de app voor het opslaan. De namen staan op dit apparaat en, met synchroniseren aan, op de server achter je login. De cijferkolom voor Magister volgt de volgorde van deze lijst.</p>
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
  const H = T.herkans; const hopen = id => H && (H.wie || []).includes(id) && !(H.ll[id] || {}).vast && BMR.eind(m, H, T, id).e != null;
  const rij = lijst.map(x => { const r = T.ll[x.id]; const u = BMR.eind(m, T, T, x.id); const p = BMR.poging(T, x.id); return { id: x.id, naam: x.naam, r, u, p, c: BMR.fmt(p.e) }; });
  const open = rij.filter(x => !(x.r && x.r.vast) && x.u.e != null && !(x.r && x.r.af)); const leeg = rij.filter(x => !x.c).length; const hOpen = rij.filter(x => hopen(x.id));
  const noot = x => { const f = BMR.fmt, p = x.p; if (p.e2 != null) return p.e1 == null ? 'herkansing telt (eerste poging staat open)' : p.p === 2 ? `herkansing telt (eerste poging: ${f(p.e1)})` : p.e2 === p.e1 ? 'eerste poging telt (herkansing even hoog)' : `eerste poging telt (herkansing: ${f(p.e2)})`; if (hopen(x.id)) return 'herkansing nog afronden'; if (x.c) return H && (H.wie || []).includes(x.id) ? 'herkansing nog niet gescoord' : ''; return x.r && x.r.af ? 'inhalen' : x.u.e != null ? 'nog afronden' : 'geen cijfer'; };
  return `<div class="kaart bm"><h2>Cijferkolom voor Magister</h2><p class="lead">In de volgorde van de klassenlijst, één regel per leerling. Alleen afgeronde cijfers; bij inhalen of zonder cijfer blijft de cel leeg.${H ? ' Na een herkansing staat hier het hoogste afgeronde cijfer.' : ''} Klik in Magister op de eerste cel van de kolom en plak.</p>
    ${open.length ? `<p class="bm-waarsch">${open.length} ${open.length === 1 ? 'leerling heeft' : 'leerlingen hebben'} een cijfer dat nog niet is afgerond. <button class="btn klein hoofd" data-bm="afronden" data-laag="toets">Nu afronden</button></p>` : ''}
    ${hOpen.length ? `<p class="bm-waarsch">${hOpen.length} ${hOpen.length === 1 ? 'herkansing is' : 'herkansingen zijn'} nog niet afgerond en ${hOpen.length === 1 ? 'telt' : 'tellen'} dus nog niet mee. <button class="btn klein hoofd" data-bm="afronden" data-laag="herkans">Nu afronden</button></p>` : ''}
    <div class="knoppen"><button class="btn hoofd" data-bm="kolomkopie" ${rij.some(x => x.c) ? '' : 'disabled'}>Kopieer kolom</button><button class="btn" data-bm="dicht">Terug</button></div>
    <p>${rij.length} regels, ${rij.length - leeg} cijfers, ${leeg} leeg.</p>
    <textarea id="bmKolom" readonly hidden rows="4">${esc(BMR.kolom(T, lijst).join('\n'))}</textarea>
    <table class="bm-kolom"><thead><tr><th>Leerling</th><th>Cijfer</th><th></th></tr></thead><tbody>${rij.map(x => `<tr><td>${esc(x.naam)}</td><td class="c">${esc(x.c)}</td><td>${esc(noot(x))}</td></tr>`).join('')}</tbody></table></div>`;
}
function bmHerkansKaart(m, T, lijst) {
  const H = T.herkans || { wie: [], ll: {} }; const cijfer = id => BMR.fmt(((T.ll[id] || {}).vast || {}).e);
  const inn = lijst.filter(x => H.wie.includes(x.id)); const uit = lijst.filter(x => !H.wie.includes(x.id));
  const kan = uit.filter(x => (T.ll[x.id] || {}).vast).sort((a, b) => T.ll[a.id].vast.e - T.ll[b.id].vast.e); const niet = uit.filter(x => !(T.ll[x.id] || {}).vast);
  const reden = x => { const r = T.ll[x.id]; return r && r.af ? 'eerst inhalen' : BMR.eind(m, T, T, x.id).e != null ? 'eerst afronden' : 'nog geen cijfer'; };
  return `<div class="kaart bm"><h2>Wie herkanst?</h2><p class="lead">Tik op de namen. Alleen wie een afgerond cijfer heeft, kan herkansen. Een leerling die afwezig was, haalt eerst in op de tab Toets. De eerste poging blijft bewaard en het hoogste afgeronde cijfer telt.</p>
    <h3 class="bm-groep">Herkanst (${inn.length})</h3><div class="bm-chips">${inn.map(x => { const v = (H.ll[x.id] || {}).vast; return `<button class="bm-chip in" data-bmhwie="${x.id}" ${v ? 'disabled title="De herkansing is afgerond. Zet hem eerst open met Wijzigen."' : ''}>${esc(x.naam)} <small>${cijfer(x.id)}${v ? ' · afgerond' : ''}</small></button>`; }).join('') || '<small>Nog niemand</small>'}</div>
    <h3 class="bm-groep">Kan herkansen (${kan.length}) <small>laagste cijfer eerst</small></h3><div class="bm-chips">${kan.map(x => `<button class="bm-chip" data-bmhwie="${x.id}">${esc(x.naam)} <small>${cijfer(x.id)}</small></button>`).join('') || '<small>Niemand</small>'}</div>
    ${niet.length ? `<h3 class="bm-groep">Nog niet (${niet.length})</h3><div class="bm-chips">${niet.map(x => `<button class="bm-chip" disabled>${esc(x.naam)} <small>${reden(x)}</small></button>`).join('')}</div>` : ''}
    <div class="knoppen" style="margin-top:.7rem"><button class="btn hoofd" data-bm="herkansklaar">Klaar</button></div></div>`;
}
// wat er in de lijst achter de naam staat: het cijfer van deze laag en, zodra er een herkansing is, welke poging telt
function bmPogCel(L, T, id, u) { const r = L.ll[id]; const f = BMR.fmt; const p = BMR.poging(T, id); const H = L === T.herkans;
  const nu = BMR.isPoging(L, T) && r && r.vast ? f(u.e) + ' ✓' : r && r.af ? 'inhalen' : u.e != null ? komma(u.e) : u.d != null ? u.mist.join(', ') + '?' : '';
  if (H) return `<small>1e ${f(p.e1) || 'open'}</small> ${nu}${r && r.vast && p.p === 2 ? ' telt' : ''}`;
  if (L !== T) return nu;
  if (p.e2 != null) return p.p === 2 ? `<small>${nu}</small> ${f(p.e2)} telt` : `${nu} telt <small>herk. ${f(p.e2)}</small>`;
  return T.herkans && (T.herkans.wie || []).includes(id) ? `${nu} <small>herkanst</small>` : nu; }
function bmGroepjesKaart(m, T, lijst) {
  const G = T.groepjes || []; const naam = id => (lijst.find(x => x.id === id) || {}).naam || ''; const los = lijst.filter(x => !BMR.groepVan(T, x.id));
  if (!G.some(x => x.id === bmActiefG)) bmActiefG = G.length ? G[G.length - 1].id : null;
  const groepC = BMR.critVan(m, T).filter(c => c.groepsscore).map(c => c.naam + (c.groepsscore === 'start' ? ' (startpunt)' : ''));
  return `<div class="kaart bm"><h2>Groepjes</h2><p class="lead">Eén keer scoren voor de groep: ${esc(groepC.join(', '))}. De rest per leerling. Kies een groepje en tik op de namen. Tik op een naam in een groepje om die eruit te halen.</p>
    ${G.map(x => `<div class="bm-gkaart ${x.id === bmActiefG ? 'actief' : ''}"><div class="regel"><button class="btn klein ${x.id === bmActiefG ? 'hoofd' : ''}" data-bmgactief="${x.id}">${x.id === bmActiefG ? 'Actief' : 'Kies'}</button><input data-bmgnaam="${x.id}" value="${esc(x.naam)}" aria-label="Naam groepje"><button class="btn klein" data-bmgweg="${x.id}">Verwijder</button></div><div class="bm-chips">${x.leden.map(id => `<button class="bm-chip in" data-bmgruit="${id}">${esc(naam(id))}</button>`).join('') || '<small>Nog leeg</small>'}</div></div>`).join('')}
    <div class="knoppen" style="margin:.5rem 0"><button class="btn" data-bm="gnieuw">Nieuw groepje</button><button class="btn hoofd" data-bm="dicht">Klaar</button></div>
    <h3 class="bm-groep">Nog niet ingedeeld (${los.length})</h3><div class="bm-chips">${los.map(x => `<button class="bm-chip" data-bmgin="${x.id}" ${bmActiefG ? '' : 'disabled'}>${esc(x.naam)}</button>`).join('')}</div></div>`;
}
/* ---------- inleverbak: alleen op dit apparaat (map en koppelingen in IndexedDB, niets in S, dus niet naar D1) ---------- */
const bmInl = {}; const BM_AUDIO = /^(mp3|m4a|wav|wma|aif|mpa)$/; const BM_VIDEO = /^(mp4|mov|webm|m4v|avi|wmv|mpg|3gp)$/;
async function bmInlScan(k) { const I = bmInl[k]; const f = []; const loop = async (d, pad, diep) => { for await (const [n, h] of d.entries()) { if (h.kind === 'directory') { if (diep < 3) await loop(h, pad + n + '/', diep + 1); } else if (!/^(\.|~|desktop\.ini$)/i.test(n)) f.push({ naam: n, pad: pad + n, h }); } };
  await loop(I.h, '', 0); I.bestanden = f.sort((a, b) => a.pad.localeCompare(b.pad, 'nl')); I.staat = 'ok'; }
async function bmInlLaden(k) { const I = bmInl[k] = { staat: 'geen', bestanden: [], koppel: {} };
  try { const r = await bmIdb('kv', 'readonly', s => s.get('inlever|' + k)); if (!r) return; I.h = r.h; I.koppel = r.koppel || {}; const p = await I.h.queryPermission({ mode: 'read' }); I.staat = p === 'granted' ? 'ok' : 'toestemming'; if (p === 'granted') await bmInlScan(k); }
  catch (e) { console.warn(e); I.staat = 'fout'; }
  const c = bmHuidig(); const a = document.activeElement; if (c && c.k === k && !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) render(); }
const bmInlBewaar = k => bmIdb('kv', 'readwrite', s => s.put({ h: bmInl[k].h, koppel: bmInl[k].koppel }, 'inlever|' + k)).catch(e => console.warn(e));
function bmInlKnop(b) { return `<button class="btn klein" data-bm="inlspeel" data-pad="${esc(b.pad)}" title="${esc(b.naam)}">▶ ${esc(b.origineel || b.naam)}${b.ext ? '.' + esc(b.ext) : ''}${(n => n ? ` (${+n[1] + 1})` : '')(/\s(\d+)\.[^.]+$/.exec(b.naam))}</button>`; }
function bmInlRegel(k, T, lijst, ids) { const I = bmInl[k]; if (!I || I.staat !== 'ok' || bmConcertAan()) return ''; const per = BMR.koppelInlever(I.bestanden, lijst, T, I.koppel).per; const gezien = new Set(); const b = ids.flatMap(id => per[id] || []).filter(x => !gezien.has(x.pad) && gezien.add(x.pad));
  return `<div class="bm-opnames"><b>Opname</b>${b.length ? b.map(bmInlKnop).join('') : '<span class="bm-nog">nog niet ingeleverd</span>'}</div>`; }
function bmInlKaart(g, T, lijst, k) {
  const I = bmInl[k] || { staat: 'geen', bestanden: [] };
  let h = `<div class="kaart bm"><h2>Inleverbak</h2><p class="lead">Leerlingen leveren hun opname in via een Forms-formulier met een uploadvraag. Forms zet de bestanden in je eigen OneDrive: Apps, Microsoft Forms, de naam van het formulier. Kies die map één keer voor deze toets. Lesdag leest de map alleen en bewaart de koppeling op dit apparaat. Zet de uploadvraag op 1 GB, standaard is het 10 MB.</p>`;
  if (!bmKanMap()) return h + '<p class="bm-waarsch">De inleverbak werkt alleen op de laptop, in Edge of Chrome.</p><div class="knoppen"><button class="btn" data-bm="dicht">Terug</button></div></div>';
  if (I.staat !== 'ok') return h + `${I.staat === 'fout' ? '<p class="bm-waarsch">De map is niet te lezen. Staat hij nog op deze plek?</p>' : ''}<div class="knoppen">${I.staat === 'toestemming' ? `<button class="btn hoofd" data-bm="inltoe">Map ${esc(I.h.name)} toestaan</button>` : ''}<button class="btn ${I.staat === 'geen' ? 'hoofd' : ''}" data-bm="inlkies">Map kiezen</button><button class="btn" data-bm="dicht">Terug</button></div></div>`;
  const R = BMR.koppelInlever(I.bestanden, lijst, T, I.koppel); const n = lijst.filter(x => R.per[x.id].length).length;
  h += `<div class="regel"><b>${n} van ${lijst.length} ingeleverd</b><span class="chip">map ${esc(I.h.name)}</span><button class="btn klein" data-bm="inlscan">Vernieuwen</button><button class="btn klein" data-bm="inlkies">Andere map</button><button class="btn klein" data-bm="dicht">Terug</button></div>`;
  if (R.onbekend.length) h += `<h3 class="bm-groep">Niet herkend (${R.onbekend.length})</h3>${R.onbekend.map(o => `<label class="bm-koppel"><span>${esc(o.naam)}</span><select data-bminlk="${esc(o.pad)}"><option value="">Kies later</option>${lijst.map(x => `<option value="${x.id}" ${o.voorstel === x.id ? 'selected' : ''}>${esc(x.naam)}</option>`).join('')}<option value="x">Niet meetellen</option></select></label>`).join('')}<div class="knoppen"><button class="btn hoofd" data-bm="inlkoppel">Koppelen</button></div>`;
  h += `<table class="bm-kolom bm-inl"><thead><tr><th>Leerling</th><th>Opname</th></tr></thead><tbody>${lijst.map(x => { const b = R.per[x.id]; return `<tr><td>${esc(x.naam)}</td><td>${b.length ? b.map(q => bmInlKnop(q) + (q.via ? ` <small>ingeleverd door ${esc(q.via)}</small>` : '') + (q.hand ? ` <button class="btn klein" data-bm="inlwis" data-pad="${esc(q.pad)}">Koppeling wissen</button>` : '')).join(' ') : '<span class="bm-nog">nog niet</span>'}</td></tr>`; }).join('')}</tbody></table>`;
  if (R.genegeerd) h += `<p class="lead">${R.genegeerd} ${R.genegeerd === 1 ? 'bestand telt' : 'bestanden tellen'} niet mee. <button class="btn klein" data-bm="inlalles">Weer meetellen</button></p>`;
  return h + '</div>';
}
// de speler staat buiten het scherm dat render() vervangt: scoren mag de opname niet stoppen
function bmSpelerSluit() { const d = $('#bmSpeler'); if (!d) return; const v = d.querySelector('audio,video'); if (v) { v.pause(); URL.revokeObjectURL(v.src); } d.remove(); }
async function bmSpeel(b) { let bestand; try { bestand = await b.h.getFile(); } catch (e) { console.warn(e); toast('Dit bestand is niet te openen. Staat het nog in de map?'); return; }
  const q = BMR.leesInlever(b.naam); const url = URL.createObjectURL(bestand); if (!BM_AUDIO.test(q.ext) && !BM_VIDEO.test(q.ext)) { window.open(url, '_blank', 'noopener'); return; }
  bmSpelerSluit(); const tag = BM_AUDIO.test(q.ext) ? 'audio' : 'video'; const d = document.createElement('div'); d.id = 'bmSpeler'; d.innerHTML = `<div class="regel"><b>${esc(b.naam)}</b><button class="btn klein" data-bm="inlstop">Sluiten</button></div><${tag} controls autoplay src="${url}"></${tag}>`; document.body.appendChild(d);
  d.querySelector(tag).addEventListener('error', () => { const p = document.createElement('p'); p.className = 'bm-waarsch'; p.innerHTML = `De browser speelt dit bestand niet af. <a download="${esc(b.naam)}" href="${url}">Bestand opslaan</a>`; d.appendChild(p); }); }
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#beoordelen')) bmSpelerSluit(); });
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
  const cs = bmConcertAan();
  const naam = id => (lijst.find(x => x.id === id) || {}).naam || ''; const gs = (L.gs || {})[G.id] || {};
  let h = `<div class="kaart bm-scoor"><div class="kop"><h2>${esc(G.naam)}</h2><div class="knoppen"><button class="btn klein" data-bm="klok"><span id="bmKlok">${bmKlok ? pad(Math.floor((Date.now() - bmKlok) / 1000)) : '0:00'}</span>&nbsp;${bmKlok ? 'stop' : 'start'}</button></div></div><p class="lead">${esc(G.leden.map(naam).join(', ') || 'Nog geen leden')}</p>${cs ? '<div class="bm-cs-duo"><div>' : ''}`;
  for (const c of BMR.critVan(m, T).filter(x => x.groepsscore)) { const v = gs[c.id] == null ? null : gs[c.id];
    h += `<div class="bm-crit grp"><div class="bm-cnaam"><b>${esc(c.naam)}</b><small>${esc(c.uitleg || '')} · weegt ${c.weging}×${c.groepsscore === 'start' ? ' · startpunt: telt pas na bevestiging per leerling' : ''}</small></div>
      <div class="bm-rij">${bmKnoppen(esc(c.id) + '|', 'data-bmgs', v, false)}${v != null ? `<button type="button" class="bm-wis" data-bmgswis="${esc(c.id)}" aria-label="Score wissen" title="Score wissen">×</button>` : ''}</div><p class="bm-niv">${esc(bmNiveauTekst(c, v))}</p></div>`; }
  const kr = bmKrabbelHtml(bmKrabbelVan(L, G.id, 'g'), false); h += cs ? '</div>' + kr + '</div>' : kr;
  return h + `<div class="bm-voet"><div><span>Geldt voor iedereen zonder eigen score</span></div><div class="knoppen"><button class="btn hoofd" data-bm="gverder">Naar de leerlingen</button></div></div></div>`;
}
function bmBladInfo(m, g, T, L, id, naam) { // alles wat op het feedbackblad komt
  const r = L.ll[id] || { s: {}, v: {}, opm: {} }; const u = BMR.eind(m, L, T, id); const D = u.delen; const tus = !BMR.isPoging(L, T); const H = L === T.herkans; const dicht = !tus && !!r.vast;
  const tekst = (c, v) => { if (v == null) return ''; const i = [4, 6, 8, 10].indexOf(v); return i >= 0 ? ((c.leerling || c.docent || [])[i] || '') : `Tussen ${v - 1} en ${v + 1}.`; };
  const onderdelen = bmOnderdelen(m, T).map(o => ({ groep: o.groep, opm: (r.opm || {})[o.groep] || '', crit: o.criteria.map(c0 => { const c = BMR.critVoor(m, c0, BMR.veldenVan(L, T, id)); const q = dicht ? (r.vast.s[c.id] || {}) : BMR.scoreVan(L, T, id, c); const v = q.v == null ? null : q.v; return { naam: c.naam, score: v, tekst: tekst(c, v), bron: q.b === 'groep' ? 'groepsscore' : '' }; }) }));
  const cijfers = tus ? [['Tussenstand', u.e == null ? '' : BMR.fmt(u.e), true]] : m.speelkeuze && D.docent === 100 ? [['Cijfer', BMR.fmt(u.e), true]] : D.docent < 100 ? [[`Cijfer docent (${D.docent}%)`, BMR.fmt(u.d)], ...(D.zelf ? [[(m.zelfSoort === 'cijfer' ? 'Eigen cijfer' : 'Zelfbeoordeling') + ` (${D.zelf}%)`, BMR.fmt(u.z)]] : []), ...(D.klasgenoten ? [[`Klasgenoten (${D.klasgenoten}%, ${u.kn} inzendingen)`, BMR.fmt(u.k)]] : []), ['Eindcijfer', BMR.fmt(u.e), true]] : [['Cijfer', BMR.fmt(u.d), true]];
  if (H) { const p = BMR.poging(T, id); if (p.e1 != null) cijfers.push(['Eerste poging', BMR.fmt(p.e1)]); if (p.e2 != null) cijfers.push(['Telt voor het cijfer', BMR.fmt(p.e), true]); }
  const rv = H ? BMR.veldenVan(L, T, id) : r.v || {}; const velden = (m.velden || []).map(v => rv[v] ? `${v}: ${rv[v]}` : '').filter(Boolean).join(' · ');
  const grp = BMR.groepVan(T, id); const krabbels = [['Aantekening met de pen', r.krabbel || []], [`Aantekening met de pen bij de groep${grp && grp.naam ? ' ' + grp.naam : ''}`, grp ? (L.gk || {})[grp.id] || [] : []]].filter(k => k[1].length).map(([kop, strepen]) => ({ kop, strepen }));
  return { krabbels, eyebrow: `${m.klas} · ${m.toets}${m.weging ? ' · weging ' + m.weging : ''}`, titel: m.titel, docTitel: `Feedback ${m.toets}${H ? ' herkansing' : ''}`, naam, regel: [`Groep ${g}`, velden].filter(Boolean).join(' · '), banner: tus ? `Tussenstand ${L.naam} (${fmtD(L.op)}): telt niet mee voor het cijfer` : H ? 'Herkansing: tweede poging, het hoogste cijfer telt' : '',
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
  const spook = dicht ? (q.b === 'groep' ? q.v : null) : q.g; const H = L === T.herkans; const inGroep = !dicht && !H && BMR.groepVan(T, id) && c.groepsscore;
  let bron = ''; if (inGroep) { if (eigen != null) bron = `Eigen score${q.g != null ? `, groep gaf ${q.g}` : ''}`; else if (q.g != null) bron = c.groepsscore === true ? `Groepsscore ${q.g} geldt` : `Startpunt groep ${q.g}: tik om te bevestigen of wijk af`; else bron = 'Nog geen groepsscore'; }
  else if (dicht && q.b === 'groep') bron = 'Groepsscore';
  else if (H && eigen == null) { const e = (((T.ll[id] || {}).vast || {}).s || {})[c.id]; if (e && e.b === 'groep') bron = `Eerste poging: groepsscore ${e.v}. Hier telt alleen je eigen score`; }
  const toon = q.v == null ? q.g : q.v;
  return `<div class="bm-crit ${c.groepsscore ? 'grp' : ''}"><div class="bm-cnaam"><b>${esc(c.naam)}</b><small>${esc(c.uitleg || '')} · weegt ${c.weging}×</small></div>
    <div class="bm-rij">${bmKnoppen(esc(c.id) + '|', 'data-bmscore', eigen, dicht, spook)}${!dicht && eigen != null ? `<button type="button" class="bm-wis" data-bmwis="${esc(c.id)}" aria-label="Score wissen" title="Score wissen">×</button>` : ''}</div>
    <p class="bm-niv">${bron ? `<b>${esc(bron)}.</b> ` : ''}${esc(bmNiveauTekst(c, toon))}</p></div>`;
}
/* concertstand: donker en rustig tijdens het spelen; krabbel met de pen, komt ook op het feedbackblad (besluit Frans 4-11; streken vereenvoudigd tegen groei van localStorage). Keuze per apparaat in AP.concert */
function bmConcertAan() { const c = AP.concert && !bmPaneel && bmHuidig(); return !!c && (S.beoord.lijsten[c.g] || []).length > 0; }
function bmCsMerk() { const C = [...document.querySelectorAll('.bm-cs .bm-crit')]; C.forEach(x => x.classList.remove('actief')); const x = C.find(y => !y.querySelector('[aria-pressed="true"],.spook') && y.querySelector('.bm-knoppen button:not(:disabled)')); if (x) x.classList.add('actief'); return x; }
const bmKrabbelHtml = (strepen, dicht) => dicht && !strepen.length ? '' : `<div class="bm-krabbel"><svg viewBox="0 0 1000 750" ${dicht ? '' : 'data-bmkrabbel'} role="img" aria-label="Krabbel, komt ook op het feedbackblad">${strepen.map(s => `<polyline points="${esc(s)}"/>`).join('')}</svg>
  <div class="regel"><small>Krabbel: komt ook op het feedbackblad. Schrijf geen dingen die de leerling niet mag lezen.</small>${dicht ? '' : '<span class="knoppen"><button type="button" class="btn klein" data-bm="kterug">Stap terug</button><button type="button" class="btn klein" data-bm="kwis">Wis</button></span>'}</div></div>`;
let bmStreep = null; let bmPenGezien = false;
function bmDun(P, eps) { // Ramer-Douglas-Peucker: minder punten per streek, zelfde uiterlijk; houdt de bewaarde staat klein
  if (P.length < 3) return P; const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1; const stap = [[0, P.length - 1]];
  while (stap.length) { const [a, b] = stap.pop(); let dm = 0, im = -1; const [x1, y1] = P[a], [x2, y2] = P[b]; const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) { const d = l ? Math.abs(dy * (P[i][0] - x1) - dx * (P[i][1] - y1)) / l : Math.hypot(P[i][0] - x1, P[i][1] - y1); if (d > dm) { dm = d; im = i; } }
    if (dm > eps && im > 0) { keep[im] = 1; stap.push([a, im], [im, b]); } }
  return P.filter((_, i) => keep[i]); }
function bmPunt(e) { const q = bmStreep; const b = q.v.getBoundingClientRect(); const x = Math.round((e.clientX - b.left) / b.width * 1000); const y = Math.round((e.clientY - b.top) / b.height * 750); const v = q.pt[q.pt.length - 1]; if (v && Math.hypot(x - v[0], y - v[1]) < 4) return; q.pt.push([x, y]); q.p.setAttribute('points', q.pt.join(' ')); }
document.addEventListener('pointerdown', e => { const v = e.target.closest && e.target.closest('[data-bmkrabbel]'); if (!v || e.button > 0) return;
  if (e.pointerType === 'pen') bmPenGezien = true; else if (e.pointerType === 'touch' && bmPenGezien) return; // de hand die naast de pen op het scherm rust
  e.preventDefault(); const p = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); v.append(p); bmStreep = { v, p, id: e.pointerId, pt: [] }; try { v.setPointerCapture(e.pointerId); } catch (x) {} bmPunt(e); });
document.addEventListener('pointermove', e => { if (!bmStreep || e.pointerId !== bmStreep.id) return; const L = e.getCoalescedEvents ? e.getCoalescedEvents() : []; (L.length ? L : [e]).forEach(bmPunt); });
function bmStreepKlaar(e) { if (!bmStreep || e.pointerId !== bmStreep.id) return; const q = bmStreep; bmStreep = null; const c = bmHuidig(); if (!c || !q.pt.length) return; if (q.pt.length === 1) q.pt.push(q.pt[0]); q.pt = bmDun(q.pt, 2); const w = q.pt.join(' '); q.p.setAttribute('points', w);
  const T = bmToets(c.m.id, c.g); if (bmSelG) bmZet(c.k, T, 'k+', bmSelG, 'g', w, true); else if (bmSel) bmZet(c.k, T, 'k+', bmSel, null, w, true); }
document.addEventListener('pointerup', bmStreepKlaar); document.addEventListener('pointercancel', bmStreepKlaar);
const bmOnderdelen = (m, T) => { if (!T.vast) return m.onderdelen; const uit = []; for (const c of T.vast.crit) { let o = uit.find(x => x.groep === c.groep); if (!o) uit.push(o = { groep: c.groep, stuk: (m.onderdelen.find(x => x.groep === c.groep) || {}).stuk, criteria: [] }); o.criteria.push(c); } return uit; };
function viewBeoordelenKeuze() { // menu Beoordelen: de toetsen van vandaag, daaronder per klas
  const t = vandaag(); const p = planning(t, t)[t]; const vandaagM = [];
  for (const x of (p && p.uren) || []) if (x.item && !x.uitval) for (const m of bmVoor(x.item)) if (!vandaagM.some(y => y.m === m && y.g === x.u.groep)) vandaagM.push({ m, g: x.u.groep, u: x.u });
  const knop = (m, g) => bmRegel(m, g, `${m.toets} · ${m.titel.replace(/^[^:]*:\s*/, '')}`);
  const groepen = [...new Set((S.rooster || []).map(u => u.groep))].filter(Boolean).sort();
  const perKlas = groepen.map(g => { const lg = leergangVan(g); const ms = BM.filter(m => (m.lessen || []).some(k => k.lg === lg)); return ms.length ? `<div class="jr-regel"><span><b>${esc(g)}</b></span><span class="tb">${ms.map(m => knop(m, g)).join(' ')}</span></div>` : ''; }).join('');
  return `<div class="kop"><div><p class="eyebrow">Beoordelen</p><h1>Kies een toets</h1></div></div>
    <div class="kaart"><h2>Vandaag</h2>${vandaagM.length ? vandaagM.map(y => `<div class="jr-regel"><span><b>${esc(y.u.groep)}</b><small>${esc(y.u.start)}</small></span><span class="tb">${knop(y.m, y.g)}</span></div>`).join('') : '<p class="lead">Vandaag staat er geen toets in je rooster. Kies hieronder een klas om in te halen of na te kijken.</p>'}</div>
    ${perKlas ? `<div class="kaart"><h2>Per klas</h2>${perKlas}</div>` : ''}`;
}
function viewBeoordelen() {
  const m = BM.find(x => x.id === decodeURIComponent(route.arg[0] || '')); const g = decodeURIComponent(route.arg[1] || '');
  if (!route.arg[0]) return viewBeoordelenKeuze();
  if (!m || !g) return `<div class="kaart"><p>Dit beoordelingsmodel is niet gevonden.</p><p><a class="btn" href="#vandaag">Terug naar vandaag</a></p></div>`;
  const lijst = S.beoord.lijsten[g] || []; const heeft = lijst.length > 0;
  let h = `<div class="kop bm"><div><p class="eyebrow">${esc(m.klas)} · groep ${esc(g)} · ${esc(m.toets)}${m.weging ? ' · weging ' + esc(m.weging) : ''}</p><h1>${esc(m.titel)}</h1></div>
    <div class="knoppen">${heeft ? '<button class="btn" data-bm="concert">Concertstand</button>' : ''}<button class="btn" data-bm="lijst">Klassenlijst</button>${heeft && BMR.critVan(m, S.beoord.toetsen[m.id + '|' + g]).some(c => c.groepsscore) ? '<button class="btn" data-bm="groepjes">Groepjes</button>' : ''}${heeft && m.delen && m.delen.klasgenoten ? '<button class="btn" data-bm="klasgenoten">Klasgenoten</button>' : ''}${heeft ? '<button class="btn" data-bm="inlever">Inleverbak</button>' : ''}${heeft ? '<button class="btn" data-bm="kolom">Cijferkolom</button><button class="btn" data-bm="export">Scoreblad downloaden</button>' : ''}<a class="btn" href="${esc(bmTerug || '#vandaag')}">Klaar</a></div></div>
    <div class="bm-status" id="bmStatus">${bmStatusHtml()}</div>`;
  if (bmPaneel === 'koppel' && bmKoppel) return h + bmKoppelKaart(g);
  if (!heeft || bmPaneel === 'lijst') return h + bmLijstKaart(g, lijst);
  const T = bmToets(m.id, g);
  const inlK = m.id + '|' + g; if (bmKanMap() && !bmInl[inlK]) bmInlLaden(inlK);
  if (bmPaneel === 'inlever') return h + bmInlKaart(g, T, lijst, inlK);
  if (bmPaneel === 'kolom') return h + bmKolomKaart(m, g, T, lijst);
  if (bmPaneel === 'herkans') return h + bmHerkansKaart(m, T, lijst);
  if (bmPaneel === 'groepjes') return h + bmGroepjesKaart(m, T, lijst);
  if (bmPaneel === 'klasgenoten') return h + bmKlasKaart(m, T, lijst);
  const L = bmLaag(T); const H = L === T.herkans; const volA = bmVolgorde(T, lijst); const vol = H ? volA.filter(id => T.herkans.wie.includes(id)) : volA; const naam = id => (lijst.find(x => x.id === id) || {}).naam || '';
  if (H && !vol.length) return h + bmHerkansKaart(m, T, lijst);
  const uitk = id => BMR.eind(m, L, T, id); const klaar = id => { const r = L.ll[id]; return (r && r.af) || uitk(id).e != null; };
  const afw = id => { const r = L.ll[id]; return !!(r && r.af) && uitk(id).e == null; }; // afwezig telt niet mee in "x van y klaar"
  const cur = vol.includes(bmSel) ? bmSel : (vol.find(id => !klaar(id)) || vol[0]); bmSel = cur;
  const cijfers = vol.map(id => uitk(id).e).filter(x => x != null); const A = H ? L : T; const nVast = vol.filter(id => A.ll[id] && A.ll[id].vast).length; const nOpen = vol.filter(id => !(A.ll[id] && (A.ll[id].vast || A.ll[id].af)) && BMR.eind(m, A, T, id).e != null).length; const laatst = H ? L.laatst : T.vast && T.vast.laatst;
  h += `<div class="bm-lagen"><button class="btn klein ${L === T ? 'hoofd' : ''}" data-bmlaag="">Toets</button>${BMR.magHerkansen(m, T) ? `<button class="btn klein ${H ? 'hoofd' : ''}" data-bmlaag="herkans">Herkansing${T.herkans && T.herkans.wie.length ? ` (${T.herkans.wie.length})` : ''}</button>` : ''}${H ? '<button class="btn klein" data-bm="herkanswie">Wie herkanst?</button>' : ''}${(T.tussen || []).map(x => `<button class="btn klein ${L === x ? 'hoofd' : ''}" data-bmlaag="${x.id}">${esc(x.naam)}</button>`).join('')}<button class="btn klein" data-bm="tussennieuw">+ Tussenstand</button>${L !== T && !H ? '<button class="btn klein" data-bm="tussenweg">Verwijder deze</button>' : ''}</div>
    ${L !== T && !H ? `<p class="bm-vast"><b>Tussenstand ${esc(L.naam)}.</b> Telt niet mee voor het cijfer en krijgt geen kolom in Magister.</p>` : ''}`;
  const gKop = H ? 0 : (T.groepjes || []).length; const G = gKop && bmSelG ? T.groepjes.find(x => x.id === bmSelG) : null; if (!G) bmSelG = null;
  if (bmConcertAan()) { const opt = id => `<option value="${id}" ${!G && id === cur ? 'selected' : ''}>${esc(naam(id))}${klaar(id) ? ' ✓' : ''}</option>`;
    const keuze = gKop ? [...T.groepjes.map(x => `<optgroup label="${esc(x.naam)}"><option value="g:${x.id}" ${G === x ? 'selected' : ''}>${esc(x.naam)}: hele groep</option>${vol.filter(id => x.leden.includes(id)).map(opt).join('')}</optgroup>`), vol.filter(id => !BMR.groepVan(T, id)).map(opt).join('')].join('') : vol.map(opt).join('');
    return `<div class="bm-cs-top"><span>${esc(m.toets)} · ${esc(g)}${H ? ' · herkansing' : L !== T ? ' · tussenstand ' + esc(L.naam) : ''} · ${G ? esc(G.naam) : `speler ${vol.indexOf(cur) + 1} van ${vol.length}`}</span><small class="bm-cs-wenk">Toets 1 = cijfer 4, 2 = 6, 3 = 8, 4 = 10 (de knoppen daartussen tik je aan). Enter voor verder</small><select data-bmcskies aria-label="Kies een leerling of groepje">${keuze}</select><button class="btn klein" data-bm="concert">Uit</button></div><div class="bm-status" id="bmStatus">${bmStatusHtml()}</div><div class="bm-cs">${G ? bmGroepKaart(m, T, L, G, lijst) : bmScoorKaart(m, T, L, cur, naam(cur))}</div>`; }
  const rijHtml = id => { const r = L.ll[id]; const u = uitk(id); return `<li class="${!G && id === cur ? 'nu' : ''} ${klaar(id) ? 'klaar' : ''}"><button class="bm-naam" data-bmkies="${id}">${esc(naam(id))}</button><span class="bm-c">${bmPogCel(L, T, id, u)}</span>${H ? '' : `<span class="bm-pijl"><button class="btn klein" data-bmop="${id}|-1" aria-label="eerder">▲</button><button class="btn klein" data-bmop="${id}|1" aria-label="later">▼</button></span>`}</li>`; };
  h += `<div class="bm-raster"><div class="kaart bm-lijst"><div class="regel"><b>${vol.filter(id => uitk(id).e != null).length} van ${vol.length - vol.filter(afw).length} klaar</b>${vol.some(afw) ? `<span class="chip">${vol.filter(afw).length} afwezig, inhalen</span>` : ''}${cijfers.length ? `<span class="chip">gemiddeld ${komma(BMR.rond1(cijfers.reduce((a, b) => a + b, 0) / cijfers.length))}</span>` : ''}${H ? '' : '<button class="btn klein" data-bm="loten">Volgorde loten</button>'}</div>
    ${BMR.isPoging(L, T) && (laatst || nOpen) ? `<div class="regel">${laatst ? `<span class="chip">${nVast} afgerond · ${esc(bmTijd(laatst))}</span>` : ''}${nOpen ? `<button class="btn klein hoofd" data-bm="afronden">Afronden (${nOpen})</button>` : ''}</div>` : ''}
    <div class="regel"><button class="btn klein" data-bm="pdfalle">Alle feedbackbladen</button></div>
    <ol>${gKop ? [...T.groepjes.map(x => `<li class="bm-gkop ${G === x ? 'nu' : ''}"><button class="bm-naam" data-bmgkies="${x.id}">${esc(x.naam)}${(L.gs || {})[x.id] && Object.keys(L.gs[x.id]).length ? ' ✓' : ''}</button></li>${vol.filter(id => x.leden.includes(id)).map(rijHtml).join('')}`), vol.some(id => !BMR.groepVan(T, id)) ? '<li class="bm-gkop"><span class="bm-naam">Geen groepje</span></li>' + vol.filter(id => !BMR.groepVan(T, id)).map(rijHtml).join('') : ''].join('') : vol.map(rijHtml).join('')}</ol></div>`;
  const inlR = bmInlRegel(inlK, T, lijst, G ? G.leden : [cur]); const scoor = G ? bmGroepKaart(m, T, L, G, lijst) : bmScoorKaart(m, T, L, cur, naam(cur));
  return h + (inlR ? `<div class="bm-rechts">${inlR}${scoor}</div>` : scoor) + '</div>';
}
// een veld met vaste keuzes (m.keuzes) wordt een keuzelijst; een eerder getypte waarde blijft als eigen keuze staan
function bmVeldHtml(m, v, w) {
  const k = (m.keuzes || {})[v]; if (!k) return `<label>${esc(v)}<input data-bmveld="${esc(v)}" value="${esc(w || '')}"></label>`;
  const opt = (!w || k.includes(w) ? k : [w, ...k]).map(x => `<option ${x === w ? 'selected' : ''}>${esc(x)}</option>`).join('');
  return `<label>${esc(v)}<select data-bmveld="${esc(v)}"><option value=""${w ? '' : ' selected'}>Kies…</option>${opt}</select></label>`;
}
function bmSpeelHtml(m, v) {
  const k = m.speelkeuze; if (!k) return ''; const n = BMR.niveauVan(m, v);
  const delen = [k.opmerking]; if (n) delen.unshift(`${n.naam}${n.wat ? ': ' + n.wat : ''}.${n.plafond != null ? ` Plafond ${komma(n.plafond)}.` : ''}`); const heeftPl = (k.niveaus || []).some(x => x.plafond != null);
  return `<p class="bm-niv">${n || !heeftPl ? '' : '<b>Nog geen niveau: er geldt geen plafond.</b> '}${esc(delen.filter(Boolean).join(' '))}</p>`;
}
function bmScoorKaart(m, T, L, cur, naam) {
  const r = bmRij(L, cur); const H = L === T.herkans; const pog = BMR.poging(T, cur); const dicht = BMR.isPoging(L, T) && !!r.vast; const u = BMR.eind(m, L, T, cur); const D = u.delen; const zb = D.zelf || 0; const cs = bmConcertAan(); const rv = BMR.veldenVan(L, T, cur);
  let h = `<div class="kaart bm-scoor"><div class="kop"><h2>${esc(naam)}</h2><div class="knoppen"><button class="btn klein" data-bm="klok"><span id="bmKlok">${bmKlok ? pad(Math.floor((Date.now() - bmKlok) / 1000)) : '0:00'}</span>&nbsp;${bmKlok ? 'stop' : 'start'}</button>${H ? '' : `<label class="chk"><input type="checkbox" data-bmaf ${r.af ? 'checked' : ''} ${dicht ? 'disabled' : ''}><span>afwezig, inhalen</span></label>`}</div></div>
    ${H ? `<p class="bm-vast"><b>Herkansing.</b> Eerste poging: ${BMR.fmt(pog.e1) || 'staat open'}. ${pog.e2 == null ? 'Het hoogste afgeronde cijfer telt.' : pog.p === 2 ? `Deze herkansing telt: ${BMR.fmt(pog.e2)}.` : pog.e2 === pog.e1 ? 'Even hoog: de eerste poging blijft staan.' : `De eerste poging blijft tellen: ${BMR.fmt(pog.e1)}.`}</p>` : L === T && pog.e2 != null ? `<p class="bm-vast"><b>Herkansing:</b> ${BMR.fmt(pog.e2)}. ${pog.p === 2 ? 'Die telt.' : 'De eerste poging blijft tellen.'}</p>` : ''}
    ${dicht ? `<p class="bm-vast"><b>Afgerond</b> op ${esc(bmTijd(r.vast.op))} met cijfer ${BMR.fmt(r.vast.e)}. <button class="btn klein" data-bm="heropen">Wijzigen</button></p>` : ''}
    ${cs ? '<div class="bm-cs-duo"><div>' : ''}<div class="bm-velden">${(cs ? [] : m.velden || []).map(v => bmVeldHtml(m, v, rv[v])).join('')}</div>${cs ? '' : bmSpeelHtml(m, rv)}`;
  for (const o of bmOnderdelen(m, T)) {
    h += `<h3 class="bm-groep">${esc(o.groep)}${o.stuk ? ` <small>${esc(o.stuk)}</small>` : ''}</h3>`;
    for (const c of o.criteria) h += bmCritHtml(BMR.critVoor(m, c, rv), L, T, cur, r, dicht);
    if (!cs) h += `<label class="bm-opm">Opmerking ${esc(o.groep.toLowerCase())}<textarea rows="2" data-bmopm="${esc(o.groep)}">${esc(r.opm[o.groep] || '')}</textarea></label>`;
  }
  const zv = dicht ? r.vast.z : (r.zelf == null ? null : r.zelf);
  if (cs) {} // eigen cijfer, klasgenoten en het punt om aan te werken vul je na het spelen in
  else if (zb && m.zelfSoort === 'cijfer') h += `<h3 class="bm-groep">Eigen cijfer <small>${zb}% van het eindcijfer: het overall-cijfer dat de leerling zichzelf geeft</small></h3>
    <label class="bm-cijfer">Cijfer van de leerling<input data-bmzelfc inputmode="decimal" value="${zv == null ? '' : komma(zv)}" ${dicht ? 'disabled' : ''}></label>`;
  else if (zb) h += `<h3 class="bm-groep">Zelfbeoordeling <small>${zb}% van het eindcijfer: ${m.strookje ? esc(m.strookje.score) : 'hoe eerlijk en concreet beoordeelt de leerling de eigen uitvoering?'}</small></h3>
    <div class="bm-rij">${bmKnoppen('', 'data-bmzelf', zv, dicht)}${!dicht && zv != null ? '<button type="button" class="bm-wis" data-bmwis="" aria-label="Score wissen" title="Score wissen">×</button>' : ''}</div>`;
  if (D.klasgenoten && !cs) { const k = (r.klas || {}); const min = +m.klasgenotenMin || 3; h += `<h3 class="bm-groep">Klasgenoten <small>${D.klasgenoten}% van het eindcijfer, minimaal ${min} inzendingen</small></h3>
    <p class="bm-niv"><b>${u.k != null ? 'Gemiddeld ' + komma(u.k) : 'Nog geen gemiddelde'}</b> uit ${u.kn} ${u.kn === 1 ? 'inzending' : 'inzendingen'}${(k.forms || []).length ? ` (${k.forms.length} uit Forms)` : ''}.${!dicht && u.k == null ? ' Geen eindcijfer zolang dit deel ontbreekt.' : ''}</p>
    <label class="bm-cijfer">Papieren cijfers, met spaties ertussen<input data-bmpapier inputmode="decimal" value="${esc((k.papier || []).map(komma).join(' '))}" ${dicht ? 'disabled' : ''}></label>`; }
  const kr = bmKrabbelHtml(r.krabbel || [], dicht); h += cs ? '</div>' + kr + '</div>' : `<label class="bm-opm">${esc(m.vooruit || 'Eén punt om aan te werken')}<textarea rows="2" data-bmvooruit>${esc(r.vooruit || '')}</textarea></label>` + kr;
  h += `<div class="bm-voet"><div><span>${BMR.isPoging(L, T) ? 'Cijfer docent' : 'Tussenstand'} <b>${u.d != null ? komma(u.d) : '–'}</b></span>${D.docent < 100 || m.speelkeuze ? `<span>Eindcijfer <b>${u.e != null ? komma(u.e) : '–'}</b></span>${u.mist.length && u.d != null ? `<small>mist: ${esc(u.mist.join(', '))}</small>` : ''}${u.ruw != null && u.e < u.ruw ? `<small>${komma(u.ruw)} afgetopt op het plafond</small>` : ''}` : ''}</div>
    <div class="knoppen">${cs ? '' : '<button class="btn" data-bm="pdf">Feedbackblad</button>'}<button class="btn" data-bm="vorige">Vorige</button><button class="btn hoofd" data-bm="volgende">Volgende</button></div></div></div>`;
  return h;
}
function bmCsv(m, g) {
  const lijst = S.beoord.lijsten[g] || []; const T = bmToets(m.id, g); const C = BMR.critVan(m, T); const D = BMR.delenVan(m, T);
  const heeftG = C.some(c => c.groepsscore) && (T.groepjes || []).length; const volg = bmVolgorde(T, lijst);
  const kop = ['Leerling', 'Speelvolgorde', ...(heeftG ? ['Groepje'] : []), ...(m.velden || []), ...C.flatMap(c => [`${c.naam} (${c.weging}x)`, ...(heeftG && c.groepsscore ? [`${c.naam}: geldt`] : [])]), D.docent < 100 ? 'Cijfer docent' : 'Cijfer',
    ...(D.zelf ? [`Zelf (${D.zelf}%)`] : []), ...(D.klasgenoten ? [`Klasgenoten (${D.klasgenoten}%)`, 'Inzendingen klasgenoten'] : []), ...(D.docent < 100 || m.speelkeuze ? ['Eindcijfer'] : []), 'Afgerond op', 'Opmerking per onderdeel', m.vooruit || 'Punt om aan te werken'];
  const H = T.herkans; const heeftH = !!H && ((H.wie || []).length > 0 || Object.values(H.ll).some(r => r.vast)); const nBasis = kop.length;
  if (heeftH) kop.push(...(m.velden || []).map(v => 'Herkansing: ' + v), ...C.map(c => `Herkansing: ${c.naam} (${c.weging}x)`), D.docent < 100 ? 'Herkansing: cijfer docent' : 'Herkansing: cijfer', ...(D.zelf ? [`Herkansing: zelf (${D.zelf}%)`] : []), ...(D.klasgenoten ? [`Herkansing: klasgenoten (${D.klasgenoten}%)`] : []), ...(D.docent < 100 || m.speelkeuze ? ['Herkansing: eindcijfer'] : []), 'Herkansing: afgerond op', 'Herkansing: opmerking per onderdeel', 'Herkansing: ' + (m.vooruit || 'punt om aan te werken'), 'Cijfer voor Magister', 'Telt');
  const herkansCel = id => { const r = H.ll[id] || { s: {}, v: {}, opm: {} }; const u = BMR.eind(m, H, T, id); const op = (H.wie || []).includes(id) || r.vast; const p = BMR.poging(T, id); const rv = BMR.veldenVan(H, T, id); const opm = Object.entries(r.opm || {}).filter(([, t]) => t).map(([k, t]) => k + ': ' + t).join(' | ');
    return [...(m.velden || []).map(v => op ? rv[v] || '' : ''), ...C.map(c => { const q = r.vast ? (r.vast.s[c.id] || {}) : BMR.scoreVan(H, T, id, c); return q.v ?? ''; }), op ? komma(u.d) : '', ...(D.zelf ? [op ? komma(u.z) : ''] : []), ...(D.klasgenoten ? [op ? komma(u.k) : ''] : []), ...(D.docent < 100 || m.speelkeuze ? [op ? komma(u.e) : ''] : []), r.vast ? new Date(r.vast.op).toLocaleString('nl-NL') : '', opm, r.vooruit || '', BMR.fmt(p.e), p.e2 == null ? '' : p.p === 2 ? 'herkansing' : 'eerste poging']; };
  const metH = (id, rij) => heeftH ? [...rij, ...Array(Math.max(0, nBasis - rij.length)).fill(''), ...herkansCel(id)] : rij;
  const rijen = lijst.map(x => { const id = x.id; const r = T.ll[id] || { s: {}, v: {}, opm: {} }; const G = BMR.groepVan(T, id); const voor = [x.naam, volg.indexOf(id) + 1, ...(heeftG ? [G ? G.naam : ''] : []), ...(m.velden || []).map(v => (r.v || {})[v] || '')];
    if (r.af && !r.vast) return metH(id, [...voor, ...C.flatMap(c => ['', ...(heeftG && c.groepsscore ? [''] : [])]), '', ...(D.zelf ? [''] : []), ...(D.klasgenoten ? ['', ''] : []), ...(D.docent < 100 || m.speelkeuze ? [''] : []), 'inhalen', '', '']); // evenveel kolommen als de kopregel; "inhalen" staat in Afgerond op, de cijferkolommen blijven leeg
    const u = BMR.eind(m, T, T, id); const opm = Object.entries(r.opm || {}).filter(([, t]) => t).map(([k, t]) => k + ': ' + t).join(' | ');
    return metH(id, [...voor, ...C.flatMap(c => { const q = r.vast ? (r.vast.s[c.id] || {}) : BMR.scoreVan(T, T, id, c); return [q.v ?? '', ...(heeftG && c.groepsscore ? [q.b === 'groep' ? 'groep' : q.b === 'eigen' ? 'eigen' : ''] : [])]; }), komma(u.d),
      ...(D.zelf ? [komma(u.z)] : []), ...(D.klasgenoten ? [komma(u.k), u.kn] : []), ...(D.docent < 100 || m.speelkeuze ? [komma(u.e)] : []), r.vast ? new Date(r.vast.op).toLocaleString('nl-NL') : '', opm, r.vooruit || '']); });
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
  const b = e.target.closest('[data-beoordeel],[data-bm],[data-bmkies],[data-bmop],[data-bmscore],[data-bmzelf],[data-bmwis],[data-bmgs],[data-bmgswis],[data-bmgkies],[data-bmgactief],[data-bmgin],[data-bmgruit],[data-bmgweg],[data-bmlaag],[data-bmhwie]'); if (!b) return;
  const D = b.dataset;
  if (D.beoordeel) { const [mid, g] = D.beoordeel.split('|'); if (route.naam !== 'beoordelen') bmTerug = location.hash || '#vandaag'; bmSel = null; bmPaneel = null; bmLaagId = null; location.hash = 'beoordelen/' + encodeURIComponent(mid) + '/' + encodeURIComponent(g); return; }
  const m = BM.find(x => x.id === decodeURIComponent(route.arg[0] || '')); const g = decodeURIComponent(route.arg[1] || ''); if (!m) return;
  const k = m.id + '|' + g; const T = bmToets(m.id, g); const lijst = S.beoord.lijsten[g] || []; const volA = bmVolgorde(T, lijst); const vol = bmLaag(T) === T.herkans ? volA.filter(id => T.herkans.wie.includes(id)) : volA;
  if (D.bm === 'concert') { AP.concert = !AP.concert; apBewaar(); render(); window.scrollTo(0, 0); return; }
  if (D.bm === 'kterug' || D.bm === 'kwis') { const L = bmLaag(T); const id = bmSelG || bmSel; const c = bmSelG ? 'g' : null; const oud = bmKrabbelVan(L, id, c); if (!oud.length) return; const f = foto(); bmZet(k, T, 'k', id, c, D.bm === 'kwis' ? [] : oud.slice(0, -1)); if (D.bm === 'kwis') toast('Krabbel gewist', f); return; }
  if (D.bm === 'lijst') { bmPaneel = 'lijst'; bmKoppel = null; render(); return; }
  if (D.bm === 'kolom') { bmPaneel = 'kolom'; render(); return; }
  if (D.bm === 'inlever') { bmPaneel = 'inlever'; render(); return; }
  if (D.bm === 'inlstop') { bmSpelerSluit(); return; }
  if (D.bm === 'inlkies') { try { const h = await window.showDirectoryPicker({ id: 'lesdag-inlever', mode: 'read', startIn: 'documents' }); bmInl[k] = { h, koppel: {}, bestanden: [], staat: 'ok' }; await bmInlScan(k); bmInlBewaar(k); } catch (err) { if (err.name !== 'AbortError') { console.warn(err); toast('Deze map is niet te lezen'); } } render(); return; }
  if (D.bm === 'inltoe') { try { const I = bmInl[k]; if (await I.h.requestPermission({ mode: 'read' }) === 'granted') await bmInlScan(k); } catch (err) { console.warn(err); bmInl[k].staat = 'fout'; } render(); return; }
  if (D.bm === 'inlscan') { try { await bmInlScan(k); toast('Map opnieuw gelezen'); } catch (err) { console.warn(err); bmInl[k].staat = 'fout'; } render(); return; }
  if (D.bm === 'inlkoppel') { const I = bmInl[k]; for (const s of document.querySelectorAll('[data-bminlk]')) if (s.value) I.koppel[s.dataset.bminlk] = s.value; bmInlBewaar(k); render(); return; }
  if (D.bm === 'inlwis') { const I = bmInl[k]; delete I.koppel[D.pad]; bmInlBewaar(k); render(); return; }
  if (D.bm === 'inlalles') { const I = bmInl[k]; for (const p of Object.keys(I.koppel)) if (I.koppel[p] === 'x') delete I.koppel[p]; bmInlBewaar(k); render(); return; }
  if (D.bm === 'inlspeel') { const I = bmInl[k]; const b = I && I.bestanden.find(x => x.pad === D.pad); if (b) await bmSpeel(b); return; }
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
  if (D.bmlaag === 'herkans' && !(T.herkans && T.herkans.wie.length)) { bmPaneel = 'herkans'; render(); return; }
  if (D.bmlaag != null) { bmLaagId = D.bmlaag || null; bmSel = null; bmSelG = null; render(); return; }
  if (D.bm === 'herkanswie') { bmPaneel = 'herkans'; render(); return; }
  if (D.bm === 'herkansklaar') { const H = T.herkans; if (H && !H.wie.length && !Object.keys(H.ll).length) delete T.herkans; bmPaneel = null; bmLaagId = T.herkans && T.herkans.wie.length ? 'herkans' : null; bmSel = null; bmSelG = null; render(); return; }
  if (D.bmhwie) { const id = D.bmhwie; const H = T.herkans || (T.herkans = { id: 'herkans', naam: 'Herkansing', op: vandaag(), wie: [], ll: {}, gs: {} }); const i = H.wie.indexOf(id); const rh = H.ll[id];
    if (i >= 0) { if (rh && rh.vast) return; if (rh && Object.keys(rh.s || {}).length && !confirm('Deze leerling van de herkansingslijst halen? De scores blijven bewaard en komen terug als je de leerling weer aantikt.')) return; H.wie.splice(i, 1); bmLog(k, { a: 'herkansing eraf', id, l: H.id }); }
    else { if (!(T.ll[id] || {}).vast) return; H.wie.push(id); bmLog(k, { a: 'herkansing erbij', id, l: H.id }); }
    bmVuil = true; bewaar(); return; }
  if (D.bm === 'tussennieuw') { const naam = prompt('Naam van de tussenstand', 'Generale'); if (!naam || !naam.trim()) return; T.tussen = T.tussen || []; const id = 't' + Date.now().toString(36); T.tussen.push({ id, naam: naam.trim(), op: vandaag(), ll: {}, gs: {} }); bmLaagId = id; bmSel = null; bmSelG = null; bewaar(); return; }
  if (D.bm === 'tussenweg') { const L = bmLaag(T); if (L === T || !confirm(`Tussenstand ${L.naam} verwijderen? Op de toets heeft dit geen invloed.`)) return; bmLog(k, { a: 'tussenweg', w: L.naam }); T.tussen = T.tussen.filter(x => x !== L); bmLaagId = null; bmSel = null; bewaar(); return; }
  if (D.bm === 'klaslees') { bmKlasRes = BMR.leesKlasgenoten($('#bmKlasPlak').value, lijst); render(); return; }
  if (D.bm === 'klasover') { const R = bmKlasRes; for (const s of document.querySelectorAll('[data-bmklask]')) if (s.value) R.per[s.value].push(...R.onbekend[+s.dataset.bmklask].w);
    bmLaagId = null; for (const x of lijst) bmZet(k, T, 'forms', x.id, null, R.per[x.id] || [], true); bmKlasRes = null; bmPaneel = null; bewaar(); toast('Klasgenoten overgenomen'); return; }
  if (D.bm === 'pdf' || D.bm === 'pdfalle') { const L = bmLaag(T); const nm = id => (lijst.find(x => x.id === id) || {}).naam || ''; const bestand = id => `Feedback ${m.toets}${L === T ? '' : L === T.herkans ? ' herkansing' : ' tussenstand ' + L.naam} ${nm(id)}.pdf`.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ');
    try { if (D.bm === 'pdf') { if (BMR.eind(m, L, T, bmSel).d == null) { toast(`${nm(bmSel)} heeft nog geen cijfer: er is nog geen feedbackblad`); return; } bmDownload(bestand(bmSel), await BMPDF.blad(bmBladInfo(m, g, T, L, bmSel, nm(bmSel)))); return; }
      const wie = vol.filter(id => BMR.eind(m, L, T, id).d != null); if (!wie.length) { toast('Er is nog niemand met een cijfer'); return; } toast('Bladen maken…'); const f = []; for (const id of wie) f.push({ naam: bestand(id), blob: await BMPDF.blad(bmBladInfo(m, g, T, L, id, nm(id))) });
      bmDownload(bmBestand(m, g, `feedbackbladen${L === T ? '' : ' ' + L.naam}.zip`), await BMPDF.zip(f)); toast(wie.length + ' feedbackbladen gedownload'); } catch (err) { console.warn(err); toast('Het feedbackblad maken lukt niet'); } return; }
  if (D.bm === 'dicht') { bmPaneel = null; render(); return; }
  if (D.bm === 'lijstopslaan') { const namen = bmParse($('#bmLijst').value); if (!namen.length) { toast('Er staan geen namen in het veld'); return; } if (!bmLijstOk(namen)) return;
    S.beoord.weg = S.beoord.weg || {}; const v = BMR.vergelijkLijst(namen, [...lijst, ...S.beoord.weg[g] || []]);
    if (v.rij.some(u => !u.id) && v.vrij.length) { bmKoppel = v; bmPaneel = 'koppel'; render(); return; }
    bmLijstOpslaan(g, v.rij); return; }
  if (D.bm === 'koppelklaar') { const { rij } = bmKoppel; const gebruikt = new Set(); const sel = [...document.querySelectorAll('[data-bmkop]')]; for (const s of sel) if (s.value) { if (gebruikt.has(s.value)) { toast('Je hebt een leerling twee keer gekozen'); return; } gebruikt.add(s.value); } for (const s of sel) if (s.value) rij[+s.dataset.bmkop].id = s.value; bmLijstOpslaan(g, rij); return; }
  if (D.bm === 'vast') { await bmPersist(); toast(bmVast ? 'Opslag staat nu vast' : 'De browser laat dit niet toe. Maak een reserve met Reserve nu, of kies een reservemap.'); return; }
  if (D.bm === 'export') { bmExport(m, g); return; }
  if (D.bm === 'reserve') { await bmReserveNu(m, g); toast('Reserve gemaakt'); return; }
  if (D.bm === 'mapkies') { try { const h = await window.showDirectoryPicker({ id: 'lesdag-reserve', mode: 'readwrite', startIn: 'documents' }); bmMap = h; bmMapStaat = 'ok'; bmIdb('kv', 'readwrite', s => s.put(h, 'map')).catch(err => console.warn(err)); await bmSchrijf(); toast('Reserve staat nu ook in deze map. Kies je eigen OneDrive, niet de sectiemap.'); } catch (err) { if (err.name !== 'AbortError') { console.warn(err); toast('Deze map kan niet worden gebruikt'); } } bmStatusVervers(); return; }
  if (D.bm === 'maptoe') { try { const p = await bmMap.requestPermission({ mode: 'readwrite' }); bmMapStaat = p === 'granted' ? 'ok' : 'toestemming'; if (p === 'granted') await bmSchrijf(); } catch (err) { console.warn(err); } bmStatusVervers(); return; }
  if (D.bm === 'logboek') { const log = await bmLogVan(k); const naam = id => (lijst.find(x => x.id === id) || {}).naam || id; bmDownload(bmBestand(m, g, `logboek ${vandaag()}.csv`), '﻿' + [['Tijd', 'Laag', 'Wat', 'Leerling of groep', 'Onderdeel', 'Waarde'], ...log.map(e => [new Date(e.t).toLocaleString('nl-NL'), e.l || 'toets', e.a, naam(e.id), e.c, Array.isArray(e.w) ? e.w.join(' ') : e.w])].map(r => r.map(bmCel).join(';')).join('\r\n'), 'text/csv;charset=utf-8'); toast(log.length + ' regels in het logboek'); return; }
  if (D.bm === 'loten') { const f = foto(); T.volgorde = vol.map(id => [Math.random(), id]).sort((a, c) => a[0] - c[0]).map(x => x[1]); if ((T.groepjes || []).length) T.groepjes = T.groepjes.map(x => [Math.random(), x]).sort((a, c) => a[0] - c[0]).map(x => x[1]); bmSel = null; bewaar(); toast('Volgorde geloot', f); return; }
  if (D.bm === 'klok') { bmKlok = bmKlok ? null : Date.now(); render(); return; }
  if (D.bm === 'afronden') { const isH = T.herkans && (D.laag === 'herkans' || (!D.laag && bmLaag(T) === T.herkans)); const A = isH ? T.herkans : T; const wie = isH ? lijst.filter(x => A.wie.includes(x.id)) : lijst;
    const open = wie.filter(x => !(A.ll[x.id] && (A.ll[x.id].vast || A.ll[x.id].af)) && BMR.eind(m, A, T, x.id).e != null).length; const rest = wie.filter(x => !(A.ll[x.id] && A.ll[x.id].vast)).length - open;
    if (!confirm(`${isH ? 'Herkansing: ' : ''}${open} ${open === 1 ? 'cijfer' : 'cijfers'} vastleggen, met de scores en wegingen van nu.${rest ? ` ${rest} ${rest === 1 ? 'leerling heeft' : 'leerlingen hebben'} nog geen cijfer en ${rest === 1 ? 'blijft' : 'blijven'} open.` : ''}`)) return;
    const af = BMR.afronden(m, T, wie, Date.now(), A); bmLog(k, { a: 'afronden', l: isH ? A.id : null, w: af.map(id => id + '=' + A.ll[id].vast.e).join(' ') }); bmVuil = true; bewaar(); toast(af.length + ' cijfers vastgelegd' + (isH ? '; het hoogste cijfer telt' : '')); await bmReserveNu(m, g); return; }
  if (D.bm === 'heropen') { const A = bmLaag(T); if (!BMR.isPoging(A, T)) return; if (!confirm('Dit cijfer openzetten om te wijzigen? Het oude cijfer staat in het logboek. Rond daarna opnieuw af en zet het nieuwe cijfer zelf in Magister.')) return; bmLog(k, { a: 'heropen', id: bmSel, w: A.ll[bmSel].vast.e, l: A === T ? null : A.id }); BMR.heropen(T, bmSel, A); bewaar(); return; }
  if (D.bm === 'kolomkopie') { const t = BMR.kolom(T, lijst).join('\n'); try { await navigator.clipboard.writeText(t); toast('Gekopieerd. Plak in de eerste cel van de kolom in Magister.'); } catch (err) { const ta = $('#bmKolom'); ta.hidden = false; ta.select(); toast('Kopiëren lukt niet vanzelf: de tekst is geselecteerd, kopieer met Ctrl+C'); } return; }
  if (D.bm === 'volgende' || D.bm === 'vorige') { const i = vol.indexOf(bmSel) + (D.bm === 'volgende' ? 1 : -1); if (i >= 0 && i < vol.length) { const oud = bmSel; bmSel = vol[i]; bmKlok = null; const G = bmLaag(T) === T.herkans ? null : BMR.groepVan(T, bmSel); if (D.bm === 'volgende' && G && G !== BMR.groepVan(T, oud) && !Object.keys((bmLaag(T).gs || {})[G.id] || {}).length) bmSelG = G.id; render(); window.scrollTo(0, 0); if (D.bm === 'volgende') bmNaVolgende(m, g, T, oud, bmSel); } return; } // een nieuwe groep zonder groepsscore begint op de groepskaart
  if (D.bmkies) { bmSel = D.bmkies; bmSelG = null; bmKlok = null; render(); if (matchMedia('(max-width:820px)').matches) { const k = document.querySelector('.bm-scoor'); if (k) k.scrollIntoView(); } return; }
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
  if (t.matches('select[data-bmveld]')) { if (bmSel && t.closest('.bm-scoor')) bmZet(c.k, T, 'v', bmSel, t.dataset.bmveld, t.value, true); render(); return; } // ook een gekozen partij of niveau (het niveau begrenst het cijfer) komt in het logboek
  if (t.dataset.bmgnaam) { const x = (T.groepjes || []).find(y => y.id === t.dataset.bmgnaam); if (x && t.value.trim()) { const oud = x.naam; x.naam = t.value.trim(); if ((c.m.velden || []).includes('Groep')) for (const lid of x.leden) { const rv = (T.ll[lid] || {}).v; if (rv && rv.Groep === oud) rv.Groep = x.naam; } bewaar(true); } return; } // het veld Groep van de leden volgt de nieuwe naam
  if (t.dataset.bmherstel != null && t.files[0]) { try { const d = JSON.parse(await t.files[0].text()); if (d.soort !== 'lesdag-beoordeling-reserve' || d.model !== c.m.id || d.groep !== c.g || !d.toets) { toast('Dit bestand hoort niet bij deze toets en groep'); return; }
      if (!confirm(`Reserve van ${new Date(d.gemaakt).toLocaleString('nl-NL')} terugzetten? De scores op dit apparaat voor deze toets worden vervangen.`)) return;
      await bmDownloadReserve(c.m, c.g); S.beoord.toetsen[c.k] = d.toets; if (d.lijst && d.lijst.length) S.beoord.lijsten[c.g] = d.lijst; S.beoord.weg = S.beoord.weg || {}; if (d.weg) S.beoord.weg[c.g] = d.weg; bmLog(c.k, { a: 'teruggezet', w: d.gemaakt }); bewaar(); toast('Reserve teruggezet; de oude stand staat in je downloads'); } catch (err) { console.warn(err); toast('Dit bestand kan niet worden gelezen'); } return; }
  if (t.dataset.bmcskies != null) { const v = t.value; if (v.startsWith('g:')) bmSelG = v.slice(2); else { bmSelG = null; bmSel = v; } bmKlok = null; render(); window.scrollTo(0, 0); return; }
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
setInterval(() => { const a = document.activeElement; if (!LES && !PAL && ['vandaag', 'nu', 'kompas'].includes(route.naam) && !document.hidden && !(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) && !document.querySelector('#main details[open]')) render(); }, 60000); // het scherm volgt de klok, niet tijdens typen
// presentie na een kwartier nog niet gemeld: één keer trillen. Alleen tijdens een les, dus nooit in een pauze of 's avonds; niet op het bord
setInterval(() => {
  if (document.hidden || LES || !B || document.body.classList.contains('bordvenster')) return; const s = vandaag(); const nu = nuMin(); const p = planning(s, s)[s]; if (p.reden) return;
  const x = p.uren.find(y => magTelt(s, y) && minuten(y.u.start) + 15 <= nu && nu < minuten(y.u.eind)); if (!x) return; const m = magVan(s, x); if (m.p || m.tril || magHerinnering(s) !== 'vol') return;
  magZet(magKey(s, x), { tril: 1 }); bewaar(true); tril1(); if (['nu', 'kompas', 'regie'].includes(route.naam) && !PAL) render();
}, 20000);
// een tweede venster (bord, kompas) bewaarde iets: neem het over, zodat dit venster het niet overschrijft
window.addEventListener('storage', e => {
  if (e.key === LS_KEY && e.newValue) { try { S = Object.assign(nieuweStaat(), JSON.parse(e.newValue)); } catch (x) { return; } if (SY) SY.gewijzigd(); }
  else if (e.key === AP_KEY) AP = laadAP(); else return;
  const a = document.activeElement; if (B && !LES && !PAL && !(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) render();
});
let veeg = null; // vegen over de nu-kaart: naar het vorige of volgende moment
document.addEventListener('pointerdown', e => { veeg = e.pointerType === 'touch' && route.naam === 'nu' && e.target.closest('.nu-kaart') && !e.target.closest('input,textarea,select') ? { x: e.clientX, y: e.clientY } : null; });
document.addEventListener('pointerup', e => { if (!veeg) return; const dx = e.clientX - veeg.x, dy = e.clientY - veeg.y; veeg = null; if (Math.abs(dx) > 70 && Math.abs(dy) < 50) nuStap(dx < 0 ? 1 : -1); });
['input', 'change'].forEach(ev => document.addEventListener(ev, e => { // rol en potje: het voorstel volgt wat je typt en de soort
  const id = e.target.id; if (id === 'tT' || id === 'tB') rolKeuzeZet($('#tT').value, $('#tB').value, '#tR', '#tP'); else if (id === 'pT' || id === 'pB') rolKeuzeZet($('#pT').value, $('#pB').value, '#pR', '#pP'); else if (id === 'sT') rolKeuzeZet($('#sT').value, 'sectie', '#sR', '#sP');
}));
document.addEventListener('input', e => { if (e.target.id === 'palQ' && PAL) { PAL.q = e.target.value; PAL.i = 0; paletToon(); } if (e.target.id === 'nwQ' && NW) { NW.tekst = e.target.value; nwToon(); } if (NW && e.target.id === 'nwKlas') { NW.klas = e.target.value; NW.lokaal = null; NW.weg = ''; nwToon(); } if (NW && e.target.id === 'nwLok') NW.lokaal = e.target.value; if (NW && e.target.id === 'nwRuil') { NW.weg = e.target.value; nwToon(); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && (LES || route.naam === 'regie')) waak(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden || LES) return; if (M365.account) syncNu(false); if (zGekoppeld() && zProxy() && (!ZC || Date.now() - ZC.opgehaald > 30 * 60000)) zOphalen(false); });

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

function herstelStaat() { // eenmalig: taken die eigenlijk een afspraak met tijd zijn, en de oude tempometingen
  let anders = false;
  (S.taken || []).forEach(k => { if (k.af || k.afspraak || !AFSPRAAK.test(k.titel) || !/\d{1,2}[:.]\d{2}/.test(k.titel)) return; const dag = k.d || (k.plan && k.plan.dag); if (!dag) return;
    try { const t = leesTaak(k.titel, dag); if (t.afspraak && t.plan && !t.fout) { k.titel = t.titel; k.plan = t.plan; k.afspraak = true; delete k.d; delete k.min; anders = true; } } catch (e) { console.warn(e); } });
  Object.entries(S.duur || {}).forEach(([b, L]) => { const so = SCHAT[b] ? b : 'overig'; (L || []).forEach(f => { (S.duurLog = S.duurLog || []).push({ s: so, t: '', e: vijf(f * SCHAT[so]), d: vandaag(), id: 'oud' }); anders = true; }); delete S.duur[b]; });
  if (roosterOpruimen()) anders = true;
  if (zVastBij()) anders = true;
  if (anders) bewaar(true);
}
/* ---------- start ---------- */
/* gegevens: index.html start het ophalen al (VOORAF), tegelijk met het laden van dit script en alle drie naast elkaar */
const laadJson = n => (window.VOORAF && window.VOORAF[n]) || fetch('data/' + n + '.json', { cache: 'no-cache' }).then(r => r.json());
(async function start() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {}); // eerst, zodat een nieuwe versie ook binnenkomt als er verderop iets misgaat
  S = laadLokaal(); leesRoute();
  const kapot = staatFouten(S); if (kapot.length) { herstelScherm('Je opgeslagen gegevens zijn beschadigd. Niet in orde: ' + kapot.join(', ') + '.'); return; } // vóór bewaren en synchroniseren: niets kapots doorgeven
  if (!S.magVanaf) { S.magVanaf = vandaag(); bewaar(true); } // Magister-vakken tellen vanaf de eerste dag met deze versie, niet met terugwerkende kracht
  try { B = await laadJson('basis'); }
  catch (e) { $('#main').innerHTML = '<div class="kaart"><p>De leergangen kunnen niet geladen worden. Controleer de verbinding.</p></div>'; return; }
  try { BM = await laadJson('beoordeling'); } catch (e) { BM = []; }
  try { RC = await laadJson('reclame'); } catch (e) { RC = null; }
  herstelStaat();
  LESKLOK.start({ uren: lesklokUren, vandaag, esc, waak, lesOpen: () => !!LES, route: () => route.naam, klaar: () => !!B,
    lesTijd: () => LES && LES.s === vandaag() ? { groep: LES.x.u.groep, van: minuten(LES.x.u.start), tot: minuten(LES.x.u.eind) } : null });
  if (route.naam === 'bord') { // dit venster is het digibord
    document.body.classList.add('bordvenster'); startLes(decodeURIComponent(route.arg[0] || ''), route.arg[1] || vandaag(), true);
    window.addEventListener('pagehide', () => rgStuur('dicht')); if (!LES) render(); return; }
  render();
  try { // herladen midden in de les: de lesmodus gaat weer open, op de plek waar je was
    const op = sessionStorage.getItem('lesdag-lesopen'); const [uid, s] = (op || '').split('|');
    if (op && s === vandaag() && ((planning(s, s)[s] || {}).uren || []).some(y => y.u.id === uid && y.item)) startLes(uid, s); else if (op) sessionStorage.removeItem('lesdag-lesopen');
  } catch (e) { console.warn(e); }
  try { const vk = JSON.parse(localStorage.getItem(VOOR_KOPIE) || 'null'); if (vk && Date.now() - vk.tijd > 2 * 864e5) localStorage.removeItem(VOOR_KOPIE); } catch (e) { localStorage.removeItem(VOOR_KOPIE); } // na twee dagen gewoon starten is de reserve niet meer nodig
  if (/diag/.test(location.search)) setTimeout(diag, 800);
  try { const acc = await M365.init(); if (acc) await syncNu(false); else setSync('', M365.enabled() ? 'Niet ingelogd' : 'Op dit apparaat'); }
  catch (e) { console.warn(e); setSync('fout', 'Inloggen niet beschikbaar'); }
  syncStart();
  agendaStart();
  bmMapLaden(); bmPersist();
  if (zGekoppeld() && zProxy() && navigator.onLine && (!ZC || Date.now() - ZC.opgehaald > 30 * 60000 || ZC.van !== maandagVan(vandaag()))) zOphalen(false);
})().catch(e => { console.error(e); herstelScherm('Er ging iets mis bij het starten (' + (e && e.message) + ').'); });
function herstelScherm(reden) { // Lesdag start niet: altijd een uitweg zonder script. Elke keuze schrijft de staat en laadt opnieuw
  let ruw = null; try { ruw = localStorage.getItem(LS_KEY); } catch (e) {}
  let voor = null; try { voor = localStorage.getItem(VOOR_KOPIE); } catch (e) {}
  let oud = null; try { oud = JSON.parse(ruw); } catch (e) {}
  const fout = staatFouten(oud); const kanRep = isObj(oud) && fout.length > 0;
  $('#main').innerHTML = `<div class="kaart herstel"><h2>Lesdag start niet</h2><p class="lead">${esc(reden)}</p>
    <p>Kies hoe je verder wilt. Download eerst wat er nu staat als je twijfelt: dan raak je niets kwijt.</p>
    <div class="knoppen" style="margin-top:.8rem">
      ${voor ? '<button class="btn hoofd" data-h="voor">Terug naar de stand van vóór de laatste kopie</button>' : ''}
      ${kanRep ? `<button class="btn${voor ? '' : ' hoofd'}" data-h="rep">Alleen de kapotte onderdelen leegmaken (${esc(fout.join(', '))})</button>` : ''}
      <label class="btn">Kopie terugzetten<input type="file" accept="application/json" data-h="imp" hidden></label>
      ${ruw ? '<button class="btn" data-h="dl">Wat er nu staat downloaden</button>' : ''}
      <button class="btn" data-h="leeg">Leeg beginnen</button>
    </div><p class="sub" style="margin-top:.6rem">Synchroniseren staat uit tot Lesdag weer gewoon start, zodat er niets kapots naar je andere apparaten gaat.</p></div>`;
  const zet = (st, msg) => { if (msg && !confirm(msg)) return; try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) { alert('Opslaan lukt niet: ' + e.message); return; } location.reload(); };
  const el = $('#main');
  el.onclick = ev => { const b = ev.target.closest('[data-h]'); if (!b || b.tagName === 'INPUT') return; const h = b.dataset.h;
    if (h === 'voor') { let f = null; try { f = JSON.parse(JSON.parse(voor).foto).S; } catch (e) {} if (staatFouten(f).length) { alert('Die stand is ook niet te lezen. Kies een andere uitweg.'); return; } zet(f, 'De stand van vóór de laatste kopie terugzetten?'); }
    if (h === 'rep') zet(staatRepareer(oud), `Deze onderdelen worden leeggemaakt: ${fout.join(', ')}. De rest blijft. Doorgaan?`);
    if (h === 'leeg') zet(nieuweStaat(), 'Leeg beginnen? Alles op dit apparaat is dan weg. Download eerst wat er nu staat als je het wilt bewaren.');
    if (h === 'dl') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ruw], { type: 'application/json' })); a.download = 'lesdag-beschadigd-' + vandaag() + '.json'; a.click(); }
  };
  el.onchange = async ev => { const t = ev.target; if (t.dataset.h !== 'imp' || !t.files[0]) return; let d = null; try { d = JSON.parse(await t.files[0].text()); } catch (e) {} t.value = '';
    const f = staatFouten(d); if (f.length) { alert('Deze kopie is ook niet in orde (' + f.join(', ') + '). Kies een andere.'); return; }
    zet(Object.assign(nieuweStaat(), d), `Kopie van ${d.updated ? new Date(d.updated).toLocaleString('nl-NL', { dateStyle: 'long', timeStyle: 'short' }) : 'onbekende datum'} terugzetten? Daarin: ${kopieOmvang(d)}.`); };
}
window.LESDAG_TEST = { ankersVan, planBasis, planning, dagItems, ruimte, ankersGemist, jaarToetsen, agendaItems, reeks, les, planGroepen, S: () => S }; // alleen lezen, voor tools/test-planning.js
})();
