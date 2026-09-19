"use client";

import { useState } from "react";
import { Screen } from "@/components/shell";
import { BackLink, cx } from "@/components/ui";
import {
  haidRangeLabel,
  MADHHAB_ORDER,
  MADHHABS,
  type MadhhabId,
  type MadhhabRules,
} from "@/lib/fiqh/madhhab";
import { useApp } from "@/lib/store/app-store";

/**
 * Screen 15. Rendered entirely on the neutral stone layer, and every number
 * here is read from the rule table — so a correction in `madhhab.ts` shows up
 * on this page and in the user's actual ruling at the same time.
 */

type Topic = "haid" | "nifas" | "hamil" | "kuning" | "usia";

/**
 * Not tracked in madhhab.ts since nothing in the app calculates from it —
 * shown here only as a comparison. Source: Al-Fiqh al-Islami wa Adillatuhu,
 * Wahbah az-Zuhaili, Juz 1, Bab Haid, pembahasan sinn al-ya's.
 */
const MENOPAUSE_AGE: Record<MadhhabId, { headline: string; detail: string }> = {
  hanafi: {
    headline: "55 tahun",
    detail: "Dipatok pada usia 55 tahun sebagai batas menopause.",
  },
  maliki: {
    headline: "70 tahun",
    detail: "Dipatok pada usia 70 tahun sebagai batas menopause.",
  },
  syafii: {
    headline: "Tidak dibatasi",
    detail:
      "Tidak ada batas usia baku selama masih hidup haid tetap mungkin terjadi, tapi ghalibnya berhenti sekitar usia 62 tahun.",
  },
  hanbali: {
    headline: "50 tahun",
    detail: "Dipatok pada usia 50 tahun sebagai batas menopause.",
  },
};

const TOPICS: Array<{
  id: Topic;
  label: string;
  title: string;
  intro: string;
  value: (r: MadhhabRules) => { headline: string; unit?: string };
  detail: (r: MadhhabRules) => string;
  citation: (r: MadhhabRules) => string;
}> = [
  {
    id: "haid",
    label: "Batas haid",
    title: "Batas maksimal haid",
    intro:
      "Empat pendapat, empat metode. Perbedaan ini sah dan sudah ada sejak generasi awal.",
    value: (r) => ({ headline: haidRangeLabel(r), unit: "hari" }),
    detail: (r) => r.haidDetail,
    citation: (r) => `${r.haidCitation.work}, ${r.haidCitation.locus}`,
  },
  {
    id: "nifas",
    label: "Batas nifas",
    title: "Batas maksimal nifas",
    intro:
      "Batas atas, bukan jumlah yang harus digenapkan. Kalau darah berhenti lebih awal, mandi wajib dan kembali shalat.",
    value: (r) => ({ headline: String(r.nifasMaxDays), unit: "hari" }),
    detail: () =>
      "Bila darah berhenti sebelum batas ini, masa nifas selesai pada hari itu juga.",
    citation: (r) => `${r.nifasCitation.work}, ${r.nifasCitation.locus}`,
  },
  {
    id: "hamil",
    label: "Darah saat hamil",
    title: "Bisakah perempuan hamil haid?",
    intro:
      "Ini menentukan apakah darah saat hamil menghentikan shalat atau tidak.",
    value: (r) => ({ headline: r.haidDuringPregnancy ? "Bisa" : "Tidak" }),
    detail: (r) =>
      r.haidDuringPregnancy
        ? "Perempuan hamil bisa mengalami haid, sehingga darahnya menghentikan shalat dan puasa."
        : "Tidak ada haid saat hamil. Darah yang keluar dihukumi istihadhah dan ibadah tetap berjalan.",
    citation: () => "Bidayatul Mujtahid, Bab Haid",
  },
  {
    id: "kuning",
    label: "Darah kuning",
    title: "Cairan kuning dan keruh",
    intro:
      "Sufrah dan kudrah: apakah cairan kekuningan atau keruh masih dihitung haid.",
    value: (r) => ({ headline: r.yellowDischargeIsHaid ? "Haid" : "Suci" }),
    detail: (r) =>
      r.yellowDischargeIsHaid
        ? "Masih dihitung haid selama muncul dalam masa kebiasaan haid."
        : "Tidak dihitung haid; hari itu dihukumi suci dan ibadah kembali berjalan.",
    citation: (r) => `${r.haidCitation.work}, ${r.haidCitation.locus}`,
  },
  {
    id: "usia",
    label: "Usia menopause",
    title: "Batas usia menopause",
    intro:
      "Bukan batas yang dihitung aplikasi ini, hanya perbandingan pendapat mazhab soal usia berhentinya haid.",
    value: (r) => ({ headline: MENOPAUSE_AGE[r.id].headline }),
    detail: (r) => MENOPAUSE_AGE[r.id].detail,
    citation: () =>
      "Al-Fiqh al-Islami wa Adillatuhu, Wahbah az-Zuhaili, Juz 1, Bab Haid",
  },
];

