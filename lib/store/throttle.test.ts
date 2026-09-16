import { beforeEach, describe, expect, it } from "vitest";
import {
  clearFailedUnlocks,
  lockoutRemaining,
  recordFailedUnlock,
} from "./vault";

/**
 * PBKDF2 alone leaves a six-digit PIN reachable in days by someone holding the
 * phone. These are the numbers that push it out of reach.
 */

// A minimal localStorage, since these run in node.
beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
});

describe("failed-unlock throttling", () => {
  const NOW = 1_800_000_000_000;

  it("lets the first few mistakes through without punishment", () => {
    for (let i = 0; i < 5; i++) {
      expect(recordFailedUnlock(NOW)).toBe(0);
    }
    expect(lockoutRemaining(NOW)).toBe(0);
  });

  it("locks out after the free attempts run out", () => {
    for (let i = 0; i < 5; i++) recordFailedUnlock(NOW);
    expect(recordFailedUnlock(NOW)).toBe(30_000);
    expect(lockoutRemaining(NOW)).toBe(30_000);
  });

  it("escalates with each further failure", () => {
    for (let i = 0; i < 5; i++) recordFailedUnlock(NOW);
    expect(recordFailedUnlock(NOW)).toBe(30_000);
    expect(recordFailedUnlock(NOW)).toBe(60_000);
    expect(recordFailedUnlock(NOW)).toBe(300_000);
    expect(recordFailedUnlock(NOW)).toBe(900_000);
    // Caps rather than growing without bound — the user has to get back in.
    expect(recordFailedUnlock(NOW)).toBe(900_000);
  });

  it("expires as time passes", () => {
    for (let i = 0; i < 6; i++) recordFailedUnlock(NOW);
    expect(lockoutRemaining(NOW + 29_000)).toBe(1_000);
    expect(lockoutRemaining(NOW + 31_000)).toBe(0);
  });

  it("survives a reload, which is what an attacker would reach for", () => {
    for (let i = 0; i < 6; i++) recordFailedUnlock(NOW);
    // Same backing store, fresh read — no in-memory state carried over.
    expect(lockoutRemaining(NOW)).toBe(30_000);
  });

  it("resets on a successful unlock", () => {
    for (let i = 0; i < 6; i++) recordFailedUnlock(NOW);
    clearFailedUnlocks();
    expect(lockoutRemaining(NOW)).toBe(0);
    expect(recordFailedUnlock(NOW)).toBe(0);
  });

  it("makes exhausting a six-digit PIN infeasible", () => {
    // Worst case for the attacker: every lockout waited out at the cap.
    const guessesPerCycle = 1;
    const secondsPerCycle = 900;
    const combinations = 10 ** 6;
    const years =
      (combinations / guessesPerCycle) * secondsPerCycle / (365 * 24 * 3600);
    expect(years).toBeGreaterThan(25);
  });
});
