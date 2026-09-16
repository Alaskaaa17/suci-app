"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { todayIso, type IsoDate } from "@/lib/date";
import { analyzeCycle } from "@/lib/fiqh/cycle";
import { buildVerdict } from "@/lib/fiqh/verdict";
import {
  Classification,
  type CycleAnalysis,
  type DayEntry,
  type Profile,
  type Verdict,
} from "@/lib/fiqh/types";
import {
  publishShare as publishToServer,
  revokeShare,
} from "./share-client";
import {
  blankEntry,
  clearFailedUnlocks,
  destroyVault,
  emptyVault,
  entryList,
  loadVault,
  lockoutRemaining,
  NO_PIN_KEY,
  recordFailedUnlock,
  saveVault,
  vaultExists,
  vaultIsEncrypted,
  type QadhaPrayer,
  type VaultData,
} from "./vault";

type Status = "loading" | "onboarding" | "locked" | "ready";

interface AppState {
  status: Status;
  data: VaultData | null;
  today: IsoDate;
  analysis: CycleAnalysis | null;
  verdict: Verdict | null;

  /** Resolves ok, or with how long the throttle says to wait. */
  unlock: (pin: string) => Promise<{ ok: boolean; waitMs?: number }>;
  completeOnboarding: (args: {
    name: string;
    madhhab: Profile["madhhab"];
    pin: string | null;
    /** A previously exported vault to seed instead of starting empty. */
    restore?: VaultData;
  }) => Promise<void>;
  lock: () => void;

  /** Resolves once the change is encrypted and written to disk. */
  update: (fn: (draft: VaultData) => void) => Promise<void>;
  /** Overwrites the whole vault from a validated backup. Keeps the current PIN. */
  restoreVault: (next: VaultData) => Promise<void>;
  setEntry: (date: IsoDate, patch: Partial<DayEntry>) => Promise<void>;
  entryFor: (date: IsoDate) => DayEntry;
  verdictFor: (date: IsoDate) => Verdict | null;
  addQadhaPrayer: (q: Omit<QadhaPrayer, "id">) => Promise<void>;
  settleQadhaPrayer: (id: string) => Promise<void>;
  eraseEverything: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<VaultData | null>(null);
  const [today, setToday] = useState<IsoDate>(() => todayIso());
  // Held in memory only, for re-sealing on every write. Never persisted.
  const pinRef = useRef<string | null>(null);

