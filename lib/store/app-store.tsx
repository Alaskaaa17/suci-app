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
  blankEntry,
  clearShare,
  destroyVault,
  emptyVault,
  entryList,
  loadVault,
  NO_PIN_KEY,
  publishShare,
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

  unlock: (pin: string) => Promise<boolean>;
  completeOnboarding: (args: {
    name: string;
    madhhab: Profile["madhhab"];
    pin: string | null;
  }) => Promise<void>;
  lock: () => void;

  /** Resolves once the change is encrypted and written to disk. */
  update: (fn: (draft: VaultData) => void) => Promise<void>;
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

  const unlock = useCallback(async (pin: string) => {
    const result = await loadVault(pin);
    if (!result.ok) return false;
    pinRef.current = pin;
    setData(result.data);
    setStatus("ready");
    return true;
  }, []);

  const lock = useCallback(() => {
    pinRef.current = null;
    setData(null);
    setStatus(vaultIsEncrypted() ? "locked" : "ready");
  }, []);

  const completeOnboarding = useCallback(
    async ({
      name,
      madhhab,
      pin,
    }: {
      name: string;
      madhhab: Profile["madhhab"];
      pin: string | null;
    }) => {
      const vault = emptyVault(name);
      vault.profile.madhhab = madhhab;
      pinRef.current = pin;
      if (!pin) localStorage.setItem(NO_PIN_KEY, "1");
      await saveVault(vault, pin);
      setData(vault);
      setStatus("ready");
    },
    [],
  );

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
   * Keep the share record in step with the live ruling, so "diperbarui
   * otomatis" on the shared page is true. Turning Mode Suami off — or erasing
   * the vault — removes the record entirely.
   */
  useEffect(() => {
    const token = data?.profile.shareToken;
    if (!token || !verdict) {
      if (!data?.profile.shareToken) clearShare();
      return;
    }
    const exempt =
      verdict.classification === Classification.HAID ||
      verdict.classification === Classification.NIFAS;
    publishShare({
      token,
      state: exempt ? "haid" : "suci",
      updatedAt: new Date().toISOString(),
    });
  }, [data?.profile.shareToken, verdict]);

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
 * For screens that cannot render without a vault. Returns the loaded data or
 * null; the shell handles the loading/locked/onboarding cases above them, so
 * a null here means "still booting", not "broken".
 */
export function useVault(): VaultData | null {
  return useApp().data;
}
