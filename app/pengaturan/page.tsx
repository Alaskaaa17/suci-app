"use client";

import Link from "next/link";
import { useState } from "react";
import { Screen } from "@/components/shell";
import {
  ChevronDownIcon,
  CloudIcon,
  DownloadIcon,
  LinkIcon,
  LockIcon,
  PinIcon,
  TargetIcon,
} from "@/components/icons";
import { PinField, PIN_LENGTH } from "@/components/pin-pad";
import {
  BackLink,
  cx,
  IconBubble,
  NavGrid,
  NavRow,
  PrimaryButton,
  RadioCard,
  SecondaryButton,
  SectionLabel,
  Segmented,
  Toggle,
} from "@/components/ui";
import { todayIso } from "@/lib/date";
import {
  MADHHAB_ORDER,
  MADHHABS,
  type MadhhabId,
} from "@/lib/fiqh/madhhab";
import {
  LOCATIONS,
  PRAYER_METHOD_ORDER,
  PRAYER_METHODS,
} from "@/lib/fiqh/prayer-times";
import type { PrayerMethodId, SpecialState } from "@/lib/fiqh/types";
import { useApp } from "@/lib/store/app-store";
import { vaultIsEncrypted } from "@/lib/store/vault";

const STATES: Array<{ value: SpecialState; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "hamil", label: "Hamil" },
  { value: "nifas", label: "Nifas" },
  { value: "menopause", label: "Menopause" },
];

