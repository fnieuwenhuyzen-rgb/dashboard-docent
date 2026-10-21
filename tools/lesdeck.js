// Lespresentaties in de ontwerptaal van de didactische kaarten:
// wit blad, zware condensed koppen, oranje eyebrow in kapitalen, zandkleurige kaarten met ronde hoeken,
// zwarte pil-labels, per lesfase een vaste kleur. Gebruik: const D = require('./lesdeck'); D.maak(les, opties)
const path = require('path');
const pptxgen = require(path.join(process.env.LOCALAPPDATA, 'Temp', 'claude', 'pptx-tools', 'node_modules', 'pptxgenjs'));

const K = { // kleuren uit de kaarten
  inkt: '1B1B1B', tekst: '2A2A2A', grijs: '6B6B6B', lijn: 'D9D2C3', wit: 'FFFFFF',
  oranje: 'E8542A', accent: 'E8542A', zand: 'F1E8D5', zandrand: 'E2D6BC', sand2: 'F8F3EA',
  fase: { start: 'E8542A', luisteren: 'E8542A', uitleg: 'C9962A', doen: '2E8B7A', gesprek: 'C9962A', check: '6B4FB3', afsluiten: '4A2E8F' },
  faseNaam: { start: 'Horen en doen', luisteren: 'Horen en doen', uitleg: 'Benoemen', doen: 'Doen', gesprek: 'Gesprek', check: 'Check', afsluiten: 'Afsluiten' }
};
const KOP = 'Encode Sans Compressed', KOPB = 'Encode Sans', BODY = 'Encode Sans';
const W = 13.333, H = 7.5, M = 0.6;
const regels = (tekst, fs, w, f) => Math.max(1, Math.ceil(String(tekst || "").length / Math.max(8, Math.floor(w / (fs * (f || 0.0075)))))); const regelH = fs => fs * 1.18 / 72;

function nieuw(meta) {
  const p = new pptxgen(); p.layout = 'LAYOUT_WIDE'; p.author = 'Sectie muziek CSG Prins Maurits'; p.title = meta.titel; p.subject = meta.klas;
  return p;
}
function eyebrow(s, tekst, x, y, w, kleur) { s.addText(tekst.toUpperCase(), { x, y, w, h: 0.3, fontFace: KOPB, fontSize: 11, bold: true, color: kleur || K.accent, charSpacing: 2, margin: 0, isTextBox: true, valign: 'top' }); }
function titel(s, tekst, x, y, w, h, size) { s.addText(tekst, { x, y, w, h, fontFace: KOP, fontSize: size || 44, bold: true, color: K.inkt, margin: 0, isTextBox: true, valign: 'top', lineSpacingMultiple: 0.95 }); }
function pil(s, tekst, x, y, w, opt) { opt = opt || {}; s.addShape('roundRect', { x, y, w, h: 0.34, fill: { color: opt.fill || K.inkt }, line: { color: opt.fill || K.inkt, width: 0 }, rectRadius: 0.17 }); s.addText(tekst, { x, y, w, h: 0.34, fontFace: KOPB, fontSize: 10.5, bold: true, color: opt.color || K.wit, align: 'center', valign: 'middle', margin: 0, isTextBox: true }); }
function kaart(s, x, y, w, h) { s.addShape('roundRect', { x, y, w, h, fill: { color: K.zand }, line: { color: K.zandrand, width: 0.75 }, rectRadius: 0.12 }); }
function foto(s, bestand, x, y, w, h) { if (!bestand) return; s.addImage({ path: bestand, x, y, w, h, sizing: { type: 'cover', w, h }, rounding: false }); }
function fotoRond(s, bestand, x, y, w, h) { // foto met afgeronde hoeken: zand-kader eronder, foto erin
  if (!bestand) { kaart(s, x, y, w, h); return; }
  s.addImage({ path: bestand, x, y, w, h, sizing: { type: 'cover', w, h } });
}
function voet(s, meta, nr, tot) { const kl = s._voetKleur || K.grijs; const x0 = s._voetX || M; s.addText(`${meta.klas} · ${meta.kort || meta.titel}`, { x: x0, y: H - 0.45, w: W - x0 - M - 1.2, h: 0.3, fontFace: BODY, fontSize: 9, color: kl, margin: 0, isTextBox: true }); s.addText(`${nr} / ${tot}`, { x: W - M - 1, y: H - 0.45, w: 1, h: 0.3, fontFace: BODY, fontSize: 9, color: kl, align: 'right', margin: 0, isTextBox: true }); }
function bron(s, b) { if (b && b.bron) s.addNotes('Foto: ' + b.bron); }
function notities(s, tekst) { if (tekst) { const cur = s._notesTekst || ''; s._notesTekst = (cur ? cur + '\n' : '') + tekst; s.addNotes(s._notesTekst); } }

