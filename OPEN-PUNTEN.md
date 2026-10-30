# Open punten Lesdag

Bijgewerkt: 30 oktober 2026. Werk dit bij aan het eind van elk werkblok. A = beslissing van Frans nodig.

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
- [ ] **Presentaties klas 3:** oordeel over les 8 en 11, daarna de overige 32 lessen.

## B. Wacht op anderen

- [ ] ICT: Microsoft Entra-app (clientId, tenantId) voor OneDrive-opslag en -export. Tot dan staan scores alleen in de browser; scoreblad als CSV-download.
- [ ] Examensecretaris: pdf per leerling als dossierstuk (Frans: "dat denk ik wel").
- [ ] SLC-taken na de conferentie.

## C. Te testen in het echt

- [ ] Beoordelingsmodus in een echte les: vwo 3 Songbox 1 (29-10), vwo 4 PT1 (9-11). Vragen: past het scherm op zijn laptop/tablet, gaat plakken uit Magister goed, mist er iets.
- [ ] Zermelo-herkenning (`zMuziek`, `zGroep`) met het echte rooster.
- [ ] Toetsweek 1 (2-10 nov): komen surveillances en toetsen uit Zermelo goed in Dag en Week (`zAnders`, `zDienst`, `zToets`)? Muziektoets met "toets" in Zermelo telt in een toetsweek als toets, niet als les. Staat een toetsweektoets uit de leergang niet in Zermelo, dan een melding op de eerste dag en op maandag (nu: v6 T9).
- [ ] Microsoft-login en OneDrive-opslag tegen de echte tenant (na B).

## D. Bouwen (volgorde)

1. Lespresentaties voor de week van 2 november (alle klassen met lesinhoud), vóór maandag.
2. Beoordelingsmodus stap 2, klaar vóór 8-1-2027: groepjes in één keer scoren, feedbackblad als pdf per leerling, tussenstand die niet meetelt, cijferkolom voor Magister. Voorstel: https://claude.ai/artifact/HYmdo2WccDnYrBJvWdL51W
3. Lesinhoud nog leeg: BB1, keuzeuur h3 (kmu3), delen van mavo 3 en mavo 4.
4. Beoordelingsmodus stap 3, vóór 19-3-2027: overzicht per leerling over het jaar, vergelijking met de zelfbeoordeling.
5. Dashboard-artifact verversen met de nieuwe data (lesinhoud, beoordelingen).

## E. Klein en technisch

- **Samenvoegen `proef-nu` met `main`:** `main` heeft sinds 30-10 eigen `zTekst` en `zDienst` (bij de Zermelo-functies). `proef-nu` definieert die ook bij de pauzes: één van beide weghalen, anders een SyntaxError. In `dagItems` ook `toets` en `rooster` bij de bezette soorten houden.

- Na elke wijziging van de koorplanning in de Koorapp: `/lesdag-koor`.
- `merge-inhoud.js --force` kan materiaal overschrijven: daarna `koppel-beoordeling.js`.
- `koppel-week8.js` voegt de P9-bijlagen nog apart toe; dubbel met het P9-model is onschuldig (zelfde URL), maar kan weg.
