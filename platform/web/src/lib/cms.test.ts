import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { isSlugTaken, slugify } from "@/lib/cms";

describe("slugify", () => {
  it("lowercases and kebab-cases", () => {
    expect(slugify("My First Post!")).toBe("my-first-post");
  });

  it("collapses separators and trims edges", () => {
    expect(slugify("  IELTS — Band 7  ")).toBe("ielts-band-7");
    expect(slugify("a--b___c")).toBe("a-b-c");
  });

  it("strips diacritics", () => {
    expect(slugify("Café naïve déjà")).toBe("cafe-naive-deja");
  });

  it("drops non-ascii leftovers", () => {
    expect(slugify("বাংলা post")).toBe("post");
  });

  it("returns empty for punctuation-only input", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("isSlugTaken", () => {
  it("matches the 409 slug_taken contract", () => {
    const err = new ApiError("slug_taken", 409, { detail: "slug_taken" });
    expect(isSlugTaken(err)).toBe(true);
  });

  it("rejects other 409s and non-conflict errors", () => {
    expect(
      isSlugTaken(new ApiError("category has children", 409, null)),
    ).toBe(false);
    expect(isSlugTaken(new ApiError("Not found", 404, null))).toBe(false);
    expect(isSlugTaken(new Error("boom"))).toBe(false);
  });
});
