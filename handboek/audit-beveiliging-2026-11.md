# Audit beveiliging en privacy Lesdag (8-11-2026)

Onderzocht: de code op `main` (commit `95f5f40`) en de hele git-geschiedenis, lokaal. Niets geprobeerd tegen de live-site, de workers of de databases. Regelnummers gelden voor die commit. Echte namen en sleutels staan niet in dit rapport.

## Conclusie

De technische afscherming is goed. De API laat zonder geldig Access-token niemand door, en in de geschiedenis staan geen tokens of leerlingnamen. De belangrijkste punten zijn organisatorisch of gaan over bewaren. Eén belofte klopte niet: in de agendafeed kon vrije tekst komen. Dat is deels opgelost op de branch `audit-beveiliging`.

| Nr | Ernst | Bevinding | Stand |
|---|---|---|---|
| 1 | Hoog | Leerlinggegevens op eigen Cloudflare-account, niet afgestemd met de school | Frans beslist |
| 2 | Midden | Vrije tekst in de agendafeed | 1 van 3 routes opgelost, rest: Frans beslist |
| 3 | Midden | Geen CSP, terwijl de app alles als HTML opbouwt | Koppen op de branch, CSP alleen meldend |
| 4 | Midden | Geen slot op de gegevens op het apparaat | Frans beslist |
| 5 | Midden | Geen bewaartermijn voor namen en cijfers | Frans beslist |
| 6 | Laag | Zermelo-sleutel staat op veel plekken, oude link gaat mee in de kopie | Open |
| 7 | Laag | Andere website kon de agendalink vervangen | Opgelost op de branch |
| 8 | Laag | Rooster-worker is voor iedereen bruikbaar als doorgeefluik | Open, geen actie nodig |
| 9 | Laag | Id's en getallen uit een kopie gaan onbewerkt de HTML in | Open |
| 10 | Laag | Google Fonts ziet elk nieuw apparaat | Open |
| 11 | Info | Kleine punten | Eén opgelost |

## Bevindingen

### 1. Hoog: leerlinggegevens op een eigen Cloudflare-account

- **Gevolg:** namen, scores en opmerkingen over leerlingen staan op een persoonlijk account, zodra synchroniseren aan staat. De school is daarvoor verantwoordelijk en weet er volgens de repo nog niet van. Er is geen verwerkersovereenkomst bekend.
- **Bewijs:** `public/app.js:2477` (`syncDoc`: de hele staat), `public/app.js:2508`, `functions/api/staat.js:35`. `handboek/concept-bericht-privacyfunctionaris.md:3` zegt "Niet verstuurd". `OPEN-PUNTEN.md:77` staat nog onder "Wacht op Frans". `CLAUDE.md:18` noemt wel een besluit van 3-11.
- **Oplossing:** het concept versturen en tweestapsverificatie op het account aanzetten. Tot het antwoord er is: synchroniseren uit, of de leerlinggegevens van de synchronisatie uitsluiten.
- **Niet te zien in de code:** of synchroniseren nu aan staat, wie er lid is van het account, of de database echt in de EU staat.

### 2. Midden: vrije tekst in de agendafeed

`agendaItems` stuurt geen notities, eigen taken, eigen afspraken, reclame of leerlinggegevens uit `S.beoord` mee. Maar de tekst in Instellingen belooft meer dan de code deed. Ik heb de echte functie gedraaid met verzonnen items. Drie routes brengen vrije tekst in de feed.

| Route | Bewijs | Stand |
|---|---|---|
| Zelf getypte sectiepunten | `app.js:2392`, `3041`, `2543` | Opgelost: gaan niet meer mee |
| Zermelo-afspraak zonder vak en groep: de titel is dan de opmerking van de roostermaker | `app.js:201`, `250`, `776`, `2540` | Open |
| Zelf aangepaste lestitel | `app.js:2627`, `772`, `2539` | Open |

- **Gevolg:** als in zo'n tekst een naam staat ("gesprek ouders van ..."), komt die in Outlook terecht en bij iedereen met de link. De link gaat ook langs de servers van Microsoft.
- **Oplossing open routes:** laat `zAnders` meegeven of een titel uit de opmerking komt en zet in `agendaItems` dan een vaste titel "Afspraak". Lestitel: alleen de titel uit de leergang gebruiken.
- **Ook weten:** titels uit `basis.json` gaan wel mee. Drie sectietitels noemen derden bij naam (geen leerlingen).

### 3. Midden: geen Content-Security-Policy

