"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { syncAllFromSupabase } from "./dataService";
import { isSupabaseConfigured } from "./supabase";

const APP_PASSWORD = "kawasaki";
const ADMIN_PASSWORD = "tomo1029";
const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30分

interface AuthContext {
  authenticated: boolean;
  isAdmin: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  login: (pw: string) => boolean;
  logout: () => void;
  enterAdmin: (pw: string) => boolean;
  exitAdmin: () => void;
  triggerSync: () => Promise<void>;
}

const AuthCtx = createContext<AuthContext>({
  authenticated: false,
  isAdmin: false,
  isSyncing: false,
  lastSyncedAt: null,
  login: () => false,
  logout: () => {},
  enterAdmin: () => false,
  exitAdmin: () => {},
  triggerSync: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const performSync = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const saved = sessionStorage.getItem("lastSyncedAt");
      const since = saved ? Number(saved) : undefined;
      await syncAllFromSupabase(since);
      const now = Date.now();
      sessionStorage.setItem("lastSyncedAt", String(now));
      setLastSyncedAt(now);
    } catch (e) {
      console.warn("Failed to sync from Supabase:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  const triggerSync = useCallback(async () => {
    await performSync();
  }, [performSync]);

  // 起動時の自動同期 + セッション復元時の同期
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem("auth");
    const savedAdmin = sessionStorage.getItem("admin");
    if (saved === "true") {
      setAuthenticated(true);
      setIsAdmin(savedAdmin === "true");
      if (isSupabaseConfigured()) {
        performSync();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ログイン中の30分ごとの自動同期
  useEffect(() => {
    if (!authenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      if (isSupabaseConfigured()) performSync();
    }, SYNC_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const login = useCallback(
    (pw: string) => {
      const ok = pw.trim().toLowerCase() === APP_PASSWORD;
      if (ok) {
        setAuthenticated(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("auth", "true");
          if (isSupabaseConfigured()) {
            performSync();
          }
        }
      }
      return ok;
    },
    [performSync]
  );

  const logout = useCallback(() => {
    setAuthenticated(false);
    setIsAdmin(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("auth");
      sessionStorage.removeItem("admin");
    }
  }, []);

  const enterAdmin = useCallback((pw: string) => {
    const ok = pw.trim() === ADMIN_PASSWORD;
    if (ok) {
      setIsAdmin(true);
      if (typeof window !== "undefined") sessionStorage.setItem("admin", "true");
    }
    return ok;
  }, []);

  const exitAdmin = useCallback(() => {
    setIsAdmin(false);
    if (typeof window !== "undefined") sessionStorage.removeItem("admin");
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        authenticated,
        isAdmin,
        isSyncing,
        lastSyncedAt,
        login,
        logout,
        enterAdmin,
        exitAdmin,
        triggerSync,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
