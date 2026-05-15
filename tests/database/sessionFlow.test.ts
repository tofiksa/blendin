import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { computeAndPersistSessionQuestionResultsIfNeeded } from "@/lib/computeSessionQuestionResults";
import { createQuizSessionForTenant } from "@/lib/createQuizSessionForTenant";
import { createDbWithPool } from "@/lib/db/client";
import { createPool } from "@/lib/db/pool";
import { sessionQuestionResultTable } from "@/lib/db/schema";
import { finalizeNewHireAnswers, matchesNewHireToken } from "@/lib/newHireAnswers";
import { fetchQuestionPack } from "@/lib/quizQuestions";
import { readQuizSessionByPublicId } from "@/lib/readQuizSessionByPublicId";
import { readTenantBySlug } from "@/lib/readTenantBySlug";
import { submitTeamAnswers } from "@/lib/teamGuessSubmit";
import { updateQuizSessionState } from "@/lib/updateQuizSessionState";

const hasDb = !!process.env.DATABASE_URL?.trim();

describe.skipIf(!hasDb)("session lifecycle", () => {
  const pool = hasDb ? createPool() : null;
  const db = pool ? createDbWithPool(pool) : null;

  afterAll(async () => {
    if (pool) await pool.end();
  });

  it("oppretter ok, låser nyansatt, team sender én gang, blokker duplikat", async () => {
    if (!db || !pool) throw new Error("DATABASE_URL!");

    const tenant = await readTenantBySlug(db, "demo");
    expect(tenant).not.toBeNull();
    if (!tenant) return;

    const created = await createQuizSessionForTenant(db, {
      tenantId: tenant.id,
      mode: "async",
      teamLinkCount: 3,
    });
    expect(created.publicId.length).toBeGreaterThanOrEqual(8);

    const sess = await readQuizSessionByPublicId(db, created.publicId);
    expect(sess).not.toBeNull();
    expect(sess?.nhTokenHash).toBeTruthy();
    if (!sess?.nhTokenHash) return;

    expect(matchesNewHireToken(sess.nhTokenHash, created.newHirePlainToken)).toBe(true);

    const pack = await fetchQuestionPack(db, sess.quizTemplateVersionId);
    expect(pack).toHaveLength(10);

    const nhAnswers = pack.map((q) => {
      const oid = q.options[0]?.id;
      expect(oid).toBeDefined();
      return {
        questionId: q.id,
        optionId: oid ?? "",
        confidenceBand: "pct_0_25" as const,
      };
    });

    await finalizeNewHireAnswers(db, sess, created.newHirePlainToken, nhAnswers);

    const locked = await readQuizSessionByPublicId(db, created.publicId);
    expect(locked?.nhLockedAt).not.toBeNull();
    expect(locked?.state).toBe("team_collecting");

    const guesses = pack.map((q) => {
      const oid = q.options[0]?.id;
      expect(oid).toBeDefined();
      return { questionId: q.id, optionId: oid ?? "" };
    });

    const plainJoin = created.teamJoinPlainTokens[0];
    expect(plainJoin).toBeDefined();
    if (!plainJoin) return;

    const first = await submitTeamAnswers(db, plainJoin, guesses, "TestPerson");
    expect(first).toBe("ok");

    const second = await submitTeamAnswers(db, plainJoin, guesses, null);
    expect(second).toBe("duplicate");

    await updateQuizSessionState(db, created.publicId, "ready_to_reveal");
    await computeAndPersistSessionQuestionResultsIfNeeded(db, created.publicId, "ready_to_reveal");

    const sessionRow = await readQuizSessionByPublicId(db, created.publicId);
    expect(sessionRow).not.toBeNull();
    if (!sessionRow) return;

    const results = await db
      .select()
      .from(sessionQuestionResultTable)
      .where(eq(sessionQuestionResultTable.quizSessionId, sessionRow.id));
    expect(results).toHaveLength(10);

    for (const r of results) {
      const q = pack.find((x) => x.id === r.questionId);
      const expected = q?.options[0]?.id;
      expect(expected).toBeDefined();
      expect(r.chosenOptionId).toBe(expected);
    }
  });
});
