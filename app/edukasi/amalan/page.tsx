"use client";

import { Screen } from "@/components/shell";
import { CheckIcon } from "@/components/icons";
import { BackLink, CheckRow, IconBubble } from "@/components/ui";
import { AMALAN } from "@/lib/content/amalan";
import { useApp } from "@/lib/store/app-store";

/**
 * Screen 12. The ticks are per-day and persist, so "2 dari 6" is a real count
 * of what the user actually did today rather than a static illustration.
 */
export default function AmalanPage() {
  const { data, today, update } = useApp();
  if (!data) return null;

  const done = data.amalan[today] ?? [];

  const toggle = (id: string, next: boolean) => {
    update((draft) => {
      const current = draft.amalan[today] ?? [];
      draft.amalan[today] = next
        ? [...new Set([...current, id])]
        : current.filter((a) => a !== id);
    });
  };

  return (
    <Screen tabBar={false} className="gap-[13px] pt-1.5">
      <BackLink href="/edukasi" label="Edukasi" />

      <div>
        <h1 className="t-headline m-0 text-tx">Amalan pengganti</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          Pintu kebaikan tidak pernah tertutup saat haid. Pilih satu saja hari
          ini, itu sudah cukup.
        </p>
      </div>

      <div className="flex items-center gap-[11px] rounded-[18px] border border-sage-b bg-sage px-[15px] py-3.5">
        <IconBubble tone="sage" className="bg-bg text-sage-tx">
          <CheckIcon size={16} strokeWidth={2.2} />
        </IconBubble>
        <p className="m-0 flex-1 text-[13px]/[1.5] font-medium text-tx2">
          <span className="font-semibold text-sage-tx">
            {done.length} dari {AMALAN.length}
          </span>{" "}
          {done.length === 0
            ? "amalan tercatat hari ini. Tidak apa-apa, mulai dari satu."
            : "amalan sudah kamu lakukan hari ini."}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {AMALAN.map((a) => (
          <CheckRow
            key={a.id}
            checked={done.includes(a.id)}
            onChange={(next) => toggle(a.id, next)}
            title={a.title}
            description={a.description}
          >
            {a.arabic && (
              <span
                lang="ar"
                className="arabic mt-[7px] block text-[17px] text-tx"
              >
                {a.arabic}
              </span>
            )}
            {a.transliteration && (
              <span className="mt-1 block text-justify text-pretty text-[12px]/[1.5] text-tx2 italic">
                {a.transliteration}
              </span>
            )}
            {(a.citation || a.note) && (
              <span className="mt-[7px] block rounded-[10px] bg-stone-bg px-2.5 py-2 text-[11.5px]/[1.45] text-stone-tx2">
                {a.citation
                  ? `${a.citation.work}${a.citation.locus ? `, ${a.citation.locus}` : ""}${
                      a.citation.note ? `, ${a.citation.note}` : ""
                    }`
                  : a.note}
              </span>
            )}
          </CheckRow>
        ))}
      </div>
    </Screen>
  );
}
