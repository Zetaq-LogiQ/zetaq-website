import { scene } from '../core/scroll.js';
import { range, span } from '../core/math.js';

// Chapter 3: the lesson plays inside the letters "STEP INSIDE".
// Scrolling scales the black mask around the "I" until its white stroke covers the screen: we fly in.
export function inside(sec) {
  const mask = sec.querySelector('.mask'), hole = mask.querySelector('b'), kick = sec.querySelector('.kick'), after = sec.querySelector('.after');
  scene(sec, (p) => {
    const k = range(p, .12, .62);
    mask.style.transformOrigin = `${hole.offsetLeft + hole.offsetWidth / 2}px ${hole.offsetTop + hole.offsetHeight * .55}px`;
    mask.style.transform = `scale(${1 + k ** 3 * 110})`;
    mask.style.opacity = 1 - range(p, .58, .64);
    kick.style.opacity = 1 - span(p, .1, .2);
    after.style.opacity = span(p, .68, .8);
  });
}
