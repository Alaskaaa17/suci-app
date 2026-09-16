"use client";

import { AppProvider } from "@/lib/store/app-store";
import { Gate } from "@/components/gate";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <Gate>{children}</Gate>
    </AppProvider>
  );
}
