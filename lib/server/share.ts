import { kvDelete, kvGet, kvIncrementWindow, kvSet } from "./store";

/**
 * ============================================================================
 *  THE ONLY THING SUCI EVER STORES ON A SERVER.
 * ============================================================================
 *
 *  One bit per share link: whether the person is, today, haid or suci. That is
 *  precisely what Mode Suami tells the user it shares — "bagikan satu hal saja"
 *  — and it is the whole reason a server exists in this app at all.
 *
 *  Nothing may be added to `ShareRecord` without changing what Mode Suami
 *  promises on screen. No dates, no symptoms, no notes, no history, no
 *  prediction, no name, no identifier that outlives the token. A status that
 *  flips every few days carries almost nothing on its own; a status with a
 *  date attached is a cycle, which is the thing the user chose not to share.
 *
 *  Three properties this file is responsible for:
 *
 *   1. **Holding the link does not let you write.** The token is in a URL and
 *      will be forwarded, screenshotted and pasted. Writing requires a second
 *      secret that never leaves the owner's device, so a reader cannot forge
 *      a status. Only a hash of it is stored, so a dump of the database does
 *      not confer write access either.
 *
 *   2. **A status cannot linger.** Records expire. Someone who stops using the
 *      app should not leave a stale "suci" standing indefinitely for a reader
 *      to act on — the link goes quiet instead, and says so.
 *
 *   3. **Revocation is immediate.** Turning Mode Suami off, or rotating the
 *      link, deletes the record. The old URL stops resolving at once, which is
 *      exactly what the screen promises.
 */

export type ShareState = "haid" | "suci";

export interface ShareRecord {
  state: ShareState;
  updatedAt: string;
}

interface StoredRecord extends ShareRecord {
  /** SHA-256 of the write secret. Never the secret itself. */
  secretHash: string;
}

/**
 * Seven days. Long enough that someone who logs weekly does not keep dropping
 * offline, short enough that an abandoned link goes quiet within a week rather
 * than showing a year-old status forever.
 */
export const SHARE_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Matches `generateShareToken`: three groups of four, from a 31-char set. */
const TOKEN_PATTERN = /^[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}$/;

export function isValidToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}

export function isValidState(state: unknown): state is ShareState {
  return state === "haid" || state === "suci";
}

function key(token: string): string {
  return `share:${token}`;
}

async function hash(secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time compare, so a wrong secret leaks nothing through timing. */
function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function readShareRecord(
  token: string,
): Promise<ShareRecord | null> {
  if (!isValidToken(token)) return null;
  const raw = await kvGet(key(token));
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as StoredRecord;
    if (!isValidState(stored.state)) return null;
    // The hash stays on the server; a reader only ever sees the bit.
    return { state: stored.state, updatedAt: stored.updatedAt };
  } catch {
    return null;
  }
}

export type WriteResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "forbidden" };

export async function writeShareRecord(
  token: string,
  state: ShareState,
  secret: string,
): Promise<WriteResult> {
  if (!isValidToken(token) || !isValidState(state)) {
    return { ok: false, reason: "invalid" };
  }
  if (typeof secret !== "string" || secret.length < 20) {
    return { ok: false, reason: "invalid" };
  }

  const secretHash = await hash(secret);
  const existing = await kvGet(key(token));

  if (existing) {
    try {
      const stored = JSON.parse(existing) as StoredRecord;
      // A token that already belongs to someone cannot be taken over by a
      // reader who happens to know it.
      if (!equals(stored.secretHash, secretHash)) {
        return { ok: false, reason: "forbidden" };
      }
    } catch {
      // Unreadable record: treat the write as a fresh claim.
    }
  }

  const record: StoredRecord = {
    state,
    updatedAt: new Date().toISOString(),
    secretHash,
  };
  await kvSet(key(token), JSON.stringify(record), SHARE_TTL_SECONDS);
  return { ok: true };
}

export async function revokeShareRecord(
  token: string,
  secret: string,
): Promise<WriteResult> {
  if (!isValidToken(token)) return { ok: false, reason: "invalid" };

  const existing = await kvGet(key(token));
  if (!existing) return { ok: true }; // already gone

  try {
    const stored = JSON.parse(existing) as StoredRecord;
    const secretHash = await hash(secret);
    if (!equals(stored.secretHash, secretHash)) {
      return { ok: false, reason: "forbidden" };
    }
  } catch {
    // Unreadable record: removing it is the safe outcome.
  }

  await kvDelete(key(token));
  return { ok: true };
}

/* ---------------------------- rate limiting -------------------------------- */

const WRITE_LIMIT = 60; // per window, per client
const READ_LIMIT = 240;
const WINDOW_SECONDS = 60 * 10;

export async function underWriteLimit(client: string): Promise<boolean> {
  const n = await kvIncrementWindow(`rl:w:${client}`, WINDOW_SECONDS);
  return n <= WRITE_LIMIT;
}

export async function underReadLimit(client: string): Promise<boolean> {
  const n = await kvIncrementWindow(`rl:r:${client}`, WINDOW_SECONDS);
  return n <= READ_LIMIT;
}

/**
 * A coarse client key for rate limiting. Deliberately not stored, not logged,
 * and hashed so the counter keys do not amount to a list of visitors' IPs.
 */
export async function clientKey(request: Request): Promise<string> {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0].trim() || "unknown";
  return (await hash(ip)).slice(0, 16);
}
