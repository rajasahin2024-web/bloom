/**
 * SafeHtml — the one place the site renders stored rich-text markup.
 *
 * Trust boundary (TEC-163 A6): the API sanitizes post bodies server-side
 * with `nh3` on write — this component deliberately renders that sanitized
 * HTML via dangerouslySetInnerHTML. Never feed it unsanitized input (seed
 * text goes through `Inline` instead, which injects no markup at all).
 */
export function SafeHtml({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={className}
      // Server-sanitized on write (nh3 allowlist) — see TEC-163 A6.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
