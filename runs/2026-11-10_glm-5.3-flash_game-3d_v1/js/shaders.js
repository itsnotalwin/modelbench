/* Emberwake — GLSL ES 3.00 sources. */
(function () {
  'use strict';
  const EW = (globalThis.EW = globalThis.EW || {});
  EW.Shaders = {

    litVS: `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec3 aCol;
layout(location=3) in vec2 aAux;
#ifdef INSTANCED
layout(location=4) in vec4 iA; // xyz pos, w scale
layout(location=5) in vec4 iB; // x yaw, yzw rgb tint
layout(location=6) in vec4 iC; // x sway, y phase, z unused, w unused
#endif
uniform mat4 uVP;
uniform mat4 uModel;
uniform float uTime;
uniform float uWindAmp;
out vec3 vN;
out vec3 vC;
out vec3 vW;
void main() {
  vec3 p = aPos;
  vec3 n = aNrm;
  #ifdef INSTANCED
    float cy = cos(iB.x), sy = sin(iB.x);
    p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z) * iA.w + iA.xyz;
    n = vec3(cy * n.x + sy * n.z, n.y, -sy * n.x + cy * n.z);
    float hAbove = max(p.y - iA.y, 0.0);
    p.x += sin(uTime * 1.4 + iC.y + hAbove * 0.35) * iC.x * uWindAmp * hAbove;
    p.z += cos(uTime * 1.1 + iC.y * 1.7) * iC.x * 0.5 * uWindAmp * hAbove;
  #endif
  vec4 wp = uModel * vec4(p, 1.0);
  vN = n;
  vC = aCol;
  #ifdef INSTANCED
    vC *= iB.yzw;
  #endif
  vW = wp.xyz;
  gl_Position = uVP * wp;
}`,

    litFS: `#version 300 es
in vec3 vN;
in vec3 vC;
in vec3 vW;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uSkyAmb;
uniform vec3 uGndAmb;
uniform vec3 uFogCol;
uniform float uFogK;
uniform vec3 uCam;
uniform vec4 uPL[4];   // xyz pos, w radius (0 = off)
uniform vec3 uPLC;
uniform vec3 uTint;
uniform float uRim;
out vec4 o;
void main() {
  vec3 n = normalize(vN);
  float ndl = max(dot(n, uSunDir), 0.0);
  vec3 amb = mix(uGndAmb, uSkyAmb, n.y * 0.5 + 0.5);
  vec3 col = vC * uTint * (uSunCol * ndl + amb);
  for (int i = 0; i < 4; i++) {
    if (uPL[i].w > 0.0) {
      vec3 d = uPL[i].xyz - vW;
      float dist = length(d);
      float f = max(0.0, 1.0 - dist / uPL[i].w);
      f = f * f * f;
      float nl = max(dot(n, d / max(dist, 0.001)), 0.0);
      col += uPLC * f * (0.35 + 0.65 * nl);
    }
  }
  vec3 v = normalize(uCam - vW);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * uRim;
  col += uSunCol * rim;
  float dist = length(uCam - vW);
  float fog = 1.0 - exp(-pow(dist * uFogK, 1.5));
  col = mix(col, uFogCol, fog);
  o = vec4(col, 1.0);
}`,

    skyVS: `#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uVP;
uniform vec3 uCam;
out vec3 vDir;
void main() {
  vec3 w = aPos + uCam;
  vDir = aPos;
  gl_Position = uVP * vec4(w, 1.0);
}`,

    skyFS: `#version 300 es
in vec3 vDir;
uniform vec3 uSunDir;
uniform float uNight;   // 1 = deep dusk, 0 = dawn
uniform float uTime;
uniform vec3 uZenA;
uniform vec3 uHorA;
uniform vec3 uZenB;
uniform vec3 uHorB;
out vec4 o;
float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash3(vec3(i, 7.0));
  float b = hash3(vec3(i + vec2(1.0, 0.0), 7.0));
  float c = hash3(vec3(i + vec2(0.0, 1.0), 7.0));
  float d = hash3(vec3(i + vec2(1.0, 1.0), 7.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
  vec3 d = normalize(vDir);
  float up = max(d.y, 0.0);
  float t = pow(1.0 - up, 1.7);
  vec3 zen = mix(uZenB, uZenA, uNight);
  vec3 hor = mix(uHorB, uHorA, uNight);
  vec3 col = mix(zen, hor, t);
  float sd = max(dot(d, uSunDir), 0.0);
  col += vec3(1.0, 0.58, 0.32) * pow(sd, 220.0) * 2.2;
  col += vec3(1.0, 0.55, 0.30) * pow(sd, 8.0) * 0.55;
  col += vec3(0.9, 0.45, 0.35) * pow(sd, 2.0) * 0.12;
  if (uNight > 0.02 && up > 0.02) {
    vec3 sp = floor(d * 190.0);
    float h = hash3(sp);
    float star = step(0.995, h) * (0.35 + 0.65 * sin(uTime * 2.2 + h * 61.0));
    col += vec3(0.85, 0.9, 1.0) * star * uNight * smoothstep(0.02, 0.25, up) * 0.9;
  }
  if (d.y > 0.02) {
    vec2 cuv = d.xz / max(d.y, 0.14) * 0.55 + vec2(uTime * 0.004, uTime * 0.0016);
    float cl = noise2(cuv) * 0.6 + noise2(cuv * 2.7) * 0.4;
    float band = smoothstep(0.62, 0.14, abs(d.y - 0.16));
    cl = smoothstep(0.52, 0.78, cl) * band;
    vec3 ccol = mix(hor * 1.05, vec3(0.30, 0.27, 0.38), uNight * 0.55);
    ccol += vec3(1.0, 0.55, 0.3) * pow(sd, 3.0) * 0.35;
    col = mix(col, ccol, cl * 0.55);
  }
  o = vec4(col, 1.0);
}`,

    waterVS: `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec3 aCol;
layout(location=3) in vec2 aAux;
uniform mat4 uVP;
uniform float uTime;
uniform float uLakeY;
out vec3 vW;
out vec2 vXZ;
void main() {
  vec3 p = aPos;
  p.y = uLakeY + sin(p.x * 0.14 + uTime * 1.1) * 0.14 + sin(p.z * 0.11 - uTime * 0.8) * 0.12;
  vW = p;
  vXZ = p.xz;
  gl_Position = uVP * vec4(p, 1.0);
}`,

    waterFS: `#version 300 es
in vec3 vW;
in vec2 vXZ;
uniform vec3 uCam;
uniform vec3 uSunDir;
uniform vec3 uSkyCol;
uniform vec3 uDeepCol;
uniform vec3 uFogCol;
uniform float uFogK;
uniform float uTime;
out vec4 o;
float hash2(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash2(i), b = hash2(i + vec2(1.0, 0.0));
  float c = hash2(i + vec2(0.0, 1.0)), d = hash2(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
  vec3 v = normalize(uCam - vW);
  float wob = noise2(vXZ * 0.14 + vec2(uTime * 0.35, -uTime * 0.22)) * 0.7
            + noise2(vXZ * 0.5 - vec2(uTime * 0.18, uTime * 0.4)) * 0.3;
  vec3 n = normalize(vec3((wob - 0.5) * 0.35, 1.0, (noise2(vXZ * 0.4 + uTime * 0.25) - 0.5) * 0.35));
  float fres = pow(1.0 - max(dot(v, n), 0.0), 2.2);
  vec3 col = mix(uDeepCol, uSkyCol, 0.25 + 0.6 * fres);
  vec3 r = reflect(-v, n);
  float spec = pow(max(dot(r, uSunDir), 0.0), 140.0);
  col += vec3(1.0, 0.62, 0.34) * spec * 1.8;
  col += vec3(1.0, 0.7, 0.4) * pow(max(dot(r, uSunDir), 0.0), 12.0) * 0.10;
  float dist = length(uCam - vW);
  float fog = 1.0 - exp(-pow(dist * uFogK, 1.5));
  col = mix(col, uFogCol, fog);
  o = vec4(col, 1.0);
}`,

    spriteVS: `#version 300 es
layout(location=4) in vec4 iA; // xyz pos, w size
layout(location=5) in vec4 iB; // rgb, alpha
layout(location=6) in vec4 iC; // x shape, y seed, z stretchX, w unused
uniform mat4 uVP;
uniform vec3 uRight;
uniform vec3 uUp;
out vec2 vUv;
out vec4 vCol;
out vec4 vPar;
void main() {
  vec2 q;
  int id = gl_VertexID;
  if (id == 0) q = vec2(-1.0, -1.0);
  else if (id == 1) q = vec2(1.0, -1.0);
  else if (id == 2) q = vec2(-1.0, 1.0);
  else if (id == 3) q = vec2(-1.0, 1.0);
  else if (id == 4) q = vec2(1.0, -1.0);
  else q = vec2(1.0, 1.0);
  int shape = int(iC.x + 0.5);
  vec3 offs;
  if (shape == 4) {
    offs = uRight * q.x * 0.16 + vec3(0.0, q.y, 0.0);
  } else if (shape == 1) {
    offs = uRight * q.x * iC.z + uUp * q.y;
  } else {
    offs = uRight * q.x + uUp * q.y;
  }
  vec3 w = iA.xyz + offs * iA.w;
  vUv = q;
  vCol = iB;
  vPar = iC;
  gl_Position = uVP * vec4(w, 1.0);
}`,

    spriteFS: `#version 300 es
in vec2 vUv;
in vec4 vCol;
in vec4 vPar;
uniform float uAdditive; // 1 additive pass, 0 alpha pass
out vec4 o;
float hash2(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash2(i), b = hash2(i + vec2(1.0, 0.0));
  float c = hash2(i + vec2(0.0, 1.0)), d = hash2(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
  int shape = int(vPar.x + 0.5);
  float d = length(vUv);
  float a = 0.0;
  if (shape == 0) {           // soft glow + hot core
    a = pow(max(0.0, 1.0 - d), 2.2) * 0.9 + smoothstep(0.32, 0.0, d) * 0.9;
  } else if (shape == 1) {    // horizontal streak
    d = length(vec2(vUv.x * 2.4, vUv.y * 0.8));
    a = pow(max(0.0, 1.0 - d), 1.8);
  } else if (shape == 2) {    // ring
    a = smoothstep(0.16, 0.0, abs(d - 0.62));
  } else if (shape == 3) {    // soft puff with noise
    float base = smoothstep(1.0, 0.12, d);
    float n = noise2(vUv * 2.4 + vPar.y * 37.0) * 0.6 + noise2(vUv * 5.1 + vPar.y * 11.0) * 0.4;
    a = base * (0.45 + 0.55 * n);
  } else {                    // vertical streak
    d = length(vec2(vUv.x * 1.6, vUv.y * 0.42));
    a = pow(max(0.0, 1.0 - d), 1.9);
  }
  a = clamp(a, 0.0, 1.0) * vCol.a;
  if (a < 0.003) discard;
  if (uAdditive > 0.5) {
    o = vec4(vCol.rgb * a, 1.0);
  } else {
    o = vec4(vCol.rgb, a);
  }
}`,

    beamVS: `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=3) in vec2 aAux; // x: 0 bottom..1 top, y: seed
uniform mat4 uVP;
uniform mat4 uModel;
out vec2 vAux;
out vec3 vW;
out vec3 vNrm;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  vAux = aAux;
  vW = w.xyz;
  vNrm = mat3(uModel) * aNrm;
  gl_Position = uVP * w;
}`,

    beamFS: `#version 300 es
in vec2 vAux;
in vec3 vW;
in vec3 vNrm;
uniform vec3 uCam;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uTime;
out vec4 o;
void main() {
  float y = vAux.x;
  vec3 v = normalize(uCam - vW);
  float facing = abs(dot(normalize(vNrm), v));
  float a = pow(1.0 - y, 1.6) * uAlpha * smoothstep(0.0, 0.42, facing);
  a *= smoothstep(0.0, 0.06, y);
  o = vec4(uColor * a, 1.0);
}`
  };
})();
