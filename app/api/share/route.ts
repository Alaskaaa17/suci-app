import { NextResponse } from "next/server";
import {
  clientKey,
  revokeShareRecord,
  underWriteLimit,
  writeShareRecord,
} from "@/lib/server/share";

/**
 * Publishing and revoking a share status.
 *
 * Both require the write secret that lives only on the owner's device, so
 * holding the link is not enough to change what it says.
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

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

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
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
