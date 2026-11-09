#!/usr/bin/env node
/* Controleer de lesgegevens van Lesdag. Alleen lezen: er wordt niets aangepast.

   Gebruik:  node tools/controleer-lesgegevens.js [--sectie <map>] [--vandaag JJJJ-MM-DD] [--json] [--alles]

   Wat het nakijkt (basis.json, beoordeling.json, tools/presentaties-links.json):
   1. verwijzingen naar bestanden in de sectiemap (presentaties, formulieren, scorebladen, bladmuziek):
      bestaat het bestand nog in de OneDrive-kopie, en wijst niets naar 99 Archief
   2. lessen zonder fasen, of met fasen die niet optellen tot de lestijd
   3. toetsen op een datum in een vakantie of vrije dag, in het weekend, op een dag zonder les,
      buiten hun toetsweek, of in een andere week dan waar de toetsles staat
   4. beoordelingsmodellen die niet bestaan of naar een verkeerde les/toets wijzen
   5. teksten die botsen met vaste regels: leerlingen die voor de klas presenteren, telefoon in de les

   Van de sectiemap worden alleen bestandsnamen en mapstructuur gelezen, nooit de inhoud van een bestand.
   Externe links (Forms, Musicbox, Wikimedia) worden niet gecontroleerd. Uitvoer: per klas, de komende
   vier weken eerst. Afsluitcode 1 als er fouten zijn. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const optie = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const SECTIE = optie('--sectie', 'C:/Users/nwn/OneDrive - CSG Prins Maurits/Documenten - Sectie Muziek');
const VANDAAG = optie('--vandaag', new Date().toISOString().slice(0, 10));
const ALS_JSON = args.includes('--json');
const ALLES = args.includes('--alles'); // ook de meldingen van de laagste ernst tonen

const lees = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const B = lees('public/data/basis.json');
const BM = lees('public/data/beoordeling.json');
const PL = lees('tools/presentaties-links.json');

/* ---------- hulpjes ---------- */
const DAGEN = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const dOf = s => new Date(s + 'T12:00:00Z');
const iso = d => d.toISOString().slice(0, 10);
const plus = (s, n) => { const d = dOf(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const nl = s => { const d = dOf(s); return `${DAGEN[d.getUTCDay()]} ${d.getUTCDate()} ${MAANDEN[d.getUTCMonth()]}`; };
const weekdag = s => DAGEN[dOf(s).getUTCDay()];
const SLOTS = ['l1', 'l2', 'l3'];
const GRENS = plus(VANDAAG, 28); // komende vier weken

const kalW = Object.fromEntries(B.kalender.weken.map(k => [k.w, k]));
const weekDatum = w => (kalW[w] || {}).datum || null;
const inVakantie = s => B.kalender.vakanties.find(v => s >= v.van && s <= v.tot);
const vrijeDag = s => (B.vrijeDagen || []).includes(s);
const KLAS = lg => (B.leergangen[lg].meta.klas || lg);

/* De lesdatum is bekend als de leergang vaste lesdagen heeft (lesdagen per les), anders alleen de maandag van de lesweek. */
function lesDatum(lg, w, slot) {
  const m = B.leergangen[lg].meta; const mon = weekDatum(w); if (!mon) return { datum: null, exact: false };
  const i = SLOTS.indexOf(slot);
  if (Array.isArray(m.lesdagen) && m.lesdagen[i]) { const off = ['ma', 'di', 'wo', 'do', 'vr'].indexOf(m.lesdagen[i]); if (off >= 0) return { datum: plus(mon, off), exact: true }; }
  return { datum: mon, exact: false };
}

const meldingen = [];
function meld(o) { // ernst: fout | let op | info
  meldingen.push(Object.assign({ klas: '(algemeen)', lg: null, w: null, slot: null, datum: null, exact: false }, o));
}
function bij(lg, w, slot) {
  const d = lesDatum(lg, w, slot);
  return { klas: KLAS(lg), lg, w, slot, datum: d.datum, exact: d.exact };
}
const lesNaam = (lg, w, slot) => `${KLAS(lg)} week ${w}${slot ? ' les ' + slot.slice(1) : ''}`;
const alleLessen = function* () {
  for (const [lg, L] of Object.entries(B.leergangen)) for (const wk of L.weken) for (const slot of SLOTS) if (wk[slot]) yield { lg, L, wk, w: wk.w, slot, les: wk[slot] };
};

/* ---------- 1. bestanden in de sectiemap ---------- */
const SP_WORTEL = /\/Sectie(?:%20| )Muziek\/Gedeelde(?:%20| ){1,2}documenten\//i;
const sectieAanwezig = fs.existsSync(SECTIE);
let index = null; // bestandsnaam (kleine letters) -> paden, alleen als er iets ontbreekt
function bouwIndex() {
  index = new Map();
  const loop = dir => {
    let e; try { e = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const x of e) { const p = path.join(dir, x.name); if (x.isDirectory()) loop(p); const k = x.name.toLowerCase(); if (!index.has(k)) index.set(k, []); index.get(k).push(path.relative(SECTIE, p).replace(/\\/g, '/')); }
  };
  loop(SECTIE);
}
function zoekVervanger(rel) {
  if (!index) bouwIndex();
  const naam = path.basename(rel).toLowerCase();
  const exact = (index.get(naam) || []).filter(p => p.toLowerCase() !== rel.toLowerCase());
  if (exact.length) return exact.slice(0, 3);
  const nr = (naam.match(/^(\d+(?:\.\d+)?)\s/) || [])[1]; // zelfde lesnummer, andere naam: waarschijnlijk hernoemd
  const dir = path.dirname(rel).toLowerCase();
  if (nr) {
    const buur = [];
    for (const [k, ps] of index) if (k.startsWith(nr + ' ') && path.extname(k) === path.extname(naam)) for (const p of ps) if (p.toLowerCase().startsWith(dir) || /archief/i.test(p)) buur.push(p);
    if (buur.length) return buur.slice(0, 3);
  }
  return [];
}
const gecontroleerd = new Map(); // sectiepad -> {bestaat, archief}
function sectiePad(u) {
  if (!/sharepoint\.com/i.test(u)) return null;
  const m = u.match(SP_WORTEL); if (!m) return { onbekend: true };
  let rel = u.slice(m.index + m[0].length).replace(/[?#].*$/, '');
  try { rel = decodeURIComponent(rel); } catch { /* laat staan */ }
  return { rel };
}
function controleerLink(u, ctx) {
  const sp = sectiePad(u); if (!sp) return; // externe link: niet controleren
  if (sp.onbekend) { meld(Object.assign({ ernst: 'let op', cat: 'bestand', tekst: `SharePoint-link met onbekende vorm (niet te controleren): ${u.slice(0, 120)}` }, ctx)); return; }
  const rel = sp.rel;
  if (/(^|\/)99 Archief(\/|$)/i.test(rel)) { meld(Object.assign({ ernst: 'fout', cat: 'bestand', tekst: `wijst naar 99 Archief: ${rel}` }, ctx)); return; }
  if (!sectieAanwezig) return;
  let r = gecontroleerd.get(rel);
  if (!r) { r = { bestaat: fs.existsSync(path.join(SECTIE, rel)) }; if (!r.bestaat) r.vervangers = zoekVervanger(rel); gecontroleerd.set(rel, r); }
  if (!r.bestaat) {
    const v = r.vervangers.length ? ` Mogelijk verplaatst of hernoemd: ${r.vervangers.join(' | ')}` : ' Niets met die naam of dat nummer gevonden.';
    const alleenArchief = r.vervangers.length && r.vervangers.every(p => /99 Archief/i.test(p));
    meld(Object.assign({ ernst: 'fout', cat: 'bestand', tekst: `bestand bestaat niet meer: ${rel}.${v}${alleenArchief ? ' (alleen in het archief)' : ''}` }, ctx));
  }
}
if (!sectieAanwezig && !ALS_JSON) console.error(`LET OP: sectiemap niet gevonden (${SECTIE}); alleen controle op 99 Archief.`);

for (const { lg, w, slot, les } of alleLessen()) {
  for (const mat of les.materiaal || []) if (mat.u) controleerLink(mat.u, Object.assign(bij(lg, w, slot), { bron: `basis.json, ${lesNaam(lg, w, slot)}, "${mat.t}"` }));
  const bu = les.fasen && les.fasen.some(f => f.beeld && f.beeld.u); // beeld-links zijn extern, maar kijk toch of er een sectielink tussen zit
  if (bu) for (const f of les.fasen) if (f.beeld && f.beeld.u) controleerLink(f.beeld.u, Object.assign(bij(lg, w, slot), { bron: `basis.json, ${lesNaam(lg, w, slot)}, beeld` }));
}
/* presentaties-links.json: elke regel moet naar een bestaand bestand wijzen, het bestandsveld moet bij de link passen,
   en de les moet bestaan en de link moet ook echt in die les staan */
const stripQ = u => u.replace(/[?#].*$/, '');
const normPad = u => { try { return decodeURIComponent(stripQ(u)).toLowerCase(); } catch { return stripQ(u).toLowerCase(); } };
for (const r of PL) {
  const ctx = Object.assign(B.leergangen[r.lg] ? bij(r.lg, r.w, r.slot) : { klas: r.lg || '(onbekend)', lg: r.lg, w: r.w, slot: r.slot }, { bron: `presentaties-links.json, ${r.lg} week ${r.w} ${r.slot}` });
  if (!B.leergangen[r.lg]) { meld(Object.assign({ ernst: 'fout', cat: 'bestand', tekst: `leergang "${r.lg}" bestaat niet` }, ctx)); continue; }
  const wk = B.leergangen[r.lg].weken.find(x => x.w === r.w); const les = wk && wk[r.slot];
  if (!les) { meld(Object.assign({ ernst: 'fout', cat: 'bestand', tekst: `de les bestaat niet in basis.json (presentatie "${r.bestand}")` }, ctx)); continue; }
  if (les.type === 'uitval') meld(Object.assign({ ernst: 'let op', cat: 'bestand', tekst: `de les valt uit, maar er staat een presentatie aan gekoppeld: "${r.bestand}"` }, ctx));
  controleerLink(r.u, ctx);
  const sp = sectiePad(r.u);
  if (sp && sp.rel && r.bestand && path.basename(sp.rel).toLowerCase() !== r.bestand.toLowerCase()) meld(Object.assign({ ernst: 'let op', cat: 'bestand', tekst: `veld "bestand" (${r.bestand}) past niet bij de link (${path.basename(sp.rel)})` }, ctx));
  if (!(les.materiaal || []).some(m => m.u && normPad(m.u) === normPad(r.u))) meld(Object.assign({ ernst: 'let op', cat: 'bestand', tekst: `de link naar "${r.bestand}" staat niet in het materiaal van de les in basis.json (staat los in presentaties-links.json)` }, ctx));
}

/* ---------- 2. fasen en lestijd ---------- */
for (const { lg, L, w, slot, les } of alleLessen()) {
  if (les.type === 'uitval' || les.type === 'toetsweek') continue;
  const ctx = Object.assign(bij(lg, w, slot), { bron: `basis.json, ${lesNaam(lg, w, slot)}` });
  const duur = L.meta.lesduurMin || 45; const titel = les.titel || '(zonder titel)';
  if (les.type === 'leeg') { meld(Object.assign({ ernst: 'let op', cat: 'fasen', tekst: `les is leeg (type "leeg", geen inhoud)` }, ctx)); continue; }
  if (!Array.isArray(les.fasen) || !les.fasen.length) {
    meld(Object.assign({ ernst: les.type === 'toets' ? 'info' : 'fout', cat: 'fasen', tekst: `${les.type === 'toets' ? 'toetsles' : 'les'} "${titel}" heeft geen fasen: de lesmodus heeft niets om te tonen` }, ctx)); continue;
  }
  const minVan = f => typeof f === 'string' ? +((f.match(/^\s*(\d+)\s*min/i) || [])[1] || 0) : +f.min || 0; // de lesmodus leest beide vormen
  const som = les.fasen.reduce((s, f) => s + minVan(f), 0);
  const zonderMin = les.fasen.filter(f => !(minVan(f) > 0)).length;
  if (zonderMin) meld(Object.assign({ ernst: 'fout', cat: 'fasen', tekst: `les "${titel}": ${zonderMin} fase(n) zonder geldige minuten` }, ctx));
  if (som !== duur) meld(Object.assign({ ernst: 'fout', cat: 'fasen', tekst: `les "${titel}": fasen tellen op tot ${som} min, lestijd is ${duur} min (${som > duur ? '+' : ''}${som - duur})` }, ctx));
}

/* lessen op een vrije dag of in een vakantie (alleen waar de lesdag vast staat) */
for (const { lg, w, slot, les } of alleLessen()) {
  const d = lesDatum(lg, w, slot); if (!d.exact || les.type === 'uitval') continue;
  const reden = inVakantie(d.datum) ? inVakantie(d.datum).naam : vrijeDag(d.datum) ? 'vrije dag (leerlingen vrij)' : null;
  if (reden) meld(Object.assign({ ernst: 'fout', cat: 'dag', tekst: `les "${les.titel || les.type}" staat op ${nl(d.datum)}, een ${reden}, maar is niet als uitval gemarkeerd` }, bij(lg, w, slot), { bron: `basis.json, ${lesNaam(lg, w, slot)}` }));
}

/* ---------- 3. toetsen: datum, dag, periode ---------- */
for (const [lg, L] of Object.entries(B.leergangen)) {
  const tw = B.toetsweken[lg] || [];
  for (const t of L.toetsen || []) {
    const ctxBasis = { klas: KLAS(lg), lg, w: t.week, slot: null, datum: t.datum || weekDatum(t.week), exact: !!t.datum };
    const bron = `basis.json, ${KLAS(lg)} toets ${t.id} (${t.naam || ''}), week ${t.week}, ${t.datum || 'geen datum'}`;
    const ctx = Object.assign({}, ctxBasis, { bron });
    const inTW = /toetsweek/i.test(t.waar || '') && !/v[óo]{1,2}r toetsweek/i.test(t.waar || ''); // "vóór toetsweek 3" is geen toets in de toetsweek
    if (t.datum) {
      const v = inVakantie(t.datum);
      if (v) meld(Object.assign({ ernst: 'fout', cat: 'toets', tekst: `toets ${t.id} staat op ${nl(t.datum)}, in de ${v.naam} (${v.van} t/m ${v.tot})` }, ctx));
      if (vrijeDag(t.datum)) meld(Object.assign({ ernst: 'fout', cat: 'toets', tekst: `toets ${t.id} staat op ${nl(t.datum)}, een vrije dag in de kalender` }, ctx));
      if (['za', 'zo'].includes(weekdag(t.datum))) meld(Object.assign({ ernst: 'fout', cat: 'toets', tekst: `toets ${t.id} staat op ${nl(t.datum)}: weekend` }, ctx));
      const mon = weekDatum(t.week);
      if (mon && !(t.datum >= mon && t.datum <= plus(mon, 4))) meld(Object.assign({ ernst: 'let op', cat: 'toets', tekst: `toets ${t.id} heeft week ${t.week} (maandag ${nl(mon)}) maar datum ${nl(t.datum)}: buiten die week. Lesweek en datum zeggen iets anders` }, ctx));
      if (!mon) meld(Object.assign({ ernst: 'fout', cat: 'toets', tekst: `toets ${t.id}: week ${t.week} bestaat niet in de kalender` }, ctx));
      if (inTW) {
        const hit = tw.find(x => t.datum >= x.van && t.datum <= x.tot);
        if (!hit) meld(Object.assign({ ernst: 'fout', cat: 'toets', tekst: `toets ${t.id} staat in een toetsweek (volgens "${t.waar}"), maar ${nl(t.datum)} valt in geen toetsweek van deze klas (${tw.map(x => x.van + ' t/m ' + x.tot).join('; ') || 'geen'})` }, ctx));
      } else if (Array.isArray(L.meta.lesdagen) && L.meta.lesdagen.length) {
        if (!L.meta.lesdagen.includes(weekdag(t.datum))) meld(Object.assign({ ernst: 'let op', cat: 'toets', tekst: `toets ${t.id} "in de les" staat op ${nl(t.datum)}, maar deze klas heeft les op ${[...new Set(L.meta.lesdagen)].join(', ')}` }, ctx));
      }
      if (!inTW && tw.some(x => t.datum >= x.van && t.datum <= x.tot) && !/toetsweek/i.test(t.waar || '')) meld(Object.assign({ ernst: 'info', cat: 'toets', tekst: `toets ${t.id} "in de les" valt in een toetsweek (${nl(t.datum)}); klopt dat?` }, ctx));
    } else if (!weekDatum(t.week)) meld(Object.assign({ ernst: 'fout', cat: 'toets', tekst: `toets ${t.id}: geen datum en week ${t.week} bestaat niet in de kalender` }, ctx));
    if (t.herkansing && /^\d{4}-\d\d-\d\d$/.test(t.herkansing)) {
      const v = inVakantie(t.herkansing);
      if (v) meld(Object.assign({ ernst: 'fout', cat: 'toets', tekst: `herkansing ${t.id} staat op ${nl(t.herkansing)}, in de ${v.naam}` }, ctx));
      if (['za', 'zo'].includes(weekdag(t.herkansing)) || vrijeDag(t.herkansing)) meld(Object.assign({ ernst: 'fout', cat: 'toets', tekst: `herkansing ${t.id} staat op ${nl(t.herkansing)}: weekend of vrije dag` }, ctx));
    }
    /* periode: valt de lesweek van de toets binnen het blok dat bij de toets hoort? */
    const blok = (L.blokken || []).find(b => b.toets === t.id);
    if (blok && !inTW && Array.isArray(blok.weken) && (t.week < blok.weken[0] || t.week > blok.weken[1] + 1)) meld(Object.assign({ ernst: 'let op', cat: 'toets', tekst: `toets ${t.id} (week ${t.week}) valt buiten zijn periode "${blok.id} ${blok.titel}" (week ${blok.weken[0]} t/m ${blok.weken[1]})` }, ctx));
    /* staat de toets ook als toetsles in de leergang, en in dezelfde week? */
    const lessen = [];
    for (const wk of L.weken) for (const slot of SLOTS) if (wk[slot] && wk[slot].type === 'toets' && wk[slot].toets === t.id) lessen.push({ w: wk.w, slot });
    if (!lessen.length) meld(Object.assign({ ernst: 'let op', cat: 'toets', tekst: `toets ${t.id} staat in de toetsenlijst maar in geen enkele les van de leergang` }, ctx));
    else if (!lessen.some(x => x.w === t.week)) meld(Object.assign({ ernst: 'fout', cat: 'toets', tekst: `toets ${t.id} heeft week ${t.week} in de toetsenlijst, maar de toetsles staat in week ${[...new Set(lessen.map(x => x.w))].join(', ')} (${lessen.map(x => nl(lesDatum(lg, x.w, x.slot).datum)).join(', ')})` }, Object.assign({}, bij(lg, lessen[0].w, lessen[0].slot), { bron })));
  }
  /* toetsles verwijst naar een toets die niet bestaat */
  for (const wk of L.weken) for (const slot of SLOTS) { const x = wk[slot]; if (x && x.type === 'toets' && x.toets && !(L.toetsen || []).some(t => t.id === x.toets)) meld(Object.assign({ ernst: 'fout', cat: 'toets', tekst: `toetsles verwijst naar toets "${x.toets}", die niet in de toetsenlijst van de klas staat` }, bij(lg, wk.w, slot), { bron: `basis.json, ${lesNaam(lg, wk.w, slot)}` })); }
  /* kalender: elke lesweek bestaat, toetsweken liggen niet in een vakantie */
  for (const wk of L.weken) { if (!kalW[wk.w]) meld({ ernst: 'fout', cat: 'toets', klas: KLAS(lg), lg, w: wk.w, datum: null, tekst: `lesweek ${wk.w} bestaat niet in de kalender`, bron: 'basis.json' }); }
}
for (const [lg, ranges] of Object.entries(B.toetsweken)) for (const x of ranges) {
  if (!B.leergangen[lg]) { meld({ ernst: 'fout', cat: 'toets', klas: lg, tekst: `toetsweken voor onbekende klas "${lg}"`, bron: 'basis.json toetsweken' }); continue; }
  const bron = `basis.json, toetsweek ${x.n} ${KLAS(lg)} (${x.van} t/m ${x.tot})`; const ctx = { klas: KLAS(lg), lg, datum: x.van, exact: true, bron };
  if (x.van > x.tot) meld(Object.assign({ ernst: 'fout', cat: 'toets', tekst: `toetsweek ${x.n}: begin ligt na het einde` }, ctx));
  const v = inVakantie(x.van) || inVakantie(x.tot); if (v) meld(Object.assign({ ernst: 'fout', cat: 'toets', tekst: `toetsweek ${x.n} (${x.van} t/m ${x.tot}) raakt de ${v.naam}` }, ctx));
}

/* ---------- 4. beoordelingsmodellen ---------- */
const lgVanKlas = (klas, lessen) => Object.keys(B.leergangen).find(lg => KLAS(lg).toLowerCase() === String(klas).toLowerCase())
  || ((lessen || []).map(k => k.lg).find(lg => B.leergangen[lg]) || null); // klas 3 heeft één model voor meerdere leergangen: dan telt de leergang van de gekoppelde lessen
const toetsId = t => String(t).split(' · ')[0]; // "P1 · presentatie 1" hoort bij toets P1
const modelIds = new Set();
for (const M of BM) {
  if (modelIds.has(M.id)) meld({ ernst: 'fout', cat: 'model', klas: M.klas, tekst: `beoordelingsmodel-id "${M.id}" komt twee keer voor`, bron: 'beoordeling.json' });
  modelIds.add(M.id);
  const lgK = lgVanKlas(M.klas, M.lessen);
  const ctx0 = { klas: M.klas, lg: lgK || null, bron: `beoordeling.json, model ${M.id}` };
  if (!lgK) { meld(Object.assign({ ernst: 'fout', cat: 'model', tekst: `model ${M.id}: klas "${M.klas}" bestaat niet als leergang` }, ctx0)); continue; }
  const L = B.leergangen[lgK];
  const wijstNaarToets = (L.toetsen || []).some(t => t.id === toetsId(M.toets));
  if (!(M.lessen || []).length) meld(Object.assign({ ernst: 'let op', cat: 'model', tekst: `model ${M.id} (${M.klas} ${M.toets}) is aan geen enkele les gekoppeld, dus het verschijnt nergens in de les` }, ctx0, { datum: null }));
  for (const k of M.lessen || []) {
    const wk = (B.leergangen[k.lg] || { weken: [] }).weken.find(x => x.w === k.w); const les = wk && wk[k.slot];
    const c = Object.assign(B.leergangen[k.lg] ? bij(k.lg, k.w, k.slot) : { klas: M.klas, lg: k.lg }, { bron: `beoordeling.json, model ${M.id} -> ${k.lg} week ${k.w} ${k.slot}` });
    if (!B.leergangen[k.lg]) { meld(Object.assign({ ernst: 'fout', cat: 'model', tekst: `model ${M.id} verwijst naar leergang "${k.lg}", die niet bestaat` }, c)); continue; }
    if (!les) { meld(Object.assign({ ernst: 'fout', cat: 'model', tekst: `model ${M.id} (${M.toets}) verwijst naar ${lesNaam(k.lg, k.w, k.slot)}, maar die les bestaat niet` }, c)); continue; }
    if (les.type === 'uitval' || les.type === 'toetsweek' || les.type === 'leeg') meld(Object.assign({ ernst: 'fout', cat: 'model', tekst: `model ${M.id} (${M.toets}) hangt aan ${lesNaam(k.lg, k.w, k.slot)}, maar die les is "${les.type}"` }, c));
    else if (les.type === 'toets' && les.toets && les.toets !== toetsId(M.toets) && k.lg === lgK) meld(Object.assign({ ernst: 'let op', cat: 'model', tekst: `model ${M.id} is voor toets ${M.toets}, maar de les waaraan het hangt is toets ${les.toets}` }, c));
    for (const wat of k.wat || []) if (!['docent', 'scoreblad', 'leerling'].includes(wat)) meld(Object.assign({ ernst: 'let op', cat: 'model', tekst: `model ${M.id}: onbekend onderdeel "${wat}"` }, c));
  }
  if (!wijstNaarToets && !(M.lessen || []).some(k => k.lg !== lgK)) meld(Object.assign({ ernst: 'let op', cat: 'model', tekst: `model ${M.id} is voor ${M.klas} toets ${M.toets}, maar die klas heeft geen toets met dat id (er zijn: ${(L.toetsen || []).map(t => t.id).join(', ') || 'geen'})` }, ctx0));
}

/* ---------- 5. teksten die botsen met vaste regels ---------- */
// Een examenconcert is een echt concert (besluit Frans 9-11-2026), geen "voor de klas": zo'n tekst of model telt niet mee voor de regel-klas.
const EXAMENCONCERT = /examen-?concert/i;
const ONTKEND = /\b(niet|nooit|geen|niemand|zonder|nergens)\b/i;
/* "voor publiek", "optreden" en "podium" horen bij echte concerten (Messiah, examenconcert, kerstviering) en tellen niet mee:
   de regel gaat over leerlingen die voor de klas spelen, zingen of presenteren */
const VOOR_DE_KLAS = [
  /\bvoor de (?:hele |gehele )?klas\b/i, /\baan de (?:hele |gehele )?klas\b/i, /\bvoor je klas\b/i,
  /\b(?:plenair|klassikaal) (?:presenteren|spelen|zingen|optreden|voordragen|laten horen|vertonen)/i,
  /\b(?:speel|speelt|spelen|zing|zingt|zingen|presenteer|presenteert|presenteren|toon|laat|laten|draag)\b[^.!?]{0,60}\bvoor (?:de )?(?:klasgenoten|medeleerlingen|klasgenootjes)\b/i
];
// staat in dezelfde tekst al dat het niet mag of dat het een bekend punt is, dan is het geen nieuwe botsing maar een notitie
const BEKEND = /\b(?:daarom niet|niet uitdelen|besluit frans|niet voor de klas|niemand speelt voor de klas)\b/i;
// \b voorkomt dat "koptelefoon" als telefoon telt
const TELEFOON = [/\btelefoons?\b/i, /\bmobiel(?:tje|s)?\b(?! instrument)/i, /\bsmartphones?\b/i, /\bgsm\b/i, /\bphones?\b/i, /\bscan(?:nen)? (?:de |je )?qr/i, /\bqr-?code scannen/i, /\bvoice ?memo/i];
const TELEFOON_TOEGESTAAN = /\b(?:geen|zonder|niet|weg|uit|in je tas|in de tas|inleveren|opbergen|wegleggen|weggelegd|verboden|gaat in de tas|liggen weg|op stil)\b/i;

function zinnen(t) { return String(t).split(/(?<=[.!?:;])\s+|\n+/).filter(Boolean); }
function tekstControle(tekst, ctx, wat) {
  if (typeof tekst !== 'string' || !tekst) return;
  const bekend = BEKEND.test(tekst);
  for (const z of zinnen(tekst)) {
    const vdk = VOOR_DE_KLAS.find(r => r.test(z));
    if (vdk && !ONTKEND.test(z) && !ctx.examenconcert && !EXAMENCONCERT.test(tekst)) meld(Object.assign({ ernst: bekend ? 'info' : 'let op', cat: 'regel-klas', tekst: `leerlingen voor de klas (${wat}${bekend ? ', staat er al als notitie bij' : ''}): "${z.slice(0, 190)}"` }, ctx));
    const tel = TELEFOON.find(r => r.test(z));
    if (tel && !TELEFOON_TOEGESTAAN.test(z)) meld(Object.assign({ ernst: 'let op', cat: 'regel-telefoon', tekst: `telefoon in de les (${wat}): "${z.slice(0, 190)}"` }, ctx));
  }
}
function looptekst(o, ctx, pad) {
  if (typeof o === 'string') { tekstControle(o, ctx, pad); return; }
  if (Array.isArray(o)) { o.forEach((x, i) => looptekst(x, ctx, pad)); return; }
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (k !== 'u') looptekst(v, ctx, pad ? pad + '.' + k : k);
}
for (const { lg, w, slot, les } of alleLessen()) {
  if (les.type === 'uitval') continue;
  const ctx = Object.assign(bij(lg, w, slot), { bron: `basis.json, ${lesNaam(lg, w, slot)}`, examenconcert: EXAMENCONCERT.test(les.titel || '') });
  looptekst(les, ctx, '');
}
for (const M of BM) { const lgK = lgVanKlas(M.klas, M.lessen); const l0 = (M.lessen || [])[0]; const ctx = Object.assign(l0 && B.leergangen[l0.lg] ? bij(l0.lg, l0.w, l0.slot) : { klas: M.klas, lg: lgK }, { bron: `beoordeling.json, model ${M.id}`, examenconcert: !!M.delen || EXAMENCONCERT.test(`${M.titel} ${M.thema}`) }); looptekst(M, ctx, ''); }

/* ---------- ordenen en uitvoer ---------- */
const ERNST = { fout: 0, 'let op': 1, info: 2 };
const dub = new Set();
const uniek = meldingen.filter(m => { const k = [m.klas, m.cat, m.bron, m.tekst].join('|'); if (dub.has(k)) return false; dub.add(k); return true; });
const fase = m => !m.datum ? 3 : m.datum < VANDAAG ? 2 : m.datum <= GRENS ? 0 : 1; // 0 = komende vier weken, 1 = later, 2 = voorbij, 3 = geen datum
const lijst = uniek.filter(m => ALLES || m.ernst !== 'info');
lijst.sort((a, b) => fase(a) - fase(b) || (a.datum || '').localeCompare(b.datum || '') || ERNST[a.ernst] - ERNST[b.ernst] || (a.slot || '').localeCompare(b.slot || ''));
const perKlas = new Map();
for (const m of lijst) { if (!perKlas.has(m.klas)) perKlas.set(m.klas, []); perKlas.get(m.klas).push(m); }
const klassen = [...perKlas.keys()].sort((a, b) => { const f = k => perKlas.get(k).reduce((x, m) => Math.min(x, fase(m) * 1e6 + (m.datum ? +m.datum.replace(/-/g, '') : 0)), Infinity); return f(a) - f(b); });
const tel = { fout: 0, 'let op': 0, info: 0 }; uniek.forEach(m => tel[m.ernst]++);

if (ALS_JSON) { console.log(JSON.stringify({ vandaag: VANDAAG, tot: GRENS, telling: tel, meldingen: lijst }, null, 1)); }
else {
  const FASE_NAAM = ['KOMENDE VIER WEKEN', 'LATER', 'AL VOORBIJ', 'ZONDER DATUM'];
  console.log(`Controle lesgegevens Lesdag, gedraaid op ${VANDAAG}. Komende vier weken: t/m ${nl(GRENS)}.`);
  console.log(`Sectiemap: ${sectieAanwezig ? SECTIE : 'NIET GEVONDEN'}. ${gecontroleerd.size} verschillende bestanden gecontroleerd.`);
  console.log(`Totaal: ${tel.fout} fouten, ${tel['let op']} let-op-meldingen${ALLES ? `, ${tel.info} info` : ` (en ${tel.info} info, zie --alles)`}.\n`);
  for (const k of klassen) {
    console.log(`=== ${k} ===`);
    let laatste = -1;
    for (const m of perKlas.get(k)) {
      const f = fase(m); if (f !== laatste) { console.log(`  -- ${FASE_NAAM[f]}`); laatste = f; }
      const wanneer = m.datum ? `${nl(m.datum)}${m.exact ? '' : ' (wk-maandag)'}` : 'geen datum';
      console.log(`  [${m.ernst.toUpperCase()}] ${wanneer}${m.w ? `, week ${m.w}` : ''}${m.slot ? ` les ${m.slot.slice(1)}` : ''} · ${m.cat}: ${m.tekst}${m.cat === 'bestand' || m.cat === 'model' || m.bron.startsWith('beoordeling') ? `  [${m.bron}]` : ''}`);
    }
    console.log('');
  }
  if (!lijst.length) console.log('Geen meldingen.');
}
process.exit(tel.fout ? 1 : 0);
