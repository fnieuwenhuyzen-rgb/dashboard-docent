# De zin op Nu (ontwerp Ensemble, 30 oktober 2026)

Nu begint met één zin die zegt wat er nu telt. De zin komt uit rooster, leergang en open punten, **zonder AI**. Code: `nuZin()` en de hulpfuncties eronder in `public/app.js`.

## Vaste regels

1. **Opbouw:** eerst wat nu is, dan wat je moet doen. Hoogstens twee dingen, verbonden met "daarna".
2. **Kort:** ongeveer twintig woorden, één of twee zinnen. Langere informatie hoort in de kaart eronder.
3. **Volgorde:** wat je het snelst vergeet komt eerst. Magister (absenten, huiswerk, logboek) gaat voor afronden, en afronden gaat voor taken.
4. **De eerste knop doet wat de zin als eerste noemt.** De knoppen staan direct onder de zin.
5. **Pauze:** alleen "Pauze." en "Tot 10:25." Niets over werk, geen knoppen, geen lijst.
6. **Lestijd ligt vast.** De zin stelt nooit voor om iets uit een les te halen of een les in te korten.
7. **Raden doet hij niet.** Weet Lesdag iets niet zeker, dan staat dat in een kleine regel onder de zin (`zinTwijfel`): geen Zermelo-link, of een rooster dat langer dan drie uur niet is opgehaald.
8. **Absenten doe je in Magister.** Lesdag herinnert eraan en opent Magister ernaast; er wordt in Lesdag niet getikt.
9. **Toon:** gewone taal, je-vorm, geen uitroeptekens, geen scores of tellers.

## Per moment

| Moment | Label boven de zin | Zin (voorbeeld) |
|---|---|---|
| Voor 8:00 / opstarten | Voor je werkdag · Opstarten tot 8:30 | Goedemorgen. 4 lessen, de eerste om 8:30 (h4), koor om 12:15. *[Collega] is vandaag jarig.* |
| Kwartier voor een les | Over 12 minuten · h4 · lokaal 009 | Zo meteen h4: Notenbingo in de g-sleutel. Zet keyboards en wisbordjes klaar. |
| Eerste kwartier van een les | Les · m3 · tot 12:10 | m3 is 4 minuten bezig. Zet de absenten in Magister zodra de klas aan het werk is. |
| In de les | Les · m3 · tot 12:10 | m3 loopt nog 30 minuten: akkoorden G en C. *Het huiswerk staat klaar voor bij de bel.* |
| Na de bel (20 min) | De bel ging · m3 | Hoe ging m3: gegeven, deels of niet aan toegekomen? *De absenten staan nog open.* |
| Pauze | (geen) | Pauze. Tot 10:25. |
| Rustblok | Rustblok | Tot 14:00 is van jou. Je pauze viel weg door het koor. |
| Koor | Schoolkoor · tot 12:45 | (titel van de repetitie). |
| Werkblok | Werkblok · nog 40 minuten | Je hebt 40 minuten. Eerst de absenten van v3 in Magister, daarna presentatie doorlopen: h4. |
| Werkblok zonder werk | Werkblok · nog 40 minuten | Je hebt 40 minuten en er hoeft niets. Dit blok mag rustig blijven. |
| Geplande taak | Gepland · 13:00–13:30 | Nu: cijferinvoer periode 1. Deadline vr 13 nov. |
| Afspraak (sectie) | 14:30–15:30 | (titel van de afspraak). |
| Tussen twee blokken | Tussendoor | Om 11:20 m3. Nog 3 minuten, even niets. |
| Dag afsluiten | Dag afsluiten · een paar minuten | Tijd om af te sluiten. 3 dingen staan nog open; elk krijgt een moment. |
| Na het afsluiten | (geen) | Je dag is afgesloten. Morgen staat klaar. |
| Vrije dag | (geen) | Herfstvakantie. Vandaag heeft Lesdag niets voor je. |
| Ander moment bekeken (‹ ›) | Ander moment · 9:20–10:10 · v3 | v3: Songbox 1. Nog niet afgerond. |

Schuingedrukt = alleen als het van toepassing is.

## Nog niet in de zin (later)

- "Loopt deze week" (projecten en toetsen als korte regel onder de zin): wacht tot er projecten als gegevens bestaan.
- Een zin bovenaan Week, Jaar, Koor en Sectie in dezelfde stijl.
