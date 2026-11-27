/* ============================================================
   Vectra Studio — core utilities, geometry and shape model
   ============================================================ */
'use strict';
window.App = window.App || {};

/* ---------------- Utilities ---------------- */
App.U = (() => {
  let idc = 1;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const fmt = v => {
    if (!isFinite(v)) return '0';
    const n = Math.round(v * 100) / 100;
    return Object.is(n, -0) ? '0' : String(n);
  };
  const fmt1 = v => String(Math.round(v * 10) / 10);
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const escXml = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const uid = () => 's' + (idc++);
  const bumpId = () => { idc = Math.max(idc, 1); return idc; };

  const NAMED = {
    black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
    blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
    gray: '#808080', grey: '#808080', pink: '#ffc0cb', brown: '#a52a2a',
    cyan: '#00ffff', magenta: '#ff00ff', silver: '#c0c0c0', gold: '#ffd700',
    navy: '#000080', teal: '#008080', lime: '#00ff00', maroon: '#800000',
    olive: '#808000', aqua: '#00ffff', fuchsia: '#ff00ff', indigo: '#4b0082',
    violet: '#ee82ee', salmon: '#fa8072', tan: '#d2b48c', khaki: '#f0e68c'
  };

  // Normalize a CSS color to #rrggbb, 'none', or null when unknown.
  function hex6(c) {
    if (c == null) return null;
    c = String(c).trim().toLowerCase();
    if (c === 'none' || c === 'transparent') return 'none';
    if (NAMED[c]) return NAMED[c];
    let m = c.match(/^#([0-9a-f]{3})$/);
    if (m) return '#' + m[1].split('').map(h => h + h).join('');
    m = c.match(/^#([0-9a-f]{6})$/);
    if (m) return '#' + m[1];
    m = c.match(/^#([0-9a-f]{8})$/);
    if (m) return '#' + m[1].slice(0, 6);
    m = c.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      if (p.length >= 3 && p.every(n => !isNaN(n))) {
        const a = p.length > 3 ? p[3] : 1;
        if (a === 0) return 'none';
        return '#' + p.slice(0, 3).map(n => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')).join('');
      }
    }
    return null;
  }

  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  const sanitizeFile = s => String(s || 'drawing').trim().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60) || 'drawing';

  return { clamp, D2R, R2D, fmt, fmt1, dist, escXml, uid, bumpId, hex6, download, sanitizeFile, NAMED };
})();

/* ---------------- Geometry ---------------- */
App.G = (() => {
  const { D2R } = App.U;

  // Rotate point (x,y) by a degrees around (cx,cy). Returns [x', y'].
  function rotP(x, y, a, cx, cy) {
    if (!a) return [x, y];
    const r = a * D2R, c = Math.cos(r), s = Math.sin(r), dx = x - cx, dy = y - cy;
    return [cx + dx * c - dy * s, cy + dx * s + dy * c];
  }

  function cornersOf(bb) {
    const { x, y, w, h } = bb;
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; // tl, tr, br, bl
  }

  function ptsBB(pts) {
    if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 };
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const p of pts) {
      if (p[0] < x1) x1 = p[0]; if (p[1] < y1) y1 = p[1];
      if (p[0] > x2) x2 = p[0]; if (p[1] > y2) y2 = p[1];
    }
    return { x: x1, y: y1, w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) };
  }

  function unionBB(list) {
    if (!list || !list.length) return null;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const b of list) {
      if (x1 > b.x) x1 = b.x; if (y1 > b.y) y1 = b.y;
      if (x2 < b.x + b.w) x2 = b.x + b.w; if (y2 < b.y + b.h) y2 = b.y + b.h;
    }
    return { x: x1, y: y1, w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) };
  }

  // Axis-aligned bbox of a rect rotated by a degrees around its own center.
  function rotBB(bb, a) {
    if (!a) return { x: bb.x, y: bb.y, w: bb.w, h: bb.h };
    const c = { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 };
    return ptsBB(cornersOf(bb).map(p => rotP(p[0], p[1], a, c.x, c.y)));
  }

  return { rotP, cornersOf, ptsBB, unionBB, rotBB };
})();

