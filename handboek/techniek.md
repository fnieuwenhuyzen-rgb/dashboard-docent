# Techniek van Lesdag

Voor wie aan Lesdag werkt (Frans of een Claude-sessie). Stand: 8 november 2026, gemaakt vanaf branch `samengevoegd`.
Lange geschiedenis: `overdracht-tot-2026-10-29.md`. Testen: `../tools/TESTEN.md`. Als het misgaat: `noodprocedures.md`.

## 1. In één alinea

Lesdag is een PWA zonder build. Er is geen bundelaar en geen framework. De map `public/` is de app en gaat letterlijk online.
Cloudflare Pages publiceert `public/` bij elke push naar `main`. Eigen gegevens van Frans staan in de browser en, als hij synchroniseren aanzet, ook in een database op Cloudflare.
Twee losse workers doen werk dat een browser zelf niet mag: Zermelo lezen en een agenda aan Outlook geven.

## 2. Onderdelen

| Onderdeel | Waar | Wat het doet |
|---|---|---|
| De app | `public/` | `index.html`, `app.css`, `app.js` (bijna alles), `lesmodus.js` (digibord), `lesklok.js` (resttijd), `sync.js`, `agendafeed.js`, `reclame.js`, `bm-reken.js` en `bm-pdf.js` (beoordelen) |
| Gegevens van de les | `public/data/` | `basis.json`, `beoordeling.json`, `notities.json`, `reclame.json` |
| Service worker | `public/sw.js` | cache voor offline gebruik |
| API achter Access | `functions/api/staat.js`, `functions/api/agenda.js` | Pages Functions: synchroniseren en de agendafeed schrijven |
| Worker `lesdag-rooster` | `worker/rooster-proxy.js` | doorgeefluik naar Zermelo (koppelcode, afspraken, iCal) |
| Worker `lesdag-agenda` | `worker/agenda-feed.js`, `worker/agenda-feed.toml` | geeft Outlook de agenda via een geheime link |
| Database `lesdag-sync` | D1, `migrations/0001_staat.sql` | de staat van Frans (alleen aan productie gekoppeld, `wrangler.toml`) |
| Database `lesdag-agenda` | D1 | alleen het iCal-bestand en de geheime sleutel, geen leerlinggegevens |
| Bron en hulpmiddelen | `bron/`, `tools/` | bron van de leergangen, scripts voor inhoud, decks, beoordeling en tests. Gaan niet online |
| Dashboard-artifact | `bron/leergang-dashboard.html` | het oude dashboard "Leergang muziek"; de bron van `basis.json` |

Wat online staat en wat niet:

- Pages: alleen `public/` en `functions/`.
- Achter Cloudflare Access (alleen `nwn@csgpm.nl`, een code per mail, sessie een maand): de app en `/api/*`.
- Bewust **niet** achter Access: de twee workers. De Zermelo-worker bewaart niets. De agenda-worker geeft alleen een bestand terug als je de 64 tekens lange sleutel kent.

## 3. Het gegevensmodel

Er zijn vier soorten gegevens. Ze staan op vier plekken en ze krijgen elk een andere behandeling.

### 3.1 `basis.json`: wat voor iedereen geldt

`public/data/basis.json` (±930 kB, **één regel**). Dit is de vaste inhoud van het jaar. Niemand typt hier in de app in.
De sleutels:

| Sleutel | Inhoud |
|---|---|
| `schooljaar` | `"2026-2027"` |
| `kalender` | `weken` (lesweek 1 tot 38 met weeknummer en datum van de maandag), `vakanties` (met `naWeek`), `syllabusVwo`, `syllabusHavo` |
| `vrijeDagen` | losse vrije dagen voor leerlingen |
| `leergangen` | per leergang (bb1, havo3, kmu3, vwo3, mavo3, mavo4, havo4, havo5, vwo4, vwo5, vwo6): `meta`, `blokken` (periodes), `toetsen`, `handelingsdelen`, `kaarten`, `weken` met de lessen |
| `groepen` | welke groepen bij welke leergang horen |
| `toetsweken` | per klas de toetsweken (n, van, tot) |
| `sectie` | de sectietaken en de jaarplanning van de sectie (±145 items) |
| `team` | data voor vwo 4-5-6 |
| `koor` | de koorplanning uit de Koorapp (zie `/lesdag-koor`) |

