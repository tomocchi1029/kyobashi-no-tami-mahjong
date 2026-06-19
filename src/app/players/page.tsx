"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { createPlayer, deletePlayer } from "@/lib/dataService";

const MAX_PLAYERS = 30;

export default function PlayersPage() {
  const players = useLiveQuery(
    () => db.players.orderBy("createdAt").reverse().toArray(),
    [],
    []
  );
  const tables = useLiveQuery(() => db.gameTables.toArray(), [], []);

  const [newName, setNewName] = useState("");

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
              return (
                <li
                  key={p.id}
                  className="card flex items-center gap-3 p-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-semibold text-ink-900">
                      {p.name}
                    </div>
                    {g > 0 && (
                      <div className="text-[11px] text-ink-500">
                        🎮 {g}戦
                      </div>
                    )}
                  </div>
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
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
