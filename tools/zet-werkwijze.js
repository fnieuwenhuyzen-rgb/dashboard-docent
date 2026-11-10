// Past de lessen aan op hoe Frans' lessen echt werken (besluit Frans 10-11-2026):
//  1. Groepjes werken op een eigen plek of in een eigen ruimte, niet "in een hoek van het lokaal".
//  2. Onderbouw: in een les met spelen voor cijfer staat de volgende songbox klaar voor wie klaar is.
//  3. Bovenbouw (PTA): elke opname die leerlingen maken, leveren ze in via Forms.
//  4. Onderbouw: opnames zijn voor jezelf, behalve de kerstopname (havo 3, vwo 3, mavo 3) via Forms.
// Werkt op public/data/basis.json en de tweeling bron/leergang-data.json; de tekstparen ook op tools/inhoud-*.json,
// zodat een latere merge-inhoud de oude tekst niet terugzet. Opnieuw draaien kan geen kwaad.
// Gebruik: node tools/zet-werkwijze.js [--droog]
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const droog = process.argv.includes('--droog');
const BOVENBOUW = ['mavo3', 'mavo4', 'havo4', 'havo5', 'vwo4', 'vwo5', 'vwo6'];
const FORMS = 'Lever de opname in via het Forms-formulier; de link staat in je Magister-bericht.';
const FORMS_GROEP = 'Lever de opname in via het Forms-formulier; de link staat in je Magister-bericht. Eén iemand levert in voor de hele groep.';
const PLEK = 'Ga met je groep naar je eigen plek of eigen ruimte.';
const PLEK_GROEPJE = 'Ga met je groepje naar je eigen plek of eigen ruimte.';

// ---------- 1. tekstparen (ruwe tekst, alle bestanden) ----------
const PAREN = [
  // eigen plek of eigen ruimte
  ['Je speelt voor de docent, de klas oefent intussen stil of luistert buiten het lokaal.', 'Je speelt voor de docent; de rest werkt intussen op de eigen plek of in de eigen ruimte. Klaar met spelen? Dan begin je aan de nieuwe songbox, Way Maker.'],
  ['in een hoek van het lokaal of in de oefenruimte', 'op je eigen plek of in je eigen ruimte'],
  ['Wie al geweest is, oefent zonder geluid of wacht buiten het lokaal.', 'Wie al geweest is, oefent zacht verder op de eigen plek of in de eigen ruimte.'],
  ['eigen hoek, ik kom bij je', 'eigen plek of eigen ruimte, ik kom bij je'],
  ['in je eigen hoek', 'op je eigen plek of in je eigen ruimte'],
  ['in een eigen hoek', 'op een eigen plek of in een eigen ruimte'],
  ['in de eigen hoek', 'op de eigen plek of in de eigen ruimte'],
  ['in hun eigen hoek', 'op hun eigen plek of in hun eigen ruimte'],
  ['Ga naar je hoek.', 'Ga naar je eigen plek of eigen ruimte.'],
  ['Geef elke groep een eigen hoek', 'Geef elke groep een eigen plek of eigen ruimte'],
  ['Oefen in je hoek', 'Oefen op je eigen plek'],
  ['Hoeken in het lokaal klaargezet', 'Eigen plekken en ruimtes afgesproken'],
  ['Hoeken in het lokaal: ', 'Eigen plekken of ruimtes: '],
  ['Alle hoeken tegelijk', 'Alle groepen tegelijk'],
  ['Zet de groepjes in hoeken, met', 'Zet de groepjes op eigen plekken of in eigen ruimtes, met'],
  // onderbouw: opname blijft in de groep (havo 3 en vwo 3, songbox 1)
  ['Deel de opname via Magister met de docent.', 'Luister de opname in je groep terug. Hij blijft op de laptop van de groep.'],
  ['Opname via Magister delen; per leerling', 'Opname blijft op de laptop van de groep; per leerling'],
  ['Onze opname is compleet en gedeeld met de docent', 'Onze opname is compleet en we hebben hem teruggeluisterd'],
  // bovenbouw: inleveren via Forms
  ['Kies zelf de beste en zet hem in de inlevermap.', 'Kies zelf de beste en lever hem in via het Forms-formulier; de link staat in je Magister-bericht.'],
  ['Inleveren via de Teams-opdracht.', 'Inleveren via het Forms-formulier; zet de link vooraf in Magister.'],
  ['Mijn opname staat erop', 'Mijn opname is ingeleverd via Forms'],
  ['Opnamen in de inlevermap P3.', 'Opnamen komen binnen via het Forms-formulier P3 (Inleverbak in Beoordelen).'],
  ["Opname in de inlevermap, met je naam en 'schets 1'.", "Lever de opname in via het Forms-formulier P3; noem het bestand 'schets 1'."],
  ['Opname op 80 in de ELO.', 'Opname op 80, inleveren via Forms.'],
  ['Opname staat in de ELO', 'Opname ingeleverd via Forms'],
  ['Zet je opname op de afgesproken plek.', FORMS],
  ['Zeg vooraf waar de opname terechtkomt.', 'Zet de link naar het Forms-formulier vooraf in Magister.'],
  ['Opname in portfolio', 'Opname ingeleverd via Forms'],
  ['Zet opname, partituur of leadsheet en toelichting in je portfolio.', 'Lever je opname in via het Forms-formulier. Partituur of leadsheet en toelichting gaan in je portfolio.'],
  ['Opnemen blijft in de les; niets delen buiten het groepje.', 'Opnemen met de laptop van het groepje; inleveren via het Forms-formulier, verder niets delen.'],
].filter(([a, b]) => a !== b);

