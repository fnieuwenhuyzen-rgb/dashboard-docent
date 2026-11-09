// Zet per criterium het veld `domein` (de vaste onderdelen over de toetsen heen, keuze 4 van Beoordelen stap 3) en bij de modellen met een strookje
// de koppeling zin -> criterium (`strookje.crit`, keuze 7). Schrijft de bronbestanden in deze map; draai daarna maak-modellen-json.js.
// Dit is een VOORSTEL om één keer na te lopen: pas de tabel hieronder aan en draai opnieuw. Draaien kan vaker, het resultaat is steeds hetzelfde.
// Een criterium dat niet in de tabel staat, krijgt geen domein; dat meldt het script.
const fs = require('fs'), path = require('path');
const T = 'Techniek en klank', R = 'Ritme en maat', S = 'Samenspel', P = 'Presenteren', E = 'Eigen werk en denken';
const DOMEIN = {
  'Juiste noten': T, 'Ritme en puls': R, 'Doorspelen en wisselen': R, 'Meezingen': S, 'Samenspel': S, 'Inzet en presentatie': P, 'Eigen partij': S, 'Maat en puls': R,
  'Toon en zuiverheid': T, 'Luisteren en samenspelen': S, 'Opbouw': E, 'In de maat': R, 'Past bij de akkoorden': E, 'Ritme': R, 'Toon': T, 'Techniek': T,
  'Eigen reflectie': E, 'Feedback op groepsgenoten': E, 'Toon en techniek': T, 'Ritme en tempo': R, 'Dynamiek en expressie': T, 'Eigen inbreng': E, 'Samen met de begeleiding': S,
  'Presentatie': P, 'Probleemstelling': E, 'Muzikale middelen en stijl': E, 'Bouw en lagen': E, 'Schetsen': E, 'Notatie': E, 'Uitvoering': T, 'Presentatie en toelichting': P,
  'Techniek en beheersing': T, 'Interpretatie': T, 'Veelzijdigheid': E, 'Organisatietaak': P, 'Begin en slot': P, 'Houding en techniek': T, 'Mijn partij': T, 'Klank': T, 'Ritme en maat': R,
  'Akkoorden': T, 'Akkoordwisselingen': R, 'Slag- of begeleidingspatroon': R, 'Timing en tempo': R, 'Groove en partij': R, 'Break en fill': R, 'Techniek en klank': T,
  'Eerste toon': T, 'Toonhoogtes': T, 'Ritme van de melodie': R, 'Doorgaan na een fout': S, 'Ritme van blad': R, 'Timing en ritme': R, 'Dynamiek en articulatie': T, 'Samenwerking': S, 'Organisatie': P,
  'Zuiverheid en eigen stem': T, 'Tekst, frasering en stijl': T, 'Eigen partij en tempo': R, 'Articulatie en frasering': T, 'Opdracht en keuzes': E, 'Samenhang en uitvoering': E,
  'Muziek in de tijd plaatsen': E, 'Waarvoor de muziek bedoeld was': E, 'Beschrijven wat je hoort': E, 'Plaatsen en beargumenteren': E, 'Vaktermen': E, 'Doordenken op een vervolgvraag': E,
  'Antwoord op de vraag': E, 'Samenhang en vorm': E, 'Bewuste keuzes': E, 'Bladmuziek': E, 'Toelichting': E, 'Kunstvorm en voorbeeld': E, 'Functie van de kunstvorm': E,
  'Samenhang met de muziek': E, 'Bronnen en fragmenten': E, 'Presenteren': P, 'Muziekstuk voor publiek': P, 'Planning en afspraken': P, 'Beheersing': T, 'Muzikaliteit': T,
  'Samenspel en eigen rol': S, 'Eigen werk': E, 'Programma': P, 'Uitdrukking en stijl': T, 'Luisteren en reageren': S, 'Eigen partij in het schema': R, 'Zang: Backwater blues': T,
  'Improvisatie': E, 'Groove en tempo': R, 'Luisteren en balans': S, 'Toon, ritme en tempo': T, 'Frasering en stijl': T, 'Barokke bouw': E, 'Uitleg van keuzes': E,
};
// strookje.crit: per zin op het strookje het criterium (id) waar die bij hoort. Twee zinnen vragen eigenlijk twee dingen ("luister en speel door", "patroon vast en speel door"): die gaan naar één criterium.
const STROOKJE = { 'p1a-mavo3-zang': ['tekst', 'ritme', 'samenspel'], 'p1b-mavo3-akkoord': ['presentatie', 'wisselen', 'patroon'], 'p1c-mavo3-slagwerk': ['presentatie', 'timing', 'fill'] };
const dir = __dirname; const mist = new Set(); let n = 0;
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
  const t = fs.readFileSync(path.join(dir, f), 'utf8'); const M = JSON.parse(t);
  for (const o of M.onderdelen) for (const c of o.criteria) { n++; if (DOMEIN[c.naam]) c.domein = DOMEIN[c.naam]; else mist.add(c.naam); }
  if (STROOKJE[M.id]) { if (!M.strookje || M.strookje.stellingen.length !== STROOKJE[M.id].length) throw new Error('strookje klopt niet: ' + M.id); M.strookje.crit = STROOKJE[M.id]; }
  fs.writeFileSync(path.join(dir, f), JSON.stringify(M, null, 2) + (t.endsWith('\n') ? '\n' : ''), 'utf8');
}
console.log(n + ' criteria gelezen' + (mist.size ? ', zonder domein: ' + [...mist].join('; ') : ', alle met domein'));