export default function PengaturanPage() {
  const { data, update, today } = useApp();
  const [saved, setSaved] = useState(false);

  if (!data) return null;
  const { profile } = data;

  const flash = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const setMadhhab = async (id: MadhhabId) => {
    await update((draft) => {
      draft.profile.madhhab = id;
    });
    flash();
  };

  const setState = async (value: SpecialState) => {
    await update((draft) => {
      draft.profile.specialState = value;
      // Seed the date the new phase needs, so nothing is left half-configured.
      if (value === "nifas" && !draft.profile.nifasStart) {
        draft.profile.nifasStart = todayIso();
      }
      if (value === "hamil" && !draft.profile.pregnancyLmp) {
        draft.profile.pregnancyLmp = todayIso();
      }
    });
    flash();
  };

  return (
    <Screen tabBar={false} className="gap-3 pt-1.5">
      <BackLink href="/" label="Beranda" />

      <h1 className="t-headline m-0 text-tx">Pengaturan</h1>

      <label className="flex flex-col gap-2">
        <SectionLabel>Namamu</SectionLabel>
        <input
          value={profile.name}
          onChange={(e) =>
            update((draft) => {
              draft.profile.name = e.target.value;
            })
          }
          placeholder="Dipakai untuk menyapamu di Beranda"
          className="rounded-2xl border border-field-b bg-transparent px-[15px] py-3 text-sm text-tx placeholder:text-tx2/70"
        />
      </label>

      <div className="flex flex-col gap-2">
        <SectionLabel>Mazhab fiqih</SectionLabel>
        <p className="m-0 text-[12px]/[1.5] text-tx2">
          Mengubah ini menghitung ulang seluruh riwayatmu, termasuk status hari
          ini.
        </p>
        <div role="radiogroup" aria-label="Mazhab fiqih" className="flex flex-col gap-2">
          {MADHHAB_ORDER.map((id) => {
            const m = MADHHABS[id];
            const selected = profile.madhhab === id;
            return selected ? (
              <RadioCard
                key={id}
                selected
                onSelect={() => setMadhhab(id)}
                title={m.name}
                description={`Haid ${m.haidMinDays}–${m.haidMaxDays} hari, suci minimal ${m.minTuhrDays} hari antar siklus.`}
                badge="Terpilih"
              />
            ) : (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={false}
                onClick={() => setMadhhab(id)}
                className="flex items-center gap-3 rounded-2xl border border-hair px-[15px] py-3 text-left transition hover:border-rose-b"
              >
                <span
                  aria-hidden="true"
                  className="block h-[22px] w-[22px] shrink-0 rounded-full border-[1.5px] border-hair"
                />
                <span className="flex-1 text-[14.5px]/[1.3] font-medium text-tx">
                  {m.name}{" "}
                  <span className="text-[12.5px] font-normal text-tx2">
                    · {m.haidMinDays}–{m.haidMaxDays} hari
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Status khusus</SectionLabel>
        <Segmented
          label="Status khusus"
          value={profile.specialState}
          onChange={setState}
          options={STATES}
        />
        {profile.specialState === "nifas" && (
          <DateField
            label="Tanggal melahirkan"
            value={profile.nifasStart ?? today}
            max={today}
            onChange={(v) =>
              update((draft) => {
                draft.profile.nifasStart = v;
              })
            }
          />
        )}
        {profile.specialState === "hamil" && (
          <DateField
            label="Hari pertama haid terakhir"
            value={profile.pregnancyLmp ?? today}
            max={today}
            onChange={(v) =>
              update((draft) => {
                draft.profile.pregnancyLmp = v;
              })
            }
          />
        )}
      </div>

      <div className="flex gap-2.5">
        <div className="flex-1">
          <SectionLabel>Metode hisab</SectionLabel>
          <label className="relative mt-2 flex items-center justify-between rounded-[14px] border border-field-b px-[13px] py-3">
            <span className="sr-only">Metode hisab</span>
            <select
              value={profile.prayerMethod}
              onChange={(e) =>
                update((draft) => {
                  draft.profile.prayerMethod = e.target
                    .value as PrayerMethodId;
                })
              }
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            >
              {PRAYER_METHOD_ORDER.map((id) => (
                <option key={id} value={id}>
                  {PRAYER_METHODS[id].label}
                </option>
              ))}
            </select>
            <span className="truncate text-[13.5px]/[1] font-medium text-tx">
              {PRAYER_METHODS[profile.prayerMethod].label}
            </span>
            <ChevronDownIcon size={16} className="shrink-0 text-tx2" />
          </label>
        </div>

        <div className="flex-1">
          <SectionLabel>Lokasi</SectionLabel>
          <label className="relative mt-2 flex items-center gap-2 rounded-[14px] border border-field-b px-[13px] py-3">
            <span className="sr-only">Lokasi</span>
            <select
              value={profile.location.label}
              onChange={(e) => {
                const found = LOCATIONS.find(
                  (l) => l.label === e.target.value,
                );
                if (!found) return;
                update((draft) => {
                  draft.profile.location = { ...found };
                });
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            >
              {LOCATIONS.map((l) => (
                <option key={l.label} value={l.label}>
                  {l.label}
                </option>
              ))}
            </select>
            <span className="flex-1 truncate text-[13.5px]/[1] font-medium text-tx">
              {profile.location.label}
            </span>
            <PinIcon size={16} className="shrink-0 text-icon" />
          </label>
        </div>
      </div>

      <p
        role="status"
        className={cx(
          "m-0 text-center text-[12.5px]/[1.5] transition",
          saved ? "text-sage-tx" : "text-tx2",
        )}
      >
        {saved
          ? "Tersimpan. Perhitungan sudah diperbarui."
          : "Semua perubahan tersimpan otomatis di ponsel ini."}
      </p>

      <div className="flex flex-col gap-2">
        <SectionLabel>Keamanan</SectionLabel>
        <PinSection onSaved={flash} />
      </div>

      <NavGrid>
        <NavRow
          href="/pengaturan/suami"
          tone="rose"
          icon={<LinkIcon size={16} />}
          title="Mode Suami"
          subtitle={
            profile.share ? "Tautan aktif" : "Tidak ada tautan aktif"
          }
        />
        <NavRow
          href="/pengaturan/data-saya"
          tone="sage"
          icon={<DownloadIcon size={16} />}
          title="Data Saya"
          subtitle="Unduh atau hapus catatanmu"
        />
        <NavRow
          href="/pengaturan/kehamilan"
          tone="peach"
          icon={<TargetIcon size={16} />}
          title="Kehamilan"
          subtitle={
            profile.specialState === "hamil" ? "Aktif" : "Nonaktif"
          }
        />
      </NavGrid>

      <div className="mb-5 flex items-start gap-[11px] rounded-2xl border border-sage-b bg-sage px-[15px] py-[13px]">
        <IconBubble tone="sage" size={30} className="bg-bg text-sage-tx">
          <CloudIcon size={16} />
        </IconBubble>
        <span className="flex-1">
          <span className="block text-[13.5px]/[1.3] font-semibold text-sage-tx">
            Catatanmu tidak pernah dikirim
          </span>
          <span className="mt-0.5 block text-[11.5px]/[1.45] text-tx2">
            Semuanya dihitung dan disimpan di ponsel ini. Satu-satunya hal yang
            pernah keluar adalah status hari ini (haid atau suci), hanya kalau
            kamu menyalakan Mode Suami, dan itupun sudah terkunci sebelum
            dikirim sehingga servernya sendiri tidak bisa membacanya. Untuk
            pindah perangkat, bawa datamu lewat Data Saya.
          </span>
        </span>
      </div>

      <div className="-my-1.5 mb-3.5 flex items-center justify-center gap-4">
        <Link
          href="/kebijakan-privasi"
          // py-1.5 lifts the tap target to the 24px WCAG 2.2 minimum without
          // the footer text itself growing — same trick as BackLink.
          className="py-1.5 text-[12px]/[1.5] text-tx2 underline underline-offset-2 transition hover:text-tx"
        >
          Kebijakan Privasi
        </Link>
        <Link
          href="/hapus-data"
          className="py-1.5 text-[12px]/[1.5] text-tx2 underline underline-offset-2 transition hover:text-tx"
        >
          Hapus Data
        </Link>
      </div>
    </Screen>
  );
}

/**
 * The PIN on/off row. Onboarding's "Nanti saja" is a one-time choice; this
 * is the same choice made reversible — flip it on or off any time later.
 * Turning it on expands an inline copy of onboarding step 3's PIN entry;
 * turning it off expands a confirmation, since the honest consequence
 * ("tidak terenkripsi") is worth a deliberate second tap rather than a
 * single flick of a switch.
 */
function PinSection({ onSaved }: { onSaved: () => void }) {
  const { setPin: savePin } = useApp();
  const [hasPin, setHasPin] = useState(() => vaultIsEncrypted());
  const [mode, setMode] = useState<"view" | "enable" | "disable">("view");
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const pinsMatch = pin.length === PIN_LENGTH && pin === confirm;
  const mismatch = confirm.length === PIN_LENGTH && pin !== confirm;

  const reset = () => {
    setMode("view");
    setPinValue("");
    setConfirm("");
    setBusy(false);
  };

  const enable = async () => {
    setBusy(true);
    await savePin(pin);
    setHasPin(true);
    reset();
    onSaved();
  };

  const disable = async () => {
    setBusy(true);
    await savePin(null);
    setHasPin(false);
    reset();
    onSaved();
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-hair px-[15px] py-[13px]">
      <div className="flex items-center gap-3">
        <IconBubble tone="rose">
          <LockIcon size={16} />
        </IconBubble>
        <span className="flex-1">
          <span className="block text-[14.5px]/[1.3] font-semibold text-tx">
            Kunci dengan PIN
          </span>
          <span className="block text-[12.5px]/[1.4] text-tx2">
            {hasPin
              ? "Aktif, 6 digit"
              : "Nonaktif — catatan tersimpan tanpa enkripsi"}
          </span>
        </span>
        <Toggle
          checked={hasPin}
          onChange={(next) => setMode(next ? "enable" : "disable")}
          label="Kunci dengan PIN"
        />
      </div>

      {mode === "enable" && (
        <div className="animate-rise flex flex-col gap-[18px] border-t border-hair pt-3">
          <PinField label="PIN Baru" value={pin} onChange={setPinValue} autoFocus />
          <PinField label="Ulangi PIN" value={confirm} onChange={setConfirm} />
          {mismatch && (
            <p className="m-0 text-[12.5px]/[1.5] text-peach-tx">
              Dua PIN ini belum sama. Coba periksa lagi.
            </p>
          )}
          <div className="flex gap-2.5">
            <SecondaryButton tone="plain" onClick={reset} disabled={busy}>
              Batal
            </SecondaryButton>
            <PrimaryButton
              disabled={!pinsMatch || busy}
              onClick={enable}
            >
              {busy ? "Menyimpan…" : "Simpan"}
            </PrimaryButton>
          </div>
        </div>
      )}

      {mode === "disable" && (
        <div className="animate-rise flex flex-col gap-3 border-t border-hair pt-3">
          <p className="m-0 text-[12.5px]/[1.55] text-tx2">
            Tanpa PIN, catatanmu tetap di ponsel ini tetapi tidak terenkripsi
            — siapa pun yang memegang ponselmu bisa membukanya.
          </p>
          <div className="flex gap-2.5">
            <SecondaryButton tone="plain" onClick={reset} disabled={busy}>
              Batal
            </SecondaryButton>
            <SecondaryButton tone="peach" onClick={disable} disabled={busy}>
              {busy ? "Memproses…" : "Ya, matikan PIN"}
            </SecondaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

function DateField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: string;
  max?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-[14px] border border-field-b px-[13px] py-3">
      <span className="text-[13px] font-medium text-tx2">{label}</span>
      <input
        type="date"
        value={value}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="bg-transparent text-[13.5px] font-medium text-tx"
      />
    </label>
  );
}
