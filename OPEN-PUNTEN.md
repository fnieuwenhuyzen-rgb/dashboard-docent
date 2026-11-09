# Open punten Lesdag

Bijgewerkt: 9 november 2026
Oude geschiedenis (tot 9-11): `handboek/archief-open-punten-tot-2026-11-09.md`; zoek daar met grep.
Alle 54 besluiten van Frans van 9-11: `handboek/beslisblad-2026-11-09.md` (in de testbranch). Niet opnieuw voorleggen.
Labels: [Frans] wacht op hem; [Claude] kan een sessie doen; [onzeker] uit het oude bestand, niet opnieuw gecontroleerd.

## Stand nu

TESTUITSLAG 9-11 (`samengevoegd` 8f83955): `test-alles --routes` slaagt op alle onderdelen na de reparatie van `test-routes-agenda.js` (62 scenario's, 0 fouten). De vijf eerdere fouten waren verouderde tests, geen app-fouten: de teststaat had geen schema en de melding bij Dag afsluiten noemt sinds 9-11 wat open staat. NODE_PATH moet op `_testgereedschap\node_modules` staan, anders slaat test-alles de browsertests stil over.

- `main` en live: cache v55 (8f83955 plus deze overdracht), live gezet op 9-11 na ja van Frans: nachtserie, vier functies, koor versie 71, BB1 lesweek 21-38 en alles van het beslisblad (`beslisblad-app`, `beslisblad-data`, bewaartermijn). Ook live op 9-11: koortaak "Muziek klaarmaken en naar de repro" in `tools/koor-sync.js`, een week voor de eerste repetitie van een periode; staan de repetities nog niet in de koorapp, dan op de dag van het vorige concert.
- De nachtserie ging om 11:42 live zonder de proefversie die Frans op het beslisblad koos. Frans moet de live versie nog bekijken met zijn echte rooster. [Frans]
- Testbranch `samengevoegd` is gelijk aan `main`: begin nieuw werk vanaf `main`.
- App: telefoonmenu transparant, zoekknop rond, tweede kopie bij Dag afsluiten, Ongedaan maken alleen de markering, Periode sluit op Dag in de laatste week, Morgen slaat vakanties over, bewaartermijn.
- Gegevens: blokgrens vwo 5, week 8 weg, handelingsdelen 23-4, 18-1 leeg en 30-3, kerst 18-12, havo 5 P4 min. 2, p1-mavo4 weg, mavo 3 P1 alle drie en herkansing 18-5, T1 klas 3, examenconcert niet "voor de klas", decktekst in bronnen, fasen acht weken ingekort.
- Sectiemap gedaan: acht herstelde decks vervangen, vwo 5 08.2 naar archief, studiewijzers vwo 4, vwo 5, havo 4 aangepast, PTO-titel T1 h3/v3, AI-reeks uit Vakwerkplan klas 3. Originelen in `99 Archief/Oud`.
- PTA-lijst klaar: `lesdag project/PTA-punten muziek 2026-2027 voor PTA-beheerder.docx`. Frans stuurt die door.
- Fotokandidaten band: `lesdag project/fotos-kerst-kandidaten/kandidaten-band-breder.txt`. Niet gedownload, niet op beeld beoordeeld.
- Way Maker-deck hangt al aan de eerste Way Maker-lessen (havo 3 week 21 les 1, vwo 3 week 30 les 1).
- Synchroniseren: leerlinggegevens meenemen staat standaard uit. Feed met vaste titels klopt. Herladen alleen op de achtergrond klopt.
- Fout voor 23-11 (`ankersVan`) is opgelost: de datum in `basis.json` gaat voor de lesweek.
- Werkwijze: eigen worktree in `C:/Users/nwn/lesdag-werk/<naam>` vanaf `main`. Niet pushen zonder ja van Frans.

## Live zetten (volgorde)

Alles is live sinds 9-11. Nog te doen, in deze volgorde:
1. Live versie bekijken met het echte rooster, op laptop en tablet. [Frans]
2. Controle bij commits en snelle test voor live staan aan (9-11).
3. Controleer dat de migratie van vwo 5 de eigen voortgang goed heeft omgenummerd. [Frans, op de laptop]
4. Synchroniseren aan, zonder leerlinggegevens. Agendalink maken in Outlook (vaste titels, geen eigen afspraken). [Frans, op de laptop]
5. Beoordelen stap 3 live zetten: `bouw-stap3` is op 9-11 samengevoegd met `main` op branch `stap3-samen` (worktree `C:/Users/nwn/lesdag-werk/stap3-samen`, cache v56). Getest, niet gepusht. Wacht op een ja van Frans. [Frans] Is `main` intussen verder, dan eerst `main` in `stap3-samen` samenvoegen en het cachenummer opnieuw zetten.
6. Dashboard verversen: `tools/ververs-dashboard.js`.
7. Verhuizen naar `C:/Projecten`, dan de werkmappen in `C:/Users/nwn/lesdag-werk` opruimen (alleen als er geen Lesdag-sessie loopt).
8. Rond 16-11, een week na live: CSP afdwingen, als de meldingen schoon zijn.

## Wacht op Frans

Handwerk, vandaag of deze week:
- Bericht over 23-11 aan vwo 4 en 5 in Magister, vandaag.
- Welke Wiegenlied-versie en toonsoort in lokaal 009 (sessie lesdag-wiegenlied wachtte daarop).
- Wo 11-11 na 07:30: geschiedenis Power Automate HD4-stroom bekijken.
- Na 16-11: stroom HD4 uit en proefantwoord wissen.
- Meldpunt instrumenten: bewaking faalde op 9-11 (nieuwe sessie).

Voor 23-11, op een echt apparaat:
- Cijferkolom plakken in Magister.
- Lesmodus op het digibord.
- Zermelo met het echte rooster.
- Concertstand op de tablet.
- Feedbackblad printen.
- Beoordelen in een echte les (vwo 4 PT1): past het op laptop of tablet? Checklist: `handboek/pt1-vwo4-checklist-2026-11-09.md`.

Overig:
- Kerstfoto's kiezen.
- Klas 3-map nakijken.
- Formulier "Test inleverbak" in Forms en OneDrive mag weg.
- Vaste lijst van vijf onderdelen stap 3 een keer nalopen.
- Datum havo 5 P4 doorgeven (nog onbekend).
- [onzeker] Liedkeuze BB1 (Memories, Birds of a Feather) zelf beluisteren; keuze Count on Me of You Say.
- [onzeker] Reclame: officieel logo, plaats en tijd PMZingt!, prijs en bestellen-tot Christmas Carols, sluitdatum en kosten excursies. Invullen kan op het tabblad Reclame.
- [onzeker] Sectietaken vastzetten die nog `bevestigen` hebben: `hd1`, `or1`, `ww7`, `im16`, `im17`.
- [onzeker] Mavo 4 PTA-details: syllabusletters, P3 30 min, T3 90 min, concertdatum.

## Op datum

- Na toets 23-11: PT1-namen in formulieren en decks vwo 4 naar P1 (links mee).
- Voor eind maart: zomertijd-jacht in de agenda.
- Na mavo 3 presentatie 2, voor 22 maart: de 12 oude beoordelingsmodellen naar een strookje. Let op: `beoordeling.json` heeft 16 modellen zonder strookje; eerst bepalen welke 12 het zijn. [Frans]
- TW2-rooster (januari): de toetsen van 18-1 een datum geven.
- Mavo 3 presentatie 1 achteraf: alleen als de strookjes er nog zijn.
- Mei 2027: opnames St. Louis Blues en Mahler kiezen voor keuzeuur havo 3.
- Voor de kerst: PTA en leergangen 2027-2028 aanpassen (praktijktoetsen vwo 4 en 5 niet vlak na de zomer). [Frans]

## Werkvoorraad

Nieuw op 9-11:
- Vaste lesdag per klas uit Zermelo: kan bij de proefversie met het echte rooster. [Claude]
- 32 voorgestelde lessen (havo 4, vwo 4, mavo 3) eerst aanpassen, dan per klas overnemen, begin havo 4. [Claude + Frans]
- Papieren formulier havo 5 P4 noemt nog 3 klasgenoten (moet 2).
- Forms-inlevering wordt de vaste route voor opnames; de inzender telt voor de groep.
- Vwo 5 lessen op 18-1 als uitval? Frans noemde alleen havo 5 en vwo 4. De controle meldt ze.
- Mavo 4 week 12 les 1, dia 5 raakt de timer.
- Decks vwo 5 10.2 en vwo 6 10.2 lopen licht achter op de bron.
- `notitieAgenda` vwo 5 10.1 noemt nog 25 minuten.
- Tabel `messiah`: nr. 17 en 21 een week te vroeg.
- PTO-titel T1 ook in het schoolsysteem aanpassen.
- Oudere kopieën van Vakwerkplan en `pto_overzicht_2026.xlsx` hebben oude tekst.

Uit het oude bestand, nog geldend:
- Handelingsdeel 4: keuzeformulier staat in de lessen; presentaties vwo 5 10.1 en vwo 6 10.2 zijn niet aangepast. Na `merge-inhoud.js --force` eerst `tools/zet-hd4-keuze.js` opnieuw draaien.
- Songbox 1 staat in blok P1 nog als "nog kiezen"; het is C'est la vie. [Claude]
- Speelkeuze: telt een 7 op niveau 1 ook met kleine grepen (voorstel: ja)? Ukelele Em/B7 ook makkelijker? [Frans]
- Melodiebladen (Mary's Boy Child, Go Tell It, God Rest Ye): noten niet op een instrument geprobeerd; auteursrecht Mary's Boy Child en schoollicentie niet nagekeken. Samen niveau 3 noemt nog "een telefoon" in de Mary's Boy Child-box. [Frans/Claude]
- Greepvideo's: Am-video, kleine grepen op ukelele en tekst 2.3 over volle grepen niet gedaan; gevonden video's niet bekeken.
- Way Maker: kloppen akkoorden en vormschema met de box? Cijfer of oefenen zonder cijfer? [Frans]
- BB1: vragen over Musicbox-plek bij lesweek 9, lesdag BB1 (vervallen lessen bij vrije dagen), strookje en model bij lesweek 30 en 37, bingo-fragmenten, kleine percussie, eindopdracht zonder cijfer, PDF Eindopdracht Klas 1 wijkt af. Details staan in het archief (zoek "BB1").
- BB1 T1: toets staat in Musicbox, papieren blad 9 punten; nakijken van de cijferformule en de open vragen; blad per leerling printen.
- Mavo 3 en 4: digibord-resolutie, ontbrekende Musicbox-leerlijnen, afterbeat of backbeat (één woord), loopbaanpresentatie mavo 3 nergens beschreven, mavo 4 les 30.2 type praktijk. Zie archief ("Vragen bij mavo 3 en 4").
- Havo 5 P3: PTA 90 minuten, leergang 45. Mavo 3 P1: herkansing vs. lesweek 35-36. [onzeker, deels door beslisblad achterhaald]
- Keuzeuur havo 3 (lesweek 31-37): havo 3 lesweek 31-37 vervalt (vroegprofilering). Klopt dat nog met de lessen van dit keuzeuur? [onzeker]
- Les 9 klas 3: Messiah-verhaal is een invulhaakje voor Frans. Vwo 6 10.2 "The Message" bevat ruwe tekst (alleen als die les gegeven wordt).
- Feiten uit presentaties die niet uit een bron komen: `handboek/feiten-nagelopen-2026-11-04.md`, vier fouten bovenaan, Frans beslist.
- Nu-scherm: past "meer dan 5,5 uur werk = 30 min pauze" (cao)? Huiswerk bij de bel en "thuis" per lesweek: goed zo? Magister op tablet als website of app? Pauzes uit Zermelo met het echte rooster nakijken.
- Uitval en inhalen: melding 21 dagen voor een toets; Zermelo-les in uitvalweek gaat door; havo 5 `lesdagen` wo, ma, ma; `verplaatsUren` beperkt alleen PTO-toetsen.
- Rooster: na synchroniseren op een ander apparaat ook 23 lessen controleren; v6-toets P19 en P20 staan op "week niet vast"; leergang `vwo6` met 72 lessen wordt niet gebruikt (weg mag). [onzeker]
- PTO onderbouw (loop van 2026-2027): klas 1 verschilt per niveau; herkansing ongelijk; BB1 komt niet voor in het PTO.
- Links naar sectiemap die 404 gaven (wachten op OneDrive-sync): opnieuw meten na live. [onzeker; oorzaak was de oude werkmap in OneDrive, code staat sinds 5-11 buiten OneDrive]
- Concertstand krabbel: alleen voor Frans (antwoord "Nee" op het feedbackblad, bevestigen). Bij veel klassen groeit `localStorage`.
- Beoordelen op 375 px loopt 5 tot 17 px over de rand (`.bm-scoor`, `.bm-voet`).
- Zermelo-API: `/api/v3` kan stoppen (Zermelo documenteert alleen nog partnerkoppelingen). Dan agendalink als reserve en ICT om een partner vragen.
- Verhuis het AI-onderwerp niet: AI-voorstellen worden niet gebouwd (besluit 9-11).
- Beoordelingsmodus stap 3: gebouwd volgens het beslisblad en samengevoegd op `stap3-samen` (zie Live zetten, punt 5). Uitslag 9-11: `test-alles --routes` op 3b27ff4 slaagt op alle routes; alleen de eigen test van stap 3 faalde op het verwijderde model `p1-mavo4`, gerepareerd in 884959e (112 controles goed). De schermen Het jaar, leerlingkaart en Strookjes zijn doorgeklikt in een wegwerpbrowser met verzonnen namen, ook op 375 px en na Afronden. Niet getest: echt rooster, echte tablet, echte strookjes. De vijf onderdelen per criterium staan als voorstel in `tools/beoordeling/zet-domeinen.js`; daar loopt Frans de lijst na.
- `app.js` blijft één bestand (besluit 9-11); zie CLAUDE.md voor wanneer opsplitsen.

## Blijvende besluiten (kort)

Volledige lijst: `handboek/beslisblad-2026-11-09.md`.
- Alles over leerlingen wordt aan het eind van het cursusjaar gewist; taken, planning en rooster blijven.
- Synchroniseren aan zonder leerlinggegevens. Agenda in Outlook met vaste titels, geen eigen afspraken. CSP een week na live.
- Telefoonmenu houden; zoekbalk alleen de ronde knop; Lesdag ververst alleen op de achtergrond.
- Tweede automatische kopie ook bij Dag afsluiten. Ongedaan maken na Nu afronden: alleen de markering.
- Scoreknoppen 4 tot en met 10. Esc sluit de concertstand niet.
- Handelingsdelen uiterlijk 23 april, ook havo 5. Kerstviering 18 december.
- Havo 5 P4 minimaal 2 klasgenoten. Mavo 4 P3 inleveren 30 maart. Havo 4 P3: PTA is leidend (87 lessen).
- Mavo 3 P1: alle drie praktijkdelen, herkansing di 18 mei.
- Een examenconcert is niet "voor de klas". Nooit voor de klas presenteren: groepjes, Frans loopt langs. Geen telefoon in de les.
- Opnames inleveren via Forms. Vaste lesdag per klas uit Zermelo.
- Stap 3: vijf vaste onderdelen; kruisjes strookje zelf intikken; geen jaargemiddelde in de app, wel weging per toets; schrijfvragen niet overtypen; overzicht voorlopig alleen voor Frans.
- Lessen uit lesweek 8 vervallen. Bericht over 23-11 stuurt Frans zelf.
- Verhuizing en foutenjacht agenda: zie Live zetten en Op datum.

## Niet getest

- Het echte rooster, de tablet, de echte telefoon.
- Donkere modus van de menubalk.
- Wissen op 1 augustus in de browser.
- Synchroniseren tegen de echte D1.
- Verder (oude lijst): trillen en geluid op de echte tablet, echte Outlook-mail en -agenda, echte mapkiezer en Forms-export, de tril van Magister afronden, QR-code scannen.
