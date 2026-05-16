import { type NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminGate";
import { createDb } from "@/lib/db/client";
import { listQuizTemplatesForTenantSlug } from "@/lib/listQuizTemplatesForTenantSlug";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ tenantSlug: string }> }) {
  const denied = denyUnlessAdmin(_req.headers);
  if (denied) return denied;

  const db = createDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL mangler på serveren" }, { status: 503 });

  const { tenantSlug } = await ctx.params;
  const normalized = tenantSlug.trim().toLowerCase();
  const result = await listQuizTemplatesForTenantSlug(db, normalized);

  if (!result) {
    return NextResponse.json({ error: `Fant ikke tenant «${normalized}».` }, { status: 404 });
  }

  return NextResponse.json({ templates: result.templates });
}
