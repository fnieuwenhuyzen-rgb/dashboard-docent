# Open punten Lesdag (voorstel voor een nieuwe `OPEN-PUNTEN.md`)

Voorstel van 8 november 2026. De echte `OPEN-PUNTEN.md` is niet aangeraakt.
Bron: `OPEN-PUNTEN.md` zoals op branch `samengevoegd` (commit 237e467, 269 regels, 124 kB).
Alles wat daar stond staat nog, **woord voor woord**, in `open-punten-archief-2026-11-08.md`. Dat is een exacte kopie, met dezelfde regelnummers (sha256 begint met `4a014129`). Elke regel hieronder noemt zijn regelnummer in dat archief als `[r113]`.

Dit is een momentopname. Sessies die nu lopen (datum-week, jacht-*, pta-inhoud, robuustheid, sync-privacy, enzovoort) kunnen punten hebben afgerond of toegevoegd die hier niet in staan. Controleer vóór het overnemen. Staat een punt niet duidelijk als open of af in het archief? Dan staat het hieronder bij "Nakijken".

**Hoe je dit bijhoudt:** een punt staat hier zolang het wacht op iets. Is het af: haal het weg en zet één regel in het archief. Verzamel vragen aan Frans onder 1. Geen verhalen over hoe iets is gebouwd: dat hoort in `techniek.md` of in het commitbericht.

## 1. Vragen aan Frans

Beslissingen. Zonder antwoord gaat de lesinhoud uit van het eerste voorstel.

1. **BB1 lesweek 21-38** (op `samengevoegd`, nog niet live) [r113]: (a) Memories en Birds of a Feather laten staan, of Three Little Birds? (b) Count on Me of You Say? (c) Eindopdracht en speelmoment zonder cijfer? (d) Gaan lesweek 26 en 31 door?
2. **Havo 5 H7:** deadline 16 april (Lesdag) of 26 april (PTA)? [r49]
3. **Bronnen die elkaar tegenspreken** [r102-109]: mavo 4 P2 weging (PTA en leergang 40, studiewijzer 30%); mavo 4 P3 inleverdatum 22-1-2027 valt in toetsweek 2; mavo 3 P1 herkansing in toetsweek 3 maar presentatie 3 in lesweek 35; havo 5 P3 90 of 45 minuten.
4. **Mavo 3 en 4** [r116]: welke resolutie heeft het digibord (1080p of 720p)? Ontbrekende Musicbox-leerlijnen. Afterbeat of backbeat. Duur loopbaanpresentatie mavo 3. Mavo 4 les 30.2: klopt "praktijk zonder spelen"?
5. **Uitval en inhalen** [r119]: meldgrens 21 dagen vóór een toets; gaat een les in een uitvalweek door als Zermelo hem toont; blijven koor en sectieafspraken staan op een afwezige dag; volgorde `lesdagen` havo 5.
6. **Nu-scherm en ronde 3** [r131-134, r135-140, r141]: klopt "meer dan 5,5 uur werk = 30 minuten pauze" volgens de cao VO; werkt het tweede venster voor het bord op de schoollaptop; huiswerk "bij de bel"; klopt het plakken van de intranetlijst met verjaardagen; tekst van de felicitatiemail; Magister als app of website; klopt de zin op elk moment.
7. **Data met `bevestigen` vastzetten:** `hd1`, `or1`, `ww7`, `im16`, `im17`. [r225]
8. **Toets verplaatsen** [r28]: `verplaatsUren` beperkt alleen een PTO-toets tot zijn periode. Moet een PTA-toets ook begrensd worden, en een toets ver naar voren?
9. **Lesinhoud om te beoordelen:** The Message vwo 6, ruwe tekst, past dit op school? [r126]. Les 9 klas 3: titel songbox 1, instrumenteis, inleverplek [r127]. Foto's kerstlessen: rechtenvrij zoeken is goedgekeurd, is het gebeurd? [r128]. Feiten uit de presentaties die niet uit een bron komen: `presentaties-bronverschillen-2026-11-02.md` [r129].
10. **Reclame** [r101]: sluitdatum en kosten excursies De Doelen en Messiah Leiden; plaats en tijd van PMZingt!; officieel logo op het bord [r194].
11. **Vwo 5 lesweek 10** [r125]: zetting van het Wiegenlied voor koor (F groot is een voorstel, origineel Es). **Controle lesweek 10 en 11** [r124]: schuift lesweek 11 mee nu ma 9-11 vervalt? Links en lesteksten voor de nieuwe P9-decks in `basis.json` moeten nog volgen.
12. **Synchroniseren aanzetten** [r75-78]: eerst tweestapsverificatie op het Cloudflare-account en een bericht aan de privacyfunctionaris. Stappenplan, concept en uitleg staan klaar in `handboek/`. Frans beslist ook of de back-up `eerste` (alle namen) en `beoord.weg` (verwijderde leerlingen) op de server mogen staan.
13. **Schooljaar 2027-2028** [r130, r82]: PTA en leergangen vóór de kerst (praktische toetsen vwo 4 en 5 niet vlak na de zomer). PTO onderbouw oppakken in 2026-2027.
14. **Langdurige ziekte:** is er een uitweg nodig? Besluit 5-11: komt zelden voor, nog niet gebouwd [r28]. Zie `gebruiken.md`.

