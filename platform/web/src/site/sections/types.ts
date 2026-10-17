/**
 * Section registry types — the edit-form field spec and the component
 * contract every typed site section implements.
 *
 * The old home page stored each section as a raw-HTML string rendered via
 * dangerouslySetInnerHTML. TEC-129 replaces that with typed React sections
 * driven by `props`; the FieldSpec below auto-generates the full-screen
 * editor form (see SiteEditor.tsx).
 */

export interface FieldSpec {
  kind:
    | "text"
    | "textarea"
    | "richtext"
    | "url"
    | "image"
    | "toggle"
    | "select"
    | "group";
  key: string;
  label: string;
  /** list:true → the value is an array; itemFields describes each entry. */
  list?: boolean;
  itemFields?: FieldSpec[];
  /** group kind → nested single object rendered with these sub-fields. */
  fields?: FieldSpec[];
  options?: string[];
}

export interface SectionMeta {
  label: string;
  fields: FieldSpec[];
}

export interface SectionAnimation {
  type: string | null;
  delay_ms: number;
  speed_s: number;
}

export interface SectionComponentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any;
  animation?: SectionAnimation | null;
}

export interface SiteSection {
  id: string;
  label: string;
  type: string;
  enabled: boolean;
  animation: SectionAnimation | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any;
}
