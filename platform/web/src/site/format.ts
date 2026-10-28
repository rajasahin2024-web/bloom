/** Format an ISO `YYYY-MM-DD` date like the prototype's cmsFmtDate (`28 August 2026`). */
export function fmtDate(d: string): string {
  if (!d) return "";
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