Regels:

- Een les heet `leergang:lesweek.lesnummer`. Die id staat in de voortgang van Frans. **Verander de weekindeling van een leergang nooit zonder migratie**, anders wijst de voortgang naar de verkeerde les.
- `bron/leergang-data.json` is de tweeling van `basis.json`. Wijzig je de een, wijzig dan ook de ander. `node tools/controleer-gegevens.js` kijkt of ze kloppen.
- **Nooit leerlingnamen in `basis.json`.** De controle zoekt ernaar.
- Omdat het één regel is, botst een samenvoeging altijd. Laat steeds één sessie tegelijk `basis.json` wijzigen (zie `werkwijze-parallel.md`).
- OneDrive heeft dit bestand een keer teruggezet naar een oude stand (2 november). Zie de noodprocedure. Daarom staat de code buiten OneDrive.

### 3.2 `beoordeling.json`: de beoordelingsmodellen

`public/data/beoordeling.json` (20 modellen). Elk model heeft criteria, wegingen, niveaus en de koppeling naar formulieren en scorebladen. De rekenregels staan in `bm-reken.js` en worden getest door `tools/beoordeling/test-reken.js`.
Maken en koppelen gaat met `/lesdag-beoordeling` en `tools/beoordeling/`. Na `merge-inhoud.js --force` altijd `koppel-beoordeling.js` opnieuw draaien.
Hier staan **geen** leerlingen en geen scores, alleen de modellen.

### 3.3 `S`: de staat van Frans

`S` is een object in `app.js`. Het staat in `localStorage` onder `lesdag-staat`. `nieuweStaat()` laat zien wat erin kan zitten.
Belangrijkste onderdelen:

| Veld | Wat |
|---|---|
| `rooster`, `groepLeergang` | het vaste rooster en welke groep bij welke leergang hoort |
| `voortgang` | per groep en les-id: gegeven, half af of niet gegeven |
| `les` | eigen aanpassingen en notities per les |
| `taken`, `dagTaken`, `uitgesteld`, `taakNoot` | eigen taken en afspraken |
| `sectieAf`, `sectieNotitie`, `sectieExtra` | afvinken en eigen taken in de sectie |
| `afwezig`, `ankers`, `uitval` | "Ik ben er niet" en inhalen |
| `rollen`, `potjes`, `duurLog` | rollen en tijdschattingen |
| `mag`, `magHw` | wat er in Magister nog moet |
| `beoord` | **klassenlijsten en scores** (met leerlingnamen). Alleen hier, nooit in de repo |
| `pauzes`, `reclame`, `koorAf` | pauzes, reclame, koortaken |
| `updated` | tijdstip van de laatste wijziging |

Naast `S` staan drie dingen in de browser die bewust niet in `S` zitten:

- `lesdag-zermelo-api`: de Zermelo-token. Een wachtwoord. Niet in een kopie. Gaat wel mee met synchroniseren (als `_zermeloApi`).
- `lesdag-sync-aan`: de vlag dat synchroniseren op dit apparaat aanstaat. Daarnaast bewaart IndexedDB `lesdag-sync` de laatst gedeelde versie (de "basis" voor het samenvoegen).
- IndexedDB van het beoordelingslogboek en `lesdag-beoordeling-reserve`.

### 3.4 `AP`: alleen op dit apparaat

`AP` staat in `localStorage` onder `lesdag-apparaat`. Het bevat verjaardagen van collega's, absenten (`weg`), logboeknotities over leerlingen (`log`) en wat al gefeliciteerd is (`felic`).
`AP` zit niet in een kopie en gaat **nooit** naar de server. Absenten en logboeknotities verdwijnen zodra ze in Magister staan.

