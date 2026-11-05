# Lesdag door de ogen van een kritische docent

Testronde van 5 november 2026, geschreven als Marijke de Vries (verzonnen collega). Scenario 1 tot en met 6 zijn in een eerste sessie gedaan, scenario 7 tot en met 10 in een tweede. Wat niet lukte, staat onder "Niet getest".

**Hoe ik heb getest.** Lokaal, met verzonnen namen, zonder codewijziging. De server draaide op poort 8745, want 8732 was al bezet door een ander proces, dat ik heb laten staan. Om schooldagen na te spelen zette ik de klok in de pagina vooruit (bijvoorbeeld naar maandag 16 november 8:10). Knoppen en velden bediende ik via scripts, dus ik heb geen eigen klik- of wachttijd gemeten. De tweede sessie draaide op poort 8746, ook omdat 8732 bezet was. Daar onderschepte ik downloads, klembord, `confirm`, `prompt` en het openen van de mail, dus er is geen bestand in Downloads gekomen en geen mail geopend.

**Let op: de code veranderde tijdens de test.** De server las de werkmap. Aan het eind zag ik dat `public/app.js`, `app.css` en `lesmodus.js` om ongeveer 19.15 uur niet-gecommitte wijzigingen kregen, niet van mij. Die gaan onder meer over de notitie "Vorige keer" (bevinding 3). De uitkomst van bevinding 3 is dus achterhaald: volgens `OPEN-PUNTEN.md` is de notitie gebouwd en live. Op welke versie elke meting van scenario 7 tot en met 10 draaide, weet ik niet precies: de sessie liep van ongeveer 19.04 tot 19.21 uur, zonder tijd per meting. Controleer een bevinding opnieuw voordat je hem oplost.

**Twee keuzes van Frans (5 november 2026).** "lesdag is voorlopig alleen voor mij!" Andere docenten, andere scholen, zijn eigen taken en het koor zijn dus geen probleem. Over reservebestanden met namen in Downloads: "Ja, dat mag!" Ik schreef het rapport als buitenstaander; de oordelen hieronder zijn daarop aangepast. De bevindingen die daardoor vervallen, blijven met hun nummer staan.

**Feit en mening.** In de tabel zijn "Wat er gebeurde" en de onderdelen uit de rekenvoorbeelden feiten. "Waarom dit in de klas telt" en "Voorstel" zijn mijn mening.

## 1. Oordeel

Voor Frans alleen: bruikbaar, onder voorwaarden. De planning is sterk: Jaar rekent uit of de stof vóór de toets af komt, en uitval en afronden kloppen. Tijdens de test stond de notitie van vorige keer niet waar hij om 8.10 uur nodig is; volgens de werklijst is dat inmiddels gebouwd. Wat overblijft: een herkansing kan nog niet, Nu valt uit tijdens de les van een klas zonder leergang, en "Opslag niet vast" heeft geen uitleg.

Mijn eerdere oordeel "morgen nog niet" ging over een collega die de app overneemt. Dat vervalt met de keuze van Frans.

Op de telefoon is de app bruikbaar om iets op te zoeken. Reclame is beter dan een eigen lijstje. Sectie werkt als persoonlijke takenlijst, niet als overzicht voor de hele sectie, en dat hoeft nu ook niet.

## 2. Top 5 blokkades

| # | Blokkade | Eerste stap |
|---|---|---|
| 1 | De notitie bij "half af" staat bij de volgende les niet op Nu en niet op de kaart op Dag. | Volgens `OPEN-PUNTEN.md` gebouwd en live sinds 5-11. Niet door mij nagetest. |
| 2 | Herkansing bestaat niet in Beoordelen. | Besloten door Frans (5-11): tweede poging naast de eerste, het hoogste cijfer telt. Live sinds 5-11 (commit c5f70f0), niet door mij nagetest. |
| 3 | Nu valt uit tijdens de les van een klas zonder leergang (bevinding 30). | Klas zonder leergang gewoon tonen, met "kies een leergang". |
| 4 | "Vraag of zoek iets" zoekt niet, en een lesweek kun je niet direct openen. | Live sinds 5-11 (commit 42e4cb0). Niet door mij nagetest. |
| 5 | "Opslag niet vast" zonder uitleg, terwijl hier cijfers staan. | Zeggen wat het betekent en wat Frans moet doen. |

Vervallen door de keuzes van Frans: "ingericht op één docent" en "een bestand met namen dat vanzelf in Downloads komt". Nieuw in de top 5 is daardoor bevinding 30. Buiten de top 5, maar wel vroeg op te lossen: bevinding 31 (een verkeerd kopiebestand kan de app laten stoppen met starten).

## 3. Wat ik mis

