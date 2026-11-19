// Maakt drie printbladen die bij Klaarzetten nog geen bestand hadden (bordtaak les-t7, 19-11-2026):
// - BB1 lesweek 30 en 37: strookje (twee per A4, 3 minuten, zonder cijfer)
// - mavo 4 lesweek 5: werkblad met notenbalk (tien noten, voortekens, majeur en mineur, melodielijn) plus antwoorden
// Gebruik: node tools/printbladen/maak-printbladen.js <uitmap>
// Daarna:  powershell -File tools/printbladen/naar-word.ps1 <uitmap>   (zet .docx en .pdf in de sectiemap, zie DOEL hieronder)
// De notenbalk is een png, getekend met Edge headless (g-sleutel, kruis en mol uit Segoe UI Symbol), zoals tools/notenbeeld-kmu3.js.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const uit = path.resolve(process.argv[2] || 'printbladen-uit'); fs.mkdirSync(uit, { recursive: true });
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ACC = '#8C2332', ZAND = '#F3EEE6', INKT = '#1d1d1b';

// map in de sectiemap per blad (naar-word.ps1 leest doel.json)
const SECTIE = 'C:/Users/nwn/OneDrive - CSG Prins Maurits/Documenten - Sectie Muziek';
const DOEL = {
  '30.1 Strookje speelmoment': SECTIE + '/01 Onderbouw muziek/01 Klas 1/Lessen 2026-2027',
  '37.1 Strookje eindopdracht': SECTIE + '/01 Onderbouw muziek/01 Klas 1/Lessen 2026-2027',
  '05.1 Werkblad notenbalk': SECTIE + '/02 Keuzevak muziek/Mavo/Mavo 4/Lessen 2026-2027',
  '05.1 Werkblad notenbalk - antwoorden': SECTIE + '/02 Keuzevak muziek/Mavo/Mavo 4/Lessen 2026-2027',
};
fs.writeFileSync(path.join(uit, 'doel.json'), JSON.stringify(DOEL, null, 1), 'utf8');

const kop = (titel, extra = '') => `<html><head><meta charset="utf-8"><style>
@page Sec { size: 595.3pt 841.9pt; mso-page-orientation: portrait; margin: 28pt 40pt 22pt 40pt; }
div.Sec { page: Sec; }
body { font-family: 'Encode Sans', Arial, sans-serif; font-size: 12pt; color: ${INKT}; }
p { margin: 0; }
.eyebrow { color: ${ACC}; font-size: 9pt; font-weight: bold; letter-spacing: 1pt; text-transform: uppercase; }
h1 { font-size: 19pt; margin: 2pt 0 8pt 0; }
h2 { font-size: 12.5pt; margin: 12pt 0 4pt 0; }
table { border-collapse: collapse; width: 100%; }
td, th { border: 0.75pt solid #9a948b; padding: 5pt 6pt; vertical-align: middle; }
.naam { font-size: 11pt; margin-bottom: 10pt; }
.klein { font-size: 9pt; color: #5d5850; }
${extra}
</style><title>${esc(titel)}</title></head><body><div class="Sec">`;
const voet = '</div></body></html>';

