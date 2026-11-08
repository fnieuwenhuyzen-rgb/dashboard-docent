# Lesdag

Lesdag is een webapp om je muzieklessen voor te bereiden en te geven. De app werkt met je weekrooster, je leergangen en de lessen per groep. Het menu bovenin heeft: Nu, Dag, Week, Jaar, Rooster, Sectie, Team, Reclame en Instellingen.

- **Nu**: het scherm voor het moment. Wat er nu speelt, wat daarna komt en wat nog open staat. Vanuit Nu start je de **Lesmodus**.
- **Dag**: je lessen van de dag in volgorde, met je agenda. Per lesuur zie je de groep, het lokaal, welke les het wordt, het lesdoel en het materiaal, en wat je er vorige keer over noteerde. Daarbij staat per lokaal wat er klaar moet staan. Hier staat ook **Ik ben er niet** (voor een dag of een hele periode) en **+ Nieuw** voor een taak, afspraak of eenmalig extra lesuur.
- **Lesmodus**: een volledig scherm voor het digibord. Je ziet de titel, het doel, de lesfasen met timer, de check, de rode draad en het materiaal. Na de les kies je "gegeven", "half af" of "niet gegeven" en zet je er een notitie bij. Daarna gaat de app door naar je volgende lesuur.
- **Week**: je week als agenda, met de lessen, afspraken en taken. Met "Ga naar" typ je een lesweek en spring je er direct heen.
- **Jaar**: alle klassen over het schooljaar, met toetsen, toetsweken en wat er nog te geven is. Tik op een weeknummer boven het overzicht om naar die week te gaan, of op een klas voor het klasblad (de voortgang van die groep). Parallelklassen delen een leergang, maar elke groep houdt zijn eigen plek bij.
- **Rooster**: je vaste weekrooster, één keer invullen of overnemen uit Zermelo.
- **Sectie**: vergaderingen, rapporten, toetsweken en je taken als sectievoorzitter.
- **Team**: de teamvergaderingen en data voor vwo 4-5-6.
- **Reclame**: weekinfo en borden voor concerten, excursies en andere activiteiten. Lesdag rekent uit wanneer je wat moet inleveren en zet de tekst en de bijlage klaar. De mail verstuurt Lesdag nooit zelf: hij opent een nieuw bericht in je mailprogramma en jij verstuurt het. Ontbreken er gegevens (aanvangstijd, plaats, prijs), dan vraagt Lesdag eerst of je toch door wilt gaan.
- **Instellingen**: synchroniseren, agenda in Outlook, Zermelo, pauzes, een kopie maken en meer.

De leergangen staan in `public/data/basis.json` en komen uit het dashboard Leergang muziek.

## 1. Online zetten met Cloudflare Pages

Lesdag staat op `https://lesdag-muziek.pages.dev`. Het Pages-project is gekoppeld aan de GitHub-repository: **elke push naar `main` staat binnen een minuut live**. Het adres zit achter Cloudflare Access, dus alleen een aangemeld account komt erin (een code per mail).

1. Wijzig iets in de map `public/` en commit het.
2. Push naar `main`. Cloudflare Pages zet de nieuwe versie vanzelf online.
3. Open het adres in Edge of Chrome. Kies **App installeren** in de adresbalk, dan staat Lesdag als app op je laptop.

Zonder iets aan te zetten wordt alles opgeslagen in de browser van dat apparaat. Met **Instellingen, Kopie downloaden** maak je een kopie.

## 2. Gegevens op meer apparaten: synchroniseren

Ga naar **Instellingen, Synchroniseren** en kies **Synchroniseren aanzetten**. Dat doe je op elk apparaat zelf. De eerste keer downloadt Lesdag eerst een kopie, voegt samen met wat er al op de server staat en controleert het resultaat. Een leeg apparaat neemt de server vanzelf over.

Wat meegaat: taken, afspraken, planning, klassenlijsten, scores en de Zermelo-koppeling. De gegevens staan op de Lesdag-server achter je login. Wat op het apparaat blijft: verjaardagen, absenten en logboeknotities. Er zijn back-ups van de laatste dertig dagen.

Er is geen koppeling met een schoolaccount via Microsoft (Entra ID) of OneDrive. De bestanden `m365.js`, `auth.html` en `config.js` (`clientId`) bestaan nog, maar die koppeling is niet in gebruik en hoef je niet in te richten.

