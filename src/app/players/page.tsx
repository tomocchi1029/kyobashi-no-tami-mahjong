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
    <div className="space-y-6">
      <h1 className="text-lg font-bold">選手管理</h1>

      <section className="card space-y-3">
        <h2 className="section-title">新規選手</h2>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="名前を入力"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
          <button className="btn-primary" onClick={add} disabled={!newName.trim()}>
            追加
          </button>
        </div>
        <p className="text-xs text-stone-400">
          {players.length}/{MAX_PLAYERS}人
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="section-title">選手一覧（{players.length}人）</h2>
        {players.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-500">
            選手がいません。上から追加してください。
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {players.map((p) => {
              const g = gameCount.get(p.id) ?? 0;
              return (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex-1 truncate">{p.name}</span>
                  {g > 0 && (
                    <span className="text-xs text-stone-400">{g}戦</span>
                  )}
                  <button
                    onClick={() => remove(p.id)}
                    className="text-xs text-stone-400 hover:text-red-600"
                  >
                    削除
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
