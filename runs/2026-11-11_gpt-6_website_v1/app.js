(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    menuButton.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      menuButton.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
      menuButton.focus();
    }
  });

  const triggers = [...document.querySelectorAll('.observation-trigger')];
  triggers.forEach(trigger => trigger.addEventListener('click', () => {
    const shouldOpen = trigger.getAttribute('aria-expanded') !== 'true';
    triggers.forEach(other => {
      other.setAttribute('aria-expanded', 'false');
      document.getElementById(other.getAttribute('aria-controls')).hidden = true;
    });
    trigger.setAttribute('aria-expanded', String(shouldOpen));
    document.getElementById(trigger.getAttribute('aria-controls')).hidden = !shouldOpen;
  }));

  const progress = document.getElementById('progress-bar');
  let ticking = false;
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { window.requestAnimationFrame(updateProgress); ticking = true; }
  }, { passive: true });
  updateProgress();

  // Original procedural skyline: deterministic geometry, animated only when motion is welcome.
  const canvas = document.getElementById('night-canvas');
  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0, height = 0, frame = 0, raf = 0;
  const buildings = [];
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildings.length = 0;
    let x = -8, seed = 29;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    while (x < width + 10) {
      const w = 18 + random() * Math.max(18, width * .035);
      const h = height * (.13 + random() * .45);
      buildings.push({x, w, h, roof: random() > .68, windows: random() > .55});
      x += w + 2 + random() * 8;
    }
    draw();
  };
  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#d8d8d5'; ctx.fillRect(0, 0, width, height);
    // Atmospheric horizontal strata.
    for (let i = 0; i < 34; i++) {
      const y = height * .12 + i * height * .018;
      ctx.strokeStyle = `rgba(30,30,30,${.025 + (i % 4) * .008})`;
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y + Math.sin(i * .7) * 3); ctx.stroke();
    }
    // Far skyline.
    ctx.fillStyle = '#a2a29f';
    buildings.forEach((b, i) => {
      const y = height - b.h - height * .12;
      ctx.fillRect(b.x, y, b.w, b.h);
      if (b.roof) { ctx.fillRect(b.x + b.w * .36, y - 9, b.w * .24, 9); }
      if (b.windows) {
        ctx.fillStyle = 'rgba(245,245,241,.62)';
        for (let wy = y + 12; wy < height - height * .12 - 5; wy += 15) {
          for (let wx = b.x + 5; wx < b.x + b.w - 3; wx += 10) if ((Math.floor(wx + wy + i) % 3) !== 0) ctx.fillRect(wx, wy, 2, 4);
        }
        ctx.fillStyle = '#a2a29f';
      }
    });
    // Foreground roofline and its impossible, quiet geometry.
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.moveTo(0, height * .78);
    for (let x = 0; x <= width; x += 5) ctx.lineTo(x, height * (.78 + .018 * Math.sin(x * .012) + .009 * Math.sin(x * .031 + 2)));
    ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill();
    // Fine light trails: a graphic notation for streets seen from above.
    ctx.save(); ctx.globalAlpha = .48; ctx.strokeStyle = '#f1f0ec'; ctx.lineWidth = 1;
    for (let i = 0; i < 19; i++) {
      const start = (i / 19) * width;
      ctx.beginPath(); ctx.moveTo(start, height * (.81 + (i % 3) * .012));
      ctx.bezierCurveTo(start + width * .08, height * .77, start + width * .15, height * .93, start + width * .25, height * 1.02); ctx.stroke();
    }
    ctx.restore();
    // One slowly breathing signal, almost too small to notice.
    const pulse = reducedMotion ? .5 : .35 + Math.sin(frame * .025) * .12;
    ctx.fillStyle = `rgba(255,255,255,${pulse})`; ctx.beginPath(); ctx.arc(width * .72, height * .66, 2.2, 0, Math.PI * 2); ctx.fill();
    frame++;
  };
  const animate = () => { draw(); raf = window.requestAnimationFrame(animate); };
  const observer = new ResizeObserver(() => { window.cancelAnimationFrame(raf); resize(); if (!reducedMotion) raf = window.requestAnimationFrame(animate); });
  observer.observe(canvas);
  resize();
  if (!reducedMotion) raf = window.requestAnimationFrame(animate);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) window.cancelAnimationFrame(raf);
    else if (!reducedMotion) raf = window.requestAnimationFrame(animate);
  });
})();
