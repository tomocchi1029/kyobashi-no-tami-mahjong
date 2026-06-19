"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const PASSWORD = "kawasaki";

interface AuthContext {
  authenticated: boolean;
  login: (pw: string) => boolean;
  logout: () => void;
}

const AuthCtx = createContext<AuthContext>({
  authenticated: false,
  login: () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("auth");
      if (saved === "true") setAuthenticated(true);
    }
  }, []);

  const login = useCallback((pw: string) => {
    const ok = pw.trim().toLowerCase() === PASSWORD;
    if (ok) {
      setAuthenticated(true);
      if (typeof window !== "undefined") sessionStorage.setItem("auth", "true");
    }
    return ok;
  }, []);

  const logout = useCallback(() => {
    setAuthenticated(false);
    if (typeof window !== "undefined") sessionStorage.removeItem("auth");
  }, []);

  return (
    <AuthCtx.Provider value={{ authenticated, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
