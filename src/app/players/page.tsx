"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { createPlayer, deletePlayer, updatePlayer } from "@/lib/dataService";

const MAX_PLAYERS = 30;

export default function PlayersPage() {
  const players = useLiveQuery(
    () => db.players.orderBy("createdAt").reverse().toArray(),
    [],
    []
  );
  const tables = useLiveQuery(() => db.gameTables.toArray(), [], []);

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const gameCount = new Map<string, number>();
  for (const t of tables) {
    if (!t.scoreEntered) continue;
    for (const pid of t.playerIds) {
      gameCount.set(pid, (gameCount.get(pid) ?? 0) + 1);
    }
  }

  async function add() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (players.length >= MAX_PLAYERS) {
      alert(`選手は最大${MAX_PLAYERS}人までです。`);
      return;
    }
    await createPlayer(trimmed);
    setNewName("");
  }

  async function remove(id: string) {
    if (!confirm("この選手を削除しますか？過去の卓の記録には残ります。")) return;
    await deletePlayer(id);
  }

  function startEdit(id: string, currentName: string) {
    setEditingId(id);
    setEditingName(currentName);
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          選手
        </h1>
        <p className="text-xs text-ink-500">{players.length}/{MAX_PLAYERS}人</p>
      </div>

      <section className="card space-y-3">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="選手名を入力"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
          <button
            className="btn-primary"
            onClick={add}
            disabled={!newName.trim() || players.length >= MAX_PLAYERS}
          >
            追加
          </button>
        </div>
      </section>

      <section className="space-y-2">
        {players.length === 0 ? (
          <div className="card text-center text-sm text-ink-500">
            <div className="text-3xl">👥</div>
            <p className="mt-2">選手がいません</p>
            <p className="text-xs">上から追加してください</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {players.map((p, idx) => {
              const g = gameCount.get(p.id) ?? 0;
              const isEditing = editingId === p.id;
              return (
                <li
                  key={p.id}
                  className="card flex items-center gap-3 p-3"
                >
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
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-500 active:scale-90"
                        aria-label="キャンセル"
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
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(p.id, p.name)}
                        className="flex-1 min-w-0 text-left active:opacity-60"
                      >
                        <div className="truncate font-semibold text-ink-900">
                          {p.name}
                        </div>
                        {g > 0 && (
                          <div className="text-[11px] text-ink-500">
                            🎮 {g}戦
                          </div>
                        )}
                      </button>
                      <button
                        onClick={() => startEdit(p.id, p.name)}
                        className="rounded-full p-2 text-ink-300 hover:bg-ink-100 hover:text-ink-700"
                        aria-label="編集"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        className="rounded-full p-2 text-ink-300 hover:bg-red-50 hover:text-red-500"
                        aria-label="削除"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
