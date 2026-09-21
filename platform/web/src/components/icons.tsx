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

export function GradCapIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M8 1 .3 4.7 8 8.4l5.7-2.4V11h1.3V4.7L8 1zM2.7 7.6V11c0 1.8 2.4 3.2 5.3 3.2s5.3-1.4 5.3-3.2V7.6L8 10.1 2.7 7.6z",
  );
}

export function ShieldIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M8 0 1 2.8v4.7C1 12 3.9 15.1 8 16c4.1-.9 7-4 7-8.5V2.8L8 0zm0 2.3v11.3c-2.8-.9-4.8-3.3-4.8-6.4V4.5L8 2.3z",
  );
}

export function UserPlusIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M5.5 7a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM0 14.6C0 11.6 2.5 9.4 5.5 9.4s5.5 2.2 5.5 5.2c0 .2-.2.4-.4.4H.4c-.2 0-.4-.2-.4-.4zM13 4h1.6v2H17v1.6h-2.4V10H13V7.6h-2.4V6H13V4z",
  );
}

export function ChartLineIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M1 1h1.6V13H15v1.6H1V1zm3.4 9.9 2.8-3.7 2.2 2.1L13.6 5l1.1 1.1-5.3 5.4-2.2-2.1-1.8 2.4-1-1z",
  );
}

export function QuoteLeftIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M3.5 3C1.9 4.6 1 6.3 1 8.7V13h4.8V8.3H3.6c0-1.5.7-2.6 2-3.4L3.5 3zm7.2 0C9.1 4.6 8.2 6.3 8.2 8.7V13H13V8.3h-2.2c0-1.5.7-2.6 2-3.4L10.7 3z",
  );
}

export function ServerIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M2 1h12a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm1 1.5A1.25 1.25 0 1 0 3 5a1.25 1.25 0 0 0 0-2.5zM2 9h12a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zm1 1.5A1.25 1.25 0 1 0 3 13a1.25 1.25 0 0 0 0-2.5z",
  );
}

/* ── Admin shell + dashboard icons ── */

export function SearchIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M11.7 10.4c.8-1 1.3-2.4 1.3-3.9A6.5 6.5 0 1 0 10.4 11.7l4 4a1 1 0 0 0 1.4-1.4l-4.1-3.9zM6.5 11a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z",
  );
}

export function BellIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M8 1a1.8 1.8 0 0 0-1.8 1.8v.4C4.3 3.8 3 5.6 3 7.6V11l-1.6 2h13.2L13 11V7.6c0-2-1.3-3.8-3.2-4.4v-.4A1.8 1.8 0 0 0 8 1zm0 14a2 2 0 0 1-1.9-1.3h3.8A2 2 0 0 1 8 15z",
  );
}

export function MenuIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M1.5 3h13v2h-13V3zm0 4.5h13v2h-13v-2zm0 4.5h13v2h-13v-2z",
  );
}

export function SignOutIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h6v-2H4V3h5V1zm5.6 6.2-3.5-3.6-1.1 1.1 1.8 1.8H6v1.6h5.8l-1.8 1.7 1.1 1.1 3.5-3.7z",
  );
}

export function GaugeIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M8 2.5A6.5 6.5 0 0 0 1.5 10c.2 1.3.7 2.4 1.4 3.4h10.2c.7-1 1.2-2.1 1.4-3.4A6.5 6.5 0 0 0 8 2.5zm2.8 3.5-2.3 3.5a1.4 1.4 0 1 1-1.1-.9l3.4-2.6z",
  );
}

export function BookOpenIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M8 3.4C6.7 2.3 4.9 1.9 3 1.9H1v10.7h2.5c1.4 0 3 .3 4.5 1.3 1.5-1 3.1-1.3 4.5-1.3H15V1.9h-2c-1.9 0-3.7.4-5 1.5zm-1 8.5a7.9 7.9 0 0 0-4-1V3.4c1.4.1 2.7.5 4 1.4v7.1zm2 0V4.8c1.3-.9 2.6-1.3 4-1.4v7.5a7.9 7.9 0 0 0-4 1z",
  );
}

export function UsersIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M5 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm6.5-.3c1.2-.2 2-1.3 2-2.7s-.9-2.5-2.2-2.6c.4.7.6 1.5.6 2.5 0 1.1-.1 1.9-.4 2.8zM1 14.6C1 11.6 2.9 9.5 5.5 9.5s4.5 2.1 4.5 5.1H1zm10.9-.4h3.1c0-2.4-1.5-4.1-3.5-4.6.3.6.4 1.3.4 2 0 1-.2 1.8 0 2.6z",
  );
}

export function EnvelopeIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v.4L8 8.4 0 4.4V4zm0 2.3V12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6.3L8.4 10a.8.8 0 0 1-.8 0L0 6.3z",
  );
}

