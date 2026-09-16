"use client";

import { useEffect, useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import {
  ClockIcon,
  DropIcon,
  InfoDotIcon,
  LeafIcon,
  MihrabIcon,
  MoonIcon,
} from "@/components/icons";
import {
  cx,
  IconBubble,
  NavRow,
  ProgressBar,
  SectionLabel,
} from "@/components/ui";
import { formatDayMonth, formatDuration } from "@/lib/date";
import {
  computePrayerTimes,
  nextPrayer,
  type PrayerTime,
} from "@/lib/fiqh/prayer-times";
import { Classification } from "@/lib/fiqh/types";
import { useApp } from "@/lib/store/app-store";

export default function IbadahPage() {
  const { data, verdict, today, update } = useApp();
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);
  const tz = data?.profile.location.tz;

  // Rendered only after mount: the clock differs between server and client.
  // "Now" is read in the chosen city's timezone, so the countdown lines up
  // with the schedule above it even when the device clock is set elsewhere.
  useEffect(() => {
    if (tz === undefined) return;
    const tick = () => {
      const utcMinutes =
        new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
      setNowMinutes((((utcMinutes + tz * 60) % 1440) + 1440) % 1440);
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [tz]);

  const times = useMemo(() => {
    if (!data) return [];
    return computePrayerTimes({
      date: today,
      lat: data.profile.location.lat,
      lng: data.profile.location.lng,
      method: data.profile.prayerMethod,
      // Follow the chosen city, not the device clock.
      timezone: data.profile.location.tz,
    });
  }, [data, today]);

  if (!data || !verdict) return null;

  const exempt =
    verdict.classification === Classification.HAID ||
    verdict.classification === Classification.NIFAS;

  const upcoming = nowMinutes === null ? null : nextPrayer(times, nowMinutes);
  const fastOwed = data.qadhaFast.owed;
  const fastSettled = data.qadhaFast.settled;
  const prayersOwed = data.qadhaPrayers.filter((q) => !q.settledOn).length;

  const grid: PrayerTime[] = times.filter(
    (t) => t.name !== "terbit",
  );

  return (
    <Screen className="pt-3">
      <header>
        <h1 className="t-headline m-0 text-tx">Ibadah</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          {formatDayMonth(today)} · {data.profile.location.label}
        </p>
      </header>

      <section className="flex flex-col gap-3.5 rounded-[22px] border border-rose-b bg-rose p-[18px] shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="m-0 text-[16.5px]/[1.3] font-semibold text-tx">
            Jadwal shalat
          </h2>
          {upcoming && (
            <span className="flex items-center gap-1.5 rounded-full border border-rose-b bg-bg px-[11px] py-1.5 text-[11.5px]/[1] font-medium text-tx2">
              <ClockIcon size={13} />
              {upcoming.prayer.label} {formatDuration(upcoming.minutesUntil)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-[9px]">
          {grid.map((t) => {
            const isNext = upcoming?.prayer.name === t.name;
            const isMarker = !t.isPrayer;
            return (
              <div
                key={t.name}
                className={cx(
                  "rounded-[15px] px-2 py-3 text-center",
                  isMarker
                    ? "border border-dashed border-rose-b bg-transparent"
                    : isNext
                      ? "border-[1.5px] border-icon bg-bg"
                      : "border border-rose-b bg-bg",
                )}
              >
                <span className="block text-[11px]/[1] font-medium tracking-[.06em] text-tx2 uppercase">
                  {t.label}
                </span>
                <span
                  className={cx(
                    "mt-1.5 block text-base/[1]",
                    isMarker
                      ? "font-semibold text-tx2"
                      : isNext
                        ? "font-bold text-tx"
                        : "font-semibold text-tx",
                  )}
                >
                  {t.time}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-bg px-[13px] py-3">
          <IconBubble tone="rose" size={28}>
            <InfoDotIcon size={15} />
          </IconBubble>
          <p className="m-0 text-[12.5px]/[1.55] text-tx2">
            {exempt
              ? "Kamu sedang haid, jadi shalat tidak wajib dan tidak perlu diqadha. Waktu ini tetap ditampilkan untuk menemani ritmemu."
              : verdict.classification === Classification.ISTIHADHAH
                ? "Darah istihadhah tidak menggugurkan shalat. Berwudhu setiap kali masuk waktu, lalu shalat seperti biasa."
                : `Dihitung dengan metode ${data.profile.prayerMethod === "kemenag" ? "Kemenag RI" : data.profile.prayerMethod.toUpperCase()} untuk ${data.profile.location.label}.`}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] border border-hair bg-bg p-4 shadow-card">
        <div className="flex items-center gap-[11px]">
          <IconBubble tone="peach">
            <MoonIcon size={16} />
          </IconBubble>
          <h2 className="m-0 flex-1 text-base/[1.3] font-semibold text-tx">
            Qadha puasa Ramadan
          </h2>
        </div>

        {fastOwed > 0 ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-[30px]/[1] font-bold tracking-[-.03em] text-tx">
                {fastSettled}
              </span>
              <span className="text-[13.5px]/[1] text-tx2">
                dari {fastOwed} hari sudah lunas
              </span>
            </div>
            <ProgressBar
              value={fastSettled}
              max={fastOwed}
              label="Kemajuan qadha puasa"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px]/[1.5] text-tx2">
                Sisa {Math.max(0, fastOwed - fastSettled)} hari · sebelum
                Ramadan berikutnya
              </span>
              <button
                type="button"
                onClick={() =>
                  update((draft) => {
                    draft.qadhaFast.settled = Math.min(
                      draft.qadhaFast.owed,
                      draft.qadhaFast.settled + 1,
                    );
                  })
                }
                disabled={fastSettled >= fastOwed}
                className="border-b border-rose-b text-[12.5px]/[1] font-semibold text-tx disabled:opacity-40"
              >
                Catat lunas
              </button>
            </div>
          </>
        ) : (
          <p className="m-0 text-[13px]/[1.6] text-tx2">
            Belum ada hari puasa yang tercatat menunggu qadha. Kalau kamu
            melewatkan puasa Ramadan karena haid, catat jumlahnya di Pengaturan
            supaya bisa dicicil dari sini.
          </p>
        )}
      </section>

      <div className="stagger flex flex-col gap-2.5">
        <SectionLabel>Panduan</SectionLabel>
        <NavRow
          href="/ibadah/mandi-wajib"
          tone="sage"
          icon={<DropIcon size={17} />}
          title="Mandi wajib"
          subtitle="Niat, rukun, dan urutan lengkap"
        />
        <NavRow
          href="/ibadah/qadha-shalat"
          tone="rose"
          icon={<MihrabIcon size={17} />}
          title="Qadha shalat"
          subtitle={
            prayersOwed > 0
              ? `${prayersOwed} catatan belum lunas`
              : "Tidak ada yang belum lunas"
          }
        />
        <NavRow
          href="/edukasi/amalan"
          tone="peach"
          icon={<LeafIcon size={17} />}
          title="Amalan pengganti"
          subtitle="Dzikir dan sedekah saat libur shalat"
        />
      </div>
    </Screen>
  );
}
