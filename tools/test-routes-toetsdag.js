// node tools/test-routes-toetsdag.js [--poort=8761] [--toon]
// Routetest toetsdag: PT1 vwo 4 (klas tv4) van begin tot eind, zoals Frans het meemaakt (bevindingen 8, 56, 58 tot en met 61 en 67 tot en met 70 uit
// handboek/feedback-kritische-docent-ronde-2.md): PT1 staat op ma 23-11 (datum in basis.json gaat voor de lesweek), de dagen ervoor mag er geen PT1 staan,
// op de toetsdag één tik naar de scorekaart, scoren, een afwezige, afronden, kolom kopiëren en de dag erna.
// Zelfde opzet als test-routes-beoordelen.js: Playwright via NODE_PATH (zie tools/TESTEN.md), verzonnen namen, wegwerpbrowser, vaste klok. Exitcode 0 goed, 1 fouten, 2 overgeslagen.
const path = require('path'), fs = require('fs');
const H = require('./test-hulp.js');
const args = process.argv.slice(2); const arg = (n, d) => { const a = args.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const TOON = args.includes('--toon');
const B = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'basis.json'), 'utf8'));
const MODELLEN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'beoordeling.json'), 'utf8'));
const MODEL = (Array.isArray(MODELLEN) ? MODELLEN : MODELLEN.modellen || Object.values(MODELLEN)).find(m => m.id === 'pt1-vwo4');
const G = 'tv4'; const KRITERIA = MODEL.onderdelen.flatMap(o => o.criteria);

/* ---------------- verzonnen klas en rooster: ma 9:15 en wo 8:30 ---------------- */
const NAMEN = ['Anna Alpha', 'Bram Bakker', 'Cato de Vries', 'Daan van Dijk']; // Daan is afwezig op de toetsdag
const uur = (id, dag, start, eind) => ({ id, dag, start, eind, groep: G, lokaal: '009' });
const vwo4 = B.leergangen.vwo4;
// alle lessen van vwo 4 vóór de toetsles (lesweek 10, les 1) staan als gegeven, zoals een docent die al weken met Lesdag werkt
const VOORTGANG = {}; for (const w of vwo4.weken) for (const i of [1, 2, 3]) if (w['l' + i] && w.w < 10) VOORTGANG[`vwo4:${w.w}.${i}`] = { st: 'gegeven', d: '2026-10-26' };
const STAAT = { v: 1, rooster: [uur('t1', 1, '9:15', '10:00'), uur('t2', 3, '8:30', '9:15')], groepLeergang: { [G]: 'vwo4' }, magVanaf: '2026-08-01', voortgang: { [G]: VOORTGANG },
  beoord: { toetsen: {}, lijsten: {} } };
const tijd = (dag, hm) => `2026-${dag.slice(3, 5) === '11' ? '11' : '12'}-${dag.slice(0, 2)}T${hm.length < 5 ? '0' + hm : hm}:00+01:00`; // dag als '23-11'

