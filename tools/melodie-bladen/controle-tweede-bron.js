// Controleert een lied met bronMidi: bronNoten tegen de letterlijke melodiebron, en elke noot tegen de koorzetting.
// Gebruik: node controle-tweede-bron.js <lied>.json
const fs = require('fs');
const L = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const b = L.bronMidi;
const NM = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const midi = n => { const m = /^([A-G]#?)(\d)$/.exec(n); return NM.indexOf(m[1]) + 12 * (+m[2] + 1); };
const naam = a => NM[a % 12] + (Math.floor(a / 12) - 1);
const lees = (s, tr = 0) => s.trim().split(/\s+/).map(x => { const m = /^(.+)@([\d.]+)\/([\d.]+)$/.exec(x); return { n: naam(midi(m[1]) + tr), s: +m[2], d: +m[3] }; });
const duur = x => { const m = /\/(\d+)(\.?)$/.exec(x); return (4 / +m[1]) * (m[2] ? 1.5 : 1); };
const eigen = []; let t = 0;
for (const m of L.maten) for (const x of m.noten) { eigen.push({ n: x.split('/')[0], s: t, d: duur(x) }); t += duur(x); }
const fmt = a => a.map(x => `${x.n}@${x.s}/${x.d}`).join(' ');
// 1. Melodiebron, met de benoemde ritmekeuzes.
let bron = lees(b.melodie, b.transponeer);
for (const k of b.keuzes) {
  const weg = lees(k.melodie, b.transponeer), nieuw = []; let q = k.start;
  for (const x of k.gekozen.split(' ')) { nieuw.push({ n: x.split('/')[0], s: q, d: duur(x) }); q += duur(x); }
  if (weg.some(w => !bron.some(x => x.s === w.s && x.n === w.n && x.d === w.d))) throw new Error('keuze staat niet in de bron');
  bron = bron.filter(x => !weg.some(w => w.s === x.s)).concat(nieuw).sort((x, y) => x.s - y.s);
}
if (fmt(bron) !== fmt(eigen)) { console.error('BRON:  ' + fmt(bron)); console.error('EIGEN: ' + fmt(eigen)); throw new Error('wijkt af van de melodiebron'); }
console.log(`melodiebron: ${eigen.length} van ${eigen.length} noten gelijk op toonhoogte, tel en duur; ${b.keuzes.length} ritmekeuze`);
// 2. Koorzetting.
const koor = lees(b.koor);
const mis = eigen.filter(e => !koor.some(k => k.n === e.n && k.s === e.s && k.d === e.d));
if (mis.length) throw new Error('niet in de koorzetting: ' + fmt(mis));
console.log(`koorzetting: ${eigen.length} van ${eigen.length} noten aanwezig op dezelfde tel met dezelfde duur`);
if (!lees(b.koorSlot).some(k => k.n === 'G4' && k.d === 4)) throw new Error('slotnoot niet in de koorzetting');
console.log('slotnoot: hele noot G, staat zo in de koorzetting');
// 3. Akkoorden op niveau 1: de box heeft in refreinmaat 6 G, op niveau 2 en 3 Em.
const r6 = L.niveaus[0].regels.find(r => r.m === 6);
if (r6.akk[0] !== 'G' || L.maten[5].akk[0] !== 'Em') throw new Error('refreinmaat 6 klopt niet met de box');
console.log('akkoorden refreinmaat 6: niveau 1 G, niveau 2 en 3 Em, gelijk aan de box');
