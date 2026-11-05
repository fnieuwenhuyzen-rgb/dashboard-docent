// Maakt melodiebladen voor een kerstbox: per niveau keyboard (noten), gitaar en ukelele (noten + tab).
// De noten en de niveaus staan in <lied>.json; de noten worden gecontroleerd tegen de bron.
// Gebruik: NODE_PATH=<map met verovio en @resvg/resvg-js> node maak-bladen.js <lied>.json <uitvoermap> <map met Encode Sans>
// Gitaar klinkt een octaaf lager dan genoteerd (gewoon bij gitaar); ukelele klinkt zoals genoteerd.
//
// Velden in <lied>.json naast titel, bestand, bron, tempo, voorteken, opmaatCouplet, maten en grepen:
// - niveaus: [{nr, wat, onder?, akkVeld?, regels}]. Een regel is een maat op het blad: {m?, n?, neem?, noten?, akk?, label?, metcon?, right?, sb?, fermate?}.
//   m wijst naar een maat uit maten, n is het maatnummer op het blad (standaard m), neem: [van, tot] snijdt de noten, akkVeld kiest de akkoordenlijst van het niveau.
// - bronLilyPond + herhaaldInBron: bron in LilyPond. Of bronNoten + bronTransponeer: bron als noten in de toonsoort van de bron, met het verschil in halve tonen.
// - slotTelt: tellen in de laatste maat, als dat er geen 4 zijn.
// - gitaar: {capo, voorteken, verschuif, namen, akkoorden}: noten en akkoorden voor gitaar met capo, in de vorm die de leerling grijpt.
// - beamPerTel: waardestrepen per tel, voor gepunteerde achtsten met zestienden. lastJust: laatste regel uitvullen vanaf deze vulling (0 = altijd).
// - ukeleleOmhoog: noten onder het bereik van de ukelele, die een octaaf hoger staan.
const fs = require('fs'), path = require('path');
const verovio = require('verovio');
const { Resvg } = require('@resvg/resvg-js');
const [, , liedPad, uit, fontMap] = process.argv;
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

// Controle 1: elke maat telt 4 tellen; de slotmaat kan anders zijn (slotTelt).
for (const m of L.maten) {
  const t = m.noten.reduce((a, s) => a + (IS_RUST(s) ? 1 : telt(NOOT(s))), 0);
  if (t !== (m.n === L.maten.length && L.slotTelt ? L.slotTelt : 4)) throw new Error('maat ' + m.n + ' telt ' + t);
}

// Controle 2: toonhoogte en duur per noot gelijk aan de bron.
// LilyPond (\relative c'): de bron schrijft de eerste regel met een herhaling; hier staat die uitgeschreven.
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
// Bron als noten in een andere toonsoort: transponeren, met de spelling van de eigen maten (voorteken 1f = mollen).
const NAMEN_MOL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const uitMidi = (midi, namen) => namen[midi % 12] + (Math.floor(midi / 12) - 1);
function bronVerwacht() {
  if (L.bronNoten) return L.bronNoten.trim().split(/\s+/).map(s => {
    const n = NOOT(s);
    return uitMidi(MIDI(n.naam) + L.bronTransponeer, NAMEN_MOL) + '/' + n.dur + n.dot;
  });
  const bron = leesBron(L.bronLilyPond);
  return [...bron.slice(0, L.herhaaldInBron), ...bron.slice(0, L.herhaaldInBron), ...bron.slice(L.herhaaldInBron)];
}
const verwacht = bronVerwacht();
const eigen = [...L.opmaatCouplet, ...L.maten.flatMap(m => m.noten)].filter(s => !IS_RUST(s));
if (verwacht.join(' ') !== eigen.join(' ')) {
  console.error('BRON:  ' + verwacht.join(' '));
  console.error('EIGEN: ' + eigen.join(' '));
  throw new Error('wijkt af van de bron');
}
console.log('noten kloppen met de bron:', eigen.length, 'noten');

// De noot zoals die op het blad van dit instrument staat.
const CAPO = (L.gitaar && L.gitaar.capo) || 0;
function geschreven(naam, inst) {
  if (inst === 'gitaar' && L.gitaar) return uitMidi(MIDI(naam) + L.gitaar.verschuif, L.gitaar.namen);
  if (inst === 'ukelele' && (L.ukeleleOmhoog || []).includes(naam)) return naam.slice(0, -1) + (+naam.slice(-1) + 1);
  return naam;
}

