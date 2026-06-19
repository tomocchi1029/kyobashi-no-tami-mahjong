"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { SEATS, type MahjongEvent, type Player } from "@/lib/types";
import { generateRounds, regenerateRound, deleteRound } from "@/lib/tableGenerator";

interface Props {
  event: MahjongEvent;
  playersMap: Map<string, Player>;
}

export default function RoundTablesView({ event, playersMap }: Props) {
  const rounds = useLiveQuery(
    () => db.rounds.where("eventId").equals(event.id).sortBy("index"),
    [event.id],
    []
  );
  const tables = useLiveQuery(
    () => db.gameTables.where("eventId").equals(event.id).toArray(),
    [event.id],
    []
  );

  const [numberOfRounds, setNumberOfRounds] = useState(1);

  async function add() {
    if (event.playerIds.length < event.config.tableSize) return;
    await generateRounds(event.id, event.playerIds, event.config, numberOfRounds);
  }

  async function regen(roundId: string) {
    if (!confirm("この回戦の卓組を再抽選しますか？入力済みの点数はリセットされます。")) return;
    await regenerateRound(roundId, event.id, event.playerIds, event.config);
  }

  async function remove(roundId: string) {
    if (!confirm("この回戦を削除しますか？")) return;
    await deleteRound(roundId);
  }

  const tablesByRound = new Map<string, typeof tables>();
  for (const t of tables) {
    const arr = tablesByRound.get(t.roundId) ?? [];
    arr.push(t);
    tablesByRound.set(t.roundId, arr);
  }

  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <h2 className="section-title">回戦を追加</h2>
        <div className="label-row">
          <span>追加する回戦数: {numberOfRounds}</span>
          <div className="flex items-center gap-1">
            <button
              className="btn-secondary px-2.5"
              onClick={() => setNumberOfRounds((n) => Math.max(1, n - 1))}
            >
              −
            </button>
            <span className="w-10 text-center tabular-nums">{numberOfRounds}</span>
            <button
              className="btn-secondary px-2.5"
              onClick={() => setNumberOfRounds((n) => Math.min(20, n + 1))}
            >
              ＋
            </button>
          </div>
        </div>
        <button
          className="btn-primary w-full"
          onClick={add}
          disabled={event.playerIds.length < event.config.tableSize}
        >
          回戦を追加
        </button>
        {event.playerIds.length < event.config.tableSize && (
          <p className="text-xs text-stone-400">
            選手が{event.config.tableSize}人以上必要です。
          </p>
        )}
      </section>

      {rounds.length === 0 ? (
        <div className="card text-center text-sm text-stone-500">
          回戦がありません。上から追加してください。
        </div>
      ) : (
        rounds.map((round) => {
          const rtables = (tablesByRound.get(round.id) ?? []).sort(
            (a, b) => a.tableNumber - b.tableNumber
          );
          const restNames = round.restPlayerIds
            .map((pid) => playersMap.get(pid)?.name ?? "?")
            .join("・");
          return (
            <section key={round.id} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold">第{round.index}回戦</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => regen(round.id)}
                    className="text-xs text-stone-500 underline"
                  >
                    再抽選
                  </button>
                  <button
                    onClick={() => remove(round.id)}
                    className="text-xs text-red-500 underline"
                  >
                    削除
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {rtables.map((t) => (
                  <TableCard key={t.id} table={t} playersMap={playersMap} config={event.config} />
                ))}
              </div>
              {restNames && (
                <p className="px-1 text-xs text-stone-400">休み: {restNames}</p>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

function TableCard({
  table,
  playersMap,
  config,
}: {
  table: import("@/lib/types").TableAssignment;
  playersMap: Map<string, Player>;
  config: import("@/lib/types").EventConfig;
}) {
  return (
    <div className="card space-y-1.5 p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold">卓 {table.tableNumber}</span>
        {table.playerIds.length < config.tableSize && (
          <span className="text-xs text-orange-500">（{table.playerIds.length}人）</span>
        )}
        <span className="flex-1" />
        {table.scoreEntered && <span className="text-green-600">✅</span>}
      </div>
      {table.playerIds.map((pid, i) => (
        <div key={pid} className="flex items-center gap-2 text-sm">
          <span className="w-4 text-xs text-stone-400">{SEATS[i] ?? ""}</span>
          <span className="flex-1 truncate">{playersMap.get(pid)?.name ?? "?"}</span>
          {table.scoreEntered && table.rawScores[i] != null && (
            <span className="font-mono text-xs text-stone-500 tabular-nums">
              {table.rawScores[i] / 100}
            </span>
          )}
          {table.scoreEntered && table.rawScores[i] != null && (
            <span className="text-[10px] text-stone-300">×100</span>
          )}
        </div>
      ))}
    </div>
  );
}
