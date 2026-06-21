"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { defaultConfig, uid, type EventConfig } from "@/lib/types";
import { generateRounds } from "@/lib/tableGenerator";
import { createEvent } from "@/lib/dataService";
import { useAdminAction } from "@/lib/useAdminAction";
import { useAuth } from "@/lib/auth";
import ConfigEditor from "@/components/ConfigEditor";

interface ScheduleDraft {
  startsAt: number;
  endsAt: number | null;
  note: string;
}

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
  const [schedules, setSchedules] = useState<ScheduleDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { requireAdmin, adminGate } = useAdminAction();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addSchedule() {
    const now = new Date();
    now.setSeconds(0, 0);
    // デフォルトで次の1時間後を開始時刻に
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    setSchedules((prev) => [
      ...prev,
      { startsAt: start.getTime(), endsAt: end.getTime(), note: "" },
    ]);
  }

  function removeSchedule(index: number) {
    setSchedules((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSchedule(index: number, patch: Partial<ScheduleDraft>) {
    setSchedules((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  async function create() {
    const trimmed = name.trim();
    if (!trimmed || selected.size < config.tableSize) return;
    setSubmitting(true);
    const id = uid();
    await createEvent(
      id,
      trimmed,
      config,
      [...selected],
      schedules.map((s) => ({
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        note: s.note,
      }))
    );
    await generateRounds(id, [...selected], config, numberOfRounds);
    setSubmitting(false);
    router.push(`/events/${id}`);
  }

  const canCreate = name.trim().length > 0 && selected.size >= config.tableSize;

  const { isAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (mounted && !isAdmin) {
    return (
      <>
        <div className="card text-center text-sm text-ink-500">
          <div className="text-4xl">🔐</div>
          <p className="mt-3 font-semibold text-ink-800">管理者認証が必要です</p>
          <p className="mt-1 text-xs">イベントの作成は管理者のみが行えます</p>
          <button
            onClick={() => requireAdmin(() => setMounted(true))}
            className="btn-primary mt-4"
          >
            管理者認証
          </button>
        </div>
        {adminGate}
      </>
    );
  }

  return (
    <div className="space-y-5 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          新規イベント
        </h1>
        <Link href="/" className="btn-ghost px-3 py-2 text-sm">
          ✕ キャンセル
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
            参加選手 ({selected.size}/{players.length})
          </h2>
          <div className="flex gap-2">
            <button
              className="text-xs font-semibold text-brand-600 active:opacity-60"
              onClick={() => setSelected(new Set(players.map((p) => p.id)))}
            >
              全員選択
            </button>
            <span className="text-ink-300">|</span>
            <button
              className="text-xs font-semibold text-ink-500 active:opacity-60"
              onClick={() => setSelected(new Set())}
            >
              解除
            </button>
          </div>
        </div>
        {players.length === 0 ? (
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            選手が登録されていません。
            <Link href="/players" className="ml-1 font-bold underline">
              選手ページ →
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {players.map((p) => {
              const on = selected.has(p.id);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => toggle(p.id)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all active:scale-95 ${
                      on
                        ? "border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-200"
                        : "border-ink-200 bg-white text-ink-700"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                        on
                          ? "bg-brand-600 text-white"
                          : "border border-ink-300 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span className="truncate">{p.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card space-y-2">
        <h2 className="section-title">初回生成する回戦数</h2>
        <Stepper
          value={numberOfRounds}
          min={1}
          max={20}
          step={1}
          onChange={setNumberOfRounds}
        />
        <p className="text-xs text-ink-500">後から卓組タブで追加できます</p>
      </section>

      <section className="space-y-3">
        <h2 className="section-title px-1">ルール設定</h2>
        <ConfigEditor config={config} onChange={setConfig} />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200/60 bg-white/90 px-4 pb-[env(safe-area-inset-bottom,1rem)] pt-3 shadow-lift backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => requireAdmin(create)}
            disabled={!canCreate || submitting}
            className="btn-primary w-full py-3.5 text-base"
          >
            {submitting ? "作成中..." : "イベントを作成"}
          </button>
          {!canCreate && (
            <p className="mt-1 text-center text-[11px] text-ink-500">
              イベント名と最低{config.tableSize}人の選手を選択してください
            </p>
          )}
        </div>
      </div>
      {adminGate}
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-2xl font-extrabold tabular-nums text-ink-900">
        {value}
        <span className="ml-1 text-sm font-medium text-ink-500">回戦</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-200 bg-white text-lg font-bold text-ink-600 active:scale-90 active:bg-ink-50"
          onClick={() => onChange(clamp(value - step))}
          aria-label="減らす"
        >
          −
        </button>
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-200 bg-white text-lg font-bold text-ink-600 active:scale-90 active:bg-ink-50"
          onClick={() => onChange(clamp(value + step))}
          aria-label="増やす"
        >
          ＋
        </button>
      </div>
    </div>
  );
}
