// node tools/test-staten.js [--zonder-browser] [--snel] : gegevensversies. Elke staat die binnenkomt gaat door STAAT.migreer (public/staat.js).
// Deel 1 (Node): staten uit elk tijdperk van app.js (tools/staten/oud-*.json, gemaakt met maak.js uit de git-geschiedenis), onvolledige en vervuilde staten.
// Deel 2 (browser): dezelfde staten in de echte app, alle schermen: geen "Dit scherm lukt nu niet", geen uitzondering.
const fs = require('fs'), path = require('path'), vm = require('vm');
const pub = path.join(__dirname, '..', 'public'); const STAAT = require(path.join(pub, 'staat.js'));
const ZB = process.argv.includes('--zonder-browser'); let fouten = 0, n = 0;
const slecht = t => { console.log('  FOUT ' + t); fouten++; };
const ok = (c, t) => { n++; if (!c) slecht(t); };
const kloon = x => JSON.parse(JSON.stringify(x));
const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);

// nieuweStaat() uit de echte app.js halen, zodat deze test altijd de actuele standaardwaarden gebruikt
const src = fs.readFileSync(path.join(pub, 'app.js'), 'utf8').split('\n');
const a = src.findIndex(l => /^const ROLLEN_START/.test(l)), b = src.findIndex(l => /^const POTJES_START/.test(l));
const i = src.findIndex(l => /^function nieuweStaat\(\)/.test(l)); let j = i; while (!/\}; \}\s*$/.test(src[j])) j++;
const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b + 1).join('\n') + '\n' + src.slice(i, j + 1).join('\n'), ctx);
const leeg = () => kloon(ctx.nieuweStaat());

const dir = path.join(__dirname, 'staten');
const OUD = fs.readdirSync(dir).filter(f => /^oud-.*\.json$/.test(f)).sort().map(f => [f.replace('.json', ''), JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))]);
ok(OUD.length >= 12, 'minder dan 12 historische staten in tools/staten (' + OUD.length + ')');
const HUIDIG = Object.assign(leeg(), kloon(OUD[OUD.length - 1][1]));

// vorm die elke migratie moet opleveren: alle velden van de lege staat, zelfde soort container
function vormOk(s, naam) {
  const l = leeg();
  for (const [k, w] of Object.entries(l)) {
    const x = s[k]; const goed = Array.isArray(w) ? Array.isArray(x) && x.every(isObj) : isObj(w) ? isObj(x) : typeof x === typeof w;
    if (!goed) { slecht(naam + ': veld ' + k + ' heeft de verkeerde vorm: ' + JSON.stringify(x).slice(0, 60)); return false; }
  }
  return true;
}
function controleer(naam, invoer) {
  const kopie = JSON.stringify(invoer); let r;
  try { r = STAAT.migreer(invoer, leeg()); } catch (e) { slecht(naam + ': migreer gooide ' + e.message); return null; }
  ok(JSON.stringify(invoer) === kopie, naam + ': invoer is aangepast');
  ok(r.staat.schema === STAAT.SCHEMA || r.nieuwer, naam + ': schema niet gezet');
  vormOk(r.staat, naam);
  const r2 = STAAT.migreer(r.staat, leeg()); ok(JSON.stringify(r2.staat) === JSON.stringify(r.staat) && r2.gerepareerd === 0 && !r2.stappen.length, naam + ': migreren is niet idempotent');
  return r;
}

