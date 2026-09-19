/**
 * Inline SVG icons — Font Awesome-flavoured shapes so the ported design
 * doesn't need the whole FA CDN bundle.
 */
interface IconProps {
  size?: number;
  className?: string;
}

function svg(
  size: number | undefined,
  className: string | undefined,
  path: string,
  viewBox = "0 0 16 16",
) {
  return (
    <svg
      width={size ?? 14}
      height={size ?? 14}
      viewBox={viewBox}
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M8 3C4.5 3 1.7 5.1.4 8c1.3 2.9 4.1 5 7.6 5s6.3-2.1 7.6-5C14.3 5.1 11.5 3 8 3zm0 8.3A3.3 3.3 0 1 1 8 4.7a3.3 3.3 0 0 1 0 6.6zM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  );
}

export function EyeOffIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M2.3 1.1 1.1 2.3l2.4 2.4C2 5.9.9 7.2.4 8c1.3 2.9 4.1 5 7.6 5 1.4 0 2.7-.3 3.8-.9l1.9 1.9 1.2-1.2L2.3 1.1zM8 11.3A3.3 3.3 0 0 1 4.7 8c0-.5.1-1 .3-1.4l1.5 1.5a2 2 0 0 0 2.8 2.8l.4.4c-.6.3-1.1.5-1.7.5zM8 3c-.7 0-1.4.1-2 .3l1.6 1.6A3.3 3.3 0 0 1 11 8.3l2.3 2.3c1.2-.8 2.1-1.8 2.7-2.6C14.3 5.1 11.5 3 8 3z",
  );
}

export function CheckIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M6.2 11.2 2.9 7.9l1.1-1.1 2.2 2.2 5.8-5.8 1.1 1.1z",
  );
}

export function XIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M4.1 3 3 4.1 6.9 8 3 11.9 4.1 13 8 9.1 11.9 13 13 11.9 9.1 8 13 4.1 11.9 3 8 6.9z",
  );
}

export function ArrowRightIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M8.9 2.6 7.8 3.7 10.3 6.2H2v1.6h8.3l-2.5 2.5 1.1 1.1L13.2 7.2z",
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M7.1 13.4l1.1-1.1-2.5-2.5H14V6.2H5.7l2.5-2.5-1.1-1.1L2.8 6.9z",
  );
}

export function LockIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M8 1a3 3 0 0 0-3 3v2H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1V4a3 3 0 0 0-3-3zm0 2c.6 0 1 .4 1 1v2H7V4c0-.6.4-1 1-1z",
  );
}

export function SignInIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M7 1h7a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7v-2h6V3H7V1zM6.4 4.6 5.3 5.7l1.8 1.8H0v1.6h7.1l-1.8 1.8 1.1 1.1 3.5-3.7z",
  );
}

export function ExternalIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M9 1h6v6h-2V4.4L7.4 9 6 7.6 11.6 2H9V1zM3 3h4v2H5v8h8V9h2v6H3V3z",
  );
}

export function InfoIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 6.5c.6 0 1 .4 1 1V12a1 1 0 0 1-2 0V8.5c0-.6.4-1 1-1zM8 4a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 8 4z",
  );
}

export function ChevronIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M4.3 6.1 8 9.8l3.7-3.7 1.1 1.1L8 12 3.2 7.2z",
  );
}

export function ServerIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M2 1h12a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm1 1.5A1.25 1.25 0 1 0 3 5a1.25 1.25 0 0 0 0-2.5zM2 9h12a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zm1 1.5A1.25 1.25 0 1 0 3 13a1.25 1.25 0 0 0 0-2.5z",
  );
}
