// Maakt een leadsheet voor een kerstbox: melodie, akkoorden en de tekst van couplet 1 op één blad.
// Noten en akkoorden komen uit <lied>.json (dezelfde als de melodiebladen, daar gecontroleerd tegen de bron).
// De tekst staat in <lied>.json onder leadsheet: {wat, bronTekst, regels, tekst}.
// - regels: zoals bij een niveau in maak-bladen.js.
// - tekst: één lettergreep per noot, in de volgorde van het blad. "mer-" loopt door in de volgende lettergreep,
//   "_" is een noot zonder eigen lettergreep: die hangt met een boogje aan de noot ervoor.
// Gebruik: NODE_PATH=<map met verovio en @resvg/resvg-js> node maak-leadsheet.js <lied>.json <uitvoermap> <map met Encode Sans>
const fs = require('fs'), path = require('path');
const verovio = require('verovio');
const { Resvg } = require('@resvg/resvg-js');
const [, , liedPad, uit, fontMap] = process.argv;
const L = JSON.parse(fs.readFileSync(liedPad, 'utf8'));
const B = L.leadsheet;
if (!B) throw new Error('geen leadsheet in ' + liedPad);
fs.mkdirSync(uit, { recursive: true });

const NOOT = s => {
  const m = /^([A-G])([#b]?)(\d)\/(\d+)(\.?)$/.exec(s);
  if (!m) throw new Error('noot? ' + s);
  return { pn: m[1].toLowerCase(), acc: m[2], oct: +m[3], dur: m[4], dot: m[5] };
};
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const maten = B.regels.map(r => {
  const m = r.m ? L.maten[r.m - 1] : {};
  let noten = r.noten || m.noten;
  if (r.neem) noten = noten.slice(r.neem[0], r.neem[1]);
  return { n: r.n !== undefined ? r.n : r.m, noten, akk: r.akk || m.akk, label: r.label, metcon: r.metcon, right: r.right, sb: r.sb };
});
const aantal = maten.reduce((a, m) => a + m.noten.length, 0);
if (aantal !== B.tekst.length) throw new Error(`tekst: ${B.tekst.length} lettergrepen bij ${aantal} noten`);

let nr = 0;
const bogen = [];
function nootXml(s) {
  const n = NOOT(s), t = B.tekst[nr], id = 'n' + nr;
  let syl = '';
  if (t === '_') {
    // Boog vanaf de laatste noot met een lettergreep; een boog die al loopt wordt verlengd.
    const vorige = bogen.length && bogen[bogen.length - 1][1] === 'n' + (nr - 1) ? bogen.pop()[0] : 'n' + (nr - 1);
    bogen.push([vorige, id]);
  } else {
    const door = t.endsWith('-'), na = nr > 0 && B.tekst.slice(0, nr).filter(x => x !== '_').pop();
    const naDoor = na && na.endsWith('-');
    const pos = door ? (naDoor ? 'm' : 'i') : (naDoor ? 't' : '');
    syl = `<verse n="1"><syl${pos ? ` wordpos="${pos}"` : ''}${door ? ' con="d"' : ''}>${esc(door ? t.slice(0, -1) : t)}</syl></verse>`;
  }
  nr++;
  return `<note xml:id="${id}" pname="${n.pn}" oct="${n.oct}" dur="${n.dur}"${n.dot ? ' dots="1"' : ''}${n.acc ? ` accid.ges="${n.acc === '#' ? 's' : 'f'}"` : ''}>${syl}</note>`;
}
function laag(ns) {
  const x = [];
  let acht = [];
  const flush = () => { if (acht.length) { x.push(acht.length > 1 ? `<beam>${acht.join('')}</beam>` : acht[0]); acht = []; } };
  for (const s of ns) { if (NOOT(s).dur === '8') acht.push(nootXml(s)); else { flush(); x.push(nootXml(s)); } }
  flush();
  return x.join('');
}
function maatXml(m) {
  const van = bogen.length;
  const a = `n="${m.n}"${m.metcon === false ? ' metcon="false"' : ''}${m.right ? ` right="${m.right}"` : ''}`;
  const s1 = `<staff n="1"><layer n="1">${laag(m.noten)}</layer></staff>`;
  const akk = (m.akk || []).map((k, i) => `<harm staff="1" place="above" tstamp="${1 + i * 2}">${k}</harm>`).join('');
  const lab = m.label ? `<dir staff="1" place="above" tstamp="1"><rend fontweight="bold">${m.label}</rend></dir>` : '';
  const boog = bogen.slice(van).map(([v, t]) => `<slur startid="#${v}" endid="#${t}" curvedir="above"/>`).join('');
  return `${m.sb ? '<sb/>' : ''}<measure ${a}>${s1}${akk}${lab}${boog}</measure>`;
}
const mei = `<?xml version="1.0" encoding="UTF-8"?><mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.0"><music><body><mdiv><score><scoreDef><staffGrp><staffDef n="1" lines="5" clef.shape="G" clef.line="2" keysig="${L.voorteken}" meter.count="4" meter.unit="4"/></staffGrp></scoreDef><section>${maten.map(maatXml).join('')}</section></score></mdiv></body></music></mei>`;

function klaar() {
  const tk = new verovio.toolkit();
  const fonts = ['EncodeSans-Light.ttf', 'EncodeSans-Bold.ttf'].map(f => path.join(fontMap, f)).filter(f => fs.existsSync(f));
  if (fonts.length < 2) throw new Error('Encode Sans niet gevonden in ' + fontMap);
  tk.setOptions({ breaks: 'encoded', pageWidth: 2000, pageHeight: 8000, adjustPageHeight: true, scale: 60, pageMarginTop: 20, pageMarginBottom: 20, pageMarginLeft: 50, pageMarginRight: 50, footer: 'none', header: 'none', minLastJustification: 0, spacingStaff: 5, spacingSystem: 14, font: 'Bravura', lyricSize: 5.5 });
  if (!tk.loadData(mei)) throw new Error('verovio laadt niet: ' + tk.getLog());
  if (tk.getPageCount() !== 1) throw new Error('meer dan een pagina');
  let svg = tk.renderToSVG(1).replace(/<\?xml[^>]*>/, '');
  svg = svg.replace(/font-family="[^"]*"/g, 'font-family="Encode Sans"').replace(/font-family:\s*[^;"]*/g, 'font-family:Encode Sans');
  const b = +/width="(\d+)px"/.exec(svg)[1], h = +/height="(\d+)px"/.exec(svg)[1];
  const kop = 100, voet = B.onder ? 50 : 10;
  const wrap = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${b}" height="${h + kop + voet}" viewBox="0 0 ${b} ${h + kop + voet}"><rect width="100%" height="100%" fill="#fff"/><text x="30" y="48" font-family="Encode Sans" font-weight="700" font-size="34" fill="#1b2a4a">${esc(L.titel)}</text><text x="30" y="86" font-family="Encode Sans" font-size="24" fill="#1b2a4a">${esc(B.wat)}</text><g transform="translate(0,${kop})">${svg}</g>${B.onder ? `<text x="30" y="${h + kop + 28}" font-family="Encode Sans" font-size="22" fill="#1b2a4a">${esc(B.onder)}</text>` : ''}</svg>`;
  const naam = `${L.bestand}-leadsheet`;
  fs.writeFileSync(path.join(uit, naam + '.svg'), wrap);
  const png = new Resvg(wrap, { fitTo: { mode: 'width', value: 1400 }, font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'Encode Sans' } }).render().asPng();
  fs.writeFileSync(path.join(uit, naam + '.png'), png);
  console.log(`${naam}.png ${Math.round(png.length / 1024)} KB, ${aantal} noten, ${B.tekst.filter(t => t !== '_').length} lettergrepen, ${bogen.length} bogen`);
}
verovio.module.onRuntimeInitialized = klaar;
if (verovio.module.calledRun) klaar();
