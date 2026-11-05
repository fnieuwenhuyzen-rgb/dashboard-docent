# Concept: bericht aan de privacyfunctionaris (4-11-2026)

**Niet verstuurd.** Pas aan, vul de [haakjes] in en verstuur zelf. Onderaan staat wat uit de code blijkt en wat je zelf nog moet nakijken, zodat je niets belooft dat niet klopt.

---

**Aan:** [naam, functionaris gegevensbescherming CSG Prins Maurits]
**Onderwerp:** Melding: leerlinggegevens in mijn lesplanner (Lesdag) op een eigen Cloudflare-account

Beste [naam],

Ik gebruik als docent muziek een eigen planningsapp, Lesdag, voor mijn lessen, taken en beoordelingen. Tot nu toe stond alle data alleen op mijn eigen apparaten (laptop, tablet). Ik wil het synchroniseren tussen die apparaten aanzetten. Daarbij komen ook leerlinggegevens op een online opslag te staan. Ik meld dit vooraf en hoor graag of dat mag, en wat ik nog moet regelen.

**Wat wordt er opgeslagen**
- Klassenlijsten: per groep de namen van leerlingen (alleen naam en een intern nummer, geen leerlingnummer, e-mail of geboortedatum).
- Scores en beoordelingen per leerling bij praktijktoetsen (bijvoorbeeld examenconcerten en Songbox), inclusief aantekeningen bij die beoordelingen.
- Daarnaast mijn eigen werk: taken, afspraken, lesrooster, lesplanning en de koppeling met mijn Zermelo-rooster (daar zit een toegangssleutel van mijn eigen account bij).
- Niet opgeslagen: verjaardagen van leerlingen, absenten en logboeknotities over leerlingen. Die blijven alleen op het apparaat zelf. Er staan geen leerlingnamen in de code of op openbare plekken.

**Waar en hoe**
- Een database (Cloudflare D1, "lesdag-sync") op mijn eigen, persoonlijke Cloudflare-account. [Locatie: EU; zie opmerking onder.]
- De website en de database zijn alleen bereikbaar na inloggen met mijn schoolmailadres (Cloudflare Access, eenmalige code per mail). De server controleert bij elk verzoek nogmaals of het mijn adres is. Het is één persoon, één account: er is geen toegang voor anderen ingericht.
- [Ik zet tweestapsverificatie aan op het Cloudflare-account: gedaan op [datum].]

**Wie erbij kan**
- Ik zelf, via de login.
- Beheerders van het Cloudflare-account (nu: [alleen ik / ook ...]) en Cloudflare zelf als verwerker.
- Verder niemand: er is geen deelfunctie en geen koppeling met andere systemen.

**Hoe lang**
- De actuele gegevens blijven staan zolang ik ze in de app laat staan; verwijder ik een leerling of een klassenlijst, dan verdwijnt die uit de actuele stand.
- Back-ups: per dag een stand van vóór de eerste wijziging van die dag, 30 dagen bewaard. Namen die ik verwijder, staan dus nog maximaal 30 dagen in een back-up.
- Eén back-up, de stand na de allereerste upload, blijft bewaard totdat ik die zelf verwijder. [Dat ga ik doen op [datum] / ik hoor graag of dat wenselijk is.]

**Mijn vragen**
1. Mag ik leerlingnamen en scores zo op mijn eigen Cloudflare-account bewaren, of moet het binnen de schoolomgeving (bijvoorbeeld Microsoft 365)?
2. Is er een verwerkersovereenkomst met Cloudflare nodig, en zo ja, wie sluit die af?
3. Moet dit in het verwerkingsregister, en is een DPIA nodig?
4. Welke bewaartermijn hanteert de school voor scores en beoordelingen?
5. Zijn er extra maatregelen die u wilt zien?

Ik zet het synchroniseren pas aan na uw antwoord. [of: Tot u antwoordt blijft alles op de apparaten zelf.] Ik kan de werking graag laten zien.

Met vriendelijke groet,
Frans Nieuwenhuyzen
Docent muziek

---

## Voor Frans: wat de code aantoont en wat niet

**Aantoonbaar uit de code** (`functions/api/staat.js`, `public/sync.js`, `migrations/0001_staat.sql`, `wrangler.toml`):
- Naar de server gaat de hele staat van de app (`syncDoc`), behalve de eigen sleutel `lesdag-apparaat` (verjaardagen, absenten, logboeknotities) en het beoordelingslogboek in IndexedDB. Dat omvat klassenlijsten (`beoord.lijsten`: naam en intern id), toetsen met scores en krabbels (`beoord.toetsen`), taken, rooster en de Zermelo-token (`_zermeloApi`).
- Alleen het adres `nwn@csgpm.nl` komt erdoor (`EIGENAAR`); het Access-token wordt op de server gecontroleerd (handtekening, doelgroep, uitgever, geldigheid). Buiten productie is er geen database (503).
- Back-ups: één per dag (stand vóór de eerste wijziging van die dag), opgeschoond tot 30 dagen, plus één die `eerste` heet en **nooit automatisch verdwijnt**. Opruimen gebeurt alleen op het moment dat er iets wordt geschreven.
- Er worden geen gegevens naar andere partijen gestuurd door deze functie.

**Niet uit de code te halen, zelf nakijken:**
- **EU**: dit staat in `OPEN-PUNTEN.md`, maar niet in `wrangler.toml` (geen regio of jurisdictie ingesteld). Kijk in het Cloudflare-dashboard bij de database "lesdag-sync" wat de locatie is. Let op: de Pages Functions zelf draaien wereldwijd op het Cloudflare-netwerk; de data staat in de database, het verkeer loopt langs de dichtstbijzijnde server. Formuleer dus niet "alles blijft in de EU" als je dat niet kunt aantonen.
- **Wie er in het account zit**: het Access-team (`pmkoor`) hoort bij een account dat ook de Koorapp draagt. Controleer onder Manage account, Members wie er toegang heeft en pas de zin "Wie erbij kan" daarop aan.
- **Versleuteling en eigen back-ups van Cloudflare** (bijvoorbeeld D1 Time Travel): dat is een functie van Cloudflare, niet van Lesdag, en duurt per abonnement anders. Beloof alleen wat je in het dashboard hebt gezien.
- **Verwerkersovereenkomst**: of Cloudflare die voor jouw account heeft, kun je niet uit de code halen; vraag het de functionaris.
- **Zermelo-token**: dat is geen leerlinggegeven maar een toegangssleutel tot jouw rooster. Het staat in het bericht omdat het meegaat naar de server.

**Twee dingen die ik in de code zag en die je in het bericht verwerkt hebt of kunt aanpassen:**
1. De back-up `eerste` bevat de volledige stand van de eerste upload, dus ook alle namen, en wordt nooit automatisch opgeruimd. Verwijderen kan niet vanuit de app; dat zou met een opdracht op de database moeten. Vraag mij dat pas als je het wilt.
2. Verwijderde leerlingen worden in de app bewaard in een lijst `beoord.weg` (zodat een leerling met dezelfde naam zijn id terugkrijgt). Die lijst gaat ook mee naar de server. Het bericht zegt "verdwijnt uit de actuele stand"; dat klopt voor de klassenlijst, niet voor die bewaarlijst. Wil je dat anders, dan is het een wijziging in de code.
