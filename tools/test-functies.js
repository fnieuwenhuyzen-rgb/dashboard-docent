// node tools/test-functies.js: rekenregels van de vier functies (public/functies.js), zonder scherm.
const F = require('../public/functies.js'); let fouten = 0, n = 0;
const is = (naam, ok) => { n++; if (!ok) { fouten++; console.log('  FOUT ' + naam); } };
is('keuzes zijn benoemd', F.KEUZES.week && F.KEUZES.samen && F.KEUZES.jaar);
//FUNCTIE-TESTS
// Week afsluiten: weekgrenzen en de regel voor maandag
is('maandag van een woensdag', F.maandagVan('2026-11-11') === '2026-11-09');
is('maandag van een zondag is de maandag ervoor', F.maandagVan('2026-11-15') === '2026-11-09');
is('maandag over de maandgrens', F.maandagVan('2026-12-02') === '2026-11-30');
const vol = s => { let d = F.plusDagen(s, 1); while ([0, 6].includes(new Date(d + 'T12:00').getDay())) d = F.plusDagen(d, 1); return d; };
const vor = s => { let d = F.plusDagen(s, -1); while ([0, 6].includes(new Date(d + 'T12:00').getDay())) d = F.plusDagen(d, -1); return d; };
is('vrijdag is de laatste lesdag van de week', F.laatsteLesdagVanWeek('2026-11-13', vol));
is('donderdag niet', !F.laatsteLesdagVanWeek('2026-11-12', vol));
is('maandag is de eerste lesdag van de week', F.eersteLesdagVanWeek('2026-11-09', vor));
is('dinsdag niet', !F.eersteLesdagVanWeek('2026-11-10', vor));
const volVak = s => s === '2026-12-18' ? '2027-01-04' : vol(s); // vakantie: de volgende lesdag ligt in een andere week
is('de dag voor een vakantie telt als laatste', F.laatsteLesdagVanWeek('2026-12-18', volVak));
is('donderdag voor een vrije vrijdag is de laatste lesdag', F.laatsteLesdagVanWeek('2026-11-12', s => '2026-11-16'));
const T = [{ g: 'vwo 4', soort: 'praktijk', id: 'PT1', s: '2026-11-09', dag: 'ma' }, { g: 'havo 5', soort: 'theorie', id: 'T1', s: '2026-11-11', dag: 'wo' }, { g: 'mavo 3', soort: 'theorie', id: 'T2', s: '2026-11-12', dag: 'do' }, { g: 'bb1', soort: 'theorie', id: 'T3', s: '2026-11-13', dag: 'vr' }];
is('regel: eerst op datum, hoogstens drie', F.weekRegel(T.slice().reverse(), 3) === 'Deze week: praktijktoets vwo 4 (ma), toets havo 5 (wo) en toets mavo 3 (do).');
is('regel: een toets', F.weekRegel(T.slice(0, 1), 3) === 'Deze week: praktijktoets vwo 4 (ma).');
is('regel: geen toetsen, geen regel', F.weekRegel([], 3) === '');
// Samenvoegen: minuten tellen, passen, fasen kiezen
const A = ['5 min · terugblik: clave klappen', '15 min · instructie: danszalen', '15 min · doen: walking bass', '10 min · afsluiting: exit ticket'];
const Bf = ['5 min · terugblik', { min: 15, soort: 'uitleg', kop: 'Wat bebop anders doet' }, '15 min · doen: luisteren met kaart', '10 min · afsluiting: één verschil'];
is('minuten uit tekst', F.faseMinuten(A[1]) === 15 && F.faseMinuten('zonder minuten') === 0 && F.faseMinuten(undefined) === 0);
is('minuten uit object', F.faseMinuten(Bf[1]) === 15 && F.faseMinuten({ min: -3 }) === 0);
is('tellen', F.telMinuten(A, [0, 1, 3]) === 30 && F.telMinuten(A, []) === 0 && F.telMinuten(A, [9]) === 0);
let p = F.pastSamen(A, Bf, [0, 1, 3], [1], 45); is('30 + 15 past precies', p.ok && p.som === 45 && p.reden === 'Past precies.');
p = F.pastSamen(A, Bf, [0, 1], [3], 45); is('20 + 10: 15 minuten over', p.ok && p.reden === '15 minuten over.');
p = F.pastSamen(A, Bf, [1, 2, 3], [1], 45); is('te veel: past niet', !p.ok && p.som === 55 && /10 minuten te veel/.test(p.reden));
p = F.pastSamen(A, Bf, [0, 1], [], 45); is('niets uit de tweede les: past niet', !p.ok && /beide lessen/.test(p.reden));
is('fasen in volgorde, eerst les A', JSON.stringify(F.samenFasen(A, Bf, [3, 0], [2, 1])) === JSON.stringify([A[0], A[3], Bf[1], Bf[2]]));
is('dubbel aangetikt telt een keer', F.samenFasen(A, Bf, [1, 1], [0]).length === 2);
is('paar: de laatste twee', JSON.stringify(F.kiesPaar(['a', 'b', 'c'], 'laatste-twee-voor-toets')) === '["b","c"]');
is('paar: te weinig kandidaten', F.kiesPaar(['a'], 'laatste-twee-voor-toets').length === 0 && F.kiesPaar(['a', 'b'], 'zelf').length === 0);
is('materiaal: unie zonder dubbelen', JSON.stringify(F.unie(['x', 'y'], ['y', 'z'])) === '["x","y","z"]' && F.unie(undefined, ['q']).length === 1);
// Een les zonder fasen: telt niet mee en wordt de regel "Ook in deze les"
p = F.pastSamen(A, [], [0, 1], [], 45); is('zonder fasen in de tweede les: past', p.ok && p.som === 20);
p = F.pastSamen([], Bf, [], [], 45); is('zonder fasen in de eerste les: nog een fase kiezen', !p.ok && /minstens één fase/.test(p.reden));
p = F.pastSamen(undefined, undefined, [], [], 45); is('allebei zonder fasen: past', p.ok && p.som === 0);
is('ook-regel: de tweede les zonder fasen', JSON.stringify(F.ookIn('A', 'B', A, [])) === '["B"]');
is('ook-regel: de eerste les zonder fasen', JSON.stringify(F.ookIn('A', 'B', undefined, Bf)) === '["A"]');
is('ook-regel: allebei met fasen', F.ookIn('A', 'B', A, Bf).length === 0);
// Jaar: de regel bij een krappe klas
is('regel: geen les kan vervallen', F.luchtRegel('PT1', 0) === 'Krap voor PT1. Geen les kan vervallen.');
is('regel: een les', F.luchtRegel('P3', 1) === 'Krap voor P3. Eén les kan vervallen.');
is('regel: meer lessen', F.luchtRegel('T1', 3) === 'Krap voor T1. 3 lessen kunnen vervallen.');
console.log(fouten ? fouten + ' fout(en).' : 'functies: alles goed (' + n + ' controles)');
process.exit(fouten ? 1 : 0);
