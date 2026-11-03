// Zet de uitgewerkte lesinhoud uit de deckbestanden (schema: tools/inhoud-decks-LEESMIJ.md) in public/data/basis.json en bron/leergang-data.json.
// Gebruik: node tools/zet-decks-in-leergang.js [--droog]
// Koppeling op het veld koppel, niet op lestitel. Sprekersnotities (notitie) blijven in de decks: de lesmodus toont ze niet. Mag vaker draaien; draai het ook na merge-inhoud.js --force.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const droog = process.argv.includes('--droog');
const { spUrl } = require('./sp');
const NAMEN = ['week10', 'kerst-klas3', 'herbouw-mavo', 'bb1'];
const VELDEN = ['titel', 'type', 'detail', 'vraag', 'doel', 'criteria', 'identiteit', 'benodigd'];
const blokken = NAMEN.flatMap(n => Object.entries(JSON.parse(fs.readFileSync(path.join(__dirname, 'inhoud-' + n + '.json'), 'utf8'))).filter(([k]) => k[0] !== '_').map(([, b]) => b));

function schoon(f) { // fase zoals de lesmodus hem gebruikt
  const r = {}; for (const k of ['min', 'soort', 'kop', 'stappen', 'klaar', 'docent', 'beeld']) if (f[k] != null && f[k] !== '') r[k] = f[k];
  return r;
}
function fasenUit(d, les) {
  if (d.fasen) return d.fasen.map(schoon);
  const extra = d.fasenExtra || {};
  return (les.fasen || []).map((f, i) => schoon(Object.assign({}, f, extra[i])));
}
function zet(les, d) {
  const gewijzigd = [];
  const nieuw = { fasen: fasenUit(d, les) };
  for (const k of VELDEN) if (d[k] != null) nieuw[k] = d[k];
  if (d.materiaal) nieuw.materiaal = d.materiaal.map(m => m.sp ? { t: m.t, u: spUrl(m.sp) } : m);
  if (d.formatief) { const { notitie, ...rest } = d.formatief; nieuw.formatief = Object.assign({}, les.formatief, rest); }
  for (const k in nieuw) if (JSON.stringify(les[k]) !== JSON.stringify(nieuw[k])) { les[k] = JSON.parse(JSON.stringify(nieuw[k])); gewijzigd.push(k); }
  return gewijzigd;
}
function doe(bestand, pak) {
  const p = path.join(root, bestand);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const b of blokken) for (const d of b.lessen) for (const k of d.koppel) {
    const w = pak(data)[k.lg].weken.find(x => x.w === k.w); const les = w && w[k.slot];
    if (!les) throw new Error(bestand + ': les niet gevonden ' + JSON.stringify(k));
    const g = zet(les, d); const som = les.fasen.reduce((a, f) => a + (f.min || 0), 0);
    console.log(`${bestand} ${k.lg} ${k.w}.${k.slot} ${les.titel}: ${g.join(', ') || 'al gelijk'}${som !== 45 ? ' LET OP: ' + som + ' min' : ''}`);
  }
  if (!droog) fs.writeFileSync(p, JSON.stringify(data), 'utf8');
}
doe('public/data/basis.json', d => d.leergangen);
doe('bron/leergang-data.json', d => d.klassen);
