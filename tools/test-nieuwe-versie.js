// node tools/test-nieuwe-versie.js [--poort=8756] : het hele verloop van een nieuwe versie, met de echte service worker in Chrome/Edge.
// Werkt op een kopie van public/ (een tijdelijke map), zodat sw.js daar tijdens de test veranderd kan worden zonder de repo aan te raken.
// Wat het vangt: de melding blijft weg bij de eerste installatie en zonder wijziging; verschijnt na een nieuwe sw.js; herlaadt nooit tijdens
// lesmodus, typen, beoordelen of regie; herlaadt wel zodra het kan; en de app start daarna ook offline.
const fs = require('fs'), path = require('path'), os = require('os');
const H = require('./test-hulp.js'); const pub = path.join(__dirname, '..', 'public');
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
let fouten = 0, n = 0; const slecht = t => { console.log('  FOUT ' + t); fouten++; }; const ok = (c, t) => { n++; if (!c) slecht(t); };
const wacht = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const map = fs.mkdtempSync(path.join(os.tmpdir(), 'lesdag-versie-')); fs.cpSync(pub, map, { recursive: true });
  const swPad = path.join(map, 'sw.js'); const sw0 = fs.readFileSync(swPad, 'utf8'); const CACHE0 = (sw0.match(/const CACHE = '([^']+)'/) || [])[1];
  const T = await H.start(map, +arg('poort', 0) || undefined);
  const nieuwSw = naam => fs.writeFileSync(swPad, sw0.replace(CACHE0, naam)); // een andere cachenaam = een andere sw.js = een nieuwe versie
  const ctx = await T.browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Amsterdam', locale: 'nl-NL' }); // serviceWorkers: toegestaan
  await ctx.route(u => !u.href.startsWith(T.basis), r => r.fulfill({ status: 200, contentType: r.request().resourceType() === 'stylesheet' ? 'text/css' : 'text/plain', body: '' }));
  await ctx.route(u => u.pathname.startsWith('/api/'), r => r.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  await ctx.addInitScript(x => { try { if (!localStorage.getItem('lesdag-staat')) localStorage.setItem('lesdag-staat', JSON.stringify(x)); } catch (e) {} }, H.STAAT);
  const page = await ctx.newPage(); const meldingen = []; page.on('pageerror', e => meldingen.push(String(e.message)));
  // maandag 16 nov 9:00 (tijdens de les tv4), zodat de lesmodus echt kan openen
  await page.clock.setFixedTime(new Date('2026-11-16T09:00:00+01:00'));
  const banner = () => page.evaluate(() => { const e = document.querySelector('#nieuweversie'); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; });
  const marker = () => page.evaluate(() => window.__marker === 1);
  const zetMarker = () => page.evaluate(() => { window.__marker = 1; });
  const sw = () => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r ? { actief: !!r.active, wacht: !!r.waiting, controller: !!navigator.serviceWorker.controller } : null; });
  const caches_ = () => page.evaluate(() => caches.keys());
  const update = () => page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()).catch(() => 'fout'));
  const verberg = async w => { await page.evaluate(w => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => w }); document.dispatchEvent(new Event('visibilitychange')); }, w); };
  const nogLeeft = async ms => { await wacht(ms); try { return await marker(); } catch (e) { return false; } }; // false = de pagina is herladen

  // 1. eerste bezoek: service worker installeert en neemt over, zonder melding
  await page.goto(T.basis + '#instellingen', { waitUntil: 'load' }); await H.wacht(page);
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 8000 }).catch(() => {});
  ok((await sw()) && (await sw()).controller, 'service worker neemt niet over bij het eerste bezoek (registreert de app op localhost?)');
  ok(!(await banner()), 'melding "nieuwe versie" bij het eerste bezoek');
  ok((await caches_()).includes(CACHE0), 'cache ' + CACHE0 + ' ontbreekt');
  // 2. zelfde sw.js: geen melding
  await zetMarker(); await update(); await wacht(800); ok(!(await banner()) && await marker(), 'melding of herlaad zonder nieuwe versie');
  // 3. offline: de pagina laadt uit de cache en de staat is er nog
  await ctx.setOffline(true); await page.reload({ waitUntil: 'load' }).catch(() => {}); await H.wacht(page).catch(() => {});
  const offT = await page.evaluate(() => document.querySelector('#main').innerText); ok(/Instellingen|Gegevens|Foutlogboek/.test(offT), 'offline start de app niet vanuit de cache: ' + offT.slice(0, 60));
  ok(await page.evaluate(() => !!JSON.parse(localStorage.getItem('lesdag-staat')).rooster.length), 'staat weg offline');
  await update(); await wacht(300); ok(!(await banner()), 'melding terwijl er offline niets te halen valt');
  await ctx.setOffline(false); await page.reload({ waitUntil: 'load' }); await H.wacht(page);

  // 4. nieuwe versie klaar terwijl je typt: melding verschijnt, er wordt niet herladen
  await page.goto(T.basis + '#instellingen', { waitUntil: 'load' }); await H.wacht(page); await zetMarker();
  const veld = await page.$('input[type=text], input:not([type]), textarea'); ok(!!veld, 'geen tekstveld in Instellingen om in te typen');
  if (veld) { await veld.focus(); await page.keyboard.type('ab'); }
  nieuwSw(CACHE0 + '-b'); await update();
  await page.waitForFunction(() => { const e = document.querySelector('#nieuweversie'); return e && !e.hidden; }, null, { timeout: 8000 }).catch(() => {});
  ok(await banner(), 'geen melding na een nieuwe sw.js');
  ok((await page.evaluate(() => document.querySelector('#nieuweversie').innerText)).length > 10, 'melding is leeg');
  ok(await marker(), 'pagina herlaadde meteen bij de nieuwe versie');
  await verberg(true); ok(await nogLeeft(2500), 'herladen tijdens typen (veld heeft focus)');
  // 5. typen klaar (focus weg), pagina op de achtergrond: nu herlaadt hij
  await verberg(false); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await verberg(true);
  const bleef = await nogLeeft(3500); ok(!bleef, 'herlaadde niet op een veilig moment (verborgen pagina, niet typen)');
  await page.waitForLoadState('load').catch(() => {}); await H.wacht(page).catch(() => {});
  ok((await caches_()).includes(CACHE0 + '-b'), 'nieuwe versie niet actief na herladen: ' + (await caches_()));
  ok(!(await banner()), 'melding blijft staan na het herladen');

  // 6. tijdens de lesmodus: geen melding op het digibord en nooit herladen
  await page.evaluate(() => { sessionStorage.setItem('lesdag-lesopen', 't1|2026-11-16'); }); await page.reload({ waitUntil: 'load' }); await H.wacht(page); await page.waitForTimeout(500);
  const lesAan = await page.evaluate(() => { const l = document.querySelector('#les'); return !!l && !l.hidden; }); ok(lesAan, 'lesmodus ging niet open (test zelf klopt niet)');
  await zetMarker(); nieuwSw(CACHE0 + '-c'); await update(); await wacht(1500);
  ok(!(await banner()), 'melding zichtbaar in de lesmodus (digibord)');
  await verberg(true); ok(await nogLeeft(3000), 'herladen tijdens de lesmodus');
  // 7. beoordelen: wel melding, nooit automatisch herladen
  await verberg(false); await page.keyboard.press('Escape'); await page.evaluate(() => { sessionStorage.removeItem('lesdag-lesopen'); location.hash = '#beoordelen/p1-bb1-gitaar/tb1'; }); await page.waitForTimeout(800);
  const lesNog = await page.evaluate(() => { const l = document.querySelector('#les'); return !!l && !l.hidden; });
  if (lesNog) { await page.evaluate(() => { const b = document.querySelector('#les [data-lesdicht], #les .sluit, #les button'); if (b) b.click(); }); await page.waitForTimeout(300); }
  await zetMarker(); await verberg(true); ok(await nogLeeft(3000), 'herladen tijdens beoordelen');
  await verberg(false); ok(await banner(), 'geen melding in beoordelen na een nieuwe versie');
  // 8. de knop werkt: bijwerken op verzoek
  await page.evaluate(() => { location.hash = '#instellingen'; }); await page.waitForTimeout(300);
  await Promise.all([page.waitForNavigation({ waitUntil: 'load', timeout: 8000 }).catch(() => {}), page.click('#nieuweversie button')]);
  await H.wacht(page).catch(() => {}); ok((await caches_()).includes(CACHE0 + '-c'), 'knop Nu bijwerken laadt de nieuwe versie niet: ' + (await caches_()));
  // 9. oude caches zijn opgeruimd
  ok(!(await caches_()).includes(CACHE0), 'oude cache ' + CACHE0 + ' is niet opgeruimd');
  // 10. staat bleef heel door het hele verloop
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-staat')).rooster.length === 5), 'staat veranderd door het bijwerken');
  ok(!meldingen.length, 'uitzonderingen in de pagina: ' + meldingen.slice(0, 2).join(' | '));
  await ctx.close(); await T.stop(); try { fs.rmSync(map, { recursive: true, force: true }); } catch (e) {}
  console.log(fouten ? fouten + ' fout(en).' : 'nieuwe versie: alles goed (' + n + ' controles)'); process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
