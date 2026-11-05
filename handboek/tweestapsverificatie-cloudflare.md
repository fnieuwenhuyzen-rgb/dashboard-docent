# Tweestapsverificatie aanzetten op het Cloudflare-account (4-11-2026)

Dit doe je zelf. Ik wijzig geen accountinstellingen. Duur: ongeveer 5 minuten. Doe het op de laptop, met je telefoon erbij.

**Waarom:** op dit account staat straks een database met leerlingnamen en scores. Wie je Cloudflare-wachtwoord heeft, kan daar bij. Met een tweede stap is een gestolen wachtwoord niet genoeg.

## Stappen

De namen van de menu's in Cloudflare veranderen soms; zoek op de woorden tussen haakjes als het er anders uitziet.

1. Open https://dash.cloudflare.com en log in met het account waarop Lesdag en de Koorapp staan.
2. Klik rechtsboven op je profiel (het rondje of je mailadres) en kies **My Profile** (Mijn profiel).
3. Ga naar **Authentication** (Authenticatie).
4. Bij **Two-Factor Authentication** kies je **Set up** / **Enable**.
5. Kies **Authenticator app** (aanbevolen). Heb je een beveiligingssleutel (zoals een YubiKey), dan kan dat ook, maar neem dan toch eerst de app.
6. Open op je telefoon een authenticator-app (bijvoorbeeld Microsoft Authenticator of Google Authenticator), kies "account toevoegen" en scan de QR-code op het scherm.
7. Vul de zescijferige code uit de app in op de pagina en bevestig.
8. Cloudflare toont **herstelcodes**. Dit is het belangrijkste deel: download of schrijf ze op en bewaar ze **buiten** de Claude werkmap, de sectiemap en de repo (dus niet in een gedeelde of gesynchroniseerde map met code). Een wachtwoordmanager of een afgesloten plek thuis is goed. Zonder deze codes kom je er niet meer in als je telefoon kwijt is.
9. Uitloggen en opnieuw inloggen om te testen: wachtwoord, daarna de code uit de app. Lukt dat, dan is het klaar.

## Daarna

- Controleer onder **Manage Account, Members** wie er nog meer in dit account zit en of dat klopt. Heeft iemand anders toegang, vraag dan of die persoon ook tweestapsverificatie aanzet.
- Controleer onder **My Profile, API Tokens** of er tokens staan die je niet meer gebruikt, en verwijder die.
- Meld in `OPEN-PUNTEN.md` bij "Synchroniseren tussen apparaten" dat het gedaan is, en vul de datum in het bericht aan de privacyfunctionaris in.

Niet te verwarren met de login op Lesdag zelf: die loopt via Cloudflare Access met een code per mail en blijft zoals hij is.
