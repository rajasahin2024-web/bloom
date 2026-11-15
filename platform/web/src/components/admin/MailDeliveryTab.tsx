/**
 * Mail Engine → Delivery tab — per-account delivery inspector.
 *
 * Metadata only (from/to/subject/date/status/folder) — message bodies are
 * intentionally not exposed, an approved privacy decision. Without an
 * account filter the backend falls back to engine-wide telemetry, which
 * is Enterprise-gated upstream → `available:false` on OSS; per-account
 * inspection still works, so the empty state says so explicitly.
 */
import { useCallback, useEffect, useState } from "react";
import type { AdminSession } from "@/lib/auth";
import { fetchMailDelivery } from "@/lib/mail";
import type { MailDeliveryPage } from "@/lib/mail";
import { Pill } from "@/components/admin/mail-ui";
import { errText, fmtDateTime } from "@/components/admin/mail-utils";
import { SearchIcon } from "@/components/icons";

const LIMIT = 50;

export function MailDeliveryTab({ session }: { session: AdminSession }) {
  const token = session.tokens.access_token;
  const [account, setAccount] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState<MailDeliveryPage | null>(null);
  const [listErr, setListErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (acct: string) => {
      setLoading(true);
      setListErr(null);
      try {
        setPage(
          await fetchMailDelivery(token, {
            account: acct || undefined,
            limit: LIMIT,
          }),
        );
      } catch (err) {
        setListErr(errText(err, "Could not load delivery records."));
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void load(applied);
  }, [load, applied]);

  function applyFilter() {
    const next = account.trim();
    if (next === applied) void load(applied);
    else setApplied(next);
  }

  return (
    <div className="adm-card">
      <div className="adm-card-hd">
        <h3>
          Delivery inspector{" "}
          {page && page.available && (
            <i className="adm-count">{page.items.length}</i>
          )}
        </h3>
        <p>
          Message metadata per mailbox — bodies are never shown, by design.
        </p>
      </div>
      <div className="adm-card-bd flush">
        <div className="adm-mail-toolbar">
          <label className="adm-cms-search">
            <SearchIcon size={13} />
            <input
              type="search"
              className="adm-input"
              placeholder="Filter by account — student@bloomieltsacademy.com"
              value={account}
              aria-label="Filter by account"
              onChange={(e) => setAccount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilter()}
            />
          </label>
          <button
            type="button"
            className="adm-btn adm-btn-g adm-btn-sm"
            onClick={applyFilter}
            disabled={loading}
          >
            {loading ? "Loading…" : "Apply"}
          </button>
        </div>

        {listErr && (
          <div className="adm-store-listerr" role="alert">
            {listErr}
          </div>
        )}

        {loading && !page && (
          <div className="wiz-loading" role="status">
            <span className="wiz-spinner" />
            Loading delivery records…
          </div>
        )}

        {page && !page.available && (
          <div className="adm-mail-empty">
            <b>Not supported</b>
            <p>
              Engine-wide delivery traces are not available on this engine
              version — filter by an account to inspect its mailbox.
            </p>
          </div>
        )}

        {page?.available && page.items.length === 0 && !loading && (
          <div className="adm-mail-empty">
            <b>No delivery records</b>
            <p>
              {applied
                ? `Nothing delivered for “${applied}”.`
                : "No recent deliveries to inspect."}
            </p>
          </div>
        )}

        {page?.available && page.items.length > 0 && (
          <div className="adm-cms-tablewrap">
            <table className="adm-cms-table">
              <thead>
                <tr>
                  <th>Dir</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Folder</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((d) => (
                  <tr key={d.id}>
                    <td>
                      {d.direction ? (
                        <Pill tone={d.direction === "inbound" ? "ok" : "mut"}>
                          {d.direction === "inbound" ? "In" : "Out"}
                        </Pill>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="adm-mail-addr">{d.from ?? "—"}</td>
                    <td className="adm-mail-addr">{d.to.join(", ") || "—"}</td>
                    <td className="adm-mail-subj" title={d.subject ?? ""}>
                      {d.subject || "—"}
                    </td>
                    <td>{d.status ?? "—"}</td>
                    <td>{d.folder ?? "—"}</td>
                    <td className="adm-cms-date">
                      {fmtDateTime(d.receivedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
