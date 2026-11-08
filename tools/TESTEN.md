# Testen van Lesdag

Eén opdracht draait alles: `node tools/test-alles.js` (±40 s; `--snel` ±20 s; `--zonder-browser` zonder schermtest).

| Onderdeel | Bestand | Wat het vangt |
|---|---|---|
| Bestanden | `test-bestanden.js` | syntaxfout in een script, ontbrekend bestand in `index.html` of de `SHELL`-lijst van `sw.js` |
| Gegevens | `controleer-gegevens.js` | kapotte JSON, **minder** sectietaken/leergangen/lessen/presentaties/formulieren dan `HEAD`, leerlingnamen-achtige velden |
| Rekenregels, lesklok, agendafeed, samenvoegen | `beoordeling/test-reken.js`, `test-lesklok.js`, `test-agendafeed.js`, `test-sync.js` | rekenfouten |
| Schermen | `test-schermen.js` | "Dit scherm lukt nu niet", consolefouten, horizontale overloop; 14 schermen × 7 tijden × 1280/375 px, met verzonnen rooster |

Routetest Beoordelen (`node tools/test-routes-beoordelen.js [--model=<id,id>] [--toon]`, of `test-alles.js --routes`; ±5 minuten): klikt per model uit `beoordeling.json` de hele route door (lijst plakken, koppelen, groepjes, scoren, concertstand, tussenstand, afwezig/inhalen, afronden, wijzigen, herkansing, klasgenoten, inleverbak, cijferkolom, csv, feedbackblad-pdf, reserve, logboek) en rekent elke uitkomst na met een eigen berekening uit het model.

## Eenmalig: Playwright buiten de repo

```
mkdir C:\Users\nwn\lesdag-werk\_testgereedschap
cd C:\Users\nwn\lesdag-werk\_testgereedschap
npm init -y
npm i playwright-core
```

Daarna `NODE_PATH` op `C:\Users\nwn\lesdag-werk\_testgereedschap\node_modules` zetten bij het draaien (PowerShell: `$env:NODE_PATH='C:\...\node_modules'`). De schermtest gebruikt de Edge of Chrome die al op de laptop staat; er wordt niets gedownload. Zonder Playwright slaat `test-alles` de schermtest over en zegt dat.

## Gegevens beschermen bij het committen (zet Frans zelf aan)

```
node tools/zet-hook-aan.js        # aan
node tools/zet-hook-aan.js --uit  # uit
```

Elke commit waarin `basis.json`, `beoordeling.json` of `leergang-data.json` zit, wordt dan eerst gecontroleerd op wat er in de index staat. Bewust minder erin: `LESDAG_AANTALLEN_OK=1 git commit ...`. Zonder de hook kan het ook los: `node tools/controleer-gegevens.js --staged`.

## Voorstel voor `/lesdag-online`

Vóór het committen: `node tools/test-alles.js --snel` (met `NODE_PATH` gezet). Faalt het, dan niet committen of pushen. Een schermfout die al bestond en bij een ander werkblok hoort laat de run ook falen: noteer die dan in het commitbericht en push toch, of wacht op de reparatie. Na het pushen blijft de controle op de live-site zoals nu.

## Testgegevens

Alleen verzonnen groepscodes (`tv4`, `th3`, …) en namen ("Testleerling, Anna"). De schermtest zet zijn eigen staat in een wegwerpbrowser; er blijft niets staan.
