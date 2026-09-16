import { NextResponse } from "next/server";
import {
  clientKey,
  revokeShareRecord,
  underWriteLimit,
  writeShareRecord,
} from "@/lib/server/share";
import { storageKind } from "@/lib/server/store";

/**
 * Publishing and revoking a share status.
 *
 * Both require the write secret that lives only on the owner's device, so
 * holding the link is not enough to change what it says.
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Health. Says whether this deployment has somewhere durable to keep a share
 * status, so Mode Suami can warn before handing out a link that will not work
 * on anyone else's phone. It exposes one word about the deployment and nothing
 * about any user — no token, no state, no count.
 */
export async function GET() {
  const storage = storageKind();
  return NextResponse.json(
    { storage, durable: storage !== "memory" },
    { headers: NO_STORE },
  );
}

export async function POST(request: Request) {
  if (!(await underWriteLimit(await clientKey(request)))) {
    return NextResponse.json(
      { error: "too_many_requests" },
      { status: 429, headers: NO_STORE },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid" },
      { status: 400, headers: NO_STORE },
    );
  }

  const { token, state, secret } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof token !== "string" ||
    typeof secret !== "string" ||
    (state !== "haid" && state !== "suci")
  ) {
    return NextResponse.json(
      { error: "invalid" },
      { status: 400, headers: NO_STORE },
    );
  }

  const result = await writeShareRecord(token, state, secret);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason },
      { status: result.reason === "forbidden" ? 403 : 400, headers: NO_STORE },
    );
  }

  // `storage` rides along so the owner's screen learns the truth from the very
  // write that was supposed to make the link work, rather than only when a
  // reader reports it broken.
  return NextResponse.json(
    { ok: true, storage: storageKind() },
    { headers: NO_STORE },
  );
}

export async function DELETE(request: Request) {
  if (!(await underWriteLimit(await clientKey(request)))) {
    return NextResponse.json(
      { error: "too_many_requests" },
      { status: 429, headers: NO_STORE },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid" },
      { status: 400, headers: NO_STORE },
    );
  }

  const { token, secret } = (body ?? {}) as Record<string, unknown>;
  if (typeof token !== "string" || typeof secret !== "string") {
    return NextResponse.json(
      { error: "invalid" },
      { status: 400, headers: NO_STORE },
    );
  }

  const result = await revokeShareRecord(token, secret);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason },
      { status: result.reason === "forbidden" ? 403 : 400, headers: NO_STORE },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
