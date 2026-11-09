// Controle van Beoordelen stap 3: jaaroverzicht, leerlingkaart, vergelijking met het strookje en de gegevens die erbij horen.
// Verzonnen namen, geen scherm. Gebruik: node tools/test-beoordeling-overzicht.js
// Elke uitkomst is met de hand nagerekend en staat hieronder als getal; de berekening staat erbij.
const R = require('../public/bm-reken.js');
const O = require('../public/bm-overzicht.js');
const fs = require('fs'), path = require('path');
const BM = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'beoordeling.json'), 'utf8'));
let fout = 0, n = 0; const is = (naam, a, b) => { n++; const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) { fout++; console.log('FOUT', naam, x, '!=', y); } };
const m = id => BM.find(x => x.id === id);

/* ---------- 1. de gegevens in het model ---------- */
const DOM = O.INSTELLINGEN.DOMEINEN;
{ let teller = 0, zonder = []; for (const M of BM) for (const o of M.onderdelen) for (const c of o.criteria) { teller++; if (!DOM.includes(c.domein)) zonder.push(M.id + '/' + c.id); }
  is('126 criteria', teller, 126); is('elk criterium heeft een van de vijf domeinen', zonder, []);
  const met = BM.filter(M => M.strookje).map(M => M.id); is('3 modellen met strookje', met, ['p1a-mavo3-zang', 'p1b-mavo3-akkoord', 'p1c-mavo3-slagwerk']);
  for (const M of BM.filter(x => x.strookje)) { const ids = M.onderdelen.flatMap(o => o.criteria.map(c => c.id)); is('strookje.crit lengte ' + M.id, M.strookje.crit.length, M.strookje.stellingen.length); is('strookje.crit bestaat in model ' + M.id, M.strookje.crit.every(c => ids.includes(c)), true); }
  is('zin naar criterium mavo 3 P2', m('p1b-mavo3-akkoord').strookje.crit, ['presentatie', 'wisselen', 'patroon']);
  is('de andere 17 modellen hebben geen koppeling', BM.filter(x => !x.strookje).every(x => !x.strookje), true);
  // domeinen: de naam "Ritme en maat" in mavo 3 P1 hoort bij Ritme en maat, "Samenspel" bij Samenspel, "Begin en slot" bij Presenteren
  const dm = (mid, cid) => m(mid).onderdelen.flatMap(o => o.criteria).find(c => c.id === cid).domein;
  is('domein ritme', dm('p1a-mavo3-zang', 'ritme'), 'Ritme en maat'); is('domein samenspel', dm('p1a-mavo3-zang', 'samenspel'), 'Samenspel'); is('domein begin en slot', dm('p1b-mavo3-akkoord', 'presentatie'), 'Presenteren');
  is('domein eigen compositie', dm('p10-vwo5', 'schetsen'), 'Eigen werk en denken'); }

/* ---------- 2. de schaal en de stappen (keuze 2 en 3) ---------- */
is('schaal 4..10', [4, 5, 6, 7, 8, 9, 10].map(s => O.band(s)), [0, 0, 1, 1, 2, 2, 2]);
is('schaal: 7 is bijna', O.band(7), 1); is('schaal: 7,9 is bijna, 8 is ja', [O.band(7.9), O.band(8)], [1, 2]); is('geen score geen band', O.band(null), null);
is('ja bij een 4 is twee stappen hoger', O.stappen('J', 4), 2); is('nog niet bij een 8 is twee stappen lager', O.stappen('N', 8), -2);
is('bijna bij een 6 klopt', O.stappen('B', 6), 0); is('ja bij een 7 is een stap hoger', O.stappen('J', 7), 1); is('bijna bij een 8 is een stap lager', O.stappen('B', 8), -1);
is('zonder kruisje geen stap', O.stappen(null, 8), null); is('zonder score geen stap', O.stappen('J', null), null);
is('licht op bij twee stappen, niet bij één', [O.licht(2), O.licht(-2), O.licht(1), O.licht(0), O.licht(null)], [true, true, false, false, false]);
is('stapteksten', [0, 1, 2, -1, -2].map(O.stapTekst), ['klopt', 'één stap hoger', 'twee stappen hoger', 'één stap lager', 'twee stappen lager']);
{ const I = Object.assign({}, O.INSTELLINGEN, { LICHT_OP_VANAF_STAPPEN: 1 }); is('andere keuze 3: elk verschil licht op', [O.licht(1, I), O.licht(-1, I), O.licht(0, I)], [true, true, false]);
  const J = Object.assign({}, O.INSTELLINGEN, { SCHAAL: { bijnaVanaf: 7, jaVanaf: 9 } }); is('andere keuze 2: schaal verschuift', [6, 7, 8, 9].map(s => O.band(s, J)), [0, 1, 1, 2]); }

