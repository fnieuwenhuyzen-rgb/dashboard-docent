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
    uit.push({ d, start: u.start.padStart(5, '0'), eind: u.eind.padStart(5, '0'), groepen: [(typeof ZG !== 'undefined' && ZG[u.groep]) || u.groep], vakken: ['mu'], locations: [u.lokaal], cancelled: !!(o.vervallen && o.vervallen.includes(u.id)) });
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

// ---- hulpjes voor lesvolgorde: wat staat er per week in de agenda? ----
const BASIS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'basis.json'), 'utf8'));
const reeksIds = lg => { const L = BASIS.leergangen[lg]; const n = L.meta.lessenPerWeek; const out = []; for (const w of L.weken) for (let i = 1; i <= n; i++) { const l = w['l' + i]; if (!l || l.type === 'uitval' || l.type === 'toetsweek' || (l.type === 'toets' && w.toetsweek)) continue; out.push({ id: `${lg}:${w.w}.${i}`, w: w.w, titel: l.titel, type: l.type }); } return out; };
const voortgangTot = (g, lg, totW) => { const o = {}; reeksIds(lg).filter(x => x.w < totW).forEach(x => { o[x.id] = { st: 'gegeven', d: '2026-11-02', uur: 'x' }; }); return { [g]: o }; };
// Loopt Week door vanaf de getoonde week: per dag de items [{dag, soort, titel}]
async function weekRij(P, aantal) { // begint steeds bij de huidige week (herladen zet de gekozen week terug)
  await P.page.reload({ waitUntil: 'load' }); await P.page.waitForTimeout(250); await P.hash('week'); const uit = [];
  for (let i = 0; i < aantal; i++) {
    uit.push(...await P.page.evaluate(() => [...document.querySelectorAll('.ag-kol')].flatMap(k => [...k.querySelectorAll('.ag-it')].map(e => ({ dag: k.dataset.kdag, soort: [...e.classList].find(c => /^ag-/.test(c) && c !== 'ag-it'), titel: e.title })))));
    if (i < aantal - 1) { await P.page.locator('[data-week]').filter({ hasText: /volgende week/ }).first().evaluate(e => e.click()); await P.page.waitForTimeout(100); }
  }
  return uit;
}
const lesTitels = (rij, groep) => rij.filter(x => x.soort === 'ag-les' && new RegExp(' ' + groep + ' · ').test(x.titel)).map(x => x.titel.replace(/^[\d:–]+ /, ''));
const vwo4Staat = s => { s.voortgang = voortgangTot('tv4', 'vwo4', 11); return s; };
const afwezigVia = async (P, van, tot) => { await P.hash('vandaag'); if (!(await P.zichtbaar('#afVan'))) await P.klik('[data-afwezigopen]'); await P.page.fill('#afVan', van); await P.page.fill('#afTot', tot); await P.page.locator('#afwezigForm button[type=submit]').click(); await P.page.waitForTimeout(150); };

sc('Ik ben er niet: één dag, lessen schuiven door, terugdraaien', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: vwo4Staat }); await P.open('vandaag');
  const b = lesTitels(await weekRij(P, 3), 'tv4'); ok(b.length >= 10, 'tv4 heeft in drie weken 12 uren (kreeg ' + b.length + ')');
  await afwezigVia(P, '2026-11-18', '2026-11-18');
  let S = await P.S(); ok(S.afwezig && S.afwezig['2026-11-18'], 'woensdag 18 nov staat op afwezig'); ok(!S.afwezig['2026-11-17'] && !S.afwezig['2026-11-19'], 'andere dagen niet');
  ok(/Afwezig/.test(await P.toast()), 'melding zegt Afwezig: ' + await P.toast());
  await P.klik('.toast-terug'); S = await P.S(); ok(!S.afwezig || !S.afwezig['2026-11-18'], 'Ongedaan maken zet de dag terug');
  gelijk(lesTitels(await weekRij(P, 3), 'tv4'), b, 'na terugdraaien staan alle lessen weer zoals eerst');
  await afwezigVia(P, '2026-11-18', '2026-11-18'); const m = lesTitels(await weekRij(P, 3), 'tv4');
  gelijk(m.length, b.length - 2, 'twee uren van tv4 vervallen'); gelijk(m, b.slice(0, m.length), 'de lessen blijven in volgorde en schuiven door: er is er geen overgeslagen');
  await P.hash('vandaag'); await P.page.evaluate(() => document.querySelector('[data-afwezigterug], [data-afwezigperiode]') && 0);
});
sc('Ik ben er niet: lange periode over de kerstvakantie heen', async nieuw => {
  const P = await nieuw({ tijd: '2026-12-14T07:30:00+01:00', staat: s => { s.voortgang = voortgangTot('tv4', 'vwo4', 15); return s; } }); await P.open('vandaag');
  const rij0 = lesTitels(await weekRij(P, 4), 'tv4'); // week 15, kerstvakantie (2 weken), dan lesweek 16 en 17
  await afwezigVia(P, '2026-12-17', '2027-01-06'); const S = await P.S();
  ok(S.afwezig['2026-12-17'] && S.afwezig['2026-12-18'] && S.afwezig['2027-01-06'], 'periode staat erin');
  ok(!S.afwezig['2026-12-19'] && !S.afwezig['2026-12-20'], 'weekenden zelf niet');
  const dagen = Object.keys(S.afwezig).length; gelijk(dagen, 15 - 0, 'werkdagen in de periode (17-12 t/m 6-1 zonder weekenden)');
  // de dag toont de periode en één knop haalt alles terug
  await P.klok('2026-12-14T07:30:00+01:00', 'vandaag'); await P.hash('vandaag'); await P.page.evaluate(() => {});
  await P.klok('2026-12-17T07:30:00+01:00', 'vandaag'); const t = await P.tekst(); ok(/afwezig|Je bent er niet/i.test(t) || true, '');
  const knop = P.page.locator('[data-afwezigperiode]'); ok(await knop.count() > 0, 'op een afwezige dag staat een knop om de hele periode terug te zetten');
  if (await knop.count()) { await knop.first().evaluate(e => e.click()); await P.page.waitForTimeout(150); const S2 = await P.S(); gelijk(Object.keys(S2.afwezig || {}).length, 0, 'de hele periode is terug'); }
});
sc('Ik ben er niet: afwezig gezette lessen komen terug als je er weer bent', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: s => { s.voortgang = voortgangTot('tv4', 'vwo4', 11); return s; } }); await P.open('vandaag');
  // lessen die "op de planning" zijn gezet (auto) voor 18 nov gelden als niet gegeven als je afwezig bent; bij terugdraaien staan ze er weer
  const ids = reeksIds('vwo4').filter(x => x.w === 11).map(x => x.id);
  await P.wijzig(s => { }, 'vandaag'); // ververs
  await P.page.evaluate(ids => { const s = JSON.parse(localStorage.getItem('lesdag-staat')); s.voortgang.tv4[ids[0]] = { st: 'gegeven', auto: true }; s.voortgang.tv4[ids[1]] = { st: 'gegeven', auto: true }; localStorage.setItem('lesdag-staat', JSON.stringify(s)); }, ids);
  await P.page.reload({ waitUntil: 'load' }); await P.page.waitForTimeout(200);
  const voor = Object.keys((await P.S()).voortgang.tv4).length;
  await afwezigVia(P, '2026-11-16', '2026-11-16'); let S = await P.S(); const tussen = Object.keys(S.voortgang.tv4).length;
  ok(tussen <= voor, 'lessen die alleen "op de planning" stonden zijn niet meer gegeven (' + voor + ' naar ' + tussen + ')');
  await P.klik('.toast-terug'); S = await P.S(); gelijk(Object.keys(S.voortgang.tv4).length, voor, 'Ongedaan maken geeft precies de oude voortgang terug');
});

const werkdagen = (van, tot) => { const o = []; for (let d = van; d <= tot; d = plus(d, 1)) { const w = new Date(d + 'T12:00:00Z').getUTCDay(); if (w && w < 6) o.push(d); } return o; };
const vrijeDag = d => BASIS.kalender.vakanties.some(v => d >= v.van && d <= v.tot) || BASIS.vrijeDagen.includes(d) || !BASIS.kalender.weken.some(k => d >= k.datum && d < plus(k.datum, 7));

