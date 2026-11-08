# Noodprocedures Lesdag

Voor als iets stuk gaat. Stand: 8 november 2026. Techniek: `techniek.md`.

## Hoe je dit leest

- Elke stap heeft de echte opdracht. Pas alleen `<…>` aan.
- Bij elke procedure staat **Geoefend**: wat op 8 november op een lokale kopie is uitgeprobeerd, en wat niet. "Niet geoefend" betekent: de opdracht is uit de code en de hulptekst van wrangler 4.158.0 gehaald, maar nooit uitgevoerd. Er is niets tegen de live-omgeving gedaan.
- `git` is hier `%LOCALAPPDATA%\Programs\Git\cmd\git.exe`. `npx wrangler` draait in de projectmap. Node staat op `C:\Users\nwn\AppData\Local\Programs\node\node.exe`.
- Pushen kan alleen in het terminalpaneel, met je eigen inlog.

## Eerst, bij elk probleem

1. **Wis nooit sitegegevens of browsergegevens** van `lesdag-muziek.pages.dev`. Je eigen gegevens staan daar, en soms alleen daar.
2. Download een kopie: Instellingen, Gegevens, **Kopie downloaden**. Bewaar die. Er staan leerlingnamen in.
3. Kijk wat er stuk is:

| Wat zie je | Ga naar |
|---|---|
| De app doet iets geks na een push | 1 en 2 |
| Lessen, sectietaken of formulieren zijn weg of oud | 3 |
| Synchroniseren geeft rare resultaten, dubbele of teruggekomen taken | 4 en 5 |
| De geheime agendalink is gelekt of kwijt | 6 |
| Een worker doet niets meer of iets verkeerds | 7 |
| Het rooster laadt niet meer, "Zermelo weigert…" | 8 |

---

## 1. De live-app terugdraaien

Gebruik dit als de nieuwste versie fout is en je snel een werkende wilt.

**Snelste manier, zonder git (Cloudflare):**

1. Open dash.cloudflare.com, Workers & Pages, project `lesdag-muziek`, tab Deployments.
2. Kies een oudere deployment die goed was. Menu (drie puntjes), **Rollback to this deployment**.
3. Binnen een minuut staat die versie weer live.

Dit verandert niets aan `main` in git. De volgende push zet de foute versie weer neer, tenzij je stap 2 ook doet.
De eigen gegevens van Frans blijven ongemoeid: de code verandert, de staat in de browser niet. Heeft de foute versie een nieuw veld in `S` gezet, dan negeert de oude versie dat gewoon.

De lijst met deployments kan ook in de terminal (alleen lezen): `npx wrangler pages deployment list --project-name lesdag-muziek`.

**Geoefend:** nee. De knop in het dashboard en de lijst zijn niet geprobeerd, omdat dat live is. Wel geoefend is de git-manier (stap 2).

## 2. Een kapotte push herstellen

Een push naar `main` staat binnen een minuut live. Herstel gaat met een nieuwe commit die de fout ongedaan maakt. **Nooit `git push --force` op `main`.**

1. Zoek de foute commit: `git log --oneline -10`.
2. Maak hem ongedaan:
   - Gewone commit: `git revert --no-edit <hash>`
   - Samenvoeging (de commit heet "Samenvoegen: …"): `git revert --no-edit -m 1 <hash>`
   - Meerdere commits achter elkaar: `git revert --no-edit <oudste>^..<nieuwste>`
3. Controleer vóór het pushen: `node tools/test-alles.js --snel`. Gaat het om `basis.json`, ook `node tools/controleer-gegevens.js`.
4. Push in het terminalpaneel: `git push origin main`.
5. Controleer live (zie `techniek.md`, uitrollen).
6. Het cachenummer hoef je niet te verhogen. De service worker haalt eerst het netwerk, dus de herstelde versie komt na één keer herladen.

Is de fout alleen een gevolg van een gegevensbestand: ga naar 3.

**Geoefend:** ja, op een kopie met een lokale "origin" (`git init --bare`). Een gewone commit teruggedraaid en gepusht: goed. Een samenvoeging met `-m 1` teruggedraaid: het bestand is weer als vóór de samenvoeging. De commit voor meerdere commits (`oudste^..nieuwste`) is **niet** geprobeerd.

