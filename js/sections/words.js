import { scene } from '../core/scroll.js';
import { span } from '../core/math.js';

// Chapter 7: the paragraph lights up word by word as you scroll. The last word ("why?") is accented.
export function words(sec) {
  const p = sec.querySelector('.words');
  p.innerHTML = p.textContent.trim().split(/\s+/).map((w) => `<span>${w}</span>`).join(' ');
  const spans = [...p.children];
  spans.at(-1).classList.add('hl');
  scene(sec, (k) => {
    const n = Math.round(span(k, .08, .85) * spans.length);
    spans.forEach((s, i) => s.classList.toggle('on', i < n));
  });
}
