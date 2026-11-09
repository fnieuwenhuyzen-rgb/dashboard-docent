// node tools/test-functies-scherm.js: de proeffuncties in de browser, met verzonnen rooster (test-hulp.js) en een vaste klok.
// Per functie: uit = niets verandert, aan = het doet wat het voorstel zegt. Playwright via NODE_PATH, zie tools/TESTEN.md.
const path = require('path'); const H = require('./test-hulp.js'); const pub = path.join(__dirname, '..', 'public');
let fouten = 0, n = 0; const slecht = t => { console.log('  FOUT ' + t); fouten++; }; const ok = (c, t) => { n++; if (!c) slecht(t); };
const paginaFouten = [];
(async () => {
  const T = await H.start(pub);
  // nieuwe browsercontext met staat en schakelaars; iso = de vaste klok
  const open = async (hash, iso, { staat, functies } = {}) => {
    const ctx = await T.browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block' }); await H.sluis(ctx, T.basis);
    await ctx.addInitScript(([s, f]) => { try { if (!sessionStorage.getItem('ingesteld')) { localStorage.setItem('lesdag-staat', JSON.stringify(s)); if (f) localStorage.setItem('lesdag-apparaat', JSON.stringify({ functies: f })); sessionStorage.setItem('ingesteld', '1'); } } catch (e) {} }, [staat || H.STAAT, functies || null]);
    const page = await ctx.newPage(); page.on('pageerror', e => paginaFouten.push(String(e.message).slice(0, 200)));
    await page.clock.setFixedTime(new Date(iso)); await page.goto(T.basis + hash, { waitUntil: 'load' }); await H.wacht(page); await page.waitForTimeout(250);
    return { ctx, page, tekst: () => page.evaluate(() => document.querySelector('#main').innerText) };
  };
  try {
    // 0. schakelaars bij Instellingen: standaard uit, aan te zetten, blijft staan
    { const { ctx, page, tekst } = await open('#instellingen', '2026-11-20T10:00:00+01:00');
      ok(/Proeffuncties/.test(await tekst()), 'Instellingen heeft geen kaart Proeffuncties');
      ok(await page.evaluate(() => [...document.querySelectorAll('[data-fnzet]')].length === 3 && [...document.querySelectorAll('[data-fnzet]')].every(c => !c.checked)), 'proeffuncties staan niet allemaal uit');
      await page.check('[data-fnzet="weekAfsluiten"]'); await page.waitForTimeout(200);
      ok(await page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-apparaat')).functies.weekAfsluiten === true), 'schakelaar wordt niet bewaard op het apparaat');
      ok(await page.evaluate(() => document.querySelector('[data-fnzet="weekAfsluiten"]').checked), 'schakelaar springt terug');
      ok(await page.evaluate(() => !('functies' in JSON.parse(localStorage.getItem('lesdag-staat') || '{}'))), 'schakelaars zitten in de gesynchroniseerde staat');
      await ctx.close(); }
    //FUNCTIE-SCHERMTESTS
    // 1. Week afsluiten
    const WSTAAT = Object.assign({}, H.STAAT, { goed: { '2026-11-16': 'De alten pakten maat 17.', '2026-11-18': 'Vwo 4 speelde het schema zonder blad.' }, afwijkingen: [{ id: 'af1', g: 'tv4', wat: 'Generale vervallen', bericht: 'De generale komt niet meer.', d: '2026-11-17', soort: 'les' }] });
    const WAAN = { weekAfsluiten: true };
    { const { ctx, tekst } = await open('#nu', '2026-11-20T16:20:00+01:00', { staat: WSTAAT });
      const t0 = await tekst(); ok(/Dag afsluiten/.test(t0) && !/Week afsluiten/.test(t0) && !/Volgende week/i.test(t0), 'week afsluiten: uit, maar de kaart verandert'); await ctx.close(); }
    { const { ctx, page, tekst } = await open('#nu', '2026-11-20T16:20:00+01:00', { staat: WSTAAT, functies: WAAN });
      const t1 = await tekst();
      ok(/Week afsluiten/.test(t1) && /Wat ging goed deze week?/.test(t1), 'week afsluiten: vrijdag toont geen Week afsluiten');
      ok(/De alten pakten maat 17./.test(t1) && /Vwo 4 speelde het schema/.test(t1), 'week afsluiten: zinnen van de week ontbreken');
      ok(/Anders dan de studiewijzer/i.test(t1) && /Generale vervallen/.test(t1) && /Kopieer bericht/.test(t1), 'week afsluiten: blok Anders dan de studiewijzer ontbreekt');
      ok(/Volgende week/i.test(t1) && /tv4 · praktijktoets PT1 op ma/.test(t1) && /staat vast/.test(t1), 'week afsluiten: toets van volgende week ontbreekt: ' + t1.slice(-400));
      await page.click('[data-afsluiten]'); await page.waitForTimeout(300);
      const t2 = await tekst(); ok(/Week afgesloten/.test(await page.evaluate(() => document.body.innerText)), 'week afsluiten: geen melding Week afgesloten');
      ok(await page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-staat')).afgesloten['2026-11-20'] === true), 'week afsluiten: dag niet afgesloten');
      ok(/Je week is afgesloten/i.test(t2), 'week afsluiten: stille tekst na afsluiten ontbreekt: ' + t2.slice(0, 200)); await ctx.close(); }
    { const { ctx, tekst } = await open('#nu', '2026-11-19T16:20:00+01:00', { staat: WSTAAT, functies: WAAN });
      const t3 = await tekst(); ok(/Dag afsluiten/.test(t3) && !/Week afsluiten/.test(t3) && !/Volgende week/i.test(t3), 'week afsluiten: donderdag is geen weekafsluiting'); await ctx.close(); }
    { const { ctx, tekst } = await open('#nu', '2026-11-23T08:10:00+01:00', { staat: WSTAAT, functies: WAAN });
      ok((await tekst()).includes('Deze week: praktijktoets tv4 (ma).'), 'week afsluiten: maandagregel ontbreekt'); await ctx.close(); }
    { const { ctx, tekst } = await open('#nu', '2026-11-23T08:10:00+01:00', { staat: WSTAAT });
      ok(!/Deze week:/.test(await tekst()), 'week afsluiten: maandagregel staat aan zonder schakelaar'); await ctx.close(); }
    { const { ctx, tekst } = await open('#nu', '2026-11-24T08:10:00+01:00', { staat: WSTAAT, functies: WAAN });
      ok(!/Deze week:/.test(await tekst()), 'week afsluiten: maandagregel op dinsdag'); await ctx.close(); }
  } finally { await T.stop(); }
  ok(!paginaFouten.length, 'uitzonderingen op de pagina: ' + paginaFouten.slice(0, 3).join(' | '));
  console.log(fouten ? fouten + ' fout(en).' : 'functies in de browser: alles goed (' + n + ' controles)'); process.exit(fouten ? 1 : 0);
})().catch(e => { console.log('FOUT ' + e.stack); process.exit(1); });
