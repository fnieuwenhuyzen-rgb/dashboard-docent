// Tests voor de regie op de tablet (ontwerp 16-11-2026): de speling (public/regie.js) en /api/regie (functions/api/regie.js)
// tegen een nagebootste database (tools/nep-d1.js, node:sqlite). Gebruik: node tools/test-regie.js. Geen browser nodig.
const assert = require('assert'), path = require('path'), { pathToFileURL } = require('url');
const R = require('../public/regie.js');
const { nepD1 } = require('./nep-d1.js');

// ---------- speling ----------
// bord-dia's zonder jouw kaart: welkom, doel, fasen, check, thuis, af
const fase = (min, soort = 'doen') => ({ k: 'fase', min, soort });
const les = [{ k: 'welkom' }, { k: 'doel' }, fase(10, 'uitleg'), fase(20, 'doen'), fase(5, 'afsluiten'), { k: 'check' }, { k: 'af' }];
const sp = (i, restMin, inFaseMin = 0) => R.speling({ slides: les, i, restSec: restMin * 60, inFaseSec: inFaseMin * 60 });
assert.strictEqual(sp(0, 45).min, 10, 'welkom: 45 − (10 + 20) − 5 afsluiten = 10');
assert.strictEqual(sp(0, 45).tekst, '+10 min speling');
assert.strictEqual(sp(2, 35, 0).min, 0, 'precies op schema');
assert.strictEqual(sp(2, 35, 0).tekst, 'precies op schema');
assert.strictEqual(sp(2, 30, 2).min, -3, 'uitleg 2 min bezig: nog 8 + 20 + 5 = 33 nodig, 30 over');
assert.strictEqual(sp(2, 30, 2).tekst, '−3 min');
assert.strictEqual(sp(2, 30, 15).min, 5, 'uitleg loopt uit: telt niet negatief mee, nog 20 + 5 = 25 nodig');
assert.strictEqual(sp(3, 30, 0).min, 5, 'groepjes beginnen: 30 − 20 − 5');
// afronden houdt een vaste ondergrens
const kort = [{ k: 'welkom' }, fase(10, 'doen'), fase(2, 'afsluiten'), { k: 'af' }];
assert.strictEqual(R.speling({ slides: kort, i: 0, restSec: 20 * 60, inFaseSec: 0 }).min, 6, 'afsluiten 2 min gepland, toch 4 min vast: 20 − 10 − 4');
assert.strictEqual(R.speling({ slides: kort, i: 0, restSec: 20 * 60, inFaseSec: 0 }).reserve, R.ONDERGRENS_SEC);
const geenAf = [{ k: 'welkom' }, fase(10), { k: 'thuis' }, { k: 'af' }];
assert.strictEqual(R.speling({ slides: geenAf, i: 2, restSec: 6 * 60, inFaseSec: 0 }).min, 2, 'zonder afsluitfase blijft de ondergrens: 6 − 4');
assert.strictEqual(R.speling({ slides: geenAf, i: 3, restSec: 6 * 60, inFaseSec: 0 }).min, 6, 'op de laatste dia geen reserve meer');
assert.strictEqual(R.speling({ slides: les, i: 0, restSec: 45 * 60 - 20, inFaseSec: 0 }).min, 10, 'twintig seconden telt nog niet als minuut minder');
assert.strictEqual(R.speling({ slides: les, i: 0, restSec: 35 * 60 - 20, inFaseSec: 0 }).tekst, 'precies op schema', 'geen −0');
assert.strictEqual(R.speling({ slides: les, i: 0, restSec: null }), null, 'geen lestijd: geen speling');
assert.strictEqual(R.speling({ slides: les, i: 99, restSec: 600 }), null);
// klokstand
assert.strictEqual(R.klokLeft(null, 0), 0);
assert.strictEqual(R.klokLeft({ tot: 600, loopt: true, eind: 100000 }, 40000), 60);
assert.strictEqual(R.klokLeft({ tot: 600, loopt: true, eind: 100000 }, 200000), 0, 'nooit plus-tijd');
assert.strictEqual(R.klokLeft({ tot: 600, loopt: false, left: 125 }, 0), 125);
console.log('speling en klok: goed');

