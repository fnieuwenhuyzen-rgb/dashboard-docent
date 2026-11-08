# Lesdag

Docent-app van Frans Nieuwenhuyzen (muziekdocent en sectievoorzitter, CSG Prins Maurits). Vanilla JS-PWA zonder build: Vandaag en Week als agenda, Lesmodus (digibord), Jaar, Rooster, Sectie, Reclame, Instellingen, Beoordelen. Voorlopig alleen voor Frans. Frans schrijft Nederlands: korte zinnen, informeel.

## Begin hier (nieuwe sessie)

1. Lees dit bestand en `OPEN-PUNTEN.md` (werkvoorraad; vragen aan Frans staan onder A).
2. Lees alleen wat je taak nodig heeft:

| Je taak | Lees |
|---|---|
| Code, gegevens, workers, service worker, uitrollen | `handboek/techniek.md` (met index van functies in `app.js`) |
| Testen | `tools/TESTEN.md` |
| Meerdere sessies tegelijk, worktrees, samenvoegen, opruimen | `handboek/werkwijze-parallel.md` |
| Iets is stuk (terugdraaien, back-up, agendalink, worker, Zermelo) | `handboek/noodprocedures.md` |
| Uitleg voor Frans zelf (maandag, toets, ziekte, periode, nieuw jaar) | `handboek/gebruiken.md` |
| Oude geschiedenis | `handboek/overdracht-tot-2026-10-29.md`; zoek per kop (`grep -n "^## "`) |

3. Werk in een eigen worktree in `C:/Users/nwn/lesdag-werk/<naam>`, vanaf branch `samengevoegd`. Niet in de hoofdmap, niet vanaf `main`.
4. Niet pushen, niet live, geen `wrangler deploy`, nooit de echte database. Dat gaat alleen na een ja van Frans.

## Waar alles staat

- Live: https://lesdag-muziek.pages.dev (Cloudflare Pages, Git-gekoppeld). **Elke push naar `main` staat binnen een minuut live.** Achter Cloudflare Access: alleen nwn@csgpm.nl.
- Repo: deze map, GitHub `fnieuwenhuyzen-rgb/dashboard-docent` (privé). De app staat in `public/`; `tools/`, `bron/`, `worker/`, `handboek/` gaan niet online.
- Workers `lesdag-rooster` (Zermelo) en `lesdag-agenda` (Outlook) staan los van Pages, bewust niet achter Access. Een push verandert ze niet; alleen `wrangler deploy`. Zie `techniek.md`. Wat in de agendafeed meegaat staat in `agendaItems` in `app.js`: nooit eigen vrije tekst of leerlinggegevens toevoegen zonder dit opnieuw te bekijken.
- Gegevens: `public/data/basis.json` (één regel; leergangen, kalender, toetsweken, sectie, koor), `public/data/beoordeling.json`. Les-id's zijn `leergang:lesweek.lesnummer`; weekindeling niet wijzigen zonder migratie. Dashboard-artifact "Leergang muziek": https://claude.ai/artifact/J27NLYLXHRFSCGvjDmGdj2 (bron `bron/`).
- Eigen staat van Frans: localStorage `lesdag-staat` (`S`), `lesdag-apparaat` (`AP`, blijft op het apparaat) en met synchroniseren aan ook D1 `lesdag-sync`. Geen Entra-koppeling (besluit Frans, 3-11); `m365.js` is niet in gebruik. Wat waar staat: `techniek.md`, hoofdstuk 3.

## Vaste afspraken