/* ---------------- Shape model ---------------- */
App.S = (() => {
  const { rotP, cornersOf, ptsBB, unionBB, rotBB } = App.G;
  const { fmt } = App.U;

  const LABELS = {
    rect: 'Rectangle', ellipse: 'Ellipse', line: 'Line',
    polygon: 'Polygon', path: 'Path', group: 'Group'
  };
  const label = t => LABELS[t] || 'Shape';

  function baseStyle(o) {
    return Object.assign({
      fill: '#dfe7f2', stroke: '#3c4c63', strokeWidth: 2, dash: '', opacity: 1
    }, o || {});
  }

  function create(type, extra) {
    const e = extra || {};
    const sh = Object.assign({
      id: e.id || App.U.uid(),
      type,
      name: e.name || label(type),
      visible: true,
      locked: false,
      angle: 0
    }, baseStyle(e.style));
    const g = e.geo || {};
    if (type === 'rect') Object.assign(sh, { x: 0, y: 0, w: 100, h: 80, radius: 0 }, g);
    else if (type === 'ellipse') Object.assign(sh, { cx: 0, cy: 0, rx: 50, ry: 40 }, g);
    else if (type === 'line') Object.assign(sh, { x1: 0, y1: 0, x2: 100, y2: 100, fill: 'none' }, g);
    else if (type === 'polygon') Object.assign(sh, { pts: [[0, 0], [100, 0], [50, 80]], sides: 5 }, g);
    else if (type === 'path') Object.assign(sh, { anchors: [], closed: false }, g);
    else if (type === 'group') Object.assign(sh, { children: [] }, g);
    return sh;
  }

  function regularPolygon(cx, cy, r, n, rotDeg) {
    const pts = [];
    const rot = (rotDeg == null ? -90 : rotDeg) * App.U.D2R;
    for (let i = 0; i < n; i++) {
      const a = rot + i * 2 * Math.PI / n;
      pts.push({ x: +(cx + r * Math.cos(a)).toFixed(2), y: +(cy + r * Math.sin(a)).toFixed(2) });
    }
    return pts;
  }

  /* ---- bounding boxes ---- */
  function localBBox(sh) {
    switch (sh.type) {
      case 'rect': return { x: sh.x, y: sh.y, w: Math.max(0, sh.w), h: Math.max(0, sh.h) };
      case 'ellipse': return { x: sh.cx - sh.rx, y: sh.cy - sh.ry, w: sh.rx * 2, h: sh.ry * 2 };
      case 'line': return ptsBB([[sh.x1, sh.y1], [sh.x2, sh.y2]]);
      case 'polygon': return ptsBB(sh.pts.map(p => [p.x, p.y]));
      case 'path': return pathBBox(sh);
      case 'group':
        return unionBB(sh.children.filter(c => c.visible !== false).map(c => worldBBox(c))) ||
               { x: 0, y: 0, w: 0, h: 0 };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  function worldBBox(sh) {
    const bb = localBBox(sh);
    if (sh.type === 'group' || !sh.angle) return bb;
    return rotBB(bb, sh.angle);
  }

  // Rotation center = local bbox center (doc-space coords used by SVG rotate()).
  function centerOf(sh) {
    const bb = localBBox(sh);
    return { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 };
  }

  // The four corners of the (possibly rotated) shape frame, in doc space.
  function cornersWorld(sh) {
    const bb = localBBox(sh);
    if (sh.type === 'group' || !sh.angle) return cornersOf(bb);
    const c = { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 };
    return cornersOf(bb).map(p => rotP(p[0], p[1], sh.angle, c.x, c.y));
  }

  /* ---- path helpers ---- */
  function cubicAt(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
    ];
  }

  function pathBBox(sh) {
    const A = sh.anchors || [];
    if (!A.length) return { x: 0, y: 0, w: 0, h: 0 };
    const pts = [];
    const n = A.length;
    const last = sh.closed ? n : n - 1;
    for (let i = 0; i < n; i++) pts.push([A[i].x, A[i].y]);
    for (let i = 0; i < last; i++) {
      const a = A[i], b = A[(i + 1) % n];
      if (a.out && b.in) {
        for (let s = 1; s < 12; s++) {
          pts.push(cubicAt([a.x, a.y], [a.x + a.out.x, a.y + a.out.y],
            [b.x + b.in.x, b.y + b.in.y], [b.x, b.y], s / 12));
        }
      }
    }
    return ptsBB(pts);
  }

  function dFrom(sh) {
    const A = sh.anchors || [];
    if (!A.length) return '';
    let d = 'M ' + fmt(A[0].x) + ' ' + fmt(A[0].y);
    const n = A.length;
    const last = sh.closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const a = A[i], b = A[(i + 1) % n];
      const isWrap = sh.closed && i === n - 1; // Z already draws this straight segment
      if (a.out && b.in) {
        d += ' C ' + fmt(a.x + a.out[0]) + ' ' + fmt(a.y + a.out[1]) +
             ' ' + fmt(b.x + b.in[0]) + ' ' + fmt(b.y + b.in[1]) +
             ' ' + fmt(b.x) + ' ' + fmt(b.y);
      } else if (!isWrap) {
        d += ' L ' + fmt(b.x) + ' ' + fmt(b.y);
      }
    }
    if (sh.closed) d += ' Z';
    return d;
  }

  function ptsAttr(sh) {
    const P = sh.type === 'polygon' ? sh.pts : null;
    if (!P) return '';
    return P.map(p => fmt(p.x) + ',' + fmt(p.y)).join(' ');
  }

  /* ---- path `d` parser → subpaths of anchors ----
     Returns [{anchors:[{x,y,in,out,smooth}], closed}] */
  function parseD(d) {
    const toks = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\.?[0-9]+(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?/g) || [];
    const subs = [];
    let cur = null;
    let cx = 0, cy = 0, sx = 0, sy = 0;       // current point + subpath start
    let lastC2 = null;                          // last cubic control (for S)
    let prevQ = null;                           // last quadratic control (for T)
    let cmd = '';
    let ni = 0;
    const num = () => parseFloat(toks[ni++]);

    const ensure = () => {
      if (!cur) { cur = { anchors: [], closed: false }; subs.push(cur); }
      return cur;
    };
    const addA = (x, y, ctrlIn, ctrlOut, smooth) => {
      const s = ensure();
      s.anchors.push({ x, y, in: ctrlIn || null, out: ctrlOut || null, smooth: !!smooth });
    };

    while (ni < toks.length) {
      const t = toks[ni];
      if (/[a-zA-Z]/.test(t)) { cmd = t; ni++; }
      else if (cmd === '') break;

      switch (cmd) {
        case 'M': case 'm': {
          let x = num(), y = num();
          if (cmd === 'm') { x += cx; y += cy; }
          cur = null; // new subpath
          addA(x, y);
          cx = x; cy = y; sx = x; sy = y;
          cmd = cmd === 'M' ? 'L' : 'l';
          break;
        }
        case 'L': case 'l': {
          let x = num(), y = num();
          if (cmd === 'l') { x += cx; y += cy; }
          addA(x, y);
          cx = x; cy = y;
          break;
        }
        case 'H': case 'h': {
          let x = num();
          if (cmd === 'h') x += cx;
          addA(x, cy);
          cx = x;
          break;
        }
        case 'V': case 'v': {
          let y = num();
          if (cmd === 'v') y += cy;
          addA(cx, y);
          cy = y;
          break;
        }
        case 'C': case 'c': {
          let x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
          if (cmd === 'c') { x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy; }
          const s = ensure();
          const prev = s.anchors[s.anchors.length - 1];
          if (prev && !prev.out) prev.out = [x1 - prev.x, y1 - prev.y];
          addA(x, y, [x2 - x, y2 - y]);
          cx = x; cy = y; lastC2 = [x2, y2];
          break;
        }
        case 'S': case 's': {
          let x2 = num(), y2 = num(), x = num(), y = num();
          if (cmd === 's') { x2 += cx; y2 += cy; x += cx; y += cy; }
          let x1 = cx, y1 = cy;
          if (lastC2) { x1 = 2 * cx - lastC2[0]; y1 = 2 * cy - lastC2[1]; }
          const s = ensure();
          const prev = s.anchors[s.anchors.length - 1];
          if (prev && !prev.out) prev.out = [x1 - prev.x, y1 - prev.y];
          addA(x, y, [x2 - x, y2 - y]);
          cx = x; cy = y; lastC2 = [x2, y2];
          break;
        }
        case 'Q': case 'q': {
          let qx = num(), qy = num(), x = num(), y = num();
          if (cmd === 'q') { qx += cx; qy += cy; x += cx; y += cy; }
          const x1 = cx + (2 / 3) * (qx - cx), y1 = cy + (2 / 3) * (qy - cy);
          const x2 = x + (2 / 3) * (qx - x), y2 = y + (2 / 3) * (qy - y);
          const s = ensure();
          const prev = s.anchors[s.anchors.length - 1];
          if (prev && !prev.out) prev.out = [x1 - prev.x, y1 - prev.y];
          addA(x, y, [x2 - x, y2 - y]);
          cx = x; cy = y; lastC2 = [x2, y2]; prevQ = [qx, qy];
          break;
        }
        case 'T': case 't': {
          let x = num(), y = num();
          if (cmd === 't') { x += cx; y += cy; }
          let qx = cx, qy = cy;
          if (prevQ) { qx = 2 * cx - prevQ[0]; qy = 2 * cy - prevQ[1]; }
          const x1 = cx + (2 / 3) * (qx - cx), y1 = cy + (2 / 3) * (qy - cy);
          const x2 = x + (2 / 3) * (qx - x), y2 = y + (2 / 3) * (qy - y);
          const s = ensure();
          const prev = s.anchors[s.anchors.length - 1];
          if (prev && !prev.out) prev.out = [x1 - prev.x, y1 - prev.y];
          addA(x, y, [x2 - x, y2 - y]);
          cx = x; cy = y; lastC2 = [x2, y2]; prevQ = [qx, qy];
          break;
        }
        case 'A': case 'a': {
          const rx = num(), ry = num(), rot = num(), fa = num(), fs = num();
          let x = num(), y = num();
          if (cmd === 'a') { x += cx; y += cy; }
          arcSample(cx, cy, rx, ry, rot, fa, fs, x, y, addA);
          cx = x; cy = y; lastC2 = null; prevQ = null;
          break;
        }
        case 'Z': case 'z': {
          if (cur) {
            cur.closed = true;
            const A = cur.anchors;
            // a final point coinciding with the subpath start is the same anchor
            if (A.length >= 2) {
              const first = A[0], lastAn = A[A.length - 1];
              if (Math.abs(first.x - lastAn.x) < 0.01 && Math.abs(first.y - lastAn.y) < 0.01) {
                if (lastAn.in && !first.in) first.in = lastAn.in;
                if (lastAn.out && !first.out) first.out = lastAn.out;
                if (lastAn.smooth) first.smooth = true;
                A.pop();
              }
            }
            cx = sx; cy = sy;
          }
          cur = null;
          break;
        }
        default:
          ni++; // unknown token, skip
      }
    }
    return subs.filter(s => s.anchors.length >= 2);
  }

  // SVG arc endpoint→center parameterization, sampled as line anchors.
  function arcSample(x1, y1, rx, ry, phiDeg, fa, fs, x2, y2, addA) {
    if (rx === 0 || ry === 0 || (x1 === x2 && y1 === y2)) { addA(x2, y2); return; }
    rx = Math.abs(rx); ry = Math.abs(ry);
    const phi = phiDeg * App.U.D2R;
    const cosP = Math.cos(phi), sinP = Math.sin(phi);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const x1p = cosP * dx + sinP * dy, y1p = -sinP * dx + cosP * dy;
    let l = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (l > 1) { const s = Math.sqrt(l); rx *= s; ry *= s; }
    const num_ = (rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p);
    const den = (rx * rx * y1p * y1p + ry * ry * x1p * x1p);
    let c = Math.sqrt(Math.max(0, num_ / den));
    if (fa === fs) c = -c;
    const cxp = c * rx * y1p / ry, cyp = -c * ry * x1p / rx;
    const cx = cosP * cxp - sinP * cyp + (x1 + x2) / 2;
    const cy = sinP * cxp + cosP * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => {
      const dot = ux * vx + uy * vy;
      const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
      let a = Math.acos(App.U.clamp(dot / (len || 1), -1, 1));
      if (ux * vy - uy * vx < 0) a = -a;
      return a;
    };
    const th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (fs === 0 && dth > 0) dth -= 2 * Math.PI;
    if (fs === 1 && dth < 0) dth += 2 * Math.PI;
    const steps = App.U.clamp(Math.ceil(Math.abs(dth) / (Math.PI / 6)), 1, 24);
    for (let i = 1; i <= steps; i++) {
      const t = th1 + dth * i / steps;
      const px = cx + rx * Math.cos(t) * cosP - ry * Math.sin(t) * sinP;
      const py = cy + rx * Math.cos(t) * sinP + ry * Math.sin(t) * cosP;
      addA(+px.toFixed(2), +py.toFixed(2));
    }
  }

  /* ---- transforms ---- */
  function translate(sh, dx, dy) {
    if (sh.type === 'rect') { sh.x += dx; sh.y += dy; }
    else if (sh.type === 'ellipse') { sh.cx += dx; sh.cy += dy; }
    else if (sh.type === 'line') { sh.x1 += dx; sh.y1 += dy; sh.x2 += dx; sh.y2 += dy; }
    else if (sh.type === 'polygon') { for (const p of sh.pts) { p.x += dx; p.y += dy; } }
    else if (sh.type === 'path') { for (const a of sh.anchors) { a.x += dx; a.y += dy; } }
    else if (sh.type === 'group') { for (const c of sh.children) translate(c, dx, dy); }
  }

  // Scale local geometry about (ox, oy) in doc space; exact for angle=0.
  function scaleLocal(sh, sx, sy, ox, oy) {
    const E = 1e-4;
    sx = Math.abs(sx) < E ? E : sx;
    sy = Math.abs(sy) < E ? E : sy;
    const Fx = v => ox + (v - ox) * sx;
    const Fy = v => oy + (v - oy) * sy;
    switch (sh.type) {
      case 'rect':
        sh.x = Fx(sh.x); sh.w = Math.max(E, sh.w * sx);
        sh.y = Fy(sh.y); sh.h = Math.max(E, sh.h * sy);
        sh.radius = Math.max(0, sh.radius * Math.min(Math.abs(sx), Math.abs(sy)));
        break;
      case 'ellipse':
        sh.cx = Fx(sh.cx); sh.cy = Fy(sh.cy);
        sh.rx = Math.max(E, sh.rx * sx); sh.ry = Math.max(E, sh.ry * sy);
        break;
      case 'line':
        sh.x1 = Fx(sh.x1); sh.x2 = Fx(sh.x2);
        sh.y1 = Fy(sh.y1); sh.y2 = Fy(sh.y2);
        break;
      case 'polygon':
        for (const p of sh.pts) { p.x = Fx(p.x); p.y = Fy(p.y); }
        break;
      case 'path':
        for (const a of sh.anchors) {
          const out = a.out, cin = a.in;
          const ax = a.x, ay = a.y;
          a.x = Fx(ax); a.y = Fy(ay);
          if (out) {
            const cx2 = Fx(ax + out[0]), cy2 = Fy(ay + out[1]);
            out[0] = cx2 - a.x; out[1] = cy2 - a.y;
          }
          if (cin) {
            const cx2 = Fx(ax + cin[0]), cy2 = Fy(ay + cin[1]);
            cin[0] = cx2 - a.x; cin[1] = cy2 - a.y;
          }
        }
        break;
      case 'group':
        for (const c of sh.children) scaleGeom(c, sx, sy, ox, oy);
        break;
    }
  }

  // Scale about a world-space origin; keeps the origin point pinned even for rotated shapes.
  function scaleGeom(sh, sx, sy, ox, oy) {
    if (sh.angle) {
      const c = centerOf(sh);
      const ol = rotP(ox, oy, -sh.angle, c.x, c.y);
      scaleLocal(sh, sx, sy, ol[0], ol[1]);
      const c2 = centerOf(sh);
      const w = rotP(ol[0], ol[1], sh.angle, c2.x, c2.y);
      translate(sh, ox - w[0], oy - w[1]);
    } else {
      scaleLocal(sh, sx, sy, ox, oy);
    }
  }

  /* ---- conversions ---- */
  const KAPPA = 0.5522847498;

  // Convert rect / ellipse / line / polygon into an editable path shape.
  function toPath(sh) {
    let anchors = [], closed = false;
    if (sh.type === 'rect') {
      const { x, y, w, h } = sh;
      anchors = [
        { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }
      ].map(p => ({ x: p.x, y: p.y, in: null, out: null, smooth: false }));
      closed = true;
    } else if (sh.type === 'ellipse') {
      const { cx, cy, rx, ry } = sh;
      const kx = rx * KAPPA, ky = ry * KAPPA;
      anchors = [
        { x: cx + rx, y: cy, out: [0, -ky], in: [0, ky] },
        { x: cx, y: cy - ry, out: [kx, 0], in: [-kx, 0] },
        { x: cx - rx, y: cy, out: [0, ky], in: [0, -ky] },
        { x: cx, y: cy + ry, out: [-kx, 0], in: [kx, 0] }
      ].map(a => ({ x: a.x, y: a.y, in: a.in, out: a.out, smooth: true }));
      closed = true;
    } else if (sh.type === 'line') {
      anchors = [
        { x: sh.x1, y: sh.y1, in: null, out: null, smooth: false },
        { x: sh.x2, y: sh.y2, in: null, out: null, smooth: false }
      ];
      closed = false;
    } else if (sh.type === 'polygon') {
      anchors = sh.pts.map(p => ({ x: p.x, y: p.y, in: null, out: null, smooth: false }));
      closed = true;
    } else {
      return null;
    }
    const st = {};
    for (const k of ['fill', 'stroke', 'strokeWidth', 'dash', 'opacity', 'visible', 'locked', 'angle', 'name']) st[k] = sh[k];
    return create('path', { id: App.U.uid(), name: st.name, style: st, geo: { anchors, closed } });
  }

  // Build a path shape from an array of {x,y} points (open polyline).
  function pathFromPoints(pts, style, name, closed) {
    const anchors = pts.map(p => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), in: null, out: null, smooth: false }));
    return create('path', { name: name || 'Path', style, geo: { anchors, closed: !!closed } });
  }

  // Ramer–Douglas–Peucker simplification.
  function simplifyRDP(pts, eps) {
    if (pts.length < 3) return pts.slice();
    const keep = new Array(pts.length).fill(false);
    keep[0] = keep[pts.length - 1] = true;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      if (b <= a + 1) continue;
      const p1 = pts[a], p2 = pts[b];
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1e-9;
      let maxD = -1, idx = -1;
      for (let i = a + 1; i < b; i++) {
        const d = Math.abs((pts[i].x - p1.x) * dy - (pts[i].y - p1.y) * dx) / len;
        if (d > maxD) { maxD = d; idx = i; }
      }
      if (maxD > eps && idx > 0) {
        keep[idx] = true;
        stack.push([a, idx], [idx, b]);
      }
    }
    return pts.filter((_, i) => keep[i]);
  }

  function clone(sh) { return JSON.parse(JSON.stringify(sh)); }

  function restore(sh, snap) {
    for (const k of Object.keys(sh)) if (!(k in snap)) delete sh[k];
    Object.assign(sh, snap);
  }

  return {
    LABELS, label, create, regularPolygon,
    localBBox, worldBBox, centerOf, cornersWorld,
    dFrom, ptsAttr, parseD, pathBBox,
    translate, scaleLocal, scaleGeom,
    toPath, pathFromPoints, simplifyRDP, clone, restore
  };
})();
