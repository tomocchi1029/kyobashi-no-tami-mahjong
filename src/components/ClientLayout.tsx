"use client";

import { AuthProvider } from "@/lib/auth";
import LoginGate from "@/components/LoginGate";
import Nav from "@/components/Nav";
import { type ReactNode } from "react";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LoginGate>
        <Nav />
        <main className="flex-1 px-4 pb-28 pt-3 sm:pt-4">{children}</main>
        <footer className="px-4 pb-6 pt-2 text-center text-[11px] font-medium tracking-wide text-ink-400">
          京橋の民セット麻雀記録ツール
        </footer>
      </LoginGate>
    </AuthProvider>
  );
}
