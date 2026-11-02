// Eenmalig (2-11-2026): zet de besluiten van Frans in public/data/basis.json en bron/leergang-data.json.
// Way Maker naar periode 4, deckverschillen overnemen, voortgangscijfer songbox 1, BB1-programma, boxnamen uit Musicbox.
// Les-id's blijven gelijk: alleen de inhoud op dezelfde lesweek en hetzelfde slot verandert.
// Gebruik: node tools/zet-lesinhoud-2026-11.js, daarna merge-inhoud.js voor mavo3, mavo4-theorie, mavo4-praktijk en bb1.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const lees = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const kopie = x => JSON.parse(JSON.stringify(x));

// Way Maker in periode 4
const WM = kopie(require('./inhoud-waymaker-p4.json'));
const P4 = {
  havo3: { 31: 'Way Maker: leren kennen en rol kiezen', 32: 'Way Maker: akkoorden en partijen', 33: 'Way Maker: samenspel en arrangement', 34: 'Way Maker: doorspelen' },
  vwo3: { 30: 'Way Maker: leren kennen', 31: 'Way Maker: akkoorden en partijen', 32: 'Way Maker: samenspel', 33: 'Way Maker: eigen arrangement', 34: 'Way Maker: doorspelen' }
};
const P4_TOETSING = 'Songbox 2 is Way Maker (Sinach), eigen box in Musicbox (besluit Frans 2-11-2026). Afsluiting: slotoptreden in de klas.';
const P4_KENNEN = 'Way Maker (Sinach), eigen box in Musicbox, samen spelen in bandbezetting. Wat in klas 1 en 2 is geleerd, komt hier in de praktijk.';
const VOORTGANG = 'Voortgangscijfer: het speelstuk van songbox 1 telt in Magister met weging 1. Geen PTO-toets; zelfde zes onderdelen als het leerlingblad speelstuk.';

const KERSTROLLEN = [
  ['Daarna in de eigen band Way Maker spelen en per rol uitleggen wat je doet.', 'Daarna in de eigen band jullie kerstlied spelen en per rol uitleggen wat je doet.'],
  ['Ik weet welke rol mijn eigen partij in Way Maker heeft', 'Ik weet welke rol mijn eigen partij in ons kerstlied heeft'],
  ['Way Maker in een bandversie: wie draagt wat?', 'Jullie kerstlied in een bandversie: wie draagt wat?'],
  ['Speel Way Maker en benoem je rol', 'Speel jullie kerstlied en benoem je rol']
];
const vervang = (x, paren) => { let s = JSON.stringify(x); for (const [a, b] of paren) s = s.split(JSON.stringify(a).slice(1, -1)).join(JSON.stringify(b).slice(1, -1)); return JSON.parse(s); };

const JAARKAART = [{ k: 'Periode 1', t: 'Songbox 1 samen spelen' }, { k: 'Periode 2', t: 'Eigen kerstlied · speelstuk P1' }, { k: 'Periode 3', t: 'Instrumenten, bands en orkesten · T1' }, { k: 'Periode 4', t: 'Way Maker en slotoptreden' }];

// Boxnamen zoals ze echt in Musicbox staan (nagekeken 2-11-2026)
const BOX = [
  ['Maat en Ritme · Trainerz', 'Maat en ritme · Trainers'], ['Maat en Ritme', 'Maat en ritme'],
  ['Ritmische figuren: triolen en syncope', 'Ritmische figuren'],
  ['Het orkest: orkestvormen en bezettingen', 'Het orkest'], ['Het orkest: instrumentgroepen', 'Het orkest'],
  ['Toonsoorten: mollen en kruizen', 'Toonsoorten'], ['Koor en meerstemmigheid: canon', 'Koor en meerstemmigheid'],
  ['Vorm en analyse: sequens, muzikale zinnen, melodievoering', 'Vorm en analyse'], ["Vorm en analyse: vormschema's, ostinato", 'Vorm en analyse'],
  ['Muziek en andere kunsten: theater en film', 'Muziek en andere kunsten'], ['Muziek en maatschappij: filmmuziek', 'Muziek en maatschappij'],
  ['Uitvoering: articulatie en speeltechnieken', 'Uitvoering'], ['Samenklank: akkoorden en intervallen', 'Samenklank'],
  ['oefenexamen vmbo gl/tl (Facet-oefenomgeving)', 'Examentraining (Vmbo)'], ['oefenexamens vmbo gl/tl', 'Examentraining (Vmbo)'], ['oefenexamen vmbo gl/tl', 'Examentraining (Vmbo)'],
  ['Trainerz', 'Trainers']
];
const BOX_M3 = [['Reggae riddim', 'Tempo en dynamiek']];

