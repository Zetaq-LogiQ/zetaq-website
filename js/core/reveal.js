// Elements marked data-reveal fade up the first time they enter the screen.
export function reveal() {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), { threshold: .15 });
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
}
