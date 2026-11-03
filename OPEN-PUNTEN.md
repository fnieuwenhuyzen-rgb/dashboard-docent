# Open punten Lesdag

Bijgewerkt: 3 november 2026 (lesinhoud uit de decks in de leergang; voorstellen Way Maker, BB1 en keuzeuur). Werk dit bij aan het eind van elk werkblok. A = beslissing van Frans nodig.

## A. Wacht op Frans

Besluiten Frans (2-11):
- Songbox 1 klas 3 telt als voortgangscijfer (staat in model en scoreblad).
- Zelfbeoordeling 10% klopt (Way Maker en Songbox 1 blijven 0%, de reflectie zit daar in de rubric). De modellen staan al goed.
- Way Maker-box in Musicbox is beoordeeld en zichtbaar (id `71df1713-b814-4ddf-ae6d-85c300843784`).
- Way Maker komt helemaal niet meer voor de kerstvakantie: alles verschuift naar erna.
- Examenconcerten: docent 75%, zelf 10%, klasgenoten 15%. Het zelfdeel is het eigen cijfer van de leerling (aanname: het overall-cijfer van het oude formulier). Staat in modellen en app. Geen navraag bij de examensecretaris nodig: Frans beslist hier zelf over, ook over de pdf als dossierstuk.
- PT1 vwo 4 (3-11): de zang wordt beoordeeld op This old hammer. Vwo 4 en vwo 5 hebben op ma 9-11 gewoon les, ook al is het toetsweek (Frans).
- Uitval en inhalen: mag gebouwd worden.
- Beoordelingsmodus stap 2: voorstel is goed, meenemen in Lesdag. Eerst uitzoeken: is het haalbaar, en welke manier van beoordelen werkt prettig en betrouwbaar?
- Zermelo-koppeling werkt met de echte code (Frans). Vakcodes en groepscodes kunnen nu worden nagekeken.
- BB1: kennismaken met alle instrumenten via de tutorials. Ukelele is geweest, ze spelen nu gitaar, daarna drums en keyboard.
- Keuzeuur havo 3 is nieuw voor Frans: er moet een volledig lespakket komen.
- Mavo 3 en 4: het programma staat er (titels per les). Wat ontbreekt is de uitwerking voor de lesmodus: mavo 3 heeft 2 van de 36 lessen met fasen, mavo 4 2 van de 58. Vraag aan Frans: uitwerken of niet?

Verdeling over sessies (2-11): `basis.json` is één regel, dus samenvoegen botst altijd. Daarom werkt steeds één sessie tegelijk aan dat bestand. Volgorde: lesinhoud (BB1, keuzeuur, Way Maker na besluit, mavo alleen als Frans dat zegt), dan dashboard-artifact. Presentaties, uitval en inhalen en beoordelingsmodus stap 2 zijn live.

