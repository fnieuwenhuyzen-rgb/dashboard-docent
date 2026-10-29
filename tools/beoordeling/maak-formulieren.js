// Maakt uit een beoordelingsmodel (tools/beoordeling/<id>.json) twee HTML-bestanden die Word omzet naar .docx en .pdf:
// het docentformulier (één per leerling, A4 liggend) en het leerlingformat (zelfbeoordeling, A4 liggend).
// Gebruik: node tools/beoordeling/maak-formulieren.js tools/beoordeling/p9-vwo5.json <uitmap>
// Daarna: powershell -File tools/beoordeling/naar-word.ps1 <uitmap> <doelmap>
const fs = require('fs'), path = require('path');
const M = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const uit = process.argv[3]; fs.mkdirSync(uit, { recursive: true });
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ACC = '#8C2332', ZAND = '#F3EEE6';
const lijn = n => '_'.repeat(Math.round(n * 0.62));
const somW = M.onderdelen.flatMap(o => o.criteria).reduce((a, c) => a + c.weging, 0);

const kop = (titel) => `<html><head><meta charset="utf-8"><style>
@page Sec { size: 841.9pt 595.3pt; mso-page-orientation: landscape; margin: 28pt 32pt 26pt 32pt; }
div.Sec { page: Sec; }
body { font-family: Calibri, Arial, sans-serif; font-size: 9pt; color: #1d1d1b; }
p { margin: 0; }
.eyebrow { color: ${ACC}; font-size: 8pt; font-weight: bold; letter-spacing: 1pt; text-transform: uppercase; }
h1 { font-size: 17pt; margin: 1pt 0 3pt 0; }
table { border-collapse: collapse; width: 100%; }
td, th { border: 0.75pt solid #9a948b; padding: 2.5pt 4pt; vertical-align: top; }
th { background: ${ACC}; color: white; font-size: 8.5pt; text-align: left; }
.groep td { background: ${ZAND}; font-weight: bold; font-size: 9pt; }
.crit { width: 15%; }
.crit b { font-size: 9.5pt; }
.klein { font-size: 7.5pt; color: #5d5850; }
.niv { width: 15.5%; font-size: 7.8pt; }
.score { width: 7%; text-align: center; vertical-align: middle; white-space: nowrap; }
.velden td { border: none; padding: 2pt 0; font-size: 10pt; }
.lijn { border-bottom: 0.75pt solid #1d1d1b; }
</style><title>${esc(titel)}</title></head><body><div class="Sec">`;

function rubriek(soort) {
  let h = `<table><tr><th class="crit">Onderdeel</th>${M.niveaus.map(n => `<th class="niv">${n.score} · ${esc(n.naam)}</th>`).join('')}<th class="score">${soort === 'docent' ? 'Score × weging' : 'Mijn score'}</th></tr>`;
  for (const o of M.onderdelen) {
    h += `<tr class="groep"><td colspan="${M.niveaus.length + 2}">${esc(o.groep)} ${o.stuk ? `<span class="klein">(${esc(o.stuk)})</span>` : ''}</td></tr>`;
    for (const c of o.criteria) {
      h += `<tr><td class="crit"><b>${esc(c.naam)}</b><br><span class="klein">${esc(c.uitleg)} · weegt ${c.weging}×</span></td>`;
      h += c[soort].map(t => `<td class="niv">${esc(t)}</td>`).join('');
      h += `<td class="score">${soort === 'docent' ? `___ × ${c.weging} = ___` : '___'}</td></tr>`;
    }
  }
  return h + '</table>';
}


// velden bovenaan: Naam, (docent: Datum) en de velden uit het model, drie per regel
const veldRijen = (namen) => { let h = '<table class="velden">'; for (let i = 0; i < namen.length; i += 3) { const r = namen.slice(i, i + 3); h += '<tr>' + r.map(n => `<td style="width:33%">${esc(n)}: ${'_'.repeat(Math.max(12, 40 - n.length))}</td>`).join('') + '<td></td>'.repeat(3 - r.length) + '</tr>'; } return h + '</table>'; };
const vooruit = M.vooruit || 'Eén punt om aan te werken';
const groepen = M.onderdelen.map(o => o.groep.toLowerCase()).join(' · ');

// docentformulier
let d = kop(`${M.toets} beoordelingsformulier docent`);
d += `<p class="eyebrow">${esc(M.klas)} · ${esc(M.thema)} · ${esc(M.toets)}${M.weging ? ' · weging ' + esc(M.weging) : ''}${M.herkansbaar === false ? ' · niet herkansbaar' : M.herkansbaar ? ' · herkansbaar' : ''}</p><h1>${esc(M.titel)}</h1>`;
d += veldRijen(['Naam', 'Datum', ...(M.velden || [])]);
d += `<p style="margin:3pt 0 4pt 0">Omcirkel per onderdeel het niveau dat het best past en schrijf de score op. ${esc(M.tussenscores)}</p>`;
d += rubriek('docent');
d += `<table style="margin-top:5pt"><tr><td style="width:60%;height:52pt"><b>Opmerking per onderdeel</b><br><span class="klein">${esc(groepen)}</span></td><td><b>Totaal</b> ______ punten ÷ ${somW} = <b>cijfer</b> ______<br><span class="klein">${esc(M.cijfer)}</span><br><br><b>${esc(vooruit)}:</b></td></tr></table>`;
d += '</div></body></html>';
fs.writeFileSync(path.join(uit, `${M.toets} Beoordelingsformulier docent.html`), d, 'utf8');

// leerlingformat
let l = kop(`${M.toets} format zelfbeoordeling`);
l += `<p class="eyebrow">${esc(M.klas)} · ${esc(M.thema)} · ${esc(M.toets)} · format voor je eigen uitvoering</p><h1>${esc(M.leerlingTitel || 'Zo beoordeel ik mijn uitvoering')}</h1>`;
l += veldRijen(['Naam', ...(M.velden || [])]);
l += `<p style="margin:3pt 0 4pt 0">${esc(M.leerlingInstructie || 'Luister je opname terug. Zet per onderdeel een kruisje bij wat je hoort en schrijf je score op. Dit zijn dezelfde onderdelen waarop je docent let.')}</p>`;
l += rubriek('leerling');
l += `<table style="margin-top:5pt"><tr><td style="width:33%;height:58pt"><b>Wat ging goed?</b></td><td style="width:34%"><b>${esc(vooruit)}</b><br><span class="klein">Welke maat of welk moment, welk probleem, hoe ga je het oefenen?</span></td><td><b>Tip van een klasgenoot</b></td></tr></table>`;
l += '</div></body></html>';
fs.writeFileSync(path.join(uit, `${M.toets} Format zelfbeoordeling leerling.html`), l, 'utf8');
console.log('ok', uit);