// ---------- strookjes BB1 (zelfde opmaak als de strookjes uit tools/beoordeling/maak-formulieren.js, maar zonder cijfer)
const STROOK_CSS = `table.vink td { padding: 5pt 6pt; vertical-align: middle; }
.stelling { font-size: 12pt; }
.hok { width: 13%; }
.kopje { width: 13%; font-size: 9.5pt; text-align: center; background: ${ZAND}; font-weight: bold; }
.leeg { background: ${ZAND}; }
.vraag { font-weight: bold; margin: 11pt 0 0 0; }
td.schrijf { border: none; border-bottom: 0.75pt solid ${INKT}; height: 24pt; padding: 0; }
.voet { font-size: 8.5pt; color: #5d5850; margin-top: 9pt; }
.knip { border-bottom: 0.75pt dashed #9a948b; margin: 24pt 0 24pt 0; font-size: 2pt; }`;
const strookje = S => {
  const rijen = S.zinnen.map(z => `<tr><td class="stelling">${esc(z)}</td>${'<td class="hok">&nbsp;</td>'.repeat(3)}</tr>`).join('');
  const vragen = ['Wat was het lastigst?', 'Wat ga je oefenen?'].map(v => `<p class="vraag">${v}</p><table><tr><td class="schrijf">&nbsp;</td></tr></table>`).join('');
  return `<p class="eyebrow">BB1 · lesweek ${S.week} · 3 minuten</p><h1>${esc(S.titel)}</h1><p class="naam">Naam: ______________________________ &nbsp; Klas: __________</p><p class="naam">${S.regel}</p><table class="vink"><tr><td class="leeg">&nbsp;</td><td class="kopje">nog niet</td><td class="kopje">bijna</td><td class="kopje">ja</td></tr>${rijen}</table>${vragen}<p class="voet">Lever dit in bij de deur. Je krijgt hier geen cijfer voor.</p>`;
};
// zinnen = de criteria van de les in basis.json (bb1:30.1 en bb1:37.1)
const STROOKJES = [
  { bestand: '30.1 Strookje speelmoment', week: 30, titel: 'Speelmoment: mijn song', regel: 'Onze song (omcirkel): Memories &nbsp;·&nbsp; Riptide &nbsp;·&nbsp; Birds of a Feather',
    zinnen: ['Ik heb een partij gekozen die bij mij past', 'Ik speel op de tel met mijn groepje', 'Ik speel door als het misgaat'] },
  { bestand: '37.1 Strookje eindopdracht', week: 37, titel: 'Eindopdracht: ons stuk', regel: 'Ons stuk: ______________________________ &nbsp; Mijn instrument: ______________',
    zinnen: ['Mijn partij klopt: juiste noten of grepen', 'Ik speel op de tel met mijn groepje', 'Ik speel door als het misgaat'] },
];
for (const S of STROOKJES) {
  const h = kop(S.bestand, STROOK_CSS) + strookje(S) + '<p class="knip">&nbsp;</p>' + strookje(S) + '<p>&nbsp;</p>' + voet;
  fs.writeFileSync(path.join(uit, S.bestand + '.html'), h, 'utf8');
}

