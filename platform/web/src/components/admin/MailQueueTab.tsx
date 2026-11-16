/**
 * Mail Engine → Queue tab — deferred outbound messages.
 *
 * `available: false` is a contract answer for engine versions without a
 * queue API — it renders the "not supported" empty state, not an error.
 * Retry accepts `{ids:[…]}` or `{all:true}` and reports how many messages
 * were rescheduled (`QueueRetryResult.retried`).
 */
import { useCallback, useEffect, useState } from "react";
import type { AdminSession } from "@/lib/auth";
import { fetchMailQueue, retryMailQueue } from "@/lib/mail";
import type { MailQueuePage } from "@/lib/mail";
import { MailToast, NotSupported, Pill } from "@/components/admin/mail-ui";
import {
  errText,
  fmtBytes,
  fmtDateTime,
  type Notice,
} from "@/components/admin/mail-utils";
import { RotateLeftIcon } from "@/components/icons";

const POLL_MS = 15_000;

export function MailQueueTab({ session }: { session: AdminSession }) {
  const token = session.tokens.access_token;
  const [queue, setQueue] = useState<MailQueuePage | null>(null);
  const [listErr, setListErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | "all" | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setListErr(null);
      }
      try {
        setQueue(await fetchMailQueue(token));
        setListErr(null);
      } catch (err) {
        if (!silent) setListErr(errText(err, "Could not load the queue."));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  async function retry(ids: string[] | "all") {
    if (busyId) return;
    setBusyId(ids === "all" ? "all" : ids[0]);
    try {
      const res = await retryMailQueue(token, ids);
      setNotice(
        res.available === false
          ? {
              text: "Queue retry is not supported by this engine version.",
              kind: "err",
            }
          : res.error
            ? { text: res.error, kind: "err" }
            : {
                text: `${res.retried} message${res.retried === 1 ? "" : "s"} re-queued.`,
                kind: "ok",
              },
      );
      await load();
    } catch (err) {
      setNotice({ text: errText(err, "Retry failed."), kind: "err" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="adm-card">
        <div className="adm-card-hd">
          <h3>
            Outbound queue{" "}
            {queue && queue.available && <i className="adm-count">{queue.total}</i>}
          </h3>
          <p>Deferred messages waiting for their next delivery attempt.</p>
        </div>
        <div className="adm-card-bd flush">
          {queue?.available && queue.items.length > 0 && (
            <div className="adm-mail-toolbar">
              <span className="adm-mail-checked">
                {queue.total} deferred
              </span>
              <button
                type="button"
                className="adm-btn adm-btn-g adm-btn-sm"
                onClick={() => void retry("all")}
                disabled={busyId !== null}
              >
                <RotateLeftIcon size={12} />{" "}
                {busyId === "all" ? "Retrying…" : "Retry all"}
              </button>
            </div>
          )}

          {listErr && (
            <div className="adm-store-listerr" role="alert">
              {listErr}
            </div>
          )}

          {loading && (
            <div className="wiz-loading" role="status">
              <span className="wiz-spinner" />
              Loading queue…
            </div>
          )}

          {!loading && queue && !queue.available && (
            <NotSupported feature="Queue inspection" />
          )}

          {!loading && queue?.available && queue.items.length === 0 && (
            <div className="adm-mail-empty">
              <b>Queue is clear</b>
              <p>No deferred messages right now.</p>
            </div>
          )}

          {!loading && queue?.available && queue.items.length > 0 && (
            <div className="adm-cms-tablewrap">
              <table className="adm-cms-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>Recipients</th>
                    <th>Size</th>
                    <th>Queued</th>
                    <th>Status</th>
                    <th>Next retry</th>
                    <th className="ra">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.items.map((q) => (
                    <tr key={q.id}>
                      <td className="adm-mail-addr">{q.returnPath ?? "—"}</td>
                      <td>{q.recipients ?? "—"}</td>
                      <td>{fmtBytes(q.size)}</td>
                      <td className="adm-cms-date">{fmtDateTime(q.created)}</td>
                      <td>
                        <Pill tone={q.status === "deferred" ? "warn" : "mut"}>
                          {q.status ?? "—"}
                        </Pill>
                      </td>
                      <td className="adm-cms-date">
                        {fmtDateTime(q.nextRetry)}
                      </td>
                      <td className="ra">
                        <div className="adm-cms-rowact">
                          <button
                            type="button"
                            className="adm-btn-sm adm-btn adm-btn-g"
                            disabled={busyId !== null}
                            onClick={() => void retry([q.id])}
                          >
                            {busyId === q.id ? "…" : "Retry"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <MailToast notice={notice} />
    </>
  );
}
