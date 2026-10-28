/**
 * Inline SVG icons — small Font-Aware-style glyphs so the typed site
 * sections reproduce the prototype's `<i class="fa-...">` slots without
 * pulling the whole FA CDN bundle. Keep it simple: one path per name.
 */
interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

const PATHS: Record<string, string> = {
  seedling: "M12 2c-1 3-4 5-7 5 0 4 3 7 7 7 0-3 2-6 5-7-2-2-4-4-5-5zM4 14c0 2 1 3 3 3M11 9v5",
  "arrow-trend-up": "M2 12l4-4 3 3 5-6M11 5h4v4",
  fire: "M8 1c1 3 4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-5 0-7z",
  check: "M6 11.5 3 8.5l1-1 2 2 5-5 1 1z",
  xmark: "M4 4l8 8M12 4l-8 8",
  "graduation-cap": "M8 3 1 6l7 3 5-2v4M3 8v3c0 1 2 2 5 2s5-1 5-2V8M15 6v4",
  "building-columns": "M8 1 1 5h14L8 1zM2 6v7h12V6M2 13h12M5 7v6M8 7v6M11 7v6M1 14h14",
  comments: "M2 3h9v5H6L3 10V8H2zM6 9h8v4H9l-2 2v-2H6z",
  "user-check": "M6 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2 14c0-3 2-4 4-4s4 1 4 4M11 9l2 2 3-3",
  "clipboard-check": "M5 2h6v2H5zM3 4h2v-1h6v1h2v10H3zM6 9l2 2 3-3",
  stethoscope: "M2 3v4a3 3 0 0 0 6 0V3M5 10v2a4 4 0 0 0 8 0v-1M13 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  "file-signature": "M3 1h7l4 4v10H3zM10 1v4h4M6 12l3-3 2 2-1 1z",
  "people-group": "M5 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM11 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM2 13c0-2 1-3 3-3s3 1 3 3M8 13c0-2 1-3 3-3s3 1 3 3",
  "pen-nib": "M2 14l3-1 7-7-2-2-7 7zM12 4l1 1 2-2-1-1z",
  microphone: "M8 11a3 3 0 0 0 3-3V4a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3zM4 8a4 4 0 0 0 8 0M8 12v3M5 15h6",
  "spell-check": "M2 12 5 4l3 8M3 9h4M10 12l2 2 4-4",
  "diagram-project": "M2 2h4v4H2zM10 2h4v4h-4zM2 10h4v4H2zM6 4h4M6 12h4M12 6v2",
  "wand-magic-sparkles": "M2 14L10 6l1 1-8 8zM11 2l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM13 9l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z",
  house: "M2 8l6-5 6 5v6H2zM6 14v-4h4v4",
  "calendar-days": "M2 3h12v11H2zM2 6h12M5 1v3M11 1v3M5 9h1M8 9h1M11 9h1M5 12h1",
  "circle-info": "M8 1a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM8 7v4M8 5h.01",
  "arrow-right": "M9 3l5 5-5 5M2 8h12",
  "arrow-right-to-bracket": "M10 8H2M9 4l5 4-5 4M3 2v12",
  award: "M8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 9l-1 6 4-2 4 2-1-6",
  "plane-departure": "M2 10l5-1 3-5 2 1-2 4 4 1-1 2-4-1-2 2-2-1-2 2-3-1z",
  crown: "M2 12h12l-1-7-3 3-3-5-3 5-3-3zM2 14h12",
  star: "M8 1l2 5h5l-4 3 1 5-4-3-4 3 1-5-4-3h5z",
  envelope: "M2 4h12v8H2zM2 4l6 4 6-4",
  phone: "M3 2h3l2 4-2 1c1 2 3 4 5 5l1-2 4 2v3c0 1-1 2-2 2-6 0-12-6-12-12 0-1 1-2 2-2z",
  "location-dot": "M8 1a5 5 0 0 0-5 5c0 4 5 9 5 9s5-5 5-9a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z",
  images: "M2 3h9v9H2zM5 6h3M13 5v8H5M7 9l2-2 3 3",
  "circle-question": "M8 1a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM6 6a2 2 0 1 1 3 1c-1 1-1 1-1 2M8 12h.01",
  desktop: "M2 2h12v8H2zM2 13h12M6 10v3M10 10v3",
  "layer-group": "M8 2 1 6l7 4 7-4zM1 10l7 4 7-4M1 14l7 4 7-4",
  newspaper: "M2 3h10v10H2zM12 5h2v8h-2zM4 6h6M4 8h6M4 10h4",
  bars: "M2 4h12M2 8h12M2 12h12",
  language: "M2 3h12M8 3v10M5 6h6M4 9h6M3 12h4M9 12h4",
  lightbulb: "M8 1a5 5 0 0 0-3 9c1 1 1 2 1 3h4c0-1 0-2 1-3a5 5 0 0 0-3-9zM6 14h4",
  bullhorn: "M2 6h3l7-3v10l-7-3H2zM12 6v4M14 5v6",
  instagram: "M5 1h6a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V5a4 4 0 0 1 4-4zM8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 4h.01",
  youtube: "M2 4h12v8H2zM7 6l4 2-4 2z",
  linkedin: "M3 3h3v3H3zM3 8h3v6H3zM8 8h3v1c1-2 5-2 5 1v4h-3v-4c0-1-2-1-2 0v4H8z",
  whatsapp: "M2 14l1-4a6 6 0 1 1 4 3zM6 5c0 3 3 5 5 5M6 5l1 2 2-2",
  "book-open": "M8 4C6.5 2.5 4 2 1.5 2.5V12c2.5-.5 5 0 6.5 1.5 1.5-1.5 4-2 6.5-1.5V2.5C12 2 9.5 2.5 8 4zM8 4v9.5",
  video: "M2 4h8v8H2zM10 7l4-2v6l-4-2",
  "user-graduate": "M8 2 1 5.5 8 9l6-3v4.5h1V5.5zM4 9.5V12c0 1.2 1.8 2.5 4 2.5s4-1.3 4-2.5V9.5L8 11z",
  "chalkboard-user": "M2 3h12v7H2zM6.5 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM4.5 10c.4-1.2 1.2-1.7 2-1.7s1.6.5 2 1.7",
  "shield-halved": "M8 1 2.5 3v4c0 4 2.5 6.5 5.5 8 3-1.5 5.5-4 5.5-8V3zM8 1v14",
  eye: "M1.5 8S4 4 8 4s6.5 4 6.5 4-2.5 4-6.5 4-6.5-4-6.5-4zM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  "eye-slash": "M3 3l10 10M6.3 4.6C6.9 4.2 7.4 4 8 4c4 0 6.5 4 6.5 4-.4.7-1 1.5-1.9 2.2M9.6 11.4c-.5.4-1 .6-1.6.6-4 0-6.5-4-6.5-4 .4-.7 1-1.5 1.9-2.2",
  "arrow-left": "M7 3 2 8l5 5M2 8h12",
  "paper-plane": "M14 2 7 9M14 2l-4.5 12L7 9 2 6.5z",
  globe: "M8 1a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM1 8h14M8 1c2 2 3 4.5 3 7s-1 5-3 7c-2-2-3-4.5-3-7s1-5 3-7z",
  briefcase: "M2 5h12v9H2zM5.5 5V3.5A1.5 1.5 0 0 1 7 2h2a1.5 1.5 0 0 1 1.5 1.5V5M2 9h12",
  camera: "M2 5h3l1.5-2h3L11 5h3v9H2zM8 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  "quote-left": "M6 4C4 4.7 3 6.3 3 9v3h4V8H4.5C4.5 6.7 5 5.7 6 5zM13 4c-2 .7-3 2.3-3 5v3h4V8h-2.5c0-1.3.5-2.3 1.5-3z",
  headphones: "M2 10V8a6 6 0 0 1 12 0v2M2 10h2v4H2zM12 10h2v4h-2z",
  "file-medical": "M3 1h7l4 4v10H3zM10 1v4h4M8 7v5M5.5 9.5h5",
  "user-doctor": "M8 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 14c0-2.5 2.2-4 5-4s5 1.5 5 4M5.5 10.5V13M7 12h3",
  google: "M14 8.2c0 3.6-2.4 6.3-6 6.3a6.5 6.5 0 1 1 0-13c1.7 0 3.3.6 4.5 1.7l-1.8 1.8C9.9 4.3 9 4 8 4a4 4 0 1 0 3.7 5.5H8V7h6z",
  microsoft: "M2 2h5.5v5.5H2zM8.5 2H14v5.5H8.5zM2 8.5h5.5V14H2zM8.5 8.5H14V14H8.5z",
};

export function Icon({ name, size = 14, className }: IconProps) {
  const d = PATHS[name] ?? PATHS.check;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}
