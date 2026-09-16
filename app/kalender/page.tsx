"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Screen } from "@/components/shell";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import {
  STATUS_GLYPH_DESCRIPTION,
  STATUS_LABEL,
  StatusGlyph,
  statusSurface,
} from "@/components/status-glyph";
import { cx } from "@/components/ui";
import {
  formatMonthYear,
  monthGrid,
  toDate,
  WEEKDAY_HEADERS,
  type IsoDate,
} from "@/lib/date";
import { rulingFor } from "@/lib/fiqh/cycle";
import { Classification } from "@/lib/fiqh/types";
import { useApp } from "@/lib/store/app-store";

const LEGEND: Classification[] = [
  Classification.HAID,
  Classification.SUCI,
  Classification.ISTIHADHAH,
  Classification.NEEDS_REVIEW,
];

export default function KalenderPage() {
  const { analysis, today } = useApp();
  const router = useRouter();

  const initial = toDate(today);
  const [cursor, setCursor] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });

  if (!analysis) return null;

  const cells = monthGrid(cursor.year, cursor.month);

  const step = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <Screen className="pt-3">
      <header className="flex items-center justify-between">
        <h1 className="t-headline m-0 text-tx">Kalender</h1>
        <div className="flex items-center gap-1.5">
          <NavButton label="Bulan sebelumnya" onClick={() => step(-1)}>
            <ChevronLeftIcon size={16} />
          </NavButton>
          <span className="min-w-[112px] text-center text-[14.5px]/[1] font-semibold text-tx">
            {formatMonthYear(cursor.year, cursor.month)}
          </span>
          <NavButton label="Bulan berikutnya" onClick={() => step(1)}>
            <ChevronRightIcon size={16} />
          </NavButton>
        </div>
      </header>

      <div key={`${cursor.year}-${cursor.month}`} className="animate-fade grid grid-cols-7 gap-[5px]">
        {WEEKDAY_HEADERS.map((d) => (
          <span
            key={d}
            className="pb-1 text-center text-[10.5px]/[1] font-medium tracking-[.06em] text-tx2 uppercase"
          >
            {d}
          </span>
        ))}

        {cells.map((date, i) =>
          date === null ? (
            <span key={`blank-${i}`} className="h-[52px]" />
          ) : (
            <DayCell
              key={date}
              date={date}
              today={today}
              status={rulingFor(analysis, date).classification}
              onSelect={() => router.push(`/catat?tanggal=${date}`)}
            />
          ),
        )}
      </div>

      <section className="flex flex-col gap-2.5 rounded-[18px] border border-hair bg-bg px-4 py-3.5 shadow-card">
        <div className="t-label text-tx2">Keterangan</div>
        <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-[9px] p-0">
          {LEGEND.map((status) => (
            <li key={status} className="flex items-center gap-2">
              <span
                className={cx(
                  "flex h-5 w-5 items-center justify-center rounded-[7px] border",
                  statusSurface(status),
                )}
              >
                <StatusGlyph status={status} size={6} />
              </span>
              <span className="text-xs/[1.2] font-medium text-tx">
                {STATUS_LABEL[status]}
                {STATUS_GLYPH_DESCRIPTION[status] && (
                  <span className="text-tx2">
                    {" · "}
                    {STATUS_GLYPH_DESCRIPTION[status]}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="h-px bg-hair" />
        <p className="m-0 text-xs/[1.5] text-tx2">
          Garis putus-putus tanpa isian = perkiraan, belum terjadi. Ketuk
          tanggal mana pun untuk melihat atau mengubah catatannya.
        </p>
      </section>
    </Screen>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-hair text-tx2 transition hover:border-rose-b hover:text-tx"
    >
      {children}
    </button>
  );
}

function DayCell({
  date,
  today,
  status,
  onSelect,
}: {
  date: IsoDate;
  today: IsoDate;
  status: Classification;
  onSelect: () => void;
}) {
  const isToday = date === today;
  const dayNumber = toDate(date).getDate();

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isToday ? "date" : undefined}
      // The visible glyph is decorative, so the full meaning goes on the label.
      aria-label={`${dayNumber} — ${STATUS_LABEL[status]}${isToday ? ", hari ini" : ""}`}
      className={cx(
        "flex h-[52px] flex-col items-center justify-center gap-1 rounded-[15px] border transition",
        statusSurface(status),
        isToday && "border-2 border-solid",
        "duration-150 hover:brightness-95 active:scale-90",
      )}
    >
      <span
        className={cx(
          "text-sm/[1]",
          isToday
            ? "font-bold text-tx"
            : status === Classification.HAID
              ? "font-semibold text-tx"
              : status === Classification.PREDICTED_HAID
                ? "font-medium text-tx2"
                : "font-medium text-tx",
        )}
      >
        {dayNumber}
      </span>
      <StatusGlyph status={status} size={6} />
    </button>
  );
}
