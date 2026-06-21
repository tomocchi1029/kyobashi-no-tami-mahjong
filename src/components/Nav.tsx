"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

const ITEMS = [
  { href: "/", label: "イベント", icon: "🏟️" },
  { href: "/players", label: "選手", icon: "👥" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

export default function Nav() {
  const pathname = usePathname();
  const { isAdmin, exitAdmin, triggerSync, isSyncing, lastSyncedAt } = useAuth();
  const [syncFlash, setSyncFlash] = useState(false);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const supabaseReady = isSupabaseConfigured();

  async function handleSync() {
    if (isSyncing) return;
    setSyncFlash(false);
    await triggerSync();
    setSyncFlash(true);
    setTimeout(() => setSyncFlash(false), 1500);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-ink-200/60 bg-white/85 shadow-soft backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-base font-extrabold tracking-tight text-ink-900">
          <span className="text-xl">🀄</span>
          <span className="hidden sm:inline">京橋の民</span>
        </Link>
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <button
              onClick={() => {
                if (confirm("管理者モードを解除しますか？")) exitAdmin();
              }}
              className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 active:scale-95"
              title="タップで管理者モード解除"
            >
              🔓 管理者
            </button>
          )}
          {supabaseReady && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold active:scale-95 disabled:opacity-60 ${
                syncFlash
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-brand-50 text-brand-700"
              }`}
              title="クラウドから同期"
            >
              {isSyncing ? (
                <>⏳ 同期中…</>
              ) : syncFlash ? (
                <>✅ 同期済み</>
              ) : (
                <>☁️ 同期</>
              )}
            </button>
          )}
          <nav className="flex items-center gap-1">
            {ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-all ${
                    active
                      ? "bg-brand-600 text-white shadow-glow"
                      : "text-ink-600 hover:bg-ink-100 active:scale-95"
                  }`}
                >
                  <span aria-hidden>{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
