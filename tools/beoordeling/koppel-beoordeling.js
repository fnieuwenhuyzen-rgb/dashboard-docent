// Zet de beoordelingsformulieren uit alle modellen (tools/beoordeling/*.json, veld "lessen") als materiaal in de lessen
// van public/data/basis.json en bron/leergang-data.json. Draai dit na merge-inhoud.js (dat materiaal kan overschrijven).
// Gebruik: node tools/beoordeling/koppel-beoordeling.js
// Bestandsnamen moeten overeenkomen met wat maak-formulieren.js / maak-scoreblad.ps1 in de map "map" van het model zetten.
const fs = require('fs'), path = require('path');
const { spUrl } = require('../sp');
const root = path.join(__dirname, '..', '..');
const modellen = fs.readdirSync(__dirname).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')));
const bijlage = (M, wat) => {
  const pad = M.map.replace(/[\\/]+$/, '') + '\\';
  if (wat === 'docent') return { t: `${M.toets} beoordelingsformulier docent (Word)`, u: spUrl(pad + `${M.toets} Beoordelingsformulier docent.docx`) };
  if (wat === 'leerling') return { t: `${M.toets} format zelfbeoordeling leerling (Word)`, u: spUrl(pad + `${M.toets} Format zelfbeoordeling leerling.docx`) };
  if (wat === 'scoreblad') return { t: `${M.toets} scoreblad ${M.klas} (Excel, weging en cijfer)`, u: spUrl(pad + `${M.toets} Scoreblad ${M.klas}.xlsx`) };
};
function doe(bestand, pak) {
  const p = path.join(root, bestand); const data = JSON.parse(fs.readFileSync(p, 'utf8')); let n = 0; const mis = [];
  for (const M of modellen) for (const k of M.lessen || []) {
    if (typeof k !== 'object' || !k.lg) continue;
    const w = ((pak(data)[k.lg] || {}).weken || []).find(x => x.w === k.w); const les = w && w[k.slot];
    if (!les) { mis.push(`${M.id}: ${k.lg} w${k.w} ${k.slot}`); continue; }
    les.materiaal = les.materiaal || [];
    for (const wat of k.wat || []) { const b = bijlage(M, wat); if (b && !les.materiaal.some(m => m.u === b.u)) { les.materiaal.push(b); n++; } }
  }
  fs.writeFileSync(p, JSON.stringify(data), 'utf8');
  console.log(`${bestand}: ${n} koppelingen toegevoegd${mis.length ? '; les niet gevonden: ' + mis.join(' | ') : ''}`);
}
doe('public/data/basis.json', d => d.leergangen);
doe('bron/leergang-data.json', d => d.klassen);
