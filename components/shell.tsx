"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { THEME_KEY } from "@/lib/store/vault";
import {
  BookIcon,
  CalendarIcon,
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

/* ---------------------------- status bar -------------------------------- */

/**
 * The mock status bar from the design. On a real phone the OS draws this, so
 * it only appears in the desktop frame — and it shows the actual time rather
 * than the mockup's frozen 9:41.
 */
function StatusBar() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between px-6 pt-[15px] pb-1 text-[13px]/[1] font-semibold text-tx">
      {/* Rendered empty until mounted so SSR and client agree. */}
      <span>{now ?? ""}</span>
      <span aria-hidden="true" className="flex items-center gap-[5px] opacity-75">
        <span className="block h-2 w-[15px] rounded-[2px] border-[1.2px] border-current" />
        <span className="block h-2.5 w-[22px] rounded-[3px] border-[1.2px] border-current" />
      </span>
    </div>
  );
}

/* ---------------------------- tab bar ----------------------------------- */

const TABS = [
  { href: "/", label: "Beranda", Icon: HomeIcon },
  { href: "/catat", label: "Catat", Icon: PlusCircleIcon },
  { href: "/kalender", label: "Kalender", Icon: CalendarIcon },
  { href: "/ibadah", label: "Ibadah", Icon: MihrabIcon },
  { href: "/edukasi", label: "Edukasi", Icon: BookIcon },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="flex shrink-0 border-t border-hair bg-bg px-1.5 pt-[9px] pb-[max(22px,env(safe-area-inset-bottom))]"
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

/* ---------------------------- screen ------------------------------------ */

/**
 * One screen inside the phone. Everything between the status bar and the tab
 * bar scrolls; the design's fixed 844px frames are a canvas artefact, so real
 * content is allowed to be taller than the viewport.
 */
export function Screen({
  children,
  tabBar = true,
  tone = "warm",
  className,
  animate = true,
}: {
  children?: ReactNode;
  tabBar?: boolean;
  tone?: "warm" | "stone";
  className?: string;
  /** Off for screens that manage their own entrance. */
  animate?: boolean;
}) {
  const pathname = usePathname();
  return (
    <div
      className={cx(
        "flex h-full min-h-0 flex-col",
        tone === "stone" ? "bg-stone-bg" : "bg-bg",
      )}
    >
      <StatusBar />
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
 * The device shell. Full-bleed on a phone; on a wide screen it becomes the
 * 390×844 frame from the canvas, sitting on the canvas colour, so the app
 * still reads as the design when someone opens it on a laptop.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] justify-center bg-bg md:items-center md:bg-canvas md:py-10">
      <div
        className={cx(
          "flex w-full flex-col bg-bg",
          "h-[100dvh] md:h-[844px] md:max-h-[calc(100dvh-80px)] md:w-[390px]",
          "md:overflow-hidden md:rounded-[30px] md:border md:border-frame-edge md:shadow-frame",
        )}
      >
        {children}
      </div>
    </div>
  );
}
