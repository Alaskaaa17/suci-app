import type { Citation } from "@/lib/fiqh/madhhab";

/**
 * Tanya jawab. Every answer carries where it comes from, and questions the
 * app is not equipped to settle say so and point to a person instead.
 */

export interface FaqItem {
  question: string;
  answer: string;
  citation?: Citation;
  /** True when all four schools agree, which the UI surfaces as reassurance. */
  agreed?: boolean;
  /** Where to read the full disagreement. */
  seeAlso?: { label: string; href: string };
}

export const FAQ: FaqItem[] = [
  {
    question: "Apakah aku harus mengqadha shalat yang terlewat saat haid?",
    answer:
      "Tidak. Shalat yang ditinggalkan karena haid tidak perlu diqadha. Yang diqadha hanya puasa Ramadan.",
    citation: { work: "Sahih Muslim", locus: "no. 335" },
    agreed: true,
  },
  {
    question: "Bolehkah membaca Al-Qur'an dari ponsel saat haid?",
    answer:
      "Mayoritas ulama kontemporer membolehkan karena layar bukan mushaf. Rincian tiap mazhab ada di halaman ikhtilaf.",
    seeAlso: { label: "Lihat ikhtilaf 4 mazhab", href: "/edukasi/ikhtilaf" },
  },
  {
    question: "Darahku keluar 17 hari, apa itu masih haid?",
    answer:
      "Lewat batas maksimal mazhabmu, sisanya dihukumi istihadhah. Untuk memisahkan hari haid dari istihadhah pada kasus panjang seperti ini, ulama memakai tamyiz dan kebiasaanmu, sebaiknya ditanyakan langsung.",
    citation: {
      work: "Al-Majmu' Syarh al-Muhadzdzab",
      locus: "jld. 2",
    },
  },
  {
    question:
      "Keluar cairan kuning setelah darah berhenti, apakah aku sudah suci?",
    answer:
      "Selama masih dalam masa kebiasaan haid, cairan kuning masih dihitung haid menurut Syafi'i dan Hanbali. Hanafi menghitungnya sebagai suci. Catat warnanya di layar Catat supaya kesimpulannya mengikuti mazhab yang kamu pilih.",
    citation: { work: "Al-Mughni, Ibnu Qudamah", locus: "jld. 1" },
  },
  {
    question: "Bolehkah minum obat penunda haid saat Ramadan?",
    answer:
      "Boleh bila aman menurut dokter, tetapi tidak dianjurkan. Qadha puasa adalah keringanan yang memang disediakan.",
  },
  {
    question: "Kapan tepatnya aku wajib mandi wajib?",
    answer:
      "Begitu darah benar-benar berhenti. Tidak perlu menunggu genap sekian hari, dan tidak perlu menunggu waktu shalat tertentu.",
    citation: { work: "Fathul Qarib", locus: "Bab Ghusl" },
  },
  {
    question: "Aku haid di siang Ramadan setelah berpuasa setengah hari. Bagaimana?",
    answer:
      "Puasa hari itu batal dan diqadha nanti. Kamu tidak berdosa, ini rukhsah, bukan pelanggaran.",
    agreed: true,
  },
  {
    question: "Bolehkah berpuasa sunnah saat qadha Ramadan belum lunas?",
    answer:
      "Sebagian ulama membolehkan selama masih ada waktu sebelum Ramadan berikutnya, sebagian menganjurkan mendahulukan qadha. Keduanya punya dasar.",
  },
  {
    question: "Bolehkah berdzikir dan berdoa saat haid?",
    answer:
      "Boleh, tanpa syarat apa pun. Dzikir, doa, istighfar, dan shalawat tidak memerlukan suci dari hadas besar.",
    citation: { work: "Al-Mughni, Ibnu Qudamah", locus: "Bab Haid" },
    agreed: true,
  },
  {
    question: "Bolehkah masuk masjid saat haid?",
    answer:
      "Mayoritas melarang berdiam di dalamnya, sebagian membolehkan sekadar lewat bila aman dari tetesan darah. Praktik masjid di sekitarmu biasanya sudah mengikuti salah satu pendapat ini.",
  },
  {
    question: "Siklusku tidak pernah sama panjangnya. Apakah itu masalah?",
    answer:
      "Secara fiqih tidak. Hukum mengikuti darah yang benar-benar keluar, bukan jadwal. Perkiraan di aplikasi hanya alat bantu dan tidak pernah menjadi dasar hukum.",
  },
  {
    question: "Aku lupa mencatat beberapa hari. Apakah perhitungannya rusak?",
    answer:
      "Hari yang kosong ditandai “perlu konfirmasi”, bukan diam-diam dianggap suci. Isi hari itu di Kalender dan perhitungannya langsung menyesuaikan.",
  },
  {
    question: "Apakah perempuan hamil bisa haid?",
    answer:
      "Syafi'i dan Maliki mengatakan bisa, sehingga darahnya menghentikan shalat. Hanafi dan Hanbali mengatakan tidak, darah itu istihadhah dan ibadah tetap berjalan.",
    citation: { work: "Bidayatul Mujtahid", locus: "Bab Haid" },
    seeAlso: { label: "Lihat halaman Kehamilan", href: "/pengaturan/kehamilan" },
  },
  {
    question: "Nifasku berhenti di hari ke-25. Apakah aku menunggu sampai 40?",
    answer:
      "Tidak. Kalau darah sudah berhenti, mandi wajib dan langsung kembali shalat. Batas 40 atau 60 hari adalah batas atas, bukan jumlah yang harus digenapkan.",
    citation: { work: "Bidayatul Mujtahid", locus: "Bab Nifas" },
  },
  {
    question: "Kasusku tidak ada di sini. Aku harus bagaimana?",
    answer:
      "Tanyakan langsung pada ulama yang kamu percaya, dan bawa catatan tanggalmu. Aplikasi ini sengaja berhenti pada kasus yang butuh penilaian manusia.",
  },
];

export function faqCount(): number {
  return FAQ.length;
}
