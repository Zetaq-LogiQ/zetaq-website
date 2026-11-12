// Home page (desktop index.html and phone m/index.html): the 30-seat class, the star field,
// and the portal hand-off into the tour.

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 30 seats, each filled to a different point: same chapter, different progress.
const fig = document.getElementById('class');
if (fig) {
  const cap = fig.querySelector('figcaption');
  [72, 35, 90, 58, 15, 64, 81, 42, 27, 96, 50, 68, 8, 77, 39, 61, 88, 22, 55, 70, 33, 93, 46, 12, 84, 59, 29, 75, 66, 48].forEach((v, i) => {
    const s = document.createElement('span');
    s.className = 'seat' + (v < 30 ? ' w' : '');
    s.style.setProperty('--p', v + '%');
    s.style.setProperty('--d', (i % 6) * 60 + Math.floor(i / 6) * 90 + 'ms');
    fig.insertBefore(s, cap);
  });
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { fig.classList.add('on'); o.disconnect(); } }, { threshold: .4 }).observe(fig);
}

// Star field behind the hero: slow drift towards the viewer, gentle twinkle.
const cv = document.querySelector('.stars');
if (cv) {
  const x = cv.getContext('2d'), dpr = Math.min(devicePixelRatio, 2);
  const S = Array.from({ length: 260 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random(), t: Math.random() * 6 }));
  let W = 0, H = 0, on = true;
  const size = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
  size(); addEventListener('resize', size);
  new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(cv);
  const draw = (now) => {
    requestAnimationFrame(draw);
    if (!on) return;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    for (const s of S) {
      if (!RM) { s.z -= .00045; if (s.z <= .02) { s.z = 1; s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; } }
      const k = .5 / s.z, px = W / 2 + s.x * W * k * .5, py = H / 2 + s.y * H * k * .5;
      if (px < 0 || px > W || py < 0 || py > H) continue;
      const a = Math.min(1, (1 - s.z) * 1.4) * (.65 + .35 * Math.sin(now / 900 + s.t));
      x.fillStyle = `rgba(201,212,255,${a})`;
      x.beginPath(); x.arc(px, py, Math.max(.4, (1 - s.z) * 1.6), 0, 6.283); x.fill();
    }
  };
  requestAnimationFrame(draw);
}

// The portal hand-off: the ring grows out of the eclipse (or the clicked thing), the screen floods with light, the tour opens.
const warp = document.querySelector('.warp');
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-portal]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  e.preventDefault();
  if (RM) { location.href = a.href; return; }
  // Start from the eclipse if it's on screen, otherwise from what was clicked.
  const ecl = [...document.querySelectorAll('.eclipse')].find((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
  const r = (ecl ?? a).getBoundingClientRect(), d = Math.max(60, Math.min(r.width, r.height));
  const ring = warp.firstElementChild;
  ring.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;width:${d}px;height:${d}px`;
  warp.classList.remove('go'); void warp.offsetWidth; warp.classList.add('go');
  setTimeout(() => { location.href = a.href; }, 950);
});
// Header: transparent over the hero, solid once the page scrolls.
const top = document.querySelector('.top');
const solid = () => top?.classList.toggle('solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true }); solid();

// Coming back (browser back button restores the page from cache): clear the flash.
addEventListener('pageshow', () => warp?.classList.remove('go'));
