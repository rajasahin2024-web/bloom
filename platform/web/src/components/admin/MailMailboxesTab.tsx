/**
 * Mail Engine → Mailboxes tab — provisioning mirror + mailbox ops.
 *
 * Table: address, linked student (mirror `user_id`), status, quota, created;
 * row actions cover suspend/unsuspend, reset password, send-test (TEC-201 —
 * a real message via the admin token, no mailbox password), delete and
 * provisioning retry (failed rows re-prompt for a password — `mail_secret`
 * is purged on terminal failure, TEC-187).
 *
 * Password hygiene: the reset-password response is held only inside its
 * result dialog (show-once + copy, cleared on close). Ten rows per page
 * end-to-end — the API's own default page size.
 */
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ApiError, apiFieldErrors } from "@/lib/api";
import type { AdminSession } from "@/lib/auth";
import type { Page } from "@/lib/cms";
import {
  createMailbox,
  deleteMailbox,
  fetchMailboxes,
  resetMailboxPassword,
  retryMailbox,
  sendMailboxTest,
  suspendMailbox,
  unsuspendMailbox,
} from "@/lib/mail";
import type { Mailbox, MailboxStatus } from "@/lib/mail";
import { MailToast, Pill } from "@/components/admin/mail-ui";
import {
  errText,
  fmtDate,
  type Notice,
} from "@/components/admin/mail-utils";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  PlusIcon,
  RotateLeftIcon,
} from "@/components/icons";

const PAGE_SIZE = 10;

/** Mirrors LOCALPART_RE in the backend (`app/integrations/mail_api.py`). */
const LOCALPART_RE = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

const STATUS_TONE: Record<MailboxStatus, { tone: "ok" | "warn" | "bad" | "mut"; label: string }> = {
  active: { tone: "ok", label: "Active" },
  pending: { tone: "mut", label: "Pending" },
  queued: { tone: "mut", label: "Queued" },
  provisioning: { tone: "mut", label: "Provisioning" },
  suspended: { tone: "warn", label: "Suspended" },
  failed: { tone: "bad", label: "Failed" },
};

const STATUS_OPTIONS: { value: MailboxStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "queued", label: "Queued" },
  { value: "provisioning", label: "Provisioning" },
  { value: "suspended", label: "Suspended" },
  { value: "failed", label: "Failed" },
];

type Dialog =
  | { kind: "suspend"; mailbox: Mailbox }
  | { kind: "reset"; mailbox: Mailbox }
  | { kind: "sendtest"; mailbox: Mailbox }
  | { kind: "delete"; mailbox: Mailbox }
  | { kind: "retry"; mailbox: Mailbox };

