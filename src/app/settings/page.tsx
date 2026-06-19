"use client";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">設定</h1>

      <section className="card space-y-2">
        <h2 className="section-title">アプリについて</h2>
        <p className="text-sm text-stone-600">
          京橋の民セット麻雀記録ツール  v0.1.0
        </p>
        <p className="text-xs text-stone-500">
          Next.js + IndexedDB で構築された完全クライアントサイドアプリです。
          データはこの端末のブラウザにのみ保存され、サーバーには送信されません。
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="section-title">使い方</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-600">
          <li>
            <span className="font-medium">選手タブ</span>で参加者を追加（最大30人）
          </li>
          <li>
            <span className="font-medium">イベントタブ</span> → 「新規イベント」でイベント作成
            （選手選択・回戦数・ルール設定）
          </li>
          <li>
            イベント詳細画面で
            <span className="font-medium">卓組</span>（自動抽選）・
            <span className="font-medium">点数入力</span>（手動 ×100）・
            <span className="font-medium">順位</span>（ランキング）を確認
          </li>
          <li>
            点数は「配給原点 × 人数」になるよう自動計算されます
            （3人入力で4人目は自動入力）
          </li>
        </ol>
      </section>

      <section className="card space-y-2">
        <h2 className="section-title">注意事項</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-stone-500">
          <li>ブラウザのキャッシュを消去するとデータも削除されます</li>
          <li>データのバックアップ機能は現在ありません（今後のアップデート予定）</li>
          <li>複数端末間の同期には対応していません</li>
        </ul>
      </section>
    </div>
  );
}
