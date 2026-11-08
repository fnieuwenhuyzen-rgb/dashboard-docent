// node tools/test-schermen.js [--poort=8748] [--map=<andere public-map>] [--snel] [--breedte=1280,375] [--toon]
// Schermtest: opent Lesdag headless met een verzonnen rooster en loopt elk scherm langs op nagebootste tijden en twee breedtes.
// Faalt op: de foutmelding "Dit scherm lukt nu niet" (of "Lesdag start niet"), consolefouten/uitzonderingen, horizontale overloop.
// Playwright staat bewust NIET in de repo: installeer eenmalig buiten de repo (zie tools/TESTEN.md) en wijs ernaar met NODE_PATH:
//   NODE_PATH=C:/Users/nwn/lesdag-werk/_testgereedschap/node_modules node tools/test-schermen.js
// Browser: Microsoft Edge of Chrome die al op de laptop staan (LESDAG_BROWSER=<pad naar exe> om er een te kiezen).
// Exitcode 0 = alles goed, 1 = fouten, 2 = overgeslagen (geen Playwright of geen browser; test-alles meldt dat apart).
const cp = require('child_process'), net = require('net'), path = require('path'), fs = require('fs');
const args = process.argv.slice(2); const arg = (n, d) => { const a = args.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const SNEL = args.includes('--snel'), TOON = args.includes('--toon');
const BREEDTES = arg('breedte', '1280,375').split(',').map(Number);

let pw; try { pw = require('playwright-core'); } catch (e) { try { pw = require('playwright'); } catch (e2) { console.log('OVERGESLAGEN: Playwright niet gevonden (zet NODE_PATH, zie tools/TESTEN.md).'); process.exit(2); } }

// ---- verzonnen rooster, nooit echte namen ----
const GROEPEN = { tv4: 'vwo4', tv5: 'vwo5', th3: 'havo3', tb1: 'bb1', tm4: 'mavo4' }; // verzonnen groepscodes -> leergang
const uur = (id, dag, start, eind, groep, lokaal) => ({ id, dag, start, eind, groep, lokaal: lokaal || '009' });
const ROOSTER = [
  uur('t1', 1, '8:30', '9:15', 'tv4'), uur('t2', 1, '9:15', '10:00', 'tv4'), uur('t3', 1, '10:15', '11:00', 'tb1'), uur('t4', 1, '13:00', '13:45', 'th3'),
  uur('t5', 2, '8:30', '9:15', 'th3'), uur('t6', 2, '9:15', '10:00', 'tm4'), uur('t7', 2, '11:15', '12:00', 'tv5'),
  uur('t8', 3, '8:30', '9:15', 'tv4'), uur('t9', 3, '9:15', '10:00', 'tv4'), uur('t10', 3, '10:15', '11:00', 'tv5'),
  uur('t11', 4, '9:15', '10:00', 'tb1'), uur('t12', 4, '10:15', '11:00', 'tm4'),
  uur('t13', 5, '8:30', '9:15', 'th3'), uur('t14', 5, '9:15', '10:00', 'tb1'),
];
const STAAT = { v: 1, rooster: ROOSTER, groepLeergang: GROEPEN, magVanaf: '2026-08-01',
  beoord: { toetsen: {}, lijsten: { tb1: [{ id: 'l1', naam: 'Testleerling, Anna' }, { id: 'l2', naam: 'Testleerling, Bram' }, { id: 'l3', naam: 'Testleerling, Cato' }] } } };
// Nagebootste tijden (Nederlandse tijd). De les in "tijdens" is maandag 8:30-10:00 groep tv4.
const TIJDEN = [
  ['voor de eerste les', '2026-11-16T07:45:00+01:00'], ['tijdens een les', '2026-11-16T09:00:00+01:00'], ['in de pauze', '2026-11-16T10:05:00+01:00'],
  ['na de laatste les', '2026-11-16T16:30:00+01:00'], ['weekend', '2026-11-14T11:00:00+01:00'], ['vakantie', '2026-12-23T10:00:00+01:00'], ['zomer', '2027-07-20T10:00:00+02:00'],
];
const SCHERMEN = [['Nu', 'nu'], ['Dag', 'vandaag'], ['Week', 'week'], ['Jaar', 'jaar'], ['Klasblad', 'jaar/tv4'], ['Klasblad bb1', 'jaar/tb1'], ['Rooster', 'rooster'], ['Sectie', 'sectie'], ['Team', 'team'], ['Reclame', 'reclame'], ['Instellingen', 'instellingen'],
  ['Beoordelen', 'beoordelen/p1-bb1-gitaar/tb1'], ['Beoordelen (klas 3)', 'beoordelen/p1-klas3-waymaker/th3']];
const tijden = SNEL ? TIJDEN.filter(t => ['tijdens een les', 'weekend', 'zomer'].includes(t[0])) : TIJDEN;

const vrijePoort = () => new Promise(r => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const bladeren = [process.env.LESDAG_BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);

(async () => {
  const poort = +arg('poort', 0) || await vrijePoort();
  const server = cp.spawn(process.execPath, [path.join(__dirname, 'serve-lokaal.js'), path.resolve(arg('map', path.join(__dirname, '..', 'public'))), String(poort)], { stdio: 'ignore' });
  const basis = 'http://localhost:' + poort + '/';
  let browser;
  try {
    const exe = bladeren.find(p => fs.existsSync(p));
    try { browser = await pw.chromium.launch(exe ? { executablePath: exe } : {}); } catch (e) { browser = await pw.chromium.launch({ channel: 'msedge' }); }
  } catch (e) { server.kill(); console.log('OVERGESLAGEN: geen browser gevonden (' + String(e.message).split('\n')[0] + ')'); process.exit(2); }
  await new Promise(r => setTimeout(r, 400));

  const t0 = Date.now(); const fouten = new Map(); let gemeten = 0;
  const fout = (scherm, tijd, breed, soort, tekst) => { const k = soort + '|' + scherm + '|' + tekst; const e = fouten.get(k) || { soort, scherm, tekst, waar: [] }; e.waar.push(tijd + ' / ' + breed); fouten.set(k, e); };
  const filter = t => /Failed to load resource/.test(t) || /net::ERR_/.test(t); // geblokkeerde externe dingen (lettertype, Microsoft, /api/) zijn hier bewust weg

  for (const breed of BREEDTES) for (const [tnaam, tijd] of tijden) {
    const ctx = await browser.newContext({ viewport: { width: breed, height: breed < 500 ? 800 : 900 }, timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block', hasTouch: breed < 500 });
    await ctx.route(u => !u.href.startsWith(basis), r => r.fulfill({ status: 200, contentType: r.request().resourceType() === 'stylesheet' ? 'text/css' : 'text/plain', body: '' }));
    await ctx.route(u => u.pathname.startsWith('/api/'), r => r.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
    await ctx.addInitScript(([staat, tijdIso]) => { try { if (!sessionStorage.getItem('lesdag-test-ingesteld')) { localStorage.setItem('lesdag-staat', JSON.stringify(staat)); sessionStorage.setItem('lesdag-test-ingesteld', '1'); } } catch (e) {} }, [STAAT, tijd]);
    const page = await ctx.newPage(); await page.clock.setFixedTime(new Date(tijd));
    let nu = 'start';
    page.on('pageerror', e => fout(nu, tnaam, breed, 'uitzondering', String(e.message).slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error' && !filter(m.text())) fout(nu, tnaam, breed, 'consolefout', m.text().slice(0, 200)); });
    await page.goto(basis + '#nu', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('#main') && !/Lesdag laden/.test(document.querySelector('#main').textContent), null, { timeout: 8000 }).catch(() => fout('start', tnaam, breed, 'start', 'Lesdag laadde niet binnen 8 seconden'));
    const meet = async naam => {
      await page.waitForTimeout(120);
      const r = await page.evaluate(() => { const m = document.querySelector('#main'); const tekst = (m && m.innerText) || '';
        const les = document.querySelector('#les'); const lesAan = les && !les.hidden;
        const breder = document.documentElement.scrollWidth - window.innerWidth; let wie = '';
        if (breder > 1) { const kand = [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && e.offsetParent !== null); let e = kand.find(x => !kand.some(y => y !== x && x.contains(y))) || kand[0]; while (e && !(e instanceof HTMLElement)) e = e.parentElement; wie = e ? (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) : ''; }
        return { kapot: /Dit scherm lukt nu niet|Lesdag start niet/.test(tekst + ' ' + (lesAan ? les.innerText : '')), leeg: !lesAan && tekst.trim().length < 20, breder, wie, melding: (tekst.match(/Er ging iets mis bij het tekenen: ([^\n]*)/) || [])[1] || '' }; });
      gemeten++;
      if (r.kapot) fout(naam, tnaam, breed, 'dit scherm lukt nu niet', r.melding || 'melding in beeld');
      else if (r.leeg) fout(naam, tnaam, breed, 'leeg scherm', 'minder dan 20 tekens');
      if (r.breder > 1) fout(naam, tnaam, breed, 'horizontale overloop', r.breder + 'px te breed' + (r.wie ? ', o.a. ' + r.wie : ''));
    };
    for (const [naam, hash] of SCHERMEN) { nu = naam; await page.evaluate(h => { location.hash = h; }, hash); await meet(naam); }
    // lesmodus: alleen als er op dit moment een les is; de app heropent die vanuit sessionStorage zoals na een herlaadbeurt midden in de les
    if (tnaam === 'tijdens een les') {
      nu = 'Lesmodus'; await page.evaluate(() => { sessionStorage.setItem('lesdag-lesopen', 't1|2026-11-16'); }); await page.goto(basis + '#nu', { waitUntil: 'load' }).catch(() => {});
      await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(400);
      const open = await page.evaluate(() => { const l = document.querySelector('#les'); return !!l && !l.hidden; });
      if (!open) fout('Lesmodus', tnaam, breed, 'lesmodus', 'ging niet open voor maandag 8:30 (tv4)'); else { await meet('Lesmodus');
        for (let i = 0; i < 4; i++) { nu = 'Lesmodus'; await page.keyboard.press('ArrowRight'); await meet('Lesmodus (dia ' + (i + 2) + ')'); } }
    }
    await ctx.close();
  }
  await browser.close(); server.kill();

  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Schermtest: ${gemeten} metingen (${SCHERMEN.length + 1} schermen × ${tijden.length} tijden × ${BREEDTES.join(' en ')} px) in ${dur} s.`);
  if (!fouten.size) { console.log('Alle schermen in orde.'); process.exit(0); }
  const perScherm = {}; for (const e of fouten.values()) (perScherm[e.scherm] = perScherm[e.scherm] || []).push(e);
  for (const [s, lijst] of Object.entries(perScherm)) { console.log('\n' + s + ':'); for (const e of lijst) console.log(`  ${e.soort}: ${e.tekst}  [${TOON ? e.waar.join('; ') : e.waar.length + 'x, o.a. ' + e.waar.slice(0, 2).join('; ')}]`); }
  console.log(`\n${fouten.size} verschillende fout(en) in ${Object.keys(perScherm).length} scherm(en).`);
  process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
