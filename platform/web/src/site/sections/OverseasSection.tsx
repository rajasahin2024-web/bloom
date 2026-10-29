import { Head, Inline, Section } from "./shared";
import { Icon } from "./Icon";

interface LockupSide {
  name: string;
  sub: string;
  logo_url?: string;
  mark?: string;
}

interface OverseasProps {
  eyebrow?: string;
  heading: string;
  body: string;
  variant?: string;
  lockup?: { bloom: LockupSide; partner: LockupSide; note: string };
  items: { title: string; body: string }[];
  checklist?: {
    eyebrow: string;
    title: string;
    items: { icon: string; title: string; body: string }[];
  };
  unis_title?: string;
  universities?: {
    name: string;
    flag: string;
    course: string;
    ielts: string;
    per_skill: string;
  }[];
  stats?: { value: string; label: string }[];
  cta?: { label: string; href: string; icon?: string };
  cta_note?: string;
}

export function OverseasSection({ props }: { props: OverseasProps }) {
  const {
    eyebrow = "Study abroad",
    heading,
    body,
    variant,
    lockup,
    items,
    checklist,
    unis_title,
    universities,
    stats,
    cta,
    cta_note,
  } = props;
  return (
    <Section variant={variant === "paper" ? "paper" : "dark"} id="overseas">
      <Head eyebrow={eyebrow} heading={heading} lead={body} />

      {lockup && (
        <div className="lockup rv" style={{ marginBottom: 44 }}>
          <div className="p">
            {lockup.bloom?.logo_url && (
              <img
                src={lockup.bloom.logo_url}
                alt={`${lockup.bloom.name} ${lockup.bloom.sub}`}
                style={{ width: 36, height: 36 }}
              />
            )}
            <div>
              <b>{lockup.bloom?.name}</b>
              <span>{lockup.bloom?.sub}</span>
            </div>
          </div>
          <div className="x">
            <Icon name="xmark" />
          </div>
          <div className="p">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(140deg,#0d3b6e,#1a6fa8)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--display)",
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              {lockup.partner?.mark}
            </div>
            <div>
              <b>{lockup.partner?.name}</b>
              <span>{lockup.partner?.sub}</span>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 220,
              fontSize: 13,
              color: "rgba(255,255,255,.68)",
              lineHeight: 1.6,
            }}
          >
            {lockup.note}
          </div>
        </div>
      )}

      <div className="path rv" style={{ marginBottom: 44 }}>
        {items.map((it, i) => (
          <div key={i} className="pstep">
            <div className="n">{i + 1}</div>
            <h3><Inline text={it.title} /></h3>
            <p>{it.body}</p>
          </div>
        ))}
      </div>

      {(checklist || universities) && (
        <div className="split" style={{ alignItems: "start" }}>
          {checklist && (
            <div className="rv">
              <div className="eb"><Inline text={checklist.eyebrow} /></div>
              <h3 style={{ fontSize: 24, color: "#fff", marginBottom: 8 }}>
                <Inline text={checklist.title} />
              </h3>
              <ul className="checklist">
                {checklist.items.map((it, i) => (
                  <li key={i}>
                    <span className="tk">
                      <Icon name={it.icon || "check"} />
                    </span>
                    <div>
                      <b>{it.title}</b>
                      <span>{it.body}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {universities && (
            <div className="rv">
              <div className="eb"><Inline text={unis_title} /></div>
              <div className="unis">
                {universities.map((u, i) => (
                  <div key={i} className="uni">
                    <div className="fl">{u.flag || "🎓"}</div>
                    <b>{u.name}</b>
                    <span>{u.course}</span>
                    <div className="req">
                      Needs {u.ielts}
                      {u.per_skill ? ` · ${u.per_skill}` : ""}
                    </div>
                  </div>
                ))}
              </div>
              {stats && stats.length > 0 && (
                <div
                  style={{
                    marginTop: 22,
                    padding: "17px 19px",
                    background: "rgba(255,255,255,.07)",
                    border: "1px solid rgba(255,255,255,.14)",
                    borderRadius: 14,
                  }}
                >
                  <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
                    {stats.map((s, i) => (
                      <div key={i}>
                        <div
                          style={{
                            fontFamily: "var(--display)",
                            fontSize: 23,
                            fontWeight: 800,
                            letterSpacing: "-1px",
                            color: "#fff",
                          }}
                        >
                          {s.value}
                        </div>
                        <div
                          style={{
                            fontSize: "11.5px",
                            color: "rgba(255,255,255,.6)",
                            marginTop: 3,
                          }}
                        >
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {cta && (
        <div style={{ textAlign: "center", marginTop: 44 }} className="rv">
          <a className="btn btn-white btn-lg" href={cta.href}>
            {cta.icon && <Icon name={cta.icon} />} {cta.label}
          </a>
          {cta_note && (
            <div
              style={{
                fontSize: "12.5px",
                color: "rgba(255,255,255,.55)",
                marginTop: 12,
              }}
            >
              {cta_note}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
