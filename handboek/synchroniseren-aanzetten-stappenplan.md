# Synchroniseren aanzetten: stappenplan (4-11-2026)

Voor Frans. Eén kant, in deze volgorde. Niets hiervan is al gedaan: synchroniseren staat live maar uit.

## Wat je gaat doen, in één zin

Elk apparaat zet het zelf aan in Instellingen. Het eerste apparaat vult de lege server, de andere twee voegen zich daar bij. Elk apparaat downloadt eerst een kopie.

## 0. Vooraf (10 minuten, één keer)

- [ ] **Tweestapsverificatie op het Cloudflare-account** aanzetten: zie `tweestapsverificatie-cloudflare.md`. Reden: er gaan leerlingnamen en scores naar een database op dat account.
- Geen bericht aan de privacyfunctionaris: besluit Frans 9-11.
- [ ] Gebruik op elk apparaat **het live adres** https://lesdag-muziek.pages.dev. De proef (`lesdag-proef`) en andere adressen hebben een eigen staat en doen niet mee.
- [ ] Op elk apparaat de app **afsluiten en opnieuw openen**, zodat de nieuwste versie draait. In Instellingen moet de kaart "Synchroniseren" met de knop "Synchroniseren aanzetten" staan.
- [ ] Zet geen les aan tijdens het aanzetten. Synchroniseren wacht tijdens de lesmodus, tijdens typen en bij een open paneel; dat is normaal.

## 1. Eerst het apparaat dat het meest bij is

Dat is het apparaat waar je de laatste weken het meest op afvinkte en plande (Edge, Chrome of de tablet). Dit is nu je "hoofdapparaat".

1. Instellingen, kaart **Synchroniseren**, knop **Synchroniseren aanzetten**.
2. Bevestig de vraag ("Je gegevens gaan naar de Lesdag-server achter je login…").
3. Er downloadt een **kopie** (bestand in Downloads). Laat die staan, in elk geval tot alles is nagelopen.
4. Onder de knop staan drie regels: *Dit apparaat had / De server had / Nu overal*. De server had nu niets (0 taken, 0 lesuren). **Nu overal** moet gelijk zijn aan **Dit apparaat had**. Klopt het aantal taken, lesuren en klassenlijsten met wat je verwacht? Zo niet: stop hier en meld het.
5. Status onderaan moet **Gesynchroniseerd** zeggen.

Gaat het mis ("Dat lukte niet…")? Er is dan niets veranderd op dat apparaat. Zie punt 5 hieronder.

## 2. Het tweede apparaat

Zelfde knop. Dit apparaat heeft eigen gegevens én de server heeft die van het hoofdapparaat. Het voegt ze samen.

1. **Synchroniseren aanzetten**, bevestigen, kopie laten downloaden.
2. Lees de drie regels. **Nu overal** hoort ongeveer gelijk te zijn aan het hoofdapparaat, plus wat alleen hier stond. Een flink hoger aantal lesuren dan op het hoofdapparaat is verdacht: zie punt 4.
3. Vink even iets af op dit apparaat, wacht tot de status op **Gesynchroniseerd** staat (een paar seconden), en kijk of het vinkje op het hoofdapparaat verschijnt (Instellingen, **Nu synchroniseren** helpt).

Is dit apparaat **helemaal leeg** (nieuw, nog nooit gebruikt)? Dan neemt het de server vanzelf over bij het openen en hoef je niets aan te zetten.

## 3. Het derde apparaat

Net als het tweede. Daarna zijn alle drie gekoppeld.

## 4. Wat daarna na te lopen is

De apparaten hebben elkaar nooit gezien en hebben dus geen gemeenschappelijke basis. De code kiest bij twijfel "afgevinkt wint", zodat afgevinkte taken niet terugkomen. De keerzijde: wat je op één apparaat **verwijderde** terwijl het op een ander nog stond, kan terugkomen. Loop na op het apparaat dat je dagelijks gebruikt:

- [ ] **Dubbele lesuren** in Week en Vandaag: twee keer dezelfde les op dezelfde dag, tijd en klas. De app ruimt die zelf op (het lesuur met het kleinste id blijft), maar kijk de komende week toch na, vooral de dagen met een parallelgroep.
- [ ] **Terugkomende taken**: staan er taken in Taken of Blijft liggen die je ooit verwijderde? Verwijder ze opnieuw, wacht tot "Gesynchroniseerd" en kijk of ze op een ander apparaat weg blijven.
- [ ] **Afgevinkte taken** van de afgelopen weken: blijven ze afgevinkt op alle drie? Let op "Presentatie doorlopen" en de sectie-, koor- en reclametaken.
- [ ] **Afspraken en gepland werk** van deze en volgende week: aantal en tijden kloppen.
- [ ] **Klassenlijsten** (Instellingen, "Klassenlijsten"): aantal per groep gelijk op alle apparaten. Een leerling die je eerder verwijderde, kan nog in de bewaarlijst staan; kijk of de lijsten kloppen.
- [ ] **Zermelo-koppeling**: rooster laadt op elk apparaat nog (de koppeling gaat mee, je hoeft niets opnieuw in te plakken).
- [ ] **Per apparaat gebleven**: verjaardagen van collega's, absenten en logboeknotities staan niet op de server. Dat hoort zo.

Is iets onjuist? Zet het recht op het hoofdapparaat. Gaat het echt mis, dan kan **Back-ups** (Instellingen, kaart Synchroniseren) een eerdere stand terugzetten, maar let op: terugzetten vervangt de staat op **alle** apparaten. Vraag bij twijfel eerst hulp voordat je iets terugzet.

## 5. Als er "Opnieuw inloggen" staat

Je ziet de balk **"Opnieuw inloggen om te synchroniseren. Je werk staat veilig op dit apparaat."** Je login (Cloudflare Access, een maand geldig) is verlopen, of de server vindt het token niet in orde.

1. Tik op **Inloggen** in de balk. Je krijgt het Access-scherm: vul `nwn@csgpm.nl` in, haal de code uit je mail, vul die in.
2. Terug in de app: Instellingen, **Nu synchroniseren**. Status moet **Gesynchroniseerd** worden en de balk verdwijnt.
3. Lukt dat niet vanuit de app op het beginscherm (Android)? Open https://lesdag-muziek.pages.dev in Chrome, log daar in, en open daarna de app opnieuw.
4. Blijft het terugkomen, direct na het aanzetten? Dan klopt de token-controle op de server niet. Dit is lokaal niet te testen en de eerste echte test. Zet het dan niet op de andere apparaten aan, **wis geen sitegegevens** (je staat staat dan alleen nog daar), en meld het.

Andere meldingen: *Offline* (geen verbinding, gaat vanzelf over), *Te groot om te synchroniseren* (één onderdeel is boven 1,9 MB; melden), *Server niet bereikbaar* (later opnieuw).

## 6. Afronden

- [ ] Kopieën uit Downloads bewaren tot je een week tevreden bent, en ze dan verwijderen: ze bevatten leerlingnamen.
- [ ] Zet in `OPEN-PUNTEN.md` het punt op afgevinkt en noteer wat je tegenkwam.
