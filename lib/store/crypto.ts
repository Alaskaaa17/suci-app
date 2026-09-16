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

/**
 * A share token for husband mode: short, readable, unguessable.
 *
 * Drawn by rejection sampling rather than `byte % alphabet.length`. With a
 * 31-character alphabet, 256 is not a multiple of 31, so the modulo shortcut
 * makes the first eight letters about 3% more likely than the rest. The bias
 * is small, but this is the only thing standing between a guessed URL and
 * someone's cycle status, so it is drawn uniformly.
 */
export function generateShareToken(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alikes
  const LENGTH = 12;
  // Largest multiple of the alphabet that fits in a byte; anything at or above
  // it is discarded and redrawn.
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;

  const chars: string[] = [];
  while (chars.length < LENGTH) {
    const batch = crypto.getRandomValues(new Uint8Array(LENGTH));
    for (const b of batch) {
      if (b >= limit) continue;
      chars.push(alphabet[b % alphabet.length]);
      if (chars.length === LENGTH) break;
    }
  }

  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars
    .slice(8, 12)
    .join("")}`;
}
