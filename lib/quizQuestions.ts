import { and, asc, eq } from "drizzle-orm";
import type { BlendInDb } from "@/lib/db/client";
import {
  questionOptionTable,
  questionTable,
  quizTemplateTable,
  quizTemplateVersionTable,
  tenantTable,
} from "@/lib/db/schema";

export async function resolveQuizTemplateVersionId(
  db: BlendInDb,
  tenantId: string,
  quizTemplateName: string,
): Promise<string | null> {
  const rows = await db
    .select({ versionId: quizTemplateVersionTable.id })
    .from(quizTemplateVersionTable)
    .innerJoin(quizTemplateTable, eq(quizTemplateTable.id, quizTemplateVersionTable.quizTemplateId))
    .innerJoin(tenantTable, eq(tenantTable.id, quizTemplateTable.tenantId))
    .where(
      and(
        eq(tenantTable.id, tenantId),
        eq(quizTemplateTable.name, quizTemplateName),
        eq(quizTemplateVersionTable.versionNumber, 1),
      ),
    )
    .limit(1);
  return rows[0]?.versionId ?? null;
}

export type QuestionOptionPublic = { id: string; sortOrder: number; label: string };
export type QuestionPublic = {
  id: string;
  sortOrder: number;
  stem: string;
  options: QuestionOptionPublic[];
};

export async function fetchQuestionPack(
  db: BlendInDb,
  quizTemplateVersionId: string,
): Promise<QuestionPublic[]> {
  const questions = await db
    .select()
    .from(questionTable)
    .where(eq(questionTable.quizTemplateVersionId, quizTemplateVersionId))
    .orderBy(asc(questionTable.sortOrder));
  const out: QuestionPublic[] = [];
  for (const q of questions) {
    const options = await db
      .select()
      .from(questionOptionTable)
      .where(eq(questionOptionTable.questionId, q.id))
      .orderBy(asc(questionOptionTable.sortOrder));
    out.push({
      id: q.id,
      sortOrder: q.sortOrder,
      stem: q.stem,
      options: options.map((o) => ({ id: o.id, sortOrder: o.sortOrder, label: o.label })),
    });
  }
  return out;
}

export async function optionBelongsToQuestion(
  db: BlendInDb,
  questionId: string,
  optionId: string,
): Promise<boolean> {
  const row = await db
    .select({ id: questionOptionTable.id })
    .from(questionOptionTable)
    .where(
      and(eq(questionOptionTable.questionId, questionId), eq(questionOptionTable.id, optionId)),
    )
    .limit(1);
  return row.length > 0;
}
