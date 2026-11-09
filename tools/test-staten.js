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
// 4b. stap 2 (9-11-2026): de P9-lessen van vwo 5 wisselden van id; alles wat aan een les-id hangt gaat mee, de rest blijft
{ const s = kloon(HUIDIG); s.schema = 1;
  s.voortgang.v5 = { 'vwo5:8.1': { st: 'gegeven', d: '2026-10-26' }, 'vwo5:8.2': { st: 'gegeven' }, 'vwo5:12.1': { st: 'overgeslagen', inToets: 'vwo5:8.3' }, 'vwo5:18.1': { st: 'gegeven' } };
  s.ankers.v5 = { 'vwo5:8.3': { s: '2026-11-23', uur: 'x', reden: 'proef' } };
  s.les = { 'vwo5:8.1': { titel: 'eigen titel' }, 'vwo4:8.1': { titel: 'blijft' }, 'vwo5:28.1': { titel: 'blijft ook' } };
  s.later = { 'pres:vwo5:12.2': 'ok', 's|pres:vwo5:8.1': 'ok' };
  s.afwijkingen = [{ g: 'v5', lesIds: ['vwo5:8.1', 'vwo5:8.3'], wat: 'P9 verplaatst' }];
  const r = STAAT.migreer(s, leeg()); const x = r.staat;
  ok(r.stappen.length === 1 && x.schema === STAAT.SCHEMA, 'stap 2 niet uitgevoerd');
  ok(x.voortgang.v5['vwo5:12.1'].d === '2026-10-26' && x.voortgang.v5['vwo5:8.1'].st === 'overgeslagen' && x.voortgang.v5['vwo5:8.1'].inToets === 'vwo5:12.2' && x.voortgang.v5['vwo5:8.2'] && x.voortgang.v5['vwo5:18.1'], 'voortgang van vwo 5 niet gewisseld of iets kwijt');
  ok(x.ankers.v5['vwo5:12.2'] && !x.ankers.v5['vwo5:8.3'], 'anker niet meegegaan');
  ok(x.les['vwo5:12.1'].titel === 'eigen titel' && x.les['vwo4:8.1'].titel === 'blijft' && x.les['vwo5:28.1'].titel === 'blijft ook' && !x.les['vwo5:8.1'], 'eigen lesbewerking niet goed meegegaan');
  ok(x.later['pres:vwo5:8.3'] === 'ok' && x.later['pres:vwo5:12.2'] === undefined && x.later['s|pres:vwo5:12.1'] === 'ok', 'sleutel met pres: niet meegegaan');
  ok(x.afwijkingen[0].lesIds.join() === 'vwo5:12.1,vwo5:12.2' && x.afwijkingen[0].wat === 'P9 verplaatst', 'afwijking niet meegegaan');
  const r2 = STAAT.migreer(x, leeg()); ok(!r2.stappen.length && JSON.stringify(r2.staat.voortgang) === JSON.stringify(x.voortgang), 'stap 2 draait twee keer');
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
