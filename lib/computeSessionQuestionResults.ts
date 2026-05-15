import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { BlendInDb } from "@/lib/db/client";
import {
  type quizSessionTable,
  sessionQuestionResultTable,
  teamAttemptAnswerTable,
  teamAttemptTable,
} from "@/lib/db/schema";
import { fetchQuestionPack } from "@/lib/quizQuestions";
import { readQuizSessionByPublicId } from "@/lib/readQuizSessionByPublicId";

/**
 * Ved stemmelikhet velges én vinner deterministisk fra `tiedOptionIds`
 * (sortert UUID-streng) med SHA-256 av sesjonens `tie_break_seed`.
 */
export function deterministicTieBreakWinner(
  tieBreakSeed: string,
  questionId: string,
  tiedOptionIds: string[],
): string | null {
  if (tiedOptionIds.length === 0) return null;
  const sorted = [...tiedOptionIds].sort((a, b) => a.localeCompare(b));
  if (sorted.length === 1) return sorted[0] ?? null;
  const payload = `${tieBreakSeed}\n${questionId}\n${sorted.join(",")}`;
  const digest = createHash("sha256").update(payload, "utf8").digest();
  const idx = digest.readUInt32BE(0) % sorted.length;
  return sorted[idx] ?? null;
}

export async function computeSessionQuestionResults(
  db: BlendInDb,
  sessionRow: typeof quizSessionTable.$inferSelect,
): Promise<void> {
  const pack = await fetchQuestionPack(db, sessionRow.quizTemplateVersionId);

  const answers = await db
    .select({
      questionId: teamAttemptAnswerTable.questionId,
      optionId: teamAttemptAnswerTable.selectedOptionId,
    })
    .from(teamAttemptAnswerTable)
    .innerJoin(teamAttemptTable, eq(teamAttemptTable.id, teamAttemptAnswerTable.teamAttemptId))
    .where(eq(teamAttemptTable.quizSessionId, sessionRow.id));

  const countsByQuestion = new Map<string, Map<string, number>>();
  for (const q of pack) {
    countsByQuestion.set(q.id, new Map(q.options.map((o) => [o.id, 0])));
  }
  for (const a of answers) {
    const m = countsByQuestion.get(a.questionId);
    if (!m) continue;
    m.set(a.optionId, (m.get(a.optionId) ?? 0) + 1);
  }

  const now = new Date();
  const rows: Array<{
    quizSessionId: string;
    questionId: string;
    voteCountsJson: Record<string, number>;
    tiedOptionIds: string[];
    chosenOptionId: string | null;
    computedAt: Date;
  }> = [];

  for (const q of pack) {
    const m = countsByQuestion.get(q.id);
    if (!m) continue;

    const voteCountsJson: Record<string, number> = {};
    for (const [oid, c] of m) voteCountsJson[oid] = c;

    let max = -1;
    for (const c of m.values()) max = Math.max(max, c);

    let tiedOptionIds: string[] = [];
    let chosenOptionId: string | null = null;

    if (max <= 0) {
      tiedOptionIds = [];
      chosenOptionId = null;
    } else {
      tiedOptionIds = [...m.entries()].filter(([, c]) => c === max).map(([oid]) => oid);
      chosenOptionId = deterministicTieBreakWinner(sessionRow.tieBreakSeed, q.id, tiedOptionIds);
    }

    rows.push({
      quizSessionId: sessionRow.id,
      questionId: q.id,
      voteCountsJson,
      tiedOptionIds,
      chosenOptionId,
      computedAt: now,
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(sessionQuestionResultTable)
      .where(eq(sessionQuestionResultTable.quizSessionId, sessionRow.id));
    if (rows.length > 0) await tx.insert(sessionQuestionResultTable).values(rows);
  });
}

export async function computeAndPersistSessionQuestionResultsIfNeeded(
  db: BlendInDb,
  publicId: string,
  state: (typeof quizSessionTable.$inferSelect)["state"],
): Promise<void> {
  if (state !== "ready_to_reveal" && state !== "revealing" && state !== "completed") return;
  const row = await readQuizSessionByPublicId(db, publicId);
  if (!row) return;
  await computeSessionQuestionResults(db, row);
}
