// Koppelt de foto's uit de lespresentaties aan Geef les: verkleint ze naar public/beeld/les en schrijft public/lesfotos.js.
// Bronnen: de inhoudbestanden van maak-decks.js (veld fotos + koppel), lesweek 8 (tabel FOTOS in maak-decks-week8.js)
// en lesweek 9 (fotos in inhoud-week9.json); bij die twee loopt de koppeling via de presentatielink in het materiaal van de les.
// Een fasefoto komt alleen mee als de fase in de app dezelfde kop heeft als in de presentatie; anders alleen titel en doel.
// Een les met eigen foto's in HANDMATIG hieronder wordt niet overschreven.
// Gebruik: node tools/koppel-lesfotos.js [--droog]      (verkleinen met Python en Pillow: tools/verklein-foto.py)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { spUrl } = require('./sp');
const ROOT = 'C:/Users/nwn/OneDrive - CSG Prins Maurits/Documenten - Sectie Muziek/';
const UIT = path.join(__dirname, '..', 'public', 'beeld', 'les');
const droog = process.argv.includes('--droog');
const LG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'basis.json'), 'utf8')).leergangen;
const HANDMATIG = {
  'mavo3:8.1': {
    titel: { src: 'beeld/les/bandles-leerlingen.jpg', bron: 'U.S. Army USAREURBC, Staff Sgt. Joshua Dahl · publiek domein', focus: '60% 40%' },
    doel: { src: 'beeld/les/gitaar-akkoord.jpg', bron: 'Nenad Stojkovic · CC BY 2.0' }
  }
};

// alle beeldmappen in de sectiemap (zelfde zoektocht als maak-decks.js), met hun bronregels
function beeldMappen(d, diepte, uit) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (!e.isDirectory() || e.name === '99 Archief') continue; const p = path.join(d, e.name); if (e.name === 'beeld') uit.push(p); else if (diepte > 0) beeldMappen(p, diepte - 1, uit); } return uit; }
const MAPPEN = beeldMappen(ROOT + '01 Onderbouw muziek', 5, []).concat(beeldMappen(ROOT + '02 Keuzevak muziek', 5, []));
const BRON = {}; // naam -> regel uit bronnen.txt
for (const m of MAPPEN) { const p = path.join(m, 'bronnen.txt'); if (!fs.existsSync(p)) continue; for (const ln of fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '').split('\n')) { const d = ln.split(' | ').map(s => s.trim()); if (d.length >= 5 && !BRON[d[0]]) BRON[d[0]] = d; } }
function zoek(naam, voorkeur) { const v = voorkeur && path.join(ROOT + voorkeur.replace(/\\/g, '/'), 'beeld', naam); if (v && fs.existsSync(v)) return v; const m = MAPPEN.find(b => fs.existsSync(path.join(b, naam))); return m ? path.join(m, naam) : null; }
const licentie = l => /^public domain$/i.test(l) ? 'publiek domein' : l;

const lesId = (lg, w, slot) => `${lg}:${w}.${String(slot).replace(/^l/, '')}`;
const appLes = (lg, w, slot) => { const x = LG[lg] && LG[lg].weken.find(y => y.w === w); return x && x[slot]; };
// lessen in basis.json die deze presentatie als materiaal hebben
function metPresentatie(map, bestand) { const u = spUrl(map + '\\' + bestand); const r = []; for (const [lg, L] of Object.entries(LG)) for (const w of L.weken) for (const slot of Object.keys(w).filter(k => /^l\d+$/.test(k))) if ((w[slot].materiaal || []).some(m => m.u === u)) r.push({ lg, w: w.w, slot }); return r; }
const kopVan = f => (typeof f === 'string' ? f : (f && f.kop) || '').trim().toLowerCase();

const nodig = new Map(); // bestandsnaam in public/beeld/les -> {bron, naam}
const meldingen = [];
function foto(n, map, wat) {
  if (!n) return null; const [naam, f] = n.split('@'); const bron = zoek(naam, map);
  if (!bron) { meldingen.push(`foto ontbreekt: ${naam} (${wat})`); return null; }
  const doel = naam.replace(/\.(png|jpe?g)$/i, '.jpg');
  nodig.set(doel, { bron, naam });
  const r = BRON[naam]; if (!r) meldingen.push(`geen bronregel: ${naam}`);
  const o = { src: 'beeld/les/' + doel, bron: r ? `${r[3]} · ${licentie(r[2])}` : '' };
  if (f) { const [x, y] = f.split(',').map(Number); o.focus = `${Math.round(x * 100)}% ${Math.round(y * 100)}%`; }
  return o;
}

