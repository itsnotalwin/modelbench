/* MONO. — behaviour layer
   Dependency-free vanilla JavaScript, no build step.

   - Generative flow fields drawn with canvas (Perlin noise, pointer reactive)
   - Live font-weight specimen (system fonts only)
   - Manual motion override that also respects prefers-reduced-motion
   - Copy email address to clipboard
*/

(function () {
  'use strict';

  /* ---------- reduced motion ---------- */
  const STORAGE_KEY = 'mono-motion';
  const osReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userMotion = localStorage.getItem(STORAGE_KEY); // null | '0' | '1'

  function isReduced() {
    if (userMotion === '1') return true;
    if (userMotion === '0') return false;
    return osReduced.matches;
  }

  function applyReduced(reduced) {
    document.documentElement.setAttribute('data-reduced', reduced ? '1' : '');
    fields.forEach(function (f) { f.setReduced(reduced); });
    if (motionBtn) {
      motionBtn.setAttribute('aria-pressed', String(reduced));
      motionBtn.textContent = reduced ? 'Motion: off' : 'Motion: on';
    }
  }

  /* ---------- Perlin noise (2D, dependency-free) ---------- */
  const perm = new Uint8Array(512);
  (function () {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  function noise2d(xin, yin) {
    const X = Math.floor(xin) & 255;
    const Y = Math.floor(yin) & 255;
    const xf = xin - Math.floor(xin);
    const yf = yin - Math.floor(yin);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];
    const g1 = grad(aa, xf, yf);
    const g2 = grad(ba, xf - 1, yf);
    const g3 = grad(ab, xf, yf - 1);
    const g4 = grad(bb, xf - 1, yf - 1);
    return lerp(lerp(g1, g2, u), lerp(g3, g4, u), v);
  }

  /* ---------- flow field canvas ---------- */
  class FlowField {
    constructor(canvas, options) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.opts = Object.assign({
        scale: 0.004,
        speed: 0.0003,
        count: 700,
        radius: 450,
        alpha: 0.17,
        width: 1.2
      }, options);
      this.particles = [];
      this.t = 0;
      this.raf = null;
      this.reduced = isReduced();
      this.mouse = { x: -10000, y: -10000 };
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = 0;
      this.height = 0;
      this.resize();

      const self = this;
      window.addEventListener('resize', function () { self.resize(); });
      window.addEventListener('mousemove', function (e) { self.onMouse(e); });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) self.pause(); else self.resume();
      });
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.width = Math.max(Math.round(rect.width * this.dpr), 1);
      this.height = Math.max(Math.round(rect.height * this.dpr), 1);
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(this.dpr, this.dpr);
      this.initParticles();
      if (this.reduced) { this.drawStatic(); } else { this.step(); }
    }

    initParticles() {
      this.particles = [];
      const w = this.canvas.width / this.dpr;
      const h = this.canvas.height / this.dpr;
      for (let i = 0; i < this.opts.count; i++) {
        this.particles.push({ x: Math.random() * w, y: Math.random() * h });
      }
    }

    onMouse(e) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    }

    setReduced(reduced) {
      this.reduced = reduced;
      if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
      if (reduced) { this.drawStatic(); } else { this.step(); }
    }

    pause() { if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; } }
    resume() { if (!this.reduced && !this.raf) this.step(); }

    drawStatic() {
      const ctx = this.ctx;
      const w = this.canvas.width / this.dpr;
      const h = this.canvas.height / this.dpr;
      const dpr = this.dpr;
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      const scale = this.opts.scale;
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const angle = noise2d(p.x * scale, p.y * scale) * Math.PI * 4;
        const ox = p.x, oy = p.y;
        let nx = ox + Math.cos(angle) * 60;
        let ny = oy + Math.sin(angle) * 60;
        if (nx < 0) nx = 0; if (nx > w) nx = w;
        if (ny < 0) ny = 0; if (ny > h) ny = h;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }
    }

    step() {
      const ctx = this.ctx;
      const w = this.canvas.width / this.dpr;
      const h = this.canvas.height / this.dpr;
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.strokeStyle = 'rgba(0, 0, 0, ' + this.opts.alpha + ')';
      ctx.lineWidth = this.opts.width;
      ctx.lineCap = 'round';
      const scale = this.opts.scale;
      const rad2 = this.opts.radius * this.opts.radius;
      const t = this.t;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        let angle = noise2d(p.x * scale, p.y * scale + t) * Math.PI * 4;
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < rad2) {
          const force = (1 - d2 / rad2) * 0.9;
          const ma = Math.atan2(dy, dx);
          angle += (ma - angle) * force;
        }
        const ox = p.x, oy = p.y;
        p.x += Math.cos(angle) * 1.6;
        p.y += Math.sin(angle) * 1.6;
        if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          p.x = Math.random() * w;
          p.y = Math.random() * h;
        }
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      this.t += this.opts.speed;
      const self = this;
      this.raf = requestAnimationFrame(function () { self.step(); });
    }
  }

  /* ---------- initialise ---------- */
  const fields = [];
  document.querySelectorAll('.flow-canvas').forEach(function (canvas) {
    fields.push(new FlowField(canvas, {
      scale: canvas.dataset.scale ? parseFloat(canvas.dataset.scale) : 0.004,
      speed: canvas.dataset.speed ? parseFloat(canvas.dataset.speed) : 0.0003,
      count: canvas.dataset.count ? parseInt(canvas.dataset.count, 10) : 700,
      radius: canvas.dataset.radius ? parseFloat(canvas.dataset.radius) : 450,
      alpha: canvas.dataset.alpha ? parseFloat(canvas.dataset.alpha) : 0.17
    }));
  });

  const navToggle = document.getElementById('nav-toggle');
  const navList = document.getElementById('nav-list');
  if (navToggle && navList) {
    navToggle.addEventListener('click', function () {
      const showing = !navList.hidden;
      navList.hidden = showing;
      navToggle.setAttribute('aria-expanded', String(!showing));
    });
    navList.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navList.hidden = true;
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const motionBtn = document.getElementById('motion-toggle');
  if (motionBtn) {
    motionBtn.addEventListener('click', function () { applyReduced(!isReduced()); });
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function (e) {
      if (userMotion === null) applyReduced(e.matches);
    });
    applyReduced(isReduced());
  }

  /* ---------- weight specimen ---------- */
  const slider = document.getElementById('weight-slider');
  const specimen = document.getElementById('weight-specimen');
  if (slider && specimen) {
    specimen.style.fontWeight = slider.value;
    slider.addEventListener('input', function () { specimen.style.fontWeight = this.value; });
  }

  /* ---------- signature canvas ---------- */
  const signature = document.getElementById('signature-canvas');
  if (signature) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function draw() {
      const rect = signature.getBoundingClientRect();
      signature.width = Math.max(Math.round(rect.width * dpr), 1);
      signature.height = Math.max(Math.round(rect.height * dpr), 1);
      const ctx = signature.getContext('2d', { alpha: false });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      const w = rect.width, h = rect.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (let s = 0; s < 4; s++) {
        ctx.beginPath();
        let x = Math.random() * w * 0.4 + w * 0.1;
        let y = Math.random() * h * 0.4 + h * 0.1;
        ctx.moveTo(x, y);
        for (let i = 0; i < 80; i++) {
          const angle = noise2d(x * 0.004, y * 0.004 + s * 1.7) * Math.PI * 2.5;
          x += Math.cos(angle) * 2.6;
          y += Math.sin(angle) * 2.6;
          if (x < 0 || x > w || y < 0 || y > h) break;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    draw();
    window.addEventListener('resize', draw);
  }

  /* ---------- copy email ---------- */
  const copyBtn = document.getElementById('copy-email');
  const emailLink = document.querySelector('a[href^="mailto:"]');
  if (copyBtn && emailLink && navigator.clipboard) {
    copyBtn.addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(emailLink.href.replace('mailto:', ''));
        const prev = copyBtn.textContent;
        copyBtn.textContent = 'Copied';
        setTimeout(function () { copyBtn.textContent = prev; }, 1500);
      } catch (err) {
        // fall back to the functional mailto link above
      }
    });
  } else if (copyBtn) {
    copyBtn.style.display = 'none';
  }

  /* ---------- footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
