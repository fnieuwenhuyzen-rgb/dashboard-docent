// node tools/test-routes-lesmodus.js [--poort=8754] [--onderdeel=6,7] [--leergang=vwo4,bb1] [--snel] [--rapport=<pad>] [--toon] [--zonder-les-sweep]
// Routetest van de lesmodus: loopt hele routes door in plaats van losse dia's (de schermtest dekt er vier).
//  1. Les voor les: elke les van elke leergang in basis.json, alle dia's vooruit (1280x800) en terug (1920x1080): past het, staat er
//     "undefined"/"NaN" in beeld, ontbrekende beelden en links, consolefouten, en op het bord (apart venster) geen sprekersnotities.
//  2. Lege en kapotte lesvelden (verzonnen lessen met alles leeg, onbekend beeld, kapotte fasen, tekst met HTML).
//  3. Timers: fase loopt af, ring over, "Tijd · volgende fase", pauze en +1 minuut.
//  4. Lesklok en opruimsignaal op alle tijden van de dag, met en zonder open les, ook in de pauze, na de les en voor een les die later begint.
//  5. Sluiten en heropenen, herladen, afronden als half af met notitie, de volgende les, de notitie bij de les erna.
//  6. Regie: bord in twee vensters via BroadcastChannel.
//  7. Later begonnen: fasen inkorten.
// Fouten in code laten de test falen (exitcode 1). Lesinhoud die niet op het scherm past of de lestijd overschrijdt is geen codefout: dat komt
// in het rapport (--rapport, standaard tools/rapport-lesmodus.txt wordt NIET geschreven tenzij gevraagd) en niet in de exitcode.
// Playwright staat buiten de repo: NODE_PATH=C:/Users/nwn/lesdag-werk/_testgereedschap/node_modules (zie tools/TESTEN.md).
// Exitcode 0 = goed, 1 = fouten, 2 = overgeslagen (geen Playwright of browser).
const cp = require('child_process'), net = require('net'), path = require('path'), fs = require('fs');
const args = process.argv.slice(2); const arg = (n, d) => { const a = args.find(x => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const SNEL = args.includes('--snel'), TOON = args.includes('--toon');
const ALLEEN = arg('leergang', '').split(',').filter(Boolean);
const RAPPORT = arg('rapport', '');
const ALLEEN_ONDERDEEL = arg('onderdeel', '').split(',').filter(Boolean).map(Number); const wil = n => !ALLEEN_ONDERDEEL.length || ALLEEN_ONDERDEEL.includes(n);
let pw; try { pw = require('playwright-core'); } catch (e) { try { pw = require('playwright'); } catch (e2) { console.log('OVERGESLAGEN: Playwright niet gevonden (zet NODE_PATH, zie tools/TESTEN.md).'); process.exit(2); } }

const PUBLIC = path.resolve(arg('map', path.join(__dirname, '..', 'public')));
const BASIS = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'data', 'basis.json'), 'utf8'));
const NOTITIES = (() => { try { return JSON.parse(fs.readFileSync(path.join(PUBLIC, 'data', 'notities.json'), 'utf8')); } catch (e) { return {}; } })();

// ---------- verzonnen rooster: maandag 16 november 2026 ----------
const DAG = '2026-11-16', DAG2 = '2026-11-18', VOLGENDE = '2026-11-23'; // ma, wo, ma
const uur = (id, dag, start, eind, groep) => ({ id, dag, start, eind, groep, lokaal: '009' });
const hm = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const ams = (dag, t) => { // tijdstip in Amsterdam (zomer- of wintertijd) als ISO-tekst met de juiste afwijking
  const [h, m, sc] = t.split(":").map(Number); const [Y, M, D] = dag.split("-").map(Number); const utc = Date.UTC(Y, M - 1, D, h, m, sc || 0);
  const uurIn = ms => +new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", hour: "2-digit", hourCycle: "h23" }).format(new Date(ms));
  const off = uurIn(utc - 3600000) === h ? 1 : 2;
  return dag + "T" + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(sc || 0).padStart(2, "0") + "+0" + off + ":00";
};
const tijdIso = (t, dag) => ams(dag || DAG, t.split(":").length === 2 ? t + ":00" : t);
const lgGroep = lg => 'z_' + lg;
const BLADEREN = [process.env.LESDAG_BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const vrijePoort = () => new Promise(r => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });

// ---------- lessen uit basis.json, in de volgorde van de app (reeks() in app.js) ----------
function lessenVan(lg) {
  const L = BASIS.leergangen[lg]; const out = [];
  for (const w of L.weken) for (let i = 1; i <= L.meta.lessenPerWeek; i++) {
    const l = w['l' + i]; if (!l || l.type === 'uitval' || l.type === 'toetsweek') continue;
    if (l.type === 'toets' && w.toetsweek) continue;
    out.push({ id: `${lg}:${w.w}.${i}`, lg, w: w.w, li: i, l, datum: (BASIS.kalender.weken.find(k => k.w === w.w) || {}).datum || '' });
  }
  return out;
}
const faseMinuten = l => (l.fasen || []).reduce((a, f) => a + (typeof f === 'object' ? +f.min || 0 : +((String(f).match(/^(\d+)\s*min/i) || [])[1] || 0)), 0);
const LEERGANGEN = Object.keys(BASIS.leergangen).filter(k => !ALLEEN.length || ALLEEN.includes(k));

// ---------- fouten verzamelen ----------
const addDagen = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const vrijDag = s => BASIS.vrijeDagen.includes(s) || BASIS.kalender.vakanties.some(v => s >= v.van && s <= v.tot);
function lesdagVan(maandag) { for (let n = 0; n < 5; n++) { const d = addDagen(maandag, n); if (!vrijDag(d)) return { dag: d, nr: n + 1 }; } return { dag: maandag, nr: 1 }; } // maandag, of de eerste dag erna die geen vrije dag is
const FOUTEN = new Map(); // codefouten: falen de test
const INHOUD = []; // lesinhoud die niet past: rapport
let nTest = 0;
const fout = (cat, wat, waar) => { nTest++; const k = cat + '|' + wat; const e = FOUTEN.get(k) || { cat, wat, waar: [] }; if (e.waar.length < 6) e.waar.push(waar); e.n = (e.n || 0) + 1; FOUTEN.set(k, e); };
const ok = (waar, cat, wat, cond) => { nTest++; if (!cond) fout(cat, wat, waar); return !!cond; };

