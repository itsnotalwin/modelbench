/* Shutterhaus Visuals — refresh
   Lightbox (keyboard model), frames strip, wall/frames modes, menu,
   scroll reveals and the enquiry mailto handoff. No dependencies. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function scrollBehavior() {
    return reduceMotion.matches ? 'auto' : 'smooth';
  }

  /* ---------------------------------------------------------- menu */

  var menuBtn = doc.querySelector('.menu-btn');
  var siteNav = doc.getElementById('site-nav');
  if (menuBtn && siteNav) {
    var setMenu = function (open) {
      root.classList.toggle('site-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    menuBtn.addEventListener('click', function () {
      setMenu(!root.classList.contains('site-open'));
    });
    siteNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('site-open')) {
        setMenu(false);
        menuBtn.focus();
      }
    });
    doc.addEventListener('click', function (e) {
      if (
        root.classList.contains('site-open') &&
        !e.target.closest('.site-nav') &&
        !e.target.closest('.menu-btn')
      ) setMenu(false);
    });
    window.matchMedia('(min-width: 880px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------------------------------------------------------- reveals */

  var revealEls = Array.prototype.slice.call(doc.querySelectorAll('.reveal'));
  if (revealEls.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------------------------------------------------------- plates */

  // One entry per plate, keyed by data-index; first occurrence in DOM wins
  // (the wall carries alt text and captions for all of them).
  function collectPlates() {
    var map = {};
    var buttons = Array.prototype.slice.call(doc.querySelectorAll('.plate__open[data-index]'));
    buttons.forEach(function (btn) {
      var i = btn.getAttribute('data-index');
      if (map[i]) return;
      var img = btn.querySelector('img');
      var fig = btn.closest('figure');
      var title = fig ? (fig.querySelector('.plate__title') || {}).textContent || '' : '';
      var meta = fig ? (fig.querySelector('.plate__meta') || {}).textContent || '' : '';
      var no = fig ? (fig.querySelector('.plate__no') || {}).textContent || '' : '';
      map[i] = {
        index: parseInt(i, 10),
        full: btn.getAttribute('data-full'),
        src: img ? img.getAttribute('src') : '',
        srcset: img ? img.getAttribute('srcset') || '' : '',
        sizes: img ? img.getAttribute('sizes') || '' : '',
        w: img ? parseInt(img.getAttribute('width'), 10) || 0 : 0,
        h: img ? parseInt(img.getAttribute('height'), 10) || 0 : 0,
        alt: img ? img.getAttribute('alt') || '' : '',
        no: no,
        title: title.replace(/^["\u201C]|["\u201D]$/g, ''),
        meta: meta
      };
    });
    return Object.keys(map)
      .map(function (k) { return map[k]; })
      .sort(function (a, b) { return a.index - b.index; });
  }

  var plates = collectPlates();

  /* ---------------------------------------------------------- lightbox */

  var lb = null;
  var lbImg, lbNo, lbTitle, lbMeta, lbCounter, lbClose, lbPrev, lbNext, lbStage;
  var lbOpener = null;
  var lbIndex = 0;

  function buildLightbox() {
    lb = doc.createElement('div');
    lb.className = 'lightbox';
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Plate viewer');
    lb.innerHTML =
      '<p class="lightbox__counter" id="lb-counter"></p>' +
      '<button type="button" class="lightbox__btn lightbox__btn--close" id="lb-close" aria-label="Close plate viewer">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<button type="button" class="lightbox__btn lightbox__btn--prev" id="lb-prev" aria-label="Previous plate">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<button type="button" class="lightbox__btn lightbox__btn--next" id="lb-next" aria-label="Next plate">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg></button>' +
      '<div class="lightbox__stage" id="lb-stage"><img id="lb-img" alt=""></div>' +
      '<p class="lightbox__caption"><span class="plate__no" aria-hidden="true" id="lb-no"></span>' +
      '<span class="plate__body"><cite class="plate__title" id="lb-title"></cite>' +
      '<span class="plate__meta" id="lb-meta"></span></span></p>';
    doc.body.appendChild(lb);
    lbImg = lb.querySelector('#lb-img');
    lbNo = lb.querySelector('#lb-no');
    lbTitle = lb.querySelector('#lb-title');
    lbMeta = lb.querySelector('#lb-meta');
    lbCounter = lb.querySelector('#lb-counter');
    lbClose = lb.querySelector('#lb-close');
    lbPrev = lb.querySelector('#lb-prev');
    lbNext = lb.querySelector('#lb-next');
    lbStage = lb.querySelector('#lb-stage');

    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', function () { stepLightbox(-1); });
    lbNext.addEventListener('click', function () { stepLightbox(1); });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target === lbStage) closeLightbox();
    });

    // swipe
    var px = null;
    lbStage.addEventListener('pointerdown', function (e) { px = e.clientX; });
    lbStage.addEventListener('pointerup', function (e) {
      if (px === null) return;
      var dx = e.clientX - px;
      px = null;
      if (Math.abs(dx) > 40) stepLightbox(dx < 0 ? 1 : -1);
    });

    preload(lbIndex);
  }

  function preload(i) {
    if (!plates.length) return;
    var next = plates[(i + 1) % plates.length];
    if (next) { var im = new Image(); im.src = next.full; }
  }

  function renderLightbox() {
    var p = plates[lbIndex];
    if (!p) return;
    lbImg.src = p.full;
    lbImg.alt = p.alt;
    lbImg.width = p.w;
    lbImg.height = p.h;
    lbNo.textContent = p.no;
    lbTitle.textContent = '\u201C' + p.title + '\u201D';
    lbMeta.textContent = p.meta;
    lbCounter.textContent = p.no + ' / ' + String(plates.length).padStart(2, '0');
    preload(lbIndex);
  }

  function openLightbox(index, opener) {
    if (!plates.length) return;
    if (!lb) buildLightbox();
    lbIndex = index;
    lbOpener = opener || null;
    renderLightbox();
    lb.hidden = false;
    root.classList.add('lb-open');
    lbClose.focus();
  }

  function closeLightbox() {
    if (!lb || lb.hidden) return;
    lb.hidden = true;
    root.classList.remove('lb-open');
    if (lbOpener && doc.contains(lbOpener)) lbOpener.focus();
    lbOpener = null;
  }

  function stepLightbox(dir) {
    var n = plates.length;
    lbIndex = (lbIndex + dir + n) % n;
    renderLightbox();
  }

  doc.addEventListener('keydown', function (e) {
    if (!lb || lb.hidden) return;
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeLightbox();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        stepLightbox(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        stepLightbox(1);
        break;
      case 'Home':
        e.preventDefault();
        lbIndex = 0;
        renderLightbox();
        break;
      case 'End':
        e.preventDefault();
        lbIndex = plates.length - 1;
        renderLightbox();
        break;
      case 'Tab': {
        var focusables = [lbClose, lbPrev, lbNext];
        var i = focusables.indexOf(doc.activeElement);
        if (e.shiftKey) {
          if (i <= 0) { e.preventDefault(); focusables[focusables.length - 1].focus(); }
        } else if (i === focusables.length - 1 || i === -1) {
          e.preventDefault();
          focusables[0].focus();
        }
        break;
      }
    }
  });

  doc.addEventListener('click', function (e) {
    var btn = e.target.closest('.plate__open[data-index]');
    if (!btn) return;
    var i = parseInt(btn.getAttribute('data-index'), 10);
    openLightbox(isNaN(i) ? 0 : i, btn);
  });

  /* ---------------------------------------------------------- wall/frames modes */

  var body = doc.body;
  var tabWall = doc.getElementById('tab-wall');
  var tabFrames = doc.getElementById('tab-frames');
  var modeHint = doc.getElementById('mode-hint');
  var HINTS = {
    wall: 'You are browsing the wall \u2014 click any plate to open it.',
    frames: 'You are browsing the frames \u2014 swipe sideways or use the arrows.'
  };

  function setMode(mode, scroll) {
    body.setAttribute('data-mode', mode);
    if (tabWall && tabFrames) {
      tabWall.setAttribute('aria-pressed', mode === 'wall' ? 'true' : 'false');
      tabFrames.setAttribute('aria-pressed', mode === 'frames' ? 'true' : 'false');
    }
    if (modeHint && HINTS[mode]) modeHint.textContent = HINTS[mode];
    if (scroll && mode === 'frames') {
      var frames = doc.getElementById('frames');
      if (frames) {
        var y = frames.getBoundingClientRect().top + window.pageYOffset - 70;
        window.scrollTo({ top: y, behavior: scrollBehavior() });
      }
    }
  }

  if (tabWall && tabFrames) {
    if (window.location.hash === '#frames') {
      setMode('frames', true);
    } else {
      body.setAttribute('data-mode', 'wall');
    }
    tabWall.addEventListener('click', function () { setMode('wall', false); });
    tabFrames.addEventListener('click', function () { setMode('frames', true); });
    window.addEventListener('hashchange', function () {
      if (window.location.hash === '#frames') setMode('frames', true);
    });
  }

  /* ---------------------------------------------------------- frames strip */

  var track = doc.getElementById('frames-track');
  if (track && plates.length) {
    var framesEls = Array.prototype.slice.call(track.querySelectorAll('.plate.frame'));
    var counter = doc.getElementById('frames-counter');

    function frameAt(i) { return framesEls[(i + framesEls.length) % framesEls.length]; }

    function currentFrameIndex() {
      var center = track.scrollLeft + track.clientWidth / 2;
      var best = 0, bestDist = Infinity;
      framesEls.forEach(function (el, i) {
        var c = el.offsetLeft + el.offsetWidth / 2;
        var d = Math.abs(c - center);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    function goToFrame(i) {
      var el = frameAt(i);
      if (!el) return;
      track.scrollTo({
        left: el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2,
        behavior: scrollBehavior()
      });
    }

    var prevBtn = doc.getElementById('frames-prev');
    var nextBtn = doc.getElementById('frames-next');
    if (prevBtn) prevBtn.addEventListener('click', function () { goToFrame(currentFrameIndex() - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goToFrame(currentFrameIndex() + 1); });

    // counter follows the frame nearest the track centre (scroll-driven)
    if (counter) {
      var pad2 = function (n) { return String(n).padStart(2, '0'); };
      var updateCounter = function () {
        counter.textContent = pad2(currentFrameIndex() + 1) + ' / ' + pad2(framesEls.length);
      };
      var ticking = false;
      track.addEventListener('scroll', function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(function () {
            ticking = false;
            updateCounter();
          });
        }
      }, { passive: true });
      updateCounter();
    }

    track.addEventListener('keydown', function (e) {
      var cur = currentFrameIndex();
      if (e.key === 'ArrowRight') { e.preventDefault(); goToFrame(cur + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goToFrame(cur - 1); }
      else if (e.key === 'Home') { e.preventDefault(); goToFrame(0); }
      else if (e.key === 'End') { e.preventDefault(); goToFrame(framesEls.length - 1); }
    });

    // drag-to-scroll for mouse users; touch already scrolls natively
    var dragging = false, dragMoved = false, startX = 0, startLeft = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true;
      dragMoved = false;
      startX = e.clientX;
      startLeft = track.scrollLeft;
      track.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 6) dragMoved = true;
      if (dragMoved) {
        track.classList.add('no-snap');
        track.scrollLeft = startLeft - dx;
      }
    });
    window.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging', 'no-snap');
      if (dragMoved) goToFrame(currentFrameIndex());
    });
    track.addEventListener('click', function (e) {
      if (dragMoved) {
        e.preventDefault();
        e.stopPropagation();
        dragMoved = false;
      }
    }, true);
  }

  /* ---------------------------------------------------------- enquiry form */

  var form = doc.getElementById('enquiry');
  if (form) {
    var select = doc.getElementById('f-package');
    var note = doc.getElementById('form-note');
    // preselect from ?package=
    try {
      var q = new URLSearchParams(window.location.search).get('package');
      if (q && select) {
        var wanted = q.charAt(0).toUpperCase() + q.slice(1).toLowerCase();
        Array.prototype.forEach.call(select.options, function (opt) {
          if (opt.text.indexOf(wanted) === 0) select.value = opt.value || opt.text;
        });
      }
    } catch (err) { /* query parsing is best-effort */ }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = doc.getElementById('f-name').value.trim();
      var email = doc.getElementById('f-email').value.trim();
      var pack = select ? select.value : '';
      var message = doc.getElementById('f-message').value.trim();
      var subject = 'Session enquiry' + (name ? ' \u2014 ' + name : '');
      var bodyText =
        'Name: ' + name + '\n' +
        'Email: ' + email + '\n' +
        'Session: ' + pack + '\n\n' +
        message;
      var href = 'mailto:alwin@shutterhausvisuals.co.za?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(bodyText);
      if (note) {
        note.hidden = false;
        note.textContent = 'Your mail app should open with the enquiry filled in. If nothing happened, email alwin@shutterhausvisuals.co.za directly or send a WhatsApp message.';
      }
      window.location.href = href;
    });
  }
})();
