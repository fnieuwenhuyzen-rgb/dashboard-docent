// Maakt de lespresentaties voor klas 3 uit inhoud-klas3.json + fasen-klas3.json, met foto's uit de lesmap.
// Gebruik: node tools/maak-decks-klas3.js [lestitel ...]   (zonder argumenten: de lessen in LESSEN hieronder)
const fs = require('fs'), path = require('path');
const D = require('./lesdeck');
const inhoud = JSON.parse(fs.readFileSync(path.join(__dirname, 'inhoud-klas3.json'), 'utf8'));
const MAP = 'C:/Users/nwn/OneDrive - CSG Prins Maurits/Documenten - Sectie Muziek/01 Onderbouw muziek/Klas 3/Lessen 2026-2027';
const BEELD = MAP + '/beeld';
const bronnen = {}; for (const ln of fs.readFileSync(BEELD + '/bronnen.txt', 'utf8').split('\n')) { const d = ln.split(' | '); if (d.length >= 5) bronnen[d[0].trim()] = `${d[1].trim()} · ${d[2].trim()} · ${d[3].trim()} · ${d[4].trim()}`; }
const F = n => n ? { pad: BEELD + '/' + n, bron: bronnen[n] || n } : null;

// per les: week, code, foto's per dia, thuis, en beeld in plaats van foto bij bepaalde fasen
const LESSEN = {
  'Songbox 1: opnemen en terugluisteren': {
    week: 8, blok: 'Periode 1 · Samenspelen in bandbezetting', code: 'P1 · les 8', bestand: '08 Songbox 1 - opnemen en terugluisteren.pptx',
    fotos: { titel: F('bandles-leerlingen.jpg'), doel: F('microfoon-studio.jpg'), fase: [null, F('telefoon-opnemen.jpg'), F('mengtafel-leerlingen.jpg'), F('sinach.jpg')], rodeDraad: F('mengtafel-leerlingen.jpg') },
    extra: { 0: D.beeldKaarten([{ k: 'Samenspel', t: 'Luisteren we naar elkaar?' }, { k: 'Ritme', t: 'Houden we het tempo?' }, { k: 'Toon', t: 'Klinkt het zuiver?' }, { k: 'Techniek', t: 'Spelen we de partij netjes?' }]) },
    thuis: { mb: 'Luister thuis nog een keer naar jullie opname', extra: 'Na de herfstvakantie: Way Maker, het lied voor jullie speelstuk' }
  },
  'Nieuwe songbox: Way Maker (Sinach)': {
    week: 11, blok: 'Periode 2 · Eigen songbox Way Maker', code: 'P2 · les 11', bestand: '11 Way Maker - kennismaken.pptx',
    fotos: { titel: F('handen-zonsondergang.jpg'), doel: F('worship-podium.jpg'), fase: [F('sinach.jpg'), F('kerkdienst-nigeria.jpg'), null, null, F('gitaar-akkoord.jpg')], rodeDraad: F('lagos-skyline.jpg') },
    extra: {
      2: D.beeldAkkoorden(['G', 'D', 'Em', 'C']),
      3: D.beeldTabel([['Onderdeel', 'Soort', 'Telt'], ['Samenspel', 'spelen', '× 2'], ['Ritme', 'spelen', '× 2'], ['Toon', 'spelen', '× 2'], ['Techniek', 'spelen', '× 2'], ['Eigen reflectie', 'reflectie', '× 1'], ['Feedback op groepsgenoten', 'reflectie', '× 1']])
    },
    thuis: { mb: 'Eigen songbox Way Maker: luister het lied drie keer', learn: 'De vier akkoorden: G, D, Em, C', extra: 'Bedenk welk instrument je wilt spelen' }
  }
};
(async () => {
  const titels = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(LESSEN);
  for (const t of titels) {
    const l = inhoud.lessen[t]; const o = LESSEN[t]; if (!l || !o) { console.log('onbekend: ' + t); continue; }
    const les = { titel: t, vraag: l.vraag, doel: l.doel, criteria: l.criteria || [], fasen: l.fasen, formatief: l.formatief, identiteit: l.identiteit };
    // fase 2 van Way Maker heeft een vormschema in de app; hier als beeld naast de foto van de kerkdienst past het niet, dus: vormschema op de uitlegdia en foto op de luisterdia
    if (t.startsWith('Nieuwe songbox')) { o.extra[1] = D.beeldVorm(l.fasen[1].beeld.items); o.fotos.fase[1] = null; }
    const uit = path.join(MAP, o.bestand);
    await D.maak(les, { klas: 'havo 3 en vwo 3', week: o.week, blok: o.blok, blokKort: 'periode ' + o.blok.charAt(8), code: o.code, titel: t }, { bestand: uit, fotos: o.fotos, extra: o.extra, thuis: o.thuis });
    console.log('geschreven: ' + uit);
  }
})().catch(e => { console.error(e); process.exit(1); });
