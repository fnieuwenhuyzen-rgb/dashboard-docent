// Vwo 3 les 19.1, P1 Groepspresentatie lied (16-11-2026, vraag Frans): de regel "Reflectieformulier geprint" had geen bestand.
// Het formulier stond al bij 18.1 en 20.1; nu ook bij materiaal van 19.1, zodat Klaarzetten er een link naar geeft.
// Opnieuw draaien kan geen kwaad.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const FORM = { t: 'Reflectieformulier speelstuk', u: 'https://studentcsgpm.sharepoint.com/Sectie%20Muziek/Gedeelde%20%20documenten/01%20Onderbouw%20muziek/03%20Klas%203/P1%20Presentatie%20kerstlied/Speelstuk%20-%20reflectieformulier%20vwo%203.docx?web=1' };

const lesVan = (L, id) => { const [k, wn] = id.split(':'); const [w, n] = wn.split('.'); const wk = (L[k] && L[k].weken || []).find(x => x.w === +w); return wk && wk['l' + n]; };

for (const bestand of ['public/data/basis.json', 'bron/leergang-data.json']) {
  const p = path.join(root, bestand), d = JSON.parse(fs.readFileSync(p, 'utf8')), L = d.leergangen || d.klassen;
  const les = lesVan(L, 'vwo3:19.1');
  if (!les || !/^P1: Groepspresentatie lied/.test(les.titel || '')) { console.log(bestand, 'vwo3:19.1 niet gevonden of andere titel'); continue; }
  les.materiaal = (les.materiaal || []).filter(m => m.u !== FORM.u);
  les.materiaal.splice(3, 0, Object.assign({}, FORM)); // na de drie beoordelingsbestanden, vóór Musicbox
  fs.writeFileSync(p, JSON.stringify(d), 'utf8');
  console.log(bestand, 'vwo3:19.1 reflectieformulier bij materiaal');
}