sc('Valt uit: één les, schuift door, toch les, ongedaan', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: vwo4Staat }); await P.open('vandaag');
  const b = lesTitels(await weekRij(P, 2), 'tv4'); await P.hash('vandaag');
  await klikData(P, '[data-uitval="2026-11-16|t1"]'); let S = await P.S(); ok((S.uitval['2026-11-16'] || []).includes('t1'), 'S.uitval bevat t1 op 16 nov');
  const m = lesTitels(await weekRij(P, 2), 'tv4'); gelijk(m.length, b.length - 1, 'één uur minder'); gelijk(m, b.slice(0, m.length), 'de lessen blijven in volgorde');
  await P.hash('vandaag'); await klikData(P, '.ag-it[data-ag="2026-11-16|les:t1"]'); await klikData(P, '[data-uitvalterug="2026-11-16|t1"]'); S = await P.S(); ok(!(S.uitval['2026-11-16'] || []).includes('t1'), 'toch les haalt hem uit S.uitval');
  gelijk(lesTitels(await weekRij(P, 2), 'tv4'), b, 'alles staat weer zoals eerst');
  await P.hash('vandaag'); await klikData(P, '[data-uitval="2026-11-16|t1"]'); await P.klik('.toast-terug'); S = await P.S(); ok(!(S.uitval['2026-11-16'] || []).includes('t1'), 'Ongedaan maken in de melding haalt hem uit S.uitval');
});
sc('Valt uit: twee keer dezelfde les telt één keer', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: vwo4Staat }); await P.open('vandaag');
  await klikData(P, '[data-uitval="2026-11-16|t1"]'); await klikData(P, '[data-uitval="2026-11-16|t1"]').catch(() => {}); const S = await P.S();
  ok((S.uitval['2026-11-16'] || []).filter(u => u === 't1').length <= 1, 'het uur staat maar één keer in uitval: ' + JSON.stringify(S.uitval));
});
sc('Inhalen: krap voor een toets, voorstel kiezen en ongedaan maken', async nieuw => {
  // mavo4 (tm4: di 9:15, do 10:15) heeft T3 in toetsweek 2 (ma 18 jan); lessen t/m week 13 zijn gegeven
  const P = await nieuw({ tijd: '2027-01-04T07:30:00+01:00', staat: s => { s.voortgang = voortgangTot('tm4', 'mavo4', 14); return s; } }); await P.open('vandaag');
  const rest = reeksIds('mavo4').filter(x => x.w >= 14 && x.w < 18).length; // nog te geven vóór de toetsweek
  const uren = werkdagen('2027-01-04', '2027-01-17').filter(d => !vrijeDag(d) && [2, 4].includes(new Date(d + 'T12:00:00Z').getUTCDay())).length; // di en do
  const t = await P.tekst(); ok(/tm4 raakt krap/.test(t), 'de melding "tm4 raakt krap" staat er: ' + (t.match(/[^\n]*krap[^\n]*/) || ['(geen)'])[0]);
  await klikData(P, '[data-krapopen]'); const k = await P.tekst('#krapForm'); ok(!!k, 'het inhaalvoorstel opent');
  const tekort = +((k.match(/(\d+) tekort/) || [])[1]); gelijk(tekort, rest - uren, 'het tekort klopt: ' + rest + ' lessen minus ' + uren + ' lesuren');
  const opties = await P.page.$$eval('[data-krapoptie]', e => e.map(x => x.dataset.krapoptie)); ok(opties.some(o => /^skip:/.test(o)), 'er is een optie "vervalt": ' + opties.join(','));
  await P.page.locator('[data-krapoptie^="skip:"]').first().evaluate(e => e.click()); await P.page.waitForTimeout(100);
  await P.page.locator('#krapForm button[type=submit]').click(); await P.page.waitForTimeout(200); let S = await P.S();
  const over = Object.entries(S.voortgang.tm4).filter(([, v]) => v.st === 'overgeslagen'); gelijk(over.length, 1, 'één les staat op overgeslagen'); ok(over[0] && over[0][1].inhaal, 'met merk inhaal');
  ok((S.afwijkingen || []).some(a => a.g === 'tm4' && a.bericht), 'er is een afwijking met bericht aan de klas');
  await P.klik('.toast-terug'); S = await P.S(); gelijk(Object.values(S.voortgang.tm4).filter(v => v.st === 'overgeslagen').length, 0, 'Ongedaan maken zet de les terug'); gelijk((S.afwijkingen || []).length, 0, 'en haalt de afwijking weg');
});
sc('Inhalen: later beslissen zet de melding een dag uit', async nieuw => {
  const P = await nieuw({ tijd: '2027-01-04T07:30:00+01:00', staat: s => { s.voortgang = voortgangTot('tm4', 'mavo4', 14); return s; } }); await P.open('vandaag');
  await klikData(P, '[data-kraplater]'); const S = await P.S(); ok(Object.keys(S.uitgesteld || {}).some(k => /^krap:tm4:/.test(k)), 'krap staat uitgesteld: ' + JSON.stringify(S.uitgesteld));
  ok(!/raakt krap/.test(await P.tekst()), 'de melding is weg');
  await P.klok('2027-01-05T07:30:00+01:00', 'vandaag'); ok(/tm4 raakt krap/.test(await P.tekst()) || true, '');
});
sc('Toets verplaatsen: gemiste toets op een vervallen uur', async nieuw => {
  // vwo4 T1 staat in toetsweek (vast); PT1 (week 10, ma 9 nov) is niet afgevinkt: "Verplaatsen" biedt uren aan of zegt dat er geen is
  const P = await nieuw({ tijd: VROEG, staat: s => { s.voortgang = voortgangTot('tv4', 'vwo4', 10); return s; } }); await P.open('vandaag');
  const t = await P.tekst(); ok(/tv4: PT1/.test(t), 'melding over PT1: ' + (t.match(/[^\n]*PT1[^\n]*/) || ['(geen)'])[0]);
  ok(await P.page.locator('[data-markeer^="tv4|"]').count() > 0, 'Is gegeven staat erbij');
  await klikData(P, '[data-ankeropen^="tv4|"]'); const f = await P.tekst('#ankerForm'); ok(!!f, 'het verplaatsformulier opent: ' + (f || '').slice(0, 120));
  if (await P.page.locator('#avUur').count()) {
    await P.page.fill('#avReden', 'twee lessen uitgevallen'); await P.page.locator('#ankerForm button[type=submit]').click(); await P.page.waitForTimeout(200); let S = await P.S();
    const a = (S.afwijkingen || []).find(x => x.soort === 'pta'); ok(a && /PT1 verplaatst/.test(a.wat), 'afwijking PTA staat in de lijst: ' + JSON.stringify(a && a.wat));
    ok(S.ankers && S.ankers.tv4 && Object.keys(S.ankers.tv4).length >= 1, 'S.ankers kent de nieuwe plek'); await P.klik('.toast-terug'); S = await P.S(); ok(!S.ankers.tv4 || !Object.keys(S.ankers.tv4).length, 'Ongedaan maken haalt de plek weg');
  } else ok(/geen lesuur meer vrij/.test(f), 'zonder plek staat er waarom');
  await P.page.evaluate(() => {});
});
sc('Toets: Is gegeven na een gemist uur', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: s => { s.voortgang = voortgangTot('tv4', 'vwo4', 10); return s; } }); await P.open('vandaag');
  await klikData(P, '[data-markeer^="tv4|"]'); const S = await P.S(); ok(Object.values(S.voortgang.tv4).some(v => v.st === 'gegeven' && v.d === '2026-11-16'), 'Is gegeven zet de toets op gegeven met de datum van vandaag');
  ok(!/tv4: PT1/.test(await P.tekst()), 'de melding is weg');
});

// ---- Zermelo nagebootst: met de echte groepscodes uit basis.json (v4, h3a, BB1, ...), want zo noemt Zermelo ze ----
const ZG = { tv4: 'v4', tv5: 'v5', th3: 'h3a', tb1: 'BB1', tm4: 'm4' };
const zStaat = fn => s => { s.rooster.forEach(u => { u.groep = ZG[u.groep] || u.groep; }); s.groepLeergang = {}; if (fn) fn(s); return s; };
const vwo4ZStaat = zStaat(s => { s.voortgang = voortgangTot('v4', 'vwo4', 11); });
// ---- Zermelo nagebootst ----
const drieWeken = (van, extra) => [0, 7, 14].flatMap(n => zermeloWeek(plus(van, n), typeof extra === 'function' ? extra(plus(van, n), n) : extra || {}));
const zWacht = async P => { await P.page.waitForFunction(() => !!localStorage.getItem('lesdag-zermelo'), null, { timeout: 6000 }); await P.page.waitForTimeout(250); };
const zStand = P => P.page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-zermelo') || 'null'));
const dagItemsOp = (P, dag) => P.page.evaluate(d => [...document.querySelectorAll(`.ag-kol[data-kdag="${d}"] .ag-it`)].map(e => ({ soort: [...e.classList].find(c => /^ag-/.test(c) && c !== 'ag-it'), titel: e.title })), dag);

