// The living neural network behind "Test your brain" (canvas 2D).
// Three depth layers of neurons joined by synapses; signals travel along them and hop on to the next synapse.
// setProgress(0..1) wakes more of the network as the student moves through the questions; fire(x, y) sends a burst
// of signals from the neurons nearest a tap; celebrate() lights the whole network for the result.
// Smooth on phones: fewer neurons on small screens, devicePixelRatio capped, paused while the tab is hidden,
// and a still, lit picture (no drift, no signals) under prefers-reduced-motion.

const COLORS = ['#4aa8ff', '#6cc4ff', '#6cc4ff', '#3fd6e0', '#8a7dff'];
const LAYERS = [{ z: .35, size: .7, alpha: .45 }, { z: .65, size: 1, alpha: .7 }, { z: 1, size: 1.35, alpha: 1 }];

// A soft round glow, drawn once per colour and stamped with drawImage (far cheaper than shadowBlur).
const sprites = new Map();
function sprite(color) {
  if (sprites.has(color)) return sprites.get(color);
  const c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 }), x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.12, color); g.addColorStop(.4, color + '55'); g.addColorStop(1, color + '00');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  sprites.set(color, c);
  return c;
}
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

export function createNeural(canvas) {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const x = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, nodes = [], edges = [], pulses = [], ripples = [];
  let progress = 0, shown = 0, glow = 0, mx = 0, my = 0, tmx = 0, tmy = 0, running = true, last = 0, raf = 0, still = false;

  // Build the network for this screen size. Each neuron links to its nearest neighbours in the same layer.
  function build() {
    const small = W < 700, area = W * H;
    const total = Math.round(Math.min(small ? 80 : 170, Math.max(44, area / (small ? 4600 : 8200))));
    nodes = []; edges = [];
    LAYERS.forEach((L, li) => {
      const n = Math.round(total * [.4, .33, .27][li]);
      for (let i = 0; i < n; i++) {
        nodes.push({
          L: li, x: Math.random() * (W + 160) - 80, y: Math.random() * (H + 160) - 80,
          vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6,
          c: COLORS[Math.floor(Math.random() * COLORS.length)], r: (1.6 + Math.random() * 2.2) * L.size,
          wake: Math.random(),          // the order in which neurons wake up as progress grows
          ph: Math.random() * 6.28, flash: 0, links: [],
        });
      }
    });
    const maxD = Math.min(W, H) * (small ? .24 : .17);
    nodes.forEach((a, i) => {
      const near = nodes.map((b, j) => [j, b]).filter(([j, b]) => j !== i && b.L === a.L)
        .map(([j, b]) => [j, Math.hypot(a.x - b.x, a.y - b.y)]).filter(([, d]) => d < maxD).sort((p, q) => p[1] - q[1]).slice(0, 3);
      near.forEach(([j]) => {
        if (edges.some((e) => (e.a === i && e.b === j) || (e.a === j && e.b === i))) return;
        const k = edges.push({ a: i, b: j, heat: 0 }) - 1;
        a.links.push(k); nodes[j].links.push(k);
      });
    });
  }

  function size() {
    dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    build();
    if (RM) still = false;
  }

  const awake = (n) => n.wake < shown * .8 + .2;        // a fifth of the network is awake from the start
  const pos = (n) => { const L = LAYERS[n.L]; return [n.x + mx * 40 * L.z, n.y + my * 28 * L.z]; };

  // Send a signal from neuron i along one of its synapses (not back the way it came).
  function emit(i, from = -1, energy = 1) {
    const n = nodes[i], opts = n.links.filter((k) => k !== from);
    if (!opts.length || pulses.length > 260) return;
    const k = opts[Math.floor(Math.random() * opts.length)], e = edges[k];
    pulses.push({ k, from: i, to: e.a === i ? e.b : e.a, t: 0, speed: .9 + Math.random() * .9, energy });
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    if (RM) { shown = progress; if (still) return; }
    else shown += (progress - shown) * Math.min(1, dt * 1.6);
    glow = Math.max(0, glow - dt * .35);
    mx += (tmx - mx) * Math.min(1, dt * 2); my += (tmy - my) * Math.min(1, dt * 2);

    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';

    // Drift (gentle), wrap round the edges.
    if (!RM) nodes.forEach((n) => {
      n.x += n.vx * dt; n.y += n.vy * dt;
      if (n.x < -100) n.x += W + 200; if (n.x > W + 100) n.x -= W + 200;
      if (n.y < -100) n.y += H + 200; if (n.y > H + 100) n.y -= H + 200;
      n.flash = Math.max(0, n.flash - dt * 1.8);
    });

    // Synapses: faint when asleep, brighter between awake neurons, hot while a signal passes.
    x.lineWidth = 1;
    edges.forEach((e) => {
      const a = nodes[e.a], b = nodes[e.b], L = LAYERS[a.L];
      const [ax, ay] = pos(a), [bx, by] = pos(b);
      if (Math.abs(ax - bx) > W * .6 || Math.abs(ay - by) > H * .6) return;   // a pair split by the wrap
      e.heat = Math.max(0, e.heat - dt * 1.5);
      const on = awake(a) && awake(b) ? 1 : 0;
      const al = L.alpha * (.13 + on * .2 + e.heat * .55 + glow * .25);
      x.strokeStyle = rgba(on ? '#6cc4ff' : '#4aa8ff', Math.min(.9, al));
      x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
    });

    // Signals: a bright bead with a short tail. On arrival the neuron flashes and (often) passes it on.
    if (!RM) {
      const rate = (.6 + shown * 7 + glow * 20) * dt;      // spontaneous firing grows as the network wakes
      for (let s = 0; s < 3 && Math.random() < rate; s++) {
        const awakeIdx = nodes.map((n, i) => (awake(n) ? i : -1)).filter((i) => i >= 0);
        if (awakeIdx.length) emit(awakeIdx[Math.floor(Math.random() * awakeIdx.length)], -1, .7);
      }
      for (let p = pulses.length - 1; p >= 0; p--) {
        const q = pulses[p], e = edges[q.k], A = nodes[q.from], B = nodes[q.to];
        const [ax, ay] = pos(A), [bx, by] = pos(B), len = Math.hypot(bx - ax, by - ay) || 1;
        q.t += (q.speed * 260 / len) * dt;
        e.heat = Math.max(e.heat, .6 * q.energy);
        if (q.t >= 1) {
          B.flash = Math.min(1, B.flash + .7 * q.energy);
          pulses.splice(p, 1);
          if (Math.random() < .55 + q.energy * .3 && q.energy > .25) emit(q.to, q.k, q.energy * .82);
          continue;
        }
        const px = ax + (bx - ax) * q.t, py = ay + (by - ay) * q.t, L = LAYERS[A.L];
        const tx = ax + (bx - ax) * Math.max(0, q.t - .09), ty = ay + (by - ay) * Math.max(0, q.t - .09);
        const g = x.createLinearGradient(tx, ty, px, py);
        g.addColorStop(0, 'rgba(108,196,255,0)'); g.addColorStop(1, rgba('#e3f4ff', .85 * L.alpha));
        x.strokeStyle = g; x.lineWidth = 2 * L.size;
        x.beginPath(); x.moveTo(tx, ty); x.lineTo(px, py); x.stroke();
        const r = 9 * L.size * (.6 + q.energy * .6);
        x.globalAlpha = L.alpha; x.drawImage(sprite('#6cc4ff'), px - r, py - r, r * 2, r * 2); x.globalAlpha = 1;
      }
      x.lineWidth = 1;
    }

    // Neurons: a glow plus a bright core; awake ones are bigger and breathe.
    nodes.forEach((n) => {
      const L = LAYERS[n.L], [px, py] = pos(n), on = awake(n);
      if (px < -40 || px > W + 40 || py < -40 || py > H + 40) return;
      const breathe = RM ? 1 : .85 + .15 * Math.sin(now / 900 + n.ph);
      const k = (on ? 1 : .35) * breathe + n.flash * .9 + glow * .6;
      const r = n.r * (on ? 4.2 : 2.6) * (1 + n.flash * .8) * (1 + glow * .4);
      x.globalAlpha = Math.min(1, L.alpha * (on ? .85 : .4) * Math.min(1.4, k));
      x.drawImage(sprite(n.c), px - r * 2, py - r * 2, r * 4, r * 4);
      x.globalAlpha = 1;
    });

    // Ripples from taps.
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.t += dt / (RM ? .01 : 1.1);
      if (rp.t >= 1) { ripples.splice(i, 1); continue; }
      x.strokeStyle = rgba('#6cc4ff', (1 - rp.t) * .5 * rp.s);
      x.lineWidth = 2 * (1 - rp.t) + .5;
      x.beginPath(); x.arc(rp.x, rp.y, 20 + rp.t * rp.R, 0, 6.283); x.stroke();
    }
    x.globalCompositeOperation = 'source-over';
    if (RM) still = true;
  }

  // The neurons nearest a screen point (the near layer first: that's where a tap "lands").
  function nearestTo(px, py, count) {
    return nodes.map((n, i) => { const [nx, ny] = pos(n); return [i, Math.hypot(nx - px, ny - py) / LAYERS[n.L].z]; })
      .sort((a, b) => a[1] - b[1]).slice(0, count).map(([i]) => i);
  }

  addEventListener('resize', () => { size(); still = false; });
  addEventListener('pointermove', (e) => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; }, { passive: true });
  document.addEventListener('visibilitychange', () => { running = !document.hidden; last = 0; });
  size();
  raf = requestAnimationFrame(frame);

  return {
    setProgress(p) { progress = Math.max(0, Math.min(1, p)); still = false; },
    // A burst of signals from the neurons around (px, py), strength 0..1.
    fire(px, py, s = 1) {
      still = false;
      ripples.push({ x: px, y: py, t: 0, R: 160 + 140 * s, s });
      if (RM) return;
      nearestTo(px, py, 3 + Math.round(4 * s)).forEach((i) => {
        nodes[i].flash = 1;
        const shots = 1 + Math.round(2 * s);
        for (let k = 0; k < shots; k++) emit(i, -1, .75 + .25 * s);
      });
    },
    // The result moment: everything wakes, signals race out from the centre.
    celebrate() {
      progress = 1; glow = 1; still = false;
      ripples.push({ x: W / 2, y: H * .42, t: 0, R: Math.max(W, H) * .7, s: 1 });
      if (RM) return;
      nearestTo(W / 2, H * .42, 18).forEach((i, k) => setTimeout(() => { nodes[i].flash = 1; for (let j = 0; j < 3; j++) emit(i, -1, 1); }, k * 40));
    },
    stop() { cancelAnimationFrame(raf); },
  };
}
