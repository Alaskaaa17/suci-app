"use client";

import { useState } from "react";
import { Screen } from "@/components/shell";
import { MinusIcon, PlusIcon } from "@/components/icons";
import { BackLink, PrimaryButton, cx } from "@/components/ui";
import { MADHHABS } from "@/lib/fiqh/madhhab";
import { useApp } from "@/lib/store/app-store";

/**
 * Screen 17b. The fidyah figure follows the selected madhhab's position and
 * which worry applies — the design shows one number, but the number is only
 * meaningful once you say who you are worried about.
 */

type Worry = "diri" | "bayi" | "keduanya";

const WORRIES: Array<{ id: Worry; label: string }> = [
  { id: "diri", label: "Diriku sendiri" },
  { id: "bayi", label: "Bayiku saja" },
  { id: "keduanya", label: "Keduanya" },
];

/**
 * Whether fidyah is owed on top of qadha, per school.
 * Syafi'i and Maliki: yes when the worry is for the baby alone.
 * Hanafi: qadha only, never fidyah.
 * Hanbali: as Syafi'i — fidyah when the worry is for the baby alone.
 */
function fidyahOwed(madhhab: string, worry: Worry): boolean {
  if (madhhab === "hanafi") return false;
  return worry === "bayi";
}

export default function MenyusuiPage() {
  const { data, update } = useApp();
  const [days, setDays] = useState(0);
  const [worry, setWorry] = useState<Worry>("bayi");
  const [saved, setSaved] = useState(false);

  if (!data) return null;
  const rules = MADHHABS[data.profile.madhhab];
  const owesFidyah = fidyahOwed(rules.id, worry);

  return (
    <Screen tabBar={false} className="gap-[13px] pt-1.5">
      <BackLink href="/edukasi/ibu" label="Untuk Ibu" />

      <div>
        <h1 className="t-headline m-0 text-tx">Menyusui dan puasa</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          Kamu punya pilihan yang sah. Tidak ada yang perlu dirasa bersalah di
          sini.
        </p>
      </div>

      <section className="flex flex-col gap-[11px] rounded-[22px] border border-rose-b bg-rose p-[18px] shadow-card">
        <h2 className="m-0 text-[16.5px]/[1.3] font-semibold text-tx">
          Tiga jalan yang dibolehkan
        </h2>
        {[
          {
            n: 1,
            strong: "Tetap berpuasa",
            rest: " bila kamu dan bayi sehat dan kuat.",
          },
          {
            n: 2,
            strong: "Tidak puasa, lalu qadha",
            rest: " bila khawatir pada dirimu sendiri.",
          },
          {
            n: 3,
            strong: "Qadha ditambah fidyah",
            rest: ` bila khawatir pada bayi saja — menurut ${rules.name}.`,
          },
        ].map((row) => (
          <div key={row.n} className="flex items-start gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg text-xs/[1] font-bold text-icon">
              {row.n}
            </span>
            <span className="text-[13px]/[1.55] text-tx2">
              <span className="font-semibold text-tx">{row.strong}</span>
              {row.rest}
            </span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-stone-b bg-stone-card p-4">
        <div className="t-label text-stone-tx2">Perbandingan pendapat</div>
        <p className="m-0 text-[12.5px]/[1.65] text-stone-tx2">
          <span className="font-semibold text-stone-tx">Syafi&apos;i:</span>{" "}
          {MADHHABS.syafii.nursingRule}{" "}
          <span className="font-semibold text-stone-tx">Maliki:</span>{" "}
          {MADHHABS.maliki.nursingRule}{" "}
          <span className="font-semibold text-stone-tx">Hanafi:</span>{" "}
          {MADHHABS.hanafi.nursingRule}{" "}
          <span className="font-semibold text-stone-tx">Hanbali:</span>{" "}
          {MADHHABS.hanbali.nursingRule}
        </p>
        <p className="m-0 rounded-xl bg-stone-bg px-[13px] py-[11px] text-[12px]/[1.55] text-stone-tx2">
          Fidyah = memberi makan satu orang miskin untuk setiap hari yang
          ditinggalkan.{" "}
          <span className="font-semibold text-stone-tx">
            Al-Majmu&apos;, jld. 6
          </span>
        </p>
      </section>

      <section className="flex flex-col gap-[11px] rounded-[20px] border border-hair p-4">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
          Hitung tanggunganmu
        </h2>

        <div className="flex flex-col gap-2">
          <span className="t-label text-tx2">Yang kamu khawatirkan</span>
          <div className="flex gap-1.5 rounded-full border border-hair p-[5px]">
            {WORRIES.map((w) => (
              <button
                key={w.id}
                type="button"
                aria-pressed={worry === w.id}
                onClick={() => {
                  setWorry(w.id);
                  setSaved(false);
                }}
                className={cx(
                  "flex h-9 flex-1 items-center justify-center rounded-full text-[12px] transition",
                  worry === w.id
                    ? "border border-rose-b bg-rose font-semibold text-tx"
                    : "font-medium text-tx2 hover:bg-rose",
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5">
          <div className="flex-1 rounded-[14px] border border-hair px-[13px] py-3">
            <span className="t-label block text-tx2">Hari tidak puasa</span>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[15px]/[1] font-semibold text-tx">
                {days} hari
              </span>
              <span className="flex gap-2.5 text-tx2">
                <button
                  type="button"
                  aria-label="Kurangi hari"
                  onClick={() => {
                    setDays((d) => Math.max(0, d - 1));
                    setSaved(false);
                  }}
                  className="-m-1.5 flex h-6 w-6 items-center justify-center p-1.5 transition hover:text-tx"
                >
                  <MinusIcon size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Tambah hari"
                  onClick={() => {
                    setDays((d) => Math.min(60, d + 1));
                    setSaved(false);
                  }}
                  className="-m-1.5 flex h-6 w-6 items-center justify-center p-1.5 transition hover:text-tx"
                >
                  <PlusIcon size={15} />
                </button>
              </span>
            </div>
          </div>

          <div className="flex-1 rounded-[14px] border border-hair px-[13px] py-3">
            <span className="t-label block text-tx2">Fidyah</span>
            <span className="mt-1.5 block text-[15px]/[1] font-semibold text-tx">
              {owesFidyah ? `${days} porsi` : "Tidak ada"}
            </span>
          </div>
        </div>

        <p className="m-0 text-xs/[1.5] text-tx2">
          {owesFidyah
            ? `Menurut mazhab ${rules.name}, khawatir pada bayi saja berarti qadha ditambah fidyah.`
            : `Menurut mazhab ${rules.name}, dalam kondisi ini cukup qadha tanpa fidyah.`}{" "}
          Ganti mazhab di Pengaturan untuk melihat perhitungan lain.
        </p>
      </section>

      <div className="mt-auto flex flex-col gap-2 pt-3 pb-5">
        <PrimaryButton
          className="h-[52px] text-[15px]"
          disabled={days === 0}
          onClick={() => {
            update((draft) => {
              draft.qadhaFast.owed += days;
              if (owesFidyah) draft.qadhaFast.fidyah += days;
            });
            setSaved(true);
            setDays(0);
          }}
        >
          Simpan ke pengingat qadha
        </PrimaryButton>
        {saved && (
          <p className="m-0 text-center text-[12px]/[1.5] text-tx2">
            Tersimpan. Lihat di layar Ibadah.
          </p>
        )}
      </div>
    </Screen>
  );
}
