// "Test your brain": intro -> age -> 10 questions -> report teaser -> parent's contact + consent -> thank you.
// Scoring (documented in _src/BRAIN_TEST.md): every answer adds trait points from the question data, process signals
// add a little more (reading before acting, checking your work), "how sure" answers are scored against how the task
// actually went. Each trait is then compared with the most that question set allows.
// DEV HOOK: window.ZETAQ_SUBMIT('brain-test', payload) sends it; without it the page says nothing was sent.
import { VERSION, TRAITS, STYLES, KIND_LABEL, AGES, SETS } from './questions.js';
import { createNeural } from './neural.js';

const T = Object.keys(TRAITS);
const root = document.getElementById('bt');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none)').matches;
const now = () => Math.round(performance.now());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const zero = () => Object.fromEntries(T.map((k) => [k, 0]));
const add = (acc, w, k = 1) => { for (const t in w || {}) acc[t] += w[t] * k; };
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const SURE = ['Not sure', 'A little', 'Fairly', 'Very'];

// ---------------------------------------------------------------- the living network behind the quiz
document.body.classList.add('bt-on');
// Behind the live network: a real neuron film (the user's clip, graded navy and cold blue, looped forwards and back).
{
  const film = document.body.insertBefore(Object.assign(document.createElement('div'), { className: 'bt-film', ariaHidden: 'true' }), document.body.firstChild);
  const v = film.appendChild(Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, preload: 'auto', poster: 'assets/posters/brain_bg.jpg' }));
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) { v.src = 'assets/brain_bg.mp4'; v.autoplay = true; v.play().catch(() => {}); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) v.pause(); else if (v.src) v.play().catch(() => {}); });
}
const net = createNeural(document.body.insertBefore(Object.assign(document.createElement('canvas'), { className: 'bt-neural', ariaHidden: 'true' }), document.body.firstChild));
// Every tap inside the quiz: a ripple on the button and a burst of signals in the network behind it.
root.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('button, .btn');
  if (!b || b.disabled || RM) return;
  const r = b.getBoundingClientRect(), dot = document.createElement('span');
  dot.className = 'bt-ripple'; dot.setAttribute('aria-hidden', 'true');
  dot.style.left = `${e.clientX - r.left}px`; dot.style.top = `${e.clientY - r.top}px`;
  b.append(dot); setTimeout(() => dot.remove(), 650);
});
root.addEventListener('click', (e) => {
  const b = e.target.closest('button, .btn');
  if (!b || b.disabled) return;
  const r = b.getBoundingClientRect(), keyb = !e.clientX && !e.clientY;
  net.fire(keyb ? r.left + r.width / 2 : e.clientX, keyb ? r.top + r.height / 2 : e.clientY, b.classList.contains('btn') ? 1 : .55);
});
// A short line of encouragement between questions (never about scores).
const CHEERS = ['Nice thinking.', 'Neurons firing.', 'Good one. Keep going.', 'Your network is lighting up.', 'Sharp.', 'On a roll.', 'Love the focus.', 'Brain in motion.'];
let cheerBag = [];
const cheerEl = document.body.appendChild(h('<div class="bt-cheer" role="status" aria-live="polite"></div>'));
function cheer(done, n) {
  let text;
  if (done === Math.ceil(n / 2)) text = 'Halfway there.';
  else if (done === n - 1) text = 'Last one.';
  else { if (!cheerBag.length) cheerBag = shuffle(CHEERS); text = cheerBag.pop(); }
  cheerEl.textContent = text;
  cheerEl.classList.remove('go'); void cheerEl.offsetWidth; cheerEl.classList.add('go');
}
// A little network for each age card: more neurons for older groups. Signals run along its synapses (CSS).
function miniNet(n, seed) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const pts = Array.from({ length: n }, () => [14 + rnd() * 152, 14 + rnd() * 72]);
  const lines = [];
  pts.forEach((p, i) => pts.map((q, j) => [j, Math.hypot(p[0] - q[0], p[1] - q[1])]).filter(([j]) => j > i).sort((a, b) => a[1] - b[1]).slice(0, 2)
    .forEach(([j]) => lines.push([p, pts[j]])));
  const f = (v) => v.toFixed(1);
  return `<svg class="bt-mini" viewBox="0 0 180 100" aria-hidden="true">${lines.map(([p, q], k) => `<line x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(q[0])}" y2="${f(q[1])}"/><line class="sig" style="animation-delay:${(-k * .37).toFixed(2)}s" x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(q[0])}" y2="${f(q[1])}"/>`).join('')}${pts.map((p, k) => `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${k % 3 ? 2.6 : 3.6}"/>`).join('')}</svg>`;
}

