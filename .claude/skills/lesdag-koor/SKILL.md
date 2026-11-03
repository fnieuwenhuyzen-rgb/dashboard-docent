---
name: lesdag-koor
description: Haal de schoolkoorplanning opnieuw uit de Koorapp (D1, alleen lezen) en zet repetities, concerten en dirigent-taken in Lesdag. Gebruik nadat de koorplanning in de Koorapp (Beheer) is gewijzigd, of als Frans vraagt de koorgegevens te verversen.
---

# Koorgegevens verversen

1. Vanuit de Lesdag-repo, in PowerShell (npx moet naast node gevonden worden):
   ```powershell
   cd "C:\Users\nwn\OneDrive - CSG Prins Maurits\Documenten\Dashboard Docent\lesdag project\lesdag"; & "$env:LOCALAPPDATA\Programs\node\node.exe" tools\koor-sync.js
   ```
   Het script leest met wrangler de nieuwste rij van `inhoud_versies` (D1 `pmkoor-leden`, werkmap = de Koorapp-map in `Documenten/Claude werkmap/Koorapp`, `KOORAPP` in het script) en zet `koor` in `public/data/basis.json`. Het schrijft niets in de Koorapp.
2. Controleer de uitvoer: aantal agenda-items en taken, en de regels per datum. Klopt een datum niet met de Optredens-map, meld het; de Koorapp is leidend voor datums.
3. Vaste voorbereiding per concert: lijst `VOORBEREIDING` in `tools/koor-sync.js` (sleutel, dagen voor het concert, titel, toelichting). Id `koor-voor-<concert>-<jaar>-<sleutel>`: blijft gelijk als de datum binnen het jaar schuift, dus afvinken (`S.koorAf`) blijft bewaard. Een sleutel hernoemen maakt van een taak een nieuwe taak. Taken komen in beeld `zicht` dagen voor de deadline (7) en verdwijnen na het concert (`tot`), ook zonder nieuwe sync. Nieuwe taken met een deadline van langer dan een week geleden worden niet aangemaakt; wat al in `basis.json` stond blijft staan. De dag zelf en na afloop blijven op de papieren checklist (`Checklist uitvoering.docx` in de Koorapp-map). Vervalt een concert in de Koorapp, dan verdwijnen de taken bij de volgende sync.
4. Niet overnemen (basis.json is openbaar): notities voor koorleden, thuis oefenen, Praktisch-teksten, WhatsApp, ledengegevens. Het script laat ze al weg; voeg ze ook niet handmatig toe.
5. `/lesdag-online`. Live controleren: `fetch('data/basis.json').then(r=>r.json()).then(b=>b.koor.inhoudsversie)` op een ingelogde tab.
