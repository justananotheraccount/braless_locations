(function () {
  "use strict";

  var cfg = window.APP_CONFIG || {};
  var MOBILE_QUERY = window.matchMedia("(max-width: 700px)");
  var AGE_KEY = "ageConfirmed";

  var map;
  var items = [];      // { id, props, layer, bounds } seřazené podle id
  var current = null;  // aktuálně otevřená položka

  var el = {
    panel: document.getElementById("panel"),
    video: document.getElementById("video"),
    reddit: document.getElementById("reddit"),
    redgifs: document.getElementById("redgifs"),
    counter: document.getElementById("counter"),
    prev: document.getElementById("prev"),
    next: document.getElementById("next"),
    close: document.getElementById("close"),
    toast: document.getElementById("toast"),
    ageGate: document.getElementById("age-gate"),
    ageYes: document.getElementById("age-yes"),
  };

  // ---------- Pomocné funkce ----------

  // https://www.redgifs.com/watch/<id>?from=embed -> https://www.redgifs.com/ifr/<id>
  function redgifsEmbedUrl(url) {
    if (!url) return "";
    var m = String(url).match(/redgifs\.com\/(?:watch|ifr|i)\/([a-z0-9]+)/i);
    return m ? "https://www.redgifs.com/ifr/" + m[1].toLowerCase() : "";
  }

  function toast(msg, ms) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toast._t);
    if (ms) toast._t = setTimeout(function () { el.toast.hidden = true; }, ms);
  }

  function storage(fn) {
    try { return fn(window.localStorage); } catch (e) { return null; }
  }

  // Odsazení tak, aby body nezakrýval panel (vpravo na desktopu, dole na mobilu).
  function fitOptions() {
    if (MOBILE_QUERY.matches) {
      return { paddingTopLeft: [30, 40], paddingBottomRight: [30, el.panel.offsetHeight + 30] };
    }
    return { paddingTopLeft: [60, 60], paddingBottomRight: [el.panel.offsetWidth + 60, 60] };
  }

  // ---------- Styl bodů ----------

  // Špendlík s ikonou filmové kamery (místo natáčení).
  var PIN_SVG =
    '<svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path class="pin-body" d="M16 41C16 41 30 26.5 30 15.5A14 14 0 0 0 2 15.5C2 26.5 16 41 16 41Z"/>' +
      '<g fill="#fff">' +
        '<rect x="8" y="12" width="11" height="8" rx="1.6"/>' +
        '<path d="M19.5 15.3 24 12.6v7.8l-4.5-2.7z"/>' +
        '<circle cx="10.3" cy="9.6" r="2.1"/>' +
        '<circle cx="15.6" cy="9.6" r="2.1"/>' +
      '</g>' +
    '</svg>';

  var icons = {};
  function pinIcon(active) {
    var key = active ? "active" : "normal";
    if (!icons[key]) {
      var w = active ? 40 : 30, h = Math.round(w * 42 / 32);
      icons[key] = L.divIcon({
        className: "pin" + (active ? " pin-active" : ""),
        html: PIN_SVG,
        iconSize: [w, h],
        iconAnchor: [w / 2, h],
      });
    }
    return icons[key];
  }

  function setActive(item, active) {
    item.layer.eachLayer(function (l) {
      l.setIcon(pinIcon(active));
      l.setZIndexOffset(active ? 1000 : 0);
    });
  }

  // ---------- Panel ----------

  function openItem(item, opts) {
    opts = opts || {};
    if (current) setActive(current, false);
    current = item;
    setActive(item, true);

    var p = item.props;
    var embed = redgifsEmbedUrl(p.redgifs);

    if (el.video.getAttribute("src") !== embed) el.video.src = embed || "about:blank";
    el.reddit.href = p.reddit || "#";
    el.reddit.hidden = !p.reddit;
    el.redgifs.href = p.redgifs || "#";
    el.redgifs.hidden = !embed;

    el.counter.textContent = (items.indexOf(item) + 1) + " / " + items.length;
    el.prev.disabled = el.next.disabled = items.length < 2;

    el.panel.classList.add("open");
    el.panel.setAttribute("aria-hidden", "false");

    if (location.hash !== "#" + item.id) history.replaceState(null, "", "#" + item.id);

    // Počkáme na vysunutí panelu, aby šly spočítat jeho rozměry.
    setTimeout(function () {
      var o = fitOptions();
      // Při kliknutí na bod jen posuneme mapu (bez změny měřítka), při přepínání přiblížíme.
      o.maxZoom = opts.fit ? 17 : map.getZoom();
      map.flyToBounds(item.bounds, Object.assign(o, { duration: 0.5 }));
    }, 260);
  }

  function closePanel() {
    if (current) setActive(current, false);
    current = null;
    el.panel.classList.remove("open");
    el.panel.setAttribute("aria-hidden", "true");
    el.video.src = "about:blank"; // zastaví přehrávání
    history.replaceState(null, "", location.pathname + location.search);
  }

  function step(dir) {
    if (!current || items.length < 2) return;
    var i = (items.indexOf(current) + dir + items.length) % items.length;
    openItem(items[i], { fit: true });
  }

  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return false;
    var item = items.find(function (x) { return x.id === id; });
    if (item) openItem(item, { fit: true });
    return !!item;
  }

  // Na mobilu lze panel zavřít stažením dolů za hlavičku.
  function enableSwipeToClose() {
    var head = el.panel.querySelector(".panel-head");
    var grip = el.panel.querySelector(".panel-grip");
    var startY = null, dy = 0;

    function start(e) {
      if (!MOBILE_QUERY.matches || e.target.closest("button")) return;
      startY = e.touches[0].clientY;
      dy = 0;
      el.panel.classList.add("dragging");
    }
    function move(e) {
      if (startY === null) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      el.panel.style.transform = "translateY(" + dy + "px)";
    }
    function end() {
      if (startY === null) return;
      startY = null;
      el.panel.classList.remove("dragging");
      el.panel.style.transform = "";
      if (dy > 80) closePanel();
    }
    [head, grip].forEach(function (n) {
      n.addEventListener("touchstart", start, { passive: true });
      n.addEventListener("touchmove", move, { passive: true });
      n.addEventListener("touchend", end);
      n.addEventListener("touchcancel", end);
    });
  }

  // ---------- Data ----------

  function loadData() {
    var url = (cfg.dataUrl || "data.geojson") + "?v=" + Date.now();
    return fetch(url, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (geojson) {
        L.geoJSON(geojson, {
          pointToLayer: function (f, latlng) {
            return L.marker(latlng, { icon: pinIcon(false), title: "Video #" + f.properties.id, riseOnHover: true });
          },
          onEachFeature: function (f, layer) {
            // MultiPoint je skupina vrstev, jednoduchý Point jen jedna vrstva.
            var group = layer.eachLayer ? layer : L.featureGroup([layer]);
            var item = {
              id: String(f.properties && f.properties.id),
              props: f.properties || {},
              layer: group,
              bounds: group.getBounds(),
            };
            items.push(item);
            group.on("click", function (e) {
              L.DomEvent.stopPropagation(e);
              openItem(item);
            });
          },
        }).addTo(map);

        items.sort(function (a, b) { return (Number(a.id) || 0) - (Number(b.id) || 0); });
        if (!items.length) return toast("GeoJSON neobsahuje žádné prvky.", 4000);

        if (!openFromHash()) {
          var all = L.latLngBounds([]);
          items.forEach(function (it) { all.extend(it.bounds); });
          map.fitBounds(all, { padding: [40, 40], maxZoom: 17 });
        }
      })
      .catch(function (err) {
        console.error(err);
        toast("Nepodařilo se načíst data (" + err.message + "). Spouštíte stránku přes webový server?");
      });
  }

  // ---------- Inicializace ----------

  function initMap() {
    var t = cfg.tiles || {};
    var root = document.documentElement.style;
    root.setProperty("--pin-color", cfg.markerColor || "#e0245e");
    root.setProperty("--pin-active-color", cfg.markerActiveColor || "#ff9f1c");

    map = L.map("map", { zoomControl: !MOBILE_QUERY.matches, tap: true })
      .setView([50.0875, 14.4213], 13);

    L.tileLayer(t.url || "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      subdomains: t.subdomains || "0123",
      maxZoom: t.maxZoom || 20,
      attribution: t.attribution || "",
    }).addTo(map);

    el.close.addEventListener("click", closePanel);
    el.prev.addEventListener("click", function () { step(-1); });
    el.next.addEventListener("click", function () { step(1); });
    document.addEventListener("keydown", function (e) {
      if (!current) return;
      if (e.key === "Escape") closePanel();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    });
    window.addEventListener("hashchange", openFromHash);
    enableSwipeToClose();

    loadData();
  }

  function start() {
    if (!window.L) return toast("Nepodařilo se načíst knihovnu Leaflet.");
    var confirmed = storage(function (ls) { return ls.getItem(AGE_KEY); }) === "1";
    if (!cfg.ageGate || confirmed) return initMap();

    el.ageGate.hidden = false;
    el.ageYes.addEventListener("click", function () {
      storage(function (ls) { ls.setItem(AGE_KEY, "1"); });
      el.ageGate.hidden = true;
      initMap();
    });
  }

  start();
})();
