# Open punten Lesdag

Bijgewerkt: 2 november 2026 (Zermelo-API gebouwd, wacht op proef met echte code; toetsweek 1 in Dag en Week bevestigd; besluiten Frans over A). Werk dit bij aan het eind van elk werkblok. A = beslissing van Frans nodig.

## A. Wacht op Frans

Besluiten Frans (2-11):
- Zelfbeoordeling 10% klopt (Way Maker en Songbox 1 blijven 0%, de reflectie zit daar in de rubric). De modellen staan al goed.
- Songbox 1 klas 3 telt als voortgangscijfer. In model `songbox1-klas3` staat nog "Geen PTO-toets: cijfer voor het speelstuk": aanvullen met "voortgangscijfer".
- Way Maker-box in Musicbox is beoordeeld en zichtbaar (id `71df1713-b814-4ddf-ae6d-85c300843784`).

- [ ] **Tegenstrijdige bronnen in de beoordelingsmodellen** (2-11 nagekeken in de PTA-pdf's, studiewijzers en leergang):
  - mavo 4 P2: PTA en leergang weging 40, studiewijzer 30%.
  - mavo 4 P1: PTA M4 weging 10, PTA M3 en leergang 15. Met 15 komt het SE op 100 (P1 15, T1 15, T3 20, P2 40, P3 10), met 10 op 95.
  - mavo 4 P3: PTA "per. 3 in les" met inleverdatum 22-01-2027, maar die valt in toetsweek 2, vóór periode 3 (start 8-2). Leergang: lesweek 27, ma 29-3 (Tweede Paasdag).
  - mavo 3 P1: herkansing in TW3 (5-13 apr), maar presentatie 3 is in lesweek 35 (7 jun) en het cijfer volgt in lesweek 36. PTA-einddatum 2-7-2027.
  - havo 5 P4: PTA 180 min, leergang 90 (lesweek 21: generale + productie). De studiewijzer ("uiterlijk 16 april") is de SE-grens, geen conflict met februari.
  - havo 5 P3: PTA 90 min, leergang 45 (lesweek 17 heeft wel twee lessen: uitvoering + vervolg). `Studiewijzer_Muziek_H5_2026-2027.docx` noemt geen duur.
  - vwo 4: PTA zegt P1/P2, studiewijzer en leergang PT1/PT2. Alleen de naam verschilt.
- [ ] **Examenconcerten: beoordeling door groepsgenoten telt mee (besluit Frans 2-11).** Nog open: hoeveel procent, en gaat dat van het docentdeel af? Nu docent + 10% zelfbeoordeling. Groepscriteria (programma, eigen werk) krijgen mogelijk voor de hele klas dezelfde score. Daarna de modellen aanpassen met `/lesdag-beoordeling`.
- [ ] **Way Maker komt in de periode na de kerst (besluit Frans 2-11).** Dat is periode 3 (lesweek 21-30), maar die lessen zijn nu theorie voor T1 (lesweek 29), met Way Maker alleen in "Rollen in een band en orkest" (havo 3 lesweek 27, vwo 3 lesweek 26). Open: blijft het bij die les, of krijgt Way Maker meer lessen, en welke vervallen dan? De lesinhoud staat nog in `tools/inhoud-klas3.json` onder de oude titels, de presentatie `11 Way Maker - kennismaken.pptx` ook. Oude verwijzingen in lesweek 1 en 8 kloppen niet meer.
- [ ] **Presentaties klas 3:** gemaakt zijn nu les 8, 9 en 11 (`01 Onderbouw muziek\Klas 3\Lessen 2026-2027\`). Vraag aan Frans: is deze stijl goed, zodat de rest zo gemaakt kan worden? Les 11 (Way Maker) is achterhaald door de kerstbox.
- [ ] **Uitval en inhalen (ontwerp 30-10):** https://claude.ai/artifact/KaRevv4Uuw2cbCLU2nFUi4. Lessen schuiven door, toetsen worden ankers, bij krapte een inhaalvoorstel. Nu schuift een toetsles mee (`reeks`/`planning`): bij één uitgevallen les in vwo 4 lesweek 8 zakt PT1 voorbij 9-11. Echt gebeurd: Frans was di 27 en wo 28-10 afwezig (vwo 4 generale PT1 vervallen, havo 5 woensdagles ook). Besluit Frans: afwezig = alle lessen van die dagen vervallen, niet per les vragen ("Ik ben er niet" + Zermelo vervallen). Besluiten Frans (30-10): PTA-toets verplaatsen beslist Frans zelf (geen mail of akkoord, wel een reden in de afwijkingenlijst); onderbouwtoetsen schuiven vrij, maar binnen de periode uit het PTO; inhaalbare lessen herkent Lesdag aan de titel (generale, afronden, herhaling, oefenen). Nog open: akkoord om te bouwen, en:
  - PTA vwo 4 PT1 duurt 90 minuten, de leergang heeft er één les van 45 voor (lesweek 10, les 2 is themadag). Volgens Frans (2-11) een foutje in de planning, Frans maakt het vóór de kerst in orde. Besluit Frans (2-11): PT1 op ma 9-11 wordt afgenomen in 45 minuten, afwijkend van het PTA.
- [ ] **Besluit voor schooljaar 2027-2028 (Frans, 30-10):** praktische toetsen vwo 4 en vwo 5 niet meer vlak na de zomer (nu PT1 vwo 4 lesweek 10, P9 vwo 5 lesweek 8). Op z'n vroegst in de periode van toetsweek 2. Frans verwerkt dit vóór de kerst in het PTA 2027-2028 en de leergangen voor volgend jaar (2-11).

## B. Wacht op anderen

- [ ] ICT: Microsoft Entra-app (clientId, tenantId) voor OneDrive-opslag en -export. Tot dan staan scores alleen in de browser; scoreblad als CSV-download.
- [ ] Examensecretaris: pdf per leerling als dossierstuk (Frans: "dat denk ik wel").
- [ ] SLC-taken na de conferentie.

## C. Te testen in het echt

- [ ] Beoordelingsmodus in een echte les: vwo 3 Songbox 1 (29-10), vwo 4 PT1 (9-11). Vragen: past het scherm op zijn laptop/tablet, gaat plakken uit Magister goed, mist er iets.
- [ ] Zermelo-herkenning (`zMuziek`, `zGroep`) met het echte rooster.
- [ ] **Zermelo-koppeling met een echte koppelcode.** Vooraf: de nieuwe `worker/rooster-proxy.js` online zetten (Cloudflare, Edit code, plakken, Deploy). Frans maakt de code aan en plakt die zelf in Instellingen. Controleren: staat er "via de koppeling"; kloppen vakcode (`mu`, `kmu`?) en groepscodes (`h3a` of `h3.mu`?); weigert `/api/v3` geen veld uit `VELDEN`; hoe zien surveillances eruit (nu: `exam` van een ander vak op Frans' naam, of de tekst "surveillance"). Nog na te gaan: hoe lang de token geldig is, en of `students` voor een docent leesbaar is (Lesdag vraagt het bewust niet op).
- [x] Toetsweek 1 (2-10 nov): surveillances en toetsen uit Zermelo staan goed in Dag en Week (Frans, 2-11, met het echte rooster). Nog niet apart bevestigd: de melding "tijd niet in rooster" als een toetsweektoets uit de leergang (h5 T3, v6 T9) niet in Zermelo staat.
- [ ] Microsoft-login en OneDrive-opslag tegen de echte tenant (na B).

## D. Bouwen (volgorde)

1. Lespresentaties lesweek 10 (9-13 nov): alleen vwo 5, vwo 4 (PT1 is een toets) en vwo 6 hebben les; de rest valt uit. Lesweek 9 is klaar (2-11-2026): klas 3 `09 Kiezen voor muziek in de bovenbouw`, mavo 3 `09 Terugblik presentatie 1` (`tools/inhoud-week9.json`, `maak-decks-week9.js`). BB1 en keuzeuur h3 hebben geen lesinhoud en dus geen presentatie (zie punt 3).
2. Beoordelingsmodus stap 2, klaar vóór 8-1-2027: groepjes in één keer scoren, feedbackblad als pdf per leerling, tussenstand die niet meetelt, cijferkolom voor Magister. Voorstel: https://claude.ai/artifact/HYmdo2WccDnYrBJvWdL51W
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
1. Lespresentaties voor lesweek 11-16 havo 3 en vwo 3 (kerstlessen) en mavo 3 lesweek 12 en 14.
2. Dashboard-artifact verversen (D5) zodat het de kerstboxen ook toont.

## Sectietaken uit de werkwijze (2-11, gedaan in een cloudsessie, live sinds 2-11)

- [x] `public/data/basis.json` aangevuld met 37 sectietaken uit de vastgestelde *Werkwijze sectievoorzitter muziek* (00 Sectie\02 Vakwerkplan en beleid): ids `ww1`-`ww9` (schooltermijnen), `im1`-`im17` (impliciete taken), `hd1` (handelingsdeel onderhoud), `or1` (grote opruimronde) en `mc-2026-11` t/m `mc-2027-07` (maandcontrole budget, inventaris, kasten en magazijn). Bij `res1`-`res3` staat nu ook de RTTI-analyse.
- [ ] Data met `bevestigen` nog vastzetten: `hd1`, `or1`, `ww7`, `im16`, `im17`.

## E. Klein en technisch

- **Zermelo-API toekomst:** de koppeling gebruikt `/api/v3` met een persoonlijke koppelcode. Zermelo documenteert sinds 13-4-2026 alleen nog partnerkoppelingen (`/api`, aan te maken door een beheerder, met verplicht `schoolInSchoolYear`), zonder einddatum voor v3 te noemen. Op 2-11 antwoordde `/api/v3` op csgpm nog. Stopt het: agendalink als reserve, en ICT vragen om een partner.
- **Samenvoegen `proef-nu` met `main`:** `main` heeft sinds 30-10 eigen `zTekst` en `zDienst` (bij de Zermelo-functies). `proef-nu` definieert die ook bij de pauzes: één van beide weghalen, anders een SyntaxError. In `dagItems` ook `toets` en `rooster` bij de bezette soorten houden.

- Na elke wijziging van de koorplanning in de Koorapp: `/lesdag-koor`.
- `merge-inhoud.js --force` kan materiaal overschrijven: daarna `koppel-beoordeling.js`.
- `koppel-week8.js` voegt de P9-bijlagen nog apart toe; dubbel met het P9-model is onschuldig (zelfde URL), maar kan weg.
