import { beforeEach, describe, expect, it } from "vitest";
import { GET as readToken } from "./[token]/route";
import { GET as health, POST } from "./route";
import { __resetMemoryStore } from "@/lib/server/store";

/**
 * These tests exist because of a real failure: a freshly created link opened to
 * "Tautan ini tidak berlaku". The record was missing because the deployment had
 * no durable storage, and the endpoint reported that as 404 — which the reader
 * page renders as an accusation that the owner revoked the link.
 *
 * The rule these tests hold: a miss only means "not found" when there was
 * somewhere real to look.
 */

const TOKEN = "aq7f-2pxk-9xmb";
const SECRET = "s".repeat(32);

function request(url = "http://localhost/api/share", init?: RequestInit) {
  return new Request(url, init);
}

function params(token: string) {
  return { params: Promise.resolve({ token }) };
}

beforeEach(() => {
  __resetMemoryStore();
  // No KV variables are set in the test environment, so storageKind() is
  // "memory" throughout — the exact condition the deployment was in.
});

describe("reading a share status without durable storage", () => {
  it("says the service cannot answer, not that the link is invalid", async () => {
    const res = await readToken(request(), params(TOKEN));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "storage_unavailable" });
  });

  it("still answers a record it can actually see", async () => {
    await POST(
      request("http://localhost/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: TOKEN, state: "haid", secret: SECRET }),
      }),
    );

    const res = await readToken(request(), params(TOKEN));
    expect(res.status).toBe(200);
    expect((await res.json()).state).toBe("haid");
  });

  it("never caches an answer about someone's status", async () => {
    const res = await readToken(request(), params(TOKEN));
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
});

describe("telling the owner before she hands out the link", () => {
  it("reports the storage kind on the health endpoint", async () => {
    const res = await health();
    expect(await res.json()).toEqual({ storage: "memory", durable: false });
  });

  it("reports it on the write that was meant to make the link work", async () => {
    const res = await POST(
      request("http://localhost/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: TOKEN, state: "suci", secret: SECRET }),
      }),
    );
    expect(await res.json()).toEqual({ ok: true, storage: "memory" });
  });

  it("leaks nothing about users through the health endpoint", async () => {
    const body = (await (await health()).json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["durable", "storage"]);
  });
});
