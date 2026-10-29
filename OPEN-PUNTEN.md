# Open punten Lesdag

Bijgewerkt: 29 oktober 2026. Werk dit bij aan het eind van elk werkblok. A = beslissing van Frans nodig.

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
- [ ] **Proef Nu-scherm (branch `proef-nu`):** een paar dagen gebruiken op https://proef-nu.lesdag-muziek.pages.dev (eigen opslag, dus eerst rooster en pauzes daar invullen). Daarna kiezen: naar `main`, bijschaven of laten. Vragen:
  - Pauzes komen uit het Zermelo-rooster (Frans: "de roostermaker plant ze"). Lesdag neemt afspraken met "pauze" over, anders de vaste gaten van 10 tot 40 minuten tussen lesuren; pauzedienst of surveillance telt als werk. Nagaan met het echte rooster of de goede tijden eruit komen (Instellingen, Pauzes, laat ze zien).
  - Klopt "meer dan 5,5 uur werk = 30 minuten pauze" voor jou, of zegt de cao VO iets anders? Nu staat 30 minuten in `RUST.nodig`.
  - Werkt het tweede venster voor het bord op de schoollaptop (pop-up toestaan), en de pijltjes van je presenter in de regie?

## B. Wacht op anderen

- [ ] ICT: Microsoft Entra-app (clientId, tenantId) voor OneDrive-opslag en -export. Tot dan staan scores alleen in de browser; scoreblad als CSV-download.
- [ ] Examensecretaris: pdf per leerling als dossierstuk (Frans: "dat denk ik wel").
- [ ] SLC-taken na de conferentie.

## C. Te testen in het echt

- [ ] Beoordelingsmodus in een echte les: vwo 3 Songbox 1 (29-10), vwo 4 PT1 (9-11). Vragen: past het scherm op zijn laptop/tablet, gaat plakken uit Magister goed, mist er iets.
- [ ] Zermelo-herkenning (`zMuziek`, `zGroep`) met het echte rooster.
- [ ] Microsoft-login en OneDrive-opslag tegen de echte tenant (na B).

## D. Bouwen (volgorde)

1. Lespresentaties voor de week van 2 november (alle klassen met lesinhoud), vóór maandag.
2. Beoordelingsmodus stap 2, klaar vóór 8-1-2027: groepjes in één keer scoren, feedbackblad als pdf per leerling, tussenstand die niet meetelt, cijferkolom voor Magister. Voorstel: https://claude.ai/artifact/HYmdo2WccDnYrBJvWdL51W
3. Lesinhoud nog leeg: BB1, keuzeuur h3 (kmu3), delen van mavo 3 en mavo 4.
4. Beoordelingsmodus stap 3, vóór 19-3-2027: overzicht per leerling over het jaar, vergelijking met de zelfbeoordeling.
5. Dashboard-artifact verversen met de nieuwe data (lesinhoud, beoordelingen).
6. Na de proef Nu-scherm: de tablet als afstandsbediening van het bord (klein doorgeefluik in Cloudflare; alleen fase en klok, geen leerlinggegevens). Nu werken bord en regie alleen op hetzelfde apparaat (BroadcastChannel).

## Proef Nu-scherm (branch `proef-nu`, 29-10)

Ontwerpprincipes (gesprek 29-10): het scherm volgt de dag; pauzes zijn van Frans en nooit vrij voor taken; in een pauze toont Nu niets over werk; valt een pauze weg (koor, Sing-In "in de pauzes"), dan een rustblok in het eerste vrije blok daarna, nooit in een les; lestijd ligt vast, Lesdag haalt nooit iets uit een les; werkblokken hoogstens twee derde vol; open punten krijgen bij het afsluiten een moment; na het afsluiten is het stil; geen scores of rode tellers; stem en gehoor (water, oordoppen).
Gebouwd: route `#nu` (standaard) met partituur, nu-kaart per moment (`moment()`), straks, voorstellen (ja/later), opdrachtbalk Ctrl K met snelle taak in gewone taal (`leesTaak`), regie `#regie/<uur>/<dag>` met bord `#bord/<uur>/<dag>` in een tweede venster, scherm aan en trillen twee minuten voor het eind van een fase, pauzes in Instellingen, pauzes en rustblokken ook in Dag en Week. Getest met een verzonnen rooster en een nagebootste klok, ook op 375 px.
Ronde 2 (29-10, na "aan de UI en UX is toch niets veranderd?"): nieuwe schil. Zijbalk met pictogrammen op laptop en liggende tablet, tabbalk onderaan onder 900 px; Nu met grote nu-balk (wat, klok, nog-zoveel-minuten, voortgangsstreep) die van kleur wisselt per moment (`data-moment`); hoofdknoppen van het moment in een actiebalk onderaan (`<!--dok-->` in de kaarten, `dokUit`); bladeren door de dag met ‹ ›, pijltjes en vegen (`nuStap`); voorbije blokken vervaagd; pauzes uit Zermelo (`zPauzes`, eigen pauzes alleen als het rooster niet klopt). Getest op 1280, 800×1280 en 375 px.

## E. Klein en technisch

- Na elke wijziging van de koorplanning in de Koorapp: `/lesdag-koor`.
- Roosterproxy `lesdag-rooster` laat sinds 29-10 ook testadressen `*.lesdag-muziek.pages.dev` toe (live, versie bd2545cf; code in `worker/rooster-proxy.js` op branch `proef-nu`, mee naar `main` bij het samenvoegen). Andere sites krijgen 403.
- `merge-inhoud.js --force` kan materiaal overschrijven: daarna `koppel-beoordeling.js`.
- `koppel-week8.js` voegt de P9-bijlagen nog apart toe; dubbel met het P9-model is onschuldig (zelfde URL), maar kan weg.
