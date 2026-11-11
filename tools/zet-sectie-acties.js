// Sectietaken in lijn met de herindeling van de sectiemap (10-11-2026). Besluit Frans 11-11:
//   - de Besluiten- en actielijst 2026-2027 blijft de bron; Lesdag toont alleen wat Frans zelf moet doen, met het actienummer erbij;
//   - acties van collega's en van "Sectie" zijn geen losse taken, maar staan bij de agendataak van de vergadering waarop ze terugkomen;
//   - elke taak heeft een echte datum; afvinken in Lesdag verandert de Excel niet, dus de agendataak zegt: eerst de lijst bijwerken.
// Bronnen: 00 Sectie\01 Sectievergaderingen\2026-2027\Besluiten- en actielijst 2026-2027.xlsx (t/m actie 46),
//          00 Sectie\02 Vakwerkplan en beleid\2026-11-10 Werkwijze sectievoorzitter muziek.docx (jaarcyclus),
//          00 Sectie\02 Vakwerkplan en beleid\Vakwerkplannen\Vakwerkplan muziek 2026-2027.docx (actieplan).
// Nieuwe id's: al-<actienummer> (actielijst), ap-* (actieplan), aw-* (jaarcyclus Werkwijze).
// Mag vaker draaien. Gebruik: node tools/zet-sectie-acties.js [--droog]
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const droog = process.argv.includes('--droog');

const taak = (id, d, titel, info) => Object.assign({ id, d, titel, soort: 'taak', taak: true }, info ? { info } : {});
const nieuw = [
  taak('al-34', '2026-11-13', 'Schoolleiding melden: m2a, m2b en m2c zonder muziekles, 3 lesuren open (actie 18 en 34)', 'Werkwijze: lessen zonder docent meld je meteen bij de teamleider. Het bespreekstuk van 5 november noemt er 5; m1c en BB1 zijn inmiddels verdeeld.'),
  taak('al-35', '2026-11-20', 'Uitstel PTO-verbeteringen naar 2027-2028 laten bevestigen door de teamleider (actie 35)'),
  taak('al-26', '2026-11-27', 'Uitzoeken onder welke klascode BB1 in het PTO valt (actie 26)', 'BB1 krijgt les en heeft PTO-toetsen, maar de code BB1 staat niet in het PTO-overzicht.'),
  taak('al-28', '2026-11-27', 'Lokalen 009 en 020: met Albert afspreken wie de vijf vervolgacties doet (actie 28 t/m 32)', 'Maat lokaal (studio\'s van 020 erbij), akoestiek meten in 020 en 009, oefenruimtes en units (minimaal 4, liefst 6 tot 8), haalbaarheid eiland in de vide of langs twee wanden, opties voor de inrichting van de studio\'s. Op de actielijst staat nog geen eigenaar of datum.'),
  taak('al-17', '2026-12-04', 'Mobiel podium voor muziek en de aula bespreken met Beheer (actie 17)', 'Niet op kosten van muziek. Zie de toelichting bij de vakgroepbegroting 2027-2030.'),
  taak('al-36', '2026-12-18', 'PTA 2027-2028 rechtzetten: datum Messiah, dubbele P3 havo, moment havo 5 P4 (actie 36)', 'Codes havo 5 verschuiven naar P4 en P5. Dit jaar geen PTA-wijzigingen meer. De actielijst zegt vóór de zomervakantie 2027; deze datum sluit aan op "voor de kerst" bij de PTA\'s en leergangen 2027-2028.'),
  taak('al-39', '2027-01-05', 'Vakwerkplan hoofdstuk 7 nalopen op de vijf vragen uit het Bespreekoverzicht (actie 39)', 'Beeld bij concerten en bij wie je meldt staan er nog niet in. Vaststelling vakwerkplan op 12 januari.'),
  taak('ap-bb1', '2027-01-05', 'Tussenevaluatie bovenbouw voorbereiden voor 12 jan', 'Actieplan thema 6: dekt Musicbox de examenstof, en waar vult ons eigen materiaal aan?'),
  taak('ap-bb2', '2027-02-09', 'Stand examenvoorbereiding mavo 4 klaarzetten voor 16 feb', 'Actieplan thema 6.'),
  taak('aw-exc', '2027-02-09', 'Excursies voor volgend jaar op de agenda van 16 feb', 'Werkwijze, jaarcyclus. Het excursieplan moet vóór 1 mei bij het CvB liggen.'),
  taak('aw-cvb', '2027-04-19', 'Sluitende begroting en excursieplan indienen bij het CvB', 'Excursiebeleid p.3: vóór 1 mei, met de relatie met het onderwijsprogramma uitgewerkt.'),
  taak('al-42', '2027-06-01', 'Navragen bij de teamleider of de algemene schooltaken 80 of 45 uur zijn (actie 42)', 'Normjaartaakbeleid p.4 (tekst) zegt 80 uur, de tabel op p.4 en de samenvatting op p.6 zeggen 45 uur. Vóór de taakgesprekken.'),
  taak('al-38', '2027-06-01', 'Stemmen van de piano\'s als terugkerende regel in het actieplan 2027-2028 zetten (actie 38)', 'Zie Bespreekoverzicht, Praktisch.'),
  taak('aw-pta', '2027-06-14', 'PTA 2027-2028 invoeren', 'Toetsbeleid p.19 en p.26: half juni.'),
  taak('al-43', '2027-06-15', 'Vakwerkplan en PTO 2027-2028 klaar voor vaststelling op 22 jun (actie 43)', 'Toetsbeleid p.4: uiterlijk 1 september vastgesteld, daarom in de junivergadering.'),
  taak('ap-bb3', '2027-06-15', 'Evaluatie eerste jaar Musicbox bovenbouw voorbereiden voor 22 jun', 'Actieplan thema 6.')
];

