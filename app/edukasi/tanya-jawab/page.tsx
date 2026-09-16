"use client";

import Link from "next/link";
import { Screen } from "@/components/shell";
import { InfoDotIcon } from "@/components/icons";
import {
  Accordion,
  AccordionBody,
  AccordionTrigger,
  Advisory,
  BackLink,
} from "@/components/ui";
import { FAQ } from "@/lib/content/faq";

export default function TanyaJawabPage() {
  return (
    <Screen tabBar={false} className="gap-[13px] pt-1.5">
      <BackLink href="/edukasi" label="Edukasi" />

      <div>
        <h1 className="t-headline m-0 text-tx">Tanya jawab</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          Pertanyaan yang paling sering muncul, dijawab dengan rujukannya.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {FAQ.map((item, i) => (
          <Accordion
            key={item.question}
            defaultOpen={i === 0}
            tone={i === 0 ? "rose" : "plain"}
          >
            <AccordionTrigger>
              <h2 className="m-0 flex-1 text-[14.5px]/[1.4] font-semibold text-tx">
                {item.question}
              </h2>
            </AccordionTrigger>
            <AccordionBody>
              <p className="m-0 text-[13px]/[1.65] text-tx2">{item.answer}</p>

              {item.citation && (
                <div className="rounded-xl border border-stone-b bg-stone-card px-3 py-2.5 text-[12px]/[1.5] text-stone-tx2">
                  <span className="font-semibold text-stone-tx">
                    {item.citation.work}
                    {item.citation.locus ? ` ${item.citation.locus}` : ""}
                  </span>
                  {item.agreed && " · disepakati empat mazhab."}
                </div>
              )}

              {!item.citation && item.agreed && (
                <div className="rounded-xl border border-sage-b bg-sage px-3 py-2.5 text-[12px]/[1.5] text-sage-tx">
                  Disepakati empat mazhab.
                </div>
              )}

              {item.seeAlso && (
                <Link
                  href={item.seeAlso.href}
                  className="text-[12.5px]/[1] font-semibold text-tx underline decoration-rose-b underline-offset-4"
                >
                  {item.seeAlso.label}
                </Link>
              )}
            </AccordionBody>
          </Accordion>
        ))}
      </div>

      <div className="mt-auto pt-2 pb-5">
        <Advisory icon={<InfoDotIcon size={15} />}>
          Kasus yang tidak ada di sini sebaiknya ditanyakan langsung ke ulama
          yang kamu percaya.
        </Advisory>
      </div>
    </Screen>
  );
}