### 3.5 Samengevat: wat staat waar

| Wat | Repo | Browser | Server (D1) | In kopie |
|---|---|---|---|---|
| Lessen, kalender, sectietaken (`basis.json`) | ja | gecached | nee | nee |
| Beoordelingsmodellen | ja | gecached | nee | nee |
| Voortgang, taken, rooster (`S`) | nee | ja | ja, als sync aan staat | ja |
| Klassenlijsten en scores (`S.beoord`) | **nee, nooit** | ja | ja (achter de login) | ja |
| Zermelo-token | **nee, nooit** | ja | ja (achter de login) | nee |
| Absenten, logboek, verjaardagen (`AP`) | nee | ja | **nee** | nee |
| Agenda voor Outlook | nee | nee | alleen in `lesdag-agenda` | nee |

## 4. Synchroniseren

- Logica: `public/sync.js`. API: `functions/api/staat.js`. Tests: `tools/test-sync.js`.
- De app werkt altijd vanuit `localStorage`. Synchroniseren loopt daar los bovenop.
- Elk apparaat onthoudt de laatst gedeelde versie (de basis). Het voegt drieweg samen: basis, dit apparaat, server. Hetzelfde veld op twee plekken: één wint en de botsing wordt genoteerd.
- Op de server staat per onderdeel van `S` één rij in `onderdeel`. Toetsen staan elk in een eigen rij (`beoord.toetsen.<id>`), zodat een rij onder 2 MB blijft.
- Tabel `meta` telt de versie. Een schrijfronde met een oude versie krijgt 409 en doet het opnieuw.
- Tabel `back_up`: de stand van vóór de eerste wijziging van elke dag, 30 dagen bewaard, plus `eerste` (na de eerste upload, blijft staan).
- De server controleert bij elk verzoek het Access-token en of het e-mailadres `EIGENAAR` is (`wrangler.toml`). Alleen lokaal (`localhost`) werkt `DEV_EMAIL`.
- Antwoordt de server 503 (geen database gekoppeld), dan blijft de app gewoon op het apparaat werken: "Op dit apparaat".
- `syncMag` laat het synchroniseren wachten tijdens de lesmodus, bij typen en bij een open paneel.

## 5. De workers

### `lesdag-rooster` (Zermelo)

- Code: `worker/rooster-proxy.js`. Adres: `config.js`, sleutel `roosterProxy`.
- Drie acties: `koppel` (koppelcode inwisselen voor een token), `afspraken` (eigen afspraken lezen), en een iCal-lezer als reserve.
- Praat met `https://csgpm.zportal.nl/api/v3`. Leerlingen worden bewust niet opgevraagd.
- Antwoordt alleen op `https://lesdag-muziek.pages.dev`, op `*.lesdag-muziek.pages.dev` en op `localhost`. Bewaart en logt niets. De token komt per verzoek uit de browser.
- Online zetten: `wrangler deploy worker/rooster-proxy.js --name lesdag-rooster --compatibility-date 2026-01-01`. Uploaden via de dashboard-API blokkeert Cloudflare.

### `lesdag-agenda` (Outlook)

- Code: `worker/agenda-feed.js`, config `worker/agenda-feed.toml`. Adres: `config.js`, sleutel `agendaFeed`.
- Doet één ding: op `/<64 tekens>.ics` het iCal-bestand teruggeven. Staat de sleutel niet in de database, dan 404.
- De app schrijft de agenda via `functions/api/agenda.js` (achter Access, eigen database `lesdag-agenda`). Wat meegaat staat in `agendaItems` in `app.js`. Voeg daar nooit eigen vrije tekst of leerlinggegevens aan toe.
- Online zetten: `wrangler deploy -c worker/agenda-feed.toml`.

Een worker staat los van Pages. Een push naar `main` verandert ze niet.

## 6. Service worker en cachenummer

`public/sw.js` laat de app offline werken.

