---
name: lesdag-lokaal
description: Test Lesdag lokaal in de ingebouwde browser (launch-entry lesdag-proef) met een verzonnen testrooster, meet in plaats van schermafdrukken te maken, en ruim de testgegevens op. Gebruik voordat je een wijziging aan public/ online zet.
---

# Lesdag lokaal testen

1. Start de server: `preview_start` met `name: "lesdag-proef"` (`tools/serve-lokaal.js`, poort uit PORT, meestal 8732). Lukt het niet omdat alle plekken bezet zijn, push dan naar een eigen branch: `https://<branch>.lesdag-muziek.pages.dev` (achter Access; Frans moet daar mogelijk opnieuw inloggen).
2. Lokaal is er geen service worker en geen Microsoft-login. De staat staat in localStorage `lesdag-staat` van `localhost:<poort>`.
3. Testgegevens zetten met `javascript_tool`, bijvoorbeeld:
   ```js
   const S = JSON.parse(localStorage.getItem('lesdag-staat') || '{}');
   S.groepLeergang = { v4test: 'vwo4' };
   S.rooster = [{ id: 't1', dag: 1, start: '8:30', eind: '9:15', groep: 'v4test', lokaal: '009' }];
   localStorage.setItem('lesdag-staat', JSON.stringify(S)); location.reload();
   ```
   Alleen verzonnen groepscodes en namen ("Testleerling, Anna").
4. Controleren door te meten: `get_page_text`, `javascript_tool` (rekenwerk, `getBoundingClientRect`, `scrollWidth` tegen `innerWidth`), `read_console_messages` met `onlyErrors`. Smalle schermen: `resize_window` preset `mobile`, daarna weer `desktop`. Schermafdrukken alleen als de opmaak zelf de vraag is (ze lopen vaak vast als het venster verborgen is).
5. Opruimen: `localStorage.removeItem('lesdag-staat')`, `preview_stop`. Laat de tab niet op localhost staan als Frans de ingebouwde browser voor de echte app gebruikt: navigeer terug naar https://lesdag-muziek.pages.dev/.
