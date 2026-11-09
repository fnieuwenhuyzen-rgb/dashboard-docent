// node tools/test-planning.js [--poort=8750]
// Plaatst de planning elke toets op zijn datum uit basis.json? Opent Lesdag headless met een verzonnen rooster (geen echte gegevens) en loopt alle toetsen
// in alle klassen langs via window.LESDAG_TEST (ankersVan, dagItems, ruimte, jaarToetsen, agendaItems). Data-kant: tools/test-toetsdatum.js.
// Exitcode 0 = goed, 1 = fouten, 2 = overgeslagen (geen Playwright of geen browser). Playwright via NODE_PATH, zie tools/TESTEN.md.
const cp = require('child_process'), net = require('net'), path = require('path'), fs = require('fs');
const arg = (n, d) => { const a = process.argv.slice(2).find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
let pw; try { pw = require('playwright-core'); } catch (e) { try { pw = require('playwright'); } catch (e2) { console.log('OVERGESLAGEN: Playwright niet gevonden (zet NODE_PATH, zie tools/TESTEN.md).'); process.exit(2); } }
const B = require(path.join(__dirname, '..', 'public', 'data', 'basis.json'));
const OPEN = new Set(['vwo6:T10']); // basis.json spreekt zichzelf tegen (zie test-toetsdatum.js): de app laat de lesweek uit de leergang staan, Frans kiest
const DAGNR = { ma: 1, di: 2, wo: 3, do: 4, vr: 5 };
const vrijePoort = () => new Promise(r => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const bladeren = [process.env.LESDAG_BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);

// verzonnen rooster: per leergang een groep "x-<leergang>" met zijn lesdagen uit de meta (vwo 6 heeft er geen: ma, di, wo)
const groepLeergang = {}, rooster = [];
for (const [lg, L] of Object.entries(B.leergangen)) {
  const g = 'x' + lg; groepLeergang[g] = lg; const n = L.meta.lessenPerWeek; const dagen = (L.meta.lesdagen || ['ma', 'di', 'wo', 'do', 'vr']).slice(0, n); const tel = {};
  dagen.forEach((d, i) => { tel[d] = (tel[d] || 0) + 1; const m = 510 + (tel[d] - 1) * 60 + i * 5; const t = x => Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0');
    rooster.push({ id: g + i, dag: DAGNR[d], start: t(m), eind: t(m + 45), groep: g, lokaal: '009' }); });
}
// scenario PT1/P9: vwo 4 en vwo 5 met de lessen tot nu gegeven, ma 9-11 en wo 11-11 vervallen (themadag); tv4 = vwo 4 ma+wo, tv5 = vwo 5 ma, ma, do
const uur = (id, dag, s, e, g) => ({ id, dag, start: s, eind: e, groep: g, lokaal: '009' });
const SC_ROOSTER = [uur('a', 1, '8:30', '9:15', 'tv4'), uur('b', 3, '8:30', '9:15', 'tv4'), uur('c', 1, '13:40', '14:25', 'tv5'), uur('d', 1, '15:25', '16:10', 'tv5'), uur('e', 4, '10:15', '11:00', 'tv5')];
const gegeven = (lg, totWeek, behalve) => { const o = {}; for (const w of B.leergangen[lg].weken) if (w.w <= totWeek) for (const i of [1, 2, 3]) { const l = w['l' + i]; const id = `${lg}:${w.w}.${i}`; if (l && l.type !== 'uitval' && l.type !== 'toetsweek' && id !== behalve) o[id] = { st: 'gegeven', d: '2026-10-26', uur: 'x' }; } return o; };
const SC_STAAT = { v: 1, rooster: SC_ROOSTER, groepLeergang: { tv4: 'vwo4', tv5: 'vwo5' }, magVanaf: '2026-08-01', voortgang: { tv4: gegeven('vwo4', 8, 'vwo4:8.2'), tv5: gegeven('vwo5', 7) }, uitval: { '2026-11-09': ['a', 'c', 'd'], '2026-11-11': ['b'] }, beoord: { toetsen: {}, lijsten: {} } };
const ALLE_STAAT = { v: 1, rooster, groepLeergang, magVanaf: '2026-08-01', beoord: { toetsen: {}, lijsten: {} } };

(async () => {
  const poort = +arg('poort', 0) || await vrijePoort();
  const server = cp.spawn(process.execPath, [path.join(__dirname, 'serve-lokaal.js'), path.join(__dirname, '..', 'public'), String(poort)], { stdio: 'ignore' });
  let browser;
  try { const exe = bladeren.find(p => fs.existsSync(p)); try { browser = await pw.chromium.launch(exe ? { executablePath: exe } : {}); } catch (e) { browser = await pw.chromium.launch({ channel: 'msedge' }); } }
  catch (e) { server.kill(); console.log('OVERGESLAGEN: geen browser gevonden'); process.exit(2); }
  await new Promise(r => setTimeout(r, 400));
  const fouten = []; let gemeten = 0; const toon = process.argv.includes('--toon');
  const sessie = async (staat, nu, hash, fn) => {
    const ctx = await browser.newContext({ timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block' });
    await ctx.route(u => !u.href.startsWith('http://localhost:' + poort), r => r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
    await ctx.route(u => u.pathname.startsWith('/api/'), r => r.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
    await ctx.addInitScript(s => { try { localStorage.setItem('lesdag-staat', JSON.stringify(s)); } catch (e) {} }, staat);
    const page = await ctx.newPage(); await page.clock.setFixedTime(new Date(nu));
    page.on('pageerror', e => fouten.push('uitzondering: ' + String(e.message).slice(0, 200)));
    await page.goto(`http://localhost:${poort}/#${hash}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.LESDAG_TEST && document.querySelector('#main') && !/Lesdag laden/.test(document.querySelector('#main').textContent), null, { timeout: 8000 }).catch(() => fouten.push('Lesdag laadde niet'));
    try { return await fn(page); } finally { await ctx.close(); }
  };
  const klopt = (ok, tekst) => { gemeten++; if (!ok) fouten.push(tekst); };

  // 1. alle toetsen in alle klassen, ruim vóór alle toetsen (1-9-2026)
  const alle = await sessie(ALLE_STAAT, '2026-09-01T12:00:00+02:00', 'nu', p => p.evaluate(([B, ONDERBOUW]) => {
    const T = window.LESDAG_TEST; const uit = [];
    for (const [lg, L] of Object.entries(B.leergangen)) { const g = 'x' + lg;
      const jt = T.jaarToetsen(g);
      for (const a of T.ankersVan(g)) uit.push({ soort: 'anker', lg, id: a.id, toets: a.t.id, datum: a.t.datum || null, plekW: a.plek.w, itemW: a.item.w, opDatum: a.opDatum, vast: a.vast, slotS: a.slot && a.slot.s, slotW: a.slot && a.slot.w, gemist: T.ankersGemist(g).some(x => x.id === a.id) });
      for (const t of L.toetsen || []) { const o = jt.find(x => x.t.id === t.id); uit.push({ soort: 'jaar', lg, toets: t.id, datum: t.datum || null, w: o ? o.w : null }); } }
    return uit; }, [B, null]));
  const wkVan = s => (B.kalender.weken.find(k => s >= k.datum && s < new Date(new Date(k.datum + 'T12:00:00').getTime() + 7 * 864e5).toISOString().slice(0, 10)) || {}).w;
  const ONDERBOUW = /^(bb1|havo3|vwo3|kmu3)$/;
  for (const r of alle) {
    if (r.soort === 'anker') {
      if (r.vast && !ONDERBOUW.test(r.lg) && r.datum && r.slotS && !OPEN.has(r.lg + ':' + r.toets)) klopt(r.slotW === wkVan(r.datum), `${r.lg} ${r.toets} (${r.id}): staat op ${r.slotS} in lesweek ${r.slotW}, de datum ${r.datum} is lesweek ${wkVan(r.datum)}`);
      if (r.vast && !r.slotS && !ONDERBOUW.test(r.lg)) klopt(false, `${r.lg} ${r.toets} (${r.id}): geen lesuur gevonden`);
      if (r.opDatum && r.slotS) klopt(r.slotS === r.datum || wkVan(r.slotS) === wkVan(r.datum), `${r.lg} ${r.toets}: op datum geplaatst maar ${r.slotS}`);
      if (r.gemist) klopt(false, `${r.lg} ${r.toets} (${r.id}): staat als gemist terwijl niets voorbij is`);
    } else if (r.datum && r.w != null && !OPEN.has(r.lg + ':' + r.toets)) klopt(r.w === wkVan(r.datum), `Jaar ${r.lg} ${r.toets}: lesweek ${r.w}, de datum ${r.datum} is lesweek ${wkVan(r.datum)}`);
    else if (r.w == null) klopt(false, `Jaar ${r.lg} ${r.toets}: komt niet voor in jaarToetsen`);
  }
  if (toon) console.log(`${alle.filter(r => r.soort === 'anker').length} ankers en ${alle.filter(r => r.soort === 'jaar').length} toetsen langsgelopen`);

  // 2. scenario PT1 vwo 4 en P9 vwo 5 op ma 23-11, vanaf 8-11
  const sc = await sessie(SC_STAAT, '2026-11-08T12:00:00+01:00', 'jaar/tv4', async p => {
    const r = await p.evaluate(() => { const T = window.LESDAG_TEST; const P = T.planning('2026-11-09', '2026-11-27'); const dagen = {};
      for (const s of Object.keys(P).sort()) dagen[s] = T.dagItems(s, P[s]).items.filter(i => i.soort === 'les' || i.soort === 'uitval' || i.soort === 'toets').map(i => i.sub || '');
      const ag = T.agendaItems().filter(x => x.d === '2026-11-23').map(x => x.titel);
      return { dagen, ag, r4: T.ruimte('tv4').map(d => ({ id: d.id, s: d.s, nog: d.nog.map(x => T.les(x).titel), tekort: d.tekort })), r5: T.ruimte('tv5').map(d => ({ id: d.id, s: d.s })), gemist: ['tv4', 'tv5'].flatMap(g => T.ankersGemist(g).map(a => a.id)),
        jaar4: T.jaarToetsen('tv4').filter(o => o.t.id === 'PT1').map(o => o.w), jaar5: T.jaarToetsen('tv5').filter(o => o.t.id === 'P9').map(o => o.w) }; });
    await p.waitForTimeout(150); r.klasblad = await p.evaluate(() => document.querySelector('#main').innerText);
    return r; });
  const dag = s => sc.dagen[s] || [];
  klopt(dag('2026-11-23').filter(t => /^Praktijktoets 1/.test(t)).length === 1, 'ma 23-11: PT1 vwo 4 staat niet op die dag');
  klopt(dag('2026-11-23').filter(t => /^Praktijktoets P9/.test(t)).length === 2, 'ma 23-11: P9 en P9 vervolg (vwo 5) staan niet allebei op die dag');
  for (const s of Object.keys(sc.dagen)) if (s < '2026-11-23') klopt(!dag(s).some(t => /^Praktijktoets (1|P9)/.test(t)), `${s}: PT1 of P9 staat te vroeg`);
  klopt(!sc.ag.length || sc.ag.some(t => /Praktijktoets 1/.test(t)) && sc.ag.some(t => /Praktijktoets P9/.test(t)), 'agendafeed 23-11: toetsen ontbreken: ' + sc.ag.join(' / '));
  klopt(sc.ag.length >= 3, 'agendafeed 23-11: minder dan 3 punten: ' + sc.ag.join(' / '));
  klopt(sc.r4[0] && sc.r4[0].s === '2026-11-23', 'tekortberekening vwo 4: eerste toets niet op 23-11: ' + JSON.stringify(sc.r4[0]));
  klopt(sc.r5[0] && sc.r5[0].s === '2026-11-23', 'tekortberekening vwo 5: eerste toets niet op 23-11: ' + JSON.stringify(sc.r5[0]));
  klopt(sc.r4[0] && sc.r4[0].nog.some(t => /Generale PT1/.test(t)), 'tekortberekening vwo 4: de generale telt niet mee voor PT1');
  klopt(sc.r4[0] && sc.r4[0].tekort === 0, 'tekortberekening vwo 4: onterecht een tekort: ' + JSON.stringify(sc.r4[0]));
  klopt(!sc.gemist.length, 'toets staat als gemist: ' + sc.gemist.join(', '));
  klopt(sc.jaar4[0] === 12 && sc.jaar5[0] === 12, `Jaar: PT1 in lesweek ${sc.jaar4[0]}, P9 in lesweek ${sc.jaar5[0]} (moet 12 zijn)`);
  klopt(/23 nov/.test(sc.klasblad), 'klasblad vwo 4 toont 23 nov niet');
  // de lessen eromheen: improvisatie en generale vóór PT1, generale als laatste les ervoor, geen les van na de toets ertussen
  const v4 = Object.keys(sc.dagen).filter(s => s <= '2026-11-23').flatMap(s => dag(s).filter(t => /^(Improviseren|Generale|Praktijktoets 1|Wat is pop)/.test(t)).map(t => s + ' ' + t.split('|')[0]));
  const iPT1 = v4.findIndex(t => /Praktijktoets 1/.test(t));
  klopt(iPT1 > 0 && /Generale PT1/.test(v4[iPT1 - 1]), 'vwo 4: de generale is niet de les vlak voor PT1: ' + v4.join(' / '));
  klopt(!v4.slice(0, iPT1).some(t => /Wat is pop/.test(t)), 'vwo 4: een les van na PT1 staat ervoor: ' + v4.join(' / '));
  if (toon) console.log(JSON.stringify(sc.dagen, null, 1), v4);

  await browser.close(); server.kill();
  if (fouten.length) { console.log(`test-planning: ${fouten.length} fouten (van ${gemeten} controles)\n  ` + fouten.slice(0, 40).join('\n  ')); process.exit(1); }
  console.log(`test-planning: ${gemeten} controles, alles goed`);
})();
