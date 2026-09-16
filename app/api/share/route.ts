import { NextResponse } from "next/server";
import { storageKind } from "@/lib/server/store";

/**
 * Health for the share feature. A share session itself lives at
 * `/api/share/[shareId]` — this route deliberately has no collection listing,
 * because an endpoint that enumerates share sessions would hand an attacker
 * the one thing the whole design assumes they do not have.
 */

export const dynamic = "force-dynamic";

/**
 * Whether this deployment has somewhere durable to keep a share session, so
 * Mode Suami can warn before promising a link that will not work on anyone
 * else's phone. One word about the deployment, nothing about any user.
 */
export async function GET() {
  const storage = storageKind();
  return NextResponse.json(
    { storage, durable: storage !== "memory" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
