// ZetaQ Museum, Dinosaur Gallery: a website copy of the walkable museum (3_AI_Research/Skill_Trials/_outputs/14_museum, three r169).
// Static light (a painted light field per room + one fixed shadow pass), so nothing flickers; real planar reflections on the marble.
// Only the dinosaur gallery is open. The other eight galleries are built as halls you can see through the doorways
// (with one far exhibit each next door); walking up to a doorway, or tapping it, opens a "Contact us" card instead.
import * as THREE from 'three';
import { GLTFLoader } from './vendor/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from './vendor/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from './vendor/jsm/utils/BufferGeometryUtils.js';
import { ROOMS, EXHIBITS, OPEN } from './exhibits.js';

const Q = new URLSearchParams(location.search), TEST = Q.has('test');
const SMALL = Q.has('light') || matchMedia('(max-width: 820px), (pointer: coarse)').matches;   // phones and tablets: lighter shadows and reflections
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const CELL = 34, R = 16, WT = 1, DOOR = 3, DOORH = 5.4, WORLD = 104;
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const setLoad = (t, f) => { $('loadTxt').textContent = t; $('loadBar').style.width = (f * 100).toFixed(0) + '%'; };
const roomX = (r) => r.col * CELL, roomZ = (r) => r.row * CELL;
const roomAt = (col, row) => ROOMS.find((r) => r.col === col && r.row === row);
const HOME = ROOMS.find((r) => r.id === OPEN);

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: TEST });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.25 : 1.5));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .82;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0c0d0f);
const cam = new THREE.PerspectiveCamera(SMALL && innerWidth < innerHeight ? 70 : 62, innerWidth / innerHeight, .08, 220);
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), .05).texture; scene.environmentIntensity = .62;
// One fixed sun, aimed at the open gallery so its shadows are sharp there.
const sun = new THREE.DirectionalLight(0xfff6ea, 1.7); sun.position.set(14, 70, roomZ(HOME) + 8); sun.target.position.set(roomX(HOME), 0, roomZ(HOME)); sun.castShadow = true;
{ const c = sun.shadow.camera; c.left = -28; c.right = 28; c.top = 28; c.bottom = -28; c.near = 20; c.far = 95; }
sun.shadow.mapSize.set(SMALL ? 2048 : 4096, SMALL ? 2048 : 4096); sun.shadow.radius = 7; sun.shadow.intensity = .72; sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
scene.add(sun, sun.target);

// ------------------------------------------------------------------ light field: a top-down painting of how much light each spot of each room gets
const field = document.createElement('canvas'); field.width = field.height = 2048;
const fieldTex = new THREE.CanvasTexture(field); fieldTex.colorSpace = THREE.NoColorSpace; fieldTex.minFilter = THREE.LinearFilter;
const FK = 2.4, PX = 2048 / WORLD, wx = (x) => (x + WORLD / 2) * PX, rgb = (c, k = 1) => `rgb(${c.map((v) => Math.round(clamp(v * k / FK, 0, 1) * 255)).join(',')})`;
const uShared = { uField: { value: fieldTex }, uFK: { value: FK } };

function paintField() {
  const g = field.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 2048, 2048);
  for (const r of ROOMS) {
    const x = wx(roomX(r)), z = wx(roomZ(r)), half = R * PX;
    g.save(); g.beginPath(); g.rect(x - half, z - half, half * 2, half * 2); g.clip();
    g.globalCompositeOperation = 'source-over'; g.fillStyle = rgb(r.amb); g.fillRect(x - half, z - half, half * 2, half * 2);
    g.globalCompositeOperation = 'lighter';
    if (r.skylight) { const s = g.createRadialGradient(x, z, 0, x, z, 16 * PX); s.addColorStop(0, rgb([.42, .43, .44])); s.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = s; g.fillRect(x - half, z - half, half * 2, half * 2); }
    for (const e of r.items) {
      const ex = wx(roomX(r) + e.x), ez = wx(roomZ(r) + e.z), rad = Math.max(3.2, e.size * .72) * PX;
      if (e.kind === 'h') continue;
      const s = g.createRadialGradient(ex, ez, 0, ex, ez, rad); s.addColorStop(0, rgb([.80, .76, .69])); s.addColorStop(.55, rgb([.34, .32, .29])); s.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = s; g.fillRect(ex - rad, ez - rad, rad * 2, rad * 2);
    }
    // darkness where floor meets wall
    g.globalCompositeOperation = 'multiply';
    const edge = 1.5 * PX, band = (x0, y0, x1, y1, rx, ry, rw, rh) => { const s = g.createLinearGradient(x0, y0, x1, y1); s.addColorStop(0, '#6f6f6f'); s.addColorStop(1, '#fff'); g.fillStyle = s; g.fillRect(rx, ry, rw, rh); };
    band(x - half, 0, x - half + edge, 0, x - half, z - half, edge, half * 2); band(x + half, 0, x + half - edge, 0, x + half - edge, z - half, edge, half * 2);
    band(0, z - half, 0, z - half + edge, x - half, z - half, half * 2, edge); band(0, z + half, 0, z + half - edge, x - half, z + half - edge, half * 2, edge);
    g.restore();
  }
  // door openings carry the light through
  g.globalCompositeOperation = 'source-over'; g.filter = 'blur(3px)';
  for (const d of doors()) { g.fillStyle = rgb(d.c, .9); const a = wx(d.x - d.hx), b = wx(d.z - d.hz); g.fillRect(a, b, d.hx * 2 * PX, d.hz * 2 * PX); }
  // soft dark line around plinths
  g.filter = 'blur(5px)'; g.globalCompositeOperation = 'multiply'; g.strokeStyle = '#555'; g.lineWidth = 7;
  for (const b of plinths) g.strokeRect(wx(b.x0), wx(b.z0), (b.x1 - b.x0) * PX, (b.z1 - b.z0) * PX);
  g.filter = 'none'; fieldTex.needsUpdate = true;
}
function doors() { // every pair of neighbouring rooms is joined by one opening
  const out = [];
  for (const r of ROOMS) for (const [dc, dr] of [[1, 0], [0, 1]]) {
    const n = roomAt(r.col + dc, r.row + dr); if (!n) continue;
    const c = r.amb.map((v, i) => (v + n.amb[i]) / 2);
    out.push(dc ? { x: roomX(r) + CELL / 2, z: roomZ(r), hx: 1.2, hz: DOOR, c } : { x: roomX(r), z: roomZ(r) + CELL / 2, hx: DOOR, hz: 1.2, c });
  }
  return out;
}