## 3. Rooster uit Zermelo

Lesdag kan je rooster uit Zermelo halen, met roosterwijzigingen, een ander lokaal en vervallen lessen. De browser mag Zermelo niet zelf lezen. Daarom gaat het via een klein doorgeefprogramma (een Cloudflare Worker, `worker/rooster-proxy.js`). Die staat al online en het adres staat in `public/config.js` bij `roosterProxy`.

1. Maak in Zermelo een koppelcode aan (Koppelingen, Koppel externe applicatie).
2. Ga in Lesdag naar **Instellingen, Rooster uit Zermelo**, plak de code en kies **Koppelen**. Een code werkt één keer. Plak daar eventueel ook je Zermelo-agendalink: die gebruikt Lesdag als de koppeling niet werkt.
3. Ga naar **Rooster** en kies **Overnemen als vast rooster**.

Daarna haalt Lesdag het rooster op als je de app opent, en elk halfuur als je ernaar terugkeert. Vervallen lessen schuiven vanzelf door. Een ander lokaal krijgt een rood label.

De Zermelo-link en de koppelcode werken als een wachtwoord. Wie de koppeling heeft, kan alles wat jij in Zermelo mag. Lesdag bewaart ze in je browser en, als je synchroniseren aanzet, ook op de Lesdag-server achter je login. De Worker geeft ze door aan Zermelo en bewaart zelf niets. Is een link of koppeling ergens terechtgekomen waar die niet hoort, trek hem dan in Zermelo in en maak een nieuwe aan.

## 4. Agenda in Outlook

Onder **Instellingen, Agenda in Outlook** maak je een agendalink. Lesdag zet dan je lessen, toetsen, surveillance, koor en sectiepunten van twee weken terug tot zes weken vooruit in een eigen agenda in Outlook. Alleen lezen. Eigen taken, afspraken, notities en leerlinggegevens gaan niet mee. Een wijziging staat vaak pas na enkele uren in Outlook.

In Outlook op het web voeg je hem toe via Agenda, Agenda toevoegen, Abonneren via internet, en plak je de link. Behandel de link als een wachtwoord.

## 5. Eerste keer gebruiken

1. **Rooster**: neem het rooster over uit Zermelo (stap 3), of vul per lesuur de dag, de tijden, de groep (bijvoorbeeld h3a) en het lokaal in.
2. **Dag**: staan je groepen nog op les 1? Kies **Zet ze op de planning**. Dan gelden alle lessen vóór deze lesweek als gegeven.
3. **Jaar**: tik op een klas voor het klasblad en controleer of de volgende les klopt. Met "gegeven" en "niet gegeven" schuif je een les heen en terug.

## Ik ben er niet

Op **Dag** kies je **Ik ben er niet** en geef je een begin- en einddatum, ook voor een lange periode (tot een jaar). Al je lessen in die periode vervallen en schuiven door. Direct na het invullen kun je het in een keer ongedaan maken. Later staat op elke afwezige dag **Toch aanwezig op deze dag** en **Hele periode ongedaan**.

## Wat er waar staat

| Bestand | Inhoud |
|---|---|
| `public/` | de app zelf (`index.html`, `app.css`, `app.js` en meer); Cloudflare Pages publiceert deze map |
| `public/sync.js`, `functions/api/staat.js` | synchroniseren |
| `public/m365.js`, `public/auth.html`, `public/config.js` | de Microsoft-koppeling (niet in gebruik) en de adressen van de Workers |
| `worker/rooster-proxy.js` | de Cloudflare Worker voor Zermelo (apart online zetten, niet in Pages) |
| `worker/agenda-feed.js` | de Cloudflare Worker voor de agenda in Outlook (apart online zetten) |
| `public/data/basis.json` | de leergangen, de kalender en de sectiedata |
| `public/data/beoordeling.json` | de beoordelingsmodellen |
| `public/sw.js`, `public/manifest.webmanifest`, `public/icons/` | installeren en offline gebruiken |
| `public/vendor/` | gebruikte bibliotheken (MSAL, pptxgenjs, qrcode) en lettertypen |

Je gegevens (rooster, voortgang, notities, je eigen aanpassingen aan lessen) staan apart van de leergangen. Een nieuwe versie van `data/basis.json` overschrijft je eigen werk dus niet.
