(function () {
  "use strict";

  // 1. Topbar menu: toggle, ArrowUp/ArrowDown navigation, Escape to close.
  var menuToggle = document.querySelector(".menu-toggle");
  var siteNav = document.querySelector(".site-nav");

  if (menuToggle && siteNav) {
    function setNavOpen(open) {
      siteNav.classList.toggle("is-open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
    }

    menuToggle.addEventListener("click", function () {
      setNavOpen(!siteNav.classList.contains("is-open"));
    });

    siteNav.querySelectorAll("a").forEach(function (link, index, links) {
      link.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          links[(index + 1) % links.length].focus();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          links[(index - 1 + links.length) % links.length].focus();
        }
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && siteNav.classList.contains("is-open")) {
        setNavOpen(false);
        menuToggle.focus();
      }
    });
  }

  // 2. Press: live angle and state, toggle. Under reduced motion, steps static angles.
  (function () {
    var button = document.querySelector(".press-toggle");
    var ring = document.querySelector(".press-ring");
    var angleEl = document.querySelector("#press-angle");
    var stateEl = document.querySelector("#press-state");
    if (!button || !ring || !angleEl || !stateEl) return;

    var CENTER_X = 190;
    var CENTER_Y = 150;
    var TURN_MS = 12000;
    var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var running = false;
    var start = 0;
    var angle = 0;
    var raf = 0;

    function applyAngle(deg) {
      angle = ((deg % 360) + 360) % 360;
      ring.setAttribute("transform", "rotate(" + angle + " " + CENTER_X + " " + CENTER_Y + ")");
      angleEl.textContent = angle + "\u00b0";
    }

    function tick(now) {
      if (!running) return;
      angle = Math.round((((now - start) / TURN_MS) % 1) * 360);
      ring.setAttribute("transform", "rotate(" + angle + " " + CENTER_X + " " + CENTER_Y + ")");
      angleEl.textContent = angle + "\u00b0";
      raf = requestAnimationFrame(tick);
    }

    button.addEventListener("click", function () {
      if (REDUCED) {
        applyAngle(angle + 45);
        stateEl.textContent = "Static";
        button.setAttribute("aria-pressed", "false");
        return;
      }
      if (running) {
        running = false;
        cancelAnimationFrame(raf);
        stateEl.textContent = "Paused";
      } else {
        running = true;
        start = performance.now() - ((angle / 360) * TURN_MS);
        tick(performance.now());
        stateEl.textContent = "Running";
      }
      button.setAttribute("aria-pressed", String(running));
    });

    applyAngle(0);
    stateEl.textContent = REDUCED ? "Static" : "Paused";
  })();

  // 3. Sheets: activating a face toggles the note panel open or closed.
  (function () {
    var faces = document.querySelectorAll(".sheet-face");
    Array.prototype.forEach.call(faces, function (face) {
      var info = face.nextElementSibling;
      if (!info) return;
      face.addEventListener("click", function () {
        var open = face.getAttribute("aria-expanded") !== "true";
        face.setAttribute("aria-expanded", String(open));
      });
    });
  })();

  // 4. Ages: reveal the timeline one item at a time as it enters the viewport.
  (function () {
    var items = document.querySelectorAll(".timeline-item");
    var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (REDUCED) {
      Array.prototype.forEach.call(items, function (item) {
        item.classList.add("is-in");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        Array.prototype.forEach.call(entries, function (entry) {
          if (entry.isIntersecting) entry.target.classList.add("is-in");
        });
      },
      { threshold: 0.1 }
    );
    Array.prototype.forEach.call(items, function (item) {
      observer.observe(item);
    });
  })();
})();