const tekstBestanden = [
  'public/data/basis.json', 'bron/leergang-data.json',
  ...fs.readdirSync(__dirname).filter(f => /^inhoud-.*\.json$/.test(f)).map(f => 'tools/' + f),
];
const telPaar = PAREN.map(() => 0);
for (const d of tekstBestanden) {
  const p = path.join(root, d); let t = fs.readFileSync(p, 'utf8'); let n = 0;
  PAREN.forEach(([oud, nieuw], i) => { const k = t.split(oud).length - 1; if (k) { t = t.split(oud).join(nieuw); n += k; telPaar[i] += k; } });
  if (n) { if (!droog) fs.writeFileSync(p, t, 'utf8'); console.log(String(n).padStart(4), 'tekstparen', d); }
}
PAREN.forEach(([oud], i) => { if (!telPaar[i]) console.log('   (paar niet meer gevonden, al gedaan?)', oud.slice(0, 70)); });

// ---------- 2. per les (basis.json en tweeling) ----------
const MUSICBOX = { t: 'Musicbox (digitaal.musicboxmethode.nl)', u: 'https://digitaal.musicboxmethode.nl' };
const WAYMAKER_DECK = { t: 'Presentatie: Way Maker kennismaken (PowerPoint)', u: 'https://studentcsgpm.sharepoint.com/Sectie%20Muziek/Gedeelde%20%20documenten/01%20Onderbouw%20muziek/03%20Klas%203/Lessen%202026-2027/11%20Way%20Maker%20-%20kennismaken.pptx?web=1' };
const MEMORIES = { t: 'Musicbox: Memories', u: 'https://digitaal.musicboxmethode.nl/teacher/boxes/a7567191-b6b4-49b9-b966-fbc0d47f105f' };
const tekstVan = f => typeof f === 'string' ? f : JSON.stringify(f);
const voegToe = (lijst, x) => { const key = typeof x === 'string' ? x : x.t; if (!lijst.some(y => (typeof y === 'string' ? y : y.t) === key)) lijst.push(x); };
const docentErbij = (f, zin) => { if (!(f.docent || '').includes(zin)) f.docent = f.docent ? f.docent + ' ' + zin : zin; };

