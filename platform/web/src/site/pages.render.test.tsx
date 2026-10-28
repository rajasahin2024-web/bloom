/**
 * TEC-136 — render the real /ielts and /platform seed files through the
 * section registry and assert the prototype blocks are all produced.
 * Catches prop-shape drift between seeds and components.
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SECTION_REGISTRY } from "./sections/registry";
import type { SiteSection } from "./sections/types";

const SEED_DIR = resolve(__dirname, "../../../api/app/seed");
const ieltsSeed = JSON.parse(readFileSync(resolve(SEED_DIR, "ielts_sections.json"), "utf-8"));
const platformSeed = JSON.parse(
  readFileSync(resolve(SEED_DIR, "platform_sections.json"), "utf-8"),
);

function page(seed: { sections: SiteSection[] }) {
  const { container } = render(
    <>
      {seed.sections.map((s) => {
        const C = SECTION_REGISTRY[s.type];
        if (!C) throw new Error(`no component for ${s.type}`);
        return createElement(C, { key: s.id, props: s.props, animation: s.animation });
      })}
    </>,
  );
  return { container, text: container.textContent ?? "" };
}

describe("/ielts seed render", () => {
  it("exam-format data table", () => {
    const { container, text } = page(ieltsSeed);
    expect(container.querySelectorAll("table.tbl tbody tr").length).toBeGreaterThanOrEqual(4);
    expect(text).toContain("Know the test before you sit it.");
    expect(text).toContain("Two conversations and two monologues");
  });

  it("nine-band scale table", () => {
    const { container, text } = page(ieltsSeed);
    expect(container.querySelectorAll(".bandscale .brow")).toHaveLength(8);
    expect(text).toContain("Expert user");
    expect(text).toContain("Rounding:");
  });

  it("four skillcards with rows and tips", () => {
    const { container, text } = page(ieltsSeed);
    expect(container.querySelectorAll(".skillcard")).toHaveLength(4);
    expect(container.querySelectorAll(".skillcard .tips")).toHaveLength(4);
    expect(text).toContain("Where it is won");
  });

  it("academic/general checklist + conversion side table", () => {
    const { container, text } = page(ieltsSeed);
    expect(container.querySelectorAll(".checklist li").length).toBeGreaterThanOrEqual(3);
    expect(text).toContain("Score conversions");
    expect(text).toContain("Duolingo");
  });

  it("five-stage steps", () => {
    const { container, text } = page(ieltsSeed);
    expect(container.querySelectorAll(".steps .step")).toHaveLength(5);
    expect(text).toContain("Placement test");
    expect(text).toContain("Measured, then adjusted");
  });

  it("feedback correction card with band bars", () => {
    const { container, text } = page(ieltsSeed);
    expect(container.querySelectorAll(".prow")).toHaveLength(4);
    expect(text).toContain("People are becoming increasingly dependent");
  });

  it("CTA band with both buttons", () => {
    const { container } = page(ieltsSeed);
    expect(container.querySelector(".band a.btn-white")?.textContent).toContain(
      "Take the free placement test",
    );
    expect(container.querySelector(".band a.btn-line")?.textContent).toContain(
      "Sign in to my account",
    );
  });
});

describe("/platform seed render", () => {
  it("dark feature grid with six cards + CTA", () => {
    const { container, text } = page(platformSeed);
    expect(container.querySelector(".sec.dark")).toBeTruthy();
    expect(container.querySelectorAll(".feat")).toHaveLength(6);
    expect(text).toContain("Writing Lab");
    expect(text).toContain("Try the platform free");
  });

  it("portal tour with five tabs and chrome url", () => {
    const { container, text } = page(platformSeed);
    expect(container.querySelectorAll(".tpick")).toHaveLength(5);
    expect(container.querySelector(".shot .url")?.textContent).toBe(
      "bloomielts.com/portal/dashboard",
    );
    expect(text).toContain("Open the live portal");
  });

  it("CTA band", () => {
    const { container } = page(platformSeed);
    expect(container.querySelector(".band a.btn-white")).toBeTruthy();
  });
});
