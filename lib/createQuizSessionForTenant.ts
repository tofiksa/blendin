import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { demoQuizTemplateName } from "@/lib/constants";
import type { BlendInDb } from "@/lib/db/client";
import { joinTokenTable, quizSessionTable } from "@/lib/db/schema";
import { resolveQuizTemplateVersionId } from "@/lib/quizQuestions";
import { hashToken } from "@/lib/tokenHash";

export type CreatedSessionTokens = {
  sessionId: string;
  publicId: string;
  newHirePlainToken: string;
  teamJoinPlainTokens: string[];
};

export async function createQuizSessionForTenant(
  db: BlendInDb,
  input: {
    tenantId: string;
    mode: "async" | "live";
    quizTemplateName?: string;
    teamLinkCount: number;
  },
): Promise<CreatedSessionTokens> {
  const templateName = input.quizTemplateName ?? demoQuizTemplateName;
  const versionId = await resolveQuizTemplateVersionId(db, input.tenantId, templateName);
  if (!versionId) {
    throw new Error(`Fant ikke quiz-mal «${templateName}» for tenant.`);
  }
  const publicId = nanoid(12);
  const newHirePlainToken = nanoid(32);
  const tieBreakSeed = randomBytes(16).toString("hex");
  const teamJoinPlainTokens = Array.from({ length: input.teamLinkCount }, () => nanoid(32));

  await db.transaction(async (tx) => {
    await tx.insert(quizSessionTable).values({
      tenantId: input.tenantId,
      quizTemplateVersionId: versionId,
      publicId,
      mode: input.mode,
      state: "nh_collecting",
      tieBreakSeed,
      nhTokenHash: hashToken(newHirePlainToken),
    });
    const [row] = await tx
      .select()
      .from(quizSessionTable)
      .where(eq(quizSessionTable.publicId, publicId));
    if (!row) throw new Error("quiz_session-insert feilet.");
    await tx.insert(joinTokenTable).values(
      teamJoinPlainTokens.map((plain) => ({
        quizSessionId: row.id,
        tokenHash: hashToken(plain),
      })),
    );
  });

  const [created] = await db
    .select()
    .from(quizSessionTable)
    .where(eq(quizSessionTable.publicId, publicId));
  if (!created) throw new Error("Kunne ikke lese opprettet quiz_session.");

  return {
    sessionId: created.id,
    publicId,
    newHirePlainToken,
    teamJoinPlainTokens,
  };
}
