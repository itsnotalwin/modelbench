/*
 * Ordered · app
 * Page-level behaviour: reveal-on-scroll, the word-by-word statement, the active
 * section in the header, and the boot sequence for every module.
 */
(function (global) {
  'use strict';

  var NS = global.Ordered = global.Ordered || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.documentElement.classList.add('js');

  function initReveal() {
    var items = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduce.matches) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  // Split the statement into word spans; words light up as the section scrolls past.
  function initStatement() {
    var el = document.querySelector('[data-words]');
    if (!el) return;
    var section = el.closest('.statement');
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    var spans = words.map(function (word, i) {
      var span = document.createElement('span');
      span.className = 'w';
      span.textContent = word;
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return span;
    });

    var lit = 0, queued = false;

    function update() {
      queued = false;
      var rect = section.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = NS.clamp((vh * 0.8 - rect.top) / (rect.height * 0.8), 0, 1);
      var target = reduce.matches ? spans.length : Math.round(p * spans.length);
      if (target === lit) return;
      var on = target > lit;
      var from = Math.min(lit, target), to = Math.max(lit, target);
      for (var i = from; i < to; i++) {
        spans[i].classList.toggle('is-lit', on);
      }
      lit = target;
    }

    function schedule() {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
  }

  // Mark the header link for the section currently in the middle of the viewport.
  function initNav() {
    var links = [].slice.call(document.querySelectorAll('.site-nav a[href^="#"]'));
    if (!('IntersectionObserver' in window) || !links.length) return;
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = byId[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(function (a) { a.removeAttribute('aria-current'); });
          link.setAttribute('aria-current', 'true');
        } else if (link.getAttribute('aria-current')) {
          link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    Object.keys(byId).forEach(function (id) {
      var target = document.getElementById(id);
      if (target) io.observe(target);
    });
  }

  function safely(fn) {
    try {
      fn();
    } catch (err) {
      if (global.console) global.console.error(err);
    }
  }

  function boot() {
    safely(initReveal);
    safely(initStatement);
    safely(initNav);
    if (NS.hero) safely(NS.hero.init);
    if (NS.lab) safely(NS.lab.init);
    if (NS.wedge) safely(NS.wedge.init);
    if (NS.resolve) safely(NS.resolve.init);
  }

  boot();
})(typeof window !== 'undefined' ? window : globalThis);
