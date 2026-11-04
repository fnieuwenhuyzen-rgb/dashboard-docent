// Vervangt de telefoon door de laptop in de lesgegevens en hun bronnen (besluit Frans 4-11-2026).
// Werkt op de ruwe tekst, zodat de opmaak van de bestanden gelijk blijft. Opnieuw draaien kan geen kwaad.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const { paren } = JSON.parse(fs.readFileSync(path.join(__dirname, 'geen-telefoon-paren.json'), 'utf8'));
const doelen = [
  ...fs.readdirSync(__dirname).filter(f => /\.json$/.test(f) && f !== 'geen-telefoon-paren.json').map(f => path.join('tools', f)),
  'tools/maak-decks-klas3.js', 'tools/maak-decks-week8.js',
  'public/data/basis.json', 'bron/leergang-data.json', 'bron/leergang-dashboard.html',
];
let totaal = 0;
for (const d of doelen) {
  const p = path.join(root, d); let t = fs.readFileSync(p, 'utf8'); let n = 0;
  for (const [oud, nieuw] of paren) { const k = t.split(oud).length - 1; if (k) { t = t.split(oud).join(nieuw); n += k; } }
  if (n) { fs.writeFileSync(p, t, 'utf8'); console.log(String(n).padStart(4), d); totaal += n; }
}
console.log('vervangen:', totaal);
// wat er nog staat: alleen "telefoon weg" en dergelijke mag blijven
const mag = /telefoon weg|telefoon in je tas|geen telefoon/i;
const rest = {};
for (const d of doelen) {
  const t = fs.readFileSync(path.join(root, d), 'utf8');
  for (const m of t.matchAll(/[^"\n]{0,60}(?<![Kk]op)[Tt]elefoon[^"\n]{0,50}/g)) if (!mag.test(m[0])) (rest[d] = rest[d] || []).push(m[0]);
}
console.log('nog over:', JSON.stringify(rest, null, 1));
