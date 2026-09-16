/**
 * End-to-end checks against a running production build.
 *
 *   npm run build && npm start &
 *   npm run test:e2e
 *
 * The unit tests cover the fiqh engine in isolation. This covers everything
 * that only breaks once the pieces are wired together — and it has earned its
 * keep: it caught an unlayered CSS reset that was overriding every text-colour
 * utility, a save that reported success before the encrypted write landed,
 * flex children overlapping inside the phone frame, and prayer times following
 * the device clock rather than the chosen city.
 *
 * Env:
 *   BASE_URL       default http://localhost:3000
 *   CHROMIUM_PATH  override the browser binary
 */

import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EXECUTABLE = process.env.CHROMIUM_PATH || undefined;
const PIN = "135790";

const results = [];
let failures = 0;

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const browser = await chromium.launch(
  EXECUTABLE ? { executablePath: EXECUTABLE } : {},
);
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

page.on("pageerror", (e) => check("no page errors", false, e.message));
page.on("console", (m) => {
  if (m.type() === "error") check("no console errors", false, m.text());
});

/* ---------------------------------------------------------------------------
   A full page load re-locks the vault by design: the PIN is held in memory
   only and never persisted. Every navigation therefore unlocks again.
   --------------------------------------------------------------------------- */
async function go(path, { offline = false } = {}) {
  // `networkidle` never settles with the network cut, so offline navigations
  // wait for the document instead and give the client router a moment.
  const res = await page.goto(BASE + path, {
    waitUntil: offline ? "domcontentloaded" : "networkidle",
  });
  if (offline) await page.waitForTimeout(600);
  if (await page.locator("text=Masukkan PIN").count()) {
    for (const d of PIN) {
      await page.getByRole("button", { name: d, exact: true }).click();
    }
    await page.waitForSelector("text=Masukkan PIN", {
      state: "detached",
      timeout: 8000,
    });
    await page.waitForTimeout(250);
  }
  return res;
}

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shift = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, 12) + n * 86_400_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};

/* ---- onboarding ----------------------------------------------------------- */

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForURL("**/onboarding", { timeout: 5000 });
check("fresh visit redirects to onboarding", page.url().includes("/onboarding"));

const lanjut = page.getByRole("button", { name: "Lanjut" });
check("step 1 CTA disabled before consent", await lanjut.isDisabled());
await page.getByText("Aku mengerti Suci adalah alat").click();
check("step 1 CTA enabled after consent", await lanjut.isEnabled());
await lanjut.click();

await page.waitForSelector("text=Kamu mengikuti mazhab apa?");
check("step 2 shows madhhab picker", true);
await page.getByPlaceholder("Dipakai untuk menyapamu").fill("Aisyah");
await page.getByRole("radio", { name: /Hanafi/ }).click();
check(
  "Hanafi selected",
  (await page.getByRole("radio", { name: /Hanafi/ }).getAttribute("aria-checked")) ===
    "true",
);
await page.getByRole("button", { name: "Lanjut" }).click();

await page.waitForSelector("text=Kunci dengan PIN");
const save = page.getByRole("button", { name: /Simpan & mulai/ });
check("PIN CTA disabled before entry", await save.isDisabled());
await page.getByLabel("PIN Baru").fill(PIN);
await page.getByLabel("Ulangi PIN").fill("135791");
await page.waitForSelector("text=Dua PIN ini belum sama");
check("mismatched PINs are rejected", true);
await page.getByLabel("Ulangi PIN").fill(PIN);
check("matching PINs enable save", await save.isEnabled());
await save.click();

await page.waitForURL(BASE + "/", { timeout: 8000 });
await page.waitForSelector("text=Aisyah");
check("onboarding lands on Beranda and greets by name", true);

/* ---- the vault is genuinely encrypted at rest ----------------------------- */

const raw = await page.evaluate(() => localStorage.getItem("suci.vault"));
const envelope = JSON.parse(raw);
check("vault marked encrypted", envelope.encrypted === true);
check(
  "no plaintext in storage",
  !raw.includes("Aisyah") && !raw.includes("hanafi"),
);
check(
  "box carries salt, iv and ciphertext",
  !!envelope.box?.salt && !!envelope.box?.iv && !!envelope.box?.data,
);