| Functie | Situatie | Wat ik nu doe |
|---|---|---|
| Notitie van vorige keer vooraan | Maandag 8.10 uur, vijf minuten, de klas was halverwege | Klasblad openen via Jaar, of mijn eigen schrift |
| Herkansing | Leerling haalt een 5 en doet de toets opnieuw | Cijfer openzetten en overschrijven; de oude score staat alleen nog in het logboek |
| Zoeken op toets, les of lesweek | Collega vraagt in de gang wat er in lesweek 20 gebeurt | Klikken door Week, of de leergang openen |
| Lange afwezigheid in één keer terugdraaien | Ziekmelding blijkt korter te duren | Per dag "Toch aanwezig" |
| Een les die maar één keer verschuift of extra is | Ik ruil een uur met een collega, zonder Zermelo | Afspraak in de agenda zetten, die telt niet als les |
| Eigen sectietaak wijzigen of weghalen | Tikfout of verkeerde datum | Afvinken en opnieuw maken |

## 4. Alle bevindingen

Status van bevinding 1 tot en met 29 komt uit ronde 3: een hulpagent las `OPEN-PUNTEN.md` en `LEESMIJ.md` helemaal; ik heb die statussen niet regel voor regel nagelezen. Daarvan staat geen enkele al op de werklijst, en geen enkele botst met een vastgelegd besluit. Voor bevinding 30 tot en met 55 zocht ik alleen op trefwoorden in `OPEN-PUNTEN.md` en heb ik LEESMIJ niet nagekeken. Alleen bevinding 45 kwam ik daar tegen. "Nieuw" betekent hier dus: niet gevonden met die zoekwoorden.

