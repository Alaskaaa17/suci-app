"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useApp } from "@/lib/store/app-store";
import { CrescentIcon } from "./icons";
import { LockScreen } from "./lock-screen";
import { PhoneFrame } from "./shell";

/** Routes that render before there is a vault to read. */
const PUBLIC_PREFIXES = ["/onboarding", "/s/", "/kebijakan-privasi"];

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
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-bg">
      <div className="flex h-[76px] w-[76px] items-center justify-center rounded-[26px] border border-rose-b bg-rose text-icon">
        <CrescentIcon size={38} strokeWidth={1.5} />
      </div>
      <span className="text-[13px] text-tx2">Membuka Suci…</span>
    </div>
  );
}
