"use client";

import { useCallback, useEffect, useState } from "react";
import { CrescentIcon } from "./icons";
import { PinDots, PinPad, PIN_LENGTH } from "./pin-pad";
import { Screen } from "./shell";
import { PrimaryButton } from "./ui";
import { useApp } from "@/lib/store/app-store";
import { lockoutRemaining } from "@/lib/store/vault";

/**
 * Screen 04. Deliberately has no "forgot PIN" recovery: the key is derived
 * from the PIN and nothing else is stored, so there is nothing to recover to.
 * Saying so plainly is better than offering a door that does not open.
 */
export function LockScreen() {
  const { unlock } = useApp();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [waitMs, setWaitMs] = useState(() => lockoutRemaining());

  // Count the lockout down rather than leaving a dead keypad with no reason.
  useEffect(() => {
    if (waitMs <= 0) return;
    const id = window.setInterval(() => {
      setWaitMs(lockoutRemaining());
    }, 1000);
    return () => window.clearInterval(id);
  }, [waitMs]);

  const submit = useCallback(
    async (candidate: string) => {
      if (candidate.length !== PIN_LENGTH || busy || waitMs > 0) return;
      setBusy(true);
      const result = await unlock(candidate);
      if (!result.ok) {
        setError(true);
        setAttempts((a) => a + 1);
        setWaitMs(result.waitMs ?? 0);
        setPin("");
      }
      setBusy(false);
    },
    [busy, unlock, waitMs],
  );

  // Submit as soon as the sixth digit lands — no extra tap needed.
  useEffect(() => {
    if (pin.length === PIN_LENGTH) void submit(pin);
  }, [pin, submit]);

  const onDigit = useCallback((d: string) => {
    setError(false);
    setPin((p) => (p.length < PIN_LENGTH ? p + d : p));
  }, []);

  const onBackspace = useCallback(() => {
    setError(false);
    setPin((p) => p.slice(0, -1));
  }, []);

  return (
    <Screen tabBar={false} className="items-center justify-center gap-6 px-[30px]">
      <div className="flex h-[118px] w-[118px] items-center justify-center rounded-[40px] border border-rose-b bg-rose text-icon shadow-card">
        <CrescentIcon size={62} strokeWidth={1.3} />
      </div>

      <div className="text-center">
        <h1 className="m-0 text-[30px]/[1.15] font-bold tracking-[-.025em] text-tx">
          Assalamualaikum
        </h1>
        <p className="mt-[7px] mb-0 text-[14.5px]/[1.55] text-tx2">
          {waitMs > 0
            ? `Terlalu banyak percobaan. Coba lagi dalam ${formatWait(waitMs)}.`
            : error
              ? "PIN belum cocok. Coba lagi, pelan-pelan."
              : "Masukkan PIN untuk membuka catatanmu."}
        </p>
      </div>

      <PinDots length={PIN_LENGTH} filled={pin.length} error={error} />

      <PinPad
        onDigit={onDigit}
        onBackspace={onBackspace}
        disabled={busy || waitMs > 0}
      />

      <div className="flex w-full flex-col gap-3.5 pt-2 pb-4">
        <PrimaryButton
          disabled={pin.length !== PIN_LENGTH || busy || waitMs > 0}
          onClick={() => void submit(pin)}
        >
          {busy ? "Membuka…" : "Buka"}
        </PrimaryButton>

        {attempts >= 2 && waitMs === 0 && (
          <p className="m-0 text-center text-[12.5px]/[1.55] text-tx2">
            PIN ini tidak tersimpan di mana pun, jadi kami tidak bisa
            memulihkannya. Kalau benar-benar lupa, satu-satunya jalan adalah
            memulai dari awal dengan catatan kosong.
          </p>
        )}
      </div>
    </Screen>
  );
}

/** "1 menit 30 detik" — spelled out, because a bare mm:ss reads like a threat. */
function formatWait(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds} detik`;
  if (seconds === 0) return `${minutes} menit`;
  return `${minutes} menit ${seconds} detik`;
}
