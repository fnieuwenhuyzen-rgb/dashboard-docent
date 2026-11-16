// Vwo 5 les 10.2 (ma 16-11-2026, vraag Frans): het Messiah-blok moet vierstemmig.
// Was: ieder oefent alleen met koptelefoon. Nu: kort per stem, dan samen vierstemmig
// bij het orkest over de speaker (eigen stem en andere stemmen op 0).
// Opnieuw draaien kan geen kwaad.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const KC_NOOT = 'Leg vóór je weggaat de geprinte kaarten KC 4a bij de keyboards.';

const lesVan = (L, id) => { const [k, wn] = id.split(':'); const [w, n] = wn.split('.'); const wk = (L[k] && L[k].weken || []).find(x => x.w === +w); return wk && wk['l' + n]; };

for (const bestand of ['public/data/basis.json', 'bron/leergang-data.json']) {
  const p = path.join(root, bestand), d = JSON.parse(fs.readFileSync(p, 'utf8')), L = d.leergangen || d.klassen;
  const les = lesVan(L, 'vwo5:10.2');
  const f = les && (les.fasen || []).find(f => f && typeof f === 'object' && /^Messiah/.test(f.kop || ''));
  if (!f) { console.log(bestand, 'vwo5:10.2 Messiah-fase niet gevonden'); continue; }
  f.min = 10;
  f.kop = 'Messiah vierstemmig: eerst je stem, dan samen';
  f.stappen = [
    'Drie minuten: oefensite open, koptelefoon op, kies je stem. Nr. 7 And He shall purify: de plekken uit les 10.1, op 70 procent van het tempo.',
    'Koptelefoon af. Ga staan, per stem bij elkaar, zo dat je de andere stemmen hoort.',
    'Eén laptop op de speaker, Begeleiding: Orkest. Bij Meer instellingen: Mijn stem en Andere stemmen op 0. Je hoort alleen het orkest.',
    'Nr. 4 And the glory of the Lord: vierstemmig, iedereen zingt zijn eigen stem.',
    'Dan nr. 7 vierstemmig, op 70 procent. Gaat een stem mis? Niet stoppen: houd je eigen stem vast en zing door.'
  ];
  f.docent = 'Jij bent niet in het lokaal. Bij aanvang kort zeggen: drie minuten per stem met koptelefoon, daarna samen vierstemmig met het orkest over de speaker. ' + KC_NOOT;
  fs.writeFileSync(p, JSON.stringify(d), 'utf8');
  console.log(bestand, 'vwo5:10.2', f.kop, (les.fasen || []).reduce((s, x) => s + (x.min || 0), 0), 'min');
}
