/* ============================================================
   LINES OF SIGHT — application
   Tower renderer + interactive components. Vanilla JS, no
   dependencies. All invented or modelled content is labelled
   where it appears; see Sources in the document.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- tiny helpers ---------- */
  const NS = "http://www.w3.org/2000/svg";
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  function el(tag, attrs, parent) {
    const n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    if (parent) parent.appendChild(n);
    return n;
  }
  function sv(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    if (parent) parent.appendChild(n);
    return n;
  }
  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* inject the SVG animation stylesheet once */
  (function injectSvgStyle() {
    const s = document.createElement("style");
    s.textContent =
      ".t-reg,.t-wing{transform-box:fill-box;transition:transform .5s cubic-bezier(.45,0,.25,1)}" +
      ".t-reg{transform-origin:50% 50%}" +
      ".t-wing-r{transform-origin:0% 50%}" +
      ".t-wing-l{transform-origin:100% 50%}" +
      ".twr .twr-static .t-reg,.twr .twr-static .t-wing{transition:none}" +
      "@media (prefers-reduced-motion:reduce){.t-reg,.t-wing{transition:none!important}}";
    document.head.appendChild(s);
  })();

  /* ---------- haversine (schematic route length, km) ---------- */
  function haversineKm(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function routeKm(pts) {
    let sum = 0;
    for (let i = 1; i < pts.length; i++) {
      sum += haversineKm(CITIES[pts[i - 1]], CITIES[pts[i]]);
    }
    return Math.round(sum * 1.12); // factor approximates the historical winding between highpoints
  }

  /* ============================================================
     TOWER RENDERER
     The 98-pose system: regulator r ∈ {0°,90°}; each indicator
     takes one of seven offsets relative to its own outward beam
     direction: {-135,-90,-45,45,90,135,180}. 2×7×7 = 98 poses.
     Code numbers 1–98 are this atlas's own ordering, as no
     published pose→number table is consulted here.
     ============================================================ */
  const WING_OFFSETS = [-135, -90, -45, 45, 90, 135, 180];
  const POSES = [];
  (function buildPoses() {
    [0, 90].forEach(function (reg) {
      WING_OFFSETS.forEach(function (o1) {
        WING_OFFSETS.forEach(function (o2) {
          POSES.push({ reg: reg, a: o1, b: o2 });
        });
      });
    });
  })();

  /* one tower; opts: {x,y,scale,compact,base,weights} — returns <g> */
  function makeTower(opts) {
    opts = opts || {};
    const g = sv("g", { class: "twr" });
    const S = opts.scale || 1;
    const compact = !!opts.compact;

    if (!compact && opts.base !== false) {
      /* stone tower base */
      sv("path", {
        d: "M-11,26 L11,26 L6.5,-14 L-6.5,-14 Z",
        fill: "var(--paper)", stroke: "var(--ink)", "stroke-width": 1.6, "stroke-linejoin": "round"
      }, g);
      sv("line", { x1: -8.4, y1: 0, x2: 8.4, y2: 0, stroke: "var(--ink)", "stroke-width": 1, opacity: .5 }, g);
      sv("line", { x1: -7.4, y1: -7, x2: 7.4, y2: -7, stroke: "var(--ink)", "stroke-width": 1, opacity: .35 }, g);
      sv("rect", { x: -1.7, y: 12, width: 3.4, height: 10, fill: "var(--ink)" }, g); /* door */
    }
    /* mast */
    sv("rect", { x: -1.6, y: -26, width: 3.2, height: (compact ? 26 : 40), fill: "var(--ink)" }, g);
    if (!compact && opts.weights !== false) {
      sv("line", { x1: 0, y1: 8, x2: 0, y2: 16, stroke: "var(--ink)", "stroke-width": 1 }, g);
      sv("rect", { x: -4.5, y: 16, width: 9, height: 8, fill: "var(--paper)", stroke: "var(--ink)", "stroke-width": 1.4 }, g);
      sv("line", { x1: -4.5, y1: 20, x2: 4.5, y2: 20, stroke: "var(--ink)", "stroke-width": 1 }, g);
    }

    /* arm assembly — pivot at local (0,0); wings 2.00 m against a 2.30 m half-beam */
    const assy = sv("g", { class: "t-assy", transform: "translate(0,-26)" }, g);
    const reg = sv("g", { class: "t-reg" }, assy);
    sv("rect", { x: -30, y: -1.8, width: 60, height: 3.6, fill: "var(--ink)" }, reg);
    const wr = sv("g", { class: "t-wing t-wing-r" }, reg);
    sv("rect", { x: 30, y: -1.4, width: 26, height: 2.8, fill: "var(--red)" }, wr);
    const wl = sv("g", { class: "t-wing t-wing-l" }, reg);
    sv("rect", { x: -56, y: -1.4, width: 26, height: 2.8, fill: "var(--red)" }, wl);
    sv("circle", { cx: 0, cy: 0, r: 3.4, fill: "var(--red-deep)", stroke: "var(--paper)", "stroke-width": 1.2 }, reg);

    g.setAttribute("transform",
      "translate(" + (opts.x || 0) + "," + (opts.y || 0) + ") scale(" + S + ")");
    g._reg = reg; g._wr = wr; g._wl = wl;
    return g;
  }

  function setPose(tower, codeIdx, instant) {
    const p = POSES[((codeIdx % 98) + 98) % 98];
    const set = function (node, deg) {
      node.style.transform = "rotate(" + deg + "deg)";
      if (instant) { node.style.transition = "none"; void node.getBoundingClientRect(); node.style.transition = ""; }
    };
    set(tower._reg, p.reg);
    set(tower._wr, p.a);
    set(tower._wl, p.b);
    return p;
  }
  function poseSVG(codeIdx, boxW, boxH, scale) {
    const w = boxW || 100, h = boxH || 100;
    const svg = sv("svg", { viewBox: "0 0 " + w + " " + h, "aria-hidden": "true", focusable: "false" });
    const t = makeTower({ x: w / 2, y: h * 0.78, scale: scale || 0.78, compact: true });
    svg.appendChild(t);
    setPose(t, codeIdx, true);
    return svg;
  }

  /* ============================================================
     HERO SCENE — ridgeline of five stations, idle-cycling
     ============================================================ */
  function buildHero() {
    const host = $("#hero-art");
    if (!host) return;
    const svg = sv("svg", { viewBox: "0 0 1600 760", preserveAspectRatio: "xMidYMax slice", "aria-hidden": "true", focusable: "false" });

    /* sky hatch */
    const defs = sv("defs", {}, svg);
    const pat = sv("pattern", { id: "sky-hatch", patternUnits: "userSpaceOnUse", width: 7, height: 7, patternTransform: "rotate(0)" }, defs);
    sv("line", { x1: 0, y1: 3.5, x2: 7, y2: 3.5, stroke: "var(--ink)", "stroke-width": .6, opacity: .5 }, pat);
    sv("rect", { x: 0, y: 0, width: 1600, height: 760, fill: "url(#sky-hatch)", opacity: .07 }, svg);

    /* sun — engraved disc */
    const sun = sv("g", { transform: "translate(1275,205)" }, svg);
    sv("circle", { cx: 0, cy: 0, r: 92, fill: "none", stroke: "var(--ink)", "stroke-width": 1.4, opacity: .8 }, sun);
    sv("circle", { cx: 0, cy: 0, r: 78, fill: "var(--paper-3)", stroke: "var(--ink)", "stroke-width": 1 }, sun);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      sv("line", {
        x1: Math.cos(a) * 96, y1: Math.sin(a) * 96,
        x2: Math.cos(a) * (110 + (i % 2 ? 10 : 0)), y2: Math.sin(a) * (110 + (i % 2 ? 10 : 0)),
        stroke: "var(--ink)", "stroke-width": 1, opacity: .55
      }, sun);
    }

    /* sight lines between towers — right-hand cluster clears the title column */
    const towerXs = [120, 265, 1150, 1310, 1460];
    const towerYs = [500, 478, 470, 438, 498];
    for (let i = 0; i < 4; i++) {
      sv("line", {
        x1: towerXs[i], y1: towerYs[i] - 26, x2: towerXs[i + 1], y2: towerYs[i + 1] - 26,
        stroke: "var(--red)", "stroke-width": 1.3, "stroke-dasharray": "1.5 7", opacity: .55, "stroke-linecap": "round"
      }, svg);
    }

    /* ridges */
    sv("path", {
      d: "M0,520 C160,470 320,500 470,455 C620,410 760,470 900,445 C1060,420 1240,440 1400,425 L1600,435 L1600,760 L0,760 Z",
      fill: "var(--paper-2)", stroke: "var(--ink)", "stroke-width": 1.4
    }, svg);
    sv("path", {
      d: "M0,600 C220,555 420,585 640,545 C860,505 1080,560 1300,525 C1420,507 1520,520 1600,512 L1600,760 L0,760 Z",
      fill: "var(--paper-3)", stroke: "var(--ink)", "stroke-width": 1.4
    }, svg);
    sv("path", {
      d: "M0,690 C300,650 600,675 900,645 C1150,622 1400,660 1600,640 L1600,760 L0,760 Z",
      fill: "var(--paper)", stroke: "var(--ink)", "stroke-width": 1.2
    }, svg);

    /* five stations, idle-cycling */
    const towers = [];
    const scales = [.85, 1.0, .95, 1.05, .9];
    for (let i = 0; i < 5; i++) {
      const t = makeTower({ x: towerXs[i], y: towerYs[i], scale: scales[i] });
      svg.appendChild(t);
      towers.push(t);
      setPose(t, (i * 23 + 9) % 98, true);
    }
    host.appendChild(svg);

    if (!REDUCED) {
      let visible = true, timer = null, tick = 0;
      const start = function () {
        if (timer) return;
        timer = setInterval(function () {
          if (!visible) return;
          tick++;
          towers.forEach(function (t, i) { if ((tick + i) % 3 === 0) setPose(t, Math.floor(Math.random() * 98)); });
        }, 1900);
      };
      const stop = function () { if (timer) { clearInterval(timer); timer = null; } };
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          visible = es[0].isIntersecting; visible ? start() : stop();
        }, { threshold: .05 }).observe(host);
      } else start();
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stop(); else if (visible) start();
      });
    }
  }

  /* ============================================================
     COMPONENT A — THE ATLAS (map + scrub timeline)
     ============================================================ */
  function initAtlas() {
    const host = $("#atlas-map-svg");
    if (!host) return;

    const YEAR_MIN = 1791, YEAR_MAX = 1855;
    let year = 1794, playing = false, playTimer = null, selected = null;

    const svg = sv("svg", { viewBox: "0 0 820 700", role: "img", "aria-label": "Map of the Chappe telegraph lines of France, " + year });

    const defs = sv("defs", {}, svg);
    const seaPat = sv("pattern", { id: "sea-hatch", patternUnits: "userSpaceOnUse", width: 8, height: 8, patternTransform: "rotate(45)" }, defs);
    sv("line", { x1: 0, y1: 4, x2: 8, y2: 4, stroke: "var(--ink-2)", "stroke-width": .7 }, seaPat);
    sv("rect", { x: 0, y: 0, width: 820, height: 700, fill: "url(#sea-hatch)", opacity: .16 }, svg);

    /* land */
    const d = FRANCE_OUTLINE.map(function (p, i) {
      const x = PROJ.x(p[0]).toFixed(1), y = PROJ.y(p[1]).toFixed(1);
      return (i ? "L" : "M") + x + "," + y;
    }).join(" ") + " Z";
    sv("path", { d: d, class: "map-coast" }, svg);

    /* compass */
    const comp = sv("g", { transform: "translate(786,52)" }, svg);
    sv("line", { x1: 0, y1: 16, x2: 0, y2: -16, stroke: "var(--ink)", "stroke-width": 1.2 }, comp);
    sv("path", { d: "M0,-22 L4,-12 L-4,-12 Z", fill: "var(--ink)" }, comp);
    sv("text", { class: "map-compass", x: 0, y: -26, "text-anchor": "middle", text: "N" }, comp);

    /* line layer + city layer */
    const lineLayer = sv("g", {}, svg);
    const cityLayer = sv("g", {}, svg);

    /* cities */
    Object.keys(CITIES).forEach(function (k) {
      const c = CITIES[k];
      c._x = PROJ.x(c.lon); c._y = PROJ.y(c.lat);
      const dot = sv("circle", {
        cx: c._x.toFixed(1), cy: c._y.toFixed(1),
        r: c.big ? 3.6 : 2.4, class: "map-dot"
      }, cityLayer);
      const t = sv("title", { text: c.name }, dot);
      if (c.big || c.foreign || k === "tours" || k === "verdun" || k === "behobie") {
        const anchor = c.anchor === "left" ? "end" : "start";
        const dx = c.anchor === "left" ? -7 : 7;
        sv("text", {
          x: (c._x + dx).toFixed(1), y: (c._y + (c.anchor === "top" ? -8 : 3.5)).toFixed(1),
          "text-anchor": anchor, class: "map-city-label" + (c.big ? " big" : ""),
          text: c.name
        }, cityLayer);
      }
    });

    /* build line elements */
    const lineEls = {};
    LINES.forEach(function (L) {
      L._km = routeKm(L.pts);
      const pts = L.pts.map(function (k) { return CITIES[k]._x.toFixed(1) + "," + CITIES[k]._y.toFixed(1); }).join(" ");
      const pl = sv("polyline", {
        points: pts, class: "map-line", "data-line": L.id, tabindex: "-1"
      }, lineLayer);
      sv("title", { text: L.name }, pl);
      pl.addEventListener("click", function () { selectLine(L.id); });
      pl.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectLine(L.id); }
      });
      lineEls[L.id] = pl;
    });

    /* Mediterranean inset */
    const inset = sv("g", { transform: "translate(0,0)" }, svg);
    sv("rect", { x: 536, y: 516, width: 258, height: 168, class: "map-inset" }, inset);
    sv("text", { class: "map-inset-label", x: 550, y: 534, text: "MÉDITERRANÉE · 1848–1853" }, inset);
    const IN = {
      algiers:  { name: "Algiers",    lon: 3.05,  lat: 36.75, dx: 0,   dy: -7, anchor: "middle", label: true },
      oran:     { name: "Oran",       lon: -0.64, lat: 35.72, dx: 0,   dy: 12, anchor: "middle", label: true },
      constantine: { name: "Constantine", lon: 7.60, lat: 36.35, dx: 0, dy: 12, anchor: "middle", label: true },
      tunis:    { name: "Tunis",      lon: 11.40, lat: 36.85, dx: -7,  dy: -7, anchor: "end",    label: true },
      goulette: { name: "La Goulette", lon: 11.75, lat: 36.98, dx: 6,  dy: 10, anchor: "start",  label: false }
    };
    Object.keys(IN).forEach(function (k) {
      const p = IN[k];
      p._x = 550 + (p.lon + 2) * 9.2;
      p._y = 552 + (37.3 - p.lat) * 11.5;
    });
    sv("path", {
      d: "M" + IN.oran._x + "," + (IN.oran._y - 14) + " C" + (IN.oran._x + 40) + "," + (IN.oran._y - 4) + " " +
        (IN.algiers._x - 30) + "," + (IN.algiers._y - 8) + " " + IN.algiers._x + "," + IN.algiers._y +
        " S" + (IN.constantine._x - 20) + "," + (IN.constantine._y + 2) + " " + IN.constantine._x + "," + IN.constantine._y +
        " L" + (IN.tunis._x - 10) + "," + (IN.tunis._y + 4),
      fill: "none", stroke: "var(--ink-2)", "stroke-width": 1.4
    }, inset);
    const insetLines = {};
    [["oran", "algiers"], ["constantine", "algiers"]].forEach(function (pair) {
      const a = IN[pair[1]], b = IN[pair[0]];
      insetLines[pair[0]] = sv("line", {
        x1: a._x, y1: a._y, x2: b._x, y2: b._y, class: "map-line", opacity: 0
      }, inset);
    });
    const tunisStub = sv("line", {
      x1: IN.tunis._x, y1: IN.tunis._y, x2: IN.goulette._x, y2: IN.goulette._y, class: "map-line", opacity: 0
    }, inset);
    Object.keys(IN).forEach(function (k) {
      const p = IN[k];
      sv("circle", { cx: p._x.toFixed(1), cy: p._y.toFixed(1), r: 2.4, class: "map-dot" }, inset);
      if (p.label) sv("text", { class: "map-city-label", x: (p._x + (p.dx || 5)).toFixed(1), y: (p._y + (p.dy || 3)).toFixed(1), "text-anchor": p.anchor || "start", text: p.name }, inset);
    });

    /* scale + honesty caption */
    sv("text", {
      class: "map-inset-label", x: 30, y: 686,
      text: "ROUTES SCHEMATIC — DRAWN THROUGH PRINCIPAL TOWNS"
    }, svg);

    host.appendChild(svg);

    /* stats + controls */
    const elYear = $("#atlas-year"), elEvent = $("#atlas-event"), elLines = $("#atlas-lines");
    const elStations = $("#atlas-stations"), elKm = $("#atlas-km"), elOpen = $("#atlas-open");
    const slider = $("#atlas-slider"), playBtn = $("#atlas-play");

    function statusOf(L) {
      if (year < L.year) return "future";
      if (year === L.year) return "under";
      if (L.end && year > L.end) return "closed";
      return "open";
    }
    function refresh() {
      svg.setAttribute("aria-label", "Map of the Chappe telegraph lines of France, " + year);
      let openCount = 0, kmSum = 0, stSum = 0;
      const openNames = [];
      LINES.forEach(function (L) {
        const st = statusOf(L);
        const node = lineEls[L.id];
        node.classList.remove("under", "ghost", "foreign");
        if (L.empire) node.classList.add("foreign");
        if (st === "future") { node.style.display = "none"; }
        else if (st === "under") { node.style.display = ""; node.classList.add("under"); openCount++; kmSum += L._km; stSum += docOrModel(L); openNames.push(L.name); }
        else if (st === "closed") { node.style.display = ""; node.classList.add("ghost"); }
        else { node.style.display = ""; openCount++; kmSum += L._km; stSum += docOrModel(L); openNames.push(L.name); }
        node.setAttribute("tabindex", st === "future" || st === "closed" ? "-1" : "0");
      });
      insetLines.oran.setAttribute("opacity", year >= 1853 ? 1 : 0);
      insetLines.constantine.setAttribute("opacity", year >= 1853 ? 1 : 0);
      tunisStub.setAttribute("opacity", year >= 1848 ? 1 : 0);

      elYear.textContent = year;
      const yDisp = $("#atlas-year-display");
      if (yDisp) yDisp.textContent = year;
      elOpen.innerHTML = openCount + " <small>lines</small>";
      elKm.innerHTML = Math.round(kmSum).toLocaleString("en-US") + " <small>km · modelled</small>";
      elStations.innerHTML = stSum.toLocaleString("en-US") + " <small>towers · modelled</small>";

      const ev = TIMELINE_EVENTS[year];
      if (ev) {
        elEvent.innerHTML = '<div class="ae-year">' + year + "</div><div class=\"ae-title\">" + ev.t + '</div><div class="ae-text">' + ev.d + "</div>";
        elEvent.style.display = "";
      } else {
        elEvent.style.display = "none";
      }
      elLines.innerHTML = openNames.length
        ? '<div class="al-title">LINES WORKING IN ' + year + "</div><ul>" +
          openNames.map(function (n) { return '<li><span class="al-dot"></span>' + n + "</li>"; }).join("") + "</ul>"
        : "";
      slider.setAttribute("aria-valuetext", year + (ev ? " — " + ev.t : ""));
      if (selected) {
        const L = LINES.find(function (x) { return x.id === selected; });
        const cardEl = $("#atlas-linecard");
        if (L) {
          const st2 = statusOf(L);
          cardEl.style.display = "";
          cardEl.innerHTML =
            '<div class="ae-year">' + L.name + "</div>" +
            '<div class="ae-text"><b>' +
            (st2 === "under" ? "under construction, " : st2 === "closed" ? "closed " : "working ") +
            (L.year) + (L.end ? "–" + L.end : "") + "</b> · " +
            (L.km ? L.km + " km, " + L.st + " towers (documented). " : "≈" + L._km + " km (modelled on this map). ") +
            L.note + "</div>";
        }
      }
    }
    function docOrModel(L) { return L.st || Math.round(L._km / 12); }

    function selectLine(id) {
      selected = id;
      Object.keys(lineEls).forEach(function (k) { lineEls[k].classList.toggle("sel", k === id); });
      refresh();
    }

    /* slider wiring */
    slider.min = YEAR_MIN; slider.max = YEAR_MAX; slider.value = year; slider.step = 1;
    slider.setAttribute("aria-label", "Network year");
    slider.addEventListener("input", function () { year = parseInt(slider.value, 10); stopPlay(); refresh(); });

    function stopPlay() {
      if (playing) {
        playing = false;
        clearInterval(playTimer); playTimer = null;
        playBtn.setAttribute("aria-pressed", "false");
        playBtn.setAttribute("title", "Play the network's growth");
      }
    }
    playBtn.addEventListener("click", function () {
      if (playing) { stopPlay(); return; }
      playing = true;
      playBtn.setAttribute("aria-pressed", "true");
      playBtn.setAttribute("title", "Pause");
      if (year >= YEAR_MAX) { year = YEAR_MIN; slider.value = year; }
      playTimer = setInterval(function () {
        year++;
        slider.value = year;
        refresh();
        if (year >= YEAR_MAX) stopPlay();
      }, REDUCED ? 600 : 420);
    });

    refresh();
  }

  /* ============================================================
     COMPONENT B — ANATOMY OF A TOWER (annotated plate)
     ============================================================ */
  function initAnatomy() {
    const wrap = $("#anatomy-wrap");
    if (!wrap) return;
    const svg = sv("svg", { viewBox: "0 0 760 470", role: "img", "aria-label": "Engineering plate: a Chappe telegraph station, annotated" });

    /* hill hatch */
    const defs = sv("defs", {}, svg);
    const pat = sv("pattern", { id: "hill-hatch", patternUnits: "userSpaceOnUse", width: 7, height: 7, patternTransform: "rotate(45)" }, defs);
    sv("line", { x1: 0, y1: 3.5, x2: 7, y2: 3.5, stroke: "var(--ink)", "stroke-width": .7 }, pat);
    sv("rect", { x: 0, y: 396, width: 760, height: 74, fill: "url(#hill-hatch)", opacity: .12 }, svg);
    sv("line", { x1: 0, y1: 400, x2: 760, y2: 400, stroke: "var(--ink)", "stroke-width": 1.6 }, svg);

    /* stone tower */
    sv("path", { d: "M150,400 L260,400 L238,268 L172,268 Z", fill: "var(--paper)", stroke: "var(--ink)", "stroke-width": 1.8, "stroke-linejoin": "round" }, svg);
    sv("line", { x1: 161, y1: 340, x2: 249, y2: 340, stroke: "var(--ink)", "stroke-width": 1, opacity: .5 }, svg);
    sv("line", { x1: 166, y1: 306, x2: 244, y2: 306, stroke: "var(--ink)", "stroke-width": 1, opacity: .5 }, svg);
    sv("rect", { x: 198, y: 370, width: 14, height: 30, fill: "var(--ink)" }, svg);
    /* platform */
    sv("rect", { x: 138, y: 256, width: 134, height: 12, fill: "var(--paper-3)", stroke: "var(--ink)", "stroke-width": 1.6 }, svg);
    sv("line", { x1: 138, y1: 262, x2: 272, y2: 262, stroke: "var(--ink)", "stroke-width": 1, opacity: .5 }, svg);

    /* sight line to next station */
    sv("line", { x1: 216, y1: 118, x2: 686, y2: 278, stroke: "var(--red)", "stroke-width": 1.2, "stroke-dasharray": "1.5 7", opacity: .5, "stroke-linecap": "round" }, svg);

    /* mast + arm assembly — the mast painted sky blue, as the machines were */
    sv("rect", { x: 203, y: 118, width: 4, height: 140, fill: "var(--blue)" }, svg);
    const assy = sv("g", { transform: "translate(205,118) scale(1.35)" }, svg);
    const reg = sv("g", { class: "t-reg" }, assy);
    sv("rect", { x: -30, y: -1.8, width: 60, height: 3.6, fill: "var(--ink)" }, reg);
    const wr = sv("g", { class: "t-wing t-wing-r" }, reg);
    sv("rect", { x: 30, y: -1.4, width: 26, height: 2.8, fill: "var(--red)" }, wr);
    const wl = sv("g", { class: "t-wing t-wing-l" }, reg);
    sv("rect", { x: -56, y: -1.4, width: 26, height: 2.8, fill: "var(--red)" }, wl);
    sv("circle", { cx: 0, cy: 0, r: 3.4, fill: "var(--red-deep)", stroke: "var(--paper)", "stroke-width": 1.2 }, reg);
    (function pose() { reg.style.transform = "rotate(0deg)"; wr.style.transform = "rotate(-90deg)"; wl.style.transform = "rotate(45deg)"; })();

    /* counterweights */
    sv("line", { x1: 190, y1: 268, x2: 190, y2: 292, stroke: "var(--ink)", "stroke-width": 1.4 }, svg);
    sv("rect", { x: 183, y: 292, width: 14, height: 16, fill: "var(--paper)", stroke: "var(--ink)", "stroke-width": 1.5 }, svg);
    sv("line", { x1: 183, y1: 300, x2: 197, y2: 300, stroke: "var(--ink)", "stroke-width": 1 }, svg);
    sv("line", { x1: 218, y1: 268, x2: 218, y2: 288, stroke: "var(--ink)", "stroke-width": 1.4 }, svg);
    sv("rect", { x: 211, y: 288, width: 14, height: 16, fill: "var(--paper)", stroke: "var(--ink)", "stroke-width": 1.5 }, svg);
    sv("line", { x1: 211, y1: 296, x2: 225, y2: 296, stroke: "var(--ink)", "stroke-width": 1 }, svg);

    /* manipulator hut + mini mast */
    sv("path", { d: "M282,345 L356,345 L356,400 L282,400 Z", fill: "var(--paper)", stroke: "var(--ink)", "stroke-width": 1.7 }, svg);
    sv("path", { d: "M276,345 L319,323 L362,345", fill: "var(--paper-3)", stroke: "var(--ink)", "stroke-width": 1.7 }, svg);
    sv("rect", { x: 296, y: 362, width: 12, height: 38, fill: "var(--ink)", opacity: .85 }, svg);
    sv("rect", { x: 330, y: 358, width: 3, height: 30, fill: "var(--ink)" }, svg);
    const mini = sv("g", { transform: "translate(331.5,356) scale(.42)" }, svg);
    sv("rect", { x: -30, y: -1.8, width: 60, height: 3.6, fill: "var(--ink)" }, mini);
    sv("rect", { x: 30, y: -1.3, width: 14, height: 2.6, fill: "var(--red)", transform: "rotate(-90 30 0)" }, mini);
    sv("rect", { x: -44, y: -1.3, width: 14, height: 2.6, fill: "var(--red)", transform: "rotate(45 -30 0)" }, mini);
    sv("circle", { cx: 0, cy: 0, r: 4, fill: "var(--red-deep)" }, mini);

    /* telescopes */
    sv("circle", { cx: 250, cy: 246, r: 3.2, fill: "var(--ink)" }, svg);
    sv("line", { x1: 250, y1: 246, x2: 330, y2: 226, stroke: "var(--ink)", "stroke-width": 3, "stroke-linecap": "round" }, svg);
    sv("line", { x1: 250, y1: 246, x2: 328, y2: 258, stroke: "var(--ink)", "stroke-width": 3, "stroke-linecap": "round" }, svg);
    sv("line", { x1: 250, y1: 246, x2: 244, y2: 256, stroke: "var(--ink)", "stroke-width": 1.6 }, svg);

    /* the next station */
    const next = makeTower({ x: 690, y: 302, scale: .62 });
    svg.appendChild(next);
    setPose(next, 40, true);
    sv("text", { class: "map-inset-label", x: 628, y: 336, text: "NEXT STATION" }, svg);

    wrap.appendChild(svg);

    /* hotspots */
    const HOTS = [
      { n: 1, x: 27, y: 24, t: "The regulator", c: "The great beam of the mast — 4.60 m long, 0.35 m wide, painted with its edges blacked for contrast. It takes two working positions: horizontal or vertical. Everything a station says is built from those two baselines.", f: "REGULATOR · 4.60 × 0.35 m · 2 POSITIONS" },
      { n: 2, x: 35, y: 15, t: "The indicators", c: "Two smaller wings (2.00 × 0.30 m) mounted at the ends of the regulator. Each takes one of seven positions, and the pair never lies along the beam — that way every pose reads unambiguously at distance.", f: "2 × 0.30 m EACH · 7 POSITIONS → 2 × 7 × 7 = 98 POSES" },
      { n: 3, x: 21, y: 42, t: "Mast & pivot", c: "A mast about seven metres tall — painted sky blue so it disappeared against the horizon and the black arms seemed to float — carrying the regulator on a pivot geared to the mechanism below.", f: "MAST ≈ 7 m · SKY BLUE" },
      { n: 4, x: 27, y: 64, t: "Counterweights", c: "The 'ranges': weights driving clockwork that moved the arms. The operator did not muscle the beams; he set them, and the machinery balanced them against gravity and wind.", f: "GEARED DRIVE · WIND-TRIMMED BY LOUVRES" },
      { n: 5, x: 41, y: 72, t: "The manipulator", c: "A miniature working replica of the mast in the station house. The operator posed the small copy; gearing repeated it on the real beam. You worked the telegraph at desk scale.", f: "MINIATURE CONTROL · GEARED TO THE MAST" },
      { n: 6, x: 34, y: 52, t: "Two telescopes", c: "Fixed instruments of 30× to 65×, one aimed at each neighbouring tower. Reading meant deciding which of the neighbour's poses it was showing — quickly, and before it changed.", f: "MAGNIFICATION 30× – 65× · ONE PER NEIGHBOUR" },
      { n: 7, x: 27, y: 86, t: "The operators", c: "Originally two per tower — one reading, one manipulating — later often just one, on construction-worker wages, every day of the year. They held no code book: they relayed poses they could not read.", f: "1–2 OPERATORS · NO CODE BOOK · 365 DAYS" },
      { n: 8, x: 89, y: 58, t: "The next station", c: "Towers stood 5 to 15 km apart, each within telescopic sight of the next on both sides. A line was a relay race at the speed of daylight and human reaction.", f: "SPACING 5 – 15 KM · LINE OF SIGHT" }
    ];
    const wrapEl = wrap;
    HOTS.forEach(function (h) {
      const b = el("button", {
        class: "hotspot", type: "button",
        style: "left:" + h.x + "%;top:" + h.y + "%",
        "aria-label": h.n + ". " + h.t
      }, wrapEl);
      b.textContent = h.n;
      b.addEventListener("click", function () { showHot(h, b); });
    });
    const nav = $("#hs-nav"), copy = $("#hs-copy");
    HOTS.forEach(function (h) {
      const b = el("button", { type: "button" }, nav);
      b.textContent = h.n + " · " + h.t;
      b.addEventListener("click", function () { showHot(h, b); });
    });
    function showHot(h, btn) {
      $$(".hotspot", wrapEl).forEach(function (b) { b.classList.toggle("active", b === btn); });
      $$("button", nav).forEach(function (b) { b.classList.toggle("active", b === btn); });
      copy.innerHTML =
        '<h3 class="hsc-title"><span class="hsc-no">' + h.n + '</span>' + h.t + "</h3>" +
        "<p>" + h.c + "</p>" +
        '<div class="hsc-fact">' + h.f + "</div>";
      copy.classList.remove("rv"); copy.classList.add("on");
    }
    showHot(HOTS[0], $(".hotspot[aria-label^='1.']", wrapEl));
  }

  /* ============================================================
     COMPONENT C — THE 98-POSE CODE EXPLORER
     ============================================================ */
  function initCodeGrid() {
    const grid = $("#cg-grid");
    if (!grid) return;
    const detail = $("#cgd-note"), numEl = $("#cgd-num"), bigEl = $("#cgd-big");
    const cells = [];
    for (let i = 0; i < 98; i++) {
      const cell = el("button", { class: "cg-cell", type: "button", "aria-label": "Code " + (i + 1) + " of 98" }, grid);
      cell.appendChild(poseSVG(i, 44, 38, .38));
      el("span", { class: "cg-n", text: i + 1 }, cell);
      cell.addEventListener("click", function () { show(i); });
      cells.push(cell);
    }
    function show(i) {
      cells.forEach(function (c, j) { c.classList.toggle("active", j === i); });
      bigEl.innerHTML = "";
      bigEl.appendChild(poseSVG(i, 130, 118, .9));
      numEl.innerHTML = (i + 1) + "<small>of 98 poses</small>";
      const p = POSES[i];
      const isService = false; /* which poses carried the six service codes is era-dependent; we do not claim bindings */
      detail.innerHTML =
        "<p><b>Geometry.</b> Regulator " + (p.reg === 0 ? "horizontal" : "vertical") +
        " · right wing " + p.a + "° · left wing " + (p.b) + "° (angles measured from each wing's outward beam direction).</p>" +
        "<p>The numbering 1–98 is this atlas's own ordering. Historical manuals numbered configurations by code-book page, not by arm geometry; six of the 98 poses were reserved as service codes — repetition, waiting, absence, and the annulment that cancels the previous symbol.</p>" +
        '<span class="cgd-key">Click any cell · 98 poses · 92 usable for text</span>';
    }
    show(64);
  }

  /* ============================================================
     COMPONENT D — THE ENCODER
     ============================================================ */
  function initEncoder() {
    const input = $("#enc-input");
    if (!input) return;
    const towerHost = $("#enc-tower-svg");
    const stage = $("#enc-tower");
    const transcript = $("#enc-transcript");
    const relay = $("#enc-relay");
    const mSym = $("#enc-m-sym"), mTime = $("#enc-m-time"), clock = $("#enc-clock");
    const statusEl = $("#enc-status");
    const demoBtn = $("#enc-pace-demo"), trueBtn = $("#enc-pace-true");
    const sendBtn = $("#enc-send"), stopBtn = $("#enc-stop");

    const TOWER_COUNT = 15; /* Paris–Lille */
    let towerSvg = null, timers = [], running = false, t0 = 0, clockTimer = null, paceSec = REDUCED ? 0.12 : 0.62;

    function buildStage() {
      towerHost.innerHTML = "";
      const stageSvg = sv("svg", { viewBox: "0 0 190 230", "aria-hidden": "true", focusable: "false" });
      towerSvg = makeTower({ x: 95, y: 178, scale: 1.28, compact: false });
      stageSvg.appendChild(towerSvg);
      towerHost.appendChild(stageSvg);
      setPose(towerSvg, 64, true);
      stage.querySelector(".et-station").textContent = "STATION 1 — PARIS";
      /* relay strip */
      relay.innerHTML = "";
      for (let i = 0; i < TOWER_COUNT; i++) {
        if (i > 0) {
          const link = el("span", { class: "relay-link" }, relay);
          el("span", { class: "rl-fill" }, link);
        }
        const node = el("span", { class: "relay-node" + (i === 0 ? " done" : "") }, relay);
        const t = el("span", { class: "rn-t" }, node);
        if (i === 0) t.style.borderTop = "2px solid var(--ink)";
        if (i === TOWER_COUNT - 1) t.style.borderTop = "2px solid var(--red)";
        el("span", { class: "rn-l", text: i === 0 ? "PARIS" : i === TOWER_COUNT - 1 ? "LILLE" : "" + i }, node);
      }
    }

    function lettersOf(text) {
      return text.toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z]/g, "").split("");
    }
    function codeForLetter(i) { return ((i * 3 + 7) % 98); } /* 0-based pose index */

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function stopClock() { if (clockTimer) { clearInterval(clockTimer); clockTimer = null; } }

    function transmit() {
      const text = input.value || "";
      const letters = lettersOf(text);
      if (!letters.length) {
        statusEl.textContent = "Type something with letters in it — the machine has nothing to say.";
        return;
      }
      clearTimers(); stopClock();
      running = true;
      sendBtn.disabled = true;
      transcript.innerHTML = "";
      buildStage();
      $$(".relay-node", relay).forEach(function (n, i) { n.classList.toggle("done", i === 0); });
      $$(".relay-link", relay).forEach(function (n) { n.classList.remove("filled"); n.firstElementChild.style.transform = "scaleX(0)"; });

      const symbols = letters.map(function (ch, i) { return { ch: ch, code: codeForLetter(i), idx: i }; });
      const perSymbol = 20; /* seconds, modelled: 2–3 symbols/minute per station */
      const relayDelay = 5;  /* seconds per tower, modelled */
      const totalSim = symbols.length * perSymbol + TOWER_COUNT * relayDelay;
      const mm = Math.floor(totalSim / 60), ss = Math.round(totalSim % 60);
      mSym.textContent = symbols.length;
      mTime.textContent = mm + " min " + (ss < 10 ? "0" : "") + ss;

      const startTime = performance.now();
      clockTimer = setInterval(function () {
        const real = (performance.now() - startTime) / 1000;
        const sim = paceSec >= 10 ? real : real / paceSec * perSymbol;
        clock.textContent = Math.floor(sim / 60) + ":" + String(Math.floor(sim % 60)).padStart(2, "0");
        if (sim >= totalSim) { clock.textContent = "DONE · " + mm + ":" + String(ss).padStart(2, "0"); stopClock(); }
      }, 100);

      const schedule = function (fn, at) { timers.push(setTimeout(fn, Math.max(0, at))); };
      let cursor = 0;
      symbols.forEach(function (sym, i) {
        const at = i * paceSec;
        schedule(function () {
          if (!running) return;
          setPose(towerSvg, sym.code);
          stage.querySelector(".et-station").textContent = "STATION 1 — PARIS · SYMBOL " + (i + 1) + " OF " + symbols.length;
          $$(".relay-node", relay).forEach(function (n) { n.classList.remove("live"); });
          $$(".relay-node", relay)[0].classList.add("done");
          const chip = el("span", { class: "chip current" }, transcript);
          chip.innerHTML = '<span class="chip-idx">' + (i + 1) + "</span>" + (sym.code + 1);
          const prev = chip.previousElementSibling;
          if (prev) { prev.classList.remove("current"); prev.classList.add("done"); }
        }, at * 1000);
        /* propagation down the line */
        for (let k = 1; k < TOWER_COUNT; k++) {
          const kat = (at + k * paceSec * (relayDelay / perSymbol)) * 1000;
          schedule(function () {
            if (!running) return;
            const nodes = $$(".relay-node", relay);
            if (nodes[k]) { nodes[k].classList.add("done"); if (k === 1) nodes[k].classList.add("live"); nodes[k - 1] && nodes[k - 1].classList.remove("live"); }
            const links = $$(".relay-link", relay);
            if (links[k - 1]) { links[k - 1].classList.add("filled"); links[k - 1].firstElementChild.style.transform = "scaleX(1)"; }
            if (k === TOWER_COUNT - 1) {
              nodes.forEach(function (n) { n.classList.remove("live"); });
              stage.querySelector(".et-station").textContent = "DELIVERED — LILLE · STATION " + TOWER_COUNT;
            }
          }, kat);
        }
        cursor = at;
      });
      schedule(function () {
        if (!running) return;
        running = false; sendBtn.disabled = false;
        statusEl.innerHTML = "Delivered. " + symbols.length + " symbols over " + TOWER_COUNT + " towers · ≈" + mm + " min " + (ss < 10 ? "0" : "") + ss + " (modelled at 20 s per symbol, 5 s per relay) · recorded performance on this line: a short dispatch in under 9 minutes.";
      }, (cursor + TOWER_COUNT * paceSec * (relayDelay / perSymbol)) * 1000 + 400);
    }
    function stopAll() {
      running = false; clearTimers(); stopClock();
      sendBtn.disabled = false;
      statusEl.textContent = "Transmission interrupted. The line is yours again.";
      clock.textContent = "0:00:00";
    }
    sendBtn.addEventListener("click", transmit);
    stopBtn.addEventListener("click", stopAll);
    demoBtn.addEventListener("click", function () { paceSec = REDUCED ? 0.12 : 0.62; demoBtn.setAttribute("aria-pressed", "true"); trueBtn.setAttribute("aria-pressed", "false"); statusEl.textContent = "Demonstration pace — about one symbol every 0.6 s."; });
    trueBtn.addEventListener("click", function () { paceSec = 20; demoBtn.setAttribute("aria-pressed", "false"); trueBtn.setAttribute("aria-pressed", "true"); statusEl.textContent = "True pace — twenty seconds of daylight per symbol, as recorded. Patience is part of the lesson."; });
    demoBtn.setAttribute("aria-pressed", "true"); trueBtn.setAttribute("aria-pressed", "false");
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") transmit(); });
    $$(".enc-presets button").forEach(function (b) {
      b.addEventListener("click", function () { input.value = b.textContent; transmit(); });
    });
    buildStage();
    const letters0 = lettersOf("Condé est repris");
    mSym.textContent = letters0.length;
    const total0 = letters0.length * 20 + TOWER_COUNT * 5;
    mTime.textContent = Math.floor(total0 / 60) + " min " + String(Math.round(total0 % 60)).padStart(2, "0");
  }

  /* ============================================================
     COMPONENT E — THE FRAUD, RECONSTRUCTED
     ============================================================ */
  function initFraud() {
    const host = $("#fraud-stations");
    if (!host) return;
    let corrupt = true, running = false, timers = [];
    const towers = [];
    const POSES_FRAUD = [30, 63, 12, 77];
    const OFFICIAL = [134, 87, 210, 45];

    Array.prototype.forEach.call(host.children, function (col, i) {
      const fsvg = sv("svg", { viewBox: "0 0 110 132", "aria-hidden": "true", focusable: "false" });
      const t = makeTower({ x: 55, y: 88, scale: .95 });
      fsvg.appendChild(t);
      col.querySelector(".fs-tower").appendChild(fsvg);
      setPose(t, POSES_FRAUD[i], true);
      towers.push(t);
    });

    const officialEl = $("#fraud-official"), witnessEl = $("#fraud-witness");
    const toggleBtn = $("#fraud-toggle"), replayBtn = $("#fraud-replay");
    const wires = $$(".fraud-wire");

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function chipHTML(code, cls) {
      return '<span class="fr-chip ' + (cls || "") + '">' + code + "</span>";
    }
    function run() {
      clearTimers();
      running = true;
      officialEl.innerHTML = '<div class="fr-title">OFFICIAL TRANSCRIPT · BORDEAUX</div><div class="fr-body"><p class="fr-stream" id="fo-stream"></p></div>';
      witnessEl.innerHTML = '<div class="fr-title">THE COMPANION\'S NOTEBOOK · TELESCOPE, VINEYARD WALL</div><div class="fr-body"><p class="fr-stream" id="fw-stream"></p></div>';
      const fo = $("#fo-stream"), fw = $("#fw-stream");
      const sched = function (fn, at) { timers.push(setTimeout(fn, at)); };
      sched(function () { towers[0].classList.add("live-pose"); }, 0);
      /* chip 1 travels */
      sched(function () { wires[0].classList.add("transit"); }, 100);
      sched(function () { wires[0].classList.remove("transit"); wires[1].classList.add("transit"); fo.innerHTML += chipHTML(OFFICIAL[0]); }, 1300);
      if (corrupt) {
        sched(function () {
          host.children[1].classList.add("compromised");
          fw.innerHTML = "<p><b>" + chipHTML("40 · HAUSSE", "hidden") + "</b> — the inserted symbol: yesterday the rente <b>rose</b>.</p>";
        }, 1900);
        sched(function () { fw.innerHTML += "<p>Followed by " + chipHTML("ANNUL", "cancel") + " — the cancellation code. Officially, symbol №40 never happened.</p>"; }, 2600);
      } else {
        sched(function () { host.children[1].classList.remove("compromised"); }, 0);
        sched(function () { fw.innerHTML = "<p>Nothing out of the ordinary. The line is dull. The parcels from Paris keep arriving anyway.</p>"; }, 1900);
      }
      sched(function () { wires[1].classList.remove("transit"); fo.innerHTML += chipHTML(OFFICIAL[1]); }, 2700);
      sched(function () { fo.innerHTML += chipHTML(OFFICIAL[2]); }, 3400);
      if (corrupt) {
        sched(function () {
          fo.innerHTML += chipHTML(OFFICIAL[3]) + ' <span class="fr-chip cancel">ANNUL</span>';
        }, 4100);
      } else {
        sched(function () { fo.innerHTML += chipHTML(OFFICIAL[3]); }, 4100);
      }
      sched(function () {
        wires.forEach(function (w) { w.classList.remove("transit"); });
        towers.forEach(function (t) { t.classList.remove("live-pose"); });
        running = false;
        if (corrupt) {
          officialEl.innerHTML += '<div class="fr-body" style="margin-top:.6rem"><b>The message is correct.</b> The annulment erased №40 from every record. The channel was inside the message, invisible to the code book.</div>';
        } else {
          officialEl.innerHTML += '<div class="fr-body" style="margin-top:.6rem"><b>A clean relay.</b> Toggle <i>corrupt the line</i> to watch the 1834 version of this journey.</div>';
        }
      }, 5000);
    }
    toggleBtn.addEventListener("click", function () {
      corrupt = !corrupt;
      toggleBtn.setAttribute("aria-pressed", String(corrupt));
      toggleBtn.textContent = corrupt ? "Corrupt the line · ON" : "Corrupt the line · OFF";
      if (!running) run();
    });
    replayBtn.addEventListener("click", run);
    toggleBtn.setAttribute("aria-pressed", "true");
    toggleBtn.textContent = "Corrupt the line · ON";
    run();
  }

  /* ============================================================
     COMPONENT F — THE OPERATOR'S EXAM
     ============================================================ */
  function initQuiz() {
    const host = $("#quiz-body");
    if (!host) return;
    let idx = 0, score = 0, answered = false;
    const progress = $("#quiz-progress");

    function renderProgress() {
      progress.innerHTML = "";
      QUIZ.forEach(function (_, i) {
        const seg = el("span", { class: "qp-seg" + (i < idx ? " done" : i === idx ? " cur" : "") }, progress);
        seg.setAttribute("aria-hidden", "true");
      });
    }
    function render() {
      renderProgress();
      if (idx >= QUIZ.length) {
        const grade = score === QUIZ.length ? "POSTMASTER" : score >= 4 ? "STATION SUPERINTENDENT" : score >= 2 ? "OPERATOR, SECOND CLASS" : "CANDIDATE — KEEP YOUR TELESCOPE CLEAN";
        host.innerHTML =
          '<div class="quiz-done"><p class="qd-grade">' + grade + "</p>" +
          '<h3 class="qd-title">' + score + " of " + QUIZ.length + ".</h3>" +
          "<p>" + (score === QUIZ.length
            ? "A flawless watch. The Convention would have trusted you with the Rhine frontier."
            : score >= 4
              ? "Solid watch. You read the line well enough to be trusted with the night lanterns."
              : "The tower is yours anyway — the pay was the same whatever you knew. Read the chapters again and take the exam once more.") +
          "</p>" +
          '<div class="quiz-foot"><button class="btn" type="button" id="quiz-retry">Retake the exam</button></div></div>';
        $("#quiz-retry").addEventListener("click", function () { idx = 0; score = 0; render(); });
        return;
      }
      const Q = QUIZ[idx];
      answered = false;
      host.innerHTML =
        '<div class="quiz-qno">QUESTION ' + (idx + 1) + " OF " + QUIZ.length + "</div>" +
        (typeof Q.render === "number"
          ? '<div class="quiz-rendered"><span class="qr-svg"></span><span class="qr-hint">A tower in the field. Read its arms.</span></div>'
          : "") +
        '<p class="quiz-q">' + Q.q + '</p><div class="quiz-opts" role="group" aria-label="Answer options"></div><div class="quiz-explain" hidden></div>' +
        '<div class="quiz-foot"><span class="quiz-score">SCORE ' + score + " / " + QUIZ.length + "</span>" +
        '<button class="btn primary" type="button" id="quiz-next" hidden>Next question →</button></div>';
      if (typeof Q.render === "number") {
        $(".qr-svg", host).appendChild(poseSVG(Q.render, 130, 120, .9));
      }
      const optsEl = $(".quiz-opts", host);
      Q.opts.forEach(function (opt, i) {
        const b = el("button", { class: "opt", type: "button" }, optsEl);
        b.innerHTML = '<span class="opt-key">' + "ABCD"[i] + "</span><span class=\"opt-text\">" + opt + "</span>";
        b.addEventListener("click", function () { answer(i, b); });
      });
      function answer(i, btn) {
        if (answered) return;
        answered = true;
        const ok = i === Q.correct;
        if (ok) score++;
        $$("button.opt", optsEl).forEach(function (b, j) {
          b.disabled = true;
          if (j === Q.correct) b.classList.add("correct");
          else if (b === btn) b.classList.add("wrong");
        });
        const ex = $(".quiz-explain", host);
        ex.hidden = false;
        ex.innerHTML = "<b>" + (ok ? "Correct. " : "Not quite. ") + "</b>" + Q.why;
        const nextB = $("#quiz-next");
        nextB.hidden = false;
        nextB.focus();
        $(".quiz-score", host).textContent = "SCORE " + score + " / " + QUIZ.length;
      }
      $("#quiz-next").addEventListener("click", function () { idx++; render(); });
    }
    render();
  }

  /* ============================================================
     GLOSSARY — inline terms + popover
     ============================================================ */
  function initGlossary() {
    let pop = null, openBtn = null;
    function close() {
      if (pop) { pop.remove(); pop = null; }
      if (openBtn) { openBtn.classList.remove("open"); openBtn.setAttribute("aria-expanded", "false"); openBtn = null; }
    }
    document.addEventListener("click", function (e) {
      const t = e.target.closest(".term");
      if (!t) { if (pop && !e.target.closest(".termpop")) close(); return; }
      e.preventDefault();
      const key = t.getAttribute("data-term");
      const def = GLOSSARY[key];
      if (!def) return;
      if (openBtn === t) { close(); return; }
      close();
      openBtn = t; t.classList.add("open"); t.setAttribute("aria-expanded", "true");
      pop = el("div", { class: "termpop", role: "dialog", "aria-label": key });
      pop.innerHTML =
        '<div class="tp-word">' + key.toUpperCase() + ' <span class="tp-tag">glossary</span></div>' +
        "<div>" + def + "</div>" +
        '<div style="margin-top:.5rem"><a href="#glossary" class="tlink" style="color:var(--red-deep)">all terms ↓</a></div>';
      document.body.appendChild(pop);
      const r = t.getBoundingClientRect();
      pop.style.left = "0px"; pop.style.top = "0px";
      const pr = pop.getBoundingClientRect();
      let x = r.left + window.scrollX + r.width / 2 - pr.width / 2;
      x = clamp(x, window.scrollX + 12, window.scrollX + document.documentElement.clientWidth - pr.width - 12);
      let y = r.bottom + window.scrollY + 10;
      if (r.bottom + pr.height + 20 > window.innerHeight) y = r.top + window.scrollY - pr.height - 10;
      pop.style.left = x + "px"; pop.style.top = y + "px";
      const arrow = el("span", { class: "termpop-pop-arrow" }, pop);
      arrow.style.left = (r.left + window.scrollX + r.width / 2 - x - 5) + "px";
      arrow.style.top = (y > r.top + window.scrollY ? pr.height - 5 : -5) + "px";
      if (y > r.top + window.scrollY) arrow.style.transform = "rotate(225deg)";
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    window.addEventListener("scroll", function () { if (pop) close(); }, { passive: true });
  }

  /* ============================================================
     NAVIGATION — rail, scrollspy, contents, shortcuts, reveals
     ============================================================ */
  function initNav() {
    const railLinks = $$(".rail-link");
    const tbChapter = $("#tb-chapter");
    const sections = $$("[data-chapter]");
    function setActive(id) {
      railLinks.forEach(function (a) {
        const item = a.closest(".rail-item");
        item.classList.toggle("active", a.getAttribute("href") === "#" + id);
        if (item.classList.contains("active")) {
          const s = $("[data-chapter-title]", item);
          if (tbChapter && s) tbChapter.textContent = s.getAttribute("data-chapter-title");
        }
      });
    }
    if ("IntersectionObserver" in window) {
      const spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
      }, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });
      sections.forEach(function (s) { spy.observe(s); });
    }

    /* reveals: IO is the fast path in real browsers; a timestamp-throttled
       scroll handler and a slow interval are the deterministic backstops */
    const revealCheck = function () {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      $$(".rv:not(.on)").forEach(function (n) {
        const r = n.getBoundingClientRect();
        if (r.top < vh * 0.94 && r.bottom > 40) n.classList.add("on");
      });
    };
    let lastRev = 0;
    const revOnScroll = function () {
      const now = Date.now();
      if (now - lastRev < 120) return;
      lastRev = now;
      revealCheck();
    };
    window.addEventListener("scroll", revOnScroll, { passive: true });
    window.addEventListener("resize", revOnScroll);
    window.addEventListener("wheel", revOnScroll, { passive: true });
    window.addEventListener("touchmove", revOnScroll, { passive: true });
    if ("IntersectionObserver" in window) {
      const rev = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("on"); rev.unobserve(en.target); }
        });
      }, { threshold: .06, rootMargin: "0px 0px -4% 0px" });
      $$(".rv").forEach(function (n) { rev.observe(n); });
    }
    revealCheck();
    window.setInterval(revealCheck, 400);

    /* rail + TOC links: smooth scroll (reduced-motion aware via CSS) */
    function jump(id) {
      const s = document.getElementById(id);
      if (s) s.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
      window.setTimeout(revealCheck, REDUCED ? 60 : 700);
    }
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        const id = a.getAttribute("href").slice(1);
        if (id && document.getElementById(id)) { e.preventDefault(); jump(id); closeOverlay(); }
      });
    });

    /* overlays */
    function openOverlay(id) {
      const ov = $("#" + id);
      if (!ov) return;
      ov.classList.add("open");
      const f = ov.querySelector("button, a, input");
      if (f) f.focus();
      document.body.style.overflow = "hidden";
    }
    function closeOverlay() {
      $$(".overlay.open").forEach(function (o) { o.classList.remove("open"); });
      document.body.style.overflow = "";
    }
    $$("[data-open-overlay]").forEach(function (b) {
      b.addEventListener("click", function () { openOverlay(b.getAttribute("data-open-overlay")); });
    });
    $$("[data-close-overlay]").forEach(function (b) {
      b.addEventListener("click", closeOverlay);
    });
    $$(".overlay").forEach(function (ov) {
      ov.addEventListener("click", function (e) { if (e.target === ov) closeOverlay(); });
    });

    /* keyboard shortcuts */
    document.addEventListener("keydown", function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target && e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ($(".overlay.open")) { if (e.key === "Escape") closeOverlay(); return; }
      if (e.key === "j" || e.key === "J") { stepChapter(1); }
      else if (e.key === "k" || e.key === "K") { stepChapter(-1); }
      else if (e.key === "c" || e.key === "C") { openOverlay("overlay-toc"); }
      else if (e.key === "?") { openOverlay("overlay-keys"); }
    });
    function stepChapter(dir) {
      let cur = 0;
      sections.forEach(function (s, i) { if (s.getBoundingClientRect().top < window.innerHeight * .45) cur = i; });
      const target = clamp(cur + dir, 0, sections.length - 1);
      jump(sections[target].id);
    }
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    try { buildHero(); } catch (err) { console.error("[lines-of-sight] hero:", err); }
    [["atlas", initAtlas], ["anatomy", initAnatomy], ["codegrid", initCodeGrid],
     ["encoder", initEncoder], ["fraud", initFraud], ["quiz", initQuiz], ["glossary", initGlossary], ["nav", initNav]]
      .forEach(function (pair) {
        try { pair[1](); } catch (err) { console.error("[lines-of-sight] " + pair[0] + ":", err); }
      });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
