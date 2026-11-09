# Controle lesinhoud tegen PTA, PTO en studiewijzers (november 2026)

Gemaakt 8-9 nov 2026 in branch `pta-inhoud`. Alleen lezen: `basis.json`, `beoordeling.json` en `OPEN-PUNTEN.md` zijn niet aangepast. Tegenstrijdigheden tussen bronnen zijn gemeld, niet opgelost. Per klas: toetsentabel (PTA/PTO tegenover `basis.json` en `beoordeling.json`), toets-les-koppeling, de meldingen van `tools/controleer-lesgegevens.js` met wat de bron zegt, lessen die nog moeten komen zonder fasen, en vragen aan Frans. Voorstel voor ontbrekende lessen: `tools/voorstel-lessen-2026-11.json`.

Bronnen: PTA-pdf's 2026-2027 (mavo 3 en 4, havo 4 en 5, vwo 4, 5 en 6), studiewijzers, `pto_overzicht_2026 november.xlsx` (voor havo 3, vwo 3, BB1; mavo 3 en kmu3 staan er niet in), PTO-richtlijnen 26-27, Vakwerkplan, Jaarplanning en TW1-rooster. "S/bron" in de tabellen is de tekstkopie van die bronnen in de werkmap van deze controle (niet bewaard).

## Wat het meest dringend is

