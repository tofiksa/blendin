"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "blendin_admin_bearer";

type AdminAuthCtx = {
  bearer: string;
  setBearer: (v: string) => void;
  bearerSaved: boolean;
  login: (secret: string) => void;
  logout: () => void;
  authHeaders: () => HeadersInit;
};

const Ctx = createContext<AdminAuthCtx | null>(null);

export function useAdminAuth(): AdminAuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [bearer, setBearer] = useState("");
  const [bearerSaved, setBearerSaved] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        setBearer(s);
        setBearerSaved(true);
      }
    } catch {
      /* private mode */
    }
  }, []);

  const login = useCallback((secret: string) => {
    const t = secret.trim();
    setBearer(t);
    try {
      if (t) localStorage.setItem(STORAGE_KEY, t);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setBearerSaved(Boolean(t));
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setBearer("");
    setBearerSaved(false);
  }, []);

  const authHeaders = useCallback((): HeadersInit => {
    const secret = bearer.trim();
    return secret ? { Authorization: `Bearer ${secret}` } : {};
  }, [bearer]);

  return (
    <Ctx.Provider value={{ bearer, setBearer, bearerSaved, login, logout, authHeaders }}>
      {children}
    </Ctx.Provider>
  );
}
