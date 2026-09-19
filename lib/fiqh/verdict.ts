import { daysBetween, formatShort, inclusiveDays, type IsoDate } from "@/lib/date";
import { CONSENSUS, getMadhhab, type Citation } from "./madhhab";
import { rulingFor } from "./cycle";
import {
  Classification,
  type CycleAnalysis,
  type Profile,
  type ReasoningStep,
  type Verdict,
} from "./types";

/**
 * Builds the "Dasar hukum status ini" trail for one day.
 *
 * The design's first principle is that no conclusion appears without its
 * reasoning attached — so this returns the ruling and the argument for it as
 * one object, and there is no way to render the former without the latter.
 */
export function buildVerdict(
  analysis: CycleAnalysis,
  profile: Profile,
  date: IsoDate,
): Verdict {
  const rules = getMadhhab(profile.madhhab);
  const ruling = rulingFor(analysis, date);
  const episode = ruling.episodeId
    ? analysis.episodes.find((e) => e.id === ruling.episodeId)
    : undefined;

  const steps: ReasoningStep[] = [];
  let citation: Citation = rules.haidCitation;
  let headline = "";
  let body = "";
  let advisory: string | undefined;

  switch (ruling.classification) {
    case Classification.HAID: {
      const day = ruling.dayOfEpisode ?? 1;
      headline = `Hari ke-${day} haid`;
      body =
        "Kamu sedang libur shalat dan puasa. Allah tidak membebanimu, istirahatlah dengan tenang.";

      if (episode) {
        steps.push({
          text: `Darah keluar sejak ${formatShort(episode.start)}, berlanjut ${episode.length} hari.`,
        });
        steps.push({
          text: `Masih di bawah batas maksimal ${rules.haidMaxDays} hari menurut mazhab ${rules.name}.`,
        });

        const prevHaid = previousHaidBefore(analysis, episode.start);
        if (prevHaid) {
          const gap = daysBetween(prevHaid.end, episode.start) - 1;
          steps.push({
            text: `Jarak suci dari haid sebelumnya ${gap} hari, memenuhi batas minimal ${rules.minTuhrDays} hari.`,
          });
        }

        if (ruling.bridged) {
          steps.push({
            text: "Hari ini tidak ada darah, tetapi jedanya lebih pendek dari masa suci minimal, sehingga tetap dihitung bagian dari haid yang sama.",
          });
        }

        steps.push({
          text: "Maka darah ini dihukumi",
          emphasis: "haid",
        });

        if (episode.truncatedAt) {
          advisory = `Episode ini menyentuh batas maksimal ${rules.haidMaxDays} hari. Pemisahan hari haid dari istihadhah pada kasus seperti ini bergantung pada tamyiz dan kebiasaanmu, sebaiknya ditanyakan pada ulama yang kamu percaya.`;
        }
      }
      break;
    }

    case Classification.NIFAS: {
      const day = ruling.dayOfEpisode ?? 1;
      headline = `Hari ke-${day} nifas`;
      body =
        "Masa nifas itu masa pemulihan. Ibadahmu sedang diringankan, bukan ditunda.";
      citation = rules.nifasCitation;
      steps.push({
        text: `Sejak melahirkan pada ${profile.nifasStart ? formatShort(profile.nifasStart) : "tanggal yang kamu catat"}, kamu berada dalam masa nifas.`,
      });
      steps.push({
        text: `Batas maksimal nifas menurut mazhab ${rules.name} adalah ${rules.nifasMaxDays} hari.`,
      });
      steps.push({
        text: "Kalau darah berhenti sebelum batas itu, kamu mandi wajib dan langsung kembali shalat. Tidak perlu menunggu genap.",
      });
      break;
    }

    case Classification.ISTIHADHAH: {
      headline = "Istihadhah";
      body =
        "Darah ini tidak menggugurkan kewajiban. Shalat dan puasa tetap berjalan, dengan keringanan tata cara.";

      if (episode) {
        const span = episode.length;
        if (profile.specialState === "hamil" && !rules.haidDuringPregnancy) {
          steps.push({
            text: `Menurut mazhab ${rules.name}, perempuan hamil tidak mengalami haid. Darah yang keluar saat hamil dihukumi istihadhah.`,
          });
        } else if (profile.specialState === "menopause") {
          steps.push({
            text: "Setelah menopause kamu dihukumi suci terus-menerus, sehingga darah yang keluar dihukumi istihadhah.",
          });
        } else if (span < rules.haidMinDays) {
          steps.push({
            text: `Darah keluar ${span} hari, kurang dari batas minimal haid ${rules.haidMinDays} hari menurut mazhab ${rules.name}.`,
          });
        } else {
          steps.push({
            text: `Darah ini muncul sebelum masa suci minimal ${rules.minTuhrDays} hari terpenuhi, sehingga tidak dihitung sebagai haid baru.`,
          });
        }
        steps.push({
          text: "Maka darah ini dihukumi",
          emphasis: "istihadhah",
        });
        steps.push({
          text: "Berwudhu setiap kali masuk waktu shalat, lalu shalat seperti biasa.",
        });
      }
      break;
    }

    case Classification.NEEDS_REVIEW: {
      headline = "Perlu konfirmasi";
      body =
        "Tidak ada catatan untuk hari ini, jadi statusnya belum bisa disimpulkan.";
      steps.push({
        text: "Catatan hari ini kosong. Isi dulu apakah ada darah atau tidak, supaya kesimpulannya akurat.",
      });
      advisory =
        "Selama hari ini belum diisi, hari-hari sesudahnya bisa ikut bergeser.";
      break;
    }

    case Classification.PREDICTED_HAID: {
      headline = "Perkiraan haid";
      body =
        "Ini baru perkiraan dari rata-rata siklusmu, belum terjadi, dan belum menjadi hukum apa pun.";
      steps.push({
        text: `Perkiraan dihitung dari rata-rata siklus ${analysis.averageCycleLength ?? "-"} hari dan lama haid ${analysis.averageHaidLength ?? "-"} hari.`,
      });
      steps.push({
        text: "Status sebenarnya baru ditetapkan setelah kamu mencatat darahnya.",
      });
      break;
    }

    case Classification.SUCI:
    default: {
      headline = "Hari ini kamu suci";
      body =
        "Shalat dan puasa kembali menjadi milikmu. Semoga hari ini ringan, ya.";
      const lastHaid = previousHaidBefore(analysis, date);
      if (lastHaid) {
        steps.push({
          text: `Darah berhenti ${formatShort(lastHaid.end)} dan tidak ada darah sejak itu.`,
        });
        steps.push({
          text: "Sehingga kewajiban shalat dan puasa kembali.",
        });
      } else {
        steps.push({
          text: "Tidak ada darah yang tercatat, sehingga kamu dihukumi suci.",
        });
      }
      break;
    }
  }

  const exempt =
    ruling.classification === Classification.HAID ||
    ruling.classification === Classification.NIFAS;

  return {
    date,
    classification: ruling.classification,
    madhhab: profile.madhhab,
    headline,
    body,
    steps,
    citation,
    // Prayer during haid/nifas is dropped, not deferred — all four schools
    // agree, so this pair never varies by madhhab.
    prayerObligatory: !exempt,
    prayerRequiresQadha: false,
    fastObligatory: !exempt,
    fastRequiresQadha: exempt,
    advisory,
  };
}

