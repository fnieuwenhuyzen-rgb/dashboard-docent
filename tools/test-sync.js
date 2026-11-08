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
// Het ene pad (samenvoegen, kapotte vormen) hoeft geen server; de rest hieronder wel.
const fs = require('fs'), path = require('path');
const wortel = path.join(__dirname, '..');
const appBron = fs.readFileSync(path.join(wortel, 'public/app.js'), 'utf8');
// staatFouten en nieuweStaat uit app.js zelf, zodat de test de echte controle gebruikt
const { staatFouten } = new Function(appBron.slice(appBron.indexOf('const ROLLEN_START'), appBron.indexOf('function staatRepareer')) + '\nreturn { staatFouten, nieuweStaat };')();
const goedeStaat = () => ({ v: 1, rooster: [{ id: 'u1', groep: 'h4', start: '2026-11-09T09:00', eind: '2026-11-09T09:50' }], taken: [taak(1)], beoord: { lijsten: {}, toetsen: {} } });

// kapotte kopie netjes geweigerd (bevinding 31, 32)
assert.deepStrictEqual(staatFouten(goedeStaat()), [], 'goede staat is goed');
assert.ok(staatFouten({ ...goedeStaat(), rooster: 'kapot' }).includes('rooster'), 'rooster als tekst');
assert.ok(staatFouten({ ...goedeStaat(), taken: { a: 1 } }).includes('taken'), 'taken als object');
assert.ok(staatFouten({ ...goedeStaat(), beoord: { lijsten: [], toetsen: {} } }).includes('beoordelen'), 'lijsten als lijst');
assert.ok(staatFouten({ ...goedeStaat(), rooster: [{ groep: 'h4' }] }).includes('lessen in het rooster'), 'les zonder tijden');
assert.ok(staatFouten({ taken: [] }).length && staatFouten('tekst').length && staatFouten(null).length && staatFouten([]).length, 'geen Lesdag-kopie');
console.log('kapotte kopie geweigerd: goed');

