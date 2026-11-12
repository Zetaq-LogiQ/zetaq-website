import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// The diverging brain, live: the same scene as the "universe" film (ZetaQ_Brochure/tools/universe/u.js),
// driven by scroll instead of a clock. 8 signals of a child's learning branch into a universe of signals and a matrix,
// link into the Learning Brain, then report out to parents and teachers.
// update(t) takes film time in seconds (0..LEN). pose(t) gives the film's orbiting camera, in world space.

export const LEN = 16.5;
const FILM_FOV = 38;
const clamp = (x) => Math.max(0, Math.min(1, x)), sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

const FAM = [
  ['Guesswork', 0xff5a4d, ['Rapid guessing', 'Answer changes', 'Chance vs real effort']],
  ['Attentiveness', 0xffb02e, ['Time on task', 'Late-session drop', 'Tab switches']],
  ['Numerical reasoning', 0x4fc3ff, ['Decimals', 'Ratio sense', 'Estimation']],
  ['Language skill', 0xc77dff, ['Reading', 'Vocabulary', 'Comprehension']],
  ['Prerequisite gaps', 0xff6fb5, ['Root cause', 'Earlier-class skills', 'Skill map']],
  ['Improvement pattern', 0x4fe08a, ['Learning curve', 'Stuck vs struggling', 'Growth']],
  ['Memory', 0x5ee7df, ['Forgetting', 'Revision due', 'Retention']],
  ['Confidence', 0xf7e463, ['Help-seeking', 'Persistence', 'Speed vs accuracy']],
];