- **Gevolg:** elk scherm wordt als HTML-tekst opgebouwd. Een enkele vergeten `esc()` geeft een aanvaller de klassenlijsten, de scores en de Zermelo-sleutel. Er is nu geen tweede verdediging. `public/_headers` bevatte alleen een regel voor `/beeld/*`.
- **XSS-controle:** alle 1.740 invoegingen in HTML in `app.js` nagelopen, plus `lesmodus.js` en `lesklok.js`. Ik vond geen echte lek. Geplakte klassenlijsten (`app.js:3126`, `3194`), bestandsnamen uit de inleverbak (`3247`, `3257`), Forms-labels (`3275`), Zermelo-teksten (`285`) en eigen invoer gaan door `esc()`. Links uit eigen invoer moeten met http of https beginnen (`2672`, `3032`, `567`, `2745`). `esc` slaat de enkele aanhalingstekens over, maar nergens staat een waarde tussen enkele aanhalingstekens in een attribuut.
- **Op de branch:** `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` en een CSP in `Report-Only`. Die meldt alleen in de console en kan dus niets breken.
- **Vervolg:** na een week gebruik (ook PowerPoint maken, want `vendor/pptxgen.bundle.js` gebruikt `Function()`) de console nakijken en `-Report-Only` weghalen. De app heeft geen inline scripts of `onclick`, dus `script-src 'self'` kan waarschijnlijk.

### 4. Midden: geen slot op het apparaat

- **Gevolg:** Access beschermt de server, niet het apparaat. Namen, cijfers en de Zermelo-sleutel staan onversleuteld in de browser. Zonder netwerk opent de app uit de cache zonder login. Wie een ontgrendelde laptop heeft, kan alles lezen. In lokaal 009 staat de laptop altijd klaar.
- **Bewijs:** `app.js:92`, `214`, `sw.js:22`.

| Plek | Inhoud |
|---|---|
| localStorage `lesdag-staat` | Alles uit `S`: klassenlijsten, scores, taken, eventueel oude Zermelo-link |
| localStorage `lesdag-staat-voor-kopie` | Volledige kopie van `S` van vóór een teruggezette kopie (`app.js:554`) |
| localStorage `lesdag-apparaat` | Absenten, logboeknotities, jarige collega's (blijft op het apparaat) |
| localStorage `lesdag-zermelo-api` | Zermelo-sleutel |
| localStorage `lesdag-zermelo` | Opgehaald rooster, met opmerkingen uit Zermelo |
| IndexedDB `lesdag-sync` | `basis` en `voor-sync`: volledige staat met Zermelo-sleutel (`sync.js:116`, `142`) |
| IndexedDB `lesdag-beoordeling` | Logboek van elke score en opmerking, gekozen map |
| Bestanden | Kopie, reserve per groep, scoreblad, in de gekozen map of Downloads (`app.js:2972`, `3161`) |

- **Oplossing:** Windows altijd vergrendelen als je wegloopt en controleren of de schijf versleuteld is. Eventueel een knop "Dit apparaat wissen". De reservemap niet op een gedeelde plek kiezen.

### 5. Midden: geen bewaartermijn

- **Gevolg:** namen en cijfers van oud-leerlingen blijven onbeperkt staan.
- **Bewijs:**
  - Back-up `eerste` wordt nooit opgeruimd (`staat.js:47`). Daarin ook de Zermelo-sleutel van dat moment.
  - Verwijderde leerlingen blijven in `beoord.weg` en gaan mee naar de server (`app.js:3432`).
  - Het logboek in IndexedDB wordt nergens gewist: er is geen `delete` of `clear` op die opslag.
  - Klassenlijsten en toetsen worden nooit automatisch opgeruimd: geen `delete S.beoord` in de code.
- **Oplossing:** de termijn van de school vragen (staat al in het concept, vraag 4). Dan een jaarafsluiting bouwen die lijsten, `weg`, toetsen en logboek van vorige jaren wist. Back-up `eerste` eenmalig verwijderen.

### 6. Laag: Zermelo-sleutel op veel plekken

- **Gevolg:** de nieuwe sleutel zit terecht niet in de kopie. De oude link `S.zermeloToken` zit wel in `S`, dus wel in de kopie (`app.js:2972`) en de synchronisatie (`2477`). Koppeling verwijderen (`2970`) wist alleen in Lesdag. In de back-ups blijft de sleutel staan. De sleutel geeft mogelijk meer dan het rooster: wat hij in Zermelo mag, is niet uit de code te zien.
- **Oplossing:** `zermeloToken` uit de kopie laten. Bij het stoppen van de koppeling de sleutel ook in Zermelo intrekken. Na gebruik van het oude iCal-pad de link verwijderen.

### 7. Laag: andere website kon de agendalink vervangen (opgelost op de branch)

- **Gevolg:** een POST naar `/api/agenda` vanaf een vreemde site kon, als de Access-cookie meekomt, een nieuwe link maken. Outlook krijgt dan niets meer. Er lekt niets. Of de cookie meekomt hangt af van een Access-instelling die niet in de code staat.
- **Bewijs:** `functions/api/agenda.js:26`.
- **Opgelost:** wijzigingen met een vreemde `Origin` krijgen 403. Lokaal getest met een nep-database.

### 8. Laag: rooster-worker is een open doorgeefluik

