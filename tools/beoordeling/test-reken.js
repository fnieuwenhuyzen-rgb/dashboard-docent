// Controle van de rekenregels en het plakken uit Excel, met verzonnen namen. Gebruik: node tools/beoordeling/test-reken.js
const R = require('../../public/bm-reken.js');
const fs = require('fs'), path = require('path');
let fout = 0; const is = (naam, a, b) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) { fout++; console.log('FOUT', naam, x, '!=', y); } };
const crit = (id, weging, extra) => Object.assign({ id, naam: id, weging }, extra);
const model = (cs, x) => Object.assign({ id: 't', onderdelen: [{ groep: 'A', criteria: cs }] }, x);
const nieuweT = () => ({ ll: {}, volgorde: [] });

// voorbeeld uit het onderzoek: D=7,4 Z=8 K=8,2 geeft 7,6
{ const m = model([crit('a', 1)], { zelfbeoordeling: 10, delen: { docent: 75, zelf: 10, klasgenoten: 15 } }); const T = nieuweT();
  T.ll.x = { s: { a: 7.4 }, zelf: 8, klas: { forms: [8, 8.2, 8.4] } };
  is('examenconcert', R.eind(m, T, T, 'x').e, 7.6);
  is('klasgenoten gem', R.eind(m, T, T, 'x').k, 8.2);
  T.ll.x.klas.forms = [8, 8.2]; is('minder dan 3: geen eind', R.eind(m, T, T, 'x').e, null); is('minder dan 3: mist', R.eind(m, T, T, 'x').mist, ['klasgenoten']);
  T.ll.x.klas = { forms: [8, 8], papier: [8.6] }; is('papier telt mee', R.eind(m, T, T, 'x').k, 8.2);
  delete T.ll.x.zelf; is('zelf mist: geen eind', R.eind(m, T, T, 'x').e, null); }
// 90/10 en afrondingsgrenzen: 7,5 x 0,9 + 8 x 0,1 = 7,55 wordt 7,6 (Excel ROUND)
{ const m = model([crit('a', 1)], { zelfbeoordeling: 10 }); const T = nieuweT(); T.ll.x = { s: { a: 7.5 }, zelf: 8 }; is('90/10 grens', R.eind(m, T, T, 'x').e, 7.6);
  let af = 0; for (let d = 40; d <= 100; d++) for (let z = 4; z <= 10; z++) { T.ll.x = { s: { a: d / 10 }, zelf: z }; const verwacht = Math.round((d * 9 + z * 10)) / 10; const excel = +(Math.round(verwacht) / 10).toFixed(1); if (R.eind(m, T, T, 'x').e !== excel) af++; } is('90/10 raster', af, 0); }
// docentcijfer: som score x weging / som wegingen op één decimaal
{ const m = model([crit('a', 2), crit('b', 1)]); const T = nieuweT(); T.ll.x = { s: { a: 7, b: 8 } }; is('docent', R.eind(m, T, T, 'x').e, 7.3); T.ll.x = { s: { a: 7 } }; is('onvolledig', R.eind(m, T, T, 'x').e, null); }
// groepsscore: geldt voor leden, eigen gaat voor, startpunt telt pas na bevestiging
{ const m = model([crit('sam', 2, { groepsscore: true }), crit('rol', 1, { groepsscore: 'start' }), crit('ind', 1)]); const T = nieuweT();
  T.groepjes = [{ id: 'g1', naam: 'G1', leden: ['x', 'y'] }]; T.gs = { g1: { sam: 8, rol: 6 } }; T.ll.x = { s: { ind: 7 } }; T.ll.y = { s: { ind: 7, sam: 6 } };
  is('groep geldt', R.scoreVan(T, T, 'x', m.onderdelen[0].criteria[0]), { v: 8, b: 'groep', g: 8 });
  is('eigen gaat voor', R.scoreVan(T, T, 'y', m.onderdelen[0].criteria[0]), { v: 6, b: 'eigen', g: 8 });
  is('startpunt telt niet', R.scoreVan(T, T, 'x', m.onderdelen[0].criteria[1]), { v: null, b: null, g: 6 });
  is('zonder bevestiging geen cijfer', R.eind(m, T, T, 'x').e, null);
  T.ll.x.s.rol = 6; is('na bevestiging', R.eind(m, T, T, 'x').e, 7.3); }
