// Lessen van ma 16-11-2026 (vraag Frans, 16-11):
// 1. Handelingsdeel 4: iedereen heeft gekozen. De fase "kies / heb je al gekozen?" wordt overal de volgende fase:
//    het logboek (tekst akkoord Frans 12-11, zie de tak hd4-logboekfase). Het strookje is nog niet gebouwd en blijft weg.
//    Keuzeformulier uit het materiaal, logboek erin.
// 2. Messiah: inloggen en oefenen op de oefensite, in havo5:11.2 en vwo5:10.1 (en de link bij vwo5:10.2 en 11.1).
// 3. havo5:11.1 en havo5:11.2 kregen uitgewerkte fasen (alleen tekstregels gaven een lege dia).
// Opnieuw draaien kan geen kwaad.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const SITE = 'https://messiah-oefensite.f-nieuwenhuyzen.workers.dev/';
const SITE_KORT = 'messiah-oefensite.f-nieuwenhuyzen.workers.dev';
const LOGBOEK = 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=6jlsN-pIK0SlIWuX5D5o5rn3J0sJj0FNh0fuBL0Hhh5UMElSWEtVNU9BM0lJRVdSOVM3MExGTzY0TC4u';
const M_SITE = { t: 'Messiah-oefensite', u: SITE };
const M_LOG = { t: 'Logboek handelingsdeel 4', u: LOGBOEK };

const HD4 = { min: 2, soort: 'gesprek', kop: 'Handelingsdeel 4: houd je logboek bij', stappen: [
  'Iedereen heeft gekozen. Nu ga je het doen.',
  'Vanaf vandaag houd je je handelingsdeel bij in het logboek: na elke repetitie, klus of keer coachen. Wie erbij was, krijgt een mail en bevestigt met één klik.',
  'Invullen doe je op de laptop van de groep of thuis op een computer. De link staat in je Magister-bericht.'
], docent: 'Stuur de link naar het logboek via Magister. Wie nog geen aftekenkaart heeft, krijgt hem nu.' };

const AANMELDEN = [
  `Laptop van je groep open: ${SITE_KORT}`,
  'Nog niet aangemeld? Meld je aan met je naam, klas en stem. Op één laptop kan één leerling aangemeld zijn: de anderen melden zich thuis aan op hun eigen telefoon of computer.'
];

const H5_111 = [
  null, // fase 0: HD4, wordt hieronder gezet
  { min: 5, soort: 'luisteren', kop: 'Wat hoor je: zingen, praten of iets ertussenin?', stappen: [
    'Je hoort drie korte stukjes uit de Messiah.',
    'Per stukje: zingt één persoon of zingen er veel? Klinkt het als zingen of bijna als praten?',
    'Schrijf per stukje één woord op.'
  ], docent: 'Kies een recitatief (There were shepherds), een aria en een koor (For unto us). Eerst zonder namen, die komen in de uitleg.' },
  { min: 13, soort: 'uitleg', kop: 'Oratorium, recitatief, aria en koor', stappen: [
    'Oratorium: een groot verhaal voor solisten, koor en orkest, zonder toneel en zonder kostuums.',
    'Recitatief: het verhaal gaat vooruit. Bijna praten op toon, weinig begeleiding.',
    'Aria: de tijd staat stil. Eén solist laat een gevoel horen, met herhaling en versiering.',
    'Koor: de hele groep reageert. Soms om de beurt, soms allemaal tegelijk.',
    'Tekstuitbeelding: de muziek doet wat de tekst zegt. Een hoge noot bij hemel, een lang loopje bij een belangrijk woord.'
  ], docent: 'Samenvattingskaart SW barok erbij.' },
  { min: 15, soort: 'doen', kop: 'For unto us: waar laat Händel de tekst spreken?', stappen: [
    'Werk in je groepje. Tekst van For unto us erbij (Jesaja 9).',
    "Luister naar het begin. Op welk woord zit het lange loopje? Waarom juist dat woord?",
    "Luister naar 'Wonderful, Counsellor'. Wat doet het koor daar anders dan ervoor?",
    'Noteer twee voorbeelden van tekstuitbeelding: het woord en wat de muziek doet.'
  ], klaar: 'Vergelijk met nr. 2 (And the glory) of nr. 6 (Glory to God): vind je daar ook tekstuitbeelding?' },
  { min: 10, soort: 'afsluiten', kop: 'Exit ticket', stappen: [
    'Noem bij elk van de drie stukjes van het begin: recitatief, aria of koor.',
    'Schrijf één voorbeeld van tekstuitbeelding op, met het woord erbij.',
    'Volgende les zing je For unto us zelf, met de oefensite.'
  ] }
];

