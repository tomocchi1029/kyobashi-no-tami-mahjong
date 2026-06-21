"use client";

import { useState } from "react";
import {
  SEATS,
  type MahjongEvent,
  type Player,
  type TableAssignment,
} from "@/lib/types";
import { saveTableAssignments } from "@/lib/dataService";

interface Props {
  event: MahjongEvent;
  roundId: string;
  initialTables: TableAssignment[];
  initialRestPlayerIds: string[];
  playersMap: Map<string, Player>;
  allPlayerIds: string[];
  onClose: () => void;
  onSaved: () => void;
}

interface PendingMove {
  fromTableIdx: number;
  fromSeat: number;
  playerId: string;
}

export default function TableEditor({
  event,
  roundId,
  initialTables,
  initialRestPlayerIds,
  playersMap,
  allPlayerIds,
  onClose,
  onSaved,
}: Props) {
  const [tables, setTables] = useState<TableAssignment[]>(
    initialTables.map((t) => ({ ...t, playerIds: [...t.playerIds] }))
  );
  const [restIds, setRestIds] = useState<string[]>([...initialRestPlayerIds]);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [saving, setSaving] = useState(false);

  // 卓を新規追加（空卓）
  function addEmptyTable() {
    const tempId = `temp-${crypto.randomUUID()}`;
    const newTable: TableAssignment = {
      id: tempId,
      eventId: event.id,
      roundId,
      tableNumber: tables.length + 1,
      playerIds: [],
      rawScores: [],
      chipCounts: [],
      scoreEntered: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setTables((prev) => [...prev, newTable]);
  }

  // 卓を削除
  function removeTable(tableIdx: number) {
    setTables((prev) => {
      const removed = prev[tableIdx];
      // 削除した卓のメンバーは未割当に戻す
      setRestIds((r) => [...r, ...removed.playerIds]);
      return prev.filter((_, i) => i !== tableIdx);
    });
  }

  // 席の選手をタップ（移動元の選択 or 移動先の選択）
  function onSeatTap(tableIdx: number, seat: number) {
    const playerId = tables[tableIdx].playerIds[seat];
    if (!playerId) return;

    if (!pending) {
      // 移動元を選択
      setPending({ fromTableIdx: tableIdx, fromSeat: seat, playerId });
    } else {
      // 移動先を選択（同じ席ならキャンセル）
      if (
        pending.fromTableIdx === tableIdx &&
        pending.fromSeat === seat
      ) {
        setPending(null);
        return;
      }
      movePlayer(pending, tableIdx, seat);
      setPending(null);
    }
  }

  // 選手を移動
  function movePlayer(
    from: PendingMove,
    toTableIdx: number,
    toSeat: number
  ) {
    setTables((prev) => {
      const next = prev.map((t) => ({ ...t, playerIds: [...t.playerIds] }));
      const fromTable = next[from.fromTableIdx];
      const toTable = next[toTableIdx];
      // 移動先に既にいる選手と入れ替え
      const displaced = toTable.playerIds[toSeat] ?? null;
      fromTable.playerIds[from.fromSeat] = displaced;
      toTable.playerIds[toSeat] = from.playerId;
      return next;
    });
  }

  // 未割当プールの選手をタップ
  function onRestTap(playerId: string) {
    if (!pending) {
      // 既に未割当プールにいる場合は何もしない
      if (restIds.includes(playerId)) return;
      // 既に卓にいる場合は未割当に戻す
      let wasInTable = false;
      const newTables = tables.map((t) => {
        if (t.playerIds.includes(playerId)) {
          wasInTable = true;
          return { ...t, playerIds: t.playerIds.filter((id) => id !== playerId) };
        }
        return t;
      });
      if (wasInTable) {
        setTables(newTables);
        setRestIds((r) => [...r, playerId]);
      } else {
        setRestIds((r) => [...r, playerId]);
      }
      return;
    }
    // 移動モード：選択中の選手と未割当選手を入れ替え
    setTables((prev) => {
      const next = prev.map((t) => ({ ...t, playerIds: [...t.playerIds] }));
      const fromTable = next[pending.fromTableIdx];
      // 選択中選手と未割当選手を入れ替え
      fromTable.playerIds[pending.fromSeat] = playerId;
      // 未割当には選択されていた選手を入れる
      const movedPlayerId = pending.playerId;
      const newRest = restIds.filter((id) => id !== playerId);
      newRest.push(movedPlayerId);
      setRestIds(newRest);
      return next;
    });
    setPending(null);
  }

  // 卓に選手を追加（席指定なし、空席に自動配置）
  function onAddToTable(playerId: string, tableIdx: number) {
    setTables((prev) => {
      const next = prev.map((t) => ({ ...t, playerIds: [...t.playerIds] }));
      const t = next[tableIdx];
      const emptyIdx = t.playerIds.findIndex((id) => !id);
      if (emptyIdx >= 0) {
        t.playerIds[emptyIdx] = playerId;
      } else if (t.playerIds.length < 4) {
        t.playerIds.push(playerId);
        t.rawScores.push(0);
        t.chipCounts.push(0);
      } else {
        return prev;
      }
      setRestIds((r) => r.filter((id) => id !== playerId));
      return next;
    });
  }

  // 卓の席を削除（未割当に戻す）
  function onRemoveFromTable(tableIdx: number, seat: number) {
    setTables((prev) => {
      const next = prev.map((t) => ({ ...t, playerIds: [...t.playerIds] }));
      const t = next[tableIdx];
      if (!t.playerIds[seat]) return prev;
      const removed = t.playerIds[seat];
      t.playerIds[seat] = "";
      setRestIds((r) => [...r, removed]);
      return next;
    });
  }

  // 取消
  function clearPending() {
    setPending(null);
  }

  // 保存
  async function save() {
    setSaving(true);
    try {
      // 空席のある卓はそのまま、空の卓は除外
      const cleanedTables = tables
        .filter((t) => t.playerIds.some((id) => id))
        .map((t) => {
          // プレイヤー数に合わせてrawScores/chipCountsを揃える
          const n = t.playerIds.length;
          return {
            ...t,
            rawScores: t.rawScores.slice(0, n).concat(Array(Math.max(0, n - t.rawScores.length)).fill(0)),
            chipCounts: t.chipCounts.slice(0, n).concat(Array(Math.max(0, n - t.chipCounts.length)).fill(0)),
          };
        });
      await saveTableAssignments(roundId, cleanedTables, restIds);
      onSaved();
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  // イベント参加選手で未割当プールの選手
  const allEventPlayerIds = allPlayerIds;
  const restPlayerNames = restIds
    .map((id) => playersMap.get(id)?.name ?? "?");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-4 shadow-lift sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-900">
            <span className="text-xl">✏️</span>
            卓組を編集
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100"
            aria-label="閉じる"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-3 text-xs text-ink-600">
          選手をタップして選択 → 移動先の席をタップ
          {pending && (
            <button
              onClick={clearPending}
              className="ml-2 text-xs text-brand-600 underline"
            >
              選択解除
            </button>
          )}
        </p>

        {/* 未割当プール */}
        <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700">
            💤 待機（{restIds.length}人）
          </h3>
          {restIds.length === 0 ? (
            <p className="text-xs text-ink-500">全員配置済みです</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {restIds.map((pid, i) => (
                <button
                  key={pid}
                  onClick={() => onRestTap(pid)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                    pending
                      ? "bg-white text-amber-800 ring-2 ring-amber-400"
                      : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                  }`}
                >
                  {playersMap.get(pid)?.name ?? "?"}
                  {!pending && (
                    <span className="text-amber-500">→</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {pending && (
            <p className="mt-2 text-[10px] text-amber-700">
              移動先を選んでください
            </p>
          )}
        </section>

        {/* 卓一覧 */}
        <div className="space-y-3">
          {tables.map((table, tIdx) => (
            <div
              key={table.id}
              className="rounded-2xl border border-ink-200 bg-white p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                  卓 {tIdx + 1}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-ink-500">
                    {table.playerIds.filter(Boolean).length}人
                  </span>
                  <button
                    onClick={() => removeTable(tIdx)}
                    className="rounded-full p-1.5 text-ink-300 hover:bg-red-50 hover:text-red-500"
                    aria-label="卓を削除"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                {Array.from({ length: 4 }).map((_, seat) => {
                  const playerId = table.playerIds[seat];
                  const isPending = pending?.fromTableIdx === tIdx && pending?.fromSeat === seat;
                  return (
                    <div
                      key={seat}
                      className={`flex items-center gap-2 rounded-xl border-2 p-2 transition-colors ${
                        isPending
                          ? "border-brand-500 bg-brand-50"
                          : playerId
                          ? "border-ink-200 bg-white"
                          : "border-dashed border-ink-200 bg-ink-50/40"
                      }`}
                    >
                      <span className="w-5 text-[10px] font-bold text-ink-400">
                        {SEATS[seat] ?? ""}
                      </span>
                      {playerId ? (
                        <>
                          <button
                            onClick={() => onSeatTap(tIdx, seat)}
                            className={`flex-1 text-left text-sm font-bold ${
                              isPending ? "text-brand-700" : "text-ink-800"
                            }`}
                          >
                            {playersMap.get(playerId)?.name ?? "?"}
                            {isPending && (
                              <span className="ml-1 text-[10px]">（選択中）</span>
                            )}
                          </button>
                          <button
                            onClick={() => onRemoveFromTable(tIdx, seat)}
                            className="rounded-full p-1 text-ink-300 hover:bg-red-50 hover:text-red-500"
                            aria-label="未割当に戻す"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3.5 w-3.5"
                            >
                              <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => pending && onSeatTap(tIdx, seat)}
                          disabled={!pending}
                          className={`flex-1 text-left text-xs ${
                            pending
                              ? "text-brand-600 hover:bg-brand-100"
                              : "text-ink-300"
                          }`}
                        >
                          {pending ? "← ここに移動" : "空席"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addEmptyTable}
          className="mt-3 w-full rounded-xl border-2 border-dashed border-ink-200 py-3 text-sm font-bold text-ink-500 hover:border-brand-300 hover:text-brand-600"
        >
          ＋ 卓を追加
        </button>

        {/* 保存・キャンセル */}
        <div className="sticky bottom-0 -mx-4 mt-4 border-t border-ink-200/60 bg-white/95 px-4 pb-[env(safe-area-inset-bottom,1rem)] pt-3 backdrop-blur">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              キャンセル
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? "保存中..." : "💾 保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