// ---------------------------------------------------------------- scoring
// Best value that fits the budget (tiny brute force: at most 2^8 mixes).
const bestValue = (q) => {
  let best = 0;
  for (let m = 0; m < 1 << q.items.length; m++) {
    let c = 0, v = 0;
    q.items.forEach((it, i) => { if (m >> i & 1) { c += it.cost; v += it.value; } });
    if (c <= q.limit && v > best) best = v;
  }
  return best;
};
const orderFrac = (n, k) => (n > 1 ? (n - 1 - k) / (n - 1) : 1);

// Points one answer earns, plus the style it leans to. a = the stored answer.
function score(q, a) {
  const p = zero(), style = [];
  if (q.type === 'choice') {
    const o = q.options[a.value.choice];
    add(p, o.w); if (o.s) style.push(o.s);
    if (q.why && a.value.why != null) add(p, q.why.options[a.value.why].w);
    if (a.t_first_ms >= 3000) p.A += .5;                 // read it all before acting
  } else if (q.type === 'order') {
    const n = q.items.length;
    a.value.order.forEach((idx, k) => add(p, q.items[idx].early, orderFrac(n, k)));
    const first = q.items[a.value.order[0]];
    if (first?.s) style.push(first.s);
  } else if (q.type === 'slider') {
    const b = q.bands.find((x) => a.value.estimate >= x.lo && a.value.estimate <= x.hi);
    if (b) { add(p, b.w); a.quality = b.q; if (b.q === 1) style.push('analyst'); } else a.quality = 0;
  } else if (q.type === 'memory') {
    const hits = a.value.picked.filter((x) => q.show.includes(x)).length, wrong = a.value.picked.length - hits;
    a.quality = Math.max(0, (hits - wrong) / q.show.length);
    p.M += 4 * a.quality;
    if (wrong === 0 && hits > 0) p.A += 1;
  } else if (q.type === 'spot') {
    const hits = a.value.tapped.filter((i) => q.targets.includes(i)).length, wrong = a.value.tapped.length - hits;
    a.quality = Math.max(0, (hits - wrong) / q.targets.length);
    p.A += 4 * a.quality;
  } else if (q.type === 'pick') {
    const items = a.value.picked.map((i) => q.items[i]), spent = items.reduce((s, x) => s + x.cost, 0), val = items.reduce((s, x) => s + x.value, 0);
    const ratio = val / bestValue(q);
    p.R += 4 * ratio;
    if (spent >= .8 * q.limit) p.P += 1;
    if (items.some((x) => x.tag === 'unusual')) { p.C += 1; style.push('creator'); }
    if (ratio >= .9) style.push('analyst');
  } else if (q.type === 'uses') {
    const items = a.value.picked.map((i) => q.items[i]).filter((x) => x.u >= 0);
    p.C += Math.min(4, items.length * .4 + items.reduce((s, x) => s + x.u, 0) * .5);
    if (items.length >= 5) style.push('creator');
  }
  // Checking your work: a change or two on a task is a good sign; constant flipping is not.
  if (['order', 'pick', 'slider', 'spot'].includes(q.type) && a.changes >= 1 && a.changes <= 3) p.A += .5;
  // How sure were you, against how it went (1 = perfectly calibrated).
  if (q.sure && a.sure != null) p.F += 3 * (1 - Math.abs((a.quality ?? 0) - a.sure / 3));
  return { p, style };
}

