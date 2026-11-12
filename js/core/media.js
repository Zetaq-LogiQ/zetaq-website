// Page videos play only while they're on screen, so we never decode thirty clips at once.
export function autoplay() {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) e.target.play().catch(() => {});
    else e.target.pause();
  }), { rootMargin: '150px 0px', threshold: .01 });
  document.querySelectorAll('video[data-auto]').forEach((v) => io.observe(v));
}
