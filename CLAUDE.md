# Lesdag

Docent-app van Frans Nieuwenhuyzen (muziekdocent, CSG Prins Maurits). Vanilla JS-PWA zonder build, voorlopig alleen voor Frans. Frans schrijft Nederlands: kort, informeel.

## Begin hier

- Werk in een eigen worktree vanaf `main`: `git worktree add -b <naam> C:/Users/nwn/lesdag-werk/<naam> main`. Niet in de hoofdmap `C:/Projecten/Lesdag`.
- **Elke push naar `main` staat binnen een minuut live.** Niet pushen, geen `wrangler deploy`, nooit de echte database zonder ja van Frans.
- Stand, volgende stappen en vragen aan Frans: `OPEN-PUNTEN.md`. Afsluiten: dat bestand bijwerken en kort houden.

| Je taak | Lees (alleen dan) |
|---|---|
| Code, gegevens, workers, uitrollen, laptop | `handboek/techniek.md`, per kop |
| Testen | `tools/TESTEN.md` |
| Meerdere sessies, samenvoegen, opruimen | `handboek/werkwijze-parallel.md` |
| Iets is stuk | `handboek/noodprocedures.md` |
| Uitleg voor Frans | `handboek/gebruiken.md` |
| Klein open punt | zoek in `handboek/werkvoorraad.md` |
| Eerder besluit | `handboek/beslisblad-2026-11-09.md`: niet opnieuw voorleggen |

## Zuinig lezen

- Nooit hele bestanden of onbegrensd `grep`, `sed`, `cat` op `public/app.js` (530 kB), `public/data/*.json` en `bron/leergang-data.json` (tot 920 kB op één regel), of `handboek/*archief*` (130 kB).
- `node tools/kijk.js inhoud` (kopjes `app.js`), `fn <naam>`, `zoek <regex> [pad]`, `basis [leergangen.vwo4.toetsen]`, `les vwo4:12.1`.
- Daarna `Read` met `offset` en `limit`. Bash-uitvoer altijd met `| cut -c1-200`.
- Tests: `node tools/test-alles.js --snel` (±4 minuten, dus op de achtergrond). Eén regel als alles goed is, `--lang` voor de tabel.
- Node staat niet op PATH in bash: `C:\Users\nwn\AppData\Local\Programs\node\node.exe`.

## Vaste afspraken

- **Privacy:** nooit leerlingnamen of -gegevens in de repo, `basis.json`, `beoordeling.json`, documentatie of andere openbare plekken. Klassenlijsten en scores alleen in `S.beoord`. Verjaardagen blijven in Magister. Absenten, logboeknotities (`AP`) en beoordelingslogboek blijven op het apparaat. Ingevulde formulieren met namen in de sectiemap niet openen of citeren. Niemand toevoegen aan de Access-policy zonder dit opnieuw te bekijken. Wat in de agendafeed gaat (`agendaItems`): nooit eigen vrije tekst of leerlinggegevens erbij zonder herziening.
- **Zermelo-link, koppelcode, token, agendasleutel** zijn wachtwoorden: nooit in code, commit, documentatie of chat.
- **Lesmateriaal:** geen AI-gevoel, passend bij de les, echte rechtenvrije foto's met bron in `beeld/bronnen.txt`. Klaar vóór de eerstvolgende maandag. Nooit voor de klas presenteren: groepjes, Frans loopt langs. Geen telefoon in de les. Christelijke school: liedkeuze daarop afstemmen. Geen songteksten overnemen. Lokaal 009 met digibord; laptop staat klaar.
- Feiten uit de bronnen (PTA, studiewijzer, leergang); tegenstrijdigheden melden, niet zelf oplossen.
- Les-id's zijn `leergang:lesweek.lesnummer`: weekindeling niet wijzigen zonder migratie.
- Maar één sessie tegelijk aan `basis.json`, `bron/leergang-data.json` en het cachenummer in `sw.js`.
- `app.js` blijft één bestand (besluit 9-11; wanneer opsplitsen: `techniek.md`, hoofdstuk 11).
- Synchroniseren alleen testen op een lokale kopie van de database. Testgegevens zijn verzonnen namen; ruim ze op.
- `git push` alleen via `run_in_terminal` (Credential Manager), met cwd in de repo.

## Waar alles staat

- Live: https://lesdag-muziek.pages.dev, achter Cloudflare Access. Repo: GitHub `fnieuwenhuyzen-rgb/dashboard-docent` (privé). Alleen `public/` en `functions/` gaan online.
- Workers `lesdag-rooster` (Zermelo) en `lesdag-agenda` (Outlook) staan los van Pages; een push verandert ze niet.
- Documenten staan niet in de repo maar in OneDrive, `Dashboard Docent/lesdag project` (controle- en feedbackrapporten in `rapporten`).
