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
// Past in dit gat: een grote eigen taak in stukken (onderdeel A, 11-11-2026)
is('grens is 30 minuten', F.KEUZES.stukken.grens === 30);
is('90 min wordt 3 stukken', F.stukAantal(90, 30) === 3 && F.stukMinuten(90, 3) === 30);
is('30 min of minder: niet in stukken', F.stukAantal(30, 30) === 1 && F.stukAantal(20, 30) === 1);
is('45 min wordt 2 stukken van 25 (op 5 minuten)', F.stukAantal(45, 30) === 2 && F.stukMinuten(45, 2) === 25);
is('heel lang: hoogstens max stukken', F.stukAantal(480, 30) === F.KEUZES.stukken.max);
is('zelf 2 stukken van 90 min: 45 per stuk', F.stukMinuten(90, 2) === 45);
let nr = 0; const groot = { id: 'kA', titel: 'Toetsen nakijken', d: '2026-11-20', rol: 'docent', potje: 'p1', bron: 'les', min: 90, heel: true, af: false };
const st = F.maakStukken(groot, 3, 90, () => 'kN' + (++nr));
is('drie stukken met titel deel x van 3', st.length === 3 && st[0].titel === 'Toetsen nakijken (deel 1 van 3)' && st[2].titel === 'Toetsen nakijken (deel 3 van 3)');
is('deel 1 houdt het id, de rest krijgt een nieuw id', st[0].id === 'kA' && st[1].id === 'kN1' && st[2].id === 'kN2');
is('stukken houden deadline, rol, potje en bron', st.every(s => s.d === '2026-11-20' && s.rol === 'docent' && s.potje === 'p1' && s.bron === 'les'));
is('stukken van 30 min met deel {groep, nr, van}', st.every((s, i) => s.min === 30 && s.deel.groep === 'kA' && s.deel.nr === i + 1 && s.deel.van === 3 && !s.af && !('heel' in s)));
is('de oorspronkelijke taak blijft onaangeroerd', groot.titel === 'Toetsen nakijken' && !groot.deel);
is('opnieuw splitsen: geen dubbele deel-tekst', F.stukTitel('X (deel 1 van 3)', 2, 4) === 'X (deel 2 van 4)' && F.kaleTitel('X (deel 1 van 3)') === 'X');
const los = { id: 'kL', titel: 'Mail', af: false }; const alle = st.concat([los]); let telt = F.eersteDelen(alle);
is('planning ziet alleen deel 1 en losse taken', alle.filter(k => !k.af && telt(k)).map(k => k.id).join() === 'kA,kL');
st[0].af = true; telt = F.eersteDelen(alle);
is('deel 1 af: nu deel 2', alle.filter(k => !k.af && telt(k)).map(k => k.id).join() === 'kN1,kL');
st[1].af = true; st[2].af = true; telt = F.eersteDelen(alle);
is('alles af: alleen de losse taak', alle.filter(k => !k.af && telt(k)).map(k => k.id).join() === 'kL');
const door = F.maakStukken({ id: 'g', titel: 'Y' }, 2, 60, () => 'g2').reverse(); telt = F.eersteDelen(door);
is('volgorde in de lijst doet er niet toe', door.filter(k => telt(k)).map(k => k.id).join() === 'g');
is('zonder taken geen fout', F.eersteDelen(undefined)({ id: 'z' }) === true);
console.log(fouten ? fouten + ' fout(en).' : 'functies: alles goed (' + n + ' controles)');
process.exit(fouten ? 1 : 0);
