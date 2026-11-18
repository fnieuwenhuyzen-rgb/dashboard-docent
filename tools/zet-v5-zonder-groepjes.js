// 18-11-2026, Frans: in havo 5 en vwo 5 geen "groepje" in de lessen van 16-11 (kleine klassen, werkvorm beslist Frans per onderdeel).
// vwo5:10.1 Messiah-fase klassikaal, zoals havo5:11.2 al was; HD4-fase zonder "laptop van de groep". Opnieuw draaien kan geen kwaad.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const SITE_KORT = 'messiah-oefensite.f-nieuwenhuyzen.workers.dev';
const VERV = new Map([
  ['Ga met je groepje naar je eigen plek of eigen ruimte.', `We zingen met de hele klas. De oefensite staat op het digibord: ${SITE_KORT}`],
  [`Laptop van je groep open: ${SITE_KORT}`, null],
  ['Nog niet aangemeld? Meld je aan met je naam, klas en stem. Op één laptop kan één leerling aangemeld zijn: de anderen melden zich thuis aan op hun eigen telefoon of computer.', 'Nog niet aangemeld? Meld je thuis aan op de computer, met je naam, klas en stem.'],
  ['Nr. 7 is nieuw. Kies je stem op de oefensite, luister naar het begin en volg je partij: sopraan, dan bas, alt en tenor.', 'Nr. 7 is nieuw. Luister naar het begin en volg je partij: sopraan, dan bas, alt en tenor.'],
  ['Invullen doe je op de laptop van de groep of thuis op een computer. De link staat in je Magister-bericht.', 'Invullen doe je thuis op een computer. De link staat in je Magister-bericht.']
]);
for (const bestand of ['public/data/basis.json', 'bron/leergang-data.json']) {
  const p = path.join(root, bestand), d = JSON.parse(fs.readFileSync(p, 'utf8')), L = d.leergangen || d.klassen;
  for (const [k, w, n] of [['havo5', 11, 'l1'], ['vwo5', 10, 'l1'], ['vwo5', 11, 'l1']]) {
    const les = L[k].weken.find(x => x.w === w)[n];
    for (const f of les.fasen) if (f && typeof f === 'object' && f.stappen) {
      f.stappen = f.stappen.flatMap(s => VERV.has(s) ? (VERV.get(s) === null ? [] : [VERV.get(s)]) : [s]);
    }
    console.log(bestand, `${k}:${w}.${n.slice(1)}`, JSON.stringify(les.fasen.map(f => typeof f === 'object' ? f.stappen : f)).match(/groep|laptop/gi) || 'schoon');
  }
  fs.writeFileSync(p, JSON.stringify(d), 'utf8');
}
