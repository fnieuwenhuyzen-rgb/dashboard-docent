/* Reclame voor weekinfo en borden: concepttekst, mailtekst, afbeelding (canvas) en staande dia (pptx).
   Werkt met een genormaliseerde activiteit uit app.js: {id, soort: koor|muziek|excursie|examen, titel, ondertitel, d, aanvang, eind, plaats, zin, sluit, aanmeldlink, kosten, wie, toegang}. Met toegang 'ticket' zijn aanmeldlink, sluit en kosten de website, de besteldatum en de prijs.
   Huisstijl CSG Prins Maurits: paars #5B247F, rood #C5002E, alles in Encode Sans, koppen vet. Geen foto's. */
(() => {
'use strict';
const PAARS = '#5B247F', ROOD = '#C5002E', INKT = '#241c2b', GRIJS = '#6b6175', PAPIER = '#FBF8F4';
const KOP = '"Encode Sans", Arial, sans-serif', TEKST = KOP;
const DAG = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const DAGLANG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const MNDLANG = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const dOf = s => new Date(s + 'T12:00');
const kort = s => { const d = dOf(s); return `${DAG[d.getDay()]} ${d.getDate()} ${MND[d.getMonth()]}`; };
const lang = s => { const d = dOf(s); return `${DAGLANG[d.getDay()]} ${d.getDate()} ${MNDLANG[d.getMonth()]}`; };
const tijdNL = t => t ? String(t).replace(':', '.') : '';
const tijdRegel = a => a.aanvang ? (a.eind ? `${tijdNL(a.aanvang)} tot ${tijdNL(a.eind)} uur` : `${tijdNL(a.aanvang)} uur`) : '';
const isTicket = a => a.toegang === 'ticket';
const kortLink = l => String(l || '').trim().replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
function ticketUrl(a) { // volledige link voor de QR-code; '' als het geen website is
  if (!isTicket(a)) return '';
  let l = String(a.aanmeldlink || '').trim();
  if (!/^https?:\/\//i.test(l)) { if (!/^[\w-]+(\.[\w-]+)+([\/?#]|$)/.test(l)) return ''; l = 'https://' + l; }
  try { return new URL(l).href; } catch (e) { return ''; }
}
const LABEL = { koor: 'Prins Mauritskoor', muziek: 'Muziek', excursie: 'Excursie muziek', examen: 'Muziek · examen' };

/* ---------- teksten ---------- */
function zinVan(a) {
  if (a.zin) return a.zin;
  if (a.soort === 'koor') return `Het Prins Mauritskoor zingt: ${a.titel}.`;
  if (a.soort === 'examen') return `De examenleerlingen${a.wie ? ' van ' + a.wie : ''} geven hun examenconcert.`;
  if (a.soort === 'excursie') return `Ga mee naar ${a.titel}.`;
  return '';
}
function slotVan(a) {
  if (isTicket(a)) return 'Bestel op tijd en neem gerust iemand mee!';
  return { koor: 'Iedereen is welkom. Neem gerust iemand mee!', examen: 'Kom luisteren en moedig ze aan!', excursie: 'Ga je mee?', muziek: 'Iedereen is welkom!' }[a.soort] || '';
}
function aanmeldRegel(a) {
  if (!isTicket(a) && a.soort !== 'excursie' || !a.sluit && !a.aanmeldlink) return '';
  return (isTicket(a) ? 'Tickets bestellen' : 'Aanmelden') + (a.aanmeldlink ? ' via ' + a.aanmeldlink : '') + (a.sluit ? ', uiterlijk ' + lang(a.sluit) : '') + '.';
}
function tekst(a) { // concept voor de weekinfo: kop, wervende zin, wanneer en waar, slot. Korte zinnen, geen gedachtestreepjes.
  const r = [a.titel, ''];
  const z = zinVan(a); if (z) r.push(z, '');
  const t = tijdRegel(a);
  r.push('Wanneer: ' + lang(a.d) + (t ? ', ' + t : ''));
  if (a.plaats) r.push('Waar: ' + a.plaats);
  const am = aanmeldRegel(a); if (am) r.push(am);
  if (a.kosten && (isTicket(a) || a.soort === 'excursie')) r.push((isTicket(a) ? 'Prijs: ' : 'Kosten: ') + a.kosten);
  r.push('', slotVan(a));
  return r.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function mailWeekinfo(a, maandag, txt, afzender) {
  return { onderwerp: `Weekinfo ${kort(maandag)}: ${a.titel}`,
    body: `Hoi,\n\nWil je dit in de weekinfo van ${lang(maandag)} zetten? De afbeelding zit in de bijlage.\n\n${txt}\n\nGroet,\n${afzender || ''}`.trim() };
}
function mailBord(a, afzender) {
  return { onderwerp: `Bord: ${a.titel} (${kort(a.d)})`,
    body: `Hoi,\n\nIn de bijlage een staande dia voor de borden in school, voor ${a.titel} op ${lang(a.d)}. Wil je hem laten draaien tot en met ${lang(a.doel || a.d)}?\n\nGroet,\n${afzender || ''}`.trim() };
}
const veilig = s => String(s || '').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
const bestand = (a, soort) => `${soort === 'bord' ? 'Bord' : 'Weekinfo'} ${veilig(a.titel)} ${a.d}.${soort === 'bord' ? 'pptx' : 'png'}`;

/* ---------- tekenen ---------- */
async function fontsKlaar() {
  if (!document.fonts) return;
  try { await Promise.all([`900 100px ${KOP}`, `700 40px ${KOP}`, `400 40px ${TEKST}`].map(f => document.fonts.load(f))); } catch (e) {}
}
function regels(ctx, txt, maxW) { // woorden over regels verdelen
  const out = []; let r = '';
  for (const w of String(txt || '').split(/\s+/).filter(Boolean)) { const p = r ? r + ' ' + w : w; if (ctx.measureText(p).width <= maxW || !r) r = p; else { out.push(r); r = w; } }
  if (r) out.push(r); return out;
}
function pas(ctx, txt, font, max, min, maxW, maxR) { // grootste maat waarbij de tekst in maxR regels past
  for (let s = max; s >= min; s -= 4) { ctx.font = font(s); const L = regels(ctx, txt, maxW); if (L.length <= maxR && L.every(l => ctx.measureText(l).width <= maxW)) return { s, L }; }
  ctx.font = font(min); return { s: min, L: regels(ctx, txt, maxW).slice(0, maxR) };
}
function vorm(ctx, pts, kleur) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = kleur; ctx.fill(); }
function spatie(ctx, txt, x, y, sp) { // tekst met letterafstand
  if (ctx.letterSpacing !== undefined) { ctx.letterSpacing = sp + 'px'; ctx.fillText(txt, x, y); ctx.letterSpacing = '0px'; return; }
  let cx = x; for (const c of txt) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + sp; }
}
function ticketRegels(ctx, a, maxW, max, min) { // prijs en website, vet; een link die ook op de kleinste maat niet past, blijft weg (hij staat in de tekst)
  if (!isTicket(a)) return [];
  return [['Tickets', a.kosten].filter(Boolean).join(' '), kortLink(a.aanmeldlink)].filter(Boolean).map(txt => ({ txt, s: pas(ctx, txt, s => `700 ${s}px ${KOP}`, max, min, maxW, 1).s })).filter(r => { ctx.font = `700 ${r.s}px ${KOP}`; return ctx.measureText(r.txt).width <= maxW; });
}
function cta(a) { // tekst in de rode hoek
  if (isTicket(a)) return a.sluit ? ['Tickets', 't/m ' + kort(a.sluit)] : ['Tickets', 'bestellen'];
  if (a.soort === 'excursie') return a.sluit ? ['Aanmelden', 't/m ' + kort(a.sluit)] : ['Ga je mee?'];
  if (a.soort === 'examen') return ['Kom', 'luisteren!'];
  return ['Iedereen', 'welkom'];
}
function staf(ctx, x0, x1, y, af, kleur) { ctx.strokeStyle = kleur; ctx.lineWidth = 3; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x0, y + i * af); ctx.lineTo(x1, y + i * af); ctx.stroke(); } }
function hoek(ctx, a, W, H, wb, hb, max, pad) { // rode hoek rechtsonder; de oproep past binnen de schuine rand
  vorm(ctx, [[W, H - hb], [W, H], [W - wb, H]], ROOD);
  const C = cta(a).map(l => l.toUpperCase()); const links = y => W - wb * (y - (H - hb)) / hb + 24;
  let s = max; for (; s > 30; s -= 2) { ctx.font = `900 ${s}px ${KOP}`; const ok = C.every((l, i) => { const base = H - pad - (C.length - 1 - i) * s * 1.02; return W - pad - ctx.measureText(l).width >= links(base - s * 0.74); }); if (ok) break; }
  ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; C.forEach((l, i) => ctx.fillText(l, W - pad, H - pad - (C.length - 1 - i) * s * 1.02)); ctx.textAlign = 'left';
}
function qrTeken(ctx, q, x, y, maat) { // zwart op wit met vrije rand, hele pixels per blokje: dan blijft hij scanbaar
  const n = q.getModuleCount(), c = Math.floor(maat / (n + 8)), o = Math.floor((maat - c * n) / 2);
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, maat, maat); ctx.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) ctx.fillRect(x + o + k * c, y + o + r * c, c, c);
}
function bord(ctx, a, W, H, q) { // staand paneel 1080 x 1920; alles boven de rode hoek. Met een QR-code staat die op de plek van de wervende zin
  const M = 76, GRENS = H - 560; ctx.fillStyle = PAPIER; ctx.fillRect(0, 0, W, H);
  vorm(ctx, [[0, 0], [W, 0], [W, 190], [0, 330]], ROOD);
  ctx.fillStyle = '#fff'; ctx.font = `700 42px ${KOP}`; ctx.textBaseline = 'alphabetic'; spatie(ctx, 'CSG PRINS MAURITS', M, 112, 5);
  const info = [tijdRegel(a), a.plaats].filter(Boolean).join(' · '); let z = q ? '' : zinVan(a);
  const TK = ticketRegels(ctx, a, W - 2 * M, 54, 30);
  const WB = 900, HB = 520; const hoekLinks = y => y <= H - HB ? W : W - WB * (y - (H - HB)) / HB;
  const maak = (tmax, zs) => { // opmaak bij een titel- en zinmaat; past = alles blijft vrij van de rode hoek
    const T = pas(ctx, a.titel, s => `900 ${s}px ${KOP}`, tmax, 90, W - 2 * M, 3);
    let y = 470 + T.s * 0.95 + (T.L.length - 1) * T.s * 0.9; const ond = a.ondertitel ? (y += 92) : 0;
    const top = y + 150; ctx.font = `400 54px ${TEKST}`; const iL = regels(ctx, info, W - 2 * M).slice(0, 3); const hoog = 230 + (iL.length + TK.length) * 66;
    const Z = z ? pas(ctx, z, s => `400 ${s}px ${TEKST}`, zs, zs, W - 2 * M - 40, 6) : { s: 0, L: [] };
    let past = top + hoog <= H - HB - 20; ctx.font = `400 ${Z.s}px ${TEKST}`;
    Z.L.forEach((l, i) => { const yb = top + hoog + 150 + i * Z.s * 1.25; if (yb > H - 70 || M + ctx.measureText(l).width > hoekLinks(yb) - 24) past = false; });
    let qs = 0; const qy = top + hoog + 90;
    if (q) { for (let s = 400; s >= 280 && !qs; s -= 20) if (qy + s <= H - 70 && M + s <= hoekLinks(qy + s) - 24) qs = s; if (!qs || qs < 400 && tmax > 100) past = false; }
    return { T, ond, top, iL, hoog, Z, past, qs, qy };
  };
  let L = null;
  const zoek = () => { for (let tmax = 230; tmax >= 100; tmax -= 10) for (let zs = 62; zs >= 40; zs -= 4) { L = maak(tmax, zs); if (L.past) return; } };
  zoek(); if (!L.past && z) { z = ''; zoek(); } // past het niet, dan vervalt de wervende zin (die staat in de weekinfo)
  ctx.fillStyle = ROOD; ctx.font = `700 46px ${KOP}`; spatie(ctx, LABEL[a.soort].toUpperCase(), M, 470, 6);
  ctx.fillStyle = PAARS; ctx.font = `900 ${L.T.s}px ${KOP}`; L.T.L.forEach((l, i) => ctx.fillText(l, M - 4, 470 + L.T.s * 0.95 + i * L.T.s * 0.9));
  if (L.ond) { ctx.fillStyle = GRIJS; ctx.font = `400 68px ${TEKST}`; ctx.fillText(a.ondertitel, M, L.ond); }
  const top = L.top; staf(ctx, 0, W, top - 120, 20, 'rgba(91,36,127,.22)');
  vorm(ctx, [[0, top + 40], [W, top], [W, top + L.hoog], [0, top + L.hoog + 40]], PAARS);
  ctx.fillStyle = '#fff'; const D = pas(ctx, kort(a.d).toUpperCase(), s => `900 ${s}px ${KOP}`, 150, 90, W - 2 * M, 1); ctx.fillText(D.L[0], M - 4, top + 190);
  ctx.font = `400 54px ${TEKST}`; L.iL.forEach((l, i) => ctx.fillText(l, M, top + 270 + i * 66));
  TK.forEach((r, i) => { ctx.font = `700 ${r.s}px ${KOP}`; ctx.fillText(r.txt, M, top + 270 + (L.iL.length + i) * 66); });
  ctx.fillStyle = INKT; ctx.font = `400 ${L.Z.s}px ${TEKST}`; L.Z.L.forEach((l, i) => ctx.fillText(l, M, top + L.hoog + 150 + i * L.Z.s * 1.25));
  if (L.qs) {
    qrTeken(ctx, q, M, L.qy, L.qs);
    const x = M + L.qs + 40; ctx.fillStyle = PAARS; ctx.font = `900 62px ${KOP}`;
    ['Scan en', 'bestel'].forEach((l, i) => ctx.fillText(l, x, L.qy + 62 + i * 72));
  }
  hoek(ctx, a, W, H, WB, HB, 92, 64);
}
function weekinfo(ctx, a, W, H, q) { // liggend 1600 x 900
  const M = 80; ctx.fillStyle = PAPIER; ctx.fillRect(0, 0, W, H);
  vorm(ctx, [[0, 0], [W, 0], [W, 60], [0, 130]], ROOD);
  ctx.fillStyle = '#fff'; ctx.font = `700 32px ${KOP}`; ctx.textBaseline = 'alphabetic'; spatie(ctx, 'CSG PRINS MAURITS', M, 72, 4);
  const R = 1010; // begin van het paarse paneel
  vorm(ctx, [[R + 70, 60], [W, 60], [W, H], [R - 20, H]], PAARS);
  ctx.fillStyle = ROOD; ctx.font = `700 36px ${KOP}`; spatie(ctx, LABEL[a.soort].toUpperCase(), M, 240, 5);
  const z = zinVan(a); let T, Z, y;
  for (let tmax = 170; ; tmax -= 8) { // titel kleiner tot de zin erbij past
    T = pas(ctx, a.titel, s => `900 ${s}px ${KOP}`, tmax, 70, R - M - 60, 2); y = 240 + T.s * 0.95 + (T.L.length - 1) * T.s * 0.9 + (a.ondertitel ? 70 : 0);
    Z = z ? pas(ctx, z, s => `400 ${s}px ${TEKST}`, 42, 30, R - M - 80, 4) : { s: 0, L: [] };
    if (y + 90 + (Z.L.length - 1) * Z.s * 1.25 <= H - 60 || tmax <= 80) break;
  }
  ctx.fillStyle = PAARS; ctx.font = `900 ${T.s}px ${KOP}`; T.L.forEach((l, i) => ctx.fillText(l, M - 3, 240 + T.s * 0.95 + i * T.s * 0.9));
  if (a.ondertitel) { ctx.fillStyle = GRIJS; ctx.font = `400 50px ${TEKST}`; ctx.fillText(a.ondertitel, M, y); }
  ctx.fillStyle = INKT; ctx.font = `400 ${Z.s}px ${TEKST}`; Z.L.forEach((l, i) => ctx.fillText(l, M, y + 90 + i * Z.s * 1.25));
  const dx = R + 70; ctx.fillStyle = '#fff'; const D = pas(ctx, kort(a.d).toUpperCase(), s => `900 ${s}px ${KOP}`, 112, 60, W - dx - 50, 1); ctx.fillText(D.L[0], dx, 290);
  ctx.font = `400 44px ${TEKST}`; let iy = 380; for (const l of [tijdRegel(a), a.plaats].filter(Boolean)) for (const r of regels(ctx, l, W - dx - 60).slice(0, 3)) { ctx.fillText(r, dx, iy); iy += 56; }
  for (const r of ticketRegels(ctx, a, W - dx - 60, 44, 28)) { ctx.font = `700 ${r.s}px ${KOP}`; ctx.fillText(r.txt, dx, iy); iy += 56; }
  if (q) for (let s = 200; s >= 130; s -= 10) { const y = iy - 24; if (y + s <= H - 24 && dx + s < W - 640 * (y + s - (H - 300)) / 300 - 16) { qrTeken(ctx, q, dx, y, s); break; } }
  hoek(ctx, a, W, H, 640, 300, 56, 44);
}
async function beeld(a, soort) {
  await fontsKlaar();
  const c = document.createElement('canvas'); const [W, H] = soort === 'bord' ? [1080, 1920] : [1600, 900];
  c.width = W; c.height = H; const ctx = c.getContext('2d');
  (soort === 'bord' ? bord : weekinfo)(ctx, a, W, H, await qrVan(a)); return c;
}
let qrLaden = null;
function laadQr() {
  if (window.qrcode) return Promise.resolve();
  return qrLaden = qrLaden || new Promise((ok, fout) => { const s = document.createElement('script'); s.src = 'vendor/qrcode.js'; s.onload = ok; s.onerror = () => { qrLaden = null; fout(new Error('qr-bibliotheek niet geladen')); }; document.head.append(s); });
}
async function qrVan(a) { // lukt het niet, dan zonder QR-code: de website staat ook in de tekst
  const u = ticketUrl(a); if (!u) return null;
  try { await laadQr(); const q = window.qrcode(0, 'M'); q.addData(u); q.make(); return q; } catch (e) { console.warn(e); return null; }
}
const png = c => new Promise(r => c.toBlob(r, 'image/png'));
let pptxLaden = null;
function laadPptx() {
  if (window.PptxGenJS) return Promise.resolve();
  return pptxLaden = pptxLaden || new Promise((ok, fout) => { const s = document.createElement('script'); s.src = 'vendor/pptxgen.bundle.js'; s.onload = ok; s.onerror = () => { pptxLaden = null; fout(new Error('pptx-bibliotheek niet geladen')); }; document.head.append(s); });
}
async function pptx(a, notitie) { // staande dia 9:16 (7,5 x 13,333 inch) met het bord als afbeelding: ziet er op elk scherm hetzelfde uit
  await laadPptx(); const c = await beeld(a, 'bord');
  const p = new window.PptxGenJS(); p.defineLayout({ name: 'STAAND', width: 7.5, height: 13.333 }); p.layout = 'STAAND';
  p.title = a.titel; p.company = 'CSG Prins Maurits';
  const s = p.addSlide(); s.background = { color: 'FBF8F4' }; s.addImage({ data: c.toDataURL('image/png'), x: 0, y: 0, w: 7.5, h: 13.333 });
  if (notitie) s.addNotes(notitie);
  return p.write({ outputType: 'blob' });
}
window.RECLAME = { tekst, mailWeekinfo, mailBord, beeld, png, pptx, bestand, tijdRegel, LABEL };
})();
