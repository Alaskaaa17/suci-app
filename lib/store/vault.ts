import { todayIso, type IsoDate } from "@/lib/date";
import { DEFAULT_MADHHAB } from "@/lib/fiqh/madhhab";
import { DEFAULT_LOCATION, LOCATIONS } from "@/lib/fiqh/prayer-times";
import type { DayEntry, Profile } from "@/lib/fiqh/types";
import { open, seal, type SealedBox } from "./crypto";

/** Every prayer that can be owed. */
export type PrayerSlot = "Subuh" | "Zuhur" | "Asar" | "Magrib" | "Isya";

export interface QadhaPrayer {
  id: string;
  slot: PrayerSlot;
  count: number;
  /** Why it was missed — never haid, which owes nothing. */
  reason: string;
  missedOn?: IsoDate;
  settledOn?: IsoDate;
}

export interface QadhaFast {
  /** Days owed from the most recent Ramadan. */
  owed: number;
  settled: number;
  /** Fidyah portions owed, for the nursing case. */
  fidyah: number;
}

export interface VaultData {
  version: 1;
  profile: Profile;
  entries: Record<IsoDate, DayEntry>;
  qadhaPrayers: QadhaPrayer[];
  qadhaFast: QadhaFast;
  /** Per-day set of completed amalan ids, for the substitute-deeds screen. */
  amalan: Record<IsoDate, string[]>;
  /** Per-day set of completed ghusl steps. */
  ghuslSteps: Record<IsoDate, string[]>;
  createdAt: string;
  updatedAt: string;
}

export const VAULT_KEY = "suci.vault";
export const THEME_KEY = "suci.theme";
/** Set when the user chooses "Nanti saja" instead of a PIN. */
export const NO_PIN_KEY = "suci.nopin";
/** A plaintext status mirror written by builds before the payload was sealed. */
const LEGACY_SHARE_KEY = "suci.share";
/** The reader-side key cache; cleared here too when a device is wiped. */
const READER_KEY_CACHE = "suci.sharekeys";

export function emptyVault(name = ""): VaultData {
  const now = new Date().toISOString();
  return {
    version: 1,
    profile: {
      name,
      madhhab: DEFAULT_MADHHAB,
      specialState: "normal",
      location: { ...DEFAULT_LOCATION },
      prayerMethod: "kemenag",
      onboardedAt: now,
    },
    entries: {},
    qadhaPrayers: [],
    qadhaFast: { owed: 0, settled: 0, fidyah: 0 },
    amalan: {},
    ghuslSteps: {},
    createdAt: now,
    updatedAt: now,
  };
}

/* -------------------------------------------------------------------------
   Persistence. Two modes, because the design offers "Nanti saja" on the PIN
   step: with a PIN the blob is sealed, without one it is stored in the clear
   and the UI says so rather than implying a protection that is not there.
   ------------------------------------------------------------------------- */

interface StoredEnvelope {
  encrypted: boolean;
  box?: SealedBox;
  plain?: VaultData;
}

function read(): StoredEnvelope | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredEnvelope;
  } catch {
    return null;
  }
}

export function vaultExists(): boolean {
  return read() !== null;
}

export function vaultIsEncrypted(): boolean {
  return read()?.encrypted === true;
}

export async function saveVault(
  data: VaultData,
  pin: string | null,
): Promise<void> {
  const next: VaultData = { ...data, updatedAt: new Date().toISOString() };
  const envelope: StoredEnvelope = pin
    ? { encrypted: true, box: await seal(JSON.stringify(next), pin) }
    : { encrypted: false, plain: next };
  localStorage.setItem(VAULT_KEY, JSON.stringify(envelope));
}

export type LoadResult =
  | { ok: true; data: VaultData }
  | { ok: false; reason: "missing" | "wrong-pin" | "corrupt" };

export async function loadVault(pin: string | null): Promise<LoadResult> {
  const envelope = read();
  if (!envelope) return { ok: false, reason: "missing" };

  if (!envelope.encrypted) {
    return envelope.plain
      ? { ok: true, data: migrate(envelope.plain) }
      : { ok: false, reason: "corrupt" };
  }

  if (!pin || !envelope.box) return { ok: false, reason: "wrong-pin" };
  const plain = await open(envelope.box, pin);
  if (plain === null) return { ok: false, reason: "wrong-pin" };
  try {
    return { ok: true, data: migrate(JSON.parse(plain) as VaultData) };
  } catch {
    return { ok: false, reason: "corrupt" };
  }
}

