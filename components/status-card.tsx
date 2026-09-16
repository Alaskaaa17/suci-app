"use client";

import { daysBetween } from "@/lib/date";
import { Classification, type CycleAnalysis, type Verdict } from "@/lib/fiqh/types";
import { worshipChips } from "@/lib/fiqh/verdict";
import { ClockIcon, WavesIcon } from "./icons";
import { StatusGlyph, STATUS_LABEL } from "./status-glyph";
import { cx, Pill } from "./ui";

/**
 * The hero card on Beranda. One component covers every state the design draws
 * separately (05a haid, 05b suci) plus the istihadhah, nifas and
 * needs-confirmation states the brief listed as not yet drawn — the surface,
 * glyph and illustration all key off the ruling.
 */
export function StatusCard({
  verdict,
  analysis,
  today,
  expectedLength,
}: {
  verdict: Verdict;
  analysis: CycleAnalysis;
  today: string;
  expectedLength?: number;
}) {
  const status = verdict.classification;
  const chips = worshipChips(verdict);

  const surface =
    status === Classification.HAID
      ? "bg-rose border-rose-b"
      : status === Classification.ISTIHADHAH
        ? "bg-peach border-peach-b"
        : status === Classification.NEEDS_REVIEW
          ? "bg-bg border-hair"
          : "bg-sage border-sage-b";

  const pillTone =
    status === Classification.HAID
      ? "rose"
      : status === Classification.ISTIHADHAH
        ? "peach"
        : "sage";

  const dayOfEpisode = analysis.rulings.get(today)?.dayOfEpisode;

  return (
    <section
      className={cx(
        "flex flex-col items-center gap-3.5 rounded-3xl border px-5 py-[22px] shadow-card",
        surface,
      )}
    >
      <Pill
        tone={pillTone}
        glyph={<StatusGlyph status={status} size={8} />}
      >
        {STATUS_LABEL[status]}
      </Pill>

      {(status === Classification.HAID || status === Classification.NIFAS) &&
      dayOfEpisode ? (
        <DayRing
          day={dayOfEpisode}
          of={expectedLength}
          caption={
            expectedLength
              ? `dari perkiraan ${expectedLength} hari`
              : "belum ada perkiraan"
          }
        />
      ) : status === Classification.ISTIHADHAH ? (
        <IstihadhahMark />
      ) : status === Classification.NEEDS_REVIEW ? (
        <UnknownMark />
      ) : (
        <SuciMark />
      )}

      {status !== Classification.HAID && status !== Classification.NIFAS && (
        <div className="text-center">
          <h2
            className={cx(
              "m-0 text-[22px]/[1.3] font-bold tracking-[-.015em]",
              status === Classification.ISTIHADHAH
                ? "text-peach-tx"
                : status === Classification.NEEDS_REVIEW
                  ? "text-tx"
                  : "text-sage-tx",
            )}
          >
            {verdict.headline}
          </h2>
        </div>
      )}

      <p className="m-0 max-w-[290px] text-center text-[14.5px]/[1.55] text-balance text-tx2">
        {verdict.body}
      </p>

      {chips.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {chips.map((c) => (
            <span
              key={c}
              className={cx(
                "rounded-full border bg-bg px-3 py-[7px] text-[11.5px]/[1] font-medium text-tx2",
                status === Classification.ISTIHADHAH
                  ? "border-peach-b"
                  : "border-rose-b",
              )}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {status === Classification.SUCI && analysis.nextPredictedStart && (
        <div className="flex items-center gap-2 rounded-full border border-sage-b bg-bg px-3.5 py-2">
          <ClockIcon size={15} className="text-sage-tx" />
          <span className="text-[12.5px]/[1] font-medium text-tx2">
            Perkiraan haid berikutnya{" "}
            {daysBetween(today, analysis.nextPredictedStart)} hari lagi
          </span>
        </div>
      )}
    </section>
  );
}

/** The 168px progress ring from screen 05a. */
function DayRing({
  day,
  of,
  caption,
}: {
  day: number;
  of?: number;
  caption: string;
}) {
  const RADIUS = 74;
  const circumference = 2 * Math.PI * RADIUS;
  const fraction = of && of > 0 ? Math.min(1, day / of) : 0;
  const offset = circumference * (1 - fraction);

  return (
    <div className="relative flex h-[168px] w-[168px] items-center justify-center">
      <svg
        width="168"
        height="168"
        viewBox="0 0 168 168"
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="84"
          cy="84"
          r={RADIUS}
          fill="none"
          stroke="var(--rose-b)"
          strokeWidth="7"
          opacity=".35"
        />
        <circle
          cx="84"
          cy="84"
          r={RADIUS}
          fill="none"
          stroke="var(--icon)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="text-center">
        <div className="t-label text-tx2">Hari ke</div>
        <div className="my-1 text-[56px]/[1] font-bold tracking-[-.04em] text-tx">
          {day}
        </div>
        {/* Narrow enough to stay clear of the ring stroke, which curves in
            sharply at the caption's height. */}
        <div className="mx-auto max-w-[96px] text-[12.5px]/[1.3] text-balance text-tx2">
          {caption}
        </div>
      </div>
    </div>
  );
}

/** The dashed crescent from screen 05b. */
function SuciMark() {
  return (
    <div className="flex h-[150px] w-[150px] items-center justify-center text-sage-tx">
      <svg
        width="132"
        height="132"
        viewBox="0 0 132 132"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle
          cx="66"
          cy="66"
          r="62"
          stroke="var(--sage-b)"
          strokeWidth="1"
          strokeDasharray="3 7"
        />
        <path
          d="M92 74A30 30 0 0 1 56 36a32 32 0 1 0 36 38z"
          strokeWidth="2.2"
        />
        <path
          d="M92 26l2.6 5.6 5.6 2.6-5.6 2.6L92 42.4l-2.6-5.6L83.8 34.2l5.6-2.6z"
          strokeWidth="2"
        />
        <path d="M40 92h20M48 100h18" stroke="var(--sage-b)" strokeWidth="2" />
      </svg>
    </div>
  );
}

function IstihadhahMark() {
  return (
    <div className="flex h-[150px] w-[150px] items-center justify-center text-peach-tx">
      <svg
        width="132"
        height="132"
        viewBox="0 0 132 132"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle
          cx="66"
          cy="66"
          r="62"
          stroke="var(--peach-b)"
          strokeWidth="1"
          strokeDasharray="3 7"
        />
        <g transform="translate(24, 44) scale(3.5)">
          <WavesIcon size={24} strokeWidth={0.7} />
        </g>
      </svg>
    </div>
  );
}

function UnknownMark() {
  return (
    <div className="flex h-[150px] w-[150px] items-center justify-center">
      <svg
        width="132"
        height="132"
        viewBox="0 0 132 132"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="66"
          cy="66"
          r="62"
          stroke="var(--hair)"
          strokeWidth="1.5"
          strokeDasharray="4 8"
        />
        <text
          x="66"
          y="66"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--tx2)"
          fontSize="52"
          fontWeight="700"
        >
          ?
        </text>
      </svg>
    </div>
  );
}
