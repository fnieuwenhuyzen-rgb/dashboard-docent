// Meet alle presentaties die Lesdag gebruikt, op kopieën in een korte map, en schrijft de uitslag als Markdown.
// De echte bestanden in de sectiemap worden alleen gelezen (gekopieerd), nooit geopend of overschreven.
//
// Gebruik:  node tools/meet-alle-decks.js [--vanaf 2026-11-09] [--weken 8] [--rapport handboek/controle-decks-2026-11.md]
//                                         [--json uit.json] [--geen-overloop] [--sectiemap "pad"]
// Lijst: elke pptx-link in public/data/basis.json (veld materiaal) en tools/presentaties-links.json.
// Per deck: bestand aanwezig, foto's niet vervormd (tools/meet-deck.js), tekst die buiten het vak valt (tools/meet-overloop.ps1,
// echte PowerPoint), bronvermelding (dia of beeld/bronnen.txt), lettertype Encode Sans met vette koppen, sprekersnotities per dia,
// teksten die botsen met vaste regels (voor de klas, telefoon) en of dia's kloppen met de les in de leergang (titel, fasen, datums, toetsen).
// Vereist: pptx-tools met jszip en image-size in %LOCALAPPDATA%\Temp\claude\pptx-tools\node_modules (zoals meet-deck.js).
// Er mag maar één PowerPoint tegelijk draaien op deze laptop: het script wacht tot POWERPNT weg is (max 10 minuten).
const fs = require('fs'), path = require('path'), cp = require('child_process');
const NM = path.join(process.env.LOCALAPPDATA, 'Temp', 'claude', 'pptx-tools', 'node_modules');
const JSZip = require(path.join(NM, 'jszip'));
const crypto = require('crypto');
const root = path.join(__dirname, '..');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const VANAF = arg('vanaf', '2026-11-09'), WEKEN = +arg('weken', 8);
const SECTIE = arg('sectiemap', 'C:/Users/nwn/OneDrive - CSG Prins Maurits/Documenten - Sectie Muziek').replace(/\//g, path.sep);
const RAPPORT = arg('rapport', ''), JSONUIT = arg('json', ''), GEENOVERLOOP = process.argv.includes('--geen-overloop');
const EINDE = new Date(Date.parse(VANAF) + WEKEN * 7 * 864e5).toISOString().slice(0, 10); // exclusief
const basis = JSON.parse(fs.readFileSync(path.join(root, 'public/data/basis.json'), 'utf8'));
const links = JSON.parse(fs.readFileSync(path.join(root, 'tools/presentaties-links.json'), 'utf8'));
const weekDatum = {}; basis.kalender.weken.forEach(x => { weekDatum[x.w] = x.datum; });
const SLOT = { l1: 1, l2: 2, l3: 3 };
// Lessen die niet op de maandag van hun lesweek worden gegeven. Les-id's blijven staan, de datum verschuift (besluit Frans 4-11-2026,
// zie _uitleg in tools/inhoud-pt1-23nov.json en inhoud-p9-23nov.json). Toetslessen volgen vanzelf de datum van hun toets in basis.json.
const VERPLAATST = { 'vwo4:8.l2': '2026-11-16', 'vwo4:10.l2': '2026-11-18' };
const dagVan = iso => ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'][new Date(iso + 'T00:00:00Z').getUTCDay()];
const maandagVan = iso => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
const plusDagen = (iso, n) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);
const ontsnap = t => t.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const norm = t => ontsnap(String(t)).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
const nr = k => +k.match(/(\d+)\.xml$/)[1];

