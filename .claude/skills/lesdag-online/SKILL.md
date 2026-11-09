---
name: lesdag-online
description: Zet wijzigingen in Lesdag live (commit, push naar main = Cloudflare Pages) en controleer het live resultaat achter Cloudflare Access. Gebruik aan het eind van een taak in de Lesdag-repo; niet na elke kleine commit.
---

# Lesdag online zetten

Repo: `C:\Projecten\Lesdag`. Push naar `main` = binnen ongeveer een minuut live op https://lesdag-muziek.pages.dev.

## 1. Vóór het committen

- `git status --short`: alleen de bedoelde bestanden. Geen leerlingnamen, geen Zermelo-link, geen testgegevens.
- Iets veranderd in de vaste bestandenlijst van `public/sw.js` of aan `app.js`/`app.css` met gevolgen voor de cache? Verhoog `CACHE` (`lesdag-vN`).
- `node tools/test-alles.js --snel` met `$env:NODE_PATH='C:\Users\nwn\lesdag-werk\_testgereedschap\node_modules'` moet slagen; faalt het, dan niet pushen (besluit Frans 9-11).
- `node -c public/app.js` (node: `C:\Users\nwn\AppData\Local\Programs\node\node.exe`).
- Gegevens gewijzigd in `tools/`? Eerst de juiste scripts gedraaid (`merge-inhoud.js`, daarna `beoordeling/koppel-beoordeling.js`).

## 2. Committen en pushen

```powershell
$g="$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"; & $g add -A; & $g commit -q -m "<wat en waarom, Nederlands>`n`nCo-Authored-By: <volgens de attributie-instructie>"
```
Pushen kan alleen via het terminalpaneel: `run_in_terminal` met `cwd` = de repo en als commando letterlijk
`C:\Users\nwn\AppData\Local\Programs\Git\cmd\git.exe push origin main`. Lees de uitvoer met `read_terminal` en sluit het tabblad daarna.

## 3. Live controleren

- Zonder inlog: `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" https://lesdag-muziek.pages.dev/` geeft `302` naar `pmkoor.cloudflareaccess.com`. Dat bewijst alleen dat de beveiliging werkt.
- Met inlog: in de ingebouwde browser is Frans meestal ingelogd. Op een tab van lesdag-muziek.pages.dev met `javascript_tool` een gewijzigd bestand ophalen (`fetch('app.js', {cache:'no-store'})`) en op een kenmerkende tekst controleren. Wacht hooguit 30 seconden per poging; Pages heeft soms een minuut nodig.
- Lukt inloggen niet, zeg dan dat de live inhoud niet gecontroleerd is.

## 4. Afronden

Meld in ≤5 regels: commit, wat live staat, wat niet getest is. Werk `OPEN-PUNTEN.md` bij als er iets afgerond of nieuw is.
