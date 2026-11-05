// Dashboard-artifact verversen: zet bron/leergang-data.json in bron/leergang-dashboard.html. Daarna publiceren op dezelfde link (zie CLAUDE.md).
const fs = require('fs'), path = require('path');
const bron = f => path.join(__dirname, '..', 'bron', f);
const D = JSON.parse(fs.readFileSync(bron('leergang-data.json'), 'utf8'));
const h = fs.readFileSync(bron('leergang-dashboard.html'), 'utf8');
const m = h.match(/(<script id="data" type="application\/json">)[\s\S]*?(<\/script>)/);
const json = JSON.stringify(D).replace(/<\//g, '<\/');
fs.writeFileSync(bron('leergang-dashboard.html'), h.slice(0, m.index) + m[1] + json + m[2] + h.slice(m.index + m[0].length));
console.log('dashboard ververst:', Object.keys(D.klassen).length, 'klassen,', json.length, 'tekens gegevens');
