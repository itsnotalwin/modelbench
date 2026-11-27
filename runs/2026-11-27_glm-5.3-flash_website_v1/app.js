/* ============================================================
   A FIELD GUIDE TO GREY — one script, everything drawn at home.
   No dependencies, no network, no colour.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- utilities ---------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* colour maths (sRGB, WCAG 2, CIE L*) */
  const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const linearToSrgb = (y) => (y <= 0.0031308 ? y * 12.92 : 1.055 * Math.pow(y, 1 / 2.4) - 0.055);
  const luminanceOfValue = (v) => srgbToLinear(v / 255);
  const lStarOfValue = (v) => {
    const y = luminanceOfValue(v);
    return y <= 0.008856 ? y * 903.3 : 116 * Math.cbrt(y) - 16;
  };
  const valueFromLStar = (L) => {
    const y = L > 8 ? Math.pow((L + 16) / 116, 3) : L / 903.3;
    return clamp(Math.round(linearToSrgb(y) * 255), 0, 255);
  };
  const contrastRatio = (v1, v2) => {
    const a = luminanceOfValue(v1);
    const b = luminanceOfValue(v2);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const hexOf = (v) => '#' + v.toString(16).toUpperCase().padStart(2, '0').repeat(3);
  const readableOn = (v) => (contrastRatio(v, 0) >= contrastRatio(v, 255) ? 0 : 255);

  /* deterministic noise */
  function hash2(ix, iy, seed) {
    let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967295;
  }
  function valueNoise(x, y, seed) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash2(x0, y0, seed);
    const b = hash2(x0 + 1, y0, seed);
    const c = hash2(x0, y0 + 1, seed);
    const d = hash2(x0 + 1, y0 + 1, seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function fbm(x, y, seed, octaves) {
    let v = 0, amp = 0.5, freq = 1, sum = 0;
    for (let i = 0; i < (octaves || 4); i++) {
      v += amp * valueNoise(x * freq, y * freq, seed + i * 101);
      sum += amp; amp *= 0.5; freq *= 2;
    }
    return v / sum;
  }
  function bayerMatrix(n) {
    if (n === 2) return [[0, 2], [3, 1]];
    const half = bayerMatrix(n / 2);
    const m = [];
    for (let y = 0; y < n; y++) {
      m[y] = [];
      for (let x = 0; x < n; x++) {
        const q = half[y % (n / 2)][x % (n / 2)];
        const block = (y < n / 2) ? (x < n / 2 ? 0 : 2) : (x < n / 2 ? 3 : 1);
        m[y][x] = q * 4 + block;
      }
    }
    return m;
  }

  /* ---------------- theme (day / night editions) ---------------- */
  const THEME_KEY = 'fgg-theme';
  function setTheme(t, persist) {
    document.documentElement.setAttribute('data-theme', t);
    const btn = $('#themeToggle');
    if (btn) {
      btn.setAttribute('aria-pressed', t === 'night' ? 'true' : 'false');
      btn.setAttribute('title', t === 'night' ? 'Switch to the day edition' : 'Switch to the night edition');
      const label = $('.btn-label', btn);
      if (label) label.textContent = t === 'night' ? 'Day' : 'Night';
    }
    if (persist) { try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* private mode */ } }
  }
  function initTheme() {
    let t = null;
    try { t = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
    if (t !== 'day' && t !== 'night') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
    }
    setTheme(t, false);
    const btn = $('#themeToggle');
    if (btn) btn.addEventListener('click', () => {
      setTheme(document.documentElement.getAttribute('data-theme') === 'night' ? 'day' : 'night', true);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'g' && e.key !== 'G') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.target && e.target.isContentEditable) return;
      setTheme(document.documentElement.getAttribute('data-theme') === 'night' ? 'day' : 'night', true);
    });
  }

  /* ---------------- reveal on scroll ---------------- */
  function initReveal() {
    const els = $$('.reveal');
    if (prefersReduced.matches || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => io.observe(el));
  }

  /* ---------------- nav spy ---------------- */
  function initNavSpy() {
    const links = $$('.site-nav a[data-spy]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map();
    links.forEach((l) => {
      const sec = $(l.getAttribute('href'));
      if (sec) map.set(sec, l);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const link = map.get(en.target);
        if (link && en.isIntersecting) {
          links.forEach((x) => x.removeAttribute('aria-current'));
          link.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    map.forEach((link, sec) => io.observe(sec));
  }

  /* ---------------- ramp-strip dividers ---------------- */
  function initStrips() {
    $$('.ramp-strip').forEach((strip) => {
      for (let i = 0; i < 32; i++) {
        const cell = document.createElement('div');
        cell.style.background = hexOf(Math.round((i / 31) * 255));
        strip.appendChild(cell);
      }
    });
  }

  /* ============================================================
     CHAPTER I — THE SPECIMENS
     ============================================================ */
  const BANDS = [
    { max: 0, name: 'Black', blurb: 'Zero light. The bottom of the well, the full stop at the end of the ramp.' },
    { max: 15, name: 'Ink', blurb: 'Freshly dried ink — still reading as black, though the tooth of the paper is starting to show.' },
    { max: 31, name: 'Charcoal', blurb: 'Matte and crumbly: the drawing charcoal grey. Heavy, but it holds texture.' },
    { max: 47, name: 'Basalt', blurb: 'Volcanic rock, wet tarmac. A blue-free dark that photographers call “rich”.' },
    { max: 63, name: 'Slate', blurb: 'Roof tiles and storm clouds. Mineral, cool, dependable.' },
    { max: 79, name: 'Graphite', blurb: 'Pencil lead. The working grey — chrome, borders, quiet machinery.' },
    { max: 95, name: 'Gunmetal', blurb: 'Machined metal with oil on it. Industrial, precise, faintly sinister.' },
    { max: 111, name: 'Pewter', blurb: 'Old tableware and temple roofs. A settled, domestic middle-dark.' },
    { max: 127, name: 'Lead', blurb: 'The classic mid grey. The 18 % reflectance “middle grey” that light meters assume lives here.' },
    { max: 143, name: 'Ash', blurb: 'Cold fireplace remains. The first grey that reads as simply “grey” to most eyes.' },
    { max: 159, name: 'Smoke', blurb: 'Exhaust and sea-mist at dusk. Atmospheric — distance lives in this band.' },
    { max: 175, name: 'Fog', blurb: 'London, November, four in the afternoon. Depth without darkness.' },
    { max: 191, name: 'Mist', blurb: 'Breath on cold glass. Backgrounds, skies, the grey of distance.' },
    { max: 207, name: 'Haze', blurb: 'Nearly air. Horizon haze; overexposed highlights losing their edge.' },
    { max: 223, name: 'Pearl', blurb: 'Lustrous and dense: paper whites with weight, the nacre of buttons.' },
    { max: 239, name: 'Chalk', blurb: 'Matte mineral white. The chalkboard’s opposite — tooth without shine.' },
    { max: 254, name: 'Bone', blurb: 'Bone and unbleached paper. The last grey before the page.' },
    { max: 255, name: 'White', blurb: 'Full light. The paper itself. Type is knocked out of it; nothing prints brighter.' }
  ];
  const FIELD_NOTES = {
    0: 'Pure black, #000000. The ramp’s floor: the deepest tone ink can lay, and the reason OLED screens exist.',
    17: '#111111 — the web’s polite near-black. Kinder on the eye than pure black for long reading.',
    34: '#222222 — one generous step up. A favourite for headings that should not shout.',
    51: '#333333 — possibly the most typed grey in web history. Roughly 12.6 : 1 on white: effortless AA, most of the way to AAA.',
    89: '#595959 — squeaks past AAA on white at 7.0 : 1. The “dark enough for everything” grey.',
    118: '#767676 — the lightest grey that passes AA for body text on pure white (4.54 : 1). Borderline famous; lint tools quote it by name.',
    128: '#808080 — CSS gray, the web’s default middle. Fails AA on white at 3.95 : 1, by a hair.',
    169: '#A9A9A9 — CSS darkgray, which is lighter than gray. CSS naming has never recovered.',
    192: '#C0C0C0 — CSS silver. The classic hairline and chrome grey of the early web.',
    204: '#CCCCCC — the quintessential border grey. Fails contrast for text; excels for rules.',
    238: '#EEEEEE — the universal hover state of the 2000s web.',
    255: 'Pure white, #FFFFFF. The ramp’s ceiling: unprinted paper, the blank plate, the page you began on.'
  };

  function chipFor(ratio) {
    if (ratio >= 7) return { cls: 'pass', txt: 'AAA' };
    if (ratio >= 4.5) return { cls: 'pass', txt: 'AA' };
    if (ratio >= 3) return { cls: 'warn', txt: 'AA · LARGE' };
    return { cls: 'fail', txt: 'FAIL' };
  }

  function initSpecimens() {
    const grid = $('#rampGrid');
    const slider = $('#rampSlider');
    const readout = $('#specReadout');
    const status = $('#specStatus');
    if (!grid || !slider) return;

    /* build the 256-cell plate */
    const cells = [];
    for (let v = 0; v <= 255; v++) {
      const cell = document.createElement('div');
      const band = BANDS.find((b) => v <= b.max);
      cell.className = 'ramp-cell';
      cell.id = 'sp-' + v;
      cell.setAttribute('role', 'option');
      cell.setAttribute('aria-selected', 'false');
      cell.setAttribute('aria-label', v + ' — ' + hexOf(v) + ' · ' + band.name);
      cell.dataset.v = String(v);
      cell.style.background = hexOf(v);
      cell.style.setProperty('--m', hexOf(readableOn(v)));
      grid.appendChild(cell);
      cells.push(cell);
    }

    let current = 118;
    let prevCell = null;

    function select(v) {
      current = clamp(v, 0, 255);
      const band = BANDS.find((b) => current <= b.max);
      const cell = cells[current];
      if (prevCell) prevCell.setAttribute('aria-selected', 'false');
      cell.setAttribute('aria-selected', 'true');
      grid.setAttribute('aria-activedescendant', cell.id);
      prevCell = cell;
      slider.value = String(current);

      const swatch = $('#specSwatch');
      if (swatch) {
        swatch.style.background = hexOf(current);
        swatch.style.setProperty('--m', hexOf(readableOn(current)));
      }
      $('#specNo').textContent = '№ ' + current + ' / 255';
      $('#specName').textContent = band.name;
      $('#specHex').textContent = hexOf(current);
      $('#specRGB').textContent = current + ' · ' + current + ' · ' + current;
      $('#specLstar').textContent = lStarOfValue(current).toFixed(1);
      $('#specLum').textContent = (luminanceOfValue(current) * 100).toFixed(1) + '%';

      const cb = contrastRatio(current, 0);
      const cw = contrastRatio(current, 255);
      const chipB = chipFor(cb);
      const chipW = chipFor(cw);
      $('#specVsBlack').innerHTML =
        '<span class="ratio-v">' + cb.toFixed(2) + ' : 1</span><span class="chip ' + chipB.cls + '">' + chipB.txt + '</span>';
      $('#specVsWhite').innerHTML =
        '<span class="ratio-v">' + cw.toFixed(2) + ' : 1</span><span class="chip ' + chipW.cls + '">' + chipW.txt + '</span>';

      $('#specBand').textContent = band.blurb;

      const noteWrap = $('#specNoteWrap');
      const note = FIELD_NOTES[current];
      if (noteWrap) {
        if (note) { $('#specNote').textContent = note; noteWrap.hidden = false; }
        else { noteWrap.hidden = true; }
      }

      if (readout) readout.textContent = '№ ' + current + ' · ' + hexOf(current) + ' · ' + band.name.toUpperCase();
      if (status) status.textContent = current + ', ' + hexOf(current) + ', ' + band.name;
    }

    /* pointer selection */
    grid.addEventListener('click', (e) => {
      const cell = e.target.closest('[data-v]');
      if (cell) select(parseInt(cell.dataset.v, 10));
    });
    /* hover readout */
    grid.addEventListener('pointerover', (e) => {
      const cell = e.target.closest('[data-v]');
      if (!cell || !readout) return;
      const v = parseInt(cell.dataset.v, 10);
      const band = BANDS.find((b) => v <= b.max);
      readout.textContent = 'AT ' + v + ' · ' + hexOf(v) + ' · ' + band.name.toUpperCase();
    });
    grid.addEventListener('pointerleave', () => {
      if (!readout) return;
      const band = BANDS.find((b) => current <= b.max);
      readout.textContent = '№ ' + current + ' · ' + hexOf(current) + ' · ' + band.name.toUpperCase();
    });

    /* keyboard: one tab stop, arrows walk the ramp */
    grid.addEventListener('keydown', (e) => {
      let next = null;
      switch (e.key) {
        case 'ArrowRight': next = current + 1; break;
        case 'ArrowLeft': next = current - 1; break;
        case 'ArrowDown': next = current + 16; break;
        case 'ArrowUp': next = current - 16; break;
        case 'PageDown': next = current + 32; break;
        case 'PageUp': next = current - 32; break;
        case 'Home': next = 0; break;
        case 'End': next = 255; break;
        default: return;
      }
      e.preventDefault();
      select(next);
    });

    /* slider + random */
    slider.addEventListener('input', () => select(parseInt(slider.value, 10)));
    const randomBtn = $('#randomBtn');
    if (randomBtn) randomBtn.addEventListener('click', () => {
      let v = Math.floor(Math.random() * 256);
      if (v === current) v = (v + 1) % 256;
      select(v);
    });

    select(current);
  }

  /* ============================================================
     CHAPTER II — THE ZONES (Adams / Archer, mapped from L*)
     ============================================================ */
  const ZONES = [
    { num: '0', name: 'Total black', body: 'Full black, no detail whatsoever — the deepest a print can go. Adams placed “the shadow side of a coal scuttle at midnight” here.', ex: 'Printed ink at maximum density; the pupil of the eye.' },
    { num: 'I', name: 'Near black', body: 'Slight tone, still without texture. The darkest shadows of a sunlit landscape fall here, and photographers leave them here on purpose.', ex: 'Black paint in shade; the mouth of a well; pine depths on a bright day.' },
    { num: 'II', name: 'Textured black', body: 'The first whisper of detail. Adams placed black hair, the folds of black cloth and deep earthen recesses in Zone II.', ex: 'Folds of black velvet; shadowed bark under full shade.' },
    { num: 'III', name: 'Dark with detail', body: 'Average dark materials with visible texture — the zone where shadow detail must be preserved. Place a shadow below III and its texture dies.', ex: 'Black soil; dark foliage; the shaded side of woods, photographed for texture.' },
    { num: 'IV', name: 'Average dark', body: 'Dark stone, earth, shadowed grass: the darker middle of a landscape. Sunlit foliage sits here, reading as “green” only because we remember colour.', ex: 'Brown earth; dark rocks; summer hedges in sun.' },
    { num: 'V', name: 'Middle grey', body: 'Eighteen per cent reflectance — the grey card, and the value a reflected-light meter assumes everything is. Dark skin in sunlight also reads here.', ex: 'A photographic grey card; weathered wood; sunlit dark skin.' },
    { num: 'VI', name: 'Light with weight', body: 'Average light value with clear texture. Adams calibrated this zone to sunlit skin of lighter complexions, light stone, and snow lying in shadow.', ex: 'Sunlit pale skin; snow in shadow; pale limestone.' },
    { num: 'VII', name: 'Very light', body: 'High values still holding texture: pale skin in bright sun, snow with slight relief on its shadow side.', ex: 'Side-lit snow with visible texture; pale skin at noon.' },
    { num: 'VIII', name: 'White with texture', body: 'Bright surfaces where texture still survives — snow in full sun, white paint, white walls. The last stop before the paper.', ex: 'Full-sun snow; white lacquer with visible grain.' },
    { num: 'IX', name: 'Paper white', body: 'White without texture — the print’s lightest tone short of the base itself. Snow in flat glare, objects that catch no relief.', ex: 'Snow under flat glare; the unprinted margin of a print.' },
    { num: 'X', name: 'Pure white', body: 'The paper base itself, unprinted and unmodulated. Only specular reflections reach it — the sun glinting off chrome.', ex: 'Direct reflections of the light source.' }
  ];

  function initZones() {
    const strip = $('#zoneStrip');
    if (!strip) return;
    const buttons = [];

    ZONES.forEach((z, i) => {
      const v = valueFromLStar(i * 10);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.setAttribute('aria-label', 'Zone ' + z.num + ' — ' + z.name);
      btn.className = 'zone';
      btn.style.background = hexOf(v);
      btn.style.color = hexOf(readableOn(v));
      btn.tabIndex = -1;
      btn.textContent = z.num;
      btn.addEventListener('click', () => setActive(i));
      strip.appendChild(btn);
      buttons.push(btn);
    });

    let activeZone = -1;
    function setActive(i) {
      activeZone = clamp(i, 0, ZONES.length - 1);
      const z = ZONES[activeZone];
      const v = valueFromLStar(activeZone * 10);
      buttons.forEach((b, j) => {
        b.setAttribute('aria-checked', j === activeZone ? 'true' : 'false');
        b.tabIndex = j === activeZone ? 0 : -1;
      });
      $('#zoneNum').textContent = z.num;
      $('#zoneName').textContent = z.name;
      $('#zoneBody').textContent = z.body;
      $('#zoneEx').textContent = z.ex;
      $('#zoneVal').textContent = 'mapped value ' + v + ' · ' + hexOf(v);
    }

    strip.addEventListener('keydown', (e) => {
      let next = null;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': next = activeZone + 1; break;
        case 'ArrowLeft': case 'ArrowUp': next = activeZone - 1; break;
        case 'Home': next = 0; break;
        case 'End': next = ZONES.length - 1; break;
        default: return;
      }
      e.preventDefault();
      setActive((next + ZONES.length) % ZONES.length);
      buttons[activeZone].focus();
    });

    setActive(5);
  }

  /* ============================================================
     CHAPTER III — THE DITHER LABORATORY
     ============================================================ */
  const D_SIZE = 200;
  const SUBJECT_LABELS = { sphere: 'Sphere', dunes: 'Dunes', rings: 'Rings', clouds: 'Clouds' };
  const METHOD_LABELS = { threshold: 'Threshold', bayer4: 'Bayer 4×4', bayer8: 'Bayer 8×8', fs: 'Floyd–Steinberg', atkinson: 'Atkinson' };

  function initDither() {
    const canvas = $('#ditherCanvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    const stats = $('#ditherStats');
    const bayer4 = bayerMatrix(4);
    const bayer8 = bayerMatrix(8);

    const state = {
      source: 'sphere',
      method: 'fs',
      levels: 4,
      seed: 1 + Math.floor(Math.random() * 999999)
    };

    function makeSource() {
      const s = new Float32Array(D_SIZE * D_SIZE);
      const sd = state.seed;
      for (let y = 0; y < D_SIZE; y++) {
        for (let x = 0; x < D_SIZE; x++) {
          let v;
          const w = y / D_SIZE;
          switch (state.source) {
            case 'sphere': {
              const cx = D_SIZE * 0.5, cy = D_SIZE * 0.46, R = D_SIZE * 0.36;
              const dx = (x - cx) / R, dy = (y - cy) / R;
              const r2 = dx * dx + dy * dy;
              if (r2 <= 1) {
                v = 1.02 - r2 * 1.15;
                const sx = (x - (cx - R * 0.35)) / (R * 0.5);
                const sy = (y - (cy - R * 0.42)) / (R * 0.5);
                const spec = Math.max(0, 1 - (sx * sx + sy * sy));
                v += spec * spec * 0.28;
              } else {
                v = 0.10 + w * 0.16;
              }
              break;
            }
            case 'dunes': {
              const n = fbm(x * 0.02, y * 0.014, sd, 4);
              v = n * 0.62 + (1 - w) * 0.22 + 0.06;
              break;
            }
            case 'rings': {
              const dx = x - D_SIZE * 0.5, dy = y - D_SIZE * 0.5;
              const d = Math.sqrt(dx * dx + dy * dy);
              const warp = fbm(x * 0.012, y * 0.012, sd, 3);
              v = (0.5 + 0.5 * Math.sin(d * 0.30 + warp * 7)) * ((1 - Math.min(1, d / (D_SIZE * 0.62))) * 0.85 + 0.12);
              break;
            }
            case 'clouds': {
              v = fbm(x * 0.014, y * 0.014, sd, 5) * 1.25 - 0.08;
              break;
            }
          }
          s[y * D_SIZE + x] = clamp(v, 0, 1);
        }
      }
      return s;
    }

    function dither(src) {
      const L = state.levels;
      const out = new Float32Array(src);
      const res = new Uint8ClampedArray(D_SIZE * D_SIZE);
      const method = state.method;
      const quantize = (v) => Math.round(v * (L - 1)) / (L - 1);

      function push(px, py, e) {
        if (px < 0 || px >= D_SIZE || py < 0 || py >= D_SIZE) return;
        out[py * D_SIZE + px] += e;
      }

      for (let y = 0; y < D_SIZE; y++) {
        for (let x = 0; x < D_SIZE; x++) {
          const i = y * D_SIZE + x;
          const v = out[i];
          let q;
          if (method === 'threshold') {
            q = quantize(clamp(v, 0, 1));
          } else if (method === 'fs' || method === 'atkinson') {
            q = quantize(clamp(v, 0, 1));
            const err = v - q;
            if (method === 'fs') {
              push(x + 1, y, err * 7 / 16);
              push(x - 1, y + 1, err * 3 / 16);
              push(x, y + 1, err * 5 / 16);
              push(x + 1, y + 1, err / 16);
            } else {
              const e6 = err / 8;
              push(x + 1, y, e6);
              push(x + 2, y, e6);
              push(x - 1, y + 1, e6);
              push(x, y + 1, e6);
              push(x + 1, y + 1, e6);
              push(x, y + 2, e6);
            }
          } else {
            const m = method === 'bayer4' ? bayer4 : bayer8;
            const n = m.length;
            const t = (m[y % n][x % n] + 0.5) / (n * n);
            const base = clamp(v, 0, 1) * (L - 1);
            const low = Math.floor(base);
            const frac = base - low;
            q = clamp(low + (frac > t ? 1 : 0), 0, L - 1) / (L - 1);
          }
          res[i] = Math.round(q * 255);
        }
      }
      return res;
    }

    function render() {
      const res = dither(makeSource());
      const img = ctx.createImageData(D_SIZE, D_SIZE);
      const d = img.data;
      for (let i = 0; i < res.length; i++) {
        const g = res[i];
        d[i * 4] = g; d[i * 4 + 1] = g; d[i * 4 + 2] = g; d[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      if (stats) {
        stats.textContent = D_SIZE + ' × ' + D_SIZE + ' px · ' + state.levels + ' tones · ' +
          METHOD_LABELS[state.method] + ' · seed ' + state.seed;
      }
      canvas.setAttribute('aria-label', 'Laboratory plate: ' + SUBJECT_LABELS[state.source] +
        ', rendered in ' + state.levels + ' tones with the ' + METHOD_LABELS[state.method] + ' method.');
    }

    $$('input[name="ditherSubject"]').forEach((r) => r.addEventListener('change', () => {
      state.source = r.value; render();
    }));
    $$('input[name="ditherMethod"]').forEach((r) => r.addEventListener('change', () => {
      state.method = r.value; render();
    }));
    const levels = $('#ditherLevels');
    const levelsOut = $('#levelsOut');
    if (levels) levels.addEventListener('input', () => {
      state.levels = parseInt(levels.value, 10);
      if (levelsOut) levelsOut.textContent = state.levels + ' tones';
      render();
    });
    const reseed = $('#reseedBtn');
    if (reseed) reseed.addEventListener('click', () => {
      state.seed = 1 + Math.floor(Math.random() * 999999);
      render();
    });

    render();
  }

  /* Bayer matrix plate */
  function initBayerPlate() {
    const plate = $('#bayerPlate');
    if (!plate) return;
    const m = bayerMatrix(4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const b = m[y][x];
        const cell = document.createElement('div');
        const g = Math.round(((b + 0.5) / 16) * 255);
        cell.style.background = hexOf(g);
        cell.style.color = hexOf(readableOn(g));
        cell.textContent = String(b);
        plate.appendChild(cell);
      }
    }
  }

  /* ============================================================
     CHAPTER IV — THE CONTRAST BENCH
     ============================================================ */
  const BADGE_DEFS = [
    { label: 'AAA text', min: 7 },
    { label: 'AA text', min: 4.5 },
    { label: 'AAA large', min: 4.5 },
    { label: 'AA large', min: 3 },
    { label: 'UI & graphics', min: 3 }
  ];

  function initContrast() {
    const inkRange = $('#inkRange');
    const paperRange = $('#paperRange');
    const preview = $('#benchPreview');
    if (!inkRange || !paperRange) return;

    function update() {
      const ink = parseInt(inkRange.value, 10);
      const paper = parseInt(paperRange.value, 10);
      $('#inkOut').textContent = hexOf(ink);
      $('#paperOut').textContent = hexOf(paper);
      $('#inkSwatch').style.background = hexOf(ink);
      $('#paperSwatch').style.background = hexOf(paper);

      const ratio = contrastRatio(ink, paper);
      $('#ratioOut').textContent = ratio.toFixed(2) + ' : 1';

      const badges = $('#badges');
      if (badges) {
        badges.innerHTML = BADGE_DEFS.map((def) => {
          const pass = ratio >= def.min;
          return '<li class="chip ' + (pass ? 'pass' : 'fail') + '">' + def.label + ' ' + (pass ? '✓' : '✕') + '</li>';
        }).join('');
      }

      if (preview) {
        preview.style.background = hexOf(paper);
        preview.style.color = hexOf(ink);
        preview.style.setProperty('--pv-ink', hexOf(ink));
        preview.style.setProperty('--pv-rule', hexOf(Math.round(ink * 0.35 + paper * 0.65)));
      }
    }

    inkRange.addEventListener('input', update);
    paperRange.addEventListener('input', update);
    $$('#presetRow .btn').forEach((btn) => btn.addEventListener('click', () => {
      inkRange.value = btn.dataset.ink;
      paperRange.value = btn.dataset.paper;
      update();
    }));

    update();
  }

  /* ============================================================
     CHAPTER V — THREE WAYS TO FAKE A GREY (generated SVG)
     ============================================================ */
  function initGreyFigures() {
    const host = $('#figGrey');
    if (!host) return;
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, parent) => {
      const node = document.createElementNS(NS, tag);
      for (const k in attrs) node.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(node);
      return node;
    };

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 660 210');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Three panels showing hatching, halftone and dithering — three ways to fake a grey.');
    host.appendChild(svg);

    const panels = [
      { x: 6, label: 'HATCHING · c. 1450' },
      { x: 236, label: 'HALFTONE · c. 1885' },
      { x: 466, label: 'DITHER · 1976' }
    ];
    const PW = 188, PH = 150, PY = 6;

    panels.forEach((p) => {
      el('rect', { x: p.x, y: PY, width: PW, height: PH, fill: '#ffffff', stroke: '#1a1a1a', 'stroke-width': 1 });
      const clipId = 'clip-' + p.x;
      const clip = el('clipPath', { id: clipId });
      el('rect', { x: p.x, y: PY, width: PW, height: PH }, clip);
      const group = el('g', { 'clip-path': 'url(#' + clipId + ')' });

      if (p.label.indexOf('HATCH') === 0) {
        for (let i = 0; i < 26; i++) {
          const x = p.x + i * i * 0.30;
          el('line', {
            x1: x, y1: PY + PH, x2: x + PH, y2: PY,
            stroke: '#111111', 'stroke-width': 1.4
          }, group);
        }
      } else if (p.label.indexOf('HALF') === 0) {
        const cols = 16, rows = 12;
        const cw = PW / cols, ch = PH / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const rad = 5.0 * Math.pow(1 - c / (cols - 1), 1.15) + 0.3;
            el('circle', {
              cx: p.x + (c + 0.5) * cw, cy: PY + (r + 0.5) * ch, r: rad,
              fill: '#111111'
            }, group);
          }
        }
      } else {
        const cell = 8;
        const b = bayerMatrix(4);
        const cols = Math.ceil(PW / cell), rows = Math.ceil(PH / cell);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const light = c / (cols - 1);
            const t = (b[r % 4][c % 4] + 0.5) / 16;
            if (light < t) {
              el('rect', {
                x: p.x + c * cell, y: PY + r * cell, width: cell, height: cell, fill: '#111111'
              }, group);
            }
          }
        }
      }

      const text = el('text', {
        x: p.x, y: PY + PH + 26, fill: '#444444',
        'font-family': 'ui-monospace, Menlo, Consolas, monospace',
        'font-size': '10', 'letter-spacing': '1'
      });
      text.textContent = p.label;
    });
  }

  /* ============================================================
     HERO PLATE — weather, dithered
     ============================================================ */
  function initHero() {
    const canvas = $('#heroCanvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    const W = canvas.width, H = canvas.height;
    const bayer = bayerMatrix(4);
    const img = ctx.createImageData(W, H);
    const data = img.data;
    const LIGHT = 232, DARK = 13;

    function draw(time) {
      let p = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const n = fbm(x * 0.03 + time * 0.06, y * 0.03 + time * 0.033, 7, 4) * 1.3 - 0.15;
          const t = (bayer[y % 4][x % 4] + 0.5) / 16;
          const v = n > t ? LIGHT : DARK;
          data[p] = v; data[p + 1] = v; data[p + 2] = v; data[p + 3] = 255;
          p += 4;
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    draw(0);
    if (prefersReduced.matches) return;

    let visible = true;
    let raf = 0;
    let last = 0;
    function loop(ts) {
      raf = 0;
      if (!visible || document.hidden) return;
      if (ts - last >= 40) { last = ts; draw(ts * 0.001); }
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
    }
    function stop() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          visible = en.isIntersecting;
          if (visible) start(); else stop();
        });
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });
    start();
  }

  /* ---------------- boot ---------------- */
  initTheme();
  initReveal();
  initNavSpy();
  initStrips();
  initSpecimens();
  initZones();
  initDither();
  initBayerPlate();
  initContrast();
  initGreyFigures();
  initHero();
})();
