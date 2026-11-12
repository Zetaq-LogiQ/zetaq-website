import { scene } from '../core/scroll.js';
import { span, lerp } from '../core/math.js';

// Chapter 6: three game cards start as a stack and fan out (sideways on wide screens, downwards on phones).
export function fan(sec) {
  const cards = [...sec.querySelectorAll('.fan figure')], caps = cards.map((c) => c.querySelector('figcaption'));
  scene(sec, (p) => {
    const k = span(p, .12, .6), wide = innerWidth > 700, gap = wide ? Math.min(innerWidth * .33, 470) : innerHeight * .2;
    cards.forEach((c, i) => {
      const o = i - 1;   // -1, 0, 1
      const x = wide ? o * gap * k : 0, y = wide ? Math.abs(o) * 36 * k : o * gap * k;
      c.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${o * lerp(4, wide ? 9 : 2, k)}deg) scale(${lerp(.82, 1, k)})`;
      c.style.zIndex = o === 0 ? 2 : 1;
      caps[i].style.opacity = span(p, .5, .62);
    });
  });
}
