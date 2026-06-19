"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { EventConfig } from "@/lib/types";
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
      <div className="space-y-4 py-10 text-center">
        <p className="text-sm text-stone-500">イベントが見つかりません。</p>
        <Link href="/" className="btn-secondary">
          一覧に戻る
        </Link>
      </div>
    );
  }

  if (!config) return null;

  async function save() {
    if (!config) return;
    await db.events.update(id, { config });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">ルール設定</h1>
        <Link href={`/events/${id}`} className="text-sm text-stone-500">
          戻る
        </Link>
      </div>

      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
        ※ 既に入力済みの点数には、保存後のルールが再計算に反映されます。
      </p>

      <ConfigEditor config={config} onChange={setConfig} />

      <div className="sticky bottom-4">
        <button className="btn-primary w-full py-3 text-base shadow-lg" onClick={save}>
          {saved ? "保存しました ✓" : "ルールを保存"}
        </button>
      </div>
    </div>
  );
}
