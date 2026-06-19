"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { EventConfig } from "@/lib/types";
import { updateEventConfig } from "@/lib/dataService";
import ConfigEditor from "@/components/ConfigEditor";

export default function EventSettingsPage() {
  const params = useParams<{ id: string }>();
  const { id } = params;
  const event = useLiveQuery(() => db.events.get(id), [id]);
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (event && !config) setConfig(event.config);
  }, [event, config]);

  if (!event) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-sm text-ink-500">イベントが見つかりません</p>
        <Link href="/" className="btn-secondary mx-auto">
          一覧に戻る
        </Link>
      </div>
    );
  }

  if (!config) return null;

  async function save() {
    if (!config) return;
    await updateEventConfig(id, config);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-4 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          ルール設定
        </h1>
        <Link href={`/events/${id}`} className="btn-ghost px-3 py-2 text-sm">
          ← 戻る
        </Link>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
        ⚠️ 既に入力済みの点数には、保存後のルールが再計算に反映されます
      </div>

      <ConfigEditor config={config} onChange={setConfig} />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200/60 bg-white/90 px-4 pb-[env(safe-area-inset-bottom,1rem)] pt-3 shadow-lift backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          <button
            className={`btn w-full py-3.5 text-base ${
              saved ? "btn-secondary text-emerald-600" : "btn-primary"
            }`}
            onClick={save}
          >
            {saved ? "保存しました ✓" : "ルールを保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
