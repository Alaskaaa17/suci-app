/**
 * ============================================================================
 *  WHAT TRAVELS INSIDE THE ENVELOPE.
 * ============================================================================
 *
 *  The server holds ciphertext and cannot read this. That is not a licence to
 *  put more in it.
 *
 *  Encryption protects the payload from the server operator. It does not
 *  protect it from the person the link was given to — they hold the key, that
 *  is the whole point of giving it to them. Mode Suami promises one thing on
 *  screen: whether she is haid or suci today. Anything added here is something
 *  a husband can read that she was not told she was handing over, and "the
 *  server cannot see it" is no answer to that.
 *
 *  So: no dates of onset, no symptoms, no notes, no history, no predictions,
 *  no name. `updatedAt` is here because the reader needs to know whether they
 *  are looking at something current or something stale, and a stale status
 *  acted on is the concrete harm this feature exists to prevent.
 *
 *  ---------------------------------------------------------------------------
 *  What encryption does NOT hide, stated here so no screen can quietly imply
 *  otherwise:
 *
 *   - **Timing and frequency.** The server records when each row was written.
 *     A status that flips every few weeks IS a cycle, drawn in write
 *     timestamps, even with every byte of content opaque. For this app that is
 *     the most sensitive metadata there is, and encryption does nothing about
 *     it. It is disclosed on the Mode Suami screen in those words.
 *   - **Size.** The ciphertext length is visible. This payload is fixed-shape
 *     and both states encode to the same length, so it leaks nothing — which
 *     is a reason to keep it fixed-shape.
 *   - **Who asked.** The reader's IP and user agent reach the server on every
 *     fetch, as they do for any web request.
 */

export type ShareState = "haid" | "suci";

export interface SharePayload {
  v: 1;
  state: ShareState;
  /** ISO 8601. When the sender last computed this, not when the row was written. */
  updatedAt: string;
}

export function isShareState(value: unknown): value is ShareState {
  return value === "haid" || value === "suci";
}

export function encodePayload(payload: SharePayload): string {
  return JSON.stringify(payload);
}

/**
 * Null for anything that is not a payload this version understands. A reader
 * decrypting successfully but finding an unfamiliar shape is a real case —
 * the sender's app may be newer — and it must fail visibly rather than render
 * a blank or a guess.
 */
export function decodePayload(plaintext: string): SharePayload | null {
  try {
    const parsed = JSON.parse(plaintext) as Partial<SharePayload>;
    if (parsed.v !== 1) return null;
    if (!isShareState(parsed.state)) return null;
    if (typeof parsed.updatedAt !== "string") return null;
    return { v: 1, state: parsed.state, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}