/** Fills in fields added after a vault was first written. */
function migrate(data: VaultData): VaultData {
  // `tz` was added after the first release; recover it from the saved label
  // rather than the device clock, which may not match the chosen city.
  const location = data.profile?.location;
  const withTz =
    location && typeof location.tz === "number"
      ? location
      : {
          ...(location ?? DEFAULT_LOCATION),
          tz:
            LOCATIONS.find((l) => l.label === location?.label)?.tz ??
            DEFAULT_LOCATION.tz,
        };

  // Share links from before the payload was encrypted cannot be upgraded in
  // place: their server rows hold a plaintext status under a token shape the
  // new API will not write to. Turning sharing off locally and leaving that
  // row live for the rest of its TTL would break the promise the screen makes
  // — "matikan kapan saja, dan tautan lama langsung tidak berlaku" — so the
  // old credentials are carried over as `legacyShare` and the app deletes the
  // row on next load before dropping them.
  const legacy = data.profile as unknown as {
    shareToken?: string;
    shareSecret?: string;
  };
  const carriedOver =
    legacy?.shareToken && legacy?.shareSecret
      ? { token: legacy.shareToken, secret: legacy.shareSecret }
      : data.profile?.legacyShare;

  const profile = {
    ...emptyVault().profile,
    ...data.profile,
    location: withTz,
    ...(carriedOver ? { legacyShare: carriedOver } : {}),
  };
  delete (profile as { shareToken?: string }).shareToken;
  delete (profile as { shareSecret?: string }).shareSecret;

  return {
    ...emptyVault(),
    ...data,
    profile,
    qadhaFast: { ...emptyVault().qadhaFast, ...data.qadhaFast },
    amalan: data.amalan ?? {},
    ghuslSteps: data.ghuslSteps ?? {},
  };
}

/** Irreversible, as the Data Saya screen warns. */
export function destroyVault(): void {
  localStorage.removeItem(VAULT_KEY);
  localStorage.removeItem(NO_PIN_KEY);
  localStorage.removeItem(LEGACY_SHARE_KEY);
  localStorage.removeItem(READER_KEY_CACHE);
  localStorage.removeItem(ATTEMPTS_KEY);
}

/* ---------------------------- PIN throttling ------------------------------ */

/**
 * Failed-unlock throttling.
 *
 * PBKDF2 at 310k iterations costs roughly a quarter second per guess, which
 * alone leaves a six-digit PIN reachable in a few days by someone holding the
 * phone. Escalating lockouts push that out of reach for the threat this is
 * actually for — a borrowed or shared device, not a forensics lab.
 *
 * Stored in the clear on purpose: it holds no secret, and it has to survive a
 * reload, which is exactly what an attacker would otherwise use to reset it.
 */
const ATTEMPTS_KEY = "suci.attempts";

/** Failures before the first lockout, then the delay for each step after. */
const FREE_ATTEMPTS = 5;
const LOCKOUT_STEPS_MS = [30_000, 60_000, 300_000, 900_000];

interface AttemptState {
  failures: number;
  lockedUntil: number;
}

function readAttempts(): AttemptState {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return { failures: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as AttemptState;
    return {
      failures: Number(parsed.failures) || 0,
      lockedUntil: Number(parsed.lockedUntil) || 0,
    };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

/** Milliseconds still to wait, or 0 when an attempt is allowed now. */
export function lockoutRemaining(now = Date.now()): number {
  const { lockedUntil } = readAttempts();
  return Math.max(0, lockedUntil - now);
}

export function recordFailedUnlock(now = Date.now()): number {
  const state = readAttempts();
  const failures = state.failures + 1;
  let lockedUntil = 0;

  if (failures > FREE_ATTEMPTS) {
    const step = Math.min(
      failures - FREE_ATTEMPTS - 1,
      LOCKOUT_STEPS_MS.length - 1,
    );
    lockedUntil = now + LOCKOUT_STEPS_MS[step];
  }

  try {
    localStorage.setItem(
      ATTEMPTS_KEY,
      JSON.stringify({ failures, lockedUntil }),
    );
  } catch {
    // Without storage the throttle cannot persist; the delay still applies
    // for this session via the returned value.
  }
  return Math.max(0, lockedUntil - now);
}

export function clearFailedUnlocks(): void {
  try {
    localStorage.removeItem(ATTEMPTS_KEY);
  } catch {
    // Nothing to clear.
  }
}

/* ---------------------------- husband mode ------------------------------- */

/**
 * There is no local status record any more, and that is the change.
 *
 * Earlier builds mirrored today's status into `suci.share` in the clear, so
 * that the owner's own browser could render her link offline. It was a
 * plaintext "haid" sitting in localStorage outside the vault — readable by
 * anyone holding the unlocked phone, which is precisely the threat the PIN
 * exists for. The convenience was not worth it.
 *
 * Everything sharing needs now lives in two places and no third: the session
 * (id, key, write secret) inside the encrypted vault as `profile.share`, and
 * the ciphertext on the server, which cannot be read without the key. The
 * reader's own copy of the key is handled in `share-client.ts`, on the
 * reader's device, and is disclosed to them there.
 */
/* ---------------------------- export ------------------------------------ */

export function toExportJson(data: VaultData): string {
  return JSON.stringify(
    {
      app: "Suci",
      exportedAt: new Date().toISOString(),
      note: "Berkas ini berisi catatan pribadimu dalam bentuk terbuka. Simpan di tempat yang aman.",
      ...data,
    },
    null,
    2,
  );
}

export function exportFilename(): string {
  return `suci-${todayIso()}.json`;
}

/** Rough on-disk size, for the "132 KB" line on Data Saya. */
export function approximateSize(data: VaultData): string {
  const bytes = new Blob([JSON.stringify(data)]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Entries as a sorted array, which is what the engine wants. */
export function entryList(data: VaultData): DayEntry[] {
  return Object.values(data.entries).sort((a, b) =>
    a.date < b.date ? -1 : 1,
  );
}

export function blankEntry(date: IsoDate): DayEntry {
  return { date, bleeding: false, symptoms: [], mood: [] };
}
