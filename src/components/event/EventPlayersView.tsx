"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { createPlayer, updatePlayer, updateEventPlayers } from "@/lib/dataService";
import type { MahjongEvent, Player } from "@/lib/types";

interface Props {
  event: MahjongEvent;
  isAdmin: boolean;
}

export default function EventPlayersView({ event, isAdmin }: Props) {
  const allPlayers = useLiveQuery(() => db.players.orderBy("createdAt").reverse().toArray(), [], [] as Player[]);
  const tables = useLiveQuery(() => db.gameTables.where("eventId").equals(event.id).toArray(), [event.id], []);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newName, setNewName] = useState("");
  const [showAddPanel, setShowAddPanel] = useState(false);

  const gameCount = new Map<string, number>();
  for (const t of tables) {
    if (!t.scoreEntered) continue;
    for (const pid of t.playerIds) {
      gameCount.set(pid, (gameCount.get(pid) ?? 0) + 1);
    }
  }

  const eventPlayerIds = new Set(event.playerIds);
  const eventPlayers = allPlayers.filter((p) => eventPlayerIds.has(p.id));
  const nonEventPlayers = allPlayers.filter((p) => !eventPlayerIds.has(p.id));

  async function addExistingPlayer(playerId: string) {
    await updateEventPlayers(event.id, [...event.playerIds, playerId]);
  }

  async function removePlayer(playerId: string) {
    if (!confirm("このイベントから外しますか？（選手データは削除されません）")) return;
    await updateEventPlayers(event.id, event.playerIds.filter((id) => id !== playerId));
  }

  async function addNewPlayer() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const player = await createPlayer(trimmed);
    await updateEventPlayers(event.id, [...event.playerIds, player.id]);
    setNewName("");
    setShowAddPanel(false);
  }

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditingName(name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveEdit(id: string) {
    if (!editingName.trim()) return;
    await updatePlayer(id, editingName);
    cancelEdit();
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="section-title">参加選手 ({eventPlayers.length}人)</h2>
          {isAdmin && (
            <button
              onClick={() => setShowAddPanel((v) => !v)}
              className="text-xs font-semibold text-brand-600 active:opacity-60"
            >
              {showAddPanel ? "✕ 閉じる" : "＋ 選手を追加"}
            </button>
          )}
        </div>

        {isAdmin && showAddPanel && (
          <div className="card space-y-3">
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="新しい選手名"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addNewPlayer(); }}
              />
              <button
                className="btn-primary"
                onClick={addNewPlayer}
                disabled={!newName.trim()}
              >
                新規追加
              </button>
            </div>
            {nonEventPlayers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-ink-500">既存の選手から追加</p>
                <ul className="space-y-1.5">
                  {nonEventPlayers.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => addExistingPlayer(p.id)}
                        className="flex w-full items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-left text-sm font-semibold text-ink-700 active:bg-ink-50"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand-400 text-[10px] text-brand-600">＋</span>
                        <span className="truncate">{p.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <ul className="space-y-2">
          {eventPlayers.map((p, idx) => {
            const g = gameCount.get(p.id) ?? 0;
            const isEditing = editingId === p.id;
            return (
              <li key={p.id} className="card flex items-center gap-3 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {idx + 1}
                </span>
                {isEditing ? (
                  <div className="flex flex-1 items-center gap-1">
                    <input
                      className="input min-h-[40px] flex-1 text-sm"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(p.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => saveEdit(p.id)}
                      disabled={!editingName.trim()}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white active:scale-90 disabled:opacity-40"
                      aria-label="保存"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-500 active:scale-90"
                      aria-label="キャンセル"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold text-ink-900">{p.name}</div>
                      {g > 0 && <div className="text-[11px] text-ink-500">🎮 {g}戦</div>}
                    </div>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => startEdit(p.id, p.name)}
                          className="rounded-full p-2 text-ink-300 hover:bg-ink-100 hover:text-ink-700"
                          aria-label="名前を編集"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removePlayer(p.id)}
                          className="rounded-full p-2 text-ink-300 hover:bg-red-50 hover:text-red-500"
                          aria-label="イベントから外す"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
