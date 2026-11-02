# Open punten Lesdag

Bijgewerkt: 2 november 2026 (presentaties samengevoegd en live; besluiten Frans verwerkt). Werk dit bij aan het eind van elk werkblok. A = beslissing van Frans nodig.

## A. Wacht op Frans

Besluiten Frans (2-11):
- Songbox 1 klas 3 telt als voortgangscijfer (staat in model en scoreblad).
- Zelfbeoordeling 10% klopt (Way Maker en Songbox 1 blijven 0%, de reflectie zit daar in de rubric). De modellen staan al goed.
- Way Maker-box in Musicbox is beoordeeld en zichtbaar (id `71df1713-b814-4ddf-ae6d-85c300843784`).
- Way Maker komt helemaal niet meer voor de kerstvakantie: alles verschuift naar erna.
- Examenconcerten: docent 75%, zelf 10%, klasgenoten 15%. Het zelfdeel is het eigen cijfer van de leerling (aanname: het overall-cijfer van het oude formulier). Staat in modellen en app. Geen navraag bij de examensecretaris nodig: Frans beslist hier zelf over, ook over de pdf als dossierstuk.
- Uitval en inhalen: mag gebouwd worden.
- Beoordelingsmodus stap 2: voorstel is goed, meenemen in Lesdag. Eerst uitzoeken: is het haalbaar, en welke manier van beoordelen werkt prettig en betrouwbaar?
- Zermelo-koppeling werkt met de echte code (Frans). Vakcodes en groepscodes kunnen nu worden nagekeken.
- BB1: kennismaken met alle instrumenten via de tutorials. Ukelele is geweest, ze spelen nu gitaar, daarna drums en keyboard.
- Keuzeuur havo 3 is nieuw voor Frans: er moet een volledig lespakket komen.
- Mavo 3 en 4: het programma staat er (titels per les). Wat ontbreekt is de uitwerking voor de lesmodus: mavo 3 heeft 2 van de 36 lessen met fasen, mavo 4 2 van de 58. Vraag aan Frans: uitwerken of niet?

Verdeling over sessies (2-11): `basis.json` is één regel, dus samenvoegen botst altijd. Daarom werkt steeds één sessie tegelijk aan dat bestand. Volgorde: lesinhoud (Way Maker, BB1, mavo, keuzeuur), dan dashboard-artifact. Presentaties, uitval en inhalen en beoordelingsmodus stap 2 zijn live.

