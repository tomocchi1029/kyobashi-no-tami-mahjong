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
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm"
      >
        <div className="text-center">
          <div className="text-4xl">🀄</div>
          <h1 className="mt-3 text-lg font-bold">京橋の民</h1>
          <p className="mt-1 text-xs text-stone-500">
            セット麻雀記録ツール
          </p>
        </div>

        <div className="space-y-2">
          <input
            type="password"
            className="input w-full text-center text-lg tracking-widest"
            placeholder="パスワード"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setError(false);
            }}
            autoFocus
          />
          {error && (
            <p className="text-center text-xs text-red-500">
              パスワードが違います
            </p>
          )}
        </div>

        <button type="submit" className="btn-primary w-full py-3 text-base">
              入室
        </button>
      </form>
    </div>
  );
}
