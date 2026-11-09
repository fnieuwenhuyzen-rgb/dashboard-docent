// node tools/test-toetsdatum.js
// Loopt alle toetsen in alle leergangen langs: staat de datum in basis.json (die gaat voor, besluit Frans 4-11) in dezelfde lesweek als de les in de leergang?
// Een afwijking mag alleen als ze hieronder staat. "verwerkt": de planning in app.js zet de toets op zijn datum (ankersVan, getest in test-planning.js).
// "OPEN": basis.json spreekt zichzelf tegen en Frans moet kiezen; de app laat het zoals het was. Een nieuwe afwijking laat deze test falen.
const assert = require('assert'), path = require('path');
const B = require(path.join(__dirname, '..', 'public', 'data', 'basis.json'));
const { plek, lesweekVan } = require(path.join(__dirname, '..', 'public', 'toetsdatum.js'));
const BEKEND = {
  'vwo4:P1': 'verwerkt: P1 (voorheen PT1) verplaatst naar ma 23-11 (besluit Frans 4-11), les staat in lesweek 10',
  'vwo6:T10': 'OPEN: datum do 1-4 valt in lesweek 27, de leergang zet T10 in lesweek 28 (toetsweek 3 begint do 1-4 volgens B.toetsweken en het PTA, lesweek 28 begint ma 5-4); Frans kiest',
};
const fouten = [], info = []; let n = 0;
const vrij = s => { const d = new Date(s + 'T12:00:00').getDay(); return d === 0 || d === 6 ? 'weekend' : (B.kalender.vakanties.find(v => s >= v.van && s <= v.tot) || {}).naam || (B.vrijeDagen.includes(s) ? 'leerlingen vrij' : null); };
for (const [lg, L] of Object.entries(B.leergangen)) {
  const weekVan = {}; // toets-id -> lesweken waarin een les met die toets staat
  for (const w of L.weken) for (const i of [1, 2, 3]) { const l = w['l' + i]; if (l && l.type === 'toets' && l.toets) (weekVan[l.toets] = weekVan[l.toets] || new Set()).add(w.w); }
  for (const T of L.toetsen || []) {
    n++; const sleutel = lg + ':' + T.id;
    if (!T.datum) { info.push(`${sleutel}: geen datum, de lesweek uit de leergang geldt`); continue; }
    if (vrij(T.datum)) info.push(`${sleutel}: MELDEN: datum ${T.datum} valt op een vrije dag (${vrij(T.datum)}); waarschijnlijk de maandag van de lesweek als richtdatum`);
    const weken = [...(weekVan[T.id] || [])]; if (!weken.length) { info.push(`${sleutel}: geen les met deze toets in de leergang`); continue; }
    const p = plek(B.kalender, T, weken[0]);
    if (p.w == null || lesweekVan(B.kalender, T.datum) == null) { fouten.push(`${sleutel}: datum ${T.datum} valt in geen lesweek`); continue; }
    const klopt = weken.includes(p.w);
    if (klopt && BEKEND[sleutel]) fouten.push(`${sleutel} staat nog in BEKEND maar klopt nu: haal hem daar weg`);
    if (!klopt && !BEKEND[sleutel]) fouten.push(`${sleutel}: datum ${T.datum} valt in lesweek ${p.w}, de leergang zet de toets in lesweek ${weken.join('/')}`);
    if (!klopt && BEKEND[sleutel]) info.push(`${sleutel}: ${BEKEND[sleutel]}`);
    if (T.week !== weken[0]) info.push(`${sleutel}: T.week (${T.week}) is niet de lesweek uit de leergang (${weken.join('/')})`);
  }
}
if (process.argv.includes('--toon')) info.forEach(t => console.log('  ' + t));
assert.strictEqual(fouten.length, 0, 'toetsdatum:\n  ' + fouten.join('\n  '));
console.log(`toetsdatum: ${n} toetsen, alles goed (${info.filter(t => /OPEN|MELDEN/.test(t)).length} punten om te melden, zie --toon)`);
