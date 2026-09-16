import { afterEach, describe, expect, it, vi } from "vitest";
import { keyFromLink } from "./share-client";

/**
 * Links do not arrive the way they were sent.
 *
 * These cases are all real shapes a share link takes after passing through a
 * paste, a chat app or a "link cleaner". The page must recover the key where
 * the key is genuinely there, and must never invent one where it is not — a
 * wrong key that decrypts to nothing is a better outcome than a confident
 * wrong answer, but a blank page for an intact link is the worst of the three
 * and is what this file exists to stop.
 */

const ID = "vJPR6UwI8ARcH1_3SJ0Hx7-s";
const KEY = "d5IES_XqFIt2Ykx2genRjn-eXfqi8HtgSVjUQ5uy0dw";
const ORIGIN = "https://suci-app-ruby.vercel.app";

function atLocation(hash: string, search = "") {
  vi.stubGlobal("window", { location: { hash, search } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("finding the key in a link", () => {
  it("reads a clean link", () => {
    atLocation(`#k=${KEY}`);
    expect(keyFromLink()).toEqual({ key: KEY, exposed: false });
  });

  it("recovers the key when the whole URL was pasted twice", () => {
    // The case that actually happened: pasting into a box that already held
    // the link. `URLSearchParams` reports a 90-character value here and the
    // page used to tell the reader their link was "copied halfway" — wrong,
    // and not something they could act on. The key is right there.
    atLocation(`#k=${KEY}${ORIGIN}/s/${ID}#k=${KEY}`);
    expect(keyFromLink()).toEqual({ key: KEY, exposed: false });
  });

  it("recovers the key with trailing punctuation from a chat app", () => {
    for (const tail of [")", ".", ",", '"', " — lihat ya"]) {
      atLocation(`#k=${KEY}${tail}`);
      expect(keyFromLink().key, tail).toBe(KEY);
    }
  });

  it("recovers the key when other fragment parameters surround it", () => {
    atLocation(`#utm=wa&k=${KEY}&ref=x`);
    expect(keyFromLink().key).toBe(KEY);
  });

  it("does not mistake the shareId for a key", () => {
    // 24 characters, same alphabet, sitting in the same string.
    atLocation(`#id=${ID}`);
    expect(keyFromLink().key).toBeNull();
  });

  it("reports no key rather than a truncated one", () => {
    atLocation(`#k=${KEY.slice(0, 20)}`);
    expect(keyFromLink()).toEqual({ key: null, exposed: false });
  });

  it("reports no key for an empty fragment", () => {
    atLocation("");
    expect(keyFromLink()).toEqual({ key: null, exposed: false });
  });
});

describe("a key that reached the server", () => {
  it("is used, but flagged", () => {
    // Some apps rewrite `#` to `?`. The key is then in the request line, so it
    // has already been handed to the server and anything logging for it.
    // Refusing to show the status would punish the reader for something
    // neither of them did; saying nothing would leave a burned link in use.
    atLocation("", `?k=${KEY}`);
    expect(keyFromLink()).toEqual({ key: KEY, exposed: true });
  });

  it("prefers the fragment when both are present", () => {
    atLocation(`#k=${KEY}`, `?k=${"A".repeat(43)}`);
    expect(keyFromLink()).toEqual({ key: KEY, exposed: false });
  });
});