// Controle 3: elke tabgreep klinkt de juiste toon. Gitaar een octaaf lager dan genoteerd, plus de capo; ukelele zoals genoteerd.
const STEM = { gitaar: { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 }, ukelele: { 1: 69, 2: 64, 3: 60, 4: 67 } };
for (const inst of Object.keys(L.grepen)) for (const [naam, g] of Object.entries(L.grepen[inst])) {
  const capo = inst === 'gitaar' ? CAPO : 0;
  const klinkt = STEM[inst][g[0]] + capo + g[1], moet = MIDI(naam) + (inst === 'gitaar' ? capo - 12 : 0);
  if (klinkt !== moet) throw new Error(`greep ${inst} ${naam}: klinkt ${klinkt}, moet ${moet}`);
}
console.log('tabgrepen kloppen');
// Controle 4: met capo klinkt de gitaar even hoog als het keyboard; de ukelele ook, behalve de noten die omhoog staan.
if (L.gitaar) for (const s of eigen) {
  const n = NOOT(s).naam, gs = geschreven(n, 'gitaar');
  if (MIDI(gs) - 12 + CAPO !== MIDI(n)) throw new Error('gitaar klinkt anders dan keyboard: ' + n);
  if (!L.grepen.gitaar[gs]) throw new Error('geen greep gitaar ' + gs);
  const us = geschreven(n, 'ukelele');
  if (!L.grepen.ukelele[us]) throw new Error('geen greep ukelele ' + us);
  if (MIDI(us) < 60) throw new Error('te laag voor ukelele: ' + us);
}

