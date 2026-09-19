import Link from "next/link";
import { Screen } from "@/components/shell";
import { ChevronLeftIcon, ClockIcon, LinkIcon, TrashIcon } from "@/components/icons";
import { IconBubble } from "@/components/ui";

/**
 * Public by design — see PUBLIC_PREFIXES in components/gate.tsx. This is the
 * URL Play Console's Data Safety form asks for under "cara pengguna meminta
 * penghapusan data": it has to name the app, spell out the exact steps, and
 * state what's deleted and any retention period, for someone who has not
 * installed Suci and may never do so.
 */

export default function HapusDataPage() {
  return (
    <Screen tabBar={false} className="gap-[13px] pt-3">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-[13px]/[1] font-semibold text-tx2 transition hover:text-tx"
      >
        <ChevronLeftIcon size={16} />
        Kembali ke Suci
      </Link>

      <div>
        <h1 className="t-headline m-0 text-tx">Menghapus Data di Suci</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          Karena catatanmu tersimpan di ponselmu sendiri, penghapusannya juga
          langsung dari ponselmu. Tidak perlu menghubungi siapa pun atau
          menunggu.
        </p>
      </div>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-peach-b bg-peach p-4">
        <div className="flex items-center gap-2.5">
          <IconBubble tone="peach" className="bg-bg text-peach-tx">
            <TrashIcon size={17} />
          </IconBubble>
          <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
            Catatan siklus, gejala, dan ibadah
          </h2>
        </div>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          Data ini tidak pernah meninggalkan ponselmu, jadi menghapusnya di
          ponsel berarti benar-benar hilang, seketika, tidak ada salinan di
          tempat lain untuk kami hapus.
        </p>
        <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-[18px] text-[13px]/[1.6] text-tx2">
          <li>Buka Suci, masuk dengan PIN-mu.</li>
          <li>
            Ketuk <strong className="text-tx">Pengaturan → Data Saya</strong>.
          </li>
          <li>
            Di bagian <strong className="text-tx">Hapus semua data</strong>,
            ketik <strong className="text-tx">HAPUS</strong>, lalu ketuk
            tombol yang sama.
          </li>
        </ol>
        <p className="m-0 text-[12px]/[1.5] text-tx2">
          Periode retensi: tidak ada, terhapus saat itu juga, tidak
          tersimpan di mana pun setelahnya.
        </p>
      </section>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-rose-b bg-rose p-4">
        <div className="flex items-center gap-2.5">
          <IconBubble tone="rose" className="bg-bg text-icon">
            <LinkIcon size={17} />
          </IconBubble>
          <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
            Status Mode Suami di server
          </h2>
        </div>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          Satu-satunya hal yang pernah tersimpan di server kami: status
          terenkripsi (haid/suci) dari fitur Mode Suami, kalau kamu
          mengaktifkannya.
        </p>
        <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-[18px] text-[13px]/[1.6] text-tx2">
          <li>Buka Suci, masuk dengan PIN-mu.</li>
          <li>
            Ketuk <strong className="text-tx">Pengaturan → Mode Suami</strong>.
          </li>
          <li>
            Ketuk <strong className="text-tx">Matikan Mode Suami</strong>.
          </li>
        </ol>
        <p className="m-0 text-[12px]/[1.5] text-tx2">
          Baris itu terhapus dari server saat itu juga. Kalau tidak pernah
          dimatikan manual, statusnya tetap otomatis kedaluwarsa dan terhapus
          setelah 14 hari tanpa pembaruan.
        </p>
      </section>

      <section className="mb-5 flex flex-col gap-2.5 rounded-[20px] border border-stone-b bg-stone-card p-4">
        <div className="flex items-center gap-2.5">
          <IconBubble tone="stone" className="bg-bg text-stone-tx">
            <ClockIcon size={17} />
          </IconBubble>
          <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-stone-tx">
            Tidak bisa masuk lagi (lupa PIN, atau ganti ponsel)
          </h2>
        </div>
        <p className="m-0 text-[12.5px]/[1.65] text-stone-tx2">
          Suci tidak tahu PIN siapa pun dan tidak punya akun untuk
          memverifikasi identitasmu, jadi kami tidak bisa menghapuskannya
          untukmu dari jarak jauh. Meng-uninstall Suci dari ponsel itu
          menghapus seluruh catatan yang tersimpan di sana. Untuk baris
          status Mode Suami yang masih aktif di server, baris itu akan
          kedaluwarsa dan terhapus otomatis dalam 14 hari tanpa pembaruan,
          bahkan tanpa kamu membuka aplikasinya lagi.
        </p>
      </section>
    </Screen>
  );
}
