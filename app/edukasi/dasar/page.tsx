"use client";

import { Screen } from "@/components/shell";
import { CheckIcon, CloseIcon } from "@/components/icons";
import { BackLink, CitationCard, IconBubble } from "@/components/ui";
import { CONSENSUS, MADHHABS } from "@/lib/fiqh/madhhab";
import { useApp } from "@/lib/store/app-store";

/**
 * Linked from the education landing. Not drawn in the canvas, so it follows
 * the same composition rules as the drawn screens: warm layer for the app's
 * voice, stone layer wherever a source is quoted.
 */

const PAUSED = [
  "Shalat lima waktu, dan tidak diqadha",
  "Puasa Ramadan, diqadha nanti",
  "Thawaf di Ka'bah",
];

const OPEN = [
  "Dzikir, doa, istighfar, shalawat",
  "Mendengarkan Al-Qur'an",
  "Sedekah dan membantu orang",
  "Belajar dan mengajar agama",
  "Hadir di majelis ilmu",
];

const BLOOD_COLORS = [
  {
    name: "Hitam",
    swatch: "#2A2320",
    note: "Sebagian kitab fiqih menyebut darah haid yang pekat berwarna hitam, terasa panas, dan berbau.",
  },
  {
    name: "Merah",
    swatch: "#9E2B2B",
    note: "Warna yang paling banyak dialami, ada yang merah pekat, ada yang merah hati.",
  },
  {
    name: "Coklat",
    swatch: "#7A4B32",
    note: "Sering muncul di awal atau akhir masa haid. Urutan warnanya berbeda-beda pada tiap orang.",
  },
  {
    name: "Kuning",
    swatch: "#C99A3B",
    note: "Sering dikira tanda sudah suci, padahal belum, selama warnanya belum putih bersih.",
  },
  {
    name: "Keruh",
    swatch: "#8C8171",
    note: "Sama seperti kuning: belum berarti suci, meski sering disangka sudah waktunya mandi.",
  },
];

const HAID_RULINGS = [
  "Mewajibkan mandi wajib setelah darah berhenti.",
  "Menjadi tanda baligh, awal mula seluruh kewajiban syariat berlaku.",
  "Jadi tanda rahim tidak sedang mengandung (bara'ah rahim).",
  "Jadi dasar hitungan iddah bagi perempuan yang dicerai.",
];