/* ---- logging drives the ruling (Hanafi minimum is 3 days) ----------------- */

async function logBleeding(date) {
  await go(`/catat?tanggal=${date}`);
  const toggle = page.getByRole("switch", { name: "Ada darah hari ini" });
  if ((await toggle.getAttribute("aria-checked")) !== "true") await toggle.click();
  await page.getByRole("button", { name: "Simpan catatan" }).click();
  // The button itself, not any text containing "tersimpan" — the write is
  // async and the label only flips once it has landed.
  await page
    .getByRole("button", { name: "Tersimpan", exact: true })
    .waitFor({ timeout: 8000 });
}

const today = await page.evaluate(() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
});

await logBleeding(shift(today, -1));
await logBleeding(today);
await go("/");
check(
  "2 days under Hanafi rules as istihadhah",
  /Istihadhah/i.test(await page.textContent("body")),
);

await logBleeding(shift(today, -2));
await go("/");
const threeDay = await page.textContent("body");
check(
  "3 days under Hanafi rules as haid",
  /Haid/.test(threeDay) && /Hari ke/.test(threeDay),
);

/* ---- switching madhhab re-runs the whole history -------------------------- */

await go("/pengaturan");
await page.getByRole("radio", { name: /^Syafi/ }).click();
await page.waitForTimeout(400);
await go("/");
check("still haid under Syafi'i", /Hari ke/.test(await page.textContent("body")));

/* ---- the reasoning trail is always reachable ------------------------------ */

const trail = page.getByRole("button", { name: /Dasar hukum status ini/ });
if ((await trail.getAttribute("aria-expanded")) !== "true") await trail.click();
await page.waitForSelector("text=Al-Majmu'", { timeout: 8000 });
check("legal basis shows the citation", true);
const trailBody = await page.textContent("body");
check("trail names the madhhab", /Mazhab Syafi/.test(trailBody));
check("trail shows reasoning steps", /batas maksimal 15 hari/.test(trailBody));

/* ---- calendar ------------------------------------------------------------- */

await go("/kalender");
const todayCell = page.locator('[aria-current="date"]');
check("today's cell is marked", (await todayCell.count()) === 1);
check(
  "cell carries a text status, not colour alone",
  /Haid/.test(await todayCell.getAttribute("aria-label")),
);

/* ---- prayer times --------------------------------------------------------- */

await go("/ibadah");
const ibadah = await page.textContent("body");
check("prayer times rendered", /\d{2}:\d{2}/.test(ibadah));
check("haid notice shown on worship screen", /tidak perlu diqadha/.test(ibadah));
const subuh = ibadah.match(/SUBUH\s*(\d{2}):(\d{2})/i);
check(
  "Subuh follows the chosen city, not the server clock",
  !!subuh && Number(subuh[1]) >= 3 && Number(subuh[1]) <= 6,
  subuh ? `${subuh[1]}:${subuh[2]}` : "not found",
);

/* ---- ghusl ends the episode ----------------------------------------------- */

await go("/ibadah/mandi-wajib");
await page.getByRole("button", { name: /Sudah mandi, tandai suci/ }).click();
await page.waitForURL(BASE + "/", { timeout: 5000 });
await page.waitForTimeout(400);
check("marking ghusl returns to suci", /suci/i.test(await page.textContent("body")));

/* ---- every route renders --------------------------------------------------- */

const ROUTES = [
  "/catat",
  "/kalender",
  "/ibadah",
  "/ibadah/mandi-wajib",
  "/ibadah/qadha-shalat",
  "/edukasi",
  "/edukasi/dasar",
  "/edukasi/istihadhah",
  "/edukasi/amalan",
  "/edukasi/glosarium",
  "/edukasi/tanya-jawab",
  "/edukasi/ikhtilaf",
  "/edukasi/baligh",
  "/edukasi/ibu",
  "/edukasi/ibu/menyusui",
  "/edukasi/menopause",
  "/pengaturan",
  "/pengaturan/kehamilan",
  "/pengaturan/data-saya",
  "/pengaturan/suami",
];

