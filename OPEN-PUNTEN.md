# Open punten Lesdag

Bijgewerkt: 12 november 2026. Houd dit bestand onder de 45 regels.
Kleine en minder dringende punten: `handboek/werkvoorraad.md` (zoek op onderwerp). Afgehandeld: `handboek/archief-open-punten-tot-2026-11-09.md` (zoek, niet lezen). Besluiten: `handboek/beslisblad-2026-11-09.md`.
Labels: [Frans] wacht op hem; [Claude] kan een sessie doen.

## Stand

- Bord op de laptop, regie op de tablet: live sinds 16-11 (cab0b2f, cache v76). Bord zonder klok en minuten, groepjestimer en speling op de tablet via `/api/regie`. Op de echte tablet proberen: lijstje in `handboek/werkvoorraad.md`, kopje "Ontwerp timer op het bord". [Frans]
- Lessen 16-11, live (commit 3d696c6, cache v78): vwo 4 8.1 omgebouwd (zingen 10 min, vervolg HD4: logboek, bevestiging, beginsaldo, strookje 23-4; samenspel Backwater blues). Vwo 4 8.2 (wo 18-11) is nu improviseren in A plus generale P1, want 8.1 werd pas 16-11 gegeven. Vwo 5 10.2: kaart KC 4a printen (blad 3) en PDF-link. Scripts `tools/zet-vwo4-8-1-…`, `zet-vwo4-8-2-…`, `zet-kaarten-2026-11-16.js`. Opvallend: `kaart` geeft geen printopdracht; alleen `benodigd` met "geprint" doet dat. Andere lessen met kaarten hebben dat mogelijk ook. [Claude]
- Printlinks bij Klaarzetten (live 16-11, 9b057e3 en ab6fac6, cache v81): een printregel in `benodigd` krijgt "open bestand" naar het passende bestand uit `materiaal` van dezelfde les (`FUNCTIES.printBestand`, getest in `test-functies.js`). Op Dag, voor de les en op de eigen kaart in Geef les. 16 van 24 printregels hebben een link. Nog zonder bestand: strookje bb1 (2 lessen), reflectieformulier havo 3 (niet gevonden in de sectiemap), werkblad notenbalk mavo 4; "partijen of bladmuziek" mavo 4 hangt van de keuze af. Live nog niet bekeken. [Frans] Schermtest samenvoegen (`test-functies-scherm.js:63`) faalt ook vóór deze wijziging: 2 minuten te veel. [Claude]
- Nieuw logo (12-11, tak `logo-monogram` in `lesdag-werk/logo-monogram`, samengevoegd en gepusht op 12-11, cachenummer v73): witte L met gele nu-punt op paars, ook in de kopbalk; eigen maskable- en iOS-pictogram, donkere themakleur. Maken: `node tools/maak-pictogrammen.js`. Nog: de app op telefoon en tablet opnieuw op het beginscherm zetten voor het nieuwe pictogram. [Frans: ja voor live]

