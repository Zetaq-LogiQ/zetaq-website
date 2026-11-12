import * as THREE from 'three';
import { scene as onScroll } from '../core/scroll.js';
import { span, range, lerp, follow, RM } from '../core/math.js';
import { makeDevice, glowTexture, roundTexture } from './parts.js';
import { studio } from './studio.js';
import { clip, show } from './videos.js';
import { STUDENT_STEPS } from '../data/steps.js';

// Chapter 1. Timeline (section progress 0..1):
//   0    - .20  hero product shot; then the tablet turns to face you and moves in close
//   .20  - .62  student walkthrough on the framed tablet; each step plays its slice of the recording once
//   .62  - .72  camera pulls back to a three-quarter view
//   .72  - 1    the screen peels into five glass layers: the parts of every chapter

// Student walkthrough steps live in js/data/steps.js (shared with the other designs).
const STEPS = STUDENT_STEPS;

// The five parts of a chapter. `to` is where each layer floats to, in the tablet's own space.
const PARTS = [
  { name: 'Video lesson', key: 'heart_blood', crop: 16 / 9 },
  { name: 'Notes', key: 'student-notes', src: 'student', at: 44.3 },
  { name: 'Interactive lesson', key: 'lesson', crop: 16 / 9 },
  { name: 'Adaptive quiz', key: 'quiz' },
  { name: 'Game', key: 'game', crop: 16 / 9 },
].map((p, i) => ({ ...p, to: new THREE.Vector3(-1.5 + i * .75, .9 - i * .45, .5 + i * .85) }));

// Glass cards floating around the tablet in the hero shot. `at` is an anchor in the tablet's space.
const CARDS = [
  { icon: '▶', title: 'Lesson video', sub: 'Made for the mind watching it', at: [-2.45, .7, .5] },
  { icon: '✦', title: 'Adaptive quiz', sub: 'Reshapes for each child', at: [-2.6, -.3, .7] },
  { icon: '★', title: 'Games', sub: 'The right answer is how you win', at: [-1.9, -1.2, .6] },
  { icon: '◎', title: 'Learning Brain', sub: 'Before and after the lesson', at: [2.4, .85, .6] },
  { icon: '◆', title: 'Interactive lesson', sub: 'Step inside it', at: [2.5, -.5, .45] },
].map((c) => ({ ...c, at: new THREE.Vector3(...c.at) }));

