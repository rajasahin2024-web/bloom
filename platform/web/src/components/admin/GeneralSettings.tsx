/**
 * General Settings — the admin settings page (Settings → General Settings).
 *
 * Wizard layout matching the setup installer: a numbered step rail (dark
 * leaf panel on desktop, a horizontal step strip on mobile) walks through
 * one settings group at a time — Institute → Academic → Finance →
 * Notifications → Platform Info. Every row carries a one-line "what it
 * controls / where it's used" note and a source chip — `env` for
 * installer/prototype defaults, `db` for admin overrides. Edits collect
 * in a draft; a sticky bottom bar offers Save / Discard, and "Reset to
 * defaults" sits behind a confirm dialog.
 *
 * Platform Info is the last step — read-only live status chips from the
 * settings payload plus /api/health.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ApiError, apiFieldErrors } from "@/lib/api";
import { env } from "@/config/env";
import type { AdminSession } from "@/lib/auth";
import { invalidateBranding } from "@/lib/branding";
import {
  fetchHealth,
  fetchSettings,
  resetSettings,
  saveSettings,
} from "@/lib/settings";
import type {
  HealthPayload,
  SettingItem,
  SettingsPayload,
} from "@/lib/settings";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  RotateLeftIcon,
  UploadIcon,
  XIcon,
} from "@/components/icons";

const IMAGE_MAX_BYTES = 512 * 1024;

interface GeneralSettingsProps {
  session: AdminSession;
}

function displayValue(item: SettingItem, draft: Record<string, unknown>) {
  return item.key in draft ? draft[item.key] : item.value;
}

export function GeneralSettings({ session }: GeneralSettingsProps) {
  const token = session.tokens.access_token;
  const [payload, setPayload] = useState<SettingsPayload | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    kind: "ok" | "err";
  } | null>(null);
  const [step, setStep] = useState(0);
  const wizRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([fetchSettings(token), fetchHealth().catch(() => null)])
      .then(([settings, h]) => {
        if (!live) return;
        setPayload(settings);
        setHealth(h);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setLoadError(
          err instanceof ApiError ? err.message : "Could not load settings.",
        );
      });
    return () => {
      live = false;
    };
  }, [token]);

  // Flash a transient confirmation after save/reset.
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  // Wizard steps: one per API group, plus the read-only platform status.
  const steps = useMemo(() => {
    const fromApi = (payload?.groups ?? []).map((g) => ({
      id: g.id,
      label: g.label,
      meta: `${g.items.length} ${g.items.length === 1 ? "field" : "fields"}`,
      dirty: g.items.filter((i) => i.key in draft).length,
    }));
    return [
      ...fromApi,
      { id: "platform", label: "Platform Info", meta: "Read-only", dirty: 0 },
    ];
  }, [payload, draft]);

  const stepCount = steps.length;
  const current = Math.min(step, Math.max(0, stepCount - 1));
  const groups = payload?.groups ?? [];
  const isPlatformStep = current === groups.length;
  const activeGroup = isPlatformStep ? null : groups[current];

  function goTo(i: number) {
    const next = Math.min(Math.max(i, 0), stepCount - 1);
    setStep(next);
    // Bring the wizard card back to the top so each step reads from its
    // header — matches installer-style step transitions on small screens.
    wizRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setKey(item: SettingItem, value: unknown) {
    setDraft((cur) => {
      const next = { ...cur };
      if (Object.is(value, item.value)) delete next[item.key];
      else next[item.key] = value;
      return next;
    });
    setFieldErrors((cur) => {
      if (!(item.key in cur)) return cur;
      const next = { ...cur };
      delete next[item.key];
      return next;
    });
  }

  function onImageFile(item: SettingItem, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > IMAGE_MAX_BYTES) {
      setFieldErrors((cur) => ({
        ...cur,
        [item.key]: "Image must be 512KB or smaller.",
      }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setKey(item, reader.result);
    reader.readAsDataURL(file);
  }

  const dirtyCount = Object.keys(draft).length;

  function applyServerPayload(next: SettingsPayload) {
    setPayload(next);
    setDraft({});
    setFieldErrors({});
    invalidateBranding();
  }

  async function save() {
    if (!payload || saving) return;
    setSaving(true);
    try {
      const next = await saveSettings(token, draft);
      applyServerPayload(next);
      setNotice({ text: "Settings saved.", kind: "ok" });
    } catch (err) {
      const errors = apiFieldErrors(err);
      if (errors) setFieldErrors(errors);
      const msgs = errors ? Object.values(errors) : [];
      setNotice({
        text:
          msgs.length > 0
            ? `Save failed — ${msgs[0]}${msgs.length > 1 ? ` (+${msgs.length - 1} more)` : ""}`
            : err instanceof ApiError
              ? err.message
              : "Save failed.",
        kind: "err",
      });
    } finally {
      setSaving(false);
    }
  }

  async function resetAll() {
    if (!payload || resetting) return;
    setResetting(true);
    try {
      const next = await resetSettings(token);
      applyServerPayload(next);
      setNotice({ text: "Settings reset to defaults.", kind: "ok" });
    } catch (err) {
      setNotice({
        text: err instanceof ApiError ? err.message : "Reset failed.",
        kind: "err",
      });
    } finally {
      setResetting(false);
      setConfirmReset(false);
    }
  }

  function control(item: SettingItem, invalid: boolean) {
    const value = displayValue(item, draft);
    const dirty = item.key in draft;
    switch (item.type) {
      case "toggle":
        return (
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(value)}
            aria-invalid={invalid || undefined}
            aria-label={item.label}
            className={`adm-switch${value ? " on" : ""}`}
            onClick={() => setKey(item, !value)}
          >
            <i />
          </button>
        );
      case "select":
        return (
          <select
            className={`adm-input${dirty ? " dirty" : ""}`}
            value={String(value ?? "")}
            onChange={(e) => setKey(item, e.target.value)}
            aria-label={item.label}
            aria-invalid={invalid || undefined}
          >
            {(item.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case "number":
        return (
          <input
            type="number"
            className={`adm-input${dirty ? " dirty" : ""}`}
            value={value === null || value === undefined ? "" : String(value)}
            min={0}
            max={100}
            aria-label={item.label}
            aria-invalid={invalid || undefined}
            onChange={(e) =>
              setKey(item, e.target.value === "" ? 0 : Number(e.target.value))
            }
          />
        );
      case "image": {
        const src = typeof value === "string" && value ? value : null;
        return (
          <div className="adm-imgup">
            <span className={`adm-imgup-prev${src ? "" : " empty"}`}>
              {src ? (
                <img
                  src={
                    src.startsWith("data:") || src.startsWith("http")
                      ? src
                      : `${env.apiBaseUrl}${src}`
                  }
                  alt=""
                />
              ) : (
                <UploadIcon size={13} />
              )}
            </span>
            <label className="adm-btn adm-btn-g adm-imgup-btn">
              <UploadIcon size={11} /> Upload
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(e) => onImageFile(item, e)}
              />
            </label>
            {src && (
              <button
                type="button"
                className="adm-imgup-rm"
                onClick={() => setKey(item, null)}
              >
                Remove
              </button>
            )}
          </div>
        );
      }
      default:
        return (
          <input
            type={item.type === "email" ? "email" : item.type === "url" ? "url" : "text"}
            className={`adm-input${dirty ? " dirty" : ""}`}
            value={String(value ?? "")}
            aria-label={item.label}
            aria-invalid={invalid || undefined}
            onChange={(e) => setKey(item, e.target.value)}
          />
        );
    }
  }

  if (loadError) {
    return (
      <div className="adm-set">
        <div className="adm-card adm-set-loaderr" role="alert">
          <b>Settings could not be loaded</b>
          <p>{loadError}</p>
          <button
            type="button"
            className="adm-btn"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="wiz-loading" role="status">
        <span className="wiz-spinner" />
        Loading settings…
      </div>
    );
  }

  const platform = payload.platform;
  const chips = [
    { label: "Environment", value: platform.env, tone: "info" as const },
    { label: "App version", value: `v${platform.version}`, tone: "info" as const },
    {
      label: "Postgres",
      value: health?.checks.postgres.ok ? "Connected" : "Unreachable",
      tone: health?.checks.postgres.ok ? ("ok" as const) : ("bad" as const),
    },
    {
      label: "Redis",
      value: health?.checks.redis.ok ? "Connected" : "Unreachable",
      tone: health?.checks.redis.ok ? ("ok" as const) : ("bad" as const),
    },
    {
      label: "Mail engine",
      value: platform.mail_engine.detail ?? "Not configured",
      tone: "warn" as const,
    },
    {
      label: "Storage",
      value: platform.storage.ok ? "Writable" : "Unavailable",
      tone: platform.storage.ok ? ("ok" as const) : ("bad" as const),
    },
  ];

  return (
    <div className="adm-set">
      {/* page head */}
      <div className="adm-phead">
        <div>
          <div className="adm-eyebrow">Settings</div>
          <h1>
            General <em>Settings</em>
          </h1>
          <p>
            Institute identity, academic defaults, finance rules and
            notifications — DB overrides beat installer env defaults.
          </p>
        </div>
        <div className="adm-phead-actions">
          <button
            type="button"
            className="adm-btn adm-btn-g"
            onClick={() => setConfirmReset(true)}
          >
            <RotateLeftIcon size={12} /> Reset to defaults
          </button>
        </div>
      </div>

      {/* wizard card — step rail + current step */}
      <div className="adm-setwiz" ref={wizRef}>
        <div className="adm-setwiz-rail">
          <nav className="adm-setwiz-steps" aria-label="Settings steps">
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-current={current === i ? "step" : undefined}
                className={`adm-setwiz-step${current === i ? " on" : ""}`}
                onClick={() => goTo(i)}
              >
                <span className="n">{i + 1}</span>
                <span className="tx">
                  <span className="lb">{s.label}</span>
                  <span className="meta">{s.meta}</span>
                </span>
                {s.dirty > 0 && <span className="dt">{s.dirty}</span>}
              </button>
            ))}
          </nav>
          <div className="adm-setwiz-prog">
            <span className="adm-setwiz-prog-t">
              Step {current + 1} of {stepCount}
            </span>
            <span className="adm-setwiz-prog-bar">
              <i style={{ width: `${((current + 1) / stepCount) * 100}%` }} />
            </span>
          </div>
        </div>

        <div className="adm-setwiz-main">
          <div className="adm-setwiz-head">
            <div className="adm-eyebrow">
              Step {current + 1} · {isPlatformStep ? "Status" : "Settings"}
            </div>
            <h2>{isPlatformStep ? "Platform Info" : activeGroup?.label}</h2>
            <p>
              {isPlatformStep
                ? "Live runtime status — read-only."
                : activeGroup?.description}
            </p>
          </div>

          {activeGroup && (
            <div className="adm-setwiz-rows">
              {activeGroup.items.map((item) => {
                const fieldError = fieldErrors[item.key];
                return (
                  <div
                    key={item.key}
                    className={`adm-set-row${item.key in draft ? " dirty" : ""}`}
                  >
                    <div className="adm-set-info">
                      <div className="adm-set-lb">
                        <span className="adm-set-lb-t">{item.label}</span>
                        <span
                          className={`adm-src ${item.source}`}
                          title={
                            item.source === "db"
                              ? "Saved in the database — overrides the installer env default"
                              : "Installer env / prototype default — not yet overridden"
                          }
                        >
                          {item.source === "db" ? "DB override" : "env default"}
                        </span>
                      </div>
                      <p>{item.description}</p>
                      {fieldError && (
                        <span className="adm-set-err">{fieldError}</span>
                      )}
                    </div>
                    <div className="adm-set-ctl">
                      {control(item, Boolean(fieldError))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isPlatformStep && (
            <div className="adm-setwiz-rows pad">
              <div className="adm-status-grid">
                {chips.map((c) => (
                  <div key={c.label} className="adm-status">
                    <span className="adm-status-l">{c.label}</span>
                    <span className={`adm-status-v ${c.tone}`}>
                      <i />
                      {c.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* step footer — Back / position / Continue */}
          <div className="adm-setwiz-foot">
            <button
              type="button"
              className="adm-btn adm-btn-g"
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
            >
              <ArrowLeftIcon size={12} /> Back
            </button>
            <span className="adm-setwiz-pos">
              {current + 1} / {stepCount}
            </span>
            {!isPlatformStep && (
              <button
                type="button"
                className="adm-btn"
                onClick={() => goTo(current + 1)}
              >
                Continue <ArrowRightIcon size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* unsaved-changes bar */}
      {dirtyCount > 0 && (
        <div className="adm-savebar" role="status">
          <span className="adm-savebar-n">
            <b>{dirtyCount}</b> unsaved {dirtyCount === 1 ? "change" : "changes"}
          </span>
          <div className="adm-savebar-act">
            <button
              type="button"
              className="adm-btn adm-btn-g"
              onClick={() => {
                setDraft({});
                setFieldErrors({});
              }}
              disabled={saving}
            >
              Discard
            </button>
            <button
              type="button"
              className="adm-btn"
              onClick={save}
              disabled={saving}
            >
              <CheckIcon size={12} /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {/* transient notice — errors must show even while the draft is dirty */}
      {notice && (
        <div
          className={`adm-toast${notice.kind === "err" ? " err" : ""}${dirtyCount > 0 ? " raised" : ""}`}
          role={notice.kind === "err" ? "alert" : "status"}
        >
          {notice.kind === "err" ? (
            <XIcon size={12} />
          ) : (
            <CheckIcon size={12} />
          )}{" "}
          {notice.text}
        </div>
      )}

      {/* reset confirm */}
      {confirmReset && (
        <div
          className="adm-modal-scrim"
          role="presentation"
          onClick={() => !resetting && setConfirmReset(false)}
        >
          <div
            className="adm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="adm-reset-t"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="adm-reset-t">Reset all settings?</h3>
            <p>
              Every key returns to its installer env / prototype default and
              all DB overrides are cleared. This cannot be undone.
            </p>
            <div className="adm-modal-act">
              <button
                type="button"
                className="adm-btn adm-btn-g"
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-danger"
                onClick={resetAll}
                disabled={resetting}
              >
                {resetting ? "Resetting…" : "Reset to defaults"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