// inset = how far along the surface normal to read the field, so a wall reads the room it faces. kind: 0 floor/objects, 1 wall
function lit(mat, inset = .3, wall = 0, extra) {
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uShared, extra ? extra.uniforms : {});
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz; vWN=normalize(mat3(modelMatrix)*objectNormal);');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWP; varying vec3 vWN; uniform sampler2D uField; uniform float uFK;${extra ? extra.pars : ''}`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        { vec2 fuv=(vWP.xz+normalize(vWN).xz*${inset.toFixed(2)}+${(WORLD / 2).toFixed(1)})/${WORLD.toFixed(1)};
          vec3 F=texture2D(uField,vec2(fuv.x,fuv.y)).rgb*uFK;
          ${wall ? `float along=abs(vWN.x)>.5?vWP.z:vWP.x; float sc=abs(fract(along/5.)-.5)*2.;
          float h=vWP.y; float wash=mix(1.16,.9,smoothstep(.1,.9,sc)); F*=2.5*wash*mix(.68,1.,smoothstep(0.,1.1,h))*mix(1.,.8,smoothstep(4.,12.,h));` : ''}
          reflectedLight.directDiffuse*=F; reflectedLight.directSpecular*=F; reflectedLight.indirectDiffuse*=F; reflectedLight.indirectSpecular*=F; ${wall ? 'reflectedLight.indirectDiffuse=diffuseColor.rgb*.34*F;' : ''} }`);
    if (extra) s.fragmentShader = s.fragmentShader.replace('#include <opaque_fragment>', extra.code + '\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => `lit${inset}_${wall}_${extra ? extra.code.length : 0}`;
  return mat;
}

// ------------------------------------------------------------------ procedural surfaces
function noiseFill(g, n, a, b, alpha) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? a : b},${alpha})`; const s = 1 + Math.random() * 3; g.fillRect(Math.random() * g.canvas.width, Math.random() * g.canvas.height, s, s); } }
function tex(size, draw, srgb = true, rep = 1) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; }
const marble = tex(SMALL ? 1024 : 2048, (g, S) => {
  const n = 4, T = S / n, tones = ['#a39c8e', '#9b9486', '#a8a193', '#8f887b'], k = S / 2048;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = (i + j) % 2 ? tones[(i * 3 + j) % 3] : tones[3]; g.fillRect(i * T, j * T, T, T);
    g.save(); g.beginPath(); g.rect(i * T, j * T, T, T); g.clip();
    for (let v = 0; v < 7; v++) { let x = i * T + Math.random() * T, y = j * T + Math.random() * T, a = Math.random() * 6.28; g.beginPath(); g.moveTo(x, y); for (let q = 0; q < 30; q++) { a += (Math.random() - .5) * .9; x += Math.cos(a) * 16 * k; y += Math.sin(a) * 16 * k; g.lineTo(x, y); } g.strokeStyle = Math.random() < .6 ? 'rgba(70,62,52,.22)' : 'rgba(240,235,225,.28)'; g.lineWidth = (.6 + Math.random() * 1.6) * Math.max(k, .6); g.stroke(); }
    g.restore();
  }
  noiseFill(g, 26000 * k * k, '60,55,48', '235,230,220', .05);
  g.strokeStyle = '#6a6459'; g.lineWidth = 2 * Math.max(k, .6); for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * T, 0); g.lineTo(i * T, S); g.moveTo(0, i * T); g.lineTo(S, i * T); g.stroke(); }
}, true, .25); // 4 m per repeat
const plaster = tex(1024, (g, S) => { g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, S, S); noiseFill(g, 42000, '120,120,120', '255,255,255', .05); for (let i = 0; i < 26; i++) { const x = Math.random() * S, y = Math.random() * S, r = 60 + Math.random() * 180, s = g.createRadialGradient(x, y, 0, x, y, r); s.addColorStop(0, Math.random() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(90,90,90,.05)'); s.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = s; g.fillRect(x - r, y - r, r * 2, r * 2); } }, true, .2);
const limestone = tex(1024, (g, S) => { g.fillStyle = '#c9c1b1'; g.fillRect(0, 0, S, S); noiseFill(g, 60000, '110,100,85', '235,228,212', .07); }, true, .4);
const panelTex = tex(512, (g, S) => { g.fillStyle = '#000'; g.fillRect(0, 0, S, S); const r = S * .1, s = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, r); s.addColorStop(0, '#fff3df'); s.addColorStop(.8, '#f4e6cf'); s.addColorStop(1, '#000'); g.fillStyle = s; g.fillRect(0, 0, S, S); }, true, .25);
const coffer = tex(512, (g, S) => { g.fillStyle = '#a7a193'; g.fillRect(0, 0, S, S); const m = S * .07; g.fillStyle = '#6d685c'; g.fillRect(m, m, S - 2 * m, S - 2 * m); g.fillStyle = '#b4ad9e'; g.fillRect(m * 1.5, m * 1.5, S - 3 * m, S - 3 * m); noiseFill(g, 3000, '90,90,80', '230,230,220', .06); }, true, .25);
const skyTex = tex(1024, (g, S) => { const s = g.createLinearGradient(0, 0, S, S); s.addColorStop(0, '#dfe7ee'); s.addColorStop(1, '#b9c7d6'); g.fillStyle = s; g.fillRect(0, 0, S, S); }, true, 1);

const uReflect = { uRefl: { value: null }, uRM: { value: new THREE.Matrix4() } };
const floorExtra = { uniforms: uReflect, pars: 'uniform sampler2D uRefl; uniform mat4 uRM;', code: `
  { vec4 rc=uRM*vec4(vWP,1.); vec2 ruv=rc.xy/rc.w; vec3 V=normalize(cameraPosition-vWP);
    float d=clamp(length(cameraPosition-vWP)/60.,.0,1.); float blur=mix(.0035,.0012,d);
    vec3 rf=texture2D(uRefl,ruv).rgb*.28+texture2D(uRefl,ruv+vec2(blur,0.)).rgb*.18+texture2D(uRefl,ruv-vec2(blur,0.)).rgb*.18+texture2D(uRefl,ruv+vec2(0.,blur*1.6)).rgb*.18+texture2D(uRefl,ruv-vec2(0.,blur*1.6)).rgb*.18;
    float fr=.05+.42*pow(1.-clamp(V.y,0.,1.),4.);
    outgoingLight=mix(outgoingLight,rf,fr); }` };
const MAT = {
  floor: lit(new THREE.MeshStandardMaterial({ map: marble, color: 0x8c8c8c, roughness: .42, metalness: 0, envMapIntensity: .18 }), .05, 0, floorExtra),
  trim: lit(new THREE.MeshStandardMaterial({ map: limestone, roughness: .72 }), .3),
  frame: lit(new THREE.MeshStandardMaterial({ map: limestone, color: 0xe4dac8, roughness: .6 }), .3),
  plinth: lit(new THREE.MeshStandardMaterial({ map: limestone, color: 0x4a4a4c, roughness: .55 }), .3),
  ped: lit(new THREE.MeshStandardMaterial({ map: plaster, color: 0x36383c, roughness: .6 }), .3),
  wood: lit(new THREE.MeshStandardMaterial({ color: 0x4f3524, roughness: .5 }), .3),
  metal: lit(new THREE.MeshStandardMaterial({ color: 0x2e2c2a, roughness: .35, metalness: .8 }), .3),
  ceil: lit(new THREE.MeshStandardMaterial({ map: coffer, roughness: .9, emissive: 0xffeed8, emissiveMap: panelTex, emissiveIntensity: 1.5 }), 0),
};
const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .1, roughness: .03, metalness: 0, envMapIntensity: 1.3, depthWrite: false });

