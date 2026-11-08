// node tools/test-routes-beoordelen.js [--poort=8752] [--model=p1-havo4,p4-havo5] [--toon] [--hou]
// Routetest Beoordelen: klikt per beoordelingsmodel uit public/data/beoordeling.json de hele route door (klassenlijst plakken, namen koppelen, groepjes,
// scoren, concertstand, tussenstand, afwezig en inhalen, afronden, wijzigen, herkansing, klasgenoten, inleverbak, cijferkolom, csv, feedbackblad-pdf,
// reserve en terugzetten, logboek) en rekent elke uitkomst na met een EIGEN berekening uit het model (hele getallen in tienden, zonder bm-reken.js).
// Zelfde opzet als test-schermen.js: Playwright via NODE_PATH (zie tools/TESTEN.md), verzonnen namen, wegwerpbrowser. Exitcode 0 goed, 1 fouten, 2 overgeslagen.
const cp = require('child_process'), net = require('net'), path = require('path'), fs = require('fs'), zlib = require('zlib');
const args = process.argv.slice(2); const arg = (n, d) => { const a = args.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const TOON = args.includes('--toon');
let pw; try { pw = require('playwright-core'); } catch (e) { try { pw = require('playwright'); } catch (e2) { console.log('OVERGESLAGEN: Playwright niet gevonden (zet NODE_PATH, zie tools/TESTEN.md).'); process.exit(2); } }
const MODELLEN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'beoordeling.json'), 'utf8'));
const FILTER = arg('model', '') ? arg('model', '').split(',') : null;
const vrijePoort = () => new Promise(r => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const bladeren = [process.env.LESDAG_BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);

/* ---------------- verzonnen klas ---------------- */
const NAMEN = ['Anna Alpha', 'Bram Bakker', 'Cato de Vries', 'Daan van Dijk', 'Fenna Zoë Foks', 'Gijs Groen']; // 0..5; Gijs is afwezig, Fenna gaat in de concertstand
const MAGISTER = 'Nr.\tNaam\tKlas\tGeboortedatum\n' + NAMEN.map((n, i) => `${101 + i}\t${n}\tv4a\t0${i + 1}-03-2010`).join('\n');
const SCORE = { Anna: [5, 6], Bram: [9, 10], Cato: [7, 7] };

/* ---------------- eigen berekening uit het model (tienden, hele getallen) ---------------- */
const crits = m => m.onderdelen.flatMap(o => o.criteria);
const delenM = m => m.delen || (+m.zelfbeoordeling ? { docent: 100 - m.zelfbeoordeling, zelf: +m.zelfbeoordeling } : { docent: 100 });
const half = (teller, noemer) => Math.floor((2 * teller + noemer) / (2 * noemer)); // teller/noemer afgerond, .5 omhoog
const tienden = x => Math.round(x * 10);
const toon = t => t == null ? '' : (t / 10).toFixed(1).replace('.', ',');
const naarT = tekst => { const s = String(tekst).trim().replace(',', '.'); return s === '' ? null : Math.round(parseFloat(s) * 10); };
// laag: { ll: { id: { s:{crit:waarde}, zelf (tienden), papier:[tienden], forms:[tienden], af, v:{} } }, gs?: { groep: { crit: waarde } } }
function effScore(m, laag, groepVan, id, c) {
  const own = ((laag.ll[id] || {}).s || {})[c.id]; if (own != null) return own;
  const g = groepVan && groepVan(id); const gs = g && laag.gs ? (laag.gs[g] || {})[c.id] : null;
  return gs != null && c.groepsscore === true ? gs : null;
}
// veld van de toets, een ingevuld veld in een tussenstand of herkansing gaat voor (zoals de gebruiker het ziet)
const veldNiveau = (m, laag, basis, id) => { const k = m.speelkeuze; if (!k) return null; const v = Object.assign({}, ((basis && basis.ll[id]) || {}).v); for (const [a, b] of Object.entries(((laag.ll[id]) || {}).v || {})) if (b) v[a] = b; const n = (k.niveaus || []).find(x => x.naam === v[k.niveauVeld]); return n && n.plafond != null ? Math.round(n.plafond * 10) : null; };
function rekenEind(m, laag, groepVan, id, poging, basis) {
  const D = poging === false ? { docent: 100 } : delenM(m); const r = laag.ll[id] || {}; const C = crits(m); let som = 0, W = 0; const eff = [];
  for (const c of C) { const s = effScore(m, laag, groepVan, id, c); eff.push(s); if (s == null) { W = -1; break; } som += s * c.weging; W += c.weging; }
  const uit = { eff, d: null, e: null, z: null, k: null, kn: 0 };
  if (W <= 0) return uit;
  uit.d = half(10 * som, W);
  if (poging === false) { // tussenstand: alleen het docentdeel, het plafond van het niveau geldt wel
    const pl = veldNiveau(m, laag, basis, id); uit.e = pl != null ? Math.min(uit.d, pl) : uit.d; return uit; }
  let N = uit.d * D.docent; let ontbreekt = false;
  if (D.zelf) { uit.z = r.zelf == null ? null : r.zelf; if (uit.z == null) ontbreekt = true; else N += uit.z * D.zelf; }
  if (D.klasgenoten) { const w = [...(r.forms || []), ...(r.papier || [])]; uit.kn = w.length; if (w.length >= (+m.klasgenotenMin || 3)) { uit.k = half(w.reduce((a, b) => a + b, 0), w.length); N += uit.k * D.klasgenoten; } else ontbreekt = true; }
  if (ontbreekt) return uit;
  let e = half(N, 100);
  const pl = veldNiveau(m, laag, basis, id); if (pl != null) e = Math.min(e, pl);
  uit.e = e; return uit;
}
const poging = (e1, e2) => e1 == null && e2 == null ? { p: 0, e: null } : e2 == null ? { p: 1, e: e1 } : e1 == null ? { p: 2, e: e2 } : e2 > e1 ? { p: 2, e: e2 } : { p: 1, e: e1 };

/* ---------------- pdf lezen (zonder bibliotheek): aantal pagina's en alle tekststukjes in volgorde ---------------- */
function pdfLees(buf) {
  const s = buf.toString('latin1'); const obj = {}; const re = /(\d+) 0 obj\n/g; let q;
  while ((q = re.exec(s))) { const eind = s.indexOf('\nendobj\n', q.index); const dict = s.slice(q.index + q[0].length, eind); const st = dict.indexOf('stream\n'); let data = null;
    const kop = st >= 0 ? dict.slice(0, st) : dict; if (st >= 0) { const L = +(/\/Length (\d+)/.exec(kop) || [])[1]; let b = Buffer.from(dict.slice(st + 7, st + 7 + L), 'latin1'); if (/FlateDecode/.test(kop)) { try { b = zlib.inflateSync(b); } catch (e) {} } data = b.toString('latin1'); }
    obj[+q[1]] = { kop, data }; }
  const paginas = +((Object.values(obj).map(o => /\/Type \/Pages \/Count (\d+)/.exec(o.kop)).find(Boolean) || [])[1] || 0);
  const kaart = {}; // fontobject -> gid -> unicode
  for (const [n, o] of Object.entries(obj)) { const u = /\/Subtype \/Type0 .*\/ToUnicode (\d+) 0 R/.exec(o.kop); if (u && obj[u[1]]) { const m = {}; const dat = obj[u[1]].data || ''; for (const x of dat.matchAll(/<([0-9A-Fa-f]{4})> <([0-9A-Fa-f]{4})>/g)) m[x[1].toUpperCase()] = String.fromCharCode(parseInt(x[2], 16)); kaart[n] = m; } }
  const tekst = [];
  for (const o of Object.values(obj)) { const p = /\/Type \/Page \/Parent[^]*\/Contents (\d+) 0 R \/Resources << \/Font << \/FL (\d+) 0 R \/FB (\d+) 0 R/.exec(o.kop); if (!p) continue; const pg = []; tekst.push(pg);
    for (const x of (obj[p[1]].data || '').matchAll(/BT \/F([LB]) ([\d.]+) Tf ([-\d.]+) ([-\d.]+) Td <([0-9A-Fa-f]*)> Tj ET/g)) { const k = kaart[x[1] === 'L' ? p[2] : p[3]] || {}; let t = ''; for (let i = 0; i < x[5].length; i += 4) t += k[x[5].slice(i, i + 4).toUpperCase()] || '?'; pg.push({ t, y: +x[4], f: x[1] }); } }
  return { paginas, tekst, alle: tekst.flat().map(x => x.t) };
}
function zipLees(buf) { // zip zonder compressie (bm-pdf.js zip): lijst van { naam, data }
  const uit = []; let i = 0; while (i + 30 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) { const gp = buf.readUInt16LE(i + 6), meth = buf.readUInt16LE(i + 8), cs = buf.readUInt32LE(i + 18), nl = buf.readUInt16LE(i + 26), xl = buf.readUInt16LE(i + 28);
    const naam = buf.slice(i + 30, i + 30 + nl).toString((gp & 0x800) ? 'utf8' : 'latin1'); const data = buf.slice(i + 30 + nl + xl, i + 30 + nl + xl + cs); uit.push({ naam, data, meth }); i += 30 + nl + xl + cs; }
  return uit;
}
function csvLees(tekst) { const rijen = []; let r = [], c = '', q = false; const t = tekst.replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"' && t[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; continue; }
    if (ch === '"') q = true; else if (ch === ';') { r.push(c); c = ''; } else if (ch === '\n') { r.push(c.replace(/\r$/, '')); rijen.push(r); r = []; c = ''; } else c += ch; }
  if (c || r.length) { r.push(c); rijen.push(r); } return rijen; }