// ---------- 1. de lijst ----------
function spPad(u) { // SharePoint-url naar pad in de sectiemap
  const p = decodeURIComponent(u.split('?')[0]); const m = p.match(/Gedeelde\s+documenten\/(.+)$/); return m ? m[1].replace(/\//g, path.sep) : null;
}
const lijst = new Map();
function voeg(u, lg, w, slot, les) {
  if (!u || !/\.pptx(\?|$)/i.test(u)) return; const rel = spPad(u); if (!rel) return;
  if (!lijst.has(rel)) lijst.set(rel, { rel, bestand: path.basename(rel), lessen: [] });
  const d = lijst.get(rel); if (!d.lessen.some(l => l.lg === lg && l.w === w && l.slot === slot)) d.lessen.push({ lg, w, slot, datum: effDatum(lg, w, slot, les), weekMa: weekDatum[w], titel: les ? les.titel : '' });
}
function effDatum(lg, w, slot, les) {
  if (VERPLAATST[lg + ':' + w + '.' + slot]) return VERPLAATST[lg + ':' + w + '.' + slot];
  const t = les && les.type === 'toets' && les.toets && (basis.leergangen[lg].toetsen || []).find(x => x.id === les.toets);
  return t && t.datum ? t.datum : weekDatum[w];
}
const lesVan = (lg, w, slot) => { const x = basis.leergangen[lg]; const wk = x && x.weken.find(q => q.w === w); return wk ? wk[slot] : null; };
for (const [lg, g] of Object.entries(basis.leergangen)) for (const wk of g.weken) for (const slot of ['l1', 'l2', 'l3']) { const les = wk[slot]; if (!les) continue; for (const m of (les.materiaal || [])) voeg(m.u, lg, wk.w, slot, les); }
for (const a of links) voeg(a.u, a.lg, a.w, a.slot, lesVan(a.lg, a.w, a.slot));
const sleutel = l => l.datum + '.' + (SLOT[l.slot] || 9);
const decks = [...lijst.values()].map(d => { d.lessen.sort((a, b) => sleutel(a).localeCompare(sleutel(b))); d.eerste = d.lessen[0]; d.vroegste = sleutel(d.eerste); return d; });
const voorbij = decks.filter(d => d.lessen.every(l => l.datum < VANAF));
const teMeten = decks.filter(d => !voorbij.includes(d)).sort((a, b) => a.vroegste.localeCompare(b.vroegste) || a.bestand.localeCompare(b.bestand));
for (const d of teMeten) d.venster = d.lessen.some(l => l.datum >= VANAF && l.datum < EINDE);

// ---------- 2. kopieën ----------
const bq = path.join(process.env.LOCALAPPDATA, 'Temp', 'bq', 'md-' + process.pid); fs.mkdirSync(bq, { recursive: true });
const opruimen = () => { try { fs.rmSync(bq, { recursive: true, force: true }); const ouder = path.dirname(bq); if (!fs.readdirSync(ouder).length) fs.rmdirSync(ouder); } catch (e) { } };
process.on('exit', opruimen);
teMeten.forEach((d, i) => {
  d.id = 'd' + String(i + 1).padStart(2, '0'); d.vol = path.join(SECTIE, d.rel); d.kopie = path.join(bq, d.id + '.pptx'); d.m = []; // meldingen
  if (!fs.existsSync(d.vol)) { d.ontbreekt = true; return; }
  fs.copyFileSync(d.vol, d.kopie); d.grootte = fs.statSync(d.kopie).size;
});
const melding = (d, ernst, soort, tekst, todo, dia) => d.m.push({ ernst, soort, tekst, todo, dia });

// ---------- 3. inhoudscontroles per deck ----------
const MAAND = { jan: 1, januari: 1, feb: 2, februari: 2, mrt: 3, maart: 3, apr: 4, april: 4, mei: 5, jun: 6, juni: 6, jul: 7, juli: 7, aug: 8, augustus: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, nov: 11, november: 11, dec: 12, december: 12 };
const iso = (dag, mnd, jr) => `${jr || (mnd >= 8 ? 2026 : 2027)}-${String(mnd).padStart(2, '0')}-${String(dag).padStart(2, '0')}`;
function datumsIn(t) { // geeft [{iso, tekst}]
  const r = [];
  for (const m of t.matchAll(/\b(\d{1,2})\s*(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|jan|feb|mrt|apr|jun|jul|aug|sept?|okt|nov|dec)\b/gi)) { const d = +m[1], mm = MAAND[m[2].toLowerCase()]; if (d >= 1 && d <= 31) r.push({ iso: iso(d, mm), tekst: m[0] }); }
  for (const m of t.matchAll(/\b(?:ma|di|wo|do|vr|za|zo)\s+(\d{1,2})[-\/](\d{1,2})(?:[-\/](\d{2,4}))?(?!\d)/gi)) { const d = +m[1], mm = +m[2]; if (d >= 1 && d <= 31 && mm >= 1 && mm <= 12) r.push({ iso: iso(d, mm, m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : 0), tekst: m[0] }); }
  return r;
}
const leergangDatums = {}; // per klas de datums die in zijn gegevens staan
function geldigeDatums(lg) {
  if (leergangDatums[lg]) return leergangDatums[lg];
  const g = basis.leergangen[lg], s = new Set(); const tekst = JSON.stringify({ t: g.toetsen, h: g.handelingsdelen, v: g.vakanties, m: g.messiah, b: g.blokken });
  for (const m of tekst.matchAll(/\b(20\d\d-\d\d-\d\d)\b/g)) s.add(m[1]); datumsIn(tekst).forEach(x => s.add(x.iso));
  basis.vrijeDagen.forEach(x => s.add(x)); return (leergangDatums[lg] = s);
}
const VERBOD_KLAS = [/\bvoor de (hele )?klas\b/i, /\bvoor (je |jullie )?(klasgenoten|medeleerlingen|de groep)\b/i, /\bklassikaal (laten )?(spelen|zingen|presenteren|voordragen|voorspelen)/i, /\b(voorspelen|voorzingen|voordragen) (aan|voor) /i, /\bvoor (de|je|jullie) (hele )?klas (spelen|zingen|presenteren|laten horen)/i, /\boptreden voor (de|je|jullie) (hele )?(klas|groep|klasgenoten)\b/i, /\bpresenteer\w*\b/i];
const NEGEER = /\b(niet|nooit|geen|niemand|zonder)\b[^.]{0,40}$/i;
const TELEFOON = /\b(telefoons?|mobiel(tje)?s?|smartphones?|gsm|iphones?|qr(-code)?|scan(nen)?)\b/gi;

const plek = (bron, dia) => bron === 'dia' ? `dia ${dia}` : `de notitie bij dia ${dia}`;
const lesInfo = d => d.lessen.map(l => { const les = lesVan(l.lg, l.w, l.slot); return { l, les, g: basis.leergangen[l.lg] }; });
async function inhoud(d, bronIndex) {
  const z = await JSZip.loadAsync(fs.readFileSync(d.kopie));
  const slides = Object.keys(z.files).filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a, b) => nr(a) - nr(b));
  d.dias = slides.length; const slideTekst = [], notities = [], ontbrekendeNotities = [], paragrafen = [];
  const lettertypen = {}, nietVet = [], terugval = new Set(); let fotos = 0; const zonderBron = [], bronAlleenInDeck = [], plaatjes = [];
  const theme = await z.file('ppt/theme/theme1.xml').async('string'); const thFont = (theme.match(/<a:minorFont><a:latin typeface="([^"]*)"/) || [])[1];
  for (const sl of slides) {
    const n = nr(sl); const x = await z.file(sl).async('string'); const rels = await z.file(sl.replace('slides/', 'slides/_rels/') + '.rels').async('string');
    const ps = [...x.matchAll(/<a:p>[\s\S]*?<\/a:p>/g)].map(p => ontsnap([...p[0].matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map(t => t[1]).join('')));
    slideTekst.push(ps.join('\n')); ps.forEach(p => paragrafen.push({ dia: n, p, bron: 'dia' }));
    // lettertype en koppen
    for (const r of x.matchAll(/<a:r>\s*<a:rPr([^>]*)>([\s\S]*?)<\/a:rPr>\s*<a:t[^>]*>([^<]*)<\/a:t>/g)) {
      const tekst = ontsnap(r[3]); if (!tekst.trim()) continue; const lat = (r[2].match(/<a:latin typeface="([^"]*)"/) || [])[1] || null;
      const font = lat && !lat.startsWith('+') ? lat : thFont; if (!lat) terugval.add(n);
      lettertypen[font] = (lettertypen[font] || 0) + 1; if (font !== 'Encode Sans') (lettertypen['_dia'] = lettertypen['_dia'] || {})[font] = (lettertypen['_dia'][font] || new Set()).add(n);
      const sz = +(r[1].match(/\bsz="(\d+)"/) || [0, 0])[1], vet = /\bb="1"/.test(r[1]);
      if (sz >= 2400 && !vet) nietVet.push({ dia: n, tekst: tekst.slice(0, 40) });
    }
    for (const r of x.matchAll(/<a:r>\s*<a:rPr([^>]*)\/>\s*<a:t[^>]*>([^<]*)<\/a:t>/g)) if (r[2].trim()) { terugval.add(n); lettertypen[thFont] = (lettertypen[thFont] || 0) + 1; }
    // foto's en bronvermelding
    const heeftFotoTekst = /\b(foto|bron|beeld|afbeelding|illustratie)\s*:/i.test(slideTekst[slideTekst.length - 1]) || /©/.test(slideTekst[slideTekst.length - 1]);
    for (const m of x.matchAll(/<p:pic>[\s\S]*?<\/p:pic>/g)) {
      fotos++; const rid = (m[0].match(/r:embed="(rId\d+)"/) || [])[1]; const t = rid && (rels.match(new RegExp('Id="' + rid + '"[^>]*Target="([^"]+)"')) || rels.match(new RegExp('Target="([^"]+)"[^>]*Id="' + rid + '"')));
      let bestandInBeeld = null, inBronnen = false;
      if (t) { const buf = await z.file('ppt/' + t[1].replace('../', '')).async('nodebuffer'); const hit = bronIndex(buf); if (hit) { bestandInBeeld = hit.naam; inBronnen = hit.inBronnen; } }
      plaatjes.push({ dia: n, bestandInBeeld, inBronnen, heeftFotoTekst });
      if (!inBronnen && !heeftFotoTekst) zonderBron.push({ dia: n, naam: bestandInBeeld });
      else if (!inBronnen && heeftFotoTekst) bronAlleenInDeck.push({ dia: n, naam: bestandInBeeld });
    }
    // notities
    const nrel = rels.match(/Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/); let nt = '';
    if (nrel) { const nx = await z.file('ppt/notesSlides/' + nrel[1]).async('string'); const body = nx.split('type="sldNum"')[0]; const nps = [...body.matchAll(/<a:p>[\s\S]*?<\/a:p>/g)].map(p => ontsnap([...p[0].matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map(t => t[1]).join(''))); nt = nps.join('\n').trim(); nps.forEach(p => paragrafen.push({ dia: n, p, bron: 'notitie' })); }
    notities.push(nt); if (nt.length < 20) ontbrekendeNotities.push(n);
  }
  const alles = slideTekst.join('\n'), allesNot = notities.join('\n');
  d.fotos = fotos; d.notitieLengtes = notities.map(x => x.length);
  // -- sprekersnotities
  if (ontbrekendeNotities.length) melding(d, 'let-op', 'notities', `${ontbrekendeNotities.length} van ${d.dias} dia's zonder (bruikbare) sprekersnotities: dia ${ontbrekendeNotities.join(', ')}`, `Schrijf notities bij dia ${ontbrekendeNotities.join(', ')} (vertel, voorbeelden, vragen met antwoord, let op), zodat Frans de les eruit kan geven.`);
  // -- lettertype
  const vreemd = Object.keys(lettertypen).filter(f => f !== 'Encode Sans' && f !== '_dia' && f !== '(thema)');
  if (vreemd.length) melding(d, 'fout', 'lettertype', `Lettertype niet Encode Sans: ${vreemd.map(f => `${f} (${lettertypen[f]} tekstdelen, dia ${[...(lettertypen._dia[f] || [])].join(', ')})`).join('; ')}`, `Zet alle tekst in Encode Sans (kopen vet). Bouw het deck bij voorkeur opnieuw met tools/lesdeck.js.`);
  if (terugval.size && !vreemd.length) melding(d, 'fout', 'lettertype', `Tekst zonder eigen lettertype (valt terug op ${thFont}) op dia ${[...terugval].join(', ')}`, 'Zet het lettertype op Encode Sans.');
  if (nietVet.length) melding(d, 'let-op', 'lettertype', `Koppen (24 pt of groter) niet vet: ${nietVet.slice(0, 6).map(v => `dia ${v.dia} '${v.tekst}'`).join('; ')}${nietVet.length > 6 ? ' (en ' + (nietVet.length - 6) + ' meer)' : ''}`, 'Zet deze koppen op vet.');
  // -- bronvermelding
  if (zonderBron.length) melding(d, 'fout', 'bron', `${zonderBron.length} foto('s) zonder bronvermelding (niet op de dia, niet in beeld/bronnen.txt): dia ${[...new Set(zonderBron.map(v => v.dia))].join(', ')}${zonderBron.some(v => v.naam) ? ' (' + zonderBron.filter(v => v.naam).map(v => v.naam).join(', ') + ')' : ''}`, 'Zoek de bron van elke foto, zet een regel in beeld/bronnen.txt (bestand | titel | licentie | maker | url) en laat het deck opnieuw bouwen, of zet "Foto: bron" op de dia. Is de foto niet rechtenvrij: vervangen.');
  if (bronAlleenInDeck.length) melding(d, 'info', 'bron', `Bron staat wel op de dia maar niet in beeld/bronnen.txt: dia ${[...new Set(bronAlleenInDeck.map(v => v.dia))].join(', ')}`, 'Zet de bron ook in beeld/bronnen.txt (de foto is daar niet gevonden of heeft geen regel).');
  // -- vaste regels
  const klasUitgesloten = d.lessen.every(l => !/^(mavo3|havo3|vwo3|kmu3|bb1)$/.test(l.lg)) || false;
  for (const { dia, p, bron } of paragrafen) {
    const examenconcert = /examen-?concert/i.test(p) || d.lessen.some(l => /examen-?concert/i.test(l.titel || '')); // een examenconcert is een echt concert, niet "voor de klas" (besluit Frans 9-11-2026)
    for (const re of VERBOD_KLAS) { if (examenconcert) break; const m = p.match(re); if (!m) continue; const voor = p.slice(0, m.index); if (NEGEER.test(voor.slice(-60))) continue; if (/^presenteer\w*$/i.test(m[0]) && !/klas|groep|elkaar|leraar|docent/i.test(p)) continue;
      const hard = !/^voor de (hele )?klas$/i.test(m[0]) || /(speel|spelen|zing|zingen|presenteer|presenteren|voordragen|laten horen|laat horen|voorspelen|voorzingen)\w*[^.]{0,40}voor de (hele )?klas|voor de (hele )?klas[^.]{0,30}(spelen|zingen|presenteren|voordragen|laten horen)/i.test(p);
      melding(d, hard ? 'fout' : 'let-op', 'regel-klas', `${hard ? 'Mogelijk' : 'Misschien'} voor de klas, gevonden "${m[0]}" (${plek(bron, dia)}): "${p.slice(0, 140)}"`, `Lees ${plek(bron, dia)}. Niemand speelt, zingt of presenteert voor de klas: laat het in groepjes voor de docent (mavo 3 en klas 3: groepjes, MusicBox of 'Duurt te lang'). Herschrijf de tekst.`, dia); break; }
    for (const m of p.matchAll(TELEFOON)) { const na = p.slice(m.index + m[0].length, m.index + m[0].length + 25); const voor = p.slice(Math.max(0, m.index - 40), m.index); if (/^[\s:,.\-–]*(weg|in de tas|in je tas|op de kluis|opbergen|uit|niet|geen)/i.test(na)) continue; if (/\b(geen|niet|nooit|zonder)\s+\w*$/i.test(voor)) continue;
      if (/^(scan(nen)?)$/i.test(m[0]) && !/qr|code/i.test(p)) continue;
      melding(d, 'fout', 'regel-telefoon', `Telefoon in de les, gevonden "${m[0]}" (${plek(bron, dia)}): "${p.slice(0, 140)}"`, `Leerlingen gebruiken in de les geen telefoon (schoolbeleid): opnemen en Musicbox gaan op de laptop van de groep. Herschrijf ${plek(bron, dia)}.`, dia); break; }
  }
  // -- klopt met de leergang
  const info = lesInfo(d), losTekst = norm(alles);
  for (const { l, les, g } of info) {
    const kl = `${l.lg} week ${l.w} ${l.slot}`;
    if (!les) { melding(d, 'fout', 'leergang', `Les ${kl} bestaat niet meer in basis.json maar verwijst naar dit deck`, 'Haal de link weg of herstel de les in basis.json.'); continue; }
    if (l.datum >= VANAF) {
      const woorden = norm(les.titel) ? ontsnap(les.titel).toLowerCase().split(/[^a-zà-ÿ0-9]+/).filter(w => w.length >= 4) : [];
      const gevonden = woorden.filter(w => losTekst.includes(norm(w))).length;
      if (woorden.length && gevonden / woorden.length < 0.5) melding(d, 'let-op', 'leergang', `Titel les ${kl} "${les.titel}" komt nauwelijks terug in het deck (${gevonden} van ${woorden.length} woorden)`, `Controleer of dit deck de les "${les.titel}" is; zo niet, de link in basis.json of het deck aanpassen.`);
      const fasen = (les.fasen || []).filter(f => f && typeof f === 'object' && f.kop);
      const missen = fasen.filter(f => !losTekst.includes(norm(f.kop)));
      if (missen.length) melding(d, 'let-op', 'leergang', `Fase(n) uit de leergang (${kl}) niet in het deck: ${missen.map(f => `"${f.kop}" (${f.min} min)`).join('; ')}`, `Deck en leergang verschillen: bouw het deck opnieuw uit basis.json (tools/maak-decks*.js met de inhoud) of pas de leergang aan, zodat de fasen overeenkomen.`);
      const som = (les.fasen || []).reduce((a, f) => a + ((f && f.min) || 0), 0); if (fasen.length && som !== 45) melding(d, 'info', 'leergang', `Fasen van ${kl} tellen op tot ${som} minuten (lesduur 45)`, 'Controleer de minuten in de fasen.');
      const klasTekens = [...alles.matchAll(/\b(havo|vwo|mavo|kmu|bb)\s?(\d)\b/gi)].map(m => (m[1] + m[2]).toLowerCase());
      const toegestaan = d.lessen.flatMap(x => x.lg === 'kmu3' ? ['kmu3', 'havo3'] : [x.lg]); // kmu3 = keuzeuur havo 3
      if (klasTekens.length && !klasTekens.some(k => toegestaan.includes(k))) melding(d, 'let-op', 'leergang', `Het deck noemt ${[...new Set(klasTekens)].join(', ')} terwijl het bij ${[...new Set(d.lessen.map(x => x.lg))].join(', ')} staat`, 'Controleer of dit het juiste deck voor deze klas is.');
      const blok = g.blokken.find(b => l.w >= b.weken[0] && l.w <= b.weken[1]);
      for (const per of ['barok', 'classicisme', 'romantiek']) if (blok && norm(les.titel).includes(per) && !norm(blok.titel).includes(per.slice(0, 7))) melding(d, 'info', 'leergang', `Les ${kl} gaat over ${per}, maar lesweek ${l.w} valt in blok ${blok.id} "${blok.titel}" (week ${blok.weken[0]} t/m ${blok.weken[1]}). Tegenstrijdigheid in de leergang: niet zelf opgelost`, 'Frans beslist of de blokgrenzen in basis.json of de les klopt; het deck volgt de les.');
    }
    // datums: toetsen per alinea, overige datums tegen de leergang
    const geldig = geldigeDatums(l.lg), wkMa = maandagVan(l.datum), wkVr = plusDagen(wkMa, 4), inWeek = iso => (iso >= wkMa && iso <= wkVr) || (iso >= l.weekMa && iso <= plusDagen(l.weekMa, 4));
    const toetsen = [...(g.toetsen || [])];
    for (const { dia, p, bron } of paragrafen) {
      const ds = datumsIn(p); if (!ds.length) continue;
      const genoemd = toetsen.filter(t => new RegExp('(^|[^A-Za-z0-9])' + t.id + '(?![A-Za-z0-9])').test(p));
      if (/verplaatst|stond|oorspronkelijk|was gepland|eerder/i.test(p)) continue; // uitleg over een verplaatsing: geen fout
      for (const t of genoemd) { const ok = new Set([t.datum, t.herkansing].filter(Boolean)); for (const x of ds) if (!ok.has(x.iso)) { melding(d, 'fout', 'datum', `${plek(bron, dia)}: ${t.id} met datum "${x.tekst}" (${x.iso}), maar de leergang (${l.lg}) zegt ${t.datum}${t.herkansing ? ' (herkansing ' + t.herkansing + ')' : ''}: "${p.slice(0, 120)}"`, `Zet de datum van ${t.id} op ${t.datum} (${t.waar || 'zie leergang'}) in dia ${dia}.`, dia); } }
      if (!genoemd.length) for (const x of ds) if (!geldig.has(x.iso) && !inWeek(x.iso)) melding(d, 'let-op', 'datum', `${plek(bron, dia)}: datum "${x.tekst}" (${x.iso}) staat niet in de leergang van ${l.lg} en valt buiten de week van de les (${wkMa}): "${p.slice(0, 120)}"`, `Controleer de datum in dia ${dia} tegen de leergang en de kalender.`, dia);
    }
    // toets dichtbij: P1 afnemen vóór de toetsdatum
    for (const t of toetsen) if (t.datum && les.toets === t.id && (t.datum < wkMa || t.datum > plusDagen(wkMa, 6)))
      melding(d, 'let-op', 'leergang', `Les ${kl} "${les.titel}" gaat over ${t.id}, maar ${t.id} staat op ${t.datum} en de les staat op ${l.datum} (lesweek ${l.w}). Tegenstrijdigheid in de leergang, niet zelf opgelost`, `Frans beslist op welke dag de les is; daarna het deck (datums, "vandaag") en de leergang gelijk zetten.`);
    if (l.datum !== l.weekMa) melding(d, 'info', 'leergang', `Les ${kl} staat in lesweek ${l.w} (ma ${dagNaam(l.weekMa)}) maar wordt gegeven op ${dagVan(l.datum)} ${dagNaam(l.datum)} (verplaatst, besluit Frans 4-11-2026). Het rapport rekent met die datum`, 'Niets, tenzij de datum is veranderd: dan de lijst VERPLAATST in tools/meet-alle-decks.js bijwerken.');
  }
  // voor de leesbaarheid: dubbele meldingen samenvoegen
  const gezien = new Set(); d.m = d.m.filter(m => { const k = m.soort + m.tekst; if (gezien.has(k)) return false; gezien.add(k); return true; });
}

// ---------- 4. bronindex voor foto's (alleen bestanden met gelijke grootte worden gehasht) ----------
function bouwBronIndex() {
  const mappen = []; (function zoek(dir) { let ent; try { ent = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; } for (const e of ent) { if (!e.isDirectory() || /^99 Archief$/i.test(e.name)) continue; const p = path.join(dir, e.name); if (e.name.toLowerCase() === 'beeld') mappen.push(p); else zoek(p); } })(SECTIE);
  const bestanden = []; for (const m of mappen) { let bron = new Set(); try { bron = new Set(fs.readFileSync(path.join(m, 'bronnen.txt'), 'utf8').split(/\r?\n/).map(r => r.split('|')[0].trim().toLowerCase()).filter(Boolean)); } catch (e) { } for (const f of fs.readdirSync(m)) { const p = path.join(m, f); try { const st = fs.statSync(p); if (st.isFile() && !/\.txt$/i.test(f)) bestanden.push({ p, naam: f, size: st.size, inBronnen: bron.has(f.toLowerCase()), map: m }); } catch (e) { } } }
  const poging = new Map();
  return buf => { const kand = bestanden.filter(b => b.size === buf.length); if (!kand.length) return null; const h = crypto.createHash('sha1').update(buf).digest('hex'); for (const k of kand) { if (!poging.has(k.p)) poging.set(k.p, crypto.createHash('sha1').update(fs.readFileSync(k.p)).digest('hex')); if (poging.get(k.p) === h) return k; } return null; };
}

// ---------- 5. meet-deck.js en meet-overloop.ps1 ----------
function meetDeck(ds) {
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'meet-deck.js'), ...ds.map(d => d.kopie)], { env: Object.assign({}, process.env, { V: '1' }), encoding: 'utf8', maxBuffer: 1e8 }); let cur = null;
  if (r.status !== 0) { ds.forEach(d => melding(d, 'let-op', 'meting', 'meet-deck.js liep vast: ' + (r.stderr || '').slice(0, 200), 'Draai node tools/meet-deck.js op dit deck apart.')); return; }
  for (const regel of r.stdout.split(/\r?\n/)) {
    const s = regel.match(/^(d\d+)\.pptx: (\d+) foto's, (\d+) vervormd/); if (s) { cur = ds.find(d => d.id === s[1]); cur.vervormd = []; continue; }
    const m = cur && regel.match(/^\s+slide(\d+) .*afwijking ([\d.]+)%/); if (m && +m[2] > 1) cur.vervormd.push({ dia: +m[1], afw: +m[2] });
  }
  for (const d of ds) if (d.vervormd && d.vervormd.length) melding(d, 'fout', 'foto', `${d.vervormd.length} vervormde foto('s): ${d.vervormd.map(v => `dia ${v.dia} (${v.afw}% afwijking)`).join(', ')}`, `Plaats de foto('s) opnieuw met cover-bijsnijding (lesdeck.js foto()); bron-bestand niet uitrekken.`);
}
function wachtOpPowerPoint() {
  const draait = () => (cp.spawnSync('tasklist', ['/FI', 'IMAGENAME eq POWERPNT.EXE', '/NH'], { encoding: 'utf8' }).stdout || '').includes('POWERPNT');
  const t0 = Date.now(); while (draait()) { if (Date.now() - t0 > 600000) return false; cp.spawnSync('powershell', ['-NoProfile', '-Command', 'Start-Sleep -Seconds 10']); } return true;
}
function meetOverloop(ds) {
  if (!wachtOpPowerPoint()) { ds.forEach(d => melding(d, 'let-op', 'meting', 'Overloop niet gemeten: PowerPoint was 10 minuten in gebruik', 'Draai tools/meet-overloop.ps1 later op dit deck.')); return; }
  const ps1 = path.join(__dirname, 'meet-overloop.ps1'); const q = s => "'" + s.replace(/'/g, "''") + "'";
  const r = cp.spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `[Console]::OutputEncoding=[Text.Encoding]::UTF8; & ${q(ps1)} ${ds.map(d => q(d.kopie)).join(' ')}`], { encoding: 'utf8', maxBuffer: 1e8, timeout: 30 * 60000 });
  const per = {}; ds.forEach(d => { per[d.id] = { regels: [], klaar: false }; });
  for (const regel of (r.stdout || '').split(/\r?\n/)) {
    let m = regel.match(/^(d\d+)\.pptx dia (\d+): (.*)$/); if (m && per[m[1]]) { per[m[1]].regels.push({ dia: +m[2], tekst: m[3] }); continue; }
    m = regel.match(/^(d\d+)\.pptx: (\d+) dia's, (\d+) meldingen/); if (m && per[m[1]]) per[m[1]].klaar = true;
  }
  for (const d of ds) { const o = per[d.id]; if (!o.klaar) { melding(d, 'let-op', 'meting', 'Overloop niet gemeten (PowerPoint kon het deck niet openen)', 'Draai tools/meet-overloop.ps1 op dit deck apart.'); continue; }
    const dias = {}; o.regels.forEach(x => { (dias[x.dia] = dias[x.dia] || []).push(x.tekst); }); const nrs = Object.keys(dias);
    d.overloop = o.regels.length; if (!nrs.length) continue;
    const overlap = o.regels.filter(x => /^overlap/.test(x.tekst)).length;
    const verh = x => { const m = x.tekst.match(/^(hoogte|breedte) (\d+) in vak (\d+)/); return m ? +m[2] / +m[3] : 0; };
    const ernstig = o.regels.filter(x => verh(x) > 1.1).length, matig = o.regels.filter(x => verh(x) > 1.03 && verh(x) <= 1.1).length, buiten = ernstig;
    melding(d, ernstig ? 'fout' : (matig || overlap) ? 'let-op' : 'info', 'overloop', `Tekst buiten zijn vak of over andere tekst: ${nrs.length} dia('s) (${ernstig} meer dan 10% te groot, ${matig} 3 tot 10%, ${o.regels.length - ernstig - matig - overlap} minder dan 3%, ${overlap} overlap): ` + nrs.slice(0, 6).map(n => `dia ${n}: ${dias[n][0].slice(0, 90)}`).join(' | ') + (nrs.length > 6 ? ` | en dia ${nrs.slice(6).join(', ')}` : ''), `Open een kopie van het deck, kijk op dia ${nrs.join(', ')} en kort de tekst of vergroot het vak. Bouw het deck bij voorkeur opnieuw met tools/lesdeck.js (regelt hoogtes).`); }
}

