// node tools/test-routes-toetsdag.js [--poort=8761] [--toon]
// Routetest toetsdag: P1 vwo 4 (klas tv4) van begin tot eind, zoals Frans het meemaakt (bevindingen 8, 56, 58 tot en met 61 en 67 tot en met 70 uit
// handboek/feedback-kritische-docent-ronde-2.md): P1 staat op ma 23-11 (datum in basis.json gaat voor de lesweek), de dagen ervoor mag er geen P1 staan,
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

  /* 1. de dagen voor de toets: P1 staat op ma 23-11 en nergens anders (bevinding 8 en 56) */
  await stap('de dagen voor de toets', async () => {
    await op('09-11', '09:16', 'nu'); let t = await tekst();
    waar('9-11 Nu: de generale staat, de toets niet', !/Praktijktoets|(?<!Generale )P1/.test(t), (t.match(/.{0,80}(P1|Praktijktoets).{0,80}/g) || []).join(' // '));
    await op('09-11', '09:16', 'vandaag'); t = await tekst(); waar('9-11 Dag: geen Praktijktoets', !/Praktijktoets/.test(t), t.slice(0, 300));
    await op('09-11', '09:16', 'beoordelen'); t = await tekst(); waar('9-11 Beoordelen: er staat vandaag geen toets', /Vandaag staat er geen toets/.test(t), t.slice(0, 300));
    await op('09-11', '09:16', 'jaar/' + G); t = await tekst();
    waar('klasblad: één datum voor P1 (ma 23 nov), niet ma 9 nov', /P1 ma 23 nov/.test(t) && !/P1 ma 9 nov/.test(t) && !/ma 9 nov/.test(t.replace(/Maandag 9 november/g, '')), (t.match(/[^.]{0,60}P1[^.]{0,60}/g) || []).join(' | '));
    await op('16-11', '09:16', 'nu'); await page.keyboard.press('Control+k'); await page.keyboard.type('pt1'); await page.waitForTimeout(200);
    const k = await page.locator('body').innerText(); waar('16-11 Ctrl K "pt1": een toets van volgende week heet niet geweest', !/geweest/i.test((k.match(/P1[^\n]*\n?[^\n]*/g) || []).join(' ')), (k.match(/[^\n]*pt1[^\n]*/gi) || []).join(' | '));
  });

  /* 1b. een half ingevuld verplaats-paneel sluit als je van scherm wisselt (bevinding 68) */
  await stap('verplaats-paneel sluit bij routewissel', async () => {
    await op('09-11', '09:16', 'jaar/' + G); await klik('[data-ankeropen]'); await page.waitForSelector('#avUur');
    await page.fill('#avReden', 'half ingevuld'); await page.evaluate(() => { location.hash = '#nu'; }); await page.waitForFunction(() => location.hash === '#nu'); await page.waitForTimeout(100);
    waar('op Nu staat geen verplaatsformulier', !(await page.$('#avUur, #ankerForm')), (await tekst()).slice(0, 200));
    await page.evaluate(g => { location.hash = '#jaar/' + g; }, G); await page.waitForTimeout(150);
    waar('terug op het klasblad is het formulier dicht en leeg', !(await page.$('#avUur')));
  });

  /* 1c. P1 zelf verplaatst naar wo 25-11 8:30 (bevinding 69), in een eigen wegwerpbrowser zodat P1 hierboven en hieronder op ma 23-11 blijft staan:
     het bericht aan de klas staat tot die nieuwe datum en vervalt dan */
  await stap('verplaatsen en het bericht aan de klas', async () => {
    const ctx2 = await h.browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block' }); await H.sluis(ctx2, h.basis);
    await ctx2.addInitScript(staat => { try { if (!sessionStorage.getItem('lesdag-test-ingesteld')) { localStorage.setItem('lesdag-staat', JSON.stringify(staat)); sessionStorage.setItem('lesdag-test-ingesteld', '1'); } } catch (e) {} }, STAAT);
    const p2 = await ctx2.newPage(); p2.setDefaultTimeout(5000);
    const op2 = async (dag, hm, hash) => { await p2.clock.setFixedTime(new Date(tijd(dag, hm))); await p2.goto(h.basis + '#' + hash); await p2.reload(); await H.wacht(p2); return (await p2.locator('#main').innerText()).replace(/\s+/g, ' '); };
    await op2('09-11', '09:16', 'jaar/' + G); await p2.click('[data-ankeropen]'); await p2.waitForSelector('#avUur');
    await p2.selectOption('#avUur', '2026-11-25|t2'); await p2.fill('#avReden', 'toetsweek erachter'); await p2.click('#ankerForm button.hoofd'); await p2.waitForTimeout(200);
    const a = (JSON.parse(await p2.evaluate(() => localStorage.getItem('lesdag-staat'))).afwijkingen || [])[0]; waar('de verplaatsing is vastgelegd met bericht en nieuwe datum', !!a && /P1 verplaatst/.test(a.wat) && a.berichtTot === '2026-11-25', JSON.stringify(a));
    for (const [dag, hm, ja] of [['09-11', '09:16', true], ['24-11', '08:20', true], ['25-11', '08:20', false]]) { const t = await op2(dag, hm, 'vandaag'); const er = /Bericht aan de klas/i.test(t) && !!(await p2.$('[data-berichtklaar]'));
      waar(`${dag} ${hm} Nu: bericht aan de klas ${ja ? 'staat er' : 'is vervallen (de toets is die dag, het bericht is oud nieuws)'}`, er === ja, t.slice(0, 200)); }
    await ctx2.close();
  });

  /* 1d. einde van periode 1 (bevinding 67): vr 13-11 15:00 staat er per klas wat nog mist */
  await stap('einde periode: wat ontbreekt per klas', async () => {
    for (const hash of ['beoordelen', 'jaar']) { await op('13-11', '15:00', hash); const t = await tekst();
      waar(`${hash} vr 13-11: kaart "Periode 1 sluit vr 13 nov"`, /Periode 1 sluit vr 13 nov/.test(t), t.slice(0, 300));
      waar(`${hash} vr 13-11: tv4 P1 nog niet gescoord, staat op ma 23 nov`, /tv4 P1: nog niet gescoord, staat op ma 23 nov/.test(t), (t.match(/.{0,60}Periode 1.{0,160}/g) || []).join(' // ')); }
    await op('13-11', '15:00', 'beoordelen'); await klik('.periode [data-beoordeel]'); await page.waitForFunction(() => /^#beoordelen\/pt1-vwo4\/tv4/.test(location.hash)); waar('de knop in de kaart opent de scorekaart', true);
  });

  /* 2. de toetsdag: ma 23-11 om 9:05 staat P1 op Nu en Dag, en in Beoordelen onder Vandaag (bevinding 8 en 56) */
  await stap('toetsdag op Nu, Dag en Beoordelen', async () => {
    await op('23-11', '09:05', 'nu'); let t = await tekst();
    waar('23-11 Nu: P1 staat klaar', /Praktijktoets 1/.test(t), t.slice(0, 300));
    waar('23-11 Nu: P1 is niet "gemist"', !/P1 stond op/.test(t), (t.match(/[^.]*stond op[^.]*/g) || []).join(' | '));
    await op('23-11', '09:05', 'vandaag'); t = await tekst(); waar('23-11 Dag: Praktijktoets 1', /Praktijktoets 1/.test(t));
    await op('23-11', '09:05', 'beoordelen'); t = await tekst(); waar('23-11 Beoordelen: P1 onder Vandaag', !/Vandaag staat er geen toets/.test(t) && /P1/.test(t), t.slice(0, 300));
  });

  /* 3. op het toetsmoment één tik naar de scorekaart (bevinding 58) */
  await stap('één tik naar de scorekaart', async () => {
    await op('23-11', '09:13', 'nu'); waar('9:13 Nu (over 2 minuten): knop Beoordelen P1', (await knoppen('[data-beoordeel]')).some(x => /Beoordelen P1/.test(x)), await tekst());
    await op('23-11', '09:16', 'nu'); const kn = await knoppen('[data-beoordeel]'); waar('9:16 Nu (de les loopt): knop Beoordelen P1', kn.some(x => /Beoordelen P1/.test(x)), (await tekst()).slice(0, 300));
    await klik('[data-beoordeel]'); await page.waitForFunction(() => /^#beoordelen\/pt1-vwo4\/tv4/.test(location.hash));
    await page.waitForSelector('#bmLijst, .bm-status'); waar('na één tik staat de scorekaart van P1 tv4 open', /P1/.test(await tekst()), (await tekst()).slice(0, 200));
  });

  /* 4. scoren op de toetsdag: klassenlijst plakken, vier leerlingen scoren, een afwezige (bevinding 70: eerst vragen als er al scores staan) */
  const scoorAlles = async (v, zelf) => { for (const c of KRITERIA) await klik(`.bm-scoor button[data-bmscore="${c.id}|${v}"]`); await klik(`.bm-scoor button[data-bmzelf="${zelf}"]`); };
  const lid = {}; // naam -> leerling-id
  await stap('klas inlezen en scoren', async () => {
    await op('23-11', '09:16', 'beoordelen/pt1-vwo4/' + G); await page.waitForSelector('#bmLijst');
    await page.fill('#bmLijst', NAMEN.join('\n')); await klik('[data-bm="lijstopslaan"]'); await page.waitForSelector('[data-bm="concert"]');
    ((await staat()).beoord.lijsten[G] || []).forEach(x => { lid[x.naam] = x.id; }); check('klassenlijst staat erin', Object.keys(lid), NAMEN);
    for (const [i, n] of NAMEN.slice(0, 3).entries()) { await klik(`[data-bmkies="${lid[n]}"]`);
      await page.selectOption('select[data-bmveld="Mijn partij"]', ['Piano', 'Bas', 'Gitaar'][i]); await page.selectOption('select[data-bmveld="Niveau"]', 'Niveau 3');
      await scoorAlles([5, 8, 6][i], [6, 8, 7][i]); }
    const T = await toetsStaat(); waar('Anna, Bram en Cato hebben zes scores en een zelfbeoordeling', NAMEN.slice(0, 3).every(n => Object.keys(T.ll[lid[n]].s).length === KRITERIA.length && T.ll[lid[n]].zelf != null), JSON.stringify(T.ll));
  });
  await stap('afwezig met scores: eerst vragen', async () => {
    await klik(`[data-bmkies="${lid[NAMEN[1]]}"]`); // Bram heeft alle scores en wordt per ongeluk op afwezig gezet
    dialogen.length = 0; h.nee = true; page.removeAllListeners('dialog'); page.on('dialog', d => { dialogen.push({ soort: d.type(), tekst: d.message() }); (h.nee ? d.dismiss() : d.accept()).catch(() => {}); });
    await page.check('input[data-bmaf]').catch(() => {}); await page.waitForTimeout(150);
    waar('afwezig bij een leerling met scores vraagt eerst', dialogen.some(d => /al scores/.test(d.tekst)), JSON.stringify(dialogen));
    let T = await toetsStaat(); waar('na "nee" is Bram niet afwezig en houdt zijn scores', !T.ll[lid[NAMEN[1]]].af && Object.keys(T.ll[lid[NAMEN[1]]].s).length === KRITERIA.length, JSON.stringify(T.ll[lid[NAMEN[1]]]));
    waar('en het vinkje staat weer uit', !(await page.isChecked('input[data-bmaf]')));
    // Daan heeft nog niets: afwezig zetten kost geen vraag
    dialogen.length = 0; await klik(`[data-bmkies="${lid[NAMEN[3]]}"]`); await page.check('input[data-bmaf]'); await page.waitForTimeout(100);
    waar('afwezig zonder scores vraagt niets', dialogen.length === 0, JSON.stringify(dialogen)); T = await toetsStaat(); waar('Daan staat afwezig', T.ll[lid[NAMEN[3]]].af === true);
    h.nee = false;
  });

  /* 5. afronden en de dag erna (bevinding 59): de toets is gegeven, er komt geen melding "stond op ma 23 nov en is nog niet afgevinkt" */
  await stap('afronden en de dag erna', async () => {
    await op('23-11', '16:20', 'beoordelen/pt1-vwo4/' + G); await klik('[data-bm="kolom"]'); await page.waitForSelector('[data-bm="kolomkopie"]');
    dialogen.length = 0; await klik('.bm-waarsch [data-bm="afronden"]'); await page.waitForTimeout(250);
    waar('afronden vraagt om bevestiging met 3 cijfers', dialogen.some(d => /3 cijfers vastleggen/.test(d.tekst)), JSON.stringify(dialogen));
    const T = await toetsStaat(); waar('drie cijfers staan vast, Daan niet', NAMEN.slice(0, 3).every(n => T.ll[lid[n]].vast) && !T.ll[lid[NAMEN[3]]].vast);
    const voort = (await staat()).voortgang[G]; waar('de toetsles staat op gegeven', voort['vwo4:10.1'] && voort['vwo4:10.1'].st === 'gegeven', JSON.stringify(voort['vwo4:10.1']));
    for (const [dag, hm, hash] of [['23-11', '16:20', 'nu'], ['24-11', '09:00', 'nu'], ['24-11', '09:00', 'vandaag']]) { await op(dag, hm, hash); const t = await tekst();
      waar(`${dag} ${hm} ${hash}: geen melding dat P1 nog niet is afgevinkt`, !/P1 stond op|nog niet afgevinkt/.test(t), (t.match(/.{0,60}(afgevinkt|stond op).{0,60}/g) || []).join(' // ')); }
  });

  /* 5b. dag erna: nog één leerling zonder cijfer (Daan, afwezig) */
  await stap('einde periode: één leerling mist nog', async () => {
    for (const hash of ['beoordelen', 'jaar']) { await op('24-11', '09:00', hash); const t = await tekst();
      waar(`${hash} 24-11: periode 1 sloot vr 13 nov en P1 mist 1 van 4 (1 moet nog inhalen)`, /Periode 1 sloot vr 13 nov/.test(t) && /P1: 1 van 4 zonder afgerond cijfer \(1 moet nog inhalen\)/.test(t), (t.match(/.{0,60}Periode 1.{0,200}/g) || []).join(' // ')); }
  });

  /* 6. inhalen (bevinding 60): Daan was afwezig; een regel blijft op Nu en Dag staan tot hij een cijfer heeft */
  await stap('inhalen blijft zichtbaar tot het gebeurd is', async () => {
    for (const [dag, hm, hash] of [['23-11', '16:20', 'nu'], ['24-11', '09:00', 'vandaag'], ['02-12', '08:40', 'nu'], ['07-12', '09:00', 'vandaag']]) { await op(dag, hm, hash); const t = await tekst();
      waar(`${dag} ${hash}: "1 leerling moet nog inhalen"`, /P1 1 leerling moet nog inhalen/.test(t), (t.match(/.{0,60}inhalen.{0,60}/g) || []).join(' // ')); }
    await op('07-12', '09:00', 'nu'); await klik('[data-beoordeel]:has-text("Open")'); await page.waitForSelector('.bm-lijst, [data-bmkies]');
    await klik(`[data-bmkies="${lid[NAMEN[3]]}"]`); await page.uncheck('input[data-bmaf]'); await scoorAlles(7, 7);
    await klik('[data-bm="kolom"]'); await page.waitForSelector('[data-bm="kolomkopie"]'); dialogen.length = 0; await klik('.bm-waarsch [data-bm="afronden"]'); await page.waitForTimeout(250);
    waar('Daan haalt in: 1 cijfer vastgelegd', dialogen.some(d => /1 cijfer vastleggen/.test(d.tekst)), JSON.stringify(dialogen));
    for (const hash of ['nu', 'vandaag']) { await op('07-12', '09:30', hash); waar(`na het cijfer van Daan staat er op ${hash} geen inhaalregel meer`, !/moet nog inhalen|moeten nog inhalen/.test(await tekst())); }
  });

  /* 7. kolom kopiëren en Magister (bevinding 61): na het kopiëren weet Frans wat er nog moet, tot hij "Staat in Magister" aantikt */
  await stap('kolom kopiëren en Magister', async () => {
    await op('07-12', '09:40', 'nu'); let t = await tekst();
    waar('Nu: de cijfers staan nog niet in Magister', /P1 de cijfers staan nog niet als ingevoerd in Magister/.test(t), (t.match(/.{0,60}Magister.{0,60}/g) || []).join(' // '));
    await op('07-12', '09:40', 'jaar/' + G); waar('klasblad: P1 "nog in Magister zetten"', (await knoppen('[data-beoordeel]')).some(x => /nog in Magister zetten/.test(x)), (await knoppen('[data-beoordeel]')).join(' | '));
    await op('07-12', '09:40', 'beoordelen/pt1-vwo4/' + G); await klik('[data-bm="kolom"]'); await page.waitForSelector('[data-bm="kolomkopie"]');
    await klik('[data-bm="kolomkopie"]'); await page.waitForTimeout(150);
    const kl = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
    waar('klembord: 4 regels met een cijfer (Anna 5,6 / Bram 8,0 ...)', kl.split('\n').filter(x => /^\d+,\d$/.test(x)).length === 4, JSON.stringify(kl));
    waar('na het kopiëren: de kaart zegt dat het nog niet in Magister staat', /nog niet als ingevoerd in Magister/.test(await tekst()));
    await klik('[data-bm="inmagister"]'); await page.waitForTimeout(100);
    waar('na "Staat in Magister" noemt de kaart de datum', /In Magister gezet op/.test(await tekst()), (await tekst()).slice(0, 300));
    for (const hash of ['nu', 'vandaag']) { await op('07-12', '09:45', hash); waar(`${hash}: geen regel meer over Magister`, !/P1 (de cijfers staan nog niet als ingevoerd|er zijn cijfers bijgekomen)/.test(await tekst()), (await tekst()).slice(0, 200)); }
    await op('07-12', '09:45', 'jaar/' + G); waar('klasblad: P1 "in Magister"', (await knoppen('[data-beoordeel]')).some(x => / · in Magister/.test(x)), (await knoppen('[data-beoordeel]')).join(' | '));
  });

  /* 8. alles staat vast en in Magister: de kaart verdwijnt een week na het einde van de periode */
  await stap('einde periode: klaar', async () => {
    for (const hash of ['beoordelen', 'jaar']) { await op('07-12', '10:00', hash); waar(`${hash} 7-12: geen kaart over periode 1 meer`, !/Periode 1 sloot/.test(await tekst()), (await tekst()).slice(0, 200)); }
  });

  await h.stop();
  const geen = fouten.length === 0;
  console.log(geen ? `toetsdag: ${nChecks} controles, alles goed (${((Date.now() - t0) / 1000).toFixed(0)} s)` : `toetsdag: ${fouten.length} fout(en) in ${nChecks} controles:\n  - ` + fouten.join('\n  - '));
  if (consoleFouten.length) console.log('consolefouten:\n  ' + consoleFouten.slice(0, 5).join('\n  '));
  process.exit(geen && !consoleFouten.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
