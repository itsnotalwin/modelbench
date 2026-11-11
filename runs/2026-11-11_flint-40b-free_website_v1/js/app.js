/* DIM — The Hour Between · app.js */

(function () {
  "use strict";

  var header = document.getElementById("site-header");
  var night = document.getElementById("night");
  var sky = document.getElementById("turn-sky");
  var slider = document.getElementById("light-level");
  var readout = document.getElementById("light-readout");

  /* Header: light on light sections, white on the night section, hide on scroll down. */
  var lastY = window.scrollY || 0;

  function headerState() {
    var y = window.scrollY || 0;
    if (y > 160 && y > lastY) {
      header.classList.add("is-hidden");
    } else {
      header.classList.remove("is-hidden");
    }
    lastY = y;
  }

  window.addEventListener("scroll", headerState, { passive: true });
  window.addEventListener("resize", headerState);

  if (night && window.IntersectionObserver) {
    var nightObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.target === night) {
            header.classList.toggle("is-dark", entry.isIntersecting);
          }
        });
      },
      { rootMargin: "0px 0px -45% 0px", threshold: 0 }
    );
    nightObserver.observe(night);
  }

  /* Scroll reveals. */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (window.IntersectionObserver) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach(function (el) { revealObserver.observe(el); });
  }

  /* Light dial — maps a 0–100 level onto sky layers (stars, fog, glow). */
  var STATES = ["Deep night", "Moonlight", "Civil twilight", "Gloaming", "Golden hour", "Dawning"];

  function applyLight(value) {
    var v = Math.max(0, Math.min(100, Number(value) || 0));
    var t = v / 100;
    var stars = Math.max(0, 1 - t);
    var fog = Math.sin(t * Math.PI) * 0.32;
    var glow = (1 - t) * 0.92;
    if (sky) {
      sky.style.setProperty("--stars", stars.toFixed(3));
      sky.style.setProperty("--fog", fog.toFixed(3));
      sky.style.setProperty("--glow", glow.toFixed(3));
    }
    if (readout) {
      var idx = Math.min(5, Math.max(0, Math.round(t * 5)));
      readout.textContent = "Light level " + v + " — " + STATES[idx];
    }
  }

  if (slider) {
    slider.addEventListener("input", function () { applyLight(slider.value); });
    slider.addEventListener("change", function () { applyLight(slider.value); });
    applyLight(slider.value);
  }
})();
