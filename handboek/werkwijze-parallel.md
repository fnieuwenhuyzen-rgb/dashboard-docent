# Meerdere sessies tegelijk aan Lesdag

Stand: 8 november 2026. Techniek: `techniek.md`. Als het misgaat: `noodprocedures.md`.

## Het idee

Elke sessie krijgt een **eigen kopie van de code** (een worktree) en een **eigen branch**. Zo raken ze elkaar niet. Eén sessie voegt aan het eind alles samen. Niemand pusht of zet iets live zonder het ja van Frans.

Alles staat in `C:\Users\nwn\lesdag-werk\`. De hoofdmap (`...\Dashboard Docent\lesdag project\lesdag`) blijft op `main` staan en wordt niet bewerkt.

## Een worktree maken

Elke nieuwe taak start vanaf de branch `samengevoegd`, **niet** vanaf `main`. `samengevoegd` heeft alle werk dat klaar is maar nog niet live staat.

```bash
cd "C:/Users/nwn/OneDrive - CSG Prins Maurits/Documenten/Dashboard Docent/lesdag project/lesdag"
git worktree add -b <branchnaam> C:/Users/nwn/lesdag-werk/<korte-naam> samengevoegd
```

- `git` is `%LOCALAPPDATA%\Programs\Git\cmd\git.exe`.
- Een korte naam, hetzelfde als de branch of bijna: `datum-week`, `prestaties`, `handboek`.
- Werk daarna **alleen** in die map. Ga niet terug naar de hoofdmap.
- Een branchnaam kan maar in één worktree tegelijk uitgecheckt zijn.

Eén keer nodig: `C:\Users\nwn\lesdag-werk\_testgereedschap` met Playwright (`tools/TESTEN.md`). Die map is gedeeld. **Niet verwijderen.**

## Een eigen poort

Je test de app met `node tools/serve-lokaal.js public <poort>`, **in je eigen worktree**.

```bash
"C:/Users/nwn/AppData/Local/Programs/node/node.exe" tools/serve-lokaal.js public 8751
```

Let op:

- De ingebouwde start `lesdag-proef` in `.claude/launch.json` wijst naar de **hoofdmap**, met een vast pad en poort 8732. In een worktree serveert die dus **niet jouw** wijzigingen. Start liever het commando hierboven, of pas `launch.json` in je worktree aan en commit dat niet.
- Kies een vrije poort tussen 8740 en 8790. Check eerst: `Get-NetTCPConnection -LocalPort 8751 -State Listen` (PowerShell). Staat er iets, dan neem je een andere. Poort 8732 is voor de hoofdmap, 8799 voor de synchroniseer-test.
- De staat staat per adres. `localhost:8751` en `localhost:8752` zijn twee aparte apparaten.
- Test synchroniseren lokaal met `wrangler pages dev ... --port <eigen poort>` en een lokale kopie van de database. **Nooit** de echte. Zie `tools/TESTEN.md`.
- Ruim je server op als je klaar bent. Stop alleen je **eigen** proces.

## Wat niet samen kan

Twee sessies mogen niet tegelijk aan deze dingen werken. Alleen één wijzigt ze; de ander wacht of vraagt het aan die ene.

| Wat | Waarom |
|---|---|
| `public/data/basis.json` en `bron/leergang-data.json` | `basis.json` is één regel. Elke samenvoeging botst |
| `public/sw.js` (het cachenummer) | alle takken verhogen dezelfde regel (zie hieronder) |
| `OPEN-PUNTEN.md` en `CLAUDE.md` | alle sessies schrijven eraan |
| Dezelfde functie in `app.js` | het bestand is 466 kB en lange regels, samenvoegen is lastig |
| `lesdag-sync` (de database) en de workers | live en gedeeld, alleen met een ja van Frans |
| Dezelfde bestanden in de sectiemap | OneDrive-synchronisatie en collega's |

Geef een sessie dus een **eigen bestand of eigen onderdeel**. Zijn twee taken gekoppeld aan `basis.json`, doe ze dan achter elkaar.

Mag wel tegelijk: tests, documentatie in `handboek/`, een eigen `tools/`-script, een eigen deel van de lesinhoud, mits die in een eigen `tools/inhoud-*.json` staat.

Notities voor de samenvoeger of andere sessies gaan in de gedeelde notitiemap van de sessiegroep, niet in de repo. Houd dat kort.

## Het cachenummer

`public/sw.js` heeft `const CACHE = 'lesdag-vN'`. Het moet omhoog bij elke wijziging aan de vaste bestandenlijst of aan `app.js`/`app.css`. Zie `techniek.md`.

- **Verhoog het niet op je eigen branch.** Zeg in je commitbericht dat er een verhoging nodig is.
- De sessie die samenvoegt zet het cachenummer **één keer**, aan het eind. Zo heet de laatste commit "Samenvoegen: <naam>, cachenummer naar v49".
- Heeft toch iemand het verhoogd? Dan botst `sw.js` bij het samenvoegen. De oplossing: kies het hoogste nummer plus één. Dat is geoefend.

## Samenvoegen

Dit doet één sessie tegelijk, in de worktree van `samengevoegd` (`C:\Users\nwn\lesdag-werk\samengevoegd`).

1. Zorg dat je takken af zijn: `git status` schoon, de tests gedaan: `node tools/test-alles.js --snel`.
2. Eén voor één: `git merge --no-ff <branch> -m "Samenvoegen: <naam>"`.
3. Botst het? Los het op en kijk goed:
   - `sw.js`: hoogste cachenummer plus één.
   - `basis.json` of `bron/leergang-data.json`: **niet met de hand**. Neem de ene versie en laat de andere wijziging opnieuw door het script lopen waarmee hij is gemaakt (`tools/zet-*.js`, `merge-inhoud.js`). Daarna `node tools/controleer-gegevens.js`.
   - Twee aan dezelfde regel van een `.js`-bestand: lees beide wijzigingen en bewaar ze allebei.
   - Je komt er niet uit: `git merge --abort` en meld het.
4. Na elke samenvoeging: `node tools/test-alles.js --snel`. Faalt het, dan draai je de laatste samenvoeging terug (`git reset --hard HEAD~1` mag hier alleen op je eigen, nog niet gedeelde `samengevoegd`) of herstel je het.
5. Verhoog het cachenummer en commit.
6. **Niet pushen.** Frans geeft het ja. Daarna komt `samengevoegd` in `main` en `/lesdag-online` doet de rest.

**Geoefend (8 november, op een kopie):** twee takken die allebei het cachenummer verhogen en dezelfde laatste regel van een bestand wijzigen, daarna samenvoegen. Resultaat: conflict in `sw.js` en in dat andere bestand, `git merge --abort` bracht alles terug. `git revert -m 1` van een samenvoeging: ook geoefend.

## Oude werkmappen opruimen

Er staan nu rond de dertig worktrees in `lesdag-werk`. Veel zijn af. Een map ruim je op als de branch **samengevoegd** is.

1. Overzicht: `git worktree list`
2. Welke branches zitten al in `samengevoegd`: `git branch --merged samengevoegd`. Welke niet: `git branch --no-merged samengevoegd`. Die laatste hebben nog werk dat nergens anders staat. **Niet opruimen.**
3. Is er een sessie nog bezig? Ruim dan niet op. Sluit eerst de sessie (met het ja van Frans).
4. Eén map opruimen: `git worktree remove C:/Users/nwn/lesdag-werk/<naam>` (zonder `--force`: git weigert als er niet-gecommitte bestanden zijn, kijk eerst wat er is).
5. Daarna de branch: `git branch -d <branchnaam>`. `-d` weigert als hij niet is samengevoegd. Dat is een goede beveiliging. Gebruik **geen** `-D` zonder te kijken wat je kwijt raakt.
6. Is een map handmatig verwijderd? `git worktree prune`.
7. De map `_testgereedschap` en `samengevoegd` laat je staan.

**Geoefend:** op een kopie met twee worktrees. `worktree remove` weigerde bij een niet-gecommit bestand (zoals bedoeld) en werkte daarna; `branch -d` weigerde bij een niet-samengevoegde branch en werkte bij een samengevoegde; `worktree prune` ruimde een met de hand verwijderde map op. Niets in de echte `lesdag-werk` is verwijderd: dat wacht op het ja van Frans.

## Wat Frans hierover beslist

- Of een worktree wordt opgeruimd.
- Wanneer `samengevoegd` in `main` gaat en online komt.
- Of een sessie wordt gearchiveerd.

Elke sessie heeft zijn eigen verantwoordelijkheid: werk in je eigen map, commit alleen je eigen bestanden, stash niet, reset niet, wissel geen branch in andermans map.
