// The phone tour: the same sections and clips as the 3D tour (js/data/tour.js), one section per screen.
// The journey: a glowing learning path winds down the whole page behind the sections, with signals travelling along it;
// each section is a node on it that lights up as you arrive.
// Next / Back (or a vertical swipe, which snaps) move between SECTIONS. Inside a section, the thumbnails under the player
// (or a sideways swipe on the player) move between its ITEMS.
// Links: #<section> or #<section>-<n> (e.g. #videos-3), old names via ALIASES; #enter glides in through the portal.
import { SECTIONS, ALIASES } from '../js/data/tour.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const A = '../assets/';
const $ = (q, el = document) => el.querySelector(q);
const html = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstElementChild; };
const pad = (n) => String(n).padStart(2, '0');
const N = SECTIONS.length;

// ---- Playback: a clip plays only while its section is on screen. Sources load on first play. ----
function play(v, on) {
  if (!v || v.hidden) return;
  if (on) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else if (!v.paused) v.pause();
}
const io = new IntersectionObserver((es) => es.forEach((e) => {
  const on = e.intersectionRatio > .6;
  if (on && e.target.paused && e.target.closest('#st-brain')) e.target.currentTime = 0;   // the brain film starts from the top each time you arrive
  play(e.target, on);
}), { threshold: [0, .6, 1] });

// ---- Build the sections ----
const root = $('#stations');
SECTIONS.forEach((sec, k) => {
  const top = `<div class="st-top"><span class="st-n">${pad(k + 1)}<i>/ ${pad(N)}</i></span><span class="st-l">${sec.label}</span></div>`;
  const head = `<div class="s-head">${sec.kick ? `<p class="kick">${sec.kick}</p>` : ''}<h2>${sec.type === 'brain' ? 'A universe of signals <em>for every child</em>' : sec.title}</h2></div>`;
  let body = '';
  if (sec.type === 'walk' || sec.type === 'shelf' || sec.type === 'brain') {
    const first = sec.type === 'brain' ? sec.film : sec.type === 'walk' ? sec.clip : sec.items[0].clip;
    body = `<div class="player"><div class="media"><video muted loop playsinline preload="none"></video><img class="still" alt="" hidden></div><span class="sheen" aria-hidden="true"></span></div>
      <div class="cap"><b class="t"></b><span class="s"></span></div>`;
    if (sec.type === 'walk') body += `<div class="chips steps">${sec.items.map((it, i) => `<button type="button" data-i="${i}"><b>${pad(i + 1)}</b>${it.name}</button>`).join('')}</div>`;
    else if (sec.type === 'shelf' && sec.items.length > 1) body += `<div class="thumbs">${sec.items.map((it, i) => `<button type="button" data-i="${i}" aria-label="${it.name.replace(/<[^>]+>/g, '')}"><img src="${A}posters/${it.clip.key}.jpg" alt="" loading="lazy"><span>${it.group ?? ''}</span></button>`).join('')}</div>`;
    const el = html(`<section class="station" id="st-${sec.key}" data-key="${sec.key}" data-name="${sec.label}">${top}${head}${body}</section>`);
    root.appendChild(el);
    setupPlayer(el, sec, first);
  } else if (sec.type === 'end') {
    root.appendChild(html(`<section class="station" id="st-${sec.key}" data-key="${sec.key}" data-name="${sec.label}">${top}<div class="end">
      <div class="eclipse"><span class="swirl"></span><span class="ring"></span></div><h2>${sec.title}</h2><div class="slot"><!-- CONTACT DETAILS GO HERE --></div>
      <a class="btn" href="../contact.html">Talk to us</a><a class="btn ghost" href="./">Back to home</a></div></section>`));
  }
});