const SLECHT = /\bundefined\b|\bNaN\b|\bnull\b|\[object|\$\{/;
const FILTER = t => /Failed to load resource/.test(t) || /net::ERR_/.test(t);

(async () => {
  const poort = +arg('poort', 0) || await vrijePoort();
  const server = cp.spawn(process.execPath, [path.join(__dirname, 'serve-lokaal.js'), PUBLIC, String(poort)], { stdio: 'ignore' });
  const basis = 'http://localhost:' + poort + '/';
  let browser;
  try {
    const exe = BLADEREN.find(p => fs.existsSync(p));
    try { browser = await pw.chromium.launch(exe ? { executablePath: exe } : {}); } catch (e) { browser = await pw.chromium.launch({ channel: 'msedge' }); }
  } catch (e) { server.kill(); console.log('OVERGESLAGEN: geen browser gevonden (' + String(e.message).split('\n')[0] + ')'); process.exit(2); }
  await new Promise(r => setTimeout(r, 500));
  const t0 = Date.now(); const log = t => console.log('[' + ((Date.now() - t0) / 1000).toFixed(0) + ' s] ' + t);

  // ---------- hulpjes ----------
  async function nieuweContext(staat, opt) {
    opt = opt || {};
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block', permissions: [] });
    await ctx.route(u => !u.href.startsWith(basis), r => r.fulfill({ status: 200, contentType: r.request().resourceType() === 'stylesheet' ? 'text/css' : 'text/plain', body: '' }));
    await ctx.route(u => u.pathname.startsWith('/api/'), r => r.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
    await ctx.addInitScript(([st]) => { try { if (st && !sessionStorage.getItem('lesdag-rt-init') && !localStorage.getItem('lesdag-staat')) { localStorage.setItem('lesdag-staat', JSON.stringify(st)); } sessionStorage.setItem('lesdag-rt-init', '1'); } catch (e) {} }, [staat || null]);
    return ctx;
  }
  function volg(page, waar) { // fouten van de pagina onder de naam van de route
    const w = () => (typeof waar === 'function' ? waar() : waar);
    page.on('pageerror', e => fout('uitzondering', String(e.message).slice(0, 160), w()));
    page.on('console', m => { if (m.type() === 'error' && !FILTER(m.text())) fout('consolefout', m.text().slice(0, 160), w()); });
    page.on('response', r => { try { const u = new URL(r.url()); if (u.origin === new URL(basis).origin && !u.pathname.startsWith('/api/') && r.status() >= 400) fout('bestand ontbreekt', u.pathname + ' (' + r.status() + ')', w()); } catch (e) {} });
    page.on('requestfailed', r => { if (/ERR_ABORTED/.test((r.failure() || {}).errorText || '')) return; try { const u = new URL(r.url()); if (u.origin === new URL(basis).origin && !u.pathname.startsWith('/api/')) fout('aanvraag mislukt', u.pathname, w()); } catch (e) {} });
  }
  const staatVoor = (lgs, extra) => { // rooster: één groep per leergang, maandag 8:30
    const rooster = [], gl = {}; const dagnr = (extra && extra.dagnr) || 1; if (extra) { extra = Object.assign({}, extra); delete extra.dagnr; }
    (lgs || []).forEach((lg, i) => { rooster.push(uur('u_' + lg, dagnr, '8:30', '9:15', lgGroep(lg))); gl[lgGroep(lg)] = lg; });
    return Object.assign({ v: 1, rooster, groepLeergang: gl, magVanaf: '2026-08-01', beoord: { toetsen: {}, lijsten: {} } }, extra || {});
  };
  const wacht = async (page, f, arg, t) => { try { await page.waitForFunction(f, arg, { timeout: t || 6000 }); return true; } catch (e) { return false; } };
  const lesOpen = page => page.evaluate(() => { const l = document.querySelector('#les'); return !!l && !l.hidden && !!l.querySelector('.slide'); });
  async function laadApp(page, hash) {
    await page.goto(basis + (hash || '#nu'), { waitUntil: 'load' });
    return wacht(page, () => document.querySelector('#main') && !/Lesdag laden/.test(document.querySelector('#main').textContent), null, 8000);
  }
  async function zetStaat(page, st, lesopen) { // staat en sessie instellen vanaf een neutrale pagina: de app bewaart zijn eigen staat bij het verlaten van de pagina
    await page.goto(basis + 'manifest.webmanifest', { waitUntil: 'load' });
    await page.evaluate(([s, lo]) => { localStorage.setItem('lesdag-staat', JSON.stringify(s)); localStorage.removeItem('lesdag-lesplek'); if (lo) sessionStorage.setItem('lesdag-lesopen', lo); else sessionStorage.removeItem('lesdag-lesopen'); }, [st, lesopen || '']);
    return laadApp(page, '#nu');
  }
  // Wat staat er nu op de dia? (innerText laat verborgen dingen, zoals een gesloten notitiepaneel, vanzelf weg)
  const meet = page => page.evaluate(() => {
    const les = document.querySelector('#les'); if (!les || les.hidden) return { open: false };
    const sl = les.querySelector('.slide'); const r = { open: true };
    const stip = [...les.querySelectorAll('.stip i')]; r.n = stip.length; r.i = stip.findIndex(x => x.classList.contains('nu'));
    r.klasse = les.className; r.docentkaart = !!(sl && sl.classList.contains('docentkaart'));
    r.oy = sl ? sl.scrollHeight - sl.clientHeight : 0; r.ox = sl ? sl.scrollWidth - sl.clientWidth : 0;
    r.docBreed = document.documentElement.scrollWidth - innerWidth;
    r.tekst = les.innerText; r.slideTekst = sl ? sl.innerText : '';
    const lb = les.querySelector('.lbalk'); if (lb) { const b = lb.getBoundingClientRect(); r.lbOnder = Math.round(b.bottom - innerHeight); r.lbRechts = Math.round(b.right - innerWidth); r.lbHoogte = Math.round(b.height); }
    const th = les.querySelector('.timerhoek'); r.timer = !!th;
    if (th && sl) { const t = th.getBoundingClientRect(); const rs = []; // tekstregels en beelden van de dia, niet de lege blokken eromheen
      const tw = document.createTreeWalker(sl, NodeFilter.SHOW_TEXT); let nd; while ((nd = tw.nextNode())) { if (!nd.nodeValue.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(nd); rs.push(...rg.getClientRects()); }
      sl.querySelectorAll('svg,figure,img,table,.kaartje,.vorm,.opbouw,.orkest,.klaarkaart').forEach(e => rs.push(e.getBoundingClientRect()));
      r.raaktTimer = rs.some(b => b.width > 0 && b.height > 0 && b.left < t.right - 2 && b.right > t.left + 2 && b.top < t.bottom - 2 && b.bottom > t.top + 2); }
    r.kop = (sl && (sl.querySelector('h1,h2') || {}).innerText) || '';
    r.leegKop = !!sl && !sl.classList.contains('docentkaart') && !les.querySelector('.afronden') && !(sl.querySelector('h1,h2,blockquote,.thuiskaarten,.eyebrow') && (sl.innerText || '').trim().length > 3);
    r.fase = [...stip].map(x => x.className.split(' ').find(c => ['klaar', 'welkom', 'doel', 'fase', 'check', 'id', 'thuis', 'af'].includes(c)) || '')[r.i] || '';
    r.beeldenKapot = [...les.querySelectorAll('img')].filter(i => i.complete ? i.naturalWidth === 0 : false).map(i => i.getAttribute('src') || '');
    r.links = [...les.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));
    r.notOpen = !!les.querySelector('.notities.open');
    r.notTekst = (les.querySelector('#notities') || {}).textContent || '';
    return r;
  });
  const druk = async (page, k) => { await page.keyboard.press(k); await page.waitForTimeout(25); };

  // ---------- 0. gegevenscontrole van de lessen (zonder browser) ----------
  const GEKENDE_BEELDEN = ['akkoorden', 'fragment', 'vorm', 'opbouw', 'orkest', 'kaarten', 'tabel', 'cijfer', 'tekst'];
  const GEGEVENS = [];
  for (const lg of LEERGANGEN) for (const it of lessenVan(lg)) {
    const l = it.l; const w = (s) => GEGEVENS.push({ lg, id: it.id, titel: l.titel || '', s });
    (l.fasen || []).forEach((f, i) => {
      if (f && typeof f === 'object') {
        if (!(+f.min > 0)) w(`fase ${i + 1} heeft geen minuten`);
        if (!f.kop && !f.docent) w(`fase ${i + 1} heeft geen kop`);
        if ((f.stappen || []).some(x => !String(x).trim())) w(`fase ${i + 1} heeft een lege stap`);
        const b = f.beeld; if (b && typeof b === 'object') { if (!GEKENDE_BEELDEN.includes(b.soort)) w(`fase ${i + 1}: onbekend beeld "${b.soort}"`);
          else if (['akkoorden', 'vorm', 'opbouw', 'kaarten'].includes(b.soort) && !(b.items || []).length) w(`fase ${i + 1}: beeld ${b.soort} zonder items`);
          else if (b.soort === 'tabel' && !(b.rijen || []).length) w(`fase ${i + 1}: tabel zonder rijen`);
          else if (b.soort === 'fragment' && b.u && !/^https?:/i.test(b.u)) w(`fase ${i + 1}: fragmentlink is geen http-adres`); }
      } else if (!/^\d+\s*min/i.test(String(f))) w(`fase ${i + 1} is tekst zonder minuten: "${String(f).slice(0, 40)}"`);
    });
    (l.materiaal || []).forEach((m, i) => { if (!m || !m.t) w(`materiaal ${i + 1} zonder titel`); else if (m.u && !/^https?:/i.test(m.u)) w(`materiaal "${m.t}": link is geen http-adres`); });
    if (l.type !== 'toets' && !l.titel) w('geen titel');
  }

  // ---------- 1. les voor les ----------
  const RAP = {}; // per leergang: {lessen, metFasen, faseDia, past1280, past1920, tijdTeLang, details}
  const BORD_NOTITIES = []; // controle: tekst uit notities.json die op het bord stond
  const notitieStrings = id => { const o = []; const rec = x => { if (typeof x === 'string') { if (x.trim().length >= 25) o.push(x.trim()); } else if (Array.isArray(x)) x.forEach(rec); else if (x && typeof x === 'object') Object.values(x).forEach(rec); }; rec(NOTITIES[id]); return o; };

  if (wil(1) && !args.includes('--zonder-les-sweep')) for (const lg of LEERGANGEN) {
    const alle = lessenVan(lg); const lessen = SNEL ? alle.filter((x, i) => i % 6 === 0) : alle;
    const R = RAP[lg] = { lessen: alle.length, getest: lessen.length, metFasen: 0, faseDia: 0, past1280: 0, past1920: 0, tijdTeLang: [], details: [], geenEnkel: 0 };
    const grp = lgGroep(lg);
    const ctx = await nieuweContext(null); const page = await ctx.newPage(); await page.clock.setFixedTime(new Date(tijdIso('08:00')));
    let waar = lg; volg(page, () => waar);
    await laadApp(page);
    const bordPage = await ctx.newPage(); await bordPage.clock.setFixedTime(new Date(tijdIso('08:00'))); let bordWaar = lg + ' bord'; volg(bordPage, () => bordWaar);
    for (const it of lessen) {
      const k = alle.indexOf(it); waar = it.id; bordWaar = it.id + ' bord'; const kies = lesdagVan(it.datum || DAG); const dagL = kies.dag; await page.clock.setFixedTime(new Date(tijdIso('08:00', dagL))); await bordPage.clock.setFixedTime(new Date(tijdIso('08:00', dagL)));
      const voortgang = {}; voortgang[grp] = {}; alle.slice(0, k).forEach((x, j) => { voortgang[grp][x.id] = { st: 'gegeven', d: '2026-09-0' + (1 + (j % 5)), uur: 'oud' + j }; });
      const st = staatVoor([lg], { voortgang, dagnr: kies.nr });
      await page.setViewportSize({ width: 1280, height: 800 });
      await zetStaat(page, st, 'u_' + lg + '|' + dagL);
      if (!await wacht(page, () => { const l = document.querySelector('#les'); return l && !l.hidden && l.querySelector('.slide'); }, null, 4000)) { fout('les gaat niet open', 'lesmodus opende niet', it.id); continue; }
      const eerste = await meet(page);
      const titel = it.l.titel || ''; const verwacht = titel.trim();
      const welk = await page.evaluate(() => { const h = document.querySelector('#les h2'); return h ? h.innerText : ''; });
      if (verwacht && welk.trim() !== verwacht) { fout('verkeerde les geopend', `verwacht "${verwacht.slice(0, 40)}", kreeg "${welk.slice(0, 40)}"`, it.id); continue; }
      const nDia = eerste.n; const per = []; const meerFase = (it.l.fasen || []).length;
      if (meerFase) R.metFasen++;
      // vooruit op 1280x800
      let m = eerste; per[0] = m;
      for (let i = 0; i < nDia; i++) {
        if (i > 0) { await druk(page, 'ArrowRight'); m = await meet(page); per[i] = m; }
        if (!m.open) { fout('lesmodus sloot onverwacht', 'dia ' + i, it.id); break; }
        if (m.i !== i) { fout('verkeerde dia', `na ${i} keer vooruit staat dia ${m.i}`, it.id); break; }
      }
      // terug op 1920x1080
      await page.setViewportSize({ width: 1920, height: 1080 }); await page.waitForTimeout(40);
      const per2 = []; let m2 = await meet(page); per2[m2.i] = m2;
      for (let i = m2.i - 1; i >= 0; i--) { await druk(page, 'ArrowLeft'); m2 = await meet(page); per2[m2.i] = m2; }
      for (let i = 0; i < per.length; i++) {
        const a = per[i], b = per2[i]; if (!a || !b) continue;
        const wat = `dia ${i + 1} (${a.fase})`;
        const tekst = a.slideTekst + ' ' + a.tekst;
        if (SLECHT.test(a.tekst)) fout('"undefined"/"NaN" in beeld', (a.tekst.match(SLECHT) || [''])[0] + ' op ' + a.fase, it.id + ' ' + wat);
        if (a.leegKop) fout('lege dia', a.fase + ' zonder kop', it.id + ' ' + wat);
        if (a.docBreed > 1 || b.docBreed > 1) fout('horizontale overloop', 'pagina breder dan venster', it.id + ' ' + wat);
        if (a.ox > 2) fout('dia loopt zijwaarts over', a.ox + 'px op 1280', it.id + ' ' + wat);
        if (b.ox > 2) fout('dia loopt zijwaarts over', b.ox + 'px op 1920', it.id + ' ' + wat);
        if (a.lbOnder > 1 || b.lbOnder > 1 || a.lbRechts > 1 || b.lbRechts > 1) fout('onderbalk valt buiten beeld', `${a.lbOnder}/${b.lbOnder}px`, it.id + ' ' + wat);
        if (a.beeldenKapot.length) fout('afbeelding ontbreekt', a.beeldenKapot.join(', '), it.id + ' ' + wat);
        a.links.forEach(h => { if (!h || h === '#' || /undefined|null/.test(h)) fout('kapotte link', String(h), it.id + ' ' + wat); });
        if (a.fase === 'klaar' && !a.docentkaart) fout('docentkaart', 'jouw kaart heeft de docentkaart-opmaak niet', it.id);
        if (a.notOpen) fout('notities staan open', 'standaard dicht', it.id + ' ' + wat);
        if (a.fase === 'fase') {
          R.faseDia++; const p1 = a.oy > 2 || a.raaktTimer, p2 = b.oy > 2 || b.raaktTimer;
          if (p1) R.past1280++; if (p2) R.past1920++;
          if (p1 || p2) R.details.push({ id: it.id, titel, dia: i + 1, kop: a.kop, oy1280: a.oy, oy1920: b.oy, timer: !!(a.raaktTimer || b.raaktTimer), datum: it.datum });
        }
      }
      // te veel minuten voor een les van 45
      const duur = BASIS.leergangen[lg].meta.lesduurMin || 45; const som = faseMinuten(it.l);
      if (som > duur) R.tijdTeLang.push({ id: it.id, titel, som, duur, datum: it.datum });
      // docentkaart en notities in het bordvenster
      if (nDia && !SNEL || k % 3 === 0) {
        await bordPage.setViewportSize({ width: 1280, height: 800 });
        await bordPage.goto(basis + '#bord/' + encodeURIComponent('u_' + lg) + '/' + dagL, { waitUntil: 'load' });
        await bordPage.reload({ waitUntil: 'load' }); // het hash-adres alleen herlaadt niet altijd de app
        if (await wacht(bordPage, () => { const l = document.querySelector('#les'); return l && !l.hidden && l.querySelector('.slide'); }, null, 4000)) {
          const bm0 = await meet(bordPage); const teksten = [bm0.tekst]; const klassen = [bm0.docentkaart]; const nots0 = [bm0.notTekst];
          for (let i = 1; i < bm0.n; i++) { await druk(bordPage, 'ArrowRight'); const b = await meet(bordPage); teksten.push(b.tekst); klassen.push(b.docentkaart); nots0.push(b.notTekst); }
          ok(it.id, 'bord toont notities', 'het notitiepaneel van het bord is niet leeg: ' + (nots0.find(x => x.trim()) || '').slice(0, 60), !nots0.some(x => x.trim()));
          const alles = teksten.join('\n');
          ok(it.id, 'bord toont jouw kaart', 'de docentkaart staat op het bord', !klassen.some(Boolean) && !/niet voor het bord/i.test(alles));
          { const mt = alles.match(/[\s\S]{0,50}(sprekersnotities|alleen jij ziet)[\s\S]{0,50}/i); ok(it.id, 'bord toont notities', 'sprekersnotities op het bord: ' + (mt ? mt[0].replace(/\s+/g, ' ') : ''), !mt); }
          const nots = notitieStrings(it.id).filter(x => alles.includes(x));
          if (nots.length) { // staat een tekst uit de notities letterlijk op het bord?
            const alleLes = JSON.stringify(it.l);
            const echt = nots.filter(x => !alleLes.includes(JSON.stringify(x).slice(1, -1)));
            if (echt.length) fout('notitie op het bord', echt[0].slice(0, 60), it.id);
          }
          const docentVeld = (it.l.fasen || []).filter(f => f && typeof f === 'object' && typeof f.docent === 'string' && f.docent.trim().length >= 15).map(f => f.docent.trim());
          docentVeld.forEach(d => { if (alles.includes(d) && !JSON.stringify([it.l.detail, it.l.doel, it.l.vraag, it.l.criteria, (it.l.fasen || []).map(f => [f.kop, f.stappen, f.klaar, f.beeld])]).includes(JSON.stringify(d).slice(1, -1))) fout('docentnotitie op het bord', d.slice(0, 60), it.id); });
        } else fout('bord gaat niet open', 'bordvenster toonde geen les', it.id);
      }
    }
    await ctx.close();
    log(`${lg}: ${R.getest}/${R.lessen} lessen, ${R.faseDia} fase-dia's, past niet: ${R.past1280} (1280) / ${R.past1920} (1920)`);
  }

  // ---------- 2. lege en kapotte lesvelden ----------
  if (wil(2)) {
    const lg = 'vwo4'; const alle = lessenVan(lg); const basisLes = alle.find(x => (x.l.fasen || []).length >= 2) || alle[0];
    const kapot = {
      'alles leeg': { titel: '', detail: '', doel: '', vraag: '', criteria: [], fasen: [], formatief: {}, identiteit: '', materiaal: [] },
      'titel weg': { titel: undefined, fasen: ['5 min · opwarmen: zingen'] },
      'fasen: lege objecten': { fasen: [{}, { min: 0 }, { kop: '' }, { min: -5, kop: 'Negatief' }, { min: 'abc', kop: 'Tekst als minuten' }] },
      'fasen: lege tekst': { fasen: ['', ' ', '0 min', 'min ·', 'zomaar tekst zonder minuten'] },
      'fasen: stappen leeg': { fasen: [{ min: 5, soort: 'doen', kop: 'Stappen', stappen: ['', '   ', null, 'echte stap'] }, { min: 5, soort: 'bestaat niet', kop: 'Onbekend soort' }] },
      'beeld onbekend': { fasen: [{ min: 5, soort: 'doen', kop: 'Beeld', beeld: { soort: 'bestaat niet' } }, { min: 5, kop: 'Beeld leeg', beeld: {} }, { min: 5, kop: 'Beeld tekst', beeld: 'zomaar een tekst' }, { min: 5, kop: 'Beeld null', beeld: null }] },
      'beeld zonder items': { fasen: ['akkoorden', 'vorm', 'opbouw', 'kaarten', 'tabel', 'cijfer', 'tekst', 'fragment', 'orkest'].map(s => ({ min: 4, kop: 'Beeld ' + s, beeld: { soort: s } })) },
      'beeld kapotte items': { fasen: [{ min: 5, kop: 'Akkoord onbekend', beeld: { soort: 'akkoorden', items: ['Xyz', '', 'G|zzz', 'C|x32010'] } }, { min: 5, kop: 'Vorm zonder maten', beeld: { soort: 'vorm', items: [{ d: 'couplet' }, {}, { d: 'refrein', m: 'abc' }] } }, { min: 5, kop: 'Tabel scheef', beeld: { soort: 'tabel', rijen: [['a'], [], ['b', 'c', 'd']] } }, { min: 5, kop: 'Fragment zonder link', beeld: { soort: 'fragment', k: '', u: '' } }] },
      'materiaal zonder link': { materiaal: [{ t: 'Zonder link' }, { t: 'Javascript', u: 'javascript:alert(1)' }, { u: 'https://example.com/x' }, {}, { t: 'Goede link', u: 'https://example.com/ok' }] },
      'formatief en thuis leeg': { formatief: { soort: '', tekst: '' }, identiteit: '   ' },
      'html in tekst': { titel: '<img src=x onerror="window.__xss=1">Titel', detail: '<b>vet</b> & "aanhalingstekens"', fasen: [{ min: 5, kop: '<script>window.__xss=1</script>Kop', stappen: ['<i>stap</i>'], docent: '<u>docent</u>', klaar: '<a href=#>klaar</a>' }] },
      'heel lange tekst': { titel: 'Heel lang '.repeat(30), fasen: [{ min: 5, kop: 'Lang '.repeat(60), stappen: Array.from({ length: 14 }, (_, i) => 'Stap ' + i + ' ' + 'tekst '.repeat(20)) }] }
    };
    const ctx = await nieuweContext(null); const page = await ctx.newPage(); await page.clock.setFixedTime(new Date(tijdIso('08:00')));
    let waar = ''; volg(page, () => waar); await laadApp(page);
    await page.exposeFunction('__bijnaam', () => {}).catch(() => {});
    for (const [naam, o] of Object.entries(kapot)) {
      waar = 'kapotte les: ' + naam;
      const les = {}; Object.entries(o).forEach(([k, v]) => { if (v !== undefined) les[k] = v; });
      const voortgang = {}; voortgang[lgGroep(lg)] = {}; alle.slice(0, alle.indexOf(basisLes)).forEach((x, j) => { voortgang[lgGroep(lg)][x.id] = { st: 'gegeven', d: '2026-09-01', uur: 'oud' + j }; });
      const sles = {}; sles[basisLes.id] = o.titel === undefined && 'titel' in o ? Object.assign({}, les, { titel: undefined }) : les;
      await zetStaat(page, staatVoor([lg], { voortgang, les: sles }), 'u_' + lg + '|' + DAG);
      if (!await wacht(page, () => { const l = document.querySelector('#les'); return l && !l.hidden && l.querySelector('.slide'); }, null, 4000)) { fout('kapotte les: lesmodus opent niet', naam, waar); continue; }
      let m = await meet(page); const n = m.n;
      for (let i = 0; i < n; i++) { if (i) { await druk(page, 'ArrowRight'); m = await meet(page); }
        if (!m.open) { fout('kapotte les: lesmodus sloot', naam, waar + ' dia ' + i); break; }
        if (/\bundefined\b|\bNaN\b|\[object/.test(m.tekst)) fout('kapotte les: "undefined"/"NaN" in beeld', naam + ': ' + (m.tekst.match(/\bundefined\b|\bNaN\b|\[object/) || [''])[0], waar + ' dia ' + (i + 1));
        if (m.ox > 2) fout('kapotte les: zijwaarts over', naam + ' ' + m.ox + 'px', waar + ' dia ' + (i + 1));
        m.links.forEach(h => { if (/^javascript:/i.test(h || '')) fout('kapotte les: javascript-link', naam, waar); }); }
      const xss = await page.evaluate(() => window.__xss); if (xss) fout('HTML uit lesveld wordt uitgevoerd', naam, waar);
      // einde: afronden zonder kopregels moet nog werken
      await page.evaluate(() => document.querySelector('#les [data-l="naaraf"]') && document.querySelector('#les [data-l="naaraf"]').click());
      ok(waar, 'kapotte les: afrondscherm', naam + ' toont geen afrondscherm', await page.evaluate(() => !!document.querySelector('#les .afronden')));
      await page.evaluate(() => document.querySelector('#les [data-l="sluit"]').click());
    }
    await ctx.close(); log('lege en kapotte lesvelden gedaan');
  }

  // ---------- 3. timers ----------
  if (wil(3)) {
    const lg = 'vwo4'; const alle = lessenVan(lg); const it = alle.find(x => (x.l.fasen || []).length >= 3 && faseMinuten(x.l) >= 30) || alle[1]; const k = alle.indexOf(it);
    const voortgang = {}; voortgang[lgGroep(lg)] = {}; alle.slice(0, k).forEach((x, j) => { voortgang[lgGroep(lg)][x.id] = { st: 'gegeven', d: '2026-09-01', uur: 'oud' + j }; });
    const ctx = await nieuweContext(staatVoor([lg], { voortgang })); const page = await ctx.newPage(); let waar = 'timers ' + it.id; volg(page, () => waar);
    await ctx.clock.install({ time: new Date(tijdIso('08:20')) }); await ctx.clock.pauseAt(new Date(tijdIso('08:30:00')));
    await laadApp(page); await page.evaluate(([u, d]) => { sessionStorage.setItem('lesdag-lesopen', u + '|' + d); }, ['u_' + lg, DAG]); await page.reload({ waitUntil: 'load' });
    await wacht(page, () => { const l = document.querySelector('#les'); return l && !l.hidden && l.querySelector('.slide'); }, null, 4000);
    await ctx.clock.runFor(1000);
    // naar de eerste fase
    for (let i = 0; i < 12 && !(await page.$('#les #ring')); i++) { await druk(page, 'ArrowRight'); }
    const ringOp = await page.$('#les #ring'); ok(waar, 'timer', 'geen ring op een fase-dia', !!ringOp);
    if (ringOp) {
      const tl = () => page.evaluate(() => ({ t: (document.querySelector('#tl') || {}).textContent, over: document.querySelector('#ring').classList.contains('over'), bijna: document.querySelector('#ring').classList.contains('bijna'), band: !document.querySelector('#faseTijd').hidden, knop: (document.querySelector('#tbtn') || {}).textContent, bord: !!document.querySelector('#lsBord') }));
      const a = await tl(); ok(waar, 'timer', `timer begint niet op de faseminuten (${a.t})`, /^\d+:00$/.test(a.t) || /^\d+:5\d$/.test(a.t)); ok(waar, 'timer', 'timer start niet vanzelf', /pauze/.test(a.knop || ''));
      const sec0 = (() => { const [m, s] = a.t.split(':').map(Number); return m * 60 + s; })();
      await ctx.clock.runFor(5000); const b = await tl(); const sec1 = (() => { const [m, s] = b.t.split(':').map(Number); return m * 60 + s; })(); ok(waar, 'timer', `timer loopt niet (${a.t} → ${b.t})`, sec1 <= sec0 - 4 && sec1 >= sec0 - 6);
      await druk(page, 't'); await ctx.clock.runFor(10000); const c = await tl(); ok(waar, 'timer', 'pauze houdt de timer niet stil', c.t === b.t || c.t === ((x) => x)(b.t)); ok(waar, 'timer', 'knop zegt na pauze niet "start timer"', /start/.test(c.knop || ''));
      await druk(page, 't'); await ctx.clock.runFor(1000);
      await ctx.clock.runFor(Math.max(0, sec1 - 50) * 1000); const d = await tl(); ok(waar, 'timer', 'ring wordt niet "bijna" binnen een minuut', d.bijna || sec1 < 62);
      await ctx.clock.runFor(55 * 1000); const e = await tl(); ok(waar, 'timer', `ring niet "over" op 0:00 (${e.t})`, e.over); ok(waar, 'timer', 'band "Tijd · volgende fase" ontbreekt op 0:00', e.band); ok(waar, 'timer', `uitloop telt niet door (${e.t})`, /^\+/.test(e.t));
      await ctx.clock.runFor(30000); const f = await tl(); ok(waar, 'timer', 'uitloop telt niet door', f.t !== e.t && /^\+/.test(f.t));
      // volgende fase: timer begint opnieuw, band weg
      await druk(page, 'ArrowRight'); const g = await tl().catch(() => null); if (g && g.t) ok(waar, 'timer', 'volgende fase begint niet opnieuw (' + g.t + ')', !g.over && !g.band);
      // +1 minuut bestaat alleen in de regie; hier: terug en weer vooruit herstart de timer
      await druk(page, 'ArrowLeft'); const h = await tl(); ok(waar, 'timer', 'terug naar de fase zet de timer niet opnieuw', !h.over);
    }
    await ctx.close(); log('timers gedaan');
  }

  // ---------- 4. lesklok en opruimsignaal op alle tijden ----------
  if (wil(4)) {
    const rooster = [uur('t1', 1, '8:30', '9:15', 'tv4'), uur('t2', 1, '9:15', '10:00', 'tv4'), uur('t3', 1, '10:15', '11:00', 'tb1'), uur('t4', 1, '13:00', '13:45', 'th3')];
    const staat = { v: 1, rooster, groepLeergang: { tv4: 'vwo4', tb1: 'bb1', th3: 'havo3' }, magVanaf: '2026-08-01', beoord: { toetsen: {}, lijsten: {} } };
    const blokken = [[hm('8:30'), hm('10:00'), 'tv4'], [hm('10:15'), hm('11:00'), 'tb1'], [hm('13:00'), hm('13:45'), 'th3']];
    const verwachtStand = sec => { const b = blokken.find(x => x[0] * 60 <= sec && sec < x[1] * 60); if (!b) return null; const rest = b[1] * 60 - sec; return { rest, opruimen: rest <= 240, groep: b[2] }; };
    const klokTekst = sec => Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
    for (const [tekst, open, uid, startTijd] of [['zonder open les', false, '', '07:55'], ['met open les (t1)', true, 't1', '07:55'], ['met open les in de pauze-les (t3)', true, 't3', '09:50'], ['les later begint (t4 om 13:00)', true, 't4', '12:40']]) {
      const ctx = await nieuweContext(staat); const page = await ctx.newPage(); let waar = 'lesklok ' + tekst; volg(page, () => waar);
      await ctx.clock.install({ time: new Date(tijdIso(startTijd)) }); await ctx.clock.pauseAt(new Date(tijdIso(startTijd + ':30')));
      await laadApp(page, open ? '#nu' : '#nu');
      if (open) { await page.evaluate(([u, d]) => { sessionStorage.setItem('lesdag-lesopen', u + '|' + d); }, [uid, DAG]); await page.reload({ waitUntil: 'load' }); await wacht(page, () => { const l = document.querySelector('#les'); return l && !l.hidden; }, null, 4000);
        if (!await lesOpen(page)) { fout('lesklok: les opende niet', tekst, waar); await ctx.close(); continue; } }
      const einde = hm(startTijd === '12:40' ? '13:55' : startTijd === '09:50' ? '11:10' : '10:10') * 60;
      let sec = hm(startTijd) * 60 + 30; const stap = 15; let bandGezien = false, signaalGezien = 0;
      const mijnBlok = open ? ((x) => ({ t1: blokken[0], t3: blokken[1], t4: blokken[2] })[x])(uid) : null;
      while (sec < einde) {
        await ctx.clock.runFor(stap * 1000); sec += stap; waar = `lesklok ${tekst} ${Math.floor(sec / 3600)}:${('0' + Math.floor(sec / 60) % 60).slice(-2)}:${('0' + sec % 60).slice(-2)}`;
        const v = verwachtStand(sec);
        const r = await page.evaluate(() => { const bal = document.getElementById('lesklok'); const bord = document.getElementById('lsBord'); const rest = document.getElementById('lkRest'); const les = document.querySelector('#les');
          return { balkZichtbaar: !!bal && !bal.hidden && bal.offsetHeight > 0, balkKlasse: bal ? bal.className : '', balkTekst: bal ? bal.innerText.replace(/\s+/g, ' ').trim() : '', bord: !!bord, bordTekst: bord ? bord.innerText.replace(/\s+/g, ' ').trim() : '', bordGroot: !!bord && /ls-groot/.test(bord.className), rest: rest ? rest.textContent : null, lesAan: !!les && !les.hidden, titel: document.title,
            bordOnder: bord ? Math.round(bord.getBoundingClientRect().bottom - innerHeight) : 0, klok: (document.getElementById('klok') || {}).textContent || '' }; });
        if (open) {
          const lt = { t1: [hm('8:30'), hm('9:15')], t3: [hm('10:15'), hm('11:00')], t4: [hm('13:00'), hm('13:45')] }[uid];
          const blk = mijnBlok; let wensRest;
          if (sec < blk[0] * 60) wensRest = 'begint om ' + Math.floor(blk[0] / 60) + ':' + ('0' + blk[0] % 60).slice(-2);
          else if (sec >= blk[1] * 60) wensRest = 'les voorbij';
          else { const rest = blk[1] * 60 - sec; wensRest = rest <= 240 ? '' : 'nog ' + Math.ceil(rest / 60) + ' min'; }
          ok(waar, 'lesklok: resttijd in kopregel', `verwacht "${wensRest}", kreeg "${r.rest}"`, r.rest === wensRest);
          const wilBand = !!v && v.opruimen; if (wilBand) bandGezien = true;
          ok(waar, 'lesklok: opruimband in de les', wilBand ? 'band ontbreekt tijdens de laatste 4 minuten' : 'band staat er terwijl het niet hoort', r.bord === wilBand);
          if (wilBand && r.bord) { ok(waar, 'lesklok: opruimband', `tijd in band klopt niet: "${r.bordTekst}" voor ${klokTekst(v.rest)}`, r.bordGroot ? true : r.bordTekst.includes(klokTekst(v.rest)) || r.bordTekst.includes(klokTekst(v.rest + 1)) || r.bordTekst.includes(klokTekst(v.rest - 1)));
            ok(waar, 'lesklok: opruimband', 'band valt buiten het beeld', r.bordOnder <= 1); }
        } else {
          const wil = !!v; ok(waar, 'lesklok: balk', wil ? 'balk ontbreekt in een les' : 'balk staat er buiten een les', r.balkZichtbaar === wil);
          if (v) { ok(waar, 'lesklok: balk', `stand klopt niet (${r.balkKlasse}) bij ${v.opruimen ? 'opruimen' : 'lopen'}`, /lk-opruimen/.test(r.balkKlasse) === v.opruimen);
            if (v.opruimen) { bandGezien = true; ok(waar, 'lesklok: balk', `tijd klopt niet: "${r.balkTekst}" voor ${klokTekst(v.rest)}`, r.balkTekst.includes('Opruimen') && [v.rest - 1, v.rest, v.rest + 1].some(x => r.balkTekst.includes(klokTekst(x)))); } }
          ok(waar, 'lesklok: tabblad-titel', `titel "${r.titel}" klopt niet`, v ? (v.opruimen ? /^Opruimen/.test(r.titel) : /min · Lesdag/.test(r.titel)) : r.titel === 'Lesdag');
        }
      }
      ok('lesklok ' + tekst, 'lesklok', 'het opruimsignaal kwam niet langs', bandGezien);
      await ctx.close();
    }
    log('lesklok gedaan');
  }

  // ---------- 5. sluiten, heropenen, herladen, afronden half met notitie, de volgende les ----------
  if (wil(5)) {
    const rooster = [uur('t1', 1, '8:30', '9:15', 'tv4'), uur('t2', 1, '9:15', '10:00', 'tv4'), uur('t8', 3, '8:30', '9:15', 'tv4')];
    const staat = { v: 1, rooster, groepLeergang: { tv4: 'vwo4' }, magVanaf: '2026-08-01', beoord: { toetsen: {}, lijsten: {} } };
    const reeks = lessenVan('vwo4'); // les 1 en 2 vandaag
    const ctx = await nieuweContext(staat); const page = await ctx.newPage(); let waar = 'route afronden'; volg(page, () => waar);
    await ctx.clock.install({ time: new Date(tijdIso('08:50')) }); await ctx.clock.pauseAt(new Date(tijdIso('08:50:30'))); // kwart over acht... twintig minuten na het begin
    await laadApp(page);
    // openen via Nu-scherm
    const startKnop = await page.evaluate(() => { const b = document.querySelector('[data-start^="t1|"]'); if (b) { b.click(); return true; } return false; });
    ok(waar, 'route: les starten', 'geen startknop voor de les van nu op het Nu-scherm', startKnop);
    if (startKnop) {
      ok(waar, 'route: les starten', 'lesmodus gaat niet open', await wacht(page, () => { const l = document.querySelector('#les'); return l && !l.hidden && l.querySelector('.slide'); }, null, 3000));
      const m0 = await meet(page); ok(waar, 'route: les starten', 'een les die al bezig is begint op jouw kaart', !m0.docentkaart && m0.i >= 1);
      for (let i = 0; i < 3; i++) await druk(page, 'ArrowRight'); const m3 = await meet(page);
      // sluiten en heropenen: plek blijft
      await page.evaluate(() => document.querySelector('#les [data-l="sluit"]').click());
      ok(waar, 'route: sluiten', 'lesmodus blijft open na sluiten', !(await lesOpen(page)));
      ok(waar, 'route: sluiten', 'sessie onthoudt nog dat de les open is', await page.evaluate(() => !sessionStorage.getItem('lesdag-lesopen')));
      await page.evaluate(() => { const b = document.querySelector('[data-start^="t1|"]'); if (b) b.click(); }); await page.waitForTimeout(150);
      const mh = await meet(page); ok(waar, 'route: heropenen', `na heropenen staat dia ${mh.i + 1} i.p.v. ${m3.i + 1}`, mh.open && mh.i === m3.i);
      // herladen
      await page.reload({ waitUntil: 'load' }); await wacht(page, () => { const l = document.querySelector('#les'); return l && !l.hidden && l.querySelector('.slide'); }, null, 4000);
      const mr = await meet(page); ok(waar, 'route: herladen', `na herladen staat dia ${mr.i + 1} i.p.v. ${m3.i + 1}`, mr.open && mr.i === m3.i);
      // naar het afrondscherm, half met notitie
      await page.evaluate(() => document.querySelector('#les [data-l="naaraf"]').click());
      ok(waar, 'route: afronden', 'afrondscherm ontbreekt', await page.evaluate(() => !!document.querySelector('#les .afronden')));
      ok(waar, 'route: afronden', 'afrondscherm begint niet leeg (notitie van een eerdere dag)', await page.evaluate(() => document.querySelector('#lnot').value === ''));
      await page.evaluate(() => document.querySelector('#les [data-keuze="half"]').click());
      await page.fill('#lnot', 'Begin met de groove uit maat 9');
      await page.evaluate(() => document.querySelector('#les [data-keuze="half"]').getAttribute('aria-pressed'));
      ok(waar, 'route: afronden', 'notitie verdwijnt bij het kiezen van half af', (await page.inputValue('#lnot')) === 'Begin met de groove uit maat 9');
      const titel1 = reeks[0].l.titel || '';
      await page.evaluate(() => document.querySelector('#les [data-l="opslaan"]').click()); await page.waitForTimeout(200);
      const S1 = await page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-staat')));
      const vg = ((S1.voortgang || {}).tv4 || {})[reeks[0].id]; ok(waar, 'route: afronden', 'half-af staat niet in de voortgang', !!vg && vg.st === 'half');
      ok(waar, 'route: afronden', 'notitie niet bewaard', !!vg && vg.n === 'Begin met de groove uit maat 9');
      // de volgende les (t2) start meteen
      const open2 = await lesOpen(page); ok(waar, 'route: de volgende les', 'de volgende les start niet na opslaan', open2);
      if (open2) { const t2 = await page.evaluate(() => (document.querySelector('#les .lkop') || {}).innerText || ''); ok(waar, 'route: de volgende les', 'kop toont niet het volgende uur (9:15)', /9:15/.test(t2));
        const welkom = await page.evaluate(() => (document.querySelector('#les h1,#les h2') || {}).innerText || ''); const slTekst = (await meet(page)).slideTekst; // een half afgeronde les gaat het uur erna verder, met de notitie op jouw kaart
        ok(waar, 'route: de volgende les', 'de half afgeronde les komt terug zonder de notitie van het vorige uur', welkom.trim() !== titel1.trim() || slTekst.includes('Begin met de groove uit maat 9'));
        await page.evaluate(() => document.querySelector('#les [data-l="sluit"]').click()); }
      // weer in Nu: de les van t1 staat niet meer als te geven
      await page.waitForTimeout(100);
      // volgende lesdag (woensdag): de half afgeronde les komt terug met de notitie
      await ctx.clock.setSystemTime(new Date(tijdIso('08:00', DAG2)));
      await page.evaluate(([d]) => { sessionStorage.setItem('lesdag-lesopen', 't8|' + d); }, [DAG2]); await page.reload({ waitUntil: 'load' });
      await wacht(page, () => { const l = document.querySelector('#les'); return l && !l.hidden && l.querySelector('.slide'); }, null, 4000);
      const mk = await meet(page);
      ok(waar, 'route: de les erna', 'de lesmodus opende niet op woensdag', mk.open);
      ok(waar, 'route: de les erna', 'de half afgeronde les komt niet terug', mk.open && mk.slideTekst.includes('Begin met de groove uit maat 9'));
      ok(waar, 'route: de les erna', 'les erna begint niet op jouw kaart voor het begin', mk.docentkaart);
    }
    await ctx.close(); log('sluiten/heropenen/afronden gedaan');
  }

  // ---------- 6. regie met het bord in twee vensters ----------
  if (wil(6)) {
    const lg = 'vwo4'; const alle = lessenVan(lg); const it = alle.find(x => (x.l.fasen || []).length >= 3 && NOTITIES[x.id]) || alle.find(x => (x.l.fasen || []).length >= 3); const k = alle.indexOf(it);
    const voortgang = {}; voortgang[lgGroep(lg)] = {}; alle.slice(0, k).forEach((x, j) => { voortgang[lgGroep(lg)][x.id] = { st: 'gegeven', d: '2026-09-01', uur: 'oud' + j }; });
    const ctx = await nieuweContext(staatVoor([lg], { voortgang })); const A = await ctx.newPage(); let waar = 'regie'; volg(A, () => waar);
    await ctx.clock.install({ time: new Date(tijdIso('08:20')) }); await ctx.clock.pauseAt(new Date(tijdIso('08:30:00')));
    const uid = 'u_' + lg; const regieHash = '#regie/' + encodeURIComponent(uid) + '/' + DAG;
    await laadApp(A, regieHash);
    await A.waitForTimeout(300); await ctx.clock.runFor(2500);
    ok(waar, 'regie: zonder bord', 'zegt niet dat het bord dicht is', /Het bord is niet open/.test(await A.evaluate(() => document.querySelector('#main').innerText)));
    const [B] = await Promise.all([ctx.waitForEvent('page', { timeout: 6000 }).catch(() => null), A.evaluate(() => { const b = document.querySelector('[data-bord]'); if (b) b.click(); })]);
    ok(waar, 'regie: bord openen', 'het bordvenster ging niet open (popup)', !!B);
    if (B) {
      let waarB = 'bord'; volg(B, () => waarB);
      await wacht(B, () => { const l = document.querySelector('#les'); return l && !l.hidden && l.querySelector('.slide'); }, null, 5000);
      const b0 = await meet(B); ok(waar, 'regie: bord', 'bord opent niet', b0.open);
      ok(waar, 'regie: bord', 'bord begint op jouw kaart', b0.open && !b0.docentkaart);
      ok(waar, 'regie: bord', 'bord heeft de klasse bordvenster niet', await B.evaluate(() => document.body.classList.contains('bordvenster')));
      await ctx.clock.runFor(2500); await A.waitForTimeout(150);
      const ra = await A.evaluate(() => document.querySelector('#main').innerText); if (process.env.DBG) console.log('REGIE:', ra.slice(0, 400).split('\n').join(' | '));
      ok(waar, 'regie: regie-scherm', 'regie toont het bord niet (staat nog "niet open")', !/Het bord is niet open/.test(ra) && /op het bord/i.test(ra));
      ok(waar, 'regie: regie-scherm', 'regie toont niet de naam van de dia', /welkom/i.test(ra));
      // volgende op de regie → bord
      const stipB = () => B.evaluate(() => [...document.querySelectorAll('#les .stip i')].findIndex(x => x.classList.contains('nu')));
      const i0 = await stipB();
      await A.evaluate(() => document.querySelector('[data-rg="volgende"]').click()); await A.waitForTimeout(150); const i1 = await stipB(); ok(waar, 'regie: volgende', `bord ging niet vooruit (${i0}→${i1})`, i1 === i0 + 1);
      await A.evaluate(() => document.querySelector('[data-rg="vorige"]').click()); await A.waitForTimeout(150); ok(waar, 'regie: vorige', 'bord ging niet terug', (await stipB()) === i0);
      // pijltjes op de regie
      await A.bringToFront(); await druk(A, 'ArrowRight'); await A.waitForTimeout(150); ok(waar, 'regie: pijl rechts', 'bord volgde de pijl op de regie niet', (await stipB()) === i0 + 1);
      // lijst: spring naar de eerste fase
      const naarFase = await A.evaluate(() => { const rows = [...document.querySelectorAll('[data-rg="ga"]')]; const r = rows.find(x => /^(Opening|Luisteren|Uitleg|Aan de slag|Gesprek|Check|Afsluiting):/.test(x.innerText.trim())); if (r) { r.click(); return r.dataset.i; } return null; });
      await A.waitForTimeout(200);
      if (naarFase != null) { ok(waar, 'regie: ga naar fase', 'bord sprong niet mee', (await stipB()) === +naarFase);
        const bm = await meet(B); const rb = await A.evaluate(() => document.querySelector('#main').innerText);
        ok(waar, 'regie: klok', 'regie toont geen klok op een fase', /\d+:\d\d/.test(rb) && /loopt|staat stil|Tijd/.test(rb));
        const t1 = await A.evaluate(() => (document.querySelector('#rgTijd') || {}).textContent); await ctx.clock.runFor(5000); await A.waitForTimeout(100);  await B.waitForTimeout(300);
         await A.waitForTimeout(200);
        // klok aan/uit en +1 minuut via de regie
        await A.evaluate(() => { const b = document.querySelector('[data-rg="timer"]'); if (b) b.click(); }); await A.waitForTimeout(150);
        const na = await A.evaluate(() => (document.querySelector('[data-rg="timer"]') || {}).textContent || ''); ok(waar, 'regie: klok aan/uit', 'knop wisselt niet (' + na + ')', /Klok (aan|stil)/.test(na));
        const tp = await B.evaluate(() => (document.querySelector('#tl') || {}).textContent); await A.evaluate(() => document.querySelector('[data-rg="plus"]') && document.querySelector('[data-rg="plus"]').click()); await B.waitForTimeout(200);
        const tq = await B.evaluate(() => (document.querySelector('#tl') || {}).textContent); const sec = x => { const [m, s] = String(x || '0:0').replace('+', '').split(':').map(Number); return m * 60 + s; };
        ok(waar, 'regie: +1 min', `bord kreeg er geen minuut bij (${tp} → ${tq})`, sec(tq) - sec(tp) >= 55 && sec(tq) - sec(tp) <= 65);
      }
      // notities: alleen op de regie, nooit op het bord
      const spreker = notitieStrings(it.id)[0];
      for (let j = 0; j < 8; j++) { await A.evaluate(([j]) => { const rows = [...document.querySelectorAll('[data-rg="ga"]')]; if (rows[j]) rows[j].click(); }, [j]); await A.waitForTimeout(120);
        const tb = (await meet(B)).tekst; ok(waar, 'regie: notities niet op het bord', `sprekersnotities op het bord (dia ${j + 1})`, !/sprekersnotities|alleen jij ziet/i.test(tb)); }
      if (NOTITIES[it.id]) { let zag = false; for (let j = 0; j < 8; j++) { await A.evaluate(([j]) => { const rows = [...document.querySelectorAll('[data-rg="ga"]')]; if (rows[j]) rows[j].click(); }, [j]); await A.waitForTimeout(150);
          if (/sprekersnotities/i.test(await A.evaluate(() => document.querySelector('#main').innerText))) { zag = true; break; } } ok(waar, 'regie: notities op de regie', 'de regie toont de sprekersnotities nooit', zag); }
      // het bord herladen: plek blijft
      await A.evaluate(() => document.querySelector('[data-rg="ga"][data-i="2"]') && document.querySelector('[data-rg="ga"][data-i="2"]').click()); await A.waitForTimeout(150);
      const voor = await stipB(); await B.reload({ waitUntil: 'load' }); await wacht(B, () => { const l = document.querySelector('#les'); return l && !l.hidden && l.querySelector('.slide'); }, null, 4000); await B.waitForTimeout(200);
      ok(waar, 'regie: bord herladen', `bord begint na herladen niet op dezelfde plek (${voor} → ${await stipB()})`, (await stipB()) === voor);
      // afronden vanuit de regie: half met notitie
      await A.fill('#rgNot', 'Regie-notitie voor de volgende keer').catch(() => {});
      const gesloten = B.waitForEvent('close', { timeout: 5000 }).then(() => true).catch(() => false);
      await A.evaluate(() => { const b = document.querySelector('[data-rgaf="half"]'); if (b) b.click(); }); await A.waitForTimeout(300);
      ok(waar, 'regie: afronden sluit het bord', 'bordvenster bleef open na afronden', await gesloten);
      const SA = await A.evaluate(() => JSON.parse(localStorage.getItem('lesdag-staat'))); const vg = ((SA.voortgang || {})[lgGroep(lg)] || {})[it.id];
      ok(waar, 'regie: afronden', 'half-af met notitie niet bewaard', !!vg && vg.st === 'half' && /Regie-notitie/.test(vg.n || ''));
      ok(waar, 'regie: afronden', 'regie gaat niet terug naar Nu', /#nu/.test(await A.evaluate(() => location.hash)));
    }
    // bord sluiten vanuit het bord zelf: de regie ziet het
    const ctx2 = await nieuweContext(staatVoor([lg], { voortgang })); const A2 = await ctx2.newPage(); volg(A2, () => 'regie 2');
    await ctx2.clock.install({ time: new Date(tijdIso('08:20')) }); await ctx2.clock.pauseAt(new Date(tijdIso('08:30:00')));
    await laadApp(A2, regieHash); await ctx2.clock.runFor(2500);
    const [B2] = await Promise.all([ctx2.waitForEvent('page', { timeout: 6000 }).catch(() => null), A2.evaluate(() => { const b = document.querySelector('[data-bord]'); if (b) b.click(); })]);
    if (B2) { await wacht(B2, () => { const l = document.querySelector('#les'); return l && !l.hidden; }, null, 5000); await ctx2.clock.runFor(2500); await A2.waitForTimeout(100);
      await B2.evaluate(() => document.querySelector('#les [data-l="sluit"]').click()).catch(() => {}); await A2.waitForTimeout(300); await ctx2.clock.runFor(1000);
      ok('regie', 'regie: bord sluiten', 'regie merkt niet dat het bord dicht is', /Het bord is niet open/.test(await A2.evaluate(() => document.querySelector('#main').innerText))); }
    // bord sluiten vanuit de regie
    const [B3] = await Promise.all([ctx2.waitForEvent('page', { timeout: 6000 }).catch(() => null), A2.evaluate(() => { const b = document.querySelector('[data-bord]'); if (b) b.click(); })]);
    if (B3) { await wacht(B3, () => { const l = document.querySelector('#les'); return l && !l.hidden; }, null, 5000); await ctx2.clock.runFor(2500); await A2.waitForTimeout(100);
      const dicht = B3.waitForEvent('close', { timeout: 4000 }).then(() => true).catch(() => false); await A2.evaluate(() => { const b = document.querySelector('[data-rg="sluit"]'); if (b) b.click(); });
      ok('regie', 'regie: bord sluiten', 'bordvenster sluit niet vanuit de regie', await dicht); }
    await ctx.close(); await ctx2.close(); log('regie gedaan');
  }

  // ---------- 7. later begonnen: fasen inkorten ----------
  if (wil(7)) {
    const lg = 'vwo4'; const alle = lessenVan(lg); const it = alle.find(x => faseMinuten(x.l) >= 40 && (x.l.fasen || []).length >= 4) || alle[1]; const k = alle.indexOf(it);
    const voortgang = {}; voortgang[lgGroep(lg)] = {}; alle.slice(0, k).forEach((x, j) => { voortgang[lgGroep(lg)][x.id] = { st: 'gegeven', d: '2026-09-01', uur: 'oud' + j }; });
    for (const late of ['08:45', '09:00', '09:10', '09:20']) {
      const ctx = await nieuweContext(staatVoor([lg], { voortgang })); const page = await ctx.newPage(); let waar = 'later begonnen ' + late; volg(page, () => waar);
      await ctx.clock.install({ time: new Date(tijdIso(late)) }); await ctx.clock.pauseAt(new Date(tijdIso(late + ':01')));
      await laadApp(page); await page.evaluate(([u, d]) => { sessionStorage.setItem('lesdag-lesopen', u + '|' + d); }, ['u_' + lg, DAG]); await page.reload({ waitUntil: 'load' });
      if (!await wacht(page, () => { const l = document.querySelector('#les'); return l && !l.hidden && l.querySelector('.slide'); }, null, 4000)) { if (late !== '09:20') fout('later begonnen: les opent niet', late, waar); await ctx.close(); continue; }
      let m = await meet(page); const n = m.n; const rest = hm('9:15') * 60 - (hm(late) * 60 + 1); let som = 0; let hel = true;
      const fasen = (it.l.fasen || []).map(f => typeof f === 'object' ? f : { min: +((String(f).match(/^(\d+)/) || [])[1] || 0), soort: /afsluit|check/i.test(f) ? 'afsluiten' : 'doen' });
      for (let i = 0; i < n; i++) { if (i) { await druk(page, 'ArrowRight'); m = await meet(page); }
        if (m.fase === 'fase') { const tl = await page.evaluate(() => (document.querySelector('#tl') || {}).textContent || ''); const [mm, ss] = tl.split(':').map(Number); const getoond = mm + (ss > 0 ? 1 : 0);
          const idx = (await page.evaluate(() => [...document.querySelectorAll('#les .stip i')].filter(x => x.classList.contains('fase')).findIndex(x => x.classList.contains('nu'))));
          const f = fasen[idx]; if (f) { ok(waar, 'later begonnen: fase langer dan gepland', `fase ${idx + 1} toont ${getoond} min, gepland ${f.min}`, getoond <= f.min + 0); if (f.soort === 'afsluiten' || f.soort === 'check') ok(waar, 'later begonnen: check/afsluiting ingekort', `fase ${idx + 1} (${f.soort}) is ingekort van ${f.min} naar ${getoond}`, getoond === f.min); } } }
      await ctx.close();
    }
    log('later begonnen gedaan');
  }

  await browser.close(); server.kill();

  // ---------- rapport ----------
  const R_ = [];
  const p = t => R_.push(t);
  p(`Routetest lesmodus, ${new Date().toISOString().slice(0, 10)}. ${nTest} controles in ${((Date.now() - t0) / 1000).toFixed(0)} s.`);
  p('');
  p('PER LEERGANG: fasen die niet passen op het scherm (dia loopt over of raakt de timer)');
  p('leergang   lessen  getest  fase-dia\'s  past niet 1280×800  past niet 1920×1080  lessen te lang voor 45 min');
  for (const lg of LEERGANGEN) { const R = RAP[lg]; if (!R) continue; p(`${lg.padEnd(9)} ${String(R.lessen).padStart(6)} ${String(R.getest).padStart(7)} ${String(R.faseDia).padStart(9)} ${String(R.past1280).padStart(19)} ${String(R.past1920).padStart(19)} ${String(R.tijdTeLang.length).padStart(26)}`); }
  p('');
  const vandaag = '2026-11-08'; const acht = '2027-01-03';
  const lijst = (naam, sel) => { const alle_ = []; for (const lg of LEERGANGEN) for (const d of (RAP[lg] || {}).details || []) alle_.push(Object.assign({ lg }, d)); return alle_; };
  const dia = lijst().sort((a, b) => (a.datum || 'z').localeCompare(b.datum || 'z'));
  const komend = dia.filter(x => x.datum && x.datum >= vandaag && x.datum <= '2027-01-03'), rest = dia.filter(x => !komend.includes(x));
  p(`DIA'S DIE NIET PASSEN, komende acht weken eerst (t/m ${acht})`);
  const regel = x => `  ${x.datum || '?'}  ${x.id}  dia ${x.dia}  "${(x.kop || '').slice(0, 60)}"  (${x.oy1280 > 2 ? 'loopt ' + x.oy1280 + 'px over op 1280' : ''}${x.oy1920 > 2 ? ' / ' + x.oy1920 + 'px op 1920' : ''}${x.timer ? ' raakt timer' : ''})`;
  komend.forEach(x => p(regel(x))); if (!komend.length) p('  geen');
  p(''); p('DAARNA'); rest.forEach(x => p(regel(x))); if (!rest.length) p('  geen');
  p('');
  p('LESSEN WAARIN DE FASEMINUTEN LANGER ZIJN DAN DE LES (45 min), komende acht weken eerst');
  const tl = []; for (const lg of LEERGANGEN) for (const x of (RAP[lg] || {}).tijdTeLang || []) tl.push(Object.assign({ lg }, x)); tl.sort((a, b) => (a.datum || 'z').localeCompare(b.datum || 'z'));
  tl.forEach(x => p(`  ${x.datum || '?'}  ${x.id}  ${x.som} min voor ${x.duur}  "${(x.titel || '').slice(0, 50)}"`)); if (!tl.length) p('  geen');
  p(''); p('GEGEVENS IN BASIS.JSON DIE NIET KLOPPEN (leeg, onbekend beeld, geen minuten)');
  GEGEVENS.forEach(x => p(`  ${x.id}  ${x.s}  "${(x.titel || '').slice(0, 40)}"`)); if (!GEGEVENS.length) p('  geen');
  const tekst = R_.join('\n');
  if (RAPPORT) { fs.mkdirSync(path.dirname(RAPPORT), { recursive: true }); fs.writeFileSync(RAPPORT, tekst, 'utf8'); }
  console.log('\n' + R_.slice(0, 14).join('\n') + (RAPPORT ? `\n(volledig rapport: ${RAPPORT})` : ''));

  console.log(`\nRoutetest: ${nTest} controles in ${((Date.now() - t0) / 1000).toFixed(0)} s.`);
  if (!FOUTEN.size) { console.log('Alle routes in orde.'); process.exit(0); }
  const perCat = {}; for (const e of FOUTEN.values()) (perCat[e.cat] = perCat[e.cat] || []).push(e);
  for (const [c, l] of Object.entries(perCat)) { console.log('\n' + c + ':'); for (const e of l) console.log(`  ${e.wat}  [${e.n}x${TOON ? ': ' + e.waar.join('; ') : ', o.a. ' + e.waar.slice(0, 2).join('; ')}]`); }
  console.log(`\n${FOUTEN.size} verschillende fout(en).`);
  process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
