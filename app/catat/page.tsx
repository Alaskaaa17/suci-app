"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { LegalBasis } from "@/components/legal-basis";
import { Screen } from "@/components/shell";
import { CalendarIcon, DropIcon } from "@/components/icons";
import { StatusGlyph, STATUS_LABEL } from "@/components/status-glyph";
import {
  Chip,
  cx,
  IconBubble,
  PrimaryButton,
  SectionLabel,
  Toggle,
} from "@/components/ui";
import { formatLong, todayIso, type IsoDate } from "@/lib/date";
import type { BloodColor, Flow } from "@/lib/fiqh/types";
import { useApp } from "@/lib/store/app-store";

const SYMPTOMS = [
  "Kram perut",
  "Pegal punggung",
  "Sakit kepala",
  "Mual",
  "Lelah",
  "Jerawat",
];

const MOODS = ["Tenang", "Sensitif", "Mudah lelah", "Bahagia"];

const FLOWS: Array<{ value: Flow; label: string; dots: number }> = [
  { value: "ringan", label: "Ringan", dots: 1 },
  { value: "sedang", label: "Sedang", dots: 2 },
  { value: "banyak", label: "Banyak", dots: 3 },
];

const COLORS: Array<{ value: BloodColor; label: string }> = [
  { value: "merah", label: "Merah" },
  { value: "kuning", label: "Kuning" },
  { value: "keruh", label: "Keruh" },
];

export default function CatatPage() {
  return (
    <Suspense fallback={<Screen className="pt-3" />}>
      <CatatScreen />
    </Suspense>
  );
}

function CatatScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { entryFor, setEntry, verdictFor, analysis, today } = useApp();

  const requested = params.get("tanggal");
  const date: IsoDate = requested ?? today ?? todayIso();

  const stored = entryFor(date);
  const [draft, setDraft] = useState(stored);
  const [saved, setSaved] = useState(false);

  // Reloading the screen for a different date must not keep the old draft.
  useEffect(() => {
    setDraft(stored);
    setSaved(false);
    // `stored` is derived from the vault; keying on the date is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const verdict = useMemo(() => verdictFor(date), [verdictFor, date]);
  const dayOfEpisode = analysis?.rulings.get(date)?.dayOfEpisode;

  const patch = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };

  const toggleIn = (list: string[], item: string) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  // Sealing the vault costs a PBKDF2 pass, so "Tersimpan" waits for the write
  // to land rather than for the click. Navigating away early must not lose it.
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    await setEntry(date, draft);
    setSaving(false);
    setSaved(true);
  };

  const isToday = date === today;

  return (
    <Screen className="pt-3">
      <h1 className="t-headline m-0 text-tx">
        {isToday ? "Catat hari ini" : "Catat tanggal ini"}
      </h1>

      <button
        type="button"
        onClick={() => router.push("/kalender")}
        className="flex items-center gap-3 rounded-2xl border border-hair px-[15px] py-[13px] text-left transition hover:border-rose-b"
      >
        <IconBubble tone="rose">
          <CalendarIcon size={16} />
        </IconBubble>
        <span className="flex-1">
          <span className="t-label block text-tx2">Tanggal</span>
          <span className="mt-1 block text-[15px]/[1.2] font-semibold text-tx">
            {formatLong(date)}
          </span>
        </span>
        <span className="text-xs font-semibold text-tx2">Ubah</span>
      </button>

      <div className="flex items-center gap-[13px] rounded-[18px] border border-rose-b bg-rose px-4 py-[15px] shadow-card">
        <IconBubble tone="rose" className="bg-bg text-icon">
          <DropIcon size={16} />
        </IconBubble>
        <span className="flex-1">
          <span className="block text-[15.5px]/[1.25] font-semibold text-tx">
            Ada darah hari ini
          </span>
          <span className="mt-0.5 block text-[12.5px]/[1.4] text-tx2">
            {draft.bleeding
              ? dayOfEpisode
                ? `Aktif, hari ke-${dayOfEpisode} ${verdict ? STATUS_LABEL[verdict.classification].toLowerCase() : ""}`
                : "Aktif"
              : "Tidak ada"}
          </span>
        </span>
        <Toggle
          checked={draft.bleeding}
          onChange={(v) => patch("bleeding", v)}
          label="Ada darah hari ini"
        />
      </div>

      {draft.bleeding && (
        <>
          <div>
            <SectionLabel>Kekuatan darah</SectionLabel>
            <div className="mt-2.5 flex gap-1.5 rounded-full border border-hair p-[5px]">
              {FLOWS.map((f) => {
                const active = draft.flow === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => patch("flow", f.value)}
                    className={cx(
                      "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] transition",
                      active
                        ? "border border-rose-b bg-rose font-semibold text-tx"
                        : "font-medium text-tx2 hover:bg-rose",
                    )}
                  >
                    <span className="flex gap-0.5" aria-hidden="true">
                      {Array.from({ length: f.dots }, (_, i) => (
                        <span
                          key={i}
                          className={cx(
                            "block h-[5px] w-[5px] rounded-full",
                            active ? "bg-icon" : "bg-current",
                          )}
                        />
                      ))}
                    </span>
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <SectionLabel>Warna darah</SectionLabel>
            <p className="mt-1 mb-2.5 text-[12px]/[1.5] text-tx2">
              Sebagian mazhab membedakan darah kuning dan keruh dari darah
              merah, jadi ini ikut menentukan kesimpulannya.
            </p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <Chip
                  key={c.value}
                  active={(draft.color ?? "merah") === c.value}
                  onClick={() => patch("color", c.value)}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>
        </>
      )}

      <div>
        <SectionLabel>Gejala fisik</SectionLabel>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <Chip
              key={s}
              active={draft.symptoms.includes(s)}
              onClick={() => patch("symptoms", toggleIn(draft.symptoms, s))}
            >
              {s}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Suasana hati</SectionLabel>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <Chip
              key={m}
              active={draft.mood.includes(m)}
              onClick={() => patch("mood", toggleIn(draft.mood, m))}
            >
              {m}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Catatan bebas</SectionLabel>
        <textarea
          value={draft.note ?? ""}
          onChange={(e) => patch("note", e.target.value)}
          rows={3}
          placeholder="Tulis apa saja yang ingin kamu ingat hari ini…"
          aria-label="Catatan bebas"
          className="mt-2.5 min-h-[74px] w-full resize-none rounded-2xl border border-field-b bg-transparent px-[15px] py-[13px] text-[13.5px]/[1.6] text-tx placeholder:text-tx2/75"
        />
      </div>

      {verdict && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[12.5px] text-tx2">
            <StatusGlyph status={verdict.classification} size={7} />
            <span>
              Status untuk tanggal ini:{" "}
              <span className="font-semibold text-tx">
                {STATUS_LABEL[verdict.classification]}
              </span>
            </span>
          </div>
          <LegalBasis verdict={verdict} />
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2 pb-4">
        <PrimaryButton onClick={save} disabled={saving}>
          {saving ? "Menyimpan…" : saved ? "Tersimpan" : "Simpan catatan"}
        </PrimaryButton>
        {saved && (
          <p className="m-0 text-center text-[12px]/[1.5] text-tx2">
            Catatanmu tersimpan. Status di atas sudah dihitung ulang.
          </p>
        )}
      </div>
    </Screen>
  );
}