- **Privacy:** nooit leerlingnamen of -gegevens in de repo, `basis.json`, `beoordeling.json`, documentatie of andere openbare plekken. Klassenlijsten en scores alleen in `S.beoord` (apparaten en D1 `lesdag-sync` achter de login, besluit Frans 3-11). Verjaardagen van leerlingen blijven in Magister. Absenten en logboeknotities (`AP`) en het beoordelingslogboek (IndexedDB) blijven op het apparaat. Voeg nooit iemand toe aan de Access-policy zonder dit opnieuw te bekijken. Ingevulde formulieren met namen in de sectiemap niet openen of citeren.
- **Zermelo-link, koppelcode, token en agendasleutel** zijn wachtwoorden: nooit in code, commit, documentatie of chat. Frans plakt ze zelf in Instellingen. De API-token staat in localStorage `lesdag-zermelo-api`, niet in `S`, en gaat mee met synchroniseren.
- **Lesmateriaal en presentaties:** geen AI-gevoel (geen meta-tekst, geen generieke foto's), passend bij de les, echte rechtenvrije foto's met bron in `beeld/bronnen.txt`. Ontwerptaal van de didactische kaarten; per leerjaar een eigen accent. Klaar vóór de eerstvolgende maandag. Nooit voor de klas presenteren: in groepjes, Frans loopt langs. Geen telefoon in de les.
- Christelijke school: liedkeuze en voorbeelden daarop afstemmen. Geen songteksten overnemen.
- Lokaal 009 met digibord; laptop staat altijd klaar.
- Feiten uit de bronnen (PTA, studiewijzer, leergang); tegenstrijdigheden melden, niet zelf oplossen.

## Werkwijze (zuinig)

- Eén sessie per taak. Sluit af door `OPEN-PUNTEN.md` bij te werken (afgevinkt, nieuw, beslissingen van Frans), of bij parallel werk: een notitie voor de samenvoeger. Zie `werkwijze-parallel.md`.
- Verzamel vragen aan Frans in `OPEN-PUNTEN.md` onder A, niet verspreid door de chat.
- Tests: `node tools/test-alles.js --snel`. Meten met `javascript_tool` en `get_page_text`, geen schermafdrukken tenzij de opmaak zelf de vraag is. Testgegevens zijn verzonnen namen; ruim ze op.
- Synchroniseren testen alleen op een lokale kopie van de database (`techniek.md`, hoofdstuk 7).
- Maar één sessie tegelijk aan `basis.json`, `bron/leergang-data.json` en het cachenummer in `sw.js`.
- Grote zoek- of schrijfklussen aan helpers met een strakke opdracht; zij schrijven alleen hun bestanden, jij controleert.
- Model per klus: zwaar model voor ontwerp en onderzoek, lichter model voor bouwen volgens een goedgekeurd plan of mechanisch werk.

## Skills (in `.claude/skills/` van dit project)

- `/lesdag-online`: committen, pushen (= live) en live controleren achter Access.
- `/lesdag-lokaal`: de app lokaal testen op `lesdag-proef` (`tools/serve-lokaal.js`), met testrooster en opruimen. In een worktree wijst `lesdag-proef` naar de hoofdmap: start dan `tools/serve-lokaal.js public <eigen poort>` zelf.
- `/lesdag-beoordeling`: een beoordelingsmodel toevoegen of wijzigen, formulieren en scorebladen maken, koppelen in de lessen.
- `/lesdag-koor`: de koorplanning uit de Koorapp opnieuw ophalen na een wijziging in Beheer.

## Laptop (geen beheerdersrechten)

- Node: `C:\Users\nwn\AppData\Local\Programs\node\node.exe` (niet op PATH in bash). Git: `%LOCALAPPDATA%\Programs\Git\cmd\git.exe`.
- `git push` alleen via `run_in_terminal` (Credential Manager), met als cwd deze map.
- In PowerShell is `R` een alias (Invoke-History): geen eigen functie zo noemen. `$c` en `$C` zijn dezelfde variabele.
- Word en Excel via COM: paden boven 255 tekens weigert Word; test in een korte map (`%LOCALAPPDATA%\Temp\bq`).
- Cloudflare Access beheren kan via de dashboard-API vanuit een ingelogde tab op dash.cloudflare.com (fetch met `X-Cross-Site-Security: dash`); Access-app "Lesdag" id `c47af1f4-8d7b-48ef-9910-d740ccc58ea0`.