export function product(stage, sec) {
  const box = sec.querySelector('.sticky'), $ = (q) => sec.querySelector(q);
  const heroCopy = $('.hero-copy'), walk = $('.walk'), rail = $('.rail'), ul = rail.querySelector('ul'), layersCopy = $('.layers-copy'), cue = $('.cue');
  const pills = STEPS.map(([, , label]) => ul.appendChild(Object.assign(document.createElement('li'), { textContent: label })));
  const toProgress = (p) => scrollTo({ top: sec.offsetTop + p * (sec.offsetHeight - innerHeight), behavior: 'smooth' });
  sec.querySelectorAll('[data-jump]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); toProgress(+a.dataset.jump); }));

  // Scene: the tablet in a dark studio.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050507);
  scene.environment = stage.env;
  scene.environmentIntensity = .6;
  const key = new THREE.DirectionalLight(0xffe2c0, 1.4); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fe3ff, 1.1); rim.position.set(4, 2, -3); scene.add(rim);   // cool edge light on the bezel
  const dev = makeDevice(); scene.add(dev.g);
  const set = studio(scene, dev);

  // Layers start flat on the screen and fly out towards the camera.
  const layers = PARTS.map((part, i) => {
    const mat = new THREE.MeshBasicMaterial({ alphaMap: roundTexture(), transparent: true, opacity: 0, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(dev.W, dev.H), mat);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(dev.W * 1.7, dev.H * 2), new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(0xff9a4d).multiplyScalar(.35), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.z = -.05;
    pane.add(halo);
    pane.renderOrder = i;          // nearer layers draw last
    pane.visible = false;
    dev.g.add(pane);
    const tag = box.appendChild(Object.assign(document.createElement('div'), { className: 'tag', innerHTML: `<i></i><b>0${i + 1}</b>${part.name}` }));
    return { part, pane, mat, halo, tag };
  });

  // Hero cards (plain DOM, so the text stays perfectly sharp), pinned to 3D anchors.
  const cards = CARDS.map((c) => ({ ...c, el: box.appendChild(Object.assign(document.createElement('div'), { className: 'card3d', innerHTML: `<i>${c.icon}</i><span><b>${c.title}</b><small>${c.sub}</small></span>` })) }));

  // The tablet leans gently towards the pointer.
  let mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  const cam = stage.cam, look = new THREE.Vector3(), corner = new THREE.Vector3(), anchor = new THREE.Vector3();
  let t = 0, s = 0, step = -1, sway = 0;

  onScroll(sec, (p, dt) => {
    if (!RM) t += dt;
    s = RM ? p : follow(s, p, dt);
    mx = follow(mx, tx, dt, 3); my = follow(my, ty, dt, 3);

    const face = span(s, .05, .2);       // tablet turns to face us and moves in close
    const back = span(s, .62, .72);      // pull back to three-quarter view
    const peel = span(s, .72, 1);        // orbit while the layers come out
    const hero = 1 - face;
    const j = s < .2 ? 0 : Math.min(STEPS.length - 1, Math.floor(range(s, .2, .62) * STEPS.length));

    // Walkthrough framing: the whole tablet (bezel included) fits between the title above and the step rail below,
    // using about 68% of the height and 84% of the width (92% on phones).
    const W = box.clientWidth, H = box.clientHeight, aspect = W / H, tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const frame = Math.max((dev.H + .2) / (.68 * 2 * tan), (dev.W + .2) / ((aspect > 1 ? .84 : .92) * 2 * tan * aspect));
    const lift = .035 * 2 * frame * tan;      // aim slightly above centre, so the tablet sits a little low (room for the title)
    const zoom = Math.max(1, .8 / aspect);   // portrait screens: step back so the tablet fits the width

    // Tablet pose: angled hero shot that follows the pointer, then square-on.
    // In the walkthrough it turns a few degrees left or right on each step, so every step feels like a new shot.
    sway = follow(sway, s > .2 && back === 0 ? (j % 2 ? .07 : -.07) : 0, dt, 2.5);
    const bob = Math.sin(t * .8) * .05 * hero;
    dev.g.rotation.set(lerp(.3, 0, face) + my * .12 * hero, lerp(-.55, 0, face) + mx * .22 * hero + back * .5 + sway, lerp(.05, 0, face));
    dev.g.position.set(0, lerp(-.8, 0, face) + bob, 0);   // sits below the headline and buttons
    set(t, dt, hero, 1);

    // Camera
    if (back === 0) {
      cam.position.set(0, lerp(.3, 0, face), lerp(10.4 * zoom, frame, face));
      look.set(0, lerp(-.25, lift, face), 0);
      // A slow push on every step so the view keeps breathing.
      const k = (range(s, .2, .62) * STEPS.length) % 1;
      if (s > .2) cam.position.z *= 1 - .02 * Math.sin(k * Math.PI);
    } else {
      const a = lerp(0, .62, back) - peel * 1.05, R = lerp(frame, 12 * zoom, back);
      cam.position.set(Math.sin(a) * R, lerp(0, 1.5, back), Math.cos(a) * R);
      look.set(lerp(0, .9, peel), lerp(lift * (1 - back), .45, peel), lerp(0, 1.7, peel));   // aim a little high so the stack sits below the headline
    }
    cam.lookAt(look);

    // Screen: the student recording, one slice per step.
    const rec = clip('student');
    show(dev.screenMat, rec);
    dev.screenMat.color.setScalar(lerp(1, .25, peel));
    const [t0, t1] = STEPS[j];
    rec.v.loop = false;
    if (j !== step) {
      // New step: start its slice from the top and let it play once.
      step = j;
      rec.seekTo = t0;
      rec.hold = false;
      pills.forEach((li, i) => li.classList.toggle('on', i === j));
      ul.style.transform = `translateX(${rail.clientWidth / 2 - (pills[j].offsetLeft + pills[j].offsetWidth / 2)}px)`;
    }
    if (rec.seekTo != null && rec.v.readyState > 0) { rec.v.currentTime = rec.seekTo; rec.seekTo = null; }   // waits until the video can seek
    // Reached the end: freeze there. If it ran past (e.g. the tab was in the background), snap back to the end frame.
    if (rec.seekTo == null && !rec.v.seeking && rec.v.currentTime >= t1) {
      rec.hold = true;
      if (rec.v.currentTime > t1 + .05) rec.v.currentTime = t1;
    }

    // Layers
    layers.forEach((L, i) => {
      const k = span(s, .72 + i * .045, .82 + i * .045);
      L.pane.visible = k > .001;
      if (!L.pane.visible) return;
      L.pane.position.set(L.part.to.x * k, L.part.to.y * k, .07 + (L.part.to.z - .07) * k);
      L.mat.opacity = Math.min(1, k * 1.5);
      L.halo.material.opacity = k;
      show(L.mat, clip(L.part.key, L.part));
    });

    stage.render(box, scene);

    // DOM that follows 3D points (after render, so matrices are current).
    const toScreen = (v) => { v.project(cam); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
    layers.forEach((L, i) => {
      const k = L.pane.visible ? span(s, .76 + i * .045, .84 + i * .045) : 0;
      L.tag.style.opacity = k;
      if (!k) return;
      const [x, y] = toScreen(corner.set(-dev.W / 2, dev.H / 2, 0).applyMatrix4(L.pane.matrixWorld));
      L.tag.style.transform = `translate(${x}px, ${y - 30}px)`;
    });
    const cardsOut = span(s, .02, .07);
    cards.forEach((c, i) => {
      const o = span(t, .9 + i * .14, 1.6 + i * .14) * (1 - cardsOut);   // arrive one by one after load, leave on scroll
      c.el.style.opacity = o;
      if (!o) return;
      const [x, y] = toScreen(anchor.copy(c.at).applyMatrix4(dev.g.matrixWorld));
      c.el.style.transform = `translate(${x}px, ${y + Math.sin(t * 1.1 + i * 1.7) * 6 + (1 - o) * 24}px) translate(-50%, -50%)`;
    });

    // Copy
    const out = span(s, .03, .1);
    heroCopy.style.opacity = 1 - out;
    heroCopy.style.transform = `translateY(${-out * 40}px) scale(${1 + out * .12})`;
    heroCopy.style.visibility = out > .98 ? 'hidden' : '';   // hidden buttons must not stay clickable
    cue.style.opacity = 1 - range(s, 0, .03);
    const inWalk = span(s, .2, .24) * (1 - span(s, .6, .64));
    walk.style.opacity = rail.style.opacity = inWalk;
    layersCopy.style.opacity = span(s, .74, .8);
    sec.dataset.label = s < .18 ? 'ZetaQ' : s < .66 ? 'For students' : 'Every chapter';
  });
}
