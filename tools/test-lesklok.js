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
console.log('lesklok: alles klopt');
