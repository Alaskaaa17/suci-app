import { Classification } from "@/lib/fiqh/types";
import { cx } from "./ui";

/**
 * Status is never carried by colour alone.
 *
 * The brief makes this a hard rule, so every status gets a distinct shape —
 * filled dot for haid, rotated square for suci, dashed ring for istihadhah,
 * a question mark where the app does not know — and every use site pairs the
 * glyph with a text label. This component supplies both halves.
 */

export const STATUS_LABEL: Record<Classification, string> = {
  [Classification.HAID]: "Haid",
  [Classification.SUCI]: "Suci",
  [Classification.ISTIHADHAH]: "Istihadhah",
  [Classification.NIFAS]: "Nifas",
  [Classification.NEEDS_REVIEW]: "Perlu konfirmasi",
  [Classification.PREDICTED_HAID]: "Perkiraan haid",
};

/**
 * The shape each status uses, named for the legend. Only the two that fit on
 * one line carry a suffix in the legend; the rest rely on the glyph next to
 * their label, which is already paired with text.
 */
export const STATUS_GLYPH_DESCRIPTION: Partial<Record<Classification, string>> =
  {
    [Classification.HAID]: "titik",
    [Classification.SUCI]: "wajik",
  };

export function StatusGlyph({
  status,
  size = 6,
  className,
}: {
  status: Classification;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };

  switch (status) {
    case Classification.HAID:
      return (
        <span
          aria-hidden="true"
          style={style}
          className={cx("block rounded-full bg-icon", className)}
        />
      );

    case Classification.SUCI:
    case Classification.NIFAS:
      return (
        <span
          aria-hidden="true"
          style={style}
          className={cx("block rotate-45 bg-sage-tx", className)}
        />
      );

    case Classification.ISTIHADHAH:
      return (
        <span
          aria-hidden="true"
          style={{ width: size + 1, height: size + 1 }}
          className={cx(
            "block rounded-full border-[1.4px] border-dashed border-peach-tx",
            className,
          )}
        />
      );

    case Classification.PREDICTED_HAID:
      return (
        <span
          aria-hidden="true"
          style={style}
          className={cx(
            "block rounded-full border-[1.2px] border-icon",
            className,
          )}
        />
      );

    case Classification.NEEDS_REVIEW:
    default:
      return (
        <span
          aria-hidden="true"
          className={cx(
            "block text-[9px]/[1] font-bold text-tx2",
            className,
          )}
        >
          ?
        </span>
      );
  }
}

/** Surface classes for a calendar cell or badge carrying this status. */
export function statusSurface(status: Classification): string {
  switch (status) {
    case Classification.HAID:
      return "bg-rose border-rose-b";
    case Classification.SUCI:
    case Classification.NIFAS:
      return "bg-sage border-sage-b";
    case Classification.ISTIHADHAH:
      return "bg-peach border-peach-b";
    case Classification.PREDICTED_HAID:
      return "border-rose-b border-dashed opacity-75";
    case Classification.NEEDS_REVIEW:
    default:
      return "border-hair border-[1.4px] border-dashed";
  }
}
