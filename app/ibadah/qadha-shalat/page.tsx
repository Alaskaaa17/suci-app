"use client";

import { useState } from "react";
import { Screen } from "@/components/shell";
import {
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  MinusIcon,
  PlusIcon,
} from "@/components/icons";
import {
  BackLink,
  CitationCard,
  cx,
  IconBubble,
  SecondaryButton,
  SectionLabel,
} from "@/components/ui";
import { formatMedium, todayIso } from "@/lib/date";
import { CONSENSUS } from "@/lib/fiqh/madhhab";
import { useApp } from "@/lib/store/app-store";
import type { PrayerSlot } from "@/lib/store/vault";

const SLOTS: PrayerSlot[] = ["Subuh", "Zuhur", "Asar", "Magrib", "Isya"];

export default function QadhaShalatPage() {
  const { data, addQadhaPrayer, settleQadhaPrayer } = useApp();
  const [slot, setSlot] = useState<PrayerSlot>("Subuh");
  const [count, setCount] = useState(1);
  const [reason, setReason] = useState("");

  if (!data) return null;

  const outstanding = data.qadhaPrayers.filter((q) => !q.settledOn);
  const settled = data.qadhaPrayers.filter((q) => q.settledOn);

  return (
    <Screen tabBar={false} className="pt-1.5">
      <BackLink href="/ibadah" label="Ibadah" />

      <div>
        <h1 className="t-headline m-0 text-tx">Qadha shalat</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          Untuk shalat yang terlewat bukan karena haid — misalnya tertidur atau
          lupa.
        </p>
      </div>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-stone-b bg-stone-card p-[17px]">
        <div className="t-label text-stone-tx2">Dasar hukum</div>
        <p className="m-0 text-[13px]/[1.65] text-stone-tx2">
          Shalat yang ditinggalkan karena haid{" "}
          <span className="font-semibold text-stone-tx">tidak diqadha</span> —
          empat mazhab sepakat. Yang diqadha hanyalah shalat yang terlewat di
          masa suci.
        </p>
        <CitationCard
          work={CONSENSUS.prayerNotMadeUp.citation.work}
          locus={CONSENSUS.prayerNotMadeUp.citation.locus}
          note={CONSENSUS.prayerNotMadeUp.citation.note}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] border border-hair bg-bg p-4 shadow-card">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
          Tambah catatan
        </h2>

        <div className="flex gap-2.5">
          <label className="relative flex flex-[1.4] items-center justify-between rounded-[14px] border border-hair px-[13px] py-3">
            <span className="sr-only">Waktu shalat</span>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value as PrayerSlot)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            >
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="text-[13.5px]/[1] font-medium text-tx">{slot}</span>
            <ChevronDownIcon size={16} className="text-tx2" />
          </label>

          <div className="flex flex-1 items-center justify-between rounded-[14px] border border-hair px-[13px] py-3">
            <span className="text-[13.5px]/[1] font-medium text-tx">
              {count}×
            </span>
            <span className="flex gap-2.5 text-tx2">
              <button
                type="button"
                aria-label="Kurangi"
                onClick={() => setCount((c) => Math.max(1, c - 1))}
                className="transition hover:text-tx"
              >
                <MinusIcon size={15} />
              </button>
              <button
                type="button"
                aria-label="Tambah"
                onClick={() => setCount((c) => Math.min(99, c + 1))}
                className="transition hover:text-tx"
              >
                <PlusIcon size={15} />
              </button>
            </span>
          </div>
        </div>

        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Alasan, misalnya ketiduran"
          aria-label="Alasan terlewat"
          className="rounded-[14px] border border-hair bg-transparent px-[13px] py-3 text-[13.5px] text-tx placeholder:text-tx2/75"
        />

        <SecondaryButton
          className="h-12 text-[14.5px]"
          onClick={() => {
            addQadhaPrayer({
              slot,
              count,
              reason: reason.trim() || "Terlewat di masa suci",
              missedOn: todayIso(),
            });
            setCount(1);
            setReason("");
          }}
        >
          Tambahkan
        </SecondaryButton>
      </section>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <SectionLabel>Belum lunas</SectionLabel>
          <span
            className={cx(
              "rounded-full border px-2.5 py-[5px] text-[11px]/[1] font-semibold",
              outstanding.length
                ? "border-peach-b bg-peach text-peach-tx"
                : "border-sage-b bg-sage text-sage-tx",
            )}
          >
            {outstanding.length} catatan
          </span>
        </div>

        {outstanding.length === 0 && (
          <p className="m-0 rounded-2xl border border-hair px-[15px] py-3.5 text-[13px]/[1.6] text-tx2">
            Tidak ada shalat yang menunggu qadha. Kalau ada yang terlewat di
            masa suci, catat dari kotak di atas.
          </p>
        )}

        {outstanding.map((q) => (
          <div
            key={q.id}
            className="flex items-center gap-3 rounded-2xl border border-peach-b bg-peach px-[15px] py-3.5"
          >
            <IconBubble tone="peach" className="bg-bg text-peach-tx">
              <ClockIcon size={16} />
            </IconBubble>
            <span className="flex-1">
              <span className="block text-[14.5px]/[1.3] font-semibold text-tx">
                {q.slot} · {q.count}×
              </span>
              <span className="block text-[12.5px]/[1.4] text-tx2">
                {q.reason}
                {q.missedOn ? ` · ${formatMedium(q.missedOn)}` : ""}
              </span>
            </span>
            <button
              type="button"
              onClick={() => settleQadhaPrayer(q.id)}
              className="rounded-full border border-peach-b bg-bg px-[11px] py-[7px] text-[12.5px]/[1] font-semibold text-peach-tx transition hover:brightness-95"
            >
              Lunas
            </button>
          </div>
        ))}

        {settled.length > 0 && (
          <>
            <SectionLabel>Sudah lunas</SectionLabel>
            {settled.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-3 rounded-2xl border border-hair px-[15px] py-3.5"
              >
                <IconBubble tone="sage">
                  <CheckIcon size={16} strokeWidth={2.2} />
                </IconBubble>
                <span className="flex-1">
                  <span className="block text-[14.5px]/[1.3] font-semibold text-tx2 line-through">
                    {q.slot} · {q.count}×
                  </span>
                  <span className="block text-[12.5px]/[1.4] text-tx2">
                    Dilunasi {q.settledOn ? formatMedium(q.settledOn) : "—"}
                  </span>
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      <p className="mt-auto pt-3 pb-5 text-center text-[12.5px]/[1.55] text-tx2">
        Belum ada yang perlu dikhawatirkan. Cicil pelan-pelan saja.
      </p>
    </Screen>
  );
}
