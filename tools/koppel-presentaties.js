// Koppelt de PowerPoint-lespresentaties uit de lesmap als materiaal in inhoud-klas3.json.
// Gebruik: node tools/koppel-presentaties.js   (daarna merge-inhoud --force)
const fs = require('fs'), path = require('path');
const { spUrl } = require('./sp');
const p = path.join(__dirname, 'inhoud-klas3.json'); const j = JSON.parse(fs.readFileSync(p, 'utf8'));
const MAP = '01 Onderbouw muziek\\Klas 3\\Lessen 2026-2027\\';
const KOPPEL = {
  'Songbox 1: opnemen en terugluisteren': ['pres08', 'Presentatie: Songbox 1 opnemen en terugluisteren (PowerPoint)', '08 Songbox 1 - opnemen en terugluisteren.pptx'],
  'Nieuwe songbox: Way Maker (Sinach)': ['pres11', 'Presentatie: Way Maker kennismaken (PowerPoint)', '11 Way Maker - kennismaken.pptx']
};
for (const [titel, [key, t, bestand]] of Object.entries(KOPPEL)) {
  j._mat[key] = { t, u: spUrl(MAP + bestand) };
  const l = j.lessen[titel]; l.materiaal = l.materiaal || []; if (!l.materiaal.includes(key)) l.materiaal.unshift(key);
  console.log(titel, '→', l.materiaal.join(', '));
}
fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
