// Haalt de agenda van het schoolkoor uit de Koorapp (D1 pmkoor-leden, nieuwste rij van inhoud_versies) en zet die
// in public/data/basis.json onder "koor": repetities, extra repetities en concerten met tijd en plaats, het
// repetitieplan (stuk, aandachtspunt, minuten), taken voor de dirigent die uit de koordata volgen en de vaste voorbereiding per concert (VOORBEREIDING).
// Gebruik: node tools/koor-sync.js            (leest live via wrangler, met de Koorapp-map als werkmap)
//          node tools/koor-sync.js inhoud.json (uitvoer van `wrangler d1 execute ... --json`)
// Bewust NIET overgenomen (de Koorapp staat achter de schoollogin, basis.json is openbaar): notities voor koorleden,
// thuis oefenen, praktische concertinformatie, WhatsApp-link, ledengegevens. Voor die details: knop naar de Koorapp.
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const KOORAPP = 'C:/Users/nwn/OneDrive - CSG Prins Maurits/Documenten/Claude werkmap/Koorapp';
const URL = 'https://pmkoor.f-nieuwenhuyzen.workers.dev/';
const root = path.join(__dirname, '..');

function lees() {
  let tekst;
  if (process.argv[2]) tekst = fs.readFileSync(process.argv[2], 'utf8');
  else tekst = execSync('"' + path.join(path.dirname(process.execPath), 'npx.cmd') + '" --yes wrangler@4.151.2 d1 execute pmkoor-leden --remote --json --command "SELECT id, data FROM inhoud_versies ORDER BY id DESC LIMIT 1"', { cwd: KOORAPP, env: Object.assign({}, process.env, { PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH }), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] });
  tekst = tekst.replace(/^\uFEFF/, ''); const r = JSON.parse(tekst.slice(tekst.indexOf('[')));
  const rij = r[0].results[0];
  return { versie: rij.id, data: JSON.parse(rij.data) };
}
// "12.45–14.15", "19.00–20.30 · Hervormde kerk Sommelsdijk", "Zierikzee · tijden volgen"
function tijdEnPlaats(t) {
  const s = String(t || ''); const delen = s.split('·').map(x => x.trim()).filter(Boolean);
  let van = '', tot = '', plaats = [];
  for (const d of delen) {
    const m = d.match(/^(\d{1,2})[.:](\d{2})\s*(?:[–—-]|tot)\s*(\d{1,2})[.:](\d{2})$/);
    const m1 = d.match(/^(\d{1,2})[.:](\d{2})(\s*uur)?$/);
    if (m) { van = `${+m[1]}:${m[2]}`; tot = `${+m[3]}:${m[4]}`; }
    else if (m1) { van = `${+m1[1]}:${m1[2]}`; }
    else if (!/tijden volgen/i.test(d)) plaats.push(d);
  }
  return { van, tot, plaats: plaats.join(' · ') };
}
const addD = (s, n) => { const d = new Date(s + 'T12:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const werkdag = s => { const w = new Date(s + 'T12:00').getDay(); return w === 6 ? addD(s, -1) : w === 0 ? addD(s, -2) : s; }; // deadline in het weekend: de vrijdag ervoor
const fmt = s => { const d = new Date(s + 'T12:00'); return `${['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'][d.getDay()]} ${d.getDate()} ${['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][d.getMonth()]}`; };

const { versie, data } = lees();
const vandaag = new Date().toISOString().slice(0, 10);
const vanaf = addD(vandaag, -7);
const concerten = {};
for (const [id, c] of Object.entries(data.concerten || {})) concerten[id] = { naam: c.naam || id, pr: c.praktisch || null };
// zelfde regel als de .ics van de Koorapp: van vertrek of verzamelen (anders inzingen of aanvang) tot het einde, anders twee uur na de aanvang
const eersteTijd = t => { const m = String(t || '').match(/(\d{1,2})[.:](\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };
const hm = m => Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
function praktischTijden(pr) { if (!pr) return null; const van = [pr.vertrek, pr.verzamelen, pr.inzingen, pr.aanvang].map(eersteTijd).find(x => x != null); const aan = eersteTijd(pr.aanvang); let tot = eersteTijd(pr.einde); if (tot == null && aan != null) tot = aan + 120; return van != null && tot != null && tot > van ? { van: hm(van), tot: hm(tot) } : null; }
const agenda = (data.agenda || []).filter(a => a.d >= vanaf).map(a => {
  const tp = tijdEnPlaats(a.time);
  const item = { d: a.d, type: a.type, titel: a.title || '', van: tp.van, tot: tp.tot, plaats: tp.plaats, tijdTekst: a.time || '' };
  if (a.concert && concerten[a.concert]) { item.concert = concerten[a.concert].naam; if (a.type === 'concert' && !item.van) { const pt = praktischTijden(concerten[a.concert].pr); if (pt) { item.van = pt.van; item.tot = pt.tot; item.tijdUitPraktisch = true; } } }
  if (Array.isArray(a.plan) && a.plan.length) item.plan = a.plan.map(p => ({ stuk: p[0] || '', aandacht: p[1] || '', min: p[2] || '' }));
  return item;
});
const p = path.join(root, 'public/data/basis.json');
const basis = JSON.parse(fs.readFileSync(p, 'utf8'));
// vaste voorbereiding per concert: [sleutel, dagen voor het concert, titel, toelichting]. basis.json is openbaar: alleen algemene tekst.
// De dag zelf en na afloop staan niet in Lesdag, die blijven op de papieren checklist (Checklist uitvoering.docx in de Koorapp-map).
const VOORBEREIDING = [
  ['programma', 42, 'Programma en volgorde vastleggen', 'Met de totale duur, inclusief opkomsten en wisselingen.'],
  ['begeleiding', 42, 'Begeleider of orkest afspreken', 'Partijen, tempi, tijden, vergoeding. Ook een bladomslager.'],
  ['locatie', 42, 'Locatie regelen', 'Sleutel, contactpersoon, koorbanken, stoelen, lessenaars, verwarming en licht, ruimte voor omkleden en inzingen.'],
  ['rechten', 28, 'Kopieerrecht en Buma/Stemra nakijken', ''],
  ['stemmen', 28, 'Stemmen van piano of orgel afspreken', 'Zo kort mogelijk voor het concert laten stemmen.'],
  ['kaarten', 28, 'Kaartverkoop en aankondiging buiten school regelen', 'Weekinfo en borden staan apart bij Reclame.'],
  ['ouders', 21, 'Ouders informeren', 'Tijden, kleding, vervoer, ophaalplek. Vraag ook wie niet op foto of film mag.'],
  ['boekje', 21, 'Programmaboekje laten nakijken', 'Namen, teksten, vertalingen.'],
  ['afmeldingen', 14, 'Afmeldingen per partij bekijken', 'Klopt de stemverdeling nog?'],
  ['solisten', 14, 'Vervangers voor solisten aanwijzen', ''],
  ['aanspreekpunt', 14, 'Aanspreekpunt voor de dag aanwijzen', 'Spreek ook af wie welkom heet en wie bedankt.'],
  ['opstelling', 14, 'Opstelling per partij maken', ''],
  ['mappen', 7, 'Mappen controleren', 'Compleet en op programmavolgorde, vóór de laatste repetitie.'],
  ['kopieen', 7, 'Extra muziek kopiëren', ''],
  ['blaadje', 3, 'Blaadje met alle afspraken en de checklist printen', 'Na de laatste repetitie, dan klopt het nog.']
];
const ZICHT = 7, TE_LAAT = 7; // een taak komt een week voor de deadline in beeld; nieuwe taken met een deadline langer dan een week geleden worden niet meer aangemaakt
const bestond = new Set(((basis.koor || {}).taken || []).map(t => t.id)); // wat al bestond blijft staan: een open taak verdwijnt niet door een nieuwe sync
// taken voor de dirigent: wat de koordata zelf als open aangeeft, plus de vaste voorbereiding
const taken = [];
for (const a of agenda) {
  if (a.type !== 'concert') continue;
  const naam = a.concert || a.titel; const dl = addD(a.d, -28); // een week voor "Ouders informeren"
  if (/tijden volgen/i.test(a.tijdTekst)) taken.push({ id: `koor-tijden-${a.d}`, titel: `Tijden ${naam} (${fmt(a.d)}) in de koorapp zetten`, d: dl, sub: 'In de koorapp staat nog "tijden volgen". Vul de tijden en Praktisch in bij Beheer.' });
  const c = Object.values(data.concerten || {}).find(x => (x.naam || '') === a.concert);
  const noot = (data.agenda.find(x => x.d === a.d && x.type === 'concert') || {}).note || '';
  if (/repertoire volgt/i.test(noot) || (c && !(c.stukken || []).length)) taken.push({ id: `koor-repertoire-${a.d}`, titel: `Repertoire ${naam} kiezen en in de koorapp zetten`, d: addD(a.d, -84), sub: 'In de koorapp staat nog "het repertoire volgt".' });
  if (/\bbus\b/i.test(noot) && !(c && c.praktisch && c.praktisch.vervoer)) taken.push({ id: `koor-vervoer-${a.d}`, titel: `Vervoer naar ${naam} regelen (bus)`, d: addD(a.d, -28), sub: 'De koorapp noemt een bus, maar bij Praktisch staat nog geen vervoer.' });
}
for (const a of agenda) {
  if (a.type !== 'concert' || a.d < vandaag) continue;
  const naam = a.concert || a.titel; const sleutel = (Object.keys(concerten).find(k => concerten[k].naam === a.concert) || 'concert') + '-' + a.d.slice(0, 4); // blijft gelijk als de datum binnen het jaar schuift
  for (const [k, n, titel, sub] of VOORBEREIDING) {
    const id = `koor-voor-${sleutel}-${k}`; const d = werkdag(addD(a.d, -n));
    if (d >= addD(vandaag, -TE_LAAT) || bestond.has(id)) taken.push({ id, titel: `${titel} (${naam})`, d, sub: (sub + ' Concert: ' + fmt(a.d) + '.').trim(), zicht: ZICHT, tot: a.d });
  }
}
for (const v of data.voorjaar || []) if (/datum volgt/i.test(v.text || '')) taken.push({ id: 'koor-voorjaar', titel: `${v.title}: datum vastleggen`, sub: v.text });

basis.koor = { bron: 'Koorapp', url: URL, inhoudsversie: versie, bijgewerkt: new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Amsterdam' }).slice(0, 16),
  standaard: { dag: 2, van: '12:45', tot: '14:00', titel: 'Schoolkoor' }, agenda, taken };
fs.writeFileSync(p, JSON.stringify(basis), 'utf8');
console.log(`koor: inhoudsversie ${versie}, ${agenda.length} agenda-items vanaf ${vanaf}, ${taken.length} taken`);
for (const a of agenda) console.log(`  ${a.d} ${a.type.padEnd(7)} ${(a.van ? a.van + '–' + a.tot : '').padEnd(12)} ${a.titel}${a.plaats ? ' · ' + a.plaats : ''}`);
for (const t of taken) console.log(`  taak ${t.d || '(geen datum)'}: ${t.titel}`);
