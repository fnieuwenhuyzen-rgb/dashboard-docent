// Maakt melodiebladen voor een kerstbox: per niveau keyboard (noten), gitaar en ukelele (noten + tab).
// De noten staan in <lied>.json en worden gecontroleerd tegen de bron.
// Gebruik: NODE_PATH=<map met verovio en @resvg/resvg-js> node maak-bladen.js <lied>.json <uitvoermap> <map met Encode Sans>
// Gitaar klinkt een octaaf lager dan genoteerd (gewoon bij gitaar); ukelele klinkt zoals genoteerd.
const fs = require('fs'), path = require('path');
const verovio = require('verovio');
const { Resvg } = require('@resvg/resvg-js');
const [, , liedPad, uit, fontMap] = process.argv;
const L = JSON.parse(fs.readFileSync(liedPad, 'utf8'));
fs.mkdirSync(uit, { recursive: true });

const NOOT = s => {
  const m = /^([A-G])(#?)(\d)\/(\d+)(\.?)$/.exec(s);
  if (!m) throw new Error('noot? ' + s);
  return { pn: m[1].toLowerCase(), acc: m[2], oct: +m[3], dur: m[4], dot: m[5], naam: m[1] + m[2] + m[3] };
};
const telt = n => (4 / +n.dur) * (n.dot ? 1.5 : 1);

// Controle 1: elke maat telt 4 tellen; de slotmaat 3, want de vierde tel is de opmaat.
for (const m of L.maten) {
  const t = m.noten.map(NOOT).reduce((a, n) => a + telt(n), 0);
  if (t !== (m.n === L.maten.length ? 3 : 4)) throw new Error('maat ' + m.n + ' telt ' + t);
}

// Controle 2: toonhoogte en duur per noot gelijk aan de bron (LilyPond \relative c').
// De bron schrijft de eerste regel met een herhaling; hier staat die uitgeschreven.
function leesBron(s) {
  const NM = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
  let vorig = { i: 0, oct: 4 }, dur = '4';
  return s.split(/\s+/).map(t => {
    const m = /^([a-g])(is)?('*)(,*)(\d*)(\.?)$/.exec(t);
    if (!m) throw new Error('bron? ' + t);
    const i = NM.indexOf(m[1]);
    let oct = vorig.oct;
    const d = i - vorig.i;
    if (d > 3) oct--;
    if (d < -3) oct++;
    oct += m[3].length - m[4].length;
    if (m[5]) dur = m[5] + m[6];
    vorig = { i, oct };
    return m[1].toUpperCase() + (m[2] ? '#' : '') + oct + '/' + dur;
  });
}
const bron = leesBron(L.bronLilyPond);
const verwacht = [...bron.slice(0, L.herhaaldInBron), ...bron.slice(0, L.herhaaldInBron), ...bron.slice(L.herhaaldInBron)];
const eigen = [...L.opmaatCouplet, ...L.maten.flatMap(m => m.noten)];
if (verwacht.join(' ') !== eigen.join(' ')) {
  console.error('BRON:  ' + verwacht.join(' '));
  console.error('EIGEN: ' + eigen.join(' '));
  throw new Error('wijkt af van de bron');
}
console.log('noten kloppen met de bron:', eigen.length, 'noten');

// Controle 3: elke tabgreep klinkt de juiste toon. Gitaar een octaaf lager dan genoteerd, ukelele zoals genoteerd.
const STEM = { gitaar: { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 }, ukelele: { 1: 69, 2: 64, 3: 60, 4: 67 } };
const MIDI = naam => { const m = /^([A-G])(#?)(\d)$/.exec(naam); return { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0) + 12 * (+m[3] + 1); };
for (const inst of Object.keys(L.grepen)) for (const [naam, g] of Object.entries(L.grepen[inst])) {
  const klinkt = STEM[inst][g[0]] + g[1], moet = MIDI(naam) - (inst === 'gitaar' ? 12 : 0);
  if (klinkt !== moet) throw new Error(`greep ${inst} ${naam}: klinkt ${klinkt}, moet ${moet}`);
}
console.log('tabgrepen kloppen');

const durAttr = n => `dur="${n.dur}"${n.dot ? ' dots="1"' : ''}`;
// Verovio leest oct als klinkende toon; bij de gitaarsleutel (8 eronder) dus een octaaf lager, dan staat de noot op de gewone plek.
let octVerschuiving = 0;
const nootXml = s => {
  const n = NOOT(s);
  return `<note pname="${n.pn}" oct="${n.oct + octVerschuiving}" ${durAttr(n)}${n.acc ? ' accid.ges="s"' : ''}/>`;
};
const tabXml = (s, inst) => {
  const n = NOOT(s), g = L.grepen[inst][n.naam];
  if (!g) throw new Error('geen greep ' + n.naam);
  return `<tabGrp ${durAttr(n)}><note tab.course="${g[0]}" tab.fret="${g[1]}"/></tabGrp>`;
};
function laag(ns, f, rustXml) {
  const x = [];
  let acht = [];
  const flush = () => { if (acht.length) { x.push(acht.length > 1 ? `<beam>${acht.join('')}</beam>` : acht[0]); acht = []; } };
  for (const s of ns) {
    if (s === 'R4') { flush(); x.push(rustXml); continue; }
    if (NOOT(s).dur === '8') acht.push(f(s)); else { flush(); x.push(f(s)); }
  }
  flush();
  return x.join('');
}
// Een maat: {n, noten, akk, label, metcon, right, sb, fermate}
function maatXml(m, inst) {
  const a = `n="${m.n}"${m.metcon === false ? ' metcon="false"' : ''}${m.right ? ` right="${m.right}"` : ''}`;
  const s1 = `<staff n="1"><layer n="1">${laag(m.noten, nootXml, '<rest dur="4"/>')}</layer></staff>`;
  const s2 = inst === 'keyboard' ? '' : `<staff n="2"><layer n="1">${laag(m.noten, s => tabXml(s, inst), '<tabGrp dur="4"><tabRhythm/></tabGrp>')}</layer></staff>`;
  const akk = (m.akk || []).map((k, i) => `<harm staff="1" place="above" tstamp="${1 + i * 2}">${k}</harm>`).join('');
  const lab = m.label ? `<dir staff="1" place="above" tstamp="1"><rend fontweight="bold">${m.label}</rend></dir>` : '';
  const ferm = m.fermate ? '<fermata staff="1" tstamp="1" place="above"/>' : '';
  return `${m.sb ? '<sb/>' : ''}<measure ${a}>${s1}${s2}${akk}${lab}${ferm}</measure>`;
}
function mei(maten, inst) {
  const sig = `keysig="${L.voorteken}" meter.count="4" meter.unit="4"`;
  const noten = `<staffDef n="1" lines="5" clef.shape="G" clef.line="2"${inst === 'gitaar' ? ' clef.dis="8" clef.dis.place="below"' : ''} ${sig}/>`;
  const tuning = inst === 'gitaar'
    ? '<tuning><course n="1" pname="e" oct="4"/><course n="2" pname="b" oct="3"/><course n="3" pname="g" oct="3"/><course n="4" pname="d" oct="3"/><course n="5" pname="a" oct="2"/><course n="6" pname="e" oct="2"/></tuning>'
    : '<tuning><course n="1" pname="a" oct="4"/><course n="2" pname="e" oct="4"/><course n="3" pname="c" oct="4"/><course n="4" pname="g" oct="4"/></tuning>';
  const tab = inst === 'keyboard' ? '' : `<staffDef n="2" lines="${inst === 'gitaar' ? 6 : 4}" notationtype="tab.guitar" clef.shape="TAB" clef.line="${inst === 'gitaar' ? 5 : 4}">${tuning}</staffDef>`;
  return `<?xml version="1.0" encoding="UTF-8"?><mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.0"><music><body><mdiv><score><scoreDef><staffGrp>${noten}${tab}</staffGrp></scoreDef><section>${maten.map(m => maatXml(m, inst)).join('')}</section></score></mdiv></body></music></mei>`;
}

const M = n => L.maten[n - 1];
const per4 = i => i % 4 === 0 && i > 0;
const SLOTNOOT = 'E4/1';
// Niveau 1: refrein, met de opmaat die aan het eind van maat 12 staat.
function niveau1() {
  const r = [{ n: 0, metcon: false, noten: M(12).noten.slice(1), label: 'Refrein' }];
  [13, 14, 15, 16, 17, 18, 19].forEach((x, i) => {
    const m = M(x);
    r.push({ n: i + 1, noten: x === 19 ? [SLOTNOOT] : m.noten, akk: m.akk, right: x === 19 ? 'end' : undefined, sb: per4(i) });
  });
  return r;
}
// Niveau 2: couplet en refrein, 19 maten, maatnummers gelijk aan de lessen.
function niveau2() {
  const r = [{ n: 0, metcon: false, noten: L.opmaatCouplet }];
  L.maten.forEach((m, i) => {
    const q = { n: m.n, noten: m.n === 19 ? [SLOTNOOT] : m.noten, akk: m.akk, sb: per4(i), right: m.n === 19 ? 'end' : undefined };
    if (m.n === 1) q.label = 'Couplet';
    if (m.n === 13) q.label = 'Refrein';
    r.push(q);
  });
  return r;
}
// Niveau 3: het hele lied. Intro en slot zijn een voorstel: de laatste vier maten van het refrein.
// Tussen intro en slot gaan couplet en refrein zo vaak rond als de groep kiest.
function niveau3() {
  const r = [];
  [16, 17, 18].forEach((x, i) => r.push({ n: 'i' + (i + 1), noten: M(x).noten, akk: M(x).akk, label: i === 0 ? 'Intro' : undefined }));
  r.push({ n: 'i4', metcon: false, noten: ['E4/2.'], akk: ['Em'], right: 'rptstart' });
  r.push({ n: 0, metcon: false, noten: L.opmaatCouplet });
  L.maten.forEach((m, i) => {
    const q = { n: m.n, noten: m.noten, akk: m.akk, sb: i === 0 || per4(i) };
    if (m.n === 1) q.label = 'Couplet';
    if (m.n === 13) q.label = 'Refrein';
    if (m.n === 19) { q.right = 'rptend'; q.metcon = false; }
    r.push(q);
  });
  r.push({ n: 's0', metcon: false, noten: ['R4'] });
  [16, 17, 18].forEach((x, i) => r.push({ n: 's' + (i + 1), noten: M(x).noten, akk: M(x).akk, label: i === 0 ? 'Slot' : undefined, sb: i === 0 }));
  r.push({ n: 's4', noten: [SLOTNOOT], akk: ['Em'], right: 'end', fermate: true });
  return r;
}
const NIVEAUS = [
  { nr: 1, wat: 'refrein', f: niveau1 },
  { nr: 2, wat: 'couplet en refrein', f: niveau2 },
  { nr: 3, wat: 'het hele lied', f: niveau3, onder: 'Herhaal couplet en refrein zo vaak als jullie kiezen. Intro en slot: de laatste vier maten van het refrein.' }
];
const INST = [{ k: 'keyboard', naam: 'Keyboard' }, { k: 'gitaar', naam: 'Gitaar' }, { k: 'ukelele', naam: 'Ukelele' }];

function klaar() {
  const tk = new verovio.toolkit();
  const fonts = ['EncodeSans-Light.ttf', 'EncodeSans-Bold.ttf'].map(f => path.join(fontMap, f)).filter(f => fs.existsSync(f));
  if (fonts.length < 2) throw new Error('Encode Sans niet gevonden in ' + fontMap);
  const lijst = [];
  for (const nv of NIVEAUS) for (const ins of INST) {
    tk.setOptions({ breaks: 'encoded', pageWidth: 2000, pageHeight: 8000, adjustPageHeight: true, scale: 60, pageMarginTop: 20, pageMarginBottom: 20, pageMarginLeft: 50, pageMarginRight: 50, footer: 'none', header: 'none', spacingStaff: 5, spacingSystem: 10, font: 'Bravura' });
    octVerschuiving = ins.k === 'gitaar' ? -1 : 0;
    if (!tk.loadData(mei(nv.f(), ins.k))) throw new Error('verovio laadt niet: ' + tk.getLog());
    if (tk.getPageCount() !== 1) throw new Error('meer dan een pagina');
    let svg = tk.renderToSVG(1).replace(/<\?xml[^>]*>/, '');
    svg = svg.replace(/font-family="[^"]*"/g, 'font-family="Encode Sans"').replace(/font-family:\s*[^;"]*/g, 'font-family:Encode Sans');
    // Geen maatnummer bij intro en slot (i1, s1): die maten horen niet bij de telling 1-19 uit de lessen.
    svg = svg.replace(/<g[^>]*class="mNum[^"]*"[^>]*>(?:(?!<\/g>)[\s\S])*?>[is]\d(?:(?!<\/g>)[\s\S])*?<\/g>/g, '');
    const b = +/width="(\d+)px"/.exec(svg)[1], h = +/height="(\d+)px"/.exec(svg)[1];
    const kop = 100, voet = nv.onder ? 50 : 10;
    const wrap = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${b}" height="${h + kop + voet}" viewBox="0 0 ${b} ${h + kop + voet}"><rect width="100%" height="100%" fill="#fff"/><text x="30" y="48" font-family="Encode Sans" font-weight="700" font-size="34" fill="#1b2a4a">${L.titel}</text><text x="30" y="86" font-family="Encode Sans" font-size="24" fill="#1b2a4a">Niveau ${nv.nr}: ${nv.wat} · Melodie · ${ins.naam}${ins.k === 'keyboard' ? '' : ' (noten en tab)'}</text><g transform="translate(0,${kop})">${svg}</g>${nv.onder ? `<text x="30" y="${h + kop + 28}" font-family="Encode Sans" font-size="22" fill="#1b2a4a">${nv.onder}</text>` : ''}</svg>`;
    const naam = `${L.bestand}-niveau-${nv.nr}-melodie-${ins.k}`;
    fs.writeFileSync(path.join(uit, naam + '.svg'), wrap);
    const png = new Resvg(wrap, { fitTo: { mode: 'width', value: 1400 }, font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'Encode Sans' } }).render().asPng();
    fs.writeFileSync(path.join(uit, naam + '.png'), png);
    lijst.push(`${naam} ${Math.round(png.length / 1024)} KB`);
  }
  // Afspeelgegevens voor het naluisteren: per niveau noten met starttel en duur.
  const speel = {};
  for (const nv of NIVEAUS) {
    let t = 0;
    const ns = [];
    for (const m of nv.f()) for (const s of m.noten) {
      if (s === 'R4') { t += 1; continue; }
      const n = NOOT(s);
      ns.push([n.naam, t, telt(n)]);
      t += telt(n);
    }
    speel[nv.nr] = ns;
  }
  fs.writeFileSync(path.join(uit, 'afspelen.json'), JSON.stringify({ tempo: L.tempo, speel }));
  console.log(lijst.join('\n'));
}
verovio.module.onRuntimeInitialized = klaar;
if (verovio.module.calledRun) klaar();