// ---- One player per section: the clip plays while the section is on screen; thumbnails / swipes change the item ----
function setupPlayer(el, sec, first) {
  const v = $('video', el), still = $('.still', el), t = $('.cap .t', el), s = $('.cap .s', el), player = $('.player', el);
  const items = sec.type === 'shelf' ? sec.items : null;
  let i = 0, part = null;
  const load = (clip) => {
    if (clip.at != null) { v.hidden = true; still.hidden = false; still.src = `${A}posters/${clip.key}.jpg`; return; }
    v.hidden = false; still.hidden = true;
    v.poster = `${A}posters/${clip.key}.jpg`;
    v.dataset.src = `${A}${clip.src ?? clip.key}.mp4`;
    part = clip.from != null ? [clip.from, clip.to ?? Infinity] : null;
    if (v.src) { v.src = v.dataset.src; if (el.classList.contains('here')) v.play().catch(() => {}); }
  };
  v.addEventListener('loadedmetadata', () => { if (part) v.currentTime = part[0]; });
  v.addEventListener('timeupdate', () => {
    if (part && (v.currentTime >= part[1] || v.currentTime < part[0] - .5)) v.currentTime = part[0];
    if (sec.type === 'walk') { let j = 0; sec.items.forEach((it, k) => { if (v.currentTime >= it.from - .05) j = k; }); stepTo(j, false); }
    if (items?.[i].feats) { let f = items[i].feats[0][1]; items[i].feats.forEach(([t0, l]) => { if (v.currentTime >= t0) f = l; }); if (s.textContent !== f) s.textContent = f; }
  });
  const caption = () => {
    if (sec.type === 'brain') { t.textContent = ''; s.textContent = sec.sub; return; }
    if (sec.type === 'walk') return;
    const it = items[i];
    t.innerHTML = it.name; s.textContent = it.feats ? it.feats[0][1] : it.sub ?? '';
    if (it.group && sec.key === 'hub') t.insertAdjacentHTML('afterbegin', `<span class="g">${it.group}</span>`);
  };
  // shelf: pick an item
  const pick = (k) => {
    if (!items) return;
    i = (k + items.length) % items.length;
    load(items[i].clip); caption();
    el.querySelectorAll('.thumbs button').forEach((b, j) => b.classList.toggle('on', j === i));
    const tb = el.querySelectorAll('.thumbs button')[i]; tb?.parentElement.scrollTo({ left: tb.offsetLeft - 60, behavior: 'smooth' });
    player.classList.remove('swap'); void player.offsetWidth; player.classList.add('swap');
  };
  // walk: the step chips follow the recording; tapping one jumps there
  let step = -1;
  const chips = [...el.querySelectorAll('.steps button')];
  const stepTo = (j, seek) => {
    if (seek) { play(v, true); v.currentTime = sec.items[j].from; }
    if (j === step) return;
    step = j;
    chips.forEach((b, k) => b.classList.toggle('on', k === j));
    t.textContent = sec.items[j].name; s.textContent = `Step ${j + 1} of ${sec.items.length}`;
    const c = chips[j], strip = c?.parentElement; if (strip) strip.scrollTo({ left: c.offsetLeft - strip.clientWidth / 2 + c.offsetWidth / 2, behavior: 'smooth' });
  };
  chips.forEach((b) => b.addEventListener('click', () => stepTo(+b.dataset.i, true)));
  el.querySelectorAll('.thumbs button').forEach((b) => b.addEventListener('click', () => pick(+b.dataset.i)));
  // a sideways swipe on the player
  let x0 = null;
  player.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  player.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) { if (items) pick(i + (dx < 0 ? 1 : -1)); else if (sec.type === 'walk') stepTo(Math.max(0, Math.min(sec.items.length - 1, step + (dx < 0 ? 1 : -1))), true); } });
  el.pick = pick;
  load(first); caption(); if (items) pick(0); if (sec.type === 'walk') stepTo(0, false);
  io.observe(v);
}

// ---- Where you are: the header label, the section that is "here" (its node lights, its content rises in) ----
const portal = $('#portal'), stations = [...document.querySelectorAll('.station')], all = [portal, ...stations], spy = $('#spy');
let here = -1;
const herePO = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add('here', 'seen');
  stations.forEach((s) => { if (s !== e.target) s.classList.remove('here'); });
  here = stations.indexOf(e.target);
  spy.textContent = e.target.dataset.name;
}), { rootMargin: '-45% 0px -45% 0px' });
stations.forEach((s) => herePO.observe(s));

// ---- Back / Next ----
{
  const bar = $('.mnav'), prev = $('.prev', bar), next = $('.next', bar), lab = $('.nx-l', bar);
  const cur = () => { let k = 0; all.forEach((el, i) => { if (el.getBoundingClientRect().top <= innerHeight * .4) k = i; }); return k; };
  const upd = () => { const k = cur(); prev.disabled = k === 0; next.disabled = k === all.length - 1; lab.textContent = all[k + 1]?.dataset.name ?? 'The end'; };
  const go = (d) => { const el = all[Math.max(0, Math.min(all.length - 1, cur() + d))]; scrollTo({ top: el === portal ? 0 : el.offsetTop, behavior: 'smooth' }); };
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  addEventListener('scroll', upd, { passive: true }); upd();
}

// ---- The portal: as the first screen scrolls away the ring grows past you and the screen floods with light ----
const ecl = $('.eclipse', portal), ptext = $('.portal-text', portal), cue = $('.cue', portal), flash = $('.flash');
let boost = 0;

// ---- Arriving on a link ----
const arrive = () => {
  let h = decodeURIComponent(location.hash.slice(1));
  if (!h) return;
  if (h === 'enter') { boost = 1; scrollTo(0, 0); if (!RM) setTimeout(() => $('#st-dashboard').scrollIntoView({ behavior: 'smooth' }), 900); return; }
  if (h in ALIASES) h = ALIASES[h] ?? '';
  const m = /^(.+?)(?:-(\d+))?$/.exec(h), st = m && document.getElementById(`st-${m[1]}`);
  if (!st) return;
  boost = 1;
  st.scrollIntoView({ behavior: 'instant' });
  if (m[2] && st.pick) st.pick(+m[2] - 1);
};
addEventListener('hashchange', arrive);
requestAnimationFrame(() => requestAnimationFrame(arrive));

