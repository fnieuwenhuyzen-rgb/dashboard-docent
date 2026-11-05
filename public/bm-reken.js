// Rekenregels en tekstverwerking van de beoordelingsmodus, zonder scherm en zonder opslag (test: tools/beoordeling/test-reken.js).
// T = de toets uit S.beoord.toetsen; L = de laag waarin gescoord wordt: T zelf, of een tussenstand uit T.tussen.
(function (root) {
'use strict';
const rond1 = x => Math.round(Math.round(x * 1000) / 1000 * 10) / 10;
const fmt = x => x == null ? '' : x.toFixed(1).replace('.', ',');

/* ---------- model ---------- */
const critVan = (m, T) => (T && T.vast && T.vast.crit) || m.onderdelen.flatMap(o => o.criteria.map(c => Object.assign({ groep: o.groep }, c)));
const delenVan = (m, T) => { if (T && T.vast && T.vast.delen) return T.vast.delen; if (m.delen) return m.delen; const zb = +m.zelfbeoordeling || 0; return zb ? { docent: 100 - zb, zelf: zb } : { docent: 100 }; };
const groepVan = (T, id) => (T.groepjes || []).find(g => g.leden.includes(id)) || null;
// speelbox: de leerling kiest een partij en een niveau (velden uit m.speelkeuze). v = de ingevulde velden.
const niveauVan = (m, v) => { const k = m.speelkeuze; return k && v ? (k.niveaus || []).find(n => n.naam === v[k.niveauVeld || 'Niveau']) || null : null; };
const plafondVan = (m, v) => { const n = niveauVan(m, v); return n && n.plafond != null ? +n.plafond : null; };
// het criterium met de naam en teksten van de gekozen partij. Geen of een onbekende partij: de algemene tekst.
function critVoor(m, c, v) {
  const k = m.speelkeuze; if (!k || !c.perPartij || !v) return c;
  const p = (k.partijen || []).find(x => x.naam === v[k.partijVeld]); const o = p && c.perPartij[p.soort]; if (!o) return c;
  return Object.assign({}, c, o, { leerling: null });
}
const veldenVan = (L, T, id) => Object.assign({}, ((T && T.ll && T.ll[id]) || {}).v, ((L && L.ll && L.ll[id]) || {}).v);

/* ---------- cijfers ---------- */
// geldende score van één criterium. Een eigen score gaat altijd voor; een startpunt-groepsscore telt pas als hij per leerling is bevestigd.
function scoreVan(L, T, id, c) {
  const r = L.ll[id]; const eigen = r && r.s ? r.s[c.id] : null;
  const g = groepVan(T, id); const gs = g && L.gs && L.gs[g.id] ? L.gs[g.id][c.id] : null;
  if (eigen != null) return { v: eigen, b: 'eigen', g: gs == null ? null : gs };
  if (gs != null && c.groepsscore === true) return { v: gs, b: 'groep', g: gs };
  return { v: null, b: null, g: gs == null ? null : gs };
}
function docentCijfer(m, L, T, id) {
  const C = critVan(m, T); let som = 0, w = 0;
  for (const c of C) { const s = scoreVan(L, T, id, c); if (s.v == null) return null; som += s.v * c.weging; w += c.weging; }
  return w ? rond1(som / w) : null;
}
function klasgenoten(r, min) { // gemiddelde pas vanaf het minimum aantal inzendingen
  const k = (r && r.klas) || {}; const w = [...(k.forms || []), ...(k.papier || [])];
  const gem = w.length && w.length >= (min || 1) ? rond1(w.reduce((a, b) => a + b, 0) / w.length) : null;
  return { n: w.length, gem };
}
// alle delen van het eindcijfer. Ontbreekt een deel, dan is er geen eindcijfer.
function eind(m, L, T, id) {
  const r = L.ll[id]; const D = L === T ? delenVan(m, T) : { docent: 100 }; // een tussenstand kent alleen het docentdeel
  if (L === T && r && r.vast) { const v = r.vast; return { d: v.d, z: v.z == null ? null : v.z, k: v.k == null ? null : v.k, kn: v.kn || 0, e: v.e, delen: D, mist: [], vast: true }; }
  const d = docentCijfer(m, L, T, id); const mist = []; if (d == null) mist.push('docent');
  const z = r && r.zelf != null ? r.zelf : null; if (D.zelf && z == null) mist.push('zelf');
  const kg = D.klasgenoten ? klasgenoten(r, +m.klasgenotenMin || 3) : { n: 0, gem: null }; if (D.klasgenoten && kg.gem == null) mist.push('klasgenoten');
  const ruw = mist.length ? null : rond1((d * D.docent + (D.zelf ? z * D.zelf : 0) + (D.klasgenoten ? kg.gem * D.klasgenoten : 0)) / 100);
  const pl = plafondVan(m, veldenVan(L, T, id)); const e = ruw != null && pl != null ? Math.min(ruw, pl) : ruw; // plafond per niveau geldt voor het eindcijfer
  return { d, z, k: kg.gem, kn: kg.n, e, ruw, plafond: pl, delen: D, mist, vast: false };
}
// legt cijfers, scores, wegingen en tijdstip vast. Later afgeronde leerlingen (inhalen) rekenen met dezelfde vastgelegde wegingen.
function afronden(m, T, lijst, nu) {
  const C = critVan(m, T); const klaar = [];
  for (const x of lijst) {
    const r = T.ll[x.id]; if (!r || r.vast || r.af) continue;
    const u = eind(m, T, T, x.id); if (u.e == null) continue;
    const s = {}; for (const c of C) { const q = scoreVan(T, T, x.id, c); s[c.id] = { v: q.v, b: q.b }; }
    r.vast = { op: nu, s, d: u.d, z: u.z, k: u.k, kn: u.kn, e: u.e };
    klaar.push(x.id);
  }
  if (klaar.length) { if (!T.vast) T.vast = { eerst: nu, crit: C, delen: delenVan(m, T), weging: m.weging == null ? null : m.weging, min: +m.klasgenotenMin || 3 }; T.vast.laatst = nu; }
  return klaar;
}
function heropen(T, id) { const r = T.ll[id]; if (r) delete r.vast; if (T.vast && !Object.values(T.ll).some(x => x.vast)) delete T.vast; }
// de kolom voor Magister: precies één regel per leerling, in de volgorde van de lijst, leeg als er (nog) geen afgerond cijfer is
const kolom = (T, lijst) => lijst.map(x => { const r = T.ll[x.id]; return r && r.vast ? fmt(r.vast.e) : ''; });

/* ---------- getallen ---------- */
function leesCijfer(t) { // "7,5" of "8": een cijfer van 1 tot en met 10 met hooguit één decimaal, anders null
  const s = String(t == null ? '' : t).trim().replace(',', '.'); if (!/^\d{1,2}(\.\d+)?$/.test(s)) return null;
  const x = +s; return x >= 1 && x <= 10 ? rond1(x) : null;
}

/* ---------- namen ---------- */
const kaal = n => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ıİ]/g, 'i').replace(/[łŁ]/g, 'l').replace(/[øØ]/g, 'o').replace(/ß/g, 'ss').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const delen = n => kaal(n).split(' ').filter(Boolean).sort();
const sleutel = n => delen(n).join(' ');
function afstand(a, b) { let p = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { const q = [i]; for (let j = 1; j <= b.length; j++) q[j] = Math.min(p[j] + 1, q[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = q; } return p[b.length]; }
function lijkt(a, b) { // 0..1: dezelfde woorden in elke volgorde, of bijna dezelfde spelling
  const A = delen(a), Bb = delen(b); if (!A.length || !Bb.length) return 0;
  const samen = A.filter(w => Bb.includes(w)).length / Math.max(A.length, Bb.length);
  const x = sleutel(a), y = sleutel(b); return Math.max(samen, 1 - afstand(x, y) / Math.max(x.length, y.length));
}
const besteMatch = (naam, lijst, drempel) => { let best = null, s = drempel == null ? 0.6 : drempel; for (const x of lijst) { const q = lijkt(naam, x.naam); if (q >= s) { s = q; best = x; } } return best; };
// nieuwe lijst tegen de oude: exact of alleen hoofdletters/spaties verschillend = dezelfde leerling, de rest legt de app voor aan Frans
function vergelijkLijst(namen, oud) {
  const vrij = oud.slice(); const neem = x => { vrij.splice(vrij.indexOf(x), 1); return x; };
  const rij = namen.map(naam => ({ naam, id: null, voorstel: null }));
  for (const u of rij) { const x = vrij.find(o => o.naam === u.naam); if (x) u.id = neem(x).id; }
  for (const u of rij) if (!u.id) { const x = vrij.find(o => kaal(o.naam) === kaal(u.naam)); if (x) u.id = neem(x).id; }
  for (const u of rij) if (!u.id) { const x = besteMatch(u.naam, vrij); if (x) u.voorstel = x.id; }
  return { rij, vrij };
}

/* ---------- plakken uit Excel (Microsoft Forms) ---------- */
function leesTabel(txt) { // tabs en regels; tekst tussen aanhalingstekens mag regeleinden bevatten
  const rijen = []; let rij = [], cel = '', q = false; const t = String(txt || '').replace(/\r\n?/g, '\n');
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"' && t[i + 1] === '"') { cel += '"'; i++; } else if (ch === '"') q = false; else cel += ch; continue; }
    if (ch === '"' && !cel) q = true; else if (ch === '\t') { rij.push(cel.trim()); cel = ''; } else if (ch === '\n') { rij.push(cel.trim()); rijen.push(rij); rij = []; cel = ''; } else cel += ch; }
  if (cel || rij.length) { rij.push(cel.trim()); rijen.push(rij); }
  return rijen.filter(r => r.some(Boolean));
}
const IS_VAN = /^(naam|name|e-?mail|e-?mailadres|wie ben je|jouw naam|je naam|mijn naam)\b/i;
const IS_NIET = /^(id|begintijd|tijd van voltooiing|voltooiingstijd|start ?time|completion ?time|laatste wijzig|last modified|toelichting|opmerking|tip)/i;
// Twee vormen: (a) een kolom per klasgenoot met een cijfer per inzender; (b) een rij per beoordeling met een kolom "wie" en een kolom "cijfer".
function leesKlasgenoten(txt, lijst) {
  const rijen = leesTabel(txt); const uit = { vorm: null, per: {}, onbekend: [], fout: null, rijen: Math.max(0, rijen.length - 1), ongeldig: 0, zelf: 0 };
  lijst.forEach(x => { uit.per[x.id] = []; });
  if (rijen.length < 2) { uit.fout = 'Plak de kolomkoppen en minstens één inzending.'; return uit; }
  const kop = rijen[0], body = rijen.slice(1); const vanK = kop.findIndex(k => IS_VAN.test(k));
  const vindLeerling = t => { const a = delen(t); return lijst.find(x => { const b = delen(x.naam); return b.length && b.every(w => a.includes(w)); }) || null; };
  const naamK = kop.map((k, i) => (i === vanK || IS_VAN.test(k) || IS_NIET.test(k)) ? null : vindLeerling(k));
  const getalK = kop.map((k, i) => (i === vanK || IS_VAN.test(k) || IS_NIET.test(k)) ? 0 : body.filter(r => leesCijfer(r[i]) != null).length);
  const isZelf = (r, x) => vanK >= 0 && r[vanK] && kaal(r[vanK]) && sleutel(r[vanK]) === sleutel(x.naam);
  if (naamK.filter(Boolean).length >= 2) { // (a) kolom per klasgenoot
    uit.vorm = 'kolom per klasgenoot';
    kop.forEach((k, i) => {
      const x = naamK[i];
      if (!x) { if (getalK[i] > 0) uit.onbekend.push({ label: k, w: body.map(r => leesCijfer(r[i])).filter(v => v != null) }); return; }
      for (const r of body) { if (!r[i]) continue; if (isZelf(r, x)) { uit.zelf++; continue; } const v = leesCijfer(r[i]); if (v == null) uit.ongeldig++; else uit.per[x.id].push(v); }
    });
    return uit;
  }
  // (b) rij per beoordeling
  const cijfK = (() => { const benoemd = kop.findIndex((k, i) => /cijfer|score|gemiddeld/i.test(k) && getalK[i] > 0); if (benoemd >= 0) return benoemd; let b = -1, n = 0; getalK.forEach((q, i) => { if (q > n) { n = q; b = i; } }); return b; })();
  const wieScore = kop.map((k, i) => (i === vanK || i === cijfK || IS_VAN.test(k) || IS_NIET.test(k)) ? -1 : body.filter(r => r[i] && vindLeerling(r[i])).length + (/wie|klasgenoot|groepsgenoot|leerling|beoordeel/i.test(k) ? 0.5 : 0));
  const wieK = wieScore.indexOf(Math.max(...wieScore));
  if (cijfK < 0 || wieK < 0 || wieScore[wieK] < 0.5) { uit.fout = 'Ik herken geen kolom met namen en cijfers. Plak de hele tabel met de kolomkoppen.'; return uit; }
  uit.vorm = 'rij per beoordeling';
  const gezien = new Map(); // zelfde inzender en zelfde klasgenoot: de laatste telt
  body.forEach((r, ri) => { const t = r[wieK]; if (!t) return; const v = leesCijfer(r[cijfK]); if (v == null) { uit.ongeldig++; return; } const x = vindLeerling(t);
    if (x && isZelf(r, x)) { uit.zelf++; return; }
    gezien.set(vanK >= 0 && r[vanK] ? kaal(r[vanK]) + '|' + kaal(t) : 'r' + ri, { t, x, v }); });
  const onb = {};
  for (const { t, x, v } of gezien.values()) { if (x) uit.per[x.id].push(v); else (onb[t] = onb[t] || []).push(v); }
  uit.onbekend = Object.entries(onb).map(([label, w]) => ({ label, w }));
  return uit;
}

/* ---------- inleverbak: bestanden uit de uploadvraag van Forms ---------- */
// Forms noemt een upload <origineel>_<naam inzender>.<ext>, en bij dezelfde naam <origineel>_<naam inzender> 1.<ext> (gemeten 5-11-2026).
function leesInlever(naam) {
  const m = /^(.*)\.([^.]+)$/.exec(String(naam || '')); const stam = m ? m[1] : String(naam || ''); const ext = m ? m[2].toLowerCase() : '';
  const i = stam.lastIndexOf('_'); if (i < 1) return { origineel: stam, inzender: '', ext };
  return { origineel: stam.slice(0, i), inzender: stam.slice(i + 1).replace(/\s+\d+$/, '').trim(), ext };
}
// alleen een duidelijke, enige beste naam telt automatisch; de rest legt de app voor aan Frans
function vindInzender(t, lijst) { if (!t) return null; let best = [], s = 0.85; for (const x of lijst) { const q = lijkt(t, x.naam); if (q > s) { s = q; best = [x]; } else if (q === s) best.push(x); } return best.length === 1 ? best[0] : null; }
// bestanden: [{ naam, pad }]. vast: { pad: leerling-id of 'x' (niet meetellen) }. Een inzender uit een groepje levert in voor het hele groepje.
function koppelInlever(bestanden, lijst, T, vast) {
  const uit = { per: {}, onbekend: [], genegeerd: 0 }; lijst.forEach(x => { uit.per[x.id] = []; });
  for (const b of bestanden) { const q = leesInlever(b.naam); const hand = (vast || {})[b.pad];
    if (hand === 'x') { uit.genegeerd++; continue; }
    const x = hand ? lijst.find(y => y.id === hand) : vindInzender(q.inzender, lijst);
    if (!x) { const v = besteMatch(q.inzender, lijst); uit.onbekend.push(Object.assign({}, b, q, { voorstel: v ? v.id : null })); continue; }
    uit.per[x.id].push(Object.assign({}, b, q, { hand: !!hand }));
    const G = groepVan(T || {}, x.id); if (G) for (const id of G.leden) if (id !== x.id && uit.per[id]) uit.per[id].push(Object.assign({}, b, q, { via: x.naam })); }
  return uit;
}

const API = { leesInlever, koppelInlever, rond1, fmt, niveauVan, plafondVan, critVoor, veldenVan, critVan, delenVan, groepVan, scoreVan, docentCijfer, klasgenoten, eind, afronden, heropen, kolom, leesCijfer, kaal, lijkt, besteMatch, vergelijkLijst, leesTabel, leesKlasgenoten };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.BMR = API;
})(typeof window !== 'undefined' ? window : globalThis);