export function MailMailboxesTab({ session }: { session: AdminSession }) {
  const token = session.tokens.access_token;

  const [page, setPage] = useState<Page<Mailbox> | null>(null);
  const [pageNo, setPageNo] = useState(1);
  const [statusFilter, setStatusFilter] = useState<MailboxStatus | "">("");
  const [listErr, setListErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  /* create form */
  const [createVals, setCreateVals] = useState({
    localpart: "",
    password: "",
    quotaMb: "",
  });
  const [createErrs, setCreateErrs] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [showCreatePw, setShowCreatePw] = useState(false);

  const load = useCallback(
    async (pageNum: number, status: MailboxStatus | "") => {
      setLoading(true);
      setListErr(null);
      try {
        setPage(
          await fetchMailboxes(token, {
            page: pageNum,
            pageSize: PAGE_SIZE,
            status,
          }),
        );
      } catch (err) {
        setListErr(errText(err, "Could not load mailboxes."));
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void load(pageNo, statusFilter);
  }, [load, pageNo, statusFilter]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  function refetch() {
    void load(pageNo, statusFilter);
  }

  /* ── row actions ── */

  async function unsuspend(m: Mailbox) {
    if (busyId) return;
    setBusyId(m.id);
    try {
      await unsuspendMailbox(token, m.id);
      setNotice({ text: `${m.address} unsuspended.`, kind: "ok" });
      refetch();
    } catch (err) {
      setNotice({ text: errText(err, "Unsuspend failed."), kind: "err" });
    } finally {
      setBusyId(null);
    }
  }

  async function quickRetry(m: Mailbox) {
    if (busyId) return;
    setBusyId(m.id);
    try {
      await retryMailbox(token, m.id);
      setNotice({ text: `Retry queued for ${m.address}.`, kind: "ok" });
      refetch();
    } catch (err) {
      // Failed rows need a fresh password — open the retry dialog on 409.
      if (err instanceof ApiError && err.status === 409) {
        setDialog({ kind: "retry", mailbox: m });
      } else {
        setNotice({ text: errText(err, "Retry failed."), kind: "err" });
      }
    } finally {
      setBusyId(null);
    }
  }

  /* ── create ── */

  async function create() {
    if (creating) return;
    const errs: Record<string, string> = {};
    const localpart = createVals.localpart.trim().toLowerCase();
    if (!LOCALPART_RE.test(localpart) || localpart.includes("..")) {
      errs.localpart =
        "Lowercase letters, digits, dots, hyphens and underscores — must start and end with a letter or digit.";
    }
    if (createVals.password.length < 8) {
      errs.password = "At least 8 characters.";
    }
    const quota = createVals.quotaMb.trim();
    let quotaMb: number | undefined;
    if (quota !== "") {
      quotaMb = Number(quota);
      if (!Number.isInteger(quotaMb) || quotaMb <= 0) {
        errs.quotaMb = "Whole MB, greater than zero.";
      }
    }
    setCreateErrs(errs);
    if (Object.keys(errs).length > 0) return;

    setCreating(true);
    try {
      const mb = await createMailbox(token, {
        localpart,
        password: createVals.password,
        quotaMb,
      });
      setCreateVals({ localpart: "", password: "", quotaMb: "" });
      setNotice({ text: `Mailbox ${mb.address} created.`, kind: "ok" });
      refetch();
    } catch (err) {
      const fe = apiFieldErrors(err);
      if (fe) setCreateErrs(fe);
      // 400 = invalid/reserved localpart — pin it on the field
      if (err instanceof ApiError && err.status === 400) {
        setCreateErrs((cur) => ({ ...cur, localpart: err.message }));
      }
      setNotice({
        text:
          err instanceof ApiError && err.status === 409
            ? "That address is already taken."
            : errText(err, "Could not create the mailbox."),
        kind: "err",
      });
    } finally {
      setCreating(false);
    }
  }

  const totalPages = page ? Math.max(1, Math.ceil(page.total / PAGE_SIZE)) : 1;

  return (
    <>
      {/* manual create */}
      <div className="adm-card">
        <div className="adm-card-hd">
          <h3>Create mailbox</h3>
          <p>
            Provision a mailbox manually — normally signups create these
            automatically.
          </p>
        </div>
        <div className="adm-card-bd">
          <div className="adm-mail-create">
            <label className="adm-fl">
              <span>Username</span>
              <input
                className="adm-input"
                value={createVals.localpart}
                placeholder="student.name"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(createErrs.localpart) || undefined}
                onChange={(e) =>
                  setCreateVals((v) => ({ ...v, localpart: e.target.value }))
                }
              />
              {createErrs.localpart && (
                <span className="adm-set-err">{createErrs.localpart}</span>
              )}
            </label>
            <label className="adm-fl">
              <span>Password</span>
              <div className="adm-store-pw">
                <input
                  className="adm-input"
                  type={showCreatePw ? "text" : "password"}
                  value={createVals.password}
                  autoComplete="new-password"
                  aria-invalid={Boolean(createErrs.password) || undefined}
                  onChange={(e) =>
                    setCreateVals((v) => ({ ...v, password: e.target.value }))
                  }
                />
                <button
                  type="button"
                  className="adm-store-pw-eye"
                  aria-label={showCreatePw ? "Hide password" : "Show password"}
                  onClick={() => setShowCreatePw((s) => !s)}
                >
                  {showCreatePw ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                </button>
              </div>
              {createErrs.password && (
                <span className="adm-set-err">{createErrs.password}</span>
              )}
            </label>
            <label className="adm-fl">
              <span>Quota (MB, optional)</span>
              <input
                className="adm-input"
                inputMode="numeric"
                value={createVals.quotaMb}
                placeholder="engine default"
                aria-invalid={Boolean(createErrs.quotaMb) || undefined}
                onChange={(e) =>
                  setCreateVals((v) => ({ ...v, quotaMb: e.target.value }))
                }
              />
              {createErrs.quotaMb && (
                <span className="adm-set-err">{createErrs.quotaMb}</span>
              )}
            </label>
            <div className="adm-mail-create-act">
              <button
                type="button"
                className="adm-btn"
                onClick={() => void create()}
                disabled={creating}
              >
                <PlusIcon size={12} /> {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* mailbox list */}
      <div className="adm-card">
        <div className="adm-card-hd">
          <h3>
            Mailboxes{" "}
            {page && <i className="adm-count">{page.total}</i>}
          </h3>
          <p>Provisioning mirror — one row per academy mailbox.</p>
        </div>
        <div className="adm-card-bd flush">
          <div className="adm-mail-toolbar">
            <select
              className="adm-input adm-cms-statusf"
              value={statusFilter}
              aria-label="Filter by status"
              onChange={(e) => {
                setStatusFilter(e.target.value as MailboxStatus | "");
                setPageNo(1);
              }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="adm-btn adm-btn-g adm-btn-sm"
              onClick={refetch}
              disabled={loading}
            >
              <RotateLeftIcon size={12} /> Refresh
            </button>
          </div>

          {listErr && (
            <div className="adm-store-listerr" role="alert">
              {listErr}
            </div>
          )}

          <div className="adm-cms-tablewrap">
            <table className="adm-cms-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Quota</th>
                  <th>Created</th>
                  <th className="ra">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="adm-cms-skel">
                      <td colSpan={6}>
                        <i />
                      </td>
                    </tr>
                  ))}
                {!loading && page && page.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="adm-cms-empty">
                      {statusFilter
                        ? "No mailboxes match this status."
                        : "No mailboxes yet — signups create them automatically."}
                    </td>
                  </tr>
                )}
                {!loading &&
                  page?.items.map((m) => {
                    const st = STATUS_TONE[m.status] ?? {
                      tone: "mut" as const,
                      label: m.status,
                    };
                    const busy = busyId === m.id;
                    const retryable =
                      m.status === "failed" || m.status === "pending";
                    return (
                      <tr key={m.id}>
                        <td>
                          <span className="adm-mail-addr">{m.address}</span>
                          {m.last_error && (
                            <span
                              className="adm-mail-rowerr"
                              title={m.last_error}
                            >
                              {m.last_error}
                            </span>
                          )}
                        </td>
                        <td>
                          {m.user_id ? (
                            <span className="adm-mail-mono" title={m.user_id}>
                              {m.user_id.slice(0, 8)}
                            </span>
                          ) : (
                            <span
                              className="adm-mail-mono"
                              title="Standalone mailbox — no linked student account"
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td>
                          <Pill tone={st.tone}>{st.label}</Pill>
                        </td>
                        <td>{m.quota_mb} MB</td>
                        <td className="adm-cms-date">{fmtDate(m.created_at)}</td>
                        <td className="ra">
                          <div className="adm-cms-rowact">
                            {m.status === "active" && (
                              <button
                                type="button"
                                className="adm-btn-sm adm-btn adm-btn-g"
                                disabled={busy}
                                onClick={() =>
                                  setDialog({ kind: "suspend", mailbox: m })
                                }
                              >
                                Suspend
                              </button>
                            )}
                            {m.status === "suspended" && (
                              <button
                                type="button"
                                className="adm-btn-sm adm-btn adm-btn-g"
                                disabled={busy}
                                onClick={() => void unsuspend(m)}
                              >
                                {busy ? "…" : "Unsuspend"}
                              </button>
                            )}
                            {retryable && (
                              <button
                                type="button"
                                className="adm-btn-sm adm-btn adm-btn-g"
                                disabled={busy}
                                onClick={() =>
                                  // failed rows lost their secret — go
                                  // straight to the password dialog
                                  m.status === "failed"
                                    ? setDialog({ kind: "retry", mailbox: m })
                                    : void quickRetry(m)
                                }
                              >
                                {busy ? "…" : "Retry"}
                              </button>
                            )}
                            <button
                              type="button"
                              className="adm-btn-sm adm-btn adm-btn-g"
                              disabled={busy}
                              onClick={() =>
                                setDialog({ kind: "reset", mailbox: m })
                              }
                            >
                              Reset password
                            </button>
                            <button
                              type="button"
                              className="adm-btn-sm adm-btn adm-btn-g"
                              disabled={busy}
                              onClick={() =>
                                setDialog({ kind: "sendtest", mailbox: m })
                              }
                            >
                              Test
                            </button>
                            <button
                              type="button"
                              className="adm-btn-sm adm-btn adm-btn-danger-g"
                              disabled={busy}
                              onClick={() =>
                                setDialog({ kind: "delete", mailbox: m })
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {page && page.total > PAGE_SIZE && (
            <div className="adm-cms-pager">
              <button
                type="button"
                className="adm-btn adm-btn-g"
                disabled={pageNo <= 1}
                onClick={() => setPageNo((n) => n - 1)}
              >
                Previous
              </button>
              <span>
                Page {pageNo} of {totalPages} · {page.total} mailboxes
              </span>
              <button
                type="button"
                className="adm-btn adm-btn-g"
                disabled={pageNo >= totalPages}
                onClick={() => setPageNo((n) => n + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {dialog?.kind === "suspend" && (
        <SuspendDialog
          token={token}
          mailbox={dialog.mailbox}
          onClose={() => setDialog(null)}
          onDone={(text, kind) => {
            setDialog(null);
            setNotice({ text, kind });
            refetch();
          }}
        />
      )}
      {dialog?.kind === "reset" && (
        <ResetPasswordDialog
          token={token}
          mailbox={dialog.mailbox}
          onClose={() => setDialog(null)}
          onError={(text) => {
            setDialog(null);
            setNotice({ text, kind: "err" });
          }}
        />
      )}
      {dialog?.kind === "sendtest" && (
        <SendTestDialog
          token={token}
          mailbox={dialog.mailbox}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "delete" && (
        <DeleteDialog
          token={token}
          mailbox={dialog.mailbox}
          onClose={() => setDialog(null)}
          onDone={(text, kind) => {
            setDialog(null);
            setNotice({ text, kind });
            refetch();
          }}
        />
      )}
      {dialog?.kind === "retry" && (
        <RetryDialog
          token={token}
          mailbox={dialog.mailbox}
          onClose={() => setDialog(null)}
          onDone={(text, kind) => {
            setDialog(null);
            setNotice({ text, kind });
            refetch();
          }}
        />
      )}

      <MailToast notice={notice} />
    </>
  );
}

/* ── dialogs ── */

function Scrim({
  children,
  onClose,
  labelledBy,
  alert,
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
  alert?: boolean;
}) {
  return (
    <div className="adm-modal-scrim" role="presentation" onClick={onClose}>
      <div
        className="adm-modal"
        role={alert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function SuspendDialog({
  token,
  mailbox,
  onClose,
  onDone,
}: {
  token: string;
  mailbox: Mailbox;
  onClose: () => void;
  onDone: (text: string, kind: "ok" | "err") => void;
}) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await suspendMailbox(token, mailbox.id);
      onDone(`${mailbox.address} suspended.`, "ok");
    } catch (err) {
      onDone(errText(err, "Suspend failed."), "err");
    }
  }

  return (
    <Scrim onClose={() => !busy && onClose()} labelledBy="adm-mb-sus" alert>
      <h3 id="adm-mb-sus">Suspend {mailbox.address}?</h3>
      <p>
        The student keeps the account but cannot send, receive or sign in to
        webmail until it is unsuspended.
      </p>
      <div className="adm-modal-act">
        <button
          type="button"
          className="adm-btn adm-btn-g"
          onClick={onClose}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          className="adm-btn adm-btn-danger"
          onClick={() => void confirm()}
          disabled={busy}
        >
          {busy ? "Suspending…" : "Suspend mailbox"}
        </button>
      </div>
    </Scrim>
  );
}

/**
 * Reset-password: the new password arrives once in the response, is held in
 * this dialog's state only, and is wiped when the dialog closes.
 */
function ResetPasswordDialog({
  token,
  mailbox,
  onClose,
  onError,
}: {
  token: string;
  mailbox: Mailbox;
  onClose: () => void;
  onError: (text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      const res = await resetMailboxPassword(token, mailbox.id);
      setPassword(res.password);
    } catch (err) {
      onError(errText(err, "Password reset failed."));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Scrim onClose={onClose} labelledBy="adm-mb-rst" alert={!password}>
      {password === null ? (
        <>
          <h3 id="adm-mb-rst">Reset password for {mailbox.address}?</h3>
          <p>
            A new password is generated and shown once — it cannot be
            recovered later.
          </p>
          <div className="adm-modal-act">
            <button
              type="button"
              className="adm-btn adm-btn-g"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="adm-btn"
              onClick={() => void confirm()}
              disabled={busy}
            >
              {busy ? "Resetting…" : "Reset password"}
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 id="adm-mb-rst">New password — shown once</h3>
          <p>
            Copy it now and share it with the student. Closing this dialog
            discards it.
          </p>
          <div className="adm-mail-pwshow">
            <code>{password}</code>
            <button
              type="button"
              className="adm-btn adm-btn-g adm-btn-sm"
              onClick={() => void copy()}
            >
              {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="adm-modal-act">
            <button type="button" className="adm-btn" onClick={onClose}>
              Done
            </button>
          </div>
        </>
      )}
    </Scrim>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Send-test (TEC-201): replaces the old password probe — the admin picks a
 * recipient and writes a body, the engine sends it *as* this mailbox via
 * the admin management token. No mailbox password is involved.
 */
function SendTestDialog({
  token,
  mailbox,
  onClose,
}: {
  token: string;
  mailbox: Mailbox;
  onClose: () => void;
}) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    if (busy) return;
    const target = to.trim();
    if (!EMAIL_RE.test(target)) {
      setErr("Enter a valid recipient address.");
      return;
    }
    if (!body.trim()) {
      setErr("Write a message body first.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await sendMailboxTest(token, mailbox.id, {
        to: target,
        subject: subject.trim() || undefined,
        body,
      });
      if (res.accepted) {
        setSent(res.messageId ?? "accepted");
      } else {
        setErr(res.error ?? "The engine rejected the test message.");
      }
    } catch (e) {
      setErr(errText(e, "Test send failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Scrim onClose={() => !busy && onClose()} labelledBy="adm-mb-tst">
      <h3 id="adm-mb-tst">Send test mail — {mailbox.address}</h3>
      {sent === null ? (
        <>
          <p>
            Sends a real message from this mailbox — no password needed.
          </p>
          <label className="adm-fl">
            <span>To (mail id)</span>
            <input
              className="adm-input"
              type="email"
              value={to}
              placeholder="you@example.com"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              onChange={(e) => {
                setTo(e.target.value);
                setErr(null);
              }}
            />
          </label>
          <label className="adm-fl">
            <span>Subject (optional)</span>
            <input
              className="adm-input"
              value={subject}
              placeholder="Test mail from Bloom admin"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="adm-fl">
            <span>Body</span>
            <textarea
              className="adm-input adm-mail-body"
              value={body}
              rows={6}
              placeholder="Write the test message…"
              onChange={(e) => {
                setBody(e.target.value);
                setErr(null);
              }}
            />
          </label>
          {err && <span className="adm-set-err">{err}</span>}
          <div className="adm-modal-act">
            <button
              type="button"
              className="adm-btn adm-btn-g"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="adm-btn"
              onClick={() => void send()}
              disabled={busy}
            >
              {busy ? "Sending…" : "Send test"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="adm-mail-probe">
            <div>
              <span>Engine</span>
              <Pill tone="ok">Accepted</Pill>
            </div>
          </div>
          <p className="adm-mail-sub">
            Queued for delivery — {sent}. Check the Queue and Delivery tabs
            for its path.
          </p>
          <div className="adm-modal-act">
            <button
              type="button"
              className="adm-btn adm-btn-g"
              onClick={() => {
                setSent(null);
                setBody("");
              }}
            >
              Send another
            </button>
            <button type="button" className="adm-btn" onClick={onClose}>
              Done
            </button>
          </div>
        </>
      )}
    </Scrim>
  );
}

/** Delete (TEC-201): engine account + mirror row — irreversible. */
function DeleteDialog({
  token,
  mailbox,
  onClose,
  onDone,
}: {
  token: string;
  mailbox: Mailbox;
  onClose: () => void;
  onDone: (text: string, kind: "ok" | "err") => void;
}) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await deleteMailbox(token, mailbox.id);
      onDone(`${mailbox.address} deleted.`, "ok");
    } catch (err) {
      onDone(errText(err, "Delete failed."), "err");
    }
  }

  return (
    <Scrim onClose={() => !busy && onClose()} labelledBy="adm-mb-del" alert>
      <h3 id="adm-mb-del">Delete {mailbox.address}?</h3>
      <p>
        The mailbox and everything stored in it is destroyed on the engine —
        this cannot be undone.
        {mailbox.user_id
          ? " The linked student keeps their platform account but loses this mailbox."
          : ""}
      </p>
      <div className="adm-modal-act">
        <button
          type="button"
          className="adm-btn adm-btn-g"
          onClick={onClose}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          className="adm-btn adm-btn-danger"
          onClick={() => void confirm()}
          disabled={busy}
        >
          {busy ? "Deleting…" : "Delete mailbox"}
        </button>
      </div>
    </Scrim>
  );
}

/**
 * Retry a failed mailbox — `mail_secret` was purged on terminal failure
 * (TEC-187), so the admin supplies a fresh mailbox password that is
 * re-hashed server-side until the next outcome.
 */
function RetryDialog({
  token,
  mailbox,
  onClose,
  onDone,
}: {
  token: string;
  mailbox: Mailbox;
  onClose: () => void;
  onDone: (text: string, kind: "ok" | "err") => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function confirm() {
    if (busy || password.length < 8) {
      if (password.length < 8) setErr("At least 8 characters.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await retryMailbox(token, mailbox.id, password);
      onDone(`Retry queued for ${mailbox.address}.`, "ok");
    } catch (e) {
      setErr(errText(e, "Retry failed."));
      setBusy(false);
    }
  }

  return (
    <Scrim onClose={() => !busy && onClose()} labelledBy="adm-mb-rty">
      <h3 id="adm-mb-rty">Retry {mailbox.address}</h3>
      <p>
        Provisioning failed and its stored password was cleared — enter a new
        mailbox password to re-enqueue.
      </p>
      <label className="adm-fl">
        <span>New mailbox password</span>
        <input
          className="adm-input"
          type="password"
          value={password}
          autoComplete="new-password"
          autoFocus
          onChange={(e) => {
            setPassword(e.target.value);
            setErr(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && void confirm()}
        />
      </label>
      {err && <span className="adm-set-err">{err}</span>}
      <div className="adm-modal-act">
        <button
          type="button"
          className="adm-btn adm-btn-g"
          onClick={onClose}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          className="adm-btn"
          onClick={() => void confirm()}
          disabled={busy}
        >
          {busy ? "Retrying…" : "Retry provisioning"}
        </button>
      </div>
    </Scrim>
  );
}
