// Zet de leergangvelden van het keuzeuur (tools/inhoud-kmu3.json) in public/data/basis.json en bron/leergang-data.json:
// meta (bron, toetskop, seAandeel), blok P4, thuis per lesweek en lesweek 1-30 als geen les (type uitval, dan slaat de app ze over; les-id's blijven gelijk). De lessen zelf gaan met zet-decks-in-leergang.js.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const inh = JSON.parse(fs.readFileSync(path.join(__dirname, 'inhoud-kmu3.json'), 'utf8'));
function doe(bestand, pak) {
  const p = path.join(root, bestand); const data = JSON.parse(fs.readFileSync(p, 'utf8')); const k = pak(data).kmu3;
  Object.assign(k.meta, inh._leergang.meta);
  const i = k.blokken.findIndex(b => b.id === inh._leergang.blok.id); k.blokken[i] = inh._leergang.blok;
  for (const w of k.weken) if (w.w <= 30) w.l1 = { type: 'uitval', titel: 'Geen les: keuzeuur begint in lesweek 31' };
  for (const l of inh.kmu3.lessen) { const w = k.weken.find(x => x.w === l.week); if (l.thuis) w.thuis = l.thuis; else delete w.thuis; }
  fs.writeFileSync(p, JSON.stringify(data), 'utf8'); console.log(bestand + ': meta, blok P4 en thuis gezet');
}
doe('public/data/basis.json', d => d.leergangen);
doe('bron/leergang-data.json', d => d.klassen);
