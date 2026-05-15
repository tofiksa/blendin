import { eq } from "drizzle-orm";
import type { BlendInDb } from "@/lib/db/client";
import { quizSessionTable } from "@/lib/db/schema";

export async function readQuizSessionByPublicId(db: BlendInDb, publicId: string) {
  const [row] = await db
    .select()
    .from(quizSessionTable)
    .where(eq(quizSessionTable.publicId, publicId));
  return row ?? null;
}
