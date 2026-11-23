(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  // Mobile nav
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (toggle && navLinks) {
    const closeNav = () => {
      toggle.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('open');
    };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      navLinks.classList.toggle('open', !open);
    });
    navLinks.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        if (window.innerWidth <= 760) closeNav();
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeNav();
        toggle.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 760 && toggle.getAttribute('aria-expanded') === 'true' && !e.target.closest('.nav')) {
        closeNav();
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) {
        navLinks.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Reveal on scroll
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      reveals.forEach((el) => el.classList.add('is-visible'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      reveals.forEach((el) => io.observe(el));
    }
  }

  // Active nav on scroll
  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const navAnchors = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const setCurrent = (id) => {
    navAnchors.forEach((a) => {
      const match = a.getAttribute('href') === '#' + id;
      if (match) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };
  if (sections.length && navAnchors.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setCurrent(visible.target.id);
    }, { rootMargin: '-20% 0px -70% 0px', threshold: [0.1, 0.25] });
    sections.forEach((s) => spy.observe(s));
  }

  // Gallery filters
  const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
  const works = Array.from(document.querySelectorAll('.work[data-category]'));
  const galleryStatus = document.getElementById('gallery-status');
  if (filterButtons.length && works.length) {
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        let count = 0;
        works.forEach((work) => {
          const show = filter === 'all' || work.dataset.category === filter;
          work.hidden = !show;
          if (show) count++;
        });
        if (galleryStatus) galleryStatus.textContent = count + ' work' + (count === 1 ? '' : 's') + ' shown.';
      });
    });
  }

  // Grain Lab
  const canvas = document.getElementById('grain-canvas');
  const density = document.getElementById('density');
  const contrast = document.getElementById('contrast');
  const scale = document.getElementById('scale');
  const densityOut = document.getElementById('density-out');
  const contrastOut = document.getElementById('contrast-out');
  const scaleOut = document.getElementById('scale-out');
  const readout = document.getElementById('lab-readout');

  if (canvas && density && contrast && scale) {
    const ctx = canvas.getContext('2d', { alpha: false });
    const base = document.createElement('canvas');
    const bctx = base.getContext('2d', { alpha: false });
    let raf = 0;

    function drawBase(w, h) {
      base.width = w;
      base.height = h;
      const g = bctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#f2f2f2');
      g.addColorStop(0.45, '#bdbdbd');
      g.addColorStop(0.7, '#5a5a5a');
      g.addColorStop(1, '#111111');
      bctx.fillStyle = g;
      bctx.fillRect(0, 0, w, h);

      // Sun / moon
      const cx = w * 0.72;
      const cy = h * 0.28;
      const r = Math.min(w, h) * 0.13;
      const rg = bctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      rg.addColorStop(0, '#ffffff');
      rg.addColorStop(1, '#d8d8d8');
      bctx.fillStyle = rg;
      bctx.beginPath();
      bctx.arc(cx, cy, r, 0, Math.PI * 2);
      bctx.fill();

      // Mountains
      bctx.fillStyle = '#1a1a1a';
      bctx.beginPath();
      bctx.moveTo(0, h * 0.72);
      bctx.lineTo(w * 0.18, h * 0.48);
      bctx.lineTo(w * 0.36, h * 0.66);
      bctx.lineTo(w * 0.56, h * 0.38);
      bctx.lineTo(w * 0.76, h * 0.62);
      bctx.lineTo(w, h * 0.46);
      bctx.lineTo(w, h);
      bctx.lineTo(0, h);
      bctx.closePath();
      bctx.fill();

      bctx.fillStyle = '#0a0a0a';
      bctx.beginPath();
      bctx.moveTo(0, h * 0.78);
      bctx.lineTo(w * 0.22, h * 0.62);
      bctx.lineTo(w * 0.42, h * 0.74);
      bctx.lineTo(w * 0.62, h * 0.56);
      bctx.lineTo(w * 0.85, h * 0.72);
      bctx.lineTo(w, h * 0.64);
      bctx.lineTo(w, h);
      bctx.lineTo(0, h);
      bctx.closePath();
      bctx.fill();

      // Foreground
      bctx.fillStyle = '#050505';
      bctx.fillRect(0, h * 0.82, w, h * 0.18);

      // Horizon line
      bctx.strokeStyle = 'rgba(255,255,255,0.22)';
      bctx.lineWidth = Math.max(1, h * 0.002);
      bctx.beginPath();
      bctx.moveTo(0, h * 0.82);
      bctx.lineTo(w, h * 0.82);
      bctx.stroke();
    }

    function render() {
      raf = 0;
      const wrap = canvas.parentElement;
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(320, Math.floor(rect.width * dpr));
      const h = Math.max(280, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        drawBase(w, h);
      }

      const d = Number(density.value) / 100;
      const c = Number(contrast.value) / 100;
      const s = Number(scale.value);

      densityOut.textContent = Math.round(d * 100);
      contrastOut.textContent = Math.round(c * 100);
      scaleOut.textContent = s.toFixed(1) + '×';

      ctx.drawImage(base, 0, 0);

      const img = ctx.getImageData(0, 0, w, h);
      const data = img.data;
      const contrastFactor = 0.65 + c * 1.1;
      const grainAmp = d * 85;
      const cell = Math.max(1, Math.round(s * dpr));

      for (let y = 0; y < h; y += cell) {
        for (let x = 0; x < w; x += cell) {
          const noise = (Math.random() - 0.5) * grainAmp;
          const yEnd = Math.min(y + cell, h);
          const xEnd = Math.min(x + cell, w);
          for (let yy = y; yy < yEnd; yy++) {
            let idx = (yy * w + x) * 4;
            for (let xx = x; xx < xEnd; xx++, idx += 4) {
              for (let ch = 0; ch < 3; ch++) {
                let v = data[idx + ch];
                v = (v - 128) * contrastFactor + 128;
                v += noise;
                data[idx + ch] = v < 0 ? 0 : v > 255 ? 255 : v;
              }
            }
          }
        }
      }
      ctx.putImageData(img, 0, 0);

      if (readout) {
        readout.textContent = 'Grain ' + Math.round(d * 100) + ' / Contrast ' + Math.round(c * 100) + ' / Scale ' + s.toFixed(1) + '×';
      }
    }

    function schedule() {
      if (raf) return;
      raf = window.requestAnimationFrame(render);
    }

    [density, contrast, scale].forEach((input) => {
      input.addEventListener('input', schedule);
      input.addEventListener('change', schedule);
    });
    window.addEventListener('resize', schedule, { passive: true });

    if ('ResizeObserver' in window) {
      new ResizeObserver(schedule).observe(canvas.parentElement);
    }
    schedule();
  }

  // Contact form
  const form = document.getElementById('contact-form');
  if (form) {
    const status = document.getElementById('form-status');
    const validators = {
      name: (v) => v.trim().length < 2 ? 'Please enter your full name (at least 2 characters).' : '',
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Please enter a valid email address, like name@example.com.',
      project: (v) => v ? '' : 'Please select a project type.',
      message: (v) => v.trim().length < 20 ? 'Please include a short brief (at least 20 characters).' : ''
    };

    function fieldFor(input) { return input.closest('.field'); }
    function errorEl(input) {
      const id = input.id + '-error';
      return document.getElementById(id);
    }
    function validate(input) {
      const rule = validators[input.name];
      if (!rule) return true;
      const msg = rule(input.value);
      const err = errorEl(input);
      const field = fieldFor(input);
      if (err) err.textContent = msg;
      if (field) field.classList.toggle('invalid', !!msg);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    }

    form.querySelectorAll('input, textarea, select').forEach((input) => {
      if (!validators[input.name]) return;
      input.addEventListener('blur', () => validate(input));
      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid') === 'true') validate(input);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (status) {
        status.className = 'form-status';
        status.textContent = '';
      }
      let firstInvalid = null;
      Object.keys(validators).forEach((name) => {
        const input = form.elements[name];
        if (input && !validate(input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        if (status) {
          status.textContent = 'Please review the highlighted fields and try again.';
          status.classList.add('visible');
        }
        return;
      }

      const name = form.elements.name.value.trim();
      const project = form.elements.project.options[form.elements.project.selectedIndex].text;
      if (status) {
        status.textContent = 'Thank you, ' + name + '. Your ' + project.toLowerCase() + ' enquiry has been prepared. GRAIN replies within two business days at the email address you provided.';
        status.classList.add('visible', 'success');
      }
      form.reset();
      form.querySelectorAll('[aria-invalid]').forEach((el) => el.setAttribute('aria-invalid', 'false'));
      form.querySelectorAll('.field.invalid').forEach((el) => el.classList.remove('invalid'));
      form.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; });
      status.focus && status.focus();
    });
  }
})();
