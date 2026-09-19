/**
 * The glossary. Plain-language definitions of the fiqh vocabulary the app
 * uses, so nobody has to already know the terms to read their own status.
 *
 * Counts shown in the UI are derived from this array's length — never
 * hardcoded — so the interface cannot promise more entries than exist.
 */

export type GlossaryCategory = "darah" | "bersuci" | "ibadah" | "waktu";

export interface GlossaryTerm {
  term: string;
  arabic?: string;
  category: GlossaryCategory;
  definition: string;
}

export const GLOSSARY_CATEGORIES: Array<{
  id: GlossaryCategory | "semua";
  label: string;
}> = [
  { id: "semua", label: "Semua" },
  { id: "darah", label: "Darah" },
  { id: "bersuci", label: "Bersuci" },
  { id: "ibadah", label: "Ibadah" },
  { id: "waktu", label: "Waktu" },
];

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: "Haid",
    arabic: "حَيْض",
    category: "darah",
    definition:
      "Darah yang keluar dari rahim perempuan sehat secara alami pada waktu tertentu, bukan karena penyakit atau melahirkan.",
  },
  {
    term: "Hadas besar",
    category: "bersuci",
    definition:
      "Keadaan yang mewajibkan mandi wajib sebelum shalat, misalnya setelah haid berhenti.",
  },
  {
    term: "Hadas kecil",
    category: "bersuci",
    definition:
      "Keadaan yang cukup dihilangkan dengan wudhu, misalnya setelah buang air.",
  },
  {
    term: "Istihadhah",
    arabic: "اِسْتِحَاضَة",
    category: "darah",
    definition:
      "Darah yang keluar di luar masa haid dan nifas. Ibadah tetap berjalan dengan cara khusus.",
  },
  {
    term: "Iddah",
    arabic: "عِدَّة",
    category: "waktu",
    definition:
      "Masa tunggu perempuan setelah perceraian atau wafatnya suami, sebagian dihitung dari siklus haid.",
  },
  {
    term: "Istinja",
    arabic: "اِسْتِنْجَاء",
    category: "bersuci",
    definition:
      "Membersihkan tempat keluarnya kotoran dengan air atau benda suci lain.",
  },
  {
    term: "Ikhtilaf",
    arabic: "اِخْتِلَاف",
    category: "ibadah",
    definition:
      "Perbedaan pendapat antar ulama atau antar mazhab. Perbedaan yang punya dasar adalah hal yang sah, bukan pertengkaran.",
  },
  {
    term: "Nifas",
    arabic: "نِفَاس",
    category: "darah",
    definition:
      "Darah yang keluar setelah melahirkan. Batas maksimalnya berbeda antar mazhab.",
  },
  {
    term: "Niat",
    arabic: "نِيَّة",
    category: "ibadah",
    definition:
      "Maksud di dalam hati untuk melakukan ibadah. Letaknya di hati; melafalkan hanya membantu memantapkan.",
  },
  {
    term: "Tuhr",
    arabic: "طُهْر",
    category: "waktu",
    definition:
      "Masa suci di antara dua haid. Setiap mazhab punya batas minimal berapa lama masa ini harus berlangsung.",
  },
  {
    term: "Thaharah",
    arabic: "طَهَارَة",
    category: "bersuci",
    definition:
      "Bersuci, keseluruhan bab fiqih tentang menghilangkan hadas dan najis. Inilah bab yang menaungi seluruh isi aplikasi ini.",
  },
  {
    term: "Ghusl",
    arabic: "غُسْل",
    category: "bersuci",
    definition:
      "Mandi wajib: meratakan air ke seluruh tubuh dengan niat menghilangkan hadas besar.",
  },
  {
    term: "Wudhu",
    arabic: "وُضُوء",
    category: "bersuci",
    definition:
      "Bersuci dari hadas kecil dengan membasuh wajah, tangan, kepala, dan kaki.",
  },
  {
    term: "Tayamum",
    arabic: "تَيَمُّم",
    category: "bersuci",
    definition:
      "Pengganti wudhu atau mandi dengan debu yang suci, ketika air tidak ada atau membahayakan kesehatan.",
  },
  {
    term: "Qadha",
    arabic: "قَضَاء",
    category: "ibadah",
    definition:
      "Mengerjakan ibadah di luar waktunya sebagai ganti yang tertinggal. Puasa Ramadan diqadha; shalat yang ditinggalkan karena haid tidak.",
  },
  {
    term: "Fidyah",
    arabic: "فِدْيَة",
    category: "ibadah",
    definition:
      "Memberi makan satu orang miskin untuk setiap hari puasa yang ditinggalkan, dalam kondisi tertentu.",
  },
  {
    term: "Mazhab",
    arabic: "مَذْهَب",
    category: "ibadah",
    definition:
      "Aliran pemikiran fiqih dengan metode istinbath tersendiri. Empat yang masyhur: Hanafi, Maliki, Syafi'i, Hanbali.",
  },
  {
    term: "Baligh",
    arabic: "بَالِغ",
    category: "waktu",
    definition:
      "Usia ketika kewajiban syariat mulai berlaku penuh. Bagi perempuan ditandai haid pertama, atau usia 15 tahun hijriah bila belum haid.",
  },
  {
    term: "Mubtada'ah",
    arabic: "مُبْتَدَأَة",
    category: "darah",
    definition:
      "Perempuan yang baru pertama kali mengalami haid, sehingga belum punya kebiasaan yang bisa dijadikan rujukan.",
  },
  {
    term: "Mu'tadah",
    arabic: "مُعْتَادَة",
    category: "darah",
    definition:
      "Perempuan yang sudah punya kebiasaan haid yang dikenali, baik lamanya maupun waktunya.",
  },
  {
    term: "Mutahayyirah",
    arabic: "مُتَحَيِّرَة",
    category: "darah",
    definition:
      "Perempuan yang lupa kebiasaan haidnya sehingga bingung memisahkan haid dari istihadhah. Kasus ini perlu dibantu ulama secara langsung.",
  },
  {
    term: "Tamyiz",
    arabic: "تَمْيِيز",
    category: "darah",
    definition:
      "Membedakan darah kuat (pekat, berbau) dari darah lemah, untuk memisahkan hari haid dari istihadhah pada pendarahan yang panjang.",
  },
  {
    term: "Sufrah",
    arabic: "صُفْرَة",
    category: "darah",
    definition:
      "Cairan kekuningan. Dihitung haid bila muncul sebelum masa suci, tidak dihitung haid bila muncul setelah masa suci.",
  },
  {
    term: "Kudrah",
    arabic: "كُدْرَة",
    category: "darah",
    definition:
      "Cairan keruh kecoklatan. Aturannya sama seperti sufrah: sebelum suci dihitung haid, sesudah suci tidak.",
  },
  {
    term: "Junub",
    arabic: "جُنُب",
    category: "bersuci",
    definition:
      "Keadaan berhadas besar yang mewajibkan mandi sebelum shalat atau menyentuh mushaf.",
  },
  {
    term: "Mushaf",
    arabic: "مُصْحَف",
    category: "ibadah",
    definition:
      "Lembaran Al-Qur'an dalam bentuk fisik. Aturan menyentuhnya saat haid berbeda dari membaca lewat layar.",
  },
  {
    term: "Dzikir",
    arabic: "ذِكْر",
    category: "ibadah",
    definition:
      "Mengingat Allah dengan lisan atau hati. Tidak disyaratkan suci dari hadas besar.",
  },
  {
    term: "Rukhsah",
    arabic: "رُخْصَة",
    category: "ibadah",
    definition:
      "Keringanan yang diberikan syariat dalam kondisi tertentu. Libur shalat saat haid adalah rukhsah, bukan kekurangan.",
  },
  {
    term: "Rukun",
    arabic: "رُكْن",
    category: "ibadah",
    definition:
      "Bagian yang wajib ada dalam suatu ibadah; kalau tertinggal, ibadahnya tidak sah.",
  },
  {
    term: "Sunnah",
    arabic: "سُنَّة",
    category: "ibadah",
    definition:
      "Amalan yang dianjurkan, berpahala bila dikerjakan dan tidak berdosa bila ditinggalkan.",
  },
  {
    term: "Menopause",
    category: "waktu",
    definition:
      "Berhentinya haid secara permanen. Setelahnya perempuan dihukumi suci terus-menerus.",
  },
  {
    term: "Imsak",
    arabic: "إِمْسَاك",
    category: "waktu",
    definition:
      "Penanda beberapa menit sebelum Subuh sebagai kehati-hatian untuk berhenti makan dan minum. Bukan batas puasa itu sendiri.",
  },
];

export function glossaryCount(): number {
  return GLOSSARY.length;
}

/** Terms grouped under their first letter, in Indonesian alphabetical order. */
export function groupByLetter(
  terms: GlossaryTerm[],
): Array<[string, GlossaryTerm[]]> {
  const map = new Map<string, GlossaryTerm[]>();
  for (const t of [...terms].sort((a, b) =>
    a.term.localeCompare(b.term, "id"),
  )) {
    const letter = t.term[0].toUpperCase();
    const list = map.get(letter) ?? [];
    list.push(t);
    map.set(letter, list);
  }
  return [...map.entries()];
}
