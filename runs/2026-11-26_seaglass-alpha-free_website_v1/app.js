/* STILL — strictly monochrome studio. Vanilla JS, no dependencies. */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) { reduceMotion = false; }

  /* ---------- Deterministic PRNG (mulberry32) ---------- */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------- Monochrome SVG art generator ----------
     kinds: dots, rings, lines, blocks, noise, grid, arcs, spiral, bars
     Everything is black/white/grey only (fg + opacity over bg). */
  function makeArt(seed, kind, w, h, fg, bg, label) {
    w = w || 800; h = h || 600;
    fg = fg || "var(--fg)"; bg = bg || "var(--bg)";
    var r = rng(seed || 1);
    var s = [];
    var i, x, y, n;

    function rect(x, y, ww, hh, op, extra) {
      s.push('<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(0, ww).toFixed(1) +
        '" height="' + Math.max(0, hh).toFixed(1) + '" fill="' + fg + '" fill-opacity="' + op.toFixed(3) + '"' + (extra || "") + '/>');
    }

    switch (kind) {
      case "dots":
        n = 9;
        var cw = w / n, ch = h / n;
        for (var gy = 0; gy < n; gy++) {
          for (var gx = 0; gx < n; gx++) {
            var cx = (gx + 0.5) * cw, cy = (gy + 0.5) * ch;
            var rad = (Math.min(cw, ch) / 2) * (0.15 + 0.75 * r());
            s.push('<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + rad.toFixed(1) + '" fill="' + fg + '" fill-opacity="' + (0.25 + 0.7 * r()).toFixed(3) + '"/>');
          }
        }
        break;

      case "rings":
        var rings = 14, rcx = w / 2, rcy = h / 2, maxr = Math.min(w, h) / 2;
        for (i = rings; i >= 1; i--) {
          var rr = maxr * (i / rings);
          s.push('<circle cx="' + rcx + '" cy="' + rcy + '" r="' + rr.toFixed(1) + '" fill="none" stroke="' + fg + '" stroke-width="' + (0.5 + r() * 2).toFixed(2) + '" stroke-opacity="' + (0.2 + 0.6 * r()).toFixed(3) + '"/>');
        }
        break;

      case "lines":
        var gap = 12 + Math.floor(r() * 10);
        for (i = -h; i < w + h; i += gap) {
          s.push('<line x1="' + i + '" y1="' + h + '" x2="' + (i + h) + '" y2="0" stroke="' + fg + '" stroke-width="' + (0.5 + r() * 1.5).toFixed(2) + '" stroke-opacity="' + (0.1 + 0.35 * r()).toFixed(3) + '"/>');
        }
        break;

      case "blocks":
        n = 40 + Math.floor(r() * 30);
        for (i = 0; i < n; i++) {
          var bw = w * (0.04 + 0.3 * r()), bh = h * (0.04 + 0.3 * r());
          x = r() * (w - bw); y = r() * (h - bh);
          rect(x, y, bw, bh, 0.08 + 0.55 * r());
        }
        break;

      case "noise":
        n = 600;
        var cell = Math.max(2, Math.floor(Math.min(w, h) / 80));
        for (i = 0; i < n; i++) {
          x = Math.floor(r() * (w / cell)) * cell;
          y = Math.floor(r() * (h / cell)) * cell;
          rect(x, y, cell, cell, 0.05 + 0.5 * r());
        }
        break;

      case "grid":
        var step = Math.max(16, Math.floor(Math.min(w, h) / (6 + Math.floor(r() * 6))));
        for (x = 0; x <= w; x += step) s.push('<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + h + '" stroke="' + fg + '" stroke-width="0.75" stroke-opacity="0.18"/>');
        for (y = 0; y <= h; y += step) s.push('<line x1="0" y1="' + y + '" x2="' + w + '" y2="' + y + '" stroke="' + fg + '" stroke-width="0.75" stroke-opacity="0.18"/>');
        for (i = 0; i < 8; i++) rect(Math.floor(r() * (w / step)) * step, Math.floor(r() * (h / step)) * step, step, step, 0.5 + 0.4 * r());
        break;

      case "arcs":
        n = 10 + Math.floor(r() * 8);
        var acx = w * (0.3 + 0.4 * r()), acy = h * (0.3 + 0.4 * r());
        for (i = 1; i <= n; i++) {
          var ar = Math.max(w, h) * (i / n) * (0.6 + 0.5 * r());
          var a0 = r() * Math.PI * 2, a1 = a0 + Math.PI * (0.4 + r());
          var x0 = acx + ar * Math.cos(a0), y0 = acy + ar * Math.sin(a0);
          var x1 = acx + ar * Math.cos(a1), y1 = acy + ar * Math.sin(a1);
          s.push('<path d="M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + ar.toFixed(1) + ' ' + ar.toFixed(1) + ' 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + '" fill="none" stroke="' + fg + '" stroke-width="' + (0.6 + r()).toFixed(2) + '" stroke-opacity="' + (0.25 + 0.5 * r()).toFixed(3) + '"/>');
        }
        break;

      case "spiral":
        var pts = [], scx = w / 2, scy = h / 2, turns = 5 + r() * 4, max = Math.min(w, h) / 2;
        for (i = 0; i <= 720; i++) {
          var t = i / 720, ang = t * turns * Math.PI * 2, rad = t * max;
          pts.push((scx + rad * Math.cos(ang)).toFixed(1) + "," + (scy + rad * Math.sin(ang)).toFixed(1));
        }
        s.push('<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + fg + '" stroke-width="1" stroke-opacity="0.55" stroke-linecap="round"/>');
        break;

      case "bars":
        n = 24;
        var bwid = w / n;
        for (i = 0; i < n; i++) {
          var bh2 = h * (0.1 + 0.85 * r());
          rect(i * bwid + bwid * 0.12, h - bh2, bwid * 0.76, bh2, 0.3 + 0.6 * r());
        }
        break;

      default:
        rect(0, 0, w, h, 0.06);
    }

    var body = s.join("");
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '"' +
      ' role="img" aria-label="' + esc(label || "Abstract monochrome generated artwork") + '" preserveAspectRatio="xMidYMid slice">' +
      '<title>' + esc(label || "Abstract monochrome generated artwork") + '</title>' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="' + bg + '"/>' + body + '</svg>';
  }

  /* ---------- Project data ---------- */
  var PROJECTS = [
    { id: "mono", title: "MONO", category: "identity", kind: "dots", seed: 11,
      desc: "A type specimen and identity system for a print atelier. One weight ladder, one rhythm, zero colour.", featured: true },
    { id: "archive", title: "The Archive", category: "editorial", kind: "lines", seed: 23,
      desc: "A museum quarterly rebuilt on a strict modular grid; meaning carried by scale and space, not hue." },
    { id: "still-frame", title: "STILL FRAME", category: "campaign", kind: "rings", seed: 37,
      desc: "A campaign for a photography festival where every poster is pure black on white.", featured: true },
    { id: "wireframe", title: "WIREFRAME", category: "systems", kind: "grid", seed: 41,
      desc: "A monochrome component library: tokens, spacing, focus, contrast — documented and dependency-free." },
    { id: "negative-space", title: "Negative Space", category: "editorial", kind: "blocks", seed: 53,
      desc: "An art-book layout study proving white space can be the loudest element on the page." },
    { id: "greybox", title: "GREYBOX", category: "campaign", kind: "bars", seed: 67,
      desc: "A fictional product launch in a single tone, with motion that honours reduced-motion settings." }
  ];

  function categoryLabel(c) {
    return c.charAt(0).toUpperCase() + c.slice(1);
  }

  /* ---------- Render work grid ---------- */
  function renderWork() {
    var grid = doc.getElementById("work-grid");
    if (!grid) return;
    var html = PROJECTS.map(function (p) {
      var art = makeArt(p.seed, p.kind, 800, 600, "var(--fg)", "var(--panel)", p.title + " — generated monochrome artwork");
      return '<li class="work-card" data-category="' + esc(p.category) + '" data-id="' + esc(p.id) + '">' +
        '<button type="button" class="work-open" aria-haspopup="dialog" aria-label="Open ' + esc(p.title) + '">' +
        '<span class="work-art">' + art + '</span>' +
        '<span class="work-meta">' +
        '<span class="work-category">' + esc(categoryLabel(p.category)) + '</span>' +
        '<span class="work-title" style="display:block">' + esc(p.title) + '</span>' +
        '<span class="work-desc" style="display:block">' + esc(p.desc) + '</span>' +
        '<span class="work-more" style="display:block">View project →</span>' +
        '</span></button></li>';
    }).join("");
    grid.innerHTML = html;

    var buttons = grid.querySelectorAll(".work-open");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function (ev) {
        var card = ev.currentTarget.closest(".work-card");
        openLightbox(card.getAttribute("data-id"), ev.currentTarget);
      });
    }
  }

  /* ---------- Filtering ---------- */
  function initFilters() {
    var bar = doc.querySelector(".filters");
    if (!bar) return;
    bar.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".filter");
      if (!btn) return;
      var filter = btn.getAttribute("data-filter");
      var filters = bar.querySelectorAll(".filter");
      for (var i = 0; i < filters.length; i++) filters[i].setAttribute("aria-pressed", filters[i] === btn ? "true" : "false");
      applyFilter(filter);
    });
  }

  function applyFilter(filter) {
    var cards = doc.querySelectorAll("#work-grid .work-card");
    var shown = 0;
    for (var i = 0; i < cards.length; i++) {
      var match = filter === "all" || cards[i].getAttribute("data-category") === filter;
      cards[i].hidden = !match;
      if (match) shown++;
    }
    var status = doc.getElementById("filter-status");
    if (status) {
      status.textContent = shown + (shown === 1 ? " project shown" : " projects shown") +
        (filter === "all" ? "" : " · filtered by " + filter);
    }
  }

  /* ---------- Lightbox ---------- */
  var lightbox = null, lightboxTrigger = null, currentProject = null;

  function openLightbox(id, trigger) {
    var p = null;
    for (var i = 0; i < PROJECTS.length; i++) if (PROJECTS[i].id === id) p = PROJECTS[i];
    if (!p) return;
    currentProject = p;
    lightboxTrigger = trigger || null;
    lightbox = doc.getElementById("lightbox");
    if (!lightbox) return;

    doc.getElementById("lightbox-category").textContent = categoryLabel(p.category);
    doc.getElementById("lightbox-title").textContent = p.title;
    doc.getElementById("lightbox-desc").textContent = p.desc;
    doc.getElementById("lightbox-art").innerHTML =
      makeArt(p.seed, p.kind, 1000, 760, "var(--fg)", "var(--panel)", p.title + " — generated monochrome artwork");

    if (typeof lightbox.showModal === "function") lightbox.showModal();
    else lightbox.setAttribute("open", "");
    var closeBtn = doc.getElementById("lightbox-close");
    if (closeBtn) closeBtn.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    if (typeof lightbox.close === "function") lightbox.close();
    else lightbox.removeAttribute("open");
    if (lightboxTrigger && typeof lightboxTrigger.focus === "function") lightboxTrigger.focus();
  }

  function initLightbox() {
    lightbox = doc.getElementById("lightbox");
    if (!lightbox) return;
    var closeBtn = doc.getElementById("lightbox-close");
    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (ev) {
      // close when clicking the backdrop
      if (ev.target === lightbox) closeLightbox();
    });
    lightbox.addEventListener("close", function () {
      if (lightboxTrigger && typeof lightboxTrigger.focus === "function") lightboxTrigger.focus();
    });
    var dl = doc.getElementById("lightbox-download");
    if (dl) dl.addEventListener("click", downloadCurrent);
  }

  function downloadCurrent() {
    if (!currentProject) return;
    var p = currentProject;
    var svg = makeArt(p.seed, p.kind, 1200, 900, "#000000", "#ffffff", p.title + " — STILL monochrome artwork");
    var blob = new Blob([svg], { type: "image/svg+xml" });
    var url = URL.createObjectURL(blob);
    var a = doc.createElement("a");
    a.href = url;
    a.download = p.id + ".svg";
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- Theme (monochrome inversion) ---------- */
  function initTheme() {
    var btn = doc.getElementById("theme-toggle");
    var saved = null;
    try { saved = window.localStorage.getItem("still-theme"); } catch (e) { saved = null; }
    var prefersDark = false;
    try { prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) { prefersDark = false; }
    var theme = saved === "dark" || saved === "light" ? saved : (prefersDark ? "dark" : "light");
    applyTheme(theme);

    if (btn) btn.addEventListener("click", function () {
      applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { window.localStorage.setItem("still-theme", theme); } catch (e) { /* file:// may block storage */ }
    var btn = doc.getElementById("theme-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      btn.setAttribute("aria-label", theme === "dark" ? "Invert colours: currently dark, switch to light" : "Invert colours: currently light, switch to dark");
    }
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    var els = doc.querySelectorAll(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      for (var i = 0; i < els.length; i++) els[i].classList.add("in");
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    for (var j = 0; j < els.length; j++) io.observe(els[j]);
  }

  /* ---------- Generated hero + studio art ---------- */
  function initStaticArt() {
    var hero = doc.getElementById("hero-art");
    if (hero) hero.innerHTML = makeArt(7, "arcs", 1200, 900, "var(--fg)", "transparent", "Decorative generated monochrome background");
    var studio = doc.getElementById("studio-art");
    if (studio) studio.innerHTML = makeArt(19, "spiral", 800, 800, "var(--fg)", "var(--bg)", "Generated monochrome still life");
  }

  /* ---------- Copy email ---------- */
  function initCopyEmail() {
    var btn = doc.getElementById("copy-email");
    var status = doc.getElementById("contact-status");
    var emailEl = doc.getElementById("contact-email");
    if (!btn || !emailEl) return;
    btn.addEventListener("click", function () {
      var email = emailEl.textContent.trim();
      function done(ok) {
        if (status) status.textContent = ok ? "Copied “" + email + "” to your clipboard." : "Couldn’t copy automatically — select the address above.";
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(function () { done(true); }, function () { fallbackCopy(email, done); });
      } else fallbackCopy(email, done);
    });
  }

  function fallbackCopy(text, done) {
    try {
      var ta = doc.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "absolute"; ta.style.left = "-9999px";
      doc.body.appendChild(ta); ta.select();
      var ok = doc.execCommand("copy");
      doc.body.removeChild(ta);
      done(ok);
    } catch (e) { done(false); }
  }

  /* ---------- Footer year + back-to-top ---------- */
  function initFooter() {
    var y = doc.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ---------- Init ---------- */
  function init() {
    initTheme();
    initStaticArt();
    renderWork();
    initFilters();
    applyFilter("all");
    initLightbox();
    initCopyEmail();
    initReveal();
    initFooter();
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})();
