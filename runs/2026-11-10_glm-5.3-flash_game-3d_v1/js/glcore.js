/* Emberwake — WebGL2 core: context, programs, meshes, instancing, resize. */
(function () {
  'use strict';
  const EW = (globalThis.EW = globalThis.EW || {});
  const M = EW.M;
  const GLC = (EW.GLC = {});

  let gl = null;
  GLC.get = function () { return gl; };

  GLC.init = function (canvas) {
    gl = canvas.getContext('webgl2', {
      antialias: true, alpha: false, depth: true, stencil: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: false
    });
    if (!gl) return false;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clearColor(0.05, 0.06, 0.1, 1);
    return true;
  };

  /* ---------------- programs ---------------- */
  function compile(type, src, name) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      console.error('[shader:' + name + '] ' + log);
      throw new Error('Shader compile failed: ' + name);
    }
    return sh;
  }

  GLC.program = function (name, vsSrc, fsSrc, defines) {
    // defines must come after #version line
    const inj = (src, defs) => {
      let s = src;
      if (s.startsWith('#version')) {
        const nl = s.indexOf('\n');
        s = s.slice(0, nl + 1) + defs + s.slice(nl + 1);
      }
      return s;
    };
    let d = '';
    if (defines) for (const k of defines) d += '#define ' + k + '\n';
    const vs = compile(gl.VERTEX_SHADER, inj(vsSrc, d), name + '.vs');
    const fs = compile(gl.FRAGMENT_SHADER, '#version 300 es\nprecision highp float;\n' + fsSrc.replace(/^#version 300 es\n/, '').replace(/^precision[^\n]*\n/, ''), name + '.fs');
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('[program:' + name + '] ' + gl.getProgramInfoLog(p));
      throw new Error('Program link failed: ' + name);
    }
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      const key = info.name.replace(/\[0\]$/, '');
      u[key] = gl.getUniformLocation(p, info.name);
    }
    return { id: p, u, use() { gl.useProgram(p); } };
  };

  GLC.setMat4 = function (p, key, m) { if (p.u[key]) gl.uniformMatrix4fv(p.u[key], false, m); };
  GLC.set3f = function (p, key, x, y, z) { if (p.u[key]) gl.uniform3f(p.u[key], x, y, z); };
  GLC.set3v = function (p, key, v) { if (p.u[key]) gl.uniform3f(p.u[key], v[0], v[1], v[2]); };
  GLC.set1f = function (p, key, v) { if (p.u[key]) gl.uniform1f(p.u[key], v); };
  GLC.set1i = function (p, key, v) { if (p.u[key]) gl.uniform1i(p.u[key], v); };
  GLC.set4v = function (p, key, arr) { if (p.u[key]) gl.uniform4fv(p.u[key], arr); };

  /* ---------------- geometry helpers ---------------- */
  // Attrib slots: 0 pos, 1 normal, 2 color, 3 aux, 4..6 instance (3x vec4)
  GLC.createMesh = function (data) {
    // data: { pos:[], nrm:[], col:[], aux:[], idx:[] } flat JS arrays
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vcount = data.pos.length / 3;
    const refs = { vao, vcount, indexed: false, icount: 0 };

    const mk = (arr, loc, size, key) => {
      if (!arr || !arr.length) return;
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      refs[key] = buf;
    };
    mk(data.pos, 0, 3, 'bufPos');
    mk(data.nrm, 1, 3, 'bufNrm');
    mk(data.col, 2, 3, 'bufCol');
    mk(data.aux, 3, 2, 'bufAux');

    if (data.idx && data.idx.length) {
      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(data.idx), gl.STATIC_DRAW);
      refs.indexed = true;
      refs.icount = data.idx.length;
      refs.bufIdx = ib;
    }
    gl.bindVertexArray(null);
    refs.draw = function () {
      gl.bindVertexArray(refs.vao);
      if (refs.indexed) gl.drawElements(gl.TRIANGLES, refs.icount, gl.UNSIGNED_INT, 0);
      else gl.drawArrays(gl.TRIANGLES, 0, refs.vcount);
    };
    return refs;
  };

  GLC.createInstanced = function (baseMesh, data, count) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    // re-bind base attributes (they live on the base VAO; we must replicate)
    // NOTE: baseMesh must expose its buffers.
    gl.bindBuffer(gl.ARRAY_BUFFER, baseMesh.bufPos);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, baseMesh.bufNrm);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, baseMesh.bufCol);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
    if (baseMesh.bufAux) { gl.bindBuffer(gl.ARRAY_BUFFER, baseMesh.bufAux); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0); }

    const instBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    const stride = 48;
    for (let i = 0; i < 3; i++) {
      const loc = 4 + i;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, stride, i * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
    if (baseMesh.indexed) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, baseMesh.bufIdx);
    }
    gl.bindVertexArray(null);
    return {
      vao, instBuf, cap: count, count,
      setCount(c) { this.count = Math.min(c, this.cap); },
      update(arr, c) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr, 0, Math.min(c, this.cap) * 12);
        this.count = Math.min(c, this.cap);
      },
      draw() {
        gl.bindVertexArray(this.vao);
        if (baseMesh.indexed) gl.drawElementsInstanced(gl.TRIANGLES, baseMesh.icount, gl.UNSIGNED_INT, 0, this.count);
        else gl.drawArraysInstanced(gl.TRIANGLES, 0, baseMesh.vcount, this.count);
      }
    };
  };

  // Sprite quad: corners generated in-shader via gl_VertexID (no buffer).
  GLC.spriteVAO = function (capInstances) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const instBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, Math.max(1, capInstances | 0) * 48, gl.DYNAMIC_DRAW);
    const stride = 48;
    for (let i = 0; i < 3; i++) {
      const loc = 4 + i;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, stride, i * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindVertexArray(null);
    return { vao, instBuf, count: 0, update(arr, c) { gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr, 0, c * 12); this.count = c; } };
  };

  /* ---------------- mesh data builders (CPU side) ---------------- */
  // Non-indexed triangle soup builder with flat normals.
  GLC.Builder = function () {
    this.pos = []; this.nrm = []; this.col = []; this.aux = []; this.idx = [];
  };
  GLC.Builder.prototype.tri = function (a, b, c, col, auxA, auxB, auxC) {
    // a,b,c: [x,y,z]; col: [r,g,b]
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= l; ny /= l; nz /= l;
    this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (let i = 0; i < 3; i++) this.nrm.push(nx, ny, nz);
    for (let i = 0; i < 3; i++) this.col.push(col[0], col[1], col[2]);
    this.aux.push(auxA || 0, auxA || 0, auxB || 0, auxB || 0, auxC || 0, auxC || 0);
    return this;
  };
  GLC.Builder.prototype.quad = function (a, b, c, d, col) {
    this.tri(a, b, c, col); this.tri(a, c, d, col);
    return this;
  };

  /* ---------------- resize ---------------- */
  GLC.dpr = 1;
  GLC.resize = function (canvas, dprCap) {
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    GLC.dpr = dpr;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    return w / h;
  };
})();
