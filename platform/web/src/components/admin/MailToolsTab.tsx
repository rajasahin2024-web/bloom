/**
 * Mail Engine → Tools tab — send a test message end-to-end.
 *
 * `accepted` is the engine's SMTP verdict, not delivery confirmation — the
 * result surfaces the messageId on success and the engine error otherwise.
 */
import { useEffect, useState } from "react";
import type { AdminSession } from "@/lib/auth";
import { sendMailTest } from "@/lib/mail";
import { MailToast } from "@/components/admin/mail-ui";
import { errText, type Notice } from "@/components/admin/mail-utils";
import { EnvelopeIcon } from "@/components/icons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MailToolsTab({ session }: { session: AdminSession }) {
  const token = session.tokens.access_token;
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(t);
  }, [notice]);

  async function send() {
    if (busy) return;
    const target = to.trim();
    if (!EMAIL_RE.test(target)) {
      setErr("Enter a valid email address.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res = await sendMailTest(token, target, {
        subject: subject.trim() || undefined,
        body: body.trim() || undefined,
      });
      setNotice(
        res.accepted
          ? {
              text: `Test message accepted${res.messageId ? ` — ${res.messageId}` : ""}.`,
              kind: "ok",
            }
          : {
              text: res.error ?? "The engine rejected the test message.",
              kind: "err",
            },
      );
    } catch (e) {
      setNotice({ text: errText(e, "Test send failed."), kind: "err" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="adm-card">
        <div className="adm-card-hd">
          <h3>Send test mail</h3>
          <p>
            Sends a message through the engine's outbound path — the quickest
            end-to-end check that SMTP submission works.
          </p>
        </div>
        <div className="adm-card-bd">
          <div className="adm-mail-testsend">
            <label className="adm-fl">
              <span>Recipient</span>
              <input
                className="adm-input"
                type="email"
                value={to}
                placeholder="you@example.com"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(err) || undefined}
                onChange={(e) => {
                  setTo(e.target.value);
                  setErr(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && void send()}
              />
            </label>
            <label className="adm-fl">
              <span>Subject (optional)</span>
              <input
                className="adm-input"
                value={subject}
                placeholder="Bloom mail engine test"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <label className="adm-fl">
              <span>Body (optional)</span>
              <textarea
                className="adm-input adm-mail-body"
                value={body}
                rows={5}
                placeholder="Default test message…"
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            {err && <span className="adm-set-err">{err}</span>}
            <button
              type="button"
              className="adm-btn"
              onClick={() => void send()}
              disabled={busy}
            >
              <EnvelopeIcon size={12} /> {busy ? "Sending…" : "Send test"}
            </button>
          </div>
        </div>
      </div>

      <MailToast notice={notice} />
    </>
  );
}
