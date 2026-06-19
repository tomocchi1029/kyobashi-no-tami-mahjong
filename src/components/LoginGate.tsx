"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const { authenticated, login } = useAuth();
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  if (authenticated) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(pw)) {
      setPw("");
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 via-white to-ink-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 rounded-3xl border border-ink-200/60 bg-white/90 p-8 shadow-lift backdrop-blur"
      >
        <div className="text-center">
          <div className="text-5xl">🀄</div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900">
            京橋の民
          </h1>
          <p className="mt-1 text-xs font-medium text-ink-500">
            セット麻雀記録ツール
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-center text-xs leading-relaxed text-ink-500">
            京橋の民の中でコロコロと雀名を変える人の苗字を小文字で入力してください。
          </p>
          <input
            type="password"
            className={`input w-full text-center text-lg tracking-[0.4em] ${
              error ? "border-red-400 ring-2 ring-red-100" : ""
            }`}
            placeholder="パスワード"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setError(false);
            }}
            autoFocus
          />
          {error && (
            <p className="text-center text-xs font-semibold text-red-500">
              パスワードが違います
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary w-full py-3.5 text-base"
        >
          入室
        </button>
      </form>
    </div>
  );
}