export default function DasarPage() {
  const { data } = useApp();
  const rules = MADHHABS[data?.profile.madhhab ?? "syafii"];

  return (
    <Screen tabBar={false} className="gap-[13px] pt-1.5">
      <BackLink href="/edukasi" label="Edukasi" />

      <div>
        <h1 className="t-headline m-0 text-tx">Dasar haid &amp; thaharah</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          Apa yang berubah saat haid, apa yang tidak, dan kenapa. Cukup sekali
          baca.
        </p>
      </div>

      <section className="rounded-[22px] border border-rose-b bg-rose p-[18px] shadow-card">
        <h2 className="m-0 text-[16.5px]/[1.3] font-semibold text-tx">
          Haid bukan kekurangan
        </h2>
        <p className="mt-2 mb-0 text-[13.5px]/[1.6] text-tx2">
          Libur shalat saat haid adalah <strong>rukhsah</strong>, keringanan
          yang diberikan, bukan hukuman atau tanda kurangnya iman. Kamu tidak
          sedang tertinggal dari siapa pun.
        </p>
      </section>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-hair p-4">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
          Yang berhenti sementara
        </h2>
        {PAUSED.map((item) => (
          <div key={item} className="flex items-center gap-2.5">
            <IconBubble tone="rose" size={26}>
              <CloseIcon size={14} />
            </IconBubble>
            <span className="text-[13px]/[1.5] text-tx2">{item}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-hair p-4">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
          Yang tetap terbuka
        </h2>
        {OPEN.map((item) => (
          <div key={item} className="flex items-center gap-2.5">
            <IconBubble tone="sage" size={26}>
              <CheckIcon size={14} strokeWidth={2.4} />
            </IconBubble>
            <span className="text-[13px]/[1.5] text-tx2">{item}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] border border-hair p-4">
        <div>
          <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
            Warna darah haid
          </h2>
          <p className="mt-1 mb-0 text-[12.5px]/[1.55] text-tx2">
            Darah haid tidak selalu merah. Lima warna ini yang dikenali dalam
            fiqih.
          </p>
        </div>
        {BLOOD_COLORS.map((c) => (
          <div key={c.name} className="flex items-start gap-2.5">
            <span
              className="mt-1 block h-4 w-4 shrink-0 rounded-full border border-hair"
              style={{ backgroundColor: c.swatch }}
              aria-hidden="true"
            />
            <span className="text-[13px]/[1.5] text-tx2">
              <span className="font-semibold text-tx">{c.name}.</span>{" "}
              {c.note}
            </span>
          </div>
        ))}
        <div className="rounded-2xl bg-rose px-[15px] py-3.5">
          <p className="m-0 text-[12.5px]/[1.6] font-medium text-tx">
            Suci baru terjadi kalau cairan yang keluar sudah bersih, putih
            seperti kapas atau tisu, bukan kuning atau keruh.
          </p>
        </div>
        <CitationCard
          work="Risalatul Mahid"
          note="Disusun berdasarkan dalil dan pengamatan langsung pada ratusan perempuan dari berbagai daerah dan latar ekonomi."
        />
      </section>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-stone-b bg-stone-card p-4">
        <div className="t-label text-stone-tx2">
          Lima hukum yang berlaku karena haid
        </div>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[12.5px]/[1.65] text-stone-tx2">
          {HAID_RULINGS.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>
            Jadi dasar kafarat bagi suami yang menggauli istri saat haid,
            menurut mazhab Hanbali.
          </li>
        </ul>
        <CitationCard
          work="Al-Fiqh al-Islami wa Adillatuhu, Wahbah az-Zuhaili"
          locus="Juz 1, Bab Haid: Hukum-hukum Haid dan Nifas"
        />
      </section>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-stone-b bg-stone-card p-4">
        <div className="t-label text-stone-tx2">
          Kenapa puasa diqadha tapi shalat tidak
        </div>
        <p className="m-0 text-[12.5px]/[1.65] text-stone-tx2">
          {CONSENSUS.prayerNotMadeUp.claim} Alasannya praktis: shalat berulang
          lima kali sehari, sehingga mengqadhanya akan memberatkan; puasa hanya
          sebulan dalam setahun.
        </p>
        <CitationCard
          work={CONSENSUS.prayerNotMadeUp.citation.work}
          locus={CONSENSUS.prayerNotMadeUp.citation.locus}
          note={CONSENSUS.prayerNotMadeUp.citation.note}
        />
      </section>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-stone-b bg-stone-card p-4">
        <div className="t-label text-stone-tx2">
          Batas menurut mazhab {rules.name}
        </div>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[12.5px]/[1.65] text-stone-tx2">
          <li>
            Haid berlangsung{" "}
            <span className="font-semibold text-stone-tx">
              {rules.haidMinDays}–{rules.haidMaxDays} hari
            </span>
            .
          </li>
          <li>
            Masa suci antara dua haid minimal{" "}
            <span className="font-semibold text-stone-tx">
              {rules.minTuhrDays} hari
            </span>
            .
          </li>
          <li>
            Nifas maksimal{" "}
            <span className="font-semibold text-stone-tx">
              {rules.nifasMaxDays} hari
            </span>
            .
          </li>
        </ul>
        <CitationCard
          work={rules.haidCitation.work}
          locus={rules.haidCitation.locus}
          note={rules.haidCitation.note}
        />
      </section>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-sage-b bg-sage p-4">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-sage-tx">
          Setelah darah berhenti
        </h2>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          Satu kali mandi wajib, lalu semuanya kembali seperti biasa. Tidak
          perlu menunggu waktu shalat tertentu, dan tidak perlu mengulang
          apa pun yang terlewat.
        </p>
      </section>
    </Screen>
  );
}
