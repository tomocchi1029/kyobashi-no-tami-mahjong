"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  type EventConfig,
  type MahjongEvent,
  type Player,
  type TableAssignment,
  type Round,
} from "@/lib/types";
import { computeResults, overallRanking, aggregatePlayerStats } from "@/lib/scoreCalculator";

interface Props {
  event: MahjongEvent;
  playersMap: Map<string, Player>;
}

type Tab = "overall" | "perRound" | "stats";

export default function RankingView({ event, playersMap }: Props) {
  const [tab, setTab] = useState<Tab>("overall");
  const tables = useLiveQuery(
    () => db.gameTables.where("eventId").equals(event.id).toArray(),
    [event.id],
    []
  );
  const rounds = useLiveQuery(
    () => db.rounds.where("eventId").equals(event.id).sortBy("index"),
    [event.id],
    []
  );

  const scored = tables.filter((t) => t.scoreEntered);

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {([
          ["overall", "総合"],
          ["perRound", "回戦別"],
          ["stats", "統計"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
              tab === key
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-600 border border-stone-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overall" && (
        <OverallRanking
          scored={scored}
          config={event.config}
          playerIds={event.playerIds}
          playersMap={playersMap}
        />
      )}
      {tab === "perRound" && (
        <PerRoundResults
          rounds={rounds}
          tables={tables}
          config={event.config}
          playersMap={playersMap}
        />
      )}
      {tab === "stats" && (
        <PlayerStatistics
          scored={scored}
          config={event.config}
          playerIds={event.playerIds}
          playersMap={playersMap}
        />
      )}
    </div>
  );
}

function OverallRanking({
  scored,
  config,
  playerIds,
  playersMap,
}: {
  scored: TableAssignment[];
  config: EventConfig;
  playerIds: string[];
  playersMap: Map<string, Player>;
}) {
  const ranking = overallRanking(scored, config, playerIds);
  if (ranking.every((r) => r.games === 0)) {
    return <Empty msg="まだ点数が入力されていません。" />;
  }
  return (
    <ol className="card space-y-1 p-2">
      {ranking.map((r, i) => (
        <li
          key={r.playerId}
          className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-stone-50"
        >
          <span
            className={`w-7 text-center text-base font-bold tabular-nums ${
              i < 3 ? "text-mahjong-gold" : "text-stone-400"
            }`}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {playersMap.get(r.playerId)?.name ?? "?"}
            </div>
            <div className="text-xs text-stone-400">
              {r.games}戦 ・ MP {r.totalMatchPoint.toFixed(1)}
            </div>
          </div>
          <div className="text-right">
            {config.noRate ? (
              <div
                className={`text-sm font-bold tabular-nums ${
                  r.totalMatchPoint >= 0 ? "text-mahjong-red" : "text-mahjong-blue"
                }`}
              >
                {r.totalMatchPoint >= 0 ? "+" : ""}
                {r.totalMatchPoint.toFixed(1)}pt
              </div>
            ) : (
              <>
                <div
                  className={`text-sm font-bold tabular-nums ${
                    r.totalMoney >= 0 ? "text-mahjong-red" : "text-mahjong-blue"
                  }`}
                >
                  ¥{r.totalMoney.toFixed(0)}
                </div>
                <div className="text-xs text-stone-400 tabular-nums">
                  {r.totalMoney >= 0 ? "+" : ""}
                  {r.totalMoney.toFixed(1)}pt
                </div>
              </>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function PerRoundResults({
  rounds,
  tables,
  config,
  playersMap,
}: {
  rounds: Round[];
  tables: TableAssignment[];
  config: EventConfig;
  playersMap: Map<string, Player>;
}) {
  if (rounds.length === 0) return <Empty msg="回戦がありません。" />;
  const tablesByRound = new Map<string, TableAssignment[]>();
  for (const t of tables) {
    const arr = tablesByRound.get(t.roundId) ?? [];
    arr.push(t);
    tablesByRound.set(t.roundId, arr);
  }
  return (
    <div className="space-y-3">
      {rounds.map((round) => {
        const rtables = (tablesByRound.get(round.id) ?? []).sort(
          (a, b) => a.tableNumber - b.tableNumber
        );
        return (
          <section key={round.id} className="space-y-2">
            <h2 className="px-1 text-sm font-bold">第{round.index}回戦</h2>
            {rtables.map((t) => {
              if (!t.scoreEntered) {
                return (
                  <div key={t.id} className="card p-3 text-xs text-stone-400">
                    卓 {t.tableNumber} - 未入力
                  </div>
                );
              }
              const results = computeResults(t, config);
              return (
                <div key={t.id} className="card space-y-1 p-3">
                  <div className="text-xs font-bold text-stone-500">
                    卓 {t.tableNumber}
                  </div>
                  {results.map((r) => (
                    <div
                      key={r.playerId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="w-6 text-xs tabular-nums">{r.rank}位</span>
                      <span className="flex-1 truncate">
                        {playersMap.get(r.playerId)?.name ?? "?"}
                      </span>
                      <span className="font-mono text-xs text-stone-400 tabular-nums">
                        {r.rawScore / 100}
                      </span>
                      <span className="text-[10px] text-stone-300">×100</span>
                      {config.noRate ? (
                        <span
                          className={`w-16 text-right tabular-nums ${
                            r.matchPoint >= 0 ? "text-mahjong-red" : "text-mahjong-blue"
                          }`}
                        >
                          {r.matchPoint >= 0 ? "+" : ""}
                          {r.matchPoint.toFixed(1)}pt
                        </span>
                      ) : (
                        <span
                          className={`w-16 text-right tabular-nums ${
                            r.money >= 0 ? "text-mahjong-red" : "text-mahjong-blue"
                          }`}
                        >
                          {r.money >= 0 ? "+" : ""}
                          {r.money.toFixed(0)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function PlayerStatistics({
  scored,
  config,
  playerIds,
  playersMap,
}: {
  scored: TableAssignment[];
  config: EventConfig;
  playerIds: string[];
  playersMap: Map<string, Player>;
}) {
  const stats = aggregatePlayerStats(scored, config, playerIds).sort((a, b) =>
    config.noRate
      ? b.totalMatchPoint - a.totalMatchPoint
      : b.totalMoney - a.totalMoney
  );
  if (stats.every((s) => s.games === 0)) {
    return <Empty msg="まだ点数が入力されていません。" />;
  }
  return (
    <div className="space-y-2">
      {stats.map((s) => (
        <div key={s.playerId} className="card space-y-1 p-3">
          <div className="text-sm font-bold">
            {playersMap.get(s.playerId)?.name ?? "?"}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
            <span>🎮 {s.games}戦</span>
            <span>📊 平均{s.averageRank.toFixed(1)}位</span>
            <span>⭐ 最高{s.bestRank}位</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
            <span
              className={
                s.totalMatchPoint >= 0 ? "text-mahjong-red" : "text-mahjong-blue"
              }
            >
              合計MP: {s.totalMatchPoint >= 0 ? "+" : ""}
              {s.totalMatchPoint.toFixed(1)}
            </span>
            {!config.noRate && (
              <span
                className={
                  s.totalMoney >= 0 ? "text-mahjong-red" : "text-mahjong-blue"
                }
              >
                合計: ¥{s.totalMoney.toFixed(0)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="card text-center text-sm text-stone-500">{msg}</div>;
}
