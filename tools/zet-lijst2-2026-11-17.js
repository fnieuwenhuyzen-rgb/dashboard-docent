// Lijst 2 van de audit van 16-11-2026: besluiten van Frans op 16/17-11, verwerkt in basis en bron.
// Rapport: lesdag project/rapporten/audit-2026-11-16.md. Opnieuw draaien kan geen kwaad: elke stap kijkt eerst of hij al gedaan is.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const STROOK = 'Strookje: vink per lescriterium aan wat lukte. Hooguit 3 minuten.';
const KLEIN = 'Gitaar niveau 1: kleine grepen op de drie dunste snaren; volle grepen vanaf niveau 2.';
const log = [];

const lesVan = (L, id) => { const [k, wn] = id.split(':'); const [w, n] = wn.split('.'); const wk = (L[k] && L[k].weken || []).find(x => x.w === +w); return wk && wk['l' + n]; };
const fase = (l, re) => (l.fasen || []).find(f => f && typeof f === 'object' && re.test(f.kop || ''));
const vervang = (arr, oud, nieuw) => { const i = arr.indexOf(oud); if (i >= 0) { arr[i] = nieuw; return true; } return false; };

function verwerk(L, bestand) {
  const ok = (id, wat, gedaan) => log.push(`${bestand} ${id}: ${wat}${gedaan ? '' : ' (al gedaan of niet gevonden)'}`);
  let l, f, g;

  // 1. havo 5 werkt niet in groepjes
  l = lesVan(L, 'havo5:11.1'); f = l && fase(l, /^For unto us: waar laat/);
  ok('havo5:11.1', 'klassikaal', !!f && vervang(f.stappen, 'Werk in je groepje. Tekst van For unto us erbij (Jesaja 9).', 'We werken klassikaal, samen met de docent. Tekst van For unto us erbij (Jesaja 9).'));
  l = lesVan(L, 'havo5:11.2'); f = l && fase(l, /^Messiah op de oefensite: For unto us/);
  if (f) {
    f.kop = 'Messiah met de hele klas: For unto us (nr. 4)';
    f.stappen = [
      'We zingen met de hele klas. De oefensite staat op het digibord: messiah-oefensite.f-nieuwenhuyzen.workers.dev',
      'Nog niet aangemeld? Meld je thuis aan op de computer, met je naam, klas en stem.',
      'Luister het begin van nr. 4, For unto us, en lees je partij mee.',
      "Oefen het melisme op 'born': eerst langzaam, dan in tempo.",
      'Herhaal daarna nr. 2 en nr. 6 één keer met de oefentrack.',
    ];
  }
  ok('havo5:11.2', 'hele klas samen', !!f);

  // 2. vwo 4 les 10.2 vervalt: de generale was al in 8.2
  l = lesVan(L, 'vwo4:10.2'); const wk10 = L.vwo4.weken.find(x => x.w === 10);
  g = l && l.type !== 'uitval'; if (g) wk10.l2 = { type: 'uitval', titel: 'Vervalt: de generale P1 was al in les 8.2 (besluit 16-11)' };
  ok('vwo4:10.2', 'vervalt', g);

  // 3. kaarten: app leest het veld kaart; de losse regel in vwo4:8.1 krijgt dezelfde tekst
  l = lesVan(L, 'vwo4:8.1');
  ok('vwo4:8.1', 'kaartregel', !!l && vervang(l.benodigd || [], 'Kaart BL schema', 'Kaart BL schema geprint, één per leerling'));

  // 4. gitaar niveau 1: kleine grepen
  l = lesVan(L, 'havo3:12.1'); f = l && fase(l, /^Ieder een eigen taak/);
  const h3 = f && f.stappen.findIndex(s => /^Gitaar: capo op fret 3/.test(s));
  g = f && h3 >= 0 && !f.stappen.includes(KLEIN); if (g) f.stappen.splice(h3 + 1, 0, KLEIN);
  ok('havo3:12.1', 'kleine grepen', g);
  l = lesVan(L, 'mavo3:12.1'); f = l && fase(l, /^Kies je instrument en pak de grepen/);
  ok('mavo3:12.1', 'kleine grepen', !!f && vervang(f.stappen, 'Pak G, C en D7 los. Klinkt elke snaar of toets?', 'Pak G, C en D7 los. ' + KLEIN + ' Klinkt elke snaar of toets die je speelt?'));
  l = lesVan(L, 'mavo3:14.1'); f = l && fase(l, /^Opwarmen: de vijf grepen/);
  ok('mavo3:14.1', 'kleine grepen', !!f && vervang(f.stappen, 'Pak de grepen van niveau 1: G, C en D7.', 'Pak de grepen van niveau 1: G, C en D7. Gitaar: kleine grepen op de drie dunste snaren.'));
  l = lesVan(L, 'bb1:12.1'); f = l && fase(l, /^Wisselen op de tel/);
  g = !!f && vervang(f.stappen, 'Pak D, sla aan, check elke snaar.', 'Pak D klein, op de drie dunste snaren. Sla aan, check elke snaar die je speelt.');
  g = !!f && vervang(f.stappen, 'Pak G, sla aan, check elke snaar.', 'Pak G klein, op de drie dunste snaren. Sla aan, check elke snaar die je speelt.') || g;
  ok('bb1:12.1', 'kleine grepen', g);
  l = lesVan(L, 'bb1:28.1'); f = l && fase(l, /^Partij met een nummer/);
  ok('bb1:28.1', 'kleine grepen', !!f && vervang(f.stappen, 'De toonsoort is D: op gitaar ken je D en A al.', 'De toonsoort is D: op gitaar ken je D en A al. ' + KLEIN));

  // 5. zelfbeoordeling = strookje van hooguit 3 minuten; vrijgekomen tijd naar de fase ernaast
  const strook = (id, re, naar, stappen, docent) => {
    const les = lesVan(L, id), z = les && fase(les, re), n = les && fase(les, naar);
    const doe = z && n && z.min > 3; if (doe) { n.min += z.min - 3; z.min = 3; z.stappen = stappen; if (docent !== undefined) z.docent = docent; }
    ok(id, 'strookje', doe); return les;
  };
  l = strook('mavo4:22.2', /^Zelfbeoordeling invullen/, /^Tips om elkaar verder te helpen/,
    ['Vul het P2-strookje in: per onderdeel een kruisje.', 'Onderdelen: techniek en beheersing, timing en ritme, dynamiek en articulatie, samenspel, samenwerking, presentatie, organisatie.', 'Schrijf er één zin bij, met een voorbeeld uit het concert.'],
    'Strookje van hooguit 3 minuten. Het telt voor 10% mee: de docent kijkt of de leerling eerlijk en concreet is, niet hoe hoog de score is. Vraag naar een voorbeeld uit het concert.');
  if (l) { vervang(l.benodigd || [], 'P2 format zelfbeoordeling leerling (Word)', 'P2 strookje zelfbeoordeling, geprint'); l.formatief = { soort: 'strookje', tekst: 'Het P2-strookje, met één zin en een voorbeeld, en een tip van een klasgenoot.' };
    f = fase(l, /^Wat blijft er over/); if (f) vervang(f.stappen, 'Lever je format in.', 'Lever je strookje in.'); f = fase(l, /^Tips om elkaar/); if (f && f.docent) f.docent = f.docent.replace('op het format bij Tip van een klasgenoot', 'op de achterkant van het strookje'); }
  l = strook('mavo4:26.2', /^Zelfbeoordeling$/, /^Afronden$/,
    ['Vul het P3-strookje in: per onderdeel een kruisje.', 'Schrijf er één zin bij, met een voorbeeld.', 'Thuis: Musicbox, Examentraining (Vmbo), en je foutenlijst.'],
    'Strookje van hooguit 3 minuten. Telt voor 10% mee: eerlijk en concreet, niet hoog.');
  if (l) { vervang(l.benodigd || [], 'P3 format zelfbeoordeling leerling (Word)', 'P3 strookje zelfbeoordeling, geprint'); l.formatief = { soort: 'strookje', tekst: 'Je P3-strookje, met één zin en een voorbeeld.' }; }
  for (const [id, re, naar, eerste] of [
    ['mavo4:14.2', /^Zelfbeoordeling invullen/, /^Eén werkpunt direct herhalen/, 'Vul het P2-strookje in: vink per onderdeel aan wat lukte.'],
    ['mavo4:17.2', /^Zelfbeoordeling bijwerken/, /^Feedback geven en krijgen/, 'Vul het P2-strookje opnieuw in en vergelijk met de vorige keer.'],
    ['mavo4:21.2', /^Zelfbeoordeling na de generale/, /^Wat je meeneemt/, 'Vul het P2-strookje in na de generale.'],
  ]) {
    const les = lesVan(L, id), z = les && fase(les, re);
    const thuis = z ? z.stappen.filter(s => /^Thuis:/.test(s)) : [];
    l = strook(id, re, naar, [eerste].concat(thuis));
    if (l) vervang(l.benodigd || [], 'Format zelfbeoordeling P2', 'P2 strookje zelfbeoordeling, geprint');
  }
  l = strook('bb1:17.1', /^Zelfbeoordeling$/, /^Ik kom bij elke groep langs/, [STROOK, 'Noem één punt voor het samen spelen van songs.']);
  if (l) vervang(l.benodigd || [], 'Zelfbeoordeling geprint', 'Strookje zelfbeoordeling geprint');

  // vwo 5 geen groepjes; vwo 4 voor de docent
  l = lesVan(L, 'vwo5:26.1');
  ok('vwo5:26.1', 'gesprek met docent', !!l && vervang(l.fasen, '35 min · feedbackrondes in groepjes', '35 min · feedbackgesprek per leerling met de docent; de rest werkt aan schets 2'));
  l = lesVan(L, 'vwo4:34.2');
  ok('vwo4:34.2', 'voor de docent', !!l && vervang(l.fasen, '30 min · doorloop per leerling', '30 min · doorloop per leerling, voor de docent'));
  const p3 = (L.vwo4.blokken || []).find(b => b.id === 'P3');
  g = p3 && /solowerk voorspelen met feedback/.test(p3.toetsing || ''); if (g) p3.toetsing = p3.toetsing.replace('solowerk voorspelen met feedback', 'solowerk voorspelen voor de docent, met feedback');
  ok('vwo4 blok P3', 'voor de docent', g);

  // 7. datums en PTA
  const t = (lg, id) => (L[lg].toetsen || []).find(x => x.id === id);
  g = t('vwo6', 'T10'); ok('vwo6 T10', 'week 27', !!g && g.week !== 27 && (g.week = 27));
  g = t('mavo3', 'P1'); const her = g && g.herkansing === '2027-05-18';
  if (her) { g.herkansing = ''; g.waar += '; herkansing na het vaststellen op 14-6, in lesweek 37, datum volgt'; }
  ok('mavo3 P1', 'herkansing na 14-6', her);
  // PTA-velden uit PTA_M3/M4_2026-2027.pdf (sectiemap); alleen lege velden vullen
  for (const [lg, id, duur, herk, domein] of [
    ['mavo4', 'P2', 135, false, ['K4', 'K5', 'K6']], ['mavo4', 'P3', 30, false, ['V1', 'K9', 'K2']], ['mavo4', 'T3', 90, true, ['K3', 'K7', 'K8', 'K9', 'V3']],
    ['mavo3', 'T1', 45, true, ['K3', 'K7', 'K8', 'K9', 'V3']], ['mavo3', 'P1', 45, true, ['K2', 'K4', 'K5', 'K6']],
  ]) {
    const x = t(lg, id); let n = 0;
    if (x && x.duur == null) { x.duur = duur; n++; } if (x && x.herkansbaar == null) { x.herkansbaar = herk; n++; } if (x && !(x.domein || []).length) { x.domein = domein; n++; }
    ok(`${lg} ${id}`, `PTA-velden (${n})`, n > 0);
  }
}

for (const bestand of ['public/data/basis.json', 'bron/leergang-data.json']) {
  const p = path.join(root, bestand), tekst = fs.readFileSync(p, 'utf8'), d = JSON.parse(tekst);
  verwerk(d.leergangen || d.klassen, bestand);
  const nieuw = JSON.stringify(d, null, tekst.includes('\n  ') ? 2 : 0);
  if (nieuw !== tekst) fs.writeFileSync(p, nieuw);
}
console.log(log.join('\n'));
