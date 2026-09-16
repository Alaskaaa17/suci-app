/**
 * Does Mode Suami actually have somewhere to store a status?
 *
 * The app already reports this at /api/share, but only after a deploy. This
 * answers it before one — by really writing, reading and deleting, not by
 * checking that the variables are merely present. A token pasted with a
 * trailing space, or copied from the wrong panel, looks perfectly fine in a
 * settings screen and fails silently at the only moment that matters.
 *
 *   node scripts/check-storage.mjs                     # local .env.local
 *   node scripts/check-storage.mjs https://your.app    # a live deployment
 *
 * Exits non-zero when anything is not usable, so it can gate a deploy.
 */

import { readFileSync } from "node:fs";

const TEST_KEY = "suci:check-storage";
/** Edge Config keys allow no colon, and this must not look like a share. */
const PROBE_KEY = "suci_check_storage";
/** A verdict is worthless if the tool hangs instead of giving one. */
const TIMEOUT_MS = 10_000;

/* --------------------------------- output --------------------------------- */

let failed = false;

function ok(message, detail = "") {
  console.log(`  [ok] ${message}${detail ? `\n       ${detail}` : ""}`);
}

/** Every failure path goes through here, so the exit code cannot drift. */
function fail(message, detail = "") {
  failed = true;
  console.log(`  [!!] ${message}${detail ? `\n       ${detail}` : ""}`);
}

function note(message) {
  console.log(`  [--] ${message}`);
}

/** Never print a full credential-bearing URL, even one that is not a secret. */
function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return "(alamat tidak sah)";
  }
}

function request(url, init = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

/* ---------------------------------- env ----------------------------------- */

/** Minimal .env parser: no dependency, and dotenv is not worth one here. */
function loadEnvFile(path) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return {};
  }
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    // Trim again AFTER stripping quotes: TOKEN="abc " trims to nothing on the
    // outside, and the space inside the quotes would otherwise survive into
    // the token — which is the exact failure this parser exists to catch.
    out[match[1]] = match[2].trim().replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