// ---------- 6. uitvoeren ----------
(async () => {
  const meetbaar = teMeten.filter(d => !d.ontbreekt);
  teMeten.filter(d => d.ontbreekt).forEach(d => melding(d, 'fout', 'bestand', `Bestand staat niet in de sectiemap: ${d.rel}`, `Zet het deck terug (of bouw het opnieuw) op ${d.rel}, of haal de link uit basis.json en tools/presentaties-links.json.`));
  const bronIndex = bouwBronIndex();
  for (const d of meetbaar) await inhoud(d, bronIndex);
  if (meetbaar.length) meetDeck(meetbaar);
  if (meetbaar.length && !GEENOVERLOOP) meetOverloop(meetbaar);
  const ERNST = { fout: 0, 'let-op': 1, info: 2 };
  for (const d of teMeten) { d.m.sort((a, b) => ERNST[a.ernst] - ERNST[b.ernst]); d.nFout = d.m.filter(m => m.ernst === 'fout').length; d.nLet = d.m.filter(m => m.ernst === 'let-op').length; }
  // lessen in het venster zonder presentatie
  const zonder = []; for (const [lg, g] of Object.entries(basis.leergangen)) for (const wk of g.weken) { if (!(wk.datum >= VANAF && wk.datum < EINDE)) continue; for (const slot of ['l1', 'l2', 'l3']) { const les = wk[slot]; if (!les || les.type === 'uitval') continue; if (!(les.materiaal || []).some(m => /\.pptx/i.test(m.u || '')) && !links.some(a => a.lg === lg && a.w === wk.w && a.slot === slot)) zonder.push({ lg, w: wk.w, datum: wk.datum, slot, titel: les.titel, type: les.type }); } }
  zonder.sort((a, b) => a.datum.localeCompare(b.datum) || a.lg.localeCompare(b.lg) || a.slot.localeCompare(b.slot));
  const uit = { vanaf: VANAF, einde: EINDE, gemeten: teMeten.length, voorbij: voorbij.map(d => d.bestand), decks: teMeten.map(d => ({ id: d.id, rel: d.rel, bestand: d.bestand, venster: d.venster, lessen: d.lessen, dias: d.dias, fotos: d.fotos, grootte: d.grootte, ontbreekt: !!d.ontbreekt, nFout: d.nFout, nLet: d.nLet, meldingen: d.m })), zonderPresentatie: zonder };
  if (JSONUIT) fs.writeFileSync(JSONUIT, JSON.stringify(uit, null, 1), 'utf8');
  const md = maakRapport(uit, teMeten); if (RAPPORT) fs.writeFileSync(RAPPORT, md, 'utf8'); else console.log(md);
  console.log(`Gemeten: ${meetbaar.length} decks (${teMeten.filter(d => d.venster).length} in de komende ${WEKEN} weken), ${teMeten.reduce((a, d) => a + d.nFout, 0)} fouten, ${teMeten.reduce((a, d) => a + d.nLet, 0)} let-op; voorbij: ${voorbij.length}.`);
})().catch(e => { console.error(e); process.exit(1); });

