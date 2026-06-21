"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useAdminAction } from "@/lib/useAdminAction";
import { pushAllToCloud } from "@/lib/dataService";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const { requireAdmin, adminGate } = useAdminAction();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

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

      {isAdmin && supabaseReady && (
        <section className="card space-y-3 border-brand-200 bg-brand-50/50">
          <h2 className="section-title">☁️ クラウド反映</h2>
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
            <span className="font-bold">卓組</span>（自動抽選・同卓回避）・
            <span className="font-bold">点数入力</span>（手動 ×100、3人入力で4人目自動）・
            <span className="font-bold">順位</span>（MP/金額ランキング）を確認
          </li>
        </ol>
      </section>

      <section className="card space-y-2">
        <h2 className="section-title">注意事項</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-ink-500">
          <li>ブラウザのキャッシュを消去するとローカルデータは削除されますが、クラウド上のデータは保持されます</li>
          <li>複数端末間の同期は自動で行われます（Supabase に接続されている場合）</li>
          <li>Supabase 未接続時はローカル（IndexedDB）のみで動作します</li>
        </ul>
      </section>
      {adminGate}
    </div>
  );
}
