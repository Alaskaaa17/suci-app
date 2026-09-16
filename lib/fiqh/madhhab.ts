/**
 * ============================================================================
 *  THE RULE TABLE — the only place in this codebase where fiqh is asserted.
 * ============================================================================
 *
 *  Everything the app concludes about someone's state is derived from the
 *  numbers and flags below. Nothing else in the codebase hardcodes a limit.
 *  That is deliberate: this file is meant to be reviewed, line by line, by
 *  someone qualified to do so, without them having to read any of the UI.
 *
 *  Provenance. These values were transcribed from the design brief
 *  (project/Suci.dc.html, screens 02, 15, 17a, 18, 19) together with the
 *  standard summaries each school is usually given in introductory thaharah
 *  texts. They have NOT been verified against the cited works directly.
 *  Citations name the work each school's position is conventionally traced to,
 *  so a reviewer knows where to look — they are pointers for checking, not
 *  evidence that checking has happened.
 *
 *  Scope. This models the ordinary, uncomplicated case: a person with a
 *  recognisable habit, bleeding that starts and stops. It does NOT model
 *  tamyiz (distinguishing strong from weak blood), the mubtada'ah /
 *  mu'tadah / mutahayyirah classifications in their full detail, the
 *  Hanafi rules for blood spanning a habit boundary, or anything to do with
 *  'iddah. Where the app cannot reach a confident answer it must say so and
 *  send the user to a person — see `Classification.NEEDS_REVIEW`.
 *
 *  If you are reviewing this file and a number is wrong, changing it here
 *  changes every screen, calculation and citation in the app.
 */

export type MadhhabId = "syafii" | "hanafi" | "maliki" | "hanbali";

export interface Citation {
  /** Work the position is conventionally traced to. */
  work: string;
  /** Chapter / volume / page, as specific as the brief provided. */
  locus: string;
  /** What the reader should expect to find there. */
  note?: string;
}

export interface MadhhabRules {
  id: MadhhabId;
  /** Display name, as written in the design. */
  name: string;
  /** Short line shown under the name in the picker. */
  blurb: string;
  /** Badge shown in the onboarding picker, if any. */
  badge?: string;

  /**
   * Minimum duration, in whole days, for bleeding to be counted as haid.
   * Bleeding shorter than this is istihadhah. Maliki uses 0: a single drop
   * counts, so nothing is ever excluded for being too brief.
   */
  haidMinDays: number;

  /**
   * Maximum duration, in whole days, that haid can run. Days beyond this in a
   * single unbroken episode are istihadhah.
   */
  haidMaxDays: number;

  /**
   * Minimum tuhr — the clean interval that must separate two haid episodes.
   * Bleeding that resumes sooner than this is not a new period; depending on
   * `bridgeShortTuhr` it is either folded into the previous episode or treated
   * as istihadhah.
   */
  minTuhrDays: number;

  /**
   * When bleeding resumes inside the minimum tuhr: true means the intervening
   * clean days are absorbed into one continuous haid episode (the Syafi'i
   * "laqth/sahb" style treatment, capped by haidMaxDays); false means the new
   * bleeding is istihadhah and the episode is not extended.
   */
  bridgeShortTuhr: boolean;

  /** Maximum nifas (post-partum) duration in days. */
  nifasMaxDays: number;

  /**
   * Whether a pregnant person can have haid at all. Syafi'i and Maliki say
   * yes — blood during pregnancy stops prayer. Hanafi and Hanbali say no —
   * it is istihadhah and worship continues. (Design screen 19.)
   */
  haidDuringPregnancy: boolean;

  /**
   * Whether yellow/murky discharge (sufrah wa kudrah) within the habitual
   * period still counts as haid. (Design screen 14, FAQ 4.)
   */
  yellowDischargeIsHaid: boolean;

  /** Reference for the haid limits. */
  haidCitation: Citation;
  /** Reference for the nifas limit. */
  nifasCitation: Citation;

  /** Longer prose shown on the ikhtilaf comparison screen. */
  haidDetail: string;
  /** Position on breastfeeding + fasting, shown on screen 17b. */
  nursingRule: string;
}

