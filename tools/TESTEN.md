# Testen van Lesdag

Eén opdracht draait alles: `node tools/test-alles.js` (±40 s; `--snel` ±20 s; `--zonder-browser` zonder schermtest).

| Onderdeel | Bestand | Wat het vangt |
|---|---|---|
| Bestanden | `test-bestanden.js` | syntaxfout in een script, ontbrekend bestand in `index.html` of de `SHELL`-lijst van `sw.js` |
| Gegevens | `controleer-gegevens.js` | kapotte JSON, **minder** sectietaken/leergangen/lessen/presentaties/formulieren dan `HEAD`, leerlingnamen-achtige velden |
| Rekenregels, lesklok, agendafeed, samenvoegen | `beoordeling/test-reken.js`, `test-lesklok.js`, `test-agendafeed.js`, `test-sync.js` | rekenfouten |
| Toetsdatum en planning | `test-toetsdatum.js`, `test-planning.js` | een toets die niet op zijn datum uit `basis.json` staat (Dag, Week, Jaar, klasblad, tekort, agendafeed); nieuwe afwijking in de data |
| Schermen | `test-schermen.js` | "Dit scherm lukt nu niet", consolefouten, horizontale overloop; 14 schermen × 7 tijden × 1280/375 px, met verzonnen rooster |
| Schermen | `test-schermen.js` | "Dit scherm lukt nu niet", consolefouten, horizontale overloop; 14 schermen × 7 tijden × 1280/375 px, met verzonnen rooster. Plus (8-11) zes formaten (375×812, 412×915, tablet 800×1280 en 1280×800 met aanraking, laptop 1366×768 en 1920×1080): overloop en tikdoelen onder 44 px, en het toetsenbord (Enter opent, focus erin, Esc sluit, focus terug); `--formaten=geen` slaat dat over, `--snel` doet er twee |

Routetest Beoordelen (`node tools/test-routes-beoordelen.js [--model=<id,id>] [--toon]`, of `test-alles.js --routes`; ±5 minuten): klikt per model uit `beoordeling.json` de hele route door (lijst plakken, koppelen, groepjes, scoren, concertstand, tussenstand, afwezig/inhalen, afronden, wijzigen, herkansing, klasgenoten, inleverbak, cijferkolom, csv, feedbackblad-pdf, reserve, logboek) en rekent elke uitkomst na met een eigen berekening uit het model.
Routetest toetsdag (`node tools/test-routes-toetsdag.js [--poort=8761]`, zit in `test-alles`, ±20 s): P1 vwo 4 (klas tv4) op ma 23-11 van begin tot eind met een vaste klok: de dagen ervoor geen P1, de toetsdag op Nu/Dag/Beoordelen met één tik naar de scorekaart, scoren, afwezige, afronden, kolom kopiëren, "staat in Magister", inhalen en de dag erna, verplaats-paneel en bericht aan de klas, en de kaart "Periode 1 sluit ..." (bevindingen 8, 56, 58 t/m 61 en 67 t/m 70 van ronde 2).
Routes door de lesmodus (niet in `test-alles`, ±17 min voor alle lessen, `--snel` ±4 min): `node tools/test-routes-lesmodus.js [--leergang=vwo4] [--onderdeel=6] [--rapport=pad]`. Loopt elke les van elke leergang door op 1280×800 en 1920×1080, plus kapotte lesvelden, timers, lesklok op alle tijden, afronden en regie met bord in twee vensters. Lesinhoud die niet past komt in het rapport, niet in de exitcode.

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
