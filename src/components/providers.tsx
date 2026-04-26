"use client";

import { SessionProvider } from "next-auth/react";
import { A11yBionicProvider } from "@/components/a11y-bionic-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <A11yBionicProvider>{children}</A11yBionicProvider>
    </SessionProvider>
  );
}
