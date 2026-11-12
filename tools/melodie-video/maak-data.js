// Maakt de gegevens voor de melodievideo's van een kerstbox: per niveau één partituur (noten, tab gitaar, tab ukelele) en de speeltijden.
// Leest <lied>.json van tools/melodie-bladen (noten daar gecontroleerd tegen de bron door maak-bladen.js).
// Gebruik: node maak-data.js ../melodie-bladen/<lied>.json <uitvoermap>   -> <uitvoermap>/data.json
// Herhalingstekens staan in beeld, maar de video speelt het blad één keer door.
const fs = require('fs'), path = require('path');
const [, , liedPad, uit] = process.argv;
const L = JSON.parse(fs.readFileSync(liedPad, 'utf8'));
fs.mkdirSync(uit, { recursive: true });

const NOOT = s => {
  const m = /^([A-G])([#b]?)(\d)\/(\d+)(\.?)$/.exec(s);
  if (!m) throw new Error('noot? ' + s);
  return { pn: m[1].toLowerCase(), acc: m[2], oct: +m[3], dur: m[4], dot: m[5], naam: m[1] + m[2] + m[3] };
};
const telt = n => (4 / +n.dur) * (n.dot ? 1.5 : 1);
const IS_RUST = s => s === 'R4';
const MIDI = naam => { const m = /^([A-G])([#b]?)(\d)$/.exec(naam); return { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (+m[3] + 1); };
if (L.gitaar || L.ukeleleOmhoog) throw new Error('capo of ukelele omhoog: nog niet in de video gebouwd');
const durAttr = n => `dur="${n.dur}"${n.dot ? ' dots="1"' : ''}`;

function niveau(nv) {
  const maten = nv.regels.map(r => {
    const m = r.m ? L.maten[r.m - 1] : {};
    let noten = r.noten || m.noten;
    if (r.neem) noten = noten.slice(r.neem[0], r.neem[1]);
    return { n: r.n !== undefined ? r.n : r.m, noten, akk: r.akk || m[nv.akkVeld || 'akk'], label: r.label, metcon: r.metcon, right: r.right, sb: r.sb, fermate: r.fermate };
  });
  let nr = 0, t = 0;
  const noten = [], maatStart = [];
  const laag = (ns, f, rust, balk = true) => {
    const x = [];
    let acht = [];
    const flush = () => { if (acht.length) { x.push(acht.length > 1 ? `<beam>${acht.join('')}</beam>` : acht[0]); acht = []; } };
    for (const s of ns) {
      if (IS_RUST(s)) { flush(); x.push(rust); continue; }
      if (balk && NOOT(s).dur === '8') acht.push(f(s)); else { flush(); x.push(f(s)); }
    }
    flush();
    return x.join('');
  };
  // In de tab geen waardestreep: verovio tekent die daar ver buiten het blad.
  const tab = inst => s => {
    const n = NOOT(s), g = L.grepen[inst][n.naam];
    if (!g) throw new Error('geen greep ' + inst + ' ' + n.naam);
    return `<tabGrp ${durAttr(n)}><note tab.course="${g[0]}" tab.fret="${g[1]}"/></tabGrp>`;
  };
  const xml = maten.map(m => {
    maatStart.push(t);
    const s1 = laag(m.noten, s => {
      const n = NOOT(s), id = `v${nv.nr}n${nr++}`;
      return `<note xml:id="${id}" pname="${n.pn}" oct="${n.oct}" ${durAttr(n)}${n.acc ? ` accid.ges="${n.acc === '#' ? 's' : 'f'}"` : ''}/>`;
    }, '<rest dur="4"/>');
    for (const s of m.noten) {
      if (IS_RUST(s)) { t += 1; continue; }
      const n = NOOT(s);
      noten.push({ id: `v${nv.nr}n${noten.length}`, midi: MIDI(n.naam), t, d: telt(n) });
      t += telt(n);
    }
    const rustTab = '<tabGrp dur="4"><tabRhythm/></tabGrp>';
    const a = `n="${m.n}"${m.metcon === false ? ' metcon="false"' : ''}${m.right ? ` right="${m.right}"` : ''}`;
    const akk = (m.akk || []).map((k, i) => `<harm staff="1" place="above" tstamp="${1 + i * 2}">${k}</harm>`).join('');
    const lab = m.label ? `<dir staff="1" place="above" tstamp="1"><rend fontweight="bold">${m.label}</rend></dir>` : '';
    const ferm = m.fermate ? '<fermata staff="1" tstamp="1" place="above"/>' : '';
    return `${m.sb ? '<sb/>' : ''}<measure ${a}><staff n="1"><layer n="1">${s1}</layer></staff><staff n="2"><layer n="1">${laag(m.noten, tab('gitaar'), rustTab, false)}</layer></staff><staff n="3"><layer n="1">${laag(m.noten, tab('ukelele'), rustTab, false)}</layer></staff>${akk}${lab}${ferm}</measure>`;
  }).join('');
  if (nr !== noten.length) throw new Error('telling noten');
  const sig = `keysig="${L.voorteken}" meter.count="4" meter.unit="4"`;
  const defs = `<staffDef n="1" lines="5" clef.shape="G" clef.line="2" ${sig}/>`
    + '<staffDef n="2" lines="6" notationtype="tab.guitar" clef.shape="TAB" clef.line="5"><tuning><course n="1" pname="e" oct="4"/><course n="2" pname="b" oct="3"/><course n="3" pname="g" oct="3"/><course n="4" pname="d" oct="3"/><course n="5" pname="a" oct="2"/><course n="6" pname="e" oct="2"/></tuning></staffDef>'
    + '<staffDef n="3" lines="4" notationtype="tab.guitar" clef.shape="TAB" clef.line="4"><tuning><course n="1" pname="a" oct="4"/><course n="2" pname="e" oct="4"/><course n="3" pname="c" oct="4"/><course n="4" pname="g" oct="4"/></tuning></staffDef>';
  const mei = `<?xml version="1.0" encoding="UTF-8"?><mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.0"><music><body><mdiv><score><scoreDef><staffGrp>${defs}</staffGrp></scoreDef><section>${xml}</section></score></mdiv></body></music></mei>`;
  // Aftellen: een hele maat, plus wat er voor een opmaat nog aan de maat ontbreekt.
  const eerste = maten[0].noten.reduce((a, s) => a + (IS_RUST(s) ? 1 : telt(NOOT(s))), 0);
  const aftel = 4 + (eerste < 4 ? 4 - eerste : 0);
  return { nr: nv.nr, wat: nv.wat, mei, noten, tellen: t, aftel };
}
const data = { titel: L.titel, bestand: L.bestand, tempo: L.tempo, niveaus: L.niveaus.map(niveau) };
fs.writeFileSync(path.join(uit, 'data.json'), JSON.stringify(data));
for (const n of data.niveaus) console.log(`niveau ${n.nr}: ${n.noten.length} noten, ${n.tellen} tellen, aftellen ${n.aftel}, duur ${Math.round((n.tellen + n.aftel) * 60 / L.tempo + 3)} s`);
