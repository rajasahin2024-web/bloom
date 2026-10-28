import { Head, Section } from "./shared";

interface Dot {
  x: string;
  y: string;
  size: string;
  delay: string;
  color: string;
}

interface MapBlockProps {
  eyebrow: string;
  heading: string;
  lead: string;
  min_height: string;
  dots: Dot[];
  marker: { x: string; y: string; label: string };
}

const OUTLINE =
  "M60 96c14-13 34-19 52-14 12 4 20 14 33 15 15 1 27-9 42-9 12 0 22 7 33 11 14 5 30 4 44-2" +
  "M118 150c22-6 46-2 66 8 15 8 27 20 43 25 20 6 41 0 61-5" +
  "M200 210c26-9 55-7 80 5 18 8 33 21 52 27" +
  "M330 84c20-11 44-14 66-9 17 4 31 15 48 19 20 5 41 0 61-6 18-5 38-8 55-1" +
  "M370 148c25-8 52-6 76 4 19 8 35 21 55 26 22 6 45 3 66-4" +
  "M420 214c22-7 46-5 67 5 16 8 30 20 47 25";

export function MapBlockSection({ props }: { props: MapBlockProps }) {
  const { eyebrow, heading, lead, min_height, dots, marker } = props;
  return (
    <Section variant="dark">
      <Head eyebrow={eyebrow} heading={heading} lead={lead} />
      <div className="mapwrap rv" style={{ minHeight: min_height || 340 }}>
        <svg viewBox="0 0 640 320" style={{ width: "100%", height: "auto", opacity: 0.42 }}>
          <path fill="none" stroke="#a3d199" strokeWidth={1.1} d={OUTLINE} />
        </svg>
        {(dots ?? []).map((d, i) => (
          <span
            key={i}
            className="dot"
            style={{
              width: d.size,
              height: d.size,
              left: d.x,
              top: d.y,
              animationDelay: d.delay,
              background: d.color || undefined,
            }}
          />
        ))}
        {marker?.label && (
          <div
            style={{
              position: "absolute",
              left: marker.x,
              top: marker.y,
              transform: "translate(16px,-8px)",
              fontSize: "10.5px",
              fontWeight: 800,
              color: "var(--amber)",
              letterSpacing: ".4px",
            }}
          >
            {marker.label}
          </div>
        )}
      </div>
    </Section>
  );
}
