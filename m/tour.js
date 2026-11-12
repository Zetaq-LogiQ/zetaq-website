// The phone tour: the same sections and clips as the 3D tour (js/data/tour.js), one section per screen.
// Next / Back (or a vertical swipe, which snaps) move between SECTIONS; inside a section you swipe sideways between its ITEMS.
// The opening is the eclipse portal: swipe up and you pass through it.
// Links: #<section> or #<section>-<n> (e.g. #videos-3), old names via ALIASES; #enter glides in through the portal.
import { SECTIONS, ALIASES } from '../js/data/tour.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const A = '../assets/';
const $ = (q, el = document) => el.querySelector(q);
const html = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstElementChild; };

// One clip: a muted looping video with a poster (or just the still, for `at` clips), shown 16:10 like the 3D screens.
const media = ({ key, src, at, from, to }) => at != null
  ? `<div class="media"><img src="${A}posters/${key}.jpg" alt="" loading="lazy"></div>`
  : `<div class="media"><video muted loop playsinline preload="none" poster="${A}posters/${key}.jpg" data-src="${A}${src ?? key}.mp4"${from != null ? ` data-from="${from}" data-to="${to ?? ''}"` : ''}></video></div>`;
const head = (kick, title) => `<div class="s-head">${kick ? `<p class="kick">${kick}</p>` : ''}<h2>${title}</h2></div>`;
const label = (it) => `<p class="label">${it.group ? `<span class="k">${it.group}</span>` : ''}<span class="t">${it.name}</span>${it.sub ? `<span class="s">${it.sub}</span>` : ''}</p>`;

const root = $('#stations');
SECTIONS.forEach((sec) => {
  let inner = '';
  if (sec.type === 'walk') {
    inner = head(sec.kick, sec.title) + `<div class="frame">${media(sec.clip)}</div>
      <div class="chips steps">${sec.items.map((it, i) => `<button type="button" data-at="${it.from}"><b>${String(i + 1).padStart(2, '0')}</b>${it.name}</button>`).join('')}</div>`;
  } else if (sec.type === 'shelf') {
    inner = head(sec.kick, sec.title) + `<div class="row" tabindex="0">${sec.items.map((it, i) => `<article class="card" data-i="${i}">${media(it.clip)}${label(it)}</article>`).join('')}</div>
      <div class="pager" aria-hidden="true">${sec.items.length > 1 ? sec.items.map(() => '<i></i>').join('') : ''}</div>`;
  } else if (sec.type === 'brain') {
    inner = head(sec.kick, 'A universe of signals <em>for every child</em>') + `<div class="frame glow">${media(sec.film)}</div><p class="sub after">${sec.sub}</p>`;
  } else if (sec.type === 'end') {
    inner = `<div class="end"><div class="eclipse"><span class="swirl"></span><span class="ring"></span></div>
      <h2>${sec.title}</h2><div class="slot"><!-- CONTACT DETAILS GO HERE --></div>
      <a class="btn" href="../contact.html">Talk to us</a><a class="btn ghost" href="./">Back to home</a></div>`;
  }
  root.appendChild(html(`<section class="station" id="st-${sec.key}" data-key="${sec.key}" data-name="${sec.label}">${inner}</section>`));
});

// ---- Video playback: a clip plays only while it's (mostly) on screen and, in a row, centred. Sources load on first play. ----
const play = (v, on) => {
  if (!v) return;
  if (on) {
    if (!v.src) {
      v.src = v.dataset.src;
      if (v.dataset.from) {        // only part of a recording, looped
        const f = +v.dataset.from, t = +v.dataset.to || Infinity;
        v.addEventListener('loadedmetadata', () => { v.currentTime = f; }, { once: true });
        v.addEventListener('timeupdate', () => { if (v.currentTime >= t || v.currentTime < f - .5) v.currentTime = f; });
      }
    }
    v.play().catch(() => {});
  } else if (!v.paused) v.pause();
};
const io = new IntersectionObserver((es) => es.forEach((e) => {
  const on = e.intersectionRatio > .6;
  if (on && e.target.paused && e.target.closest('#st-brain')) e.target.currentTime = 0;   // the brain film starts from the top each time you arrive
  play(e.target, on);
}), { threshold: [0, .6, 1] });
document.querySelectorAll('video').forEach((v) => io.observe(v));

// Swipe rows: light the pager dot of the centred card; tapping a dot jumps there.
const centre = (r) => { const mid = r.scrollLeft + r.clientWidth / 2; let k = 0, best = 1e9; [...r.children].forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < best) { best = d; k = i; } }); return k; };
const showCard = (r, i, how = 'smooth') => { const c = r.children[i]; if (c) r.scrollTo({ left: c.offsetLeft - (r.clientWidth - c.offsetWidth) / 2, behavior: how }); };
document.querySelectorAll('.row').forEach((r) => {
  const dots = [...r.nextElementSibling.children];
  const upd = () => { const k = centre(r); dots.forEach((d, i) => d.classList.toggle('on', i === k)); };
  dots.forEach((d, i) => d.addEventListener('click', () => showCard(r, i)));
  r.addEventListener('scroll', upd, { passive: true });
  upd();
});

