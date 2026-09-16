"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CrescentIcon, PinIcon } from "@/components/icons";
import { Screen } from "@/components/shell";
import { StatusGlyph } from "@/components/status-glyph";
import { cx, IconBubble, Pill } from "@/components/ui";
import { Classification } from "@/lib/fiqh/types";
import {
  fetchSharedStatus,
  type SharePageResult,
} from "@/lib/store/share-client";

/**
 * Screen 22 — the page a husband opens.
 *
 * Reads one bit from the share endpoint and renders it. There is no route back
 * into the app from here, nothing is stored locally by the reader, and the
 * page never touches the vault — it has no business opening it, and on
 * someone else's phone there is nothing to open.
 */
export default function SharedStatusPage() {
  const params = useParams<{ token: string }>();
  const [result, setResult] = useState<SharePageResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSharedStatus(params.token).then((r) => {
      if (!cancelled) setResult(r);
    });

    // Someone leaves this page open; refresh when they come back to it rather
    // than showing yesterday's answer.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void fetchSharedStatus(params.token).then((r) => {
        if (!cancelled) setResult(r);
      });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [params.token]);

  if (result === null) {
    return (
      <Screen tabBar={false} className="items-center justify-center gap-5 px-7">
        <Brand />
        <div className="h-[220px] w-full animate-pulse rounded-3xl border border-hair bg-rose/40" />
      </Screen>
    );
  }

  if (result.status !== "ok") {
    return (
      <Screen tabBar={false} className="items-center justify-center gap-5 px-7">
        <Brand />
        <div className="animate-rise w-full rounded-3xl border border-hair bg-bg px-6 py-8 text-center shadow-card">
          <h1 className="m-0 text-lg/[1.3] font-semibold text-tx">
            {result.status === "gone"
              ? "Tautan ini tidak berlaku"
              : "Belum bisa memuat"}
          </h1>
          <p className="mt-2.5 mb-0 text-[13px]/[1.6] text-tx2">
            {result.status === "gone"
              ? "Mungkin sudah diganti atau dimatikan oleh pemiliknya. Mintalah tautan yang baru."
              : "Sambungan internet sedang tidak bisa dipakai. Coba lagi sebentar lagi."}
          </p>
        </div>
      </Screen>
    );
  }

  const haid = result.state === "haid";

  return (
    <Screen
      tabBar={false}
      className="items-center justify-center gap-[22px] px-7"
    >
      <Brand />

      <div
        className={cx(
          "animate-rise flex w-full flex-col items-center gap-4 rounded-3xl border px-6 py-[30px] text-center shadow-card",
          haid ? "border-rose-b bg-rose" : "border-sage-b bg-sage",
        )}
      >
        <Pill
          tone={haid ? "rose" : "sage"}
          glyph={
            <StatusGlyph
              status={haid ? Classification.HAID : Classification.SUCI}
              size={8}
            />
          }
        >
          {haid ? "Haid" : "Suci"}
        </Pill>

        <h1
          className={cx(
            "m-0 text-[30px]/[1.2] font-bold tracking-[-.025em]",
            haid ? "text-tx" : "text-sage-tx",
          )}
        >
          Hari ini dia
          <br />
          sedang {haid ? "haid" : "suci"}
        </h1>

        <p className="m-0 max-w-[270px] text-[14.5px]/[1.6] text-balance text-tx2">
          {haid
            ? "Shalat dan puasanya sedang libur. Doakan dan temani saja — itu sudah banyak artinya."
            : "Shalat dan puasanya berjalan seperti biasa. Doakan dan temani saja — itu sudah banyak artinya."}
        </p>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <div className="flex items-center gap-[11px] rounded-2xl border border-hair px-[15px] py-3.5">
          <IconBubble tone="sage" size={30}>
            <PinIcon size={15} />
          </IconBubble>
          <span className="text-[12.5px]/[1.5] text-tx2">
            Halaman ini hanya menampilkan status hari ini. Tidak ada tanggal,
            catatan, atau riwayat.
          </span>
        </div>
        <p className="m-0 text-center text-[12px]/[1.5] text-tx2">
          {result.source === "device"
            ? "Sedang offline · menampilkan salinan di perangkat ini"
            : "Diperbarui otomatis · dibagikan olehnya"}
        </p>
      </div>
    </Screen>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-xl border border-rose-b bg-rose text-icon">
        <CrescentIcon size={16} strokeWidth={1.6} />
      </span>
      <span className="text-[17px]/[1] font-bold tracking-[-.02em] text-tx">
        Suci
      </span>
    </div>
  );
}