/* ---------- 3. een klas met verzonnen leerlingen ---------- */
// P2 mavo 3 (p1b): criteria presentatie 1, grepen 2, wisselen 2, patroon 2, techniek 1, samenspel 1 = gewicht 9; zelf 10%, docent 90%.
// Speelbox: niveau 1 plafond 7, niveau 2 plafond 8,5, niveau 3 plafond 10.
const P2 = m('p1b-mavo3-akkoord'), P1 = m('p1a-mavo3-zang'), P3 = m('p1c-mavo3-slagwerk');
const ids = ['a', 'b', 'c', 'd', 'e', 'f']; const namen = { a: 'Testleerling, Anna', b: 'Testleerling, Bram', c: 'Testleerling, <Chris>', d: 'Testleerling, Dina', e: 'Testleerling, Eef', f: 'Testleerling, Fenna' };
const lijst = ids.map(id => ({ id, naam: namen[id] }));
const rij = (s, v, zelf) => ({ s, v: Object.assign({ Instrument: 'Gitaar' }, v), opm: {}, zelf });
const S = { lijsten: { m3x: lijst }, toetsen: {} };
const T2 = S.toetsen['p1b-mavo3-akkoord|m3x'] = { ll: {}, volgorde: [], start: '2027-01-25' };
const sc = (p, g, w, pa, t, s) => ({ presentatie: p, grepen: g, wisselen: w, patroon: pa, techniek: t, samenspel: s });
T2.ll.a = rij(sc(8, 8, 8, 6, 8, 8), { Niveau: 'Niveau 2' }, 8);
T2.ll.b = rij(sc(8, 8, 4, 6, 8, 8), { Niveau: 'Niveau 1' }, 6);
T2.ll.c = rij(sc(6, 6, 6, 6, 6, 6), { Niveau: 'Niveau 2' }, 6);
T2.ll.d = rij(sc(7, 7, 7, 7, 7, 7), { Niveau: 'Niveau 2' }, 8);   // eerste poging, herkansing volgt
T2.ll.e = rij(sc(5, 5, 5, 5, 5, 5), { Niveau: 'Niveau 1' }, 4);
T2.ll.f = rij(sc(9, 9, 9, 9, 9, 9), { Niveau: 'Niveau 1' }, 8);
T2.ll.e.af = true; // Eef was er niet: inhalen
R.afronden(P2, T2, lijst.filter(x => x.id !== 'e'), 1000);
// herkansing van Dina: nieuwe scores allemaal 8, strookje 10
T2.herkans = { id: 'h1', naam: 'herkansing', wie: ['d'], ll: { d: rij(sc(8, 8, 8, 8, 8, 8), { Niveau: 'Niveau 2' }, 10) }, gs: {} };
R.afronden(P2, T2, [{ id: 'd' }], 2000, T2.herkans);
// vooruit-tekst en tussenstand voor Bram
T2.ll.b.vooruit = 'Bereid de akkoordwissel een tel eerder voor.';
const Tp1 = S.toetsen['p1a-mavo3-zang|m3x'] = { ll: {}, volgorde: [], start: '2026-10-26' };
// P1 (p1a): criteria presentatie 1, houding 1, tekst 2, toon 2, ritme 2, samenspel 1 = gewicht 9
Tp1.ll.a = rij({ presentatie: 8, houding: 8, tekst: 8, toon: 8, ritme: 8, samenspel: 8 }, { Niveau: 'Niveau 2' }, 8);
Tp1.ll.b = rij({ presentatie: 6, houding: 6, tekst: 6, toon: 6, ritme: 4, samenspel: 6 }, { Niveau: 'Niveau 1' }, 6);
R.afronden(P1, Tp1, lijst.filter(x => x.id === 'a' || x.id === 'b'), 500);
// een toets van vorig schooljaar telt niet mee
S.toetsen['p1c-mavo3-slagwerk|m3x'] = { ll: { a: rij({ presentatie: 10 }, {}, 10) }, volgorde: [], start: '2026-07-01' };

