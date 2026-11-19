/* SILENT PRESS — all behaviour and artwork generation. No dependencies. */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 720;
  var H = 1000;

  var PRESETS = [
    { seed: 1204, structure: 'grid', density: 6, scale: 100, negative: false, guides: false },
    { seed: 88117, structure: 'orbit', density: 8, scale: 112, negative: false, guides: false },
    { seed: 3902, structure: 'stack', density: 4, scale: 92, negative: false, guides: true },
    { seed: 77123, structure: 'grid', density: 7, scale: 105, negative: true, guides: false },
    { seed: 5028, structure: 'orbit', density: 3, scale: 86, negative: false, guides: true },
    { seed: 64109, structure: 'stack', density: 9, scale: 120, negative: false, guides: false }
  ];

  function clamp(value, min, max) {
    value = Number(value);
    if (!isFinite(value)) value = min;
    return Math.max(min, Math.min(max, value));
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function fmt(value) { return Math.round(value * 10) / 10; }
  function zero(number, length) { return String(number).padStart(length, '0'); }

  function normalize(raw) {
    raw = raw || {};
    return {
      seed: Math.floor(clamp(raw.seed, 0, 999999)),
      structure: ['grid', 'orbit', 'stack'].indexOf(raw.structure) >= 0 ? raw.structure : 'grid',
      density: Math.floor(clamp(raw.density, 1, 10)),
      scale: Math.floor(clamp(raw.scale, 60, 140)),
      negative: !!raw.negative,
      guides: !!raw.guides
    };
  }

  function encodeSettings(s) {
    return [s.seed, s.structure, s.density, s.scale, s.negative ? 1 : 0, s.guides ? 1 : 0].join('-');
  }

  function decodeSettings(code) {
    if (!code) return null;
    var p = code.split('-');
    if (p.length !== 6 || !/^\d+$/.test(p[0])) return null;
    return normalize({
      seed: p[0], structure: p[1], density: p[2], scale: p[3],
      negative: p[4] === '1', guides: p[5] === '1'
    });
  }

  /* Build a complete monochrome poster as an SVG string. */
  function buildPoster(input, options) {
    var s = normalize(input);
    var opts = options || {};
    var id = String(opts.id || 'poster').replace(/[^a-z0-9]/gi, '');
    var thumb = !!opts.thumb;
    var rng = mulberry32(s.seed * 2654435761 + s.density * 7919);
    var ink = s.negative ? '#ffffff' : '#0a0a0a';
    var paper = s.negative ? '#0a0a0a' : '#ffffff';
    var scale = s.scale / 100;
    var density = s.density;
    var mono = 'ui-monospace, Menlo, Consolas, monospace';
    var sans = 'Helvetica Neue, Helvetica, Arial, sans-serif';
    var out = [];
    var glyph = zero(s.seed % 100, 2);

    function text(x, y, value, size, anchor, weight, family, spacing) {
      return '<text x="' + fmt(x) + '" y="' + fmt(y) + '" fill="' + ink + '"' +
        ' font-family="' + (family || mono) + '" font-size="' + fmt(size) + '"' +
        ' font-weight="' + (weight || 400) + '"' +
        ' letter-spacing="' + (spacing || 0) + '"' +
        (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + value + '</text>';
    }

    function hatch(x, y, w, h, step, key) {
      var lines = '';
      for (var i = -h; i < w; i += step) {
        lines += '<path d="M' + fmt(x + i) + ' ' + fmt(y + h) + 'L' + fmt(x + i + h) + ' ' + fmt(y) + '"/>';
      }
      return '<g clip-path="url(#clip' + id + key + ')" stroke="' + ink + '" stroke-width="1" opacity=".85">' +
        '<defs><clipPath id="clip' + id + key + '"><rect x="' + fmt(x) + '" y="' + fmt(y) + '" width="' + fmt(w) + '" height="' + fmt(h) + '"/></clipPath></defs>' +
        lines + '</g>';
    }

    out.push('<rect width="' + W + '" height="' + H + '" fill="' + paper + '"/>');
    out.push('<defs><clipPath id="frame' + id + '"><rect x="50" y="96" width="620" height="742"/></clipPath></defs>');
    out.push('<rect x="28" y="28" width="664" height="944" fill="none" stroke="' + ink + '" stroke-width="1.5"/>');

    if (s.guides) {
      out.push('<g stroke="' + ink + '" stroke-width=".5" stroke-dasharray="4 6" opacity=".5">');
      out.push('<path d="M50 96V902M670 96V902M50 96H670M50 902H670M360 96V902M50 499H670"/>');
      out.push('</g>');
    }

    out.push(text(50, 68, 'SILENT PRESS', 12, null, 700, mono, 2));
    out.push(text(670, 68, 'NO. ' + zero(s.seed, 6), 12, 'end', 400, mono, 2));
    out.push('<path d="M50 82H670" stroke="' + ink + '" stroke-width="1"/>');

    out.push('<g clip-path="url(#frame' + id + ')">');

    if (s.structure === 'grid') {
      var cols = Math.round(3 + density / 2);
      var rows = Math.round(4 + density / 1.5);
      var cw = 620 / cols;
      var ch = 742 / rows;
      out.push('<g stroke="' + ink + '" stroke-width=".5" opacity=".38">');
      for (var c = 1; c < cols; c++) out.push('<path d="M' + fmt(50 + c * cw) + ' 96V838"/>');
      for (var r = 1; r < rows; r++) out.push('<path d="M50 ' + fmt(96 + r * ch) + 'H670"/>');
      out.push('</g>');

      for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
          var x = 50 + col * cw;
          var y = 96 + row * ch;
          var chance = rng();
          if (chance < 0.14 + density * 0.022) {
            out.push('<rect x="' + fmt(x + 2) + '" y="' + fmt(y + 2) + '" width="' + fmt(cw - 4) + '" height="' + fmt(ch - 4) + '" fill="' + ink + '"/>');
          } else if (chance < 0.32 + density * 0.025) {
            out.push(hatch(x + 2, y + 2, cw - 4, ch - 4, 9, 'g' + row + col));
          } else if (chance < 0.44 + density * 0.02) {
            out.push('<circle cx="' + fmt(x + cw / 2) + '" cy="' + fmt(y + ch / 2) + '" r="' + fmt(Math.min(cw, ch) * 0.33) + '" fill="none" stroke="' + ink + '" stroke-width="2"/>');
          }
        }
      }
      out.push(text(58, 806, glyph, 250 * scale, null, 800, sans, -16));
      out.push('<rect x="58" y="820" width="118" height="4" fill="' + ink + '"/>');
    }

    if (s.structure === 'orbit') {
      var cx = 360;
      var cy = 468;
      var radius = 292 * Math.min(scale, 1.15);
      out.push('<g fill="none" stroke="' + ink + '">');
      out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + fmt(radius) + '" stroke-width="2"/>');
      out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + fmt(radius * 0.78) + '" stroke-width="1"/>');
      out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + fmt(radius * 0.55) + '" stroke-width="1" stroke-dasharray="3 7"/>');
      out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + fmt(radius * 0.32) + '" stroke-width="1"/>');
      out.push('</g>');
      for (var spoke = 0; spoke < 12 + density * 3; spoke++) {
        var angle = (spoke / (12 + density * 3)) * Math.PI * 2 + rng() * 0.08;
        var r1 = radius * (0.82 + rng() * 0.16);
        var r2 = radius * (0.9 + rng() * 0.1);
        out.push('<path d="M' + fmt(cx + Math.cos(angle) * r1) + ' ' + fmt(cy + Math.sin(angle) * r1) +
          'L' + fmt(cx + Math.cos(angle) * r2) + ' ' + fmt(cy + Math.sin(angle) * r2) + '" stroke="' + ink + '" stroke-width="' + fmt(1 + rng() * 3) + '"/>');
        if (rng() > 0.45) {
          out.push('<circle cx="' + fmt(cx + Math.cos(angle) * radius * 0.78) + '" cy="' + fmt(cy + Math.sin(angle) * radius * 0.78) + '" r="' + fmt(2 + rng() * 5) + '" fill="' + ink + '"/>');
        }
      }
      out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + fmt(60 * scale) + '" fill="' + ink + '"/>');
      out.push('<text x="' + cx + '" y="' + fmt(cy + 25 * scale) + '" text-anchor="middle" fill="' + paper +
        '" font-family="' + sans + '" font-size="' + fmt(64 * scale) + '" font-weight="800" letter-spacing="-4">SP</text>');
      out.push(text(50, 144, 'ORBITAL STUDIES', 11, null, 600, mono, 2));
      out.push(text(670, 816, 'R = ' + zero(s.seed % 1000, 3), 11, 'end', 400, mono, 2));
    }

    if (s.structure === 'stack') {
      var bands = 4 + Math.floor(density / 2);
      var top = 96;
      var total = 742;
      for (var b = 0; b < bands; b++) {
        var bandH = total / bands * (0.62 + rng() * 0.76);
        if (top + bandH > 838) bandH = 838 - top;
        if (bandH <= 2) break;
        var kind = rng();
        if (kind < 0.34) {
          out.push('<rect x="50" y="' + fmt(top) + '" width="620" height="' + fmt(bandH) + '" fill="' + ink + '"/>');
        } else if (kind < 0.62) {
          out.push(hatch(50, top, 620, bandH, 11, 'b' + b));
        } else {
          out.push('<rect x="50" y="' + fmt(top) + '" width="620" height="' + fmt(bandH) + '" fill="none" stroke="' + ink + '" stroke-width="1"/>');
          out.push(text(70, top + bandH * 0.7, String.fromCharCode(65 + ((s.seed + b) % 26)), Math.min(bandH * 0.72, 130 * scale), null, 800, sans, -6));
        }
        top += bandH + 6;
      }
      out.push('<rect x="50" y="760" width="220" height="78" fill="' + paper + '"/>');
      out.push(text(58, 822, glyph, 96 * scale, null, 800, sans, -6));
    }

    out.push('</g>');
    out.push('<path d="M50 902H670" stroke="' + ink + '" stroke-width="1"/>');
    out.push(text(50, 930, 'A STUDY IN SUBTRACTION', 11, null, 600, mono, 1.5));
    out.push(text(50, 964, 'MMXXVI / ' + s.structure.toUpperCase() + ' / D' + s.density, 10, null, 400, mono, 1));

    for (var bar = 0; bar < 26; bar++) {
      var bh = 8 + rng() * 18;
      out.push('<rect x="' + fmt(360 + bar * 6) + '" y="' + fmt(922 - bh) + '" width="2" height="' + fmt(bh) + '" fill="' + ink + '"/>');
    }
    out.push(text(670, 964, zero(Math.floor(s.scale), 3) + '%', 10, 'end', 400, mono, 1));

    if (!thumb) {
      out.push('<filter id="grain' + id + '" x="0" y="0" width="100%" height="100%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="' + (s.seed % 999) + '"/>' +
        '<feColorMatrix type="saturate" values="0"/>' +
        '<feComponentTransfer><feFuncA type="linear" slope="0.32"/></feComponentTransfer></filter>');
      out.push('<rect width="' + W + '" height="' + H + '" filter="url(#grain' + id + ')" opacity=".16" pointer-events="none"/>');
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H +
      '" role="img" aria-label="Monochrome poster, ' + s.structure + ' composition, edition ' + s.seed + '">' + out.join('') + '</svg>';
  }

  /* ---------- Controls ---------- */

  var seedInput = $('#seed');
  var densityInput = $('#density');
  var scaleInput = $('#scale');
  var negativeInput = $('#negative');
  var guidesInput = $('#guides');
  var preview = $('#poster-preview');
  var status = $('#status');
  var caption = $('#preview-caption');
  var densityOut = $('#density-out');
  var scaleOut = $('#scale-out');
  var noticeTimer;

  function readSettings() {
    var structure = $('input[name="structure"]:checked');
    return normalize({
      seed: seedInput.value,
      structure: structure ? structure.value : 'grid',
      density: densityInput.value,
      scale: scaleInput.value,
      negative: negativeInput.checked,
      guides: guidesInput.checked
    });
  }

  function writeSettings(s) {
    seedInput.value = s.seed;
    var radio = $('input[name="structure"][value="' + s.structure + '"]');
    if (radio) radio.checked = true;
    densityInput.value = s.density;
    scaleInput.value = s.scale;
    negativeInput.checked = s.negative;
    guidesInput.checked = s.guides;
  }

  function announce(message) {
    status.textContent = message;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () { status.textContent = ''; }, 6000);
  }

  function syncUrl(s) {
    try {
      var url = location.href.split('#')[0].split('?')[0] + '?p=' + encodeSettings(s);
      history.replaceState(null, '', url);
    } catch (error) { /* file URLs may disallow history updates */ }
  }

  function render(sync) {
    var s = readSettings();
    preview.innerHTML = buildPoster(s, { id: 'proof' });
    densityOut.textContent = s.density;
    scaleOut.textContent = s.scale + '%';
    caption.textContent = 'EDITION ' + zero(s.seed, 4) + ' · ' + s.structure.toUpperCase() + ' · DENSITY ' + s.density;
    preview.setAttribute('aria-label', 'Generated monochrome poster preview: ' + s.structure + ' composition, edition ' + s.seed + (s.negative ? ', negative ink' : ''));
    if (sync !== false) syncUrl(s);
  }

  function randomSeed() {
    if (window.crypto && window.crypto.getRandomValues) {
      return window.crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
    }
    return Math.floor(Math.random() * 1000000);
  }

  function shuffle() {
    seedInput.value = randomSeed();
    render();
    announce('New edition ' + seedInput.value + '. Proof updated.');
  }

  var fromUrl = decodeSettings(new URLSearchParams(location.search).get('p'));
  if (fromUrl) writeSettings(fromUrl);

  PRESETS.forEach(function (preset, index) {
    var holder = $('[data-thumb="' + index + '"]');
    if (holder) holder.innerHTML = buildPoster(preset, { id: 'thumb' + index, thumb: true });
  });

  render(false);

  $$('input, button', $('#studio-form')).forEach(function (field) {
    if (field.type === 'number' || field.type === 'range' || field.type === 'radio' || field.type === 'checkbox') {
      field.addEventListener('input', function () { render(); });
      field.addEventListener('change', function () { render(); });
    }
  });

  seedInput.addEventListener('change', function () {
    seedInput.value = Math.floor(clamp(seedInput.value, 0, 999999));
    render();
  });

  $('[data-shuffle]').addEventListener('click', shuffle);

  $$('[data-preset]').forEach(function (button) {
    button.addEventListener('click', function () {
      var preset = PRESETS[Number(button.getAttribute('data-preset'))];
      if (!preset) return;
      writeSettings(preset);
      render();
      $('#studio').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      seedInput.focus({ preventScroll: true });
      announce(button.querySelector('strong').textContent + ' loaded into the studio.');
    });
  });

  $('[data-download]').addEventListener('click', function () {
    var s = readSettings();
    var markup = '<?xml version="1.0" encoding="UTF-8"?>\n' + buildPoster(s, { id: 'edition' });
    var blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'silent-press-' + zero(s.seed, 6) + '.svg';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    announce('Poster ' + zero(s.seed, 6) + '.svg downloaded.');
  });

  $('[data-copy-link]').addEventListener('click', function () {
    var s = readSettings();
    var link = location.href.split('#')[0].split('?')[0] + '?p=' + encodeSettings(s);
    var done = function () { announce('Link to this exact edition copied to clipboard.'); };
    var failed = function () { announce('Clipboard unavailable. Settings link: ' + link); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done, failed);
    } else {
      var area = document.createElement('textarea');
      area.value = link;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var copied = false;
      try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
      area.remove();
      copied ? done() : failed();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && $('#primary-nav').classList.contains('is-open')) {
      closeMenu();
      return;
    }
    var tag = (event.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || event.target.isContentEditable;
    if (!typing && !event.metaKey && !event.ctrlKey && !event.altKey && (event.key === 'r' || event.key === 'R')) {
      event.preventDefault();
      shuffle();
    }
  });

  /* ---------- Page chrome ---------- */

  var invertButton = $('[data-invert]');
  invertButton.addEventListener('click', function () {
    var inverted = document.documentElement.classList.toggle('inverted');
    invertButton.setAttribute('aria-pressed', String(inverted));
    invertButton.setAttribute('aria-label', inverted ? 'Restore page colours' : 'Invert page colours');
    $('[data-invert-label]').textContent = inverted ? 'Restore' : 'Invert';
  });

  var menuButton = $('[data-menu]');
  var nav = $('#primary-nav');
  function closeMenu() {
    nav.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation menu');
  }
  menuButton.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  });
  $$('a', nav).forEach(function (link) { link.addEventListener('click', closeMenu); });
  document.addEventListener('click', function (event) {
    if (!nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });

  var lens = $('[data-lens]');
  if (lens && window.matchMedia('(hover: hover)').matches && !reduced) {
    lens.addEventListener('pointermove', function (event) {
      var box = lens.getBoundingClientRect();
      lens.style.setProperty('--mx', (event.clientX - box.left) + 'px');
      lens.style.setProperty('--my', (event.clientY - box.top) + 'px');
    });
    lens.addEventListener('pointerleave', function () {
      lens.style.setProperty('--mx', '-400px');
      lens.style.setProperty('--my', '-400px');
    });
  }

  var grainCanvas = document.createElement('canvas');
  grainCanvas.width = grainCanvas.height = 128;
  var grainCtx = grainCanvas.getContext('2d');
  if (grainCtx) {
    var image = grainCtx.createImageData(128, 128);
    for (var pixel = 0; pixel < image.data.length; pixel += 4) {
      var tone = Math.random() > 0.5 ? 0 : 255;
      image.data[pixel] = tone;
      image.data[pixel + 1] = tone;
      image.data[pixel + 2] = tone;
      image.data[pixel + 3] = 22 + Math.floor(Math.random() * 26);
    }
    grainCtx.putImageData(image, 0, 0);
    $('.grain').style.backgroundImage = 'url(' + grainCanvas.toDataURL('image/png') + ')';
    $('.grain').style.backgroundSize = '128px 128px';
  }

  var reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (element) { revealObserver.observe(element); });
  } else {
    reveals.forEach(function (element) { element.classList.add('is-visible'); });
  }

  var navLinks = $$('a[href^="#"]', nav);
  if ('IntersectionObserver' in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          if (link.getAttribute('href') === '#' + entry.target.id) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['manifest', 'grammar', 'editions', 'studio', 'colophon'].forEach(function (id) {
      var section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    });
  }

  var ticking = false;
  function updateProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var progress = max > 0 ? (window.scrollY / max) * 100 : 0;
    document.documentElement.style.setProperty('--progress', Math.min(100, Math.max(0, progress)) + '%');
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();
})();
