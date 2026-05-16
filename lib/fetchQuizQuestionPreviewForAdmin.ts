import { demoQuizTemplateName } from "@/lib/constants";
import type { BlendInDb } from "@/lib/db/client";
import type { QuestionPublic } from "@/lib/quizQuestions";
import { fetchQuestionPack, resolveQuizTemplateVersionId } from "@/lib/quizQuestions";
import { readTenantBySlug } from "@/lib/readTenantBySlug";

export async function fetchQuizQuestionPreviewForAdmin(
  db: BlendInDb,
  tenantSlug: string,
  quizTemplateNameInput: string | undefined,
  questionIndex: number,
): Promise<
  | { ok: true; question: QuestionPublic; totalQuestions: number; templateName: string }
  | { ok: false; status: 404 | 400; message: string }
> {
  if (!Number.isFinite(questionIndex) || questionIndex < 0 || !Number.isInteger(questionIndex)) {
    return { ok: false, status: 400, message: "Ugyldig index (forventet heltall ≥ 0)." };
  }

  const slug = tenantSlug.trim().toLowerCase();
  const tenant = await readTenantBySlug(db, slug);
  if (!tenant) return { ok: false, status: 404, message: `Fant ikke tenant «${slug}».` };

  const templateName = quizTemplateNameInput?.trim() || demoQuizTemplateName;
  const versionId = await resolveQuizTemplateVersionId(db, tenant.id, templateName);
  if (!versionId) {
    return {
      ok: false,
      status: 404,
      message: `Fant ikke quiz-mal «${templateName}» for denne tenanten.`,
    };
  }

  const pack = await fetchQuestionPack(db, versionId);
  const sorted = [...pack].sort((a, b) => a.sortOrder - b.sortOrder);
  if (sorted.length === 0) {
    return { ok: false, status: 404, message: "Malen har ingen spørsmål." };
  }
  if (questionIndex >= sorted.length) {
    return {
      ok: false,
      status: 400,
      message: `Spørsmål ${questionIndex + 1} finnes ikke (malen har ${sorted.length} spørsmål).`,
    };
  }

  return {
    ok: true,
    question: sorted[questionIndex] as QuestionPublic,
    totalQuestions: sorted.length,
    templateName,
  };
}