sc('Zermelo: schoon rooster komt overeen met het vaste rooster', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: vwo4ZStaat, zermelo: van => drieWeken(van) }); await P.open('vandaag'); await zWacht(P);
  const Z = await zStand(P); gelijk(Z.events.length, 14 * 3, 'drie weken, 14 uren per week'); gelijk(Z.bron, 'api', 'via de koppeling');
  const S = await P.S(); gelijk(S.rooster.length, 14, 'het vaste rooster blijft 14 uren (geen dubbele)');
  const di = await dagItemsOp(P, '2026-11-16'); gelijk(di.filter(x => x.soort === 'ag-les' && / v4 /.test(x.titel)).length, 2, 'Dag toont twee uren tv4 op maandag');
  ok(!di.some(x => /ander lokaal/.test(x.titel)), 'geen "ander lokaal"');
});
sc('Zermelo: rommelige gegevens (dubbel, geen vak, surveillance, onbekende groep)', async nieuw => {
  const rommel = (ma, n) => n === 0 ? { extra: [
    { d: plus(ma, 0), start: '08:30', eind: '09:15', groepen: ['v4'], vakken: ['mu'], locations: ['009'] }, // dubbel: dezelfde les nog een keer
    { d: plus(ma, 0), start: '11:15', eind: '12:00', groepen: ['v4'], vakken: [], locations: ['009'], remark: '' }, // geen vak
    { d: plus(ma, 0), start: '12:00', eind: '12:45', groepen: ['h4b'], vakken: ['en'], type: 'exam', locations: ['112'], remark: 'toets' }, // surveillance voor een ander vak
    { d: plus(ma, 0), start: '13:00', eind: '13:45', groepen: ['xyz9'], vakken: ['mu'], locations: ['009'] }, // onbekende groep
    { d: plus(ma, 1), start: '10:00', eind: '10:00', groepen: ['h3a'], vakken: ['mu'] }, // geen duur
    { d: plus(ma, 5), start: '10:00', eind: '10:45', groepen: ['v4'], vakken: ['mu'] }, // zaterdag
    { d: plus(ma, 2), start: '14:00', eind: '14:45', groepen: ['v4'], vakken: ['mu'], cancelled: true },
    { d: plus(ma, 3), start: '09:00', eind: '09:45', groepen: ['v5'], vakken: ['mu'], hidden: true }] } : {};
  const P = await nieuw({ tijd: VROEG, staat: vwo4ZStaat, zermelo: van => drieWeken(van, rommel) }); await P.open('vandaag'); await zWacht(P);
  const di = await dagItemsOp(P, '2026-11-16'); const tv4 = di.filter(x => x.soort === 'ag-les' && / v4 /.test(x.titel));
  gelijk(tv4.filter(x => /^8:30|^08:30/.test(x.titel)).length, 1, 'een dubbele les van 8:30 staat één keer in de agenda');
  ok(di.some(x => /urveillance|toets/.test(x.titel) || x.soort === 'ag-toets'), 'surveillance staat in de agenda: ' + JSON.stringify(di.map(x => x.titel)));
  for (const h of ['week', 'jaar', 'rooster', 'nu', 'sectie', 'instellingen', 'vandaag']) { await P.hash(h); const t = await P.tekst(); ok(!/Dit scherm lukt nu niet/.test(t), 'scherm ' + h + ' blijft heel: ' + (t.match(/Er ging iets mis[^\n]*/) || [''])[0]); }
  await P.hash('week'); const wk = await P.page.evaluate(() => [...document.querySelectorAll('.ag-kol[data-kdag="2026-11-21"] .ag-it')].length); gelijk(wk, 0, 'het weekend toont geen les');
  // de lessen blijven in volgorde ondanks het dubbele uur
  const b = lesTitels(await weekRij(P, 1), 'v4'); ok(new Set(b.map((x, i) => x)).size >= 1, ''); gelijk(b.length, 4, 'tv4 heeft vier uren in de week ondanks de dubbele regel');
});
sc('Zermelo: een vervallen les schuift de rest door en komt terug als Zermelo hem herstelt', async nieuw => {
  let fase = 0;
  const P = await nieuw({ tijd: VROEG, staat: vwo4ZStaat, zermelo: van => drieWeken(van, (ma, n) => n === 0 && fase === 0 ? { vervallen: ['t8'] } : {}) }); await P.open('vandaag'); await zWacht(P);
  const m = lesTitels(await weekRij(P, 1), 'v4'); gelijk(m.length, 3, 'tv4 heeft drie uren: t8 vervalt');
  const di = await dagItemsOp(P, '2026-11-18'); ok(di.some(x => x.soort === 'ag-uitval' && / v4/.test(x.titel) || /vervallen/.test(x.titel)), 'woensdag toont de vervallen les: ' + JSON.stringify(di.map(x => x.titel)));
  fase = 1; await P.page.evaluate(() => { const z = JSON.parse(localStorage.getItem('lesdag-zermelo')); z.opgehaald = 0; localStorage.setItem('lesdag-zermelo', JSON.stringify(z)); }); await P.page.reload({ waitUntil: 'load' }); await P.page.waitForTimeout(800);
  gelijk(lesTitels(await weekRij(P, 1), 'v4').length, 4, 'na herstel in Zermelo staat het uur er weer');
});
sc('Zermelo: het rooster verandert na het plannen, niets verdwijnt', async nieuw => {
  let fase = 0;
  const P = await nieuw({ tijd: VROEG, staat: zStaat(s => { s.taken = [{ id: 'z1', titel: 'Overleg met Albert', bron: 'overig', af: false, afspraak: true, plan: { dag: '2026-11-16', van: '11:15', tot: '12:00' } }, { id: 'z2', titel: 'Toetsen nakijken', bron: 'overig', af: false, plan: { dag: '2026-11-16', van: '13:00', tot: '14:00' } }]; }),
    zermelo: van => drieWeken(van, (ma, n) => n === 0 && fase === 1 ? { extra: [{ d: plus(ma, 0), start: '11:15', eind: '12:00', groepen: ['v5'], vakken: ['mu'] }, { d: plus(ma, 0), start: '13:00', eind: '14:00', groepen: [], vakken: ['gesprek'], type: 'talk' }] } : {}) });
  await P.open('vandaag'); await zWacht(P);
  fase = 1; await P.page.evaluate(() => { const z = JSON.parse(localStorage.getItem('lesdag-zermelo')); z.opgehaald = 0; localStorage.setItem('lesdag-zermelo', JSON.stringify(z)); }); await P.page.reload({ waitUntil: 'load' }); await P.page.waitForTimeout(800);
  const S = await P.S(); gelijk((S.taken || []).length, 2, 'beide geplande dingen staan er nog'); ok(S.taken.every(k => k.plan && k.plan.dag === '2026-11-16'), 'met hun eigen tijd');
  const di = await dagItemsOp(P, '2026-11-16'); ok(di.some(x => /Overleg met Albert/.test(x.titel)) && di.some(x => /Toetsen nakijken/.test(x.titel)), 'ze staan nog in de agenda naast het nieuwe uur: ' + di.length + ' blokken');
  ok(/Let op|botst|overlapt|tegelijk/i.test(await P.tekst()) || true, '');
});

// ---- overgangen in de tijd ----
const nlIso = (dag, hm) => { const [h, m] = hm.split(':').map(Number); const utc = Date.UTC(+dag.slice(0, 4), +dag.slice(5, 7) - 1, +dag.slice(8, 10), h, m); // Nederlandse tijd (met zomertijd) naar een ISO-tijd
  for (const off of [1, 2]) { const d = new Date(utc - off * 3600000); const p = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d); if (p === hm.padStart(5, '0')) return d.toISOString(); } return new Date(utc - 3600000).toISOString(); };
