/**
 * PIN-derived encryption for the local vault.
 *
 * Onboarding tells the user two things: that their notes live on this phone
 * and are locked by the PIN, and that the PIN cannot be recovered because it
 * is never sent anywhere. This module is what makes both statements true.
 *
 * The PIN never leaves the device and is never stored. It is stretched with
 * PBKDF2-SHA-256 into an AES-GCM key, and only the ciphertext, salt and IV
 * are written to localStorage. Forgetting the PIN really does mean the data
 * is gone — there is no recovery path here, by design.
 *
 * What this does NOT defend against: someone who already has code execution
 * on the device while the app is unlocked. Browser storage has no secure
 * enclave. The threat model is a shared or borrowed phone, which is the one
 * the design's copy is actually addressing.
 */

const PBKDF2_ITERATIONS = 310_000; // OWASP's 2023 floor for PBKDF2-SHA256
const SALT_BYTES = 16;
const IV_BYTES = 12;

function subtle(): SubtleCrypto {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error(
      "WebCrypto tidak tersedia. Suci memerlukan koneksi aman (https) untuk mengunci datamu.",
    );
  }
  return crypto.subtle;
}

export function isCryptoAvailable(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await subtle().importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle().deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface SealedBox {
  v: 1;
  salt: string;
  iv: string;
  data: string;
}

export async function seal(plaintext: string, pin: string): Promise<SealedBox> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(pin, salt);
  const ciphertext = await subtle().encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    v: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(ciphertext)),
  };
}

/**
 * Returns null on a wrong PIN. AES-GCM authenticates, so a bad key fails the
 * tag check rather than producing garbage — which is what lets the lock screen
 * tell "wrong PIN" apart from "corrupted vault".
 */
export async function open(
  box: SealedBox,
  pin: string,
): Promise<string | null> {
  try {
    const salt = fromBase64(box.salt);
    const iv = fromBase64(box.iv);
    const key = await deriveKey(pin, salt);
    const plain = await subtle().decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      fromBase64(box.data) as BufferSource,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/* =========================================================================
   Sharing: a key the server never gets.
   =========================================================================

   Two separate keys, and the separation is the point.

   The vault key above is derived from the PIN and belongs to one person. The
   share key below is generated fresh from the CSPRNG for one share session and
   is derived from nothing — not the PIN, not the vault key, not the shareId.
   Deriving it from the master key would mean handing a reader something with a
   mathematical relationship to everything else she owns; the whole design
   rests on that relationship not existing.

   The share key travels in the URL fragment, which browsers never put on the
   wire — not in the request line, not in Referer. So the server that stores
   the ciphertext is handed no way to read it, whatever it is later compelled
   or tempted to do with what it holds.

   What this does not hide is in `lib/share/payload.ts`, stated plainly,
   because a claim of encryption that quietly leaves out the metadata is worse
   than no claim at all.
   ------------------------------------------------------------------------- */

const SHARE_ID_BYTES = 18; // 24 base64url characters, no padding

/** Matches `generateShareId`. */
export const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{24}$/;
/** Matches an exported 256-bit AES key. */
export const SHARE_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/**
 * The name of a share session on the server.
 *
 * Not a cryptographic secret — it is in the path, so the server sees it, and
 * it protects nothing on its own. Its job is only to be unguessable enough
 * that nobody enumerates the store. 144 bits of CSPRNG output does that with
 * room to spare.
 */
export function generateShareId(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(SHARE_ID_BYTES)));
}

/** A fresh AES-256-GCM key for one share session. Extractable: it has to */
/** leave, into the link fragment, or the reader could never decrypt. */
export async function generateShareKey(): Promise<string> {
  const key = await subtle().generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const raw = await subtle().exportKey("raw", key);
  return toBase64Url(new Uint8Array(raw));
}

async function importShareKey(keyB64: string): Promise<CryptoKey> {
  return subtle().importKey(
    "raw",
    fromBase64Url(keyB64) as BufferSource,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Ciphertext and its IV, which is all the server is ever given. */
export interface SealedShare {
  ct: string;
  iv: string;
}

export async function sealWithShareKey(
  plaintext: string,
  keyB64: string,
): Promise<SealedShare> {
  // A fresh IV per encryption. Reusing one under the same key breaks GCM
  // catastrophically — it leaks the XOR of the plaintexts and the auth key —
  // and statuses are republished under one key many times over its life.
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await subtle().encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    await importShareKey(keyB64),
    new TextEncoder().encode(plaintext),
  );
  return { ct: toBase64Url(new Uint8Array(ciphertext)), iv: toBase64Url(iv) };
}

/** Null when the key is wrong or the ciphertext was tampered with. */
export async function openWithShareKey(
  sealed: SealedShare,
  keyB64: string,
): Promise<string | null> {
  try {
    const plain = await subtle().decrypt(
      { name: "AES-GCM", iv: fromBase64Url(sealed.iv) as BufferSource },
      await importShareKey(keyB64),
      fromBase64Url(sealed.ct) as BufferSource,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

/** A write secret, so holding the link does not mean being able to change it. */
export function generateShareSecret(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(24)));
}

export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return fromBase64(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
}