## 3. `basis.json` terughalen na een terugval

Dit gebeurde op 2 november: `public/data/basis.json` en `bron/leergang-data.json` stonden ineens op een oudere stand. 37 sectietaken weg, een lied in de verkeerde toonsoort. Oorzaak waarschijnlijk OneDrive. De code staat sinds 5 november buiten OneDrive, maar let nog steeds op.

**Zo zie je het:** `git status` laat een van deze bestanden als gewijzigd zien terwijl je ze niet aanraakte. Of `node tools/controleer-gegevens.js` meldt **minder** sectietaken, leergangen, lessen, presentaties of formulieren dan in `HEAD`.

1. **Niet committen.** `git add -A` neemt ze mee.
2. Kijk wat er verschilt: `git diff --stat -- public/data/basis.json bron/leergang-data.json`
3. Zoek de laatste goede versie: `git log --oneline -- public/data/basis.json`
4. Zet terug: `git checkout <hash> -- public/data/basis.json bron/leergang-data.json`
5. Controleer: `node tools/controleer-gegevens.js`. Het moet "Gegevens in orde" zeggen.
6. Alleen als de herstelde versie echt als nieuwe stand moet gelden: committen. Anders: `git status` is nu weer schoon en is er niets te committen.

Is ook `HEAD` slecht (er is al een slechte versie ingecheckt)? Gebruik `<hash>` van de laatste goede commit, check met stap 5, en commit dan het herstel met een duidelijk bericht.

Is de slechte versie al live? Eerst 1 of 2, dan dit.

Hou `basis.json` nooit alleen in OneDrive. GitHub is de back-up: push regelmatig (Frans beslist wanneer).

**Geoefend:** ja, op de kopie. `basis.json` kapot gemaakt (sectie weg), de controle faalde ("1 fout(en). Niet committen"), `git checkout <hash>~1 -- public/data/basis.json` zette het terug, de controle zei "Gegevens in orde". `bron/leergang-data.json` is hetzelfde commando.

## 4. Synchroniseren uitzetten

Uitzetten haalt de gegevens niet weg. Alles blijft in de browser op elk apparaat.

**Per apparaat** (vlag weghalen):

1. Open de app op het apparaat. Zorg dat er een kopie is (zie "Eerst").
2. Open de console (F12) en plak:
   ```js
   localStorage.removeItem('lesdag-sync-aan');
   indexedDB.deleteDatabase('lesdag-sync');
   ```
3. Herlaad. Het apparaat synchroniseert niet meer. Een apparaat met gegevens wacht daarna op de knop "Synchroniseren aanzetten"; alleen een helemaal **leeg** apparaat neemt de server weer vanzelf over.

**De hele server uitzetten** (de app valt overal terug op "Op dit apparaat"):

1. Haal in `wrangler.toml` het blok `[[env.production.d1_databases]]` met `binding = "DB"` weg.
2. Commit en push. Zonder die koppeling antwoordt `/api/staat` met 503 en de app blijft zonder foutmelding op het apparaat werken (`public/sync.js`, regel 86).
3. De gegevens op de server blijven staan. Wil je ze ook wissen, zie hieronder.

**Gegevens op de server wissen** (denk aan de privacyfunctionaris; wist ook de back-ups):

1. Eerst een export (zie 5, stap 3).
2. `npx wrangler d1 execute lesdag-sync --remote --env production --command "DELETE FROM onderdeel; DELETE FROM back_up"`
3. De back-up `eerste` zit in `back_up` en wordt anders nooit opgeruimd. Hierin staan alle namen van de eerste upload.

**Geoefend:**

- De vlag weghalen: ja, in Edge op de lokale server. Vlag weg, `lesdag-staat` met de verzonnen taak bleef staan.
- De server loskoppelen en het 503-gedrag: **nee**. Een lokale `wrangler pages dev` zonder database bleef in deze sessie hangen. De code is gelezen, niet gedraaid.
- Het wissen van de tabellen: ja, op een lokale kopie van de database (`--local`). Het live-commando (`--remote`) niet.

## 5. Een back-up terugzetten

Drie niveaus, van klein naar groot.

