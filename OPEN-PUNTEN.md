# Open punten Lesdag

Bijgewerkt: 20 november 2026 (les-t12 gepusht; lijst 2 van de audit 17-11). Houd dit bestand onder de 45 regels.
Kleine en minder dringende punten: `handboek/werkvoorraad.md` (zoek op onderwerp). Afgehandeld: `handboek/archief-open-punten-tot-2026-11-09.md` (zoek, niet lezen). Besluiten: `handboek/beslisblad-2026-11-09.md`.
Labels: [Frans] wacht op hem; [Claude] kan een sessie doen.

## Stand
- Wat tot 16-11 live ging, met details per onderdeel: `handboek/stand-tot-2026-11-16.md` (zoek). Daaruit nog open:
  [Frans] logo-pictogram op telefoon en tablet opnieuw op het beginscherm; reclameposter proefprinten en QR scannen; brede indeling en Beoordelen met echte klassen (vóór 23-11); lay-out per groep bevestigen; Forms-formulieren (kerstopname, oefenopnames, PTA); Past in dit gat A in een echte week; printlinks bij Klaarzetten live bekijken (bestand ontbreekt nog voor strookje bb1, reflectieformulier havo 3, werkblad notenbalk mavo 4); regie op de echte tablet proberen (werkvoorraad, "Ontwerp timer op het bord").
  [Claude] na elke sectievergadering `zet-sectie-acties.js`. Bordtaak les-t12 (19-11, cache v85, op 20-11 samengevoegd in main en gepusht, commit `511ee9b`; live niet nagekeken: Access vraagt inlog): foto's uit de presentaties nu ook in Geef les, 50 lessen, 46 foto's verkleind (max 1280 px) in `public/beeld/les` met bronregels; opnieuw maken met `node tools/koppel-lesfotos.js` (fasefoto alleen als de fasekop in de app gelijk is). PowerPoint-link op de dia Thuis en materiaal klein en onderaan. [Frans] op de laptop (ingelogd) controleren dat Geef les v85 heeft en een les met foto's bekijken via `#lesproef/vwo3:12.1` of een andere les uit `public/lesfotos.js`. Ook nog: [Frans] God Rest Ye in Musicbox (box `839c630f…`): leadsheet `Sectie Muziek/01 Onderbouw muziek/03 Klas 3/Kerst/God Rest Ye (vwo)/Leadsheet/god-rest-ye-leadsheet.png` en videolinks per niveau (YouTube Qa3v9gc6u24, Bhuo3QOV088, YLCyANnBHkE) staan nog niet in de box. Claude doet dit alleen in een sessie waarin Frans meekijkt (aanpassen in Musicbox, ingelogd als Frans), of Frans zet ze er zelf in. Werkwijze: stand, regel God Rest Ye.

## Audit 16-11 (live sinds 16-11, cache v82)
- Rapport: `lesdag project/rapporten/audit-2026-11-16.md`. Op 16-11 met het ja van Frans samengevoegd en gepusht. Rooster-worker apart uitgerold met `wrangler deploy`.
- Gedaan: VO-dag weg; bron gelijk aan basis (+ controle); beveiligingsaudit 2, 6, 9; regie met kmu h3; agendafeed gestopt elders; back-up per NL-dag; inhaler-minimum; fasen-tekst met streepje; inline scripts weg en CSP afgedwongen (losse commit `2757df1`, weglaten kan); rooster-worker foutbestendig (los uitrollen met `wrangler deploy`).
- Lijst 2 besloten op 16/17-11 en live sinds 17-11 (commit `2107527`, cache v83, script `tools/zet-lijst2-2026-11-17.js`): havo 5 11.1 klassikaal en 11.2 hele klas; vwo4 10.2 vervalt; kaarten automatisch "geprint, één per leerling" in Klaarzetten; gitaar niveau 1 kleine grepen (klas 3 en brugklas); zelfbeoordeling mavo 4 en bb1 17.1 naar strookje van 3 min (mavo 4 telt nog 10%); vwo5:26.1 gesprek met de docent; vwo4 34.2 en blok P3 voor de docent; vwo6 T10 week 27; mavo3 P1 herkansing na 14-6; PTA-velden mavo 3 en 4; Google Fonts zelf aangeboden; Microsoft-code weg (m365.js is een leeg stuk). Uitzonderingen examenconcert (mavo 4 bands, vwo6 P19, vwo5 P10) en "tweetal is geen groepje" staan in het geheugen. Niet veranderd: havo3/vwo3 20.1 (telt voor P1), vwo5:33.2, plafond bij inhalers.
- Tegenstrijdig met het PTA, Frans kiest [Frans]: mavo3 P1 herkansing volgens PTA in TW3, besluit 16-11 zegt na 14-6; mavo4 P3 PTA-inleverdatum 22-1, Lesdag zegt 30-3.
- [Frans] Back-up `eerste`: Instellingen, Synchroniseren, Back-ups. Staat er "Eerste upload", zeg het; dan wist Claude hem.