// ---- The journey canvas: stars, drifting nebulae, and the learning path with its travelling signals ----
{
  const cv = $('.vibe'), x = cv.getContext('2d'), dpr = Math.min(devicePixelRatio, 2);
  const S = Array.from({ length: 130 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.1 + .3, t: Math.random() * 6, z: Math.random() * .6 + .2 }));
  const NEB = [[.15, .2, '64,150,255'], [.85, .55, '122,92,255'], [.3, .85, '63,214,224']];
  let W = 0, H = 0;
  const size = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
  size(); addEventListener('resize', size);
  // The path in PAGE coordinates: it winds left and right as it falls, through the middle of every section's top.
  const pathX = (y) => W * .5 + Math.sin(y / 520) * W * .36 + Math.sin(y / 190) * W * .04;
  const nodeY = () => stations.map((s) => s.offsetTop + 46);
  let ny = nodeY(); addEventListener('resize', () => { ny = nodeY(); }); setTimeout(() => { ny = nodeY(); }, 1500);
  const draw = (now) => {
    requestAnimationFrame(draw);
    if (document.hidden) return;
    const t = RM ? 0 : now / 1000, sy = scrollY;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    // nebulae drift slowly and move a little with the page
    for (const [nx, nyy, c] of NEB) {
      const cx = W * (nx + .05 * Math.sin(t * .07 + nx * 9)), cy = H * (nyy + .05 * Math.cos(t * .05 + nyy * 7)) - (sy * .05) % H;
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, W * .9);
      g.addColorStop(0, `rgba(${c},.16)`); g.addColorStop(1, `rgba(${c},0)`);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }
    // stars, with depth parallax
    for (const s of S) {
      const y = ((s.y * H - sy * s.z * .2) % H + H) % H;
      x.fillStyle = `rgba(201,212,255,${.3 + .35 * Math.sin(t * 1.1 + s.t)})`;
      x.beginPath(); x.arc(s.x * W, y, s.r, 0, 6.283); x.fill();
    }
    // the learning path (only after the portal), drawn for the part of the page on screen
    const start = portal.offsetHeight - H * .2;
    const y0 = Math.max(start, sy - 40), y1 = sy + H + 40;
    if (y1 > start) {
      x.lineCap = 'round';
      for (const [w, a] of [[7, .06], [2, .4]]) {
        x.beginPath();
        for (let y = y0; y <= y1; y += 8) { const px = pathX(y), py = y - sy; y === y0 ? x.moveTo(px, py) : x.lineTo(px, py); }
        const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgba(108,196,255,${a})`); g.addColorStop(1, `rgba(63,214,224,${a})`);
        x.strokeStyle = g; x.lineWidth = w; x.stroke();
      }
      // signals travelling down the path
      const span = 900;
      for (let k = 0; k < 7; k++) {
        const y = y0 + ((t * 140 + k * span / 7 * 1.7) % (y1 - y0 + 1));
        const px = pathX(y), py = y - sy;
        const g = x.createRadialGradient(px, py, 0, px, py, 14); g.addColorStop(0, 'rgba(227,244,255,.95)'); g.addColorStop(.3, 'rgba(108,196,255,.5)'); g.addColorStop(1, 'rgba(108,196,255,0)');
        x.fillStyle = g; x.beginPath(); x.arc(px, py, 14, 0, 6.283); x.fill();
      }
      // a node per section; the one you're at glows
      ny.forEach((yy, k) => {
        if (yy < y0 - 40 || yy > y1 + 40) return;
        const px = pathX(yy), py = yy - sy, on = k === here, r = on ? 7 + Math.sin(t * 3) * 1.2 : 4;
        if (on) { const g = x.createRadialGradient(px, py, 0, px, py, 40); g.addColorStop(0, 'rgba(108,196,255,.55)'); g.addColorStop(1, 'rgba(108,196,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, 40, 0, 6.283); x.fill(); }
        x.fillStyle = on ? '#e3f4ff' : 'rgba(108,196,255,.7)'; x.beginPath(); x.arc(px, py, r, 0, 6.283); x.fill();
      });
    }
    // the portal: as the first screen scrolls away the ring grows past you and the screen floods with light
    const run = portal.offsetHeight - H, q = Math.min(1, Math.max(0, sy / Math.max(1, run)));
    ecl.style.transform = `scale(${1 + q * q * 7})`;
    ecl.style.opacity = 1 - Math.max(0, (q - .82) / .18);
    ptext.style.opacity = 1 - Math.min(1, q * 2.2);
    ptext.style.transform = `translateY(${-q * 40}px)`;
    cue.style.opacity = 1 - Math.min(1, q * 4);
    boost = Math.max(0, boost - .02);
    flash.style.opacity = Math.max(Math.max(0, 1 - Math.abs(q - .86) / .14) * .9, boost);
  };
  requestAnimationFrame(draw);
}
