/**
 * Setup wizard state + validation — pure functions, no DOM.
 * Kept separate from the React components so the rules are unit-testable.
 */
import type {
  DatabaseTarget,
  DatabaseTestResult,
  RedisTarget,
  RedisTestResult,
} from "@/lib/setup";

export const STEPS = [
  { id: "welcome", title: "Welcome" },
  { id: "database", title: "Database" },
  { id: "redis", title: "Redis" },
  { id: "review", title: "Review & apply" },
  { id: "done", title: "Done" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export interface DbForm {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  connectionType: "direct" | "pgbouncer";
}

export interface RedisForm {
  host: string;
  port: string;
  password: string;
}

export interface AdminForm {
  name: string;
  email: string;
  password: string;
}

export interface WizardData {
  db: DbForm;
  /** the target exactly as it was last sent to /test-database */
  dbTestedTarget: DatabaseTarget | null;
  dbResult: DatabaseTestResult | null;
  redis: RedisForm;
  redisSkipped: boolean;
  redisTestedTarget: RedisTarget | null;
  redisResult: RedisTestResult | null;
  admin: AdminForm;
}

export const initialWizardData: WizardData = {
  db: {
    host: "localhost",
    port: "5433",
    database: "bloom",
    username: "bloom",
    password: "",
    ssl: false,
    connectionType: "direct",
  },
  dbTestedTarget: null,
  dbResult: null,
  redis: { host: "localhost", port: "6380", password: "" },
  redisSkipped: false,
  redisTestedTarget: null,
  redisResult: null,
  admin: { name: "", email: "", password: "" },
};

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parsePort(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const n = Number(raw.trim());
  return n >= 1 && n <= 65535 ? n : null;
}

export function dbTargetFromForm(form: DbForm): DatabaseTarget | null {
  const port = parsePort(form.port);
  if (port === null) return null;
  return {
    host: form.host.trim(),
    port,
    database: form.database.trim(),
    username: form.username.trim(),
    password: form.password,
    ssl: form.ssl,
    connection_type: form.connectionType,
  };
}

export function redisTargetFromForm(form: RedisForm): RedisTarget | null {
  const port = parsePort(form.port);
  if (port === null) return null;
  return {
    host: form.host.trim(),
    port,
    password: form.password === "" ? null : form.password,
  };
}

export function validateDbForm(form: DbForm): FieldErrors<DbForm> {
  const errors: FieldErrors<DbForm> = {};
  if (!form.host.trim()) errors.host = "Host is required";
  if (parsePort(form.port) === null) errors.port = "Port must be 1–65535";
  if (!form.database.trim()) errors.database = "Database name is required";
  if (!form.username.trim()) errors.username = "Username is required";
  return errors;
}

export function validateRedisForm(form: RedisForm): FieldErrors<RedisForm> {
  const errors: FieldErrors<RedisForm> = {};
  if (!form.host.trim()) errors.host = "Host is required";
  if (parsePort(form.port) === null) errors.port = "Port must be 1–65535";
  return errors;
}

export function validateAdminForm(form: AdminForm): FieldErrors<AdminForm> {
  const errors: FieldErrors<AdminForm> = {};
  if (!form.name.trim()) errors.name = "Name is required";
  if (!EMAIL_RE.test(form.email.trim())) errors.email = "Valid email required";
  if (form.password.length < 8) errors.password = "Minimum 8 characters";
  return errors;
}

function sameTarget(a: DatabaseTarget, b: DatabaseTarget): boolean {
  return (
    a.host === b.host &&
    a.port === b.port &&
    a.database === b.database &&
    a.username === b.username &&
    a.password === b.password &&
    a.ssl === b.ssl &&
    a.connection_type === b.connection_type
  );
}

function sameRedis(a: RedisTarget, b: RedisTarget): boolean {
  return a.host === b.host && a.port === b.port && a.password === b.password;
}

/** The DB step may advance only with a passing test on the *current* values. */
export function dbStepComplete(data: WizardData): boolean {
  const target = dbTargetFromForm(data.db);
  return (
    target !== null &&
    data.dbResult?.ok === true &&
    data.dbTestedTarget !== null &&
    sameTarget(target, data.dbTestedTarget)
  );
}

/** Redis is satisfied by an explicit skip or a passing test on current values. */
export function redisStepComplete(data: WizardData): boolean {
  if (data.redisSkipped) return true;
  const target = redisTargetFromForm(data.redis);
  return (
    target !== null &&
    data.redisResult?.ok === true &&
    data.redisTestedTarget !== null &&
    sameRedis(target, data.redisTestedTarget)
  );
}

export function adminStepComplete(data: WizardData): boolean {
  return Object.keys(validateAdminForm(data.admin)).length === 0;
}

/** Human label for a backend check name. */
export function checkLabel(name: string): string {
  switch (name) {
    case "tcp":
      return "TCP reachable";
    case "auth":
      return "Authenticate & query";
    case "pgvector":
      return "pgvector extension";
    case "pgbouncer":
      return "PgBouncer admin console";
    default:
      return name;
  }
}