function p1Klas3(l, lied, instrumentZin) {
  l.vraag = l.vraag || 'Laat horen wat je groep heeft geleerd.';
  l.doel = l.doel || `Je speelt ${lied} met je groep voor de docent.`;
  l.benodigd = l.benodigd || [];
  ['Instrumenten, gestemd', 'Volgorde van langskomen op het bord', 'Beoordelingsformulier of Lesdag', 'Reflectieformulier geprint', 'Laptops en koptelefoons voor Way Maker'].forEach(x => voegToe(l.benodigd, x));
  l.materiaal = l.materiaal || []; voegToe(l.materiaal, MUSICBOX); voegToe(l.materiaal, WAYMAKER_DECK);
  if (!l.fasen || !l.fasen.length) l.fasen = [
    { min: 5, soort: 'start', kop: 'Naar je eigen plek of ruimte', stappen: [PLEK, 'Stem je instrument en speel het begin één keer zacht.', 'De volgorde van langskomen staat op het bord.'] },
    { min: 35, soort: 'doen', kop: 'Ik kom bij elke groep langs', stappen: ['Kom ik langs? Tel samen af en speel het lied voor mij.', 'Speel door als het misgaat en val weer in op de tel.', 'Klaar met spelen? Vul meteen je reflectieformulier in.', `Daarna begin je aan de nieuwe songbox: Way Maker. Open hem in Musicbox, luister en ${instrumentZin}`], docent: 'Iedereen krijgt een eigen cijfer, ook in een groep. Niemand speelt voor de klas. Beoordeling in Lesdag of op het formulier. Way Maker staat klaar zodat groepen die geweest zijn meteen verder kunnen.' },
    { min: 5, soort: 'afsluiten', kop: 'Vooruit naar Way Maker', stappen: ['Wat wil jij bij Way Maker spelen, en op welk niveau?', 'Je reflectieformulier rond je volgende les af.'] },
  ];
}
function kerstOpname(l, klasNaam) {
  const f = (l.fasen || []).find(x => typeof x === 'object' && /Opname als tussenstand/.test(x.kop || ''));
  if (f) {
    f.kop = 'Kerstopname: opnemen en inleveren';
    f.stappen = ['Neem jullie versie één keer op met de laptop van je groep.', FORMS_GROEP, 'De opname blijft ook op de laptop: na de kerst luisteren we hem terug.'];
    docentErbij(f, `Zet vooraf een Forms-formulier "Kerstopname ${klasNaam}" klaar met een uploadvraag (1 GB) en stuur de link via Magister. De opnames komen in je OneDrive onder Apps, Microsoft Forms.`);
  }
  l.benodigd = l.benodigd || []; voegToe(l.benodigd, `Forms-formulier Kerstopname ${klasNaam}, link in Magister`);
}

const LES = {
  'bb1:17.1': l => {
    const f = l.fasen.find(x => x.soort === 'doen');
    const i = f.stappen.indexOf('Daarna oefen je zacht verder.');
    const nieuw = 'Ben je geweest? Begin aan de nieuwe songbox: open Memories in Musicbox, luister en kies alvast je instrument en niveau.';
    if (i >= 0) f.stappen[i] = nieuw; else if (!f.stappen.includes(nieuw)) f.stappen.push(nieuw);
    docentErbij(f, 'Memories staat klaar voor wie geweest is (start lesweek 21).');
    voegToe(l.benodigd, 'Laptops en koptelefoons voor Memories'); l.materiaal = l.materiaal || []; voegToe(l.materiaal, MEMORIES);
  },
  'havo3:19.1': l => p1Klas3(l, "Mary's Boy Child", 'kies een instrument en niveau.'),
  'vwo3:19.1': l => p1Klas3(l, 'God Rest Ye Merry Gentlemen', 'kies een instrument dat je dit jaar nog niet speelde. In periode 4 speel je hem samen.'),
  'havo3:15.1': l => kerstOpname(l, 'havo 3'),
  'vwo3:15.1': l => kerstOpname(l, 'vwo 3'),
  'havo3:14.1': l => docentErbij(l.fasen[l.fasen.length - 1], 'Valt lesweek 15 uit (activiteitenweek B)? Laat dan in de laatste 10 minuten de kerstopname maken en inleveren via Forms.'),
  'vwo3:14.1': l => docentErbij(l.fasen[l.fasen.length - 1], 'Valt lesweek 15 uit (activiteitenweek B)? Laat dan in de laatste 10 minuten de kerstopname maken en inleveren via Forms.'),
  'mavo3:14.1': l => {
    const f = l.fasen.find(x => typeof x === 'object' && /Speel in je groepje/.test(x.kop || ''));
    const i = f.stappen.indexOf('Neem op en luister terug. Kies één werkpunt.');
    if (i >= 0) f.stappen.splice(i, 1, 'Neem op met de laptop van je groepje: dat is jullie kerstopname.', FORMS_GROEP.replace('hele groep', 'hele groepje'), 'Luister terug en kies één werkpunt.');
    docentErbij(f, 'Zet vooraf een Forms-formulier "Kerstopname mavo 3" klaar met een uploadvraag (1 GB) en stuur de link via Magister.');
    l.benodigd = l.benodigd || []; voegToe(l.benodigd, 'Forms-formulier Kerstopname mavo 3, link in Magister');
  },
  'mavo3:16.1': l => {
    const f = l.fasen.find(x => typeof x === 'object' && (x.stappen || []).includes('Neem jullie op met de laptop van je groepje.'));
    const z = FORMS_GROEP.replace('hele groep', 'hele groepje');
    if (f && !f.stappen.includes(z)) f.stappen.splice(f.stappen.indexOf('Neem jullie op met de laptop van je groepje.') + 1, 0, z);
  },
};

