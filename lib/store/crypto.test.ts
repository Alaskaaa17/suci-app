import { describe, expect, it } from "vitest";
import {
  fromBase64Url,
  generateShareId,
  generateShareKey,
  generateShareSecret,
  openWithShareKey,
  sealWithShareKey,
  SHARE_ID_PATTERN,
  SHARE_KEY_PATTERN,
  toBase64Url,
} from "./crypto";
import { encodePayload, type SharePayload } from "@/lib/share/payload";

/**
 * The share link is the only place Suci hands anything to anyone. The server
 * relaying it must not be able to read it, and the person holding it must not
 * be able to reach anything else she owns. Both claims are asserted here
 * rather than assumed.
 */

const payload = (state: "haid" | "suci"): SharePayload => ({
  v: 1,
  state,
  updatedAt: "2026-09-16T00:00:00.000Z",
});

describe("shareId", () => {
  it("is 18 random bytes as base64url", () => {
    for (let i = 0; i < 50; i++) {
      const id = generateShareId();
      expect(id).toMatch(SHARE_ID_PATTERN);
      expect(fromBase64Url(id).length).toBe(18);
    }
  });

  it("is URL-safe, so it survives being a path segment", () => {
    const ids = Array.from({ length: 200 }, generateShareId).join("");
    for (const unsafe of ["+", "/", "=", "?", "#", "%"]) {
      expect(ids).not.toContain(unsafe);
    }
  });

  it("does not repeat", () => {
    const seen = new Set(Array.from({ length: 500 }, generateShareId));
    expect(seen.size).toBe(500);
  });
});

describe("the share key", () => {
  it("cannot be derived from anything, because it takes nothing", () => {
    // Structural, and the most important assertion in this file. A key that
    // accepted the PIN or the vault key as an argument could be derived from
    // them, and then handing a reader the link would hand them a foothold into
    // everything else she owns. It takes no arguments, so it cannot.
    expect(generateShareKey.length).toBe(0);
  });

  it("is an exported 256-bit AES key", async () => {
    const key = await generateShareKey();
    expect(key).toMatch(SHARE_KEY_PATTERN);
    expect(fromBase64Url(key).length).toBe(32);
  });

  it("is fresh every time", async () => {
    const keys = await Promise.all(
      Array.from({ length: 50 }, () => generateShareKey()),
    );
    expect(new Set(keys).size).toBe(50);
  });
});

describe("sealing a payload", () => {
  it("round-trips", async () => {
    const key = await generateShareKey();
    const sealed = await sealWithShareKey(encodePayload(payload("haid")), key);
    expect(await openWithShareKey(sealed, key)).toBe(
      encodePayload(payload("haid")),
    );
  });

  it("leaves nothing readable in the ciphertext", async () => {
    const key = await generateShareKey();
    const sealed = await sealWithShareKey(encodePayload(payload("haid")), key);
    const blob = JSON.stringify(sealed);
    for (const word of ["haid", "suci", "state", "2026"]) {
      expect(blob).not.toContain(word);
    }
  });

  it("uses a fresh IV every time", async () => {
    // Reusing an IV under one AES-GCM key is catastrophic — it leaks the XOR
    // of the plaintexts and the authentication key. A status is republished
    // under the same key many times over a link's life, so this is the
    // property that makes that safe.
    const key = await generateShareKey();
    const ivs = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ivs.add((await sealWithShareKey("same plaintext", key)).iv);
    }
    expect(ivs.size).toBe(100);
  });

  it("produces different ciphertext for the same plaintext", async () => {
    const key = await generateShareKey();
    const a = await sealWithShareKey("same", key);
    const b = await sealWithShareKey("same", key);
    expect(a.ct).not.toBe(b.ct);
  });

  it("does not leak the state through ciphertext length", async () => {
    // The server sees how long the blob is. Both states must look identical,
    // or the encryption is decorative.
    const key = await generateShareKey();
    const haid = await sealWithShareKey(encodePayload(payload("haid")), key);
    const suci = await sealWithShareKey(encodePayload(payload("suci")), key);
    expect(haid.ct.length).toBe(suci.ct.length);
  });

  it("returns null for the wrong key rather than garbage", async () => {
    const sealed = await sealWithShareKey("secret", await generateShareKey());
    expect(await openWithShareKey(sealed, await generateShareKey())).toBeNull();
  });

  it("returns null for tampered ciphertext", async () => {
    // GCM authenticates. A relay that flipped a bit to turn "haid" into
    // "suci" must fail the tag check, not succeed quietly.
    const key = await generateShareKey();
    const sealed = await sealWithShareKey("secret", key);
    const flipped = {
      ...sealed,
      ct: sealed.ct.slice(0, -1) + (sealed.ct.at(-1) === "A" ? "B" : "A"),
    };
    expect(await openWithShareKey(flipped, key)).toBeNull();
  });

  it("returns null for a tampered IV", async () => {
    const key = await generateShareKey();
    const sealed = await sealWithShareKey("secret", key);
    const other = await sealWithShareKey("secret", key);
    expect(await openWithShareKey({ ...sealed, iv: other.iv }, key)).toBeNull();
  });
});

describe("the write secret", () => {
  it("is long enough that guessing is not a strategy", () => {
    const secret = generateShareSecret();
    expect(fromBase64Url(secret).length).toBe(24);
    expect(new Set(Array.from({ length: 200 }, generateShareSecret)).size).toBe(
      200,
    );
  });
});

describe("base64url", () => {
  it("round-trips arbitrary bytes", () => {
    for (let len = 0; len < 40; len++) {
      const bytes = crypto.getRandomValues(new Uint8Array(len));
      expect([...fromBase64Url(toBase64Url(bytes))]).toEqual([...bytes]);
    }
  });

  it("emits no character that needs escaping in a URL", () => {
    const encoded = toBase64Url(crypto.getRandomValues(new Uint8Array(3000)));
    expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
  });
});
