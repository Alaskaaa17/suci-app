/**
 * Renders the app mark to the PNG sizes a web manifest needs.
 *
 * The maskable variant insets the mark to ~62% of the canvas so Android's
 * adaptive-icon crop (a circle, at worst) never clips the crescent.
 */
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const EXECUTABLE =
  process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const MARK = `
  <path d="M20 13.5A7.5 7.5 0 0 1 10.5 4a8 8 0 1 0 9.5 9.5z"/>
  <path d="M17 3.2l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z"/>
`;

function svg({ size, inset, radius, bg }) {
  const scale = (size * inset) / 24;
  const offset = (size * (1 - inset)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>
    <g transform="translate(${offset} ${offset}) scale(${scale})"
       fill="none" stroke="#C34C74" stroke-width="1.5"
       stroke-linecap="round" stroke-linejoin="round">${MARK}</g>
  </svg>`;
}

const TARGETS = [
  { file: "public/icon-192.png", size: 192, inset: 0.74, radius: 42, bg: "#FBEAF0" },
  { file: "public/icon-512.png", size: 512, inset: 0.74, radius: 112, bg: "#FBEAF0" },
  // Maskable icons are cropped by the platform, so the mark sits well inside
  // and the background bleeds to the edges.
  { file: "public/icon-maskable-512.png", size: 512, inset: 0.52, radius: 0, bg: "#FBEAF0" },
];

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const page = await browser.newPage();

for (const t of TARGETS) {
  const markup = svg(t);
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0">${markup}</body></html>`,
    { waitUntil: "load" },
  );
  const buffer = await page.screenshot({ omitBackground: true });
  await writeFile(t.file, buffer);
  console.log(`wrote ${t.file} (${t.size}×${t.size})`);
}

await browser.close();