const GROEP = /groepje|in je groep|elke groep|per groep|je band|in groepen/i;
const PLEKWOORD = /eigen plek|ruimte/i;
const OPNAME_STR = /opnemen|· opnames?$|; opname$|opnames$/i;

function bewerk(L, bestand) {
  const tel = { les: 0, plek: 0, forms: 0, formatief: 0 }; const gezien = new Set();
  for (const k of Object.keys(L)) for (const w of L[k].weken) for (const s of Object.keys(w)) {
    if (!/^l\d+$/.test(s)) continue; const l = w[s]; if (!l || typeof l !== 'object') continue;
    const id = `${k}:${w.w}.${s.slice(1)}`;
    if (LES[id]) { LES[id](l); tel.les++; gezien.add(id); }
    if (!Array.isArray(l.fasen)) continue;
    // eigen plek of ruimte bij groepsspel zonder plek
    if (/praktijk|toets/.test(l.type)) {
      const alles = l.fasen.map(tekstVan).join(' ');
      if (GROEP.test(alles) && /speel|oefen|repeteer|zing/i.test(alles) && !PLEKWOORD.test(alles)) {
        const f = l.fasen.find(x => typeof x === 'object' && Array.isArray(x.stappen) && GROEP.test(JSON.stringify(x)));
        if (f) { f.stappen.unshift(/groepje/i.test(alles) ? PLEK_GROEPJE : PLEK); tel.plek++; }
      }
    }
    // bovenbouw: opnemen = inleveren via Forms
    if (BOVENBOUW.includes(k)) {
      l.fasen.forEach((f, i) => { if (typeof f === 'string' && OPNAME_STR.test(f) && !/Forms/.test(f)) { l.fasen[i] = f + '; inleveren via Forms'; tel.forms++; } });
      if (l.formatief && l.formatief.soort === 'opname' && !/Forms/.test(l.formatief.tekst || '')) {
        l.formatief.tekst = ((l.formatief.tekst || 'Opname maken.').replace(/\.?$/, '.')) + ' Inleveren via Forms.'; tel.formatief++;
      }
    }
  }
  const mis = Object.keys(LES).filter(x => !gezien.has(x));
  console.log(`${bestand}: ${tel.les} lessen apart, ${tel.plek} keer eigen plek toegevoegd, ${tel.forms} fasen en ${tel.formatief} formatieve opnames met Forms${mis.length ? '; niet gevonden: ' + mis.join(' ') : ''}`);
}
for (const [bestand, pak] of [['public/data/basis.json', d => d.leergangen], ['bron/leergang-data.json', d => d.klassen]]) {
  const p = path.join(root, bestand); const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  bewerk(pak(data), bestand);
  if (!droog) fs.writeFileSync(p, JSON.stringify(data), 'utf8');
}
if (droog) console.log('(droog: niets geschreven)');
