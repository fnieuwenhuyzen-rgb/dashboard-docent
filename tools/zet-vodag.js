// VO-dag voor groep 8, do 12 november 2026, ronde 2, lokaal 009 (besluit Frans 10-11: als mini-leergang "vodag").
// Bron: Documenten - Sectie Muziek\05 Activiteiten\VO dag\Draaiboek VO-dag muziek 12 november 2026.docx (versie 10-11, zonder helpers).
// Zet in public/data/basis.json en bron/leergang-data.json:
//   - leergang vodag met één les (lesweek 10) en in meta.uren de vier lesuren met hun groep (app.js: basisUren, eenmaligLg);
//   - vijf sectiepunten: de voorbereiding op wo 11-11 en het klaarzetten op do 12-11.
// Mag vaker draaien. Gebruik: node tools/zet-vodag.js [--droog]
const fs = require('fs'), path = require('path');
const { spUrl } = require('./sp');
const root = path.join(__dirname, '..');
const droog = process.argv.includes('--droog');
const DAG = '2026-11-12';
const MAP = '05 Activiteiten\\VO dag\\';

const uren = [
  { id: 'vodag-1', start: '12:45', eind: '13:10', groep: 'Gr. 14 Prins Maurits 8a', klaar: '25 lln · 12 buizen, 13 slagwerk' },
  { id: 'vodag-2', start: '13:15', eind: '13:40', groep: 'Gr. 5 Het Kompas', klaar: '13 lln · 12 buizen, 1 slagwerk' },
  { id: 'vodag-3', start: '13:45', eind: '14:10', groep: 'Gr. 11 De Vliegers', klaar: '18 lln · 12 buizen, 6 slagwerk' },
  { id: 'vodag-4', start: '14:15', eind: '14:40', groep: 'Gr. 7 De Bron + Pannebakker', klaar: '18 lln · 12 buizen, 6 slagwerk' }
].map(u => ({ ...u, s: DAG, lokaal: '009' }));

