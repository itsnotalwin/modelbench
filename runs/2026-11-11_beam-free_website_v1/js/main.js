(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const html = document.documentElement;

  /* ---------- Theme ---------- */
  const themeBtn = document.querySelector(".theme-toggle");
  const stored = localStorage.getItem("gravity-theme");
  if (stored === "light" || stored === "dark") {
    html.setAttribute("data-theme", stored);
  }
  function syncThemeButton() {
    const t = html.getAttribute("data-theme");
    themeBtn.setAttribute("aria-pressed", t === "light" ? "true" : "false");
    themeBtn.querySelector(".theme-icon").textContent = t === "light" ? "◑" : "◐";
  }
  syncThemeButton();
  themeBtn.addEventListener("click", () => {
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("gravity-theme", next);
    syncThemeButton();
  });

  /* ---------- Reveal on scroll ---------- */
  const revealTargets = document.querySelectorAll(
    ".manifesto-block, .principle, .work-card, .pullquote, .manifesto h2, .principles h2, .work h2, .demo h2, .contact h2"
  );
  revealTargets.forEach((el) => el.classList.add("reveal"));
  if (!reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Hero canvas ---------- */
  const heroCanvas = document.getElementById("hero-canvas");
  if (heroCanvas) {
    const ctx = heroCanvas.getContext("2d");
    let w = 0, h = 0, dpr = 1;
    let particles = [];
    const mouse = { x: -9999, y: -9999, active: false };
    const PARTICLE_COUNT = reduceMotion ? 0 : 90;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = heroCanvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      heroCanvas.width = Math.floor(w * dpr);
      heroCanvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particles.length === 0 && PARTICLE_COUNT > 0) initParticles();
    }

    function initParticles() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 1.4 + 0.6,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function cssVar(name) {
      return getComputedStyle(html).getPropertyValue(name).trim();
    }

    let rafId = null;
    let running = true;
    function frame(t) {
      if (!running) return;
      const fg = cssVar("--fg");
      const muted = cssVar("--muted-2");
      ctx.clearRect(0, 0, w, h);

      // subtle radial vignette
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(1, cssVar("--bg"));
      // draw particles
      for (const p of particles) {
        // drift
        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.01;
        // mouse attraction (gentle)
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 260 && dist > 1) {
            const force = (1 - dist / 260) * 0.04;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }
        // damping
        p.vx *= 0.985;
        p.vy *= 0.985;
        // wrap
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = fg;
        ctx.globalAlpha = 0.55 + 0.25 * Math.sin(p.phase);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // connecting lines
      ctx.strokeStyle = muted;
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 110) {
            ctx.globalAlpha = (1 - d / 110) * 0.35;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (reduceMotion || rafId) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    resize();
    window.addEventListener("resize", resize);
    heroCanvas.addEventListener("mousemove", (e) => {
      const rect = heroCanvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    });
    heroCanvas.addEventListener("mouseleave", () => { mouse.active = false; });
    // touch
    heroCanvas.addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      const rect = heroCanvas.getBoundingClientRect();
      mouse.x = t.clientX - rect.left;
      mouse.y = t.clientY - rect.top;
      mouse.active = true;
    }, { passive: true });
    heroCanvas.addEventListener("touchend", () => { mouse.active = false; });

    if (!reduceMotion) start();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop(); else start();
    });
  }

  /* ---------- Demo canvas ---------- */
  const demoCanvas = document.getElementById("demo-canvas");
  if (demoCanvas) {
    const ctx = demoCanvas.getContext("2d");
    let w = 0, h = 0, dpr = 1;
    let particles = [];
    let wells = [];
    let running = true;
    let rafId = null;
    let paused = false;
    let trails = true;

    const strengthInput = document.getElementById("strength");
    const countInput = document.getElementById("count");
    const trailsInput = document.getElementById("trails");
    const resetBtn = document.getElementById("reset-demo");
    const pauseBtn = document.getElementById("pause-demo");

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = demoCanvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      demoCanvas.width = Math.floor(w * dpr);
      demoCanvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(n) {
      particles = [];
      for (let i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          r: Math.random() * 1.2 + 0.6,
        });
      }
    }

    function cssVar(name) { return getComputedStyle(html).getPropertyValue(name).trim(); }

    function reset() {
      wells = [];
      spawn(parseInt(countInput.value, 10));
      // clear
      ctx.clearRect(0, 0, w, h);
    }

    function frame() {
      if (!running) return;
      if (paused) { rafId = requestAnimationFrame(frame); return; }
      const fg = cssVar("--fg");
      const muted = cssVar("--muted-2");
      const strength = parseInt(strengthInput.value, 10) / 100;

      if (trails) {
        ctx.fillStyle = cssVar("--bg");
        ctx.globalAlpha = 0.18;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      } else {
        ctx.clearRect(0, 0, w, h);
      }

      // draw wells
      for (const well of wells) {
        const g = ctx.createRadialGradient(well.x, well.y, 0, well.x, well.y, 60);
        g.addColorStop(0, fg);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(well.x, well.y, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(well.x, well.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = fg;
        ctx.fill();
      }

      for (const p of particles) {
        // gravity from wells + cursor-less: wells only
        for (const well of wells) {
          const dx = well.x - p.x;
          const dy = well.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 2 && dist < 400) {
            const force = (strength * 0.6) / (dist * 0.5 + 10);
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }
        // gentle ambient drift toward centre of mass of particles (very light)
        p.vx *= 0.992;
        p.vy *= 0.992;
        // speed cap
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 6) { p.vx = (p.vx / sp) * 6; p.vy = (p.vy / sp) * 6; }
        p.x += p.vx;
        p.y += p.vy;
        // bounce
        if (p.x < 0) { p.x = 0; p.vx *= -0.6; }
        if (p.x > w) { p.x = w; p.vx *= -0.6; }
        if (p.y < 0) { p.y = 0; p.vy *= -0.6; }
        if (p.y > h) { p.y = h; p.vy *= -0.6; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = fg;
        ctx.globalAlpha = 0.9;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (reduceMotion) {
        // static render
        resize();
        spawn(parseInt(countInput.value, 10));
        drawStatic();
        return;
      }
      if (rafId) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    }
    function drawStatic() {
      ctx.clearRect(0, 0, w, h);
      const fg = cssVar("--fg");
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = fg;
        ctx.fill();
      }
    }
    function stop() {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    resize();
    spawn(parseInt(countInput.value, 10));
    window.addEventListener("resize", () => { resize(); });

    demoCanvas.addEventListener("click", (e) => {
      const rect = demoCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // remove well if close
      const idx = wells.findIndex((wl) => Math.hypot(wl.x - x, wl.y - y) < 18);
      if (idx >= 0) wells.splice(idx, 1);
      else wells.push({ x, y });
    });

    strengthInput.addEventListener("input", () => {});
    countInput.addEventListener("change", () => {
      spawn(parseInt(countInput.value, 10));
    });
    trailsInput.addEventListener("change", () => { trails = trailsInput.checked; });
    resetBtn.addEventListener("click", reset);
    pauseBtn.addEventListener("click", () => {
      paused = !paused;
      pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
      pauseBtn.textContent = paused ? "Resume" : "Pause";
    });

    if (!reduceMotion) start();
    else drawStatic();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop(); else if (!reduceMotion) start();
    });
  }
})();
