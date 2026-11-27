/* ============================================================
   Vectra Studio — Bézier node editing
   ============================================================ */
'use strict';
(() => {
  const docApi = App.docApi;
  const S = App.S;
  const state = App.state;
  const R = App.R;
  const EDITABLE = ['line', 'polygon', 'path'];
  let activeI = -1;

  function activeShape() {
    return state.editing ? docApi.shapeById(state.editing) : null;
  }

  function enter(id) {
    const sh = docApi.shapeById(id);
    if (!sh) return;
    if (sh.type === 'rect' || sh.type === 'ellipse') {
      const loc = docApi.locate(id);
      if (!loc) return;
      const hadRadius = sh.type === 'rect' && (sh.radius || 0) > 0.5;
      const p = S.toPath(sh);
      if (!p) return;
      loc.container[loc.index] = p;
      docApi.setSel([p.id]);
      docApi.docChanged();
      App.hist.push('Convert to path');
      docApi.setEditing(p.id);
      if (hadRadius && App.UI) App.UI.toast('Converted to a path — the corner radius becomes sharp corners');
    } else if (EDITABLE.indexOf(sh.type) !== -1) {
      docApi.setEditing(sh.id);
      docApi.setTool('node');
    } else {
      if (App.UI) App.UI.toast('Select a shape first, then edit its nodes');
    }
  }

  function exit() {
    if (state.editing) docApi.setEditing(null);
    activeI = -1;
    if (state.tool === 'node') docApi.setTool('select');
  }

  function toggle(id) {
    if (state.editing && state.editing === id) exit();
    else enter(id);
  }

  /* ---- unified node model (absolute coords) ---- */
  function model(sh) {
    if (sh.type === 'path') {
      const A = sh.anchors;
      return {
        pts: A.map(a => ({ x: a.x, y: a.y })),
        cIn: A.map(a => a.in ? [a.x + a.in[0], a.y + a.in[1]] : null),
        cOut: A.map(a => a.out ? [a.x + a.out[0], a.y + a.out[1]] : null),
        closed: !!sh.closed
      };
    }
    if (sh.type === 'line') {
      return {
        pts: [{ x: sh.x1, y: sh.y1 }, { x: sh.x2, y: sh.y2 }],
        cIn: [null, null], cOut: [null, null], closed: false
      };
    }
    if (sh.type === 'polygon') {
      return {
        pts: sh.pts.map(p => ({ x: p.x, y: p.y })),
        cIn: sh.pts.map(() => null), cOut: sh.pts.map(() => null), closed: true
      };
    }
    return null;
  }

  function movePoint(sh, i, x, y) {
    if (sh.type === 'line') {
      if (i === 0) { sh.x1 = x; sh.y1 = y; } else { sh.x2 = x; sh.y2 = y; }
    } else if (sh.type === 'polygon') {
      if (sh.pts[i]) { sh.pts[i].x = x; sh.pts[i].y = y; }
    } else if (sh.type === 'path') {
      const a = sh.anchors[i];
      if (a) { a.x = x; a.y = y; }
    }
  }

  function moveCtrl(sh, i, which, wx, wy, free) {
    if (sh.type !== 'path') return;
    const a = sh.anchors[i];
    if (!a) return;
    const key = which === 'in' ? 'in' : 'out';
    const d = [wx - a.x, wy - a.y];
    a[key] = d;
    if (!free && a.smooth) {
      const opp = key === 'in' ? 'out' : 'in';
      if (a[opp]) {
        const len = Math.hypot(a[opp][0], a[opp][1]);
        const dl = Math.hypot(d[0], d[1]);
        if (len > 0.01 && dl > 0.01) {
          a[opp] = [-d[0] / dl * len, -d[1] / dl * len];
        }
      }
    }
  }

  function insertOnSegment(sh, si, wx, wy) {
    if (sh.type === 'polygon') {
      if (si < 0 || si >= sh.pts.length) return false;
      sh.pts.splice(si + 1, 0, { x: +wx.toFixed(2), y: +wy.toFixed(2) });
      return true;
    }
    if (sh.type !== 'path') return false;
    const A = sh.anchors;
    const n = A.length;
    if (n < 2 || si < 0 || si >= n) return false;
    const i = si, j = (si + 1) % n;
    const a = A[i], b = A[j];
    if (a.out && b.in) {
      const p0 = [a.x, a.y], p1 = [a.x + a.out[0], a.y + a.out[1]];
      const p2 = [b.x + b.in[0], b.y + b.in[1]], p3 = [b.x, b.y];
      const L = (u, v, t) => [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t];
      const q01 = L(p0, p1, 0.5), q12 = L(p1, p2, 0.5), q23 = L(p2, p3, 0.5);
      const q012 = L(q01, q12, 0.5), q123 = L(q12, q23, 0.5);
      const m = L(q012, q123, 0.5);
      a.out = [q01[0] - p0[0], q01[1] - p0[1]];
      b.in = [q23[0] - p3[0], q23[1] - p3[1]];
      const na = {
        x: +m[0].toFixed(2), y: +m[1].toFixed(2),
        in: [q012[0] - m[0], q012[1] - m[1]],
        out: [q123[0] - m[0], q123[1] - m[1]],
        smooth: true
      };
      A.splice(j, 0, na);
    } else {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      A.splice(j, 0, { x: +mx.toFixed(2), y: +my.toFixed(2), in: null, out: null, smooth: false });
    }
    return true;
  }

  function deletePoint(sh, i) {
    if (sh.type === 'line') return false;
    if (sh.type === 'polygon') {
      if (sh.pts.length <= 3) return false;
      sh.pts.splice(i, 1);
      return true;
    }
    if (sh.type !== 'path') return false;
    const min = sh.closed ? 3 : 2;
    if (sh.anchors.length <= min) return false;
    sh.anchors.splice(i, 1);
    if (activeI >= sh.anchors.length) activeI = sh.anchors.length - 1;
    return true;
  }

  function toggleSmooth(sh, i) {
    if (sh.type !== 'path') return false;
    const a = sh.anchors[i];
    if (!a) return false;
    if (a.smooth) { a.smooth = false; return true; }
    if (a.out && !a.in) a.in = [-a.out[0], -a.out[1]];
    else if (a.in && !a.out) a.out = [-a.in[0], -a.in[1]];
    else if (a.in && a.out) {
      const lo = Math.hypot(a.in[0], a.in[1]);
      const lo2 = Math.hypot(a.out[0], a.out[1]);
      if (lo2 > 0.01) a.in = [-a.out[0] / lo2 * lo, -a.out[1] / lo2 * lo];
    } else {
      return false; // no handles yet — nothing to smooth
    }
    a.smooth = true;
    return true;
  }

  function toggleClosed(sh) {
    if (sh.type === 'path') {
      if (!sh.closed && sh.anchors.length < 3) return false;
      sh.closed = !sh.closed;
      return true;
    }
    return false;
  }

  /* ---- overlay rendering ---- */
  function overlay(ov) {
    const sh = activeShape();
    if (!sh) return;
    const m = model(sh);
    if (!m) return;
    const n = m.pts.length;
    const P = p => R.toScreen(p.x, p.y);

    // segments (light curve guide + wide invisible hit path for insertion)
    const last = m.closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const a = m.pts[i], b = m.pts[(i + 1) % n];
      const cout = m.cOut[i], cin = m.cIn[(i + 1) % n];
      let d;
      if (cout && cin) {
        const pts = [];
        for (let s = 0; s <= 14; s++) {
          const t = s / 14, u = 1 - t;
          const x = u*u*u*a.x + 3*u*u*t*cout[0] + 3*u*t*t*cin[0] + t*t*t*b.x;
          const y = u*u*u*a.y + 3*u*u*t*cout[1] + 3*u*t*t*cin[1] + t*t*t*b.y;
          const sp = R.toScreen(x, y);
          pts.push(sp[0].toFixed(1) + ' ' + sp[1].toFixed(1));
        }
        d = 'M ' + pts.join(' L ');
      } else {
        const p1 = P(a), p2 = P(b);
        d = 'M ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' L ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
      }
      R.svgEl('path', { d, 'class': 'ov-node-curve' }, ov);
      R.svgEl('path', {
        d, fill: 'none', stroke: '#000', 'stroke-opacity': 0, 'stroke-width': 14,
        'pointer-events': 'stroke', 'data-node': 'seg', 'data-si': i, cursor: 'default'
      }, ov);
    }

    // control points
    for (let i = 0; i < n; i++) {
      const a = m.pts[i];
      const pa = P(a);
      for (const which of ['in', 'out']) {
        const c = which === 'in' ? m.cIn[i] : m.cOut[i];
        if (!c) continue;
        const pc = R.toScreen(c[0], c[1]);
        R.svgEl('line', {
          x1: pa[0], y1: pa[1], x2: pc[0], y2: pc[1], 'class': 'ov-node-line'
        }, ov);
        R.svgEl('circle', {
          cx: pc[0], cy: pc[1], r: 10, fill: 'transparent',
          'data-node': 'c', 'data-i': i, 'data-w': which, cursor: 'move'
        }, ov);
        R.svgEl('circle', { cx: pc[0], cy: pc[1], r: 4, 'class': 'ov-node-ctrl' }, ov);
      }
    }

    // anchors
    for (let i = 0; i < n; i++) {
      const p = P(m.pts[i]);
      R.svgEl('rect', {
        x: p[0] - 10, y: p[1] - 10, width: 20, height: 20,
        fill: 'transparent', 'data-node': 'a', 'data-i': i, cursor: 'move'
      }, ov);
      const vis = R.svgEl('rect', {
        x: p[0] - 4.5, y: p[1] - 4.5, width: 9, height: 9, 'class': 'ov-node-anchor'
      }, ov);
      if (i === activeI) vis.classList.add('on');
    }
  }

  function setActiveAnchor(i) { activeI = i; }
  function getActiveAnchor() { return activeI; }

  App.NE = {
    enter, exit, toggle, activeShape, model,
    movePoint, moveCtrl, insertOnSegment, deletePoint, toggleSmooth, toggleClosed,
    overlay, setActiveAnchor, getActiveAnchor, EDITABLE
  };
})();
