/**
 * SiteEditor — full-screen edit modal for a single CMS section.
 *
 * The form is auto-generated from SECTION_META[section.type].fields. Each
 * FieldSpec renders the appropriate input; list fields render a card-list
 * editor with add/remove/move. A deep-cloned draft holds all edits; Save
 * commits the draft back to the parent (which PATCHes the API).
 */
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { SECTION_META } from "./sections/registry";
import type { FieldSpec, SiteSection } from "./sections/types";
import { useMediaUpload } from "./useMediaUpload";

interface SiteEditorProps {
  section: SiteSection;
  onSave: (updated: SiteSection) => void;
  onClose: () => void;
  onDelete: () => void;
  token: string;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function get(obj: any, key: string): any {
  return obj?.[key];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function set(obj: any, key: string, val: any): void {
  if (obj == null) return;
  obj[key] = val;
}

export function SiteEditor({ section, onSave, onClose, onDelete, token }: SiteEditorProps) {
  const meta = SECTION_META[section.type];
  const [draft, setDraft] = useState<SiteSection>(() => clone(section));
  const upload = useMediaUpload(token);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  useEffect(() => {
    setDraft(clone(section));
  }, [section]);

  function updateProps(mut: (p: Record<string, unknown>) => void) {
    setDraft((d) => {
      const next = clone(d);
      mut(next.props as Record<string, unknown>);
      return next;
    });
  }

  function handleSave() {
    onSave(draft);
  }

  function startUpload(key: string) {
    setUploadKey(key);
    setUploadErr(null);
    fileRef.current?.click();
  }

  async function onFilePicked(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadKey) return;
    try {
      const url = await upload(file);
      updateProps((p) => set(p, uploadKey, url));
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadKey(null);
    }
  }

  return (
    <div className="site-editor" role="dialog" aria-label={`Edit ${section.label}`}>
      <div className="site-editor-head">
        <b>{section.label}</b>
        <label className="site-edit-vis">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
          />
          Visible
        </label>
        <div className="site-editor-head-btns">
          <button type="button" className="adm-btn adm-btn-g" onClick={onClose}>
            Close
          </button>
          <button type="button" className="adm-btn" onClick={onDelete}>
            Delete section
          </button>
          <button type="button" className="adm-btn adm-btn-p" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
      <div className="site-editor-body">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={onFilePicked}
        />
        {uploadErr && <div className="site-edit-err">{uploadErr}</div>}
        {meta?.fields.map((f) => (
          <FieldRenderer
            key={f.key}
            spec={f}
            value={get(draft.props, f.key)}
            onChange={(v) => updateProps((p) => set(p, f.key, v))}
            onUpload={(key) => startUpload(key)}
          />
        ))}
        <AnimationEditor
          animation={draft.animation}
          onChange={(a) => setDraft({ ...draft, animation: a })}
        />
      </div>
    </div>
  );
}

function FieldRenderer({
  spec,
  value,
  onChange,
  onUpload,
}: {
  spec: FieldSpec;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (v: any) => void;
  onUpload: (key: string) => void;
}) {
  if (spec.list) {
    return (
      <ListField
        spec={spec}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value={Array.isArray(value) ? value : ([] as any[])}
        onChange={onChange}
        onUpload={onUpload}
      />
    );
  }
  if (spec.kind === "group") {
    return (
      <GroupField
        spec={spec}
        value={value ?? {}}
        onChange={onChange}
        onUpload={onUpload}
      />
    );
  }
  return (
    <ScalarField
      spec={spec}
      value={value ?? ""}
      onChange={onChange}
      onUpload={onUpload}
    />
  );
}

function ScalarField({
  spec,
  value,
  onChange,
  onUpload,
}: {
  spec: FieldSpec;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (v: any) => void;
  onUpload: (key: string) => void;
}) {
  const label = <span>{spec.label}</span>;
  if (spec.kind === "toggle") {
    return (
      <label className="site-edit-f site-edit-toggle">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
    );
  }
  if (spec.kind === "select") {
    return (
      <label className="site-edit-f">
        {label}
        <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {spec.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (spec.kind === "textarea" || spec.kind === "richtext") {
    return (
      <label className="site-edit-f">
        {label}
        <textarea
          rows={spec.kind === "richtext" ? 6 : 3}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }
  if (spec.kind === "image") {
    return (
      <div className="site-edit-f site-edit-img">
        {label}
        {value ? (
          <img src={String(value)} alt={spec.label} className="site-edit-thumb" />
        ) : null}
        <div className="site-edit-img-btns">
          <button type="button" className="adm-btn adm-btn-sm" onClick={() => onUpload(spec.key)}>
            Upload
          </button>
          <input
            type="url"
            placeholder="or paste URL"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
          {value ? (
            <button type="button" className="adm-btn adm-btn-sm" onClick={() => onChange("")}>
              Clear
            </button>
          ) : null}
        </div>
      </div>
    );
  }
  const type = spec.kind === "url" ? "url" : "text";
  return (
    <label className="site-edit-f">
      {label}
      <input
        type={type}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function GroupField({
  spec,
  value,
  onChange,
  onUpload,
}: {
  spec: FieldSpec;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (v: any) => void;
  onUpload: (key: string) => void;
}) {
  return (
    <div className="site-edit-group">
      <div className="site-edit-group-hd">{spec.label}</div>
      {spec.fields?.map((f) => (
        <FieldRenderer
          key={f.key}
          spec={f}
          value={value[f.key]}
          onChange={(v) => onChange({ ...value, [f.key]: v })}
          onUpload={onUpload}
        />
      ))}
    </div>
  );
}

function ListField({
  spec,
  value,
  onChange,
  onUpload,
}: {
  spec: FieldSpec;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (v: any[]) => void;
  onUpload: (key: string) => void;
}) {
  function update(i: number, v: unknown) {
    const next = [...value];
    next[i] = v;
    onChange(next);
  }
  function remove(i: number) {
    onChange(value.filter((_, j) => j !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function add() {
    const item: Record<string, unknown> = {};
    spec.itemFields?.forEach((f) => {
      item[f.key] = f.kind === "toggle" ? false : f.list ? [] : "";
    });
    onChange([...value, item]);
  }
  return (
    <div className="site-edit-list">
      <div className="site-edit-group-hd">{spec.label}</div>
      {value.map((item, i) => (
        <div key={i} className="site-edit-card">
          <div className="site-edit-card-btns">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0}>
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === value.length - 1}
            >
              ↓
            </button>
            <button type="button" onClick={() => remove(i)}>
              ✕
            </button>
          </div>
          {spec.itemFields?.map((f) => (
            <FieldRenderer
              key={f.key}
              spec={f}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              value={(item as any)[f.key]}
              onChange={(v) => update(i, { ...item, [f.key]: v })}
              onUpload={onUpload}
            />
          ))}
        </div>
      ))}
      <button type="button" className="adm-btn adm-btn-sm" onClick={add}>
        + Add item
      </button>
    </div>
  );
}

function AnimationEditor({
  animation,
  onChange,
}: {
  animation: { type: string | null; delay_ms: number; speed_s: number } | null;
  onChange: (a: { type: string | null; delay_ms: number; speed_s: number }) => void;
}) {
  const a = animation ?? { type: null, delay_ms: 0, speed_s: 30 };
  return (
    <div className="site-edit-group">
      <div className="site-edit-group-hd">Animation</div>
      <label className="site-edit-f">
        <span>Type</span>
        <select
          value={a.type ?? ""}
          onChange={(e) => onChange({ ...a, type: e.target.value || null })}
        >
          <option value="">none</option>
          <option value="fade">fade</option>
          <option value="slide">slide</option>
          <option value="marquee-ltr">marquee-ltr</option>
        </select>
      </label>
      <label className="site-edit-f">
        <span>Delay (ms)</span>
        <input
          type="number"
          value={a.delay_ms ?? 0}
          onChange={(e) => onChange({ ...a, delay_ms: Number(e.target.value) })}
        />
      </label>
      {a.type === "marquee-ltr" && (
        <label className="site-edit-f">
          <span>Speed (seconds)</span>
          <input
            type="number"
            value={a.speed_s ?? 30}
            onChange={(e) => onChange({ ...a, speed_s: Number(e.target.value) })}
          />
        </label>
      )}
    </div>
  );
}
