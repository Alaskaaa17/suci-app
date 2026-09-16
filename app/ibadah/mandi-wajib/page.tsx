"use client";

import { useRouter } from "next/navigation";
import { Screen } from "@/components/shell";
import { BackLink, CheckRow, PrimaryButton, SectionLabel } from "@/components/ui";
import { Classification } from "@/lib/fiqh/types";
import { useApp } from "@/lib/store/app-store";

/**
 * Screen 09. The steps are a checklist rather than prose because the design
 * treats them as something you tick off while actually doing it — so the
 * ticks persist per-day, and the final action writes the real state change.
 */

const STEPS = [
  {
    id: "niat",
    title: "Berniat di dalam hati",
    description: "Bersamaan dengan siraman pertama.",
  },
  {
    id: "bersih",
    title: "Bersihkan sisa darah",
    description: "Cuci bagian tubuh yang terkena lebih dahulu.",
  },
  {
    id: "kepala",
    title: "Siram seluruh kepala",
    description: "Pastikan air sampai ke pangkal rambut.",
  },
  {
    id: "badan",
    title: "Ratakan air ke seluruh badan",
    description: "Termasuk lipatan kulit, telinga, dan sela jari.",
  },
  {
    id: "tandai",
    title: "Tandai suci di aplikasi",
    description: "Status berubah dan shalat kembali dihitung.",
  },
];

export default function MandiWajibPage() {
  const router = useRouter();
  const { data, today, update, setEntry, verdict } = useApp();
  if (!data || !verdict) return null;

  const done = data.ghuslSteps[today] ?? [];

  const toggle = (id: string, next: boolean) => {
    update((draft) => {
      const current = draft.ghuslSteps[today] ?? [];
      draft.ghuslSteps[today] = next
        ? [...new Set([...current, id])]
        : current.filter((s) => s !== id);
    });
  };

  const markPure = async () => {
    // Recording ghusl and the absence of blood is what actually ends the
    // episode; the checklist above is a guide, not the state change.
    await setEntry(today, { bleeding: false, ghusl: true });
    await update((draft) => {
      draft.ghuslSteps[today] = STEPS.map((s) => s.id);
    });
    router.push("/");
  };

  const stillBleeding = verdict.classification === Classification.HAID;

  return (
    <Screen tabBar={false} className="pt-1.5">
      <BackLink href="/ibadah" label="Ibadah" />

      <div>
        <h1 className="t-headline m-0 text-tx">Mandi wajib</h1>
        <p className="mt-1.5 mb-0 text-[13.5px]/[1.55] text-tx2">
          Setelah darah berhenti, inilah yang perlu kamu lakukan. Tenang, tidak
          rumit.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-[20px] border border-stone-b bg-stone-card p-[18px]">
        <div className="t-label text-stone-tx2">Niat mandi wajib</div>
        <p
          lang="ar"
          className="arabic m-0 text-[23px] text-stone-tx"
        >
          نَوَيْتُ الْغُسْلَ لِرَفْعِ الْحَدَثِ الْأَكْبَرِ مِنَ الْحَيْضِ فَرْضًا لِلّٰهِ تَعَالَى
        </p>
        <div className="h-px bg-stone-b" />
        <p className="m-0 text-[13px]/[1.6] font-medium text-stone-tx italic">
          Nawaitul ghusla lirafʻil hadatsil akbari minal haidhi fardhan lillāhi
          taʻālā.
        </p>
        <p className="m-0 text-[13px]/[1.65] text-stone-tx2">
          &ldquo;Aku berniat mandi untuk menghilangkan hadas besar dari haid,
          wajib karena Allah Ta&apos;ala.&rdquo;
        </p>
        <p className="m-0 rounded-xl bg-stone-bg px-[13px] py-[11px] text-[12px]/[1.55] text-stone-tx2">
          Niat cukup di hati; melafalkan hanya membantu.{" "}
          <span className="font-semibold text-stone-tx">
            Fathul Qarib, Bab Ghusl.
          </span>
        </p>
      </section>

      <div className="flex flex-col gap-2.5">
        <SectionLabel>Langkah bersuci</SectionLabel>
        {STEPS.map((step) => {
          const checked = done.includes(step.id);
          return (
            <CheckRow
              key={step.id}
              checked={checked}
              onChange={(next) => toggle(step.id, next)}
              title={step.title}
              description={step.description}
              tone={checked ? "sage" : "plain"}
            />
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-3 pb-4">
        <PrimaryButton onClick={markPure}>
          Sudah mandi, tandai suci
        </PrimaryButton>
        <p className="m-0 text-center text-[12px]/[1.5] text-tx2">
          {stillBleeding
            ? "Ini akan mencatat bahwa darah sudah berhenti hari ini."
            : "Catatan hari ini akan ditandai sudah mandi wajib."}
        </p>
      </div>
    </Screen>
  );
}
