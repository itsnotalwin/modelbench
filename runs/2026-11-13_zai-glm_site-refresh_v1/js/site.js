/* Shutterhaus Visuals — production site refresh behaviours.
   Static-first: every page is complete without this file. No dependencies,
   no network, no console output. */
(function () {
  'use strict';

  var doc = document;
  doc.documentElement.classList.add('js');

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduce = false; }

  /* ------------------------------------------------------------------ */
  /* Scroll-driven plate settling + the film counter (portfolio wall).   */
  /* ------------------------------------------------------------------ */
  (function () {
    var plates = doc.querySelectorAll('.plate');
    if (!plates.length) return;
    var counter = doc.getElementById('filmcount');

    function settle(p) { p.classList.add('is-in'); }

    if ('IntersectionObserver' in window && !reduce) {
      var reveal = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            settle(entries[i].target);
            reveal.unobserve(entries[i].target);
          }
        }
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
      Array.prototype.forEach.call(plates, function (p) { reveal.observe(p); });

      if (counter) {
        var track = new IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            var en = entries[i];
            if (en.isIntersecting) {
              var no = en.target.getAttribute('data-no') || '';
              var title = en.target.getAttribute('data-title') || '';
              counter.textContent = (no ? no + ' — ' : '') + title;
            }
          }
        }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
        Array.prototype.forEach.call(plates, function (p) { track.observe(p); });
      }
    } else {
      Array.prototype.forEach.call(plates, settle);
    }
  })();

  /* ------------------------------------------------------------------ */
  /* Keyboard lightbox. Plates are real links first: without this script */
  /* (or in old engines) they open the plate file directly.              */
  /* ------------------------------------------------------------------ */
  (function () {
    var box = doc.getElementById('lightbox');
    if (!box || typeof box.showModal !== 'function') return;

    var page = doc.getElementById('page');
    var img = doc.getElementById('lb-img');
    var title = doc.getElementById('lb-title');
    var meta = doc.getElementById('lb-meta');
    var count = doc.getElementById('lb-count');
    var live = doc.getElementById('lb-live');
    var zoomBtn = doc.getElementById('lb-zoom');
    var triggers = Array.prototype.slice.call(doc.querySelectorAll('.wall .plate-media'));
    if (!triggers.length) return;

    var at = -1;
    var opener = null;
    var zoomed = false;

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    function show(i) {
      var total = triggers.length;
      at = (i + total) % total;
      var link = triggers[at];
      var fig = link.closest('.plate');
      var thumb = link.querySelector('img');
      img.removeAttribute('src');
      img.setAttribute('src', link.getAttribute('href'));
      img.setAttribute('alt', thumb ? thumb.getAttribute('alt') : '');
      if (thumb) {
        img.setAttribute('width', thumb.getAttribute('width'));
        img.setAttribute('height', thumb.getAttribute('height'));
      }
      title.textContent = fig ? fig.getAttribute('data-title') || '' : '';
      var capMeta = fig ? fig.querySelector('.plate-meta') : null;
      meta.textContent = capMeta ? capMeta.textContent : '';
      var no = fig ? fig.getAttribute('data-no') || '' : '';
      count.textContent = pad2(Number(no) || at + 1) + ' / ' + pad2(total);
      if (live) {
        live.textContent = 'Plate ' + (Number(no) || at + 1) + ' of ' + total + '. ' +
          title.textContent + '. ' + meta.textContent;
      }
    }

    function setZoom(on) {
      zoomed = on;
      box.classList.toggle('lb--zoomin', zoomed);
      zoomBtn.setAttribute('aria-pressed', String(zoomed));
      zoomBtn.textContent = zoomed ? 'Zoom out' : 'Zoom';
    }

    function open(i, anchor) {
      if (box.open) { show(i); return; }
      opener = anchor instanceof HTMLElement ? anchor :
               (triggers[i] instanceof HTMLElement ? triggers[i] : null);
      show(i);
      setZoom(false);
      doc.body.classList.add('plate-open');
      if (page) page.inert = true;
      box.showModal();
      doc.getElementById('lb-close').focus();
    }

    function close() {
      if (!box.open) return;
      box.close();
    }

    box.addEventListener('close', function () {
      doc.body.classList.remove('plate-open');
      if (page) page.inert = false;
      if (opener && doc.contains(opener)) opener.focus({ preventScroll: true });
      opener = null;
      setZoom(false);
      img.removeAttribute('src');
    });

    doc.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('.plate-media') : null;
      if (link && triggers.indexOf(link) !== -1) {
        e.preventDefault();
        open(triggers.indexOf(link), link);
        return;
      }
      if (e.target === box) { close(); return; }
    });

    doc.getElementById('lb-close').addEventListener('click', close);
    doc.getElementById('lb-prev').addEventListener('click', function () { show(at - 1); });
    doc.getElementById('lb-next').addEventListener('click', function () { show(at + 1); });
    zoomBtn.addEventListener('click', function () { setZoom(!zoomed); });

    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
      else if (e.key === 'Home') { e.preventDefault(); show(0); }
      else if (e.key === 'End') { e.preventDefault(); show(triggers.length - 1); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });

    /* Touch: swipe horizontally to move, pull down to dismiss. */
    var drag = null;
    box.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch' || e.target.closest('button')) return;
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY };
    });
    box.addEventListener('pointerup', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      drag = null;
      if (dy >= 90 && Math.abs(dx) < 60) { close(); return; }
      if (dx <= -48) { show(at + 1); return; }
      if (dx >= 48) { show(at - 1); }
    });
    box.addEventListener('pointercancel', function () { drag = null; });
  })();

  /* ------------------------------------------------------------------ */
  /* Enquiry form: email-app fallback (the studio's own documented        */
  /* no-endpoint mode) + 24-hour draft persistence in tab session.       */
  /* ------------------------------------------------------------------ */
  (function () {
    var form = doc.getElementById('cform');
    if (!form) return;
    var note = doc.getElementById('cform-note');
    var KEY = 'shv-enquiry', DAY = 86400000;
    var FIELDS = ['name', 'email', 'kind', 'message'];

    function read(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
    function write(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
    function drop(k) { try { window.sessionStorage.removeItem(k); } catch (e) {} }

    var raw = read(KEY);
    if (raw) {
      try {
        var saved = JSON.parse(raw);
        if (saved && saved.t && Date.now() - saved.t < DAY && saved.d) {
          FIELDS.forEach(function (k) {
            if (saved.d[k] != null && form.elements[k]) form.elements[k].value = saved.d[k];
          });
        } else { drop(KEY); }
      } catch (e) { drop(KEY); }
    }

    form.addEventListener('input', function () {
      var d = {};
      FIELDS.forEach(function (k) { if (form.elements[k]) d[k] = form.elements[k].value; });
      write(KEY, JSON.stringify({ t: Date.now(), d: d }));
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        if (form.reportValidity) form.reportValidity();
        return;
      }
      var v = function (n) { return form.elements[n] ? form.elements[n].value : ''; };
      var subject = 'Sitting enquiry — ' + (v('name') || 'website');
      var body = 'Name: ' + v('name') + '\n' +
                 'Email: ' + v('email') + '\n' +
                 'Session: ' + v('kind') + '\n\n' +
                 v('message') + '\n';
      drop(KEY);
      if (note) note.textContent =
        'Opening your email app with the note pre-filled. If nothing opens, ' +
        'copy your message to alwin@shutterhausvisuals.co.za.';
      window.location.href = 'mailto:alwin@shutterhausvisuals.co.za?subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  })();

  /* ------------------------------------------------------------------ */
  /* 404: offer the way back when there is one.                          */
  /* ------------------------------------------------------------------ */
  var back = doc.getElementById('back-btn');
  if (back && window.history && window.history.length > 1) {
    back.hidden = false;
    back.addEventListener('click', function () { window.history.back(); });
  }
})();
