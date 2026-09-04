// Header nav behaviour. The menu is native <details>, so a link inside it
// jumps within the same page and leaves the panel hanging open; and the
// sticky bar would otherwise cover the heading it just scrolled to. This
// wires up closing, the anchor offset, and a scroll-spy so the menu shows
// which chapter you are reading.
const header = document.querySelector<HTMLElement>(".site-header");
const menu = document.querySelector<HTMLDetailsElement>(".site-header .menu");
const links = Array.from(
  document.querySelectorAll<HTMLAnchorElement>('.site-header .menu a[href^="#"]'),
);

// keep scroll-margin-top in sync with the bar's real height, which moves
// with the fluid type scale
if (header) {
  const setHeight = () =>
    document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
  setHeight();
  if ("ResizeObserver" in window) new ResizeObserver(setHeight).observe(header);
  else window.addEventListener("resize", setHeight);
}

if (menu) {
  const close = () => {
    menu.open = false;
  };

  menu.querySelector("nav")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) close();
  });

  document.addEventListener("click", (e) => {
    if (menu.open && !menu.contains(e.target as Node)) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.open) {
      close();
      menu.querySelector("summary")?.focus();
    }
  });
}

// scroll-spy: the last section whose top has passed under the header wins
const sections = links
  .map((link) => document.querySelector<HTMLElement>(link.hash))
  .filter((el): el is HTMLElement => el !== null)
  .sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );

if (sections.length) {
  let queued = false;

  const spy = () => {
    queued = false;
    const line = (header?.offsetHeight ?? 0) + 24;
    let current = "";
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= line) current = section.id;
    }
    for (const link of links) {
      if (current && link.hash === `#${current}`) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(spy);
  };

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  spy();
}
