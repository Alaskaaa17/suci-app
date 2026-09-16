"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Motion helpers.
 *
 * Each of these checks `prefers-reduced-motion` itself and jumps straight to
 * the final value when it is set — CSS alone cannot stop a JavaScript-driven
 * count, so the check has to live here too.
 */

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return reduced;
}

/**
 * Counts up to `value` on mount and whenever it changes.
 *
 * Used for the day-of-cycle number and gestational weeks. A number that lands
 * rather than appearing makes the screen feel like it computed something,
 * which is exactly what it did.
 */
export function useCountUp(value: number, durationMs = 650): number {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced || durationMs <= 0) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) return;

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // Ease-out cubic: quick at first, settling rather than stopping dead.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + delta * eased));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      fromRef.current = value;
    };
  }, [value, durationMs, reduced]);

  return display;
}

/**
 * True once the component has mounted. Lets a value animate in from a
 * starting state without the server-rendered markup disagreeing with the
 * first client paint.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // A frame's delay, so the browser paints the "from" state before the
    // transition to the "to" state begins. Without it there is nothing to
    // animate from.
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}