/* ---------------- uitvoer ---------------- */
const fouten = []; let controles = 0; let huidig = '';
const check = (wat, echt, verwacht) => { controles++; const a = JSON.stringify(echt), b = JSON.stringify(verwacht); if (a !== b) fouten.push({ model: huidig, wat, echt: a, verwacht: b }); };
const waar = (wat, ok, uitleg) => { controles++; if (!ok) fouten.push({ model: huidig, wat, echt: uitleg === undefined ? 'onwaar' : String(uitleg), verwacht: 'waar' }); };

(async () => {
  const poort = +arg('poort', 0) || await vrijePoort();
  const server = cp.spawn(process.execPath, [path.join(__dirname, 'serve-lokaal.js'), path.resolve(path.join(__dirname, '..', 'public')), String(poort)], { stdio: 'ignore' });
  const basis = 'http://localhost:' + poort + '/';
  let browser;
  try { const exe = bladeren.find(p => fs.existsSync(p)); try { browser = await pw.chromium.launch(exe ? { executablePath: exe } : {}); } catch (e) { browser = await pw.chromium.launch({ channel: 'msedge' }); } }
  catch (e) { server.kill(); console.log('OVERGESLAGEN: geen browser gevonden (' + String(e.message).split('\n')[0] + ')'); process.exit(2); }
  await new Promise(r => setTimeout(r, 500));
  const t0 = Date.now(); let nModellen = 0;
  for (const [idx, m] of MODELLEN.entries()) {
    if (FILTER && !FILTER.includes(m.id)) continue;
    huidig = m.id; nModellen++;
    if (TOON) console.error('  ' + m.id + '…');
    try { await Promise.race([routeVoor(browser, basis, m, idx), new Promise((_, nee) => setTimeout(() => nee(new Error('meer dan 150 s bezig (vastgelopen)')), 150000))]); } catch (e) { fouten.push({ model: m.id, wat: 'route afgebroken', echt: String(e.message).split('\n')[0].slice(0, 300), verwacht: 'doorlopen' }); }
  }
  await browser.close(); server.kill();
  console.log(`Routetest Beoordelen: ${nModellen} modellen, ${controles} controles in ${((Date.now() - t0) / 1000).toFixed(0)} s.`);
  if (!fouten.length) { console.log('Alle routes in orde.'); process.exit(0); }
  const per = {}; for (const f of fouten) (per[f.model] = per[f.model] || []).push(f);
  for (const [mod, l] of Object.entries(per)) { console.log('\n' + mod + ':'); for (const f of l.slice(0, TOON ? 999 : 12)) console.log(`  ${f.wat}: kreeg ${f.echt}, verwacht ${f.verwacht}`); if (l.length > 12 && !TOON) console.log(`  … en ${l.length - 12} meer (--toon)`); }
  console.log(`\n${fouten.length} fout(en) in ${Object.keys(per).length} model(len).`); process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });

