---
name: lesdag-koor
description: Haal de schoolkoorplanning opnieuw uit de Koorapp (D1, alleen lezen) en zet repetities, concerten en dirigent-taken in Lesdag. Gebruik nadat de koorplanning in de Koorapp (Beheer) is gewijzigd, of als Frans vraagt de koorgegevens te verversen.
---

# Koorgegevens verversen

1. Vanuit de Lesdag-repo, in PowerShell (npx moet naast node gevonden worden):
   ```powershell
   cd "C:\Projecten\Lesdag"; & "$env:LOCALAPPDATA\Programs\node\node.exe" tools\koor-sync.js
   ```
   Het script leest met wrangler de nieuwste rij van `inhoud_versies` (D1 `pmkoor-leden`, werkmap = Koorapp-map) en zet `koor` in `public/data/basis.json`. Het schrijft niets in de Koorapp.
2. Controleer de uitvoer: aantal agenda-items en taken, en de regels per datum. Klopt een datum niet met de Optredens-map, meld het; de Koorapp is leidend voor datums.
3. Niet overnemen (basis.json is openbaar): notities voor koorleden, thuis oefenen, Praktisch-teksten, WhatsApp, ledengegevens. Het script laat ze al weg; voeg ze ook niet handmatig toe.
4. `/lesdag-online`. Live controleren: `fetch('data/basis.json').then(r=>r.json()).then(b=>b.koor.inhoudsversie)` op een ingelogde tab.
