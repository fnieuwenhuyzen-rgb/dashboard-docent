// node tools/staten/maak.js: maakt per tijdperk van app.js (git-geschiedenis) een staat in de vorm van toen, met verzonnen voorbeeldgegevens.
// Eenmalig gedraaid; de uitkomst staat in tools/staten/oud-<hash>.json en wordt door test-staten.js gebruikt. Geen echte gegevens.
const cp = require('child_process'), fs = require('fs'), path = require('path'), vm = require('vm');
const git = process.env.GIT || (process.env.LOCALAPPDATA + '/Programs/Git/cmd/git.exe');
const TIJD = [['8fa224d', '2026-10-20'], ['426b65d', '2026-10-21'], ['3455768', '2026-10-27'], ['7c24e8b', '2026-10-29'], ['9438a59', '2026-10-29'], ['f2ab3ca', '2026-10-30'],
  ['7d33c4d', '2026-11-02'], ['6b4501e', '2026-11-03'], ['fecf13b', '2026-11-03'], ['ba18f25', '2026-11-03'], ['fa2f40a', '2026-11-05'], ['a96bd78', '2026-11-06']];
const uit = path.join(__dirname);
for (const [h, dag] of TIJD) {
  const src = cp.execFileSync(git, ['show', h + ':public/app.js'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const regels = src.split('\n'); const i = regels.findIndex(l => /^function nieuweStaat\(\)/.test(l)); let j = i; while (!/\}; \}\s*$/.test(regels[j])) j++;
  const ctx = {}; vm.createContext(ctx);
  const a = regels.findIndex(l => /^const ROLLEN_START/.test(l)), b = regels.findIndex(l => /^const POTJES_START/.test(l));
  const pre = a >= 0 ? regels.slice(a, b + 1).join('\n') : 'const ROLLEN_START=[],POTJES_START=[];';
  vm.runInContext(pre + '\n' + regels.slice(i, j + 1).join('\n') + '\nthis.S = nieuweStaat();', ctx);
  const S = JSON.parse(JSON.stringify(ctx.S));
  // verzonnen voorbeeldgegevens, alleen voor velden die in dat tijdperk bestonden
  const heeft = k => k in S; S.updated = Date.parse(dag + 'T12:00:00+01:00');
  S.rooster = [{ id: 'r1', dag: 1, start: '8:30', eind: '9:15', groep: 'tv4', lokaal: '009' }, { id: 'r2', dag: 2, start: '9:15', eind: '10:00', groep: 'tb1' }];
  S.groepLeergang = { tv4: 'vwo4' }; S.voortgang = { tv4: { 'vwo4:1.1': { st: 'gegeven', auto: true }, 'vwo4:1.2': { st: 'gegeven', n: 'korte notitie' } } };
  S.les = { 'vwo4:2.1': { titel: 'Eigen titel', materiaal: [{ t: 'Link', u: 'https://example.org/x' }] } };
  S.uitval = { '2026-10-26': ['r1'] }; S.sectieAf = { s1: true }; S.sectieNotitie = { s1: 'verzonnen notitie' }; S.sectieExtra = [{ id: 'x1', titel: 'Extra', d: '2026-11-10' }];
  if (heeft('taken')) { S.taken = [{ id: 't1', titel: 'Toets nakijken', d: '2026-10-28', min: 30 }, { titel: 'Zonder id', af: true }]; S.dagTaken = { '2026-10-28': { 'sectie:s1': true } }; }
  if (heeft('koorAf')) S.koorAf = { k1: true };
  if (heeft('beoord')) S.beoord = { lijsten: { tb1: [{ id: 'l1', naam: 'Testleerling, Anna' }] }, toetsen: { 'p1-bb1-gitaar|tb1': { ll: { l1: { s: { k1: 3 }, v: {}, opm: {} } }, volgorde: ['l1'], start: dag } } };
  if (heeft('pauzes')) { S.pauzes = [{ id: 'p1', dag: 1, start: '12:00', eind: '12:20' }]; S.rust = { '2026-10-30': 'weg' }; S.duur = { theorie: [1.1, 0.9] }; S.goed = { 'tv4|vwo4:1.1': true }; }
  if (heeft('afwezig')) { S.afwezig = { '2026-11-02': { herstel: {} } }; S.ankers = { tv4: { 'vwo4:1.3': { s: '2026-11-09', uur: 'r1', reden: 'x', d: dag } } }; S.afwijkingen = [{ id: 'af1', g: 'tv4', lesIds: ['vwo4:1.3'], d: dag }]; }
  if (heeft('reclame')) { S.reclame = { rc1: { bord: true } }; S.reclameAf = { rc1: true }; S.reclameExtra = [{ id: 'rx', titel: 'Reclame', d: '2026-11-12' }]; }
  if (heeft('duurLog')) S.duurLog = [{ s: 'overig', t: '', e: 25, d: dag, id: 'oud' }];
  if (heeft('extraUren')) S.extraUren = [{ id: 'e1', s: '2026-11-09', start: '13:00', eind: '13:45', groep: 'th3' }];
  if (heeft('rollen')) S.rollen = (S.rollen || []).map((r, k) => Object.assign({}, r, { uren: k ? '' : '120' }));
  fs.writeFileSync(path.join(uit, 'oud-' + h + '.json'), JSON.stringify(S, null, 1));
  console.log(h, dag, Object.keys(S).length + ' velden');
}