// ---------- 7. rapport ----------
function dagNaam(iso) { const d = new Date(iso + 'T00:00:00Z'); return d.getUTCDate() + ' ' + ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][d.getUTCMonth()]; }
function klassen(d) { return [...new Set(d.lessen.map(l => l.lg))].join(' + '); }
function lesTekst(d) { return d.lessen.map(l => `${l.lg} wk ${l.w}.${l.slot[1]} (${dagVan(l.datum)} ${dagNaam(l.datum)})`).join(', '); }
function maakRapport(uit, ds) {
  const o = []; const venster = ds.filter(d => d.venster), rest = ds.filter(d => !d.venster);
  const rij = d => { const eerste = d.m.find(m => m.ernst === 'fout') || d.m.find(m => m.ernst === 'let-op'); return `| ${d.nFout ? 'FOUT' : d.nLet ? 'let op' : 'ok'} | ${d.lessen.map(l => `wk ${l.w}.${l.slot[1]}`).join(', ')} (${dagVan(d.eerste.datum)} ${dagNaam(d.eerste.datum)}) | ${klassen(d)} | ${d.bestand} | ${d.nFout} | ${d.nLet} | ${eerste ? eerste.soort + ': ' + eerste.tekst.slice(0, 90).replace(/\|/g, '/') : ''} |`; };
  o.push(`# Controle presentaties, ${uit.vanaf}`, '', `Gemeten op ${new Date().toISOString().slice(0, 10)} met \`node tools/meet-alle-decks.js --vanaf ${uit.vanaf} --weken ${WEKEN} --rapport handboek/controle-decks-2026-11.md\`. Lijst uit \`public/data/basis.json\` (materiaal) en \`tools/presentaties-links.json\`. Er is gemeten op kopieën in \`%LOCALAPPDATA%\\Temp\\bq\` (daarna opgeruimd); de bestanden in de sectiemap zijn alleen gelezen. **Niets is hersteld**: dat doet een volgende sessie aan de hand van de "Te doen"-regels per deck.`, '');
  o.push(`**${venster.length} decks in de komende ${WEKEN} weken (ma ${dagNaam(uit.vanaf)} t/m zo ${dagNaam(plusDagen(uit.einde, -1))}), ${rest.length} daarna in het schooljaar, ${uit.voorbij.length} al voorbij (niet gemeten).** Fouten: ${ds.reduce((a, d) => a + d.nFout, 0)}, let-op: ${ds.reduce((a, d) => a + d.nLet, 0)}.`, '');
  o.push('Wat is gemeten: foto\'s niet vervormd, tekst binnen het vak (echte PowerPoint), bronvermelding (dia of `beeld/bronnen.txt`), Encode Sans met vette koppen, sprekersnotities bij elke dia, vaste regels (niet voor de klas, geen telefoon in de les), en of titel, fasen en datums kloppen met de les en toets in `basis.json`. De controle op datums en regels is tekstzoekwerk: lees de gemelde zin altijd zelf na.', '');
  o.push('Volgorde: wat het eerst voor de klas komt, bovenaan. Per deck eerst fouten, dan let-op, dan info.', '');
  o.push(`## Komende ${WEKEN} weken`, '', '| Stand | Les | Klas | Deck | Fout | Let op | Eerste probleem |', '|---|---|---|---|---|---|---|', ...venster.map(rij), '');
  const blokken = (arr) => { for (const d of arr) { o.push(`### ${d.bestand}`, '', `- Klas en les: ${klassen(d)}; ${lesTekst(d)}. Titel in leergang: ${d.lessen.map(l => lesVan(l.lg, l.w, l.slot)).filter(Boolean).map(x => x.titel).filter((x, i, a) => a.indexOf(x) === i).join(' / ') || '?'}.`, `- Bestand: \`${d.rel.replace(/\\/g, '/')}\`${d.ontbreekt ? ' **ONTBREEKT**' : ` (${d.dias} dia's, ${d.fotos} foto's, ${(d.grootte / 1048576).toFixed(1)} MB)`}`);
      if (!d.m.length) o.push('- Geen meldingen. Niets te doen.'); for (const m of d.m) o.push(`- **${m.ernst.toUpperCase()} · ${m.soort}**: ${m.tekst}`, `  - Te doen: ${m.todo}`); o.push(''); } };
  blokken(venster);
  o.push('## Rest van het schooljaar', '', '| Stand | Les | Klas | Deck | Fout | Let op | Eerste probleem |', '|---|---|---|---|---|---|---|', ...rest.map(rij), '');
  blokken(rest);
  if (uit.voorbij.length) o.push('## Al voorbij (niet gemeten)', '', ...uit.voorbij.map(b => `- ${b}`), '');
  o.push(`## Lessen in de komende ${WEKEN} weken zonder presentatie`, '', 'Geen pptx-link in `basis.json` of `presentaties-links.json`. Dat is niet per se een fout (toetsen, praktijk zonder deck); beoordeel per les.', '', ...(uit.zonderPresentatie.length ? uit.zonderPresentatie.map(z => `- ${z.lg} wk ${z.w}.${z.slot[1]} (${dagVan(z.datum)} ${dagNaam(z.datum)}): ${z.titel} (${z.type || '-'})`) : ['- Geen.']), '');
  return o.join('\n');
}