- Alles live sinds 9-11 (cache v57, Beoordelen stap 3 inbegrepen). Nieuw werk vanaf `main`. Repo sinds 9-11 in `C:/Projecten/Lesdag`; documenten blijven in OneDrive onder `Dashboard Docent/lesdag project`.
- Reclame live sinds 10-11 (cache v59): printposter A3, ticketlink en prijs Christmas Carols, extra waarschuwingen. Nog proefprinten en de QR-code scannen. [Frans] Sinds 10-11 (cache v62) ook per activiteit "Schoolleiding informeren en uitnodigen", vier weken vooraf; Sing-Ins en Kerstvieringen niet (staan op `overslaan`).
- Brede indeling live sinds 10-11 (cache v60): vanaf 1300 px nieuwe opzet voor Beoordelen, Jaar, Rooster, Sectie, Team, Reclame, Instellingen. Getest met verzonnen gegevens; nog bekijken met echte klassen, Beoordelen vóór 23-11. [Frans]
- Geef les nieuw uiterlijk live sinds 10-11 (cache v61, licht; PowerPoints zijn reserve). Foto's per les in `public/lesfotos.js`, alleen `mavo3:8.1` heeft ze; de rest nog koppelen en verkleinen. PowerPoint-link nog klein maken. 316 van 521 lessen hebben nog geen uitgewerkte fasen. Proefles zonder rooster: `#lesproef/<les-id>`. [Claude]
- Geef les heeft sinds 10-11 een eigen lay-out per groep (live, cache v63). Leerjaar: kleur, hoeken, motief, klascijfer. Niveau: mavo blokken, havo zijkolom, vwo tijdschrift. Code: `stijlVan` in `public/lesmodus.js` en het blok "lay-out per groep" in `public/app.css`. Nog te bevestigen: alleen Geef les en niet de PowerPoints; klas 1 magenta `B0357F` met mavo-vorm; mavo 3 en 4 in de kleur van hun leerjaar. [Frans]
- Lessen volgen de werkwijze van Frans (live sinds 10-11, commit e27b4dc): groepjes op een eigen plek of in een eigen ruimte; onderbouw-P1 met de volgende songbox klaar (bb1 Memories, klas 3 Way Maker); bovenbouwopnames via Forms; kerstopname havo 3, vwo 3 (les 15.1, reserve 14.1) en mavo 3 (14.1) via Forms. Script: `tools/zet-werkwijze.js`. [Frans] Forms-formulieren maken (Kerstopname per klas, oefenopnames per bovenbouwklas, PTA per toets), uploadvraag op 1 GB, link via Magister. PowerPoints niet aangepast.
- VO-dag do 12-11 (live sinds 10-11, cache v65): mini-leergang `vodag` met één les (7 fasen, 25 min) en vier uren in `meta.uren` (12.45, 13.15, 13.45, 14.15, lokaal 009). App: `basisUren`/`eenmaligLg` in `app.js`, `benodigdVast`, links naar eigen pagina's (`LINK_RE`). Meespeelpagina als kopie in `public/` (bron blijft de sectiemap; wijzig je die, kopieer opnieuw). Script: `tools/zet-vodag.js`. Na 12-11 mag de leergang weer weg (ook uit `bron/leergang-data.json`).
- Sectietaken in lijn met de herindeling van de sectiemap (11-11, cache v66): actielijst blijft de bron, Lesdag toont alleen wat Frans zelf moet doen, met actienummer. Acties van collega's en "Sectie" staan bij de agendataak van de vergadering. Na elke sectievergadering: nieuwe acties van Frans toevoegen in `tools/zet-sectie-acties.js` en draaien. Na 12-1 de acties met een nieuwe trekker opnemen. Knoppen naar de sectiemap gebruiken de mappen 01 t/m 07.
- Past in dit gat, onderdeel A (live sinds 11-11, cache v68, commit bf468f1): een eigen taak boven 30 min mag in stukken (`deel: {groep, nr, van}`); planning ziet per groep alleen het laagste open deel. Rekenregels en tests in `functies.js` / `test-functies.js`. Voorstel: `lesdag project/rapporten/voorstel-past-in-dit-gat-2026-11.html`. Nog in een echte week bekijken. [Frans]
- God Rest Ye (vwo 3, box `839c630f-4946-49e1-8fce-a0dc30745cc2`), 12-11: leadsheet en drie melodievideo's gemaakt, **nog niet in de box**. Leadsheet (melodie, akkoorden, tekst couplet 1 en refrein): `Kerst/God Rest Ye (vwo)/Leadsheet`, gemaakt met `tools/melodie-bladen/maak-leadsheet.js` en het veld `leadsheet` in `god-rest-ye.json`. Video's `... - niveau 1/2/3 - melodie.mp4` in `Video's voor YouTube`: noten, tab gitaar, tab ukelele, gele markering, eigen geluid met tel, tempo 110; gemaakt met `tools/melodie-video/` (`maak-data.js`, `server.js`, `pagina.html`; opnemen in de browser, tijdens de opname de pagina niet aanraken, daarna `controle()` in de pagina: 25, 67 en 91 noten goed). Niet gecommit. Niet gedaan: op gehoor geluisterd; tekst vergeleken met hoofdstuk Zang in de box; boogje in regel 2 staat sinds de correctie van Frans (12-11) op "Sa-" van Saviour (G en F#), zo aangewezen door Frans. Leadsheet akkoord Frans (12-11). YouTube (Frans, 12-11, titels via oEmbed nagekeken, insluitbaar): niveau 1 Qa3v9gc6u24, niveau 2 Bhuo3QOV088, niveau 3 YLCyANnBHkE. Te doen: [Claude] leadsheet in de box (werkwijze afbeelding plaatsen: archief, zoek "Melodie God Rest Ye"), videolinks in hoofdstuk Melodie per niveau, na herladen nameten. Daarna hetzelfde voor Mary's Boy Child en Go Tell It als Frans dat wil (`maak-data.js` kan nog geen capo).

## Na live, in deze volgorde

1. Live versie bekijken met het echte rooster, op laptop en tablet. De nachtserie ging live zonder de proefversie. [Frans]
2. Controleer dat de migratie van vwo 5 de eigen voortgang goed heeft omgenummerd. [Frans, op de laptop]
3. Synchroniseren aan, zonder leerlinggegevens. Agendalink maken in Outlook (vaste titels, geen eigen afspraken). [Frans, op de laptop]
4. Dashboard verversen: `tools/ververs-dashboard.js`. [Claude]
5. Rond 16-11: CSP afdwingen, als de meldingen schoon zijn. [Claude]

## Wacht op Frans

Handtaken: lijst en afvinkstaat op https://claude.ai/artifact/Sg88D8jGnJpHXYfC7yB5yp (10-11: alleen privémail bewezen klaar. Schoolmail en Gmail nagekeken: PTA-lijst niet per mail verstuurd, niets aan Mar sinds 8-11. Antwoord aan Jan ging 9-11 uit; solist en namen kaarsendragers volgen nog, Frans heeft ze eind volgende week).

Deze week:
- Bericht over 23-11 aan vwo 4 en 5 in Magister.
- PTA-lijst doorsturen: `lesdag project/PTA-punten muziek 2026-2027 voor PTA-beheerder.docx`.
- Wo 11-11 na 07:30: geschiedenis Power Automate HD4-stroom bekijken. Na 16-11: stroom HD4 uit en proefantwoord wissen.
- Meldpunt instrumenten: verhuisd naar Sectie Muziek (10-11), omdat de groep Vakgroep Muziek bewust is opgeheven. Vier stromen omgezet, proefmelding door de hele keten geslaagd. Details: `Claude werkmap/Meldpunt kapotte instrumenten/bouwlog.md`. `Onderhoudsteamkaarten.pdf` is op 10-11 vernieuwd, zonder QR-code Klussenlijst (leerlingen konden daar niet bij). Al geprinte kaarten opnieuw printen. [Frans]
- Oude map `lesdag project/lesdag` verwijderen: op 10-11 nog aanwezig, geen ongepushte commits, geen wijzigingen. Bestanden alleen in de oude map zijn eerder bewust opgeruimd.

Voor 23-11, op een echt apparaat:
- Cijferkolom plakken in Magister. Lesmodus op het digibord. Zermelo met het echte rooster. Concertstand op de tablet. Feedbackblad printen. Beoordelen in een echte les (vwo 4 PT1), checklist: `handboek/pt1-vwo4-checklist-2026-11-09.md`.

## Op datum

- Na toets 23-11: PT1-namen in formulieren en decks vwo 4 naar P1 (links mee). En vwo 4 les 10.2 (oude generale) in Jaar op overgeslagen zetten, anders verschijnt hij op 25-11. [Frans]
- Voor de kerst: PTA en leergangen 2027-2028 aanpassen (praktijktoetsen vwo 4 en 5 niet vlak na de zomer). [Frans]
- TW2-rooster (januari): de toetsen van 18-1 een datum geven. Vwo 5 T5 hangt sinds de uitval van ma 18-1 aan geen les (de controle meldt dat): geef hem dan ook weer een les.
- Voor 22 maart, na mavo 3 presentatie 2: de 12 oude beoordelingsmodellen naar een strookje. `beoordeling.json` heeft er 16 zonder strookje; eerst bepalen welke 12. [Frans]
- Voor eind maart: zomertijd-jacht in de agenda.
- Mei 2027: opnames St. Louis Blues en Mahler kiezen voor keuzeuur havo 3.

## Als eerste oppakken

- Vaste lesdag per klas uit Zermelo: kan bij de proefversie met het echte rooster. [Claude]
- 32 voorgestelde lessen (havo 4, vwo 4, mavo 3) eerst aanpassen, dan per klas overnemen, begin havo 4. [Claude + Frans]
- Songbox 1 staat in blok P1 nog als "nog kiezen"; het is C'est la vie. [Claude]
- Past in dit gat, onderdeel B (besloten 11-11): een eigen taak zonder deadline die twee weken openstaat, komt terug bij Week afsluiten met drie knoppen: plan, datum geven of laten vallen. Nu staat zo'n taak in `kandidaten` altijd achteraan. Na A. [Claude]