| Nr | Scherm | Soort | Ernst | Wat ik deed | Wat ik verwachtte | Wat er gebeurde | Waarom dit in de klas telt | Voorstel | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Nu, Dag, Sectie, Reclame | ontbreekt | vervalt | App geopend met lege opslag | Lege app die vraagt wat ik doe | "Blijft liggen · 8", 86 open sectietaken, Evensong, reclame met het vaste mailadres van een collega. Op dinsdag ook een mentorenoverleg | Andermans taken staan tussen mijn lessen en de teller op Nu gaat nooit naar nul | Onderdelen per stuk aan en uit; lege start | Vervalt (keuze Frans 5-11: voorlopig alleen voor hem) |
| 2 | Instellingen, klasblad | ontbreekt | vervalt | Instellingen en keuzelijst Leergang bekeken | Eigen vak, kalender en onderdelen kunnen instellen | Alleen 11 muziekleergangen; geen knop voor koor, sectie, reclame of schoolkalender | Op een andere school klopt de lesweek niet en is er geen leerstof | Eerst beslissen voor wie de app is (zie vraag 1) | Vervalt (keuze Frans 5-11: voorlopig alleen voor hem) |
| 3 | Nu, Dag | ontbreekt | blokkeert | h3a afgerond als "half af" met notitie, de volgende dag Nu en Dag geopend | "Gestopt bij vraag 2" bij de les | Alleen het label "vervolg" op Dag; de notitie staat op het klasblad. Ronde 2: bij de vervolgles staat ze ook niet in het lespaneel op Dag en niet op de eerste tien dia's van de Lesmodus | Dit is precies de vraag van 8.10 uur. LEESMIJ regel 5 belooft "wat je vorige keer noteerde" | "Vorige keer: ..." op Nu en de kaart | Gebouwd en live volgens `OPEN-PUNTEN.md` (5-11), niet door mij nagetest |
| 4 | Beoordelen | ontbreekt | blokkeert | Gezocht naar herkansing | Knop of tweede poging | Woord komt niet voor. Wel "afwezig, inhalen" en "+ Tussenstand" (die laatste niet doorlopen) | Herkansen hoort bij elk toetsmoment | Tweede poging naast de eerste, met regel welk cijfer telt | Besloten (5-11): hoogste cijfer telt. Nog niet gebouwd |
| 5 | Opdrachtbalk (Ctrl K) | fout | kost tijd | Getypt: "toets v4", "lesweek 20", "toetsweek", "Generale", "help" | Resultaten, de balk heet "Vraag of zoek iets" | Alleen "Nieuwe taak: ...". Alleen schermnamen en groepen (h3a, v4) geven een treffer. Enter niet ingedrukt | Wie zoekt, maakt met Enter per ongeluk een taak | Echt zoeken, of de tekst aanpassen | Gebouwd volgens `OPEN-PUNTEN.md` (5-11), nog niet online, niet door mij nagetest |
| 6 | Ik ben er niet | fout | kost tijd | 18 nov t/m 29 jan ingevuld | Tot en met 29 jan, of een melding | Opgeslagen t/m di 12 jan (40 lesdagen). Alleen de melding onderin noemt die datum, zonder te zeggen dat er is afgekapt | Lange ziekte: de planning klopt ongemerkt niet meer | Duidelijke melding of geen grens | Nieuw |
| 7 | Dag | onduidelijk | kost tijd | Daarna gezocht hoe ik dit terugdraai | Eén knop voor de hele periode | Na de korte melding met "Ongedaan maken" zag ik alleen "Toch aanwezig" per dag | Tot 40 keer klikken | Periode als geheel terugdraaien | Nieuw |
| 8 | Klasblad, Jaar | fout | kost tijd | Lege staat, zonder Zermelo: v4 gevolgd | Eén heldere datum voor PT1 | "PT1 stond op ma 9 nov" terwijl de les erna "Generale PT1" heet. De werklijst (regel 88) zegt: 9-11 vervalt, PT1 op 23-11 | Een toetsdatum moet ik kunnen vertrouwen | Toetsdatum in de gegevens gelijkzetten. Eigen staat van Frans niet bekeken | Nieuw (regel 88 noemt wel dat de gegevens nog moeten volgen) |
| 9 | Beoordelen | onduidelijk | kost tijd | Bovenin gelezen | Zekerheid dat cijfers bewaard blijven | "Opslag niet vast"; alleen bij aanwijzen: de browser kan gegevens wissen bij ruimtegebrek. Geen oplossing. Op een geïnstalleerde app kan dit anders zijn | Ik voer hier cijfers in | Uitleg en actie erbij | Nieuw |
| 10 | Beoordelen | onduidelijk | vervalt | Cijfer afgerond, Logboek aangeklikt | Vraag vooraf of melding | In Downloads: een reservebestand met namen en scores, en bij Logboek een csv met namen. In het hoofdscherm veranderde niets | Leerlingnamen op een schoollaptop, zonder dat ik het weet | Vooraf melden, en zeggen waar het staat | Vervalt (keuze Frans 5-11: reservebestanden met namen in Downloads mogen) |
| 11 | Beoordelen, menu | ontbreekt | kost tijd | In het menu gezocht, ook `#beoordelen` geopend | Menu-onderdeel | Staat niet in het menu; de route zonder toets zegt "Dit beoordelingsmodel is niet gevonden". Wel te vinden via Jaar, klas, Beoordelen | Tijdens het langslopen wil ik er in één tik zijn | Menu-onderdeel met toetsen van vandaag | Nieuw |
| 12 | Week, Jaar | ontbreekt | kost tijd | Lesweek 20 gezocht vanaf lesweek 11 | Direct naar een week | Weeknummers in Jaar zijn niet aanklikbaar. Na 9 keer "volgende week" stond ik op lesweek 18 | Haalt de minuut niet zonder tellen | Weeknummer aanklikbaar | Nieuw |
| 13 | Klasblad, klassenlijst | fout | kost tijd | Geplakt met spaties, dubbele naam en onzin | Tekst belooft: "Nummers en klascodes haalt Lesdag er zelf uit" | "112233 Testleerling, Anna h3a" en "(h3a)" bleven staan. Tab-gescheiden ging wel goed. Dubbele naam en "12 x" zonder waarschuwing opgeslagen | Vervuilde namen komen op feedbackbladen | Waarschuwen bij dubbel en vreemd; tekst aanpassen | Nieuw |
| 14 | Namen koppelen | fout | kost tijd | Opnieuw geplakt | Elke nieuwe naam krijgt een eigen voorstel | Twee nieuwe namen kregen hetzelfde voorstel (dezelfde oude leerling), allemaal met dezelfde achternaam. De app weigerde terecht op te slaan | Broers en zussen in één klas | Voorstel alleen bij duidelijke match | Nieuw |
| 15 | Lesmodus | fout | irritant | Klok naar na het einde van de les gezet, h3a nog open | Melding dat de les voorbij is | Kop: "h3a, 08:30–09:15, nog 44 min" om 9:16. Die 44 minuten horen bij de volgende klas | Uitlopen gebeurt vaak; de tijd op het bord klopt dan niet | Na het einde "les voorbij" tonen | Nieuw |
| 16 | Lesmodus | ontbreekt | irritant | Fasetimer naar 0:00 laten lopen | Zichtbaar signaal | Op 0:00 geen andere stijl, fase blijft staan. Geluid kon ik niet meten | Ik kijk niet de hele tijd naar het bord | Duidelijk signaal, bijvoorbeeld kleur | Nieuw |
| 17 | Lesmodus | ontbreekt | irritant | Les om 8:32 gestart | Fasen passen zich aan | Fasen tellen op tot 45 minuten bij "nog 43 min", zonder melding | Elke les begint later dan de bel | Melding of voorstel welke fase korter kan | Nieuw |
| 18 | Opruimsignaal | onduidelijk | irritant | Signaal laten komen bij een theorieles | Lijst passend bij de les | Vaste lijst met keyboards, gitaren en drumstokken. In Instellingen alleen "Proef het signaal". Na korte tijd was de lijst weg, en op 1280×800 raakte regel 7 de onderrand | Andere lokalen of lessen hebben een andere lijst | Lijst aanpasbaar per lokaal | Nieuw (regel 11: vast voor lokaal 009) |
| 19 | Nu | fout | irritant | Maandag 8:10 geopend | Mijn eerste les genoemd | "Om 8:30 begint je eerste werkblok", terwijl om 8:30 h3a begint | Tekst spreekt het rooster tegen | Tekst aanpassen | Nieuw |
| 20 | Nu | fout | irritant | Op een onderdeel geklikt, later teruggekomen | Terug naar nu | "Ander moment" bleef staan, ook tijdens de les zelf, tot ik "Nu" koos | Ik kijk naar het verkeerde moment | Vanzelf terug na een tijdje | Nieuw |
| 21 | Nu | overbodig | irritant | Nu geopend zonder Zermelo | Eerst mijn les | Kaart "Je pauzes" staat elke keer bovenaan, zonder knop om hem weg te halen. Ook "Goedemorgen" staat er twee keer | Kost ruimte op het drukste moment | Wegklikbaar, onderaan | Nieuw |
| 22 | Eerste opening | ontbreekt | vervalt | App voor het eerst geopend | Wat is dit, voor wie, wat eerst | Geen uitleg. Nu verwijst naar Zermelo; alleen Dag zegt "Eerst je rooster" | Ik weet niet waar ik moet beginnen | Korte eerste-keer-stap | Vervalt (keuze Frans 5-11: voorlopig alleen voor hem) |
| 23 | Hele app | onduidelijk | detail | Termen gelezen | Gewone woorden | Niet begrepen: werkblok, "de rest is lucht", partituur, regie, concertstand, reservemap | Vijf minuten tussen lessen is geen tijd om te raden | Gewone woorden of korte uitleg | Weegt minder (keuze Frans 5-11: het zijn zijn eigen woorden) |
| 24 | Beoordelen | onduidelijk | detail | Concertstand geopend | Uitleg die klopt met de knoppen | "Toetsen 1 tot en met 4" bij knoppen 4 tot en met 10. Toetsen niet gedrukt. Volgens de werklijst (regel 81) bewust | Verwarrend bij eerste gebruik | Tekst: welke toets welk cijfer geeft | Nieuw |
| 25 | Beoordelen | onduidelijk | detail | Eén leerling afwezig gezet | Alleen beoordeelde leerlingen tellen | "2 van 5 klaar" telt de afwezige leerling mee | Ik denk dat er minder openstaat | Apart tellen | Nieuw |
| 26 | Beoordelen, export | fout | detail | Scoreblad geëxporteerd | Elke rij evenveel kolommen | Kopregel 17 velden, rij met "inhalen" 13, met "inhalen" in de kolom Cijfer | Kan schuiven in andere programma's | Rij aanvullen | Nieuw |
| 27 | Beoordelen | onduidelijk | detail | Scoreknoppen bekeken | Ook lage cijfers | Knoppen 4 tot en met 10, geen 1 tot en met 3 | Mening: laag werk krijgt zo een 4. Kan bewust zijn | Bevestigen of toelichten | Nieuw |
| 28 | Lesmodus | onduidelijk | detail | Fontgroottes gemeten op 1280×800 | Alles leesbaar van achter | Kop 56 px, stappen 32 px, timer 54 px: prima. Fragmenttekst en de punten bij Uitleg 19 px: klein. Niet op een echt digibord bekeken | Fragmentnaam is vanaf achteren lastig | Fragmenttekst groter | Nieuw |
| 29 | LEESMIJ | fout | kost tijd | LEESMIJ vergeleken met schermen | Beschrijving klopt | Zie onder deze tabel | Wie de handleiding volgt, loopt vast | LEESMIJ bijwerken | Nieuw |
| 30 | Nu | fout | blokkeert | Les toegevoegd voor een klas zonder leergang (qq9, 10:00-10:45), Nu geopend om 10:10 | Mijn les, eventueel zonder inhoud | "Dit scherm lukt nu niet", met technische tekst ("reading 'id'"). Om 9:00 en 14:30 werkt Nu wel; Dag werkt ook tijdens de les | Precies tijdens de les valt het hoofdscherm uit, bij elke klas waarvoor ik nog geen leergang koos | Klas zonder leergang gewoon tonen, met "kies een leergang" | Nieuw |
| 31 | Instellingen, Kopie terugzetten | fout | blokkeert | Bestand teruggezet dat er geldig uitziet maar kapot is ("v":1, "rooster":"kapot") | "Dit bestand kan ik niet lezen" | "Kopie teruggezet". Daarna falen Nu, Dag, Week, Jaar en ook Instellingen. Na herladen: "Lesdag start niet / S.rooster.forEach is not a function", zonder knop. "Ongedaan maken" uit de melding niet geprobeerd; ik herstelde via een script. Gewone tekst, een leeg object en een lijst weigert de app wel netjes | Zeldzaam, maar dan is alles weg voor wie geen script kan draaien | Controleren vóór het terugzetten, en een uitweg op het foutscherm | Nieuw |
| 32 | Instellingen, Kopie terugzetten | ontbreekt | kost tijd | Kopie gekozen met alleen "v":1 | Vraag vooraf, zoals bij een reserve in Beoordelen | Meteen vervangen: rooster van 5 naar 0 lessen, melding "Kopie teruggezet" met "Ongedaan maken". Geen enkele vraag | Eén verkeerd bestand en de hele staat is weg, zodra de melding weg is | Eerst vragen, met datum en omvang van de kopie | Nieuw |
| 33 | Ik ben er niet | ontbreekt | detail | Ziekte gespeeld: wo 18 nov ingevuld en gezocht wat ik aan een vervanger geef | Tekst of blad met wat er vandaag moet gebeuren | Formulier heeft alleen Van en Tot. De woorden "vervanger" en "invaller" komen niet voor in de code van de app. Lessen "vervallen en schuiven door", ook als iemand ze wel geeft. Toegang is volgens CLAUDE.md alleen voor één mailadres | Ziek zijn is het moment dat ik het minst wil overtikken | Knop "Lesverloop voor vervanger" als tekst of pdf, en de keuze "les gaat door" | Vervalt grotendeels (keuze Frans 5-11: vervanging komt in het VO niet voor). Alleen bij langdurige ziekte een uitwegroute; komt nauwelijks voor |
| 34 | + Nieuw | fout | kost tijd | Getypt: "do 25:00 ...", "31 februari 10:00 ...", "gisteren 10:00 ...", "ma 14:00-13:00 ..." | Melding bij een onmogelijke tijd | 25:00 is opgeslagen ("om 25:00" op Dag, in Week onder het raster). De andere drie alleen als voorbeeld bekeken, niet opgeslagen: 31 februari wordt wo 3 mrt, "gisteren" wordt vandaag, 14:00-13:00 wordt 8:30-9:00 | Een afspraak staat op een andere dag dan ik dacht | Weigeren, of de uitleg in woorden erbij | Nieuw |
| 35 | + Nieuw | ontbreekt | kost tijd | Extra les gezocht: "h3a extra les vrijdag 10:00" | Les voor h3a met inhoud | Alleen de keuzes Afspraak en Taak. Het wordt de afspraak "H3a extra les", 10:00-10:15. De kop van het klasblad verandert niet | Een inhaaluur telt niet mee in "x lessen tekort" | Keuze "Les" die in de planning meetelt | Besloten (5-11): moet kunnen en meetellen in de planning. Gebouwd, live sinds 5-11 (zie OPEN-PUNTEN.md) |
| 36 | Rooster | fout | kost tijd | Toegevoegd: 14:00-13:00, 15:00-15:00, h3a en v4 tegelijk, overlap, en 06:00-23:00 | Waarschuwing | Alles "toegevoegd", zonder enige melding. Alleen de klas zonder leergang liet Nu vastlopen (bevinding 30). Opmaakcode in een groepsnaam wordt netjes als tekst getoond | Tikfouten merk ik pas in de les | Waarschuwen bij eind vóór begin en bij overlap | Nieuw |
| 37 | Sectie | ontbreekt | kost tijd | Eigen taken toegevoegd, ook met alleen spaties en met datum 1-1-2020 | Wijzigen of weghalen; melding bij lege tekst | Een rij heeft alleen een vinkje: niet wijzigen, niet weghalen. De spatietaak staat op Dag als kale "deadline:". De oude taak staat er als "wo 1 jan", zonder jaartal | Elke tikfout blijft staan of moet "klaar" heten | Bewerken en weg per eigen taak, lege tekst weigeren | Nieuw |
| 38 | Sectie | onduidelijk | irritant | Taak afgevinkt | Korte melding met ongedaan maken | Teller gaat van 86 naar 85 en de taak is weg, zonder melding. Terug kan via "hele jaar" | Per ongeluk afvinken merk ik niet | Melding met "Ongedaan maken" | Nieuw |
| 39 | Sectie | ontbreekt | detail | Gekeken of dit mijn sectie-overzicht vervangt | Wie, status, zoeken, vergadering toevoegen | Taak heeft alleen Wat en Datum. Geen veld voor wie, geen zoeken of filter, 38 rijen standaard en 148 over het hele jaar. Vergaderingen hebben geen knop of link naar stukken; toevoegen kan alleen als gewone afspraak via + Nieuw | Dit is een takenlijst van één persoon, geen overzicht voor een sectie | Eerst vraag 1 beantwoorden; daarna eventueel wie en zoeken | Weegt minder (keuze Frans 5-11: geen overzicht voor anderen nodig). Alleen nog een wens, als Frans als sectievoorzitter "wie" en zoeken wil |
| 40 | Lesmodus | fout | kost tijd | Midden in de les Sluiten gekozen en opnieuw geopend; ook herladen | Terug op de dia waar ik was | Sluiten vraagt niets. Opnieuw openen begint op "Jouw kaart · niet voor het bord". Herladen sluit de Lesmodus helemaal | Per ongeluk sluiten zet mijn docentkaart op het digibord, voor de klas | Plek onthouden per les; de kaart niet tonen als de les al loopt | Nieuw |
| 41 | Lesmodus | fout | irritant | h3a om 8:32 afgerond, door naar de volgende les | Klok van de les die ik open | Kop: "v4, 9:15-10:00, nog 43 min" terwijl v4 nog niet is begonnen. Zelfde soort fout als bevinding 15 | De tijd op het bord klopt niet | Resttijd alleen tonen in de eigen lestijd | Nieuw |
| 42 | Bewerk les | fout | detail | Titel leeggemaakt en opgeslagen | Melding | "Les opgeslagen". De kaart op Dag toont alleen "8:30-9:15 / h3a". De knop "Terug naar de leergang" staat er wel, niet gebruikt | Klein, makkelijk te herstellen | Lege titel weigeren | Nieuw |
| 43 | Klasblad, Verplaatsen | fout | vervalt | P1 van h3a (wo 3 feb) willen verplaatsen, klok op 18 nov | Elk lesuur kunnen kiezen | Keuzelijst heeft 10 uren: 23 nov tot en met 11 jan. Later dan 11 jan kan dus niet, ook niet in de week van de toets zelf. Daarna staat er "lesweek 13 ... in de les, lesweek 19" | Een toets een weekje later zetten is de gewone wens | Alle lesuren in de periode tonen; tekst gelijkzetten | Vervalt (keuze Frans 5-11: bewust, anders zit er te veel tijd tussen lesstof en toets). Let op: "10 uren" was mijn telling; de code beperkt een PTO-toets tot zijn periode, en een PTA-toets niet |
| 44 | Beoordelen, telefoon | fout | detail | Geopend op 375 px breed | Past op het scherm | Pagina 391 px breed: lijst, scorekaart en voet steken 16 px uit. Scoreknoppen zijn prima (34 tot 46 bij 50 px). De eerste scoreknop staat 1.713 px onder de bovenkant | Veel schuiven, maar het werkt | Breedte rechtzetten, scoren bovenaan | Nieuw |
| 45 | Menu, telefoon | onduidelijk | irritant | Menu bekeken op 375 px | Alles in beeld | Nu, Dag, Week, Jaar en een stukje Rooster zichtbaar. Sectie, Reclame en Instellingen staan buiten beeld, zonder schuifbalk | Ik weet niet dat er meer is | Knop "Meer" | Bekend (regel 45: beslissen na een paar dagen gebruik) |
| 46 | Dag, telefoon | overbodig | irritant | Dag geopend op 375 px om 8:10 | Eerst mijn les | Eerste les staat 1.467 px onder de bovenkant, onder de startmelding en "Blijft liggen". Dag is 7.611 px hoog, Sectie 7.827, Reclame 6.055. Vinkjes op Dag zijn 13 bij 13 px | In de gang wil ik één ding weten; duimen raken zo'n vinkje niet | Lessen boven "Blijft liggen", groter vinkje | Nieuw |
| 47 | Jarige collega's | fout | detail | Regels geplakt zonder geldige datum, en "31 februari" | Melding wat niet lukt | "4 collega's opgeslagen". "gisteren ..." en een regel zonder datum verdwijnen zonder melding. 31 februari blijft staan | Iemand ontbreekt en ik merk het niet | Noemen welke regels niet zijn gelukt | Nieuw |
| 48 | Beoordelen | fout | detail | Feedbackblad gekozen bij een leerling zonder scores | Melding | Bestand "Feedback P1 Testleerling, Dana.pdf" wordt gemaakt. "Alle feedbackbladen" slaat wie geen cijfer heeft wel over. PDF niet geopend | Een leeg blad kan bij de leerling komen | Zelfde controle als bij "alle" | Nieuw |
| 49 | Beoordelen | ontbreekt | detail | Volgorde loten | Vraag of ongedaan maken | Volgorde verandert meteen, zonder vraag of melding | Als de klas de volgorde al kent, is die weg | Ongedaan maken | Nieuw |
| 50 | Dag afsluiten | onduidelijk | irritant | Afgesloten met een niet-afgeronde les en negen Magister-punten open | Zien dat er nog iets openstaat vóór ik afsluit | Staat wel op de kaart ("Nog open, krijgt een moment"), maar één klik sluit zonder vraag: "Lesdag is stil tot morgen 8:00". "Toch nog iets doen" werkt. Mijn zin bij "Wat ging goed" staat de volgende ochtend niet op Nu | Presentie die openstaat kan blijven liggen. Of die de volgende dag terugkomt, heb ik niet vastgesteld | Aantal open punten op de knop zetten | Nieuw |
| 51 | Nu | fout | irritant | Klok op 2 aug en 6 sep 2027 | Vakantie, of "nieuw schooljaar" | "Werkblok, nog 450 minuten. Eerst sectie: ..." met oude taken. Kerstvakantie en weekend gaan wel goed | In de zomer krijg ik werk voorgeschoteld | Na het schooljaar een eigen melding | Nieuw |
| 52 | Week | fout | detail | In de staat een leergang gezet die niet bestaat (mavo2) | Klas zonder inhoud | "Dit scherm lukt nu niet" (reading 'weken'). Via de knoppen kon ik dit niet maken; een oude kopie zou het kunnen veroorzaken (niet getest). De foutmelding zelf is netjes: "De andere onderdelen in het menu werken nog" | Komt pas voor als een leergang vervalt | Onbekende leergang als "geen" behandelen | Nieuw |
| 53 | Beoordelen | onduidelijk | detail | Via Jaar binnengekomen, op Klaar gedrukt | Terug naar het klasblad | Ik kom op Dag terecht | Klein, maar ik raak mijn plek kwijt | Terug naar waar ik vandaan kwam | Nieuw |
| 54 | Dag | onduidelijk | detail | Afspraak op donderdag gezet vanaf maandag | Terug op vandaag | Dag springt naar donderdag en blijft daar, ook na wisselen van scherm. De knop "vandaag" staat er wel | Hoort bij bevinding 20: ik kijk naar het verkeerde moment | Na het opslaan op vandaag blijven | Nieuw |
| 55 | Reclame | onduidelijk | detail | Mail bord gekozen terwijl "Prijs van de tickets ontbreekt" er staat. Ook een activiteit in 2020 toegevoegd | Vraag bij ontbrekende gegevens; melding bij een oude datum | Waarschuwing staat er, maar "Mail staat klaar" volgt gewoon. De oude activiteit staat niet in de lijst van komende activiteiten, zonder melding ("hele jaar" niet bekeken) | Een bord zonder prijs gaat zo naar de collega | Vragen bij ontbrekende gegevens | Nieuw |

