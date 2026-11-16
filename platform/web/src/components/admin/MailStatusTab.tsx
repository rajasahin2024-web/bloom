/**
 * Mail Engine → Status tab — engine health cards + DNS records panel.
 *
 * Status and DNS are independent panels with their own error states: a DNS
 * lookup failure must not blank engine health (and vice-versa). Null fields
 * (`tls`, `queue`) are contract answers for engine gaps → "N/A".
 *
 * TEC-201: the tab polls silently every ~10s and leads with a LIVE hero —
 * the admin should see at a glance that the engine is alive.
 */
import { useCallback, useEffect, useState } from "react";
import type { AdminSession } from "@/lib/auth";
import { fetchMailDns, fetchMailStatus } from "@/lib/mail";
import type { MailDnsReport, MailEngineStatus } from "@/lib/mail";
import {
  Dot,
  NotSupported,
  OkMark,
  Pill,
} from "@/components/admin/mail-ui";
import { errText, fmtDateTime } from "@/components/admin/mail-utils";
import { RotateLeftIcon } from "@/components/icons";

const POLL_MS = 10_000;

/** TLS expiry reads warn under two weeks, bad once expired. */
function tlsTone(daysRemaining: number): "ok" | "warn" | "bad" {
  if (daysRemaining <= 0) return "bad";
  if (daysRemaining > 3650) return "warn"; // far-future ⇒ self-signed, not CA-issued
  return daysRemaining < 14 ? "warn" : "ok";
}

type LiveTone = "on" | "warn" | "off";

function liveState(status: MailEngineStatus): {
  tone: LiveTone;
  label: string;
  sub: string;
} {
  if (!status.apiReachable) {
    return {
      tone: "off",
      label: "Engine offline",
      sub: "The management API is not answering — check the engine host.",
    };
  }
  const down = status.listeners.filter((l) => !l.ok);
  if (down.length > 0) {
    return {
      tone: "warn",
      label: "Degraded",
      sub: `API reachable, but ${down.length} listener${down.length === 1 ? "" : "s"} down (${down
        .map((l) => `${l.name}:${l.port}`)
        .join(", ")}).`,
    };
  }
  return {
    tone: "on",
    label: "Engine live",
    sub: "API reachable and all listeners accepting connections.",
  };
}

