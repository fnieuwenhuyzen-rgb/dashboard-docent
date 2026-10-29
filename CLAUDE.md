# Lesdag

Docent-app van Frans Nieuwenhuyzen (muziekdocent en sectievoorzitter, CSG Prins Maurits). Vanilla JS-PWA zonder build: Vandaag en Week als agenda, Lesmodus (digibord), Groepen, Rooster, Sectie, Instellingen, Beoordelen. Frans schrijft Nederlands: korte zinnen, informeel.

**Lees na dit bestand:** `OPEN-PUNTEN.md` (werkvoorraad). Lange achtergrond en geschiedenis: `handboek/overdracht-tot-2026-10-29.md`. Zoek daar eerst de koppen (`grep -n "^## "`) en lees alleen de sectie die je nodig hebt.

## Waar alles staat

- Live: https://lesdag-muziek.pages.dev (Cloudflare Pages, Git-gekoppeld). **Elke push naar `main` staat binnen een minuut live.** Achter Cloudflare Access: alleen nwn@csgpm.nl (One-time PIN, sessie een maand, ook `*.lesdag-muziek.pages.dev`).
- Repo: deze map, GitHub `fnieuwenhuyzen-rgb/dashboard-docent` (privé). De app staat in `public/`; `tools/`, `bron/`, `worker/`, `handboek/` gaan niet online.
- Worker `lesdag-rooster` (Zermelo-iCal-doorgeefluik, `worker/rooster-proxy.js`), bewust niet achter Access.
- Gegevens: `public/data/basis.json` (leergangen, kalender, sectie, koor), `public/data/beoordeling.json` (beoordelingsmodellen). Dashboard-artifact "Leergang muziek": https://claude.ai/artifact/J27NLYLXHRFSCGvjDmGdj2 (bron `bron/`).
- Eigen staat van Frans: localStorage `lesdag-staat` en, na Microsoft-login, OneDrive `Apps/Lesdag/lesdag.json`. Les-id's zijn `leergang:lesweek.lesnummer`; weekindeling niet wijzigen zonder migratie.

## Vaste afspraken

- **Privacy:** nooit leerlingnamen of -gegevens in de repo, `basis.json`, `beoordeling.json` of andere openbare plekken. Klassenlijsten en scores alleen in `S.beoord` (apparaat en eigen OneDrive). Ingevulde formulieren met namen in de sectiemap niet openen of citeren.
- **Zermelo-link** is een wachtwoord: nooit in code, commit of chat. Frans plakt hem zelf in Instellingen.
- **Lesmateriaal en presentaties:** geen AI-gevoel (geen meta-tekst, geen generieke foto's), passend bij de les, echte rechtenvrije foto's met bron in `beeld/bronnen.txt`. Ontwerptaal van de didactische kaarten; per leerjaar een eigen accent. Klaar vóór de eerstvolgende maandag.
- Christelijke school: liedkeuze en voorbeelden daarop afstemmen. Geen songteksten overnemen.
- Lokaal 009 met digibord; laptop staat altijd klaar.
- Feiten uit de bronnen (PTA, studiewijzer, leergang); tegenstrijdigheden melden, niet zelf oplossen.

## Werkwijze (zuinig)

- Begin een werkblok met dit bestand en `OPEN-PUNTEN.md`; geen oude sessies wekenlang doorzetten. Sluit af door `OPEN-PUNTEN.md` bij te werken (afgevinkt, nieuw, beslissingen van Frans).
- Verzamel vragen aan Frans in `OPEN-PUNTEN.md` onder A, niet verspreid door de chat.
- Testen: meten met `javascript_tool` en `get_page_text`, geen schermafdrukken tenzij de opmaak zelf de vraag is. Testgegevens zijn verzonnen namen; ruim ze op.
- Grote zoek- of schrijfklussen (meerdere klassen tegelijk) aan helpers met een strakke opdracht; zij schrijven alleen hun bestanden, jij controleert en publiceert.
- Model per klus: zwaar model voor ontwerp en onderzoek, lichter model voor bouwen volgens een goedgekeurd plan of mechanisch werk.

## Skills (in `Sectie Muziek/.claude/skills/`)

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

- `public/app.js`: alles behalve de lesmodus. Agenda: `dagItems`, `agendaRaster`, `agPaneel`, `planKaart`. Koor: `koorOp`, `koorKaart`. Beoordelen: `viewBeoordelen`, `bmExport` (route `#beoordelen/<model>/<groep>`). Nu-scherm (proef, branch `proef-nu`): `viewNu`, `moment`, `partituur`, `voorstellen`; pauzes `pauzeDag` (`S.pauzes`, rustblok); regie `viewRegie` + bord via BroadcastChannel; opdrachtbalk `paletOpen`, `leesTaak`. Principes in `OPEN-PUNTEN.md`, sectie Proef Nu-scherm. Service worker `public/sw.js`: verhoog `CACHE` bij elke wijziging in de vaste bestandenlijst.
- `public/lesmodus.js`: digibordpresentatie (fasen als objecten `{min, soort, kop, stappen, klaar, docent, beeld}`).
- `tools/`: lesinhoud (`inhoud-*.json` + `merge-inhoud.js`), presentaties (`lesdeck.js`, `maak-decks-*.js`), SharePoint-links (`sp.js`), koor (`koor-sync.js`), beoordeling (`beoordeling/`). Na `merge-inhoud.js --force` altijd `beoordeling/koppel-beoordeling.js` opnieuw draaien.
