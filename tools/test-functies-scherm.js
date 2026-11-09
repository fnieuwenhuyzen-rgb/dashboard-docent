// node tools/test-functies-scherm.js: de vier functies in de browser, met verzonnen rooster (test-hulp.js) en een vaste klok.
// Elke functie doet wat Frans op 9-11-2026 koos. Playwright via NODE_PATH, zie tools/TESTEN.md.
const path = require('path'); const H = require('./test-hulp.js'); const pub = path.join(__dirname, '..', 'public');
let fouten = 0, n = 0; const slecht = t => { console.log('  FOUT ' + t); fouten++; }; const ok = (c, t) => { n++; if (!c) slecht(t); };
const paginaFouten = [];
(async () => {
  const T = await H.start(pub);
  // nieuwe browsercontext met staat; iso = de vaste klok
  const open = async (hash, iso, { staat } = {}) => {
    const ctx = await T.browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block' }); await H.sluis(ctx, T.basis);
    await ctx.addInitScript(([s]) => { try { if (!sessionStorage.getItem('ingesteld')) { localStorage.setItem('lesdag-staat', JSON.stringify(s)); sessionStorage.setItem('ingesteld', '1'); } } catch (e) {} }, [staat || H.STAAT]);
    const page = await ctx.newPage(); page.on('pageerror', e => paginaFouten.push(String(e.message).slice(0, 200)));
    await page.clock.setFixedTime(new Date(iso)); await page.goto(T.basis + hash, { waitUntil: 'load' }); await H.wacht(page); await page.waitForTimeout(250);
    return { ctx, page, tekst: () => page.evaluate(() => document.querySelector('#main').innerText) };
  };
  try {
    // 0. geen schakelaars meer: de functies staan gewoon aan
    { const { ctx, tekst } = await open('#instellingen', '2026-11-20T10:00:00+01:00');
      ok(!/Proeffuncties/.test(await tekst()), 'Instellingen heeft nog een kaart Proeffuncties'); await ctx.close(); }
    // 1. Week afsluiten
    const WSTAAT = Object.assign({}, H.STAAT, { goed: { '2026-11-16': 'De alten pakten maat 17.', '2026-11-18': 'Vwo 4 speelde het schema zonder blad.' }, afwijkingen: [{ id: 'af1', g: 'tv4', wat: 'Generale vervallen', bericht: 'De generale komt niet meer.', d: '2026-11-17', soort: 'les' }] });
    { const { ctx, page, tekst } = await open('#nu', '2026-11-20T16:20:00+01:00', { staat: WSTAAT });
      const t1 = await tekst();
      ok(/Week afsluiten/.test(t1) && /Wat ging goed deze week?/.test(t1), 'week afsluiten: vrijdag toont geen Week afsluiten');
      ok(/De alten pakten maat 17./.test(t1) && /Vwo 4 speelde het schema/.test(t1), 'week afsluiten: zinnen van de week ontbreken');
      ok(/Anders dan de studiewijzer/i.test(t1) && /Generale vervallen/.test(t1) && /Kopieer bericht/.test(t1), 'week afsluiten: blok Anders dan de studiewijzer ontbreekt');
      ok(/Volgende week/i.test(t1) && /tv4 · praktijktoets P1 op ma/.test(t1) && /staat vast/.test(t1), 'week afsluiten: toets van volgende week ontbreekt: ' + t1.slice(-400));
      const nOpen = +(await page.getAttribute('[data-afsluiten]', 'data-open')); ok(nOpen === 0 || (await page.innerText('[data-afsluiten]')).includes(nOpen + ' nog open'), 'keuze 2: aantal staat niet op de knop');
      await page.click('[data-afsluiten]'); await page.waitForTimeout(300);
      const t2 = await tekst(); const melding = await page.evaluate(() => document.body.innerText); ok(/Week afgesloten/.test(melding) && /Ongedaan maken/.test(melding), 'week afsluiten: geen melding met Ongedaan maken'); ok(nOpen === 0 || melding.includes('nog open.'), 'keuze 2: melding noemt niet wat er open blijft');
      ok(await page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-staat')).afgesloten['2026-11-20'] === true), 'week afsluiten: dag niet afgesloten');
      ok(/Je week is afgesloten/i.test(t2), 'week afsluiten: stille tekst na afsluiten ontbreekt: ' + t2.slice(0, 200)); await ctx.close(); }
    { const { ctx, tekst } = await open('#nu', '2026-11-19T16:20:00+01:00', { staat: WSTAAT });
      const t3 = await tekst(); ok(/Dag afsluiten/.test(t3) && !/Week afsluiten/.test(t3) && !/Volgende week/i.test(t3), 'week afsluiten: donderdag is geen weekafsluiting'); await ctx.close(); }
    { const { ctx, tekst } = await open('#nu', '2026-11-23T08:10:00+01:00', { staat: WSTAAT });
      ok((await tekst()).includes('Deze week: praktijktoets tv4 (ma).'), 'week afsluiten: maandagregel ontbreekt'); await ctx.close(); }
    { const { ctx, tekst } = await open('#nu', '2026-11-19T08:10:00+01:00', { staat: Object.assign({}, WSTAAT, { goed: { '2026-11-18': 'Vwo 4 speelde het schema zonder blad.' } }) });
      ok(!/speelde het schema/.test(await tekst()), 'keuze 4: de zin van gisteren staat op Nu'); await ctx.close(); }
    { const { ctx, tekst } = await open('#nu', '2027-03-11T16:20:00+01:00', { staat: WSTAAT });
      ok(/Week afsluiten/.test(await tekst()), 'keuze 1: de donderdag voor een vrije vrijdag is geen weekafsluiting'); await ctx.close(); }
    { const { ctx, tekst } = await open('#nu', '2027-03-10T16:20:00+01:00', { staat: WSTAAT });
      ok(!/Week afsluiten/.test(await tekst()), 'keuze 1: de woensdag ervoor is wel een weekafsluiting'); await ctx.close(); }
    { const { ctx, tekst } = await open('#nu', '2026-11-24T08:10:00+01:00', { staat: WSTAAT });
      ok(!/Deze week:/.test(await tekst()), 'week afsluiten: maandagregel op dinsdag'); await ctx.close(); }
    // 2. Twee lessen samenvoegen (bij Krap voor de toets)
    const KSTAAT = Object.assign({}, H.STAAT, { voortgang: { tv4: { 'vwo4:2.1': { st: 'gegeven', d: '2026-09-07' } } } });
    const krap = async () => { const o = await open('#nu', '2026-11-17T10:00:00+01:00', { staat: KSTAAT }); await o.page.click('[data-krapopen]'); await o.page.waitForTimeout(200); return o; };
    { const { ctx, page, tekst } = await krap(); const t = await tekst();
      ok(/Twee lessen samenvoegen/.test(t), 'samenvoegen: de optie ontbreekt');
      ok(!/aan het begin van de toetsles/.test(t), 'samenvoegen: de optie "begin van de toetsles" blijft staan (keuze 7)');
      await page.click('[data-krapoptie="samen"]'); await page.waitForTimeout(200);
      ok(await page.evaluate(() => !!document.querySelector('[data-samenles="a"]') && !!document.querySelector('[data-samenles="b"]')), 'samenvoegen: de twee lessen om uit te kiezen ontbreken');
      ok(await page.evaluate(() => document.querySelector('#krapForm button[type=submit]').disabled), 'samenvoegen: Doen staat aan zonder gekozen fasen');
      const fasen = w => page.evaluate(w => [...document.querySelectorAll('[data-samenfase^="' + w + '|"]')].length, w);
      const nA = await fasen('a'); const nB = await fasen('b'); ok(nA >= 3 && nB >= 3, 'samenvoegen: de fasen van de lessen ontbreken (' + nA + ', ' + nB + ')');
      for (let i = 0; i < nA; i++) await page.click('[data-samenfase="a|' + i + '"]');
      await page.click('[data-samenfase="b|0"]'); await page.waitForTimeout(150);
      let teller = await page.evaluate(() => document.querySelector('.samenteller').innerText);
      ok(/te veel/.test(teller) && await page.evaluate(() => document.querySelector('#krapForm button[type=submit]').disabled), 'samenvoegen: te veel minuten maar Doen kan toch: ' + teller);
      await page.click('[data-samenfase="a|0"]'); await page.waitForTimeout(150); // de eerste fase van les A (5 minuten) weer weg
      teller = await page.evaluate(() => document.querySelector('.samenteller').innerText);
      ok(/45 van 45 minuten/.test(teller) && /Past precies/.test(teller) && await page.evaluate(() => !document.querySelector('#krapForm button[type=submit]').disabled), 'samenvoegen: 45 van 45 past niet: ' + teller);
      await page.click('#krapForm button[type=submit]'); await page.waitForTimeout(300);
      const s = await page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-staat')));
      const ids = Object.keys(s.les || {}).filter(k => (s.les[k] || {}).samengevoegd); ok(ids.length === 1, 'samenvoegen: geen samengevoegde les opgeslagen');
      const A = ids[0], Bid = s.les[A].samengevoegd.met; ok(s.les[A].fasen.length === nA - 1 + 1, 'samenvoegen: aantal fasen klopt niet: ' + (s.les[A].fasen || []).length + ' van ' + nA);
      ok(s.voortgang.tv4[Bid] && s.voortgang.tv4[Bid].st === 'overgeslagen' && s.voortgang.tv4[Bid].hoortBij === A, 'samenvoegen: de tweede les is niet overgeslagen met hoortBij');
      ok(/ \+ /.test(s.les[A].titel) && s.afwijkingen.some(a => a.samenA === A && /samengevoegd/.test(a.wat)), 'samenvoegen: titel of afwijking ontbreekt');
      // ongedaan maken: de eigen aanpassing en de status zijn terug, de les-id's zijn niet veranderd
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /Ongedaan maken/i.test(b.textContent)); if (b) b.click(); }); await page.waitForTimeout(300);
      const s2 = await page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-staat')));
      ok(!(s2.les || {})[A] && !(s2.voortgang.tv4 || {})[Bid] && !(s2.afwijkingen || []).some(a => a.samenA), 'samenvoegen: ongedaan maken herstelt niet');
      await ctx.close(); }
    // 3. Jaar: waar is nog lucht
    { const { ctx, page, tekst } = await open('#jaar', '2026-11-17T10:00:00+01:00', { staat: KSTAAT });
      const t = await tekst();
      ok(await page.evaluate(() => document.querySelectorAll('.jr-score .jr-noot.lucht').length > 0), 'jaar: geen groene noot voor een les die kan vervallen');
      ok(await page.evaluate(() => document.querySelectorAll('.jr-stand').length === 1), 'jaar: precies één regel (alleen tv4 zit krap)');
      ok(/tv4 · Krap voor P1\. (Eén les kan vervallen|\d+ lessen kunnen vervallen|Geen les kan vervallen)\./.test(t), 'jaar: regel bij de krappe klas ontbreekt: ' + t.slice(0, 300));
      ok(!/heeft nog \d+ lessen te geven/.test(t), 'jaar: de oude melding onder de partituur staat er nog naast de regel');
      ok(/kan vervallen \(generale/.test(t), 'jaar: legenda mist de groene noot');
      ok(await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('lesdag-staat')).voortgang) === '{"tv4":{"vwo4:2.1":{"st":"gegeven","d":"2026-09-07"}}}'), 'jaar: Jaar heeft de voortgang veranderd (alleen lezen)');
      await ctx.close(); }
    // 4. Week afsluiten: weekend en afwezig
    { const { ctx, tekst } = await open('#nu', '2026-11-21T11:00:00+01:00', { staat: Object.assign({}, WSTAAT, { afgesloten: { '2026-11-20': true } }) });
      ok(/Je week is afgesloten\. Maandag staat klaar\./.test(await tekst()), 'weekend: de zin Je week is afgesloten ontbreekt'); await ctx.close(); }
    { const { ctx, tekst } = await open('#nu', '2026-11-21T11:00:00+01:00', { staat: WSTAAT });
      ok(!/Je week is afgesloten/.test(await tekst()), 'weekend: week niet afgesloten maar de zin staat er wel'); await ctx.close(); }
    { const AFW = Object.assign({}, WSTAAT, { afwezig: { '2026-11-20': { herstel: {} } } });
      const v = await open('#nu', '2026-11-20T16:20:00+01:00', { staat: AFW }); const t = await v.tekst();
      ok(!/Week afsluiten/.test(t) && !/Dag afsluiten/.test(t), 'afwezig op de laatste werkdag: toch een afsluitkaart'); await v.ctx.close();
      const z = await open('#nu', '2026-11-21T11:00:00+01:00', { staat: AFW });
      ok(!/Je week is afgesloten/.test(await z.tekst()), 'afwezig op de laatste werkdag: toch de zin in het weekend'); await z.ctx.close();
      const d = await open('#nu', '2026-11-19T16:20:00+01:00', { staat: AFW });
      ok(/Dag afsluiten/.test(await d.tekst()), 'afwezig op vrijdag: donderdag hoort gewoon Dag afsluiten te zijn'); await d.ctx.close(); }
    // 5. Samenvoegen met een les zonder fasen, dezelfde les niet twee keer, bewerken en terug naar de leergang
    { const RSTAAT = Object.assign({}, KSTAAT, { rooster: KSTAAT.rooster.concat([{ id: 't9', dag: 3, start: '11:00', eind: '11:45', groep: 'tv4', lokaal: '009' }]) });
      const o = await open('#nu', '2026-11-17T10:00:00+01:00', { staat: RSTAAT }); const { ctx, page } = o; const staat = () => page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-staat')));
      const paneel = async () => { await page.click('[data-krapopen]'); await page.waitForTimeout(200); await page.click('[data-krapoptie="samen"]'); await page.waitForTimeout(200); };
      const opties = w => page.evaluate(w => [...document.querySelectorAll('[data-samenles="' + w + '"] option')].map(x => [x.value, x.textContent]), w);
      await paneel(); const a0 = await opties('a'), b0 = await opties('b'); const va = await page.inputValue('[data-samenles="a"]'), vb = await page.inputValue('[data-samenles="b"]');
      ok(va && vb && va !== vb && !a0.some(x => x[0] === vb) && !b0.some(x => x[0] === va), 'samenvoegen: dezelfde les staat in beide keuzelijsten');
      const eerste = a0[0][0], tweede = (a0[1] || b0[0])[0]; const titel2 = (a0.concat(b0).find(x => x[0] === tweede) || [])[1];
      await page.evaluate(id => { const s = JSON.parse(localStorage.getItem('lesdag-staat')); s.les = s.les || {}; s.les[id] = { fasen: [] }; localStorage.setItem('lesdag-staat', JSON.stringify(s)); }, tweede);
      await page.reload({ waitUntil: 'load' }); await H.wacht(page); await page.waitForTimeout(250); await paneel();
      await page.selectOption('[data-samenles="a"]', eerste); await page.waitForTimeout(150); await page.selectOption('[data-samenles="b"]', tweede); await page.waitForTimeout(150);
      ok(await page.evaluate(() => document.querySelectorAll('[data-samenfase^="b|"]').length === 0 && /Ook in deze les/.test(document.querySelector('.samen').innerText)), 'samenvoegen: een les zonder fasen krijgt geen uitleg over Ook in deze les');
      ok(await page.evaluate(() => document.querySelector('#krapForm button[type=submit]').disabled), 'samenvoegen: Doen staat aan zonder fase uit de les met fasen');
      await page.click('[data-samenfase="a|0"]'); await page.waitForTimeout(150); ok(await page.evaluate(() => !document.querySelector('#krapForm button[type=submit]').disabled), 'samenvoegen: Doen blijft uit met een les zonder fasen');
      await page.click('#krapForm button[type=submit]'); await page.waitForTimeout(300);
      let s = await staat(); ok(s.les[eerste] && JSON.stringify(s.les[eerste].ook) === JSON.stringify([titel2]) && s.les[eerste].fasen.length === 1 && s.voortgang.tv4[tweede].hoortBij === eerste, 'samenvoegen: de regel Ook in deze les is niet bewaard: ' + JSON.stringify(s.les[eerste]));
      // de regel staat op de leskaart: op Nu vlak voor de les, op Dag en in de lesmodus
      await page.clock.setFixedTime(new Date('2026-11-18T10:50:00+01:00')); await page.reload({ waitUntil: 'load' }); await H.wacht(page); await page.waitForTimeout(250);
      ok((await o.tekst()).includes('Ook in deze les: ' + titel2 + '.'), 'samenvoegen: de regel staat niet op Nu vlak voor de les');
      await page.click('[data-start]'); await page.waitForTimeout(400);
      ok(await page.evaluate(() => /Ook in deze les/.test(document.body.innerText)), 'samenvoegen: de regel staat niet op jouw kaart in de lesmodus');
      await page.goto(T.basis + '#dag', { waitUntil: 'load' }); await H.wacht(page); await page.waitForTimeout(250);
      ok((await o.tekst()).includes('Ook in deze les: ' + titel2 + '.'), 'samenvoegen: de regel staat niet op Dag');
      // bewerken laat de samenvoeging staan, Terug naar de leergang maakt hem helemaal los
      await page.evaluate(id => { const b = document.querySelector('[data-bewerk="' + id + '"]'); b.click(); }, eerste); await page.waitForTimeout(250);
      await page.evaluate(() => document.querySelector('#drawer button[type=submit]').click()); await page.waitForTimeout(250);
      s = await staat(); ok(s.les[eerste].samengevoegd && s.les[eerste].samengevoegd.met === tweede && s.les[eerste].ook, 'bewerken: de samenvoeging is weg na opslaan');
      await page.evaluate(id => { const b = document.querySelector('[data-bewerk="' + id + '"]'); b.click(); }, eerste); await page.waitForTimeout(250);
      await page.evaluate(() => document.querySelector('[data-herstel]').click()); await page.waitForTimeout(250);
      s = await staat(); ok(!(s.voortgang.tv4 || {})[tweede] && !(s.afwijkingen || []).some(a => a.samenA) && !(s.les[eerste] || {}).samengevoegd, 'Terug naar de leergang: de tweede les blijft overgeslagen');
      await ctx.close(); }
    //FUNCTIE-SCHERMTESTS
  } finally { await T.stop(); }
  ok(!paginaFouten.length, 'uitzonderingen op de pagina: ' + paginaFouten.slice(0, 3).join(' | '));
  console.log(fouten ? fouten + ' fout(en).' : 'functies in de browser: alles goed (' + n + ' controles)'); process.exit(fouten ? 1 : 0);
})().catch(e => { console.log('FOUT ' + e.stack); process.exit(1); });
