"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export default function EventsPage() {
  const events = useLiveQuery(() => db.events.orderBy("createdAt").reverse().toArray(), [], []);
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

  async function deleteEvent(id: string) {
    if (!confirm("このイベントを削除しますか？関連する回戦・卓も削除されます。")) return;
    const roundIds = (await db.rounds.where("eventId").equals(id).toArray()).map((r) => r.id);
    await db.gameTables.where("roundId").anyOf(roundIds).delete();
    await db.rounds.where("eventId").equals(id).delete();
    await db.events.delete(id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">イベント一覧</h1>
        <Link href="/events/new" className="btn-primary">
          ＋ 新規イベント
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card text-center text-stone-500">
          <p className="py-8">イベントがありません。</p>
          <p className="pb-4 text-sm">「新規イベント」から作成してください。</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => {
            const rc = roundsByEvent.get(ev.id) ?? 0;
            const tc = tablesByEvent.get(ev.id) ?? { total: 0, scored: 0 };
            const done = tc.total > 0 && tc.scored === tc.total;
            return (
              <li key={ev.id} className="card flex items-center gap-3">
                <Link href={`/events/${ev.id}`} className="flex-1">
                  <div className="font-semibold">{ev.name}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
                    <span>👥 {ev.playerIds.length}人</span>
                    <span>🎲 {rc}回戦</span>
                    {tc.total > 0 && (
                      <span>
                        {done ? "✅" : "⏳"} {tc.scored}/{tc.total}卓完了
                      </span>
                    )}
                    <span>
                      {ev.config.noRate ? "ノーレート" : `レート ${ev.config.rate}`}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => deleteEvent(ev.id)}
                  className="text-xs text-stone-400 hover:text-red-600"
                  aria-label="削除"
                >
                  削除
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
