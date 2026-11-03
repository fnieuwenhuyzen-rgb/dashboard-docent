# Lesdag

Docent-app van Frans Nieuwenhuyzen (muziekdocent en sectievoorzitter, CSG Prins Maurits). Vanilla JS-PWA zonder build: Vandaag en Week als agenda, Lesmodus (digibord), Groepen, Rooster, Sectie, Reclame, Instellingen, Beoordelen. Frans schrijft Nederlands: korte zinnen, informeel.

**Lees na dit bestand:** `OPEN-PUNTEN.md` (werkvoorraad). Lange achtergrond en geschiedenis: `handboek/overdracht-tot-2026-10-29.md`. Zoek daar eerst de koppen (`grep -n "^## "`) en lees alleen de sectie die je nodig hebt.

## Waar alles staat

- Live: https://lesdag-muziek.pages.dev (Cloudflare Pages, Git-gekoppeld). **Elke push naar `main` staat binnen een minuut live.** Achter Cloudflare Access: alleen nwn@csgpm.nl (One-time PIN, sessie een maand, ook `*.lesdag-muziek.pages.dev`).
- Repo: deze map, GitHub `fnieuwenhuyzen-rgb/dashboard-docent` (privé). De app staat in `public/`; `tools/`, `bron/`, `worker/`, `handboek/` gaan niet online.
- Worker `lesdag-rooster` (Zermelo-doorgeefluik voor koppelcode, afspraken en iCal, `worker/rooster-proxy.js`), bewust niet achter Access. Staat los van Pages: na een wijziging online zetten met `wrangler deploy worker/rooster-proxy.js --name lesdag-rooster --compatibility-date 2026-01-01` (uploaden via de dashboard-API blokkeert Cloudflare). Hij bewaart geen token: die staat in de browser en gaat per verzoek mee.
- Gegevens: `public/data/basis.json` (leergangen, kalender, sectie, koor), `public/data/beoordeling.json` (beoordelingsmodellen). Dashboard-artifact "Leergang muziek": https://claude.ai/artifact/J27NLYLXHRFSCGvjDmGdj2 (bron `bron/`).
- Eigen staat van Frans: localStorage `lesdag-staat`, en met synchroniseren aan ook D1 `lesdag-sync` (EU, alleen aan productie gekoppeld, `wrangler.toml`; API `functions/api/staat.js`; logica `public/sync.js`; tests `tools/test-sync.js`). Elk apparaat zet het zelf aan in Instellingen; een leeg apparaat neemt de server vanzelf over. Back-ups: 30 dagen per dag plus de eerste upload. Geen Entra-koppeling (besluit Frans, 3-11); `m365.js` is niet meer in gebruik. Les-id's zijn `leergang:lesweek.lesnummer`; weekindeling niet wijzigen zonder migratie.

## Vaste afspraken

