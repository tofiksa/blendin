import { eq } from "drizzle-orm";
import type { BlendInDb } from "@/lib/db/client";
import {
  joinTokenTable,
  quizSessionTable,
  teamAttemptAnswerTable,
  teamAttemptTable,
} from "@/lib/db/schema";
import { fetchQuestionPack, optionBelongsToQuestion } from "@/lib/quizQuestions";
import { hashToken } from "@/lib/tokenHash";

export async function lookupJoinSessionByPlainToken(db: BlendInDb, plainToken: string) {
  const h = hashToken(plainToken);
  const [jt] = await db.select().from(joinTokenTable).where(eq(joinTokenTable.tokenHash, h));
  if (!jt) return null;
  const [session] = await db
    .select()
    .from(quizSessionTable)
    .where(eq(quizSessionTable.id, jt.quizSessionId));
  if (!session) return null;
  return { joinTokenRow: jt, sessionRow: session };
}

export type TeamGuessLine = { questionId: string; optionId: string };

export type TeamSubmitResult =
  | "ok"
  | "unknown_token"
  | "duplicate"
  | "nh_not_locked"
  | "bad_phase"
  | "bad_guess_shape";

export async function submitTeamAnswers(
  db: BlendInDb,
  plainJoinToken: string,
  guesses: TeamGuessLine[],
  displayName: string | null,
): Promise<TeamSubmitResult> {
  const ctx = await lookupJoinSessionByPlainToken(db, plainJoinToken);
  if (!ctx) return "unknown_token";

  const { joinTokenRow, sessionRow } = ctx;

  if (!sessionRow.nhLockedAt) return "nh_not_locked";
  if (
    sessionRow.state !== "team_collecting" &&
    sessionRow.state !== "ready_to_reveal" &&
    sessionRow.state !== "revealing"
  )
    return "bad_phase";

  const pack = await fetchQuestionPack(db, sessionRow.quizTemplateVersionId);
  if (pack.length !== guesses.length) return "bad_guess_shape";

  const expected = new Set(pack.map((q) => q.id));
  const got = new Set(guesses.map((g) => g.questionId));
  if (expected.size !== got.size || [...expected].some((id) => !got.has(id)))
    return "bad_guess_shape";

  for (const g of guesses) {
    if (!(await optionBelongsToQuestion(db, g.questionId, g.optionId))) return "bad_guess_shape";
  }

  const existing = await db
    .select({ id: teamAttemptTable.id })
    .from(teamAttemptTable)
    .where(eq(teamAttemptTable.joinTokenId, joinTokenRow.id));
  if (existing.length > 0) return "duplicate";

  try {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(teamAttemptTable)
        .values({
          quizSessionId: sessionRow.id,
          joinTokenId: joinTokenRow.id,
          displayName,
          submittedAt: new Date(),
        })
        .returning({ id: teamAttemptTable.id });

      const attemptId = inserted[0]?.id;
      if (!attemptId) throw new Error("team_attempt-insert feilet");

      await tx.insert(teamAttemptAnswerTable).values(
        guesses.map((g) => ({
          teamAttemptId: attemptId,
          questionId: g.questionId,
          selectedOptionId: g.optionId,
        })),
      );
    });
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e
        ? String((e as { code: unknown }).code)
        : "";
    if (code === "23505") return "duplicate";
    throw e;
  }

  return "ok";
}

export async function hasTeamSubmittedForJoinToken(db: BlendInDb, joinTokenPersistentId: string) {
  const existing = await db
    .select({ id: teamAttemptTable.id })
    .from(teamAttemptTable)
    .where(eq(teamAttemptTable.joinTokenId, joinTokenPersistentId));
  return existing.length > 0;
}
