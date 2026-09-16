import { kvDelete, kvGet, kvIncrementWindow, kvSet } from "./store";

/**
 * ============================================================================
 *  THE ONLY THING SUCI EVER STORES ON A SERVER — AND IT CANNOT READ IT.
 * ============================================================================
 *
 *  One row per share link: a blob of AES-256-GCM ciphertext, the IV it was
 *  encrypted with, and when it was written. The key is never here. It is
 *  generated on the sender's device, carried in the URL fragment, and browsers
 *  do not put fragments on the wire — not in the request line, not in Referer.
 *  So this file, and whoever runs the machine it executes on, holds something
 *  it has no way to open.
 *
 *  That is the property to protect. Everything below exists to keep it, or to
 *  be honest about where it stops:
 *
 *   1. **Nothing readable may be added to the row.** Not the state, not a
 *      label, not a hint, not a "type" field that happens to say "haid". The
 *      moment one plaintext field is convenient, the guarantee is gone and
 *      every screen that claims it becomes a lie. `StoredRecord` is the whole
 *      surface; read it before extending it.
 *
 *   2. **Holding the link does not let you write.** The shareId is in a URL
 *      and will be forwarded, screenshotted and pasted, and the key rides
 *      beside it — so a reader could otherwise encrypt a valid-looking status
 *      and overwrite hers, or simply delete the row. Writing needs a second
 *      secret that stays in her vault and never enters the link. Only its hash
 *      is stored, so a dump of this database does not confer write access
 *      either.
 *
 *   3. **A status cannot linger.** Rows expire. Someone who stops using the
 *      app should not leave a stale "suci" standing for a reader to act on.
 *
 *   4. **Revocation is immediate.** Turning Mode Suami off, or rotating the
 *      link, deletes the row. The old URL stops resolving at once.
 *
 *  What this does NOT protect, which `lib/share/payload.ts` states in full and
 *  the Mode Suami screen repeats to the user: the write timestamps are
 *  visible, and for a cycle tracker the rhythm of writes is itself the
 *  sensitive fact. Encryption does nothing about that.
 */

/** The envelope. Opaque by construction — see property 1 above. */
export interface ShareEnvelope {
  /** AES-256-GCM ciphertext, base64url. */
  ct: string;
  /** The IV it was sealed with, base64url. Public by design; never reused. */
  iv: string;
  /** When the server wrote this row. Not part of the encrypted payload. */
  updatedAt: string;
}

interface StoredRecord extends ShareEnvelope {
  /** SHA-256 of the write secret. Never the secret itself. */
  secretHash: string;
}

/**
 * Fourteen days. Long enough that someone who logs every week or two does not
 * keep dropping offline, short enough that an abandoned link goes quiet rather
 * than showing a months-old status forever.
 */
export const SHARE_TTL_SECONDS = 14 * 24 * 60 * 60;

/** Matches `generateShareId`: 18 random bytes as 24 base64url characters. */
const ID_PATTERN = /^[A-Za-z0-9_-]{24}$/;

/**
 * The shape share links had before the payload was encrypted. Accepted only
 * for deletion, so that upgrading does not silently orphan a live row on the
 * server while the app tells its owner sharing is off. Removable once no
 * pre-encryption row can still be within its TTL.
 */
const LEGACY_ID_PATTERN =
  /^[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}$/;

export function isValidShareId(id: unknown): id is string {
  return typeof id === "string" && ID_PATTERN.test(id);
}

function isDeletableId(id: unknown): id is string {
  return (
    typeof id === "string" && (ID_PATTERN.test(id) || LEGACY_ID_PATTERN.test(id))
  );
}

/** base64url, and long enough that the length alone tells us nothing useful. */
function isEnvelopeField(value: unknown, max: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= max &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

/** 16 bytes as base64url. Anything else is not an AES-GCM IV. */
function isIv(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16}$/.test(value);
}

/**
 * A ceiling on the ciphertext, so the store cannot be used as free hosting for
 * something that is not a status. The real payload is well under 200 bytes.
 */
const MAX_CIPHERTEXT_CHARS = 1024;

function key(id: string): string {
  return `share:${id}`;
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
  id: string,
): Promise<ShareEnvelope | null> {
  if (!isValidShareId(id)) return null;
  const raw = await kvGet(key(id));
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as StoredRecord;
    if (!isEnvelopeField(stored.ct, MAX_CIPHERTEXT_CHARS) || !isIv(stored.iv)) {
      return null;
    }
    // The hash stays here; a reader only ever receives the sealed envelope.
    return { ct: stored.ct, iv: stored.iv, updatedAt: stored.updatedAt };
  } catch {
    return null;
  }
}

export type WriteResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "forbidden" };

export async function writeShareRecord(
  id: string,
  envelope: { ct: unknown; iv: unknown },
  secret: string,
): Promise<WriteResult> {
  if (!isValidShareId(id)) return { ok: false, reason: "invalid" };
  if (
    !isEnvelopeField(envelope.ct, MAX_CIPHERTEXT_CHARS) ||
    !isIv(envelope.iv)
  ) {
    return { ok: false, reason: "invalid" };
  }
  if (typeof secret !== "string" || secret.length < 20) {
    return { ok: false, reason: "invalid" };
  }

  const secretHash = await hash(secret);
  const existing = await kvGet(key(id));

  if (existing) {
    try {
      const stored = JSON.parse(existing) as StoredRecord;
      // A shareId that already belongs to someone cannot be taken over by a
      // reader who happens to hold the link.
      if (!equals(stored.secretHash, secretHash)) {
        return { ok: false, reason: "forbidden" };
      }
    } catch {
      // Unreadable record: treat the write as a fresh claim.
    }
  }

  const record: StoredRecord = {
    ct: envelope.ct,
    iv: envelope.iv,
    updatedAt: new Date().toISOString(),
    secretHash,
  };
  await kvSet(key(id), JSON.stringify(record), SHARE_TTL_SECONDS);
  return { ok: true };
}

export async function revokeShareRecord(
  id: string,
  secret: string,
): Promise<WriteResult> {
  if (!isDeletableId(id)) return { ok: false, reason: "invalid" };

  const existing = await kvGet(key(id));
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

  await kvDelete(key(id));
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
