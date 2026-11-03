// Tekent het notenbeeld van het keuzeuur als png in de beeldmap van de lessen. Gebruikt Edge headless; g-sleutel en rusten komen uit Segoe UI Symbol.
// Maat 1420 x 1560: de verhouding van het fotokader op een fasedia, dus er wordt niets afgesneden.
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const MAP = 'C:/Users/nwn/OneDrive - CSG Prins Maurits/Documenten - Sectie Muziek/02 Keuzevak muziek/Havo/Keuzeuur havo 3/Lessen 2026-2027/beeld';
const W = 1420, H = 1560, INKT = '#1B1B1B', ACC = '#E8542A', F = "font-family:'Encode Sans','Segoe UI',sans-serif";
const LIJN = 24; // afstand tussen de notenlijnen
const tekst = (x, y, t, s, o = '') => `<text x="${x}" y="${y}" style="${F};font-size:${s}px;${o}">${t}</text>`;
function balk(x0, x1, y) { let s = ''; for (let i = 0; i < 5; i++) s += `<line x1="${x0}" x2="${x1}" y1="${y + i * LIJN}" y2="${y + i * LIJN}" stroke="${INKT}" stroke-width="2.5"/>`; return s; }
const sleutel = (x, y) => `<text x="${x}" y="${y + 4.05 * LIJN}" style="font-family:'Segoe UI Symbol';font-size:${LIJN * 6.6}px" fill="${INKT}">&#x1D11E;</text>`;
const maatsoort = (x, y) => `<text x="${x}" y="${y + 1.9 * LIJN}" style="${F};font-size:${LIJN * 2.3}px;font-weight:800">4</text><text x="${x}" y="${y + 3.95 * LIJN}" style="${F};font-size:${LIJN * 2.3}px;font-weight:800">4</text>`;
const streep = (x, y) => `<line x1="${x}" x2="${x}" y1="${y}" y2="${y + 4 * LIJN}" stroke="${INKT}" stroke-width="3"/>`;
// Noot op stap st: 0 is de onderste lijn (e), elke stap een lijn of ruimte hoger. dur: 4 hele, 2 halve, 1 kwart, .5 achtste.
function noot(x, y, st, dur, kleur = INKT, opt = {}) {
  const ny = y + 4 * LIJN - st * LIJN / 2; const open = dur >= 2; const rx = LIJN * 0.68, ry = LIJN * 0.48; let s = '';
  if (st <= -2) for (let k = -2; k >= st; k -= 2) s += `<line x1="${x - rx - 10}" x2="${x + rx + 10}" y1="${y + 4 * LIJN - k * LIJN / 2}" y2="${y + 4 * LIJN - k * LIJN / 2}" stroke="${INKT}" stroke-width="2.5"/>`;
  s += `<ellipse cx="${x}" cy="${ny}" rx="${rx}" ry="${ry}" transform="rotate(-20 ${x} ${ny})" fill="${open ? 'white' : kleur}" stroke="${kleur}" stroke-width="${open ? 4.5 : 1}"/>`;
  if (dur < 4) { const op = st < 4; const sx = op ? x + rx - 2 : x - rx + 2, y2 = op ? ny - LIJN * 3.3 : ny + LIJN * 3.3; s += `<line x1="${sx}" x2="${sx}" y1="${ny}" y2="${y2}" stroke="${kleur}" stroke-width="3.5"/>`;
    if (dur === .5 && !opt.geenVlag) s += `<path d="M${sx} ${y2} c 8 26 34 30 22 66 c 2 -26 -14 -34 -22 -38 z" fill="${kleur}"/>`; }
  if (opt.punt) s += `<circle cx="${x + rx + 14}" cy="${ny - (st % 2 === 0 ? LIJN / 2 : 0)}" r="5" fill="${kleur}"/>`;
  return s;
}
const RUST = { 1: 0x1D13D, .5: 0x1D13E };
function rust(x, y, dur, kleur = INKT) { if (dur === 4) return `<rect x="${x - 18}" y="${y + LIJN}" width="36" height="${LIJN / 2}" fill="${kleur}"/>`; if (dur === 2) return `<rect x="${x - 18}" y="${y + 1.5 * LIJN}" width="36" height="${LIJN / 2}" fill="${kleur}"/>`; return `<text x="${x}" y="${y + 3.05 * LIJN}" text-anchor="middle" style="font-family:'Segoe UI Symbol';font-size:${LIJN * 4.2}px" fill="${kleur}">&#x${RUST[dur].toString(16)};</text>`; }
// Eén notenbalk met maten. Een maat is een lijst [dur, st of null voor rust, punt?]; de afstand volgt de duur. Twee achtsten op één tel krijgen een waardestreep.
function regel(x0, x1, y, maten, opt = {}) {
  let s = balk(x0, x1, y); let x = x0 + 16; if (opt.sleutel) { s += sleutel(x - 8, y); x += 92; } if (opt.maatsoort) { s += maatsoort(x, y); x += 66; }
  const mw = (x1 - x) / maten.length;
  maten.forEach((m, i) => { const xm = x + i * mw; let t = 0; const paren = [];
    m.forEach(([dur, st, punt], j) => { const xn = xm + 30 + t / 4 * (mw - 58);
      if (st === null) s += rust(xn, y, dur);
      else { const balkt = dur === .5 && ((m[j + 1] && m[j + 1][0] === .5 && t % 1 === 0) || (m[j - 1] && m[j - 1][0] === .5 && t % 1 === .5)); if (balkt) paren.push([xn, st]); s += noot(xn, y, st, dur, INKT, { punt, geenVlag: balkt }); }
      t += dur * (punt ? 1.5 : 1); });
    for (let k = 0; k + 1 < paren.length; k += 2) { const [a, sa] = paren[k], [b, sb] = paren[k + 1]; const ya = y + 4 * LIJN - sa * LIJN / 2 - LIJN * 3.3, yb = y + 4 * LIJN - sb * LIJN / 2 - LIJN * 3.3, rx = LIJN * 0.68 - 2; s += `<line x1="${a + rx - 2}" x2="${b + rx + 2}" y1="${ya}" y2="${yb}" stroke="${INKT}" stroke-width="10"/>`; }
    s += streep(xm + mw, y); });
  return s;
}
const svg = b => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#F8F3EA"/>${b}</svg>`;