const weg = new Set(['st1', 'st2', 'st3', 'im1', 'im2', 'im3', 'im4']); // gedaan, volgens de sectiemap en de actielijst

const AGENDA = 'Vast begin: besluiten- en actielijst (5 min) en taal (10 min). Werk de actielijst eerst bij met wat je in Lesdag hebt afgevinkt.';
const wijzig = {
  st4: { info: 'Volgens de Werkwijze staat elk verslag binnen een week in 01 Sectievergaderingen, op een half A4: besluiten, acties, uit de school en volgende keer. De bestandsnaam begint met de datum en de link gaat in het Teams-kanaal. Klaar als het verslag in de map staat en de link in Teams. Er staat geen apart verslag van 13 okt of 15 sep, wel 2026-11-02 Verslag besluiten en acties. Of dat ze vervangt en of de link al in Teams staat, is aan jou om te beoordelen.' },
  st5: { titel: 'Urentabel, verdeling actiepunten en de drie onverdeelde lesuren van mavo 2 op de agenda van 12 jan (actie 12)', info: 'm2a, m2b en m2c. M1c en BB1 zijn verdeeld.' },
  ll1: { titel: 'Bij Hans nagaan of het concept leerlijn onderbouw klaarstaat voor 12 jan (actie 10)', info: 'Actieplan thema 1: Hans is de trekker. Met vaktaal en de bouwstenen voor burgerschap.' },
  ll2: { titel: 'Bij Hans nagaan of de leerlijn onderbouw klaarstaat voor vaststelling op 6 apr', info: 'Actieplan thema 1: Hans is de trekker.' },
  ww1: { titel: 'Werkwijze sectievoorzitter op de agenda van 12 jan: vaststellen (actie 41)' },
  ww2: { titel: 'Toetsexpert van de sectie afspreken (actie 44)' },
  pto1: { titel: 'Voorstel PTO 2027-2028 met taalcontrole klaar (actie 23)', info: 'Neem mee: klas 1 op elkaar afstemmen (actie 24) en de herkansingen in de onderbouw (actie 25).' },
  or1: { info: 'Op ontwikkeldag 4 of in de laatste schoolweken; afspreken op 25 mei.' },
  sv3: { info: 'Vakwerkplan en Werkwijze vaststellen · concept leerlijn onderbouw met vaktaal en bouwstenen · tussenevaluatie bovenbouw · resultaten toetsweek 1 en eerste evaluatie · urentabel, verdeling actiepunten en lesuren mavo 2 · uitkomst gesprek lokalen' },
  'sv3-ag': { info: AGENDA + ' Van collega\'s en de sectie: stand tutorials (Andre, actie 9), concept leerlijn (Hans, actie 10), PTO-toetsen van dit jaar aanpassen (actie 22), toetsexpert (actie 44), trekkers voor actiepunt 2, 7 en 8 (actie 46), concept vaktaallijst, controle burgerschapslijst en afstemming met Engels over You Say.' },
  'sv4-ag': { info: AGENDA + ' Van collega\'s en de sectie: good practice taal, ieder laat de bewerkte box zien.' },
  'sv5-ag': { info: AGENDA + ' Van collega\'s en de sectie: leerlijn met vaktermen, taaldoelen en burgerschap vaststellen, en bespreken of we een theorieniveau voor eind klas 3 afspreken (actie 40).' },
  'sv6-ag': { info: AGENDA + ' Van collega\'s en de sectie: aanvullend materiaal tutorials klaar, theorietoetsen op taal gecontroleerd, en wie het document over doorstroom havo 5 naar vwo 5 en afstroom vwo 4 naar havo 4 schrijft (actie 45, klaar half juni).' },
  'sv7-ag': { info: AGENDA + ' Van collega\'s en de sectie: evaluatie abonnement De Piramide (actie 20), punten onder Later oppakken (actie 37), vakwerkplan en PTO 2027-2028 vaststellen (actie 43), evaluatie taal en burgerschap.' }
};
const zonderChecklist = s => s.replace(' Checklist in de werkwijze (bijlage Maandcontrole).', '');

function doe(bestand) {
  const p = path.join(root, bestand); const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const voor = data.sectie.length; let aangepast = 0;
  data.sectie = data.sectie.filter(x => !weg.has(x.id) && !/^(al|ap|aw)-/.test(x.id));
  for (const x of data.sectie) {
    if (wijzig[x.id]) { Object.assign(x, wijzig[x.id]); aangepast++; }
    if (/^mc-/.test(x.id) && x.info) { x.info = zonderChecklist(x.info); aangepast++; }
  }
  data.sectie = data.sectie.concat(nieuw.map(x => Object.assign({}, x)));
  console.log(`${bestand}: ${voor} -> ${data.sectie.length} sectiepunten, ${aangepast} aangepast, ${nieuw.length} nieuw`);
  if (!droog) fs.writeFileSync(p, JSON.stringify(data), 'utf8');
}
doe('public/data/basis.json');
doe('bron/leergang-data.json');