- [ ] **Tegenstrijdige bronnen in de beoordelingsmodellen** (2-11 nagekeken in de PTA-pdf's, studiewijzers en leergang):
  - mavo 4 P2: PTA en leergang weging 40, studiewijzer 30%.
  - mavo 4 P1: PTA M4 weging 10, PTA M3 en leergang 15. Met 15 komt het SE op 100 (P1 15, T1 15, T3 20, P2 40, P3 10), met 10 op 95.
  - mavo 4 P3: PTA "per. 3 in les" met inleverdatum 22-01-2027, maar die valt in toetsweek 2, vóór periode 3 (start 8-2). Leergang: lesweek 27, ma 29-3 (Tweede Paasdag).
  - mavo 3 P1: herkansing in TW3 (5-13 apr), maar presentatie 3 is in lesweek 35 (7 jun) en het cijfer volgt in lesweek 36. PTA-einddatum 2-7-2027.
  - havo 5 P4: PTA 180 min, leergang 90 (lesweek 21: generale + productie). De studiewijzer ("uiterlijk 16 april") is de SE-grens, geen conflict met februari.
  - havo 5 P3: PTA 90 min, leergang 45 (lesweek 17 heeft wel twee lessen: uitvoering + vervolg). `Studiewijzer_Muziek_H5_2026-2027.docx` noemt geen duur.
  - vwo 4: PTA zegt P1/P2, studiewijzer en leergang PT1/PT2. Alleen de naam verschilt.
- [ ] **Way Maker komt in de periode na de kerst (besluit Frans 2-11).** Dat is periode 3 (lesweek 21-30), maar die lessen zijn nu theorie voor T1 (lesweek 29), met Way Maker alleen in "Rollen in een band en orkest" (havo 3 lesweek 27, vwo 3 lesweek 26). Open: blijft het bij die les, of krijgt Way Maker meer lessen, en welke vervallen dan? De lesinhoud staat nog in `tools/inhoud-klas3.json` onder de oude titels, de presentatie `11 Way Maker - kennismaken.pptx` ook. Oude verwijzingen in lesweek 1 en 8 kloppen niet meer.
- [ ] **Vragen bij beoordelingsmodus stap 2:** (1) P4 "Samenspel en eigen rol": telt de groepsscore pas na bevestigen per leerling (nu), of tenzij Frans afwijkt? (2) Groepscriteria per model nakijken; is mavo-samenspel "met de begeleiding" spel in een groep? (3) Cijferkolom alleen met afgeronde cijfers? (4) Toelichtingen van klasgenoten bewaren en op het feedbackblad? (5) Feedbackblad in Encode Sans Light en Bold, omdat Regular niet op de laptop staat: goed? (6) Moet het eigen cijfer ook uit Forms komen (nu intypen)?
- [ ] **Vragen bij uitval en inhalen (gebouwd, live sinds 2-11):** (1) vanaf hoeveel dagen vóór een toets een melding (nu 21); (2) Zermelo toont een les in een geplande uitvalweek: gaat die door (nu ja); (3) koor en sectieafspraken blijven staan op een afwezige dag (nu ja); (4) havo 5 `lesdagen` wo, ma, ma: klopt de volgorde, want P4 kan op een andere dag vallen.
- [x] **Uitval en inhalen (ontwerp 30-10):** live sinds 2-11, lokaal getest met verzonnen gegevens. Nieuw in de staat: `S.afwezig`, `S.ankers`, `S.afwijkingen`; les-id's ongewijzigd. Nog niet gebouwd (voor D): notenbalk, twee lessen samenvoegen, Week afsluiten, AI-voorstellen. https://claude.ai/artifact/KaRevv4Uuw2cbCLU2nFUi4. Lessen schuiven door, toetsen worden ankers, bij krapte een inhaalvoorstel. Nu schuift een toetsles mee (`reeks`/`planning`): bij één uitgevallen les in vwo 4 lesweek 8 zakt PT1 voorbij 9-11. Echt gebeurd: Frans was di 27 en wo 28-10 afwezig (vwo 4 generale PT1 vervallen, havo 5 woensdagles ook). Besluit Frans: afwezig = alle lessen van die dagen vervallen, niet per les vragen ("Ik ben er niet" + Zermelo vervallen). Besluiten Frans (30-10): PTA-toets verplaatsen beslist Frans zelf (geen mail of akkoord, wel een reden in de afwijkingenlijst); onderbouwtoetsen schuiven vrij, maar binnen de periode uit het PTO; inhaalbare lessen herkent Lesdag aan de titel (generale, afronden, herhaling, oefenen). Nog open: akkoord om te bouwen, en:
  - PTA vwo 4 PT1 duurt 90 minuten, de leergang heeft er één les van 45 voor (lesweek 10, les 2 is themadag). Volgens Frans (2-11) een foutje in de planning, Frans maakt het vóór de kerst in orde. Besluit Frans (2-11): PT1 op ma 9-11 wordt afgenomen in 45 minuten, afwijkend van het PTA.
- [ ] **PT1 vwo 4 (ma 9-11):** leergang (`toetsen`, duur 90), PTA (90) en het veld `pta` in `pt1-vwo4` zeggen 90 minuten; afname wordt 45 op besluit van Frans. Verwerken: `duur` en `pta`-tekst aanpassen of als afwijking noteren. Ook niet aangepast: de normering (generale en improvisatie-uitleg van 28-10 zijn vervallen) en `leerlingInstructie` ("na de generale").
- [ ] **PT1, keuzes vooraf:** wordt de zang beoordeeld op This old hammer of op het eigen stuk? Mo' Better Blues staat niet in de sectiemap; When I walk hand in hand alleen in de Havo 4-map, in drie mollen, terwijl de improvisatie in C is. Aantal groepen staat nergens: het deck rekent 2, 3 en 4 groepen voor.
- [ ] **Ma 9-11 valt in toetsweek 1 (2-10 nov):** vwo 6 valt daarom uit (`ma-di toetsweek`), vwo 4 en vwo 5 hebben die dag wel les. Niet nagekeken in Zermelo: klopt dat?
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

1. Lesinhoud bijwerken naar de presentaties: de decks wijken af van `basis.json`, dat alleen links kreeg (`handboek/presentaties-bronverschillen-2026-11-02.md`). Neem `tools/inhoud-week10.json`, `inhoud-kerst-klas3.json`, `inhoud-herbouw-mavo.json` en mavo 3 lesweek 12 en 14 mee in de leergang. Way Maker staat nog bij havo 3 lesweek 1, 8, 27, 37, vwo 3 lesweek 1, 8, 26, 37 en in `songbox1-klas3` (`vooruit`). Presentaties opnieuw maken: overige `08*`-bestanden en `11 Way Maker - kennismaken.pptx` zijn nog vervormd. Klaar en live (2-11): lesweek 9 en 10, les 8.
2. Beoordelingsmodus stap 2, klaar vóór 8-1-2027. Alles live sinds 2-11 (`d45c606`): veilig opslaan, cijferkolom, groepjes, tussenstand, feedbackblad als pdf, klasgenoten, Songbox 1. Formulieren en scorebladen van de drie examenconcerten en Songbox 1 staan vernieuwd in de sectiemap, met een nieuw formulier Beoordeling klasgenoten. Nog te doen zodra `basis.json` vrij is: bij blok P1 van havo 3 en vwo 3 in `basis.json` en `bron/leergang-data.json` "Formatief" vervangen door voortgangscijfer. Voorstel: https://claude.ai/artifact/HYmdo2WccDnYrBJvWdL51W
3. Lesinhoud nog leeg: BB1, keuzeuur h3 (kmu3), delen van mavo 3 en mavo 4.
4. Beoordelingsmodus stap 3, vóór 19-3-2027: overzicht per leerling over het jaar, vergelijking met de zelfbeoordeling.
5. Dashboard-artifact verversen met de nieuwe data (lesinhoud, beoordelingen).
6. **Rooster via de Zermelo-API: gebouwd (2-11), nog niet getest met echte gegevens.** Worker (`koppel`, `afspraken`) en app staan klaar, de agendalink blijft als reserve. Zie C voor de proef. Daarna kan het raden in `zDienst`/`zToets` verder weg en de iCal eruit.

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

- **PowerPoint en OneDrive:** overschrijf je een pptx die op deze laptop al geopend is geweest, dan kan PowerPoint een oude versie uit zijn cache erbij halen (dubbele tekstvakken, een keer een dialoog die de automatisering liet hangen). Niet bewezen, maar een nieuwe bestandsnaam loste het op. Daarom heten drie bestanden nu `09 Kiezen voor muziek in de bovenbouw - nieuw.pptx`, `09 Terugblik presentatie 1 - ritme en maat - nieuw.pptx` en `10.1 PT1 afnemen - samenspel en zang.pptx`. Maak zo'n deck opnieuw onder een nieuwe naam en meet op een kopie.
- **Presentatiehulpmiddelen:** `tools/maak-decks.js` + `tools/inhoud-decks-LEESMIJ.md` (bouwen), `tools/meet-deck.js` (crop en notities), `tools/meet-overloop.ps1` (overloop), `tools/koppel-presentaties.js` (alleen links). Koppen zijn Encode Sans vet; terug naar Compressed is één regel in `lesdeck.js`.
- **Beoordeling:** synchronisatie vervangt bij Entra nog de hele staat; dat moet eerst samenvoegen worden. Formulieren en scoreblad staan nog op Calibri, de afspraak is Encode Sans (op de laptop alleen Light en Bold: eerst nagaan hoe Word daarmee omgaat).
- **Zermelo-API toekomst:** de koppeling gebruikt `/api/v3` met een persoonlijke koppelcode. Zermelo documenteert sinds 13-4-2026 alleen nog partnerkoppelingen (`/api`, aan te maken door een beheerder, met verplicht `schoolInSchoolYear`), zonder einddatum voor v3 te noemen. Op 2-11 antwoordde `/api/v3` op csgpm nog. Stopt het: agendalink als reserve, en ICT vragen om een partner.
- **Samenvoegen `proef-nu` met `main`:** `main` heeft sinds 30-10 eigen `zTekst` en `zDienst` (bij de Zermelo-functies). `proef-nu` definieert die ook bij de pauzes: één van beide weghalen, anders een SyntaxError. In `dagItems` ook `toets` en `rooster` bij de bezette soorten houden.

- Na elke wijziging van de koorplanning in de Koorapp: `/lesdag-koor`.
- `merge-inhoud.js --force` kan materiaal overschrijven: daarna `koppel-beoordeling.js`.
- `koppel-week8.js` voegt de P9-bijlagen nog apart toe; dubbel met het P9-model is onschuldig (zelfde URL), maar kan weg.
