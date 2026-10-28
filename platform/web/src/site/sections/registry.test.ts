import { describe, expect, it } from "vitest";
import { SECTION_META, SECTION_REGISTRY, SECTION_TYPES } from "./registry";

describe("SECTION_REGISTRY", () => {
  it("has a component for every declared section type", () => {
    const expected = [
      "nav",
      "hero",
      "stats_strip",
      "destinations",
      "rich_block",
      "steps",
      "feature_grid",
      "showcase",
      "certificate_list",
      "staff_cards",
      "testimonial_cards",
      "overseas",
      "university_grid",
      "cta_strip",
      "pricing_tiers",
      "reach",
      "life",
      "paper_cta",
      "contact",
      "footer",
      "band_table",
      "faq",
      "course_grid",
      "uni_filter",
      "data_table",
      "moments",
      "map_block",
      "job_list",
      "job_form",
      "blog_grid",
      "blog_filter",
      "auth_page",
    ];
    for (const t of expected) {
      expect(SECTION_REGISTRY[t]).toBeDefined();
    }
    expect(SECTION_TYPES).toEqual(expect.arrayContaining(expected));
  });

  it("every component is a renderable function", () => {
    for (const t of SECTION_TYPES) {
      const C = SECTION_REGISTRY[t];
      expect(typeof C).toBe("function");
    }
  });
});

describe("SECTION_META", () => {
  it("has an entry with fields for every registry type", () => {
    for (const t of SECTION_TYPES) {
      const meta = SECTION_META[t];
      expect(meta).toBeDefined();
      expect(meta.label).toBeTruthy();
      expect(Array.isArray(meta.fields)).toBe(true);
      expect(meta.fields.length).toBeGreaterThan(0);
    }
  });

  it("list fields declare itemFields", () => {
    for (const t of SECTION_TYPES) {
      for (const f of SECTION_META[t].fields) {
        if (f.list) {
          expect(Array.isArray(f.itemFields)).toBe(true);
          expect(f.itemFields!.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("group fields declare nested fields", () => {
    for (const t of SECTION_TYPES) {
      for (const f of SECTION_META[t].fields) {
        if (f.kind === "group") {
          expect(Array.isArray(f.fields)).toBe(true);
          expect(f.fields!.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
