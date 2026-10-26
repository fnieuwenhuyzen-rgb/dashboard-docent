// Zet alle materiaal-paden uit de sectiemap om naar SharePoint-adressen, in de lesinhoud en in de appdata.
// Gebruik: node tools/zet-sp-links.js
const fs = require('fs'), path = require('path');
const { spUrl, isSectiePad } = require('./sp');
const root = path.join(__dirname, '..');
const BESTANDEN = ['public/data/basis.json', 'bron/leergang-data.json', ...fs.readdirSync(__dirname).filter(f => /^inhoud-.*\.json$/.test(f)).map(f => 'tools/' + f)];
function loop(o, tel) {
  if (Array.isArray(o)) { o.forEach(x => loop(x, tel)); return; }
  if (!o || typeof o !== 'object') return;
  if (typeof o.u === 'string' && typeof o.t === 'string' && isSectiePad(o.u)) { o.u = spUrl(o.u); tel.n++; }
  for (const k of Object.keys(o)) loop(o[k], tel);
}
for (const f of BESTANDEN) {
  const p = path.join(root, f); const tekst = fs.readFileSync(p, 'utf8'); const data = JSON.parse(tekst); const tel = { n: 0 };
  loop(data, tel);
  if (tel.n) fs.writeFileSync(p, f.startsWith('tools/') ? JSON.stringify(data, null, 2) + '\n' : JSON.stringify(data), 'utf8');
  console.log(f + ': ' + tel.n + ' links omgezet');
}
