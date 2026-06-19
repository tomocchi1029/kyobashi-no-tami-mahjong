"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "イベント", icon: "🏟️" },
  { href: "/players", label: "選手", icon: "👥" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-20 border-b border-ink-200/60 bg-white/85 shadow-soft backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-base font-extrabold tracking-tight text-ink-900">
          <span className="text-xl">🀄</span>
          <span>京橋の民</span>
        </Link>
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
    </header>
  );
}