const durAttr = n => `dur="${n.dur}"${n.dot ? ' dots="1"' : ''}`;
// Verovio leest oct als klinkende toon; bij de gitaarsleutel (8 eronder) dus een octaaf lager, dan staat de noot op de gewone plek.
let octVerschuiving = 0;
const nootXml = (s, inst) => {
  const n = NOOT(s), g = NOOT(geschreven(n.naam, inst) + '/' + n.dur + n.dot);
  return `<note pname="${g.pn}" oct="${g.oct + octVerschuiving}" ${durAttr(g)}${g.acc ? ` accid.ges="${g.acc === '#' ? 's' : 'f'}"` : ''}/>`;
};
const tabXml = (s, inst) => {
  const n = NOOT(s), naam = geschreven(n.naam, inst), g = L.grepen[inst][naam];
  if (!g) throw new Error('geen greep ' + naam);
  return `<tabGrp ${durAttr(n)}><note tab.course="${g[0]}" tab.fret="${g[1]}"/></tabGrp>`;
};
function laag(ns, f, rustXml) {
  const x = [];
  let acht = [], som = 0;
  const flush = () => { if (acht.length) { x.push(acht.length > 1 ? `<beam>${acht.join('')}</beam>` : acht[0]); acht = []; } som = 0; };
  for (const s of ns) {
    if (IS_RUST(s)) { flush(); x.push(rustXml); continue; }
    const nn = NOOT(s);
    if (L.beamPerTel && (nn.dur === '8' || nn.dur === '16')) { if (som === 1) flush(); acht.push(f(s)); som += telt(nn); if (nn.dur === '16' && som === 1) flush(); }
    else if (nn.dur === '8') acht.push(f(s)); else { flush(); x.push(f(s)); }
  }
  flush();
  return x.join('');
}
const akkTekst = (k, inst) => (inst === 'gitaar' && L.gitaar && L.gitaar.akkoorden && L.gitaar.akkoorden[k]) || k;
// Een maat: {n, noten, akk, label, metcon, right, sb, fermate}
function maatXml(m, inst) {
  const a = `n="${m.n}"${m.metcon === false ? ' metcon="false"' : ''}${m.right ? ` right="${m.right}"` : ''}`;
  const s1 = `<staff n="1"><layer n="1">${laag(m.noten, s => nootXml(s, inst), '<rest dur="4"/>')}</layer></staff>`;
  const s2 = inst === 'keyboard' ? '' : `<staff n="2"><layer n="1">${laag(m.noten, s => tabXml(s, inst), '<tabGrp dur="4"><tabRhythm/></tabGrp>')}</layer></staff>`;
  const akk = (m.akk || []).map((k, i) => `<harm staff="1" place="above" tstamp="${1 + i * 2}">${akkTekst(k, inst)}</harm>`).join('');
  const lab = m.label ? `<dir staff="1" place="above" tstamp="1"><rend fontweight="bold">${m.label}</rend></dir>` : '';
  const ferm = m.fermate ? `<fermata staff="1" tstamp="${m.fermate === true ? 1 : m.fermate}" place="above"/>` : '';
  return `${m.sb ? '<sb/>' : ''}<measure ${a}>${s1}${s2}${akk}${lab}${ferm}</measure>`;
}
function mei(maten, inst) {
  const vt = inst === 'gitaar' && L.gitaar ? L.gitaar.voorteken : L.voorteken;
  const sig = `keysig="${vt}" meter.count="4" meter.unit="4"`;
  const noten = `<staffDef n="1" lines="5" clef.shape="G" clef.line="2"${inst === 'gitaar' ? ' clef.dis="8" clef.dis.place="below"' : ''} ${sig}/>`;
  const tuning = inst === 'gitaar'
    ? '<tuning><course n="1" pname="e" oct="4"/><course n="2" pname="b" oct="3"/><course n="3" pname="g" oct="3"/><course n="4" pname="d" oct="3"/><course n="5" pname="a" oct="2"/><course n="6" pname="e" oct="2"/></tuning>'
    : '<tuning><course n="1" pname="a" oct="4"/><course n="2" pname="e" oct="4"/><course n="3" pname="c" oct="4"/><course n="4" pname="g" oct="4"/></tuning>';
  const tab = inst === 'keyboard' ? '' : `<staffDef n="2" lines="${inst === 'gitaar' ? 6 : 4}" notationtype="tab.guitar" clef.shape="TAB" clef.line="${inst === 'gitaar' ? 5 : 4}">${tuning}</staffDef>`;
  return `<?xml version="1.0" encoding="UTF-8"?><mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.0"><music><body><mdiv><score><scoreDef><staffGrp>${noten}${tab}</staffGrp></scoreDef><section>${maten.map(m => maatXml(m, inst)).join('')}</section></score></mdiv></body></music></mei>`;
}

// De maten van een niveau, uit de regels in <lied>.json.
function matenVan(nv) {
  return nv.regels.map(r => {
    const m = r.m ? L.maten[r.m - 1] : {};
    let noten = r.noten || m.noten;
    if (r.neem) noten = noten.slice(r.neem[0], r.neem[1]);
    const akk = r.akk || m[nv.akkVeld || 'akk'];
    return { n: r.n !== undefined ? r.n : r.m, noten, akk, label: r.label, metcon: r.metcon, right: r.right, sb: r.sb, fermate: r.fermate };
  });
}
const INST = [{ k: 'keyboard', naam: 'Keyboard' }, { k: 'gitaar', naam: 'Gitaar' }, { k: 'ukelele', naam: 'Ukelele' }];

