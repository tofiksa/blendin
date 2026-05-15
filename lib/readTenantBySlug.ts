import { eq } from "drizzle-orm";
import type { BlendInDb } from "./db/client";
import { tenantTable } from "./db/schema";

export type TenantRow = typeof tenantTable.$inferSelect;

export async function readTenantBySlug(db: BlendInDb, slug: string): Promise<TenantRow | null> {
  const rows = await db.select().from(tenantTable).where(eq(tenantTable.slug, slug)).limit(1);
  return rows[0] ?? null;
}
