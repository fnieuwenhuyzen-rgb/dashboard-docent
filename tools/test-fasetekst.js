// Fasen als tekst in de lade (Les aanpassen): heen en terug zonder verlies, en een kopregel die niet precies volgens het formaat is
// getypt valt niet uiteen. Draaien: node tools/test-fasetekst.js
const path = require('path'); const assert = require('assert');
global.window = undefined; require(path.join(__dirname, '..', 'public', 'lesmodus.js')); const LM = globalThis.LESMODUS;
const B = require(path.join(__dirname, '..', 'public', 'data', 'basis.json'));
let n = 0, fout = 0; const is = (naam, a, b) => { try { assert.deepStrictEqual(a, b); } catch (e) { fout++; console.log('FOUT ' + naam + ': ' + JSON.stringify(a).slice(0, 160)); } };
// 1. alle lessen heen en terug
for (const [lg, L] of Object.entries(B.leergangen)) for (const w of L.weken || []) for (const k of Object.keys(w).filter(k => /^l\d+$/.test(k))) {
  const f = (w[k] || {}).fasen; if (!Array.isArray(f) || !f.length || f.some(x => typeof x !== 'object')) continue; n++;
  const terug = LM.tekstNaarFasen(LM.fasenNaarTekst(f), f).map(x => ({ min: x.min, soort: x.soort, kop: x.kop, stappen: x.stappen, klaar: x.klaar, docent: x.docent }));
  const oud = f.map(x => ({ min: x.min || 0, soort: x.soort || 'doen', kop: x.kop || '', stappen: x.stappen || [], klaar: x.klaar, docent: x.docent }));
  is(lg + ':' + w.w + '.' + k.slice(1), JSON.parse(JSON.stringify(terug)), JSON.parse(JSON.stringify(oud)));
}
// 2. getypt met een streepje, zonder kop, met een onbekende soort
const t = LM.tekstNaarFasen('10 min - uitleg - Akkoorden\n- Luister\n> niet verklappen\n5 min · afsluiten\n15 min | instructie | Samen\n- Speel');
is('streepje', [t.length, t[0].soort, t[0].kop, t[0].stappen, t[0].docent], [3, 'uitleg', 'Akkoorden', ['Luister'], 'niet verklappen']);
is('zonder kop', [t[1].min, t[1].soort, t[1].kop], [5, 'afsluiten', '']);
is('onbekende soort', [t[2].soort, t[2].kop, t[2].stappen], ['doen', 'Samen', ['Speel']]);
console.log(fout ? fout + ' fouten' : `fasetekst: alles goed (${n} lessen heen en terug)`); process.exit(fout ? 1 : 0);
