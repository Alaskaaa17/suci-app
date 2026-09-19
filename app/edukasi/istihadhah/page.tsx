"use client";

import { Screen } from "@/components/shell";
import { CheckIcon, CloseIcon, InfoDotIcon } from "@/components/icons";
import {
  BackLink,
  CitationCard,
  IconBubble,
} from "@/components/ui";
import { MADHHABS } from "@/lib/fiqh/madhhab";
import { useApp } from "@/lib/store/app-store";

const MUSTAHADHAH_STATES = [
  {
    n: 1,
    title: "Bisa membedakan ciri darah (tamyiz)",
    body: "Baik baru pertama kali atau sudah punya kebiasaan: darah yang lebih kuat (hitam pekat, kental, berbau) dihukumi haid, asal tidak kurang dari 24 jam dan tidak lebih dari batas maksimal haid mazhabmu. Darah yang lebih lemah dihukumi istihadhah.",
  },
  {
    n: 2,
    title: "Sudah punya kebiasaan, tapi tidak bisa membedakan ciri darah",
    body: "Masa haid dan sucinya dikembalikan ke kebiasaan lama, dari sebelum darah ini keluar terus-menerus.",
  },
  {
    n: 3,
    title: "Baru pertama kali, dan tidak bisa membedakan ciri darah",
    body: "Dihukumi haid hanya 1 hari 1 malam pertama sejak darah keluar. Sisanya dihukumi istihadhah, sampai kebiasaan barunya terbentuk.",
  },
];

const MUTAHAYYIRAH_LIKE_HAID = [
  "Bersenang-senang (suami-istri) antara pusar dan lutut",
  "Membaca Al-Qur'an di luar shalat",
  "Menyentuh dan membawa mushaf",
  "Diam atau lewat di dalam masjid",
];

const MUTAHAYYIRAH_LIKE_SUCI = [
  "Shalat",
  "Puasa",
  "Thawaf",
  "Mandi wajib",
  "Boleh dithalak suami",
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
          work="Al-Ibanah wal Ifadhah fi Ahkamil Haidh wan Nifas wal Istihadhah, Sayyid Abdurrahman as-Saqaf"
          locus="hlm. 63-76, merujuk Nihayatul Muhtaj ila Syarhil Minhaj karya Syamsuddin ar-Ramli"
          note="Istilah fiqihnya: kondisi 1 disebut mumayyizah, kondisi 2 mu'tadah ghairu mumayyizah, kondisi 3 mubtada'ah ghairu mumayyizah."
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

      <section className="flex flex-col gap-3 rounded-[20px] border border-stone-b bg-stone-card p-4">
        <div>
          <div className="t-label text-stone-tx2">
            Kalau lupa kebiasaan (mutahayyirah)
          </div>
          <p className="mt-1.5 mb-0 text-[12.5px]/[1.65] text-stone-tx2">
            Kasus paling rumit: sudah pernah haid dan suci, tapi lupa
            kebiasaannya dan tidak bisa membedakan ciri darah. Karena tidak
            bisa dipastikan haid atau istihadhah, sikapnya adalah{" "}
            <strong>ihtiyath</strong> (hati-hati) — mengikuti aturan yang
            lebih ketat dari keduanya sekaligus.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-[11px] font-semibold tracking-[.06em] text-stone-tx uppercase">
            Dilarang, seperti wanita haid
          </p>
          {MUTAHAYYIRAH_LIKE_HAID.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <IconBubble tone="rose" size={22} className="bg-bg">
                <CloseIcon size={11} />
              </IconBubble>
              <span className="text-[12.5px]/[1.4] text-stone-tx2">
                {item}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-[11px] font-semibold tracking-[.06em] text-stone-tx uppercase">
            Tetap wajib, seperti wanita suci
          </p>
          {MUTAHAYYIRAH_LIKE_SUCI.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <IconBubble tone="sage" size={22} className="bg-bg">
                <CheckIcon size={11} strokeWidth={2.4} />
              </IconBubble>
              <span className="text-[12.5px]/[1.4] text-stone-tx2">
                {item}
              </span>
            </div>
          ))}
        </div>

        <p className="m-0 text-[12px]/[1.55] text-stone-tx2">
          Kasus ini paling baik dibawa langsung ke ulama yang kamu percaya.
          Bawa catatan tanggalmu supaya lebih mudah dibantu.
        </p>

        <CitationCard
          work="Al-Ibanah wal Ifadhah fi Ahkamil Haidh wan Nifas wal Istihadhah, Sayyid Abdurrahman as-Saqaf"
          locus="hlm. 77"
        />
      </section>
    </Screen>
  );
}