// overlay: an element over the canvas that holds the signal labels and the two report cards.
export function makeUniverse(overlay, fov) {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const group = new THREE.Group();
  // The film was framed for a 38 degree lens; the tour uses a wider one, so the camera sits closer by this much.
  // (Then 15% further back again, to leave room for the caption above.)
  const near = 1.15 * Math.tan(THREE.MathUtils.degToRad(FILM_FOV / 2)) / Math.tan(THREE.MathUtils.degToRad(fov / 2));

  // ---- The branching tree ----
  const N = FAM.length, GEN = 8, segs = [], leaves = [], nodes = [];
  const grow = (p, d, L, g, f) => {
    const e = p.clone().addScaledVector(d, L); segs.push([p, e, f, g]); nodes.push([e, f, g]);
    if (g === GEN) { leaves.push([e, f]); return; }
    for (let k = 0; k < 2; k++) {
      const ax = new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).cross(d).normalize();
      grow(e, d.clone().applyAxisAngle(ax, (.32 + rnd() * .42) * (k ? 1 : -1)).normalize(), L * (.74 + rnd() * .1), g + 1, f);
    }
  };
  const dirs = [];
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2 + .35, y = i % 2 ? .3 : -.3; dirs.push(new THREE.Vector3(Math.cos(a), y, Math.sin(a) * .55).normalize()); }
  dirs.forEach((d, f) => grow(new THREE.Vector3(), d, 1.5, 0, f));
  segs.sort((a, b) => a[3] - b[3]);
  const col = FAM.map((f) => new THREE.Color(f[1]));
  const pos = new Float32Array(segs.length * 6), cl = new Float32Array(segs.length * 6), startOf = Array(GEN + 2).fill(segs.length);
  segs.forEach((s, i) => {
    pos.set([...s[0].toArray(), ...s[1].toArray()], i * 6);
    const c = col[s[2]], k = 1.1 - s[3] * .05;
    cl.set([c.r * k, c.g * k, c.b * k, c.r * k, c.g * k, c.b * k], i * 6);
    if (startOf[s[3]] === segs.length) startOf[s[3]] = i;
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  lg.setAttribute('color', new THREE.BufferAttribute(cl, 3));
  const tree = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  group.add(tree);

  const dotTex = (() => {
    const c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 }), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, '#fff'); g.addColorStop(.3, '#ffffffaa'); g.addColorStop(1, '#fff0');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const pts = (p, c, size, op) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex, size, vertexColors: true, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false }));
    group.add(m);
    return m;
  };
  nodes.sort((a, b) => a[2] - b[2]);
  const np = new Float32Array(nodes.length * 3), nc = new Float32Array(nodes.length * 3);
  nodes.forEach((n, i) => { np.set(n[0].toArray(), i * 3); nc.set(col[n[1]].toArray(), i * 3); });
  const nodeP = pts(np, nc, .13, 1);

  // ---- The matrix lattice ----
  const L3 = [], LC = [];
  for (let i = -13; i <= 13; i++) for (let j = -8; j <= 8; j++) for (let k = -8; k <= 8; k++) { L3.push(i * .78, j * .78, k * .78); LC.push(.3, .55, .8); }
  const lat = pts(new Float32Array(L3), new Float32Array(LC), .075, 0);

  // ---- Numbers on the leaves ----
  const TX = [];
  for (let i = 0; i < 16; i++) {
    const c = Object.assign(document.createElement('canvas'), { width: 128, height: 64 }), x = c.getContext('2d');
    x.font = '800 44px Consolas,monospace'; x.fillStyle = '#fff'; x.textAlign = 'center';
    x.fillText((rnd() * .98 + .01).toFixed(2), 64, 48);
    TX.push(new THREE.CanvasTexture(c));
  }
  const nums = [];
  for (let i = 0; i < 300; i++) {
    const [p, f] = leaves[Math.floor(rnd() * leaves.length)];
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX[i % 16], color: col[f], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.position.copy(p).addScaledVector(new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5), .5);
    m.scale.set(.55, .27, 1);
    group.add(m);
    nums.push(m);
  }

  // ---- Links and the flow into the brain ----
  const SURF = 2.5, lp = [], lc = [];
  leaves.forEach(([p, f], i) => {
    if (i % 3) return;
    const c = col[f], q = p.clone().normalize().multiplyScalar(SURF);
    lp.push(...p.toArray(), ...q.toArray()); lc.push(c.r * .5, c.g * .5, c.b * .5, c.r, c.g, c.b);
  });
  const lgg = new THREE.BufferGeometry();
  lgg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  lgg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
  const links = new THREE.LineSegments(lgg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  group.add(links);
  const FL = 1800, fp = new Float32Array(FL * 3), fc = new Float32Array(FL * 3), fi = [], fo = [];
  for (let i = 0; i < FL; i++) { const l = leaves[Math.floor(rnd() * leaves.length)]; fi.push(l[0]); fo.push(rnd()); fc.set(col[l[1]].toArray(), i * 3); }
  const flow = pts(fp, fc, .17, 0);

  // ---- The Learning Brain (an anatomical model, drawn as a glowing glass shell). Loaded only when asked. ----
  let gm = null, loading = false;
  const load = () => {
    if (loading) return;
    loading = true;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(new URL('../../../assets/brain_atlas.glb', import.meta.url).href, (g) => {
      const brain = g.scene;
      const KEEP = /Cerebral Hemisphere|Cerebellum|Brainstem|Corpus Callosum|Thalamus|Hippocampus|Amygdala|Caudate|Putamen|Lateral Ventricles|Diencephalon/;
      const keep = [];
      brain.traverse((o) => {
        if (!o.isMesh) return;
        const n = ((o.name || '') + ' ' + (o.parent ? o.parent.name : '')).replace(/_/g, ' ');
        if (/Cut/.test(n) || !KEEP.test(n)) { o.visible = false; return; }
        keep.push(o);
      });
      brain.updateMatrixWorld(true);
      const b = new THREE.Box3();
      keep.forEach((o) => b.expandByObject(o));
      const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()), k = 5.6 / Math.max(s.x, s.y, s.z);
      brain.scale.setScalar(k);
      brain.position.copy(c).multiplyScalar(-k);
      gm = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, depthTest: false, uniforms: { o: { value: 0 } },
        vertexShader: 'varying vec3 n; varying vec3 e; void main(){ vec4 p = modelViewMatrix * vec4(position,1.); n = normalize(normalMatrix*normal); e = normalize(-p.xyz); gl_Position = projectionMatrix*p; }',
        fragmentShader: 'uniform float o; varying vec3 n; varying vec3 e; void main(){ float f = pow(1.-abs(dot(normalize(n),normalize(e))),1.6); vec3 c = mix(vec3(.05,.3,.5), vec3(.55,.95,1.), f); gl_FragColor = vec4(c, o*(.3+.7*f)); }',
      });
      keep.forEach((o) => { o.material = gm; o.renderOrder = 5; });
      group.add(brain);
    });
  };

  // ---- Labels and report cards (HTML over the canvas) ----
  const el = (cls, text, color) => {
    const e = overlay.appendChild(document.createElement('div'));
    e.className = cls; e.textContent = text;
    if (color) { e.style.color = color; e.style.borderColor = color; }
    return e;
  };
  const hex = (c) => '#' + new THREE.Color(c).getHexString();
  const mains = FAM.map((f, i) => ({ e: el('u-m', f[0], hex(f[1])), p: dirs[i].clone().multiplyScalar(2.05) }));
  const subs = [];
  FAM.forEach((f, i) => f[2].forEach((n, j) => {
    const cand = nodes.filter((q) => q[1] === i && q[2] === 3 + j);
    subs.push({ e: el('u-s', n, hex(f[1])), p: cand[Math.floor(rnd() * cand.length)][0], at: 3.4 + (i * 3 + j) * .17 });
  }));
  const card = (side, head, lines) => {
    const c = overlay.appendChild(document.createElement('div'));
    c.className = 'u-c ' + side;
    c.innerHTML = `<h4>${head}</h4>` + lines.map((l) => `<div>${l}</div>`).join('');
    return c;
  };
  const cards = [card('l', 'Parents', ['How my child learns', 'Where they are stuck', 'What to do this week']),
    card('r', 'Teachers', ['Who needs help', 'On which skill', 'And why'])];

  const V = new THREE.Vector3();
  const place = (e, p, o, cam, W, H) => {
    V.copy(p); group.localToWorld(V).project(cam);
    e.style.transform = `translate(${(V.x + 1) / 2 * W}px, ${(1 - V.y) / 2 * H}px) translate(-50%, -50%)`;
    e.style.opacity = V.z < 1 ? o : 0;
  };

  let shown = 1;
  return {
    group, load,
    // The film's camera at time t, in world space.
    pose(t, outP, outL) {
      const sp = t * .13, dist = (6.8 + 11.6 * sm((t - 2.9) / 6.2) - 4.2 * sm((t - 10.4) / 2)) * near, h = (1.2 + 2.2 * sm((t - 2.9) / 6)) * near;
      outP.set(Math.sin(sp) * dist, h, Math.cos(sp) * dist);
      group.localToWorld(outP);
      if (outL) group.getWorldPosition(outL);
      return outP;
    },
    // Draw film time t. vis (0..1) fades the HTML labels and cards with the camera's docking.
    update(t, cam, W, H, vis, clock) {
      const rd = clamp((t - .2) / 2.5), g = t < 2.9 ? 0 : Math.min(GEN, 1 + (t - 2.9) / 4.2 * GEN);
      let seg;
      if (t < 2.9) seg = Math.ceil(rd * startOf[1]);
      else { const a = Math.floor(g), f = g - a, s0 = startOf[a] ?? segs.length, s1 = startOf[a + 1] ?? segs.length; seg = Math.floor(s0 + (s1 - s0) * f); }
      const skip = t > 10.6 ? startOf[3] : 0;
      lg.setDrawRange(skip * 2, Math.max(0, seg - skip) * 2);
      nodeP.geometry.setDrawRange(0, Math.max(0, Math.min(nodes.length, seg)));
      tree.material.opacity = .85 - .4 * sm((t - 10.4) / 1.6);
      lat.material.opacity = .55 * sm((t - 7.2) / 1.6) * (1 - .55 * sm((t - 11) / 2));
      nums.forEach((m, i) => {
        m.material.opacity = .85 * sm((t - 7.2 - i * .004) / .7) * (1 - .6 * sm((t - 11) / 2));
        if ((i + Math.floor(clock * 10)) % 37 === 0) m.material.map = TX[(i + Math.floor(clock * 7)) % 16];
      });
      links.material.opacity = .4 * sm((t - 10.4) / 1.2);
      if (gm) gm.uniforms.o.value = sm((t - 10.2) / 1.1) * (.86 + .14 * Math.sin(clock * 5));
      // Signals keep flowing into the brain even while the scroll rests.
      flow.material.opacity = sm((t - 10.5) / .8);
      if (flow.material.opacity > 0) {
        for (let i = 0; i < FL; i++) {
          const u = (clock * .42 + fo[i]) % 1, q = fi[i], l = SURF / q.length(), m = 1 - u * (1 - l);
          fp[i * 3] = q.x * m; fp[i * 3 + 1] = q.y * m; fp[i * 3 + 2] = q.z * m;
        }
        flow.geometry.attributes.position.needsUpdate = true;
      }
      // HTML: skip the work entirely while hidden.
      if (vis < .01 && shown < .01) return;
      shown = vis;
      mains.forEach((m, i) => place(m.e, m.p, vis * sm((t - (.2 + i * .31)) / .25) * (1 - sm((t - 6.6) / .7)), cam, W, H));
      subs.forEach((s) => place(s.e, s.p, vis * sm((t - s.at) / .25) * (1 - sm((t - s.at - 1.3) / .4)), cam, W, H));
      cards.forEach((c, i) => { const o = sm((t - 13.5 - i * .25) / .4); c.style.opacity = o * vis; c.style.transform = `translateY(calc(-50% + ${(1 - o) * 26}px))`; });
    },
  };
}