const les = {
  type: 'praktijk',
  titel: 'VO-dag: Seven Nation Army op boomwhackers',
  detail: 'Groep 8 speelt in 25 minuten samen de riff van Seven Nation Army op boomwhackers en slagwerk. Iedereen speelt tegelijk; niemand speelt alleen of voor de anderen. Zonder helpers: de meespeelpagina op het digibord speelt drums en bas (ook de laatste toon, de B), laat de kleuren oplichten en kan voorspelen. Vaste grens: op minuut 18 gaat de volle muziek aan, ook als de riff nog niet perfect is.\n' +
    'Opstelling: stoelen in een U met de opening naar het digibord. Van links: slagwerk, oranje, geel in het midden, groen, rood, slagwerk. Het instrument ligt al onder de stoel en blijft daar: niets uitdelen, niets ophalen. Kleinere groep: eerst alle buizen bezetten, overgebleven slagwerkstoelen achterin.\n' +
    'Riff: E geel (1), E geel (2-en), G groen (3), E geel (3-a, door tel 4 heen), D oranje (4-en), C rood (maat 2, tel 1, lang); de B speelt de bas op de pagina. Oefenen op 80, met de muziek op 100; het origineel is 120.\n' +
    'Werkt het digibord of het geluid niet: laptop met losse luidspreker. Werkt er niets: speel de bas op de piano, tel hardop in en wijs de kleuren aan.',
  vraag: 'Kunnen we samen de riff van Seven Nation Army spelen?',
  doel: 'Je speelt samen met de hele groep de riff van Seven Nation Army op boomwhackers of slagwerk, met de muziek erbij.',
  criteria: ['Ik speel als mijn kleur oplicht', 'Ik blijf in de maat met de muziek', 'Bij handen omhoog ben ik stil'],
  fasen: [
    { min: 2, soort: 'start', kop: 'Binnenkomst',
      stappen: ['Ga op een stoel zitten. Onder je stoel ligt een instrument.', 'Het instrument blijft liggen tot ik zeg dat je het mag pakken.', 'Handen omhoog betekent: stil.'],
      docent: 'Welkom in twee zinnen en het stopteken afspreken. Meespeelpagina: fase Binnenkomst (zachte groove).' },
    { min: 5, soort: 'doen', kop: 'Bodypercussie',
      stappen: ['Stamp op 1, klap op 2, borst op 3, knip op 4.', 'Doe mij na. Daarna gaat het tempo omhoog.', 'In twee helften: de ene helft stampt de beat, de andere klapt op 2 en 4.'],
      docent: 'Fase Bodypercussie, Spelen (spatie). Tempo 80, dan 100. Toets 2 (of dubbelklik) voor de twee helften. Komt de groep te laat: inkorten tot 3 minuten.' },
    { min: 2, soort: 'doen', kop: 'Instrument pakken',
      stappen: ['Pak je instrument.', 'Twintig seconden vrij geluid maken.', 'Handen omhoog: stil.', 'Buis op je hand of je been, niet op elkaar en niet op een ander.'],
      docent: 'Fase Instrument pakken, daarna H om het stopteken weg te halen.' },
    { min: 5, soort: 'doen', kop: 'Kleur voor kleur',
      stappen: ['Speel als jouw kleur oplicht.', 'Eerst geel, dan groen erbij, dan oranje en rood.', 'Slagwerk speelt als jouw vakje oplicht: djembé, trommels en cajon op 1 en 3, woodblock op 2 en 4, drumstel voet op elke tel en snare op 2 en 4.', 'Eerst djembé, trommels en cajon, dan woodblock erbij, dan de drumstellen.'],
      docent: 'Fase Kleur voor kleur: kleuren één voor één aanzetten, met Voorspelen. Loop rond en doe voor bij de kleur die het moeilijk heeft. Blijft één kleur achter: alleen die kleur aan met Voorspelen en speel zelf mee bij dat groepje, daarna de rest er weer bij. Slagwerk: knoppen Laag, Hoog, Drumstel onderaan; begint met alleen Laag aan.' },
    { min: 4, soort: 'doen', kop: 'Samen langzaam',
      stappen: ['De hele riff, alle kleuren samen.', 'Eerst langzaam. Gaat het goed, dan iets sneller.'],
      docent: 'Fase Samen langzaam (Voorspelen aan). Tempo 80, lukt het dan 100. Lukt de riff niet: alleen geel en groen (andere kleuren uitzetten), de bas op de pagina speelt de rest.' },
    { min: 5, soort: 'doen', kop: 'Samen met de muziek',
      stappen: ['Drums en bas spelen mee.', 'Het hele nummer: 4 keer de riff, even stil, 4 keer, meezingen op "oh", slotklap.', 'Gaat het goed? Nog een keer.'],
      docent: 'Minuut 18: volle muziek aan, ook als de riff nog niet perfect is. Fase Samen met muziek (zonder voorspelen), daarna Hele nummer (N). Te luid of onrustig: H, daarna eerst alleen de buizen. Tijd over: Hele nummer op 120, het tempo van het origineel.' },
    { min: 2, soort: 'afsluiten', kop: 'Afsluiten',
      stappen: ['Leg je instrument terug onder je eigen stoel.', 'Blijf zitten tot je groep vertrekt.'],
      docent: 'Kort compliment. Fase Afsluiten. Wisselen in 5 minuten: loop de U één keer langs (goed instrument onder elke stoel?), lesklok op 0 (dubbelklik), fase Binnenkomst zodra de volgende groep eraan komt. Na les 4: buizen per kleur in de bakken, slagwerk in de mand, stoelen terug.' }
  ],
  formatief: { soort: 'samen spelen', tekst: 'Het hele nummer, samen met de muziek.' },
  benodigdVast: true,
  benodigd: [
    '12 boomwhackers: geel E, groen G, oranje D, rood C',
    'Slagwerk: djembés, trommels, cajon, woodblock, twee drumstellen',
    'Djembé met scheur apart',
    '25 stoelen in U, kleuren bij elkaar',
    'Instrument onder elke stoel',
    'Meespeelpagina open, geluid getest',
    'Lesklok op 0',
    'Reserve: laptop en luidspreker'
  ],
  materiaal: [
    { t: 'Meespeelpagina Seven Nation Army (digibord)', u: './meespelen-seven-nation-army.html' },
    { t: 'Draaiboek VO-dag muziek 12 november 2026 (Word)', u: spUrl(MAP + 'Draaiboek VO-dag muziek 12 november 2026.docx') }
  ]
};

