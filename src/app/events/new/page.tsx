"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { defaultConfig, uid, type EventConfig } from "@/lib/types";
import { generateRounds } from "@/lib/tableGenerator";
import ConfigEditor from "@/components/ConfigEditor";

export default function NewEventPage() {
  const router = useRouter();
  const players = useLiveQuery(
    () => db.players.orderBy("createdAt").reverse().toArray(),
    [],
    []
  );

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<EventConfig>(defaultConfig());
  const [numberOfRounds, setNumberOfRounds] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function create() {
    const trimmed = name.trim();
    if (!trimmed || selected.size < config.tableSize) return;
    setSubmitting(true);
    const id = uid();
    await db.events.add({
      id,
      name: trimmed,
      createdAt: Date.now(),
      config,
      playerIds: [...selected],
    });
    await generateRounds(id, [...selected], config, numberOfRounds);
    setSubmitting(false);
    router.push(`/events/${id}`);
  }

  const canCreate = name.trim().length > 0 && selected.size >= config.tableSize;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">イベント作成</h1>
        <Link href="/" className="text-sm text-stone-500">
          キャンセル
        </Link>
      </div>

      <section className="card space-y-2">
        <label className="section-title">イベント名</label>
        <input
          className="input w-full"
          placeholder="例：第1回セット麻雀"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">
            参加選手（{selected.size}人選択中）
          </h2>
          <div className="flex gap-2">
            <button
              className="text-xs text-stone-500 underline"
              onClick={() => setSelected(new Set(players.map((p) => p.id)))}
            >
              全員選択
            </button>
            <button
              className="text-xs text-stone-500 underline"
              onClick={() => setSelected(new Set())}
            >
              全員解除
            </button>
          </div>
        </div>
        {players.length === 0 ? (
          <p className="text-sm text-stone-500">
            選手が登録されていません。
            <Link href="/players" className="text-stone-700 underline">
              選手ページ
            </Link>
            から先に登録してください。
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {players.map((p) => {
              const on = selected.has(p.id);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => toggle(p.id)}
                    className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                      on
                        ? "border-stone-900 bg-stone-100"
                        : "border-stone-200 bg-white"
                    }`}
                  >
                    <span>{on ? "✅" : "⭕"}</span>
                    <span className="truncate">{p.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-stone-400">
          最大30人まで登録可能（卓組は選択人数に応じて自動生成）。
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="section-title">回戦数</h2>
        <Stepper
          label={`初回生成: ${numberOfRounds}回戦`}
          value={numberOfRounds}
          min={1}
          max={20}
          step={1}
          onChange={setNumberOfRounds}
        />
        <p className="text-xs text-stone-400">後から卓組タブで追加できます。</p>
      </section>

      <section className="space-y-3">
        <h2 className="section-title px-1">ルール設定</h2>
        <ConfigEditor config={config} onChange={setConfig} />
      </section>

      <div className="sticky bottom-4">
        <button
          onClick={create}
          disabled={!canCreate || submitting}
          className="btn-primary w-full py-3 text-base shadow-lg"
        >
          {submitting ? "作成中..." : "イベントを作成"}
        </button>
        {!canCreate && (
          <p className="mt-1 text-center text-xs text-stone-400">
            イベント名と最低{config.tableSize}人の選手を選択してください。
          </p>
        )}
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="label-row">
      <span>{label}</span>
      <div className="flex items-center gap-1">
        <button className="btn-secondary px-2.5" onClick={() => onChange(clamp(value - step))}>
          −
        </button>
        <span className="w-10 text-center tabular-nums">{value}</span>
        <button className="btn-secondary px-2.5" onClick={() => onChange(clamp(value + step))}>
          ＋
        </button>
      </div>
    </div>
  );
}
