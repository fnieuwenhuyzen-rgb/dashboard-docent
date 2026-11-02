// Maakt lespresentaties uit een inhoudbestand (schema: tools/inhoud-decks-LEESMIJ.md) en werkt tools/presentaties-links.json bij.
// Gebruik: node tools/maak-decks.js tools/inhoud-week10.json [...]   --droog controleert alleen, UIT=<map> schrijft de pptx daarheen.
const fs = require('fs'), path = require('path');
const D = require('./lesdeck');
const { spUrl } = require('./sp');
const ROOT = 'C:/Users/nwn/OneDrive - CSG Prins Maurits/Documenten - Sectie Muziek/';
const THEMA = { klas4: '2B4C8C', klas5: '8C2332', klas6: '2F6B4F', mavo: '1F7A8C' }; // klas 3 blijft oranje
const SLOTS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'basis.json'), 'utf8')).leergangen;
const LINKS = path.join(__dirname, 'presentaties-links.json');
const droog = process.argv.includes('--droog');
const bestanden = process.argv.slice(2).filter(a => !a.startsWith('--'));

function bronnen(map) { const b = {}; const p = path.join(map, 'beeld', 'bronnen.txt'); if (!fs.existsSync(p)) return b; for (const ln of fs.readFileSync(p, 'utf8').split('\n')) { const d = ln.split(' | '); if (d.length >= 5) b[d[0].trim()] = `${d[1].trim()} · ${d[2].trim()} · ${d[3].trim()} · ${d[4].trim()}`; } return b; }
// Alle lesmappen met een beeldmap: een foto uit een andere klas wordt gekopieerd, met de bronregel erbij.
function beeldMappen(d, uit) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (!e.isDirectory() || e.name === '99 Archief') continue; const p = path.join(d, e.name); if (e.name === 'beeld') uit.push(p); else if (uit.diepte !== 0) { const dd = uit.diepte; uit.diepte = dd - 1; beeldMappen(p, uit); uit.diepte = dd; } } return uit; }
let ALLE; const alleBeeld = () => { if (!ALLE) { const u = []; u.diepte = 5; ALLE = beeldMappen(ROOT + '01 Onderbouw muziek', u).concat((() => { const v = []; v.diepte = 5; return beeldMappen(ROOT + '02 Keuzevak muziek', v); })()); } return ALLE; };
function zorgVoor(map, naam) { const doel = path.join(map, 'beeld', naam); if (fs.existsSync(doel)) return doel; const bron = alleBeeld().find(b => fs.existsSync(path.join(b, naam))); if (!bron) return null; if (droog) return path.join(bron, naam);
  fs.mkdirSync(path.dirname(doel), { recursive: true }); fs.copyFileSync(path.join(bron, naam), doel); const rg = fs.readFileSync(path.join(bron, 'bronnen.txt'), 'utf8').split('\n').find(l => l.startsWith(naam + ' |')); if (rg) fs.appendFileSync(path.join(map, 'beeld', 'bronnen.txt'), rg.trim() + '\n'); else console.warn('  geen bronregel voor ' + naam); return doel; }
