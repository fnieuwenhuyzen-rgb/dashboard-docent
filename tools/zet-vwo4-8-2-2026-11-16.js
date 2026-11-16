// Vwo 4 les 8.2 (wo 18-11-2026, vraag Frans 16-11): 8.1 werd pas op 16-11 gegeven, dus 8.2 schuift naar wo 18-11
// en daarna is het P1 (ma 23-11). De generale (10.2) past er niet meer tussen: 8.2 wordt improviseren plus generale.
// Partij en niveau kiezen gebeurde al in 8.1. Messiah valt deze les weg (tijd voor P1).
// Les 10.2 blijft in de data staan: Frans zet hem na P1 in Jaar op overgeslagen.
// Opnieuw draaien kan geen kwaad.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const GENERALE_PPT = { t: 'Presentatie: Generale P1 (PowerPoint)', u: 'https://studentcsgpm.sharepoint.com/Sectie%20Muziek/Gedeelde%20%20documenten/02%20Keuzevak%20muziek/VWO/VWO%204/Lessen%202026-2027/10.2%20Generale%20PT1%20-%20Backwater%20blues.pptx?web=1' };

const lesVan = (L, id) => { const [k, wn] = id.split(':'); const [w, n] = wn.split('.'); const wk = (L[k] && L[k].weken || []).find(x => x.w === +w); return wk && wk['l' + n]; };
const kopie = x => JSON.parse(JSON.stringify(x));

for (const bestand of ['public/data/basis.json', 'bron/leergang-data.json']) {
  const p = path.join(root, bestand), d = JSON.parse(fs.readFileSync(p, 'utf8')), L = d.leergangen || d.klassen;
  const les = lesVan(L, 'vwo4:8.2'), gen = lesVan(L, 'vwo4:10.2');
  if (!les || !gen) { console.log(bestand, '8.2 of 10.2 niet gevonden'); continue; }
  const ladder = (les.fasen || []).find(f => f && f.kop && /^De bluestoonladder in A/.test(f.kop));
  const gf = kop => kopie(gen.fasen.find(f => f && f.kop === kop));
  if (!ladder || !gf('Afspraken: wie doet wat')) { console.log(bestand, 'fasen al omgebouwd of niet gevonden'); continue; }

  const afspraken = Object.assign(gf('Afspraken: wie doet wat'), { min: 3 });
  const uitleg = Object.assign(kopie(ladder), { min: 10, soort: 'uitleg' });
  uitleg.stappen = uitleg.stappen.filter(s => !/^Probeer het meteen/.test(s)).concat(['Probeer het meteen: de band speelt twaalf maten, ieder speelt twee maten A-C-E. Daarna nog een ronde, met de Es erbij.']);
  uitleg.klaar = 'Speel een motief van twee noten en herhaal het in elke maat van het schema.';
  uitleg.docent = 'Kaart TL 1a. Kort voordoen op het keyboard, dan meteen spelen. Niet langer dan tien minuten: daarna is het de generale.';
  const eerste = Object.assign(gf('Eerste keer: helemaal door, zonder stoppen'), { min: 12 });
  const terug = Object.assign(gf('Terugluisteren'), { min: 5 });
  const tweede = Object.assign(gf('Tweede keer: zoals maandag'), { min: 12 });
  const check = Object.assign(gf('Klaar-voor-P1-lijst'), { min: 3 });

  les.titel = 'Improviseren in A en generale P1: Backwater blues';
  les.detail = 'Bluestoonladder in A (10 min), daarna de generale: afspraken, twee keer helemaal door met opname en terugluisteren. Partij en niveau zijn in 8.1 gekozen.';
  les.vraag = 'Staan we klaar voor maandag?';
  les.doel = 'Je improviseert vier maten op de bluestoonladder in A en speelt Backwater blues twee keer helemaal door, zoals bij P1.';
  les.criteria = kopie(gen.criteria);
  les.fasen = [afspraken, uitleg, eerste, terug, tweede, check];
  delete les.messiahNieuw; delete les.messiahHerhaal;
  les.formatief = { soort: 'zelfcheck', tekst: 'Klaar-voor-P1-lijst: partij, inzet, couplet, improvisatie. Mis je er twee? Oefen thuis met Musicbox.' };
  les.materiaal = (les.materiaal || []).filter(m => m.u !== GENERALE_PPT.u);
  les.materiaal.splice(1, 0, Object.assign({}, GENERALE_PPT));
  les.benodigd = [
    'Musicbox op de laptop: box Voorlopers van Jazz, Backwater blues, Musicsheets en Lyrics',
    'Keyboards, gitaar, basgitaar, drumstel in 009, versterkers',
    'Kaart TL 1a (bluestoonladder in A)',
    'Opnameapparaat van de docent',
    'Klaar-voor-P1-lijst: partij, inzet, zang, improvisatie'
  ];
  fs.writeFileSync(p, JSON.stringify(d), 'utf8');
  console.log(bestand, 'vwo4:8.2', les.fasen.map(f => f.min + ' ' + f.kop).join(' | '), '=', les.fasen.reduce((s, f) => s + f.min, 0), 'min');
}
