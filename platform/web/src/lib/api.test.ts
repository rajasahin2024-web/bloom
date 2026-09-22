import { describe, expect, it } from "vitest";
import { ApiError, apiFieldErrors } from "@/lib/api";

describe("apiFieldErrors", () => {
  it("reads FastAPI dict-detail validation errors (422)", () => {
    const err = new ApiError("Request failed (HTTP 422)", 422, {
      detail: {
        errors: { "institute.contact_email": "must be a valid email address" },
      },
    });
    expect(apiFieldErrors(err)).toEqual({
      "institute.contact_email": "must be a valid email address",
    });
  });

  it("reads a top-level errors map", () => {
    const err = new ApiError("Request failed (HTTP 422)", 422, {
      errors: { "academic.batch_size": "must be positive" },
    });
    expect(apiFieldErrors(err)).toEqual({
      "academic.batch_size": "must be positive",
    });
  });

  it("returns null when there are no field errors", () => {
    expect(
      apiFieldErrors(new ApiError("Unauthorized", 401, { detail: "nope" })),
    ).toBeNull();
    expect(
      apiFieldErrors(new ApiError("x", 422, { detail: { errors: {} } })),
    ).toBeNull();
    expect(
      apiFieldErrors(new ApiError("x", 422, { detail: { errors: [1, 2] } })),
    ).toBeNull();
    expect(apiFieldErrors(new ApiError("x", 500))).toBeNull();
    expect(apiFieldErrors(new Error("boom"))).toBeNull();
    expect(apiFieldErrors("nope")).toBeNull();
  });

  it("drops non-string values from the errors map", () => {
    const err = new ApiError("x", 422, {
      detail: { errors: { a: "bad", b: 42 } },
    });
    expect(apiFieldErrors(err)).toEqual({ a: "bad" });
  });
});
