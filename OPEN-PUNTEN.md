# Open punten Lesdag

Bijgewerkt: 2 november 2026 (toetsweek 1 in Dag en Week bevestigd). Werk dit bij aan het eind van elk werkblok. A = beslissing van Frans nodig.

## A. Wacht op Frans

- [ ] **Zelfbeoordeling 10%** bevestigen (zelf gekozen; Frans zei alleen "telt mee"). Way Maker en Songbox 1: 0%, de reflectie zit daar al in de rubric.
- [ ] **Songbox 1 klas 3 (lesweek 8):** volgens leergang geen cijfer; Frans beoordeelt toch. Telt het als voortgangscijfer? Model `songbox1-klas3` staat klaar.
- [ ] **Tegenstrijdige bronnen in de beoordelingsmodellen:**
  - mavo 4 P2: PTA en vakwerkplan weging 40, studiewijzer 30%.
  - mavo 4 P1: PTA M4 weging 10, vakwerkplan en PTA M3 15; wanneer wordt het afgenomen (herkansing in TW3?).
  - mavo 4 P3: PTA inleveren 22-01-2027, leergang 29-03-2027 (Tweede Paasdag).
  - mavo 3 P1: herkansing in TW3, maar presentatie 3 (slagwerk) valt in lesweek 35.
  - havo 5 P4: PTA 180 min, leergang 90; studiewijzer "uiterlijk 16 april", leergang februari.
  - havo 5 P3: PTA 90 min, studiewijzer 45.
  - vwo 4: PTA zegt P1/P2, studiewijzer en leergang PT1/PT2 (bestanden heten PT1/PT2).
- [ ] **Examenconcerten:** telt de beoordeling door groepsgenoten mee? Nu alleen docent + 10% zelfbeoordeling. Groepscriteria (programma, eigen werk) krijgen mogelijk voor de hele klas dezelfde score.
- [ ] **Way Maker-box in Musicbox** (verborgen, id `71df1713-b814-4ddf-ae6d-85c300843784`): beoordelen en zelf zichtbaar maken.
- [ ] **Way Maker schuift naar later in het jaar (besluit Frans 30-10).** Waar precies? De lesinhoud staat nog in `tools/inhoud-klas3.json` onder de oude titels, de presentatie `11 Way Maker - kennismaken.pptx` ook.
- [ ] **Presentaties klas 3:** oordeel over les 8 en 11, daarna de overige 32 lessen.
- [ ] **Uitval en inhalen (ontwerp 30-10):** https://claude.ai/artifact/KaRevv4Uuw2cbCLU2nFUi4. Lessen schuiven door, toetsen worden ankers, bij krapte een inhaalvoorstel. Nu schuift een toetsles mee (`reeks`/`planning`): bij één uitgevallen les in vwo 4 lesweek 8 zakt PT1 voorbij 9-11. Echt gebeurd: Frans was di 27 en wo 28-10 afwezig (vwo 4 generale PT1 vervallen, havo 5 woensdagles ook). Besluit Frans: afwezig = alle lessen van die dagen vervallen, niet per les vragen ("Ik ben er niet" + Zermelo vervallen). Besluiten Frans (30-10): PTA-toets verplaatsen beslist Frans zelf (geen mail of akkoord, wel een reden in de afwijkingenlijst); onderbouwtoetsen schuiven vrij, maar binnen de periode uit het PTO; inhaalbare lessen herkent Lesdag aan de titel (generale, afronden, herhaling, oefenen). Nog open: akkoord om te bouwen, en:
  - Tegenstrijdigheid: PTA vwo 4 PT1 duurt 90 minuten, de leergang heeft er één les van 45 voor (lesweek 10, les 2 is themadag).
- [ ] **Besluit voor schooljaar 2027-2028 (Frans, 30-10):** praktische toetsen vwo 4 en vwo 5 niet meer vlak na de zomer (nu PT1 vwo 4 lesweek 10, P9 vwo 5 lesweek 8). Op z'n vroegst in de periode van toetsweek 2. Meenemen in het PTA 2027-2028 en de leergangen voor volgend jaar.

## B. Wacht op anderen

- [ ] ICT: Microsoft Entra-app (clientId, tenantId) voor OneDrive-opslag en -export. Tot dan staan scores alleen in de browser; scoreblad als CSV-download.
- [ ] Examensecretaris: pdf per leerling als dossierstuk (Frans: "dat denk ik wel").
- [ ] SLC-taken na de conferentie.

## C. Te testen in het echt

- [ ] Beoordelingsmodus in een echte les: vwo 3 Songbox 1 (29-10), vwo 4 PT1 (9-11). Vragen: past het scherm op zijn laptop/tablet, gaat plakken uit Magister goed, mist er iets.
- [ ] Zermelo-herkenning (`zMuziek`, `zGroep`) met het echte rooster.
- [x] Toetsweek 1 (2-10 nov): surveillances en toetsen uit Zermelo staan goed in Dag en Week (Frans, 2-11, met het echte rooster). Nog niet apart bevestigd: de melding "tijd niet in rooster" als een toetsweektoets uit de leergang (h5 T3, v6 T9) niet in Zermelo staat.
- [ ] Microsoft-login en OneDrive-opslag tegen de echte tenant (na B).

## D. Bouwen (volgorde)