// afronden: bevriest, overleeft modelwijziging en groepswijziging; inhalen krijgt lege cel, volgorde van de lijst
{ const a = crit('a', 2, { groepsscore: true }), b = crit('b', 1); const m = model([a, b]); const T = nieuweT(); const lijst = [{ id: 'z', naam: 'Z' }, { id: 'x', naam: 'X' }, { id: 'y', naam: 'Y' }];
  T.groepjes = [{ id: 'g', naam: 'g', leden: ['x'] }]; T.gs = { g: { a: 8 } }; T.ll.x = { s: { b: 6 } }; T.ll.y = { s: {}, af: true }; T.ll.z = { s: { a: 6, b: 7 } };
  is('afronden telt', R.afronden(m, T, lijst, 111), ['z', 'x']); is('kolom', R.kolom(T, lijst), ['6,3', '7,3', '']);
  const m2 = model([crit('a', 1, { groepsscore: true }), crit('b', 5)]); T.gs.g.a = 4; is('bevroren na wijziging', R.eind(m2, T, T, 'x').e, 7.3);
  T.ll.y = { s: { a: 10, b: 4 } }; R.afronden(m2, T, lijst, 222); is('inhalen rekent met vastgelegde weging', T.ll.y.vast.e, 8); is('tijdstippen', [T.vast.eerst, T.vast.laatst, T.ll.x.vast.op], [111, 222, 111]);
  R.heropen(T, 'x'); is('heropend leeg', R.kolom(T, lijst), ['6,3', '', '8,0']); R.heropen(T, 'y'); R.heropen(T, 'z'); is('alles open: geen bevriezing', T.vast, undefined); }
// tussenstand telt nooit: eigen laag, geen kolom
{ const m = model([crit('a', 1)]); const T = nieuweT(); const L = { id: 'l1', ll: { x: { s: { a: 9 } } } }; const lijst = [{ id: 'x', naam: 'X' }]; is('tussenstand rekent los', R.eind(m, L, T, 'x').e, 9); is('toets leeg', R.eind(m, T, T, 'x').e, null); is('afronden negeert laag', R.afronden(m, T, lijst, 1), []); is('kolom leeg', R.kolom(T, lijst), ['']); }
// cijfers lezen
is('komma', R.leesCijfer('7,5'), 7.5); is('tien', R.leesCijfer('10'), 10); is('te hoog', R.leesCijfer('11'), null); is('tekst', R.leesCijfer('goed'), null); is('nul', R.leesCijfer('0'), null);
// namen koppelen
{ const oud = [{ id: 'a', naam: 'Jansen, Anna' }, { id: 'b', naam: 'Pieter de Vries' }, { id: 'c', naam: 'Weg, Willem' }, { id: 'd', naam: 'Ömer Yılmaz' }];
  const u = R.vergelijkLijst(['Jansen, Anna', 'pieter  DE vries', 'Anna Jansen', 'Omer Yilmaz', 'Nieuw, Nina'], oud);
  is('exact', u.rij[0].id, 'a'); is('hoofdletters', u.rij[1].id, 'b'); is('accenten', u.rij[3].id, 'd'); is('nieuw', [u.rij[4].id, u.rij[4].voorstel], [null, null]);
  const v = R.vergelijkLijst(['De Vries, Pieter'], oud); is('volgorde omgedraaid', v.rij[0].voorstel, 'b');
  const w = R.vergelijkLijst(['Twee, Tom', 'Twee, Tom'], [{ id: 'p', naam: 'Twee, Tom' }, { id: 'q', naam: 'Twee, Tom' }]); is('dubbele naam twee ids', w.rij.map(x => x.id), ['p', 'q']); }
