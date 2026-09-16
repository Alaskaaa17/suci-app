"use client";

import Link from "next/link";
import { LegalBasis } from "@/components/legal-basis";
import { Screen, ThemeToggle } from "@/components/shell";
import { StatusCard } from "@/components/status-card";
import {
  BookIcon,
  MihrabIcon,
  PlusIcon,
  SlidersIcon,
  TargetIcon,
} from "@/components/icons";
import { NavRow, PrimaryLink } from "@/components/ui";
import { Classification } from "@/lib/fiqh/types";
import { useApp } from "@/lib/store/app-store";

export default function BerandaPage() {
  const { data, analysis, verdict, today } = useApp();
  if (!data || !analysis || !verdict) return null;

  const { profile } = data;
  const exempt =
    verdict.classification === Classification.HAID ||
    verdict.classification === Classification.NIFAS;

  const fastsOwed = data.qadhaFast.owed - data.qadhaFast.settled;
  const prayersOwed = data.qadhaPrayers.filter((q) => !q.settledOn).length;

  return (
    <Screen className="pt-3">
      <header className="flex items-center justify-between">
        {/* The greeting is this screen's heading — without it, Beranda had no
            h1 at all and a screen reader had nothing to announce. */}
        <h1 className="m-0 font-normal">
          <span className="block text-[13px]/[1.3] text-tx2">
            Assalamualaikum,
          </span>
          <span className="block text-[22px]/[1.25] font-bold tracking-[-.015em] text-tx">
            {profile.name || "Selamat datang"}
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/pengaturan"
            aria-label="Pengaturan"
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-hair text-tx2 transition hover:border-rose-b hover:text-tx"
          >
            <SlidersIcon size={19} />
          </Link>
        </div>
      </header>

      <StatusCard
        verdict={verdict}
        analysis={analysis}
        today={today}
        expectedLength={analysis.averageHaidLength}
      />

      <LegalBasis
        verdict={verdict}
        defaultOpen={verdict.classification === Classification.HAID}
        subtitle={
          verdict.classification === Classification.HAID
            ? undefined
            : "Ketuk untuk lihat jejak penalaran"
        }
      />

      <div className="stagger flex flex-col gap-2.5">
        <NavRow
          href="/ibadah"
          tone="sage"
          icon={<MihrabIcon size={17} />}
          title="Ibadah hari ini"
          subtitle={
            exempt
              ? `Dzikir pengganti${fastsOwed > 0 ? ` · ${fastsOwed} puasa menunggu qadha` : ""}`
              : `Jadwal shalat${fastsOwed > 0 ? ` · ${fastsOwed} puasa menunggu qadha` : ""}${
                  prayersOwed > 0 ? ` · ${prayersOwed} qadha shalat` : ""
                }`
          }
        />
        <NavRow
          href="/edukasi"
          tone="rose"
          icon={<BookIcon size={17} />}
          title="Edukasi"
          subtitle="8 topik · glosarium · tanya jawab"
        />
        <NavRow
          href="/pengaturan/kehamilan"
          tone="peach"
          icon={<TargetIcon size={17} />}
          title="Kehamilan"
          subtitle={
            profile.specialState === "hamil"
              ? "Aktif — lihat usia kehamilan"
              : "Nonaktif — nyalakan bila perlu"
          }
        />
      </div>

      {!exempt && (
        <div className="pt-1">
          <PrimaryLink href="/catat" className="text-[15px]">
            <PlusIcon size={18} />
            Catat hari ini
          </PrimaryLink>
        </div>
      )}
    </Screen>
  );
}
