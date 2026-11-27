/* Fiscus — dependency-free SVG charts: a category donut and a grouped
   monthly bar chart. Charts are decorative enhancements; every chart is
   paired with a screen-reader text summary rendered by the calling view. */
window.F = window.F || {};

F.charts = (function () {
  'use strict';

  const U = F.util;

  /* Donut via stroke-dasharray circles. Returns null when there is no data.
     Caller wraps the result in .donut-wrap and can overlay .donut-center text. */
  function donut(opts) {
    const data = (opts.data || []).filter(d => d.value > 0);
    const total = data.reduce((a, d) => a + d.value, 0);
    if (!total) return null;

    const size = opts.size || 190;
    const thickness = opts.thickness || 24;
    const r = (size - thickness) / 2;
    const c = size / 2;
    const circ = 2 * Math.PI * r;
    let offset = 0;

    const segs = data.map(d => {
      const len = (d.value / total) * circ;
      const drawn = Math.max(len - 1.5, 0.5); // small gap between segments
      const seg = '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + d.color +
        '" stroke-width="' + thickness + '" stroke-dasharray="' + drawn + ' ' + (circ - drawn) +
        '" stroke-dashoffset="' + (-offset) + '"><title>' + U.esc(d.label) + '</title></circle>';
      offset += len;
      return seg;
    });

    const svg = '<svg class="donut" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size +
      '" role="img" aria-label="' + U.esc(opts.ariaLabel || 'Category breakdown') +
      '" style="transform: rotate(-90deg)">' + segs.join('') + '</svg>';
    return { svg: svg, total: total };
  }

  /* Grouped bars: one income + one expense bar per month.
     groups: [{label, income, expense}] in minor units. */
  function bars(opts) {
    const groups = opts.groups || [];
    const fmt = opts.formatValue || (v => String(Math.round(v)));
    const W = 640, H = 260;
    const padL = 58, padR = 10, padT = 14, padB = 34;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const maxVal = Math.max(1, ...groups.map(g => Math.max(g.income, g.expense)));
    const nice = niceCeil(maxVal);
    const ticks = 4;

    let s = '';
    for (let i = 0; i <= ticks; i++) {
      const y = padT + plotH - (plotH * i) / ticks;
      s += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" class="grid-line"/>';
      s += '<text x="' + (padL - 8) + '" y="' + (y + 4) + '" class="axis-text" text-anchor="end">' + U.esc(fmt((nice * i) / ticks)) + '</text>';
    }

    const n = groups.length || 1;
    const gw = plotW / n;
    const barW = Math.min(18, gw * 0.28);
    const gap = 6;

    groups.forEach((g, i) => {
      const cx = padL + gw * i + gw / 2;
      const hIn = (g.income / nice) * plotH;
      const hEx = (g.expense / nice) * plotH;
      const xIn = cx - barW - gap / 2;
      const xEx = cx + gap / 2;
      s += '<rect x="' + xIn.toFixed(1) + '" y="' + (padT + plotH - hIn).toFixed(1) + '" width="' + barW + '" height="' + Math.max(hIn, 0).toFixed(1) +
        '" rx="3" class="bar bar-income"><title>' + U.esc(g.label + ' — income: ' + fmt(g.income)) + '</title></rect>';
      s += '<rect x="' + xEx.toFixed(1) + '" y="' + (padT + plotH - hEx).toFixed(1) + '" width="' + barW + '" height="' + Math.max(hEx, 0).toFixed(1) +
        '" rx="3" class="bar bar-expense"><title>' + U.esc(g.label + ' — expenses: ' + fmt(g.expense)) + '</title></rect>';
      s += '<text x="' + cx.toFixed(1) + '" y="' + (H - 10) + '" class="axis-text" text-anchor="middle">' + U.esc(g.label) + '</text>';
    });

    return '<svg class="bar-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' +
      U.esc(opts.ariaLabel || 'Monthly comparison') + '">' + s + '</svg>';
  }

  // Round up to a readable axis maximum: 1 / 2 / 2.5 / 5 × 10^k.
  function niceCeil(v) {
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const candidates = [1, 2, 2.5, 5, 10].map(m => m * pow);
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i] >= v) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  return { donut: donut, bars: bars };
})();
