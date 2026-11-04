// Past de tekstwissels uit pt1-vwo4-paren.json toe op tools/inhoud-week10.json. Gebruik: node tools/zet-pt1-inhoud.js veilig|groepen
const fs = require('fs'), path = require('path');
const set = process.argv[2];
const paren = JSON.parse(fs.readFileSync(path.join(__dirname, 'pt1-vwo4-paren.json'), 'utf8'))[set];
if (!paren) { console.error('Gebruik: veilig of groepen'); process.exit(1); }
const f = path.join(__dirname, 'inhoud-week10.json');
let s = fs.readFileSync(f, 'utf8');
for (const [oud, nieuw] of paren) { const n = s.split(oud).length - 1; console.log(n + ' x  ' + oud); s = s.split(oud).join(nieuw); }
JSON.parse(s);
fs.writeFileSync(f, s, 'utf8');
