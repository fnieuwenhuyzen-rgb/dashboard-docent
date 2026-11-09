// node tools/test-nu-ochtend.js [--toon]
// Nu en de lesdag (handboek/feedback-kritische-docent-ronde-2.md: 3, 57, 62, 63, 71, 72, 73, 74, 76, 44): wat Frans maandag om 8:10 ziet,
// afronden tussen lessen zonder pauze, een ziektedag, de eerste dag na een vakantie, na het schooljaar, dezelfde woorden voor hetzelfde.
// Eigen server en een wegwerpbrowser met een verzonnen rooster (test-hulp.js). Exitcode 2 = Playwright of browser ontbreekt.
const assert = require('assert'); const H = require('./test-hulp.js');
const TOON = process.argv.includes('--toon');
(async () => {
  const h = await H.start(); const fouten = []; let n = 0;
  async function kijk(iso, hash, patch, na) { // opent #hash op de nagebootste tijd; geeft de tekst van #main en de html
    const ctx = await h.browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block' }); await H.sluis(ctx, h.basis);
    const staat = Object.assign({}, H.STAAT, patch || {});
    await ctx.addInitScript(x => { try { if (!sessionStorage.getItem('i')) { localStorage.setItem('lesdag-staat', JSON.stringify(x)); sessionStorage.setItem('i', '1'); } } catch (e) {} }, staat);
    const page = await ctx.newPage(); await page.clock.setFixedTime(new Date(iso)); const fout = []; page.on('pageerror', e => fout.push(e.message));
    await page.goto(h.basis + '#' + (hash || 'nu')); await H.wacht(page); await page.waitForTimeout(250);
    if (na) await na(page);
    const r = { tekst: await page.evaluate(() => document.querySelector('#main').innerText), html: await page.evaluate(() => document.querySelector('#main').innerHTML), page, fout };
    if (TOON) console.log('--- ' + iso + ' #' + (hash || 'nu') + '\n' + r.tekst);
    await ctx.close(); return r;
  }
  const is = (naam, ok, extra) => { n++; if (!ok) fouten.push(naam + (extra ? ' — ' + extra : '')); };
  const tel = (t, w) => t.split(w).length - 1;

  // 72: de zin "5 lessen, de eerste om 8:30" staat maar één keer op Nu
  { const r = await kijk('2026-11-16T08:10:00+01:00', 'nu'); is('72: zin maar één keer', tel(r.tekst, 'de eerste om 8:30') === 1, 'staat ' + tel(r.tekst, 'de eerste om 8:30') + ' keer'); }

  await h.stop();
  if (fouten.length) { console.log('MISLUKT (' + fouten.length + ' van ' + n + '):\n  ' + fouten.join('\n  ')); process.exit(1); }
  console.log(`nu-ochtend: ${n} controles, alles goed`);
})();