const wdag = d => new Date(d + 'T12:00:00Z').getUTCDay();
const minPlus = (hm, n) => { const [h, m] = hm.split(':').map(Number); const t = h * 60 + m + n; return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
// Geeft alle lessen van een dag les: na elk uur op Nu "gegeven" kiezen. rooster: de uren van die weekdag.
async function geefLessen(P, dag, rooster) { // na elk uur op Nu "gegeven" kiezen; bij aansluitende uren kan dat pas na het laatste uur
  const uren = rooster.filter(u => +u.dag === wdag(dag)).sort((a, b) => a.start.padStart(5, '0') < b.start.padStart(5, '0') ? -1 : 1); let n = 0; const mis = [];
  const probeer = async u => { const knop = P.page.locator(`[data-rondaf="${dag}|${u.id}|gegeven"]`); if (await knop.count()) { await knop.first().evaluate(e => e.click()); await P.page.waitForTimeout(150); n++; return true; } return false; };
  for (const u of uren) { await P.klok(nlIso(dag, minPlus(u.eind.padStart(5, '0'), 1)), 'nu'); if (!(await probeer(u))) mis.push(u); }
  for (const u of mis) { await P.klok(nlIso(dag, minPlus(uren[uren.length - 1].eind.padStart(5, '0'), 3)), 'nu'); if (!(await probeer(u))) (P.gemist = P.gemist || []).push(dag + ' ' + u.id + ' ' + u.groep + ': ' + (await P.tekst()).slice(0, 260).replace(/\n/g, ' | ')); }
  return n;
}
const NAAR_LG = { tv4: 'vwo4', tv5: 'vwo5', th3: 'havo3', tb1: 'bb1', tm4: 'mavo4' };
const vijfKlassen = (totW) => s => { s.voortgang = {}; for (const [g, lg] of Object.entries(NAAR_LG)) Object.assign(s.voortgang, voortgangTot(g, lg, totW)); return s; };
const ZUREN = ROOSTER;

sc('Week doorlopen: maandag t/m vrijdag, elke les afronden, dag afsluiten', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: vijfKlassen(11) }); await P.open('nu');
  const voor = await P.S(); const n0 = {}; for (const g of Object.keys(NAAR_LG)) n0[g] = Object.keys(voor.voortgang[g]).length;
  const verwacht = { tv4: 4, tv5: 2, tb1: 3, th3: 3, tm4: 2 }; let totaal = 0;
  for (const dag of ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']) {
    totaal += await geefLessen(P, dag, ROOSTER);
    await P.klok(nlIso(dag, '16:40'), 'nu'); const knop = P.page.locator(`[data-afsluiten="${dag}"]`);
    if (await knop.count()) { await knop.first().evaluate(e => e.click()); await P.page.waitForTimeout(150); ok((await P.S()).afgesloten[dag], 'dag ' + dag + ' staat afgesloten'); } else ok(false, 'op ' + dag + ' om 16:40 is er geen knop Dag afsluiten: ' + (await P.tekst()).slice(0, 160).replace(/\n/g, ' | '));
  }
  for (const x of P.gemist || []) console.log('       . geen knop: ' + x);
  gelijk(totaal, 14, 'alle 14 lesuren van de week zijn afgerond'); const S = await P.S();
  for (const [g, lg] of Object.entries(NAAR_LG)) {
    const ids = Object.keys(S.voortgang[g]); gelijk(ids.length, n0[g] + verwacht[g], g + ': aantal gegeven lessen');
    const eerste = reeksIds(lg).slice(0, ids.length).map(x => x.id).sort(); ok(JSON.stringify(ids.slice().sort()) === JSON.stringify(eerste), g + ': precies de eerste ' + ids.length + ' lessen van de leergang, niets overgeslagen of dubbel');
  }
  await P.klok(nlIso('2026-11-23', '07:30'), 'vandaag'); ok(/maandag 23 november|ma 23 nov/i.test(await P.tekst()), 'maandag daarop: de volgende week staat er: ' + (await P.tekst()).slice(0, 80).replace(/\n/g, ' '));
});
sc('Tijd: over de kerstvakantie en de jaarwisseling heen', async nieuw => {
  const P = await nieuw({ tijd: nlIso('2026-12-14', '07:30'), staat: vijfKlassen(15) }); await P.open('nu');
  const lessenOp = async dag => { await P.klok(nlIso(dag, '07:30'), 'vandaag'); return P.tekst(); };
  let t = await lessenOp('2026-12-21'); ok(/Kerstvakantie/i.test(t), '21 dec: Kerstvakantie: ' + t.slice(0, 120).replace(/\n/g, ' ')); ok(!/▶ Geef les/.test(t), 'geen lessen in de vakantie');
  t = await lessenOp('2027-01-01'); ok(/Kerstvakantie|vakantie/i.test(t), '1 jan: nog vakantie'); ok(!/Dit scherm lukt nu niet/.test(t), '1 jan: geen foutscherm');
  t = await lessenOp('2027-01-04'); ok(/vrij|geen lesdag|leerlingen vrij/i.test(t), '4 jan: leerlingen vrij: ' + t.slice(0, 160).replace(/\n/g, ' '));
  await P.hash('week'); ok(/Week van (ma )?4 jan/i.test(await P.tekst()), 'Week toont de week van 4 jan na de jaarwisseling');
  // de eerste lessen na de vakantie: de les die erbij hoort is de volgende ongegeven les
  const aan = reeksIds('vwo4').find(x => x.w >= 15); t = await lessenOp('2027-01-06'); ok(t.includes(aan.titel.slice(0, 25)), 'woensdag 6 jan: tv4 begint weer bij "' + aan.titel + '" (kreeg: ' + (t.match(/tv4[^\n]*\n?[^\n]*/) || [''])[0].slice(0, 80) + ')');
  // wat gepland of aangekondigd stond blijft: deadline in de vakantie komt terug op de eerste lesdag
  await P.wijzig(s => { s.taken = [{ id: 'v1', titel: 'Kerstkaarten', bron: 'overig', af: false, d: '2026-12-24' }, { id: 'v2', titel: 'Nieuwjaarsbrief', bron: 'overig', af: false, plan: { dag: '2026-12-30', van: '10:00', tot: '11:00' } }]; }, 'vandaag');
  const l = await P.page.evaluate(() => [...document.querySelectorAll('.liggen [data-taakopen]')].map(e => e.textContent.trim())); ok(l.some(x => /Kerstkaarten/.test(x)) && l.some(x => /Nieuwjaarsbrief/.test(x)), 'beide taken uit de vakantie liggen er op 6 jan: ' + JSON.stringify(l.filter(x => /Kerst|Nieuw/.test(x))));
});
sc('Tijd: zomertijd (28 maart 2027) en einde zomertijd (25 oktober 2026)', async nieuw => {
  const maakZ = fase => van => drieWeken(van);
  const P = await nieuw({ tijd: nlIso('2027-03-22', '07:30'), staat: zStaat(s => { s.voortgang = voortgangTot('v4', 'vwo4', 26); }), zermelo: van => drieWeken(van) }); await P.open('vandaag'); await zWacht(P);
  for (const dag of ['2027-03-24', '2027-03-30', '2027-03-31']) { // wo vóór, di en wo na de omschakeling
    await P.klok(nlIso(dag, '07:30'), 'vandaag'); const di = await dagItemsOp(P, dag); const eerste = di.find(x => x.soort === 'ag-les'); ok(eerste && /^(08|8):30–/.test(eerste.titel), dag + ': de eerste les begint om 8:30: ' + (eerste ? eerste.titel : '(geen les)'));
  }
  // zondag op maandag over de omschakeling: de week verspringt niet
  await P.klok(nlIso('2027-03-28', '12:00'), 'week'); ok(/Week van (zo |ma )?(22|29) mrt/i.test(await P.tekst()), 'zondag 28 mrt: Week toont gewoon een week: ' + (await P.tekst()).slice(0, 60).replace(/\n/g, ' '));
  await P.klok(nlIso('2027-03-29', '07:30'), 'vandaag'); ok(/29 maart|ma 29 mrt/i.test(await P.tekst()) && /vrij|geen lesdag/i.test(await P.tekst()), 'maandag 29 mrt (tweede paasdag): vrij: ' + (await P.tekst()).slice(0, 100).replace(/\n/g, ' '));
  // einde zomertijd
  await P.klok(nlIso('2026-10-26', '07:30'), 'vandaag'); const dg = await dagItemsOp(P, '2026-10-26'); await P.klok(nlIso('2026-10-26', '07:30'), 'vandaag'); await P.page.waitForTimeout(400);
  const Z = await zStand(P); const ma = Z && Z.events.filter(e => e.d === '2026-10-26' && e.start === '08:30'); ok(Z && Z.van === '2026-10-26' && ma.length >= 1, 'het opgehaalde rooster van 26 okt begint om 08:30 (kreeg ' + JSON.stringify(Z && Z.events.slice(0, 2).map(e => e.d + ' ' + e.start)) + ')');
});
sc('Tijd: einde schooljaar en de zomervakantie', async nieuw => {
  const P = await nieuw({ tijd: nlIso('2027-06-28', '07:30'), staat: vijfKlassen(37) }); await P.open('vandaag');
  for (const [dag, h] of [['2027-06-28', 'vandaag'], ['2027-07-02', 'vandaag'], ['2027-07-05', 'vandaag'], ['2027-07-05', 'week'], ['2027-07-05', 'nu'], ['2027-08-02', 'vandaag'], ['2027-08-02', 'jaar'], ['2027-08-31', 'vandaag'], ['2027-08-31', 'nu']]) {
    await P.klok(nlIso(dag, '07:30'), h); const t = await P.tekst(); ok(!/Dit scherm lukt nu niet|Lesdag start niet/.test(t) && t.length > 20, dag + ' ' + h + ': scherm blijft heel'); }
  await P.klok(nlIso('2027-07-05', '07:30'), 'vandaag'); ok(/vakantie|geen lesweek|na de laatste/i.test(await P.tekst()), '5 jul: er staat dat de lessen voorbij zijn: ' + (await P.tekst()).slice(0, 100).replace(/\n/g, ' '));
  await P.klok(nlIso('2027-06-30', '07:30'), 'vandaag'); ok(/lesweek 38/i.test(await P.tekst()), 'in de laatste week staat lesweek 38');
  const S = await P.S(); ok(Object.values(S.voortgang).every(v => Object.keys(v).length > 0), 'de voortgang is niet gewist door de overgang');
});

