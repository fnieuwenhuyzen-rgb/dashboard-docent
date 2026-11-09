// Gedeeld door de robuustheidstests (test-staten, test-logboek, test-nieuwe-versie, test-autokopie): een eigen server en een browser.
// Playwright staat niet in de repo (zie TESTEN.md); zonder Playwright of browser geven de tests exitcode 2 (overgeslagen).
const cp = require('child_process'), net = require('net'), path = require('path'), fs = require('fs');
let pw; try { pw = require('playwright-core'); } catch (e) { try { pw = require('playwright'); } catch (e2) { pw = null; } }
const vrijePoort = () => new Promise(r => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const bladeren = [process.env.LESDAG_BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
async function start(map, poort) {
  if (!pw) { console.log('OVERGESLAGEN: Playwright niet gevonden (zet NODE_PATH, zie tools/TESTEN.md).'); process.exit(2); }
  poort = poort || await vrijePoort();
  const server = cp.spawn(process.execPath, [path.join(__dirname, 'serve-lokaal.js'), path.resolve(map || path.join(__dirname, '..', 'public')), String(poort)], { stdio: 'ignore' });
  let browser;
  try { const exe = bladeren.find(p => fs.existsSync(p)); try { browser = await pw.chromium.launch(exe ? { executablePath: exe } : {}); } catch (e) { browser = await pw.chromium.launch({ channel: 'msedge' }); } }
  catch (e) { server.kill(); console.log('OVERGESLAGEN: geen browser gevonden (' + String(e.message).split('\n')[0] + ')'); process.exit(2); }
  await new Promise(r => setTimeout(r, 400));
  return { poort, basis: 'http://localhost:' + poort + '/', server, browser, stop: async () => { await browser.close().catch(() => {}); server.kill(); } };
}
// externe verwijzingen (lettertypen, Microsoft) blokkeren we; /api/ geeft 404
async function sluis(ctx, basis) {
  await ctx.route(u => !u.href.startsWith(basis), r => r.fulfill({ status: 200, contentType: r.request().resourceType() === 'stylesheet' ? 'text/css' : 'text/plain', body: '' }));
  await ctx.route(u => u.pathname.startsWith('/api/'), r => r.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
}
const wacht = (page, ms = 8000) => page.waitForFunction(() => document.querySelector('#main') && !/Lesdag laden/.test(document.querySelector('#main').textContent), null, { timeout: ms });
// verzonnen rooster en leerlingen, zelfde vorm als test-schermen.js
const uur = (id, dag, start, eind, groep, lokaal) => ({ id, dag, start, eind, groep, lokaal: lokaal || '009' });
const STAAT = { v: 1, rooster: [uur('t1', 1, '8:30', '9:15', 'tv4'), uur('t2', 1, '9:15', '10:00', 'tv4'), uur('t3', 1, '10:15', '11:00', 'tb1'), uur('t5', 2, '8:30', '9:15', 'th3'), uur('t6', 2, '9:15', '10:00', 'tm4')],
  groepLeergang: { tv4: 'vwo4', tv5: 'vwo5', th3: 'havo3', tb1: 'bb1', tm4: 'mavo4' }, magVanaf: '2026-08-01',
  beoord: { toetsen: {}, lijsten: { tb1: [{ id: 'l1', naam: 'Testleerling, Anna' }, { id: 'l2', naam: 'Testleerling, Bram' }] } } };
module.exports = { start, sluis, wacht, STAAT, vrijePoort, pw };