// The most each trait can earn in a set (sum over questions of each question's best case for that trait).
function maxima(set) {
  const m = zero();
  for (const q of set) {
    const best = zero();
    const take = (w) => { for (const t in w) best[t] = Math.max(best[t], w[t]); };
    if (q.type === 'choice') {
      const o = zero(), y = zero();
      q.options.forEach((x) => T.forEach((t) => { o[t] = Math.max(o[t], x.w[t] || 0); }));
      q.why?.options.forEach((x) => T.forEach((t) => { y[t] = Math.max(y[t], x.w[t] || 0); }));
      T.forEach((t) => { best[t] = o[t] + y[t]; });
      best.A += .5;
    } else if (q.type === 'order') {
      const n = q.items.length;
      T.forEach((t) => { best[t] = q.items.map((x) => x.early[t] || 0).sort((a, b) => b - a).reduce((s, w, k) => s + w * orderFrac(n, k), 0); });
    } else if (q.type === 'slider') q.bands.forEach((b) => take(b.w));
    else if (q.type === 'memory') { best.M = 4; best.A = 1; }
    else if (q.type === 'spot') best.A = 4;
    else if (q.type === 'pick') { best.R = 4; best.P = 1; best.C = 1; }
    else if (q.type === 'uses') best.C = 4;
    if (['order', 'pick', 'slider', 'spot'].includes(q.type)) best.A += .5;
    if (q.sure) best.F += 3;
    T.forEach((t) => { m[t] += best[t]; });
  }
  return m;
}

// Raw points -> 0..100. Nobody can max every trait at once (the choices pull different ways), so 70 % of the
// theoretical best already counts as 100.
const BANDS = [[85, 'Standout'], [70, 'Strong'], [45, 'Steady'], [0, 'Growing']];
const band = (v) => BANDS.find(([lo]) => v >= lo)[1];
function report(set, answers) {
  const raw = zero(), styles = {};
  set.forEach((q, i) => { const { p, style } = score(q, answers[i]); T.forEach((t) => { raw[t] += p[t]; }); style.forEach((s) => { styles[s] = (styles[s] || 0) + 1; }); });
  const max = maxima(set), scores = {};
  T.forEach((t) => { scores[t] = Math.round(100 * Math.min(1, raw[t] / (max[t] * .7 || 1))); });
  const style = Object.entries(styles).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'explorer';
  const top = [...T].sort((a, b) => scores[b] - scores[a]).slice(0, 2);
  return { raw, max, scores, bands: Object.fromEntries(T.map((t) => [t, band(scores[t])])), style, top };
}

// ---------------------------------------------------------------- screens
const S = { age: null, set: null, i: 0, answers: [], startedAt: null };

function show(el) {
  const old = root.firstElementChild;
  const swap = () => { root.replaceChildren(el); requestAnimationFrame(() => el.classList.add('in')); el.querySelector('[data-focus]')?.focus({ preventScroll: true }); };
  if (old && !RM) { old.classList.add('out'); setTimeout(swap, 220); } else swap();
  if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
}

function intro() {
  net.setProgress(.04);
  const el = h(`<div class="bt-screen bt-intro">
    <p class="kick">Test your brain</p>
    <h1>Ten questions. <em>No single right answer.</em></h1>
    <p class="lead">Ten short challenges. Take your time and answer the way you really would.</p>
    <ul class="bt-facts"><li><b>About 8 minutes</b><span>One question at a time</span></li><li><b>No wrong answers</b><span>Just be yourself</span></li><li><b>Your brain report</b><span>Sent to your parent at the end</span></li></ul>
    <button class="btn bt-go" type="button" data-focus><span>Start</span><i aria-hidden="true"></i></button></div>`);
  el.querySelector('.btn').onclick = agePick;
  show(el);
}

