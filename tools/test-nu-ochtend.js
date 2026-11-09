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
  const rijen = (html, uur) => (html.match(new RegExp('data-rondaf="[^"]*\\|' + uur + '\\|', 'g')) || []).length; // knoppen om een les af te ronden
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
    let les = ''; const c = await kijk('2026-11-16T08:40:00+01:00', 'vandaag', staat, async page => { await page.click('[data-start]'); await page.waitForSelector('#les:not([hidden])'); await page.waitForTimeout(200); await page.click('#les [data-l="notities"]'); await page.waitForTimeout(100); les = await page.evaluate(() => document.querySelector('#les').innerText); }); is('3: lesmodus die al loopt toont vorige keer bij de notities', /Vorige keer/.test(les) && les.includes(NOT)); }

  // 63: twee lessen achter elkaar (tv4 8:30 en 9:15): in de tweede les kan de eerste nog worden afgerond
  { let na = null;
    const a = await kijk('2026-11-16T09:17:00+01:00', 'nu', null, async page => { await page.click('summary:has-text("Notitie voor de volgende les")'); await page.fill('#nNot', 'Ritme nog niet af'); await page.click('[data-rondaf$="|t1|half"]'); await page.waitForTimeout(400); na = await page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-staat')).voortgang); });
    is('63: knoppen voor de eerste les', rijen(a.html, 't1') === 0 && na && Object.values(na.tv4 || {}).some(v => v.st === 'half' && v.n === 'Ritme nog niet af'), JSON.stringify(na));
    const b = await kijk('2026-11-16T09:17:00+01:00', 'nu'); is('63: de vraag staat er bij de tweede les', rijen(b.html, 't1') === 3 && /Daarna tv4 afronden/.test(b.tekst), b.tekst.slice(0, 400));
    const c = await kijk('2026-11-16T09:40:00+01:00', 'nu'); is('63: ook later in de les nog', rijen(c.html, 't1') === 3); }


  // 74: dezelfde woorden voor hetzelfde: Gegeven, Half af, Niet aan toegekomen, op Nu, in de lesmodus en in de regie
  { const WOORDEN = ['Gegeven', 'Half af, volgende keer verder', 'Niet aan toegekomen'];
    const a = await kijk('2026-11-16T10:05:00+01:00', 'nu'); const kn = (a.html.match(/<button[^>]*data-rondaf="[^"]*\|(?:gegeven|half|niet)"[^>]*>[^<]*<\/button>/g) || []).map(x => x.replace(/<[^>]*>/g, ''));
    is('74: Nu, na de bel', WOORDEN.every(w => kn.includes(w)), kn.join(' / '));
    is('74: Nu, zin na de bel', /gegeven, half af of niet aan toegekomen/.test(a.tekst));
    let lm = ''; await kijk('2026-11-16T09:20:00+01:00', 'vandaag', null, async page => { await page.click('[data-start]'); await page.waitForSelector('#les:not([hidden])'); await page.click('#les [data-l="naaraf"]'); await page.waitForTimeout(150); lm = await page.evaluate(() => [...document.querySelectorAll('#les .keuzes button')].map(b => b.innerText.trim()).join(' / ')); });
    is('74: lesmodus, afronden', WOORDEN.every(w => lm.includes(w)), lm);
    const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
    is('74: nergens "Deels" of "Niet gegeven" als keuze', !/>Deels|'Niet gegeven'|>deels</.test(src)); }


  // 62: een ziektedag tijdens de toetsweek: Nu en Dag zeggen wat er schuift, de dag erna één regel
  { const AFW = { afwezig: { '2026-11-09': { herstel: {} } } };
    const a = await kijk('2026-11-09T07:30:00+01:00', 'nu', AFW, async page => { });
    is('62: Nu zegt dat je afwezig bent en wat er schuift', /Afwezig\. 3 lessen schuiven door \(tv4 en tb1\)/.test(a.tekst) && /Toetsweek tm4 loopt door/.test(a.tekst), a.tekst.slice(0, 300));
    is('62: Nu leest niet als vrije dag', !/Vrij\. Vandaag heeft Lesdag niets voor je/.test(a.tekst));
    is('62: Toch aanwezig staat op Nu', /Toch aanwezig/.test(a.tekst));
    const b = await kijk('2026-11-09T07:30:00+01:00', 'vandaag', AFW); is('62: Dag-kop met toetsweek en wat schuift', /Toetsweek tm4\. Afwezig\. 3 lessen schuiven door/.test(b.tekst) && !/Lesweek 10\. Vrij\./.test(b.tekst), b.tekst.slice(0, 200));
    let na = null; await kijk('2026-11-09T07:30:00+01:00', 'nu', AFW, async page => { await page.click('[data-afwezigterug]'); await page.waitForTimeout(300); na = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('lesdag-staat')).afwezig || {}).length); });
    is('62: Toch aanwezig op Nu zet de dag terug', na === 0, 'afwezig: ' + na);
    const c = await kijk('2026-11-10T07:30:00+01:00', 'nu', AFW); is('62: de dag erna: wat er geschoven is', /Tijdens je afwezigheid geschoven: 3 lessen \(tv4 en tb1\), ma 9 nov\./.test(c.tekst), c.tekst.slice(0, 200));
    const d = await kijk('2026-11-11T07:30:00+01:00', 'nu', AFW); is('62: een dag later is die regel weg', !/Tijdens je afwezigheid/.test(d.tekst)); }


  // 71: de eerste lesdag na de kerst (di 5-1-2027): wat is verlopen, één knop, geen lange lijst
  { const TK = (id, d) => ({ id, titel: 'Testtaak ' + id, bron: 'overig', d, af: false });
    const KERST = { taken: [TK('v1', '2026-12-28'), TK('v2', '2026-12-30'), TK('o1', '2026-12-10')] };
    let uitg = null, voor = '', open = null;
    const a = await kijk('2027-01-05T08:10:00+01:00', 'nu', KERST, async page => { voor = await page.evaluate(() => document.querySelector('#main').innerText); open = await page.evaluate(() => document.querySelector('.liggen details').open); await page.click('[data-liggenvakantie]'); await page.waitForTimeout(300); uitg = await page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-staat')).uitgesteld || {}); });
    is('71: regel over wat verlopen is', /Na de kerstvakantie/.test(voor) && /Tijdens de kerstvakantie verlopen: 2 taken\./.test(voor) && /lagen er al langer/.test(voor), (voor.match(/Na de kerst[\s\S]{0,200}/) || [''])[0]);
    is('71: de stapel staat ingeklapt', open === false && !/Blijft liggen ·/.test(voor));
    is('71: één knop schuift de vakantietaken door', uitg && uitg['eigen:v1'] === '2027-01-06' && uitg['eigen:v2'] === '2027-01-06' && !uitg['eigen:o1'], JSON.stringify(uitg));
    const b = await kijk('2027-01-06T08:10:00+01:00', 'nu', KERST); is('71: een dag later gewoon weer de lijst', /Blijft liggen ·/.test(b.tekst) && !/Na de kerstvakantie/.test(b.tekst)); }

  await h.stop();
  if (fouten.length) { console.log('MISLUKT (' + fouten.length + ' van ' + n + '):\n  ' + fouten.join('\n  ')); process.exit(1); }
  console.log(`nu-ochtend: ${n} controles, alles goed`);
})();
