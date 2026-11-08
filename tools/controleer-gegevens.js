// node tools/controleer-gegevens.js [--staged] [--tegen=<ref>]
// Bewaakt de gegevensbestanden die live gaan: public/data/basis.json, public/data/beoordeling.json, bron/leergang-data.json.
//  1. geldige JSON met de verwachte hoofdvorm;
//  2. geen aantal dat KLEINER is dan in de vergelijkingsstand (standaard HEAD): zo valt een teruggevallen OneDrive-versie
//     op (2-11: 37 sectietaken, formulieren en presentaties weg) voordat `git add -A` hem meeneemt. Meer is altijd goed;
//  3. geen velden of waarden die op leerlingnamen lijken (privacy: nooit leerlinggegevens in de repo).
// --staged   leest de bestanden uit de git-index (wat er gecommit gaat worden) in plaats van uit de werkmap.
// --tegen=X  vergelijk met ref X in plaats van HEAD (CI: de vorige stand van de branch). Zonder HEAD (eerste commit) valt de vergelijking weg.
// Verwijderen is soms bedoeld: zet dan LESDAG_AANTALLEN_OK=1 voor de opdracht (`LESDAG_AANTALLEN_OK=1 git commit`); de rest blijft gecontroleerd.
// Exitcode 0 = in orde, 1 = fout.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '..');
const GIT = process.env.GIT_EXE || (process.platform === 'win32' && process.env.LOCALAPPDATA && fs.existsSync(path.join(process.env.LOCALAPPDATA, 'Programs', 'Git', 'cmd', 'git.exe')) ? path.join(process.env.LOCALAPPDATA, 'Programs', 'Git', 'cmd', 'git.exe') : 'git');
const argv = process.argv.slice(2);
const staged = argv.includes('--staged');
const tegen = (argv.find(a => a.startsWith('--tegen=')) || '--tegen=HEAD').slice(8);
const BESTANDEN = ['public/data/basis.json', 'public/data/beoordeling.json', 'bron/leergang-data.json'];