export default function IkhtilafPage() {
  const { data } = useApp();
  const [topic, setTopic] = useState<Topic>("haid");
  const active = TOPICS.find((t) => t.id === topic)!;
  const mine = data?.profile.madhhab;

  return (
    <Screen tone="stone" tabBar={false} className="gap-3 pt-1.5">
      <BackLink href="/edukasi" label="Edukasi" tone="stone" />

      <div>
        <div className="t-label mb-1.5 text-stone-tx2">Mazhab fiqih</div>
        <h1 className="t-headline m-0 text-stone-tx">{active.title}</h1>
        <p className="mt-[7px] mb-0 text-[13.5px]/[1.6] text-stone-tx2">
          {active.intro}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Topik perbandingan"
        className="flex flex-wrap gap-[7px]"
      >
        {TOPICS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === topic}
            onClick={() => setTopic(t.id)}
            className={cx(
              "rounded-full border px-[13px] py-[7px] text-xs font-medium transition",
              t.id === topic
                ? "border-stone-tx bg-stone-tx text-stone-card"
                : "border-stone-b text-stone-tx2 hover:border-stone-tx2",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {MADHHAB_ORDER.map((id) => {
          const r = MADHHABS[id];
          const v = active.value(r);
          return (
            <article
              key={id}
              className="rounded-[18px] border border-stone-b bg-stone-card px-4 py-[15px]"
            >
              <div className="mb-[7px] flex items-center justify-between gap-2">
                <h2 className="m-0 text-base/[1.3] font-semibold text-stone-tx">
                  {r.name}
                </h2>
                {mine === id && (
                  <span className="rounded-full bg-stone-bg px-2.5 py-1.5 text-[11px]/[1] font-semibold tracking-[.06em] text-stone-tx uppercase">
                    Mazhabmu
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-[7px]">
                <span className="text-[22px]/[1] font-bold text-stone-tx">
                  {v.headline}
                </span>
                {v.unit && (
                  <span className="text-[12.5px]/[1] text-stone-tx2">
                    {v.unit}
                  </span>
                )}
              </div>

              <p className="mt-[7px] mb-0 text-[12.5px]/[1.6] text-stone-tx2">
                {active.detail(r)}
              </p>

              <div className="mt-[9px] border-t border-stone-b pt-[9px] text-[11.5px]/[1.5] text-stone-tx2">
                {active.citation(r)}
              </div>
            </article>
          );
        })}
      </div>

      <p className="m-0 pb-5 text-[12px]/[1.6] text-stone-tx2">
        Angka di halaman ini adalah angka yang sama yang dipakai aplikasi untuk
        menghitung statusmu. Mengganti mazhab di Pengaturan akan mengubah
        keduanya sekaligus.
      </p>
    </Screen>
  );
}
