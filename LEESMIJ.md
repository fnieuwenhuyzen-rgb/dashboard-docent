# Lesdag

Lesdag is een webapp om je muzieklessen voor te bereiden en te geven. De app werkt met je weekrooster, je leergangen en de lessen per groep.

- **Vandaag**: je lessen van de dag in volgorde. Per lesuur zie je de groep, het lokaal, welke les het wordt, het lesdoel en het materiaal, en wat je er vorige keer over noteerde. Daarbij staat per lokaal wat er klaar moet staan. Na 16.00 uur laat de app alvast de volgende lesdag zien.
- **Lesmodus**: een volledig scherm voor het digibord. Je ziet de titel, het doel, de lesfasen met timer, de check, de rode draad en het materiaal. Na de les kies je "gegeven", "half af" of "niet gegeven" en zet je er een notitie bij. Daarna gaat de app door naar je volgende lesuur.
- **Week**: welke les je deze week in welk lesuur geeft.
- **Groepen**: de voortgang per groep. Parallelklassen delen een leergang, maar elke groep houdt zijn eigen plek bij.
- **Rooster**: je vaste weekrooster, één keer invullen.
- **Sectie**: vergaderingen, rapporten, toetsweken en je taken als sectievoorzitter.

De leergangen staan in `public/data/basis.json` en komen uit het dashboard Leergang muziek.

## 1. Online zetten met Cloudflare Pages (zonder Microsoft-koppeling)

1. Log in op dash.cloudflare.com en ga naar **Workers & Pages**, dan **Create**, dan **Pages**, dan **Upload assets**.
2. Geef het project een naam, bijvoorbeeld `lesdag-muziek`. Je adres wordt dan `https://lesdag-muziek.pages.dev`.
3. Sleep de hele map `lesdag` (of het zipbestand) erin en kies **Deploy**.
4. Open het adres in Edge of Chrome. Kies **App installeren** in de adresbalk, dan staat Lesdag als app op je laptop.

De app werkt nu al: alles wordt opgeslagen in de browser van dat apparaat. Met **Instellingen, Kopie downloaden** kun je een kopie maken.

Een nieuwe versie zet je online door in hetzelfde Pages-project opnieuw te uploaden (**Create deployment**).

## 2. Microsoft 365 koppelen (aanvraag bij de ICT)

Met de koppeling log je in met je schoolaccount. Dan:

- staan je gegevens in je eigen OneDrive (map Apps), zodat je op elk apparaat dezelfde stand hebt;
- zoek je bij een les direct naar een presentatie in OneDrive of SharePoint en koppel je die;
- toont de lesmodus een PowerPoint uit SharePoint in de app zelf ("toon hier").

Daarvoor moet de ICT de app registreren in Microsoft Entra ID. Je kunt deze tekst doorsturen:

> Ik wil een eigen webapp voor mijn muzieklessen laten inloggen met mijn schoolaccount. Kunnen jullie daarvoor een app-registratie aanmaken in Entra ID?
>
> - Naam: Lesdag muziek
> - Accounttype: alleen accounts in deze organisatie (single tenant)
> - Platform: Single-page application, redirect-URI: `https://lesdag-muziek.pages.dev/auth.html`
> - Gedelegeerde Microsoft Graph-machtigingen: `User.Read`, `Files.ReadWrite.AppFolder`, `Files.Read.All`, `Sites.Read.All`
> - Graag beheerderstoestemming (admin consent) voor deze machtigingen, of toestemming dat ik zelf mag instemmen.
>
> De app slaat geen leerlinggegevens op. Hij leest alleen bestanden waar ik zelf al bij kan, en schrijft alleen in de eigen appmap in mijn OneDrive.
>
> Ik heb van jullie het **Application (client) ID** en het **Directory (tenant) ID** nodig.

Als je die twee gegevens hebt:

1. Open `public/config.js` en vul ze in bij `clientId` en `tenantId`.
2. Zet de wijziging op GitHub (commit en push); Cloudflare Pages rolt hem vanzelf uit.
3. Ga in Lesdag naar **Instellingen** en kies **Inloggen met schoolaccount**.

Staat er al iets in Lesdag op dit apparaat? Bij de eerste keer inloggen gaat die stand naar OneDrive.

## 3. Rooster uit Zermelo

Lesdag kan je rooster uit Zermelo halen, met roosterwijzigingen, een ander lokaal en vervallen lessen. De browser mag de Zermelo-link niet zelf lezen. Daarom gaat het via een klein doorgeefprogramma (een Cloudflare Worker).

1. Ga in Cloudflare naar **Workers & Pages**, dan **Create**, dan **Create Worker**. Noem hem `lesdag-rooster` en kies **Deploy**.
2. Kies **Edit code**, vervang alle code door de inhoud van `worker/rooster-proxy.js` en kies **Deploy**.
3. Staat je Lesdag op een ander adres dan `https://lesdag-muziek.pages.dev`? Pas dan bovenaan in de Worker het adres bij `LESDAG` aan.
4. Kopieer het adres van de Worker, bijvoorbeeld `https://lesdag-rooster.jouwnaam.workers.dev`, en zet het in `public/config.js` bij `roosterProxy`. Commit en push.
5. Ga in Lesdag naar **Instellingen, Rooster uit Zermelo** en plak je Zermelo-agendalink.
6. Ga naar **Rooster** en kies **Overnemen als vast rooster**.

Daarna haalt Lesdag het rooster op als je de app opent, en elk halfuur als je ernaar terugkeert. Voor de komende drie weken gebruikt Vandaag dan het echte Zermelo-rooster. Vervallen lessen schuiven vanzelf door. Een ander lokaal krijgt een rood label.

De Zermelo-link werkt als een wachtwoord voor je rooster. Lesdag bewaart hem alleen in je browser en in je eigen OneDrive. De Worker geeft hem door aan Zermelo en bewaart niets. Is de link ergens terechtgekomen waar hij niet hoort, maak dan in Zermelo een nieuwe koppeling aan.

## 4. Eerste keer gebruiken

1. **Rooster**: neem het rooster over uit Zermelo (stap 3), of vul per lesuur de dag, de tijden, de groep (bijvoorbeeld h3a) en het lokaal in.
2. **Vandaag**: staan je groepen nog op les 1? Kies **Zet ze op de planning**. Dan gelden alle lessen vóór deze lesweek als gegeven.
3. **Groepen**: controleer per groep of de volgende les klopt. Met "gegeven" en "niet gegeven" schuif je een les heen en terug.

## Wat er waar staat

| Bestand | Inhoud |
|---|---|
| `public/` | de app zelf (`index.html`, `app.css`, `app.js`); Cloudflare Pages publiceert deze map |
| `m365.js`, `auth.html`, `config.js` | de Microsoft-koppeling en het adres van de roosterproxy |
| `worker/rooster-proxy.js` | de Cloudflare Worker voor Zermelo (apart online zetten, niet in Pages) |
| `public/data/basis.json` | de leergangen, de kalender 2026-2027 en de sectiedata |
| `sw.js`, `manifest.webmanifest`, `icons/` | installeren en offline gebruiken |
| `public/vendor/` | Microsoft Authentication Library (MSAL) 5.23.0, MIT-licentie |

Je gegevens (rooster, voortgang, notities, je eigen aanpassingen aan lessen) staan apart van de leergangen. Een nieuwe versie van `data/basis.json` overschrijft je eigen werk dus niet.
