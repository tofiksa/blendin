"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { SessionLinksPanel } from "@/components/admin/SessionLinksPanel";
import { useAdminStoredSessions } from "@/hooks/useAdminStoredSessions";
import type { AdminSessionState } from "@/lib/adminStoredSession";

export function OngoingSessionsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("open");
  const { sessions, ready, setSessionState, remove } = useAdminStoredSessions();

  const ordered = useMemo(() => {
    if (!highlightId) return sessions;
    const hit = sessions.find((s) => s.publicId === highlightId);
    if (!hit) return sessions;
    return [hit, ...sessions.filter((s) => s.publicId !== highlightId)];
  }, [highlightId, sessions]);

  if (!ready) {
    return <p className="text-sm text-muted">Laster pågående økter …</p>;
  }

  if (ordered.length === 0) {
    return (
      <section className="rounded-3xl bg-surface-white p-8 shadow-sm">
        <h2 className="text-lg font-bold text-foreground">Ingen pågående økter</h2>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Når du oppretter en økt lagres lenker og QR-koder her, slik at du kan navigere fritt i
          admin uten å miste dem.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex rounded-2xl bg-secondary px-5 py-3 text-sm font-bold text-surface-white shadow-md shadow-secondary/20 transition-all hover:brightness-110"
        >
          Opprett økt
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        {ordered.length} økt{ordered.length === 1 ? "" : "er"} lagret i denne nettleseren. Lenker og
        QR forblir tilgjengelige til du fjerner økten fra listen.
      </p>
      {ordered.map((session) => (
        <SessionLinksPanel
          key={session.publicId}
          session={session}
          defaultExpanded={!highlightId || session.publicId === highlightId}
          onStateChange={(state: AdminSessionState) => setSessionState(session.publicId, state)}
          onRemove={() => {
            if (
              window.confirm(
                `Fjerne ${session.publicId} fra listen? Lenkene virker fortsatt, men du må ha dem lagret andre steder.`,
              )
            ) {
              remove(session.publicId);
            }
          }}
        />
      ))}
    </div>
  );
}
