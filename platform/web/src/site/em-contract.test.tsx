/**
 * TEC-146 — heading-accent contract: every page seed whose prototype heading
 * wraps accent words in `<em>` must render that many real <em> elements.
 * Counts are the prototype inventory (per page); courses excludes the stray
 * post-</html> catalogue section (TL ruling) and Bloom.html's wizard-stage
 * headings are not part of the public site.
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SECTION_REGISTRY } from "./sections/registry";
import type { SiteSection } from "./sections/types";

const SEED_DIR = resolve(__dirname, "../../../api/app/seed");

const EM_COUNTS: Record<string, number> = {
  home: 17,
  ielts: 7,
  about: 5,
  careers: 5,
  abroad: 4,
  courses: 3,
  medical: 3,
  platform: 3,
  results: 3,
  blog: 2,
  contact: 1,
  login: 1,
};

function renderPage(slug: string) {
  const seed = JSON.parse(
    readFileSync(resolve(SEED_DIR, `${slug}_sections.json`), "utf-8"),
  );
  const { container } = render(
    <>
      {seed.sections.map((s: SiteSection) => {
        const C = SECTION_REGISTRY[s.type];
        if (!C) throw new Error(`no component for ${s.type}`);
        return createElement(C, { key: s.id, props: s.props, animation: s.animation });
      })}
    </>,
  );
  return container;
}

describe("<em> heading-accent contract", () => {
  for (const [slug, count] of Object.entries(EM_COUNTS)) {
    it(`/${slug === "home" ? "" : slug} renders ${count} em accent(s)`, () => {
      const container = renderPage(slug);
      expect(container.querySelectorAll("em").length).toBe(count);
    });
  }

  it("em elements carry accent text, not literal markup", () => {
    const container = renderPage("home");
    const ems = [...container.querySelectorAll("em")].map((e) => e.textContent);
    expect(ems).toContain("marked the real exam");
    expect(ems).toContain("whole");
    expect(ems.every((t) => t && !t.includes("<"))).toBe(true);
  });
});
