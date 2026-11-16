// Vwo 5 les 10.2 (ma 16-11-2026, vraag Frans): de kaart KC 4a moet geprint klaarliggen,
// maar de les noemde alleen "Kaart KC 4a" bij benodigd: geen printopdracht, geen link.
// Nu: printregel bij benodigd, link naar de PDF bij materiaal, en de kaart in de fase zelf.
// Opnieuw draaien kan geen kwaad.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const KC_PDF = { t: 'Kaart KC 4a: Kwintencirkel bladen, blad 3 (PDF, pagina 3)', u: 'https://studentcsgpm.sharepoint.com/Sectie%20Muziek/Gedeelde%20%20documenten/02%20Keuzevak%20muziek/Algemeen/Didactische%20kaarten/Kwintencirkel%20bladen.pdf?web=1' };
const PRINT = 'Kaart KC 4a geprint, één per leerling: Kwintencirkel bladen, alleen blad 3 (pagina 3, Omkeringen van drieklanken). Vóór de les bij de keyboards leggen.';

const lesVan = (L, id) => { const [k, wn] = id.split(':'); const [w, n] = wn.split('.'); const wk = (L[k] && L[k].weken || []).find(x => x.w === +w); return wk && wk['l' + n]; };

for (const bestand of ['public/data/basis.json', 'bron/leergang-data.json']) {
  const p = path.join(root, bestand), d = JSON.parse(fs.readFileSync(p, 'utf8')), L = d.leergangen || d.klassen;
  const les = lesVan(L, 'vwo5:10.2');
  if (!les) { console.log(bestand, 'vwo5:10.2 niet gevonden'); continue; }
  les.benodigd = (les.benodigd || []).filter(b => !/^Kaart KC 4a/.test(b));
  les.benodigd.splice(1, 0, PRINT);
  les.materiaal = (les.materiaal || []).filter(m => m.u !== KC_PDF.u);
  les.materiaal.push(Object.assign({}, KC_PDF));
  const f = (les.fasen || []).find(f => f && typeof f === 'object' && /^KC 4a/.test(f.kop || ''));
  if (f) {
    const stap = 'Pak kaart KC 4a erbij (blad 3): daar staan de omkeringen en de liggingen.';
    if (!f.stappen.includes(stap)) f.stappen.unshift(stap);
    const noot = 'Kaart KC 4a ligt geprint bij de keyboards: één per leerling, alleen blad 3 van Kwintencirkel bladen.';
    if (!(f.docent || '').includes(noot)) f.docent = noot + ' ' + (f.docent || '');
  }
  const m = (les.fasen || []).find(f => f && typeof f === 'object' && /^Messiah/.test(f.kop || ''));
  if (m && !/KC 4a/.test(m.docent || '')) m.docent = (m.docent || '') + ' Leg vóór je weggaat de geprinte kaarten KC 4a bij de keyboards.';
  fs.writeFileSync(p, JSON.stringify(d), 'utf8');
  console.log(bestand, 'vwo5:10.2 printregel, link en kaart in de fase');
}
