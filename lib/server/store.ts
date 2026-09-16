/**
 * Server-side key/value storage for the share feature.
 *
 * This is the only server state Suci has, and it holds exactly one bit per
 * share link. Nothing else may be put here — see `lib/server/share.ts` for
 * what the shape is allowed to contain and why.
 *
 * Backed by Upstash Redis (which is what Vercel KV provisions) when its
 * environment variables are present, and by an in-process map otherwise so
 * local development and the test suite work with nothing provisioned. The
 * in-process fallback is per-instance and disappears on restart; it is
 * explicitly not a production store, and `storageKind()` says which is live so
 * the UI can be honest about it.
 */

export type StorageKind = "redis" | "memory";

const REST_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export function storageKind(): StorageKind {
  return REST_URL && REST_TOKEN ? "redis" : "memory";
}

/* ---------------------------- in-process ---------------------------------- */

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

/**
 * Survives hot reloads in dev, where module state is otherwise discarded on
 * every edit and a share link would stop working mid-test.
 */
const memory: Map<string, MemoryEntry> =
  (globalThis as { __suciMemory?: Map<string, MemoryEntry> }).__suciMemory ??
  new Map();
(globalThis as { __suciMemory?: Map<string, MemoryEntry> }).__suciMemory = memory;

function memoryGet(key: string): string | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

/* ---------------------------- Upstash REST -------------------------------- */

async function redis(command: unknown[]): Promise<unknown> {
  const res = await fetch(REST_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`storage ${res.status}`);
  }
  const body = (await res.json()) as { result?: unknown; error?: string };
  if (body.error) throw new Error(body.error);
  return body.result ?? null;
}

/* ---------------------------- public API ---------------------------------- */

export async function kvGet(key: string): Promise<string | null> {
  if (storageKind() === "memory") return memoryGet(key);
  const result = await redis(["GET", key]);
  return typeof result === "string" ? result : null;
}

export async function kvSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  if (storageKind() === "memory") {
    memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    return;
  }
  await redis(["SET", key, value, "EX", String(ttlSeconds)]);
}

export async function kvDelete(key: string): Promise<void> {
  if (storageKind() === "memory") {
    memory.delete(key);
    return;
  }
  await redis(["DEL", key]);
}

/**
 * Increment a counter that expires, for rate limiting. Returns the count after
 * the increment. The TTL is only applied on first use so the window is fixed
 * rather than sliding forward with every request.
 */
export async function kvIncrementWindow(
  key: string,
  windowSeconds: number,
): Promise<number> {
  if (storageKind() === "memory") {
    const current = Number(memoryGet(key) ?? 0) + 1;
    const existing = memory.get(key);
    memory.set(key, {
      value: String(current),
      expiresAt: existing?.expiresAt ?? Date.now() + windowSeconds * 1000,
    });
    return current;
  }
  const count = Number(await redis(["INCR", key]));
  if (count === 1) await redis(["EXPIRE", key, String(windowSeconds)]);
  return count;
}

/** Test seam: clears the in-process store. No effect against Redis. */
export function __resetMemoryStore(): void {
  memory.clear();
}
