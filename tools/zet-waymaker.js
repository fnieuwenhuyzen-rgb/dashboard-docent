// Way Maker in havo 3 en vwo 3 (besluit Frans 4-11-2026): zet de lessen uit tools/inhoud-klas3.json in public/data/basis.json en bron/leergang-data.json.
// Alleen deze lessen worden aangeraakt (niet het hele jaar, zoals merge-inhoud.js --force). Mag vaker draaien.
//   havo 3: lesweek 21 t/m 27 (zonder 26, uitval): half theorie (20 min), half Way Maker (25 min). Lesweek 28 blijft de oefentoets.
//   vwo 3: Way Maker is songbox 2: kennismaken in lesweek 30, daarna lesweek 31 t/m 34. Lesweek 26 noemt Way Maker niet meer.
//   Sectietaak wm naar 1-2-2027. Blokteksten en meta.bron.
// Gebruik: node tools/zet-waymaker.js [--droog]
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const droog = process.argv.includes('--droog');
const inhoud = JSON.parse(fs.readFileSync(path.join(__dirname, 'inhoud-klas3.json'), 'utf8'));
const MAT = inhoud._mat;
const VELDEN = ['vraag', 'doel', 'criteria', 'fasen', 'formatief', 'identiteit', 'materiaal', 'benodigd'];
const LESSEN = [
  ['havo3', 21, 'Snaarinstrumenten · Way Maker leren kennen'],
  ['havo3', 22, 'Houtblazers en koperblazers · Way Maker: akkoorden en begeleiding'],
  ['havo3', 23, 'Slagwerk, toetsen en elektronica · Way Maker: partijen voor zang, bas en drums'],
  ['havo3', 24, 'Het symfonieorkest · Way Maker: samen in je groep'],
  ['havo3', 25, 'Bands en ensembles · Way Maker: opbouw en dynamiek'],
  ['havo3', 27, 'Rollen in een band en orkest · Way Maker doorspelen'],
  ['vwo3', 26, 'Rollen in een band en orkest'],
  ['vwo3', 30, 'Way Maker leren kennen'],
  ['vwo3', 31, 'Way Maker: partijen leren'],
  ['vwo3', 32, 'Way Maker: samenspel'],
  ['vwo3', 33, 'Way Maker: eigen arrangement'],
  ['vwo3', 34, 'Way Maker: doorspelen']
];
const kopie = o => JSON.parse(JSON.stringify(o));
const SECTIE_D = '2027-02-01';
const SECTIE_INFO = 'Nodig vanaf lesweek 21 in havo 3 (8 februari 2027) en vanaf lesweek 30 in vwo 3 (19 april 2027).';
const BRON_OUD = 'Way Maker schuift naar later in het jaar.';
const TEKST = {
  havo3: { bron: 'Way Maker volgt in periode 3: zes lessen in lesweek 21 t/m 27, elke les half theorie (20 min) en half songbox (25 min).', kennen: ' Daarnaast de songbox Way Maker: zes lessen in lesweek 21 t/m 27, elke les half theorie (20 min) en half Way Maker (25 min). Lesweek 28 is de oefentoets.' },
  vwo3: { bron: 'Way Maker is songbox 2 in periode 4 (kennismaken in lesweek 30, daarna lesweek 31 t/m 36); de theorie van periode 3 blijft compleet.', p4: 'Songbox 2 is Way Maker (besluit Frans, 4-11-2026). Afsluiting: slotronde in je groep, voor de docent.' }
};

function doe(bestand, pak) {
  const p = path.join(root, bestand); const data = JSON.parse(fs.readFileSync(p, 'utf8')); const lg = pak(data);
  for (const [k, w, titel] of LESSEN) {
    const src = inhoud.lessen[titel]; if (!src) throw new Error('geen inhoud voor ' + titel);
    const les = ((lg[k].weken.find(x => x.w === w) || {}).l1); if (!les) throw new Error(`${bestand}: les ${k} ${w} niet gevonden`);
    les.titel = titel; if (src.type) les.type = src.type; if (src.detail) les.detail = src.detail;
    for (const v of VELDEN) {
      if (src[v] == null) continue;
      if (v === 'materiaal') { // eerst de eigen lijst, daarna wat er al aan links aan hangt (presentaties, beoordeling)
        const nieuw = src.materiaal.map(m => typeof m === 'string' ? (MAT[m] || { t: m }) : m); const urls = new Set(nieuw.map(m => m.u));
        les.materiaal = nieuw.concat((les.materiaal || []).filter(m => !urls.has(m.u) && /^(Presentatie|Beoordeling|.*(beoordelingsformulier|scoreblad|zelfbeoordeling))/i.test(m.t || '')));
      } else les[v] = kopie(src[v]);
    }
    const som = les.fasen.reduce((a, f) => a + (f.min || 0), 0); if (som !== 45) console.log(`  LET OP ${k} ${w}: ${som} min`);
  }
  // blokteksten
  for (const k of ['havo3', 'vwo3']) {
    const g = lg[k]; if (!g) continue; const t = TEKST[k];
    if (g.meta.bron.includes(BRON_OUD)) g.meta.bron = g.meta.bron.replace(BRON_OUD, t.bron);
    const P3 = g.blokken.find(b => b.id === 'P3'), P4 = g.blokken.find(b => b.id === 'P4');
    if (t.kennen && !P3.kennen.includes('Way Maker')) P3.kennen += t.kennen;
    if (t.p4) P4.toetsing = t.p4;
  }
  // sectietaak wm
  let wm = null; (function zoek(o) { if (!o || typeof o !== 'object') return; if (o.id === 'wm' && o.taak) wm = o; else for (const v of Object.values(o)) zoek(v); })(data);
  if (!wm) throw new Error(bestand + ': sectietaak wm niet gevonden');
  wm.d = SECTIE_D; wm.info = SECTIE_INFO;
  if (!droog) fs.writeFileSync(p, JSON.stringify(data), 'utf8');
  console.log(bestand + ': ' + LESSEN.length + ' lessen, sectietaak wm op ' + SECTIE_D);
}
doe('public/data/basis.json', d => d.leergangen);
doe('bron/leergang-data.json', d => d.klassen);
