// Maakt de lespresentaties voor lesweek 9 (2-6 november 2026) uit inhoud-week9.json en zet de lesinhoud klaar voor de app.
// Gebruik: node tools/maak-decks-week9.js && node tools/merge-inhoud.js wk9app havo3 vwo3 mavo3 --force
const fs = require('fs'), path = require('path');
const D = require('./lesdeck');
const { spUrl } = require('./sp');
const INH = JSON.parse(fs.readFileSync(path.join(__dirname, 'inhoud-week9.json'), 'utf8'));
const ROOT = 'C:/Users/nwn/OneDrive - CSG Prins Maurits/Documenten - Sectie Muziek/';
const THEMA = { mavo: '1F7A8C' }; // klas 3 blijft oranje

function bronnen(map) { const b = {}; const p = path.join(map, 'beeld', 'bronnen.txt'); if (!fs.existsSync(p)) return b; for (const ln of fs.readFileSync(p, 'utf8').split('\n')) { const d = ln.split(' | '); if (d.length >= 5) b[d[0].trim()] = `${d[1].trim()} · ${d[2].trim()} · ${d[3].trim()} · ${d[4].trim()}`; } return b; }
function fotoObj(map, br, n) { if (!n) return null; const p = path.join(map, 'beeld', n); if (!fs.existsSync(p)) { console.warn('  foto ontbreekt: ' + n); return null; } return { pad: p, bron: br[n] || n }; }
function beeldFragment(e) { return (s, vak) => {
  s.addShape('roundRect', { x: vak.x, y: vak.y + 0.4, w: vak.w, h: 2.9, fill: { color: D.K.zand }, line: { color: D.K.zandrand, width: 0.75 }, rectRadius: 0.12 });
  s.addText(e.k, { x: vak.x + 0.25, y: vak.y + 0.6, w: vak.w - 0.5, h: 0.4, fontFace: 'Encode Sans', fontSize: 16, bold: true, color: D.K.inkt, margin: 0, isTextBox: true });
  s.addText(e.t, { x: vak.x + 0.25, y: vak.y + 1.05, w: vak.w - 0.5, h: 1.3, fontFace: 'Encode Sans', fontSize: 14, color: D.K.tekst, margin: 0, isTextBox: true, valign: 'top' });
  s.addText(e.link, { x: vak.x + 0.25, y: vak.y + 2.5, w: vak.w - 0.5, h: 0.5, fontFace: 'Encode Sans', fontSize: 16, bold: true, color: D.K.accent, hyperlink: { url: e.u }, margin: 0, isTextBox: true });
}; }
function extraFn(e) { if (!e) return null; if (e.soort === 'kaarten') return D.beeldKaarten(e.items); if (e.soort === 'fragment') return beeldFragment(e); return null; }

(async () => {
  const app = { _mat: { mb: { t: 'Musicbox (digitaal.musicboxmethode.nl)', u: 'https://digitaal.musicboxmethode.nl' } }, lessen: {} };
  for (const [kl, K] of Object.entries(INH)) {
    const map = ROOT + K.map.replace(/\\/g, '/'); const br = bronnen(map);
    K.lessen.forEach((l, i) => {
      const key = 'pres-' + kl + '-' + (i + 1);
      app._mat[key] = { t: 'Presentatie: ' + (l.kort || l.titel) + ' (PowerPoint)', u: spUrl(K.map + '\\' + l.bestand) };
      // het fragment is voor de les een link in het materiaal; in de app telt alleen de fase zelf
      const fasen = l.fasen.map(f => { const c = Object.assign({}, f); if (c.beeld && c.beeld.soort === 'fragment') delete c.beeld; return c; });
      const mat = [key]; (l.fasen.filter(f => f.beeld && f.beeld.soort === 'fragment')).forEach((f, j) => { const fk = key + '-f' + (j + 1); app._mat[fk] = { t: 'Fragment: ' + f.beeld.t.split('.')[0], u: f.beeld.u }; mat.push(fk); }); mat.push('mb');
      app.lessen[l.titel] = { vraag: l.vraag, doel: l.doel, criteria: l.criteria, fasen, formatief: l.formatief, identiteit: l.identiteit, materiaal: mat, benodigd: l.benodigd };
    });
    for (const l of K.lessen) {
      const fo = l.fotos || {};
      const fotos = { titel: fotoObj(map, br, fo.titel), doel: fotoObj(map, br, fo.doel), fase: (fo.fase || []).map(n => fotoObj(map, br, n)), rodeDraad: fotoObj(map, br, fo.rodeDraad) };
      const extra = {}; l.fasen.forEach((f, i) => { const fn = extraFn(f.beeld); if (fn) extra[i] = fn; });
      const les = { titel: l.titel, kort: l.kort, vraag: l.vraag, doel: l.doel, criteria: l.criteria, fasen: l.fasen, formatief: l.formatief, identiteit: l.identiteit };
      const meta = { klas: K.klas, week: 9, blok: K.blok, blokKort: K.blokKort, code: l.code, titel: l.titel, kort: l.kort, accent: THEMA[K.thema] };
      const uit = path.join(map, l.bestand);
      await D.maak(les, meta, { bestand: uit, fotos, extra, thuis: K.thuis || {} });
      console.log('geschreven: ' + uit);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'inhoud-wk9app.json'), JSON.stringify(app, null, 2) + '\n');
})().catch(e => { console.error(e); process.exit(1); });
