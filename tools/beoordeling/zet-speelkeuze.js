// Zet instrument, niveau en plafond in de vier modellen van een speelbox (besluit Frans 4-11-2026). Opnieuw draaien kan geen kwaad.
// Plafonds: PLAFOND hieronder. Teksten per soort partij: speelkeuze/teksten.json. De id's van de criteria blijven gelijk, dus bestaande scores blijven staan.
const fs = require('fs'), path = require('path');
const T = JSON.parse(fs.readFileSync(path.join(__dirname, 'speelkeuze', 'teksten.json'), 'utf8'));
const PLAFOND = [7, 8.5, 10]; // vastgesteld door Frans, 4-11-2026
const lees = id => JSON.parse(fs.readFileSync(path.join(__dirname, id + '.json'), 'utf8'));
const schrijf = m => fs.writeFileSync(path.join(__dirname, m.id + '.json'), JSON.stringify(m, null, 2) + '\n', 'utf8');
const niveaus = (wat, pl) => wat.map((w, i) => ({ naam: 'Niveau ' + (i + 1), wat: w, plafond: pl === null ? null : PLAFOND[i] }));
const plafondZin = n => n.every(x => x.plafond == null) ? '' : 'Plafond per niveau: ' + n.map(x => x.naam.toLowerCase() + ' maximaal ' + String(x.plafond).replace('.', ',')).join(', ') + '.';
const ZONDER_ZIN = c => String(c).replace(/ Plafond per niveau:.*$/, '');
// Melodie als eigen partij op gitaar, ukelele en keyboard (besluit Frans 5-11-2026). De soort bepaalt de beoordelingsteksten.
const KERST = [{ naam: 'Zang', soort: 'zang' }, { naam: 'Gitaar: akkoorden', soort: 'snaar' }, { naam: 'Gitaar: melodie', soort: 'melodie' }, { naam: 'Ukelele: akkoorden', soort: 'snaar' }, { naam: 'Ukelele: melodie', soort: 'melodie' }, { naam: 'Keyboard: akkoorden', soort: 'piano' }, { naam: 'Keyboard: melodie', soort: 'melodie' }, { naam: 'Basgitaar', soort: 'bas' }, { naam: 'Drums of cajon', soort: 'drums' }];
// per criterium: welke tekstsoort hoort erbij, en of de naam mee verandert
function perPartij(crit, tekst, metNaam, soorten) {
  const uit = {};
  for (const s of soorten) { const b = T.soorten[s][tekst]; uit[s] = { uitleg: b.uitleg, docent: b.docent }; if (metNaam || (tekst === 'klank' && s === 'drums')) uit[s].naam = b.naam; }
  crit.perPartij = uit;
}
const zetCrit = (m, kaart, metNaam, soorten) => { for (const o of m.onderdelen) for (const c of o.criteria) if (kaart[c.id]) perPartij(c, kaart[c.id], metNaam, soorten); };
const soortenVan = p => [...new Set(p.map(x => x.soort))];
function keuze(m, velden, partijVeld, partijen, nv, opmerking, extra) {
  m.velden = velden; m.keuzes = Object.assign({ [partijVeld]: partijen.map(x => x.naam), Niveau: nv.map(x => x.naam) }, extra || {});
  m.speelkeuze = { partijVeld, niveauVeld: 'Niveau', partijen, niveaus: nv, opmerking };
  m.cijfer = (ZONDER_ZIN(m.cijfer) + ' ' + plafondZin(nv)).trim();
}

// Klas 3, Songbox 1 (al beoordeeld of bezig; de waarde van "Mijn partij" blijft staan)
{ const m = lees('songbox1-klas3'); const nv = niveaus(['refrein', 'couplet, pre-chorus, refrein', 'couplet, pre-chorus, refrein'], null); // C'est la vie; geen plafond: leerlingen wisten het niet vooraf (Frans, 4-11-2026)
  keuze(m, ['Klas', 'Groep', 'Mijn partij', 'Niveau'], 'Mijn partij', T.partijen, nv, "Songbox 1 is C'est la vie. Niveau wordt alleen genoteerd: het plafond geldt pas vanaf het kerstlied.");
  zetCrit(m, { ritme: 'ritme', toon: 'klank', techniek: 'techniek' }, false, soortenVan(T.partijen)); schrijf(m); }

