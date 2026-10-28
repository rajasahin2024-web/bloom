import { Head, Section } from "./shared";

interface Cell {
  text: string;
  sub: string;
  bold: boolean;
  mono: boolean;
}

interface DataTableProps {
  eyebrow: string;
  heading: string;
  lead: string;
  columns: { label: string }[];
  rows: { cells: Cell[] }[];
  footnote: string;
}

export function DataTableSection({ props }: { props: DataTableProps }) {
  const { eyebrow, heading, lead, columns, rows, footnote } = props;
  return (
    <Section>
      <Head eyebrow={eyebrow} heading={heading} lead={lead} />
      <div className="tbl-wrap rv">
        <table className="tbl">
          <thead>
            <tr>
              {(columns ?? []).map((c, i) => (
                <th key={i}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r, i) => (
              <tr key={i}>
                {(r.cells ?? []).map((cell, j) => (
                  <td key={j} className={cell.mono ? "mono" : undefined}>
                    {cell.bold ? <b>{cell.text}</b> : cell.text}
                    {cell.sub && (
                      <div style={{ fontSize: "11.5px", color: "var(--ink-4)", marginTop: 3 }}>
                        {cell.sub}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footnote && (
        <div style={{ fontSize: "12.5px", color: "var(--ink-4)", marginTop: 20 }} className="rv">
          {footnote}
        </div>
      )}
    </Section>
  );
}