for (const route of ROUTES) {
  const res = await go(route);
  const heading = await page
    .locator("h1")
    .first()
    .textContent()
    .catch(() => null);
  check(
    `route ${route}`,
    res.status() === 200 && !!heading?.trim(),
    heading?.trim() ?? "no h1",
  );
}

/* ---- education content ----------------------------------------------------- */

await go("/edukasi/glosarium");
await page.getByPlaceholder("Cari istilah").fill("nifas");
await page.waitForTimeout(250);
const glossary = await page.textContent("body");
check("glossary filters", /Nifas/.test(glossary) && !/Tayamum/.test(glossary));

await go("/edukasi/ikhtilaf");
check(
  "ikhtilaf reads the rule table",
  /1–15/.test(await page.textContent("body")),
);
await page.getByRole("tab", { name: "Batas nifas" }).click();
await page.waitForTimeout(200);
const nifasTab = await page.textContent("body");
check("nifas tab shows 60 and 40", /60/.test(nifasTab) && /40/.test(nifasTab));

/* ---- husband mode ---------------------------------------------------------- */

await go("/pengaturan/suami");
if (await page.getByRole("button", { name: /Nyalakan Mode Suami/ }).count()) {
  await page.getByRole("button", { name: /Nyalakan Mode Suami/ }).click();
  await page.waitForSelector("text=Tautan aktif");
}
const link = await page.locator("code").textContent();
check("share link generated", /\/s\/[a-z0-9-]+/.test(link));

const token = link.split("/s/")[1];
await page.goto(`${BASE}/s/${token}`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
const shared = await page.textContent("body");
check("shared page shows today's status", /Hari ini dia/.test(shared));
check(
  "shared page leaks nothing private",
  !/Aisyah/.test(shared) && !/Kram perut/.test(shared),
);

await page.goto(`${BASE}/s/tidak-valid-xxxx`, { waitUntil: "networkidle" });
check("bad token rejected", /tidak berlaku/.test(await page.textContent("body")));

/* ---- deletion requires the typed word --------------------------------------- */

await go("/pengaturan/data-saya");
const del = page.getByRole("button", { name: "Hapus data saya" });
check("delete disabled by default", await del.isDisabled());
await page.locator('input[autocomplete="off"]').fill("HAPUS");
check("delete armed by the word", await del.isEnabled());

/* ---- the lock actually locks -------------------------------------------------- */

await page.goto(BASE, { waitUntil: "networkidle" });
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("text=Assalamualaikum", { timeout: 5000 });
check("reload requires the PIN", /Masukkan PIN/.test(await page.textContent("body")));

for (const d of "999999") {
  await page.getByRole("button", { name: d, exact: true }).click();
}
await page.waitForTimeout(600);
check("wrong PIN rejected", /PIN belum cocok/.test(await page.textContent("body")));

for (const d of PIN) {
  await page.getByRole("button", { name: d, exact: true }).click();
}
await page.waitForURL(BASE + "/", { timeout: 6000 }).catch(() => {});
await page.waitForTimeout(500);
check("correct PIN unlocks", /Aisyah/.test(await page.textContent("body")));

/* ---- colour utilities reach buttons -------------------------------------------- */
// A reset with `color: inherit` outside Tailwind's layers silently beats every
// text-colour utility on a button. This caught exactly that.

await go("/edukasi/ikhtilaf");
const tabColors = await page.$$eval('[role="tab"]', (els) =>
  els.map((el) => ({
    selected: el.getAttribute("aria-selected"),
    color: getComputedStyle(el).color,
  })),
);
check(
  "active tab uses its own text colour",
  tabColors.find((t) => t.selected === "true")?.color === "rgb(255, 255, 255)",
  tabColors.find((t) => t.selected === "true")?.color,
);
check(
  "inactive tabs use the stone colour, not inherited rose",
  tabColors
    .filter((t) => t.selected === "false")
    .every((t) => t.color === "rgb(95, 94, 90)"),
);

await go("/catat");
const ctaColor = await page.$eval(
  'button:has-text("Simpan catatan")',
  (el) => getComputedStyle(el).color,
);
check("primary CTA text is on-solid white", ctaColor === "rgb(255, 255, 255)", ctaColor);

/* ---- theme ---------------------------------------------------------------------- */

await go("/");
const before = await page.evaluate(() => document.documentElement.dataset.theme);
await page.getByRole("button", { name: /Beralih ke mode/ }).click();
const after = await page.evaluate(() => document.documentElement.dataset.theme);
check("theme toggles", before !== after, `${before} → ${after}`);

/* ---- installability ------------------------------------------------------------- */

const manifest = await page.evaluate(async () => {
  const res = await fetch("/manifest.webmanifest");
  return res.ok ? res.json() : null;
});
check("manifest is served", !!manifest);
check("manifest is installable", manifest?.display === "standalone");
check(
  "manifest ships a maskable icon",
  manifest?.icons?.some((i) => i.purpose === "maskable"),
);

/* ---- offline ---------------------------------------------------------------------
   Registered only in production builds, so this section is skipped when the
   worker is absent rather than reported as a failure.
   ---------------------------------------------------------------------------------- */

const swReady = await page
  .evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    await navigator.serviceWorker.ready;
    return true;
  })
  .catch(() => false);

