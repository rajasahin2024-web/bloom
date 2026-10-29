import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * TEC-145 — unscoped ported-CSS regression gate.
 *
 * Bug class (shipped twice: TEC-139, TEC-142): CSS blocks ported from
 * `prototype/bloom-*.css` were inlined into site.css scoped under bare
 * `.site-root` instead of `.site-root .app`, so app-shell selectors like
 * `.site-root .brand` / `.site-root .nav` collided with site chrome at
 * equal specificity.
 *
 * This test enforces the review rule both ways:
 *
 *  1. App-shell classes — any class that appears inside a
 *     `.site-root .app …` selector — must never be styled by a bare
 *     `.site-root <app-class>` selector, because that selector also
 *     matches the same class inside the `.app` subtree (the leak).
 *  2. Symmetrically, a bare `.site-root <app-class>` selector is exactly
 *     the signature of a ported app-shell block that was committed
 *     under-scoped, so the gate catches the TEC-139/142 pattern too.
 *
 * Detected shape: the first descendant compound after `.site-root` starts
 * with an app-shell class (`.site-root .nav`, `.site-root .brand svg`,
 * `.site-root.has-banner .nav`). Selectors gated behind a site-only
 * ancestor (`.site-root .tcard .who`) do not leak and are not flagged.
 *
 * KNOWN_BARE_LEAKS is a ratchet: these selectors are site chrome that
 * pre-dates the port and currently have no `.app` markup to hit. Any NEW
 * offender fails the suite. When learner-app (`.app`) pages land under
 * `.site-root`, the known list must be eliminated by scoping site chrome
 * (e.g. a `.site` shell class or child combinators) — see TEC-145.
 */

const KNOWN_BARE_LEAKS = new Set([
  ".site-root .stage",
  ".site-root .wrap",
  ".site-root .nav",
  ".site-root .nav.stuck",
  ".site-root .nav .in",
  ".site-root.has-banner .nav",
  ".site-root .brand",
  ".site-root .brand svg",
  ".site-root .brand img",
  ".site-root .brand b",
  ".site-root .brand span",
  ".site-root .eb",
  ".site-root .eb:before",
  ".site-root .dot",
]);

const STYLES_DIR = resolve(process.cwd(), "src/styles");

/** `.site-root`-bearing selectors from every stylesheet in this directory. */
function siteRootSelectors(): string[] {
  const files = readdirSync(STYLES_DIR).filter((f) => f.endsWith(".css"));
  const selectors: string[] = [];
  for (const file of files) {
    const css = readFileSync(join(STYLES_DIR, file), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    for (const match of css.matchAll(/([^{}]+)\{/g)) {
      for (const part of match[1].split(",")) {
        const sel = part.trim();
        if (sel.includes(".site-root")) selectors.push(sel);
      }
    }
  }
  return selectors;
}

function compounds(selector: string): string[] {
  return selector.split(/\s*[\s>+~]\s*/).filter(Boolean);
}

function classesOf(compound: string): string[] {
  return [...compound.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
}

describe("ported CSS scoping gate (TEC-145)", () => {
  const selectors = siteRootSelectors();

  /** Classes styled under `.site-root .app` — the app-shell namespace. */
  const appClasses = new Set<string>();
  for (const sel of selectors) {
    const comps = compounds(sel);
    const rootIdx = comps.findIndex((c) => c.includes(".site-root"));
    const isAppScoped = comps.some((c, i) => i > rootIdx && c.includes(".app"));
    if (!isAppScoped) continue;
    for (const comp of comps.slice(rootIdx + 1)) {
      for (const cls of classesOf(comp)) {
        if (cls !== "app") appClasses.add(cls);
      }
    }
  }

  /**
   * Bare `.site-root` selectors whose first descendant class is an
   * app-shell class — these match elements inside `.app` too, so they
   * leak site rules onto the app shell (and vice versa for new ports).
   */
  const bareLeaks = selectors.filter((sel) => {
    if (sel.includes(".app")) return false;
    const comps = compounds(sel);
    const rootIdx = comps.findIndex((c) => c.includes(".site-root"));
    const firstDescendant = comps[rootIdx + 1];
    if (!firstDescendant) return false;
    const firstClass = classesOf(firstDescendant)[0];
    return firstClass !== undefined && appClasses.has(firstClass);
  });

  it("exposes app-shell classes to assert against", () => {
    expect(appClasses.size).toBeGreaterThan(0);
  });

  it("has no NEW bare .site-root selectors that leak into .app", () => {
    const newLeaks = bareLeaks.filter((s) => !KNOWN_BARE_LEAKS.has(s));
    expect(
      newLeaks,
      `new under-scoped .site-root selectors hit app-shell classes — scope ported CSS under its own shell root (e.g. ".site-root .app"); see TEC-145:\n${newLeaks.join("\n")}`,
    ).toEqual([]);
  });
});
