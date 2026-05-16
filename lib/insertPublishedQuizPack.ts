import type { BlendInDb } from "@/lib/db/client";
import {
  questionOptionTable,
  questionTable,
  quizTemplateTable,
  quizTemplateVersionTable,
} from "@/lib/db/schema";

export type PublishedQuizQuestionInput = {
  stem: string;
  options: readonly [string, string, string, string];
};

export type InsertPublishedQuizPackResult = {
  quizTemplateId: string;
  quizTemplateVersionId: string;
  questionCount: number;
};

/**
 * Oppretter quiz-mal, versjon 1 (publisert nå) og spørsmål med fire alternativer hver.
 * Kaller må garantere unikt mal-navn per tenant (evt. innen transaksjon).
 */
export async function insertPublishedQuizPackForTenant(
  tx: BlendInDb,
  args: {
    tenantId: string;
    quizTemplateName: string;
    questions: PublishedQuizQuestionInput[];
  },
): Promise<InsertPublishedQuizPackResult> {
  const templateName = args.quizTemplateName.trim();

  const [qtRow] = await tx
    .insert(quizTemplateTable)
    .values({
      tenantId: args.tenantId,
      name: templateName,
    })
    .returning({ id: quizTemplateTable.id });

  if (!qtRow) throw new Error("Kunne ikke opprette quiz-mal.");

  const [vRow] = await tx
    .insert(quizTemplateVersionTable)
    .values({
      quizTemplateId: qtRow.id,
      versionNumber: 1,
      publishedAt: new Date(),
    })
    .returning({ id: quizTemplateVersionTable.id });

  if (!vRow) throw new Error("Kunne ikke opprette mal-versjon.");

  let questionCount = 0;
  for (let i = 0; i < args.questions.length; i++) {
    const q = args.questions[i];
    const [qRow] = await tx
      .insert(questionTable)
      .values({
        quizTemplateVersionId: vRow.id,
        sortOrder: i + 1,
        stem: q.stem.trim(),
      })
      .returning({ id: questionTable.id });

    if (!qRow) throw new Error(`Kunne ikke opprette spørsmål ${i + 1}.`);

    await tx.insert(questionOptionTable).values(
      q.options.map((label, j) => ({
        questionId: qRow.id,
        sortOrder: j + 1,
        label: label.trim(),
      })),
    );
    questionCount += 1;
  }

  return {
    quizTemplateId: qtRow.id,
    quizTemplateVersionId: vRow.id,
    questionCount,
  };
}
