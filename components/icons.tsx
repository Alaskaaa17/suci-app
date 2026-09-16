/**
 * The icon set, transcribed path-for-path from the design canvas.
 *
 * The brief is explicit: monochrome line icons only, no human figures. Every
 * glyph inherits `currentColor` and takes its stroke weight from the call
 * site, because the prototype varies weight to signal the active tab.
 */

export interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function Svg({
  size = 20,
  strokeWidth = 1.7,
  className,
  children,
  round = true,
}: IconProps & { children: React.ReactNode; round?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin={round ? "round" : undefined}
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** The app mark: crescent with a spark. */
export function CrescentIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 13.5A7.5 7.5 0 0 1 10.5 4a8 8 0 1 0 9.5 9.5z" />
      <path d="M17 3.2l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" />
    </Svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  );
}

/** Open book — used everywhere the app cites a source. */
export function BookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z" />
      <path d="M19 3v18" />
    </Svg>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l7 3v6c0 4.2-3 7.4-7 8.4-4-1-7-4.2-7-8.4V6z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

export function CheckIcon({ strokeWidth = 3, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest}>
      <path d="M5 13l4 4 10-10" />
    </Svg>
  );
}

export function CloseIcon({ strokeWidth = 2.2, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest}>
      <path d="M7 7l10 10M17 7L7 17" />
    </Svg>
  );
}

export function LockIcon({ strokeWidth = 1.6, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <rect x="4" y="10.5" width="16" height="10.5" rx="3" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </Svg>
  );
}

export function InfoIcon({ strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M12 8v5" />
      <path d="M12 16.5h.01" />
      <circle cx="12" cy="12" r="9" />
    </Svg>
  );
}

export function InfoDotIcon({ strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M12 11v5M12 8h.01" />
      <circle cx="12" cy="12" r="9" />
    </Svg>
  );
}

export function WarningIcon({ strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest}>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4M12 17h.01" />
    </Svg>
  );
}

export function ChevronRightIcon({ strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function ChevronLeftIcon({ strokeWidth = 1.9, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

export function ChevronDownIcon({ strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function HomeIcon({ strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest}>
      <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

export function PlusCircleIcon({ strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </Svg>
  );
}

export function PlusIcon({ strokeWidth = 2, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M12 7v10M7 12h10" />
    </Svg>
  );
}

export function MinusIcon({ strokeWidth = 2, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M5 12h14" />
    </Svg>
  );
}

export function CalendarIcon({ strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10.5h17" />
    </Svg>
  );
}

/** Mihrab arch — the worship tab. */
export function MihrabIcon({ strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M5 20V11a7 7 0 0 1 14 0v9" />
      <path d="M4 20h16" />
    </Svg>
  );
}

/** Water drop — ghusl and bleeding. */
export function DropIcon({ strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest}>
      <path d="M12 3.5s6 6.3 6 10.2a6 6 0 0 1-12 0C6 9.8 12 3.5 12 3.5z" />
    </Svg>
  );
}

/** Irregular waves — istihadhah. */
export function WavesIcon({ strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M3 11c3-3 6 3 9 0s6-3 9 0" />
      <path d="M3 16.5c3-3 6 3 9 0s6-3 9 0" />
    </Svg>
  );
}

export function ClockIcon({ strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function TargetIcon({ strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

/** Leaf — substitute deeds. */
export function LeafIcon({ strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest}>
      <path d="M4 20c8 2 16-4 16-16-8 0-16 4-16 12" />
      <path d="M6 18c3-4 6-6 10-7" />
    </Svg>
  );
}

/** Scales — the ikhtilaf comparison. */
export function ScalesIcon({ strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest}>
      <path d="M12 5v15" />
      <path d="M4 8l8-3 8 3" />
      <path d="M4 8v4a4 4 0 0 0 8 0 4 4 0 0 0 8 0V8" />
    </Svg>
  );
}

export function SearchIcon({ strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </Svg>
  );
}

export function HelpIcon({ strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.8 9.6a2.3 2.3 0 1 1 3.4 2.2v1.4" />
      <path d="M12 16.6h.01" />
    </Svg>
  );
}

export function PinIcon({ strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  );
}

export function DownloadIcon({ strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M12 4v11M8 11l4 4 4-4M5 20h14" />
    </Svg>
  );
}

export function TrashIcon({ strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M4 7h16M9.5 7V5h5v2M6.5 7l1 13h9l1-13" />
    </Svg>
  );
}

export function LinkIcon({ strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M9.5 14.5l5-5" />
      <path d="M10.5 7.5l1.5-1.5a4.2 4.2 0 0 1 6 6L16.5 13.5" />
      <path d="M13.5 16.5L12 18a4.2 4.2 0 0 1-6-6l1.5-1.5" />
    </Svg>
  );
}

export function CloudIcon({ strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest}>
      <path d="M6.5 18.5a4 4 0 0 1 .7-7.9A5.5 5.5 0 0 1 18 11a3.7 3.7 0 0 1 0 7.5z" />
    </Svg>
  );
}

export function BackspaceIcon({ strokeWidth = 1.6, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M9 5h11v14H9L3 12z" />
      <path d="M13 9.5l5 5M18 9.5l-5 5" />
    </Svg>
  );
}

export function SlidersIcon({ strokeWidth = 1.6, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <path d="M6 4v16M12 4v16M18 4v16" />
      <circle cx="6" cy="9" r="2.2" fill="var(--bg)" />
      <circle cx="12" cy="15" r="2.2" fill="var(--bg)" />
      <circle cx="18" cy="8" r="2.2" fill="var(--bg)" />
    </Svg>
  );
}

export function SunIcon({ strokeWidth = 2, ...rest }: IconProps) {
  return (
    <Svg strokeWidth={strokeWidth} {...rest} round={false}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </Svg>
  );
}
