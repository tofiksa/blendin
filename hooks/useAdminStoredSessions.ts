"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type AdminCreatedSession,
  type AdminSessionState,
  type AdminStoredSession,
  readAdminStoredSessions,
  removeAdminStoredSession,
  subscribeAdminStoredSessions,
  updateAdminStoredSessionState,
  upsertAdminStoredSession,
} from "@/lib/adminStoredSession";

export function useAdminStoredSessions() {
  const [sessions, setSessions] = useState<AdminStoredSession[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setSessions(readAdminStoredSessions());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    return subscribeAdminStoredSessions(refresh);
  }, [refresh]);

  const saveCreated = useCallback((created: AdminCreatedSession, tenantSlug: string) => {
    return upsertAdminStoredSession(created, { tenantSlug, state: "draft" });
  }, []);

  const setSessionState = useCallback((publicId: string, state: AdminSessionState) => {
    updateAdminStoredSessionState(publicId, state);
  }, []);

  const remove = useCallback((publicId: string) => {
    removeAdminStoredSession(publicId);
  }, []);

  return {
    sessions,
    ready,
    saveCreated,
    setSessionState,
    remove,
    refresh,
  };
}
