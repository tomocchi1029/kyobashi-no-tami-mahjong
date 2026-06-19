"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { SEATS, type EventConfig, type MahjongEvent, type Player, type TableAssignment } from "@/lib/types";
import { computeResults } from "@/lib/scoreCalculator";
import { updateTableScores } from "@/lib/dataService";

interface Props {
  event: MahjongEvent;
  playersMap: Map<string, Player>;
}

export default function ScoreInputView({ event, playersMap }: Props) {
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

  const [roundId, setRoundId] = useState<string>("");

  useEffect(() => {
    if (!roundId && rounds.length > 0) setRoundId(rounds[0].id);
  }, [rounds, roundId]);

  const roundTables = tables
    .filter((t) => t.roundId === roundId)
    .sort((a, b) => a.tableNumber - b.tableNumber);

  if (rounds.length === 0) {
    return (
      <div className="card text-center text-sm text-ink-500">
        <div className="text-3xl">✏️</div>
        <p className="mt-2 font-semibold text-ink-700">回戦がありません</p>
        <p className="mt-1 text-xs">卓組タブから回戦を追加してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl bg-white/70 p-1 shadow-soft backdrop-blur">
        <div className="flex min-w-min gap-1">
          {rounds.map((r) => {
            const active = roundId === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRoundId(r.id)}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95 ${
                  active
                    ? "bg-brand-600 text-white shadow-glow"
                    : "text-ink-500 hover:bg-ink-100"
                }`}
              >
                第{r.index}回戦
              </button>
            );
          })}
        </div>
      </div>

      {roundTables.length === 0 ? (
        <div className="card text-center text-sm text-ink-500">
          回戦を選択してください
        </div>
      ) : (
        <div className="space-y-3">
          {roundTables.map((t) => (
            <ScoreInputSection
              key={t.id}
              table={t}
              playersMap={playersMap}
              config={event.config}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreInputSection({
  table,
  playersMap,
  config,
}: {
  table: TableAssignment;
  playersMap: Map<string, Player>;
  config: EventConfig;
}) {
  const [scores, setScores] = useState<string[]>(
    table.rawScores.map((s) => String(s / 100))
  );
  const [chips, setChips] = useState<string[]>(
    table.chipCounts.map(String)
  );
  const [dirty, setDirty] = useState(false);
  const prevSig = useRef(
    table.rawScores.join(",") + "|" + table.chipCounts.join(",")
  );

  const savedSig = table.rawScores.join(",") + "|" + table.chipCounts.join(",");

  useEffect(() => {
    if (savedSig !== prevSig.current) {
      prevSig.current = savedSig;
      if (!dirty) {
        setScores(table.rawScores.map((s) => String(s / 100)));
        setChips(table.chipCounts.map(String));
      }
    }
  }, [savedSig, dirty, table.rawScores, table.chipCounts]);

  const n = table.playerIds.length;
  const parsedScores = scores.map((s) => parseInt(s, 10) * 100);
  const parsedChips = chips.map((c) => parseInt(c, 10));

  // auto-compute missing score
  const filledIdx = parsedScores
    .map((v, i) => (Number.isFinite(v) ? i : -1))
    .filter((i) => i >= 0);
  const emptyIdx = [...Array(n).keys()].filter((i) => !filledIdx.includes(i));
  const isAuto = emptyIdx.length === 1 && filledIdx.length === n - 1;
  let autoRaw = 0;
  if (isAuto) {
    const sum = filledIdx.reduce((acc, i) => acc + parsedScores[i], 0);
    autoRaw = config.startingPoints * n - sum;
  }

  const allScoreValues = scores.map((s, i) => {
    if (isAuto && emptyIdx[0] === i) return autoRaw;
    return parsedScores[i];
  });

  const valid =
    scores.length === n &&
    chips.length === n &&
    allScoreValues.every((v) => Number.isFinite(v)) &&
    parsedChips.every((v) => Number.isFinite(v));

  const previewTable: TableAssignment = {
    ...table,
    rawScores: allScoreValues,
    chipCounts: parsedChips,
    scoreEntered: true,
  };
  const results = valid ? computeResults(previewTable, config) : [];

  async function save() {
    if (!valid) return;
    await updateTableScores(
      table.id,
      allScoreValues,
      parsedChips,
      true
    );
    prevSig.current = allScoreValues.join(",") + "|" + parsedChips.join(",");
    setDirty(false);
  }

  return (
    <section className="card space-y-3 p-3">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-700">
          卓 {table.tableNumber}
        </span>
        {table.scoreEntered && (
          <span className="text-[11px] font-semibold text-emerald-600">✅ 入力済み</span>
        )}
      </div>

      <div className="space-y-2">
        {table.playerIds.map((pid, i) => {
          const isAutoField = isAuto && emptyIdx[0] === i;
          const displayVal = isAutoField ? String(Math.round(autoRaw / 100)) : scores[i];
          return (
            <div key={pid} className="flex items-center gap-2">
              <span className="w-5 text-[10px] font-bold text-ink-400">
                {SEATS[i] ?? ""}
              </span>
              <span className="w-24 shrink-0 truncate text-sm font-semibold text-ink-800">
                {playersMap.get(pid)?.name ?? "?"}
              </span>
              <div className="flex-1">
                <input
                  type="number"
                  inputMode="numeric"
                  className={`input w-full min-h-[44px] text-center font-mono text-base tabular-nums ${isAutoField ? "bg-ink-100 text-ink-500" : ""}`}
                  placeholder={isAutoField ? "自動" : "×100"}
                  value={displayVal ?? ""}
                  onChange={(e) => {
                    setScores((prev) => {
                      const next = [...prev];
                      next[i] = e.target.value;
                      return next;
                    });
                    setDirty(true);
                  }}
                />
              </div>
              {!config.noRate && (
                <input
                  type="number"
                  inputMode="numeric"
                  className="input w-16 min-h-[44px] text-center font-mono text-base tabular-nums"
                  placeholder="チップ"
                  value={chips[i] ?? ""}
                  onChange={(e) => {
                    setChips((prev) => {
                      const next = [...prev];
                      next[i] = e.target.value;
                      return next;
                    });
                    setDirty(true);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {valid && results.length > 0 && (
        <div className="rounded-xl bg-gradient-to-br from-brand-50 to-ink-50 p-2.5">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
            精算プレビュー
          </div>
          <ul className="space-y-1">
            {results.map((r) => (
              <li
                key={r.playerId}
                className="flex items-center gap-2 text-xs"
              >
                <span className="w-6 font-extrabold tabular-nums text-ink-700">
                  {r.rank}
                </span>
                <span className="flex-1 truncate font-semibold text-ink-800">
                  {playersMap.get(r.playerId)?.name ?? "?"}
                </span>
                <span className="font-mono tabular-nums text-ink-600">
                  {r.matchPoint.toFixed(1)}pt
                </span>
                {!config.noRate && (
                  <span
                    className={`w-16 text-right font-extrabold tabular-nums ${
                      r.money >= 0 ? "text-pos" : "text-neg"
                    }`}
                  >
                    {r.money >= 0 ? "+" : ""}¥{r.money.toFixed(0)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        className={`btn w-full py-3 ${valid ? "btn-primary" : "btn-secondary opacity-50"}`}
        onClick={save}
        disabled={!valid}
      >
        {dirty ? "保存する" : table.scoreEntered ? "更新する" : "保存する"}
      </button>
    </section>
  );
}