const beelden = {
  'noten-gsleutel': () => { const y = 480, x0 = 50, x1 = W - 50; let s = tekst(70, 150, 'De noten in de g-sleutel', 60, 'font-weight:800') + balk(x0, x1, y) + sleutel(x0 + 8, y);
    ['c', 'd', 'e', 'f', 'g', 'a', 'b', 'c'].forEach((n, i) => { const st = i - 2, x = 250 + i * 150; s += noot(x, y, st, 1, n === 'g' ? ACC : INKT) + tekst(x, y + 9 * LIJN, n, 64, `font-weight:800;text-anchor:middle;fill:${n === 'g' ? ACC : INKT}`); });
    s += tekst(70, 980, 'Op de lijnen', 44, 'font-weight:700') + tekst(70, 1050, 'e   g   b   d   f', 64, `font-weight:800;fill:${ACC}`);
    s += tekst(70, 1190, 'Tussen de lijnen', 44, 'font-weight:700') + tekst(70, 1260, 'f   a   c   e', 64, `font-weight:800;fill:${ACC}`);
    s += tekst(70, 1400, 'Lage c staat op een hulplijn.', 44, 'font-weight:500'); return s; },
  'noten-saints': () => { const c = -2, d = -1, e = 0, f = 1, g = 2;
    const m1 = [[1, null], [1, c], [1, e], [1, f]], gg = [[4, g]], ge = [[2, g], [2, e]], ce = [[2, c], [2, e]], dd = [[4, d]];
    return tekst(70, 130, 'When the Saints', 60, 'font-weight:800')
      + regel(50, W - 50, 280, [m1, gg], { sleutel: true, maatsoort: true }) + regel(50, W - 50, 600, [m1, gg], { sleutel: true }) + regel(50, W - 50, 920, [m1, ge], { sleutel: true }) + regel(50, W - 50, 1240, [ce, dd], { sleutel: true }); },
  'ritme-waarden': () => { let s = tekst(70, 130, 'Notenwaarden en rusten', 60, 'font-weight:800'); const rij = [['hele', 4, '4 tellen'], ['halve', 2, '2 tellen'], ['kwart', 1, '1 tel'], ['achtste', .5, '½ tel']];
    s += tekst(450, 230, 'noot', 40, 'font-weight:700;fill:#6B6B6B;text-anchor:middle') + tekst(680, 230, 'rust', 40, 'font-weight:700;fill:#6B6B6B;text-anchor:middle') + tekst(1000, 230, 'duur', 40, 'font-weight:700;fill:#6B6B6B');
    rij.forEach(([n, d, t], i) => { const y = 270 + i * 235; s += tekst(70, y + 2.8 * LIJN, n, 54, 'font-weight:800') + balk(360, 790, y) + noot(450, y, 2, d) + rust(680, y, d) + tekst(1000, y + 2.8 * LIJN, t, 54, `font-weight:800;fill:${ACC}`); });
    return s + tekst(70, 1270, 'Twee achtsten samen duren één tel.', 46, 'font-weight:500') + tekst(70, 1350, 'De teleenheid in 4/4 is de kwart.', 46, 'font-weight:500') + tekst(70, 1430, 'Een punt maakt een noot de helft langer.', 46, 'font-weight:500'); },
  'ritme-klappen': () => { let s = tekst(70, 130, 'Klap van het blad', 60, 'font-weight:800'); const n = 2; const k = [1, n], h = [2, n], a = [.5, n], r = [1, null];
    const regels = [[[k, k, k, k], [h, h]], [[k, k, h], [a, a, k, k, k]], [[k, r, k, r], [a, a, a, a, k, k]], [[[2, n, true], k], [[4, n]]]];
    regels.forEach((m, i) => { const y = 250 + i * 310; s += tekst(40, y + 2.8 * LIJN, String(i + 1), 60, `font-weight:800;fill:${ACC}`) + regel(120, W - 50, y, m, { maatsoort: true }); });
    return s; }
};
fs.mkdirSync(MAP, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-'));
for (const [naam, f] of Object.entries(beelden)) {
  const html = path.join(tmp, naam + '.html'); fs.writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden}svg{display:block}</style>${svg(f())}`);
  const uit = path.join(MAP, naam + '.png');
  execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${path.join(tmp, 'p')}`, `--window-size=${W},${H}`, `--screenshot=${uit}`, 'file:///' + html.replace(/\\/g, '/')], { stdio: 'ignore' });
  console.log('getekend: ' + naam + '.png');
}
const br = path.join(MAP, 'bronnen.txt'); const oud = fs.existsSync(br) ? fs.readFileSync(br, 'utf8') : '';
for (const naam of Object.keys(beelden)) if (!oud.includes(naam + '.png |')) fs.appendFileSync(br, `${naam}.png | zelf getekend met tools/notenbeeld-kmu3.js\n`);
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* Edge houdt soms nog een bestand vast */ }
