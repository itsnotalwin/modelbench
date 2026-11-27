/* ============================================================
   Vectra Studio — SVG DOM rendering, view transform, overlay
   ============================================================ */
'use strict';
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const { clamp } = App.U;
  const state = App.state;
  const docApi = App.docApi;
  const S = App.S;

  let stage, wrap, world, overlay, chromeG, abShadow, abBg, abGrid;
  const els = new Map(); // shape id -> wrapper <g>

  function svgEl(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(el);
    return el;
  }

  /* ---------------- coordinates ---------------- */
  function toWorld(clientX, clientY) {
    const r = stage.getBoundingClientRect();
    return {
      x: (clientX - r.left - state.view.x) / state.view.k,
      y: (clientY - r.top - state.view.y) / state.view.k
    };
  }
  function toScreen(x, y) {
    return [x * state.view.k + state.view.x, y * state.view.k + state.view.y];
  }

  /* ---------------- view ---------------- */
  function applyView() {
    const t = 'translate(' + state.view.x + ' ' + state.view.y + ') scale(' + state.view.k + ')';
    world.setAttribute('transform', t);
    chromeG.setAttribute('transform', t);
  }

  function zoomAt(cx, cy, factor) {
    const k2 = clamp(state.view.k * factor, 0.02, 64);
    const r = k2 / state.view.k;
    state.view.x = cx - (cx - state.view.x) * r;
    state.view.y = cy - (cy - state.view.y) * r;
    state.view.k = k2;
    docApi.viewChanged();
  }

  function zoomBy(factor, centerScreen) {
    const r = stage.getBoundingClientRect();
    const cx = centerScreen ? centerScreen[0] : r.width / 2;
    const cy = centerScreen ? centerScreen[1] : r.height / 2;
    zoomAt(cx, cy, factor);
  }

  function setZoom(k) {
    zoomBy(clamp(k, 0.02, 64) / state.view.k);
  }

  function fitBB(bb) {
    if (!bb) return;
    const r = stage.getBoundingClientRect();
    const m = 56;
    const kw = (r.width - 2 * m) / Math.max(1, bb.w);
    const kh = (r.height - 2 * m) / Math.max(1, bb.h);
    const k = clamp(Math.min(kw, kh), 0.02, 8);
    state.view.k = k;
    state.view.x = (r.width - bb.w * k) / 2 - bb.x * k;
    state.view.y = (r.height - bb.h * k) / 2 - bb.y * k;
    docApi.viewChanged();
  }

  function fitPage() { fitBB({ x: 0, y: 0, w: state.doc.w, h: state.doc.h }); }

  function fitSelection() {
    const sel = docApi.selShapes();
    if (!sel.length) { fitPage(); return; }
    const bbs = sel.map(S.worldBBox);
    fitBB(App.G.unionBB(bbs));
  }

  /* ---------------- chrome (artboard) ---------------- */
  function renderChrome() {
    const d = state.doc;
    const wh = { x: 0, y: 0, w: d.w, h: d.h };
    for (const r of [abShadow, abBg, abGrid]) {
      r.setAttribute('x', 0); r.setAttribute('y', 0);
      r.setAttribute('width', d.w); r.setAttribute('height', d.h);
    }
    abShadow.setAttribute('transform', 'translate(0 12)');
    abBg.setAttribute('fill', d.bg || '#ffffff');
    abGrid.style.display = state.grid ? '' : 'none';
  }

  /* ---------------- document elements ---------------- */
  function ghostKey(sh) {
    if (sh.type === 'line') return 'line';
    if ((sh.type === 'polygon' || sh.type === 'path') && sh.fill === 'none' && sh.stroke !== 'none') return 'stroke';
    return '';
  }

  function makeEl(sh) {
    const g = svgEl('g', { 'class': 'shape', 'data-id': sh.id });
    buildInner(sh, g);
    return g;
  }

  function buildInner(sh, g) {
    while (g.firstChild) g.removeChild(g.firstChild);
    g._ghost = ghostKey(sh);
    const tag = sh.type === 'group' ? null :
      (sh.type === 'rect' ? 'rect' : sh.type === 'ellipse' ? 'ellipse' :
       sh.type === 'line' ? 'line' : sh.type === 'polygon' ? 'polygon' : 'path');
    if (tag) {
      const vis = svgEl(tag, null, g);
      vis.classList.add('vis');
      if (g._ghost) {
        const ghost = svgEl(tag, null, g);
        ghost.setAttribute('fill', 'none');
        ghost.setAttribute('stroke', '#000');
        ghost.setAttribute('stroke-opacity', '0');
        ghost.setAttribute('stroke-width', '16');
        ghost.setAttribute('vector-effect', 'non-scaling-stroke');
        ghost.setAttribute('pointer-events', 'stroke');
        ghost.classList.add('ghost');
      }
    }
  }

  function geomAttrs(el, sh, ghost) {
    switch (sh.type) {
      case 'rect':
        el.setAttribute('x', App.U.fmt(sh.x));
        el.setAttribute('y', App.U.fmt(sh.y));
        el.setAttribute('width', App.U.fmt(Math.max(0, sh.w)));
        el.setAttribute('height', App.U.fmt(Math.max(0, sh.h)));
        el.setAttribute('rx', App.U.fmt(clamp(sh.radius || 0, 0, Math.min(sh.w, sh.h) / 2)));
        break;
      case 'ellipse':
        el.setAttribute('cx', App.U.fmt(sh.cx));
        el.setAttribute('cy', App.U.fmt(sh.cy));
        el.setAttribute('rx', App.U.fmt(Math.max(0, sh.rx)));
        el.setAttribute('ry', App.U.fmt(Math.max(0, sh.ry)));
        break;
      case 'line':
        el.setAttribute('x1', App.U.fmt(sh.x1));
        el.setAttribute('y1', App.U.fmt(sh.y1));
        el.setAttribute('x2', App.U.fmt(sh.x2));
        el.setAttribute('y2', App.U.fmt(sh.y2));
        break;
      case 'polygon':
        el.setAttribute('points', S.ptsAttr(sh));
        break;
      case 'path':
        el.setAttribute('d', S.dFrom(sh));
        break;
    }
    if (ghost) return;
    el.setAttribute('fill', sh.fill || 'none');
    el.setAttribute('stroke', sh.stroke || 'none');
    if (sh.stroke && sh.stroke !== 'none') {
      el.setAttribute('stroke-width', App.U.fmt(sh.strokeWidth));
      el.setAttribute('stroke-linecap', 'round');
      el.setAttribute('stroke-linejoin', 'round');
    }
    if (sh.dash) el.setAttribute('stroke-dasharray', sh.dash);
  }

  function updateShapeEl(sh, el) {
    if (el._ghost !== ghostKey(sh)) buildInner(sh, el);
    // only direct children — a group wrapper contains nested shape wrappers
    let vis = null, ghost = null;
    for (const child of el.children) {
      if (child.classList.contains('vis')) vis = child;
      else if (child.classList.contains('ghost')) ghost = child;
    }
    if (vis) geomAttrs(vis, sh, false);
    if (ghost) geomAttrs(ghost, sh, true);
    if (sh.opacity < 1) el.setAttribute('opacity', String(+sh.opacity.toFixed(3)));
    else el.removeAttribute('opacity');
    if (sh.angle && sh.type !== 'group') {
      const c = S.centerOf(sh);
      el.setAttribute('transform', 'rotate(' + App.U.fmt(sh.angle) + ' ' + App.U.fmt(c.x) + ' ' + App.U.fmt(c.y) + ')');
    } else {
      el.removeAttribute('transform');
    }
  }

  function walk(sh, parentEl) {
    let el = els.get(sh.id);
    if (!el) {
      el = makeEl(sh);
      parentEl.appendChild(el);
      els.set(sh.id, el);
    } else if (el.parentNode !== parentEl) {
      parentEl.appendChild(el); // moves => keeps z-order
    }
    if (sh.type === 'group') {
      const seen = new Set();
      for (const c of sh.children) { seen.add(c.id); walk(c, el); }
      for (const child of Array.from(el.children)) {
        const cid = child.getAttribute('data-id');
        if (cid && !seen.has(cid)) { el.removeChild(child); els.delete(cid); }
      }
    }
    updateShapeEl(sh, el);
  }

  function renderDoc() {
    const seen = new Set();
    for (const sh of state.doc.shapes) { seen.add(sh.id); walk(sh, world); }
    for (const child of Array.from(world.children)) {
      const cid = child.getAttribute('data-id');
      if (cid && !seen.has(cid)) { world.removeChild(child); els.delete(cid); }
    }
  }

  function updateShape(sh) {
    const el = els.get(sh.id);
    if (el) updateShapeEl(sh, el);
  }

  /* ---------------- overlay ---------------- */
  const CURSORS = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', rot: 'grab' };

  function screenPoly(pts, cls, parent) {
    const str = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    return svgEl('polygon', { points: str, 'class': cls }, parent);
  }

  function handleSet(list, parent) {
    for (const h of list) {
      svgEl('rect', {
        x: h.x - 8, y: h.y - 8, width: 16, height: 16,
        'class': 'ov-handle-hit', 'data-h': h.id, cursor: CURSORS[h.id]
      }, parent);
      svgEl('rect', {
        x: h.x - 4.5, y: h.y - 4.5, width: 9, height: 9, 'class': 'ov-handle'
      }, parent);
    }
  }

  function penPreview(pen, parent) {
    const A = pen.anchors;
    const P = p => toScreen(p.x, p.y);
    // committed segments
    const n = A.length;
    const last = pen.closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const a = A[i], b = A[(i + 1) % n];
      if (a.out && b.in) {
        const pts = [];
        for (let s = 0; s <= 12; s++) {
          const t = s / 12, u = 1 - t;
          const x = u*u*u*a.x + 3*u*u*t*(a.x+a.out[0]) + 3*u*t*t*(b.x+b.in[0]) + t*t*t*b.x;
          const y = u*u*u*a.y + 3*u*u*t*(a.y+a.out[1]) + 3*u*t*t*(b.y+b.in[1]) + t*t*t*b.y;
          pts.push(toScreen(x, y));
        }
        screenPoly(pts, 'ov-penseg', parent);
      } else {
        svgEl('line', {
          x1: P(a)[0], y1: P(a)[1], x2: P(b)[0], y2: P(b)[1], 'class': 'ov-penseg'
        }, parent);
      }
    }
    // rubber band to cursor
    if (pen.cursor) {
      const a = A[n - 1];
      if (a && a.out && !pen.closed) {
        const pts = [];
        for (let s = 0; s <= 12; s++) {
          const t = s / 12, u = 1 - t;
          const x = u*u*u*a.x + 3*u*u*t*(a.x+a.out[0]) + 3*u*t*t*(pen.cursor.x - a.out[0]) + t*t*t*pen.cursor.x;
          const y = u*u*u*a.y + 3*u*u*t*(a.y+a.out[1]) + 3*u*t*t*(pen.cursor.y - a.out[1]) + t*t*t*pen.cursor.y;
          pts.push(toScreen(x, y));
        }
        screenPoly(pts, 'ov-rubber', parent);
      } else if (a && !pen.closed) {
        const p1 = P(a), p2 = toScreen(pen.cursor.x, pen.cursor.y);
        svgEl('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], 'class': 'ov-rubber' }, parent);
      }
    }
    // anchors
    for (let i = 0; i < n; i++) {
      const p = P(A[i]);
      svgEl('rect', { x: p[0] - 4, y: p[1] - 4, width: 8, height: 8, 'class': 'ov-node-anchor' }, parent);
    }
    if (pen.hoverFirst && n > 1) {
      const p = P(A[0]);
      svgEl('circle', { cx: p[0], cy: p[1], r: 8, fill: 'none', stroke: '#8b7cff', 'stroke-width': 2 }, parent);
    }
  }

  function renderOverlay() {
    if (!overlay) return;
    while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
    const st = state.overlayState;

    if (st.pencil && st.pencil.pts.length > 1) {
      const pts = st.pencil.pts.map(p => toScreen(p.x, p.y));
      screenPoly(pts, 'ov-pencil', overlay);
    }

    if (st.pen) penPreview(st.pen, overlay);

    if (st.marquee) {
      const m = st.marquee;
      const x = Math.min(m.x1, m.x2), y = Math.min(m.y1, m.y2);
      svgEl('rect', {
        x, y, width: Math.abs(m.x2 - m.x1), height: Math.abs(m.y2 - m.y1),
        'class': 'ov-marquee'
      }, overlay);
    }

    if (state.editing) {
      if (App.NE) App.NE.overlay(overlay);
      return;
    }

    const sel = docApi.selShapes();

    // hover outline
    if (state.hover && !docApi.isSel(state.hover) && !st.marquee) {
      const sh = docApi.shapeById(state.hover);
      if (sh && sh.visible !== false) {
        screenPoly(S.cornersWorld(sh).map(p => toScreen(p[0], p[1])), 'ov-hover', overlay);
      }
    }

    // selection outlines
    for (const sh of sel) {
      screenPoly(S.cornersWorld(sh).map(p => toScreen(p[0], p[1])), 'ov-outline', overlay);
    }

    // transform handles
    if (state.tool === 'select' && !st.marquee) {
      if (sel.length === 1 && !sel[0].locked) {
        const sh = sel[0];
        const c4 = S.cornersWorld(sh).map(p => toScreen(p[0], p[1]));
        const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const tl = c4[0], tr = c4[1], br = c4[2], bl = c4[3];
        const n = mid(tl, tr), e = mid(tr, br), s = mid(br, bl), w = mid(bl, tl);
        handleSet([
          { id: 'nw', x: tl[0], y: tl[1] }, { id: 'ne', x: tr[0], y: tr[1] },
          { id: 'se', x: br[0], y: br[1] }, { id: 'sw', x: bl[0], y: bl[1] },
          { id: 'n', x: n[0], y: n[1] }, { id: 'e', x: e[0], y: e[1] },
          { id: 's', x: s[0], y: s[1] }, { id: 'w', x: w[0], y: w[1] }
        ], overlay);
        // rotate handle above top edge midpoint
        const c = S.worldBBox(sh);
        const cScr = toScreen(c.x + c.w / 2, c.y + c.h / 2);
        let nx = n[0] - cScr[0], ny = n[1] - cScr[1];
        const len = Math.hypot(nx, ny) || 1;
        nx /= len; ny /= len;
        const rp = [n[0] + nx * 30, n[1] + ny * 30];
        svgEl('line', { x1: n[0], y1: n[1], x2: rp[0], y2: rp[1], 'class': 'ov-rotline' }, overlay);
        svgEl('circle', { cx: rp[0], cy: rp[1], r: 11, 'class': 'ov-handle-hit', 'data-h': 'rot', cursor: CURSORS.rot }, overlay);
        svgEl('circle', { cx: rp[0], cy: rp[1], r: 5.5, 'class': 'ov-handle' }, overlay);
      } else if (sel.length > 1) {
        const bb = App.G.unionBB(sel.map(S.worldBBox));
        if (bb) {
          const p = toScreen(bb.x, bb.y), q = toScreen(bb.x + bb.w, bb.y + bb.h);
          handleSet([
            { id: 'nw', x: p[0], y: p[1] }, { id: 'ne', x: q[0], y: p[1] },
            { id: 'se', x: q[0], y: q[1] }, { id: 'sw', x: p[0], y: q[1] }
          ], overlay);
        }
      }
    }
  }

  /* ---------------- init ---------------- */
  function init() {
    stage = document.getElementById('stage');
    wrap = document.getElementById('stageWrap');
    world = document.getElementById('world');
    overlay = document.getElementById('overlay');
    chromeG = document.getElementById('chrome');
    abShadow = document.getElementById('abShadow');
    abBg = document.getElementById('abBg');
    abGrid = document.getElementById('abGrid');

    App.events.on('doc', () => { renderDoc(); renderChrome(); renderOverlay(); });
    App.events.on('view', () => { applyView(); renderOverlay(); });
    App.events.on('sel', () => renderOverlay());
    App.events.on('mode', () => renderOverlay());
    App.events.on('grid', () => renderChrome());
    App.events.on('tool', () => { stage.dataset.tool = state.tool; });

    if (window.ResizeObserver) {
      new ResizeObserver(() => renderOverlay()).observe(wrap);
    }
  }

  App.R = {
    init, svgEl, renderDoc, renderChrome, renderOverlay, updateShape,
    toWorld, toScreen, zoomAt, zoomBy, setZoom, fitPage, fitSelection,
    els, applyView
  };
})();
