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
      <div className="rounded-2xl bg-white/70 p-1 shadow-soft backdrop-blur">
        <div className="flex gap-1">
          {([
            ["overall", "総合", "🏆"],
            ["perRound", "回戦別", "📊"],
            ["stats", "統計", "📈"],
          ] as [Tab, string, string][]).map(([key, label, icon]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-all active:scale-[0.97] ${
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
    return <Empty msg="まだ点数が入力されていません" />;
  }
  return (
    <ol className="space-y-2">
      {ranking.map((r, i) => {
        const isTop3 = i < 3;
        const medal = ["🥇", "🥈", "🥉"][i];
        return (
          <li
            key={r.playerId}
            className={`card flex items-center gap-3 p-3 ${
              isTop3 ? "ring-2 ring-amber-300/60" : ""
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                isTop3
                  ? "bg-amber-100 text-amber-700"
                  : "bg-ink-100 text-ink-500"
              }`}
            >
              {medal ?? i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-ink-900">
                {playersMap.get(r.playerId)?.name ?? "?"}
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-ink-500">
                {r.games}戦 ・ MP {r.totalMatchPoint.toFixed(1)}
              </div>
            </div>
            <div className="text-right">
              {config.noRate ? (
                <div
                  className={`text-base font-extrabold tabular-nums ${
                    r.totalMatchPoint >= 0 ? "text-pos" : "text-neg"
                  }`}
                >
                  {r.totalMatchPoint >= 0 ? "+" : ""}
                  {r.totalMatchPoint.toFixed(1)}
                </div>
              ) : (
                <>
                  <div
                    className={`text-base font-extrabold tabular-nums ${
                      r.totalMoney >= 0 ? "text-pos" : "text-neg"
                    }`}
                  >
                    {r.totalMoney >= 0 ? "+" : ""}¥{r.totalMoney.toFixed(0)}
                  </div>
                  <div className="text-[11px] font-medium text-ink-500 tabular-nums">
                    {r.totalMoney >= 0 ? "+" : ""}
                    {r.totalMoney.toFixed(1)}pt
                  </div>
                </>
              )}
            </div>
          </li>
        );
      })}
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
  if (rounds.length === 0) return <Empty msg="回戦がありません" />;
  const tablesByRound = new Map<string, TableAssignment[]>();
  for (const t of tables) {
    const arr = tablesByRound.get(t.roundId) ?? [];
    arr.push(t);
    tablesByRound.set(t.roundId, arr);
  }
  return (
    <div className="space-y-4">
      {rounds.map((round) => {
        const rtables = (tablesByRound.get(round.id) ?? []).sort(
          (a, b) => a.tableNumber - b.tableNumber
        );
        return (
          <section key={round.id} className="space-y-2">
            <h2 className="px-1 text-base font-extrabold tracking-tight text-ink-900">
              第{round.index}回戦
            </h2>
            {rtables.map((t) => {
              if (!t.scoreEntered) {
                return (
                  <div key={t.id} className="card p-3 text-xs text-ink-500">
                    卓 {t.tableNumber} ・ 未入力
                  </div>
                );
              }
              const results = computeResults(t, config);
              return (
                <div key={t.id} className="card space-y-1 p-3">
                  <div className="mb-1 inline-flex rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                    卓 {t.tableNumber}
                  </div>
                  {results.map((r) => (
                    <div
                      key={r.playerId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="w-6 text-xs font-extrabold tabular-nums text-ink-500">
                        {r.rank}
                      </span>
                      <span className="flex-1 truncate font-semibold text-ink-800">
                        {playersMap.get(r.playerId)?.name ?? "?"}
                      </span>
                      <span className="font-mono text-xs font-semibold tabular-nums text-ink-600">
                        {r.rawScore / 100}
                        <span className="ml-0.5 text-[10px] text-ink-300">×100</span>
                      </span>
                      {config.noRate ? (
                        <span
                          className={`w-16 text-right text-sm font-extrabold tabular-nums ${
                            r.matchPoint >= 0 ? "text-pos" : "text-neg"
                          }`}
                        >
                          {r.matchPoint >= 0 ? "+" : ""}
                          {r.matchPoint.toFixed(1)}pt
                        </span>
                      ) : (
                        <span
                          className={`w-16 text-right text-sm font-extrabold tabular-nums ${
                            r.money >= 0 ? "text-pos" : "text-neg"
                          }`}
                        >
                          {r.money >= 0 ? "+" : ""}¥{r.money.toFixed(0)}
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
    return <Empty msg="まだ点数が入力されていません" />;
  }
  return (
    <div className="space-y-2">
      {stats.map((s) => (
        <div key={s.playerId} className="card space-y-1.5 p-3">
          <div className="font-bold text-ink-900">
            {playersMap.get(s.playerId)?.name ?? "?"}
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="chip">🎮 {s.games}戦</span>
            <span className="chip">📊 平均{s.averageRank.toFixed(1)}位</span>
            <span className="chip">⭐ 最高{s.bestRank}位</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span
              className={`font-extrabold tabular-nums ${
                s.totalMatchPoint >= 0 ? "text-pos" : "text-neg"
              }`}
            >
              合計MP: {s.totalMatchPoint >= 0 ? "+" : ""}
              {s.totalMatchPoint.toFixed(1)}
            </span>
            {!config.noRate && (
              <span
                className={`font-extrabold tabular-nums ${
                  s.totalMoney >= 0 ? "text-pos" : "text-neg"
                }`}
              >
                合計: {s.totalMoney >= 0 ? "+" : ""}¥{s.totalMoney.toFixed(0)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="card text-center text-sm text-ink-500">
      <div className="text-3xl">🏆</div>
      <p className="mt-2 font-semibold text-ink-700">{msg}</p>
    </div>
  );
}
