// Bordtaak les-t7 (19-11-2026): drie printregels bij Klaarzetten hadden geen bestand.
// - bb1:30.1 en bb1:37.1 "Strookje geprint": nieuw strookje (tools/printbladen/maak-printbladen.js), in 01 Klas 1/Lessen 2026-2027
// - havo3:19.1 "Reflectieformulier geprint": het bestaande formulier stond al bij havo3 16.1, 18.1 en 20.1 (en bij vwo3 19.1), nu ook hier
// - mavo4:5.1 "werkblad met notenbalk": nieuw werkblad, in Mavo 4/Lessen 2026-2027
// Zet het bestand bij materiaal, zodat FUNCTIES.printBestand er een link "open bestand" van maakt. Opnieuw draaien kan geen kwaad.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const SP = 'https://studentcsgpm.sharepoint.com/Sectie%20Muziek/Gedeelde%20%20documenten/';
const KLAS1 = SP + '01%20Onderbouw%20muziek/01%20Klas%201/Lessen%202026-2027/';
const MAVO4 = SP + '02%20Keuzevak%20muziek/Mavo/Mavo%204/Lessen%202026-2027/';
const ZET = [
  { id: 'bb1:30.1', titel: /^Speelmoment: je song voor de docent/, m: { t: 'Strookje speelmoment (Word)', u: KLAS1 + '30.1%20Strookje%20speelmoment.docx?web=1' } },
  { id: 'bb1:37.1', titel: /^Eindopdracht: spelen voor de docent/, m: { t: 'Strookje eindopdracht (Word)', u: KLAS1 + '37.1%20Strookje%20eindopdracht.docx?web=1' } },
  { id: 'havo3:19.1', titel: /^P1: Presentatie lied of speelstuk/, na: 3, m: { t: 'Reflectieformulier speelstuk', u: SP + '01%20Onderbouw%20muziek/03%20Klas%203/P1%20Presentatie%20kerstlied/Speelstuk%20-%20reflectieformulier%20vwo%203.docx?web=1' } },
  { id: 'mavo4:5.1', titel: /^Toonhoogte en toonsoort/, m: { t: 'Werkblad notenbalk (Word)', u: MAVO4 + '05.1%20Werkblad%20notenbalk.docx?web=1' } },
];
const lesVan = (L, id) => { const [k, wn] = id.split(':'); const [w, n] = wn.split('.'); const wk = (L[k] && L[k].weken || []).find(x => x.w === +w); return wk && wk['l' + n]; };

for (const bestand of ['public/data/basis.json', 'bron/leergang-data.json']) {
  const p = path.join(root, bestand), d = JSON.parse(fs.readFileSync(p, 'utf8')), L = d.leergangen || d.klassen;
  for (const z of ZET) {
    const les = lesVan(L, z.id);
    if (!les || !z.titel.test(les.titel || '')) { console.log(bestand, z.id, 'niet gevonden of andere titel'); continue; }
    les.materiaal = (les.materiaal || []).filter(m => m.u !== z.m.u);
    les.materiaal.splice(z.na == null ? les.materiaal.length : z.na, 0, Object.assign({}, z.m));
    console.log(bestand, z.id, 'bestand bij materiaal');
  }
  fs.writeFileSync(p, JSON.stringify(d), 'utf8');
}