// The student dashboard: the chips follow the recording; tapping one jumps there.
{
  const stu = $('#st-dashboard'), v = $('video', stu), chips = [...stu.querySelectorAll('.steps button')], strip = $('.steps', stu);
  chips.forEach((b) => b.addEventListener('click', () => { play(v, true); v.currentTime = +b.dataset.at; }));
  let k = -1;
  v.addEventListener('timeupdate', () => {
    let j = 0;
    chips.forEach((b, i) => { if (v.currentTime >= +b.dataset.at - .05) j = i; });
    if (j === k) return;
    k = j;
    chips.forEach((b, i) => b.classList.toggle('on', i === j));
    const c = chips[j];
    strip.scrollTo({ left: c.offsetLeft - strip.clientWidth / 2 + c.offsetWidth / 2, behavior: 'smooth' });
  });
}

// The grown-ups' dashboards: each card's line follows the feature its recording is showing.
{
  const g = $('#st-grown'), sec = SECTIONS.find((s) => s.key === 'grown');
  g.querySelectorAll('.card').forEach((c) => {
    const it = sec.items[+c.dataset.i], v = $('video', c), s = $('.label .s', c) ?? $('.label', c).appendChild(html('<span class="s"></span>'));
    if (!it.feats) return;
    s.textContent = it.feats[0][1];
    v.addEventListener('timeupdate', () => { let f = it.feats[0][1]; it.feats.forEach(([t0, l]) => { if (v.currentTime >= t0) f = l; }); if (s.textContent !== f) s.textContent = f; });
  });
}

// ---- The portal: as the first screen scrolls away the ring grows past you and the screen floods with light ----
const portal = $('#portal'), ecl = $('.eclipse', portal), ptext = $('.portal-text', portal), cue = $('.cue', portal), flash = $('.flash'), dots = $('.dots');
let boost = 0;
const frame = () => {
  requestAnimationFrame(frame);
  const run = portal.offsetHeight - innerHeight, q = Math.min(1, Math.max(0, scrollY / Math.max(1, run)));
  ecl.style.transform = `scale(${1 + q * q * 7})`;
  ecl.style.opacity = 1 - Math.max(0, (q - .82) / .18);
  ptext.style.opacity = 1 - Math.min(1, q * 2.2);
  ptext.style.transform = `translateY(${-q * 40}px)`;
  cue.style.opacity = 1 - Math.min(1, q * 4);
  boost = Math.max(0, boost - .02);
  flash.style.opacity = Math.max(Math.max(0, 1 - Math.abs(q - .86) / .14) * .9, boost);
  dots.style.opacity = q > .95 ? 1 : 0;
};
requestAnimationFrame(frame);

// ---- Sections: dots on the right, the header label, and Back / Next ----
const stations = [...document.querySelectorAll('.station')], all = [portal, ...stations], spy = $('#spy');
stations.forEach((s) => {
  const b = dots.appendChild(html(`<button type="button" aria-label="${s.dataset.name}"></button>`));
  b.addEventListener('click', () => s.scrollIntoView({ behavior: 'smooth' }));
});
{
  const ob = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const i = stations.indexOf(e.target);
    [...dots.children].forEach((b, j) => b.classList.toggle('on', i === j));
    spy.textContent = e.target.dataset.name;
  }), { rootMargin: '-45% 0px -45% 0px' });
  stations.forEach((s) => ob.observe(s));
}
{
  const bar = $('.mnav'), prev = $('.prev', bar), next = $('.next', bar), lab = $('.nx-l', bar);
  const cur = () => { let k = 0; all.forEach((el, i) => { if (el.getBoundingClientRect().top <= innerHeight * .4) k = i; }); return k; };
  const upd = () => { const k = cur(); prev.disabled = k === 0; next.disabled = k === all.length - 1; lab.textContent = all[k + 1]?.dataset.name ?? 'The end'; };
  const go = (d) => { const el = all[Math.max(0, Math.min(all.length - 1, cur() + d))]; scrollTo({ top: el === portal ? 0 : el.offsetTop, behavior: 'smooth' }); };
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  addEventListener('scroll', upd, { passive: true }); upd();
}

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
  const r = $('.row', st);
  if (r && m[2]) showCard(r, +m[2] - 1, 'instant');
};
addEventListener('hashchange', arrive);
requestAnimationFrame(() => requestAnimationFrame(arrive));

// ---- Stars behind everything ----
{
  const cv = $('.stars'), x = cv.getContext('2d'), dpr = Math.min(devicePixelRatio, 2);
  const S = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + .3, t: Math.random() * 6 }));
  let W, H;
  const size = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
  size(); addEventListener('resize', size);
  const draw = (now) => {
    requestAnimationFrame(draw);
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    const off = scrollY * .04;
    for (const s of S) {
      const y = ((s.y * H - off) % H + H) % H;
      x.fillStyle = `rgba(201,212,255,${.35 + .35 * Math.sin(now / 1000 + s.t)})`;
      x.beginPath(); x.arc(s.x * W, y, s.r, 0, 6.283); x.fill();
    }
  };
  requestAnimationFrame(draw);
}
