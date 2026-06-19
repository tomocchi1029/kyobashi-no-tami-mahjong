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
        <main className="flex-1 px-4 pb-20 pt-4">{children}</main>
        <footer className="px-4 pb-6 text-center text-xs text-stone-400">
          京橋の民セット麻雀記録ツール ・ データはこの端末に保存されます
        </footer>
      </LoginGate>
    </AuthProvider>
  );
}
