// Handelingsdeel 4: keuzeformulier in de eerstvolgende lessen en de sectietaak van 13 november (besluit Frans 5-11-2026).
// Opnieuw draaien kan geen kwaad: een les die de fase al heeft, wordt overgeslagen.
// Draai dit opnieuw na merge-inhoud.js --force voor week 10 of 11, want dat overschrijft fasen en materiaal.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const FORM = 'https://forms.office.com/Pages/ResponsePage.aspx?id=6jlsN-pIK0SlIWuX5D5o5rn3J0sJj0FNh0fuBL0Hhh5UNlFEMkUzWjIxVlBLMTI5WVI1MVMxUTBBSy4u';
const KOP = 'Handelingsdeel 4: kies je muzikale bijdrage';
const KOP2 = 'Handelingsdeel 4: heb je al gekozen?';
const KEUZES = 'Kies één: koor, band of ensemble; open dag of viering; coaching; onderhoud en lokaal.';
const NIET_TEL = 'Invullen doe je op de laptop of thuis, niet op je telefoon. De link staat in je Magister-bericht.';
const WEEK10 = { min: 2, soort: 'gesprek', kop: KOP, stappen: ['Vul vóór 13 november het keuzeformulier in.', KEUZES, NIET_TEL], docent: 'Vraag wie al heeft ingevuld. Daarna halen ze de aftekenkaart van hun keuze bij jou.' };
const WEEK11 = { min: 2, soort: 'gesprek', kop: KOP2, stappen: ['De keuze moest vóór 13 november binnen zijn. Nog niet gedaan? Doe het vandaag.', KEUZES, NIET_TEL], docent: 'Kijk vóór de les in de lijst Handelingsdeel 4 2026-2027 wie nog op Nog kiezen of Kies één staat. Geef wie gekozen heeft de aftekenkaart.' };
const LESSEN = [['vwo5', 10, 'l1', WEEK10], ['vwo6', 10, 'l2', WEEK10], ['havo4', 11, 'l1', WEEK11], ['havo5', 11, 'l1', WEEK11], ['vwo4', 11, 'l1', WEEK11], ['vwo5', 11, 'l1', WEEK11], ['vwo6', 11, 'l1', WEEK11]];
const minVan = f => typeof f === 'string' ? +(f.match(/^(\d+)\s*min/) || [0, 0])[1] : f.min || 0;
const zetMin = (f, m) => typeof f === 'string' ? f.replace(/^\d+/, m) : Object.assign(f, { min: m });
const TITEL = 'Handelingsdeel 4: keuzes nakijken in de lijst, kader en aftekenkaarten uitdelen';
const INFO = 'Havo 4 en 5, vwo 4, 5 en 6. Keuzes komen via het formulier in de lijst Handelingsdeel 4 2026-2027 (site Sectie Muziek). Wie op Nog kiezen of Kies één staat, krijgt in lesweek 11 een herinnering in de les.';
for (const bestand of ['public/data/basis.json', 'bron/leergang-data.json']) {
  const p = path.join(root, bestand), d = JSON.parse(fs.readFileSync(p, 'utf8')), L = d.leergangen || d.klassen;
  for (const [kl, w, n, fase] of LESSEN) {
    const k = L[kl]; const week = k && k.weken.find(x => x.w === w); const les = week && week[n];
    if (!les || !Array.isArray(les.fasen)) { console.log(bestand, kl, w, n, 'NIET GEVONDEN'); continue; }
    if (les.fasen.some(f => typeof f === 'object' && (f.kop === KOP || f.kop === KOP2))) { console.log(bestand, kl, w, n, 'staat er al'); continue; }
    const voor = les.fasen.reduce((s, f) => s + minVan(f), 0);
    let i = 0; les.fasen.forEach((f, j) => { if (minVan(f) > minVan(les.fasen[i])) i = j; });
    les.fasen[i] = zetMin(les.fasen[i], minVan(les.fasen[i]) - fase.min);
    les.fasen.unshift(JSON.parse(JSON.stringify(fase)));
    les.materiaal = (les.materiaal || []).concat([{ t: 'Keuzeformulier handelingsdeel 4', u: FORM }]);
    console.log(bestand, kl, w, n, les.titel.slice(0, 40), 'min', voor, '->', les.fasen.reduce((s, f) => s + minVan(f), 0));
  }
  const taak = (d.sectie || []).find(x => x.id === 'hd5');
  if (taak) { taak.titel = TITEL; taak.info = INFO; console.log(bestand, 'hd5 bijgewerkt'); } else console.log(bestand, 'hd5 niet aanwezig');
  fs.writeFileSync(p, JSON.stringify(d), 'utf8');
}
