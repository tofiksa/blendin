import type { BlendInDb } from "@/lib/db/client";
import { tenantTable } from "@/lib/db/schema";
import { insertPublishedQuizPackForTenant } from "@/lib/insertPublishedQuizPack";
import { readTenantBySlug } from "@/lib/readTenantBySlug";

export class TenantSlugTakenError extends Error {
  constructor(slug: string) {
    super(`Tenant «${slug}» finnes allerede.`);
    this.name = "TenantSlugTakenError";
  }
}

export type TenantQuizPackQuestion = {
  stem: string;
  options: readonly [string, string, string, string];
};

export type CreateTenantQuizPackInput = {
  tenant: {
    slug: string;
    name: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
    surfaceColor?: string | null;
  };
  quizTemplateName: string;
  questions: TenantQuizPackQuestion[];
};

export type CreateTenantQuizPackResult = {
  tenantId: string;
  slug: string;
  quizTemplateId: string;
  quizTemplateVersionId: string;
  questionCount: number;
};

function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function createTenantQuizPack(
  db: BlendInDb,
  input: CreateTenantQuizPackInput,
): Promise<CreateTenantQuizPackResult> {
  const slug = normalizeSlug(input.tenant.slug);
  const taken = await readTenantBySlug(db, slug);
  if (taken) throw new TenantSlugTakenError(slug);

  const templateName = input.quizTemplateName.trim();

  return db.transaction(async (tx) => {
    const [tRow] = await tx
      .insert(tenantTable)
      .values({
        slug,
        name: input.tenant.name.trim(),
        logoUrl: input.tenant.logoUrl?.trim() || null,
        primaryColor: input.tenant.primaryColor?.trim() || null,
        accentColor: input.tenant.accentColor?.trim() || null,
        surfaceColor: input.tenant.surfaceColor?.trim() || null,
      })
      .returning({ id: tenantTable.id });

    if (!tRow) throw new Error("Kunne ikke opprette tenant.");

    const pack = await insertPublishedQuizPackForTenant(tx, {
      tenantId: tRow.id,
      quizTemplateName: templateName,
      questions: input.questions,
    });

    return {
      tenantId: tRow.id,
      slug,
      quizTemplateId: pack.quizTemplateId,
      quizTemplateVersionId: pack.quizTemplateVersionId,
      questionCount: pack.questionCount,
    };
  });
}
