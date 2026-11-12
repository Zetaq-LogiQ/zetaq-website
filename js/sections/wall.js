import { scene } from '../core/scroll.js';
import { span, lerp } from '../core/math.js';

// Chapter 11: a wall of videos lies tilted back like a table and rises upright as you scroll.
export function wall(sec) {
  const el = sec.querySelector('.wall'), head = sec.querySelector('.head');
  scene(sec, (p) => {
    const k = span(p, .05, .6);
    el.style.transform = `rotateX(${lerp(62, 0, k)}deg) translateY(${lerp(18, 0, k)}%) scale(${lerp(.82, 1, k)})`;
    el.style.opacity = lerp(.3, 1, k);
    head.style.transform = `translateY(${lerp(30, 0, span(p, 0, .3))}px)`;
  });
}