(async () => {
  const url = process.argv[2]; if (!url) return;
  const { DatabaseSync } = require('node:sqlite');
  const dbMap = path.join(wortel, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  const dbBestand = fs.readdirSync(dbMap).find(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
  const sql = fn => { const d = new DatabaseSync(path.join(dbMap, dbBestand)); try { return fn(d); } finally { d.close(); } };
  const reset = () => sql(d => { d.exec("DELETE FROM onderdeel; DELETE FROM back_up; UPDATE meta SET versie = 0, bijgewerkt = 0, schrijver = NULL WHERE id = 1;"); });
  const serverRijen = () => sql(d => d.prepare('SELECT sleutel, waarde FROM onderdeel').all());
  const stuk = () => sql(d => d.prepare('SELECT COUNT(*) n FROM onderdeel').get().n);
  const echt = (u, i) => fetch(u, i);

  function apparaat(staat, opt = {}) {
    const o = { staat, kv: {}, aanV: false, updated: Date.now(), mag: true, vragen: 0, hook: null, ...opt };
    o.sync = SYNC.maak({ url,
      fetch: (u, i) => { o.vragen++; return o.hook ? o.hook(u, i, echt, o) : echt(u, i); },
      vlag: { aan: () => o.aanV, zet: () => { o.aanV = true; } },
      opslag: { haal: async k => o.kv[k] && JSON.parse(o.kv[k]), zet: async (k, v) => { o.kv[k] = JSON.stringify(v); } },
      app: { haal: () => o.staat, zet: x => { o.staat = x; }, mag: () => o.mag, status: (s, t) => { o.st = s; o.tekst = t; }, nieuwer: ms => o.updated > ms, kopie: async () => { o.kopie = true; }, fouten: staatFouten } });
    return o;
  }
  const leegDoc = () => ({ v: 1, magVanaf: '2026-11-03', taken: [], beoord: { lijsten: {}, toetsen: {} } });
  const ll = (n, k = 'Testleerling') => Array.from({ length: n }, (_, i) => ({ id: 'l' + i, naam: `${k} ${i}` }));
  const toets = (n, score) => ({ ll: Object.fromEntries(Array.from({ length: n }, (_, i) => ['l' + i, { s: { c1: score, c2: score, c3: score }, opm: 'verzonnen opmerking' }])), volgorde: [], start: '2026-11-03' });
  const basisStaat = () => ({ ...goedeStaat(), beoord: { lijsten: { g1: ll(5), g2: ll(5, 'Proefpersoon') }, toetsen: { 'm1|g1': toets(5, 7), 'm1|g2': toets(5, 6) } } });
  const snap = x => JSON.parse(JSON.stringify(x));
  // twee apparaten die elkaar kennen
  async function paar() {
    reset(); const a = apparaat(basisStaat()), b = apparaat(leegDoc()); a.updated = Date.now() - 1e4;
    await a.sync.aanzetten(); await b.sync.start(); assert.ok(b.aanV && gelijk(a.staat, b.staat), 'paar start gelijk'); return [a, b];
  }

  const uitslag = [];
  async function scenario(naam, fn) {
    try { await fn(); uitslag.push(['goed', naam]); console.log('goed   ' + naam); }
    catch (e) { uitslag.push(['FOUT', naam, e]); console.log('FOUT   ' + naam + '\n       ' + String(e.message || e).split('\n').slice(0, 4).join('\n       ')); }
  }

  await scenario('0 basis: aanzetten, overnemen, offline wijzigen, tegelijk schrijven, tablet, back-up eerste', async () => {
    reset();
    const lap = apparaat({ v: 1, taken: [taak(1), taak(2)], beoord: { lijsten: { g: [{ id: 'l1', naam: 'Testleerling, Anna' }] }, toetsen: { 'm|g': { ll: { l1: { s: { c: 8 } } } } } }, _zermeloApi: 'testtoken' });
    const tel = apparaat(leegDoc());
    await tel.sync.start(); assert.ok(!tel.aanV, 'leeg apparaat en lege server: niets');
    const t = await lap.sync.aanzetten(); assert.ok(lap.aanV && lap.kopie, 'kopie gemaakt'); assert.strictEqual(t.samen.taken, 2);
    await tel.sync.start(); assert.ok(tel.aanV, 'telefoon neemt vanzelf over'); assert.strictEqual(tel.staat.taken.length, 2); assert.strictEqual(tel.staat._zermeloApi, 'testtoken'); assert.ok(!tel.kopie);
    assert.strictEqual(tel.staat.beoord.toetsen['m|g'].ll.l1.s.c, 8);
    lap.staat.taken[0].af = true; lap.staat.taken.push(taak(3));
    tel.staat.taken = tel.staat.taken.filter(k => k.id !== 2); tel.staat.taken.push(taak(4)); tel.staat.beoord.toetsen['m|g'].ll.l1.s.d = 7;
    await lap.sync.nu(); await tel.sync.nu(); await lap.sync.nu();
    assert.ok(gelijk(lap.staat, tel.staat), 'beide gelijk'); assert.deepStrictEqual(lap.staat.taken.map(k => k.id).sort(), [1, 3, 4]); assert.strictEqual(lap.staat.taken[0].af, true); assert.strictEqual(lap.staat.beoord.toetsen['m|g'].ll.l1.s.d, 7);
    lap.staat.taken.push(taak(5)); tel.staat.taken.push(taak(6));
    await Promise.all([lap.sync.nu(), tel.sync.nu()]); await lap.sync.nu(); await tel.sync.nu();
    assert.ok(gelijk(lap.staat, tel.staat), 'na tegelijk schrijven gelijk'); assert.deepStrictEqual(lap.staat.taken.map(k => k.id).sort(), [1, 3, 4, 5, 6]);
    const tab = apparaat({ v: 1, taken: [taak(1), taak(9)], beoord: { lijsten: {}, toetsen: {} } }); tab.updated = Date.now() + 1000;
    await tab.sync.start(); assert.ok(!tab.aanV, 'tablet met gegevens wacht op de knop');
    await tab.sync.aanzetten(); assert.strictEqual(tab.staat.taken.find(k => k.id === 1).af, true); assert.ok(tab.staat.taken.some(k => k.id === 9)); assert.ok(tab.kopie);
    await lap.sync.nu(); assert.ok(lap.staat.taken.some(k => k.id === 9), 'laptop ziet taak van tablet');
    const dagen = await lap.sync.backups(); assert.ok(dagen.includes('eerste'), 'back-up eerste upload'); assert.strictEqual((await lap.sync.backup('eerste')).taken.length, 2);
  });

  await scenario('1a twee apparaten tegelijk: verschillende scores en klassenlijsten blijven allemaal', async () => {
    const [a, b] = await paar();
    a.staat.beoord.toetsen['m1|g1'].ll.l0.s.c1 = 9; a.staat.beoord.lijsten.g1.push({ id: 'nieuwA', naam: 'Nieuw A' });
    b.staat.beoord.toetsen['m1|g1'].ll.l1.s.c2 = 4; b.staat.beoord.toetsen['m1|g2'].ll.l4.s.c3 = 10; b.staat.beoord.lijsten.g2.push({ id: 'nieuwB', naam: 'Nieuw B' });
    await Promise.all([a.sync.nu(), b.sync.nu()]); await a.sync.nu(); await b.sync.nu();
    assert.ok(gelijk(a.staat, b.staat), 'gelijk');
    const T = a.staat.beoord.toetsen; assert.strictEqual(T['m1|g1'].ll.l0.s.c1, 9); assert.strictEqual(T['m1|g1'].ll.l1.s.c2, 4); assert.strictEqual(T['m1|g2'].ll.l4.s.c3, 10);
    assert.ok(a.staat.beoord.lijsten.g1.some(x => x.id === 'nieuwA') && a.staat.beoord.lijsten.g2.some(x => x.id === 'nieuwB'));
  });
  await scenario('1b twee apparaten wijzigen dezelfde score: de ene wint, maar het wordt gemeld en bewaard', async () => {
    const [a, b] = await paar();
    a.staat.beoord.toetsen['m1|g1'].ll.l2.s.c1 = 3; b.staat.beoord.toetsen['m1|g1'].ll.l2.s.c1 = 8; b.updated = Date.now() + 5000;
    await a.sync.nu(); await b.sync.nu(); await a.sync.nu();
    assert.ok(gelijk(a.staat, b.staat), 'gelijk'); const w = a.staat.beoord.toetsen['m1|g1'].ll.l2.s.c1; assert.ok(w === 3 || w === 8);
    const bots = (await b.sync.botsingen()).concat(await a.sync.botsingen());
    assert.ok(bots.some(x => /l2/.test(x.pad) && [x.lokaal, x.server].includes(3) && [x.lokaal, x.server].includes(8)), 'botsing bewaard met beide waarden');
    assert.ok(/twee apparaten|botsing/i.test(b.tekst + a.tekst) || bots.length, 'gemeld');
  });
  await scenario('1c twee apparaten: de een verwijdert een klassenlijst, de ander voegt een score toe', async () => {
    const [a, b] = await paar();
    delete a.staat.beoord.lijsten.g2; delete a.staat.beoord.toetsen['m1|g2'];
    b.staat.beoord.toetsen['m1|g2'].ll.l0.s.c1 = 10;
    await a.sync.nu(); await b.sync.nu(); await a.sync.nu();
    assert.ok(gelijk(a.staat, b.staat)); assert.strictEqual(a.staat.beoord.toetsen['m1|g2'].ll.l0.s.c1, 10, 'de nieuwe score is niet weggegooid');
  });

  await scenario('2 apparaat dagenlang offline: server liep vijf versies door, beide kanten behouden', async () => {
    const [a, b] = await paar();
    for (let dag = 1; dag <= 5; dag++) { a.staat.taken.push(taak(100 + dag)); a.staat.beoord.toetsen['m1|g1'].ll['l' + (dag % 5)].s['dag' + dag] = dag; await a.sync.nu(); }
    delete a.staat.beoord.lijsten.g2; await a.sync.nu();
    b.staat.taken.push(taak(200)); b.staat.beoord.toetsen['m1|g1'].ll.l4.s.eigen = 7; b.staat.beoord.lijsten.g1.push({ id: 'laat', naam: 'Laat Toegevoegd' });
    await b.sync.nu(); await a.sync.nu();
    assert.ok(gelijk(a.staat, b.staat), 'gelijk'); for (let d = 1; d <= 5; d++) assert.ok(b.staat.taken.some(k => k.id === 100 + d) && b.staat.beoord.toetsen['m1|g1'].ll['l' + (d % 5)].s['dag' + d] === d, 'dag ' + d);
    assert.ok(a.staat.taken.some(k => k.id === 200) && a.staat.beoord.toetsen['m1|g1'].ll.l4.s.eigen === 7 && a.staat.beoord.lijsten.g1.some(x => x.id === 'laat'), 'offline wijzigingen op de server');
    assert.ok(!b.staat.beoord.lijsten.g2, 'verwijderde lijst blijft weg');
  });
  await scenario('2b offline apparaat zonder wijzigingen neemt alles over, verliest niets', async () => {
    const [a, b] = await paar(); a.staat.beoord.toetsen['m1|g1'].ll.l0.s.c1 = 1; a.staat.taken.push(taak(77)); await a.sync.nu(); await b.sync.nu();
    assert.ok(gelijk(a.staat, b.staat) && b.staat.taken.some(k => k.id === 77));
  });

  await scenario('3a leeg apparaat (geen vlag, lege staat) neemt de server over, met scores en zonder kopie', async () => {
    reset(); const a = apparaat(basisStaat()); await a.sync.aanzetten(); const n = apparaat({ v: 1 }); await n.sync.start();
    assert.ok(n.aanV && !n.kopie && gelijk(delen(n.staat), delen(a.staat))); assert.strictEqual(Object.keys(n.staat.beoord.toetsen).length, 2);
  });
  await scenario('3b apparaat dat zijn lokale staat kwijt is (vlag en basis staan nog) wist de server niet', async () => {
    const [a, b] = await paar(); a.staat = leegDoc(); // bijvoorbeeld "leeg beginnen" in het herstelscherm
    await a.sync.nu();
    assert.ok(stuk() > 0, 'server niet leeggehaald'); await b.sync.nu(); assert.strictEqual(Object.keys(b.staat.beoord.toetsen).length, 2, 'andere apparaat houdt zijn scores');
    assert.strictEqual(Object.keys(a.staat.beoord.toetsen).length, 2, 'het lege apparaat krijgt alles terug');
  });

  await scenario('4a half gelukte upload: server kreeg het, antwoord ging verloren; geen dubbel, niets kwijt', async () => {
    const [a, b] = await paar(); a.staat.taken.push(taak(50)); a.staat.beoord.toetsen['m1|g1'].ll.l0.s.c1 = 2;
    let eenmaal = true; a.hook = async (u, i, e) => { if (i && i.method === 'PUT' && eenmaal) { eenmaal = false; await e(u, i); throw new TypeError('offline'); } return e(u, i); };
    await a.sync.nu(); assert.ok(/ffline/.test(a.tekst), 'meldt offline'); assert.ok(a.staat.taken.some(k => k.id === 50), 'lokaal intact');
    await a.sync.nu(); await b.sync.nu();
    assert.ok(gelijk(a.staat, b.staat)); assert.strictEqual(a.staat.taken.filter(k => k.id === 50).length, 1); assert.strictEqual(b.staat.beoord.toetsen['m1|g1'].ll.l0.s.c1, 2);
  });
  await scenario('4b upload mislukt vóór de server (offline of 500): lokaal blijft staan en gaat de volgende keer mee', async () => {
    const [a, b] = await paar(); a.staat.taken.push(taak(51));
    a.hook = async (u, i, e) => { if (i && i.method === 'PUT') return new Response('{"fout":"x"}', { status: 500 }); return e(u, i); };
    await a.sync.nu(); assert.ok(a.staat.taken.some(k => k.id === 51)); a.hook = null; await a.sync.nu(); await b.sync.nu(); assert.ok(b.staat.taken.some(k => k.id === 51));
  });
  await scenario('4c aanzetten half gelukt (antwoord verloren bij het terugvragen): lokale gegevens intact, opnieuw proberen werkt', async () => {
    reset(); const a = apparaat(basisStaat()); let geput = false;
    a.hook = async (u, i, e) => { const r = await e(u, i); if (i && i.method === 'PUT') geput = true; else if (geput) throw new TypeError('offline'); return r; };
    await assert.rejects(a.sync.aanzetten()); assert.ok(!a.aanV, 'vlag niet gezet'); assert.strictEqual(Object.keys(a.staat.beoord.toetsen).length, 2, 'lokaal intact');
    a.hook = null; const t = await a.sync.aanzetten(); assert.ok(a.aanV && t.samen.klassen === 2); const n = apparaat({ v: 1 }); await n.sync.start(); assert.strictEqual(n.staat.beoord.lijsten.g1.length, 5);
  });
  await scenario('4d een rij te groot: 413, lokaal blijft, melding "te groot"', async () => {
    const [a] = await paar(); a.staat.beoord.toetsen['m1|g1'].ll.l0.krab = 'x'.repeat(2e6); await a.sync.nu();
    assert.ok(/groot/.test(a.tekst), a.tekst); assert.strictEqual(a.staat.beoord.toetsen['m1|g1'].ll.l0.krab.length, 2e6);
  });

  await scenario('5a kapotte JSON in een rij op de server: niets overgenomen of verwijderd, duidelijke melding', async () => {
    const [a] = await paar(); sql(d => d.exec("UPDATE onderdeel SET waarde = '{kapot' WHERE sleutel = 'taken'"));
    a.staat.beoord.toetsen['m1|g1'].ll.l0.s.c1 = 1; const lok = snap(a.staat);
    await a.sync.nu(); assert.deepStrictEqual(a.staat, lok, 'lokaal ongewijzigd'); assert.ok(/besch|kapot/i.test(a.tekst), 'melding: ' + a.tekst);
    assert.ok(serverRijen().find(r => r.sleutel === 'taken').waarde === '{kapot', 'server niet overschreven');
  });
  await scenario('5b server heeft een rij met de verkeerde vorm (rooster:"kapot"): niet overgenomen', async () => {
    const [, b] = await paar(); sql(d => d.exec(`INSERT INTO onderdeel (sleutel, waarde) VALUES ('rooster', '"kapot"') ON CONFLICT (sleutel) DO UPDATE SET waarde = excluded.waarde; UPDATE meta SET versie = versie + 1`));
    const lok = snap(b.staat); await b.sync.nu();
    assert.deepStrictEqual(b.staat, lok, 'staat op het apparaat ongewijzigd'); assert.ok(staatFouten(b.staat).length === 0); assert.ok(/besch|kapot/i.test(b.tekst), b.tekst);
  });
  await scenario('5c server leeg gemaakt (database nieuw): apparaten wissen niet, maar zetten hun staat terug', async () => {
    const [a, b] = await paar(); reset(); await a.sync.nu();
    assert.strictEqual(Object.keys(a.staat.beoord.toetsen).length, 2, 'lokaal behouden'); assert.ok(stuk() > 0, 'server weer gevuld');
    await b.sync.nu(); assert.ok(gelijk(delen(a.staat), delen(b.staat)) && Object.keys(b.staat.beoord.toetsen).length === 2);
  });
  await scenario('5d server teruggezet naar een oudere versie: nieuwere lokale scores blijven', async () => {
    const [a, b] = await paar(); a.staat.beoord.toetsen['m1|g1'].ll.l0.s.c1 = 5; a.staat.taken.push(taak(60)); await a.sync.nu();
    const oud = sql(d => d.prepare('SELECT sleutel, waarde FROM back_up WHERE dag = ?').all('eerste')); // stand van de eerste upload
    sql(d => { d.exec('DELETE FROM onderdeel'); const p = d.prepare('INSERT INTO onderdeel (sleutel, waarde) VALUES (?, ?)'); for (const r of oud) p.run(r.sleutel, r.waarde); d.exec('UPDATE meta SET versie = 1'); });
    await a.sync.nu(); assert.strictEqual(a.staat.beoord.toetsen['m1|g1'].ll.l0.s.c1, 5, 'score blijft'); assert.ok(a.staat.taken.some(k => k.id === 60), 'taak blijft');
    await b.sync.nu(); assert.strictEqual(b.staat.beoord.toetsen['m1|g1'].ll.l0.s.c1, 5);
  });
  await scenario('5e oude staat op de server (rijen ontbreken): apparaat vult aan, verliest niets', async () => {
    reset(); sql(d => d.exec(`INSERT INTO onderdeel (sleutel, waarde) VALUES ('v','1'), ('taken','[{"id":99,"titel":"oud","af":false}]'); UPDATE meta SET versie = 3, bijgewerkt = 1`));
    const a = apparaat(basisStaat()); await a.sync.aanzetten(); assert.ok(a.staat.taken.some(k => k.id === 99) && a.staat.taken.some(k => k.id === 1) && Object.keys(a.staat.beoord.toetsen).length === 2); assert.deepStrictEqual(staatFouten(a.staat), []);
  });

  await scenario('6a syncMag: tijdens lesmodus of typen gaat er niets over de lijn, daarna wel', async () => {
    const [a, b] = await paar(); a.mag = false; a.staat.beoord.toetsen['m1|g1'].ll.l0.s.c1 = 2; const n = a.vragen; await a.sync.nu();
    assert.strictEqual(a.vragen, n, 'geen verzoek zolang mag() onwaar is'); a.mag = true; await a.sync.nu(); await b.sync.nu(); assert.strictEqual(b.staat.beoord.toetsen['m1|g1'].ll.l0.s.c1, 2);
  });
  await scenario('6b wijziging op dit apparaat tijdens een synchronisatieronde (typen) blijft behouden', async () => {
    const [a, b] = await paar(); b.staat.taken.push(taak(70)); await b.sync.nu();
    let gedaan = false; a.hook = async (u, i, e) => { const r = await e(u, i); if (!gedaan && !/sinds/.test(u) && !(i && i.method)) { gedaan = true; a.staat.beoord.toetsen['m1|g1'].ll.l3.s.getypt = 6; a.staat.taken.push(taak(71)); } return r; };
    await a.sync.nu(); assert.ok(a.staat.taken.some(k => k.id === 70), 'server-wijziging binnen'); assert.strictEqual(a.staat.beoord.toetsen['m1|g1'].ll.l3.s.getypt, 6, 'getypte score behouden'); assert.ok(a.staat.taken.some(k => k.id === 71));
    a.hook = null; await a.sync.nu(); await b.sync.nu(); assert.ok(b.staat.taken.some(k => k.id === 71) && b.staat.beoord.toetsen['m1|g1'].ll.l3.s.getypt === 6, 'en komt op de server');
  });

  await scenario('7a dertig back-ups terugzetten, elk met eigen inhoud', async () => {
    const [a, b] = await paar(); const dag = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
    sql(d => { const p = d.prepare('INSERT OR REPLACE INTO back_up (dag, sleutel, waarde) VALUES (?, ?, ?)'); for (let n = 1; n <= 30; n++) { p.run(dag(n), 'v', '1'); p.run(dag(n), 'taken', JSON.stringify([taak(1000 + n)])); p.run(dag(n), 'beoord.lijsten', JSON.stringify({ g1: ll(n % 7 + 1) })); p.run(dag(n), 'beoord.toetsen.m1|g1', JSON.stringify(toets(n % 7 + 1, n % 10))); } });
    const dagen = await a.sync.backups(); for (let n = 1; n <= 30; n++) assert.ok(dagen.includes(dag(n)), 'dag ' + n + ' in lijst'); assert.ok(dagen.includes('eerste'));
    for (let n = 1; n <= 30; n++) { const d = await a.sync.backup(dag(n)); assert.deepStrictEqual(staatFouten(d), [], 'vorm dag ' + n); assert.strictEqual(d.taken[0].id, 1000 + n); assert.strictEqual(d.beoord.lijsten.g1.length, n % 7 + 1); assert.strictEqual(d.beoord.toetsen['m1|g1'].ll.l0.s.c1, n % 10); }
    // zoals de app: lokaal terugzetten en laten synchroniseren; het andere apparaat volgt
    a.staat = await a.sync.backup(dag(12)); a.updated = Date.now(); await a.sync.nu(); await b.sync.nu();
    assert.ok(gelijk(a.staat, b.staat) && b.staat.taken.length === 1 && b.staat.taken[0].id === 1012, 'terugzetten bereikt het andere apparaat');
  });
  await scenario('7b back-up zonder inhoud of met onbekende dag wordt geweigerd, niet als lege staat teruggezet', async () => {
    const [a] = await paar(); await assert.rejects(a.sync.backup('2000-01-01'));
  });
  await scenario('7c per dag één back-up van de stand van vóór de eerste wijziging; ouder dan 30 dagen weg, "eerste" blijft', async () => {
    const [a] = await paar(); const oud = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10);
    sql(d => d.exec(`INSERT OR REPLACE INTO back_up (dag, sleutel, waarde) VALUES ('${oud}', 'v', '1')`)); a.staat.taken.push(taak(80)); await a.sync.nu(); a.staat.taken.push(taak(81)); await a.sync.nu();
    const dagen = await a.sync.backups(); const vandaag = new Date().toISOString().slice(0, 10);
    assert.ok(!dagen.includes(oud), 'oude weg'); assert.ok(dagen.includes('eerste')); assert.ok(dagen.includes(vandaag));
    const stand = await a.sync.backup(vandaag); assert.ok(!stand.taken.some(k => k.id === 80), 'vandaag-backup is de stand van vóór de eerste wijziging van vandaag'); assert.ok(stand.beoord.toetsen['m1|g1']);
  });

  await scenario('8 grootte van een heel schooljaar aan scores blijft ruim onder de rijlimiet', async () => {
    reset(); const MAX = 1900000, klassen = Array.from({ length: 14 }, (_, i) => 'k' + i);
    const lijsten = Object.fromEntries(klassen.map(k => [k, ll(30)])); const toetsen = {};
    for (const k of klassen) for (let m = 0; m < 10; m++) toetsen[`model${m}|${k}`] = toets(30, 7); // 140 toetsen
    const st = { ...goedeStaat(), beoord: { lijsten, toetsen } }; const rijen = Object.entries(delen(st)).map(([k, v]) => [k, JSON.stringify(v).length]); const totaal = rijen.reduce((s, r) => s + r[1], 0);
    const groot = rijen.sort((x, y) => y[1] - x[1])[0];
    console.log(`       schooljaar: ${(totaal / 1e6).toFixed(2)} MB in ${rijen.length} rijen, grootste rij ${(groot[1] / 1e3).toFixed(0)} kB (${groot[0]}), limiet ${(MAX / 1e3).toFixed(0)} kB`);
    assert.ok(groot[1] < MAX * 0.5, 'grootste rij onder de helft van de limiet');
    const a = apparaat(st); a.updated = 1; await a.sync.aanzetten(); a.staat.beoord.toetsen['model3|k5'].ll.l7.s.c1 = 1; const t0 = Date.now(); await a.sync.nu(); assert.strictEqual(a.st, 'ok', a.tekst);
    const n = apparaat({ v: 1 }); await n.sync.start(); assert.strictEqual(Object.keys(n.staat.beoord.toetsen).length, 140); console.log(`       overnemen op een leeg apparaat: gelukt, ronde ${Date.now() - t0} ms`);
    let bytes = 0; a.hook = (u, i, e) => { if (i && i.body) bytes += i.body.length; return e(u, i); }; a.staat.beoord.toetsen['model1|k2'].ll.l1.s.c1 = 9; await a.sync.nu(); console.log(`       één score wijzigen stuurt ${bytes} bytes`); assert.ok(bytes < 20000);
  });

  const fout = uitslag.filter(r => r[0] === 'FOUT');
  console.log(`\n${uitslag.length - fout.length} van ${uitslag.length} scenario's goed` + (fout.length ? `; fout: ${fout.map(r => r[1].split(' ')[0]).join(', ')}` : ''));
  process.exit(fout.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
