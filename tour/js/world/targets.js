import * as THREE from 'three';
import { glowTexture, roundTexture } from '../../../js/three/parts.js';
import { clip, show } from '../../../js/three/videos.js';
import { near } from '../../../js/three/path.js';
import { SECTIONS } from '../../../js/data/tour.js';
import { makeUniverse } from './universe.js';
// One target per SECTION of the tour (js/data/tour.js), in visiting order, placed beside the glowing path.
// 'walk'  = one big screen playing the student walkthrough.
// 'shelf' = the section's clips side by side: the chosen one big and square-on, its neighbours turned away at the sides;
//           the ‹ › control slides the shelf. Only the chosen clip plays video, the rest show their posters.
// 'brain' = the live diverging brain.  'end' = the closing ring.

const tmp = new THREE.Vector3();
const GLOW = 0x4aa8ff;          // cold blue: screen halos, the portal and end rings
export const PORTAL_U = .05;    // where the entrance portal stands on the path
export const PORTAL_EXIT = .085;
const POSTERS = new URL('../../../assets/posters/', import.meta.url).href;
const U = { dashboard: .12, videos: .2, interactive: .28, quiz: .36, notes: .43, weekly: .5, sage: .57, games: .64, hub: .72, brain: .8, grown: .9, contact: .995 };
const SIDE = { dashboard: 2.4, videos: -2.6, interactive: 2.6, quiz: -2.4, notes: 2.4, weekly: -2.4, sage: 2.4, games: -2.4, hub: 2.8, grown: 0 };

// Place `obj` near the path and turn it to face the camera arriving from path position `from`.
function place(obj, curve, u, side, up, from) {
  obj.position.copy(near(curve, u, side, up));
  obj.lookAt(near(curve, from, 0, 1));
  obj.updateMatrixWorld();
}
const dockInfo = (obj) => ({ pos: obj.getWorldPosition(new THREE.Vector3()), normal: obj.getWorldDirection(new THREE.Vector3()) });
const ring = (r) => new THREE.Mesh(new THREE.TorusGeometry(r, .04, 16, 200), new THREE.MeshBasicMaterial({ color: new THREE.Color(GLOW).multiplyScalar(4), toneMapped: false }));
const halo = (w) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.7, w / 1.6 * 2.1), new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(GLOW).multiplyScalar(.3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.z = -.06;
  return m;
};

// Posters: one texture per clip key, cropped to the 16:10 screen like the videos are.
const loader = new THREE.TextureLoader(), posters = new Map();
function poster(c) {
  const k = c.key + (c.crop ?? '');
  if (!posters.has(k)) {
    const t = loader.load(`${POSTERS}${c.key}.jpg`);
    t.colorSpace = THREE.SRGBColorSpace;
    if (c.crop) { const r = 1.6 / c.crop; t.repeat.set(r, 1); t.offset.set((1 - r) / 2, 0); }
    posters.set(k, t);
  }
  return posters.get(k);
}
const screenMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, alphaMap: roundTexture(), transparent: true, toneMapped: false, side: THREE.DoubleSide });

// A shelf of clips. index = the chosen item; the layout eases towards it every frame.
function makeShelf(scene, sec, W) {
  const g = new THREE.Group(), geo = new THREE.PlaneGeometry(W, W / 1.6), glow = halo(W);
  scene.add(g);
  const items = sec.items.map((it) => {
    const m = new THREE.Mesh(geo, screenMat());
    m.visible = false;
    g.add(m);
    return { it, m, shown: null };
  });
  g.add(glow);
  const s = { group: g, items, index: 0, cur: 0 };
  s.set = (i) => { s.index = Math.max(0, Math.min(items.length - 1, i)); };
  // Lay the shelf out around the eased position `cur`; d = an item's distance from the chosen spot (in items).
  s.update = (dt, dim) => {
    s.cur += (s.index - s.cur) * Math.min(1, dt * 7);
    const off = W * .8, step = W * .32;
    items.forEach((e, i) => {
      const d = i - s.cur, ad = Math.abs(d), sg = Math.sign(d), m = e.m;
      m.visible = ad < 3.6;
      if (!m.visible) return;
      const n1 = Math.min(ad, 1);
      m.position.set(sg * (ad < 1 ? ad * off : off + (ad - 1) * step), 0, -n1 * W * .45 - Math.max(0, ad - 1) * W * .1);
      m.rotation.set(0, -sg * n1 * 1.0, 0);
      m.scale.setScalar(1 - .2 * n1);
      m.renderOrder = 10 - Math.round(ad);
      m.material.opacity = (ad < 1 ? 1 - .5 * ad : .5 * (1 - (ad - 1) / 2.6)) * (1 - dim * .95);
    });
    glow.material.opacity = (1 - Math.min(1, Math.abs(s.index - s.cur) * 2)) * (1 - dim);
  };
  // Textures: the chosen item plays its clip (when the camera is near), the others show posters.
  s.feed = (camPos, force) => {
    let live = null;
    items.forEach((e, i) => {
      if (!e.m.visible) return;
      const playing = i === s.index && (force || g.getWorldPosition(tmp).distanceTo(camPos) < 30);
      if (playing) { const v = clip(e.it.clip.key, e.it.clip); show(e.m.material, v); live = v; e.shown = 'video'; }
      else if (e.shown !== 'poster') { e.m.material.map = poster(e.it.clip); e.m.material.needsUpdate = true; e.shown = 'poster'; }
    });
    return live;
  };
  return s;
}

