// Header: shows the chapter you're in (from data-label) and, if the page has one, a thin progress line.
export function header() {
  const spy = document.getElementById('spy'), bar = document.getElementById('bar');
  const sections = [...document.querySelectorAll('[data-label]')];
  return () => {
    if (bar) {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    }
    let label = '';
    for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * .4) label = s.dataset.label;
    if (spy.textContent !== label) spy.textContent = label;
  };
}
