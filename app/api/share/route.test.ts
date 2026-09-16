import { beforeEach, describe, expect, it } from "vitest";
import { DELETE, GET as readSession, PUT } from "./[token]/route";
import { GET as health } from "./route";
import { __resetMemoryStore } from "@/lib/server/store";

/**
 * Two things these tests are for.
 *
 * The first is the guarantee: nothing legible about a status may pass through
 * this API. The envelope in, the envelope out, and no field anywhere that a
 * server operator could read.
 *
 * The second is a real failure. A freshly created link once opened to "Tautan
 * ini tidak berlaku" because the record was missing — the deployment had no
 * durable storage — and the endpoint reported that as 404, which the reader
 * page renders as an accusation that the owner revoked it. A miss only means
 * "not found" when there was somewhere real to look.
 */

const ID = "Zm9vYmFyMTIzNDU2Nzg5MDEy";
const SECRET = "s".repeat(32);
const CT = "Q2lwaGVydGV4dEhlcmU";
const IV = "MTIzNDU2Nzg5MDEy";

function request(body?: unknown, method = "GET") {
  return new Request(`http://localhost/api/share/${ID}`, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
}

const params = (id = ID) => ({ params: Promise.resolve({ token: id }) });

const put = (body: unknown, id = ID) => PUT(request(body, "PUT"), params(id));

beforeEach(() => {
  __resetMemoryStore();
  // No KV variables are set in the test environment, so storageKind() is
  // "memory" throughout — the exact condition the deployment was in.
});

describe("the server stays blind", () => {
  it("accepts and returns only the sealed envelope", async () => {
    await put({ ct: CT, iv: IV, secret: SECRET });
    const res = await readSession(request(), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ct: CT,
      iv: IV,
      updatedAt: expect.any(String),
    });
  });

  it("refuses a request that carries a readable status", async () => {
    // The shape an accidental refactor would produce: a convenient plaintext
    // field riding alongside. There must be nowhere for it to land.
    const res = await put({
      ct: CT,
      iv: IV,
      secret: SECRET,
      state: "haid",
    });
    expect(res.status).toBe(200);
    const stored = await (await readSession(request(), params())).json();
    expect(stored).not.toHaveProperty("state");
    expect(JSON.stringify(stored)).not.toContain("haid");
  });

  it("refuses a malformed envelope", async () => {
    expect((await put({ ct: CT, secret: SECRET })).status).toBe(400);
    expect((await put({ iv: IV, secret: SECRET })).status).toBe(400);
    expect((await put({ ct: CT, iv: "nope", secret: SECRET })).status).toBe(400);
    expect((await put({ ct: CT, iv: IV })).status).toBe(400);
  });

  it("refuses a shareId that is not one of ours", async () => {
    expect((await put({ ct: CT, iv: IV, secret: SECRET }, "../x")).status).toBe(
      400,
    );
  });
});

describe("holding the link is not holding the pen", () => {
  it("gives 403 to a write with the wrong secret", async () => {
    await put({ ct: CT, iv: IV, secret: SECRET });
    const res = await put({ ct: "Rm9yZ2Vk", iv: IV, secret: "z".repeat(32) });
    expect(res.status).toBe(403);
  });

  it("gives 403 to a deletion with the wrong secret", async () => {
    await put({ ct: CT, iv: IV, secret: SECRET });
    const res = await DELETE(
      request({ secret: "z".repeat(32) }, "DELETE"),
      params(),
    );
    expect(res.status).toBe(403);
  });

  it("lets the owner revoke, and the link stops resolving", async () => {
    await put({ ct: CT, iv: IV, secret: SECRET });
    expect(
      (await DELETE(request({ secret: SECRET }, "DELETE"), params())).status,
    ).toBe(200);
    // Storage is the in-process fallback here, so a miss is reported as 503
    // rather than 404 — see the next block. Either way the envelope is gone.
    const res = await readSession(request(), params());
    expect(res.status).not.toBe(200);
  });
});

describe("reading a session without durable storage", () => {
  it("says the service cannot answer, not that the link is invalid", async () => {
    const res = await readSession(request(), params());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "storage_unavailable" });
  });

  it("never caches an answer about someone's status", async () => {
    const res = await readSession(request(), params());
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
});

describe("telling the owner before she hands out the link", () => {
  it("reports the storage kind on the health endpoint", async () => {
    expect(await (await health()).json()).toEqual({
      storage: "memory",
      durable: false,
    });
  });

  it("reports it on the write that was meant to make the link work", async () => {
    const res = await put({ ct: CT, iv: IV, secret: SECRET });
    expect(await res.json()).toEqual({ ok: true, storage: "memory" });
  });

  it("leaks nothing about users through the health endpoint", async () => {
    const body = (await (await health()).json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["durable", "storage"]);
  });
});
