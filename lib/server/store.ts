/**
 * Server-side key/value storage for the share feature.
 *
 * This is the only server state Suci has, and it holds exactly one bit per
 * share link. Nothing else may be put here — see `lib/server/share.ts` for
 * what the shape is allowed to contain and why.
 *
 * Three backends, picked from whatever the deployment provides:
 *
 *   redis        Upstash REST, which is what Vercel KV provisions. The best
 *                fit: real TTLs, real atomic counters, a token scoped to the
 *                database and nothing else.
 *   edge-config  Vercel Edge Config. Free on Hobby, and adequate here, but it
 *                is a config store rather than a database and the compromises
 *                are listed below.
 *   memory       An in-process map, so local development and the test suite
 *                work with nothing provisioned. Per-instance, therefore
 *                non-functional on serverless — `storageKind()` reports it and
 *                the API answers 503 rather than pretending a miss means the
 *                link was revoked.
 *
 * What using Edge Config costs, stated plainly because none of it is obvious:
 *
 *   1. **Writes need a Vercel API token**, and Vercel tokens are scoped to an
 *      account or team, not to one Edge Config. A leaked `VERCEL_API_TOKEN` is
 *      therefore worth far more than the one bit it guards. Upstash's token
 *      reaches one database. This is the real reason Upstash is the better
 *      choice for this app, and it is a deployment decision, not a code one.
 *   2. **No TTL.** Expiry is carried inside each value and enforced on read,
 *      and expired keys are swept on the next write — the promise that a stale
 *      "suci" cannot linger is kept by this file rather than by the store.
 *   3. **Writes are rate limited and the whole store is small** (8 KB on
 *      Hobby). Fine for a household; it does not scale to strangers.
 *   4. **No atomic increment**, so the request rate limiter cannot live here —
 *      it would write on every read and exhaust the budget immediately. Under
 *      Edge Config the limiter falls back to per-instance memory, which is
 *      best-effort. Acceptable only because it is not what protects a status:
 *      that is the write secret.
 *   5. **Reads are eventually consistent.** A status change can take a moment
 *      to reach the reader's page.
 */

export type StorageKind = "redis" | "edge-config" | "memory";

/**
 * Read on each call rather than captured at import. A module-level constant is
 * frozen by whatever the environment looked like when the bundle first loaded,
 * which makes the backend untestable and makes a late-injected variable look
 * missing.
 */
const env = {
  restUrl: () => process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL,
  restToken: () =>
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
  /** Injected by Vercel when an Edge Config is connected to the project. */
  edgeConfig: () => process.env.EDGE_CONFIG,
  /** Created by hand: Vercel account settings → Tokens. Writes need it. */
  apiToken: () => process.env.VERCEL_API_TOKEN,
  /** Only when the project lives under a team rather than a personal account. */
  teamId: () => process.env.VERCEL_TEAM_ID,
};

