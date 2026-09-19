"use client";

import { useRouter } from "next/navigation";
import { Screen } from "@/components/shell";
import { CheckIcon, WavesIcon } from "@/components/icons";
import {
  BackLink,
  CitationCard,
  IconBubble,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui";
import { useApp } from "@/lib/store/app-store";

const MENOPAUSE_AGE = [
  { madhhab: "Hanafi", age: "55 tahun" },
  { madhhab: "Maliki", age: "70 tahun" },
  { madhhab: "Syafi'i", age: "tidak ada batas baku, ghalibnya 62 tahun" },
  { madhhab: "Hanbali", age: "50 tahun" },
];

export default function MenopausePage() {
  const router = useRouter();
  const { data, update } = useApp();
  if (!data) return null;

  const active = data.profile.specialState === "menopause";

  const toggleMode = async () => {
    await update((draft) => {
      draft.profile.specialState = active ? "normal" : "menopause";
    });
    router.push("/");
  };

  return (
    <Screen tabBar={false} className="gap-[13px] pt-1.5">
      <BackLink href="/edukasi" label="Edukasi" />

      <section className="flex flex-col items-center gap-[13px] rounded-3xl border border-peach-b bg-peach px-5 py-[22px] text-center shadow-card">
        <div className="flex h-[86px] w-[86px] items-center justify-center text-peach-tx">
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="40" cy="40" r="17" strokeWidth="2" />
            <path
              d="M40 8v9M40 63v9M8 40h9M63 40h9M17 17l6 6M57 57l6 6M63 17l-6 6M23 57l-6 6"
              strokeWidth="2"
            />
            <circle
              cx="40"
              cy="40"
              r="37"
              stroke="var(--peach-b)"
              strokeWidth="1"
              strokeDasharray="3 6"
            />
          </svg>
        </div>
        <div>
          <h1 className="m-0 text-[23px]/[1.25] font-bold tracking-[-.02em] text-peach-tx">
            Fase baru, tenang
          </h1>
          <p className="mt-2 mb-0 text-sm/[1.6] text-balance text-tx2">
            Siklusmu selesai bertugas. Ibadahmu kini berjalan tanpa jeda, dan
            itu kabar baik.
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-start gap-3 rounded-2xl border border-hair px-[15px] py-3.5">
          <IconBubble tone="sage">
            <CheckIcon size={16} strokeWidth={2.2} />
          </IconBubble>
          <span>
            <span className="block text-[14.5px]/[1.3] font-semibold text-tx">
              Shalat dan puasa tanpa jeda
            </span>
            <span className="mt-0.5 block text-justify text-pretty text-[12.5px]/[1.55] text-tx2">
              Tidak ada lagi hari libur wajib. Pelacakan siklus dinonaktifkan
              otomatis.
            </span>
          </span>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-hair px-[15px] py-3.5">
          <IconBubble tone="peach">
            <WavesIcon size={16} strokeWidth={1.8} />
          </IconBubble>
          <span>
            <span className="block text-[14.5px]/[1.3] font-semibold text-tx">
              Kalau darah muncul lagi
            </span>
            <span className="mt-0.5 block text-justify text-pretty text-[12.5px]/[1.55] text-tx2">
              Catat saja di aplikasi. Selama Mode Menopause aktif, darah itu
              dihukumi istihadhah dan ibadah tetap berjalan.
            </span>
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-stone-b bg-stone-card p-4">
        <div className="t-label text-stone-tx2">Dasar hukum</div>
        <p className="m-0 text-[12.5px]/[1.65] text-stone-tx2">
          Perempuan yang sudah menopause dihukumi suci terus-menerus. Darah yang
          keluar setelahnya dihukumi istihadhah, sehingga ibadah tetap
          dijalankan dengan tata cara istihadhah.
        </p>
        <ul className="m-0 flex list-none flex-col gap-1.5 rounded-xl bg-stone-bg p-0 px-[13px] py-[11px] text-[12px]/[1.55] text-stone-tx2">
          {MENOPAUSE_AGE.map((m) => (
            <li key={m.madhhab}>
              <span className="font-semibold text-stone-tx">
                {m.madhhab}:
              </span>{" "}
              {m.age}.
            </li>
          ))}
        </ul>
        <CitationCard
          work="Al-Fiqh al-Islami wa Adillatuhu, Wahbah az-Zuhaili"
          locus="Juz 1, Bab Haid, pembahasan usia haid dan sinn al-ya's (usia menopause)"
        />
      </section>

      <div className="mt-auto pt-3 pb-5">
        {active ? (
          <SecondaryButton onClick={toggleMode}>
            Matikan Mode Menopause
          </SecondaryButton>
        ) : (
          <PrimaryButton className="h-[52px] text-[15px]" onClick={toggleMode}>
            Aktifkan Mode Menopause
          </PrimaryButton>
        )}
      </div>
    </Screen>
  );
}
