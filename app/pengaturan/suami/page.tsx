"use client";

import { useEffect, useState } from "react";
import { Screen } from "@/components/shell";
import {
  CheckIcon,
  CloseIcon,
  InfoDotIcon,
  WarningIcon,
} from "@/components/icons";
import {
  Advisory,
  BackLink,
  cx,
  IconBubble,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui";
import { generateShareToken } from "@/lib/store/crypto";
import {
  fetchShareStorage,
  generateShareSecret,
  publishShare,
  revokeShare,
  type ShareStorage,
} from "@/lib/store/share-client";
import { Classification } from "@/lib/fiqh/types";
import { useApp } from "@/lib/store/app-store";

const SHARED = ["Status hari ini: haid atau suci"];
const NOT_SHARED = [
  "Tanggal, gejala, catatan pribadi, prediksi",
  "Riwayat siklus dan data kesehatan",
];

export default function ModeSuamiPage() {
  const { data, update, verdict } = useApp();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<null | "on" | "off" | "rotate">(null);
  const [storage, setStorage] = useState<ShareStorage | null>(null);

  // Ask before promising. A link this deployment cannot keep is worse than no
  // link: she hands it over, he opens it, and it tells him it is not valid.
  useEffect(() => {
    let cancelled = false;
    void fetchShareStorage().then((s) => {
      if (!cancelled) setStorage(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;
  const token = data.profile.shareToken;
  const secret = data.profile.shareSecret;

  const url =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/s/${token}`
      : null;

  const currentState =
    verdict &&
    (verdict.classification === Classification.HAID ||
      verdict.classification === Classification.NIFAS)
      ? "haid"
      : "suci";

  const enable = async () => {
    setBusy("on");
    const next = { token: generateShareToken(), secret: generateShareSecret() };
    await update((draft) => {
      draft.profile.shareToken = next.token;
      draft.profile.shareSecret = next.secret;
    });
    const published = await publishShare(next, currentState);
    if (published.storage !== "unknown") setStorage(published.storage);
    setBusy(null);
  };

  const rotate = async () => {
    setBusy("rotate");
    // Revoke first, so the old URL stops resolving even if the new one fails
    // to publish. A link that outlives its replacement is the failure that
    // matters here.
    if (token && secret) await revokeShare({ token, secret });
    const next = { token: generateShareToken(), secret: generateShareSecret() };
    await update((draft) => {
      draft.profile.shareToken = next.token;
      draft.profile.shareSecret = next.secret;
    });
    const published = await publishShare(next, currentState);
    if (published.storage !== "unknown") setStorage(published.storage);
    setBusy(null);
  };

  const disable = async () => {
    setBusy("off");
    if (token && secret) await revokeShare({ token, secret });
    await update((draft) => {
      delete draft.profile.shareToken;
      delete draft.profile.shareSecret;
    });
    setBusy(null);
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the link is visible above to copy by hand.
    }
  };

  const share = async () => {
    if (!url) return;
    try {
      await navigator.share({
        title: "Suci",
        text: "Status hari ini",
        url,
      });
    } catch {
      // Cancelled, or the browser has no share sheet — Salin still works.
    }
  };

  return (
    <Screen tabBar={false} className="pt-1.5">
      <BackLink href="/pengaturan" label="Pengaturan" />

      <div>
        <h1 className="t-headline m-0 text-tx">Mode Suami</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          Bagikan satu hal saja: apakah hari ini kamu sedang haid atau suci.
          Tidak lebih.
        </p>
      </div>

      {storage === "memory" && (
        <section className="animate-rise flex items-start gap-[11px] rounded-[20px] border border-peach-b bg-peach px-[15px] py-[13px]">
          <IconBubble tone="peach" size={30} className="bg-bg">
            <WarningIcon size={15} />
          </IconBubble>
          <span className="flex-1">
            <span className="block text-[13.5px]/[1.3] font-semibold text-tx">
              Tautan belum bisa diandalkan
            </span>
            <span className="mt-1 block text-[12px]/[1.5] text-tx2">
              Server tempat Suci dipasang belum punya penyimpanan status yang
              tetap, jadi tautan yang kamu bagikan bisa terbuka kosong di
              ponselnya. Catatanmu sendiri tetap aman di ponsel ini. Penyimpanan
              itu perlu disambungkan dulu, lalu aplikasinya dipasang ulang.
            </span>
          </span>
        </section>
      )}

      <section className="flex flex-col gap-[11px] rounded-[20px] border border-hair p-[17px] shadow-card">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
          Yang dia lihat
        </h2>
        {SHARED.map((s) => (
          <div key={s} className="flex items-center gap-2.5">
            <IconBubble tone="sage" size={26}>
              <CheckIcon size={14} strokeWidth={2.4} />
            </IconBubble>
            <span className="text-[13px]/[1.5] text-tx2">{s}</span>
          </div>
        ))}
        {NOT_SHARED.map((s) => (
          <div key={s} className="flex items-center gap-2.5">
            <IconBubble tone="rose" size={26}>
              <CloseIcon size={14} />
            </IconBubble>
            <span className="text-[13px]/[1.5] text-tx2">{s}</span>
          </div>
        ))}
      </section>

      {token ? (
        <section className="animate-rise flex flex-col gap-3 rounded-[20px] border border-rose-b bg-rose p-[17px]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="m-0 text-[15px]/[1.3] font-semibold text-tx">
              Tautan aktif
            </h2>
            <span
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full border bg-bg px-[11px] py-[5px] text-[11px]/[1] font-semibold tracking-[.06em] uppercase",
                storage === "memory"
                  ? "border-peach-b text-peach-tx"
                  : "border-rose-b text-tx",
              )}
            >
              <span
                aria-hidden="true"
                className={cx(
                  "block h-[7px] w-[7px] rounded-full",
                  storage === "memory"
                    ? "bg-peach-tx"
                    : "animate-pulse bg-icon",
                )}
              />
              {storage === "memory" ? "Belum aktif" : "Nyala"}
            </span>
          </div>

          <code className="rounded-[14px] border border-rose-b bg-bg px-3.5 py-3 text-[12.5px]/[1.5] font-medium break-all text-tx2">
            {url ?? `…/s/${token}`}
          </code>

          <p className="m-0 text-[12px]/[1.5] text-tx2">
            Sekarang dia melihat{" "}
            <span className="font-semibold text-tx">
              {currentState === "haid" ? "haid" : "suci"}
            </span>
            . Berubah sendiri begitu statusmu berubah.
          </p>

          <div className="flex gap-2">
            <ShareAction onClick={copy} active={copied}>
              {copied ? "Tersalin" : "Salin"}
            </ShareAction>
            <ShareAction onClick={share}>Bagikan</ShareAction>
            <ShareAction onClick={rotate} disabled={busy !== null}>
              {busy === "rotate" ? "Mengganti…" : "Ganti"}
            </ShareAction>
          </div>
        </section>
      ) : (
        <section className="rounded-[20px] border border-hair p-[17px]">
          <p className="m-0 text-[13px]/[1.6] text-tx2">
            Belum ada tautan. Menyalakannya membuat satu alamat acak yang hanya
            menampilkan status hari ini.
          </p>
        </section>
      )}

      <Advisory icon={<InfoDotIcon size={15} />}>
        Berbagi ini pilihanmu sendiri. Matikan kapan saja, dan tautan lama
        langsung tidak berlaku.
      </Advisory>

      <section className="rounded-2xl border border-hair px-[15px] py-3.5">
        <h3 className="m-0 text-[13px]/[1.3] font-semibold text-tx">
          Yang tersimpan di server
        </h3>
        <p className="mt-1.5 mb-0 text-[12px]/[1.55] text-tx2">
          Hanya satu hal: kode acak di tautan itu, dan satu kata — haid atau
          suci. Tidak ada tanggal, catatan, riwayat, atau namamu. Catatan
          harianmu tetap tidak pernah meninggalkan ponsel ini.
        </p>
        <p className="mt-2 mb-0 text-[12px]/[1.55] text-tx2">
          Tautannya berhenti sendiri setelah seminggu tanpa pembaruan, supaya
          status lama tidak menggantung kalau kamu berhenti memakai Suci.
        </p>
      </section>

      <div className="mt-auto pt-3 pb-5">
        {token ? (
          <SecondaryButton onClick={disable} disabled={busy !== null}>
            {busy === "off" ? "Mematikan…" : "Matikan Mode Suami"}
          </SecondaryButton>
        ) : (
          <PrimaryButton
            className="h-[52px] text-[15px]"
            onClick={enable}
            disabled={busy !== null}
          >
            {busy === "on" ? "Menyalakan…" : "Nyalakan Mode Suami"}
          </PrimaryButton>
        )}
      </div>
    </Screen>
  );
}

function ShareAction({
  onClick,
  children,
  active,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "flex-1 rounded-full border border-rose-b bg-bg py-[11px] text-center text-[13px]/[1] font-semibold text-tx",
        "transition active:scale-[.97] disabled:opacity-50",
        active ? "bg-sage text-sage-tx" : "hover:brightness-95",
      )}
    >
      {children}
    </button>
  );
}