export function MailStatusTab({ session }: { session: AdminSession }) {
  const token = session.tokens.access_token;
  const [status, setStatus] = useState<MailEngineStatus | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);
  const [dns, setDns] = useState<MailDnsReport | null>(null);
  const [dnsErr, setDnsErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(
    async (silent = false) => {
      const [s, d] = await Promise.allSettled([
        fetchMailStatus(token),
        fetchMailDns(token),
      ]);
      if (s.status === "fulfilled") {
        setStatus(s.value);
        setStatusErr(null);
      } else if (!silent) {
        setStatusErr(errText(s.reason, "Could not read engine status."));
      }
      if (d.status === "fulfilled") {
        setDns(d.value);
        setDnsErr(null);
      } else if (!silent) {
        setDnsErr(errText(d.reason, "Could not check DNS records."));
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

  /* "checked Xs ago" ticker — re-render once a second while a snapshot
     exists so the hero age stays truthful. */
  useEffect(() => {
    if (!status) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [status]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const checkedAt = status?.checkedAt ?? dns?.checkedAt ?? null;
  const live = status ? liveState(status) : null;
  const ageSec = checkedAt
    ? Math.max(0, Math.floor((now - Date.parse(checkedAt)) / 1000))
    : null;

  return (
    <>
      {status && live && (
        <div className={`adm-mail-live ${live.tone}`} role="status">
          <span className="adm-mail-live-dot" aria-hidden="true" />
          <div className="adm-mail-live-tx">
            <b>{live.label}</b>
            <span>{live.sub}</span>
          </div>
          {ageSec !== null && (
            <span className="adm-mail-live-age">
              checked {ageSec < 2 ? "just now" : `${ageSec}s ago`}
            </span>
          )}
        </div>
      )}

      <div className="adm-mail-toolbar">
        <span className="adm-mail-checked">
          {checkedAt ? `Checked ${fmtDateTime(checkedAt)}` : "Checking…"}
        </span>
        <button
          type="button"
          className="adm-btn adm-btn-g adm-btn-sm"
          onClick={() => void refresh()}
          disabled={refreshing}
        >
          <RotateLeftIcon size={12} /> {refreshing ? "Checking…" : "Re-check"}
        </button>
      </div>

      {statusErr && (
        <div className="adm-card adm-set-loaderr" role="alert">
          <b>Engine status could not be loaded</b>
          <p>{statusErr}</p>
          <button
            type="button"
            className="adm-btn"
            onClick={() => void refresh()}
          >
            Retry
          </button>
        </div>
      )}

      {!status && !statusErr && (
        <div className="wiz-loading" role="status">
          <span className="wiz-spinner" />
          Checking mail engine…
        </div>
      )}

      {status && (
        <div className="adm-mail-cards">
          {/* engine */}
          <div className="adm-card">
            <div className="adm-card-hd">
              <h3>Engine</h3>
              <p>{status.engine || "—"}</p>
            </div>
            <div className="adm-card-bd">
              <Pill tone={status.apiReachable ? "ok" : "bad"}>
                {status.apiReachable ? "API reachable" : "API unreachable"}
              </Pill>
            </div>
          </div>

          {/* listeners */}
          <div className="adm-card">
            <div className="adm-card-hd">
              <h3>Listeners</h3>
              <p>SMTP / IMAP ports</p>
            </div>
            <div className="adm-card-bd">
              {status.listeners.length === 0 ? (
                <span className="adm-mail-na">N/A</span>
              ) : (
                <div className="adm-mail-listeners">
                  {status.listeners.map((l) => (
                    <div key={`${l.name}-${l.port}`} className="adm-mail-lsnr">
                      <Dot ok={l.ok} />
                      <span className="adm-mail-lsnr-n">{l.name}</span>
                      <span className="adm-mail-lsnr-p">:{l.port}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* TLS */}
          <div className="adm-card">
            <div className="adm-card-hd">
              <h3>TLS certificate</h3>
              <p>{status.tls ? status.tls.host : "—"}</p>
            </div>
            <div className="adm-card-bd">
              {status.tls ? (
                <>
                  <Pill tone={tlsTone(status.tls.daysRemaining)}>
                    {status.tls.daysRemaining <= 0
                      ? "Expired"
                      : status.tls.daysRemaining > 3650
                        ? "Long-lived / self-signed"
                        : `${status.tls.daysRemaining} days left`}
                  </Pill>
                  <div className="adm-mail-sub">
                    Expires {fmtDateTime(status.tls.expiresAt)}
                  </div>
                </>
              ) : (
                <span className="adm-mail-na">N/A — not reported</span>
              )}
            </div>
          </div>

          {/* queue counts */}
          <div className="adm-card">
            <div className="adm-card-hd">
              <h3>Outbound queue</h3>
              <p>Active / deferred</p>
            </div>
            <div className="adm-card-bd">
              {status.queue ? (
                <div className="adm-mail-qcounts">
                  <div>
                    <b>{status.queue.active}</b>
                    <span>active</span>
                  </div>
                  <div>
                    <b className={status.queue.deferred > 0 ? "warn" : ""}>
                      {status.queue.deferred}
                    </b>
                    <span>deferred</span>
                  </div>
                </div>
              ) : (
                <span className="adm-mail-na">N/A — not reported</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DNS records */}
      <div className="adm-card">
        <div className="adm-card-hd">
          <h3>DNS records</h3>
          <p>
            Mail records as seen by the engine — expected vs published.
            {dns?.checkedAt ? ` Checked ${fmtDateTime(dns.checkedAt)}.` : ""}
          </p>
        </div>
        <div className="adm-card-bd flush">
          {dnsErr && (
            <div className="adm-store-listerr" role="alert">
              {dnsErr}
            </div>
          )}
          {!dns && !dnsErr && (
            <div className="wiz-loading" role="status">
              <span className="wiz-spinner" />
              Checking DNS…
            </div>
          )}
          {dns && dns.records.length === 0 && (
            <NotSupported feature="DNS checks" />
          )}
          {dns && dns.records.length > 0 && (
            <div className="adm-mail-dns">
              {dns.records.map((r, i) => (
                <div key={`${r.name}-${i}`} className="adm-mail-dnsrow">
                  <OkMark ok={r.ok} />
                  <div className="adm-mail-dns-tx">
                    <b>{r.name}</b>
                    <span>
                      expected <code>{r.expected}</code>
                      {r.found !== null && r.found !== r.expected && (
                        <>
                          {" "}
                          — found <code>{r.found}</code>
                        </>
                      )}
                      {r.found === null && " — not published"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
