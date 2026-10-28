import { Head, Section } from "./shared";
import { Icon } from "./Icon";

interface Job {
  icon: string;
  title: string;
  department: string;
  office: string;
  contract: string;
  ctc: string;
  summary: string;
  posted: string;
  band: string;
  apply_label: string;
  apply_href: string;
}

interface JobListProps {
  eyebrow: string;
  heading: string;
  lead: string;
  jobs: Job[];
  empty_heading: string;
  empty_body: string;
  empty_cta_label: string;
  empty_cta_href: string;
}

export function JobListSection({ props }: { props: JobListProps }) {
  const { eyebrow, heading, lead, jobs, empty_heading, empty_body, empty_cta_label, empty_cta_href } = props;
  return (
    <Section id="openings">
      <Head eyebrow={eyebrow} heading={heading} lead={lead} mid />
      <div className="rv">
        {(jobs ?? []).length ? (
          <div style={{ display: "grid", gap: 14 }}>
            {jobs.map((v, i) => (
              <div key={i} className="card" style={{ padding: "22px 24px" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      flex: "0 0 44px",
                      borderRadius: 13,
                      background: "var(--leaf-100)",
                      color: "var(--leaf-700)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 17,
                    }}
                  >
                    <Icon name={v.icon || "briefcase"} size={17} />
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <b
                      style={{
                        fontFamily: "var(--display)",
                        fontSize: 19,
                        fontWeight: 700,
                        letterSpacing: "-.3px",
                        display: "block",
                        lineHeight: 1.2,
                      }}
                    >
                      {v.title}
                    </b>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "9px 0 12px" }}>
                      {v.department && <span className="tag leaf">{v.department}</span>}
                      {v.office && <span className="tag">{v.office}</span>}
                      {v.contract && <span className="tag">{v.contract}</span>}
                      {v.ctc && <span className="tag amb">{v.ctc}</span>}
                    </div>
                    <div style={{ fontSize: "13.5px", color: "var(--ink-2)", lineHeight: 1.65 }}>
                      {v.summary}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        color: "var(--ink-4)",
                        marginTop: 10,
                      }}
                    >
                      {v.posted && <>Posted {v.posted}</>}
                      {v.posted && v.band && " · "}
                      {v.band && <>band {v.band}</>}
                    </div>
                  </div>
                  <a className="btn btn-p" href={v.apply_href || "#apply"}>
                    <Icon name="paper-plane" /> {v.apply_label || "Apply"}
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: 34, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
              {empty_heading || "No roles open right now"}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--ink-3)",
                lineHeight: 1.65,
                maxWidth: 420,
                margin: "0 auto 18px",
              }}
            >
              {empty_body}
            </div>
            <a className="btn btn-p" href={empty_cta_href || "#apply"}>
              {empty_cta_label || "Send a speculative application"}
            </a>
          </div>
        )}
      </div>
    </Section>
  );
}
