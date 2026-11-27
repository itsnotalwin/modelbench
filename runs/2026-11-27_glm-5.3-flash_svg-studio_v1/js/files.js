/* ============================================================
   Vectra Studio — documents: new, open, import, export
   ============================================================ */
'use strict';
(() => {
  const state = App.state;
  const docApi = App.docApi;
  const hist = App.hist;
  const S = App.S;
  const U = App.U;
  const clamp = U.clamp;
  const fmt = U.fmt;

  /* ================= load / new ================= */
  function loadDoc(doc, toastMsg) {
    state.doc = doc;
    state.sel = [];
    state.editing = null;
    docApi.docChanged();
    hist.push(toastMsg || 'Document');
    App.R.fitPage();
    if (toastMsg && App.UI) App.UI.toast(toastMsg, 'ok');
  }

  function newDoc(kind) {
    const doc = kind === 'sample'
      ? App.SAMPLE.doc()
      : { title: 'Untitled artwork', w: 1080, h: 720, bg: '#ffffff', shapes: [] };
    loadDoc(doc, kind === 'sample' ? 'Sample artwork loaded' : 'New blank document');
  }

  function openDialog() {
    const inp = document.getElementById('fileInput');
    inp.value = '';
    inp.click();
  }

  async function importFile(file) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      App.UI.toast('That file is too large (limit 8 MB)', 'error');
      return;
    }
    try {
      const text = await file.text();
      const res = importSvgText(text, file.name);
      loadDoc(res.doc, 'Imported ' + res.count + ' shape' + (res.count === 1 ? '' : 's') +
        (res.skipped ? ' — ' + res.skipped + ' unsupported element' + (res.skipped === 1 ? '' : 's') + ' skipped' : ''));
    } catch (err) {
      App.UI.toast('Could not open this file as SVG: ' + (err && err.message ? err.message : 'unknown error'), 'error');
    }
  }

  /* ================= export SVG ================= */
  function shapeAttrs(sh) {
    const a = [];
    if (sh.type !== 'line' && sh.type !== 'group') a.push('fill="' + (sh.fill || 'none') + '"');
    if (sh.stroke && sh.stroke !== 'none') {
      a.push('stroke="' + sh.stroke + '"');
      a.push('stroke-width="' + fmt(sh.strokeWidth) + '"');
      a.push('stroke-linecap="round"');
      a.push('stroke-linejoin="round"');
    }
    if (sh.dash) a.push('stroke-dasharray="' + U.escXml(sh.dash) + '"');
    if (sh.opacity < 1) a.push('opacity="' + (+sh.opacity.toFixed(3)) + '"');
    return a;
  }

  function geomAttrs(sh) {
    switch (sh.type) {
      case 'rect': {
        const a = [
          'x="' + fmt(sh.x) + '"', 'y="' + fmt(sh.y) + '"',
          'width="' + fmt(Math.max(0, sh.w)) + '"', 'height="' + fmt(Math.max(0, sh.h)) + '"'
        ];
        const r = clamp(sh.radius || 0, 0, Math.min(sh.w, sh.h) / 2);
        if (r > 0) a.push('rx="' + fmt(r) + '"');
        return a;
      }
      case 'ellipse':
        return ['cx="' + fmt(sh.cx) + '"', 'cy="' + fmt(sh.cy) + '"',
          'rx="' + fmt(Math.max(0, sh.rx)) + '"', 'ry="' + fmt(Math.max(0, sh.ry)) + '"'];
      case 'line':
        return ['x1="' + fmt(sh.x1) + '"', 'y1="' + fmt(sh.y1) + '"',
          'x2="' + fmt(sh.x2) + '"', 'y2="' + fmt(sh.y2) + '"'];
      case 'polygon':
        return ['points="' + S.ptsAttr(sh) + '"'];
      case 'path':
        return ['d="' + S.dFrom(sh) + '"'];
    }
    return [];
  }

  function serializeShape(sh, ind) {
    if (sh.visible === false) return '';
    const title = ind + '  <title>' + U.escXml(sh.name || S.label(sh.type)) + '</title>';
    if (sh.type === 'group') {
      const kids = sh.children.map(c => serializeShape(c, ind + '  ')).filter(Boolean);
      return ind + '<g>\n' + title + '\n' + kids.join('\n') + '\n' + ind + '</g>';
    }
    const a = shapeAttrs(sh).concat(geomAttrs(sh));
    if (sh.angle && sh.type !== 'group') {
      const c = S.centerOf(sh);
      a.push('transform="rotate(' + fmt(sh.angle) + ' ' + fmt(c.x) + ' ' + fmt(c.y) + ')"');
    }
    const tag = sh.type === 'ellipse' ? 'ellipse' : sh.type;
    return ind + '<' + tag + ' ' + a.join(' ') + '>\n' + title + '\n' + ind + '</' + tag + '>';
  }

  function serializeDoc(doc) {
    const out = [];
    out.push('<?xml version="1.0" encoding="UTF-8"?>');
    out.push('<!-- Created with Vectra Studio -->');
    out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + fmt(doc.w) + '" height="' + fmt(doc.h) +
      '" viewBox="0 0 ' + fmt(doc.w) + ' ' + fmt(doc.h) + '">');
    out.push('  <title>' + U.escXml(doc.title || 'Drawing') + '</title>');
    out.push('  <rect x="0" y="0" width="' + fmt(doc.w) + '" height="' + fmt(doc.h) + '" fill="' + (doc.bg || '#ffffff') + '"/>');
    for (const sh of doc.shapes) {
      const s = serializeShape(sh, '  ');
      if (s) out.push(s);
    }
    out.push('</svg>');
    return out.join('\n');
  }

  function exportSvg() {
    try {
      const svg = serializeDoc(state.doc);
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      U.download(U.sanitizeFile(state.doc.title) + '.svg', blob);
      App.UI.toast('SVG exported — the file stays editable in other vector apps', 'ok');
    } catch (err) {
      App.UI.toast('SVG export failed: ' + err.message, 'error');
    }
  }

  function exportPng() {
    try {
      const d = state.doc;
      const svg = serializeDoc(d);
      const scale = clamp(4096 / Math.max(d.w, d.h, 1), 0.25, 2);
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(d.w * scale));
          c.height = Math.max(1, Math.round(d.h * scale));
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(b => {
            URL.revokeObjectURL(url);
            if (b) {
              U.download(U.sanitizeFile(d.title) + '.png', b);
              App.UI.toast('PNG exported at ' + c.width + ' × ' + c.height, 'ok');
            } else {
              App.UI.toast('PNG export failed in this browser', 'error');
            }
          }, 'image/png');
        } catch (err) {
          URL.revokeObjectURL(url);
          App.UI.toast('PNG export failed: ' + err.message, 'error');
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); App.UI.toast('PNG export failed', 'error'); };
      img.src = url;
    } catch (err) {
      App.UI.toast('PNG export failed: ' + err.message, 'error');
    }
  }

  /* ================= SVG import ================= */
  function parseTransform(str) {
    let M = [1, 0, 0, 1, 0, 0];
    if (!str) return M;
    const re = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
    let m;
    while ((m = re.exec(str))) {
      const fn = m[1].toLowerCase();
      const nums = m[2].trim().split(/[\s,]+/).map(Number).filter(v => isFinite(v));
      let T = [1, 0, 0, 1, 0, 0];
      if (fn === 'translate' && nums.length >= 1) T = [1, 0, 0, 1, nums[0], nums[1] || 0];
      else if (fn === 'scale' && nums.length >= 1) T = [nums[0], 0, 0, nums[1] || nums[0], 0, 0];
      else if (fn === 'rotate' && nums.length >= 1) {
        const a = nums[0] * U.D2R, c = Math.cos(a), s = Math.sin(a);
        if (nums.length >= 3) {
          const cx = nums[1], cy = nums[2];
          T = [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
        } else T = [c, s, -s, c, 0, 0];
      }
      else if (fn === 'matrix' && nums.length >= 6) T = nums.slice(0, 6);
      else if (fn === 'skewx' && nums.length >= 1) T = [1, 0, Math.tan(nums[0] * U.D2R), 1, 0, 0];
      else if (fn === 'skewy' && nums.length >= 1) T = [1, Math.tan(nums[0] * U.D2R), 0, 1, 0, 0];
      M = matMul(M, T);
    }
    return M;
  }

  function matMul(A, B) {
    return [
      A[0] * B[0] + A[2] * B[1],
      A[1] * B[0] + A[3] * B[1],
      A[0] * B[2] + A[2] * B[3],
      A[1] * B[2] + A[3] * B[3],
      A[0] * B[4] + A[2] * B[5] + A[4],
      A[1] * B[4] + A[3] * B[5] + A[5]
    ];
  }

  const applyM = (M, p) => [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]];
  const linScale = M => (Math.hypot(M[0], M[1]) + Math.hypot(M[2], M[3])) / 2;
  const colsOrtho = M => Math.abs(M[0] * M[2] + M[1] * M[3]) < 0.01 * (Math.hypot(M[0], M[1]) * Math.hypot(M[2], M[3]) || 1);

  const PAINT_ATTRS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'fill-opacity', 'stroke-opacity', 'opacity'];

  function getStyleMap(el) {
    const map = {};
    for (const k of PAINT_ATTRS) {
      const v = el.getAttribute(k);
      if (v != null) map[k] = v.trim();
    }
    const st = el.getAttribute('style');
    if (st) {
      for (const decl of st.split(';')) {
        const i = decl.indexOf(':');
        if (i === -1) continue;
        const k = decl.slice(0, i).trim().toLowerCase();
        const v = decl.slice(i + 1).trim();
        if (PAINT_ATTRS.indexOf(k) !== -1 && v) map[k] = v;
      }
    }
    return map;
  }

  function resolvePaint(v, isFill) {
    if (v == null || v === '') return isFill ? '#000000' : 'none';
    v = v.trim().toLowerCase();
    if (v === 'none' || v === 'transparent') return 'none';
    if (v.startsWith('url(')) return 'skip';
    if (v === 'currentColor' || v === 'inherit') return '#000000';
    const h = U.hex6(v);
    return h || (isFill ? '#000000' : 'none');
  }

  function numAttr(el, name, def) {
    const v = parseFloat(el.getAttribute(name));
    return isFinite(v) ? v : def;
  }

  // Try to recover a rect (possibly rotated) from 4 transformed corners.
  function rectFromQuad(c) {
    const cx = (c[0][0] + c[2][0]) / 2, cy = (c[0][1] + c[2][1]) / 2;
    const ang = Math.atan2(c[1][1] - c[0][1], c[1][0] - c[0][0]) * U.R2D;
    const rp = c.map(p => App.G.rotP(p[0], p[1], -ang, cx, cy));
    const bb = App.G.ptsBB(rp);
    // verify it is a rectangle: rotated corners must match the bbox
    const ok = rp.every(p =>
      (Math.abs(p[0] - bb.x) < 0.6 || Math.abs(p[0] - (bb.x + bb.w)) < 0.6) &&
      (Math.abs(p[1] - bb.y) < 0.6 || Math.abs(p[1] - (bb.y + bb.h)) < 0.6));
    if (!ok || bb.w < 0.01 || bb.h < 0.01) return null;
    let a = ang % 360;
    if (a > 180) a -= 360; if (a < -180) a += 360;
    return { x: bb.x, y: bb.y, w: bb.w, h: bb.h, angle: Math.abs(a) < 0.05 ? 0 : a };
  }

  function importSvgText(text, fileName) {
    const dom = new DOMParser().parseFromString(text, 'image/svg+xml');
    if (dom.querySelector('parsererror')) throw new Error('not a valid SVG document');
    const root = dom.documentElement;
    if (!root || root.nodeName.toLowerCase() !== 'svg') throw new Error('the root element is not <svg>');

    let w = numAttr(root, 'width', 0), h = numAttr(root, 'height', 0);
    if (String(root.getAttribute('width') || '').indexOf('%') !== -1) w = 0;
    if (String(root.getAttribute('height') || '').indexOf('%') !== -1) h = 0;
    const vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb.every(isFinite)) { w = vb[2]; h = vb[3]; }
    w = Math.round(clamp(w, 16, 8000)) || 1000;
    h = Math.round(clamp(h, 16, 8000)) || 700;

    const shapes = [];
    let skipped = 0;

    function styleFor(fill, stroke, sw, dash, opacity) {
      return {
        fill: fill || 'none', stroke: stroke || 'none',
        strokeWidth: +sw.toFixed(2), dash: dash || '', opacity: clamp(opacity, 0, 1)
      };
    }

    function handleEl(el, M, gOp) {
      if (shapes.length >= 2500) { skipped++; return; }
      const tag = el.nodeName.toLowerCase();
      if (tag === 'g') {
        const M2 = matMul(M, parseTransform(el.getAttribute('transform')));
        const op = gOp * (numAttr(el, 'opacity', 1));
        for (const child of Array.from(el.children)) handleEl(child, M2, clamp(op, 0, 1));
        return;
      }
      if (tag === 'svg' || tag === 'a' || tag === 'switch') {
        for (const child of Array.from(el.children)) handleEl(child, M, gOp);
        return;
      }
      if (['style', 'defs', 'clippath', 'mask', 'symbol', 'metadata', 'title', 'desc',
        'lineargradient', 'radialgradient', 'pattern', 'filter', 'marker',
        'foreignobject'].indexOf(tag) !== -1) return;
      if (['use', 'image', 'text', 'textpath', 'tspan', 'animation', 'animate',
        'animatetransform', 'animatemotion', 'set'].indexOf(tag) !== -1) { skipped++; return; }

      const sm = getStyleMap(el);
      const fill = resolvePaint(sm.fill, true);
      const stroke = resolvePaint(sm.stroke, false);
      if (fill === 'skip' || stroke === 'skip') { skipped++; return; }
      const fo = isFinite(parseFloat(sm['fill-opacity'])) ? parseFloat(sm['fill-opacity']) : 1;
      const so = isFinite(parseFloat(sm['stroke-opacity'])) ? parseFloat(sm['stroke-opacity']) : 1;
      const opacity = clamp(numAttr(el, 'opacity', 1) * fo * so * gOp, 0, 1);
      const sw = Math.max(0, isFinite(parseFloat(sm['stroke-width'])) ? parseFloat(sm['stroke-width']) : 1);
      const dash = (sm['stroke-dasharray'] && sm['stroke-dasharray'] !== 'none')
        ? String(sm['stroke-dasharray']).trim().slice(0, 40) : '';
      const M2 = matMul(M, parseTransform(el.getAttribute('transform')));
      const scale = linScale(M2) || 1;
      const name = (el.getAttribute('data-name') || el.getAttribute('id') || '').trim().slice(0, 40) || null;
      const stl = styleFor(fill, stroke, sw * scale, dash, opacity);

      switch (tag) {
        case 'rect': {
          const rw = numAttr(el, 'width', 0), rh = numAttr(el, 'height', 0);
          if (rw <= 0 || rh <= 0) { skipped++; return; }
          const x = numAttr(el, 'x', 0), y = numAttr(el, 'y', 0);
          let rx = numAttr(el, 'rx', NaN), ry = numAttr(el, 'ry', NaN);
          if (!isFinite(rx) && !isFinite(ry)) { rx = 0; ry = 0; }
          else if (!isFinite(rx)) rx = ry;
          else if (!isFinite(ry)) ry = rx;
          rx = clamp(rx || 0, 0, Math.min(rw, rh) / 2);
          const corners = [[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh]].map(p => applyM(M2, p));
          const built = rectFromQuad(corners);
          if (built) {
            shapes.push(S.create('rect', {
              name, style: stl,
              geo: { x: built.x, y: built.y, w: built.w, h: built.h, radius: rx * scale, angle: built.angle }
            }));
          } else {
            // skewed rect — keep as a closed path
            const anchors = corners.map(p => ({ x: +p[0].toFixed(2), y: +p[1].toFixed(2), in: null, out: null, smooth: false }));
            shapes.push(S.create('path', { name, style: stl, geo: { anchors, closed: true } }));
          }
          return;
        }
        case 'circle': case 'ellipse': {
          const cx = numAttr(el, 'cx', 0), cy = numAttr(el, 'cy', 0);
          let rx = tag === 'circle' ? numAttr(el, 'r', 0) : numAttr(el, 'rx', 0);
          let ry = tag === 'circle' ? rx : numAttr(el, 'ry', 0);
          if (rx <= 0 || ry <= 0) { skipped++; return; }
          const c2 = applyM(M2, [cx, cy]);
          if (colsOrtho(M2)) {
            shapes.push(S.create('ellipse', {
              name, style: stl,
              geo: {
                cx: +c2[0].toFixed(2), cy: +c2[1].toFixed(2),
                rx: Math.max(0.01, rx * Math.hypot(M2[0], M2[1])),
                ry: Math.max(0.01, ry * Math.hypot(M2[2], M2[3])),
                angle: Math.abs(Math.atan2(M2[1], M2[0]) * U.R2D) < 0.05 ? 0 : +(Math.atan2(M2[1], M2[0]) * U.R2D).toFixed(2)
              }
            }));
          } else {
            // skewed ellipse — approximate with its bounding box
            const pts = [[cx - rx, cy - ry], [cx + rx, cy - ry], [cx + rx, cy + ry], [cx - rx, cy + ry]].map(p => applyM(M2, p));
            const bb = App.G.ptsBB(pts);
            shapes.push(S.create('ellipse', {
              name, style: stl,
              geo: { cx: bb.x + bb.w / 2, cy: bb.y + bb.h / 2, rx: bb.w / 2, ry: bb.h / 2, angle: 0 }
            }));
          }
          return;
        }
        case 'line': {
          const p1 = applyM(M2, [numAttr(el, 'x1', 0), numAttr(el, 'y1', 0)]);
          const p2 = applyM(M2, [numAttr(el, 'x2', 0), numAttr(el, 'y2', 0)]);
          shapes.push(S.create('line', {
            name, style: styleFor('none', stroke, sw * scale, dash, opacity),
            geo: { x1: +p1[0].toFixed(2), y1: +p1[1].toFixed(2), x2: +p2[0].toFixed(2), y2: +p2[1].toFixed(2) }
          }));
          return;
        }
        case 'polyline': case 'polygon': {
          const nums = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
          if (nums.length < 4 || !nums.every(isFinite)) { skipped++; return; }
          const pts = [];
          for (let i = 0; i + 1 < nums.length; i += 2) pts.push(applyM(M2, [nums[i], nums[i + 1]]));
          if (tag === 'polygon') {
            shapes.push(S.create('polygon', {
              name, style: stl, sides: pts.length,
              geo: { pts: pts.map(p => ({ x: +p[0].toFixed(2), y: +p[1].toFixed(2) })) }
            }));
          } else {
            const anchors = pts.map(p => ({ x: +p[0].toFixed(2), y: +p[1].toFixed(2), in: null, out: null, smooth: false }));
            shapes.push(S.create('path', { name, style: styleFor(fill, stroke, sw * scale, dash, opacity), geo: { anchors, closed: false } }));
          }
          return;
        }
        case 'path': {
          const d = el.getAttribute('d');
          if (!d) { skipped++; return; }
          const subs = S.parseD(d);
          if (!subs.length) { skipped++; return; }
          for (const sub of subs) {
            const anchors = sub.anchors.map(a0 => {
              const p = applyM(M2, [a0.x, a0.y]);
              const na = { x: +p[0].toFixed(2), y: +p[1].toFixed(2), in: null, out: null, smooth: !!a0.smooth };
              if (a0.in) {
                const c = applyM(M2, [a0.x + a0.in[0], a0.y + a0.in[1]]);
                na.in = [+(c[0] - p[0]).toFixed(2), +(c[1] - p[1]).toFixed(2)];
              }
              if (a0.out) {
                const c = applyM(M2, [a0.x + a0.out[0], a0.y + a0.out[1]]);
                na.out = [+(c[0] - p[0]).toFixed(2), +(c[1] - p[1]).toFixed(2)];
              }
              return na;
            });
            shapes.push(S.create('path', {
              name, style: stl,
              geo: { anchors, closed: !!sub.closed }
            }));
            if (shapes.length >= 2500) break;
          }
          return;
        }
        default:
          skipped++;
      }
    }

    for (const child of Array.from(root.children)) handleEl(child, [1, 0, 0, 1, 0, 0], 1);

    if (!shapes.length) {
      throw new Error(skipped
        ? 'no supported vector shapes were found (' + skipped + ' unsupported elements)'
        : 'the file has no drawable content');
    }

    // A full-canvas solid rect becomes the artboard background
    let bg = '#ffffff';
    if (shapes.length && shapes[0].type === 'rect') {
      const r = shapes[0];
      if (r.fill !== 'none' && r.x <= 0.5 && r.y <= 0.5 && r.w >= w - 1 && r.h >= h - 1 && !r.angle) {
        bg = r.fill;
        shapes.shift();
      }
    }

    const doc = {
      title: (fileName || 'Imported artwork').replace(/\.svg$/i, '').slice(0, 60) || 'Imported artwork',
      w, h, bg, shapes
    };
    return { doc, count: shapes.length, skipped };
  }

  /* ================= init ================= */
  function init() {
    const inp = document.getElementById('fileInput');
    inp.addEventListener('change', () => {
      if (inp.files && inp.files[0]) importFile(inp.files[0]);
    });
    // drag & drop onto the canvas
    const wrap = document.getElementById('stageWrap');
    const hint = document.getElementById('dropHint');
    let dragDepth = 0;
    window.addEventListener('dragenter', e => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') !== -1) {
        dragDepth++;
        hint.hidden = false;
      }
    });
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('dragleave', () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) hint.hidden = true;
    });
    window.addEventListener('drop', e => {
      e.preventDefault();
      dragDepth = 0;
      hint.hidden = true;
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        importFile(e.dataTransfer.files[0]);
      }
    });
  }

  App.F = { newDoc, openDialog, importFile, exportSvg, exportPng, serializeDoc, importSvgText, init };
})();