// ------------------------------------------------------------------ building: boxes with world-scale UVs, merged per material
const bins = {}; const solid = []; const plinths = [];
function box(x0, x1, y0, y1, z0, z1, key) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const a = Math.abs(n.getX(i)), b = Math.abs(n.getY(i)); if (a > .5) uv.setXY(i, p.getZ(i), p.getY(i)); else if (b > .5) uv.setXY(i, p.getX(i), p.getZ(i)); else uv.setXY(i, p.getX(i), p.getY(i)); }
  (bins[key] = bins[key] || []).push(g);
}
const wallBlock = (x0, x1, z0, z1) => solid.push({ x0, x1, z0, z1 });
// The doorways out of the open gallery: each is closed by an invisible barrier and opens the "Contact us" card instead.
const gates = [], gateMeshes = [];
function buildRoom(r) {
  const cx = roomX(r), cz = roomZ(r), key = 'wall_' + r.id;
  MAT[key] = lit(new THREE.MeshStandardMaterial({ map: plaster, color: r.wall, roughness: .85 }), 1.7, 1);
  box(cx - R - WT, cx + R + WT, -.5, 0, cz - R - WT, cz + R + WT, 'floor');
  for (const [dx, dz, nb] of [[1, 0, roomAt(r.col + 1, r.row)], [-1, 0, roomAt(r.col - 1, r.row)], [0, 1, roomAt(r.col, r.row + 1)], [0, -1, roomAt(r.col, r.row - 1)]]) {
    const seg = (a, b, y0, y1, t, k, off = 0) => { // a..b runs along the wall; t = thickness into the room from the wall face
      if (dx) { const w = cx + dx * (R - off); const p = dx > 0 ? [w - t, w + (off ? 0 : WT)] : [w - (off ? 0 : WT), w + t]; box(p[0], p[1], y0, y1, cz + a, cz + b, k); }
      else { const w = cz + dz * (R - off); const p = dz > 0 ? [w - t, w + (off ? 0 : WT)] : [w - (off ? 0 : WT), w + t]; box(cx + a, cx + b, y0, y1, p[0], p[1], k); }
    };
    const blk = (a, b) => dx ? wallBlock(Math.min(cx + dx * R, cx + dx * (R + WT)), Math.max(cx + dx * R, cx + dx * (R + WT)), cz + a, cz + b) : wallBlock(cx + a, cx + b, Math.min(cz + dz * R, cz + dz * (R + WT)), Math.max(cz + dz * R, cz + dz * (R + WT)));
    const parts = nb ? [[-R - WT, -DOOR], [DOOR, R + WT]] : [[-R - WT, R + WT]];
    for (const [a, b] of parts) { seg(a, b, 0, r.H, 0, key); blk(a, b); seg(a, b, 0, .28, .05, 'trim'); seg(a, b, 1.05, 1.11, .04, 'trim'); seg(a, b, r.H - .5, r.H, .22, 'trim'); }
    if (nb) {
      seg(-DOOR, DOOR, DOORH, r.H, 0, key); seg(-DOOR, DOOR, r.H - .5, r.H, .22, 'trim');
      seg(-DOOR - .6, -DOOR, 0, DOORH + .6, .14, 'frame'); seg(DOOR, DOOR + .6, 0, DOORH + .6, .14, 'frame'); seg(-DOOR, DOOR, DOORH, DOORH + .6, .14, 'frame');
      for (const s of [-1, 1]) dx ? box(cx + dx * R - (dx > 0 ? 0 : WT), cx + dx * R + (dx > 0 ? WT : 0), 0, DOORH, cz + s * DOOR - (s > 0 ? .04 : 0), cz + s * DOOR + (s > 0 ? 0 : .04), 'frame') : box(cx + s * DOOR - (s > 0 ? .04 : 0), cx + s * DOOR + (s > 0 ? 0 : .04), 0, DOORH, cz + dz * R - (dz > 0 ? 0 : WT), cz + dz * R + (dz > 0 ? WT : 0), 'frame');
      dx ? box(cx + dx * R - (dx > 0 ? 0 : WT), cx + dx * R + (dx > 0 ? WT : 0), DOORH - .02, DOORH, cz - DOOR, cz + DOOR, 'frame') : box(cx - DOOR, cx + DOOR, DOORH - .02, DOORH, cz + dz * R - (dz > 0 ? 0 : WT), cz + dz * R + (dz > 0 ? WT : 0), 'frame');
      sign(nb.name, cx + dx * (R - .16), DOORH + 1.05, cz + dz * (R - .16), Math.atan2(-dx, -dz));
      if (r === HOME) {   // close this doorway: a barrier the visitor can't pass, and an invisible pane you can tap
        blk(-DOOR, DOOR);
        const gx = cx + dx * R, gz = cz + dz * R;
        gates.push({ room: nb, x: gx, z: gz, nx: -dx, nz: -dz, armed: true });
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(DOOR * 2, DOORH), new THREE.MeshBasicMaterial({ visible: false }));
        pane.position.set(gx, DOORH / 2, gz); pane.rotation.y = Math.atan2(-dx, -dz); pane.userData.gate = gates.at(-1); scene.add(pane); gateMeshes.push(pane);
      }
    }
  }
  if (r.skylight) {
    const O = 11; // opening half size
    box(cx - R - WT, cx - O, r.H, r.H + .4, cz - R - WT, cz + R + WT, 'frame'); box(cx + O, cx + R + WT, r.H, r.H + .4, cz - R - WT, cz + R + WT, 'frame');
    box(cx - O, cx + O, r.H, r.H + .4, cz - R - WT, cz - O, 'frame'); box(cx - O, cx + O, r.H, r.H + .4, cz + O, cz + R + WT, 'frame');
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(O * 2, O * 2), new THREE.MeshBasicMaterial({ map: skyTex, toneMapped: false, color: 0xcfd4d8 })); sky.rotation.x = Math.PI / 2; sky.position.set(cx, r.H + .9, cz); scene.add(sky);
    for (let i = -O; i <= O; i += 5.5) { box(cx + i - .09, cx + i + .09, r.H + .1, r.H + .55, cz - O, cz + O, 'metal'); box(cx - O, cx + O, r.H + .1, r.H + .55, cz + i - .09, cz + i + .09, 'metal'); }
  } else {
    const g = new THREE.PlaneGeometry(R * 2 + 2 * WT, R * 2 + 2 * WT); g.rotateX(Math.PI / 2); g.translate(cx, r.H, cz);
    const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i));
    (bins.ceil = bins.ceil || []).push(g);
  }
}
function sign(text, x, y, z, ry, w = 5, h = .7) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 144; const g = c.getContext('2d');
  g.clearRect(0, 0, 1024, 144); g.fillStyle = '#efe0bb'; g.font = '500 66px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text.toUpperCase(), 512, 74, 980);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, color: 0xbbbbbb })); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m;
}
const labels = [];
function label(e, x, y, z, ry) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, 512, 256); g.strokeStyle = '#a99a78'; g.lineWidth = 3; g.strokeRect(10, 10, 492, 236);
  g.fillStyle = '#e8d9b4'; g.font = '500 40px Georgia, serif'; g.fillText(e.title, 30, 66, 452);
  g.fillStyle = '#d6d2c8'; g.font = '25px system-ui, sans-serif'; let line = '', yy = 112; for (const w of e.fact.split(' ')) { if (g.measureText(line + w).width > 450) { g.fillText(line, 30, yy); yy += 33; line = ''; } line += w + ' '; } g.fillText(line, 30, yy);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(.6, .3), new THREE.MeshBasicMaterial({ map: t, color: 0x999999, toneMapped: false })); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); labels.push(m);
}

