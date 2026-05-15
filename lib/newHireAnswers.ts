import { and, eq, inArray } from "drizzle-orm";
import type { BlendInDb } from "@/lib/db/client";
import { newHireAnswerTable, quizSessionTable } from "@/lib/db/schema";
import { fetchQuestionPack, optionBelongsToQuestion } from "@/lib/quizQuestions";
import { hashToken, timingSafeStringEqual } from "@/lib/tokenHash";

/** Tallverdier må matche Postgres enum `confidence_band`. */
export const confidenceBandsAllowed = ["pct_0_25", "pct_26_50", "pct_51_75", "pct_76_100"] as const;
export type ConfidenceBandAllowed = (typeof confidenceBandsAllowed)[number];

export type NewHireAnswerInput = {
  questionId: string;
  optionId: string;
  confidenceBand: ConfidenceBandAllowed;
};

export function matchesNewHireToken(
  storedSha256Hex: string | null | undefined,
  plain: string,
): boolean {
  if (!storedSha256Hex || !plain) return false;
  return timingSafeStringEqual(storedSha256Hex, hashToken(plain));
}

async function ensureAnswersAllowed(
  db: BlendInDb,
  sessionQuizVersionId: string,
  lines: NewHireAnswerInput[],
): Promise<void> {
  for (const line of lines) {
    const ok = await optionBelongsToQuestion(db, line.questionId, line.optionId);
    if (!ok) {
      throw new Error(`Alternativ passer ikke til spørsmål ${line.questionId}.`);
    }
  }
  const pack = await fetchQuestionPack(db, sessionQuizVersionId);
  const packIds = new Set(pack.map((q) => q.id));
  for (const line of lines) {
    if (!packIds.has(line.questionId)) {
      throw new Error("Spørsmål tilhører ikke denne malen.");
    }
  }
}

export async function upsertNewHireDraft(
  db: BlendInDb,
  sessionInternalId: string,
  quizTemplateVersionId: string,
  nhLockedAt: Date | null,
  sessionState: (typeof quizSessionTable.$inferSelect)["state"],
  plainNhToken: string,
  storedHash: string | null | undefined,
  lines: NewHireAnswerInput[],
): Promise<void> {
  if (!matchesNewHireToken(storedHash, plainNhToken)) {
    throw new Error("Ugyldig nyansatt-token.");
  }
  if (nhLockedAt) throw new Error("Svarene er allerede låst.");
  if (sessionState !== "nh_collecting") throw new Error("Sesjonen er ikke i fase for ny ansatt.");

  await ensureAnswersAllowed(db, quizTemplateVersionId, lines);

  await db.transaction(async (tx) => {
    const qids = [...new Set(lines.map((l) => l.questionId))];
    if (qids.length === 0) return;
    await tx
      .delete(newHireAnswerTable)
      .where(
        and(
          eq(newHireAnswerTable.quizSessionId, sessionInternalId),
          inArray(newHireAnswerTable.questionId, qids),
        ),
      );
    await tx.insert(newHireAnswerTable).values(
      lines.map((l) => ({
        quizSessionId: sessionInternalId,
        questionId: l.questionId,
        selectedOptionId: l.optionId,
        confidenceBand: l.confidenceBand,
      })),
    );
  });
}

export async function finalizeNewHireAnswers(
  db: BlendInDb,
  sessionRow: typeof quizSessionTable.$inferSelect,
  plainNhToken: string,
  lines: NewHireAnswerInput[],
): Promise<void> {
  if (!matchesNewHireToken(sessionRow.nhTokenHash, plainNhToken)) {
    throw new Error("Ugyldig nyansatt-token.");
  }
  if (sessionRow.nhLockedAt) throw new Error("Allerede innsendt.");
  if (sessionRow.state !== "nh_collecting") throw new Error("Feil fase på sesjonen.");

  const pack = await fetchQuestionPack(db, sessionRow.quizTemplateVersionId);
  if (pack.length !== lines.length)
    throw new Error(`Forventet ${pack.length} svar (fikk ${lines.length}).`);
  const expected = new Set(pack.map((q) => q.id));
  const got = new Set(lines.map((l) => l.questionId));
  if (expected.size !== got.size || [...expected].some((id) => !got.has(id))) {
    throw new Error("Alle spørsmål må besvares før innsending.");
  }

  await ensureAnswersAllowed(db, sessionRow.quizTemplateVersionId, lines);

  await db.transaction(async (tx) => {
    await tx.delete(newHireAnswerTable).where(eq(newHireAnswerTable.quizSessionId, sessionRow.id));
    await tx.insert(newHireAnswerTable).values(
      lines.map((l) => ({
        quizSessionId: sessionRow.id,
        questionId: l.questionId,
        selectedOptionId: l.optionId,
        confidenceBand: l.confidenceBand,
      })),
    );
    await tx
      .update(quizSessionTable)
      .set({
        nhLockedAt: new Date(),
        state: "team_collecting",
        updatedAt: new Date(),
      })
      .where(eq(quizSessionTable.id, sessionRow.id));
  });
}

export async function listNewHireAnswers(
  db: BlendInDb,
  sessionInternalId: string,
): Promise<Array<{ questionId: string; optionId: string; confidenceBand: string }>> {
  const rows = await db
    .select()
    .from(newHireAnswerTable)
    .where(eq(newHireAnswerTable.quizSessionId, sessionInternalId));
  return rows.map((r) => ({
    questionId: r.questionId,
    optionId: r.selectedOptionId,
    confidenceBand: r.confidenceBand,
  }));
}
