# Lesdag: overdracht voor Claude Code

Eigenaar: Frans Nieuwenhuyzen, muziekdocent en sectievoorzitter muziek op CSG Prins Maurits (Middelharnis). Communiceert in het Nederlands: korte zinnen, informeel, weinig gedachtestreepjes.

## Wat dit is

Lesdag is een webapp (vanilla JS, geen build-stap) om muzieklessen voor te bereiden en te geven:
Vandaag (voorbereiding per lesuur, klaarzetten per lokaal), Lesmodus (volledig scherm voor het digibord, fasen met timer, afronden met gegeven/half/niet), Week, Groepen (voortgang per groep), Rooster, Sectie (taken sectievoorzitter), Instellingen.

## Stand op 20 oktober 2026

- Online gezet in Cloudflare (account van Frans):
  - Worker `lesdag-rooster` op https://lesdag-rooster.f-nieuwenhuyzen.workers.dev, live met de code uit `worker/rooster-proxy.js` (`LESDAG = 'https://lesdag-muziek.pages.dev'`). Doorgeefluik voor de Zermelo-agenda (CORS).
  - Pages-project `lesdag-muziek` (Direct Upload). Eerste deployment op 20 oktober 2026 (avond) via `npx wrangler pages deploy`: https://lesdag-muziek.pages.dev is live, zonder Microsoft-koppeling (clientId leeg). Uitgerold werden alleen de appbestanden (index, app.js/css, auth.html, config.js, m365.js, sw.js, manifest, data/, icons/, vendor/); `bron/`, `tools/`, `worker/` en de notities niet. De oude losse kopie van de app staat in `Dashboard Docent\oud\` (niet meer bijwerken); deze repository is leidend.
- `public/config.js`: `roosterProxy` is ingevuld; `clientId`/`tenantId` (Microsoft Entra-app-registratie) nog leeg, aanvraag bij de ICT loopt (tekst in LEESMIJ.md).
- Rooster komt uit Zermelo (csgpm.zportal.nl, iCal). De link van Frans bevat een access_token: behandel als wachtwoord, nooit in code of repository zetten. Frans plakt hem zelf in Instellingen.
- Niet getest met echte data: de herkenning van muzieklessen en groepen in de Zermelo-SUMMARY (`zMuziek`, `zGroep` in app.js) is gebaseerd op een aanname ("mu - h3a"). Controleer met het echte rooster.
- Microsoft 365-koppeling (MSAL 5.23.0 met redirect bridge `auth.html`, opslag in OneDrive-appmap, zoeken via /search/query, preview in lesmodus) is gebouwd maar nog niet getest tegen een echte tenant.

## Online zetten

De repository is gekoppeld aan GitHub; Cloudflare Pages bouwt vanzelf uit de map `public/` bij elke push naar `main` (build command leeg, output directory `public`). Handmatig uitrollen kan ook, vanuit deze map, met Node.js en een eenmalige `npx wrangler login` door Frans zelf:

    npx wrangler pages deploy public --project-name lesdag-muziek --commit-dirty=true

Sinds 20 oktober staan de appbestanden in `public/`; `bron/`, `tools/`, `worker/` en de notities staan ernaast en gaan niet mee. Worker bijwerken: `npx wrangler deploy worker/rooster-proxy.js --name lesdag-rooster`.

GitHub-koppeling klaar op 20 oktober 2026 (avond): repository https://github.com/fnieuwenhuyzen-rgb/dashboard-docent (privé, branch `main`). Het Direct Upload-project is verwijderd en vervangen door een Pages-project met Git-koppeling onder dezelfde naam `lesdag-muziek` (build command leeg, output `public`). Elke push naar `main` komt vanzelf online; het adres en de Worker-CORS zijn ongewijzigd.

## Gegevens