- Cache `lesdag-vN` (nu `v49`). Bij de `install` komt de hele `SHELL`-lijst in de cache.
- Eerst netwerk, maar wacht hooguit 2 seconden (slecht wifi op school). Dan komt de cache voor. Het netwerk loopt door en ververst de cache voor de volgende keer.
- `/api/` komt nooit in de cache. Een doorsturing naar de Access-inlog ook niet.
- **Verhoog `CACHE` bij elke wijziging** in de `SHELL`-lijst, en bij elke wijziging in `app.js` of `app.css` die een oude versie gevaarlijk maakt. Bij twijfel: verhogen.
- Een nieuw bestand in `public/`? Zet het in de `SHELL`-lijst en in `index.html`. `tools/test-bestanden.js` vangt dat.
- Het cachenummer is ook het punt waar samenvoegen botst: zie `werkwijze-parallel.md`.

## 7. Testen

Eén opdracht: `node tools/test-alles.js` (`--snel` is ±20 s, `--zonder-browser` slaat de schermtest over). Zie `../tools/TESTEN.md` voor wat elk onderdeel vangt en hoe je Playwright eenmalig klaarzet buiten de repo.

Daarnaast:

- Lokaal kijken: `/lesdag-lokaal`, of `node tools/serve-lokaal.js public <poort>`. Lokaal is er geen service worker en geen Access.
- Synchroniseren lokaal: `npx wrangler pages dev public --port 8799 --binding DEV_EMAIL=nwn@csgpm.nl --d1 DB=<id uit wrangler.toml>`. Dat gebruikt een lokale kopie van de database, nooit de echte. Schema: `npx wrangler d1 migrations apply lesdag-sync --local --env production`.
- Testgegevens: alleen verzonnen groepscodes en namen.

## 8. Uitrollen

| Wat | Hoe | Wie mag |
|---|---|---|
| De app | Test, commit, push naar `main`. Binnen een minuut live. Skill `/lesdag-online` | Alleen na een ja van Frans |
| Een proefversie | Push naar een eigen branch: `https://<branch>.lesdag-muziek.pages.dev`. Geen database, dus geen synchroniseren | Frans beslist. Staat achter Access |
| Een worker | `wrangler deploy` zoals hierboven | Alleen na een ja van Frans |
| Een database-wijziging | Nieuw bestand in `migrations/`, dan `wrangler d1 migrations apply lesdag-sync --remote --env production` | Alleen na een ja van Frans, en eerst een export (zie `noodprocedures.md`) |

Pushen kan alleen met je eigen inlog (Credential Manager), dus via het terminalpaneel. Zie `CLAUDE.md`.

Na een push: controleer live. Zonder inlog geeft `curl` een 302 naar `pmkoor.cloudflareaccess.com`. Dat bewijst alleen de beveiliging. Met inlog haal je in de ingebouwde browser een gewijzigd bestand op met `fetch('app.js', {cache: 'no-store'})`.

## 9. Wat nergens in de code staat

- **Geheimen:** Zermelo-link, koppelcode en token staan nooit in code, commit of chat. De agendasleutel ook niet.
- **Geen Entra:** `m365.js`, `auth.html` en `config.js` (`clientId`) bestaan nog maar doen niets. Besluit Frans, 3 november.
- **Zermelo:** de koppeling gebruikt `/api/v3` met een persoonlijke koppelcode. Zermelo noemt sinds april 2026 alleen nog partnerkoppelingen. Zie `noodprocedures.md`, "Zermelo stopt".
- **Handelingen die Frans zelf doet:** pushen, een worker online zetten, synchroniseren aanzetten, Access wijzigen.

## 10. Waar staat wat in de code (index)

Overgenomen uit `CLAUDE.md` op 8 november 2026, zodat die korter kon.

