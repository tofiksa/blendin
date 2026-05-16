import { and, eq } from "drizzle-orm";
import type { BlendInDb } from "@/lib/db/client";
import { quizTemplateTable } from "@/lib/db/schema";
import {
  insertPublishedQuizPackForTenant,
  type PublishedQuizQuestionInput,
} from "@/lib/insertPublishedQuizPack";
import { readTenantBySlug } from "@/lib/readTenantBySlug";

export class QuizTemplateNameTakenError extends Error {
  constructor(slug: string, templateName: string) {
    super(`Quiz-mal «${templateName}» finnes allerede for tenant «${slug}».`);
    this.name = "QuizTemplateNameTakenError";
  }
}

export type CreateQuizPackForExistingTenantResult = {
  tenantId: string;
  slug: string;
  quizTemplateId: string;
  quizTemplateVersionId: string;
  questionCount: number;
};

export async function createQuizPackForExistingTenantSlug(
  db: BlendInDb,
  tenantSlug: string,
  input: { quizTemplateName: string; questions: PublishedQuizQuestionInput[] },
): Promise<CreateQuizPackForExistingTenantResult> {
  const slug = tenantSlug.trim().toLowerCase();
  const tenant = await readTenantBySlug(db, slug);
  if (!tenant) throw new Error(`Fant ikke tenant «${slug}».`);

  const templateName = input.quizTemplateName.trim();

  return db.transaction(async (tx) => {
    const dup = await tx
      .select({ id: quizTemplateTable.id })
      .from(quizTemplateTable)
      .where(
        and(eq(quizTemplateTable.tenantId, tenant.id), eq(quizTemplateTable.name, templateName)),
      )
      .limit(1);

    if (dup.length > 0) throw new QuizTemplateNameTakenError(slug, templateName);

    const pack = await insertPublishedQuizPackForTenant(tx, {
      tenantId: tenant.id,
      quizTemplateName: templateName,
      questions: input.questions,
    });

    return {
      tenantId: tenant.id,
      slug,
      quizTemplateId: pack.quizTemplateId,
      quizTemplateVersionId: pack.quizTemplateVersionId,
      questionCount: pack.questionCount,
    };
  });
}