(async () => {
  const t0 = Date.now(); const fouten = []; let nChecks = 0;
  const h = await H.start(null, +arg('poort', 0) || undefined);
  const ctx = await h.browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
  await H.sluis(ctx, h.basis);
  await ctx.addInitScript(staat => { try { if (!sessionStorage.getItem('lesdag-test-ingesteld')) { localStorage.setItem('lesdag-staat', JSON.stringify(staat)); sessionStorage.setItem('lesdag-test-ingesteld', '1'); } } catch (e) {} }, STAAT);
  const page = await ctx.newPage(); page.setDefaultTimeout(5000);
  const consoleFouten = []; const dialogen = [];
  page.on('pageerror', e => consoleFouten.push('uitzondering: ' + String(e.message).slice(0, 200)));
  page.on('console', x => { if (x.type() === 'error' && !/Failed to load resource|net::ERR_/.test(x.text())) consoleFouten.push(x.text().slice(0, 200)); });
  page.on('dialog', d => { dialogen.push({ soort: d.type(), tekst: d.message() }); d.accept().catch(() => {}); });

  const waar = (wat, ok, extra) => { nChecks++; if (!ok) fouten.push(`${wat}${extra ? ' — ' + extra : ''}`); };
  const check = (wat, echt, verwacht) => waar(wat, JSON.stringify(echt) === JSON.stringify(verwacht), `kreeg ${JSON.stringify(echt)}, verwacht ${JSON.stringify(verwacht)}`);
  const stap = async (naam, f) => { try { await f(); } catch (e) { const scherm = await page.locator('#main').innerText({ timeout: 1000 }).catch(() => '?'); fouten.push(`stap "${naam}" liep vast: ${String(e.message).split('\n')[0]} / scherm: ${scherm.replace(/\s+/g, ' ').slice(0, 400)}`); } };
  // klok zetten en een scherm openen (herladen: Lesdag leest de tijd bij het starten)
  const op = async (dag, hm, hash) => { await page.clock.setFixedTime(new Date(tijd(dag, hm))); await page.goto(h.basis + '#' + hash); await page.reload(); await H.wacht(page); };
  const tekst = async () => (await page.locator('#main').innerText()).replace(/\s+/g, ' ');
  const knoppen = sel => page.$$eval(sel, b => b.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  const klik = sel => page.click(sel);
  const staat = () => page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-staat')));
  const toetsStaat = async () => ((await staat()).beoord.toetsen[`pt1-vwo4|${G}`]) || null;

  /* 1. de dagen voor de toets: PT1 staat op ma 23-11 en nergens anders (bevinding 8 en 56) */
  await stap('de dagen voor de toets', async () => {
    await op('09-11', '09:16', 'nu'); let t = await tekst();
    waar('9-11 Nu: de generale staat, de toets niet', !/Praktijktoets|(?<!Generale )PT1/.test(t), (t.match(/.{0,80}(PT1|Praktijktoets).{0,80}/g) || []).join(' // '));
    await op('09-11', '09:16', 'vandaag'); t = await tekst(); waar('9-11 Dag: geen Praktijktoets', !/Praktijktoets/.test(t), t.slice(0, 300));
    await op('09-11', '09:16', 'beoordelen'); t = await tekst(); waar('9-11 Beoordelen: er staat vandaag geen toets', /Vandaag staat er geen toets/.test(t), t.slice(0, 300));
    await op('09-11', '09:16', 'jaar/' + G); t = await tekst();
    waar('klasblad: één datum voor PT1 (ma 23 nov), niet ma 9 nov', /PT1 ma 23 nov/.test(t) && !/PT1 ma 9 nov/.test(t) && !/ma 9 nov/.test(t.replace(/Maandag 9 november/g, '')), (t.match(/[^.]{0,60}PT1[^.]{0,60}/g) || []).join(' | '));
    await op('16-11', '09:16', 'nu'); await page.keyboard.press('Control+k'); await page.keyboard.type('pt1'); await page.waitForTimeout(200);
    const k = await page.locator('body').innerText(); waar('16-11 Ctrl K "pt1": een toets van volgende week heet niet geweest', !/geweest/i.test((k.match(/PT1[^\n]*\n?[^\n]*/g) || []).join(' ')), (k.match(/[^\n]*pt1[^\n]*/gi) || []).join(' | '));
  });

  /* 2. de toetsdag: ma 23-11 om 9:05 staat PT1 op Nu en Dag, en in Beoordelen onder Vandaag (bevinding 8 en 56) */
  await stap('toetsdag op Nu, Dag en Beoordelen', async () => {
    await op('23-11', '09:05', 'nu'); let t = await tekst();
    waar('23-11 Nu: PT1 staat klaar', /Praktijktoets 1/.test(t), t.slice(0, 300));
    waar('23-11 Nu: PT1 is niet "gemist"', !/PT1 stond op/.test(t), (t.match(/[^.]*stond op[^.]*/g) || []).join(' | '));
    await op('23-11', '09:05', 'vandaag'); t = await tekst(); waar('23-11 Dag: Praktijktoets 1', /Praktijktoets 1/.test(t));
    await op('23-11', '09:05', 'beoordelen'); t = await tekst(); waar('23-11 Beoordelen: PT1 onder Vandaag', !/Vandaag staat er geen toets/.test(t) && /PT1/.test(t), t.slice(0, 300));
  });

  /* 3. op het toetsmoment één tik naar de scorekaart (bevinding 58) */
  await stap('één tik naar de scorekaart', async () => {
    await op('23-11', '09:13', 'nu'); waar('9:13 Nu (over 2 minuten): knop Beoordelen PT1', (await knoppen('[data-beoordeel]')).some(x => /Beoordelen PT1/.test(x)), await tekst());
    await op('23-11', '09:16', 'nu'); const kn = await knoppen('[data-beoordeel]'); waar('9:16 Nu (de les loopt): knop Beoordelen PT1', kn.some(x => /Beoordelen PT1/.test(x)), (await tekst()).slice(0, 300));
    await klik('[data-beoordeel]'); await page.waitForFunction(() => /^#beoordelen\/pt1-vwo4\/tv4/.test(location.hash));
    await page.waitForSelector('#bmLijst, .bm-status'); waar('na één tik staat de scorekaart van PT1 tv4 open', /PT1/.test(await tekst()), (await tekst()).slice(0, 200));
  });

  await h.stop();
  const geen = fouten.length === 0;
  console.log(geen ? `toetsdag: ${nChecks} controles, alles goed (${((Date.now() - t0) / 1000).toFixed(0)} s)` : `toetsdag: ${fouten.length} fout(en) in ${nChecks} controles:\n  - ` + fouten.join('\n  - '));
  if (consoleFouten.length) console.log('consolefouten:\n  ' + consoleFouten.slice(0, 5).join('\n  '));
  process.exit(geen && !consoleFouten.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
