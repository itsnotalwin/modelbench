/* ============================================================
   Vectra Studio — tools, pointer gestures, keyboard, zoom/pan
   ============================================================ */
'use strict';
(() => {
  const state = App.state;
  const docApi = App.docApi;
  const hist = App.hist;
  const R = App.R;
  const S = App.S;
  const U = App.U;
  const clamp = U.clamp;
  const { rotP } = App.G;

  const stage = () => document.getElementById('stage');
  let gesture = null;
  let pen = null;              // pen tool state while placing points
  let spaceDown = false;
  let pointers = new Map();
  let hoverRAF = 0;

  const HINTS = {
    select: 'Click to select · drag to move · Shift+click adds to the selection · drag empty space to marquee-select',
    node: 'Click a point to drag it · drag a round handle to curve · double-click a segment adds a point · Alt+click a point deletes it',
    hand: 'Drag to pan · scroll or pinch to zoom',
    rect: 'Drag to draw a rectangle · hold Shift for a square',
    ellipse: 'Drag to draw an ellipse · hold Shift for a circle',
    line: 'Drag to draw a line · hold Shift to snap to 45° angles',
    polygon: 'Drag outward from the center to set the size · the side count is editable in Properties',
    pen: 'Click to place points · drag while placing to curve · click the first point or press Enter to close the path',
    pencil: 'Drag to sketch a freehand path'
  };

  /* ================= helpers ================= */
  function wpt(e) { return R.toWorld(e.clientX, e.clientY); }

  function hitShape(e) {
    const el = e.target && e.target.closest ? e.target.closest('#world [data-id]') : null;
    if (!el) return null;
    let inner = el.getAttribute('data-id');
    let top = inner;
    let cur = el;
    const world = document.getElementById('world');
    while (cur && cur !== world) {
      const id = cur.getAttribute && cur.getAttribute('data-id');
      if (id) top = id;
      cur = cur.parentNode;
    }
    const sh = docApi.shapeById(top);
    if (!sh || sh.locked) return null;
    return { inner, top, shape: sh };
  }

  function setHint(text) {
    const el = document.getElementById('stHint');
    if (el) el.textContent = text;
  }

  function discardPen() {
    pen = null;
    state.overlayState.pen = null;
    R.renderOverlay();
  }

  function penFinish(closeIt) {
    if (!pen) return;
    if (pen.anchors.length < 2) {
      if (App.UI) App.UI.toast('Place at least two points first');
      discardPen();
      return;
    }
    const st = state.style;
    const anchors = pen.anchors.map(a => ({
      x: +a.x.toFixed(2), y: +a.y.toFixed(2),
      in: a.in ? a.in.slice() : null,
      out: a.out ? a.out.slice() : null,
      smooth: !!a.smooth
    }));
    const sh = S.create('path', {
      style: { fill: 'none', stroke: st.stroke, strokeWidth: st.strokeWidth, dash: st.dash, opacity: st.opacity },
      geo: { anchors, closed: !!closeIt && anchors.length >= 3 }
    });
    pen = null;
    state.overlayState.pen = null;
    state.doc.shapes.push(sh);
    R.renderDoc();
    docApi.setSel([sh.id]);
    docApi.docChanged();
    hist.push('Draw path');
    state.setTool('select');
  }

  function commitPreview(sh, label, tiny) {
    if (tiny) {
      const i = state.doc.shapes.indexOf(sh);
      if (i !== -1) state.doc.shapes.splice(i, 1);
      R.renderDoc();
      return;
    }
    R.updateShape(sh);
    docApi.setSel([sh.id]);
    docApi.docChanged();
    hist.push(label);
    state.setTool('select');
  }

  function currentStyle() {
    const st = state.style;
    return { fill: st.fill, stroke: st.stroke, strokeWidth: st.strokeWidth, dash: st.dash, opacity: st.opacity };
  }

  /* ================= gestures ================= */
  function startPan(e) {
    const start = { x: e.clientX, y: e.clientY, vx: state.view.x, vy: state.view.y };
    stage().classList.add('panning');
    gesture = {
      kind: 'pan',
      move(ev) {
        state.view.x = start.vx + (ev.clientX - start.x);
        state.view.y = start.vy + (ev.clientY - start.y);
        docApi.viewChanged();
      },
      up() { stage().classList.remove('panning'); },
      cancel() { stage().classList.remove('panning'); }
    };
  }

  function startPinch() {
    const pts = Array.from(pointers.values());
    const d0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
    const mid0 = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    const v0 = { k: state.view.k, x: state.view.x, y: state.view.y };
    gesture = {
      kind: 'pinch',
      move() {
        const p = Array.from(pointers.values());
        if (p.length < 2) return;
        const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1;
        const mid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
        const k2 = clamp(v0.k * (d / d0), 0.02, 64);
        const r = k2 / v0.k;
        state.view.k = k2;
        state.view.x = mid.x - (mid0.x - v0.x) * r;
        state.view.y = mid.y - (mid0.y - v0.y) * r;
        docApi.viewChanged();
      },
      up() { },
      cancel() { }
    };
  }

  function startMove(e, ids) {
    const w = wpt(e);
    const items = [];
    for (const id of ids) {
      const sh = docApi.shapeById(id);
      if (sh && !sh.locked) items.push({ id, snap: S.clone(sh) });
    }
    if (!items.length) return;
    let moved = false;
    gesture = {
      kind: 'move',
      move(ev) {
        const p = wpt(ev);
        let dx = p.x - w.x, dy = p.y - w.y;
        if (ev.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0;
        }
        if (Math.abs(dx) + Math.abs(dy) > 0.2) moved = true;
        for (const it of items) {
          const live = docApi.shapeById(it.id);
          if (!live) continue;
          S.restore(live, it.snap);
          S.translate(live, dx, dy);
          R.updateShape(live);
        }
        R.renderOverlay();
      },
      up() {
        if (moved) { docApi.docChanged(); hist.push('Move'); }
      },
      cancel() {
        for (const it of items) {
          const live = docApi.shapeById(it.id);
          if (live) { S.restore(live, it.snap); R.updateShape(live); }
        }
        R.renderOverlay();
      }
    };
  }

  function startResize(dir, e) {
    const sel = docApi.selShapes().filter(s => !s.locked);
    if (!sel.length) return;
    if (sel.length === 1) {
      const sh = sel[0];
      const snap = S.clone(sh);
      const bb0 = S.localBBox(sh);
      const angle = sh.angle || 0;
      const c0 = S.centerOf(sh);
      // fixed anchor point in local coords
      let ax, ay, edges = null;
      const x1 = bb0.x, y1 = bb0.y, x2 = bb0.x + bb0.w, y2 = bb0.y + bb0.h;
      if (dir === 'nw') { ax = x2; ay = y2; }
      else if (dir === 'ne') { ax = x1; ay = y2; }
      else if (dir === 'se') { ax = x1; ay = y1; }
      else if (dir === 'sw') { ax = x2; ay = y1; }
      else if (dir === 'n') { ax = null; ay = y2; edges = 'y'; }
      else if (dir === 's') { ax = null; ay = y1; edges = 'y'; }
      else if (dir === 'e') { ax = x1; ay = null; edges = 'x'; }
      else { ax = x2; ay = null; edges = 'x'; }
      const anchorW = rotP(ax === null ? (x1 + x2) / 2 : ax, ay === null ? (y1 + y2) / 2 : ay, angle, c0.x, c0.y);
      let changed = false;
      gesture = {
        kind: 'resize',
        move(ev) {
          S.restore(sh, snap);
          const w = wpt(ev);
          const pl = rotP(w.x, w.y, -angle, c0.x, c0.y); // pointer in local frame
          let nw = bb0.w, nh = bb0.h;
          if (edges !== 'x') {
            const want = Math.abs(pl[0] - ax);
            nw = Math.max(1, want);
          }
          if (edges !== 'y') {
            const want = Math.abs(pl[1] - ay);
            nh = Math.max(1, want);
          }
          if (ev.shiftKey && edges === null && bb0.w > 0.5 && bb0.h > 0.5) {
            const s = Math.max(nw / bb0.w, nh / bb0.h);
            nw = bb0.w * s; nh = bb0.h * s;
          }
          const sx = bb0.w > 0.01 ? nw / bb0.w : 1;
          const sy = bb0.h > 0.01 ? nh / bb0.h : 1;
          if (edges === 'x') { S.scaleGeom(sh, sx, 1, anchorW[0], anchorW[1]); }
          else if (edges === 'y') { S.scaleGeom(sh, 1, sy, anchorW[0], anchorW[1]); }
          else { S.scaleGeom(sh, sx, sy, anchorW[0], anchorW[1]); }
          changed = true;
          R.updateShape(sh);
          R.renderOverlay();
        },
        up() { if (changed) { docApi.docChanged(); hist.push('Resize'); } },
        cancel() { S.restore(sh, snap); R.updateShape(sh); R.renderOverlay(); }
      };
    } else {
      // multi-selection: scale around the union bbox (no rotation frame)
      const snaps = sel.map(s => ({ sh: s, snap: S.clone(s) }));
      const bb0 = App.G.unionBB(sel.map(S.worldBBox));
      let ax, ay;
      if (dir === 'nw') { ax = bb0.x + bb0.w; ay = bb0.y + bb0.h; }
      else if (dir === 'ne') { ax = bb0.x; ay = bb0.y + bb0.h; }
      else if (dir === 'se') { ax = bb0.x; ay = bb0.y; }
      else { ax = bb0.x + bb0.w; ay = bb0.y; }
      let changed = false;
      gesture = {
        kind: 'resize-multi',
        move(ev) {
          for (const it of snaps) S.restore(it.sh, it.snap);
          const w = wpt(ev);
          let nw = Math.max(1, Math.abs(w.x - ax));
          let nh = Math.max(1, Math.abs(w.y - ay));
          if (ev.shiftKey && bb0.w > 0.5 && bb0.h > 0.5) {
            const s = Math.max(nw / bb0.w, nh / bb0.h);
            nw = bb0.w * s; nh = bb0.h * s;
          }
          const sx = bb0.w > 0.01 ? nw / bb0.w : 1;
          const sy = bb0.h > 0.01 ? nh / bb0.h : 1;
          for (const it of snaps) S.scaleGeom(it.sh, sx, sy, ax, ay);
          changed = true;
          for (const it of snaps) R.updateShape(it.sh);
          R.renderOverlay();
        },
        up() { if (changed) { docApi.docChanged(); hist.push('Resize'); } },
        cancel() {
          for (const it of snaps) { S.restore(it.sh, it.snap); R.updateShape(it.sh); }
          R.renderOverlay();
        }
      };
    }
  }

  function startRotate(e) {
    const sh = docApi.singleSel();
    if (!sh || sh.locked) return;
    const snap = S.clone(sh);
    const bb = S.worldBBox(sh);
    const c = { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 };
    const w0 = wpt(e);
    const a0 = Math.atan2(w0.y - c.y, w0.x - c.x);
    const angle0 = sh.angle || 0;
    let changed = false;
    gesture = {
      kind: 'rotate',
      move(ev) {
        const w = wpt(ev);
        let deg = angle0 + (Math.atan2(w.y - c.y, w.x - c.x) - a0) * U.R2D;
        if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
        sh.angle = Math.round(deg * 10) / 10;
        changed = true;
        R.updateShape(sh);
        R.renderOverlay();
      },
      up() { if (changed) { docApi.docChanged(); hist.push('Rotate'); } },
      cancel() { S.restore(sh, snap); R.updateShape(sh); R.renderOverlay(); }
    };
  }

  function startMarquee(e) {
    const rect = stage().getBoundingClientRect();
    const s0 = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const additive = e.shiftKey;
    let moved = false;
    let last = s0;
    gesture = {
      kind: 'marquee',
      move(ev) {
        last = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
        if (Math.abs(last.x - s0.x) + Math.abs(last.y - s0.y) > 4) moved = true;
        state.overlayState.marquee = { x1: s0.x, y1: s0.y, x2: last.x, y2: last.y };
        R.renderOverlay();
      },
      up() {
        state.overlayState.marquee = null;
        R.renderOverlay();
        if (!moved) {
          if (!additive) docApi.setSel([]);
          return;
        }
        // marquee rect in world coordinates
        const wx1 = (s0.x - state.view.x) / state.view.k, wy1 = (s0.y - state.view.y) / state.view.k;
        const wx2 = (last.x - state.view.x) / state.view.k, wy2 = (last.y - state.view.y) / state.view.k;
        const rx1 = Math.min(wx1, wx2), ry1 = Math.min(wy1, wy2);
        const rx2 = Math.max(wx1, wx2), ry2 = Math.max(wy1, wy2);
        const ids = [];
        for (const sh of state.doc.shapes) {
          if (sh.locked || sh.visible === false) continue;
          const bb = S.worldBBox(sh);
          if (bb.x < rx2 && bb.x + bb.w > rx1 && bb.y < ry2 && bb.y + bb.h > ry1) ids.push(sh.id);
        }
        if (additive) {
          const set = new Set(state.sel);
          ids.forEach(id => set.add(id));
          docApi.setSel(Array.from(set));
        } else {
          docApi.setSel(ids);
        }
      },
      cancel() { state.overlayState.marquee = null; R.renderOverlay(); }
    };
  }

  function startDraw(type, e) {
    const w = wpt(e);
    const style = currentStyle();
    let sh;
    if (type === 'rect') sh = S.create('rect', { style, geo: { x: w.x, y: w.y, w: 0.01, h: 0.01 } });
    else if (type === 'ellipse') sh = S.create('ellipse', { style, geo: { cx: w.x, cy: w.y, rx: 0.01, ry: 0.01 } });
    else if (type === 'line') sh = S.create('line', { style: Object.assign({}, style, { fill: 'none' }), geo: { x1: w.x, y1: w.y, x2: w.x, y2: w.y } });
    else if (type === 'polygon') sh = S.create('polygon', { style, geo: { pts: S.regularPolygon(w.x, w.y, 1, state.style.sides, -90), sides: state.style.sides } });
    state.doc.shapes.push(sh);
    R.renderDoc();
    let changed = false;
    gesture = {
      kind: 'draw-' + type,
      sh,
      move(ev) {
        const p = wpt(ev);
        const dx = p.x - w.x, dy = p.y - w.y;
        if (Math.abs(dx) + Math.abs(dy) > 0.5) changed = true;
        if (type === 'rect') {
          let bw = dx, bh = dy;
          if (ev.shiftKey) {
            const s = Math.max(Math.abs(dx), Math.abs(dy));
            bw = Math.sign(dx || 1) * s; bh = Math.sign(dy || 1) * s;
          }
          sh.x = Math.min(w.x, w.x + bw); sh.w = Math.abs(bw);
          sh.y = Math.min(w.y, w.y + bh); sh.h = Math.abs(bh);
        } else if (type === 'ellipse') {
          let bw = dx, bh = dy;
          if (ev.shiftKey) {
            const s = Math.max(Math.abs(dx), Math.abs(dy));
            bw = Math.sign(dx || 1) * s; bh = Math.sign(dy || 1) * s;
          }
          sh.cx = w.x + bw / 2; sh.cy = w.y + bh / 2;
          sh.rx = Math.abs(bw) / 2; sh.ry = Math.abs(bh) / 2;
        } else if (type === 'line') {
          let ex = p.x, ey = p.y;
          if (ev.shiftKey) {
            const ang = Math.atan2(dy, dx);
            const snapped = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
            const len = Math.hypot(dx, dy);
            ex = w.x + Math.cos(snapped) * len;
            ey = w.y + Math.sin(snapped) * len;
          }
          sh.x2 = ex; sh.y2 = ey;
        } else if (type === 'polygon') {
          const r = Math.max(1, Math.hypot(dx, dy));
          const rot = Math.atan2(dy, dx) * U.R2D;
          sh.pts = S.regularPolygon(w.x, w.y, r, state.style.sides, rot);
        }
        R.updateShape(sh);
        R.renderOverlay();
      },
      up() {
        const bb = S.localBBox(sh);
        const tiny = type === 'line'
          ? U.dist(sh.x1, sh.y1, sh.x2, sh.y2) < 4
          : type === 'polygon' ? bb.w < 4 && bb.h < 4
          : bb.w < 2 && bb.h < 2;
        if (!changed || tiny) {
          commitPreview(sh, '', true);
          return;
        }
        commitPreview(sh, type === 'polygon' ? 'Draw polygon' : 'Draw ' + type, false);
      },
      cancel() { commitPreview(sh, '', true); }
    };
  }

  function startPencil(e) {
    const pts = [wpt(e)];
    let lastScreen = { x: e.clientX, y: e.clientY };
    gesture = {
      kind: 'pencil',
      move(ev) {
        if (U.dist(lastScreen.x, lastScreen.y, ev.clientX, ev.clientY) < 2.5) return;
        lastScreen = { x: ev.clientX, y: ev.clientY };
        pts.push(wpt(ev));
        state.overlayState.pencil = { pts: pts.slice() };
        R.renderOverlay();
      },
      up() {
        state.overlayState.pencil = null;
        R.renderOverlay();
        let total = 0;
        for (let i = 1; i < pts.length; i++) total += U.dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
        if (pts.length < 2 || total < 6) return;
        const simp = S.simplifyRDP(pts, 1.4 / state.view.k);
        const st = state.style;
        const sh = S.pathFromPoints(simp, { fill: 'none', stroke: st.stroke, strokeWidth: st.strokeWidth, dash: st.dash, opacity: st.opacity }, 'Pencil stroke');
        state.doc.shapes.push(sh);
        R.renderDoc();
        docApi.setSel([sh.id]);
        docApi.docChanged();
        hist.push('Draw path');
      },
      cancel() { state.overlayState.pencil = null; R.renderOverlay(); }
    };
  }

  /* pen flow: down = place point / start drag, move = curve out, up = settle */
  function penDown(e, w) {
    if (!pen) pen = { anchors: [], closed: false };
    // clicking near the first anchor closes the path
    if (pen.anchors.length >= 2) {
      const first = pen.anchors[0];
      const fs = R.toScreen(first.x, first.y);
      const rect = stage().getBoundingClientRect();
      const cs = [e.clientX - rect.left, e.clientY - rect.top];
      if (U.dist(fs[0], fs[1], cs[0], cs[1]) < 10) {
        penFinish(true);
        return;
      }
    }
    // a second click on the same spot finishes an open path (double-click)
    const lastA = pen.anchors[pen.anchors.length - 1];
    if (lastA && U.dist(lastA.x, lastA.y, w.x, w.y) * state.view.k < 4) {
      penFinish(false);
      return;
    }
    pen.anchors.push({ x: w.x, y: w.y, in: null, out: null, smooth: false });
    state.overlayState.pen = { anchors: pen.anchors, cursor: null, hoverFirst: false };
    R.renderOverlay();
    const a = pen.anchors[pen.anchors.length - 1];
    const start = { x: e.clientX, y: e.clientY };
    let dragged = false;
    gesture = {
      kind: 'pen-drag',
      move(ev) {
        const p = wpt(ev);
        const dx = p.x - a.x, dy = p.y - a.y;
        if (U.dist(start.x, start.y, ev.clientX, ev.clientY) > 4) dragged = true;
        if (dragged) {
          a.out = [dx, dy];
          a.in = [-dx, -dy];
          a.smooth = true;
        }
        state.overlayState.pen = { anchors: pen.anchors, cursor: p, hoverFirst: false };
        R.renderOverlay();
      },
      up() {
        if (!dragged) { a.out = null; a.in = null; a.smooth = false; }
        else if (Math.hypot(a.out[0], a.out[1]) * state.view.k < 3) {
          a.out = null; a.in = null; a.smooth = false;
        }
        state.overlayState.pen = { anchors: pen.anchors, cursor: null, hoverFirst: false };
        R.renderOverlay();
      },
      cancel() {
        a.out = null; a.in = null; a.smooth = false;
      }
    };
  }

  /* node-mode pointer handling */
  function nodePointerDown(nd, e) {
    const kind = nd.getAttribute('data-node');
    const sh = App.NE.activeShape();
    if (!sh) return;
    const i = parseInt(nd.getAttribute('data-i'), 10);
    if (kind === 'a') {
      if (e.altKey) {
        if (App.NE.deletePoint(sh, i)) {
          R.updateShape(sh);
          docApi.docChanged();
          hist.push('Edit nodes');
        } else if (App.UI) App.UI.toast('A path needs at least ' + (sh.closed ? 3 : 2) + ' points');
        return;
      }
      App.NE.setActiveAnchor(i);
      const m = App.NE.model(sh);
      gesture = {
        kind: 'node-point',
        move(ev) {
          const p = wpt(ev);
          App.NE.movePoint(sh, i, p.x, p.y);
          R.updateShape(sh);
          R.renderOverlay();
        },
        up() { docApi.docChanged(); hist.push('Edit nodes'); },
        cancel() { }
      };
    } else if (kind === 'c') {
      const which = nd.getAttribute('data-w');
      gesture = {
        kind: 'node-ctrl',
        move(ev) {
          const p = wpt(ev);
          App.NE.moveCtrl(sh, i, which, p.x, p.y, ev.altKey);
          R.updateShape(sh);
          R.renderOverlay();
        },
        up() { docApi.docChanged(); hist.push('Edit nodes'); },
        cancel() { }
      };
    } else if (kind === 'seg') {
      startMove(e, [sh.id]); // dragging a segment moves the whole shape
    }
  }

  /* ================= pointer events ================= */
  function onDown(e) {
    if (e.button === 2) return;
    const el = stage();
    el.focus({ preventScroll: true });
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { el.setPointerCapture(e.pointerId); } catch (err) { }
    state.hover = null;

    if (pointers.size === 2) {
      if (gesture && gesture.cancel) gesture.cancel();
      gesture = null;
      startPinch();
      return;
    }
    if (pointers.size > 2) return;

    const tool = state.tool;
    if (spaceDown || tool === 'hand' || e.button === 1) { startPan(e); return; }

    // transform handles (select tool)
    if (tool === 'select') {
      const h = e.target.closest && e.target.closest('[data-h]');
      if (h) {
        const dir = h.getAttribute('data-h');
        if (dir === 'rot') startRotate(e);
        else startResize(dir, e);
        return;
      }
    }

    // node-editing handles
    if (tool === 'node' && state.editing) {
      const nd = e.target.closest && e.target.closest('[data-node]');
      if (nd) { nodePointerDown(nd, e); return; }
    }

    const hit = hitShape(e);
    const w = wpt(e);

    if (tool === 'select' || tool === 'node') {
      if (hit) {
        const id = hit.top;
        if (e.shiftKey) {
          const set = new Set(state.sel);
          if (set.has(id)) set.delete(id); else set.add(id);
          docApi.setSel(Array.from(set));
          return;
        }
        if (tool === 'node' && !state.editing) {
          docApi.setSel([id]);
          App.NE.enter(id);
          return;
        }
        if (!docApi.isSel(id)) docApi.setSel([id]);
        if (e.altKey) {
          docApi.duplicateSel();
          if (state.sel.length) startMove(e, state.sel);
        } else {
          startMove(e, state.sel);
        }
        return;
      }
      if (tool === 'node' && state.editing) {
        // clicked away from nodes: move whole shape
        const sh = App.NE.activeShape();
        if (sh && !sh.locked) { startMove(e, [sh.id]); return; }
      }
      startMarquee(e);
      return;
    }

    if (tool === 'pen') { penDown(e, w); return; }
    if (tool === 'pencil') { startPencil(e); return; }
    if (tool === 'rect' || tool === 'ellipse' || tool === 'line' || tool === 'polygon') {
      startDraw(tool, e);
      return;
    }
  }

  function onMove(e) {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture) {
      if (gesture.kind === 'pinch' && pointers.size < 2) return;
      gesture.move(e);
      return;
    }
    // hover + coordinate status
    const w = wpt(e);
    if (App.UI) App.UI.updateCoords(w);
    if (state.tool === 'pen' && pen) {
      const rect = stage().getBoundingClientRect();
      const cs = [e.clientX - rect.left, e.clientY - rect.top];
      let hoverFirst = false;
      if (pen.anchors.length >= 2) {
        const f = R.toScreen(pen.anchors[0].x, pen.anchors[0].y);
        hoverFirst = U.dist(f[0], f[1], cs[0], cs[1]) < 10;
      }
      state.overlayState.pen = { anchors: pen.anchors, cursor: w, hoverFirst };
      R.renderOverlay();
      return;
    }
    if ((state.tool === 'select' || state.tool === 'node') && e.pointerType !== 'touch') {
      const hit = hitShape(e);
      const id = hit ? hit.top : null;
      if (id !== state.hover) {
        state.hover = id;
        if (hoverRAF) cancelAnimationFrame(hoverRAF);
        hoverRAF = requestAnimationFrame(() => { hoverRAF = 0; R.renderOverlay(); });
      }
    }
  }

  function onUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size >= 2) return;        // still pinching
    if (pointers.size === 1 && gesture && gesture.kind === 'pinch') {
      gesture = null;                      // pinch ended, one finger left
      return;
    }
    if (gesture) {
      const g = gesture;
      gesture = null;
      if (g.up) g.up(e);
    }
  }

  function onWheel(e) {
    e.preventDefault();
    const rect = stage().getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) {
      const f = clamp(Math.exp(-e.deltaY * 0.0022), 0.4, 2.5);
      R.zoomAt(e.clientX - rect.left, e.clientY - rect.top, f);
    } else {
      let dx = e.deltaX, dy = e.deltaY;
      const mult = e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? rect.height : 1);
      dx *= mult; dy *= mult;
      if (e.shiftKey && !dx) { dx = dy; dy = 0; }
      state.view.x -= dx;
      state.view.y -= dy;
      docApi.viewChanged();
    }
  }

  function onDblClick(e) {
    if (App.UI && App.UI.isModal && App.UI.isModal()) return;
    // node-mode double clicks
    if (state.tool === 'node' && state.editing) {
      const nd = e.target.closest && e.target.closest('[data-node]');
      if (nd) {
        const kind = nd.getAttribute('data-node');
        const sh = App.NE.activeShape();
        if (!sh) return;
        if (kind === 'a') {
          const i = parseInt(nd.getAttribute('data-i'), 10);
          if (App.NE.toggleSmooth(sh, i)) {
            R.updateShape(sh); R.renderOverlay();
            docApi.docChanged(); hist.push('Edit nodes');
          }
        } else if (kind === 'seg') {
          const si = parseInt(nd.getAttribute('data-si'), 10);
          const w = wpt(e);
          if (App.NE.insertOnSegment(sh, si, w.x, w.y)) {
            R.updateShape(sh); R.renderOverlay();
            docApi.docChanged(); hist.push('Edit nodes');
          } else if (App.UI) App.UI.toast('Points cannot be added to a straight line');
        }
        return;
      }
      return;
    }
    if (state.tool !== 'select') return;
    const hit = hitShape(e);
    if (hit) {
      if (hit.inner !== hit.top) {
        docApi.setSel([hit.inner]); // step into a group
        return;
      }
      const sh = hit.shape;
      if (App.NE.EDITABLE.indexOf(sh.type) !== -1 || sh.type === 'rect' || sh.type === 'ellipse') {
        App.NE.enter(hit.top);
      }
    }
  }

  /* ================= keyboard ================= */
  function nudge(dx, dy) {
    const sel = docApi.selShapes().filter(s => !s.locked);
    if (!sel.length) return;
    for (const sh of sel) S.translate(sh, dx, dy);
    docApi.docChanged();
    hist.push('Nudge', { coalesce: 700 });
  }

  function onKey(e) {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) {
      if (e.key === 'Escape') t.blur();
      return;
    }
    if (App.UI && App.UI.isModal && App.UI.isModal()) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;

    if (mod) {
      const lk = k.toLowerCase();
      if (lk === 'z') { e.preventDefault(); if (e.shiftKey) hist.redo(); else hist.undo(); return; }
      if (lk === 'y') { e.preventDefault(); hist.redo(); return; }
      if (lk === 'd') { e.preventDefault(); docApi.duplicateSel(); return; }
      if (lk === 'a') { e.preventDefault(); docApi.selectAll(); return; }
      if (lk === 'g') {
        e.preventDefault();
        if (e.shiftKey) docApi.ungroupSel(); else docApi.groupSel();
        return;
      }
      if (lk === 'c') { e.preventDefault(); const n = docApi.copySel(); if (App.UI) App.UI.toast(n ? ('Copied ' + n + ' shape' + (n > 1 ? 's' : '')) : 'Nothing selected'); return; }
      if (lk === 'x') { e.preventDefault(); if (docApi.copySel()) docApi.deleteSel(); return; }
      if (lk === 'v') { e.preventDefault(); docApi.paste(); return; }
      if (lk === 's') { e.preventDefault(); if (App.F) App.F.exportSvg(); return; }
      if (lk === 'o') { e.preventDefault(); if (App.F) App.F.openDialog(); return; }
      if (k === '0') { e.preventDefault(); R.setZoom(1); return; }
      if (k === '=' || k === '+') { e.preventDefault(); R.zoomBy(1.25); return; }
      if (k === '-') { e.preventDefault(); R.zoomBy(0.8); return; }
      return;
    }

    switch (k) {
      case 'Escape':
        e.preventDefault();
        if (gesture && gesture.cancel) { gesture.cancel(); gesture = null; }
        else if (pen) discardPen();
        else if (state.editing) App.NE.exit();
        else docApi.setSel([]);
        return;
      case 'Enter':
        e.preventDefault();
        if (pen) { penFinish(true); return; }
        if (state.editing) { App.NE.exit(); return; }
        {
          const sh = docApi.singleSel();
          if (sh && (App.NE.EDITABLE.indexOf(sh.type) !== -1 || sh.type === 'rect' || sh.type === 'ellipse')) {
            App.NE.enter(sh.id);
          }
        }
        return;
      case 'Delete': case 'Backspace':
        e.preventDefault();
        if (state.editing) {
          const i = App.NE.getActiveAnchor();
          const sh = App.NE.activeShape();
          if (sh && i >= 0) {
            if (App.NE.deletePoint(sh, i)) {
              R.updateShape(sh); docApi.docChanged(); hist.push('Edit nodes');
            } else if (App.UI) App.UI.toast('A path needs at least ' + (sh.closed ? 3 : 2) + ' points');
          }
        } else {
          docApi.deleteSel();
        }
        return;
      case 'ArrowLeft': e.preventDefault(); nudge(e.shiftKey ? -10 : -1, 0); return;
      case 'ArrowRight': e.preventDefault(); nudge(e.shiftKey ? 10 : 1, 0); return;
      case 'ArrowUp': e.preventDefault(); nudge(0, e.shiftKey ? -10 : -1); return;
      case 'ArrowDown': e.preventDefault(); nudge(0, e.shiftKey ? 10 : 1); return;
      case ' ': e.preventDefault(); if (!spaceDown) spaceDown = true; return;
      case ']': e.preventDefault(); docApi.zorder(e.shiftKey ? 'front' : 'forward'); return;
      case '[': e.preventDefault(); docApi.zorder(e.shiftKey ? 'back' : 'backward'); return;
      case '?': case '/':
        if (App.UI) App.UI.helpModal();
        return;
      case '!':
        if (e.shiftKey && App.UI) App.UI.helpModal();
        return;
      case '1':
        if (e.shiftKey) { e.preventDefault(); R.fitPage(); }
        return;
      case '2':
        if (e.shiftKey) { e.preventDefault(); R.fitSelection(); }
        return;
    }

    if (k.length === 1 && !mod) {
      const lk = k.toLowerCase();
      const toolMap = { v: 'select', h: 'hand', r: 'rect', o: 'ellipse', l: 'line', g: 'polygon', p: 'pen', b: 'pencil' };
      if (toolMap[lk]) { state.setTool(toolMap[lk]); return; }
      if (lk === 'n') {
        state.setTool('node');
        const sh = docApi.singleSel();
        if (sh) App.NE.enter(sh.id);
        return;
      }
    }
  }

  function onKeyUp(e) {
    if (e.key === ' ') spaceDown = false;
  }

  /* ================= init ================= */
  function init() {
    const el = stage();
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('dblclick', onDblClick);
    el.addEventListener('contextmenu', ev => ev.preventDefault());
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { spaceDown = false; });
    App.events.on('tool', () => {
      setHint(HINTS[state.tool] || '');
      if (state.tool !== 'pen' && pen) discardPen();
      if (state.tool !== 'node' && state.editing) App.NE.exit();
    });
    setHint(HINTS.select);
  }

  App.I = { init, discardPen, penFinish, isPen: () => !!pen, cancelGesture: () => { if (gesture && gesture.cancel) gesture.cancel(); gesture = null; } };
})();