const week = (k, w) => k.weken.find(x => x.w == w);

function waymaker(k, lg) {
  const b = k.blokken.find(x => x.id === 'P1');
  b.toetsing = b.toetsing.replace('Formatief: opname terugluisteren.', VOORTGANG);
  const p4 = k.blokken.find(x => x.id === 'P4');
  p4.titel = 'Way Maker en slotoptreden'; p4.kennen = P4_KENNEN; p4.toetsing = P4_TOETSING;
  k.meta.bron = k.meta.bron.replace('Periode 1 en 4: songboxen uit Musicbox (nog kiezen).', 'Periode 1: songbox uit Musicbox.').replace('; Way Maker schuift naar later in het jaar.', '.').replace('afgesloten met T1.', 'afgesloten met T1. Periode 4: Way Maker (Sinach), eigen box in Musicbox.');
  week(k, 1).l1.fasen.forEach(f => { if (f.beeld && f.beeld.soort === 'kaarten' && f.beeld.items[0].k === 'Periode 1') f.beeld.items = kopie(JAARKAART); });
  const r = lg === 'havo3' ? 27 : 26;
  week(k, r).l1 = vervang(week(k, r).l1, KERSTROLLEN);
  for (const [w, t] of Object.entries(P4[lg])) {
    const l = week(k, w).l1, src = WM.lessen[t];
    if (!src) throw new Error('geen inhoud: ' + t);
    const mat = l.materiaal;
    for (const v of ['vraag', 'doel', 'criteria', 'fasen', 'formatief', 'identiteit', 'benodigd']) { delete l[v]; if (src[v] != null) l[v] = kopie(src[v]); }
    l.titel = t; l.detail = src.detail; if (mat) l.materiaal = mat;
  }
  const t = lg === 'havo3' ? 31 : 31;
  if (week(k, t).thuis) week(k, t).thuis.mb = 'Way Maker';
}

// Deckinhoud (zonder notities) overnemen
function decks(data, pak) {
  for (const n of ['herbouw-mavo', 'kerst-klas3', 'week10']) {
    const j = lees('tools/inhoud-' + n + '.json');
    for (const [kl, K] of Object.entries(j)) {
      if (kl.startsWith('_')) continue;
      for (const les of K.lessen) for (const c of les.koppel || []) {
        const k = pak(data)[c.lg]; if (!k) continue;
        const l = week(k, c.w)[c.slot];
        for (const v of ['vraag', 'doel', 'criteria', 'identiteit', 'benodigd']) if (les[v] != null) l[v] = kopie(les[v]);
        if (les.formatief) { const { notitie, ...f } = les.formatief; if (Object.keys(f).length) l.formatief = { ...(l.formatief || {}), ...f }; }
        if (les.fasen) l.fasen = les.fasen.map(({ notitie, ...f }) => kopie(f));
        if (les.fasenExtra) for (const [i, x] of Object.entries(les.fasenExtra)) {
          const { notitie, ...r } = x; const fase = l.fasen[i];
          for (const [a, b] of Object.entries(r)) {
            if (a === 'beeld' && b.soort === 'fragment') continue; // de lesmodus toont dit soort niet; de bron staat al in docent
            if (a === 'docent' && b === '') { delete fase.docent; continue; }
            fase[a] = kopie(b);
          }
        }
      }
    }
  }
  // De lesmodus toont het onderschrift bij akkoorden niet: capo ook in de stappen en het detail.
  const h = pak(data).havo3, CAPO = 'Gitaar met capo op fret 3: D, G en A7. Ukelele en keyboard: F, B♭ en C7.';
  week(h, 11).l1.fasen[2].stappen.push(CAPO); week(h, 12).l1.fasen[0].stappen.push(CAPO);
  const d12 = week(h, 12).l1;
  d12.detail = d12.detail.replace('Akkoorden F, B♭ en C7 op gitaar, keyboard en ukelele', 'Akkoorden F, B♭ en C7 op keyboard en ukelele, gitaar met capo op fret 3: D, G en A7');
}

