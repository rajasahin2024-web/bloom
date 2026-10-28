import { useMemo, useState } from "react";
import { Head, Section } from "./shared";
import { Icon } from "./Icon";

interface Uni {
  name: string;
  country: string;
  flag: string;
  course: string;
  city: string;
  tuition: string;
  intake: string;
  per_skill: string;
  ielts: string;
  toefl: string;
  rank: string;
  note: string;
  photo_url: string;
}

interface GlobeCta {
  label: string;
  href: string;
  icon?: string;
  style?: string;
}

interface UniFilterProps {
  eyebrow: string;
  heading: string;
  lead: string;
  all_label?: string;
  universities: Uni[];
  globe?: {
    eyebrow: string;
    heading: string;
    body: string;
    flags: string[];
    ctas: GlobeCta[];
  };
}

/* A per-skill value is only a band rule if it reads like one ("6.0 each",
   "no band below 6.5"). Anything else — "IMAT entrance exam required" — is an
   additional requirement, so it gets its own label and normal prose styling.
   Mirrors prototype/bloom-site-cms.js perSkillChip. */
function perSkillChip(v: string) {
  const value = String(v || "").trim();
  if (!value || /^none/i.test(value)) return null;
  const isBand = /\d(\.\d)?/.test(value) && value.length <= 26;
  if (isBand) {
    return (
      <span className="bandchip alt">
        <span className="k">Per skill</span>
        <span className="b" style={{ fontSize: 11 }}>
          {value}
        </span>
      </span>
    );
  }
  return (
    <span className="bandchip alt" style={{ maxWidth: "100%" }}>
      <span className="k">Also required</span>
      <span
        className="b"
        style={{
          fontSize: 11,
          fontFamily: "var(--sans)",
          fontWeight: 700,
          whiteSpace: "normal",
          lineHeight: 1.35,
        }}
      >
        {value}
      </span>
    </span>
  );
}

export function UniFilterSection({ props }: { props: UniFilterProps }) {
  const { eyebrow, heading, lead, all_label, universities, globe } = props;
  const [country, setCountry] = useState("all");
  const all = useMemo(() => universities ?? [], [universities]);
  const countries = useMemo(
    () => Array.from(new Set(all.map((u) => u.country))),
    [all],
  );
  const flagOf = (c: string) => all.find((u) => u.country === c)?.flag || "🎓";
  const list = country === "all" ? all : all.filter((u) => u.country === country);

  return (
    <Section id="universities">
      <Head eyebrow={eyebrow} heading={heading} lead={lead} mid />
      <div className="unifilt rv">
        <button className={country === "all" ? "on" : ""} onClick={() => setCountry("all")}>
          <Icon name="globe" /> {all_label || "All destinations"}{" "}
          <span className="n">{all.length}</span>
        </button>
        {countries.map((c) => (
          <button key={c} className={country === c ? "on" : ""} onClick={() => setCountry(c)}>
            <span>{flagOf(c)}</span> {c}{" "}
            <span className="n">{all.filter((u) => u.country === c).length}</span>
          </button>
        ))}
      </div>
      <div className="unidir">
        {list.map((u, i) => (
          <article key={i} className="unic rv in">
            <div className="shot">
              {u.photo_url && (
                <img
                  src={u.photo_url}
                  alt={`${u.name} campus`}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
              <div className="flagbar">
                <span className="f">{u.flag || "🎓"}</span>
                {u.country}
              </div>
              {u.rank && <div className="rk">QS #{u.rank}</div>}
            </div>
            <div className="bd">
              <h4>{u.name}</h4>
              <div className="crs">{u.course}</div>
              <div className="meta">
                <div>
                  <div className="l">City</div>
                  <div className="v">{u.city || "—"}</div>
                </div>
                <div>
                  <div className="l">Tuition / year</div>
                  <div className="v">{u.tuition || "—"}</div>
                </div>
                <div>
                  <div className="l">Intakes</div>
                  <div className="v">{u.intake || "—"}</div>
                </div>
                <div>
                  <div className="l">Per-skill rule</div>
                  <div className="v">{u.per_skill || "None stated"}</div>
                </div>
              </div>
              <div className="bands">
                {u.ielts && (
                  <span className="bandchip">
                    <span className="k">IELTS</span>
                    <span className="b">{u.ielts}</span>
                  </span>
                )}
                {u.toefl && (
                  <span className="bandchip alt">
                    <span className="k">TOEFL</span>
                    <span className="b">{u.toefl}</span>
                  </span>
                )}
                {perSkillChip(u.per_skill)}
              </div>
              {u.note && (
                <div className="note">
                  <i>
                    <Icon name="lightbulb" />
                  </i>
                  {u.note}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {globe && (
        <div className="globe rv" style={{ marginTop: 44 }}>
          <div className="eb">{globe.eyebrow}</div>
          <h3>{globe.heading}</h3>
          <p>{globe.body}</p>
          <div className="flags">
            {(globe.flags ?? []).map((f, i) => (
              <span key={i}>{f}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
            {(globe.ctas ?? []).map((c, i) => (
              <a
                key={i}
                className={`btn ${c.style === "line" ? "btn-line" : "btn-white"}`}
                href={c.href}
              >
                {c.icon && <Icon name={c.icon} />} {c.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
