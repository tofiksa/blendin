import { NextResponse } from "next/server";
import { createDb } from "@/lib/db/client";
import { readTenantBySlug } from "@/lib/readTenantBySlug";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const db = createDb();
  if (!db) {
    return NextResponse.json({ error: "DATABASE_URL mangler på serveren" }, { status: 503 });
  }
  const tenant = await readTenantBySlug(db, slug);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant ikke funnet" }, { status: 404 });
  }
  return NextResponse.json({
    slug: tenant.slug,
    name: tenant.name,
    logoUrl: tenant.logoUrl,
    primaryColor: tenant.primaryColor,
    accentColor: tenant.accentColor,
    surfaceColor: tenant.surfaceColor,
  });
}