function agePick() {
  net.setProgress(.08);
  const el = h(`<div class="bt-screen bt-age"><p class="kick">First things first</p><h2>How old are you?</h2><p class="lead">Each age group gets its own ten challenges.</p>
    <div class="bt-ages">${AGES.map((a, i) => `<button type="button" class="bt-agebtn" data-id="${a.id}" ${i ? '' : 'data-focus'}>${miniNet([6, 9, 13][i], 11 + i * 7)}<b>${a.id}</b><span>${a.label}</span><i>${a.line}</i></button>`).join('')}</div></div>`);
  el.querySelectorAll('.bt-agebtn').forEach((b) => { b.onclick = () => { S.age = b.dataset.id; S.set = SETS[S.age]; S.i = 0; S.answers = []; S.startedAt = new Date().toISOString(); question(); }; });
  show(el);
}

// One question screen. Each type builds its body and reports when the answer is complete.
function question() {
  const q = S.set[S.i], n = S.set.length;
  const a = { qid: `${VERSION}.${q.id}`, type: q.type, value: null, t_first_ms: null, t_total_ms: null, changes: 0, hint: false, sure: null };
  let shownAt = now(), ready = false;
  net.setProgress(.12 + .78 * S.i / n);
  const el = h(`<div class="bt-screen bt-q">
    <div class="bt-top"><span class="bt-count">Question <b>${String(S.i + 1).padStart(2, '0')}</b> / ${n}</span><span class="bt-kind">${KIND_LABEL[q.type]}</span></div>
    <div class="bt-chain" aria-hidden="true">${S.set.map((_, k) => `${k ? `<s class="${k <= S.i ? 'lit' : ''}"></s>` : ''}<i class="${k < S.i ? 'done' : k === S.i ? 'on' : ''}"></i>`).join('')}</div>
    <h2 class="bt-prompt">${esc(q.prompt)}</h2>${q.sub ? `<p class="bt-sub">${esc(q.sub)}</p>` : ''}
    <div class="bt-body"></div>
    <div class="bt-sure" hidden><p>How sure are you that you did well?</p><div class="bt-seg">${SURE.map((s, k) => `<button type="button" data-k="${k}">${s}</button>`).join('')}</div></div>
    <div class="bt-foot">${q.hint ? '<button type="button" class="bt-hintbtn">Need a hint?</button>' : '<span></span>'}<button type="button" class="btn bt-next" disabled>${S.i === n - 1 ? 'Finish' : 'Next'}</button></div>
  </div>`);
  const body = el.querySelector('.bt-body'), next = el.querySelector('.bt-next'), sureBox = el.querySelector('.bt-sure');
  const touched = () => { if (a.t_first_ms == null) a.t_first_ms = now() - shownAt; };
  const update = () => { next.disabled = !(ready && (!q.sure || a.sure != null)); };
  const complete = (ok) => {
    const was = ready;
    ready = ok; if (q.sure) sureBox.hidden = !ok; update();
    // Desktop: once the answer is complete, bring the sure-scale / Next button into view (phones keep Next pinned at the bottom).
    if (ok && !was && innerWidth > 700) requestAnimationFrame(() => (q.sure ? sureBox : next).scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'nearest' }));
  };
  sureBox.querySelectorAll('button').forEach((b) => { b.onclick = () => { a.sure = +b.dataset.k; sureBox.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); update(); if (innerWidth > 700) next.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'nearest' }); }; });
  if (q.hint) {
    const hb = el.querySelector('.bt-hintbtn');
    hb.onclick = () => { a.hint = true; hb.replaceWith(h(`<p class="bt-hint">${esc(q.hint)}</p>`)); };
  }
  next.onclick = () => {
    a.t_total_ms = now() - shownAt;
    S.answers[S.i] = a;
    if (++S.i < n) { cheer(S.i, n); question(); } else teaser();
  };

  BUILD[q.type](q, a, body, { touched, complete, restart: () => { shownAt = now(); } });
  el._keys = (e) => {
    if (e.key === 'Enter' && !next.disabled && !(e.target instanceof HTMLButtonElement)) { next.click(); e.preventDefault(); }
  };
  show(el);
}