function bench(x, z, ry) {
  const dir = Math.abs(Math.sin(ry)) > .5; const lx = dir ? .3 : 1.2, lz = dir ? 1.2 : .3;
  box(x - lx, x + lx, .4, .47, z - lz, z + lz, 'wood'); for (const a of [-.85, .85]) { const px = x + (dir ? 0 : a), pz = z + (dir ? a : 0); box(px - .22, px + .22, 0, .4, pz - .22, pz + .22, 'metal'); }
  solid.push({ x0: x - lx, x1: x + lx, z0: z - lz, z1: z + lz });
}

// ------------------------------------------------------------------ exhibits
const loader = new GLTFLoader(); const placed = []; const pickables = [];
for (const r of ROOMS) r.items = (EXHIBITS[r.id] || []).map(([file, kind, x, z, size, ry, title, fact, o = {}]) => ({ file, kind, x, z, size, ry, title, fact, o, room: r }));
const ALL = ROOMS.flatMap((r) => r.items);

function place(e, gltf) {
  const r = e.room, root = gltf.scene, wrap = new THREE.Group(); wrap.add(root); root.rotation.y = THREE.MathUtils.degToRad(e.ry); wrap.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(wrap, true), sz = b.getSize(new THREE.Vector3());
  const scale = e.o.h ? e.o.h / sz.y : e.size / Math.max(sz.x, sz.z); root.scale.setScalar(scale); wrap.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(wrap, true), c = bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3());
  const X = roomX(r) + e.x, Z = roomZ(r) + e.z; let base = 0;
  const near = Math.abs(e.x) > Math.abs(e.z) ? [Math.sign(e.x) * -1, 0] : [0, Math.sign(e.z || 1) * -1], labelRy = Math.atan2(near[0], near[1]);
  const add = (x0, x1, y1, z0, z1, k) => { box(x0, x1, 0, y1, z0, z1, k); const m = { x0, x1, z0, z1 }; plinths.push(m); solid.push(m); };
  const hx = s.x / 2, hz = s.z / 2;
  if (e.kind === 'p') { base = .32; add(X - hx - .45, X + hx + .45, base, Z - hz - .45, Z + hz + .45, 'plinth'); }
  if (e.kind === 'e' || e.kind === 'c') {
    base = e.o.h > 1 ? .55 : .95; const px = Math.max(hx + .16, .36), pz = Math.max(hz + .16, .36); add(X - px, X + px, base, Z - pz, Z + pz, 'ped');
    if (e.kind === 'c') { const gh = s.y + .2, gm = new THREE.Mesh(new THREE.BoxGeometry(px * 2, gh, pz * 2), glass); gm.position.set(X, base + gh / 2, Z); gm.renderOrder = 5; scene.add(gm); }
  }
  if (e.kind === 'h') { base = e.o.y - s.y / 2;
    const n = 4; for (let i = 0; i < n; i++) { const t = (i / (n - 1) - .5) * .7; const a = THREE.MathUtils.degToRad(e.ry); const wire = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1, 5), MAT.metal); const wx0 = X + Math.cos(a) * t * s.x * (sz.x > sz.z ? 1 : .2), wz0 = Z - Math.sin(a) * t * s.z; const y0 = base + s.y * .6; wire.scale.y = r.H - y0; wire.position.set(wx0, (r.H + y0) / 2, wz0); scene.add(wire); }
  }
  wrap.position.set(X - c.x, base - bb.min.y, Z - c.z);
  const mine = r === HOME;
  wrap.traverse((m) => { if (!m.isMesh) return; m.castShadow = e.kind !== 'h' && mine; m.receiveShadow = true; const mat = m.material; mat.side = THREE.FrontSide; mat.envMapIntensity = 1; if (e.o.cutDark) { mat.alphaTest = .5; mat.alphaHash = false; lit(mat, .25, 0, { uniforms: {}, pars: '', code: 'if (dot(diffuseColor.rgb, vec3(.33)) < .055) discard;' }); } else lit(mat, .25); mat.needsUpdate = true; if (mine) { m.userData.ex = e; pickables.push(m); } });
  scene.add(wrap); wrap.updateMatrixWorld(true);
  e.center = new THREE.Vector3(X, base + s.y / 2, Z); e.radius = Math.max(hx, hz, s.y / 2); e.hx = hx; e.hz = hz; e.dim = s.clone();
  if (e.kind !== 'h') { const lx = X + near[0] * (e.kind === 'p' ? hx + .46 : Math.max(hx + .16, .36) + .012), lz = Z + near[1] * (e.kind === 'p' ? hz + .46 : Math.max(hz + .16, .36) + .012); label(e, lx + (near[0] ? -near[0] * .001 : 0), e.kind === 'p' ? .17 + .22 : Math.max(.5, base - .28), lz, labelRy); }
  placed.push(e);
}

