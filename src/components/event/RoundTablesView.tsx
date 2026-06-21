"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { SEATS, type MahjongEvent, type Player } from "@/lib/types";
import { generateRounds, regenerateRound, deleteRound } from "@/lib/tableGenerator";

interface Props {
  event: MahjongEvent;
  playersMap: Map<string, Player>;
  requireAdmin: (action: () => void) => void;
}

export default function RoundTablesView({ event, playersMap, requireAdmin }: Props) {
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
    <div className="space-y-4">
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">回戦を追加</h2>
          <div className="flex items-center gap-1">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 bg-white text-lg font-bold text-ink-600 active:scale-90 active:bg-ink-50"
              onClick={() => setNumberOfRounds((n) => Math.max(1, n - 1))}
              aria-label="減らす"
            >
              −
            </button>
            <span className="w-10 text-center text-lg font-extrabold tabular-nums text-ink-900">
              {numberOfRounds}
            </span>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 bg-white text-lg font-bold text-ink-600 active:scale-90 active:bg-ink-50"
              onClick={() => setNumberOfRounds((n) => Math.min(20, n + 1))}
              aria-label="増やす"
            >
              ＋
            </button>
          </div>
        </div>
        <button
          className="btn-primary w-full"
            onClick={() => requireAdmin(add)}
          disabled={event.playerIds.length < event.config.tableSize}
        >
          ＋ 回戦を追加
        </button>
        {event.playerIds.length < event.config.tableSize && (
          <p className="text-xs text-ink-500">
            選手が{event.config.tableSize}人以上必要です
          </p>
        )}
      </section>

      {rounds.length === 0 ? (
        <div className="card text-center text-sm text-ink-500">
          <div className="text-3xl">🎲</div>
          <p className="mt-2 font-semibold text-ink-700">回戦がありません</p>
          <p className="mt-1 text-xs">「＋ 回戦を追加」を押してください</p>
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
                <h2 className="text-base font-extrabold tracking-tight text-ink-900">
                  第{round.index}回戦
                </h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => requireAdmin(() => regen(round.id))}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-brand-600 active:bg-brand-50"
                  >
                    ↻ 再抽選
                  </button>
                  <button
                    onClick={() => requireAdmin(() => remove(round.id))}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-500 active:bg-red-50"
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
                <p className="rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-600">
                  💤 休み: {restNames}
                </p>
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
        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-700">
          卓 {table.tableNumber}
        </span>
        {table.playerIds.length < config.tableSize && (
          <span className="text-xs text-orange-500">（{table.playerIds.length}人）</span>
        )}
        <span className="flex-1" />
        {table.scoreEntered && <span className="text-base">✅</span>}
      </div>
      {table.playerIds.map((pid, i) => (
        <div key={pid} className="flex items-center gap-2 text-sm">
          <span className="w-5 text-[10px] font-bold text-ink-400">
            {SEATS[i] ?? ""}
          </span>
          <span className="flex-1 truncate text-ink-800">
            {playersMap.get(pid)?.name ?? "?"}
          </span>
          {table.scoreEntered && table.rawScores[i] != null && (
            <span className="font-mono text-xs font-semibold tabular-nums text-ink-700">
              {table.rawScores[i] / 100}
              <span className="ml-0.5 text-[10px] text-ink-300">×100</span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
