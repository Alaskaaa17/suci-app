import { NextResponse } from "next/server";
import {
  clientKey,
  readShareRecord,
  underReadLimit,
} from "@/lib/server/share";
import { storageKind } from "@/lib/server/store";

/**
 * Reading a share status. Public by design — the link is the credential, and
 * what it unlocks is one bit.
 *
 * Returns 404 for both "never existed" and "revoked or expired", so the
 * response cannot be used to probe which tokens are real.
 *
 * But 404 only means that when there is somewhere durable to look. Without a
 * provisioned store the app falls back to an in-process map, and on serverless
 * the write and the read land in different instances — so a miss says nothing
 * about the token and everything about the deployment. Reporting that as
 * "not found" makes the page blame the owner for revoking a link they just
 * created. The honest answer there is 503.
 */

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!(await underReadLimit(await clientKey(request)))) {
    return NextResponse.json(
      { error: "too_many_requests" },
      { status: 429, headers: NO_STORE },
    );
  }

  const { token } = await params;
  const record = await readShareRecord(token);

  if (!record) {
    if (storageKind() === "memory") {
      return NextResponse.json(
        { error: "storage_unavailable" },
        { status: 503, headers: NO_STORE },
      );
    }
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE },
    );
  }

  return NextResponse.json(record, { headers: NO_STORE });
}