- `public/data/basis.json`: leergangen (11: bb1, havo3, kmu3, vwo3, mavo3, mavo4, havo4, havo5, vwo4, vwo5, vwo6), kalender 2026-2027 (lesweken 1-38, vakanties), vrije dagen, groepen per leergang, sectie-items. Gegenereerd uit het dashboard.
- Eigen staat van Frans (rooster, voortgang, aanpassingen per les, sectie-afvinkingen) staat los daarvan in localStorage (`lesdag-staat`) en, na inloggen, in OneDrive (`Apps/Lesdag/lesdag.json`). Een nieuwe basis.json overschrijft die niet. Les-id's zijn `leergang:lesweek.lesnummer`; verander de weekindeling van een leergang dus niet zonder migratie.
- `bron/leergang-dashboard.html` is het claude.ai-artifact "Leergang muziek" (https://claude.ai/artifact/J27NLYLXHRFSCGvjDmGdj2), versie 11. `bron/leergang-data.json` is de data daaruit. `tools/newdata.py` + `tools/build.py` + `tools/sectie.js` bouwden die data en het dashboard (paden in de scripts verwijzen naar de oude werkmap; pas aan voor gebruik).

## Lesmodus (digibord)

`public/lesmodus.js` bouwt de presentatie (20 oktober 2026, na kritiek van Frans op de tekst-only versie). Vaste boog: jouw kaart (klaarzetten, vorige notitie; niet voor het bord) → welkom met lesvraag en agenda-balk → doel met aanvinkbare succescriteria → per fase een slide met soort (start, luisteren, uitleg, doen, gesprek, check, afsluiten; eigen kleur en icoon), kop voor de leerlingen, genummerde stappen, "Klaar?"-verlenging, beeld en een timerring die vanzelf start → check → rode draad (citaatstijl) → thuis en materiaal → afronden. Docentnotities per fase staan in een witte strook (toets n of knop "notities"). Fasen zijn tekst ("10 min · uitleg: …", soort wordt herkend) of objecten `{min, soort, kop, stappen[], klaar, docent, beeld}`. Beeldsoorten: `akkoorden` (gitaardiagrammen + tonen), `vorm` (vormschema), `opbouw` (dynamiek), `orkest` (opstelling), `kaarten`, `tabel`, `cijfer`, `tekst`. In de bewerk-lade worden fasen als tekst getoond: regel "10 min · soort · kop", daaronder "- stap", "? klaar", "> notitie"; `beeld` blijft bewaard op dezelfde positie. Het dashboard-artifact leest objectfasen als tekst (`FT`, patch in `tools/dashboard-fasen-patch.js`).

## Lesinhoud invullen

Lesinhoud per klas staat in `tools/inhoud-<naam>.json` (gekoppeld op lestitel; velden vraag, doel, criteria, fasen, formatief, identiteit, materiaal, benodigd; materiaal via sleutels in `_mat`). `node tools/merge-inhoud.js <naam> <klas> [<klas>...] [--force]` zet het in `public/data/basis.json` én `bron/leergang-data.json`; bestaande velden blijven staan tenzij `--force`. Daarna de data in `bron/leergang-dashboard.html` verversen (data-blok `<script id="data">` vervangen door `bron/leergang-data.json`, met `</` als `<\/`) en het artifact publiceren via zijn URL. Het lesverloop als objectfasen staat apart in `tools/fasen-<naam>.json`; `node tools/zet-fasen.js <naam>` zet dat in `inhoud-<naam>.json` (daarna merge met `--force`). Gedaan: klas 3 (`inhoud-klas3.json` + `fasen-klas3.json`, havo 3 en vwo 3, 20 oktober 2026). Nog leeg: BB1, keuzeuur h3, mavo 3, mavo 4.

## Inhoudelijke afspraken

- Klas 3 (havo 3, vwo 3): periode 2 is een eigen songbox op basis van **Way Maker** (Sinach), basis voor PTO P1. De songbox moet nog gemaakt worden; eerst onderzoeken hoe Musicbox-musicsheets zijn opgebouwd (Frans moet daarvoor inloggen in Musicbox of de map 01 Onderbouw muziek delen). Geen volledige songteksten opnemen (auteursrecht).
- PTO-richtlijnen: vóór elke PTO-toets een formatieve toets.
- Mavo 4: twee lessen per week tot de meivakantie (aanname bevestigd door Frans). Mavo 3, havo 3, vwo 3, BB1, keuzeuur h3: één les per week.
- Cijferinvoer-deadlines in de sectiedata zijn aannames (een week vóór de rapportvergadering); echte data nog onbekend.
- Lesmateriaal voor leerlingen: niet in de schoolhuisstijl, printvriendelijk. De app zelf gebruikt paars #5B247F en rood #C5002E, Encode Sans Condensed en Neuton.
