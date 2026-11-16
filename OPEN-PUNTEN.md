# Open punten Lesdag

Bijgewerkt: 16 november 2026 (audit, tak `audit-2026-11`). Houd dit bestand onder de 45 regels.
Kleine en minder dringende punten: `handboek/werkvoorraad.md` (zoek op onderwerp). Afgehandeld: `handboek/archief-open-punten-tot-2026-11-09.md` (zoek, niet lezen). Besluiten: `handboek/beslisblad-2026-11-09.md`.
Labels: [Frans] wacht op hem; [Claude] kan een sessie doen.

## Stand
- Wat tot 12-11 live ging, met details per onderdeel: `handboek/stand-tot-2026-11-12.md` (zoek). Daaruit nog open:
  [Frans] logo-pictogram op telefoon en tablet opnieuw op het beginscherm; reclameposter proefprinten en QR scannen; brede indeling en Beoordelen met echte klassen (vóór 23-11); lay-out per groep bevestigen; Forms-formulieren (kerstopname, oefenopnames, PTA); Past in dit gat A in een echte week; God Rest Ye-video's op YouTube en leadsheet nakijken.
  [Claude] lesfoto's koppelen en verkleinen, PowerPoint-link klein; God Rest Ye-leadsheet en videolinks in de box; na elke sectievergadering `zet-sectie-acties.js`.

## Audit 16-11 (tak `audit-2026-11`, niet live)
- Rapport: `lesdag project/rapporten/audit-2026-11-16.md`. 14 commits, cache v81, alle tests groen. Wacht op het ja van Frans voor samenvoegen en pushen. [Frans]
- Gedaan op de tak: VO-dag weg; bron gelijk aan basis (+ controle); beveiligingsaudit 2, 6, 9; regie met kmu h3; agendafeed gestopt elders; back-up per NL-dag; inhaler-minimum; fasen-tekst met streepje; inline scripts weg en CSP afgedwongen (losse commit `2757df1`, weglaten kan); rooster-worker foutbestendig (los uitrollen met `wrangler deploy`).
- Frans beslist (details in het rapport): lessen tegen de vaste regels (vwo5:26.3, havo4 blok B4, vwo6-presentaties, mavo 4 publiek bij examenconcert, havo5:11.1-11.2 en vwo5:26.1 groepjes, gitaar niveau 1 zonder kleine grepen, lange zelfbeoordelingen mavo 4 en klas 3); welke kaarten geprint klaar moeten liggen; welke 12 modellen een strookje krijgen; vwo4 10.2 "Generale" na de toets; vwo6 T10 week; mavo3 P1 herkansing vóór de toets.
- Nog open techniek [Claude, na ja]: Google Fonts zelf aanbieden; Microsoft-code weghalen; PTA-velden mavo 4 aanvullen.

## Na live, in deze volgorde
1. Live versie bekijken met het echte rooster, op laptop en tablet. De nachtserie ging live zonder de proefversie. [Frans]
2. Controleer dat de migratie van vwo 5 de eigen voortgang goed heeft omgenummerd. [Frans, op de laptop]
3. Synchroniseren aan, zonder leerlinggegevens. Agendalink maken in Outlook (vaste titels, geen eigen afspraken). [Frans, op de laptop]
4. Dashboard verversen: `tools/ververs-dashboard.js`. [Claude]

## Wacht op Frans
Handtaken: lijst en afvinkstaat op https://claude.ai/artifact/Sg88D8jGnJpHXYfC7yB5yp (10-11: alleen privémail bewezen klaar. Schoolmail en Gmail nagekeken: PTA-lijst niet per mail verstuurd, niets aan Mar sinds 8-11. Antwoord aan Jan ging 9-11 uit; solist en namen kaarsendragers volgen nog, Frans heeft ze eind volgende week).

- Uit de week van 9-11, nagaan of het gedaan is: bericht over 23-11 aan vwo 4 en 5 in Magister; PTA-lijst doorsturen (`lesdag project/PTA-punten muziek 2026-2027 voor PTA-beheerder.docx`); oude map `lesdag project/lesdag` verwijderen; al geprinte onderhoudsteamkaarten opnieuw printen (meldpunt sinds 10-11 bij Sectie Muziek, `Claude werkmap/Meldpunt kapotte instrumenten/bouwlog.md`).
- Nu (na 16-11): Power Automate-stroom HD4 uit en proefantwoord wissen.

- Voor 23-11, op een echt apparaat: Cijferkolom plakken in Magister. Lesmodus op het digibord. Zermelo met het echte rooster. Concertstand op de tablet. Feedbackblad printen. Beoordelen in een echte les (vwo 4 PT1), checklist: `handboek/pt1-vwo4-checklist-2026-11-09.md`.

## Op datum
- Na toets 23-11: PT1-namen in formulieren en decks vwo 4 naar P1 (links mee).
- Voor de kerst: PTA en leergangen 2027-2028 aanpassen (praktijktoetsen vwo 4 en 5 niet vlak na de zomer). [Frans]
- TW2-rooster (januari): de toetsen van 18-1 een datum geven. Vwo 5 T5 hangt sinds de uitval van ma 18-1 aan geen les (de controle meldt dat): geef hem dan ook weer een les.
- Voor 22 maart, na mavo 3 presentatie 2: 12 beoordelingsmodellen naar een strookje. 16 hebben er geen; voorstel voor de 12 in het auditrapport van 16-11. [Frans]
- Voor eind maart: zomertijd-jacht in de agenda.
- Mei 2027: opnames St. Louis Blues en Mahler kiezen voor keuzeuur havo 3.

## Als eerste oppakken
- Vaste lesdag per klas uit Zermelo: kan bij de proefversie met het echte rooster. [Claude]
- 32 voorgestelde lessen (havo 4, vwo 4, mavo 3) eerst aanpassen, dan per klas overnemen, begin havo 4. [Claude + Frans]
- Past in dit gat, onderdeel B (besloten 11-11): een eigen taak zonder deadline die twee weken openstaat, komt terug bij Week afsluiten met drie knoppen: plan, datum geven of laten vallen. Nu staat zo'n taak in `kandidaten` altijd achteraan. Na A. [Claude]