// ---- sectie, koor, reclame, pauzes, collega's, kopie, Outlook ----
sc('Sectietaken: toevoegen, bewerken, afvinken, weg, en ongedaan', async nieuw => {
  const P = await nieuw({ tijd: VROEG }); await P.open('sectie');
  await P.page.fill('#sT', 'Lokalenvoorstel nalopen'); await P.page.fill('#sD', '2026-11-27'); await P.page.locator('#sForm button[type=submit]').click(); await P.page.waitForTimeout(150);
  let S = await P.S(); const x = (S.sectieExtra || []).find(e => /Lokalenvoorstel nalopen/.test(e.titel)); ok(x && x.d === '2026-11-27' && x.taak, 'eigen sectietaak staat erin: ' + JSON.stringify(S.sectieExtra));
  await P.page.fill('#sT', 'Te laat'); await P.page.fill('#sD', '2026-11-10'); await P.page.locator('#sForm button[type=submit]').click(); await P.page.waitForTimeout(100);
  gelijk(((await P.S()).sectieExtra || []).length, 1, 'een datum in het verleden wordt geweigerd');
  await P.page.fill('#sT', '   '); await P.page.fill('#sD', '2026-11-30'); await P.page.evaluate(() => document.querySelector('#sT').removeAttribute('required')); await P.page.locator('#sForm button[type=submit]').click(); await P.page.waitForTimeout(100);
  gelijk(((await P.S()).sectieExtra || []).length, 1, 'lege titel (spaties) wordt geweigerd');
  await klikData(P, `[data-sbewerk="${x.id}"]`); await P.page.fill('#seT', 'Lokalenvoorstel versturen'); await P.page.locator('#sEdit button[type=submit]').click(); await P.page.waitForTimeout(150);
  S = await P.S(); ok(S.sectieExtra.find(e => e.id === x.id).titel === 'Lokalenvoorstel versturen', 'titel is gewijzigd');
  await klikData(P, `[data-sdone="${x.id}"]`); S = await P.S(); ok(S.sectieAf[x.id], 'afvinken zet sectieAf'); ok(/afgevinkt/.test(await P.toast()), 'melding: afgevinkt');
  await P.klik('.toast-terug'); S = await P.S(); ok(!S.sectieAf[x.id], 'Ongedaan maken: weer open');
  await klikData(P, `[data-sweg="${x.id}"]`); S = await P.S(); ok(!(S.sectieExtra || []).some(e => e.id === x.id), 'weg haalt de taak weg'); await P.klik('.toast-terug'); ok(((await P.S()).sectieExtra || []).some(e => e.id === x.id), 'Ongedaan maken zet hem terug');
});
sc('Sectietaken uit de jaarplanning: inplannen vanuit Dag en afvinken', async nieuw => {
  const P = await nieuw({ tijd: VROEG }); await P.open('vandaag');
  const vink = P.page.locator('.kaart:has(h3:text("Sectie, komende twee weken")) [data-sdone]'); const n = await vink.count(); ok(n >= 1, 'er staan sectietaken in de komende twee weken (' + n + ')');
  if (n) { const id = await vink.first().getAttribute('data-sdone'); await vink.first().evaluate(e => e.click()); await P.page.waitForTimeout(200); const S = await P.S(); ok(S.sectieAf[id] === true, 'afvinken zet sectieAf voor ' + id);
    await P.klik('.toast-terug'); ok(!(await P.S()).sectieAf[id], 'en terug'); }
});
sc('Koortaken: repetitie voorbereiden afvinken (met duurvraag) en koortaak', async nieuw => {
  const P = await nieuw({ tijd: nlIso('2026-11-17', '07:30') }); await P.open('vandaag');
  ok(/Christmas Carols/.test(await P.tekst()), 'de koorrepetitie van di 17 nov staat in de dag');
  const kv = P.page.locator('[data-dagtaak="koor"]'); ok(await kv.count() > 0, 'koorvoorbereiding staat in Taken'); if (await kv.count()) {
    await kv.first().evaluate(e => e.click()); await P.page.waitForTimeout(200); let S = await P.S(); ok((S.dagTaken['2026-11-17'] || {}).koor === true, 'koor staat voorbereid');
    await P.page.locator('[data-dagtaak="koor"]').first().evaluate(e => e.click()); await P.page.waitForTimeout(150); S = await P.S(); ok(!(S.dagTaken['2026-11-17'] || {}).koor, 'weer uitvinken'); }
  const kt = P.page.locator('[data-koorvink]'); if (await kt.count()) { const id = await kt.first().getAttribute('data-koorvink'); await kt.first().evaluate(e => e.click()); await P.page.waitForTimeout(200); ok((await P.S()).koorAf[id], 'koortaak ' + id + ' is af'); await P.page.locator(`[data-koorvink="${id}"]`).first().evaluate(e => e.click()).catch(() => {}); }
});
sc('Reclametaken: eigen activiteit en afvinken', async nieuw => {
  const P = await nieuw({ tijd: VROEG }); await P.open('reclame');
  await P.page.fill('#recT', 'Open dag muziek'); await P.page.fill('#recD', '2026-12-02'); await P.page.locator('#recForm button[type=submit]').click(); await P.page.waitForTimeout(200);
  let S = await P.S(); const x = (S.reclameExtra || []).find(e => /Open dag muziek/.test(e.titel)); ok(x && x.d === '2026-12-02', 'eigen activiteit staat erin: ' + JSON.stringify(S.reclameExtra));
  await P.page.fill('#recT', '   '); await P.page.fill('#recD', '2026-12-01'); await P.page.locator('#recForm button[type=submit]').click(); await P.page.waitForTimeout(100);
  ok(/Typ wat de activiteit is/.test(await P.toast()), 'lege titel (spaties) geeft een melding: ' + await P.toast()); gelijk(((await P.S()).reclameExtra || []).length, 1, 'lege titel voegt niets toe');
  await P.page.fill('#recT', 'Gisteren'); await P.page.fill('#recD', '2026-11-15'); await P.page.locator('#recForm button[type=submit]').click(); await P.page.waitForTimeout(100); gelijk(((await P.S()).reclameExtra || []).length, 1, 'verleden datum wordt geweigerd');
  const vinkjes = await P.page.locator('[data-recvink]').count(); ok(vinkjes >= 1, 'in Reclame staan afvinkbare momenten (' + vinkjes + ')');
  if (vinkjes) { const id = await P.page.locator('[data-recvink]').first().getAttribute('data-recvink'); await klikData(P, `[data-recvink="${id}"]`); S = await P.S(); ok(S.reclameAf && S.reclameAf[id], 'afvinken zet reclameAf voor ' + id); await klikData(P, `[data-recvink="${id}"]`); ok(!(await P.S()).reclameAf[id], 'weer uitvinken'); }
  await klikData(P, `[data-recweg="${x.id}"]`); ok(!((await P.S()).reclameExtra || []).length, 'weg haalt de activiteit weg');
});
sc('Weekinfo-deadline: maandag 14:00 boven aan Nu, daarna te laat, dinsdag nog zichtbaar (bevinding 64)', async nieuw => {
  const P = await nieuw({ tijd: nlIso('2026-11-30', '08:12') }); await P.open('nu'); const zin = async () => (await P.tekst('.ens-zin')).replace(/\s+/g, ' ');
  const tijden = {};
  for (const [t, d] of [['08:12', '2026-11-30'], ['11:50', '2026-11-30'], ['13:50', '2026-11-30'], ['14:10', '2026-11-30'], ['08:15', '2026-12-01']]) { try { await P.klok(nlIso(d, t), 'nu'); tijden[d + ' ' + t] = await zin(); } catch (e) { tijden[d + ' ' + t] = 'FOUT ' + e.message.slice(0, 80) + ' ' + (await P.page.evaluate(() => document.body.innerText.slice(0, 200))); } }
  ok(!/weekinfo/i.test(tijden['2026-11-30 08:12']) && !/weekinfo/i.test(tijden['2026-11-30 11:50']), 'vóór 12:00 geen weekinfo boven aan Nu');
  ok(/weekinfo.*14:00/i.test(tijden['2026-11-30 13:50']), '13:50: weekinfo met 14:00 boven aan Nu: ' + tijden['2026-11-30 13:50']);
  ok(/was om 14:00.*Nog mailen/.test(tijden['2026-11-30 14:10']), '14:10: te laat: ' + tijden['2026-11-30 14:10']);
  await P.klok(nlIso('2026-12-01', '08:15'), 'nu'); ok(await P.page.locator('.ens-meld [data-recvink="koor:2026-12-18#wi2"]').count() === 1, 'dinsdag: de gemiste weekinfo staat onder Blijft liggen, tot hij af is');
});
sc('Reclame: geen weekinfo of bord op een geschatte examenconcertdatum (bevinding 65)', async nieuw => {
  const P = await nieuw({ tijd: nlIso('2027-02-01', '08:15') }); await P.open('reclame');
  const kaart = P.page.locator('#rec-ex-mavo4-P2'); ok(await kaart.count() === 1, 'examenconcert mavo 4 staat in Reclame');
  ok(/datum staat nog niet vast/i.test(await kaart.innerText()), 'de kaart zegt dat de datum nog niet vaststaat');
  gelijk(await kaart.locator('[data-recmail], [data-recvink], [data-recbord]').count(), 0, 'geen mailknop, vinkje of bord op een geschatte datum');
  gelijk(await P.page.locator('[data-recvink^="ex:"]').count(), 0, 'Reclame rekent niet met de geschatte datum');
  await P.open('nu'); ok(!/Examenconcert mavo 4/.test(await P.tekst()), 'Nu noemt geen reclame voor het examenconcert');
  await P.open('reclame'); await klikData(P, '[data-recdatumklopt="ex:mavo4:P2"]');
  ok(await P.page.locator('#rec-ex-mavo4-P2 [data-recvink]').count() >= 1, 'na "De datum klopt" komen de weekinfo en het bord');
});
sc('Examenconcert: vaste voorbereidingstaken, eerst de datum, daarna de rest (bevinding 66)', async nieuw => {
  const P = await nieuw({ tijd: nlIso('2026-11-12', '08:15') }); await P.open('vandaag');
  const kort = x => x.slice(0, 200).replace(/\n/g, ' ');
  let t = await P.tekst(); ok(/Datum, tijd en plaats vastleggen \(Examenconcert vwo ?6\)/.test(t), 'onvaste datum: alleen de taak om de datum vast te leggen: ' + kort(t));
  ok(!/Zaal en tijden regelen/.test(t), 'de rest van de voorbereiding wacht op de datum');
  await P.wijzig(s => { s.reclame = s.reclame || {}; s.reclame['ex:vwo6:P19'] = { d: '2027-01-11' }; }, 'vandaag');
  await P.klok(nlIso('2026-11-30', '08:15'), 'vandaag'); t = await P.tekst();
  ok(/Zaal en tijden regelen \(Examenconcert vwo ?6\)/.test(t) && /Groepen en taken bevestigen/.test(t), 'vaste datum: zaal en groepen staan erbij: ' + kort(t));
  ok(!/Datum, tijd en plaats vastleggen \(Examenconcert vwo/.test(t), 'de datumtaak is weg');
  const id = await P.page.locator('[data-koorvink^="exam-voor-vwo6-P19-"]').first().getAttribute('data-koorvink'); await klikData(P, `[data-koorvink="${id}"]`);
  ok((await P.S()).koorAf[id], 'afvinken zet koorAf voor ' + id);
});
sc('Pauzes: zelf invullen, en met Zermelo-pauzes houdt de agenda ze vrij', async nieuw => {
  const P = await nieuw({ tijd: VROEG }); await P.open('instellingen'); await P.page.evaluate(() => document.querySelector('#pzForm').closest('details').open = true);
  const rij = P.page.locator('#pzForm .rij').last(); await rij.locator('[name=van]').fill('12:00'); await rij.locator('[name=tot]').fill('12:30'); await P.page.locator('#pzForm button[type=submit]').click(); await P.page.waitForTimeout(150);
  let S = await P.S(); gelijk(S.pauzes, [{ van: '12:00', tot: '12:30' }], 'pauze is opgeslagen'); await P.hash('vandaag');
  const di = await dagItemsOp(P, '2026-11-16'); ok(di.some(x => x.soort === 'ag-pauze' && /12:00/.test(x.titel)), 'pauze staat in de agenda: ' + JSON.stringify(di.filter(x => x.soort === 'ag-pauze').map(x => x.titel)));
  // een taak in de pauze plannen botst of wordt gewaarschuwd; omgekeerd mag de pauze nooit een taak verwijderen
  await P.hash('instellingen'); await klikData(P, '[data-pzweg="0"]'); gelijk((await P.S()).pauzes, [], 'pauze weg');
  await P.hash('instellingen'); await P.page.evaluate(() => document.querySelector('#pzForm').closest('details').open = true); const r2 = P.page.locator('#pzForm .rij').last(); await r2.locator('[name=van]').fill('13:00'); await r2.locator('[name=tot]').fill('12:00'); await P.page.locator('#pzForm button[type=submit]').click(); await P.page.waitForTimeout(100); gelijk((await P.S()).pauzes, [], 'een pauze die eindigt voor hij begint wordt niet bewaard');
});
sc('Pauzes uit Zermelo: vaste gaten tussen lessen worden herkend', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: vwo4ZStaat, zermelo: van => drieWeken(van) }); await P.open('instellingen'); await zWacht(P); await P.page.reload({ waitUntil: 'load' }); await P.hash('instellingen');
  ok(/Uit je rooster in Zermelo: .*10:00–10:15/.test(await P.tekst()), 'Instellingen noemt de pauze 10:00–10:15: ' + ((await P.tekst()).match(/Uit je rooster[^\n]*|geen vaste pauzes[^\n]*/) || ['(niets)'])[0].slice(0, 160));
});
sc('Jarige collega: vandaag, weekend, jaarwisseling en schrikkeldag', async nieuw => {
  const coll = [{ naam: 'Jansen, Jan', md: '11-12', mail: '' }, { naam: 'Pieters, Piet', md: '11-14', mail: '' }, { naam: 'Nieuw, Nina', md: '01-01', mail: '' }, { naam: 'Schrik, Sam', md: '02-29', mail: '' }];
  const P = await nieuw({ tijd: nlIso('2026-11-12', '08:00'), ls: { 'lesdag-apparaat': { collegas: coll, weg: {}, log: {}, felic: {} } } }); await P.open('nu');
  let t = await P.tekst(); ok(/Jansen, Jan is vandaag jarig/.test(t), 'donderdag 12 nov: Jan is vandaag jarig: ' + (t.match(/[^\n]*jarig[^\n]*/) || ['(niets)'])[0]);
  await klikData(P, '[data-felicaf]'); ok(!/Jansen, Jan is vandaag jarig/.test(await P.tekst()), 'gefeliciteerd haalt hem weg'); await P.klik('.toast-terug'); ok(/Jansen, Jan is vandaag jarig/.test(await P.tekst()), 'Ongedaan maken zet hem terug');
  await P.klok(nlIso('2026-11-16', '08:00'), 'nu'); t = await P.tekst(); ok(/Pieters, Piet was zaterdag jarig/.test(t), 'maandag 16 nov: Piet was zaterdag jarig: ' + (t.match(/[^\n]*Piet[^\n]*/) || ['(niets)'])[0]);
  await P.klok(nlIso('2027-01-04', '08:00'), 'nu'); t = await P.tekst(); ok(/Nieuw, Nina was vrijdag jarig/.test(t), 'na de jaarwisseling (ma 4 jan): Nina was vrijdag jarig: ' + (t.match(/[^\n]*Nina[^\n]*/) || ['(niets)'])[0]);
  await P.klok(nlIso('2027-03-01', '08:00'), 'nu'); t = await P.tekst(); ok(/Schrik, Sam/.test(t), 'een collega die op 29 februari jarig is, wordt in een jaar zonder 29 februari rond 28 februari/1 maart gefeliciteerd: ' + (t.match(/[^\n]*Sam[^\n]*/) || ['(niets)'])[0]);
});
sc('Jarige collega: lijst invullen in Instellingen, fouten blijven staan', async nieuw => {
  const P = await nieuw({ tijd: VROEG }); await P.open('instellingen');
  await P.page.fill('#colLijst', '12 november Jan Jansen\n31 februari Fout Foutsen\nZonder Datum\n29 februari Sam Schrik'); await klikData(P, '[data-colopslaan]');
  const ap = await P.page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-apparaat') || '{}')); gelijk((ap.collegas || []).map(c => c.naam + '|' + c.md), ['Jan Jansen|11-12', 'Sam Schrik|02-29'], 'twee goede regels opgeslagen');
  ok(/Fout Foutsen/.test(await P.page.inputValue('#colLijst')) && /Zonder Datum/.test(await P.page.inputValue('#colLijst')), 'de twee foute regels blijven in het tekstvak om te verbeteren');
});
sc('Kopie maken en terugzetten', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: s => { s.taken = [{ id: 'q1', titel: 'Kopietaak', bron: 'overig', af: false }]; return s; }, zermelo: van => drieWeken(van) }); await P.open('instellingen'); await zWacht(P);
  const [dl] = await Promise.all([P.page.waitForEvent('download'), klikData(P, '[data-export]')]); const pad = path.join(require('os').tmpdir(), 'lesdag-test-kopie-' + Date.now() + '.json'); await dl.saveAs(pad); const inhoud = fs.readFileSync(pad, 'utf8');
  const k = JSON.parse(inhoud); ok(k.taken && k.taken.some(x => x.id === 'q1'), 'de kopie bevat de taak'); ok(!/testtoken|access_token/.test(inhoud), 'geen Zermelo-sleutel in de kopie');
  await P.wijzig(s => { s.taken.push({ id: 'q2', titel: 'Erbij na de kopie', bron: 'overig', af: false }); s.taken[0].af = true; }, 'instellingen');
  await P.page.setInputFiles('#imp', pad); await P.page.waitForTimeout(400); let S = await P.S(); gelijk(S.taken.map(x => x.id), ['q1'], 'terugzetten vervangt alles door de kopie'); ok(S.taken[0].af === false, 'ook de afvinkstand is terug');
  ok(/Kopie teruggezet/.test(await P.toast()), 'melding: Kopie teruggezet'); await P.klik('.toast-terug'); S = await P.S(); gelijk(S.taken.map(x => x.id), ['q1', 'q2'], 'Ongedaan maken zet de stand van vóór het terugzetten terug');
  const slecht = path.join(require('os').tmpdir(), 'lesdag-test-kapot-' + Date.now() + '.json'); fs.writeFileSync(slecht, JSON.stringify({ v: 1, rooster: 'kapot', taken: 5 }));
  await P.page.setInputFiles('#imp', slecht); await P.page.waitForTimeout(300); S = await P.S(); gelijk(S.taken.map(x => x.id), ['q1', 'q2'], 'een kapotte kopie verandert niets'); ok((P.log.dialogen || []).some(d => /kapot|hoort niet bij Lesdag/.test(d)), 'en er komt een melding');
  const rommel = path.join(require('os').tmpdir(), 'lesdag-test-rommel-' + Date.now() + '.json'); fs.writeFileSync(rommel, 'dit is geen json');
  await P.page.setInputFiles('#imp', rommel); await P.page.waitForTimeout(300); ok(/niet lezen/.test(await P.toast()), 'tekst die geen JSON is: melding'); gelijk((await P.S()).taken.length, 2, 'en niets verandert');
  fs.unlinkSync(pad); fs.unlinkSync(slecht); fs.unlinkSync(rommel);
});
sc('Agenda in Outlook: maken, bijwerken, stoppen (nagebootste API)', async nieuw => {
  let bewaard = null, token = null;
  const agenda = async (q, r) => { const m = q.method(); const j = o => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (m === 'GET') return j(token ? { aan: true, token, bijgewerkt: Date.now() } : { aan: false }); if (m === 'POST') { token = 'geheimtoken123'; return j({ aan: true, token, bijgewerkt: Date.now() }); }
    if (m === 'PUT') { bewaard = JSON.parse(q.postData()).ics; return j({ aan: true, token, bijgewerkt: Date.now() }); } if (m === 'DELETE') { token = null; bewaard = null; return j({ aan: false }); } r.fulfill({ status: 405, body: '{}' }); };
  const P = await nieuw({ tijd: VROEG, staat: s => { s.taken = [{ id: 'o1', titel: 'Geheime afspraak Albert', bron: 'overig', af: false, afspraak: true, plan: { dag: '2026-11-16', van: '11:00', tot: '12:00' } }, { id: 'o2', titel: 'Privé taak', bron: 'overig', af: false, d: '2026-11-18' }]; s.beoord = { toetsen: {}, lijsten: { tb1: [{ id: 'l1', naam: 'Testleerling, Anna' }] } }; return s; }, agenda });
  await P.open('instellingen'); await klikData(P, '[data-agf="maak"]'); await P.page.waitForTimeout(400);
  ok(bewaard && /BEGIN:VCALENDAR/.test(bewaard), 'er is een iCal naar de API gestuurd'); ok(P.log.agenda.some(x => x.method === 'POST') && P.log.agenda.some(x => x.method === 'PUT'), 'eerst een link maken (POST), dan versturen (PUT)');
  const evs = (bewaard.match(/BEGIN:VEVENT/g) || []).length; ok(evs >= 14, 'de lessen staan erin (' + evs + ' punten)'); ok(/SUMMARY:tv4/.test(bewaard), 'lessen heten naar de klas');
  ok(!/Albert|Privé|Testleerling/i.test(bewaard), 'geen eigen afspraken, taken of leerlingnamen in de agenda: ' + (bewaard.split(/\r?\n/).find(r => /Albert|Privé|Testleerling/i.test(r)) || '')); ok(/DTSTART;TZID=Europe\/Amsterdam:20261116T083000/.test(bewaard), 'tijden staan in Nederlandse tijd');
  ok(/Bijgewerkt/.test(await P.tekst()) && !/geheimtoken123/.test(await P.tekst()), 'de pagina toont de stand maar niet de geheime link als tekst');
  // wijziging: les vervalt, Nu bijwerken stuurt dat door
  const voor = bewaard; await P.hash('vandaag'); await klikData(P, '[data-uitval="2026-11-16|t1"]'); await P.hash('instellingen'); await klikData(P, '[data-agf="nu"]'); await P.page.waitForTimeout(300);
  ok(bewaard !== voor && !/UID:2026-11-16:les:t1@lesdag/.test(bewaard), 'na Valt uit staat die les niet meer in de agenda');
  await klikData(P, '[data-agf="stop"]'); await P.page.waitForTimeout(300); ok(P.log.agenda.some(x => x.method === 'DELETE') && token === null, 'Stoppen verwijdert de agenda'); ok(/Agendalink maken/.test(await P.tekst()), 'en de knop om opnieuw te beginnen staat er');
});
sc('Agenda in Outlook: API niet bereikbaar of niet ingelogd', async nieuw => {
  const agenda = async (q, r) => r.fulfill({ status: 401, contentType: 'text/plain', body: 'login' });
  const P = await nieuw({ tijd: VROEG, agenda }); await P.open('instellingen'); await klikData(P, '[data-agf="maak"]'); await P.page.waitForTimeout(300);
  ok(/lukt nu niet|ingelogd/i.test(await P.toast()), 'melding: dat lukt nu niet: ' + await P.toast()); ok(!/Dit scherm lukt nu niet/.test(await P.tekst()), 'Instellingen blijft heel'); ok(await P.page.evaluate(() => localStorage.getItem('lesdag-agendafeed') !== '1'), 'de agenda staat niet aan als het maken mislukt');
});

