"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { deleteEvent } from "@/lib/dataService";

export default function EventsPage() {
  const events = useLiveQuery(
    () => db.events.orderBy("createdAt").reverse().toArray(),
    [],
    []
  );
  const rounds = useLiveQuery(() => db.rounds.toArray(), [], []);
  const tables = useLiveQuery(() => db.gameTables.toArray(), [], []);

  const roundsByEvent = new Map<string, number>();
  for (const r of rounds) {
    roundsByEvent.set(r.eventId, (roundsByEvent.get(r.eventId) ?? 0) + 1);
  }
  const tablesByEvent = new Map<string, { total: number; scored: number }>();
  for (const t of tables) {
    const cur = tablesByEvent.get(t.eventId) ?? { total: 0, scored: 0 };
    cur.total += 1;
    if (t.scoreEntered) cur.scored += 1;
    tablesByEvent.set(t.eventId, cur);
  }

  async function handleDelete(id: string) {
    if (!confirm("このイベントを削除しますか？関連する回戦・卓も削除されます。")) return;
    await deleteEvent(id);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
            イベント
          </h1>
          <p className="text-xs text-ink-500">
            クラウド同期・複数端末で共有
          </p>
        </div>
        <Link href="/events/new" className="btn-primary shadow-glow">
          ＋ 新規
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card text-center text-ink-500">
          <div className="text-4xl">🀄</div>
          <p className="mt-3 font-semibold text-ink-700">イベントがありません</p>
          <p className="mt-1 text-sm">「＋ 新規」から作成してください</p>
          <Link href="/events/new" className="btn-primary mt-5">
            ＋ 新しいイベントを作成
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => {
            const rc = roundsByEvent.get(ev.id) ?? 0;
            const tc = tablesByEvent.get(ev.id) ?? { total: 0, scored: 0 };
            const done = tc.total > 0 && tc.scored === tc.total;
            const progress =
              tc.total > 0 ? (tc.scored / tc.total) * 100 : 0;
            return (
              <li
                key={ev.id}
                className="card relative overflow-hidden active:scale-[0.99] transition-transform"
              >
                <Link href={`/events/${ev.id}`} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-ink-900">{ev.name}</div>
                    {done && <span className="text-lg">✅</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="chip">👥 {ev.playerIds.length}人</span>
                    <span className="chip-brand">🎲 {rc}回戦</span>
                    {tc.total > 0 && (
                      <span className="chip">
                        {tc.scored}/{tc.total}卓
                      </span>
                    )}
                    {ev.config.noRate ? (
                      <span className="chip-pos">ノーレート</span>
                    ) : (
                      <span className="chip">レート {ev.config.rate}</span>
                    )}
                  </div>
                  {tc.total > 0 && (
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </Link>
                <button
                  onClick={() => handleDelete(ev.id)}
                  className="absolute right-2 top-2 rounded-full p-2 text-ink-300 hover:bg-red-50 hover:text-red-500"
                  aria-label="削除"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