function previousHaidBefore(analysis: CycleAnalysis, date: IsoDate) {
  return [...analysis.episodes]
    .filter((e) => e.kind === Classification.HAID && e.end < date)
    .sort((a, b) => (a.end < b.end ? 1 : -1))[0];
}

/** The two reassurance chips on the home card during haid. */
export function worshipChips(verdict: Verdict): string[] {
  if (verdict.classification === Classification.HAID ||
      verdict.classification === Classification.NIFAS) {
    return ["Puasa diqadha nanti", "Shalat tidak diqadha"];
  }
  if (verdict.classification === Classification.ISTIHADHAH) {
    return ["Shalat tetap wajib", "Wudhu tiap waktu shalat"];
  }
  return [];
}

export const PRAYER_CONSENSUS = CONSENSUS.prayerNotMadeUp;

/**
 * How many Ramadan fasts this year's haid/nifas days have put on the ledger.
 * Only days inside the given Ramadan window count — an exempt day in Syawwal
 * owes nothing.
 */
export function fastsOwedInWindow(
  analysis: CycleAnalysis,
  ramadanStart: IsoDate,
  ramadanEnd: IsoDate,
): number {
  let n = 0;
  for (const [date, ruling] of analysis.rulings) {
    if (date < ramadanStart || date > ramadanEnd) continue;
    if (
      ruling.classification === Classification.HAID ||
      ruling.classification === Classification.NIFAS
    ) {
      n++;
    }
  }
  return n;
}

export { inclusiveDays };
