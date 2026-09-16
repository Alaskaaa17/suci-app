"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./icons";

/* =========================================================================
   Tone — the design's two colour layers, as one vocabulary.

   `rose` / `sage` / `peach` are the warm app layer. `stone` is the neutral
   layer reserved for fiqh source material: citations, the comparison table,
   the reasoning trail. Mixing them is what the brief is guarding against, so
   the tone is a named prop rather than loose class strings.
   ========================================================================= */

export type Tone = "plain" | "rose" | "sage" | "peach" | "stone";

const TONE_SURFACE: Record<Tone, string> = {
  plain: "bg-transparent border-hair",
  rose: "bg-rose border-rose-b",
  sage: "bg-sage border-sage-b",
  peach: "bg-peach border-peach-b",
  stone: "bg-stone-card border-stone-b",
};

const TONE_TEXT: Record<Tone, string> = {
  plain: "text-tx",
  rose: "text-tx",
  sage: "text-sage-tx",
  peach: "text-peach-tx",
  stone: "text-stone-tx",
};

const TONE_ICON_BG: Record<Tone, string> = {
  plain: "bg-rose text-icon",
  rose: "bg-rose text-icon",
  sage: "bg-sage text-sage-tx",
  peach: "bg-peach text-peach-tx",
  stone: "bg-stone-bg text-stone-tx",
};

export function toneText(tone: Tone) {
  return TONE_TEXT[tone];
}

/* ========================================================================= */

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  tone = "plain",
  elevated,
  className,
  children,
  as: As = "div",
}: {
  tone?: Tone;
  elevated?: boolean;
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "article";
}) {
  return (
    <As
      className={cx(
        "rounded-[20px] border p-4",
        TONE_SURFACE[tone],
        elevated && "shadow-card",
        className,
      )}
    >
      {children}
    </As>
  );
}

/** The circular icon chip that leads most rows in the design. */
export function IconBubble({
  tone = "rose",
  size = 32,
  children,
  className,
}: {
  tone?: Tone;
  size?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "flex shrink-0 items-center justify-center rounded-full",
        TONE_ICON_BG[tone],
        className,
      )}
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  );
}

/* ---------------------------- buttons ----------------------------------- */

type ButtonBase = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
};

/** The filled gradient CTA. One per screen, as the brief asks. */
export function PrimaryButton({
  children,
  className,
  disabled,
  type = "button",
  onClick,
}: ButtonBase) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        PRIMARY_CLASS,
        disabled && "cursor-not-allowed opacity-50 shadow-none",
        className,
      )}
      style={PRIMARY_STYLE}
    >
      {children}
    </button>
  );
}

const PRIMARY_CLASS =
  "flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full border-none text-[16px] font-semibold text-onsolid transition shadow-cta hover:brightness-[1.06] active:translate-y-px";

const PRIMARY_STYLE = {
  background: "linear-gradient(180deg, var(--solid), var(--solid2))",
};

/** The same CTA as a navigation link. A button inside an anchor is invalid. */
export function PrimaryLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(PRIMARY_CLASS, className)}
      style={PRIMARY_STYLE}
    >
      {children}
    </Link>
  );
}

