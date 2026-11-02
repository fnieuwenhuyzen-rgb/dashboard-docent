// Feedbackblad als pdf, in de browser gemaakt met Encode Sans (vendor/fonts, SIL OFL). Geen bibliotheek: een klein A4-pdf met ingesloten TrueType-letters.
window.BMPDF = (() => {
'use strict';
const ACC = [0x8C / 255, 0x23 / 255, 0x32 / 255], ZAND = [0xF3 / 255, 0xEE / 255, 0xE6 / 255], INKT = [0.11, 0.11, 0.1], GRIJS = [0.36, 0.34, 0.31];
const W = 595.28, H = 841.89, M = 44;
const hex4 = n => n.toString(16).padStart(4, '0');
const getal = x => (Math.round(x * 100) / 100).toString();
const enc = new TextEncoder();

/* ---------- letters ---------- */
function leesFont(buf) {
  const d = new DataView(buf); const tab = {}; const n = d.getUint16(4);
  for (let i = 0; i < n; i++) { const o = 12 + i * 16; tab[String.fromCharCode(d.getUint8(o), d.getUint8(o + 1), d.getUint8(o + 2), d.getUint8(o + 3))] = d.getUint32(o + 8); }
  const upm = d.getUint16(tab.head + 18), bbox = [0, 2, 4, 6].map(i => d.getInt16(tab.head + 36 + i));
  const asc = d.getInt16(tab.hhea + 4), desc = d.getInt16(tab.hhea + 6), nH = d.getUint16(tab.hhea + 34);
  const breedte = g => d.getUint16(tab.hmtx + Math.min(g, nH - 1) * 4);
  let cm = 0; const nc = d.getUint16(tab.cmap + 2); // Unicode BMP (formaat 4)
  for (let i = 0; i < nc; i++) { const o = tab.cmap + 4 + i * 8; const sub = tab.cmap + d.getUint32(o + 4); if (d.getUint16(o) === 3 && d.getUint16(o + 2) === 1 && d.getUint16(sub) === 4) cm = sub; }
  const sc = d.getUint16(cm + 6) / 2; const endO = cm + 14, startO = endO + sc * 2 + 2, deltaO = startO + sc * 2, rangeO = deltaO + sc * 2;
  const glyf = c => { if (c > 0xFFFF) return 0; for (let i = 0; i < sc; i++) { if (c <= d.getUint16(endO + i * 2)) { const st = d.getUint16(startO + i * 2); if (c < st) return 0; const dl = d.getInt16(deltaO + i * 2), r = d.getUint16(rangeO + i * 2); if (!r) return (c + dl) & 0xFFFF; const g = d.getUint16(rangeO + i * 2 + r + (c - st) * 2); return g ? (g + dl) & 0xFFFF : 0; } } return 0; };
  const uit = { buf, upm, bbox, asc, desc, breedte, glyf, gebruikt: new Map() };
  uit.gid = ch => { let c = ch.codePointAt(0); let g = glyf(c); if (!g) { const k = ch.normalize('NFD')[0]; g = glyf(k.codePointAt(0)); if (g) c = k.codePointAt(0); else { c = 63; g = glyf(63); } } if (!uit.gebruikt.has(g)) uit.gebruikt.set(g, c); return g; };
  uit.maat = (t, pt) => { let s = 0; for (const ch of String(t)) s += breedte(uit.gid(ch)); return s * pt / upm; };
  return uit;
}
let fontsP = null;
const laadFonts = () => fontsP || (fontsP = Promise.all(['Light', 'Bold'].map(n => fetch(`vendor/fonts/EncodeSans-${n}.ttf`).then(r => { if (!r.ok) throw new Error('letter niet gevonden'); return r.arrayBuffer(); }))).catch(e => { fontsP = null; throw e; }));
async function pak(bytes) { // zlib via de browser; zonder CompressionStream ongecomprimeerd
  if (typeof CompressionStream === 'undefined') return { b: bytes, f: '' };
  const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate')); return { b: new Uint8Array(await new Response(s).arrayBuffer()), f: '/Filter /FlateDecode ' };
}

/* ---------- blad opbouwen ---------- */
class Blad {
  constructor(fL, fB) { this.f = { L: fL, B: fB }; this.pag = []; this.nieuw(); }
  nieuw() { this.c = []; this.pag.push(this.c); this.y = H - M; }
  ruimte(h) { if (this.y - h < M + 16) this.nieuw(); }
  kleur(k) { this.c.push(`${k.map(getal).join(' ')} rg`); }
  tekst(x, y, t, n, pt, k) { const f = this.f[n]; let h = ''; for (const ch of String(t)) h += hex4(f.gid(ch)); this.kleur(k || INKT); this.c.push(`BT /F${n} ${getal(pt)} Tf ${getal(x)} ${getal(y)} Td <${h}> Tj ET`); }
  vlak(x, y, b, h, k) { this.kleur(k); this.c.push(`${getal(x)} ${getal(y)} ${getal(b)} ${getal(h)} re f`); }
  regels(t, n, pt, b) { const f = this.f[n]; const uit = []; for (const al of String(t).split(/\r?\n/)) { let r = ''; for (const w of al.split(/\s+/).filter(Boolean)) { const p = r ? r + ' ' + w : w; if (r && f.maat(p, pt) > b) { uit.push(r); r = w; } else r = p; } uit.push(r); } return uit; }
  alinea(t, n, pt, x, b, k, lh) { const l = lh || pt * 1.32; for (const r of this.regels(t, n, pt, b)) { this.ruimte(l); this.y -= l; this.tekst(x, this.y + l * 0.24, r, n, pt, k); } }
}
function teken(i, fL, fB) {
  const p = new Blad(fL, fB); const B = W - 2 * M;
  p.alinea(i.eyebrow.toUpperCase(), 'B', 8, M, B, ACC); p.y -= 2;
  p.alinea(i.titel, 'B', 16, M, B, INKT); p.y -= 4;
  p.alinea(i.naam, 'B', 12.5, M, B, INKT); if (i.regel) p.alinea(i.regel, 'L', 9, M, B, GRIJS);
  if (i.banner) { p.y -= 6; p.ruimte(20); p.vlak(M, p.y - 18, B, 18, ACC); p.tekst(M + 6, p.y - 13, i.banner, 'B', 9, [1, 1, 1]); p.y -= 18; }
  p.y -= 6;
  const sb = 34;
  for (const o of i.onderdelen) {
    p.ruimte(40); p.vlak(M, p.y - 16, B, 16, ZAND); p.tekst(M + 5, p.y - 11.5, o.groep, 'B', 9.5); p.y -= 19;
    for (const c of o.crit) {
      const t = p.regels(c.tekst || '', 'L', 8.3, B - sb - 8); p.ruimte(14 + t.length * 11);
      const top = p.y; p.y -= 12; p.tekst(M + 5, p.y + 2, c.naam + (c.bron ? ` (${c.bron})` : ''), 'B', 9.3);
      const sc = c.score == null ? '–' : String(c.score); p.tekst(M + B - 5 - p.f.B.maat(sc, 13), top - 13, sc, 'B', 13, ACC);
      for (const r of t) { p.y -= 10.6; p.tekst(M + 5, p.y + 1.5, r, 'L', 8.3, GRIJS); }
      p.y -= 4;
    }
    if (o.opm) { p.alinea('Opmerking: ' + o.opm, 'L', 8.8, M + 5, B - 10, INKT, 11.4); p.y -= 3; }
    p.y -= 3;
  }
  if (i.vooruit) { p.y -= 2; p.alinea(i.vooruitKop, 'B', 9.5, M, B, INKT); p.alinea(i.vooruit, 'L', 9.2, M, B, INKT, 12); }
  p.y -= 8; p.ruimte(30 + i.cijfers.length * 15);
  for (const [l, w, sterk] of i.cijfers) { const pt = sterk ? 13 : 10; p.y -= pt + 4; const s = w == null || w === '' ? '–' : String(w); p.tekst(M + 5, p.y, l, sterk ? 'B' : 'L', pt); p.tekst(M + B - 5 - p.f.B.maat(s, pt), p.y, s, 'B', pt, sterk ? ACC : INKT); }
  p.pag.forEach((c, n) => { p.kleur.call({ c }, GRIJS); const t = i.voet + (p.pag.length > 1 ? ` · blad ${n + 1} van ${p.pag.length}` : ''); let h = ''; for (const ch of t) h += hex4(fL.gid(ch)); c.push(`BT /FL 7.5 Tf ${M} ${M - 8} Td <${h}> Tj ET`); });
  return p;
}

/* ---------- pdf schrijven ---------- */
function toUni(f) { const rij = [...f.gebruikt.entries()]; let s = '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n';
  for (let i = 0; i < rij.length; i += 100) { const d = rij.slice(i, i + 100); s += `${d.length} beginbfchar\n${d.map(([g, c]) => `<${hex4(g)}> <${hex4(c)}>`).join('\n')}\nendbfchar\n`; } return s + 'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n'; }
async function schrijf(p, titel) {
  const obj = []; const zet = (i, x) => { obj[i] = x; return i; }; let nr = 3; const nieuw = () => nr++;
  const stroom = async (dict, bytes) => { const z = await pak(bytes); return [`<< ${dict}${z.f}/Length ${z.b.length} >>\nstream\n`, z.b, '\nendstream']; };
  const fonts = {};
  for (const [n, f] of Object.entries(p.f)) {
    const s = 1000 / f.upm; const file = nieuw(), desc = nieuw(), cid = nieuw(), uni = nieuw(), top = nieuw(); const naam = n === 'B' ? 'EncodeSans-Bold' : 'EncodeSans-Light';
    const bytes = new Uint8Array(f.buf); zet(file, await stroom(`/Length1 ${bytes.length} `, bytes));
    zet(desc, `<< /Type /FontDescriptor /FontName /${naam} /Flags 32 /FontBBox [${f.bbox.map(x => Math.round(x * s)).join(' ')}] /ItalicAngle 0 /Ascent ${Math.round(f.asc * s)} /Descent ${Math.round(f.desc * s)} /CapHeight ${Math.round(f.asc * s * 0.8)} /StemV ${n === 'B' ? 120 : 60} /FontFile2 ${file} 0 R >>`);
    const w = [...f.gebruikt.keys()].sort((a, b) => a - b).map(g => `${g} [${Math.round(f.breedte(g) * s)}]`).join(' ');
    zet(cid, `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${naam} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${desc} 0 R /W [${w}] /DW 500 /CIDToGIDMap /Identity >>`);
    zet(uni, await stroom('', enc.encode(toUni(f))));
    zet(top, `<< /Type /Font /Subtype /Type0 /BaseFont /${naam} /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${uni} 0 R >>`); fonts[n] = top;
  }
  const kids = [];
  for (const c of p.pag) { const inh = nieuw(), pg = nieuw(); zet(inh, await stroom('', enc.encode(c.join('\n')))); zet(pg, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${inh} 0 R /Resources << /Font << /FL ${fonts.L} 0 R /FB ${fonts.B} 0 R >> >> >>`); kids.push(`${pg} 0 R`); }
  zet(2, `<< /Type /Pages /Count ${kids.length} /Kids [${kids.join(' ')}] >>`);
  const info = nieuw(); let th = 'FEFF'; for (const ch of titel) { const c = ch.codePointAt(0); if (c < 0x10000) th += hex4(c).toUpperCase(); } zet(info, `<< /Title <${th}> /Producer (Lesdag) >>`);
  const cat = nieuw(); zet(cat, `<< /Type /Catalog /Pages 2 0 R /Lang (nl-NL) >>`);
  const delen = ['%PDF-1.5\n%âãÏÓ\n'].map(x => Uint8Array.from(x, c => c.charCodeAt(0))); let pos = delen[0].length; const xref = [];
  const voeg = x => { const b = typeof x === 'string' ? enc.encode(x) : x; delen.push(b); pos += b.length; };
  for (let i = 2; i < nr; i++) { xref[i] = pos; voeg(`${i} 0 obj\n`); const o = obj[i]; if (Array.isArray(o)) o.forEach(voeg); else voeg(o); voeg('\nendobj\n'); }
  const xs = pos; let t = `xref\n0 ${nr}\n0000000000 65535 f \n0000000000 65535 f \n`; for (let i = 2; i < nr; i++) t += String(xref[i]).padStart(10, '0') + ' 00000 n \n';
  // object 1 is niet in gebruik: als vrij gemarkeerd
  t += `trailer\n<< /Size ${nr} /Root ${cat} 0 R /Info ${info} 0 R >>\nstartxref\n${xs}\n%%EOF\n`; voeg(t);
  return new Blob(delen, { type: 'application/pdf' });
}
async function blad(info) { const [l, b] = await laadFonts(); const fL = leesFont(l), fB = leesFont(b); return schrijf(teken(info, fL, fB), info.docTitel || info.titel); }

/* ---------- zip voor alle bladen (zonder compressie; pdf is al gecomprimeerd) ---------- */
const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
async function zip(bestanden) {
  const d = new Date(); const tijd = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dat = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const uit = [], cen = []; let pos = 0;
  const kop = (sig, n, naam, crc, len, extra) => { const b = new DataView(new ArrayBuffer(n)); let o = 0; const u32 = x => { b.setUint32(o, x, true); o += 4; }, u16 = x => { b.setUint16(o, x, true); o += 2; }; u32(sig); if (extra != null) u16(20); u16(20); u16(0x0800); u16(0); u16(tijd); u16(dat); u32(crc); u32(len); u32(len); u16(naam.length); u16(0); if (extra != null) { u16(0); u16(0); u16(0); u32(0); u32(extra); } return new Uint8Array(b.buffer); };
  for (const f of bestanden) { const inh = new Uint8Array(await f.blob.arrayBuffer()); const naam = enc.encode(f.naam); const crc = crc32(inh); const l = kop(0x04034b50, 30, naam, crc, inh.length); cen.push(kop(0x02014b50, 46, naam, crc, inh.length, pos), naam); uit.push(l, naam, inh); pos += l.length + naam.length + inh.length; }
  const cl = cen.reduce((a, x) => a + x.length, 0); const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, bestanden.length, true); e.setUint16(10, bestanden.length, true); e.setUint32(12, cl, true); e.setUint32(16, pos, true);
  return new Blob([...uit, ...cen, e.buffer], { type: 'application/zip' });
}
return { blad, zip };
})();
