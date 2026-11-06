(function () {
  'use strict';

  /* ========================================================================
     1. SENSITOMETRIC CONSTANTS & EXHIBITION DATA
     ======================================================================== */

  var ZONES = [
    {
      index: 0,
      roman: '0',
      title: 'Maximum Silver Black / Film Base',
      reflectance: '0.0%',
      density: '3.20 logD',
      ev: '-5.0 EV',
      hex: '#000000',
      val: 0,
      surface: 'Unlit cavern interior, pitch-black velvet, silver-halide D-max shadow without discernible detail.'
    },
    {
      index: 1,
      roman: 'I',
      title: 'Near-Black Shadow Threshold',
      reflectance: '0.4%',
      density: '2.40 logD',
      ev: '-4.0 EV',
      hex: '#1A1A1A',
      val: 26,
      surface: 'Deep basalt fissure, moonless sky away from horizon; first measurable tonality above paper black.'
    },
    {
      index: 2,
      roman: 'II',
      title: 'First Suggestion of Shadow Texture',
      reflectance: '1.2%',
      density: '1.92 logD',
      ev: '-3.0 EV',
      hex: '#333333',
      val: 51,
      surface: 'Wet slate roof tiles, deep evergreen canopy in shadow; earliest threshold where surface grain emerges.'
    },
    {
      index: 3,
      roman: 'III',
      title: 'Average Dark Materials with Full Texture',
      reflectance: '3.6%',
      density: '1.44 logD',
      ev: '-2.0 EV',
      hex: '#4D4D4D',
      val: 77,
      surface: 'Weathered dark oak bark, charcoal wool overcoat, shadowed granite cliff face.'
    },
    {
      index: 4,
      roman: 'IV',
      title: 'Open Shadow & Dark Foliage',
      reflectance: '9.0%',
      density: '1.05 logD',
      ev: '-1.0 EV',
      hex: '#666666',
      val: 102,
      surface: 'Open architectural shadow, dark pine needles under overcast sky, damp coastal asphalt.'
    },
    {
      index: 5,
      roman: 'V',
      title: '18% Middle Grey Reference Anchor',
      reflectance: '18.0%',
      density: '0.74 logD',
      ev: '0.0 EV',
      hex: '#808080',
      val: 128,
      surface: 'Calibrated 18% Neutral Test Card, clear north sky, dry weathered cedar siding.'
    },
    {
      index: 6,
      roman: 'VI',
      title: 'Average Lit Stone & Pale Timber',
      reflectance: '36.0%',
      density: '0.44 logD',
      ev: '+1.0 EV',
      hex: '#999999',
      val: 153,
      surface: 'Sunlit limestone facade, pale birch bark, diffuse open shadow on fresh snow.'
    },
    {
      index: 7,
      roman: 'VII',
      title: 'Very Light Surfaces with Crisp Texture',
      reflectance: '58.0%',
      density: '0.24 logD',
      ev: '+2.0 EV',
      hex: '#B3B3B3',
      val: 179,
      surface: 'Sunlit travertine marble, bright cumulus cloud body, chalk-washed lime plaster.'
    },
    {
      index: 8,
      roman: 'VIII',
      title: 'Delicate Highlight Texture',
      reflectance: '78.0%',
      density: '0.11 logD',
      ev: '+3.0 EV',
      hex: '#CCCCCC',
      val: 204,
      surface: 'Fresh alpine snow in raking side-light, unbleached white linen weave with fine detail.'
    },
    {
      index: 9,
      roman: 'IX',
      title: 'Glaring White Without Detail',
      reflectance: '92.0%',
      density: '0.04 logD',
      ev: '+4.0 EV',
      hex: '#E6E6E6',
      val: 230,
      surface: 'Glaring snowfield at solar noon, frosted glass backlit by sky; approaches baryta paper white.'
    },
    {
      index: 10,
      roman: 'X',
      title: 'Specular Glare & Paper Base White',
      reflectance: '100.0%',
      density: '0.00 logD',
      ev: '+5.0 EV',
      hex: '#FFFFFF',
      val: 255,
      surface: 'Direct solar specular glint on water or chrome; unexposed baryta gelatin paper base.'
    }
  ];

  var PLATES = [
    {
      id: 'vercors',
      num: 'PLATE 01',
      title: 'Solstice at Vercors',
      key: 'full-scale',
      keyLabel: 'Full-Scale',
      process: 'Silver Gelatin',
      format: '8×10 Sheet Film',
      developer: 'Rodinal 1:50 · 14 min',
      lens: '300mm f/5.6 @ f/32',
      zones: 'Zones I – IX',
      desc: 'Ridged alpine limestone massif in raking winter sun, with valley radiation fog and high-acutance silver edge effects.',
      defaultGrade: 2.5,
      defaultEv: 0.0
    },
    {
      id: 'cantilever',
      num: 'PLATE 02',
      title: 'Cantilever Study IV',
      key: 'high-key',
      keyLabel: 'High-Key',
      process: 'Architectural Silver',
      format: '4×5 Monorail',
      developer: 'D-76 1:1 · 9.5 min',
      lens: '90mm Super-Angulon @ f/22',
      zones: 'Zones IV – X',
      desc: 'Board-formed brutalist concrete geometry bisected by an oblique zenithal sunbeam and luminous sky aperture.',
      defaultGrade: 3.0,
      defaultEv: 0.2
    },
    {
      id: 'rayograph',
      num: 'PLATE 03',
      title: 'Rayograph: Allium & Glass',
      key: 'low-key',
      keyLabel: 'Low-Key',
      process: 'Camera-Less Photogram',
      format: '11×14 Fiber Paper',
      developer: 'Dektol 1:2 · 2.5 min',
      lens: 'Collimated Point Source',
      zones: 'Zones 0 – VIII',
      desc: 'Direct contact photogram of refractive optical spheres, botanical umbel filaments, and caustic shadow envelopes.',
      defaultGrade: 3.5,
      defaultEv: -0.1
    },
    {
      id: 'tidal',
      num: 'PLATE 04',
      title: 'Tidal Standing Wave',
      key: 'full-scale',
      keyLabel: 'Full-Scale',
      process: 'ND 3.0 Long Exposure',
      format: '6×7 Medium Format',
      developer: 'Pyrocat-HD 1:1:100',
      lens: '110mm Planar · 240s @ f/16',
      zones: 'Zones I – IX',
      desc: 'Four-minute exposure averaging Atlantic swell into concentric standing interference ripples beneath basalt sea stacks.',
      defaultGrade: 2.0,
      defaultEv: 0.05
    },
    {
      id: 'moire',
      num: 'PLATE 05',
      title: 'Moiré Interferogram 19°',
      key: 'high-key',
      keyLabel: 'High-Key',
      process: 'Optical Grating',
      format: '5×7 Glass Plate',
      developer: 'Microdol-X · 11 min',
      lens: 'Collimated Optical Bench',
      zones: 'Zones III – X',
      desc: 'Two curved diffraction rulings rotated by 19.2 degrees under spherical aberration, generating macro interference contours.',
      defaultGrade: 3.5,
      defaultEv: 0.1
    },
    {
      id: 'basalt',
      num: 'PLATE 06',
      title: 'Basalt Columnar Fracture',
      key: 'low-key',
      keyLabel: 'Low-Key',
      process: 'Geological Macro',
      format: '8×10 Bellows 1:1',
      developer: 'XTOL 1:1 · 8 min',
      lens: '210mm Macro-Symmar @ f/45',
      zones: 'Zones 0 – VII',
      desc: 'Hexagonal volcanic cooling joints rendered via cellular Voronoi distance fields under grazing lateral illumination.',
      defaultGrade: 3.0,
      defaultEv: -0.2
    },
    {
      id: 'pendulum',
      num: 'PLATE 07',
      title: 'Chronophotograph: Pendulum',
      key: 'low-key',
      keyLabel: 'Low-Key',
      process: 'Stroboscopic Plate',
      format: '4×5 Scientific Plate',
      developer: 'HC-110 Dil. B · 6 min',
      lens: '150mm Apo-Sironar · 18 Flashes',
      zones: 'Zones 0 – IX',
      desc: 'Multi-flash stroboscopic trace of a damped harmonic pendulum arc with calibrated optical reticle graduations.',
      defaultGrade: 4.0,
      defaultEv: -0.05
    },
    {
      id: 'nucleation',
      num: 'PLATE 08',
      title: 'Silver Crystal Nucleation',
      key: 'full-scale',
      keyLabel: 'Full-Scale',
      process: 'Micro-Sensitometry 400×',
      format: '35mm Technical Pan',
      developer: 'Technidol LC · 15 min',
      lens: '40× Plan-Apochromat',
      zones: 'Zones I – X',
      desc: 'Dendritic metallic silver filaments nucleating around latent-image sensitivity specks inside gelatin emulsion.',
      defaultGrade: 2.5,
      defaultEv: 0.0
    }
  ];

  var CHRONOLOGY = [
    {
      year: '1839',
      title: 'Daguerreotype & Silver-Halide Latent Image',
      category: 'photochemistry',
      categoryLabel: 'Photochemistry',
      body: 'Louis Daguerre and William Henry Fox Talbot establish light-sensitive silver halide reduction on polished copper and salted paper, inaugurating continuous-tone monochrome recording.'
    },
    {
      year: '1886',
      title: 'Ives Crossline Halftone Screen',
      category: 'halftone',
      categoryLabel: 'Halftone & Digital',
      body: 'Frederic Eugene Ives patents the ruled glass crossline halftone screen, translating continuous photographic grey into variable-diameter pure black ink dots for relief printing.'
    },
    {
      year: '1890',
      title: 'Hurter & Driffield Characteristic Curve (D–log E)',
      category: 'sensitometry',
      categoryLabel: 'Sensitometry',
      body: 'Ferdinand Hurter and Vero Charles Driffield publish the logarithmic relationship between exposure (log E) and optical silver density (D = log₁₀ 1/T), defining photographic gamma (γ).'
    },
    {
      year: '1921',
      title: 'Rayographs & Schadographs (Camera-Less Photograms)',
      category: 'photochemistry',
      categoryLabel: 'Photochemistry',
      body: 'Man Ray and Christian Schad bypass camera lenses altogether, placing translucent and opaque objects directly onto silver-gelatin paper to record pure shadow and refraction.'
    },
    {
      year: '1940',
      title: 'Ansel Adams & Fred Archer Formulate the Zone System',
      category: 'sensitometry',
      categoryLabel: 'Sensitometry',
      body: 'A standardized 11-step sensitometric scale (Zone 0 through Zone X, spaced by 1 f-stop / 0.30 logD increments) links scene luminance pre-visualization to negative development time.'
    },
    {
      year: '1976',
      title: 'Floyd–Steinberg 2D Error-Diffusion Dithering',
      category: 'halftone',
      categoryLabel: 'Halftone & Digital',
      body: 'Robert W. Floyd and Louis Steinberg introduce spatial quantization error diffusion (7/16, 3/16, 5/16, 1/16 kernel), enabling 1-bit bi-level displays to render smooth achromatic gradients.'
    },
    {
      year: '2012',
      title: 'Achromatic Full-Frame CMOS Sensors (No Bayer CFA)',
      category: 'halftone',
      categoryLabel: 'Halftone & Digital',
      body: 'Removing the RGB color filter array allows every photosite to integrate broadband luminance directly, eliminating demosaicing interpolation and recovering 100% spatial Nyquist acuity.'
    }
  ];

  var BAYER_8X8 = [
    [ 0, 32,  8, 40,  2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44,  4, 36, 14, 46,  6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [ 3, 35, 11, 43,  1, 33,  9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47,  7, 39, 13, 45,  5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21]
  ];

  /* ========================================================================
     2. DETERMINISTIC NOISE & PROCEDURAL SILVER-GELATIN ENGINE
     ======================================================================== */

  function hash2D(ix, iy) {
    var n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }

  function smoothNoise(x, y) {
    var ix = Math.floor(x);
    var iy = Math.floor(y);
    var fx = x - ix;
    var fy = y - iy;
    var ux = fx * fx * (3 - 2 * fx);
    var uy = fy * fy * (3 - 2 * fy);

    var a = hash2D(ix, iy);
    var b = hash2D(ix + 1, iy);
    var c = hash2D(ix, iy + 1);
    var d = hash2D(ix + 1, iy + 1);

    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  function fbm(x, y, octaves) {
    var val = 0;
    var amp = 0.5;
    var freq = 1;
    for (var i = 0; i < octaves; i++) {
      val += amp * smoothNoise(x * freq, y * freq);
      freq *= 2.02;
      amp *= 0.5;
    }
    return val;
  }

  function ridgedFbm(x, y, octaves) {
    var val = 0;
    var amp = 0.52;
    var freq = 1;
    var prev = 1.0;
    for (var i = 0; i < octaves; i++) {
      var n = 1.0 - Math.abs(smoothNoise(x * freq, y * freq) * 2.0 - 1.0);
      n = n * n;
      val += n * amp * prev;
      prev = n;
      freq *= 2.07;
      amp *= 0.5;
    }
    return val;
  }

  function worley(x, y) {
    var ix = Math.floor(x);
    var iy = Math.floor(y);
    var minDist1 = 999;
    var minDist2 = 999;

    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var cx = ix + dx;
        var cy = iy + dy;
        var px = cx + hash2D(cx, cy);
        var py = cy + hash2D(cx + 97, cy + 53);
        var ddx = px - x;
        var ddy = py - y;
        var d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < minDist1) {
          minDist2 = minDist1;
          minDist1 = d;
        } else if (d < minDist2) {
          minDist2 = d;
        }
      }
    }
    return { d1: minDist1, d2: minDist2, edge: minDist2 - minDist1 };
  }

  function clamp01(v) {
    return v < 0 ? 0 : (v > 1 ? 1 : v);
  }

  var plateBufferCache = {};

  function generatePlateBuffer(plateId, width, height) {
    var cacheKey = plateId + '_' + width + 'x' + height;
    if (plateBufferCache[cacheKey]) {
      return plateBufferCache[cacheKey];
    }

    var buf = new Float32Array(width * height);
    var invW = 1 / width;
    var invH = 1 / height;

    if (plateId === 'vercors') {
      // Plate 01: Solstice at Vercors — Ridged alpine massif in raking sun & valley mist
      for (var y = 0; y < height; y++) {
        var ny = y * invH;
        for (var x = 0; x < width; x++) {
          var nx = x * invW;
          var idx = y * width + x;

          // Sky gradient + cirrus wisps
          var sky = 0.84 - ny * 0.42 + (fbm(nx * 3.5 + 1.2, ny * 8.0, 4) - 0.5) * 0.22;

          // 3 Mountain ridges with analytical slope lighting
          var val = sky;
          var layers = [
            { base: 0.44, scale: 3.2, amp: 0.26, fog: 0.48, seed: 1.7 },
            { base: 0.57, scale: 4.5, amp: 0.24, fog: 0.25, seed: 5.3 },
            { base: 0.72, scale: 6.2, amp: 0.21, fog: 0.06, seed: 11.1 }
          ];

          for (var l = 0; l < layers.length; l++) {
            var lay = layers[l];
            var rx = nx * lay.scale + lay.seed;
            var h = lay.base - ridgedFbm(rx, lay.seed * 0.4, 5) * lay.amp;
            if (ny > h) {
              var hNext = lay.base - ridgedFbm(rx + 0.015, lay.seed * 0.4, 5) * lay.amp;
              var slope = (h - hNext) * 42.0;
              var rockTex = fbm(nx * 28.0 + lay.seed, ny * 28.0, 4);
              var lit = clamp01(0.32 + slope * 0.65 + (rockTex - 0.5) * 0.28);
              var depthFog = Math.exp(-(ny - h) * 7.5) * lay.fog;
              val = lit * (1 - lay.fog) + 0.78 * lay.fog + depthFog * 0.25;
            }
          }
          buf[idx] = clamp01(val);
        }
      }
    } else if (plateId === 'cantilever') {
      // Plate 02: Cantilever Study IV — Brutalist architectural concrete & sunbeam
      for (var y = 0; y < height; y++) {
        var ny = y * invH;
        for (var x = 0; x < width; x++) {
          var nx = x * invW;
          var idx = y * width + x;

          // Base luminous sky
          var v = 0.92 - ny * 0.14;
          var formwork = (fbm(nx * 4.0, ny * 65.0, 3) - 0.5) * 0.08 +
                         (fbm(nx * 24.0, ny * 24.0, 4) - 0.5) * 0.09;

          // Left vertical concrete tower
          if (nx < 0.34) {
            v = 0.48 - nx * 0.35 + formwork;
          }
          // Overhead cantilevered slab with underside shadow
          var slabBottom = 0.28 + nx * 0.16;
          if (ny < slabBottom && nx > 0.22) {
            v = 0.22 + (ny / slabBottom) * 0.14 + formwork * 0.8;
          }
          // Diagonal sunbeam shaft cutting across concrete
          var beam = nx * 0.85 - ny * 0.95;
          if (beam > -0.14 && beam < 0.12 && nx < 0.68) {
            var soft = 1.0 - Math.abs(beam + 0.01) / 0.13;
            v = clamp01(v + soft * 0.46);
          }
          // Lower architectural parapet
          if (ny > 0.76 - nx * 0.12) {
            v = 0.16 + formwork * 0.6;
          }
          buf[idx] = clamp01(v);
        }
      }
    } else if (plateId === 'rayograph') {
      // Plate 03: Rayograph: Allium & Glass — Camera-less photogram
      for (var y = 0; y < height; y++) {
        var ny = y * invH;
        for (var x = 0; x < width; x++) {
          var nx = x * invW;
          var idx = y * width + x;

          // Deep silver black ground with subtle paper fog
          var v = 0.05 + fbm(nx * 3.0, ny * 3.0, 3) * 0.05;

          // Diagonal collimated exposure slit
          var slitDist = Math.abs((nx - 0.5) * 0.75 + (ny - 0.5) * 0.65);
          v += Math.exp(-slitDist * slitDist * 38.0) * 0.32;

          // Refractive glass spheres with Fresnel rim & caustic crescent
          var spheres = [
            { cx: 0.38, cy: 0.48, r: 0.21 },
            { cx: 0.64, cy: 0.38, r: 0.14 },
            { cx: 0.56, cy: 0.67, r: 0.11 }
          ];
          for (var s = 0; s < spheres.length; s++) {
            var sp = spheres[s];
            var dx = (nx - sp.cx) * 1.25;
            var dy = ny - sp.cy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < sp.r) {
              var u = dist / sp.r;
              var fresnel = Math.pow(u, 3.2) * 0.78;
              var caustic = Math.exp(-Math.pow((dx + sp.r * 0.35) * 7.5, 2) - Math.pow((dy + sp.r * 0.25) * 7.5, 2)) * 0.65;
              v = Math.max(v, 0.14 + fresnel + caustic);
            }
          }

          // Botanical allium radial umbel filaments
          var ux = (nx - 0.66) * 1.25;
          var uy = ny - 0.54;
          var uDist = Math.sqrt(ux * ux + uy * uy);
          var angle = Math.atan2(uy, ux);
          if (uDist < 0.24) {
            var rays = Math.pow(Math.abs(Math.cos(angle * 14.0)), 18.0);
            var tip = Math.exp(-Math.pow((uDist - 0.21) * 34.0, 2));
            v += rays * (1.0 - uDist / 0.24) * 0.55 + tip * rays * 0.45;
          }

          buf[idx] = clamp01(v);
        }
      }
    } else if (plateId === 'tidal') {
      // Plate 04: Tidal Standing Wave — ND 3.0 240s long exposure
      for (var y = 0; y < height; y++) {
        var ny = y * invH;
        for (var x = 0; x < width; x++) {
          var nx = x * invW;
          var idx = y * width + x;
          var horizon = 0.44;
          var v;

          if (ny < horizon) {
            // Silky long-exposure sky & cloud streaks
            var t = (horizon - ny) / horizon;
            v = 0.86 - t * 0.34 + (fbm(nx * 2.2, ny * 12.0, 4) - 0.5) * 0.16;
          } else {
            // Standing wave interference on mirror-like sea
            var wt = (ny - horizon) / (1.0 - horizon);
            var persp = 1.0 / (wt + 0.08);
            var wave1 = Math.sin(nx * 26.0 + persp * 2.2 + fbm(nx * 4.0, ny * 4.0, 2) * 2.0);
            var wave2 = Math.sin((nx - 0.65) * 32.0 - persp * 1.8);
            var interference = (wave1 + wave2) * 0.5;
            var spec = Math.pow(clamp01(interference * 0.5 + 0.5), 3.0) * (1.0 - wt * 0.55);
            v = 0.68 - wt * 0.42 + spec * 0.34;
          }

          // Basalt sea stack monolith on left third
          var stackW = 0.085 * (1.0 - clamp01((0.46 - ny) * 3.5));
          var stackEdge = 0.24 + (fbm(nx * 30.0, ny * 30.0, 3) - 0.5) * 0.025;
          if (ny > 0.21 && ny < 0.62 && Math.abs(nx - stackEdge) < stackW) {
            var rockShade = 0.12 + clamp01((nx - (stackEdge - stackW)) / (stackW * 2)) * 0.18;
            v = rockShade;
          }

          buf[idx] = clamp01(v);
        }
      }
    } else if (plateId === 'moire') {
      // Plate 05: Moire Interferogram 19 deg — Optical diffraction grating
      var theta = 19.2 * Math.PI / 180;
      var cosT = Math.cos(theta);
      var sinT = Math.sin(theta);

      for (var y = 0; y < height; y++) {
        var ny = (y * invH) - 0.5;
        for (var x = 0; x < width; x++) {
          var nx = ((x * invW) - 0.5) * 1.333;
          var idx = y * width + x;

          var r2 = nx * nx + ny * ny;
          var warp = 1.0 + r2 * 0.55;
          var u1 = nx * warp * 68.0;
          var v1 = ny * warp * 68.0;

          var rx = nx * cosT - ny * sinT;
          var ry = nx * sinT + ny * cosT;
          var u2 = rx * (1.0 + r2 * 0.42) * 68.0;

          var g1 = Math.sin(u1 + Math.sin(v1 * 0.18) * 1.8);
          var g2 = Math.sin(u2 + Math.cos(ry * 12.0) * 1.5);
          var moire = (g1 * g2) * 0.5 + 0.5;
          var envelope = Math.exp(-r2 * 1.15);

          buf[idx] = clamp01(0.22 + moire * 0.72 * envelope + (1 - envelope) * 0.62);
        }
      }
    } else if (plateId === 'basalt') {
      // Plate 06: Basalt Columnar Fracture — Voronoi cellular cooling joints
      for (var y = 0; y < height; y++) {
        var ny = y * invH;
        for (var x = 0; x < width; x++) {
          var nx = x * invW;
          var idx = y * width + x;

          var w = worley(nx * 7.5 + 1.4, ny * 5.6 + 0.8);
          var micro = fbm(nx * 36.0, ny * 36.0, 4);
          var bevel = clamp01(w.edge * 6.5);
          var topFacet = clamp01(0.58 - w.d1 * 0.45 + (micro - 0.5) * 0.22);
          var v = bevel * topFacet;
          buf[idx] = clamp01(v);
        }
      }
    } else if (plateId === 'pendulum') {
      // Plate 07: Chronophotograph: Harmonic Pendulum — Multi-flash stroboscopic trace
      for (var y = 0; y < height; y++) {
        var ny = y * invH;
        for (var x = 0; x < width; x++) {
          var nx = x * invW;
          var idx = y * width + x;

          // Dark scientific plate with subtle calibration grid
          var v = 0.06;
          if (Math.abs((nx * 10) % 1) < 0.012 || Math.abs((ny * 8) % 1) < 0.015) {
            v += 0.08;
          }

          // Continuous harmonic trace curve
          var px = (nx - 0.5) * 2.2;
          var env = Math.exp(-Math.abs(px) * 0.65);
          var curveY = 0.52 + Math.sin(px * 4.2) * 0.31 * env;
          var distCurve = Math.abs(ny - curveY);
          v += Math.exp(-distCurve * distCurve * 2600.0) * 0.42;

          // 17 Stroboscopic flash nodes
          for (var k = -8; k <= 8; k++) {
            var sx = 0.5 + k * 0.052;
            var spx = (sx - 0.5) * 2.2;
            var sEnv = Math.exp(-Math.abs(spx) * 0.65);
            var sy = 0.52 + Math.sin(spx * 4.2) * 0.31 * sEnv;

            // Suspension cord line from pivot (0.5, 0.06)
            var tCord = clamp01((ny - 0.06) / Math.max(0.001, sy - 0.06));
            var cordX = 0.5 + (sx - 0.5) * tCord;
            if (ny >= 0.06 && ny <= sy) {
              var cordDist = Math.abs(nx - cordX);
              v += Math.exp(-cordDist * cordDist * 18000.0) * 0.14;
            }

            // Luminous silver bob
            var dx = (nx - sx) * 1.333;
            var dy = ny - sy;
            var r2 = dx * dx + dy * dy;
            v += Math.exp(-r2 * 1900.0) * 0.88;
          }

          buf[idx] = clamp01(v);
        }
      }
    } else {
      // Plate 08: Silver Crystal Nucleation 400x — Dendritic metallic filaments
      for (var y = 0; y < height; y++) {
        var ny = y * invH;
        for (var x = 0; x < width; x++) {
          var nx = x * invW;
          var idx = y * width + x;

          var warpX = fbm(nx * 6.0, ny * 6.0, 3) * 0.45;
          var warpY = fbm(nx * 6.0 + 7.2, ny * 6.0 + 3.1, 3) * 0.45;
          var dendrite = ridgedFbm((nx + warpX) * 9.5, (ny + warpY) * 9.5, 5);
          var specs = worley(nx * 14.0, ny * 14.0);
          var core = Math.exp(-specs.d1 * specs.d1 * 28.0) * 0.65;

          var dx = nx - 0.5;
          var dy = ny - 0.5;
          var dof = 1.0 - clamp01((dx * dx + dy * dy) * 1.45);
          var v = (dendrite * 0.78 + core) * (0.45 + 0.55 * dof);

          buf[idx] = clamp01(v);
        }
      }
    }

    plateBufferCache[cacheKey] = buf;
    return buf;
  }

  /* ========================================================================
     3. HURTER-DRIFFIELD CURVE & HALFTONE / RASTER PROCESSOR
     ======================================================================== */

  function evalHDCurve(linearVal, grade, evOffset) {
    // Map grade 00 (0.0) .. 5.0 to steepness gamma
    var gamma = 2.4 + grade * 1.45;
    var shifted = clamp01(linearVal + evOffset * 0.22);
    var centered = shifted - 0.5;
    var sig = 1.0 / (1.0 + Math.exp(-gamma * centered));
    var minSig = 1.0 / (1.0 + Math.exp(gamma * 0.5));
    var maxSig = 1.0 / (1.0 + Math.exp(-gamma * 0.5));
    return clamp01((sig - minSig) / (maxSig - minSig));
  }

  function renderProcessedBuffer(rawBuf, canvas, opts) {
    var w = canvas.width;
    var h = canvas.height;
    var ctx = canvas.getContext('2d');
    var imgData = ctx.createImageData(w, h);
    var data = imgData.data;

    var grade = opts.grade !== undefined ? opts.grade : 2.5;
    var ev = opts.ev !== undefined ? opts.ev : 0.0;
    var vignette = opts.vignette !== undefined ? opts.vignette : 0.0;
    var grain = opts.grain !== undefined ? opts.grain : 0.15;
    var rasterMode = opts.rasterMode || 'continuous';
    var invert = !!opts.invert;
    var developProgress = opts.developProgress !== undefined ? opts.developProgress : 1.0;

    var toneBuf = new Float32Array(w * h);
    var zoneCounts = new Uint32Array(11);
    var histBins = new Uint32Array(32);

    var invW = 1 / w;
    var invH = 1 / h;

    // Pass 1: Sensitometric H&D curve + Edge Burn + Silver Grain + Chemical Sweep
    for (var y = 0; y < h; y++) {
      var ny = y * invH - 0.5;
      for (var x = 0; x < w; x++) {
        var nx = x * invW - 0.5;
        var idx = y * w + x;

        var v = rawBuf[idx];
        if (invert) {
          v = 1.0 - v;
        }

        // Edge burn / enlarger falloff
        if (vignette > 0) {
          var r2 = (nx * nx + ny * ny) * 2.2;
          v = clamp01(v - r2 * vignette * 0.55);
        }

        // Hurter-Driffield Characteristic Curve
        v = evalHDCurve(v, grade, ev);

        // Midtone-weighted silver halide grain
        if (grain > 0) {
          var gNoise = (hash2D(x * 3 + 17, y * 3 + 31) + hash2D(x * 7 + 5, y * 7 + 11) - 1.0);
          var midWeight = 4.0 * v * (1.0 - v);
          v = clamp01(v + gNoise * grain * 0.24 * (0.35 + 0.65 * midWeight));
        }

        // Chemical tray development progression (if developing)
        if (developProgress < 1.0) {
          var wave = Math.sin(nx * 14.0 + developProgress * 9.0) * 0.04;
          var devMask = clamp01(developProgress * 1.15 + wave);
          v = 1.0 - (1.0 - v) * devMask;
        }

        toneBuf[idx] = v;
      }
    }

    // Pass 2: Screening / Halftone Rasterization + Telemetry Histogram
    if (rasterMode === 'floyd-steinberg') {
      var errBuf = new Float32Array(toneBuf);
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var idx = y * w + x;
          var oldVal = errBuf[idx];
          var newVal = oldVal >= 0.5 ? 1.0 : 0.0;
          var err = oldVal - newVal;

          if (x + 1 < w) errBuf[idx + 1] += err * (7 / 16);
          if (y + 1 < h) {
            if (x > 0) errBuf[idx + w - 1] += err * (3 / 16);
            errBuf[idx + w] += err * (5 / 16);
            if (x + 1 < w) errBuf[idx + w + 1] += err * (1 / 16);
          }
          toneBuf[idx] = newVal;
        }
      }
    } else if (rasterMode === 'bayer') {
      for (var y = 0; y < h; y++) {
        var by = y & 7;
        for (var x = 0; x < w; x++) {
          var idx = y * w + x;
          var threshold = (BAYER_8X8[by][x & 7] + 0.5) / 64.0;
          toneBuf[idx] = toneBuf[idx] >= threshold ? 1.0 : 0.0;
        }
      }
    } else if (rasterMode === 'halftone') {
      var freq = 0.58; // ~5.4px cell period
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var idx = y * w + x;
          var u = (x - y) * freq;
          var vCoord = (x + y) * freq;
          var screen = (Math.sin(u) * Math.sin(vCoord)) * 0.5 + 0.5;
          toneBuf[idx] = toneBuf[idx] >= screen ? 1.0 : 0.0;
        }
      }
    } else if (rasterMode === 'engraving') {
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var idx = y * w + x;
          var waveY = y + Math.sin(x * 0.045) * 2.2;
          var lineScreen = Math.sin(waveY * 1.15) * 0.5 + 0.5;
          toneBuf[idx] = toneBuf[idx] >= lineScreen ? 1.0 : 0.0;
        }
      }
    }

    // Write RGBA pixels & compute Zone + Histogram telemetry
    for (var i = 0; i < w * h; i++) {
      var val = toneBuf[i];
      var byte = Math.round(val * 255);
      var p = i * 4;
      data[p] = byte;
      data[p + 1] = byte;
      data[p + 2] = byte;
      data[p + 3] = 255;

      var zIdx = Math.min(10, Math.floor(val * 10.999));
      zoneCounts[zIdx]++;

      var hIdx = Math.min(31, Math.floor(val * 31.999));
      histBins[hIdx]++;
    }

    ctx.putImageData(imgData, 0, 0);

    return {
      zoneCounts: zoneCounts,
      histBins: histBins,
      totalPixels: w * h
    };
  }

  /* ========================================================================
     4. SVG TELEMETRY RENDERERS (H&D CURVE, ZONE BARS, HISTOGRAM)
     ======================================================================== */

  function renderHDCurveSVG(svgEl, grade, ev) {
    if (!svgEl) return;
    var w = 220;
    var h = 100;
    var pad = 10;
    var pts = [];

    for (var i = 0; i <= 40; i++) {
      var t = i / 40;
      var yVal = evalHDCurve(t, grade, ev);
      var px = pad + t * (w - pad * 2);
      var py = (h - pad) - yVal * (h - pad * 2);
      pts.push(px.toFixed(1) + ',' + py.toFixed(1));
    }

    svgEl.innerHTML =
      '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + pad + '" stroke="currentColor" stroke-opacity="0.22" stroke-dasharray="3 3" stroke-width="1"/>' +
      '<rect x="' + pad + '" y="' + pad + '" width="' + (w - pad * 2) + '" height="' + (h - pad * 2) + '" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-width="1"/>' +
      '<polyline fill="none" stroke="currentColor" stroke-width="2" points="' + pts.join(' ') + '"/>';
  }

  function renderZoneDistributionSVG(svgEl, telemetry) {
    if (!svgEl || !telemetry) return;
    var w = 220;
    var h = 100;
    var pad = 8;
    var counts = telemetry.zoneCounts;
    var maxCount = 1;
    for (var i = 0; i < 11; i++) {
      if (counts[i] > maxCount) maxCount = counts[i];
    }

    var barW = (w - pad * 2) / 11;
    var bars = '';
    for (var z = 0; z < 11; z++) {
      var norm = counts[z] / maxCount;
      var bh = Math.max(2, norm * (h - pad * 2));
      var bx = pad + z * barW + 1.5;
      var by = (h - pad) - bh;
      bars += '<rect x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + (barW - 3).toFixed(1) + '" height="' + bh.toFixed(1) + '" fill="currentColor" fill-opacity="' + (0.28 + (z / 10) * 0.72).toFixed(2) + '"/>';
    }

    svgEl.innerHTML =
      '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>' +
      bars;
  }

  function renderHistogramSVG(svgEl, telemetry) {
    if (!svgEl || !telemetry) return;
    var w = 240;
    var h = 86;
    var bins = telemetry.histBins;
    var maxBin = 1;
    for (var i = 0; i < 32; i++) {
      if (bins[i] > maxBin) maxBin = bins[i];
    }

    var pts = ['0,' + h];
    for (var b = 0; b < 32; b++) {
      var x = (b / 31) * w;
      var y = h - (bins[b] / maxBin) * (h - 6);
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }
    pts.push(w + ',' + h);

    svgEl.innerHTML =
      '<polygon points="' + pts.join(' ') + '" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.5"/>';
  }

  /* ========================================================================
     5. APPLICATION STATE & INITIALIZATION
     ======================================================================== */

  var state = {
    theme: 'paper',
    reducedMotion: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    motionPaused: false,
    selectedZone: 5,
    galleryFilter: 'all',
    galleryView: 'grid',
    lightboxPlateIndex: 0,
    loupeEnabled: true,
    loupeX: 0.5,
    loupeY: 0.5,
    enlargerSource: 'vercors',
    enlargerGrade: 2.5,
    enlargerEv: 0.0,
    enlargerVignette: 0.15,
    enlargerGrain: 0.14,
    enlargerRaster: 'continuous',
    enlargerInvert: false,
    photogramTool: 'torch',
    photogramBuffer: null,
    photogramDeveloping: false,
    labBitDepth: 256,
    labGammaMode: 'perceptual',
    labZoneIndex: 5,
    labHalftoneAlgo: 'floyd-steinberg',
    chronologyFilter: 'all'
  };

  var lastFocusedBeforeModal = null;

  /* ========================================================================
     6. HERO LIVE SLIT-SCAN FIELD & 11-ZONE STEP-WEDGE
     ======================================================================== */

  function initHero() {
    var heroCanvas = document.getElementById('hero-canvas');
    var reticleCoords = document.getElementById('reticle-coords');
    var reticleLum = document.getElementById('reticle-luminance');
    var reticleZone = document.getElementById('reticle-zone');
    var wedgeGrid = document.getElementById('zone-steps-grid');

    if (!heroCanvas || !wedgeGrid) return;

    var ctx = heroCanvas.getContext('2d');
    var w = heroCanvas.width;
    var h = heroCanvas.height;
    var imgData = ctx.createImageData(w, h);
    var data = imgData.data;

    var pointerX = 0.52;
    var pointerY = 0.44;
    var phase = 0;

    function renderHeroFrame(t) {
      var zoneBias = (state.selectedZone - 5) * 0.065;
      var invW = 1 / w;
      var invH = 1 / h;

      for (var y = 0; y < h; y++) {
        var ny = y * invH;
        var dy = ny - pointerY;
        for (var x = 0; x < w; x++) {
          var nx = x * invW;
          var dx = nx - pointerX;
          var dist = Math.sqrt(dx * dx + dy * dy);

          // Optical slit interference + cylindrical wave diffraction
          var slit1 = Math.sin((nx * 18.0 - t * 0.55) + Math.sin(ny * 7.0 + t * 0.3) * 1.4);
          var slit2 = Math.cos((dist * 26.0 - t * 0.85));
          var envelope = Math.exp(-dist * 1.85);
          var carrier = Math.sin(nx * 92.0 + slit1 * 2.2) * 0.14;

          var raw = 0.5 + (slit1 * 0.32 + slit2 * 0.36) * (0.45 + 0.55 * envelope) + carrier + zoneBias;
          // High-contrast S-curve
          var v = evalHDCurve(clamp01(raw), 2.8, 0);
          // Subtle silver grain
          var grain = (hash2D(x + Math.floor(t * 17), y) - 0.5) * 0.07;
          var byte = Math.round(clamp01(v + grain) * 255);

          var idx = (y * w + x) * 4;
          data[idx] = byte;
          data[idx + 1] = byte;
          data[idx + 2] = byte;
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);

      // Subtle optical interferometer crosshair at pointer focal point
      var cx = Math.round(pointerX * w) + 0.5;
      var cy = Math.round(pointerY * h) + 0.5;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy);
      ctx.lineTo(cx + 18, cy);
      ctx.moveTo(cx, cy - 18);
      ctx.lineTo(cx, cy + 18);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    function updateReticleTelemetry(nx, ny) {
      if (!reticleCoords || !reticleLum || !reticleZone) return;
      var px = Math.min(w - 1, Math.max(0, Math.floor(nx * w)));
      var py = Math.min(h - 1, Math.max(0, Math.floor(ny * h)));
      var pixel = ctx.getImageData(px, py, 1, 1).data[0];
      var norm = pixel / 255;
      var zIdx = Math.min(10, Math.floor(norm * 10.999));
      var logD = (3.2 * (1 - norm)).toFixed(2);

      reticleCoords.textContent = 'X:' + Math.round(nx * 100) + '% · Y:' + Math.round(ny * 100) + '%';
      reticleLum.textContent = '0x' + pixel.toString(16).toUpperCase().padStart(2, '0') + ' · ' + logD + ' D';
      reticleZone.textContent = 'ZONE ' + ZONES[zIdx].roman;
    }

    heroCanvas.addEventListener('pointermove', function (e) {
      var rect = heroCanvas.getBoundingClientRect();
      pointerX = clamp01((e.clientX - rect.left) / rect.width);
      pointerY = clamp01((e.clientY - rect.top) / rect.height);
      if (state.reducedMotion || state.motionPaused) {
        renderHeroFrame(phase);
      }
      updateReticleTelemetry(pointerX, pointerY);
    });

    // Build 11-Zone Step-Wedge Buttons
    function selectZone(index) {
      state.selectedZone = index;
      var z = ZONES[index];

      var buttons = wedgeGrid.querySelectorAll('.zone-step-btn');
      for (var i = 0; i < buttons.length; i++) {
        var active = i === index;
        buttons[i].classList.toggle('is-selected', active);
        buttons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
      }

      document.getElementById('zone-readout-roman').textContent = 'ZONE ' + z.roman;
      document.getElementById('zone-readout-title').textContent = z.title;
      document.getElementById('zone-readout-reflectance').textContent = z.reflectance;
      document.getElementById('zone-readout-density').textContent = z.density;
      document.getElementById('zone-readout-ev').textContent = z.ev;
      document.getElementById('zone-readout-hex').textContent = z.hex;

      if (state.reducedMotion || state.motionPaused) {
        renderHeroFrame(phase);
      }
    }

    ZONES.forEach(function (z, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zone-step-btn';
      btn.style.backgroundColor = z.hex;
      btn.style.color = idx < 6 ? '#F5F5F5' : '#0A0A0A';
      btn.setAttribute('aria-label', 'Zone ' + z.roman + ': ' + z.title + ', ' + z.reflectance + ' reflectance');
      btn.setAttribute('aria-pressed', idx === state.selectedZone ? 'true' : 'false');
      btn.innerHTML =
        '<span class="zone-step-roman">' + z.roman + '</span>' +
        '<span class="zone-step-hex">' + z.hex + '</span>';

      btn.addEventListener('click', function () {
        selectZone(idx);
      });

      btn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          var next = (idx + 1) % ZONES.length;
          selectZone(next);
          wedgeGrid.children[next].focus();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          var prev = (idx - 1 + ZONES.length) % ZONES.length;
          selectZone(prev);
          wedgeGrid.children[prev].focus();
        }
      });

      wedgeGrid.appendChild(btn);
    });

    selectZone(5);
    renderHeroFrame(0);
    updateReticleTelemetry(pointerX, pointerY);

    function tickHero() {
      if (!state.reducedMotion && !state.motionPaused) {
        phase += 0.025;
        renderHeroFrame(phase);
      }
      window.requestAnimationFrame(tickHero);
    }
    window.requestAnimationFrame(tickHero);
  }

  /* ========================================================================
     7. EXHIBITION PLATES GALLERY & CONTACT/FOLIO VIEW
     ======================================================================== */

  function initGallery() {
    var grid = document.getElementById('plates-grid');
    var filterBtns = document.querySelectorAll('[data-gallery-filter]');
    var viewBtns = document.querySelectorAll('[data-gallery-view]');
    if (!grid) return;

    function renderPlates() {
      grid.innerHTML = '';
      grid.classList.toggle('is-folio-view', state.galleryView === 'folio');

      var filtered = PLATES.filter(function (p) {
        return state.galleryFilter === 'all' || p.key === state.galleryFilter;
      });

      filtered.forEach(function (plate) {
        var globalIndex = PLATES.indexOf(plate);
        var card = document.createElement('article');
        card.className = 'plate-card';

        var frame = document.createElement('div');
        frame.className = 'plate-frame';

        var canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', plate.num + ' — ' + plate.title + ': ' + plate.desc);

        var rawBuf = generatePlateBuffer(plate.id, 400, 300);
        var telemetry = renderProcessedBuffer(rawBuf, canvas, {
          grade: plate.defaultGrade,
          ev: plate.defaultEv,
          grain: 0.12
        });

        var badge = document.createElement('span');
        badge.className = 'plate-badge';
        badge.textContent = plate.num + ' · ' + plate.keyLabel;

        // 11-zone proportional tonal bar at bottom of frame
        var zoneBar = document.createElement('div');
        zoneBar.className = 'plate-zone-bar';
        zoneBar.setAttribute('aria-hidden', 'true');
        for (var z = 0; z < 11; z++) {
          var seg = document.createElement('span');
          var pct = (telemetry.zoneCounts[z] / telemetry.totalPixels) * 100;
          seg.style.width = pct.toFixed(2) + '%';
          seg.style.backgroundColor = ZONES[z].hex;
          zoneBar.appendChild(seg);
        }

        frame.appendChild(canvas);
        frame.appendChild(badge);
        frame.appendChild(zoneBar);
        frame.addEventListener('click', function () {
          openLightbox(globalIndex, frame);
        });
        frame.style.cursor = 'pointer';

        var body = document.createElement('div');
        body.className = 'plate-body';
        body.innerHTML =
          '<div class="plate-meta-top">' +
            '<span>' + plate.process + '</span>' +
            '<span>' + plate.zones + '</span>' +
          '</div>' +
          '<h3 class="plate-title">' + plate.title + '</h3>' +
          '<p class="plate-desc">' + plate.desc + '</p>' +
          '<div class="plate-specs">' +
            '<span>' + plate.format + ' · ' + plate.developer + '</span>' +
          '</div>';

        var inspectBtn = document.createElement('button');
        inspectBtn.type = 'button';
        inspectBtn.className = 'plate-inspect-btn';
        inspectBtn.textContent = 'Inspect & Loupe';
        inspectBtn.setAttribute('aria-label', 'Inspect ' + plate.title + ' with optical loupe');
        inspectBtn.addEventListener('click', function () {
          openLightbox(globalIndex, inspectBtn);
        });

        body.querySelector('.plate-specs').appendChild(inspectBtn);

        card.appendChild(frame);
        card.appendChild(body);
        grid.appendChild(card);
      });
    }

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.galleryFilter = btn.getAttribute('data-gallery-filter');
        filterBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        renderPlates();
      });
    });

    viewBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.galleryView = btn.getAttribute('data-gallery-view');
        viewBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        renderPlates();
      });
    });

    renderPlates();
  }

  /* ========================================================================
     8. OPTICAL INSPECTION LIGHTBOX & 2.5X LOUPE
     ======================================================================== */

  var lightboxState = {
    grade: 2.5,
    ev: 0.0,
    grain: 0.14,
    raster: 'continuous'
  };

  function renderLightboxPlate() {
    var plate = PLATES[state.lightboxPlateIndex];
    var canvas = document.getElementById('lightbox-canvas');
    if (!plate || !canvas) return;

    document.getElementById('lightbox-kicker').textContent = plate.num + ' / 08 · ' + plate.process;
    document.getElementById('lightbox-title').textContent = plate.title;
    document.getElementById('lightbox-desc').textContent = plate.desc;
    document.getElementById('lb-spec-format').textContent = plate.format;
    document.getElementById('lb-spec-lens').textContent = plate.lens;
    document.getElementById('lb-spec-dev').textContent = plate.developer;
    document.getElementById('lb-spec-zones').textContent = plate.zones;

    var rawBuf = generatePlateBuffer(plate.id, canvas.width, canvas.height);
    var telemetry = renderProcessedBuffer(rawBuf, canvas, {
      grade: lightboxState.grade,
      ev: lightboxState.ev,
      grain: lightboxState.grain,
      rasterMode: lightboxState.raster
    });

    renderHistogramSVG(document.getElementById('lightbox-histogram-svg'), telemetry);
    renderHDCurveSVG(document.getElementById('lightbox-hd-svg'), lightboxState.grade, lightboxState.ev);
    updateLoupeMagnifier();
  }

  function updateLoupeMagnifier() {
    var loupe = document.getElementById('optical-loupe');
    var loupeCanvas = document.getElementById('loupe-canvas');
    var srcCanvas = document.getElementById('lightbox-canvas');
    var wrap = document.getElementById('lightbox-canvas-wrap');
    if (!loupe || !loupeCanvas || !srcCanvas || !wrap) return;

    if (!state.loupeEnabled) {
      loupe.hidden = true;
      wrap.classList.remove('loupe-active');
      return;
    }

    loupe.hidden = false;
    wrap.classList.add('loupe-active');

    var rect = wrap.getBoundingClientRect();
    loupe.style.left = (state.loupeX * rect.width) + 'px';
    loupe.style.top = (state.loupeY * rect.height) + 'px';

    var lCtx = loupeCanvas.getContext('2d');
    var zoom = 2.6;
    var sampleW = loupeCanvas.width / zoom;
    var sampleH = loupeCanvas.height / zoom;
    var sx = clamp01(state.loupeX) * srcCanvas.width - sampleW * 0.5;
    var sy = clamp01(state.loupeY) * srcCanvas.height - sampleH * 0.5;

    sx = Math.max(0, Math.min(srcCanvas.width - sampleW, sx));
    sy = Math.max(0, Math.min(srcCanvas.height - sampleH, sy));

    lCtx.imageSmoothingEnabled = false;
    lCtx.clearRect(0, 0, loupeCanvas.width, loupeCanvas.height);
    lCtx.drawImage(srcCanvas, sx, sy, sampleW, sampleH, 0, 0, loupeCanvas.width, loupeCanvas.height);
  }

  function openLightbox(index, triggerEl) {
    lastFocusedBeforeModal = triggerEl || document.activeElement;
    state.lightboxPlateIndex = index;
    var plate = PLATES[index];

    lightboxState.grade = plate.defaultGrade;
    lightboxState.ev = plate.defaultEv;
    lightboxState.grain = 0.14;
    lightboxState.raster = 'continuous';

    var gradeSlider = document.getElementById('lb-grade-slider');
    var evSlider = document.getElementById('lb-ev-slider');
    var rasterSelect = document.getElementById('lb-raster-select');

    gradeSlider.value = lightboxState.grade;
    document.getElementById('lb-grade-val').textContent = 'Grade ' + lightboxState.grade.toFixed(1);
    evSlider.value = lightboxState.ev;
    document.getElementById('lb-ev-val').textContent = (lightboxState.ev >= 0 ? '+' : '') + lightboxState.ev.toFixed(2) + ' EV';
    rasterSelect.value = 'continuous';

    var backdrop = document.getElementById('lightbox-backdrop');
    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';

    renderLightboxPlate();
    document.getElementById('lightbox-close-btn').focus();
  }

  function closeLightbox() {
    var backdrop = document.getElementById('lightbox-backdrop');
    if (backdrop.hidden) return;
    backdrop.hidden = true;
    document.body.style.overflow = '';
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
      lastFocusedBeforeModal.focus();
    }
  }

  function initLightbox() {
    var backdrop = document.getElementById('lightbox-backdrop');
    var closeBtn = document.getElementById('lightbox-close-btn');
    var prevBtn = document.getElementById('lightbox-prev-btn');
    var nextBtn = document.getElementById('lightbox-next-btn');
    var loupeBtn = document.getElementById('lightbox-loupe-btn');
    var exportBtn = document.getElementById('lightbox-export-btn');
    var sendBtn = document.getElementById('lightbox-send-darkroom-btn');
    var wrap = document.getElementById('lightbox-canvas-wrap');

    var gradeSlider = document.getElementById('lb-grade-slider');
    var evSlider = document.getElementById('lb-ev-slider');
    var rasterSelect = document.getElementById('lb-raster-select');

    if (!backdrop) return;

    closeBtn.addEventListener('click', closeLightbox);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeLightbox();
    });

    prevBtn.addEventListener('click', function () {
      openLightbox((state.lightboxPlateIndex - 1 + PLATES.length) % PLATES.length, prevBtn);
    });

    nextBtn.addEventListener('click', function () {
      openLightbox((state.lightboxPlateIndex + 1) % PLATES.length, nextBtn);
    });

    loupeBtn.addEventListener('click', function () {
      state.loupeEnabled = !state.loupeEnabled;
      loupeBtn.setAttribute('aria-pressed', state.loupeEnabled ? 'true' : 'false');
      loupeBtn.textContent = state.loupeEnabled ? 'Loupe 2.6×: ON' : 'Loupe 2.6×: OFF';
      updateLoupeMagnifier();
    });

    wrap.addEventListener('pointermove', function (e) {
      var rect = wrap.getBoundingClientRect();
      state.loupeX = clamp01((e.clientX - rect.left) / rect.width);
      state.loupeY = clamp01((e.clientY - rect.top) / rect.height);
      updateLoupeMagnifier();
    });

    wrap.addEventListener('keydown', function (e) {
      var step = 0.04;
      if (e.key === 'ArrowRight') { e.preventDefault(); state.loupeX = clamp01(state.loupeX + step); updateLoupeMagnifier(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); state.loupeX = clamp01(state.loupeX - step); updateLoupeMagnifier(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); state.loupeY = clamp01(state.loupeY + step); updateLoupeMagnifier(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); state.loupeY = clamp01(state.loupeY - step); updateLoupeMagnifier(); }
    });

    gradeSlider.addEventListener('input', function () {
      lightboxState.grade = parseFloat(gradeSlider.value);
      document.getElementById('lb-grade-val').textContent = 'Grade ' + lightboxState.grade.toFixed(1);
      renderLightboxPlate();
    });

    evSlider.addEventListener('input', function () {
      lightboxState.ev = parseFloat(evSlider.value);
      document.getElementById('lb-ev-val').textContent = (lightboxState.ev >= 0 ? '+' : '') + lightboxState.ev.toFixed(2) + ' EV';
      renderLightboxPlate();
    });

    rasterSelect.addEventListener('change', function () {
      lightboxState.raster = rasterSelect.value;
      renderLightboxPlate();
    });

    exportBtn.addEventListener('click', function () {
      var plate = PLATES[state.lightboxPlateIndex];
      var canvas = document.getElementById('lightbox-canvas');
      triggerCanvasDownload(canvas, plate.id + '_grade-' + lightboxState.grade + '.png');
    });

    sendBtn.addEventListener('click', function () {
      var plate = PLATES[state.lightboxPlateIndex];
      closeLightbox();
      loadPlateIntoEnlarger(plate.id, lightboxState.grade, lightboxState.ev, lightboxState.raster);
      var darkroomEl = document.getElementById('darkroom-section');
      if (darkroomEl) {
        darkroomEl.scrollIntoView({ behavior: state.reducedMotion ? 'auto' : 'smooth' });
      }
    });

    // Focus trap inside Lightbox dialog
    backdrop.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
        return;
      }
      if (e.key === 'Tab') {
        var focusables = backdrop.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]');
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  function triggerCanvasDownload(canvas, filename) {
    try {
      var url = canvas.toDataURL('image/png');
      var link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      // Safe fallback if tainted
    }
  }

  /* ========================================================================
     9. SECTION III: DARKROOM ENLARGER & PHOTOGRAM LIGHT-PAINTING TRAY
     ======================================================================== */

  var enlargerRenderFn = null;

  function loadPlateIntoEnlarger(sourceId, grade, ev, raster) {
    state.enlargerSource = sourceId;
    if (grade !== undefined) state.enlargerGrade = grade;
    if (ev !== undefined) state.enlargerEv = ev;
    if (raster !== undefined) state.enlargerRaster = raster;

    var sel = document.getElementById('enlarger-source-select');
    if (sel) sel.value = sourceId;
    if (enlargerRenderFn) enlargerRenderFn(1.0);
  }

  function initDarkroom() {
    var canvas = document.getElementById('enlarger-canvas');
    var container = document.getElementById('enlarger-canvas-container');
    var sourceSelect = document.getElementById('enlarger-source-select');
    var photogramPalette = document.getElementById('photogram-palette');
    var trayStatus = document.getElementById('tray-status-pill');

    var gradeSlider = document.getElementById('enlarger-grade-slider');
    var evSlider = document.getElementById('enlarger-ev-slider');
    var vignetteSlider = document.getElementById('enlarger-vignette-slider');
    var grainSlider = document.getElementById('enlarger-grain-slider');
    var rasterSelect = document.getElementById('enlarger-raster-select');
    var invertBtn = document.getElementById('enlarger-invert-btn');
    var downloadBtn = document.getElementById('enlarger-download-btn');
    var resetBtn = document.getElementById('enlarger-reset-btn');

    var toolBtns = document.querySelectorAll('[data-photogram-tool]');
    var clearPaperBtn = document.getElementById('photogram-clear-btn');
    var developTrayBtn = document.getElementById('photogram-develop-btn');

    if (!canvas || !sourceSelect) return;

    var w = canvas.width;
    var h = canvas.height;

    // Initialize blank unexposed silver-gelatin photogram paper (1.0 = unexposed white)
    function resetPhotogramPaper() {
      var buf = new Float32Array(w * h);
      for (var i = 0; i < buf.length; i++) {
        buf[i] = 0.96;
      }
      state.photogramBuffer = buf;
    }
    resetPhotogramPaper();

    function syncControlLabels() {
      gradeSlider.value = state.enlargerGrade;
      document.getElementById('enlarger-grade-val').textContent = 'Grade ' + state.enlargerGrade.toFixed(1);

      evSlider.value = state.enlargerEv;
      var sec = (16 * Math.pow(2, state.enlargerEv)).toFixed(1);
      document.getElementById('enlarger-ev-val').textContent =
        (state.enlargerEv >= 0 ? '+' : '') + state.enlargerEv.toFixed(2) + ' EV (' + sec + 's)';

      vignetteSlider.value = state.enlargerVignette;
      document.getElementById('enlarger-vignette-val').textContent = Math.round(state.enlargerVignette * 100) + '%';

      grainSlider.value = state.enlargerGrain;
      document.getElementById('enlarger-grain-val').textContent = Math.round(state.enlargerGrain * 100) + '%';

      rasterSelect.value = state.enlargerRaster;
      invertBtn.setAttribute('aria-pressed', state.enlargerInvert ? 'true' : 'false');
    }

    function renderEnlarger(devProgress) {
      syncControlLabels();
      var isPhotogram = state.enlargerSource === 'photogram';
      photogramPalette.hidden = !isPhotogram;
      container.classList.toggle('is-photogram', isPhotogram);

      var rawBuf = isPhotogram
        ? state.photogramBuffer
        : generatePlateBuffer(state.enlargerSource, w, h);

      var telemetry = renderProcessedBuffer(rawBuf, canvas, {
        grade: state.enlargerGrade,
        ev: state.enlargerEv,
        vignette: state.enlargerVignette,
        grain: state.enlargerGrain,
        rasterMode: state.enlargerRaster,
        invert: state.enlargerInvert,
        developProgress: devProgress !== undefined ? devProgress : 1.0
      });

      renderHDCurveSVG(document.getElementById('hd-curve-svg'), state.enlargerGrade, state.enlargerEv);
      renderZoneDistributionSVG(document.getElementById('zone-dist-svg'), telemetry);

      if (devProgress !== undefined && devProgress < 1.0) {
        trayStatus.textContent = 'DEVELOPING IN DEKTOL 1:2 · ' + Math.round(devProgress * 100) + '%';
      } else if (isPhotogram) {
        trayStatus.textContent = 'PHOTOGRAM PAPER · DRAW WITH LIGHT OR DEVELOP IN TRAY';
      } else {
        var plate = PLATES.find(function (p) { return p.id === state.enlargerSource; });
        trayStatus.textContent = (plate ? plate.num + ' · ' : '') + state.enlargerRaster.toUpperCase();
      }
    }

    enlargerRenderFn = renderEnlarger;

    // Expose photogram paper with optical light tool
    function exposePhotogramAt(nx, ny) {
      if (state.enlargerSource !== 'photogram') return;
      var buf = state.photogramBuffer;
      var tool = state.photogramTool;
      var radius = tool === 'slit' ? 0.16 : 0.13;
      var minX = Math.max(0, Math.floor((nx - radius) * w));
      var maxX = Math.min(w - 1, Math.ceil((nx + radius) * w));
      var minY = Math.max(0, Math.floor((ny - radius) * h));
      var maxY = Math.min(h - 1, Math.ceil((ny + radius) * h));

      for (var y = minY; y <= maxY; y++) {
        var py = y / h;
        for (var x = minX; x <= maxX; x++) {
          var px = x / w;
          var dx = (px - nx) * 1.333;
          var dy = py - ny;
          var d = Math.sqrt(dx * dx + dy * dy);
          var idx = y * w + x;

          if (tool === 'torch') {
            var falloff = Math.exp(-(d * d) / (0.065 * 0.065));
            buf[idx] = clamp01(buf[idx] - falloff * 0.16);
          } else if (tool === 'slit') {
            var slit = Math.exp(-(dx * dx) / (0.012 * 0.012)) * Math.exp(-(dy * dy) / (0.13 * 0.13));
            buf[idx] = clamp01(buf[idx] - slit * 0.24);
          } else if (tool === 'ring') {
            var ringDist = Math.abs(d - 0.085);
            var ring = Math.exp(-(ringDist * ringDist) / (0.014 * 0.014));
            buf[idx] = clamp01(buf[idx] - ring * 0.22);
          } else if (tool === 'dodge') {
            var mask = Math.exp(-(d * d) / (0.065 * 0.065));
            buf[idx] = clamp01(buf[idx] + mask * 0.22);
          }
        }
      }
      renderEnlarger(1.0);
    }

    var isPainting = false;
    container.addEventListener('pointerdown', function (e) {
      if (state.enlargerSource !== 'photogram') return;
      isPainting = true;
      container.setPointerCapture(e.pointerId);
      var rect = container.getBoundingClientRect();
      exposePhotogramAt((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
    });

    container.addEventListener('pointermove', function (e) {
      if (!isPainting || state.enlargerSource !== 'photogram') return;
      var rect = container.getBoundingClientRect();
      exposePhotogramAt((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
    });

    container.addEventListener('pointerup', function () {
      isPainting = false;
    });

    var kbPhotogramX = 0.5;
    var kbPhotogramY = 0.5;
    container.addEventListener('keydown', function (e) {
      if (state.enlargerSource !== 'photogram') return;
      var step = 0.05;
      if (e.key === 'ArrowRight') { e.preventDefault(); kbPhotogramX = clamp01(kbPhotogramX + step); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); kbPhotogramX = clamp01(kbPhotogramX - step); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); kbPhotogramY = clamp01(kbPhotogramY + step); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); kbPhotogramY = clamp01(kbPhotogramY - step); }
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        exposePhotogramAt(kbPhotogramX, kbPhotogramY);
      }
    });

    toolBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.photogramTool = btn.getAttribute('data-photogram-tool');
        toolBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
      });
    });

    clearPaperBtn.addEventListener('click', function () {
      resetPhotogramPaper();
      renderEnlarger(1.0);
    });

    developTrayBtn.addEventListener('click', function () {
      if (state.reducedMotion) {
        renderEnlarger(1.0);
        return;
      }
      var start = performance.now();
      var duration = 1500;
      function step(now) {
        var p = clamp01((now - start) / duration);
        var eased = 1 - Math.pow(1 - p, 3);
        renderEnlarger(eased);
        if (p < 1) {
          window.requestAnimationFrame(step);
        }
      }
      window.requestAnimationFrame(step);
    });

    sourceSelect.addEventListener('change', function () {
      state.enlargerSource = sourceSelect.value;
      renderEnlarger(1.0);
    });

    gradeSlider.addEventListener('input', function () {
      state.enlargerGrade = parseFloat(gradeSlider.value);
      renderEnlarger(1.0);
    });

    evSlider.addEventListener('input', function () {
      state.enlargerEv = parseFloat(evSlider.value);
      renderEnlarger(1.0);
    });

    vignetteSlider.addEventListener('input', function () {
      state.enlargerVignette = parseFloat(vignetteSlider.value);
      renderEnlarger(1.0);
    });

    grainSlider.addEventListener('input', function () {
      state.enlargerGrain = parseFloat(grainSlider.value);
      renderEnlarger(1.0);
    });

    rasterSelect.addEventListener('change', function () {
      state.enlargerRaster = rasterSelect.value;
      renderEnlarger(1.0);
    });

    invertBtn.addEventListener('click', function () {
      state.enlargerInvert = !state.enlargerInvert;
      renderEnlarger(1.0);
    });

    downloadBtn.addEventListener('click', function () {
      triggerCanvasDownload(canvas, 'sensitometry_' + state.enlargerSource + '.png');
    });

    resetBtn.addEventListener('click', function () {
      state.enlargerGrade = 2.5;
      state.enlargerEv = 0.0;
      state.enlargerVignette = 0.15;
      state.enlargerGrain = 0.14;
      state.enlargerRaster = 'continuous';
      state.enlargerInvert = false;
      if (state.enlargerSource === 'photogram') {
        resetPhotogramPaper();
      }
      renderEnlarger(1.0);
    });

    renderEnlarger(1.0);
  }

  /* ========================================================================
     10. SECTION IV: THE PHYSICS OF GREY — 3 INTERACTIVE MICRO-LABS
     ======================================================================== */

  function initSensitometryLabs() {
    // Lab 4.1: Weber-Fechner Perceptual vs Linear Luminance & Bit-Depth Quantization
    var gammaCanvas = document.getElementById('lab-gamma-canvas');
    var bitBtns = document.querySelectorAll('[data-bit-depth]');
    var gammaReadout = document.getElementById('lab-gamma-readout');

    function renderGammaLab() {
      if (!gammaCanvas) return;
      var w = gammaCanvas.width;
      var h = gammaCanvas.height;
      var ctx = gammaCanvas.getContext('2d');
      var imgData = ctx.createImageData(w, h);
      var data = imgData.data;
      var levels = state.labBitDepth;
      var midH = Math.floor(h * 0.5);

      for (var y = 0; y < h; y++) {
        var isTop = y < midH;
        var isDivider = Math.abs(y - midH) <= 1;
        for (var x = 0; x < w; x++) {
          var t = x / (w - 1);
          // Top: Perceptual sRGB / Gamma 2.2 encoding; Bottom: Linear physical energy
          var val = isTop ? t : Math.pow(t, 1 / 2.2);
          var q = Math.round(val * (levels - 1)) / (levels - 1);
          var byte = isDivider ? 128 : Math.round(q * 255);
          var idx = (y * w + x) * 4;
          data[idx] = byte;
          data[idx + 1] = byte;
          data[idx + 2] = byte;
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);

      // Overlay crisp labels
      ctx.font = '600 11px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('TOP: PERCEPTUAL GAMMA 2.2 (' + levels + ' STEPS)', 10, 20);
      ctx.fillStyle = '#000000';
      ctx.fillText('BOTTOM: LINEAR RADIANCE γ=1.0', 10, midH + 20);

      if (gammaReadout) {
        var bits = Math.round(Math.log2(levels));
        gammaReadout.textContent = bits + '-bit (' + levels + ' discrete grey steps)';
      }
    }

    bitBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.labBitDepth = parseInt(btn.getAttribute('data-bit-depth'), 10);
        bitBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        renderGammaLab();
      });
    });

    // Lab 4.2: 11-Zone Surface Micro-Texture Atlas
    var zoneCanvas = document.getElementById('lab-zone-canvas');
    var zoneSelect = document.getElementById('lab-zone-select');
    var zoneAtlasDetail = document.getElementById('zone-atlas-detail');

    function renderZoneAtlasLab() {
      if (!zoneCanvas || !zoneSelect) return;
      var z = ZONES[state.labZoneIndex];
      var w = zoneCanvas.width;
      var h = zoneCanvas.height;
      var ctx = zoneCanvas.getContext('2d');
      var imgData = ctx.createImageData(w, h);
      var data = imgData.data;

      var baseCenter = z.val / 255;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var nx = x / w;
          var ny = y / h;
          var tex = (fbm(nx * 18.0 + z.index * 2.1, ny * 18.0, 4) - 0.5) * 0.16;
          // Preserve Zone 0 pure black and Zone X pure white anchors
          var v = z.index === 0 ? 0 : (z.index === 10 ? 1 : clamp01(baseCenter + tex));
          var byte = Math.round(v * 255);
          var idx = (y * w + x) * 4;
          data[idx] = byte;
          data[idx + 1] = byte;
          data[idx + 2] = byte;
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);

      if (zoneAtlasDetail) {
        zoneAtlasDetail.innerHTML =
          '<div><strong>ZONE ' + z.roman + ' — ' + z.title + '</strong></div>' +
          '<div>Reflectance: ' + z.reflectance + ' · Density: ' + z.density + ' · Exposure: ' + z.ev + ' · Hex: ' + z.hex + '</div>' +
          '<div style="margin-top:0.35rem;color:var(--ink-secondary)">' + z.surface + '</div>';
      }
    }

    if (zoneSelect) {
      ZONES.forEach(function (z, idx) {
        var opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = 'Zone ' + z.roman + ' (' + z.ev + ' · ' + z.reflectance + ')';
        if (idx === state.labZoneIndex) opt.selected = true;
        zoneSelect.appendChild(opt);
      });

      zoneSelect.addEventListener('change', function () {
        state.labZoneIndex = parseInt(zoneSelect.value, 10);
        renderZoneAtlasLab();
      });
    }

    // Lab 4.3: 1-Bit Halftone & Error-Diffusion Microscope
    var halftoneCanvas = document.getElementById('lab-halftone-canvas');
    var halftoneBtns = document.querySelectorAll('[data-halftone-algo]');

    function renderHalftoneLab() {
      if (!halftoneCanvas) return;
      var w = halftoneCanvas.width;
      var h = halftoneCanvas.height;
      // Render at half-resolution and upscale 2x with nearest-neighbor to reveal 1-bit pixel structure!
      var sw = Math.floor(w / 2);
      var sh = Math.floor(h / 2);
      var sphereBuf = new Float32Array(sw * sh);

      for (var y = 0; y < sh; y++) {
        var ny = (y / sh - 0.5) * 2.0;
        for (var x = 0; x < sw; x++) {
          var nx = (x / sw - 0.5) * 2.0 * (sw / sh);
          var r2 = nx * nx + ny * ny;
          var idx = y * sw + x;
          if (r2 < 0.72) {
            var nz = Math.sqrt(0.72 - r2);
            var dot = clamp01((-nx * 0.55 - ny * 0.55 + nz * 0.65) / Math.sqrt(0.72));
            sphereBuf[idx] = 0.08 + Math.pow(dot, 1.35) * 0.9;
          } else {
            sphereBuf[idx] = 0.14 + (x / sw) * 0.45;
          }
        }
      }

      var offCanvas = document.createElement('canvas');
      offCanvas.width = sw;
      offCanvas.height = sh;
      renderProcessedBuffer(sphereBuf, offCanvas, {
        grade: 1.5,
        ev: 0,
        grain: 0,
        rasterMode: state.labHalftoneAlgo === 'threshold' ? 'continuous' : state.labHalftoneAlgo
      });

      if (state.labHalftoneAlgo === 'threshold') {
        var oCtx = offCanvas.getContext('2d');
        var oImg = oCtx.getImageData(0, 0, sw, sh);
        for (var i = 0; i < oImg.data.length; i += 4) {
          var b = oImg.data[i] >= 128 ? 255 : 0;
          oImg.data[i] = b;
          oImg.data[i + 1] = b;
          oImg.data[i + 2] = b;
        }
        oCtx.putImageData(oImg, 0, 0);
      }

      var ctx = halftoneCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(offCanvas, 0, 0, w, h);
    }

    halftoneBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.labHalftoneAlgo = btn.getAttribute('data-halftone-algo');
        halftoneBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        renderHalftoneLab();
      });
    });

    renderGammaLab();
    renderZoneAtlasLab();
    renderHalftoneLab();
  }

  /* ========================================================================
     11. SECTION V: CHRONOLOGY OF ACHROMATIC LIGHT
     ======================================================================== */

  function initChronology() {
    var list = document.getElementById('chronology-list');
    var btns = document.querySelectorAll('[data-chronology-filter]');
    if (!list) return;

    function renderChronology() {
      list.innerHTML = '';
      var items = CHRONOLOGY.filter(function (item) {
        return state.chronologyFilter === 'all' || item.category === state.chronologyFilter;
      });

      items.forEach(function (item) {
        var row = document.createElement('article');
        row.className = 'chronology-item';
        row.innerHTML =
          '<div class="chronology-year">' + item.year + '</div>' +
          '<div class="chronology-content">' +
            '<h3>' + item.title + '</h3>' +
            '<p>' + item.body + '</p>' +
          '</div>' +
          '<span class="chronology-tag">' + item.categoryLabel + '</span>';
        list.appendChild(row);
      });
    }

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.chronologyFilter = btn.getAttribute('data-chronology-filter');
        btns.forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        renderChronology();
      });
    });

    renderChronology();
  }

  /* ========================================================================
     12. GLOBAL HEADER, POLARITY THEME, SHORTCUTS & SCROLL TELEMETRY
     ======================================================================== */

  function initGlobalChrome() {
    var root = document.documentElement;
    var themeBtn = document.getElementById('theme-toggle-btn');
    var motionBtn = document.getElementById('motion-toggle-btn');
    var shortcutsBtn = document.getElementById('shortcuts-open-btn');
    var shortcutsBackdrop = document.getElementById('shortcuts-backdrop');
    var shortcutsCloseBtn = document.getElementById('shortcuts-close-btn');
    var mobileMenuBtn = document.getElementById('mobile-menu-btn');
    var primaryNav = document.getElementById('primary-nav');
    var scrollBar = document.getElementById('scroll-progress-bar');
    var scrollDensityEl = document.getElementById('header-density-val');

    function setTheme(theme) {
      state.theme = theme;
      root.setAttribute('data-theme', theme);
      if (themeBtn) {
        var isDark = theme === 'darkroom';
        themeBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        themeBtn.textContent = isDark ? 'Polarity: Darkroom' : 'Polarity: Paper';
      }
    }

    function toggleTheme() {
      setTheme(state.theme === 'paper' ? 'darkroom' : 'paper');
    }

    function toggleMotion() {
      state.motionPaused = !state.motionPaused;
      if (motionBtn) {
        motionBtn.setAttribute('aria-pressed', state.motionPaused ? 'true' : 'false');
        motionBtn.textContent = state.motionPaused ? 'Field: Static' : 'Field: Live';
      }
    }

    function openShortcuts(trigger) {
      lastFocusedBeforeModal = trigger || document.activeElement;
      shortcutsBackdrop.hidden = false;
      document.body.style.overflow = 'hidden';
      shortcutsCloseBtn.focus();
    }

    function closeShortcuts() {
      if (shortcutsBackdrop.hidden) return;
      shortcutsBackdrop.hidden = true;
      document.body.style.overflow = '';
      if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
        lastFocusedBeforeModal.focus();
      }
    }

    document.querySelectorAll('[data-trigger-click]').forEach(function (el) {
      el.addEventListener('click', function () {
        var target = document.getElementById(el.getAttribute('data-trigger-click'));
        if (target) target.click();
      });
    });

    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
    if (motionBtn) {
      if (state.reducedMotion) {
        state.motionPaused = true;
        motionBtn.setAttribute('aria-pressed', 'true');
        motionBtn.textContent = 'Field: Reduced';
      }
      motionBtn.addEventListener('click', toggleMotion);
    }

    if (shortcutsBtn && shortcutsBackdrop) {
      shortcutsBtn.addEventListener('click', function () {
        openShortcuts(shortcutsBtn);
      });
      shortcutsCloseBtn.addEventListener('click', closeShortcuts);
      shortcutsBackdrop.addEventListener('click', function (e) {
        if (e.target === shortcutsBackdrop) closeShortcuts();
      });
      shortcutsBackdrop.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeShortcuts();
        }
      });
    }

    if (mobileMenuBtn && primaryNav) {
      mobileMenuBtn.addEventListener('click', function () {
        var open = !primaryNav.classList.contains('is-open');
        primaryNav.classList.toggle('is-open', open);
        mobileMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      primaryNav.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          primaryNav.classList.remove('is-open');
          mobileMenuBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Scroll progress & active nav section tracking
    var sections = document.querySelectorAll('main section[id]');
    var navLinks = document.querySelectorAll('.primary-nav .nav-link');

    function onScroll() {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var progress = docH > 0 ? clamp01(window.scrollY / docH) : 0;
      if (scrollBar) {
        scrollBar.style.width = (progress * 100).toFixed(1) + '%';
      }
      if (scrollDensityEl) {
        scrollDensityEl.textContent = (progress * 3.2).toFixed(2) + ' logD';
      }

      var currentId = '';
      sections.forEach(function (sec) {
        var top = sec.getBoundingClientRect().top;
        if (top <= 140) {
          currentId = sec.id;
        }
      });

      navLinks.forEach(function (link) {
        var href = link.getAttribute('href');
        link.classList.toggle('is-active', href === '#' + currentId);
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Global Keyboard Shortcuts (ignoring inputs/textareas/selects)
    document.addEventListener('keydown', function (e) {
      var tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        if (shortcutsBackdrop.hidden) openShortcuts(document.activeElement);
        else closeShortcuts();
      } else if (e.key === 'i' || e.key === 'I') {
        toggleTheme();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMotion();
      } else if ((e.key === 'l' || e.key === 'L') && !document.getElementById('lightbox-backdrop').hidden) {
        document.getElementById('lightbox-loupe-btn').click();
      }
    });
  }

  /* ========================================================================
     13. BOOTSTRAP
     ======================================================================== */

  function boot() {
    initGlobalChrome();
    initHero();
    initGallery();
    initLightbox();
    initDarkroom();
    initSensitometryLabs();
    initChronology();

    window.addEventListener('resize', function () {
      var lb = document.getElementById('lightbox-backdrop');
      if (lb && !lb.hidden) {
        updateLoupeMagnifier();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