let floorMesh;
function finishBuilding() {
  for (const [k, list] of Object.entries(bins)) { const g = mergeGeometries(list, false); const m = new THREE.Mesh(g, MAT[k]); m.receiveShadow = k === 'floor' || k === 'plinth' || k === 'ped'; m.castShadow = k === 'plinth' || k === 'ped'; m.name = k; scene.add(m); if (k === 'floor') floorMesh = m; }
}

// ------------------------------------------------------------------ planar reflection of the floor
const RS = SMALL ? .35 : .6;
const rt = new THREE.WebGLRenderTarget(innerWidth * RS, innerHeight * RS, { type: THREE.HalfFloatType, samples: 0 });
uReflect.uRefl.value = rt.texture;
const camR = new THREE.PerspectiveCamera(); const tgt = new THREE.Vector3(), fw = new THREE.Vector3();
function renderReflection() {
  cam.getWorldDirection(fw); tgt.copy(cam.position).add(fw);
  camR.position.set(cam.position.x, -cam.position.y, cam.position.z);
  camR.up.copy(cam.up).applyQuaternion(cam.quaternion); camR.up.y *= -1;
  camR.lookAt(tgt.x, -tgt.y, tgt.z); camR.projectionMatrix.copy(cam.projectionMatrix); camR.updateMatrixWorld(true); camR.matrixWorldInverse.copy(camR.matrixWorld).invert();
  uReflect.uRM.value.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1).multiply(camR.projectionMatrix).multiply(camR.matrixWorldInverse);
  floorMesh.visible = false; const lv = labels.map((l) => l.visible); labels.forEach((l) => { l.visible = false; });
  renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camR); renderer.setRenderTarget(null);
  floorMesh.visible = true; labels.forEach((l, i) => { l.visible = lv[i]; });
}

