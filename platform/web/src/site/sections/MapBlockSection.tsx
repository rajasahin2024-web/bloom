import { Head, Section } from "./shared";

interface Dot {
  left: string;
  top: string;
  size: number | string;
  delay: number | string;
  color?: string;
}

interface Country {
  flag: string;
  name: string;
  students: string;
  pct: number | string;
  bar_color?: string;
}

interface MapBlockProps {
  eyebrow: string;
  heading: string;
  lead: string;
  variant?: string;
  anchor_id?: string;
  map: {
    dots: Dot[];
    label?: { text: string; left: string; top: string };
  };
  countries: Country[];
  stats: { value: string; label: string }[];
}

const OUTLINE =
  "M60 96c14-13 34-19 52-14 12 4 20 14 33 15 15 1 27-9 42-9 12 0 22 7 33 11 14 5 30 4 44-2" +
  "M118 150c22-6 46-2 66 8 15 8 27 20 43 25 20 6 41 0 61-5" +
  "M200 210c26-9 55-7 80 5 18 8 33 21 52 27" +
  "M330 84c20-11 44-14 66-9 17 4 31 15 48 19 20 5 41 0 61-6 18-5 38-8 55-1" +
  "M370 148c25-8 52-6 76 4 19 8 35 21 55 26 22 6 45 3 66-4" +
  "M420 214c22-7 46-5 67 5 16 8 30 20 47 25";

export function MapBlockSection({ props }: { props: MapBlockProps }) {
  const { eyebrow, heading, lead, variant, anchor_id, map, countries, stats } =
    props;
  return (
    <Section variant={variant === "paper" ? "paper" : "dark"} id={anchor_id ?? "reach"}>
      <Head eyebrow={eyebrow} heading={heading} lead={lead} />
      <div className="reach">
        <div className="mapwrap rv" style={{ minHeight: 340 }}>
          <svg
            viewBox="0 0 640 320"
            style={{ width: "100%", height: "auto", opacity: 0.42 }}
          >
            <path fill="none" stroke="#a3d199" strokeWidth={1.1} d={OUTLINE} />
          </svg>
          {(map?.dots ?? []).map((d, i) => (
            <span
              key={i}
              className="dot"
              style={{
                width: d.size,
                height: d.size,
                left: d.left,
                top: d.top,
                animationDelay:
                  typeof d.delay === "number" ? `${d.delay}s` : d.delay,
                background:
                  d.color === "amber" ? "var(--amber)" : d.color || undefined,
              }}
            />
          ))}
          {map?.label?.text && (
            <div
              style={{
                position: "absolute",
                left: map.label.left,
                top: map.label.top,
                transform: "translate(16px,-8px)",
                fontSize: "10.5px",
                fontWeight: 800,
                color: "var(--amber)",
                letterSpacing: ".4px",
              }}
            >
              {map.label.text}
            </div>
          )}
        </div>
        <div className="rv">
          <div className="countries">
            {(countries ?? []).map((c, i) => (
              <div key={i} className="crow">
                <span className="fl">{c.flag}</span>
                <span className="nm">{c.name}</span>
                <div className="bar">
                  <i
                    style={{
                      width: `${c.pct}%`,
                      background: c.bar_color || "var(--leaf-300)",
                    }}
                  />
                </div>
                <span className="n">{c.students}</span>
              </div>
            ))}
          </div>
          {stats && stats.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 26,
                flexWrap: "wrap",
                marginTop: 32,
                paddingTop: 26,
                borderTop: "1px solid rgba(255,255,255,.14)",
              }}
            >
              {stats.map((s, i) => (
                <div key={i}>
                  <div
                    style={{
                      fontFamily: "var(--display)",
                      fontSize: 23,
                      fontWeight: 800,
                      letterSpacing: "-1px",
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
          )}
        </div>
      </div>
    </Section>
  );
}
