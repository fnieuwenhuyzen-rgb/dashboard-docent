# Lesdag

Webapp om muzieklessen voor te bereiden en te geven (CSG Prins Maurits, sectie muziek).

- `public/` is de app zelf; dit is de map die Cloudflare Pages publiceert.
- `worker/rooster-proxy.js` is de Cloudflare Worker voor het Zermelo-rooster (apart online zetten).
- `bron/`, `tools/` zijn de bron en de scripts waarmee `public/data/basis.json` is gemaakt.
- `LEESMIJ.md` legt de werking en de installatie uit; `CLAUDE.md` is de overdracht voor Claude Code.

Online: https://lesdag-muziek.pages.dev
