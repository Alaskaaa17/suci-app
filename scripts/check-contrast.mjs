/**
 * Contrast audit for every text/background pair the design actually uses, in
 * both themes. WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text (>=18.66px
 * bold or >=24px) and for UI component boundaries.
 *
 * Reads the token values straight out of globals.css so it cannot drift from
 * what ships.
 */
import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");

function tokensFor(selector) {
  const start = css.indexOf(selector);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const block = css.slice(open + 1, close);
  const out = {};
  for (const line of block.split("\n")) {
    const m = line.match(/--([a-z0-9-]+):\s*([^;]+);/i);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const light = tokensFor(":root,\n[data-theme=\"light\"]");
const dark = tokensFor('[data-theme="dark"]');

function parse(color, bg) {
  if (color.startsWith("#")) {
    const h = color.slice(1);
    const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  }
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
    const [r, g, b, a = 1] = parts;
    // Composite translucent tokens over their background before measuring.
    return [r, g, b].map((c, i) => Math.round(c * a + bg[i] * (1 - a)));
  }
  throw new Error("cannot parse " + color);
}

function luminance([r, g, b]) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * [foreground, background, minimum, description, kind]
 *
 * `kind` matters. WCAG 1.4.11 asks 3:1 only of boundaries that are *required*
 * to identify a component or its state. A card border that sits around a
 * distinct fill, next to a glyph, next to a text label, is decoration — it is
 * reported but not failed. An input's border is the whole affordance, so it is.
 */
const PAIRS = [
  ["tx", "bg", 4.5, "primary text on page"],
  ["tx2", "bg", 4.5, "secondary text on page"],
  ["cap", "bg", 4.5, "caption on page"],
  ["tx", "rose", 4.5, "text on rose card"],
  ["tx2", "rose", 4.5, "secondary text on rose card"],
  ["tx2", "sage", 4.5, "secondary text on sage card"],
  ["sage-tx", "sage", 4.5, "sage heading on sage card"],
  ["tx2", "peach", 4.5, "secondary text on peach card"],
  ["peach-tx", "peach", 4.5, "peach text on peach card"],
  ["stone-tx", "stone-card", 4.5, "citation heading"],
  ["stone-tx2", "stone-card", 4.5, "citation body"],
  ["stone-tx2", "stone-bg", 4.5, "citation body on stone bg"],
  ["stone-tx", "stone-bg", 4.5, "stone heading on stone bg"],
  ["onsolid", "solid", 4.5, "CTA label"],
  ["icon", "rose", 3, "icon glyph on rose"],
  ["sage-tx", "bg", 4.5, "sage text on page"],
  ["peach-tx", "bg", 4.5, "peach text on page"],
  // Load-bearing boundaries: these are the whole affordance.
  ["solid", "bg", 3, "focus ring on page", "functional"],
  ["field-b", "bg", 3, "form control border on page", "functional"],
  ["hair", "bg", 3, "decorative divider on page", "decorative"],
  ["stone-b", "stone-card", 3, "divider inside citation card", "decorative"],
  // Decorative: each of these sits around its own fill, beside a glyph and a
  // text label, so it is never the only thing carrying meaning.
  ["rose-b", "bg", 3, "rose card border", "decorative"],
  ["sage-b", "bg", 3, "sage card border", "decorative"],
  ["peach-b", "bg", 3, "peach card border", "decorative"],
];

let failures = 0;
for (const [themeName, tokens] of [["light", light], ["dark", dark]]) {
  console.log(`\n${themeName.toUpperCase()}`);
  for (const [fgKey, bgKey, min, label, kind = "text"] of PAIRS) {
    const bgRaw = tokens[bgKey];
    const pageBg = parse(tokens.bg, [255, 255, 255]);
    const bg = parse(bgRaw, pageBg);
    const fg = parse(tokens[fgKey], bg);
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok && kind !== "decorative") failures++;
    const tag = ok ? "PASS" : kind === "decorative" ? "note" : "FAIL";
    console.log(
      `  ${tag}  ${r.toFixed(2)}:1 (need ${min})  ${label}  [${fgKey} on ${bgKey}]`,
    );
  }
}

console.log(
  failures
    ? `\n${failures} load-bearing pair(s) below AA`
    : "\nEvery load-bearing pair meets AA (decorative borders noted above)",
);
process.exit(failures ? 1 : 0);
