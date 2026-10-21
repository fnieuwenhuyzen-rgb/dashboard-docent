// Zet inhoud-week8.json om naar inhoud-wk8app.json (formaat van merge-inhoud.js) met de presentaties als materiaal.
// Gebruik: node tools/koppel-week8.js && node tools/merge-inhoud.js wk8app vwo4 vwo5 havo4 havo5 vwo6 mavo3 mavo4 --force
const fs = require('fs'), path = require('path');
const INH = JSON.parse(fs.readFileSync(path.join(__dirname, 'inhoud-week8.json'), 'utf8'));
const out = { _mat: { mb: { t: 'Musicbox (digitaal.musicboxmethode.nl)', u: 'https://digitaal.musicboxmethode.nl' } }, lessen: {} };
for (const [kl, K] of Object.entries(INH)) {
  if (kl.startsWith('_')) continue;
  K.lessen.forEach((l, i) => {
    const key = 'pres-' + kl + '-' + (i + 1);
    out._mat[key] = { t: 'Presentatie: ' + (l.kort || l.titel) + ' (PowerPoint)', u: K.map + String.fromCharCode(92) + l.bestand };
    const mat = [key]; if (K.thuis && K.thuis.mb) mat.push('mb');
    out.lessen[l.titel] = { vraag: l.vraag, doel: l.doel, criteria: l.criteria, fasen: l.fasen, formatief: l.formatief, identiteit: l.identiteit, materiaal: mat };
  });
}
fs.writeFileSync(path.join(__dirname, 'inhoud-wk8app.json'), JSON.stringify(out, null, 2) + '\n');
console.log(Object.keys(out.lessen).length + ' lessen');