  /* ---- boot ---------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!vaultExists()) {
        if (!cancelled) setStatus("onboarding");
        return;
      }
      if (vaultIsEncrypted()) {
        if (!cancelled) setStatus("locked");
        return;
      }
      const result = await loadVault(null);
      if (cancelled) return;
      if (result.ok) {
        setData(result.data);
        setStatus("ready");
      } else {
        setStatus("onboarding");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- roll the date over at local midnight -------------------------- */
  useEffect(() => {
    const tick = () => setToday(todayIso());
    const id = window.setInterval(tick, 60_000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, []);

  /* ---- persistence --------------------------------------------------- */

  /**
   * Mirror of the current vault, so `update` can build the next value without
   * doing I/O inside a state updater (which React may call twice).
   */
  const dataRef = useRef<VaultData | null>(null);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  /**
   * Writes are serialised through this chain. Sealing costs a PBKDF2 pass, so
   * two quick edits could otherwise race and the slower one would overwrite
   * the newer state.
   */
  const writeChain = useRef<Promise<void>>(Promise.resolve());

  const update = useCallback((fn: (draft: VaultData) => void) => {
    const current = dataRef.current;
    if (!current) return Promise.resolve();

    const draft: VaultData = structuredClone(current);
    fn(draft);
    dataRef.current = draft;
    setData(draft);

    // Callers await this before telling the user their change is saved.
    writeChain.current = writeChain.current
      .catch(() => {})
      .then(() => saveVault(draft, pinRef.current));
    return writeChain.current;
  }, []);

  const unlock = useCallback<AppState["unlock"]>(async (pin) => {
    const waitMs = lockoutRemaining();
    if (waitMs > 0) return { ok: false, waitMs };

    const result = await loadVault(pin);
    if (!result.ok) {
      return { ok: false, waitMs: recordFailedUnlock() };
    }

    clearFailedUnlocks();
    pinRef.current = pin;
    dataRef.current = result.data;
    setData(result.data);
    setStatus("ready");
    return { ok: true };
  }, []);

  const lock = useCallback(() => {
    // With no PIN there is nothing to lock to, and clearing `data` would leave
    // a "ready" app with no vault — a blank screen with no way back.
    if (!vaultIsEncrypted()) return;
    pinRef.current = null;
    dataRef.current = null;
    setData(null);
    setStatus("locked");
  }, []);

  /**
   * Auto-lock. Onboarding's promise is about a shared or borrowed phone, and
   * an app that unlocks once and stays open until a reload does not keep it.
   *
   * Locking only after the app has been out of sight for a while, rather than
   * the moment it is hidden, means glancing at a message does not cost a PIN —
   * and nothing is locked mid-entry, so no draft is ever lost.
   */
  useEffect(() => {
    if (status !== "ready") return;

    const GRACE_MS = 2 * 60 * 1000;
    let hiddenAt: number | null = null;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null && Date.now() - hiddenAt >= GRACE_MS) {
        lock();
      }
      hiddenAt = null;
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [status, lock]);

  const completeOnboarding = useCallback(
    async ({
      name,
      madhhab,
      pin,
      restore,
    }: {
      name: string;
      madhhab: Profile["madhhab"];
      pin: string | null;
      restore?: VaultData;
    }) => {
      const vault = restore ?? emptyVault(name);
      if (!restore) vault.profile.madhhab = madhhab;
      pinRef.current = pin;
      if (!pin) localStorage.setItem(NO_PIN_KEY, "1");
      await saveVault(vault, pin);
      setData(vault);
      setStatus("ready");
    },
    [],
  );

  /**
   * Replaces the whole vault with a validated backup, sealed under whatever
   * PIN is already active. Distinct from `update`, which patches a draft of
   * the current vault — a restore is not a patch, it is a new source of truth.
   */
  const restoreVault = useCallback((next: VaultData) => {
    dataRef.current = next;
    setData(next);
    writeChain.current = writeChain.current
      .catch(() => {})
      .then(() => saveVault(next, pinRef.current));
    return writeChain.current;
  }, []);

  const eraseEverything = useCallback(() => {
    destroyVault();
    pinRef.current = null;
    setData(null);
    setStatus("onboarding");
  }, []);

  /* ---- derived ------------------------------------------------------- */
  const analysis = useMemo(() => {
    if (!data) return null;
    return analyzeCycle({
      entries: entryList(data),
      profile: data.profile,
      today,
    });
  }, [data, today]);

  const verdict = useMemo(() => {
    if (!data || !analysis) return null;
    return buildVerdict(analysis, data.profile, today);
  }, [data, analysis, today]);

  /**
   * Keep the shared status in step with the live ruling, so "diperbarui
   * otomatis" on the shared page is true.
   *
   * The payload is sealed with the share key before it leaves, so what reaches
   * the server is ciphertext it has no way to open. Nothing is mirrored
   * locally in the clear any more — see the note in `vault.ts`.
   */
  const share = data?.profile.share;
  const shareId = share?.id;
  const shareKey = share?.key;
  const shareSecret = share?.secret;
  const lastState = share?.lastState;
  const lastPublishedAt = share?.lastPublishedAt;

  useEffect(() => {
    if (!shareId || !shareKey || !shareSecret || !verdict) return;

    const exempt =
      verdict.classification === Classification.HAID ||
      verdict.classification === Classification.NIFAS;
    const state: "haid" | "suci" = exempt ? "haid" : "suci";

    // `verdict` is rebuilt on every change to the vault, so publishing
    // unconditionally meant a server write on every app open and every edited
    // entry — hundreds of writes to say the same word. Harmless against Redis,
    // and enough to exhaust an Edge Config write budget on its own. It also
    // mattered more than it looks: every write is a timestamp the server
    // operator can see, and a chatty client draws a more detailed picture of
    // her day than a quiet one, even with the contents sealed.
    if (!needsPublishing(state, lastState, lastPublishedAt)) return;

    const publishedAt = new Date().toISOString();
    void publishToServer(
      { id: shareId, key: shareKey, secret: shareSecret },
      { v: 1, state, updatedAt: publishedAt },
    ).then((result) => {
      if (!result.ok) return;
      void update((draft) => {
        if (draft.profile.share?.id !== shareId) return;
        draft.profile.share.lastState = state;
        draft.profile.share.lastPublishedAt = publishedAt;
      });
    });
  }, [shareId, shareKey, shareSecret, lastState, lastPublishedAt, verdict, update]);

  /**
   * A share link created before the payload was encrypted. Its row still holds
   * a plaintext status under a shareId the new API will not write to, so the
   * only thing to do with it is delete it — quietly, once, on the first load
   * after the upgrade. Leaving it to expire would mean the app says sharing is
   * off while a live URL still answers.
   */
  const legacyShare = data?.profile.legacyShare;
  useEffect(() => {
    if (!legacyShare) return;
    void revokeShare({
      id: legacyShare.token,
      secret: legacyShare.secret,
    }).then(() => {
      void update((draft) => {
        delete draft.profile.legacyShare;
      });
    });
  }, [legacyShare, update]);

  const verdictFor = useCallback(
    (date: IsoDate) => {
      if (!data || !analysis) return null;
      return buildVerdict(analysis, data.profile, date);
    },
    [data, analysis],
  );

  const entryFor = useCallback(
    (date: IsoDate) => data?.entries[date] ?? blankEntry(date),
    [data],
  );

  const setEntry = useCallback(
    (date: IsoDate, patch: Partial<DayEntry>) =>
      update((draft) => {
        const existing = draft.entries[date] ?? blankEntry(date);
        draft.entries[date] = { ...existing, ...patch, date };
      }),
    [update],
  );

  const addQadhaPrayer = useCallback(
    (q: Omit<QadhaPrayer, "id">) =>
      update((draft) => {
        draft.qadhaPrayers.push({
          ...q,
          id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        });
      }),
    [update],
  );

  const settleQadhaPrayer = useCallback(
    (id: string) =>
      update((draft) => {
        const found = draft.qadhaPrayers.find((q) => q.id === id);
        if (found) found.settledOn = todayIso();
      }),
    [update],
  );

  const value = useMemo<AppState>(
    () => ({
      status,
      data,
      today,
      analysis,
      verdict,
      unlock,
      completeOnboarding,
      lock,
      update,
      restoreVault,
      setEntry,
      entryFor,
      verdictFor,
      addQadhaPrayer,
      settleQadhaPrayer,
      eraseEverything,
    }),
    [
      status,
      data,
      today,
      analysis,
      verdict,
      unlock,
      completeOnboarding,
      lock,
      update,
      restoreVault,
      setEntry,
      entryFor,
      verdictFor,
      addQadhaPrayer,
      settleQadhaPrayer,
      eraseEverything,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

/**
 * Half the expiry window. Refresh well before a reader would see the link go
 * quiet, without turning "still suci" into a write — and a timestamp the
 * server can see — every time the app opens.
 */
const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function needsPublishing(
  state: "haid" | "suci",
  lastState: "haid" | "suci" | undefined,
  lastPublishedAt: string | undefined,
): boolean {
  if (!lastState || !lastPublishedAt) return true; // new or rotated link
  if (lastState !== state) return true; // the bit actually changed
  const age = Date.now() - new Date(lastPublishedAt).getTime();
  return !(age >= 0 && age < REFRESH_AFTER_MS);
}
