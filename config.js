// Nastavení aplikace – upravte podle potřeby.
window.APP_CONFIG = {
  // Podkladová mapa jako XYZ dlaždice (stejný formát jako XYZ Tiles v QGIS).
  tiles: {
    url: "https://mt{s}.google.com/vt/lyrs=m&hl=cs&x={x}&y={y}&z={z}",
    subdomains: "0123",
    maxZoom: 20,
    attribution: "Mapová data &copy; Google",
  },

  // Cesta ke GeoJSONu (načítá se vždy čerstvý, bez cache).
  dataUrl: "data.geojson",

  // Zobrazit při prvním otevření potvrzení věku 18+.
  ageGate: true,

  // Barvy bodů.
  markerColor: "#e0245e",
  markerActiveColor: "#ff9f1c",
};