/** .env.local wins, matching how Next.js itself resolves these. */
function loadEnv() {
  return { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
}

/* -------------------------------- Upstash --------------------------------- */

async function redis(url, token, command) {
  const res = await request(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${text.slice(0, 120)}`);
  const body = JSON.parse(text);
  if (body.error) throw new Error(body.error);
  return body.result ?? null;
}

async function checkUpstash(env) {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;

  console.log("\nUpstash Redis");
  note(`alamat: ${hostOf(url)}`);

  if (!/^https:\/\//.test(url)) {
    fail(
      "Alamatnya harus diawali https://",
      "Kamu mungkin menyalin nama database, bukan REST URL.",
    );
    return true;
  }

  try {
    const stamp = new Date().toISOString();
    await redis(url, token, ["SET", TEST_KEY, stamp, "EX", "60"]);
    const readBack = await redis(url, token, ["GET", TEST_KEY]);
    await redis(url, token, ["DEL", TEST_KEY]);

    if (readBack !== stamp) {
      fail(
        "Tulis berhasil tapi hasil bacanya tidak cocok",
        `ditulis ${stamp}, terbaca ${readBack}`,
      );
      return true;
    }
    ok("Tulis, baca, dan hapus berhasil. Penyimpanan ini siap dipakai.");
  } catch (err) {
    fail("Tidak bisa dipakai", String(err.message));
    console.log(
      "       Periksa: token dari panel REST API, tanpa spasi ikut tersalin.",
    );
  }
  return true;
}

/* ------------------------------ Edge Config ------------------------------- */

/** One management-API call. The token rides in a header, never the URL. */
async function edgePatch(env, id, items) {
  const team = env.VERCEL_TEAM_ID
    ? `?teamId=${encodeURIComponent(env.VERCEL_TEAM_ID)}`
    : "";
  const res = await request(
    `https://api.vercel.com/v1/edge-config/${id}/items${team}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.VERCEL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    },
  );
  return { ok: res.ok, status: res.status };
}

/** Reads use the token inside EDGE_CONFIG; writes use a different one. */
async function edgeCanRead(connection) {
  const parsed = new URL(connection);
  const id = parsed.pathname.replace(/^\//, "");
  const res = await request(`${parsed.origin}/${id}/items`, {
    headers: { Authorization: `Bearer ${parsed.searchParams.get("token")}` },
  });
  return res.ok ? { ok: true } : { ok: false, status: res.status };
}

function reportEdgeVerdict(reading, writing) {
  if (reading.ok && writing.ok) {
    ok("Bisa dibaca dan ditulis. Penyimpanan ini siap dipakai.");
  } else if (!reading.ok && writing.ok) {
    fail(
      `Bisa ditulis, tapi TIDAK bisa dibaca (${reading.status})`,
      "Token di dalam EDGE_CONFIG kedaluwarsa. Aplikasi akan gagal setiap kali membaca status. Sambungkan ulang Edge Config ke proyeknya.",
    );
  } else if (reading.ok && !writing.ok) {
    fail(
      `Bisa dibaca, tapi TIDAK bisa ditulis (${writing.status})`,
      "VERCEL_API_TOKEN salah, kedaluwarsa, atau butuh VERCEL_TEAM_ID. Statusnya tidak akan pernah berubah.",
    );
  } else {
    fail(
      `Tidak bisa dibaca maupun ditulis (baca: ${reading.status}, tulis: ${writing.status})`,
    );
  }
}

async function checkEdgeConfig(env) {
  if (!env.EDGE_CONFIG) return false;
  console.log("\nVercel Edge Config");

  let id;
  try {
    const parsed = new URL(env.EDGE_CONFIG);
    id = parsed.pathname.replace(/^\//, "");
    if (!id || !parsed.searchParams.get("token")) throw new Error("bentuk salah");
    note(`id: ${id}`);
  } catch {
    fail(
      "EDGE_CONFIG bukan connection string yang sah",
      "Bentuknya: https://edge-config.vercel.com/ecfg_xxx?token=yyy",
    );
    return true;
  }

  if (!env.VERCEL_API_TOKEN) {
    fail(
      "VERCEL_API_TOKEN belum ada",
      "Tanpa ini statusnya bisa dibaca tapi tidak pernah bisa diperbarui.",
    );
    return true;
  }

  // Reads and writes use two independent tokens, so both must pass before
  // this can be called ready. Reporting them separately once let a stale read
  // token print "tidak bisa dibaca" and "siap dipakai" in the same breath.
  let reading;
  try {
    reading = await edgeCanRead(env.EDGE_CONFIG);
  } catch (err) {
    reading = { ok: false, status: String(err.message) };
  }

  let writing;
  try {
    writing = await edgePatch(env, id, [
      { operation: "upsert", key: PROBE_KEY, value: { v: "ok", e: Date.now() + 60_000 } },
    ]);
    // Clean up after a successful probe. Edge Config is 8 KB on Hobby, and
    // leaving the key for the app's own expiry sweep to collect would couple
    // this script to the exact shape of EdgeEntry in lib/server/store.ts.
    if (writing.ok) {
      await edgePatch(env, id, [{ operation: "delete", key: PROBE_KEY }]);
    }
  } catch (err) {
    writing = { ok: false, status: String(err.message) };
  }

  reportEdgeVerdict(reading, writing);
  return true;
}

/* ------------------------------ deployment -------------------------------- */

async function checkDeployment(origin) {
  console.log(`\nDeployment: ${origin}`);
  try {
    const res = await request(`${origin.replace(/\/$/, "")}/api/share`, {
      cache: "no-store",
    });
    const body = await res.json();
    if (body.durable) {
      ok(
        `Sudah siap - penyimpanannya "${body.storage}".`,
        "Mode Suami berfungsi penuh di sini.",
      );
    } else {
      fail(
        `Belum siap - jawabannya "${body.storage}".`,
        "Variabel lingkungannya belum terbaca. Paling sering: sudah diisi tapi belum Redeploy.",
      );
    }
  } catch (err) {
    fail("Tidak bisa dihubungi", String(err.message));
  }
}

/* --------------------------------- main ----------------------------------- */

console.log("Pemeriksaan penyimpanan Mode Suami");

const target = process.argv[2];
if (target) {
  await checkDeployment(target);
} else {
  const env = loadEnv();
  const found = (await checkUpstash(env)) || (await checkEdgeConfig(env));
  if (!found) {
    failed = true;
    console.log("\nBelum ada penyimpanan yang diatur di .env.local");
    note("Isi salah satu pasangan berikut:");
    console.log(
      "       UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN   (console.upstash.com)",
    );
    console.log(
      "       EDGE_CONFIG + VERCEL_API_TOKEN                      (Vercel)",
    );
    console.log("\n       Tanpa itu aplikasi tetap jalan, tapi tautan Mode Suami");
    console.log("       hanya berfungsi di komputer ini, bukan di ponsel orang lain.");
  }
}

console.log("");
// Non-zero on any failure, so `npm run check:storage && vercel deploy` gates.
if (failed) process.exitCode = 1;