export function SecondaryButton({
  children,
  className,
  disabled,
  type = "button",
  onClick,
  tone = "rose",
}: ButtonBase & { tone?: "rose" | "peach" | "plain" }) {
  const border =
    tone === "peach"
      ? "border-peach-b text-peach-tx hover:bg-peach"
      : tone === "plain"
        ? "border-hair text-tx2 hover:border-rose-b hover:text-tx"
        : "border-rose-b text-tx hover:bg-rose";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full border bg-transparent text-[15px] font-semibold transition",
        border,
        disabled && "cursor-not-allowed opacity-55",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------- list rows --------------------------------- */

export function NavRow({
  href,
  icon,
  tone = "rose",
  title,
  subtitle,
  onClick,
}: {
  href?: string;
  icon: ReactNode;
  tone?: Tone;
  title: string;
  subtitle?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <IconBubble tone={tone}>{icon}</IconBubble>
      <span className="flex-1 text-left">
        <span className="block text-[14.5px]/[1.3] font-semibold text-tx">
          {title}
        </span>
        {subtitle && (
          <span className="block text-[12.5px]/[1.4] text-tx2">{subtitle}</span>
        )}
      </span>
      <ChevronRightIcon size={17} className="shrink-0 text-tx2" />
    </>
  );

  const cls =
    "flex w-full items-center gap-3 rounded-2xl border border-hair px-[15px] py-[13px] transition hover:border-rose-b hover:bg-rose";

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/* ---------------------------- controls ---------------------------------- */

export function CheckRow({
  checked,
  onChange,
  title,
  description,
  tone = "plain",
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  description?: string;
  tone?: Tone;
  children?: ReactNode;
}) {
  return (
    <label
      className={cx(
        "flex cursor-pointer items-start gap-3 rounded-2xl border px-[15px] py-3.5 transition",
        tone === "plain"
          ? "border-hair hover:border-rose-b"
          : TONE_SURFACE[tone],
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <CheckBox checked={checked} tone={tone} />
      <span className="flex-1">
        <span className="block text-[14.5px]/[1.3] font-semibold text-tx">
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-[12.5px]/[1.5] text-tx2">
            {description}
          </span>
        )}
        {children}
      </span>
    </label>
  );
}

export function CheckBox({
  checked,
  tone = "plain",
}: {
  checked: boolean;
  tone?: Tone;
}) {
  const ring = tone === "sage" ? "border-sage-b" : "border-rose-b";
  return (
    <span
      aria-hidden="true"
      className={cx(
        "mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition",
        checked ? "border-solid bg-solid text-onsolid" : cx(ring, "bg-bg"),
      )}
    >
      <CheckIcon size={13} className={checked ? "opacity-100" : "opacity-0"} />
    </span>
  );
}

export function Chip({
  active,
  onClick,
  children,
  size = "md",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "rounded-full border font-medium transition",
        size === "sm"
          ? "px-[13px] py-[7px] text-xs"
          : "px-3.5 py-[9px] text-[13px]",
        active
          ? "border-rose-b bg-rose text-tx"
          : "border-hair text-tx2 hover:border-rose-b",
      )}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  tone = "rose",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  tone?: "rose" | "sage";
}) {
  const on = tone === "sage" ? "bg-sage-tx" : "bg-solid";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "flex h-[30px] w-[52px] shrink-0 items-center rounded-full px-[3px] transition",
        checked ? cx(on, "justify-end") : "justify-start bg-hair",
      )}
    >
      <span className="block h-6 w-6 rounded-full bg-white shadow-sm" />
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: ReactNode }>;
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1.5 rounded-full border border-hair p-[5px]"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cx(
              "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[12.5px] transition",
              active
                ? "border border-rose-b bg-rose font-semibold text-tx"
                : "font-medium text-tx2 hover:bg-rose",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function RadioCard({
  selected,
  onSelect,
  title,
  description,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        "flex w-full items-start gap-3 rounded-[18px] border px-4 py-[15px] text-left transition",
        selected
          ? "border-[1.5px] border-rose-b bg-rose shadow-card"
          : "border-hair hover:border-rose-b",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px]",
          selected ? "border-icon" : "border-hair",
        )}
      >
        {selected && (
          <span className="block h-[11px] w-[11px] rounded-full bg-icon" />
        )}
      </span>
      <span className="flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[16.5px]/[1.3] font-semibold text-tx">
            {title}
          </span>
          {badge && (
            <span className="rounded-full border border-rose-b px-2 py-1 text-[10px] font-medium tracking-[.08em] text-tx2 uppercase">
              {badge}
            </span>
          )}
        </span>
        {description && (
          <span className="mt-1 block text-[13px]/[1.55] text-tx2">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

/* ---------------------------- accordion --------------------------------- */

const AccordionCtx = createContext<{ open: boolean; toggle: () => void } | null>(
  null,
);

export function Accordion({
  defaultOpen = false,
  tone = "plain",
  children,
  className,
}: {
  defaultOpen?: boolean;
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <AccordionCtx.Provider
      value={{ open, toggle: () => setOpen((o) => !o) }}
    >
      <div
        className={cx(
          "overflow-hidden rounded-[18px] border",
          TONE_SURFACE[tone],
          className,
        )}
      >
        {children}
      </div>
    </AccordionCtx.Provider>
  );
}

export function AccordionTrigger({
  children,
  chevronClass = "text-tx2",
}: {
  children: ReactNode;
  chevronClass?: string;
}) {
  const ctx = useContext(AccordionCtx);
  const id = useId();
  if (!ctx) throw new Error("AccordionTrigger must be inside <Accordion>");
  return (
    <button
      type="button"
      onClick={ctx.toggle}
      aria-expanded={ctx.open}
      aria-controls={id}
      className="flex w-full items-center gap-[11px] px-4 py-3.5 text-left"
    >
      {children}
      <ChevronDownIcon
        size={17}
        className={cx(
          "shrink-0 transition-transform duration-200",
          chevronClass,
          ctx.open && "rotate-180",
        )}
      />
    </button>
  );
}

export function AccordionBody({ children }: { children: ReactNode }) {
  const ctx = useContext(AccordionCtx);
  if (!ctx) throw new Error("AccordionBody must be inside <Accordion>");
  if (!ctx.open) return null;
  return <div className="flex flex-col gap-2.5 px-4 pb-4">{children}</div>;
}

/* ---------------------------- citations --------------------------------- */

/**
 * A source reference. Always rendered on the neutral stone layer, never the
 * warm one — the brief calls this out explicitly: "sengaja kredibel, tidak
 * manis".
 */
export function CitationCard({
  work,
  locus,
  note,
}: {
  work: string;
  locus?: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl bg-stone-bg px-[13px] py-[11px]">
      <div className="text-[12.5px]/[1.4] font-semibold text-stone-tx">
        {work}
        {locus ? `, ${locus}` : ""}
      </div>
      {note && (
        <div className="mt-0.5 text-[12px]/[1.5] text-stone-tx2">{note}</div>
      )}
    </div>
  );
}

/* ---------------------------- misc -------------------------------------- */

export function ProgressBar({
  value,
  max,
  tone = "rose",
  label,
}: {
  value: number;
  max: number;
  tone?: "rose" | "sage";
  label: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cx(
        "flex h-2.5 overflow-hidden rounded-full",
        tone === "sage" ? "bg-bg" : "bg-rose",
      )}
    >
      <span
        className={cx("block", tone === "sage" ? "bg-sage-tx" : "bg-icon")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="t-label text-tx2">{children}</div>
  );
}

export function ScreenTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h1 className="t-headline m-0 text-tx">{title}</h1>
      {subtitle && (
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">{subtitle}</p>
      )}
    </div>
  );
}

