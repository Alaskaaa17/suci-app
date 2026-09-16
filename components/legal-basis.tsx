"use client";

import Link from "next/link";
import { MADHHABS } from "@/lib/fiqh/madhhab";
import type { Verdict } from "@/lib/fiqh/types";
import { BookIcon, WarningIcon } from "./icons";
import {
  Accordion,
  AccordionBody,
  AccordionTrigger,
  Advisory,
  CitationCard,
  IconBubble,
} from "./ui";

/**
 * "Dasar hukum status ini" — the reasoning trail.
 *
 * Always on the neutral stone layer. Every conclusion the app draws is
 * reachable from here in one tap, which is the promise onboarding makes.
 */
export function LegalBasis({
  verdict,
  defaultOpen = false,
  subtitle,
}: {
  verdict: Verdict;
  defaultOpen?: boolean;
  subtitle?: string;
}) {
  const madhhab = MADHHABS[verdict.madhhab];

  return (
    <Accordion defaultOpen={defaultOpen} tone="stone" className="rounded-[20px]">
      <AccordionTrigger chevronClass="text-stone-tx2">
        <IconBubble tone="stone" size={30}>
          <BookIcon size={16} />
        </IconBubble>
        <span className="flex-1">
          <span className="block text-sm/[1.3] font-semibold text-stone-tx">
            Dasar hukum status ini
          </span>
          <span className="block text-xs/[1.4] text-stone-tx2">
            {subtitle ?? "Ketuk untuk lihat jejak penalaran"}
          </span>
        </span>
      </AccordionTrigger>

      <AccordionBody>
        <div className="h-px bg-stone-b" />
        <div className="t-label text-stone-tx2">Mazhab {madhhab.name}</div>

        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {verdict.steps.map((step, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-[13px]/[1.65] text-stone-tx2"
            >
              <span
                aria-hidden="true"
                className="mt-[7px] block h-1 w-1 shrink-0 rounded-full bg-stone-tx2"
              />
              <span>
                {step.text}
                {step.emphasis && (
                  <>
                    {" "}
                    <span className="font-semibold text-stone-tx">
                      {step.emphasis}
                    </span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>

        <CitationCard
          work={verdict.citation.work}
          locus={verdict.citation.locus}
          note={verdict.citation.note}
        />

        {verdict.advisory && (
          <Advisory icon={<WarningIcon size={15} />}>
            {verdict.advisory}
          </Advisory>
        )}

        <Link
          href="/edukasi/ikhtilaf"
          className="text-[12.5px]/[1] font-semibold text-stone-tx underline decoration-stone-b underline-offset-4"
        >
          Lihat pendapat 3 mazhab lain
        </Link>
      </AccordionBody>
    </Accordion>
  );
}
