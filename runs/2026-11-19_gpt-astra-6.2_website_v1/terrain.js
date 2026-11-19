/* A deterministic height field with native GPU and software mesh renderers. */
(() => {
  'use strict';

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, n) => {
    const t = clamp((n - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const presets = [
    { id: 'alpine', name: 'Alpine Ridge', seed: 42817, elevation: 78, roughness: 56, frequency: 140, yaw: -.37, pitch: .31, description: 'A fractured ridgeline of sharp summits and deep valleys.' },
    { id: 'dunes', name: 'Dune Sea', seed: 71943, elevation: 61, roughness: 22, frequency: 152, yaw: -.42, pitch: .45, description: 'Long, wind-folded crests drift across a quiet sand field.' },
    { id: 'caldera', name: 'Caldera', seed: 18604, elevation: 83, roughness: 48, frequency: 110, yaw: -.53, pitch: .72, description: 'An uplifted volcanic rim surrounds a sunken central basin.' },
    { id: 'hills', name: 'Rolling Hills', seed: 90361, elevation: 64, roughness: 30, frequency: 120, yaw: -.42, pitch: .42, description: 'Rounded highlands overlap in a soft, undulating landscape.' }
  ];
  const palette = Array.from({ length: 256 }, (_, n) => `rgb(${n},${n},${n})`);
  const gray = (n) => palette[clamp(Math.round(n), 0, 255)];

  function hash(x, z, seed) {
    let h = Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(seed, 1274126177) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  function noise(x, z, seed) {
    const ix = Math.floor(x), iz = Math.floor(z);
    let fx = x - ix, fz = z - iz;
    fx = fx * fx * (3 - 2 * fx);
    fz = fz * fz * (3 - 2 * fz);
    return mix(mix(hash(ix, iz, seed), hash(ix + 1, iz, seed), fx),
      mix(hash(ix, iz + 1, seed), hash(ix + 1, iz + 1, seed), fx), fz);
  }

  function fbm(x, z, seed) {
    return noise(x, z, seed) * .54 + noise(x * 2.08 + 7, z * 2.08, seed + 1) * .27
      + noise(x * 4.2, z * 4.2 + 3, seed + 2) * .13 + noise(x * 8.5, z * 8.5, seed + 3) * .06;
  }

  function heightFunction(config) {
    const { id, seed } = config;
    const amplitude = config.elevation / 78;
    const rough = config.roughness / 100;
    const freq = config.frequency / 140;
    const phase = hash(1, 1, seed) * Math.PI * 2;
    const shiftX = (hash(2, 1, seed) - .5) * .22;
    const shiftZ = (hash(1, 2, seed) - .5) * .2;
    // A branching watershed skeleton makes connected aretes instead of isolated cones.
    const ridgePaths = [
      [[-1.51,.10,.03],[-1.18,-.04,.32],[-.91,-.25,.64],[-.72,-.12,.45],[-.48,-.28,.86],[-.25,-.19,.61],[.01,-.18,.82],[.28,-.32,1.12],[.41,-.22,.83],[.67,-.28,.75],[.91,-.13,.48],[1.18,-.18,.38],[1.49,-.02,.04]],
      [[-.91,-.25,.64],[-1.06,.16,.42],[-1.22,.35,.34],[-1.39,.64,.07]],
      [[-.48,-.28,.86],[-.57,.01,.65],[-.73,.18,.49],[-.68,.34,.46],[-.90,.64,.19],[-.95,.85,.02]],
      [[.28,-.32,1.12],[.17,-.09,.88],[-.02,.03,.73],[-.15,.25,.58],[-.10,.45,.43],[-.32,.75,.12],[-.47,.91,.02]],
      [[.28,-.32,1.12],[.44,-.03,.81],[.50,.15,.66],[.63,.29,.61],[.66,.46,.38],[.84,.78,.08]],
      [[.67,-.28,.75],[.90,.06,.58],[.98,.25,.46],[1.18,.41,.34],[1.35,.66,.05]],
      [[-.48,-.28,.86],[-.78,-.53,.48],[-.88,-.85,.15]],
      [[.28,-.32,1.12],[.08,-.54,.65],[-.07,-.80,.31]],
      [[.67,-.28,.75],[.85,-.70,.41],[.99,-.89,.16]]
    ];
    const segments = [];
    if (id === 'alpine') ridgePaths.forEach(path => {
      const shifted = path.map(([px, pz, ph]) => {
        const ix = Math.round(px * 100), iz = Math.round(pz * 100);
        return [px + (hash(ix, iz, seed + 2) - .5) * .13, pz + (hash(ix, iz, seed + 3) - .5) * .12,
          ph * (.91 + hash(ix, iz, seed) * .19)];
      });
      for (let i = 1; i < shifted.length; i++) {
        const a = shifted[i - 1], b = shifted[i], dx = b[0] - a[0], dz = b[1] - a[1];
        segments.push([a[0], a[1], a[2], dx, dz, b[2] - a[2], 1 / (dx * dx + dz * dz)]);
      }
    });

    return (x, z) => {
      const ex = 1 - smooth(1.09, 1.65, Math.abs(x));
      const ez = 1 - smooth(.55, 1.04, Math.abs(z));
      const edge = ex * ez;
      const detail = fbm(x * 4 * freq + 3, z * 4 * freq, seed);
      const wx = x + (fbm(x * 2 * freq, z * 2 * freq, seed + 11) - .5) * (.13 + rough * .48);
      const wz = z + (fbm(x * 2 * freq + 6, z * 2 * freq, seed + 17) - .5) * (.14 + rough * .49);
      let h = 0;
      if (id === 'alpine') {
        for (let i = 0; i < segments.length; i++) {
          const s = segments[i], dx = wx - s[0], dz = wz - s[1];
          const t = clamp((dx * s[3] + dz * s[4]) * s[6], 0, 1);
          const u = dx - s[3] * t, v = dz - s[4] * t;
          h = Math.max(h, s[2] + s[5] * t - Math.sqrt(u * u + v * v) * 1.65);
        }
        const bedrock = fbm(wx * 8.1 * freq, wz * 8.1 * freq, seed + 8);
        const gullies = Math.abs(fbm(wx * 6.2 * freq - 1, wz * 3.5 * freq, seed + 13) * 2 - 1);
        h = h * (.85 + detail * .27) + (detail - .26) * rough * (.15 + .3 * h);
        h += (bedrock - .42) * rough * (.14 + h * .22) - gullies * rough * .075;
        h = Math.pow(Math.max(0, h), 1.32) * .83 + .085 * Math.exp(-wx * wx * .95 - wz * wz * 2);
      } else if (id === 'dunes') {
        const drift = z * 1.42 + .43 * Math.sin(x * 1.55 + phase * .23) + x * .38;
        const wave = drift * (3.7 + freq * 1.5) + phase;
        const dune = .5 + .50 * Math.cos(wave + .66 * Math.sin(wave));
        h = dune * (.39 + .19 * Math.cos(x * 1.1 - z * .8));
        h += .18 * (Math.cos(x * 1.8 - z + phase) + 1) + (detail - .4) * rough * .075;
      } else if (id === 'caldera') {
        const dx = (wx - shiftX) / 1.07, dz = (wz - shiftZ) / .77;
        const a = Math.atan2(dz, dx), r = Math.sqrt(dx * dx + dz * dz);
        const rim = .54 + Math.sin(a * 3 + phase) * .04 + Math.cos(a * 5) * .025;
        const outside = Math.exp(-Math.pow((r - rim) * (r < rim ? 7.2 : 3.1), 2));
        h = outside * (.57 + .10 * Math.sin(a * 2 + 1) + rough * .4 * (detail - .3));
        h += .15 * Math.exp(-r * r * 2) + .05 * detail + rough * .04 * Math.sin(a * 11) * outside;
      } else {
        const rolling = .56 + .24 * Math.cos(wx * (2.1 + freq) + wz * 2 + phase)
          + .20 * Math.sin(wz * (2.7 + freq) - wx * 1.6);
        h = .87 * Math.pow(rolling, 1.3) * Math.exp(-.32 * x * x - .4 * z * z);
        h += (detail - .35) * rough * .11;
      }
      return Math.max(0, h * amplitude * edge);
    };
  }

  function makeMesh(config, nx = 129, nz = 85) {
    const count = nx * nz;
    const x = new Float32Array(count), z = new Float32Array(count), h = new Float32Array(count);
    const lighting = new Float32Array(count), height = heightFunction(config);
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        x[k] = i / (nx - 1) * 4.24 - 2.12;
        z[k] = j / (nz - 1) * 2.08 - 1.04;
        h[k] = height(x[k] * 3.3 / 4.24, z[k]);
      }
    }
    const mesh = { nx, nz, x, z, h, lighting };
    lightMesh(mesh);
    return mesh;
  }

  function lightMesh(mesh) {
    const { nx, nz, h, lighting } = mesh;
    mesh.revision = (mesh.revision || 0) + 1;
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        const gx = (h[j * nx + Math.min(i + 1, nx - 1)] - h[j * nx + Math.max(i - 1, 0)]) * (nx - 1) / 8.48;
        const gz = (h[Math.min(j + 1, nz - 1) * nx + i] - h[Math.max(j - 1, 0) * nx + i]) * (nz - 1) / 4.16;
        const len = Math.sqrt(1 + gx * gx + gz * gz);
        lighting[k] = clamp((gx * .64 + .55 - gz * .52) / len, 0, 1);
      }
    }
  }

  const cache = new WeakMap();
  let accelerated;

  // One shared GPU surface serves every view; Canvas 2D is the complete fallback.
  function createAccelerator() {
    try {
      const surface = document.createElement('canvas');
      const gl = surface.getContext('webgl', { alpha: true, antialias: true, depth: true, stencil: false, powerPreference: 'low-power' });
      if (!gl || !gl.getExtension('OES_standard_derivatives')) return null;
      const program = gl.createProgram();
      const sources = [
        [gl.VERTEX_SHADER, `
          attribute vec3 aPosition;
          attribute float aLight;
          uniform vec4 uCamera;
          uniform vec3 uPlacement;
          uniform vec2 uViewport;
          uniform vec2 uGrid;
          uniform float uLens;
          varying float vHeight;
          varying float vLight;
          varying vec2 vGrid;
          void main() {
            float x = aPosition.x * uCamera.x - aPosition.z * uCamera.y;
            float d = aPosition.x * uCamera.y + aPosition.z * uCamera.x;
            float y = d * uCamera.w - aPosition.y * uCamera.z;
            float depth = d * uCamera.z + aPosition.y * uCamera.w;
            float w = 1.0 - depth * uLens;
            vec2 p = (vec2(x,y) * uPlacement.x / w + uPlacement.yz) / uViewport;
            gl_Position = vec4((p.x * 2.0 - 1.0) * w, (1.0 - p.y * 2.0) * w, -depth * .16, w);
            vHeight = aPosition.y; vLight = aLight;
            vGrid = (aPosition.xz / vec2(4.24, 2.08) + .5) * uGrid;
          }`],
        [gl.FRAGMENT_SHADER, `#extension GL_OES_standard_derivatives : enable
          precision mediump float;
          varying float vHeight;
          varying float vLight;
          varying vec2 vGrid;
          uniform float uStroke;
          uniform float uWire;
          void main() {
            float land = smoothstep(.005, .19, vHeight);
            vec2 distance = abs(fract(vGrid + .5) - .5) / max(fwidth(vGrid), vec2(.00001));
            vec2 lines = vec2(1.0) - smoothstep(vec2(0.0), vec2(.62, 1.0) * uStroke, distance);
            float edge = max(lines.x * .67, lines.y);
            float light = pow(vLight, 1.55);
            float paper = (18.0 + land * (5.0 + light * 85.0)) / 255.0;
            float ink = (30.0 + land * (53.0 + light * 165.0 + min(vHeight, 1.0) * 24.0)) / 255.0;
            float wire = mix(paper, ink, edge);
            float solid = (25.0 + light * 170.0 + vHeight * 22.0) / 255.0;
            gl_FragColor = vec4(vec3(mix(solid, wire, uWire)), 1.0);
          }`]
      ];
      for (const [type, source] of sources) {
        const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
        gl.attachShader(program, shader); gl.deleteShader(shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
      const buffer = gl.createBuffer(), indices = gl.createBuffer(), uniforms = {};
      ['uCamera', 'uPlacement', 'uViewport', 'uStroke', 'uWire', 'uLens', 'uGrid'].forEach(key => uniforms[key] = gl.getUniformLocation(program, key));
      gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
      [['aPosition', 3, 0], ['aLight', 1, 12]].forEach(([name, count, offset]) => {
        const index = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(index); gl.vertexAttribPointer(index, count, gl.FLOAT, false, 16, offset);
      });
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.clearColor(0, 0, 0, 0);
      let previousMesh = null, revision = -1, vertices = null, count = 0, columns = 0, rows = 0;
      return (ctx, mesh, width, height, dpr, placement, angle, wire, mini, lens) => {
        if (gl.isContextLost()) return false;
        const w = Math.round(width * dpr), h = Math.round(height * dpr);
        if (surface.width !== w || surface.height !== h) { surface.width = w; surface.height = h; }
        gl.viewport(0, 0, w, h);
        if (mesh.nx !== columns || mesh.nz !== rows) {
          count = (mesh.nx - 1) * (mesh.nz - 1) * 6;
          const faces = new Uint16Array(count);
          let cursor = 0;
          for (let j = 0; j < mesh.nz - 1; j++) for (let i = 0; i < mesh.nx - 1; i++) {
            const a = j * mesh.nx + i, b = a + 1, d = a + mesh.nx, c = d + 1;
            faces[cursor++] = a; faces[cursor++] = d; faces[cursor++] = b;
            faces[cursor++] = b; faces[cursor++] = d; faces[cursor++] = c;
          }
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, faces, gl.STATIC_DRAW); columns = mesh.nx; rows = mesh.nz;
        }
        if (mesh !== previousMesh || mesh.revision !== revision) {
          if (!vertices || vertices.length !== mesh.h.length * 4) vertices = new Float32Array(mesh.h.length * 4);
          for (let i = 0; i < mesh.h.length; i++) {
            vertices[i * 4] = mesh.x[i]; vertices[i * 4 + 1] = mesh.h[i];
            vertices[i * 4 + 2] = mesh.z[i]; vertices[i * 4 + 3] = mesh.lighting[i];
          }
          gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW); previousMesh = mesh; revision = mesh.revision;
        }
        gl.uniform4fv(uniforms.uCamera, angle); gl.uniform3fv(uniforms.uPlacement, placement);
        gl.uniform2f(uniforms.uViewport, width, height); gl.uniform1f(uniforms.uWire, wire ? 1 : 0);
        gl.uniform2f(uniforms.uGrid, mesh.nx - 1, mesh.nz - 1); gl.uniform1f(uniforms.uLens, lens);
        gl.uniform1f(uniforms.uStroke, (mini ? .65 : .95) * dpr);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
        ctx.drawImage(surface, 0, 0, width, height);
        return true;
      };
    } catch { return null; }
  }

  function draw(canvas, mesh, options = {}) {
    const width = options.width || canvas.clientWidth;
    const height = options.height || canvas.clientHeight;
    if (!width || !height) return;
    const dpr = options.dpr || Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);
    const cw = Math.round(width * dpr), ch = Math.round(height * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (options.background) { ctx.fillStyle = options.background; ctx.fillRect(0, 0, width, height); }
    const mini = options.mini || false;
    const yaw = options.yaw ?? -.39, pitch = options.pitch ?? .40;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const { nx, nz, x, z, h, lighting } = mesh;
    const n = nx * nz;
    let work = cache.get(canvas);
    if (!work || work.n !== n) {
      const order = [];
      for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) order.push(j * nx + i);
      work = { n, sx: new Float32Array(n), py: new Float32Array(n), depth: new Float32Array(n), order, yaw: NaN };
      cache.set(canvas, work);
    }
    const { sx, py, depth, order } = work;
    const topView = options.view === 'plan', lens = topView ? 0 : .065;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let k = 0; k < n; k++) {
      sx[k] = x[k] * cy - z[k] * sy;
      depth[k] = x[k] * sy + z[k] * cy;
      const factor = 1 / (1 - (depth[k] * cp + h[k] * sp) * lens);
      sx[k] *= factor;
      py[k] = (depth[k] * sp - h[k] * cp) * factor;
      minX = Math.min(minX, sx[k]); maxX = Math.max(maxX, sx[k]);
      minY = Math.min(minY, py[k]); maxY = Math.max(maxY, py[k]);
    }
    const wFill = mini ? .90 : width < 500 ? .90 : .89;
    const hFill = mini ? .86 : width < 500 ? .74 : .89;
    const zoom = options.zoom || 1;
    const fit = Math.min(width * wFill / (maxX - minX), height * hFill / Math.max(.5, maxY - minY));
    const scale = fit * zoom;
    const ox = width * .5 - (minX + maxX) * .5 * scale;
    const oy = height * (mini ? .53 : width < 500 ? .58 : .53) - (minY + maxY) * .5 * scale;
    for (let k = 0; k < n; k++) { sx[k] = sx[k] * scale + ox; py[k] = py[k] * scale + oy; }
    const wire = options.render !== 'solid';
    const project = (x1, z1, h1) => {
      const d = x1 * sy + z1 * cy, k = scale / (1 - (d * cp + h1 * sp) * lens);
      return [ox + (x1 * cy - z1 * sy) * k, oy + (d * sp - h1 * cp) * k];
    };

    if (!mini && !topView) {
      ctx.lineWidth = .6;
      ctx.strokeStyle = '#303030';
      ctx.beginPath();
      for (let i = -10; i <= 10; i++) {
        const a = project(i * .23, -1.22, -.022), b = project(i * .23, 1.22, -.022);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      }
      for (let j = -5; j <= 5; j++) {
        const a = project(-2.30, j * .23, -.022), b = project(2.30, j * .23, -.022);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      }
      ctx.stroke();
    }

    if (accelerated === undefined) accelerated = createAccelerator();
    const gpuDrawn = accelerated && accelerated(ctx, mesh, width, height, dpr, [scale, ox, oy], [cy, sy, cp, sp], wire, mini, lens);
    if (!gpuDrawn && yaw !== work.yaw) { order.sort((a, b) => depth[a] - depth[b]); work.yaw = yaw; }
    // In software, back-to-front cells keep the same hidden-line geometry.
    const lineWidth = mini ? .58 : clamp(scale / 215, .66, 1.0);
    ctx.lineJoin = 'round';
    for (let f = 0; !gpuDrawn && f < order.length; f++) {
      const a = order[f], b = a + 1, c = b + nx, d = a + nx;
      const elev = (h[a] + h[c]) * .5;
      const light = (lighting[a] + lighting[c]) * .5;
      const ground = smooth(0, .14, elev);
      const shade = wire ? 19 + ground * (5 + light * 73) : 28 + light * 160 + elev * 18;
      ctx.fillStyle = gray(shade);
      ctx.beginPath(); ctx.moveTo(sx[a], py[a]); ctx.lineTo(sx[b], py[b]);
      ctx.lineTo(sx[c], py[c]); ctx.lineTo(sx[d], py[d]); ctx.closePath(); ctx.fill();
      if (wire) {
        const ink = 42 + ground * (52 + light * 158 + Math.min(elev, 1) * 22);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = gray(ink);
        ctx.beginPath(); ctx.moveTo(sx[a], py[a]); ctx.lineTo(sx[b], py[b]); ctx.stroke();
        ctx.lineWidth = lineWidth * .72;
        ctx.strokeStyle = gray(ink * .82);
        ctx.beginPath(); ctx.moveTo(sx[b], py[b]); ctx.lineTo(sx[c], py[c]); ctx.stroke();
        if (ground > .14) {
          ctx.lineWidth = lineWidth * .46; ctx.strokeStyle = gray(ink * .60);
          ctx.beginPath(); ctx.moveTo(sx[b], py[b]); ctx.lineTo(sx[d], py[d]); ctx.stroke();
        }
      } else {
        ctx.lineWidth = .7;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.stroke();
      }
    }
    if (!mini) {
      ctx.strokeStyle = '#555'; ctx.lineWidth = .65;
      const corners = [[-2.12, -1.04], [2.12, -1.04], [2.12, 1.04], [-2.12, 1.04]];
      const front = corners.map(p => p[0] * sy + p[1] * cy);
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        if (front[i] + front[j] < 0) continue;
        const a = project(...corners[i], 0), b = project(...corners[j], 0);
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
      }
    }
    return { scale, width, height };
  }

  function obj(mesh, config) {
    const { nx, nz, x, z, h } = mesh;
    const out = ['# STRATA / Terrain Studio', `# Landform: ${config.id}; seed: ${config.seed}`, '# Units: meters; Y is up. The terrain is an open surface.', `o strata_${config.id}_${config.seed}`];
    for (let i = 0; i < h.length; i++) out.push(`v ${(x[i] * 200).toFixed(4)} ${(h[i] * 200).toFixed(4)} ${(z[i] * 200).toFixed(4)}`);
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i + 1, b = a + 1, d = a + nx, c = d + 1;
      out.push(`f ${a} ${d} ${b}`, `f ${b} ${d} ${c}`);
    }
    return out.join('\n') + '\n';
  }

  window.StrataTerrain = Object.freeze({ presets, makeMesh, draw, lightMesh, obj, clamp });
})();