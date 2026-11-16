/**
 * Mail Engine admin API — typed client for /api/admin/mail/* and
 * /api/admin/mailboxes/* (TEC-189; frozen contract `contracts/mail-admin.yaml`,
 * TEC-188 — engine built in parallel on TEC-183).
 *
 * Field naming: the new /api/admin/mail/* read-models are camelCase
 * (`checkedAt`, `apiReachable`, `nextRetry`), including the mailbox create
 * body (`quotaMb`). The pre-existing /api/admin/mailboxes mirror (TEC-184)
 * stays snake_case (`quota_mb`, `provisioned_at`, `last_error`).
 *
 * Graceful-gap rule: the backend returns `null` fields / `available: false`
 * rather than errors when the engine version can't answer — the UI renders
 * those as "N/A / not supported" states, not error states.
 */
import { ApiError, apiFetch } from "@/lib/api";
import type { Page } from "@/lib/cms";

/* ── engine status ── */

export interface MailListener {
  name: string;
  port: number;
  ok: boolean;
}

export interface MailTls {
  host: string;
  expiresAt: string;
  daysRemaining: number;
}

export interface MailQueueCounts {
  active: number;
  deferred: number;
}

export interface MailEngineStatus {
  engine: string;
  checkedAt: string;
  apiReachable: boolean;
  listeners: MailListener[];
  tls: MailTls | null;
  queue: MailQueueCounts | null;
}

/* ── DNS ── */

export interface MailDnsRecord {
  name: string;
  expected: string;
  found: string | null;
  ok: boolean;
}

export interface MailDnsReport {
  checkedAt: string;
  records: MailDnsRecord[];
}

/* ── outbound queue ── */

export interface MailQueueItem {
  id: string;
  returnPath: string | null;
  size: number | null;
  created: string | null;
  status: string | null;
  nextRetry: string | null;
  recipients: number | null;
}

export interface MailQueuePage {
  /** false → engine version has no queue API — render the empty state. */
  available: boolean;
  items: MailQueueItem[];
  total: number;
}

/** `{all:true}` retries every deferred entry; `{ids}` only the listed ones. */
export interface MailQueueRetryResult {
  available: boolean;
  retried: number;
  error: string | null;
}

/* ── delivery inspector (metadata only — no body, privacy decision) ── */

export type MailDirection = "inbound" | "outbound";

export interface MailDeliveryItem {
  id: string;
  direction: MailDirection | null;
  from: string | null;
  /** Contract: recipient list, not a single address. */
  to: string[];
  subject: string | null;
  receivedAt: string | null;
  status: string | null;
  folder: string | null;
  /** Mailbox the row was read from (TEC-201 engine-wide aggregation). */
  account: string | null;
}

export interface MailDeliveryPage {
  available: boolean;
  items: MailDeliveryItem[];
}

/* ── test send ── */

export interface MailTestSendResult {
  accepted: boolean;
  messageId: string | null;
  error: string | null;
}

/* ── mailbox mirror (existing TEC-184 surface — snake_case wire shape) ── */

export type MailboxStatus =
  | "pending"
  | "queued"
  | "provisioning"
  | "active"
  | "suspended"
  | "failed";

export interface Mailbox {
  id: string;
  /** Owning student account — null on standalone (manually created) boxes. */
  user_id: string | null;
  localpart: string;
  address: string;
  status: MailboxStatus;
  quota_mb: number;
  provisioned_at: string | null;
  last_error: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

export interface MailboxTestResult {
  smtpAuth: boolean;
  imap: boolean;
  error: string | null;
}

/* ── status / dns / queue / delivery / tools ── */

export async function fetchMailStatus(token: string): Promise<MailEngineStatus> {
  const { data } = await apiFetch<MailEngineStatus>("/api/admin/mail/status", {
    token,
  });
  return data;
}

export async function fetchMailDns(token: string): Promise<MailDnsReport> {
  const { data } = await apiFetch<MailDnsReport>("/api/admin/mail/dns", {
    token,
  });
  return data;
}

export async function fetchMailQueue(token: string): Promise<MailQueuePage> {
  const { data } = await apiFetch<MailQueuePage>("/api/admin/mail/queue", {
    token,
  });
  return data;
}

/** Retry every deferred entry ("all") or only the listed message ids. */
export async function retryMailQueue(
  token: string,
  ids: string[] | "all",
): Promise<MailQueueRetryResult> {
  const { data } = await apiFetch<MailQueueRetryResult>(
    "/api/admin/mail/queue/retry",
    {
      method: "POST",
      body: ids === "all" ? { all: true } : { ids },
      token,
    },
  );
  return data;
}

export async function fetchMailDelivery(
  token: string,
  args: { account?: string; limit?: number } = {},
): Promise<MailDeliveryPage> {
  const params = new URLSearchParams();
  if (args.account) params.set("account", args.account);
  params.set("limit", String(args.limit ?? 50));
  const { data } = await apiFetch<MailDeliveryPage>(
    `/api/admin/mail/delivery?${params.toString()}`,
    { token },
  );
  return data;
}

/**
 * Test-send: a 503 means the test account isn't provisioned yet — the body
 * is still a TestSendResult (`accepted:false`), so map it to a result rather
 * than letting it throw. `subject`/`body` optional since TEC-201.
 */
export async function sendMailTest(
  token: string,
  to: string,
  opts: { subject?: string; body?: string } = {},
): Promise<MailTestSendResult> {
  try {
    const { data } = await apiFetch<MailTestSendResult>(
      "/api/admin/mail/test-send",
      {
        method: "POST",
        body: { to, subject: opts.subject, body: opts.body },
        token,
      },
    );
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) {
      const body = err.detail;
      const detail =
        body &&
        typeof body === "object" &&
        typeof (body as { error?: unknown }).error === "string"
          ? (body as { error: string }).error
          : "unavailable";
      return { accepted: false, messageId: null, error: detail };
    }
    throw err;
  }
}

