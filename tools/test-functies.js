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
console.log(fouten ? fouten + ' fout(en).' : 'functies: alles goed (' + n + ' controles)');
process.exit(fouten ? 1 : 0);
