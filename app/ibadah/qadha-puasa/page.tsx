"use client";

import { useState } from "react";
import { Screen } from "@/components/shell";
import { MinusIcon, MoonIcon, PlusIcon } from "@/components/icons";
import {
  BackLink,
  CitationCard,
  IconBubble,
  ProgressBar,
  SecondaryButton,
} from "@/components/ui";
import { CONSENSUS } from "@/lib/fiqh/madhhab";
import { useApp } from "@/lib/store/app-store";

export default function QadhaPuasaPage() {
  const { data, update } = useApp();
  const [days, setDays] = useState(1);
  const [saved, setSaved] = useState(false);

  if (!data) return null;

  const owed = data.qadhaFast.owed;
  const settled = data.qadhaFast.settled;
  const remaining = Math.max(0, owed - settled);

  return (
    <Screen tabBar={false} className="pt-1.5">
      <BackLink href="/ibadah" label="Ibadah" />

      <div>
        <h1 className="t-headline m-0 text-tx">Qadha puasa Ramadan</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          Untuk hari puasa Ramadan yang terlewat karena haid — beda dari
          shalat, ini wajib diganti.
        </p>
      </div>

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-stone-b bg-stone-card p-[17px]">
        <div className="t-label text-stone-tx2">Dasar hukum</div>
        <p className="m-0 text-[13px]/[1.65] text-stone-tx2">
          {CONSENSUS.fastIsMadeUp.claim}
        </p>
        <CitationCard
          work={CONSENSUS.fastIsMadeUp.citation.work}
          locus={CONSENSUS.fastIsMadeUp.citation.locus}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] border border-hair bg-bg p-4 shadow-card">
        <div className="flex items-center gap-[11px]">
          <IconBubble tone="peach">
            <MoonIcon size={16} />
          </IconBubble>
          <h2 className="m-0 flex-1 text-base/[1.3] font-semibold text-tx">
            Tanggunganmu sekarang
          </h2>
        </div>

        {owed > 0 ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-[30px]/[1] font-bold tracking-[-.03em] text-tx">
                {settled}
              </span>
              <span className="text-[13.5px]/[1] text-tx2">
                dari {owed} hari sudah lunas
              </span>
            </div>
            <ProgressBar
              value={settled}
              max={owed}
              label="Kemajuan qadha puasa"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px]/[1.5] text-tx2">
                Sisa {remaining} hari · sebelum Ramadan berikutnya
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
                disabled={remaining === 0}
                className="border-b border-rose-b text-[12.5px]/[1] font-semibold text-tx disabled:opacity-40"
              >
                Catat lunas
              </button>
            </div>
          </>
        ) : (
          <p className="m-0 text-[13px]/[1.6] text-tx2">
            Belum ada hari yang tercatat menunggu qadha.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] border border-hair bg-bg p-4 shadow-card">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
          Tambah hari yang terlewat
        </h2>
        <p className="m-0 text-[12.5px]/[1.5] text-tx2">
          Setiap kali haid membuatmu tidak puasa di bulan Ramadan, catat
          jumlah harinya di sini supaya tidak lupa sampai Ramadan berikutnya
          tiba.
        </p>

        <div className="flex items-center justify-between rounded-[14px] border border-field-b px-[13px] py-3">
          <span className="text-[13.5px]/[1] font-medium text-tx">
            {days} hari
          </span>
          <span className="flex gap-2.5 text-tx2">
            <button
              type="button"
              aria-label="Kurangi hari"
              onClick={() => {
                setDays((d) => Math.max(1, d - 1));
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
                setDays((d) => Math.min(30, d + 1));
                setSaved(false);
              }}
              className="-m-1.5 flex h-6 w-6 items-center justify-center p-1.5 transition hover:text-tx"
            >
              <PlusIcon size={15} />
            </button>
          </span>
        </div>

        <SecondaryButton
          className="h-12 text-[14.5px]"
          onClick={() => {
            update((draft) => {
              draft.qadhaFast.owed += days;
            });
            setDays(1);
            setSaved(true);
          }}
        >
          Tambahkan
        </SecondaryButton>
        {saved && (
          <p className="m-0 text-center text-[12px]/[1.5] text-tx2">
            Tersimpan. Lihat kemajuannya di atas.
          </p>
        )}
      </section>

      <p className="mt-auto pt-3 pb-5 text-center text-[12.5px]/[1.55] text-tx2">
        Dicicil pelan-pelan tidak apa, asal lunas sebelum Ramadan berikutnya
        tiba.
      </p>
    </Screen>
  );
}
