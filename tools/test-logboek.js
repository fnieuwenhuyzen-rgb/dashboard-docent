// node tools/test-logboek.js [--zonder-browser] : foutlogboek op het apparaat (public/logboek.js).
// Deel 1 (Node): ring van 200, samenvoegen van herhalingen, en dat er geen namen, tokens, adressen of e-mail in komen.
// Deel 2 (browser): een uitzondering en "Dit scherm lukt nu niet" komen in het logboek; Instellingen toont het en kopieert het.
const fs = require('fs'), path = require('path');
const pub = path.join(__dirname, '..', 'public'); const maak = require(path.join(pub, 'logboek.js'));
let fouten = 0, n = 0; const slecht = t => { console.log('  FOUT ' + t); fouten++; }; const ok = (c, t) => { n++; if (!c) slecht(t); };
const opslag = {}; const wereld = { localStorage: { getItem: k => (k in opslag ? opslag[k] : null), setItem: (k, v) => { opslag[k] = String(v); }, removeItem: k => { delete opslag[k]; } }, location: { hash: '#week' }, navigator: { userAgent: 'TestBrowser/1' } };
const L = maak(wereld);

// ring van de laatste 200
for (let i = 0; i < 260; i++) L.noteer('uitzondering', new Error('fout nummer ' + i + ' x'.repeat(i % 3)));
ok(L.lees().length === 200, 'ring is ' + L.lees().length + ' in plaats van 200');
ok(L.lees()[199].bericht.includes('259') && !L.lees().some(r => r.bericht.includes('nummer 0 ')), 'ring houdt niet de laatste 200');
// herhaling vlak achter elkaar telt op
L.wis(); for (let i = 0; i < 50; i++) L.noteer('scherm', new TypeError("Cannot read properties of undefined (reading 'titel')"));
ok(L.lees().length === 1 && L.lees()[0].aantal === 50, 'herhaling wordt niet samengevoegd: ' + L.lees().length);
// privacy: wat er niet in mag
L.wis();
const VUIL = [
  new TypeError("Cannot read properties of undefined (reading 'Testleerling, Anna')"),
  new Error('Leerling "Testleerling, Bram" niet gevonden in tb1'),
  new Error("Kon 'Anna' niet vinden"), new Error('Mislukt voor Anna de Vries'),
  new Error('fetch https://lesdag-rooster.workers.dev/api?token=abcdef0123456789abcdef0123456789&code=123 faalde'),
  new Error('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXVyc2lnbmF0dXVy mislukt'),
  new Error('token abcdefghijklmnopqrstuvwxyz0123456789 ongeldig'), new Error('mail van nwn@csgpm.nl'), { message: 'Zermelo-token 7x9k2m4p8q1w5e3r6t0y123456 niet geldig' },
];
for (const e of VUIL) L.noteer('uitzondering', e);
const alles = JSON.stringify(L.lees()) + L.tekst();
for (const g of ['Testleerling', 'Anna', 'Bram', 'Vries', 'abcdef0123', 'eyJhbG', 'abcdefghijklmnop', 'csgpm', '7x9k2m4p8q', 'code=123', 'token=']) ok(!alles.includes(g), 'logboek bevat "' + g + '"');
ok(L.lees()[0].bericht.includes('reading') && L.lees()[0].bericht.includes('Cannot read properties'), 'soort fout ging verloren: ' + L.lees()[0].bericht);
ok(L.schoon("reading 'titel'") === "reading 'titel'", 'gewone eigenschapsnaam is weggehaald');
// plek: bestand en regel, geen adres
ok(L.plek('Error: x\n    at f (https://lesdag-muziek.pages.dev/app.js:123:45)\n    at g (https://lesdag-muziek.pages.dev/sync.js:9:1)') === 'app.js:123:45 < sync.js:9:1', 'plek: ' + L.plek('at f (https://x.dev/app.js:123:45)'));
// kapotte opslag breekt niets
opslag['lesdag-logboek'] = '{kapot'; ok(Array.isArray(L.lees()) && L.lees().length === 0, 'kapotte opslag geeft geen lege lijst'); ok(L.noteer('uitzondering', new Error('na kapot')) !== null, 'noteren na kapotte opslag lukt niet');
const tekst = L.tekst(); ok(/^Lesdag foutlogboek/.test(tekst) && tekst.includes('na kapot'), 'tekst voor kopiëren klopt niet');
console.log(fouten ? '  ' + fouten + ' fout(en)' : '  Deel 1: ' + n + ' controles goed');

