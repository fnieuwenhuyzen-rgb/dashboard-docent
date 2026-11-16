// CSP afgedwongen: opent Lesdag met de policy uit public/_headers als echte Content-Security-Policy (niet Report-Only)
// en meldt elke overtreding, op de hoofdschermen, in de lesmodus en bij het maken van een PowerPoint (pptxgen gebruikt Function()).
// De lokale server kent _headers niet; de test zet de kop zelf. Draaien: node tools/test-csp.js (NODE_PATH zoals in TESTEN.md)
const fs = require('fs'), path = require('path'); const H = require('./test-hulp');
const kop = fs.readFileSync(path.join(__dirname, '..', 'public', '_headers'), 'utf8').match(/Content-Security-Policy(?:-Report-Only)?:\s*(.+)/)[1].trim();
(async () => {
  const S = await H.start(); const ctx = await S.browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.route(u => u.href.startsWith(S.basis) && !u.pathname.startsWith('/api/'), async r => { const a = await r.fetch(); r.fulfill({ response: a, headers: Object.assign({}, a.headers(), { 'content-security-policy': kop }) }); });
  await ctx.route(u => u.pathname.startsWith('/api/'), r => r.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  await ctx.route(u => !u.href.startsWith(S.basis), r => r.fulfill({ status: 200, contentType: r.request().resourceType() === 'stylesheet' ? 'text/css' : 'text/plain', body: '' }));
  await ctx.addInitScript(st => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sourceFile || '') + ':' + (e.lineNumber || ''))); try { if (!localStorage.getItem('lesdag-staat')) localStorage.setItem('lesdag-staat', JSON.stringify(st)); } catch (e) {} }, H.STAAT);
  const page = await ctx.newPage(); const fouten = []; page.on('pageerror', e => fouten.push('paginafout: ' + e.message));
  const melding = async waar => { const v = await page.evaluate(() => window.__csp.splice(0)); v.forEach(x => fouten.push(waar + ': ' + x)); };
  for (const sch of ['#nu', '#dag', '#week', '#jaar', '#beoordelen', '#rooster', '#sectie', '#reclame', '#instellingen']) {
    await page.goto(S.basis + sch, { waitUntil: 'load' }); await H.wacht(page).catch(() => fouten.push(sch + ': laadt niet')); await page.waitForTimeout(300); await melding(sch);
  }
  // een les in de lesmodus
  await page.goto(S.basis + '#dag', { waitUntil: 'load' }); await H.wacht(page).catch(() => {});
  const les = await page.$('[data-geefles],[data-lesmodus],[data-startles]'); if (les) { await les.click().catch(() => {}); await page.waitForTimeout(500); } await melding('lesmodus');
  // PowerPoint maken (Reclame, staande dia)
  const pp = await page.evaluate(async () => { try { if (!window.PptxGenJS) await new Promise((ok, fout) => { const s = document.createElement('script'); s.src = 'vendor/pptxgen.bundle.js'; s.onload = ok; s.onerror = () => fout(new Error('niet geladen')); document.head.appendChild(s); }); const c = document.createElement('canvas'); c.width = c.height = 20; const p = new window.PptxGenJS(); p.defineLayout({ name: 'STAAND', width: 7.5, height: 13.333 }); p.layout = 'STAAND'; const d = p.addSlide(); d.addImage({ data: c.toDataURL('image/png'), x: 0, y: 0, w: 7.5, h: 13.333 }); d.addNotes('proef'); const b = await p.write({ outputType: 'blob' }); return b && b.size > 1000 ? 'ok' : 'leeg'; } catch (e) { return 'fout: ' + e.message; } }); // zoals RECLAME.pptx
  if (pp !== 'ok') fouten.push('PowerPoint: ' + pp); await melding('PowerPoint');
  await S.stop();
  if (fouten.length) { console.log('CSP: ' + fouten.length + ' melding(en)\n' + [...new Set(fouten)].slice(0, 20).join('\n')); process.exit(1); }
  console.log('CSP afgedwongen: geen overtredingen (9 schermen, lesmodus, PowerPoint)');
})().catch(e => { console.log('FOUT ' + e.message); process.exit(1); });
