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

/**
 * Whether this deployment can actually keep a share status.
 *
 * "memory" means the server accepted the write into an in-process map. On
 * serverless that map is per-instance, so the reader's request very likely
 * lands somewhere that has never heard of the token. The write "succeeded" and
 * the link still will not work — which is exactly the failure that used to be
 * reported to the reader as if the owner had revoked it.
 */
export type ShareStorage = "redis" | "edge-config" | "memory" | "unknown";

export interface PublishResult {
  ok: boolean;
  storage: ShareStorage;
}

export async function publishShare(
  credentials: ShareCredentials,
  state: ShareState,
): Promise<PublishResult> {
  try {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...credentials, state }),
    });
    if (!res.ok) return { ok: false, storage: "unknown" };
    const body = (await res.json().catch(() => ({}))) as {
      storage?: ShareStorage;
    };
    return { ok: true, storage: body.storage ?? "unknown" };
  } catch {
    // Offline. The local record is still current, and the next status change
    // or app open will republish.
    return { ok: false, storage: "unknown" };
  }
}

/** Asks the deployment whether sharing can work at all, before promising it. */
export async function fetchShareStorage(): Promise<ShareStorage> {
  try {
    const res = await fetch("/api/share", { cache: "no-store" });
    if (!res.ok) return "unknown";
    const body = (await res.json()) as { storage?: ShareStorage };
    return body.storage ?? "unknown";
  } catch {
    return "unknown";
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
  /** The owner revoked or rotated the link, or it expired. Their doing. */
  | { status: "gone" }
  /** The server is up but has nowhere to keep statuses. Not the owner's doing. */
  | { status: "unavailable" }
  /** This device cannot reach the server right now. */
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

    // A 404 that is not our JSON is Next's own "page not found" — the route
    // does not exist in this build. That is a deployment that has not caught
    // up, not a link the owner took down, and saying "tautan tidak berlaku"
    // there accuses her of something she did not do.
    const isOurApi = (res.headers.get("content-type") ?? "").includes(
      "application/json",
    );

    if (res.status === 404 && isOurApi) return onlyDeviceCopy(token, "gone");
    if (res.status === 404) return onlyDeviceCopy(token, "unavailable");
    if (res.status === 503) return onlyDeviceCopy(token, "unavailable");
    return onlyDeviceCopy(token, "offline");
  } catch {
    return onlyDeviceCopy(token, "offline");
  }
}

/**
 * When the server cannot answer, the one case where showing something is still
 * honest is the owner on her own device: the local record is hers and current.
 * For anybody else there is nothing to fall back to, and the reason is shown
 * instead.
 *
 * A revoked link deliberately does not fall back — the owner turning sharing
 * off must stop showing a status even on the phone that wrote it.
 */
function onlyDeviceCopy(
  token: string,
  reason: "gone" | "unavailable" | "offline",
): SharePageResult {
  if (reason !== "gone") {
    const local = readShare();
    if (local && local.token === token) {
      return {
        status: "ok",
        state: local.state,
        updatedAt: local.updatedAt,
        source: "device",
      };
    }
  }
  return { status: reason };
}