- [ ] **Vragen bij reclame (gebouwd 3-11):** (1) De weekinfo verschijnt op maandag. Lesdag gaat uit van inleveren tot 14:00 op die maandag zelf. Of is het de vrijdag ervoor? (2) Is die maandag vrij (4 jan, 18 jan, 29 mrt, 17 mei), dan inleveren op de schooldag ervoor (aanname). (3) Aanvang voor publiek ontbreekt bij Evensong, Vrede op Aarde en Eindconcert (de koorapp heeft alleen verzameltijden); plaats en tijd van PMZingt!; echte datum, tijd en plaats van de examenconcerten (nu de datum uit de leergang). Frans kan dit zelf invullen op het tabblad Reclame. (4) De Doelen (18 feb) en Messiah Leiden (12 mrt) staan als excursie: klopt dat, en hoe melden leerlingen zich aan (link of plek, sluitdatum, kosten)? Zingen leerlingen mee in Leiden of luisteren ze? (5) Sing-In (niet van Frans) en Kerstvieringen (18 dec) staan uit. (6) Er staat geen officieel logo in de repo: het bord heeft nu het woordmerk "CSG Prins Maurits". Officiële png in `public/beeld/` zetten?
- [ ] **Tegenstrijdige bronnen in de beoordelingsmodellen** (2-11 nagekeken in de PTA-pdf's, studiewijzers en leergang):
  - mavo 4 P2: PTA en leergang weging 40, studiewijzer 30%.
  - mavo 4 P1: PTA M4 weging 10, PTA M3 en leergang 15. Met 15 komt het SE op 100 (P1 15, T1 15, T3 20, P2 40, P3 10), met 10 op 95.
  - mavo 4 P3: PTA "per. 3 in les" met inleverdatum 22-01-2027, maar die valt in toetsweek 2, vóór periode 3 (start 8-2). Leergang: lesweek 27, ma 29-3 (Tweede Paasdag).
  - mavo 3 P1: herkansing in TW3 (5-13 apr), maar presentatie 3 is in lesweek 35 (7 jun) en het cijfer volgt in lesweek 36. PTA-einddatum 2-7-2027.
  - havo 5 P4: PTA 180 min, leergang 90 (lesweek 21: generale + productie). De studiewijzer ("uiterlijk 16 april") is de SE-grens, geen conflict met februari.
  - havo 5 P3: PTA 90 min, leergang 45 (lesweek 17 heeft wel twee lessen: uitvoering + vervolg). `Studiewijzer_Muziek_H5_2026-2027.docx` noemt geen duur.
  - vwo 4: PTA zegt P1/P2, studiewijzer en leergang PT1/PT2. Alleen de naam verschilt.
- [ ] **Way Maker, voorstel 2 (3-11, wacht op Frans).** Frans wil ongeveer 6 lessen per songbox; 2 is te weinig. Vwo 3: songbox 2 in periode 4 (lesweek 31-36), er valt geen theorie weg. Havo 3 stopt rond de meivakantie, dus daar kan het niet in periode 4. Voorstel havo 3: 6 lessen in lesweek 21-28, half theorie (20 min) en half Way Maker (25 min), lesweek 28 oefentoets, T1 blijft op lesweek 29. Nadeel: de theorie krimpt fors en moet deels thuis in Musicbox. Alternatief: Way Maker alleen in het keuzeuur, en de rollenles op het kerstlied. De lesinhoud staat in `tools/inhoud-klas3.json`, `11 Way Maker - kennismaken.pptx` moet opnieuw (vervormd). Sectietaak `wm` "Songbox Way Maker klaar" staat nog op 9-11 met "nodig vanaf lesweek 11": voorstel naar 1-2-2027, of weg als de box in Musicbox genoeg is.
- [ ] **BB1 (3-11).** Frans: gitaar is één les geweest; Musicbox heeft ook tutorials voor drums en keyboard; eerst lesweek 11-20 uitwerken, de rest daarna. Bijgesteld voorstel: 11-12 gitaar (tab of akkoorden, onderdelen), 13 drums met de box Maat en Ritme, 14 keyboard met de box Toonhoogte, 15 kerstles, 16 gitaar en lied voor P1, 17 P1 gitaar, 18 herhaling, 19 T1, 20 terugblik. Wacht op akkoord en op toegang tot Musicbox voor de namen van de tutorials. Bronverschil: in het vakwerkplan is BB1 "nog niet verdeeld", en BB1 staat niet apart in het PTO (toetsen overgenomen van m1 en v1, "bevestig dit nog"). Musicbox nagekeken (3-11): de leerlijn van BB1 daar is Welkom bij muziek, Gitaar voor beginners, Piano, Ukelele, Memories, Toonhoogte, Riptide (ukelele), Praktijktoets Basis Speelvaardigheden, Maat en ritme, Drums, Eindopdracht Klas 1. Dat wijkt af van de leergang: Memories en Riptide staan vóór Maat en ritme (leergang: periode 3), Birds of a Feather staat er niet in, en de praktijktoets heet anders dan P1 "Liedpresentatie met gitaar". Tutorials: Piano is een tutorialbox met video's (`e01a8ac9-2ffe-4ccf-ae0e-bdcbcf94c1b3`), Spelen op de drums "Basis, variaties en fills" (`c068fafe-e585-467e-8532-1f5b6183eef6`) heeft niveau 1 met 7 blokken, van drumstel tot meespelen met een song. Gitaar voor beginners niveau 1 heeft 8 hoofdstukken (`369206c1-f13f-4695-953d-5cbb8181ffe3`), Toonhoogte 7 en Maat en ritme 8. Dat is meer dan één les per box: de lessen pakken een deel, de rest is thuis of vervalt.
- [ ] **Keuzeuur havo 3 (`kmu3`), voorstel 2 (3-11, wacht op Frans).** Frans: doel is voorbereiden op de bovenbouw; de lessen komen pas rond de meivakantie, als de gewone havo 3-klassen gestopt zijn; aantal leerlingen is pas later bekend. Dat zijn dus geen 25 lessen maar 7 (lesweek 31-37, bij één les per week). Voorstel, aansluitend op het begin van havo 4 (Jazz en blues): (1) wat je doet in havo 4, notenschrift, (2) ritme noteren, (3) bluesakkoorden C, F, G, (4) twaalfmatige blues samen, (5) majeur en mineur, akkoordsymbolen, (6) luisteren en beschrijven zoals in de toets, (7) eigen riff of blues laten horen. Vragen: (1) klopt het dat havo 3 na lesweek 30 stopt? In de leergang staan nog lessen in lesweek 31-37 en een toetsweek. Die haal ik dan weg, en `kmu3` lesweek 1-30 wordt "geen les". (2) één les per week? Het vakwerkplan zegt havo 3 0,75 uur plus 0,75 uur keuzevak. (3) mag het overlappen met het begin van havo 4? (4) cijfer: voorstel geen.
- [ ] **Lesinhoud uit de decks (3-11):** `tools/zet-decks-in-leergang.js` zet week 10, kerstlessen, les 8 en 9 klas 3 en mavo 3 lesweek 9, 12, 14 in de leergang. Sprekersnotities blijven in de decks: de lesmodus toont ze niet en `basis.json` zou 200 kB groeien. Vraag: wil Frans de notities ook in de lesmodus? Songbox 1 staat in blok P1 nog als "nog kiezen" terwijl die al gespeeld is: titel doorgeven? Na `merge-inhoud.js --force` dit script ook opnieuw draaien, anders komen de oude fasen terug.
- [ ] **Vragen bij beoordelingsmodus stap 2:** (1) P4 "Samenspel en eigen rol": telt de groepsscore pas na bevestigen per leerling (nu), of tenzij Frans afwijkt? (2) Groepscriteria per model nakijken; is mavo-samenspel "met de begeleiding" spel in een groep? (3) Cijferkolom alleen met afgeronde cijfers? (4) Toelichtingen van klasgenoten bewaren en op het feedbackblad? (5) Feedbackblad in Encode Sans Light en Bold, omdat Regular niet op de laptop staat: goed? (6) Moet het eigen cijfer ook uit Forms komen (nu intypen)?
- [ ] **Vragen bij uitval en inhalen (gebouwd, live sinds 2-11):** (1) vanaf hoeveel dagen vóór een toets een melding (nu 21); (2) Zermelo toont een les in een geplande uitvalweek: gaat die door (nu ja); (3) koor en sectieafspraken blijven staan op een afwezige dag (nu ja); (4) havo 5 `lesdagen` wo, ma, ma: klopt de volgorde, want P4 kan op een andere dag vallen.
- [x] **Uitval en inhalen (ontwerp 30-10):** live sinds 2-11, lokaal getest met verzonnen gegevens. Nieuw in de staat: `S.afwezig`, `S.ankers`, `S.afwijkingen`; les-id's ongewijzigd. Nog niet gebouwd (voor D): notenbalk, twee lessen samenvoegen, Week afsluiten, AI-voorstellen. https://claude.ai/artifact/KaRevv4Uuw2cbCLU2nFUi4. Lessen schuiven door, toetsen worden ankers, bij krapte een inhaalvoorstel. Nu schuift een toetsles mee (`reeks`/`planning`): bij één uitgevallen les in vwo 4 lesweek 8 zakt PT1 voorbij 9-11. Echt gebeurd: Frans was di 27 en wo 28-10 afwezig (vwo 4 generale PT1 vervallen, havo 5 woensdagles ook). Besluit Frans: afwezig = alle lessen van die dagen vervallen, niet per les vragen ("Ik ben er niet" + Zermelo vervallen). Besluiten Frans (30-10): PTA-toets verplaatsen beslist Frans zelf (geen mail of akkoord, wel een reden in de afwijkingenlijst); onderbouwtoetsen schuiven vrij, maar binnen de periode uit het PTO; inhaalbare lessen herkent Lesdag aan de titel (generale, afronden, herhaling, oefenen). Nog open: akkoord om te bouwen, en:
  - PT1 vwo 4: het PTA zegt 90 minuten, de leergang heeft er één les van 45 voor (lesweek 10, les 2 is themadag). Besluit Frans (3-11): de 90 minuten is een buffer, want leerlingen zijn vaak eerder klaar. PT1 op ma 9-11 duurt één les; PTA, leergang en model blijven op 90 staan.
- [ ] **PT1 vwo 4 (ma 9-11), nog niet aangepast:** de normering (generale en improvisatie-uitleg van 28-10 zijn vervallen) en `leerlingInstructie` in `pt1-vwo4` ("na de generale").
- [ ] **PT1, bladmuziek:** Mo' Better Blues staat niet in de sectiemap; When I walk hand in hand alleen in de Havo 4-map, in drie mollen, terwijl de improvisatie in C is. Aantal groepen staat nergens: het deck rekent 2, 3 en 4 groepen voor.
- [ ] **Vwo 5 lesweek 10:** `blok` is P1 classicisme, les en thuiswerk gaan over romantiek. De dia zegt "romantiek". Geen zetting van het Wiegenlied in de sectiemap: F groot is een voorstel (origineel Es).
- [ ] **The Message (vwo 6, 10.2/10.3):** bevat ruwe tekst (staat onder LET OP in de notities). Past dit fragment op school?
- [ ] **Les 9 klas 3:** het Messiah-verhaal in de notities is nog een invulhaakje. Niet bekend: titel songbox 1, instrumenteis bovenbouw, inleverplek opname 10.2.
- [ ] **Foto's kerstlessen:** alleen bestaande foto's gebruikt, niets gedownload. Akkoord om rechtenvrije foto's te zoeken? Gewenst: stal of herders, kaarsen in een kerk, steelpan of Trinidad, capo op een gitaar, band op een kerstviering, John Leech bij Dickens, hand op ukelele, handen op keyboard, cajon.
- [ ] **Feiten in de nieuwe presentaties nalopen die niet uit een bron komen:** zie `handboek/presentaties-bronverschillen-2026-11-02.md` (Brahms, jazz en pop, grepen, definities).
- [ ] **Besluit voor schooljaar 2027-2028 (Frans, 30-10):** praktische toetsen vwo 4 en vwo 5 niet meer vlak na de zomer (nu PT1 vwo 4 lesweek 10, P9 vwo 5 lesweek 8). Op z'n vroegst in de periode van toetsweek 2. Frans verwerkt dit vóór de kerst in het PTA 2027-2028 en de leergangen voor volgend jaar (2-11).

## B. Wacht op anderen

- [ ] ICT: Microsoft Entra-app (clientId, tenantId) voor OneDrive-opslag en -export. Tot dan staan scores alleen in de browser; scoreblad als CSV-download.
- [ ] SLC-taken na de conferentie.

## C. Te testen in het echt

- [ ] Beoordelingsmodus in een echte les: vwo 3 Songbox 1 (29-10), vwo 4 PT1 (9-11). Vragen: past het scherm op zijn laptop/tablet, gaat plakken uit Magister goed, mist er iets.
- [ ] **Beoordelingsmodus stap 2 in het echt:** mapkiezer in Edge met een OneDrive-map, Samsung-tablet (Chrome kan om toestemming voor meerdere downloads vragen), plakken in Magister (lege cellen, 7,0), een echte Forms-export (kolomnamen zijn aangenomen), pdf op een printer of in Acrobat, service worker live, `maak-alles` voor P2 mavo 4 en P4 havo 5.
- [ ] **Uitval en inhalen in het echt:** 27 en 28-10 invullen bij "Ik ben er niet". Niet getest: echte Zermelo-gegevens, eigen voortgang, OneDrive, donkere modus. Niet-afgevinkte lessen gelden als nog te geven en kunnen meldingen geven.
- [ ] Zermelo-herkenning (`zMuziek`, `zGroep`, `zDienst`) met het echte rooster: Frans kiest in Instellingen bij "Wat Lesdag uit Zermelo haalt" Nu ophalen en dan Kopieer als tekst, en plakt dat.
- [ ] **Zermelo-koppeling met een echte koppelcode.** De nieuwe Worker staat online sinds 2-11. Frans maakt de code aan en plakt die zelf in Instellingen. Controleren: staat er "via de koppeling"; kloppen vakcode (`mu`, `kmu`?) en groepscodes (`h3a` of `h3.mu`?); weigert `/api/v3` geen veld uit `VELDEN`; hoe zien surveillances eruit (nu: `exam` van een ander vak op Frans' naam, of de tekst "surveillance"). Nog na te gaan: hoe lang de token geldig is, en of `students` voor een docent leesbaar is (Lesdag vraagt het bewust niet op).
- [x] Toetsweek 1 (2-10 nov): surveillances en toetsen uit Zermelo staan goed in Dag en Week (Frans, 2-11, met het echte rooster). Nog niet apart bevestigd: de melding "tijd niet in rooster" als een toetsweektoets uit de leergang (h5 T3, v6 T9) niet in Zermelo staat.
- [ ] Microsoft-login en OneDrive-opslag tegen de echte tenant (na B).

- [ ] **Blok Blijft liggen (2-11):** boven de agenda op Vandaag, met teller in het menu. Gemiste geplande taken en voorbije deadlines (eigen, sectie, koor) tot ze klaar, opnieuw gepland of uitgesteld zijn (`S.uitgesteld`). Lokaal getest met nagebootste klok; online sinds 2-11, nog niet in het echt gebruikt. Taken zonder datum en geplande koor- of presentatietaken van een voorbije dag blijven bewust buiten het blok. `proef-nu` heeft dit niet.

## D. Bouwen (volgorde)

1. Lesinhoud bijwerken naar de presentaties: gedaan op 3-11 (`tools/zet-decks-in-leergang.js`). Over: Way Maker bij havo 3 lesweek 27, 37 en vwo 3 lesweek 26, 37 (wacht op besluit, zie A). Presentaties opnieuw maken: overige `08*`-bestanden en `11 Way Maker - kennismaken.pptx` zijn nog vervormd.
2. Beoordelingsmodus stap 2, klaar vóór 8-1-2027. Alles live sinds 2-11 (`d45c606`): veilig opslaan, cijferkolom, groepjes, tussenstand, feedbackblad als pdf, klasgenoten, Songbox 1. Formulieren en scorebladen van de drie examenconcerten en Songbox 1 staan vernieuwd in de sectiemap, met een nieuw formulier Beoordeling klasgenoten. Blok P1 van havo 3 en vwo 3 zegt nu voortgangscijfer (3-11). Voorstel: https://claude.ai/artifact/HYmdo2WccDnYrBJvWdL51W
3. Lesinhoud nog leeg: BB1, keuzeuur h3 (kmu3): voorstellen staan onder A. Delen van mavo 3 en mavo 4: alleen als Frans dat zegt.
4. Beoordelingsmodus stap 3, vóór 19-3-2027: overzicht per leerling over het jaar, vergelijking met de zelfbeoordeling.
5. Dashboard-artifact verversen met de nieuwe data (lesinhoud, beoordelingen).
6. **Rooster via de Zermelo-API: gebouwd (2-11), nog niet getest met echte gegevens.** Worker (`koppel`, `afspraken`) en app staan klaar, de agendalink blijft als reserve. Zie C voor de proef. Daarna kan het raden in `zDienst`/`zToets` verder weg en de iCal eruit.

## Reclame voor weekinfo en borden (3-11, gebouwd in een cloudsessie, live sinds 3-11)

Wens Frans: bij koor- en muziekactiviteiten, examenconcerten en excursies reclame maken in de weekinfo en op de borden, zodat zoveel mogelijk leerlingen meegaan. Besluiten Frans (3-11): weekinfo verschijnt op maandag, inleveren tot 14:00, met afbeelding; borden zijn staande panelen (staande PowerPoint); beide mailen naar ha.denbraber@csgpm.nl, het bord mag kort van tevoren; ritme weekinfo twee weken vooraf en in de week zelf, bord vanaf drie weken vooraf; Sing-In niet; examenconcerten wel; doelgroep leerlingen.

Gebouwd (`public/reclame.js`, `public/data/reclame.json`, blok "reclame" in `app.js`, tabblad Reclame):
- Activiteiten: koorconcerten uit `B.koor`, `soort: muziek` uit `B.sectie` (behalve `overslaan`), examenconcerten uit de leergang (`examenconcerten` in reclame.json), eigen activiteiten (`S.reclameExtra`). Aanvullingen per id in reclame.json; wat Frans aanpast in `S.reclame[id]` (gaat voor). Afgevinkt: `S.reclameAf[taakId]`, taak-id `<activiteit>#wi2`, `#wi0`, `#bord`.
- Taken op Vandaag (kop Reclame, een week vooruit), als deadline in Dag en Week, te plannen in een vrij blok (`reclameId` in `S.taken`), teller op het tabblad. Een gemiste weekinfo is voorbij; een bord blijft in Blijft liggen tot de activiteit.
- Per activiteit: concepttekst (aan te passen), mail via mailto met de bijlage als download (weekinfo-afbeelding 1600x900 png, bord als staande pptx 7,5 x 13,333 inch met het bord als afbeelding), voorbeeld van het bord. pptx via `vendor/pptxgen.bundle.js` (PptxGenJS 3.12.0, MIT), pas geladen bij gebruik.
- Bord en weekinfo-afbeelding in Encode Sans, koppen vet (afspraak 2-11); de app zelf houdt Condensed en Neuton. Zonder internet valt het beeld terug op Arial.
- Lokaal getest met Playwright (pptx opent in LibreOffice). Niet getest: Outlook-mailto op de laptop, de borden zelf, OneDrive.

Nog niet gebouwd: mail met bijlage via Microsoft Graph (wacht op de Entra-app, B), officieel logo op het bord.

## Kerstboxen klas 3 (30-10, gedaan in een cloudsessie, live sinds 2-11)

Besluiten Frans: havo 3 en vwo 3 werken lesweek 11 t/m 15 aan een eigen kerstbox (havo: Mary's Boy Child in F, de toonsoort van Boney M., gitaar met capo op fret 3, ukelele zonder capo in F; vwo: God Rest Ye Merry Gentlemen in E-mineur). P1 blijft lesweek 19 en gaat over dat kerstlied. Mavo 3: Go Tell It on the Mountain (G) als oefenstof voor presentatie 2 akkoordinstrument. Concept: https://claude.ai/artifact/QgMC93swvjYjFQHy6Fwbxd · Ontwerp per niveau (tekst voor Musicbox): https://claude.ai/artifact/6XSY5bPZ8dYNbWUY6VKfi1

Gewijzigd in de bestanden:
- `public/data/basis.json` en `bron/leergang-data.json`: havo 3 en vwo 3 lesweek 11-16 nieuwe lessen met fasen; Way Maker-formulieren uit lesweek 17-20; blok P2, toets P1 en meta.bron bijgewerkt. Mavo 3 lesweek 12-19: titels en details met Go Tell It.
- `tools/inhoud-klas3.json`: nieuwe lessen erbij (oude Way Maker-lessen blijven staan).
- `tools/beoordeling/p1-klas3-waymaker.json`: model omgezet naar het kerstlied, map `01 Onderbouw muziek\Klas 3\P1 Presentatie kerstlied\Beoordeling`, lesweek 14 wordt 16. Id en bestandsnaam heten nog `waymaker`.

Gedaan op 2-11: formulieren en scoreblad staan in `01 Onderbouw muziek\Klas 3\P1 Presentatie kerstlied\Beoordeling`, gekoppeld met `koppel-beoordeling.js` en live gezet.

Nog te doen:
1. Dashboard-artifact verversen (D5) zodat het de kerstboxen ook toont.

Lespresentaties lesweek 11-16 havo 3 en vwo 3 en mavo 3 lesweek 12 en 14 zijn klaar en gekoppeld (2-11).

## Sectietaken uit de werkwijze (2-11, gedaan in een cloudsessie, live sinds 2-11)

- [x] `public/data/basis.json` aangevuld met 37 sectietaken uit de vastgestelde *Werkwijze sectievoorzitter muziek* (00 Sectie\02 Vakwerkplan en beleid): ids `ww1`-`ww9` (schooltermijnen), `im1`-`im17` (impliciete taken), `hd1` (handelingsdeel onderhoud), `or1` (grote opruimronde) en `mc-2026-11` t/m `mc-2027-07` (maandcontrole budget, inventaris, kasten en magazijn). Bij `res1`-`res3` staat nu ook de RTTI-analyse.
- [ ] Data met `bevestigen` nog vastzetten: `hd1`, `or1`, `ww7`, `im16`, `im17`.

## E. Klein en technisch

- [ ] **Teruggevallen gegevens (2-11):** om 14:56 stonden `public/data/basis.json` en `bron/leergang-data.json` ineens op een oudere tussenstand (37 sectietaken weg, Mary's Boy Child in E in plaats van F, formulieren en presentaties weg). Oorzaak niet bewezen, waarschijnlijk OneDrive. Teruggezet naar `251d2c0`, live was goed gebleven. Komen deze twee bestanden onverwacht als gewijzigd terug: niet committen, eerst vergelijken met HEAD, want `git add -A` neemt ze mee.

- **Oude presentaties (3-11):** de vorige versies van de twee 09-bestanden en van PT1 staan in `99 Archief/Oud`, onder hetzelfde pad als waar ze stonden.
- **PowerPoint en OneDrive:** overschrijf je een pptx die op deze laptop al geopend is geweest, dan kan PowerPoint een oude versie uit zijn cache erbij halen (dubbele tekstvakken, een keer een dialoog die de automatisering liet hangen). Niet bewezen, maar een nieuwe bestandsnaam loste het op. Daarom heten drie bestanden nu `09 Kiezen voor muziek in de bovenbouw - nieuw.pptx`, `09 Terugblik presentatie 1 - ritme en maat - nieuw.pptx` en `10.1 PT1 afnemen - samenspel en zang.pptx`. Maak zo'n deck opnieuw onder een nieuwe naam en meet op een kopie.
- **Presentatiehulpmiddelen:** `tools/maak-decks.js` + `tools/inhoud-decks-LEESMIJ.md` (bouwen), `tools/meet-deck.js` (crop en notities), `tools/meet-overloop.ps1` (overloop), `tools/koppel-presentaties.js` (alleen links). Koppen zijn Encode Sans vet; terug naar Compressed is één regel in `lesdeck.js`.
- **Beoordeling:** synchronisatie vervangt bij Entra nog de hele staat; dat moet eerst samenvoegen worden. Formulieren en scoreblad staan nog op Calibri, de afspraak is Encode Sans (op de laptop alleen Light en Bold: eerst nagaan hoe Word daarmee omgaat).
- **Zermelo-API toekomst:** de koppeling gebruikt `/api/v3` met een persoonlijke koppelcode. Zermelo documenteert sinds 13-4-2026 alleen nog partnerkoppelingen (`/api`, aan te maken door een beheerder, met verplicht `schoolInSchoolYear`), zonder einddatum voor v3 te noemen. Op 2-11 antwoordde `/api/v3` op csgpm nog. Stopt het: agendalink als reserve, en ICT vragen om een partner.
- **Samenvoegen `proef-nu` met `main`:** `main` heeft sinds 30-10 eigen `zTekst` en `zDienst` (bij de Zermelo-functies). `proef-nu` definieert die ook bij de pauzes: één van beide weghalen, anders een SyntaxError. In `dagItems` ook `toets` en `rooster` bij de bezette soorten houden.

- Na elke wijziging van de koorplanning in de Koorapp: `/lesdag-koor`.
- `merge-inhoud.js --force` kan materiaal overschrijven: daarna `koppel-beoordeling.js`.
- `koppel-week8.js` voegt de P9-bijlagen nog apart toe; dubbel met het P9-model is onschuldig (zelfde URL), maar kan weg.