// BB1: programma per lesweek; de fasen komen uit inhoud-bb1.json via merge-inhoud.js
function bb1(k) {
  const plan = lees('tools/bb1-plan.json');
  for (const [w, [type, titel, detail]] of Object.entries(plan.weken)) { const r = week(k, w); r.l1 = { ...r.l1, type, titel, detail }; }
  k.meta.bron = k.meta.bron.replace('De lessen vul je zelf in.', 'Lessen: tutorials en songboxen uit de leerlijn BB1 in Musicbox; volgorde besloten door Frans (2-11-2026).');
  const p3 = k.blokken.find(x => x.id === 'P3'), p4 = k.blokken.find(x => x.id === 'P4');
  p3.titel = 'Drums en keyboard, daarna samen spelen';
  p3.kennen = 'Tutorials Drums en Piano (keyboard) in Musicbox. Vanaf lesweek 29 samen spelen: Memories (Maroon 5).';
  p3.kunnen = ['Basisritme en fill op de drums', 'Akkoorden en een begeleiding op keyboard', 'Samen een song spelen'];
  p4.kennen = 'Riptide (Vance Joy) en Birds of a Feather (Billie Eilish).';
}

function klaar(data, pak) {
  decks(data, pak);
  for (const lg of ['havo3', 'vwo3']) waymaker(pak(data)[lg], lg);
  bb1(pak(data).bb1);
  const L = pak(data);
  for (const lg of ['havo3', 'vwo3', 'mavo3', 'mavo4']) {
    L[lg].weken = vervang(L[lg].weken, lg === 'mavo3' ? BOX.concat(BOX_M3) : BOX);
  }
  return data;
}

for (const [f, pak] of [['public/data/basis.json', d => d.leergangen], ['bron/leergang-data.json', d => d.klassen]]) {
  const p = path.join(root, f);
  fs.writeFileSync(p, JSON.stringify(klaar(JSON.parse(fs.readFileSync(p, 'utf8')), pak)), 'utf8');
  console.log('geschreven: ' + f);
}

// tools/inhoud-klas3.json en de lessen van de helpers meenemen
const ik = lees('tools/inhoud-klas3.json');
for (const t of Object.keys(ik.lessen)) if (/^(Nieuwe songbox: Way Maker|Way Maker: |Songbox 2)/.test(t)) delete ik.lessen[t];
for (const [t, l] of Object.entries(WM.lessen)) { const { detail, ...r } = l; r.materiaal = ['mb']; ik.lessen[t] = kopie(r); }
ik.lessen['Rollen in een band en orkest'] = vervang(ik.lessen['Rollen in een band en orkest'], KERSTROLLEN);
ik.lessen['De band in het lokaal'].fasen.forEach(f => { if (f.beeld && f.beeld.soort === 'kaarten' && f.beeld.items[0].k === 'Periode 1') f.beeld.items = kopie(JAARKAART); });
const op = ik.lessen['Songbox 1: opnemen en terugluisteren'].fasen[3];
op.stappen = ['Elke groep deelt één verbeterpunt met de klas.', 'Op 16 november begint periode 2 met een eigen kerstlied. Dat wordt ook het lied voor P1.']; delete op.docent;
delete ik._mat.pres11;
fs.writeFileSync(path.join(__dirname, 'inhoud-klas3.json'), JSON.stringify(vervang(ik, BOX), null, 2) + '\n');

const HELPERS = { mavo3: BOX.concat(BOX_M3), 'mavo4-theorie': BOX, 'mavo4-praktijk': BOX };
for (const [n, paren] of Object.entries(HELPERS)) {
  const p = path.join(__dirname, 'inhoud-' + n + '.json');
  fs.writeFileSync(p, JSON.stringify(vervang(JSON.parse(fs.readFileSync(p, 'utf8')), paren), null, 1) + '\n');
}
console.log('klaar');
