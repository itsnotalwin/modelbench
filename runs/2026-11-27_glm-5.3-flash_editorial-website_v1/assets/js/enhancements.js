/* Meridian — enhancements only.
   Everything here is optional: with JavaScript disabled the site remains
   fully readable and navigable. Two enhancements that genuinely need JS:
   1. A reading-progress indicator on article pages (scroll-linked).
   2. Quick-view popovers for footnote references (pointer/keyboard).
      Without JS the footnote links simply jump to their notes. */
(function () {
  "use strict";

  /* --- 1. Reading progress bar (article pages only) -------------------- */
  var bar = document.querySelector(".progress-bar");
  if (bar) {
    var ticking = false;
    var paint = function () {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, (window.scrollY || 0) / max)) : 0;
      bar.style.transform = "scaleX(" + p + ")";
    };
    var onScroll = function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(paint);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    paint();
  }

  /* --- 2. Footnote quick-view ------------------------------------------- */
  var refs = document.querySelectorAll("a.fn[data-note]");
  if (refs.length && "closest" in Element.prototype) {
    var tip = null;
    var currentRef = null;

    function ensureTip() {
      if (!tip) {
        tip = document.createElement("div");
        tip.className = "fn-tip";
        tip.hidden = true;
        tip.setAttribute("aria-hidden", "true");
        document.body.appendChild(tip);
      }
      return tip;
    }

    function fillTip(t, ref) {
      var target = document.getElementById(ref.getAttribute("data-note"));
      if (!target) return false;
      var clone = target.cloneNode(true);
      var back = clone.querySelector(".fn-back");
      if (back) back.remove();
      t.innerHTML = "";
      var num = document.createElement("span");
      num.className = "fn-tip-num";
      num.textContent = ref.textContent + "\u2009";
      t.appendChild(num);
      t.appendChild(document.createTextNode(clone.textContent.trim()));
      return true;
    }

    function place(t, ref) {
      var r = ref.getBoundingClientRect();
      var scrollY = window.scrollY || 0;
      var scrollX = window.scrollX || 0;
      var vw = window.innerWidth;
      var tw = t.offsetWidth;
      var th = t.offsetHeight;
      var left = r.left + scrollX;
      left = Math.max(8, Math.min(left, scrollX + vw - tw - 8));
      var top;
      if (r.top - th - 12 > 8) {
        top = r.top + scrollY - th - 10;
      } else {
        top = r.bottom + scrollY + 10;
      }
      t.style.left = left + "px";
      t.style.top = top + "px";
    }

    function show(ref) {
      var t = ensureTip();
      if (!fillTip(t, ref)) return;
      t.hidden = false;
      place(t, ref);
      currentRef = ref;
    }

    function hide() {
      if (tip) tip.hidden = true;
      currentRef = null;
    }

    document.addEventListener("mouseover", function (e) {
      var ref = e.target.closest("a.fn[data-note]");
      if (ref) {
        if (ref !== currentRef || tip.hidden) show(ref);
        return;
      }
      if (currentRef) hide();
    });

    document.addEventListener("mouseout", function (e) {
      if (!currentRef) return;
      var to = e.relatedTarget;
      if (!(to && to.closest && to.closest("a.fn[data-note]"))) hide();
    });

    document.addEventListener("focusin", function (e) {
      var ref = e.target.closest("a.fn[data-note]");
      if (ref) show(ref);
    });

    document.addEventListener("focusout", hide);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") hide();
    });

    document.addEventListener("click", hide);
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("resize", hide);
  }
})();
