import { Head, Section } from "./shared";
import { Icon } from "./Icon";

interface Job {
  id: string;
  title: string;
  dept: string;
  dept_icon: string;
  office: string;
  office_flag: string;
  contract: string;
  ctc: string;
  need: string;
  posted: string;
  band: string;
}

interface JobListProps {
  eyebrow: string;
  heading: string;
  lead: string;
  mid?: boolean;
  jobs: Job[];
  empty: { heading: string; body: string; cta_label: string; cta_href: string };
}

/**
 * Prototype `applyFor(id)` — pre-select the role in the application form and
 * smooth-scroll down to it, then focus the name field (careers.html).
 */
function applyFor(id: string) {
  const sel = document.getElementById("apRole") as HTMLSelectElement | null;
  if (sel) sel.value = id;
  const el = document.getElementById("apply");
  if (el) {
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 70,
      behavior: "smooth",
    });
  }
  window.setTimeout(() => {
    (document.getElementById("apName") as HTMLInputElement | null)?.focus();
  }, 500);
}

export function JobListSection({ props }: { props: JobListProps }) {
  const { eyebrow, heading, lead, mid, jobs, empty } = props;
  return (
    <Section id="openings">
      <Head eyebrow={eyebrow} heading={heading} lead={lead} mid={mid} />
      <div className="rv">
        {(jobs ?? []).length ? (
          <div style={{ display: "grid", gap: 14 }}>
            {jobs.map((v, i) => (
              <div key={v.id ?? i} className="card" style={{ padding: "22px 24px" }}>
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
                    <Icon name={v.dept_icon || "briefcase"} size={17} />
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
                      {v.dept && <span className="tag leaf">{v.dept}</span>}
                      {v.office && (
                        <span className="tag">
                          {v.office_flag ? `${v.office_flag} ` : ""}
                          {v.office}
                        </span>
                      )}
                      {v.contract && <span className="tag">{v.contract}</span>}
                      {v.ctc && <span className="tag amb">{v.ctc}</span>}
                    </div>
                    <div style={{ fontSize: "13.5px", color: "var(--ink-2)", lineHeight: 1.65 }}>
                      {v.need}
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
                  <button className="btn btn-p" type="button" onClick={() => applyFor(v.id)}>
                    <Icon name="paper-plane" /> Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: 34, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
              {empty?.heading || "No roles open right now"}
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
              {empty?.body}
            </div>
            <a className="btn btn-p" href={empty?.cta_href || "#apply"}>
              {empty?.cta_label || "Send a speculative application"}
            </a>
          </div>
        )}
      </div>
    </Section>
  );
}