export function storageKind(): StorageKind {
  if (env.restUrl() && env.restToken()) return "redis";
  // Reading without being able to write is not a store: a link would resolve
  // to whatever was there before and never change. Both or neither.
  if (env.edgeConfig() && env.apiToken()) return "edge-config";
  return "memory";
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

function memorySet(key: string, value: string, ttlSeconds: number): void {
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/* ---------------------------- Upstash REST -------------------------------- */

async function redis(command: unknown[]): Promise<unknown> {
  const res = await fetch(env.restUrl()!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.restToken()}`,
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

/* ---------------------------- Edge Config --------------------------------- */

/**
 * Edge Config keys allow letters, digits, underscore and hyphen. Our keys are
 * namespaced with a colon, which is not in that set.
 */
function edgeKey(key: string): string {
  return key.replace(/:/g, "_");
}

/** What Edge Config stores in place of a TTL the platform does not offer. */
interface EdgeEntry {
  v: string;
  /** Epoch milliseconds. */
  e: number;
}

function isEdgeEntry(value: unknown): value is EdgeEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as EdgeEntry).v === "string" &&
    typeof (value as EdgeEntry).e === "number"
  );
}

/**
 * The connection string Vercel injects looks like
 * `https://edge-config.vercel.com/ecfg_xxx?token=yyy`. Reads go straight to
 * that host; writes go to the management API and need a different token.
 */
function edgeEndpoint(): { origin: string; id: string; readToken: string } {
  const url = new URL(env.edgeConfig()!);
  const id = url.pathname.replace(/^\//, "");
  const readToken = url.searchParams.get("token") ?? "";
  if (!id || !readToken) {
    throw new Error("EDGE_CONFIG is not a valid connection string");
  }
  return { origin: url.origin, id, readToken };
}

async function edgeRead(path: string): Promise<unknown | undefined> {
  const { origin, id, readToken } = edgeEndpoint();
  const res = await fetch(`${origin}/${id}/${path}`, {
    headers: { Authorization: `Bearer ${readToken}` },
    cache: "no-store",
  });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`storage ${res.status}`);
  return res.json();
}

type EdgeOperation =
  | { operation: "upsert"; key: string; value: EdgeEntry }
  | { operation: "delete"; key: string };

async function edgeWrite(items: EdgeOperation[]): Promise<void> {
  if (items.length === 0) return;
  const { id } = edgeEndpoint();
  const teamId = env.teamId();
  const team = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const res = await fetch(
    `https://api.vercel.com/v1/edge-config/${id}/items${team}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.apiToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`storage ${res.status}`);
  }
}

/**
 * Expired keys swept on the way past.
 *
 * Without a TTL nothing removes them, and the store is small enough that the
 * corpses would eventually fill it and make every write fail. That failure
 * would be silent and would break links — the exact shape of bug this file
 * already exists to avoid. Enforcing expiry on read is what keeps a stale
 * status from being shown; this is what keeps the store usable.
 */
async function edgeExpiredKeys(): Promise<string[]> {
  const all = await edgeRead("items");
  if (typeof all !== "object" || all === null) return [];
  const now = Date.now();
  return Object.entries(all as Record<string, unknown>)
    .filter(([, value]) => isEdgeEntry(value) && value.e <= now)
    .map(([key]) => key);
}

/* ---------------------------- public API ---------------------------------- */

export async function kvGet(key: string): Promise<string | null> {
  switch (storageKind()) {
    case "memory":
      return memoryGet(key);
    case "redis": {
      const result = await redis(["GET", key]);
      return typeof result === "string" ? result : null;
    }
    case "edge-config": {
      const entry = await edgeRead(`item/${encodeURIComponent(edgeKey(key))}`);
      if (!isEdgeEntry(entry)) return null;
      // Expiry is ours to enforce; the platform will hand back a year-old
      // value forever otherwise.
      if (entry.e <= Date.now()) return null;
      return entry.v;
    }
  }
}

export async function kvSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  switch (storageKind()) {
    case "memory":
      memorySet(key, value, ttlSeconds);
      return;
    case "redis":
      await redis(["SET", key, value, "EX", String(ttlSeconds)]);
      return;
    case "edge-config": {
      const expired = await edgeExpiredKeys();
      const mine = edgeKey(key);
      await edgeWrite([
        ...expired
          .filter((k) => k !== mine)
          .map((k): EdgeOperation => ({ operation: "delete", key: k })),
        {
          operation: "upsert",
          key: mine,
          value: { v: value, e: Date.now() + ttlSeconds * 1000 },
        },
      ]);
      return;
    }
  }
}

export async function kvDelete(key: string): Promise<void> {
  switch (storageKind()) {
    case "memory":
      memory.delete(key);
      return;
    case "redis":
      await redis(["DEL", key]);
      return;
    case "edge-config":
      try {
        await edgeWrite([{ operation: "delete", key: edgeKey(key) }]);
      } catch {
        // Deleting a key that is not there is an error to Vercel and a success
        // to us. Revocation must not appear to fail because the record had
        // already expired.
      }
      return;
  }
}

/**
 * Increment a counter that expires, for rate limiting. Returns the count after
 * the increment. The TTL is only applied on first use so the window is fixed
 * rather than sliding forward with every request.
 *
 * Edge Config deliberately does not back this. A counter written on every
 * request would exhaust its write budget within minutes and take the share
 * feature down with it, so under Edge Config the limiter is per-instance and
 * best-effort. It is a courtesy limit on traffic, not the thing that protects
 * a status — that is the write secret in `share.ts`, which no amount of
 * request volume gets past.
 */
export async function kvIncrementWindow(
  key: string,
  windowSeconds: number,
): Promise<number> {
  if (storageKind() === "redis") {
    const count = Number(await redis(["INCR", key]));
    if (count === 1) await redis(["EXPIRE", key, String(windowSeconds)]);
    return count;
  }
  const current = Number(memoryGet(key) ?? 0) + 1;
  const existing = memory.get(key);
  memory.set(key, {
    value: String(current),
    expiresAt: existing?.expiresAt ?? Date.now() + windowSeconds * 1000,
  });
  return current;
}

/** Test seam: clears the in-process store. No effect against a real backend. */
export function __resetMemoryStore(): void {
  memory.clear();
}
