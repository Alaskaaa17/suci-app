"use client";

import { useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import { SearchIcon } from "@/components/icons";
import { BackLink, Chip } from "@/components/ui";
import {
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  groupByLetter,
  type GlossaryCategory,
} from "@/lib/content/glossary";

export default function GlosariumPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GlossaryCategory | "semua">("semua");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = GLOSSARY.filter((t) => {
      if (category !== "semua" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q) ||
        (t.arabic?.includes(query.trim()) ?? false)
      );
    });
    return groupByLetter(filtered);
  }, [query, category]);

  const total = groups.reduce((n, [, items]) => n + items.length, 0);

  return (
    <Screen tabBar={false} className="gap-[13px] pt-1.5">
      <BackLink href="/edukasi" label="Edukasi" />

      <h1 className="t-headline m-0 text-tx">Glosarium</h1>

      <label className="flex items-center gap-2.5 rounded-full border border-rose-b bg-rose px-4 py-3">
        <SearchIcon size={17} className="shrink-0 text-icon" />
        <span className="sr-only">Cari istilah</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari istilah…"
          className="w-full bg-transparent text-sm text-tx placeholder:text-tx2"
        />
      </label>

      <div className="flex flex-wrap gap-[7px]">
        {GLOSSARY_CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            size="sm"
            active={category === c.id}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </Chip>
        ))}
      </div>

      {total === 0 ? (
        <p className="m-0 rounded-2xl border border-hair px-[15px] py-4 text-[13px]/[1.6] text-tx2">
          Tidak ada istilah yang cocok dengan &ldquo;{query}&rdquo;. Coba kata
          lain, atau lihat Tanya jawab.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {groups.map(([letter, items]) => (
            <section key={letter} className="flex flex-col gap-2.5">
              <h2 className="t-label m-0 mt-1 text-tx2">{letter}</h2>
              {items.map((t) => (
                <article
                  key={t.term}
                  className="border-b border-hair pb-[11px] last:border-b-0"
                >
                  <div className="flex items-baseline gap-2">
                    <h3 className="m-0 text-[15.5px]/[1.3] font-semibold text-tx">
                      {t.term}
                    </h3>
                    {t.arabic && (
                      <span
                        lang="ar"
                        className="font-[family-name:var(--font-amiri)] text-base text-tx2"
                      >
                        {t.arabic}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 mb-0 text-[13px]/[1.6] text-tx2">
                    {t.definition}
                  </p>
                </article>
              ))}
            </section>
          ))}
        </div>
      )}
    </Screen>
  );
}