// handwerk eindcijfers (zie TESTEN: rond1 = afronden op één decimaal)
// a P2: som 8+16+16+12+8+8 = 68, 68/9 = 7,56 -> 7,6; eind (7,6*90 + 8*10)/100 = 7,64 -> 7,6; plafond 8,5 niet gehaald
// b P2: som 8+16+8+12+8+8 = 60, 60/9 = 6,67 -> 6,7; eind (6,7*90 + 6*10)/100 = 6,63 -> 6,6
// c P2: alles 6: docent 6, eind (6*90+6*10)/100 = 6,0
// d P2 eerste poging: alles 7: docent 7, eind (7*90+8*10)/100 = 7,1; herkansing alles 8: (8*90+10*10)/100 = 8,2 -> telt 8,2
// f P2: alles 9: docent 9, ruw (9*90+8*10)/100 = 8,9, niveau 1 plafond 7 -> 7,0 (afgetopt)
// e P2: niet afgerond, af = inhalen
const eind = (id, T) => ((T.ll[id] || {}).vast || {}).e;
is('handwerk a', eind('a', T2), 7.6); is('handwerk b', eind('b', T2), 6.6); is('handwerk c', eind('c', T2), 6); is('handwerk d eerste', eind('d', T2), 7.1);
is('handwerk d herkansing', T2.herkans.ll.d.vast.e, 8.2); is('handwerk f afgetopt', eind('f', T2), 7); is('e niet afgerond', eind('e', T2), undefined);
// P1: a: alles 8 -> 8, eind (8*90+8*10)/100 = 8,0; b: som 6+6+12+12+8+6 = 50, 50/9 = 5,56 -> 5,6; eind (5,6*90+6*10)/100 = 5,64 -> 5,6; plafond 7 niet gehaald
is('handwerk P1 a', eind('a', Tp1), 8); is('handwerk P1 b', eind('b', Tp1), 5.6);

const NU = new Date('2027-02-01T12:00:00').getTime(); // schooljaar 2026-2027
is('schooljaar van een datum', [O.schooljaarVan('2026-08-01'), O.schooljaarVan('2026-07-31'), O.schooljaarVan('2027-06-07'), O.schooljaarVan(NU)], [2026, 2025, 2026, 2026]);
const kol = O.kolommenVan(S, BM, 'm3x', NU);
is('kolommen: P1 dan P2, vorig jaar niet, op datum', kol.map(k => k.m.id), ['p1a-mavo3-zang', 'p1b-mavo3-akkoord']);
const komend = BM.filter(x => ['p1a-mavo3-zang', 'p1b-mavo3-akkoord', 'p1c-mavo3-slagwerk'].includes(x.id));
is('toetsen die nog komen staan er achter', O.kolommenVan(S, BM, 'm3x', NU, komend).map(k => k.m.id + (k.komt ? '*' : '')), ['p1a-mavo3-zang', 'p1b-mavo3-akkoord', 'p1c-mavo3-slagwerk*']);

