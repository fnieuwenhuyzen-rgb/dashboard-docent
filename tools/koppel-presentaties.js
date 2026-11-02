// Zet de presentatielinks uit tools/presentaties-links.json (geschreven door maak-decks.js) als eerste materiaal bij de les,
// in public/data/basis.json en bron/leergang-data.json. Verder verandert er niets aan die bestanden.
// Gebruik: node tools/koppel-presentaties.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const links = JSON.parse(fs.readFileSync(path.join(__dirname, 'presentaties-links.json'), 'utf8'));
function doe(bestand, pak) {
  const p = path.join(root, bestand); const data = JSON.parse(fs.readFileSync(p, 'utf8')); let nieuw = 0, bijgewerkt = 0;
  for (const k of links) {
    const lg = pak(data)[k.lg]; const w = lg && lg.weken.find(x => x.w === k.w); const l = w && w[k.slot];
    if (!l) { console.warn(`${bestand}: geen les ${k.lg} week ${k.w} ${k.slot}`); continue; }
    l.materiaal = l.materiaal || []; const bestaat = l.materiaal.find(m => m.u === k.u);
    if (bestaat) { if (bestaat.t !== k.t) { bestaat.t = k.t; bijgewerkt++; } } else { l.materiaal.unshift({ t: k.t, u: k.u }); nieuw++; }
  }
  fs.writeFileSync(p, JSON.stringify(data), 'utf8');
  console.log(`${bestand}: ${nieuw} links erbij, ${bijgewerkt} bijgewerkt`);
}
doe('public/data/basis.json', d => d.leergangen);
doe('bron/leergang-data.json', d => d.klassen);