// ---------- werkblad notenbalk mavo 4 (les mavo4:5.1, fase "Noten, tekens en gehoor")
// Stap 0 = e' (onderste lijn); elke stap is een lijn of een ruimte hoger.
const NAMEN = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
const NOTEN = [
  { s: 2 }, { s: 0 }, { s: 5 }, { s: 1, v: 'kruis' }, { s: 3 },
  { s: 6 }, { s: 4, v: 'mol' }, { s: 8 }, { s: -2 }, { s: 5, v: 'kruis' },
];
const naamVan = s => NAMEN[((s + 2) % 7 + 7) % 7];
const L = 22, BOVEN = 70, ONDER = BOVEN + 4 * L, X0 = 30, SLEUTEL = 120, STAP = 152, W = X0 + SLEUTEL + NOTEN.length * STAP + 10, H = 300;
const yVan = s => ONDER - s * L / 2;
let svg = '';
for (let i = 0; i < 5; i++) svg += `<line x1="${X0}" x2="${W - 10}" y1="${BOVEN + i * L}" y2="${BOVEN + i * L}" stroke="${INKT}" stroke-width="2"/>`;
svg += `<line x1="${X0}" x2="${X0}" y1="${BOVEN}" y2="${ONDER}" stroke="${INKT}" stroke-width="2"/><line x1="${W - 10}" x2="${W - 10}" y1="${BOVEN}" y2="${ONDER}" stroke="${INKT}" stroke-width="2"/>`;
svg += `<text x="${X0 + 8}" y="${BOVEN + 4.05 * L}" style="font-family:'Segoe UI Symbol';font-size:${L * 6.6}px" fill="${INKT}">&#x1D11E;</text>`;
NOTEN.forEach((n, i) => {
  const x = X0 + SLEUTEL + i * STAP + STAP / 2, y = yVan(n.s);
  svg += `<text x="${x}" y="${BOVEN - 34}" text-anchor="middle" style="font-family:'Encode Sans';font-weight:bold;font-size:22px" fill="${ACC}">${i + 1}</text>`;
  for (let h = -2; h >= n.s; h -= 2) svg += `<line x1="${x - 24}" x2="${x + 24}" y1="${yVan(h)}" y2="${yVan(h)}" stroke="${INKT}" stroke-width="2"/>`; // hulplijn onder de balk
  for (let h = 10; h <= n.s; h += 2) svg += `<line x1="${x - 24}" x2="${x + 24}" y1="${yVan(h)}" y2="${yVan(h)}" stroke="${INKT}" stroke-width="2"/>`;  // hulplijn boven de balk
  // hele noot: zwarte ovaal met een schuine witte binnenkant
  svg += `<ellipse cx="${x}" cy="${y}" rx="${L * 0.72}" ry="${L * 0.5}" fill="${INKT}"/><ellipse cx="${x}" cy="${y}" rx="${L * 0.36}" ry="${L * 0.27}" fill="#fff" transform="rotate(-35 ${x} ${y})"/>`;
  if (n.v === 'kruis') svg += `<text x="${x - 32}" y="${y + L * 0.62}" text-anchor="middle" style="font-family:'Segoe UI Symbol';font-size:${L * 2.2}px" fill="${INKT}">&#x266F;</text>`;
  if (n.v === 'mol') svg += `<text x="${x - 30}" y="${y + L * 0.42}" text-anchor="middle" style="font-family:'Segoe UI Symbol';font-size:${L * 2.2}px" fill="${INKT}">&#x266D;</text>`;
  svg += `<rect x="${x - 46}" y="${H - 78}" width="92" height="58" fill="none" stroke="#9a948b" stroke-width="2"/>`; // hokje voor de naam
});
const balkHtml = `<html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svg}</svg></body></html>`;
const balkHtmlPad = path.join(uit, 'notenbalk-bron.html'), balkPng = path.join(uit, 'notenbalk.png');
fs.writeFileSync(balkHtmlPad, balkHtml, 'utf8');
execFileSync(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', `--window-size=${W},${H}`, `--screenshot=${balkPng}`, 'file:///' + balkHtmlPad.replace(/\\/g, '/')], { stdio: 'ignore' });
if (!fs.existsSync(balkPng)) throw new Error('notenbalk.png niet gemaakt');
const breedPt = 515; // breedte van de tekstkolom in pt; Word neemt de afmeting uit width/height
const balkImg = `<img src="notenbalk.png" width="${Math.round(breedPt / 0.75)}" height="${Math.round(breedPt / 0.75 * H / W)}">`;

const WB_CSS = `.hulp td { font-size: 9.5pt; background: ${ZAND}; border-color: ${ZAND}; padding: 4pt 7pt; vertical-align: top; }
h2 { font-size: 12.5pt; } .opdr { font-size: 11pt; margin-bottom: 4pt; }
td.schrijf { border: none; border-bottom: 0.75pt solid ${INKT}; height: 20pt; padding: 0; }
.kol td { text-align: center; font-size: 10.5pt; } .kol td.l { text-align: left; }
.pijl td { height: 30pt; text-align: center; width: 12.5%; }`;
const schrijfLijnen = n => `<table>${'<tr><td class="schrijf">&nbsp;</td></tr>'.repeat(n)}</table>`;
let wb = kop('05.1 Werkblad notenbalk', WB_CSS);
wb += `<p class="eyebrow">mavo 4 · toonhoogte en toonsoort · werkblad</p><h1>Noten, tekens en gehoor</h1><p class="naam">Naam: ______________________________ &nbsp; Klas: __________</p>`;
wb += `<table class="hulp"><tr><td style="width:50%"><b>G-sleutel</b><br>Lijnen van onder naar boven: e, g, b, d, f.<br>Ruimtes van onder naar boven: f, a, c, e.</td><td><b>Voortekens</b><br>&#x266F; kruis: een halve toon hoger.<br>&#x266D; mol: een halve toon lager.<br>&#x266E; herstellingsteken: weer de gewone noot.</td></tr></table>`;
wb += `<h2>1. Tien noten</h2><p class="opdr">Schrijf de naam van elke noot in het hokje eronder. Staat er een kruis of een mol voor? Schrijf de naam van de noot zelf.</p>${balkImg}`;
wb += `<h2>2. Kruis en mol</h2><p class="opdr">Drie noten hebben een kruis of een mol. Welke nummers zijn dat? ______ ______ ______<br>Wat doet een kruis met de klank? En een mol?</p>${schrijfLijnen(2)}`;
wb += `<h2>3. Majeur of mineur?</h2><p class="opdr">Je hoort vijf korte fragmenten. Zet een kruisje.</p><table class="kol"><tr><td class="l" style="background:${ZAND};width:28%"><b>Fragment</b></td>${[1, 2, 3, 4, 5].map(i => `<td style="background:${ZAND}"><b>${i}</b></td>`).join('')}</tr><tr><td class="l">majeur</td>${'<td>&nbsp;</td>'.repeat(5)}</tr><tr><td class="l">mineur</td>${'<td>&nbsp;</td>'.repeat(5)}</tr></table>`;
wb += `<h2>4. Omhoog, omlaag of gelijk?</h2><p class="opdr">Je docent speelt een korte melodie van acht tonen. Gaat de volgende toon omhoog, omlaag of blijft hij gelijk? Zet per stap een pijl &#x2191; of &#x2193;, of een =.</p><table class="pijl"><tr>${['1→2', '2→3', '3→4', '4→5', '5→6', '6→7', '7→8'].map(t => `<td style="background:${ZAND};height:14pt;font-size:9.5pt"><b>${t}</b></td>`).join('')}</tr><tr>${'<td>&nbsp;</td>'.repeat(7)}</tr></table>`;
wb += `<h2>Klaar?</h2><p class="opdr">Teken een eigen melodie als lijn: omhoog, omlaag of gelijk. Laat je buur hem neuriën.</p><table><tr><td style="height:62pt">&nbsp;</td></tr></table><p>&nbsp;</p>` + voet;
fs.writeFileSync(path.join(uit, '05.1 Werkblad notenbalk.html'), wb, 'utf8');

const antw = NOTEN.map((n, i) => `${i + 1}: ${naamVan(n.s)}${n.v ? ' (met ' + n.v + ')' : ''}`).join(' &nbsp;·&nbsp; ');
const molKruis = NOTEN.map((n, i) => n.v ? i + 1 : null).filter(Boolean).join(', ');
let an = kop('05.1 Werkblad notenbalk - antwoorden', '.opdr { font-size: 11pt; margin-bottom: 6pt; }');
an += `<p class="eyebrow">mavo 4 · toonhoogte en toonsoort · voor de docent</p><h1>Werkblad notenbalk: antwoorden</h1>`;
an += `<h2>1. Tien noten</h2><p class="opdr">${antw}</p>${balkImg}`;
an += `<h2>2. Kruis en mol</h2><p class="opdr">Nummers ${molKruis}. Een kruis maakt de noot een halve toon hoger, een mol een halve toon lager.</p>`;
an += `<h2>3 en 4</h2><p class="opdr">Hangt af van de fragmenten en de melodie die je speelt (les: drie majeur, twee mineur).</p><p>&nbsp;</p>` + voet;
fs.writeFileSync(path.join(uit, '05.1 Werkblad notenbalk - antwoorden.html'), an, 'utf8');
fs.unlinkSync(balkHtmlPad);
console.log('ok', uit, '| antwoorden:', antw.replace(/&nbsp;·&nbsp;/g, '·'));
