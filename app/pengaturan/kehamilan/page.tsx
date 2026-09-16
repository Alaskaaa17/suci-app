"use client";

import { Screen } from "@/components/shell";
import { WarningIcon } from "@/components/icons";
import {
  Advisory,
  BackLink,
  PrimaryButton,
  ProgressBar,
  SecondaryButton,
} from "@/components/ui";
import { addDays, daysBetween, formatMedium, todayIso } from "@/lib/date";
import { MADHHABS } from "@/lib/fiqh/madhhab";
import { useApp } from "@/lib/store/app-store";

const GESTATION_DAYS = 280; // 40 weeks from the last menstrual period

export default function KehamilanPage() {
  const { data, today, update } = useApp();
  if (!data) return null;

  const { profile } = data;
  const rules = MADHHABS[profile.madhhab];
  const active = profile.specialState === "hamil";
  const lmp = profile.pregnancyLmp;

  const elapsed = lmp ? daysBetween(lmp, today) : 0;
  const weeks = Math.max(0, Math.floor(elapsed / 7));
  const trimester = weeks < 13 ? "pertama" : weeks < 27 ? "kedua" : "ketiga";
  const due = lmp ? addDays(lmp, GESTATION_DAYS) : null;

  return (
    <Screen tabBar={false} className="gap-[13px] pt-1.5">
      <BackLink href="/pengaturan" label="Pengaturan" />

      <h1 className="t-headline m-0 text-tx">Kehamilan</h1>

      {active && lmp ? (
        <section className="flex flex-col items-center gap-2.5 rounded-3xl border border-rose-b bg-rose px-5 py-6 shadow-card">
          <span className="t-label text-tx2">Usia kehamilan</span>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[72px]/[1] font-bold tracking-[-.045em] text-tx">
              {weeks}
            </span>
            <span className="text-lg/[1] font-semibold text-tx2">minggu</span>
          </div>
          <span className="text-[13.5px]/[1.5] text-tx2">
            Trimester {trimester}
            {due ? ` · perkiraan lahir ${formatMedium(due)}` : ""}
          </span>
          <div className="mt-1 w-full">
            <ProgressBar
              value={weeks}
              max={40}
              label="Kemajuan kehamilan dalam minggu"
            />
          </div>
          <div className="flex w-full justify-between text-[11px]/[1] font-medium text-tx2">
            <span>0</span>
            <span>40 minggu</span>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-hair bg-bg p-[18px] shadow-card">
          <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
            Mode Kehamilan nonaktif
          </h2>
          <p className="mt-2 mb-0 text-[13.5px]/[1.6] text-tx2">
            Nyalakan bila kamu sedang hamil. Suci akan menghitung usia kehamilan
            dan menerapkan aturan mazhabmu untuk darah yang keluar selama hamil.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-[20px] border border-sage-b bg-sage p-[17px]">
        <div className="t-label text-sage-tx">Doa untuk kandungan</div>
        <p lang="ar" className="arabic m-0 text-xl text-sage-tx">
          رَبِّ هَبْ لِي مِنَ الصَّالِحِينَ
        </p>
        <p className="m-0 text-[13px]/[1.6] text-tx2">
          &ldquo;Tuhanku, anugerahkanlah kepadaku seorang anak yang termasuk
          orang-orang saleh.&rdquo; ·{" "}
          <span className="font-semibold text-sage-tx">As-Saffat: 100</span>
        </p>
      </section>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-stone-b bg-stone-card p-4">
        <div className="t-label text-stone-tx2">Darah saat hamil — ikhtilaf</div>
        <p className="m-0 text-[12.5px]/[1.65] text-stone-tx2">
          <span className="font-semibold text-stone-tx">
            Syafi&apos;i &amp; Maliki:
          </span>{" "}
          perempuan hamil bisa haid, sehingga darahnya menghentikan shalat.{" "}
          <span className="font-semibold text-stone-tx">
            Hanafi &amp; Hanbali:
          </span>{" "}
          tidak ada haid saat hamil, darah itu istihadhah dan ibadah tetap
          berjalan.
        </p>
        <p className="m-0 rounded-xl bg-stone-bg px-[13px] py-[11px] text-[12px]/[1.55] text-stone-tx2">
          Mazhabmu {rules.name}, jadi aplikasi menghitung darah saat hamil
          sebagai{" "}
          <span className="font-semibold text-stone-tx">
            {rules.haidDuringPregnancy ? "haid" : "istihadhah"}
          </span>
          .{" "}
          <span className="font-semibold text-stone-tx">
            {rules.haidCitation.work}, {rules.haidCitation.locus}
          </span>
        </p>
      </section>

      <Advisory icon={<WarningIcon size={15} />}>
        Pendarahan saat hamil perlu diperiksa bidan atau dokter, apa pun hukum
        fiqihnya. Keselamatanmu lebih dulu.
      </Advisory>

      <div className="mt-auto flex flex-col gap-2.5 pt-3 pb-5">
        {active ? (
          <SecondaryButton
            onClick={() =>
              update((draft) => {
                draft.profile.specialState = "normal";
              })
            }
          >
            Matikan Mode Kehamilan
          </SecondaryButton>
        ) : (
          <>
            <label className="flex items-center justify-between rounded-[14px] border border-field-b px-[13px] py-3">
              <span className="text-[13px] font-medium text-tx2">
                Hari pertama haid terakhir
              </span>
              <input
                type="date"
                value={lmp ?? todayIso()}
                max={today}
                onChange={(e) =>
                  e.target.value &&
                  update((draft) => {
                    draft.profile.pregnancyLmp = e.target.value;
                  })
                }
                className="bg-transparent text-[13.5px] font-medium text-tx"
              />
            </label>
            <PrimaryButton
              className="h-[52px] text-[15px]"
              onClick={() =>
                update((draft) => {
                  draft.profile.specialState = "hamil";
                  if (!draft.profile.pregnancyLmp) {
                    draft.profile.pregnancyLmp = todayIso();
                  }
                })
              }
            >
              Aktifkan Mode Kehamilan
            </PrimaryButton>
          </>
        )}
      </div>
    </Screen>
  );
}
