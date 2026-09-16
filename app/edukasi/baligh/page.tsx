"use client";

import { Screen } from "@/components/shell";
import { BackLink, PrimaryLink } from "@/components/ui";

const POINTS = [
  {
    n: 1,
    title: "Yang berubah",
    body: "Sejak haid pertama, kamu mulai menanggung kewajiban ibadah sendiri — dan juga keringanannya.",
  },
  {
    n: 2,
    title: "Saat haid",
    body: "Kamu libur shalat dan puasa. Puasa Ramadan diganti nanti, shalat tidak perlu diganti.",
  },
  {
    n: 3,
    title: "Setelah berhenti",
    body: "Mandi wajib sekali, lalu ibadah kembali seperti biasa. Panduannya ada di halaman Mandi Wajib.",
  },
];

export default function BalighPage() {
  return (
    <Screen tabBar={false} className="pt-1.5">
      <BackLink href="/edukasi" label="Edukasi" />

      <section className="flex flex-col items-center gap-3.5 rounded-3xl border border-rose-b bg-rose px-5 py-[22px] text-center shadow-card">
        <div className="flex h-24 w-24 items-center justify-center text-icon">
          <svg
            width="88"
            height="88"
            viewBox="0 0 88 88"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle
              cx="44"
              cy="44"
              r="41"
              stroke="var(--rose-b)"
              strokeWidth="1"
              strokeDasharray="3 6"
            />
            <path
              d="M44 18l3.6 9.8 9.8 3.6-9.8 3.6L44 44.8l-3.6-9.8-9.8-3.6 9.8-3.6z"
              strokeWidth="2"
            />
            <path d="M28 58c5 3 11 3 16 0s11-3 16 0" strokeWidth="2" />
            <path
              d="M32 67c4 2.4 8 2.4 12 0s8-2.4 12 0"
              strokeWidth="2"
              stroke="var(--rose-b)"
            />
          </svg>
        </div>
        <div>
          <h1 className="m-0 text-2xl/[1.25] font-bold tracking-[-.02em] text-tx">
            Selamat, kamu tumbuh
          </h1>
          <p className="mt-2 mb-0 text-[14.5px]/[1.6] text-balance text-tx2">
            Haid pertama itu tanda tubuhmu bekerja dengan baik. Tidak ada yang
            kotor, tidak ada yang perlu disembunyikan.
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-2.5">
        {POINTS.map((p) => (
          <div
            key={p.n}
            className="flex items-start gap-3 rounded-2xl border border-hair px-[15px] py-3.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage text-[13px]/[1] font-bold text-sage-tx">
              {p.n}
            </span>
            <span>
              <span className="block text-[14.5px]/[1.3] font-semibold text-tx">
                {p.title}
              </span>
              <span className="mt-0.5 block text-[12.5px]/[1.55] text-tx2">
                {p.body}
              </span>
            </span>
          </div>
        ))}
      </div>

      <section className="rounded-[18px] border border-stone-b bg-stone-card px-4 py-[15px]">
        <div className="t-label mb-2 text-stone-tx2">Catatan fiqih</div>
        <p className="m-0 text-[12.5px]/[1.65] text-stone-tx2">
          Baligh bagi perempuan ditandai haid pertama, atau usia 15 tahun
          hijriah bila belum haid. Sejak itu kewajiban syariat berlaku penuh.
        </p>
        <div className="mt-[9px] border-t border-stone-b pt-[9px] text-[11.5px]/[1.5] text-stone-tx2">
          Kifayatul Akhyar, Bab Baligh
        </div>
      </section>

      <div className="mt-auto pt-3 pb-5">
        <PrimaryLink href="/ibadah/mandi-wajib" className="h-[52px] text-[15px]">
          Baca panduan langkah pertama
        </PrimaryLink>
      </div>
    </Screen>
  );
}
