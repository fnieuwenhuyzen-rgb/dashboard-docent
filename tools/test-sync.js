// Tests voor public/sync.js. Gebruik: node tools/test-sync.js                  (alleen samenvoegen)
//                                     node tools/test-sync.js http://localhost:8799/api/staat   (ook apparaten tegen een lokale server; lege testdatabase nodig)
const assert = require('assert');
const SYNC = require('../public/sync.js');
const { samenvoegen: m, delen, samen, verschil, leeg, gelijk } = SYNC;
const taak = (id, x = {}) => ({ id, titel: 't' + id, af: false, ...x });

// samenvoegen
assert.deepStrictEqual(m({ a: 1 }, { a: 2 }, { a: 1 }), { a: 2 }, 'alleen lokaal gewijzigd');
assert.deepStrictEqual(m({ a: 1 }, { a: 1 }, { a: 3 }), { a: 3 }, 'alleen server gewijzigd');
assert.deepStrictEqual(m({}, { a: 1 }, { b: 2 }), { a: 1, b: 2 }, 'beide iets nieuws');
assert.deepStrictEqual(m({ a: 1, b: 2 }, { b: 2 }, { a: 1, b: 2 }), { b: 2 }, 'lokaal verwijderd blijft weg');
assert.deepStrictEqual(m({ a: 1, b: 2 }, { b: 2 }, { a: 9, b: 2 }), { a: 9, b: 2 }, 'bewerking wint van verwijderen');
assert.strictEqual(m(1, 2, 3, { lokaalNieuwer: true }), 2); assert.strictEqual(m(1, 2, 3, { lokaalNieuwer: false }), 3);
const B = { taken: [taak(1), taak(2), taak(3)] };
const L = { taken: [taak(1, { af: true }), taak(3), taak(4)] }; // 1 af, 2 weg, 4 nieuw
const S = { taken: [taak(1, { titel: 'nieuw' }), taak(2), taak(3), taak(5)] }; // 1 hernoemd, 5 nieuw
assert.deepStrictEqual(m(B, L, S), { taken: [taak(1, { af: true, titel: 'nieuw' }), taak(3), taak(4), taak(5)] }, 'taken per id en per veld');
assert.deepStrictEqual(m({ d: ['a', 'b'] }, { d: ['a', 'b', 'c'] }, { d: ['b', 'x'] }).d, ['b', 'c', 'x'], 'lijst zonder ids');
assert.strictEqual(m({}, { taken: [taak(1, { af: true })] }, { taken: [taak(1)] }, { zonderBasis: true, lokaalNieuwer: false }).taken[0].af, true, 'zonder basis blijft afgevinkt');
assert.strictEqual(m({}, { taken: [taak(1)] }, { taken: [taak(1, { af: true })] }, { zonderBasis: true, lokaalNieuwer: true }).taken[0].af, true, 'zonder basis blijft afgevinkt, andersom');

// delen en samen
const doc = { taken: [taak(1)], beoord: { lijsten: { g: [{ id: 'l1', naam: 'Testleerling, Anna' }] }, toetsen: { 'm.1|g': { ll: {} }, 'm2|g': { ll: { l1: { s: { c: 8 } } } } }, weg: {} } };
const d = delen(doc); assert.ok(d['beoord.toetsen.m.1|g'] && d['beoord.lijsten'] && d.taken); assert.ok(gelijk(samen(d), doc));
assert.deepStrictEqual(Object.keys(verschil({ a: 1, c: 3 }, { a: 1, b: 2 })).sort(), ['b', 'c']); assert.strictEqual(verschil({ a: 1 }, { a: 1, b: 2 }).b, null);
assert.ok(leeg({ v: 1, magVanaf: '2026-11-03', taken: [], beoord: { lijsten: {}, toetsen: {} }, rust: {} })); assert.ok(!leeg({ taken: [taak(1)] })); assert.ok(!leeg({ beoord: { lijsten: { g: [{ id: 'l' }] } } }));
console.log('samenvoegen, delen: goed');

