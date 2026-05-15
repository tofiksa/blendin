import { eq } from "drizzle-orm";
import type { BlendInDb } from "@/lib/db/client";
import { quizSessionTable } from "@/lib/db/schema";

export type QuizSessionStateRow = (typeof quizSessionTable.$inferSelect)["state"];

export async function updateQuizSessionState(
  db: BlendInDb,
  publicId: string,
  state: QuizSessionStateRow,
): Promise<boolean> {
  const res = await db
    .update(quizSessionTable)
    .set({ state, updatedAt: new Date() })
    .where(eq(quizSessionTable.publicId, publicId))
    .returning({ id: quizSessionTable.id });
  return res.length > 0;
}
