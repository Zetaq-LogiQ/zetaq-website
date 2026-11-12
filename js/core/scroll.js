import { clamp } from './math.js';

// One animation loop for the whole page.
// Each chapter registers its section and an update(progress, dt) function.
// Updates only run while the section is on (or near) the screen.

const scenes = [];

export function scene(el, update) {
  scenes.push({ el, update });
}

// 0 when the section's top reaches the top of the screen, 1 when its pinned run ends.
export function progress(el) {
  const r = el.getBoundingClientRect(), run = r.height - innerHeight;
  return run > 0 ? clamp(-r.top / run) : clamp(1 - r.bottom / (r.height + innerHeight));
}

export function start(afterEachFrame) {
  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    // Frame timestamps can be slightly older than `last` on the first frame; never let time run backwards.
    const dt = Math.max(0, Math.min(.05, (now - last) / 1000));
    last = now;
    for (const s of scenes) {
      const r = s.el.getBoundingClientRect();
      if (r.bottom > -80 && r.top < innerHeight + 80) s.update(progress(s.el), dt);
    }
    afterEachFrame?.(dt);
  };
  requestAnimationFrame(tick);
}
