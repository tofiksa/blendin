import { eq } from "drizzle-orm";
import type { BlendInDb } from "@/lib/db/client";
import { quizSessionTable } from "@/lib/db/schema";
import { fetchQuestionPack } from "@/lib/quizQuestions";
import { readQuizSessionByPublicId } from "@/lib/readQuizSessionByPublicId";
import type { QuizSessionStateRow } from "@/lib/updateQuizSessionState";

export async function patchQuizSessionByPublicId(
  db: BlendInDb,
  publicId: string,
  patch: {
    state?: QuizSessionStateRow;
    currentQuestionIndex?: number;
  },
): Promise<typeof quizSessionTable.$inferSelect | null> {
  type QuizSessionRow = typeof quizSessionTable.$inferSelect;
  const row = await readQuizSessionByPublicId(db, publicId);
  if (!row) return null;

  const transitioningToRevealing =
    patch.state === "revealing" &&
    row.state !== "revealing" &&
    patch.currentQuestionIndex === undefined;

  const updates: Partial<Pick<QuizSessionRow, "state" | "currentQuestionIndex">> & {
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (patch.state !== undefined) updates.state = patch.state;

  if (patch.currentQuestionIndex !== undefined) {
    const pack = await fetchQuestionPack(db, row.quizTemplateVersionId);
    const max = Math.max(0, pack.length - 1);
    updates.currentQuestionIndex = Math.min(Math.max(0, patch.currentQuestionIndex), max);
  } else if (transitioningToRevealing) {
    updates.currentQuestionIndex = 0;
  }

  if (patch.state === undefined && patch.currentQuestionIndex === undefined) {
    return row;
  }

  await db.update(quizSessionTable).set(updates).where(eq(quizSessionTable.publicId, publicId));
  return readQuizSessionByPublicId(db, publicId);
}