export function BackLink({
  href,
  label,
  tone = "warm",
}: {
  href: string;
  label: string;
  tone?: "warm" | "stone";
}) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center gap-1.5 text-sm font-semibold transition",
        tone === "stone"
          ? "text-stone-tx2 hover:text-stone-tx"
          : "text-tx2 hover:text-tx",
      )}
    >
      <ChevronLeftIcon size={18} />
      {label}
    </Link>
  );
}

/** Amber advisory. Used wherever the app defers to a human. */
export function Advisory({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start gap-[11px] rounded-2xl border border-peach-b bg-peach px-[15px] py-3.5">
      <IconBubble tone="peach" size={30} className="bg-bg text-peach-tx">
        {icon}
      </IconBubble>
      <span className="text-[12.5px]/[1.55] text-peach-tx">{children}</span>
    </div>
  );
}

export function Pill({
  tone = "rose",
  glyph,
  children,
}: {
  tone?: "rose" | "sage" | "peach";
  glyph?: ReactNode;
  children: ReactNode;
}) {
  const border =
    tone === "sage"
      ? "border-sage-b text-sage-tx"
      : tone === "peach"
        ? "border-peach-b text-peach-tx"
        : "border-rose-b text-tx";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-[7px] rounded-full border bg-bg px-3 py-[5px] text-[11px] font-semibold tracking-[.1em] uppercase",
        border,
      )}
    >
      {glyph}
      {children}
    </span>
  );
}
