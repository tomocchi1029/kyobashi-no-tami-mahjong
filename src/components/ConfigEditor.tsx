"use client";

import type { EventConfig } from "@/lib/types";
import {
  defaultConfig,
  okaPerPlayer,
  M_LEAGUE_NO_RATE_CONFIG,
} from "@/lib/types";

interface Props {
  config: EventConfig;
  onChange: (next: EventConfig) => void;
}

const PRESETS: { label: string; apply: () => EventConfig }[] = [
  { label: "Mリーグ標準", apply: () => defaultConfig() },
  {
    label: "Mリーグノーレート",
    apply: () => ({ ...M_LEAGUE_NO_RATE_CONFIG }),
  },
  {
    label: "標準（オカ・ウマ 20/10/-10/-20）",
    apply: () => ({
      ...defaultConfig(),
      uma: [20, 10, -10, -20],
    }),
  },
  { label: "テンピン（レート1.0）", apply: () => ({ ...defaultConfig(), rate: 1.0 }) },
  { label: "ゴットー（レート0.5）", apply: () => ({ ...defaultConfig(), rate: 0.5 }) },
];

export default function ConfigEditor({ config, onChange }: Props) {
  const set = (patch: Partial<EventConfig>) => onChange({ ...config, ...patch });
  const setUma = (i: number, v: number) => {
    const uma = [...config.uma];
    while (uma.length < 4) uma.push(0);
    uma[i] = v;
    set({ uma });
  };

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <h2 className="section-title">プリセット</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => onChange(p.apply())}
              className="btn-secondary"
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="section-title">基本点数</h2>
        <Stepper
          label="配給原点"
          value={config.startingPoints}
          step={1000}
          min={0}
          max={100000}
          onChange={(v) => set({ startingPoints: v })}
        />
        <Stepper
          label="返し点"
          value={config.returnPoints}
          step={1000}
          min={0}
          max={100000}
          onChange={(v) => set({ returnPoints: v })}
        />
        <div className="text-sm text-stone-500">
          オカ（1人あたり）: {okaPerPlayer(config)}
        </div>
        <div className="text-xs text-stone-400">
          オカ合計（1位に加算）: {okaPerPlayer(config) * config.tableSize}
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="section-title">ウマ</h2>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="label-row">
            <span>{i + 1}位</span>
            <input
              type="number"
              className="input w-28 text-right"
              value={config.uma[i] ?? 0}
              onChange={(e) => setUma(i, Number(e.target.value))}
            />
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-2">
          <button className="btn-secondary" onClick={() => set({ uma: [30, 10, -10, -30] })}>
            Mリーグ標準
          </button>
          <button className="btn-secondary" onClick={() => set({ uma: [20, 10, -10, -20] })}>
            ワンツー
          </button>
          <button className="btn-secondary" onClick={() => set({ uma: [0, 0, 0, 0] })}>
            なし
          </button>
        </div>
      </section>

      <section className="card space-y-2">
        <label className="label-row">
          <span>ノーレート（賭けなし）</span>
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={config.noRate}
            onChange={(e) => set({ noRate: e.target.checked })}
          />
        </label>
        {config.noRate && (
          <p className="text-xs text-stone-400">
            ノーレートモードではレート・チップの設定と金額表示を省略し、マッチポイント（MP）のみで競います。
          </p>
        )}
      </section>

      {!config.noRate && (
        <section className="card space-y-2">
          <h2 className="section-title">金額設定</h2>
          <div className="label-row">
            <span>レート</span>
            <input
              type="number"
              step="0.1"
              className="input w-28 text-right"
              value={config.rate}
              onChange={(e) => set({ rate: Number(e.target.value) })}
            />
          </div>
          <div className="label-row">
            <span>チップ単価</span>
            <input
              type="number"
              className="input w-28 text-right"
              value={config.chipValue}
              onChange={(e) => set({ chipValue: Number(e.target.value) })}
            />
          </div>
          <div className="text-xs text-stone-400">
            計算例: MP 10 × レート {config.rate} = ¥{(10 * config.rate).toFixed(0)}
          </div>
        </section>
      )}

      <section className="card space-y-2">
        <h2 className="section-title">卓設定</h2>
        <Stepper
          label="卓の人数"
          value={config.tableSize}
          step={1}
          min={3}
          max={4}
          onChange={(v) => set({ tableSize: v })}
        />
        <label className="label-row">
          <span>3人卓を許可</span>
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={config.allowThreePlayerTable}
            onChange={(e) => set({ allowThreePlayerTable: e.target.checked })}
          />
        </label>
      </section>
    </div>
  );
}

function Stepper({
  label,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="label-row">
      <span>{label}: {value}</span>
      <div className="flex items-center gap-1">
        <button className="btn-secondary px-2.5" onClick={() => onChange(clamp(value - step))}>
          −
        </button>
        <input
          type="number"
          className="input w-24 text-center"
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
        />
        <button className="btn-secondary px-2.5" onClick={() => onChange(clamp(value + step))}>
          ＋
        </button>
      </div>
    </div>
  );
}
