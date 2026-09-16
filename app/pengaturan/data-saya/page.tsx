"use client";

import { useRef, useState } from "react";
import { Screen } from "@/components/shell";
import { DownloadIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { BackLink, cx, IconBubble } from "@/components/ui";
import { Classification } from "@/lib/fiqh/types";
import { useApp } from "@/lib/store/app-store";
import {
  approximateSize,
  exportFilename,
  parseImportedVault,
  toExportJson,
  type VaultData,
} from "@/lib/store/vault";

const CONFIRM_WORD = "HAPUS";
const RESTORE_WORD = "PULIHKAN";

export default function DataSayaPage() {
  const { data, analysis, eraseEverything, restoreVault } = useApp();
  const [confirm, setConfirm] = useState("");

  const [picked, setPicked] = useState<VaultData | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [restored, setRestored] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!data) return null;

  const entryCount = Object.keys(data.entries).length;
  const cycleCount =
    analysis?.episodes.filter((e) => e.kind === Classification.HAID).length ?? 0;
  const qadhaCount = data.qadhaPrayers.length;
  const armed = confirm === CONFIRM_WORD;

  const download = () => {
    const blob = new Blob([toExportJson(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename();
    a.click();
    URL.revokeObjectURL(url);
  };

  const armedRestore = picked !== null && restoreConfirm === RESTORE_WORD;

  const pickBackup = async (file: File) => {
    setPickError(null);
    setRestored(false);
    const text = await file.text();
    const result = parseImportedVault(text);
    if (!result.ok) {
      setPicked(null);
      setPickError(
        result.reason === "unreadable"
          ? "Berkas ini bukan JSON yang sah."
          : "Berkas ini bukan cadangan Suci, atau bentuknya sudah berubah.",
      );
      return;
    }
    setPicked(result.data);
  };

  const runRestore = async () => {
    if (!picked) return;
    setRestoring(true);
    await restoreVault(picked);
    setRestoring(false);
    setPicked(null);
    setRestoreConfirm("");
    setRestored(true);
  };

  return (
    <Screen tabBar={false} className="pt-1.5">
      <BackLink href="/pengaturan" label="Pengaturan" />

      <div>
        <h1 className="t-headline m-0 text-tx">Data Saya</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          Catatanmu tersimpan di ponsel ini. Kamu bisa membawanya pergi atau
          menghapusnya kapan saja.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-[20px] border border-sage-b bg-sage p-[17px] shadow-card">
        <div className="flex items-center gap-[11px]">
          <IconBubble tone="sage" className="bg-bg text-sage-tx">
            <DownloadIcon size={17} />
          </IconBubble>
          <span className="flex-1">
            <span className="block text-[15.5px]/[1.3] font-semibold text-sage-tx">
              Unduh data
            </span>
            <span className="block text-[12.5px]/[1.4] text-tx2">
              {entryCount} catatan · {approximateSize(data)}
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={download}
          className="rounded-full border border-sage-b bg-bg py-[11px] text-center text-[13px]/[1] font-semibold text-sage-tx transition hover:brightness-95"
        >
          Berkas JSON
        </button>
        <p className="m-0 text-[11.5px]/[1.5] text-tx2">
          Berkasnya terbuka dan bisa dibaca siapa pun yang memegangnya. Simpan
          di tempat yang aman.
        </p>
      </section>

      <section className="flex flex-col gap-[11px] rounded-[20px] border border-hair p-[17px]">
        <h2 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
          Isi datamu
        </h2>
        {[
          ["Catatan harian", entryCount],
          ["Siklus tercatat", cycleCount],
          ["Catatan qadha", qadhaCount],
        ].map(([label, value], i, arr) => (
          <div
            key={String(label)}
            className={cx(
              "flex justify-between text-[13px]/[1.5] text-tx2",
              i < arr.length - 1 && "border-b border-hair pb-2",
            )}
          >
            <span>{label}</span>
            <span className="font-semibold text-tx">{value}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] border border-rose-b bg-rose p-[17px]">
        <div className="flex items-center gap-[11px]">
          <IconBubble tone="rose" className="bg-bg text-icon">
            <UploadIcon size={17} />
          </IconBubble>
          <span className="flex-1">
            <span className="block text-[15.5px]/[1.3] font-semibold text-tx">
              Pulihkan dari berkas
            </span>
            <span className="block text-[12.5px]/[1.4] text-tx2">
              Timpa catatan di ponsel ini dengan berkas JSON yang pernah
              diunduh.
            </span>
          </span>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void pickBackup(file);
          }}
        />

        {!picked ? (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="rounded-full border border-rose-b bg-bg py-[11px] text-center text-[13px]/[1] font-semibold text-tx transition hover:brightness-95"
          >
            Pilih berkas cadangan
          </button>
        ) : (
          <>
            <p className="m-0 text-[12.5px]/[1.5] text-tx2">
              Berkas untuk{" "}
              <span className="font-semibold text-tx">
                {picked.profile.name || "kamu"}
              </span>{" "}
              — {Object.keys(picked.entries).length} catatan harian. Ini akan{" "}
              <span className="font-semibold text-tx">menggantikan</span> data
              yang sedang aktif di ponsel ini.
            </p>
            <div className="flex flex-col gap-[7px] rounded-[14px] border border-rose-b bg-bg px-3.5 py-3">
              <label className="text-[11.5px]/[1.4] font-medium text-tx2">
                Ketik{" "}
                <span className="font-bold text-tx">{RESTORE_WORD}</span>{" "}
                untuk memastikan.
                <input
                  value={restoreConfirm}
                  onChange={(e) =>
                    setRestoreConfirm(e.target.value.toUpperCase())
                  }
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-[10px] border border-rose-b bg-transparent px-3 py-2.5 text-sm font-semibold tracking-wide text-tx"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPicked(null);
                  setRestoreConfirm("");
                }}
                className="flex-1 rounded-full border border-rose-b bg-bg py-[11px] text-center text-[13px]/[1] font-semibold text-tx2 transition hover:text-tx"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!armedRestore || restoring}
                onClick={runRestore}
                className={cx(
                  "flex-1 rounded-full border border-rose-b py-[11px] text-center text-[13px]/[1] font-semibold text-tx transition",
                  armedRestore && !restoring
                    ? "bg-bg hover:brightness-95"
                    : "cursor-not-allowed bg-transparent opacity-55",
                )}
              >
                {restoring ? "Memulihkan…" : "Pulihkan sekarang"}
              </button>
            </div>
          </>
        )}

        {pickError && (
          <p className="m-0 text-[11.5px]/[1.5] text-peach-tx">{pickError}</p>
        )}
        {restored && (
          <p className="m-0 text-[11.5px]/[1.5] text-sage-tx">
            Data berhasil dipulihkan.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] border border-peach-b bg-peach p-[17px]">
        <div className="flex items-center gap-[11px]">
          <IconBubble tone="peach" className="bg-bg text-peach-tx">
            <TrashIcon size={17} />
          </IconBubble>
          <span className="flex-1">
            <span className="block text-[15.5px]/[1.3] font-semibold text-peach-tx">
              Hapus semua data
            </span>
            <span className="block text-[12.5px]/[1.4] text-tx2">
              Tidak bisa dibatalkan.
            </span>
          </span>
        </div>

        <div className="flex flex-col gap-[7px] rounded-[14px] border border-peach-b bg-bg px-3.5 py-3">
          <label className="text-[11.5px]/[1.4] font-medium text-tx2">
            Ketik{" "}
            <span className="font-bold text-peach-tx">{CONFIRM_WORD}</span>{" "}
            untuk memastikan ini memang keinginanmu.
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.toUpperCase())}
              autoComplete="off"
              className="mt-1.5 w-full rounded-[10px] border border-peach-b bg-transparent px-3 py-2.5 text-sm font-semibold tracking-wide text-tx"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={!armed}
          onClick={eraseEverything}
          className={cx(
            "h-12 rounded-full border border-peach-b text-[14.5px] font-semibold text-peach-tx transition",
            armed
              ? "bg-bg hover:brightness-95"
              : "cursor-not-allowed bg-transparent opacity-55",
          )}
        >
          Hapus data saya
        </button>

        <p className="m-0 text-center text-[11.5px]/[1.5] text-tx2">
          {armed
            ? "Tombol aktif. Sekali ditekan, catatanmu hilang seluruhnya."
            : "Tombol aktif setelah kata terisi lengkap."}
        </p>
      </section>
    </Screen>
  );
}