/* ---------- 4. het klasoverzicht ---------- */
{ const o = O.overzicht(S, BM, 'm3x', NU, komend); const r = id => o.rijen.find(x => x.id === id); const c = (id, i) => r(id).cellen[i];
  is('6 rijen in de volgorde van de lijst', o.rijen.map(x => x.id), ids);
  is('a: P1 8,0 niveau 2, P2 7,6', [c('a', 0).e, c('a', 0).niveau, c('a', 1).e, c('a', 1).niveau], [8, 'Niveau 2', 7.6, 'Niveau 2']);
  is('a: niet afgetopt', [c('a', 0).afgetopt, c('a', 1).afgetopt], [false, false]);
  is('b: P1 5,6 en P2 6,6, niveau 1', [c('b', 0).e, c('b', 1).e, c('b', 1).niveau], [5.6, 6.6, 'Niveau 1']);
  is('d: herkansing telt 8,2, eerste poging 7,1', [c('d', 1).e, c('d', 1).herkans, c('d', 1).eerste, c('d', 1).telt], [8.2, true, 7.1, 2]);
  is('f: afgetopt 7,0 uit 8,9', [c('f', 1).e, c('f', 1).ruw, c('f', 1).afgetopt, c('f', 1).niveau], [7, 8.9, true, 'Niveau 1']);
  is('e: P2 inhalen', c('e', 1), { inhalen: true }); is('e: P1 nog open', c('e', 0), { open: true, tussen: null });
  is('komend: grijs', c('a', 2), { komt: true });
  is('filter onvoldoende (onder 5,5): niemand; e heeft geen cijfer', o.rijen.filter(x => O.pas(x, 'onvoldoende')).map(x => x.id), []);
  is('filter nog open: e (inhalen en P1 open) en c, d, f (P1 open)', o.rijen.filter(x => O.pas(x, 'open')).map(x => x.id), ['c', 'd', 'e', 'f']);
  is('geen jaargemiddelde (keuze 5)', o.rijen.map(x => x.gemiddelde), [null, null, null, null, null, null]);
  const I5 = Object.assign({}, O.INSTELLINGEN, { JAARGEMIDDELDE: true }); const o5 = O.overzicht(S, BM, 'm3x', NU, [], I5);
  // a: (8,0 + 7,6)/2 = 7,8; b: (5,6 + 6,6)/2 = 6,1
  is('andere keuze 5: gemiddelde', [o5.rijen[0].gemiddelde, o5.rijen[1].gemiddelde, o5.rijen[2].gemiddelde], [7.8, 6.1, 6]); }
{ const T = S.toetsen['p1b-mavo3-akkoord|m3x']; T.ll.c.vast.e = 5; const o = O.overzicht(S, BM, 'm3x', NU, []); is('filter onvoldoende vindt 5,0', o.rijen.filter(x => O.pas(x, 'onvoldoende')).map(x => x.id), ['c']); T.ll.c.vast.e = 6; }

/* ---------- 5. de kruisjes en de vergelijking ---------- */
// vinkjes P2: stellingen -> presentatie, wisselen, patroon
const vink = (a, b, c) => { const o = {}; [a, b, c].forEach((v, i) => { if (v) o[i] = v; }); return o; };
T2.ll.a.vink = vink('B', 'J', 'J');    // a: presentatie 8 (ja): bijna = -1; wisselen 8 (ja): ja = 0; patroon 6 (bijna): ja = +1
T2.ll.b.vink = vink('B', 'J', 'J');    // b: presentatie 8: bijna = -1; wisselen 4 (nog niet): ja = +2 (licht); patroon 6: ja = +1
T2.herkans.ll.d.vink = vink('J', 'J', 'J'); // d herkansing: alles 8 -> ja = 0
T2.ll.d.vink = vink('N', 'N', 'N');    // d eerste poging, telt niet: alles 7 (bijna): nog niet = -1
T2.ll.f.vink = vink('N', 'J', null);   // f: alles 9 (ja): nog niet = -2 (licht), ja = 0, patroon leeg
{ const v = (id) => O.vergelijking(P2, T2, id);
  is('a: stappen', v('a').map(q => q.stap), [-1, 0, 1]); is('a: scores en banden', v('a').map(q => [q.score, q.band]), [[8, 2], [8, 2], [6, 1]]); is('a: niets licht', v('a').map(q => q.licht), [false, false, false]);
  is('b: stappen', v('b').map(q => q.stap), [-1, 2, 1]); is('b: alleen de twee stappen lichten op', v('b').map(q => q.licht), [false, true, false]);
  is('b: criterium en zin', [v('b')[1].critNaam, v('b')[1].zin], ['Akkoordwisselingen', 'Ik wissel mijn akkoorden op tijd en in tempo']);
  is('d: vergeleken wordt de herkansing die telt', v('d').map(q => [q.vink, q.score, q.stap]), [['J', 8, 0], ['J', 8, 0], ['J', 8, 0]]);
  is('d: de eerste poging apart bekeken', O.vergelijking(P2, T2, 'd', T2).map(q => q.stap), [-1, -1, -1]);
  is('f: leeg kruisje geeft geen stap', v('f').map(q => q.stap), [-2, 0, null]); is('f: licht bij twee stappen lager', v('f').map(q => q.licht), [true, false, false]);
  is('c zonder kruisjes: score er, geen stap', v('c').map(q => [q.vink, q.score, q.stap]), [[null, 6, null], [null, 6, null], [null, 6, null]]);
  const I1 = Object.assign({}, O.INSTELLINGEN, { LICHT_OP_VANAF_STAPPEN: 1 }); is('andere keuze 3: elk verschil licht op (a)', O.vergelijking(P2, T2, 'a', null, I1).map(q => q.licht), [true, false, true]); }
