// node tools/test-lesklok.js: de rekenregels van de lesklok (public/lesklok.js)
const assert = require('assert');
require('../public/lesklok.js');
const { blokken, blokNu, stand, klokTekst } = globalThis.LESKLOK;
const u = (van, tot, groep, x) => Object.assign({ van, tot, groep }, x);
// aansluitende uren van dezelfde groep zijn één blok
let b = blokken([u(600, 645, 'h3'), u(645, 690, 'h3')]);
assert.strictEqual(b.length, 1); assert.strictEqual(b[0].tot, 690);
// een pauze ertussen, of een andere groep: apart signaal
assert.strictEqual(blokken([u(600, 645, 'h3'), u(660, 705, 'h3')]).length, 2);
assert.strictEqual(blokken([u(600, 645, 'h3'), u(645, 690, 'v4')]).length, 2);
// uitval telt niet mee: het signaal komt aan het eind van het uur dat wel doorgaat
b = blokken([u(600, 645, 'h3'), u(645, 690, 'h3', { uitval: true })]);
assert.strictEqual(b.length, 1); assert.strictEqual(b[0].tot, 645);
// volgorde in het rooster doet er niet toe
assert.strictEqual(blokken([u(645, 690, 'h3'), u(600, 645, 'h3')]).length, 1);
// welk blok loopt: het einde hoort er niet meer bij
b = blokken([u(600, 645, 'h3')]);
assert.ok(blokNu(b, 600 * 60)); assert.ok(blokNu(b, 645 * 60 - 1));
assert.strictEqual(blokNu(b, 645 * 60), null); assert.strictEqual(blokNu(b, 600 * 60 - 1), null);
// standen: precies op 4 minuten het signaal
const gewoon = { stil: false, strookje: false }, toets = { stil: true }, str = { strookje: true };
assert.strictEqual(stand(241, gewoon), 'loopt'); assert.strictEqual(stand(240, gewoon), 'opruimen'); assert.strictEqual(stand(1, gewoon), 'opruimen');
assert.strictEqual(stand(240, toets), 'toets');
assert.strictEqual(stand(421, str), 'loopt'); assert.strictEqual(stand(420, str), 'strookje'); assert.strictEqual(stand(241, str), 'strookje'); assert.strictEqual(stand(240, str), 'opruimen');
assert.strictEqual(stand(240, { stil: true, strookje: true }), 'toets');
assert.strictEqual(klokTekst(240), '4:00'); assert.strictEqual(klokTekst(59), '0:59');
// een toets in het eerste uur van een blok maakt het hele blok stil
assert.strictEqual(blokken([u(600, 645, 'h3', { stil: true }), u(645, 690, 'h3')])[0].stil, true);
// kopregel van de lesmodus: alleen binnen de eigen lestijd een resttijd (bevinding 15 en 41)
const { lesRest } = globalThis.LESKLOK;
const dag = blokken([u(510, 555, 'h3a'), u(555, 600, 'v4'), u(600, 645, 'v4')]); // 8:30-9:15 h3a, 9:15-10:45 v4 (dubbel)
const h3a = { groep: 'h3a', van: 510, tot: 555 }, v4 = { groep: 'v4', van: 555, tot: 600 };
assert.strictEqual(lesRest(556 * 60, h3a, dag).tekst, 'les voorbij'); // 9:16, h3a nog open: niet de 44 min van v4
assert.strictEqual(lesRest(512 * 60, v4, dag).tekst, 'begint om 9:15'); // 8:32, v4 geopend
assert.strictEqual(lesRest(512 * 60, h3a, dag).tekst, 'nog 43 min');
assert.strictEqual(lesRest(555 * 60, h3a, dag).wat, 'voorbij'); assert.strictEqual(lesRest(555 * 60 - 1, h3a, dag).wat, 'loopt');
assert.strictEqual(lesRest(560 * 60, v4, dag).tekst, 'nog 85 min'); // dubbel uur telt als één blok
assert.strictEqual(lesRest(610 * 60, { groep: 'v4', van: 600, tot: 645 }, dag).tekst, 'nog 35 min');
assert.strictEqual(lesRest(500 * 60, { groep: 'x', van: 510, tot: 555 }, []).tekst, 'begint om 8:30'); // niet in het rooster van vandaag

// later begonnen: fasen inkorten (bevinding 17), public/lesmodus.js
require('../public/lesmodus.js');
const { inkorten, timerTekst, ringDeel } = globalThis.LESMODUS;
const F = [{ min: 5, soort: 'start' }, { min: 10, soort: 'uitleg' }, { min: 20, soort: 'doen' }, { min: 5, soort: 'check' }, { min: 5, soort: 'afsluiten' }];
let r = inkorten(F, 43 * 60); // 8:32, nog 43 min, gepland 45
assert.deepStrictEqual(r.min, [5, 10, 18, 5, 5]); assert.strictEqual(r.tekort, 2); assert.strictEqual(r.past, 2);
assert.deepStrictEqual(inkorten(F, 45 * 60).min, [5, 10, 20, 5, 5]); // op tijd: niets
assert.deepStrictEqual(inkorten(F, 45 * 60 - 20).min, [5, 10, 20, 5, 5]); // 20 seconden later: speling
r = inkorten(F, 25 * 60); // 20 min tekort: aan de slag hooguit de helft (10), dan uitleg (5), dan opening (2); check en afsluiting heel
assert.deepStrictEqual(r.min, [3, 5, 10, 5, 5]); assert.strictEqual(r.past, 17); assert.strictEqual(r.tekort, 20);
assert.deepStrictEqual(inkorten([{ min: 10, soort: 'doen' }, { min: 10, soort: 'luisteren' }], 18 * 60).min, [8, 10]); // gelijk: de eerste
// fasetimer na 0:00: doortellen als uitloop, ring vol
assert.strictEqual(timerTekst(65), '1:05'); assert.strictEqual(timerTekst(0), '0:00'); assert.strictEqual(timerTekst(-45), '+0:45'); assert.strictEqual(timerTekst(-61), '+1:01');
assert.strictEqual(ringDeel(-5, 600), 1); assert.strictEqual(ringDeel(300, 600), .5);
console.log('lesklok: alles klopt');