// plakken uit Excel
{ const lijst = [{ id: 'a', naam: 'Anna Jansen' }, { id: 'b', naam: 'Bram de Boer' }, { id: 'c', naam: 'Cas Dijk' }];
  const breed = 'ID\tBegintijd\tNaam\tAnna Jansen\tBram de Boer\tCas Dijk\tDirk Niemand\n1\t2-11\tAnna Jansen\t10\t7\t8,5\t6\n2\t2-11\tBram de Boer\t8\t\t7\t\n3\t2-11\tCas Dijk\t6\tgoed\t\t';
  const x = R.leesKlasgenoten(breed, lijst); is('breed vorm', x.vorm, 'kolom per klasgenoot'); is('breed a zonder eigen', x.per.a, [8, 6]); is('breed b', x.per.b, [7]); is('breed c', x.per.c, [8.5, 7]); is('breed onbekend', x.onbekend, [{ label: 'Dirk Niemand', w: [6] }]); is('breed ongeldig', x.ongeldig, 1); is('breed eigen', x.zelf, 1);
  const lang = 'ID\tNaam\tWie beoordeel je?\tCijfer\tToelichting\n1\tAnna Jansen\tJansen, Anna\t9\t"Leuk\nen goed"\n2\tAnna Jansen\tBram de Boer\t7\tok\n3\tAnna Jansen\tBram de Boer\t8\tbijgesteld\n4\tCas Dijk\tBram de Boer\t6,5\t\n5\tCas Dijk\tBrom Boer\t5\t\n6\tCas Dijk\tAnna Jansen\t12\t';
  const y = R.leesKlasgenoten(lang, lijst); is('lang vorm', y.vorm, 'rij per beoordeling'); is('lang b laatste telt', y.per.b, [8, 6.5]); is('lang eigen eruit', [y.per.a, y.zelf], [[], 1]); is('lang onbekend', y.onbekend, [{ label: 'Brom Boer', w: [5] }]); is('lang ongeldig', y.ongeldig, 1);
  is('geen tabel', !!R.leesKlasgenoten('alleen tekst', lijst).fout, true); is('geen namen', !!R.leesKlasgenoten('a\tb\nc\td', lijst).fout, true); }
// speelbox: plafond per niveau op het eindcijfer, teksten per partij
{ const k = { partijVeld: 'Partij', niveauVeld: 'Niveau', partijen: [{ naam: 'Drums', soort: 'drums' }], niveaus: [{ naam: 'Niveau 1', plafond: 7 }, { naam: 'Niveau 2', plafond: 8.5 }, { naam: 'Niveau 3', plafond: 10 }] };
  const c = crit('a', 1, { docent: ['d'], leerling: ['l'], perPartij: { drums: { naam: 'Klank', docent: ['dr'] } } }); const m = model([c], { speelkeuze: k });
  const T = nieuweT(); T.ll.x = { s: { a: 9 }, v: { Niveau: 'Niveau 1' } }; T.ll.y = { s: { a: 9 }, v: { Niveau: 'Niveau 3' } }; T.ll.z = { s: { a: 9 }, v: {} }; T.ll.w = { s: { a: 6 }, v: { Niveau: 'Niveau 1' } };
  is('plafond geraakt', [R.eind(m, T, T, 'x').e, R.eind(m, T, T, 'x').d, R.eind(m, T, T, 'x').ruw], [7, 9, 9]); is('plafond hoog', R.eind(m, T, T, 'y').e, 9); is('geen niveau, geen plafond', R.eind(m, T, T, 'z').e, 9); is('onder plafond', R.eind(m, T, T, 'w').e, 6);
  const M2 = model([c], { speelkeuze: k, zelfbeoordeling: 10 }); const U = nieuweT(); U.ll.x = { s: { a: 9 }, zelf: 10, v: { Niveau: 'Niveau 2' } }; is('plafond met zelfdeel', R.eind(M2, U, U, 'x').e, 8.5);
  R.afronden(m, T, [{ id: 'x' }], 1); is('vastgelegd met plafond', T.ll.x.vast.e, 7); T.ll.x.v.Niveau = 'Niveau 3'; is('vast verandert niet', R.eind(m, T, T, 'x').e, 7);
  const v = R.critVoor(m, c, { Partij: 'Drums' }); is('partij naam', [v.naam, v.docent[0], v.leerling], ['Klank', 'dr', null]); is('onbekende partij', R.critVoor(m, c, { Partij: 'Oud' }).naam, 'a'); }
{ const m = model([crit('a', 1)], { speelkeuze: { partijVeld: 'P', niveauVeld: 'Niveau', partijen: [], niveaus: [{ naam: 'Niveau 1', plafond: null }] } }); const T = nieuweT(); T.ll.x = { s: { a: 9 }, v: { Niveau: 'Niveau 1' } }; is('niveau zonder plafond', R.eind(m, T, T, 'x').e, 9); }
// alle modellen: hebben ze wat de app nodig heeft
{ const dir = __dirname; for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) { const m = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); const D = R.delenVan(m); const som = Object.values(D).reduce((a, b) => a + b, 0); is(f + ' delen 100', som, 100); if (D.klasgenoten) is(f + ' zelfdeel', m.zelfSoort, 'cijfer'); } }
console.log(fout ? fout + ' fouten' : 'alles goed'); process.exit(fout ? 1 : 0);
