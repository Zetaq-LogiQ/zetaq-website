// Plays one slice [start, end] of a page <video> once, then freezes on the end frame.
// tick() can be called every frame for a precise stop; timeupdate covers the rest.
export function segmentPlayer(v) {
  let end = Infinity;
  const tick = () => {
    if (v.currentTime < end) return;
    v.pause();
    if (v.currentTime > end + .05) v.currentTime = end;   // ran past (e.g. background tab): snap back
  };
  v.addEventListener('timeupdate', tick);
  return {
    tick,
    play(start, stop) {
      end = stop;
      const go = () => { v.currentTime = start; v.play().catch(() => {}); };
      if (v.readyState > 0) go(); else v.addEventListener('loadedmetadata', go, { once: true });
    },
  };
}