## 2. Te testen in het echt

Lokaal getest met verzonnen gegevens; echt gebruik ontbreekt.

- **Zermelo-koppeling met een echte koppelcode:** vakcode, groepscodes, surveillances. Ook de herkenning `zMuziek`, `zGroep`, `zDienst` (Nu ophalen, Kopieer als tekst). [r149, r153, r178]
- **PT1 vwo 4, ma 23-11:** beoordelingsmodus in een echte les: past het scherm, gaat plakken uit Magister goed. Checklist: `pt1-vwo4-checklist-2026-11-09.md`. [r123, r150]
- **Beoordelingsmodus stap 2:** mapkiezer in Edge met een OneDrive-map, Samsung-tablet, plakken in Magister, echte Forms-export, pdf op een printer, service worker. [r151]
- **Uitval en inhalen:** een echte afwezigheid invullen. [r152]
- **Blijft liggen en Taak openen** in het echt. [r155, r156]
- **Nu-scherm:** een paar dagen gebruiken. [r84, r131]
- **Magister in drie statussen:** een week gebruiken en kijken of de weekterugblik klopt. [r7-12]
- **Live niet gecontroleerd** (Access vroeg een inlogcode of alleen de code is gezien): herkansing [r38], handelingsdeel 4 [r43], inleverbak [r45].
- **Tablet:** invoercontrole, extra lesuur, Beoordelen op 375 px (loopt 5 tot 17 pixels over) [r35, r39].

## 3. Bouwen

1. **Beoordelingsmodus stap 3**, vóór 19-3-2027: overzicht per leerling over het jaar, vergelijking met de zelfbeoordeling. [r176]
2. **Nieuw schooljaar:** een script dat `S` leegmaakt (voortgang, aanpassingen, afwezigheid, scores, klassenlijsten) en `groepLeergang` opnieuw zet. Bestaat niet. Zie `gebruiken.md`, stap 3. *Nieuw.*
3. **Lesinhoud:** de overige `08*`-bestanden zijn nog vervormd [r173]. Handelingsdelen: planning tot 2 december (`hd1`-`hd15`), klusinstructies in de praktijk [r48]. Songfestival is PMZingt! (4 maart 2027).
4. **Dashboard-artifact verversen** zodra BB1 periode 3 en 4 live staan (`tools/ververs-dashboard.js`). [r177]
5. **Rooster via de Zermelo-API:** na de test in het echt verdwijnt het raden in `zDienst`/`zToets`. Of een partnerkoppeling, als Zermelo v3 stopt (`noodprocedures.md`, stap 8). [r178, r264]
6. **Tablet als afstandsbediening van het bord** (klein doorgeefluik in Cloudflare; alleen fase en klok). Nu werken bord en regie alleen op hetzelfde apparaat. [r226]
7. **Beoordelen:** de herkansings- en toetsverplaatsing bijwerken na het antwoord op vraag 8 hierboven.

## 4. Techniek en risico