## Na live, in deze volgorde
1. Live versie bekijken met het echte rooster, op laptop en tablet. De nachtserie ging live zonder de proefversie. [Frans]
2. Controleer dat de migratie van vwo 5 de eigen voortgang goed heeft omgenummerd. [Frans, op de laptop]
3. Synchroniseren aan, mét leerlinggegevens (besluit 18-11, bordtaak les-t13). Branch `bord/les-t13` (worktree `lesdag-werk/les-t13`): klassenlijsten en scores gaan nu standaard mee, lokaal getest; nog niet live, wacht op ja. Daarna per apparaat Instellingen, Synchroniseren aanzetten; eerst "Wat staat er op de server?" bij Leerlinggegevens (oude rijen kunnen botsen). Agendalink: Instellingen, Agenda in Outlook, link maken, in Outlook op het web Agenda toevoegen, Abonneren via internet (vaste titels, geen eigen afspraken). [Frans, op de laptop]
   Risico's leerlinggegevens: D1 is versleuteld opgeslagen door Cloudflare (Cloudflare heeft de sleutel, geen eigen versleuteling); toegang alleen via Access en controle op nwn@csgpm.nl; ook in 30 dagen back-ups en `eerste`. Locatie database onbekend (niet EU-vastgezet), en een privé Cloudflare-account valt niet onder een verwerkersovereenkomst van school. [Frans: nagaan of dit mag]
4. Dashboard verversen: `tools/ververs-dashboard.js`. [Claude]

## Wacht op Frans
Handtaken: lijst en afvinkstaat op https://claude.ai/artifact/Sg88D8jGnJpHXYfC7yB5yp (10-11: alleen privémail bewezen klaar. Schoolmail en Gmail nagekeken: PTA-lijst niet per mail verstuurd, niets aan Mar sinds 8-11. Antwoord aan Jan ging 9-11 uit; solist en namen kaarsendragers volgen nog, Frans heeft ze eind volgende week).
- Uit de week van 9-11, nagaan of het gedaan is: bericht over 23-11 aan vwo 4 en 5 in Magister; PTA-lijst doorsturen (`lesdag project/PTA-punten muziek 2026-2027 voor PTA-beheerder.docx`); oude map `lesdag project/lesdag` verwijderen; al geprinte onderhoudsteamkaarten opnieuw printen (meldpunt sinds 10-11 bij Sectie Muziek, `Claude werkmap/Meldpunt kapotte instrumenten/bouwlog.md`).
- Nu (na 16-11): Power Automate-stroom HD4 uit en proefantwoord wissen.
- Voor 23-11, op een echt apparaat: Cijferkolom plakken in Magister. Lesmodus op het digibord. Zermelo met het echte rooster. Concertstand op de tablet. Feedbackblad printen. Beoordelen in een echte les (vwo 4 PT1), checklist: `handboek/pt1-vwo4-checklist-2026-11-09.md`.

## Op datum
- Na toets 23-11: PT1-namen in formulieren en decks vwo 4 naar P1 (links mee). [Frans]
- [Frans] Strookje p2-mavo4 staat sinds 17-11 in de sectiemap (P2 Format zelfbeoordeling leerling: twee per A4, 7 zinnen, voorbeeld en eigen cijfer). Printen en kijken of het past, vóór 7-12 (les 14.2). Let op: koppel-beoordeling.js zet bij vwo 4 dubbele P1-links tot de PT1-namen weg zijn.
- Voor 7-12: fasen voorstellen voor vwo 4 15.1 (14-12), daarna 21.1, 30.1, 32.2; Frans keurt. [Claude + Frans]
- Voor 15-3 (vwo 5 lesweek 26): wat komt er in vwo5:26.3 in plaats van "iedereen presenteert één stijl"? Voor 7-6: havo 4 blok B4 "optreden in de klas" (les 36). [Frans]
- Voor de kerst: PTA en leergangen 2027-2028 aanpassen (praktijktoetsen vwo 4 en 5 niet vlak na de zomer). [Frans]
- TW2-rooster (januari): de toetsen van 18-1 een datum geven. Vwo 5 T5 hangt sinds de uitval van ma 18-1 aan geen les (de controle meldt dat): geef hem dan ook weer een les.
- Voor 22 maart, na mavo 3 presentatie 2: 12 beoordelingsmodellen naar een strookje, de 12 uit het auditrapport (besloten 16-11). [Claude]
- Voor eind maart: zomertijd-jacht in de agenda.
- Mei 2027: opnames St. Louis Blues en Mahler kiezen voor keuzeuur havo 3.

## Als eerste oppakken
- Vaste lesdag per klas uit Zermelo: kan bij de proefversie met het echte rooster. [Claude]
- 32 voorgestelde lessen (havo 4, vwo 4, mavo 3) eerst aanpassen, dan per klas overnemen, begin havo 4. [Claude + Frans]
- Past in dit gat, onderdeel B (besloten 11-11): een eigen taak zonder deadline die twee weken openstaat, komt terug bij Week afsluiten met drie knoppen: plan, datum geven of laten vallen. Nu staat zo'n taak in `kandidaten` altijd achteraan. Na A. [Claude]
