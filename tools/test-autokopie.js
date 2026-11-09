// node tools/test-autokopie.js : de automatische dagelijkse kopie in IndexedDB (public/kopie.js + app.js).
// Een kopie per dag (de stand van de eerste start), de laatste 14, zonder tokens, terugzetten vanuit Instellingen met dezelfde vraag als Kopie terugzetten.
const path = require('path'); const H = require('./test-hulp.js'); const pub = path.join(__dirname, '..', 'public');
let fouten = 0, n = 0; const slecht = t => { console.log('  FOUT ' + t); fouten++; }; const ok = (c, t) => { n++; if (!c) slecht(t); };
const STAAT = Object.assign({}, H.STAAT, { updated: 1763280000000, taken: [{ id: 'tk1', titel: 'Oorspronkelijke taak' }] }); // updated: 16 nov 2026

(async () => {
  const T = await H.start(pub); const fouten_pagina = [];
  const nieuw = async (init) => { const ctx = await T.browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block' }); await H.sluis(ctx, T.basis);
    await ctx.addInitScript(([x, i]) => { try { if (!localStorage.getItem('lesdag-staat')) localStorage.setItem('lesdag-staat', JSON.stringify(x)); if (i) i.split(';').forEach(s => { const [k, v] = s.split('='); if (!localStorage.getItem(k)) localStorage.setItem(k, v); }); } catch (e) {} }, [STAAT, init || '']);
    const page = await ctx.newPage(); page.on('pageerror', e => fouten_pagina.push(String(e.message))); return { ctx, page }; };
  const dag = (page, iso) => page.clock.setFixedTime(new Date(iso));
  const open = async (page, hash, iso) => { await dag(page, iso); await page.goto('about:blank'); await page.goto(T.basis + hash, { waitUntil: 'load' }); await H.wacht(page); await page.waitForTimeout(500); };
  const lijst = page => page.evaluate(() => AUTOKOPIE.lijst());

  // 1. eerste start: één kopie, van vandaag; geen tweede bij herladen; token blijft erbuiten
  const { ctx, page } = await nieuw('lesdag-zermelo-api=GEHEIMTOKEN12345');
  await open(page, '#nu', '2026-11-16T09:00:00+01:00');
  let L = await lijst(page); ok(L.length === 1 && L[0].dag === '2026-11-16', 'eerste start maakt geen kopie van vandaag: ' + JSON.stringify(L));
  const ruw = () => page.evaluate(() => new Promise(r => { const q = indexedDB.open('lesdag-autokopie'); q.onsuccess = () => { const g = q.result.transaction('dagen').objectStore('dagen').getAll(); g.onsuccess = () => { q.result.close(); r(JSON.stringify(g.result)); }; }; }));
  let tekst = await ruw(); ok(!/GEHEIMTOKEN|_zermeloApi|lesdag-apparaat/.test(tekst), 'token of apparaatgegevens in de kopie'); ok(/Oorspronkelijke taak/.test(tekst), 'kopie bevat de staat niet');
  // 2. vandaag verder werken en herstarten: de kopie van vandaag blijft de stand van de ochtend
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('lesdag-staat')); s.taken = [{ id: 'tk1', titel: 'Aangepaste taak' }]; s.updated = Date.now(); localStorage.setItem('lesdag-staat', JSON.stringify(s)); });
  await open(page, '#nu', '2026-11-16T15:00:00+01:00');
  L = await lijst(page); ok(L.length === 1, 'tweede start op dezelfde dag maakt een extra kopie'); ok(/Oorspronkelijke taak/.test(await ruw()) && !/Aangepaste taak/.test(await ruw()), 'kopie van vandaag is overschreven');
  // 3. een nieuwe dag geeft een nieuwe kopie met de dan geldende stand
  await open(page, '#nu', '2026-11-17T09:00:00+01:00');
  L = await lijst(page); ok(L.length === 2 && L[0].dag === '2026-11-17', 'nieuwe dag geeft geen nieuwe kopie: ' + JSON.stringify(L));
  // 4. bewaartermijn: de laatste 14
  await page.evaluate(async () => { for (let i = 1; i <= 20; i++) await AUTOKOPIE.maak('2026-10-' + String(i).padStart(2, '0'), JSON.stringify({ v: 1, updated: 1, rooster: [] })); });
  L = await lijst(page); ok(L.length === 14, 'bewaart ' + L.length + ' kopieën in plaats van 14'); ok(L[0].dag === '2026-11-17' && L[13].dag > '2026-10-05', 'oudste kopieën zijn niet als eerste weg: ' + L[13].dag);
  // 5. kopieën van kapotte of lege staten worden niet gemaakt (nieuwe browser, lege opslag)
  const b = await nieuw(); await b.page.addInitScript(() => { try { localStorage.setItem('lesdag-staat', JSON.stringify({ v: 1, updated: 0 })); } catch (e) {} });
  await open(b.page, '#nu', '2026-11-16T09:00:00+01:00'); const lb = await lijst(b.page); ok(lb.length <= 1, 'meer dan één kopie bij een lege staat'); await b.ctx.close();

  // 6. Instellingen toont de lijst; terugzetten vraagt hetzelfde als Kopie terugzetten en zet echt terug
  await open(page, '#instellingen', '2026-11-17T10:00:00+01:00');
  const knoppen = await page.$$('[data-akterug]'); ok(knoppen.length === 14, 'Instellingen toont ' + knoppen.length + ' kopieën, niet 14');
  const bericht = []; let accepteer = false; page.removeAllListeners('dialog'); page.on('dialog', d => { bericht.push(d.message()); accepteer ? d.accept() : d.dismiss(); });
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('lesdag-staat')); s.taken = [{ id: 'tk1', titel: 'Vandaag verpest' }]; s.updated = Date.now(); localStorage.setItem('lesdag-staat', JSON.stringify(s)); });
  await page.reload({ waitUntil: 'load' }); await H.wacht(page); await page.waitForTimeout(500);
  await page.click('[data-akterug="2026-11-16"]'); await page.waitForTimeout(500);
  ok(bericht.length === 1 && /^Kopie van .* terugzetten\?/.test(bericht[0]) && /Daarin:/.test(bericht[0]) && /Nu op dit apparaat:/.test(bericht[0]) && /Alles op dit apparaat wordt vervangen/.test(bericht[0]), 'vraag wijkt af van Kopie terugzetten: ' + JSON.stringify(bericht[0]));
  ok(/Vandaag verpest/.test(await page.evaluate(() => localStorage.getItem('lesdag-staat'))), 'nee op de vraag veranderde toch iets');
  accepteer = true; await page.click('[data-akterug="2026-11-16"]'); await page.waitForTimeout(600);
  const na = await page.evaluate(() => localStorage.getItem('lesdag-staat')); ok(/Oorspronkelijke taak/.test(na) && !/verpest/.test(na), 'terugzetten zet de stand van die dag niet terug');
  ok(await page.evaluate(() => /Kopie teruggezet/.test(document.querySelector('#toast').innerText) && !!document.querySelector('.toast-terug')), 'geen melding met Ongedaan maken na het terugzetten');
  await page.click('.toast-terug'); await page.waitForTimeout(400);
  ok(/Vandaag verpest/.test(await page.evaluate(() => localStorage.getItem('lesdag-staat'))), 'Ongedaan maken zet de stand van vóór het terugzetten niet terug');
  await ctx.close();

  // 6b. Dag afsluiten maakt een tweede kopie van die dag met de invoer van de dag; opnieuw afsluiten ververst die, de ochtendkopie blijft
  const e = await nieuw(); await open(e.page, '#nu', '2026-11-16T09:00:00+01:00');
  await e.page.evaluate(() => { const s = JSON.parse(localStorage.getItem('lesdag-staat')); s.taken = [{ id: 'tk1', titel: 'Invoer van de middag' }]; s.updated = Date.now(); localStorage.setItem('lesdag-staat', JSON.stringify(s)); });
  await open(e.page, '#nu', '2026-11-16T16:00:00+01:00');
  const sluit = () => e.page.evaluate(() => { const b = document.createElement('button'); b.dataset.afsluiten = '2026-11-16'; document.body.appendChild(b); b.click(); b.remove(); });
  await sluit(); await e.page.waitForTimeout(400);
  let Le = await lijst(e.page); ok(Le.length === 2 && Le[0].dag === '2026-11-16-eind' && Le[0].eind === true && Le[1].dag === '2026-11-16', 'Dag afsluiten geeft geen tweede kopie: ' + JSON.stringify(Le));
  ok(await e.page.evaluate(async () => !!(await AUTOKOPIE.haal('2026-11-16-eind')).taken.find(t => t.titel === 'Invoer van de middag') && !(await AUTOKOPIE.haal('2026-11-16')).taken.find(t => t.titel === 'Invoer van de middag')), 'eindkopie mist de invoer van de dag of de ochtendkopie is veranderd');
  await sluit(); await e.page.waitForTimeout(300); Le = await lijst(e.page); ok(Le.length === 2, 'opnieuw afsluiten maakt een derde kopie');
  await e.page.evaluate(async () => { for (let i = 1; i <= 20; i++) { await AUTOKOPIE.maak('2026-10-' + String(i).padStart(2, '0'), JSON.stringify({ v: 1, updated: 1, rooster: [] })); await AUTOKOPIE.maak('2026-10-' + String(i).padStart(2, '0'), JSON.stringify({ v: 1, updated: 1, rooster: [] }), undefined, true); } });
  Le = await lijst(e.page); ok(Le.length === 28 && Le[0].dag === '2026-11-16-eind', 'bewaren: ' + Le.length + ' kopieën, verwacht 14 dagen met elk twee'); await e.ctx.close();

  // 7. zonder IndexedDB: de app start gewoon, Instellingen legt het uit
  const z = await nieuw(); await z.page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); });
  await open(z.page, '#instellingen', '2026-11-16T09:00:00+01:00'); const zt = await z.page.evaluate(() => document.querySelector('#main').innerText);
  ok(/niet beschikbaar/.test(zt) && !/Dit scherm lukt nu niet/.test(zt), 'zonder IndexedDB: ' + zt.slice(0, 80)); await z.ctx.close();

  ok(!fouten_pagina.filter(m => !/IndexedDB|indexedDB/.test(m)).length, 'uitzonderingen in de pagina: ' + fouten_pagina.slice(0, 2).join(' | '));
  await T.stop(); console.log(fouten ? fouten + ' fout(en).' : 'automatische kopie: alles goed (' + n + ' controles)'); process.exit(fouten ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
