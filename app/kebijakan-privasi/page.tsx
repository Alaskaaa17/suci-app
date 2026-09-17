import Link from "next/link";
import { Screen } from "@/components/shell";
import {
  ChevronLeftIcon,
  CloudIcon,
  LockIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import { IconBubble } from "@/components/ui";

/**
 * Public by design — see PUBLIC_PREFIXES in components/gate.tsx. This has to
 * render for someone who has never opened Suci and never will: a Play Store
 * reviewer, or anyone who followed the link from the store listing without
 * installing anything. No useApp() here, no vault, nothing behind the PIN.
 */

const EFFECTIVE_DATE = "17 September 2026";

export default function KebijakanPrivasiPage() {
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
        <h1 className="t-headline m-0 text-tx">Kebijakan Privasi</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          Berlaku sejak {EFFECTIVE_DATE}. Ditulis dalam bahasa biasa, bukan
          bahasa hukum yang berputar-putar — karena isinya memang sesederhana
          itu.
        </p>
      </div>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-sage-b bg-sage p-4">
        <div className="flex items-center gap-2.5">
          <IconBubble tone="sage" className="bg-bg text-sage-tx">
            <ShieldCheckIcon size={17} />
          </IconBubble>
          <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-sage-tx">
            Ringkasnya
          </h2>
        </div>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          Suci tidak punya akun, tidak punya server database, dan tidak
          memasang pelacak apa pun. Catatan siklus, gejala, dan ibadahmu
          dihitung dan disimpan hanya di HP-mu sendiri, terkunci PIN. Kalau
          kamu tidak menyalakan Mode Suami, tidak ada satu byte pun data
          pribadimu yang pernah meninggalkan perangkatmu.
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-[20px] border border-hair p-4">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
          Data apa yang disimpan, dan di mana
        </h2>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          Tanggal, gejala, suasana hati, catatan bebas, status ibadah, dan
          profil mazhabmu tersimpan di{" "}
          <strong>penyimpanan lokal peramban HP-mu</strong> (localStorage),
          terenkripsi dengan PIN yang kamu buat sendiri (PBKDF2-SHA-256 lalu
          AES-256-GCM). Suci tidak mengirim data ini ke server mana pun untuk
          dihitung, disinkronkan, atau dicadangkan — semua perhitungan fiqih
          dan jadwal ibadah berjalan langsung di HP-mu, termasuk saat offline.
        </p>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          Karena PIN tidak pernah dikirim ke mana pun, kami sendiri tidak
          punya cara memulihkan PIN yang lupa atau membaca data siapa pun.
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-[20px] border border-rose-b bg-rose p-4">
        <div className="flex items-center gap-2.5">
          <IconBubble tone="rose" className="bg-bg text-icon">
            <LockIcon size={17} />
          </IconBubble>
          <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
            Mode Suami — satu-satunya fitur yang menyentuh server
          </h2>
        </div>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          Kalau kamu memilih menyalakan Mode Suami, satu hal saja yang
          dikirim: status hari ini (haid atau suci), sudah{" "}
          <strong>dienkripsi di HP-mu sebelum dikirim</strong>. Kuncinya ada
          di bagian tautan yang tidak pernah dikirim peramban ke server mana
          pun, jadi server kami hanya menyimpan tulisan acak yang tidak bisa
          dibacanya. Tidak ada tanggal, gejala, catatan, atau riwayat yang
          ikut terkirim.
        </p>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          Yang tetap terlihat oleh penyedia server walau isinya terkunci:
          waktu setiap kali status itu diperbarui. Kami tidak menyembunyikan
          ini — pola waktu pembaruan bisa menggambarkan siklus, dan Suci
          sengaja mengirim seminimal mungkin (hanya saat statusnya benar-benar
          berubah) untuk mengecilkan itu, bukan menghapusnya sepenuhnya.
        </p>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          Tautan berbagi berhenti berlaku otomatis setelah 14 hari tanpa
          pembaruan, dan bisa dimatikan kapan saja dari Pengaturan — begitu
          dimatikan, catatan itu langsung dihapus dari server.
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-[20px] border border-hair p-4">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
          Yang tidak kami lakukan
        </h2>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]/[1.6] text-tx2">
          <li>Tidak ada akun, pendaftaran, atau nomor telepon/e-mail wajib.</li>
          <li>
            Tidak ada analitik, SDK iklan, atau pelacak pihak ketiga di dalam
            aplikasi.
          </li>
          <li>Tidak ada penjualan atau pembagian data ke pihak ketiga.</li>
          <li>
            Tidak ada pengumpulan lokasi GPS — kota untuk jadwal shalat dipilih
            manual dari daftar, bukan dibaca dari sensor HP.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-stone-b bg-stone-card p-4">
        <div className="flex items-center gap-2.5">
          <IconBubble tone="stone" className="bg-bg text-stone-tx">
            <CloudIcon size={17} />
          </IconBubble>
          <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-stone-tx">
            Pihak yang membantu menjalankan Suci
          </h2>
        </div>
        <p className="m-0 text-[12.5px]/[1.65] text-stone-tx2">
          Aplikasi ini dijalankan di atas Vercel (hosting). Kalau Mode Suami
          dinyalakan, ciphertext status tersimpan sementara di Upstash Redis.
          Keduanya hanya memproses data sebagai penyedia infrastruktur —
          tidak satu pun dari mereka menerima data yang bisa dibaca, dan
          tidak ada pihak ketiga lain yang terlibat.
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-[20px] border border-hair p-4">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
          Hakmu atas data ini
        </h2>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          Karena datanya ada di HP-mu, kontrolnya juga di tanganmu langsung —
          tidak perlu meminta ke kami. Dari Pengaturan → Data Saya kamu bisa
          mengunduh seluruh catatanmu sebagai berkas, memulihkannya di
          perangkat lain, atau menghapus semuanya secara permanen, kapan saja.
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-[20px] border border-hair p-4">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
          Anak-anak
        </h2>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          Suci membahas haid, sehingga wajar dipakai oleh remaja yang baru
          mengalaminya. Karena tidak ada data yang pernah dikumpulkan di
          server dalam kondisi normal, tidak ada profil pengguna anak yang
          bisa terbentuk di pihak kami.
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-[20px] border border-hair p-4">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
          Perubahan kebijakan ini
        </h2>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          Kalau kebijakan ini berubah, tanggal di atas akan diperbarui.
          Perubahan berarti hanya berlaku untuk versi aplikasi setelah
          tanggal itu.
        </p>
      </section>

      <section className="mb-5 flex flex-col gap-2 rounded-[20px] border border-hair p-4">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
          Kontak
        </h2>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          Pertanyaan soal privasi bisa dikirim ke{" "}
          <a
            href="mailto:nafisarizka18@gmail.com"
            className="font-semibold text-tx underline underline-offset-2"
          >
            nafisarizka18@gmail.com
          </a>
          .
        </p>
      </section>
    </Screen>
  );
}
