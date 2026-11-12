// Feature chips under a dashboard recording: the chip for the current moment lights up,
// and tapping a chip jumps the recording there. Chips carry their start second in data-t.
export function chipSync(root) {
  const v = root.querySelector('video'), chips = [...root.querySelectorAll('[data-t]')];
  chips.forEach((b) => b.addEventListener('click', () => { v.currentTime = +b.dataset.t; v.play().catch(() => {}); }));
  v.addEventListener('timeupdate', () => {
    let k = 0;
    chips.forEach((b, i) => { if (v.currentTime >= +b.dataset.t) k = i; });
    chips.forEach((b, i) => b.classList.toggle('on', i === k));
  });
}
