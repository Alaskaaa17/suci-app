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
import {
  generateShareId,
  generateShareKey,
  generateShareSecret,
} from "@/lib/store/crypto";
import {
  fetchShareStorage,
  publishShare,
  revokeShare,
  shareUrl,
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
  const share = data.profile.share;
  // The link exists locally the instant the toggle is pressed, but the server
  // has not necessarily seen it yet — publishShare is a real network round
  // trip. Until it confirms, "Nyala" would be a promise the app cannot keep:
  // a reader opening the link in that window gets "not found" for a link the
  // owner just created correctly.
  const confirmed = Boolean(share?.lastPublishedAt);

  // The key sits after the `#`, which is what keeps it off the wire. Building
  // this string is the only place it is ever concatenated into a URL, and it
  // must never move ahead of the fragment marker.
  const url =
    share && typeof window !== "undefined"
      ? shareUrl(window.location.origin, share.id, share.key)
      : null;

  const currentState =
    verdict &&
    (verdict.classification === Classification.HAID ||
      verdict.classification === Classification.NIFAS)
      ? "haid"
      : "suci";

  /**
   * A whole new session: new id, new key, new write secret, none of them
   * derived from anything the previous link used or from her PIN. Rotating
   * therefore does not merely rename the old link — it makes the old key
   * useless against the new ciphertext.
   */
  const startSession = async () => {
    const next = {
      id: generateShareId(),
      key: await generateShareKey(),
      secret: generateShareSecret(),
    };
    const publishedAt = new Date().toISOString();
    await update((draft) => {
      draft.profile.share = { ...next };
    });
    const published = await publishShare(next, {
      v: 1,
      state: currentState,
      updatedAt: publishedAt,
    });
    if (published.storage !== "unknown") setStorage(published.storage);
    if (published.ok) {
      await update((draft) => {
        if (draft.profile.share?.id !== next.id) return;
        draft.profile.share.lastState = currentState;
        draft.profile.share.lastPublishedAt = publishedAt;
      });
    }
  };

  const enable = async () => {
    setBusy("on");
    await startSession();
    setBusy(null);
  };

  const rotate = async () => {
    setBusy("rotate");
    // Revoke first, so the old URL stops resolving even if the new one fails
    // to publish. A link that outlives its replacement is the failure that
    // matters here.
    if (share) await revokeShare(share);
    await startSession();
    setBusy(null);
  };

  const disable = async () => {
    setBusy("off");
    if (share) await revokeShare(share);
    await update((draft) => {
      delete draft.profile.share;
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

  const sendToApp = async () => {
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
              tetap, jadi tautan yang kamu bagikan akan terbuka kosong di
              ponselnya. Catatanmu sendiri tetap aman di ponsel ini.
            </span>
            {/*
              The person reading this is the person who deployed the app, so
              the fix belongs here rather than in a README they would have to
              go looking for. Vague advice on a screen like this is how the
              last three days were spent.
            */}
            <span className="mt-2 block text-[11.5px]/[1.5] text-tx2">
              Yang perlu dilakukan sekali: sambungkan penyimpanan di Vercel
              (Storage → Upstash Redis, atau Edge Config), isi variabel
              lingkungannya, lalu Redeploy. Kalau sudah, buka{" "}
              <code className="font-semibold text-tx">/api/share</code> — ia
              harus menjawab{" "}
              <code className="font-semibold text-tx">durable: true</code>.
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

      {share ? (
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
                    : confirmed
                      ? "animate-pulse bg-icon"
                      : "bg-tx2",
                )}
              />
              {storage === "memory"
                ? "Belum aktif"
                : confirmed
                  ? "Nyala"
                  : "Menyimpan…"}
            </span>
          </div>

          <code
            id="tautan-aktif"
            aria-label="Tautan berbagi"
            className="rounded-[14px] border border-rose-b bg-bg px-3.5 py-3 text-[12.5px]/[1.5] font-medium break-all text-tx2"
          >
            {url ?? `…/s/${share.id}`}
          </code>

          <p className="m-0 text-[12px]/[1.5] text-tx2">
            {confirmed ? (
              <>
                Sekarang dia melihat{" "}
                <span className="font-semibold text-tx">
                  {currentState === "haid" ? "haid" : "suci"}
                </span>
                . Berubah sendiri begitu statusmu berubah.
              </>
            ) : (
              "Tautannya baru dibuat dan belum sampai ke server. Tunggu sebentar sebelum membagikannya — kalau dibuka terlalu cepat, halamannya masih kosong."
            )}
          </p>

          <div className="flex gap-2">
            <ShareAction onClick={copy} active={copied} disabled={!confirmed}>
              {copied ? "Tersalin" : "Salin"}
            </ShareAction>
            <ShareAction onClick={sendToApp} disabled={!confirmed}>
              Bagikan
            </ShareAction>
            <ShareAction onClick={rotate} disabled={busy !== null || !confirmed}>
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
          Statusmu dikunci dulu di ponsel ini sebelum dikirim. Yang sampai ke
          server cuma tulisan acak yang <span className="font-semibold text-tx">tidak
          bisa dibacanya</span> — kuncinya ada di bagian tautan setelah tanda{" "}
          <code className="font-semibold text-tx">#</code>, dan bagian itu tidak
          pernah dikirim peramban ke server mana pun. Yang bisa membukanya hanya
          orang yang kamu beri tautannya.
        </p>
        <p className="mt-2 mb-0 text-[12px]/[1.55] text-tx2">
          Tautannya berhenti sendiri setelah dua minggu tanpa pembaruan, supaya
          status lama tidak menggantung kalau kamu berhenti memakai Suci.
        </p>
      </section>

      {/*
        Honesty about where the encryption stops. Written out rather than
        summarised as "aman", because the metadata point below is the one a
        cycle tracker cannot wave away, and a user who is choosing whether to
        share deserves it in plain language before she decides.
      */}
      <section className="rounded-2xl border border-stone-b bg-stone-card px-[15px] py-3.5">
        <h3 className="m-0 text-[13px]/[1.3] font-semibold text-stone-tx">
          Yang tetap tidak tersembunyi
        </h3>
        <ul className="mt-2 mb-0 flex list-none flex-col gap-2 p-0">
          {[
            "Isinya terkunci, tapi waktu setiap pembaruan tercatat di server. Pola kapan dan seberapa sering statusmu berubah masih bisa terlihat oleh penyedia servernya — dan pola itu sendiri menggambarkan siklus. Enkripsi tidak menutupi hal ini.",
            "Siapa pun yang memegang tautan utuhnya bisa membaca statusmu, termasuk kalau tautan itu diteruskan ke orang lain. Yang menjaganya adalah kerahasiaan tautan itu, bukan kata sandi atau akun.",
            "Mengubah atau menghapus statusmu tidak bisa dilakukan hanya dengan memegang tautan — itu perlu kunci tulis yang tidak pernah keluar dari ponsel ini.",
            "Di ponsel penerima, kuncinya ikut tersimpan supaya tautannya bisa dibuka lagi. Halaman itu menyediakan tombol untuk menghapusnya.",
          ].map((line) => (
            <li
              key={line}
              className="flex gap-2 text-[11.5px]/[1.55] text-stone-tx2"
            >
              <span aria-hidden="true" className="text-stone-tx">
                ·
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-auto pt-3 pb-5">
        {share ? (
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
