import { scene } from '../core/scroll.js';
import { clamp } from '../core/math.js';

// Chapter 2: vertical scroll moves a horizontal strip of films. Cards tilt away from the centre (coverflow).
export function films(sec) {
  const track = sec.querySelector('.track'), cards = [...track.querySelectorAll('.film')];
  scene(sec, (p) => {
    const max = track.scrollWidth - innerWidth, x = -p * max, mid = innerWidth / 2;
    track.style.transform = `translate3d(${x}px, 0, 0)`;
    for (const c of cards) {
      const d = clamp((c.offsetLeft + x + c.offsetWidth / 2 - mid) / innerWidth, -1.5, 1.5);   // -1 left edge .. 1 right edge
      c.style.transform = `perspective(1400px) rotateY(${d * -24}deg) scale(${1 - Math.abs(d) * .14})`;
      c.style.opacity = 1 - clamp(Math.abs(d) - .55) * 1.4;
    }
  });
}