// verzamel: [{lg, w, slot, fotos: {titel, doel, fase[]}, fasen (koppen in de presentatie), map}]
const lessen = [];
for (const f of fs.readdirSync(__dirname).filter(f => /^inhoud-.*\.json$/.test(f))) {
  const I = JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
  for (const [kl, K] of Object.entries(I)) {
    if (kl.startsWith('_') || !K || !Array.isArray(K.lessen)) continue;
    for (const l of K.lessen) {
      if (!l.fotos || !Object.values(l.fotos).flat().some(Boolean)) continue;
      let doelen = l.koppel || [];
      if (!doelen.length && l.bestand) doelen = metPresentatie(K.map, l.bestand);
      if (!doelen.length) { meldingen.push(`geen les gevonden voor ${f} ${kl} ${l.bestand || l.titel}`); continue; }
      for (const k of doelen) lessen.push({ lg: k.lg, w: k.w, slot: k.slot, fotos: l.fotos, fasen: l.fasen, map: K.map, bronLes: l.bronLes, wat: f });
    }
  }
}
// lesweek 8: tabel in maak-decks-week8.js, sleutel klas|eerste 4 tekens van de pptx
{
  const src = fs.readFileSync(path.join(__dirname, 'maak-decks-week8.js'), 'utf8');
  const FOTOS = Function('return ' + src.match(/const FOTOS = (\{[\s\S]*?\n\});/)[1])();
  const I = JSON.parse(fs.readFileSync(path.join(__dirname, 'inhoud-week8.json'), 'utf8'));
  for (const [kl, K] of Object.entries(I)) {
    if (kl.startsWith('_')) continue;
    for (const l of K.lessen) {
      const fo = FOTOS[kl + '|' + l.bestand.slice(0, 4)]; if (!fo) continue;
      const doelen = metPresentatie(K.map, l.bestand);
      if (!doelen.length) { meldingen.push(`geen les gevonden voor week 8 ${kl} ${l.bestand}`); continue; }
      for (const k of doelen) lessen.push({ lg: k.lg, w: k.w, slot: k.slot, fotos: fo, fasen: l.fasen, map: K.map, wat: 'week8' });
    }
  }
}

const UITKOMST = {}; let fasefotos = 0, fasedrop = 0;
for (const x of lessen) {
  const id = lesId(x.lg, x.w, x.slot); if (HANDMATIG[id]) continue;
  const a = appLes(x.lg, x.w, x.slot); if (!a) { meldingen.push(`les ${id} staat niet in basis.json`); continue; }
  const o = {}; const t = foto(x.fotos.titel, x.map, id), d = foto(x.fotos.doel, x.map, id);
  if (t) o.titel = t; if (d) o.doel = d;
  // fasefoto's: alleen als de kop in de app gelijk is; zonder eigen fasen in de presentatie (bronLes) zijn het de fasen van de app
  const presKop = x.fasen ? x.fasen.map(kopVan) : (a.fasen || []).map(kopVan);
  const fase = (a.fasen || []).map((f, i) => { const n = (x.fotos.fase || [])[i]; if (!n) return null; if (kopVan(f) !== presKop[i]) { fasedrop++; return null; } fasefotos++; return foto(n, x.map, id); });
  if (fase.some(Boolean)) o.fase = fase;
  if (Object.keys(o).length) UITKOMST[id] = Object.assign(UITKOMST[id] || {}, o);
}
const alles = Object.assign({}, UITKOMST, HANDMATIG);
const ids = Object.keys(alles).sort((a, b) => a.localeCompare(b, 'nl', { numeric: true }));

if (!droog) {
  fs.mkdirSync(UIT, { recursive: true });
  const taak = [...nodig].map(([doel, v]) => [v.bron, path.join(UIT, doel)]);
  const lijst = path.join(require('os').tmpdir(), 'lesfotos-verklein.json'); fs.writeFileSync(lijst, JSON.stringify(taak));
  process.stdout.write(execFileSync('python', [path.join(__dirname, 'verklein-foto.py'), lijst], { encoding: 'utf8' }));
  // bronnen.txt: bestaande regels houden, nieuwe erbij
  const bp = path.join(UIT, 'bronnen.txt'); const oud = fs.existsSync(bp) ? fs.readFileSync(bp, 'utf8').replace(/^\uFEFF/, '').split('\n').filter(Boolean) : [];
  const heb = new Set(oud.map(l => l.split(' | ')[0].trim()));
  for (const [doel, v] of nodig) if (!heb.has(doel) && BRON[v.naam]) oud.push([doel, ...BRON[v.naam].slice(1)].join(' | '));
  fs.writeFileSync(bp, oud.join('\n') + '\n', 'utf8');
  const regels = ids.map(id => `  ${JSON.stringify(id)}: ${JSON.stringify(alles[id])}`);
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'lesfotos.js'),
    `/* Foto's per les voor Geef les, op les-id. Verkleind in beeld/les; bron en licentie in beeld/les/bronnen.txt.\n   Geschreven door tools/koppel-lesfotos.js (handmatige lessen staan daar in HANDMATIG). */\nwindow.LESFOTOS = {\n${regels.join(',\n')}\n};\n`, 'utf8');
}
console.log(`${ids.length} lessen met foto's, ${nodig.size} foto's, ${fasefotos} fasefoto's (${fasedrop} weggelaten: andere fase in de app)`);
if (meldingen.length) console.log([...new Set(meldingen)].map(m => '  ' + m).join('\n'));
