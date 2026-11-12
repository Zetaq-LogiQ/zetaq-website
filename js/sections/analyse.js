// Chapter 9: the recording stays put while three short beats scroll past; the one in the middle is lit.
export function analyse(sec) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('on', e.isIntersecting)), { rootMargin: '-42% 0px -42% 0px' });
  sec.querySelectorAll('.beat').forEach((b) => io.observe(b));
}