**a. Een dagstand terugzetten in de app** (staat op de server, 30 dagen, plus `eerste`):

1. Instellingen, kaart Synchroniseren, **Back-ups**.
2. Kies de dag. De dag is de stand van vóór de eerste wijziging van die dag.
3. Bevestig. **Dit vervangt de staat op al je apparaten.** De app toont daarna een melding met een knop om dit terug te draaien. Doe dat meteen als het verkeerd was.
4. Een lege of beschadigde back-up wordt geweigerd.

**b. Een kopie van een apparaat terugzetten:** Instellingen, kaart Gegevens, **Kopie terugzetten**, kies het `.json`-bestand uit Downloads. Er is ook een reservekopie van vóór de laatste terugzetting (`lesdag-staat-voor-kopie`).

**c. De hele database terugzetten** (als `lesdag-sync` zelf stuk is):

1. Regelmatig of vóór een database-wijziging: `npx wrangler d1 export lesdag-sync --remote --env production --output <map buiten OneDrive>\lesdag-sync-<datum>.sql`. Dat bestand bevat alle namen en scores. Bewaar het buiten OneDrive en gooi het weg als het niet meer nodig is.
2. Cloudflare bewaart zelf ook 30 dagen (Time Travel). Stand opvragen: `npx wrangler d1 time-travel info lesdag-sync --timestamp "<2026-11-08T10:00:00Z>"`. Terugzetten: `npx wrangler d1 time-travel restore lesdag-sync --timestamp "<…>"`.
3. Terugzetten uit een exportbestand kan alleen in een lege database. Het bestand maakt de tabellen zelf aan, ook `d1_migrations`. Dus eerst leeg maken: `npx wrangler d1 execute lesdag-sync --remote --env production --command "DROP TABLE onderdeel; DROP TABLE meta; DROP TABLE back_up; DROP TABLE d1_migrations"` en dan `npx wrangler d1 execute lesdag-sync --remote --env production --file <bestand>.sql`.
4. Daarna op elk apparaat **Nu synchroniseren**.

**Geoefend:**

- a: de API-kant ja (lokaal twee schrijfrondes, `?backups=1` gaf `eerste` en de dag, `?backup=eerste` gaf de eerste stand terug). De knop in het scherm niet.
- b: nee.
- c: export, een import in een niet-lege database (faalt zoals beschreven met `UNIQUE constraint failed: d1_migrations.id`), leegmaken en importeren (versie en rijen kwamen terug): ja, allemaal lokaal met `--local`. Time Travel en alles met `--remote`: nee.

## 6. De geheime agendalink vervangen

Doe dit als de link ergens terecht is gekomen waar hij niet hoort. Wie de link heeft, ziet je lessen, toetsen en surveillance (geen taken of leerlinggegevens).

1. Lesdag, Instellingen, kaart **Agenda in Outlook**, **Nieuwe link**. Bevestig. De oude link werkt direct niet meer.
2. Klik **Link kopiëren**.
3. In Outlook op het web: verwijder de oude agenda. Agenda toevoegen, Abonneren via internet, plak de nieuwe link.
4. Wil je helemaal stoppen: **Stoppen**. Dat wist ook de inhoud. Verwijder de agenda ook zelf uit Outlook.

Via de API, voor als de knop niet werkt (alleen achter Access, dus in de ingelogde browser): `fetch('/api/agenda', {method: 'POST'})`. Het antwoord is de nieuwe sleutel; de link is `<agendaFeed uit config.js>/<sleutel>.ics`.

**Geoefend:** de kant van de server ja. Lokaal (`wrangler pages dev` met een lokale kopie van de database en `wrangler dev -c worker/agenda-feed.toml`): na `POST /api/agenda` gaf de oude link 200. Na een tweede `POST` gaf de oude link **404** en de nieuwe **200**. `DELETE` zet de feed uit. De knoppen en Outlook zelf niet.

## 7. Een worker terugzetten

Er zijn twee workers: `lesdag-rooster` (code `worker/rooster-proxy.js`) en `lesdag-agenda` (`worker/agenda-feed.js`, config `worker/agenda-feed.toml`).

**Met Cloudflare (snel):**