const git = args => { try { return cp.execFileSync(GIT, args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return null; } };
const lees = f => { // nu: de te beoordelen stand
  if (staged) { const t = git(['show', ':' + f]); if (t !== null) return t; }
  try { return fs.readFileSync(path.join(root, f), 'utf8'); } catch (e) { return null; }
};
const eerder = f => git(['show', tegen + ':' + f]);

const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
const lijst = [];
function loopAlles(x, pad) {
  if (Array.isArray(x)) x.forEach((v, i) => loopAlles(v, pad + '[' + i + ']'));
  else if (isObj(x)) for (const [k, v] of Object.entries(x)) { lijst.push({ pad: pad + '.' + k, k, v }); loopAlles(v, pad + '.' + k); }
  else lijst.push({ pad, k: null, v: x });
}
const alleLinks = d => { const out = []; (function w(x) { if (Array.isArray(x)) x.forEach(w); else if (isObj(x)) { if (typeof x.t === 'string' && typeof x.u === 'string') out.push(x); Object.values(x).forEach(w); } })(d); return out; };

// ---- maten per bestand: alles wat niet mag dalen ----
function maten(f, d) {
  const m = {};
  if (f.endsWith('beoordeling.json')) { m['beoordelingsmodellen'] = Array.isArray(d) ? d.length : 0; return m; }
  const sec = Array.isArray(d.sectie) ? d.sectie : [];
  m['sectie-items'] = sec.length; m['sectietaken'] = sec.filter(i => i && i.taak).length;
  if (isObj(d.leergangen)) {
    m['leergangen'] = Object.keys(d.leergangen).length;
    m['lesweken (alle leergangen)'] = Object.values(d.leergangen).reduce((n, g) => n + ((g && g.weken) || []).length, 0);
    const les = []; Object.values(d.leergangen).forEach(g => ((g && g.weken) || []).forEach(w => ['l1', 'l2', 'l3'].forEach(s => w && w[s] && les.push(w[s]))));
    m['lessen met inhoud'] = les.filter(l => l.type && l.type !== 'leeg').length;
  }
  if (isObj(d.klassen)) { m['klassen'] = Object.keys(d.klassen).length; m['lesweken (alle klassen)'] = Object.values(d.klassen).reduce((n, g) => n + ((g && g.weken) || []).length, 0); }
  const links = alleLinks(d);
  m['presentaties'] = links.filter(l => /^Presentatie/i.test(l.t) || /\.pptx/i.test(l.u)).length;
  m['formulieren'] = links.filter(l => /forms\.office\.com|forms\.cloud\.microsoft/i.test(l.u) || /formulier/i.test(l.t)).length;
  m['links'] = links.length;
  if (isObj(d.team) || Array.isArray(d.team)) m['team'] = Array.isArray(d.team) ? d.team.length : Object.keys(d.team).length;
  if (isObj(d.toetsweken)) m['toetsweken'] = Object.keys(d.toetsweken).length;
  if (isObj(d.kalender) && Array.isArray(d.kalender.weken)) m['kalenderweken'] = d.kalender.weken.length;
  return m;
}

// ---- privacy: leerlingnamen-achtig ----
const VERBODEN_SLEUTEL = /^(leerlingen|leerlingnaam|leerlingnamen|voornaam|achternaam|tussenvoegsel|klaslijst|klassenlijst|leerlingnummer|leerlingnr|stamnummer|studentnummer|geboortedatum|verjaardag|jarig|scores|cijfers|beoord|namen)$/i;
const NAAM_ACHTER_VOOR = /^[A-ZÀ-Ý][\p{L}'’-]+(?: (?:van|de|der|den|ter|te|ten|het|’t|'t)){0,3}, [A-ZÀ-Ý][\p{L}'’-]+(?: [A-ZÀ-Ý][\p{L}'’-]+)?$/u; // "Jansen, Anna" (Testleerling, Anna)
const MAIL_LEERLING = /[\w.+-]+@(?:student|leerling)[\w.-]*/i;
function privacy(f, d) {
  const fouten = []; lijst.length = 0; loopAlles(d, '');
  const toegestaanNaam = /(^|\.)(team|koor)(\.|\[|$)/; // collega's en koorleden mogen in de team- en koorsectie
  for (const { pad, k, v } of lijst) {
    if (k && VERBODEN_SLEUTEL.test(k) && !(Array.isArray(v) && v.length === 0) && v !== '' && v !== null) fouten.push(`veld dat op leerlinggegevens lijkt: ${pad}`);
    if (typeof v === 'string') {
      if (MAIL_LEERLING.test(v)) fouten.push(`leerling-mailadres in ${pad}`);
      if (NAAM_ACHTER_VOOR.test(v) && !toegestaanNaam.test(pad) && !/^(Bach|Händel|Handel|Mozart|Haydn|Beethoven|Brahms|Schubert|Schumann|Chopin|Verdi|Vivaldi|Purcell|Bizet|Britten|Holst|Dvořák|Mahler|Wagner|Satie|Ravel|Debussy|Grieg|Elgar|Orff|Williams|Bernstein|Gershwin|Copland|Stravinsky|Prokofjev|Mendelssohn|Rossini|Puccini|Monteverdi|Palestrina|Telemann)\b/.test(v)) fouten.push(`naam als "Achternaam, Voornaam" in ${pad}: "${v.slice(0, 40)}"`);
    }
  }
  return [...new Set(fouten)].slice(0, 15);
}

const verwachteVorm = (f, d) => {
  if (f.endsWith('beoordeling.json')) return Array.isArray(d) && d.length ? null : 'moet een niet-lege lijst zijn';
  if (f.endsWith('basis.json')) return isObj(d) && isObj(d.leergangen) && Array.isArray(d.sectie) && isObj(d.kalender) ? null : 'mist leergangen, sectie of kalender';
  return isObj(d) && isObj(d.klassen) && Array.isArray(d.sectie) ? null : 'mist klassen of sectie';
};

let fouten = 0; const regels = [];
const meld = (ok, tekst) => { regels.push((ok ? '  ok   ' : '  FOUT ') + tekst); if (!ok) fouten++; };
const aantalOk = process.env.LESDAG_AANTALLEN_OK === '1';
for (const f of BESTANDEN) {
  const tekst = lees(f);
  if (tekst === null) { meld(false, f + ': niet te lezen'); continue; }
  let d; try { d = JSON.parse(tekst); } catch (e) { meld(false, f + ': geen geldige JSON (' + e.message + ')'); continue; }
  const vorm = verwachteVorm(f, d); if (vorm) { meld(false, f + ': ' + vorm); continue; }
  const nu = maten(f, d); const oudTekst = eerder(f); let oud = null;
  if (oudTekst !== null) { try { oud = maten(f, JSON.parse(oudTekst)); } catch (e) { oud = null; } }
  const dalend = [];
  if (oud) for (const [k, w] of Object.entries(oud)) if ((nu[k] || 0) < w) dalend.push(`${k}: ${w} → ${nu[k] || 0}`);
  if (dalend.length && !aantalOk) meld(false, `${f}: minder dan in ${tegen}: ${dalend.join('; ')}. Teruggevallen stand (OneDrive)? Vergelijk met ${tegen}; bedoeld? zet LESDAG_AANTALLEN_OK=1`);
  else meld(true, `${f}: ${Object.entries(nu).map(([k, w]) => w + ' ' + k).join(', ')}${oud ? '' : ' (geen vergelijkingsstand)'}${dalend.length ? ' [dalingen toegestaan: ' + dalend.join('; ') + ']' : ''}`);
  const pr = privacy(f, d); if (pr.length) meld(false, `${f}: mogelijk leerlinggegevens: ${pr.join(' | ')}`);
}
console.log('Gegevens' + (staged ? ' (staged)' : '') + ' vergeleken met ' + tegen + ':\n' + regels.join('\n'));
console.log(fouten ? `\n${fouten} fout(en). Niet committen voor dit is nagekeken.` : '\nGegevens in orde.');
process.exit(fouten ? 1 : 0);
