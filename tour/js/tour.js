import * as THREE from 'three';
import { scene as onScroll } from '../../js/core/scroll.js';
import { span, lerp, follow, RM } from '../../js/core/math.js';
import { makePath, near } from '../../js/three/path.js';
import { makeSpace } from '../../js/three/space.js';
import { ALIASES } from '../../js/data/tour.js';
import { makeTargets, PORTAL_EXIT } from './world/targets.js';
import { LEN } from './world/universe.js';

// The ZetaQ tour, section by section (js/data/tour.js).
// Two controls only:
//  • Next / Back (or the wheel, ↑ ↓, a vertical swipe) fly to the next or previous SECTION.
//  • ‹ › under the showcase (or ← →, a sideways swipe) move between the ITEMS of that section.
// Clips play by themselves; nothing moves on until the visitor asks.
// The page scroll still drives the camera (so nothing jumps), but only these controls ever change it.
// Links: #<section> or #<section>-<n> (e.g. #videos-3), old names via ALIASES; #enter flies in through the portal.

const INTRO = 1.3;                // screens of scroll for the flight through the portal
const FOV = 52;
const Y = new THREE.Vector3(0, 1, 0);

export function tour(stage, sec) {
  const box = sec.querySelector('.sticky'), $ = (q) => sec.querySelector(q);
  const intro = $('.intro'), cap = $('.cap'), kick = cap.querySelector('.kick'), title = cap.querySelector('h2'), sub = cap.querySelector('.sub');
  const endBox = $('.end'), flash = $('.flash'), uLayer = $('.u-layer');
  const subBar = $('.subnav'), sPrev = subBar.querySelector('.sp'), sNext = subBar.querySelector('.sn'), sName = subBar.querySelector('.s-name'), sCount = subBar.querySelector('.s-count'), sDots = subBar.querySelector('.s-dots');
  const bar = $('.navbar'), bPrev = bar.querySelector('.prev'), bNext = bar.querySelector('.next'), nLabel = bar.querySelector('.nx-l');
  const prog = document.querySelector('.progress');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06071a);
  scene.fog = new THREE.FogExp2(0x06071a, .03);
  const path = makePath(scene);
  makeSpace(scene);
  const { targets, portal } = makeTargets(scene, path.curve, uLayer, FOV);
  const cam = stage.cam;
  cam.fov = FOV;
  cam.updateProjectionMatrix();

  // ---- Timeline: the portal flight, then for every section a flight in and a short hold ----
  const segs = [];
  let acc = INTRO, prev = null;
  targets.forEach((t) => {
    const len = !prev ? 1.4 : Math.max(1, Math.abs(t.u - prev.u) * 11);
    segs.push({ travel: true, a: prev, b: t, s0: acc, s1: acc += len });
    segs.push({ travel: false, t, s0: acc, s1: acc += 1 });
    t.dwellSeg = segs.at(-1);
    t.landS = t.dwellSeg.s0 + .5;
    prev = t;
  });
  const TOTAL = acc;
  sec.style.height = (TOTAL + 1) * 100 + 'vh';
  const yOf = (s) => sec.offsetTop + (s / TOTAL) * (sec.offsetHeight - innerHeight);
  const sNow = () => (scrollY - sec.offsetTop) / Math.max(1, sec.offsetHeight - innerHeight) * TOTAL;
  const ease = (q) => (q < .5 ? 4 * q * q * q : 1 - (-2 * q + 2) ** 3 / 2);
  const strip = (h) => h.replace(/<[^>]+>/g, '');

  // ---- Sections: 0 = the portal, then one per target ----
  const SECS = [{ label: 'The portal', s: 0 }, ...targets.map((t) => ({ label: t.label, s: t.landS, t }))];
  let at = 0, glide = null, snap = false, flashBoost = 0, walkStep = 0;
  const goSec = (k, ms) => {
    at = Math.max(0, Math.min(SECS.length - 1, k));
    const y0 = scrollY, y1 = yOf(SECS[at].s), ds = Math.abs(SECS[at].s - sNow()), t0 = performance.now();
    ms ??= Math.min(3200, Math.max(1000, 700 + 550 * ds));
    glide = () => {
      const q = Math.min(1, (performance.now() - t0) / ms);
      scrollTo(0, y0 + (y1 - y0) * ease(q));
      snap = true;
      if (q >= 1) { glide = null; onArrive(); }
    };
    updateUI();
  };
  const cutTo = (k, item) => {           // a link: straight there behind a flash, no long flight
    glide = null; at = k;
    scrollTo({ top: yOf(SECS[at].s), behavior: 'instant' });
    snap = true; flashBoost = 1;
    const t = SECS[at].t;
    if (t?.shelf && item != null) { t.shelf.set(item); t.shelf.cur = t.shelf.index; }
    onArrive(); updateUI();
  };

  // ---- Items inside the section you're in ----
  const items = () => { const t = SECS[at].t; return t?.shelf || t?.walk ? t.sec.items : null; };
  const itemIndex = () => { const t = SECS[at].t; return t?.shelf ? t.shelf.index : t?.walk ? walkStep : 0; };
  const playFromTop = (t) => {           // a clip starts from its beginning when you arrive at it, so it plays whole
    if (!t?.feed) return;
    requestAnimationFrame(() => {
      const e = t.feed(cam.position, true);
      if (e && !e.still) { e.v.currentTime = t.shelf ? t.shelf.items[t.shelf.index].it.clip.from ?? 0 : 0; e.v.play().catch(() => {}); }
    });
  };
  function onArrive() { const t = SECS[at].t; if (t?.walk) walkStep = 0; playFromTop(t); }
  const goItem = (d, abs) => {
    const t = SECS[at].t, list = items();
    if (!list || list.length < 2) return;
    const i = Math.max(0, Math.min(list.length - 1, abs ?? itemIndex() + d));
    if (t.shelf) { t.shelf.set(i); playFromTop(t); }
    else if (t.walk) { const e = t.feed(cam.position, true); if (e) { e.v.currentTime = list[i].from; e.v.play().catch(() => {}); } walkStep = i; }
    updateUI();
  };

  // ---- The controls ----
  let inertia = false, lastWheel = 0, tx0 = null, ty0 = null;
  addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheel > 170) inertia = false;
    lastWheel = now;
    const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0), dy = e.shiftKey ? 0 : e.deltaY;
    if (inertia || (Math.abs(dx) < 3 && Math.abs(dy) < 3)) return;
    inertia = true;
    if (Math.abs(dx) > Math.abs(dy)) goItem(dx > 0 ? 1 : -1);
    else if (!glide) goSec(at + (dy > 0 ? 1 : -1));
  }, { passive: false });
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input,textarea,select')) return;
    const k = e.key;
    if (k === 'ArrowRight') { e.preventDefault(); goItem(1); }
    else if (k === 'ArrowLeft') { e.preventDefault(); goItem(-1); }
    else if (['ArrowDown', 'PageDown', ' '].includes(k)) { e.preventDefault(); if (!glide) goSec(at + 1); }
    else if (['ArrowUp', 'PageUp'].includes(k)) { e.preventDefault(); if (!glide) goSec(at - 1); }
    else if (k === 'Home' || k === 'End') { e.preventDefault(); goSec(k === 'Home' ? 0 : SECS.length - 1); }
  });
  addEventListener('touchstart', (e) => { tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', (e) => { if (!e.target.closest?.('.navbar,.subnav,.progress')) e.preventDefault(); }, { passive: false });
  addEventListener('touchend', (e) => {
    if (ty0 == null) return;
    const dx = tx0 - e.changedTouches[0].clientX, dy = ty0 - e.changedTouches[0].clientY; tx0 = ty0 = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
    if (Math.abs(dx) > Math.abs(dy)) goItem(dx > 0 ? 1 : -1);
    else if (!glide) goSec(at + (dy > 0 ? 1 : -1));
  });
  bPrev.addEventListener('click', () => { if (!glide) goSec(at - 1); });
  bNext.addEventListener('click', () => { if (!glide) goSec(at + 1); });
  sPrev.addEventListener('click', () => goItem(-1));
  sNext.addEventListener('click', () => goItem(1));
  // Section progress in the header: one segment per section, click to fly there.
  SECS.forEach((S, k) => {
    if (!k) return;
    const b = prog.appendChild(Object.assign(document.createElement('button'), { type: 'button' }));
    b.dataset.label = S.label;
    b.setAttribute('aria-label', S.label);
    b.addEventListener('click', () => goSec(k));
  });
  document.querySelectorAll('[data-jump]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const k = SECS.findIndex((S) => S.t?.key === a.dataset.jump);
    if (k > 0) goSec(k);
  }));

  function updateUI() {
    bPrev.disabled = at === 0; bNext.disabled = at >= SECS.length - 1;
    nLabel.textContent = SECS[at + 1]?.label ?? 'The end';
    [...prog.children].forEach((b, i) => { b.classList.toggle('on', i + 1 === at); b.classList.toggle('done', i + 1 < at); });
    const list = items(), i = itemIndex(), many = !!list && list.length > 1;
    subBar.classList.toggle('on', many);
    if (!many) return;
    sPrev.disabled = i === 0; sNext.disabled = i >= list.length - 1;
    const it = list[i];
    sName.innerHTML = it.group && SECS[at].t.key === 'hub' ? `<b>${it.group}</b>` : '';   // the item itself is named in the caption above
    sName.hidden = !sName.innerHTML;
    sCount.textContent = `${String(i + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
    if (sDots.childElementCount !== list.length) sDots.replaceChildren(...list.map((_, j) => { const d = document.createElement('i'); d.onclick = () => goItem(0, j); return d; }));
    [...sDots.children].forEach((d, j) => d.classList.toggle('on', j === i));
    sDots.hidden = list.length > 16;
  }

  // Arriving on a link.
  const arrive = () => {
    let h = decodeURIComponent(location.hash.slice(1));
    if (h === 'enter') { flashBoost = 1; at = 0; scrollTo({ top: 0, behavior: 'instant' }); updateUI(); setTimeout(() => { if (at === 0 && !glide) goSec(1, 3600); }, 700); return; }
    if (h in ALIASES) h = ALIASES[h] ?? '';
    const m = /^(.+?)(?:-(\d+))?$/.exec(h), k = m ? SECS.findIndex((S) => S.t?.key === m[1]) : -1;
    if (k > 0) cutTo(k, m[2] ? +m[2] - 1 : null);
    else { at = 0; updateUI(); }
  };
  addEventListener('hashchange', arrive);
  requestAnimationFrame(arrive);

  // ---- Camera ----
  let W = 1, H = 1, mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  // How far back the camera sits so the showcase fills the space between the title and the controls.
  const fit = (t) => {
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2)), asp = W / H;
    return Math.max(t.h / (.58 * 2 * tan), t.w / ((asp > 1 ? .86 : .96) * 2 * tan * asp));
  };
  const onPath = (u, out) => out.copy(near(path.curve, u, mx * .3, 1.05 - my * .15));
  const ahead = (u, out) => out.copy(near(path.curve, Math.min(1, u + .03), 0, .85));
  const dock = (t, ang, out) => (t.pose ? t.pose(0, out)
    : t.pathU != null ? out.copy(near(path.curve, t.pathU, mx * .35, 1.05 - my * .2))
      : out.copy(t.normal).applyAxisAngle(Y, ang).multiplyScalar(fit(t)).add(t.pos));
  const dockLook = (t, out) => (t.poseLook ? t.poseLook(0, out) : t.pathU != null ? ahead(t.pathU, out).lerp(t.pos, .4) : out.copy(t.pos));
  const P = new THREE.Vector3(), L = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3(), LA = new THREE.Vector3(), LB = new THREE.Vector3(), R = new THREE.Vector3();

  // ---- Caption ----
  let shown = null, line = '';
  const setTitle = (html) => { if (html !== line) { line = html; title.innerHTML = html; title.classList.remove('flip'); void title.offsetWidth; title.classList.add('flip'); } };
  const setSub = (html) => { if (sub.innerHTML !== html) { sub.innerHTML = html; sub.classList.remove('flip'); void sub.offsetWidth; sub.classList.add('flip'); } };
  const setCaption = (t) => {
    if (t === shown) return;
    shown = t;
    if (!t) return;
    kick.textContent = t.cap.kick ?? '';
    setTitle(t.cap.title);
    endBox.classList.toggle('on', !!t.end);
    cap.classList.toggle('hide', !!t.end);
  };
  const brain = targets.find((t) => t.universe), loadBrainAt = brain.dwellSeg.s0 - 6;

  let time = 0, s = 0;
  onScroll(sec, (p, dt) => {
    glide?.();
    if (!RM) time += dt;
    s = RM || snap ? p * TOTAL : follow(s, p * TOTAL, dt, 4);
    snap = false;
    mx = follow(mx, tx, dt, 2); my = follow(my, ty, dt, 2);
    W = box.clientWidth; H = box.clientHeight;

    // Where are we?
    let active = null, capO = 0, dock01 = 0;
    const seg = segs.find((g) => s < g.s1) ?? segs.at(-1);
    // The brain film runs on its own clock once you're in front of it; it rewinds when you go back above it.
    if (s >= INTRO && !seg.travel && seg.t === brain) brain.film.t = RM ? LEN : Math.min(LEN, brain.film.t + dt);
    else if (s < brain.dwellSeg.s0) brain.film.t = 0;
    const sway = Math.sin(time * .25) * .05;           // a slow breath while docked
    if (s < INTRO) {
      const q = s / INTRO, e = q * q * (3 - 2 * q), u = lerp(0, PORTAL_EXIT, e);
      onPath(u, P); ahead(u, L);
    } else if (!seg.travel) {
      dock(seg.t, sway, P); dockLook(seg.t, L);
      active = seg.t; capO = 1; dock01 = 1;
    } else {
      const q = Math.min(1, (s - seg.s0) / (seg.s1 - seg.s0)), e = q * q * (3 - 2 * q), { a, b } = seg;
      const u = lerp(a ? a.u : PORTAL_EXIT, b.u, e);
      onPath(u, P); ahead(u, L);
      const wa = a ? 1 - span(q, 0, .35) : 0, wb = span(q, .62, 1);
      if (wa) { P.lerp(dock(a, sway, A), wa); L.lerp(dockLook(a, LA), wa); }
      if (wb) { P.lerp(dock(b, sway, B), wb); L.lerp(dockLook(b, LB), wb); }
      active = q < .5 ? a : b; capO = q < .5 ? wa : wb; dock01 = capO;
    }

    // Crossing the portal: a flash and a quick lens kick.
    const cross = s < INTRO + .5 ? Math.max(0, 1 - P.distanceTo(portal.g.getWorldPosition(R)) / 1.6) : 0;
    flashBoost = Math.max(0, flashBoost - dt * 1.1);
    flash.style.opacity = Math.max(cross * .85, flashBoost);
    const fov = FOV + 22 * cross * cross;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    portal.update(time, 1 - span(cross, .3, 1));
    portal.g.visible = s < INTRO + 2;

    cam.position.copy(P);
    cam.lookAt(L);
    cam.setViewOffset(W, H, 0, active?.end ? 0 : -H * .03 * dock01, W, H);

    // The world: sections ahead appear only after the portal; while docked, the others step back.
    path.update(time);
    targets.forEach((t) => {
      t.update?.({ t: time });
      t.obj.visible = s > INTRO * .45 && !(active && active !== t && dock01 > .95);
      const dim = active && active !== t ? dock01 : 0;
      if (t.shelf) { t.shelf.update(dt, dim); t.shelf.feed(cam.position); }
      else if (t.walk) { t.obj.material.opacity = 1 - dim * .95; t.obj.children[0].material.opacity = 1 - dim; t.feed(cam.position); }
    });
    if (s > loadBrainAt) brain.universe.load();
    if (brain.obj.visible) brain.universe.update(brain.film.t, cam, W, H, active === brain ? dock01 : 0, time);

    stage.render(box, scene);

    // Overlays: section title, and the line under it (the chosen item; on dashboards, the feature on screen).
    setCaption(active);
    if (active === brain) setTitle(brain.sec.lines.filter(([t0]) => brain.film.t >= t0).pop()[1]);
    if (active?.shelf) {
      const it = active.sec.items[active.shelf.index];
      let rest = it.sub ?? '';
      if (it.feats) { const e = active.shelf.feed(cam.position, true); rest = it.feats[0][1]; if (e) it.feats.forEach(([t0, l]) => { if (e.v.currentTime >= t0) rest = l; }); }
      setSub(rest ? `<b>${it.name}</b><span>${rest}</span>` : `<b>${it.name}</b>`);
    } else if (active?.walk) {
      const e = active.feed(cam.position, true);
      if (e && SECS[at].t === active) { let j = 0; active.sec.items.forEach((it, k) => { if (e.v.currentTime >= it.from - .05) j = k; }); if (j !== walkStep) { walkStep = j; updateUI(); } }
      setSub(`<b>${active.sec.items[walkStep]?.name ?? ''}</b>`);
    } else if (active === brain) setSub(brain.film.t < 3 ? brain.cap.sub : '');
    else if (active) setSub('');

    intro.style.opacity = 1 - span(s, .12, .55);
    intro.style.visibility = s > .6 ? 'hidden' : '';
    cap.style.opacity = capO;
    cap.classList.toggle('scrim', active === brain);
    endBox.style.opacity = active?.end ? capO : 0;
    subBar.style.opacity = SECS[at].t === active ? capO : 0;
    subBar.style.pointerEvents = SECS[at].t === active && capO > .5 ? '' : 'none';
    sec.dataset.label = active ? active.label : 'ZetaQ';
  });
}