1. Welke versies zijn er: `npx wrangler versions list --name lesdag-rooster` (of `lesdag-agenda`).
2. Terug naar een goede: `npx wrangler rollback <version-id> --name lesdag-rooster -m "reden"`.

**Met git (als er geen goede versie meer staat):**

1. Zoek de goede commit: `git log --oneline -- worker/rooster-proxy.js`
2. Zet het bestand terug: `git checkout <hash> -- worker/rooster-proxy.js`
3. Online zetten:
   - rooster: `npx wrangler deploy worker/rooster-proxy.js --name lesdag-rooster --compatibility-date 2026-01-01`
   - agenda: `npx wrangler deploy -c worker/agenda-feed.toml`
4. Test: de agendafeed-test lokaal `node tools/test-agendafeed.js`. De rooster-worker is te testen in Instellingen, Zermelo, **Nu ophalen**.

Een worker heeft geen geheimen of tokens in zijn code. Een goede deploy kan dus nooit lekken. Een deploy via de dashboard-API blokkeert Cloudflare; gebruik wrangler.

Onthoud: een push naar `main` verandert de workers niet. Alleen `wrangler deploy` doet dat.

**Geoefend:**

- `wrangler dev -c worker/agenda-feed.toml` lokaal: ja (zie 6).
- `versions list`, `rollback`, `deployments list`: alleen de hulptekst gelezen (wrangler 4.158.0). Niet uitgevoerd.
- `git checkout <hash> -- <bestand>` voor een bestand: ja (zelfde commando als in 3).
- `wrangler deploy`: nee.

## 8. Wat te doen als Zermelo stopt

Lesdag gebruikt `https://csgpm.zportal.nl/api/v3` met een persoonlijke koppelcode. Zermelo noemt sinds 13 april 2026 alleen nog partnerkoppelingen (`/api`, aan te maken door een beheerder, met verplicht `schoolInSchoolYear`). Voor v3 is geen einddatum genoemd. Op 2 november antwoordde v3 nog.

**Hoe merk je het:** in Instellingen, Rooster uit Zermelo, staat "Laatst opgehaald" op een oude tijd. Of **Nu ophalen** geeft "Zermelo weigert…" of een 401, 403 of 404. Het rooster in Dag en Week blijft op de laatste goede stand staan.

Ga in deze volgorde. Stop zodra het weer werkt.

1. **Alleen de koppeling verlopen of ingetrokken?** Maak in Zermelo een nieuwe koppelcode (Koppelingen, Koppel externe applicatie). Plak hem in Instellingen bij Koppelcode en kies **Koppelen**. Een code werkt één keer. Plak de code zelf nooit in chat of commit.
2. **Werkt `/api/v3` niet meer, maar is de agendalink er nog?** Plak je Zermelo-agendalink in Instellingen bij **Zermelo-link**. Dat is de ingebouwde reserve: Lesdag leest dan het rooster uit de iCal-link.
3. **Werkt de agendalink ook niet?** Dan werkt Lesdag verder op het **vaste rooster**.
   - Het vaste rooster staat in Lesdag op **Rooster** (`S.rooster`). Dat blijft staan, ook als Zermelo stopt. Pas het met de hand aan.
   - Is het leeg of oud: vul het in (dag, tijden, groep, lokaal). Dat kost een kwartier.
   - Roosterwijzigingen, vervallen lessen en surveillances komen dan niet meer vanzelf. Frans zet ze zelf in met **+ Nieuw** en **Ik ben er niet**.
4. **Een nieuwe koppeling nodig?** Vraag aan ICT of Zermelo-beheer een partnerkoppeling. Dat betekent dat `worker/rooster-proxy.js` en de leescode in `app.js` (`zOphalen`, `zMuziek`, `zGroep`, `zDienst`) opnieuw geschreven moeten worden. Zet dat als punt in `OPEN-PUNTEN.md`.

Voorzorg: tik op Rooster op **Neem over in je vaste week** zodra Lesdag dat voorstelt (Zermelo is dan minstens twee weken anders). Zo klopt het vaste rooster en staat stap 3 klaar.

**Geoefend:** nee. Er is niets om te proberen zonder Zermelo te raken. De namen van de knoppen en velden zijn uit `app.js` gelezen.