// Klas 3, P1 kerstlied. Niveaus uit de kerstboxen.
{ const m = lees('p1-klas3-waymaker'); const nv = niveaus(['refrein', 'couplet en refrein', 'het hele lied']);
  keuze(m, ['Klas', 'Groep', 'Mijn partij', 'Niveau'], 'Mijn partij', KERST, nv, 'Streef naar niveau 2. Niveau 1 mag ook, tot een 7.');
  zetCrit(m, { ritme: 'ritme', toon: 'klank', techniek: 'techniek' }, false, soortenVan(KERST)); schrijf(m); }

// Mavo 3, presentatie 1: C'est la vie of Duurt te lang. Wordt een speelbox-beoordeling.
{ const m = lees('p1a-mavo3-zang'); const nv = niveaus(["C'est la vie: refrein. Duurt te lang: 8 maten", "C'est la vie: couplet, pre-chorus, refrein. Duurt te lang: 8 maten", "C'est la vie: couplet, pre-chorus, refrein. Duurt te lang: 8 maten"]);
  keuze(m, ['Lied', 'Mijn partij', 'Niveau', 'Groep'], 'Mijn partij', T.partijen, nv, "Duurt te lang is een Songbox Light: alle partijen zijn 8 maten en niveaus mogen door elkaar. Op niveau 3 heeft die box alleen bladen voor piano 2 handen en drums.", { Lied: ["C'est la vie", 'Duurt te lang'] });
  const AF = ' Afwijking van het PTA (Frans, 4-11-2026): in presentatie 1 kiest de leerling zelf instrument en niveau (1 tot 3) en is het dus niet altijd zang of melodie; de beoordeling sluit aan op die keuze.'; if (!m.pta.includes(AF)) m.pta += AF;
  m.titel = 'Praktijktoets P1, presentatie 1: speelbox'; m.thema = 'Ritme, maat en presentatie 1'; m.leerlingTitel = 'Zo beoordeel ik mijn spel';
  m.leerlingInstructie = 'Tel samen af en begin samen. Fout? Speel of zing door op de tel en pak het volgende stuk.';
  const crit = id => m.onderdelen.flatMap(o => o.criteria).find(c => c.id === id);
  m.onderdelen.forEach(o => { if (/^Zang/.test(o.groep)) { o.groep = 'Mijn partij'; o.stuk = 'gekozen instrument en niveau'; } if (/^Samenspel/.test(o.groep)) o.stuk = o.stuk; });
  Object.assign(crit('presentatie'), { naam: 'Begin en slot', uitleg: 'samen beginnen en eindigen, doorgaan na een fout', docent: ['Begin en slot zijn onduidelijk; stopt bij een fout.', 'Begint en eindigt aarzelend; stopt soms na een fout.', 'Duidelijk begin en slot; gaat door na een fout.', 'Zekere inzet en slot; een fout valt bijna niet op.'], leerling: ['Ons begin en slot zijn onduidelijk; ik stop bij een fout.', 'We beginnen en eindigen aarzelend; ik stop soms na een fout.', 'We hebben een duidelijk begin en slot; ik ga door na een fout.', 'We beginnen en eindigen zeker; een fout valt bijna niet op.'] });
  Object.assign(crit('houding'), { naam: 'Houding en techniek', uitleg: 'je instrument of stem beheersen', docent: ['Houding en techniek staan het spelen in de weg.', 'Redelijke houding; techniek nog onrustig of gespannen.', 'Goede houding en techniek; speelt rustig en gelijk.', 'Ontspannen en zeker; kan opkijken naar het groepje tijdens het spelen.'], leerling: ['Mijn houding en techniek zitten me in de weg.', 'Mijn houding is redelijk; ik ben nog onrustig of gespannen.', 'Mijn houding en techniek zijn goed; ik speel rustig en gelijk.', 'Ik ben ontspannen en zeker en kan opkijken naar mijn groepje.'] });
  Object.assign(crit('tekst'), { naam: 'Mijn partij', uitleg: 'je partij op dit niveau kennen', docent: ['Kent de partij niet; valt steeds stil of maakt veel fouten.', 'Kent de partij grotendeels; kijkt vaak op het blad, soms een fout.', 'Kent de partij en speelt of zingt hem zonder te stoppen.', 'Kent de partij zeker; kan opkijken naar het groepje.'], leerling: ['Ik ken mijn partij nog niet; ik val steeds stil.', 'Ik ken mijn partij grotendeels; ik kijk vaak op het blad.', 'Ik ken mijn partij en stop niet.', 'Ik ken mijn partij zeker en kan opkijken naar mijn groepje.'] });
  Object.assign(crit('toon'), { naam: 'Klank', uitleg: 'zuiver, de juiste noten, verzorgde klank', docent: ['Klinkt vaak vals of met verkeerde noten; klank dof of geknepen.', 'Overwegend juiste noten en een redelijke klank; soms mis op lastige plekken.', 'Juiste noten met een heldere klank, door het hele stuk.', 'Mooie, verzorgde klank; zacht en vol waar het past.'], leerling: ['Ik klink vaak vals of speel verkeerde noten.', 'Ik speel of zing meestal de juiste noten; soms mis op lastige plekken.', 'Mijn noten kloppen en mijn klank is helder.', 'Mijn klank is mooi en verzorgd, zacht en vol waar het past.'] });
  const s = crit('samenspel'); s.docent = ['Speelt los van de anderen; loopt voor of achter; te hard of te zacht.', 'Luistert naar de anderen; blijft meestal gelijk; balans soms uit.', 'Blijft gelijk met de anderen; goed in balans met het groepje.', 'Reageert op de anderen; samen beginnen, samen eindigen, één geheel.']; s.naam = 'Samenspel'; s.uitleg = 'luisteren, gelijk blijven, balans'; s.leerling = ['Ik speel los van de anderen, te hard of te zacht.', 'Ik luister naar de anderen en blijf meestal gelijk.', 'Ik blijf gelijk met de anderen en we zijn in balans.', 'Ik reageer op de anderen; we klinken als één geheel.'];
  const r = crit('ritme'); r.uitleg = 'in de maat blijven, inzetten kloppen';
  zetCrit(m, { tekst: 'partij', toon: 'klank', houding: 'techniek', ritme: 'ritme' }, true, soortenVan(T.partijen));
  m.strookje = { titel: 'Presentatie 1: speelbox', stellingen: ['Ik ken mijn partij', 'Ik blijf in de maat', 'Ik luister naar mijn groepje en speel door na een fout'], vragen: ['Dit ging het lastigst:', 'Dit ga ik oefenen:'], score: '4: niet ingeleverd of leeg. 6: alleen kruisjes of een vage zin. 8: een concreet moment of probleem. 10: concreet moment én wat de leerling gaat doen.' };
  schrijf(m); }

// Mavo 3, presentatie 2: Go Tell It. Het PTA noemt akkoordinstrument; de criteria gaan al over akkoorden.
{ const m = lees('p1b-mavo3-akkoord'); const nv = niveaus(['refrein', 'couplet en refrein', '']); const P = [{ naam: 'Gitaar', soort: 'snaar' }, { naam: 'Ukelele', soort: 'snaar' }, { naam: 'Keyboard', soort: 'piano' }];
  keuze(m, ['Lied', 'Instrument', 'Niveau', 'Groep'], 'Instrument', P, nv, 'Streef naar niveau 2. Niveau 1 mag ook, tot een 7.'); schrijf(m); }
console.log('klaar');
