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

  return (
    <div className="space-y-4">
      <div className="flex">
        {rounds.length <= 4 ? (
          <div className="flex flex-1 flex-wrap gap-1">
            {rounds.map((r) => (
              <button
                key={r.id}
                onClick={() => setRoundId(r.id)}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-medium ${
                  roundId === r.id
                    ? "bg-stone-900 text-white"
                    : "bg-white text-stone-600 border border-stone-200"
                }`}
              >
                第{r.index}
              </button>
            ))}
          </div>
        ) : (
          <select
            className="input flex-1"
            value={roundId}
            onChange={(e) => setRoundId(e.target.value)}
          >
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                第{r.index}回戦
              </option>
            ))}
          </select>
        )}
      </div>

      {roundTables.length === 0 ? (
        <div className="card text-center text-sm text-stone-500">
          回戦を選択してください。
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

  // auto-compute missing score (render-time, no state)
  const filledIdx = parsedScores.map((v, i) => (Number.isFinite(v) ? i : -1)).filter((i) => i >= 0);
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
    <section className="card space-y-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">卓 {table.tableNumber}</span>
        {table.scoreEntered && (
          <span className="text-xs text-green-600">入力済み</span>
        )}
      </div>

      {table.playerIds.map((pid, i) => {
        const isAutoField = isAuto && emptyIdx[0] === i;
        const displayVal = isAutoField ? String(Math.round(autoRaw / 100)) : scores[i];
        return (
          <div key={pid} className="flex items-center gap-2 text-sm">
            <span className="w-4 text-xs text-stone-400">{SEATS[i] ?? ""}</span>
            <span className="w-20 truncate">{playersMap.get(pid)?.name ?? "?"}</span>
            <span className="flex-1" />
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                className={`input w-28 min-h-[44px] text-right tabular-nums ${isAutoField ? "bg-stone-100 text-stone-500" : ""}`}
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
            <span className="w-7 text-xs text-stone-400 text-center">×100</span>
            {!config.noRate && (
              <input
              type="number"
              inputMode="numeric"
              className="input w-20 min-h-[44px] text-right tabular-nums"
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
      )})}

      {valid && results.length > 0 && (
        <div className="mt-1 rounded-md bg-stone-50 p-2">
          <div className="mb-1 text-xs font-bold text-stone-500">精算プレビュー</div>
          <ul className="space-y-0.5">
            {results.map((r) => (
              <li
                key={r.playerId}
                className="flex items-center gap-2 text-xs"
              >
                <span className="w-6 tabular-nums">{r.rank}位</span>
                <span className="flex-1 truncate">
                  {playersMap.get(r.playerId)?.name ?? "?"}
                </span>
                <span className="text-stone-500 tabular-nums">
                  {r.matchPoint.toFixed(1)}pt
                </span>
                {!config.noRate && (
                  <span
                    className={`w-16 text-right font-semibold tabular-nums ${
                      r.money >= 0 ? "text-mahjong-red" : "text-mahjong-blue"
                    }`}
                  >
                    ¥{r.money.toFixed(0)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="btn-primary w-full" onClick={save} disabled={!valid}>
        保存
      </button>
    </section>
  );
}
