// node tools/kijk.js <opdracht>: grote bestanden gericht lezen, met korte uitvoer. Alleen lezen.
//   inhoud [bestand]        kopjes met regelnummer (standaard public/app.js)
//   fn <naam>               één functie uit public/*.js
//   zoek <regex> [pad]      zoeken zonder hoofdlettergevoel: max 40 treffers, stukje rond de treffer.
//                           Slaat *.json en handboek/*archief* over, tenzij je --alles meegeeft of het pad zelf noemt.
//   basis [a.b.c] [--max=N] basis.json: sleutels met grootte, of de waarde op dat pad (leergangen.vwo4.toetsen)
//   les vwo4:12.1 [--vol]   één les uit basis.json; lange velden ingekort tenzij --vol
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const args = process.argv.slice(2), opties = args.filter(a => a.startsWith('--')), [opdracht, ...rest] = args.filter(a => !a.startsWith('--'));
const optie = (n, d) => { const o = opties.find(a => a.startsWith('--' + n + '=')); return o ? Number(o.split('=')[1]) : d; };
const lees = f => fs.readFileSync(path.join(root, f), 'utf8');
const basis = () => JSON.parse(lees('public/data/basis.json'));
const groot = v => { const n = JSON.stringify(v === undefined ? null : v).length; return n >= 1000 ? Math.round(n / 1000) + ' kB' : n + ' tekens'; };
const knip = (s, n) => s.length > n ? s.slice(0, n) + '…' : s;
const stop = m => { console.error(m); process.exit(1); };

function inhoud(f = 'public/app.js') {
  lees(f).split('\n').forEach((r, i) => { const m = r.match(/^\/\* -{4,} *(.*?)(?: *-{4,}.*)?$/); if (m) console.log(String(i + 1).padStart(5) + '  ' + knip(m[1], 90)); });
}

function fn(naam) {
  if (!naam) stop('Geef een functienaam.');
  const def = new RegExp('^\\s*(async\\s+)?function\\s+' + naam + '\\b|^\\s*(const|let)\\s+' + naam + '\\s*=');
  let raak = 0;
  for (const b of fs.readdirSync(path.join(root, 'public')).filter(x => x.endsWith('.js'))) {
    const r = lees('public/' + b).split('\n'), s = r.findIndex(x => def.test(x));
    if (s < 0) continue; raak++;
    const inspring = r[s].match(/^\s*/)[0].length; let e = s + 1;
    while (e < r.length && (!r[e].trim() || r[e].match(/^\s*/)[0].length > inspring || /^\s*[})\]]/.test(r[e]) && r[e].match(/^\s*/)[0].length === inspring)) e++;
    const eind = Math.min(e, s + 120);
    console.log(`public/${b}:${s + 1}-${e}`);
    for (let i = s; i < eind; i++) console.log(String(i + 1).padStart(5) + ' ' + knip(r[i], 240));
    if (eind < e) console.log(`… nog ${e - eind} regels. Lees verder met Read, offset=${eind}.`);
  }
  if (!raak) stop(`Geen functie of const "${naam}" in public/*.js. Probeer: node tools/kijk.js zoek "${naam}" public`);
}

function zoek(p, waar) {
  if (!p) stop('Geef een zoekterm.');
  const re = new RegExp(p, 'i'), alles = opties.includes('--alles') || !!waar;
  const OVERSLA = /(^|[\\/])(node_modules|\.git|\.wrangler)$/;
  const start = waar ? [waar] : ['CLAUDE.md', 'OPEN-PUNTEN.md', 'LEESMIJ.md', 'public', 'functions', 'worker', 'tools', 'handboek', 'migrations', '.claude/skills'];
  const bestanden = [];
  const loop = f => { const v = path.join(root, f); if (!fs.existsSync(v) || OVERSLA.test(f)) return; if (fs.statSync(v).isDirectory()) fs.readdirSync(v).forEach(x => loop(f + '/' + x)); else if (/\.(js|json|md|html|css|py|toml|sql|txt)$/.test(f) && (alles || !(/\.json$/.test(f) || /handboek\/.*archief/.test(f)))) bestanden.push(f); };
  start.forEach(loop);
  let getoond = 0; const per = {};
  for (const f of bestanden) lees(f).split('\n').forEach((r, i) => {
    const m = r.match(re); if (!m) return; per[f] = (per[f] || 0) + 1;
    if (getoond++ < 40) { const a = Math.max(0, m.index - 60); console.log(`${f}:${i + 1}: ${a ? '…' : ''}${knip(r.slice(a, m.index + m[0].length + 90).trim(), 180)}`); }
  });
  const t = Object.values(per).reduce((a, b) => a + b, 0);
  if (!t) console.log('Niets gevonden.' + (alles ? '' : ' (JSON en archieven overgeslagen; --alles zoekt ook daar.)'));
  else if (t > 40) console.log(`\n${t} treffers, 40 getoond. Per bestand: ` + Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([f, n]) => `${f} ${n}`).join(', '));
}

function toonBasis(pad) {
  let v = basis();
  for (const d of pad ? pad.split('.') : []) { if (v == null || !(d in Object(v))) stop(`Pad bestaat niet bij "${d}". Sleutels: ${Object.keys(Object(v)).slice(0, 40).join(', ')}`); v = v[d]; }
  const tekst = JSON.stringify(v), max = optie('max', 4000);
  if (tekst.length <= max || v === null || typeof v !== 'object') return console.log(knip(tekst, Math.max(max, 4000)));
  console.log(`${pad || 'basis.json'}: ${Array.isArray(v) ? 'lijst van ' + v.length : 'object'}, ${groot(v)}. Kies een onderdeel, of --max=N.`);
  Object.keys(v).slice(0, 60).forEach(k => console.log('  ' + k.padEnd(22) + groot(v[k])));
  if (Object.keys(v).length > 60) console.log(`  … en nog ${Object.keys(v).length - 60}`);
}

function les(id) {
  const m = String(id).match(/^([a-z0-9]+):(\d+)\.(\d+)$/i); if (!m) stop('Een les-id ziet er zo uit: vwo4:12.1');
  const l = basis().leergangen[m[1]]; if (!l) stop('Geen leergang ' + m[1]);
  const w = l.weken.find(x => x.w === Number(m[2])), v = w && w['l' + m[3]]; if (!v) stop('Geen les ' + id);
  console.log(`${id}  datum ${w.datum}, blok ${w.blok}${w.event ? ', ' + w.event : ''}`);
  for (const [k, x] of Object.entries(v)) { const t = typeof x === 'string' ? x : JSON.stringify(x); console.log('  ' + k + ': ' + (opties.includes('--vol') ? t : knip(t, 300))); }
}

const O = { inhoud, fn, zoek, basis: toonBasis, les };
if (!O[opdracht]) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').filter(r => r.startsWith('//')).join('\n')); process.exit(opdracht ? 1 : 0); }
O[opdracht](...rest);
