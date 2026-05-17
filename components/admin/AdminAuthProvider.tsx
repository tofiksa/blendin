"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "blendin_admin_bearer";

type AdminAuthCtx = {
  bearer: string;
  setBearer: (v: string) => void;
  bearerSaved: boolean;
  saveBearer: () => void;
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
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s) {
        setBearer(s);
        setBearerSaved(true);
      }
    } catch {
      /* private mode */
    }
  }, []);

  const saveBearer = useCallback(() => {
    const t = bearer.trim();
    try {
      if (t) sessionStorage.setItem(STORAGE_KEY, t);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setBearerSaved(Boolean(t));
  }, [bearer]);

  const authHeaders = useCallback((): HeadersInit => {
    const secret = bearer.trim();
    return secret ? { Authorization: `Bearer ${secret}` } : {};
  }, [bearer]);

  return (
    <Ctx.Provider value={{ bearer, setBearer, bearerSaved, saveBearer, authHeaders }}>
      {children}
    </Ctx.Provider>
  );
}
