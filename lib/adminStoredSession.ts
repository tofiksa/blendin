export type AdminCreatedSession = {
  publicId: string;
  sessionId: string;
  newHirePlainToken: string;
  teamJoinPlainTokens: string[];
  paths: {
    newHire: string;
    newHireApi: string;
    presenter: string;
    mobil: string;
    teamJoin: string[];
    teamJoinApi: string[];
  };
  urls: {
    newHire: string | null;
    newHireApi: string | null;
    presenter: string | null;
    mobil: string | null;
    teamJoin: (string | null)[];
    teamJoinApi: (string | null)[];
  };
};

export type AdminSessionState =
  | "draft"
  | "nh_collecting"
  | "team_collecting"
  | "ready_to_reveal"
  | "revealing"
  | "completed";

export type AdminStoredSession = AdminCreatedSession & {
  tenantSlug: string;
  savedAt: string;
  state: AdminSessionState;
};

const STORAGE_KEY = "blendin_admin_sessions_v1";
const STORAGE_EVENT = "blendin-admin-sessions-changed";

function readRaw(): AdminStoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAdminStoredSession);
  } catch {
    return [];
  }
}

function isAdminStoredSession(x: unknown): x is AdminStoredSession {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o.publicId === "string" && typeof o.sessionId === "string";
}

function writeAll(sessions: AdminStoredSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function readAdminStoredSessions(): AdminStoredSession[] {
  return readRaw().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function upsertAdminStoredSession(
  created: AdminCreatedSession,
  meta: { tenantSlug: string; state?: AdminSessionState },
): AdminStoredSession {
  const next: AdminStoredSession = {
    ...created,
    tenantSlug: meta.tenantSlug,
    savedAt: new Date().toISOString(),
    state: meta.state ?? "draft",
  };
  const rest = readRaw().filter((s) => s.publicId !== next.publicId);
  writeAll([next, ...rest]);
  return next;
}

export function updateAdminStoredSessionState(publicId: string, state: AdminSessionState): void {
  const all = readRaw();
  const idx = all.findIndex((s) => s.publicId === publicId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], state };
  writeAll(all);
}

export function removeAdminStoredSession(publicId: string): void {
  writeAll(readRaw().filter((s) => s.publicId !== publicId));
}

export function subscribeAdminStoredSessions(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(STORAGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(STORAGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