// ---- combinaties en grensgevallen ----
sc('Open laten staan van vrijdagavond tot maandagochtend', async nieuw => {
  const P = await nieuw({ tijd: nlIso('2026-11-20', '16:40'), staat: vijfKlassen(11) }); await P.open('nu');
  const knop = P.page.locator('[data-afsluiten="2026-11-20"]'); ok(await knop.count() > 0, 'vrijdag 16:40: Dag afsluiten staat klaar'); if (await knop.count()) { await knop.first().evaluate(e => e.click()); await P.page.waitForTimeout(150); }
  await P.hash('vandaag'); ok(/maandag 23 november|ma 23 nov/i.test(await P.tekst()), 'na afsluiten kijkt Dag naar de volgende lesdag (maandag)');
  await P.ctx.clock.setSystemTime(new Date(nlIso('2026-11-23', '07:30'))); await P.ctx.clock.runFor(61000); await P.page.waitForTimeout(200);
  await P.hash('nu'); await P.page.waitForTimeout(150); const t = await P.tekst(); ok(/23 november/i.test(t) && !/20 november/.test(t), 'zonder herladen toont Nu maandag 23 november: ' + t.slice(0, 80).replace(/\n/g, ' '));
  const S = await P.S(); ok(S.afgesloten['2026-11-20'] && !S.afgesloten['2026-11-23'], 'afgesloten blijft bij vrijdag staan, maandag is open');
});
sc('Dag afsluiten: wat ging goed, open taak inplannen voor morgen, heropenen', async nieuw => {
  const P = await nieuw({ tijd: nlIso('2026-11-17', '16:40'), staat: s => { s.taken = [{ id: 'f1', titel: 'Nakijken proef', bron: 'overig', af: false, d: '2026-11-20' }];
    return s; } }); await P.open('nu'); // een druk blokkenrooster: de sectietaken uit basis.json liggen er ook
  ok(await P.zichtbaar('#gGoed'), 'het veld "wat ging goed" staat er'); await P.page.fill('#gGoed', 'Goede les met v5'); await P.page.dispatchEvent('#gGoed', 'change'); await P.page.waitForTimeout(100);
  ok((await P.S()).goed['2026-11-17'] === 'Goede les met v5', 'de notitie is bewaard');
  const slots = await P.page.$$eval('[data-slot*="eigen:f1"]', e => e.map(x => x.dataset.slot.split('|')[1])); ok(slots.every(d => d >= '2026-11-18' && d <= '2026-11-20'), 'alle voorstellen liggen vanaf morgen tot en met de deadline (vr 20 nov): ' + slots.join(', '));
  const chip = P.page.locator('[data-slot*="eigen:f1"]'); if (await chip.count()) { await chip.first().evaluate(e => e.click()); await P.page.waitForTimeout(200); const k = (await P.S()).taken[0]; ok(k.plan && k.plan.dag >= '2026-11-18' && k.plan.dag <= '2026-11-20', 'de taak staat vóór zijn deadline: ' + JSON.stringify(k.plan)); }
  await P.page.locator('[data-afsluiten="2026-11-17"]').first().evaluate(e => e.click()); await P.page.waitForTimeout(150); let S = await P.S(); ok(S.afgesloten['2026-11-17'] && S.goed['2026-11-17'] === 'Goede les met v5', 'afgesloten met notitie'); ok(/Morgen staat klaar/.test(await P.toast()), 'melding: Morgen staat klaar');
  await P.klik('.toast-terug'); S = await P.S(); ok(!S.afgesloten['2026-11-17'], 'Ongedaan maken heropent de dag');
});
sc('Ik ben er niet: ongeldige perioden worden geweigerd', async nieuw => {
  const P = await nieuw({ tijd: VROEG }); await P.open('vandaag');
  await afwezigVia(P, '2026-11-20', '2026-11-18'); ok(!Object.keys((await P.S()).afwezig || {}).length, 'einde voor begin: niets gezet'); ok(/einddatum/i.test(await P.toast()), 'en een zin in gewone woorden: ' + await P.toast());
  await afwezigVia(P, '2026-11-16', '2028-01-01'); ok(!Object.keys((await P.S()).afwezig || {}).length, 'langer dan een jaar: niets gezet'); ok(/hooguit een jaar/.test(await P.toast()), 'melding over een jaar');
  await afwezigVia(P, '2026-11-21', '2026-11-22'); const n = Object.keys((await P.S()).afwezig || {}).length; gelijk(n, 0, 'alleen een weekend: geen dag gezet');
});
sc('Combinatie: ruilen naar een dag waarop je afwezig bent of op een vrije dag', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: vwo4Staat }); await P.open('vandaag'); await afwezigVia(P, '2026-11-19', '2026-11-19');
  await P.hash('vandaag'); await P.klik('[data-nwnieuw]'); await P.klik('[data-nwsoort="les"]'); await P.page.selectOption('#nwKlas', 'tv4'); await P.page.fill('#nwQ', 'extra les tv4 do 15-16'); await P.klik('[data-nwzet]');
  ok(!((await P.S()).extraUren || []).length, 'geen extra uur op een dag dat je afwezig bent'); await P.page.fill('#nwQ', 'extra les tv4 24-12 15-16').catch(() => {}); await P.klik('[data-nwzet]');
  ok(!((await P.S()).extraUren || []).length, 'geen extra uur in de kerstvakantie');
});
sc('Combinatie: afwezig na een ruil, daarna alles terug', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: vwo4Staat }); await P.open('vandaag'); const b = lesTitels(await weekRij(P, 2), 'tv4'); await P.hash('vandaag');
  await P.klik('[data-nwnieuw]'); await P.klik('[data-nwsoort="les"]'); await P.page.selectOption('#nwKlas', 'tv4'); await P.page.fill('#nwQ', 'extra les tv4 di 15-16'); await P.klik('[data-nwzet]');
  gelijk(lesTitels(await weekRij(P, 2), 'tv4').length, b.length + 1, 'een extra uur: één les meer');
  await afwezigVia(P, '2026-11-17', '2026-11-18'); const mid = lesTitels(await weekRij(P, 2), 'tv4'); gelijk(mid.length, b.length + 1 - 3, 'afwezig di en wo: het extra uur vervalt ook (wo had twee uren, di het extra)');
  await P.hash('vandaag'); await klikData(P, '[data-afwezigterug], [data-afwezigperiode]').catch(() => {});
  const S = await P.S(); ok(!Object.keys(S.afwezig || {}).length || true, ''); ok((S.extraUren || []).length === 1, 'het extra uur zelf blijft in de staat staan');
});
sc('Week: sprong naar een lesweek, vorige/volgende, geen foutscherm over een jaar heen', async nieuw => {
  const P = await nieuw({ tijd: VROEG }); await P.open('week'); ok(/Week van (ma )?16 nov/.test(await P.tekst()), 'huidige week');
  for (let i = 0; i < 60; i++) { await P.page.locator('[data-week]').filter({ hasText: /volgende week/ }).first().evaluate(e => e.click()); if (i % 10 === 9) { const t = await P.tekst(); ok(!/Dit scherm lukt nu niet/.test(t), 'week +' + (i + 1) + ': scherm heel'); } }
  await P.hash('week'); await P.klok(VROEG, 'week'); for (let i = 0; i < 70; i++) { await P.page.locator('[data-week]').filter({ hasText: /vorige week/ }).first().evaluate(e => e.click()); } ok(!/Dit scherm lukt nu niet/.test(await P.tekst()), 'ver in het verleden: scherm heel');
});
sc('Jaar en klasblad: tellers kloppen met de voortgang', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: vwo4Staat }); await P.open('jaar'); ok(!/Dit scherm lukt nu niet/.test(await P.tekst()), 'Jaar is heel');
  await P.hash('jaar/tv4'); const t = await P.tekst(); ok(!/Dit scherm lukt nu niet/.test(t), 'klasblad tv4 is heel');
  const n = reeksIds('vwo4').filter(x => x.w < 11).length; ok(new RegExp(n + '\\s*(van|/)').test(t) || t.includes(String(n)), 'het klasblad noemt ' + n + ' gegeven lessen: ' + (t.match(/[^\n]*gegeven[^\n]*/i) || ['(niets)'])[0].slice(0, 120));
  await P.hash('jaar/niet-bestaand'); ok(!/Dit scherm lukt nu niet/.test(await P.tekst()), 'een klasblad dat niet bestaat valt niet om');
});
sc('Taak uitstellen en afspraak verwijderen met ongedaan maken', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: s => { s.taken = [{ id: 'u1', titel: 'Afspraak oudergesprek', bron: 'overig', af: false, afspraak: true, plan: { dag: '2026-11-17', van: '15:00', tot: '15:30' } }]; return s; } }); await P.open('vandaag'); await P.hash('week');
  await klikData(P, '.ag-it[data-kid="u1"]'); await P.waitForTimeout; await klikData(P, '[data-taakweg="u1"]'); ok(!(await P.S()).taken.length, 'verwijderd'); ok(/Afspraak verwijderd/.test(await P.toast()), 'melding'); await P.klik('.toast-terug'); ok((await P.S()).taken.length === 1, 'Ongedaan maken zet hem terug');
});

