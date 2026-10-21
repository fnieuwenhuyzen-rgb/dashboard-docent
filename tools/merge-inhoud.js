// Zet lesinhoud (tools/inhoud-<naam>.json) in public/data/basis.json en bron/leergang-data.json.
// Gebruik: node tools/merge-inhoud.js klas3 havo3 vwo3
// Koppeling op lestitel; bestaande velden in de les worden alleen gevuld als ze nog ontbreken (--force overschrijft).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const [naam, ...rest] = process.argv.slice(2);
const force = rest.includes('--force');
const klassen = rest.filter(x => !x.startsWith('--'));
if (!naam || !klassen.length) { console.error('gebruik: node tools/merge-inhoud.js <naam> <klas> [<klas>...] [--force]'); process.exit(1); }
const inhoud = JSON.parse(fs.readFileSync(path.join(__dirname, 'inhoud-' + naam + '.json'), 'utf8'));
const MAT = inhoud._mat || {};
const VELDEN = ['vraag', 'doel', 'criteria', 'fasen', 'formatief', 'identiteit', 'materiaal', 'benodigd'];

function vul(les, src, telling) {
  for (const k of VELDEN) {
    if (src[k] == null) continue;
    if (!force && les[k] != null && !(Array.isArray(les[k]) && !les[k].length)) continue;
    let v = JSON.parse(JSON.stringify(src[k]));
    if (k === 'materiaal') v = v.map(m => typeof m === 'string' ? (MAT[m] || { t: m }) : m);
    les[k] = v; telling.velden++;
  }
}
function doe(bestand, pak) {
  const p = path.join(root, bestand);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const kl of klassen) {
    const k = pak(data)[kl]; if (!k) { console.warn(bestand + ': klas ' + kl + ' niet gevonden'); continue; }
    const telling = { lessen: 0, velden: 0, mis: [] };
    for (const w of k.weken) {
      for (let i = 1; i <= 6; i++) {
        const l = w['l' + i]; if (!l) continue;
        if (l.type !== 'theorie' && l.type !== 'praktijk' && l.type !== 'toets') continue;
        const src = inhoud.lessen[l.titel];
        if (!src) { telling.mis.push(w.w + ': ' + l.titel); continue; }
        vul(l, src, telling); telling.lessen++;
      }
    }
    console.log(`${bestand} ${kl}: ${telling.lessen} lessen, ${telling.velden} velden gevuld${telling.mis.length ? '; zonder inhoud: ' + telling.mis.join(' | ') : ''}`);
  }
  fs.writeFileSync(p, JSON.stringify(data), 'utf8');
}
doe('public/data/basis.json', d => d.leergangen);
doe('bron/leergang-data.json', d => d.klassen);