// apparaten tegen de echte API (wrangler pages dev)
(async () => {
  const url = process.argv[2]; if (!url) return;
  function apparaat(staat) {
    const o = { staat, kv: {}, aanV: false, updated: Date.now() };
    o.sync = SYNC.maak({ url, fetch: (u, i) => fetch(u, i),
      vlag: { aan: () => o.aanV, zet: () => { o.aanV = true; } },
      opslag: { haal: async k => o.kv[k] && JSON.parse(o.kv[k]), zet: async (k, v) => { o.kv[k] = JSON.stringify(v); } },
      app: { haal: () => o.staat, zet: x => { o.staat = x; }, mag: () => true, status: (s, t) => { o.st = s; o.tekst = t; }, nieuwer: ms => o.updated > ms, kopie: async () => { o.kopie = true; } } });
    return o;
  }
  const leegDoc = () => ({ v: 1, magVanaf: '2026-11-03', taken: [], beoord: { lijsten: {}, toetsen: {} } });
  const lap = apparaat({ v: 1, taken: [taak(1), taak(2)], beoord: { lijsten: { g: [{ id: 'l1', naam: 'Testleerling, Anna' }] }, toetsen: { 'm|g': { ll: { l1: { s: { c: 8 } } } } } }, _zermeloApi: 'testtoken' });
  const tel = apparaat(leegDoc());
  await tel.sync.start(); assert.ok(!tel.aanV, 'leeg apparaat en lege server: niets');
  const t = await lap.sync.aanzetten(); assert.ok(lap.aanV && lap.kopie, 'kopie gemaakt'); assert.strictEqual(t.samen.taken, 2);
  await tel.sync.start(); assert.ok(tel.aanV, 'telefoon neemt vanzelf over'); assert.strictEqual(tel.staat.taken.length, 2); assert.strictEqual(tel.staat._zermeloApi, 'testtoken'); assert.ok(!tel.kopie);
  assert.strictEqual(tel.staat.beoord.toetsen['m|g'].ll.l1.s.c, 8);
  // beide offline gewijzigd, daarna synchroniseren
  lap.staat.taken[0].af = true; lap.staat.taken.push(taak(3));
  tel.staat.taken = tel.staat.taken.filter(k => k.id !== 2); tel.staat.taken.push(taak(4)); tel.staat.beoord.toetsen['m|g'].ll.l1.s.d = 7;
  await lap.sync.nu(); await tel.sync.nu(); await lap.sync.nu();
  assert.ok(gelijk(lap.staat, tel.staat), 'beide gelijk'); assert.deepStrictEqual(lap.staat.taken.map(k => k.id).sort(), [1, 3, 4]); assert.strictEqual(lap.staat.taken[0].af, true); assert.strictEqual(lap.staat.beoord.toetsen['m|g'].ll.l1.s.d, 7);
  // tegelijk schrijven: de een krijgt 409 en voegt opnieuw samen
  lap.staat.taken.push(taak(5)); tel.staat.taken.push(taak(6));
  await Promise.all([lap.sync.nu(), tel.sync.nu()]); await lap.sync.nu(); await tel.sync.nu();
  assert.ok(gelijk(lap.staat, tel.staat), 'na tegelijk schrijven gelijk'); assert.deepStrictEqual(lap.staat.taken.map(k => k.id).sort(), [1, 3, 4, 5, 6]);
  // derde bron met eigen gegevens (tablet): samenvoegen op de knop, afgevinkt blijft afgevinkt
  const tab = apparaat({ v: 1, taken: [taak(1), taak(9)], beoord: { lijsten: {}, toetsen: {} } }); tab.updated = Date.now() + 1000;
  await tab.sync.start(); assert.ok(!tab.aanV, 'tablet met gegevens wacht op de knop');
  await tab.sync.aanzetten(); assert.strictEqual(tab.staat.taken.find(k => k.id === 1).af, true); assert.ok(tab.staat.taken.some(k => k.id === 9)); assert.ok(tab.kopie);
  await lap.sync.nu(); assert.ok(lap.staat.taken.some(k => k.id === 9), 'laptop ziet taak van tablet');
  // back-ups
  const dagen = await lap.sync.backups(); assert.ok(dagen.includes('eerste'), 'back-up eerste upload'); assert.strictEqual((await lap.sync.backup('eerste')).taken.length, 2);
  console.log('apparaten tegen de API: goed');
})().catch(e => { console.error(e); process.exit(1); });
