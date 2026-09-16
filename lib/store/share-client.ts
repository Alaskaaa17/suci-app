import type { ShareState } from "@/lib/server/share";
import { readShare, type ShareRecord } from "./vault";

/**
 * Talking to the share endpoint.
 *
 * The local record in `vault.ts` is still written on every change and is what
 * the share page falls back to when the network is gone on the owner's own
 * device. The server copy is what makes the link work on anyone else's.
 */

export interface ShareCredentials {
  token: string;
  /** Never leaves this device; proves a write comes from the owner. */
  secret: string;
}

/** A write secret long enough that guessing it is not a strategy. */
export function generateShareSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function publishShare(
  credentials: ShareCredentials,
  state: ShareState,
): Promise<boolean> {
  try {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...credentials, state }),
    });
    return res.ok;
  } catch {
    // Offline. The local record is still current, and the next status change
    // or app open will republish.
    return false;
  }
}

export async function revokeShare(
  credentials: ShareCredentials,
): Promise<boolean> {
  try {
    const res = await fetch("/api/share", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type SharePageResult =
  | { status: "ok"; state: ShareState; updatedAt: string; source: "server" | "device" }
  | { status: "gone" }
  | { status: "offline" };

/**
 * What the share page shows. Tries the server first, because that is the copy
 * that is authoritative for everyone. Falls back to the device's own record
 * only when the token matches — which means the owner is looking at their own
 * link offline, not that a reader is being shown stale data.
 */
export async function fetchSharedStatus(
  token: string,
): Promise<SharePageResult> {
  try {
    const res = await fetch(`/api/share/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });

    if (res.ok) {
      const body = (await res.json()) as ShareRecord;
      return {
        status: "ok",
        state: body.state,
        updatedAt: body.updatedAt,
        source: "server",
      };
    }

    if (res.status === 404) return { status: "gone" };
    return { status: "offline" };
  } catch {
    const local = readShare();
    if (local && local.token === token) {
      return {
        status: "ok",
        state: local.state,
        updatedAt: local.updatedAt,
        source: "device",
      };
    }
    return { status: "offline" };
  }
}