**Bevinding 29, LEESMIJ tegen de app** (regelnummers van de hulpagent):

- Regel 43, "De app slaat geen leerlinggegevens op", botst met het scherm: klassenlijsten en scores staan op het apparaat en met synchroniseren op de server.
- Regels 25-53 beschrijven inloggen met een schoolaccount via Microsoft. Instellingen heeft die koppeling niet. Synchroniseren en Agenda in Outlook staan niet in LEESMIJ.
- Regels 63 en 68 zeggen dat de Zermelo-koppeling op één apparaat blijft. Het scherm zegt dat hij meegaat met synchroniseren.
- Regels 5, 8 en 72-74 noemen "Vandaag" en "Groepen". Het menu heeft Nu, Dag, Week, Jaar, Rooster, Sectie, Reclame en Instellingen.

**Scenario 7, telefoon, in het kort.** De acht schermen uit het menu zijn niet breder dan 375 px (gemeten, geen echt toestel). Week veegt binnen het raster: je ziet ruim twee dagen. Jaar veegt binnen de kaart. Lesmodus past. Ik zou de telefoon gebruiken om iets na te kijken, niet om te scoren. Zie 44, 45 en 46.

**Scenario 8, vervangt dit een overzicht?**

- **Reclame: ja.** De app rekent de inlevermomenten uit, zet de tekst klaar en maakt de bestanden. Dat houd ik zelf niet zo strak bij. Het vaste mailadres en de koorconcerten zijn voor Frans juist goed.
- **Eigen taken: ja, voor één persoon.** Plan, Morgen en Later werken, en de teller "Blijft liggen" daalt mee.
- **Sectie: als persoonlijke lijst ja, als overzicht voor een hele sectie nee.** Het tweede hoeft nu niet. Wat voor Frans overblijft: eigen taken zijn niet te wijzigen (37), en er is geen wie en geen zoeken (39, alleen een wens).