- `public/app.js`: alles behalve de lesmodus. Agenda: `dagItems`, `agendaRaster`, `agPaneel`, `planKaart`; nieuw in de agenda en slepen: `nwOpen`, `nwNu`, `AGD`. Koor: `koorOp`, `koorKaart`. Jaar: `viewPartituur` (`#jaar`, `jaarBalk`, alleen lezend) en `viewKlasblad` (`#jaar/<groep>`). Beoordelen: `viewBeoordelen`, `bmExport` (route `#beoordelen/<model>/<groep>`). Nu-scherm: `viewNu`, `moment`, `partituur`, `voorstellen`; pauzes `pauzeDag` (`S.pauzes`, rustblok); regie `viewRegie` + bord via BroadcastChannel; opdrachtbalk `paletOpen`, `leesTaak`. Principes in `OPEN-PUNTEN.md`, sectie Proef Nu-scherm. Synchroniseren: `syncStart`, `syncKaart`, `syncDoc`, `syncZet` en `syncMag` (wacht tijdens lesmodus, typen of een open paneel). Service worker `public/sw.js`: verhoog `CACHE` bij elke wijziging in de vaste bestandenlijst; `/api/` blijft buiten de cache.
- `public/reclame.js` + `public/data/reclame.json`: reclame voor weekinfo, borden en prikbord (tekst, afbeelding, staande pptx, printposter A3 als pdf met één afbeelding, zonder bibliotheek). `S.reclame[id].naVerstuurd` onthoudt dat gegevens wijzigden nadat iets al weg was. Taken en tabblad Reclame staan in `app.js` (`reclameActs`, `reclameMomenten`, `reclameOpen`, `viewReclame`).
- `public/lesklok.js`: resttijd in elk scherm en het opruimsignaal, 4 minuten voor het einde van het rooster. `app.js` geeft via `LESKLOK.start` door wat de klok nodig heeft (`app.js` staat in een eigen functie, zijn namen zijn niet globaal). Tests: `tools/test-lesklok.js`.
- `public/lesmodus.js`: digibordpresentatie (fasen als objecten `{min, soort, kop, stappen, klaar, docent, beeld}`).
- `tools/`: lesinhoud (`inhoud-*.json` + `merge-inhoud.js`), presentaties (`lesdeck.js`, `maak-decks-*.js`), SharePoint-links (`sp.js`), koor (`koor-sync.js`), beoordeling (`beoordeling/`). Na `merge-inhoud.js --force` altijd `zet-decks-in-leergang.js` en `beoordeling/koppel-beoordeling.js` opnieuw draaien.

## 11. Laptop, beheer en opsplitsen

Uit `CLAUDE.md` gehaald op 9 november 2026, zodat die korter kon.

- Geen beheerdersrechten. Git: `%LOCALAPPDATA%\Programs\Git\cmd\git.exe`.
- In PowerShell is `R` een alias (Invoke-History): geen eigen functie zo noemen. `$c` en `$C` zijn dezelfde variabele.
- Word en Excel via COM: paden boven 255 tekens weigert Word; test in een korte map (`%LOCALAPPDATA%\Temp\bq`).
- Cloudflare Access beheren kan via de dashboard-API vanuit een ingelogde tab op dash.cloudflare.com (fetch met `X-Cross-Site-Security: dash`); Access-app "Lesdag" id `c47af1f4-8d7b-48ef-9910-d740ccc58ea0`.
- Dashboard-artifact "Leergang muziek": https://claude.ai/artifact/J27NLYLXHRFSCGvjDmGdj2 (bron `bron/`).
- Oude geschiedenis: `overdracht-tot-2026-10-29.md`; zoek per kop.
- **`app.js` opsplitsen** pas als Lesdag naar anderen gaat, `app.js` voorbij ongeveer 700 kB groeit, of sessies aantoonbaar fouten maken door gebrek aan overzicht. Plan: https://claude.ai/artifact/DPDaAR7UfvB6F4hWRJwNfc (variant B, vijf stukken). Daarbij mag de afspraak "namen niet globaal" vervallen; stap 1 en 2 op een avond zonder les de volgende ochtend, niet in een toetsweek, de rest verspreid over minstens drie lesdagen.