const leergang = {
  meta: {
    klas: 'VO-dag groep 8', klassen: 'Vier groepen 8 van basisscholen, do 12 november 2026, ronde 2', schooljaar: '2026-2027',
    lessenPerWeek: 1, lesdagen: null, lesduurMin: 25, eenmalig: true, seAandeel: 'geen',
    bron: 'Draaiboek VO-dag muziek 12 november 2026, versie van 10 november zonder helpers (sectiemap 05 Activiteiten\\VO dag). Ontvangst in de aula 12.20-12.40; drinken en tasjes 14.40-14.45.',
    uren
  },
  blokken: [], toetsen: [], handelingsdelen: [], kaarten: [],
  weken: [{ w: 10, wk: 46, datum: '2026-11-09', blok: 'VO', l1: les }]
};

const sectie = [
  { id: 'vod-org', d: '2026-11-11', soort: 'taak', taak: true, titel: 'VO-dag: navragen wie de groepen naar 009 brengt en ophaalt', info: 'Ook: waar gaat groep 7 om 14.40 heen? Er is geen begeleider meer die dat doet.' },
  { id: 'vod-bw', d: '2026-11-11', soort: 'taak', taak: true, titel: 'VO-dag: boomwhackers tellen', info: 'Ook de set met lokaal "onbekend". Kleur en toonnaam controleren: G is de donkere groene, niet de lichtgroene F. Daarna de verdeling per groep aanpassen.' },
  { id: 'vod-db', d: '2026-11-11', soort: 'taak', taak: true, titel: 'VO-dag: meespeelpagina en geluid testen op het digibord van 009', info: 'In Chrome of Edge. De pagina staat in Lesdag bij de les VO-dag (materiaal) en in de sectiemap, 05 Activiteiten\\VO dag. Geen internet nodig.' },
  { id: 'vod-lok', d: '2026-11-11', soort: 'taak', taak: true, titel: 'VO-dag: nagaan of lokaal 009 vanaf 12.00 vrij is' },
  { id: 'vod-klaar', d: DAG, soort: 'sectie', tijd: '12:00–12:30', titel: 'VO-dag: lokaal 009 klaarzetten', info: 'Klaar om 12.30: 25 stoelen in U, kleuren bij elkaar, onder elke stoel een buis of slagwerk, djembé met de scheur apart, meespeelpagina open en geluid getest, lesklok op 0. Ontvangst van de groepen in de aula 12.20-12.40.' }
];

function doe(bestand, pak) {
  const p = path.join(root, bestand); const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  pak(data).vodag = leergang;
  if (Array.isArray(data.sectie)) { data.sectie = data.sectie.filter(x => !/^vod-/.test(x.id)).concat(sectie); }
  console.log(`${bestand}: leergang vodag (${uren.length} uren, ${les.fasen.length} fasen, ${les.fasen.reduce((n, f) => n + f.min, 0)} min)${Array.isArray(data.sectie) ? `, ${sectie.length} sectiepunten` : ''}`);
  if (!droog) fs.writeFileSync(p, JSON.stringify(data), 'utf8');
}
doe('public/data/basis.json', d => d.leergangen);
doe('bron/leergang-data.json', d => d.klassen);