const BUILD = {
  choice(q, a, body, { touched, complete }) {
    a.value = { choice: null, why: null };
    body.innerHTML = `<div class="bt-opts" role="radiogroup">${q.options.map((o, k) => `<button type="button" role="radio" aria-checked="false" data-k="${k}" ${k ? '' : 'data-focus'}><span class="key">${String.fromCharCode(65 + k)}</span><span>${esc(o.t)}</span></button>`).join('')}</div>
      ${q.why ? `<div class="bt-why" hidden><p class="bt-whyq">${esc(q.why.prompt)}</p><div class="bt-opts small" role="radiogroup">${q.why.options.map((o, k) => `<button type="button" role="radio" aria-checked="false" data-k="${k}"><span>${esc(o.t)}</span></button>`).join('')}</div></div>` : ''}`;
    const groups = body.querySelectorAll('.bt-opts'), why = body.querySelector('.bt-why');
    const pick = (g, key, k) => {
      touched();
      if (a.value[key] != null && a.value[key] !== k) a.changes++;
      a.value[key] = k;
      g.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', +b.dataset.k === k));
      if (key === 'choice' && why) { why.hidden = false; if (touch || innerWidth < 760) setTimeout(() => why.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'nearest' }), 60); }
      complete(a.value.choice != null && (!q.why || a.value.why != null));
    };
    groups[0].querySelectorAll('button').forEach((b) => { b.onclick = () => pick(groups[0], 'choice', +b.dataset.k); });
    if (why) groups[1].querySelectorAll('button').forEach((b) => { b.onclick = () => pick(groups[1], 'why', +b.dataset.k); });
    body._keys = (e) => {    // A-D or 1-4 picks an option in the first group still open
      const k = /^[1-9]$/.test(e.key) ? +e.key - 1 : /^[a-dA-D]$/.test(e.key) ? e.key.toUpperCase().charCodeAt(0) - 65 : -1;
      if (k < 0) return;
      const g = why && a.value.choice != null ? groups[1] : groups[0], key = g === groups[0] ? 'choice' : 'why';
      if (k < g.children.length) pick(g, key, k);
    };
  },

  order(q, a, body, { touched, complete }) {
    a.value = { order: [] };
    body.innerHTML = `<ol class="bt-order">${q.items.map((it, k) => `<li><button type="button" data-k="${k}" ${k ? '' : 'data-focus'}><span class="pos" aria-hidden="true"></span><span>${esc(it.t)}</span></button></li>`).join('')}</ol>
      <button type="button" class="bt-reset" hidden>Start again</button>`;
    const btns = [...body.querySelectorAll('.bt-order button')], reset = body.querySelector('.bt-reset');
    const draw = () => {
      btns.forEach((b) => {
        const pos = a.value.order.indexOf(+b.dataset.k);
        b.querySelector('.pos').textContent = pos >= 0 ? pos + 1 : '';
        b.classList.toggle('set', pos >= 0);
        b.setAttribute('aria-label', `${pos >= 0 ? `Step ${pos + 1}: ` : ''}${q.items[+b.dataset.k].t}`);
      });
      reset.hidden = !a.value.order.length;
      complete(a.value.order.length === q.items.length);
    };
    btns.forEach((b) => {
      b.onclick = () => {
        touched();
        const k = +b.dataset.k, at = a.value.order.indexOf(k);
        if (at >= 0) { a.value.order.splice(at); a.changes++; }  // tapping a numbered step takes it and everything after it back
        else a.value.order.push(k);
        draw();
      };
    });
    reset.onclick = () => { a.value.order = []; a.changes++; draw(); btns[0].focus(); };
    draw();
  },

  slider(q, a, body, { touched, complete }) {
    a.value = { estimate: q.start };
    const fmt = (v) => Number(v).toLocaleString('en-IN');
    body.innerHTML = `<div class="bt-slider"><output class="bt-val"><b>${fmt(q.start)}</b> ${esc(q.unit)}</output>
      <input type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${q.start}" aria-label="${esc(q.prompt)}" data-focus>
      <div class="bt-scale"><span>${fmt(q.min)}</span><span>${fmt(q.max)}</span></div>
      <div class="bt-nudge"><button type="button" data-d="-1" aria-label="Less">−</button><button type="button" data-d="1" aria-label="More">+</button></div></div>`;
    const r = body.querySelector('input'), out = body.querySelector('.bt-val b');
    let moving = false, moved = false;
    const set = (v) => { a.value.estimate = +v; out.textContent = fmt(v); touched(); if (!moved) { moved = true; complete(true); } };
    r.addEventListener('input', () => { if (!moving) { moving = true; if (moved) a.changes++; } set(r.value); });
    r.addEventListener('change', () => { moving = false; });
    body.querySelectorAll('.bt-nudge button').forEach((b) => {
      b.onclick = () => { r.value = Math.min(q.max, Math.max(q.min, +r.value + +b.dataset.d * q.step)); if (moved) a.changes++; set(r.value); };
    });
  },

  memory(q, a, body, { touched, complete, restart }) {
    a.value = { picked: [] };
    body.innerHTML = `<div class="bt-mem"><div class="bt-memgrid look">${q.show.map((s) => `<span>${esc(s)}</span>`).join('')}</div><div class="bt-cover"><button type="button" class="btn ghost" data-focus>I'm ready: show me</button></div></div>`;
    const grid = body.querySelector('.bt-memgrid'), cover = body.querySelector('.bt-cover');
    cover.querySelector('button').onclick = () => {
      cover.remove();
      grid.classList.add('open');
      const bar = body.querySelector('.bt-mem').appendChild(h(`<div class="bt-timer"><i style="animation-duration:${q.seconds}s"></i></div>`));
      setTimeout(() => {
        bar.remove();
        const pool = shuffle(q.pool);
        body.querySelector('.bt-mem').replaceWith(h(`<div><p class="bt-sub">Now tap every one you saw.</p><div class="bt-memgrid pick">${pool.map((s) => `<button type="button" aria-pressed="false">${esc(s)}</button>`).join('')}</div></div>`));
        restart();            // time to first action counts from the recall screen
        body.querySelectorAll('.pick button').forEach((b) => {
          b.onclick = () => {
            touched();
            const s = b.textContent, at = a.value.picked.indexOf(s);
            if (at >= 0) { a.value.picked.splice(at, 1); a.changes++; } else a.value.picked.push(s);
            b.setAttribute('aria-pressed', at < 0);
            complete(a.value.picked.length > 0);
          };
        });
        body.querySelector('.pick button').focus({ preventScroll: true });
      }, q.seconds * 1000);
    };
  },

  spot(q, a, body, { touched, complete }) {
    a.value = { tapped: [] };
    const cols = q.cols || 6;
    body.innerHTML = `<div class="bt-spot ${q.cells[0].length > 1 ? 'words' : ''}" style="--cols:${cols}">${q.cells.map((c, i) => `<button type="button" aria-pressed="false" data-i="${i}" ${i ? '' : 'data-focus'}>${esc(c)}</button>`).join('')}</div>`;
    body.querySelectorAll('.bt-spot button').forEach((b) => {
      b.onclick = () => {
        touched();
        const i = +b.dataset.i, at = a.value.tapped.indexOf(i);
        if (at >= 0) { a.value.tapped.splice(at, 1); a.changes++; } else a.value.tapped.push(i);
        b.setAttribute('aria-pressed', at < 0);
        complete(a.value.tapped.length > 0);
      };
    });
  },

  pick(q, a, body, { touched, complete }) {
    a.value = { picked: [] };
    const money = (v) => `${q.unit}${Number(v).toLocaleString('en-IN')}`;
    body.innerHTML = `<div class="bt-budget"><div class="bt-bar"><i></i></div><p><b class="spent">${money(0)}</b> of ${money(q.limit)} <span class="left"></span></p></div>
      <div class="bt-items">${q.items.map((it, k) => `<button type="button" aria-pressed="false" data-k="${k}" ${k ? '' : 'data-focus'}><span>${esc(it.t)}</span><b>${money(it.cost)}</b></button>`).join('')}</div>
      <p class="bt-warn" hidden></p>`;
    const bar = body.querySelector('.bt-bar i'), spentEl = body.querySelector('.spent'), left = body.querySelector('.left'), warn = body.querySelector('.bt-warn');
    const spent = () => a.value.picked.reduce((s, i) => s + q.items[i].cost, 0);
    const draw = () => {
      const s = spent();
      bar.style.width = `${(s / q.limit) * 100}%`;
      spentEl.textContent = money(s);
      left.textContent = `· ${money(q.limit - s)} left`;
      complete(a.value.picked.length > 0);
    };
    body.querySelectorAll('.bt-items button').forEach((b) => {
      b.onclick = () => {
        touched();
        const k = +b.dataset.k, at = a.value.picked.indexOf(k);
        warn.hidden = true;
        if (at >= 0) { a.value.picked.splice(at, 1); a.changes++; b.setAttribute('aria-pressed', false); }
        else if (spent() + q.items[k].cost > q.limit) {
          warn.textContent = `That would go over ${money(q.limit)}. Drop something first, or pick something cheaper.`;
          warn.hidden = false;
          b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope');
        } else { a.value.picked.push(k); b.setAttribute('aria-pressed', true); }
        draw();
      };
    });
    draw();
    complete(false);
  },

  uses(q, a, body, { touched, complete }) {
    a.value = { picked: [] };
    body.innerHTML = `<div class="bt-chips">${q.items.map((it, k) => `<button type="button" aria-pressed="false" data-k="${k}" ${k ? '' : 'data-focus'}>${esc(it.t)}</button>`).join('')}</div>`;
    body.querySelectorAll('.bt-chips button').forEach((b) => {
      b.onclick = () => {
        touched();
        const k = +b.dataset.k, at = a.value.picked.indexOf(k);
        if (at >= 0) { a.value.picked.splice(at, 1); a.changes++; } else a.value.picked.push(k);
        b.setAttribute('aria-pressed', at < 0);
        complete(a.value.picked.length > 0);
      };
    });
  },
};

