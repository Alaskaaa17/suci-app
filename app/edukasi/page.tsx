"use client";

import Link from "next/link";
import { Screen } from "@/components/shell";
import {
  BookIcon,
  DropIcon,
  HelpIcon,
  LeafIcon,
  MihrabIcon,
  ScalesIcon,
  SearchIcon,
  TargetIcon,
} from "@/components/icons";
import { NavRow, SectionLabel } from "@/components/ui";
import { faqCount } from "@/lib/content/faq";
import { glossaryCount } from "@/lib/content/glossary";
import { AMALAN } from "@/lib/content/amalan";
import { useApp } from "@/lib/store/app-store";

export default function EdukasiPage() {
  const { data } = useApp();

  const phases = [
    {
      href: "/edukasi/baligh",
      title: "Mode Baligh",
      subtitle: "Haid pertama",
      surface: "bg-rose border-rose-b",
      text: "text-tx",
    },
    {
      href: "/edukasi/ibu",
      title: "Untuk Ibu",
      subtitle: "Nifas & menyusui",
      surface: "bg-sage border-sage-b",
      text: "text-sage-tx",
    },
    {
      href: "/edukasi/menopause",
      title: "Menopause",
      subtitle: "Fase baru",
      surface: "bg-peach border-peach-b",
      text: "text-peach-tx",
    },
  ];

  return (
    <Screen className="gap-[13px] pt-3">
      <div>
        <h1 className="t-headline m-0 text-tx">Edukasi</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          Pelan-pelan saja. Mulai dari topik yang paling kamu butuhkan hari ini.
        </p>
      </div>

      <div className="stagger flex flex-col gap-2">
        <NavRow
          href="/edukasi/dasar"
          tone="rose"
          icon={<DropIcon size={16} />}
          title="Dasar haid & thaharah"
          subtitle="Apa yang berubah dan apa yang tidak"
        />
        <NavRow
          href="/edukasi/istihadhah"
          tone="peach"
          icon={<BookIcon size={16} />}
          title="Istihadhah"
          subtitle="Darah di luar kebiasaan"
        />
        <NavRow
          href="/edukasi/amalan"
          tone="sage"
          icon={<LeafIcon size={16} />}
          title="Amalan pengganti"
          subtitle={`${AMALAN.length} amalan yang tetap bisa kamu lakukan`}
        />
        <NavRow
          href="/edukasi/ibu"
          tone="rose"
          icon={<TargetIcon size={16} />}
          title="Nifas & melahirkan"
          subtitle="Batas nifas menurut 4 mazhab"
        />
        <NavRow
          href="/ibadah/mandi-wajib"
          tone="sage"
          icon={<MihrabIcon size={16} />}
          title="Mandi wajib & tayamum"
          subtitle="Niat, rukun, dan keringanan"
        />
        <NavRow
          href="/edukasi/ikhtilaf"
          tone="stone"
          icon={<ScalesIcon size={16} />}
          title="Ikhtilaf 4 mazhab"
          subtitle="Perbandingan pendapat, lengkap rujukan"
        />
        <NavRow
          href="/edukasi/glosarium"
          tone="rose"
          icon={<SearchIcon size={16} />}
          title="Glosarium"
          subtitle={`${glossaryCount()} istilah fiqih dengan bahasa sehari-hari`}
        />
        <NavRow
          href="/edukasi/tanya-jawab"
          tone="peach"
          icon={<HelpIcon size={16} />}
          title="Tanya jawab"
          subtitle={`${faqCount()} pertanyaan yang sering muncul`}
        />
      </div>

      <div className="mt-0.5">
        <SectionLabel>Untuk fasemu</SectionLabel>
        <div className="mt-2.5 flex gap-2.5">
          {phases.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={`flex-1 rounded-2xl border p-[13px] transition hover:brightness-95 ${p.surface}`}
            >
              <span
                className={`block text-[13.5px]/[1.3] font-semibold ${p.text}`}
              >
                {p.title}
              </span>
              <span className="mt-0.5 block text-[11.5px]/[1.4] text-tx2">
                {p.subtitle}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {data?.profile.specialState === "menopause" && (
        <p className="m-0 text-[12px]/[1.5] text-tx2">
          Mode Menopause sedang aktif, jadi pelacakan siklus dinonaktifkan.
        </p>
      )}
    </Screen>
  );
}