- **Opruimen:** `m365.js`, MSAL, `auth.html`, `config.js` (`clientId`) en de Entra-tekst in `LEESMIJ.md` doen niets meer. [r144]
- **`merge-inhoud.js --force`** kan handmatige wijzigingen overschrijven. Daarna altijd `zet-decks-in-leergang.js` en `beoordeling/koppel-beoordeling.js`. Het script zette een keer een zetting van vwo 5 lesweek 10 terug. [r173, r113, r268]
- **`koppel-week8.js`** voegt de P9-bijlagen nog apart toe; dubbel is onschuldig, maar kan weg. [r269]
- **Word-pdf:** `SaveAs2` en `ExportAsFixedFormat` bleven via COM hangen. Oorzaak onbekend. Kan `maak-alles.ps1` raken. [r257]
- **PowerPoint en OneDrive:** een geopende pptx overschrijven kan een oude versie terugbrengen. Een nieuwe bestandsnaam lost het op. [r261]
- **Beoordeling:** hoe Word omgaat met het lettertype Regular is niet uitgezocht. [r263]
- **Teruggevallen gegevens** (2-11): OneDrive zette `basis.json` terug. Nu staat de code buiten OneDrive. Procedure: `noodprocedures.md`, stap 3. [r258]
- **OneDrive-wachtrij** [r60-61]: de verhuizing van de code naar `C:\Projecten` (5-11) kan dit hebben opgelost. Controleren.
- **Zermelo-API toekomst** [r264]: alleen partnerkoppelingen gedocumenteerd sinds 13-4-2026. Zie `noodprocedures.md`.

## 5. Wacht op anderen

- SLC-taken na de conferentie. [r145]
- ICT: de Entra-app vervalt (besluit 3-11). [r144]
- Rooster 23-11 staat nog niet in Zermelo. [r124]

## 6. Nakijken bij het overnemen

Deze punten staan in het archief als `[ ]` maar lijken af (live en getest). Haal ze weg als dat klopt, of zet ze bij 2.

Rollen en IPB-toelichting [r13-24]; Lesmodus tijd en plek [r26]; Invoercontrole [r29-35]; Nu zonder leergang [r36]; Extra of geruild lesuur [r37]; Herkansing [r38]; Opdrachtbalk [r40]; Notitie van vorige keer [r41]; Inleverbak [r45]; Agenda in Outlook [r46]; Lesklok [r47, r53]; Speelboxen [r55]; Geen telefoon in de les [r57]; Zelfbeoordeling strookje [r59]; Nooit voor de klas [r63-66]; Scherm Rooster [r68]; Rustige agenda [r70]; Jaar [r71-74]; Synchroniseren (live, niet aangezet) [r75]; Nu-scherm samengevoegd [r84]; Koorvoorbereiding [r100]; Way Maker [r110]; BB1 lesweek 9-20 [r111-112]; Keuzeuur havo 3 [r114]; Lesinhoud uit de decks [r115]; Concertstand [r117]; Beoordelingsmodus stap 2 [r118]; Uitval en inhalen [r119-120]; Kerstboxen en melodiebladen [r198-211]; Sectietaken [r222-225]; Reclame [r180-194]; Afvinken, minuten en afspraken [r158-169]; ontwerpbesluiten ronde 3 en proef Nu [r227-253].

## 7. Besluiten die geldig blijven (kort)

Het archief heeft de volledige tekst.

- Lesdag is voorlopig alleen voor Frans. Geen vervanging in het VO. Nooit voor de klas presenteren: in groepjes, Frans loopt langs. Geen telefoon in de les. [r28, r63-66, r57]
- Leerlingnamen en scores alleen in `S.beoord` achter de login; nooit in de repo of `basis.json`. [`CLAUDE.md`]
- Geen Entra-koppeling. Synchroniseren via Cloudflare. [r144]
- Songboxen zijn speelboxen: leerling kiest instrument en niveau. Gitaar niveau 1: drie dunste snaren. [r55, r210]
- Zelfbeoordeling is een strookje van drie minuten. [r59]
- Vwo 4 en vwo 5: ma 9-11 vervalt; PT1 en P9 staan op ma 23-11. [r124]
- Het cijfer staat alleen in Magister.

## Zo neem je dit over

1. Controleer de lijst hierboven tegen de dan geldende `OPEN-PUNTEN.md`. Zijn er sinds 8-11 punten bijgekomen, zet ze bij de goede kop.
2. Maak van de dan geldende `OPEN-PUNTEN.md` opnieuw een exacte kopie als archief: gewoon `cp OPEN-PUNTEN.md handboek/open-punten-archief-<datum>.md`. Dan raakt niets kwijt, ook wat na 8-11 is bijgekomen.
3. Zet de tekst van dit voorstel (zonder de kop "Zo neem je dit over") op `OPEN-PUNTEN.md`. Houd de regelnummers `[r…]` alleen als ze naar het archief van 8-11 wijzen.
4. Pas de regel in `CLAUDE.md` aan: "Lees na dit bestand: `OPEN-PUNTEN.md`" blijft; voeg toe dat afgeronde punten naar het archief gaan.