if (swReady) {
  // Give the install handler time to precache every route.
  await page.waitForTimeout(2500);
  await context.setOffline(true);

  // The vault is still PIN-locked offline, exactly as it is online — so these
  // go through the same unlock path rather than asserting against the lock
  // screen by accident.
  await go("/kalender", { offline: true });
  check(
    "calendar loads and unlocks with no network",
    /Kalender/.test(await page.textContent("body")),
  );

  await go("/edukasi/glosarium", { offline: true });
  check(
    "education loads with no network",
    /Glosarium/.test(await page.textContent("body")),
  );

  await go("/", { offline: true });
  check(
    "today's ruling still computes offline",
    /Hari ke|suci|Istihadhah/i.test(await page.textContent("body")),
  );

  // The point of caching RSC payloads: offline tab taps must stay client-side.
  // A fallback to full navigation remounts the app and re-prompts for the PIN,
  // which would make the app unusable in exactly its normal condition.
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Edukasi" })
    .click();
  await page.waitForTimeout(800);
  const afterTap = await page.textContent("body");
  check(
    "offline tab tap navigates without re-locking",
    /Edukasi/.test(afterTap) && !/Masukkan PIN/.test(afterTap),
  );

  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Kalender" })
    .click();
  await page.waitForTimeout(800);
  const secondTap = await page.textContent("body");
  check(
    "a second offline tab tap also stays unlocked",
    /Kalender/.test(secondTap) && !/Masukkan PIN/.test(secondTap),
  );

  const cachedShare = await page.evaluate(async () => {
    const names = await caches.keys();
    for (const n of names) {
      const cache = await caches.open(n);
      const keys = await cache.keys();
      if (keys.some((r) => new URL(r.url).pathname.startsWith("/s/"))) return true;
    }
    return false;
  });
  check("share pages are never cached", cachedShare === false);

  // User data lives only in localStorage and never crosses the network, so it
  // cannot reach the Cache API. Assert it rather than assuming it: a future
  // sync feature would break this silently.
  const cipherLeak = await page.evaluate(async () => {
    const raw = localStorage.getItem("suci.vault");
    if (!raw) return "no vault";
    const cipher = JSON.parse(raw).box?.data;
    if (!cipher) return "no ciphertext";
    const needle = cipher.slice(0, 40);
    for (const n of await caches.keys()) {
      const cache = await caches.open(n);
      for (const req of await cache.keys()) {
        const res = await cache.match(req);
        const text = await res.clone().text().catch(() => "");
        if (text.includes(needle)) return req.url;
      }
    }
    return null;
  });
  check("no cached response carries the vault", cipherLeak === null, cipherLeak ?? "");

  await context.setOffline(false);
} else {
  results.push("SKIP  offline checks (no service worker — dev build?)");
}

await browser.close();

console.log(results.join("\n"));
console.log(`\n${results.length - failures} of ${results.length} checks passed`);
process.exit(failures ? 1 : 0);