## 5. Wat echt goed is

1. **Jaar rekent de stof door.** Onder het overzicht: "h3a heeft nog 9 lessen te geven en 4 lesuren tot P1: 5 tekort". Dat hoef ik niet meer zelf te tellen.
2. **Toets aanklikken in Jaar.** Eén regel met lesweek, datum, weging en toetsweek. De volgende toets vind je zo binnen een minuut.
3. **Uitval klopt en is terug te draaien.** "Valt uit" haalde het aantal lesuren van 16 naar 15, schoof de les door en bood "Ongedaan maken". Parallelklassen bleven apart: h3a half, h3b ongemoeid.
4. **Cijfers kloppen en zitten vast.** Zelf nagerekend: 7,3, 7,7 en 6,9 kloppen met de weging, en niveau 1 wordt netjes afgetopt op 7. Na afronden kun je niet per ongeluk wijzigen; "Wijzigen" vraagt bevestiging en bewaart het oude cijfer in het logboek. Opnieuw plakken laat je namen koppelen, zodat scores bij de juiste leerling blijven.
5. **Het opruimsignaal is niet te missen.** Rood scherm, enorme letters, op de minuut. Dat zie je ook van de achterste rij.
6. **Reserve terugzetten is goed gedaan.** Rommel wordt geweigerd, een bestand dat niet bij deze toets hoort ook. De app vraagt eerst, noemt de datum en zegt dat de oude stand in je downloads staat. Zo zou Kopie terugzetten ook moeten werken (31, 32).
7. **Regie en bord werken samen.** "Volgende" in de regie zette het bord in het andere tabblad op de volgende dia, en het bord toonde geen docentkaart. Eén keer getest.
8. **Toets verplaatsen legt het netjes vast.** Reden is verplicht, er komt een regel bij de afwijkingen met een bericht voor de klas, en "Ongedaan maken" wordt aangeboden. Een ziektedag meldt meteen: "h3a raakt krap", met hoeveel lessen niet meer passen en een inhaalvoorstel.
9. **Volle opslag wordt eerlijk gemeld.** "Opslaan op dit apparaat lukt niet", met een knop voor een kopie. Nagebootst, niet met een echt volle schijf.
10. **Twee vensters botsen niet.** Taken uit twee tabbladen tegelijk bleven allebei bewaard. Een einddatum vóór de begindatum bij "Ik ben er niet" wordt netjes geweigerd.

