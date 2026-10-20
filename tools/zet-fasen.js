// Zet het lesverloop uit tools/fasen-<naam>.json (fasen als objecten) in tools/inhoud-<naam>.json.
// Gebruik: node tools/zet-fasen.js klas3   (daarna: node tools/merge-inhoud.js klas3 havo3 vwo3 --force)
const fs = require('fs'), path = require('path');
const naam = process.argv[2]; if (!naam) { console.error('gebruik: node tools/zet-fasen.js <naam>'); process.exit(1); }
const pi = path.join(__dirname, 'inhoud-' + naam + '.json'), pf = path.join(__dirname, 'fasen-' + naam + '.json');
const inhoud = JSON.parse(fs.readFileSync(pi, 'utf8')), fasen = JSON.parse(fs.readFileSync(pf, 'utf8'));
let n = 0; const mis = [];
for (const titel of Object.keys(inhoud.lessen)) {
  if (fasen[titel]) { inhoud.lessen[titel].fasen = fasen[titel]; n++; } else mis.push(titel);
}
for (const t of Object.keys(fasen)) if (t !== '_uitleg' && !inhoud.lessen[t]) mis.push('(geen les) ' + t);
fs.writeFileSync(pi, JSON.stringify(inhoud, null, 2) + '\n', 'utf8');
console.log(`${n} lessen van fasen voorzien${mis.length ? '; let op: ' + mis.join(' | ') : ''}`);