// ------------------------------------------------------------------ walking
const START = { x: roomX(HOME), z: roomZ(HOME) + 12.5, yaw: 0 };
const ctl = { x: START.x, z: START.z, yaw: START.yaw, pitch: .02, vx: 0, vz: 0, keys: {}, inspect: null, a: 0, dist: 5, joy: { x: 0, y: 0 } };
const EYE = 1.62, RAD = .36;
function collide(p) { for (const b of solid) { const nx = clamp(p.x, b.x0, b.x1), nz = clamp(p.z, b.z0, b.z1), dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz; if (d2 >= RAD * RAD) continue; if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (RAD - d) / d; p.x += dx * k; p.z += dz * k; } else { const l = p.x - b.x0, r = b.x1 - p.x, t = p.z - b.z0, u = b.z1 - p.z, m = Math.min(l, r, t, u); if (m === l) p.x = b.x0 - RAD; else if (m === r) p.x = b.x1 + RAD; else if (m === t) p.z = b.z0 - RAD; else p.z = b.z1 + RAD; } } }
// keep the visitor inside the open gallery, whatever happens
const inside = (p) => { const lim = R - RAD; p.x = clamp(p.x, roomX(HOME) - lim, roomX(HOME) + lim); p.z = clamp(p.z, roomZ(HOME) - lim, roomZ(HOME) + lim); };

// Pointer: drag to look (mouse or a finger); a quick tap picks an exhibit or a doorway. Double-click locks the mouse.
let look = null; const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
canvas.addEventListener('pointerdown', (e) => { if (gateOpen) return; look = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() }; canvas.setPointerCapture(e.pointerId); canvas.focus(); hideHelp(); });
canvas.addEventListener('pointermove', (e) => {
  if (document.pointerLockElement === canvas) return turn(e.movementX, e.movementY);
  if (!look || look.id !== e.pointerId) return;
  const dx = e.clientX - look.x, dy = e.clientY - look.y; look.x = e.clientX; look.y = e.clientY;
  turn(dx * (e.pointerType === 'touch' ? 1.35 : 1), dy * (e.pointerType === 'touch' ? 1.35 : 1));
});
const endLook = (e) => {
  if (!look || look.id !== e.pointerId) return;
  if (Math.hypot(e.clientX - look.x0, e.clientY - look.y0) < 8 && performance.now() - look.t < 400) tap(e.clientX, e.clientY);
  look = null;
};
canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', () => { look = null; });
canvas.addEventListener('dblclick', () => { if (!TOUCH) canvas.requestPointerLock?.(); });
function turn(mx, my) { const s = .0026; if (ctl.inspect) { ctl.a -= mx * s * 1.4; return; } ctl.yaw -= mx * s; ctl.pitch = clamp(ctl.pitch - my * s, -1.3, 1.3); }
addEventListener('wheel', (e) => { if (ctl.inspect) ctl.dist = clamp(ctl.dist * (1 + Math.sign(e.deltaY) * .1), ctl.inspect.radius * 1.1, ctl.inspect.radius * 5); }, { passive: true });
function tap(x, y) {
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
  const hits = ray.intersectObjects([...pickables, ...gateMeshes], false);
  const h = hits.find((q) => q.object.userData.gate || q.object.userData.ex);
  if (!h) return;
  if (h.object.userData.gate && h.distance < 40) return openGate(h.object.userData.gate.room, false);
  if (h.object.userData.ex) { pinned = h.object.userData.ex; pinnedUntil = performance.now() + 7000; showCard(pinned); }
}

// Touch joystick (bottom left): push to walk.
const joy = $('joy'), knob = $('knob'); let joyId = null;
if (TOUCH) joy.hidden = false;
const joyMove = (e) => { const b = joy.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2, r = b.width / 2; let dx = (e.clientX - cx) / r, dy = (e.clientY - cy) / r; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } ctl.joy.x = dx; ctl.joy.y = -dy; knob.style.transform = `translate(${dx * r * .55}px, ${dy * r * .55}px)`; };
joy.addEventListener('pointerdown', (e) => { if (gateOpen) return; joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); hideHelp(); e.preventDefault(); });
joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = (e) => { if (e.pointerId !== joyId) return; joyId = null; ctl.joy.x = ctl.joy.y = 0; knob.style.transform = ''; };
joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);