## 6. Niet getest

**Niet gedaan in scenario 7 tot en met 10:**

- Agendalink maken: niet bediend. De veiligheidscontrole van de sessie weigerde het script waarin deze knop stond, zonder reden. Vermoedelijk lag het aan deze knop, omdat die op een echte koppeling lijkt. Alleen de tekst gelezen.
- Andere browser: niet getest. De tekst in Instellingen zegt dat de gegevens per apparaat staan, en overgaan via synchroniseren of een kopie. De kopie zelf is getest.
- Reclame: de mail zelf is onderschept, dus Outlook is niet geopend. Afbeelding en bord zijn gemaakt maar niet geopend. Niet bediend: Geen reclame, Verwijderen, Open, Kopieer tekst.
- Taaknaam aanklikken op Dag: uitslag niet duidelijk, dus geen oordeel.
- Lesmodus: fragment openen niet getest. Op de zes dia's die ik hierop naliep stond geen link of geluid. Volledig scherm niet bediend.
- Beoordelen: inhoud van de feedback-pdf niet bekeken. Tussenstand alleen aangemaakt, geen scores ingevuld. Klassenlijst-koppelen is in ronde 1 gedaan.
- Telefoon: alleen een smal venster van 375 bij 812 px in de browser, geen echt toestel.

