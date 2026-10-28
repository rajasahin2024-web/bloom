import { createElement, type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * The prototype's `<cap>` caption tag used inside `.mo` moment cells.
 * `cap` is not a standard HTML element, so it is created imperatively to
 * keep the exact prototype markup (`.mo cap`) without a JSX declaration.
 */
export function Cap({ children }: { children: ReactNode }) {
  return createElement("cap", null, children);
}

/** Section heading block — eyebrow + h2 + lead, matching `.head`/`.head.mid`. */
export function Head({
  eyebrow,
  heading,
  lead,
  mid = false,
}: {
  eyebrow?: string;
  heading?: string;
  lead?: string;
  mid?: boolean;
}) {
  if (!heading && !eyebrow) return null;
  return (
    <div className={`head rv${mid ? " mid" : ""}`}>
      {eyebrow && <div className="eb">{eyebrow}</div>}
      {heading && <h2>{heading}</h2>}
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
}

/** Render an icon by name inside a coloured `.ic` slot. */
export function IconSlot({ icon, tone = "leaf" }: { icon: string; tone?: string }) {
  return (
    <div className={`ic ic-${tone}`}>
      <Icon name={icon} />
    </div>
  );
}

/** Wrap children in a `.sec` with optional variant class (paper/dark/tight). */
export function Section({
  variant,
  id,
  children,
}: {
  variant?: "paper" | "dark" | "tight";
  id?: string;
  children: ReactNode;
}) {
  const cls = ["sec"];
  if (variant) cls.push(variant);
  return (
    <section className={cls.join(" ")} id={id}>
      <div className="wrap">{children}</div>
    </section>
  );
}
