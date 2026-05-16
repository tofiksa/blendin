import { asc } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminGate";
import { createDb } from "@/lib/db/client";
import { tenantTable } from "@/lib/db/schema";

export async function GET(_req: NextRequest) {
  const denied = denyUnlessAdmin(_req.headers);
  if (denied) return denied;

  const db = createDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL mangler på serveren" }, { status: 503 });

  const rows = await db
    .select({
      slug: tenantTable.slug,
      name: tenantTable.name,
    })
    .from(tenantTable)
    .orderBy(asc(tenantTable.name))
    .limit(500);

  return NextResponse.json({ tenants: rows });
}
