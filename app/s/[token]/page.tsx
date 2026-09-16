"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CrescentIcon, PinIcon, RefreshIcon } from "@/components/icons";
import { Screen } from "@/components/shell";
import { StatusGlyph } from "@/components/status-glyph";
import { cx, IconBubble, Pill } from "@/components/ui";
import { Classification } from "@/lib/fiqh/types";
import {
  fetchSharedStatus,
  forgetShareKeys,
  keyFromFragment,
  recallShareKey,
  rememberShareKey,
  type SharePageResult,
} from "@/lib/store/share-client";

const EXPLANATIONS: Record<
  Exclude<SharePageResult["status"], "ok">,
  { title: string; body: string }
> = {
  gone: {
    title: "Tautan ini tidak berlaku",
    body: "Sudah diganti atau dimatikan oleh pemiliknya. Mintalah tautan yang baru.",
  },
  unavailable: {
    title: "Belum bisa menampilkan status",
    body: "Layanannya sedang belum siap menyimpan status, jadi tautan ini belum bisa dibaca. Tautannya sendiri tidak salah dan tidak dimatikan — coba lagi nanti.",
  },
  offline: {
    title: "Belum bisa memuat",
    body: "Sambungan internet sedang tidak bisa dipakai. Coba lagi sebentar lagi.",
  },
  "no-key": {
    title: "Tautannya belum lengkap",
    body: "Bagian kunci di akhir tautan hilang — biasanya karena tersalin setengah. Minta tautan utuhnya dikirim ulang, lalu buka sekali dari situ.",
  },
  "wrong-key": {
    title: "Kunci ini tidak cocok",
    body: "Isinya ada, tapi tidak bisa dibuka dengan kunci di tautan ini. Kemungkinan pemiliknya sudah mengganti tautan. Minta yang terbaru.",
  },
  unreadable: {
    title: "Versinya berbeda",
    body: "Isinya terbuka, tapi bentuknya dari versi Suci yang lebih baru. Muat ulang halaman ini, atau minta tautan yang baru.",
  },
};

/**
 * Screen 22 — the page a husband opens.
 *
 * Everything that matters here happens on this device. The shareId in the path
 * fetches a sealed envelope; the key comes from the URL fragment, which no
 * browser transmits; the decryption happens in this component. The server that
 * handed over the ciphertext has no way to know what it said.
 *
 * The page never touches the vault — it has no business opening it, and on
 * someone else's phone there is nothing to open.
 */
export default function SharedStatusPage() {
  const params = useParams<{ token: string }>();
  const id = params.token;

  const [result, setResult] = useState<SharePageResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const load = useCallback(async () => {
    // The fragment first, because it is the freshest thing the reader has;
    // then the remembered copy, for the second visit where a bookmark or a
    // history entry dropped everything after the `#`.
    const fromLink = keyFromFragment();
    if (fromLink) rememberShareKey(id, fromLink);
    const key = fromLink ?? recallShareKey(id);
    return fetchSharedStatus(id, key);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void load().then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    const next = await load();
    setResult(next);
    setRefreshing(false);
  };

  if (result === null) {
    return (
      <Screen tabBar={false} className="items-center justify-center gap-5 px-7">
        <Brand />
        <div className="h-[220px] w-full animate-pulse rounded-3xl border border-hair bg-rose/40" />
      </Screen>
    );
  }

  if (result.status !== "ok") {
    // Six different things went wrong and they are not each other's fault.
    // Only one of them is the owner's doing, so only one of them says so.
    const message = EXPLANATIONS[result.status];
    return (
      <Screen tabBar={false} className="items-center justify-center gap-5 px-7">
        <Brand />
        <div className="animate-rise w-full rounded-3xl border border-hair bg-bg px-6 py-8 text-center shadow-card">
          <h1 className="m-0 text-lg/[1.3] font-semibold text-tx">
            {message.title}
          </h1>
          <p className="mt-2.5 mb-0 text-[13px]/[1.6] text-balance text-tx2">
            {message.body}
          </p>
          {result.status !== "gone" && (
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="mt-5 min-h-[44px] rounded-full border border-rose-b bg-rose px-6 text-[13px]/[1] font-semibold text-tx transition active:scale-[.97] hover:brightness-95 disabled:opacity-50"
            >
              {refreshing ? "Memuat…" : "Coba lagi"}
            </button>
          )}
        </div>
      </Screen>
    );
  }

  const haid = result.payload.state === "haid";

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

        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className={cx(
            "mt-1 inline-flex min-h-[44px] items-center gap-2 rounded-full border bg-bg px-5 text-[13px]/[1] font-semibold transition active:scale-[.97] hover:brightness-95 disabled:opacity-50",
            haid ? "border-rose-b text-tx" : "border-sage-b text-sage-tx",
          )}
        >
          <RefreshIcon size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Memuat…" : "Segarkan"}
        </button>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <div className="flex items-center gap-[11px] rounded-2xl border border-hair px-[15px] py-3.5">
          <IconBubble tone="sage" size={30}>
            <PinIcon size={15} />
          </IconBubble>
          <span className="text-[12.5px]/[1.5] text-tx2">
            Halaman ini hanya menampilkan status hari ini. Tidak ada tanggal,
            catatan, atau riwayat. Isinya terkunci — server yang meneruskannya
            pun tidak bisa membacanya.
          </span>
        </div>

        <p className="m-0 text-center text-[12px]/[1.5] text-tx2">
          Tidak berubah sendiri. Ketuk Segarkan untuk memeriksa lagi.
        </p>

        <button
          type="button"
          onClick={() => {
            forgetShareKeys();
            setCleared(true);
          }}
          className="min-h-[44px] rounded-full border border-hair px-4 text-[12px]/[1] font-medium text-tx2 transition hover:border-rose-b hover:text-tx"
        >
          {cleared
            ? "Kunci dihapus dari perangkat ini"
            : "Lupakan tautan ini di perangkat ini"}
        </button>
        <p className="m-0 text-center text-[11.5px]/[1.5] text-tx2">
          Supaya bisa dibuka lagi tanpa tautan penuh, kuncinya disimpan di
          peramban ini. Menutup tab tidak menghapusnya — tombol di atas yang
          menghapusnya.
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
