"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const APP_PASSWORD = "kawasaki";
const ADMIN_PASSWORD = "tomo1029";

interface AuthContext {
  authenticated: boolean;
  isAdmin: boolean;
  login: (pw: string) => boolean;
  logout: () => void;
  enterAdmin: (pw: string) => boolean;
  exitAdmin: () => void;
}

const AuthCtx = createContext<AuthContext>({
  authenticated: false,
  isAdmin: false,
  login: () => false,
  logout: () => {},
  enterAdmin: () => false,
  exitAdmin: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("auth");
      if (saved === "true") setAuthenticated(true);
      const savedAdmin = sessionStorage.getItem("admin");
      if (savedAdmin === "true") setIsAdmin(true);
    }
  }, []);

  const login = useCallback((pw: string) => {
    const ok = pw.trim().toLowerCase() === APP_PASSWORD;
    if (ok) {
      setAuthenticated(true);
      if (typeof window !== "undefined") sessionStorage.setItem("auth", "true");
    }
    return ok;
  }, []);

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
    <AuthCtx.Provider value={{ authenticated, isAdmin, login, logout, enterAdmin, exitAdmin }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