1. Lespresentaties lesweek 10 (9-13 nov): alleen vwo 5, vwo 4 (PT1 is een toets) en vwo 6 hebben les; de rest valt uit. Lesweek 9 is klaar (2-11-2026): klas 3 `09 Kiezen voor muziek in de bovenbouw`, mavo 3 `09 Terugblik presentatie 1` (`tools/inhoud-week9.json`, `maak-decks-week9.js`). BB1 en keuzeuur h3 hebben geen lesinhoud en dus geen presentatie (zie punt 3).
2. Beoordelingsmodus stap 2, klaar vóór 8-1-2027: groepjes in één keer scoren, feedbackblad als pdf per leerling, tussenstand die niet meetelt, cijferkolom voor Magister. Voorstel: https://claude.ai/artifact/HYmdo2WccDnYrBJvWdL51W
3. Lesinhoud nog leeg: BB1, keuzeuur h3 (kmu3), delen van mavo 3 en mavo 4.
4. Beoordelingsmodus stap 3, vóór 19-3-2027: overzicht per leerling over het jaar, vergelijking met de zelfbeoordeling.
5. Dashboard-artifact verversen met de nieuwe data (lesinhoud, beoordelingen).
6. **Rooster via de Zermelo-API in plaats van iCal (na toetsweek 1, besluit Frans 30-10).** Eigen sessie. Zermelo, Instellingen, "Koppel externe applicatie" geeft een eenmalige koppelcode (schoolnaam `csgpm` + code). De Worker ruilt die in voor een access token (`POST https://csgpm.zportal.nl/api/v3/oauth/token`, `grant_type=authorization_code`) en haalt `appointments` op. Winst: vak, groep, lokaal en docent als aparte velden, plus soort afspraak (les, toets, activiteit, surveillance), vervallen en gewijzigd met reden. Daarmee vervallen het raden in `zMuziek`/`zGroep`/`zToets`/`zDienst`/`zAnders`. Eerst nagaan: welke velden een docent mag zien, en of leerlingen per groep beschikbaar zijn. Let op: de token kan alles wat Frans in Zermelo mag, dus strenger dan de iCal-link. Nooit in code, commit of chat; Frans maakt de code pas bij het bouwen aan en plakt die zelf in Instellingen. Uitkomst toetsweek 1 (2-11): de iCal voldeed, dus geen spoed.

## Kerstboxen klas 3 (30-10, gedaan in een cloudsessie, nog niet live)

Besluiten Frans: havo 3 en vwo 3 werken lesweek 11 t/m 15 aan een eigen kerstbox (havo: Mary's Boy Child in F, de toonsoort van Boney M., gitaar met capo op fret 3, ukelele zonder capo in F; vwo: God Rest Ye Merry Gentlemen in E-mineur). P1 blijft lesweek 19 en gaat over dat kerstlied. Mavo 3: Go Tell It on the Mountain (G) als oefenstof voor presentatie 2 akkoordinstrument. Concept: https://claude.ai/artifact/QgMC93swvjYjFQHy6Fwbxd · Ontwerp per niveau (tekst voor Musicbox): https://claude.ai/artifact/6XSY5bPZ8dYNbWUY6VKfi1

Al gewijzigd in de bestanden (nog niet gecommit):
- `public/data/basis.json` en `bron/leergang-data.json`: havo 3 en vwo 3 lesweek 11-16 nieuwe lessen met fasen; Way Maker-formulieren uit lesweek 17-20; blok P2, toets P1 en meta.bron bijgewerkt. Mavo 3 lesweek 12-19: titels en details met Go Tell It.
- `tools/inhoud-klas3.json`: nieuwe lessen erbij (oude Way Maker-lessen blijven staan).
- `tools/beoordeling/p1-klas3-waymaker.json`: model omgezet naar het kerstlied, map `01 Onderbouw muziek\Klas 3\P1 Presentatie kerstlied\Beoordeling`, lesweek 14 wordt 16. Id en bestandsnaam heten nog `waymaker`.

Nog te doen op de laptop, in deze volgorde:
1. `maak-alles.ps1 -Ids p1-klas3-waymaker` (eerst testmap, dan echt): formulieren en scoreblad in de nieuwe map.
2. `node tools/beoordeling/koppel-beoordeling.js`.
3. `/lesdag-online`.
4. Lespresentaties voor lesweek 11-16 havo 3 en vwo 3 (kerstlessen) en mavo 3 lesweek 12 en 14.
5. Dashboard-artifact verversen (D5) zodat het de kerstboxen ook toont.

## E. Klein en technisch

- **Samenvoegen `proef-nu` met `main`:** `main` heeft sinds 30-10 eigen `zTekst` en `zDienst` (bij de Zermelo-functies). `proef-nu` definieert die ook bij de pauzes: één van beide weghalen, anders een SyntaxError. In `dagItems` ook `toets` en `rooster` bij de bezette soorten houden.

- Na elke wijziging van de koorplanning in de Koorapp: `/lesdag-koor`.
- `merge-inhoud.js --force` kan materiaal overschrijven: daarna `koppel-beoordeling.js`.
- `koppel-week8.js` voegt de P9-bijlagen nog apart toe; dubbel met het P9-model is onschuldig (zelfde URL), maar kan weg.