- **Privacy:** nooit leerlingnamen of -gegevens in de repo, `basis.json`, `beoordeling.json` of andere openbare plekken. Klassenlijsten en scores alleen in `S.beoord` (apparaten en D1 `lesdag-sync` achter de login, besluit Frans 3-11). Verjaardagen, absenten en logboeknotities (`lesdag-apparaat`) en het beoordelingslogboek (IndexedDB) blijven op het apparaat. Voeg nooit iemand toe aan de Access-policy zonder dit opnieuw te bekijken. Ingevulde formulieren met namen in de sectiemap niet openen of citeren.
- **Zermelo-link, koppelcode en token** zijn wachtwoorden: nooit in code, commit of chat. Frans plakt ze zelf in Instellingen. De API-token staat in localStorage `lesdag-zermelo-api`, niet in `S` (dus niet in een kopie), en gaat mee met synchroniseren (`_zermeloApi`, besluit Frans 3-11).
- **Lesmateriaal en presentaties:** geen AI-gevoel (geen meta-tekst, geen generieke foto's), passend bij de les, echte rechtenvrije foto's met bron in `beeld/bronnen.txt`. Ontwerptaal van de didactische kaarten; per leerjaar een eigen accent. Klaar vóór de eerstvolgende maandag.
- Christelijke school: liedkeuze en voorbeelden daarop afstemmen. Geen songteksten overnemen.
- Lokaal 009 met digibord; laptop staat altijd klaar.
- Feiten uit de bronnen (PTA, studiewijzer, leergang); tegenstrijdigheden melden, niet zelf oplossen.

## Werkwijze (zuinig)

- Begin een werkblok met dit bestand en `OPEN-PUNTEN.md`; geen oude sessies wekenlang doorzetten. Sluit af door `OPEN-PUNTEN.md` bij te werken (afgevinkt, nieuw, beslissingen van Frans).
- Verzamel vragen aan Frans in `OPEN-PUNTEN.md` onder A, niet verspreid door de chat.
- Synchroniseren testen: `npx wrangler pages dev public --port 8799 --binding DEV_EMAIL=nwn@csgpm.nl --d1 DB=771e21c8-c23f-404e-b70a-a0b304005a23` gebruikt een lokale kopie, nooit de echte database (schema: `wrangler d1 migrations apply lesdag-sync --local --env production`). `localhost` en `127.0.0.1` zijn dan twee apparaten; `node tools/test-sync.js http://localhost:8799/api/staat` op een lege testdatabase.
- Testen: meten met `javascript_tool` en `get_page_text`, geen schermafdrukken tenzij de opmaak zelf de vraag is. Testgegevens zijn verzonnen namen; ruim ze op.
- Grote zoek- of schrijfklussen (meerdere klassen tegelijk) aan helpers met een strakke opdracht; zij schrijven alleen hun bestanden, jij controleert en publiceert.
- Model per klus: zwaar model voor ontwerp en onderzoek, lichter model voor bouwen volgens een goedgekeurd plan of mechanisch werk.

## Skills (in `.claude/skills/` van dit project)

- `/lesdag-online`: committen, pushen (= live) en live controleren achter Access.
- `/lesdag-lokaal`: de app lokaal testen op `lesdag-proef` (`tools/serve-lokaal.js`), met testrooster en opruimen.
- `/lesdag-beoordeling`: een beoordelingsmodel toevoegen of wijzigen, formulieren en scorebladen maken, koppelen in de lessen.
- `/lesdag-koor`: de koorplanning uit de Koorapp opnieuw ophalen na een wijziging in Beheer.

## Laptop (geen beheerdersrechten)

- Node: `C:\Users\nwn\AppData\Local\Programs\node\node.exe` (niet op PATH in bash). Git: `%LOCALAPPDATA%\Programs\Git\cmd\git.exe`.
- `git push` alleen via `run_in_terminal` (Credential Manager), met als cwd deze map.
- In PowerShell is `R` een alias (Invoke-History): geen eigen functie zo noemen. `$c` en `$C` zijn dezelfde variabele.
- Word en Excel via COM: paden boven 255 tekens weigert Word; test in een korte map (`%LOCALAPPDATA%\Temp\bq`).
- Cloudflare Access beheren kan via de dashboard-API vanuit een ingelogde tab op dash.cloudflare.com (fetch met `X-Cross-Site-Security: dash`); Access-app "Lesdag" id `c47af1f4-8d7b-48ef-9910-d740ccc58ea0`.

## Opbouw van de code (kort)

- `public/app.js`: alles behalve de lesmodus. Agenda: `dagItems`, `agendaRaster`, `agPaneel`, `planKaart`. Koor: `koorOp`, `koorKaart`. Beoordelen: `viewBeoordelen`, `bmExport` (route `#beoordelen/<model>/<groep>`). Nu-scherm: `viewNu`, `moment`, `partituur`, `voorstellen`; pauzes `pauzeDag` (`S.pauzes`, rustblok); regie `viewRegie` + bord via BroadcastChannel; opdrachtbalk `paletOpen`, `leesTaak`. Principes in `OPEN-PUNTEN.md`, sectie Proef Nu-scherm. Synchroniseren: `syncStart`, `syncKaart`, `syncDoc`, `syncZet` en `syncMag` (wacht tijdens lesmodus, typen of een open paneel). Service worker `public/sw.js`: verhoog `CACHE` bij elke wijziging in de vaste bestandenlijst; `/api/` blijft buiten de cache.
- `public/reclame.js` + `public/data/reclame.json`: reclame voor weekinfo en borden (tekst, afbeelding, staande pptx). Taken en tabblad Reclame staan in `app.js` (`reclameActs`, `reclameMomenten`, `reclameOpen`, `viewReclame`).
- `public/lesmodus.js`: digibordpresentatie (fasen als objecten `{min, soort, kop, stappen, klaar, docent, beeld}`).
- `tools/`: lesinhoud (`inhoud-*.json` + `merge-inhoud.js`), presentaties (`lesdeck.js`, `maak-decks-*.js`), SharePoint-links (`sp.js`), koor (`koor-sync.js`), beoordeling (`beoordeling/`). Na `merge-inhoud.js --force` altijd `zet-decks-in-leergang.js` en `beoordeling/koppel-beoordeling.js` opnieuw draaien.