// ---------- /api/regie ----------
(async () => {
  const F = await import(pathToFileURL(path.join(__dirname, '..', 'functions', 'api', 'regie.js')).href);
  const env = { DB: nepD1(), DEV_EMAIL: 'test@voorbeeld.nl' };
  const vraag = (methode, body, zoek = '', kop = {}) => F.onRequest({ env, request: new Request('http://localhost/api/regie' + zoek, { method: methode, headers: Object.assign({ 'Content-Type': 'application/json' }, kop), body: body === undefined ? undefined : JSON.stringify(body) }) });
  const j = async r => ({ status: r.status, ...(await r.json()) });

  // toegang
  assert.strictEqual((await F.onRequest({ env: {}, request: new Request('http://localhost/api/regie') })).status, 503, 'geen database');
  assert.strictEqual((await F.onRequest({ env: { DB: env.DB }, request: new Request('http://localhost/api/regie') })).status, 401, 'zonder token geen toegang');
  assert.strictEqual((await F.onRequest({ env: { DB: env.DB, DEV_EMAIL: 'test@voorbeeld.nl' }, request: new Request('https://lesdag-muziek.pages.dev/api/regie') })).status, 401, 'testadres alleen op localhost');
  assert.strictEqual((await vraag('PUT', { staat: null }, '', { Origin: 'https://kwaad.example' })).status, 403, 'andere herkomst mag niets zetten');

  // leeg
  let g = await j(await vraag('GET')); assert.strictEqual(g.status, 200); assert.strictEqual(g.staat, null); assert.strictEqual(g.laatste, 0);
  // het bord zet zijn staat; extra velden (zoals namen) vallen weg
  const staat = { uid: 'u_vwo4', s: '2026-11-16', les: 'vwo4:12.1', i: 3, n: 9, fb: 1763280000000, klok: { tot: 900, left: 0, eind: 1763280900000, loopt: true }, namen: ['Testleerling, Anna'], notitie: 'geheim' };
  assert.strictEqual((await vraag('PUT', { staat })).status, 200);
  g = await j(await vraag('GET'));
  assert.deepStrictEqual(Object.keys(g.staat).sort(), ['fb', 'i', 'klok', 'les', 'n', 's', 'uid'], 'alleen les-id, dia en klokstand');
  assert.ok(!JSON.stringify(g).includes('Testleerling') && !JSON.stringify(g).includes('geheim'), 'geen leerlinggegevens of notities over de lijn');
  assert.strictEqual(g.staat.klok.eind, 1763280900000); assert.ok(Math.abs(g.nu - Date.now()) < 5000);
  // kapotte staat wordt geweigerd, de oude blijft
  for (const fout of [{ ...staat, i: 9 }, { ...staat, les: '<script>' }, { ...staat, s: 'morgen' }, { ...staat, uid: 'a\tb' }, { ...staat, uid: 'a<b' }, { ...staat, uid: ' a' }, { ...staat, klok: { tot: 'tien' } }, 'tekst'])
    assert.strictEqual((await vraag('PUT', { staat: fout })).status, 400, 'geweigerd: ' + JSON.stringify(fout).slice(0, 60));
  assert.strictEqual((await j(await vraag('GET'))).staat.i, 3);
  // een Zermelo-uur zonder vast rooster: de groep in het id kan een spatie hebben (kmu h3)
  assert.strictEqual((await vraag('PUT', { staat: { ...staat, uid: 'z-13:10-kmu h3' } })).status, 200, 'uid met spatie wordt geweigerd');
  assert.strictEqual((await j(await vraag('GET'))).staat.uid, 'z-13:10-kmu h3');
  assert.strictEqual((await vraag('PUT', { staat })).status, 200);
  assert.strictEqual((await vraag('PUT', {})).status, 400);

  // de tablet stuurt opdrachten; het bord haalt alleen wat nieuw is
  const na0 = (await j(await vraag('GET'))).laatste;
  assert.strictEqual((await j(await vraag('POST', { opdracht: { id: 'abc123', t: 'volgende' } }))).nieuw, true);
  assert.strictEqual((await j(await vraag('POST', { opdracht: { id: 'abc123', t: 'volgende' } }))).nieuw, false, 'dezelfde opdracht twee keer telt één keer');
  await vraag('POST', { opdracht: { id: 'def456', t: 'timer', sec: 600, extra: 'weg' } });
  await vraag('POST', { opdracht: { id: 'ghi789', t: 'ga', i: 4 } });
  let o = (await j(await vraag('GET', undefined, '?na=' + na0))).opdrachten;
  assert.deepStrictEqual(o.map(x => x.t), ['volgende', 'timer', 'ga']);
  assert.deepStrictEqual(o[1], { nr: o[1].nr, id: 'def456', t: 'timer', sec: 600 }, 'alleen de bekende velden');
  assert.strictEqual(o[2].i, 4);
  o = (await j(await vraag('GET', undefined, '?na=' + o[2].nr))).opdrachten; assert.strictEqual(o.length, 0, 'niets nieuws');
  assert.strictEqual((await j(await vraag('GET'))).opdrachten, undefined, 'de regie krijgt geen opdrachten terug');
  for (const fout of [{ id: 'x', t: 'volgende' }, { id: 'goedid1', t: 'wis' }, { id: 'goedid2', t: 'timer', sec: 99999 }, { id: 'goedid3', t: 'ga' }, { id: 'goedid4', t: 'timer' }])
    assert.strictEqual((await vraag('POST', { opdracht: fout })).status, 400, 'opdracht geweigerd: ' + JSON.stringify(fout));
  // oude opdrachten (ouder dan een minuut) voert het bord niet meer uit
  env.DB._db.prepare('UPDATE regie_opdracht SET ms = ms - 120000').run();
  assert.strictEqual((await j(await vraag('GET', undefined, '?na=0'))).opdrachten.length, 0, 'oude opdrachten tellen niet');
  await vraag('POST', { opdracht: { id: 'nieuw01', t: 'vorige' } });
  assert.strictEqual(env.DB._db.prepare('SELECT COUNT(*) n FROM regie_opdracht').get().n, 1, 'oude opdrachten worden opgeruimd');
  // bord dicht
  await vraag('PUT', { staat: null }); assert.strictEqual((await j(await vraag('GET'))).staat, null);
  assert.strictEqual((await vraag('DELETE')).status, 405);
  console.log('api regie: goed');
})().catch(e => { console.error(e); process.exit(1); });
