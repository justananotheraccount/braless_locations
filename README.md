# Mapa videí

Statická webová aplikace (Leaflet): podklad Google roadmap jako XYZ dlaždice + body z `data.geojson` (MultiPoint), po kliknutí panel s videem z RedGIFs a odkazem na Reddit.

## Spuštění lokálně
    python -m http.server 8000
Pak otevřít http://localhost:8000 (přes `file://` se GeoJSON nenačte).

## Nastavení (`config.js`)
- `tiles.url` – XYZ dlaždice podkladu (stejný zápis jako XYZ Tiles v QGIS, `{s}` = subdoména).
- `ageGate` – potvrzení 18+ při první návštěvě.
- `markerColor`, `markerActiveColor` – barvy bodů.

## Data
`data.geojson` se načítá při každém otevření bez cache – stačí ho přepsat.
Každý prvek potřebuje vlastnosti `id`, `reddit`, `redgifs` (odkaz ve tvaru `https://www.redgifs.com/watch/<id>`).
Přímý odkaz na konkrétní video: `https://…/#<id>`.

## Nasazení
Stačí nahrát soubory `index.html`, `app.js`, `style.css`, `config.js`, `data.geojson` na libovolný statický hosting (GitHub Pages, Netlify, vlastní server).
