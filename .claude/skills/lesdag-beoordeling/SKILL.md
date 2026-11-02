---
name: lesdag-beoordeling
description: Voeg een beoordelingsmodel toe of wijzig er een (Lesdag tools/beoordeling/*.json) en maak daaruit het docentformulier, het leerlingformat en het scoreblad in de map Beoordeling van het onderdeel, en de knop Beoordelen in de lessen. Gebruik bij elke nieuwe of gewijzigde speel-, zang-, compositie- of mondelinge beoordeling.
---

# Beoordelingsmodel toevoegen of wijzigen

Repo: `...\Dashboard Docent\lesdag project\lesdag`. Eén model per toets in `tools/beoordeling/<id>.json`; alles wordt daaruit gemaakt. Voorbeeld van het schema: `tools/beoordeling/p9-vwo5.json`.

## 1. Model schrijven of aanpassen

- Bronnen eerst: PTA/PTO (muziekpagina's in de PTA-pdf), studiewijzer, leergang (`public/data/basis.json` → `leergangen[<lg>].toetsen` en `.weken`), bestaande sectiemodellen in `Documenten - Sectie Muziek\00 Sectie\Vakwerkplan en curriculum\Beoordelingsmodellen\`. Tegenstrijdigheden niet zelf oplossen: in `OPEN-PUNTEN.md` onder A.
- Velden: `id, klas, toets, titel, thema, weging, herkansbaar, velden (2-4 labels), vooruit, leerlingTitel, leerlingInstructie?, pta, map (vanaf "Documenten - Sectie Muziek", eindigt op Beoordeling), lessen [{lg, w, slot:"l1", wat:["docent","scoreblad","leerling"]}], niveaus 4/6/8/10, tussenscores, cijfer, zelfbeoordeling (procent, standaard 10; 0 als reflectie al een criterium is), onderdelen [{groep, stuk, criteria [{id, naam, uitleg, weging, docent[4], leerling[4]}]}]`.
- 5 tot 7 criteria, teksten ≤110 tekens, gewone woorden, geen leerlingnamen. `toets` + `klas` bepalen de bestandsnamen: moeten uniek zijn per map.
- Meerdere klassen tegelijk: helpers met een strakke opdracht (alleen hun JSON schrijven, geen scripts draaien), daarna zelf controleren.

## 2. Bestanden maken (Word en Excel via COM)

```powershell
cd "<repo>"; powershell -NoProfile -ExecutionPolicy Bypass -File tools\beoordeling\maak-alles.ps1 -Ids <id>[,<id>] -Doelwortel "$env:LOCALAPPDATA\Temp\bq"
```
Eerst in de korte testmap (Word weigert paden boven 255 tekens). Controleer: elk pdf één pagina (tel `/Type /Page` in de bytes), en bekijk één pdf met Read. Scoreblad: open met Excel-COM, vul een rij in en reken het cijfer na. Daarna zonder `-Doelwortel` (= de echte sectiemap). Hangt Word of Excel, stop dan alleen de processen zonder venster.

## 3. Koppelen in Lesdag

`node tools/beoordeling/koppel-beoordeling.js`: zet de formulieren als materiaal in de lessen uit `lessen` en schrijft `public/data/beoordeling.json` (de app leest daaruit de knop Beoordelen). Dan `/lesdag-online`.

## 4. Melden

Per model: map, criteria met weging, bronnen, en wat Frans moet bevestigen (ook in `OPEN-PUNTEN.md`).
