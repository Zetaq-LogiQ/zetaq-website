// Small helpers for turning scroll progress into animation values.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;

// 0..1 while p travels from a to b (linear).
export const range = (p, a, b) => clamp((p - a) / (b - a));

// Same, with a soft start and stop (smoothstep). Most motion on the page uses this.
export const span = (p, a, b) => { const t = range(p, a, b); return t * t * (3 - 2 * t); };

// Ease a value towards a target at a frame-rate independent speed.
export const follow = (cur, target, dt, speed = 7) => cur + (target - cur) * Math.min(1, dt * speed);

export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
