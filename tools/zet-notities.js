// Haalt de sprekersnotities per les en fase uit de inhoudbestanden (tools/inhoud-*.json, dezelfde bron als de decks) en schrijft ze
// naar public/data/notities.json. De lesmodus laadt dat bestand pas als Frans een les geeft; basis.json blijft er buiten.
// Gebruik: node tools/zet-notities.js [--droog]. Mag vaker draaien; draai het na elke wijziging in een inhoudbestand of na zet-decks-in-leergang.js.
// Sleutel: leergang:week.lesnummer, hetzelfde les-id als in de app. Per les: voor (voorbereiding), titel, agenda, doel, rode, vragenRode,
// thuis, fasen [{kop, vertel, voorbeelden, vragen, leerlingen, letop}] op volgorde van de fasen in basis.json, formatief.
// De kop van elke fase gaat mee: de app toont de notities van een fase alleen als de kop nog klopt (Frans kan fasen aanpassen).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const droog = process.argv.includes('--droog');
const basis = JSON.parse(fs.readFileSync(path.join(root, 'public/data/basis.json'), 'utf8'));
const LIJSTEN = { voor: 'voorbereiding', titel: 'notitieTitel', agenda: 'notitieAgenda', doel: 'notitieDoel', rode: 'notitieRodeDraad', thuis: 'notitieThuis' };
const FASEVELDEN = ['vertel', 'voorbeelden', 'vragen', 'leerlingen', 'letop'];
const leeg = v => v == null || (Array.isArray(v) && !v.length) || v === '';

const uit = {}; const meld = []; let lessen = 0, fasenTel = 0;
for (const f of fs.readdirSync(__dirname).filter(f => /^inhoud-.*\.json$/.test(f)).sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
  for (const [naam, blok] of Object.entries(j)) {
    if (naam[0] === '_' || !blok || !Array.isArray(blok.lessen)) continue;
    for (const d of blok.lessen) {
      const n = {};
      for (const [k, v] of Object.entries(LIJSTEN)) if (!leeg(d[v])) n[k] = d[v];
      if (!leeg(d.vragenRodeDraad)) n.vragenRode = d.vragenRodeDraad;
      if (d.formatief && d.formatief.notitie) n.formatief = d.formatief.notitie;
      for (const k of (d.koppel || [])) {
        const id = `${k.lg}:${k.w}.${String(k.slot).replace(/^l/, '')}`;
        const w = ((basis.leergangen[k.lg] || {}).weken || []).find(x => x.w === k.w); const les = w && w[k.slot];
        if (!les) { meld.push(`${f} ${d.bestand || d.kort}: les ${id} niet in basis.json`); continue; }
        const bron = d.fasen || [];
        const extra = d.fasenExtra || {};
        const fasen = (les.fasen || []).map((fs_, i) => {
          const nt = (bron[i] && bron[i].notitie) || (extra[i] && extra[i].notitie) || null;
          const o = { kop: typeof fs_ === 'object' ? fs_.kop || '' : String(fs_) };
          if (nt) for (const v of FASEVELDEN) if (!leeg(nt[v])) o[v] = nt[v];
          return o;
        });
        const heeftFase = fasen.some(o => Object.keys(o).length > 1);
        if (!heeftFase && !Object.keys(n).length) continue;
        const les2 = Object.assign({}, n); if (heeftFase) { les2.fasen = fasen; fasenTel += fasen.filter(o => Object.keys(o).length > 1).length; }
        if (uit[id]) meld.push(`${f} ${d.bestand || d.kort}: les ${id} staat al in een ander inhoudbestand, laatste wint`);
        uit[id] = les2; lessen++;
      }
    }
  }
}
const tekst = JSON.stringify(Object.fromEntries(Object.entries(uit).sort(([a], [b]) => a.localeCompare(b, 'nl', { numeric: true }))));
console.log(`${Object.keys(uit).length} lessen met notities, ${fasenTel} fasen met notities, ${(Buffer.byteLength(tekst) / 1024).toFixed(0)} kB`);
for (const m of meld) console.log('LET OP: ' + m);
console.log(Object.keys(uit).sort((a, b) => a.localeCompare(b, 'nl', { numeric: true })).join('  '));
if (!droog) { fs.writeFileSync(path.join(root, 'public/data/notities.json'), tekst + '\n', 'utf8'); console.log('geschreven: public/data/notities.json'); }
