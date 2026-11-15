/**
 * Shared bits for the Mail Engine admin tabs (TEC-189) — notice toasts,
 * status pills, dots and the graceful "not supported" empty state the
 * contract's `available: false` / `null` fields map onto. Non-component
 * helpers live in mail-utils.ts (fast-refresh rule).
 */
import type { ReactNode } from "react";
import type { Notice } from "@/components/admin/mail-utils";
import { CheckIcon, InfoIcon, XIcon } from "@/components/icons";

export function MailToast({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div className={`adm-toast${notice.kind === "err" ? " err" : ""}`} role="status">
      {notice.text}
    </div>
  );
}

export function Pill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "mut";
  children: ReactNode;
}) {
  return (
    <span className={`adm-pill ${tone}`}>
      <i />
      {children}
    </span>
  );
}

/** Small pass/fail dot used by the listener matrix and DNS rows. */
export function Dot({ ok }: { ok: boolean }) {
  return (
    <span className={`adm-mail-dot${ok ? " ok" : ""}`} aria-hidden="true" />
  );
}

/**
 * Graceful-gap state: `available: false` and `null` fields are contract
 * answers, not errors — render as "not supported" instead of a failure.
 */
export function NotSupported({ feature }: { feature: string }) {
  return (
    <div className="adm-mail-empty">
      <InfoIcon size={16} />
      <b>Not supported</b>
      <p>{feature} is not available on this engine version.</p>
    </div>
  );
}

export function OkMark({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="adm-mail-mark ok" aria-label="pass">
      <CheckIcon size={12} />
    </span>
  ) : (
    <span className="adm-mail-mark" aria-label="fail">
      <XIcon size={12} />
    </span>
  );
}
