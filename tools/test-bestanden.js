// node tools/test-bestanden.js: de app zelf is heel: syntaxis van elk script in public/, verwijzingen in index.html,
// en de bestandenlijst van de service worker (een ontbrekend bestand daarin laat de installatie van de offline-versie falen).
const fs = require('fs'), path = require('path'), cp = require('child_process');
const pub = path.join(__dirname, '..', 'public'); let fouten = 0, n = 0;
const slecht = t => { console.log('  FOUT ' + t); fouten++; };
const loop = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? loop(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of loop(pub).filter(f => /\.js$/.test(f) && !/[\/]vendor[\/]/.test(f))) {
  n++; const r = cp.spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status) slecht('syntaxfout in ' + path.relative(pub, f) + ': ' + (r.stderr.split('\n').find(l => /Error/.test(l)) || '').trim());
}
const bestaat = r => fs.existsSync(path.join(pub, r.split('?')[0].replace(/^\.\//, '')));
const html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
for (const m of html.matchAll(/(?:src|href)="([^":#]+)"/g)) { n++; if (!bestaat(m[1])) slecht('index.html verwijst naar ontbrekend bestand: ' + m[1]); }
const sw = fs.readFileSync(path.join(pub, 'sw.js'), 'utf8'); const shell = (sw.match(/const SHELL = \[([\s\S]*?)\];/) || [])[1];
if (!shell) slecht('SHELL-lijst in sw.js niet gevonden'); else for (const m of shell.matchAll(/'([^']+)'/g)) { n++; if (m[1] !== './' && !bestaat(m[1])) slecht('sw.js SHELL noemt ontbrekend bestand: ' + m[1]); }
for (const f of fs.readdirSync(path.join(pub, 'data')).filter(f => /\.json$/.test(f))) { n++; try { JSON.parse(fs.readFileSync(path.join(pub, 'data', f), 'utf8')); } catch (e) { slecht('public/data/' + f + ' is geen geldige JSON'); } }
console.log(fouten ? fouten + ' fout(en).' : 'bestanden: alles heel (' + n + ' controles)');
process.exit(fouten ? 1 : 0);
