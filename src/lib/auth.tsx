"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { syncAllFromSupabase } from "./dataService";
import { isSupabaseConfigured } from "./supabase";

const APP_PASSWORD = "kawasaki";
const ADMIN_PASSWORD = "tomo1029";

interface AuthContext {
  authenticated: boolean;
  isAdmin: boolean;
  isSyncing: boolean;
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

  const triggerSync = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!isSupabaseConfigured()) return;
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncAllFromSupabase();
    } catch (e) {
      console.warn("Failed to sync from Supabase:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("auth");
      const savedAdmin = sessionStorage.getItem("admin");
      if (saved === "true") {
        setAuthenticated(true);
        setIsAdmin(savedAdmin === "true");
        // 既にログイン済み（タブを閉じていない）→ 起動時にクラウドから同期
        if (isSupabaseConfigured()) {
          syncAllFromSupabase().catch((e) =>
            console.warn("Initial sync failed:", e)
          );
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    (pw: string) => {
      const ok = pw.trim().toLowerCase() === APP_PASSWORD;
      if (ok) {
        setAuthenticated(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("auth", "true");
          // ログイン直後にクラウドから最新データを取得
          if (isSupabaseConfigured()) {
            syncAllFromSupabase().catch((e) =>
              console.warn("Post-login sync failed:", e)
            );
          }
        }
      }
      return ok;
    },
    []
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
