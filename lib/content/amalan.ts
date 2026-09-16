import type { Citation } from "@/lib/fiqh/madhhab";

/**
 * Amalan pengganti — what remains open during haid.
 *
 * The framing matters as much as the list: the brief's line is "pintu kebaikan
 * tidak pernah tertutup saat haid", so nothing here is described as a
 * consolation prize.
 */

export interface Amalan {
  id: string;
  title: string;
  description: string;
  arabic?: string;
  transliteration?: string;
  citation?: Citation;
  note?: string;
}

export const AMALAN: Amalan[] = [
  {
    id: "dzikir-waktu",
    title: "Dzikir setelah waktu shalat",
    description:
      "Tasbih, tahmid, takbir 33× di waktu yang biasanya kamu shalat.",
    citation: {
      work: "Ibnu Qudamah, al-Mughni",
      locus: "Bab Haid",
      note: "Dzikir tidak disyaratkan suci dari hadas besar.",
    },
  },
  {
    id: "istighfar",
    title: "Istighfar 100×",
    description: "Boleh sambil berbaring, tanpa wudhu.",
    arabic: "أَسْتَغْفِرُ اللّٰهَ رَبِّي مِنْ كُلِّ ذَنْبٍ",
    transliteration: "Astaghfirullāha rabbī min kulli dzanbin.",
  },
  {
    id: "mendengar-quran",
    title: "Mendengarkan Al-Qur'an",
    description: "Menyimak murattal tidak memerlukan sentuhan mushaf.",
    note: "Empat mazhab sepakat mendengarkan hukumnya boleh. Soal menyentuh dan membaca, lihat halaman ikhtilaf.",
  },
  {
    id: "shalawat",
    title: "Shalawat",
    description: "Tidak ada syarat suci untuk bershalawat.",
    arabic: "اللّٰهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ",
    transliteration: "Allāhumma shalli ʻalā sayyidinā Muhammad.",
  },
  {
    id: "sedekah",
    title: "Sedekah kecil",
    description: "Seribu rupiah, sebotol air, atau membantu seseorang.",
  },
  {
    id: "doa",
    title: "Doa tanpa batas",
    description: "Tidak ada syarat suci untuk berdoa. Bicaralah sepuasmu.",
  },
];
