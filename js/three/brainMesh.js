import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { brainSdf, HUBS } from './brainShape.js';

// The Learning Brain as a ready-to-use group (shared by Designs 1, 3 and 4).
//  1. A translucent holographic surface: a real mesh built from the brain's shape (marching cubes),
//     teal with glowing edges, so the lobes, the central groove and the folds read clearly.
//  2. Neurons: points on that surface that light up amber as the lesson lands.
// Drive it with the returned uniforms: uLight (how far the light has spread), uTime, uScale (pixels per world unit).

const HOLO_VS = `
varying vec3 vN; varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
// Fresnel: edges (where the surface turns away) glow; faces towards you stay glassy. Warms up as the brain lights.
const HOLO_FS = `
uniform float uLight;
varying vec3 vN; varying vec3 vV;
void main() {
  float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float warm = clamp(uLight / 1.05, 0., 1.);
  vec3 rim = mix(vec3(.35, .85, .95), vec3(1., .62, .3), warm * .55);
  vec3 col = mix(vec3(.04, .1, .16), rim * 1.15, f);
  gl_FragColor = vec4(col, .16 + .62 * f);
}`;

// uLight sweeps past each point's `act`; lit points turn warm, bigger and twinkle (HDR, so they bloom).
const POINT_VS = `
uniform float uTime, uLight, uScale;
attribute float act; attribute float seed; attribute vec3 nrm;
varying vec3 vCol; varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  gl_Position = projectionMatrix * mv;
  float lit = 1. - smoothstep(uLight - .3, uLight, act);
  float twinkle = .55 + .45 * sin(uTime * (2. + seed * 3.) + seed * 40.);
  float firing = step(.8, seed);   // about 20% are "firing" neurons bright enough to bloom
  vec3 hot = mix(vec3(1., .5, .18), vec3(1., .88, .7), seed) * mix(.3 + .2 * twinkle, 1.3 + 1.4 * twinkle, firing);
  vCol = mix(vec3(.35, .75, .85) * .35, hot, lit);
  float facing = dot(normalize(normalMatrix * nrm), vec3(0., 0., 1.));
  vA = mix(.35, .85, lit) * smoothstep(-.3, .3, facing);   // the far side of the brain stays quiet
  gl_PointSize = (.012 + firing * lit * .01) * (.6 + seed * .8) * uScale / -mv.z;
}`;
const POINT_FS = `
varying vec3 vCol; varying float vA;
void main() {
  float d = length(gl_PointCoord - .5);
  if (d > .5) discard;
  gl_FragColor = vec4(vCol, vA * smoothstep(.5, 0., d));
}`;
const LINE_VS = `
uniform float uLight; attribute float act; varying float vLit;
void main() { vLit = 1. - smoothstep(uLight - .3, uLight, act); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const LINE_FS = `
varying float vLit;
void main() { gl_FragColor = vec4(vec3(1., .6, .25) * 1.2, vLit * .35); }`;

let cache = null;   // the mesh data is the same everywhere; build it once per page

function build() {
  // Fill a 3D grid with the shape (positive inside), then let marching cubes turn it into a surface.
  const RES = 72, half = RES / 2;
  const surface = new MarchingCubes(RES, new THREE.MeshBasicMaterial(), false, false, 400000);
  surface.isolation = 0;
  const field = surface.field;
  for (let z = 0; z < RES; z++) for (let y = 0; y < RES; y++) for (let x = 0; x < RES; x++) {
    field[x + y * RES + z * RES * RES] = -brainSdf((x - half) / half, (y - half) / half, (z - half) / half) * 20;
  }
  surface.update();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(surface.positionArray.slice(0, surface.count * 3), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(surface.normalArray.slice(0, surface.count * 3), 3));

  // Neurons: random points on the surface (with its normals), each with its own light-up time.
  const N = 9000, pos = new Float32Array(N * 3), nrm = new Float32Array(N * 3), act = new Float32Array(N), seed = new Float32Array(N);
  const P = geo.attributes.position.array, Nn = geo.attributes.normal.array, hubs = HUBS.map((h) => new THREE.Vector3(...h)), v = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const k = (Math.random() * surface.count | 0) * 3;
    v.set(P[k], P[k + 1], P[k + 2]);
    pos.set([v.x, v.y, v.z], i * 3);
    nrm.set([Nn[k], Nn[k + 1], Nn[k + 2]], i * 3);
    let d = 9;
    for (const h of hubs) d = Math.min(d, v.distanceTo(h));
    act[i] = d + Math.random() * .3;
    seed[i] = Math.random();
  }
  const points = new THREE.BufferGeometry();
  points.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  points.setAttribute('nrm', new THREE.BufferAttribute(nrm, 3));
  points.setAttribute('act', new THREE.BufferAttribute(act, 1));
  points.setAttribute('seed', new THREE.BufferAttribute(seed, 1));

  // "Synapses": very short links between close neighbours, visible only once lit.
  const lp = [], la = [];
  for (let n = 0; n < 500; n++) {
    const i = Math.random() * N | 0;
    let best = -1, bd = .08;
    for (let c = 0; c < 400; c++) {
      const j = Math.random() * N | 0, d = Math.hypot(pos[i * 3] - pos[j * 3], pos[i * 3 + 1] - pos[j * 3 + 1], pos[i * 3 + 2] - pos[j * 3 + 2]);
      if (d > .02 && d < bd) { bd = d; best = j; }
    }
    if (best < 0) continue;
    lp.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], pos[best * 3], pos[best * 3 + 1], pos[best * 3 + 2]);
    const m = Math.max(act[i], act[best]);
    la.push(m, m);
  }
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  lines.setAttribute('act', new THREE.Float32BufferAttribute(la, 1));
  return { geo, points, lines };
}

export function makeBrain() {
  cache ??= build();
  const uniforms = { uTime: { value: 0 }, uLight: { value: 0 }, uScale: { value: 1 } };
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  const group = new THREE.Group();
  group.add(
    new THREE.Mesh(cache.geo, new THREE.ShaderMaterial({ uniforms, vertexShader: HOLO_VS, fragmentShader: HOLO_FS, ...additive })),
    new THREE.Points(cache.points, new THREE.ShaderMaterial({ uniforms, vertexShader: POINT_VS, fragmentShader: POINT_FS, ...additive })),
    new THREE.LineSegments(cache.lines, new THREE.ShaderMaterial({ uniforms, vertexShader: LINE_VS, fragmentShader: LINE_FS, ...additive })),
  );
  return { group, uniforms };
}
