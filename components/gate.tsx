"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useApp } from "@/lib/store/app-store";
import { CrescentIcon } from "./icons";
import { LockScreen } from "./lock-screen";
import { PhoneFrame } from "./shell";

/** Routes that render before there is a vault to read. */
const PUBLIC_PREFIXES = ["/onboarding", "/s/", "/kebijakan-privasi", "/hapus-data"];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Decides which of the four app states the user sees: booting, onboarding,
 * locked, or the app itself. Every screen renders inside the phone frame, so
 * the frame lives here rather than in each route.
 */
export function Gate({ children }: { children: ReactNode }) {
  const { status } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const open = isPublic(pathname);

  useEffect(() => {
    if (status === "onboarding" && !open) {
      router.replace("/onboarding");
    }
    if (status === "ready" && pathname === "/onboarding") {
      router.replace("/");
    }
  }, [status, open, pathname, router]);

  if (open) return <PhoneFrame>{children}</PhoneFrame>;

  if (status === "loading") {
    return (
      <PhoneFrame>
        <Booting />
      </PhoneFrame>
    );
  }

  if (status === "locked") {
    return (
      <PhoneFrame>
        <LockScreen />
      </PhoneFrame>
    );
  }

  if (status === "onboarding") {
    // The redirect above is in flight; show the same calm screen meanwhile.
    return (
      <PhoneFrame>
        <Booting />
      </PhoneFrame>
    );
  }

  return <PhoneFrame>{children}</PhoneFrame>;
}

function Booting() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-bg">
      <div className="animate-breathe flex h-[84px] w-[84px] items-center justify-center rounded-[28px] border border-rose-b bg-rose text-icon shadow-card">
        <CrescentIcon size={42} strokeWidth={1.5} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="t-display text-tx">Suci</span>
        <span className="text-[13px] text-tx2">Membuka catatanmu…</span>
      </div>
      <div className="loading-dots flex items-center gap-1.5" aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-b" />
        <span className="h-1.5 w-1.5 rounded-full bg-rose-b" />
        <span className="h-1.5 w-1.5 rounded-full bg-rose-b" />
      </div>
    </div>
  );
}
