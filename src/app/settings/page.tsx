"use client";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
        設定
      </h1>

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
    </div>
  );
}
