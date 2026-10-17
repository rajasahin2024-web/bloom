/**
 * Site runtime — ports the prototype's tail script into a typed module.
 *
 * Sticky nav, mobile-menu close, scroll-reveal (`.rv` → `.in`) and the
 * stat-strip count-up animation. Called once after the page renders; a
 * module-level flag guards against double-init when React re-mounts.
 */
let initialized = false;

function setupStickyNav(): void {
  const nav = document.getElementById("siteNav");
  if (!nav) return;
  const onScroll = () => nav.classList.toggle("stuck", window.scrollY > 12);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function setupMobileMenu(): void {
  document.querySelectorAll("#mob a").forEach((a) =>
    a.addEventListener("click", () =>
      document.getElementById("mob")?.classList.remove("on"),
    ),
  );
}

function setupScrollReveal(): void {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.12, rootMargin: "0px 0px -40px" },
  );
  document.querySelectorAll(".rv").forEach((el, i) => {
    (el as HTMLElement).style.transitionDelay = `${(i % 4) * 70}ms`;
    io.observe(el);
  });
}

function setupCountUp(): void {
  const strip = document.querySelector(".strip");
  if (!strip) return;
  const cio = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        e.target.querySelectorAll("b").forEach((b) => {
          const raw = b.textContent?.trim() ?? "";
          const m = raw.match(/^([+]?)([\d,.]+)(%?)$/);
          if (!m) return;
          const dec = m[2].includes(".") ? 1 : 0;
          const end = parseFloat(m[2].replace(/,/g, ""));
          let t0: number | null = null;
          const step = (ts: number) => {
            if (t0 === null) t0 = ts;
            const p = Math.min(1, (ts - t0) / 1100);
            const v = end * (1 - Math.pow(1 - p, 3));
            b.textContent =
              m[1] +
              (dec ? v.toFixed(1) : Math.round(v).toLocaleString()) +
              m[3];
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      }),
    { threshold: 0.4 },
  );
  cio.observe(strip);
}

export function initSiteRuntime(): void {
  if (initialized) return;
  initialized = true;
  setupStickyNav();
  setupMobileMenu();
  setupScrollReveal();
  setupCountUp();
}