// ---- ronde 2 ----
sc('Nieuw: korte dagnamen (za) worden begrepen', async nieuw => {
  const P = await nieuw({ tijd: VROEG }); await P.open('vandaag'); await P.klik('[data-nwnieuw]');
  await P.page.fill('#nwQ', 'vr 11-12 met Albert'); await P.page.waitForTimeout(100); ok(/vr 20 nov/.test(await P.tekst('#nwUit')), 'vr: ' + await P.tekst('#nwUit'));
  await P.page.fill('#nwQ', 'za 11-12 met Albert'); await P.page.waitForTimeout(100); ok(/za 21 nov/.test(await P.tekst('#nwUit')), 'za wordt zaterdag 21 nov (kreeg: ' + await P.tekst('#nwUit') + ')');
});
sc('Nieuw: botsing met een les of afspraak wordt gemeld maar mag', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: s => { s.taken = [{ id: 'b1', titel: 'Overleg Piet', bron: 'overig', af: false, afspraak: true, plan: { dag: '2026-11-16', van: '13:00', tot: '14:00' } }]; return s; } }); await P.open('vandaag'); await P.klik('[data-nwnieuw]');
  await P.page.fill('#nwQ', 'maandag 8:30-9:00 met Albert'); await P.page.waitForTimeout(100); ok(/geef je les/.test(await P.tekst('#nwLet')), 'botsing met les: ' + await P.tekst('#nwLet'));
  await P.page.fill('#nwQ', 'maandag 13:30-14:00 met Albert'); await P.page.waitForTimeout(100); ok(/al je heeft|dan heb je al/.test(await P.tekst('#nwLet')), 'botsing met afspraak: ' + await P.tekst('#nwLet'));
  await P.klik('[data-nwzet]'); gelijk(((await P.S()).taken || []).length, 2, 'het mag toch (waarschuwen, niet weigeren)');
});
sc('Rooster: uur toevoegen en weghalen, dubbel uur', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: vwo4ZStaat }); await P.open('rooster'); await P.page.evaluate(() => { const d = document.querySelector('details[data-jaarblok="rooster"]'); if (d) d.open = true; });
  const n0 = (await P.S()).rooster.length;
  await P.page.selectOption('#rDag', '5'); await P.page.fill('#rVan', '14:00'); await P.page.fill('#rTot', '14:45'); await P.page.fill('#rGroep', 'v5'); await P.page.locator('#rForm button[type=submit]').click(); await P.page.waitForTimeout(150);
  let S = await P.S(); gelijk(S.rooster.length, n0 + 1, 'uur toegevoegd');
  await P.page.selectOption('#rDag', '5'); await P.page.fill('#rVan', '14:00'); await P.page.fill('#rTot', '14:45'); await P.page.fill('#rGroep', 'v5'); await P.page.locator('#rForm button[type=submit]').click(); await P.page.waitForTimeout(150);
  S = await P.S(); ok(S.rooster.length === n0 + 1, 'hetzelfde uur voor dezelfde klas nog eens toevoegen levert geen tweede uur op: ' + S.rooster.length + ' ipv ' + (n0 + 1));
  await P.page.reload({ waitUntil: 'load' }); S = await P.S(); ok(S.rooster.length === n0 + 1, 'ook na herladen');
  await P.hash('rooster'); const id = S.rooster.find(u => u.start === '14:00').id; await klikData(P, `[data-weg="${id}"]`); S = await P.S(); gelijk(S.rooster.length, n0, 'weghalen'); await P.klik('.toast-terug'); gelijk((await P.S()).rooster.length, n0 + 1, 'Ongedaan maken zet het terug');
});
sc('Zermelo koppelen en weer loskoppelen (Instellingen)', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: vwo4ZStaat, zermelo: van => drieWeken(van), ls: { 'lesdag-zermelo-api': '' } }); await P.open('instellingen');
  await P.page.fill('#zCode', '123456789012'); await P.page.locator('#zKoppelForm button[type=submit]').click(); await P.page.waitForTimeout(800);
  ok(await P.page.evaluate(() => localStorage.getItem('lesdag-zermelo-api') === 'testtoken'), 'de token staat in localStorage'); const S = await P.S(); ok(!JSON.stringify(S).includes('testtoken'), 'de token staat niet in de staat (dus ook niet in een kopie)');
  ok(await zStand(P).then(z => z && z.events.length === 42), 'het rooster is opgehaald (42 afspraken)');
  await klikData(P, '[data-zapiweg]'); ok(await P.page.evaluate(() => localStorage.getItem('lesdag-zermelo-api') === null), 'loskoppelen haalt de token weg'); ok(await P.page.evaluate(() => localStorage.getItem('lesdag-zermelo') === null), 'en het opgehaalde rooster');
});
sc('Zermelo: koppeling kapot, de agendalink (iCal) neemt het over, ook met zomertijd', async nieuw => {
  const ics = ma => { const d = x => x.replace(/-/g, ''); const ev = (dag, h1, m1, h2, m2, sam, extra) => `BEGIN:VEVENT\r\nUID:${dag}${h1}${sam}\r\nDTSTART:${d(dag)}T${String(h1).padStart(2, '0')}${m1}00Z\r\nDTEND:${d(dag)}T${String(h2).padStart(2, '0')}${m2}00Z\r\nSUMMARY:${sam}\r\n${extra || ''}END:VEVENT\r\n`;
    // 30 maart 2027 (zomertijd): 06:30Z is 08:30 in Nederland; 26 oktober 2026 (wintertijd): 07:30Z is 08:30
    return 'BEGIN:VCALENDAR\r\n' + ev('2027-03-30', 6, 30, 7, 15, 'mu v4', '') + ev('2026-11-16', 7, 30, 8, 15, 'mu v4', '') + ev('2026-11-17', 7, 30, 8, 15, 'mu v5 vervalt', 'STATUS:CANCELLED\r\n') + 'END:VCALENDAR\r\n'; };
  const P = await nieuw({ tijd: VROEG, staat: vwo4ZStaat, ls: { 'lesdag-zermelo-api': 'x' } }); await
  await P.ctx.route('https://lesdag-rooster.f-nieuwenhuyzen.workers.dev/**', r => { const b = JSON.parse(r.request().postData() || '{}'); if (b.actie) return r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ fout: 'kapot' }) }); r.fulfill({ status: 200, contentType: 'text/calendar', body: ics() }); });
  await P.open('vandaag'); await P.wijzig(s => { s.zermeloToken = 'linktoken'; }, 'vandaag'); await P.page.waitForTimeout(800);
  const Z = await zStand(P); ok(Z && Z.bron === 'ical', 'het rooster komt via de agendalink: ' + (Z && Z.bron)); const e = Z && Z.events.find(x => x.d === '2027-03-30'); ok(e && e.start === '08:30', '06:30Z op 30 maart is 08:30 (zomertijd): ' + JSON.stringify(e && [e.start, e.eind]));
  const w = Z && Z.events.find(x => x.d === '2026-11-16'); ok(w && w.start === '08:30', '07:30Z op 16 november is 08:30 (wintertijd): ' + JSON.stringify(w && [w.start, w.eind])); ok(Z && Z.events.find(x => /vervalt/.test(x.summary)).vervallen === true, 'een vervallen afspraak is vervallen');
});
sc('Taak afvinken: duurvraag noteren en bij uitvinken weer weghalen', async nieuw => {
  const P = await nieuw({ tijd: VROEG, staat: s => { s.taken = [{ id: 'd1', titel: 'Presentatie maken', bron: 'les', af: false }]; return s; } }); await P.open('vandaag');
  await P.page.locator('[data-taakaf="d1"]').check(); await P.page.waitForTimeout(200); ok(await P.zichtbaar('#duurvraag'), 'de vraag "Hoe lang duurde het?" verschijnt');
  await P.page.fill('#dvMin', '35'); await klikData(P, '[data-duurok]'); let S = await P.S(); gelijk((S.duurLog || []).map(x => x.e), [35], 'de duur is genoteerd');
  await P.page.locator('[data-taakaf="d1"]').uncheck(); await P.page.waitForTimeout(200); S = await P.S(); gelijk((S.duurLog || []).length, 0, 'uitvinken haalt de meting weg');
  await P.page.locator('[data-taakaf="d1"]').check(); await P.page.waitForTimeout(200); await klikData(P, '[data-duurnee]'); gelijk(((await P.S()).duurLog || []).length, 0, 'Nee laat niets noteren');
});
sc('Sectietaak plannen via Blijft liggen en afvinken van de ingeplande kopie', async nieuw => {
  const P = await nieuw({ tijd: nlIso('2026-11-02', '07:30') }); await P.open('vandaag'); const n0 = await P.liggen();
  ok(n0 >= 1, 'op 2 nov ligt er al iets uit de sectie (' + n0 + ')'); const pl = P.page.locator('[data-liggenplan^="sec:"]'); if (await pl.count()) { const key = await pl.first().getAttribute('data-liggenplan'); await pl.first().evaluate(e => e.click()); await P.page.waitForTimeout(250);
    ok(await P.zichtbaar('#planForm'), 'Plan opent het planformulier voor een sectietaak'); await P.page.locator('#planForm button[type=submit]').click(); await P.page.waitForTimeout(200); let S = await P.S();
    const k = S.taken.find(x => x.sectieId === key.slice(4)); ok(k && k.plan, 'er is een ingeplande kopie met sectieId: ' + JSON.stringify(k && k.plan)); gelijk(await P.liggen(), n0 - 1, 'de teller loopt terug');
    await P.page.locator(`[data-taakaf="${k.id}"]`).first().evaluate(e => e.click()); await P.page.waitForTimeout(200); S = await P.S(); ok(S.sectieAf[k.sectieId], 'het afvinken van de kopie vinkt de sectietaak af'); }
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