// de score is die van het criterium, niet van het eindcijfer: Fenna's afgetopte 7,0 verandert haar criteriumscores niet
is('plafond raakt het criterium niet', O.scoreCrit(P2, T2, T2, 'f', 'wisselen'), 9);
// een model zonder koppeling of zonder strookje geeft geen vergelijking
is('model zonder strookje: leeg', O.vergelijking(m('p1-mavo4'), { ll: { a: { s: {}, v: {}, opm: {} } } }, 'a'), []);
// kapotte kruisjes breken niets
{ const T = { ll: { a: { s: { presentatie: 8 }, v: {}, opm: {}, vink: 'rommel' } }, volgorde: [] }; is('vink die geen object is', O.vergelijking(P2, T, 'a').map(q => q.vink), [null, null, null]);
  T.ll.a.vink = { 0: 'X', 1: 5, 2: 'J' }; is('onbekende waarden tellen niet', O.vergelijking(P2, T, 'a').map(q => q.vink), [null, null, 'J']); }
// samenvatting per leerling over het jaar: b P1 en P2
// P1 koppeling: tekst, ritme, samenspel. b P1 kruisjes: tekst: ja bij 6 (+1), ritme: ja bij 4 (+2), samenspel: bijna bij 6 (0)
Tp1.ll.b.vink = vink('J', 'J', 'B');
{ const k = O.kolommenVan(S, BM, 'm3x', NU); const o = O.overzicht(S, BM, 'm3x', NU, []); const b = o.rijen.find(x => x.id === 'b').strook, a = o.rijen.find(x => x.id === 'a').strook;
  is('b: 6 zinnen vergeleken, twee keer twee stappen hoger', [b.n, b.licht, b.tekst], [6, 2, '2× twee stappen hoger']);
  is('a: P2 vergeleken, P1 niet; stappen -1, 0, +1: binnen één stap', [a.n, a.licht, a.tekst], [3, 0, 'binnen één stap']);
  { const T = S.toetsen['p1b-mavo3-akkoord|m3x']; const oud = T.ll.a.vink; T.ll.a.vink = vink('J', 'J', 'B'); const z = O.overzicht(S, BM, 'm3x', NU, []).rijen[0].strook; T.ll.a.vink = oud; is('a met 0, 0, 0: klopt', [z.n, z.tekst], [3, 'klopt']); }
  is('f: twee stappen lager lichten op', [o.rijen.find(x => x.id === 'f').strook.tekst], ['1× twee stappen lager']);
  is('c: geen kruisjes, geen tekst', o.rijen.find(x => x.id === 'c').strook, { n: 0, licht: 0, tekst: '' });
  is('filter strookje wijkt af: b en f', o.rijen.filter(x => O.pas(x, 'wijkt')).map(x => x.id), ['b', 'f']); is('kolommen onveranderd', k.length, 2); }

