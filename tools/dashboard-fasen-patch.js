// Eenmalige patch: het dashboard (bron/leergang-dashboard.html) laten omgaan met fasen als objecten (zie public/lesmodus.js).
const fs = require('fs'), path = require('path');
const p = path.join(__dirname, '..', 'bron', 'leergang-dashboard.html');
let h = fs.readFileSync(p, 'utf8'); let n = 0;
if (h.includes('const FT=f=>')) { console.log('al gepatcht'); process.exit(0); }
const rep = (a, b) => { if (!h.includes(a)) throw new Error('niet gevonden: ' + a); h = h.split(a).join(b); n++; };
rep("(l.fasen||[]).join(' ')", "(l.fasen||[]).map(FT).join(' ')");
rep("(l.fasen||[]).forEach((f,i)=>{const m=f.match", "(l.fasen||[]).map(FT).forEach((f,i)=>{const m=f.match");
rep("(l.fasen||[]).join('\\n')", "(l.fasen||[]).map(FT).join('\\n')");
rep('function benodigd(', "const FT=f=>typeof f==='string'?f:(f.min||0)+' min · '+(f.soort||'')+': '+(f.kop||'');\nfunction benodigd(");
fs.writeFileSync(p, h); console.log('dashboard gepatcht:', n, 'vervangingen');
