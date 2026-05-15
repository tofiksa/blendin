import { eq } from "drizzle-orm";
import type { BlendInDb } from "@/lib/db/client";
import { sessionQuestionResultTable } from "@/lib/db/schema";
import { fetchQuestionPack } from "@/lib/quizQuestions";
import { readQuizSessionByPublicId } from "@/lib/readQuizSessionByPublicId";

export type SessionQuestionResultPayload = {
  questionId: string;
  voteCounts: Record<string, number>;
  tiedOptionIds: string[];
  chosenOptionId: string | null;
};

export type SessionLiveSnapshot = {
  publicId: string;
  state: string;
  currentQuestionIndex: number;
  updatedAt: string;
  questions: Awaited<ReturnType<typeof fetchQuestionPack>>;
  questionResults: SessionQuestionResultPayload[];
};

export async function buildSessionLiveSnapshot(
  db: BlendInDb,
  publicId: string,
): Promise<SessionLiveSnapshot | null> {
  const sess = await readQuizSessionByPublicId(db, publicId);
  if (!sess) return null;

  const questions = await fetchQuestionPack(db, sess.quizTemplateVersionId);
  const hideAggregates =
    sess.state === "draft" ||
    sess.state === "nh_collecting" ||
    sess.state === "team_collecting" ||
    sess.state === "ready_to_reveal";

  const resultRows = hideAggregates
    ? []
    : await db
        .select()
        .from(sessionQuestionResultTable)
        .where(eq(sessionQuestionResultTable.quizSessionId, sess.id));

  const questionResults: SessionQuestionResultPayload[] = resultRows.map((r) => ({
    questionId: r.questionId,
    voteCounts: r.voteCountsJson as Record<string, number>,
    tiedOptionIds: r.tiedOptionIds,
    chosenOptionId: r.chosenOptionId,
  }));

  return {
    publicId: sess.publicId,
    state: sess.state,
    currentQuestionIndex: sess.currentQuestionIndex,
    updatedAt: sess.updatedAt.toISOString(),
    questions,
    questionResults,
  };
}
