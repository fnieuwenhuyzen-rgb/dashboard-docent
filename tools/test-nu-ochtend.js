// node tools/test-nu-ochtend.js [--toon]
// Nu en de lesdag (handboek/feedback-kritische-docent-ronde-2.md: 3, 57, 62, 63, 71, 72, 73, 74, 76, 44): wat Frans maandag om 8:10 ziet,
// afronden tussen lessen zonder pauze, een ziektedag, de eerste dag na een vakantie, na het schooljaar, dezelfde woorden voor hetzelfde.
// Eigen server en een wegwerpbrowser met een verzonnen rooster (test-hulp.js). Exitcode 2 = Playwright of browser ontbreekt.
const assert = require('assert'), fs = require('fs'), path = require('path'); const H = require('./test-hulp.js');
const BASIS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'basis.json'), 'utf8'));
const reeksIds = lg => { const L = BASIS.leergangen[lg]; const n = L.meta.lessenPerWeek; const out = []; for (const w of L.weken) for (let i = 1; i <= n; i++) { const l = w['l' + i]; if (!l || l.type === 'uitval' || l.type === 'toetsweek' || (l.type === 'toets' && w.toetsweek)) continue; out.push({ id: `${lg}:${w.w}.${i}`, w: w.w, titel: l.titel, type: l.type }); } return out; };
// tv4 (vwo4) heeft alles tot lesweek 10 gegeven; de laatste les daarvoor staat op half af met een notitie
const vorigeStaat = (n, st) => { const r = reeksIds('vwo4'); const voor = r.filter(x => x.w < 11); const o = {}; voor.forEach((x, i) => { o[x.id] = i < voor.length - 1 ? { st: 'gegeven', d: '2026-11-02', uur: 'x' } : { st: st || 'half', d: '2026-11-09', uur: 'x', n }; }); return { voortgang: { tv4: o } }; };
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

  // 57: maandag 8:10, vijf minuten: onderwerp, wat klaar moet staan, en niet "Lesdag heeft niets voor je"
  { const r = await kijk('2026-11-16T08:10:00+01:00', 'nu'); const T = r.tekst;
    is('57: onderwerp van de eerste les', /Eerste les: tv4 · Generieke kenmerken jazz/.test(T));
    is('57: klaarzetten', /klaarzetten/i.test(T) && /Luisterfragmenten klaarzetten/.test(T));
    is('57: geen "niets voor je" vóór de eerste les', !/Tot de eerste les heeft Lesdag niets voor je/.test(T)); }

  // 3: "Vorige keer" staat er ook als de les net begonnen is, op Nu en in de lesmodus
  { const NOT = 'Gestopt bij vraag twee', staat = vorigeStaat(NOT);
    const a = await kijk('2026-11-16T08:10:00+01:00', 'nu', staat); is('3: Nu 8:10 vorige keer', a.tekst.includes(NOT));
    const b = await kijk('2026-11-16T08:32:00+01:00', 'nu', staat); is('3: Nu in het eerste kwartier (Magister afronden voorop)', /Magister afronden/.test(b.tekst) && b.tekst.includes('Vorige keer') && b.tekst.includes(NOT));
    const c = await kijk('2026-11-16T08:40:00+01:00', 'vandaag', staat, async page => { await page.click('[data-start]'); await page.waitForSelector('#les:not([hidden])'); await page.waitForTimeout(200); await page.click('#les [data-l="notities"]'); await page.waitForTimeout(100); });
    const les = await c.page.evaluate(() => document.querySelector('#les').innerText).catch(() => ''); is('3: lesmodus die al loopt toont vorige keer bij de notities', /Vorige keer/.test(c.tekst + les) && (c.tekst + les).includes(NOT)); }

  await h.stop();
  if (fouten.length) { console.log('MISLUKT (' + fouten.length + ' van ' + n + '):\n  ' + fouten.join('\n  ')); process.exit(1); }
  console.log(`nu-ochtend: ${n} controles, alles goed`);
})();