/* ---------- 6. het strookje vastleggen ---------- */
{ const T = { ll: {}, volgorde: [] }; const M = JSON.parse(JSON.stringify(P2)); is('eerste kruisje legt vast', O.legStrookVast(M, T), true); is('tweede keer niets', O.legStrookVast(M, T), false);
  is('vastgelegd', T.strook, { stellingen: M.strookje.stellingen, crit: ['presentatie', 'wisselen', 'patroon'] });
  M.strookje.stellingen[0] = 'Een nieuwe zin'; M.strookje.crit[0] = 'samenspel'; is('oud kruisje blijft bij de oude zin en koppeling', O.strookVan(M, T).stellingen[0], 'Ik tel af en begin samen met mijn groepje'); is('en bij het oude criterium', O.strookVan(M, T).crit[0], 'presentatie');
  is('model zonder koppeling legt niets vast', O.legStrookVast(m('p1-mavo4'), { ll: {} }), false); is('heeftStrookje', [P1, P2, P3, m('p1-mavo4')].map(O.heeftStrookje), [true, true, true, false]); }
// bestaande scores werken zonder migratie: een toets zonder vink en zonder strook geeft gewoon het overzicht
{ const oud = { lijsten: { x: [{ id: 'a', naam: 'Testleerling, Oud' }] }, toetsen: { 'p1b-mavo3-akkoord|x': { ll: { a: rij(sc(8, 8, 8, 8, 8, 8), { Niveau: 'Niveau 2' }, 8) }, volgorde: [], start: '2026-11-02' } } };
  R.afronden(P2, oud.toetsen['p1b-mavo3-akkoord|x'], [{ id: 'a' }], 1); const o = O.overzicht(oud, BM, 'x', NU, []);
  is('oude toets zonder migratie', [o.rijen[0].cellen[0].e, o.rijen[0].strook], [8, { n: 0, licht: 0, tekst: '' }]); }

/* ---------- 7. de leerlingkaart ---------- */
{ const K = O.leerlingKaart(S, BM, 'm3x', 'b', NU, []); is('kaart: naam en twee toetsen', [K.naam, K.toetsen.map(t => t.m.toets)], ['Testleerling, Bram', K.toetsen.map(t => t.m.toets)]);
  is('kaart: twee toetsen', K.toetsen.length, 2); is('kaart: cijfers', K.toetsen.map(t => t.cel.e), [5.6, 6.6]); is('kaart: strookjescijfer', K.toetsen.map(t => t.zelf), [6, 6]);
  is('kaart: onderdelen in de vaste volgorde', K.toetsen[1].onderdelen.map(o => o.naam), DOM);
  // P2 b, domeinen: Techniek en klank = grepen(2, 8) + techniek(1, 8) -> (16+8)/3 = 8; Ritme en maat = wisselen(2, 4) + patroon(2, 6) -> (8+12)/4 = 5; Samenspel = samenspel 8; Presenteren = presentatie 8; Eigen werk: geen criterium -> leeg
  is('kaart: P2 b per onderdeel', K.toetsen[1].onderdelen.map(o => o.score), [8, 5, 8, 8, null]);
  // P1 b: Techniek en klank = houding(1, 6) + tekst(2, 6) + toon(2, 6) = 6 (tekst Mijn partij is T); Ritme en maat = ritme 4; Samenspel 6; Presenteren 6
  is('kaart: P1 b per onderdeel', K.toetsen[0].onderdelen.map(o => o.score), [6, 4, 6, 6, null]);
  is('kaart: punt om aan te werken', K.toetsen.map(t => t.vooruit), ['', 'Bereid de akkoordwissel een tel eerder voor.']);
  is('kaart: vergelijking per toets', K.toetsen.map(t => t.vergelijk.map(q => q.stap)), [[1, 2, 0], [-1, 2, 1]]);
  is('kaart voor een onbekend id', O.leerlingKaart(S, BM, 'm3x', 'zzz', NU, []), null);
  const I4 = Object.assign({}, O.INSTELLINGEN, { DOMEINEN: null }); const K4 = O.leerlingKaart(S, BM, 'm3x', 'b', NU, [], I4);
  is('andere keuze 4: zonder vaste onderdelen de eigen criteria van de toets', K4.toetsen[1].onderdelen.map(o => o.naam), ['Begin en slot', 'Akkoorden', 'Akkoordwisselingen', 'Slag- of begeleidingspatroon', 'Houding en techniek', 'Samenspel']); }

