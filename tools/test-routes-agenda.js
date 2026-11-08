// node tools/test-routes-agenda.js [--poort=8753] [--filter=tekst] [--toon]
// Routetest voor agenda en planning: hele klikroutes (Nieuw, slepen, plannen, Blijft liggen, afvinken, Ik ben er niet, Valt uit,
// inhalen, eenmalig lesuur, toets verplaatsen, Dag afsluiten, Week, Jaar, klasblad, kopie, Agenda in Outlook) in een wegwerpbrowser,
// met een nagebootste klok, een nagebootst Zermelo (ook rommelig) en een nagebootste agenda-API. Alles verzonnen; er blijft niets staan.
// Zelfde opzet als test-schermen.js: Playwright staat buiten de repo (zie tools/TESTEN.md, NODE_PATH). Exitcode 0 goed, 1 fouten, 2 overgeslagen.
const cp = require('child_process'), net = require('net'), path = require('path'), fs = require('fs');
const args = process.argv.slice(2); const arg = (n, d) => { const a = args.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const FILTER = arg('filter', ''), TOON = args.includes('--toon');
let pw; try { pw = require('playwright-core'); } catch (e) { try { pw = require('playwright'); } catch (e2) { console.log('OVERGESLAGEN: Playwright niet gevonden (zet NODE_PATH, zie tools/TESTEN.md).'); process.exit(2); } }

// ---- verzonnen rooster (zelfde als test-schermen.js) ----
const uur = (id, dag, start, eind, groep, lokaal) => ({ id, dag, start, eind, groep, lokaal: lokaal || '009' });
const ROOSTER = [
  uur('t1', 1, '8:30', '9:15', 'tv4'), uur('t2', 1, '9:15', '10:00', 'tv4'), uur('t3', 1, '10:15', '11:00', 'tb1'), uur('t4', 1, '13:00', '13:45', 'th3'),
  uur('t5', 2, '8:30', '9:15', 'th3'), uur('t6', 2, '9:15', '10:00', 'tm4'), uur('t7', 2, '11:15', '12:00', 'tv5'),
  uur('t8', 3, '8:30', '9:15', 'tv4'), uur('t9', 3, '9:15', '10:00', 'tv4'), uur('t10', 3, '10:15', '11:00', 'tv5'),
  uur('t11', 4, '9:15', '10:00', 'tb1'), uur('t12', 4, '10:15', '11:00', 'tm4'),
  uur('t13', 5, '8:30', '9:15', 'th3'), uur('t14', 5, '9:15', '10:00', 'tb1'),
];
const GROEPEN = { tv4: 'vwo4', tv5: 'vwo5', th3: 'havo3', tb1: 'bb1', tm4: 'mavo4' };
const BASISSTAAT = () => ({ v: 1, rooster: JSON.parse(JSON.stringify(ROOSTER)), groepLeergang: Object.assign({}, GROEPEN), magVanaf: '2026-08-01', beoord: { toetsen: {}, lijsten: {} } });
const MA = '2026-11-16T09:50:00+01:00'; // maandag lesweek 11, tussen de lessen van tv4 en tb1

// ---- harnas ----
const vrijePoort = () => new Promise(r => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const bladeren = [process.env.LESDAG_BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const resultaat = []; let huidig = null, browser = null, basis = '';
const ok = (c, m) => { if (!c) { huidig.fouten.push(m); } return !!c; };
const gelijk = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: kreeg ${JSON.stringify(a)}, verwacht ${JSON.stringify(b)}`);
const pauze = ms => new Promise(r => setTimeout(r, ms));

// Een Zermelo-afspraak zoals de API hem geeft (tijden in seconden, Nederlandse tijd). ev: {d:'2026-11-16', start:'8:30', eind:'9:15', vakken, groepen, type, cancelled, locations, remark, hidden}
const zAfspraak = (ev, i) => {
  const t = (d, hm) => { const [h, m] = hm.split(':').map(Number); const dt = new Date(d + 'T12:00:00Z'); const jaar = +d.slice(0, 4);
    // Nederlandse zomertijd: laatste zondag maart t/m laatste zondag oktober
    const laatsteZo = (mnd) => { const x = new Date(Date.UTC(jaar, mnd + 1, 0)); x.setUTCDate(x.getUTCDate() - x.getUTCDay()); return x; };
    const a = laatsteZo(2), b = laatsteZo(9); const zomer = dt >= a && dt < b; // op de omschakeldag zelf is 12:00 al in de nieuwe tijd; lessen liggen ook na 3 uur
    return Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10), h - (zomer ? 2 : 1), m) / 1000; };
  return Object.assign({ id: 9000 + i, appointmentInstance: 9000 + i, type: 'lesson', start: t(ev.d, ev.start), end: t(ev.d, ev.eind), subjects: ['mu'], groups: [], locations: ['009'], cancelled: false, hidden: false }, ev.api || {},
    { subjects: ev.vakken || ['mu'], groups: ev.groepen || [], type: ev.type || 'lesson', cancelled: !!ev.cancelled, locations: ev.locations || ['009'], remark: ev.remark || '', hidden: !!ev.hidden });
};
// Zermelo-week die bij ROOSTER hoort: voor elke week het vaste rooster; opties om rommel toe te voegen.
const maandag = d => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
const plus = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
function zermeloWeek(ma, o = {}) {
  const uit = [];
  for (const u of ROOSTER) {
    if (o.zonderDag && o.zonderDag.includes(u.dag)) continue;
    const d = plus(ma, u.dag - 1); const [h, m] = u.start.split(':');
    uit.push({ d, start: u.start.padStart(5, '0'), eind: u.eind.padStart(5, '0'), groepen: [u.groep], vakken: ['mu'], locations: [u.lokaal], cancelled: !!(o.vervallen && o.vervallen.includes(u.id)) });
  }
  return uit.concat(o.extra || []);
}

/* Maakt een nieuwe wegwerpbrowser-pagina. opties:
   tijd (ISO), staat (object of functie op de basisstaat), zermelo (functie (van,tot)=>[ev] of lijst), agenda (nagebootste /api/agenda), ls (extra localStorage), breedte */
async function pagina(o = {}) {
  const ctx = await browser.newContext({ viewport: { width: o.breedte || 1280, height: 900 }, timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block' });
  const log = { api: [], agenda: [], console: [], uitzonderingen: [] };
  await ctx.route(u => !u.href.startsWith(basis), r => r.fulfill({ status: 200, contentType: r.request().resourceType() === 'stylesheet' ? 'text/css' : 'text/plain', body: '' }));
  await ctx.route(u => u.pathname.startsWith('/api/'), async r => {
    const q = r.request(); const p = new URL(q.url()).pathname;
    if (p === '/api/agenda' && o.agenda) { const x = o.agenda; log.agenda.push({ method: q.method(), body: q.postData() }); return x(q, r, log); }
    r.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  const proxy = 'https://lesdag-rooster.f-nieuwenhuyzen.workers.dev';
  await ctx.route(proxy + '/**', async r => {
    const q = r.request(); let b = {}; try { b = JSON.parse(q.postData() || '{}'); } catch (e) {}
    log.api.push(b);
    if (!o.zermelo) return r.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    if (b.actie === 'koppel') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'testtoken' }) });
    if (b.actie === 'afspraken') {
      if (o.zermeloFout) return r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ fout: 'kapot' }) });
      const van = new Date(b.van * 1000), dag = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam' }).format(new Date((b.van + 7200) * 1000));
      const evs = typeof o.zermelo === 'function' ? o.zermelo(dag, plus(dag, 21), log.api.filter(x => x.actie === 'afspraken').length) : o.zermelo;
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ afspraken: evs.map(zAfspraak) }) });
    }
    r.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  const staat = typeof o.staat === 'function' ? o.staat(BASISSTAAT()) : (o.staat || BASISSTAAT());
  await ctx.addInitScript(([st, ls]) => { try { if (!sessionStorage.getItem('lesdag-test-ingesteld')) { if (st) localStorage.setItem('lesdag-staat', JSON.stringify(st)); for (const [k, v] of Object.entries(ls || {})) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); sessionStorage.setItem('lesdag-test-ingesteld', '1'); } } catch (e) {} }, [staat, Object.assign({}, o.zermelo ? { 'lesdag-zermelo-api': 'testtoken' } : {}, o.ls || {})]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000); await ctx.clock.install({ time: new Date(o.tijd || MA) }); // de tijd loopt vanaf dit moment door, zodat id's op Date.now() niet botsen
  page.on('pageerror', e => { log.uitzonderingen.push(String(e.message).slice(0, 300)); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) log.console.push(m.text().slice(0, 300)); });
  page.on('dialog', d => { log.dialogen = (log.dialogen || []); log.dialogen.push(d.message()); d.accept(); });
  const P = { page, ctx, log, basis,
    async open(hash) { await page.goto(basis + (hash ? '#' + hash : '#vandaag'), { waitUntil: 'load' }); await page.waitForFunction(() => document.querySelector('#main') && !/Lesdag laden/.test(document.querySelector('#main').textContent), null, { timeout: 8000 }); await page.waitForTimeout(150); return P; },
    async hash(h) { await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(120); },
    async klok(iso, hash) { await ctx.clock.setSystemTime(new Date(iso)); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => document.querySelector('#main') && !/Lesdag laden/.test(document.querySelector('#main').textContent)); if (hash) await P.hash(hash); await page.waitForTimeout(150); },
    // zet de opgeslagen staat om en laad de pagina opnieuw (wat er al stond blijft staan)
    async wijzig(fn, hash) { await page.evaluate(src => { const s = JSON.parse(localStorage.getItem('lesdag-staat')); (new Function('s', src))(s); localStorage.setItem('lesdag-staat', JSON.stringify(s)); }, '(' + fn.toString() + ')(s)'); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => document.querySelector('#main') && !/Lesdag laden/.test(document.querySelector('#main').textContent)); if (hash) await P.hash(hash); await page.waitForTimeout(150); },
    liggen: async () => +((await page.evaluate(() => { const e = document.querySelector('#nav .nav-tel[title*="liggen"]'); return e ? e.textContent : '0'; })) || 0),
    S: () => page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-staat') || 'null')),
    tekst: sel => page.evaluate(s => { const e = document.querySelector(s || '#main'); return e ? e.innerText : ''; }, sel),
    toast: () => page.evaluate(() => { const e = document.querySelector('#toast'); return e && !e.hidden ? e.innerText : ''; }),
    klik: async sel => { await page.locator(sel).first().click({ timeout: 4000 }); await page.waitForTimeout(150); },
    zichtbaar: sel => page.locator(sel).first().isVisible().catch(() => false),
    aantal: sel => page.locator(sel).count(),
    async sluit() { await ctx.close(); } };
  return P;
}

async function scenario(naam, fn) {
  if (FILTER && !naam.toLowerCase().includes(FILTER.toLowerCase())) return;
  huidig = { naam, fouten: [] }; const t0 = Date.now(); let P = null;
  try { await fn(async o => (P = await pagina(o))); } catch (e) { huidig.fouten.push('uitzondering in de test: ' + String(e.message).split('\n')[0]); }
  if (P) { for (const x of P.log.uitzonderingen) huidig.fouten.push('uitzondering in de app: ' + x); for (const x of P.log.console) huidig.fouten.push('consolefout: ' + x); await P.sluit().catch(() => {}); }
  huidig.ms = Date.now() - t0; resultaat.push(huidig);
  console.log((huidig.fouten.length ? 'FOUT ' : 'ok   ') + naam + (TOON || huidig.fouten.length ? '' : '') + `  (${(huidig.ms / 1000).toFixed(1)} s)`);
  for (const f of huidig.fouten) console.log('       - ' + f);
}

const SCENARIOS = [];
const sc = (naam, fn) => SCENARIOS.push([naam, fn]);
module.exports = {};

// ======================= scenario's =======================
sc('Nieuw: afspraak met tijd getypt', async nieuw => {
  const P = await nieuw(); await P.open('vandaag');
  await P.klik('[data-nwnieuw]'); ok(await P.zichtbaar('#nwQ'), 'invulveld opent');
  await P.page.fill('#nwQ', 'wo 11-12 met Albert'); await P.page.waitForTimeout(100);
  const uit = await P.tekst('#nwUit'); ok(/Afspraak/.test(uit) && /11:00–12:00/.test(uit), 'voorbeeld noemt afspraak 11:00–12:00, kreeg: ' + uit);
  await P.klik('[data-nwzet]'); await P.page.waitForTimeout(150);
  const S = await P.S(); const k = (S.taken || []).find(x => /Albert/.test(x.titel));
  ok(k && k.afspraak && k.plan && k.plan.dag === '2026-11-18' && k.plan.van === '11:00' && k.plan.tot === '12:00', 'afspraak staat op wo 18 nov 11:00–12:00: ' + JSON.stringify(k));
});
const VROEG = '2026-11-16T07:30:00+01:00'; // maandag 16 nov, vóór de eerste les
const klikData = async (P, sel) => { await P.page.locator(sel).first().evaluate(e => e.click()); await P.page.waitForTimeout(150); }; // ook voor knoppen in een dichtgeklapt blok
const taakIn = (S, re) => (S.taken || []).find(x => re.test(x.titel));

sc('Nieuw: taak', async nieuw => {
  const P = await nieuw({ tijd: VROEG }); await P.open('vandaag');
  await P.klik('[data-nwnieuw]'); await P.klik('[data-nwsoort="taak"]');
  await P.page.fill('#nwQ', 'nakijken toetsen di 13-14'); await P.page.waitForTimeout(100);
  const uit = await P.tekst('#nwUit'); ok(/^Taak/.test(uit) && /13:00–14:00/.test(uit), 'voorbeeld noemt taak 13:00–14:00: ' + uit);
  await P.klik('[data-nwzet]');
  const k = taakIn(await P.S(), /nakijken/i);
  ok(k && !k.afspraak && k.plan && k.plan.dag === '2026-11-17' && k.plan.van === '13:00' && k.plan.tot === '14:00', 'taak staat op di 17 nov 13:00–14:00: ' + JSON.stringify(k));
  ok(/Ongedaan maken/.test(await P.toast()), 'melding biedt Ongedaan maken');
  await P.klik('.toast-terug'); ok(!taakIn(await P.S(), /nakijken/i), 'Ongedaan maken haalt de taak weer weg');
});
sc('Nieuw: afspraak zonder tijd/dag wordt geweigerd', async nieuw => {
  const P = await nieuw({ tijd: VROEG }); await P.open('vandaag');
  await P.klik('[data-nwnieuw]'); await P.page.fill('#nwQ', 'iets om 25:00'); await P.page.waitForTimeout(100);
  await P.klik('[data-nwzet]'); const S = await P.S(); ok(!(S.taken || []).length, 'er komt niets in de lijst bij 25:00: ' + JSON.stringify(S.taken));
  ok(/klopt nog niet|tijd/i.test(await P.tekst('#nw')), 'het vak zegt dat de tijd niet klopt');
  await P.page.fill('#nwQ', ''); await P.klik('[data-nwzet]'); ok(!((await P.S()).taken || []).length, 'lege tekst maakt niets');
});
sc('Nieuw: extra les en geruilde les', async nieuw => {
  const P = await nieuw({ tijd: VROEG }); await P.open('vandaag');
  await P.klik('[data-nwnieuw]'); await P.klik('[data-nwsoort="les"]');
  await P.page.selectOption('#nwKlas', 'tv4'); await P.page.fill('#nwQ', 'extra les tv4 di 15-16'); await P.page.waitForTimeout(100);
  await P.klik('[data-nwzet]'); let S = await P.S();
  const x = (S.extraUren || []).find(e => e.groep === 'tv4' && e.s === '2026-11-17');
  ok(x && x.start === '15:00', 'extra uur tv4 di 17 nov 15:00 staat in S.extraUren: ' + JSON.stringify(S.extraUren));
  ok((S.afwijkingen || []).some(a => a.soort === 'eenmalig' && a.g === 'tv4'), 'er is een afwijking "eenmalig" voor tv4');
  await P.hash('week'); ok(/tv4/.test(await P.tekst('.ag-kol[data-kdag="2026-11-17"]')), 'in Week staat tv4 op dinsdag');
  await P.hash('vandaag');
  // ruil: dinsdag 17 nov 15:00 geeft het uur van woensdag 18 nov 8:30 (t8) op
  await P.klik('[data-nwnieuw]'); await P.klik('[data-nwsoort="les"]'); await P.page.selectOption('#nwKlas', 'tv4');
  await P.page.fill('#nwQ', 'ruil tv4 do 15-16'); await P.page.waitForTimeout(100);
  const opties = await P.page.$$eval('#nwRuil option', o => o.map(x => x.value)); ok(opties.length > 1, 'ruilopties staan er: ' + opties.join(','));
  await P.page.selectOption('#nwRuil', opties.find(v => /^2026-11-18\|t8$/.test(v)) || opties[1]); await P.klik('[data-nwzet]'); S = await P.S();
  const r = (S.extraUren || []).find(e => e.ruil); ok(r && r.s === '2026-11-19', 'geruild uur op do 19 nov: ' + JSON.stringify(r));
  ok(r && (S.uitval[r.ruil.s] || []).includes(r.ruil.uur), 'het oude uur staat op uitval');
  await P.klik('.toast-terug'); S = await P.S(); ok(!(S.extraUren || []).some(e => e.ruil) && !(S.uitval[(r || { ruil: {} }).ruil.s] || []).includes((r || { ruil: {} }).ruil.uur), 'Ongedaan maken zet ruil en uitval terug');
});
sc('Nieuw: les op een vrije dag of dubbel wordt geweigerd', async nieuw => {
  const P = await nieuw({ tijd: VROEG }); await P.open('vandaag');
  await P.klik('[data-nwnieuw]'); await P.klik('[data-nwsoort="les"]'); await P.page.selectOption('#nwKlas', 'tv4');
  await P.page.fill('#nwQ', 'extra les tv4 zaterdag 15-16'); await P.klik('[data-nwzet]');
  ok(!((await P.S()).extraUren || []).length, 'geen extra uur op zaterdag');
  await P.page.fill('#nwQ', 'extra les tv4 ma 8:30-9:15'); await P.klik('[data-nwzet]');
  ok(!((await P.S()).extraUren || []).length, 'geen extra uur op een tijd waar tv4 al les heeft');
});
sc('Slepen in de agenda: nieuw, verschuiven, verlengen', async nieuw => {
  const P = await nieuw({ tijd: VROEG }); await P.open('vandaag');
  const kol = P.page.locator('.ag-kol[data-kdag="2026-11-16"]'); const geo = async () => kol.evaluate(k => { const r = k.getBoundingClientRect(), d = k.closest('.ag-raster').dataset; return { top: r.top, left: r.left, w: r.width, van: +d.van, ppm: +d.ppm }; });
  let g = await geo(); const yv = m => g.top + (m - g.van) * g.ppm; const x = g.left + g.w / 2;
  const m = P.page.mouse; await m.move(x, yv(14 * 60 + 5)); await m.down(); await m.move(x, yv(14 * 60 + 30), { steps: 4 }); await m.move(x, yv(15 * 60), { steps: 4 }); await m.up(); await P.page.waitForTimeout(200);
  ok(await P.zichtbaar('#nw'), 'invulveld opent na slepen'); const uit = await P.tekst('#nwUit'); ok(/14:00–15:00/.test(uit), 'sleep 14:00–15:00 staat in het voorbeeld: ' + uit);
  await P.page.fill('#nwQ', 'overleg met Albert'); await P.klik('[data-nwzet]');
  let S = await P.S(); const k = taakIn(S, /Albert/); ok(k && k.plan.van === '14:00' && k.plan.tot === '15:00', 'sleep gaf 14:00–15:00: ' + JSON.stringify(k && k.plan));
  g = await geo(); const blok = P.page.locator(`.ag-it[data-kid="${k.id}"]`); const bb = await blok.boundingBox();
  await m.move(bb.x + bb.width / 2, bb.y + 10); await m.down(); await m.move(bb.x + bb.width / 2, bb.y + 10 + 30 * g.ppm, { steps: 5 }); await m.up(); await P.page.waitForTimeout(200);
  S = await P.S(); const k2 = taakIn(S, /Albert/); ok(k2.plan.van === '14:30' && k2.plan.tot === '15:30', 'verschuiven 30 min: ' + JSON.stringify(k2.plan));
  const bb2 = await P.page.locator(`.ag-it[data-kid="${k.id}"]`).boundingBox(); const grip = P.page.locator(`.ag-it[data-kid="${k.id}"] .ag-grip`); const gb = await grip.boundingBox();
  await m.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await m.down(); await m.move(gb.x + gb.width / 2, gb.y + gb.height / 2 + 30 * g.ppm, { steps: 5 }); await m.up(); await P.page.waitForTimeout(200);
  const k3 = taakIn(await P.S(), /Albert/); ok(k3.plan.van === '14:30' && k3.plan.tot === '16:00', 'verlengen met 30 min: ' + JSON.stringify(k3.plan));
});
sc('Plannen in een vrij blok (klik in de lege agenda)', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: s => { s.taken = [{ id: 'kp1', titel: 'Toetsen nakijken', bron: 'overig', af: false, d: '2026-11-20' }]; return s; } }); await P.open('vandaag');
  const kol = P.page.locator('.ag-kol[data-kdag="2026-11-16"]'); const bb = await kol.boundingBox(); const g = await kol.evaluate(k => { const d = k.closest('.ag-raster').dataset; return { van: +d.van, ppm: +d.ppm }; });
  await P.page.mouse.click(bb.x + bb.width / 2, bb.y + (11 * 60 + 20 - g.van) * g.ppm); await P.page.waitForTimeout(200);
  ok(await P.zichtbaar('#nw'), 'klik in de lege agenda opent het invulveld');
  ok(await P.zichtbaar('#nwSug button[data-slot]'), 'het veld stelt taken voor die in het blok passen: ' + await P.tekst('#nw'));
  await P.klik('#nwSug button[data-slot]'); const S = await P.S(); const gepland = (S.taken || []).filter(x => x.plan && x.plan.dag === '2026-11-16');
  ok(gepland.length === 1 && gepland[0].plan.van === '11:15', 'een voorgestelde taak staat nu op ma 16 nov 11:15: ' + JSON.stringify(gepland.map(x => x.plan)));
  ok(!(await P.zichtbaar('#nw')), 'het veld sluit');
});
sc('Blijft liggen: tellen, uitstellen, plannen', async nieuw => {
  const gisteren = '2026-11-13'; // vrijdag voor de maandag
  const P = await nieuw({ tijd: VROEG }); await P.open('vandaag'); const n0 = await P.liggen();
  await P.wijzig(s => { s.taken = [
    { id: 'a1', titel: 'Gemiste taak', bron: 'overig', af: false, plan: { dag: '2026-11-13', van: '14:00', tot: '15:00' } },
    { id: 'a2', titel: 'Deadline voorbij', bron: 'mail', af: false, d: '2026-11-12' },
    { id: 'a3', titel: 'Gemiste afspraak', bron: 'overig', af: false, afspraak: true, plan: { dag: '2026-11-13', van: '10:00', tot: '11:00' } },
    { id: 'a4', titel: 'Nog niet aan de beurt', bron: 'overig', af: false, d: '2026-11-30' }]; }, 'vandaag');
  gelijk(await P.liggen(), n0 + 2, 'teller bij Nu: de gemiste taak en de voorbije deadline tellen, de afspraak en de toekomstige deadline niet');
  ok(new RegExp('Blijft liggen · ' + (n0 + 2) + '(?!\\d)').test(await P.tekst()), 'Dag noemt hetzelfde aantal');
  await klikData(P, '[data-liggenlater^="eigen:a1|"]'); let S = await P.S(); ok(S.uitgesteld && S.uitgesteld['eigen:a1'], 'Morgen zet uitgesteld: ' + JSON.stringify(S.uitgesteld));
  gelijk(await P.liggen(), n0 + 1, 'teller na uitstellen');
  await klikData(P, '[data-liggenplan="eigen:a2"]'); await P.page.waitForTimeout(200);
  ok(await P.zichtbaar('#planForm'), 'Plan opent een planformulier'); ok(await P.page.$eval('#pK', e => e.value) === 'eigen:a2', 'de taak staat al gekozen in de keuzelijst');
  await P.page.locator('#planForm button[type=submit]').click(); await P.page.waitForTimeout(150); S = await P.S(); const k = S.taken.find(x => x.id === 'a2');
  ok(k.plan && k.plan.dag >= '2026-11-16', 'de taak is opnieuw gepland: ' + JSON.stringify(k.plan)); gelijk(await P.liggen(), n0, 'teller na plannen: alleen wat er al lag');
});
sc('Blijft liggen: een dag later weer terug, afvinken', async nieuw => {
  const P = await nieuw({ tijd: VROEG }); await P.open('vandaag'); const n0 = await P.liggen();
  await P.wijzig(s => { s.taken = [{ id: 'b1', titel: 'Oude taak', bron: 'overig', af: false, d: '2026-11-10' }]; s.uitgesteld = { 'eigen:b1': '2026-11-17' }; }, 'vandaag');
  const inLiggen = () => P.page.evaluate(() => !!document.querySelector('.liggen [data-taakaf="b1"]'));
  ok(!(await inLiggen()), 'uitgesteld tot morgen: vandaag niet in Blijft liggen');
  await P.klok('2026-11-17T07:30:00+01:00', 'vandaag'); ok(await inLiggen(), 'de volgende dag komt hij terug');
  await klikData(P, '.liggen [data-taakaf="b1"]');
  const S = await P.S(); ok(S.taken[0].af === true, 'afvinken zet af'); ok(!(await inLiggen()), 'en haalt hem uit Blijft liggen');
});
sc('Afvinken met ongedaan maken', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: s => { s.taken = [{ id: 'c1', titel: 'Kopieerwerk', bron: 'overig', af: false }, { id: 'c2', titel: 'Tweede', bron: 'overig', af: false }]; return s; } }); await P.open('vandaag');
  await P.page.locator('[data-taakaf="c1"]').check(); await P.page.waitForTimeout(200); let S = await P.S();
  ok(S.taken.find(x => x.id === 'c1').af === true && S.taken.find(x => x.id === 'c1').afOp === '2026-11-16', 'taak staat af met datum');
  ok(S.taken.find(x => x.id === 'c2').af === false, 'de andere taak blijft open');
  const tekst = await P.tekst(); ok(/Kopieerwerk/.test(tekst), 'afgevinkte taak blijft die dag zichtbaar (doorgestreept)');
  await P.page.locator('[data-taakaf="c1"]').uncheck(); await P.page.waitForTimeout(150); S = await P.S(); ok(S.taken.find(x => x.id === 'c1').af === false && !S.taken.find(x => x.id === 'c1').afOp, 'weer uitvinken zet af en afOp terug');
});
// @@SCENARIOS

(async () => {
  const poort = +arg('poort', 0) || await vrijePoort();
  const server = cp.spawn(process.execPath, [path.join(__dirname, 'serve-lokaal.js'), path.resolve(path.join(__dirname, '..', 'public')), String(poort)], { stdio: 'ignore' });
  basis = 'http://localhost:' + poort + '/';
  try {
    const exe = bladeren.find(p => fs.existsSync(p));
    try { browser = await pw.chromium.launch(exe ? { executablePath: exe } : {}); } catch (e) { browser = await pw.chromium.launch({ channel: 'msedge' }); }
  } catch (e) { server.kill(); console.log('OVERGESLAGEN: geen browser gevonden (' + String(e.message).split('\n')[0] + ')'); process.exit(2); }
  await pauze(400);
  const t0 = Date.now();
  for (const [naam, fn] of SCENARIOS) await scenario(naam, fn);
  await browser.close(); server.kill();
  const slecht = resultaat.filter(r => r.fouten.length);
  console.log(`\nRoutetest agenda: ${resultaat.length} scenario's in ${((Date.now() - t0) / 1000).toFixed(1)} s, ${slecht.length} met fouten.`);
  process.exit(slecht.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