addEventListener('keyup', (e) => { ctl.keys[e.code] = false; });
addEventListener('keydown', (e) => {
  if (gateOpen) { if (e.code === 'Escape') closeGate(); return; }
  ctl.keys[e.code] = true; if (/^(Key[WASD]|Arrow)/.test(e.code)) hideHelp();
  if (e.code === 'KeyE') toggleInspect(); if (e.code === 'KeyH') { const h = $('help'); h.classList.toggle('on'); } if (e.code === 'KeyF') { const f = $('fps'); f.style.display = f.style.display === 'block' ? 'none' : 'block'; } if (e.code === 'KeyM') { const m = $('map'); m.hidden = !m.hidden; }
  if (e.code === 'KeyR') Object.assign(ctl, { x: START.x, z: START.z, yaw: START.yaw, pitch: .02, inspect: null, vx: 0, vz: 0 });
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
function toggleInspect() { if (ctl.inspect) { ctl.inspect = null; showCard(near); return; } const e = pinned || near; if (e) { ctl.inspect = e; ctl.a = Math.atan2(ctl.x - e.center.x, ctl.z - e.center.z); ctl.dist = clamp(e.radius * 2.4, 1.3, 26); showCard(e); } }
$('cGo').addEventListener('click', toggleInspect);

// The exhibit card: the nearest exhibit you face (or the one you tapped).
let near = null, pinned = null, pinnedUntil = 0, shownCard = null;
function showCard(e) {
  shownCard = e;
  if (e) { $('cT').textContent = e.title; $('cF').textContent = e.fact; $('cGo').textContent = ctl.inspect ? 'Step back' : 'Look closely'; $('cK').textContent = ctl.inspect ? (TOUCH ? 'Drag to walk around it' : 'Drag to walk around it, wheel to zoom, E to step back') : (TOUCH ? '' : 'or press E'); }
  $('card').classList.toggle('on', !!e);
}
function pickNear() {
  fw.set(-Math.sin(ctl.yaw), 0, -Math.cos(ctl.yaw)); let best = null, bv = 1e9;
  for (const e of placed) { if (e.room !== HOME) continue; const dx = e.center.x - ctl.x, dz = e.center.z - ctl.z, d = Math.hypot(dx, dz), reach = Math.max(4.2, e.radius + 4.5); if (d > reach) continue; const dot = (dx * fw.x + dz * fw.z) / (d || 1); if (dot < .55) continue; const v = (d - Math.min(e.radius, 3)) * (2 - dot) + (e.kind === 'h' ? 6 : 0); if (v < bv) { bv = v; best = e; } }
  near = best;
  if (pinned && performance.now() > pinnedUntil) pinned = null;
  const want = ctl.inspect || pinned || near;
  if (want !== shownCard) showCard(want);
}

// ------------------------------------------------------------------ the doorways: "<gallery> is waiting for you"
let gateOpen = null;
function openGate(room, fromWalk) {
  if (gateOpen) return;
  gateOpen = room;
  Object.keys(ctl.keys).forEach((k) => { ctl.keys[k] = false; }); ctl.joy.x = ctl.joy.y = 0; knob.style.transform = ''; ctl.vx = ctl.vz = 0; look = null;
  if (document.pointerLockElement) document.exitPointerLock();
  $('gName').textContent = room.name; $('gLine').textContent = room.line ?? '';
  $('gate').hidden = false; requestAnimationFrame(() => $('gate').classList.add('on'));
  setTimeout(() => $('gStay').focus(), 50);
  for (const g of gates) if (fromWalk && g.room === room) g.armed = false;
}
function closeGate() {
  if (!gateOpen) return;
  const g = gates.find((q) => q.room === gateOpen);
  gateOpen = null; $('gate').classList.remove('on'); setTimeout(() => { if (!gateOpen) $('gate').hidden = true; }, 300);
  // a gentle step back into the gallery
  const d = g ? (ctl.x - g.x) * g.nx + (ctl.z - g.z) * g.nz : 9;
  if (g && d < 3) { ctl.vx = g.nx * 5; ctl.vz = g.nz * 5; ctl.yaw = Math.atan2(-g.nx, -g.nz) + Math.PI; }
  canvas.focus();
}
$('gStay').addEventListener('click', closeGate);
$('gate').addEventListener('click', (e) => { if (e.target === $('gate')) closeGate(); });
function checkGates() {
  for (const g of gates) {
    const d = (ctl.x - g.x) * g.nx + (ctl.z - g.z) * g.nz, along = Math.abs((ctl.x - g.x) * g.nz - (ctl.z - g.z) * g.nx);   // d = distance into the room from the doorway
    if (d > 3) g.armed = true;
    if (g.armed && d < 1.5 && along < DOOR + .6) openGate(g.room, true);
  }
}

function step(dt) {
  if (ctl.inspect) { const e = ctl.inspect, y = Math.max(1.2, e.center.y + e.radius * .15); const rm = e.room, lim = R - .7, px = clamp(e.center.x + Math.sin(ctl.a) * ctl.dist, roomX(rm) - lim, roomX(rm) + lim), pz = clamp(e.center.z + Math.cos(ctl.a) * ctl.dist, roomZ(rm) - lim, roomZ(rm) + lim); cam.position.lerp(new THREE.Vector3(px, Math.min(y, rm.H - 1), pz), 1 - Math.exp(-dt * 6)); cam.lookAt(e.center); return; }
  const k = ctl.keys, j = ctl.joy, jm = Math.min(1, Math.hypot(j.x, j.y));
  let f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), s = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
  let run = k.ShiftLeft || k.ShiftRight ? 7.5 : 3.6;
  if (jm > .08) { f = j.y; s = j.x; run = 1.6 + 4.2 * jm; }
  const sy = Math.sin(ctl.yaw), cy = Math.cos(ctl.yaw), l = Math.hypot(f, s) || 1, tx = (-sy * f + cy * s) / l * run * Math.min(1, Math.hypot(f, s)), tz = (-cy * f - sy * s) / l * run * Math.min(1, Math.hypot(f, s)), a = 1 - Math.exp(-dt * (gateOpen ? 3 : 11));
  ctl.vx += ((gateOpen ? 0 : tx) - ctl.vx) * a; ctl.vz += ((gateOpen ? 0 : tz) - ctl.vz) * a;
  ctl.x += ctl.vx * dt; ctl.z += ctl.vz * dt; collide(ctl); inside(ctl);
  if (!gateOpen) checkGates();
  cam.position.lerp(new THREE.Vector3(ctl.x, EYE, ctl.z), Math.min(1, dt * 22)); cam.rotation.set(ctl.pitch, ctl.yaw, 0, 'YXZ');
}

// ------------------------------------------------------------------ map: the whole museum; only this gallery is open
const mapC = $('map'), mg = mapC.getContext('2d'), MS = 408 / WORLD, MO = 204;
function drawMap() {
  mg.clearRect(0, 0, 408, 408); mg.font = '600 21px Inter, system-ui'; mg.textAlign = 'center'; mg.textBaseline = 'middle';
  for (const r of ROOMS) {
    const x = MO + roomX(r) * MS, z = MO + roomZ(r) * MS, h = 64, me = r === HOME;
    mg.fillStyle = me ? 'rgba(108,196,255,.30)' : 'rgba(255,255,255,.07)'; mg.fillRect(x - h, z - h, h * 2, h * 2);
    mg.strokeStyle = me ? 'rgba(108,196,255,.9)' : 'rgba(255,255,255,.14)'; mg.lineWidth = 2; mg.strokeRect(x - h + 1, z - h + 1, h * 2 - 2, h * 2 - 2);
    mg.fillStyle = me ? '#eaf6ff' : 'rgba(255,255,255,.55)'; const w = r.name.split(' '); const lines = w.length > 2 ? [w.slice(0, 2).join(' '), w.slice(2).join(' ')] : [r.name]; lines.forEach((t, i) => mg.fillText(t, x, z + (i - (lines.length - 1) / 2) * 24, 120));
  }
  mg.fillStyle = 'rgba(255,178,94,.85)'; for (const d of doors()) mg.fillRect(MO + (d.x - d.hx) * MS, MO + (d.z - d.hz) * MS, d.hx * 2 * MS, d.hz * 2 * MS);
}
function drawYou() {   // you-are-here dot over the map
  drawMap(); const x = MO + ctl.x * MS, z = MO + ctl.z * MS;
  mg.fillStyle = '#ffb25e'; mg.beginPath(); mg.arc(x, z, 6, 0, 6.283); mg.fill();
  mg.strokeStyle = '#ffb25e'; mg.lineWidth = 3; mg.beginPath(); mg.moveTo(x, z); mg.lineTo(x - Math.sin(ctl.yaw) * 16, z - Math.cos(ctl.yaw) * 16); mg.stroke();
}
mapC.addEventListener('click', (e) => { const b = mapC.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * WORLD - WORLD / 2, z = (e.clientY - b.top) / b.height * WORLD - WORLD / 2, r = ROOMS.find((q) => Math.abs(x - roomX(q)) <= CELL / 2 && Math.abs(z - roomZ(q)) <= CELL / 2); if (r && r !== HOME) openGate(r, false); });

// ------------------------------------------------------------------ help hint
let helpShown = false;
function showHelp() { $('help').classList.add('on'); helpShown = true; setTimeout(hideHelp, 9000); }
function hideHelp() { if (helpShown) { $('help').classList.remove('on'); helpShown = false; } }

addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); rt.setSize(innerWidth * RS, innerHeight * RS); });
function draw() { renderReflection(); renderer.render(scene, cam); }
let last = performance.now(), fa = 0, fn = 0, mapT = 0, running = false;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (document.hidden || !running) return;                         // nothing to draw while the tab is hidden
  step(dt); pickNear(); draw();
  mapT += dt; if (mapT > .2 && !mapC.hidden) { mapT = 0; drawYou(); }
  fa += dt; fn++; if (fa > .5) { $('fps').textContent = `${Math.round(fn / fa)} fps`; window.ZQ_FPS = Math.round(fn / fa); fa = 0; fn = 0; }
}