export function makeTargets(scene, curve, overlay, fov) {
  const targets = [];

  // The entrance: the eclipse ring with a slow swirling portal inside it and a soft corona behind.
  const portal = (() => {
    const g = new THREE.Group(), r = ring(2.3);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.27, 128), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
      uniforms: { t: { value: 0 }, k: { value: 1 } },
      vertexShader: 'varying vec2 v; void main(){ v = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `uniform float t, k; varying vec2 v;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
          return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){
          float r = length(v), a = atan(v.y, v.x);
          vec2 q = vec2(a * 2.2 + r * 5. - t * .35, r * 3. - t * .5);
          float s = n(q * 1.7) * .6 + n(q * 3.9 + 4.) * .4;
          float rim = smoothstep(.55, 1., r), core = smoothstep(.0, .5, r);
          vec3 c = mix(vec3(.55, .35, 1.), vec3(.3, .7, 1.), smoothstep(.35, 1., r + s * .3));
          float al = (s * .55 + rim * .65) * core * (1. - smoothstep(.97, 1., r)) * k;
          gl_FragColor = vec4(c * al * .9, al);
        }`,
    }));
    disc.position.z = -.01;
    const corona = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(GLOW).multiplyScalar(.3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    corona.position.z = -.4;
    g.add(corona, disc, r);
    scene.add(g);
    place(g, curve, PORTAL_U, 0, .7, 0);
    return { g, update(t, k) { r.rotation.z = t * .1; disc.material.uniforms.t.value = t; disc.material.uniforms.k.value = k; } };
  })();

  SECTIONS.forEach((sec) => {
    const u = U[sec.key] ?? .5, side = SIDE[sec.key] ?? 2.4, base = { key: sec.key, sec, label: sec.label, u, cap: { kick: sec.kick, title: sec.title } };

    if (sec.type === 'walk') {
      const W = 4, m = new THREE.Mesh(new THREE.PlaneGeometry(W, W / 1.6), screenMat());
      m.add(halo(W));
      m.material.map = poster(sec.clip);
      scene.add(m);
      place(m, curve, u + .01, side, 1, u - .04);
      const feed = (camPos, force) => {
        if (!force && m.getWorldPosition(tmp).distanceTo(camPos) > 30) return null;
        const e = clip(sec.clip.key, sec.clip); show(m.material, e); return e;
      };
      targets.push({ ...base, obj: m, w: W, h: W / 1.6, ...dockInfo(m), walk: true, feed });
    } else if (sec.type === 'shelf') {
      const W = sec.key === 'grown' ? 3.8 : 3.4, s = makeShelf(scene, sec, W);
      place(s.group, curve, u + .01, side, 1.05, u - .04);
      targets.push({ ...base, obj: s.group, w: W * 1.25, h: W / 1.6, ...dockInfo(s.group), shelf: s, feed: s.feed });
    } else if (sec.type === 'brain') {
      const uni = makeUniverse(overlay, fov), film = { t: 0 };
      uni.group.scale.setScalar(.55);
      scene.add(uni.group);
      place(uni.group, curve, u, -7, 1.2, u);       // +z of the group faces the path, so the film's camera starts on our side
      targets.push({ ...base, obj: uni.group, w: 4, h: 3, ...dockInfo(uni.group), universe: uni, film,
        pose: (q, out) => uni.pose(film.t, out), poseLook: (q, out) => uni.group.getWorldPosition(out),
        cap: { kick: sec.kick, title: sec.lines[0][1], sub: sec.sub } });
    } else if (sec.type === 'end') {
      const r = ring(2.3);
      scene.add(r);
      place(r, curve, .995, 0, .7, .95);
      targets.push({ ...base, obj: r, w: 5.2, h: 5.2, ...dockInfo(r), pathU: .95, end: true, cap: { title: sec.title },
        update: ({ t }) => { r.rotation.z = t * .1; } });
    }
  });

  return { targets, portal };
}
