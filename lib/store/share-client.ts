import {
  openWithShareKey,
  sealWithShareKey,
  SHARE_ID_PATTERN,
  SHARE_KEY_PATTERN,
  type SealedShare,
} from "./crypto";
import {
  decodePayload,
  encodePayload,
  type SharePayload,
  type ShareState,
} from "@/lib/share/payload";

/**
 * Talking to the relay.
 *
 * Everything here encrypts before it sends and decrypts after it receives, so
 * that the only thing crossing the network is a blob neither the network nor
 * the server can read. The share key is a function argument in this file and
 * never a URL component — `fetch` paths are built from the shareId alone, so
 * there is no path by which the key reaches a request line, a log or a Referer
 * header.
 */

export interface ShareCredentials {
  /** Public-ish: the server sees it, it is in the path. */
  id: string;
  /** Never leaves the device except in the link fragment. */
  key: string;
  /** Never leaves the device at all. Proves a write comes from the owner. */
  secret: string;
}

export type ShareStorage = "redis" | "edge-config" | "memory" | "unknown";

export interface PublishResult {
  ok: boolean;
  storage: ShareStorage;
}

/** The link the sender copies. The key is after the `#`, which is the point. */
export function shareUrl(origin: string, id: string, key: string): string {
  return `${origin}/s/${id}#k=${key}`;
}

function endpoint(id: string): string {
  return `/api/share/${encodeURIComponent(id)}`;
}

export async function publishShare(
  credentials: ShareCredentials,
  payload: SharePayload,
): Promise<PublishResult> {
  try {
    const sealed = await sealWithShareKey(encodePayload(payload), credentials.key);
    const res = await fetch(endpoint(credentials.id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sealed, secret: credentials.secret }),
    });
    if (!res.ok) return { ok: false, storage: "unknown" };
    const body = (await res.json().catch(() => ({}))) as {
      storage?: ShareStorage;
    };
    return { ok: true, storage: body.storage ?? "unknown" };
  } catch {
    // Offline. The next status change or app open republishes.
    return { ok: false, storage: "unknown" };
  }
}

export async function revokeShare(
  credentials: Pick<ShareCredentials, "id" | "secret">,
): Promise<boolean> {
  try {
    const res = await fetch(endpoint(credentials.id), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: credentials.secret }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Asks the deployment whether sharing can work at all, before promising it. */
export async function fetchShareStorage(): Promise<ShareStorage> {
  try {
    const res = await fetch("/api/share", { cache: "no-store" });
    if (!res.ok) return "unknown";
    const body = (await res.json()) as { storage?: ShareStorage };
    return body.storage ?? "unknown";
  } catch {
    return "unknown";
  }
}

/* ----------------------------- the reader --------------------------------- */

export type SharePageResult =
  | { status: "ok"; payload: SharePayload; storedAt: string }
  /** No key in the fragment and none remembered. Nothing to try. */
  | { status: "no-key" }
  /** Ciphertext arrived but this key does not open it. */
  | { status: "wrong-key" }
  /** Decrypted, but the shape is from a version this build does not know. */
  | { status: "unreadable" }
  /** The owner revoked or rotated the link, or it expired. Their doing. */
  | { status: "gone" }
  /** The server is up but has nowhere to keep sessions. Not the owner's doing. */
  | { status: "unavailable" }
  /** This device cannot reach the server right now. */
  | { status: "offline" };

/**
 * Where the reader's key is remembered.
 *
 * The fragment is not always there on a second visit — a bookmark, a reload
 * from history, a share sheet that strips it — and without the key the page
 * has ciphertext and nothing else. So it is cached per shareId on the reader's
 * own device.
 *
 * That is a real tradeoff and worth naming: it puts a decryption key in the
 * reader's localStorage, where anyone with that unlocked device can find it.
 * It is the reader's device and the reader is the intended audience, so this
 * grants nobody access they did not already have through the link itself —
 * but it does mean "close the tab" is not the same as "forget". The reader's
 * page says so and offers a way to clear it.
 */
const KEY_CACHE = "suci.sharekeys";

type KeyCache = Record<string, string>;

function readCache(): KeyCache {
  try {
    const raw = localStorage.getItem(KEY_CACHE);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as KeyCache;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function rememberShareKey(id: string, key: string): void {
  if (!SHARE_ID_PATTERN.test(id) || !SHARE_KEY_PATTERN.test(key)) return;
  try {
    localStorage.setItem(KEY_CACHE, JSON.stringify({ ...readCache(), [id]: key }));
  } catch {
    // Blocked storage only costs the reader the convenience of a bookmark.
  }
}

export function recallShareKey(id: string): string | null {
  const hit = readCache()[id];
  return hit && SHARE_KEY_PATTERN.test(hit) ? hit : null;
}

export function forgetShareKeys(): void {
  try {
    localStorage.removeItem(KEY_CACHE);
  } catch {
    // Nothing to do; the page already says it may not have worked.
  }
}

/**
 * The key from `#k=...`, if this page was opened with one.
 *
 * Read from `location.hash` and never written anywhere that could send it. A
 * fragment is not transmitted by any browser — not on navigation, not on
 * fetch, not in Referer — which is the single mechanism the whole design rests
 * on, so nothing in this codebase may move it into a path or a query.
 */
export function keyFromFragment(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  const found = new URLSearchParams(hash).get("k");
  return found && SHARE_KEY_PATTERN.test(found) ? found : null;
}

export async function fetchSharedStatus(
  id: string,
  key: string | null,
): Promise<SharePageResult> {
  if (!key) return { status: "no-key" };

  let res: Response;
  try {
    res = await fetch(endpoint(id), { cache: "no-store" });
  } catch {
    return { status: "offline" };
  }

  if (!res.ok) {
    // A 404 that is not our JSON is Next's own "page not found" — the route
    // does not exist in this build. That is a deployment that has not caught
    // up, not a link the owner took down, and saying "tautan tidak berlaku"
    // there accuses her of something she did not do.
    const isOurApi = (res.headers.get("content-type") ?? "").includes(
      "application/json",
    );
    if (res.status === 404 && isOurApi) return { status: "gone" };
    if (res.status === 404 || res.status === 503) return { status: "unavailable" };
    return { status: "offline" };
  }

  const envelope = (await res.json()) as SealedShare & { updatedAt: string };
  const plaintext = await openWithShareKey(envelope, key);
  // AES-GCM authenticates, so this is "wrong key or tampered ciphertext",
  // never "decrypted to something plausible but wrong".
  if (plaintext === null) return { status: "wrong-key" };

  const payload = decodePayload(plaintext);
  if (!payload) return { status: "unreadable" };

  return { status: "ok", payload, storedAt: envelope.updatedAt };
}

export type { ShareState, SharePayload };
