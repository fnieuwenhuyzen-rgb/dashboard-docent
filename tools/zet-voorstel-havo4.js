// Taak les-t11 (19-11-2026): de 27 voorgestelde havo 4-lessen uit tools/voorstel-lessen-2026-11.json overnemen
// in public/data/basis.json en bron/leergang-data.json. Besluit Frans 9-11: "eerst aanpassen, dan per klas overnemen".
// Koppeling op les-id (niet op titel). Overschrijft vraag, doel, criteria, fasen en formatief; andere velden
// (rol, messiahNieuw, identiteit, materiaal, syll ...) blijven staan. Opnieuw draaien kan geen kwaad.
//
// Aanpassingen ten opzichte van het voorstel van 8-9 nov:
// 1. Opnames inleveren via Forms, de inzender telt voor de groep (besluit 9-11; staat sinds de audit al in basis
//    bij 22.3, 32.2, 34.2, 34.3): stap in de fase Opnemen en "Inleveren via Forms." in het formatief.
// 2. Verwijzingen naar het controlerapport ("rapport vraag 18") uit de docentnotities: in de lesmodus zegt dat niets.
//    Wat nog open is, staat er nu in gewone woorden.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const voorstel = JSON.parse(fs.readFileSync(path.join(__dirname, 'voorstel-lessen-2026-11.json'), 'utf8')).klassen.havo4.lessen;
const VELDEN = ['vraag', 'doel', 'criteria', 'fasen', 'formatief'];

const TEKST = [
  [', zie rapport vraag 3), noem alleen de datum uit de studiewijzer.', '; de PTA noemt TW2, dat is nog niet beslist), noem alleen de datum uit de studiewijzer.'],
  [' (rapport vraag 8)', ''],
  ['Welk opnameprogramma erop staat is niet in de bronnen vastgelegd (rapport vraag 18); wijs daarom het programma aan dat je gewend bent.', 'Welk opnameprogramma erop staat ligt nog niet vast: wijs het programma aan dat je gewend bent.'],
  ['Welk programma: rapport vraag 18.', 'Opnameprogramma: het programma dat je gewend bent.'],
  [' (rapport vraag 9)', ''],
  [', rapport vraag 9)', ')'],
  [' (rapport vraag 18)', ''],
  [' (rapport punt 2)', ''],
  [' (dag en uur: rapport vraag 1)', ' (dag en uur volgen)'],
];
const FORMS = 'Lever de opname in via Forms. Eén leerling levert in voor de hele groep.';
const OPNAME = { '22.3': /^Opnemen$/, '32.2': /^Opnemen en terugluisteren$/, '34.2': /^Opnemen$/, '34.3': /^Opnemen$/ };

function pasAan(id, src) {
  let s = JSON.stringify(src);
  for (const [oud, nieuw] of TEKST) s = s.split(JSON.stringify(oud).slice(1, -1)).join(JSON.stringify(nieuw).slice(1, -1));
  const les = JSON.parse(s);
  if (OPNAME[id]) {
    const f = les.fasen.find(x => OPNAME[id].test(x.kop));
    if (!f) throw new Error(id + ': fase Opnemen niet gevonden');
    if (!f.stappen.includes(FORMS)) f.stappen.push(FORMS);
    const t = /[.?!]$/.test(les.formatief.tekst) ? les.formatief.tekst : les.formatief.tekst + '.';
    if (!/Forms/.test(t)) les.formatief.tekst = t + ' Inleveren via Forms.';
  }
  if (/rapport (vraag|punt)/.test(JSON.stringify(les))) throw new Error(id + ': nog een verwijzing naar het rapport');
  return les;
}

const LES = {};
for (const [titel, src] of Object.entries(voorstel)) {
  const id = src._les.split(':')[1];
  LES[id] = { titel, les: pasAan(id, src) };
}

function doe(bestand, pak) {
  const p = path.join(root, bestand);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const k = pak(data).havo4;
  let n = 0, gelijk = 0;
  for (const [id, { titel, les }] of Object.entries(LES)) {
    const [w, i] = id.split('.');
    const wk = k.weken.find(x => x.w === +w); const l = wk && wk['l' + i];
    if (!l) throw new Error(bestand + ' havo4:' + id + ' niet gevonden');
    if (l.titel !== titel) throw new Error(bestand + ' havo4:' + id + ': titel is "' + l.titel + '", voorstel "' + titel + '"');
    let veranderd = false;
    for (const v of VELDEN) {
      if (les[v] == null) continue;
      if (JSON.stringify(l[v]) !== JSON.stringify(les[v])) { l[v] = JSON.parse(JSON.stringify(les[v])); veranderd = true; }
    }
    veranderd ? n++ : gelijk++;
  }
  fs.writeFileSync(p, JSON.stringify(data), 'utf8');
  console.log(`${bestand} havo4: ${n} lessen bijgewerkt, ${gelijk} waren al gelijk`);
}
doe('public/data/basis.json', d => d.leergangen);
doe('bron/leergang-data.json', d => d.klassen);