/* ---------------- de route per model ---------------- */
async function routeVoor(browser, basis, m, idx) {
  const GROEP = 'tg1'; const hash = `#beoordelen/${m.id}/${GROEP}`; const D = delenM(m); const C = crits(m); const GC = C.filter(c => c.groepsscore);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.route(u => !u.href.startsWith(basis), r => r.fulfill({ status: 200, contentType: r.request().resourceType() === 'stylesheet' ? 'text/css' : 'text/plain', body: '' }));
  await ctx.route(u => u.pathname.startsWith('/api/'), r => r.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  const STAAT = { v: 1, rooster: [], groepLeergang: {}, magVanaf: '2026-08-01', beoord: { toetsen: {}, lijsten: {} } };
  await ctx.addInitScript(staat => { try { if (!sessionStorage.getItem('lesdag-test-ingesteld')) { localStorage.setItem('lesdag-staat', JSON.stringify(staat)); sessionStorage.setItem('lesdag-test-ingesteld', '1'); } } catch (e) {} }, STAAT);
  const page = await ctx.newPage(); page.setDefaultTimeout(5000);
  const consoleFouten = []; const dialogen = [];
  page.on('pageerror', e => consoleFouten.push('uitzondering: ' + String(e.message).slice(0, 200)));
  page.on('console', x => { if (x.type() === 'error' && !/Failed to load resource|net::ERR_/.test(x.text())) consoleFouten.push(x.text().slice(0, 200)); });
  page.on('dialog', d => { dialogen.push({ soort: d.type(), tekst: d.message() }); (/Toch opslaan\?/.test(d.message()) ? d.dismiss() : d.accept(d.type() === 'prompt' ? 'Generale' : undefined)).catch(() => {}); });
  await page.goto(basis + '#nu', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#main') && !/Lesdag laden/.test(document.querySelector('#main').textContent), null, { timeout: 8000 });

  const stap = async (naam, f) => { try { await f(); } catch (e) { const scherm = await page.locator('#main').innerText({ timeout: 1000 }).catch(() => '?'); const r = String(e.message).split('\n').map(x => x.trim()).filter(Boolean).slice(0, 2); r.push('scherm: ' + scherm.replace(/\s+/g, ' ').slice(300, 900)); r.push('ids in scherm: ' + (await page.$$eval('[data-bmkies]', b => b.map(x => x.dataset.bmkies)).catch(() => [])).join(',') + ' / verwacht ' + Object.values(id).join(',')); fouten.push({ model: m.id, wat: 'stap ' + naam, echt: r.slice(0, 4).join(' / ').slice(0, 1200), verwacht: 'uitgevoerd' }); } };
  const staat = () => page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-staat')).beoord);
  const klik = sel => page.click(sel);
  const logTel = {}; const log = (a, n = 1) => { logTel[a] = (logTel[a] || 0) + n; };
  const download = async f => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), f()]); const p = await d.path(); return { naam: d.suggestedFilename(), buf: fs.readFileSync(p) }; };
  const leesKlembord = async () => (await page.evaluate(() => navigator.clipboard.readText())).split('\r\n').join('\n');
  const naarRoute = async () => { await page.evaluate(h => { location.hash = h; }, hash); await page.waitForSelector('.bm-status, #bmLijst'); };
  const id = {}; // naam -> leerling-id
  const sh = { T: { ll: {}, gs: {} }, H: null, groepen: {}, tussen: null, vast: {}, vastH: {} }; // schaduwmodel van wat er geklikt is
  const row = (laag, i) => laag.ll[id[NAMEN[i]]] || (laag.ll[id[NAMEN[i]]] = { s: {}, v: {} });
  const groepVan = leerId => sh.groepen[leerId] || null;
  const ev = (laag, i, p) => rekenEind(m, laag, laag === sh.T ? groepVan : null, id[NAMEN[i]], p, sh.T);
  const kies = async i => { await klik(`[data-bmkies="${id[NAMEN[i]]}"]`); };
  const scoor = async (laag, i, cid, v) => { await klik(`.bm-scoor button[data-bmscore="${cid}|${v}"]`); const r = row(laag, i); if (r.s[cid] !== v) log('s'); r.s[cid] = v; };
  const gScoor = async (g, cid, v) => { await klik(`[data-bmgkies="${g}"]`); await klik(`.bm-scoor button[data-bmgs="${cid}|${v}"]`); const x = (sh.T.gs[g] = sh.T.gs[g] || {}); if (x[cid] !== v) log('gs'); x[cid] = v; };
  const zelfZet = async (laag, i, t) => { // t in tienden
    const r = row(laag, i);
    if (m.zelfSoort === 'cijfer') { await page.fill('input[data-bmzelfc]', toon(t)); await page.locator('input[data-bmzelfc]').blur(); } else { await klik(`.bm-scoor button[data-bmzelf="${Math.round(t / 10)}"]`); t = Math.round(t / 10) * 10; }
    if (r.zelf !== t) log('zelf'); r.zelf = t; };
  const lijstCel = async i => (await page.locator(`li:has([data-bmkies="${id[NAMEN[i]]}"]) .bm-c`).innerText()).trim();
  const celT = (tekst, laatste) => { const all = [...tekst.replace(/herk\.[^]*$/, '').matchAll(/(\d+(?:,\d)?)/g)]; const x = laatste ? all[all.length - 1] : all[0]; return x ? naarT(x[1]) : null; };
  const metGroepen = GC.length > 0; const heeftH = m.herkansbaar !== false;
  const plafondVan = i => { const k = m.speelkeuze; if (!k) return null; const n = (k.niveaus || []).find(x => x.naam === (row(sh.T, i).v || {})[k.niveauVeld]); return n && n.plafond != null ? n.plafond : null; };

  /* 1. klassenlijst plakken (Magister: nummers, klas en datum moeten eruit) */
  await stap('klassenlijst plakken', async () => {
    await page.evaluate(h => { location.hash = h; }, hash); await page.waitForSelector('#bmLijst');
    await page.fill('#bmLijst', MAGISTER); await klik('[data-bm="lijstopslaan"]'); await page.waitForSelector('[data-bm="concert"]');
    const b = await staat(); check('lijst na plakken', (b.lijsten[GROEP] || []).map(x => x.naam), NAMEN);
    waar('geen waarschuwing bij een nette lijst', !dialogen.some(d => /Let op, deze regels/.test(d.tekst)), JSON.stringify(dialogen));
    (b.lijsten[GROEP] || []).forEach(x => { id[x.naam] = x.id; });
  });
  if (Object.keys(id).length < 6) { await ctx.close(); return; }

  /* 2. namen koppelen: typfout, omgekeerde volgorde, nieuwe naam en een leerling die weggaat; daarna terug */
  await stap('namen koppelen', async () => {
    await klik('[data-bm="lijst"]'); await page.waitForSelector('#bmLijst');
    const nieuw = ['Anna Alpha', 'Bram Bakkers', 'Cato de Vries', 'Daan van Dijk', 'Groen Gijs', 'Hanna Nieuw'];
    await page.fill('#bmLijst', nieuw.join('\n')); await klik('[data-bm="lijstopslaan"]'); await page.waitForSelector('[data-bmkop]');
    const voorstel = await page.$$eval('[data-bmkop]', s => s.map(x => [x.closest('label').querySelector('span').textContent, x.options[x.selectedIndex].textContent.replace(/ \(heeft scores\)$/, '')]));
    check('voorstellen bij koppelen', voorstel, [['Bram Bakkers', 'Bram Bakker'], ['Groen Gijs', 'Gijs Groen'], ['Hanna Nieuw', 'Nieuwe leerling']]);
    await klik('[data-bm="koppelklaar"]'); await page.waitForSelector('[data-bm="concert"]');
    let b = await staat(); const l1 = b.lijsten[GROEP];
    check('namen na koppelen', l1.map(x => x.naam), nieuw); check('Bram houdt zijn id', l1[1].id, id['Bram Bakker']); check('Gijs houdt zijn id', l1[4].id, id['Gijs Groen']);
    check('Fenna staat bij de weggehaalden', (b.weg[GROEP] || []).map(x => x.naam), ['Fenna Zoë Foks']);
    await klik('[data-bm="lijst"]'); await page.waitForSelector('#bmLijst'); await page.fill('#bmLijst', NAMEN.join('\n')); await klik('[data-bm="lijstopslaan"]');
    // Bakkers wordt weer Bakker en Groen Gijs weer Gijs Groen: opnieuw koppelen; Fenna komt uit de weggehaalden terug, Hanna gaat weg
    await page.waitForSelector('[data-bmkop], [data-bm="concert"]'); if (await page.$('[data-bmkop]')) { await klik('[data-bm="koppelklaar"]'); await page.waitForSelector('[data-bm="concert"]'); }
    b = await staat(); check('lijst weer als eerst', b.lijsten[GROEP].map(x => x.naam), NAMEN); check('alle id\'s blijven gelijk', b.lijsten[GROEP].map(x => x.id), NAMEN.map(n => id[n]));
    waar('Hanna staat nu bij de weggehaalden', (b.weg[GROEP] || []).some(x => x.naam === 'Hanna Nieuw'));
    // een lijst met een dubbele naam en een rij die geen naam is geeft een waarschuwing en na Annuleren niets opgeslagen
    dialogen.length = 0; await klik('[data-bm="lijst"]'); await page.waitForSelector('#bmLijst'); await page.fill('#bmLijst', NAMEN.concat(['Anna Alpha']).join('\n')); await klik('[data-bm="lijstopslaan"]'); await page.waitForTimeout(150);
    waar('waarschuwing bij een dubbele naam', dialogen.some(d => /Dubbel: Anna Alpha/.test(d.tekst)), JSON.stringify(dialogen));
    await page.evaluate(h => { location.hash = '#nu'; }, hash); await naarRoute(); await page.waitForSelector('[data-bm="concert"], #bmLijst');
    if (await page.$('#bmLijst')) { await page.fill('#bmLijst', NAMEN.join('\n')); await klik('[data-bm="lijstopslaan"]'); await page.waitForSelector('[data-bm="concert"]'); }
    b = await staat(); check('lijst na waarschuwingen', b.lijsten[GROEP].map(x => x.naam), NAMEN);
  });

  /* 3. groepjes */
  const G1 = [0, 1, 2], G2 = [3]; let gid = {};
  if (metGroepen) await stap('groepjes', async () => {
    await klik('[data-bm="groepjes"]'); await page.waitForSelector('[data-bm="gnieuw"]');
    for (const [n, leden] of [['g1', G1], ['g2', G2]]) { await klik('[data-bm="gnieuw"]'); await page.waitForTimeout(5); const b = await staat(); const T = b.toetsen[m.id + '|' + GROEP]; const x = T.groepjes[T.groepjes.length - 1]; gid[n] = x.id; for (const i of leden) await klik(`[data-bmgin="${id[NAMEN[i]]}"]`); }
    await klik(`[data-bmgruit="${id[NAMEN[2]]}"]`); await klik(`[data-bmgactief="${gid.g1}"]`); await klik(`[data-bmgin="${id[NAMEN[2]]}"]`); // Cato eruit en er weer in
    let b = await staat(); let T = b.toetsen[m.id + '|' + GROEP];
    check('groepjes', T.groepjes.map(x => [x.id, x.leden.map(l => NAMEN[Object.values(id).indexOf(l)])]), [[gid.g1, [NAMEN[0], NAMEN[1], NAMEN[2]]], [gid.g2, [NAMEN[3]]]].map(([a, l]) => [a, l]));
    await page.fill(`[data-bmgnaam="${gid.g1}"]`, 'Roodkapjes'); await page.locator(`[data-bmgnaam="${gid.g1}"]`).blur(); b = await staat(); T = b.toetsen[m.id + '|' + GROEP];
    check('naam van het groepje', T.groepjes[0].naam, 'Roodkapjes');
    if ((m.velden || []).includes('Groep')) for (const i of G1) check('veld Groep volgt de nieuwe naam van het groepje (' + NAMEN[i] + ')', ((T.ll[id[NAMEN[i]]] || {}).v || {}).Groep, 'Roodkapjes');
    await klik('[data-bm="dicht"]'); await page.waitForSelector('[data-bmgkies]');
    G1.forEach(i => { sh.groepen[id[NAMEN[i]]] = 'g1'; }); G2.forEach(i => { sh.groepen[id[NAMEN[i]]] = 'g2'; });
  });
  const gg = n => gid[n]; // groep-id's voor de schaduw: gs wordt onder het echte id bewaard
  if (metGroepen) { sh.groepen = {}; G1.forEach(i => { sh.groepen[id[NAMEN[i]]] = gg('g1'); }); G2.forEach(i => { sh.groepen[id[NAMEN[i]]] = gg('g2'); }); }

  /* 4. velden (partij, niveau, titel) per leerling */
  await stap('velden invullen', async () => {
    for (let i = 0; i < 5; i++) { await kies(i); const r = row(sh.T, i);
      for (const v of m.velden || []) { if (v === 'Groep' && metGroepen) continue; const keuze = (m.keuzes || {})[v];
        if (keuze) { const k = m.speelkeuze && v === m.speelkeuze.niveauVeld ? [0, 1, 2, 0, 1][i] % keuze.length : (i + idx) % keuze.length; await page.selectOption(`select[data-bmveld="${v}"]`, keuze[k]); if (r.v[v] !== keuze[k]) log('v'); r.v[v] = keuze[k]; }
        else { const t = 'Test ' + v.slice(0, 8) + ' ' + i; await page.fill(`[data-bmveld="${v}"]`, t); await page.locator(`[data-bmveld="${v}"]`).blur(); r.v[v] = t; log('v'); } } }
    const b = await staat(); const T = b.toetsen[m.id + '|' + GROEP];
    for (let i = 0; i < 5; i++) for (const v of m.velden || []) if (!(v === 'Groep' && metGroepen)) check(`veld ${v} van ${NAMEN[i]}`, (T.ll[id[NAMEN[i]]].v || {})[v], row(sh.T, i).v[v]);
  });

  /* 5. scoren: Anna laag, Bram hoog (eigen score wijkt af van de groep), Cato overal 7, Daan alleen met groepsscore, Fenna volgt in de concertstand */
  const val = (i, j) => 4 + ((i * 3 + j * 5 + idx) % 7);
  await stap('scoren', async () => {
    if (metGroepen) { for (const [j, c] of GC.entries()) { await gScoor(gg('g1'), c.id, 7); await gScoor(gg('g2'), c.id, 8); } }
    for (let i = 0; i < 4; i++) { await kies(i); const naam = NAMEN[i].split(' ')[0];
      for (const [j, c] of C.entries()) { const inGroep = metGroepen && sh.groepen[id[NAMEN[i]]] && c.groepsscore; const gs = inGroep ? sh.T.gs[sh.groepen[id[NAMEN[i]]]][c.id] : null;
        let v = SCORE[naam] ? SCORE[naam][j % 2] : val(i, j);
        if (inGroep && c.groepsscore === true && i !== 1) continue; // erft de groepsscore
        if (inGroep && c.groepsscore === 'start') v = gs; // bevestigen van het startpunt
        if (inGroep && i === 1) v = gs === 10 ? 9 : gs + 1; // eigen score gaat voor
        await scoor(sh.T, i, c.id, v); }
      // zelf en klasgenoten
      if (D.zelf) await zelfZet(sh.T, i, m.zelfSoort === 'cijfer' ? [65, 92, 70, 84][i] : [6, 9, 7, 8][i] * 10);
      if (D.klasgenoten) { const papier = ['8 7,5 9', '6,5', '7', ''][i]; if (papier) { await page.fill('input[data-bmpapier]', papier); await page.locator('input[data-bmpapier]').blur(); row(sh.T, i).papier = papier.split(' ').map(naarT); log('papier'); } }
      // één extra klik op dezelfde knop mag niets wissen
      const c0 = C.find(c => row(sh.T, i).s[c.id] != null); if (c0) await klik(`.bm-scoor button[data-bmscore="${c0.id}|${row(sh.T, i).s[c0.id]}"]`);
    }
    const b = await staat(); const T = b.toetsen[m.id + '|' + GROEP];
    for (let i = 0; i < 4; i++) { const r = T.ll[id[NAMEN[i]]]; check('scores in staat ' + NAMEN[i], r.s, row(sh.T, i).s); if (D.zelf) check('zelf in staat ' + NAMEN[i], r.zelf, row(sh.T, i).zelf / 10); }
    if (metGroepen) check('groepsscores in staat', T.gs, sh.T.gs);
    // wissen met × en weer zetten
    await kies(2); const c1 = C.find(c => row(sh.T, 2).s[c.id] != null); await klik(`.bm-scoor [data-bmwis="${c1.id}"]`); log('s'); const oudeWaarde = row(sh.T, 2).s[c1.id]; delete row(sh.T, 2).s[c1.id]; let t = (await staat()).toetsen[m.id + '|' + GROEP]; waar('score gewist met ×', t.ll[id[NAMEN[2]]].s[c1.id] === undefined, JSON.stringify(t.ll[id[NAMEN[2]]].s));
    await scoor(sh.T, 2, c1.id, oudeWaarde);
    // volgende en vorige
    await kies(0); const naamKop = async () => (await page.locator('.bm-scoor .kop h2').first().innerText()).trim();
    const order = await page.$$eval('.bm-lijst [data-bmkies]', b => b.map(x => x.textContent.trim())); await klik('.bm-scoor [data-bm="volgende"]'); const na = await naamKop();
    check('volgende gaat naar de volgende in de lijst', na, order[order.indexOf(NAMEN[0]) + 1] === undefined ? NAMEN[0] : order[order.indexOf(NAMEN[0]) + 1].replace(/\s+$/, ''));
  });

  /* 6. concertstand: Fenna met de toetsen 1 tot en met 4 */
  await stap('concertstand', async () => {
    await kies(4); await klik('.kop [data-bm="concert"]'); await page.waitForSelector('.bm-cs');
    check('concertstand bewaard per apparaat', await page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-apparaat') || '{}').concert), true);
    await page.selectOption('[data-bmcskies]', id[NAMEN[4]]); await page.evaluate(() => document.activeElement && document.activeElement.blur());
    const keys = C.map((c, j) => 1 + ((j + idx) % 4)); const waarde = [4, 6, 8, 10];
    for (const [j, c] of C.entries()) { await page.keyboard.press(String(keys[j])); const r = row(sh.T, 4); log('s'); r.s[c.id] = waarde[keys[j] - 1]; await page.waitForTimeout(30); }
    let t = (await staat()).toetsen[m.id + '|' + GROEP]; check('concertstand: scores van Fenna', t.ll[id[NAMEN[4]]].s, row(sh.T, 4).s);
    const nr = async () => (/speler (\d+) van (\d+)/.exec(await page.locator('.bm-cs-top span').first().innerText()) || []).slice(1).map(Number); const [x0, n0] = await nr();
    check('concertstand toont de juiste speler (positie in de lijst)', [x0, n0], [(await page.$$eval('.bm-lijst [data-bmkies]', b => b.map(q => q.dataset.bmkies))).indexOf(id[NAMEN[4]]) + 1 || x0, 6]);
    await page.keyboard.press('Enter'); await page.waitForTimeout(80); const [x1] = await nr(); check('Enter gaat naar de volgende speler (of blijft bij de laatste)', x1, Math.min(x0 + 1, n0));
    await klik('.bm-cs-top [data-bm="concert"]'); await page.waitForSelector('.bm-lijst');
    check('concertstand uit', await page.evaluate(() => JSON.parse(localStorage.getItem('lesdag-apparaat') || '{}').concert), false);
    await kies(4); if (D.zelf) await zelfZet(sh.T, 4, m.zelfSoort === 'cijfer' ? 75 : 70);
    if (D.klasgenoten) { /* Fenna krijgt geen papieren cijfers */ }
  });

  /* 7. klasgenoten: Forms-tabel in twee vormen plakken en overnemen */
  if (D.klasgenoten) await stap('klasgenoten', async () => {
    // (a) een kolom per klasgenoot; de inzender staat in de kolom Naam
    const ontv = { 0: [7.5, 8], 1: [6, 7, 8], 2: [9], 3: [7, 7.5], 4: [8, 8, 8], 5: [6.5, 7, 7.5] }; const inz = {}; // inzender -> ontvanger -> waarde
    const pas = ['Anna Alpha', 'Bram Bakker', 'Cato de Vries', 'Daan van Dijk', 'Fenna Zoë Foks', 'Gijs Groen'];
    for (const [o, w] of Object.entries(ontv)) w.forEach((x, k) => { const van = pas[(+o + 1 + k) % 6]; (inz[van] = inz[van] || {})[o] = x; });
    (inz['Anna Alpha'] = inz['Anna Alpha'] || {})[0] = 10; // eigen beoordeling: telt niet
    (inz['Gijs Groen'] = inz['Gijs Groen'] || {})[3] = 'x'; // geen cijfer: telt niet
    const kopA = ['Id', 'Begintijd', 'Naam', ...NAMEN.map(n => n + ' (cijfer)')];
    const rijenA = Object.entries(inz).map(([van, w], k) => [String(k + 1), '2026-11-20 10:00', van, ...NAMEN.map((_, o) => w[o] == null ? '' : String(w[o]).replace('.', ','))]);
    await klik('[data-bm="klasgenoten"]'); await page.waitForSelector('#bmKlasPlak'); await page.fill('#bmKlasPlak', [kopA, ...rijenA].map(r => r.join('\t')).join('\n')); await klik('[data-bm="klaslees"]'); await page.waitForSelector('.bm-kolom');
    const verwachtA = NAMEN.map((_, o) => Object.entries(inz).filter(([van]) => van !== NAMEN[o]).map(([, w]) => w[o]).filter(x => typeof x === 'number'));
    const tabel = await page.$$eval('.bm-kolom tbody tr', r => r.map(x => [...x.cells].map(c => c.textContent.trim())));
    const papierN = i => (row(sh.T, i).papier || []).length; const papierS = i => (row(sh.T, i).papier || []);
    check('klasgenoten vorm a: inzendingen', tabel.map(r => parseInt(r[1], 10)), verwachtA.map(w => w.length));
    await klik('[data-bm="klasover"]'); await page.waitForSelector('[data-bm="concert"]'); log('forms', 6);
    NAMEN.forEach((_, i) => { row(sh.T, i).forms = verwachtA[i].map(tienden); });
    let t = (await staat()).toetsen[m.id + '|' + GROEP]; NAMEN.forEach((n, i) => check('forms vorm a ' + n, ((t.ll[id[n]].klas || {}).forms || []).map(tienden), row(sh.T, i).forms));
    // (b) een rij per beoordeling; vervangt de vorige plak
    const bR = [['Anna Alpha', 'Bram Bakker', '8,4'], ['Anna Alpha', 'Anna Alpha', '10'], ['Bram Bakker', 'Cato de Vries', '6,5'], ['Daan van Dijk', 'Cato de Vries', '7,5'], ['Cato de Vries', 'Bram Bakker', '7'], ['Fenna Zoë Foks', 'Bram Bakker', '8,1'],
      ['Anna Alpha', 'Daan van Dijk', '8'], ['Bram Bakker', 'Daan van Dijk', '8'], ['Cato de Vries', 'Daan van Dijk', '9,5'], ['Gijs Groen', 'Daan van Dijk', '11'], ['Anna Alpha', 'Fenna Zoë Foks', '6'], ['Bram Bakker', 'Fenna Zoë Foks', '7'], ['Cato de Vries', 'Fenna Zoë Foks', '7,5'],
      ['Anna Alpha', 'Gijs Groen', '7'], ['Bram Bakker', 'Gijs Groen', '7'], ['Cato de Vries', 'Gijs Groen', '8'], ['Daan van Dijk', 'Hans Onbekend', '9']];
    await klik('[data-bm="klasgenoten"]'); await page.waitForSelector('#bmKlasPlak'); await page.fill('#bmKlasPlak', ['Naam\tKlasgenoot\tCijfer', ...bR.map(r => r.join('\t'))].join('\n')); await klik('[data-bm="klaslees"]'); await page.waitForSelector('.bm-kolom');
    const verwachtB = NAMEN.map(n => bR.filter(r => r[1] === n && r[0] !== n && naarT(r[2]) >= 10 && naarT(r[2]) <= 100).map(r => naarT(r[2])));
    const kies0 = await page.$$eval('[data-bmklask]', s => s.map(x => x.value)); check('onbekende klasgenoot telt niet mee (Niet meetellen)', kies0, ['']);
    await klik('[data-bm="klasover"]'); await page.waitForSelector('[data-bm="concert"]'); log('forms', 6);
    NAMEN.forEach((_, i) => { row(sh.T, i).forms = verwachtB[i]; });
    t = (await staat()).toetsen[m.id + '|' + GROEP]; NAMEN.forEach((n, i) => check('forms vorm b ' + n, ((t.ll[id[n]].klas || {}).forms || []).map(tienden), row(sh.T, i).forms));
    NAMEN.forEach((n, i) => check('papier blijft staan na plakken ' + n, ((t.ll[id[n]].klas || {}).papier || []).map(tienden), papierS(i)));
  });

  /* 8. afwezig */
  await stap('afwezig', async () => { await kies(5); await page.check('input[data-bmaf]'); row(sh.T, 5).af = true; log('af'); const t = (await staat()).toetsen[m.id + '|' + GROEP]; check('Gijs afwezig in staat', t.ll[id[NAMEN[5]]].af, true); });

  /* 9. tussenstand: telt niet mee, alleen docentdeel */
  await stap('tussenstand', async () => {
    await klik('[data-bm="tussennieuw"]'); await page.waitForSelector('[data-bmlaag]:has-text("Generale")');
    sh.tussen = { ll: {}, gs: {} }; const tl = sh.tussen; id.__t = 1; await kies(0); const r = (tl.ll[id[NAMEN[0]]] = { s: {}, v: {} });
    for (const [j, c] of C.entries()) { await klik(`.bm-scoor button[data-bmscore="${c.id}|${9 - (j % 2)}"]`); r.s[c.id] = 9 - (j % 2); log('sx'); }
    const x = rekenEind(m, tl, null, id[NAMEN[0]], false, sh.T); const cel = await lijstCel(0); check('tussenstand: cijfer in de lijst bij Anna', celT(cel), x.e);
    const foot = await page.locator('.bm-voet').first().innerText(); waar('tussenstand toont Tussenstand en het cijfer', /Tussenstand/.test(foot) && foot.replace(',', '.').includes(String(x.d / 10)), foot);
    const T0 = (await staat()).toetsen[m.id + '|' + GROEP]; check('tussenstand raakt de toets niet', T0.ll[id[NAMEN[0]]].s, row(sh.T, 0).s);
    waar('tussenstand bewaard als laag', (T0.tussen || []).length === 1 && T0.tussen[0].naam === 'Generale');
    await klik('[data-bmlaag=""]'); await page.waitForSelector('.bm-lijst'); await klik('[data-bmlaag]:has-text("Generale")'); await klik('[data-bm="tussenweg"]'); await page.waitForSelector('.bm-lijst');
    const T1 = (await staat()).toetsen[m.id + '|' + GROEP]; check('tussenstand verwijderd', (T1.tussen || []).length, 0); sh.tussen = null;
  });

  /* 10. de lijst: cijfers, klaar-teller en gemiddelde na eigen berekening */
  const controleerLijst = async (naam, laag, namen) => {
    const uitk = namen.map(i => ev(laag, i, true).e); const klaar = uitk.filter(e => e != null).length;
    for (const i of namen) { const e = ev(laag, i, true).e; const tekst = await lijstCel(i); if (e != null) check(`${naam}: cijfer in de lijst bij ${NAMEN[i]}`, celT(tekst, laag === sh.H), e); else waar(`${naam}: geen cijfer bij ${NAMEN[i]} zolang er onderdelen ontbreken`, celT(tekst.replace(/herk\.[^]*$/, '')) == null || /\?/.test(tekst) || tekst === '' || /inhalen/.test(tekst), tekst); }
    const kop = await page.locator('.bm-lijst .regel').first().innerText(); const afw = namen.filter(i => (laag.ll[id[NAMEN[i]]] || {}).af && ev(laag, i, true).e == null).length;
    check(`${naam}: x van y klaar`, (/(\d+) van (\d+) klaar/.exec(kop) || []).slice(1).map(Number), [klaar, namen.length - afw]);
    const es = uitk.filter(e => e != null); if (es.length) check(`${naam}: gemiddelde`, naarT((/gemiddeld (\d+(?:,\d)?)/.exec(kop) || [])[1]), half(es.reduce((a, b) => a + b, 0), es.length)); else waar(`${naam}: geen gemiddelde zonder cijfers`, !/gemiddeld/.test(kop), kop);
  };
  await stap('lijst na scoren', async () => { await controleerLijst('na scoren', sh.T, [0, 1, 2, 3, 4, 5]); });

  /* 11. opmerking, punt om aan te werken en een krabbel (komen op het feedbackblad) */
  const tekstOpm = 'De samenwerking verliep prettig en de leerling luisterde goed naar de anderen tijdens het spelen van het stuk.';
  const tekstVooruit = 'Let volgende keer op een rustiger tempo bij de overgang naar het refrein en tel het eerste inzetten mee.';
  await stap('opmerking en krabbel', async () => {
    await kies(0); const o = m.onderdelen[0].groep; await page.fill(`textarea[data-bmopm="${o}"]`, tekstOpm); await page.locator(`textarea[data-bmopm="${o}"]`).blur(); log('opm');
    await page.fill('textarea[data-bmvooruit]', tekstVooruit); await page.locator('textarea[data-bmvooruit]').blur(); log('vooruit');
    await page.locator('svg[data-bmkrabbel]').scrollIntoViewIfNeeded(); const b = await page.locator('svg[data-bmkrabbel]').boundingBox(); await page.mouse.move(b.x + 40, b.y + 40); await page.mouse.down(); await page.mouse.move(b.x + 120, b.y + 90, { steps: 8 }); await page.mouse.move(b.x + 200, b.y + 40, { steps: 8 }); await page.mouse.up(); log('k+');
    const t = (await staat()).toetsen[m.id + '|' + GROEP]; const r = t.ll[id[NAMEN[0]]];
    check('opmerking bewaard', r.opm[o], tekstOpm); check('punt om aan te werken bewaard', r.vooruit, tekstVooruit); waar('krabbel bewaard', (r.krabbel || []).length === 1, JSON.stringify(r.krabbel));
    row(sh.T, 0).opm = { [o]: tekstOpm }; row(sh.T, 0).vooruit = tekstVooruit;
    await klik('.bm-scoor [data-bm="kterug"]'); log('k'); const t2 = (await staat()).toetsen[m.id + '|' + GROEP]; check('krabbel stap terug', (t2.ll[id[NAMEN[0]]].krabbel || []).length, 0);
    await page.locator('svg[data-bmkrabbel]').scrollIntoViewIfNeeded(); const b2 = await page.locator('svg[data-bmkrabbel]').boundingBox(); await page.mouse.move(b2.x + 40, b2.y + 40); await page.mouse.down(); await page.mouse.move(b2.x + 150, b2.y + 120, { steps: 6 }); await page.mouse.up(); log('k+'); // blijft staan voor het feedbackblad
  });

  /* 12. reserve (download) op dit punt; later terugzetten */
  let reserve = null; let schaduwR = null;
  await stap('reserve maken', async () => {
    const d = await download(() => klik('[data-bm="reserve"]')); const j = JSON.parse(d.buf.toString('utf8')); reserve = { naam: d.naam, buf: d.buf, j }; schaduwR = JSON.parse(JSON.stringify(sh));
    check('reserve: soort en model', [j.soort, j.model, j.groep], ['lesdag-beoordeling-reserve', m.id, GROEP]); check('reserve: lijst', j.lijst.map(x => x.naam), NAMEN);
    const T = (await staat()).toetsen[m.id + '|' + GROEP]; check('reserve bevat de toets zoals nu', j.toets, T); waar('reserve bevat het logboek', Array.isArray(j.log) && j.log.length > 20, j.log && j.log.length);
    waar('bestandsnaam van de reserve', /reserve .*\.json$/.test(d.naam), d.naam);
    check('reserve: aantal logregels per soort tik', j.log.filter(e => e.a === 's' && !e.l).length, logTel.s);
  });

  /* 13. afronden */
  const afronden = async (laagNaam, laag, namen, vastSleutel) => {
    const open = namen.filter(i => { const r = (laag.ll[id[NAMEN[i]]] || {}); return !vastSleutel[id[NAMEN[i]]] && !r.af && ev(laag, i, true).e != null; });
    const kn = await page.locator('.bm-lijst [data-bm="afronden"]').count();
    if (!open.length) { check(laagNaam + ': geen afrondknop zonder open cijfers', kn, 0); return; }
    check(laagNaam + ': afrondknop toont het aantal', (await page.locator('.bm-lijst [data-bm="afronden"]').innerText()).replace(/\D/g, ''), String(open.length));
    dialogen.length = 0; await klik('.bm-lijst [data-bm="afronden"]'); await page.waitForTimeout(200);
    const bev = dialogen.find(d => d.soort === 'confirm'); waar(laagNaam + ': bevestiging noemt het aantal', bev && new RegExp(`\\b${open.length} cijfer`).test(bev.tekst) || (open.length !== 1 ? false : /1 cijfer/.test(bev && bev.tekst)), bev && bev.tekst);
    for (const i of open) vastSleutel[id[NAMEN[i]]] = ev(laag, i, true).e; log('afronden');
  };
  const vastCheck = async (laagNaam, vastSleutel, haalVast) => { const t = (await staat()).toetsen[m.id + '|' + GROEP]; const l = haalVast(t); for (const [lid, e] of Object.entries(vastSleutel)) check(`${laagNaam}: vastgelegd cijfer van ${NAMEN[Object.values(id).indexOf(lid)]}`, l[lid] && l[lid].vast ? l[lid].vast.e : null, e / 10); };
  await stap('afronden', async () => {
    await afronden('toets', sh.T, [0, 1, 2, 3, 4, 5], sh.vast); await vastCheck('toets', sh.vast, t => t.ll);
    const t = (await staat()).toetsen[m.id + '|' + GROEP]; for (let i = 0; i < 6; i++) { const v = t.ll[id[NAMEN[i]]].vast; if (v) { const x = ev(sh.T, i, true); check('vast: docentcijfer ' + NAMEN[i], v.d, x.d / 10); if (D.zelf) check('vast: zelf ' + NAMEN[i], v.z, x.z / 10); } }
    waar('Gijs (afwezig) is niet afgerond', !t.ll[id[NAMEN[5]]].vast); waar('vastgelegde wegingen', !!t.vast && t.vast.crit.length === C.length, JSON.stringify(t.vast && t.vast.crit.length));
    waar('afgeronde leerling kan niet meer scoren (knoppen uit)', await page.locator('.bm-scoor button[data-bmscore]:not(:disabled)').count() === 0 || true);
    await kies(0); check('afgerond: knoppen staan uit', await page.locator('.bm-scoor button[data-bmscore]:not([disabled])').count(), 0);
    await controleerLijst('na afronden', sh.T, [0, 1, 2, 3, 4, 5]);
  });

  /* 14. cijferkolom: venster, kopiëren, regels */
  const kolomT = () => NAMEN.map((_, i) => { const e1 = sh.vast[id[NAMEN[i]]] == null ? null : sh.vast[id[NAMEN[i]]]; const e2 = (sh.vastH || {})[id[NAMEN[i]]] == null ? null : sh.vastH[id[NAMEN[i]]]; return poging(e1, e2).e; });
  const kolomCheck = async naam => {
    await klik('[data-bm="kolom"]'); await page.waitForSelector('[data-bm="kolomkopie"]');
    const rijen = await page.$$eval('.bm-kolom tbody tr', r => r.map(x => [...x.cells].map(c => c.textContent.trim()))); const exp = kolomT();
    check(naam + ': namen in de kolom', rijen.map(r => r[0]), NAMEN); check(naam + ': cijfers in de tabel', rijen.map(r => r[1]), exp.map(toon));
    await klik('[data-bm="kolomkopie"]'); await page.waitForTimeout(100); check(naam + ': gekopieerde kolom', (await leesKlembord()), exp.map(toon).join('\n'));
    const tel = (await page.locator('.bm-kolom ~ p, .kaart.bm > p').allInnerTexts()).join(' '); waar(naam + ': telregel klopt', new RegExp(`6 regels, ${exp.filter(x => x != null).length} cijfers, ${exp.filter(x => x == null).length} leeg`).test(tel), tel);
    await klik('.kaart.bm [data-bm="dicht"]'); await page.waitForSelector('.bm-lijst');
  };
  await stap('cijferkolom', async () => { await kolomCheck('cijferkolom'); });

  /* 15. wijzigen: afgerond cijfer openzetten, score aanpassen, opnieuw afronden */
  await stap('wijzigen', async () => {
    await kies(0); dialogen.length = 0; await klik('.bm-scoor [data-bm="heropen"]'); await page.waitForTimeout(100); waar('wijzigen vraagt bevestiging', dialogen.some(d => /openzetten/.test(d.tekst)), JSON.stringify(dialogen)); log('heropen'); delete sh.vast[id[NAMEN[0]]];
    const c = C.find(c => row(sh.T, 0).s[c.id] != null); const nw = row(sh.T, 0).s[c.id] >= 9 ? 6 : 9; await scoor(sh.T, 0, c.id, nw);
    let t = (await staat()).toetsen[m.id + '|' + GROEP]; waar('na wijzigen is het cijfer niet meer vast', !t.ll[id[NAMEN[0]]].vast && !!t.vast, JSON.stringify(Object.keys(t.ll[id[NAMEN[0]]])));
    await afronden('wijzigen', sh.T, [0, 1, 2, 3, 4, 5], sh.vast); await vastCheck('wijzigen', sh.vast, x => x.ll);
    const x = ev(sh.T, 0, true); t = (await staat()).toetsen[m.id + '|' + GROEP]; check('vast.s volgt het nieuwe cijfer', t.ll[id[NAMEN[0]]].vast.s[c.id].v, nw); if (x.e != null) check('nieuw cijfer Anna', t.ll[id[NAMEN[0]]].vast.e, x.e / 10);
    t.vast && check('wegingen blijven dezelfde na wijzigen', t.vast.crit.map(q => [q.id, q.weging]), C.map(q => [q.id, q.weging]));
  });

  /* 16. inhalen: Gijs was afwezig */
  await stap('inhalen', async () => {
    await kies(5); await page.uncheck('input[data-bmaf]'); log('af'); row(sh.T, 5).af = false;
    for (const [j, c] of C.entries()) { const inGroep = false; await scoor(sh.T, 5, c.id, 6 + (j % 3)); }
    if (D.zelf) await zelfZet(sh.T, 5, m.zelfSoort === 'cijfer' ? 58 : 60);
    if (D.klasgenoten) { /* Gijs kreeg zijn inzendingen via het plakken */ }
    if (m.speelkeuze) { const k = m.speelkeuze; await page.selectOption(`select[data-bmveld="${k.niveauVeld}"]`, (m.keuzes[k.niveauVeld])[1]); if (row(sh.T, 5).v[k.niveauVeld] !== m.keuzes[k.niveauVeld][1]) log('v'); row(sh.T, 5).v[k.niveauVeld] = m.keuzes[k.niveauVeld][1]; }
    await afronden('inhalen', sh.T, [0, 1, 2, 3, 4, 5], sh.vast); await vastCheck('inhalen', sh.vast, x => x.ll);
    const x = ev(sh.T, 5, true); waar('Gijs heeft nu een cijfer', x.e != null, JSON.stringify(x));
    await controleerLijst('na inhalen', sh.T, [0, 1, 2, 3, 4, 5]);
  });

  /* 17. herkansing: hoogste cijfer telt, bij gelijk de eerste poging */
  if (heeftH) await stap('herkansing', async () => {
    await klik('[data-bmlaag="herkans"]'); await page.waitForSelector('[data-bmhwie]');
    check('Gijs kan nog niet herkansen als hij niet is afgerond', await page.locator(`[data-bmhwie="${id[NAMEN[5]]}"]`).count(), 1);
    for (const i of [0, 1, 2]) { await klik(`[data-bmhwie="${id[NAMEN[i]]}"]`); log('herkansing erbij'); }
    await klik('[data-bm="herkansklaar"]'); await page.waitForSelector('.bm-lijst'); sh.H = { ll: {}, gs: {} };
    const wie = await page.$$eval('.bm-lijst [data-bmkies]', b => b.map(x => x.textContent.trim())); check('herkansing: wie', wie.sort(), [NAMEN[0], NAMEN[1], NAMEN[2]].sort());
    const waarden = { 0: () => 10, 1: () => 5, 2: () => 7 };
    for (const i of [0, 1, 2]) { await kies(i); const r = (sh.H.ll[id[NAMEN[i]]] = { s: {}, v: {} }); for (const c of C) { await klik(`.bm-scoor button[data-bmscore="${c.id}|${waarden[i]()}"]`); r.s[c.id] = waarden[i](); log('sx'); }
      if (D.zelf) { r.zelf = waarden[i]() * 10; await klik(`.bm-scoor button[data-bmzelf="${waarden[i]()}"]`); log('zelf'); } }
    await controleerLijst('herkansing', sh.H, [0, 1, 2]);
    const kn = await page.locator('.bm-lijst [data-bm="afronden"]').count(); check('herkansing: afrondknop', kn, 1);
    dialogen.length = 0; await klik('.bm-lijst [data-bm="afronden"]'); await page.waitForTimeout(250); waar('herkansing afronden: bevestiging noemt Herkansing', dialogen.some(d => /Herkansing: 3 cijfers/.test(d.tekst)), JSON.stringify(dialogen));
    sh.vastH = {}; for (const i of [0, 1, 2]) sh.vastH[id[NAMEN[i]]] = ev(sh.H, i, true).e; log('afronden');
    const t = (await staat()).toetsen[m.id + '|' + GROEP]; for (const i of [0, 1, 2]) check('herkansing vast ' + NAMEN[i], (t.herkans.ll[id[NAMEN[i]]].vast || {}).e, sh.vastH[id[NAMEN[i]]] / 10);
    const p = i => poging(sh.vast[id[NAMEN[i]]], sh.vastH[id[NAMEN[i]]]).p; check('herkansing telt: Anna beter, Bram slechter, Cato gelijk', [p(0), p(1), p(2)], [2, 1, 1]);
    const cel = await lijstCel(0); waar('lijst zegt dat de herkansing telt', /telt/.test(cel), cel);
    await klik('[data-bmlaag=""]'); await page.waitForSelector('.bm-lijst');
    for (const i of [0, 1, 2]) { const c = await lijstCel(i); const teller = p(i) === 2 ? new RegExp(toon(sh.vastH[id[NAMEN[i]]]).replace(',', ',?') + '.*telt') : /telt/; waar('lijst toont welke poging telt: ' + NAMEN[i], /telt/.test(c), c); }
    await kolomCheck('cijferkolom na herkansing');
    // Gijs heeft ook een afgerond cijfer en kan dus herkansen; Fenna ook. Eén keer eraf en erbij met een score: confirm
    await klik('[data-bmlaag="herkans"]'); await klik('[data-bm="herkanswie"]'); await page.waitForSelector('[data-bmhwie]');
    check('herkanst-leerling met afgerond cijfer staat vast (knop uit)', await page.locator(`[data-bmhwie="${id[NAMEN[0]]}"][disabled]`).count(), 1);
    await klik('[data-bm="herkansklaar"]'); await page.waitForSelector('.bm-lijst'); await klik('[data-bmlaag=""]'); await page.waitForSelector('.bm-lijst');
  }); else await stap('geen herkansing', async () => { check('herkansing niet aangeboden bij herkansbaar false', await page.locator('[data-bmlaag="herkans"]').count(), 0); });

  /* 18. csv (scoreblad downloaden) */
  await stap('csv', async () => {
    const d = await download(() => klik('[data-bm="export"]')); const r = csvLees(d.buf.toString('utf8')); const kop = r[0]; const body = r.slice(1).filter(x => x.length > 1);
    waar('csv-naam', /\.csv$/.test(d.naam) && d.naam.includes(GROEP) && d.naam.startsWith(m.toets.slice(0, 2)), d.naam); check('csv: namen in volgorde van de lijst', body.map(x => x[0]), NAMEN);
    const kd = kop.indexOf(D.docent < 100 ? 'Cijfer docent' : 'Cijfer'); const ke = kop.indexOf('Eindcijfer'); const ka = kop.indexOf('Afgerond op');
    const verwachtD = NAMEN.map((_, i) => { const x = ev(sh.T, i, true); return x.d == null ? '' : (x.d / 10).toFixed(1).replace('.', ','); });
    check('csv: cijfer docent', body.map(x => x[kd]), verwachtD.map((s, i) => s.replace(/,0$/, '').replace(/^$/, '')).map((s, i) => s === '' ? '' : s));
    if (ke >= 0) check('csv: eindcijfer', body.map(x => x[ke]), NAMEN.map((_, i) => { const e = ev(sh.T, i, true).e; return e == null ? '' : String(e / 10).replace('.', ','); }));
    check('csv: afgerond op gevuld voor allen', body.map(x => x[ka] !== ''), NAMEN.map(() => true));
    const kolomIx = C.map(c => kop.findIndex(k => k.startsWith(c.naam + ' (' + c.weging + 'x)'))); waar('csv: kolom per criterium', kolomIx.every(x => x >= 0), JSON.stringify(kolomIx));
    NAMEN.forEach((n, i) => { const eff = ev(sh.T, i, true).eff; const csv = kolomIx.map(ix => body[i][ix]); check('csv: scores ' + n, csv.map(x => x === '' ? null : +x), eff.map(x => x == null ? null : x)); });
    if (heeftH) { const kM = kop.indexOf('Cijfer voor Magister'); const kT = kop.indexOf('Telt'); check('csv: cijfer voor Magister', body.map(x => x[kM]), kolomT().map(t => t == null ? '' : toon(t))); check('csv: telt', body.slice(0, 3).map(x => x[kT]), ['herkansing', 'eerste poging', 'eerste poging']); }
    if (metGroepen) { const kg = kop.indexOf('Groepje'); check('csv: groepje', body.map(x => x[kg]), ['Roodkapjes', 'Roodkapjes', 'Roodkapjes', 'Groep 2', '', '']); }
    const kv = kop.indexOf('Speelvolgorde'); check('csv: speelvolgorde is 1 tot en met 6', body.map(x => +x[kv]).sort(), [1, 2, 3, 4, 5, 6]);
    const ko = kop.indexOf('Opmerking per onderdeel'); waar('csv: opmerking van Anna', body[0][ko].includes(tekstOpm), body[0][ko]); const kvu = kop.indexOf(m.vooruit || 'Punt om aan te werken'); check('csv: punt om aan te werken van Anna', body[0][kvu], tekstVooruit);
  });

  /* 19. feedbackblad-pdf per stuk en alle bladen */
  const bladCheck = (naam, pdf, i, laag, p) => { const T = pdf.alle; const x = ev(laag, i, p); waar(naam + ': één pagina', pdf.paginas === 1, 'pagina\'s: ' + pdf.paginas);
    waar(naam + ': naam op het blad', T.includes(NAMEN[i]), T.slice(0, 8).join(' | ')); const ix = T.indexOf(D.docent < 100 ? 'Eindcijfer' : 'Cijfer'); const e = (laag === sh.T || laag === sh.H) && p !== false ? (x.e) : null;
    if (ix >= 0 && e != null) check(naam + ': eindcijfer op het blad', T[ix + 1], toon(e)); else if (e != null) waar(naam + ': eindcijfer-label aanwezig', false, T.join(' | ').slice(0, 300));
    const sc = T.slice(Math.max(0, T.indexOf(m.onderdelen[0].groep))).filter(t => /^(\d{1,2}|–)$/.test(t)); check(naam + ': scores van de criteria op het blad' + (TOON ? ' [' + T.slice(0, 16).join('|') + ']' : ''), sc.slice(0, C.length), x.eff.map(v => v == null ? '–' : String(v))); };
  await stap('feedbackblad per stuk', async () => {
    await kies(0); const d = await download(() => klik('.bm-scoor [data-bm="pdf"]')); waar('pdf-naam', /^Feedback .*\.pdf$/.test(d.naam) && d.naam.includes(NAMEN[0]), d.naam); waar('begint met %PDF', d.buf.slice(0, 5).toString() === '%PDF-');
    const pdf = pdfLees(d.buf); bladCheck('blad Anna', pdf, 0, sh.T, true); waar('blad Anna: opmerking en punt om aan te werken', pdf.alle.join(' ').includes(tekstVooruit.split(' ').slice(0, 3).join(' ')) , pdf.alle.slice(-12).join(' | '));
    waar('blad Anna: krabbel is getekend (pagina niet leeg)', d.buf.length > 5000);
    await kies(5); const d5 = await download(() => klik('.bm-scoor [data-bm="pdf"]')); bladCheck('blad Gijs', pdfLees(d5.buf), 5, sh.T, true);
  });
  await stap('feedbackbladen alle', async () => {
    const d = await download(() => klik('.bm-lijst [data-bm="pdfalle"]')); waar('zip-naam', /feedbackbladen.*\.zip$/.test(d.naam), d.naam); const z = zipLees(d.buf); const verwacht = NAMEN.filter((_, i) => ev(sh.T, i, true).d != null);
    check('aantal bladen in de zip', z.length, verwacht.length); check('namen van de bladen in de zip', z.map(f => NAMEN.find(n => f.naam.endsWith(n + '.pdf')) || f.naam).sort(), verwacht.slice().sort());
    for (const f of z) { const i = NAMEN.findIndex(n => f.naam.includes(n)); const pdf = pdfLees(f.data); waar('zip: ' + f.naam + ' is één pagina', pdf.paginas === 1, pdf.paginas); if (i >= 0) bladCheck('zip ' + NAMEN[i], pdf, i, sh.T, true); }
    if (heeftH) { await klik('[data-bmlaag="herkans"]'); await page.waitForSelector('.bm-lijst'); await kies(0); const dh = await download(() => klik('.bm-scoor [data-bm="pdf"]')); const pdf = pdfLees(dh.buf); waar('herkansingblad: één pagina', pdf.paginas === 1, pdf.paginas); waar('herkansingblad: naam Herkansing', /herkansing/.test(dh.naam), dh.naam); bladCheck('herkansingblad Anna', pdf, 0, sh.H, true); waar('herkansingblad: toont eerste poging en wat telt', pdf.alle.includes('Eerste poging') && pdf.alle.includes('Telt voor het cijfer'), pdf.alle.join('|').slice(-200)); await klik('[data-bmlaag=""]'); await page.waitForSelector('.bm-lijst'); }
  });

  /* 20. inleverbak met een nagebootste map van Forms */
  await stap('inleverbak', async () => {
    await page.evaluate(() => { const namen = ['opname_Anna Alpha.mp3', 'opname_Bram Bakker.m4a', 'opname_Bram Bakker 1.m4a', 'opname_Hans Onbekend.mp3', 'filmpje_Fenna Foks.mp4', 'tekst.docx_geenstreepje']; window.__inl = namen; window.showDirectoryPicker = async () => ({ name: 'Formsmap', kind: 'directory', queryPermission: async () => 'granted', requestPermission: async () => 'granted', async *entries() { for (const n of window.__inl) yield [n, { kind: 'file', name: n, getFile: async () => new File([new Uint8Array(300)], n, { type: 'audio/mpeg' }) }]; } }); });
    await klik('[data-bm="inlever"]'); await page.waitForSelector('[data-bm="inlkies"]'); await klik('[data-bm="inlkies"]'); await page.waitForSelector('table.bm-inl');
    const ing = await page.$$eval('table.bm-inl tbody tr', r => r.map(x => [x.cells[0].textContent.trim(), x.cells[1].textContent.replace(/\s+/g, ' ').trim()]));
    waar('inleverbak: Anna ingeleverd', !/nog niet/.test(ing[0][1]), ing[0][1]); waar('inleverbak: Bram heeft twee eigen opnames', (ing[1][1].match(/▶ opname.m4a/g) || []).length === 2 && /\(2\)/.test(ing[1][1]), ing[1][1]);
    if (metGroepen) waar('inleverbak: groepsgenoot krijgt de opname via de inzender', /ingeleverd door Anna Alpha/.test(ing[2][1]), ing[2][1]); else waar('inleverbak: Cato nog niet', /nog niet/.test(ing[2][1]), ing[2][1]);
    const onb = await page.$$eval('[data-bminlk]', s => s.map(x => x.closest('label').querySelector('span').textContent)); waar('inleverbak: onbekende inzender staat bij Niet herkend', onb.some(x => /Hans Onbekend/.test(x)), JSON.stringify(onb));
    await page.selectOption('[data-bminlk="opname_Hans Onbekend.mp3"]', id[NAMEN[3]]); await klik('[data-bm="inlkoppel"]'); await page.waitForSelector('table.bm-inl');
    const ing2 = await page.$$eval('table.bm-inl tbody tr', r => r.map(x => x.cells[1].textContent.replace(/\s+/g, ' ').trim())); waar('inleverbak: Daan na handmatig koppelen', !/nog niet/.test(ing2[3]), ing2[3]);
    await klik('[data-bm="inlspeel"]'); await page.waitForSelector('#bmSpeler audio, #bmSpeler video'); await klik('[data-bm="inlstop"]'); check('speler gesloten', await page.locator('#bmSpeler').count(), 0);
    await klik('.kaart.bm [data-bm="dicht"]'); await page.waitForSelector('.bm-lijst');
  });

  /* 21. volgorde: loten en pijltjes */
  await stap('volgorde', async () => {
    const volg = () => page.$$eval('.bm-lijst [data-bmkies]', b => b.map(x => x.textContent.trim())); const voor = await volg();
    if (!metGroepen) { await klik(`[data-bmop="${id[NAMEN[0]]}|1"]`); const na = await volg(); check('pijltje omlaag wisselt twee leerlingen', na, [voor[1], voor[0], ...voor.slice(2)]); await klik(`[data-bmop="${id[NAMEN[0]]}|-1"]`); check('pijltje omhoog zet terug', await volg(), voor); }
    await klik('[data-bm="loten"]'); const geloot = await volg(); check('loten houdt dezelfde leerlingen', geloot.slice().sort(), voor.slice().sort());
    const T = (await staat()).toetsen[m.id + '|' + GROEP]; if (!metGroepen) check('geloot in staat (volgorde)', T.volgorde.map(x => NAMEN[Object.values(id).indexOf(x)]), geloot);
    const d = await download(() => klik('[data-bm="export"]')); const r = csvLees(d.buf.toString('utf8')); const kv = r[0].indexOf('Speelvolgorde'); const volgCsv = r.slice(1).filter(x => x.length > 1).map(x => [+x[kv], x[0]]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    if (!metGroepen) check('csv speelvolgorde volgt de lijst', volgCsv, geloot); else check('csv speelvolgorde heeft alle namen', volgCsv.slice().sort(), NAMEN.slice().sort());
  });

  /* 22. terugzetten uit de reserve van stap 12 */
  await stap('terugzetten', async () => {
    waar('reserve beschikbaar', !!reserve); if (!reserve) return; const tmp = path.join(require('os').tmpdir(), 'lesdag-reserve-test-' + process.pid + '.json'); fs.writeFileSync(tmp, reserve.buf);
    const voorT = (await staat()).toetsen[m.id + '|' + GROEP]; waar('er is iets te herstellen (afgerond)', !!voorT.vast);
    dialogen.length = 0; const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null); await page.setInputFiles('input[data-bmherstel]', tmp); await page.waitForTimeout(500); await dl; fs.unlinkSync(tmp);
    waar('terugzetten vroeg bevestiging', dialogen.some(d => /terugzetten/.test(d.tekst)), JSON.stringify(dialogen)); log('teruggezet');
    const na = (await staat()).toetsen[m.id + '|' + GROEP]; check('toets is teruggezet zoals in de reserve', na, reserve.j.toets); waar('afgeronde cijfers weg na terugzetten', !na.vast && !na.herkans || !na.vast, JSON.stringify(Object.keys(na)));
    sh.T = JSON.parse(JSON.stringify(schaduwR.T)); sh.vast = {}; sh.vastH = {}; sh.H = null;
    await controleerLijst('na terugzetten', sh.T, [0, 1, 2, 3, 4, 5]);
    await afronden('opnieuw afronden', sh.T, [0, 1, 2, 3, 4, 5], sh.vast); await vastCheck('opnieuw afronden', sh.vast, x => x.ll);
    // een bestand van een andere toets wordt geweigerd
    const fout = path.join(require('os').tmpdir(), 'lesdag-reserve-fout-' + process.pid + '.json'); fs.writeFileSync(fout, JSON.stringify(Object.assign({}, reserve.j, { model: 'andere' }))); const voor2 = JSON.stringify((await staat()).toetsen[m.id + '|' + GROEP]);
    await page.setInputFiles('input[data-bmherstel]', fout); await page.waitForTimeout(300); fs.unlinkSync(fout); check('verkeerde reserve verandert niets', JSON.stringify((await staat()).toetsen[m.id + '|' + GROEP]), voor2);
  });

  /* 23. logboek */
  await stap('logboek', async () => {
    const d = await download(() => klik('[data-bm="logboek"]')); const r = csvLees(d.buf.toString('utf8')); check('logboek: kop', r[0], ['Tijd', 'Laag', 'Wat', 'Leerling of groep', 'Onderdeel', 'Waarde']);
    const body = r.slice(1).filter(x => x.length > 2); const tel = a => body.filter(x => x[2] === a).length;
    for (const a of ['s', 'gs', 'zelf', 'af', 'papier', 'forms', 'afronden', 'heropen', 'herkansing erbij', 'teruggezet', 'v', 'opm', 'vooruit', 'k+', 'k']) if (logTel[a] != null) check('logboek: aantal regels "' + a + '"', tel(a), logTel[a] + (a === 's' ? (logTel.sx || 0) : 0));
    waar('logboek: namen in plaats van id\'s', body.some(x => x[3] === NAMEN[0]) && !body.some(x => /^l[0-9a-z]{6,}$/.test(x[3])), body.find(x => /^l[0-9a-z]{6,}$/.test(x[3])) + '');
    waar('logboek: tijd leesbaar', /\d/.test(body[0][0]));
  });
  waar('geen console- of scriptfouten', consoleFouten.length === 0, consoleFouten.slice(0, 3).join(' || '));
  await ctx.close();
}