**Niet zelf nagelezen:** `OPEN-PUNTEN.md` en `LEESMIJ.md` heb ik voor de statussen niet zelf helemaal gelezen. Bij 1 tot en met 29 deed een hulpagent dat, bij 30 tot en met 55 zocht ik alleen op trefwoorden.

**Kan lokaal niet:** inloggen, synchroniseren tussen apparaten, offline, installeren als app, echte Zermelo- en Magister-koppeling. De Inleverbak heb ik alleen gelezen: daarvoor is een Forms-map in OneDrive nodig. De melding "Server niet bereikbaar" hoort bij lokaal testen en reken ik niet mee.

**Niet te meten met deze middelen:** geluid van timer en signaal, leesbaarheid op een echt digibord, echte kliktijd. De tijd van eerste opening tot eerste les heb ik dus niet in minuten: het zijn één formulier per lesuur en daarna één klik op "Zet ze op de planning". Bij 23 lessen zonder Zermelo schat ik dat op vijf tot tien minuten (schatting, niet gemeten).

## 7. Vragen aan Frans

1. Beantwoord (5-11): Lesdag is voorlopig alleen voor Frans.
2. Beantwoord en gebouwd (5-11), zie `OPEN-PUNTEN.md`.
3. Beantwoord (5-11): tweede poging naast de eerste, het hoogste cijfer telt. Gebouwd, live sinds 5-11 (commit c5f70f0).
4. Beantwoord (5-11): reservebestanden met namen in Downloads mogen.
5. Beantwoord en gebouwd (5-11): de opdrachtbalk moet breed inzetbaar zijn. Live sinds 5-11 (commit 42e4cb0).
6. Beantwoord (5-11): nee. Vervanging komt in het VO niet voor. Alleen bij langdurige ziekte is een soort uitwegroute nodig, en dat komt nauwelijks voor.
7. Beantwoord (5-11): ja, een eenmalig extra of geruild lesuur moet kunnen en meetellen in de planning. Live sinds 5-11 (commit fa2f40a).
8. Beantwoord (5-11): dat is bewust, want anders zit er te veel tijd tussen de lesstof en de toets.
