"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import type { Player } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useAdminAction } from "@/lib/useAdminAction";
import RoundTablesView from "@/components/event/RoundTablesView";
import ScoreInputView from "@/components/event/ScoreInputView";
import RankingView from "@/components/event/RankingView";

type Tab = "tables" | "scores" | "ranking";

const ALL_TABS: [Tab, string, string][] = [
  ["tables", "卓組", "🎲"],
  ["scores", "点数入力", "✏️"],
  ["ranking", "順位", "🏆"],
];

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("scores");
  const [mounted, setMounted] = useState(false);

  const { isAdmin } = useAuth();
  const { requireAdmin, adminGate } = useAdminAction();

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

  // Filter visible tabs based on admin status
  const visibleTabs = isAdmin
    ? ALL_TABS
    : ALL_TABS.filter(([k]) => k !== "tables");

  // If not admin and somehow on tables tab, switch to scores
  useEffect(() => {
    if (!isAdmin && tab === "tables") setTab("scores");
  }, [isAdmin, tab]);

  if (!mounted || event === undefined) {
    return (
      <div className="py-16 text-center text-sm text-ink-400">読み込み中…</div>
    );
  }
  if (!event) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-sm text-ink-500">イベントが見つかりません。</p>
        <button
          className="btn-secondary mx-auto"
          onClick={() => router.push("/")}
        >
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
  const totalTables = tables.length;
  const progress = totalTables > 0 ? (scoredTables / totalTables) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-extrabold tracking-tight text-ink-900">
            {event.name}
          </h1>
          {isAdmin && (
            <Link
              href={`/events/${event.id}/settings`}
              className="btn-secondary shrink-0 px-3 py-2"
              aria-label="ルール設定"
            >
              ⚙️ <span className="hidden sm:inline">ルール</span>
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="chip">👥 {event.playerIds.length}人</span>
          <span className="chip-brand">🎲 {rounds.length}回戦</span>
          <span className="chip">
            {scoredTables}/{totalTables}卓完了
          </span>
          {event.config.noRate ? (
            <span className="chip-pos">ノーレート</span>
          ) : (
            <span className="chip">レート {event.config.rate}</span>
          )}
        </div>
        {totalTables > 0 && (
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="sticky top-[60px] z-10 -mx-1 rounded-2xl bg-white/70 p-1 shadow-soft backdrop-blur-md">
        <div className="flex gap-1">
          {visibleTabs.map(([key, label, icon]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold transition-all active:scale-[0.97] ${
                  active
                    ? "bg-brand-600 text-white shadow-glow"
                    : "text-ink-500 hover:bg-ink-100"
                }`}
              >
                <span>{icon}</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "tables" && isAdmin && (
        <RoundTablesView event={event} playersMap={playersMap} requireAdmin={requireAdmin} />
      )}
      {tab === "scores" && (
        <ScoreInputView event={event} playersMap={playersMap} />
      )}
      {tab === "ranking" && (
        <RankingView event={event} playersMap={playersMap} />
      )}
      {adminGate}
    </div>
  );
}