export function BriefcaseIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M6 1a1 1 0 0 0-1 1v2H2a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3V2a1 1 0 0 0-1-1H6zm0 1.5h4V4H6V2.5zM1.5 9.5V13a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5V9.5h-5V11h-3V9.5h-5z",
  );
}

export function LayoutIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M1 2h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm.5 2v8.5h4V4h-4zm5.5 0v8.5h7.5V4H7z",
  );
}

export function GearIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M8 5.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4zm6.6 4.1.9-.8c.1-.1.2-.3.1-.5l-1-1.8c-.1-.2-.3-.2-.5-.2l-1.1.4a5 5 0 0 0-1-.5l-.3-1.2a.5.5 0 0 0-.5-.4h-2a.5.5 0 0 0-.5.4l-.3 1.2a5 5 0 0 0-1 .5l-1-.4c-.2-.1-.4 0-.5.2l-1 1.8c-.1.2 0 .4.1.5l.9.8a3 3 0 0 0 0 1.2l-.9.8c-.1.1-.2.3-.1.5l1 1.8c.1.2.3.2.5.2l1.1-.4c.3.2.6.4 1 .5l.3 1.2c0 .2.2.4.5.4h2c.3 0 .4-.2.5-.4l.3-1.2a5 5 0 0 0 1-.5l1 .4c.2.1.4 0 .5-.2l1-1.8c.1-.2 0-.4-.1-.5l-.9-.8a3 3 0 0 0 0-1.2z",
  );
}

export function ClockIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2a1 1 0 0 1 1 1v3.6l2.5 1.5a1 1 0 0 1-1 1.7L7.4 9a1 1 0 0 1-.4-.8V4a1 1 0 0 1 1-1z",
  );
}

export function InboxIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M2.6 3 1 8.5V13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5L13.4 3a1 1 0 0 0-.9-.6H3.5a1 1 0 0 0-.9.6zM3.9 4h8.2l1.2 4.5H9.8a2 2 0 0 1-3.6 0H2.7L3.9 4z",
  );
}

export function PlusIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M7 1h2v6h6v2H9v6H7V9H1V7h6V1z",
  );
}

export function PenIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M11.8 1.2a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4l-1.7 1.7-3-3 1.7-1.7zM8.7 4.3l3 3L5 14H2v-3l6.7-6.7z",
  );
}

export function FileIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M3 1h7l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm6.5 1.5V6h3.4L9.5 2.5zM5 8h6v1.5H5V8zm0 3h6v1.5H5V11z",
  );
}

export function UserIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M8 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 8zm-6 6.4C2 11.4 4.7 9.5 8 9.5s6 1.9 6 4.9c0 .4-.3.6-.6.6H2.6c-.3 0-.6-.2-.6-.6z",
  );
}

export function TaskListIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M5 1h6a1 1 0 0 1 1 1h1.5A1.5 1.5 0 0 1 15 3.5V14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 14V3.5A1.5 1.5 0 0 1 2.5 2H4a1 1 0 0 1 1-1zm0 2.4V4h6v-.6H5zM4.5 7l1 1 2-2 .7.7-2.7 2.8-1.8-1.8.8-.7zm0 4 1 1 2-2 .7.7-2.7 2.8-1.8-1.8.8-.7z",
  );
}

export function CalendarCheckIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M4 1a1 1 0 0 1 1 1v1h6V2a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1V2a1 1 0 0 1 1-1zM2.5 6.5V14h11V6.5h-11zm8.6 1.8-3.4 4-1.8-1.8.9-.9.9.9 2.5-3 .9.8z",
  );
}

export function BanknoteIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M1.5 3A1.5 1.5 0 0 0 0 4.5v8A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 14.5 3h-13zM8 6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm10 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z",
  );
}

export function WhatsAppIcon(props: IconProps) {
  return svg(
    props.size,
    props.className,
    "M8 .8a7.2 7.2 0 0 0-6.2 10.8L.7 15.2l3.7-1A7.2 7.2 0 1 0 8 .8zm0 1.5a5.7 5.7 0 1 1-2.9 10.6l-.4-.2-2.2.6.6-2.1-.2-.4A5.7 5.7 0 0 1 8 2.3zM5.7 5.1c-.2 0-.4 0-.6.3-.2.3-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 3.9 3.4 1.9.7 2.3.6 2.7.5.4 0 1.3-.5 1.5-1 .2-.6.2-1 .1-1.1-.1-.1-.2-.2-.5-.3l-1.5-.7c-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a7 7 0 0 1-2-1.2 7.6 7.6 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.5c.1-.1.1-.3.2-.4.1-.2 0-.3 0-.5l-.6-1.4c-.1-.3-.3-.4-.5-.4h-.6z",
  );
}
