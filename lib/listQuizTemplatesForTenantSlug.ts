import { asc, eq } from "drizzle-orm";
import type { BlendInDb } from "@/lib/db/client";
import { quizTemplateTable } from "@/lib/db/schema";
import { readTenantBySlug } from "@/lib/readTenantBySlug";

export type QuizTemplateListRow = { id: string; name: string };

/** Returnerer `null` hvis tenant-slug ikke finnes. */
export async function listQuizTemplatesForTenantSlug(
  db: BlendInDb,
  tenantSlug: string,
): Promise<{ slug: string; templates: QuizTemplateListRow[] } | null> {
  const slug = tenantSlug.trim().toLowerCase();
  const tenant = await readTenantBySlug(db, slug);
  if (!tenant) return null;

  const templates = await db
    .select({ id: quizTemplateTable.id, name: quizTemplateTable.name })
    .from(quizTemplateTable)
    .where(eq(quizTemplateTable.tenantId, tenant.id))
    .orderBy(asc(quizTemplateTable.name));

  return { slug, templates };
}
