(function () {
  "use strict";
  var d = document, root = d.documentElement;
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }

  /* ---------- portfolio: modes + lightbox ---------- */
  var pf = $(".portfolio");
  if (pf) {
    var plates = $$(".plate", pf), links = plates.map(function (p) { return $(".open", p); });
    var btns = $$("[data-mode-btn]"), prog = $(".fr-prog"), progT = $(".fr-t");
    var lb = $("#lb"), canModal = lb && typeof lb.showModal === "function";
    var cur = -1, baseHash = "#index", first = true;

    function setMode(m, quiet) {
      var mid = innerHeight / 2, anchor = null, best = 1e9;
      if (!first) plates.forEach(function (p) {
        var r = p.getBoundingClientRect(), dd = Math.abs((r.top + r.bottom) / 2 - mid);
        if (dd < best) { best = dd; anchor = p; }
      });
      m = m === "frames" ? "frames" : "index";
      pf.dataset.mode = m; baseHash = "#" + m;
      root.classList.toggle("fr-on", m === "frames");
      btns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.modeBtn === m)); });
      if (!quiet) history.replaceState(null, "", baseHash);
      if (anchor) anchor.scrollIntoView({ block: "center", behavior: "instant" });
      first = false;
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { setMode(b.dataset.modeBtn); }); });

    /* frames progress */
    if ("IntersectionObserver" in window && prog) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && pf.dataset.mode === "frames") {
            var a = $(".open", e.target);
            progT.textContent = a.dataset.no + " / " + plates.length + " \u2014 " + a.dataset.series;
          }
        });
      }, { rootMargin: "-45% 0px -45% 0px" });
      plates.forEach(function (p) { io.observe(p); });
    }

    /* lightbox */
    if (canModal) {
      var img = $("img", lb), cap = $(".lb-cap", lb), cnt = $(".lb-n", lb), live = $("#lb-live", lb);
      var prev = $(".lb-p", lb), next = $(".lb-nx", lb), closeB = $(".lb-x", lb);
      var preload = function (k) { if (links[k]) { var im = new Image(); im.sizes = links[k].dataset.sizes; im.srcset = $("img", plates[k]).srcset; } };
      var show = function (k) {
        k = Math.max(0, Math.min(plates.length - 1, k)); cur = k;
        var a = links[k], t = $("img", plates[k]);
        img.sizes = a.dataset.sizes; img.srcset = t.srcset; img.src = a.getAttribute("href");
        img.width = +a.dataset.w; img.height = +a.dataset.h; img.alt = t.alt;
        cap.textContent = "";
        var b = d.createElement("b"); b.textContent = a.dataset.title; cap.appendChild(b);
        cap.appendChild(d.createTextNode(a.dataset.series + " \u00b7 " + a.dataset.meta));
        cnt.textContent = "PLATE " + a.dataset.no + " / " + plates.length;
        live.textContent = "Plate " + a.dataset.no + " of " + plates.length + ": " + a.dataset.title;
        prev.setAttribute("aria-disabled", String(k === 0)); next.setAttribute("aria-disabled", String(k === plates.length - 1));
        history.replaceState(null, "", "#plate-" + a.dataset.no);
        preload(k + 1); preload(k - 1);
      };
      var openAt = function (k) {
        if (!lb.open) { root.classList.add("lb-open"); lb.showModal(); }
        show(k); closeB.focus();
      };
      links.forEach(function (a, k) {
        a.addEventListener("click", function (e) {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
          e.preventDefault(); openAt(k);
        });
      });
      prev.addEventListener("click", function () { if (cur > 0) show(cur - 1); });
      next.addEventListener("click", function () { if (cur < plates.length - 1) show(cur + 1); });
      closeB.addEventListener("click", function () { lb.close(); });
      lb.addEventListener("click", function (e) { if (!e.target.closest("img,button,.lb-cap")) lb.close(); });
      lb.addEventListener("close", function () {
        root.classList.remove("lb-open");
        history.replaceState(null, "", baseHash);
        var a = links[cur]; if (a) a.focus();
      });
      lb.addEventListener("keydown", function (e) {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        var k = e.key;
        if (k === "ArrowRight") { e.preventDefault(); if (cur < plates.length - 1) show(cur + 1); }
        else if (k === "ArrowLeft") { e.preventDefault(); if (cur > 0) show(cur - 1); }
        else if (k === "Home") { e.preventDefault(); show(0); }
        else if (k === "End") { e.preventDefault(); show(plates.length - 1); }
        else if (k === "Tab") {
          var f = [closeB, prev, next], i = f.indexOf(d.activeElement);
          e.preventDefault();
          f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
        }
      });
      var sx = 0, sy = 0, st = $(".lb-fig", lb);
      st.addEventListener("pointerdown", function (e) { sx = e.clientX; sy = e.clientY; });
      st.addEventListener("pointerup", function (e) {
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          if (dx < 0 && cur < plates.length - 1) show(cur + 1);
          else if (dx > 0 && cur > 0) show(cur - 1);
        }
      });
    }

    /* deep links: #index, #frames, #plate-07 */
    var route = function (quiet) {
      var h = location.hash, m = /^#plate-(\d+)$/.exec(h);
      if (h === "#frames") setMode("frames", true);
      else if (m) {
        var k = parseInt(m[1], 10) - 1;
        if (first) setMode("index", true);
        if (plates[k]) { plates[k].scrollIntoView({ block: "center", behavior: "instant" }); if (canModal) { baseHash = pf.dataset.mode === "frames" ? "#frames" : "#index"; openAt(k); } }
      } else if (h === "#index" || first) setMode("index", true);
    };
    route();
    addEventListener("hashchange", function () {
      if (/^#plate-/.test(location.hash) && lb && lb.open) return;
      if (lb && lb.open && !/^#plate-/.test(location.hash)) lb.close();
      route();
    });
  }

  /* ---------- contact: compose an email ---------- */
  var f = $("#enquiry");
  if (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = function (n) { return f.elements[n].value.trim(); };
      var body = ["Name: " + v("name"), "Email: " + v("email"), "Session: " + v("session"), "Preferred date: " + v("when") || "-", "", v("msg")].join("\n");
      var s = "Session enquiry \u2014 " + v("session");
      location.href = "mailto:alwin@shutterhausvisuals.co.za?subject=" + encodeURIComponent(s) + "&body=" + encodeURIComponent(body);
      var n = $("#enq-note"); if (n) n.hidden = false;
    });
  }
})();