// 1. elk tijdperk
console.log('Deel 1: ' + OUD.length + ' tijdperken, onvolledig en vervuild');
for (const [naam, s] of OUD) { const r = controleer(naam, s); if (r) { ok(r.van === 0 && r.stappen.length === STAAT.STAPPEN.length, naam + ': geen oude vorm herkend'); ok(r.staat.rooster.length === 2 && r.staat.voortgang.tv4, naam + ': gegevens kwijt'); } }
{ const r = STAAT.migreer(OUD[OUD.length - 1][1], leeg()).staat; ok(r.beoord.lijsten.tb1[0].naam === 'Testleerling, Anna', 'klassenlijst verloren'); ok(r.taken.length === 2 && r.taken[1].id, 'taak zonder id kreeg er geen'); ok(r.sectieNotitie.s1 === 'verzonnen notitie', 'notitie verloren'); }
// 2. onvolledig: elk veld weg, elk veld null, rommel in plaats van een staat
for (const k of Object.keys(HUIDIG)) { const s = kloon(HUIDIG); delete s[k]; controleer('zonder ' + k, s); const t = kloon(HUIDIG); t[k] = null; if (k !== 'updated' && k !== 'v' && k !== 'schema' && k !== 'magVanaf') controleer('null in ' + k, t); }
for (const w of [null, undefined, 5, 'x', [], true, '{kapot', '{"v":1}', {}, { v: 1 }, { schema: 'x', v: 1 }, { schema: -3, v: 1 }]) { const r = STAAT.migreer(w, leeg()); ok(r.staat && vormOk(r.staat, 'rommel ' + JSON.stringify(w)), 'rommel ' + JSON.stringify(w) + ' gaf geen staat'); }
// 3. vervuild: in elk onderdeel de eerste waarde binnenin kapot maken
const KAPOT = [null, 'tekst', 7, [], true]; let vervuild = 0;
for (const k of Object.keys(HUIDIG)) {
  const w = HUIDIG[k]; if (!w || typeof w !== 'object') continue;
  const sleutels = Array.isArray(w) ? w.map((_, q) => q) : Object.keys(w); if (!sleutels.length) continue;
  for (const kap of KAPOT) { const s = kloon(HUIDIG); s[k][sleutels[0]] = kap; vervuild++; controleer(`${k}[${sleutels[0]}] = ${JSON.stringify(kap)}`, s); }
}
console.log('  ' + vervuild + ' vervuilde varianten');
// 4. versies: nieuwere staat blijft, onbekende velden blijven, ketenvolgorde, een kapotte stap stopt de keten niet
{ const s = kloon(HUIDIG); s.schema = STAAT.SCHEMA + 5; s.toekomst = { x: 1 }; const r = STAAT.migreer(s, leeg()); ok(r.nieuwer && r.staat.schema === STAAT.SCHEMA + 5 && r.staat.toekomst.x === 1 && !r.stappen.length, 'nieuwere staat is aangepast'); }
{ const s = kloon(HUIDIG); s.onbekend = [1, 2]; ok(STAAT.migreer(s, leeg()).staat.onbekend.length === 2, 'onbekend veld verdwenen'); }
{ const echt = STAAT.STAPPEN.slice(); const volg = []; const was = STAAT.SCHEMA; const s = kloon(HUIDIG); s.schema = was;
  STAAT.STAPPEN.push({ naar: was + 1, naam: 'test A', doe: d => { volg.push('A'); d.proef = 1; return d; } }, { naar: was + 2, naam: 'test B', doe: d => { volg.push('B'); d.proef++; return d; } }, { naar: was + 3, naam: 'kapotte stap', doe: () => { throw new Error('x'); } });
  const r = STAAT.migreer(s, leeg()); ok(volg.join('') === 'AB' && r.staat.proef === 2 && r.stappen.length === 2, 'stappen niet in volgorde of een kapotte stap stopt de keten: ' + volg + ' ' + r.stappen);
  STAAT.STAPPEN.length = 0; echt.forEach(x => STAAT.STAPPEN.push(x)); }