export const MADHHABS: Record<MadhhabId, MadhhabRules> = {
  syafii: {
    id: "syafii",
    name: "Syafi'i",
    blurb:
      "Haid minimal 1 hari, maksimal 15 hari. Suci antara dua haid minimal 15 hari.",
    badge: "Umum di Indonesia",
    haidMinDays: 1,
    haidMaxDays: 15,
    minTuhrDays: 15,
    bridgeShortTuhr: true,
    nifasMaxDays: 60,
    haidDuringPregnancy: true,
    yellowDischargeIsHaid: true,
    haidCitation: {
      work: "Al-Majmu' Syarh al-Muhadzdzab",
      locus: "jld. 2, hlm. 381",
      note: "Bab Haid — batas minimal sehari semalam, maksimal 15 hari.",
    },
    nifasCitation: {
      work: "Bidayatul Mujtahid",
      locus: "Bab Haid dan Nifas",
    },
    haidDetail:
      "Minimal sehari semalam, maksimal 15 hari. Lebih dari itu dipisah dengan kaidah istihadhah.",
    nursingRule:
      "Khawatir pada bayi saja → qadha ditambah fidyah. Khawatir pada diri sendiri → cukup qadha.",
  },

  hanafi: {
    id: "hanafi",
    name: "Hanafi",
    blurb:
      "Haid minimal 3 hari, maksimal 10 hari. Darah kurang dari itu dihitung istihadhah.",
    haidMinDays: 3,
    haidMaxDays: 10,
    minTuhrDays: 15,
    // Hanafi treats a short tuhr inside the maximum as part of one haid
    // period rather than starting a fresh one.
    bridgeShortTuhr: true,
    nifasMaxDays: 40,
    haidDuringPregnancy: false,
    yellowDischargeIsHaid: false,
    haidCitation: {
      work: "Al-Mabsuth, as-Sarakhsi",
      locus: "jld. 3",
      note: "Kurang dari 3 hari atau lebih dari 10 hari bukan haid.",
    },
    nifasCitation: {
      work: "Bidayatul Mujtahid",
      locus: "Bab Haid dan Nifas",
    },
    haidDetail:
      "Kurang dari 3 hari atau lebih dari 10 hari bukan haid, melainkan istihadhah.",
    nursingRule: "Cukup qadha, tanpa fidyah.",
  },

  maliki: {
    id: "maliki",
    name: "Maliki",
    blurb:
      "Tidak ada batas minimal. Maksimal 15 hari bagi yang sudah punya kebiasaan tetap.",
    haidMinDays: 0,
    haidMaxDays: 15,
    minTuhrDays: 15,
    bridgeShortTuhr: false,
    nifasMaxDays: 60,
    haidDuringPregnancy: true,
    yellowDischargeIsHaid: true,
    haidCitation: {
      work: "Al-Mudawwanah al-Kubra",
      locus: "jld. 1",
      note: "Tidak ada batas minimal — setetes pun sudah dihitung.",
    },
    nifasCitation: {
      work: "Bidayatul Mujtahid",
      locus: "Bab Haid dan Nifas",
    },
    haidDetail:
      "Tidak ada batas minimal — setetes pun sudah dihitung. Maksimal mengikuti kebiasaan, hingga 15 hari.",
    nursingRule: "Khawatir pada bayi → qadha ditambah fidyah.",
  },

  hanbali: {
    id: "hanbali",
    name: "Hanbali",
    blurb:
      "Haid minimal 1 hari, maksimal 15 hari, dengan rincian tersendiri untuk darah kuning.",
    haidMinDays: 1,
    haidMaxDays: 15,
    minTuhrDays: 13,
    bridgeShortTuhr: true,
    nifasMaxDays: 40,
    haidDuringPregnancy: false,
    yellowDischargeIsHaid: true,
    haidCitation: {
      work: "Al-Mughni, Ibnu Qudamah",
      locus: "jld. 1",
      note: "Sama seperti Syafi'i dalam batas, berbeda dalam perlakuan darah kuning dan keruh.",
    },
    nifasCitation: {
      work: "Bidayatul Mujtahid",
      locus: "Bab Haid dan Nifas",
    },
    haidDetail:
      "Sama seperti Syafi'i dalam batas, berbeda dalam perlakuan darah kuning dan keruh.",
    nursingRule: "Qadha; fidyah bila hanya mengkhawatirkan bayi.",
  },
};

export const MADHHAB_ORDER: MadhhabId[] = [
  "syafii",
  "hanafi",
  "maliki",
  "hanbali",
];

export const DEFAULT_MADHHAB: MadhhabId = "syafii";

export function getMadhhab(id: MadhhabId): MadhhabRules {
  return MADHHABS[id];
}

/** "1–15" / "3–10" / "0–15", as rendered on the ikhtilaf screen. */
export function haidRangeLabel(rules: MadhhabRules): string {
  return `${rules.haidMinDays}–${rules.haidMaxDays}`;
}

/**
 * Points every school agrees on. Shown wherever the app needs to reassure
 * rather than choose — these are the claims that hold no matter what is set
 * in Pengaturan.
 */
export const CONSENSUS = {
  prayerNotMadeUp: {
    claim:
      "Shalat yang ditinggalkan karena haid tidak diqadha — empat mazhab sepakat. Yang diqadha hanyalah shalat yang terlewat di masa suci.",
    citation: {
      work: "Sahih Muslim",
      locus: "no. 335",
      note: "Riwayat Aisyah: perempuan haid diperintahkan mengqadha puasa, tidak mengqadha shalat.",
    } satisfies Citation,
  },
  fastIsMadeUp: {
    claim: "Puasa Ramadan yang ditinggalkan karena haid wajib diqadha.",
    citation: {
      work: "Sahih Muslim",
      locus: "no. 335",
    } satisfies Citation,
  },
  dhikrNeedsNoPurity: {
    claim:
      "Dzikir, doa, dan istighfar tidak disyaratkan suci dari hadas besar.",
    citation: {
      work: "Al-Mughni, Ibnu Qudamah",
      locus: "Bab Haid",
    } satisfies Citation,
  },
  listeningToQuranAllowed: {
    claim:
      "Empat mazhab sepakat mendengarkan Al-Qur'an hukumnya boleh saat haid.",
    citation: {
      work: "Bidayatul Mujtahid",
      locus: "Bab Haid",
    } satisfies Citation,
  },
} as const;
