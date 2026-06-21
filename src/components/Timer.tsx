"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const DEFAULT_DURATION = 50 * 60; // 50分

interface TimerState {
  remaining: number; // 残り秒（残り0以下の場合は負値で「延長中」を表現）
  overtime: number; // 延長秒（0以上のとき延長中）
  running: boolean;
  startedAt: number | null; // 開始時刻のmsタイムスタンプ
  pausedAt: number | null; // 一時停止時のmsタイムスタンプ
  pausedElapsed: number; // 一時停止中の累積経過秒
  lastTickAt: number | null; // 最後に tick した時のmsタイムスタンプ
  duration: number; // 全体の制限時間（秒）
}

const STORAGE_KEY = (eventId: string) => `timer:${eventId}`;

function loadState(eventId: string, duration: number): TimerState {
  if (typeof window === "undefined") return defaultState(duration);
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY(eventId));
    if (!raw) return defaultState(duration);
    const s = JSON.parse(raw) as TimerState;
    if (!s.startedAt) return s;
    // ページがリロードされた場合の再計算
    if (s.running && s.lastTickAt) {
      const elapsedSinceLastTick = Math.floor((Date.now() - s.lastTickAt) / 1000);
      return tick(s, elapsedSinceLastTick);
    }
    return s;
  } catch {
    return defaultState(duration);
  }
}

function defaultState(duration: number): TimerState {
  return {
    remaining: duration,
    overtime: 0,
    running: false,
    startedAt: null,
    pausedAt: null,
    pausedElapsed: 0,
    lastTickAt: null,
    duration,
  };
}

function tick(s: TimerState, seconds: number): TimerState {
  if (!s.running) return s;
  const newStarted = s.startedAt! + seconds * 1000;
  const elapsed = Math.floor((newStarted - s.startedAt!) / 1000) + s.pausedElapsed;
  // elapsed秒時点での remaining を計算
  const newRemaining = s.duration - elapsed;
  if (newRemaining >= 0) {
    return {
      ...s,
      remaining: newRemaining,
      overtime: 0,
      startedAt: newStarted,
      lastTickAt: Date.now(),
    };
  } else {
    return {
      ...s,
      remaining: 0,
      overtime: -newRemaining,
      startedAt: newStarted,
      lastTickAt: Date.now(),
    };
  }
}

function saveState(eventId: string, state: TimerState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY(eventId), JSON.stringify(state));
}

function playBeep() {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // ignore
  }
}

export function useTimer(eventId: string, durationMinutes = 50) {
  const duration = durationMinutes * 60;
  const [state, setState] = useState<TimerState>(() => loadState(eventId, duration));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedRef = useRef(false);

  // 永続化
  useEffect(() => {
    saveState(eventId, state);
  }, [eventId, state]);

  // インターバル
  useEffect(() => {
    if (!state.running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setState((s) => {
        if (!s.running) return s;
        const newS = tick(s, 1);
        // 50分到達で通知（1回のみ）
        if (
          s.remaining > 0 &&
          newS.remaining === 0 &&
          !notifiedRef.current
        ) {
          notifiedRef.current = true;
          playBeep();
        }
        return newS;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.running]);

  const start = useCallback(() => {
    setState((s) => {
      if (s.running) return s;
      const now = Date.now();
      if (s.startedAt === null) {
        return {
          ...s,
          running: true,
          startedAt: now,
          lastTickAt: now,
        };
      } else {
        return {
          ...s,
          running: true,
          startedAt: now,
          lastTickAt: now,
        };
      }
    });
    notifiedRef.current = false;
  }, []);

  const pause = useCallback(() => {
    setState((s) => {
      if (!s.running) return s;
      const now = Date.now();
      const elapsed = s.lastTickAt
        ? Math.floor((now - s.lastTickAt) / 1000) + s.pausedElapsed
        : s.pausedElapsed;
      return {
        ...s,
        running: false,
        remaining: Math.max(0, s.duration - elapsed),
        overtime: elapsed > s.duration ? elapsed - s.duration : 0,
        pausedElapsed: elapsed,
        pausedAt: now,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState(defaultState(duration));
    notifiedRef.current = false;
  }, [duration]);

  return {
    state,
    start,
    pause,
    reset,
  };
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(Math.abs(totalSeconds) / 60);
  const s = Math.abs(totalSeconds) % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface TimerProps {
  eventId: string;
}

export default function Timer({ eventId }: TimerProps) {
  const { state, start, pause, reset } = useTimer(eventId, 50);

  const isOvertime = state.overtime > 0;
  const displaySeconds = isOvertime ? state.overtime : state.remaining;
  const display = formatTime(displaySeconds);
  const isDanger = !isOvertime && state.remaining <= 60 && state.remaining > 0;

  return (
    <div
      className={`rounded-2xl border-2 p-3 shadow-soft transition-colors ${
        isOvertime
          ? "border-rose-300 bg-gradient-to-br from-rose-50 to-orange-50"
          : isDanger
          ? "border-amber-300 bg-amber-50"
          : "border-ink-200 bg-white/90"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">⏱️</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
            {isOvertime ? "延長中" : "残り時間"}
          </span>
        </div>
        {isOvertime && (
          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
            ＋1局
          </span>
        )}
      </div>
      <div
        className={`my-1 text-center font-mono text-4xl font-extrabold tabular-nums tracking-tight ${
          isOvertime
            ? "text-rose-600"
            : isDanger
            ? "text-amber-600"
            : "text-ink-900"
        }`}
      >
        {display}
      </div>
      <div className="flex items-center gap-1.5">
        {state.running ? (
          <button
            onClick={pause}
            className="flex-1 rounded-lg bg-ink-100 px-3 py-2 text-sm font-bold text-ink-700 active:scale-95"
          >
            ⏸ 一時停止
          </button>
        ) : (
          <button
            onClick={start}
            className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white shadow-glow active:scale-95"
          >
            {state.startedAt ? "▶ 再開" : "▶ 開始"}
          </button>
        )}
        <button
          onClick={reset}
          className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-bold text-ink-500 active:scale-95"
          aria-label="リセット"
        >
          ↺
        </button>
      </div>
    </div>
  );
}