async function main() {
  ROOMS.forEach(buildRoom);
  bench(roomX(HOME) - 13, roomZ(HOME) + 7.8, Math.PI / 2);
  let done = 0; const list = ALL, failures = [];
  await Promise.all(Array.from({ length: 6 }, async () => { while (list[done] !== undefined) { const e = list[done++]; try { place(e, await loader.loadAsync(`models/${e.file}.glb`)); } catch (x) { failures.push(e.file + ': ' + x.message); console.error('exhibit failed', e.file, x); } setLoad(placed.length < ALL.length ? `Placing the giants… ${placed.length} of ${ALL.length}` : 'Lighting the gallery…', placed.length / ALL.length); } }));
  finishBuilding(); paintField();
  renderer.shadowMap.needsUpdate = true; cam.position.set(ctl.x, EYE, ctl.z); cam.rotation.set(ctl.pitch, ctl.yaw, 0, 'YXZ');
  pickNear(); drawYou(); draw(); window.ZQ_FAIL = failures;
  $('loadTxt').textContent = 'The Dinosaur Gallery is ready'; $('loadBar').style.width = '100%';
  const go = () => { $('load').classList.add('gone'); setTimeout(() => $('load').remove(), 700); running = true; document.body.classList.add('in'); canvas.focus(); showHelp(); };
  if (TEST) go(); else { $('enter').hidden = false; $('enter').focus(); $('enter').addEventListener('click', go, { once: true }); }
  requestAnimationFrame(loop);
  window.ZQ = { ctl, gates, gateOpen: () => gateOpen?.name ?? null, card: () => ($('card').classList.contains('on') ? $('cT').textContent : null), fps: () => window.ZQ_FPS, step: (dt, n) => { for (let i = 0; i < n; i++) step(dt); }, project(file) { const e = placed.find((q) => q.file === file); const v = e.center.clone().project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, v.z]; }, placed: () => placed.map((e) => e.file) };
  window.ZQ_READY = true;
}
main().catch((e) => { console.error(e); window.ZQ_ERR = e.message + '\n' + e.stack; setLoad('Could not open the gallery: ' + e.message, 0); });