/* ── mailbox ops ── */

export async function fetchMailboxes(
  token: string,
  args: { page?: number; pageSize?: number; status?: MailboxStatus | "" } = {},
): Promise<Page<Mailbox>> {
  const params = new URLSearchParams();
  params.set("page", String(args.page ?? 1));
  params.set("page_size", String(args.pageSize ?? 10));
  if (args.status) params.set("status", args.status);
  const { data } = await apiFetch<Page<Mailbox>>(
    `/api/admin/mailboxes?${params.toString()}`,
    { token },
  );
  return data;
}

/**
 * POST /api/admin/mailboxes — manual mailbox creation.
 * 409 → address already taken; 400 → validation. Contract body: `quotaMb`.
 */
export async function createMailbox(
  token: string,
  body: { localpart: string; password: string; quotaMb?: number },
): Promise<Mailbox> {
  const payload: Record<string, unknown> = {
    localpart: body.localpart,
    password: body.password,
  };
  if (body.quotaMb !== undefined) payload.quotaMb = body.quotaMb;
  const { data } = await apiFetch<Mailbox>("/api/admin/mailboxes", {
    method: "POST",
    body: payload,
    token,
  });
  return data;
}

export async function suspendMailbox(token: string, id: string): Promise<void> {
  await apiFetch<null>(`/api/admin/mailboxes/${id}/suspend`, {
    method: "POST",
    token,
  });
}

export async function unsuspendMailbox(
  token: string,
  id: string,
): Promise<void> {
  await apiFetch<null>(`/api/admin/mailboxes/${id}/unsuspend`, {
    method: "POST",
    token,
  });
}

/**
 * Retry provisioning (existing TEC-184/187 endpoint). `mail_secret` is purged
 * on failure, so retrying a failed row needs a fresh mailbox password —
 * sent snake_case (`mail_password`) per the shipped `MailboxRetryIn` schema.
 */
export async function retryMailbox(
  token: string,
  id: string,
  mailPassword?: string,
): Promise<Mailbox> {
  const { data } = await apiFetch<Mailbox>(`/api/admin/mailboxes/${id}/retry`, {
    method: "POST",
    body: mailPassword ? { mail_password: mailPassword } : {},
    token,
  });
  return data;
}

/**
 * Reset-password returns the new password exactly once — the caller must
 * show it in a copyable dialog and not hold it in state beyond that dialog.
 */
export async function resetMailboxPassword(
  token: string,
  id: string,
): Promise<{ password: string }> {
  const { data } = await apiFetch<{ password: string }>(
    `/api/admin/mailboxes/${id}/reset-password`,
    { method: "POST", token },
  );
  return data;
}

/**
 * Probe a mailbox's SMTP auth + IMAP login. `password` is a transient input —
 * passed through for the probe, never stored in component state or cache.
 * Kept for contract completeness; the UI's Test button sends a real message
 * instead (TEC-201).
 */
export async function testMailbox(
  token: string,
  id: string,
  password: string,
): Promise<MailboxTestResult> {
  const { data } = await apiFetch<MailboxTestResult>(
    `/api/admin/mailboxes/${id}/test`,
    { method: "POST", body: { password }, token },
  );
  return data;
}

/**
 * Send-test (TEC-201): a real message sent *as* the mailbox via admin-token
 * JMAP submission — the UI's Test action, no mailbox password.
 */
export async function sendMailboxTest(
  token: string,
  id: string,
  args: { to: string; subject?: string; body: string },
): Promise<MailTestSendResult> {
  const { data } = await apiFetch<MailTestSendResult>(
    `/api/admin/mailboxes/${id}/send-test`,
    { method: "POST", body: args, token },
  );
  return data;
}

/** Delete a mailbox — engine account + mirror row (TEC-201, admin-only). */
export async function deleteMailbox(token: string, id: string): Promise<void> {
  await apiFetch<null>(`/api/admin/mailboxes/${id}`, {
    method: "DELETE",
    token,
  });
}