- **Gevolg:** de controle op `Origin` is geen beveiliging, want een script buiten de browser vult dat zelf in. Iemand met het adres kan via de worker koppelcodes proberen bij Zermelo. Gegevens van Frans krijgt die niet: de worker bewaart niets en heeft zonder meegestuurde sleutel geen toegang.
- **Bewijs:** `worker/rooster-proxy.js:16`, `33`.
- **Oplossing:** geen actie nodig. Bij misbruik een limiet in Cloudflare instellen. De lijst toegestane velden (zonder `students`) geldt alleen voor de koppeling, niet voor de oude iCal-route (`:63`).

### 9. Laag: id's en getallen uit een kopie onbewerkt in de HTML

- **Gevolg:** `staatFouten` controleert de vorm, niet de inhoud. Velden als `x.id` (`app.js:3217`), `u.id` (`1330`), `l.type` (`564`) en `x.e` (`986`) gaan zonder `esc` de HTML in. Alleen een vervalste kopie of back-up kan daar misbruik van maken. Normaal komen zulke waarden van Lesdag zelf of uit Zermelo.
- **Oplossing:** ook deze velden door `esc()` halen. De CSP uit bevinding 3 vangt dit grotendeels op.

### 10. Laag: Google Fonts

- **Gevolg:** `index.html:14` haalt het lettertype bij Google, die daarmee het IP-adres ziet tot het in de cache staat (`sw.js:25`).
- **Oplossing:** het lettertype zelf aanbieden vanuit `vendor/fonts`.

### 11. Info

- `.gitignore` sloot `.dev.vars` en `.env` niet uit. Opgelost op de branch.
- Microsoft-code wordt nog geladen maar niet gebruikt (`config.js:5`, `index.html:35`, `auth.html`). Weghalen maakt de app kleiner.
- `/beeld/*` heeft `Access-Control-Allow-Origin: *`. Achter Access heeft dat weinig effect. Controleer of er geen uitzondering in Access voor bestaat.
- `whoAmI` kijkt niet naar `nbf`. Geen gevolg, Access geeft geen tokens voor de toekomst uit.

## Wat goed is

- **API achter Access:** ontbreekt de header, dan 401. Handtekening, doelgroep, uitgever, vervaldatum en adres worden gecontroleerd, met vast RS256 (`staat.js:63`). Lokaal getest: geen header, vals token en `DEV_EMAIL` op de echte host geven 401.
- **Ontbrekende instellingen:** zonder database 503, zonder `ACCESS_AUD` of `EIGENAAR` komt niemand binnen.
- **SQL:** overal met parameters.
- **Agenda-worker:** alleen GET en HEAD, link van 256 bits, eigen database zonder leerlinggegevens, geen indexering (`agenda-feed.js`).
- **Rooster-worker:** velden gecontroleerd, geen logregels, sleutel alleen in de POST-inhoud.
- **Service worker:** `/api/` en doorverwijzingen naar de login komen niet in de cache.

## Git-geschiedenis en `public/data`

Alle 951 bestandsversies uit alle takken gescand (commit-berichten ook). Gevonden waarden heb ik niet afgedrukt.

- **Tokens en geheimen:** niets. Gezocht op Zermelo-links en -tokens, Bearer- en JWT-tokens, GitHub-, Anthropic-, OpenAI-, AWS- en Slack-sleutels, privésleutels, Cloudflare-tokens, Access-cookies, agendalinks, SharePoint-gastlinks. Het enige lange hex-getal is de `ACCESS_AUD` in `wrangler.toml`. Die is niet geheim.
- **Leerlingnamen:** niets. Geen klassenlijsten of opeenvolgende naamregels, geen leerlingobjecten, geen kopie van de staat. 42 kandidaten naast woorden als leerling, absent of herkansing zijn alle muziektitels, plaatsen of projecttermen. Het veld `leerlingen` in `basis.json` en de oude `notities.json` (commit `5044972`) bevat lesactiviteiten.
- **E-mail:** alleen schooladressen van `csgpm.nl`, in documentatie, `wrangler.toml` en `reclame.json`.
- **Grens:** namen zoeken kan alleen op patroon. Een losse voornaam in lopende tekst vindt zo'n scan niet. De 11 afbeeldingen zijn niet bekeken.

## Niet gecontroleerd

Dit staat niet in de code en vraagt een blik in het dashboard: de Access-instellingen (beleid, uitzonderingen, cookie), de leden van het Cloudflare-account, de locatie van de database, of Workers Logs aan staan (de agendalink staat in de URL), en de inhoud van de databases. De CSP is niet in een browser getest. De fix in de feed is getest door de echte functie met verzonnen items te draaien, niet in de hele app.

## Beslissingen voor Frans

1. Het bericht aan de privacyfunctionaris versturen, en synchroniseren tot het antwoord uit laten (of leerlinggegevens uitsluiten)?
2. Agendafeed: Zermelo-afspraken zonder vak of groep met een vaste titel, en alleen lestitels uit de leergang?
3. Welke bewaartermijn, en moet back-up `eerste` weg?
4. De vier commits op `audit-beveiliging` overnemen op `main`? Per commit is een ja nodig.
5. Na een week de CSP afdwingend maken?
