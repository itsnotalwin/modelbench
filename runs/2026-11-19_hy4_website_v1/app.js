(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pad2 = (value) => String(value).padStart(2, "0");
  const pad3 = (value) => String(value).padStart(3, "0");
  const root = document.documentElement;

  function channel(variable, fallback) {
    const raw = getComputedStyle(root).getPropertyValue(variable);
    const parts = raw.split(",").map((part) => Number.parseInt(part.trim(), 10));
    return parts.length >= 3 && parts.every((part) => Number.isFinite(part)) ? parts : [fallback, fallback, fallback];
  }

  function readPalette() {
    return { ink: channel("--ink-rgb", 17), paper: channel("--paper-rgb", 244) };
  }

  // Every canvas colour is built from one repeated channel, so neutrality is structural.
  const solid = (rgb) => `rgb(${rgb[0]}, ${rgb[0]}, ${rgb[0]})`;
  const neutral = (rgb, alpha) => `rgba(${rgb[0]}, ${rgb[0]}, ${rgb[0]}, ${clamp(alpha, 0, 1)})`;

  function sizeCanvas(canvas, ctx) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || 300));
    const height = Math.max(1, Math.round(rect.height || 300));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: width, h: height };
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  /* Theme ---------------------------------------------------------------- */
  const themeToggle = $("#themeToggle");
  const themeLabel = $("#themeLabel");
  const themeMeta = $('meta[name="theme-color"]');
  const themeKey = "grey-matter-theme";
  let theme = "normal";
  try {
    if (localStorage.getItem(themeKey) === "inverse") theme = "inverse";
  } catch (error) {
    theme = "normal";
  }

  function applyTheme(next, persist) {
    theme = next;
    if (next === "inverse") root.setAttribute("data-theme", "inverse");
    else root.removeAttribute("data-theme");
    const inverted = next === "inverse";
    themeLabel.textContent = inverted ? "RESTORE" : "INVERT";
    themeToggle.setAttribute("aria-label", inverted ? "Restore the paper edition" : "Invert the edition");
    if (themeMeta) themeMeta.setAttribute("content", inverted ? "#111111" : "#f4f4f4");
    if (persist) {
      try { localStorage.setItem(themeKey, next); } catch (error) { /* Storage can be unavailable on file URLs. */ }
    }
    document.dispatchEvent(new Event("grey:themechange"));
  }

  applyTheme(theme, false);
  themeToggle.addEventListener("click", () => applyTheme(theme === "inverse" ? "normal" : "inverse", true));

  /* Reading progress and active section ---------------------------------- */
  const progressBar = $("#progressBar");
  const navLinks = $$('.masthead__nav a[href^="#"]');
  const navSections = navLinks.map((link) => document.querySelector(link.getAttribute("href")));
  let scrollQueued = false;

  function updateScrollUI() {
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progressBar.style.transform = `scaleX(${clamp(window.scrollY / scrollable, 0, 1)})`;
    const marker = Math.min(220, window.innerHeight * 0.28);
    let activeHref = "";
    navSections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= marker) activeHref = navLinks[index].getAttribute("href");
    });
    navLinks.forEach((link) => {
      if (link.getAttribute("href") === activeHref) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    scrollQueued = false;
  }

  function queueScrollUI() {
    if (!scrollQueued) {
      scrollQueued = true;
      requestAnimationFrame(updateScrollUI);
    }
  }

  window.addEventListener("scroll", queueScrollUI, { passive: true });
  window.addEventListener("resize", queueScrollUI);
  updateScrollUI();

  /* Calibration instrument ------------------------------------------------ */
  const range = $("#toneRange");
  const fixedField = $("#fixedField");
  const adjustableField = $("#adjustableField");
  const toneValue = $("#toneValue");
  const fixedValue = $("#fixedValue");
  const sealButton = $("#sealButton");
  const newButton = $("#newButton");
  const result = $("#result");
  const trialCount = $("#trialCount");
  const bestDelta = $("#bestDelta");

  const grey = (value) => `rgb(${value}, ${value}, ${value})`;
  const foreground = (value) => value < 128 ? "#f4f4f4" : "#111111";
  let target = 128;
  let trial = 1;
  let best = null;
  let sealed = false;

  function updateRange() {
    const value = Number(range.value);
    adjustableField.style.backgroundColor = grey(value);
    adjustableField.style.setProperty("--field-foreground", foreground(value));
    adjustableField.setAttribute("aria-label", `Adjustable field B, value ${value} of 255`);
    toneValue.textContent = `${pad3(value)} / 255`;
    range.setAttribute("aria-valuetext", `${value} of 255`);
  }

  function newReference() {
    let candidate = target;
    while (candidate === target) candidate = 42 + Math.floor(Math.random() * 166);
    target = candidate;
    sealed = false;
    const direction = target > 128 ? -1 : 1;
    const offset = 24 + Math.floor(Math.random() * 48);
    range.value = String(clamp(target + direction * offset, 0, 255));
    updateRange();
    fixedField.style.backgroundColor = grey(target);
    fixedField.style.setProperty("--field-foreground", foreground(target));
    fixedField.setAttribute("aria-label", "Reference field A, value hidden until the match is sealed");
    fixedValue.hidden = true;
    fixedValue.textContent = `REFERENCE ${pad3(target)} / 255`;
    sealButton.disabled = false;
    sealButton.textContent = "Seal the match";
    result.textContent = "The instrument is waiting. Move field B until the seam disappears.";
    trialCount.textContent = `TRIAL ${pad2(trial)}`;
  }

  function sealMatch() {
    if (sealed) return;
    const value = Number(range.value);
    const delta = Math.abs(value - target);
    sealed = true;
    fixedValue.hidden = false;
    fixedField.setAttribute("aria-label", `Reference field A, value ${target} of 255`);
    sealButton.disabled = true;
    sealButton.textContent = "Match sealed";
    let verdict;
    if (delta === 0) verdict = "Exact. For a moment there was only one field.";
    else if (delta <= 2) verdict = "Almost invisible; only a level or two of disagreement.";
    else if (delta <= 8) verdict = "A narrow seam, felt more than seen.";
    else if (delta <= 24) verdict = "The boundary is still doing most of the work.";
    else verdict = "The two fields are having separate conversations.";
    result.textContent = `Sealed at ${pad3(value)}. The reference was ${pad3(target)}. Difference: ${delta} of 255. ${verdict}`;
    best = best === null ? delta : Math.min(best, delta);
    bestDelta.textContent = `BEST Δ ${pad2(best)}`;
  }

  range.addEventListener("input", () => {
    updateRange();
    if (sealed) {
      sealed = false;
      sealButton.disabled = false;
      sealButton.textContent = "Seal again";
      result.textContent = "The reading changed. Seal again when the seam disappears.";
    }
  });
  sealButton.addEventListener("click", sealMatch);
  newButton.addEventListener("click", () => {
    trial += 1;
    newReference();
  });
  newReference();

  /* Named grey register --------------------------------------------------- */
  const swatches = $$(".swatch");
  const swatchGroup = $("#swatches");
  const tonePreview = $("#tonePreview");

  function hexFor(value) {
    const part = value.toString(16).padStart(2, "0").toUpperCase();
    return `#${part}${part}${part}`;
  }

  function selectTone(index) {
    const button = swatches[index];
    if (!button) return;
    const value = Number(button.dataset.value);
    const name = button.dataset.name;
    const hex = hexFor(value);
    swatches.forEach((swatch, position) => swatch.setAttribute("aria-pressed", String(position === index)));
    $("#toneIndex").textContent = `${pad2(index + 1)} / ${pad2(swatches.length)}`;
    $("#toneName").textContent = name;
    $("#toneCopy").textContent = button.dataset.copy;
    $("#toneHex").textContent = hex;
    $("#toneLuma").textContent = `${Math.round((value / 255) * 100)}%`;
    tonePreview.style.backgroundColor = hex;
    tonePreview.setAttribute("aria-label", `Preview of ${name}, ${hex}`);
  }

  swatches.forEach((button, index) => button.addEventListener("click", () => selectTone(index)));
  swatchGroup.addEventListener("keydown", (event) => {
    const current = swatches.indexOf(document.activeElement);
    if (current < 0) return;
    const last = swatches.length - 1;
    let next = null;
    if (event.key === "ArrowRight") next = (current + 1) % swatches.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + swatches.length) % swatches.length;
    else if (event.key === "ArrowDown") next = clamp(current + 3, 0, last);
    else if (event.key === "ArrowUp") next = clamp(current - 3, 0, last);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next !== null) {
      event.preventDefault();
      swatches[next].focus();
      selectTone(next);
    }
  });
  selectTone(Math.max(0, swatches.findIndex((button) => button.getAttribute("aria-pressed") === "true")));

  /* Procedural plates ----------------------------------------------------- */
  const plateCanvas = $("#plateCanvas");
  const plateCtx = plateCanvas ? plateCanvas.getContext("2d") : null;
  const plateViewer = $("#plateViewer");
  const plateTicks = $("#plateTicks");

  function drawHalftone(ctx, w, h, pal) {
    ctx.fillStyle = solid(pal.paper);
    ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5;
    const cy = h * 0.47;
    const r = Math.min(w, h) * 0.38;
    const gap = Math.max(7, Math.min(w, h) / 58);
    const glow = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.04, cx, cy, r * 1.2);
    glow.addColorStop(0, neutral(pal.ink, 0.2));
    glow.addColorStop(0.55, neutral(pal.ink, 0.045));
    glow.addColorStop(1, neutral(pal.ink, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    for (let y = gap * 0.6; y < h; y += gap) {
      for (let x = gap * 0.6; x < w; x += gap) {
        const dx = (x - cx) / r;
        const dy = (y - cy) / r;
        const distance = Math.hypot(dx, dy);
        if (distance > 1.04) continue;
        const falloff = clamp(1 - distance, 0, 1);
        const light = clamp(0.92 - (dx * 0.32 + dy * 0.48), 0, 1);
        const texture = 0.5 + 0.5 * Math.sin(x * 0.055 + y * 0.041);
        const shade = clamp(falloff * (0.55 + light * 0.45) + texture * 0.08, 0, 1);
        ctx.fillStyle = neutral(pal.ink, 0.1 + shade * 0.82);
        ctx.beginPath();
        ctx.arc(x, y, gap * (0.045 + shade * 0.4), 0, TAU);
        ctx.fill();
      }
    }
    ctx.strokeStyle = neutral(pal.ink, 0.42);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = neutral(pal.ink, 0.7);
    for (let i = 0; i < 9; i += 1) {
      const x = w * 0.12 + (w * 0.76 * i) / 8;
      ctx.fillRect(x, h - 22, 1, i % 2 === 0 ? 10 : 5);
    }
  }

  function drawMoire(ctx, w, h, pal) {
    ctx.fillStyle = solid(pal.paper);
    ctx.fillRect(0, 0, w, h);
    const maxRadius = Math.hypot(w, h) * 0.7;
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 110; i += 1) {
      const radius = i * Math.max(4.5, Math.min(w, h) / 80);
      if (radius > maxRadius) break;
      ctx.strokeStyle = neutral(pal.ink, 0.14);
      ctx.beginPath();
      ctx.arc(w * 0.42, h * 0.45, radius, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = neutral(pal.ink, 0.085);
      ctx.beginPath();
      ctx.arc(w * 0.59, h * 0.55, radius * 1.018, 0, TAU);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 5) {
      ctx.strokeStyle = neutral(pal.ink, 0.035);
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }
    ctx.fillStyle = neutral(pal.ink, 0.82);
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.055, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = neutral(pal.paper, 0.65);
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.08, 0, TAU);
    ctx.stroke();
  }

  function drawContours(ctx, w, h, pal) {
    ctx.fillStyle = solid(pal.paper);
    ctx.fillRect(0, 0, w, h);
    const lines = 78;
    for (let i = 0; i < lines; i += 1) {
      const base = ((i + 0.5) * h) / lines;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const pressure = Math.sin((x / w) * Math.PI * 2) * 22;
        const y = base + pressure + Math.sin(x * 0.011 + i * 0.17) * 14 + Math.sin(x * 0.027 - i * 0.09) * 7;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = neutral(pal.ink, 0.09 + (i / lines) * 0.28);
      ctx.lineWidth = i % 7 === 0 ? 1.6 : 0.8;
      ctx.stroke();
    }
    ctx.strokeStyle = neutral(pal.ink, 0.55);
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i += 1) {
      const y = (h * i) / 9;
      ctx.beginPath();
      ctx.moveTo(w - 22, y);
      ctx.lineTo(w - (i % 2 === 0 ? 8 : 15), y);
      ctx.stroke();
    }
  }

  function drawRain(ctx, w, h, pal) {
    ctx.fillStyle = solid(pal.ink);
    ctx.fillRect(0, 0, w, h);
    const wash = ctx.createLinearGradient(0, 0, w, h);
    wash.addColorStop(0, neutral(pal.paper, 0.2));
    wash.addColorStop(0.48, neutral(pal.paper, 0.02));
    wash.addColorStop(1, neutral(pal.paper, 0.13));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    const random = seededRandom(20261119);
    for (let i = 0; i < 460; i += 1) {
      const x = random() * w;
      const y = random() * h;
      const length = 10 + random() * h * 0.48;
      const width = 0.5 + random() * 2.2;
      ctx.strokeStyle = neutral(pal.paper, 0.07 + random() * 0.52);
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (random() - 0.5) * 3, Math.min(h + 20, y + length));
      ctx.stroke();
    }
    for (let i = 0; i < 24; i += 1) {
      ctx.fillStyle = neutral(pal.paper, 0.025 + (i % 4) * 0.012);
      ctx.fillRect(0, h * 0.62 + i * 4, w, 1);
    }
  }

  function drawFolds(ctx, w, h, pal) {
    ctx.fillStyle = solid(pal.paper);
    ctx.fillRect(0, 0, w, h);
    const columns = 6;
    const rows = 8;
    const cellWidth = w / columns;
    const cellHeight = h / rows;
    const random = seededRandom(7331);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = column * cellWidth;
        const y = row * cellHeight;
        const first = 0.04 + random() * 0.62;
        const second = 0.04 + random() * 0.62;
        ctx.fillStyle = neutral(pal.ink, first);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + cellWidth, y);
        ctx.lineTo(x, y + cellHeight);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = neutral(pal.ink, second);
        ctx.beginPath();
        ctx.moveTo(x + cellWidth, y);
        ctx.lineTo(x + cellWidth, y + cellHeight);
        ctx.lineTo(x, y + cellHeight);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = neutral(pal.ink, 0.2);
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cellWidth - 1, cellHeight - 1);
      }
    }
    const fold = ctx.createLinearGradient(0, 0, w, h);
    fold.addColorStop(0, neutral(pal.paper, 0.28));
    fold.addColorStop(0.5, neutral(pal.ink, 0.02));
    fold.addColorStop(1, neutral(pal.ink, 0.25));
    ctx.fillStyle = fold;
    ctx.fillRect(0, 0, w, h);
  }

  function drawEclipse(ctx, w, h, pal) {
    ctx.fillStyle = solid(pal.paper);
    ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const r = Math.min(w, h) * 0.34;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 180; i += 1) {
      const angle = (i / 180) * TAU;
      const inner = r * 1.03;
      const outer = r * (1.16 + (i % 7) * 0.018);
      ctx.strokeStyle = neutral(pal.ink, 0.035 + (i % 3) * 0.025);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }
    for (let i = 1; i <= 7; i += 1) {
      ctx.strokeStyle = neutral(pal.ink, 0.12);
      ctx.beginPath();
      ctx.arc(cx, cy, r + i * 9, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = solid(pal.ink);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.clip();
    const random = seededRandom(40404);
    for (let i = 0; i < 420; i += 1) {
      const x = cx + (random() * 2 - 1) * r;
      const y = cy + (random() * 2 - 1) * r;
      ctx.fillStyle = neutral(pal.paper, 0.05 + random() * 0.38);
      ctx.beginPath();
      ctx.arc(x, y, 0.4 + random() * 1.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = solid(pal.paper);
    ctx.beginPath();
    ctx.arc(cx + r * 0.31, cy - r * 0.12, r * 0.92, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = neutral(pal.ink, 0.65);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
  }

  const plates = [
    {
      title: "Halftone Sun",
      description: "A sphere built only from decisions about how large a dot should be. The eye supplies the curve.",
      method: "Variable-radius dots",
      range: "4–92% ink",
      state: "Drawn fresh at every resize",
      draw: drawHalftone
    },
    {
      title: "Interference Study",
      description: "Two families of rings disagree by a few pixels. Their argument becomes a third image.",
      method: "Offset circle fields",
      range: "8–32% ink",
      state: "Two centres, one field",
      draw: drawMoire
    },
    {
      title: "Contour Weather",
      description: "Parallel lines bend around an invisible pressure system; topography without a map.",
      method: "Summed sine paths",
      range: "9–37% ink",
      state: "Seventy-eight ruled lines",
      draw: drawContours
    },
    {
      title: "Vertical Rain",
      description: "Light leaks through a dark field in unequal lengths. Density, not hue, carries the weather.",
      method: "Seeded vertical strokes",
      range: "2–88% paper",
      state: "Fixed seed, repeatable storm",
      draw: drawRain
    },
    {
      title: "Folded Sheet",
      description: "A plane divided into triangles; each facet is a different answer to the same light.",
      method: "Faceted flat fills",
      range: "4–66% ink",
      state: "Six by eight facets",
      draw: drawFolds
    },
    {
      title: "Eclipse, Twice",
      description: "One disk subtracts another. What remains is not darkness but a precise edge.",
      method: "Clip, subtract, stipple",
      range: "0–100% ink",
      state: "Rays, disk, crescent",
      draw: drawEclipse
    }
  ];

  let plateIndex = 0;
  const tickElements = plates.map(() => {
    const tick = document.createElement("span");
    plateTicks.appendChild(tick);
    return tick;
  });

  function drawPlateFrame(ctx, w, h, pal) {
    ctx.strokeStyle = neutral(pal.ink, 0.55);
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    const marks = [[16, 16], [w - 16, 16], [16, h - 16], [w - 16, h - 16]];
    ctx.fillStyle = neutral(pal.ink, 0.7);
    marks.forEach(([x, y]) => {
      ctx.fillRect(x - 5, y, 10, 1);
      ctx.fillRect(x, y - 5, 1, 10);
    });
  }

  function drawCurrentPlate() {
    if (!plateCtx) return;
    const size = sizeCanvas(plateCanvas, plateCtx);
    const pal = readPalette();
    plateCtx.clearRect(0, 0, size.w, size.h);
    plates[plateIndex].draw(plateCtx, size.w, size.h, pal);
    drawPlateFrame(plateCtx, size.w, size.h, pal);
  }

  function setPlate(index) {
    plateIndex = (index + plates.length) % plates.length;
    const plate = plates[plateIndex];
    $("#plateNumber").textContent = `PLATE ${pad2(plateIndex + 1)} / ${pad2(plates.length)}`;
    $("#plateTitle").textContent = plate.title;
    $("#plateDescription").textContent = plate.description;
    $("#plateMethod").textContent = plate.method;
    $("#plateRange").textContent = plate.range;
    $("#plateState").textContent = plate.state;
    plateCanvas.setAttribute("aria-label", `Plate ${plateIndex + 1}: ${plate.title}. ${plate.description}`);
    tickElements.forEach((tick, position) => tick.classList.toggle("is-active", position === plateIndex));
    drawCurrentPlate();
  }

  $("#platePrev").addEventListener("click", () => setPlate(plateIndex - 1));
  $("#plateNext").addEventListener("click", () => setPlate(plateIndex + 1));
  plateViewer.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPlate(plateIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setPlate(plateIndex + 1);
    }
  });
  if ("ResizeObserver" in window) {
    let plateQueued = false;
    new ResizeObserver(() => {
      if (!plateQueued) {
        plateQueued = true;
        requestAnimationFrame(() => {
          plateQueued = false;
          drawCurrentPlate();
        });
      }
    }).observe(plateCanvas);
  } else {
    window.addEventListener("resize", drawCurrentPlate);
  }
  setPlate(0);

  /* Reactive halftone field ----------------------------------------------- */
  const fieldWrap = $("#fieldWrap");
  const heroCanvas = $("#fieldCanvas");
  const heroCtx = heroCanvas ? heroCanvas.getContext("2d") : null;
  const motionToggle = $("#motionToggle");
  const motionState = $("#motionState");
  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = { x: 0, y: 0, active: false, strength: 0 };
  let heroSize = { w: 0, h: 0 };
  let points = [];
  let phase = 0;
  let paused = reduceQuery.matches;
  let heroVisible = true;
  let heroFrame = 0;
  let lastFrame = 0;

  function buildPoints(w, h) {
    const gap = w < 380 ? 13 : 15;
    points = [];
    for (let y = gap * 0.5; y < h; y += gap) {
      for (let x = gap * 0.5; x < w; x += gap) {
        const jitter = Math.sin(x * 12.9898 + y * 78.233);
        points.push({ x: x + jitter * 1.8, y: y + Math.cos(y * 3.17 + x * 0.71) * 1.5 });
      }
    }
  }

  function drawHero() {
    if (!heroCtx || !heroSize.w) return;
    const { w, h } = heroSize;
    const pal = readPalette();
    const ctx = heroCtx;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = solid(pal.paper);
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1;
    ctx.strokeStyle = neutral(pal.ink, 0.075);
    for (let x = 0; x <= w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }

    const cx = w * 0.5;
    const cy = h * 0.48;
    const r = Math.min(w, h) * 0.37;
    const glow = ctx.createRadialGradient(cx - r * 0.34, cy - r * 0.4, r * 0.04, cx, cy, r * 1.12);
    glow.addColorStop(0, neutral(pal.ink, 0.7));
    glow.addColorStop(0.42, neutral(pal.ink, 0.15));
    glow.addColorStop(1, neutral(pal.ink, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.12, 0, TAU);
    ctx.fill();

    const influenceRadius = Math.min(w, h) * 0.3;
    for (const point of points) {
      let offsetX = 0;
      let offsetY = 0;
      let boost = 0;
      if (pointer.strength > 0.01) {
        const dx = point.x - pointer.x;
        const dy = point.y - pointer.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance < influenceRadius) {
          const force = (1 - distance / influenceRadius) * pointer.strength;
          offsetX = (dx / distance) * force * 32;
          offsetY = (dy / distance) * force * 32;
          boost = force;
        }
      }
      const distanceToCentre = Math.hypot(point.x - cx, point.y - cy);
      const falloff = clamp(1 - distanceToCentre / (r * 1.16), 0, 1);
      const wave = 0.5 + 0.5 * Math.sin(phase + point.x * 0.021 + point.y * 0.017);
      const radius = 0.45 + falloff * (1.35 + wave * 2.1) + boost * 2.2;
      const alpha = clamp(0.025 + falloff * (0.28 + wave * 0.45) + boost * 0.28, 0, 0.95);
      ctx.fillStyle = neutral(pal.ink, alpha);
      ctx.beginPath();
      ctx.arc(point.x + offsetX, point.y + offsetY, radius, 0, TAU);
      ctx.fill();
    }

    for (let i = 1; i <= 6; i += 1) {
      ctx.strokeStyle = neutral(pal.ink, 0.1);
      ctx.beginPath();
      ctx.arc(cx, cy, (r * i) / 6, 0, TAU);
      ctx.stroke();
    }
    ctx.strokeStyle = neutral(pal.ink, 0.28);
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.2, cy);
    ctx.lineTo(cx + r * 1.2, cy);
    ctx.moveTo(cx, cy - r * 1.2);
    ctx.lineTo(cx, cy + r * 1.2);
    ctx.stroke();
    ctx.fillStyle = solid(pal.paper);
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = neutral(pal.ink, 0.8);
    ctx.stroke();

    if (pointer.strength > 0.02) {
      ctx.strokeStyle = neutral(pal.ink, 0.45);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, influenceRadius * 0.55, 0, TAU);
      ctx.stroke();
    }
    ctx.strokeStyle = neutral(pal.ink, 0.5);
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  function heroTick(timestamp) {
    if (paused || !heroVisible || document.hidden) {
      heroFrame = 0;
      return;
    }
    if (!lastFrame || timestamp - lastFrame >= 32) {
      phase += 0.045;
      pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * 0.09;
      drawHero();
      lastFrame = timestamp;
    }
    heroFrame = requestAnimationFrame(heroTick);
  }

  function startHero() {
    if (!heroFrame && !paused && heroVisible && !document.hidden) heroFrame = requestAnimationFrame(heroTick);
  }

  function stopHero() {
    if (heroFrame) cancelAnimationFrame(heroFrame);
    heroFrame = 0;
    lastFrame = 0;
  }

  function setPaused(next) {
    paused = Boolean(next);
    motionToggle.dataset.paused = String(paused);
    motionState.textContent = paused ? "OFF" : "ON";
    motionToggle.setAttribute("aria-label", paused ? "Resume field motion" : "Pause field motion");
    if (paused) {
      pointer.active = false;
      pointer.strength = 0;
      stopHero();
    } else {
      startHero();
    }
    drawHero();
  }

  function resizeHero() {
    if (!heroCtx) return;
    heroSize = sizeCanvas(heroCanvas, heroCtx);
    buildPoints(heroSize.w, heroSize.h);
    drawHero();
  }

  function setPointer(event) {
    const rect = heroCanvas.getBoundingClientRect();
    pointer.x = clamp(event.clientX - rect.left, 0, rect.width);
    pointer.y = clamp(event.clientY - rect.top, 0, rect.height);
    pointer.active = true;
    if (!paused) startHero();
  }

  fieldWrap.addEventListener("pointermove", setPointer);
  fieldWrap.addEventListener("pointerdown", setPointer);
  ["pointerleave", "pointerup", "pointercancel"].forEach((type) => {
    fieldWrap.addEventListener(type, () => { pointer.active = false; });
  });
  motionToggle.addEventListener("click", () => setPaused(!paused));
  if (typeof reduceQuery.addEventListener === "function") {
    reduceQuery.addEventListener("change", (event) => setPaused(event.matches));
  } else if (typeof reduceQuery.addListener === "function") {
    reduceQuery.addListener((event) => setPaused(event.matches));
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (heroVisible) startHero();
      else stopHero();
    }, { threshold: 0.01 }).observe(fieldWrap);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopHero();
    else startHero();
  });
  if ("ResizeObserver" in window) {
    let heroQueued = false;
    new ResizeObserver(() => {
      if (!heroQueued) {
        heroQueued = true;
        requestAnimationFrame(() => {
          heroQueued = false;
          resizeHero();
        });
      }
    }).observe(fieldWrap);
  } else {
    window.addEventListener("resize", resizeHero);
  }

  resizeHero();
  setPaused(reduceQuery.matches);

  /* Shared redraws and final actions -------------------------------------- */
  document.addEventListener("grey:themechange", () => {
    drawCurrentPlate();
    drawHero();
  });
  $("#printButton").addEventListener("click", () => window.print());
})();