function fotoObj(map, n) { if (!n) return null; const [naam, f] = n.split('@'); const p = zorgVoor(map, naam); if (!p) { console.warn('  foto ontbreekt: ' + naam); return null; } const br = bronnen(path.dirname(path.dirname(p))); return { pad: p, bron: br[naam] || naam, focus: f ? f.split(',').map(Number) : undefined }; }
function fasenMet(l, b) { if (l.fasen) return l.fasen; const extra = l.fasenExtra || {}; return (b.fasen || []).map((f, i) => Object.assign({}, f, extra[i])); }
// De les: eigen velden gaan voor, de rest komt uit basis.json (veld bronLes).
function lesUit(l) { const b = l.bronLes ? (SLOTS[l.bronLes.lg].weken.find(w => w.w === l.bronLes.w) || {})[l.bronLes.slot] : {}; if (!b) throw new Error('bronLes niet gevonden: ' + JSON.stringify(l.bronLes)); const r = Object.assign({}, b, l); r.fasen = fasenMet(l, b); r.formatief = Object.assign({}, b.formatief, l.formatief); r.titel = l.titel || b.titel; return r; }
function controleer(naam, l, les) { const m = []; const som = les.fasen.reduce((a, f) => a + (f.min || 0), 0); if (som !== 45) m.push('fasen tellen op tot ' + som + ' min'); les.fasen.forEach((f, i) => { if (typeof f === 'string') { m.push('fase ' + i + ' is tekst'); return; } if (!f.notitie || !(f.notitie.vertel || []).length) m.push('fase ' + i + ' zonder notitie.vertel'); });
  if (les.formatief && les.formatief.tekst && !(les.formatief.notitie)) m.push('formatief zonder notitie'); if (les.identiteit && !les.notitieRodeDraad) m.push('identiteit zonder notitieRodeDraad'); if (!les.notitieDoel) m.push('geen notitieDoel'); if (!les.notitieTitel) m.push('geen notitieTitel'); if (!l.koppel || !l.koppel.length) m.push('geen koppel');
  const t = JSON.stringify(les.fasen.map(f => [f.kop, f.stappen, f.notitie, f.docent])) + (les.notitieTitel || ''); if (/way maker/i.test(t) && !l.wayMakerMag) m.push('noemt Way Maker');
  if (m.length) console.warn(`  ${naam}: ${m.join('; ')}`); return m.length; }

(async () => {
  const links = fs.existsSync(LINKS) ? JSON.parse(fs.readFileSync(LINKS, 'utf8')) : []; let fouten = 0;
  for (const bestand of bestanden) {
    const INH = JSON.parse(fs.readFileSync(bestand, 'utf8'));
    for (const [kl, K] of Object.entries(INH)) {
      if (kl.startsWith('_')) continue; const map = ROOT + K.map.replace(/\\/g, '/');
      for (const l of K.lessen) {
        const les = lesUit(l); fouten += controleer(l.bestand, l, les); if (droog) { (Object.values(l.fotos || {}).flat()).forEach(n => { if (n && !zorgVoor(map, n.split('@')[0])) { console.warn('  foto ontbreekt: ' + n); fouten++; } }); continue; }
        const fo = l.fotos || {}; const extra = {}; les.fasen.forEach((f, i) => { const fn = D.extraUit(f.beeld); if (fn) { fn.breed = f.beeld.soort === 'vorm'; extra[i] = fn; } });
        const fotos = { titel: fotoObj(map, fo.titel), doel: fotoObj(map, fo.doel), fase: les.fasen.map((f, i) => extra[i] && !extra[i].breed ? null : fotoObj(map, (fo.fase || [])[i])), rodeDraad: fotoObj(map, fo.rodeDraad) };
        const meta = { klas: K.klas, week: l.week, blok: K.blok, blokKort: K.blokKort, code: l.code, titel: les.titel, kort: l.kort, accent: THEMA[K.thema] };
        const uit = path.join(process.env.UIT || map, l.bestand); await D.maak(les, meta, { bestand: uit, fotos, extra, thuis: Object.assign({}, K.thuis, l.thuis) }); console.log('geschreven: ' + uit);
        const u = spUrl(K.map + '\\' + l.bestand); for (const k of l.koppel) { const i = links.findIndex(x => x.lg === k.lg && x.w === k.w && x.slot === k.slot && x.bestand === l.bestand); const reg = { lg: k.lg, w: k.w, slot: k.slot, t: 'Presentatie: ' + (l.kort || les.titel) + ' (PowerPoint)', u, bestand: l.bestand }; if (i >= 0) links[i] = reg; else links.push(reg); }
      }
    }
  }
  if (!droog && !process.env.UIT) fs.writeFileSync(LINKS, JSON.stringify(links, null, 2) + '\n');
  console.log(fouten ? fouten + ' lessen met meldingen' : 'geen meldingen');
})().catch(e => { console.error(e); process.exit(1); });