function klaar() {
  const tk = new verovio.toolkit();
  const fonts = ['EncodeSans-Light.ttf', 'EncodeSans-Bold.ttf'].map(f => path.join(fontMap, f)).filter(f => fs.existsSync(f));
  if (fonts.length < 2) throw new Error('Encode Sans niet gevonden in ' + fontMap);
  const extra = (L.extraFonts || []).filter(f => fs.existsSync(f));
  const lijst = [];
  for (const nv of L.niveaus) for (const ins of INST) {
    tk.setOptions({ breaks: 'encoded', pageWidth: 2000, pageHeight: 8000, adjustPageHeight: true, scale: 60, pageMarginTop: 20, pageMarginBottom: 20, pageMarginLeft: 50, pageMarginRight: 50, footer: 'none', header: 'none', minLastJustification: L.lastJust === undefined ? 0.8 : L.lastJust, spacingStaff: 5, spacingSystem: 10, font: 'Bravura' });
    octVerschuiving = ins.k === 'gitaar' ? -1 : 0;
    if (!tk.loadData(mei(matenVan(nv), ins.k))) throw new Error('verovio laadt niet: ' + tk.getLog());
    if (tk.getPageCount() !== 1) throw new Error('meer dan een pagina');
    let svg = tk.renderToSVG(1).replace(/<\?xml[^>]*>/, '');
    svg = svg.replace(/font-family="[^"]*"/g, 'font-family="Encode Sans"').replace(/font-family:\s*[^;"]*/g, 'font-family:Encode Sans');
    // Verovio zet mol en kruis in akkoorden als muziekteken van zijn eigen lettertype neer. Encode Sans heeft die tekens niet: ze komen uit extraFonts.
    if (extra.length) svg = svg.replace(/<tspan font-family="Encode Sans" font-size="(\d+)px">([])<\/tspan>/g, (_, g, t) => `<tspan font-family="Segoe UI Symbol" font-size="${Math.round(g * 0.56)}px">${t === '' ? '♭' : '♯'}</tspan>`);
    // Geen maatnummer bij intro en slot (i1, s1): die maten horen niet bij de telling uit de lessen.
    svg = svg.replace(/<g[^>]*class="mNum[^"]*"[^>]*>(?:(?!<\/g>)[\s\S])*?>[is]\d(?:(?!<\/g>)[\s\S])*?<\/g>/g, '');
    const b = +/width="(\d+)px"/.exec(svg)[1], h = +/height="(\d+)px"/.exec(svg)[1];
    const kop = 100, voet = nv.onder ? 50 : 10;
    const instTekst = ins.k === 'keyboard' ? ins.naam : `${ins.naam}${ins.k === 'gitaar' && CAPO ? `, capo op fret ${CAPO}` : ''} (noten en tab)`;
    const titel = L.titel.replace(/&/g, '&amp;');
    const wrap = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${b}" height="${h + kop + voet}" viewBox="0 0 ${b} ${h + kop + voet}"><rect width="100%" height="100%" fill="#fff"/><text x="30" y="48" font-family="Encode Sans" font-weight="700" font-size="34" fill="#1b2a4a">${titel}</text><text x="30" y="86" font-family="Encode Sans" font-size="24" fill="#1b2a4a">Niveau ${nv.nr}: ${nv.wat} · Melodie · ${instTekst}</text><g transform="translate(0,${kop})">${svg}</g>${nv.onder ? `<text x="30" y="${h + kop + 28}" font-family="Encode Sans" font-size="22" fill="#1b2a4a">${nv.onder}</text>` : ''}</svg>`;
    const naam = `${L.bestand}-niveau-${nv.nr}-melodie-${ins.k}`;
    fs.writeFileSync(path.join(uit, naam + '.svg'), wrap);
    const png = new Resvg(wrap, { fitTo: { mode: 'width', value: 1400 }, font: { fontFiles: [...fonts, ...extra], loadSystemFonts: false, defaultFontFamily: 'Encode Sans' } }).render().asPng();
    fs.writeFileSync(path.join(uit, naam + '.png'), png);
    lijst.push(`${naam} ${Math.round(png.length / 1024)} KB`);
  }
  // Afspeelgegevens voor het naluisteren: per niveau noten met starttel en duur. speelUkelele alleen als die afwijkt.
  const speelVan = inst => {
    const speel = {};
    for (const nv of L.niveaus) {
      let t = 0;
      const ns = [];
      for (const m of matenVan(nv)) for (const s of m.noten) {
        if (IS_RUST(s)) { t += 1; continue; }
        const n = NOOT(s);
        ns.push([inst ? geschreven(n.naam, inst) : n.naam, t, telt(n)]);
        t += telt(n);
      }
      speel[nv.nr] = ns;
    }
    return speel;
  };
  const uitvoer = { tempo: L.tempo, speel: speelVan() };
  if (L.ukeleleOmhoog) uitvoer.speelUkelele = speelVan('ukelele');
  fs.writeFileSync(path.join(uit, 'afspelen.json'), JSON.stringify(uitvoer));
  console.log(lijst.join('\n'));
}
verovio.module.onRuntimeInitialized = klaar;
if (verovio.module.calledRun) klaar();