/* ---------- 8. de schermen ---------- */
{ const h = O.htmlOverzicht(O.overzicht(S, BM, 'm3x', NU, komend), 'iedereen');
  is('overzicht: cijfers met komma', ['7,6', '5,6', '6,6', '8,2', '7,0'].every(x => h.includes('>' + x + '<')), true);
  is('overzicht: herkansing en afgetopt zichtbaar', [h.includes('herkansing'), h.includes('afgetopt'), h.includes('eerste poging 7,1'), h.includes('8,9 afgetopt, niveau 1')], [true, true, true, true]);
  is('overzicht: namen worden ontsmet', [h.includes('<Chris>'), h.includes('&lt;Chris&gt;')], [false, true]);
  is('overzicht: geen jaargemiddelde, weging staat er', [h.includes('Gemiddelde'), h.includes('weging 15')], [false, true]);
  is('overzicht: 6 van 6', h.includes('6 van 6 getoond'), true);
  const hw = O.htmlOverzicht(O.overzicht(S, BM, 'm3x', NU, []), 'wijkt'); is('overzicht: filter wijkt af toont b en f', [hw.includes('Bram'), hw.includes('Fenna'), hw.includes('Anna'), hw.includes('2 van 6 getoond')], [true, true, false, true]); }
{ const h = O.htmlKaart(O.leerlingKaart(S, BM, 'm3x', 'b', NU, [])); is('kaart: tekst', [h.includes('Bereid de akkoordwissel'), h.includes('twee stappen hoger'), h.includes('Ik wissel mijn akkoorden op tijd en in tempo'), h.includes('Dit telt niet mee voor het cijfer')], [true, true, true, true]); }
{ const h = O.htmlStrookjes(S, P2, 'm3x', '');
  is('strookjes: een rij per leerling, zoeken op naam', (h.match(/data-ovn=/g) || []).length, 6);
  is('strookjes: 3 zinnen, 3 knoppen per zin, 4 voor het cijfer; afgeronde leerlingen hebben geen cijferknoppen', (h.match(/data-ovvink=/g) || []).length, 6 * 3 * 3);
  is('strookjes: Eef heeft nog niet afgerond: 4 knoppen voor het cijfer; de anderen zijn afgerond', (h.match(/data-ovzelf=/g) || []).length, 4);
  is('strookjes: teller klaar = alle kruisjes en strookjescijfer', O.strookjesTelling(P2, T2, lijst, T2), { klaar: 3, n: 6 }); // a, b en d hebben drie kruisjes en een strookjescijfer; c mist kruisjes, f het derde, e alles
  const hH = O.htmlStrookjes(S, P2, 'm3x', 'herkans'); is('strookjes: herkansing toont de herkansing', hH.includes('data-ovlaag=""'), true);
  const uit = O.htmlStrookjes(S, P2, 'm3x', '', ''); is('strookjes zonder koppeling', O.htmlStrookjes(S, m('p1-mavo4'), 'm3x', '').includes('nog geen strookje'), true); }
{ const keuze = O.INSTELLINGEN.KRUISJES_INVOEREN; O.INSTELLINGEN.KRUISJES_INVOEREN = 'geen'; is('keuze 1b: het scherm is uit', O.htmlStrookjes(S, P2, 'm3x', '').includes('staat uit'), true); O.INSTELLINGEN.KRUISJES_INVOEREN = keuze; }

console.log(fout ? fout + ' van ' + n + ' controles fout' : 'alles goed (' + n + ' controles)'); process.exit(fout ? 1 : 0);