// ---------------------------------------------------------------- after the questions
let RESULT = null;
function teaser() {
  RESULT = report(S.set, S.answers);
  const st = STYLES[RESULT.style];
  net.celebrate();
  const el = h(`<div class="bt-screen bt-teaser">
    <span class="bt-burst" aria-hidden="true"></span>
    <p class="kick">Your thinking style</p>
    <h2>${st.name.replace('The ', 'The <em>')}</em></h2>
    <p class="lead">${st.line}</p>
    <div class="bt-tops">${RESULT.top.map((t) => `<div class="bt-trait"><div class="row"><b>${TRAITS[t].name}</b><span>${RESULT.bands[t]}</span></div><div class="meter"><i style="--v:${RESULT.scores[t]}%"></i></div><p>${TRAITS[t].line}</p></div>`).join('')}</div>
    <div class="bt-more"><p>Your full report goes much deeper, with a few things to try this week.</p></div>
    <button class="btn" type="button" data-focus>Get the full report</button></div>`);
  el.querySelector('.btn').onclick = contact;
  show(el);
  requestAnimationFrame(() => setTimeout(() => el.classList.add('fill'), 900));
}

const CONSENT = "I am this child's parent or guardian. I agree that ZetaQ may use these answers to prepare this brain report and send it to me by email or phone.";
function contact() {
  const el = h(`<div class="bt-screen bt-contact">
    <p class="kick">Almost done</p>
    <h2>Where should we send <em>the report?</em></h2>
    <p class="lead">Please ask a parent or guardian to fill this in.</p>
    <form class="bt-form" novalidate>
      <label><span>Child's first name <i>(optional)</i></span><input name="child_first_name" autocomplete="off" maxlength="40"></label>
      <label><span>Parent or guardian's name *</span><input name="parent_name" autocomplete="name" required maxlength="80" data-focus></label>
      <label><span>Parent's email *</span><input name="parent_email" type="email" autocomplete="email" inputmode="email" required></label>
      <label><span>Parent's mobile number *</span><div class="tel"><b>+91</b><input name="parent_phone" type="tel" autocomplete="tel-national" inputmode="numeric" required placeholder="10-digit number"></div></label>
      <label class="check"><input type="checkbox" name="consent" required><span>${CONSENT}</span></label>
      <p class="bt-priv">We use these details only to send this report. Read our <a href="privacy.html">Privacy Policy</a>.</p>
      <p class="bt-err" hidden></p>
      <button class="btn" type="submit">Send the report</button>
    </form></div>`);
  const f = el.querySelector('form'), err = el.querySelector('.bt-err');
  f.addEventListener('input', () => { err.hidden = true; });
  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const phone = String(d.parent_phone || '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
    const problems = [];
    if (!String(d.parent_name || '').trim()) problems.push("the parent's name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(d.parent_email || '').trim())) problems.push('a valid email');
    if (!/^[6-9]\d{9}$/.test(phone)) problems.push('a 10-digit mobile number');
    if (!d.consent) problems.push("the parent's consent");
    if (problems.length) { err.textContent = `Please add ${problems.join(', ')}.`; err.hidden = false; return; }
    err.hidden = true;
    const btn = f.querySelector('[type=submit]');
    btn.disabled = true;
    const payload = buildPayload({ child_first_name: String(d.child_first_name || '').trim() || null, parent_name: String(d.parent_name).trim(), parent_email: String(d.parent_email).trim(), parent_phone: `+91${phone}` });
    window.__brainPayload = payload;     // for testing
    let sent = false;
    try { if (window.ZETAQ_SUBMIT) { await window.ZETAQ_SUBMIT('brain-test', payload); sent = true; } }
    catch { err.textContent = 'Something went wrong. Please try again, or email support@zetaq.in.'; err.hidden = false; btn.disabled = false; return; }
    done(sent);
  };
  show(el);
}

function buildPayload(contactInfo) {
  return {
    kind: 'brain_check', v: 1, question_set: `${VERSION}.${S.age}`, age_group: S.age,
    started_at: S.startedAt, finished_at: new Date().toISOString(),
    device: { w: innerWidth, h: innerHeight, touch },
    answers: S.answers.map(({ quality, ...a }) => a),
    result: { scores: RESULT.scores, bands: RESULT.bands, raw: RESULT.raw, max: RESULT.max, style: RESULT.style, top: RESULT.top },
    contact: { ...contactInfo, consent: true, consent_text: CONSENT, consent_at: new Date().toISOString() },
  };
}

function done(sent) {
  net.celebrate();
  const el = h(`<div class="bt-screen bt-done">
    <span class="bt-halo" aria-hidden="true"></span>
    <p class="kick">Thank you</p>
    <h2>${sent ? 'Your report is <em>on its way.</em>' : 'All done. <em>Well thought.</em>'}</h2>
    <p class="lead">${sent ? 'Look out for it in the email and phone you gave us.' : 'Preview build: this test is not connected yet, so no report was sent.'}</p>
    <div class="ctas"><a class="btn" href="tour/#enter" data-focus>Explore ZetaQ</a><button class="btn ghost" type="button">Take it again</button></div></div>`);
  el.querySelector('button').onclick = agePick;
  show(el);
}

addEventListener('keydown', (e) => {
  const scr = root.firstElementChild;
  if (!scr || e.altKey || e.ctrlKey || e.metaKey || e.target.matches?.('input, textarea')) return;
  scr.querySelector('.bt-body')?._keys?.(e);
  scr._keys?.(e);
});

intro();
