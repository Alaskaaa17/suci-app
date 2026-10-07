"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { THEME_KEY } from "@/lib/store/vault";
import {
  BookIcon,
  CalendarIcon,
  CrescentIcon,
  HomeIcon,
  MihrabIcon,
  MoonIcon,
  PlusCircleIcon,
  SunIcon,
} from "./icons";
import { cx } from "./ui";

/* ---------------------------- theme ------------------------------------- */

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice just will not persist.
    }
  };

  return { theme, toggle };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === "dark" ? "Beralih ke mode terang" : "Beralih ke mode gelap"
      }
      className={cx(
        "flex h-[42px] w-[42px] items-center justify-center rounded-full border border-hair text-tx2 transition hover:border-rose-b hover:text-tx",
        className,
      )}
    >
      {theme === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </button>
  );
}

/* ---------------------------- navigation --------------------------------- */

const TABS = [
  { href: "/", label: "Beranda", Icon: HomeIcon },
  { href: "/catat", label: "Catat", Icon: PlusCircleIcon },
  { href: "/kalender", label: "Kalender", Icon: CalendarIcon },
  { href: "/ibadah", label: "Ibadah", Icon: MihrabIcon },
  { href: "/edukasi", label: "Edukasi", Icon: BookIcon },
] as const;

/** Bottom nav on a phone or a tablet. Yields to `SidebarNav` at `lg`. */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="flex shrink-0 border-t border-hair bg-bg px-1.5 pt-[9px] pb-[max(22px,env(safe-area-inset-bottom))] lg:hidden"
    >
      {TABS.map(({ href, label, Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex flex-1 flex-col items-center gap-[5px] py-1 transition duration-200 active:scale-95",
              active ? "text-tx" : "text-tx2 opacity-50 hover:opacity-80",
            )}
          >
            <Icon
              size={21}
              strokeWidth={active ? 2 : 1.7}
              className={cx(
                "transition-transform duration-200",
                active ? "-translate-y-px scale-110" : "scale-100",
              )}
            />
            <span
              className={cx(
                "text-[10.5px]/[1]",
                active ? "font-bold" : "font-medium",
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The desktop counterpart to `TabBar` — a persistent left rail once there's
 * room for one. Shares `TABS` with it so the two can never drift apart.
 * Rendered only when `PhoneFrame` is given `nav`, so it never appears on a
 * screen with nothing to navigate to yet (locked, booting, onboarding).
 */
function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="hidden shrink-0 flex-col gap-1 border-r border-hair bg-bg px-4 py-6 lg:flex lg:w-[240px]"
    >
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-b bg-rose text-icon">
          <CrescentIcon size={18} strokeWidth={1.6} />
        </div>
        <span className="t-title text-tx">Suci</span>
      </div>
      {TABS.map(({ href, label, Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition",
              active
                ? "bg-rose text-tx"
                : "text-tx2 hover:bg-stone-bg hover:text-tx",
            )}
          >
            <Icon size={19} strokeWidth={active ? 2 : 1.7} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/* ---------------------------- screen ------------------------------------ */

/**
 * One screen inside the shell. The content column scrolls on its own
 * between the sidebar/tab-bar chrome; the design's fixed 844px frames are a
 * canvas artefact, so real content is allowed to be taller than the
 * viewport. Capped and centered from `md` up so text and controls don't
 * stretch edge to edge once there's real width to work with — `wide` opts a
 * screen into more of that width for a bespoke desktop layout (Beranda,
 * Kalender) instead of the standard reading-width column.
 */
export function Screen({
  children,
  tabBar = true,
  tone = "warm",
  className,
  animate = true,
  wide = false,
}: {
  children?: ReactNode;
  tabBar?: boolean;
  tone?: "warm" | "stone";
  className?: string;
  /** Off for screens that manage their own entrance. */
  animate?: boolean;
  /** Flagship screens that earn more of the desktop width than the default cap. */
  wide?: boolean;
}) {
  const pathname = usePathname();
  return (
    <div
      className={cx(
        "flex h-full min-h-0 flex-col",
        tone === "stone" ? "bg-stone-bg" : "bg-bg",
      )}
    >
      <div
        // Keyed on the route so the entrance replays on each navigation —
        // that is what makes a drill-in feel like moving forward rather than
        // the content silently swapping underneath.
        key={pathname}
        className={cx(
          "scroll-area flex min-h-0 flex-1 flex-col gap-3.5 px-5 pb-5",
          // Without this, children shrink below their content height inside
          // the fixed-height frame and their contents overlap.
          "[&>*]:shrink-0",
          "md:mx-auto md:w-full md:max-w-[600px]",
          wide ? "lg:max-w-[1040px]" : "lg:max-w-[680px]",
          "lg:pt-8",
          animate && "animate-fade",
          className,
        )}
      >
        {children}
      </div>
      {tabBar && <TabBar />}
    </div>
  );
}

/**
 * The app shell. Full-bleed on a phone; from `md` up the content inside
 * gets a comfortable capped width (see `Screen`); from `lg` up a persistent
 * sidebar takes over navigation from the bottom tab bar. `nav` gates the
 * sidebar — pass it only once there is an authenticated app to navigate.
 */
export function PhoneFrame({
  children,
  nav = false,
}: {
  children: ReactNode;
  nav?: boolean;
}) {
  return (
    <div className="flex h-[100dvh] bg-bg">
      {nav && <SidebarNav />}
      <div className="flex h-full min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
