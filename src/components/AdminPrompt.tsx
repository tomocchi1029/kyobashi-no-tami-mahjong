"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  message?: string;
}

export default function AdminPrompt({
  onClose,
  onSuccess,
  title = "管理者認証",
  message = "この操作は管理者権限が必要です。",
}: Props) {
  const { isAdmin, enterAdmin, exitAdmin } = useAuth();
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      onSuccess();
    }
  }, [isAdmin, onSuccess]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (enterAdmin(pw)) {
      onSuccess();
    } else {
      setError(true);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl border border-ink-200/60 bg-white p-6 shadow-lift sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-900">
            <span className="text-xl">🔐</span>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100"
            aria-label="閉じる"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-ink-600">{message}</p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            className={`input w-full text-center tracking-[0.3em] ${
              error ? "border-red-400 ring-2 ring-red-100" : ""
            }`}
            placeholder="管理者パスワード"
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

          {isAdmin && (
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">
              ✅ 管理者モード有効です
              <button
                type="button"
                onClick={() => {
                  exitAdmin();
                  onClose();
                }}
                className="ml-2 text-ink-500 underline"
              >
                解除
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={!pw}
            >
              認証
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
