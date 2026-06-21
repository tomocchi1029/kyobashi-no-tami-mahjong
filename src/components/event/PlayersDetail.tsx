"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { aggregatePlayerStats } from "@/lib/scoreCalculator";
import type { EventConfig, MahjongEvent, Player } from "@/lib/types";

interface Props {
  event: MahjongEvent;
  playersMap: Map<string, Player>;
}

export default function PlayersDetail({ event, playersMap }: Props) {
  const tables = useLiveQuery(
    () => db.gameTables.where("eventId").equals(event.id).toArray(),
    [event.id],
    []
  );

  const scored = tables.filter((t) => t.scoreEntered);
  const stats = aggregatePlayerStats(
    scored,
    event.config,
    event.playerIds
  ).sort((a, b) =>
    event.config.noRate
      ? b.totalMatchPoint - a.totalMatchPoint
      : b.totalMoney - a.totalMoney
  );

  const eventPlayerIds = new Set(event.playerIds);
  const allPlayers = [...playersMap.values()].filter((p) =>
    eventPlayerIds.has(p.id)
  );

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-ink-200/60 bg-white/90 p-3 shadow-soft">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
            👥 選手一覧（{allPlayers.length}人）
          </h3>
          {scored.length > 0 && (
            <span className="text-[10px] text-ink-500">
              {event.config.noRate ? "MP順" : "金額順"}
            </span>
          )}
        </div>
        <ul className="space-y-1.5">
          {stats.map((s, idx) => {
            const player = playersMap.get(s.playerId);
            if (!player) return null;
            return (
              <li
                key={s.playerId}
                className="flex items-center gap-2 rounded-xl bg-ink-50/60 p-2"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                    s.games === 0
                      ? "bg-ink-200 text-ink-500"
                      : idx < 3
                      ? "bg-amber-100 text-amber-700"
                      : "bg-brand-100 text-brand-700"
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-ink-900">
                    {player.name}
                  </div>
                  <div className="flex flex-wrap gap-x-2 text-[10px] text-ink-500">
                    <span>🎮 {s.games}戦</span>
                    <span>
                      📊 {s.games > 0 ? `平均${s.averageRank.toFixed(1)}位` : "—"}
                    </span>
                    <span>
                      ⭐ {s.games > 0 ? `最高${s.bestRank}位` : "—"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  {event.config.noRate ? (
                    <div
                      className={`text-sm font-extrabold tabular-nums ${
                        s.totalMatchPoint >= 0 ? "text-pos" : "text-neg"
                      }`}
                    >
                      {s.totalMatchPoint >= 0 ? "+" : ""}
                      {s.totalMatchPoint.toFixed(1)}
                    </div>
                  ) : (
                    <>
                      <div
                        className={`text-sm font-extrabold tabular-nums ${
                          s.totalMoney >= 0 ? "text-pos" : "text-neg"
                        }`}
                      >
                        {s.totalMoney >= 0 ? "+" : ""}¥{s.totalMoney.toFixed(0)}
                      </div>
                      <div className="text-[10px] text-ink-500 tabular-nums">
                        MP {s.totalMatchPoint >= 0 ? "+" : ""}
                        {s.totalMatchPoint.toFixed(1)}
                      </div>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {allPlayers.length === 0 && (
        <div className="card text-center text-sm text-ink-500">
          <div className="text-3xl">👥</div>
          <p className="mt-2 font-semibold text-ink-700">選手がいません</p>
        </div>
      )}
    </div>
  );
}
