// Maakt de lespresentaties voor lesweek 8 (26-30 oktober 2026) uit inhoud-week8.json.
// Elk leerjaar heeft een eigen accentkleur binnen de ontwerptaal van de didactische kaarten; foto's per klasmap in beeld\ met bronnen.txt.
// Gebruik: node tools/maak-decks-week8.js [klas ...]   (zonder argumenten: alle klassen)
const fs = require('fs'), path = require('path');
const D = require('./lesdeck');
const INH = JSON.parse(fs.readFileSync(path.join(__dirname, 'inhoud-week8.json'), 'utf8'));
const ROOT = 'C:/Users/nwn/OneDrive - CSG Prins Maurits/Documenten - Sectie Muziek/';
const THEMA = { klas4: '2B4C8C', klas5: '8C2332', klas6: '2F6B4F', mavo: '1F7A8C' };

// foto's per les: sleutel = klas + '|' + bestandsnummer (eerste 4 tekens van het pptx-bestand)
const FOTOS = {
  'vwo4|08.1': { titel: 'convicts-1934.jpg', doel: 'juke-joint-1939.jpg', fase: [null, null, 'louis-armstrong.jpg', null], rodeDraad: 'cotton-pickers-1935.jpg' },
  'vwo4|08.2': { titel: 'leadbelly.jpg', doel: 'louis-armstrong.jpg', fase: ['messiah-koor.jpg', null, 'juke-joint-1939.jpg', null] },
  'havo4|08.1': { titel: 'bessie-smith-1936.jpg', doel: 'juke-joint-1939.jpg', fase: [null, null, 'muziekleraar-1700.jpg', null], rodeDraad: 'hymnal-our-god-our-help.png' },
  'havo4|08.2': { titel: 'messiah-koor.jpg', doel: 'bandles-leerlingen.jpg', fase: [null, 'mengtafel-leerlingen.jpg', null] },
  'havo4|08.3': { titel: 'microfoon-studio.jpg', doel: 'telefoon-opnemen.jpg', fase: ['louis-armstrong.jpg', null, 'mengtafel-leerlingen.jpg'] },
  'vwo5|08.1': { titel: 'fortepiano-walter.jpg', doel: 'concertzaal.jpg', fase: ['messiah-koor.jpg', null] },
  'vwo5|08.2': { titel: 'muziekleraar-1700.jpg', doel: 'fortepiano-walter.jpg', fase: ['messiah-koor.jpg', 'concertzaal.jpg'] },
  'vwo5|08.3': { titel: 'mozart-lange-1782.jpg', doel: 'brahms.jpg', fase: ['concertzaal.jpg', 'brahms.jpg', null] },
  'havo5|08.1': { titel: 'mozart-autograaf.jpg', doel: null, fase: [null, 'muziekleraar-1700.jpg'] },
  'havo5|08.2': { titel: 'zingend-kwartet-1700.jpg', doel: 'barbershop.jpg', fase: ['messiah-koor.jpg', 'barbershop.jpg', null], rodeDraad: 'messiah-koor.jpg' },
  'havo5|08.3': { titel: 'manuscript-schets.jpg', doel: 'microfoon-studio.jpg', fase: ['mozart-autograaf.jpg', null] },
  'vwo6|08.1': { titel: 'cantigas-luit-rebab.jpg', doel: 'hildegard.jpg', fase: [null, 'gregoriaans.jpg', null] },
  'vwo6|08.2': { titel: 'landini-squarcialupi.jpg', doel: 'cantigas-musici.jpg', fase: [null, null, 'gregoriaans.jpg'], rodeDraad: 'josquin.jpg' },
  'vwo6|08.3': { titel: 'solario-luitspeler.jpg', doel: 'concertzaal.jpg', fase: [null, 'orkestrepetitie.jpg', null] },
  'mavo3|08 P': { titel: 'zangeres-podium.jpg', doel: 'microfoon-studio.jpg', fase: [null, null, 'zangeres-podium.jpg', null] },
  'mavo4|08.1': { titel: 'orkestrepetitie.jpg', doel: 'rapper.jpg', fase: [null, null, null, null] },
  'mavo4|08.2': { titel: 'bandles-leerlingen.jpg', doel: 'mengtafel-leerlingen.jpg', fase: [null, 'bandles-leerlingen.jpg', null] }
};

function bronnen(map) { const b = {}; const p = path.join(map, 'beeld', 'bronnen.txt'); if (!fs.existsSync(p)) return b; for (const ln of fs.readFileSync(p, 'utf8').split('\n')) { const d = ln.split(' | '); if (d.length >= 5) b[d[0].trim()] = `${d[1].trim()} Â· ${d[2].trim()} Â· ${d[3].trim()} Â· ${d[4].trim()}`; } return b; }
function fotoObj(map, br, n) { if (!n) return null; const p = path.join(map, 'beeld', n); if (!fs.existsSync(p)) { console.warn('  foto ontbreekt: ' + n); return null; } return { pad: p, bron: br[n] || n }; }
function extraFn(e) { if (!e) return null; if (e.soort === 'kaarten') return D.beeldKaarten(e.items); if (e.soort === 'tabel') return D.beeldTabel(e.rijen, e.kol); if (e.soort === 'akkoorden') return D.beeldAkkoorden(e.items); if (e.soort === 'vorm') return D.beeldVorm(e.items); return null; }

(async () => {
  const klassen = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(INH).filter(k => !k.startsWith('_'));
  for (const kl of klassen) {
    const K = INH[kl]; if (!K) { console.log('onbekende klas: ' + kl); continue; }
    const map = ROOT + K.map.replace(/\\/g, '/'); fs.mkdirSync(map, { recursive: true });
    const br = bronnen(map);
    for (const l of K.lessen) {
      const sleutel = kl + '|' + l.bestand.slice(0, 4); const fo = FOTOS[sleutel] || {};
      const fotos = { titel: fotoObj(map, br, fo.titel), doel: fotoObj(map, br, fo.doel), fase: (fo.fase || []).map(n => fotoObj(map, br, n)), rodeDraad: fotoObj(map, br, fo.rodeDraad) };
      const extra = {}; for (const [i, e] of Object.entries(l.extra || {})) { const fn = extraFn(e); if (fn) { extra[+i] = fn; if (fotos.fase[+i]) fotos.fase[+i] = null; } }
      const les = { titel: l.titel, kort: l.kort, vraag: l.vraag, doel: l.doel, criteria: l.criteria || [], fasen: l.fasen, formatief: l.formatief, identiteit: l.identiteit };
      const meta = { klas: K.klas, week: 8, blok: K.blok, blokKort: K.blokKort, code: l.code, titel: l.titel, kort: l.kort, accent: THEMA[K.thema] };
      const uit = path.join(map, l.bestand);
      await D.maak(les, meta, { bestand: uit, fotos, extra, thuis: K.thuis || {} });
      console.log('geschreven: ' + uit);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