// 4b. stap 2 (9-11-2026): vwo 5, P9 naar lesweek 12 en de lessen van week 12-15 schuiven op, in een keer vanaf de oude indeling.
//     Alles wat aan een les-id hangt gaat mee (voortgang, ankers, eigen lesbewerking, pres:-sleutels, afwijkingen); 13.2 en 15.2 zijn vervallen en vallen weg
{ const NAAR = { '8.1': '12.1', '8.3': '12.2', '12.1': '13.1', '12.2': '13.2', '13.1': '14.1', '14.1': '14.2', '14.2': '15.1', '15.1': '15.2' }; const VERVALLEN = ['13.2', '15.2'];
  const BLIJFT = ['8.2', '12.3', '13.3', '14.3', '15.3', '18.1'];
  const s = kloon(HUIDIG); s.schema = 1;
  const alle = Object.keys(NAAR).concat(VERVALLEN, BLIJFT);
  s.voortgang.v5 = {}; s.ankers.v5 = {}; s.les = { 'vwo4:8.1': { titel: 'blijft' }, 'vwo4:12.1': { titel: 'blijft ook' } }; s.later = {}; s.uitgesteld = {}; s.pres = {};
  for (const id of alle) { s.voortgang.v5['vwo5:' + id] = { st: 'gegeven', d: 'van ' + id }; s.ankers.v5['vwo5:' + id] = { s: '2026-11-23', uur: 'x', reden: 'van ' + id }; s.les['vwo5:' + id] = { titel: 'van ' + id }; s.later['pres:vwo5:' + id] = 'van ' + id; s.later['s|pres:vwo5:' + id] = 'van ' + id; s.uitgesteld['vwo5:' + id] = 'van ' + id; }
  s.voortgang.v5['vwo5:12.3'].inToets = 'vwo5:8.1'; s.voortgang.v5['vwo5:8.2'].inToets = 'vwo5:13.2'; s.voortgang.v5['vwo5:13.3'].inToets = 'vwo5:12.2';
  s.afwijkingen = [{ g: 'v5', lesIds: ['vwo5:8.1', 'vwo5:8.3', 'vwo5:13.2', 'vwo5:12.1', 'vwo5:14.1', 'vwo4:12.1'], wat: 'P9 verplaatst' }, { g: 'v5', lesId: 'vwo5:13.1', wat: 'een' }, { g: 'v5', lesId: 'vwo5:15.2', wat: 'twee' }];
  const r = STAAT.migreer(s, leeg()); const x = r.staat; const v = x.voortgang.v5;
  ok(r.stappen.length === 2 && x.schema === STAAT.SCHEMA, 'stap 2 en 3 niet uitgevoerd');
  for (const [oud, nieuw] of Object.entries(NAAR)) {
    const n = 'vwo5:' + nieuw, tag = 'van ' + oud;
    ok(v[n] && v[n].d === tag && x.ankers.v5[n] && x.ankers.v5[n].reden === tag && x.les[n] && x.les[n].titel === tag && x.later['pres:' + n] === tag && x.later['s|pres:' + n] === tag && x.uitgesteld[n] === tag, 'gegevens van ' + oud + ' niet op ' + nieuw + ' terechtgekomen');
  }
  for (const id of VERVALLEN) { const n = 'vwo5:' + id; ok(!JSON.stringify(x).includes('van ' + id), 'gegevens van vervallen les ' + id + ' zijn blijven staan (op een nieuwe les of ergens anders)'); ok(!(n in v) || v[n].d !== 'van ' + id, 'vervallen ' + id + ' op nieuwe les'); }
  for (const id of BLIJFT) { const n = 'vwo5:' + id; ok(v[n] && v[n].d === 'van ' + id && x.les[n].titel === 'van ' + id && x.ankers.v5[n].reden === 'van ' + id && x.later['pres:' + n] === 'van ' + id, 'les ' + id + ' hoort te blijven staan'); }
  ok(x.les['vwo4:8.1'].titel === 'blijft' && x.les['vwo4:12.1'].titel === 'blijft ook', 'vwo 4 geraakt');
  ok(Object.keys(v).length === 8 + 6 - 0 && Object.keys(x.ankers.v5).length === 14 && Object.keys(x.les).length === 16 && Object.keys(x.later).length === 28, 'aantal sleutels klopt niet (niets dubbel, vervallen weg)');
  ok(v['vwo5:12.3'].inToets === 'vwo5:12.1' && v['vwo5:13.3'].inToets === 'vwo5:13.2' && v['vwo5:8.2'].inToets === undefined, 'inToets niet goed omgezet: ' + JSON.stringify([v['vwo5:12.3'].inToets, v['vwo5:13.3'].inToets, v['vwo5:8.2'].inToets]));
  ok(x.afwijkingen[0].lesIds.join() === 'vwo5:12.1,vwo5:12.2,vwo5:13.1,vwo5:14.2,vwo4:12.1' && x.afwijkingen[0].wat === 'P9 verplaatst', 'lesIds van afwijking niet goed: ' + x.afwijkingen[0].lesIds);
  ok(x.afwijkingen[1].lesId === 'vwo5:14.1' && x.afwijkingen[2].lesId === 'vwo5:vervallen', 'lesId van afwijking niet goed: ' + x.afwijkingen[1].lesId + ' ' + x.afwijkingen[2].lesId);
  const r2 = STAAT.migreer(x, leeg()); ok(!r2.stappen.length && JSON.stringify(r2.staat.voortgang) === JSON.stringify(x.voortgang) && JSON.stringify(r2.staat.les) === JSON.stringify(x.les), 'stap 2 draait twee keer');
}
// 4c. stap 3 (9-11-2026): PT1 en PT2 van vwo 4 heten P1 en P2; sleutels en door de app gemaakte tekst gaan mee, eigen vrije tekst niet
{ const s = kloon(HUIDIG); s.schema = 2;
  s.uitgesteld = { 'tw:vwo4:PT1': '2026-11-20', 'tw:havo4:P1': '2026-11-21' };
  s.later = { 'tw:vwo4:PT2': 'ok' };
  s.afwijkingen = [{ g: 'tv4', soort: 'pta', wat: 'PT1 verplaatst naar ma 23 nov', waarom: 'PT1 en PTA', studiewijzer: 'lesweek 10' }];
  s.les = { 'vwo4:10.1': { titel: 'Praktijktoets PT1', materiaal: [{ t: 'PT1 scoreblad', u: 'https://x.nl/PT1%20Scoreblad.xlsx' }] }, 'vwo5:12.1': { titel: 'blijft PT1' } };
  s.taken = [{ id: 't1', titel: 'PT1 nakijken' }];
  const r = STAAT.migreer(s, leeg()); const x = r.staat;
  ok(r.stappen.length === 1 && x.schema === STAAT.SCHEMA, 'stap 3 niet uitgevoerd');
  ok(x.uitgesteld['tw:vwo4:P1'] === '2026-11-20' && x.uitgesteld['tw:havo4:P1'] === '2026-11-21' && !x.uitgesteld['tw:vwo4:PT1'] && x.later['tw:vwo4:P2'] === 'ok', 'sleutel met toets-id niet meegegaan');
  ok(x.afwijkingen[0].wat === 'P1 verplaatst naar ma 23 nov' && x.afwijkingen[0].waarom === 'P1 en PTA', 'afwijkingstekst niet aangepast');
  ok(x.les['vwo4:10.1'].titel === 'Praktijktoets P1' && x.les['vwo4:10.1'].materiaal[0].t === 'P1 scoreblad' && x.les['vwo4:10.1'].materiaal[0].u === 'https://x.nl/PT1%20Scoreblad.xlsx' && x.les['vwo5:12.1'].titel === 'blijft PT1', 'eigen lesbewerking verkeerd aangepast');
  ok(x.taken[0].titel === 'PT1 nakijken', 'eigen taak is aangepast');
  const r2 = STAAT.migreer(x, leeg()); ok(!r2.stappen.length && JSON.stringify(r2.staat.uitgesteld) === JSON.stringify(x.uitgesteld), 'stap 3 draait twee keer');
}
console.log(fouten ? '  ' + fouten + ' fout(en)' : '  ' + n + ' controles goed');

