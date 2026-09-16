"use client";

import { useEffect } from "react";
import { BackspaceIcon } from "./icons";
import { cx } from "./ui";

export const PIN_LENGTH = 6;

/** The six filled/empty dots above the keypad. */
export function PinDots({
  length,
  filled,
  error,
}: {
  length: number;
  filled: number;
  error?: boolean;
}) {
  return (
    <div
      className={cx("flex gap-3", error && "animate-[shake_.4s_ease]")}
      role="status"
      aria-label={`${filled} dari ${length} angka dimasukkan`}
    >
      {Array.from({ length }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cx(
            "block h-4 w-4 rounded-full border-[1.5px] transition",
            i < filled
              ? "border-icon bg-icon"
              : error
                ? "border-peach-b"
                : "border-rose-b",
          )}
        />
      ))}
    </div>
  );
}

/**
 * The numeric keypad. Also listens for physical keys — a PIN screen that can
 * only be driven by tapping is unusable with a keyboard or a switch device.
 */
export function PinPad({
  onDigit,
  onBackspace,
  disabled,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}) {
  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        onDigit(e.key);
      } else if (e.key === "Backspace") {
        onBackspace();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDigit, onBackspace, disabled]);

  const key =
    "flex h-[58px] items-center justify-center rounded-full border border-hair text-[20px] font-medium text-tx transition hover:border-rose-b hover:bg-rose active:scale-95 disabled:opacity-40";

  return (
    <div className="grid w-full max-w-[290px] grid-cols-3 gap-3">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <button
          key={d}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(d)}
          className={key}
        >
          {d}
        </button>
      ))}
      <span />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDigit("0")}
        className={key}
      >
        0
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onBackspace}
        aria-label="Hapus satu angka"
        className="flex h-[58px] items-center justify-center rounded-full text-tx2 transition hover:text-tx active:scale-95 disabled:opacity-40"
      >
        <BackspaceIcon size={22} />
      </button>
    </div>
  );
}

/** Six boxed slots, used on the "create PIN" screen where both PINs show. */
export function PinBoxes({
  value,
  length = PIN_LENGTH,
  focused,
  tone = "rose",
}: {
  value: string;
  length?: number;
  focused?: boolean;
  tone?: "rose" | "plain";
}) {
  return (
    <div className="flex justify-between gap-2.5" aria-hidden="true">
      {Array.from({ length }, (_, i) => {
        const filled = i < value.length;
        const isCaret = focused && i === value.length;
        return (
          <span
            key={i}
            className={cx(
              "flex h-[54px] flex-1 items-center justify-center rounded-2xl border",
              filled
                ? tone === "rose"
                  ? "border-rose-b bg-rose"
                  : "border-hair bg-bg"
                : isCaret
                  ? "border-[1.5px] border-icon bg-bg"
                  : "border-hair bg-bg",
            )}
          >
            {filled && (
              <span className="block h-[11px] w-[11px] rounded-full bg-icon" />
            )}
            {isCaret && (
              <span className="block h-[22px] w-0.5 animate-pulse bg-icon" />
            )}
          </span>
        );
      })}
    </div>
  );
}
