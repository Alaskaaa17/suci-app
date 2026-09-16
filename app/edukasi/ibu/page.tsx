"use client";

import { useRouter } from "next/navigation";
import { Screen } from "@/components/shell";
import { WarningIcon } from "@/components/icons";
import {
  Advisory,
  BackLink,
  NavRow,
  Pill,
  PrimaryButton,
  ProgressBar,
} from "@/components/ui";
import { StatusGlyph } from "@/components/status-glyph";
import { daysBetween } from "@/lib/date";
import { MADHHAB_ORDER, MADHHABS } from "@/lib/fiqh/madhhab";
import { Classification } from "@/lib/fiqh/types";
import { useApp } from "@/lib/store/app-store";
import { LeafIcon } from "@/components/icons";

/** Screen 17a. Live when Mode Nifas is on; an explainer otherwise. */
export default function UntukIbuPage() {
  const router = useRouter();
  const { data, today, setEntry } = useApp();
  if (!data) return null;

  const rules = MADHHABS[data.profile.madhhab];
  const inNifas =
    data.profile.specialState === "nifas" && !!data.profile.nifasStart;
  const dayCount = inNifas
    ? daysBetween(data.profile.nifasStart!, today) + 1
    : 0;

  return (
    <Screen tabBar={false} className="gap-[13px] pt-1.5">
      <BackLink href="/edukasi" label="Edukasi" />

      <div>
        <h1 className="t-headline m-0 text-tx">Untuk Ibu</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          Masa nifas itu masa pemulihan. Ibadahmu sedang diringankan, bukan
          ditunda.
        </p>
      </div>

      {inNifas ? (
        <section className="flex flex-col gap-3 rounded-[22px] border border-sage-b bg-sage p-[18px] shadow-card">
          <Pill
            tone="sage"
            glyph={<StatusGlyph status={Classification.NIFAS} size={8} />}
          >
            Nifas
          </Pill>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[44px]/[1] font-bold tracking-[-.035em] text-sage-tx">
              {dayCount}
            </span>
            <span className="text-sm/[1.3] text-tx2">hari sejak melahirkan</span>
          </div>
          <ProgressBar
            value={dayCount}
            max={rules.nifasMaxDays}
            tone="sage"
            label="Hari nifas berjalan"
          />
          <p className="m-0 text-[13.5px]/[1.6] text-tx2">
            Kalau darah berhenti sebelum {rules.nifasMaxDays} hari, kamu mandi
            wajib dan langsung kembali shalat. Tidak perlu menunggu genap.
          </p>
        </section>
      ) : (
        <section className="rounded-[22px] border border-hair bg-bg p-[18px] shadow-card">
          <p className="m-0 text-[13.5px]/[1.6] text-tx2">
            Mode Nifas sedang tidak aktif. Kalau kamu baru melahirkan, nyalakan
            di Pengaturan dan isi tanggalnya — Suci akan menghitung masa
            nifasmu dan menyesuaikan status ibadah.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-[11px] rounded-[20px] border border-stone-b bg-stone-card p-4">
        <div className="t-label text-stone-tx2">Batas maksimal nifas</div>
        {MADHHAB_ORDER.map((id, i) => {
          const r = MADHHABS[id];
          return (
            <div
              key={id}
              className={
                i < MADHHAB_ORDER.length - 1
                  ? "flex justify-between border-b border-stone-b pb-2"
                  : "flex justify-between"
              }
            >
              <span className="text-[13.5px]/[1] font-semibold text-stone-tx">
                {r.name}
              </span>
              <span className="text-[13px]/[1] text-stone-tx2">
                {r.nifasMaxDays} hari
              </span>
            </div>
          );
        })}
        <div className="border-t border-stone-b pt-2.5 text-[11.5px]/[1.5] text-stone-tx2">
          Bidayatul Mujtahid, Bab Haid dan Nifas
        </div>
      </section>

      <Advisory icon={<WarningIcon size={15} />}>
        Untuk keluhan fisik pasca melahirkan, ikuti anjuran bidan atau dokter.
        Suci tidak menggantikan nasihat medis.
      </Advisory>

      <NavRow
        href="/edukasi/ibu/menyusui"
        tone="rose"
        icon={<LeafIcon size={17} />}
        title="Menyusui dan puasa"
        subtitle="Tiga jalan yang dibolehkan"
      />

      {inNifas && (
        <div className="mt-auto pt-3 pb-5">
          <PrimaryButton
            className="h-[52px] text-[15px]"
            onClick={async () => {
              await setEntry(today, { bleeding: false, ghusl: true });
              router.push("/ibadah/mandi-wajib");
            }}
          >
            Catat darah berhenti
          </PrimaryButton>
        </div>
      )}
    </Screen>
  );
}
