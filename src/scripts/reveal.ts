// Scroll-reveal: headings and figures marked [data-reveal] fade/rise into
// place the first time they cross into view. One shared observer for the
// whole page rather than one per section component.
const els = document.querySelectorAll<HTMLElement>("[data-reveal]");

if (els.length && "IntersectionObserver" in window) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    for (const el of els) el.classList.add("is-visible");
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    for (const el of els) io.observe(el);
  }
} else {
  for (const el of els) el.classList.add("is-visible");
}