1. **Havo 5, T3:** het TW1-rooster zet T3 op ma 9 nov (uur 4-6, lokaal 009); Lesdag heeft de toetsles op wo 4 nov en 10.2/10.3 op "valt uit: toetsweek". Lesdag-fout.
2. **Vwo 5, P9:** is verplaatst naar ma 23 nov, maar toetsles (8.1, 8.3) en model `vwo5-P9` hangen nog aan week 7-8, en 12.1/12.2 staan als gewone lessen. Ma 9 nov: 10.1 en 10.2 horen volgens het besluit van Frans uit te vallen.
3. **Vwo 4, PT1:** PTA geeft geen datum, studiewijzer zegt ma 9 nov, Lesdag ma 23 nov. Stuk en toonsoort verschillen (studiewijzer: Mo' Better Blues/C; Lesdag en checklist: Backwater blues/A).
4. **Vwo 6, T9 (2-10 nov):** de PTA noemt moderne pop (punk, disco, reggae, hiphop, EDM, four on the floor, streaming); geen les vóór T9 behandelt dat.
5. **Maandag 18 jan en ma 29 mrt (vrije dagen):** toetsen/lessen die er staan (mavo 4 T3 en P3, havo 4 T1 en P2, vwo 5 T5, havo 5 en vwo 4/5 lessen) horen op een andere dag of als uitval.
6. **Mavo 4:** model `p1-mavo4` hoort bij mavo 3 en hangt aan geen les; P3-inleverdatum loopt uiteen (PTA 22 jan, studiewijzer week 17, Lesdag 29 mrt); K8 en K9 staan na T3 in de lessen.
7. **Havo 3 en vwo 3, T1:** PTO zegt "herhaling alle behandelde thema's", Lesdag toetst alleen instrumenten/bands/orkesten; geen herkansbare toets terwijl de richtlijn er één eist.
8. **Privacy:** in de gedeelde klas-3-map staan cijferlijsten en een ingevulde toets met leerlingnaam. Niet geopend (op één per ongeluk geziene naam na, die staat nergens in de uitvoer); meld dit aan Frans voor opruiming.

## Cijfers van het controlescript (17 FOUT, 14 LET OP)

Verdeeld over klassen (zie de kop "Meldingen" per klas): mavo 4: 2 FOUT, 3 LET OP; vwo 4: 6 FOUT, 1 LET OP; vwo 5: 4 FOUT, 1 LET OP; havo 4: 2 FOUT; havo 5: 2 FOUT; vwo 6: 1 LET OP; BB1: 8 LET OP (w1-8, in het verleden); rest INFO. Per melding staat bij de klas wat de bron zegt en het oordeel.

Het script meldt nooit "lessen vanaf lesweek 10 zonder fasen" voor **tekstfasen** (fasen als string "15 min · ..." in plaats van object): havo 4 heeft er 61, vwo 6 43. Lesmodus toont dan weinig; de voorstellen voor havo 4 (27 lessen) en vwo 6 (18 lessen) werken een deel uit, de rest staat per klas als open lijst.


---

## Mavo 3

Bronnen: PTA = `S/bron/PTA_M3_2026-2027.txt` (muziek: r.892-939); basis = `lesdag-werk/pta-inhoud/public/data/basis.json` (leergangen.mavo3); beoord = `beoordeling.json`; data = `S/data/mavo3.json`; kalender = basis.json kalender/toetsweken; jaarplanning = `S/bron/jaarplanning.txt`.

**Mavo 3 staat niet in het PTO-overzicht.** In `pto_november.txt`, `pto_muziek_nov.txt` en `pto_oud.txt` komen voor muziek alleen h1-h3, m1, m2, v1, v3 voor (oud ook kb1, kg1, v2). Voor m3 geldt dus het PTA.

#### 1. Toetsentabel

| Toets | Soort | Weging | Duur (min) | Periode | Datum / week | Herkansbaar | Bron |
|---|---|---|---|---|---|---|---|
| **T1 Luistertoets begrippen** | theorie | PTA 15; basis 15; beoord: geen model (luistertoets in Musicbox) | PTA 45; basis niet genoemd (null) | PTA toetsweek TW3; basis toetsweek 3 | PTA: TW3 (geen datum). basis: ma 5 apr 2027, lesweek 28. Kalender: TW3 = 5-13 apr | PTA: ja, herkansing TW3. basis: null, herkansing leeg | PTA r.929-939; basis toetsen[T1] |
| **P1 Praktijk: muzikale presentaties** (gemiddelde van minimaal 3 praktijkdelen) | praktijk | PTA 15; basis 15; beoord: 3 modellen, elk "weging 15" | PTA 45; basis null | PTA toetsweek "nvt" (doorlopend); basis: eind jaar, in de les | PTA: uiterste inleverdatum 2 juli 2027. basis: ma 14 jun 2027, lesweek 36 (vaststellen cijfer). Presentaties lesweek 8, 19, 35 | PTA: ja, herkansing TW3. basis: null; beoord: true | PTA r.914-926; basis toetsen[P1]; beoord p1a, p1b, p1c |
| **H1 Handelingsdeel: loopbaanpresentatie** | handelingsdeel | PTA 0; basis: geen weging in het veld (week 1-tekst zegt 0) | PTA 0; basis niet genoemd | PTA toetsweek "nvt" | PTA: uiterste inleverdatum 2 juli 2027. basis: lesweek 37 (ma 21 jun), datum null, deadline null | PTA: nee. basis: week 1-tekst zegt "niet herkansbaar" | PTA r.908-912; basis handelingsdelen[H1] |
| T2 | - | PTA noemt T2 alleen in lopende tekst (r.896: "luistertoetsen (T1, T2)") | - | - | - | - | PTA: geen toetsblok T2; basis: geen T2 |

H2 (voorlichtingsavond 7 december 2026, PTA r.883-889) staat bij het vak vóór muziek en hoort niet bij muziek.

Verschillen (kort):
1. T1 duur en herkansing: PTA 45 min, ja, TW3. basis leeg (null). P1 duur 45 en herkansing TW3: basis leeg.
2. T1 stof: PTA beschrijft ritme, maat, tempo, toonhoogte, dynamiek, klankkleur (r.930-931). basis voegt "Oriëntatie op muziek in het werkveld" toe aan de T1-stof (toetsen[T1].stof). Dat staat in het PTA bij H1, niet bij T1.
3. Domeinen: PTA T1 K3/K7/K8/K9/V3 en P1 K2/K4/K5/K6; basis `domein` is leeg bij beide.
4. Beoordelingsmodellen hebben "weging 15" per presentatie; PTA: P1 weegt 15 in totaal (gemiddelde). Zie vraag 4.
5. PTA r.896 noemt luistertoetsen "T1, T2"; er is maar één toets (T1) in het PTA en in basis.
6. P1-datum: PTA geeft alleen de inleverdatum 2 jul 2027; basis zet P1 op 14 jun (lesweek 36). Geen tegenstrijdigheid, wel een ander soort datum.
7. beoordeling.json heeft voor mavo 3 geen model voor T1 en H1. Geen fout (luistertoets en handelingsdeel).

#### 2. Toets naar les-koppeling

**T1 (lesweek 28, ma 5 apr 2027).** Toetsles op lesweek 28 klopt met begin TW3 (5-13 apr). Lessen ervoor: week 21 Dynamiek, 22-23 Klankkleur, 24 Luisteren: begrippen, 25 Herhaling, 26 Oefentoets, 27 Laatste vragen. Ritme (3, 7, 9), maat (5, 9), tempo (15, 18) en toonhoogte (11, 13, 18) zitten er eerder in. Alle zes PTA-begrippen worden behandeld. Beoordelingsmodel: geen. Toetsles zelf heeft geen fasen (INFO van het script).
- PTA noemt voor T1 de domeinen K8 (Muziek en maatschappij) en K9 (Muziek en andere kunsten). K8 komt voor in les 20 en 33 (functies van muziek, in de docententekst). K9 komt in geen enkele mavo 3-les voor (alleen genoemd in les 1 als onderdeel van mavo 4). De PTA-T1-omschrijving zelf noemt geen K8/K9-stof, alleen de domeinlijst.
- PTA noemt "Master-/Trainerzboxen (zie leerlijn)": de lessen noemen alleen Trainers/Trainerz, geen Masterbox. Spelling in basis wisselt tussen "Trainers" en "Trainerz".

**P1 (presentaties les 8, 19, 35; vaststellen les 36).**

| Presentatie | Model | Gekoppeld aan | Voorbereiding |
|---|---|---|---|
| 1 zang (C'est la vie of Duurt te lang) | p1a-mavo3-zang | w6 leerling, w8 docent+scoreblad+leerling, w36 docent+scoreblad | w2 Zingen, w4 Oefenen, w6 Spelen met feedback; ritme/maat w3, w5, w7 |
| 2 akkoordinstrument (Go Tell It of eigen lied) | p1b-mavo3-akkoord | w17 leerling, w19 docent+scoreblad+leerling, w36 | w12, w14 Kerstbox, w16 Oefenen, w17 Meeluisteren |
| 3 slagwerk | p1c-mavo3-slagwerk | w34 leerling, w35 docent+scoreblad+leerling, w36 | w30 Basisgroove, w32 Ritme in lagen, w34 Meeluisteren |

Koppelingen kloppen met de lessen (formulieren staan in `materiaal`). Les 36 heeft geen fasen.
- PTA P1 noemt K2/K4/K5/K6, waaronder K5 **improviseren/componeren**. Geen mavo 3-les behandelt improviseren of componeren (geen treffer in alle lesteksten). PTA noemt K5, geen les behandelt K5.
- PTA: "Song-/Specialboxen (zie leerlijn)". Lessen gebruiken C'est la vie, Duurt te lang en de eigen kerstbox Go Tell It. Een Specialbox komt niet voor.
- Eigen controle modellen: som wegingen p1a 8, p1b 9, p1c 9; cijfertekst deelt door 8, 9, 9. Klopt. Alleen p1a en p1b noemen een plafond per niveau; p1c niet (vraag 6).

**H1 (lesweek 37, ma 21 jun; wo 23 jun begint TW4; PTA-inleverdatum 2 jul 2027).** Voorbereiding: les 20 Muziek in het werkveld, les 33 Loopbaanpresentatie: opzet. Les 37 heeft één fase "De vorm volgt nog". Geen beoordelingsmodel. PTA zegt "Presentatie"; besluit Frans (4 nov): niet voor de klas.

#### 3. Meldingen uit het controlescript voor mavo 3

Rapport 8 nov: 0 FOUT, 0 LET OP, 2 INFO.

| # | Melding (ingekort) | Wat de bron zegt | Oordeel | Voorstel |
|---|---|---|---|---|
| 1 | INFO ma 5 apr, week 28: toetsles "Toetsweek 3: T1 Luistertoets begrippen" heeft geen fasen | PTA r.929-932: T1 is een luistertoets, 45 min, in TW3 | geen echte fout (toetsles) | Eventueel één fase "T1 maken" met de toetsafspraken (Musicbox, koptelefoon); niet nodig |
| 2 | INFO ma 14 jun, week 36: toetsles "P1: praktijkcijfer vaststellen ... inhaalpresentaties" heeft geen fasen | PTA r.914-926: P1 is het gemiddelde van de praktijkdelen; inhaalmoment staat niet in het PTA | geen echte fout, wel een leeg lesuur | Fasen voor inhaalpresentaties in groepjes voor de docent; zie vraag 5 (niet uitgewerkt) |

#### 4. Lessen zonder fasen of "Nog in te vullen" die nog moeten komen (lesweek ≥ 10)

"Nog in te vullen" komt in mavo 3 niet voor. Alle theorie- en praktijklessen hebben fasen.

| Lesid | Lesweek / datum | Titel | Reden |
|---|---|---|---|
| mavo3:10.1 | 10, ma 9 nov | Valt uit: activiteitenweek A (profielkeuzeweek) | uitval |
| mavo3:28.1 | 28, ma 5 apr | Toetsweek 3: T1 Luistertoets begrippen | toetsles |
| mavo3:29.1 | 29, ma 12 apr | Toetsweek 3 | toetsweek |
| mavo3:31.1 | 31, ma 10 mei | Valt uit: meerdaagse excursie m3 | uitval |
| mavo3:36.1 | 36, ma 14 jun | P1: praktijkcijfer vaststellen ... inhaalpresentaties | toetsles |
| mavo3:38.1 | 38, ma 28 jun | Toetsweek 4 | toetsweek |
| mavo3:37.1 | 37, ma 21 jun | Loopbaanopdracht H1 (vorm nog vaststellen) | wel een fase, maar alleen "De vorm volgt nog." |

Alleen mavo3:37.1 is uitgewerkt, in `mavo3-voorstel.json`. De rest is uitval, toetsweek of toetsles. Verleden: geen lege lessen.

#### 5. Tegenstrijdigheden en vragen aan Frans

1. **P1: alle drie of één kiezen?** PTA r.916-917 "zang/melodie of akkoord instrument/slagwerk" en r.924-925 "zang/melodie óf akkoordinstrument óf slagwerk", maar ook "Praktijkdelen (minimaal 3)". Lesdag laat elke leerling alle drie doen. Dat past bij "minimaal 3", maar "óf" kan een keuze betekenen. Bevestigen.
2. **P1-herkansing in TW3.** PTA: P1 herkansbaar, herkansweek TW3 (5-13 apr). Presentatie 3 is in lesweek 35 (juni), cijfer in week 36, dus ná TW3. In TW3 zijn alleen presentatie 1 en 2 te herkansen. Hoe werkt herkansing van presentatie 3 (inhaalmoment week 36?)
3. **T1-herkansing in dezelfde toetsweek.** PTA: T1 in TW3 en herkansing TW3. Jaarplanning noemt herkansdagen in week 15, 24 en 32 (`jaarplanning.txt` r.255-257), geen dag in TW3. Wanneer is de T1-herkansing?
4. **Weging 15 per presentatie in de modellen**; P1 is 15 in totaal (PTA r.915). Label laten staan of aanpassen?
5. **Les 36 (14 jun)**: inhaalpresentaties plus cijfer vaststellen heeft geen fasen. Gewenste indeling?
6. **p1c (slagwerk) mist de plafondtekst per niveau** die p1a en p1b hebben. Bewust of vergeten?
7. **T2 in PTA-tekst** (r.896). Alleen T1 bestaat. Foutje in het PTA, of komt er een T2?
8. **K5 (improviseren/componeren)** bij P1 en **K9** bij T1 komen in geen mavo 3-les voor. Bewust (komt in mavo 4)?
9. **T1-stof in basis** bevat "Oriëntatie op muziek in het werkveld"; de PTA-T1-omschrijving niet (hoort bij H1). Klopt dat?
10. **Masterboxen**: PTA T1 noemt "Master-/Trainerzboxen"; lessen gebruiken alleen Trainers.
11. **H1-vorm.** PTA r.909-910: "Presentatie op welke manier muziek een rol speelt in het werkveld". Besluit 4 nov: niet voor de klas. Voorstel in `mavo3-voorstel.json` (groepjes voor de docent); duur en vorm staan niet in het PTA.
12. **Les 37 valt in TW4** (TW4 begint wo 23 jun, loopt tot 2 jul). H1-inleverdatum 2 jul: inhaal in week 38 kan nog.
13. **Mavo 3 staat niet in het PTO-overzicht** (november en oud): geen PTO-controle mogelijk; PTA is de enige bron.
14. **Jaarplanning-datums** voor TW3/TW4 m3 (`jaarplanning.txt` r.245, 253) zijn serienummers van een jaar eerder (2026); de weken (28/29, 37/38) kloppen met Lesdag. Alleen melden.


---

## Mavo 4

Bronnen (afkortingen):
- PTA = `S/bron/PTA_M4_2026-2027.txt`, regel 1869-1971 (blok "Klas m4, Vak Muziek"; de kolommen staan in de pdf-tekst door elkaar, zie vraag 6).
- SW = `Studiewijzer_Muziek_mavo4.docx` (sectiemap, `02 Keuzevak muziek/Mavo/Mavo 4/00 PTA, studiewijzer en planning/`), uitgepakt naar `S/bron/m4sw/sw.txt`.
- basis = `lesdag-werk/pta-inhoud/public/data/basis.json`, `leergangen.mavo4` (toetsen, weken) en `kalender`/`vrijeDagen`/`toetsweken`.
- beo = `public/data/beoordeling.json` (modellen p1-mavo4, p2-mavo4, p3-mavo4).
- PTO (`pto_muziek_nov.txt`) bevat geen regels voor mavo 3 of mavo 4 muziek. Voor klas 4 is de PTA de bron.

#### 1. Toetsentabel

| Toets | Soort | Weging PTA / basis / beo / SW | Duur PTA / basis | Periode (PTA) | Datum basis | Herkansbaar PTA / basis / beo | Verschil |
|---|---|---|---|---|---|---|---|
| T3 Examengerichte luistertoets (proefexamen) | theorie | 20 / 20 / — / SW noemt "Luistertoets 2" (T2): 30 | 90 / — | TW2 | ma 18 jan 2027 (week 18) | ja, TW2 / — / — (SW: ja, herkansing T2 di 9 mrt) | Duur en herkansbaar ontbreken in basis. Datum is vrije dag. SW wijkt af in naam (T2), weging (30) en herkansing (9 mrt, niet TW2). |
| P2 Examenconcert | praktijk | 40 / 40 / 40 / SW: 30 | 135 / — | uiterste datum 01-03-2027 ("vóór 1 maart") | ma 15 feb 2027 (week 22 les 1); "datum nog vastleggen" | nee / — / nee (SW: geen herkansing genoemd) | Duur ontbreekt in basis. SW: weging 30 in plaats van 40. SW plaatst het concert in week 22 les 2, basis in les 1. |
| P3 Eindopdracht muziek en andere kunst | praktijk (PTA: soort P) | 10 / 10 / 10 / SW: 10 ("V1") | 30 / — | "Per.3 in les", uiterste inleverdatum 22-01-2027 | ma 29 mrt 2027 (week 27), vrije dag | nee / — / nee | **Datum:** PTA 22 jan 2027, SW week 17 (12-16 jan, "inleveren januari"), basis 29 mrt. Duur ontbreekt in basis. |
| P1 Praktijkbeoordeling | praktijk | 10 (rij met cursus 2025-2026) / — / 15 (model p1-mavo4) / — | 135 / — | nvt, herkansing TW3 | — | ja (TW3) / — / ja | P1 staat in de PTA-m4 (cijfer = gemiddelde van de praktijkdelen van leerjaar 3), niet in basis mavo4, wel als beo-model "mavo 4". Weging 10 (PTA) tegen 15 (beo en basis meta). |
| T1 Luistertoets | theorie | 10 (cursus 2025-2026) / niet in mavo4 (wel mavo3: 15) | 45 / — | TW3, herkansing TW3 | mavo3: ma 5 apr 2027 | ja / — | PTA-m4: 10, basis mavo3: 15. Zie vraag 4. |
| T2 Luistertoets | theorie | 10 (cursus 2025-2026) / — / — | 90 / — | TW4, nee | — | nee | Staat in PTA-m4, in geen enkele Lesdag-klas (mavo3 en mavo4 hebben geen T2). Zie vraag 4. |
| H1 Messiah! | handelingsdeel | 0 | 120 (?) / — | nvt, uiterste datum 04-04-2027 (?) | 12 mrt 2027 (week 24) | nee / — | Duur en uiterste datum in PTA ("120", "04-04-2027") lijken bij H1 en H2 te horen maar de tekst is door elkaar. SW noemt Messiah als H3 in week 25 (15-19 mrt), basis zet 12 mrt (week 24). |
| H2 Concertbezoek | handelingsdeel | 0 | 120 (?) / — | nvt, uiterste datum 04-04-2027 (?) | geen datum, geen deadline | nee / — | basis heeft geen datum en deadline. SW noemt het H4 (concertbezoek nabespreken week 27, 30 mrt-2 apr). |
| Sectorwerkstuk en loopbaanopdracht | handelingsdeel (alleen SW) | — | — | — | — | — | SW: "voldaan" onderdelen naast Messiah en concertbezoek. PTA-m4 muziek en basis noemen ze niet. Zie vraag 7. |

Weging mavo 4 in PTA: T3 20 + P2 40 + P3 10 = 70 (past bij "mavo 4 telt voor 70% van het SE"). SW: 30 + 30 + 10 = 70. Basis: 20 + 40 + 10 = 70. Mavo 3 volgens PTA-m4: P1 10 + T1 10 + T2 10 = 30. Volgens basis mavo3: P1 15 + T1 15 = 30.

beo en basis zijn onderling gelijk voor weging P2 (40) en P3 (10). beo: p2-mavo4 en p3-mavo4 "herkansbaar nee", gelijk aan de PTA.

#### 2. Toets → les-koppeling

**T3** (basis week 18 les 1, ma 18 jan)
- Toetsles staat in toetsweek 2 (basis `toetsweken.mavo4` n2: 18-26 jan). 18 jan staat in `vrijeDagen`. Het exacte tijdstip van T3 in TW2 is niet bekend (rooster TW2 nog niet in de bronnen).
- Geen beoordelingsmodel (luistertoets, geen model nodig). Geen herkansing in de leergang; PTA: herkansing in TW2, kalender: "di 9 mrt herkansingen PTA" (week 24), SW: herkansing T2 9 mrt.
- Voorbereiding: les 1 van week 1-17 (examenvorm, begrippen K3 a t/m q, week 16 "Herhaling begrippen K3", week 17 "Oefenexamen in Facet-stijl"). Masterbox klankkleur/instrumenten (week 6-7) en Trainerz (week 16) worden genoemd, zoals de PTA vraagt.
- **Ontbrekende of verkeerd geplaatste stof:** PTA noemt K7, K8, K9 en V3 voor T3 ("brede toets over de volledige begrippenlijst, instrumenten en muzikale middelen in samenhang"). basis zegt bij T3 alleen K3 en K7 (syllabus a-q, zonder s en t). K8 (muziek en maatschappij, les 20 en 21 = week 20-21) en K9 (muziek en andere kunsten, les 23 en 24 = week 23-24) worden pas ná T3 behandeld. Geen les vóór T3 behandelt dus s en t.
- SW plaatst K8/K9-lessen ook na TW2 (week 21 en 22) en noemt TW2 "alle begrippen uit de syllabus".

**P2** (basis week 22 les 1, ma 15 feb)
- Model p2-mavo4 gekoppeld aan week 1 les 2 (leerling), 17 les 2 (leerling), 21 les 2 (leerling), 22 les 1 (docent en scoreblad), 22 les 2 (leerling). Criteria in het model (techniek en beheersing, timing en ritme, dynamiek en articulatie; samenspel en samenwerking; presentatie en organisatie) komen overeen met de PTA-omschrijving. Klopt.
- Voorbereiding: weken 1-21 les 2 (repertoire, repetities 1-9, doorloop 1 en 2, organisatie in week 5 en 12, draaiboek week 16, generale week 20 en 21). Dekt K4, K5 en K6 en de organisatie. Improviseren/componeren (K5) komt niet expliciet voor in de lestitels; zie vraag 8.
- Datum "vóór 1 maart" (PTA, uiterste datum 01-03-2027). 15 feb is een maandag; 17 feb Sing-In, 18 feb De Doelen, 19 feb extra vrije dag (kalender-events week 22). SW zet P2 in week 22 les 2.
- Duur 135 min (PTA) komt nergens in basis voor; de lestijd is 45 min.

**P3** (basis week 27 les 1, ma 29 mrt)
- Model p3-mavo4 aan week 23 les 2, 25 les 2, 26 les 2 (leerling) en 27 les 1 (docent, scoreblad, leerling). Week 24 les 2 ("Eindopdracht: onderzoek") heeft geen model-koppeling: klein gat.
- Datum: zie tabel (PTA 22 jan, SW januari, basis 29 mrt). Als de PTA klopt, ligt het onderzoek (lessen week 23-26) ná de inleverdatum.
- Stof PTA: onderzoek en presentatie over muziek in relatie tot ten minste één andere kunstvorm, inclusief presentatie van een muziekstuk voor een ander publiek dan de muziekklas (MU/V/1, K9, K2). Les 23 l1 (Muziek en andere kunsten), 23 l2 (opdracht en kunstvorm), 24 l1 (musical en film), 24 l2 (onderzoek), 25 l2 (uitwerken), 26 l2 (afronden) dekken K9 en de opzet. "Ander publiek dan de muziekklas": staat in les 23 l2 en in het model ("Muziekstuk voor publiek"), maar geen les plant waar en wanneer dat publiek er is. Zie vraag 9.
- Duur 30 min (PTA) niet in basis.

**P1** (beo p1-mavo4): zie punt 3.

**Handelingsdelen:** H1 Messiah in Leiden (12 mrt, week 24) heeft geen les; H2 heeft geen les en geen datum.

#### 3. Meldingen controlescript voor mavo 4

| # | Melding (ingekort) | Wat de bron zegt | Oordeel | Voorstel |
|---|---|---|---|---|
| 1 | FOUT ma 18 jan, week 18: toets T3 staat op een vrije dag | `basis.json` `vrijeDagen` bevat 2027-01-18 en `toetsweken.mavo4` n2 begint 18 jan. PTA: alleen "TW2", geen dag. | Lesdag-fout (datum), dag zelf niet vast te stellen | Datum van T3 leeg laten of op de eerste schooldag van TW2 zetten (di 19 jan) zodra het TW2-rooster er is. |
| 2 | FOUT ma 29 mrt, week 27: toets P3 staat op een vrije dag | 29 mrt is tweede paasdag (kalender-event week 27). PTA: P3 uiterste inleverdatum 22-01-2027, "Per.3 in les". SW: week 17, "inleveren januari". | Lesdag-fout én bron-tegenstrijdigheid | Pas na antwoord van Frans aanpassen (vraag 1). Als maart blijft: verplaats naar di 30 mrt of week 27 les 2. |
| 3 | INFO T3, P2, P3: toetsles zonder fasen | Dit zijn toetsen, geen lessen met inhoud. | Geen echte fout | Bewust leeg laten. |
| 4 | LET OP model p1-mavo4 is aan geen les gekoppeld | beo: `lessen: []`. PTA-m4: P1 is een mavo 3-cijfer (gemiddelde van de praktijkdelen leerjaar 3). | Lesdag-fout: model hoort niet bij mavo 4 | Model p1-mavo4 verwijderen of verplaatsen naar mavo 3 (daar bestaan al p1a/p1b/p1c-mavo3). Vraag 3. |
| 5 | LET OP model p1-mavo4 is voor toets P1, die klas heeft geen toets P1 | basis mavo4 heeft T3, P2, P3. PTA-m4 noemt P1 wel, onder cursus 2025-2026. | Lesdag-fout (wees-model) | Zelfde als 4. |
| 6 | LET OP regel-klas: leerlingen voor de klas (onderdelen.stuk): "voor de klas" | Model p1-mavo4, groep "Presenteren": "voor de klas". Afspraak: leerlingen presenteren nooit voor de klas. | Lesdag-fout | Vervalt als model wordt verwijderd; anders "in groepjes voor de docent". |

#### 4. Lessen zonder fasen of met "Nog in te vullen" die nog moeten komen (≥ ma 9 nov 2026, lesweek ≥ 10)

Geen les in mavo 4 heeft nog "Nog in te vullen" (0 treffers in de weken-JSON). Alle theorie- en praktijklessen van week 1 t/m 30 hebben fasen (3 tot 5 fasen, steeds 45 minuten, formatief en criteria aanwezig). Lessen zonder fasen zijn uitsluitend:

| Lesid | Titel | Reden |
|---|---|---|
| mavo4:10.1 en mavo4:10.2 | Valt uit: toetsweek 1 en activiteitenweek A | Uitval (week 10 = 9-13 nov) |
| mavo4:18.1 | Toetsweek 2: T3 Examengerichte luistertoets (proefexamen) | Toetsles |
| mavo4:18.2, 19.1, 19.2 | Toetsweek 2 | Toetsweek |
| mavo4:22.1 | P2: Examenconcert | Toetsles |
| mavo4:27.1 | P3: Eindopdracht muziek en andere kunst (inleveren) | Toetsles |
| mavo4:28.1, 28.2, 29.1, 29.2 | Toetsweek 3 (28: "geen muziektoets") | Toetsweek |

In het verleden (week 9, ma 2 nov): mavo4:9.1 en 9.2 (toetsweek 1, geen muziektoets), geen fasen nodig.

Voorstelbestand: geen lessen uit te werken. `S/uit/mavo4-voorstel.json` bevat daarom een lege `lessen` en alleen de uitleg. De bestaande bestanden `tools/inhoud-mavo4-theorie.json` (27 lessen) en `inhoud-mavo4-praktijk.json` (17 lessen) zijn al in basis.json verwerkt. Eén sleutel in `inhoud-mavo4-praktijk.json` heet "Tussenstand: voorspelen met feedback", terwijl de les in basis nu "Tussenstand: meeluisteren met feedback" heet. Draait iemand `merge-inhoud.js` opnieuw, dan sluit die sleutel niet aan op de lestitel; de oude sleutel is verouderd.

#### 5. Tegenstrijdigheden en vragen aan Frans

1. **Inleverdatum P3.** PTA: uiterste inleverdatum 22-01-2027 ("Per.3 in les"). SW: "Eindopdracht inleveren" week 17 (12-16 jan, "V1 – Eindopdracht (10%)"). Basis: lesweek 27, ma 29 mrt (vrije dag), met onderzoeks- en uitwerklessen in week 23-26. Welke datum geldt? Zijn de lessen 23-26 dan te laat?
2. **Naam en weging T3.** PTA: T3, 20%, 90 min, herkansbaar in TW2. SW: "Luistertoets 2" (T2), 30%, herkansing di 9 mrt (week 24). Basis: T3 20%, geen duur, geen herkansing. Kloppen de PTA-getallen (20 en herkansing TW2), en is de herkansing 9 mrt in de kalender ("herkansingen PTA")? Zie ook P2: PTA 40%, SW 30%.
3. **Model p1-mavo4.** Hoort P1 bij mavo 3 (PTA-m4: cijfer uit leerjaar 3)? Dan weg uit mavo 4. Weging in het model is 15, in PTA 10.
4. **Mavo 3: T1 en P1.** PTA-m4 toont voor leerjaar 3: P1 10, T1 10, T2 10 (T2 in TW4, 90 min, niet herkansbaar). Lesdag mavo 3 heeft P1 15 en T1 15 en geen T2. Welke wegingen zijn juist en bestaat T2 in mavo 3? (Buiten deze opdracht voor mavo 4, maar de som 30% hangt eraan.)
5. **T3-stof.** PTA noemt K3, K7, K8, K9 en V3; Lesdag-T3 noemt alleen K3 en K7 (syllabus a-q). K8 (week 20-21) en K9 (week 23-24) staan ná TW2. Bedoelt de PTA dat de stof voor TW2 K8/K9 al omvat, of moeten die lessen vóór januari komen?
6. **PTA-tekst door elkaar.** In de pdf-tekst staan H1/H2 (nvt, 0, nee, 120 min, 04-04-2027) en P1/P2 (135 min, 01-03-2027) door elkaar. Kloppen de uiterste datum 04-04-2027 voor H1/H2 en 120 minuten? Dat blijft onzeker zonder de pdf zelf te bekijken.
7. **Sectorwerkstuk en loopbaanopdracht** staan in de SW als "voldaan" onderdelen, niet in PTA-muziek en niet in Lesdag. Horen die bij muziek?
8. **Improviseren/componeren (K5)** is domein van P2 volgens PTA. Geen lestitel behandelt het; de repetitielessen noemen het niet. Bedoeld, of moet er een improvisatie-onderdeel in de repetities?
9. **P3-publiek.** PTA vereist een muziekstuk voor een ander publiek dan de muziekklas. Welk publiek en welke week? Er staat niets over in de planning.
10. **Messiah-datum en H2.** Basis: Messiah Leiden vr 12 mrt (week 24, vrije dag). SW: week 25 (15-19 mrt). Concertbezoek heeft geen datum. Welke klopt?
11. **TW1.** SW: week 9 "CE-oefentoets", voortgangstoets, telt niet mee. Basis: "geen muziektoets". Gaat de oefentoets door in de les?
12. **CE-datum.** Basis week 30: "wat moet je nog doen tot 14 mei". SW: CE medio mei, week 32 (18-21 mei), "zie rooster". De leergang stopt na week 30.
13. **Volgorde onderwerpen.** SW zet samenklank in week 6 en klankkleur in week 11-12; Lesdag klankkleur in week 6-7 en samenklank in week 11. Geen PTA-eis, alleen de SW wijkt af. Welke volgorde houdt Frans aan?
14. **Model p3-mavo4** is niet gekoppeld aan week 24 les 2 (onderzoek). Voorstel: toevoegen.


---

## Havo 3

Alleen gelezen, niets aangepast. Geen leerlingnamen opgenomen.

Bronnen (S = scratchpad):
- PTO-nov = `S/bron/pto_muziek_nov.txt` r.5-6 (h3) en `S/bron/pto_november.txt` r.93-94. PTO-oud = `S/bron/pto_oud.txt` r.95-97.
- PTO-richtlijnen = `PTO-richtlijnen 26-27.docx` (tekst: `S/bron/ptorichtlijnen.txt`, regelnummers hieronder).
- Vakwerkplan = `Vakwerkplan_Muziek_2026-2027.docx` (tekst: `S/bron/vwp2627.txt`).
- basis.json = `lesdag-werk/pta-inhoud/public/data/basis.json` > `leergangen.havo3`; beoordeling.json = zelfde map.
- Klas-3-map = `Sectie Muziek/01 Onderbouw muziek/03 Klas 3`.
- Er is geen PTA-pdf voor havo 3; havo 3 valt onder het PTO (onderbouw).

#### 1. Toetsentabel

Het PTO noemt alleen periode, geen datum of week. De datum in Lesdag is dus een eigen planning. Lesweek 19 is maandag 25 jan 2027 (kalender: wk 4), lesweek 29 is maandag 12 apr 2027 (wk 15).

| Veld | PTO-nov (r.5-6) | basis.json | beoordeling.json | Verschil |
|---|---|---|---|---|
| **P1** naam | "Presentatie Lied of Speelstuk" | "Presentatie lied of speelstuk" | model-titel "PTO P1: presentatie kerstlied" | geen echt verschil (model noemt het lied) |
| soort | praktijktoets (P) | praktijk | praktijkmodel | gelijk |
| weging | 10 | 10 | 10 | gelijk |
| duur | 45 | 45 | n.v.t. | gelijk |
| periode | Per.2 | blok P2 (lesweek 11-20) | n.v.t. | gelijk |
| datum, week | niet genoemd | ma 25 jan 2027, lesweek 19 | model aan lesweek 16-20 gekoppeld | datum is Lesdag-keuze |
| herkansbaar | nee (0), herkansweek "-" | false | false | gelijk |
| **T1** naam | "Herhaling alle behandelde thema's" | zelfde titel; `stof`: "Instrumenten, bands en orkesten: ..." | geen model | **titel en stof verschillen** (zie punt 2) |
| soort | theorietoets (T) | theorie | n.v.t. | gelijk |
| weging | 10 | 10 | n.v.t. | gelijk |
| duur | 45 | 45 | n.v.t. | gelijk |
| periode | Per.3 | blok P3 (lesweek 21-30) | n.v.t. | gelijk |
| datum, week | niet genoemd | ma 12 apr 2027, lesweek 29 | n.v.t. | Lesdag-keuze; `waar` zegt nog "periode 3 (week nog kiezen)" terwijl week 29 al staat |
| herkansbaar | nee (0) | false | n.v.t. | gelijk (periode 3 mag volgens richtlijn niet herkansbaar zijn: PTO-richtlijnen r.95) |
| **Songbox 1** (geen PTO-toets) | —  | geen toets in `toetsen` | model `songbox1-klas3`, weging 1, geen veld herkansbaar, aan lesweek 8 gekoppeld | model zonder toets in PTO of basis.json (zie punt 5, vraag 4) |
| **P2 "Eurovision" en P1 "Bouw Barok"** | alleen PTO-oud (r.95-96); in PTO-nov weg | — | — | oude PTO had 3 toetsen (P1 herkansbaar), nu 2; Lesdag volgt de nieuwe |

Overige afspraken getoetst aan de richtlijnen (`ptorichtlijnen.txt`):
- Minimaal 1 herkansbare toets per leerjaar (r.94): havo 3 heeft er **geen**. Praktijk mag niet herkansbaar (r.96) en periode 3 ook niet (r.95), dus het kan met deze opzet niet. Het Vakwerkplan erkent dat (r.937: "sluit nog niet helemaal aan", actiepunt 3, r.747).
- Duur klas 3: richtlijn noemt 90 min als maximum (r.47 en r.85, toetsweek aan het eind van het jaar). 45 min in de les mag.
- PTO-omschrijving: de richtlijn eist vormsoort, leerdoel met verwijzing naar methode, toelichting en hulpmiddelen (r.15-19). Bij h3 zijn omschrijving, leerdoel en toelichting leeg (alleen titel, `pto_muziek_nov.txt` r.5-6).
- Toetsweek havo 3: 29 jun-6 jul 2027 (basis.json `toetsweken.havo3` n=4; jaarplanning-blad Toetsweken r.38 "TW - h3"). Daar staat geen muziektoets.

#### 2. Toets naar les-koppeling

**P1 (praktijk, kerstbox Mary's Boy Child)**
- Toetsles: `havo3:19.1`, week 19, ma 25 jan, titel "P1: Presentatie lied of speelstuk", `toets: P1`. Week en datum kloppen met de kalender.
- Model `p1-klas3-waymaker` (id is misleidend: thema is het kerstlied, Way Maker is pas periode 3). Gekoppeld: w16 leerling, w17 docent+leerling, w18 leerling, w19 docent+scoreblad+leerling, w20 docent+scoreblad. Weging van de zes criteria telt op tot 10 en het formulier zegt "deel door 10". Klopt.
- Voorbereiding: `havo3:11.1` (Mary's Boy Child leren kennen), 12.1 (akkoorden en partijen niveau 1), 13.1 (groepen en samenspel), 14.1 (opbouw en dynamiek), 15.1 (doorspelen en opnemen), 16.1 (oppakken, beoordeling P1 bespreken), 17.1 (tussenstand, meeluisteren met feedback), 18.1 (laatste repetitie en eigen reflectie). Na de toets: 20.1 (terugblik, peerfeedback).
- Formatieve toets vooraf (richtlijn r.82): w17 (meeluisteren, voorlopige scorekolom) en w18 (checklist leerlingblad). Aanwezig.
- Stof: het PTO zegt alleen "Lied of Speelstuk". Mary's Boy Child zit in w11-w18. De variant "speelstuk" bestaat alleen als leerlingblad in de klasmap (`Speelstuk afronden - leerlingblad havo 3.docx`); in de lessen is alleen het kerstlied uitgewerkt. Geen les behandelt een ander speelstuk.
- Materiaal in sectiemap aanwezig: pptx's 11-16 voor Mary's Boy Child (map `Lessen 2026-2027`), P1-formulieren, melodiebladen, video's. Alle 126 SharePoint-links van de vier klassen wijzen naar bestaande bestanden.
- Toetsles w19 heeft geen fasen (zie punt 3).
- Rooster: lesweek 16 (maandag 4 jan = studiedag) en lesweek 18 (maandag 18 jan = ontwikkeldag secties, leerlingen vrij) beginnen met een vrije dag. Lesdag kent de lesdag per groep niet (`lesdagen: null`). Valt de les van een groep op maandag, dan vervalt een van de laatste drie repetities. Dit staat wel als notitie in `event`, niet als uitval.

**T1 (theorie)**
- Toetsles: `havo3:29.1`, week 29, ma 12 apr (event: vr 16 apr Sing-In). Geen fasen, geen criteria, geen materiaal, geen `benodigd`.
- Geen beoordelingsmodel; T1 is een Musicbox-toets met Toetsinstructie (staat bij w28). Dat is consistent: er is ook geen model nodig.
- Voorbereiding: w21 snaarinstrumenten, w22 hout- en koperblazers, w23 slagwerk/toetsen/elektronica, w24 symfonieorkest, w25 bands en ensembles (incl. "Begrippenlijst T1 aanvullen"), w27 rollen in band en orkest, w28 oefentoets (formatief) en herhaallijst met Trainerz. w26 valt uit (activiteitenweek D).
- Stof PTO ("alle behandelde thema's") tegen stof Lesdag (instrumenten, bands, orkesten): **PTO noemt alle behandelde thema's, geen les zegt dat songbox 1 (C'est la vie, w1-8), de kerstbox (w11-18) of Way Maker (w21-27) in T1 komen.** Alleen het instrumentendeel wordt formatief geoefend. Het Vakwerkplan zegt hetzelfde als Lesdag: het theoretische deel over instrumenten, bands en orkesten "wordt afgesloten met een PTO-toets" (vwp r.357) en de titel moet "instrumenten, bands en orkesten" worden (r.747, actiepunt 3). Dat is voor 2027-2028; nu staat in het PTO nog de brede titel. Tegenstrijdig, melden.
- Twee kandidaat-toetsen in de sectiemap: (a) `T1 Theorietoets - Herhaling thema's/Instrumenten toets/` (toets "Instrumenten klas 3", 28 punten, infoblad, 19 geluidsfragmenten 01-19.mp3) en (b) `Luistertoets alle periodes/LUISTERTOETS klas 3 - Behandelde Songs` met Begrippenlijst 3e klas (mineur/majeur, tempo, articulatie, modulatie ... uit oudere songs: o.a. Make you feel, Scarborough Fair, Mary did you know, Pachelbel). Lesdag wijst naar (a). Welke geldt voor 2026-2027 staat nergens vast (vraag 1).
- Lesdag w28 noemt "Begrippen van periode 3" en "Begrippenlijst T1 aanvullen" (w25): welke begrippenlijst bij instrumenten hoort, is niet te vinden. De bestaande Begrippenlijst 3e klas gaat over andere stof.
- Toetstijd: toetsles w29 is niet uitgewerkt, dus niet te toetsen aan "toetstijd klopt met de werkelijkheid" (richtlijn r.88).

#### 3. Meldingen controlescript voor havo 3 (rapport 8 nov, r.80-84)

| Melding | Wat de bron zegt | Oordeel | Voorstel |
|---|---|---|---|
| INFO ma 25 jan, wk 19: toetsles "P1: Presentatie lied of speelstuk" heeft geen fasen | basis.json `havo3` w19: type toets, geen `fasen`, wel materiaal (3 formulieren). BB1 heeft wel fasen op zijn toetslessen (bb1 w17: 5/35/5 min) | geen echte fout; Lesdag-lacune (lesmodus toont niets) | Optioneel fasen in de vorm van BB1 w17: stemmen en inspelen 5, per groep langskomen 35, zelfbeoordeling 5 (3 min strookje). Niemand speelt voor de klas. Niet uitgewerkt (toetsles) |
| INFO ma 12 apr, wk 29: toetsles "T1: Herhaling alle behandelde thema's" heeft geen fasen | idem, zonder materiaal | geen echte fout; Lesdag-lacune | Optioneel fasen naar bb1 w19 (inloggen Musicbox, toets, papieren back-up). Niet uitgewerkt |

Geen FOUT- of LET OP-meldingen voor havo 3.

#### 4. Lessen zonder fasen die nog moeten komen (≥ ma 9 nov 2026)

| lesid | titel | opmerking |
|---|---|---|
| havo3:19.1 | P1: Presentatie lied of speelstuk | toetsles, bewust leeg |
| havo3:29.1 | T1: Herhaling alle behandelde thema's | toetsles, bewust leeg |
| havo3:10.1, 26.1, 30.1 | Valt uit: activiteitenweek A / D / burgerschapsweek | uitval |
| havo3:38.1 | Toetsweek havo 3 | geen toets gepland |

Geen les met "Nog in te vullen". Verleden: geen. Alle andere lessen (w11-w18, w20-w25, w27-w28, w31-w37) hebben fasen van samen 45 min. Er is dus geen voorstel-bestand gemaakt (`havo3-voorstel.json` ontbreekt bewust). Eerdere uitwerkingen (`inhoud-klas3`, `inhoud-kerst-klas3`, `inhoud-waymaker`) zijn al in basis.json opgenomen.

Open punt in uitgewerkte lessen: w31 "Songbox 2 kiezen en partijen leren" en w32-w34 hangen aan een songbox die nog niet gekozen is (`meta.bron`: "songbox nog kiezen").

#### 5. Tegenstrijdigheden en vragen aan Frans

1. **T1-inhoud.** PTO: "Herhaling alle behandelde thema's". Vakwerkplan en Lesdag: instrumenten, bands en orkesten. Sectiemap heeft twee toetsen (Instrumenten toets, en een oude luistertoets "Behandelde songs"). Welke toets en welke stof telt voor 2026-2027? Moet het PTO-titel nu al aangepast worden?
2. **Herkansing.** Havo 3 heeft geen herkansbare toets, de richtlijn eist er minstens een en alleen schriftelijk (r.94, r.96). Vakwerkplan r.937 geeft aan dat dit pas voor 2027-2028 geregeld wordt. Blijft het zo dit jaar?
3. **PTO-omschrijving.** h3 heeft alleen een titel, geen omschrijving, leerdoel, toelichting of hulpmiddelen (richtlijn r.17-22). Aanvullen in web.csgpm.nl?
4. **Songbox 1.** Model `songbox1-klas3` heeft weging 1 ("Eén punt voor de kerstbox"), maar staat niet in het PTO en niet in `toetsen`. Waar gaat dit cijfer naartoe, en is het een voortgangstoets?
5. **Model-id.** `p1-klas3-waymaker` is het kerstlied-model; hernoemen kan verwarring met Way Maker voorkomen. Alleen een voorstel, niet gewijzigd.
6. **Lesdag per groep.** Vrije maandagen in lesweek 16 (4 jan) en 18 (18 jan), tweede paasdag in 27 (29 mrt) en pinksterdag in 32 (17 mei). Op welke dag hebben h3a-h3d muziek? Dan kan Lesdag uitval per groep tonen.
7. **Songbox 2** (periode 4): welke song?
8. **Keuzeuur en gewone havo 3.** `kmu3.meta.bron` zegt dat de gewone havo 3-klassen rond de meivakantie stoppen, maar havo3 heeft lessen in lesweek 31-37. Wat klopt? (Zie ook kmu3.md.)
9. **Privacy gedeelde map.** In de klas-3-map staan ingevulde bestanden: `Songbox 1 periode 1/cijfer-invoer-h3a..d.xlsx`, `v3a/v3b scoreblad.csv`, `*reserve*.json`, en in de T1-map een ingevulde Instrumenten-toets met leerlingnaam (bij het openen van de toets-tekst per ongeluk gezien; naam en cijfer niet overgenomen of geciteerd). De xlsx/csv/json-bestanden zijn niet geopend. De sectiemap is met collega's gedeeld. Verplaatsen naar een eigen map?


---

## Havo 4

Gecontroleerd op 8 november 2026. Alleen gelezen, niets in de repo of sectiemap aangepast.

**Bronnen en afkortingen**
- PTA = `S/bron/PTA_H4_2026-2027.txt`, muziek-deel r.1221-1385 (pdf in de sectiemap: `00 PTA, studiewijzer en planning/PTA_H4_2026-2027.pdf`, gewijzigd 7-10-2026).
- SW = `S/bron/Studiewijzer_Muziek_H4_2026-2027_staand.txt` (pdf gewijzigd 8-10-2026). Dit is de bron van `basis.json`.
- basis = `lesdag-werk/pta-inhoud/public/data/basis.json` → `leergangen.havo4`; model = `beoordeling.json` (p1-, p2-, p3-havo4).
- JP = `S/bron/jaarplanning.txt`. Studiewijzers per stijl (docx) = `S/bron/h4docx/*.txt`.
- Havo 4 heeft geen PTO. De PTO-bestanden zijn niet gebruikt.
- De PTA's 2025-26 (`20251124144059_2526_H4_pta_definitief.pdf`) zijn niet gebruikt.

#### 1. Toetsentabel

Toetsen volgens PTA: P1, P2, P3, T1, T2 (samen 30 procent SE) en handelingsdelen H1 t/m H4.

| Toets | Soort | Weging | Duur (min) | Periode | Datum en week | Herkansbaar | Verschil |
|---|---|---|---|---|---|---|---|
| **P1 Samenspel en improvisatie** | PTA: P (praktijk), r.1291<br>basis: praktijk<br>model: n.v.t. | PTA: 7<br>basis: 7<br>model: 7 | PTA: 45<br>basis: 45 | PTA: Per.2, in les<br>basis: blok B1+B2 | PTA: geen datum<br>SW r.72: lesweek 17 (11-15 jan), in de les<br>basis: lesweek 17, ma 11 jan, les 2 en 3 | PTA: ja, herk.week nvt<br>SW r.76: ja, in de les<br>basis: ja, in de les<br>model: ja | Geen. PTA kent geen datum. Datum 11 jan is de weekmaandag, niet de lesdag |
| **T1 Lezen en schrijven** | PTA: T (theorie), r.1357<br>basis: theorie<br>model: geen | PTA: 5<br>basis: 5 | PTA: 90<br>basis: 90 | PTA: TW2<br>basis: toetsweek 2 (18-25 jan), MusicBox | PTA: TW2<br>SW r.78: TW2 (18-25 jan)<br>basis: week 18, ma 18 jan | PTA: ja, Herk.week "TW2"<br>SW r.81: ja, di 9 maart<br>basis: ja, 2027-03-09<br>model: n.v.t. | **1.** Herkansing: PTA "TW2" tegen SW en basis di 9 mrt.<br>**2.** Domein: PTA A1+A2+A3 (r.1368-1371), basis alleen A1.<br>**3.** Datum ma 18 jan staat in `vrijeDagen` (zie 3.1). Geen model (MusicBox-toets, PTA r.1372) |
| **P2 Melodie treffen** | PTA: P, r.1315<br>basis: praktijk | PTA: 8<br>basis: 8<br>model: 8 | PTA: 45<br>basis: 45 | PTA: Per.3, in les<br>basis: blok B3 | PTA: geen datum<br>SW r.83: lesweek 27 (30 mrt-2 apr)<br>basis: week 27, **ma 29 mrt** | PTA: ja, nvt<br>SW: ja, in de les<br>basis: ja, in de les<br>model: ja | **1.** Datum 29 mrt is Tweede Paasdag (SW lesweek 27, basis `event`). Hoort 30 mrt-2 apr.<br>**2.** Domein: PTA B1+B2 (r.1328), basis alleen B1 |
| **P3 Muziek en cultuur (mondeling)** | PTA: P, r.1334<br>**SW r.88: "theorie"**<br>basis: praktijk | PTA: 5<br>basis: 5<br>model: 5 | PTA: 15<br>basis: 15 | PTA: TW3<br>basis: toetsweek 3 | PTA: TW3; half A4 uiterlijk lesweek 26 (r.1338)<br>SW r.89: TW3 (5-12 apr); half A4 ma 22 mrt<br>basis: week 28, ma 5 apr | PTA: nee<br>SW: nee<br>basis: nee<br>model: nee | **1.** Soort: PTA P, SW theorie. De 15/15-verdeling in SW ("even zwaar") klopt alleen als P3 theorie telt.<br>**2.** PTA H1-H3 (r.1235, 1247, 1259) noemen de mondeling "T3" in plaats van P3.<br>**3.** Half A4: lesweek 26 en ma 22 mrt zijn dezelfde dag (geen echt verschil). Dag en uur van de 15 minuten per leerling staan nergens |
| **T2 Horen en benoemen** | PTA: T, r.1376<br>basis: theorie | PTA: 5<br>basis: 5 | PTA: 135<br>basis: 135 | PTA: TW4<br>basis: toetsweek 4, MusicBox, CE-vorm | PTA: TW4<br>SW r.94: TW4 (23 jun-2 jul)<br>basis: week 38, ma 28 jun | PTA: nee<br>SW: nee<br>basis: nee | Geen. Datum 28 jun is een aanname binnen TW4 (23 jun-2 jul). Geen model (MusicBox) |
| **H1 Concert De Doelen (1)** | handelingsdeel | geen cijfer | n.v.t. | n.v.t. | PTA r.1232: uiterlijk 26-04-2027<br>SW: do 15 okt<br>basis: 2026-10-15, week 7, deadline 2027-04-26 | nee | Geen |
| **H2 Concert De Doelen (2)** | handelingsdeel | geen cijfer | n.v.t. | n.v.t. | PTA r.1245: 26-04-2027<br>SW: do 18 feb<br>basis: 2027-02-18, week 22 | nee | Geen |
| **H3 Messiah in Leiden** | handelingsdeel | geen cijfer | n.v.t. | n.v.t. | PTA r.1257: 26-04-2027<br>SW: vr 12 mrt<br>basis: 2027-03-12, week 24 | nee | Geen. PTA r.1263: domein B1 erbij, basis noemt geen domeinen voor H |
| **H4 Muzikale bijdrage** | handelingsdeel | geen cijfer | n.v.t. | n.v.t. | PTA r.1271: 26-04-2027, geen datum<br>SW r.109: kansen 17 dec, 15 jan, 16 jan, 17 feb, 4 mrt, 25 mrt, 16 apr<br>basis: datum 2027-01-16 (week 17, open dag) | nee | Basis zet de open dag als "datum", maar H4 is niet datumgebonden (alleen deadline 26 apr). Geen echt verschil, wel misleidend |

Toetsweken en herkansingsdagen: basis TW1 2-6 nov (geen muziektoets), TW2 18-25 jan, TW3 5-12 apr, TW4 23 jun-2 jul. Dit komt overeen met SW en met JP (TW1-h4 t/m TW4-h4, dagen en maanden). Herkansingsdagen di 15 dec, di 9 mrt, di 18 mei (SW r.669). De serienummers van TW2 t/m TW4 en van de herkansingen in JP wijzen naar 2026 en niet naar 2027 (bijv. TW2-h4 46040 = 18 jan 2026). Dag en maand kloppen. Alleen melden.

Toets in de ene bron en niet in de andere: geen. PTA, SW en basis hebben dezelfde vijf toetsen en vier handelingsdelen. Het model-bestand heeft geen modellen voor T1 en T2, wat klopt (MusicBox-toetsen).

#### 2. Toets en les koppeling

### P1 Samenspel en improvisatie (lesweek 17, les 2 en 3)
- **Toetsles:** 17.2 "P1 (7%): samenspel" en 17.3 "P1: improvisatie". Week klopt met SW. Datum ma 11 jan is de weekmaandag. Zonder vaste lesdagen niet te controleren. Geen fasen (toetsles, bewust).
- **Model p1-havo4:** gekoppeld aan 15.2 (leerling), 16.2 (leerling), 16.3 (leerling), 17.2 (docent, scoreblad, leerling), 17.3 (docent, scoreblad). Dat is juist. Het model staat voor P1 (7 procent, herkansbaar) en de criteria komen overeen met PTA r.1300-1307: eigen partij, maat en puls, toon en zuiverheid, luisteren en samenspelen, en voor de improvisatie opbouw, in de maat, past bij de akkoorden.
- **Voorbereiding:** 11.2 ensembles samenstellen, 12.2 stuk kiezen, 13.2 partij instuderen, 14.2 samenvoegen, 15.2 doorspelen, 16.2 generale; improvisatie in 1.3, 4.3, 5.3, 6.3, 7.3, 8.3, 11.3, 16.3. Dat is gelijk aan SW "Toets P1 voorbereiden" (wk 14 t/m 17).
- **Stof uit PTA:** eigen partij in ensemblestuk, minstens een minuut improviseren over een akkoordenschema: gedekt. Messiah-koor in kleine bezetting als P1-stuk (SW r.72): in de lessen alleen "stuk kiezen"; welk stuk wordt gebruikt is niet vastgelegd.
- **Materiaal:** `Havo 4/P1 .../Toets` is leeg. `Lesmateriaal/Jazz` bevat zangstukken en een bluesboek. Voor barok of Messiah als P1-stuk staat niets klaar.

### T1 Lezen en schrijven (toetsweek 2)
- **Toetsles:** 18.1 "Toetsweek 2: T1 lezen en schrijven (90 min)" op ma 18 jan. Week klopt (TW2 18-25 jan). Dag niet vast te stellen, zie 3.1.
- **Model:** geen. PTA r.1372: gemaakt in de toetsomgeving van MusicBox. Geen fout.
- **Herkansing:** di 9 mrt (SW, basis), tegen PTA "TW2". Zie 5.
- **Voorbereiding:** 8.1 oefentoets notatie, 11.1 tot en met 16.1 (theorie), 17.1 proeftoets T1 in MusicBox (30 en 15 min, alleen tekstfasen), zelfcheck T1 in `thuis` van 15 en 16.
- **Stof uit PTA (r.1359-1366) naar les:**

| PTA | Les |
|---|---|
| muzieknotatie volgen | 11.1, 12.1 |
| ontbrekende noten invullen | 12.1 |
| ritme noteren | 2.1 |
| intervallen t/m octaaf | 15.1 (enige les) |
| toonsoorten en toonladders t/m drie voortekens | 5.1, 15.1 |
| grote en kleine drieklanken, bluesschema | 4.1 |
| begrippen jazz en barok | 3.1, 6.1, 7.1, 8.1, 11.1, 13.1, 14.1; thuis "begrippen barok" 13 |

Alles gedekt. Opmerking: 16.1 (classicisme: hoofdvorm, klassieke vierdeling, menuet, contrastwerking, tempoaanduidingen) zit in blok B2 (T1), maar PTA noemt voor T1 alleen jazz en barok. Voor T2 noemt PTA alleen tempo en vorm. De classicisme-begrippen worden dus nergens expliciet getoetst. Geen fout, wel melden (vraag 12).

### P2 Melodie treffen (lesweek 27, les 2 en 3)
- **Toetsles:** 27.2 "P2 (8%): melodie treffen" en 27.3 "P2: vervolg en inhaal". Week klopt met SW (lesweek 27). Datum ma 29 mrt is Tweede Paasdag: Lesdag-fout (zie 3.2).
- **Model p2-havo4:** gekoppeld aan 25.2 (leerling), 27.2 (docent, scoreblad, leerling), 27.3 (docent, scoreblad). Criteria komen overeen met PTA r.1320-1327: eerste toon zuiver, toonhoogtes, ritme, in de maat, doorgaan na een fout, ritme van vier maten.
- **Voorbereiding:** 19.2 (van blad: eenvoudige melodie), 21.2 (eerste toon zuiver inzetten), 22.2 (van blad met begeleiding), 23.2 (ritme van blad), 25.2 (proef, één tekstfase van 45 min), 26.1 (P2 oefenen). SW "Toets P2 voorbereiden" (wk 19, 23, 25, 27) klopt hiermee.
- **Stof uit PTA:** onbekende melodie 8 tot 16 maten in C, F of G, grondtoon horen, eerste noot, begeleiding, ritme van vier maten (kwarten, achtsten, syncope): gedekt. "Tien minuten voorbereidingstijd" komt in geen enkele les voor.
- **Materiaal:** `Havo 4/P2 .../Lesmateriaal` en `Toets` zijn leeg. Er zijn dus geen melodieën of ritmes voor P2 in de sectiemap (vraag 9).

### P3 Muziek en cultuur, mondeling (toetsweek 3)
- **Toetsles:** 28.1 "Toetsweek 3: P3 muziek en cultuur, mondeling (15 min)" op ma 5 apr. Dat is de eerste dag van TW3 (5-12 apr). 15 minuten per leerling past niet in één lesslot; de afname gebeurt in de toetsweek. Rooster onbekend (vraag 7).
- **Model p3-havo4:** gekoppeld aan 25.1, 26.1, 27.1 (leerling) en 28.1 (docent, scoreblad). Criteria komen overeen met PTA r.1343-1347 (tijd plaatsen, waarvoor bedoeld, redeneren vanuit wat je hoort, vaktermen, vervolgvraag) plus "half A4 ingeleverd".
- **Voorbereiding:** 7.1 concert voorbereiden, thuis "aantekeningen H1 af" (8), 22.1 concert voorbereiden (H2), 25.1 Messiah nabespreken en aantekeningen, 26.1 half A4 inleveren, 27.1 onbekende fragmenten plaatsen.
- **Stof uit PTA, wat ontbreekt:**
  - PTA noemt "waarvoor was de muziek bedoeld: kerk, concertzaal, feest" en "wat valt je op als je de drie avonden vergelijkt". Geen les behandelt de functie van muziek. Alleen 25.1 bespreekt de Messiah na. Een vergelijking van drie avonden staat in geen les (dit voorstel legt het in 25.1, zie voorstel).
  - PTA noemt "uit welke tijd kwam de muziek". Stijlen met tijd per les: gedekt, maar een overzichtsles "tijd plaatsen" ontbreekt vóór 27.1.
  - PTA vraagt "redeneren vanuit wat je hoort, geen jaartal nodig": gedekt in 27.1.
  - Het programma van 15 okt en 18 feb staat niet in de bronnen (vraag 8).
- **Materiaal:** `Havo 4/P3 .../Lesmateriaal` en `Toets` zijn leeg. Er zijn geen onbekende fragmenten voor de mondeling klaargezet.

### T2 Horen en benoemen (toetsweek 4)
- **Toetsles:** 38.1 "Toetsweek 4: T2 horen en benoemen (135 min)" op ma 28 jun. Week klopt (TW4 23 jun-2 jul, SW lesweek 37-38). Dag niet vast te stellen: PTA noemt alleen TW4 en JP geeft acht toetsdagen (wo 23 jun t/m 2 jul).
- **Model:** geen (MusicBox, CE-vorm). Geen fout.
- **Voorbereiding:** 29.1 t/m 33.1 (pop), 34.1 en 35.1 luistertraining, 36.1 proeftoets T2, 37.1 laatste vragen. Thuis "MusicBox luistertraining" 34 en 35, zelfcheck T2 in 36.
- **Stof uit PTA (r.1380-1385) naar les:**

| PTA | Les | Dekking |
|---|---|---|
| ritme, maat, tempo | 2.1, 3.1, 16.1 (tempo), 32.1 | gedekt |
| majeur of mineur | 4.1, 5.1 | gedekt |
| **consonant of dissonant** | geen les | **PTA noemt dit, geen les behandelt consonant en dissonant** (SW r.168 noemt alleen "scherpe dissonanten" bij Messiah nr. 9) |
| **dynamiek** | alleen terrassendynamiek in 11.1 | **geen les behandelt dynamiek als eigen onderwerp** (syllabus f) |
| speeltechnieken | 6.1 (jazz), 33.1 (pop) | gedekt voor jazz en pop, niet voor klassieke speeltechnieken |
| instrumenten, zangstemmen, ensembles | 20.1 | gedekt |
| vorm (herhaling, contrast) | 16.1, 25.1, 30.1 | gedekt |
| alle stijlen | 34.1, 35.1, 36.1 | alleen tekstfasen; het voorstel legt de luistertraining langs de PTA-lijst |

### Overig: beoordelingsmodellen en kaarten
- `kaartenNogTeMaken` in basis: SW barok, SW romantiek, SW pop, KK, VS. Lessen 11.1, 19.1, 20.1, 29.1 en 30.1 verwijzen naar deze kaarten ("instructie: SW barok", "KK", "VS"). De kaarten bestaan dus nog niet voor een deel van de aanstaande lessen.
- Compositielessen (14.3, 15.3, 19.3 t/m 25.3, 30.3, 32.3, 33.3) komen in geen toets terug. PTA toetst B2 alleen via de improvisatie in P1 (en noemt B2 bij P2, zie vraag 6).

#### 3. Meldingen uit het controlescript voor havo 4

Rapport: 2 FOUT en 7 INFO. Geen LET OP voor havo 4.

| Nr | Melding (ingekort) | Wat de bron zegt | Oordeel | Voorstel |
|---|---|---|---|---|
| 3.1 | FOUT: T1 staat op ma 18 jan, week 18, een vrije dag in de kalender | SW r.78 en r.136: toetsweek 2 is 18-25 jan, en JP regel 234: TW2-h4 loopt ma 18 jan t/m ma 25 jan. `basis.json` `vrijeDagen` noemt 2027-01-18 zonder reden. In SW staat 18 jan niet als vrij, wel 4 jan (studiedag). PTA noemt voor T1 alleen "TW2" | **Niet vast te stellen.** Bron van "vrije dag 18 jan" ontbreekt. Waarschijnlijk staat 18 jan ten onrechte in `vrijeDagen` voor de bovenbouw, of Frans weet een reden die niet in de bronnen staat | Vraag 1 aan Frans. Tot dan T1 niet op een dag vastzetten maar op "TW2, 18-25 jan". Lesweek 18 is bij havo 4 toch toetsweek |
| 3.2 | FOUT: P2 staat op ma 29 mrt, week 27, een vrije dag | SW r.83 en r.25: P2 lesweek 27 (30 mrt-2 apr). SW r.499-502: ma 29 mrt Tweede Paasdag. Basis `event` week 27: "ma 29 mrt Tweede Paasdag" | **Lesdag-fout.** De datum is de weekmaandag, een vrije dag | `toetsen.P2.datum` en datum van 27.2 en 27.3 op di 30 mrt of later in de week; 27.2 en 27.3 volgen de lesdagen van het rooster (vraag 2) |
| 3.3 | INFO: toetsles "P1 (7%): samenspel" (17.2) heeft geen fasen | Toetsles. `materiaal` met beoordelingsformulier, scoreblad en zelfbeoordeling aanwezig | **Geen echte fout** | Geen. Eventueel korte fasen (opstelling, volgorde, inhaal) als Frans de lesmodus wil gebruiken |
| 3.4 | INFO: toetsles "P1: improvisatie" (17.3) heeft geen fasen | Idem | Geen echte fout | Idem |
| 3.5 | INFO: toetsles "Toetsweek 2: T1 lezen en schrijven (90 min)" (18.1) geen fasen | Toetsles in MusicBox | Geen echte fout | Geen |
| 3.6 | INFO: toetsles "P2 (8%): melodie treffen" (27.2) geen fasen | Toetsles. Alleen model en scoreblad gekoppeld | Geen echte fout | Idem 3.3 |
| 3.7 | INFO: toetsles "P2: vervolg en inhaal" (27.3) geen fasen | SW r.88: "P2: vervolg en inhaal" | Geen echte fout | Idem |
| 3.8 | INFO: toetsles "Toetsweek 3: P3 ... (15 min)" (28.1) geen fasen | Toetsweek | Geen echte fout | Geen |
| 3.9 | INFO: toetsles "Toetsweek 4: T2 ... (135 min)" (38.1) geen fasen | Toetsweek | Geen echte fout | Geen |

#### 4. Lessen zonder fase-objecten die nog moeten komen (lesweek 10 of later, vanaf ma 9 nov 2026)

**Vooraf:** er is geen les met "Nog in te vullen". Mijn eerste zoekslag gaf één treffer (12.1), maar dat was het woord "volgt" in de doelzin ("Je volgt notatie"). Er is dus niets leeg gelaten.

**Wat er wel is:** vrijwel alle komende lessen hebben geen fase-objecten, maar tekststrings in de vorm "15 min · doen: Messiah-fragmenten". Alleen 11.1 (één fase-object), 35.2 en 36.2 (fase-objecten) zijn uitgewerkt. De tekstfasen tellen wel op tot 45 minuten. Ik noem hieronder alle lessen met alleen tekstfasen. Lesdatum = maandag van de lesweek (havo 4 heeft geen vaste lesdagen in de data).

**Helemaal zonder fasen, bewust leeg (niet uitgewerkt):**
- Toetslessen: 17.2, 17.3 (P1), 18.1 (T1), 27.2, 27.3 (P2), 28.1 (P3), 38.1 (T2).
- Uitval: 10.1-3 (activiteitenweek A), 26.2-3 (activiteitenweek D), 31.1-3 (excursie), 37.2-3 (toetsweek).
- Toetsweek-lessen: 18.2-3, 28.2-3, 38.2-3.

**Tekstfasen, dunne structuur (1 of 2 tekstfasen) en uitgewerkt in `havo4-voorstel.json` (23 lessen):**

| Lesid | Lesweek (ma) | Titel | Tekstfasen |
|---|---|---|---|
| havo4:17.1 | 17 (11 jan) | Proeftoets T1 in MusicBox en nabespreken | 30 + 15 |
| havo4:20.2 | 20 (1 feb) | Messiah: nieuwe koren | 20 + 25 |
| havo4:20.3 | 20 (1 feb) | Ostinato-compositie uitwerken | 40 + 5 |
| havo4:21.3 | 21 (8 feb) | Melodie noteren bij je ostinato | 40 + 5 |
| havo4:22.3 | 22 (15 feb) | Compositie opnemen | 20 + 25 |
| havo4:24.2 | 24 (8 mrt) | Messiah: generale in de klas, alle koren | 45 |
| havo4:24.3 | 24 (8 mrt) | Messiah: zwakke plekken per stemgroep | 45 |
| havo4:25.2 | 25 (15 mrt) | Van blad: onvoorbereid zingen en ritme klappen (proef voor P2) | 45 |
| havo4:25.3 | 25 (15 mrt) | Compositie afronden | 40 + 5 |
| havo4:30.2 | 30 (19 apr) | Bandspel uitbouwen | 40 + 5 |
| havo4:30.3 | 30 (19 apr) | Couplet en refrein schrijven | 40 + 5 |
| havo4:32.2 | 32 (17 mei) | Groove: drums en bas | 40 + 5 |
| havo4:32.3 | 32 (17 mei) | Bridge toevoegen | 40 + 5 |
| havo4:33.2 | 33 (24 mei) | Eigen song spelen | 40 + 5 |
| havo4:33.3 | 33 (24 mei) | Song arrangeren | 40 + 5 |
| havo4:34.1 | 34 (31 mei) | Luistertraining: jazz en barok | 40 + 5 |
| havo4:34.2 | 34 (31 mei) | Bandopname | 20 + 25 |
| havo4:34.3 | 34 (31 mei) | Song opnemen | 45 |
| havo4:35.1 | 35 (7 jun) | Luistertraining: classicisme, romantiek, 20e eeuw | 40 + 5 |
| havo4:35.3 | 35 (7 jun) | Song afronden | 40 + 5 |
| havo4:36.1 | 36 (14 jun) | Proeftoets T2 op de manier van het CE; nabespreken | 30 + 15 |
| havo4:36.3 | 36 (14 jun) | Terugblik: wat kun je nu? | 30 + 15 |
| havo4:37.1 | 37 (21 jun) | Laatste vragen over T2 | 45 |

**Tekstfasen, voor de P3-voorbereiding ook uitgewerkt (4 lessen):** havo4:22.1 Concert voorbereiden: programma beluisteren met een luisteropdracht; havo4:25.1 Variatie: ritmisch, melodisch, harmonisch; Messiah nabespreken voor P3; havo4:26.1 Maandagles: P2 en P3 voorbereiden; havo4:27.1 Onbekende fragmenten plaatsen en beargumenteren (oefenen voor P3).

**Tekstfasen met 3 tot 5 tekstfasen, nog niet uitgewerkt (34 lessen)** (volgende stap: dezelfde minuten uitschrijven met `maak-decks.js`, `fasen`):
- Lesweek 11: 11.2 P1: ensembles samenstellen; 11.3 Improviseren boven een ostinate bas en orgelpunt; (11.1 heeft al één fase-object, de rest is tekst).
- Lesweek 12: 12.1 Notatie volgen in de g-sleutel; ontbrekende noten invullen met een Messiah-melodie; 12.2 P1: stuk kiezen, partijen verdelen; 12.3 Variatie op een ostinate bas.
- Lesweek 13: 13.1 Aria, recitatief en koor; tekstuitbeelding en melisme; 13.2 P1: eigen partij instuderen; 13.3 Motief, voorzin en nazin.
- Lesweek 14: 14.1 Compositietechniek: imitatie, canon, fuga, homofonie, polyfonie, unisono; 14.2 P1: partijen samenvoegen; 14.3 Tegenstem schrijven bij een melodie.
- Lesweek 15: 15.1 Toonsoort t/m drie voortekens, parallelle toonsoort; intervallen t/m octaaf; 15.2 P1: doorspelen; 15.3 Componeren in voorzin en nazin.
- Lesweek 16: 16.1 Classicisme; 16.2 P1: generale; 16.3 P1: akkoordenschema kiezen en improvisatie oefenen.
- Lesweek 19: 19.1 Romantiek; 19.2 Van blad: eenvoudige melodie treffen; 19.3 Compositie op een ostinato.
- Lesweek 20-21: 20.1 Klankkleur; 21.1 Chromatiek en modulatie; 21.2 Eerste toon zuiver inzetten.
- Lesweek 22-25: 22.2 Van blad met begeleiding; 23.1 20e eeuw; 23.2 Ritme van blad; 23.3 Ritmische compositie met maatwisseling; 24.1 Messiah-luisteroefening.
- Lesweek 29-33: 29.1 Popgeschiedenis; 29.2 Popsong zingen; bandspel; 29.3 Songidee: akkoordenschema; 30.1 Vorm in pop; 32.1 Ritme in pop; 33.1 Uitvoeringspraktijk pop.

Opmerking over datums: lessen 19.1 (ma 25 jan, "nog toetsweek") en 29.1 (ma 12 apr, "nog toetsweek") vallen volgens basis `event` op de laatste dag van een toetsweek. SW laat daar wel les staan. Zie vraag 5.

#### 5. Tegenstrijdigheden en vragen aan Frans

1. **T1 op ma 18 jan.** `vrijeDagen` noemt 18 jan een vrije dag, SW en JP zetten daar de start van TW2. Wat is 18 jan? Op welke dag en welk uur maakt havo 4 T1 (90 min) en T2 (135 min)? Rooster TW2 en TW4 is niet in de bronnen.
2. **Lesdagen havo 4.** `lesdagen` is `null`. Welke dagen heeft havo 4 muziek? Daarmee zijn de datums van P1 (17.2 en 17.3) en P2 (27.2 en 27.3), en 19.1 en 29.1 (ma, nog toetsweek) vast te stellen.
3. **T1 herkansing.** PTA r.1357: Herk.week "TW2". SW r.81 en basis: di 9 maart. Welke geldt? (PTA is het officiële document.)
4. **P3 soort.** PTA: P (praktijk), r.1334. SW r.88: theorie. SW "Zo telt je schoolexamen" (r.53-67) telt 15/15 (P1+P2 tegen T1+P3+T2). Welke soort geldt? En PTA H1-H3 spreken van "T3". Aan te passen in de PTA?
5. **Les op de laatste dag van de toetsweek.** Gaat 19.1 (ma 25 jan, "nog toetsweek") en 29.1 (ma 12 apr, "nog toetsweek") door? SW toont ze als gewone les 1.
6. **Domeinen.** PTA: T1 heeft A1+A2+A3, basis alleen A1. PTA: P2 heeft B1+B2, basis alleen B1. Aanpassen in basis, of laten?
7. **Afname P3.** Wanneer worden de 15-minutengesprekken in TW3 gehouden, en door wie? De toetsles 28.1 is één lesslot op ma 5 apr.
8. **Concertprogramma's.** Welke stukken staan op het programma van 15 okt (H1) en 18 feb (H2)? Nodig voor 22.1 (concert voorbereiden) en de vergelijking van de drie avonden voor P3.
9. **P2- en P3-materiaal.** De mappen `P2 .../Lesmateriaal`, `P2 .../Toets`, `P3 .../Lesmateriaal`, `P3 .../Toets`, `P1 .../Toets`, `T1 .../Toets` en `T2 .../Toets` in de sectiemap zijn leeg. Waar staan de melodieën voor P2, de onbekende fragmenten voor P3, de proeftoetsen T1 en T2?
10. **Messiah als P1-stuk.** SW laat "een Messiah-koor in kleine bezetting" toe. Welk stuk of koor wordt P1? In de lessen 11.2 t/m 16.2 staat alleen "stuk kiezen".
11. **Handelingsdeel 4 en 13 november.** 11.1 (fase-object) zegt "De keuze moest vóór 13 november binnen zijn" en verwijst naar een Forms-link. In PTA en SW staat alleen de deadline 26 april. Waar komt 13 november vandaan?
12. **T2 en classicisme.** 16.1 (hoofdvorm, klassieke vierdeling, menuet, contrastwerking) wordt volgens PTA in geen toets getoetst. En consonant/dissonant (PTA T2) en dynamiek (PTA T2) hebben geen eigen les. Wil Frans die in 34.1 en 35.1 (luistertraining) of in een eigen les opnemen? Het voorstel doet het eerste.
13. **Activiteitenweek A (lesweek 10).** SW r.283 zegt "veel lessen vallen uit". Basis markeert alle drie de lessen als uitval. Klopt dat voor alle klassen van havo 4?
14. **"Klassikaal" tegen nooit voor de klas.** De formatieve opdrachten van 14.3 ("Twee tegenstemmen klassikaal.") en 19.3 ("Twee ostinato's klassikaal.") laten leerlingen werk voor de klas laten horen. Aanpassen naar "in groepjes voor de docent"? (Niet in het voorstel: deze lessen heb ik niet uitgewerkt.) In 24.3 is de formatieve opdracht "Stemgroep zingt de zwakke plek voor" in het voorstel omgezet naar "voor de docent in de eigen hoek".
15. **Studiewijzer-versies.** Twee oudere versies in de sectiemap wijken af. `Havo 4/.../Jazz/Studiewijzer_Muziek_H4_2026-2027.docx` (7-9-2026): P1 7,5 procent, P2 7,5 procent, mondeling "T3" herkansbaar, blokken beginnen in lesweek 9 en 10 op andere plekken. De docx-studiewijzers per stijl (Jazz, Barok Classicisme, Romantiek 20e eeuw, Pop) hebben "Presentatie Muzikale Moodboard" (presentatie), 90-minuten theorietoetsen per stijl, en weekplannen die niet bij 2026-2027 horen. `2026 Overzicht PTA en handelingsdelen.docx` bevat data van 2025-26 (17 okt 2025, 6 maart 2026). Opruimen of markeren als oud?
16. **Aantal lessen.** SW r.49-51: 56 praktijk en 31 theorie, "91 lessen" (som 87). Basis heeft 32 theorielessen (l1, zonder toetsen) en 56 praktijklessen. Telt de ene theorieles meer ook voor Frans?
17. **Zelfbeoordeling.** PTA noemt geen zelfbeoordeling. Alleen 25.2 (P2) en 26.1 (P3) hebben een gekoppeld model "leerling" in dit stuk van het jaar. In het voorstel sluiten meer lessen af met een strookje van hooguit 3 minuten (lescriteria afvinken). Is dat zoals Frans het wil?
18. **Bronnen voor de nieuwe uitwerking.** Het voorstel noemt geen opnameprogramma en geen MusicBox-onderdelen bij naam, omdat die niet in de bronnen staan. Welk opnameprogramma op de laptops (34.2, 34.3, 22.3)? En welke popsong wordt in 29.2 gezongen? (Bepaalt 30.2 en 33.2.)


---

## Havo 5

Bronnen. PTA = `PTA_H5_2026-2027.txt`, regels 1625-1905 (muziek). SW = `Studiewijzer_Muziek_H5_2026-2027.txt` (pdf van 12 okt 2026, nieuwste). SWdocx = `Studiewijzer_Muziek_H5_2026-2027.docx` in de sectiemap (7 sep 2026, ouder, wijkt af, zie punt 5). TW1 = `tw1.txt` (rooster toetsweek 1). Basis = `basis.json` leergangen.havo5 (gelijk aan `data/havo5.json`). Beoordeling = `beoordeling.json` (p3-havo5, p4-havo5).
PTA-regelnummers (r.) zijn bij benadering (+/- 10 regels); de toetsblokken staan in volgorde H5-H8, P1, P2, P3, P4, T1, T2, T3, T4 tussen r.1625 en 1875.
Lesweekdagen havo 5: les 1 woensdag, les 2 en 3 maandag (dubbeluur). Lesdatum = lesweek-maandag, les 1 + 2 dagen.

#### 1. Toetsentabel

Weging in % van het SE. Duur in minuten. Herkansbaar: ja/nee.

| Toets | Soort | PTA (en SW) | Basis | Beoordeling | Verschil |
|---|---|---|---|---|---|
| T3 Analyseren | theorie | 20% · 135 · TW1 · herkansbaar ja, herk.week "TW1" (PTA r.1846-1860). SW p.3: TW1 2-9 nov, MusicBox, herkansing di 15 dec. TW1 r.374-376: ma 9 nov, uur 4-6, lokaal 009, 135 min | 20% · 135 · datum 2026-11-02 (lesweek 9) · toetsles wo 4 nov (9.1) · "toetsweek 1 (2-10 nov)" · herkansing 2026-12-15 | geen model (MusicBox) | **Ja**: datum en toetsles (zie 2 en 3, melding 1); einde toetsweek 10 nov tegen 9 nov |
| P3 Zelf componeren | praktijk | 15% · 90 · "Per.2 in les" · herkansbaar nee · uiterste inleverdatum "nvt" (PTA r.1762-1790). SW: lesweek 17 (11-15 jan), bladmuziek uiterlijk vr 8 jan | 15% · duur **45** · 2027-01-11 (lesweek 17) · bladmuziek vr 8 jan · nee | p3-havo5: 15 · nee · toets P3 | **Ja**: duur 45 tegen 90 (17.2 + 17.3 zijn samen 90 min) |
| P4 Muzikale productie | praktijk | 15% · 180 · toetsweek "nvt" · nee (PTA r.1792-1805). SW: lesweek 21 of 22 (8-17 feb), datum volgt | 15% · 180 · 2027-02-08 (lesweek 21) · "datum volgt" · nee | p4-havo5: 15 · nee · toets P4 | Geen. Datum open in alle bronnen. Weging in model (75 docent, 10 zelf, 15 klasgenoten) staat niet in de PTA |
| T4 Proefexamen | theorie | 20% · 135 · TW3 · nee (PTA r.1862-1875). SW: TW3 1-15 apr, MusicBox | 20% · 135 · datum 2027-04-05 (lesweek 28) · toetsles wo 7 apr (28.1) · nee | geen model (MusicBox) | Datum 5 apr (ma) tegen les wo 7 apr; rooster TW3 niet beschikbaar (niet vast te stellen) |
| H5 Concert De Doelen (1) | handelingsdeel | wegen 0 · herkansbaar nee · uiterste inleverdatum **26-04-2027** (PTA r.1651-1662). SW: do 15 okt, voor vr 16 april | datum 2026-10-15 · deadline 2027-04-16 | — | **Ja**: deadline 26 apr (PTA) tegen 16 apr (SW, Basis) |
| H6 Concert De Doelen (2) | handelingsdeel | PTA 26-04-2027. SW: do 18 feb | 2027-02-18 · deadline 2027-04-16 | — | Idem deadline |
| H7 Muzikale bijdrage | handelingsdeel | PTA 26-04-2027; kies 1 uit 4 (koor/band/ensemble; open dag/viering; onderbouw helpen min. 4x; lokaal beheren min. 2 activiteiten). SW: kansen 17 dec, 16 jan, 15 jan, 17 feb, 4 mrt, 25 mrt | naam "Handelingsdeel 4: muzikale bijdrage"; datum 2027-01-16 (open dag, als voorbeeld) · deadline 2027-04-16 | — | Deadline idem; naam "Handelingsdeel 4" tegen H7 in PTA en SW |
| H8 Messiah in Leiden | handelingsdeel | PTA 26-04-2027. SW: vr 12 mrt | 2027-03-12 · deadline 2027-04-16 | — | Idem deadline |
| P1, P2, T1, T2 (5, 10, 5, 10%) | praktijk en theorie | Staan in de PTA-tekst (r.1676-1685, 1802-1822) zonder duidelijk cursusjaar: samen 30%, passen bij havo 4 van 2025-2026 (SE 30% + 70% = 100%) | niet in havo 5 (SE-deel havo 4: "30%") | — | Geen toets van dit jaar; wel rommel in de PTA (zie vraag 3) |
| H1-H4 (2025-2026) | handelingsdeel | PTA r.1636-1720: 4 rijen met cursus 2025-2026 (Messiah feb 2026, uiterlijk 03-04-2026) | niet in havo 5 | — | Verouderde rijen in de PTA van havo 5 |

Overig: SE-aandeel klopt (T3 20 + P3 15 + P4 15 + T4 20 = 70, PTA r.1851 en SW p.2). Periode van P3 ("Per.2") heeft Basis niet als veld; niet vast te stellen of lesweek 17 nog in periode 2 valt (kalender geeft geen periodegrenzen).

#### 2. Toets, les-koppeling

| Toets | Toetsles in Basis | Model en koppeling | Voorbereidingslessen | Stof uit PTA, wel of niet in lessen |
|---|---|---|---|---|
| T3 | 9.1 "Toetsweek 1: T3 analyseren (135 min)" op wo 4 nov. TW1-rooster: ma 9 nov, uur 4-6. Dus T3 hoort bij lesweek 10 (ma 9 nov = 10.2 en 10.3, nu "Valt uit: toetsweek"), niet bij 9.1 | Geen model. Past bij MusicBox-toets | 1.1, 2.1, 3.1, 4.1, 8.1 (theorie), 7.2 en 8.2 (zingend), 7.3 en 8.3 (vorm in P3). Lesweek 5-7 l1 vallen uit (5.1, 6.1-6.3, 7.1) | Gedekt: ritme en ostinato/syncope (1.1), tempo en dynamiek (2.1), motief/sequens/voor- en nazin (3.1), toonsoort, modulatie, ontbrekende noten (4.1), samenklank consonant/dissonant (8.1, 8.2), notatie volgen en ritme noteren (4.1, 8.1). **Dun of ontbrekend**: (a) vormschema maken en herhaling/contrast: SW noemt dit als doel, maar les 1 van lesweek 7 (vorm) valt uit; alleen 7.3 (eigen P3-vormschema) en 8.1 (training) blijven. (b) canon en polyfonie: geen les; alleen MusicBox thuis (SW p.7, "Renaissance: canon, motet") en een lijst in 8.1; imitatie, homofonie en unisono zitten wel in 7.2. (c) "uitleggen wat de muziek met je doet en dat verbinden aan wat je hoort" (PTA T3 en T4): geen enkele les noemt dit (gezocht in alle 90 lessen). (d) samenklank op les 1 van lesweek 5 (SW) valt uit; alleen 8.1/8.2 |
| P3 | 17.2 "P3 (15%): uitvoering en toelichting" en 17.3 "P3: uitvoeringen, vervolg", beide ma 11 jan; datum klopt met Basis (2027-01-11) en SW | p3-havo5: leerlingmodel in 11.3, 15.3, 16.1; docent + scoreblad + leerling in 17.2; docent + scoreblad in 17.3. Koppeling klopt. Criteria van het model (vraag 2, samenhang 2, keuzes 2, bladmuziek 1, uitvoering 2, toelichting 1) dekken de vijf PTA-criteria | 1.3 vraag kiezen, 2.3 motief, 3.3 ontwikkelen, 4.3 toonsoort en plan, 5.3 schets, 7.3 vorm, 8.3 schets 1, 11.3 vorm uitwerken, 12.3 drie partijen, 13.3 bewuste middelen, 14.3 arrangement/balans, 15.3 notatie, 16.1 laatste check | Gedekt: vraag, vorm met herhaling/contrast, minstens drie partijen, tempo/dynamiek/articulatie, bladmuziek, uitvoering, toelichting. 16.2 en 16.3 vallen uit (4 jan studiedag), dus de laatste tussenstap voor inleverdatum vr 8 jan is 16.1 (wo 6 jan). 17.2 en 17.3 hebben geen fasen (zie 4) |
| P4 | 21.3 "P4 (15%): de productie (lesweek 21 of 22, datum volgt)", ma 8 feb; 22.3 "uitwijkweek; terugblik en feedbackformulier" (ma 15 feb). Basis-datum 2027-02-08 is de eerste kans | p4-havo5: leerlingmodel 12.2 en 21.2; docent + scoreblad 21.3; docent + scoreblad + leerling 22.3. Koppeling past bij "lesweek 21 of 22". Klasgenotenbeoordeling (min. 3 klasgenoten) staat niet in de PTA | 12.2 start, 13.2 repertoire kiezen, 14.2 instuderen, 15.2, 20.2 doorspelen, 20.3 eigen werk arrangeren, 21.2 generale. Publiciteit/uitnodigingen (SW: lesweek 17) en programmaboekje (SW: lesweek 20) komen in de leergang niet als les voor, alleen als SW-huiswerk | PTA-punten: vocaal en instrumentaal werk, eigen werk (20.3), twee hoorbare zelfstandige rollen, samenhangend programma, organisatie (planning, begroting, locatie, techniek, publiciteit, programmaboekje, aankleding), eigen aankondiging en toelichting. **Dun**: begroting en locatie (SW: lesweek 14), techniek en aankleding en aankondiging/toelichting krijgen geen eigen les; 12.2 en 13.2 dekken planning en rollen. 180 min productie past niet in 21.3 van 45 min (waarschijnlijk buiten de les) |
| T4 | 28.1 "Toetsweek 3: T4 proefexamen (135 min)", wo 7 apr; 28.2-29.3 toetsweek | Geen model (MusicBox) | 23.1 en 26.1 proefexamens, 24.1 nabespreken, 25.1 variatie/dansen/vorm, 22.1 klankkleur/dynamiek, 21.1 toonhoogte/toonsoort/samenklank, 20.1 ritme/maat/tempo, 25.2 melodie volgen en noten invullen, 26.2 ritme noteren | Gedekt: aspecten benoemen, notatie volgen en noten invullen (25.2), ritme noteren (26.2), structuur analyseren (25.1, 23.2). Niet gedekt: "uitleggen wat de muziek met je doet" (zie T3). Syllabuspunten a-q: Basis-tabel komt overeen met SW p.17 (eigen controle per letter; verschil alleen bij g: SW noemt ook lesweek 5, die les valt uit) |
| H5-H8 | geen les met die titel; 11.1 bevat een fase "Handelingsdeel 4: heb je al gekozen?" (2 min) | geen model | n.v.t. | Concertbezoeken en Messiah staan in SW en Basis; Messiah-lijst per week (18 koren) komt overeen met SW p.5 en lessen 7.2, 8.2, 11.2, 12.2, 13.2, 14.2, 15.2, 20.2, 21.2, 22.2, 23.2 |

#### 3. Meldingen van het controlescript voor havo 5

| # | Melding (ingekort) | Wat de bron zegt | Oordeel | Voorstel |
|---|---|---|---|---|
| 1 | [INFO] wo 4 nov, lesweek 9 les 1: toetsles "Toetsweek 1: T3 analyseren (135 min)" geen fasen (verleden) | TW1 r.374-376: T3 ma 9 nov uur 4-6, lokaal 009. SW p.3: toetsweek 1 is 2-9 nov | **Lesdag-fout** (datum). Toetsles staat een week te vroeg; 10.2 en 10.3 (ma 9 nov) staan op uitval | 9.1: wo 4 nov geen toetsles (toetsweek); T3 naar 10.2/10.3, T3-datum 2026-11-09, week 10. Morgen al relevant |
| 2 | [FOUT] ma 18 jan, lesweek 18 les 2: les "Toetsweek 2" op vrije dag, niet als uitval | Basis vrijeDagen bevat 2027-01-18. SW p.11: toetsweek 2 is 18-28 jan, geen muziektoets. Jaarplanning-TW2 begint ook ma 18 jan (datums in dat blad zijn van 2026, niet bruikbaar) | **Lesdag-fout**: 18.2 en 18.3 zijn "toetsweek", geen "uitval". Bron voor de vrije dag is alleen Basis | Zet 18.2 en 18.3 op uitval ("Valt uit: ma 18 jan vrije dag"), net als 4 jan. 18.1 (wo 20 jan) blijft toetsweek |
| 3 | [FOUT] ma 18 jan, lesweek 18 les 3: idem | Idem | Idem | Idem |
| 4 | [INFO] ma 11 jan, lesweek 17 les 2: toetsles P3 geen fasen | PTA P3: 90 min in de les. SW p.10 lesweek 17 | Geen echte fout: toetsles zonder fasen, wel invulbaar | Optioneel voorstel in `havo5-voorstel.json` (`_optioneel_toetslessen`) |
| 5 | [INFO] ma 11 jan, lesweek 17 les 3: "P3: uitvoeringen, vervolg" geen fasen | Idem | Idem | Idem |
| 6 | [INFO] ma 8 feb, lesweek 21 les 3: "P4 (15%): de productie (lesweek 21 of 22, datum volgt)" geen fasen | PTA P4: 180 min, geen datum. SW p.3: datum volgt | Niet vast te stellen: datum onbekend | Niet uitwerken tot de datum er is |
| 7 | [INFO] wo 7 apr, lesweek 28 les 1: "Toetsweek 3: T4 proefexamen (135 min)" geen fasen | PTA T4: TW3. SW: 1-15 apr | Geen echte fout; datum van T4 (ma 5 apr in Basis, wo 7 apr als les) niet vast te stellen zonder rooster TW3 | Geen. Rooster TW3 afwachten |
| 8 | [INFO] wo 4 nov, lesweek 9 les 1: T3 (zie 1) | Zie 1 | Zie 1 | Zie 1 |

#### 4. Lessen zonder fasen die nog moeten komen (vanaf ma 9 nov 2026, lesweek 10 of later)

Geen enkele les heeft "Nog in te vullen". Alle gewone lessen hebben fasen (tekst of object). Zonder fasen zijn alleen toets-, toetsweek- en uitvalslessen:

| Lesid | Datum | Type | Titel |
|---|---|---|---|
| havo5:10.1 | wo 11 nov | uitval | Valt uit: dagexcursie havo 5 |
| havo5:10.2, 10.3 | ma 9 nov | uitval | Valt uit: toetsweek (hier hoort T3, zie melding 1) |
| havo5:16.2, 16.3 | ma 4 jan | uitval | Valt uit: ma 4 jan studiedag |
| havo5:17.2 | ma 11 jan | toets | P3 (15%): uitvoering en toelichting |
| havo5:17.3 | ma 11 jan | toets | P3: uitvoeringen, vervolg |
| havo5:18.1 | wo 20 jan | toetsweek | Toetsweek 2: geen muziektoets |
| havo5:18.2, 18.3 | ma 18 jan | toetsweek | Toetsweek 2 (vrije dag, zie melding 2) |
| havo5:19.1-19.3 | wo 27 jan, ma 25 jan | toetsweek | Toetsweek 2 |
| havo5:21.3 | ma 8 feb | toets | P4 (15%): de productie (lesweek 21 of 22, datum volgt) |
| havo5:27.2, 27.3 | ma 29 mrt | uitval | Valt uit: Tweede Paasdag |
| havo5:28.1 | wo 7 apr | toets | Toetsweek 3: T4 proefexamen (135 min) |
| havo5:28.2, 28.3 | ma 5 apr | toetsweek | Toetsweek 3 |
| havo5:29.1-29.3 | wo 14 apr, ma 12 apr | toetsweek | Toetsweek 3 |

Verleden (alleen genoemd): 5.1, 6.1-6.3, 7.1 (uitval), 9.1-9.3 (toetsles T3 en toetsweek 1).

Dunne lessen met fasen (1 tekstregel van 45 min), alleen ter info: 23.1, 23.3, 24.2, 24.3, 25.2, 25.3, 26.1-26.3, 27.1, 30.1-30.3. Ze hebben wel fasen en vallen buiten punt 4. Voor 17.2 en 17.3 staat een optioneel voorstel in het JSON; de rest is volgens de opdracht niet uitgewerkt (toetsles, toetsweek, uitval, of datum volgt).

#### 5. Tegenstrijdigheden en vragen aan Frans

Tegenstrijdigheden:

1. **T3-datum**: TW1-rooster (r.374-376) zet T3 op ma 9 nov uur 4-6; Basis heeft datum 2 nov, toetsles wo 4 nov (lesweek 9). SW zegt 2-9 nov zonder dag. Wat is de waarheid? (Zie melding 1; dit is morgen.)
2. **Einde toetsweek 1**: Basis tot 10 nov; SW p.3 en jaarplanning tot ma 9 nov.
3. **PTA H5 bevat verouderde rijen**: H1-H4 met cursus 2025-2026 en vermoedelijk ook P1, P2, T1, T2 (30% havo 4 van vorig jaar) zonder duidelijk jaar. Eerder genoteerd in `presentaties-bronverschillen-2026-11-02.md` r.26.
4. **Uiterste inleverdatum H5-H8**: PTA 26-04-2027 (de maandag van de meivakantie); SW p.3 en Basis vr 16 april 2027. PTA P3 zegt "Per.2 in les", SW lesweek 17.
5. **Duur P3**: PTA 90 min, Basis 45 (de twee lessen 17.2 en 17.3 samen zijn 90).
6. **Oude docx-studiewijzer in de sectiemap** (7 sep 2026, `00 PTA, studiewijzer en planning/Studiewijzer_Muziek_H5_2026-2027.docx`) wijkt af van de nieuwere pdf (12 okt): toetsen heten T4 (analyseren) en T5 (proefexamen) in plaats van T3 en T4; herkansing ook op di 9 mrt; H7 is daar de Messiah en H8 de bijdrage; P4 "uiterlijk 16 april", lessen per week anders. `Studiewijzer H5.docx` in dezelfde map is uit 2024. Lesdag volgt de pdf.
7. **H7-naam en datum in les 11.1**: de fase heet "Handelingsdeel 4" (Basis-naam ook) en zegt "De keuze moest vóór 13 november binnen zijn"; 13 november staat in geen havo-5-bron. In PTA en SW heet het H7.

Vragen aan Frans:

1. Is T3 op ma 9 nov (uur 4-6) en moeten 10.2/10.3 T3-lessen worden?
2. Is ma 18 jan echt een vrije dag voor havo 5? Dan 18.2 en 18.3 op uitval; of toetsweek 2 zonder lessen. Bevestig ook dat er geen muzieklessen in toetsweek 2 zijn (18.1, 19.1-19.3).
3. Mag de PTA van havo 5 worden opgeschoond (H1-H4, P1, P2, T1, T2 van 2025-2026) en de inleverdatum van de handelingsdelen op 16 april worden gezet? Moet de oude docx uit de gedeelde sectiemap?
4. Klasgenotenbeoordeling P4 (15% van het P4-cijfer, "min. 3 klasgenoten") komt niet in de PTA voor. Het TW1-rooster noemt voor h5.mu1 aantal 3; bij zo'n klas zijn er maar twee klasgenoten. Past dit model bij de klasgrootte, en mag het volgens de PTA?
5. P4 8-17 feb: welke datum, en gebeurt de productie buiten de les (180 min)? Lesweek 21 en 22 hebben dan 21.3 en 22.3 als beoordelingsmoment.
6. Proefexamens (23.1, 26.1: "volledig oud CE") duren 135 min; de lessen zijn 45 min (vervolg thuis of in les 3). Zo bedoeld?
7. Stofgaten T3/T4: vorm horen (SW lesweek 7 les 1 valt uit), canon en polyfonie, en "uitleggen wat de muziek met je doet". Opvangen in 8.1, in MusicBox, of in een volgende les?
8. De Messiah-herhaling in lesweek 17 (SW: "kort herhalen 7, 10 en 18") staat in geen les van de leergang; hoort die in 17.2? (In het voorstel in 17.2 gezet.)
9. Moeten 17.2, 17.3 (en 21.3) fasen krijgen in de lesmodus, of blijven toetslessen leeg?


---

## Vwo 3

Alleen gelezen, niets aangepast. Geen leerlingnamen opgenomen. vwo 3 deelt de beoordelingsmodellen en bijna alle punten met havo 3; zie `havo3.md` voor de uitgebreide toelichting en bronverwijzingen. Hier staat wat voor vwo 3 anders is.

Bronnen: PTO-nov = `S/bron/pto_muziek_nov.txt` r.13-14 (v3) en `S/bron/pto_november.txt` r.371-372; PTO-oud = `S/bron/pto_oud.txt` r.377-379; PTO-richtlijnen = `S/bron/ptorichtlijnen.txt`; Vakwerkplan = `S/bron/vwp2627.txt`; basis.json en beoordeling.json = `lesdag-werk/pta-inhoud/public/data/`. Er is geen PTA-pdf voor vwo 3.

#### 1. Toetsentabel

| Veld | PTO-nov (r.13-14) | basis.json (`vwo3`) | beoordeling.json | Verschil |
|---|---|---|---|---|
| **P1** naam | "Groepspresentatie lied" | "Groepspresentatie lied" | model-titel "PTO P1: presentatie kerstlied" | geen |
| soort | praktijk | praktijk | praktijkmodel | gelijk |
| weging | 10 | 10 | 10 | gelijk |
| duur | 45 | 45 | n.v.t. | gelijk |
| periode | Per.2 | blok P2 (lesweek 11-20) | n.v.t. | gelijk |
| datum, week | niet genoemd | ma 25 jan 2027, lesweek 19 (kalender wk 4) | model aan lesweek 16-20 | Lesdag-keuze |
| herkansbaar | nee (0) | false | false | gelijk |
| **T1** naam | "Herhaling alle behandelde thema's" | zelfde titel; `stof`: "Instrumenten, bands en orkesten: ..." | geen model | titel en stof verschillen (zie punt 2) |
| soort, weging, duur | theorie, 10, 45 | theorie, 10, 45 | n.v.t. | gelijk |
| periode | Per.3 | blok P3 (lesweek 21-30) | n.v.t. | gelijk |
| datum, week | niet genoemd | ma 12 apr 2027, lesweek 29 | n.v.t. | `waar` zegt "periode 3 (week nog kiezen)" terwijl week 29 al staat |
| herkansbaar | nee (0) | false | n.v.t. | gelijk |
| **Songbox 1** | — | geen toets | model `songbox1-klas3`, weging 1, aan vwo3 w8 gekoppeld | zie havo3.md |
| PTO-oud | P1 "Presentatie Bouw Barok" (herkansbaar), P2 "presentatie Eurovision" per.3, T1 | — | — | nieuwe PTO heeft 2 toetsen |

Richtlijnen: geen herkansbare toets (richtlijn r.94, r.96), omschrijving/leerdoel/toelichting/hulpmiddelen ontbreken bij v3 (r.15-19). Zelfde conflict als havo 3, Vakwerkplan r.937. Toetsweek vwo 3: di 29 jun-di 6 jul 2027, geen muziektoets.

#### 2. Toets naar les-koppeling

**P1** (kerstbox God Rest Ye Merry Gentlemen)
- Toetsles `vwo3:19.1`, ma 25 jan. Model `p1-klas3-waymaker` aan w16-w20 gekoppeld (zelfde als havo 3: w16 leerling, w17 docent+leerling, w18 leerling, w19 docent+scoreblad+leerling, w20 docent+scoreblad). Het model noemt in `thema` beide liederen (Mary's Boy Child voor havo 3, God Rest Ye voor vwo 3); de formulieren spreken van "Het kerstlied".
- Voorbereiding: `vwo3:11.1` (leren kennen), 12.1, 13.1, 14.1, 15.1 (doorspelen en opnemen), 16.1 (oppakken, beoordeling P1 bespreken), 17.1 (tussenstand), 18.1 (laatste repetitie en reflectie). Na de toets 20.1.
- Formatief vooraf: w17 en w18. Aanwezig.
- Stof: God Rest Ye staat in w11-w18 (herkomst, vorm, opbouw). Klopt met de klasmap (`Kerst/God Rest Ye (vwo)`, pptx 11-16 aanwezig). Het PTO noemt alleen "lied", dus niets te missen.
- Vrije maandagen in w16 (4 jan) en w18 (18 jan); lesdag per groep (v3a, v3b) onbekend.
- Evenementen die lessen kunnen raken (alleen notitie in Lesdag, geen uitval): w15 wo 16 dec profielkeuzedag v3; w19 wo 27 jan avond (geen les); w20 di-wo profielkeuzedag v3 (snuffelstage); w26 di herkansingen PTO, wo dagexcursie v3 (jaarplanning-blad C, D); w31 di dagexcursie Limburg.

**T1**
- Toetsles `vwo3:29.1`, ma 12 apr. Geen fasen. Geen model nodig (Musicbox-toets).
- Voorbereiding is anders opgebouwd dan havo 3: w21 snaarinstrumenten, w22 hout/koper, w23 slagwerk/toetsen/elektronica, w24 symfonieorkest, w25 bands en ensembles, w26 rollen in band en orkest (praktijk), w27 oefentoets in Musicbox (formatief), w28 herhaling en vragen (herhaallijst, luisterquiz tien fragmenten, afspraken toetsles). Een volledige theorie-les per onderwerp, zonder songbox. Way Maker begint pas na T1 (w30) en loopt door in periode 4 (w31-34).
- Stof PTO ("alle behandelde thema's") tegen stof Lesdag: zelfde punt als havo 3. Songbox 1 (C'est la vie), de kerstbox en de theorie van w5 "Hoe zit een song in elkaar?" komen niet terug in een oefenles voor T1. Vakwerkplan r.357 en r.747 bevestigen alleen instrumenten, bands en orkesten.
- Lesdag w28 noemt "Tien fragmenten klaargezet"; de map `T1 Theorietoets - Herhaling thema's/Instrumenten toets/Fragmenten` bevat 19 bestanden (01-19). Verschil in aantal, kan een keuze zijn.
- Sectiemap-toetsen: zelfde twee kandidaten als bij havo 3 (Instrumenten toets, of de oude luistertoets "Behandelde Songs").

#### 3. Meldingen controlescript voor vwo 3 (rapport r.85-89)

| Melding | Wat de bron zegt | Oordeel | Voorstel |
|---|---|---|---|
| INFO ma 25 jan, wk 19: toetsles "P1: Groepspresentatie lied" heeft geen fasen | basis.json `vwo3` w19: type toets, geen fasen, wel 3 formulieren als materiaal | geen echte fout; Lesdag-lacune | Optioneel fasen als bb1 w17 (5/35/5). Niet uitgewerkt (toetsles) |
| INFO ma 12 apr, wk 29: toetsles "T1: Herhaling alle behandelde thema's" heeft geen fasen | idem, zonder materiaal | geen echte fout; Lesdag-lacune | Optioneel fasen als bb1 w19. Niet uitgewerkt |

Geen FOUT- of LET OP-meldingen voor vwo 3.

#### 4. Lessen zonder fasen die nog moeten komen (≥ ma 9 nov 2026)

| lesid | titel | opmerking |
|---|---|---|
| vwo3:19.1 | P1: Groepspresentatie lied | toetsles, bewust leeg |
| vwo3:29.1 | T1: Herhaling alle behandelde thema's | toetsles, bewust leeg |
| vwo3:10.1 | Valt uit: activiteitenweek A (profielkeuzeweek) | uitval |
| vwo3:38.1 | Toetsweek vwo 3 | geen toets gepland |

Geen "Nog in te vullen". Alle andere lessen hebben fasen van samen 45 min. Er is geen `vwo3-voorstel.json` gemaakt, omdat er niets uit te werken is (toetslessen en uitval worden niet uitgewerkt). Eerdere uitwerkingen (`inhoud-klas3`, `inhoud-kerst-klas3`, `inhoud-waymaker`) zitten al in basis.json.

Let op: w26 "Rollen in een band en orkest" is een inhoudelijke les voor T1. Valt die in de week met herkansing (di 23 mrt) en dagexcursie v3 (wo 24 mrt), dan zijn er minder lessen voor T1 dan gepland; Lesdag zet w26 niet als uitval (havo 3 doet dat wel met w26).

#### 5. Tegenstrijdigheden en vragen aan Frans

1. **T1-inhoud**: PTO brede titel tegen Vakwerkplan/Lesdag smalle stof; twee mogelijke toetsen in de sectiemap. Welke telt?
2. **Geen herkansbare toets** in vwo 3 (richtlijn r.94, r.96); Vakwerkplan zegt dat dit voor 2027-2028 geregeld wordt.
3. **PTO-omschrijving v3 ontbreekt** (leerdoel, toelichting, hulpmiddelen).
4. **Songbox 1** model met weging 1 zonder PTO- of toets-regel; waar gaat het cijfer naartoe?
5. **Opbouw verschilt van havo 3**: vwo 3 heeft Way Maker in periode 3-4 na T1 en een aparte theoriereeks; havo 3 doet Way Maker in periode 3 en kiest nog een songbox 2. Bewust?
6. **Lesdag per groep** (v3a, v3b) voor vrije maandagen en excursiedagen: w16, w18, w20, w26.
7. **Week 26 vwo 3**: laten uitvallen in Lesdag zoals havo 3, of laten staan?
8. **Privacy**: zie havo3.md punt 9 (ingevulde cijferlijsten en scorebladen van h3 en v3 staan in de gedeelde klas-3-map).


---

## Vwo 4

Bronnen. PTA = `S/bron/PTA_V4_2026-2027.txt` (muziek-deel regel 1137 t/m 1250). SW = `S/bron/Studiewijzer muziek vwo 4 2026-2027_1.txt`. basis = `basis.json` (`leergangen.vwo4`, plus `kalender`, `vrijeDagen`, `toetsweken`). beoord = `beoordeling.json`. JP = `S/bron/jaarplanning.txt`. Checklist = `handboek/pt1-vwo4-checklist-2026-11-09.md` (eigen notitie van Frans/Lesdag, geen schoolbron). Geen PTO-regels voor vwo 4 (PTO is alleen klas 3, BB1, kmu3).

**Wat de bron zegt over PT1.** De PTA noemt voor PT1 geen datum, alleen "Per.1 in les" (PTA r. 1187). De SW noemt "Lesweek 10 (ma 9 nov), in de les" (SW r. 75; ook r. 21 en in "Mijn jaar op één pagina"). basis zegt ma 23 nov (verplaatst). De Checklist zegt dat de SW nog 9 nov noemt en niet is aangepast. JP: activiteitenweek A is lesweek 10, 9 t/m 13 nov, met ma 9 nov "Start Multiculturele samenleving" en wo 11 nov themadag v456 (JP blad A, regels 87 en 89); dat ma 9 nov uitvalt staat in de bronnen niet expliciet (alleen in de Checklist, "volgens Zermelo").

#### 1. Toetsentabel

| Toets | Soort | Weging | Duur (min) | Periode | Datum / week | Herkansbaar | Verschil |
|---|---|---|---|---|---|---|---|
| **PT1** Samenspel en zang (SW r. 75; PTA r. 1187) | praktijk | PTA 3; basis 3; beoord 3 | PTA 90; basis 90 | PTA Per.1; basis blok P1 (lesweek 1-10) | PTA geen datum; SW lesweek 10, ma 9 nov; basis lesweek 10, datum 23 nov | PTA nee; basis nee; beoord nee; SW nee | Datum: SW 9 nov tegenover basis 23 nov. Duur: PTA/basis 90 min, maar de toetsles 10.1 is 45 min (fasen 5+30+10). |
| **T1** Jazz en vroege pop | theorie | PTA 7; basis 7; beoord — | PTA 60; basis 60 | PTA TW3; basis blok P1+P2 | PTA TW3 (geen datum); SW TW3 5-13 apr; basis ma 5 apr 2027, lesweek 28 | PTA ja, herk.week "TW3"; basis ja, 18 mei 2027; SW ja, di 18 mei | Herkansing: PTA "TW3" tegenover SW en basis 18 mei. Exacte T1-dag niet in de bronnen. |
| **PT2** Solowerk en eigen compositie | praktijk | PTA 3; basis 3; beoord 3 | PTA 45; basis 45 | PTA Per.4; basis P4 (lesweek 31-38) | PTA geen datum; SW lesweek 35, 7 jun; basis ma 7 jun, lesweek 35; notatie inleveren lesweek 34 | PTA nee; basis nee; beoord nee | Geen. |
| **T2** Barok met herhaling | theorie | PTA 7; basis 7; beoord — | PTA 60; basis 60 | PTA TW4; basis P3+P4 | PTA TW4; SW TW4 23 jun - 2 jul; basis ma 28 jun, lesweek 38 | PTA nee; basis nee; SW nee | Alleen de exacte dag: basis zet "28 jun" (eerste lesdag van de toetsweek), de bronnen noemen alleen de toetsweek. |
| **H1** Concert De Doelen (1) | handelingsdeel | nvt | 0 | — | PTA uiterste inleverdatum 26-04-2027; basis do 15 okt 2026 (week 7), deadline 26-04-2027 | nee | Geen. PTA noemt de concertdatum niet; SW: do 15 okt. |
| **H2** Tweede concert | handelingsdeel | nvt | 0 | — | PTA deadline 26-04-2027; basis do 18 feb 2027, deadline 26-04-2027 | nee | Geen. SW: do 18 feb (De Doelen) of zelf geregeld. |
| **H3** Messiah Leiden | handelingsdeel | nvt | 0 | — | PTA "in **februari**"; deadline 26-04-2027; basis vr 12 mrt 2027; SW vr 12 mrt | nee | **PTA februari, SW en basis 12 maart.** |
| **H4** Muzikale bijdrage | handelingsdeel | nvt | 0 | — | PTA deadline 03-04-2027; basis datum 16 jan 2027 (open dag), deadline 03-04-2027 | nee | Geen. |

Verder gecontroleerd en in orde: SE-aandeel 20% (PTA r. 1151; basis 3+7+3+7); toetsweken vwo 4 TW1 2-6 nov, TW2 18-25 jan, TW3 5-13 apr, TW4 23 jun - 2 jul (basis, SW, JP-rijen "TW1 - v4" enzovoort, in lesweken 9, 18/19, 28/29, 37/38). Opmerking over de bron: de datumgetallen in JP bij die rijen en bij de drie herkansingsdagen staan een jaar te vroeg (2026 in plaats van 2027); de lesweken en weekdagen kloppen wel met 2027.

beoord: er bestaan modellen `pt1-vwo4` en `pt2-vwo4`, geen model voor T1 en T2 (theorie in Musicbox, geen beoordelingsmodel nodig). Weging 3 en niet herkansbaar komen overeen met de PTA.

#### 2. Toets, les en beoordelingsmodel

| Toets | Toetsles in basis | Model en gekoppelde lessen | Voorbereiding | Stof uit PTA in de lessen? |
|---|---|---|---|---|
| **PT1** | 10.1 (lesweek 10, nominaal ma 9 nov, 45 min) heeft `toets: PT1` en fasen 5+30+10. Echte datum ma 23 nov volgens basis `toetsen[0]` en de Checklist; basis `lessen` blijft de nominale datum 9 nov tonen. | `pt1-vwo4`: zelfbeoordeling in 8.1, 8.2 en 10.2; in 10.1 docentformulier, scoreblad en zelfbeoordeling. Past bij de Checklist (generale 10.2). | 7.1 praktijk de basis; 8.1 samenspel; 8.2 improviseren op de bluestoonladder in A (nieuw); 10.2 generale. Daarvoor theorie 2.1-6.2. | Ja: samenspel en zang (8.1, 10.1), improvisatie in twaalfmatenschema, call-and-response (8.1, 15.2), spirituals en worksongs "bij A3" (2.2). Zie wel de verschillen in meldingen 1 en 2. |
| **T1** | 28.1 ma 5 apr: `toets: T1`, geen fasen (toetsles, computer in toetsweek). | Geen model. | Herhalen 25.1, 26.1; oefentoets 20.1 en 27.2; 15.1 en 11.1 t/m 17.2 voor pop. | Alle genoemde stijlen en begrippen komen aan bod, behalve: **"protest"** (A3, PTA r. 1235: "rol van muziek als vorm van geloofsexpressie en protest") staat in geen enkele les; het SW noemt het alleen in het blokdoel. **"triolenfeel"** is als term niet in de lessen; alleen "swing voelen" (1.2). **"backbeat"** staat in 7.1, 10.1 en 17.2 maar niet in de theorielessen 11.1/12.1 (SW 11.1 noemt het wel). **Dirty intonation** alleen in 2.1. Overige PTA-begrippen (blue note, twaalfmatenschema, call-and-response, walking bass, riff, melodie- en ritmesectie) zijn aanwezig. |
| **PT2** | 35.1 en 35.2 (7 en 9 jun), `toets: PT2`, geen fasen. | `pt2-vwo4`: zelfbeoordeling in 29.2, 33.2, 34.2; docent, scoreblad en zelfbeoordeling in 35.1; docent en scoreblad in 35.2. Criteria dekken PTA (solowerk, barokke bouw, notatie min. 12 maten, uitvoering, uitleg). | 29.2 start PT2; 30.2 schets 1 (4 maten baslijn); 31.2 schets 2 (acht maten); 33.2 generale solowerk; 34.2 laatste repetitie, notatie inleveren. | **Gat:** PTA eist een compositie van **minimaal 12 maten**, maar de lessen komen tot 8 maten (31.2 "tot acht maten") en 32.2 is theorie. Wie de laatste 4 maten maakt, staat nergens in de lessen; SW noemt alleen "netjes noteren" thuis in week 32. **B2 "improviseren en componeren vanuit een probleemstelling"** (PTA r. 1208): "probleemstelling" komt in geen les voor. |
| **T2** | 38.1 ma 28 jun: `toets: T2`, geen fasen (toetsles). | Geen model. | Oefentoets 36.1; laatste vragen 37.1; 24.1, 29.2, 30.1, 31.1, 32.2, 33.1, 34.1 voor de stof. | Basso continuo (24.1), voortspinnen (29.2), terrassendynamiek (24.1, 31.1), concerteren: concerto grosso (30.1), soloconcert (31.1), dubbelkorigheid (32.2), fuga (33.1, 34.1): ja. **"Contrastwerking"** (PTA r. 1242) staat niet in lesteksten (SW noemt het bij het huiswerk week 29 en 31). Barokorkest-instrumenten: 24.1. Religieuze context: 21.1, 32.2. |

#### 3. Meldingen controlescript voor vwo 4

Rapport `rapport-lesgegevens-2026-11-08.txt`, blok "vwo 4": 1 LET OP, 7 FOUT (waarvan 2 in het verleden), 4 INFO (toetslessen T1, PT2 twee keer, T2). Per melding:

| # | Melding (ingekort) | Wat de bron zegt | Oordeel en voorstel |
|---|---|---|---|
| 1 | LET OP: toets PT1 heeft week 10 (ma 9 nov) maar datum ma 23 nov | PTA geen datum (r. 1187). SW r. 75: lesweek 10, ma 9 nov. basis `toetsen`: week 10, 23 nov, "verplaatst". JP: lesweek 10 is activiteitenweek A, ma 9 nov start multiculturele samenleving, wo 11 nov themadag. | **Lesdag-inconsistentie, geen bronfout**: `week` is een lesweek-nummer, `datum` is de echte dag. Het script vergelijkt die twee. Voorstel: regel van het script laten weten dat een verplaatste toets met `waar: ... (verplaatst)` mag afwijken, of in basis expliciet `lesweek` en `datum` scheiden. SW (9 nov) staat nog niet bijgewerkt; dat is aan Frans. |
| 2 | FOUT: 15.1 "Rhythm & blues (2): de kerk en de straat" (ma 14 dec) heeft geen fasen | SW week 15 les 1 geeft terugblik, uitleg, luisteren, kaart TL 1a/SW pop, thuis. | **Lesdag-fout (ontbrekend)**, nog te komen. Voorstel staat in `vwo4-voorstel.json`. |
| 3 | FOUT: 18.1 "Toetsweek 2: geen muziektoets" op ma 18 jan, vrije dag, niet als uitval gemarkeerd | JP "Ontwikkeldag" rij: ma 18 jan staat daar (markering "s"); basis `vrijeDagen` bevat 2027-01-18. SW noemt voor wk 18 (3) alleen "toetsweek 2: geen toets muziek", en voor ma 25 jan wel "Valt uit". | **Geen echte fout.** Het type is al `toetsweek` (geen lesinhoud) voor zowel 18.1 als 18.2, net als in TW1 (9.1, 9.2). Of ma 18 jan echt een vrije dag voor leerlingen is, staat in de bronnen alleen via de marker "s"; niet vast te stellen wat "s" betekent (14 okt heeft "t"). Voorstel: óf 18.1 op `uitval` zetten met "Valt uit: ma 18 jan ontwikkeldag", óf het script laten overslaan bij type `toetsweek`. Vraag 4. |
| 4 | FOUT: 21.1 "De barok en het oratorium" (ma 8 feb) geen fasen | SW week 21 les 1: terugblik, uitleg, Pifa, kaart SW barok, thuis. | **Lesdag-fout (ontbrekend)**, nog te komen. Voorstel in JSON. |
| 5 | INFO: toetsles 28.1 "Toetsweek 3: T1 ... (60 min)" geen fasen | PTA r. 1220: T1 op de computer in toetsweek (CE-vorm, MusicBox). | **Geen echte fout**: toetsweek-toetsles zonder lesinhoud, bewust. Niet uitgewerkt. |
| 6 | FOUT: 30.1 "Concerteren (1): het concerto grosso" (ma 19 apr) geen fasen | SW week 30 les 1: terugblik sequens, uitleg, Corelli en Händel op. 6, hand op bij wissel. | **Lesdag-fout (ontbrekend)**, nog te komen. Voorstel in JSON. |
| 7 | FOUT: 32.2 "Dubbelkorigheid en vocale vormen" (wo 19 mei) geen fasen | SW week 32 les 2: Gabrieli, Matthäus-Passion, Wachet auf, tabel vocale vormen. | **Lesdag-fout (ontbrekend)**, nog te komen. Voorstel in JSON. |
| 8 | INFO: toetsles 35.1 "Praktijktoets 2: solowerk en eigen compositie" geen fasen | PTA r. 1203-1215: PT2 in de les, 45 min per kandidaat. | **Geen echte fout** maar wel een keuze: PT1-toetsles 10.1 heeft wel fasen. Voorstel: 35.1 en 35.2 ook fasen geven (opstelling, volgorde van de uitvoeringen in groepjes voor de docent, notatie ophalen), alleen als Frans dat wil. Niet uitgewerkt. |
| 9 | INFO: toetsles 35.2 "Praktijktoets 2, vervolg" geen fasen | Zie 8. SW: "Resterende uitvoeringen". | Zie 8. |
| 10 | INFO: toetsles 38.1 "Toetsweek 4: T2 ... (60 min)" geen fasen | PTA r. 1239: T2 computer in TW4. | **Geen echte fout**, zoals 28.1. |
| 11 | FOUT (verleden): 2.2 "Blues: de achtergrond" (wo 9 sep) geen fasen | SW week 2 les 2: worksongs, spirituals, Swing low en Didn't my Lord. | Les is in het verleden; de inhoud ontbreekt wel voor de lesmodus. Alleen noemen. |
| 12 | FOUT (verleden): 3.1 "Blues: luisteren" (ma 14 sep) geen fasen | SW week 3 les 1: Robert Johnson, St. Louis Blues, luisterdictee. | Idem. |

#### 4. Lessen zonder fasen die nog moeten komen (lesweek ≥ 10, datum ≥ ma 9 nov)

Geen enkele les heeft "Nog in te vullen" (gezocht in `leergangen.vwo4`: 0 treffers). Wel zonder fasen:

| Les-id | Datum (nominaal) | Titel | Opmerking |
|---|---|---|---|
| vwo4:15.1 | ma 14 dec | Rhythm & blues (2): de kerk en de straat | uitgewerkt in voorstel |
| vwo4:21.1 | ma 8 feb | De barok en het oratorium | uitgewerkt in voorstel |
| vwo4:30.1 | ma 19 apr | Concerteren (1): het concerto grosso | uitgewerkt in voorstel |
| vwo4:32.2 | wo 19 mei | Dubbelkorigheid en vocale vormen | uitgewerkt in voorstel |
| vwo4:28.1 | ma 5 apr | Toetsweek 3: T1 jazz en vroege pop (60 min) | toetsles, bewust leeg, niet uitgewerkt |
| vwo4:35.1 | ma 7 jun | Praktijktoets 2: solowerk en eigen compositie | toetsles, niet uitgewerkt (zie melding 8) |
| vwo4:35.2 | wo 9 jun | Praktijktoets 2, vervolg | toetsles, niet uitgewerkt |
| vwo4:38.1 | ma 28 jun | Toetsweek 4: T2 barok met herhaling (60 min) | toetsles, bewust leeg |

Alleen verleden: 2.2 en 3.1 (hierboven). Toetsweek- en uitvalsdagen (9.1, 9.2, 18.1, 18.2, 28.2, 38.2 en de uitval-lessen) hebben bewust geen fasen.

#### 5. Tegenstrijdigheden en vragen aan Frans

Tegenstrijdigheden (niet opgelost):

1. **PT1-datum.** SW r. 21, 75: lesweek 10, ma 9 nov. basis en Checklist: ma 23 nov. PTA noemt geen datum. SW is niet bijgewerkt (Checklist, punt 5).
2. **PT1-stuk en toonsoort.** SW r. 331 en 342: Mo' Better Blues of When I walk hand in hand; improviseren in C. basis, beoord en Checklist: Backwater blues in A (besluit Frans, 4 nov). SW sluit hier niet bij aan.
3. **PT1-duur.** PTA r. 1187 en basis: 90 min. Toetsles 10.1 duurt 45 min (fasen 5+30+10) voor één groep van vijf (Checklist). Of de rest van de 90 min via 10.2/generale of een tweede uur loopt, staat nergens.
4. **T1-herkansing.** PTA r. 1220: herkansing in "TW3". SW r. 84 en 949 en basis: di 18 mei 2027 (JP: dinsdag herkansing in lesweek 32). De PTA-verwijzing naar TW3 klopt dus niet met de andere bronnen.
5. **Messiah H3.** PTA r. 1170: uitvoering in Leiden "in februari". SW en basis: vr 12 mrt 2027.
6. **18 jan.** JP markeert ma 18 jan als ontwikkeldag ("s"); SW noemt geen uitval op ma 18 jan (wel op ma 25 jan); basis zet de dag in `vrijeDagen`.
7. **Studiewijzer, aantal lessen.** SW noemt 33 theorie en 22 praktijk (SW r. 51-52); basis telt 33 theorie en 23 praktijk, omdat 10.2 (vroeger uitval themadag, wo 11 nov) nu de generale PT1 is.

Vragen aan Frans:

1. Mag ma 18 jan als `uitval` worden gemarkeerd, of blijft 18.1 een toetsweekles met alleen een nominale datum? (melding 3)
2. PT1-datum in SW (9 nov) en PTA: pas jij die aan, of blijft de SW zoals die is tot na PT1? (tegenstrijdigheid 1)
3. Na het verschuiven (9 en 11 nov vervallen; 8.2 op 16 nov, generale 18 nov, PT1 23 nov, pop begint 25 nov) schuiven alle lessen vanaf 11.1 ongeveer twee lessen op. Blijven T1, PT2 en T2 vast aan de toetsweken (5-13 apr, lesweek 35, 23 jun - 2 jul), en gaat er dan stof vervallen of schuiven? Basis geeft voor lessen vanaf lesweek 11 alleen nominale data.
4. Compositie PT2 (PTA: minimaal 12 maten; lessen: 4 en 8 maten): in welke les maken de leerlingen de laatste vier maten en noteren ze? 31.2 en 32.2 hebben er geen ruimte voor.
5. "Probleemstelling" (PTA, B2) en "protest" (PTA, A3 bij T1) komen niet in de lessen voor. Wil je die erbij, en in welke les?
6. 15.1: wat vonden de kerken van rhythm & blues? De bronnen geven geen antwoord; ik heb het bewust open gelaten (zie voorstel).
7. 21.1: welk operafragment gebruik je naast Messiah-fragmenten voor het wisbordje oratorium of opera? De bronnen noemen er geen.
8. 35.1 en 35.2: fasen laten uitwerken zoals bij PT1-toetsles 10.1?
9. De duur van PT1 (90 min in PTA) tegenover 45 min toetsles: wat is de bedoeling? (tegenstrijdigheid 3)


---

## Vwo 5

Peildatum 8 nov 2026. Alleen gelezen, niets aangepast. Geen leerlingnamen.

Afkortingen bronnen:
- **PTA** = `S/bron/PTA_V5_2026-2027.txt`, muziekdeel r. 1786-2113.
- **SW** = `S/bron/Studiewijzer muziek vwo 5 2026-2027_1.txt`.
- **BASIS** = `basis.json`, `leergangen.vwo5` (ook in `S/data/vwo5.json`).
- **BEO** = `beoordeling.json`.
- **OP** = `OPEN-PUNTEN.md` in `lesdag-werk/pta-inhoud` (r. 124 en 125 gaan over lesweek 10 en 12).

Datums van lessen zijn zelf uitgerekend: les 1 en 2 op maandag, les 3 op donderdag van de lesweek (`kalender.weken`). In `S/data/vwo5.json` is `datum` bij de lessen leeg.

#### 1. Toetsentabel

PTA-kolommen: soort, nr, toetsweek/periode, weging, herkansbaar, herk.week, duur. Weging in % SE.

| Toets | Soort | Weging | Duur (min) | Periode | Datum (week) | Herkansbaar | Verschil |
|---|---|---|---|---|---|---|---|
| **P9 Solowerk en samenspel** | | | | | | | |
| PTA r. 1966 | praktijk | 6 | 45 | Per.1, in les | geen datum | nee | |
| BASIS | praktijk | 6 | 45 | P1 (wk 1-10) | **ma 23 nov 2026 (wk 12)**, "in twee lessen" | nee | **Datum en periode.** BASIS zegt wk 12 (periode 2, na wk 10). PTA zegt Per.1. SW zegt lesweek 8, 26 okt. De toetsles staat in BASIS in wk 8. |
| SW r. 75-77 | praktijk | 6 | 45 | blok 1 | lesweek 8 (ma 26 okt), les 1 en 3 | nee | datum verschilt van BASIS |
| BEO `vwo5-P9` | | 6 | | | gekoppeld aan 7.2, 8.1, 8.2, 8.3 (wk 7-8) | nee | model volgt wk 8, niet wk 12 |
| **T5 Classicisme en romantiek** | | | | | | | |
| PTA r. 2073 | theorie (CE-vorm) | 14 | 90 | TW2 | TW2 | ja, herk.week "TW2" | |
| BASIS | theorie | 14 | 90 | P1+P2 | **ma 18 jan 2027 (wk 18)**, TW2 18-26 jan | ja, di 9 mrt 2027 | **Dag:** 18 jan is een vrije dag in BASIS. **Herkansing:** PTA noemt "TW2", BASIS en SW noemen 9 mrt. |
| SW r. 80-84 | theorie | 14 | 90 | TW2 | TW2 (18-26 jan) | ja, di 9 mrt | |
| BEO | geen model (theorie) | | | | | | geen verschil: theorie heeft geen model |
| **P10 Eigen compositie** | | | | | | | |
| PTA r. 1978 | praktijk | 6 | 45 | Per.4, in les | geen datum | nee | |
| BASIS | praktijk | 6 | 45 | P3+P4 | ma 7 jun 2027 (wk 35), "les 1 en les 3" | nee | domein BASIS alleen B2, PTA B1 en B2. Blok "P3+P4" tegenover Per.4. |
| SW r. 85-90 | praktijk | 6 | 45 | blok 4 | lesweek 35 (7 jun), les 1 en 3 | nee | |
| BEO `p10-vwo5` | | 6 | | | 25.1, 33.2, 34.1, 35.1, 35.2, 35.3 | nee | geen verschil |
| **T6 Moderne jazz en gouden popjaren** | | | | | | | |
| PTA r. 2092 | theorie (CE-vorm) | 14 | 90 | TW4 | TW4 | nee | |
| BASIS | theorie | 14 | 90 | P3+P4 | ma 28 jun 2027 (wk 38), TW4 23 jun-2 jul | nee | geen verschil |
| SW r. 91-96 | theorie | 14 | 90 | TW4 | TW4 (23 jun-2 jul) | nee | |
| BEO | geen model | | | | | | n.v.t. |
| **H5 Concert De Doelen (1)** | | | | | | | |
| PTA r. 1834 | handelingsdeel | nvt | | | uiterlijk 3 apr 2027 | nee | |
| BASIS | handelingsdeel | | | | do 15 okt 2026 (wk 7), deadline 3 apr 2027 | | SW noemt dezelfde datum |
| **H6 Tweede concert** | | | | | | | |
| PTA r. 1839 | handelingsdeel | nvt | | | uiterlijk 3 apr 2027 | nee | PTA: professionele musici, "De Doelen of zelf geregeld" |
| BASIS | handelingsdeel | | | | do 18 feb 2027 (wk 22) | | Datum klopt met SW (Handelingsdelen: do 18 feb) |
| **H7 Messiah in Leiden** | | | | | | | |
| PTA r. 1850 | handelingsdeel | nvt | | | "in maart, een hele vrijdag en avond" | nee | |
| BASIS | handelingsdeel | | | | vr 12 mrt 2027 (wk 24) | | klopt met SW |
| **H8 Muzikale bijdrage** | | | | | | | |
| PTA r. 1856 | handelingsdeel | nvt | | | uiterlijk 3 apr 2027 | nee | geen datum in PTA |
| BASIS | handelingsdeel | | | | **za 16 jan 2027 (wk 17)**, open dag | | De datum is één van de keuzes uit de PTA (koor/ensemble, open dag, coaching, lokaal/instrumenten). Als "de" datum is dat te smal. |

Rijen in de PTA die Lesdag niet kent (PTA r. 1860-2072, cursus-label **2025-2026**):
- P1 t/m P8: weging 1, nee, 20 of 90 min. Dit zijn Speelstuk samen, vier Muzikale moodboards, Speelstuk individueel, Zangstuk of koorstuk, Speelstuk samen.
- T1 t/m T4: Vroege jazz, Barok, Romantiek, Vroege pop. Weging 3 elk, T1-T3 herkansbaar.
- Optelsom wegingen P1-P8 (8) + T1-T4 (12) = 20. Samen met P9, T5, P10, T6 (40) is dat 60, het getal uit PTA r. 1801 ("Eindcijfer klas 5 is 60% van het eindcijfer SE").
- Dezelfde moodboard-rijen staan ook in `PTA_V6` (r. 2505-2554). Het zijn dus waarschijnlijk restanten van een vorig jaar, niet rijen voor deze klas.
- SW r. 58 zegt: 40% in vwo 5 plus 20% in vwo 4 = 60% na vwo 5. Dat klopt met de vier toetsen in Lesdag (BASIS `meta.seAandeel`). Zie vraag 4.

#### 2. Toets → les-koppeling

### P9 (6%, solowerk en samenspel)

- **Toetsles in BASIS:** vwo5:8.1 (ma 26 okt) en 8.3 (do 29 okt). Beide zijn al voorbij.
- **Besluit Frans 4-11 (OP r. 124):** P9 staat op ma 23 nov, een tegelijk, eigen hoek, Frans staat erbij. De decks staan klaar (`tools/inhoud-p9-23nov.json`: 13:40-14:25, vervolg 15:25-16:10). De les-id's blijven 8.1 en 8.3. Links en lesteksten in BASIS "moeten nog volgen".
- **Koppeling BEO:** model `vwo5-P9` is gekoppeld aan 7.2 (leerling), 8.1 (docent/scoreblad/leerling), 8.2 (leerling), 8.3 (docent/scoreblad). Het volgt dus wk 8, niet de nieuwe datum.
- **Wat er op ma 23 nov (wk 12) nu in BASIS staat:** 12.1 "Romantisch stuk / Wiegenlied begeleiden met omkeringen" (Messiah nr. 17) en 12.2 "Chromatiek". Geen toetsles. Als P9 beide uren van die maandag vult, valt die inhoud weg. Zie vraag 1.
- **Voorbereiding vooraf (alle voorbij):**
  - 2.1 Solowerk kiezen
  - 2.2 Samenspelstuk: je partij
  - 3.1 de moeilijkste vier maten
  - 3.2 Tempo en inzetten
  - 4.1 en 4.2 Dynamiek
  - 5.1 Frasering en dynamiek
  - 5.2 Samenspel: balans
  - 7.1 Luistergids en try-out
  - 7.2 Opname-try-out met het P9-format
- **PTA-omschrijving:** solowerk instrumentaal en samenspel rond het classicisme, B1 én B2, hulpmiddelen instrument, bladmuziek, begeleiding, beoordeling "presentatie, muzikaliteit en samenspel volgens het ELO-format" (PTA r. 1967-1976).
  - Het BEO-model heeft precies deze drie groepen: Presentatie, Muzikaliteit, Samenspel. **Gedekt.**
  - BASIS-domein is alleen B1. De PTA noemt ook B2. Stof dat verwijst naar "Improviseren en componeren" zit niet in de lessen voor P9. Zie verschil in tabel en vraag 5.
- **Stof:** niets ontbreekt. Het P9-stuk komt uit de leerlingkeuze (2.1) en samenspelstuk (2.2).

### T5 (14%, classicisme en romantiek)

- **Toetsles in BASIS:** vwo5:18.1, ma 18 jan, "Toetsweek 2: T5 ... (90 min)". Geen fasen. 18.2 (ma 18 jan) en 18.3 (do 21 jan) zijn "Toetsweek 2".
- **Dag:** ma 18 jan is volgens BASIS "Ontwikkeldag 2: secties (lln vrij)". Zie meldingen 3-5 hieronder.
- **Model:** geen beoordelingsmodel. Dat is correct (theorietoets).
- **Voorbereiding:**
  - Hoofdvorm: 4.3, 7.3 (partituuranalyse), 10.1 (terugblik), 17.1 (herhalen hoofdvormanalyse)
  - Romantiek: 11.3, 12.3, 13.3, 14.3, 15.3, 16.3
  - Oefentoets: 17.3 (do 14 jan), 30 min toets + 15 min nakijken
  - Terugblik elke les 1; thuis: Musicbox-blokken, begrippen overhoren (wk 14), CL 2 (wk 15), analyseblad (wk 16)
- **Dekking PTA-omschrijving** (PTA r. 2073-2091). Per begrip de les waarin het in BASIS staat:

| PTA noemt | Les |
|---|---|
| strenge periodebouw, albertijnse bas, cadensen | 1.3, 3.3 |
| hoofdvorm (expositie, doorwerking, reprise) | 4.3, 7.3, 10.1, 17.1 |
| toenemende chromatiek, leidtoonspanning, tertsverwantschap | 12.2, 12.3, 13.1 |
| rubato | 10.1, 11.1, 11.3, 12.1, 13.1, 17.2 |
| symfonisch gedicht | 14.3 |
| analyseren met partituur | 7.3, 17.1, 17.3 |
| klassiek symfonieorkest, strijkkwartet (A1) | 2.3, 3.3 |
| mis, requiem, oratorium; geloof (Christelijke lijn) | 5.3 (voorbij), 15.3 (Elias naast Messiah) |

  **Alles uit de PTA-omschrijving zit in een les.**
- **Wel in SW, niet (of alleen thuis) in de lesteksten** (geen PTA-eis, wel onderdeel van de SW-afvinklijst en het leerdoel van blok 2):
  - unisono-momenten: SW r. 203 en 626 (T5-afvinklijst); geen les noemt het (1.3 niet)
  - menuet: alleen thuis-veld wk 2; 3.3 noemt "symfonie in vier delen" zonder menuet
  - ritenuto en accelerando: SW r. 408 (leerdoel blok 2); geen les noemt ze (de SW noemt accelerando bij Grieg in 14.3; BASIS 14.3 noemt het niet)
  - sforzando: SW r. 408 en 634; alleen thuis-veld wk 14
- **Hoofdvormanalyse:** de PTA noemt "grote analyse-opdracht aan de hand van een partituur". Daar wordt aan geoefend in 7.3 (voorbij), 17.1 en 17.3. Geen enkele les bereidt een tweede werk voor dan Beethoven op. 2 nr. 1. Dat is in de SW zo bedoeld, maar de PTA zegt niets over welk stuk.

### P10 (6%, eigen compositie)

- **Toetsles in BASIS:** 35.1 (ma 7 jun) en 35.3 (do 10 jun). Beide hebben geen fasen. 35.2 "Inspelen en terugkijken" heeft 1 fase.
- **Model `p10-vwo5`:** gekoppeld aan 25.1, 33.2, 34.1, 35.1 (docent, scoreblad, leerling), 35.2 en 35.3 (docent, scoreblad). Klopt met de lessen. Criteria in het model: probleemstelling (2), middelen en stijl (2), bouw en lagen (1), schetsen (1), notatie (1), uitvoering (2), presentatie en toelichting (1) = 10.
- **Voorbereiding:**
  - 25.1 start P10
  - 25.2 schets 1
  - 26.1 feedback
  - 26.2 schets 2 (12 maten)
  - 30.2 schets 3 (tweede laag)
  - 31.2 schets 4 (24 maten)
  - 33.1 instuderen
  - 33.2 repeteren (Notatie en schetsen inleveren: wk 33, alleen als thuis-extra)
  - 34.1 generale
  - 34.2 laatste opname
- **Dekking PTA-omschrijving** (PTA r. 1978-1988):
  - **Gedekt:** probleemstelling, minimaal 24 maten, vier schetsen, solo of samen, opnames, generale.
  - **Niet gedekt door een les:**
    - "ritmisch werk minimaal 3 partijen": staat in SW (schets 3, wk 30) en in de P10-checklist, niet in BASIS 30.2 (detail zegt "Baslijn, tweede stem of ritmepartij")
    - "mag uit meer korte werken bestaan"
    - "notatie via notatieprogramma of handgeschreven": geen les over notatie of over het kiezen/leren van een notatieprogramma. Alleen de deadline (wk 33) staat in een thuis-veld.
    - "eventueel opname-/productiesoftware (DAW)": nergens in de lessen bij P10
  - PTA zegt "Uiterste inleverdatum nvt". De deadline wk 33 (ma 24 mei) komt uit de SW en BASIS, niet uit de PTA.
  - BASIS-domein is alleen B2; de PTA geeft B1 en B2.

### T6 (14%, moderne jazz en gouden popjaren)

- **Toetsles:** 38.1, ma 28 jun, geen fasen. 38.2 en 38.3 zijn "Toetsweek 4". 37.3 (do 24 jun) valt uit.
- **Model:** geen (theorie).
- **Voorbereiding:** 20.3 t/m 33.3 (stijlen), 25.3 luistercarrousel, 26.3 jazzlijn, 27.3 oefenset, 34.3 door elkaar luisteren, 36.3 oefentoets T6, 37.2 foutenlijst.
- **Dekking PTA-omschrijving** (PTA r. 2092-2105): **alles is gedekt.**

| PTA noemt | Les |
|---|---|
| bebop | 20.3, 21.1, 21.3 |
| cool jazz | 21.3, 22.1 |
| free jazz | 22.3, 23.1 |
| jazz-rock | 23.3 |
| nu-jazz | 24.3 |
| soul (Stax, Motown) | 29.3, 30.1 |
| British Invasion | 30.3, 31.1 |
| funk | 31.3 |
| bluesrock, folkrock | 32.3, 33.1 |
| hardrock/metal, symfonische rock | 33.3 |
| chromatiek in melodie en harmonie | 20.3 |
| brushes, dempers | 21.3 |
| slapping | 31.3 |
| powerchords | 33.3, 34.1 |
| distortion | 30.3, 32.3 |
| multitrack recording | 32.3 |

- **Christelijke lijn** (gospelwortels van soul, rol van geloof in Afro-Amerikaanse traditie): 29.3 heeft een gesprek "gospel en soul" en luistert Amazing Grace. Een expliciete behandeling van "de rol van geloof in de Afro-Amerikaanse muziektraditie" staat er niet; wel de gospel-kant. Voorstel: laten staan of de gesprekskop in 29.3 uitbreiden. Past bij de PTA-zin; geen eis in de toetsvorm.

### Handelingsdelen

Alle vier staan in BASIS met deadline 3 apr 2027 (zelfde als PTA r. 1839-1860). Datums H5-H7 kloppen met de SW. Zie vraag 8 en 9.

#### 3. Meldingen uit het controlescript voor vwo 5

Rapport `rapport-lesgegevens-2026-11-08.txt`: 1 LET OP, 4 FOUT, 4 INFO.

| # | Melding (ingekort) | Wat de bron zegt | Oordeel | Voorstel |
|---|---|---|---|---|
| 1 | LET OP: P9 (wk 12) valt buiten periode P1 (wk 1-10) | PTA r. 1966: P9 is "Per.1". SW r. 75-77: P9 in lesweek 8, blok 1. OP r. 124: Frans (4-11) verplaatste P9 naar ma 23 nov (wk 12, periode 2 volgens BASIS `blokken`: P2 = wk 11-20; SW: blok 2 = lesweek 11 t/m 20). | **Bron-fout, door besluit Frans.** Lesdag volgt Frans, maar PTA en SW zeggen nog Per.1 en 26 okt. | Frans legt de verschuiving vast als PTA-wijziging (periode 2 of "Per.1, uitgesteld") en past de SW aan. In Lesdag niets te wijzigen aan het blok. |
| 2 | FOUT: P9 heeft week 12, maar de toetsles staat in wk 8 (ma 26 okt, do 29 okt) | OP r. 124: les-id's blijven 8.1 en 8.3, de lesteksten in BASIS "moeten nog volgen". Deck gemaakt voor 23 nov. | **Lesdag-fout (nog niet doorgevoerd).** De meldingen verdwijnen pas als toets en toetsles op dezelfde week staan. | Optie A: toets P9 `week` en `datum` op wk 8 laten en `waar` aanpassen ("verplaatst naar ma 23 nov"). Optie B (beter): toetsles-lessen verplaatsen naar wk 12 l1 en l2 (ma 23 nov), BEO-lessen `vwo5-P9` van 7.2/8.x naar 11.x/12.x, `blokken.P1.toetsing` en tekst "lesweek 8" aanpassen. Keuze aan Frans, vraag 1. |
| 3 | FOUT: T5 staat op ma 18 jan, een vrije dag | BASIS `vrijeDagen` en sectie-event `od2` ("Ontwikkeldag 2: secties (lln vrij)", 18 jan). Jaarplanning: rij Ontwikkeldag heeft een markering (s) op 18 jan. Dezelfde jaarplanning zegt "TW2 - v5, lesweek 18/19, ma t/m di" (= ma 18 jan - di 26 jan; PTA r. 2073 "TW2"). SW r. 84: T5 "toetsweek 2 (18-26 jan)". | **Tegenstrijdigheid binnen de bronnen.** De toetsweek begint formeel op een dag dat leerlingen vrij zijn. De werkelijke dag van T5 staat in geen bron. Het rooster van TW2 ontbreekt in `tw1.txt`. | `datum` van T5 niet op 18 jan zetten zonder rooster. Wachten op rooster TW2. Tot dan "TW2: dag volgt". Vraag 2. |
| 4 | FOUT: 18.1 (T5) op ma 18 jan, vrije dag, niet als uitval | Zie 3. | **Lesdag-fout.** Het uur staat als toetsles op een dag zonder les. | 18.1 als `uitval` ("Valt uit: ma 18 jan ontwikkeldag") zetten, zoals 16.1 en 16.2. De T5-toets blijft in TW2, de toetsles-koppeling verhuist naar het uur waarop de toets echt valt. |
| 5 | FOUT: 18.2 "Toetsweek 2" op ma 18 jan, vrije dag, niet als uitval | Zie 3. | **Lesdag-fout** (zelfde oorzaak). | 18.2 als uitval markeren. 18.3 (do 21 jan) mag "Toetsweek 2" blijven. |
| 6 | INFO: 18.1 toetsles heeft geen fasen | Toetsles, geen fasen nodig. | **Geen echte fout.** | Laten staan (zie punt 4). |
| 7 | INFO: 35.1 P10 toetsles geen fasen | Toetsles. | **Geen echte fout.** | Laten. Wel beoordeling bij de les (BEO) aanwezig. |
| 8 | INFO: 35.3 P10 vervolg geen fasen | Toetsles. | **Geen echte fout.** | Laten. |
| 9 | INFO: 38.1 T6 toetsles geen fasen | Toetsles. | **Geen echte fout.** | Laten. |

Extra bevindingen buiten het script:
- Het script meldt niet dat **ma 9 nov (nu al komende maandag)** volgens OP r. 124 vervalt voor v4 en v5 (Zermelo, besluit Frans 4-11), terwijl 10.1 en 10.2 in BASIS gewone lessen zijn (met fasen). Als ma 9 nov vervalt, moet 10.1/10.2 uitval worden of verschuiven (Wiegenlied, handelingsdeel-4-formulier met uiterste datum 13 nov in fase 10.1). Zie vraag 3.
- **Studiewijzer r. 63** zegt: "Je telefoon om op te nemen in les 2." Dat botst met het schoolbeleid en het besluit van 4-11 (opnemen op de laptop van de groep of met het opnameapparaat van de docent). Bron-fout in SW, Lesdag volgt het beleid.
- **Studiewijzer r. 97:** "vóór vrijdag 3 april". 3 april 2027 is een **zaterdag**. PTA-datum 03-04-2027 klopt dus niet met "vrijdag". Waarschijnlijk bedoeld: vr 2 apr (SW) of za 3 apr (PTA).
- **PTA-herkansing:** de PTA zet bij T5 "Herk.week TW2" (zelfde patroon bij alle herkansbare toetsen in dit PTA, ook andere vakken). BASIS en SW noemen di 9 mrt, dat klopt met "Herkansingen PTA" in de jaarplanning (lesweek 24). Geen echte fout; PTA-kolom is onduidelijk.

#### 4. Lessen zonder fasen of "Nog in te vullen" die nog moeten komen

Gezocht in `basis.json`, `vwo5.weken` met lesweek ≥ 10 (datum ≥ ma 9 nov). "Nog in te vullen" komt in geen enkele vwo 5-les voor. Alle lessen zonder fasen zijn toets-, toetsweek- of uitvalslessen:

| Les | Datum | Soort | Titel |
|---|---|---|---|
| 10.3 | do 12 nov | uitval | Valt uit: do 12 nov LOB-bezoek Universiteit Utrecht |
| 16.1, 16.2 | ma 4 jan | uitval | Valt uit: ma 4 jan studiedag |
| 18.1 | ma 18 jan | toets | Toetsweek 2: T5 classicisme en romantiek (90 min) |
| 18.2 | ma 18 jan | toetsweek | Toetsweek 2 |
| 18.3 | do 21 jan | toetsweek | Toetsweek 2 |
| 19.1, 19.2 | ma 25 jan | uitval | Valt uit: ma 25 jan toetsweek |
| 20.1, 20.2 | ma 1 feb | uitval | Valt uit: ma 1 feb PWS-dag |
| 27.1, 27.2 | ma 29 mrt | uitval | Valt uit: ma 29 mrt Tweede Paasdag |
| 28.1, 28.2 | ma 5 apr | toetsweek | Toetsweek 3: geen muziektoets / Toetsweek 3 |
| 28.3 | do 8 apr | toetsweek | Toetsweek 3 |
| 29.1, 29.2 | ma 12 apr | uitval | Valt uit: ma 12 apr toetsweek |
| 32.1, 32.2 | ma 17 mei | uitval | Valt uit: ma 17 mei Tweede Pinksterdag |
| 35.1 | ma 7 jun | toets | Praktijktoets P10: uitvoering van je compositie |
| 35.3 | do 10 jun | toets | Praktijktoets P10, vervolg |
| 37.3 | do 24 jun | uitval | Valt uit: do 24 jun toetsweek |
| 38.1 | ma 28 jun | toets | Toetsweek 4: T6 moderne jazz en gouden popjaren (90 min) |
| 38.2 | ma 28 jun | toetsweek | Toetsweek 4 |
| 38.3 | do 1 jul | toetsweek | Toetsweek 4 |

Geen les hoeft dus uitgewerkt te worden; zie het lege voorstel in `vwo5-voorstel.json`.

Gezien tijdens het zoeken:
- 239 van de 255 fasen in vwo 5 zijn tekststrings ("10 min · ..."), 16 zijn fase-objecten (onder meer in 8.1, 10.1, 10.2 en 11.1). De minuten tellen bij **elke** les met fasen op tot 45.
- Wat OP r. 124 punt 8 zegt klopt: lesweek 11 en volgende hebben vooral korte tekstregels en geen deck. Dat valt niet onder "zonder fasen"; geen voorstel.
- Voorbije lessen zonder fasen: 1.1, 1.2 (uitval), 6.1-6.3 (excursie), 9.1-9.3 (TW1). Alleen genoemd.

#### 5. Tegenstrijdigheden en vragen aan Frans

1. **P9: waar komt de toetsles te staan?** Frans verplaatste P9 naar ma 23 nov (OP r. 124, bevestigd 4-11). In BASIS staat de toets al op wk 12, maar de toetsles en het model hangen nog aan wk 7-8, en 12.1/12.2 (Messiah nr. 17 en Wiegenlied, Chromatiek) staan er nog als gewone lessen. Wordt het: toetsles in 12.1 en 12.2 (en 12.1/12.2 schuiven naar 13), model `vwo5-P9` mee verplaatst? Wat doet de studiewijzer (leerlingen lezen nu "26 okt") en het PTA ("Per.1")?
2. **T5 op welke dag?** TW2 loopt ma 18 - di 26 jan, maar ma 18 jan is Ontwikkeldag 2 (leerlingen vrij). Is het rooster TW2 bekend? Zo niet: BASIS-datum van T5 laten staan op ma 18 jan (fout) of leeghalen?
3. **Ma 9 nov (morgen):** vervalt les 10.1 en 10.2 voor vwo 5 (OP r. 124, Zermelo)? Zo ja: uitval markeren in BASIS, schuift het Wiegenlied-programma een week, en het HD4-formulier (uiterste datum 13 nov) moet dan vóór die datum op een ander moment worden uitgedeeld.
4. **PTA v5 muziek bevat 12 rijen** (P1-P8, T1-T4) met cursus 2025-2026 die niet in Lesdag, studiewijzer of BEO staan. Zijn die bewust niet meer van toepassing en moeten ze uit het PTA? De regel "Eindcijfer klas 5 is 60% van het SE" klopt als cumulatief getal (vwo 4: 20 + vwo 5: 40), zoals SW r. 58 het zegt.
5. **Domeinen:** PTA noemt bij P9 B1 én B2 en bij P10 B1 én B2; BASIS heeft P9 = B1 en P10 = B2. Overnemen uit de PTA, of is P9 bewust alleen B1?
6. **P10-notatie:** PTA vraagt notatie via notatieprogramma of handgeschreven, ritmisch werk minimaal 3 partijen, eventueel DAW. Geen les behandelt dat. Wil je een korte instructie (bijvoorbeeld in 25.2 of 31.2), of laat je het aan de leerling over?
7. **Telefoon in studiewijzer:** SW r. 63 "Je telefoon om op te nemen in les 2" past niet bij het beleid. Aanpassen naar laptop/opnameapparaat?
8. **Deadline handelingsdelen:** SW r. 97 zegt "vrijdag 3 april", PTA en BASIS 3 apr 2027, dat een zaterdag is (twee dagen voor TW3, 5 apr). Welke dag bedoel je, vr 2 apr of za 3 apr?
9. **H8-datum:** BASIS zet H8 op za 16 jan (open dag), de PTA geeft geen datum. Laat je de open dag als vaste datum staan, of "meerdere momenten" tonen?
10. **PTA-kolom "Herk.week TW2":** bedoel je daarmee de herkansing di 9 mrt (zoals in SW en jaarplanning)? Dat is hoe Lesdag het nu leest.
11. **SW-leerdoel ritenuto, accelerando, unisono en menuet:** de SW noemt ze, de lessen niet. Gewenst als uitleg in 12.3/14.3 (nog te komen) of alleen thuis (Learnsheet)? Geen PTA-eis, wel T5-afvinklijst voor leerlingen.


---

## Vwo 6

Bronnen en afkortingen
- PTA = `S/bron/PTA_V6_2026-2027.txt`, muziekdeel regels 2388-2976 (Klas v6, Vak Muziek). Het pdf bevat ook oude cursusrijen (2024-2025, 2025-2026: H1-H8, P1-P18, T1-T8); alleen rijen met cursus 2026-2027 tellen: H9-H12, P19, P20, T9, T10 (H9-H12 regels 2457-2495, P19 en P20 regels 2740-2760, T9 en T10 regels 2940-2975; inleiding met "Eindcijfer klas 6 is 100%" regel 2403). Dat past bij de bestandsnamen in `02 Keuzevak muziek/VWO/VWO 6/` (map "Lessen 2026-2027", P19, P20, T9, T10, H9-H12).
- Lesdag = `basis.json` (`leergangen.vwo6`) en `S/data/vwo6.json`. Beoordeling = `beoordeling.json` (p19-vwo6, p20-vwo6).
- Er is geen studiewijzer 2026-2027 voor vwo 6 (basis.json meta: "concept op lesniveau"). Lesstof-bron naast PTA: `Nieuwe lesleerlijn.docx` (sectiemap, `00 PTA, studiewijzer en planning`; tekst in `S/bron/lesleerlijn-v6.txt`).
- Het PTO-overzicht heeft geen vwo 6 (alleen klas 3). Het toetsweekrooster `tw1.txt` heeft voor vwo 6 geen muziekrij (zie vraag 3).
- Lesdag heeft voor vwo 6 `lesdagen: null`: de datum van een les is dus alleen de maandag van de lesweek. De dag van de week staat nergens.

#### 1. Toetsentabel

| Toets | Soort | Weging | Duur (min) | Periode | Datum / week | Herkansbaar |
|---|---|---|---|---|---|---|
| T9 Middeleeuwen, renaissance en moderne pop | theorie | PTA 12 / basis 12 / beoordeling: geen model | PTA 135 / basis 135 | PTA TW1 / basis toetsweek 1 (2-10 nov) | PTA: TW1 (geen datum) / basis ma 2 nov, wk 9 | PTA ja, herk.week TW1 / basis ja, "TW1" |
| P19 Examenconcert | praktijk | PTA 15 / basis 15 / beoordeling 15 | PTA 180 / basis 180 | PTA tabel "Per.1 in les", tekst "periode 1/2" / basis "periode 1/2 in de les" | PTA: geen datum / basis ma 11 jan, wk 17 (les 3) | PTA nee / basis nee / beoordeling nee |
| P20 Afronding speel- en zangstukken | praktijk | PTA 1 / basis 1 / beoordeling 1 | PTA 45 / basis 45 | PTA "Per.3 in les" / basis "periode 3 in de les" | PTA: geen datum / basis ma 22 mrt, wk 26 (les 3) | PTA nee / basis nee / beoordeling nee |
| T10 20e/21e eeuw en examentraining | theorie | PTA 12 / basis 12 / beoordeling: geen model | PTA 135 / basis 135 | PTA TW3 / basis toetsweek 3 (1-15 apr) | PTA: TW3 / basis do 1 apr, maar wk 28 (ma 5 apr) | PTA nee / basis nee |
| H9 Concert De Doelen (1) | handelingsdeel | nvt (0) | nvt | nvt | PTA deadline 3-4-2027 / basis do 15 okt (wk 7), deadline 3-4-2027 | nee |
| H10 Concert De Doelen (2) | handelingsdeel | nvt | nvt | nvt | PTA deadline 3-4-2027 / basis do 18 feb (wk 22), deadline 3-4-2027 | nee |
| H11 Messiah Leiden | handelingsdeel | nvt | nvt | nvt | PTA "in februari", deadline 3-4-2027 / basis vr 12 mrt (wk 24), deadline 3-4-2027 | nee |
| H12 Muzikale bijdrage (koor, ensemble, open dag) | handelingsdeel | nvt | nvt | nvt | PTA deadline 3-4-2027 / basis za 16 jan (wk 17, open dag), deadline 3-4-2027 | nee |

Verschil (alleen waar bronnen echt afwijken):
- T9 herkansing: PTA en Lesdag zeggen allebei "TW1". Een herkansing in dezelfde toetsweek is vreemd (zie 2 en 5, vraag 4). Het jaarplanningsblad `tw1.txt` zet "open zetten intekenen herkansingen" op 2 dec: de herkansing kan niet in TW1 vallen.
- T10 datum 1 apr met week 28: zie 3.
- H11 PTA zegt februari, Lesdag 12 maart (zie 3 en vraag 5).
- P19: de tabel in de PTA zegt "Per.1", de omschrijving "periode 1/2". Lesdag heeft januari (wk 17). Welke periode januari is, staat in geen bron.
- P19 duur 180 min tegenover één les van 45 min (17.3), zie 2.
- Overige velden (weging, duur, herkansbaar, toetsweek) komen overeen. Wegingen samen: 12+15+1+12 = 40 (Lesdag meta: "40% van het SE"), maar de PTA zegt in de inleiding "Eindcijfer klas 6 is 100% van het eindcijfer SE" (vraag 6).
- Beoordeling: p19-vwo6 en p20-vwo6 komen overeen met de PTA (weging, herkansbaar). T9 en T10 hebben geen beoordelingsmodel; dat is logisch (CE-stijl theorietoets met correctiemodel).
- P19 beoordelingsmodel heeft zes criteria (presentatie 1, beheersing 2, interpretatie 2, veelzijdigheid 1, samenspel 2, organisatie 2). De PTA noemt alleen "presentatie, muzikaliteit en samenspel volgens het format in de ELO". "Organisatie" en de eindcijferformule (75% docent, 10% eigen cijfer, 15% klasgenoten) staan niet in de PTA (eigen invulling van Lesdag/sectiemap).

#### 2. Toets naar les

| Toets | Toetsles in Lesdag | Beoordelingsmodel en gekoppelde lessen | Voorbereiding |
|---|---|---|---|
| T9 | vwo6:9.1 (wk 9, toetsles 135 min verdeeld over 9.1 t/m 9.3, toetsweek 1) | geen model | M1 wk 1-8 (middeleeuwen en renaissance), 8.1/8.2 interpretaties, oefentoets lesweek 9 (blokken M1 toetsing) |
| P19 | vwo6:17.3 (wk 17) | p19-vwo6: zelfbeoordeling leerling in 8.3, 16.3, 17.2, 20.1; docent + scoreblad in 17.3 | 8.3 praktische zaken, 11.3 tot 17.2 repetities, 17.1 concepten, 17.2 generale. Lessen 13.3, 15.3, 16.3 repeteren concertrepertoire |
| P20 | vwo6:26.3 (wk 26) | p20-vwo6: zelfbeoordeling leerling in 7.3, docent + scoreblad + leerling in 26.3 | 7.3 doorloop zang- en speelstukken M1, 20.3 t/m 25.3 praktijkopdrachten |
| T10 | vwo6:28.1 (wk 28, toetsles; 28.2/28.3 en wk 29 toetsweek) | geen model | 20.1-27.2 de grote lijn, 27.1 en 27.2 examenvoorbereiding |

Koppeling: de modellen zijn aan de juiste toetslessen gekoppeld. Twee punten:
- P19 is in de PTA 180 min, in Lesdag één les (17.3, 45 min). Een concert van drie uur past niet in één lesuur; waar en wanneer het concert is, staat in geen bron. Lesleerlijn module 2 week 9 beschrijft "technische doorloop" en "examenconcert", maar zonder tijden.
- Het P20-zelfbeoordelingsformat staat in 7.3 (M1), tweeëntwintig weken vóór P20. Mogelijk bedoeld omdat de stukken (Middeleeuwen en Renaissance, sectiemap P20/Lesmateriaal) in M1 beginnen. Vraag 9.

Staat de stof uit de PTA-omschrijving in de lessen?

T9 (PTA regels 2940-2958), onderdelen en waar ze zitten in Lesdag:

| PTA noemt | Les |
|---|---|
| gregoriaans (syllabisch, melismatisch, vrije ritmiek), neumen | 1.1, 1.2 |
| kerktoonsoorten | 1.1 (alleen "herkent een kerktoonsoort", criterium "dorisch van majeur") |
| organum en ontstaan meerstemmigheid | 1.3 |
| cantus firmus | alleen 8.1; geen eigen les |
| mis, motet | 2.2 (motet), 4.1, 8.2 |
| madrigaal | 5.1 |
| pavane-gaillarde | 5.2 |
| punk, disco, reggae, hiphop, R&B, dance | alleen overzicht 10.2 (tabel) en hiphop 11.1; allemaal ná T9 |
| four on the floor, breakbeat, turntablism, build-up/drop/riser, EDM | geen les (zie hieronder) |
| sampling/loops | 11.1 (na T9) |
| invloed van streaming en social media (A3) | geen les noemt het |
| gospel, praise & worship, holy hiphop (christelijke stromingen binnen pop) | 10.2, 11.2, 15.1 (alle na T9) |

PTA noemt "moderne popmuziek" (punk, disco, reggae, hiphop, R&B, dance/EDM) als stof van T9 op 2-10 nov. Geen les voor T9 (wk 1-8) behandelt die stof; de eerste les erover is 10.2 (wk 10), ná de toets. Four on the floor, breakbeat, turntablism, build-up/drop/riser, EDM en streaming/social media komen in geen enkele les van vwo 6 voor. Dat staat wel in `blokken[M2].kennen`. In de sectiemap staat bij T9 een map `Lesmateriaal/Jazz Pop CCM HHH` (lesoverzicht en studiewijzer) die bij deze stof hoort; die staat in module 2.

T10 (PTA regels 2960-2975): impressionisme (heletoonsladder, pentatoniek, vrijer metrum), neoclassicisme, expressionisme (atonaliteit, dodecafonie, tweede Weense school, polyritmiek/polymetriek), elektronische muziek, avant-garde (clusters, onconventioneel instrumentgebruik), minimal music (grafische partituur, geleidelijke verandering), "Toepassen van begrippen uit solfège, syllabus, luister-cd's en stijlgeschiedenis", volledige syllabus in CE-vorm.
- Geen les in wk 20-30 noemt impressionisme, neoclassicisme, expressionisme, heletoonsladder, pentatoniek, dodecafonie, Weense school, polyritmiek, avant-garde, clusters of minimal music. Alleen 22.2 (Debussy, Schönberg), 25.2 (elektronische muziek) en 23.x (klankkleur) raken eraan, zonder de PTA-begrippen.
- vwo 4 en vwo 5 in Lesdag noemen impressionisme, expressionisme, minimal en dodecafonie evenmin. In de sectiemap staat wel `T10 .../Lesmateriaal/20e eeuw (uit VWO 5)` (Muziek 20e eeuw.pdf, presentatie-outlines week 20-23). Het materiaal bestaat dus, maar zit in geen Lesdag-les.
- "Grote analyse-opdracht met partituur" en "solfège": geen les, behalve partituurwerk in 22.2 en 27.2.
- 27.1 examenvoorbereiding (luisterfragmenten, stijlherkenning, oude examenopgaven) en 30.1 (oefenexamen, tijdmanagement) komen overeen met "CE-brede examentraining". Sectiemap: `50 Oefenvragen VWO Muziek Examen.docx`, `Luisterlijn muziekexamen.docx`.

P19: PTA vraagt zang, instrument, slagwerk, improvisatie, compositie in gevarieerd programma; als groep begroting, uitnodiging, publiciteit, locatie, aankleding, programmaboekje, presentatie; feedbackformulieren maandag na de presentatie.
- Zang, instrument, improvisatie: 11.3 tot 15.3, 16.3. Compositie: 15.3 (reflectief stuk), geen les voor "compositie" als aparte opdracht.
- Slagwerk: geen les noemt slagwerk. 11.3 (beat) en 14.3 (medley) komen het dichtst in de buurt.
- Organisatie (begroting, uitnodiging, publiciteit, locatie, aankleding, programmaboekje, presentatie): alleen 8.3 ("praktische zaken") en 17.1; geen les werkt begroting, uitnodiging of publiciteit uit.
- Feedbackformulieren op de maandag na het concert: 20.1 ("nabespreking") past daarbij; formulier "P19 Beoordeling klasgenoten" staat in de sectiemap.

P20: "Afronding speel/zangstukken", B1 en B2 (improviseren/componeren vanuit probleemstelling). Lessen 20.3, 21.3 (improvisatie op vormpatronen), 22.3, 23.3, 24.3 (creatieve opdracht), 25.3 (remix) dekken B2; B1-stukken: P20-lesmateriaal in sectiemap (Blackbird, "Middeleeuwen Renaissance"). Lesdag 26.3 voegt "luistersessie controversiële stukken" toe, dat niet in de PTA staat (eigen invulling).

Handelingsdelen: H9 (15 okt) is al voorbij (wk 7). H12: keuzeformulier in 10.2/11.1; open dag za 16 jan klopt met jaarplanning (46403, za, cvb).

#### 3. Meldingen uit het controlescript voor vwo 6

| Melding (ingekort) | Wat de bron zegt | Oordeel | Voorstel |
|---|---|---|---|
| LET OP: T10 heeft week 28 (ma 5 apr) maar datum do 1 apr | `basis.json` toetsen T10: week 28, datum 2027-04-01. Toetsweek 3 vwo 6 loopt 1-15 apr (basis `toetsweken.vwo6`); jaarplanning `TW3 - v6`: lesweek 27/28/29, dagen "do vr ma ...", dus start do 1 apr in lesweek 27 (de datumcellen in dat blad staan een jaar terug, 2026, maar de weekdagpatronen en lesweken kloppen met 2027). PTA: alleen "TW3". Lesdag: 27.3 "valt uit: toetsweek 3 vanaf donderdag"; toetsles 28.1. | Lesdag-fout (interne tegenstrijdigheid). De dag van T10 zelf staat nergens: het TW3-rooster voor muziek is er nog niet. | Datum van T10 niet op 1 apr zetten (dat is de start van TW3) maar leeg of "TW3 (1-15 apr), dag volgens rooster"; `week` en toetsles 28.1 blijven pas na bevestiging. |
| INFO: ma 11 jan, wk 17 les 3, toetsles "P19 (15%): examenconcert" heeft geen fasen | Toetsles. Alleen titel en materiaal. | Geen echte fout. | Eventueel één fase "examenconcert" van 45 min met stappen, als de lesmodus iets moet tonen. Niet nodig voor de PTA. |
| INFO: ma 22 mrt, wk 26 les 3, toetsles P20 zonder fasen | Idem. | Geen echte fout. | Idem. |
| INFO: ma 5 apr, wk 28 les 1, toetsles T10 zonder fasen | Idem. | Geen echte fout. | Idem. |
| INFO: ma 2 nov, wk 9 les 1, toetsles T9 zonder fasen (al voorbij) | Idem. | Geen echte fout. Wel: T9 staat niet in het TW1-rooster (zie vraag 3). | Rooster nagaan. |

Het controlescript meldt voor vwo 6 geen FOUT. De datums in de meldingen ("ma 11 jan") zijn week-maandagen omdat `lesdagen` leeg is.

#### 4. Lessen zonder fasen of met "Nog in te vullen" die nog moeten komen

- "Nog in te vullen" komt in `leergangen.vwo6` niet voor.
- Geen enkele les van week 10 of later heeft helemaal geen fasen, behalve toets-, toetsweek- en uitvalsessies: 10.1, 16.1, 17.3, 18.1 t/m 19.3, 26.3, 27.3, 28.1 t/m 29.3 (bewust leeg of toets).
- Wel hebben 43 lessen alleen tekstfasen ("15 min · overzicht"), geen fase-objecten (zie `tools/inhoud-decks-LEESMIJ.md`: dan moet het inhoudbestand de fasen uitschrijven). Uitgewerkt voorstel in `vwo6-voorstel.json` voor 18 daarvan (wk 11 t/m wk 17, eerstvolgende lessen vóór P19):

| Lesid | Titel | In voorstel |
|---|---|---|
| vwo6:11.2 | Holy hiphop en christian rap | ja |
| vwo6:11.3 | Flow en ritme; beatmaking en arrangement; workshop songwriting/lyrics | ja |
| vwo6:12.1 | Musical: ontwikkeling en vertelstructuur | ja |
| vwo6:12.2 | Vocale technieken in musicals | ja |
| vwo6:12.3 | Musicalnummer repeteren; improvisatie in musicalstijl; presentaties projectvoorstellen | ja |
| vwo6:13.1 | Pop 3: nieuwe stromingen, productietechniek, sounddesign, muziekindustrie | ja |
| vwo6:13.2 | Internationalisering en lokale identiteit | ja |
| vwo6:13.3 | Popsong repeteren voor het examenconcert; workshop arrangeren; feedback op projecten | ja |
| vwo6:14.1 | Cross-overs: genre-overstijgende muziek | ja |
| vwo6:14.2 | Muziek en andere disciplines: visuele media, technologie | ja |
| vwo6:14.3 | Technologieworkshop productietechnieken; multi-genre medley repeteren | ja |
| vwo6:15.1 | Praise & worship: ontwikkeling, kenmerken, invloed op mainstream | ja |
| vwo6:15.2 | Spiritualiteit in verschillende genres | ja |
| vwo6:15.3 | Worship-nummer repeteren; improvisatie op spirituele thema's; workshop persoonlijke reflectieve muziek | ja |
| vwo6:16.2 | Muziek als sociaal commentaar; muziek en identiteitsvorming | ja |
| vwo6:16.3 | Doorloop examenconcert-repertoire; peerfeedback op persoonlijke projecten | ja |
| vwo6:17.1 | Concepten examenconcert presenteren (deel 1 en 2), feedback, artistieke coherentie | ja |
| vwo6:17.2 | Generale repetitie examenprogramma; soundcheck en staging | ja |
| vwo6:20.1 t/m 25.3, 26.1, 26.2, 27.1, 27.2, 30.1 t/m 30.3 | 25 lessen (de grote lijn en examenvoorbereiding) | nee, later |

Lessen in het verleden (wk 1-8, wk 9) hebben fase-objecten of zijn toetsles; niet uitgewerkt.

Let op bij het voorstel: lessen 17.1 en 12.3 hadden in de leergang "presenteren"; in het voorstel is dat in groepjes voor de docent. In 17.1 staan meer dan vier groepen niet in 30 minuten: vraag 8.

#### 5. Tegenstrijdigheden en vragen aan Frans

1. **T9 en moderne pop.** PTA T9 (TW1) toetst punk, disco, reggae, hiphop, R&B, dance/EDM en begrippen (four on the floor, breakbeat, turntablism, build-up/drop/riser) en streaming/social media. Lesdag behandelt moderne pop pas vanaf week 10, na T9 (2-10 nov), en vele begrippen nergens. Is die stof in vwo 4 of 5 al aan bod gekomen, of verschuift de toets, of de PTA-tekst? (PTA regels 2940-2958; basis.json w10-w15.)
2. **T10 en 20e/21e eeuw.** PTA T10 noemt impressionisme, neoclassicisme, expressionisme, dodecafonie, minimal music e.d. Geen les van vwo 6 (wk 20-30) behandelt dat; vwo 4 en 5 in Lesdag ook niet. De sectiemap heeft materiaal "20e eeuw (uit VWO 5)". Waar wordt dit onderwezen, en moet er een les bij?
3. **T9 in het TW1-rooster.** `tw1.txt` heeft voor vwo 6 geen muziekrij (wel vwo 6 voor andere vakken, 2-10 nov, en havo 5 muziek op 9 nov). Lesdag zet T9 op ma 2 nov. Op welke dag en tijd is T9, en is dat al geweest?
4. **T9 herkansing.** PTA geeft herk.week TW1 (zelfde week als de toets). Het TW1-blad zet het intekenen voor herkansingen op 2 dec, dus eerder dan TW2 (18-29 jan) kan niet. Bedoeld TW2?
5. **Messiah H11.** PTA zegt "in februari"; Lesdag en `vrijeDagen` hebben vr 12 mrt (wk 24). H7 (2025-2026) zei "in maart". Is de PTA-tekst een kopieerfout?
6. **Weging.** PTA-inleiding: "Eindcijfer klas 6 is 100% van het eindcijfer SE"; de vier toetsen wegen samen 40 (12+15+1+12). Lesdag meta: 40%, rest in vwo 4 en 5. Klopt die 100%? Is P20 echt 1%?
7. **P19.** (a) PTA tabel zegt "Per.1", tekst "periode 1/2"; Lesdag wk 17 (jan). (b) 180 min in de PTA, 45 min in Lesdag 17.3. Waar en hoe laat is het concert? (c) Organisatie van het concert: in de PTA een groepsopdracht, in Lesdag 17.1 en 8.3 enkel. (d) PTA: leerlingen presenteren en voeren uit voor publiek, de afspraak is "nooit voor de klas". Is een examenconcert voor publiek een uitzondering? In het voorstel presenteren de groepen concepten in groepjes voor de docent.
8. **17.1.** Hoeveel groepen zijn er? Past 30 minuten presenteren aan de docent?
9. **P20 zelfbeoordeling in 7.3.** Het formaat van P20 staat in wk 7 (M1), terwijl P20 in wk 26 valt. Bedoeld?
10. **Lesdagen vwo 6.** Welke dagen heeft vwo 6 muziek? Dan krijgen alle lessen een echte datum en kan het script week 10 en later zuiver beoordelen.
11. **Gastdocent in 12.2.** Wie geeft de workshop stemtechniek en wanneer? (leergang: "gastdocent")
12. **Programma voor beatmaking (11.3, 14.3) en locatie generale/concert (17.2).** Staan in geen bron.
13. **P17 en P18.** De PTA bevat rijen P17 (Per.4, 6%, 60 min, "Diverse stukken rondom het thema") en P18 (moodboard, 2%, Per.4) zonder duidelijke cursus; P17 draagt zowel "2025-2026" als "2026-2027" in de tekst. Horen die bij 2026-2027? Lesdag heeft ze niet.
14. **PTA bron.** Het pdf bevat oude cursusrijen (H1-H8, P1-P16, T1-T8) en dubbele kopteksten; opschonen helpt het controleren.


---

## BB1

Alleen gelezen, niets aangepast. Geen leerlingnamen opgenomen.

Bronnen:
- PTO-nov = `S/bron/pto_muziek_nov.txt` en `S/bron/pto_november.txt`: **geen rij voor bb1, kb1 of kg1 met vak muziek.** kb1 en kg1 staan in dat overzicht wel met 6-7 andere vakken (bi, en, gd, mm, ne, th, wi), zonder muziek (`pto_november.txt`, rijen kb1 en kg1).
- PTO-oud = `S/bron/pto_oud.txt` r.125-127 (kb1) en r.170-172 (kg1): wel muziek.
- Vakwerkplan = `S/bron/vwp2627.txt`: r.292 ("BB1 is de brede brugklas en heeft 1 uur muziek"), r.357 (leerlijn klas 1 uit 3.3.4), bijlage B r.859-937 (PTO-tabel: alleen h1, m1, v1, h2, m2, h3, v3; **geen BB1**), r.857 (BB1 nog niet aan een docent verdeeld, samen 5 uur met m1c en m2).
- PTO-richtlijnen = `S/bron/ptorichtlijnen.txt`. Jaarplanning = `S/bron/jaarplanning.txt`.
- Klas-1-map = `Sectie Muziek/01 Onderbouw muziek/01 Klas 1`. Moduleplanning = `S/bron/module_planning.txt`.
- basis.json: `leergangen.bb1`; beoordeling.json: model `p1-bb1-gitaar`.

#### 1. Toetsentabel

Lesweek 17 = ma 11 jan 2027 (wk 2), lesweek 19 = ma 25 jan 2027 (wk 4).

| Veld | PTO-oud kb1/kg1 (r.125-127, 170-172) | PTO-nov | Vakwerkplan bijlage B (m1 en v1) | basis.json (`bb1`) | beoordeling.json | Verschil |
|---|---|---|---|---|---|---|
| **P1** naam | "lied presentatie met gitaar" | geen rij | m1/v1: "Liedpresentatie met gitaar" | "Liedpresentatie met gitaar" | "Praktijktoets P1: liedpresentatie met gitaar" | titel gelijk aan m1/v1 |
| soort | praktijk | — | praktijk | praktijk | praktijkmodel | gelijk |
| weging | 10 | — | 10 (alle toetsen weging 10) | 10 | 10 | gelijk |
| duur | 45 | — | 45 | 45 | n.v.t. | gelijk |
| periode | Per.2 | — | Per.2 | blok P2 (lesweek 11-20) | n.v.t. | gelijk |
| datum, week | niet genoemd | — | niet genoemd | ma 11 jan, lesweek 17 | model aan w17 | Lesdag-keuze; `waar` zegt "week nog kiezen" terwijl week 17 al staat |
| herkansbaar | ja (-1), herkansweek "nvt" | — | ja | true, "di 23 mrt (herkansing PTO)" | true | gelijk, maar strijdig met richtlijn (zie hieronder) |
| **T1** naam | "theorietoets" (omschr.: "maat, ritme, melodie en onderdelen van de gitaar") | — | m1: "Maat, ritme, melodie en onderdelen van de gitaar"; v1: "... toonhoogte ..." | "Maat, ritme, toonhoogte en onderdelen van de gitaar" (v1-titel) | geen model | BB1 volgt v1; m1 en oud-PTO zeggen "melodie" |
| soort, weging, duur | theorie, 10, 45 | — | theorie, 10, 45 | theorie, 10, 45 | n.v.t. | gelijk |
| periode | Per.2 | — | Per.2 | blok P2 | n.v.t. | gelijk |
| datum, week | niet genoemd | — | niet genoemd | ma 25 jan, lesweek 19 | n.v.t. | Lesdag-keuze; `waar` zegt "week nog kiezen" |
| herkansbaar | nee (0) | — | nee | false | n.v.t. | gelijk |
| **P2 "presentatie Slagwerk"** | Per.3, weging 10, 45 min, niet herkansbaar; leerdoel: slagwerkinstrumenten kennen, lied zingen en ritmes tikken (r.126, 171) | — | m1 heeft geen P2 | **ontbreekt** | — | **toets in oud PTO, niet in Lesdag** (zie punt 5, vraag 2) |

Controle aan de richtlijnen:
- Per rapportperiode hooguit 1 PTO-toets (`ptorichtlijnen.txt` r.21): BB1 P1 (w17) en T1 (w19) staan allebei in periode 2. Zelfde patroon als m1, v1, h1 in het PTO; Vakwerkplan r.747 en r.937 zegt dat het PTO "nog niet helemaal aansluit" en dat dit voor 2027-2028 wordt aangepast.
- Alleen schriftelijke toetsen herkansbaar (r.96): BB1 P1 is praktijk en herkansbaar. Lesdag heeft dit overgenomen van m1/v1 (Vakwerkplan bijlage B). Strijdig met de richtlijn.
- Herkansing "di 23 mrt (herkansing PTO)": klopt met Lesdag-event w26 "di herkansingen PTO"; in de jaarplanning-agenda staan twee keer "Herkansingen PTO" (voor activiteitenweek B en in week D). De datum zelf staat niet als tekst in de export; niet volledig vast te stellen. Herkansingsweek in het PTO is "nvt", dus het PTO noemt de herkansdag niet.
- Toetstijd T1 (r.88): de toetsles is 45 min, maar de toetstijd is 5 min (gitaar op papier) + 35 min (Musicbox) = 40 min, na 5 min inloggen. Past binnen 45 min; de PTO-duur 45 komt niet volledig als toetstijd uit.
- BB1 staat niet in het PTO (nov) en niet in het Vakwerkplan; de toetsen zijn overgenomen van m1 en v1 (zegt ook `meta.bron` en `toetsKop`: "Bevestig dit nog").

#### 2. Toets naar les-koppeling

**P1 (praktijk, gitaar)**
- Toetsles `bb1:17.1`, week 17, ma 11 jan (event: vr 15 jan Sing-In). Fasen 5/35/5 = 45 min. Model `p1-bb1-gitaar`: alleen aan w17 gekoppeld (docent, scoreblad, leerling). Weging 2+2+1+1+1+1 = 8, formulier zegt "deel door 8". Klopt.
- Voorbereiding: w9 gitaar-tutorials, Em en Asus2 (`bb1:9.1`); w11 onderdelen, houding, tab lezen, partij 1 (`bb1:11.1`); w12 akkoorden D en G (12.1); w13 drums, maat en ritme (13.1); w14 keyboard, notennamen (14.1); w15 kerstles Mary Did You Know (15.1); w16 lied en partij kiezen voor P1 (16.1). Voor w1-w8: "Nog in te vullen" (past, zie punt 4).
- Formatief vooraf (r.82): w16 (zelfcheck) en alle voorgaande lessen hebben een formatieve opdracht; w16 sluit direct aan op P1. Aanwezig.
- Stof uit omschrijving oud-PTO ("een eenvoudig lied met gitaartabs of met 2 of 3 akkoorden begeleiden"): tab in w11 (partij 1 van Vader ik aanbid U), akkoorden D en G in w12, A als extra, wisselen op de tel. Gedekt.
- Criteria "Meezingen" en "Inzet en presentatie" (elk weging 1) komen in de lessen alleen terug als extra-opdracht ("zing erbij", w12 en w16); geen les oefent het zingen tijdens het spelen als eigen doel. Eigen controle, lichte onderdekking.
- Materiaal aanwezig in map: formulieren P1 docent en zelfbeoordeling, `P1 Scoreblad BB1.xlsx` (niet geopend), `Vader ik aanbid U.pdf`, gitaaronderdelen.jpg.
- Lesweek 16 (ma 4 jan studiedag) en 18 (ma 18 jan ontwikkeldag secties) beginnen met een vrije dag; lesdag BB1 onbekend (`lesdagen: null`). Valt de les op maandag, dan vervalt "lied en partij kiezen voor P1" (w16) of de oefentoets voor T1 (w18).

**T1 (theorie en gitaar)**
- Toetsles `bb1:19.1`, ma 25 jan. Fasen 5 (gitaar op papier) + 5 (inloggen) + 35 (Musicbox) = 45. Documentatie in de les: papieren gitaarblad 9 punten + 47 uit Musicbox = 56; papieren back-up beschreven.
- Voorbereiding: w13 (maat en ritme: vierkwartsmaat, noten), w14 (notennamen c1-e2), w11 (onderdelen en snaren), w18 (formatieve oefentoets, "van een eerder jaar", met begrippenlijst). Formatief aanwezig.
- Stof (oud-PTO r.127, 172): "herkent voorgespeelde melodieën", "verschillende maten en ritmes herkennen in fragmenten of vanuit bladmuziek", "onderdelen van de gitaar benoemen". **Dekking:** onderdelen gitaar (w11) en maat 4/4 plus notenwaarden (w13) gedekt. **PTO noemt maten (meervoud) en melodieën herkennen op gehoor; geen les behandelt andere maatsoorten dan de vierkwartsmaat, en geen les oefent voorgespeelde melodieën herkennen** (alleen w18 in de oefentoets). Het docentbericht bij w18 zegt zelf dat kruis, mol en zesachtste maat niet behandeld zijn en niet in T1 staan.
- Toetsmateriaal in de map: `T1 BB1 2026-2027.docx`, antwoordmodel, `T1 BB1 gitaar op papier` (+ antwoordmodel), begrippenlijst klas 1, oefentoets. Aanwezig. Lesdag noemt `T1 BB1 2026-2027.docx` (+ antwoordmodel) de papieren back-up (vragen 7 en 12 zijn luistervragen); in de map heet dit bestand gewoon de toets T1 BB1. Aanwezig, inhoud niet nagelopen.
- Geen beoordelingsmodel in beoordeling.json voor T1: consistent, het is een toets met antwoordmodel.

#### 3. Meldingen controlescript voor BB1 (rapport r.95-107)

| Melding | Wat de bron zegt | Oordeel | Voorstel |
|---|---|---|---|
| INFO ma 31 mei, wk 34 (lesweek 34, `bb1:34.1`): regel-klas, "presenteren aan de klas, en akkoorden omzetten met AI" in `fasen.docent` | De tekst in basis.json staat in een docentnotitie: "De pdf in Musicbox zegt nog: presenteren aan de klas, en akkoorden omzetten met AI. Daarom niet uitdelen; de stappen hier zijn de opdracht." De les zelf zegt "de laatste les speel je voor de docent"; w36 en w37 zeggen "niet voor de klas". | geen echte fout (bewuste waarschuwing). De Musicbox-pdf zelf is niet ingezien: niet vast te stellen. | Geen. Eventueel het pdf-bestand "Eindopdracht Klas 1" in Musicbox laten aanpassen |
| LET OP ma 31 aug, wk 1 les 1 ... ma 26 okt (8 meldingen, `bb1:1.1` t/m `bb1:8.1`): les is leeg (type "leeg") | `leergangen.bb1.weken` w1-w8: titel "Nog in te vullen", type leeg, geen fasen. Alle acht liggen in het verleden (lesweek 1 t/m 8, 31 aug-30 okt). Moduleplanning noemt voor klas 1: week 1 kennismaking, week 2 gitaartutorial, 3 piano, 4 ukelele, 5-6 Maroon 5 (`x/plan251.txt`, vorig jaar) | Lesdag-lacune, geen fout in bron. Niet uitwerken (verleden). Les w24 zegt "Ukelele terug", dus ukelele is in w1-w8 al behandeld | Alleen vastleggen als historie; invullen is niet nodig voor de planning vooruit |

Geen FOUT-meldingen voor BB1.

#### 4. Lessen zonder fasen of met "Nog in te vullen" die nog moeten komen (≥ ma 9 nov 2026)

| lesid | titel | opmerking |
|---|---|---|
| bb1:10.1 | Valt uit: activiteitenweek A | uitval, ma 9 nov |

Geen enkele les vanaf lesweek 10 heeft "Nog in te vullen" of ontbrekende fasen. Alle andere lessen (w11-w38) hebben fasen van samen 45 min; w17 en w19 (toetsen) ook. Er is dus geen `bb1-voorstel.json` gemaakt. Uitwerking `inhoud-bb1` is volledig opgenomen in basis.json (lesweek 9, 11-20 en 21-38).

Verleden, alleen genoemd: `bb1:1.1` t/m `bb1:8.1` (31 aug-30 okt), titel "Nog in te vullen".

#### 5. Tegenstrijdigheden en vragen aan Frans

1. **BB1 in het PTO.** Geen rij in PTO-nov, niet in Vakwerkplan bijlage B, wel kb1/kg1 in PTO-oud. Moet BB1 (of kb1/kg1) in web.csgpm.nl een muziek-PTO krijgen, en welke? Zijn BB1-toetsen P1 en T1 (zoals m1/v1) bevestigd?
2. **P2 Slagwerk (oud PTO, periode 3).** In oud-PTO voor kb1 en kg1, niet in Lesdag, en Lesdag w37 zegt "het PTO heeft voor klas 1 alleen P1 en T1". Vervallen of vergeten? Lesdag heeft wel drums-lessen (w13, w27) en een instrumentenbingo (w31).
3. **P1 herkansbaar.** BB1 P1 is een praktijktoets maar herkansbaar (overgenomen van m1/v1), terwijl de richtlijn alleen schriftelijke toetsen herkansbaar noemt (r.96). Welke herkansbare (schriftelijke) toets krijgt BB1: T1?
4. **P1 en T1 beide in periode 2** (richtlijn: hooguit één per periode). Verschuiven of laten staan tot 2027-2028?
5. **T1-titel**: "melodie" (m1 en oud PTO) of "toonhoogte" (v1, Lesdag)? Lesdag-stof vermeldt beide.
6. **T1-dekking.** Moeten andere maatsoorten (3/4) en melodieën herkennen op gehoor nog in een les komen voor T1 in lesweek 19? Nu alleen in de oefentoets w18.
7. **Count on Me** (w32-33): niet in het Vakwerkplan (leerlijn klas 1: Memories, Riptide, Birds of a Feather, plus Eindopdracht Klas 1). Is Count on Me een Musicbox-keuze voor deze groep?
8. **Lesdag van BB1.** Op welke dag is het BB1-uur? Lesweek 16 (4 jan), 18 (18 jan, oefentoets T1!), 22 (vr 19 feb), 24 (vr 12 mrt), 27 (29 mrt), 32 (17 mei), 34 (di 1 jun) bevatten vrije dagen.
9. **Moduleplanning klas 1** (`module_planning.txt`, bladen Klas 1 mavo/bb/havo/vwo identiek): noemt "PTO toets" en "PTO ritme" in andere weken en onderwerpen (Stomp-bodypercussie, Heer U bent mijn leven). Klas 3 is leeg. Lijkt niet meer actueel; Lesdag volgt het Vakwerkplan en Musicbox. Bevestigen dat de moduleplanning niet leidend is.
10. **Herkansing di 23 mrt**: datum niet als tekst te bevestigen in de jaarplanning-export. Controleren in `Jaarplanning_schema_2026-2027 overzicht_260320.pdf`.


---

## Keuzeuur muziek havo 3 (kmu3)

Alleen gelezen, niets aangepast. Geen leerlingnamen opgenomen. Een lijst met keuzevakleerlingen (`04 Jaarplanning en lesverdeling/Keuzevakleerlingen muziek 2026-2027.docx`) bevat namen; alleen de kop is gezien, niets overgenomen.

Bronnen:
- PTO-nov: `S/bron/pto_november.txt` en `pto_muziek_nov.txt`: **geen klascode kmu of keuzeuur**; muziek komt alleen voor bij h1, h2, h3, m1, m2, v1, v3. Ook niet in `pto_oud.txt`.
- Vakwerkplan: `S/bron/vwp2627.txt` r.277 (formatie: havo 3 "0,75 (+ 0,75 keuzevak)"), r.855 (docent: "h3a, h3b, h3c en keuzevak h3"), r.353-357 (leerlijnen onderbouw; geen tekst over het keuzeuur), bijlage B r.859-937 (geen kmu).
- Leerlijn bovenbouw als bron voor de inhoud: `S/bron/Studiewijzer_Muziek_H4_2026-2027_staand.txt` r.193-226 (blok 1 Jazz en blues) en `PTA_H4_2026-2027.txt` r.1221-1300.
- Sectiemap `02 Keuzevak muziek/Havo/Keuzeuur havo 3/Lessen 2026-2027/`: 7 presentaties (31-37) plus `beeld/`.
- basis.json `leergangen.kmu3`; `S/data/kmu3.json`.

#### 1. Toetsentabel

| Toets | PTO (nov, oud) | Vakwerkplan | basis.json | beoordeling.json | Verschil |
|---|---|---|---|---|---|
| geen | geen rij | geen toets genoemd | `toetsen: []`; `seAandeel`: "geen toetsen, geen cijfer"; `toetsKop`: "Het keuzeuur heeft geen toets en geen cijfer" | geen model | consistent: niets te vergelijken |
| toetsweek | — | — | `toetsweken.kmu3`: n=4, 29 jun-6 jul 2027; les w38 "Toetsweek havo 3" | — | Er staat een toetsweek zonder toets. De jaarplanning noemt "TW - h3" (blad Toetsweken r.38, lesweek "32", datums 29 jun-6 jul). Lesweek-nummer in de jaarplanning (32) wijkt af van de kalender in Lesdag (lesweek 38); de datums komen overeen |

Controle aan de richtlijnen: PTO-richtlijnen gaan over het PTO van de vakken (onderbouw), een keuzeuur zonder cijfer valt daarbuiten. Niets in strijd.

#### 2. Toets naar les-koppeling

Geen toetsen, dus geen koppeling. In plaats daarvan is gecontroleerd of de lessen aansluiten op de havo 4-bron waar `meta.bron` naar verwijst.

| Les | Titel | Aansluiting op havo 4 blok 1 "Jazz en blues" (Studiewijzer H4 r.193-226) |
|---|---|---|
| `kmu3:31.1` (ma 10 mei) | Zo werkt havo 4, en noten lezen | Les 1 "Wat is jazz? Luisteren en notenschrift"; PTA H4 r.1224-1229 (drie lessen per week, drie domeinen). Gedekt |
| `kmu3:32.1` | Ritme noteren: notenwaarden en rusten | H4 les "Ritme noteren: teleenheid, notenwaarden, rusten, syncope, triool" (r.199, 210). **Syncope en triool staan niet in kmu3**; als instap is dat te verdedigen |
| `kmu3:33.1` | Bluesakkoorden C, F en G | H4 "Bluesakkoorden C, F en G spelen" (r.212). Gedekt |
| `kmu3:34.1` | Twaalfmatige blues samen | H4 "Twaalfmatige blues in combo" (r.226), "Eigen riff op het twaalfmatig schema" (r.213). Gedekt |
| `kmu3:35.1` | Majeur, mineur en akkoordsymbolen | H4 "Samenklank: majeur en mineur, akkoordsymbolen, bluesschema" (r.225). Gedekt |
| `kmu3:36.1` | Luisteren en beschrijven zoals in de toets | H4 r.202 noemt de begrippen scat, **blue note**, walking bas, **call-and-response**. Lesdag noemt ostinaat, walking bass, scat; **blue note en call-and-response komen nergens in kmu3 voor** (0 treffers). H4 blok 1 werkt toe naar T1 (notatie) en P1 (samenspel en improvisatie), niet naar een luistertoets; "de toets" in de titel is niet te herleiden |
| `kmu3:37.1` | Eigen riff laten horen | H4 "Eigen riff op het twaalfmatig schema" (r.213). Gedekt. Pentatonisch improviseren (r.201, r.229) komt niet voor |

Verder: alle zeven lessen hebben fasen van samen 45 min en criteria. Alle materiaallinks wijzen naar bestaande bestanden (7 pptx in de map). Lessen volgen de regels voor deze map: "Niemand speelt voor de klas" (w37) staat erbij.

#### 3. Meldingen controlescript voor kmu3

Het rapport van 8 november (`rapport-lesgegevens-2026-11-08.txt`) bevat geen sectie voor kmu3: geen FOUT, geen LET OP, geen INFO.

#### 4. Lessen zonder fasen of met "Nog in te vullen" die nog moeten komen (≥ ma 9 nov 2026)

| lesid | titel | opmerking |
|---|---|---|
| `kmu3:1.1` t/m `kmu3:30.1` | "Geen les: keuzeuur begint in lesweek 31" | uitval-type, bewust zonder inhoud (30 lessen, o.a. 10.1 voor w10 = ma 9 nov) |
| `kmu3:38.1` | Toetsweek havo 3 | geen toets |

Lessen 31-37 (de zeven echte lessen, ma 10 mei t/m 21 jun) zijn volledig uitgewerkt. Geen "Nog in te vullen". Er is geen `kmu3-voorstel.json` gemaakt. `tools/inhoud-kmu3.json` is al in basis.json opgenomen.

#### 5. Tegenstrijdigheden en vragen aan Frans

1. **Havo 3 stopt of niet?** `meta.bron` van kmu3: de gewone havo 3-klassen zijn "rond de meivakantie gestopt". `leergangen.havo3` heeft lessen in lesweek 31-37 (Songbox 2, slotronde, vrij samenspel) en geen uitval in die weken. Beide kunnen niet kloppen. Wat is het rooster na de meivakantie?
2. **Omvang keuzeuur.** Vakwerkplan r.277: havo 3 krijgt "0,75 (+ 0,75 keuzevak)" uur per week; dat leest als een wekelijks lesuur van 45 minuten. Lesdag heeft zeven lessen in lesweek 31-37 (en 30 weken geen les). Klopt dit met de bedoeling, of is het keuzeuur het hele jaar?
3. **Geen PTO en geen cijfer.** Bevestigen dat het keuzeuur geen PTO-toets en geen cijfer heeft (staat alleen in Lesdag; niet in PTO of Vakwerkplan).
4. **Toets in les 36.** Titel "Luisteren en beschrijven zoals in de toets": welke toets? De H4-studiewijzer noemt blok 1 een T1 over notatie.
5. **Begrippen.** Moeten blue note en call-and-response (en syncope, triool, pentatoniek) erbij, omdat havo 4 ze in blok 1 noemt (Studiewijzer H4 r.199-202)?
6. **Week 31 en 32.** Lesweek 31 (10 mei) is activiteitenweek E; 32 begint op ma 17 mei (tweede pinksterdag). Valt de keuzeuurles in die weken uit?
7. **Dag van het keuzeuur.** Onbekend (`lesdagen: null`): nodig om vrije dagen (w32, w34 di 1 jun) te kunnen controleren.
8. **Toetsweek zonder toets.** Blijft "Toetsweek havo 3" in kmu3 staan?