const H5_112 = [
  { min: 25, soort: 'doen', kop: 'Messiah op de oefensite: For unto us (nr. 4)', stappen: [
    'Ga met je groepje naar je eigen plek.',
    ...AANMELDEN,
    'Kies je stem en open nr. 4, For unto us. Luister het begin en lees je partij mee.',
    "Oefen het melisme op 'born': eerst langzaam, dan in tempo.",
    'Herhaal daarna nr. 2 en nr. 6 één keer met de oefentrack.'
  ], klaar: "Zing het melisme op 'born' samen, zonder oefentrack.", docent: 'Kijk na de les in het docentoverzicht van de oefensite wie zich heeft aangemeld.' },
  '20 min · repertoire'
];

const lesVan = (L, id) => { const [k, wn] = id.split(':'); const [w, n] = wn.split('.'); const wk = (L[k] && L[k].weken || []).find(x => x.w === +w); return wk && wk['l' + n]; };
const metLink = (les, m) => { les.materiaal = (les.materiaal || []).filter(x => x.u !== m.u); les.materiaal.push(Object.assign({}, m)); };

for (const bestand of ['public/data/basis.json', 'bron/leergang-data.json']) {
  const p = path.join(root, bestand), d = JSON.parse(fs.readFileSync(p, 'utf8')), L = d.leergangen || d.klassen;
  // 1. HD4 overal
  for (const [k, lg] of Object.entries(L)) for (const w of lg.weken || []) for (const n of ['l1', 'l2', 'l3']) {
    const les = w[n]; if (!les || !Array.isArray(les.fasen)) continue;
    const i = les.fasen.findIndex(f => f && typeof f === 'object' && /^Handelingsdeel 4: (heb je al gekozen|kies je muzikale bijdrage)/.test(f.kop || ''));
    if (i < 0) continue;
    les.fasen[i] = Object.assign(JSON.parse(JSON.stringify(HD4)), { min: les.fasen[i].min || 2 });
    les.materiaal = (les.materiaal || []).filter(x => !/^Keuzeformulier handelingsdeel 4/.test(x.t || ''));
    metLink(les, M_LOG);
    console.log(bestand, `${k}:${w.w}.${n.slice(1)}`, 'HD4 -> logboek');
  }
  // 3. havo 5
  const a = lesVan(L, 'havo5:11.1');
  if (a) { const hd = a.fasen.find(f => f && f.kop === HD4.kop) || JSON.parse(JSON.stringify(HD4)); a.fasen = H5_111.map((f, i) => i === 0 ? hd : JSON.parse(JSON.stringify(f))); console.log(bestand, 'havo5:11.1 fasen', a.fasen.reduce((s, f) => s + f.min, 0), 'min'); }
  const b = lesVan(L, 'havo5:11.2');
  if (b) { b.fasen = JSON.parse(JSON.stringify(H5_112)); metLink(b, M_SITE); console.log(bestand, 'havo5:11.2 fasen + oefensite'); }
  // 2. vwo 5: aanmelden vooraan in de Messiah-fase; de kop blijft gelijk, anders vallen de sprekersnotities weg
  const c = lesVan(L, 'vwo5:10.1');
  if (c) { const f = c.fasen.find(f => f && typeof f === 'object' && /^Messiah/.test(f.kop || ''));
    if (f && !f.stappen.some(s => s.includes(SITE_KORT))) { f.stappen = f.stappen.filter(s => !/^Ga met je groepje/.test(s)); f.stappen.unshift('Ga met je groepje naar je eigen plek of eigen ruimte.', ...AANMELDEN); f.stappen = f.stappen.map(s => s.replace(/^Nr\. 7 is nieuw\. Luister naar het begin en volg je partij/, 'Nr. 7 is nieuw. Kies je stem op de oefensite, luister naar het begin en volg je partij')); }
    metLink(c, M_SITE); console.log(bestand, 'vwo5:10.1 oefensite'); }
  for (const id of ['vwo5:10.2', 'vwo5:11.1', 'vwo5:11.2']) { const l = lesVan(L, id); if (l) { metLink(l, M_SITE); console.log(bestand, id, 'link oefensite'); } }
  fs.writeFileSync(p, JSON.stringify(d), 'utf8');
}
