# Inhoudbestanden voor `tools/maak-decks.js`

Eén JSON-bestand per groep presentaties. Controleren: `node tools/maak-decks.js tools/inhoud-x.json --droog`. Node staat op `C:\Users\nwn\AppData\Local\Programs\node\node.exe`.

```json
{
  "vwo5": {
    "klas": "vwo 5", "thema": "klas5", "map": "02 Keuzevak muziek\\VWO\\VWO 5\\Lessen 2026-2027",
    "blok": "Periode 1 · Het classicisme", "blokKort": "classicisme", "thuis": { "mb": "...", "learn": "...", "info": "...", "extra": "..." },
    "lessen": [ { "...": "zie onder" } ]
  }
}
```

`thema`: `klas3` (oranje), `klas4`, `klas5`, `klas6`, `mavo`. `thuis` mag ook per les; alle velden zijn optioneel, geen velden betekent geen thuisdia.

## Een les

| Veld | Wat |
|---|---|
| `bestand`, `kort`, `code`, `week` | Bestandsnaam van de pptx, korte titel op de dia's, label als `P2 · les 11`, lesweek |
| `koppel` | `[{ "lg": "havo3", "w": 11, "slot": "l1" }]`: de les in `basis.json` waar de link komt. Een presentatie die voor havo 3 en vwo 3 geldt krijgt beide |
| `bronLes` | `{ "lg", "w", "slot" }`: haalt titel, vraag, doel, criteria, fasen, formatief, identiteit en benodigd uit `basis.json`. Eigen velden gaan voor |
| `fasen` | Alleen als de les in `basis.json` geen fase-objecten heeft (daar staan dan teksten als `15 min · overzicht`): dezelfde minuten en volgorde, nu uitgeschreven. Samen 45 minuten |
| `fasenExtra` | Bij `bronLes` met fase-objecten: `{ "0": { "notitie": {...} } }`. Velden hier vullen fase 0 aan of vervangen ze (ook `stappen` of `beeld` als die niet kloppen) |
| `fotos` | `{ "titel", "doel", "fase": [per fase of null], "rodeDraad" }`. Bestandsnaam uit een `beeld`-map van een lesmap; uit een andere klas wordt hij vanzelf gekopieerd met bronregel. Met `naam.jpg@0.3,0.5` kies je welk deel blijft staan bij het bijsnijden (x,y van 0 tot 1). Alleen foto's die echt bij de les passen; een dia zonder passende foto krijgt er geen |
| `notitieTitel`, `notitieAgenda`, `notitieDoel`, `notitieRodeDraad`, `notitieThuis`, `voorbereiding` | Lijsten met alinea's. `voorbereiding`: wat Frans vóór de les klaarzet of bekijkt. `vragenRodeDraad`: `[{ "v", "a" }]` |
| `formatief` | `{ "soort", "tekst", "notitie": { "vertel": [], "vragen": [{ "v", "a" }], "letop": [] } }` (bij `bronLes` alleen `notitie` nodig) |

## Een fase

`{ "min", "soort": "start|luisteren|uitleg|doen|gesprek|check|afsluiten", "kop", "stappen": [], "klaar", "docent", "beeld", "notitie" }`

- `stappen` staan op de dia: kort, voor de leerling, hooguit vijf, elk hooguit twee regels.
- `beeld` komt rechts op de dia in plaats van een foto: `{ "soort": "kaarten", "items": [{ "k", "t" }] }`, `{ "soort": "tabel", "rijen": [[...]], "kol": [0.55,0.25,0.2] }`, `{ "soort": "akkoorden", "items": ["G","D"], "onder": "onderschrift" }` (grepen: G C D Em Am E A Dm F Bm D7 G7 A7 E7 Bm7 B7 Dsus4), `{ "soort": "vorm", "items": [{ "d": "Couplet", "m": 8 }] }`, `{ "soort": "opbouw", "items": [{ "d": "couplet", "v": 2 }] }`, `{ "soort": "fragment", "k", "t", "link", "u" }`.
- `notitie`: `{ "vertel": [], "voorbeelden": [], "vragen": [{ "v", "a" }], "leerlingen": [], "letop": [] }`. `leerlingen` alleen als het meer is dan de stappen (die komen er anders vanzelf in). Tijd en `klaar` komen er vanzelf bij; `docent` komt onder LET OP.

## Wat in de notities hoort

Frans geeft de les uit de notities: "daar zou ik alle informatie die ik moet geven terug moeten vinden." Zonder andere voorbereiding moet hij de les kunnen geven.

- **`vertel`:** de volledige uitleg in zinnen die hij zo kan zeggen of parafraseren, met alle feiten, namen, jaartallen en begrippen met hun betekenis. Niet "leg uit wat X is", maar de uitleg zelf.
- **`voorbeelden`:** concreet, met maatnummers, tonen, grepen of opnames waar dat kan.
- **`vragen`:** de vragen die hij stelt, met het verwachte antwoord.
- **`letop`:** waar het misgaat, wat hij doet als het misgaat, waar hij op let bij het rondlopen.
- Een fase van vijf minuten mag kort. Een uitlegfase van tien of vijftien minuten vult die tijd ook echt.

## Regels

- Feiten alleen uit de bronnen die je opdracht noemt (PTA, studiewijzer, leergang, kerstboxontwerp, lesmateriaal in de sectiemap). Staat iets niet in de bronnen maar is het algemeen vaststaande muziekkennis, dan mag het alleen als je er zeker van bent. Tegenstrijdigheden: niet oplossen, melden in je eindrapport. Gebruik in de notities de versie uit de leergang.
- Geen meta-tekst ("deze dia laat zien", "in deze notities"), geen songteksten (titels en een enkele woordgroep die de les bespreekt mag, zoals 'comfort and joy'). Christelijke school: voorbeelden daarop afstemmen.
- Nederlands, korte zinnen, informeel en direct. Geen gedachtestreepjes.
- Geen leerlingnamen. Geen namen van collega's die niet in de bron staan.
- Schrijf alleen je eigen inhoudbestand. Wijzig `public/`, `bron/`, `lesdeck.js`, `maak-decks.js` en de sectiemap niet. Niet committen.
