import { type NextRequest, NextResponse } from "next/server";
import { createDb } from "@/lib/db/client";
import { buildSessionLiveSnapshot } from "@/lib/sessionLiveSnapshot";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ publicId: string }> }) {
  const db = createDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL mangler" }, { status: 503 });
  const { publicId } = await ctx.params;
  const snapshot = await buildSessionLiveSnapshot(db, publicId);
  if (!snapshot) return NextResponse.json({ error: "Fant ikke økt." }, { status: 404 });
  return NextResponse.json(snapshot);
}
