import { NextResponse } from "next/server";
import {
  clientKey,
  readShareRecord,
  revokeShareRecord,
  underReadLimit,
  underWriteLimit,
  writeShareRecord,
} from "@/lib/server/share";
import { storageKind } from "@/lib/server/store";

/**
 * One share session, addressed by its shareId.
 *
 * GET is public by design — the link is the credential, and what it returns is
 * ciphertext this server cannot open. PUT and DELETE need the write secret
 * that stays in the sender's vault, so holding the link is not enough to
 * change or destroy what it says.
 *
 * GET returns 404 for both "never existed" and "revoked or expired", so the
 * response cannot be used to probe which shareIds are real. But 404 only means
 * that when there is somewhere durable to look: without a provisioned store
 * the app falls back to an in-process map, and on serverless the write and the
 * read land in different instances, so a miss says nothing about the link and
 * everything about the deployment. Reporting that as "not found" makes the
 * reader page blame the owner for revoking a link she just created. The honest
 * answer there is 503.
 */

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: NO_STORE });

async function body(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!(await underReadLimit(await clientKey(request)))) {
    return fail("too_many_requests", 429);
  }

  const { token } = await params;
  const record = await readShareRecord(token);

  if (!record) {
    if (storageKind() === "memory") return fail("storage_unavailable", 503);
    return fail("not_found", 404);
  }

  return NextResponse.json(record, { headers: NO_STORE });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!(await underWriteLimit(await clientKey(request)))) {
    return fail("too_many_requests", 429);
  }

  const payload = await body(request);
  if (!payload) return fail("invalid", 400);

  const { ct, iv, secret } = payload;
  if (typeof secret !== "string") return fail("invalid", 400);

  const { token } = await params;
  const result = await writeShareRecord(token, { ct, iv }, secret);
  if (!result.ok) {
    return fail(result.reason, result.reason === "forbidden" ? 403 : 400);
  }

  // `storage` rides along so the sender's screen learns from the very write
  // that was meant to make the link work whether it actually will.
  return NextResponse.json(
    { ok: true, storage: storageKind() },
    { headers: NO_STORE },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!(await underWriteLimit(await clientKey(request)))) {
    return fail("too_many_requests", 429);
  }

  const payload = await body(request);
  if (!payload) return fail("invalid", 400);
  if (typeof payload.secret !== "string") return fail("invalid", 400);

  const { token } = await params;
  const result = await revokeShareRecord(token, payload.secret);
  if (!result.ok) {
    return fail(result.reason, result.reason === "forbidden" ? 403 : 400);
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
