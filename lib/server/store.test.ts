import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetMemoryStore,
  kvDelete,
  kvGet,
  kvIncrementWindow,
  kvSet,
  storageKind,
} from "./store";

/**
 * Edge Config is a config store being used as a database, so everything the
 * platform would normally provide — expiry, key syntax, cleanup — is this
 * file's job instead. These tests are what say it is actually done.
 */

const CONNECTION = "https://edge-config.vercel.com/ecfg_test?token=readtok";

interface Call {
  url: string;
  init?: RequestInit;
}

let calls: Call[];
/** The fake Edge Config contents, keyed as the platform would key them. */
let store: Record<string, unknown>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function useEdgeConfig() {
  process.env.EDGE_CONFIG = CONNECTION;
  process.env.VERCEL_API_TOKEN = "writetok";

  vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });

    if (url.startsWith("https://api.vercel.com/")) {
      const body = JSON.parse(String(init?.body)) as {
        items: Array<{ operation: string; key: string; value?: unknown }>;
      };
      for (const item of body.items) {
        if (item.operation === "delete") {
          if (!(item.key in store)) return jsonResponse({ error: "no" }, 400);
          delete store[item.key];
        } else {
          store[item.key] = item.value;
        }
      }
      return jsonResponse({ status: "ok" });
    }

    const path = new URL(url).pathname.replace("/ecfg_test/", "");
    if (path === "items") return jsonResponse(store);
    const key = decodeURIComponent(path.replace("item/", ""));
    if (!(key in store)) return jsonResponse({ error: "not found" }, 404);
    return jsonResponse(store[key]);
  });
}

beforeEach(() => {
  calls = [];
  store = {};
  __resetMemoryStore();
  delete process.env.EDGE_CONFIG;
  delete process.env.VERCEL_API_TOKEN;
  delete process.env.VERCEL_TEAM_ID;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete process.env.EDGE_CONFIG;
  delete process.env.VERCEL_API_TOKEN;
  delete process.env.VERCEL_TEAM_ID;
});

describe("choosing a backend", () => {
  it("falls back to memory with nothing provisioned", () => {
    expect(storageKind()).toBe("memory");
  });

  it("needs both halves of Edge Config before claiming it", () => {
    process.env.EDGE_CONFIG = CONNECTION;
    // Reading without writing is not a store: the link would resolve to
    // whatever was there before and never change again.
    expect(storageKind()).toBe("memory");
    process.env.VERCEL_API_TOKEN = "writetok";
    expect(storageKind()).toBe("edge-config");
  });

  it("prefers Redis when both are configured", () => {
    process.env.EDGE_CONFIG = CONNECTION;
    process.env.VERCEL_API_TOKEN = "writetok";
    process.env.KV_REST_API_URL = "https://example.upstash.io";
    process.env.KV_REST_API_TOKEN = "t";
    expect(storageKind()).toBe("redis");
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });
});

describe("Edge Config as a store", () => {
  beforeEach(useEdgeConfig);

  it("round-trips a value", async () => {
    await kvSet("share:aq7f-2pxk-9xmb", "hello", 60);
    expect(await kvGet("share:aq7f-2pxk-9xmb")).toBe("hello");
  });

  it("rewrites the colon Edge Config keys do not allow", async () => {
    await kvSet("share:aq7f-2pxk-9xmb", "hello", 60);
    expect(Object.keys(store)).toEqual(["share_aq7f-2pxk-9xmb"]);
  });

  it("returns null for a key that was never written", async () => {
    expect(await kvGet("share:aq7f-2pxk-9xmb")).toBeNull();
  });

  it("expires a value itself, since the platform will not", async () => {
    vi.useFakeTimers();
    await kvSet("share:aq7f-2pxk-9xmb", "hello", 60);
    vi.advanceTimersByTime(61_000);
    expect(await kvGet("share:aq7f-2pxk-9xmb")).toBeNull();
  });

  it("sweeps expired keys on the next write, so the store cannot fill", async () => {
    vi.useFakeTimers();
    await kvSet("share:aaaa-bbbb-cccc", "old", 60);
    vi.advanceTimersByTime(61_000);
    await kvSet("share:dddd-eeee-ffff", "new", 60);
    expect(Object.keys(store)).toEqual(["share_dddd-eeee-ffff"]);
  });

  it("deletes on revocation", async () => {
    await kvSet("share:aq7f-2pxk-9xmb", "hello", 60);
    await kvDelete("share:aq7f-2pxk-9xmb");
    expect(await kvGet("share:aq7f-2pxk-9xmb")).toBeNull();
  });

  it("treats deleting an absent key as done, not as a failure", async () => {
    // Vercel answers 400. Revocation must not appear to fail because the
    // record had already expired on its own.
    await expect(kvDelete("share:aq7f-2pxk-9xmb")).resolves.toBeUndefined();
  });

  it("never sends the write token to the read host", async () => {
    await kvSet("share:aq7f-2pxk-9xmb", "hello", 60);
    await kvGet("share:aq7f-2pxk-9xmb");
    const reads = calls.filter((c) => c.url.includes("edge-config.vercel.com"));
    expect(reads.length).toBeGreaterThan(0);
    for (const read of reads) {
      const auth = (read.init?.headers as Record<string, string>)?.Authorization;
      expect(auth).toBe("Bearer readtok");
    }
  });

  it("keeps the read token out of the URL", async () => {
    await kvGet("share:aq7f-2pxk-9xmb");
    for (const call of calls) expect(call.url).not.toContain("readtok");
  });

  it("passes a team id only when there is one", async () => {
    await kvSet("share:aq7f-2pxk-9xmb", "hello", 60);
    expect(calls.at(-1)!.url).not.toContain("teamId");

    process.env.VERCEL_TEAM_ID = "team_abc";
    await kvSet("share:aq7f-2pxk-9xmb", "hello", 60);
    expect(calls.at(-1)!.url).toContain("teamId=team_abc");
  });

  it("does not spend a write on every rate-limit check", async () => {
    calls = [];
    for (let i = 0; i < 5; i++) await kvIncrementWindow("rl:r:abc", 600);
    // A counter written per request would exhaust the write budget in minutes
    // and take the whole share feature down with it.
    expect(calls).toEqual([]);
    expect(await kvIncrementWindow("rl:r:abc", 600)).toBe(6);
  });
});
