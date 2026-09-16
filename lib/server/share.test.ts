import { beforeEach, describe, expect, it } from "vitest";
import {
  isValidState,
  isValidToken,
  readShareRecord,
  revokeShareRecord,
  writeShareRecord,
} from "./share";
import { __resetMemoryStore } from "./store";

/**
 * The share record is the only server state this app has. These tests hold the
 * line on what it may contain and who may change it.
 */

// No "1": the generator excludes look-alike characters, and so does the
// validator. The design mockup showed "aq7f-2p1k-9xm", which this stricter
// alphabet would never produce.
const TOKEN = "aq7f-2pxk-9xmb";
const SECRET = "s".repeat(32);
const OTHER_SECRET = "x".repeat(32);

beforeEach(() => {
  __resetMemoryStore();
});

describe("token validation", () => {
  it("accepts the shape generateShareToken produces", () => {
    expect(isValidToken("abcd-efgh-jkmn")).toBe(true);
  });

  it("rejects anything else", () => {
    for (const bad of [
      "",
      "abc-defg-hjkm", // wrong group length
      "abcd-efgh", // too few groups
      "abcd-efgh-jkmn-pqrs", // too many
      "abcdefghjkmn", // no separators
      "ABCD-EFGH-JKMN", // uppercase
      "abcd-efgh-jkm1", // excluded look-alike
      "../../etc/passwd",
      null,
      42,
    ]) {
      expect(isValidToken(bad), String(bad)).toBe(false);
    }
  });

  it("accepts only the two states the page can render", () => {
    expect(isValidState("haid")).toBe(true);
    expect(isValidState("suci")).toBe(true);
    for (const bad of ["istihadhah", "nifas", "", null, 1]) {
      expect(isValidState(bad), String(bad)).toBe(false);
    }
  });
});

describe("publishing", () => {
  it("stores and reads back one bit", async () => {
    expect(await writeShareRecord(TOKEN, "haid", SECRET)).toEqual({ ok: true });
    const record = await readShareRecord(TOKEN);
    expect(record?.state).toBe("haid");
    expect(record?.updatedAt).toBeTruthy();
  });

  it("never returns the write secret to a reader", async () => {
    await writeShareRecord(TOKEN, "haid", SECRET);
    const record = await readShareRecord(TOKEN);
    expect(JSON.stringify(record)).not.toContain(SECRET);
    expect(Object.keys(record ?? {}).sort()).toEqual(["state", "updatedAt"]);
  });

  it("lets the owner update the status", async () => {
    await writeShareRecord(TOKEN, "haid", SECRET);
    await writeShareRecord(TOKEN, "suci", SECRET);
    expect((await readShareRecord(TOKEN))?.state).toBe("suci");
  });

  it("refuses a write from someone who only holds the link", async () => {
    await writeShareRecord(TOKEN, "haid", SECRET);
    expect(await writeShareRecord(TOKEN, "suci", OTHER_SECRET)).toEqual({
      ok: false,
      reason: "forbidden",
    });
    // And the real status is untouched.
    expect((await readShareRecord(TOKEN))?.state).toBe("haid");
  });

  it("rejects a malformed token or state", async () => {
    expect(await writeShareRecord("nope", "haid", SECRET)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(
      await writeShareRecord(TOKEN, "istihadhah" as "haid", SECRET),
    ).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a weak write secret", async () => {
    expect(await writeShareRecord(TOKEN, "haid", "short")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});

describe("reading", () => {
  it("returns nothing for a token that was never published", async () => {
    expect(await readShareRecord("zzzz-zzzz-zzzz")).toBeNull();
  });

  it("returns nothing for a malformed token", async () => {
    expect(await readShareRecord("../secrets")).toBeNull();
  });
});

describe("revocation", () => {
  it("makes the link stop resolving immediately", async () => {
    await writeShareRecord(TOKEN, "haid", SECRET);
    expect(await revokeShareRecord(TOKEN, SECRET)).toEqual({ ok: true });
    expect(await readShareRecord(TOKEN)).toBeNull();
  });

  it("cannot be triggered by someone holding only the link", async () => {
    await writeShareRecord(TOKEN, "haid", SECRET);
    expect(await revokeShareRecord(TOKEN, OTHER_SECRET)).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(await readShareRecord(TOKEN)).not.toBeNull();
  });

  it("is idempotent", async () => {
    expect(await revokeShareRecord(TOKEN, SECRET)).toEqual({ ok: true });
  });

  it("frees the token for a fresh claim after revocation", async () => {
    await writeShareRecord(TOKEN, "haid", SECRET);
    await revokeShareRecord(TOKEN, SECRET);
    // Rotating produces a new token in practice, but a reclaimed one must not
    // stay locked to the old secret.
    expect(await writeShareRecord(TOKEN, "suci", OTHER_SECRET)).toEqual({
      ok: true,
    });
  });
});
