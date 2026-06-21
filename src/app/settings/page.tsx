"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useAdminAction } from "@/lib/useAdminAction";
import { pushAllToCloud } from "@/lib/dataService";
import { isSupabaseConfigured } from "@/lib/supabase";
import AdminPrompt from "@/components/AdminPrompt";

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const { adminGate } = useAdminAction();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [adminPromptOpen, setAdminPromptOpen] = useState(false);

  const supabaseReady = isSupabaseConfigured();

  async function doSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await pushAllToCloud();
      setSyncResult(
        `完了: 選手 ${result.players}件 / イベント ${result.events}件 / 回戦 ${result.rounds}件 / 卓 ${result.tables}件`
      );
    } catch (e) {
      setSyncResult(
        `エラー: ${e instanceof Error ? e.message : "不明なエラー"}`
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
        設定
      </h1>

      <section className="card space-y-3">
        <h2 className="section-title">🔐 管理者認証</h2>
        {isAdmin ? (
          <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
            ✅ 管理者モード有効です
            <p className="mt-1 text-[11px] font-normal text-ink-500">
              イベント作成・編集・削除が制限なく行えます
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs leading-relaxed text-ink-600">
              イベント作成・編集・削除・卓組変更は管理者認証が必要です。
              まずメインのパスワード（kawasaki）で入室してから、管理者パスワードを入力してください。
            </p>
            <button
              onClick={() => setAdminPromptOpen(true)}
              className="btn-primary w-full"
            >
              🔐 管理者ログイン
            </button>
          </>
        )}
      </section>

      {isAdmin && (
        <section
          className={`card space-y-3 ${
            supabaseReady
              ? "border-brand-200 bg-brand-50/50"
              : "border-amber-200 bg-amber-50/50"
          }`}
        >
          <h2 className="section-title">☁️ クラウド反映</h2>
          {supabaseReady ? (
            <>
              <p className="text-xs leading-relaxed text-ink-600">
                ローカル（IndexedDB）にある全データを Supabase にアップロードします。
                既存データは上書きされます。
              </p>
              <button
                onClick={doSync}
                disabled={syncing}
                className="btn-primary w-full"
              >
                {syncing ? "反映中…" : "☁️ 全データをクラウドに反映"}
              </button>
              {syncResult && (
                <p
                  className={`text-xs font-semibold ${
                    syncResult.startsWith("エラー")
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  {syncResult}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs leading-relaxed text-amber-800">
              ⚠️ Supabase の環境変数が設定されていません。
              Vercel の Environment Variables で
              <code className="mx-1 rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> と
              <code className="mx-1 rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
              を設定してください。
            </p>
          )}
        </section>
      )}

      <section className="card space-y-2">
        <h2 className="section-title">アプリについて</h2>
        <p className="text-sm font-semibold text-ink-800">
          京橋の民セット麻雀記録ツール <span className="text-ink-500">v0.1.0</span>
        </p>
        <p className="text-xs leading-relaxed text-ink-500">
          Next.js + IndexedDB + Supabase で構築。
          データはクラウド（Supabase）とローカル（IndexedDB）の両方に保存され、
          複数端末間で共有できます。
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">使い方</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-700">
          <li>
            <span className="font-bold">選手タブ</span>で参加者を追加（最大30人）
          </li>
          <li>
            <span className="font-bold">イベントタブ</span> → 「＋ 新規」でイベント作成
            <br />
            <span className="text-xs text-ink-500">
              選手選択・回戦数・ルール（Mリーグノーレート対応）を設定
            </span>
          </li>
          <li>
            イベント詳細画面で
            <span className="font-bold">点数入力</span>（手動 ×100、3人入力で4人目自動）でスコアを記録
          </li>
        </ol>
      </section>

      {adminPromptOpen && (
        <AdminPrompt
          onClose={() => setAdminPromptOpen(false)}
          onSuccess={() => setAdminPromptOpen(false)}
          title="管理者認証"
          message="管理者パスワードを入力してください。"
        />
      )}
      {adminGate}
    </div>
  );
}
