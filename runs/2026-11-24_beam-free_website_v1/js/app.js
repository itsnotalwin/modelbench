/* SHADES — app */
(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- Nav toggle ---------- */
  const navToggle = qs('.nav-toggle');
  const siteNav = qs('.site-nav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const open = siteNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    qsa('#nav-list a').forEach(a => a.addEventListener('click', () => {
      siteNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }));
  }

  /* ---------- Reveal on scroll ---------- */
  const revealTargets = qsa('section, .work, .hero-content > *');
  revealTargets.forEach(el => el.classList.add('reveal'));
  if (!prefersReduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('in'));
  }

  /* ---------- Hero canvas ---------- */
  const heroCanvas = qs('#hero-canvas');
  if (heroCanvas) {
    const ctx = heroCanvas.getContext('2d');
    let w, h, dpr;
    const orbs = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0006,
      vy: (Math.random() - 0.5) * 0.0006,
      r: 0.18 + Math.random() * 0.22,
      shade: 40 + i * 18,
      phase: Math.random() * Math.PI * 2,
    }));

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = heroCanvas.clientWidth; h = heroCanvas.clientHeight;
      heroCanvas.width = Math.floor(w * dpr);
      heroCanvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    let raf = null;
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf && !prefersReduced) loop();
      if (!visible && raf) { cancelAnimationFrame(raf); raf = null; }
    });
    io.observe(heroCanvas);

    let t = 0;
    function draw() {
      t += 0.004;
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
      orbs.forEach(o => {
        o.x += o.vx + Math.sin(t + o.phase) * 0.0003;
        o.y += o.vy + Math.cos(t + o.phase) * 0.0003;
        if (o.x < -0.2 || o.x > 1.2) o.vx *= -1;
        if (o.y < -0.2 || o.y > 1.2) o.vy *= -1;
        const cx = o.x * w, cy = o.y * h, rad = o.r * Math.max(w, h);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `rgba(${o.shade},${o.shade},${o.shade},0.55)`);
        g.addColorStop(1, 'rgba(10,10,10,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
      ctx.globalCompositeOperation = 'source-over';

      // subtle vignette
      const vg = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.3, w/2, h/2, Math.max(w,h)*0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      if (visible && !prefersReduced) raf = requestAnimationFrame(draw);
    }
    if (!prefersReduced) { raf = requestAnimationFrame(draw); }
    else {
      // static single frame
      draw();
    }
  }

  /* ---------- Lightbox ---------- */
  const dialog = qs('#lightbox');
  const stage = qs('#lb-stage');
  const titleEl = qs('#lb-title');
  const descEl = qs('#lb-desc');
  const counterEl = qs('#lb-counter');
  const closeBtn = qs('#lb-close');
  const prevBtn = qs('#lb-prev');
  const nextBtn = qs('#lb-next');

  const works = qsa('.work');
  let current = 0;

  function openLightbox(index) {
    current = (index + works.length) % works.length;
    const w = works[current];
    const svg = w.querySelector('svg').cloneNode(true);
    // ensure unique ids? clone keeps ids; fine for display
    stage.innerHTML = '';
    stage.appendChild(svg);
    titleEl.textContent = w.dataset.title;
    descEl.textContent = w.dataset.desc;
    counterEl.textContent = `${String(current + 1).padStart(2, '0')} / ${String(works.length).padStart(2, '0')}`;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  function closeLightbox() {
    if (dialog.open) dialog.close();
  }
  function nav(dir) {
    openLightbox(current + dir);
  }

  works.forEach((w, i) => {
    w.addEventListener('click', () => openLightbox(i));
    w.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); }
    });
  });
  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', () => nav(-1));
  nextBtn.addEventListener('click', () => nav(1));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeLightbox(); });
  dialog.addEventListener('cancel', (e) => { /* allow default close */ });
  document.addEventListener('keydown', (e) => {
    if (!dialog.open) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') nav(-1);
    if (e.key === 'ArrowRight') nav(1);
  });

  /* ---------- Process canvas generator ---------- */
  const procCanvas = qs('#process-canvas');
  const regenBtn = qs('#regen-btn');
  const downloadBtn = qs('#download-btn');

  let seed = Math.floor(Math.random() * 1e9);
  function rng() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

  function drawProcess() {
    if (!procCanvas) return;
    const ctx = procCanvas.getContext('2d');
    const size = procCanvas.width;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, size, size);

    // layers
    const layers = 6 + Math.floor(rng() * 5);
    for (let i = 0; i < layers; i++) {
      const shade = Math.floor(20 + rng() * 215);
      const alpha = 0.18 + rng() * 0.5;
      ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha})`;
      if (rng() < 0.5) {
        const x = rng() * size, y = rng() * size;
        const rw = 60 + rng() * size * 0.6;
        const rh = 60 + rng() * size * 0.6;
        ctx.fillRect(x, y, rw, rh);
      } else {
        const cx = rng() * size, cy = rng() * size;
        const r = 40 + rng() * size * 0.35;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // noise threshold dither
    const img = ctx.getImageData(0, 0, size, size);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = (data[i] + data[i+1] + data[i+2]) / 3;
      const threshold = 110 + (rng() - 0.5) * 60;
      const nv = v > threshold ? 240 : 12;
      data[i] = data[i+1] = data[i+2] = nv;
    }
    ctx.putImageData(img, 0, 0);

    // fine lines
    ctx.strokeStyle = 'rgba(232,232,232,0.35)';
    ctx.lineWidth = 1;
    const lines = 3 + Math.floor(rng() * 6);
    for (let i = 0; i < lines; i++) {
      ctx.beginPath();
      ctx.moveTo(rng() * size, rng() * size);
      ctx.bezierCurveTo(rng()*size, rng()*size, rng()*size, rng()*size, rng()*size, rng()*size);
      ctx.stroke();
    }
  }

  function regenerate() {
    seed = Math.floor(Math.random() * 1e9);
    drawProcess();
  }

  if (procCanvas) {
    drawProcess();
    if (regenBtn) regenBtn.addEventListener('click', regenerate);
    if (downloadBtn) downloadBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `shade-${seed}.png`;
      link.href = procCanvas.toDataURL('image/png');
      link.click();
    });
  }

  /* ---------- Back to top smooth ---------- */
  qsa('a[href="#top"]').forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  }));
})();