function slideTitel(p, les, meta, img) {
  const s = p.addSlide(); s.background = { color: K.wit };
  eyebrow(s, `${meta.klas} · lesweek ${meta.week} · ${meta.blokKort || meta.blok}`, M, 0.9, 6.4);
  const kort = les.kort || les.titel; const lw = Math.max(...kort.split(/s+/).map(w => w.length)); let tfs = kort.length > 45 ? 40 : 54; tfs = Math.min(tfs, Math.floor(6.6 / (lw * 0.0092))); titel(s, kort, M, 1.3, 6.6, 2.6, tfs);
  if (les.vraag) s.addText(les.vraag, { x: M, y: 4.0, w: 6.2, h: 1.2, fontFace: BODY, fontSize: 22, italic: true, color: K.accent, margin: 0, isTextBox: true, valign: 'top' });
  pil(s, `${les.fasen.reduce((a, f) => a + f.min, 0)} minuten`, M, 5.6, 1.5);
  pil(s, meta.code || 'les', M + 1.65, 5.6, 1.1, { fill: K.zand, color: K.inkt });
  fotoRond(s, img && img.pad, 7.4, 0, W - 7.4, H);
  bron(s, img); notities(s, les.docentTitel || '');
  return s;
}
function slideAgenda(p, les, meta, img) {
  const s = p.addSlide(); s.background = { color: K.wit };
  eyebrow(s, 'Zo ziet de les eruit', M, 0.55, 8);
  titel(s, 'Vandaag in ' + les.fasen.reduce((a, f) => a + f.min, 0) + ' minuten', M, 0.85, 8, 0.9, 40);
  const n = les.fasen.length; const gap = 0.2; const bw = (W - 2 * M - gap * (n - 1)) / n; const y = 2.2;
  les.fasen.forEach((f, i) => {
    const x = M + i * (bw + gap); kaart(s, x, y, bw, 2.7);
    s.addShape('ellipse', { x: x + 0.25, y: y + 0.25, w: 0.5, h: 0.5, fill: { color: K.fase[f.soort] }, line: { color: K.fase[f.soort], width: 0 } });
    s.addText(String(i + 1), { x: x + 0.25, y: y + 0.25, w: 0.5, h: 0.5, fontFace: KOPB, fontSize: 14, bold: true, color: K.wit, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addText(K.faseNaam[f.soort] + ' · ' + f.min + ' min', { x: x + 0.85, y: y + 0.3, w: bw - 1.05, h: 0.4, fontFace: KOPB, fontSize: 11, bold: true, color: K.fase[f.soort], margin: 0, isTextBox: true, valign: 'middle' });
    s.addText(f.kop, { x: x + 0.25, y: y + 0.95, w: bw - 0.5, h: 2.2, fontFace: KOPB, fontSize: 15, bold: true, color: K.inkt, margin: 0, isTextBox: true, valign: 'top' });
  });
  return s;
}
function slideDoel(p, les, meta, img) {
  const s = p.addSlide(); s.background = { color: K.wit };
  eyebrow(s, 'Aan het eind van deze les', M, 0.55, 7);
  const dfs = les.doel.length > 150 ? 24 : les.doel.length > 100 ? 28 : 32; const dl = regels(les.doel, dfs, 7.2); titel(s, les.doel, M, 0.9, 7.2, dl * regelH(dfs) + 0.2, dfs);
  const y0 = Math.max(3.3, 0.9 + dl * regelH(dfs) + 0.35); kaart(s, M, y0, 7.2, 0.5 + les.criteria.length * 0.62);
  s.addText('Succescriteria', { x: M + 0.3, y: y0 + 0.15, w: 6, h: 0.35, fontFace: KOPB, fontSize: 12, bold: true, color: K.accent, margin: 0, isTextBox: true });
  les.criteria.forEach((c, i) => {
    const y = y0 + 0.55 + i * 0.62;
    s.addShape('rect', { x: M + 0.3, y: y + 0.1, w: 0.3, h: 0.3, fill: { color: K.wit }, line: { color: K.inkt, width: 1.25 } });
    s.addText(c, { x: M + 0.75, y, w: 6.2, h: 0.5, fontFace: BODY, fontSize: 15, color: K.tekst, margin: 0, isTextBox: true, valign: 'middle' });
  });
  if (img && img.pad) { fotoRond(s, img.pad, 8.3, 0.9, W - 8.3 - M, H - 1.8); bron(s, img); }
  return s;
}
function slideFase(p, les, meta, f, i, img, extra) {
  const s = p.addSlide(); s.background = { color: K.wit };
  const kl = K.fase[f.soort];
  s.addShape('ellipse', { x: M, y: 0.5, w: 0.55, h: 0.55, fill: { color: kl }, line: { color: kl, width: 0 } });
  s.addText(String(i + 1), { x: M, y: 0.5, w: 0.55, h: 0.55, fontFace: KOPB, fontSize: 15, bold: true, color: K.wit, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
  eyebrow(s, `${K.faseNaam[f.soort]} · fase ${i + 1} van ${les.fasen.length}`, M + 0.7, 0.62, 6, kl);
  pil(s, f.min + ' min', W - M - 1.2, 0.6, 1.2);
  const heeftFoto = !!(img && img.pad); const breed = !!(extra && extra.breed); const rechts = heeftFoto || (!!extra && !breed); const tw = rechts ? 7.0 : W - 2 * M;
  const kl34 = regels(f.kop, 34, tw); titel(s, f.kop, M, 1.3, tw, kl34 * regelH(34) + 0.1, 34);
  const n = (f.stappen || []).length; const groot0 = n <= 3 && !breed;
  const y0 = Math.max(breed ? 2.55 : n > 3 ? 2.75 : 3.0, 1.3 + kl34 * regelH(34) + 0.25);
  const meet = (fs, groot) => { let yy = y0; const h = []; (f.stappen || []).forEach(st => { const rl = regels(st, fs, tw - 0.45, 0.0068); h.push(rl * regelH(fs) + 0.1); yy += rl * regelH(fs) + (groot ? 0.3 : breed ? 0.18 : 0.22); }); return { yy, h }; };
  const limiet = (f.klaar ? H - 1.6 : H - 0.6) - 0.2;
  let groot = groot0, fs = groot ? 18 : 15, m = meet(fs, groot);
  if (m.yy > limiet && groot) { groot = false; fs = 15; m = meet(fs, groot); }
  if (m.yy > limiet) { fs = 13; m = meet(fs, groot); }
  let y = y0;
  (f.stappen || []).forEach((st, j) => {
    s.addText(String(j + 1), { x: M, y, w: 0.4, h: 0.5, fontFace: KOP, fontSize: groot ? 26 : 22, bold: true, color: kl, margin: 0, isTextBox: true, valign: 'top' });
    s.addText(st, { x: M + 0.45, y: y + 0.04, w: tw - 0.45, h: m.h[j], fontFace: BODY, fontSize: fs, color: K.tekst, margin: 0, isTextBox: true, valign: 'top' });
    y += m.h[j] - 0.1 + (groot ? 0.3 : breed ? 0.18 : 0.22);
  });
  if (f.klaar) { const ky = breed ? H - 1.55 : Math.min(Math.max(y + 0.2, 5.4), H - 1.6); kaart(s, M, ky, tw, 0.95); s.addText([{ text: 'Klaar? ', options: { bold: true, color: K.accent, fontFace: KOPB } }, { text: f.klaar, options: { color: K.tekst } }], { x: M + 0.25, y: ky + 0.1, w: tw - 0.5, h: 0.75, fontFace: BODY, fontSize: 13, margin: 0, isTextBox: true, valign: 'middle' }); }
  if (heeftFoto) { fotoRond(s, img.pad, 8.0, 1.3, W - 8.0 - M, H - 2.3); bron(s, img); }
  if (extra && !breed) extra(s, { x: 8.0, y: 1.3, w: W - 8.0 - M, h: H - 2.3 });
  if (extra && breed) extra(s, { x: M, y: Math.max(y, 4.4), w: W - 2 * M, h: 1.8 });
  notities(s, f.docent || '');
  return s;
}
function slideCheck(p, les, meta) {
  const s = p.addSlide(); s.background = { color: K.fase.check }; s._voetKleur = 'D9CCF5';
  eyebrow(s, 'Check · ' + les.formatief.soort, M, 0.9, 10, 'E5D9FF');
  s.addText(les.formatief.tekst, { x: M, y: 1.4, w: W - 2 * M, h: 4.5, fontFace: KOP, fontSize: 44, bold: true, color: K.wit, margin: 0, isTextBox: true, valign: 'middle' });
  return s;
}
function slideRodeDraad(p, les, meta, img) {
  const s = p.addSlide(); s.background = { color: K.wit };
  fotoRond(s, img && img.pad, 0, 0, 6.2, H); bron(s, img); s._voetX = 6.9;
  eyebrow(s, 'Rode draad', 6.9, 1.2, 6);
  s.addText(les.identiteit, { x: 6.9, y: 1.7, w: W - 6.9 - M, h: 4.5, fontFace: KOP, fontSize: 30, bold: true, color: K.inkt, margin: 0, isTextBox: true, valign: 'top', lineSpacingMultiple: 1.05 });
  return s;
}
function slideThuis(p, les, meta, thuis) {
  const s = p.addSlide(); s.background = { color: K.wit };
  eyebrow(s, 'Thuis', M, 0.55, 8); titel(s, 'Voor de volgende les', M, 0.9, 10, 0.9, 40);
  const items = []; if (thuis.mb) items.push(['Musicbox', thuis.mb]); if (thuis.learn) items.push(['Leren', thuis.learn]); if (thuis.info) items.push(['Lezen', thuis.info]); if (thuis.extra) items.push(['Opdracht', thuis.extra]);
  const n = Math.max(items.length, 1); const gap = 0.25; const bw = Math.min(4, (W - 2 * M - gap * (n - 1)) / n);
  items.forEach(([k, v], i) => { const x = M + i * (bw + gap); kaart(s, x, 2.3, bw, 2.4); s.addText(k.toUpperCase(), { x: x + 0.3, y: 2.5, w: bw - 0.6, h: 0.35, fontFace: KOPB, fontSize: 11, bold: true, color: K.accent, charSpacing: 2, margin: 0, isTextBox: true }); s.addText(v, { x: x + 0.3, y: 2.95, w: bw - 0.6, h: 1.6, fontFace: KOPB, fontSize: 16, bold: true, color: K.inkt, margin: 0, isTextBox: true, valign: 'top' }); });
  s.addText('digitaal.musicboxmethode.nl', { x: M, y: 5.2, w: 8, h: 0.4, fontFace: BODY, fontSize: 14, color: K.accent, hyperlink: { url: 'https://digitaal.musicboxmethode.nl' }, margin: 0, isTextBox: true });
  return s;
}
// beeldelementen binnen een vak {x,y,w,h}
function akkoordDiagram(s, naam, x, y, w) { // gitaardiagram; w = breedte, hoogte ≈ 1.3 w
  const GIT = { G: '320003', C: 'x32010', D: 'xx0232', Em: '022000', Am: 'x02210', E: '022100', A: 'x02220', Dm: 'xx0231', F: '133211', Bm: 'x24432', D7: 'xx0212', G7: '320001', A7: 'x02020', E7: '020100' };
  const g = GIT[naam]; const kol = w / 5; const fr = (w * 1.0) / 4; const top = y + 0.32;
  kaart(s, x - 0.15, y - 0.1, w + 0.3, w * 1.0 + 0.95);
  for (let i = 0; i < 6; i++) s.addShape('line', { x: x + i * kol, y: top, w: 0, h: fr * 4, line: { color: K.inkt, width: 0.75 } });
  for (let j = 0; j <= 4; j++) s.addShape('line', { x, y: top + j * fr, w: kol * 5, h: 0, line: { color: K.inkt, width: j === 0 ? 2.5 : 0.75 } });
  if (g) g.split('').forEach((c, i) => { const cx = x + i * kol;
    if (c === 'x') s.addText('×', { x: cx - 0.12, y: y + 0.02, w: 0.24, h: 0.28, fontFace: BODY, fontSize: 10, color: K.inkt, align: 'center', margin: 0, isTextBox: true });
    else if (c === '0') s.addShape('ellipse', { x: cx - 0.07, y: y + 0.1, w: 0.14, h: 0.14, fill: { color: K.wit }, line: { color: K.inkt, width: 1 } });
    else { const f = +c; s.addShape('ellipse', { x: cx - 0.1, y: top + (f - 0.5) * fr - 0.1, w: 0.2, h: 0.2, fill: { color: K.accent }, line: { color: K.accent, width: 0 } }); } });
  s.addText(naam, { x: x - 0.15, y: top + fr * 4 + 0.12, w: w + 0.3, h: 0.45, fontFace: KOP, fontSize: 24, bold: true, color: K.inkt, align: 'center', margin: 0, isTextBox: true });
}
function beeldAkkoorden(items) { return (s, vak) => { const n = items.length; const w = Math.min(1.1, (vak.w - 0.3 * (n - 1)) / n - 0.3); items.forEach((a, i) => akkoordDiagram(s, a, vak.x + 0.15 + i * (w + 0.6), vak.y + 0.8, w)); }; }
function beeldVorm(items) { const fn = (s, vak) => { const VK = { intro: 'B8C1CC', couplet: '8FC1F5', refrein: 'F2A6A0', bridge: 'F2D38A', outro: 'B8C1CC' }; const tot = items.reduce((a, x) => a + (x.m || 4), 0);
  const minW = 0.85; const isVast = it => (it.m || 4) / tot * vak.w < minW; const vast = items.filter(isVast).length; const rest = vak.w - vast * minW; const flexTot = items.filter(it => !isVast(it)).reduce((a, x) => a + (x.m || 4), 0) || 1;
  const breedte = it => isVast(it) ? minW : (it.m || 4) / flexTot * rest; let x = vak.x; const y = vak.y + 0.25; const h = 1.0;
  items.forEach(it => { const w = breedte(it); const k = Object.keys(VK).find(k => it.d.toLowerCase().startsWith(k)); s.addShape('roundRect', { x: x + 0.03, y, w: w - 0.06, h, fill: { color: VK[k] || 'CCCCCC' }, line: { color: VK[k] || 'CCCCCC', width: 0 }, rectRadius: 0.08 }); s.addText([{ text: it.d, options: { bold: true, breakLine: true } }, { text: (it.m || 4) + ' maten', options: { fontSize: 9 } }], { x: x + 0.03, y, w: w - 0.06, h, fontFace: KOPB, fontSize: 11, color: K.inkt, align: 'center', valign: 'middle', margin: 0.02, isTextBox: true }); x += w; });
  s.addText(tot + ' maten · elk blok is een deel van de song', { x: vak.x, y: y + h + 0.12, w: vak.w, h: 0.3, fontFace: BODY, fontSize: 11, color: K.grijs, margin: 0, isTextBox: true }); };
  fn.breed = true; return fn; }
function _noop() {}
function beeldTabel(rijen, kol) { return (s, vak) => { const fr = kol || [0.55, 0.25, 0.2]; s.addTable(rijen.map((r, i) => r.map(c => ({ text: c, options: { bold: i === 0, color: i === 0 ? K.accent : K.tekst, fontFace: i === 0 ? KOPB : BODY, fontSize: 13, fill: { color: i === 0 ? K.wit : K.sand2 } } }))), { x: vak.x, y: vak.y + 0.4, w: vak.w, colW: fr.map(f => vak.w * f), border: { type: 'solid', color: K.lijn, pt: 0.5 }, rowH: 0.38, margin: 0.06 }); }; }
function beeldKaarten(items) { return (s, vak) => { const n = items.length; const kol = n > 3 ? 2 : 1; const rijen = Math.ceil(n / kol); const gap = 0.18; const bw = (vak.w - gap * (kol - 1)) / kol; const bh = Math.min(1.5, (vak.h - 0.4 - gap * (rijen - 1)) / rijen);
  items.forEach((it, i) => { const x = vak.x + (i % kol) * (bw + gap); const y = vak.y + 0.4 + Math.floor(i / kol) * (bh + gap); kaart(s, x, y, bw, bh); s.addText([{ text: it.k, options: { bold: true, fontFace: KOPB, fontSize: it.k.length > 14 && kol > 1 ? 12 : 14, breakLine: true } }, { text: it.t || '', options: { fontSize: 11, color: K.grijs } }], { x: x + 0.2, y: y + 0.12, w: bw - 0.4, h: bh - 0.24, fontFace: BODY, color: K.inkt, margin: 0, isTextBox: true, valign: 'top' }); }); }; }

async function maak(les, meta, opt) {
  // les: {titel, vraag, doel, criteria, fasen[{min,soort,kop,stappen,klaar,docent}], formatief, identiteit}
  // opt: {bestand, thuis, fotos:{titel,doel,fase:[...],rodeDraad}, extra:{faseIndex: fn}}
  K.accent = meta.accent || K.oranje; const p = nieuw(Object.assign({ titel: les.titel }, meta)); const F = opt.fotos || {};
  slideTitel(p, les, meta, F.titel);
  slideAgenda(p, les, meta);
  slideDoel(p, les, meta, F.doel);
  les.fasen.forEach((f, i) => slideFase(p, les, meta, f, i, (F.fase || [])[i], (opt.extra || {})[i]));
  if (les.formatief && les.formatief.tekst) slideCheck(p, les, meta);
  if (les.identiteit) slideRodeDraad(p, les, meta, F.rodeDraad);
  if (opt.thuis && Object.keys(opt.thuis).length) slideThuis(p, les, meta, opt.thuis);
  // voettekst en nummering
  p.slides.forEach((s, i) => { if (i > 0) voet(s, meta, i + 1, p.slides.length); });
  await p.writeFile({ fileName: opt.bestand });
  return opt.bestand;
}
module.exports = { maak, beeldAkkoorden, beeldVorm, beeldTabel, beeldKaarten, K, nieuw, slideTitel, slideAgenda, slideDoel, slideFase, slideCheck, slideRodeDraad, slideThuis, voet };
