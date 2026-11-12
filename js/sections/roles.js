import { scene } from '../core/scroll.js';
import { clamp } from '../core/math.js';
import { chipSync } from '../core/chips.js';

// Chapter 10: teacher, parent and school cards stack like a deck.
// Each card's chips follow its recording; tapping a chip jumps the recording there.
export function roles(sec) {
  const cards = [...sec.querySelectorAll('.role')];

  cards.forEach(chipSync);

  // While the next card slides over, the one underneath shrinks and dims.
  const stacked = matchMedia('(min-width: 901px)');
  scene(sec, () => {
    if (!stacked.matches) return;
    cards.forEach((c, i) => {
      const next = cards[i + 1];
      if (!next) return;
      const q = clamp(1 - (next.getBoundingClientRect().top - c.getBoundingClientRect().top) / innerHeight);
      c.style.transform = `scale(${1 - q * .06})`;
      c.style.filter = `brightness(${1 - q * .5})`;
    });
  });
}
