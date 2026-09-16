"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PinBoxes, PIN_LENGTH } from "@/components/pin-pad";
import { Screen } from "@/components/shell";
import {
  BookIcon,
  CrescentIcon,
  InfoIcon,
  LockIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import {
  CheckBox,
  cx,
  IconBubble,
  PrimaryButton,
  RadioCard,
  SecondaryButton,
} from "@/components/ui";
import { MADHHAB_ORDER, MADHHABS, DEFAULT_MADHHAB } from "@/lib/fiqh/madhhab";
import type { MadhhabId } from "@/lib/fiqh/madhhab";
import { useApp } from "@/lib/store/app-store";
import { isCryptoAvailable } from "@/lib/store/crypto";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding } = useApp();

  const [step, setStep] = useState<Step>(1);
  const [consented, setConsented] = useState(false);
  const [name, setName] = useState("");
  const [madhhab, setMadhhab] = useState<MadhhabId>(DEFAULT_MADHHAB);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function finish(withPin: string | null) {
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding({ name: name.trim(), madhhab, pin: withPin });
      router.replace("/");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gagal menyimpan. Coba lagi, ya.",
      );
      setBusy(false);
    }
  }

  if (step === 1) {
    return (
      <Screen tabBar={false} className="gap-[18px] pt-7">
        <div className="flex flex-col items-center gap-3.5 pt-3">
          <div className="flex h-[76px] w-[76px] items-center justify-center rounded-[26px] border border-rose-b bg-rose text-icon">
            <CrescentIcon size={38} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <div className="text-[34px]/[1.1] font-bold tracking-[-.03em] text-tx">
              Suci
            </div>
            <div className="mx-auto mt-1.5 max-w-[280px] text-[14.5px]/[1.55] text-tx2">
              Menemanimu memahami siklus dan ibadahmu, dengan tenang.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-[13px] rounded-[20px] border border-rose-b bg-rose px-4 py-[15px] shadow-card">
            <IconBubble tone="rose" className="bg-bg text-icon">
              <BookIcon size={17} />
            </IconBubble>
            <div>
              <div className="text-[15px]/[1.35] font-semibold text-tx">
                Rujukan, bukan fatwa
              </div>
              <div className="mt-0.5 text-[13px]/[1.55] text-tx2">
                Setiap kesimpulan disertai jejak dalil dan nama kitabnya. Untuk
                kasus rumit, tetap tanyakan pada ulama.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-[13px] rounded-[20px] border border-sage-b bg-sage px-4 py-[15px] shadow-card">
            <IconBubble tone="sage" className="bg-bg text-sage-tx">
              <ShieldCheckIcon size={17} />
            </IconBubble>
            <div>
              <div className="text-[15px]/[1.35] font-semibold text-sage-tx">
                Catatanmu milikmu
              </div>
              <div className="mt-0.5 text-[13px]/[1.55] text-tx2">
                Tersimpan di ponselmu dan terkunci PIN. Tidak ada satu pun
                catatan yang dikirim ke server kami.
              </div>
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 px-0.5 py-1">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="sr-only"
          />
          <CheckBox checked={consented} />
          <span className="text-[13.5px]/[1.5] text-tx2">
            Aku mengerti Suci adalah alat bantu belajar, dan keputusan akhir
            tetap ada padaku.
          </span>
        </label>

        <div className="mt-auto flex flex-col gap-3.5 pt-4">
          <PrimaryButton disabled={!consented} onClick={() => setStep(2)}>
            Lanjut
          </PrimaryButton>
          {!consented && (
            <p className="m-0 text-center text-[12px]/[1.5] text-tx2">
              Centang dulu kotak di atas untuk melanjutkan.
            </p>
          )}
        </div>
      </Screen>
    );
  }

  if (step === 2) {
    return (
      <Screen tabBar={false} className="gap-4 pt-4">
        <StepDots current={2} />

        <div>
          <h1 className="t-headline m-0 text-tx">Kamu mengikuti mazhab apa?</h1>
          <p className="mt-2 mb-0 text-[14px]/[1.6] text-tx2">
            Pilihan ini menentukan batas hari haid, aturan istihadhah, dan
            qadha. Bisa diubah kapan saja di Pengaturan.
          </p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="t-label text-tx2">Namamu (opsional)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dipakai untuk menyapamu di Beranda"
            autoComplete="given-name"
            className="rounded-2xl border border-hair bg-bg px-[15px] py-3 text-[14px] text-tx placeholder:text-tx2/70"
          />
        </label>

        <div role="radiogroup" aria-label="Mazhab fiqih" className="flex flex-col gap-[11px]">
          {MADHHAB_ORDER.map((id) => {
            const m = MADHHABS[id];
            return (
              <RadioCard
                key={id}
                selected={madhhab === id}
                onSelect={() => setMadhhab(id)}
                title={m.name}
                description={m.blurb}
                badge={m.badge}
              />
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-4">
          <p className="m-0 text-center text-[12.5px]/[1.55] text-tx2">
            Belum yakin? Pilih Syafi&apos;i dulu — kami akan tampilkan pendapat
            mazhab lain di setiap kesimpulan.
          </p>
          <PrimaryButton onClick={() => setStep(3)}>Lanjut</PrimaryButton>
          <SecondaryButton tone="plain" onClick={() => setStep(1)}>
            Kembali
          </SecondaryButton>
        </div>
      </Screen>
    );
  }

  const pinsMatch = pin.length === PIN_LENGTH && pin === confirm;
  const mismatch = confirm.length === PIN_LENGTH && pin !== confirm;

  return (
    <Screen tabBar={false} className="gap-5 pt-4">
      <StepDots current={3} />

      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[22px] border border-rose-b bg-rose text-icon">
          <LockIcon size={28} />
        </div>
        <h1 className="t-headline m-0 text-center text-tx">Kunci dengan PIN</h1>
        <p className="m-0 max-w-[290px] text-center text-[14px]/[1.6] text-tx2">
          Enam angka saja. Ini yang membuat catatanmu tetap jadi urusanmu
          sendiri.
        </p>
      </div>

      <div className="flex flex-col gap-[18px] pt-1">
        <PinField label="PIN Baru" value={pin} onChange={setPin} autoFocus />
        <PinField label="Ulangi PIN" value={confirm} onChange={setConfirm} />

        {mismatch && (
          <p className="m-0 text-center text-[12.5px]/[1.5] text-peach-tx">
            Dua PIN ini belum sama. Coba periksa lagi.
          </p>
        )}

        <div className="flex items-start gap-[11px] rounded-2xl border border-peach-b bg-peach px-[15px] py-[13px]">
          <IconBubble tone="peach" size={28} className="bg-bg text-peach-tx">
            <InfoIcon size={15} />
          </IconBubble>
          <span className="text-[12.5px]/[1.55] text-peach-tx">
            PIN tidak bisa dipulihkan karena tidak dikirim ke mana pun. Simpan
            di tempat yang kamu ingat.
          </span>
        </div>

        {!isCryptoAvailable() && (
          <p className="m-0 text-[12.5px]/[1.5] text-peach-tx">
            Peramban ini tidak menyediakan enkripsi, jadi PIN belum bisa
            dipasang. Kamu masih bisa memakai Suci tanpa kunci.
          </p>
        )}
      </div>

      {error && (
        <p className="m-0 text-center text-[12.5px]/[1.5] text-peach-tx">
          {error}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <PrimaryButton
          disabled={!pinsMatch || busy || !isCryptoAvailable()}
          onClick={() => finish(pin)}
        >
          {busy ? "Menyimpan…" : "Simpan & mulai"}
        </PrimaryButton>
        <button
          type="button"
          disabled={busy}
          onClick={() => finish(null)}
          className="h-12 rounded-full border border-hair text-sm font-semibold text-tx2 transition hover:border-rose-b hover:text-tx"
        >
          Nanti saja
        </button>
        <p className="m-0 text-center text-[11.5px]/[1.5] text-tx2">
          Tanpa PIN, catatanmu tetap di ponsel ini tetapi tidak terenkripsi.
        </p>
      </div>
    </Screen>
  );
}

function StepDots({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cx(
            "block h-1 w-[26px] rounded-full",
            i <= current ? "bg-rose-b" : "bg-hair",
          )}
        />
      ))}
      <span className="t-label ml-2 text-tx2">Langkah {current} dari 3</span>
    </div>
  );
}

/**
 * A six-digit field. The boxes are decorative; a real (visually hidden) input
 * sits behind them so the numeric keyboard, paste and screen readers all work.
 */
function PinField({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div className="t-label mb-2.5 text-tx2">{label}</div>
      <div className="relative">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          aria-label={label}
          maxLength={PIN_LENGTH}
          value={value}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) =>
            onChange(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))
          }
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <PinBoxes value={value} focused={focused} />
      </div>
    </div>
  );
}
