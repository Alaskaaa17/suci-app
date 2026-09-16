import { describe, expect, it } from "vitest";
import { emptyVault, parseImportedVault, toExportJson } from "./vault";

/**
 * The counterpart to the export button: a file picked off the user's own
 * device, which could be a genuine backup, a corrupted download, or
 * something unrelated entirely. This is the boundary that decides which.
 */

describe("parseImportedVault", () => {
  it("reads back what toExportJson wrote, extra envelope fields and all", () => {
    const vault = emptyVault("Aisyah");
    vault.entries["2026-01-01"] = {
      date: "2026-01-01",
      bleeding: true,
      symptoms: [],
      mood: [],
    };

    const result = parseImportedVault(toExportJson(vault));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.profile.name).toBe("Aisyah");
      expect(result.data.entries["2026-01-01"].bleeding).toBe(true);
    }
  });

  it("rejects text that is not JSON at all", () => {
    const result = parseImportedVault("bukan json{{{");
    expect(result).toEqual({ ok: false, reason: "unreadable" });
  });

  const wrongShapes = [
    ["a bare string", JSON.stringify("hello")],
    ["an array", JSON.stringify([1, 2, 3])],
    ["null", "null"],
    ["a future version", JSON.stringify({ ...emptyVault(), version: 2 })],
    [
      "missing profile",
      JSON.stringify({ version: 1, entries: {}, qadhaPrayers: [], qadhaFast: {} }),
    ],
    [
      "profile without a madhhab",
      JSON.stringify({
        version: 1,
        profile: { name: "x" },
        entries: {},
        qadhaPrayers: [],
        qadhaFast: {},
      }),
    ],
    [
      "qadhaPrayers as an object instead of an array",
      JSON.stringify({
        version: 1,
        profile: { name: "x", madhhab: "hanafi" },
        entries: {},
        qadhaPrayers: {},
        qadhaFast: {},
      }),
    ],
    ["an unrelated JSON file", JSON.stringify({ hello: "world" })],
  ] as const;

  it.each(wrongShapes)("rejects %s", (_label, raw) => {
    const result = parseImportedVault(raw);
    expect(result).toEqual({ ok: false, reason: "wrong-shape" });
  });

  it("fills in fields an older export would not have had", () => {
    const bare = JSON.stringify({
      version: 1,
      profile: { name: "Fatimah", madhhab: "syafii" },
      entries: {},
      qadhaPrayers: [],
      qadhaFast: {},
    });

    const result = parseImportedVault(bare);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // `migrate` backfills these; a hand-written minimal file should not crash.
      expect(result.data.profile.location.tz).toBeTypeOf("number");
      expect(result.data.amalan).toEqual({});
      expect(result.data.ghuslSteps).toEqual({});
    }
  });
});
