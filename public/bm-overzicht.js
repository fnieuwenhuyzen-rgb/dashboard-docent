// Beoordelen stap 3: het jaar per leerling en de vergelijking van het strookje (kruisjes) met jouw score.
// Rekenen en tekst maken, zonder scherm en zonder opslag (test: tools/test-beoordeling-overzicht.js). Leest alleen uit S.beoord.
// Nieuwe opslag, alleen als aanvulling: ll[id].vink = { "0": "N"|"B"|"J", ... } per poging (op T.ll of T.herkans.ll) en T.strook = wat er op het strookje stond.
(function (root) {
'use strict';
const R = typeof module !== 'undefined' && module.exports ? require('./bm-reken.js') : root.BMR;

/* ====================  DE NEGEN KEUZES  ====================
   Elke keuze van de voorstelpagina is hier één instelling, met het advies als waarde.
   Een andere keuze is een regel veranderen (en voor 7 een model uitbreiden, zie daar). */
const INSTELLINGEN = {
  // 1. Hoe komen de kruisjes in Lesdag? 'intikken' (a, advies): zelf op het strookjesscherm. 'geen' (b): scherm uit, alleen examenconcerten vergelijken.
  //    (c) Form op de laptop van de groep is niet gebouwd.
  KRUISJES_INVOEREN: 'intikken',
  // 2. De schaal. Score vanaf bijnaVanaf is "bijna", vanaf jaVanaf is "ja", daaronder "nog niet". Advies: 4-5 nog niet, 6-7 bijna, 8-10 ja.
  SCHAAL: { bijnaVanaf: 6, jaVanaf: 8 },
  // 3. Wat licht op? Aantal stappen verschil vanaf waar een regel opvalt. Advies 2 (alleen twee stappen); 1 = elk verschil.
  LICHT_OP_VANAF_STAPPEN: 2,
  // 4. Vaste onderdelen over de toetsen heen. Advies: deze vijf (veld domein per criterium, zie tools/beoordeling/zet-domeinen.js).
  //    null = geen vaste onderdelen: de leerlingkaart toont dan per toets de eigen criteria.
  DOMEINEN: ['Techniek en klank', 'Ritme en maat', 'Samenspel', 'Presenteren', 'Eigen werk en denken'],
  // 5. Een jaargemiddelde in de app? Advies: nee. De weging per toets staat er wel bij (WEGING_TONEN).
  JAARGEMIDDELDE: false,
  WEGING_TONEN: true,
  // 6. De antwoorden op de schrijfvragen overtypen? Advies: nee. Geen opslag of scherm voor gebouwd; deze vlag is alleen een geheugensteun.
  SCHRIJFVRAGEN_OVERTYPEN: false,
  // 7. Welke modellen doen mee met de vergelijking? Alle modellen met strookje.crit (koppeling zin naar criterium).
  //    Advies: de 12 oude modellen pas na mavo 3 presentatie 2 omzetten. Omzetten = in het model strookje.stellingen, strookje.crit (en strookje.vragen/score) toevoegen
  //    en in tools/beoordeling/maak-formulieren.js het strookje laten drukken. Geen code in de app nodig.
  // 8. Presentatie 1 achteraf invoeren? Advies: ja, als de strookjes er nog zijn: het scherm werkt ook voor een toets die al afgerond is.
  ACHTERAF_INVOEREN: true,
  // 9. Wie ziet het? Advies: voorlopig alleen jij. true zou een jaarblad voor de leerling vragen; dat is niet gebouwd.
  JAARBLAD_PDF: false,
  // Een schooljaar loopt vanaf deze maand (augustus), voor het filter op de datum van de toets.
  SCHOOLJAAR_VANAF_MAAND: 8,
};

const BANDEN = ['nog niet', 'bijna', 'ja'];
const VINK = { N: 0, B: 1, J: 2 };
const VINKNAAM = { N: 'nog niet', B: 'bijna', J: 'ja' };
const rond1 = x => Math.round(Math.round(x * 1000) / 1000 * 10) / 10;
const fmt = R.fmt;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- schaal en vergelijking ---------- */
function band(score, I) { I = I || INSTELLINGEN; if (score == null) return null; return score >= I.SCHAAL.jaVanaf ? 2 : score >= I.SCHAAL.bijnaVanaf ? 1 : 0; }
// positief: de leerling kruiste hoger aan dan jouw score; negatief: lager
function stappen(vink, score, I) { const b = band(score, I); return vink in VINK && b != null ? VINK[vink] - b : null; }
function stapTekst(s) { const n = Math.abs(s); return s === 0 ? 'klopt' : (n === 1 ? 'één stap' : n === 2 ? 'twee stappen' : n + ' stappen') + (s > 0 ? ' hoger' : ' lager'); }
const licht = (s, I) => s != null && Math.abs(s) >= (I || INSTELLINGEN).LICHT_OP_VANAF_STAPPEN;

/* ---------- schooljaar ---------- */
function schooljaarVan(datum, I) { // "2026-11-09" of een tijdstip: het startjaar van het schooljaar
  I = I || INSTELLINGEN; const d = typeof datum === 'number' ? new Date(datum) : new Date(String(datum).slice(0, 10) + 'T12:00:00'); if (isNaN(d)) return null;
  return d.getMonth() + 1 >= I.SCHOOLJAAR_VANAF_MAAND ? d.getFullYear() : d.getFullYear() - 1;
}

/* ---------- het strookje van een toets ---------- */
// wat telt als strookje bij deze toets: wat er vastgelegd is (T.strook), anders het model. Zonder koppeling zin naar criterium: null (geen vergelijking).
function strookVan(m, T) {
  if (T && T.strook && T.strook.stellingen && T.strook.crit) return T.strook;
  const s = m && m.strookje; return s && s.stellingen && s.crit && s.crit.length === s.stellingen.length ? { stellingen: s.stellingen, crit: s.crit } : null;
}
// legt bij het eerste kruisje vast wat er op het strookje stond; later aanpassen van het model verandert oude kruisjes dan niet. Geeft true als er iets is vastgelegd.
function legStrookVast(m, T) { if (T.strook) return false; const s = strookVan(m, T); if (!s) return false; T.strook = { stellingen: s.stellingen.slice(), crit: s.crit.slice() }; return true; }
const heeftStrookje = m => !!strookVan(m, null);
// de poging die telt voor het cijfer (de herkansing als die hoger is), anders de toets zelf
const tellendeLaag = (T, id) => { const p = R.poging(T, id); return { p, L: p.p === 2 ? T.herkans : T }; };

// de score van jou op een criterium: vastgelegd bij Afronden, anders de geldende score nu. Het niveauplafond hoort bij het eindcijfer en niet bij het criterium.
function scoreCrit(m, T, L, id, cid) {
  const r = L.ll[id]; if (r && r.vast && r.vast.s && r.vast.s[cid]) return r.vast.s[cid].v == null ? null : r.vast.s[cid].v;
  const c = R.critVan(m, T).find(x => x.id === cid); return c ? R.scoreVan(L, T, id, c).v : null;
}
// per zin op het strookje: wat de leerling aankruiste tegen jouw score
function vergelijking(m, T, id, laag, I) {
  I = I || INSTELLINGEN; const S = strookVan(m, T); if (!S) return [];
  const L = laag || tellendeLaag(T, id).L; const vk = ((L.ll || {})[id] || {}).vink; const vink = vk && typeof vk === 'object' ? vk : {}; const C = R.critVan(m, T);
  return S.stellingen.map((zin, i) => {
    const cid = S.crit[i]; const c = C.find(x => x.id === cid); const score = c ? scoreCrit(m, T, L, id, cid) : null; const v = VINK[vink[i]] !== undefined ? vink[i] : null; const st = stappen(v, score, I);
    return { i, zin, crit: cid, critNaam: c ? c.naam : cid, vink: v, score, band: band(score, I), stap: st, licht: licht(st, I) };
  });
}

/* ---------- onderdelen over de toetsen heen ---------- */
// gewogen gemiddelde van jouw scores op de criteria met dit domein; leeg als er niets gescoord is
function domeinScore(m, T, L, id, domein) {
  let som = 0, w = 0;
  for (const c of R.critVan(m, T)) { if (c.domein !== domein) continue; const v = scoreCrit(m, T, L, id, c.id); if (v == null) continue; som += v * c.weging; w += c.weging; }
  return w ? rond1(som / w) : null;
}

/* ---------- het klasoverzicht ---------- */
// komend: modellen die de groep nog krijgt maar waar nog geen toets van is (de app levert ze aan uit de leergang)
function kolommenVan(beoord, BM, g, nu, komend, I) {
  I = I || INSTELLINGEN; const jaar = schooljaarVan(nu, I); const kol = [];
  BM.forEach((m, vo) => { const T = (beoord.toetsen || {})[m.id + '|' + g]; if (T && schooljaarVan(T.start || nu, I) === jaar) kol.push({ m, T, vo, start: T.start || '', komt: false }); });
  kol.sort((a, b) => String(a.start).localeCompare(String(b.start)) || a.vo - b.vo);
  for (const m of komend || []) if (!kol.some(k => k.m.id === m.id)) kol.push({ m, T: null, vo: 0, start: '', komt: true });
  return kol;
}
function cel(k, id) {
  const { m, T } = k; if (!T) return { komt: true };
  const r = (T.ll || {})[id]; const { p, L } = tellendeLaag(T, id);
  if (p.e != null) {
    const vast = L.ll[id].vast; const D = (T.vast && T.vast.delen) || R.delenVan(m, T); const v = R.veldenVan(L, T, id); const n = R.niveauVan(m, v);
    const ruw = rond1(((vast.d || 0) * D.docent + (D.zelf ? (vast.z || 0) * D.zelf : 0) + (D.klasgenoten ? (vast.k || 0) * D.klasgenoten : 0)) / 100);
    return { e: p.e, niveau: n ? n.naam : null, ruw, afgetopt: ruw > p.e + 1e-9, herkans: p.e2 != null, eerste: p.e1, telt: p.p, weging: m.weging == null ? null : m.weging };
  }
  if (r && r.af) return { inhalen: true };
  const tus = (T.tussen || []).map(x => R.eind(m, x, T, id).e).filter(e => e != null); return { open: true, tussen: tus.length ? tus[tus.length - 1] : null };
}
function strookSamenvatting(kol, id, I) { // over alle toetsen van het jaar: hoeveel vergeleken en welke opvallen
  let n = 0; const op = {}, all = {};
  for (const k of kol) { if (!k.T) continue; for (const q of vergelijking(k.m, k.T, id, null, I)) { if (q.stap == null) continue; n++; all[q.stap] = 1; if (q.licht) op[q.stap] = (op[q.stap] || 0) + 1; } }
  const delen = Object.keys(op).map(Number).sort((a, b) => b - a).map(s => op[s] + '× ' + stapTekst(s)); return { n, licht: Object.values(op).reduce((x, y) => x + y, 0), tekst: !n ? '' : delen.length ? delen.join(', ') : Object.keys(all).some(s => +s !== 0) ? 'binnen één stap' : 'klopt' };
}
const FILTERS = [['iedereen', 'Iedereen'], ['onvoldoende', 'Onvoldoende'], ['wijkt', 'Strookje wijkt af'], ['open', 'Nog open']];
function overzicht(beoord, BM, g, nu, komend, I) {
  I = I || INSTELLINGEN; const kol = kolommenVan(beoord, BM, g, nu, komend, I);
  const rijen = ((beoord.lijsten || {})[g] || []).map(x => {
    const cellen = kol.map(k => cel(k, x.id)); const cijfers = cellen.filter(c => c.e != null).map(c => c.e); const s = strookSamenvatting(kol, x.id, I);
    return { id: x.id, naam: x.naam, cellen, strook: s, onvoldoende: cijfers.some(e => e < 5.5), wijkt: s.licht > 0, open: cellen.some(c => c.inhalen || (c.open && !c.komt)), gemiddelde: I.JAARGEMIDDELDE && cijfers.length ? rond1(cijfers.reduce((a, b) => a + b, 0) / cijfers.length) : null };
  });
  return { groep: g, kolommen: kol, rijen };
}
const pas = (r, f) => f === 'onvoldoende' ? r.onvoldoende : f === 'wijkt' ? r.wijkt : f === 'open' ? r.open : true;

/* ---------- de leerlingkaart ---------- */
function leerlingKaart(beoord, BM, g, id, nu, komend, I) {
  I = I || INSTELLINGEN; const kol = kolommenVan(beoord, BM, g, nu, komend, I).filter(k => k.T); const x = ((beoord.lijsten || {})[g] || []).find(y => y.id === id); if (!x) return null;
  const toetsen = kol.map(k => {
    const { L } = tellendeLaag(k.T, id); const c = cel(k, id);
    const onderdelen = I.DOMEINEN ? I.DOMEINEN.map(d => ({ naam: d, score: domeinScore(k.m, k.T, L, id, d) })) : R.critVan(k.m, k.T).map(cr => ({ naam: cr.naam, score: scoreCrit(k.m, k.T, L, id, cr.id) }));
    const tus = (k.T.tussen || []).map(t => R.eind(k.m, t, k.T, id).e).filter(e => e != null);
    return { m: k.m, cel: c, onderdelen, tussen: tus.length ? tus[tus.length - 1] : null, vooruit: ((k.T.ll || {})[id] || {}).vooruit || '', zelf: ((L.ll || {})[id] || {}).zelf, vergelijk: vergelijking(k.m, k.T, id, null, I) };
  });
  return { id, naam: x.naam, groep: g, toetsen };
}

/* ---------- het strookjesscherm ---------- */
function strookjesTelling(m, T, lijst, L) { // hoeveel leerlingen alle kruisjes en het strookjescijfer hebben
  const s = strookVan(m, T); if (!s) return { klaar: 0, n: lijst.length };
  const klaar = lijst.filter(x => { const r = L.ll[x.id] || {}; return s.stellingen.every((_, i) => (r.vink || {})[i]) && r.zelf != null; }).length; return { klaar, n: lijst.length };
}
const SCHRIJFCIJFERS = [4, 6, 8, 10];

/* ---------- HTML ---------- */
const stapKlasse = q => q.stap == null ? '' : q.stap === 0 ? 'ok' : q.licht ? 'let' : '';
function htmlOverzicht(o, filter, titel) {
  const f = filter || 'iedereen'; const rijen = o.rijen.filter(r => pas(r, f)); const I = INSTELLINGEN;
  const kop = o.kolommen.map(k => `<th>${esc(k.m.toets)}<br><small>${esc(k.m.titel.replace(/^[^:]*:\s*/, ''))}</small>${I.WEGING_TONEN && k.m.weging ? `<br><small>weging ${esc(k.m.weging)}</small>` : ''}</th>`).join('');
  const cl = c => c.komt ? '<td class="leeg">komt nog</td>'
    : c.e != null ? `<td class="ov-cel${c.e < 5.5 ? ' ov-laag' : ''}"><span class="ov-cijfer">${fmt(c.e)}</span>${c.herkans ? ' <span class="chip">herkansing</span>' : ''}<small>${c.herkans && c.telt === 2 ? `eerste poging ${fmt(c.eerste)}` : c.afgetopt ? `${fmt(c.ruw)} afgetopt${c.niveau ? ', ' + esc(c.niveau.toLowerCase()) : ''}` : c.niveau ? esc(c.niveau.toLowerCase()) : ''}</small></td>`
    : c.inhalen ? '<td><span class="chip rood">inhalen</span></td>' : `<td class="leeg">${c.tussen != null ? `tussenstand ${fmt(c.tussen)}` : 'nog open'}</td>`;
  const sk = r => r.strook.n ? `<span class="chip ${r.strook.licht ? 'let' : 'ok'}">${esc(r.strook.tekst)}</span>` : '<span class="leeg">–</span>';
  return `<div class="kaart ov"><div class="regel"><h2>${esc(titel || 'Klas ' + o.groep + ' · het jaar')}</h2><span class="sub">${rijen.length} van ${o.rijen.length} getoond</span></div>
    <div class="tb">${FILTERS.map(([k, t]) => `<button class="btn klein ${k === f ? 'hoofd' : ''}" data-ovfilter="${k}">${t}</button>`).join(' ')}</div>
    ${o.kolommen.length ? `<div class="ov-rol"><table class="ov-tabel"><thead><tr><th>Leerling</th>${kop}${I.JAARGEMIDDELDE ? '<th>Gemiddelde</th>' : ''}<th>Strookje tegen jouw score</th></tr></thead><tbody>${rijen.map(r => `<tr><td><button class="bm-naam" data-ovleerling="${esc(r.id)}">${esc(r.naam)}</button></td>${r.cellen.map(cl).join('')}${I.JAARGEMIDDELDE ? `<td class="ov-cijfer">${fmt(r.gemiddelde)}</td>` : ''}<td>${sk(r)}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="lead">Van deze klas is dit schooljaar nog geen toets beoordeeld.</p>'}
    <p class="sub">Het cijfer dat telt: bij een herkansing het hoogste afgeronde cijfer.${I.JAARGEMIDDELDE ? '' : ' Er staat geen jaargemiddelde: Lesdag kent alleen de praktijktoetsen.'}</p></div>`;
}
function htmlKaart(K) {
  const I = INSTELLINGEN; if (!K) return '<div class="kaart"><p>Deze leerling staat niet meer in de klassenlijst.</p></div>';
  const cols = K.toetsen; const rij = (t, f) => cols.map(f).join('');
  const verloop = `<div class="ov-rol"><table class="ov-tabel"><thead><tr><th>Onderdeel</th>${rij(0, t => `<th>${esc(t.m.toets)}</th>`)}</tr></thead><tbody>
    <tr><td><b>Cijfer</b></td>${rij(0, t => `<td class="ov-cijfer">${t.cel.e != null ? fmt(t.cel.e) : '<span class="leeg">–</span>'}</td>`)}</tr>
    ${I.DOMEINEN ? I.DOMEINEN.map((d, j) => `<tr><td>${esc(d)}</td>${rij(0, t => { const s = t.onderdelen[j].score; return `<td class="${s != null && s < 5.5 ? 'ov-laag' : ''}">${s == null ? '<span class="leeg">–</span>' : fmt(s)}</td>`; })}</tr>`).join('')
      : cols.map(t => t.onderdelen.map(o => `<tr><td>${esc(t.m.toets)}: ${esc(o.naam)}</td><td>${o.score == null ? '–' : fmt(o.score)}</td></tr>`).join('')).join('')}
    <tr><td>Strookje (concreet schrijven)</td>${rij(0, t => `<td>${t.zelf == null ? '<span class="leeg">–</span>' : fmt(t.zelf)}</td>`)}</tr>
    <tr><td class="sub">Tussenstand, telt niet mee</td>${rij(0, t => `<td class="sub">${t.tussen == null ? '–' : fmt(t.tussen)}</td>`)}</tr></tbody></table></div>`;
  const punten = cols.filter(t => t.vooruit).map(t => `<li><b>Punt om aan te werken, ${esc(t.m.toets)}</b>${esc(t.vooruit)}</li>`).join('');
  const verg = cols.filter(t => t.vergelijk.length).slice().reverse().map(t => `<tr><td colspan="4"><b>${esc(t.m.toets)}</b></td></tr>` + t.vergelijk.map(q => `<tr><td>${esc(q.zin)}</td><td>${q.vink ? VINKNAAM[q.vink] : '<span class="leeg">–</span>'}</td><td>${q.score == null ? '<span class="leeg">–</span>' : esc(q.critNaam) + ': ' + fmt(q.score)}</td><td>${q.stap == null ? '' : `<span class="chip ${stapKlasse(q)}">${stapTekst(q.stap)}</span>`}</td></tr>`).join('')).join('');
  return `<div class="kaart ov"><div class="regel"><h2>${esc(K.naam)}</h2><span class="sub">klas ${esc(K.groep)}</span></div>
    ${cols.length ? `<div class="ov-twee">${verloop}${punten ? `<ul class="ov-punten">${punten}</ul>` : ''}</div>` : '<p class="lead">Nog geen toets dit schooljaar.</p>'}
    ${verg ? `<h3>Wat de leerling kruiste naast jouw score</h3><div class="ov-rol"><table class="ov-tabel"><thead><tr><th>Zin op het strookje</th><th>Leerling kruiste</th><th>Jij scoorde</th><th>Verschil</th></tr></thead><tbody>${verg}</tbody></table></div><p class="sub">Dit telt niet mee voor het cijfer.</p>` : ''}</div>`;
}
function htmlStrookjes(beoord, m, g, laagId, zoek) {
  const lijst = (beoord.lijsten || {})[g] || []; const T = (beoord.toetsen || {})[m.id + '|' + g]; const S = strookVan(m, T);
  if (INSTELLINGEN.KRUISJES_INVOEREN !== 'intikken') return '<div class="kaart"><p class="lead">Het invoeren van kruisjes staat uit (instelling KRUISJES_INVOEREN).</p></div>';
  if (!S) return '<div class="kaart"><p class="lead">Dit model heeft nog geen strookje met koppeling naar de criteria.</p></div>';
  if (!INSTELLINGEN.ACHTERAF_INVOEREN && T && T.vast) return '<div class="kaart"><p class="lead">Deze toets is al afgerond; achteraf invoeren staat uit (instelling ACHTERAF_INVOEREN).</p></div>';
  const L = laagId === 'herkans' && T && T.herkans ? T.herkans : (T || { ll: {} }); const t = strookjesTelling(m, T || { ll: {} }, lijst, L);
  const knoppen = (id, i, w, soort) => `<div class="tik" role="group">${(soort === 'vink' ? ['N', 'B', 'J'] : SCHRIJFCIJFERS).map(k => `<button type="button" class="${w === k ? 'aan' : ''}" aria-pressed="${w === k}" aria-label="${soort === 'vink' ? VINKNAAM[k] : 'strookjescijfer ' + k}" data-ov${soort}="${esc(id)}|${i}|${k}">${k}</button>`).join('')}</div>`;
  const rij = x => { const r = L.ll[x.id] || {}; const vast = !!r.vast;
    return `<tr data-ovn="${esc(x.naam.toLowerCase())}"><td>${esc(x.naam)}</td>${S.stellingen.map((_, i) => `<td>${knoppen(x.id, i, (r.vink || {})[i], 'vink')}</td>`).join('')}<td>${vast ? `${r.zelf == null ? '–' : fmt(r.zelf)} <span class="chip">afgerond</span>` : knoppen(x.id, 'z', r.zelf, 'zelf')}</td></tr>`; };
  return `<div class="kaart ov"><div class="regel"><h2>Strookjes · ${esc(m.toets)}</h2><span class="sub" id="ovTeller">${t.klaar} van ${t.n} klaar</span></div>
    <div class="tb"><label class="sub" for="ovZoek">Zoek</label><input id="ovZoek" class="ov-zoek" placeholder="Begin een naam te typen" autocomplete="off">${T && T.herkans ? `<button class="btn klein ${L === T ? 'hoofd' : ''}" data-ovlaag="">Toets</button><button class="btn klein ${L !== T ? 'hoofd' : ''}" data-ovlaag="herkans">Herkansing</button>` : ''}<span class="sub">N nog niet · B bijna · J ja</span></div>
    <div class="ov-rol"><table class="ov-tabel"><thead><tr><th>Leerling</th>${S.stellingen.map(z => `<th>${esc(z)}</th>`).join('')}<th>Strookje: 4 leeg, 6 vaag, 8 concreet, 10 concreet en een plan</th></tr></thead><tbody>${lijst.map(rij).join('')}</tbody></table></div>
    <p class="sub">Kruisjes tellen niet mee voor het cijfer en blijven aan te passen na Afronden. Het strookjescijfer zit vast zodra je afrondt.</p></div>`;
}

const API = { INSTELLINGEN, BANDEN, VINK, band, stappen, stapTekst, licht, schooljaarVan, strookVan, legStrookVast, heeftStrookje, tellendeLaag, scoreCrit, vergelijking, domeinScore, kolommenVan, cel, overzicht, FILTERS, pas, leerlingKaart, strookjesTelling, htmlOverzicht, htmlKaart, htmlStrookjes, SCHRIJFCIJFERS };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.BMO = API;
})(typeof self !== 'undefined' ? self : this);
