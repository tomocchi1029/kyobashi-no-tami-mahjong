"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import type { Player } from "@/lib/types";
import RoundTablesView from "@/components/event/RoundTablesView";
import ScoreInputView from "@/components/event/ScoreInputView";
import RankingView from "@/components/event/RankingView";

type Tab = "tables" | "scores" | "ranking";

const TABS: [Tab, string, string][] = [
  ["tables", "卓組", "🎲"],
  ["scores", "点数入力", "✏️"],
  ["ranking", "順位", "🏆"],
];

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("tables");
  const [mounted, setMounted] = useState(false);

  const event = useLiveQuery(() => db.events.get(id), [id]);
  const players = useLiveQuery(
    () => db.players.toArray(),
    [],
    [] as Player[]
  );
  const rounds = useLiveQuery(
    () => db.rounds.where("eventId").equals(id).toArray(),
    [id],
    []
  );
  const tables = useLiveQuery(
    () => db.gameTables.where("eventId").equals(id).toArray(),
    [id],
    []
  );

  useEffect(() => setMounted(true), []);

  if (!mounted || event === undefined) {
    return <div className="py-10 text-center text-sm text-stone-400">読み込み中...</div>;
  }
  if (!event) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-sm text-stone-500">イベントが見つかりません。</p>
        <button className="btn-secondary" onClick={() => router.push("/")}>
          一覧に戻る
        </button>
      </div>
    );
  }

  const playersMap = new Map<string, Player>();
  for (const p of players) {
    if (event.playerIds.includes(p.id)) playersMap.set(p.id, p);
  }

  const completedRounds = rounds.filter((r) => {
    const rtables = tables.filter((t) => t.roundId === r.id);
    return rtables.length > 0 && rtables.every((t) => t.scoreEntered);
  }).length;
  const scoredTables = tables.filter((t) => t.scoreEntered).length;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-bold">{event.name}</h1>
          <Link href={`/events/${event.id}/settings`} className="btn-secondary shrink-0">
            ⚙️ ルール
          </Link>
        </div>
        <p className="text-xs text-stone-500">
          👥 {event.playerIds.length}人 ・ 🎲 {rounds.length}回戦中{completedRounds}完了 ・
          卓 {scoredTables}/{tables.length}入力済
        </p>
      </div>

      <div className="sticky top-[52px] z-10 -mx-1 flex gap-1 rounded-md bg-stone-100/80 p-1 backdrop-blur">
        {TABS.map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
    className={`flex-1 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
      tab === key
        ? "bg-white text-stone-900 shadow-sm"
        : "text-stone-500"
    }`}
          >
            <span className="mr-0.5">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {tab === "tables" && (
        <RoundTablesView event={event} playersMap={playersMap} />
      )}
      {tab === "scores" && (
        <ScoreInputView event={event} playersMap={playersMap} />
      )}
      {tab === "ranking" && (
        <RankingView event={event} playersMap={playersMap} />
      )}
    </div>
  );
}
