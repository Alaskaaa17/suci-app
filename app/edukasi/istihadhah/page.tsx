"use client";

import { Screen } from "@/components/shell";
import { InfoDotIcon, WarningIcon } from "@/components/icons";
import {
  Advisory,
  BackLink,
  CitationCard,
  IconBubble,
} from "@/components/ui";
import { MADHHABS } from "@/lib/fiqh/madhhab";
import { useApp } from "@/lib/store/app-store";

const MUSTAHADHAH_STATES = [
  {
    n: 1,
    title: "Sudah punya kebiasaan",
    body: "Pakai lama haid yang biasa kamu alami sebelum darah terus-menerus ini muncul. Sisanya dihukumi istihadhah.",
  },
  {
    n: 2,
    title: "Bisa membedakan ciri darah (tamyiz)",
    body: "Belum punya kebiasaan, tapi darahnya punya ciri yang beda-beda. Darah yang lebih kuat (hitam pekat, kental, berbau) dihukumi haid; sisanya istihadhah.",
  },
  {
    n: 3,
    title: "Tidak punya kebiasaan dan tidak bisa membedakan",
    body: "Dihukumi haid mengikuti kebiasaan umum perempuan: 6-7 hari tiap bulan sejak darah pertama kali keluar. Sisanya istihadhah.",
  },
];

const STEPS = [
  {
    n: 1,
    title: "Bersihkan dan tahan",
    body: "Cuci bagian yang terkena, lalu pakai pembalut atau penahan supaya darah tidak menyebar.",
  },
  {
    n: 2,
    title: "Berwudhu setiap masuk waktu",
    body: "Wudhu dilakukan setelah waktu shalat masuk, bukan sebelumnya.",
  },
  {
    n: 3,
    title: "Shalat seperti biasa",
    body: "Darah yang tetap keluar selama shalat dimaafkan. Shalatmu sah.",
  },
];

export default function IstihadhahPage() {
  const { data } = useApp();
  const rules = MADHHABS[data?.profile.madhhab ?? "syafii"];

  return (
    <Screen tabBar={false} className="gap-[13px] pt-1.5">
      <BackLink href="/edukasi" label="Edukasi" />

      <div>
        <h1 className="t-headline m-0 text-tx">Istihadhah</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          Darah yang keluar di luar masa haid dan nifas. Ibadah tetap berjalan,
          dengan cara yang diringankan.
        </p>
      </div>

      <section className="rounded-[22px] border border-peach-b bg-peach p-[18px] shadow-card">
        <h2 className="m-0 text-[16.5px]/[1.3] font-semibold text-peach-tx">
          Kapan darah disebut istihadhah?
        </h2>
        <ul className="mt-2.5 mb-0 flex list-none flex-col gap-2 p-0 text-[13px]/[1.6] text-tx2">
          <li>
            Kurang dari batas minimal haid mazhabmu,{" "}
            <span className="font-semibold text-peach-tx">
              {rules.haidMinDays === 0
                ? "mazhab ini tidak punya batas minimal"
                : `${rules.haidMinDays} hari`}
            </span>
            .
          </li>
          <li>
            Lewat batas maksimal haid,{" "}
            <span className="font-semibold text-peach-tx">
              {rules.haidMaxDays} hari
            </span>
            . Hari-hari sesudahnya dihukumi istihadhah.
          </li>
          <li>
            Muncul sebelum masa suci minimal{" "}
            <span className="font-semibold text-peach-tx">
              {rules.minTuhrDays} hari
            </span>{" "}
            terpenuhi.
          </li>
          {!rules.haidDuringPregnancy && (
            <li>Keluar saat hamil, menurut mazhab {rules.name}.</li>
          )}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] border border-hair p-4">
        <div>
          <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
            Tiga kondisi mustahadhah
          </h2>
          <p className="mt-1 mb-0 text-[12.5px]/[1.55] text-tx2">
            Kalau darah tidak pernah berhenti, cara memisahkan haid dari
            istihadhah bergantung pada kondisi mana yang kamu alami.
          </p>
        </div>
        {MUSTAHADHAH_STATES.map((s) => (
          <div key={s.n} className="flex items-start gap-3">
            <IconBubble tone="peach" size={28}>
              <span className="text-xs/[1] font-bold">{s.n}</span>
            </IconBubble>
            <span>
              <span className="block text-[14px]/[1.3] font-semibold text-tx">
                {s.title}
              </span>
              <span className="mt-0.5 block text-[12.5px]/[1.55] text-tx2">
                {s.body}
              </span>
            </span>
          </div>
        ))}
        <CitationCard
          work="Al-Fiqh al-Islami wa Adillatuhu, Wahbah az-Zuhaili"
          locus="Juz 1, Bab Haid: Istihadhah dan Hukumnya, pembahasan penentuan masa haid bagi mustahadhah"
          note="Kondisi 1 dan 3 berdasar hadits riwayat Abu Dawud dan Tirmidzi (Hamnah binti Jahsy); kondisi 2 berdasar hadits riwayat Bukhari-Muslim (Fatimah binti Abi Hubaisy)."
        />
      </section>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-hair p-4">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
          Yang perlu kamu lakukan
        </h2>
        {STEPS.map((s) => (
          <div key={s.n} className="flex items-start gap-3">
            <IconBubble tone="peach" size={28}>
              <span className="text-xs/[1] font-bold">{s.n}</span>
            </IconBubble>
            <span>
              <span className="block text-[14px]/[1.3] font-semibold text-tx">
                {s.title}
              </span>
              <span className="mt-0.5 block text-[12.5px]/[1.55] text-tx2">
                {s.body}
              </span>
            </span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-stone-b bg-stone-card p-4">
        <div className="t-label text-stone-tx2">Dasar hukum</div>
        <p className="m-0 text-[12.5px]/[1.65] text-stone-tx2">
          Perempuan mustahadhah tetap diperintahkan shalat. Darah istihadhah
          dihukumi seperti hadas yang terus-menerus, sehingga cukup berwudhu
          setiap kali masuk waktu shalat.
        </p>
        <CitationCard
          work="Sahih al-Bukhari"
          locus="no. 228"
          note="Riwayat tentang perempuan yang istihadhah, diperintahkan tetap shalat."
        />
      </section>

      <section className="flex flex-col gap-2 rounded-[20px] border border-hair p-4">
        <div className="flex items-center gap-2.5">
          <IconBubble tone="rose" size={28}>
            <InfoDotIcon size={15} />
          </IconBubble>
          <h2 className="m-0 text-[15px]/[1.3] font-semibold text-tx">
            Cara Suci menandainya
          </h2>
        </div>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          Hari istihadhah muncul di Kalender dengan cincin putus-putus di atas
          latar peach, dan diberi label teks. Setiap harinya bisa kamu ketuk
          untuk melihat alasannya.
        </p>
      </section>

      <Advisory icon={<WarningIcon size={15} />}>
        Memisahkan hari haid dari istihadhah pada pendarahan panjang memerlukan
        tamyiz dan kebiasaanmu sendiri. Suci berhenti pada kasus seperti itu dan
        menyarankanmu bertanya pada ulama. Bawa saja catatan tanggalmu.
      </Advisory>
    </Screen>
  );
}