// 5. de echte app
async function browser() {
  const H = require('./test-hulp.js'); const T = await H.start(pub); const ge = new Map(); let gemeten = 0;
  const SCHERMEN = ['nu', 'vandaag', 'week', 'jaar', 'jaar/tv4', 'rooster', 'sectie', 'team', 'reclame', 'instellingen', 'beoordelen/p1-bb1-gitaar/tb1', 'beoordelen/p1-klas3-waymaker/th3'];
  const staten = OUD.map(([nm, s]) => [nm, s]); staten.push(['huidig', HUIDIG]);
  for (const k of Object.keys(HUIDIG)) {
    const w = HUIDIG[k]; if (!w || typeof w !== 'object') continue; const sl = Array.isArray(w) ? w.map((_, q) => q) : Object.keys(w); if (!sl.length) continue;
    for (const kap of [null, 'tekst', 7, []]) { if (k === 'beoord' && kap !== null) continue; /* kapot hoofdonderdeel van beoord: dat vangt bewust het herstelscherm, niet de migratie */ const s = kloon(HUIDIG); s[k][sl[0]] = kap; staten.push([`${k}[${sl[0]}]=${JSON.stringify(kap)}`, s]); }
    if (k !== 'rooster') { const s = kloon(HUIDIG); delete s[k]; staten.push(['zonder ' + k, s]); }
  }
  staten.push(['onvolledig', { v: 1 }], ['nieuwer schema', Object.assign(kloon(HUIDIG), { schema: 99, nieuwVeld: { a: 1 } })]);
  if (process.argv.includes('--snel')) { const kort = staten.filter((_, q) => q % 6 === 0 || q < OUD.length + 1); staten.length = 0; staten.push(...kort); } // --snel: de tijdperken en elke zesde variant
  for (const [naam, s] of staten) {
    const ctx = await T.browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block' }); await H.sluis(ctx, T.basis);
    const st = Object.assign({ magVanaf: '2026-08-01' }, s); if (!Array.isArray(st.rooster) || !st.rooster.length) st.rooster = H.STAAT.rooster; if (!isObj(st.groepLeergang) || !Object.keys(st.groepLeergang).length) st.groepLeergang = H.STAAT.groepLeergang;
    await ctx.addInitScript(x => { try { if (!sessionStorage.getItem('ingesteld')) { localStorage.setItem('lesdag-staat', JSON.stringify(x)); sessionStorage.setItem('ingesteld', '1'); } } catch (e) {} }, st);
    const page = await ctx.newPage(); await page.clock.setFixedTime(new Date('2026-11-16T09:00:00+01:00')); let nu = 'start';
    const f = (soort, tekst) => { const k = naam + '|' + nu + '|' + soort + '|' + tekst; if (!ge.has(k)) ge.set(k, { naam, nu, soort, tekst }); };
    page.on('pageerror', e => f('uitzondering', String(e.message).slice(0, 150)));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) f('consolefout', m.text().slice(0, 150)); });
    await page.goto(T.basis + '#nu', { waitUntil: 'load' }); await H.wacht(page).catch(() => f('start', 'laadde niet'));
    for (const h of SCHERMEN) { nu = h; await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(60);
      const t = await page.evaluate(() => (document.querySelector('#main') || {}).innerText || ''); gemeten++;
      if (/Dit scherm lukt nu niet|Lesdag start niet/.test(t)) f('kapot', (t.match(/mis bij het tekenen: ([^\n]*)/) || [, t.slice(0, 80)])[1]); }
    nu = 'opslag'; const opg = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('lesdag-staat')); } catch (e) { return null; } });
    if (!opg || !(opg.schema >= 1)) f('schema', 'opgeslagen staat heeft geen schemaversie'); else if (naam === 'nieuwer schema' && (opg.schema !== 99 || !opg.nieuwVeld)) f('schema', 'nieuwere staat is aangepast');
    await ctx.close();
  }
  await T.stop();
  console.log(`Deel 2 (app): ${staten.length} staten x ${SCHERMEN.length} schermen = ${gemeten} metingen`);
  for (const e of ge.values()) slecht(`app, staat "${e.naam}", scherm ${e.nu}: ${e.soort}: ${e.tekst}`);
  if (!ge.size) console.log('  alle schermen in orde');
}
(async () => { if (!ZB) await browser(); console.log(fouten ? fouten + ' fout(en).' : 'staten: alles goed'); process.exit(fouten ? 1 : 0); })().catch(e => { console.error(e); process.exit(1); });
