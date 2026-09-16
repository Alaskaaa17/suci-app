import { beforeEach, describe, expect, it } from "vitest";
import {
  isValidShareId,
  readShareRecord,
  revokeShareRecord,
  SHARE_TTL_SECONDS,
  writeShareRecord,
} from "./share";
import { __resetMemoryStore } from "./store";

/**
 * The share row is the only server state this app has, and the whole design
 * rests on it being unreadable. These tests hold that line: what may be in the
 * row, who may change it, and that nothing legible ever lands there.
 */

const ID = "Zm9vYmFyMTIzNDU2Nzg5MDEy"; // 24 base64url chars
const OTHER_ID = "YWJjZGVmZ2hpamtsbW5vcHFy";
const SECRET = "s".repeat(32);
const OTHER_SECRET = "x".repeat(32);
const CT = "Q2lwaGVydGV4dEhlcmU";
const IV = "MTIzNDU2Nzg5MDEyMzQ1Ng"; // 16 chars = 12 bytes
const IV12 = "MTIzNDU2Nzg5MDEy"; // exactly 16 base64url chars

const envelope = { ct: CT, iv: IV12 };

beforeEach(() => {
  __resetMemoryStore();
});

describe("shareId validation", () => {
  it("accepts the shape generateShareId produces", () => {
    expect(isValidShareId(ID)).toBe(true);
  });

  it("rejects anything else", () => {
    for (const bad of [
      "",
      "short",
      `${ID}x`, // too long
      ID.slice(0, 23), // too short
      "Zm9vYmFyMTIzNDU2Nzg5MDE+", // '+' is base64, not base64url
      "Zm9vYmFyMTIzNDU2Nzg5MDE/",
      "../secrets",
      "aq7f-2pxk-9xmb", // the pre-encryption shape
      null,
      42,
    ]) {
      expect(isValidShareId(bad), String(bad)).toBe(false);
    }
  });
});

describe("what the row may contain", () => {
  it("round-trips an envelope", async () => {
    expect(await writeShareRecord(ID, envelope, SECRET)).toEqual({ ok: true });
    const record = await readShareRecord(ID);
    expect(record).toMatchObject({ ct: CT, iv: IV12 });
  });

  it("returns only ciphertext, IV and a timestamp", async () => {
    await writeShareRecord(ID, envelope, SECRET);
    const record = await readShareRecord(ID);
    // The write secret's hash is server-side bookkeeping. If it ever appears
    // here, anyone holding the link could brute-force their way to writing.
    expect(Object.keys(record!).sort()).toEqual(["ct", "iv", "updatedAt"]);
  });

  it("refuses an IV that is not 12 bytes", async () => {
    for (const iv of ["", "short", `${IV12}xx`, IV]) {
      expect(await writeShareRecord(ID, { ct: CT, iv }, SECRET)).toEqual({
        ok: false,
        reason: "invalid",
      });
    }
  });

  it("refuses ciphertext that is not base64url", async () => {
    for (const ct of ["", "has spaces", "has/slash", "has+plus", "{}"]) {
      expect(await writeShareRecord(ID, { ct, iv: IV12 }, SECRET)).toEqual({
        ok: false,
        reason: "invalid",
      });
    }
  });

  it("caps the ciphertext, so the row is not free file hosting", async () => {
    const huge = "A".repeat(1025);
    expect(await writeShareRecord(ID, { ct: huge, iv: IV12 }, SECRET)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("expires within a fortnight", () => {
    expect(SHARE_TTL_SECONDS).toBe(14 * 24 * 60 * 60);
  });
});

describe("holding the link is not holding the pen", () => {
  it("lets the owner overwrite her own row", async () => {
    await writeShareRecord(ID, envelope, SECRET);
    const second = { ct: "U2Vjb25kV3JpdGU", iv: IV12 };
    expect(await writeShareRecord(ID, second, SECRET)).toEqual({ ok: true });
    expect((await readShareRecord(ID))?.ct).toBe("U2Vjb25kV3JpdGU");
  });

  it("refuses a write from someone who only has the link", async () => {
    await writeShareRecord(ID, envelope, SECRET);
    // The reader holds the shareId AND the key, so they could produce valid
    // ciphertext. The write secret is the only thing stopping them.
    expect(
      await writeShareRecord(ID, { ct: "Rm9yZ2Vk", iv: IV12 }, OTHER_SECRET),
    ).toEqual({ ok: false, reason: "forbidden" });
    expect((await readShareRecord(ID))?.ct).toBe(CT);
  });

  it("refuses a deletion from someone who only has the link", async () => {
    await writeShareRecord(ID, envelope, SECRET);
    expect(await revokeShareRecord(ID, OTHER_SECRET)).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(await readShareRecord(ID)).not.toBeNull();
  });

  it("rejects a short secret outright", async () => {
    expect(await writeShareRecord(ID, envelope, "short")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("does not let one session's secret touch another", async () => {
    await writeShareRecord(ID, envelope, SECRET);
    await writeShareRecord(OTHER_ID, envelope, OTHER_SECRET);
    expect(await revokeShareRecord(OTHER_ID, SECRET)).toEqual({
      ok: false,
      reason: "forbidden",
    });
  });
});

describe("revocation", () => {
  it("takes the row away immediately", async () => {
    await writeShareRecord(ID, envelope, SECRET);
    expect(await revokeShareRecord(ID, SECRET)).toEqual({ ok: true });
    expect(await readShareRecord(ID)).toBeNull();
  });

  it("is idempotent", async () => {
    await writeShareRecord(ID, envelope, SECRET);
    await revokeShareRecord(ID, SECRET);
    expect(await revokeShareRecord(ID, SECRET)).toEqual({ ok: true });
  });

  it("still accepts a pre-encryption shareId, so upgrading orphans nothing", async () => {
    // Old rows cannot be written to any more, but they can still be live on
    // the server. The app must be able to honour "matikan Mode Suami" for
    // them rather than leaving a URL that answers for another week.
    expect(await revokeShareRecord("aq7f-2pxk-9xmb", SECRET)).toEqual({
      ok: true,
    });
  });

  it("does not accept a pre-encryption shareId for reads or writes", async () => {
    expect(await readShareRecord("aq7f-2pxk-9xmb")).toBeNull();
    expect(await writeShareRecord("aq7f-2pxk-9xmb", envelope, SECRET)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});
