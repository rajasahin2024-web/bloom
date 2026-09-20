import { describe, expect, it } from "vitest";
import {
  adminStepComplete,
  checkLabel,
  dbStepComplete,
  dbTargetFromForm,
  initialWizardData,
  instituteStepComplete,
  parsePort,
  redisStepComplete,
  redisTargetFromForm,
  validateAdminForm,
  validateDbForm,
  validateInstituteForm,
  validateRedisForm,
} from "@/lib/wizard";
import type { DatabaseTestResult, RedisTestResult } from "@/lib/setup";

const okDbResult: DatabaseTestResult = {
  ok: true,
  checks: [
    { name: "tcp", ok: true, detail: "reachable" },
    { name: "auth", ok: true, detail: "ok" },
    { name: "pgvector", ok: true, detail: "installed" },
  ],
  postgres_version: "PostgreSQL 16.4",
  pgvector_installed: true,
  pgbouncer_detected: false,
  error: null,
  hint: null,
};

const okRedis: RedisTestResult = { ok: true, error: null };

describe("parsePort", () => {
  it("accepts valid ports", () => {
    expect(parsePort("5432")).toBe(5432);
    expect(parsePort(" 6432 ")).toBe(6432);
    expect(parsePort("1")).toBe(1);
    expect(parsePort("65535")).toBe(65535);
  });
  it("rejects invalid ports", () => {
    expect(parsePort("")).toBeNull();
    expect(parsePort("abc")).toBeNull();
    expect(parsePort("0")).toBeNull();
    expect(parsePort("65536")).toBeNull();
    expect(parsePort("54.5")).toBeNull();
    expect(parsePort("-1")).toBeNull();
  });
});

describe("form → contract mapping", () => {
  it("maps the db form to the fixed test-database payload", () => {
    const t = dbTargetFromForm(initialWizardData.db);
    expect(t).toEqual({
      host: "localhost",
      port: 5433,
      database: "bloom",
      username: "bloom",
      password: "",
      ssl: false,
      connection_type: "direct",
    });
  });
  it("maps empty redis password to null", () => {
    const t = redisTargetFromForm(initialWizardData.redis);
    expect(t).toEqual({ host: "localhost", port: 6380, password: null });
  });
  it("keeps a non-empty redis password", () => {
    const t = redisTargetFromForm({
      host: "r",
      port: "1",
      password: "secret",
    });
    expect(t?.password).toBe("secret");
  });
});

describe("validation", () => {
  it("flags missing db fields", () => {
    const errs = validateDbForm({
      ...initialWizardData.db,
      host: "  ",
      port: "x",
      database: "",
      username: "",
    });
    expect(errs.host).toBeTruthy();
    expect(errs.port).toBeTruthy();
    expect(errs.database).toBeTruthy();
    expect(errs.username).toBeTruthy();
  });
  it("passes a complete db form", () => {
    expect(validateDbForm(initialWizardData.db)).toEqual({});
  });
  it("flags redis host/port", () => {
    const errs = validateRedisForm({ host: "", port: "0", password: "" });
    expect(errs.host).toBeTruthy();
    expect(errs.port).toBeTruthy();
  });
  it("enforces admin email + 8-char password", () => {
    const errs = validateAdminForm({
      name: "",
      email: "not-an-email",
      password: "short",
    });
    expect(errs.name).toBeTruthy();
    expect(errs.email).toBeTruthy();
    expect(errs.password).toBeTruthy();
  });
  it("accepts a valid admin form", () => {
    expect(
      validateAdminForm({
        name: "Ayesha",
        email: "a@b.co",
        password: "long-enough",
      }),
    ).toEqual({});
  });
});

describe("institute form", () => {
  it("requires a name; tagline and logo are optional", () => {
    const errs = validateInstituteForm(initialWizardData.institute);
    expect(errs.name).toBeTruthy();
    expect(errs.tagline).toBeUndefined();
    expect(errs.logoDataUrl).toBeUndefined();
    expect(instituteStepComplete(initialWizardData)).toBe(false);
  });
  it("passes with just a name", () => {
    const d = {
      ...initialWizardData,
      institute: {
        name: "Sunrise IELTS Academy",
        tagline: "",
        logoDataUrl: null,
        logoName: null,
      },
    };
    expect(validateInstituteForm(d.institute)).toEqual({});
    expect(instituteStepComplete(d)).toBe(true);
  });
  it("rejects a non-image logo data URL", () => {
    const errs = validateInstituteForm({
      name: "X",
      tagline: "",
      logoDataUrl: "data:text/html;base64,PGI+",
      logoName: "x.html",
    });
    expect(errs.logoDataUrl).toBeTruthy();
  });
});

describe("step completion gates", () => {
  it("db step needs a passing test on the current values", () => {
    const d = { ...initialWizardData };
    expect(dbStepComplete(d)).toBe(false);
    const target = dbTargetFromForm(d.db)!;
    const tested = { ...d, dbResult: okDbResult, dbTestedTarget: target };
    expect(dbStepComplete(tested)).toBe(true);
  });
  it("editing fields after a test makes the result stale", () => {
    const d = { ...initialWizardData };
    const target = dbTargetFromForm(d.db)!;
    const tested = { ...d, dbResult: okDbResult, dbTestedTarget: target };
    const edited = {
      ...tested,
      db: { ...tested.db, host: "other-host" },
    };
    expect(dbStepComplete(edited)).toBe(false);
  });
  it("a failed test does not unlock the step", () => {
    const d = { ...initialWizardData };
    const target = dbTargetFromForm(d.db)!;
    const failed = {
      ...d,
      dbResult: { ...okDbResult, ok: false },
      dbTestedTarget: target,
    };
    expect(dbStepComplete(failed)).toBe(false);
  });
  it("redis completes by explicit skip or passing test", () => {
    const d = { ...initialWizardData };
    expect(redisStepComplete(d)).toBe(false);
    expect(redisStepComplete({ ...d, redisSkipped: true })).toBe(true);
    const target = redisTargetFromForm(d.redis)!;
    const tested = {
      ...d,
      redisResult: okRedis,
      redisTestedTarget: target,
    };
    expect(redisStepComplete(tested)).toBe(true);
  });
  it("admin step requires a valid form", () => {
    const d = { ...initialWizardData };
    expect(adminStepComplete(d)).toBe(false);
    const filled = {
      ...d,
      admin: { name: "A", email: "a@b.co", password: "12345678" },
    };
    expect(adminStepComplete(filled)).toBe(true);
  });
  it("admin step completes on explicit skip", () => {
    expect(
      adminStepComplete({ ...initialWizardData, adminSkipped: true }),
    ).toBe(true);
  });
});

describe("checkLabel", () => {
  it("maps backend check names to labels", () => {
    expect(checkLabel("tcp")).toBe("TCP reachable");
    expect(checkLabel("auth")).toBe("Authenticate & query");
    expect(checkLabel("pgvector")).toBe("pgvector extension");
    expect(checkLabel("pgbouncer")).toBe("PgBouncer admin console");
    expect(checkLabel("other")).toBe("other");
  });
});
