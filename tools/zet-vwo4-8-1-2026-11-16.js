// Vwo 4 les 8.1 "Samenspel: blues met zang" (ma 16-11-2026, vraag Frans):
// - te mager; zingen hooguit 10 minuten;
// - vervolgstappen handelingsdeel 4 uitleggen (logboek, bevestiging, afronden);
// - rest: samenspel Backwater blues, het stuk van P1 op 23-11 (groep van vijf, iedereen zingt één couplet).
// Geen leerlingnamen. Opnieuw draaien kan geen kwaad.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const LOGBOEK = { t: 'Logboek handelingsdeel 4', u: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=6jlsN-pIK0SlIWuX5D5o5rn3J0sJj0FNh0fuBL0Hhh5UMElSWEtVNU9BM0lJRVdSOVM3MExGTzY0TC4u' };

const FASEN = [
  { min: 5, soort: 'gesprek', kop: 'Handelingsdeel 4: zo gaat het verder', stappen: [
    'Iedereen heeft een keuze. Vanaf vandaag ga je het doen en houd je het bij.',
    'Na elke repetitie, klus, optreden of keer coachen vul je het logboek in: wat, wanneer, één zin en wie erbij was. Bij onderhoud ook de uren.',
    'Wie erbij was, krijgt een mail en klikt op Klopt. Dat is je bewijs: een paraaf op de kaart is niet meer nodig. De kaart mag je houden als geheugensteun.',
    'Wat al op je kaart staat, telt mee. Zit je in het schoolkoor? Dan log je niets: de aanwezigheid staat al in de Koorapp.',
    'Vier weken niets gelogd? Dan krijg je een mail. In februari en maart krijg je je tussenstand.',
    'Klaar? Dan vul je aan het eind een kort strookje in: wat heb je gedaan, wat heb je gezien van het werk in de muziek. Uiterlijk 23 april.'
  ], klaar: 'Weet je al wanneer je eerste repetitie, klus of keer coachen is? Zet het in je agenda.',
  docent: 'Link naar het logboek via Magister, als dat nog niet is gebeurd. Wie de invulling nog niet rond heeft: na de les even apart nemen en samen een eerste afspraak kiezen.' },
  { min: 10, soort: 'start', kop: 'Zingen: This old hammer, dan Backwater blues', stappen: [
    'Staan, voeten op de grond. This old hammer: ik zing de call, jullie de response, precies op de tel.',
    'Tweede ronde: wie neemt de call over?',
    'Dan Backwater blues: zing samen het eerste couplet, op de begeleiding uit Musicbox.',
    'Op 23 november zingt ieder van jullie één couplet. Luister: waar ademen we, waar valt de laatste regel?'
  ], docent: 'Tien minuten, niet langer: tik de tel mee. Nog niet verdelen wie welk couplet zingt, dat is de generale.' },
  { min: 10, soort: 'doen', kop: 'Backwater blues: kies je partij en je niveau', stappen: [
    'Kies: piano, bas, gitaar, drums of zang. Bij P1 speel je deze partij.',
    'Kies je niveau in de Musicsheets van Musicbox. Niveaus mogen door elkaar.',
    'Twaalf maten in A. Ieder speelt zijn partij één keer alleen, de rest telt mee.',
    'Bas: grondtoon op A, D en E. Akkoorden: wissel op de één van maat 5, 7, 9 en 11.'
  ], klaar: 'Speel je partij zonder naar het blad te kijken.',
  docent: 'Noteer wie wat speelt en op welk niveau: dat komt op het formulier. Tempo 100 op de chordsheet; begin langzamer als het moet. Let op maat 9-10: E naar D.' },
  { min: 15, soort: 'doen', kop: 'Doorspelen: niet stoppen, instappen', stappen: [
    'Speel Backwater blues drie keer helemaal door, met zang.',
    'Drummer of bassist telt af: één, twee, één twee drie vier.',
    'Fout? Niet opnieuw beginnen: stap in bij de volgende maat.',
    'Na elke keer één zin: waar werd het wiebelig? De volgende keer let je juist daarop.'
  ], klaar: 'Spreek een slot af en speel het één keer door met aftellen en slot.',
  docent: 'Niet repareren, laten doorspelen. Na elke ronde één concreet punt: inzet, tempo, maat 9-10 of balans met de zang.' },
  { min: 5, soort: 'afsluiten', kop: 'Klaar voor woensdag', stappen: [
    'Schrijf op: mijn partij, mijn niveau.',
    'Eén ding dat je thuis oefent met Musicbox.',
    'Woensdag: improviseren op de bluestoonladder in A.'
  ], docent: 'Partijen en niveaus overnemen voor het formulier P1.' }
];

const lesVan = (L, id) => { const [k, wn] = id.split(':'); const [w, n] = wn.split('.'); const wk = (L[k] && L[k].weken || []).find(x => x.w === +w); return wk && wk['l' + n]; };

for (const bestand of ['public/data/basis.json', 'bron/leergang-data.json']) {
  const p = path.join(root, bestand), d = JSON.parse(fs.readFileSync(p, 'utf8')), L = d.leergangen || d.klassen;
  const les = lesVan(L, 'vwo4:8.1');
  if (!les) { console.log(bestand, 'vwo4:8.1 niet gevonden'); continue; }
  les.detail = 'Handelingsdeel 4: logboek en vervolg. Zingen (10 min): This old hammer en Backwater blues. Partij en niveau kiezen; Backwater blues doorspelen voor P1.';
  les.doel = 'Je kiest je partij en niveau in Backwater blues en speelt het stuk met zang drie keer door zonder te stoppen.';
  les.criteria = ['Ik ken mijn partij en mijn niveau', 'Ik val na een fout weer in op de juiste maat', 'Ik zing de response precies op de tel'];
  les.fasen = JSON.parse(JSON.stringify(FASEN));
  les.formatief = { soort: 'zelfcheck', tekst: 'Partij en niveau opgeschreven, plus één ding om thuis te oefenen.' };
  les.materiaal = (les.materiaal || []).filter(m => m.u !== LOGBOEK.u);
  les.materiaal.push(Object.assign({}, LOGBOEK));
  les.benodigd = [
    'Musicbox op de laptop: box Voorlopers van Jazz, Backwater blues, Musicsheets',
    'Keyboards, gitaar, basgitaar, drumstel in 009, versterkers',
    'Kaart BL schema'
  ];
  fs.writeFileSync(p, JSON.stringify(d), 'utf8');
  console.log(bestand, 'vwo4:8.1', les.fasen.reduce((s, f) => s + f.min, 0), 'min');
}
