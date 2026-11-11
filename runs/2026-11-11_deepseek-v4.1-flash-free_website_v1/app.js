(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;
  const ART = { x: 56, y: 56, w: 1088, h: 704 };
  const PAPER = '#f2f2f2';
  const INK = '#0a0a0a';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const FORMATIONS = {
    upland: { label: 'Upland', code: 'UPL' },
    basin: { label: 'Basin', code: 'BAS' },
    littoral: { label: 'Littoral', code: 'LIT' },
    erg: { label: 'Erg', code: 'ERG' }
  };

  const ADJECTIVES = [
    'Quiet', 'Still', 'Pale', 'Hollow', 'Salt', 'Slow', 'Far', 'Low',
    'Late', 'Marble', 'Silver', 'Open', 'Folded', 'Northern', 'Little',
    'Long', 'Soft', 'Interior', 'Unnamed', 'Last'
  ];
  const NOUNS = [
    'Reach', 'Meridian', 'Basin', 'Sound', 'Shelf', 'Fold', 'Interval',
    'Verge', 'Threshold', 'Inlet', 'Expanse', 'Rise', 'Plain', 'Hollow',
    'Passage', 'Approach', 'Field', 'Horizon'
  ];

  const OBSERVATIONS = {
    upland: [
      'A ridge that repeats itself three times before committing to a horizon.',
      'A path leaves the frame at both ends. No one remembers laying it.',
      'The upper ground holds the last of the light like a held breath.',
      'A valley so shallow it may only have been suggested.',
      'The surveyor stopped here, then continued without recording why.'
    ],
    basin: [
      'A salt basin approached from no direction in particular.',
      'The ground returns the sky in a whisper.',
      'A shallow depression, exact enough to hold one afternoon.',
      'The horizon has been drawn at a comfortable distance.',
      'A single column of shadow stands in for the weather.'
    ],
    littoral: [
      'The tide has withdrawn to a thin line of argument.',
      'A path of small stones leads out to where the land remembers water.',
      'The sea keeps a second horizon beneath the first.',
      'A coast that arrives only in the hour before waking.',
      'The headland withholds its opinion of the weather.'
    ],
    erg: [
      'Dunes arranged like the folds of a letter never sent.',
      'The wind has been reading the same page for years.',
      'A soft country, surveyed entirely by touch.',
      'The far dune is repeating what the near dune said.',
      'Sand has made a temporary arrangement with the horizon.'
    ]
  };

  const WEATHER_CLEAR = [
    'Visibility excellent; every edge has been left exactly where it fell.',
    'No wind recorded, though the grass leans in one direction.',
    'The air is very still. Sound arrives from further away than it should.',
    'The light is exact and unhelpful. Each ridge has been given a shadow.',
    'Cloudless. The distance insists on itself.'
  ];
  const WEATHER_VEILED = [
    'Visibility poor in the north; the land appears by inference.',
    'A low haze erases the middle distance. The far ridge is left to the imagination.',
    'Clouds hold at the horizon and refuse to advance.',
    'The air is soft enough to mistake for memory.',
    'The weather has taken possession of everything beyond the foreground.'
  ];

  const SPECIMENS = [
    {
      seed: 84217, formation: 'littoral', altitude: 9, visibility: 38,
      title: 'A Coast Remembered',
      note: 'A coast that arrives only in the hour before waking. The sea keeps a second horizon beneath the first.'
    },
    {
      seed: 31609, formation: 'basin', altitude: 46, visibility: 17,
      title: 'The Low Choir',
      note: 'A salt basin approached from no direction in particular. The ground returns the sky in a whisper.'
    },
    {
      seed: 70431, formation: 'upland', altitude: 27, visibility: 24,
      title: 'Vesper Ridge',
      note: 'The ridge repeats itself three times before committing to the horizon. Paths leave the frame at both ends.'
    },
    {
      seed: 52987, formation: 'erg', altitude: 58, visibility: 61,
      title: 'The White Erg',
      note: 'Dunes folded like a letter never sent. The wind has been reading it for years.'
    }
  ];

  let uidCounter = 0;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function random() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function randomSeed() {
    if (window.crypto && window.crypto.getRandomValues) {
      return window.crypto.getRandomValues(new Uint32Array(1))[0] % 999999;
    }
    return (Date.now() + Math.floor(Math.random() * 99999)) % 999999;
  }

  function pick(list, rng = Math.random) {
    return list[Math.floor(rng() * list.length)];
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function round(value) {
    return Math.round(value * 10) / 10;
  }

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function makeCoordinates(seed) {
    const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
    const latValue = 12 + rng() * 63;
    const lonValue = 5 + rng() * 165;
    const latRef = rng() > 0.28 ? 'N' : 'S';
    const lonRef = rng() > 0.5 ? 'W' : 'E';
    const latDeg = Math.floor(latValue);
    const lonDeg = Math.floor(lonValue);
    const latMin = Math.floor((latValue - latDeg) * 60);
    const lonMin = Math.floor((lonValue - lonDeg) * 60);
    const latSec = Math.floor((((latValue - latDeg) * 60) - latMin) * 60);
    const lonSec = Math.floor((((lonValue - lonDeg) * 60) - lonMin) * 60);
    return {
      lat: `${latRef} ${pad(latDeg)}° ${pad(latMin)}′ ${pad(latSec)}″`,
      lon: `${lonRef} ${pad(lonDeg)}° ${pad(lonMin)}′ ${pad(lonSec)}″`
    };
  }

  function makeTitle(rng) {
    const adjective = pick(ADJECTIVES, rng);
    const noun = pick(NOUNS, rng);
    return `The ${adjective} ${noun}`;
  }

  function makeWeather(seed, formation, visibility) {
    const rng = mulberry32((seed ^ hashString(formation) ^ 0x7f4a7c15 ^ (visibility > 50 ? 1 : 0)) >>> 0);
    return pick(visibility > 50 ? WEATHER_VEILED : WEATHER_CLEAR, rng);
  }

  function makeNote(rng, seed, formation, visibility) {
    const observation = pick(OBSERVATIONS[formation], rng);
    return { observation, note: `${observation} ${makeWeather(seed, formation, visibility)}` };
  }

  function makeSerial(seed) {
    return String((seed % 887) + 1).padStart(3, '0');
  }

  function makePlace(overrides = {}) {
    const seed = Number.isFinite(overrides.seed) ? overrides.seed : randomSeed();
    const rng = mulberry32((seed ^ hashString(overrides.formation || 'upland')) >>> 0);
    const formation = FORMATIONS[overrides.formation] ? overrides.formation : 'upland';
    const altitude = Number.isFinite(overrides.altitude) ? overrides.altitude : 18 + Math.round(rng() * 42);
    const visibility = Number.isFinite(overrides.visibility) ? overrides.visibility : 12 + Math.round(rng() * 54);
    const coordinates = makeCoordinates(seed);
    let title = overrides.title || makeTitle(rng);
    const composed = overrides.note ? { observation: '', note: overrides.note } : makeNote(rng, seed, formation, visibility);
    return {
      seed,
      formation,
      altitude,
      visibility,
      title,
      note: composed.note,
      observation: composed.observation,
      coordinates,
      serial: makeSerial(seed)
    };
  }

  function randomPlace() {
    const seed = randomSeed();
    const rng = mulberry32(seed >>> 0);
    const formationKeys = Object.keys(FORMATIONS);
    return makePlace({
      seed,
      formation: formationKeys[Math.floor(rng() * formationKeys.length)],
      altitude: 4 + Math.floor(rng() * 67),
      visibility: Math.floor(rng() * 101)
    });
  }

  // Geometry helpers -------------------------------------------------------

  function ridgePoints(rng, baseY, amplitude, steps = 150) {
    const frequencies = [0.55 + rng() * 0.9, 1.25 + rng() * 1.8, 2.8 + rng() * 2.6];
    const phases = [rng() * TAU, rng() * TAU, rng() * TAU];
    const peakCount = 2 + Math.floor(rng() * 3);
    const peaks = [];
    for (let i = 0; i < peakCount; i += 1) {
      peaks.push({
        center: 0.12 + rng() * 0.76,
        width: 0.035 + rng() * 0.09,
        height: amplitude * (0.08 + rng() * 0.52)
      });
    }
    const points = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = ART.x + t * ART.w;
      const wave =
        Math.sin(TAU * frequencies[0] * t + phases[0]) * 0.56 +
        Math.sin(TAU * frequencies[1] * t + phases[1]) * 0.27 +
        Math.sin(TAU * frequencies[2] * t + phases[2]) * 0.14;
      let peak = 0;
      for (const item of peaks) {
        const d = (t - item.center) / item.width;
        peak = Math.max(peak, item.height * Math.exp(-0.5 * d * d));
      }
      const edge = 0.94 + Math.sin(Math.PI * t) * 0.06;
      const y = baseY - amplitude * (0.36 + wave * 0.34) * edge - peak;
      points.push([x, y]);
    }
    return points;
  }

  function openPath(points, smooth = false) {
    if (!points.length) return '';
    const d = [];
    d.push(`M${round(points[0][0])} ${round(points[0][1])}`);
    if (!smooth) {
      for (let i = 1; i < points.length; i += 1) {
        d.push(`L${round(points[i][0])} ${round(points[i][1])}`);
      }
      return d.join(' ');
    }
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d.push(`C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2[0])} ${round(p2[1])}`);
    }
    return d.join(' ');
  }

  function closePath(points) {
    return `${openPath(points)} L${round(ART.x + ART.w)} ${round(ART.y + ART.h)} L${round(ART.x)} ${round(ART.y + ART.h)} Z`;
  }

  function line(x1, y1, x2, y2, attributes = '') {
    return `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" ${attributes}/>`;
  }

  function makeDefs(uid, horizon) {
    return `<defs>
      <linearGradient id="${uid}-sky" x1="0" y1="${ART.y}" x2="0" y2="${horizon}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#c9c9c9"/>
        <stop offset=".7" stop-color="#e3e3e3"/>
        <stop offset="1" stop-color="#eeeeee"/>
      </linearGradient>
      <linearGradient id="${uid}-ground" x1="0" y1="${horizon}" x2="0" y2="${ART.y + ART.h}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#e2e2e2"/>
        <stop offset="1" stop-color="#f6f6f6"/>
      </linearGradient>
      <linearGradient id="${uid}-water" x1="0" y1="${horizon}" x2="0" y2="${ART.y + ART.h}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#d9d9d9"/>
        <stop offset=".55" stop-color="#eeeeee"/>
        <stop offset="1" stop-color="#f5f5f5"/>
      </linearGradient>
      <linearGradient id="${uid}-haze" x1="0" y1="${horizon - 230}" x2="0" y2="${horizon + 200}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#f2f2f2" stop-opacity="0"/>
        <stop offset=".47" stop-color="#f2f2f2" stop-opacity=".86"/>
        <stop offset="1" stop-color="#f2f2f2" stop-opacity="0"/>
      </linearGradient>
      <pattern id="${uid}-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
        <line x1="0" y1="0" x2="0" y2="7" stroke="#111111" stroke-width=".55" opacity=".45"/>
      </pattern>
      <pattern id="${uid}-hatch-light" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(33)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="#f2f2f2" stroke-width=".55" opacity=".5"/>
      </pattern>
      <pattern id="${uid}-dots" width="6" height="6" patternUnits="userSpaceOnUse">
        <circle cx="1.4" cy="1.4" r=".65" fill="#111111" opacity=".45"/>
      </pattern>
      <pattern id="${uid}-dots-light" width="7" height="7" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r=".62" fill="#f2f2f2" opacity=".42"/>
      </pattern>
      <pattern id="${uid}-grain" width="4" height="4" patternUnits="userSpaceOnUse">
        <circle cx=".8" cy=".8" r=".35" fill="#111111" opacity=".18"/>
      </pattern>
      <pattern id="${uid}-ripple" width="96" height="28" patternUnits="userSpaceOnUse">
        <path d="M0 15 Q24 8 48 15 T96 15" fill="none" stroke="#111111" stroke-width=".6" opacity=".5"/>
      </pattern>
      <pattern id="${uid}-ripple-light" width="104" height="30" patternUnits="userSpaceOnUse">
        <path d="M0 16 Q26 9 52 16 T104 16" fill="none" stroke="#f2f2f2" stroke-width=".7" opacity=".45"/>
      </pattern>
      <clipPath id="${uid}-art"><rect x="${ART.x}" y="${ART.y}" width="${ART.w}" height="${ART.h}" rx="${ART.w * 0.011}"/></clipPath>
    </defs>`;
  }

  function drawSun(uid, rng, horizon, altitude, index) {
    const radius = 72 + rng() * 54;
    const cx = ART.x + ART.w * (0.26 + rng() * 0.48);
    const altNorm = Math.max(0, Math.min(1, (altitude - 4) / 66));
    const topLimit = ART.y + radius + 38;
    const travel = Math.max(20, horizon - topLimit);
    const cy = horizon - radius - altNorm * travel;
    const clipId = `${uid}-sun-${index}`;
    const stripes = [];
    for (let y = cy - radius + 2; y <= cy + radius; y += 7.4) {
      stripes.push(line(cx - radius - 8, y, cx + radius + 8, y, 'stroke="#ececec" stroke-width="2.15"'));
    }
    return `<g>
      <circle cx="${round(cx)}" cy="${round(cy)}" r="${round(radius + 68)}" fill="none" stroke="#111111" stroke-opacity=".11" stroke-dasharray="1 7"/>
      <circle cx="${round(cx)}" cy="${round(cy)}" r="${round(radius + 25)}" fill="none" stroke="#111111" stroke-opacity=".35" stroke-width=".8"/>
      <circle cx="${round(cx)}" cy="${round(cy)}" r="${round(radius)}" fill="#0b0b0b"/>
      <clipPath id="${clipId}"><circle cx="${round(cx)}" cy="${round(cy)}" r="${round(radius)}"/></clipPath>
      <g clip-path="url(#${clipId})">${stripes.join('')}</g>
      <circle cx="${round(cx)}" cy="${round(cy)}" r="${round(radius)}" fill="none" stroke="#0b0b0b" stroke-width="1"/>
    </g>`;
  }

  function drawClouds(rng, horizon) {
    let marks = '';
    const count = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < count; i += 1) {
      const y = ART.y + 95 + rng() * Math.max(40, horizon - ART.y - 180);
      const start = ART.x + 40 + rng() * 380;
      const length = 230 + rng() * 440;
      const lift = (rng() - 0.5) * 42;
      const midx = start + length * 0.45;
      marks += `<path d="M${round(start)} ${round(y)} C${round(start + length * 0.2)} ${round(y - 13)} ${round(midx)} ${round(y + lift * 0.45)} ${round(start + length * 0.63)} ${round(y - 4)} S${round(start + length * 0.92)} ${round(y - 12)} ${round(start + length)} ${round(y + 2)}" fill="none" stroke="#3d3d3d" stroke-width=".8" opacity="${round(0.22 + rng() * 0.18)}"/>`;
      if (i === 0) {
        marks += `<path d="M${round(start + 30)} ${round(y - 12)} H${round(start + length * 0.6)}" stroke="#3d3d3d" stroke-width=".6" stroke-dasharray="1 6" opacity=".3"/>`;
      }
    }
    return marks;
  }

  function drawRidges(rng, uid, points, options, layerIndex) {
    const path = closePath(points);
    const clipId = `${uid}-ridge-${layerIndex}`;
    const contourCount = options.contours === undefined ? 3 : options.contours;
    let inside = `<path d="${path}" fill="${options.fill}"/>`;
    for (let c = 1; c <= contourCount; c += 1) {
      const contourPoints = ridgePoints(
        rng,
        options.baseY + c * (20 + rng() * 16),
        options.amplitude * (0.7 - c * 0.09),
        110
      );
      inside += `<path d="${openPath(contourPoints)}" fill="none" stroke="${options.contour}" stroke-width="${options.contourWidth || 0.8}" opacity="${options.contourOpacity || 0.2}"/>`;
    }
    if (options.texture) {
      inside += `<rect x="${ART.x}" y="${ART.y}" width="${ART.w}" height="${ART.h}" fill="url(#${uid}-${options.texture})" opacity="${options.textureOpacity || 0.25}"/>`;
    }
    return `<clipPath id="${clipId}"><path d="${path}"/></clipPath>
      <g clip-path="url(#${clipId})">${inside}</g>
      <path d="${path}" fill="none" stroke="${options.edge}" stroke-width="${options.edgeWidth || 1}" opacity=".75"/>`;
  }

  function drawPines(points, rng, color, count = 9) {
    let trees = '';
    for (let i = 0; i < count; i += 1) {
      const t = 0.1 + (i + 0.3 + rng() * 0.4) * (0.8 / count);
      const point = points[Math.min(points.length - 1, Math.floor(t * points.length))];
      const height = 6 + rng() * 7;
      const x = point[0] + (rng() - 0.5) * 7;
      const y = point[1] + 1;
      trees += `<path d="M${round(x)} ${round(y)}v-${round(height)}M${round(x)} ${round(y - height * 0.3)}l-${round(height * 0.38)} ${round(height * 0.32)}M${round(x)} ${round(y - height * 0.3)}l${round(height * 0.38)} ${round(height * 0.32)}M${round(x)} ${round(y - height * 0.58)}l-${round(height * 0.26)} ${round(height * 0.24)}M${round(x)} ${round(y - height * 0.58)}l${round(height * 0.26)} ${round(height * 0.24)}" stroke="${color}" stroke-width=".85" fill="none" opacity=".8"/>`;
    }
    return trees;
  }

  function drawUpland(rng, uid, horizon, altitude, index) {
    let art = drawClouds(rng, horizon);
    art += drawSun(uid, rng, horizon, altitude, index);
    const layers = [
      { baseY: horizon + 36, amplitude: 238, fill: '#c7c7c7', edge: '#888888', contour: '#3b3b3b', texture: 'dots', textureOpacity: .22 },
      { baseY: horizon + 94, amplitude: 232, fill: '#ababab', edge: '#6c6c6c', contour: '#333333', texture: 'hatch', textureOpacity: .14 },
      { baseY: horizon + 177, amplitude: 226, fill: '#7f7f7f', edge: '#4b4b4b', contour: '#ededed', texture: 'dots-light', textureOpacity: .18 },
      { baseY: horizon + 289, amplitude: 210, fill: '#464646', edge: '#232323', contour: '#dddddd', texture: 'hatch-light', textureOpacity: .1 },
      { baseY: horizon + 425, amplitude: 165, fill: '#151515', edge: '#000000', contour: '#bdbdbd', texture: 'hatch-light', textureOpacity: .08 }
    ];
    layers.forEach((layer, i) => {
      const points = ridgePoints(rng, layer.baseY, layer.amplitude);
      art += drawRidges(rng, uid, points, layer, i);
      if (i === 1) art += drawPines(points, rng, '#161616', 11);
      if (i === 2) art += drawPines(points, rng, '#e7e7e7', 5);
    });
    art += `<path d="M${ART.x} ${round(horizon + 28)}H${ART.x + ART.w}" stroke="#111111" stroke-width=".8" opacity=".28" stroke-dasharray="2 6"/>`;
    return art;
  }

  function drawBasin(rng, uid, horizon, altitude, index) {
    const centerX = ART.x + ART.w * (0.48 + rng() * 0.12);
    let art = drawClouds(rng, horizon);
    art += drawSun(uid, rng, horizon, altitude, index);
    const mesaBack = ridgePoints(rng, horizon + 8, 54, 95);
    const mesaFront = ridgePoints(rng, horizon + 26, 31, 80);
    art += `<path d="${closePathAt(mesaBack, horizon + 10)}" fill="#b5b5b5" stroke="#777777" stroke-width=".8"/>`;
    art += `<path d="${closePathAt(mesaFront, horizon + 32)}" fill="#8e8e8e" stroke="#555555" stroke-width=".8"/>`;
    art += `<rect x="${ART.x}" y="${round(horizon + 30)}" width="${ART.w}" height="${round(ART.h - 30)}" fill="url(#${uid}-ground)"/>`;
    art += line(ART.x, horizon + 31, ART.x + ART.w, horizon + 31, 'stroke="#292929" stroke-width=".8" opacity=".7"');
    const ringY = ART.y + ART.h * 0.84;
    for (let i = 13; i >= 0; i -= 1) {
      const rx = 34 + i * 52;
      const ry = rx * 0.2;
      const dashed = i % 4 === 1 ? ' stroke-dasharray="2 5"' : '';
      art += `<ellipse cx="${round(centerX)}" cy="${round(ringY)}" rx="${round(rx)}" ry="${round(ry)}" fill="none" stroke="#282828" stroke-width=".75" opacity="${round(0.26 - i * 0.007)}"${dashed}/>`;
    }
    for (let i = 0; i < 17; i += 1) {
      const angle = rng() * TAU;
      const length = 55 + rng() * 260;
      let x = centerX + Math.cos(angle) * 20;
      let y = ringY + Math.sin(angle) * 7;
      let d = `M${round(x)} ${round(y)}`;
      const mx = x + Math.cos(angle) * length * 0.45 + (rng() - 0.5) * 34;
      const my = y + Math.sin(angle) * length * 0.2 + (rng() - 0.5) * 14;
      x += Math.cos(angle) * length;
      y += Math.sin(angle) * length * 0.2;
      d += ` Q${round(mx)} ${round(my)} ${round(x)} ${round(y)}`;
      art += `<path d="${d}" fill="none" stroke="#222222" stroke-width="${round(0.5 + rng() * 0.5)}" opacity=".24"/>`;
    }
    const puddle = `<path d="M${round(centerX - 48)} ${round(ringY + 2)} C${round(centerX - 40)} ${round(ringY - 13)} ${round(centerX + 28)} ${round(ringY - 16)} ${round(centerX + 49)} ${round(ringY + 3)} C${round(centerX + 35)} ${round(ringY + 17)} ${round(centerX - 35)} ${round(ringY + 18)} ${round(centerX - 48)} ${round(ringY + 2)}Z" fill="#222222"/>`;
    art += puddle;
    art += `<path d="M${round(centerX - 22)} ${round(ringY + 1)}h44" stroke="#e8e8e8" stroke-width="1" opacity=".6"/>`;
    const markerX = centerX + 115;
    const markerY = ringY - 94;
    art += `<g stroke="#111111" fill="none" stroke-width="1.1">
      <path d="M${round(markerX)} ${round(markerY)}v-26M${round(markerX - 9)} ${round(markerY - 25)}l9-13 9 13"/>
      <path d="M${round(markerX - 14)} ${round(markerY - 6)}h28"/>
      <path d="M${round(markerX + 4)} ${round(markerY + 8)}l32 19" opacity=".3"/>
    </g>`;
    art += `<path d="M${ART.x} ${round(ART.y + ART.h - 34)} C${round(ART.x + 210)} ${round(ART.y + ART.h - 50)} ${round(ART.x + 620)} ${round(ART.y + ART.h - 28)} ${round(ART.x + ART.w)} ${round(ART.y + ART.h - 53)}V${ART.y + ART.h}H${ART.x}Z" fill="#121212" opacity=".9"/>`;
    art += `<path d="M${ART.x + 24} ${round(ART.y + ART.h - 43)} C${round(ART.x + 260)} ${round(ART.y + ART.h - 60)} ${round(ART.x + 680)} ${round(ART.y + ART.h - 39)} ${round(ART.x + ART.w - 20)} ${round(ART.y + ART.h - 62)}" fill="none" stroke="#bdbdbd" stroke-width=".8" opacity=".4"/>`;
    return art;
  }

  function closePathAt(points, bottomY) {
    return `${openPath(points)} L${round(points[points.length - 1][0])} ${round(bottomY)} L${round(points[0][0])} ${round(bottomY)} Z`;
  }

  function drawLittoral(rng, uid, horizon, altitude, index) {
    let art = drawClouds(rng, horizon);
    art += drawSun(uid, rng, horizon, altitude, index);
    const island = ridgePoints(rng, horizon + 3, 30, 70);
    const island2 = ridgePoints(rng, horizon + 5, 16, 65);
    art += `<path d="${closePathAt(island, horizon + 5)}" fill="#a6a6a6" opacity=".7"/>`;
    art += `<path d="${closePathAt(island2, horizon + 7)}" fill="#757575" opacity=".7"/>`;
    art += `<rect x="${ART.x}" y="${round(horizon + 5)}" width="${ART.w}" height="${round(ART.h - 5)}" fill="url(#${uid}-water)"/>`;
    art += line(ART.x, horizon + 5, ART.x + ART.w, horizon + 5, 'stroke="#111111" stroke-width=".9" opacity=".55"');

    const reflectionX = ART.x + ART.w * (0.34 + rng() * 0.35);
    for (let i = 0; i < 20; i += 1) {
      const y = horizon + 14 + Math.pow(i / 19, 1.7) * 270;
      const width = 7 + rng() * (16 + i * 3.2);
      art += `<path d="M${round(reflectionX - width / 2)} ${round(y)}h${round(width)}" stroke="#171717" stroke-width="${round(0.6 + rng() * 0.7)}" opacity="${round(0.28 - i * 0.007)}" stroke-linecap="round"/>`;
    }

    for (let i = 0; i < 32; i += 1) {
      const y = horizon + 12 + Math.pow(i / 31, 1.75) * (ART.h - 28);
      const x = ART.x + rng() * ART.w * 0.8;
      const length = 20 + rng() * (60 + (y - horizon) * 0.72);
      const bend = 2 + rng() * 6;
      art += `<path d="M${round(x)} ${round(y)}q${round(length * 0.4)} ${round(-bend)} ${round(length)} 0" fill="none" stroke="#222222" stroke-width="${round(0.5 + rng() * 0.55)}" opacity="${round(0.12 + rng() * 0.18)}"/>`;
    }

    const boatX = ART.x + ART.w * (0.22 + rng() * 0.5);
    art += `<g fill="#111111" stroke="#111111" stroke-width=".8">
      <path d="M${round(boatX)} ${round(horizon + 4)}l${round(4.5)}-${round(18)}l${round(6.5)} ${round(18)}Z" stroke="none"/>
      <path d="M${round(boatX + 4.5)} ${round(horizon - 14)}v${round(19)}" fill="none"/>
      <path d="M${round(boatX - 8)} ${round(horizon + 4)}h${round(22)}" fill="none" opacity=".4"/>
    </g>`;

    const fromLeft = rng() > 0.45;
    const top = horizon - 30 - rng() * 100;
    const peak = ART.x + ART.w * (0.16 + rng() * 0.13);
    const foot = ART.x + ART.w * (0.28 + rng() * 0.13);
    const mirrorX = (x) => (ART.x * 2 + ART.w) - x;
    let cliffPath;
    if (fromLeft) {
      cliffPath = `M${ART.x} ${ART.y + ART.h} L${ART.x} ${round(top)} C${round(peak - 100)} ${round(top - 25)} ${round(peak + 60)} ${round(top + 30)} ${round(peak + 80)} ${round(top + 104)} C${round(peak + 86)} ${round(top + 176)} ${round(foot + 40)} ${round(ART.y + ART.h - 100)} ${round(foot + 90)} ${ART.y + ART.h}Z`;
    } else {
      const right = ART.x + ART.w;
      cliffPath = `M${right} ${ART.y + ART.h} L${right} ${round(top)} C${round(mirrorX(peak - 100))} ${round(top - 25)} ${round(mirrorX(peak + 60))} ${round(top + 30)} ${round(mirrorX(peak + 80))} ${round(top + 104)} C${round(mirrorX(peak + 86))} ${round(top + 176)} ${round(mirrorX(foot + 40))} ${round(ART.y + ART.h - 100)} ${round(mirrorX(foot + 90))} ${ART.y + ART.h}Z`;
    }
    const cliffClip = `${uid}-cliff-${index}`;
    art += `<clipPath id="${cliffClip}"><path d="${cliffPath}"/></clipPath>`;
    art += `<path d="${cliffPath}" fill="#141414"/>`;
    for (let i = 0; i < 6; i += 1) {
      const offset = 24 + i * 21;
      art += `<g clip-path="url(#${cliffClip})"><path d="M${ART.x + 10} ${round(top + offset + 100)} C${round(peak)} ${round(top + offset + 60)} ${round(foot)} ${round(top + offset + 120)} ${round(ART.x + ART.w)} ${round(top + offset + 20)}" fill="none" stroke="#d2d2d2" stroke-width=".7" opacity=".16"/></g>`;
    }
    art += `<path d="${cliffPath}" fill="none" stroke="#555555" stroke-width=".8" opacity=".55"/>`;
    const tuftX = fromLeft ? peak + 40 : mirrorX(peak + 40);
    for (let i = 0; i < 7; i += 1) {
      const gx = tuftX + (rng() - 0.5) * 150;
      const gy = top + 70 + rng() * 60;
      art += `<path d="M${round(gx)} ${round(gy)}q${round((rng() - 0.5) * 8)} -${round(7 + rng() * 11)} ${round((rng() - 0.5) * 14)} -${round(15 + rng() * 10)}" fill="none" stroke="#ececec" stroke-width=".8" opacity=".38"/>`;
    }
    art += `<path d="M${ART.x + 34} ${round(ART.y + ART.h - 30)}h120" stroke="#4a4a4a" stroke-width=".8" opacity=".5" stroke-dasharray="1 5"/>`;
    return art;
  }

  function dunePoints(rng, baseY, amplitude, steps) {
    const phase = rng() * TAU;
    const phase2 = rng() * TAU;
    const points = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const crest = 0.23 + 0.34 * Math.sin(TAU * t * 0.72 + phase) + 0.18 * Math.sin(TAU * t * 1.65 + phase2);
      const fold = amplitude * 0.17 * Math.exp(-0.5 * Math.pow((t - 0.68) / 0.13, 2));
      const y = baseY - amplitude * Math.max(0.06, crest) - fold;
      points.push([ART.x + t * ART.w, Math.min(y, ART.y + ART.h - 2)]);
    }
    return points;
  }

  function drawErg(rng, uid, horizon, altitude, index) {
    let art = drawClouds(rng, horizon);
    art += drawSun(uid, rng, horizon, altitude, index);
    const fills = ['#d0d0d0', '#b4b4b4', '#898989', '#545454', '#171717'];
    const edges = ['#9c9c9c', '#858585', '#5b5b5b', '#2d2d2d', '#000000'];
    const contours = ['#333333', '#292929', '#e9e9e9', '#d7d7d7', '#c7c7c7'];
    let frontPoints = [];
    for (let i = 0; i < 5; i += 1) {
      const baseY = horizon + 66 + i * 92;
      const amplitude = 118 + i * 24 + rng() * 26;
      const points = dunePoints(rng, baseY, amplitude, 9);
      const path = closePathSmooth(points);
      const clipId = `${uid}-dune-${i}`;
      art += `<clipPath id="${clipId}"><path d="${path}"/></clipPath>`;
      art += `<path d="${path}" fill="${fills[i]}"/>`;
      art += `<g clip-path="url(#${clipId})"><rect x="${ART.x}" y="${ART.y}" width="${ART.w}" height="${ART.h}" fill="url(#${uid}-${i >= 3 ? 'ripple-light' : 'ripple'})" opacity="${i >= 3 ? .22 : .15}"/></g>`;
      art += `<path d="${smoothPath(points)}" fill="none" stroke="${edges[i]}" stroke-width="${i === 4 ? 1.4 : 1}" opacity=".85"/>`;
      const offset = points.map((p, idx) => [p[0], p[1] + 12 + ((idx * 7) % 23)]).slice(0, points.length - 1);
      art += `<path d="${openPath(offset, true)}" fill="none" stroke="${contours[i]}" stroke-width=".75" opacity="${i === 4 ? .22 : .2}" clip-path="url(#${clipId})"/>`;
      if (i === 3) frontPoints = points;
    }
    if (frontPoints.length) {
      for (let i = 0; i < 8; i += 1) {
        const point = frontPoints[Math.min(frontPoints.length - 1, 2 + Math.floor(rng() * (frontPoints.length - 4)))];
        const x = point[0];
        const y = point[1] + 12;
        art += `<path d="M${round(x)} ${round(y)}q-${round(2 + rng() * 4)} -${round(6 + rng() * 9)} -${round(4 + rng() * 8)} -${round(12 + rng() * 11)}M${round(x)} ${round(y)}q${round(2 + rng() * 5)} -${round(4 + rng() * 8)} ${round(7 + rng() * 8)} -${round(12 + rng() * 8)}" fill="none" stroke="#d8d8d8" stroke-width=".75" opacity=".35"/>`;
      }
    }
    art += `<path d="M${ART.x + 24} ${ART.y + ART.h - 24}h148" stroke="#6a6a6a" stroke-width=".8" opacity=".42" stroke-dasharray="1 5"/>`;
    return art;
  }

  function closePathSmooth(points) {
    return `${smoothPath(points)} L${round(points[points.length - 1][0])} ${ART.y + ART.h} L${round(points[0][0])} ${ART.y + ART.h} Z`;
  }

  function smoothPath(points) {
    return openPath(points, true);
  }

  function makePlateSvg(place, options = {}) {
    uidCounter += 1;
    const uid = `plate-${uidCounter}`;
    const seeded = (place.seed ^ hashString(place.formation)) >>> 0;
    const rng = mulberry32(seeded);
    const altitude = Number(place.altitude);
    const visibility = Number(place.visibility);
    const horizonBase = { upland: 446, basin: 352, littoral: 410, erg: 334 }[place.formation];
    const horizon = ART.y + horizonBase + Math.round(rng() * 34);
    const index = uidCounter;
    const defs = makeDefs(uid, horizon);
    let art = '';
    if (place.formation === 'upland') art = drawUpland(rng, uid, horizon, altitude, index);
    if (place.formation === 'basin') art = drawBasin(rng, uid, horizon, altitude, index);
    if (place.formation === 'littoral') art = drawLittoral(rng, uid, horizon, altitude, index);
    if (place.formation === 'erg') art = drawErg(rng, uid, horizon, altitude, index);

    const fogOpacity = Math.min(0.72, Math.max(0, (visibility - 8) / 100) * 0.8);
    if (fogOpacity > 0.01) {
      art += `<rect x="${ART.x}" y="${ART.y}" width="${ART.w}" height="${ART.h}" fill="url(#${uid}-haze)" opacity="${round(fogOpacity)}"/>`;
    }
    art += `<rect x="${ART.x}" y="${ART.y}" width="${ART.w}" height="${ART.h}" fill="url(#${uid}-grain)" opacity=".28"/>`;

    const title = escapeXml(place.title);
    const subtitle = `${escapeXml(place.coordinates.lat)} · ${escapeXml(place.coordinates.lon)}`;
    const form = FORMATIONS[place.formation];
    const ariaTitle = options.decorative ? '' : `<title id="${uid}-title">${title}, a generated ${form.label.toLowerCase()} survey plate</title><desc id="${uid}-desc">${escapeXml(place.note)}</desc>`;
    const ariaRole = options.decorative ? 'aria-hidden="true" focusable="false"' : `role="img" aria-labelledby="${uid}-title ${uid}-desc"`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" ${ariaRole} data-plate="${escapeXml(place.serial)}">
      ${ariaTitle}
      ${defs}
      <rect width="1200" height="900" fill="${PAPER}"/>
      <rect x="24" y="24" width="1152" height="852" fill="none" stroke="#111111" stroke-width="1"/>
      <g clip-path="url(#${uid}-art)">
        <rect x="${ART.x}" y="${ART.y}" width="${ART.w}" height="${ART.h}" fill="url(#${uid}-sky)"/>
        <rect x="${ART.x}" y="${ART.y}" width="${ART.w}" height="${ART.h}" fill="url(#${uid}-hatch)" opacity=".3"/>
        ${art}
        <g fill="#1b1b1b" font-family="ui-monospace, 'Cascadia Code', 'Courier New', monospace" font-size="8" letter-spacing="1.8" opacity=".85">
          <text x="78" y="84">BUREAU OF UNSEEN PLACES / SURVEY ${place.serial}</text>
          <text x="1122" y="84" text-anchor="end">${form.code} · ALT ${altitude}° · VEIL ${visibility}%</text>
        </g>
        <rect x="${ART.x + .5}" y="${ART.y + .5}" width="${ART.w - 1}" height="${ART.h - 1}" fill="none" stroke="#111111" stroke-width=".7" opacity=".18"/>
      </g>
      <g fill="none" stroke="#111111" stroke-width=".8">
        <path d="M17 30h13M30 17v13M1170 30h13M1183 17v13M17 870h13M30 883v13M1170 870h13M1183 883v13"/>
      </g>
      <g fill="#111111" font-family="ui-monospace, 'Cascadia Code', 'Courier New', monospace">
        <text x="56" y="795" font-size="9.5" letter-spacing="1.6">PLATE ${place.serial} · ${form.code}</text>
        <text x="1144" y="795" font-size="9.5" letter-spacing="1.2" text-anchor="end">${subtitle}</text>
        <text x="1144" y="817" font-size="9" letter-spacing="1.1" opacity=".6" text-anchor="end">${form.label.toUpperCase()} · ALT ${altitude}° · VEIL ${visibility}%</text>
        <text x="1144" y="849" font-size="7.5" letter-spacing="1.2" opacity=".45" text-anchor="end">FICTITIOUS · DO NOT NAVIGATE</text>
      </g>
      <text x="56" y="838" font-family="Georgia, 'Times New Roman', serif" font-size="35" fill="#111111">${title}</text>
    </svg>`;
  }

  // Page experience -------------------------------------------------------

  const heroPlace = makePlace({
    seed: 49821,
    formation: 'upland',
    altitude: 23,
    visibility: 19,
    title: 'The Still Meridian',
    note: 'A ridge held in the last of the afternoon. Visibility good; the far ground appears only when looked at directly.'
  });
  const archivePlaces = SPECIMENS.map((specimen) => makePlace(specimen));

  const heroPlate = $('#hero-plate');
  const heroCaption = $('#hero-caption');
  const mainPlate = $('#main-plate');
  const surveyForm = $('#survey-controls');
  const formationInputs = $$('input[name="formation"]');
  const altitudeInput = $('#altitude');
  const visibilityInput = $('#visibility');
  const altitudeOutput = $('#altitude-output');
  const visibilityOutput = $('#visibility-output');
  const altitudeMeta = $('#altitude-meta');
  const visibilityMeta = $('#visibility-meta');
  const placeTitle = $('#place-title');
  const placeCoordinates = $('#place-coordinates');
  const placeNote = $('#place-note');
  const serialOutput = $('#serial-output');
  const formationOutput = $('#formation-output');
  const plateStatus = $('#plate-status');
  const archiveGrid = $('#archive-grid');
  const dialog = $('#plate-dialog');
  const dialogArt = $('#dialog-art');
  const clock = $('#bureau-clock');

  let currentPlace = makePlace({ formation: 'upland', altitude: 24, visibility: 20 });
  let activeArchiveIndex = 0;
  let renderFrame = 0;
  let revealObserver = null;

  function formationOf(place) {
    return FORMATIONS[place.formation] || FORMATIONS.upland;
  }

  function indefinite(label) {
    return /^[aeiou]/i.test(label) ? 'an' : 'a';
  }

  function updateRangeProgress(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const value = Number(input.value);
    const percent = ((value - min) / (max - min)) * 100;
    input.style.setProperty('--progress', `${percent}%`);
  }

  function syncOutputs() {
    altitudeOutput.textContent = `${altitudeInput.value}°`;
    visibilityOutput.textContent = `${visibilityInput.value}%`;
    altitudeMeta.textContent = `${altitudeInput.value}°`;
    visibilityMeta.textContent = `${visibilityInput.value}%`;
    updateRangeProgress(altitudeInput);
    updateRangeProgress(visibilityInput);
  }

  function syncForm(place) {
    formationInputs.forEach((input) => {
      input.checked = input.value === place.formation;
    });
    altitudeInput.value = place.altitude;
    visibilityInput.value = place.visibility;
    syncOutputs();
  }

  function setDeveloping(animate) {
    mainPlate.classList.remove('is-developing');
    if (!animate || reduceMotion.matches) return;
    void mainPlate.offsetWidth;
    mainPlate.classList.add('is-developing');
  }

  function renderPlace(place, { animate = false, announce = false } = {}) {
    currentPlace = place;
    mainPlate.innerHTML = makePlateSvg(place);
    setDeveloping(animate);
    const form = formationOf(place);
    serialOutput.textContent = `Plate ${place.serial}`;
    formationOutput.textContent = form.label;
    placeTitle.textContent = place.title;
    placeCoordinates.textContent = `${place.coordinates.lat} · ${place.coordinates.lon}`;
    placeNote.textContent = place.note;
    syncOutputs();
    if (announce) {
      plateStatus.textContent = `Now viewing ${place.title}, ${indefinite(form.label)} ${form.label.toLowerCase()} formation. Sun altitude ${place.altitude} degrees. Visibility ${place.visibility} percent.`;
    }
  }

  function renderArchive() {
    archiveGrid.innerHTML = archivePlaces.map((place, index) => {
      const form = formationOf(place);
      return `<article class="archive-card reveal">
        <div class="archive-card__art"><div class="plate">${makePlateSvg(place, { decorative: true })}</div></div>
        <div class="archive-card__info">
          <p class="archive-card__meta"><span>Plate ${escapeXml(place.serial)}</span><span>${form.label}</span></p>
          <h3>${escapeXml(place.title)}</h3>
          <button class="card-link" type="button" data-open="${index}" aria-haspopup="dialog" aria-controls="plate-dialog" aria-label="Inspect plate: ${escapeXml(place.title)}">Inspect plate <span aria-hidden="true">↗</span></button>
          <p class="archive-card__coords">${escapeXml(place.coordinates.lat)} · ${escapeXml(place.coordinates.lon)}</p>
        </div>
      </article>`;
    }).join('');
    $$('.archive-card').forEach((card, index) => {
      card.style.transitionDelay = `${Math.min(index, 3) * 70}ms`;
    });
    observeReveals();
  }

  function openDialog(index) {
    activeArchiveIndex = index;
    const place = archivePlaces[index];
    const form = formationOf(place);
    $('#dialog-serial').textContent = `Plate ${place.serial} · ${form.label}`;
    $('#dialog-title').textContent = place.title;
    $('#dialog-coordinates').textContent = `${place.coordinates.lat} / ${place.coordinates.lon}`;
    $('#dialog-note').textContent = place.note;
    $('#dialog-formation').textContent = form.label;
    $('#dialog-altitude').textContent = `${place.altitude}°`;
    $('#dialog-visibility').textContent = `${place.visibility}%`;
    dialogArt.innerHTML = `<div class="plate">${makePlateSvg(place)}</div>`;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      dialog.scrollTop = 0;
      document.body.classList.add('is-dialog-open');
    }
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
    document.body.classList.remove('is-dialog-open');
  }

  function slugify(value) {
    return value.toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unseen-place';
  }

  function downloadSvg(place) {
    const markup = `<?xml version="1.0" encoding="UTF-8"?>\n${makePlateSvg(place)}`;
    const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slugify(place.title)}-plate-${place.serial}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Give slower browsers time to finish writing before releasing the blob.
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    plateStatus.textContent = `Downloaded ${place.title} as an SVG file.`;
  }

  function announceCurrent(message) {
    plateStatus.textContent = '';
    window.setTimeout(() => {
      plateStatus.textContent = message;
    }, 80);
  }

  function scheduleVisualUpdate() {
    if (renderFrame) cancelAnimationFrame(renderFrame);
    renderFrame = requestAnimationFrame(() => {
      currentPlace.altitude = Number(altitudeInput.value);
      currentPlace.visibility = Number(visibilityInput.value);
      syncOutputs();
      mainPlate.innerHTML = makePlateSvg(currentPlace);
      renderFrame = 0;
    });
  }

  function applyExternalPlace(place) {
    // Keep the archive specimen intact while its settings are explored.
    currentPlace = { ...place, coordinates: { ...place.coordinates } };
    syncForm(currentPlace);
    renderPlace(currentPlace, { animate: true, announce: true });
  }

  function refreshWeatherNote(place) {
    if (!place.observation) return;
    place.note = `${place.observation} ${makeWeather(place.seed, place.formation, place.visibility)}`;
  }

  // Initial art ------------------------------------------------------------
  heroPlate.innerHTML = makePlateSvg(heroPlace);
  heroCaption.textContent = `${heroPlace.title} · ${formationOf(heroPlace).label}`;
  renderArchive();
  syncForm(currentPlace);
  renderPlace(currentPlace, { animate: true });

  // Controls ---------------------------------------------------------------
  surveyForm.addEventListener('submit', (event) => event.preventDefault());

  formationInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      const next = makePlace({
        seed: currentPlace.seed,
        formation: input.value,
        altitude: Number(altitudeInput.value),
        visibility: Number(visibilityInput.value),
        title: currentPlace.title
      });
      renderPlace(next, { animate: true });
      const form = formationOf(next);
      announceCurrent(`Now viewing ${next.title}, ${indefinite(form.label)} ${form.label.toLowerCase()} formation.`);
    });
  });

  [altitudeInput, visibilityInput].forEach((input) => {
    input.addEventListener('input', scheduleVisualUpdate);
    input.addEventListener('change', () => {
      syncOutputs();
      if (input === visibilityInput) {
        currentPlace.visibility = Number(visibilityInput.value);
        refreshWeatherNote(currentPlace);
        placeNote.textContent = currentPlace.note;
      }
      announceCurrent(`Sun altitude ${altitudeInput.value} degrees. Visibility ${visibilityInput.value} percent.`);
    });
  });

  $('#new-place').addEventListener('click', () => {
    const next = randomPlace();
    syncForm(next);
    renderPlace(next, { animate: true, announce: true });
  });

  $('#download-plate').addEventListener('click', () => {
    downloadSvg(currentPlace);
  });

  archiveGrid.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open]');
    if (!trigger) return;
    openDialog(Number(trigger.dataset.open));
  });

  $('#dialog-close').addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('is-dialog-open');
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialog();
  });

  $('#dialog-download').addEventListener('click', () => {
    downloadSvg(archivePlaces[activeArchiveIndex]);
  });

  $('#dialog-load').addEventListener('click', () => {
    const place = archivePlaces[activeArchiveIndex];
    closeDialog();
    applyExternalPlace(place);
    const instrument = $('#instrument');
    // Wait for the dialog's native focus restoration before moving the page.
    window.setTimeout(() => {
      instrument.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      placeTitle.setAttribute('tabindex', '-1');
      window.setTimeout(() => {
        placeTitle.focus({ preventScroll: true });
      }, reduceMotion.matches ? 0 : 720);
    }, 80);
  });

  // Clock ------------------------------------------------------------------
  function updateClock() {
    const now = new Date();
    try {
      clock.textContent = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);
    } catch (error) {
      clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }
    clock.dateTime = now.toISOString();
  }
  updateClock();
  window.setInterval(updateClock, 30000);

  // Reveal on scroll -------------------------------------------------------
  function observeReveals() {
    const items = $$('.reveal:not(.is-visible)');
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    items.forEach((item) => revealObserver.observe(item));
  }
  observeReveals();

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', () => {
      if (motionQuery.matches) {
        $$('.reveal').forEach((item) => item.classList.add('is-visible'));
      }
    });
  }
})();
