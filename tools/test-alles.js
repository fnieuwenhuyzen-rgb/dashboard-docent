// node tools/test-alles.js [--snel] [--zonder-browser] [--tegen=<ref>]
// Draait alle tests van Lesdag en geeft een korte samenvatting. Exitcode 0 = alles goed (of alleen overgeslagen), 1 = iets faalt.
//   --snel            schermtest met 3 tijden in plaats van 7 (±15 s in plaats van ±35 s)
//   --zonder-browser  schermtest overslaan (CI zonder browser)
//   --tegen=<ref>     gegevensvergelijking met die ref in plaats van HEAD
// Schermtest vraagt Playwright via NODE_PATH, zie tools/TESTEN.md.
const cp = require('child_process'), path = require('path');
const a = process.argv.slice(2); const root = path.join(__dirname, '..');
const tegen = a.find(x => x.startsWith('--tegen=')); const t = f => path.join(__dirname, f);
const STAPPEN = [
  ['Bestanden en scripts', 'test-bestanden.js', []],
  ['Gegevens (basis, beoordeling, leergang)', 'controleer-gegevens.js', tegen ? [tegen] : []],
  ['Rekenregels beoordeling', 'beoordeling/test-reken.js', []],
  ['Lesklok', 'test-lesklok.js', []],
  ['Agendafeed', 'test-agendafeed.js', []],
  ['Synchroniseren (samenvoegen)', 'test-sync.js', []],
  ['Gegevensversies (migratie)', 'test-staten.js', a.includes('--zonder-browser') ? ['--zonder-browser'] : []],
  ['Foutlogboek', 'test-logboek.js', a.includes('--zonder-browser') ? ['--zonder-browser'] : []],
  ['Nieuwe versie (service worker)', 'test-nieuwe-versie.js', []],
  ['Schermen (headless)', 'test-schermen.js', a.includes('--snel') ? ['--snel'] : []],
];
const uitslag = []; const t0 = Date.now();
for (const [naam, f, extra] of STAPPEN) {
  if (['test-schermen.js', 'test-nieuwe-versie.js', 'test-autokopie.js'].includes(f) && a.includes('--zonder-browser')) { uitslag.push([naam, 'overgeslagen', 0, '(--zonder-browser)']); continue; }
  const s = Date.now(); const r = cp.spawnSync(process.execPath, [t(f), ...extra], { cwd: root, encoding: 'utf8', env: process.env, maxBuffer: 1 << 26 });
  const uit = ((r.stdout || '') + (r.stderr || '')).trim(); const sec = (Date.now() - s) / 1000;
  const st = r.status === 0 ? 'goed' : r.status === 2 ? 'overgeslagen' : 'FAALT';
  uitslag.push([naam, st, sec, uit]);
  if (st === 'FAALT') console.log('\n--- ' + naam + ' ---\n' + uit.split('\n').slice(0, 40).join('\n') + '\n');
  else if (st === 'overgeslagen') console.log('\n--- ' + naam + ' ---\n' + uit.split('\n')[0] + '\n');
}
console.log('\nSamenvatting');
for (const [n, s, sec] of uitslag) console.log('  ' + (s === 'goed' ? 'ok        ' : s === 'FAALT' ? 'FAALT     ' : 'overslag  ') + n.padEnd(42) + (sec ? sec.toFixed(1) + ' s' : ''));
const faal = uitslag.filter(u => u[1] === 'FAALT').length, over = uitslag.filter(u => u[1] === 'overgeslagen').length;
console.log(`\n${faal ? faal + ' onderdeel faalt' : 'Alles goed'}${over ? ' (' + over + ' overgeslagen)' : ''}, ${((Date.now() - t0) / 1000).toFixed(0)} s.`);
process.exit(faal ? 1 : 0);
