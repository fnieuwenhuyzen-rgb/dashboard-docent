// node tools/test-functies.js: rekenregels van de proeffuncties (public/functies.js), zonder scherm.
const F = require('../public/functies.js'); let fouten = 0, n = 0;
const is = (naam, ok) => { n++; if (!ok) { fouten++; console.log('  FOUT ' + naam); } };
// schakelaars: standaard uit, per sleutel aan te zetten
const ap = {};
is('alle proeffuncties staan standaard uit', F.LIJST.every(f => !F.aan(ap, f.sleutel)));
is('aan zonder staat is uit', !F.aan(undefined, 'weekAfsluiten'));
F.zet(ap, 'weekAfsluiten', true); is('zet aan', F.aan(ap, 'weekAfsluiten') && !F.aan(ap, 'samenvoegen'));
F.zet(ap, 'weekAfsluiten', false); is('zet uit haalt de sleutel weg', !('weekAfsluiten' in ap));
is('elke schakelaar heeft naam en uitleg', F.LIJST.every(f => f.sleutel && f.naam && f.uitleg));
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
console.log(fouten ? fouten + ' fout(en).' : 'functies: alles goed (' + n + ' controles)');
process.exit(fouten ? 1 : 0);
