import type { IsoDate } from "@/lib/date";
import type { Citation, MadhhabId } from "./madhhab";

/** How heavy the bleeding was. Recorded but not currently load-bearing:
 *  distinguishing strong from weak blood (tamyiz) is not modelled. */
export type Flow = "ringan" | "sedang" | "banyak";

/** Colour matters for the sufrah/kudrah rule, which schools differ on. */
export type BloodColor = "merah" | "kuning" | "keruh";

export interface DayEntry {
  date: IsoDate;
  bleeding: boolean;
  flow?: Flow;
  color?: BloodColor;
  symptoms: string[];
  mood: string[];
  note?: string;
  /** Set on the day the user marks ghusl complete. */
  ghusl?: boolean;
}

/** Life-phase override set in Pengaturan. */
export type SpecialState = "normal" | "hamil" | "nifas" | "menopause";

export interface Profile {
  name: string;
  madhhab: MadhhabId;
  specialState: SpecialState;
  /** First day of the last menstrual period, used for gestational age. */
  pregnancyLmp?: IsoDate;
  /** Date of delivery, which starts the nifas window. */
  nifasStart?: IsoDate;
  /** Coordinates, UTC offset and method for prayer times. */
  location: { label: string; lat: number; lng: number; tz: number };
  prayerMethod: PrayerMethodId;
  /** Husband-mode sharing; absent means it is off. */
  share?: ShareSession;
  /**
   * A pre-encryption share token left over from an older build, kept only long
   * enough to delete its row on the server. See `migrate` in `vault.ts`.
   */
  legacyShare?: { token: string; secret: string };
  onboardedAt?: string;
}

/**
 * One share session, held in the sender's encrypted vault.
 *
 * Note what is NOT derived from what. `key` is generated fresh from the CSPRNG
 * and has no relationship to the PIN, to the vault key, or to `id`. Handing a
 * reader something derived from her master key would make the link a foothold
 * into everything else she owns; it is not one.
 */
export interface ShareSession {
  /** The server's name for this session. Travels in the URL path. */
  id: string;
  /** AES-256-GCM, base64url. Travels in the URL fragment, never to a server. */
  key: string;
  /** Travels nowhere. Proves a write or a deletion comes from this device. */
  secret: string;
  /** What was last sent, so unchanged statuses do not spend a write. */
  lastState?: "haid" | "suci";
  lastPublishedAt?: string;
}

export type PrayerMethodId = "kemenag" | "mwl" | "isna" | "egypt" | "makkah";

/**
 * What a given day is ruled to be.
 *
 * NEEDS_REVIEW is not a fiqh category — it is the app admitting it does not
 * know, either because nothing was logged or because the case is past what
 * this engine models. It must never be silently rendered as suci.
 */
export enum Classification {
  HAID = "haid",
  SUCI = "suci",
  ISTIHADHAH = "istihadhah",
  NIFAS = "nifas",
  NEEDS_REVIEW = "perlu-konfirmasi",
  /** A future day the app expects to be haid. Never a ruling. */
  PREDICTED_HAID = "perkiraan-haid",
}

export interface DayRuling {
  date: IsoDate;
  classification: Classification;
  /** 1-based day within the current haid/nifas episode, when in one. */
  dayOfEpisode?: number;
  /** Clean day folded into a haid episode under the short-tuhr rule. */
  bridged?: boolean;
  episodeId?: string;
}

export interface Episode {
  id: string;
  start: IsoDate;
  end: IsoDate;
  kind: Classification.HAID | Classification.ISTIHADHAH | Classification.NIFAS;
  /** Days in the episode, inclusive. */
  length: number;
  /** Set when the episode ran past the school's maximum and was split. */
  truncatedAt?: IsoDate;
}

/** One step of the "Dasar hukum status ini" trail. */
export interface ReasoningStep {
  text: string;
  emphasis?: string;
}

export interface Verdict {
  date: IsoDate;
  classification: Classification;
  madhhab: MadhhabId;
  /** One-line summary, e.g. "Hari ke-4 haid". */
  headline: string;
  /** Reassuring second-person copy shown on the home card. */
  body: string;
  steps: ReasoningStep[];
  citation: Citation;
  /** Prayer is dropped entirely, not deferred. */
  prayerObligatory: boolean;
  /** Missed prayers from this day must be made up later. */
  prayerRequiresQadha: boolean;
  fastObligatory: boolean;
  fastRequiresQadha: boolean;
  /**
   * Set when the engine is outside what it models and the user should ask a
   * person. Rendered as a visible advisory, never swallowed.
   */
  advisory?: string;
}

export interface CycleAnalysis {
  rulings: Map<IsoDate, DayRuling>;
  episodes: Episode[];
  /** Haid episode covering today, if any. */
  current?: Episode;
  /** Mean gap between haid starts, rounded. Undefined below two cycles. */
  averageCycleLength?: number;
  /** Mean haid length, rounded. Undefined with no completed episode. */
  averageHaidLength?: number;
  /** First day of the next expected haid. */
  nextPredictedStart?: IsoDate;
  /** Days predicted to be haid, for the calendar's dashed cells. */
  predicted: Set<IsoDate>;
}