async function browser() {
  const H = require('./test-hulp.js'); const T = await H.start(pub); let f2 = 0; const k = (c, t) => { n++; if (!c) { slecht(t); f2++; } };
  const ctx = await T.browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] }); await H.sluis(ctx, T.basis);
  await ctx.addInitScript(x => { try { if (!sessionStorage.getItem('ingesteld')) { localStorage.setItem('lesdag-staat', JSON.stringify(x)); sessionStorage.setItem('ingesteld', '1'); } } catch (e) {} }, H.STAAT);
  const page = await ctx.newPage(); await page.clock.setFixedTime(new Date('2026-11-16T09:00:00+01:00'));
  await page.goto(T.basis + '#instellingen', { waitUntil: 'load' }); await H.wacht(page);
  let t = await page.evaluate(() => document.querySelector('#main').innerText); k(/Foutlogboek/.test(t), 'Instellingen heeft geen kaart Foutlogboek');
  k(await page.evaluate(() => (window.LOGBOEK && LOGBOEK.lees().length) === 0), 'logboek is niet leeg na een schone start');
  // 1. een echte uitzondering buiten de app-code en een afgewezen belofte
  await page.evaluate(() => { const sc = document.createElement('script'); sc.textContent = "throw new TypeError(\"Cannot read properties of undefined (reading 'Testleerling, Anna')\")"; document.head.appendChild(sc); Promise.reject(new Error('belofte met token abcdefghijklmnopqrstuvwxyz012345')); });
  await page.waitForTimeout(300);
  // 2. een scherm dat niet tekent: render vangt het op en moet het loggen
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('lesdag-staat')); s.voortgang = { tv4: { 'vwo4:1.1': { st: 'gegeven' } } }; localStorage.setItem('lesdag-staat', JSON.stringify(s)); });
  await page.evaluate(() => { const o = Array.prototype.map; let eerste = true; Array.prototype.map = function () { if (window.__breek && /viewWeek/.test(new Error().stack)) { window.__breek = false; throw new RangeError('Proefstoring voor Testleerling, Anna'); } return o.apply(this, arguments); }; window.__breek = true; location.hash = '#week'; });
  await page.waitForTimeout(400);
  const kapot = await page.evaluate(() => /Dit scherm lukt nu niet/.test(document.querySelector('#main').innerText));
  k(kapot, 'proefstoring liet het scherm niet kapotgaan (test zelf klopt niet)');
  const log = await page.evaluate(() => LOGBOEK.lees());
  k(log.some(r => r.soort === 'uitzondering') && log.some(r => r.soort === 'belofte') && log.some(r => r.soort === 'scherm'), 'ontbrekende soort in logboek: ' + log.map(r => r.soort));
  k(!JSON.stringify(log).includes('Testleerling') && !JSON.stringify(log).includes('abcdefghijklmnop'), 'browserlogboek bevat namen of tokens: ' + JSON.stringify(log).slice(0, 300));
  // 3. Instellingen toont het en kopieert het
  await page.evaluate(() => { location.hash = '#nu'; location.hash = '#instellingen'; }); await page.waitForTimeout(300);
  t = await page.evaluate(() => document.querySelector('#main').innerText); k(/uitzondering/.test(t) || /regel/.test(t), 'Instellingen toont het logboek niet: ' + t.slice(0, 0));
  await page.click('[data-logkopie]'); await page.waitForTimeout(300);
  const kopie = await page.evaluate(() => navigator.clipboard.readText()); k(/^Lesdag foutlogboek/.test(kopie) && /uitzondering/.test(kopie) && !/Testleerling/.test(kopie), 'klembord bevat het logboek niet: ' + kopie.slice(0, 80));
  // 4. wissen
  page.on('dialog', d => d.accept()); await page.click('[data-logwis]'); await page.waitForTimeout(200);
  k(await page.evaluate(() => LOGBOEK.lees().length) === 0, 'wissen lukt niet');
  // 5. de logboekregels zitten niet in de staat, dus niet in een kopie en niet in synchroniseren
  k(await page.evaluate(() => !/logboek/i.test(localStorage.getItem('lesdag-staat'))), 'logboek zit in de staat');
  await ctx.close(); await T.stop(); console.log('  Deel 2 (browser): ' + (f2 ? f2 + ' fout(en)' : 'goed'));
}
(async () => { if (!process.argv.includes('--zonder-browser')) await browser(); console.log(fouten ? fouten + ' fout(en).' : 'logboek: alles goed'); process.exit(fouten ? 1 : 0); })().catch(e => { console.error(e); process.exit(1); });
